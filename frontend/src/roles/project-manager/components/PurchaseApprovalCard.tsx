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
}

export const PurchaseApprovalCard: React.FC<PurchaseApprovalCardProps> = ({
  purchase,
  onViewDetails,
  onViewHistory,
  onEdit,
  onApprove,
  onReject,
  onSendToEstimation,
  isLoading = false
}) => {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalComments, setApprovalComments] = useState('');

  // Determine status color and icon
  const getStatusInfo = () => {
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
      >
        <Card className="hover:shadow-lg transition-shadow duration-200 border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg text-gray-900">
                    Purchase #{purchase.purchase_id}
                  </h3>
                  <Badge className={statusInfo.color}>
                    {statusInfo.icon}
                    <span className="ml-1">{statusInfo.text}</span>
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{purchase.site_location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(purchase.created_at || purchase.date)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Purpose */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Purpose</p>
              <p className="text-sm font-medium text-gray-900 line-clamp-2">
                {purchase.purpose}
              </p>
            </div>

            {/* Materials Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-gray-600">Materials</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {purchase.materials_summary?.total_materials || 0}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-gray-600">Quantity</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {purchase.materials_summary?.total_quantity || 0}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-gray-600">Total Cost</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  AED {(purchase.materials_summary?.total_cost || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Categories */}
            {purchase.materials_summary?.categories && purchase.materials_summary.categories.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {purchase.materials_summary.categories.slice(0, 3).map((category, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                  {purchase.materials_summary.categories.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{purchase.materials_summary.categories.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Workflow Status */}
            {purchase.current_workflow_status && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Workflow Status</p>
                <Badge variant="outline" className="text-xs">
                  {purchase.current_workflow_status.replace(/_/g, ' ')}
                </Badge>
              </div>
            )}

            {/* Previous Comments/Rejection Reason */}
            {purchase.pm_rejection_reason && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Previous Rejection</p>
                    <p className="text-sm text-red-700 mt-1">{purchase.pm_rejection_reason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Procurement Comments if any */}
            {purchase.procurement_comments && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800 mb-1">Procurement Notes</p>
                <p className="text-sm text-blue-700">{purchase.procurement_comments}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {/* View Buttons Row */}
              <div className="flex gap-2">
                {onViewDetails && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(purchase.purchase_id)}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                )}
                {onViewHistory && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewHistory(purchase.purchase_id)}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    <History className="h-4 w-4 mr-2" />
                    View History
                  </Button>
                )}
              </div>
              
              {/* Action Buttons Row */}
              {isPending && (
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowApproveDialog(true)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={isLoading}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowRejectDialog(true)}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}

              {purchase.pm_status === 'approved' && onSendToEstimation && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSendToEstimation}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    To Estimation
                  </Button>
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
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              Approve
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
              disabled={!rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};