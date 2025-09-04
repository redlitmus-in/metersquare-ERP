/**
 * Project Manager Role Permissions
 * Based on Material Purchases - Project Bound Workflow
 * Project Manager reviews after Procurement, handles PM FLAG and QTY/SPEC approvals
 */

import { RolePermissions } from '../procurement/permissions';

export const projectManagerPermissions: RolePermissions = {
  purchaseRequests: {
    create: false,        // Does not create requests
    view: true,          // Can view all project requests
    edit: true,          // Can edit for approvals
    delete: false,       // Cannot delete
    sendEmail: true,     // Can send notification emails
    approve: true,       // Can approve requests (PM FLAG)
    handleCostRevision: false  // Not responsible for cost revision
  },
  vendorQuotations: {
    create: false,       // Cannot create vendor quotations
    view: true,          // Can view all quotations
    edit: false,         // Cannot edit quotations
    delete: false,       // Cannot delete quotations
    compare: true,       // Can compare quotes for decision
    negotiate: false     // Cannot negotiate directly
  },
  approvals: {
    canApprove: true,    // Has PM FLAG approval authority
    canReject: true,     // Can reject and send back
    canEscalate: true    // Can escalate to Technical Director
  },
  workflow: {
    canSendToProjectManager: false,  // Is the Project Manager
    canHandleCostFlag: false,        // Cost handled by Procurement
    canRequestRevision: true         // Can request QTY/SPEC revision
  }
};