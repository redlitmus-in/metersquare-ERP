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
import { procurementService, Purchase, Material } from '../services/procurementService';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
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
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  Edit,
  UserCog,
  PenTool
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
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [latestStatus, setLatestStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(mode === 'history' ? 'history' : 'details');

  useEffect(() => {
    if (isOpen && purchaseId) {
      // Reset state when opening modal
      setPurchase(null);
      setLoading(true);
      fetchPurchaseData();
      // Set the active tab based on mode
      setActiveTab(mode === 'history' ? 'history' : 'details');
    } else {
      // Reset state when closing modal
      setPurchase(null);
      setLoading(false);
    }
  }, [isOpen, purchaseId, mode]);

  const fetchPurchaseData = async () => {
    if (!purchaseId) return;

    try {
      setLoading(true);
      
      if (mode === 'history') {
        // Use getPurchaseHistory for history view
        const { purchase: purchaseData, latest_status } = await procurementService.getPurchaseHistory(purchaseId);
        console.log('History mode - Purchase data:', purchaseData);
        setPurchase(purchaseData);
        setLatestStatus(latest_status);
      } else {
        // Use getPurchaseDetails for details view with full response
        const response = await procurementService.getPurchaseDetails(purchaseId);
        console.log('Details mode - Purchase response:', response);
        
        if (response.purchase) {
          console.log('Purchase file_path:', response.purchase.file_path);
          console.log('Purchase last_modified_by:', response.purchase.last_modified_by);
          console.log('Purchase last_modified_at:', response.purchase.last_modified_at);
          setPurchase(response.purchase);
          setLatestStatus(response.latest_status);
        } else {
          console.log('Direct purchase data:', response);
          console.log('Purchase file_path:', response.file_path);
          console.log('Purchase last_modified_by:', response.last_modified_by);
          console.log('Purchase last_modified_at:', response.last_modified_at);
          setPurchase(response);
        }
      }
    } catch (error: any) {
      console.error('Error fetching purchase data:', error);
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

  // File helper functions
  const getFileIcon = (filePath: string | undefined) => {
    if (!filePath) return <File className="h-5 w-5 text-gray-400" />;
    
    const extension = filePath.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return <FileImage className="h-5 w-5 text-purple-500" />;
      default:
        return <File className="h-5 w-5 text-gray-400" />;
    }
  };

  const getFileName = (filePath: string | undefined) => {
    if (!filePath) return 'Unknown file';
    const parts = filePath.split('/');
    return parts[parts.length - 1] || 'Attached document';
  };

  const handleViewFile = (filePath: string | undefined) => {
    if (!filePath) {
      toast.error('File path not available');
      return;
    }
    
    // Check if it's a full URL or relative path
    const isFullUrl = filePath.startsWith('http://') || filePath.startsWith('https://');
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const fileUrl = isFullUrl ? filePath : `${apiUrl}${filePath}`;
    
    // Open in new tab
    window.open(fileUrl, '_blank');
  };

  const handleDownloadFile = (filePath: string | undefined) => {
    if (!filePath) {
      toast.error('File path not available');
      return;
    }
    
    // Check if it's a full URL or relative path
    const isFullUrl = filePath.startsWith('http://') || filePath.startsWith('https://');
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const fileUrl = isFullUrl ? filePath : `${apiUrl}${filePath}`;
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = getFileName(filePath);
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Download started');
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

  const handleExportPDF = () => {
    if (!purchase) return;
    
    try {
      exportPurchaseDetailsPDF(purchase, latestStatus);
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };
  
  const handleSendEmail = async () => {
    if (!purchaseId) return;
    
    try {
      await procurementService.sendApprovalEmail(purchaseId);
      toast.success('Approval email sent to Project Manager');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email');
    }
  };

  // Calculate total amount
  const totalAmount = purchase?.materials?.reduce((sum, m) => 
    sum + (m.quantity * m.cost), 0
  ) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] h-[95vh] overflow-hidden flex flex-col p-0 bg-gray-50">
        <DialogHeader className="px-6 py-5 bg-gradient-to-r from-red-50 to-red-100 flex-shrink-0 shadow-lg border-b border-red-200">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/50 rounded-lg backdrop-blur">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-gray-900 text-lg font-semibold">Purchase Request Details</h2>
                {purchase && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-red-100 text-red-700 border-red-300 hover:bg-red-200">
                      <Hash className="w-3 h-3 mr-1" />
                      PR-{purchase.purchase_id}
                    </Badge>
                    <Badge className={`${getStatusColor(latestStatus?.status || purchase.status || purchase.latest_status)} border`}>
                      {getStatusIcon(latestStatus?.status || purchase.status || purchase.latest_status)}
                      <span className="ml-1">{formatStatusText(latestStatus?.status || purchase.status || purchase.latest_status || 'pending')}</span>
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {purchase && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  className="bg-white hover:bg-red-50 text-gray-700 border-red-300"
                >
                  <FileText className="w-4 h-4 mr-1 text-red-600" />
                  Export PDF
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center flex-1 bg-white">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading purchase details...</p>
            </div>
          </div>
        ) : purchase ? (
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
                                  AED {totalAmount.toLocaleString()}
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
                                  {purchase.materials?.length || 0} Items
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
                                  {purchase.email_sent ? 'Sent ✓' : 'Pending'}
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
                            <div className="p-2 bg-red-100 rounded-lg">
                              <Info className="w-5 h-5 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <Building2 className="w-5 h-5 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Project ID</p>
                                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{purchase.project_id}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <UserCheck className="w-5 h-5 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Requested By</p>
                                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{purchase.requested_by}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Site Location</p>
                                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{purchase.site_location}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <CalendarCheck className="w-5 h-5 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Request Date</p>
                                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                    {new Date(purchase.date || purchase.created_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <User className="w-5 h-5 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Created By</p>
                                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{purchase.created_by}</p>
                                </div>
                              </div>
                              
                              {purchase.last_modified_by && (
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                  <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Last Modified By</p>
                                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{purchase.last_modified_by}</p>
                                  </div>
                                </div>
                              )}
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
                              {purchase.purpose || 'No purpose specified'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Edit History */}
                      {(purchase.last_modified_by || purchase.last_modified_at) && (
                        <Card className="border-0 shadow-sm">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Edit className="w-5 h-5 text-blue-600" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900">Edit History</h3>
                            </div>
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <UserCog className="w-5 h-5 text-blue-600" />
                                  <div>
                                    <p className="text-xs text-gray-500">Last edited by</p>
                                    <p className="text-sm font-semibold text-gray-900">{purchase.last_modified_by || 'Procurement Team'}</p>
                                  </div>
                                </div>
                                {purchase.last_modified_at && (
                                  <div className="flex items-center gap-3">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                    <div>
                                      <p className="text-xs text-gray-500">Last edited on</p>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {new Date(purchase.last_modified_at).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                <div className="mt-2 p-2 bg-white rounded">
                                  <p className="text-xs text-amber-600">
                                    <AlertCircle className="w-3 h-3 inline mr-1" />
                                    Edited purchase requests require re-approval from Project Manager
                                  </p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Document Attachments */}
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <Paperclip className="w-5 h-5 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Document Attachments</h3>
                          </div>
                          
                          {purchase.file_path ? (
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {getFileIcon(purchase.file_path)}
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {getFileName(purchase.file_path)}
                                    </p>
                                    <p className="text-xs text-gray-500">Uploaded by {purchase.requested_by || 'Site Supervisor'}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-2"
                                    onClick={() => handleViewFile(purchase.file_path)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-2"
                                    onClick={() => handleDownloadFile(purchase.file_path)}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    Download
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Additional info */}
                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-3">
                                <AlertCircle className="h-3 w-3" />
                                Files are securely stored and can be accessed by authorized personnel only
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-6 text-center">
                              <Paperclip className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">No attachments uploaded</p>
                              <p className="text-xs text-gray-400 mt-1">
                                Documents can be attached when creating purchase requests
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Approval Status */}
                      {purchase.approvals && purchase.approvals.length > 0 && (
                        <Card className="border-0 shadow-sm">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <Shield className="w-5 h-5 text-green-600" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900">Current Approval Status</h3>
                            </div>
                            <div className="space-y-3">
                              {purchase.approvals.slice(-1).map((approval: any, idx: number) => (
                                <motion.div 
                                  key={idx} 
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="relative"
                                >
                                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all">
                                    <div className={`p-2 rounded-lg ${approval.status === 'approved' || approval.status === 'complete' || approval.status === 'completed' ? 'bg-green-100' : approval.status === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                                      {getStatusIcon(approval.status)}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                          <span className="font-semibold text-gray-900">
                                            {approval.reviewer_role?.replace(/([A-Z])/g, ' $1').trim()}
                                          </span>
                                          <Badge className={`${getStatusColor(approval.status)} border`}>
                                            {formatStatusText(approval.status)}
                                          </Badge>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                          {new Date(approval.created_at).toLocaleString()}
                                        </span>
                                      </div>
                                      {approval.comments && (
                                        <div className="bg-white p-3 rounded-lg mt-2">
                                          <p className="text-sm text-gray-700 italic">"{approval.comments}"</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Actions */}
                      {!purchase.email_sent && purchase.status !== 'approved' && (
                        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
                          <CardContent className="p-6">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-600" />
                                <p className="text-sm font-medium text-gray-700">Available Actions</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => procurementService.rejectPurchase(purchase.purchase_id, 'Cost exceeds budget')}
                                  className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </Button>
                                <Button
                                  onClick={() => procurementService.approvePurchase(purchase.purchase_id)}
                                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </Button>
                                <Button
                                  onClick={handleSendEmail}
                                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                                >
                                  <Mail className="w-4 h-4 mr-2" />
                                  Send to PM
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </motion.div>
                  </div>
                </TabsContent>
              )}

              {/* Materials Tab */}
              {mode !== 'history' && (
                <TabsContent value="materials" className="flex-1 overflow-hidden mt-0 bg-white">
                  <div className="h-full overflow-y-auto p-6">
                    {purchase.materials && purchase.materials.length > 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                      >
                        {purchase.materials.map((material: Material, idx: number) => (
                          <motion.div
                            key={material.material_id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                          >
                            <Card className="border-0 shadow-sm hover:shadow-md transition-all">
                              <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                      <Layers className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-gray-900 text-lg">
                                        {material.description}
                                      </h4>
                                      <p className="text-sm text-gray-500">Item #{idx + 1}</p>
                                    </div>
                                  </div>
                                  <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                                    {material.category}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 font-medium uppercase">Specification</p>
                                    <p className="text-sm font-semibold text-gray-900 mt-1">{material.specification}</p>
                                  </div>
                                  
                                  <div className="bg-blue-50 p-3 rounded-lg">
                                    <p className="text-xs text-blue-600 font-medium uppercase">Quantity</p>
                                    <p className="text-sm font-semibold text-blue-900 mt-1">
                                      {material.quantity} {material.unit}
                                    </p>
                                  </div>
                                  
                                  <div className="bg-green-50 p-3 rounded-lg">
                                    <p className="text-xs text-green-600 font-medium uppercase">Unit Cost</p>
                                    <p className="text-sm font-semibold text-green-900 mt-1">
                                      AED {material.cost.toLocaleString()}
                                    </p>
                                  </div>
                                  
                                  <div className="bg-amber-50 p-3 rounded-lg">
                                    <p className="text-xs text-amber-600 font-medium uppercase">Total Cost</p>
                                    <p className="text-sm font-bold text-amber-900 mt-1">
                                      AED {(material.quantity * material.cost).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                
                                {(material.priority || material.design_reference) && (
                                  <div className="flex gap-4 mt-4 pt-4 border-t">
                                    {material.priority && (
                                      <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm text-gray-600">Priority:</span>
                                        <Badge variant={
                                          material.priority.toLowerCase() === 'high' ? 'destructive' :
                                          material.priority.toLowerCase() === 'medium' ? 'default' : 'secondary'
                                        }>
                                          {material.priority.toUpperCase()}
                                        </Badge>
                                      </div>
                                    )}
                                    {material.design_reference && (
                                      <div className="flex items-center gap-2">
                                        <FileCheck className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm text-gray-600">Design Ref:</span>
                                        <span className="text-sm font-medium text-gray-900">{material.design_reference}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                        
                        {/* Total Summary */}
                        <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-3 bg-green-100 rounded-lg">
                                  <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Grand Total</p>
                                  <p className="text-3xl font-bold text-gray-900">
                                    AED {totalAmount.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">{purchase.materials.length} Items</p>
                                <p className="text-xs text-gray-500 mt-1">All prices inclusive</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="p-4 bg-gray-100 rounded-full inline-block mb-4">
                            <Package className="w-16 h-16 text-gray-400" />
                          </div>
                          <p className="text-lg font-medium text-gray-600">No materials found</p>
                          <p className="text-sm text-gray-500 mt-1">No materials have been added to this purchase request</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

              {/* Latest Status Tab */}
              {mode !== 'history' && (
                <TabsContent value="status" className="flex-1 overflow-hidden mt-0 bg-white">
                  <div className="h-full overflow-y-auto p-6">
                    {latestStatus ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                      >
                        {/* Status Overview Card */}
                        <Card className="border-0 shadow-sm">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Activity className="w-5 h-5 text-blue-600" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900">Current Status Information</h3>
                            </div>
                            <div className="space-y-4">
                              {/* Status Header */}
                              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Current Status</p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge className={`${getStatusColor(latestStatus.status)} border text-sm py-1 px-3`}>
                                        {getStatusIcon(latestStatus.status)}
                                        <span className="ml-1">{formatStatusText(latestStatus.status || 'pending')}</span>
                                      </Badge>
                                      {latestStatus.is_active && (
                                        <Badge className="bg-green-100 text-green-700 border-green-200">
                                          <Activity className="w-3 h-3 mr-1" />
                                          Active
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500">Status ID</p>
                                    <p className="font-mono text-sm font-semibold text-gray-700">#{latestStatus.status_id || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Role and Decision Info */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                  <div className="flex items-center gap-2 mb-3">
                                    <UserCheck className="w-4 h-4 text-blue-600" />
                                    <p className="text-sm font-medium text-blue-900">Decision Information</p>
                                  </div>
                                  <div className="space-y-2">
                                    <div>
                                      <p className="text-xs text-blue-600">Current Role</p>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {latestStatus.role?.replace(/([A-Z])/g, ' $1').trim() || 'N/A'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-blue-600">Decision By</p>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {latestStatus.created_by || 'N/A'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-blue-600">Decision Date</p>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {latestStatus.decision_date ? 
                                          new Date(latestStatus.decision_date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          }) : 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                                  <div className="flex items-center gap-2 mb-3">
                                    <ArrowRight className="w-4 h-4 text-purple-600" />
                                    <p className="text-sm font-medium text-purple-900">Workflow Path</p>
                                  </div>
                                  <div className="space-y-2">
                                    <div>
                                      <p className="text-xs text-purple-600">From (Sender)</p>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {latestStatus.sender?.replace(/([A-Z])/g, ' $1').trim() || 'N/A'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-purple-600">To (Receiver)</p>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {latestStatus.receiver?.replace(/([A-Z])/g, ' $1').trim() || 'N/A'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-purple-600">Purchase ID</p>
                                      <p className="text-sm font-semibold text-gray-900">
                                        PR-{latestStatus.purchase_id || 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            
                              {/* Comments Section */}
                              {latestStatus.comments && (
                                <Card className="border-0 shadow-sm bg-gradient-to-r from-amber-50 to-yellow-50">
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                      <div className="p-2 bg-amber-100 rounded-lg">
                                        <Info className="w-4 h-4 text-amber-600" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-amber-900 mb-2">Comments</p>
                                        <p className="text-sm text-amber-800 italic">
                                          "{latestStatus.comments}"
                                        </p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                              
                              {/* Rejection Info */}
                              {(latestStatus.rejection_reason || latestStatus.reject_category) && (
                                <Card className="border-0 shadow-sm bg-gradient-to-r from-red-50 to-pink-50">
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                      <div className="p-2 bg-red-100 rounded-lg">
                                        <XCircle className="w-4 h-4 text-red-600" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-red-900 mb-2">Rejection Details</p>
                                        {latestStatus.rejection_reason && (
                                          <p className="text-sm text-red-800 mb-2">
                                            {latestStatus.rejection_reason}
                                          </p>
                                        )}
                                        {latestStatus.reject_category && (
                                          <Badge variant="destructive">
                                            {latestStatus.reject_category}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Timestamps Card */}
                        <Card className="border-0 shadow-sm">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="p-2 bg-gray-100 rounded-lg">
                                <Clock className="w-5 h-5 text-gray-600" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900">Timeline</h3>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <CalendarCheck className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm text-gray-600">Created At</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">
                                  {latestStatus.created_at ? 
                                    new Date(latestStatus.created_at).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : 'N/A'}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm text-gray-600">Last Modified</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">
                                  {latestStatus.last_modified_at ? 
                                    new Date(latestStatus.last_modified_at).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : 'N/A'}
                                </span>
                              </div>
                              
                              {latestStatus.last_modified_by && (
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm text-gray-600">Modified By</span>
                                  </div>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {latestStatus.last_modified_by}
                                  </span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="p-4 bg-gray-100 rounded-full inline-block mb-4">
                            <AlertCircle className="w-16 h-16 text-gray-400" />
                          </div>
                          <p className="text-lg font-medium text-gray-600">No status information available</p>
                          <p className="text-sm text-gray-500 mt-1">Status details will appear here once available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

              {/* History Tab */}
              <TabsContent value="history" className="flex-1 overflow-y-auto mt-0" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                <div className="pr-2 pb-4">
                {purchase.approvals && purchase.approvals.length > 0 ? (
                  <div className="space-y-4">
                    {purchase.approvals.map((approval: any, idx: number) => {
                      // Format role name properly from the role field
                      const getRoleName = (approval: any) => {
                        const role = approval.role || approval.reviewer_role;
                        if (!role) return 'System';
                        
                        // Map role codes to display names
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
                        
                        return roleMap[role] || role
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/_/g, ' ')
                          .replace(/-/g, ' ')
                          .trim()
                          .split(' ')
                          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                          .join(' ');
                      };

                      // Get appropriate message based on status and role
                      const getMessage = (approval: any) => {
                        // Use comments if available, including rejection reason
                        if (approval.comments) {
                          if (approval.rejection_reason) {
                            return `${approval.comments} Reason: ${approval.rejection_reason}`;
                          }
                          return approval.comments;
                        }
                        
                        if (approval.rejection_reason) {
                          return `Rejected: ${approval.rejection_reason}`;
                        }
                        
                        const role = getRoleName(approval);
                        switch (approval.status?.toLowerCase()) {
                          case 'approved':
                            if (role.toLowerCase().includes('procurement')) {
                              return 'Procurement reviewed and sent to Project Manager for approval';
                            }
                            return `${role} approved the request`;
                          case 'rejected':
                            return `${role} rejected the request`;
                          case 'pending':
                            return `Awaiting review from ${role}`;
                          default:
                            return 'All documents verified, moving to next step.';
                        }
                      };

                      return (
                        <div key={idx} className="relative">
                          {purchase.approvals && idx < purchase.approvals.length - 1 && (
                            <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200" />
                          )}
                          <div className="flex gap-4">
                            <div className="flex-shrink-0">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                approval.status === 'approved' || approval.status === 'complete' || approval.status === 'completed' ? 'bg-green-100' :
                                approval.status === 'rejected' ? 'bg-red-100' :
                                'bg-yellow-100'
                              }`}>
                                {getStatusIcon(approval.status)}
                              </div>
                            </div>
                            <div className="flex-1 bg-white border rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    {getRoleName(approval)}
                                  </h4>
                                  <p className="text-sm text-gray-500">
                                    {approval.created_by || approval.reviewer_name || 'System'}
                                  </p>
                                </div>
                                <Badge className={`${getStatusColor(approval.status)} border`}>
                                  {formatStatusText(approval.status)}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-700 mt-2">
                                {getMessage(approval)}
                              </p>
                              <p className="text-xs text-gray-500 mt-2">
                                {new Date(approval.created_at).toLocaleString()}
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
                </div>
              </TabsContent>
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