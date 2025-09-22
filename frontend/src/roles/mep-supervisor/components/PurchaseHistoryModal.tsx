import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  History,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Calendar,
  MessageSquare,
  ArrowRight,
  Package,

  Activity,
  UserCheck,
  Mail,
  Building2,
  TrendingUp,
  DollarSign,
  Shield
} from 'lucide-react';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import { format } from 'date-fns';
import { mepSupervisorService } from '../services/mepSupervisorService';
import { toast } from 'sonner';

interface PurchaseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: number | null;
}

interface ApprovalAction {
  status: string;
  role: string;
  sender: string;
  receiver: string;
  decided_by: string;
  decided_by_user_id: number;
  comments: string;
  timestamp: string;
  rejection_reason?: string | null;
  reject_category?: string | null;
  type: string;
}

interface Approvals {
  id: number;
  purchase_id: number;
  created_by: string;
  created_at: string;
  last_modified_by: string;
  last_modified_at: string;
  action: ApprovalAction[];
}

interface Purchase {
  purchase_id: number;
  purpose: string;
  requested_by: string;
  site_location: string;
  project_id: number;
  date: string;
  approvals?: Approvals;
}

const PurchaseHistoryModal: React.FC<PurchaseHistoryModalProps> = ({
  isOpen,
  onClose,
  purchaseId
}) => {
  const [loading, setLoading] = useState(false);
  const [purchase, setPurchase] = useState<Purchase | null>(null);

  useEffect(() => {
    if (isOpen && purchaseId) {
      fetchPurchaseHistory();
    } else {
      setPurchase(null);
    }
  }, [isOpen, purchaseId]);

  const fetchPurchaseHistory = async () => {
    if (!purchaseId) return;

    setLoading(true);
    try {
      const data = await mepSupervisorService.getPurchaseHistory(purchaseId);
      setPurchase(data.purchase);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load purchase history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
      case 'complete':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'completed':
      case 'complete':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
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
        return <Shield className="h-4 w-4" />;
      case 'accounts':
        return <DollarSign className="h-4 w-4" />;
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

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'sitesupervisor':
        return 'border-l-red-400';
      case 'procurement':
        return 'border-l-blue-400';
      case 'projectmanager':
        return 'border-l-green-400';
      case 'estimation':
        return 'border-l-purple-400';
      case 'technicaldirector':
        return 'border-l-orange-400';
      case 'accounts':
        return 'border-l-yellow-400';
      default:
        return 'border-l-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-100 px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <History className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                Purchase Request History
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                PR #{purchaseId} - Complete approval timeline and workflow history
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <ModernLoadingSpinners variant="pulse-wave" size="lg" />
              <p className="text-sm text-gray-600">Loading purchase history...</p>
            </div>
          </div>
        ) : purchase ? (
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="space-y-6">
              {/* Purchase Summary */}
              <Card className="border-0 shadow-lg bg-gradient-to-r from-gray-50 to-blue-50">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        Purchase Details
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500 font-medium">Purpose:</span> <span className="text-gray-900">{purchase.purpose}</span></p>
                        <p><span className="text-gray-500 font-medium">Location:</span> <span className="text-gray-900">{purchase.site_location}</span></p>
                        <p><span className="text-gray-500 font-medium">Project:</span> <span className="text-gray-900">#{purchase.project_id}</span></p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-green-600" />
                        Request Info
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500 font-medium">Requested by:</span> <span className="text-gray-900">{purchase.requested_by}</span></p>
                        <p><span className="text-gray-500 font-medium">Date:</span> <span className="text-gray-900">{format(new Date(purchase.date), 'MMM dd, yyyy')}</span></p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-purple-600" />
                        Timeline Stats
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500 font-medium">Total Steps:</span> <span className="text-gray-900 font-semibold">{purchase.approvals?.action?.length || 0}</span></p>
                        <p><span className="text-gray-500 font-medium">Approvals:</span> <span className="text-green-600 font-semibold">{purchase.approvals?.action?.filter(a => a.status === 'approved').length || 0}</span></p>
                        <p><span className="text-gray-500 font-medium">Rejections:</span> <span className="text-red-600 font-semibold">{purchase.approvals?.action?.filter(a => a.status === 'rejected').length || 0}</span></p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Approval Timeline */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Activity className="h-6 w-6 text-blue-600" />
                  </div>
                  Approval Timeline
                  <Badge className="bg-blue-100 text-blue-800">
                    {purchase.approvals?.action?.length || 0} Steps
                  </Badge>
                </h3>

                {purchase.approvals?.action && purchase.approvals.action.length > 0 ? (
                  <div className="space-y-4">
                    {purchase.approvals.action
                      // Sort chronologically to show full history in order
                      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                      .map((approval, idx, allApprovals) => (
                        <motion.div
                          key={`${idx}-${approval.timestamp}`}
                          initial={{ opacity: 0, x: -30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="relative"
                        >
                          {/* Timeline connector */}
                          {idx < allApprovals.length - 1 && (
                            <div className="absolute left-6 top-16 w-0.5 h-16 bg-gray-200 z-0"></div>
                          )}
                          
                          <Card className={`border-l-4 ${getRoleColor(approval.role)} hover:shadow-lg transition-all duration-300 relative z-10`}>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                  <div className="p-3 bg-blue-100 rounded-full">
                                    {getRoleIcon(approval.role)}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-gray-900 text-lg">
                                      {formatRole(approval.role)}
                                    </h4>
                                    <p className="text-sm text-gray-600 font-medium">{approval.decided_by}</p>
                                    <p className="text-xs text-gray-500 mt-1">Step #{idx + 1}</p>
                                  </div>
                                </div>
                                <Badge className={`${getStatusColor(approval.status)} border text-sm py-1 px-3`}>
                                  {getStatusIcon(approval.status)}
                                  <span className="ml-2 font-semibold">{approval.status.toUpperCase()}</span>
                                </Badge>
                              </div>

                              {/* Workflow Path */}
                              <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                                <div className="flex items-center gap-3 text-sm">
                                  <div className="flex items-center gap-2 font-semibold text-gray-700">
                                    {getRoleIcon(approval.sender)}
                                    {formatRole(approval.sender)}
                                  </div>
                                  <ArrowRight className="h-4 w-4 text-gray-400" />
                                  <div className="flex items-center gap-2 font-semibold text-gray-700">
                                    {getRoleIcon(approval.receiver)}
                                    {formatRole(approval.receiver)}
                                  </div>
                                  {approval.comments.includes('Email sent') && (
                                    <div className="flex items-center gap-1 text-blue-600 ml-auto">
                                      <Mail className="h-4 w-4" />
                                      <span className="text-xs font-medium">Email Sent</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Comments */}
                              {approval.comments && (
                                <div className="mb-4">
                                  <div className="flex items-start gap-3">
                                    <MessageSquare className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 flex-1">
                                      <p className="text-sm text-amber-900 italic leading-relaxed">"{approval.comments}"</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Rejection Reason */}
                              {approval.rejection_reason && (
                                <div className="mb-4">
                                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                    <div className="flex items-start gap-3">
                                      <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-sm font-semibold text-red-800 mb-1">Rejection Reason:</p>
                                        <p className="text-sm text-red-700 leading-relaxed">{approval.rejection_reason}</p>
                                        {approval.reject_category && (
                                          <Badge className="mt-2 bg-red-100 text-red-800 border-red-200">
                                            Category: {approval.reject_category.toUpperCase()}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Timestamps */}
                              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>Action Time: {format(new Date(approval.timestamp), 'MMM dd, yyyy HH:mm:ss')}</span>
                                </div>
                                {approval.type && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>Type: {approval.type.replace(/_/g, ' ')}</span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center border-dashed border-2">
                    <History className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No History Available</h3>
                    <p className="text-sm text-gray-500">This purchase request doesn't have any approval history yet.</p>
                  </Card>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Data Available</h3>
              <p className="text-sm text-gray-500">Unable to load purchase history.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseHistoryModal;