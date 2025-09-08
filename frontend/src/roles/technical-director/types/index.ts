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
  design_reference?: string;
}

// Purchase interface - Main purchase data structure
export interface Purchase {
  purchase_id: number;
  project_id: number;
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
  
  // Workflow status fields
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
  
  // Status info for workflow tracking
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
  purchases: Purchase[];
  user_info: {
    user_name: string;
    user_id: number;
    role: string;
  };
  last_updated: string;
}

// Re-export Purchase as PurchaseDetail for backward compatibility
export type PurchaseDetail = Purchase;