<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'danger' = 'secondary';
  export let disabled = false;
  export let type: 'button' | 'submit' = 'button';
</script>

<button class="glass-btn {variant}" {disabled} {type} on:click>
  <slot />
</button>

<style>
  .glass-btn {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    transition: border-color 0.12s ease, background 0.12s ease;
  }
  .glass-btn:hover:not(:disabled) { border-color: var(--accent); }
  .glass-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .primary { background: var(--accent); color: #0a0c12; border-color: transparent; }
  .danger { color: var(--danger); border-color: rgba(255, 122, 122, 0.4); }
</style>
