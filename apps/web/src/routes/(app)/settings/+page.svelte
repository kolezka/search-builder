<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiResponseError } from '$lib/api-client';
  import Glass from '$lib/ui/Glass.svelte';
  import GlassInput from '$lib/ui/GlassInput.svelte';
  import GlassButton from '$lib/ui/GlassButton.svelte';

  let stats: Awaited<ReturnType<typeof api.stats.get>> | null = null;
  let oldPw = '';
  let newPw = '';
  let confirmPw = '';
  let err = '';
  let msg = '';
  let working = false;

  onMount(async () => {
    stats = await api.stats.get();
  });

  async function submit(e: Event) {
    e.preventDefault();
    err = ''; msg = '';
    if (newPw.length < 8) { err = 'New password must be at least 8 chars'; return; }
    if (newPw !== confirmPw) { err = 'New passwords do not match'; return; }
    working = true;
    try {
      await api.auth.changePassword(oldPw, newPw);
      msg = 'Password updated. Other sessions signed out.';
      oldPw = newPw = confirmPw = '';
    } catch (e) {
      err = e instanceof ApiResponseError && e.body.code === 'unauthorized' ? 'Current password is wrong' : 'Failed';
    } finally {
      working = false;
    }
  }

  function fmtBytes(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
    return `${(n / 1024 ** 3).toFixed(2)} GB`;
  }
</script>

<h2>Settings</h2>

<section>
  <h3>Storage</h3>
  <Glass>
    {#if !stats}
      <p style="color: var(--text-muted)">Loading…</p>
    {:else}
      <dl>
        <dt>Queries</dt><dd>{stats.queries_count}</dd>
        <dt>Folders</dt><dd>{stats.folders_count}</dd>
        <dt>Tags</dt><dd>{stats.tags_count}</dd>
        <dt>Templates</dt><dd>{stats.templates_count}</dd>
        <dt>Database</dt><dd>{fmtBytes(stats.db_size_bytes)}</dd>
      </dl>
    {/if}
  </Glass>
</section>

<section>
  <h3>Change password</h3>
  <Glass>
    <form on:submit={submit}>
      <label><span>Current password</span><GlassInput type="password" bind:value={oldPw} /></label>
      <label><span>New password</span><GlassInput type="password" bind:value={newPw} /></label>
      <label><span>Confirm new</span><GlassInput type="password" bind:value={confirmPw} /></label>
      {#if err}<p class="err">{err}</p>{/if}
      {#if msg}<p class="ok">{msg}</p>{/if}
      <GlassButton variant="primary" type="submit" disabled={working || !oldPw || !newPw}>
        {working ? 'Working…' : 'Update password'}
      </GlassButton>
    </form>
  </Glass>
</section>

<style>
  h2 { margin: 0 0 12px; }
  section { margin-bottom: 18px; max-width: 480px; }
  h3 { margin: 0 0 8px; font-size: 14px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  dl { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; margin: 0; }
  dt { color: var(--text-muted); }
  form { display: grid; gap: 10px; }
  label { display: grid; gap: 4px; }
  label span { font-size: 12px; color: var(--text-muted); }
  .err { color: var(--danger); margin: 0; }
  .ok { color: var(--success); margin: 0; }
</style>
