<script lang="ts">
  import { page } from '$app/stores';
  import QueryList from '$lib/components/QueryList.svelte';
  $: search = $page.url.searchParams.get('search') ?? undefined;
</script>

<QueryList title="All queries" {search} />
