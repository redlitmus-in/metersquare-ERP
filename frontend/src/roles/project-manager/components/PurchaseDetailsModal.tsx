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
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { projectManagerService, PurchaseStatusDetails } from '../services/projectManagerService';
import { toast } from 'sonner';
import { exportPurchaseDetailsPDF } from '@/utils/exportUtils';
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
  AlertTriangle,
  Hash,
  UserCheck,
  CalendarCheck,
  FileCheck,
  ArrowRight,
  Info,
  TrendingUp,
  Layers,
  Shield,
  Activity,
  Target
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
            comments: null,
            status_id: null,
            is_active: false,
            created_at: null,
            last_modified_at: null
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
          latest_pm_proc_status: latestStatus ? {
            status: latestStatus.status || purchase.status || 'pending',
            sender: latestStatus.sender || null,
            receiver: latestStatus.receiver || null,
            role: latestStatus.role || null,
            date: latestStatus.decision_date || latestStatus.created_at || null,
            decision_by: latestStatus.created_by || latestStatus.decision_by || null,
            comments: latestStatus.comments || null,
            rejection_reason: latestStatus.rejection_reason || null,
            status_id: latestStatus.status_id || null,
            is_active: latestStatus.is_active || false,
            created_at: latestStatus.created_at || purchase.created_at || null,
            last_modified_at: latestStatus.last_modified_at || latestStatus.created_at || null
          } : {
            status: purchase.status || 'pending',
            sender: null,
            receiver: null,
            role: null,
            date: purchase.created_at || null,
            decision_by: purchase.created_by || null,
            comments: null,
            rejection_reason: null,
            status_id: null,
            is_active: false,
            created_at: purchase.created_at || null,
            last_modified_at: purchase.last_modified_at || purchase.created_at || null
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
      console.error('Purchase ID:', purchaseId);
      console.error('Mode:', mode);
      console.error('Response error:', error.response);
      toast.error(error.message || 'Failed to fetch purchase details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'complete':
      case 'completed':
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
      case 'complete':
      case 'completed':
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

  const formatStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'approved': 'APPROVED',
      'complete': 'COMPLETED',
      'completed': 'COMPLETED',
      'rejected': 'REJECTED',
      'pending': 'PENDING',
      'under_review': 'UNDER REVIEW',
      'in_progress': 'IN PROGRESS'
    };
    return statusMap[status?.toLowerCase()] || status?.toUpperCase() || 'PENDING';
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
      <DialogContent className="max-w-5xl max-h-[95vh] h-[95vh] overflow-hidden flex flex-col p-0 bg-gray-50">
        <DialogHeader className="px-6 py-5 bg-gradient-to-r from-blue-600 to-blue-700 flex-shrink-0 shadow-lg">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-white text-lg font-semibold">Purchase Request Details</h2>
                {statusDetails && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                      <Hash className="w-3 h-3 mr-1" />
                      PR-{statusDetails.purchase_id}
                    </Badge>
                    <Badge className={`${getStatusColor(
                      statusDetails.latest_pm_proc_status?.status === 'approved' && 
                      statusDetails.latest_pm_proc_status?.comments?.toLowerCase().includes('acknowledgement') 
                        ? 'completed' 
                        : statusDetails.latest_pm_proc_status?.status
                    )} border`}>
                      {getStatusIcon(
                        statusDetails.latest_pm_proc_status?.status === 'approved' && 
                        statusDetails.latest_pm_proc_status?.comments?.toLowerCase().includes('acknowledgement') 
                          ? 'completed' 
                          : statusDetails.latest_pm_proc_status?.status
                      )}
                      <span className="ml-1">{statusDetails.latest_pm_proc_status?.status === 'approved' && 
                        statusDetails.latest_pm_proc_status?.comments?.toLowerCase().includes('acknowledgement') 
                          ? 'COMPLETED' 
                          : formatStatusText(statusDetails.latest_pm_proc_status?.status || 'pending')}</span>
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {statusDetails && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExport}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Export PDF
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center flex-1 bg-white">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading purchase details...</p>
            </div>
          </div>
        ) : statusDetails ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-white border-b px-6 pt-4">
                <TabsList className={`grid w-full ${mode === 'history' ? 'grid-cols-1' : 'grid-cols-3'} max-w-2xl mx-auto bg-gray-100`}>
                  {mode === 'history' ? (
                    <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <History className="w-4 h-4 mr-2" />
                      History
                    </TabsTrigger>
                  ) : (
                    <>
                      <TabsTrigger value="details" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Info className="w-4 h-4 mr-2" />
                        Details
                      </TabsTrigger>
                      <TabsTrigger value="materials" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Package className="w-4 h-4 mr-2" />
                        Materials
                      </TabsTrigger>
                      <TabsTrigger value="status" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Activity className="w-4 h-4 mr-2" />
                        Latest Status
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>
              </div>

              {/* Details Tab */}
              {mode !== 'history' && (
                <TabsContent value="details" className="flex-1 overflow-hidden mt-0 bg-white">
                  <div className="h-full overflow-y-auto p-6">
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-blue-600 font-medium">Total Amount</p>
                                <p className="text-2xl font-bold text-blue-900 mt-1">
                                  AED {(statusDetails.purchase_details?.materials_summary?.total_cost || 0).toLocaleString()}
                                </p>
                              </div>
                              <div className="p-3 bg-blue-200/30 rounded-lg">
                                <DollarSign className="w-6 h-6 text-blue-700" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-purple-600 font-medium">Materials</p>
                                <p className="text-2xl font-bold text-purple-900 mt-1">
                                  {statusDetails.purchase_details?.materials_summary?.total_materials || 0} Items
                                </p>
                              </div>
                              <div className="p-3 bg-purple-200/30 rounded-lg">
                                <Package className="w-6 h-6 text-purple-700" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-green-600 font-medium">Email Status</p>
                                <p className="text-lg font-bold text-green-900 mt-1">
                                  {statusDetails.purchase_details?.email_sent ? 'Sent ✓' : 'Pending'}
                                </p>
                              </div>
                              <div className="p-3 bg-green-200/30 rounded-lg">
                                <Mail className="w-6 h-6 text-green-700" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Basic Information */}
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Info className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                          </div>
                      
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <Building2 className="w-5 h-5 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Project ID</p>
                                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{statusDetails.purchase_details?.project_id || 'N/A'}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <UserCheck className="w-5 h-5 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Requested By</p>
                                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{statusDetails.purchase_details?.requested_by || 'N/A'}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Site Location</p>
                                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{statusDetails.purchase_details?.site_location || 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <CalendarCheck className="w-5 h-5 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Request Date</p>
                                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                    {formatDate(statusDetails.purchase_details?.created_at || statusDetails.purchase_details?.date || null)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <User className="w-5 h-5 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Created By</p>
                                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{statusDetails.purchase_details?.requested_by || 'System'}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Email Status</p>
                                  <Badge variant={statusDetails.purchase_details?.email_sent ? 'default' : 'outline'} className="mt-1">
                                    {statusDetails.purchase_details?.email_sent ? 'Sent ✓' : 'Not Sent'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Purpose */}
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-amber-100 rounded-lg">
                              <Target className="w-5 h-5 text-amber-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Purpose</h3>
                          </div>
                          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
                            <p className="text-sm text-gray-800 leading-relaxed">
                              {statusDetails.purchase_details?.purpose || 'No purpose specified'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                    </motion.div>
                  </div>
                </TabsContent>
              )}

              {/* Status Tab */}
              {mode !== 'history' && (
                <TabsContent value="status" className="flex-1 overflow-hidden mt-0 bg-white">
                  <div className="h-full overflow-y-auto p-6">
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Current Status Information */}
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Activity className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Current Status Information</h3>
                          </div>
                          
                          {statusDetails.latest_pm_proc_status && (
                            <div className="space-y-6">
                              {/* Status Badge */}
                              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-gray-600">CURRENT STATUS</span>
                                  <Badge className={`${getStatusColor(
                                    statusDetails.latest_pm_proc_status.status === 'approved' && 
                                    statusDetails.latest_pm_proc_status.comments?.toLowerCase().includes('acknowledgement') 
                                      ? 'completed' 
                                      : statusDetails.latest_pm_proc_status.status
                                  )} border px-4 py-1.5`}>
                                    {getStatusIcon(
                                      statusDetails.latest_pm_proc_status.status === 'approved' && 
                                      statusDetails.latest_pm_proc_status.comments?.toLowerCase().includes('acknowledgement') 
                                        ? 'completed' 
                                        : statusDetails.latest_pm_proc_status.status
                                    )}
                                    <span className="ml-1.5 font-semibold">{statusDetails.latest_pm_proc_status.status === 'approved' && 
                                      statusDetails.latest_pm_proc_status.comments?.toLowerCase().includes('acknowledgement') 
                                        ? 'COMPLETED' 
                                        : formatStatusText(statusDetails.latest_pm_proc_status.status || 'pending')}</span>
                                  </Badge>
                                  {statusDetails.latest_pm_proc_status.is_active && (
                                    <Badge className="bg-green-100 text-green-700 border-green-200">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Active
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Status ID</p>
                                  <p className="font-semibold text-gray-900">#{statusDetails.latest_pm_proc_status.status_id || 'N/A'}</p>
                                </div>
                              </div>
                              
                              {/* Decision Information */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="border-0 bg-blue-50">
                                  <CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <UserCheck className="w-4 h-4 text-blue-600" />
                                      <h4 className="font-medium text-blue-900">Decision Information</h4>
                                    </div>
                                    <div className="space-y-2">
                                      <div>
                                        <p className="text-xs text-blue-600">Current Role</p>
                                        <p className="font-semibold text-blue-900">{statusDetails.latest_pm_proc_status.role || 'N/A'}</p>
                                      </div>
                                      {statusDetails.latest_pm_proc_status.decision_by && (
                                        <div>
                                          <p className="text-xs text-blue-600">Decision By</p>
                                          <p className="font-semibold text-blue-900">{statusDetails.latest_pm_proc_status.decision_by}</p>
                                        </div>
                                      )}
                                      {statusDetails.latest_pm_proc_status.date && (
                                        <div>
                                          <p className="text-xs text-blue-600">Decision Date</p>
                                          <p className="font-semibold text-blue-900">{formatDate(statusDetails.latest_pm_proc_status.date)}</p>
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                                
                                <Card className="border-0 bg-purple-50">
                                  <CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <ArrowRight className="w-4 h-4 text-purple-600" />
                                      <h4 className="font-medium text-purple-900">Workflow Path</h4>
                                    </div>
                                    <div className="space-y-2">
                                      {statusDetails.latest_pm_proc_status.sender && (
                                        <div>
                                          <p className="text-xs text-purple-600">From (Sender)</p>
                                          <p className="font-semibold text-purple-900">{statusDetails.latest_pm_proc_status.sender}</p>
                                        </div>
                                      )}
                                      {statusDetails.latest_pm_proc_status.receiver && (
                                        <div>
                                          <p className="text-xs text-purple-600">To (Receiver)</p>
                                          <p className="font-semibold text-purple-900">{statusDetails.latest_pm_proc_status.receiver}</p>
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-xs text-purple-600">Purchase ID</p>
                                        <p className="font-semibold text-purple-900">PR-{statusDetails.purchase_id}</p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                              
                              {/* Comments */}
                              {statusDetails.latest_pm_proc_status.comments && (
                                <Card className="border-0 bg-amber-50">
                                  <CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <MessageSquare className="w-4 h-4 text-amber-600" />
                                      <h4 className="font-medium text-amber-900">Comments</h4>
                                    </div>
                                    <p className="text-sm text-amber-800 italic">
                                      "{statusDetails.latest_pm_proc_status.comments}"
                                    </p>
                                  </CardContent>
                                </Card>
                              )}
                              
                              {/* Rejection Reason */}
                              {statusDetails.latest_pm_proc_status.rejection_reason && (
                                <Card className="border-0 bg-red-50">
                                  <CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <AlertTriangle className="w-4 h-4 text-red-600" />
                                      <h4 className="font-medium text-red-900">Rejection Reason</h4>
                                    </div>
                                    <p className="text-sm text-red-800">
                                      {statusDetails.latest_pm_proc_status.rejection_reason}
                                    </p>
                                  </CardContent>
                                </Card>
                              )}
                              
                              {/* Timeline */}
                              <Card className="border-0 shadow-sm">
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-2 mb-4">
                                    <Clock className="w-4 h-4 text-gray-600" />
                                    <h4 className="font-medium text-gray-900">Timeline</h4>
                                  </div>
                                  <div className="space-y-2 border-l-2 border-gray-200 pl-4 ml-2">
                                    {statusDetails.purchase_details?.created_at && (
                                      <div className="relative">
                                        <div className="absolute -left-6 w-3 h-3 bg-gray-400 rounded-full" />
                                        <div className="flex justify-between">
                                          <span className="text-sm text-gray-600">Created At</span>
                                          <span className="text-sm font-medium">{formatDate(statusDetails.purchase_details.created_at)}</span>
                                        </div>
                                      </div>
                                    )}
                                    {statusDetails.latest_pm_proc_status?.last_modified_at && (
                                      <div className="relative">
                                        <div className="absolute -left-6 w-3 h-3 bg-blue-600 rounded-full" />
                                        <div className="flex justify-between">
                                          <span className="text-sm text-gray-600">Last Modified</span>
                                          <span className="text-sm font-medium">{formatDate(statusDetails.latest_pm_proc_status.last_modified_at)}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
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
                                    status.status === 'approved' || status.status === 'complete' || status.status === 'completed' ? 'bg-green-100' :
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
                                      {formatStatusText(status.status)}
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