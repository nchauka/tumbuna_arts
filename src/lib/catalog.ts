import { categories, materials, provinces, stories, techniques } from '@/data/seed';
import type { Artist, Artwork } from '@/data/types';

export type Filters = {
  category?: string;
  province?: string;
  material?: string;
  technique?: string;
  artistId?: string;
  max?: number;
  min?: number;
  verified?: boolean;
  noPermit?: boolean;
  featured?: boolean;
  sort: 'recommended' | 'newest' | 'priceAsc' | 'priceDesc' | 'popular';
};

export const SORTS: { value: Filters['sort']; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'priceAsc', label: 'Price: low to high' },
  { value: 'priceDesc', label: 'Price: high to low' },
  { value: 'popular', label: 'Most viewed' },
];

export function applyFilters(items: Artwork[], artists: Artist[], f: Filters) {
  const verifiedIds = new Set(artists.filter((a) => a.verification === 'verified').map((a) => a.id));
  const out = items.filter((a) =>
    a.status === 'live'
    && (!f.category || a.category === f.category)
    && (!f.province || a.province === f.province)
    && (!f.material || a.materials.includes(f.material))
    && (!f.technique || a.techniques.includes(f.technique))
    && (!f.artistId || a.artistId === f.artistId)
    && (f.max == null || a.price <= f.max)
    && (f.min == null || a.price >= f.min)
    && (!f.verified || verifiedIds.has(a.artistId))
    && (!f.noPermit || !a.exportPermit)
    && (!f.featured || a.featured));
  const sorters: Record<Filters['sort'], (a: Artwork, b: Artwork) => number> = {
    recommended: (a, b) => Number(!!b.featured) - Number(!!a.featured) || Number(verifiedIds.has(b.artistId)) - Number(verifiedIds.has(a.artistId)) || b.views - a.views,
    newest: (a, b) => b.createdAt - a.createdAt,
    priceAsc: (a, b) => a.price - b.price,
    priceDesc: (a, b) => b.price - a.price,
    popular: (a, b) => b.views - a.views,
  };
  return out.sort(sorters[f.sort]);
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Tolerant match: every query word must prefix-match some word in the haystack (with one-typo leeway for longer words). */
function matches(hay: string, q: string) {
  const words = norm(hay).split(/[^a-z0-9]+/).filter(Boolean);
  return norm(q).split(/\s+/).filter(Boolean).every((qw) =>
    words.some((w) => w.startsWith(qw) || (qw.length >= 5 && lev(w.slice(0, qw.length), qw) <= 1)));
}

function lev(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

export function search(q: string, artworks: Artwork[], artists: Artist[]) {
  if (!q.trim()) return { works: [], artists: [], stories: [] };
  const artistName = (id: string) => artists.find((a) => a.id === id)?.name ?? '';
  const pName = (slug: string) => provinces.find((p) => p.slug === slug)?.name ?? '';
  const cName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? '';
  const mName = (slugs: string[]) => slugs.map((s) => materials.find((m) => m.slug === s)?.name ?? '').join(' ');
  const tName = (slugs: string[]) => slugs.map((s) => techniques.find((t) => t.slug === s)?.name ?? '').join(' ');
  return {
    works: artworks.filter((a) => a.status === 'live' && matches(`${a.title} ${artistName(a.artistId)} ${pName(a.province)} ${cName(a.category)} ${mName(a.materials)} ${tName(a.techniques)}`, q)),
    artists: artists.filter((a) => matches(`${a.name} ${a.village} ${pName(a.province)} ${a.crafts.join(' ')}`, q)),
    stories: stories.filter((s) => matches(`${s.title} ${pName(s.province)} ${cName(s.category)} ${s.intro}`, q)),
  };
}

export const TRENDING = ['Sepik mask', 'Bilum', 'Storyboard', 'Buka basket', 'Tapa', 'Trobriand', 'Kina shell'];
