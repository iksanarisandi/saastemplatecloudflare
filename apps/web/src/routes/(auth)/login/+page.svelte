<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth, authError, isAuthLoading } from '$lib/stores/auth';
  import { notifications } from '$lib/stores/notification';

  let email = '';
  let password = '';
  let formErrors: { email?: string; password?: string } = {};

  function validateForm(): boolean {
    formErrors = {};
    
    if (!email) {
      formErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      formErrors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      formErrors.password = 'Password is required';
    }
    
    return Object.keys(formErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;
    
    auth.clearError();
    
    const success = await auth.login({ email, password });
    
    if (success) {
      notifications.success('Welcome back!');
      goto('/dashboard');
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  }
</script>

<svelte:head>
  <title>Login - SaaS App</title>
</svelte:head>

<div class="bg-card rounded-lg border border-border shadow-sm p-6 sm:p-8">
  <div class="mb-6">
    <h2 class="text-xl font-semibold text-foreground">Sign in to your account</h2>
    <p class="mt-1 text-sm text-muted-foreground">
      Don't have an account?
      <a href="/register" class="font-medium text-primary hover:underline">
        Sign up
      </a>
    </p>
  </div>

  {#if $authError}
    <div class="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3">
      <p class="text-sm text-destructive">{$authError}</p>
    </div>
  {/if}

  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <div>
      <label for="email" class="block text-sm font-medium text-foreground mb-1.5">
        Email address
      </label>
      <input
        id="email"
        type="email"
        bind:value={email}
        on:keydown={handleKeydown}
        disabled={$isAuthLoading}
        autocomplete="email"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        class:border-destructive={formErrors.email}
        placeholder="you@example.com"
      />
      {#if formErrors.email}
        <p class="mt-1 text-sm text-destructive">{formErrors.email}</p>
      {/if}
    </div>

    <div>
      <div class="flex items-center justify-between mb-1.5">
        <label for="password" class="block text-sm font-medium text-foreground">
          Password
        </label>
        <a href="/forgot-password" class="text-sm text-primary hover:underline">
          Forgot password?
        </a>
      </div>
      <input
        id="password"
        type="password"
        bind:value={password}
        on:keydown={handleKeydown}
        disabled={$isAuthLoading}
        autocomplete="current-password"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        class:border-destructive={formErrors.password}
        placeholder="••••••••"
      />
      {#if formErrors.password}
        <p class="mt-1 text-sm text-destructive">{formErrors.password}</p>
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
          Signing in...
        </span>
      {:else}
        Sign in
      {/if}
    </button>
  </form>
</div>
