<script lang="ts">
  export let padding: string = '12px 16px';
  export let radius: string = 'var(--radius-md)';
  export let elevated = false;
  let className = '';
  export { className as class };
</script>

<div
  class={`glass ${className}`}
  style="--p:{padding};--r:{radius};{elevated ? '--sh:var(--shadow-2)' : '--sh:var(--shadow-1)'}"
>
  <slot />
</div>

<style>
  .glass {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: var(--p);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    box-shadow: var(--sh);
  }
</style>
