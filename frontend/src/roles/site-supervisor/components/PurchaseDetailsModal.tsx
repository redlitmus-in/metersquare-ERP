import React, { useEffect, useState } from 'react';
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
  Loader2,
  History,
  TrendingUp,
  Building,
  Hash,
  Layers,
  Edit,
  Paperclip,
  Eye,
  File,
  Image as FileImage,
  Table as FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';
import { siteSupervisorService, Purchase } from '../services/siteSupervisorService';
import { toast } from 'sonner';

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

    setLoading(true);
    try {
      if (mode === 'history') {
        // Make specific API call for history which includes approval timeline
        const data = await siteSupervisorService.getPurchaseHistory(purchaseId);
        setPurchase(data.purchase);
        // Ensure approvals are properly set from the history response
        if (data.statuses) {
          setPurchase(prev => ({ ...data.purchase, approvals: data.statuses }));
        }
        setActiveTab('history');
      } else {
        // Make API call for purchase details only
        const data = await siteSupervisorService.getPurchaseDetails(purchaseId);
        setPurchase(data);
        setActiveTab('details');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load purchase data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'under_review':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'under_review':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Calculate totals
  const totalCost = purchase?.materials?.reduce((sum, mat) => sum + (mat.cost * mat.quantity), 0) || 0;
  const totalQuantity = purchase?.materials?.reduce((sum, mat) => sum + mat.quantity, 0) || 0;

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
    const fileUrl = isFullUrl ? filePath : `${import.meta.env.VITE_API_BASE_URL}${filePath}`;
    
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
    const fileUrl = isFullUrl ? filePath : `${import.meta.env.VITE_API_BASE_URL}${filePath}`;
    
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {mode === 'history' ? (
                <History className="h-5 w-5 text-purple-600" />
              ) : (
                <Package className="h-5 w-5 text-orange-600" />
              )}
              Purchase Request #{purchaseId} {mode === 'history' ? '- History' : '- Details'}
            </span>
            {purchase && (
              <Badge className={`${getStatusColor(purchase.status)} flex items-center gap-1`}>
                {getStatusIcon(purchase.status)}
                {purchase.status || 'Pending'}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'history' 
              ? 'View approval workflow and status history for this purchase request'
              : 'View complete details and materials for this purchase request'
            }
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          </div>
        ) : purchase ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full ${mode === 'history' ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {mode !== 'history' && (
                <>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="materials">Materials</TabsTrigger>
                </>
              )}
              {mode === 'history' && (
                <TabsTrigger value="history">History</TabsTrigger>
              )}
            </TabsList>

            {/* Details Tab */}
            {mode !== 'history' && (
            <TabsContent value="details" className="mt-4">
              <div className="h-[500px] overflow-y-auto pr-4">
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                      <div>
                        <p className="text-xs text-gray-500">Purchase ID</p>
                        <p className="text-sm font-medium text-gray-900">#{purchase.purchase_id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Project ID</p>
                        <p className="text-sm font-medium text-gray-900">{purchase.project_id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Requested By</p>
                        <p className="text-sm font-medium text-gray-900">{purchase.requested_by}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Date</p>
                        <p className="text-sm font-medium text-gray-900">
                          {format(new Date(purchase.date), 'PPP')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Site Location</p>
                        <p className="text-sm font-medium text-gray-900">{purchase.site_location}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Email Status</p>
                        <Badge className={`text-xs ${
                          purchase.email_sent 
                            ? 'bg-green-50 text-green-700 border-green-100' 
                            : 'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                          {purchase.email_sent ? 'Sent' : 'Not Sent'}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Edit Information - Only show if actually edited (more than 1 minute difference) */}
                    {purchase.last_modified_at && purchase.created_at && 
                     (new Date(purchase.last_modified_at).getTime() - new Date(purchase.created_at).getTime() > 60000) && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Edit className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-semibold text-amber-700">Last Modified</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-amber-600">Modified Date</p>
                            <p className="text-sm font-medium text-amber-900">
                              {format(new Date(purchase.last_modified_at), 'PPp')}
                            </p>
                          </div>
                          {purchase.last_modified_by && (
                            <div>
                              <p className="text-xs text-amber-600">Modified By</p>
                              <p className="text-sm font-medium text-amber-900">{purchase.last_modified_by}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Purpose */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Purpose</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700">{purchase.purpose}</p>
                    </div>
                  </div>

                  {/* Summary Statistics */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Summary Statistics
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-xs text-blue-600">Total Materials</p>
                            <p className="text-xl font-bold text-blue-900">
                              {purchase.materials?.length || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center gap-2">
                          <Layers className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-xs text-green-600">Total Quantity</p>
                            <p className="text-xl font-bold text-green-900">{totalQuantity}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-xs text-green-600">Total Cost</p>
                            <p className="text-xl font-bold text-green-900">
                              AED {totalCost.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attachments Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Attachments & Documents
                    </h3>
                    {purchase.file_path ? (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        {/* Main uploaded file */}
                        <div className="border border-gray-200 rounded-lg p-3 bg-white">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getFileIcon(purchase.file_path)}
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {getFileName(purchase.file_path)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Uploaded with purchase request
                                </p>
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
                        </div>
                        
                        {/* Additional info */}
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Files are securely stored and can be accessed by authorized personnel only
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <Paperclip className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No attachments uploaded</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Documents can be attached when creating or editing purchase requests
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            )}

            {/* Materials Tab */}
            {mode !== 'history' && (
            <TabsContent value="materials" className="mt-4">
              <div className="h-[500px] overflow-y-auto pr-4">
                <div className="space-y-4">
                  {purchase.materials && purchase.materials.length > 0 ? (
                    purchase.materials.map((material, index) => (
                      <div key={material.material_id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {index + 1}. {material.description}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">{material.specification}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {material.category}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                          <div>
                            <p className="text-xs text-gray-500">Quantity</p>
                            <p className="text-sm font-medium">{material.quantity} {material.unit}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Unit Cost</p>
                            <p className="text-sm font-medium">AED {material.cost.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Total Cost</p>
                            <p className="text-sm font-medium text-green-600">
                              AED {(material.cost * material.quantity).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Priority</p>
                            <Badge
                              className={`text-xs ${
                                material.priority?.toLowerCase() === 'high' || material.priority?.toLowerCase() === 'urgent' 
                                  ? 'bg-red-50 text-red-700 border-red-100' : 
                                material.priority?.toLowerCase() === 'medium' 
                                  ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 
                                  'bg-gray-50 text-gray-700 border-gray-100'
                              }`}
                            >
                              {material.priority}
                            </Badge>
                          </div>
                        </div>

                        {material.design_reference && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Design Ref:</span> {material.design_reference}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No materials found</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            )}

            {/* History Tab */}
            {mode === 'history' && (
            <TabsContent value="history" className="mt-4">
              <div className="h-[500px] overflow-y-auto pr-4">
                <div className="space-y-4">
                  {purchase.approvals && purchase.approvals.length > 0 ? (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                      
                      {purchase.approvals.map((approval: any, index: number) => (
                        <div key={approval.status_id} className="relative flex items-start mb-6">
                          {/* Timeline dot */}
                          <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white ${
                            approval.status === 'approved' ? 'bg-green-400' :
                            approval.status === 'rejected' ? 'bg-red-400' :
                            approval.status === 'pending' ? 'bg-yellow-400' :
                            'bg-blue-400'
                          }`}></div>
                          
                          {/* Content */}
                          <div className="ml-10 flex-1">
                            <div className="bg-white border rounded-lg p-4 shadow-sm">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    {approval.sender} → {approval.receiver}
                                  </h4>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {format(new Date(approval.created_at), 'PPp')}
                                  </p>
                                </div>
                                <Badge className={getStatusColor(approval.status)}>
                                  {approval.status}
                                </Badge>
                              </div>
                              
                              {approval.comments && (
                                <p className="text-sm text-gray-700 mt-2">{approval.comments}</p>
                              )}
                              
                              {approval.rejection_reason && (
                                <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                                  <span className="font-medium">Rejection Reason:</span> {approval.rejection_reason}
                                </div>
                              )}
                              
                              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                {approval.role && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {approval.role}
                                  </span>
                                )}
                                {approval.created_by && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {approval.created_by}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <History className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No history available</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            )}
          </Tabs>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No purchase data available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseDetailsModal;