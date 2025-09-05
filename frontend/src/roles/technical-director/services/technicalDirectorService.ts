/**
 * Technical Director Service Layer
 * Handles all API calls for Technical Director functionality
 * Uses centralized API configuration - no hardcoded URLs
 */

import { apiClient, API_ENDPOINTS } from '@/api/config';
import type {
  TechnicalDirectorApprovalRequest,
  TechnicalDirectorApprovalResponse,
  TechnicalDirectorDashboardResponse,
  TechnicalDirectorPurchasesResponse,
  PurchaseDetail,
  Material,
  Purchase,
  PurchaseStatusDetails
} from '../types';

class TechnicalDirectorService {
  /**
   * Submit approval for a purchase request
   */
  async submitApproval(
    purchaseId: number, 
    comments: string = ''
  ): Promise<TechnicalDirectorApprovalResponse> {
    try {
      const request: TechnicalDirectorApprovalRequest = {
        purchase_id: purchaseId,
        technical_director_status: 'approved',
        comments
      };

      const response = await apiClient.post(
        API_ENDPOINTS.TECHNICAL_DIRECTOR.APPROVAL,
        request
      );

      return response.data;
    } catch (error) {
      console.error('Error submitting technical director approval:', error);
      throw error;
    }
  }

  /**
   * Submit rejection for a purchase request
   */
  async submitRejection(
    purchaseId: number,
    rejectionReason: string,
    comments: string = ''
  ): Promise<TechnicalDirectorApprovalResponse> {
    try {
      const request: TechnicalDirectorApprovalRequest = {
        purchase_id: purchaseId,
        technical_director_status: 'rejected',
        rejection_reason: rejectionReason,
        comments
      };

      const response = await apiClient.post(
        API_ENDPOINTS.TECHNICAL_DIRECTOR.APPROVAL,
        request
      );

      return response.data;
    } catch (error) {
      console.error('Error submitting technical director rejection:', error);
      throw error;
    }
  }

  /**
   * Get technical director dashboard data
   * Returns sender/receiver statistics and summaries
   */
  async getTechnicalDirectorDashboard(): Promise<TechnicalDirectorDashboardResponse> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.TECHNICAL_DIRECTOR.DASHBOARD);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching technical director dashboard:', error);
      
      // Return default structure if API fails
      if (error.response?.status === 404 || error.response?.status === 500) {
        return {
          success: true,
          technical_director_as_sender: this.getDefaultDashboardSummary(),
          technical_director_as_receiver: this.getDefaultDashboardSummary(),
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
   * Get all technical director purchase requests
   * Returns purchases where technical director is the receiver
   */
  async getTechnicalDirectorPurchases(): Promise<TechnicalDirectorPurchasesResponse> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.TECHNICAL_DIRECTOR.PURCHASES);
      const data = response.data;
      
      // Calculate summary from purchases if not provided by API
      if (!data.summary && data.purchases) {
        const purchases = data.purchases || [];
        const summary = {
          total_count: purchases.length,
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
        };
        
        purchases.forEach((purchase: any) => {
          const totalCost = purchase.total_cost || 0;
          const totalQuantity = purchase.total_quantity || 0;
          
          summary.total_value += totalCost;
          summary.total_quantity += totalQuantity;
          
          // Check technical director status
          const tdStatus = purchase.technical_director_status;
          
          if (tdStatus === 'approved') {
            summary.approved_count++;
            summary.approved_value += totalCost;
            summary.approved_quantity += totalQuantity;
          } else if (tdStatus === 'rejected') {
            summary.rejected_count++;
            summary.rejected_value += totalCost;
            summary.rejected_quantity += totalQuantity;
          } else if (tdStatus === 'pending' || !tdStatus) {
            // Check if it's pending for TD
            if (purchase.current_workflow_status === 'pending_technical_director' || 
                (purchase.estimation_status === 'approved' && !tdStatus)) {
              summary.pending_count++;
              summary.pending_value += totalCost;
              summary.pending_quantity += totalQuantity;
            }
          }
        });
        
        data.summary = summary;
      }
      
      return data;
    } catch (error: any) {
      console.error('Error fetching technical director purchases:', error);
      
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
            role: 'technicalDirector'
          },
          last_updated: new Date().toISOString()
        };
      }
      throw error;
    }
  }

  /**
   * Get enriched purchase data from technical director endpoint
   * Uses the dedicated technical director purchases endpoint
   */
  async getEnrichedPurchases(limit?: number): Promise<Purchase[]> {
    try {
      const response = await this.getTechnicalDirectorPurchases();
      
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
   * Get technical director status from status_info or current_status
   */
  getTechnicalDirectorStatus(purchase: Purchase): string {
    // Direct check for technical_director_status field
    if ('technical_director_status' in purchase) {
      const status = (purchase as any).technical_director_status;
      if (status) {
        return status;
      }
    }
    
    // Check current_workflow_status
    if ('current_workflow_status' in purchase) {
      const workflowStatus = (purchase as any).current_workflow_status;
      if (workflowStatus === 'pending_technical_director') {
        return 'pending';
      } else if (workflowStatus === 'technical_director_approved') {
        return 'approved';
      } else if (workflowStatus === 'technical_director_rejected') {
        return 'rejected';
      }
    }
    
    // Check latest_status if available
    if ('latest_status' in purchase) {
      const latest = (purchase as any).latest_status;
      if (latest && (latest.sender === 'technicalDirector' || latest.decision_by?.includes('Technical Director'))) {
        return latest.status === 'approved' ? 'approved' : 
               latest.status === 'rejected' ? 'rejected' : 'pending';
      }
    }
    
    // First check if we have role_statuses array (most reliable)
    if (purchase.role_statuses && purchase.role_statuses.length > 0) {
      const tdStatus = purchase.role_statuses.find(s => 
        s.role === 'technicalDirector' || s.role === 'Technical Director'
      );
      if (tdStatus && tdStatus.status) {
        return tdStatus.status;
      }
    }
    
    // Check if status_info shows technical director acted (when TD is sender)
    if (purchase.status_info && 
        (purchase.status_info.sender === 'technicalDirector' || purchase.status_info.sender === 'Technical Director')) {
      return purchase.status_info.status;
    }
    
    // Check if current_status shows technical director has acted
    if (purchase.current_status?.sender === 'technicalDirector' || 
        purchase.current_status?.sender === 'Technical Director') {
      return purchase.current_status.status;
    }
    
    // Check if the receiver is technical director and status is pending (awaiting TD review)
    if (purchase.status_info?.receiver === 'technicalDirector' || 
        purchase.status_info?.receiver === 'Technical Director') {
      return 'pending';
    }
    
    // Default to pending if no technical director status found
    return 'pending';
  }

  /**
   * Check if purchase needs technical director review
   */
  needsTechnicalDirectorReview(purchase: Purchase): boolean {
    // Check current_workflow_status first (most reliable)
    if ('current_workflow_status' in purchase) {
      const workflowStatus = (purchase as any).current_workflow_status;
      return workflowStatus === 'pending_technical_director';
    }
    
    // Check technical_director_status field
    if ('technical_director_status' in purchase) {
      const tdStatus = (purchase as any).technical_director_status;
      const estimationStatus = (purchase as any).estimation_status;
      
      // If TD status is pending and estimation has approved, needs TD review
      return tdStatus === 'pending' && estimationStatus === 'approved';
    }
    
    // First check if technical director has already acted
    const tdStatus = this.getTechnicalDirectorStatus(purchase);
    if (tdStatus === 'approved' || tdStatus === 'rejected') {
      return false; // Already acted on
    }
    
    // Check if status_info shows technical director as receiver
    if (purchase.status_info) {
      const isReceiver = purchase.status_info.receiver === 'technicalDirector' || 
                        purchase.status_info.receiver === 'Technical Director';
      
      // If technical director is the receiver and hasn't acted yet
      if (isReceiver) {
        // Check if estimation has approved and sent to technical director
        const estimationApproved = (purchase.status_info.sender === 'estimation' || 
                                   purchase.status_info.sender === 'Estimation') && 
                                  purchase.status_info.status === 'approved';
        
        // Or if it's pending for technical director
        const isPending = purchase.status_info.status === 'pending';
        
        return estimationApproved || isPending;
      }
    }
    
    // Check if estimation has approved (requires TD review next)
    const estimationStatus = this.getEstimationStatus(purchase);
    return estimationStatus === 'approved' && tdStatus === 'pending';
  }

  /**
   * Get estimation status from status_info or current_status
   */
  getEstimationStatus(purchase: Purchase): string {
    // Check role_statuses array first
    if (purchase.role_statuses && purchase.role_statuses.length > 0) {
      const estimationStatus = purchase.role_statuses.find(s => 
        s.role === 'estimation' || s.role === 'Estimation'
      );
      if (estimationStatus && estimationStatus.status) {
        return estimationStatus.status;
      }
    }

    // Check if status_info shows estimation acted (when estimation is sender)
    if (purchase.status_info && 
        (purchase.status_info.sender === 'estimation' || purchase.status_info.sender === 'Estimation')) {
      return purchase.status_info.status;
    }
    
    // Check current_status
    if (purchase.current_status?.sender === 'estimation' || 
        purchase.current_status?.sender === 'Estimation') {
      return purchase.current_status.status;
    }
    
    return 'pending';
  }

  /**
   * Get detailed purchase status information
   * Used for the Purchase Details Modal
   */
  async getPurchaseStatusDetails(purchaseId: number): Promise<PurchaseStatusDetails> {
    try {
      // Use the PROJECT_MANAGER.PURCHASE_STATUS endpoint which provides detailed status info
      const response = await apiClient.get(API_ENDPOINTS.PROJECT_MANAGER.PURCHASE_STATUS(purchaseId));
      return response.data;
    } catch (error: any) {
      console.error('Error fetching purchase status details:', error);
      throw error;
    }
  }

  /**
   * Format currency value in AED
   */
  formatCurrency(amount: number): string {
    return `AED ${amount.toLocaleString()}`;
  }

  /**
   * Get priority badge color
   */
  getPriorityBadgeColor(priority: string): string {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  /**
   * Get status badge color
   */
  getStatusBadgeColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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
      pending_quantity: 0
    };
  }
}

// Export singleton instance
export const technicalDirectorService = new TechnicalDirectorService();