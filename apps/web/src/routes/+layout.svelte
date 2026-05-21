<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { authStore, refreshAuth } from '$lib/stores/auth';

  onMount(async () => {
    await refreshAuth();
  });

  $: if (!$authStore.loading && !$authStore.authenticated && $page.url.pathname !== '/login') {
    goto('/login', { replaceState: true });
  }
  $: if (!$authStore.loading && $authStore.authenticated && $page.url.pathname === '/login') {
    goto('/', { replaceState: true });
  }
</script>

{#if $authStore.loading}
  <main class="boot"><div>loading…</div></main>
{:else}
  <slot />
{/if}

<style>
  .boot {
    display: grid; place-items: center; min-height: 100vh; color: var(--text-muted);
  }
</style>
