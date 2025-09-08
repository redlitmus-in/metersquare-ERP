/**
 * Accounts Role Module Exports
 * Centralized export for all Accounts-related components and services
 */

// Main Pages
export { default as AccountsHub } from './pages/AccountsHub';

// Components
export { default as AccountsApprovalCard } from './components/AccountsApprovalCard';
export { default as PaymentProcessingModal } from './components/PaymentProcessingModal';
export { default as PaymentApprovalModal } from './components/PaymentApprovalModal';
export { default as PurchaseDetailsModal } from './components/PurchaseDetailsModal';

// Services
export { accountsService } from './services/accountsService';

// Types
export type {
  Purchase,
  Material,
  PaymentDetails,
  PurchaseStatus,
  PaymentTransaction,
  Acknowledgement,
  ProcessPaymentRequest,
  ProcessPaymentResponse,
  ApprovePaymentRequest,
  ApprovePaymentResponse,
  CreateAcknowledgementRequest,
  CreateAcknowledgementResponse,
  AccountsDashboardResponse,
  FinancialSummaryResponse,
  AccountsPurchasesResponse,
  PendingApprovalsResponse,
  PaginationInfo,
  PaginatedPaymentTransactionsResponse,
  PaginatedAcknowledgementsResponse
} from './types';