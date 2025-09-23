/**
 * Test utility for complete Purchase Requisition workflow with notifications
 * This file demonstrates the complete notification flow for PR approvals
 */

import { PurchaseNotificationService } from '@/services/purchaseNotificationService';
import { getSecureUserData, getDebugLogger } from '@/utils/notificationSecurity';

export const testCompleteWorkflow = {
  // Test the complete PR workflow from start to finish
  async testFullPRWorkflow() {
    const debug = getDebugLogger();
    debug.info('Testing complete PR workflow with notifications...');

    const testPRId = `PR-WORKFLOW-${Date.now()}`;
    const testProject = 'Dubai Marina Project';
    const testAmount = 25000;

    // Step 1: Site Supervisor submits PR → Procurement receives notification
    debug.info('Step 1: Site Supervisor submits PR...');
    await PurchaseNotificationService.notifyPRSubmitted({
      documentId: testPRId,
      sender: 'Ahmed (Site Supervisor)',
      project: testProject,
      amount: testAmount,
      description: 'Construction materials for tower foundation'
    });

    // Wait 2 seconds
    setTimeout(async () => {
      // Step 2: Procurement approves → Project Manager receives notification
      debug.info('Step 2: Procurement approves and forwards to PM...');
      await PurchaseNotificationService.notifyPRForwardedToProjectManager({
        documentId: testPRId,
        project: testProject,
        amount: testAmount
      });
    }, 2000);

    // Wait 4 seconds
    setTimeout(async () => {
      // Step 3: Project Manager approves → Estimation receives notification
      debug.info('Step 3: Project Manager approves and forwards to Estimation...');
      await PurchaseNotificationService.notifyPRApprovedByProjectManager({
        documentId: testPRId,
        project: testProject,
        amount: testAmount,
        nextRole: 'estimation'
      });
    }, 4000);

    // Wait 6 seconds
    setTimeout(async () => {
      // Step 4: Estimation approves → Technical Director receives notification
      debug.info('Step 4: Estimation approves and forwards to TD...');
      await PurchaseNotificationService.notifyPRApprovedByProjectManager({
        documentId: testPRId,
        project: testProject,
        amount: testAmount,
        nextRole: 'technical director'
      });
    }, 6000);

    // Wait 8 seconds
    setTimeout(async () => {
      // Step 5: Technical Director gives final approval → All relevant parties notified
      debug.info('Step 5: Technical Director gives final approval...');
      await PurchaseNotificationService.notifyPRFinallyApproved({
        documentId: testPRId,
        project: testProject,
        amount: testAmount,
        approvedBy: 'Technical Director'
      });
    }, 8000);

    debug.info('Complete PR workflow test started! Watch for notifications at each step.');
  },

  // Test rejection workflow
  async testRejectionWorkflow() {
    const debug = getDebugLogger();
    debug.info('Testing PR rejection workflow...');

    const testPRId = `PR-REJECT-${Date.now()}`;
    const testProject = 'Business Bay Office';

    // PM rejects and sends back to Procurement
    await PurchaseNotificationService.notifyPRRejected({
      documentId: testPRId,
      rejectedBy: 'Project Manager',
      reason: 'Budget exceeds allocated amount',
      project: testProject,
      backToRole: 'procurement'
    });

    setTimeout(async () => {
      // Estimation rejects and sends back to PM
      await PurchaseNotificationService.notifyPRRejected({
        documentId: testPRId,
        rejectedBy: 'Estimation Team',
        reason: 'Specifications need revision',
        project: testProject,
        backToRole: 'project manager'
      });
    }, 3000);

    debug.info('Rejection workflow test completed!');
  },

  // Test role-based filtering
  async testRoleBasedNotifications() {
    const debug = getDebugLogger();
    debug.info('Testing role-based notification filtering...');

    const userData = getSecureUserData();
    const currentRole = userData?.role || 'unknown';

    debug.info(`Current user role: ${currentRole}`);

    // Test notification for current role
    await PurchaseNotificationService.testForCurrentRole();

    debug.info('Role-based notification test completed!');
  }
};

// Make available globally for testing in development only
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).testPRWorkflow = testCompleteWorkflow;
}