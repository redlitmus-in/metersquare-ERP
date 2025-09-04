/**
 * Technical Director Role Permissions
 * Based on Material Purchases - Project Bound Workflow
 * Final technical approval authority with FLAG approval
 */

import { RolePermissions } from '../procurement/permissions';

export const technicalDirectorPermissions: RolePermissions = {
  purchaseRequests: {
    create: false,        // Does not create requests
    view: true,          // Can view all requests
    edit: true,          // Can edit for final approval
    delete: false,       // Cannot delete
    sendEmail: true,     // Can send approval emails
    approve: true,       // Final approval authority (FLAG)
    handleCostRevision: false  // Not primary cost responsibility
  },
  vendorQuotations: {
    create: false,       // Cannot create vendor quotations
    view: true,          // Can view all quotations
    edit: false,         // Cannot edit quotations
    delete: false,       // Cannot delete quotations
    compare: true,       // Can review comparisons
    negotiate: false     // Does not negotiate directly
  },
  approvals: {
    canApprove: true,    // Has FLAG final approval
    canReject: true,     // Can reject requests
    canEscalate: false   // Top technical authority
  },
  workflow: {
    canSendToProjectManager: false,  // Above PM in hierarchy
    canHandleCostFlag: false,        // Reviews cost but not primary
    canRequestRevision: true         // Can request any revision
  }
};