<script lang="ts">
  import type { FolderDto } from '@search-builder/types';
  import { api } from '$lib/api-client';
  import GlassInput from '$lib/ui/GlassInput.svelte';
  import Group from './Group.svelte';
  import PreviewBar from './PreviewBar.svelte';
  import EngineSwitcher from './EngineSwitcher.svelte';
  import { builderStore, saveStatus, setField, forceSave, undo, redo } from './store';

  let folders: FolderDto[] = [];
  let tagsText = '';

  $: $builderStore && (tagsText = $builderStore.tags.join(', '));

  async function loadFolders() {
    folders = await api.folders.list();
  }
  loadFolders();

  function onTagsBlur() {
    const parsed = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    setField('tags', parsed);
  }

  function onKeyDown(e: KeyboardEvent) {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key === 's') {
      e.preventDefault();
      void forceSave();
    } else if (meta && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (meta && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }
  }
</script>

<svelte:window on:keydown={onKeyDown} />

<section class="builder">
  <header class="topline">
    <EngineSwitcher />
    <GlassInput placeholder="Query name…" bind:value={$builderStore.name} on:input={() => setField('name', $builderStore.name)} />
    <select
      value={$builderStore.folder_id ?? ''}
      on:change={(e) => setField('folder_id', (e.target as HTMLSelectElement).value || null)}
    >
      <option value="">(no folder)</option>
      {#each folders as f}<option value={f.id}>{f.name}</option>{/each}
    </select>
    <span class="status">{$saveStatus}</span>
  </header>

  <PreviewBar engine={$builderStore.engine} tree={$builderStore.tree} />

  <div class="body">
    <Group node={$builderStore.tree as import('@search-builder/types').QueryNode & { type: 'group' }} isRoot />
  </div>

  <footer class="meta">
    <label>
      <span>Tags (comma-separated)</span>
      <GlassInput bind:value={tagsText} on:blur={onTagsBlur} />
    </label>
    <label>
      <span>Description</span>
      <textarea bind:value={$builderStore.description} on:blur={() => setField('description', $builderStore.description)}></textarea>
    </label>
  </footer>
</section>

<style>
  .builder { display: grid; gap: 0; }
  .topline {
    display: grid; grid-template-columns: 160px 1fr 200px auto; gap: 8px;
    padding: 12px; align-items: center; border-bottom: 1px solid var(--border);
  }
  .topline select {
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 6px;
  }
  .status { color: var(--text-muted); font-size: 12px; }
  .body { padding: 12px; }
  .meta { padding: 12px; display: grid; gap: 12px; }
  .meta label { display: grid; gap: 6px; }
  .meta label span { font-size: 12px; color: var(--text-muted); }
  textarea {
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 8px; min-height: 60px; resize: vertical;
  }
</style>
