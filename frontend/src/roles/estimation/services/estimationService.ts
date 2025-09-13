/**
 * Estimation Service Layer
 * Handles all API calls for Estimation functionality
 * Uses centralized API configuration - no hardcoded URLs
 */

import { apiClient, API_ENDPOINTS } from '@/api/config';
import type {
  EstimationApprovalRequest,
  EstimationApprovalResponse,
  EstimationDashboardResponse,
  EstimationPurchasesResponse,
  PurchaseDetail,
  Material
} from '../types';

// Re-export for backward compatibility
export type { 
  EstimationApprovalRequest,
  EstimationApprovalResponse,
  Material as PurchaseMaterial
};

// Extended Purchase type for UI display
export interface Purchase extends PurchaseDetail {
  // These fields might come from different endpoints
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
  procurement_approved_status?: {
    status: string;
    sender: string;
    date: string;
    decision_by_user_id: number;
    comments: string;
  };
  latest_status?: {
    status: string;
    sender?: string;
    receiver?: string;
    date?: string;
    decision_by?: string;
    comments?: string;
  };
  accounts_acknowledgement?: boolean;
}

class EstimationService {
  /**
   * Submit approval for a purchase request
   */
  async submitApproval(
    purchaseId: number, 
    comments: string = ''
  ): Promise<EstimationApprovalResponse> {
    try {
      const request: EstimationApprovalRequest = {
        purchase_id: purchaseId,
        estimation_status: 'approved',
        comments
      };

      const response = await apiClient.post(
        API_ENDPOINTS.ESTIMATION.APPROVAL,
        request
      );

      return response.data;
    } catch (error) {
      console.error('Error submitting estimation approval:', error);
      throw error;
    }
  }

  /**
   * Submit rejection for a purchase request
   */
  async submitRejection(
    purchaseId: number,
    rejectionType: 'cost' | 'pm_flag',
    rejectionReason: string,
    comments: string = ''
  ): Promise<EstimationApprovalResponse> {
    try {
      const request: EstimationApprovalRequest = {
        purchase_id: purchaseId,
        estimation_status: 'rejected',
        rejection_type: rejectionType,
        rejection_reason: rejectionReason,
        comments
      };

      const response = await apiClient.post(
        API_ENDPOINTS.ESTIMATION.APPROVAL,
        request
      );

      return response.data;
    } catch (error) {
      console.error('Error submitting estimation rejection:', error);
      throw error;
    }
  }

  /**
   * Get estimation dashboard data
   * Returns sender/receiver statistics and summaries
   */
  async getEstimationDashboard(): Promise<EstimationDashboardResponse> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ESTIMATION.DASHBOARD);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching estimation dashboard:', error);
      
      // Return default structure if API fails
      if (error.response?.status === 404 || error.response?.status === 500) {
        return {
          success: true,
          estimation_as_sender: this.getDefaultDashboardSummary(),
          estimation_as_receiver: this.getDefaultDashboardSummary(),
          summary: {
            total_sender_records: 0,
            total_receiver_records: 0,
            total_unique_purchases: 0
          }
        };
      }
      throw error;
    }
  }

  /**
   * Get all estimation purchase requests
   * Returns purchases where estimation is the receiver
   */
  async getEstimationPurchases(): Promise<EstimationPurchasesResponse> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ESTIMATION.PURCHASES);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching estimation purchases:', error);
      
      // Return empty response if API fails
      if (error.response?.status === 404 || error.response?.status === 500) {
        return {
          success: true,
          summary: {
            total_count: 0,
            approved_count: 0,
            rejected_count: 0,
            pending_count: 0,
            total_value: 0,
            approved_value: 0,
            rejected_value: 0,
            pending_value: 0,
            total_quantity: 0,
            approved_quantity: 0,
            rejected_quantity: 0,
            pending_quantity: 0
          },
          purchases: [],
          user_info: {
            user_name: '',
            user_id: 0,
            role: 'estimation'
          },
          last_updated: new Date().toISOString()
        };
      }
      throw error;
    }
  }

  /**
   * Get enriched purchase data from estimation endpoint
   * Uses the dedicated estimation purchases endpoint
   */
  async getEnrichedPurchases(limit?: number): Promise<Purchase[]> {
    try {
      const response = await this.getEstimationPurchases();
      
      if (!response.purchases) {
        return [];
      }

      let purchases = response.purchases;
      
      // Apply limit if specified
      if (limit && limit > 0) {
        purchases = purchases.slice(0, limit);
      }
      
      // Return purchases directly - they should already have proper structure from API
      return purchases;
    } catch (error) {
      console.error('Error getting enriched purchases:', error);
      return [];
    }
  }

  /**
   * Calculate total cost from materials
   */
  calculateTotalCost(materials?: Material[]): number {
    if (!materials || materials.length === 0) return 0;
    return materials.reduce((sum, mat) => sum + (mat.total_cost || (mat.unit_cost * mat.quantity) || 0), 0);
  }

  /**
   * Get estimation status from status_info or current_status
   */
  getEstimationStatus(purchase: Purchase): string {
    // First check if we have role_statuses array (most reliable)
    if (purchase.role_statuses && purchase.role_statuses.length > 0) {
      const estimationStatus = purchase.role_statuses.find(s => 
        s.role === 'estimation' || s.role === 'Estimation'
      );
      if (estimationStatus && estimationStatus.status) {
        console.log(`Purchase ${purchase.purchase_id} estimation status from role_statuses:`, estimationStatus.status);
        return estimationStatus.status;
      }
    }
    
    // Check if status_info shows estimation acted (when estimation is sender)
    if (purchase.status_info && 
        (purchase.status_info.sender === 'estimation' || purchase.status_info.sender === 'Estimation')) {
      console.log(`Purchase ${purchase.purchase_id} estimation status from status_info:`, purchase.status_info.status);
      return purchase.status_info.status || 'pending';
    }
    
    // Check if current_status shows estimation has acted
    if (purchase.current_status?.sender === 'estimation' || 
        purchase.current_status?.sender === 'Estimation') {
      console.log(`Purchase ${purchase.purchase_id} estimation status from current_status:`, purchase.current_status.status);
      return purchase.current_status.status;
    }
    
    // Check if the receiver is estimation and status is pending (awaiting estimation review)
    if (purchase.status_info?.receiver === 'estimation' || 
        purchase.status_info?.receiver === 'Estimation') {
      console.log(`Purchase ${purchase.purchase_id} awaiting estimation review`);
      return 'pending';
    }
    
    // Default to pending if no estimation status found
    return 'pending';
  }

  /**
   * Get PM status from status_info or current_status
   */
  getPMStatus(purchase: Purchase): string {
    // Check status_info if sender is projectManager
    if (purchase.status_info && purchase.status_info.sender === 'projectManager') {
      return purchase.status_info.status || 'pending';
    }
    
    // Check current_status
    if (purchase.current_status?.sender === 'projectManager') {
      return purchase.current_status.status;
    }
    
    // Check role_statuses array
    if (purchase.role_statuses) {
      const status = purchase.role_statuses.find(s => s.role === 'projectManager');
      if (status) return status.status;
    }
    
    return 'pending';
  }

  /**
   * Check if purchase needs estimation review
   */
  needsEstimationReview(purchase: Purchase): boolean {
    // First check if estimation has already acted
    const estimationStatus = this.getEstimationStatus(purchase);
    if (estimationStatus === 'approved' || estimationStatus === 'rejected') {
      return false; // Already acted on
    }
    
    // Check if status_info shows estimation as receiver
    if (purchase.status_info) {
      const isReceiver = purchase.status_info.receiver === 'estimation' || 
                        purchase.status_info.receiver === 'Estimation';
      
      // If estimation is the receiver and hasn't acted yet
      if (isReceiver) {
        // Check if PM has approved and sent to estimation
        const pmApproved = (purchase.status_info.sender === 'projectManager' || 
                           purchase.status_info.sender === 'ProjectManager') && 
                          purchase.status_info.status === 'approved';
        
        // Or if it's pending for estimation
        const isPending = purchase.status_info.status === 'pending';
        
        return pmApproved || isPending;
      }
    }
    
    // Fallback: Check PM status to see if approved
    const pmStatus = this.getPMStatus(purchase);
    return pmStatus === 'approved' && estimationStatus === 'pending';
  }

  /**
   * Check if purchase has been resubmitted after estimation rejection
   */
  hasResubmission(purchase: Purchase): boolean {
    // For now, we can't accurately determine resubmission without full history
    // This would need the role_statuses array or additional endpoint
    // Return false to avoid incorrect behavior
    return false;
  }

  /**
   * Get procurement status from status_info
   */
  getProcurementStatus(purchase: Purchase): string {
    // Check if status_info shows procurement as sender
    if (purchase.status_info && purchase.status_info.sender === 'procurement') {
      return purchase.status_info.status || 'pending';
    }
    
    // Check procurement_approved_status
    if (purchase.procurement_approved_status) {
      return purchase.procurement_approved_status.status;
    }
    
    // Check role_statuses array
    if (purchase.role_statuses) {
      const status = purchase.role_statuses.find(s => s.role === 'procurement');
      if (status) return status.status;
    }
    
    return 'pending';
  }

  /**
   * Get current workflow status with role context
   */
  getCurrentWorkflowStatus(purchase: Purchase): { status: string; role: string; label: string } {
    // Check if purchase is completed first - accounts acknowledged means workflow is complete
    if (purchase.latest_status?.status === 'completed' || 
        purchase.latest_status?.status === 'complete' ||
        purchase.accounts_acknowledgement === true ||
        purchase.status_info?.accounts_acknowledgement === true ||
        (purchase.status_info?.receiver === 'accounts' && purchase.status_info?.accounts_status === 'acknowledged') ||
        (purchase.status_info?.sender === 'accounts' && purchase.status_info?.accounts_status === 'acknowledged') ||
        (purchase.status_info?.td_status === 'approved' && purchase.status_info?.receiver === 'accounts' && purchase.status_info?.accounts_status === 'approved') ||
        (purchase.status_info?.sender === 'accounts' && purchase.status_info?.status === 'approved')) {
      return { status: 'completed', role: 'accounts', label: 'Completed' };
    }

    // Map sender roles to display names
    const roleMapping: { [key: string]: string } = {
      'projectManager': 'PM',
      'ProjectManager': 'PM',
      'estimation': 'Estimation',
      'Estimation': 'Estimation', 
      'technicalDirector': 'TD',
      'TechnicalDirector': 'TD',
      'accounts': 'Accounts',
      'Accounts': 'Accounts',
      'procurement': 'Procurement',
      'Procurement': 'Procurement',
      'design': 'Design',
      'Design': 'Design',
      'siteSupervisor': 'Site Supervisor',
      'SiteSupervisor': 'Site Supervisor'
    };

    // Check the current active status from status_info (most recent action)
    if (purchase.status_info) {
      const { pm_status, estimation_status, td_status, accounts_status, sender, receiver } = purchase.status_info;
      
      const senderLabel = roleMapping[sender] || sender;
      const receiverLabel = roleMapping[receiver] || receiver;

      // Determine the current status based on the workflow state
      // Check each role's status in workflow order
      
      // If TD has approved and sent to accounts
      if (td_status === 'approved' && receiver === 'accounts') {
        return { 
          status: 'pending', 
          role: 'accounts', 
          label: 'TD Approved - Pending Accounts' 
        };
      }
      
      // If TD has rejected
      if (td_status === 'rejected' && sender === 'technicalDirector') {
        return { 
          status: 'rejected', 
          role: 'technicalDirector', 
          label: 'TD Rejected' 
        };
      }
      
      // If estimation has approved and sent to TD
      if (estimation_status === 'approved' && receiver === 'technicalDirector') {
        return { 
          status: 'pending', 
          role: 'technicalDirector', 
          label: 'Estimation Approved - Pending TD' 
        };
      }
      
      // If estimation has rejected
      if (estimation_status === 'rejected' && sender === 'estimation') {
        return { 
          status: 'rejected', 
          role: 'estimation', 
          label: 'Estimation Rejected' 
        };
      }
      
      // If PM has approved and sent to estimation
      if (pm_status === 'approved' && receiver === 'estimation') {
        return { 
          status: 'pending', 
          role: 'estimation', 
          label: 'PM Approved - Pending Estimation' 
        };
      }
      
      // If PM has rejected
      if (pm_status === 'rejected' && sender === 'projectManager') {
        return { 
          status: 'rejected', 
          role: 'projectManager', 
          label: 'PM Rejected' 
        };
      }
      
      // If waiting for PM approval
      if (receiver === 'projectManager' && pm_status === 'pending') {
        return { 
          status: 'pending', 
          role: 'projectManager', 
          label: 'Pending PM Approval' 
        };
      }

      // Generic handling based on sender and receiver
      if (sender && receiver) {
        // Determine the overall status
        const overallStatus = purchase.status_info.status || 'pending';
        
        if (overallStatus === 'approved' && receiver && receiver !== 'null' && receiver !== '') {
          return { 
            status: 'pending', 
            role: receiver, 
            label: `${senderLabel} Approved - Pending ${receiverLabel}` 
          };
        } else if (overallStatus === 'rejected') {
          return { 
            status: 'rejected', 
            role: sender, 
            label: `${senderLabel} Rejected` 
          };
        } else if (overallStatus === 'approved') {
          return { 
            status: 'approved', 
            role: sender, 
            label: `${senderLabel} Approved` 
          };
        } else {
          return { 
            status: 'pending', 
            role: receiver, 
            label: `Pending ${receiverLabel}` 
          };
        }
      }
    }

    // Fallback to latest_status if available
    if (purchase.latest_status) {
      const statusLabel = purchase.latest_status.status.charAt(0).toUpperCase() + 
                         purchase.latest_status.status.slice(1);
      return { 
        status: purchase.latest_status.status, 
        role: 'system', 
        label: statusLabel
      };
    }

    // If we have minimal info but know it's pending somewhere
    if (purchase.status_info?.receiver) {
      const receiverLabel = roleMapping[purchase.status_info.receiver] || purchase.status_info.receiver;
      return { 
        status: 'pending', 
        role: purchase.status_info.receiver, 
        label: `Pending ${receiverLabel}` 
      };
    }

    // Default fallback - show as pending if we have no status info
    return { status: 'pending', role: 'procurement', label: 'In Progress' };
  }

  /**
   * Helper method to get default dashboard summary
   */
  private getDefaultDashboardSummary() {
    return {
      total_count: 0,
      approved_count: 0,
      rejected_count: 0,
      pending_count: 0,
      approved_value: 0,
      rejected_value: 0,
      pending_value: 0,
      approved_quantity: 0,
      rejected_quantity: 0,
      pending_quantity: 0,
      rejection_breakdown: {
        cost_rejections: 0,
        pm_flag_rejections: 0,
        other_rejections: 0
      }
    };
  }

  /**
   * Get purchase details
   * Used for the Purchase Details Modal
   */
  async getPurchaseDetails(purchaseId: number): Promise<any> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ESTIMATION.PURCHASE_DETAILS(purchaseId));
      return response.data;
    } catch (error: any) {
      console.error('Error fetching purchase details:', error);
      throw error;
    }
  }

  /**
   * Get purchase history
   * Used for the Purchase History Modal
   */
  async getPurchaseHistory(purchaseId: number): Promise<any> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ESTIMATION.PURCHASE_HISTORY(purchaseId));
      return response.data;
    } catch (error: any) {
      console.error('Error fetching purchase history:', error);
      throw error;
    }
  }

  /**
   * Get detailed purchase status information
   * @deprecated Use getPurchaseDetails or getPurchaseHistory instead
   */
  async getPurchaseStatusDetails(purchaseId: number): Promise<PurchaseStatusDetails> {
    try {
      // Now using the purchase details endpoint
      const response = await apiClient.get(API_ENDPOINTS.ESTIMATION.PURCHASE_DETAILS(purchaseId));
      return response.data;
    } catch (error: any) {
      console.error('Error fetching purchase status details:', error);
      throw error;
    }
  }
}

// Export types for PurchaseDetailsModal
export interface PurchaseStatusDetails {
  purchase_id?: number;
  purchase_details: {
    purchase_id?: number;
    site_location: string;
    purpose: string;
    created_at: string;
    date?: string;
    requested_by?: string;
    created_by?: string;
    last_modified_at?: string;
    last_modified_by?: string;
    project_id?: number;
    email_sent?: boolean;
    file_path?: string | null;
    materials_summary: {
      total_materials: number;
      total_quantity: number;
      total_cost: number;
      categories: string[];
      materials?: Array<{
        material_id?: number;
        description: string;
        specification?: string;
        category: string;
        priority?: string;
        quantity: number;
        unit: string;
        cost: number;
        design_reference?: string;
      }>;
    };
  };
  procurement_statuses: Array<{
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
  project_manager_statuses: Array<{
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
  latest_pm_proc_status: {
    status: string;
    sender?: string;
    receiver?: string;
    role?: string;
    comments?: string;
    rejection_reason?: string;
    reject_category?: string;
  };
  summary: {
    total_procurement_statuses: number;
    total_pm_statuses: number;
    total_estimation_statuses?: number;
    total_technical_director_statuses?: number;
    total_accounts_statuses?: number;
    pm_approved_count: number;
  };
}

// Export singleton instance
export const estimationService = new EstimationService();