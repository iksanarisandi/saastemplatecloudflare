<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isAdmin } from '$lib/stores/auth';
  import { 
    paymentList, 
    payments, 
    paymentPagination, 
    isPaymentListLoading, 
    paymentListError 
  } from '$lib/stores/payment';
  import { notifications } from '$lib/stores/notification';
  import { api } from '$lib/api';
  import type { Payment } from '@saas/shared';

  // Redirect non-admins
  onMount(() => {
    const unsubscribe = isAdmin.subscribe(admin => {
      if (!admin) {
        goto('/dashboard');
      }
    });
    
    // Fetch pending payments by default
    paymentList.fetch({ status: 'pending' });

    return unsubscribe;
  });

  // Modal state
  let showConfirmModal = false;
  let showRejectModal = false;
  let showProofModal = false;
  let selectedPayment: Payment | null = null;
  let rejectReason = '';
  let proofUrl = '';

  // Filter state
  let statusFilter = 'pending';

  function handleStatusFilter() {
    paymentList.filterByStatus(statusFilter || undefined);
  }

  // Modal handlers
  function openConfirmModal(payment: Payment) {
    selectedPayment = payment;
    showConfirmModal = true;
  }

  function openRejectModal(payment: Payment) {
    selectedPayment = payment;
    rejectReason = '';
    showRejectModal = true;
  }

  async function openProofModal(payment: Payment) {
    selectedPayment = payment;
    proofUrl = '';
    
    if (payment.proofFileId) {
      try {
        const response = await api.files.getUrl(payment.proofFileId);
        if (response.success && response.data) {
          proofUrl = response.data.url;
        }
      } catch (error) {
        notifications.error('Failed to load payment proof');
      }
    }
    
    showProofModal = true;
  }

  function closeModals() {
    showConfirmModal = false;
    showRejectModal = false;
    showProofModal = false;
    selectedPayment = null;
    rejectReason = '';
    proofUrl = '';
  }

  // Action handlers
  async function handleConfirm() {
    if (!selectedPayment) return;
    
    const success = await paymentList.confirm(selectedPayment.id);
    if (success) {
      notifications.success('Payment confirmed successfully');
      closeModals();
    }
  }

  async function handleReject() {
    if (!selectedPayment) return;
    
    if (!rejectReason.trim()) {
      notifications.error('Please provide a rejection reason');
      return;
    }
    
    const success = await paymentList.reject(selectedPayment.id, rejectReason);
    if (success) {
      notifications.success('Payment rejected');
      closeModals();
    }
  }

  // Pagination
  function goToPage(page: number) {
    paymentList.goToPage(page);
  }

  // Format helpers
  function formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency || 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
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

  function getMethodLabel(method: string): string {
    switch (method) {
      case 'qris': return 'QRIS';
      case 'bank_transfer': return 'Bank Transfer';
      case 'gateway': return 'Payment Gateway';
      default: return method;
    }
  }
</script>

<svelte:head>
  <title>Payment Management - SaaS App</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div>
    <h1 class="text-2xl font-bold text-foreground">Payment Management</h1>
    <p class="mt-1 text-muted-foreground">Review and manage payment confirmations</p>
  </div>

  <!-- Filters -->
  <div class="flex flex-col gap-4 sm:flex-row">
    <select
      bind:value={statusFilter}
      on:change={handleStatusFilter}
      class="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">All Status</option>
      <option value="pending">Pending</option>
      <option value="confirmed">Confirmed</option>
      <option value="rejected">Rejected</option>
      <option value="expired">Expired</option>
    </select>
  </div>

  <!-- Error message -->
  {#if $paymentListError}
    <div class="rounded-md bg-destructive/10 border border-destructive/20 p-4">
      <p class="text-sm text-destructive">{$paymentListError}</p>
    </div>
  {/if}

  <!-- Payments table -->
  <div class="rounded-lg border border-border bg-card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-muted/50">
          <tr>
            <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">ID</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Amount</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Method</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Proof</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Created</th>
            <th class="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          {#if $isPaymentListLoading}
            <tr>
              <td colspan="7" class="px-4 py-8 text-center text-muted-foreground">
                <div class="flex items-center justify-center gap-2">
                  <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading payments...
                </div>
              </td>
            </tr>
          {:else if $payments.length === 0}
            <tr>
              <td colspan="7" class="px-4 py-8 text-center text-muted-foreground">
                No payments found
              </td>
            </tr>
          {:else}
            {#each $payments as payment}
              <tr class="hover:bg-muted/50">
                <td class="px-4 py-3 text-sm text-foreground font-mono">
                  {payment.id.slice(0, 8)}...
                </td>
                <td class="px-4 py-3 text-sm font-medium text-foreground">
                  {formatCurrency(payment.amount, payment.currency)}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {getMethodLabel(payment.method)}
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize {getStatusColor(payment.status)}">
                    {payment.status}
                  </span>
                </td>
                <td class="px-4 py-3">
                  {#if payment.proofFileId}
                    <button
                      type="button"
                      class="text-sm text-primary hover:underline"
                      on:click={() => openProofModal(payment)}
                    >
                      View Proof
                    </button>
                  {:else}
                    <span class="text-sm text-muted-foreground">No proof</span>
                  {/if}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {formatDate(payment.createdAt)}
                </td>
                <td class="px-4 py-3 text-right">
                  {#if payment.status === 'pending'}
                    <div class="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        class="rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                        on:click={() => openConfirmModal(payment)}
                        title="Confirm payment"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        class="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                        on:click={() => openRejectModal(payment)}
                        title="Reject payment"
                      >
                        Reject
                      </button>
                    </div>
                  {:else if payment.status === 'rejected' && payment.rejectionReason}
                    <span class="text-xs text-muted-foreground" title={payment.rejectionReason}>
                      Reason: {payment.rejectionReason.slice(0, 20)}...
                    </span>
                  {:else}
                    <span class="text-xs text-muted-foreground">—</span>
                  {/if}
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if $paymentPagination && $paymentPagination.totalPages > 1}
      <div class="flex items-center justify-between border-t border-border px-4 py-3">
        <p class="text-sm text-muted-foreground">
          Showing {($paymentPagination.page - 1) * $paymentPagination.limit + 1} to {Math.min($paymentPagination.page * $paymentPagination.limit, $paymentPagination.total)} of {$paymentPagination.total} payments
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-md border border-input px-3 py-1 text-sm disabled:opacity-50"
            disabled={$paymentPagination.page === 1}
            on:click={() => goToPage($paymentPagination.page - 1)}
          >
            Previous
          </button>
          <span class="text-sm text-muted-foreground">
            Page {$paymentPagination.page} of {$paymentPagination.totalPages}
          </span>
          <button
            type="button"
            class="rounded-md border border-input px-3 py-1 text-sm disabled:opacity-50"
            disabled={$paymentPagination.page === $paymentPagination.totalPages}
            on:click={() => goToPage($paymentPagination.page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Confirm Payment Modal -->
{#if showConfirmModal && selectedPayment}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 bg-black/50" on:click={closeModals} on:keydown={(e) => e.key === 'Escape' && closeModals()} role="button" tabindex="0" aria-label="Close modal"></div>
    <div class="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
      <h2 class="text-lg font-semibold text-foreground mb-2">Confirm Payment</h2>
      <p class="text-muted-foreground mb-4">
        Are you sure you want to confirm this payment of <span class="font-medium text-foreground">{formatCurrency(selectedPayment.amount, selectedPayment.currency)}</span>?
        This will activate the user's subscription.
      </p>
      
      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
          on:click={closeModals}
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          on:click={handleConfirm}
          disabled={$isPaymentListLoading}
        >
          {$isPaymentListLoading ? 'Confirming...' : 'Confirm Payment'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Reject Payment Modal -->
{#if showRejectModal && selectedPayment}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 bg-black/50" on:click={closeModals} on:keydown={(e) => e.key === 'Escape' && closeModals()} role="button" tabindex="0" aria-label="Close modal"></div>
    <div class="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
      <h2 class="text-lg font-semibold text-foreground mb-4">Reject Payment</h2>
      
      <div class="space-y-4">
        <p class="text-muted-foreground">
          Rejecting payment of <span class="font-medium text-foreground">{formatCurrency(selectedPayment.amount, selectedPayment.currency)}</span>.
        </p>
        
        <div>
          <label for="reject-reason" class="block text-sm font-medium text-foreground mb-1.5">
            Rejection Reason
          </label>
          <textarea
            id="reject-reason"
            bind:value={rejectReason}
            rows="3"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Please provide a reason for rejection..."
          ></textarea>
        </div>
      </div>
      
      <div class="flex justify-end gap-3 mt-4">
        <button
          type="button"
          class="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
          on:click={closeModals}
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          on:click={handleReject}
          disabled={$isPaymentListLoading}
        >
          {$isPaymentListLoading ? 'Rejecting...' : 'Reject Payment'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Payment Proof Modal -->
{#if showProofModal && selectedPayment}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 bg-black/50" on:click={closeModals} on:keydown={(e) => e.key === 'Escape' && closeModals()} role="button" tabindex="0" aria-label="Close modal"></div>
    <div class="relative z-10 w-full max-w-2xl rounded-lg border border-border bg-card p-6 shadow-lg">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-foreground">Payment Proof</h2>
        <button
          type="button"
          class="rounded p-1 text-muted-foreground hover:bg-accent"
          on:click={closeModals}
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-muted-foreground">Amount:</span>
            <span class="ml-2 font-medium text-foreground">{formatCurrency(selectedPayment.amount, selectedPayment.currency)}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Method:</span>
            <span class="ml-2 font-medium text-foreground">{getMethodLabel(selectedPayment.method)}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Status:</span>
            <span class="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize {getStatusColor(selectedPayment.status)}">
              {selectedPayment.status}
            </span>
          </div>
          <div>
            <span class="text-muted-foreground">Created:</span>
            <span class="ml-2 font-medium text-foreground">{formatDate(selectedPayment.createdAt)}</span>
          </div>
        </div>
        
        {#if proofUrl}
          <div class="border border-border rounded-lg overflow-hidden">
            <img 
              src={proofUrl} 
              alt="Payment proof" 
              class="w-full max-h-96 object-contain bg-muted"
            />
          </div>
        {:else}
          <div class="flex items-center justify-center h-48 bg-muted rounded-lg">
            <p class="text-muted-foreground">Loading proof image...</p>
          </div>
        {/if}
        
        {#if selectedPayment.status === 'pending'}
          {@const payment = selectedPayment}
          <div class="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              class="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              on:click={() => { closeModals(); openRejectModal(payment); }}
            >
              Reject
            </button>
            <button
              type="button"
              class="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              on:click={() => { closeModals(); openConfirmModal(payment); }}
            >
              Confirm
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
