/**
 * Purchase Details Modal Component for Estimation Hub
 * Shows comprehensive purchase information with proper formatting
 */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Package, Calendar, MapPin, User, CheckCircle,
  XCircle, Clock, AlertTriangle, MessageSquare, DollarSign,
  FileText, Building2, Mail, Download, Hash, Info, TrendingUp,
  UserCheck, Target, Layers, Shield, Activity, Paperclip, ExternalLink, ArrowRight
} from 'lucide-react';
import { estimationService } from '../services/estimationService';
import type { PurchaseStatusDetails } from '../services/estimationService';
import { toast } from 'sonner';
import { API_ENDPOINTS, API_BASE_URL } from '@/api/config';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';

interface PurchaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: number | null;
  showHistoryOnly?: boolean;
}

export const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({
  isOpen,
  onClose,
  purchaseId,
  showHistoryOnly = false
}) => {
  const [loading, setLoading] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseStatusDetails | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [downloadingFile, setDownloadingFile] = useState(false);

  useEffect(() => {
    if (isOpen && purchaseId) {
      fetchPurchaseDetails();
      setActiveTab('overview');
    }
  }, [isOpen, purchaseId, showHistoryOnly]);

  const fetchPurchaseDetails = async () => {
    if (!purchaseId) return;
    
    try {
      setLoading(true);
      
      // Use different endpoints based on mode
      const response = showHistoryOnly 
        ? await estimationService.getPurchaseHistory(purchaseId)
        : await estimationService.getPurchaseDetails(purchaseId);
      
      // Handle different response structures
      if (!showHistoryOnly) {
        // Details endpoint response structure
        const purchase = response.purchase || {};
        const latestStatus = response.latest_status || {};
        
        const formattedDetails = {
          purchase_id: purchase.purchase_id,
          purchase_details: {
            site_location: purchase.site_location || 'Not specified',
            purpose: purchase.purpose || 'Not specified',
            created_at: purchase.created_at,
            date: purchase.date,
            requested_by: purchase.requested_by || 'Not specified',
            project_id: purchase.project_id,
            email_sent: purchase.email_sent || false,
            file_path: purchase.file_path || null,
            materials_summary: {
              total_materials: purchase.materials?.length || 0,
              total_quantity: purchase.materials?.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0) || 0,
              total_cost: purchase.materials?.reduce((sum: number, m: any) => sum + ((m.quantity || 0) * (m.cost || 0)), 0) || 0,
              categories: [...new Set(purchase.materials?.map((m: any) => m.category).filter(Boolean) || [])] as string[],
              materials: purchase.materials || []
            }
          },
          latest_pm_proc_status: {
            status: latestStatus.status || 'pending',
            sender: latestStatus.sender,
            receiver: latestStatus.receiver,
            role: latestStatus.role,
            comments: latestStatus.comments,
            rejection_reason: latestStatus.rejection_reason
          },
          // Empty arrays for history since details view doesn't need them
          procurement_statuses: [],
          project_manager_statuses: [],
          estimation_statuses: [],
          summary: {
            total_procurement_statuses: 0,
            total_pm_statuses: 0,
            total_estimation_statuses: 0,
            pm_approved_count: 0
          }
        };
        
        setPurchaseDetails(formattedDetails);
      } else {
        // History endpoint response structure
        const purchase = response.purchase || {};
        // Fix: approvals is an object with 'action' array, not a direct array
        const approvalsData = purchase.approvals?.action || [];

        // Group approvals by role - include all roles
        const procurementStatuses = approvalsData.filter((a: any) => a.role === 'procurement' || a.sender === 'procurement');
        const pmStatuses = approvalsData.filter((a: any) => a.role === 'projectManager' || a.sender === 'projectManager');
        const estimationStatuses = approvalsData.filter((a: any) => a.role === 'estimation' || a.sender === 'estimation');
        const technicalDirectorStatuses = approvalsData.filter((a: any) => a.role === 'technicalDirector' || a.sender === 'technicalDirector');
        const accountsStatuses = approvalsData.filter((a: any) => a.role === 'accounts' || a.sender === 'accounts');

        // Get latest status
        const latestStatus = approvalsData.length > 0 ? approvalsData[approvalsData.length - 1] : {};

        const formattedDetails = {
          purchase_id: purchase.purchase_id,
          purchase_details: {
            site_location: purchase.site_location || 'Not specified',
            purpose: purchase.purpose || 'Not specified',
            created_at: purchase.created_at,
            date: purchase.date,
            requested_by: purchase.requested_by || 'Not specified',
            project_id: purchase.project_id,
            email_sent: purchase.email_sent || false,
            file_path: purchase.file_path || null,
            materials_summary: {
              total_materials: purchase.materials?.length || 0,
              total_quantity: purchase.materials?.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0) || 0,
              total_cost: purchase.materials?.reduce((sum: number, m: any) => sum + ((m.quantity || 0) * (m.cost || 0)), 0) || 0,
              categories: [...new Set(purchase.materials?.map((m: any) => m.category).filter(Boolean) || [])] as string[],
              materials: purchase.materials || []
            }
          },
          latest_pm_proc_status: {
            status: latestStatus.status || purchase.status || 'pending',
            sender: latestStatus.sender,
            receiver: latestStatus.receiver,
            role: latestStatus.role,
            comments: latestStatus.comments,
            rejection_reason: latestStatus.rejection_reason
          },
          procurement_statuses: procurementStatuses.map((s: any) => ({
            ...s,
            date: s.timestamp || s.created_at || s.decision_date
          })),
          project_manager_statuses: pmStatuses.map((s: any) => ({
            ...s,
            date: s.timestamp || s.created_at || s.decision_date
          })),
          estimation_statuses: estimationStatuses.map((s: any) => ({
            ...s,
            date: s.timestamp || s.created_at || s.decision_date
          })),
          technical_director_statuses: technicalDirectorStatuses.map((s: any) => ({
            ...s,
            date: s.timestamp || s.created_at || s.decision_date
          })),
          accounts_statuses: accountsStatuses.map((s: any) => ({
            ...s,
            date: s.timestamp || s.created_at || s.decision_date
          })),
          summary: {
            total_procurement_statuses: procurementStatuses.length,
            total_pm_statuses: pmStatuses.length,
            total_estimation_statuses: estimationStatuses.length,
            total_technical_director_statuses: technicalDirectorStatuses.length,
            total_accounts_statuses: accountsStatuses.length,
            pm_approved_count: pmStatuses.filter((s: any) => s.status === 'approved').length
          }
        };
        
        setPurchaseDetails(formattedDetails);
      }
    } catch (error: any) {
      console.error('Error fetching purchase details:', error);
      toast.error('Failed to load purchase details');
    } finally {
      setLoading(false);
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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const handleExport = () => {
    if (!purchaseDetails) return;
    
    const data = JSON.stringify(purchaseDetails, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PR-${purchaseDetails.purchase_id}_details.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Purchase details exported successfully');
  };

  const handleViewAttachment = async () => {
    if (!purchaseDetails?.purchase_id) return;
    
    setDownloadingFile(true);
    
    try {
      toast.info('Fetching attachment...');
      
      // First, fetch the file information from the API
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.DOWNLOAD_FILES('estimation', purchaseDetails.purchase_id)}`,
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
      if (purchaseDetails.purchase_details?.file_path) {
        // Try to fetch the file info again to get public_url
        try {
          const fallbackResponse = await fetch(
            `${API_BASE_URL}/api/get_file_url/${purchaseDetails.purchase_id}`,
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
              link.download = purchaseDetails.purchase_details.file_path?.split('/').pop() || 'attachment';
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
        const directUrl = `${API_BASE_URL}/uploads/${purchaseDetails.purchase_details.file_path}`;
        const fileName = purchaseDetails.purchase_details.file_path.split('/').pop() || 'attachment';
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

  const getRoleName = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'projectManager': 'Project Manager',
      'procurement': 'Procurement',
      'estimation': 'Estimation',
      'technicalDirector': 'Technical Director',
      'accounts': 'Accounts',
      'siteSupervisor': 'Site Supervisor',
      'mepSupervisor': 'MEP Supervisor',
      'design': 'Design'
    };
    
    return roleMap[role] || role;
  };

  // Combine all statuses for history
  const allStatuses = [
    ...(purchaseDetails?.procurement_statuses || []),
    ...(purchaseDetails?.project_manager_statuses || []),
    ...(purchaseDetails?.estimation_statuses || []),
    ...(purchaseDetails?.technical_director_statuses || []),
    ...(purchaseDetails?.accounts_statuses || [])
  ].sort((a: any, b: any) => {
    const dateA = a?.timestamp ? new Date(a.timestamp).getTime() : (a?.date ? new Date(a.date).getTime() : 0);
    const dateB = b?.timestamp ? new Date(b.timestamp).getTime() : (b?.date ? new Date(b.date).getTime() : 0);
    return dateA - dateB; // Chronological order
  });

  const currentStatus = purchaseDetails?.latest_pm_proc_status?.status || 'pending';

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0 bg-white">
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-[#243d8a]/5 to-[#243d8a]/10 shadow-lg border-b border-[#243d8a]/20">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#243d8a]/10 backdrop-blur rounded-lg">
                <FileText className="w-5 h-5 text-[#243d8a]" />
              </div>
              <div className="flex items-center gap-3">
                <h2 className="text-[#243d8a] text-lg font-semibold">Purchase Request Details</h2>
                <Badge className="bg-[#243d8a]/10 text-[#243d8a] px-3 py-1">
                  <Hash className="w-3 h-3 mr-1" />
                  PR-{purchaseDetails?.purchase_id || purchaseId}
                </Badge>
                {purchaseDetails && currentStatus === 'completed' && (
                  <Badge className="bg-green-100 text-green-700 px-3 py-1">
                    <Clock className="w-3 h-3 mr-1" />
                    COMPLETED
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Export option removed as requested */}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-16">
              <ModernLoadingSpinners variant="pulse-wave" size="lg" />
              <p className="text-gray-600 font-medium mt-4">Loading purchase details...</p>
            </div>
          ) : purchaseDetails ? (
            <>
              {!showHistoryOnly ? (
                // Details View with Tabs
                <div className="w-full">
                  {/* Summary Cards */}
                  <div className="px-6 py-4 bg-gray-50">
                    <div className="grid grid-cols-3 gap-4">
                      {/* Total Amount Card */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {formatCurrency(purchaseDetails?.purchase_details?.materials_summary?.total_cost || 0)}
                            </p>
                          </div>
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <DollarSign className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                      </div>

                      {/* Materials Card */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Materials</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {purchaseDetails?.purchase_details?.materials_summary?.total_materials || 0} Items
                            </p>
                          </div>
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Package className="w-5 h-5 text-purple-600" />
                          </div>
                        </div>
                      </div>

                      {/* Email Status Card */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Email Status</p>
                            <Badge className={purchaseDetails?.purchase_details?.email_sent 
                              ? "bg-green-100 text-green-700 border-green-200 px-3 py-1" 
                              : "bg-gray-100 text-gray-700 border-gray-200 px-3 py-1"}>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {purchaseDetails?.purchase_details?.email_sent ? 'Sent' : 'Not Sent'}
                            </Badge>
                          </div>
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Mail className="w-5 h-5 text-green-600" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="bg-white border-b">
                      <TabsList className="flex justify-start gap-8 bg-transparent p-0 h-auto px-6">
                        <TabsTrigger 
                          value="overview" 
                          className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none pb-3 pt-3 font-medium transition-all hover:text-blue-500"
                        >
                          <Info className="w-4 h-4 mr-2" />
                          Details
                        </TabsTrigger>
                        <TabsTrigger 
                          value="materials"
                          className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none pb-3 pt-3 font-medium transition-all hover:text-blue-500"
                        >
                          <Package className="w-4 h-4 mr-2" />
                          Materials
                        </TabsTrigger>
                        <TabsTrigger 
                          value="latest"
                          className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none pb-3 pt-3 font-medium transition-all hover:text-blue-500"
                        >
                          <Activity className="w-4 h-4 mr-2" />
                          Latest Status
                        </TabsTrigger>
                      </TabsList>
                    </div>

                  <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <TabsContent value="overview" className="mt-0 space-y-6">
                      {/* Basic Information Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Info className="w-5 h-5 text-gray-600" />
                          <h3 className="text-lg font-semibold text-gray-800">Basic Information</h3>
                        </div>
                        
                        <div className="bg-white rounded-lg p-6">
                          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                            {/* Left Column */}
                            <div className="space-y-6">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Building2 className="w-4 h-4 text-gray-400" />
                                  <p className="text-xs text-gray-500 uppercase tracking-wider">PROJECT ID</p>
                                </div>
                                <p className="text-base font-semibold text-gray-900">
                                  {purchaseDetails.purchase_details?.project_id || 'N/A'}
                                </p>
                              </div>
                              
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="w-4 h-4 text-gray-400" />
                                  <p className="text-xs text-gray-500 uppercase tracking-wider">REQUESTED BY</p>
                                </div>
                                <p className="text-base font-semibold text-gray-900">
                                  {purchaseDetails.purchase_details?.requested_by}
                                </p>
                              </div>
                              
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <MapPin className="w-4 h-4 text-gray-400" />
                                  <p className="text-xs text-gray-500 uppercase tracking-wider">SITE LOCATION</p>
                                </div>
                                <p className="text-base font-semibold text-gray-900">
                                  {purchaseDetails.purchase_details?.site_location}
                                </p>
                              </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-6">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <p className="text-xs text-gray-500 uppercase tracking-wider">REQUEST DATE</p>
                                </div>
                                <p className="text-base font-semibold text-gray-900">
                                  {formatDate(purchaseDetails.purchase_details?.date || purchaseDetails.purchase_details?.created_at)}
                                </p>
                              </div>
                              
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <UserCheck className="w-4 h-4 text-gray-400" />
                                  <p className="text-xs text-gray-500 uppercase tracking-wider">CREATED BY</p>
                                </div>
                                <p className="text-base font-semibold text-gray-900">
                                  {purchaseDetails.purchase_details?.requested_by}
                                </p>
                              </div>
                              
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Mail className="w-4 h-4 text-gray-400" />
                                  <p className="text-xs text-gray-500 uppercase tracking-wider">EMAIL STATUS</p>
                                </div>
                                <Badge 
                                  className={purchaseDetails.purchase_details?.email_sent 
                                    ? "bg-green-100 text-green-700 border-green-200 px-3 py-1" 
                                    : "bg-gray-100 text-gray-700 border-gray-200 px-3 py-1"}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  {purchaseDetails.purchase_details?.email_sent ? 'Sent' : 'Not Sent'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          {/* Purpose Section - Full Width */}
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Target className="w-4 h-4 text-gray-400" />
                              <p className="text-xs text-gray-500 uppercase tracking-wider">PURPOSE</p>
                            </div>
                            <p className="text-base font-semibold text-gray-900">
                              {purchaseDetails.purchase_details?.purpose}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Attachment Section - Show only if file_path exists */}
                      {purchaseDetails.purchase_details?.file_path && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <Paperclip className="w-5 h-5 text-gray-600" />
                            <h3 className="text-lg font-semibold text-gray-800">Attachment</h3>
                          </div>
                          
                          <div className="bg-white rounded-lg p-6">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{purchaseDetails.purchase_details.file_path.split('/').pop() || 'Purchase Document'}</p>
                                  <p className="text-xs text-gray-500">Click to download the attached document</p>
                                </div>
                              </div>
                              <Button
                                onClick={handleViewAttachment}
                                variant="outline"
                                size="sm"
                                disabled={downloadingFile}
                                className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                              >
                                {downloadingFile ? (
                                  <>
                                    <ModernLoadingSpinners variant="pulse-wave" size="lg" />
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
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="materials" className="mt-0 space-y-4">
                      <h3 className="text-lg font-semibold mb-4">Materials List</h3>
                      {purchaseDetails.purchase_details?.materials_summary?.materials && 
                       purchaseDetails.purchase_details.materials_summary.materials.length > 0 ? (
                        <div className="space-y-4">
                          {purchaseDetails.purchase_details.materials_summary.materials.map((material, idx) => (
                            <div key={material.material_id || idx} className="bg-gray-50 rounded-lg p-5">
                              <div className="mb-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-semibold text-gray-900 text-base">
                                      {material.description || `Material ${idx + 1}`}
                                    </h4>
                                    {material.specification && (
                                      <p className="text-sm text-gray-600 mt-1">{material.specification}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {material.category && (
                                      <Badge className="bg-blue-100 text-blue-700 border-0">
                                        {material.category}
                                      </Badge>
                                    )}
                                    {material.priority && (
                                      <Badge 
                                        className={
                                          material.priority === 'high' ? 'bg-red-100 text-red-700 border-0' :
                                          material.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 border-0' :
                                          'bg-green-100 text-green-700 border-0'
                                        }
                                      >
                                        {material.priority.toUpperCase()}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-6 pt-3">
                                <div>
                                  <p className="text-xs text-gray-500 uppercase mb-1">Quantity:</p>
                                  <p className="font-semibold text-gray-900">{material.quantity} {material.unit}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 uppercase mb-1">Unit Cost:</p>
                                  <p className="font-semibold text-green-600">{formatCurrency(material.cost || 0)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 uppercase mb-1">Total:</p>
                                  <p className="font-semibold text-green-600 text-lg">
                                    {formatCurrency((material.quantity || 0) * (material.cost || 0))}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          <div className="border-t-2 pt-4 mt-6">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-semibold text-gray-900">Grand Total:</span>
                              <span className="text-2xl font-bold text-green-600">
                                {formatCurrency(purchaseDetails.purchase_details?.materials_summary?.total_cost || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>No materials found</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="latest" className="mt-0 space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Info className="w-5 h-5 text-gray-600" />
                        <h3 className="text-lg font-semibold">Latest Information</h3>
                      </div>
                      
                      {/* Purchase Basic Info */}
                      <div className="bg-white rounded-lg border border-gray-200 p-5">
                        <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Purchase Details</h4>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Purchase ID:</span>
                            <span className="text-sm font-medium text-gray-900">PR-{purchaseDetails.purchase_id}</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Request Date:</span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatDate(purchaseDetails.purchase_details?.date || purchaseDetails.purchase_details?.created_at)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Site Location:</span>
                            <span className="text-sm font-medium text-gray-900">{purchaseDetails.purchase_details?.site_location}</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Project ID:</span>
                            <span className="text-sm font-medium text-gray-900">#{purchaseDetails.purchase_details?.project_id || 'N/A'}</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Created By:</span>
                            <span className="text-sm font-medium text-gray-900">{purchaseDetails.purchase_details?.requested_by || 'N/A'}</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Email Sent:</span>
                            <Badge className={purchaseDetails.purchase_details?.email_sent ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                              {purchaseDetails.purchase_details?.email_sent ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                          
                          {purchaseDetails.purchase_details?.materials_summary?.categories?.length > 0 && (
                            <div className="col-span-2">
                              <div className="flex justify-between items-start">
                                <span className="text-sm text-gray-600">Categories:</span>
                                <div className="flex flex-wrap gap-2 justify-end">
                                  {purchaseDetails.purchase_details.materials_summary.categories.map((category) => (
                                    <Badge key={category} variant="outline" className="text-xs">
                                      {category}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="col-span-2">
                            <div className="flex justify-between items-start">
                              <span className="text-sm text-gray-600">Purpose:</span>
                              <span className="text-sm font-medium text-gray-900 text-right max-w-xs">
                                {purchaseDetails.purchase_details?.purpose}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Latest Status Comprehensive Details */}
                      {purchaseDetails.latest_pm_proc_status && (
                        <div className="bg-white rounded-lg border border-gray-200 p-5">
                          <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Latest Status Information</h4>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Status:</span>
                                <Badge className={`${getStatusColor(purchaseDetails.latest_pm_proc_status.status)} uppercase`}>
                                  {purchaseDetails.latest_pm_proc_status.status}
                                </Badge>
                              </div>
                              
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Role:</span>
                                <span className="text-sm font-medium text-gray-900">
                                  {getRoleName(purchaseDetails.latest_pm_proc_status.role || '')}
                                </span>
                              </div>
                              
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">From:</span>
                                <span className="text-sm font-medium text-gray-900">
                                  {getRoleName(purchaseDetails.latest_pm_proc_status.sender || '')}
                                </span>
                              </div>
                              
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">To:</span>
                                <span className="text-sm font-medium text-gray-900">
                                  {getRoleName(purchaseDetails.latest_pm_proc_status.receiver || '')}
                                </span>
                              </div>
                            </div>
                            
                            {purchaseDetails.latest_pm_proc_status.comments && (
                              <div className="border-t pt-3 mt-3">
                                <p className="text-sm text-gray-600 mb-1">Comments:</p>
                                <div className="bg-blue-50 p-3 rounded-md">
                                  <p className="text-sm font-medium text-gray-900">
                                    {purchaseDetails.latest_pm_proc_status.comments}
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {purchaseDetails.latest_pm_proc_status.rejection_reason && (
                              <div className="border-t pt-3 mt-3">
                                <p className="text-sm text-gray-600 mb-1">Rejection Reason:</p>
                                <div className="bg-red-50 p-3 rounded-md">
                                  <p className="text-sm font-medium text-red-700">
                                    {purchaseDetails.latest_pm_proc_status.rejection_reason}
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {purchaseDetails.latest_pm_proc_status.reject_category && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Reject Category:</span>
                                <Badge variant="destructive">
                                  {purchaseDetails.latest_pm_proc_status.reject_category}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Materials Summary */}
                      {purchaseDetails.purchase_details?.materials_summary && (
                        <div className="bg-white rounded-lg border border-gray-200 p-5">
                          <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Materials Summary</h4>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-2xl font-bold text-blue-600">
                                {purchaseDetails.purchase_details.materials_summary.total_materials || 0}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">Total Items</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-green-600">
                                {purchaseDetails.purchase_details.materials_summary.total_quantity || 0}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">Total Quantity</p>
                            </div>
                            <div>
                              <p className="text-xl font-bold text-green-600">
                                {formatCurrency(purchaseDetails.purchase_details.materials_summary.total_cost || 0)}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">Total Value</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Timestamps Section */}
                      {(purchaseDetails.purchase_details?.created_at || purchaseDetails.purchase_details?.last_modified_at) && (
                        <div className="bg-gray-50 rounded-lg p-4 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            {purchaseDetails.purchase_details?.created_at && (
                              <div>
                                <span className="text-gray-600">Created At: </span>
                                <span className="font-medium">{formatDate(purchaseDetails.purchase_details.created_at)}</span>
                              </div>
                            )}
                            {purchaseDetails.purchase_details?.last_modified_at && (
                              <div>
                                <span className="text-gray-600">Last Modified: </span>
                                <span className="font-medium">{formatDate(purchaseDetails.purchase_details.last_modified_at)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
                </div>
              ) : (
                // History View
                <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {/* Summary Section - New Design matching screenshot */}
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 mb-6">
                    <div className="grid grid-cols-3 gap-8">
                      {/* Purchase Details */}
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">Purchase Details</h3>
                          <div className="space-y-1.5">
                            <div className="flex items-start gap-2">
                              <span className="text-sm text-gray-500">Purpose:</span>
                              <span className="text-sm text-gray-900 flex-1">{purchaseDetails?.purchase_details?.purpose || 'Not specified'}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-sm text-gray-500">Location:</span>
                              <span className="text-sm text-gray-900">{purchaseDetails?.purchase_details?.site_location || 'Not specified'}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-sm text-gray-500">Project:</span>
                              <span className="text-sm text-gray-900">#{purchaseDetails?.purchase_details?.project_id || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Request Info */}
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <User className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">Request Info</h3>
                          <div className="space-y-1.5">
                            <div className="flex items-start gap-2">
                              <span className="text-sm text-gray-500">Requested by:</span>
                              <span className="text-sm text-gray-900 flex-1">{purchaseDetails?.purchase_details?.requested_by || 'N/A'}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-sm text-gray-500">Date:</span>
                              <span className="text-sm text-gray-900">
                                {purchaseDetails?.purchase_details?.date
                                  ? new Date(purchaseDetails.purchase_details.date).toLocaleDateString('en-US', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })
                                  : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Timeline Stats */}
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Activity className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">Timeline Stats</h3>
                          <div className="space-y-1.5">
                            <div className="flex items-start gap-2">
                              <span className="text-sm text-gray-500">Total Steps:</span>
                              <span className="text-sm text-gray-900">{allStatuses.length}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-sm text-gray-500">Approvals:</span>
                              <span className="text-sm text-green-600 font-medium">
                                {allStatuses.filter((s: any) => s.status === 'approved' || s.status === 'completed').length}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-sm text-gray-500">Rejections:</span>
                              <span className="text-sm text-red-600 font-medium">
                                {allStatuses.filter((s: any) => s.status === 'rejected').length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <h2 className="text-xl font-semibold mb-6 text-center">Approval History</h2>

                  {allStatuses.length > 0 ? (
                    <div className="space-y-4">
                      {allStatuses.map((status: any, idx) => (
                        <div key={idx} className="relative">
                          {/* Timeline connector */}
                          {idx < allStatuses.length - 1 && (
                            <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
                          )}
                          
                          <div className="flex gap-4">
                            {/* Status Icon */}
                            <div className="flex-shrink-0">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                status.status === 'approved' ? 'bg-green-100' :
                                status.status === 'rejected' ? 'bg-red-100' :
                                status.status === 'completed' || status.status === 'complete' ? 'bg-blue-100' :
                                'bg-yellow-100'
                              }`}>
                                {status.status === 'completed' || status.status === 'complete' ? (
                                  <CheckCircle className="h-5 w-5 text-blue-600" />
                                ) : (
                                  getStatusIcon(status.status)
                                )}
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 bg-white border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900">
                                  {getRoleName(status.role)}
                                </h4>
                                <Badge className={`${
                                  status.status === 'completed' || status.status === 'complete'
                                    ? 'bg-blue-100 text-blue-700'
                                    : getStatusColor(status.status)
                                } border uppercase`}>
                                  {status.status}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mb-2">
                                {(status.decided_by || status.decision_by?.full_name) && (
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase">Decided By</p>
                                    <p className="text-sm font-medium text-gray-900">{status.decided_by || status.decision_by?.full_name}</p>
                                  </div>
                                )}
                                {(status.sender || status.receiver) && (
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase">Workflow</p>
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm text-gray-700">
                                        {status.sender?.replace(/([A-Z])/g, ' $1').trim()
                                          .replace('project Manager', 'Project Manager')
                                          .replace('technical Director', 'Technical Director')}
                                      </span>
                                      {status.sender && status.receiver && (
                                        <>
                                          <ArrowRight className="h-3 w-3 text-gray-400" />
                                          <span className="text-sm text-gray-700">
                                            {status.receiver?.replace(/([A-Z])/g, ' $1').trim()
                                              .replace('project Manager', 'Project Manager')
                                              .replace('technical Director', 'Technical Director')}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {status.comments && (
                                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded mt-3">
                                  <div className="flex items-start gap-2">
                                    <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5" />
                                    <div>
                                      <p className="text-sm font-medium text-blue-900">Comments</p>
                                      <p className="text-sm text-blue-800">{status.comments}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {status.rejection_reason && (
                                <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded mt-3">
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                                    <div>
                                      <p className="text-sm font-medium text-red-900">Rejection Reason</p>
                                      <p className="text-sm text-red-800">{status.rejection_reason}</p>
                                      {status.reject_category && (
                                        <Badge className="bg-red-100 text-red-700 mt-2">
                                          {status.reject_category}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              <p className="text-xs text-gray-500 mt-2">
                                {formatDate(status.timestamp || status.date || status.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg">No history available</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No purchase data available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};