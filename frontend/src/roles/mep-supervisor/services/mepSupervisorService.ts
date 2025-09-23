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
  mep_type?: 'electrical' | 'mechanical' | 'plumbing'; // MEP-specific field
  equipment_specs?: string; // MEP equipment specifications
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
  material_details?: Material[];
  file_path?: string;
  email_sent: boolean;
  mep_category?: 'electrical' | 'mechanical' | 'plumbing'; // MEP-specific category
  equipment_type?: string; // MEP equipment type
  installation_date?: string; // MEP installation schedule
  created_at: string;
  created_by: string;
  last_modified_at?: string;
  last_modified_by?: string;
  approvals?: any[];
  status?: string;
  current_status?: {
    status: string;
    updated_at?: string;
    updated_by?: string;
  };
  current_workflow_status?: string;
  procurement_status?: string;
  latest_status?: any;
  total_cost?: number;
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

class MEPSupervisorService {
  // Get MEP supervisor dashboard data
  async getDashboard(): Promise<any> {
    try {
      const response = await apiClient.get('/mep_supervisor_dashboard');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch MEP dashboard');
    } catch (error: any) {
      console.error('Error fetching MEP dashboard:', error);
      return null;
    }
  }

  // Get all MEP purchases - using the correct endpoint
  async getPurchases(): Promise<{purchases: Purchase[], pagination?: any}> {
    try {
      const response = await apiClient.get('/mep_purchases');
      if (response.data.success) {
        // Handle the correct response format with purchase_requests key
        return {
          purchases: response.data.purchase_requests || response.data.data || [],
          pagination: response.data.pagination
        };
      }
      throw new Error(response.data.message || 'Failed to fetch MEP purchases');
    } catch (error: any) {
      console.error('Error fetching MEP purchases:', error);
      // Return empty array instead of throwing to prevent UI breaks
      return { purchases: [] };
    }
  }

  // Get purchase details by ID
  async getPurchaseDetails(purchaseId: number): Promise<Purchase> {
    try {
      const response = await apiClient.get(`/mep_purchases/${purchaseId}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch purchase details');
    } catch (error: any) {
      console.error('Error fetching purchase details:', error);
      throw error;
    }
  }

  // Get purchase history with status tracking
  async getPurchaseHistory(purchaseId: number): Promise<{purchase: Purchase, history: any[]}> {
    try {
      const response = await apiClient.get(`/mep_purchase_history/${purchaseId}`);
      if (response.data.success) {
        return {
          purchase: response.data.purchase,
          history: response.data.history || []
        };
      }
      throw new Error(response.data.message || 'Failed to fetch purchase history');
    } catch (error: any) {
      console.error('Error fetching purchase history:', error);
      throw error;
    }
  }

  // Create new MEP purchase request
  async createPurchase(purchaseData: any): Promise<any> {
    try {
      // Add MEP-specific metadata
      const currentUser = localStorage.getItem('userName') || 'MEP Supervisor Test';
      const currentUserId = localStorage.getItem('userId') || '';
      const mepPurchaseData = {
        ...purchaseData,
        requested_by: 'MEP Supervisor Test', // Ensure consistent naming for backend filtering
        created_by: 'MEP Supervisor Test',
        user_id: currentUserId,
        user_name: currentUser,
        mep_category: this.detectMEPCategory(purchaseData),
        equipment_type: this.detectEquipmentType(purchaseData),
        is_mep_purchase: true // Explicit flag for MEP purchases
      };

      const response = await apiClient.post('/purchase', mepPurchaseData);
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to create MEP purchase');
    } catch (error: any) {
      console.error('Error creating MEP purchase:', error);
      throw error;
    }
  }

  // Update MEP purchase request
  async updatePurchase(purchaseId: number, purchaseData: any): Promise<any> {
    try {
      const response = await apiClient.put(`/mep_purchases/${purchaseId}`, purchaseData);
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to update MEP purchase');
    } catch (error: any) {
      console.error('Error updating MEP purchase:', error);
      throw error;
    }
  }

  // Delete MEP purchase request
  async deletePurchase(purchaseId: number): Promise<any> {
    try {
      const response = await apiClient.delete(`/mep_purchases/${purchaseId}`);
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to delete MEP purchase');
    } catch (error: any) {
      console.error('Error deleting MEP purchase:', error);
      throw error;
    }
  }

  // Send email for purchase request
  async sendPurchaseEmail(purchaseId: number, emailData: any = {}): Promise<any> {
    try {
      const response = await apiClient.post(`/mep_send_email/${purchaseId}`, {
        recipients: emailData.recipients || ['procurement@company.com'],
        subject: emailData.subject || `MEP Purchase Request #${purchaseId}`,
        message: emailData.message || 'Please review this MEP purchase request'
      });
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to send email');
    } catch (error: any) {
      console.error('Error sending purchase email:', error);
      throw error;
    }
  }

  // Send MEP purchase to procurement (this is the workflow action)
  async sendToProcurement(purchaseId: number): Promise<any> {
    try {
      const response = await apiClient.post(`/mep_send_to_procurement/${purchaseId}`);
      if (response.data.success) {
        // Get purchase details for notification
        const purchaseDetails = await this.getPurchaseDetails(purchaseId);

        // Calculate total amount
        const totalAmount = purchaseDetails.materials?.reduce((sum: number, m: Material) =>
          sum + (m.quantity * m.cost), 0) || purchaseDetails.total_cost || 0;

        // Send notification to procurement about new MEP PR submission
        await PurchaseNotificationService.notifyPRSubmitted({
          documentId: String(purchaseId),
          sender: 'MEP Supervisor',
          project: purchaseDetails.project_id,
          amount: totalAmount,
          description: purchaseDetails.purpose + ' (MEP)'
        });

        return response.data;
      }
      throw new Error(response.data.message || 'Failed to send to procurement');
    } catch (error: any) {
      console.error('Error sending to procurement:', error);
      throw error;
    }
  }

  // Upload file for purchase
  async uploadFile(purchaseId: number, file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post(`/upload_file?key=mepSupervisor&id=${purchaseId}`, formData, {
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

  // Helper function to detect MEP category
  private detectMEPCategory(purchaseData: any): 'electrical' | 'mechanical' | 'plumbing' | undefined {
    const description = (purchaseData.purpose || purchaseData.description || '').toLowerCase();

    if (this.isElectricalDescription(description)) return 'electrical';
    if (this.isMechanicalDescription(description)) return 'mechanical';
    if (this.isPlumbingDescription(description)) return 'plumbing';

    return undefined;
  }

  // Helper function to detect equipment type
  private detectEquipmentType(purchaseData: any): string | undefined {
    const description = (purchaseData.purpose || purchaseData.description || '').toLowerCase();

    // Electrical equipment
    if (description.includes('transformer')) return 'Transformer';
    if (description.includes('panel')) return 'Electrical Panel';
    if (description.includes('generator')) return 'Generator';
    if (description.includes('ups')) return 'UPS System';

    // Mechanical equipment
    if (description.includes('hvac')) return 'HVAC System';
    if (description.includes('chiller')) return 'Chiller';
    if (description.includes('ahu')) return 'Air Handling Unit';
    if (description.includes('fan')) return 'Ventilation Fan';

    // Plumbing equipment
    if (description.includes('pump')) return 'Water Pump';
    if (description.includes('tank')) return 'Water Tank';
    if (description.includes('heater')) return 'Water Heater';
    if (description.includes('valve')) return 'Control Valve';

    return undefined;
  }

  private isElectricalDescription(desc: string): boolean {
    return desc.includes('electrical') ||
           desc.includes('wiring') ||
           desc.includes('circuit') ||
           desc.includes('transformer') ||
           desc.includes('panel') ||
           desc.includes('generator') ||
           desc.includes('ups') ||
           desc.includes('cable') ||
           desc.includes('breaker');
  }

  private isMechanicalDescription(desc: string): boolean {
    return desc.includes('hvac') ||
           desc.includes('mechanical') ||
           desc.includes('ventilation') ||
           desc.includes('chiller') ||
           desc.includes('ahu') ||
           desc.includes('fan') ||
           desc.includes('duct') ||
           desc.includes('air conditioning');
  }

  private isPlumbingDescription(desc: string): boolean {
    return desc.includes('plumbing') ||
           desc.includes('pipe') ||
           desc.includes('water') ||
           desc.includes('pump') ||
           desc.includes('tank') ||
           desc.includes('valve') ||
           desc.includes('drainage') ||
           desc.includes('sewage');
  }
}

export const mepSupervisorService = new MEPSupervisorService();