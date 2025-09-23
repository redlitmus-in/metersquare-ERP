import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  X,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Banknote,
  FileText,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Trash2,
  ChevronRight,
  Mail,
  BellRing
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatRelativeTime } from '@/utils/dateFormatter';
import { useNotificationStore } from '@/store/notificationStore';
import { NotificationData } from '@/services/notificationService';
import { sanitizeNotification, sanitizeText } from '@/utils/sanitizer';

// Using NotificationData interface from the service

interface NotificationSystemProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxNotifications?: number;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  position = 'top-right',
  maxNotifications = 5
}) => {
  const {
    notifications,
    unreadCount,
    isPermissionGranted,
    isPermissionRequested,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    requestPermission
  } = useNotificationStore();

  const [showPanel, setShowPanel] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [toastNotifications, setToastNotifications] = useState<NotificationData[]>([]);
  
  // Refs for click outside detection
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const toastTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Handle click outside with proper cleanup
  useEffect(() => {
    if (!showPanel) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current &&
          buttonRef.current &&
          !panelRef.current.contains(event.target as Node) &&
          !buttonRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPanel]);

  // Request notification permission on first load
  useEffect(() => {
    if (!isPermissionRequested) {
      // Show permission request after a brief delay
      const timer = setTimeout(() => {
        requestPermission();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isPermissionRequested, requestPermission]);

  // Clean up all toast timeouts on unmount
  useEffect(() => {
    return () => {
      toastTimeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      toastTimeoutRefs.current.clear();
    };
  }, []);

  // Update toast notifications when new notifications arrive
  useEffect(() => {
    if (notifications.length === 0) return;

    const latestNotification = notifications[0];

    // Only show toast for new notifications (less than 10 seconds old)
    const notificationTime = latestNotification.timestamp instanceof Date
      ? latestNotification.timestamp.getTime()
      : new Date(latestNotification.timestamp).getTime();
    const isRecent = new Date().getTime() - notificationTime < 10000;

    if (isRecent && !latestNotification.read) {
      setToastNotifications(prev => {
        const exists = prev.find(n => n.id === latestNotification.id);
        if (exists) return prev;

        // Sanitize the notification before adding to toast
        const sanitized = sanitizeNotification(latestNotification);
        const newToasts = [sanitized, ...prev.slice(0, maxNotifications - 1)];

        // Clear existing timeout for this notification if it exists
        const existingTimeout = toastTimeoutRefs.current.get(latestNotification.id);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Auto-remove toast after 5 seconds with proper cleanup
        const timeoutId = setTimeout(() => {
          setToastNotifications(current =>
            current.filter(n => n.id !== latestNotification.id)
          );
          toastTimeoutRefs.current.delete(latestNotification.id);
        }, 5000);

        toastTimeoutRefs.current.set(latestNotification.id, timeoutId);

        return newToasts;
      });
    }
  }, [notifications, maxNotifications]);

  const getNotificationIcon = useCallback((type: NotificationData['type']) => {
    switch (type) {
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'approval':
        return <Clock className="w-5 h-5" />;
      case 'alert':
        return <AlertTriangle className="w-5 h-5" />;
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      case 'update':
        return <TrendingUp className="w-5 h-5" />;
      case 'reminder':
        return <Calendar className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  }, []);

  const getNotificationColor = useCallback((type: NotificationData['type']) => {
    switch (type) {
      case 'email':
        return 'text-blue-600 bg-blue-100';
      case 'approval':
        return 'text-[#243d8a] bg-[#243d8a]/10';
      case 'alert':
        return 'text-amber-600 bg-amber-100';
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'info':
        return 'text-gray-600 bg-gray-100';
      case 'update':
        return 'text-purple-600 bg-purple-100';
      case 'reminder':
        return 'text-indigo-600 bg-indigo-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }, []);

  const getPriorityColor = useCallback((priority: NotificationData['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium':
        return 'bg-[#243d8a]/10 text-[#243d8a]/90 border-[#243d8a]/30';
      case 'low':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  }, []);

  // Functions are now provided by the store

  const filteredNotifications = useMemo(() => {
    return notifications
      .map(n => sanitizeNotification(n)) // Sanitize all notifications
      .filter(n => {
        if (filter === 'unread' && n.read) return false;
        if (filter === 'urgent' && n.priority !== 'urgent') return false;
        if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
        return true;
      });
  }, [notifications, filter, categoryFilter]);

  const urgentCount = useMemo(
    () => notifications.filter(n => n.priority === 'urgent' && !n.read).length,
    [notifications]
  );

  const formatTimestamp = useCallback((date: Date) => {
    // Use the imported formatRelativeTime function for consistent timezone handling
    return formatRelativeTime(date);
  }, []);

  // Remove individual toast with cleanup
  const removeToast = useCallback((notificationId: string) => {
    setToastNotifications(prev => prev.filter(n => n.id !== notificationId));

    const timeout = toastTimeoutRefs.current.get(notificationId);
    if (timeout) {
      clearTimeout(timeout);
      toastTimeoutRefs.current.delete(notificationId);
    }
  }, []);

  // Position classes for toast notifications
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <>
      {/* Notification Bell Icon */}
      <div className="relative">
        <Button
          ref={buttonRef}
          variant="outline"
          size="icon"
          onClick={() => setShowPanel(!showPanel)}
          className="relative"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
          {urgentCount > 0 && (
            <span className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </Button>
      </div>

      {/* Notification Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-[320px] sm:w-[420px] max-h-[500px] sm:max-h-[600px] bg-white rounded-lg shadow-xl border z-[9999] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-base flex items-center gap-2 text-gray-800">
                  <Bell className="w-4 h-4 text-red-600" />
                  Notifications
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPanel(false)}
                  className="text-gray-600 hover:bg-red-100"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-100 text-red-700 border-red-300">
                    {unreadCount} unread
                  </Badge>
                  {urgentCount > 0 && (
                    <Badge className="bg-orange-100 text-orange-700 border-orange-300">
                      {urgentCount} urgent
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs px-2 text-red-600 hover:bg-red-100"
                >
                  Mark all read
                </Button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No notifications</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-[#243d8a]/5/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-md ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-gray-900 mb-1">
                            {notification.title}
                          </h4>
                          <p className="text-xs text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          
                          {/* Metadata */}
                          {notification.metadata && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {notification.metadata.project && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                                  <FileText className="w-3 h-3 mr-1" />
                                  {notification.metadata.project}
                                </Badge>
                              )}
                              {notification.metadata.amount && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                                  <Banknote className="w-3 h-3 mr-1" />
                                  AED {notification.metadata.amount.toLocaleString()}
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-xs text-gray-400">
                                {formatTimestamp(notification.timestamp)}
                              </span>
                              {notification.metadata?.sender && (
                                <span className="text-xs text-gray-500">
                                  <Users className="w-3 h-3 inline mr-1" />
                                  {notification.metadata.sender}
                                </span>
                              )}
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Badge className={`text-[10px] px-1.5 py-0.5 ${getPriorityColor(notification.priority)} border`}>
                                {notification.priority}
                              </Badge>
                              {notification.actionRequired && (
                                <Button size="sm" className="h-6 px-2 text-[11px]">
                                  {notification.actionLabel || 'Action'}
                                  <ChevronRight className="w-3 h-3 ml-0.5" />
                                </Button>
                              )}
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                  className="h-6 w-6 p-0"
                                  title="Mark as read"
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteNotification(notification.id)}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                                title="Delete"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <div className={`fixed ${positionClasses[position]} z-50 space-y-2`}>
        <AnimatePresence>
          {toastNotifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: position.includes('right') ? 100 : -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: position.includes('right') ? 100 : -100 }}
              className="bg-white rounded-lg shadow-lg border p-4 w-80"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-gray-900">
                    {notification.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    {notification.message}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeToast(notification.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};

export default NotificationSystem;