/**
 * Project Manager API Service
 * Handles all API calls for Project Manager functionality
 */

import { apiClient } from '@/api/config';

export interface PurchaseApproval {
  purchase_id: number;
  purchase_status: 'approved' | 'reject';
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
}

export interface PurchaseStatusDetails {
  purchase_id: number;
  purchase_details: {
    site_location: string;
    purpose: string;
    date: string;
    email_sent: boolean;
    created_at: string;
    materials_summary: {
      total_materials: number;
      total_quantity: number;
      total_cost: number;
      categories: string[];
      materials: Array<{
        material_id: number;
        description: string;
        quantity: number;
        unit: string;
        cost: number;
        category: string;
        priority: string;
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
    decision_by: {
      user_id: number;
      full_name: string;
      email: string;
    } | null;
    comments: string | null;
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
    try {
      const response = await apiClient.get('/projectmanger_purchases');
      return response.data;
    } catch (error) {
      console.error('Error fetching procurement approved purchases:', error);
      throw error;
    }
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
        purchase_status: 'reject',
        rejection_reason: rejectionReason,
        comments: comments || ''
      });
      return response.data;
    } catch (error) {
      console.error('Error rejecting purchase:', error);
      throw error;
    }
  }

  /**
   * Get detailed status information for a specific purchase
   */
  async getPurchaseStatusDetails(purchaseId: number): Promise<PurchaseStatusDetails> {
    try {
      const response = await apiClient.get(`/purchase_status/${purchaseId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching purchase status details:', error);
      throw error;
    }
  }

  /**
   * Get dashboard data for Project Manager
   * This aggregates data from multiple endpoints
   */
  async getPMDashboardData(): Promise<PMDashboardData> {
    try {
      // Get procurement approved purchases
      const purchasesResponse = await this.getProcurementApprovedPurchases();
      const purchases = purchasesResponse.approved_procurement_purchases || [];

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
        p.materials_summary.categories.forEach(category => {
          const existing = categoryMap.get(category) || { count: 0, value: 0 };
          categoryMap.set(category, {
            count: existing.count + 1,
            value: existing.value + (p.materials_summary.total_cost / p.materials_summary.categories.length)
          });
        });
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
    } catch (error) {
      console.error('Error fetching PM dashboard data:', error);
      // Return default data on error
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

  /**
   * Handle purchase approval workflow
   */
  async handlePurchaseApproval(approval: PurchaseApproval): Promise<any> {
    try {
      const response = await apiClient.post('/pm_approval', approval);
      return response.data;
    } catch (error) {
      console.error('Error handling purchase approval:', error);
      throw error;
    }
  }
}

export const projectManagerService = new ProjectManagerService();