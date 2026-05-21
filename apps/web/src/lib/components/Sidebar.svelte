<script lang="ts">
  import { page } from '$app/stores';
  import { api } from '$lib/api-client';
  import type { FolderDto, TagDto } from '@search-builder/types';
  import { onMount } from 'svelte';
  import FolderManager from './FolderManager.svelte';
  let openManager: { mode: 'create' | 'edit'; id?: string; initialName?: string; initialColor?: string } | null = null;

  let folders: FolderDto[] = [];
  let tags: TagDto[] = [];

  async function refresh() {
    [folders, tags] = await Promise.all([api.folders.list(), api.tags.list()]);
  }

  onMount(refresh);

  $: pathname = $page.url.pathname as string;
  function activeFolder(id: string) {
    return pathname === `/folders/${id}`;
  }
  function activeTag(name: string) {
    return pathname === `/tags/${encodeURIComponent(name)}`;
  }
</script>

<nav>
  <section>
    <h3>Folders</h3>
    <a href="/" class:active={pathname === '/'}>All queries</a>
    {#each folders as f}
      <a
        href={`/folders/${f.id}`}
        class:active={activeFolder(f.id)}
        on:contextmenu|preventDefault={() => (openManager = { mode: 'edit', id: f.id, initialName: f.name, initialColor: f.color ?? '#6ea8fe' })}
      >
        <span class="dot" style="background:{f.color ?? '#666'}"></span>
        <span class="label">{f.name}</span>
        <span class="count">{f.query_count}</span>
      </a>
    {/each}
    <button class="newf" on:click={() => (openManager = { mode: 'create' })}>+ New folder</button>
  </section>

  <section>
    <h3>Tags</h3>
    {#each tags as t}
      <a href={`/tags/${encodeURIComponent(t.name)}`} class:active={activeTag(t.name)}>
        <span class="label">#{t.name}</span>
        <span class="count">{t.usage_count}</span>
      </a>
    {/each}
  </section>

  <section>
    <a href="/trash" class="trash" class:active={pathname === '/trash'}>🗑 Trash</a>
  </section>
</nav>

{#if openManager}
  <FolderManager
    mode={openManager.mode}
    id={openManager.id ?? ''}
    initialName={openManager.initialName ?? ''}
    initialColor={openManager.initialColor ?? '#6ea8fe'}
    on:saved={refresh}
    on:close={() => (openManager = null)}
  />
{/if}

<style>
  nav { display: flex; flex-direction: column; gap: 18px; }
  h3 {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--text-muted); margin: 0 0 6px;
  }
  a {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 8px; border-radius: var(--radius-sm); color: var(--text);
  }
  a:hover { background: var(--surface); text-decoration: none; }
  a.active { background: var(--surface-strong); }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
  .label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .count { color: var(--text-muted); font-size: 12px; }
  .trash { color: var(--text-muted); }
  .newf {
    background: none; border: 1px dashed var(--border); color: var(--text-muted);
    border-radius: var(--radius-sm); padding: 4px 8px; margin-top: 4px;
  }
</style>
