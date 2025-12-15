<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { notifications } from '$lib/stores/notification';
  import { api } from '$lib/api';
  import type { Payment, SubscriptionPlan } from '@saas/shared';

  let payment: Payment | null = null;
  let plan: SubscriptionPlan | null = null;
  let isLoading = true;
  let isUploading = false;
  let selectedFile: File | null = null;
  let fileInputRef: HTMLInputElement;
  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  $: paymentId = $page.params.id;

  onMount(async () => {
    await fetchPayment();
    // Auto-refresh payment status every 30 seconds for pending payments
    refreshInterval = setInterval(async () => {
      if (payment?.status === 'pending') {
        await fetchPayment(true);
      }
    }, 30000);
  });

  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  async function fetchPayment(silent = false) {
    if (!silent) {
      isLoading = true;
    }
    const id = paymentId;
    if (!id) {
      notifications.error('Payment ID is required');
      goto('/dashboard/my-payments');
      return;
    }
    try {
      const response = await api.payments.get(id);
      if (response.success && response.data) {
        const previousStatus = payment?.status;
        payment = response.data;
        
        // Notify user if status changed
        if (previousStatus && previousStatus !== payment.status) {
          if (payment.status === 'confirmed') {
            notifications.success('Your payment has been confirmed! Your subscription is now active.');
          } else if (payment.status === 'rejected') {
            notifications.error('Your payment was rejected. Please check the reason below.');
          }
        }
        
        // Fetch plan details
        if (payment.planId && !plan) {
          const planResponse = await api.plans.get(payment.planId);
          if (planResponse.success && planResponse.data) {
            plan = planResponse.data;
          }
        }
      } else {
        if (!silent) {
          notifications.error('Payment not found');
          goto('/dashboard/my-payments');
        }
      }
    } catch (error) {
      if (!silent) {
        notifications.error('Failed to load payment details');
        goto('/dashboard/my-payments');
      }
    } finally {
      if (!silent) {
        isLoading = false;
      }
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
        notifications.success('Payment proof uploaded successfully! Please wait for admin confirmation.');
        selectedFile = null;
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

  function formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'expired': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  }
</script>

<svelte:head>
  <title>Payment - SaaS App</title>
</svelte:head>

{#if isLoading}
  <div class="flex items-center justify-center py-12">
    <div class="flex items-center gap-2 text-muted-foreground">
      <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Loading payment details...
    </div>
  </div>
{:else if payment}
  <div class="max-w-2xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <a href="/dashboard/my-payments" class="rounded p-2 hover:bg-accent">
        <svg class="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </a>
      <div>
        <h1 class="text-2xl font-bold text-foreground">Payment Details</h1>
        <p class="text-muted-foreground">View and manage your payment</p>
      </div>
    </div>

    <!-- Payment info card -->
    <div class="rounded-lg border border-border bg-card p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-foreground">Payment Information</h2>
        <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize {getStatusColor(payment.status)}">
          {payment.status}
        </span>
      </div>

      <div class="space-y-3">
        <div class="flex justify-between">
          <span class="text-muted-foreground">Plan</span>
          <span class="font-medium text-foreground">{plan?.name || 'N/A'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">Amount</span>
          <span class="font-medium text-foreground">{formatCurrency(payment.amount, payment.currency)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">Method</span>
          <span class="font-medium text-foreground uppercase">{payment.method}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">Created</span>
          <span class="font-medium text-foreground">{formatDate(payment.createdAt)}</span>
        </div>
        {#if payment.confirmedAt}
          <div class="flex justify-between">
            <span class="text-muted-foreground">Confirmed</span>
            <span class="font-medium text-foreground">{formatDate(payment.confirmedAt)}</span>
          </div>
        {/if}
        {#if payment.rejectionReason}
          <div class="pt-3 border-t border-border">
            <span class="text-sm text-destructive">Rejection reason: {payment.rejectionReason}</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- QRIS Code section (for pending payments) -->
    {#if payment.status === 'pending' && payment.method === 'qris'}
      <div class="rounded-lg border border-border bg-card p-6">
        <h2 class="text-lg font-semibold text-foreground mb-4">QRIS Payment</h2>
        
        <!-- Placeholder QRIS code -->
        <div class="flex flex-col items-center mb-6">
          <div class="w-48 h-48 bg-muted rounded-lg flex items-center justify-center mb-4">
            <div class="text-center text-muted-foreground">
              <svg class="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <p class="text-sm">QRIS Code</p>
            </div>
          </div>
          <p class="text-sm text-muted-foreground text-center">
            Scan this QRIS code with your mobile banking app to complete the payment
          </p>
        </div>

        <!-- Upload proof section -->
        <div class="border-t border-border pt-6">
          <h3 class="font-medium text-foreground mb-3">Upload Payment Proof</h3>
          
          {#if payment.proofFileId}
            <div class="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 p-4 mb-4">
              <div class="flex items-center gap-2 text-green-800 dark:text-green-200">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="font-medium">Payment proof uploaded</span>
              </div>
              <p class="text-sm text-green-600 dark:text-green-400 mt-1">
                Your payment proof has been submitted. Please wait for admin confirmation.
              </p>
            </div>
          {:else}
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
                  <span class="inline-flex items-center gap-2">
                    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </span>
                {:else}
                  Upload Payment Proof
                {/if}
              </button>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Status messages -->
    {#if payment.status === 'confirmed'}
      <div class="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 p-6 text-center">
        <svg class="h-12 w-12 mx-auto text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="text-lg font-semibold text-green-800 dark:text-green-200">Payment Confirmed!</h3>
        <p class="text-green-600 dark:text-green-400 mt-1">Your subscription is now active.</p>
        <a
          href="/dashboard"
          class="inline-block mt-4 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Go to Dashboard
        </a>
      </div>
    {:else if payment.status === 'rejected'}
      <div class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 p-6 text-center">
        <svg class="h-12 w-12 mx-auto text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="text-lg font-semibold text-red-800 dark:text-red-200">Payment Rejected</h3>
        <p class="text-red-600 dark:text-red-400 mt-1">Please try again with a new payment.</p>
        <a
          href="/dashboard/subscribe"
          class="inline-block mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Subscribe Again
        </a>
      </div>
    {:else if payment.status === 'pending' && payment.proofFileId}
      <div class="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 p-6 text-center">
        <svg class="h-12 w-12 mx-auto text-blue-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="text-lg font-semibold text-blue-800 dark:text-blue-200">Awaiting Verification</h3>
        <p class="text-blue-600 dark:text-blue-400 mt-1">Your payment proof is being reviewed by our team.</p>
        <p class="text-sm text-blue-500 dark:text-blue-500 mt-2">This page will automatically update when your payment is verified.</p>
      </div>
    {/if}
  </div>
{/if}
