/**
 * Technical Director Approval Modal
 * Modal for approving/rejecting purchase requests with detailed review
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  MessageSquare,
  Package,
  Calculator,
  User,
  MapPin,
  Calendar,
  Target,
  FileText
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { technicalDirectorService } from '../services/technicalDirectorService';
import type { Purchase } from '../types';

interface TechnicalDirectorApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
  onSubmit: (action: 'approve' | 'reject', data: any) => Promise<void>;
  isLoading?: boolean;
}

const TechnicalDirectorApprovalModal: React.FC<TechnicalDirectorApprovalModalProps> = ({
  isOpen,
  onClose,
  purchase,
  onSubmit,
  isLoading = false
}) => {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setAction(null);
      setRejectionReason('');
      setComments('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!purchase || !action) return;

    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        purchaseId: purchase.purchase_id,
        comments: comments.trim(),
        ...(action === 'reject' && { rejectionReason: rejectionReason.trim() })
      };

      await onSubmit(action, data);
      onClose();
    } catch (error) {
      console.error('Error submitting approval:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = (selectedAction: 'approve' | 'reject') => {
    setAction(selectedAction);
  };

  if (!purchase) return null;

  const priority = purchase.materials?.[0]?.priority || 'medium';
  const priorityBadgeColor = technicalDirectorService.getPriorityBadgeColor(priority);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-red-500" />
              <span>Technical Director Review - Purchase #{purchase.purchase_id}</span>
            </div>
            <Badge className={priorityBadgeColor}>
              {priority} Priority
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Review and make approval decision for this purchase request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Purchase Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-red-500" />
                Purchase Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Requested by:</span>
                    <span className="font-medium">{purchase.requested_by}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Location:</span>
                    <span className="font-medium">{purchase.site_location}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Date:</span>
                    <span className="font-medium">{purchase.date}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-center bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {technicalDirectorService.formatCurrency(purchase.total_cost)}
                    </div>
                    <div className="text-sm text-gray-600">Total Cost</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="font-bold text-blue-600">{purchase.material_count}</div>
                      <div className="text-xs text-blue-600">Items</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <div className="font-bold text-green-600">{purchase.total_quantity}</div>
                      <div className="text-xs text-green-600">Qty</div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-gray-700">Purpose</span>
                </div>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                  {purchase.purpose}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Materials Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5 text-red-500" />
                Materials Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {purchase.materials?.map((material, index) => (
                  <div key={material.material_id || index} 
                       className="flex justify-between items-center p-3 bg-white border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {material.description}
                      </div>
                      {material.specification && (
                        <div className="text-sm text-gray-600">
                          Spec: {material.specification}
                        </div>
                      )}
                      <div className="flex gap-4 text-sm text-gray-500 mt-1">
                        <span>Category: {material.category}</span>
                        <span>Priority: {material.priority}</span>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-medium">
                        {technicalDirectorService.formatCurrency(material.total_cost)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {material.quantity} {material.unit} × {technicalDirectorService.formatCurrency(material.unit_cost)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total Cost:</span>
                <span className="text-red-600">
                  {technicalDirectorService.formatCurrency(purchase.total_cost)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Current Status */}
          {purchase.status_info && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">From:</span>
                    <div className="font-medium capitalize">{purchase.status_info.sender}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">To:</span>
                    <div className="font-medium capitalize">{purchase.status_info.receiver}</div>
                  </div>
                  {purchase.status_info.comments && (
                    <div className="col-span-2">
                      <span className="text-sm text-gray-600">Previous Comments:</span>
                      <div className="text-sm bg-gray-50 p-2 rounded mt-1">
                        {purchase.status_info.comments}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Selection */}
          {!action && (
            <Card>
              <CardHeader>
                <CardTitle>Select Action</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => handleAction('approve')}
                    className="h-20 bg-green-600 hover:bg-green-700 text-white"
                    disabled={isLoading || isSubmitting}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-8 w-8" />
                      <span className="text-lg font-medium">Approve</span>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => handleAction('reject')}
                    variant="destructive"
                    className="h-20"
                    disabled={isLoading || isSubmitting}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <XCircle className="h-8 w-8" />
                      <span className="text-lg font-medium">Reject</span>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approval Form */}
          <AnimatePresence>
            {action && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className={`${action === 'approve' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {action === 'approve' ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="text-green-800">Approve Purchase Request</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="text-red-800">Reject Purchase Request</span>
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {action === 'reject' && (
                      <div className="space-y-2">
                        <Label htmlFor="rejection-reason" className="text-red-800">
                          <AlertTriangle className="h-4 w-4 inline mr-1" />
                          Rejection Reason *
                        </Label>
                        <Textarea
                          id="rejection-reason"
                          placeholder="Please provide a detailed reason for rejection..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={3}
                          className="border-red-200 focus:border-red-400"
                          required
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="comments" className={action === 'approve' ? 'text-green-800' : 'text-red-800'}>
                        <MessageSquare className="h-4 w-4 inline mr-1" />
                        Additional Comments (Optional)
                      </Label>
                      <Textarea
                        id="comments"
                        placeholder="Add any additional comments or instructions..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        rows={2}
                        className={action === 'approve' ? 'border-green-200 focus:border-green-400' : 'border-red-200 focus:border-red-400'}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="flex gap-2 pt-4">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          
          {action && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (action === 'reject' && !rejectionReason.trim())}
              className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  {action === 'approve' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirm Approval
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Confirm Rejection
                    </>
                  )}
                </>
              )}
            </Button>
          )}
          
          {action && (
            <Button
              onClick={() => setAction(null)}
              variant="ghost"
              disabled={isSubmitting}
            >
              Change Action
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TechnicalDirectorApprovalModal;