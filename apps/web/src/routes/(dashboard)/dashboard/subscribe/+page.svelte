<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { 
    plansStore, 
    plans, 
    isPlansLoading, 
    plansError,
    currentSubscription,
    hasActiveSubscription,
  } from '$lib/stores/subscription';
  import { notifications } from '$lib/stores/notification';
  import { api } from '$lib/api';
  import type { SubscriptionPlan, PaymentInput, Payment } from '@saas/shared';

  // State
  let selectedPlanId: string | null = null;
  let selectedPlan: SubscriptionPlan | null = null;
  let payment: Payment | null = null;
  let step: 'select' | 'qris' | 'upload' = 'select';
  let isProcessing = false;
  let isUploading = false;
  let selectedFile: File | null = null;
  let fileInputRef: HTMLInputElement;

  // Get plan ID from URL if provided
  $: {
    const planIdParam = $page.url.searchParams.get('plan');
    if (planIdParam && $plans.length > 0 && !selectedPlanId) {
      const plan = $plans.find(p => p.id === planIdParam);
      if (plan) {
        selectedPlanId = plan.id;
        selectedPlan = plan;
      }
    }
  }

  onMount(() => {
    plansStore.fetch();
    currentSubscription.fetch();
  });

  function selectPlan(plan: SubscriptionPlan) {
    selectedPlanId = plan.id;
    selectedPlan = plan;
  }

  async function proceedToPayment() {
    if (!selectedPlan) return;
    
    isProcessing = true;
    
    try {
      const paymentData: PaymentInput = {
        amount: selectedPlan.price,
        currency: selectedPlan.currency,
        method: 'qris',
        subscriptionPlanId: selectedPlan.id,
      };
      
      const response = await api.payments.create(paymentData);

      if (response.success && response.data) {
        payment = response.data;
        step = 'qris';
      } else {
        notifications.error('Failed to initiate payment');
      }
    } catch (error) {
      notifications.error('An error occurred while processing your request');
    } finally {
      isProcessing = false;
    }
  }


  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      selectedFile = input.files[0];
    }
  }

  async function handleUpload() {
    if (!selectedFile || !payment) return;
    
    isUploading = true;
    try {
      const response = await api.payments.uploadProof(payment.id, selectedFile);
      if (response.success && response.data) {
        payment = response.data;
        step = 'upload';
        notifications.success('Payment proof uploaded successfully!');
      } else {
        notifications.error('Failed to upload payment proof');
      }
    } catch (error) {
      notifications.error('An error occurred while uploading');
    } finally {
      isUploading = false;
    }
  }

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
  <title>Subscribe - SaaS App</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
  <!-- Progress Steps -->
  <div class="mb-8">
    <div class="flex items-center justify-center">
      <div class="flex items-center">
        <div class="flex items-center justify-center w-10 h-10 rounded-full {step === 'select' ? 'bg-primary text-primary-foreground' : 'bg-green-500 text-white'}">
          {#if step !== 'select'}
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          {:else}
            <span>1</span>
          {/if}
        </div>
        <span class="ml-2 text-sm font-medium {step === 'select' ? 'text-foreground' : 'text-muted-foreground'}">Select Plan</span>
      </div>
      <div class="w-16 h-0.5 mx-4 {step !== 'select' ? 'bg-green-500' : 'bg-border'}"></div>
      <div class="flex items-center">
        <div class="flex items-center justify-center w-10 h-10 rounded-full {step === 'qris' ? 'bg-primary text-primary-foreground' : step === 'upload' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}">
          {#if step === 'upload'}
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          {:else}
            <span>2</span>
          {/if}
        </div>
        <span class="ml-2 text-sm font-medium {step === 'qris' ? 'text-foreground' : 'text-muted-foreground'}">Pay with QRIS</span>
      </div>
      <div class="w-16 h-0.5 mx-4 {step === 'upload' ? 'bg-green-500' : 'bg-border'}"></div>
      <div class="flex items-center">
        <div class="flex items-center justify-center w-10 h-10 rounded-full {step === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}">
          <span>3</span>
        </div>
        <span class="ml-2 text-sm font-medium {step === 'upload' ? 'text-foreground' : 'text-muted-foreground'}">Confirmation</span>
      </div>
    </div>
  </div>


  <!-- Step 1: Plan Selection -->
  {#if step === 'select'}
    <div class="space-y-6">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-foreground">Choose Your Plan</h1>
        <p class="mt-1 text-muted-foreground">Select the plan that best fits your needs</p>
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
            <button
              type="button"
              class="relative rounded-lg border bg-card p-6 text-left shadow-sm transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
              class:border-primary={selectedPlanId === plan.id}
              class:border-border={selectedPlanId !== plan.id}
              class:ring-2={selectedPlanId === plan.id}
              class:ring-primary={selectedPlanId === plan.id}
              disabled={currentPlanId === plan.id}
              on:click={() => selectPlan(plan)}
            >
              {#if currentPlanId === plan.id}
                <div class="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span class="inline-flex items-center rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white">
                    Current Plan
                  </span>
                </div>
              {:else if selectedPlanId === plan.id}
                <div class="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span class="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Selected
                  </span>
                </div>
              {/if}

              <div class="text-center mb-4">
                <h3 class="text-xl font-semibold text-foreground">{plan.name}</h3>
                {#if plan.description}
                  <p class="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                {/if}
              </div>

              <div class="text-center mb-4">
                <span class="text-3xl font-bold text-foreground">
                  {formatCurrency(plan.price, plan.currency)}
                </span>
                <span class="text-muted-foreground">{getIntervalLabel(plan.interval)}</span>
              </div>

              {#if plan.features && plan.features.length > 0}
                <ul class="space-y-2">
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
            </button>
          {/each}
        </div>

        <!-- Continue button -->
        <div class="flex justify-center pt-6">
          <button
            type="button"
            class="rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!selectedPlan || isProcessing || currentPlanId === selectedPlanId}
            on:click={proceedToPayment}
          >
            {#if isProcessing}
              <span class="inline-flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            {:else}
              Continue to Payment
            {/if}
          </button>
        </div>
      {/if}
    </div>
  {/if}


  <!-- Step 2: QRIS Payment -->
  {#if step === 'qris' && payment && selectedPlan}
    <div class="max-w-xl mx-auto space-y-6">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-foreground">Complete Your Payment</h1>
        <p class="mt-1 text-muted-foreground">Scan the QRIS code below to pay</p>
      </div>

      <!-- Payment summary -->
      <div class="rounded-lg border border-border bg-card p-6">
        <h2 class="text-lg font-semibold text-foreground mb-4">Payment Summary</h2>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Plan</span>
            <span class="font-medium text-foreground">{selectedPlan.name}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Billing</span>
            <span class="font-medium text-foreground capitalize">{selectedPlan.interval}</span>
          </div>
          <div class="flex justify-between border-t border-border pt-3">
            <span class="text-foreground font-medium">Total</span>
            <span class="text-xl font-bold text-foreground">{formatCurrency(payment.amount, payment.currency)}</span>
          </div>
        </div>
      </div>

      <!-- QRIS Code -->
      <div class="rounded-lg border border-border bg-card p-6">
        <h2 class="text-lg font-semibold text-foreground mb-4 text-center">QRIS Code</h2>
        
        <div class="flex flex-col items-center">
          <!-- QRIS Placeholder - In production, this would be a real QRIS image -->
          <div class="w-64 h-64 bg-white rounded-lg border-2 border-border flex items-center justify-center mb-4 p-4">
            <div class="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded flex flex-col items-center justify-center">
              <svg class="h-16 w-16 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <p class="text-sm text-gray-500 text-center">QRIS Code</p>
              <p class="text-xs text-gray-400 mt-1">Scan with your banking app</p>
            </div>
          </div>
          
          <div class="text-center space-y-2">
            <p class="text-sm text-muted-foreground">
              Scan this QRIS code using your mobile banking or e-wallet app
            </p>
            <p class="text-xs text-muted-foreground">
              Payment ID: <span class="font-mono">{payment.id.slice(0, 8)}...</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Upload Proof Section -->
      <div class="rounded-lg border border-border bg-card p-6">
        <h2 class="text-lg font-semibold text-foreground mb-4">Upload Payment Proof</h2>
        <p class="text-sm text-muted-foreground mb-4">
          After completing the payment, please upload a screenshot of your payment confirmation.
        </p>
        
        <div class="space-y-4">
          <div 
            class="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            on:click={() => fileInputRef.click()}
            on:keydown={(e) => e.key === 'Enter' && fileInputRef.click()}
            role="button"
            tabindex="0"
          >
            <input
              type="file"
              accept="image/*"
              class="hidden"
              bind:this={fileInputRef}
              on:change={handleFileSelect}
            />
            
            {#if selectedFile}
              <div class="flex items-center justify-center gap-2 text-foreground">
                <svg class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{selectedFile.name}</span>
              </div>
              <p class="text-sm text-muted-foreground mt-1">Click to change file</p>
            {:else}
              <svg class="h-10 w-10 mx-auto text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p class="text-foreground">Click to upload payment proof</p>
              <p class="text-sm text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
            {/if}
          </div>

          <button
            type="button"
            class="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!selectedFile || isUploading}
            on:click={handleUpload}
          >
            {#if isUploading}
              <span class="inline-flex items-center justify-center gap-2">
                <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </span>
            {:else}
              Submit Payment Proof
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}


  <!-- Step 3: Confirmation -->
  {#if step === 'upload' && payment && selectedPlan}
    <div class="max-w-xl mx-auto space-y-6">
      <div class="text-center">
        <div class="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <svg class="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-foreground">Payment Proof Submitted!</h1>
        <p class="mt-2 text-muted-foreground">
          Your payment proof has been submitted for verification.
        </p>
      </div>

      <!-- Payment details -->
      <div class="rounded-lg border border-border bg-card p-6">
        <h2 class="text-lg font-semibold text-foreground mb-4">Payment Details</h2>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Payment ID</span>
            <span class="font-mono text-sm text-foreground">{payment.id.slice(0, 12)}...</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Plan</span>
            <span class="font-medium text-foreground">{selectedPlan.name}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Amount</span>
            <span class="font-medium text-foreground">{formatCurrency(payment.amount, payment.currency)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Status</span>
            <span class="inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-400">
              Pending Verification
            </span>
          </div>
        </div>
      </div>

      <!-- What's next -->
      <div class="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 p-6">
        <h3 class="font-semibold text-blue-800 dark:text-blue-200 mb-3">What happens next?</h3>
        <ul class="space-y-2 text-sm text-blue-700 dark:text-blue-300">
          <li class="flex items-start gap-2">
            <span class="font-medium">1.</span>
            <span>Our team will verify your payment proof within 1-24 hours</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="font-medium">2.</span>
            <span>You'll receive a notification once your payment is confirmed</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="font-medium">3.</span>
            <span>Your subscription will be activated immediately after confirmation</span>
          </li>
        </ul>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href="/dashboard/my-payments"
          class="inline-flex items-center justify-center rounded-md border border-input px-6 py-2.5 text-sm font-medium hover:bg-accent"
        >
          View Payment History
        </a>
        <a
          href="/dashboard"
          class="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  {/if}
</div>
