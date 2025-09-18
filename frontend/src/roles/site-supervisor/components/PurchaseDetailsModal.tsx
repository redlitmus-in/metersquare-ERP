import React, { useEffect, useState } from 'react';
import { formatDateTimeLocal, getUserTimezone } from '@/utils/dateFormatter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  Package,
  Calendar,
  MapPin,
  FileText,
  DollarSign,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Mail,
  History,
  TrendingUp,
  Building2,
  Hash,
  Layers,
  Paperclip,
  File,
  FileImage,
  FileSpreadsheet,
  Info,
  UserCheck,
  CalendarCheck,
  Target,
  Truck,
  Store,
  Ban,
  ShieldCheck,
  GitBranch,
  ArrowRight,
  Workflow,
  Activity,
  Shield
} from 'lucide-react';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import { format } from 'date-fns';
import { siteSupervisorService, Purchase } from '../services/siteSupervisorService';
import { toast } from 'sonner';
import { API_BASE_URL, apiClient } from '@/api/config';

interface Material {
  material_id: number;
  description: string;
  specification?: string;
  quantity: number;
  unit: string;
  cost: number;
  category: string;
  priority?: string;
  design_reference?: string;
}

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
  const [loading, setLoading] = useState(false);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [activeTab, setActiveTab] = useState(mode === 'history' ? 'status' : 'details');
  const [latestStatus, setLatestStatus] = useState<any>(null);

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

    setLoading(true);
    try {
      // Try to use the /purchase/{id} endpoint first (like procurement does)
      try {
        const response = await apiClient.get(`/purchase/${purchaseId}`);
        console.log('Purchase Details Response:', response.data); // Debug log
        
        if (response.data) {
          // Handle different response structures
          if (response.data.success !== undefined) {
            if (response.data.success) {
              setPurchase(response.data.purchase || response.data);
              setLatestStatus(response.data.latest_status || response.data.status_info);
              
              // Check for approvals
              if (response.data.purchase?.approvals) {
                setPurchase(prev => ({ ...prev, approvals: response.data.purchase.approvals }));
              }
            }
          } else {
            // Direct purchase object
            setPurchase(response.data);
            setLatestStatus(response.data.latest_status || response.data.status_info);
          }
        }
      } catch (detailsError) {
        // Fallback to /purchase_history/{id} if details endpoint fails
        console.log('Falling back to purchase_history endpoint');
        const response = await apiClient.get(`/purchase_history/${purchaseId}`);
        console.log('Purchase History Response:', response.data); // Debug log
        
        if (response.data.success) {
          const purchaseData = response.data.purchase || response.data;
          setPurchase(purchaseData);
          
          // Set latest status from various possible locations
          setLatestStatus(response.data.latest_status || response.data.status_info || purchaseData.latest_status);
          
          // Check for approvals in different possible locations
          if (response.data.approvals) {
            setPurchase(prev => ({ ...prev, approvals: response.data.approvals }));
          } else if (response.data.purchase?.approvals) {
            // Already included in purchase object
          } else if (response.data.statuses) {
            setPurchase(prev => ({ ...prev, approvals: response.data.statuses }));
          }
        }
      }
      
      // Set active tab based on mode
      setActiveTab(mode === 'history' ? 'status' : 'details');
    } catch (error: any) {
      console.error('Error fetching purchase data:', error);
      toast.error(error.message || 'Failed to load purchase data');
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
      case 'in_progress':
      case 'under_review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
      case 'in_progress':
      case 'under_review':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'sitesupervisor':
        return <Building2 className="h-4 w-4" />;
      case 'procurement':
        return <Package className="h-4 w-4" />;
      case 'projectmanager':
        return <User className="h-4 w-4" />;
      case 'estimation':
        return <TrendingUp className="h-4 w-4" />;
      case 'technicaldirector':
        return <ShieldCheck className="h-4 w-4" />;
      case 'accounts':
        return <DollarSign className="h-4 w-4" />;
      case 'store':
        return <Store className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const formatRole = (role?: string) => {
    if (!role) return 'Unknown';
    switch (role.toLowerCase()) {
      case 'sitesupervisor':
        return 'Site Supervisor';
      case 'projectmanager':
        return 'Project Manager';
      case 'technicaldirector':
        return 'Technical Director';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
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

  const getFileIcon = (fileName?: string) => {
    if (!fileName) return <File className="h-5 w-5 text-gray-400" />;
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <FileImage className="h-5 w-5 text-blue-500" />;
    } else if (['xls', 'xlsx', 'csv'].includes(ext || '')) {
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    } else if (['pdf'].includes(ext || '')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-gray-400" />;
  };

  const getFileName = (filePath?: string) => {
    if (!filePath) return 'No file';
    return filePath.split('/').pop() || filePath;
  };

  const handleDownloadFile = async (filePath?: string) => {
    if (!filePath || !purchaseId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/download_files?key=siteSupervisor&id=${purchaseId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to get download URL`);
      }
      
      const data = await response.json();
      console.log('Download API response:', data); // Debug log
      
      // Extract public_url from the nested response structure
      let downloadUrl = null;
      
      if (data.purchase_files && data.purchase_files.length > 0) {
        // Get the first file's public_url (assuming one file per purchase)
        downloadUrl = data.purchase_files[0].public_url;
      } else if (data.accounts_files && data.accounts_files.length > 0) {
        // Fallback to accounts_files if purchase_files is empty
        downloadUrl = data.accounts_files[0].public_url;
      }
      
      if (downloadUrl) {
        // Create a temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = getFileName(filePath);
        link.target = '_blank'; // Fallback to open in new tab if download fails
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download started');
      } else {
        console.error('No download URL found in response:', data);
        toast.error('No file available for download');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[85vh] p-0 flex flex-col overflow-hidden">
        {/* Header with gradient */}
        <DialogHeader className="bg-gradient-to-r from-red-50 to-red-100 px-4 pr-12 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Package className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  Purchase Request #{purchaseId}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-600">
                  {mode === 'history' ? 'View approval history and timeline' : 'View purchase request details'}
                </DialogDescription>
              </div>
            </div>
            {purchase && (
              <Badge className={`${getStatusColor(purchase.status)} border px-3 py-1 mr-2`}>
                {getStatusIcon(purchase.status)}
                <span className="ml-1.5">{purchase.status?.toUpperCase() || 'PENDING'}</span>
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <ModernLoadingSpinners variant="pulse-wave" size="lg" />
          </div>
        ) : purchase ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3 p-1 bg-gray-100">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="materials" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Materials ({purchase.materials?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="status" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Latest Status
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="flex-1 overflow-hidden mt-0 bg-white">
              <div className="h-full overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs text-blue-600 font-medium">
                                Total Materials
                              </p>
                              <p className="text-xl font-bold text-blue-900 mt-1">
                                {purchase.materials?.length || 0}
                              </p>
                            </div>
                            <div className="p-2 bg-blue-200/30 rounded-lg">
                              <Package className="w-5 h-5 text-blue-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs text-green-600 font-medium">
                                Total Value
                              </p>
                              <p className="text-2xl font-bold text-green-900 mt-1">
                                AED {purchase.materials?.reduce((sum, m) => 
                                  sum + (m.quantity * m.cost), 0
                                ).toLocaleString() || '0'}
                              </p>
                            </div>
                            <div className="p-2 bg-green-200/30 rounded-lg">
                              <DollarSign className="w-5 h-5 text-green-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs text-red-600 font-medium">
                                Email Status
                              </p>
                              <p className="text-base font-bold text-red-900 mt-1">
                                {purchase.email_sent ? 'Sent to Procurement' : 'Not Sent'}
                              </p>
                            </div>
                            <div className="p-2 bg-red-200/30 rounded-lg">
                              <Mail className="w-5 h-5 text-red-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Basic Information */}
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-red-100 rounded-lg">
                            <Info className="w-4 h-4 text-red-600" />
                          </div>
                          <h3 className="text-base font-semibold text-gray-900">Basic Information</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <Building2 className="w-4 h-4 text-gray-500 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Project ID</p>
                                <p className="text-sm font-semibold text-gray-900 mt-0.5">{purchase.project_id}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <UserCheck className="w-4 h-4 text-gray-500 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Requested By</p>
                                <p className="text-sm font-semibold text-gray-900 mt-0.5">{purchase.requested_by}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Site Location</p>
                                <p className="text-sm font-semibold text-gray-900 mt-0.5">{purchase.site_location}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <CalendarCheck className="w-4 h-4 text-gray-500 mt-0.5" />
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
                              <User className="w-4 h-4 text-gray-500 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Created By</p>
                                <p className="text-sm font-semibold text-gray-900 mt-0.5">{purchase.created_by}</p>
                              </div>
                            </div>
                            
                            {purchase.last_modified_by && (
                              <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <Clock className="w-4 h-4 text-gray-500 mt-0.5" />
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
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-amber-100 rounded-lg">
                            <Target className="w-4 h-4 text-amber-600" />
                          </div>
                          <h3 className="text-base font-semibold text-gray-900">Purpose</h3>
                        </div>
                        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-lg border border-amber-200">
                          <p className="text-sm text-gray-800 leading-relaxed">
                            {purchase.purpose || 'No purpose specified'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>


                    {/* Document Attachments */}
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-purple-100 rounded-lg">
                            <Paperclip className="w-4 h-4 text-purple-600" />
                          </div>
                          <h3 className="text-base font-semibold text-gray-900">Document Attachments</h3>
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
                </div>
              </div>
            </TabsContent>

            {/* Materials Tab */}
            <TabsContent value="materials" className="flex-1 overflow-hidden mt-0 bg-white">
              <div className="h-full overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-purple-100 rounded-lg">
                                    <Layers className="w-4 h-4 text-purple-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-900 text-base">
                                      {material.description}
                                    </h4>
                                    <p className="text-xs text-gray-500">Item #{idx + 1}</p>
                                  </div>
                                </div>
                                <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                                  {material.category}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-gray-50 p-2 rounded-lg">
                                  <p className="text-xs text-gray-500 font-medium uppercase">Specification</p>
                                  <p className="text-sm font-semibold text-gray-900 mt-1">{material.specification || 'N/A'}</p>
                                </div>
                                
                                <div className="bg-blue-50 p-2 rounded-lg">
                                  <p className="text-xs text-blue-600 font-medium uppercase">Quantity</p>
                                  <p className="text-sm font-semibold text-blue-900 mt-1">
                                    {material.quantity} {material.unit}
                                  </p>
                                </div>
                                
                                <div className="bg-green-50 p-2 rounded-lg">
                                  <p className="text-xs text-green-600 font-medium uppercase">Unit Cost</p>
                                  <p className="text-sm font-semibold text-green-900 mt-1">
                                    AED {material.cost.toLocaleString()}
                                  </p>
                                </div>
                                
                                <div className="bg-amber-50 p-2 rounded-lg">
                                  <p className="text-xs text-amber-600 font-medium uppercase">Total Cost</p>
                                  <p className="text-sm font-semibold text-amber-900 mt-1">
                                    AED {(material.quantity * material.cost).toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              {/* Priority and Design Reference */}
                              {(material.priority || material.design_reference) && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                  <div className="flex items-center gap-4">
                                    {material.priority && (
                                      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                                        Priority: {material.priority}
                                      </Badge>
                                    )}
                                    {material.design_reference && (
                                      <span className="text-xs text-gray-500">
                                        Design Ref: {material.design_reference}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                      
                      {/* Total Summary Card */}
                      <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-green-100 rounded-lg">
                                <DollarSign className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Total Purchase Value</p>
                                <p className="text-2xl font-bold text-gray-900">
                                  AED {purchase.materials.reduce((sum, m) => 
                                    sum + (m.quantity * m.cost), 0
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">{purchase.materials.length} Materials</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {purchase.materials.reduce((sum, m) => sum + m.quantity, 0)} Total Units
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Package className="h-16 w-16 text-gray-300 mb-4" />
                      <p className="text-lg font-medium text-gray-600">No Materials Found</p>
                      <p className="text-sm text-gray-500 mt-2">
                        No materials have been added to this purchase request
                      </p>
                    </div>
                  )}
              </div>
            </TabsContent>

            {/* Latest Status Tab */}
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
          </Tabs>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">No purchase data available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseDetailsModal;
