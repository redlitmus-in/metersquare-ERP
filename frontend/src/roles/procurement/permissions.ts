/**
 * Procurement Role Permissions
 * Based on Material Purchases - Project Bound Workflow
 * Procurement receives requests from Site/MEP Supervisors and processes them
 */

export interface RolePermissions {
  purchaseRequests: {
    create: boolean;
    view: boolean;
    edit: boolean;
    delete: boolean;
    sendEmail: boolean;
    approve: boolean;
    handleCostRevision: boolean;
  };
  vendorQuotations: {
    create: boolean;
    view: boolean;
    edit: boolean;
    delete: boolean;
    compare: boolean;
    negotiate: boolean;
  };
  approvals: {
    canApprove: boolean;
    canReject: boolean;
    canEscalate: boolean;
  };
  workflow: {
    canSendToProjectManager: boolean;
    canHandleCostFlag: boolean;
    canRequestRevision: boolean;
  };
}

export const procurementPermissions: RolePermissions = {
  purchaseRequests: {
    create: false,        // Cannot create - receives from Site/MEP Supervisors
    view: true,          // Can view all requests
    edit: true,          // Can edit for cost revisions
    delete: false,       // Cannot delete
    sendEmail: true,     // Can send emails to stakeholders
    approve: false,      // Cannot approve (PM/TD role)
    handleCostRevision: true  // Main responsibility
  },
  vendorQuotations: {
    create: true,        // Can create vendor quotations
    view: true,          // Can view all quotations
    edit: true,          // Can edit quotations
    delete: true,        // Can delete quotations
    compare: true,       // Can compare vendor quotes
    negotiate: true      // Can negotiate with vendors
  },
  approvals: {
    canApprove: false,   // No approval authority
    canReject: false,    // Cannot reject
    canEscalate: true    // Can escalate issues
  },
  workflow: {
    canSendToProjectManager: true,  // After processing
    canHandleCostFlag: true,        // Cost revision responsibility
    canRequestRevision: true        // Can send back for revision
  }
};