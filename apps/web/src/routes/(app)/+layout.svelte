<script lang="ts">
  import Sidebar from '$lib/components/Sidebar.svelte';
  import TopBar from '$lib/components/TopBar.svelte';
  import { loadEngines } from '$lib/stores/engines';
  import { onMount } from 'svelte';
  onMount(loadEngines);
</script>

<div class="shell">
  <TopBar />
  <div class="body">
    <aside><Sidebar /></aside>
    <main><slot /></main>
  </div>
</div>

<style>
  .shell { min-height: 100vh; display: grid; grid-template-rows: 56px 1fr; }
  .body { display: grid; grid-template-columns: 240px 1fr; min-height: 0; }
  aside {
    border-right: 1px solid var(--border);
    padding: 12px;
    overflow-y: auto;
  }
  main { padding: 16px 24px; overflow-y: auto; }
  @media (max-width: 768px) {
    .body { grid-template-columns: 1fr; }
    aside { display: none; }
  }
</style>
