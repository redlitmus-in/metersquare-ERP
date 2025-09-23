import { notificationService } from './notificationService';
import { getSecureUserData, getDebugLogger } from '@/utils/notificationSecurity';

/**
 * Service to handle Purchase Requisition specific notifications
 * Sends both system and toast notifications for PR events
 */
export class PurchaseNotificationService {
  // When a new PR is submitted by Site Supervisor
  static async notifyPRSubmitted(prData: {
    documentId: string;
    sender: string;
    project?: string;
    amount?: number;
    description?: string;
  }) {
    const debug = getDebugLogger();
    debug.info('New PR submitted, notifying Procurement team');

    // Send main approval notification
    await notificationService.sendApprovalNotification({
      type: 'received',
      documentType: 'Purchase Requisition',
      documentId: prData.documentId,
      sender: prData.sender,
      recipient: 'Procurement Team',
      project: prData.project,
      amount: prData.amount,
      targetRole: 'procurement' // Only Procurement should see new PR submissions
    });

    // Also trigger system notification for immediate visibility
    await notificationService.sendSystemNotification({
      type: 'info',
      title: 'New Purchase Requisition',
      message: `PR ${prData.documentId} received from ${prData.sender}`,
      priority: prData.amount && prData.amount > 50000 ? 'urgent' : 'high',
      metadata: {
        project: prData.project,
        amount: prData.amount,
        link: `/procurement/purchase-requests/${prData.documentId}`
      }
    });
  }

  // When Procurement forwards PR to Project Manager
  static async notifyPRForwardedToProjectManager(prData: {
    documentId: string;
    project?: string;
    amount?: number;
  }) {
    const debug = getDebugLogger();
    debug.info('PR forwarded to Project Manager for approval');

    await notificationService.sendApprovalNotification({
      type: 'received',
      documentType: 'Purchase Requisition',
      documentId: prData.documentId,
      sender: 'Procurement Team',
      recipient: 'Project Manager',
      project: prData.project,
      amount: prData.amount,
      targetRole: 'project manager' // Only Project Managers should see this
    });
  }

  // When Project Manager approves and forwards to next role
  static async notifyPRApprovedByProjectManager(prData: {
    documentId: string;
    project?: string;
    amount?: number;
    nextRole: 'estimation' | 'technical director';
  }) {
    const debug = getDebugLogger();
    debug.info(`PR approved by Project Manager, forwarding to ${prData.nextRole}`);

    await notificationService.sendApprovalNotification({
      type: 'received',
      documentType: 'Purchase Requisition',
      documentId: prData.documentId,
      sender: 'Project Manager',
      recipient: prData.nextRole === 'estimation' ? 'Estimation Team' : 'Technical Director',
      project: prData.project,
      amount: prData.amount,
      targetRole: prData.nextRole // Only specific role should see this
    });
  }

  // When PR is finally approved and ready for execution
  static async notifyPRFinallyApproved(prData: {
    documentId: string;
    project?: string;
    amount?: number;
    approvedBy: string;
  }) {
    const debug = getDebugLogger();
    debug.info('PR finally approved, notifying original requester');

    // Notify original requester (Site Supervisor)
    await notificationService.sendApprovalNotification({
      type: 'approved',
      documentType: 'Purchase Requisition',
      documentId: prData.documentId,
      sender: prData.approvedBy,
      recipient: 'Site Supervisor',
      project: prData.project,
      amount: prData.amount,
      targetRole: 'site supervisor' // Only Site Supervisor should see final approval
    });

    // Also notify Procurement for execution
    await notificationService.sendApprovalNotification({
      type: 'approved',
      documentType: 'Purchase Requisition',
      documentId: prData.documentId,
      sender: prData.approvedBy,
      recipient: 'Procurement Team',
      project: prData.project,
      amount: prData.amount,
      targetRole: 'procurement' // Procurement needs to know to execute
    });
  }

  // When PR is rejected at any stage
  static async notifyPRRejected(prData: {
    documentId: string;
    rejectedBy: string;
    reason?: string;
    project?: string;
    backToRole: 'site supervisor' | 'mep supervisor' | 'procurement';
    originalSender?: string;
  }) {
    const debug = getDebugLogger();
    debug.info(`PR rejected by ${prData.rejectedBy}, sending back to ${prData.backToRole}`);

    // Notify the person who needs to handle the rejection
    await notificationService.sendApprovalNotification({
      type: 'rejected',
      documentType: 'Purchase Requisition',
      documentId: prData.documentId,
      sender: prData.rejectedBy,
      recipient: prData.backToRole === 'site supervisor' ? 'Site Supervisor' :
                prData.backToRole === 'mep supervisor' ? 'MEP Supervisor' : 'Procurement Team',
      project: prData.project,
      targetRole: prData.backToRole // Only the person who needs to revise should see this
    });

    // Also send a system notification with the rejection reason
    if (prData.reason) {
      await notificationService.sendSystemNotification({
        type: 'error',
        title: `PR ${prData.documentId} Rejected`,
        message: `Rejected by ${prData.rejectedBy}. Reason: ${prData.reason}`,
        priority: 'high'
      });
    }
  }

  // When PR is reapproved after a rejection
  static async notifyPRReapproved(prData: {
    documentId: string;
    reapprovedBy: string;
    project?: string;
    amount?: number;
    nextRole: string;
  }) {
    const debug = getDebugLogger();
    debug.info(`PR reapproved by ${prData.reapprovedBy}, forwarding to ${prData.nextRole}`);

    await notificationService.sendApprovalNotification({
      type: 'received',
      documentType: 'Purchase Requisition (Resubmitted)',
      documentId: prData.documentId,
      sender: prData.reapprovedBy,
      recipient: prData.nextRole,
      project: prData.project,
      amount: prData.amount,
      targetRole: prData.nextRole.toLowerCase() // Notify the next approver in the chain
    });

    // Send success notification to the resubmitter
    await notificationService.sendSystemNotification({
      type: 'success',
      title: `PR ${prData.documentId} Resubmitted`,
      message: `Successfully resubmitted and forwarded to ${prData.nextRole}`,
      priority: 'medium'
    });
  }

  // Send confirmation to the sender when PR is created
  static async notifySenderConfirmation(prData: {
    documentId: string;
    project?: string;
    amount?: number;
  }) {
    const debug = getDebugLogger();
    debug.info(`Sending confirmation to PR sender for ${prData.documentId}`);

    // Only send a simple toast confirmation to the sender
    await notificationService.sendSystemNotification({
      type: 'success',
      title: 'Purchase Requisition Sent',
      message: `PR ${prData.documentId} has been successfully submitted for approval`,
      priority: 'low'
    });
  }

  // Test function for current user role
  static async testForCurrentRole() {
    const debug = getDebugLogger();
    const userData = getSecureUserData();
    const userRole = userData?.role || 'unknown';

    debug.info(`Testing PR notification for current role: ${userRole}`);

    const testPRId = `PR-TEST-${Date.now()}`;

    switch (userRole) {
      case 'procurement':
        await this.notifyPRSubmitted({
          documentId: testPRId,
          sender: 'Ahmed (Site Supervisor)',
          project: 'Test Project',
          amount: 15000,
          description: 'Test materials for construction'
        });
        break;

      case 'project manager':
      case 'projectmanager':
        await this.notifyPRForwardedToProjectManager({
          documentId: testPRId,
          project: 'Test Project',
          amount: 15000
        });
        break;

      case 'site supervisor':
      case 'sitesupervisor':
        await this.notifyPRFinallyApproved({
          documentId: testPRId,
          project: 'Test Project',
          amount: 15000,
          approvedBy: 'Technical Director'
        });
        break;

      case 'estimation':
        await this.notifyPRApprovedByProjectManager({
          documentId: testPRId,
          project: 'Test Project',
          amount: 15000,
          nextRole: 'estimation'
        });
        break;

      case 'technical director':
      case 'technicaldirector':
        await this.notifyPRApprovedByProjectManager({
          documentId: testPRId,
          project: 'Test Project',
          amount: 15000,
          nextRole: 'technical director'
        });
        break;

      default:
        debug.warn(`No specific PR test for role: ${userRole}`);
        // Send a generic test
        await notificationService.sendSystemNotification({
          type: 'info',
          title: 'Test Notification',
          message: `Test notification for role: ${userRole}`,
          priority: 'medium'
        });
    }
  }
}

// Make available globally for testing in development mode only
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).PurchaseNotificationService = PurchaseNotificationService;
}