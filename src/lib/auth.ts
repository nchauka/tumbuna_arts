import { router } from 'expo-router';

import { useStore } from '@/store';

/** Runs `action` when signed in; otherwise sends the user to log in and back to `next`. */
export function requireAuth(action: () => void, next?: string) {
  if (useStore.getState().sessionUserId) action();
  else router.push({ pathname: '/login', params: next ? { next } : {} });
}

export function afterAuth(next?: string) {
  const { mode } = useStore.getState();
  if (next) router.replace(next as never);
  else router.replace(mode === 'studio' ? '/studio/dashboard' : '/home');
}
