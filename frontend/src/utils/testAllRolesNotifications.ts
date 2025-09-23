/**
 * Comprehensive test utility for testing notifications across all roles
 * Tests both new and existing purchase notifications for every role in the system
 */

import { notificationService } from '@/services/notificationService';
import { PurchaseNotificationService } from '@/services/purchaseNotificationService';
import { useNotificationStore } from '@/store/notificationStore';
import { getSecureUserData, getDebugLogger } from '@/utils/notificationSecurity';

export const testAllRolesNotifications = {
  // Get current user role from localStorage
  getCurrentRole(): string {
    const userData = getSecureUserData();
    return userData?.role || 'unknown';
  },

  // Test notifications for Site Supervisor role
  async testSiteSupervisor() {
    console.log('🏗️ Testing Site Supervisor notifications...');

    const testPRId = `PR-SS-${Date.now()}`;

    // Simulate PR final approval notification (Site Supervisor receives when their PR is approved)
    await PurchaseNotificationService.notifyPRFinallyApproved({
      documentId: testPRId,
      project: 'Dubai Marina Tower',
      amount: 35000,
      approvedBy: 'Technical Director'
    });

    // Simulate PR rejection (Site Supervisor receives when their PR is rejected)
    setTimeout(async () => {
      await PurchaseNotificationService.notifyPRRejected({
        documentId: `PR-SS-REJ-${Date.now()}`,
        rejectedBy: 'Procurement Team',
        reason: 'Specifications need clarification',
        project: 'Business Bay Office',
        backToRole: 'site supervisor'
      });
    }, 2000);

    console.log('✅ Site Supervisor notifications sent!');
  },

  // Test notifications for MEP Supervisor role
  async testMEPSupervisor() {
    console.log('⚡ Testing MEP Supervisor notifications...');

    const testPRId = `PR-MEP-${Date.now()}`;

    // Similar to Site Supervisor - they receive approval/rejection for their PRs
    await PurchaseNotificationService.notifyPRFinallyApproved({
      documentId: testPRId,
      project: 'HVAC System Installation',
      amount: 45000,
      approvedBy: 'Technical Director'
    });

    console.log('✅ MEP Supervisor notifications sent!');
  },

  // Test notifications for Procurement role
  async testProcurement() {
    console.log('📦 Testing Procurement notifications...');

    // New PR submission from Site Supervisor
    await PurchaseNotificationService.notifyPRSubmitted({
      documentId: `PR-PROC-${Date.now()}`,
      sender: 'Ahmed (Site Supervisor)',
      project: 'Dubai Marina Tower',
      amount: 28000,
      description: 'Urgent: Construction materials for foundation'
    });

    // New PR from MEP Supervisor
    setTimeout(async () => {
      await PurchaseNotificationService.notifyPRSubmitted({
        documentId: `PR-MEP-PROC-${Date.now()}`,
        sender: 'John (MEP Supervisor)',
        project: 'Business Bay HVAC',
        amount: 52000,
        description: 'HVAC equipment and materials'
      });
    }, 2000);

    // PR approved and ready for execution
    setTimeout(async () => {
      await PurchaseNotificationService.notifyPRFinallyApproved({
        documentId: `PR-EXEC-${Date.now()}`,
        project: 'JBR Residences',
        amount: 18500,
        approvedBy: 'Technical Director'
      });
    }, 4000);

    console.log('✅ Procurement notifications sent!');
  },

  // Test notifications for Project Manager role
  async testProjectManager() {
    console.log('👔 Testing Project Manager notifications...');

    // PR forwarded from Procurement for approval
    await PurchaseNotificationService.notifyPRForwardedToProjectManager({
      documentId: `PR-PM-${Date.now()}`,
      project: 'Dubai Marina Tower',
      amount: 32000
    });

    // Another PR for approval
    setTimeout(async () => {
      await PurchaseNotificationService.notifyPRForwardedToProjectManager({
        documentId: `PR-PM-2-${Date.now()}`,
        project: 'Business Bay Office',
        amount: 15000
      });
    }, 2000);

    // Rejection from Estimation (PM needs to review)
    setTimeout(async () => {
      await notificationService.sendApprovalNotification({
        type: 'rejected',
        documentType: 'Purchase Requisition',
        documentId: `PR-PM-REJ-${Date.now()}`,
        sender: 'Estimation Team',
        recipient: 'Project Manager',
        project: 'DIFC Tower',
        targetRole: 'project manager'
      });
    }, 4000);

    console.log('✅ Project Manager notifications sent!');
  },

  // Test notifications for Estimation role
  async testEstimation() {
    console.log('📊 Testing Estimation notifications...');

    // PR approved by PM and forwarded to Estimation
    await PurchaseNotificationService.notifyPRApprovedByProjectManager({
      documentId: `PR-EST-${Date.now()}`,
      project: 'Dubai Marina Tower',
      amount: 28000,
      nextRole: 'estimation'
    });

    // High-value PR needing cost analysis
    setTimeout(async () => {
      await PurchaseNotificationService.notifyPRApprovedByProjectManager({
        documentId: `PR-EST-HIGH-${Date.now()}`,
        project: 'Palm Jumeirah Villa',
        amount: 125000,
        nextRole: 'estimation'
      });
    }, 2000);

    console.log('✅ Estimation notifications sent!');
  },

  // Test notifications for Technical Director role
  async testTechnicalDirector() {
    console.log('🎯 Testing Technical Director notifications...');

    // PR requiring final approval (from Estimation)
    await PurchaseNotificationService.notifyPRApprovedByProjectManager({
      documentId: `PR-TD-${Date.now()}`,
      project: 'Dubai Marina Tower',
      amount: 48000,
      nextRole: 'technical director'
    });

    // Urgent PR requiring immediate attention
    setTimeout(async () => {
      await notificationService.sendApprovalNotification({
        type: 'received',
        documentType: 'Purchase Requisition - URGENT',
        documentId: `PR-TD-URGENT-${Date.now()}`,
        sender: 'Estimation Team',
        recipient: 'Technical Director',
        project: 'Emergency Repairs - Site A',
        amount: 75000,
        targetRole: 'technical director'
      });
    }, 2000);

    console.log('✅ Technical Director notifications sent!');
  },

  // Test system-wide notifications (all roles receive)
  async testSystemNotifications() {
    console.log('🔧 Testing system-wide notifications...');

    await notificationService.sendSystemNotification({
      type: 'info',
      title: 'System Maintenance',
      message: 'Scheduled maintenance tonight at 10 PM UAE time',
      priority: 'medium'
    });

    setTimeout(async () => {
      await notificationService.sendSystemNotification({
        type: 'alert',
        title: 'New Feature Available',
        message: 'Purchase order auto-generation is now live!',
        priority: 'low'
      });
    }, 2000);

    console.log('✅ System notifications sent!');
  },

  // Main test function - tests for current user's role
  async testCurrentUserRole() {
    const currentRole = this.getCurrentRole();
    console.log(`\n🧪 Testing notifications for current role: ${currentRole}\n`);

    switch(currentRole) {
      case 'site supervisor':
      case 'sitesupervisor':
        await this.testSiteSupervisor();
        break;

      case 'mep supervisor':
      case 'mepsupervisor':
        await this.testMEPSupervisor();
        break;

      case 'procurement':
        await this.testProcurement();
        break;

      case 'project manager':
      case 'projectmanager':
        await this.testProjectManager();
        break;

      case 'estimation':
        await this.testEstimation();
        break;

      case 'technical director':
      case 'technicaldirector':
        await this.testTechnicalDirector();
        break;

      default:
        console.log(`⚠️ Unknown role: ${currentRole}`);
        console.log('Testing generic system notifications instead...');
        await this.testSystemNotifications();
    }

    // Also test system notifications for all roles
    setTimeout(() => this.testSystemNotifications(), 5000);
  },

  // Test all roles sequentially (for admin testing)
  async testAllRolesSequentially() {
    console.log('🔄 Testing notifications for ALL roles sequentially...\n');

    await this.testSiteSupervisor();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await this.testMEPSupervisor();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await this.testProcurement();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await this.testProjectManager();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await this.testEstimation();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await this.testTechnicalDirector();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await this.testSystemNotifications();

    console.log('\n✅ All role notifications tested!');
  },

  // Utility to check notification stats
  checkNotificationStats() {
    const store = useNotificationStore.getState();
    const stats = {
      total: store.notifications.length,
      unread: store.unreadCount,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      byCategory: {} as Record<string, number>
    };

    store.notifications.forEach(n => {
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
      stats.byPriority[n.priority] = (stats.byPriority[n.priority] || 0) + 1;
      stats.byCategory[n.category] = (stats.byCategory[n.category] || 0) + 1;
    });

    console.log('📊 Notification Statistics:', stats);
    return stats;
  },

  // Clear all notifications (for testing)
  clearAllNotifications() {
    const store = useNotificationStore.getState();
    store.clearAll();
    console.log('🧹 All notifications cleared!');
  },

  // Mark all as read
  markAllAsRead() {
    const store = useNotificationStore.getState();
    store.markAllAsRead();
    console.log('✅ All notifications marked as read!');
  }
};

// Make available globally for browser console testing in dev mode only
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).testAllRoles = testAllRolesNotifications;

  const debug = getDebugLogger();
  // Log available commands in development
  debug.info(`
Notification Test Commands Available:
========================================
testAllRoles.testCurrentUserRole()     - Test notifications for your current role
testAllRoles.testAllRolesSequentially() - Test all roles (admin testing)
testAllRoles.checkNotificationStats()   - View notification statistics
testAllRoles.clearAllNotifications()    - Clear all notifications
testAllRoles.markAllAsRead()           - Mark all as read

Individual role tests:
testAllRoles.testSiteSupervisor()
testAllRoles.testMEPSupervisor()
testAllRoles.testProcurement()
testAllRoles.testProjectManager()
testAllRoles.testEstimation()
testAllRoles.testTechnicalDirector()
testAllRoles.testSystemNotifications()
  `);
}

export default testAllRolesNotifications;