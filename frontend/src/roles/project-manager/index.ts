/**
 * Project Manager Module Exports
 * Central export point for all PM components, pages, and services
 */

// Export permissions
export { projectManagerPermissions } from './permissions';

// Export services
export { 
  projectManagerService,
  type PurchaseApproval,
  type ProcurementPurchase,
  type PurchaseStatusDetails,
  type PMDashboardData
} from './services/projectManagerService';

// Export components
export { PurchaseApprovalCard } from './components/PurchaseApprovalCard';
export { ApprovalModal } from './components/ApprovalModal';
export { PMMetricsCards } from './components/PMMetricsCards';
export { default as PurchaseDetailsModal } from './components/PurchaseDetailsModal';

// Export pages
export { default as ProjectManagerHub } from './pages/ProjectManagerHub';
export { default as PurchaseApprovalsPage } from './pages/PurchaseApprovalsPage';