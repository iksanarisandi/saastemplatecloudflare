<script lang="ts">
  /**
   * My Payments Page
   * 
   * Displays the user's payment history with status tracking.
   * Requirements: 5.3
   */
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { notifications } from '$lib/stores/notification';
  import { api, getPagination } from '$lib/api';
  import type { Payment } from '@saas/shared';
  import type { PaginationMeta } from '@saas/shared';

  // State
  let payments: Payment[] = [];
  let pagination: PaginationMeta | null = null;
  let isLoading = true;
  let error: string | null = null;
  let currentPage = 1;
  let statusFilter = '';

  onMount(() => {
    fetchPayments();
  });

  async function fetchPayments() {
    isLoading = true;
    error = null;
    
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: 10,
      };
      
      if (statusFilter) {
        params.status = statusFilter;
      }
      
      const response = await api.payments.list(params);
      
      if (response.success && response.data) {
        payments = response.data;
        pagination = getPagination(response);
      } else {
        error = 'Failed to load payments';
      }
    } catch (err) {
      error = 'An error occurred while loading payments';
    } finally {
      isLoading = false;
    }
  }

  function handleStatusFilter() {
    currentPage = 1;
    fetchPayments();
  }

  function goToPage(page: number) {
    currentPage = page;
    fetchPayments();
  }

  function viewPayment(paymentId: string) {
    goto(`/dashboard/payment/${paymentId}`);
  }


  // Format helpers
  function formatDate(dateStr: string | Date): string {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString('en-US', {
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

  function getStatusIcon(status: string): string {
    switch (status) {
      case 'confirmed': return 'check-circle';
      case 'rejected': return 'x-circle';
      case 'pending': return 'clock';
      case 'expired': return 'exclamation-circle';
      default: return 'question-circle';
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
  <title>My Payments - SaaS App</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-foreground">My Payments</h1>
      <p class="mt-1 text-muted-foreground">View your payment history and status</p>
    </div>
    <a
      href="/dashboard/subscribe"
      class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
    >
      <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      New Subscription
    </a>
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
  {#if error}
    <div class="rounded-md bg-destructive/10 border border-destructive/20 p-4">
      <p class="text-sm text-destructive">{error}</p>
    </div>
  {/if}


  <!-- Payments list -->
  {#if isLoading}
    <div class="flex items-center justify-center py-12">
      <div class="flex items-center gap-2 text-muted-foreground">
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading payments...
      </div>
    </div>
  {:else if payments.length === 0}
    <div class="text-center py-12">
      <svg class="h-12 w-12 mx-auto text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <h3 class="text-lg font-medium text-foreground mb-1">No payments found</h3>
      <p class="text-muted-foreground mb-4">You haven't made any payments yet.</p>
      <a
        href="/dashboard/subscribe"
        class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Subscribe Now
      </a>
    </div>
  {:else}
    <!-- Payment cards for mobile, table for desktop -->
    <div class="space-y-4 md:hidden">
      {#each payments as payment}
        <button
          type="button"
          class="w-full rounded-lg border border-border bg-card p-4 text-left hover:bg-accent/50 transition-colors"
          on:click={() => viewPayment(payment.id)}
        >
          <div class="flex items-start justify-between mb-3">
            <div>
              <p class="font-medium text-foreground">{formatCurrency(payment.amount, payment.currency)}</p>
              <p class="text-sm text-muted-foreground">{getMethodLabel(payment.method)}</p>
            </div>
            <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize {getStatusColor(payment.status)}">
              {payment.status}
            </span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">{formatDate(payment.createdAt)}</span>
            <svg class="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      {/each}
    </div>

    <!-- Desktop table -->
    <div class="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-muted/50">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Amount</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Method</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Proof</th>
              <th class="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {#each payments as payment}
              <tr class="hover:bg-muted/50">
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {formatDate(payment.createdAt)}
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
                <td class="px-4 py-3 text-sm">
                  {#if payment.proofFileId}
                    <span class="text-green-600 dark:text-green-400">Uploaded</span>
                  {:else if payment.status === 'pending'}
                    <span class="text-yellow-600 dark:text-yellow-400">Required</span>
                  {:else}
                    <span class="text-muted-foreground">—</span>
                  {/if}
                </td>
                <td class="px-4 py-3 text-right">
                  <button
                    type="button"
                    class="text-sm text-primary hover:underline"
                    on:click={() => viewPayment(payment.id)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>


    <!-- Pagination -->
    {#if pagination && pagination.totalPages > 1}
      {@const pag = pagination}
      <div class="flex items-center justify-between border-t border-border px-4 py-3 bg-card rounded-b-lg">
        <p class="text-sm text-muted-foreground">
          Showing {(pag.page - 1) * pag.limit + 1} to {Math.min(pag.page * pag.limit, pag.total)} of {pag.total} payments
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-md border border-input px-3 py-1 text-sm disabled:opacity-50"
            disabled={pag.page === 1}
            on:click={() => goToPage(pag.page - 1)}
          >
            Previous
          </button>
          <span class="text-sm text-muted-foreground">
            Page {pag.page} of {pag.totalPages}
          </span>
          <button
            type="button"
            class="rounded-md border border-input px-3 py-1 text-sm disabled:opacity-50"
            disabled={pag.page === pag.totalPages}
            on:click={() => goToPage(pag.page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>
