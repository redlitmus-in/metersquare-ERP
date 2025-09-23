/**
 * Debug utility for testing notifications
 */

import { notificationService } from '@/services/notificationService';
import { PurchaseNotificationService } from '@/services/purchaseNotificationService';

export const debugNotifications = {
  // Test basic notification permission
  async testPermission() {
    console.log('🔍 Testing notification permission...');
    const permission = await notificationService.requestPermission();
    console.log('Permission result:', permission);
    return permission;
  },

  // Test direct notification service
  async testDirectNotification() {
    console.log('🔔 Testing direct notification...');
    await notificationService.sendSystemNotification({
      type: 'info',
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working',
      priority: 'high'
    });
    console.log('✅ Direct notification sent');
  },

  // Test PR rejection notification specifically
  async testPRRejection() {
    console.log('❌ Testing PR rejection notification...');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('Current user:', user);

    await PurchaseNotificationService.notifyPRRejected({
      documentId: 'PR-101',
      rejectedBy: 'Project Manager',
      reason: 'Test rejection notification',
      project: 'Test Project',
      backToRole: 'procurement'
    });
    console.log('✅ PR rejection notification sent');
  },

  // Test role-based filtering
  async testRoleFiltering() {
    console.log('👥 Testing role-based filtering...');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const currentRole = (user?.role || 'unknown').toLowerCase();
    console.log(`Current role: ${currentRole}`);

    // Test notification for current role
    await PurchaseNotificationService.testForCurrentRole();
    console.log('✅ Role-based test completed');
  },

  // Check notification store
  checkNotificationStore() {
    console.log('📦 Checking notification store...');
    const notificationStore = localStorage.getItem('notification-store');
    console.log('Notification store:', notificationStore);

    if (typeof window !== 'undefined' && (window as any).useNotificationStore) {
      const store = (window as any).useNotificationStore.getState();
      console.log('Store state:', store);
    }
  },

  // Complete debug test
  async runCompleteTest() {
    console.log('🚀 Running complete notification debug test...');

    // Step 1: Check permission
    await this.testPermission();

    // Step 2: Check store
    this.checkNotificationStore();

    // Step 3: Test direct notification
    await this.testDirectNotification();

    // Step 4: Test role filtering
    await this.testRoleFiltering();

    // Step 5: Test PR rejection
    await this.testPRRejection();

    console.log('✅ Complete debug test finished - check for notifications!');
  }
};

// Make available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).debugNotifications = debugNotifications;
}