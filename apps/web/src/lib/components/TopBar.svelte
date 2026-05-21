<script lang="ts">
  import { goto } from '$app/navigation';
  import { logout } from '$lib/stores/auth';
  import { enginesStore } from '$lib/stores/engines';
  import GlassButton from '$lib/ui/GlassButton.svelte';
  import GlassInput from '$lib/ui/GlassInput.svelte';
  import TemplatePickerModal from './TemplatePickerModal.svelte';

  let search = '';
  let menuOpen = false;
  let templateModalOpen = false;

  function go(engine: string) {
    menuOpen = false;
    goto(`/q/new?engine=${engine}`);
  }

  function submitSearch(e: KeyboardEvent) {
    if (e.key === 'Enter') goto(`/?search=${encodeURIComponent(search)}`);
  }

  async function doLogout() {
    await logout();
    goto('/login');
  }
</script>

<header>
  <a class="brand" href="/">search-builder</a>
  <div class="search">
    <GlassInput bind:value={search} placeholder="Search queries…" on:keydown={submitSearch} />
  </div>
  <div class="actions">
    <div class="dropdown">
      <GlassButton variant="primary" on:click={() => (menuOpen = !menuOpen)}>+ New query</GlassButton>
      {#if menuOpen}
        <div class="menu">
          {#each $enginesStore as e}
            <button on:click={() => go(e.key)}>{e.name}</button>
          {/each}
          <button on:click={() => { menuOpen = false; templateModalOpen = true; }}>From template…</button>
        </div>
      {/if}
    </div>
    <a href="/settings" title="Settings">⚙</a>
    <button class="logout" on:click={doLogout} title="Logout">⎋</button>
  </div>
</header>

{#if templateModalOpen}
  <TemplatePickerModal on:close={() => (templateModalOpen = false)} />
{/if}

<style>
  header {
    display: grid; grid-template-columns: 220px 1fr auto;
    gap: 12px; align-items: center; padding: 8px 16px;
    border-bottom: 1px solid var(--border);
  }
  .brand { font-weight: 600; }
  .actions { display: flex; gap: 8px; align-items: center; }
  .actions a, .logout {
    color: var(--text-muted); background: none; border: none; font-size: 18px;
  }
  .actions a:hover, .logout:hover { color: var(--text); }
  .dropdown { position: relative; }
  .menu {
    position: absolute; right: 0; top: calc(100% + 6px);
    background: var(--surface-strong); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 4px; display: grid; min-width: 180px; z-index: 10;
  }
  .menu button {
    text-align: left; background: none; border: none; color: var(--text);
    padding: 8px 10px; border-radius: var(--radius-sm);
  }
  .menu button:hover { background: var(--surface); }
</style>
