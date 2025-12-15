/**
 * User Store
 * 
 * Manages user list state for admin user management:
 * - User list with pagination
 * - Search and filtering
 * - CRUD operations
 * 
 * Requirements: 2.6
 */

import { writable, derived, get } from 'svelte/store';
import { api, ApiClientError, getPagination } from '$lib/api';
import type { 
  PublicUser, 
  CreateUserInput, 
  UpdateUserInput,
  UserSearchParams,
} from '$lib/api';
import type { PaginationMeta } from '@saas/shared';

/**
 * User list state interface
 */
export interface UserListState {
  users: PublicUser[];
  pagination: PaginationMeta | null;
  isLoading: boolean;
  error: string | null;
  searchParams: UserSearchParams;
}

/**
 * Single user state interface
 */
export interface UserDetailState {
  user: PublicUser | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Initial user list state
 */
const initialListState: UserListState = {
  users: [],
  pagination: null,
  isLoading: false,
  error: null,
  searchParams: {
    page: 1,
    limit: 10,
  },
};

/**
 * Initial user detail state
 */
const initialDetailState: UserDetailState = {
  user: null,
  isLoading: false,
  error: null,
};

/**
 * Create the user list store
 */
function createUserListStore() {
  const { subscribe, set, update } = writable<UserListState>(initialListState);

  /**
   * Set loading state
   */
  function setLoading(isLoading: boolean) {
    update(state => ({ ...state, isLoading, error: null }));
  }

  /**
   * Set error state
   */
  function setError(error: string) {
    update(state => ({ ...state, error, isLoading: false }));
  }

  /**
   * Fetch users with current search params
   */
  async function fetch(params?: Partial<UserSearchParams>): Promise<void> {
    const currentState = get({ subscribe });
    const searchParams = { ...currentState.searchParams, ...params };
    
    update(state => ({ ...state, searchParams, isLoading: true, error: null }));

    try {
      const response = await api.users.list(searchParams);
      
      if (response.success && response.data) {
        update(state => ({
          ...state,
          users: response.data!,
          pagination: getPagination(response),
          isLoading: false,
        }));
      } else {
        setError('Failed to fetch users');
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    }
  }

  /**
   * Search users
   */
  async function search(query: string): Promise<void> {
    await fetch({ search: query, page: 1 });
  }

  /**
   * Filter by role
   */
  async function filterByRole(role: string | undefined): Promise<void> {
    await fetch({ role, page: 1 });
  }

  /**
   * Filter by status
   */
  async function filterByStatus(status: string | undefined): Promise<void> {
    await fetch({ status, page: 1 });
  }

  /**
   * Go to page
   */
  async function goToPage(page: number): Promise<void> {
    await fetch({ page });
  }

  /**
   * Change page size
   */
  async function setPageSize(limit: number): Promise<void> {
    await fetch({ limit, page: 1 });
  }

  /**
   * Create a new user
   */
  async function create(data: CreateUserInput): Promise<PublicUser | null> {
    setLoading(true);

    try {
      const response = await api.users.create(data);
      
      if (response.success && response.data) {
        // Refresh the list
        await fetch();
        return response.data;
      }
      
      setError('Failed to create user');
      return null;
    } catch (error) {
      if (error instanceof ApiClientError) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
      return null;
    }
  }

  /**
   * Update a user
   */
  async function updateUser(id: string, data: UpdateUserInput): Promise<PublicUser | null> {
    setLoading(true);

    try {
      const response = await api.users.update(id, data);
      
      if (response.success && response.data) {
        // Update the user in the list
        update(state => ({
          ...state,
          users: state.users.map(u => u.id === id ? response.data! : u),
          isLoading: false,
        }));
        return response.data;
      }
      
      setError('Failed to update user');
      return null;
    } catch (error) {
      if (error instanceof ApiClientError) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
      return null;
    }
  }

  /**
   * Delete (deactivate) a user
   */
  async function deleteUser(id: string): Promise<boolean> {
    setLoading(true);

    try {
      const response = await api.users.delete(id);
      
      if (response.success) {
        // Refresh the list
        await fetch();
        return true;
      }
      
      setError('Failed to delete user');
      return false;
    } catch (error) {
      if (error instanceof ApiClientError) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
      return false;
    }
  }

  /**
   * Clear error
   */
  function clearError() {
    update(state => ({ ...state, error: null }));
  }

  /**
   * Reset store
   */
  function reset() {
    set(initialListState);
  }

  return {
    subscribe,
    fetch,
    search,
    filterByRole,
    filterByStatus,
    goToPage,
    setPageSize,
    create,
    update: updateUser,
    delete: deleteUser,
    clearError,
    reset,
  };
}

/**
 * Create the user detail store
 */
function createUserDetailStore() {
  const { subscribe, set, update } = writable<UserDetailState>(initialDetailState);

  /**
   * Fetch user by ID
   */
  async function fetch(id: string): Promise<void> {
    update(state => ({ ...state, isLoading: true, error: null }));

    try {
      const response = await api.users.get(id);
      
      if (response.success && response.data) {
        update(state => ({
          ...state,
          user: response.data!,
          isLoading: false,
        }));
      } else {
        update(state => ({
          ...state,
          error: 'User not found',
          isLoading: false,
        }));
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        update(state => ({
          ...state,
          error: error.message,
          isLoading: false,
        }));
      } else {
        update(state => ({
          ...state,
          error: 'An unexpected error occurred',
          isLoading: false,
        }));
      }
    }
  }

  /**
   * Clear the current user
   */
  function clear() {
    set(initialDetailState);
  }

  return {
    subscribe,
    fetch,
    clear,
  };
}

/**
 * User list store instance
 */
export const userList = createUserListStore();

/**
 * User detail store instance
 */
export const userDetail = createUserDetailStore();

/**
 * Derived store for user list loading state
 */
export const isUserListLoading = derived(
  userList,
  $userList => $userList.isLoading
);

/**
 * Derived store for user list error
 */
export const userListError = derived(
  userList,
  $userList => $userList.error
);

/**
 * Derived store for users array
 */
export const users = derived(
  userList,
  $userList => $userList.users
);

/**
 * Derived store for pagination
 */
export const userPagination = derived(
  userList,
  $userList => $userList.pagination
);
