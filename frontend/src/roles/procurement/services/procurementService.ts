import { apiClient } from '@/api/config';

export interface Material {
  material_id: number;
  project_id: string;
  description: string;
  specification: string;
  unit: string;
  quantity: number;
  category: string;
  cost: number;
  priority?: string;
  design_reference?: string;
  created_at?: string;
  created_by?: string;
}

export interface Purchase {
  purchase_id: number;
  user_id: string;
  user_name?: string;
  requested_by: string;
  site_location: string;
  date: string;
  project_id: string;
  purpose: string;
  material_ids: number[];
  materials?: Material[];
  file_path?: string;
  email_sent: boolean;
  created_at: string;
  created_by: string;
  approvals?: any[];
  status?: string;
  latest_status?: any;
  // Additional fields from API response
  last_modified_at?: string;
  last_modified_by?: string;
  is_deleted?: boolean;
  decision_date?: string;
  receiver_latest_status?: string;
  sender_latest_status?: string;
  status_comments?: string;
  status_date?: string;
  status_receiver?: string;
  status_role?: string;
  status_sender?: string;
}

class ProcurementService {
  // Get all purchases for procurement (email_sent=true)
  async getPurchases(): Promise<Purchase[]> {
    try {
      const response = await apiClient.get('/all_procurement');
      if (response.data.success) {
        return response.data.procurement || [];
      }
      throw new Error(response.data.message || 'Failed to fetch purchases');
    } catch (error: any) {
      console.error('Error fetching purchases:', error);
      
      // Check if it's a network/connection error
      if (!error.response) {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      
      // Check for specific error status codes
      if (error.response?.status === 404) {
        throw new Error('API endpoint not found. Please check backend configuration.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please login again.');
      }
      
      throw error;
    }
  }

  // Get purchase details by ID using /purchase/{id}
  async getPurchaseDetails(purchaseId: number): Promise<any> {
    try {
      const response = await apiClient.get(`/purchase/${purchaseId}`);
      // Handle different response structures
      if (response.data) {
        // If response has success flag
        if (response.data.success !== undefined) {
          if (response.data.success) {
            // Return the full response including purchase and latest_status
            return response.data;
          } else {
            throw new Error(response.data.message || 'Failed to fetch purchase details');
          }
        }
        // If response is the purchase object directly
        return response.data;
      }
      throw new Error('Failed to fetch purchase details');
    } catch (error: any) {
      console.error('Error fetching purchase details:', error);
      
      // Handle specific error codes
      if (error.response?.status === 403) {
        throw new Error('You do not have permission to view this purchase request');
      }
      
      if (error.response?.status === 404) {
        throw new Error('Purchase request not found');
      }
      
      throw error;
    }
  }

  // Get purchase history with status tracking
  async getPurchaseHistory(purchaseId: number): Promise<{purchase: Purchase, latest_status?: any}> {
    try {
      const response = await apiClient.get(`/purchase_history/${purchaseId}`);
      if (response.data.success) {
        return {
          purchase: response.data.purchase,
          latest_status: response.data.latest_status
        };
      }
      throw new Error(response.data.message || 'Failed to fetch purchase history');
    } catch (error: any) {
      console.error('Error fetching purchase history:', error);
      throw error;
    }
  }

  // Create new purchase (if needed by procurement)
  async createPurchase(purchaseData: any): Promise<any> {
    try {
      const response = await apiClient.post('/purchase', purchaseData);
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to create purchase');
    } catch (error: any) {
      console.error('Error creating purchase:', error);
      throw error;
    }
  }

  // Update purchase
  async updatePurchase(purchaseId: number, purchaseData: any): Promise<any> {
    try {
      // Log the update data for debugging
      console.log('Updating purchase:', purchaseId, 'with data:', purchaseData);
      
      // Get current user info from localStorage or auth store
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userName = user.full_name || user.name || 'Procurement Team';
      
      // Include status reset to pending after edit and track edit history
      const updatePayload = {
        ...purchaseData,
        status: 'pending',  // Reset to pending after procurement edits
        sender_latest_status: 'pending',
        email_sent: false,  // Reset email sent flag so it can be sent to PM again
        last_modified_by: userName,  // Track who edited
        last_modified_at: new Date().toISOString()  // Track when edited
      };
      
      const response = await apiClient.put(`/purchase/${purchaseId}`, updatePayload);
      
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to update purchase');
    } catch (error: any) {
      console.error('Error updating purchase:', error);
      
      // More specific error handling
      if (error.response?.status === 404) {
        throw new Error('Purchase request not found');
      }
      
      if (error.response?.status === 403) {
        throw new Error('You do not have permission to edit this purchase request');
      }
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw error;
    }
  }

  // Delete purchase (if allowed)
  async deletePurchase(purchaseId: number): Promise<any> {
    try {
      const response = await apiClient.delete(`/purchase/${purchaseId}`);
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to delete purchase');
    } catch (error: any) {
      console.error('Error deleting purchase:', error);
      throw error;
    }
  }

  // Send approval email to Project Manager
  async sendApprovalEmail(purchaseId: number): Promise<any> {
    try {
      const response = await apiClient.get(`/purchase_email/${purchaseId}`);
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to send email');
    } catch (error: any) {
      console.error('Error sending approval email:', error);
      throw error;
    }
  }

  // Approve purchase request - sends email to Project Manager
  async approvePurchase(purchaseId: number, approvalData?: any): Promise<any> {
    try {
      const response = await apiClient.get(`/purchase_email/${purchaseId}`);
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to approve purchase');
    } catch (error: any) {
      console.error('Error approving purchase:', error);
      throw error;
    }
  }

  // Reject purchase request
  async rejectPurchase(purchaseId: number, reason?: string): Promise<any> {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userName = user.full_name || user.name || 'Procurement Team';
      
      const rejectionData = {
        status: 'rejected',
        sender_latest_status: 'rejected',
        receiver_latest_status: 'rejected',
        status_comments: reason || 'Rejected by Procurement',
        status_date: new Date().toISOString(),
        status_sender: userName,
        status_receiver: 'Site Supervisor',
        status_role: 'Procurement',
        last_modified_by: userName,
        last_modified_at: new Date().toISOString()
      };

      const response = await apiClient.put(`/purchase/${purchaseId}`, rejectionData);
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to reject purchase');
    } catch (error: any) {
      console.error('Error rejecting purchase:', error);
      throw error;
    }
  }


  // Get procurement dashboard metrics
  async getDashboardMetrics(): Promise<any> {
    try {
      const response = await apiClient.get('/procurement/dashboard');
      if (response.data.success) {
        return response.data.metrics;
      }
      // Fallback: calculate from purchases if dashboard endpoint not available
      const purchases = await this.getPurchases();
      return this.calculateMetrics(purchases);
    } catch (error: any) {
      console.error('Error fetching dashboard metrics:', error);
      // Return calculated metrics as fallback
      const purchases = await this.getPurchases();
      return this.calculateMetrics(purchases);
    }
  }

  // Helper function to calculate metrics from purchases
  private calculateMetrics(purchases: Purchase[]): any {
    const totalValue = purchases.reduce((sum, p) => {
      const amount = p.materials?.reduce((s, m) => s + (m.quantity * m.cost), 0) || 0;
      return sum + amount;
    }, 0);

    const pendingCount = purchases.filter(p => !p.latest_status || p.latest_status === 'pending').length;
    const approvedCount = purchases.filter(p => p.latest_status === 'approved').length;
    const rejectedCount = purchases.filter(p => p.latest_status === 'rejected').length;

    return {
      totalPurchaseValue: totalValue,
      totalRequisitions: purchases.length,
      pendingRequisitions: pendingCount,
      approvedRequisitions: approvedCount,
      rejectedRequisitions: rejectedCount,
      vendorPerformance: 92, // Placeholder
      avgProcessingTime: 1.5, // Placeholder
      costSavings: 12450 // Placeholder
    };
  }

  // Get vendor quotations
  async getVendorQuotations(): Promise<any[]> {
    try {
      const response = await apiClient.get('/vendor_quotations');
      if (response.data.success) {
        return response.data.quotations || [];
      }
      return [];
    } catch (error: any) {
      console.error('Error fetching vendor quotations:', error);
      return [];
    }
  }

  // Create vendor quotation
  async createVendorQuotation(quotationData: any): Promise<any> {
    try {
      const response = await apiClient.post('/vendor_quotation', quotationData);
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to create vendor quotation');
    } catch (error: any) {
      console.error('Error creating vendor quotation:', error);
      throw error;
    }
  }
}

export const procurementService = new ProcurementService();