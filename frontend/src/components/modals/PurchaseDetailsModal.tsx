import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, FileText, Calendar, User, Building2, Package, Banknote, Clock, AlertCircle, MapPin, Phone, Mail, Hash, FolderOpen, Briefcase, UserCheck, CheckCircle, XCircle, Timer, Edit } from 'lucide-react';
import { apiClient } from '@/api/config';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format, formatDistance } from 'date-fns';

interface PurchaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: string;
}

interface Material {
  material_id: number;
  description: string; // This is what backend returns as main item name
  specification: string;
  quantity: number;
  unit: string;
  cost: number;
  priority: string;
  category: string;
  design_reference?: string;
  project_id?: number;
  created_at?: string;
  created_by?: string;
  // Frontend display fields (will be mapped from backend)
  item_name?: string; 
  item_description?: string;
  required_date?: string;
}

interface PurchaseDetails {
  purchase_id: number;
  project_id: number | null;
  requested_by: string;
  created_by: string;
  date: string;
  created_at: string;
  updated_at?: string;
  status?: string;
  total_amount: number;
  materials: Material[];
  site_location?: string;
  purpose?: string;
  user_id?: number;
  user_name?: string;
  file_path?: string;
  material_ids?: number[];
  approvals?: any[];
  notes?: string;
  department?: string;
  delivery_address?: string;
  payment_terms?: string;
  reference_number?: string;
  approval_status?: string;
  approved_by?: string;
  approval_date?: string;
  rejection_reason?: string;
  vendor_details?: {
    name?: string;
    contact?: string;
    email?: string;
  };
  budget_allocated?: number;
  cost_center?: string;
  justification?: string;
  attachments?: string[];
}

const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({ isOpen, onClose, purchaseId }) => {
  const [loading, setLoading] = useState(true);
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null);
  const [projectName, setProjectName] = useState<string>('');  

  useEffect(() => {
    if (isOpen && purchaseId) {
      fetchPurchaseDetails();
      fetchProjects();
    }
  }, [isOpen, purchaseId]);

  const fetchProjects = async () => {
    // Projects fetching logic if needed
  };

  const fetchPurchaseDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/purchase/${purchaseId}`);
      
      if (response.data.success) {
        // Backend returns 'purchase' not 'purchase_request'
        const purchase = response.data.purchase;
        
        // Materials are nested within purchase object
        const materials = (purchase.materials || []).map((m: any) => ({
          ...m,
          // Map backend fields to frontend display fields
          item_name: m.description || 'Unnamed Item', // Use description as item name
          item_description: `${m.category || ''} - ${m.specification || ''}`.trim() || '-',
          required_date: m.created_at // Use created_at as a fallback for required date
        }));
        
        const totalAmount = materials.reduce((sum: number, m: any) => 
          sum + (m.quantity * m.cost), 0
        );
        
        const details = {
          ...purchase,
          materials,
          total_amount: totalAmount,
          // Keep all original API response fields
          site_location: purchase.site_location,
          purpose: purchase.purpose,
          user_id: purchase.user_id,
          user_name: purchase.user_name,
          file_path: purchase.file_path,
          material_ids: purchase.material_ids,
          approvals: purchase.approvals || []
        };
        setPurchaseDetails(details);
        
        // Set project name based on project_id
        if (details.project_id) {
          setProjectName(`Project ${details.project_id}`);
        }
      } else {
        toast.error(response.data.message || 'Failed to fetch purchase details');
        onClose();
      }
    } catch (error: any) {
      console.error('Error fetching purchase details:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch purchase details');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'pending':
      case 'pending_approval':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'in_progress':
      case 'processing':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'completed':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return format(date, 'dd MMM yyyy, hh:mm a');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatDateShort = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return format(date, 'dd MMM yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getTimeAgo = (dateString: string | undefined | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return `(${formatDistance(date, new Date(), { addSuffix: true })})`;
    } catch (error) {
      return '';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-[#243d8a]/5 to-blue-50">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#243d8a]/10 rounded-lg">
                <FileText className="w-6 h-6 text-[#243d8a]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Purchase Request Details</h2>
                {purchaseDetails && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    PR-2024-{String(purchaseDetails.purchase_id).padStart(3, '0')}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-9 w-9 p-0 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-[#243d8a] mb-4" />
              <p className="text-gray-500">Loading purchase details...</p>
            </div>
          ) : purchaseDetails ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* API Response Data */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchase Request Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Purchase Request No.</p>
                  <p className="font-medium text-lg">PR-2024-{String(purchaseDetails.purchase_id).padStart(3, '0')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Project</p>
                  <p className="font-medium text-lg">{projectName || `Project ${purchaseDetails.project_id}` || 'General'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Requested By</p>
                  <p className="font-medium">{purchaseDetails.requested_by}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created By</p>
                  <p className="font-medium">{purchaseDetails.created_by}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Site Location</p>
                  <p className="font-medium">{purchaseDetails.site_location || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Purpose</p>
                  <p className="font-medium">{purchaseDetails.purpose || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium">{purchaseDetails.date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created At</p>
                  <p className="font-medium">{purchaseDetails.created_at}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">User</p>
                  <p className="font-medium">{purchaseDetails.user_name || purchaseDetails.requested_by || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-medium">
                    <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                      {purchaseDetails.status || 'Pending'}
                    </Badge>
                  </p>
                </div>
                {purchaseDetails.file_path && (
                  <div>
                    <p className="text-sm text-gray-600">Attachment</p>
                    <p className="font-medium text-blue-600">{purchaseDetails.file_path.split('/').pop() || 'Document attached'}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Total Materials</p>
                  <p className="font-medium">{purchaseDetails.materials?.length || 0} items</p>
                </div>
              </div>
            </div>

            {/* Approvals Array */}
            {purchaseDetails.approvals && purchaseDetails.approvals.length > 0 && (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Approvals</h3>
                <div className="space-y-2">
                  {purchaseDetails.approvals.map((approval: any, index: number) => (
                    <div key={index} className="p-3 bg-gray-50 rounded">
                      <pre className="text-sm">{JSON.stringify(approval, null, 2)}</pre>
                    </div>
                  ))}
                </div>
                {purchaseDetails.approvals.length === 0 && (
                  <p className="text-gray-500">No approvals yet</p>
                )}
              </div>
            )}

            {/* Materials Data */}
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Material Details ({purchaseDetails.materials.length} items)</h3>
              </div>
              <div className="p-6 space-y-4">
                {purchaseDetails.materials.map((material, index) => (
                  <div key={material.material_id || index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-gray-900">
                        {index + 1}. {material.description}
                      </h4>
                      <Badge className={`${
                        material.priority?.toLowerCase() === 'urgent' ? 'bg-red-100 text-red-700' :
                        material.priority?.toLowerCase() === 'high' ? 'bg-orange-100 text-orange-700' :
                        material.priority?.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {material.priority || 'Normal'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Specification:</span>
                        <p className="font-medium">{material.specification}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Category:</span>
                        <p className="font-medium">{material.category}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Quantity:</span>
                        <p className="font-medium">{material.quantity} {material.unit}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Unit Cost:</span>
                        <p className="font-medium">AED {material.cost.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Cost:</span>
                        <p className="font-semibold text-blue-600">AED {(material.quantity * material.cost).toLocaleString()}</p>
                      </div>
                      {material.design_reference && (
                        <div>
                          <span className="text-gray-500">Design Ref:</span>
                          <p className="font-medium">{material.design_reference}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Total Amount:</span>
                    <span className="text-2xl font-bold text-blue-700">AED {purchaseDetails.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          ) : (
            <div className="text-center py-16">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">No purchase details available</p>
              <p className="text-gray-400 text-sm mt-2">The requested purchase request could not be found.</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            {purchaseDetails && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => {
                    // Export functionality
                    const data = JSON.stringify(purchaseDetails, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `PR-2024-${String(purchaseDetails.purchase_id).padStart(3, '0')}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  <FileText className="w-4 h-4" />
                  Export
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => window.print()}
                >
                  <FileText className="w-4 h-4" />
                  Print
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {purchaseDetails && purchaseDetails.status === 'pending' && (
              <Button 
                variant="default"
                className="bg-[#243d8a] hover:bg-[#243d8a]/90 flex items-center gap-2"
                onClick={() => {
                  // Edit functionality
                  onClose();
                }}
              >
                <Edit className="w-4 h-4" />
                Edit Request
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseDetailsModal;