<script lang="ts">
  import type { QueryNode, EngineKey } from '@search-builder/types';
  import { getEngine } from '@search-builder/engines';
  export let engine: EngineKey;
  export let tree: QueryNode;
  $: text = getEngine(engine).serializeTree(tree);

  async function copy() {
    await navigator.clipboard.writeText(text);
  }
</script>

<div class="raw">
  <header>
    <span>Read-only raw query (engine: {engine})</span>
    <button on:click={copy}>Copy</button>
  </header>
  <textarea readonly value={text} rows={6}></textarea>
</div>

<style>
  .raw { display: grid; gap: 6px; padding: 12px; border-top: 1px solid var(--border); }
  header { display: flex; justify-content: space-between; align-items: center; color: var(--text-muted); font-size: 12px; }
  textarea {
    background: var(--bg); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 8px; font-family: var(--font-mono);
  }
  button {
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 4px 8px;
  }
</style>
