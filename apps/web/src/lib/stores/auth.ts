import { writable } from 'svelte/store';
import { api } from '../api-client';

export const authStore = writable<{ authenticated: boolean; loading: boolean }>({
  authenticated: false,
  loading: true,
});

export async function refreshAuth(): Promise<void> {
  authStore.update((s) => ({ ...s, loading: true }));
  const me = await api.auth.me().catch(() => ({ authenticated: false }));
  authStore.set({ authenticated: me.authenticated, loading: false });
}

export async function logout(): Promise<void> {
  await api.auth.logout().catch(() => {});
  authStore.set({ authenticated: false, loading: false });
}
