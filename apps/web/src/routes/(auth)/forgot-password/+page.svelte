<script lang="ts">
  import { auth, authError, isAuthLoading } from '$lib/stores/auth';
  import { notifications } from '$lib/stores/notification';

  let email = '';
  let formErrors: { email?: string } = {};
  let submitted = false;

  function validateForm(): boolean {
    formErrors = {};
    
    if (!email) {
      formErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      formErrors.email = 'Please enter a valid email address';
    }
    
    return Object.keys(formErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;
    
    auth.clearError();
    
    const success = await auth.requestPasswordReset({ email });
    
    if (success) {
      submitted = true;
      notifications.success('Password reset instructions sent!');
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  }
</script>

<svelte:head>
  <title>Forgot Password - SaaS App</title>
</svelte:head>

<div class="bg-card rounded-lg border border-border shadow-sm p-6 sm:p-8">
  {#if submitted}
    <div class="text-center">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
        <svg class="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      </div>
      <h2 class="mt-4 text-xl font-semibold text-foreground">Check your email</h2>
      <p class="mt-2 text-sm text-muted-foreground">
        We've sent password reset instructions to <span class="font-medium text-foreground">{email}</span>
      </p>
      <p class="mt-4 text-sm text-muted-foreground">
        Didn't receive the email? Check your spam folder or
        <button
          type="button"
          on:click={() => { submitted = false; }}
          class="font-medium text-primary hover:underline"
        >
          try again
        </button>
      </p>
      <div class="mt-6">
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
    </div>
  {:else}
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-foreground">Forgot your password?</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Enter your email address and we'll send you instructions to reset your password.
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
            Sending...
          </span>
        {:else}
          Send reset instructions
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
