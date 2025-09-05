/**
 * Type definitions for Estimation module
 * Aligned with backend API responses
 */

// Material type from backend
export interface Material {
  material_id: number;
  description: string;
  specification: string;
  unit: string;
  quantity: number;
  category: string;
  unit_cost: number;
  total_cost: number;
  priority: string;
  design_reference?: string;
}

// Status info from purchase_status table
export interface StatusInfo {
  status_id?: number;
  status?: 'pending' | 'approved' | 'rejected';
  estimation_status?: 'pending' | 'approved' | 'rejected';
  pm_status?: 'pending' | 'approved' | 'rejected';
  sender: string;
  receiver: string;
  decision_date: string | null;
  decision_by_user_id: number | null;
  decision_by: string | null;
  rejection_reason: string | null;
  reject_category: 'cost' | 'pm_flag' | null;
  comments: string | null;
  created_at: string | null;
  last_modified_at: string | null;
  last_modified_by: string | null;
}

// Purchase detail from dashboard endpoint
export interface PurchaseDetail {
  status_id: number;
  purchase_id: number;
  project_id: string;
  requested_by: string;
  site_location: string;
  date: string;
  purpose: string;
  file_path?: string;
  materials: Material[];
  material_count: number;
  total_quantity: number;
  total_cost: number;
  status_info: StatusInfo;
  created_at?: string;
  created_by?: string;
  last_modified_at?: string;
  last_modified_by?: string;
}

// Dashboard summary statistics
export interface DashboardSummary {
  total_count: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
  approved_value: number;
  rejected_value: number;
  pending_value: number;
  approved_quantity: number;
  rejected_quantity: number;
  pending_quantity: number;
  rejection_breakdown: {
    cost_rejections: number;
    pm_flag_rejections: number;
    other_rejections: number;
  };
}

// Dashboard response from backend
export interface EstimationDashboardResponse {
  success: boolean;
  estimation_as_sender: DashboardSummary;
  estimation_as_receiver: DashboardSummary;
  summary: {
    total_sender_records: number;
    total_receiver_records: number;
    total_unique_purchases: number;
  };
}

// All purchases response from backend
export interface EstimationPurchasesResponse {
  success: boolean;
  summary: {
    total_count: number;
    approved_count: number;
    rejected_count: number;
    pending_count: number;
    total_value: number;
    approved_value: number;
    rejected_value: number;
    pending_value: number;
    total_quantity: number;
    approved_quantity: number;
    rejected_quantity: number;
    pending_quantity: number;
  };
  purchases: PurchaseDetail[];
  user_info: {
    user_name: string;
    user_id: number;
    role: string;
  };
  last_updated: string;
}

// Approval request/response types
export interface EstimationApprovalRequest {
  purchase_id: number;
  estimation_status: 'approved' | 'rejected';
  rejection_type?: 'cost' | 'pm_flag';
  rejection_reason?: string;
  comments?: string;
}

export interface EstimationApprovalResponse {
  success: boolean;
  message: string;
  purchase_id: number;
  estimation_status: string;
  decision_date: string;
  decision_by: string;
  comments?: string;
  rejection_reason?: string;
  rejection_type?: string;
  email_warning?: string;
}