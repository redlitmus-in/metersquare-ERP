import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NotificationData, notificationService } from '@/services/notificationService';
import {
  filterOldNotifications,
  sanitizeNotificationData,
  getDebugLogger
} from '@/utils/notificationSecurity';

interface NotificationStore {
  notifications: NotificationData[];
  unreadCount: number;
  isPermissionRequested: boolean;
  isPermissionGranted: boolean;

  // Actions
  addNotification: (notification: NotificationData) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;

  // Permission handling
  requestPermission: () => Promise<void>;

  // Getters
  getUnreadNotifications: () => NotificationData[];
  getNotificationsByCategory: (category: string) => NotificationData[];
  getNotificationsByPriority: (priority: string) => NotificationData[];
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isPermissionRequested: false,
      isPermissionGranted: false,

      addNotification: (notification: NotificationData) => {
        const debug = getDebugLogger();

        set((state) => {
          // Sanitize notification first
          const sanitizedNotification = sanitizeNotificationData(notification);

          // Check if notification already exists (prevent duplicates)
          const exists = state.notifications.find(n => n.id === sanitizedNotification.id);
          if (exists) {
            debug.warn(`Notification ${sanitizedNotification.id} already exists`);
            return state;
          }

          debug.info('Adding new notification', {
            id: sanitizedNotification.id,
            type: sanitizedNotification.type
          });

          // Add new notification and apply storage limits
          let newNotifications = [sanitizedNotification, ...state.notifications];

          // Apply storage limits and filter old notifications
          newNotifications = filterOldNotifications(newNotifications);

          const newUnreadCount = newNotifications.filter(n => !n.read).length;

          // Update browser tab title
          notificationService.updateTabTitle(newUnreadCount);

          debug.info(`Notification stats: Total=${newNotifications.length}, Unread=${newUnreadCount}`);

          return {
            notifications: newNotifications,
            unreadCount: newUnreadCount
          };
        });
      },

      markAsRead: (id: string) => {
        set((state) => {
          const newNotifications = state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          );
          const newUnreadCount = newNotifications.filter(n => !n.read).length;

          // Update browser tab title
          notificationService.updateTabTitle(newUnreadCount);

          return {
            notifications: newNotifications,
            unreadCount: newUnreadCount
          };
        });
      },

      markAllAsRead: () => {
        set((state) => {
          const newNotifications = state.notifications.map(n => ({ ...n, read: true }));

          // Update browser tab title
          notificationService.updateTabTitle(0);

          return {
            notifications: newNotifications,
            unreadCount: 0
          };
        });
      },

      deleteNotification: (id: string) => {
        set((state) => {
          const newNotifications = state.notifications.filter(n => n.id !== id);
          const newUnreadCount = newNotifications.filter(n => !n.read).length;

          // Update browser tab title
          notificationService.updateTabTitle(newUnreadCount);

          return {
            notifications: newNotifications,
            unreadCount: newUnreadCount
          };
        });
      },

      clearAll: () => {
        set({
          notifications: [],
          unreadCount: 0
        });

        // Update browser tab title
        notificationService.updateTabTitle(0);
      },

      requestPermission: async () => {
        const permission = await notificationService.requestPermission();
        set({
          isPermissionRequested: true,
          isPermissionGranted: permission === 'granted'
        });
      },

      getUnreadNotifications: () => {
        return get().notifications.filter(n => !n.read);
      },

      getNotificationsByCategory: (category: string) => {
        return get().notifications.filter(n => n.category === category);
      },

      getNotificationsByPriority: (priority: string) => {
        return get().notifications.filter(n => n.priority === priority);
      }
    }),
    {
      name: 'notification-store',
      // Only persist notifications and permission status, not computed values
      partialize: (state) => ({
        notifications: state.notifications,
        isPermissionRequested: state.isPermissionRequested,
        isPermissionGranted: state.isPermissionGranted
      }),
      // Rehydrate computed values after loading from storage
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Apply storage limits to rehydrated notifications
          state.notifications = filterOldNotifications(state.notifications);

          const unreadCount = state.notifications.filter(n => !n.read).length;
          state.unreadCount = unreadCount;

          // Update browser tab title on app load
          notificationService.updateTabTitle(unreadCount);
        }
      }
    }
  )
);

// Initialize notification service subscription
let serviceInitialized = false;

export const initializeNotificationService = () => {
  if (serviceInitialized) return;

  serviceInitialized = true;

  // Subscribe to notifications from service
  notificationService.subscribe((notification: NotificationData) => {
    useNotificationStore.getState().addNotification(notification);
  });
};

// Auto-initialize when store is first accessed
if (typeof window !== 'undefined') {
  initializeNotificationService();

  // REMOVED: Auto-clear for production use
  // Notifications should persist across sessions
  // To manually clear for testing, use: useNotificationStore.getState().clearAll()
}