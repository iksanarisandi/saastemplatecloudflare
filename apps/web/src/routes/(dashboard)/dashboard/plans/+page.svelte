<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { 
    plansStore, 
    plans, 
    isPlansLoading, 
    plansError,
    currentSubscription,
    hasActiveSubscription,
  } from '$lib/stores/subscription';
  import type { SubscriptionPlan } from '@saas/shared';

  // Fetch plans and current subscription on mount
  onMount(() => {
    plansStore.fetch();
    currentSubscription.fetch();
  });

  // Modal state
  let showSubscribeModal = false;
  let selectedPlan: SubscriptionPlan | null = null;

  function openSubscribeModal(plan: SubscriptionPlan) {
    selectedPlan = plan;
    showSubscribeModal = true;
  }

  function closeModals() {
    showSubscribeModal = false;
    selectedPlan = null;
  }

  async function handleSubscribe() {
    if (!selectedPlan) return;
    
    closeModals();
    // Redirect to subscribe page with selected plan
    goto(`/dashboard/subscribe?plan=${selectedPlan.id}`);
  }

  // Format helpers
  function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency || 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  function getIntervalLabel(interval: string): string {
    switch (interval) {
      case 'monthly': return '/month';
      case 'yearly': return '/year';
      case 'lifetime': return ' one-time';
      default: return '';
    }
  }

  $: currentPlanId = $currentSubscription.subscription?.planId;
</script>

<svelte:head>
  <title>Subscription Plans - SaaS App</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="text-center">
    <h1 class="text-2xl font-bold text-foreground">Subscription Plans</h1>
    <p class="mt-1 text-muted-foreground">Choose the plan that best fits your needs</p>
  </div>

  <!-- Current subscription info -->
  {#if $hasActiveSubscription && $currentSubscription.plan}
    <div class="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20 p-4">
      <div class="flex items-center gap-3">
        <svg class="h-5 w-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="font-medium text-green-800 dark:text-green-200">
            You're currently subscribed to {$currentSubscription.plan.name}
          </p>
          {#if $currentSubscription.subscription?.currentPeriodEnd}
            <p class="text-sm text-green-600 dark:text-green-400">
              Valid until {new Date($currentSubscription.subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- Error message -->
  {#if $plansError}
    <div class="rounded-md bg-destructive/10 border border-destructive/20 p-4">
      <p class="text-sm text-destructive">{$plansError}</p>
    </div>
  {/if}

  <!-- Plans grid -->
  {#if $isPlansLoading}
    <div class="flex items-center justify-center py-12">
      <div class="flex items-center gap-2 text-muted-foreground">
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading plans...
      </div>
    </div>
  {:else if $plans.length === 0}
    <div class="text-center py-12">
      <p class="text-muted-foreground">No subscription plans available at the moment.</p>
    </div>
  {:else}
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {#each $plans as plan}
        <div 
          class="relative rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          class:border-primary={currentPlanId === plan.id}
          class:border-border={currentPlanId !== plan.id}
        >
          {#if currentPlanId === plan.id}
            <div class="absolute -top-3 left-1/2 -translate-x-1/2">
              <span class="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                Current Plan
              </span>
            </div>
          {/if}

          <div class="text-center mb-6">
            <h3 class="text-xl font-semibold text-foreground">{plan.name}</h3>
            {#if plan.description}
              <p class="mt-2 text-sm text-muted-foreground">{plan.description}</p>
            {/if}
          </div>

          <div class="text-center mb-6">
            <span class="text-4xl font-bold text-foreground">
              {formatCurrency(plan.price, plan.currency)}
            </span>
            <span class="text-muted-foreground">{getIntervalLabel(plan.interval)}</span>
          </div>

          <!-- Features list -->
          {#if plan.features && plan.features.length > 0}
            <ul class="space-y-3 mb-6">
              {#each plan.features as feature}
                <li class="flex items-start gap-2">
                  <svg class="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-sm text-foreground">{feature.name}</span>
                </li>
              {/each}
            </ul>
          {/if}

          <!-- Subscribe button -->
          {#if currentPlanId === plan.id}
            <button
              type="button"
              disabled
              class="w-full rounded-md bg-muted px-4 py-2.5 text-sm font-medium text-muted-foreground cursor-not-allowed"
            >
              Current Plan
            </button>
          {:else}
            <button
              type="button"
              class="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              on:click={() => openSubscribeModal(plan)}
            >
              Subscribe
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Subscribe Modal -->
{#if showSubscribeModal && selectedPlan}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 bg-black/50" on:click={closeModals} on:keydown={(e) => e.key === 'Escape' && closeModals()} role="button" tabindex="0" aria-label="Close modal"></div>
    <div class="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
      <h2 class="text-lg font-semibold text-foreground mb-4">Subscribe to {selectedPlan.name}</h2>
      
      <div class="space-y-4">
        <div class="rounded-lg bg-muted/50 p-4">
          <div class="flex justify-between items-center">
            <span class="text-muted-foreground">Plan</span>
            <span class="font-medium text-foreground">{selectedPlan.name}</span>
          </div>
          <div class="flex justify-between items-center mt-2">
            <span class="text-muted-foreground">Price</span>
            <span class="font-medium text-foreground">
              {formatCurrency(selectedPlan.price, selectedPlan.currency)}{getIntervalLabel(selectedPlan.interval)}
            </span>
          </div>
          <div class="flex justify-between items-center mt-2">
            <span class="text-muted-foreground">Payment Method</span>
            <span class="font-medium text-foreground">QRIS</span>
          </div>
        </div>

        <p class="text-sm text-muted-foreground">
          After clicking "Proceed to Payment", you will be shown a QRIS code. 
          Please complete the payment and upload your payment proof for verification.
        </p>
      </div>
      
      <div class="flex justify-end gap-3 mt-6">
        <button
          type="button"
          class="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
          on:click={closeModals}
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          on:click={handleSubscribe}
        >
          Proceed to Payment
        </button>
      </div>
    </div>
  </div>
{/if}
