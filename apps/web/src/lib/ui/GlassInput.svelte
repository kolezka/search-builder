<script lang="ts">
  export let value = '';
  export let placeholder = '';
  export let type: 'text' | 'password' = 'text';
  export let autocomplete: HTMLInputElement['autocomplete'] = 'off';
  export let disabled = false;
</script>

<input
  class="glass-input"
  bind:value
  {placeholder}
  {type}
  {autocomplete}
  {disabled}
  on:input
  on:keydown
  on:focus
  on:blur
/>

<style>
  .glass-input {
    width: 100%;
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 8px 10px;
    outline: none;
  }
  .glass-input:focus { border-color: var(--accent); }
  .glass-input:disabled { opacity: 0.6; }
</style>
