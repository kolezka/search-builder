<script lang="ts">
  import type { QueryNode, OperatorSpec } from '@search-builder/types';
  import { getEngine } from '@search-builder/engines';
  import { builderActions, builderStore } from './store';
  import type { Path } from './node-ops';
  import OperatorPicker from './OperatorPicker.svelte';

  export let node: QueryNode & { type: 'operator' };
  export let path: Path;

  $: adapter = getEngine($builderStore.engine);
  $: operators = adapter.operators;
  $: spec = operators.find((o) => o.key === node.key) as OperatorSpec | undefined;
  $: validationError = spec ? adapter.validateValue(node.key, node.value) : `Unknown operator '${node.key}'`;

  function update(patch: Partial<typeof node>) {
    builderActions.updateAt(path, (n) => ({ ...(n as typeof node), ...patch }));
  }
  function remove() {
    builderActions.removeAt(path);
  }
</script>

<div class="row" class:err={!!validationError && node.value !== ''}>
  <span class="grip">⋮⋮</span>
  <OperatorPicker {operators} value={node.key} onChange={(key) => update({ key })} />
  {#if spec?.valueType === 'enum' && spec.enumValues}
    <select
      class="val"
      value={node.value}
      on:change={(e) => update({ value: (e.target as HTMLSelectElement).value })}
    >
      <option value=""></option>
      {#each spec.enumValues as v}<option>{v}</option>{/each}
    </select>
  {:else}
    <input
      class="val"
      placeholder={spec?.placeholder ?? 'value'}
      value={node.value}
      on:input={(e) => update({ value: (e.target as HTMLInputElement).value })}
    />
  {/if}
  <button
    class="toggle"
    disabled={!spec?.supportsNegation}
    aria-pressed={!!node.negated}
    on:click={() => update({ negated: !node.negated })}
    title={node.negated ? 'remove negation' : 'negate'}
  >NOT</button>
  <button class="del" on:click={remove}>×</button>
  {#if validationError && node.value !== ''}
    <div class="hint">{validationError}</div>
  {/if}
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: 24px auto 1fr auto 28px;
    gap: 6px; align-items: center;
    padding: 4px 6px; border-radius: var(--radius-sm);
  }
  .row.err { box-shadow: inset 0 0 0 1px var(--danger); }
  .row:hover { background: var(--surface); }
  .grip { color: var(--text-muted); cursor: grab; user-select: none; text-align: center; }
  .val, select.val {
    background: var(--bg); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 4px 8px; font-family: var(--font-mono);
  }
  .toggle, .del {
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 2px 8px; font-size: 12px;
  }
  .toggle[aria-pressed='true'] { background: var(--accent); color: #0a0c12; border-color: transparent; }
  .del { color: var(--danger); }
  .hint { grid-column: 3 / span 3; font-size: 12px; color: var(--danger); padding: 0 4px; }
</style>
