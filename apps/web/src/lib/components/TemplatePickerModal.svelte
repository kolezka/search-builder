<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api-client';

  const dispatch = createEventDispatcher<{ close: void }>();

  type T = Awaited<ReturnType<typeof api.templates.list>>[number];
  let items: T[] = [];
  let loading = true;

  onMount(async () => {
    items = await api.templates.list();
    loading = false;
  });

  async function pick(t: T) {
    const created = await api.templates.instantiate(t.id, {});
    dispatch('close');
    await goto(`/q/${created.id}`);
  }
</script>

<div class="overlay" on:click={() => dispatch('close')} on:keydown={(e) => e.key === 'Escape' && dispatch('close')} role="dialog" aria-modal="true" tabindex="-1">
  <div class="modal" on:click|stopPropagation on:keydown|stopPropagation role="document">
    <header>
      <h3>New from template</h3>
      <button on:click={() => dispatch('close')}>×</button>
    </header>
    {#if loading}
      <p>Loading…</p>
    {:else}
      <ul>
        {#each items as t}
          <li>
            <button on:click={() => pick(t)}>
              <div class="row">
                <span class="engine">{t.engine}</span>
                <span class="name">{t.name}</span>
              </div>
              <div class="desc">{t.description}</div>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: grid; place-items: center; z-index: 100; }
  .modal { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px; max-width: 560px; width: 90%; max-height: 80vh; display: grid; grid-template-rows: auto 1fr; }
  header { display: flex; justify-content: space-between; align-items: center; }
  header button { background: none; border: none; color: var(--text-muted); font-size: 20px; }
  ul { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 4px; overflow-y: auto; }
  ul button {
    background: none; border: 1px solid var(--border); border-radius: var(--radius-sm);
    color: var(--text); text-align: left; padding: 10px 12px; width: 100%; display: grid; gap: 4px;
  }
  ul button:hover { border-color: var(--accent); }
  .row { display: flex; gap: 8px; align-items: baseline; }
  .engine { font-size: 11px; padding: 1px 6px; background: var(--surface); border-radius: 4px; color: var(--text-muted); }
  .desc { color: var(--text-muted); font-size: 12px; }
</style>
