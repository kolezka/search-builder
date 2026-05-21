<script lang="ts">
  import type { QueryNode } from '@search-builder/types';
  import { builderActions } from './store';
  import type { Path } from './node-ops';

  export let node: QueryNode & { type: 'term' };
  export let path: Path;

  function update(patch: Partial<typeof node>) {
    builderActions.updateAt(path, (n) => ({ ...(n as typeof node), ...patch }));
  }
  function remove() {
    builderActions.removeAt(path);
  }
</script>

<div class="row">
  <span class="grip" title="drag handle">⋮⋮</span>
  <span class="lbl">term</span>
  <input
    class="val"
    placeholder="text to search…"
    value={node.value}
    on:input={(e) => update({ value: (e.target as HTMLInputElement).value })}
  />
  <button
    class="toggle"
    title={node.exactMatch ? 'remove exact match' : 'exact match'}
    aria-pressed={!!node.exactMatch}
    on:click={() => update({ exactMatch: !node.exactMatch })}
  >"…"</button>
  <button
    class="toggle"
    title={node.negated ? 'remove negation' : 'negate'}
    aria-pressed={!!node.negated}
    on:click={() => update({ negated: !node.negated })}
  >NOT</button>
  <button class="del" on:click={remove} title="remove">×</button>
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: 24px 50px 1fr auto auto 28px;
    gap: 6px; align-items: center;
    padding: 4px 6px; border-radius: var(--radius-sm);
  }
  .row:hover { background: var(--surface); }
  .grip { color: var(--text-muted); cursor: grab; user-select: none; text-align: center; }
  .lbl { font-size: 11px; color: var(--text-muted); }
  .val {
    background: var(--bg); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 4px 8px; font-family: var(--font-mono);
  }
  .toggle, .del {
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 2px 8px; font-size: 12px;
  }
  .toggle[aria-pressed='true'] { background: var(--accent); color: #0a0c12; border-color: transparent; }
  .del { color: var(--danger); }
</style>
