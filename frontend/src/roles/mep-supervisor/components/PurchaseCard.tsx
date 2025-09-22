import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { formatDate } from '@/utils/dateFormatter';
import {
  Package,
  Calendar,
  MapPin,
  FileText,
  DollarSign,
  Eye,
  History,
  Edit,
  Trash2,
  Mail,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Material {
  material_id: number;
  description: string;
  quantity: number;
  unit: string;
  cost: number;
  category: string;
}

interface Purchase {
  purchase_id: number;
  requested_by: string;
  site_location: string;
  date: string;
  project_id: string;
  purpose: string;
  materials?: Material[];
  email_sent: boolean;
  created_at: string;
  status?: string;
  total_cost?: number;
  total_quantity?: number;
  last_modified_at?: string;
  last_modified_by?: string;
  latest_status?: {
    status: string;
    sender_latest_status: string;
    receiver_latest_status: string;
    created_by?: string;
    sender?: string;
    receiver?: string;
    decision_date?: string;
  };
}

interface PurchaseCardProps {
  purchase: Purchase;
  onViewDetails: (purchaseId: number) => void;
  onViewHistory: (purchaseId: number) => void;
  onEdit?: (purchaseId: number) => void;
  onDelete?: (purchaseId: number) => void;
  onSendEmail?: (purchaseId: number) => void;
  onSendToProcurement?: (purchaseId: number) => void;
  isLoading?: boolean;
  isSendingEmail?: boolean;
}

const PurchaseCard = forwardRef<HTMLDivElement, PurchaseCardProps>(({
  purchase,
  onViewDetails,
  onViewHistory,
  onEdit,
  onDelete,
  onSendEmail,
  onSendToProcurement,
  isLoading = false,
  isSendingEmail = false
}, ref) => {
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
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
        return <CheckCircle className="h-3.5 w-3.5" />;
      case 'rejected':
        return <XCircle className="h-3.5 w-3.5" />;
      case 'completed':
        return <CheckCircle className="h-3.5 w-3.5" />;
      case 'pending':
      case 'under_review':
        return <Clock className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  // Get the current status, prioritizing latest_status
  const getCurrentStatus = () => {
    if (purchase.latest_status) {
      // Check if it's completed in sender_latest_status or receiver_latest_status
      if (purchase.latest_status.sender_latest_status?.toLowerCase() === 'completed' || 
          purchase.latest_status.receiver_latest_status?.toLowerCase() === 'task completed') {
        return 'completed';
      }
      // Check if it's completed in main status
      if (purchase.latest_status.status?.toLowerCase() === 'completed') {
        return 'completed';
      }
      // Return the main status from latest_status
      return purchase.latest_status.status || purchase.status || 'pending';
    }
    // Fallback to regular status
    return purchase.status || 'pending';
  };

  // Get current workflow stage information
  const getCurrentWorkflowStage = () => {
    if (purchase.latest_status) {
      const status = purchase.latest_status.status;
      const receiver = purchase.latest_status.receiver;
      const sender = purchase.latest_status.sender;
      
      if (status === 'completed' || purchase.latest_status.receiver_latest_status === 'task completed') {
        return { stage: 'Completed', color: 'text-green-600' };
      } else if (status === 'rejected') {
        return { stage: `Rejected by ${formatRole(sender)}`, color: 'text-red-600' };
      } else if (status === 'approved') {
        return { stage: `With ${formatRole(receiver)}`, color: 'text-blue-600' };
      } else {
        return { stage: `Pending with ${formatRole(receiver)}`, color: 'text-yellow-600' };
      }
    }
    return { stage: 'Not Started', color: 'text-gray-600' };
  };

  const formatRole = (role?: string) => {
    if (!role) return 'Unknown';
    switch (role.toLowerCase()) {
      case 'sitesupervisor':
        return 'Site Supervisor';
      case 'procurement':
        return 'Procurement';
      case 'projectmanager':
        return 'Project Manager';
      case 'estimation':
        return 'Estimation';
      case 'technicaldirector':
        return 'Technical Director';
      case 'accounts':
        return 'Accounts';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const currentStatus = getCurrentStatus();
  const workflowStage = getCurrentWorkflowStage();

  // Calculate totals from materials - check if we have materials data
  const hasMaterials = purchase.materials && purchase.materials.length > 0;
  const totalCost = hasMaterials ? purchase.materials.reduce((sum, mat) => sum + (mat.cost * mat.quantity), 0) : 0;
  const totalQuantity = hasMaterials ? purchase.materials.reduce((sum, mat) => sum + mat.quantity, 0) : 0;
  const materialCount = purchase.materials?.length || 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-red-400/60 bg-gradient-to-r from-red-50/30 to-transparent focus:outline-none focus:ring-0 select-none">
        <CardContent className="p-3">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-gray-900">
                  PR #{purchase.purchase_id}
                </h3>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={`${getStatusColor(currentStatus)} text-xs flex items-center gap-1 hover:bg-transparent focus:ring-0 focus:outline-none cursor-default`}>
                    {getStatusIcon(currentStatus)}
                    {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-medium ${workflowStage.color}`}>
                      {workflowStage.stage}
                    </span>
                    {purchase.email_sent && (
                      <Badge className="text-xs bg-green-50 text-green-700 border-green-100">
                        <Mail className="h-2.5 w-2.5" />
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-600 text-left">{purchase.purpose}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs">
              <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span className="font-medium text-gray-900">{purchase.site_location}</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <FileText className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span className="font-medium text-gray-900">{purchase.project_id}</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span className="font-medium text-gray-900">
                {formatDate(purchase.date)}
              </span>
            </div>
          </div>

          {/* Materials Summary */}
          <div className="bg-gray-50 rounded-lg p-2 mb-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <Package className="h-3.5 w-3.5 text-gray-400 mx-auto mb-1" />
                <p className="text-xs text-gray-500">{materialCount} items</p>
              </div>
              <div className="text-center border-l border-gray-200">
                <p className="text-xs text-gray-500">Qty: {totalQuantity}</p>
              </div>
              <div className="text-center border-l border-gray-200">
                <div className="flex items-center justify-center gap-1">
                  <DollarSign className="h-3 w-3 text-gray-400" />
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <p className="text-sm font-bold text-green-600">
                  AED {totalCost.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {/* Always show View Details and View History */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewDetails(purchase.purchase_id)}
              disabled={isLoading}
              className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7 text-xs"
            >
              <Eye className="h-3 w-3" />
              Details
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewHistory(purchase.purchase_id)}
              disabled={isLoading}
              className="flex items-center justify-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-xs"
            >
              <History className="h-3 w-3" />
              History
            </Button>

            {/* Show Edit, Delete, and Send Email only if email NOT sent */}
            {!purchase.email_sent && (
              <>
                {onEdit && purchase.status !== 'approved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(purchase.purchase_id)}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-7 text-xs"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                )}

                {onDelete && purchase.status !== 'approved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDelete(purchase.purchase_id)}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-xs"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                )}

                {(onSendEmail || onSendToProcurement) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSendToProcurement ? onSendToProcurement(purchase.purchase_id) : onSendEmail?.(purchase.purchase_id)}
                    disabled={isLoading || isSendingEmail}
                    className="flex items-center justify-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 h-7 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingEmail ? (
                      <>
                        <div className="h-3 w-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        <span className="animate-pulse">Sending...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="h-3 w-3" />
                        Send Email
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>


          {/* Footer */}
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                Created {formatDistanceToNow(new Date(purchase.created_at), { addSuffix: true })} by {purchase.requested_by}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

PurchaseCard.displayName = 'PurchaseCard';

export default PurchaseCard;