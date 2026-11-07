import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import type {
  Address, AppNotification, Artist, Artwork, ArtworkStatus, Order, OrderStatus, Payout, Review, Role, Settings, User,
} from '@/data/types';
import { api, ApiError, errorMessage, hasToken, loadToken, setToken, setUnauthorizedHandler, uploadAll, uploadImage } from '@/lib/api';

/**
 * Client state backed by the Tumbuna Arts API (server/). Reads are cached here (and persisted
 * for a fast, offline-friendly start); every write goes to the API first, then updates the cache.
 */

export const COMMISSION = 0.1;
export const PERMIT_FEE = 30;

export type PaymentInput =
  | { method: 'card'; card: { number: string; exp: string; cvc: string; name: string } }
  | { method: 'mobile_money'; phone: string }
  | { method: 'bank_transfer' };

export type CheckoutInput = { address: Address; shippingId: string; payment: PaymentInput };
export type ArtworkInput = Partial<Artwork> & { id?: string };
type Session = { token?: string; user: User; artist: Artist | null };
type Result = string | null; // null = success, string = message for the UI

type State = {
  hydrated: boolean;
  booted: boolean;
  catalogError: string | null;
  onboarded: boolean;
  mode: 'buyer' | 'studio';
  sessionUserId: string | null;
  me: User | null;
  artists: Artist[];
  artworks: Artwork[];
  reviews: Review[];
  orders: Order[];
  notifications: AppNotification[];
  payouts: Payout[];
  cart: string[];
  wishlist: string[];
  following: string[];
  recentSearches: string[];
  addresses: Address[];
  settings: Settings;
};

type Actions = {
  setHydrated: () => void;
  bootstrap: () => Promise<void>;
  loadCatalog: () => Promise<void>;
  loadUserData: () => Promise<void>;
  refresh: () => Promise<void>;
  tick: () => void;
  finishOnboarding: () => void;
  setMode: (m: State['mode']) => void;
  login: (identifier: string, password: string) => Promise<Result>;
  register: (input: { name: string; identifier: string; password: string; role: Role; country: string; province?: string; crafts?: string[] }) => Promise<Result>;
  requestPasswordReset: (identifier: string) => Promise<{ error?: string; devCode?: string }>;
  resetPassword: (identifier: string, code: string, password: string) => Promise<Result>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<User, 'name' | 'phone' | 'city' | 'country'>>) => Promise<Result>;
  deleteAccount: () => Promise<Result>;
  toggleWishlist: (artworkId: string) => void;
  toggleFollow: (artistId: string) => void;
  addToCart: (artworkId: string) => void;
  removeFromCart: (artworkId: string) => void;
  clearCart: () => void;
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
  placeOrder: (input: CheckoutInput) => Promise<{ orders: Order[] } | { error: string }>;
  confirmDelivery: (orderId: string) => Promise<Result>;
  cancelOrder: (orderId: string) => Promise<Result>;
  advanceOrder: (orderId: string, status: OrderStatus, trackingNo?: string) => Promise<Result>;
  addReview: (orderId: string, r: { artworkId: string; rating: number; tags: string[]; text: string; photos: string[] }) => Promise<Result>;
  saveArtwork: (a: ArtworkInput, publish: boolean) => Promise<{ id: string } | { error: string; fields?: Record<string, string> }>;
  setArtworkStatus: (id: string, status: ArtworkStatus) => Promise<Result>;
  deleteArtwork: (id: string) => Promise<Result>;
  updateArtistProfile: (patch: Partial<Artist>) => Promise<Result>;
  submitVerification: (input: { idPhoto: string; selfie: string; referee: { name: string; role: string; phone: string }; works: string[] }) => Promise<Result>;
  requestPayout: (amount: number, method: string) => Promise<Result>;
  requestCommission: (artistId: string, brief: string, budget?: number) => Promise<Result>;
  sendSupport: (message: string, context?: string) => Promise<Result>;
  markNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  incrementViews: (artworkId: string) => void;
  transferCertificate: (serial: string, toEmail: string) => Promise<Result>;
};

const defaultSettings: Settings = {
  currency: 'PGK', language: 'en', theme: 'system', dataSaver: false, biometrics: false, orderPush: true, activityPush: true,
};

const signedOut = {
  sessionUserId: null, me: null, orders: [] as Order[], notifications: [] as AppNotification[], payouts: [] as Payout[], addresses: [] as Address[],
};

/** Merges by id, letting `incoming` win. */
function upsert<T extends { id: string }>(list: T[], incoming: T[]) {
  const map = new Map(list.map((x) => [x.id, x]));
  for (const x of incoming) map.set(x.id, x);
  return [...map.values()];
}

async function fetchAllArtworks(status: 'live' | 'sold') {
  const out: Artwork[] = [];
  for (let offset = 0; offset < 2000; offset += 60) {
    const page = await api<{ items: Artwork[]; total: number }>('GET', `/artworks?status=${status}&sort=newest&limit=60&offset=${offset}`);
    out.push(...page.items);
    if (out.length >= page.total || !page.items.length) break;
  }
  return out;
}

const useBase = create<State & Actions>()(
  persist(
    (set, get) => {
      const applySession = (s: Session) => set((st) => ({
        me: s.user,
        sessionUserId: s.user.id,
        artists: s.artist ? upsert(st.artists, [s.artist]) : st.artists,
      }));
      const replaceOrder = (o: Order) => set((st) => ({ orders: upsert(st.orders, [o]) }));
      const fail = (e: unknown) => errorMessage(e);

      /** Saves a guest's wishlist and follows to their account after they sign in. */
      const syncGuestLists = async () => {
        const { wishlist, following } = get();
        await Promise.allSettled([
          ...wishlist.map((id) => api('PUT', `/me/wishlist/${id}`)),
          ...following.map((id) => api('PUT', `/me/following/${id}`)),
        ]);
      };

      setUnauthorizedHandler(() => { void get().logout(); });

      return {
        hydrated: false,
        booted: false,
        catalogError: null,
        onboarded: false,
        mode: 'buyer',
        ...signedOut,
        artists: [],
        artworks: [],
        reviews: [],
        cart: [],
        wishlist: [],
        following: [],
        recentSearches: [],
        settings: defaultSettings,

        setHydrated: () => set({ hydrated: true }),

        bootstrap: async () => {
          await loadToken();
          if (!hasToken() && get().sessionUserId) set({ ...signedOut, mode: 'buyer' });
          await Promise.allSettled([get().loadCatalog(), hasToken() ? get().loadUserData() : Promise.resolve()]);
          set({ booted: true });
        },

        loadCatalog: async () => {
          try {
            const [live, sold, artists, reviews] = await Promise.all([
              fetchAllArtworks('live'), fetchAllArtworks('sold'),
              api<{ items: Artist[] }>('GET', '/artists'), api<{ items: Review[] }>('GET', '/reviews?limit=500'),
            ]);
            set((st) => {
              // Keep the signed-in artist's private drafts and hidden works, which the public catalogue omits.
              const mine = st.me?.artistId ? st.artworks.filter((a) => a.artistId === st.me!.artistId && (a.status === 'draft' || a.status === 'hidden')) : [];
              const myArtist = st.artists.find((a) => a.id === st.me?.artistId);
              return {
                artworks: upsert(mine, [...live, ...sold]),
                artists: upsert(myArtist ? [myArtist] : [], artists.items),
                reviews: reviews.items,
                catalogError: null,
              };
            });
          } catch (e) {
            set({ catalogError: errorMessage(e) });
          }
        },

        loadUserData: async () => {
          if (!hasToken()) return;
          try {
            const session = await api<Session>('GET', '/me');
            applySession(session);
            const [wish, follows, addresses, certs, notes, orders] = await Promise.all([
              api<{ items: Artwork[] }>('GET', '/me/wishlist'),
              api<{ artistIds: string[] }>('GET', '/me/following'),
              api<{ items: Address[] }>('GET', '/me/addresses'),
              api<{ items: Artwork[] }>('GET', '/me/certificates'),
              api<{ items: AppNotification[] }>('GET', '/me/notifications'),
              api<{ items: Order[] }>('GET', '/orders'),
            ]);
            let studioWorks: Artwork[] = [];
            let studioOrders: Order[] = [];
            let payouts: Payout[] = [];
            if (session.artist) {
              const [w, o, e] = await Promise.all([
                api<{ items: Artwork[] }>('GET', '/studio/artworks'),
                api<{ items: Order[] }>('GET', '/studio/orders'),
                api<{ payouts: { id: string; amount: number; method: string; at: number }[] }>('GET', '/studio/earnings'),
              ]);
              studioWorks = w.items;
              studioOrders = o.items;
              payouts = e.payouts.map((p) => ({ ...p, artistId: session.artist!.id }));
            }
            // Artworks in orders may be missing from the catalogue (e.g. the cache was empty).
            const known = new Set([...get().artworks, ...wish.items, ...certs.items, ...studioWorks].map((a) => a.id));
            const missing = [...new Set([...orders.items, ...studioOrders].flatMap((o) => o.items.map((i) => i.artworkId)))].filter((id) => !known.has(id));
            const extra = (await Promise.all(missing.map((id) => api<Artwork>('GET', `/artworks/${id}`).catch(() => null)))).filter((a): a is Artwork => !!a);
            set((st) => ({
              artworks: upsert(st.artworks, [...wish.items, ...certs.items, ...studioWorks, ...extra]),
              wishlist: wish.items.map((a) => a.id),
              following: follows.artistIds,
              addresses: addresses.items,
              notifications: notes.items,
              orders: upsert(orders.items, studioOrders).sort((a, b) => b.createdAt - a.createdAt),
              payouts,
            }));
          } catch (e) {
            if (e instanceof ApiError && e.status === 401) await get().logout();
          }
        },

        refresh: async () => {
          await Promise.allSettled([get().loadCatalog(), get().loadUserData()]);
        },

        tick: () => { void get().loadUserData(); },

        finishOnboarding: () => set({ onboarded: true }),
        setMode: (mode) => set({ mode }),

        login: async (identifier, password) => {
          try {
            const s = await api<Session & { token: string }>('POST', '/auth/login', { identifier, password });
            await setToken(s.token);
            applySession(s);
            set({ mode: 'buyer' });
            await syncGuestLists();
            await get().loadUserData();
            return null;
          } catch (e) { return fail(e); }
        },

        register: async (input) => {
          try {
            const s = await api<Session & { token: string }>('POST', '/auth/register', input);
            await setToken(s.token);
            applySession(s);
            set({ mode: input.role === 'artist' ? 'studio' : 'buyer' });
            await syncGuestLists();
            await get().loadUserData();
            return null;
          } catch (e) { return fail(e); }
        },

        requestPasswordReset: async (identifier) => {
          try {
            const r = await api<{ devCode?: string }>('POST', '/auth/reset/request', { identifier });
            return { devCode: r.devCode };
          } catch (e) { return { error: fail(e) }; }
        },

        resetPassword: async (identifier, code, password) => {
          try { await api('POST', '/auth/reset/confirm', { identifier, code, password }); return null; } catch (e) { return fail(e); }
        },

        logout: async () => {
          await setToken(null);
          set((st) => ({
            ...signedOut, mode: 'buyer', cart: [], wishlist: [], following: [],
            artworks: st.artworks.filter((a) => a.status === 'live' || a.status === 'sold'),
          }));
        },

        updateProfile: async (patch) => {
          try { applySession(await api<Session>('PATCH', '/me', patch)); return null; } catch (e) { return fail(e); }
        },

        deleteAccount: async () => {
          try { await api('DELETE', '/me'); await get().logout(); return null; } catch (e) { return fail(e); }
        },

        toggleWishlist: (id) => {
          const had = get().wishlist.includes(id);
          set((st) => ({ wishlist: had ? st.wishlist.filter((x) => x !== id) : [id, ...st.wishlist] }));
          if (hasToken()) {
            api(had ? 'DELETE' : 'PUT', `/me/wishlist/${id}`).catch(() => set((st) => ({ wishlist: had ? [id, ...st.wishlist] : st.wishlist.filter((x) => x !== id) })));
          }
        },

        toggleFollow: (id) => {
          const had = get().following.includes(id);
          set((st) => ({ following: had ? st.following.filter((x) => x !== id) : [id, ...st.following] }));
          if (hasToken()) {
            api(had ? 'DELETE' : 'PUT', `/me/following/${id}`).catch(() => set((st) => ({ following: had ? [id, ...st.following] : st.following.filter((x) => x !== id) })));
          }
        },

        addToCart: (id) => set((s) => ({ cart: s.cart.includes(id) ? s.cart : [...s.cart, id] })),
        removeFromCart: (id) => set((s) => ({ cart: s.cart.filter((x) => x !== id) })),
        clearCart: () => set({ cart: [] }),
        addRecentSearch: (q) => { const v = q.trim(); if (v) set((s) => ({ recentSearches: [v, ...s.recentSearches.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 8) })); },
        clearRecentSearches: () => set({ recentSearches: [] }),

        placeOrder: async ({ address, shippingId, payment }) => {
          const ids = get().cart;
          try {
            const { orders } = await api<{ orders: Order[] }>('POST', '/orders', { artworkIds: ids, address, shippingId, payment });
            const uid = get().sessionUserId!;
            set((st) => ({
              orders: upsert(st.orders, orders).sort((a, b) => b.createdAt - a.createdAt),
              artworks: st.artworks.map((a) => (ids.includes(a.id) ? { ...a, status: 'sold', ownerId: uid } : a)),
              cart: [],
              wishlist: st.wishlist.filter((x) => !ids.includes(x)),
              addresses: [address, ...st.addresses.filter((x) => x.line1 !== address.line1)].slice(0, 5),
            }));
            void get().loadUserData();
            return { orders };
          } catch (e) {
            // A work sold to someone else meanwhile: refresh so the cart shows it as unavailable.
            if (e instanceof ApiError && e.status === 409) void get().loadCatalog();
            return { error: fail(e) };
          }
        },

        confirmDelivery: async (orderId) => {
          try { replaceOrder(await api<Order>('POST', `/orders/${orderId}/confirm`)); return null; } catch (e) { return fail(e); }
        },

        cancelOrder: async (orderId) => {
          try {
            const o = await api<Order>('POST', `/orders/${orderId}/cancel`);
            replaceOrder(o);
            set((st) => ({ artworks: st.artworks.map((a) => (o.items.some((i) => i.artworkId === a.id) ? { ...a, status: 'live', ownerId: undefined } : a)) }));
            return null;
          } catch (e) { return fail(e); }
        },

        advanceOrder: async (orderId, status, trackingNo) => {
          try { replaceOrder(await api<Order>('POST', `/studio/orders/${orderId}/status`, { status, trackingNo })); return null; } catch (e) { return fail(e); }
        },

        addReview: async (orderId, r) => {
          try {
            const photos = await uploadAll(r.photos, 'reviews');
            await api('POST', `/orders/${orderId}/review`, { ...r, photos });
            const artistId = get().artworks.find((a) => a.id === r.artworkId)?.artistId;
            const fresh = artistId ? await api<{ items: Review[] }>('GET', `/reviews?artistId=${artistId}`) : { items: [] };
            set((st) => ({
              reviews: upsert(st.reviews, fresh.items).sort((a, b) => b.at - a.at),
              orders: st.orders.map((o) => (o.id === orderId ? { ...o, reviewed: true } : o)),
            }));
            return null;
          } catch (e) { return fail(e); }
        },

        saveArtwork: async (input, publish) => {
          try {
            const images = await uploadAll(input.images ?? [], 'artworks');
            const body = {
              title: input.title, category: input.category || undefined, province: input.province, price: input.price || undefined,
              images, story: input.story, significance: input.significance, materials: input.materials, techniques: input.techniques,
              dimensions: input.dimensions, weightKg: input.weightKg, exportPermit: input.exportPermit, oneOfAKind: input.oneOfAKind, publish,
            };
            const art = input.id
              ? await api<Artwork>('PATCH', `/studio/artworks/${input.id}`, body)
              : await api<Artwork>('POST', '/studio/artworks', body);
            set((st) => ({ artworks: upsert(st.artworks, [art]) }));
            return { id: art.id };
          } catch (e) {
            return { error: fail(e), fields: e instanceof ApiError ? e.fields : undefined };
          }
        },

        setArtworkStatus: async (id, status) => {
          try { const art = await api<Artwork>('PATCH', `/studio/artworks/${id}`, { status }); set((st) => ({ artworks: upsert(st.artworks, [art]) })); return null; } catch (e) { return fail(e); }
        },

        deleteArtwork: async (id) => {
          try {
            await api('DELETE', `/studio/artworks/${id}`);
            set((s) => ({ artworks: s.artworks.filter((a) => a.id !== id), cart: s.cart.filter((x) => x !== id), wishlist: s.wishlist.filter((x) => x !== id) }));
            return null;
          } catch (e) { return fail(e); }
        },

        updateArtistProfile: async (patch) => {
          try {
            const avatarUri = patch.avatarUri ? await uploadImage(patch.avatarUri, 'avatars') : undefined;
            const artist = await api<Artist>('PATCH', '/studio/profile', {
              village: patch.village, bio: patch.bio, lineage: patch.lineage, yearsPractising: patch.yearsPractising, province: patch.province, crafts: patch.crafts, avatarUri,
            });
            set((st) => ({ artists: upsert(st.artists, [artist]) }));
            return null;
          } catch (e) { return fail(e); }
        },

        submitVerification: async ({ idPhoto, selfie, referee, works }) => {
          try {
            const [idPhotoUrl, selfieUrl] = await uploadAll([idPhoto, selfie], 'verification');
            const portfolio = await uploadAll(works, 'verification');
            await api('POST', '/studio/verification', { idPhotoUrl, selfieUrl, referee, portfolio });
            const artistId = get().me?.artistId;
            set((st) => ({ artists: st.artists.map((a) => (a.id === artistId ? { ...a, verification: 'pending', verificationSubmittedAt: Date.now() } : a)) }));
            void get().loadUserData();
            return null;
          } catch (e) { return fail(e); }
        },

        requestPayout: async (amount, method) => {
          try {
            await api('POST', '/studio/payouts', { amount, method });
            await get().loadUserData();
            return null;
          } catch (e) { return fail(e); }
        },

        requestCommission: async (artistId, brief, budget) => {
          try { await api('POST', `/artists/${artistId}/commissions`, { brief, budget }); return null; } catch (e) { return fail(e); }
        },

        sendSupport: async (message, context) => {
          try { await api('POST', '/support', { message, context }); return null; } catch (e) { return fail(e); }
        },

        markNotificationsRead: () => {
          set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
          if (hasToken()) api('POST', '/me/notifications/read', {}).catch(() => {});
        },
        markNotificationRead: (id) => {
          set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
          if (hasToken()) api('POST', '/me/notifications/read', { ids: [id] }).catch(() => {});
        },

        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

        incrementViews: (id) => {
          set((s) => ({ artworks: s.artworks.map((a) => (a.id === id ? { ...a, views: a.views + 1 } : a)) }));
          api('POST', `/artworks/${id}/view`).catch(() => {});
        },

        transferCertificate: async (serial, toEmail) => {
          try {
            await api('POST', `/certificates/${serial}/transfer`, { toEmail });
            set((st) => ({ artworks: st.artworks.map((a) => (a.certificateSerial === serial ? { ...a, ownerId: 'transferred' } : a)) }));
            return null;
          } catch (e) { return fail(e); }
        },
      };
    },
    {
      name: 'tumbuna-arts',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated, booted, catalogError, ...rest }) => rest,
      onRehydrateStorage: () => (state) => state?.setHydrated(),
      // v1 kept all data on the device; start fresh from the API but keep preferences.
      migrate: (persisted) => {
        const old = persisted as Partial<State>;
        return { onboarded: !!old.onboarded, settings: { ...defaultSettings, ...old.settings }, recentSearches: old.recentSearches ?? [] } as unknown as State & Actions;
      },
    },
  ),
);

type Store = State & Actions;

/**
 * Store hook with shallow comparison, so selectors may return filtered arrays or small
 * objects without re-rendering on every update (zustand v5 compares by reference).
 */
function useStoreHook(): Store;
function useStoreHook<T>(selector: (s: Store) => T): T;
function useStoreHook<T>(selector?: (s: Store) => T) {
  return useBase(useShallow(selector ?? ((s: Store) => s as unknown as T)));
}

export const useStore = Object.assign(useStoreHook, {
  getState: useBase.getState,
  setState: useBase.setState,
  subscribe: useBase.subscribe,
  persist: useBase.persist,
});

// ——— selectors ———

export const useMe = () => useStore((s) => s.me);
export const useMyArtist = () => useStore((s) => (s.me?.artistId ? s.artists.find((a) => a.id === s.me!.artistId) ?? null : null));

export function artistRating(s: Pick<State, 'reviews'>, artistId: string) {
  const rs = s.reviews.filter((r) => r.artistId === artistId);
  return rs.length ? { avg: rs.reduce((t, r) => t + r.rating, 0) / rs.length, count: rs.length } : { avg: 0, count: 0 };
}

export function artistOrders(s: Pick<State, 'orders' | 'artworks'>, artistId: string) {
  return s.orders.filter((o) => (o.artistId ? o.artistId === artistId : o.items.some((i) => s.artworks.find((a) => a.id === i.artworkId)?.artistId === artistId)));
}

/** Same rules as the server: confirmed sales less the 10% fee, minus payouts. */
export function artistBalances(s: Pick<State, 'orders' | 'artworks' | 'payouts'>, artistId: string) {
  const orders = artistOrders(s, artistId).filter((o) => o.status !== 'cancelled');
  const net = (o: Order) => o.subtotal * (1 - COMMISSION);
  const released = orders.filter((o) => o.confirmedAt).reduce((t, o) => t + net(o), 0);
  const pending = orders.filter((o) => !o.confirmedAt).reduce((t, o) => t + net(o), 0);
  const paidOut = s.payouts.filter((p) => p.artistId === artistId).reduce((t, p) => t + p.amount, 0);
  return { available: Math.max(0, released - paidOut), pending, lifetime: released + pending, paidOut };
}
