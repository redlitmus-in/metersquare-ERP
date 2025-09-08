/**
 * Technical Director Service Layer
 * Handles all API calls for Technical Director functionality
 * Uses centralized API configuration - no hardcoded URLs
 */

import { apiClient, API_ENDPOINTS } from '@/api/config';
import type {
  TechnicalDirectorApprovalRequest,
  TechnicalDirectorApprovalResponse,
  TechnicalDirectorPurchasesResponse,
  Purchase
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
   * Get all technical director purchase requests
   * Returns purchases where technical director is the receiver
   */
  async getTechnicalDirectorPurchases(): Promise<TechnicalDirectorPurchasesResponse> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.TECHNICAL_DIRECTOR.PURCHASES);
      return response.data;
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
   * Get purchase details
   * Used for the Purchase Details Modal
   */
  async getPurchaseDetails(purchaseId: number): Promise<any> {
    try {
      // Use Technical Director specific endpoint
      const response = await apiClient.get(API_ENDPOINTS.TECHNICAL_DIRECTOR.PURCHASE_DETAILS(purchaseId));
      return response.data;
    } catch (error: any) {
      console.error('Error fetching purchase details:', error);
      
      // Return fallback data structure if API fails
      if (error.response?.status === 404) {
        return {
          success: false,
          message: 'Purchase details not found',
          purchase: null,
          materials: [],
          history: []
        };
      }
      
      if (error.response?.status === 403) {
        return {
          success: false,
          message: 'You do not have permission to view this purchase',
          purchase: null,
          materials: [],
          history: []
        };
      }
      
      throw error;
    }
  }

  /**
   * Get purchase history
   * Used for the Purchase History Modal
   */
  async getPurchaseHistory(purchaseId: number): Promise<any> {
    try {
      // Use Technical Director specific endpoint
      const response = await apiClient.get(API_ENDPOINTS.TECHNICAL_DIRECTOR.PURCHASE_HISTORY(purchaseId));
      return response.data;
    } catch (error: any) {
      console.error('Error fetching purchase history:', error);
      
      // Return fallback data structure if API fails
      if (error.response?.status === 404) {
        return {
          success: false,
          message: 'Purchase history not found',
          purchase: null,
          history: []
        };
      }
      
      if (error.response?.status === 403) {
        return {
          success: false,
          message: 'You do not have permission to view purchase history',
          purchase: null,
          history: []
        };
      }
      
      throw error;
    }
  }

  /**
   * Get technical director status from purchase object
   * Simplified logic checking direct fields first
   */
  getTechnicalDirectorStatus(purchase: Purchase): string {
    // Direct check for technical_director_status field (most reliable)
    if (purchase.technical_director_status) {
      return purchase.technical_director_status;
    }
    
    // Check status_info if TD is sender/receiver
    if (purchase.status_info) {
      const isTDSender = purchase.status_info.sender === 'technicalDirector';
      const isTDReceiver = purchase.status_info.receiver === 'technicalDirector';
      
      if (isTDSender) {
        return purchase.status_info.status || 'pending';
      }
      
      if (isTDReceiver && purchase.status_info.status === 'pending') {
        return 'pending';
      }
    }
    
    // Default to pending if no status found
    return 'pending';
  }

  /**
   * Check if purchase needs technical director review
   * Simplified logic based on workflow status
   */
  needsTechnicalDirectorReview(purchase: Purchase): boolean {
    // Check if TD has already acted
    const tdStatus = purchase.technical_director_status;
    if (tdStatus === 'approved' || tdStatus === 'rejected') {
      return false;
    }
    
    // Check if estimation has approved (TD is next in workflow)
    const estimationStatus = purchase.estimation_status;
    return estimationStatus === 'approved' && (!tdStatus || tdStatus === 'pending');
  }

  /**
   * Format currency value in AED
   */
  formatCurrency(amount: number): string {
    return `AED ${amount.toLocaleString()}`;
  }
}

// Export singleton instance
export const technicalDirectorService = new TechnicalDirectorService();