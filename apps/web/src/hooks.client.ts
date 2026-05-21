import { refreshAuth } from '$lib/stores/auth';
export async function init() {
  await refreshAuth();
}
