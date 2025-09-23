import { apiClient } from '@/api/config';
import { PurchaseNotificationService } from '@/services/purchaseNotificationService';

export interface Material {
  material_id: number;
  project_id: string;
  description: string;
  specification: string;
  unit: string;
  quantity: number;
  category: string;
  cost: number;
  priority: string;
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
  last_modified_at?: string;
  last_modified_by?: string;
  approvals?: any[];
  status?: string;
  latest_status?: any;
}

export interface PurchaseStatus {
  status_id: number;
  purchase_id: number;
  sender: string;
  receiver: string;
  role: string;
  status: string;
  decision_by_user_id?: string;
  decision_date?: string;
  rejection_reason?: string;
  comments?: string;
  created_at: string;
  created_by: string;
}

class SiteSupervisorService {
  // Get all purchases for site supervisor
  async getPurchases(): Promise<Purchase[]> {
    try {
      const response = await apiClient.get('/all_purchase');
      if (response.data.success) {
        return response.data.purchase_requests || [];
      }
      throw new Error(response.data.message || 'Failed to fetch purchases');
    } catch (error: any) {
      console.error('Error fetching purchases:', error);
      throw error;
    }
  }

  // Get purchase details by ID
  async getPurchaseDetails(purchaseId: number): Promise<Purchase> {
    try {
      // Use the purchase history endpoint since view details is restricted to accounts
      const response = await apiClient.get(`/purchase_history/${purchaseId}`);
      if (response.data.success) {
        return response.data.purchase;
      }
      throw new Error(response.data.message || 'Failed to fetch purchase details');
    } catch (error: any) {
      console.error('Error fetching purchase details:', error);
      throw error;
    }
  }

  // Get purchase history with status tracking
  async getPurchaseHistory(purchaseId: number): Promise<{purchase: Purchase}> {
    try {
      const response = await apiClient.get(`/purchase_history/${purchaseId}`);
      if (response.data.success) {
        return {
          purchase: response.data.purchase
        };
      }
      throw new Error(response.data.message || 'Failed to fetch purchase history');
    } catch (error: any) {
      console.error('Error fetching purchase history:', error);
      throw error;
    }
  }

  // Create new purchase request
  async createPurchase(purchaseData: any): Promise<any> {
    try {
      const response = await apiClient.post('/purchase', purchaseData);
      if (response.data.success) {
        // Send confirmation notification to the sender
        const purchaseId = response.data.purchase_id || response.data.data?.purchase_id;
        if (purchaseId) {
          await PurchaseNotificationService.notifySenderConfirmation({
            documentId: `PR-${purchaseId}`,
            project: purchaseData.project_id,
            amount: purchaseData.total_cost
          });
        }
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to create purchase');
    } catch (error: any) {
      console.error('Error creating purchase:', error);
      throw error;
    }
  }

  // Update purchase request
  async updatePurchase(purchaseId: number, purchaseData: any): Promise<any> {
    try {
      const response = await apiClient.put(`/purchase/${purchaseId}`, purchaseData);
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to update purchase');
    } catch (error: any) {
      console.error('Error updating purchase:', error);
      throw error;
    }
  }

  // Delete purchase request
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

  // Send email for purchase request
  async sendPurchaseEmail(purchaseId: number): Promise<any> {
    try {
      const response = await apiClient.get(`/purchase_email/${purchaseId}`);
      if (response.data.success) {
        // Get purchase details for notification
        const purchaseDetails = await this.getPurchaseDetails(purchaseId);

        // Calculate total amount
        const totalAmount = purchaseDetails.materials?.reduce((sum: number, m: Material) =>
          sum + (m.quantity * m.cost), 0) || 0;

        // Send notification to procurement about new PR submission
        await PurchaseNotificationService.notifyPRSubmitted({
          documentId: String(purchaseId),
          sender: 'Site Supervisor',
          project: purchaseDetails.project_id,
          amount: totalAmount,
          description: purchaseDetails.purpose
        });

        return response.data;
      }
      throw new Error(response.data.message || 'Failed to send email');
    } catch (error: any) {
      console.error('Error sending purchase email:', error);
      throw error;
    }
  }

  // Upload file for purchase
  async uploadFile(purchaseId: number, file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post(`/upload_file?key=siteSupervisor&id=${purchaseId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to upload file');
    } catch (error: any) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Get dashboard data
  async getDashboardData(): Promise<any> {
    try {
      const response = await apiClient.get('/site_supervisor_dashboard');
      if (response.data.success) {
        return response.data.dashboard_data;
      }
      throw new Error(response.data.message || 'Failed to fetch dashboard data');
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }
}

export const siteSupervisorService = new SiteSupervisorService();