/**
 * Notification Store
 * 
 * Manages UI notifications (toasts) for user feedback:
 * - Success, error, warning, info messages
 * - Auto-dismiss functionality
 * - Queue management
 * 
 * Requirements: 2.6
 */

import { writable, derived } from 'svelte/store';

/**
 * Notification types
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Notification interface
 */
export interface UINotification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration: number;
  dismissible: boolean;
  createdAt: number;
}

/**
 * Notification options
 */
export interface NotificationOptions {
  title?: string;
  duration?: number;
  dismissible?: boolean;
}

/**
 * Default notification duration in milliseconds
 */
const DEFAULT_DURATION = 5000;

/**
 * Maximum number of notifications to show at once
 */
const MAX_NOTIFICATIONS = 5;

/**
 * Generate unique notification ID
 */
function generateId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create the notification store
 */
function createNotificationStore() {
  const { subscribe, update } = writable<UINotification[]>([]);

  /**
   * Add a notification
   */
  function add(
    type: NotificationType,
    message: string,
    options: NotificationOptions = {}
  ): string {
    const id = generateId();
    const notification: UINotification = {
      id,
      type,
      message,
      title: options.title,
      duration: options.duration ?? DEFAULT_DURATION,
      dismissible: options.dismissible ?? true,
      createdAt: Date.now(),
    };

    update(notifications => {
      // Remove oldest if we exceed max
      const updated = [...notifications, notification];
      if (updated.length > MAX_NOTIFICATIONS) {
        return updated.slice(-MAX_NOTIFICATIONS);
      }
      return updated;
    });

    // Auto-dismiss after duration
    if (notification.duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, notification.duration);
    }

    return id;
  }

  /**
   * Show success notification
   */
  function success(message: string, options?: NotificationOptions): string {
    return add('success', message, options);
  }

  /**
   * Show error notification
   */
  function error(message: string, options?: NotificationOptions): string {
    return add('error', message, {
      duration: 8000, // Errors stay longer by default
      ...options,
    });
  }

  /**
   * Show warning notification
   */
  function warning(message: string, options?: NotificationOptions): string {
    return add('warning', message, options);
  }

  /**
   * Show info notification
   */
  function info(message: string, options?: NotificationOptions): string {
    return add('info', message, options);
  }

  /**
   * Dismiss a notification by ID
   */
  function dismiss(id: string): void {
    update(notifications => 
      notifications.filter(n => n.id !== id)
    );
  }

  /**
   * Dismiss all notifications
   */
  function dismissAll(): void {
    update(() => []);
  }

  /**
   * Show API error notification
   */
  function apiError(err: unknown): string {
    let message = 'An unexpected error occurred';
    
    if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === 'string') {
      message = err;
    }

    return error(message, { title: 'Error' });
  }

  return {
    subscribe,
    add,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
    apiError,
  };
}

/**
 * Notification store instance
 */
export const notifications = createNotificationStore();

/**
 * Derived store for notification count
 */
export const notificationCount = derived(
  notifications,
  $notifications => $notifications.length
);

/**
 * Derived store for checking if there are any notifications
 */
export const hasNotifications = derived(
  notifications,
  $notifications => $notifications.length > 0
);

/**
 * Helper to show a notification and return a promise that resolves when dismissed
 */
export function showNotification(
  type: NotificationType,
  message: string,
  options?: NotificationOptions
): Promise<void> {
  return new Promise(resolve => {
    const id = notifications.add(type, message, options);
    const duration = options?.duration ?? DEFAULT_DURATION;
    
    if (duration > 0) {
      setTimeout(resolve, duration);
    }
  });
}
