<script lang="ts">
  import type { QueryNode } from '@search-builder/types';
  import { builderActions } from './store';
  import type { Path } from './node-ops';
  import TermRow from './TermRow.svelte';
  import OperatorRow from './OperatorRow.svelte';

  export let node: QueryNode & { type: 'group' };
  export let path: Path = [];
  export let isRoot = false;

  let menuOpen = false;

  function add(kind: 'term' | 'operator' | 'and' | 'or') {
    menuOpen = false;
    const child: QueryNode =
      kind === 'term'
        ? { type: 'term', value: '' }
        : kind === 'operator'
          ? { type: 'operator', key: '', value: '' }
          : { type: 'group', op: kind === 'and' ? 'AND' : 'OR', children: [] };
    builderActions.addChild(path, child);
  }

  function toggleOp() {
    builderActions.updateAt(path, (n) => ({
      ...(n as typeof node),
      op: (n as typeof node).op === 'AND' ? 'OR' : 'AND',
    }));
  }

  function toggleNegate() {
    builderActions.updateAt(path, (n) => ({ ...(n as typeof node), negated: !(n as typeof node).negated }));
  }

  function removeMe() {
    builderActions.removeAt(path);
  }
</script>

<div class="group" class:root={isRoot}>
  <header>
    {#if !isRoot}
      <button class="op" on:click={toggleOp} title="toggle AND/OR">{node.op}</button>
      <button class="neg" aria-pressed={!!node.negated} on:click={toggleNegate} title="negate group">NOT</button>
      <button class="del" on:click={removeMe} title="remove group">×</button>
    {:else}
      <span class="op static">AND</span>
    {/if}
  </header>

  <div class="children">
    {#each node.children as child, i (path.join('.') + '/' + i)}
      {#if child.type === 'group'}
        <svelte:self node={child} path={[...path, i]} isRoot={false} />
      {:else if child.type === 'term'}
        <TermRow node={child} path={[...path, i]} />
      {:else}
        <OperatorRow node={child} path={[...path, i]} />
      {/if}
    {/each}
  </div>

  <footer>
    <div class="dropdown">
      <button on:click={() => (menuOpen = !menuOpen)}>+ Add</button>
      {#if menuOpen}
        <div class="menu">
          <button on:click={() => add('term')}>Term</button>
          <button on:click={() => add('operator')}>Operator</button>
          <button on:click={() => add('and')}>Sub-group AND</button>
          <button on:click={() => add('or')}>Sub-group OR</button>
        </div>
      {/if}
    </div>
  </footer>
</div>

<style>
  .group {
    border: 1px solid var(--border); border-radius: var(--radius-md);
    padding: 8px; margin: 6px 0;
    background: rgba(255, 255, 255, 0.02);
  }
  .group.root { border-color: transparent; padding: 0; background: none; }
  header { display: flex; gap: 6px; align-items: center; }
  .op {
    background: var(--accent); color: #0a0c12; border: none;
    border-radius: var(--radius-sm); padding: 2px 8px; font-weight: 600;
  }
  .op.static { background: var(--surface); color: var(--text-muted); padding: 2px 8px; border-radius: var(--radius-sm); }
  .neg, .del {
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 2px 8px; font-size: 12px;
  }
  .neg[aria-pressed='true'] { background: var(--danger); color: #0a0c12; border-color: transparent; }
  .del { color: var(--danger); margin-left: auto; }
  .children { padding-left: 8px; }
  footer { padding-top: 4px; }
  .dropdown { position: relative; display: inline-block; }
  .dropdown > button {
    background: none; border: 1px dashed var(--border); color: var(--text-muted);
    border-radius: var(--radius-sm); padding: 4px 10px;
  }
  .menu {
    position: absolute; top: 100%; left: 0; margin-top: 4px;
    background: var(--surface-strong); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 4px; display: grid; min-width: 180px; z-index: 5;
  }
  .menu button {
    background: none; border: none; color: var(--text);
    text-align: left; padding: 6px 8px; border-radius: var(--radius-sm);
  }
  .menu button:hover { background: var(--surface); }
</style>
