<script lang="ts">
  import { goto } from '$app/navigation';
  import { api } from '$lib/api-client';
  import Glass from '$lib/ui/Glass.svelte';
  import GlassButton from '$lib/ui/GlassButton.svelte';
  import type { QueryListDto } from '@search-builder/types';

  export let folder: string | null | undefined = undefined;
  export let tag: string | undefined = undefined;
  export let search: string | undefined = undefined;
  export let includeDeleted = false;
  export let title: string;

  let items: QueryListDto[] = [];
  let loading = true;

  async function refresh() {
    loading = true;
    items = await api.queries.list({
      folder: folder === null ? 'null' : folder,
      tag,
      search,
      include_deleted: includeDeleted ? 'true' : undefined,
    });
    loading = false;
  }

  $: void [folder, tag, search, includeDeleted], refresh();

  async function open(item: QueryListDto) {
    await goto(`/q/${item.id}`);
  }

  async function remove(item: QueryListDto) {
    if (!confirm(`Move "${item.name}" to trash?`)) return;
    await api.queries.remove(item.id);
    await refresh();
  }

  async function restore(item: QueryListDto) {
    await api.queries.restore(item.id);
    await refresh();
  }

  function fmt(ms: number | null): string {
    if (!ms) return '—';
    const diff = Date.now() - ms;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  }
</script>

<header class="head">
  <h2>{title}</h2>
  <span class="count">{loading ? '…' : items.length}</span>
</header>

{#if loading}
  <p style="color: var(--text-muted)">Loading…</p>
{:else if items.length === 0}
  <p style="color: var(--text-muted)">No queries here yet.</p>
{:else}
  <ul class="list">
    {#each items as q (q.id)}
      <li>
        <Glass>
          <div class="row">
            <button class="open" on:click={() => open(q)}>
              <div class="name">{q.name}</div>
              <div class="meta">
                <span class="engine">{q.engine}</span>
                {#each q.tags as t}<span class="tag">#{t}</span>{/each}
                <span class="when">{fmt(q.last_opened_at ?? q.updated_at)}</span>
              </div>
            </button>
            <div class="actions">
              {#if includeDeleted}
                <GlassButton on:click={() => restore(q)}>Restore</GlassButton>
              {:else}
                <GlassButton variant="danger" on:click={() => remove(q)}>Delete</GlassButton>
              {/if}
            </div>
          </div>
        </Glass>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 12px; }
  .head h2 { margin: 0; }
  .count { color: var(--text-muted); }
  ul.list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
  .row { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
  .open {
    text-align: left; background: none; border: none; color: var(--text);
    padding: 0; cursor: pointer; display: grid; gap: 4px;
  }
  .name { font-weight: 500; }
  .meta { color: var(--text-muted); font-size: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
  .engine { background: var(--surface); padding: 1px 6px; border-radius: 4px; }
  .tag { color: var(--accent); }
</style>
