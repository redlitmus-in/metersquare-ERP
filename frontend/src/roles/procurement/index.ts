/**
 * Procurement Role Exports
 * This role processes purchase requests received from Site/MEP Supervisors
 */

// Permissions
export { procurementPermissions } from './permissions';

// Main Hub Page
export { default as ProcurementHub } from './pages/ProcurementHub';

// Services
export { procurementService } from './services/procurementService';

// Components
export { default as PurchaseCard } from './components/PurchaseCard';
export { default as PurchaseDetailsModal } from './components/PurchaseDetailsModal';

// Other pages (if needed)
export { default as ApprovalsPage } from './pages/ApprovalsPage';
export { default as DeliveriesPage } from './pages/DeliveriesPage';
export { default as PurchaseRequestsPage } from './pages/PurchaseRequestsPage';
export { default as VendorQuotationsPage } from './pages/VendorQuotationsPage';