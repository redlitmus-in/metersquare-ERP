/**
 * Accounts Service Layer
 * Handles all API calls for Accounts functionality
 * Uses centralized API configuration - no hardcoded URLs
 */

import { apiClient, API_ENDPOINTS } from '@/api/config';
import type {
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
  PaginatedPaymentTransactionsResponse,
  PaginatedAcknowledgementsResponse,
  Purchase
} from '../types';

class AccountsService {
  /**
   * Process payment transaction for approved purchases
   */
  async processPaymentTransaction(request: ProcessPaymentRequest): Promise<ProcessPaymentResponse> {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.ACCOUNTS.PROCESS_PAYMENT,
        request
      );
      return response.data;
    } catch (error) {
      console.error('Error processing payment transaction:', error);
      throw error;
    }
  }

  /**
   * Approve or reject payment transaction
   */
  async approvePaymentTransaction(request: ApprovePaymentRequest): Promise<ApprovePaymentResponse> {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.ACCOUNTS.APPROVE_PAYMENT,
        request
      );
      return response.data;
    } catch (error) {
      console.error('Error approving payment transaction:', error);
      throw error;
    }
  }

  /**
   * Create acknowledgement for payment received/processed
   */
  async createAcknowledgement(request: CreateAcknowledgementRequest): Promise<CreateAcknowledgementResponse> {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.ACCOUNTS.CREATE_ACKNOWLEDGEMENT,
        request
      );
      return response.data;
    } catch (error) {
      console.error('Error creating acknowledgement:', error);
      throw error;
    }
  }

  /**
   * Get payment transactions with filtering and pagination
   */
  async getPaymentTransactions(params?: {
    page?: number;
    per_page?: number;
    status?: string;
    purchase_id?: number;
    project_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<PaginatedPaymentTransactionsResponse> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ACCOUNTS.GET_PAYMENTS, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching payment transactions:', error);
      throw error;
    }
  }

  /**
   * Get acknowledgements with filtering and pagination
   */
  async getAcknowledgements(params?: {
    page?: number;
    per_page?: number;
    purchase_id?: number;
    transaction_id?: number;
    acknowledgement_type?: string;
  }): Promise<PaginatedAcknowledgementsResponse> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ACCOUNTS.GET_ACKNOWLEDGEMENTS, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching acknowledgements:', error);
      throw error;
    }
  }

  /**
   * Get financial summary and analytics for accounts dashboard
   */
  async getFinancialSummary(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<FinancialSummaryResponse> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ACCOUNTS.FINANCIAL_SUMMARY, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching financial summary:', error);
      throw error;
    }
  }

  /**
   * Get pending payment transactions that need approval
   */
  async getPendingApprovals(): Promise<PendingApprovalsResponse> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ACCOUNTS.PENDING_APPROVALS);
      return response.data;
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      throw error;
    }
  }

  /**
   * Get accounts dashboard data
   */
  async getAccountsDashboard(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<AccountsDashboardResponse> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ACCOUNTS.DASHBOARD, { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching accounts dashboard:', error);
      
      // Return empty response if API fails
      if (error.response?.status === 404 || error.response?.status === 500) {
        return {
          accounts_as_sender: {
            total_sent: 0,
            approved: 0,
            rejected: 0,
            pending: 0,
            approval_rate: 0
          },
          accounts_as_receiver: {
            total_received: 0,
            approved: 0,
            rejected: 0,
            pending: 0,
            approval_rate: 0
          }
        };
      }
      throw error;
    }
  }

  /**
   * Get all purchases where accounts is the receiver
   */
  async getAccountsPurchases(): Promise<AccountsPurchasesResponse> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ACCOUNTS.GET_PURCHASES);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching accounts purchases:', error);
      
      // Return empty response if API fails
      if (error.response?.status === 404 || error.response?.status === 500) {
        return {
          success: true,
          message: 'No purchases found',
          purchase_details: []
        };
      }
      throw error;
    }
  }

  /**
   * Get purchase details for modal display
   */
  async getPurchaseDetails(purchaseId: number): Promise<any> {
    try {
      // Use the purchase/{id} endpoint as specified
      const response = await apiClient.get(`/purchase/${purchaseId}`);
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
   * Get purchase history for modal display
   */
  async getPurchaseHistory(purchaseId: number): Promise<any> {
    try {
      // Use the purchase_history/{id} endpoint as specified
      const response = await apiClient.get(`/purchase_history/${purchaseId}`);
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
   * Get accounts status from purchase object
   */
  getAccountsStatus(purchase: Purchase): string {
    // Direct check for accounts_status field
    if (purchase.accounts_status) {
      return purchase.accounts_status;
    }
    
    // Check status_info if accounts is sender/receiver
    if (purchase.latest_status) {
      const isAccountsSender = purchase.latest_status.sender === 'accounts';
      const isAccountsReceiver = purchase.latest_status.receiver === 'accounts';
      
      if (isAccountsSender) {
        return purchase.latest_status.status || 'pending';
      }
      
      if (isAccountsReceiver && purchase.latest_status.status === 'pending') {
        return 'pending';
      }
    }
    
    // Default to pending if no status found
    return 'pending';
  }

  /**
   * Check if purchase needs accounts processing
   */
  needsAccountsProcessing(purchase: Purchase): boolean {
    // Check if accounts has already acted
    const accountsStatus = purchase.accounts_status;
    if (accountsStatus === 'payment_processed' || accountsStatus === 'payment_rejected') {
      return false;
    }
    
    // Check if technical director has approved (accounts is next in workflow)
    const tdStatus = purchase.technical_director_status;
    return tdStatus === 'approved' && (!accountsStatus || accountsStatus === 'pending');
  }

  /**
   * Check if purchase has payment pending approval
   */
  hasPaymentPendingApproval(purchase: Purchase): boolean {
    const accountsStatus = purchase.accounts_status;
    return accountsStatus === 'payment_processing';
  }

  /**
   * Format currency value in AED
   */
  formatCurrency(amount: number): string {
    return `AED ${amount.toLocaleString()}`;
  }

  /**
   * Get payment method display name
   */
  getPaymentMethodDisplayName(method: string): string {
    const methodMap: { [key: string]: string } = {
      bank_transfer: 'Bank Transfer',
      check: 'Check',
      cash: 'Cash',
      credit_card: 'Credit Card',
      online_payment: 'Online Payment'
    };
    return methodMap[method] || method;
  }

  /**
   * Get transaction status color for UI
   */
  getTransactionStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'processed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  }
}

// Export singleton instance
export const accountsService = new AccountsService();