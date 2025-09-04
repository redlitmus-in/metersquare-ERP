/**
 * MEP Supervisor Role Permissions
 * Based on Material Purchases - Project Bound Workflow
 * MEP Supervisor initiates purchase requests similar to Site Supervisor
 */

import { RolePermissions } from '../procurement/permissions';

export const mepSupervisorPermissions: RolePermissions = {
  purchaseRequests: {
    create: true,         // Can create new requests (initiator)
    view: true,          // Can view own requests
    edit: true,          // Can edit own requests before submission
    delete: true,        // Can delete draft requests
    sendEmail: false,    // Cannot send procurement emails
    approve: false,      // Cannot approve
    handleCostRevision: false  // Not responsible for cost
  },
  vendorQuotations: {
    create: false,       // Cannot create vendor quotations
    view: true,          // Can view related quotations
    edit: false,         // Cannot edit quotations
    delete: false,       // Cannot delete quotations
    compare: false,      // Cannot compare quotes
    negotiate: false     // Cannot negotiate with vendors
  },
  approvals: {
    canApprove: false,   // No approval authority
    canReject: false,    // Cannot reject
    canEscalate: false   // Cannot escalate
  },
  workflow: {
    canSendToProjectManager: false,  // Sends to Procurement first
    canHandleCostFlag: false,        // Not responsible for cost
    canRequestRevision: false        // Cannot request revision
  }
};