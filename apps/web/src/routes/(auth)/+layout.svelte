<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth, isAuthenticated } from '$lib/stores/auth';

  // Redirect to dashboard if already authenticated
  onMount(() => {
    const unsubscribe = isAuthenticated.subscribe(authenticated => {
      if (authenticated) {
        goto('/dashboard');
      }
    });

    return unsubscribe;
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
  <div class="w-full max-w-md space-y-8">
    <div class="text-center">
      <a href="/" class="inline-block">
        <h1 class="text-2xl font-bold tracking-tight text-foreground">
          SaaS App
        </h1>
      </a>
    </div>
    <slot />
  </div>
</div>
