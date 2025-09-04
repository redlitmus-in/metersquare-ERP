/**
 * Estimation Role Permissions
 * Based on Material Purchases - Project Bound Workflow
 * Handles cost analysis and COST FLAG approvals
 */

import { RolePermissions } from '../procurement/permissions';

export const estimationPermissions: RolePermissions = {
  purchaseRequests: {
    create: false,        // Does not create requests
    view: true,          // Can view all requests for cost analysis
    edit: true,          // Can edit cost-related fields
    delete: false,       // Cannot delete
    sendEmail: true,     // Can send cost-related emails
    approve: true,       // Can approve COST FLAG
    handleCostRevision: true  // Responsible for cost analysis
  },
  vendorQuotations: {
    create: false,       // Cannot create vendor quotations
    view: true,          // Can view for cost comparison
    edit: false,         // Cannot edit quotations
    delete: false,       // Cannot delete quotations
    compare: true,       // Can compare costs
    negotiate: false     // Cannot negotiate directly
  },
  approvals: {
    canApprove: true,    // Has COST FLAG approval authority
    canReject: true,     // Can reject on cost grounds
    canEscalate: true    // Can escalate cost issues
  },
  workflow: {
    canSendToProjectManager: false,  // Sends to Technical Director
    canHandleCostFlag: true,         // Main responsibility for COST FLAG
    canRequestRevision: true         // Can request cost revision
  }
};