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
  updated_at: string;
  status: string;
  total_amount: number;
  materials: Material[];
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

  useEffect(() => {
    if (isOpen && purchaseId) {
      fetchPurchaseDetails();
    }
  }, [isOpen, purchaseId]);

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
        
        setPurchaseDetails({
          ...purchase,
          materials,
          total_amount: totalAmount,
          status: purchase.status || 'pending',
          department: purchase.department || 'Procurement',
          payment_terms: purchase.payment_terms || 'Net 30 days',
          approval_status: purchase.approval_status || 'pending_approval',
          // Map backend fields
          created_by: purchase.created_by || purchase.user_name || 'Unknown',
          requested_by: purchase.requested_by || purchase.user_name || 'Unknown'
        });
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
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <Hash className="w-5 h-5 text-[#243d8a]" />
                  <Badge className="bg-[#243d8a]/10 text-[#243d8a] border-0 text-xs">
                    Reference
                  </Badge>
                </div>
                <p className="font-bold text-lg text-gray-900">
                  PR-2024-{String(purchaseDetails.purchase_id).padStart(3, '0')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {purchaseDetails.reference_number ? `Ref: ${purchaseDetails.reference_number}` : 'Purchase Request ID'}
                </p>
              </div>

              <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">
                    Project
                  </Badge>
                </div>
                <p className="font-bold text-lg text-gray-900">
                  {purchaseDetails.project_id ? `Project ${purchaseDetails.project_id}` : 'General'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {purchaseDetails.cost_center || 'Main Operations'}
                </p>
              </div>

              <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <Timer className="w-5 h-5 text-amber-600" />
                  <Badge className={`${getStatusColor(purchaseDetails.status || 'pending')} border-0 text-xs`}>
                    {(purchaseDetails.status || 'pending').replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="font-bold text-lg text-gray-900">Status</p>
                <p className="text-xs text-gray-500 mt-1">
                  {purchaseDetails.approval_status === 'approved' ? 'Approved' : 
                   purchaseDetails.approval_status === 'rejected' ? 'Rejected' : 'Pending Approval'}
                </p>
              </div>

              <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <Banknote className="w-5 h-5 text-green-600" />
                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                    Total
                  </Badge>
                </div>
                <p className="font-bold text-xl text-[#243d8a]">
                  AED {purchaseDetails.total_amount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {purchaseDetails.budget_allocated ? 
                    `Budget: AED ${purchaseDetails.budget_allocated.toLocaleString()}` : 
                    purchaseDetails.payment_terms || 'Net 30 days'}
                </p>
              </div>
            </div>

            {/* Detailed Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Requester Information */}
              <div className="bg-white border rounded-lg p-5">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-[#243d8a]" />
                  Requester Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <UserCheck className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Requested By</p>
                      <p className="text-sm font-medium text-gray-900">{purchaseDetails.requested_by || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Created By</p>
                      <p className="text-sm font-medium text-gray-900">{purchaseDetails.created_by || 'System'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Department</p>
                      <p className="text-sm font-medium text-gray-900">{purchaseDetails.department || 'Procurement'}</p>
                    </div>
                  </div>
                  {purchaseDetails.approved_by && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Approved By</p>
                        <p className="text-sm font-medium text-gray-900">{purchaseDetails.approved_by}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline Information */}
              <div className="bg-white border rounded-lg p-5">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-[#243d8a]" />
                  Timeline
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Request Date</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDateShort(purchaseDetails.date || purchaseDetails.created_at)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {getTimeAgo(purchaseDetails.date || purchaseDetails.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Last Updated</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(purchaseDetails.updated_at)}
                      </p>
                    </div>
                  </div>
                  {purchaseDetails.approval_date && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Approval Date</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDateShort(purchaseDetails.approval_date)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Details */}
              <div className="bg-white border rounded-lg p-5">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                  <FolderOpen className="w-4 h-4 text-[#243d8a]" />
                  Additional Details
                </h3>
                <div className="space-y-3">
                  {purchaseDetails.vendor_details?.name && (
                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Preferred Vendor</p>
                        <p className="text-sm font-medium text-gray-900">{purchaseDetails.vendor_details.name}</p>
                      </div>
                    </div>
                  )}
                  {purchaseDetails.cost_center && (
                    <div className="flex items-start gap-3">
                      <Banknote className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Cost Center</p>
                        <p className="text-sm font-medium text-gray-900">{purchaseDetails.cost_center}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Banknote className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Payment Terms</p>
                      <p className="text-sm font-medium text-gray-900">{purchaseDetails.payment_terms || 'Net 30 days'}</p>
                    </div>
                  </div>
                  {purchaseDetails.attachments && purchaseDetails.attachments.length > 0 && (
                    <div className="flex items-start gap-3">
                      <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Attachments</p>
                        <p className="text-sm font-medium text-gray-900">{purchaseDetails.attachments.length} file(s)</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery & Additional Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {purchaseDetails.delivery_address && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Delivery Information
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{purchaseDetails.delivery_address}</p>
                  {purchaseDetails.vendor_details?.contact && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="flex items-center gap-4 text-sm">
                        {purchaseDetails.vendor_details.contact && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <Phone className="w-3 h-3" />
                            {purchaseDetails.vendor_details.contact}
                          </span>
                        )}
                        {purchaseDetails.vendor_details.email && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <Mail className="w-3 h-3" />
                            {purchaseDetails.vendor_details.email}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {purchaseDetails.justification && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-green-600" />
                    Business Justification
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{purchaseDetails.justification}</p>
                </div>
              )}
            </div>

            {purchaseDetails.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-5 mb-6">
                <h3 className="text-sm font-semibold text-red-800 flex items-center gap-2 mb-3">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Rejection Reason
                </h3>
                <p className="text-sm text-red-700 leading-relaxed">{purchaseDetails.rejection_reason}</p>
              </div>
            )}

            {/* Materials Table */}
            <div className="bg-white border rounded-lg overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-5 py-3 border-b">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#243d8a]" />
                  Materials List
                  <Badge className="bg-[#243d8a]/10 text-[#243d8a] border-0">
                    {purchaseDetails.materials.length} items
                  </Badge>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item Details</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Unit</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Unit Cost</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {purchaseDetails.materials.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">No materials added to this request</p>
                        </td>
                      </tr>
                    ) : (
                      purchaseDetails.materials.map((material, index) => (
                        <motion.tr 
                          key={material.material_id || index} 
                          className="hover:bg-gray-50 transition-colors"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <td className="px-4 py-3 text-sm text-gray-500 font-medium">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="min-w-[200px]">
                              <p className="text-sm font-semibold text-gray-900">{material.item_name || material.description}</p>
                              {material.category && (
                                <p className="text-xs text-gray-600 mt-1">
                                  <span className="font-medium">Category:</span> {material.category}
                                </p>
                              )}
                              {material.specification && (
                                <p className="text-xs text-gray-500 mt-1">
                                  <span className="font-medium">Spec:</span> {material.specification}
                                </p>
                              )}
                              {material.design_reference && (
                                <p className="text-xs text-gray-500 mt-1">
                                  <span className="font-medium">Design Ref:</span> {material.design_reference}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-bold text-gray-900">{material.quantity}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm text-gray-600">{material.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm text-gray-700">AED {material.cost.toLocaleString()}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold text-[#243d8a]">
                              AED {(material.quantity * material.cost).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={`${getPriorityColor(material.priority || 'medium')} border text-xs font-medium`}>
                              {(material.priority || 'medium').toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs text-gray-600">
                              {material.required_date ? formatDateShort(material.required_date) : 'ASAP'}
                            </span>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2">
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-right">
                        <span className="text-sm font-semibold text-gray-600">Subtotal:</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm text-gray-700">
                          AED {purchaseDetails.total_amount.toLocaleString()}
                        </span>
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                    <tr className="border-t">
                      <td colSpan={5} className="px-4 py-4 text-right">
                        <span className="text-base font-bold text-gray-700">Total Amount:</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-xl font-bold text-[#243d8a]">
                          AED {purchaseDetails.total_amount.toLocaleString()}
                        </span>
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes */}
            {purchaseDetails.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Special Notes & Instructions
                </h3>
                <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{purchaseDetails.notes}</p>
              </div>
            )}
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