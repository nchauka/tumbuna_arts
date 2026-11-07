import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * API base URL. Set EXPO_PUBLIC_API_URL for staging/production. In development it defaults to
 * port 4000 on the machine running the Expo dev server, so phones on the same Wi‑Fi and
 * emulators reach the local API without configuration.
 */
function resolveBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (Platform.OS === 'web') return `${typeof location !== 'undefined' ? location.protocol : 'http:'}//${typeof location !== 'undefined' ? location.hostname : 'localhost'}:4000/api/v1`;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:4000/api/v1`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:4000/api/v1' : 'http://localhost:4000/api/v1';
}
export const API_URL = resolveBaseUrl();

// ——— token storage: Keychain/Keystore on device, localStorage on web ———
const TOKEN_KEY = 'tumbuna.token';
let token: string | null = null;

export async function loadToken() {
  try {
    token = Platform.OS === 'web' ? await AsyncStorage.getItem(TOKEN_KEY) : await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    token = null;
  }
  return token;
}

export async function setToken(t: string | null) {
  token = t;
  try {
    if (Platform.OS === 'web') { if (t) await AsyncStorage.setItem(TOKEN_KEY, t); else await AsyncStorage.removeItem(TOKEN_KEY); }
    else if (t) await SecureStore.setItemAsync(TOKEN_KEY, t);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch { /* storage unavailable; token stays in memory for this session */ }
}

export const hasToken = () => !!token;

// ——— requests ———
export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'error', public fields?: Record<string, string>) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;
/** Called when the server rejects the saved session, so the store can sign out. */
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function api<T = unknown>(method: Method, path: string, body?: unknown, opts: { timeoutMs?: number } = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15_000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Can\'t reach Tumbuna Arts. Check your connection and try again.', 'offline');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = (data as { error?: { message?: string; code?: string; fields?: Record<string, string> } }).error;
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, e?.message ?? 'Something went wrong. Please try again.', e?.code, e?.fields);
  }
  return data as T;
}

/** Turns any thrown value into a message suitable for the UI. */
export const errorMessage = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : 'Something went wrong. Please try again.');

/** Uploads a local photo (file://, content://, blob: or data: URI) and returns its public URL. Remote URLs pass through. */
export async function uploadImage(uri: string, folder: 'artworks' | 'avatars' | 'reviews' | 'verification'): Promise<string> {
  if (/^https?:\/\//.test(uri)) return uri;
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    const type = blob.type || 'image/jpeg';
    form.append('file', blob, `photo.${type.split('/')[1] ?? 'jpg'}`);
  } else {
    const ext = (uri.split('?')[0].split('.').pop() ?? 'jpg').toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'heic' ? 'image/heic' : 'image/jpeg';
    form.append('file', { uri, name: `photo.${ext}`, type } as unknown as Blob);
  }
  form.append('folder', folder);
  const { url } = await api<{ url: string }>('POST', '/uploads', form, { timeoutMs: 60_000 });
  return url;
}

export const uploadAll = (uris: string[], folder: Parameters<typeof uploadImage>[1]) => Promise.all(uris.map((u) => uploadImage(u, folder)));
