/**
 * Type definitions for Accounts role
 * Based on the account controller endpoints and data structures
 */

// Purchase interface (extended from Technical Director)
export interface Purchase {
  purchase_id: number;
  project_id: number;
  user_id: number;
  requested_by: string;
  site_location: string;
  date: string;
  purpose: string;
  material_ids: number[];
  file_path?: string;
  is_deleted: boolean;
  email_sent: boolean;
  created_at: string;
  created_by: string;
  last_modified_at?: string;
  last_modified_by?: string;
  
  // Status fields
  accounts_status?: string;
  technical_director_status?: string;
  estimation_status?: string;
  
  // Calculated fields
  total_cost?: number;
  total_quantity?: number;
  material_count?: number;
  
  // Related data
  materials?: Material[];
  material_details?: Material[]; // Alternative property name from backend
  payment_details?: PaymentDetails;
  payment_transaction?: PaymentTransaction;
  latest_status?: PurchaseStatus;
  
  // Rejection reasons
  accounts_rejection_reason?: string;
  technical_director_rejection_reason?: string;
  
  // Acknowledgement tracking
  acknowledgement?: Acknowledgement;
  acknowledgement_sent?: boolean;
}

export interface Material {
  material_id: number;
  material_name: string;
  quantity: number;
  unit_cost: number;
  specifications?: string;
  priority?: string;
  total_cost?: number;
}

export interface PaymentDetails {
  transaction_id?: number;
  payment_method?: string;
  payment_reference?: string;
  vendor_name?: string;
  vendor_account_details?: string;
  notes?: string;
  supporting_documents?: string[];
}

export interface PurchaseStatus {
  status_id: number;
  purchase_id: number;
  sender: string;
  receiver: string;
  status: string;
  decision_date?: string;
  decision_by_user_id?: number;
  comments?: string;
  rejection_reason?: string;
  reject_category?: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

// Payment Transaction interfaces
export interface PaymentTransaction {
  transaction_id: number;
  purchase_id: number;
  project_id: number;
  transaction_type: string;
  amount: number;
  payment_method: string;
  payment_reference?: string;
  vendor_name?: string;
  vendor_account_details?: string;
  status: 'pending' | 'processed' | 'failed';
  approval_required: boolean;
  notes?: string;
  supporting_documents?: string[];
  created_by: string;
  created_at: string;
  processed_by?: string;
  processed_at?: string;
  approved_by?: string;
  approved_at?: string;
  failure_reason?: string;
  last_modified_by?: string;
  last_modified_at?: string;
  
  // Related data
  purchase?: Purchase;
  project?: any;
}

// Acknowledgement interface
export interface Acknowledgement {
  acknowledgement_id: number;
  transaction_id?: number;
  purchase_id: number;
  acknowledgement_type: string;
  acknowledged_by: string;
  acknowledged_by_role: string;
  acknowledgement_message?: string;
  supporting_documents?: string[];
  acknowledged_at: string;
  created_by: string;
  created_at: string;
}

// API Request/Response interfaces
export interface ProcessPaymentRequest {
  purchase_id: number;
  amount: number;
  payment_method: string;
  payment_reference?: string;
  vendor_name?: string;
  vendor_account_details?: string;
  notes?: string;
  supporting_documents?: string[];
}

export interface ProcessPaymentResponse {
  message: string;
  transaction_id: number;
  status: string;
}

export interface ApprovePaymentRequest {
  transaction_id: number;
  approval_status: 'approved' | 'rejected';
  comments?: string;
}

export interface ApprovePaymentResponse {
  message: string;
  transaction_id: number;
  status: string;
}

export interface CreateAcknowledgementRequest {
  purchase_id: number;
  transaction_id?: number;
  acknowledgement_type: string;
  acknowledgement_message?: string;
  supporting_documents?: string[];
}

export interface CreateAcknowledgementResponse {
  message: string;
  acknowledgement_id: number;
}

// Dashboard and summary interfaces
export interface AccountsDashboardResponse {
  accounts_as_sender: {
    total_sent: number;
    approved: number;
    rejected: number;
    pending: number;
    approval_rate: number;
  };
  accounts_as_receiver: {
    total_received: number;
    approved: number;
    rejected: number;
    pending: number;
    approval_rate: number;
  };
}

export interface FinancialSummaryResponse {
  summary: {
    total_transactions: number;
    total_amount: number;
    pending_approvals: number;
    date_range: {
      start_date: string;
      end_date: string;
    };
  };
  status_breakdown: Array<{
    status: string;
    count: number;
    total_amount: number;
  }>;
  method_breakdown: Array<{
    method: string;
    count: number;
    total_amount: number;
  }>;
  recent_transactions: PaymentTransaction[];
}

export interface AccountsPurchasesResponse {
  success: boolean;
  message: string;
  purchase_details: Purchase[];
}

export interface PendingApprovalsResponse {
  pending_transactions: PaymentTransaction[];
  count: number;
}

// Pagination interface
export interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedPaymentTransactionsResponse {
  transactions: PaymentTransaction[];
  pagination: PaginationInfo;
}

export interface PaginatedAcknowledgementsResponse {
  acknowledgements: Acknowledgement[];
  pagination: PaginationInfo;
}