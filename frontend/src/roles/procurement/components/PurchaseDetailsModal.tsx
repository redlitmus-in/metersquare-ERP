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
import { procurementService, Purchase, Material } from '../services/procurementService';
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
  Loader2
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
        const { purchase: purchaseData } = await procurementService.getPurchaseHistory(purchaseId);
        setPurchase(purchaseData);
      } else {
        // Use getPurchaseDetails for details view
        const purchaseData = await procurementService.getPurchaseDetails(purchaseId);
        setPurchase(purchaseData);
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

  const handleExport = () => {
    if (!purchase) return;
    
    const data = JSON.stringify(purchase, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PR_${purchase.purchase_id}_details.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Purchase details exported successfully');
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
      <DialogContent className="max-w-4xl max-h-[90vh] h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" />
              Purchase Request Details
              {purchase && (
                <Badge className="ml-2">
                  PR-{purchase.purchase_id}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {purchase && (
                <>
                  <Badge className={`${getStatusColor(purchase.status || purchase.latest_status)} border`}>
                    {(purchase.status || purchase.latest_status || 'pending').toUpperCase()}
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
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          </div>
        ) : purchase ? (
          <div className="flex-1 overflow-hidden flex flex-col px-6 pb-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className={`grid w-full ${mode === 'history' ? 'grid-cols-1' : 'grid-cols-2'} mt-4 mb-4`}>
                {mode === 'history' ? (
                  <TabsTrigger value="history">History</TabsTrigger>
                ) : (
                  <>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="materials">Materials</TabsTrigger>
                  </>
                )}
              </TabsList>

              {/* Details Tab */}
              {mode !== 'history' && (
                <TabsContent value="details" className="flex-1 overflow-hidden mt-0">
                  <div className="h-full overflow-y-auto pr-2 space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Project ID:</span>
                          <span className="font-medium">{purchase.project_id}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Requested By:</span>
                          <span className="font-medium">{purchase.requested_by}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Site Location:</span>
                          <span className="font-medium">{purchase.site_location}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Date:</span>
                          <span className="font-medium">
                            {new Date(purchase.date || purchase.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Total Amount:</span>
                          <span className="font-semibold text-green-600">
                            AED {totalAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Email Status:</span>
                          <Badge variant={purchase.email_sent ? 'default' : 'outline'}>
                            {purchase.email_sent ? 'Sent' : 'Not Sent'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Purpose */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Purpose</h3>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {purchase.purpose || 'No purpose specified'}
                    </p>
                  </div>

                  {/* Approval Status */}
                  {purchase.approvals && purchase.approvals.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Current Approval Status</h3>
                        <div className="space-y-2">
                          {purchase.approvals.slice(-1).map((approval: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                              {getStatusIcon(approval.status)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{approval.reviewer_role}</span>
                                  <Badge className={`${getStatusColor(approval.status)} border text-xs`}>
                                    {approval.status.toUpperCase()}
                                  </Badge>
                                </div>
                                {approval.comments && (
                                  <p className="text-sm text-gray-600 mt-1">{approval.comments}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(approval.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Actions */}
                  {!purchase.email_sent && purchase.status !== 'approved' && (
                    <>
                      <Separator />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => procurementService.rejectPurchase(purchase.purchase_id, 'Cost exceeds budget')}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          variant="default"
                          onClick={() => procurementService.approvePurchase(purchase.purchase_id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={handleSendEmail}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Send to PM
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            )}

              {/* Materials Tab */}
              {mode !== 'history' && (
                <TabsContent value="materials" className="flex-1 overflow-hidden mt-0">
                  <div className="h-full overflow-y-auto pr-2">
                  {purchase.materials && purchase.materials.length > 0 ? (
                    <div className="space-y-3">
                      {purchase.materials.map((material: Material, idx: number) => (
                        <div key={material.material_id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-gray-900">
                              {idx + 1}. {material.description}
                            </h4>
                            <Badge variant="outline">{material.category}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600">Specification:</span>
                              <p className="font-medium">{material.specification}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Quantity:</span>
                              <p className="font-medium">{material.quantity} {material.unit}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Unit Cost:</span>
                              <p className="font-medium">AED {material.cost.toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Total Cost:</span>
                              <p className="font-semibold text-green-600">
                                AED {(material.quantity * material.cost).toLocaleString()}
                              </p>
                            </div>
                            {material.priority && (
                              <div>
                                <span className="text-gray-600">Priority:</span>
                                <Badge className="ml-2" variant={
                                  material.priority === 'urgent' ? 'destructive' :
                                  material.priority === 'high' ? 'default' : 'outline'
                                }>
                                  {material.priority.toUpperCase()}
                                </Badge>
                              </div>
                            )}
                            {material.design_reference && (
                              <div>
                                <span className="text-gray-600">Design Reference:</span>
                                <p className="font-medium">{material.design_reference}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold">Total Amount:</span>
                          <span className="text-xl font-bold text-green-600">
                            AED {totalAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No materials found</p>
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
                                approval.status === 'approved' ? 'bg-green-100' :
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
                                  {approval.status.toUpperCase()}
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