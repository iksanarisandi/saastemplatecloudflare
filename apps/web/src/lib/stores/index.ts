/**
 * Stores Module
 * 
 * Central export for all Svelte stores.
 * 
 * Requirements: 2.6
 */

// Auth store
export {
  auth,
  isAuthenticated,
  currentUser,
  isAdmin,
  isSuperAdmin,
  isAuthLoading,
  authError,
  getAuthState,
} from './auth';
export type { AuthState } from './auth';

// User store
export {
  userList,
  userDetail,
  isUserListLoading,
  userListError,
  users,
  userPagination,
} from './user';
export type { UserListState, UserDetailState } from './user';

// Notification store
export {
  notifications,
  notificationCount,
  hasNotifications,
  showNotification,
} from './notification';
export type { 
  UINotification, 
  NotificationType, 
  NotificationOptions,
} from './notification';

// Payment store
export {
  paymentList,
  isPaymentListLoading,
  paymentListError,
  payments,
  paymentPagination,
} from './payment';
export type { PaymentListState } from './payment';

// Subscription store
export {
  plansStore,
  currentSubscription,
  plans,
  isPlansLoading,
  plansError,
  hasActiveSubscription,
  currentPlanName,
} from './subscription';
export type { PlansState, CurrentSubscriptionState } from './subscription';

// Theme store
export { theme } from './theme';
export type { Theme } from './theme';
