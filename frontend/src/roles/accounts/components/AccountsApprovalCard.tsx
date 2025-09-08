/**
 * Accounts Approval Card Component
 * Individual card for payment processing with purchase summary and actions
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  User, 
  Package, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Eye,
  DollarSign,
  CreditCard,
  Building
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { accountsService } from '../services/accountsService';
import type { Purchase } from '../types';

interface AccountsApprovalCardProps {
  purchase: Purchase;
  onProcessPayment: (purchaseId: number) => void;
  onApprovePayment: (purchaseId: number) => void;
  onRejectPayment: (purchaseId: number) => void;
  onViewDetails: (purchaseId: number) => void;
  isLoading?: boolean;
}

const AccountsApprovalCard: React.FC<AccountsApprovalCardProps> = ({
  purchase,
  onProcessPayment,
  onApprovePayment,
  onRejectPayment,
  onViewDetails,
  isLoading = false
}) => {
  // Get status from latest_status object or fallback to direct fields
  const latestStatus = purchase.latest_status;
  let accountsStatus = 'pending';
  let technicalDirectorStatus = 'pending';
  let needsPaymentProcessing = false;
  let hasPaymentPending = false;
  
  if (latestStatus) {
    const sender = latestStatus.sender;
    const receiver = latestStatus.receiver;
    const status = latestStatus.status?.toLowerCase();
    
    // Determine current state based on latest status
    if (sender === 'technicalDirector' && receiver === 'accounts' && status === 'approved') {
      technicalDirectorStatus = 'approved';
      accountsStatus = 'pending';
      needsPaymentProcessing = true;
    } else if (sender === 'accounts' && status === 'pending') {
      accountsStatus = 'payment_processing';
      hasPaymentPending = true;
    } else if (sender === 'accounts' && status === 'approved') {
      accountsStatus = 'payment_processed';
    } else if (sender === 'accounts' && status === 'rejected') {
      accountsStatus = 'payment_rejected';
    }
  } else {
    // Fallback to direct status fields
    accountsStatus = purchase.accounts_status?.toLowerCase() || 'pending';
    technicalDirectorStatus = purchase.technical_director_status?.toLowerCase() || 'pending';
    needsPaymentProcessing = technicalDirectorStatus === 'approved' && (!accountsStatus || accountsStatus === 'pending');
    hasPaymentPending = accountsStatus === 'payment_processing';
  }
  
  // Get status badge color
  const getStatusColor = () => {
    switch (accountsStatus) {
      case 'payment_processed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'payment_rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'payment_processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  // Get priority from first material or default
  const priority = purchase.materials?.[0]?.priority || 'medium';
  const getPriorityColor = () => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                PR #{purchase.purchase_id}
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                Project: {purchase.project_id}
              </p>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <Badge className={getStatusColor()} variant="outline">
                {accountsStatus === 'pending' ? 'Pending Payment' : 
                 accountsStatus === 'payment_processing' ? 'Processing' : 
                 accountsStatus === 'payment_processed' ? 'Paid' : 
                 accountsStatus === 'payment_rejected' ? 'Rejected' : 'Pending'}
              </Badge>
              <Badge className={getPriorityColor()} variant="outline" size="sm">
                {priority} priority
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Key Information */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{purchase.site_location}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{purchase.requested_by}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(purchase.date).toLocaleDateString()}</span>
            </div>
          </div>

          <Separator />

          {/* Payment & Cost Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Package className="h-3.5 w-3.5" />
                <span>{purchase.material_count || 0} items</span>
              </div>
              <span className="text-sm text-gray-600">
                Qty: {purchase.total_quantity || 0}
              </span>
            </div>
            <div className="flex items-center justify-between bg-green-50 rounded-lg p-2">
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Payment Amount</span>
              </div>
              <span className="text-sm font-bold text-green-600">
                {accountsService.formatCurrency(purchase.total_cost || 0)}
              </span>
            </div>
          </div>

          {/* Previous Approvals */}
          {technicalDirectorStatus && (
            <div className="bg-gray-50 rounded-lg p-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Technical Director:</span>
                <Badge 
                  className={technicalDirectorStatus === 'approved' ? 
                    'bg-green-100 text-green-700' : 
                    'bg-yellow-100 text-yellow-700'
                  }
                  variant="outline"
                  size="sm"
                >
                  {technicalDirectorStatus}
                </Badge>
              </div>
            </div>
          )}

          {/* Payment Details if processing */}
          {hasPaymentPending && purchase.payment_details && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <div className="flex items-center gap-1 mb-1">
                <CreditCard className="h-3 w-3 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">Payment Details</span>
              </div>
              <p className="text-xs text-blue-600">
                Method: {purchase.payment_details.payment_method || 'Bank Transfer'}
              </p>
              {purchase.payment_details.vendor_name && (
                <p className="text-xs text-blue-600">
                  Vendor: {purchase.payment_details.vendor_name}
                </p>
              )}
            </div>
          )}

          {/* Comments if rejected */}
          {accountsStatus === 'payment_rejected' && purchase.accounts_rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-700">
                <span className="font-medium">Rejection Reason:</span> {purchase.accounts_rejection_reason}
              </p>
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-2">
            {needsPaymentProcessing ? (
              <>
                <Button
                  onClick={() => onProcessPayment(purchase.purchase_id)}
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <CreditCard className="h-3.5 w-3.5 mr-1" />
                  Process Payment
                </Button>
                <Button
                  onClick={() => onViewDetails(purchase.purchase_id)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  View Details
                </Button>
              </>
            ) : hasPaymentPending ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => onApprovePayment(purchase.purchase_id)}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => onRejectPayment(purchase.purchase_id)}
                    disabled={isLoading}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    size="sm"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                </div>
                <Button
                  onClick={() => onViewDetails(purchase.purchase_id)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  View Details
                </Button>
              </>
            ) : (
              <Button
                onClick={() => onViewDetails(purchase.purchase_id)}
                variant="outline"
                className="w-full"
                size="sm"
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                View Details
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AccountsApprovalCard;