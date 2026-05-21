<script lang="ts">
  import type { OperatorSpec } from '@search-builder/types';
  export let operators: OperatorSpec[];
  export let value: string;
  export let onChange: (key: string) => void;

  let filter = '';
  let open = false;

  $: filtered = filter
    ? operators.filter(
        (o) =>
          o.key.toLowerCase().includes(filter.toLowerCase()) ||
          o.label.toLowerCase().includes(filter.toLowerCase()),
      )
    : operators;

  $: grouped = (() => {
    const m = new Map<string, OperatorSpec[]>();
    for (const o of filtered) {
      const cat = o.category ?? 'Other';
      const arr = m.get(cat) ?? [];
      arr.push(o);
      m.set(cat, arr);
    }
    return [...m.entries()];
  })();

  function pick(key: string) {
    onChange(key);
    open = false;
    filter = '';
  }
</script>

<div class="wrap">
  <button class="trigger" on:click={() => (open = !open)}>
    {value || 'select…'} <span class="caret">▾</span>
  </button>
  {#if open}
    <div class="pop">
      <input bind:value={filter} placeholder="Filter operators…" autofocus />
      <div class="scroll">
        {#each grouped as [cat, ops]}
          <div class="cat">{cat}</div>
          {#each ops as o}
            <button class="item" on:click={() => pick(o.key)}>
              <span class="key">{o.key}</span>
              <span class="label">{o.label}</span>
              <span class="desc">{o.description}</span>
            </button>
          {/each}
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .wrap { position: relative; }
  .trigger {
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 4px 8px;
    font-family: var(--font-mono); font-size: 13px; min-width: 120px; text-align: left;
  }
  .caret { color: var(--text-muted); margin-left: 4px; }
  .pop {
    position: absolute; top: calc(100% + 4px); left: 0;
    background: var(--surface-strong); border: 1px solid var(--border);
    border-radius: var(--radius-sm); min-width: 320px; max-height: 320px;
    z-index: 50; display: grid; grid-template-rows: auto 1fr;
  }
  input { background: var(--bg); color: var(--text); border: none; padding: 8px 10px; border-bottom: 1px solid var(--border); }
  .scroll { overflow-y: auto; }
  .cat { font-size: 11px; text-transform: uppercase; color: var(--text-muted); padding: 4px 10px; }
  .item {
    display: grid; grid-template-columns: 110px 1fr; gap: 4px;
    background: none; color: var(--text); border: none; text-align: left; padding: 6px 10px;
  }
  .item:hover { background: var(--surface); }
  .key { font-family: var(--font-mono); color: var(--accent); }
  .label { font-size: 13px; }
  .desc { grid-column: 1 / -1; color: var(--text-muted); font-size: 12px; }
</style>
