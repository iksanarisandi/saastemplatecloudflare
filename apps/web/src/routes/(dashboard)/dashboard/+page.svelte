<script lang="ts">
  import { onMount } from 'svelte';
  import { currentUser, isAdmin } from '$lib/stores/auth';
  import { api } from '$lib/api';
  import type { Subscription, SubscriptionPlan } from '@saas/shared';

  let subscription: Subscription | null = null;
  let plan: SubscriptionPlan | null = null;
  let isLoading = true;

  onMount(async () => {
    try {
      const subResponse = await api.subscriptions.current();
      if (subResponse.success && subResponse.data) {
        subscription = subResponse.data;
        // Fetch plan details
        const planResponse = await api.plans.get(subscription.planId);
        if (planResponse.success && planResponse.data) {
          plan = planResponse.data;
        }
      }
    } catch (error) {
      // No subscription or error fetching
    } finally {
      isLoading = false;
    }
  });

  function formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
</script>

<svelte:head>
  <title>Dashboard - SaaS App</title>
</svelte:head>

<div class="space-y-6">
  <!-- Welcome section -->
  <div>
    <h1 class="text-2xl font-bold text-foreground">
      Welcome back{$currentUser?.email ? `, ${$currentUser.email.split('@')[0]}` : ''}!
    </h1>
    <p class="mt-1 text-muted-foreground">
      Here's an overview of your account.
    </p>
  </div>

  <!-- Stats cards -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <!-- Subscription status card -->
    <div class="rounded-lg border border-border bg-card p-6">
      <div class="flex items-center gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <svg class="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p class="text-sm font-medium text-muted-foreground">Subscription</p>
          {#if isLoading}
            <p class="text-lg font-semibold text-foreground">Loading...</p>
          {:else if subscription && subscription.status === 'active'}
            <p class="text-lg font-semibold text-green-600">{plan?.name || 'Active'}</p>
          {:else}
            <p class="text-lg font-semibold text-muted-foreground">No Plan</p>
          {/if}
        </div>
      </div>
    </div>

    <!-- Account status card -->
    <div class="rounded-lg border border-border bg-card p-6">
      <div class="flex items-center gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
          <svg class="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <p class="text-sm font-medium text-muted-foreground">Account Status</p>
          <p class="text-lg font-semibold capitalize text-foreground">{$currentUser?.status || 'Active'}</p>
        </div>
      </div>
    </div>

    <!-- Role card -->
    <div class="rounded-lg border border-border bg-card p-6">
      <div class="flex items-center gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
          <svg class="h-6 w-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <div>
          <p class="text-sm font-medium text-muted-foreground">Role</p>
          <p class="text-lg font-semibold capitalize text-foreground">{$currentUser?.role?.replace('_', ' ') || 'User'}</p>
        </div>
      </div>
    </div>

    <!-- Expiry card -->
    <div class="rounded-lg border border-border bg-card p-6">
      <div class="flex items-center gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
          <svg class="h-6 w-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p class="text-sm font-medium text-muted-foreground">Expires</p>
          {#if isLoading}
            <p class="text-lg font-semibold text-foreground">Loading...</p>
          {:else if subscription?.currentPeriodEnd}
            <p class="text-lg font-semibold text-foreground">{formatDate(subscription.currentPeriodEnd)}</p>
          {:else}
            <p class="text-lg font-semibold text-muted-foreground">N/A</p>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Quick actions -->
  <div class="rounded-lg border border-border bg-card p-6">
    <h2 class="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#if !subscription || subscription.status !== 'active'}
        <a
          href="/dashboard/plans"
          class="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
        >
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <svg class="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <p class="font-medium text-foreground">Subscribe to a Plan</p>
            <p class="text-sm text-muted-foreground">Choose a subscription plan</p>
          </div>
        </a>
      {/if}

      {#if $isAdmin}
        <a
          href="/dashboard/users"
          class="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
        >
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <svg class="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <p class="font-medium text-foreground">Manage Users</p>
            <p class="text-sm text-muted-foreground">View and manage users</p>
          </div>
        </a>

        <a
          href="/dashboard/payments"
          class="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
        >
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
            <svg class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <p class="font-medium text-foreground">Review Payments</p>
            <p class="text-sm text-muted-foreground">Confirm pending payments</p>
          </div>
        </a>
      {/if}

      <a
        href="/dashboard/settings"
        class="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
      >
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-500/10">
          <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <p class="font-medium text-foreground">Account Settings</p>
          <p class="text-sm text-muted-foreground">Manage your account</p>
        </div>
      </a>
    </div>
  </div>
</div>
