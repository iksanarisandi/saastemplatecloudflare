<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isAdmin } from '$lib/stores/auth';
  import { 
    userList, 
    users, 
    userPagination, 
    isUserListLoading, 
    userListError 
  } from '$lib/stores/user';
  import { notifications } from '$lib/stores/notification';
  import type { PublicUser, CreateUserInput, UpdateUserInput } from '$lib/api';

  // Redirect non-admins
  onMount(() => {
    const unsubscribe = isAdmin.subscribe(admin => {
      if (!admin) {
        goto('/dashboard');
      }
    });
    
    // Fetch users on mount
    userList.fetch();

    return unsubscribe;
  });

  // Modal state
  let showCreateModal = false;
  let showEditModal = false;
  let showDeleteModal = false;
  let selectedUser: PublicUser | null = null;

  // Form state
  let createForm: CreateUserInput = { email: '', password: '', role: 'user' };
  let editForm: UpdateUserInput = {};
  let formErrors: Record<string, string> = {};

  // Search and filter state
  let searchQuery = '';
  let roleFilter = '';
  let statusFilter = '';

  // Debounce search
  let searchTimeout: ReturnType<typeof setTimeout>;
  function handleSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      userList.search(searchQuery);
    }, 300);
  }

  function handleRoleFilter() {
    userList.filterByRole(roleFilter || undefined);
  }

  function handleStatusFilter() {
    userList.filterByStatus(statusFilter || undefined);
  }

  // Modal handlers
  function openCreateModal() {
    createForm = { email: '', password: '', role: 'user' };
    formErrors = {};
    showCreateModal = true;
  }

  function openEditModal(user: PublicUser) {
    selectedUser = user;
    editForm = { email: user.email, role: user.role, status: user.status };
    formErrors = {};
    showEditModal = true;
  }

  function openDeleteModal(user: PublicUser) {
    selectedUser = user;
    showDeleteModal = true;
  }

  function closeModals() {
    showCreateModal = false;
    showEditModal = false;
    showDeleteModal = false;
    selectedUser = null;
    formErrors = {};
  }

  // Form validation
  function validateCreateForm(): boolean {
    formErrors = {};
    
    if (!createForm.email) {
      formErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) {
      formErrors.email = 'Please enter a valid email address';
    }
    
    if (!createForm.password) {
      formErrors.password = 'Password is required';
    } else if (createForm.password.length < 8) {
      formErrors.password = 'Password must be at least 8 characters';
    }
    
    return Object.keys(formErrors).length === 0;
  }

  function validateEditForm(): boolean {
    formErrors = {};
    
    if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      formErrors.email = 'Please enter a valid email address';
    }
    
    return Object.keys(formErrors).length === 0;
  }

  // CRUD handlers
  async function handleCreate() {
    if (!validateCreateForm()) return;
    
    const result = await userList.create(createForm);
    if (result) {
      notifications.success('User created successfully');
      closeModals();
    }
  }

  async function handleUpdate() {
    if (!selectedUser || !validateEditForm()) return;
    
    const result = await userList.update(selectedUser.id, editForm);
    if (result) {
      notifications.success('User updated successfully');
      closeModals();
    }
  }

  async function handleDelete() {
    if (!selectedUser) return;
    
    const success = await userList.delete(selectedUser.id);
    if (success) {
      notifications.success('User deactivated successfully');
      closeModals();
    }
  }

  // Pagination
  function goToPage(page: number) {
    userList.goToPage(page);
  }

  // Format date
  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Status badge color
  function getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'inactive': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  }

  // Role badge color
  function getRoleColor(role: string): string {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  }
</script>

<svelte:head>
  <title>User Management - SaaS App</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-foreground">User Management</h1>
      <p class="mt-1 text-muted-foreground">Manage users and their roles</p>
    </div>
    <button
      type="button"
      class="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
      on:click={openCreateModal}
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      Add User
    </button>
  </div>

  <!-- Filters -->
  <div class="flex flex-col gap-4 sm:flex-row">
    <div class="flex-1">
      <input
        type="text"
        placeholder="Search by email or name..."
        bind:value={searchQuery}
        on:input={handleSearch}
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
    <select
      bind:value={roleFilter}
      on:change={handleRoleFilter}
      class="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">All Roles</option>
      <option value="user">User</option>
      <option value="admin">Admin</option>
      <option value="super_admin">Super Admin</option>
    </select>
    <select
      bind:value={statusFilter}
      on:change={handleStatusFilter}
      class="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">All Status</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
      <option value="pending">Pending</option>
    </select>
  </div>

  <!-- Error message -->
  {#if $userListError}
    <div class="rounded-md bg-destructive/10 border border-destructive/20 p-4">
      <p class="text-sm text-destructive">{$userListError}</p>
    </div>
  {/if}

  <!-- Users table -->
  <div class="rounded-lg border border-border bg-card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-muted/50">
          <tr>
            <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Role</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Created</th>
            <th class="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          {#if $isUserListLoading}
            <tr>
              <td colspan="5" class="px-4 py-8 text-center text-muted-foreground">
                <div class="flex items-center justify-center gap-2">
                  <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading users...
                </div>
              </td>
            </tr>
          {:else if $users.length === 0}
            <tr>
              <td colspan="5" class="px-4 py-8 text-center text-muted-foreground">
                No users found
              </td>
            </tr>
          {:else}
            {#each $users as user}
              <tr class="hover:bg-muted/50">
                <td class="px-4 py-3 text-sm text-foreground">{user.email}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize {getRoleColor(user.role)}">
                    {user.role.replace('_', ' ')}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize {getStatusColor(user.status)}">
                    {user.status}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">{formatDate(user.createdAt)}</td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      on:click={() => openEditModal(user)}
                      title="Edit user"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {#if user.status !== 'inactive'}
                      <button
                        type="button"
                        class="rounded p-1 text-destructive hover:bg-destructive/10"
                        on:click={() => openDeleteModal(user)}
                        title="Deactivate user"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if $userPagination && $userPagination.totalPages > 1}
      <div class="flex items-center justify-between border-t border-border px-4 py-3">
        <p class="text-sm text-muted-foreground">
          Showing {($userPagination.page - 1) * $userPagination.limit + 1} to {Math.min($userPagination.page * $userPagination.limit, $userPagination.total)} of {$userPagination.total} users
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-md border border-input px-3 py-1 text-sm disabled:opacity-50"
            disabled={$userPagination.page === 1}
            on:click={() => goToPage($userPagination.page - 1)}
          >
            Previous
          </button>
          <span class="text-sm text-muted-foreground">
            Page {$userPagination.page} of {$userPagination.totalPages}
          </span>
          <button
            type="button"
            class="rounded-md border border-input px-3 py-1 text-sm disabled:opacity-50"
            disabled={$userPagination.page === $userPagination.totalPages}
            on:click={() => goToPage($userPagination.page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Create User Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 bg-black/50" on:click={closeModals} on:keydown={(e) => e.key === 'Escape' && closeModals()} role="button" tabindex="0" aria-label="Close modal"></div>
    <div class="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
      <h2 class="text-lg font-semibold text-foreground mb-4">Create New User</h2>
      
      <form on:submit|preventDefault={handleCreate} class="space-y-4">
        <div>
          <label for="create-email" class="block text-sm font-medium text-foreground mb-1.5">Email</label>
          <input
            id="create-email"
            type="email"
            bind:value={createForm.email}
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            class:border-destructive={formErrors.email}
          />
          {#if formErrors.email}
            <p class="mt-1 text-sm text-destructive">{formErrors.email}</p>
          {/if}
        </div>

        <div>
          <label for="create-password" class="block text-sm font-medium text-foreground mb-1.5">Password</label>
          <input
            id="create-password"
            type="password"
            bind:value={createForm.password}
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            class:border-destructive={formErrors.password}
          />
          {#if formErrors.password}
            <p class="mt-1 text-sm text-destructive">{formErrors.password}</p>
          {/if}
        </div>

        <div>
          <label for="create-role" class="block text-sm font-medium text-foreground mb-1.5">Role</label>
          <select
            id="create-role"
            bind:value={createForm.role}
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <button
            type="button"
            class="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
            on:click={closeModals}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            disabled={$isUserListLoading}
          >
            {$isUserListLoading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Edit User Modal -->
{#if showEditModal && selectedUser}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 bg-black/50" on:click={closeModals} on:keydown={(e) => e.key === 'Escape' && closeModals()} role="button" tabindex="0" aria-label="Close modal"></div>
    <div class="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
      <h2 class="text-lg font-semibold text-foreground mb-4">Edit User</h2>
      
      <form on:submit|preventDefault={handleUpdate} class="space-y-4">
        <div>
          <label for="edit-email" class="block text-sm font-medium text-foreground mb-1.5">Email</label>
          <input
            id="edit-email"
            type="email"
            bind:value={editForm.email}
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            class:border-destructive={formErrors.email}
          />
          {#if formErrors.email}
            <p class="mt-1 text-sm text-destructive">{formErrors.email}</p>
          {/if}
        </div>

        <div>
          <label for="edit-role" class="block text-sm font-medium text-foreground mb-1.5">Role</label>
          <select
            id="edit-role"
            bind:value={editForm.role}
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label for="edit-status" class="block text-sm font-medium text-foreground mb-1.5">Status</label>
          <select
            id="edit-status"
            bind:value={editForm.status}
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <button
            type="button"
            class="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
            on:click={closeModals}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            disabled={$isUserListLoading}
          >
            {$isUserListLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteModal && selectedUser}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 bg-black/50" on:click={closeModals} on:keydown={(e) => e.key === 'Escape' && closeModals()} role="button" tabindex="0" aria-label="Close modal"></div>
    <div class="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
      <h2 class="text-lg font-semibold text-foreground mb-2">Deactivate User</h2>
      <p class="text-muted-foreground mb-4">
        Are you sure you want to deactivate <span class="font-medium text-foreground">{selectedUser.email}</span>? 
        This will prevent them from logging in.
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
          class="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          on:click={handleDelete}
          disabled={$isUserListLoading}
        >
          {$isUserListLoading ? 'Deactivating...' : 'Deactivate'}
        </button>
      </div>
    </div>
  </div>
{/if}
