<script lang="ts">
  import { goto } from '$app/navigation';
  import { ApiResponseError, api } from '$lib/api-client';
  import { authStore } from '$lib/stores/auth';
  import Glass from '$lib/ui/Glass.svelte';
  import GlassButton from '$lib/ui/GlassButton.svelte';
  import GlassInput from '$lib/ui/GlassInput.svelte';

  let password = '';
  let error = '';
  let submitting = false;

  async function submit(e: Event) {
    e.preventDefault();
    error = '';
    submitting = true;
    try {
      await api.auth.login(password);
      authStore.set({ authenticated: true, loading: false });
      await goto('/');
    } catch (err) {
      if (err instanceof ApiResponseError) {
        error =
          err.body.code === 'rate_limited'
            ? `Too many attempts. Retry in ${err.body.retry_after ?? '?'}s.`
            : 'Invalid password';
      } else {
        error = 'Network error';
      }
    } finally {
      submitting = false;
    }
  }
</script>

<main class="page">
  <Glass padding="24px 28px" elevated>
    <h1>search-builder</h1>
    <form on:submit={submit}>
      <label>
        Password
        <GlassInput type="password" placeholder="Password" bind:value={password} autocomplete="current-password" />
      </label>
      {#if error}<p class="err">{error}</p>{/if}
      <GlassButton variant="primary" type="submit" disabled={submitting || password.length === 0}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </GlassButton>
    </form>
  </Glass>
</main>

<style>
  .page { display: grid; place-items: center; min-height: 100vh; }
  h1 { margin: 0 0 16px; font-size: 18px; font-weight: 600; }
  form { display: grid; gap: 12px; min-width: 280px; }
  label { display: grid; gap: 6px; }
  .err { color: var(--danger); margin: 0; }
</style>
