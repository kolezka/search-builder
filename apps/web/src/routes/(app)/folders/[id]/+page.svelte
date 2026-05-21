<script lang="ts">
  import { page } from '$app/stores';
  import { api } from '$lib/api-client';
  import QueryList from '$lib/components/QueryList.svelte';

  let folderName = '';

  async function load(id: string) {
    const folders = await api.folders.list();
    folderName = folders.find((f) => f.id === id)?.name ?? 'Folder';
  }

  $: void load($page.params.id ?? '');
</script>

<QueryList folder={$page.params.id} title={folderName} />
