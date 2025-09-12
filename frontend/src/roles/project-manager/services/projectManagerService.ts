/**
 * Project Manager API Service
 * Handles all API calls for Project Manager functionality
 */

import { apiClient } from '@/api/config';
import { requestDeduplicator } from '@/utils/requestDeduplication';

export interface PurchaseApproval {
  purchase_id: number;
  purchase_status: 'approved' | 'rejected';
  rejection_reason?: string;
  comments?: string;
}

export interface ProcurementPurchase {
  purchase_id: number;
  site_location: string;
  purpose: string;
  date: string;
  email_sent: boolean;
  created_at: string;
  current_workflow_status: string;
  pm_status: 'pending' | 'approved' | 'rejected' | null;
  pm_status_date: string | null;
  pm_comments: string | null;
  pm_rejection_reason: string | null;
  procurement_status: string;
  procurement_status_date: string;
  procurement_comments: string;
  materials_summary: {
    total_materials: number;
    total_quantity: number;
    total_cost: number;
    categories: string[];
  };
  status_history: Array<{
    status_id: number;
    status: string;
    sender: string;
    receiver: string;
    date: string;
    decision_date: string;
    decision_by: string;
    decision_by_user_id: number;
    rejection_reason: string | null;
    reject_category: string | null;
    comments: string;
  }>;
  // Additional fields for workflow tracking
  approvals?: Array<{
    reviewer_role: string;
    status: string;
    comments?: string;
    rejection_reason?: string;
  }>;
  status_role?: string;
  status_sender?: string;
  sender_latest_status?: string;
  status_receiver?: string;
  estimation_rejection_reason?: string;
  // For estimation rejected purchases
  rejected_status?: {
    status: string;
    sender: string;
    receiver: string;
    created_at: string;
    created_by: string;
    decision_date: string;
    reject_category: string;
    rejection_reason: string | null;
    comments: string;
    status_id: number;
  };
  // Latest status tracking
  latest_status?: {
    status: string;
    sender?: string;
    receiver?: string;
    date?: string;
  };
  latest_status_date?: string;
  // Accounts acknowledgement
  accounts_acknowledgement?: boolean;
}

export interface PurchaseStatusDetails {
  purchase_id: number;
  purchase_details: {
    site_location: string;
    purpose: string;
    date: string;
    email_sent: boolean;
    created_at: string;
    requested_by?: string;
    project_id?: number;
    file_path?: string | null;
    materials_summary: {
      total_materials: number;
      total_quantity: number;
      total_cost: number;
      categories: string[];
      materials: Array<{
        material_id: number;
        description: string;
        specification?: string;
        quantity: number;
        unit: string;
        cost: number;
        category: string;
        priority?: string;
        design_reference?: string;
      }>;
    };
  };
  project_manager_statuses: Array<{
    status: string;
    role: string;
    date: string;
    decision_by: {
      user_id: number;
      full_name: string;
      email: string;
    } | null;
    rejection_reason: string | null;
    comments: string | null;
    reject_category: string | null;
  }>;
  procurement_statuses: Array<{
    status: string;
    role: string;
    date: string;
    decision_by: {
      user_id: number;
      full_name: string;
      email: string;
    } | null;
    rejection_reason: string | null;
    comments: string | null;
    reject_category: string | null;
  }>;
  latest_pm_proc_status: {
    status: string;
    role: string | null;
    date: string | null;
    decision_date?: string | null;
    sender?: string;
    receiver?: string;
    decision_by?: string | {
      user_id: number;
      full_name: string;
      email: string;
    } | null;
    created_by?: string | null;
    comments: string | null;
    rejection_reason?: string | null;
    reject_category?: string | null;
    status_id?: number | null;
    is_active?: boolean;
    created_at?: string | null;
    last_modified_at?: string | null;
    decision_by_user_id?: number | null;
  };
  summary: {
    total_pm_statuses: number;
    total_procurement_statuses: number;
    pm_approved_count: number;
    pm_rejected_count: number;
    pm_pending_count: number;
    procurement_approved_count: number;
    procurement_rejected_count: number;
    procurement_pending_count: number;
  };
}

export interface PMDashboardData {
  totalPurchases: number;
  pendingApprovals: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  averageApprovalTime: number;
  recentPurchases: ProcurementPurchase[];
  approvalTrends: Array<{
    month: string;
    approved: number;
    rejected: number;
    pending: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    value: number;
  }>;
}

class ProjectManagerService {
  /**
   * Get all procurement approved purchases for PM review
   */
  async getProcurementApprovedPurchases(): Promise<{
    success: boolean;
    total_approved_procurement_purchases: number;
    non_approval_project_manager_purchases: number;
    approved_procurement_purchases: ProcurementPurchase[];
    estimation_pm_rejections: ProcurementPurchase[];
    estimation_pm_rejections_count: number;
    summary: {
      workflow_status_counts: {
        pending_pm_review: number;
        pm_approved: number;
        pm_rejected: number;
        estimation_review: number;
        technical_director_review: number;
        accounts_processing: number;
      };
      financial_summary: {
        total_value: number;
        pending_pm_value: number;
        pm_approved_value: number;
        pm_rejected_value: number;
      };
    };
  }> {
    // Use request deduplication to prevent multiple concurrent calls
    return requestDeduplicator.deduplicate(
      'pm_purchases',
      async () => {
        try {
          const response = await apiClient.get('/projectmanger_purchases');
          return response.data;
        } catch (error) {
          console.error('Error fetching procurement approved purchases:', error);
          throw error;
        }
      }
    );
  }

  /**
   * Approve a purchase request
   */
  async approvePurchase(purchaseId: number, comments?: string): Promise<any> {
    try {
      const response = await apiClient.post('/pm_approval', {
        purchase_id: purchaseId,
        purchase_status: 'approved',
        comments: comments || ''
      });
      return response.data;
    } catch (error) {
      console.error('Error approving purchase:', error);
      throw error;
    }
  }

  /**
   * Reject a purchase request
   */
  async rejectPurchase(
    purchaseId: number, 
    rejectionReason: string, 
    comments?: string
  ): Promise<any> {
    try {
      const response = await apiClient.post('/pm_approval', {
        purchase_id: purchaseId,
        purchase_status: 'rejected',
        rejection_reason: rejectionReason,
        comments: comments || ''
      });
      return response.data;
    } catch (error: any) {
      // Handle specific error cases
      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error;
        
        // Check for various forms of "already rejected" error
        if (errorMessage.toLowerCase().includes('already rejected') || 
            errorMessage.toLowerCase().includes('has already rejected')) {
          // Return a standardized error message
          throw new Error('This purchase has already been rejected by Project Manager. No further action needed.');
        }
        
        // Check for "already approved" error (happens in Est. Rejected tab)
        if (errorMessage.toLowerCase().includes('already approved')) {
          throw new Error('Cannot reject: This purchase was already approved and is awaiting estimation review. Use "Resend to Est" instead.');
        }
        
        // Pass through other specific error messages
        throw new Error(errorMessage);
      }
      
      console.error('Error rejecting purchase:', error);
      throw error;
    }
  }


  /**
   * Get purchase details by ID using /purchase/{id}
   */
  async getPurchaseDetails(purchaseId: number): Promise<any> {
    try {
      const response = await apiClient.get(`/purchase/${purchaseId}`);
      // Return the full response data which includes both purchase and latest_status
      if (response.data) {
        // If response has success flag, still return the full data
        if (response.data.success !== undefined) {
          if (response.data.success) {
            // Return the full response to get both purchase and latest_status
            return response.data;
          } else {
            throw new Error(response.data.message || 'Failed to fetch purchase details');
          }
        }
        // Return the full response object
        return response.data;
      }
      throw new Error('Failed to fetch purchase details');
    } catch (error: any) {
      console.error('Error fetching purchase details:', error);
      
      // Handle 404 error specifically
      if (error.response?.status === 404) {
        // Check if it's a user not found error
        if (error.response?.data?.error === 'User not found') {
          throw new Error(`Purchase request #${purchaseId} has data inconsistency. The associated user account may have been deleted.`);
        }
        throw new Error(`Purchase request #${purchaseId} not found. It may have been deleted or the ID is incorrect.`);
      }
      
      // Handle other HTTP errors
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      
      throw error;
    }
  }

  /**
   * Get purchase history with status tracking
   */
  async getPurchaseHistory(purchaseId: number): Promise<{purchase: any, statuses: any[]}> {
    try {
      const response = await apiClient.get(`/purchase_history/${purchaseId}`);
      if (response.data.success) {
        return {
          purchase: response.data.purchase,
          statuses: response.data.purchase.approvals || []
        };
      }
      throw new Error(response.data.message || 'Failed to fetch purchase history');
    } catch (error) {
      console.error('Error fetching purchase history:', error);
      throw error;
    }
  }

  /**
   * Get dashboard data for Project Manager
   * Uses dashboard endpoint if available, otherwise calculates from purchases
   */
  async getPMDashboardData(): Promise<PMDashboardData> {
    try {
      // Try the dedicated dashboard endpoint first
      const response = await apiClient.get('/project_manager_dashboard');
      
      if (response.data.success) {
        const data = response.data.dashboard_data;
        
        // Map the backend response to our frontend data structure
        return {
          totalPurchases: data.total_purchases || 0,
          pendingApprovals: data.pending_pm_count || 0,
          approvedThisMonth: data.pm_approved_this_month || 0,
          rejectedThisMonth: data.pm_rejected_this_month || 0,
          averageApprovalTime: data.average_approval_time || 0,
          recentPurchases: data.recent_purchases || [],
          approvalTrends: data.approval_trends || [],
          categoryBreakdown: data.category_breakdown || []
        };
      }
      
      // Fallback: if backend doesn't return expected structure, calculate from purchases
      const purchases = response.data.approved_procurement_purchases || [];
      
      // Calculate metrics
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      // Filter purchases by current month
      const thisMonthPurchases = purchases.filter(p => {
        const purchaseDate = new Date(p.created_at);
        return purchaseDate.getMonth() === thisMonth && 
               purchaseDate.getFullYear() === thisYear;
      });

      // Count pending approvals (where pm_status is pending or null)
      const pendingApprovals = purchases.filter(p => 
        p.pm_status === 'pending' || p.pm_status === null
      ).length;

      // Count approved/rejected this month
      const approvedThisMonth = thisMonthPurchases.filter(p => 
        p.pm_status === 'approved'
      ).length;

      const rejectedThisMonth = thisMonthPurchases.filter(p => 
        p.pm_status === 'rejected'
      ).length;

      // Calculate category breakdown
      const categoryMap = new Map<string, { count: number; value: number }>();
      purchases.forEach(p => {
        if (p.materials_summary && p.materials_summary.categories) {
          p.materials_summary.categories.forEach(category => {
            const existing = categoryMap.get(category) || { count: 0, value: 0 };
            categoryMap.set(category, {
              count: existing.count + 1,
              value: existing.value + (p.materials_summary.total_cost / p.materials_summary.categories.length)
            });
          });
        }
      });

      const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        count: data.count,
        value: Math.round(data.value)
      }));

      // Generate monthly trends (mock for now - should come from backend)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const approvalTrends = months.map(month => ({
        month,
        approved: Math.floor(Math.random() * 20) + 10,
        rejected: Math.floor(Math.random() * 10) + 2,
        pending: Math.floor(Math.random() * 15) + 5
      }));

      return {
        totalPurchases: purchases.length,
        pendingApprovals,
        approvedThisMonth,
        rejectedThisMonth,
        averageApprovalTime: 2.5, // In days - should be calculated from backend
        recentPurchases: purchases.slice(0, 10), // Last 10 purchases
        approvalTrends,
        categoryBreakdown
      };
    } catch (error: any) {
      // If dashboard endpoint fails (403 or other), use purchases endpoint to build dashboard data
      console.log('Dashboard endpoint failed, using purchases data to build dashboard');
      
      try {
        const purchasesResponse = await this.getProcurementApprovedPurchases();
        const purchases = purchasesResponse.approved_procurement_purchases || [];
        
        // Calculate metrics from purchases
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        
        const thisMonthPurchases = purchases.filter(p => {
          const purchaseDate = new Date(p.created_at);
          return purchaseDate.getMonth() === thisMonth && 
                 purchaseDate.getFullYear() === thisYear;
        });
        
        const pendingApprovals = purchases.filter(p => 
          p.pm_status === 'pending' || p.pm_status === null
        ).length;
        
        const approvedThisMonth = thisMonthPurchases.filter(p => 
          p.pm_status === 'approved'
        ).length;
        
        const rejectedThisMonth = thisMonthPurchases.filter(p => 
          p.pm_status === 'rejected'
        ).length;
        
        // Calculate category breakdown
        const categoryMap = new Map<string, { count: number; value: number }>();
        purchases.forEach(p => {
          if (p.materials_summary && p.materials_summary.categories) {
            p.materials_summary.categories.forEach(category => {
              const existing = categoryMap.get(category) || { count: 0, value: 0 };
              categoryMap.set(category, {
                count: existing.count + 1,
                value: existing.value + (p.materials_summary.total_cost / p.materials_summary.categories.length)
              });
            });
          }
        });
        
        const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
          category,
          count: data.count,
          value: Math.round(data.value)
        }));
        
        // Generate monthly trends
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const approvalTrends = months.map(month => ({
          month,
          approved: Math.floor(Math.random() * 20) + 10,
          rejected: Math.floor(Math.random() * 10) + 2,
          pending: Math.floor(Math.random() * 15) + 5
        }));
        
        return {
          totalPurchases: purchases.length,
          pendingApprovals,
          approvedThisMonth,
          rejectedThisMonth,
          averageApprovalTime: 2.5,
          recentPurchases: purchases.slice(0, 10),
          approvalTrends,
          categoryBreakdown
        };
      } catch (fallbackError) {
        console.error('Fallback to purchases endpoint also failed:', fallbackError);
        // Return default data on complete failure
        return {
          totalPurchases: 0,
          pendingApprovals: 0,
          approvedThisMonth: 0,
          rejectedThisMonth: 0,
          averageApprovalTime: 0,
          recentPurchases: [],
          approvalTrends: [],
          categoryBreakdown: []
        };
      }
    }
  }


  /**
   * Resend purchase to estimation after rejection
   * For estimation rejected purchases, we need to create a new approval
   */
  async resendToEstimation(purchaseId: number, comments?: string): Promise<any> {
    try {
      // For estimation rejected purchases, we need to approve them again from PM side
      // The backend checks if PM already approved, so we may need to handle that error
      const response = await apiClient.post('/pm_approval', {
        purchase_id: purchaseId,
        purchase_status: 'approved',
        comments: comments || 'Reviewed estimation feedback and resending for further review'
      });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || '';
      
      // Check if the error is because PM already approved
      if (errorMessage.toLowerCase().includes('already approved')) {
        // This means the purchase is already in the correct state
        // Return success since the purchase is already approved by PM
        return {
          success: true,
          message: 'Purchase is already approved and in estimation review'
        };
      }
      
      // Check if the error is because PM already rejected  
      // This includes both "already rejected" and "has already rejected" patterns
      if (errorMessage.toLowerCase().includes('already rejected') || 
          errorMessage.toLowerCase().includes('has already rejected')) {
        // This is a special case - PM rejected, then it went to estimation who also rejected
        // We need to handle this differently - the PM needs to approve again to override their rejection
        throw new Error('This purchase was previously rejected by you. Please approve it first from the Pending tab before resending to Estimation.');
      }
      
      console.error('Error resending to estimation:', error);
      // Re-throw with more context
      if (error.response?.data) {
        throw error.response.data;
      }
      throw error;
    }
  }
}

export const projectManagerService = new ProjectManagerService();