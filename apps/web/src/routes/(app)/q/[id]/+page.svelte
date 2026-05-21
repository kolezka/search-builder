<script lang="ts">
  import { page } from '$app/stores';
  import { api } from '$lib/api-client';
  import Builder from '$lib/builder/Builder.svelte';
  import { setFromServer } from '$lib/builder/store';

  let loaded = false;
  let error = '';

  async function load(id: string) {
    loaded = false;
    error = '';
    try {
      const full = await api.queries.get(id);
      setFromServer(full);
      loaded = true;
    } catch {
      error = 'Failed to load query';
    }
  }

  $: void load($page.params.id ?? '');
</script>

{#if error}
  <p style="color: var(--danger)">{error}</p>
{:else if !loaded}
  <p style="color: var(--text-muted)">Loading…</p>
{:else}
  <Builder />
{/if}
