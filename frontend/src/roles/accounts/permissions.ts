/**
 * Accounts Role Permissions
 * Based on Material Purchases - Project Bound Workflow
 * Handles payment processing and financial approvals
 */

import { RolePermissions } from '../procurement/permissions';

export const accountsPermissions: RolePermissions = {
  purchaseRequests: {
    create: false,        // Does not create requests
    view: true,          // Can view approved requests
    edit: false,         // Cannot edit requests
    delete: false,       // Cannot delete
    sendEmail: true,     // Can send payment confirmations
    approve: false,      // No approval on requests
    handleCostRevision: false  // Not responsible for cost revision
  },
  vendorQuotations: {
    create: false,       // Cannot create vendor quotations
    view: true,          // Can view for payment processing
    edit: false,         // Cannot edit quotations
    delete: false,       // Cannot delete quotations
    compare: false,      // Does not compare quotes
    negotiate: false     // Does not negotiate
  },
  approvals: {
    canApprove: false,   // Processes payments, not approvals
    canReject: false,    // Cannot reject
    canEscalate: true    // Can escalate payment issues
  },
  workflow: {
    canSendToProjectManager: false,  // End of workflow
    canHandleCostFlag: false,        // Not responsible for cost flag
    canRequestRevision: false        // Cannot request revision
  }
};