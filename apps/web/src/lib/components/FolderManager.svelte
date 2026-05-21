<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { api } from '$lib/api-client';
  import GlassInput from '$lib/ui/GlassInput.svelte';
  import GlassButton from '$lib/ui/GlassButton.svelte';

  export let mode: 'create' | 'edit';
  export let id = '';
  export let initialName = '';
  export let initialColor = '#6ea8fe';

  const dispatch = createEventDispatcher<{ saved: void; close: void }>();

  let name = initialName;
  let color = initialColor;
  let working = false;

  async function save() {
    working = true;
    try {
      if (mode === 'create') await api.folders.create({ name, color });
      else await api.folders.update(id, { name, color });
      dispatch('saved');
      dispatch('close');
    } finally {
      working = false;
    }
  }

  async function remove() {
    if (!confirm(`Move folder "${initialName}" to trash? Its queries become unfiled.`)) return;
    working = true;
    try {
      await api.folders.remove(id);
      dispatch('saved');
      dispatch('close');
    } finally {
      working = false;
    }
  }
</script>

<div class="overlay" on:click={() => dispatch('close')} on:keydown={(e) => e.key === 'Escape' && dispatch('close')} role="dialog" aria-modal="true" tabindex="-1">
  <div class="modal" on:click|stopPropagation on:keydown|stopPropagation role="document">
    <h3>{mode === 'create' ? 'New folder' : 'Edit folder'}</h3>
    <label><span>Name</span><GlassInput bind:value={name} /></label>
    <label><span>Color</span><input type="color" bind:value={color} /></label>
    <div class="actions">
      {#if mode === 'edit'}<GlassButton variant="danger" on:click={remove}>Delete</GlassButton>{/if}
      <GlassButton on:click={() => dispatch('close')}>Cancel</GlassButton>
      <GlassButton variant="primary" disabled={working || !name} on:click={save}>{working ? '…' : 'Save'}</GlassButton>
    </div>
  </div>
</div>

<style>
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: grid; place-items: center; z-index: 100; }
  .modal { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px; min-width: 320px; display: grid; gap: 12px; }
  h3 { margin: 0; }
  label { display: grid; gap: 6px; }
  label span { font-size: 12px; color: var(--text-muted); }
  input[type=color] { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 4px; height: 36px; width: 60px; }
  .actions { display: flex; gap: 8px; justify-content: flex-end; }
</style>
