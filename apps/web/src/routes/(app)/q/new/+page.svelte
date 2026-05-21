<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import type { EngineKey } from '@search-builder/types';
  import Builder from '$lib/builder/Builder.svelte';
  import { resetForNew } from '$lib/builder/store';

  onMount(() => {
    const engine = ($page.url.searchParams.get('engine') as EngineKey | null) ?? 'google';
    resetForNew(engine);
  });
</script>

<Builder />
