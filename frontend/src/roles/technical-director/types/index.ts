/**
 * Technical Director Role Types
 * TypeScript interfaces for Technical Director workflow
 */

// Material interface matching backend response
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
  design_reference: string;
}

// Purchase detail interface
export interface PurchaseDetail {
  purchase_id: number;
  project_id: number; // Changed from string to number to match API
  requested_by: string;
  site_location: string;
  date: string;
  purpose: string;
  file_path?: string;
  materials: Material[];
  material_count: number;
  total_quantity: number;
  total_cost: number;
  created_at?: string;
  created_by?: string;
  last_modified_at?: string;
  last_modified_by?: string;
  
  // Additional fields from actual API response
  current_workflow_status?: string;
  estimation_status?: string;
  estimation_comments?: string;
  estimation_decision_by?: string;
  estimation_status_date?: string;
  technical_director_status?: string;
  technical_director_comments?: string;
  technical_director_decision_by?: string;
  technical_director_status_date?: string;
  technical_director_rejection_reason?: string;
  latest_status?: {
    status: string;
    sender: string;
    receiver: string;
    date: string;
    decision_by: string;
    comments: string;
  };
  
  status_info?: {
    status_id?: number;
    status: string;
    sender: string;
    receiver: string;
    decision_date?: string;
    decision_by_user_id?: number;
    decision_by?: string;
    rejection_reason?: string;
    reject_category?: string;
    comments?: string;
    created_at?: string;
    last_modified_at?: string;
    last_modified_by?: string;
  };
}

// Technical Director approval request
export interface TechnicalDirectorApprovalRequest {
  purchase_id: number;
  technical_director_status: 'approved' | 'rejected';
  rejection_reason?: string;
  comments?: string;
}

// Technical Director approval response
export interface TechnicalDirectorApprovalResponse {
  success: boolean;
  message: string;
  purchase_id: number;
  technical_director_status: string;
  decision_date: string;
  decision_by: string;
  comments?: string;
  rejection_reason?: string;
  email_warning?: string;
}

// Dashboard summary interface
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
}

// Technical Director dashboard response
export interface TechnicalDirectorDashboardResponse {
  success: boolean;
  technical_director_as_sender: DashboardSummary;
  technical_director_as_receiver: DashboardSummary;
  summary: {
    total_sender_records: number;
    total_receiver_records: number;
    total_unique_purchases: number;
  };
}

// Technical Director purchases response
export interface TechnicalDirectorPurchasesResponse {
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

// Extended Purchase type for UI display
export interface Purchase extends PurchaseDetail {
  role_statuses?: Array<{
    role: string;
    status: string;
    decision_date?: string;
    decision_by?: string;
    rejection_reason?: string;
    comments?: string;
  }>;
  material_ids?: number[];
  materials_summary?: {
    total_materials: number;
    total_quantity: number;
    total_cost: number;
    categories: string[];
  };
  current_status?: {
    status: string;
    sender: string;
    date: string;
    decision_by_user_id: number;
    comments: string;
  };
}

// Purchase status details for modal
export interface PurchaseStatusDetails {
  purchase_details: {
    purchase_id: number;
    site_location: string;
    purpose: string;
    created_at: string;
    materials_summary: {
      total_materials: number;
      total_quantity: number;
      total_cost: number;
      categories: string[];
      materials?: Array<{
        material_id?: number;
        description: string;
        category: string;
        priority: string;
        quantity: number;
        unit: string;
        cost: number;
      }>;
    };
  };
  estimation_statuses?: Array<{
    role: string;
    status: string;
    date: string;
    decision_by?: {
      full_name: string;
    };
    comments?: string;
    rejection_reason?: string;
    reject_category?: string;
  }>;
  technical_director_statuses?: Array<{
    role: string;
    status: string;
    date: string;
    decision_by?: {
      full_name: string;
    };
    comments?: string;
    rejection_reason?: string;
    reject_category?: string;
  }>;
  accounts_statuses?: Array<{
    role: string;
    status: string;
    date: string;
    decision_by?: {
      full_name: string;
    };
    comments?: string;
    rejection_reason?: string;
    reject_category?: string;
  }>;
  latest_status: {
    status: string;
  };
  summary: {
    total_estimation_statuses?: number;
    total_technical_director_statuses?: number;
    total_accounts_statuses?: number;
  };
}