/**
 * Design Role Permissions
 * Based on Material Purchases - Project Bound Workflow
 * Provides design reference inputs and specifications
 */

import { RolePermissions } from '../procurement/permissions';

export const designPermissions: RolePermissions = {
  purchaseRequests: {
    create: false,        // Does not create purchase requests
    view: true,          // Can view requests for design reference
    edit: true,          // Can add design specifications
    delete: false,       // Cannot delete
    sendEmail: false,    // Does not send emails
    approve: false,      // No approval authority
    handleCostRevision: false  // Not responsible for cost
  },
  vendorQuotations: {
    create: false,       // Cannot create vendor quotations
    view: true,          // Can view for design compliance
    edit: false,         // Cannot edit quotations
    delete: false,       // Cannot delete quotations
    compare: false,      // Does not compare quotes
    negotiate: false     // Does not negotiate
  },
  approvals: {
    canApprove: false,   // No approval authority
    canReject: false,    // Cannot reject
    canEscalate: false   // Cannot escalate
  },
  workflow: {
    canSendToProjectManager: false,  // Provides input only
    canHandleCostFlag: false,        // Not responsible for cost
    canRequestRevision: false        // Cannot request revision
  }
};