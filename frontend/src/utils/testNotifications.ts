// Test utility for notification system
import { notificationService } from '@/services/notificationService';

export const testNotificationSystem = {
  // Test browser notification permission
  async testPermission() {
    console.log('🔔 Testing notification permission...');
    const permission = await notificationService.requestPermission();
    console.log(`Permission status: ${permission}`);

    if (permission === 'granted') {
      console.log('✅ Notifications enabled! You will receive system notifications even when using other apps.');
    } else if (permission === 'denied') {
      console.log('❌ Notifications blocked. Please enable them in browser settings for the best experience.');
    } else {
      console.log('⚠️ Notification permission not granted.');
    }

    return permission;
  },

  // Test real-time purchase approval notification
  async testPurchaseApprovalNotification() {
    console.log('📋 Testing real-time purchase approval notification...');
    await notificationService.sendApprovalNotification({
      type: 'received',
      documentType: 'Purchase Requisition',
      documentId: `PR-${Date.now()}`,
      sender: 'Site Supervisor',
      recipient: 'Procurement Team',
      project: 'Real-time Test Project',
      amount: 25000
    });
    console.log('✅ Purchase approval notification sent! Check your system notifications.');
  },

  // Test email notification
  async testEmailNotification() {
    console.log('📧 Testing email notification...');
    await notificationService.sendEmailNotification({
      recipient: 'project.manager@metersquare.ae',
      subject: `Purchase Requisition PR-${Date.now()} - Approval Required`,
      documentType: 'Purchase Requisition',
      documentId: `PR-${Date.now()}`,
      amount: 15000,
      project: 'Email Test Project',
      sender: 'Procurement Team'
    });
    console.log('✅ Email notification sent! Check your system notifications.');
  },

  // Test approval notification
  async testApprovalNotification() {
    console.log('✅ Testing approval notification...');
    await notificationService.sendApprovalNotification({
      type: 'received',
      documentType: 'Purchase Requisition',
      documentId: 'TEST-002',
      sender: 'Site Supervisor',
      recipient: 'Project Manager',
      project: 'TEST-PROJECT-002',
      amount: 25000
    });
    console.log('Approval notification sent!');
  },

  // Test rejection notification
  async testRejectionNotification() {
    console.log('❌ Testing rejection notification...');
    await notificationService.sendApprovalNotification({
      type: 'rejected',
      documentType: 'Purchase Requisition',
      documentId: 'TEST-003',
      sender: 'Procurement Team',
      recipient: 'Site Supervisor'
    });
    console.log('Rejection notification sent!');
  },

  // Test approved notification
  async testApprovedNotification() {
    console.log('✅ Testing approved notification...');
    await notificationService.sendApprovalNotification({
      type: 'approved',
      documentType: 'Purchase Requisition',
      documentId: 'TEST-004',
      sender: 'Project Manager',
      recipient: 'Procurement Team',
      project: 'TEST-PROJECT-003'
    });
    console.log('Approved notification sent!');
  },

  // Test system notification
  async testSystemNotification() {
    console.log('🔧 Testing system notification...');
    await notificationService.sendSystemNotification({
      type: 'info',
      title: 'System Update',
      message: 'A new version of MeterSquare ERP is available',
      priority: 'medium'
    });
    console.log('System notification sent!');
  },

  // Test urgent notification
  async testUrgentNotification() {
    console.log('🚨 Testing urgent notification...');
    await notificationService.sendSystemNotification({
      type: 'alert',
      title: 'Urgent: Server Maintenance',
      message: 'Scheduled maintenance will begin in 15 minutes',
      priority: 'urgent'
    });
    console.log('Urgent notification sent!');
  },

  // Test real-time notification system with different priorities
  async testRealTimeNotifications() {
    console.log('🚀 Testing real-time notification system...');
    console.log('💡 Now switch to another tab or app to test cross-app notifications!');

    // Test high priority notification first
    await notificationService.sendApprovalNotification({
      type: 'received',
      documentType: 'Purchase Requisition',
      documentId: `PR-${Date.now()}`,
      sender: 'Site Supervisor (Ahmed)',
      recipient: 'Procurement Team',
      project: 'Dubai Marina Tower',
      amount: 25000
    });

    // Wait 3 seconds then send email notification
    setTimeout(async () => {
      await notificationService.sendEmailNotification({
        recipient: 'project.manager@metersquare.ae',
        subject: `Purchase Requisition PR-${Date.now()} - Approval Required`,
        documentType: 'Purchase Requisition',
        documentId: `PR-${Date.now()}`,
        amount: 18500,
        project: 'Business Bay Office',
        sender: 'Procurement Team'
      });
    }, 3000);

    // Wait 6 seconds then send rejection notification
    setTimeout(async () => {
      await notificationService.sendApprovalNotification({
        type: 'rejected',
        documentType: 'Purchase Requisition',
        documentId: `PR-${Date.now()}`,
        sender: 'Project Manager',
        recipient: 'Site Supervisor'
      });
    }, 6000);

    // Wait 9 seconds then send urgent notification
    setTimeout(async () => {
      await notificationService.sendSystemNotification({
        type: 'alert',
        title: '🚨 Urgent: Budget Approval Required',
        message: 'Project budget exceeds allocated amount - immediate approval needed',
        priority: 'urgent'
      });
    }, 9000);

    console.log('✅ Real-time notification test started! Notifications will appear every 3 seconds.');
  },

  // Test the complete notification workflow
  async testCompleteWorkflow() {
    console.log('🔄 Testing complete notification workflow...');

    // Request permission first
    const permission = await this.testPermission();

    if (permission !== 'granted') {
      console.log('❌ Cannot test notifications without permission. Please allow notifications and try again.');
      return;
    }

    console.log('📱 Testing cross-app notifications...');
    console.log('💡 Switch to another tab or minimize the browser to test system notifications!');

    // Test real-time notifications
    await this.testRealTimeNotifications();

    console.log('✅ Complete workflow test started! Check your system notifications.');
  },

  // Clear all notifications and test fresh
  async clearAndTest() {
    console.log('🧹 Clearing all notifications and testing fresh...');

    // Clear store
    if (typeof window !== 'undefined' && (window as any).useNotificationStore) {
      (window as any).useNotificationStore.getState().clearAll();
    }

    // Clear localStorage
    localStorage.removeItem('notification-store');

    console.log('✅ All notifications cleared. Now testing role-specific PR notification...');

    // Test role-specific PR notification
    const { PurchaseNotificationService } = await import('@/services/purchaseNotificationService');
    await PurchaseNotificationService.testForCurrentRole();

    console.log('📋 Role-specific PR notification sent! Check the notification bell.');
  },

  // Test Purchase Requisition workflow
  async testPRWorkflow() {
    console.log('🔄 Testing complete PR workflow for current role...');

    const { PurchaseNotificationService } = await import('@/services/purchaseNotificationService');
    await PurchaseNotificationService.testForCurrentRole();
  },

  // Get notification status
  getStatus() {
    const status = notificationService.getPermissionStatus();
    console.log('📊 Notification System Status:', status);
    return status;
  }
};

// Make available globally for easy testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testNotifications = testNotificationSystem;
}