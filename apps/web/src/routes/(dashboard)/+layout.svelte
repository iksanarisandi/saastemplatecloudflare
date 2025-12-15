<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { auth, isAuthenticated, currentUser, isAdmin } from '$lib/stores/auth';
  import { notifications } from '$lib/stores/notification';

  // Redirect to login if not authenticated
  onMount(() => {
    const unsubscribe = auth.subscribe(state => {
      if (state.isInitialized && !state.user) {
        goto('/login');
      }
    });

    return unsubscribe;
  });

  let isSidebarOpen = false;
  let isUserMenuOpen = false;

  function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
  }

  function toggleUserMenu() {
    isUserMenuOpen = !isUserMenuOpen;
  }

  function closeUserMenu() {
    isUserMenuOpen = false;
  }

  async function handleLogout() {
    await auth.logout();
    notifications.success('You have been logged out');
    goto('/login');
  }

  // Navigation items
  $: navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: 'home' },
    { href: '/dashboard/subscribe', label: 'Subscribe', icon: 'credit-card' },
    { href: '/dashboard/my-payments', label: 'My Payments', icon: 'history' },
    ...($isAdmin ? [
      { href: '/dashboard/users', label: 'Users', icon: 'users' },
      { href: '/dashboard/payments', label: 'Payments', icon: 'receipt' },
    ] : []),
  ];

  $: currentPath = $page.url.pathname;
</script>

<svelte:head>
  <title>Dashboard - SaaS App</title>
</svelte:head>

<!-- Click outside to close user menu -->
<svelte:window on:click={closeUserMenu} />

<div class="min-h-screen bg-background">
  <!-- Mobile sidebar backdrop -->
  {#if isSidebarOpen}
    <div 
      class="fixed inset-0 z-40 bg-black/50 lg:hidden"
      on:click={toggleSidebar}
      on:keydown={(e) => e.key === 'Escape' && toggleSidebar()}
      role="button"
      tabindex="0"
      aria-label="Close sidebar"
    ></div>
  {/if}

  <!-- Sidebar -->
  <aside 
    class="fixed inset-y-0 left-0 z-50 w-64 transform bg-card border-r border-border transition-transform duration-200 ease-in-out lg:translate-x-0"
    class:translate-x-0={isSidebarOpen}
    class:-translate-x-full={!isSidebarOpen}
  >
    <div class="flex h-full flex-col">
      <!-- Logo -->
      <div class="flex h-16 items-center border-b border-border px-6">
        <a href="/dashboard" class="text-xl font-bold text-foreground">
          SaaS App
        </a>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 space-y-1 px-3 py-4">
        {#each navItems as item}
          <a
            href={item.href}
            class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            class:bg-primary={currentPath === item.href}
            class:text-primary-foreground={currentPath === item.href}
            class:text-muted-foreground={currentPath !== item.href}
            class:hover:bg-accent={currentPath !== item.href}
            class:hover:text-accent-foreground={currentPath !== item.href}
            on:click={() => isSidebarOpen = false}
          >
            {#if item.icon === 'home'}
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            {:else if item.icon === 'users'}
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            {:else if item.icon === 'credit-card'}
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            {:else if item.icon === 'receipt'}
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            {:else if item.icon === 'history'}
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            {/if}
            {item.label}
          </a>
        {/each}
      </nav>
    </div>
  </aside>

  <!-- Main content -->
  <div class="lg:pl-64">
    <!-- Top header -->
    <header class="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card px-4 sm:px-6">
      <!-- Mobile menu button -->
      <button
        type="button"
        class="lg:hidden -ml-2 p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        on:click={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div class="flex-1"></div>

      <!-- User menu -->
      <div class="relative">
        <button
          type="button"
          class="flex items-center gap-2 rounded-md p-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          on:click|stopPropagation={toggleUserMenu}
          aria-expanded={isUserMenuOpen}
          aria-haspopup="true"
        >
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {$currentUser?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span class="hidden sm:block">{$currentUser?.email || 'User'}</span>
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {#if isUserMenuOpen}
          <div 
            class="absolute right-0 mt-2 w-56 origin-top-right rounded-md border border-border bg-card shadow-lg"
            role="menu"
            aria-orientation="vertical"
          >
            <div class="px-4 py-3 border-b border-border">
              <p class="text-sm font-medium text-foreground">{$currentUser?.email}</p>
              <p class="text-xs text-muted-foreground capitalize">{$currentUser?.role}</p>
            </div>
            <div class="py-1">
              <a
                href="/dashboard/settings"
                class="block px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                role="menuitem"
                on:click={closeUserMenu}
              >
                Settings
              </a>
              <button
                type="button"
                class="block w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                role="menuitem"
                on:click={handleLogout}
              >
                Sign out
              </button>
            </div>
          </div>
        {/if}
      </div>
    </header>

    <!-- Page content -->
    <main class="p-4 sm:p-6 lg:p-8">
      <slot />
    </main>
  </div>
</div>
