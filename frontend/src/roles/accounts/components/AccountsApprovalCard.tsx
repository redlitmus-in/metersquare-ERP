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
  Building,
  ArrowRightLeft,
  Send
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
  onViewPayment?: (purchaseId: number) => void;
  onViewTransactionDetails?: (purchaseId: number) => void;
  onSendAcknowledgement?: (purchaseId: number) => void;
  isLoading?: boolean;
}

const AccountsApprovalCard: React.FC<AccountsApprovalCardProps> = ({
  purchase,
  onProcessPayment,
  onApprovePayment,
  onRejectPayment,
  onViewDetails,
  onViewPayment,
  onViewTransactionDetails,
  onSendAcknowledgement,
  isLoading = false
}) => {
  // Get status from latest_status object or fallback to direct fields
  const latestStatus = purchase.latest_status;
  let accountsStatus = 'pending';
  let technicalDirectorStatus = 'pending';
  let needsPaymentProcessing = false;
  let hasPaymentPending = false;
  let isProcessed = false;
  
  // Check if acknowledgement has been sent
  const hasAcknowledgement = purchase.acknowledgement || purchase.acknowledgement_sent;
  
  if (latestStatus) {
    const sender = latestStatus.sender;
    const receiver = latestStatus.receiver;
    const status = latestStatus.status?.toLowerCase();
    
    // Determine current state based on latest status
    if (sender === 'technicalDirector' && receiver === 'accounts' && status === 'approved') {
      technicalDirectorStatus = 'approved';
      accountsStatus = 'pending';
      needsPaymentProcessing = true;
    } else if (sender === 'accounts') {
      // Handle all accounts sender statuses
      if (status === 'pending') {
        accountsStatus = 'payment_processing';
        hasPaymentPending = true;
      } else if (status === 'approved' || status === 'payment_processed' || 
                 status === 'completed' || status === 'transferred' || 
                 status === 'payment_processing') {
        accountsStatus = 'payment_processed';
        technicalDirectorStatus = 'approved'; // If accounts processed, TD must have approved
        isProcessed = true;
      } else if (status === 'rejected') {
        accountsStatus = 'payment_rejected';
      }
    }
    
    // If accounts has processed, technical director must have approved
    if (sender === 'accounts' && (status === 'completed' || status === 'payment_processing')) {
      technicalDirectorStatus = 'approved';
    }
  } else {
    // Fallback to direct status fields
    accountsStatus = purchase.accounts_status?.toLowerCase() || 'pending';
    technicalDirectorStatus = purchase.technical_director_status?.toLowerCase() || 'pending';
    needsPaymentProcessing = technicalDirectorStatus === 'approved' && (!accountsStatus || accountsStatus === 'pending');
    hasPaymentPending = accountsStatus === 'payment_processing';
    isProcessed = accountsStatus === 'payment_processed' || accountsStatus === 'approved' || 
                  accountsStatus === 'transferred' || accountsStatus === 'completed';
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
      className="h-full"
    >
      <Card className="h-full hover:shadow-lg transition-shadow max-w-sm mx-auto">
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base font-semibold truncate">
                PR #{purchase.purchase_id}
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                Project: {purchase.project_id}
              </p>
            </div>
            <div className="flex flex-col gap-1 items-end flex-shrink-0">
              <Badge className={`${getStatusColor()} text-xs`} variant="outline">
                {isProcessed ? 'Completed' :
                 accountsStatus === 'pending' ? 'Pending' : 
                 accountsStatus === 'payment_processing' ? 'Processing' : 
                 accountsStatus === 'payment_processed' ? 'Completed' : 
                 accountsStatus === 'payment_rejected' ? 'Rejected' : 'Pending'}
              </Badge>
              {hasAcknowledgement && isProcessed && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs" variant="outline">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                  Ack'd
                </Badge>
              )}
              <Badge className={`${getPriorityColor()} text-xs`} variant="outline">
                {priority?.charAt(0).toUpperCase() + priority?.slice(1)} priority
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 px-4 pb-4">
          {/* Key Information */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-gray-600">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{purchase.site_location}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{purchase.requested_by}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{new Date(purchase.date).toLocaleDateString()}</span>
            </div>
          </div>

          <Separator />

          {/* Payment & Cost Summary */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Package className="h-3 w-3" />
                <span>{purchase.material_count || 0} items</span>
              </div>
              <span className="text-gray-600">
                Qty: {purchase.total_quantity || 0}
              </span>
            </div>
            <div className="flex items-center justify-between bg-green-50 rounded-md px-2 py-1.5">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-green-600" />
                <span className="text-xs font-medium text-green-900">Total</span>
              </div>
              <span className="text-xs font-bold text-green-600 truncate">
                {accountsService.formatCurrency(purchase.total_cost || 0)}
              </span>
            </div>
          </div>

          {/* Previous Approvals */}
          <div className="bg-gray-50 rounded-md px-2 py-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-600 truncate">Technical Director:</span>
              <Badge 
                className={`${technicalDirectorStatus === 'approved' || isProcessed ? 
                  'bg-green-100 text-green-700' : 
                  'bg-yellow-100 text-yellow-700'} text-xs`}
                variant="outline"
              >
                {isProcessed ? 'approved' : technicalDirectorStatus}
              </Badge>
            </div>
          </div>

          {/* Payment Details if processing */}
          {hasPaymentPending && purchase.payment_details && (
            <div className="bg-blue-50 border border-blue-200 rounded-md px-2 py-1.5">
              <div className="flex items-center gap-1 mb-0.5">
                <CreditCard className="h-2.5 w-2.5 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">Payment</span>
              </div>
              <p className="text-xs text-blue-600 truncate">
                {purchase.payment_details.payment_method || 'Bank Transfer'}
              </p>
              {purchase.payment_details.vendor_name && (
                <p className="text-xs text-blue-600 truncate">
                  {purchase.payment_details.vendor_name}
                </p>
              )}
            </div>
          )}

          {/* Comments if rejected */}
          {accountsStatus === 'payment_rejected' && purchase.accounts_rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
              <p className="text-xs text-red-700 line-clamp-2">
                <span className="font-medium">Reason:</span> {purchase.accounts_rejection_reason}
              </p>
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-1.5">
            {isProcessed ? (
              // For processed items, show View Details, View Payment and View Transaction Details buttons
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    onClick={() => onViewDetails(purchase.purchase_id)}
                    variant="outline"
                    className="w-full h-8 text-xs"
                    size="sm"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                  {onViewTransactionDetails && (
                    <Button
                      onClick={() => onViewTransactionDetails(purchase.purchase_id)}
                      variant="outline"
                      className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 h-8 text-xs"
                      size="sm"
                    >
                      <ArrowRightLeft className="h-3 w-3 mr-1" />
                      Transaction
                    </Button>
                  )}
                </div>
                {onSendAcknowledgement && (
                  <Button
                    onClick={() => onSendAcknowledgement(purchase.purchase_id)}
                    className={`w-full h-8 text-xs ${
                      hasAcknowledgement 
                        ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                    size="sm"
                    disabled={hasAcknowledgement}
                  >
                    {hasAcknowledgement ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Ack Sent
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3 mr-1" />
                        Send Ack
                      </>
                    )}
                  </Button>
                )}
              </div>
            ) : needsPaymentProcessing ? (
              <>
                <Button
                  onClick={() => onProcessPayment(purchase.purchase_id)}
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                  size="sm"
                >
                  <CreditCard className="h-3 w-3 mr-1" />
                  Process Payment
                </Button>
                <Button
                  onClick={() => onViewDetails(purchase.purchase_id)}
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </Button>
              </>
            ) : hasPaymentPending ? (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    onClick={() => onApprovePayment(purchase.purchase_id)}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                    size="sm"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => onRejectPayment(purchase.purchase_id)}
                    disabled={isLoading}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs"
                    size="sm"
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                </div>
                <Button
                  onClick={() => onViewDetails(purchase.purchase_id)}
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </Button>
              </>
            ) : (
              <Button
                onClick={() => onViewDetails(purchase.purchase_id)}
                variant="outline"
                className="w-full h-8 text-xs"
                size="sm"
              >
                <Eye className="h-3 w-3 mr-1" />
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