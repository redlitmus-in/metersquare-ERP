/**
 * Purchase Approval Card Component
 * Displays purchase summary with action buttons for Project Manager
 * Following the standardized card component pattern from ProcurementHub
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Eye, History, Edit, CheckCircle, XCircle, Send,
  Clock, Calendar, MapPin, Package, AlertTriangle,
  TrendingUp, FileText, DollarSign
} from 'lucide-react';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ProcurementPurchase } from '../services/projectManagerService';

interface PurchaseApprovalCardProps {
  purchase: ProcurementPurchase;
  onViewDetails?: (purchaseId: number) => void;
  onViewHistory?: (purchaseId: number) => void;
  onEdit?: () => void;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  onSendToEstimation?: () => void;
  isLoading?: boolean;
  isApproving?: boolean;
  isRejecting?: boolean;
  isResending?: boolean;
  isEstimationRejected?: boolean;
}

export const PurchaseApprovalCard: React.FC<PurchaseApprovalCardProps> = ({
  purchase,
  onViewDetails,
  onViewHistory,
  onEdit,
  onApprove,
  onReject,
  onSendToEstimation,
  isLoading = false,
  isApproving = false,
  isRejecting = false,
  isResending = false,
  isEstimationRejected = false
}) => {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalComments, setApprovalComments] = useState('');

  // Check if the purchase is completed (accounts has acknowledged)
  const isCompleted = purchase.latest_status?.status === 'completed' || 
                     purchase.latest_status?.status === 'complete' ||
                     purchase.accounts_acknowledgement === true ||
                     purchase.current_workflow_status === 'completed';

  // Determine status color and icon
  const getStatusInfo = () => {
    if (isCompleted) {
      return {
        color: 'bg-green-100 text-green-700',
        icon: <CheckCircle className="h-4 w-4" />,
        text: 'Completed'
      };
    }
    
    const status = purchase.pm_status || 'pending';
    switch (status) {
      case 'approved':
        return {
          color: 'bg-green-100 text-green-700',
          icon: <CheckCircle className="h-4 w-4" />,
          text: 'PM Approved'
        };
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-700',
          icon: <XCircle className="h-4 w-4" />,
          text: 'PM Rejected'
        };
      case 'pending':
      default:
        return {
          color: 'bg-yellow-100 text-yellow-700',
          icon: <Clock className="h-4 w-4" />,
          text: 'Pending PM Review'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const isPending = !purchase.pm_status || purchase.pm_status === 'pending';

  // Check if rejected by estimation
  const isRejectedByEstimation = () => {
    // Check if there's a rejected_status from estimation
    if (purchase.rejected_status && purchase.rejected_status.sender === 'estimation' && purchase.rejected_status.status === 'rejected') {
      return true;
    }
    
    const estimationRejection = purchase.approvals?.some((a: any) => 
      a.reviewer_role === 'estimation' && a.status === 'rejected'
    );
    
    const statusRejectedByEstimation = (
      purchase.current_workflow_status?.includes('estimation_rejected') ||
      (purchase.status_role === 'estimation' && purchase.sender_latest_status === 'rejected') ||
      (purchase.status_sender === 'estimation' && purchase.sender_latest_status === 'rejected')
    );
    
    return estimationRejection || statusRejectedByEstimation;
  };

  const rejectedByEstimation = isRejectedByEstimation();

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle approve action
  const handleApprove = () => {
    setShowApproveDialog(false);
    if (onApprove) {
      onApprove();
    }
    setApprovalComments('');
  };

  // Handle reject action
  const handleReject = () => {
    if (rejectionReason.trim() && onReject) {
      onReject(rejectionReason);
      setShowRejectDialog(false);
      setRejectionReason('');
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <Card className="hover:shadow-lg transition-shadow duration-200 border-gray-200 h-full flex flex-col">
          <CardHeader className="pb-1 pt-3 px-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-900">
                  PR #{purchase.purchase_id}
                </h3>
                <Badge className={`${statusInfo.color} text-[10px] px-1.5 py-0`}>
                  {statusInfo.text}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-600">
                <div className="flex items-center gap-0.5">
                  <MapPin className="h-2.5 w-2.5" />
                  <span className="truncate">{purchase.site_location}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Calendar className="h-2.5 w-2.5" />
                  <span>{formatDate(purchase.created_at || purchase.date)}</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col px-3 pt-2 pb-3">
            {/* Purpose */}
            <div className="mb-2">
              <p className="text-[10px] text-gray-600">Purpose</p>
              <p className="text-xs font-medium text-gray-900 line-clamp-1">
                {purchase.purpose}
              </p>
            </div>

            {/* Compact Summary */}
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <div className="bg-gray-50 rounded px-1.5 py-1">
                <div className="flex items-center gap-0.5">
                  <Package className="h-2.5 w-2.5 text-gray-500" />
                  <span className="text-[10px] text-gray-600">Items</span>
                </div>
                <p className="text-xs font-semibold text-gray-900">
                  {purchase.materials_summary?.total_materials || 0}
                </p>
              </div>
              <div className="bg-gray-50 rounded px-1.5 py-1">
                <div className="flex items-center gap-0.5">
                  <DollarSign className="h-2.5 w-2.5 text-gray-500" />
                  <span className="text-[10px] text-gray-600">Total</span>
                </div>
                <p className="text-xs font-semibold text-gray-900">
                  AED {((purchase.materials_summary?.total_cost || 0)/1000).toFixed(1)}K
                </p>
              </div>
            </div>


            {/* Rejection Alert for Estimation Rejected Tab */}
            {rejectedByEstimation && isEstimationRejected && (
              <div className="mb-2 p-1.5 bg-orange-50 rounded border border-orange-200">
                <div className="flex items-start gap-0.5">
                  <AlertTriangle className="h-2.5 w-2.5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[10px] font-medium text-orange-800">Est. Rejected</p>
                    {(purchase.rejected_status?.rejection_reason || purchase.estimation_rejection_reason) && (
                      <p className="text-[10px] text-orange-700 mt-0.5 line-clamp-1">
                        {purchase.rejected_status?.rejection_reason || purchase.estimation_rejection_reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons - Push to bottom */}
            <div className="space-y-1.5 mt-auto pt-1">
              {/* View Buttons Row */}
              <div className="flex gap-1">
                {onViewDetails && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(purchase.purchase_id)}
                    className="flex-1 h-6 text-[10px] px-2"
                    disabled={isLoading}
                  >
                    <Eye className="h-2.5 w-2.5 mr-0.5" />
                    Details
                  </Button>
                )}
                {onViewHistory && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewHistory(purchase.purchase_id)}
                    className="flex-1 h-6 text-[10px] px-2"
                    disabled={isLoading}
                  >
                    <History className="h-2.5 w-2.5 mr-0.5" />
                    History
                  </Button>
                )}
              </div>
              
              {/* Action Buttons Row - Different for each tab */}
              {(isPending || isEstimationRejected) && (
                <div className="flex gap-1">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      if (isEstimationRejected) {
                        // When resending to estimation, use the dedicated handler
                        if (onSendToEstimation) {
                          onSendToEstimation();
                        }
                      } else {
                        setShowApproveDialog(true);
                      }
                    }}
                    className={`${
                      isEstimationRejected ? 'w-full' : 'flex-1'
                    } h-6 text-[10px] px-2 ${
                      isEstimationRejected 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                    disabled={isApproving || isResending}
                  >
                    {isEstimationRejected ? (
                      isResending ? (
                        <>
                          < className="h-2.5 w-2.5 mr-0.5 animate-spin" />
                          Resending...
                        </>
                      ) : (
                        <>
                          <Send className="h-2.5 w-2.5 mr-0.5" />
                          Resend to Est
                        </>
                      )
                    ) : isApproving ? (
                      <>
                        < className="h-2.5 w-2.5 mr-0.5 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                        Approve
                      </>
                    )}
                  </Button>
                  {/* Only show Reject button in Pending tab, not in Est. Rejected tab */}
                  {!isEstimationRejected && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowRejectDialog(true)}
                      className="flex-1 h-6 text-[10px] px-2"
                      disabled={isRejecting}
                    >
                      {isRejecting ? (
                        <>
                          < className="h-2.5 w-2.5 mr-0.5 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-2.5 w-2.5 mr-0.5" />
                          Reject
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Purchase Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve Purchase #{purchase.purchase_id}?
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <Label htmlFor="approval-comments">Comments (Optional)</Label>
            <Textarea
              id="approval-comments"
              placeholder="Add any comments for this approval..."
              value={approvalComments}
              onChange={(e) => setApprovalComments(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleApprove} 
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isApproving ? (
                <>
                  < className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Purchase Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting Purchase #{purchase.purchase_id}.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Enter the reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
              rows={4}
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {setRejectionReason(''); setShowRejectDialog(false);}}>Cancel</Button>
            <Button 
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isRejecting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRejecting ? (
                <>
                  < className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};