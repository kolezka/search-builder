<script lang="ts">
  import type { EngineKey, QueryNode } from '@search-builder/types';
  import { getEngine, validateTree } from '@search-builder/engines';
  import { api } from '$lib/api-client';
  import GlassButton from '$lib/ui/GlassButton.svelte';
  import { builderStore } from './store';

  export let engine: EngineKey;
  export let tree: QueryNode;

  $: adapter = getEngine(engine);
  $: serialized = adapter.serializeTree(tree);
  $: url = adapter.buildUrl(tree);
  $: errors = validateTree(engine, tree);
  $: disabled = serialized.trim().length === 0 || errors.length > 0;

  async function openInEngine() {
    if (disabled) return;
    if ($builderStore.id) await api.queries.touch($builderStore.id).catch(() => {});
    window.open(url, '_blank', 'noopener');
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
  }
</script>

<div class="bar">
  <pre class="q">{serialized || '(empty)'}</pre>
  {#if errors.length > 0}
    <ul class="errs">
      {#each errors as e}<li>{e.path || '(root)'}: {e.message}</li>{/each}
    </ul>
  {/if}
  <div class="actions">
    <GlassButton variant="primary" {disabled} on:click={openInEngine}>
      Open in {adapter.name} ↗
    </GlassButton>
    <GlassButton {disabled} on:click={() => copy(url)}>Copy URL</GlassButton>
    <GlassButton {disabled} on:click={() => copy(serialized)}>Copy query</GlassButton>
  </div>
</div>

<style>
  .bar {
    display: grid; gap: 8px; padding: 12px; border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  .q {
    margin: 0; padding: 8px 10px; background: var(--bg);
    border: 1px solid var(--border); border-radius: var(--radius-sm);
    font-family: var(--font-mono); font-size: 13px; white-space: pre-wrap; word-break: break-word;
  }
  .errs { margin: 0; padding-left: 18px; color: var(--danger); font-size: 12px; }
  .actions { display: flex; gap: 8px; }
</style>
