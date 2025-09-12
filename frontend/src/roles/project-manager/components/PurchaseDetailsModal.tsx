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
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import { exportPurchaseDetailsPDF } from '@/utils/exportUtils';
import { API_ENDPOINTS, API_BASE_URL } from '@/api/config';
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
  ,
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
  Target,
  Paperclip,
  ExternalLink,
  X
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
  const [downloadingFile, setDownloadingFile] = useState(false);

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
            file_path: purchase.file_path || null,
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
        
        // Handle response structure from backend - the API returns {purchase: {...}, latest_status: {...}}
        const purchase = response.purchase;
        const latestStatus = response.latest_status;
        
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
            file_path: purchase.file_path || null,
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
          latest_pm_proc_status: latestStatus && Object.keys(latestStatus).length > 0 ? {
            status: latestStatus.status || purchase.status || 'pending',
            sender: latestStatus.sender || null,
            receiver: latestStatus.receiver || null,
            role: latestStatus.role || null,
            date: latestStatus.decision_date || latestStatus.created_at || null,
            decision_date: latestStatus.decision_date || null,
            decision_by: latestStatus.created_by || latestStatus.decision_by || null,
            created_by: latestStatus.created_by || null,
            comments: latestStatus.comments || null,
            rejection_reason: latestStatus.rejection_reason || null,
            reject_category: latestStatus.reject_category || null,
            status_id: latestStatus.status_id || null,
            is_active: latestStatus.is_active !== undefined ? latestStatus.is_active : false,
            created_at: latestStatus.created_at || purchase.created_at || null,
            last_modified_at: latestStatus.last_modified_at || latestStatus.created_at || null,
            decision_by_user_id: latestStatus.decision_by_user_id || null
          } : {
            status: purchase.status || 'pending',
            sender: null,
            receiver: null,
            role: null,
            date: purchase.created_at || null,
            decision_date: null,
            decision_by: purchase.created_by || null,
            created_by: purchase.created_by || null,
            comments: null,
            rejection_reason: null,
            reject_category: null,
            status_id: null,
            is_active: false,
            created_at: purchase.created_at || null,
            last_modified_at: purchase.last_modified_at || purchase.created_at || null,
            decision_by_user_id: null
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
      
      // Show user-friendly error message
      if (error.message?.includes('not found')) {
        toast.error(`Purchase request PR-${purchaseId} not found`, {
          description: 'This purchase may have been deleted or the ID is incorrect.'
        });
      } else {
        toast.error(error.message || 'Failed to fetch purchase details');
      }
      
      // Close modal on error
      if (error.response?.status === 404) {
        setTimeout(() => {
          onClose();
        }, 2000);
      }
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

  const handleViewAttachment = async () => {
    if (!statusDetails?.purchase_id) return;
    
    setDownloadingFile(true);
    
    try {
      toast.info('Fetching attachment...');
      
      // First, fetch the file information from the API
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.DOWNLOAD_FILES('projectManager', statusDetails.purchase_id)}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      );
      
      const data = await response.json();
      
      if (data.success && data.purchase_files && data.purchase_files.length > 0) {
        // Get the first purchase file
        const file = data.purchase_files[0];
        
        // Use the public_url from the response if available
        const fileDownloadUrl = file.public_url || `${API_BASE_URL}/download_file/${file.file_path}`;
        
        // Create a hidden anchor element with download attribute to force download
        const link = document.createElement('a');
        link.href = fileDownloadUrl;
        link.download = file.file_path?.split('/').pop() || 'attachment'; // Force download with filename
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Downloading attachment...');
      } else if (data.accounts_files && data.accounts_files.length > 0) {
        // Handle accounts files if present
        toast.info('This purchase has accounts-related files. Please check with the Accounts department.');
      } else {
        toast.warning('No attachments found for this purchase.');
      }
    } catch (error) {
      console.error('Error fetching attachment:', error);
      
      // Fallback: Try direct download using the file_path from purchase details
      if (statusDetails.purchase_details?.file_path) {
        // Try to fetch the file info again to get public_url
        try {
          const fallbackResponse = await fetch(
            `${API_BASE_URL}/api/get_file_url/${statusDetails.purchase_id}`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
              }
            }
          );
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            if (fallbackData.public_url) {
              const link = document.createElement('a');
              link.href = fallbackData.public_url;
              link.download = statusDetails.purchase_details.file_path?.split('/').pop() || 'attachment';
              link.style.display = 'none';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              toast.info('Downloading attachment...');
              return;
            }
          }
        } catch (e) {
          console.error('Fallback URL fetch failed:', e);
        }
        
        // Last resort: try direct file path
        const directUrl = `${API_BASE_URL}/uploads/${statusDetails.purchase_details.file_path}`;
        const fileName = statusDetails.purchase_details.file_path.split('/').pop() || 'attachment';
        const link = document.createElement('a');
        link.href = directUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.info('Downloading attachment...');
      } else {
        toast.error('Failed to download attachment. Please try again later.');
      }
    } finally {
      setDownloadingFile(false);
    }
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

  // Determine the current workflow status and location
  const getWorkflowStatus = () => {
    const latestStatus = statusDetails?.latest_pm_proc_status;
    
    if (!latestStatus) {
      return { status: 'pending', text: 'PENDING', description: 'Awaiting initial review' };
    }

    const status = latestStatus.status?.toLowerCase();
    const sender = latestStatus.sender;
    const receiver = latestStatus.receiver;
    const comments = latestStatus.comments?.toLowerCase();

    // Format role names for display
    const formatRole = (role: string) => {
      if (!role) return '';
      const roleMap: { [key: string]: string } = {
        'procurement': 'Procurement',
        'projectManager': 'Project Manager',
        'projectmanager': 'Project Manager',
        'estimation': 'Estimation',
        'technicalDirector': 'Technical Director',
        'technicaldirector': 'Technical Director',
        'accounts': 'Accounts',
        'siteSupervisor': 'Site Supervisor',
        'sitesupervisor': 'Site Supervisor',
        'mepSupervisor': 'MEP Supervisor',
        'mepsupervisor': 'MEP Supervisor',
        'design': 'Design'
      };
      return roleMap[role.toLowerCase()] || role.replace(/([A-Z])/g, ' $1').trim();
    };

    // Check if it's completed (acknowledgement from accounts or status is explicitly completed)
    if (status === 'completed' || status === 'complete') {
      let description = 'Purchase request has been fully processed and completed';
      if (comments?.includes('acknowledgement')) {
        description = 'Purchase order acknowledged and completed by Accounts';
      }
      return { 
        status: 'completed', 
        text: 'COMPLETED', 
        description 
      };
    }

    // If status is approved
    if (status === 'approved') {
      // Check if it's final approval from accounts with acknowledgement
      if (sender === 'accounts' && comments?.includes('acknowledgement')) {
        return { 
          status: 'completed', 
          text: 'COMPLETED', 
          description: 'Purchase order acknowledged and completed by Accounts' 
        };
      }
      
      const senderName = sender ? formatRole(sender) : '';
      return { 
        status: 'approved', 
        text: 'APPROVED', 
        description: senderName ? `Approved by ${senderName}` : 'Approved' 
      };
    }

    // If there's a receiver, it's pending at that role
    if (receiver) {
      const receiverName = formatRole(receiver);
      if (status === 'rejected' && sender) {
        const senderName = formatRole(sender);
        return { 
          status: 'rejected', 
          text: 'REJECTED', 
          description: `Rejected by ${senderName}, returned to ${receiverName}` 
        };
      }
      return { 
        status: 'pending', 
        text: 'PENDING', 
        description: `Currently pending review at ${receiverName}` 
      };
    }

    // If rejected without receiver
    if (status === 'rejected' && sender) {
      const senderName = formatRole(sender);
      return { 
        status: 'rejected', 
        text: 'REJECTED', 
        description: `Rejected by ${senderName}` 
      };
    }

    // Default case
    return { 
      status: status || 'pending', 
      text: formatStatusText(status || 'pending'), 
      description: 'Processing in workflow' 
    };
  };

  const workflowStatus = statusDetails ? getWorkflowStatus() : { status: 'pending', text: 'PENDING', description: 'Loading...' };

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
      <DialogContent className="max-w-4xl h-[85vh] w-[90vw] sm:w-full flex flex-col p-0 bg-gray-50 m-auto">
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-[#243d8a] to-[#1e3470] flex-shrink-0 shadow-lg">
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
                    <Badge className={`${getStatusColor(workflowStatus.status)} border`}>
                      {getStatusIcon(workflowStatus.status)}
                      <span className="ml-1">{workflowStatus.text}</span>
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        {/* Custom Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-50 p-1 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur transition-all duration-200 group"
          aria-label="Close modal"
        >
          <X className="w-3.5 h-3.5 text-white group-hover:text-white/80" />
        </button>

        {loading ? (
          <div className="flex items-center justify-center flex-1 bg-white">
            <div className="text-center">
              <ModernLoadingSpinners variant="pulse-wave" size="lg" />
              <p className="text-sm text-gray-600 mt-2">Loading purchase details...</p>
            </div>
          </div>
        ) : statusDetails ? (
          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
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
                <TabsContent value="details" className="mt-0 bg-white">
                  <div className="p-6">
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

                      {/* Attachment Section - Show only if file_path exists */}
                      {statusDetails.purchase_details?.file_path && (
                        <Card className="border-0 shadow-sm">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="p-2 bg-red-100 rounded-lg">
                                <Paperclip className="w-5 h-5 text-red-600" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900">Attachment</h3>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 rounded-lg">
                                  <FileText className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {statusDetails.purchase_details.file_path.split('/').pop() || 'Purchase Document'}
                                  </p>
                                  <p className="text-xs text-gray-500">Click to download the attached document</p>
                                </div>
                              </div>
                              <Button
                                onClick={handleViewAttachment}
                                variant="outline"
                                size="sm"
                                disabled={downloadingFile}
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {downloadingFile ? (
                                  <>
                                    <ModernLoadingSpinners variant="pulse-wave" size="sm" />
                                    Downloading...
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                    </motion.div>
                  </div>
                </TabsContent>
              )}

              {/* Status Tab */}
              {mode !== 'history' && (
                <TabsContent value="status" className="mt-0 bg-white">
                  <div className="p-6">
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
                              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Current Status</p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge className={`${getStatusColor(workflowStatus.status)} border text-sm py-1 px-3`}>
                                        {getStatusIcon(workflowStatus.status)}
                                        <span className="ml-1">{workflowStatus.text}</span>
                                      </Badge>
                                      {statusDetails.latest_pm_proc_status.is_active && (
                                        <Badge className="bg-green-100 text-green-700 border-green-200">
                                          <Activity className="w-3 h-3 mr-1" />
                                          Active
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2 italic">{workflowStatus.description}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500">Status ID</p>
                                    <p className="font-mono text-sm font-semibold text-gray-700">#{statusDetails.latest_pm_proc_status.status_id}</p>
                                  </div>
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
                                      {statusDetails.latest_pm_proc_status.role && (
                                        <div>
                                          <p className="text-xs text-blue-600">Current Role</p>
                                          <p className="font-semibold text-blue-900 capitalize">
                                            {statusDetails.latest_pm_proc_status.role === 'accounts' ? 'Accounts' :
                                             statusDetails.latest_pm_proc_status.role === 'procurement' ? 'Procurement' :
                                             statusDetails.latest_pm_proc_status.role === 'projectManager' ? 'Project Manager' :
                                             statusDetails.latest_pm_proc_status.role === 'technicalDirector' ? 'Technical Director' :
                                             statusDetails.latest_pm_proc_status.role === 'estimation' ? 'Estimation' :
                                             statusDetails.latest_pm_proc_status.role === 'siteSupervisor' ? 'Site Supervisor' :
                                             statusDetails.latest_pm_proc_status.role?.replace(/([A-Z])/g, ' $1').trim().replace('_', ' ')}
                                          </p>
                                        </div>
                                      )}
                                      {(statusDetails.latest_pm_proc_status.decision_by || statusDetails.latest_pm_proc_status.created_by) && (
                                        <div>
                                          <p className="text-xs text-blue-600">Decision By</p>
                                          <p className="font-semibold text-blue-900">
                                            {typeof statusDetails.latest_pm_proc_status.decision_by === 'string' 
                                              ? statusDetails.latest_pm_proc_status.decision_by 
                                              : statusDetails.latest_pm_proc_status.decision_by?.full_name || statusDetails.latest_pm_proc_status.created_by}
                                          </p>
                                        </div>
                                      )}
                                      {(statusDetails.latest_pm_proc_status.date || statusDetails.latest_pm_proc_status.decision_date || statusDetails.latest_pm_proc_status.created_at) && (
                                        <div>
                                          <p className="text-xs text-blue-600">Decision Date</p>
                                          <p className="font-semibold text-blue-900">{formatDate(statusDetails.latest_pm_proc_status.date || statusDetails.latest_pm_proc_status.decision_date || statusDetails.latest_pm_proc_status.created_at)}</p>
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
                                          <p className="font-semibold text-purple-900 capitalize">{statusDetails.latest_pm_proc_status.sender?.replace(/([A-Z])/g, ' $1').trim().replace('_', ' ')}</p>
                                        </div>
                                      )}
                                      {statusDetails.latest_pm_proc_status.receiver && (
                                        <div>
                                          <p className="text-xs text-purple-600">To (Receiver)</p>
                                          <p className="font-semibold text-purple-900 capitalize">{statusDetails.latest_pm_proc_status.receiver?.replace(/([A-Z])/g, ' $1').trim().replace('_', ' ')}</p>
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
                <TabsContent value="materials" className="mt-0">
                  <div className="p-6">
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
                <TabsContent value="history" className="mt-0">
                <div className="p-6">
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