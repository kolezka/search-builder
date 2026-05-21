<script lang="ts">
  import { page } from '$app/stores';
  import QueryList from '$lib/components/QueryList.svelte';
  $: tagName = decodeURIComponent($page.params.name ?? '');
</script>

<QueryList tag={tagName} title={`#${tagName}`} />
