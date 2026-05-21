<script lang="ts">
  import type { EngineKey } from '@search-builder/types';
  import { enginesStore } from '$lib/stores/engines';
  import { builderStore, setField } from './store';
  import { findIncompatibleOperators, stripIncompatibleOperators } from './find-incompatible';
  import GlassButton from '$lib/ui/GlassButton.svelte';

  let pendingTarget: EngineKey | null = null;
  let incompatible: string[] = [];

  function onChange(e: Event) {
    const target = (e.target as HTMLSelectElement).value as EngineKey;
    if (target === $builderStore.engine) return;
    incompatible = findIncompatibleOperators($builderStore.tree, target);
    if (incompatible.length === 0) {
      setField('engine', target);
      return;
    }
    pendingTarget = target;
    (e.target as HTMLSelectElement).value = $builderStore.engine;
  }

  function confirmStrip() {
    if (!pendingTarget) return;
    const stripped = stripIncompatibleOperators($builderStore.tree, pendingTarget);
    setField('engine', pendingTarget);
    setField('tree', stripped);
    pendingTarget = null;
    incompatible = [];
  }

  function cancel() {
    pendingTarget = null;
    incompatible = [];
  }
</script>

<select value={$builderStore.engine} on:change={onChange}>
  {#each $enginesStore as e}
    <option value={e.key}>{e.name}</option>
  {/each}
</select>

{#if pendingTarget}
  <div class="overlay" on:click={cancel} on:keydown={(e) => e.key === 'Escape' && cancel()} role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal" on:click|stopPropagation on:keydown|stopPropagation role="document">
      <h3>Switch to {pendingTarget}?</h3>
      <p>The following operators are not supported in <strong>{pendingTarget}</strong> and will be removed:</p>
      <ul>
        {#each incompatible as k}<li><code>{k}</code></li>{/each}
      </ul>
      <div class="actions">
        <GlassButton on:click={cancel}>Cancel</GlassButton>
        <GlassButton variant="primary" on:click={confirmStrip}>Drop &amp; switch</GlassButton>
      </div>
    </div>
  </div>
{/if}

<style>
  select {
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 6px;
  }
  .overlay {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6);
    display: grid; place-items: center; z-index: 100;
  }
  .modal {
    background: var(--bg); border: 1px solid var(--border);
    border-radius: var(--radius-md); padding: 20px; max-width: 480px; width: 90%;
  }
  h3 { margin: 0 0 8px; }
  ul { font-family: var(--font-mono); font-size: 13px; }
  .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
</style>
