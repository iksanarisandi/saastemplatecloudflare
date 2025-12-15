<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { auth, authError, isAuthLoading } from '$lib/stores/auth';
  import { notifications } from '$lib/stores/notification';

  // Get token from URL query params
  $: token = $page.url.searchParams.get('token') || '';

  let newPassword = '';
  let confirmPassword = '';
  let formErrors: { newPassword?: string; confirmPassword?: string; token?: string } = {};
  let submitted = false;

  function validateForm(): boolean {
    formErrors = {};
    
    if (!token) {
      formErrors.token = 'Invalid or missing reset token';
    }
    
    if (!newPassword) {
      formErrors.newPassword = 'Password is required';
    } else if (newPassword.length < 8) {
      formErrors.newPassword = 'Password must be at least 8 characters';
    }
    
    if (!confirmPassword) {
      formErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      formErrors.confirmPassword = 'Passwords do not match';
    }
    
    return Object.keys(formErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;
    
    auth.clearError();
    
    const success = await auth.confirmPasswordReset({ token, newPassword });
    
    if (success) {
      submitted = true;
      notifications.success('Password reset successfully!');
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  }
</script>

<svelte:head>
  <title>Reset Password - SaaS App</title>
</svelte:head>

<div class="bg-card rounded-lg border border-border shadow-sm p-6 sm:p-8">
  {#if submitted}
    <div class="text-center">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
        <svg class="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 class="mt-4 text-xl font-semibold text-foreground">Password reset successful</h2>
      <p class="mt-2 text-sm text-muted-foreground">
        Your password has been reset. You can now sign in with your new password.
      </p>
      <div class="mt-6">
        <a
          href="/login"
          class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Sign in
        </a>
      </div>
    </div>
  {:else if !token}
    <div class="text-center">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <svg class="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h2 class="mt-4 text-xl font-semibold text-foreground">Invalid reset link</h2>
      <p class="mt-2 text-sm text-muted-foreground">
        This password reset link is invalid or has expired. Please request a new one.
      </p>
      <div class="mt-6">
        <a
          href="/forgot-password"
          class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Request new link
        </a>
      </div>
    </div>
  {:else}
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-foreground">Reset your password</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Enter your new password below.
      </p>
    </div>

    {#if $authError}
      <div class="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3">
        <p class="text-sm text-destructive">{$authError}</p>
      </div>
    {/if}

    <form on:submit|preventDefault={handleSubmit} class="space-y-4">
      <div>
        <label for="newPassword" class="block text-sm font-medium text-foreground mb-1.5">
          New password
        </label>
        <input
          id="newPassword"
          type="password"
          bind:value={newPassword}
          on:keydown={handleKeydown}
          disabled={$isAuthLoading}
          autocomplete="new-password"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          class:border-destructive={formErrors.newPassword}
          placeholder="••••••••"
        />
        {#if formErrors.newPassword}
          <p class="mt-1 text-sm text-destructive">{formErrors.newPassword}</p>
        {:else}
          <p class="mt-1 text-xs text-muted-foreground">Must be at least 8 characters</p>
        {/if}
      </div>

      <div>
        <label for="confirmPassword" class="block text-sm font-medium text-foreground mb-1.5">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          bind:value={confirmPassword}
          on:keydown={handleKeydown}
          disabled={$isAuthLoading}
          autocomplete="new-password"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          class:border-destructive={formErrors.confirmPassword}
          placeholder="••••••••"
        />
        {#if formErrors.confirmPassword}
          <p class="mt-1 text-sm text-destructive">{formErrors.confirmPassword}</p>
        {/if}
      </div>

      <button
        type="submit"
        disabled={$isAuthLoading}
        class="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {#if $isAuthLoading}
          <span class="inline-flex items-center gap-2">
            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Resetting password...
          </span>
        {:else}
          Reset password
        {/if}
      </button>
    </form>

    <div class="mt-4 text-center">
      <a
        href="/login"
        class="inline-flex items-center text-sm font-medium text-primary hover:underline"
      >
        <svg class="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to login
      </a>
    </div>
  {/if}
</div>
