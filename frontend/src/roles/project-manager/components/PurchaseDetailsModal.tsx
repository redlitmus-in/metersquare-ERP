import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { projectManagerService, PurchaseStatusDetails } from '../services/projectManagerService';
import { toast } from 'sonner';
import {
  FileText,
  Building2,
  Calendar,
  User,
  Package,
  DollarSign,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  History,
  Download,
  Mail,
  Loader2,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';

interface PurchaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: number | null;
  mode?: 'details' | 'history';
}

const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({
  isOpen,
  onClose,
  purchaseId,
  mode = 'details'
}) => {
  const [statusDetails, setStatusDetails] = useState<PurchaseStatusDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(mode === 'history' ? 'history' : 'details');

  useEffect(() => {
    if (isOpen && purchaseId) {
      // Reset state when opening modal
      setStatusDetails(null);
      setLoading(true);
      fetchPurchaseData();
      // Set the active tab based on mode
      setActiveTab(mode === 'history' ? 'history' : 'details');
    } else {
      // Reset state when closing modal
      setStatusDetails(null);
      setLoading(false);
    }
  }, [isOpen, purchaseId, mode]);

  const fetchPurchaseData = async () => {
    if (!purchaseId) return;

    try {
      setLoading(true);
      
      if (mode === 'history') {
        // For history mode, fetch from /purchase_history/{id}
        const { purchase } = await projectManagerService.getPurchaseHistory(purchaseId);
        
        // Transform the purchase data to match PurchaseStatusDetails structure
        const details: PurchaseStatusDetails = {
          purchase_id: purchase.purchase_id,
          purchase_details: {
            site_location: purchase.site_location || 'Not specified',
            purpose: purchase.purpose || 'Not specified',
            date: purchase.date,
            email_sent: purchase.email_sent || false,
            created_at: purchase.created_at,
            requested_by: purchase.requested_by,
            project_id: purchase.project_id,
            materials_summary: {
              total_materials: purchase.materials?.length || 0,
              total_quantity: purchase.materials?.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0) || 0,
              total_cost: purchase.materials?.reduce((sum: number, m: any) => sum + ((m.quantity || 0) * (m.cost || 0)), 0) || 0,
              categories: [...new Set(purchase.materials?.map((m: any) => m.category).filter(Boolean) || [])],
              materials: purchase.materials || []
            }
          },
          procurement_statuses: purchase.approvals?.filter((a: any) => a.role === 'procurement') || [],
          project_manager_statuses: purchase.approvals?.filter((a: any) => a.role === 'projectManager') || [],
          latest_pm_proc_status: purchase.latest_status || purchase.approvals?.[purchase.approvals.length - 1] || {
            status: purchase.status || 'pending',
            role: null,
            date: null,
            decision_by: null,
            comments: null
          },
          summary: {
            total_procurement_statuses: purchase.approvals?.filter((a: any) => a.role === 'procurement').length || 0,
            total_pm_statuses: purchase.approvals?.filter((a: any) => a.role === 'projectManager').length || 0,
            pm_approved_count: purchase.approvals?.filter((a: any) => a.role === 'projectManager' && a.status === 'approved').length || 0,
            pm_rejected_count: purchase.approvals?.filter((a: any) => a.role === 'projectManager' && a.status === 'rejected').length || 0,
            pm_pending_count: 0,
            procurement_approved_count: purchase.approvals?.filter((a: any) => a.role === 'procurement' && a.status === 'approved').length || 0,
            procurement_rejected_count: purchase.approvals?.filter((a: any) => a.role === 'procurement' && a.status === 'rejected').length || 0,
            procurement_pending_count: 0
          }
        };
        setStatusDetails(details);
      } else {
        // For details mode, use /purchase/{id} endpoint
        const response = await projectManagerService.getPurchaseDetails(purchaseId);
        
        // Handle response structure from backend
        const purchase = response.purchase || response;
        const latestStatus = response.latest_status || purchase.latest_status;
        
        // Transform to PurchaseStatusDetails structure
        const details: PurchaseStatusDetails = {
          purchase_id: purchase.purchase_id,
          purchase_details: {
            site_location: purchase.site_location || 'Not specified',
            purpose: purchase.purpose || 'Not specified',
            date: purchase.date,
            email_sent: purchase.email_sent || false,
            created_at: purchase.created_at,
            requested_by: purchase.requested_by,
            project_id: purchase.project_id,
            materials_summary: {
              total_materials: purchase.materials?.length || 0,
              total_quantity: purchase.materials?.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0) || 0,
              total_cost: purchase.materials?.reduce((sum: number, m: any) => sum + ((m.quantity || 0) * (m.cost || 0)), 0) || 0,
              categories: [...new Set(purchase.materials?.map((m: any) => m.category).filter(Boolean) || [])],
              materials: purchase.materials || []
            }
          },
          procurement_statuses: [],
          project_manager_statuses: [],
          latest_pm_proc_status: latestStatus || {
            status: purchase.status || 'pending',
            sender: latestStatus?.sender,
            receiver: latestStatus?.receiver,
            role: latestStatus?.role,
            date: latestStatus?.decision_date || latestStatus?.created_at,
            decision_by: null,
            comments: latestStatus?.comments,
            rejection_reason: latestStatus?.rejection_reason
          },
          summary: {
            total_procurement_statuses: 0,
            total_pm_statuses: 0,
            pm_approved_count: 0,
            pm_rejected_count: 0,
            pm_pending_count: 0,
            procurement_approved_count: 0,
            procurement_rejected_count: 0,
            procurement_pending_count: 0
          }
        };
        setStatusDetails(details);
      }
    } catch (error: any) {
      console.error('Error fetching purchase data:', error);
      toast.error('Failed to fetch purchase details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'under_review':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'under_review':
      case 'in_progress':
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'procurement':
        return <Package className="h-4 w-4" />;
      case 'projectManager':
        return <User className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleExport = () => {
    if (!statusDetails) return;
    
    const data = JSON.stringify(statusDetails, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PR_${statusDetails.purchase_id}_details.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Purchase details exported successfully');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString()}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Purchase Request Details
              {statusDetails && (
                <Badge className="ml-2">
                  PR-{statusDetails.purchase_id}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {statusDetails && (
                <>
                  <Badge className={`${getStatusColor(statusDetails.latest_pm_proc_status?.status)} border`}>
                    {(statusDetails.latest_pm_proc_status?.status || 'pending').toUpperCase()}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    title="Export"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : statusDetails ? (
          <div className="flex-1 overflow-hidden flex flex-col px-6 pb-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className={`grid w-full ${mode === 'history' ? 'grid-cols-1' : 'grid-cols-3'} mt-4 mb-4`}>
                {mode === 'history' ? (
                  <TabsTrigger value="history">Approval History</TabsTrigger>
                ) : (
                  <>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="materials">Materials</TabsTrigger>
                    <TabsTrigger value="details">Additional Info</TabsTrigger>
                  </>
                )}
              </TabsList>

              {/* Overview Tab */}
              {mode !== 'history' && (
                <TabsContent value="overview" className="flex-1 overflow-hidden mt-0">
                  <div className="h-full overflow-y-auto pr-2 space-y-6">
                    {/* Purchase Overview Section */}
                    <div className="bg-white border rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Purchase Overview
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Location</label>
                            <div className="flex items-center gap-2 mt-1">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{statusDetails.purchase_details?.site_location}</span>
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Purpose</label>
                            <p className="font-medium mt-1">{statusDetails.purchase_details?.purpose}</p>
                          </div>
                          
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Requested By</label>
                            <div className="flex items-center gap-2 mt-1">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{statusDetails.purchase_details?.requested_by || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Right Column */}
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Created Date</label>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">
                                {formatDate(statusDetails.purchase_details?.created_at || statusDetails.purchase_details?.date || null)}
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Project ID</label>
                            <div className="flex items-center gap-2 mt-1">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">#{statusDetails.purchase_details?.project_id || 'N/A'}</span>
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Email Status</label>
                            <div className="mt-1">
                              <Badge variant={statusDetails.purchase_details?.email_sent ? 'default' : 'outline'} className="gap-1">
                                <Mail className="w-3 h-3" />
                                {statusDetails.purchase_details?.email_sent ? 'Sent' : 'Not Sent'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-5 w-5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">Materials</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">
                          {statusDetails.purchase_details?.materials_summary?.total_materials || 0}
                        </p>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-green-900">Quantity</span>
                        </div>
                        <p className="text-2xl font-bold text-green-900">
                          {statusDetails.purchase_details?.materials_summary?.total_quantity || 0}
                        </p>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-5 w-5 text-purple-600" />
                          <span className="text-sm font-medium text-purple-900">Total Cost</span>
                        </div>
                        <p className="text-xl font-bold text-purple-900">
                          {formatCurrency(statusDetails.purchase_details?.materials_summary?.total_cost || 0)}
                        </p>
                      </div>
                      
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-orange-600" />
                          <span className="text-sm font-medium text-orange-900">Categories</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-900">
                          {statusDetails.purchase_details?.materials_summary?.categories?.length || 0}
                        </p>
                      </div>
                    </div>

                    {/* Current Status */}
                    {statusDetails.latest_pm_proc_status && (
                      <div className="bg-white border rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-4">Current Status</h3>
                        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                          {getStatusIcon(statusDetails.latest_pm_proc_status.status)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">
                                {statusDetails.latest_pm_proc_status.sender ? 
                                  `From: ${statusDetails.latest_pm_proc_status.sender.charAt(0).toUpperCase() + statusDetails.latest_pm_proc_status.sender.slice(1)}` : 
                                  'Status'}
                              </span>
                              {statusDetails.latest_pm_proc_status.receiver && (
                                <span className="text-gray-500">→ {statusDetails.latest_pm_proc_status.receiver.charAt(0).toUpperCase() + statusDetails.latest_pm_proc_status.receiver.slice(1)}</span>
                              )}
                              <Badge className={`${getStatusColor(statusDetails.latest_pm_proc_status.status)} border ml-auto`}>
                                {(statusDetails.latest_pm_proc_status.status || 'pending').toUpperCase()}
                              </Badge>
                            </div>
                            {statusDetails.latest_pm_proc_status.comments && (
                              <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded mt-2">
                                <MessageSquare className="w-3 h-3 inline mr-1" />
                                {statusDetails.latest_pm_proc_status.comments}
                              </p>
                            )}
                            {statusDetails.latest_pm_proc_status.rejection_reason && (
                              <p className="text-sm text-red-600 bg-red-50 p-2 rounded mt-2">
                                <AlertTriangle className="w-3 h-3 inline mr-1" />
                                {statusDetails.latest_pm_proc_status.rejection_reason}
                              </p>
                            )}
                            {statusDetails.latest_pm_proc_status.date && (
                              <p className="text-xs text-gray-500 mt-2">
                                {formatDate(statusDetails.latest_pm_proc_status.date)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

              {/* Details Tab (Additional Info) */}
              {mode !== 'history' && (
                <TabsContent value="details" className="flex-1 overflow-hidden mt-0">
                  <div className="h-full overflow-y-auto pr-2 space-y-6">
                    <div className="bg-white border rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-4">Additional Information</h3>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Purchase ID</label>
                            <p className="font-medium mt-1">PR-{statusDetails.purchase_id}</p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Status</label>
                            <Badge className={`${getStatusColor(statusDetails.latest_pm_proc_status?.status)} border mt-1`}>
                              {(statusDetails.latest_pm_proc_status?.status || 'pending').toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        
                        {statusDetails.purchase_details?.created_at && (
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Created At</label>
                            <p className="font-medium mt-1">{formatDate(statusDetails.purchase_details.created_at)}</p>
                          </div>
                        )}
                        
                        {statusDetails.purchase_details?.date && statusDetails.purchase_details.date !== statusDetails.purchase_details.created_at && (
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Request Date</label>
                            <p className="font-medium mt-1">{formatDate(statusDetails.purchase_details.date)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Categories Breakdown */}
                    {statusDetails.purchase_details?.materials_summary?.categories && statusDetails.purchase_details.materials_summary.categories.length > 0 && (
                      <div className="bg-white border rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
                        <div className="flex flex-wrap gap-2">
                          {statusDetails.purchase_details.materials_summary.categories.map((category, idx) => (
                            <Badge key={idx} variant="outline" className="px-3 py-1">
                              {category}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

              {/* Materials Tab */}
              {mode !== 'history' && (
                <TabsContent value="materials" className="flex-1 overflow-hidden mt-0">
                  <div className="h-full overflow-y-auto pr-2">
                    {statusDetails.purchase_details?.materials_summary?.materials && 
                     statusDetails.purchase_details?.materials_summary?.materials.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid gap-3">
                          {statusDetails.purchase_details?.materials_summary?.materials?.map((material, idx) => (
                            <div key={material.material_id || idx} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 text-lg">
                                    {material.description || `Material ${idx + 1}`}
                                  </h4>
                                  {material.specification && (
                                    <p className="text-sm text-gray-600 mt-1">{material.specification}</p>
                                  )}
                                </div>
                                <div className="flex gap-2 ml-4">
                                  {material.category && (
                                    <Badge variant="outline" className="bg-blue-50">
                                      {material.category}
                                    </Badge>
                                  )}
                                  {material.priority && (
                                    <Badge className={getPriorityColor(material.priority)}>
                                      {material.priority.toUpperCase()}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                                <div>
                                  <label className="text-xs text-gray-500 uppercase tracking-wide">Quantity</label>
                                  <p className="font-semibold text-gray-900 mt-1">
                                    {material.quantity || 0} {material.unit || 'units'}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 uppercase tracking-wide">Unit Cost</label>
                                  <p className="font-semibold text-gray-900 mt-1">
                                    {formatCurrency(material.cost || 0)}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 uppercase tracking-wide">Total Cost</label>
                                  <p className="font-semibold text-green-600 mt-1">
                                    {formatCurrency((material.quantity || 0) * (material.cost || 0))}
                                  </p>
                                </div>
                                {material.design_reference && (
                                  <div>
                                    <label className="text-xs text-gray-500 uppercase tracking-wide">Design Ref</label>
                                    <p className="font-medium text-gray-900 mt-1">
                                      {material.design_reference}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Total Summary */}
                        <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-sm text-green-700">Total Purchase Amount</span>
                              <p className="text-3xl font-bold text-green-900">
                                {formatCurrency(statusDetails.purchase_details?.materials_summary?.total_cost || 0)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-green-700">
                                {statusDetails.purchase_details?.materials_summary?.total_materials || 0} Materials
                              </p>
                              <p className="text-sm text-green-700">
                                {statusDetails.purchase_details?.materials_summary?.total_quantity || 0} Total Units
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500 font-medium">No materials found</p>
                        <p className="text-sm text-gray-400 mt-1">Materials will appear here once added</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

              {/* History Tab - Only shown in history mode */}
              {mode === 'history' && (
                <TabsContent value="history" className="flex-1 overflow-y-auto mt-0" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                <div className="pr-2 pb-4">
                  {/* Combined History */}
                  {((statusDetails.procurement_statuses?.length || 0) > 0 || (statusDetails.project_manager_statuses?.length || 0) > 0) ? (
                    <div className="space-y-4">
                      {[...(statusDetails.procurement_statuses || []), ...(statusDetails.project_manager_statuses || [])]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((status, idx) => {
                          const getRoleName = (role: string) => {
                            const roleMap: { [key: string]: string } = {
                              'projectManager': 'Project Manager',
                              'procurement': 'Procurement',
                              'estimation': 'Estimation',
                              'technicalDirector': 'Technical Director',
                              'accounts': 'Accounts',
                              'siteSupervisor': 'Site Supervisor',
                              'design': 'Design'
                            };
                            
                            return roleMap[role] || role
                              .replace(/([A-Z])/g, ' $1')
                              .replace(/_/g, ' ')
                              .trim()
                              .split(' ')
                              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                              .join(' ');
                          };

                          const allStatuses = [...(statusDetails.procurement_statuses || []), ...(statusDetails.project_manager_statuses || [])];
                          const isLast = idx === allStatuses.length - 1;

                          return (
                            <div key={idx} className="relative">
                              {!isLast && (
                                <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200" />
                              )}
                              <div className="flex gap-4">
                                <div className="flex-shrink-0">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    status.status === 'approved' ? 'bg-green-100' :
                                    status.status === 'rejected' ? 'bg-red-100' :
                                    'bg-yellow-100'
                                  }`}>
                                    {getStatusIcon(status.status)}
                                  </div>
                                </div>
                                <div className="flex-1 bg-white border rounded-lg p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h4 className="font-medium text-gray-900">
                                        {getRoleName(status.role)}
                                      </h4>
                                      {status.decision_by && (
                                        <p className="text-sm text-gray-500">
                                          {status.decision_by.full_name}
                                        </p>
                                      )}
                                    </div>
                                    <Badge className={`${getStatusColor(status.status)} border`}>
                                      {status.status.toUpperCase()}
                                    </Badge>
                                  </div>
                                  
                                  {status.comments && (
                                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded mt-3">
                                      <div className="flex items-center gap-2 text-sm font-medium text-blue-900 mb-1">
                                        <MessageSquare className="h-4 w-4" />
                                        Comments
                                      </div>
                                      <p className="text-sm text-blue-800 pl-6">{status.comments}</p>
                                    </div>
                                  )}
                                  
                                  {status.rejection_reason && (
                                    <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded mt-3">
                                      <div className="flex items-center gap-2 text-sm font-medium text-red-900 mb-1">
                                        <AlertTriangle className="h-4 w-4" />
                                        Rejection Reason
                                      </div>
                                      <p className="text-sm text-red-800 pl-6">{status.rejection_reason}</p>
                                    </div>
                                  )}
                                  
                                  <p className="text-xs text-gray-500 mt-2">
                                    {formatDate(status.date)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No approval history available</p>
                      <p className="text-sm mt-1">Approval history will appear here once processing begins</p>
                    </div>
                  )}

                  {/* Summary Stats */}
                  {statusDetails?.summary && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Summary Statistics</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-xl font-bold text-blue-600">
                            {statusDetails.summary?.total_procurement_statuses || 0}
                          </p>
                          <p className="text-xs text-gray-600">Procurement Reviews</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-bold text-purple-600">
                            {statusDetails.summary?.total_pm_statuses || 0}
                          </p>
                          <p className="text-xs text-gray-600">PM Reviews</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-bold text-green-600">
                            {statusDetails.summary?.pm_approved_count || 0}
                          </p>
                          <p className="text-xs text-gray-600">PM Approvals</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-bold text-red-600">
                            {statusDetails.summary?.pm_rejected_count || 0}
                          </p>
                          <p className="text-xs text-gray-600">PM Rejections</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              )}
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No purchase data available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseDetailsModal;