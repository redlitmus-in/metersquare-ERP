/**
 * Estimation Approval Modal Component
 * Handles approval and rejection workflows for estimation team
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, XCircle, AlertCircle, DollarSign, 
  Flag, Send, Loader2 
} from 'lucide-react';
import { estimationService } from '../services/estimationService';
import { toast } from 'sonner';

interface EstimationApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: number | null;
  mode: 'approve' | 'reject';
  onSuccess?: () => void;
}

export const EstimationApprovalModal: React.FC<EstimationApprovalModalProps> = ({
  isOpen,
  onClose,
  purchaseId,
  mode,
  onSuccess
}) => {
  const [comments, setComments] = useState('');
  const [rejectionType, setRejectionType] = useState<'cost' | 'pm_flag'>('cost');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setComments('');
    setRejectionType('cost');
    setRejectionReason('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!purchaseId) return;

    // Validation for rejection
    if (mode === 'reject') {
      if (!rejectionReason.trim()) {
        toast.error('Please provide a rejection reason');
        return;
      }
      if (rejectionReason.trim().length < 10) {
        toast.error('Rejection reason must be at least 10 characters');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let response;
      
      if (mode === 'approve') {
        response = await estimationService.submitApproval(purchaseId, comments);
        toast.success('Purchase approved and sent to Technical Director');
      } else {
        response = await estimationService.submitRejection(
          purchaseId,
          rejectionType,
          rejectionReason,
          comments
        );
        
        const recipient = rejectionType === 'cost' ? 'Procurement' : 'Project Manager';
        toast.success(`Purchase rejected and sent back to ${recipient}`);
      }

      // Check for email warning
      if (response.email_warning) {
        toast.warning(response.email_warning);
      }

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      handleClose();
    } catch (error: any) {
      console.error('Error submitting decision:', error);
      const errorMessage = error.response?.data?.error || 'Failed to submit decision';
      
      // Check if it's a duplicate approval error
      if (errorMessage.toLowerCase().includes('already approved')) {
        toast.warning('This purchase has already been approved');
        // Still call success callback to refresh the list and move to correct tab
        if (onSuccess) {
          onSuccess();
        }
        handleClose();
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getModalTitle = () => {
    if (mode === 'approve') {
      return 'Approve Purchase Request';
    }
    return 'Reject Purchase Request';
  };

  const getModalDescription = () => {
    if (mode === 'approve') {
      return 'This will approve the purchase and forward it to the Technical Director for final review.';
    }
    return 'Select the rejection type and provide a reason. The purchase will be sent back for revision.';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'approve' ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                {getModalTitle()}
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                {getModalTitle()}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {getModalDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Purchase ID Display */}
          <div className="bg-gray-50 p-2.5 sm:p-3 rounded-lg">
            <p className="text-xs sm:text-sm font-medium text-gray-700">
              Purchase ID: <span className="text-base sm:text-lg font-semibold text-gray-900">#{purchaseId}</span>
            </p>
          </div>

          {/* Rejection Type Selection (only for reject mode) */}
          {mode === 'reject' && (
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs sm:text-sm font-medium">Rejection Type</Label>
              <RadioGroup
                value={rejectionType}
                onValueChange={(value) => setRejectionType(value as 'cost' | 'pm_flag')}
              >
                <div className="flex items-start space-x-2 sm:space-x-3 p-2.5 sm:p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="cost" id="cost" className="mt-0.5 sm:mt-1" />
                  <Label htmlFor="cost" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium">
                      <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 flex-shrink-0" />
                      Cost Issue
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">
                      Budget concerns, pricing issues, or cost optimization needed. 
                      Will be sent back to Procurement team.
                    </p>
                  </Label>
                </div>
                
                <div className="flex items-start space-x-2 sm:space-x-3 p-2.5 sm:p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="pm_flag" id="pm_flag" className="mt-0.5 sm:mt-1" />
                  <Label htmlFor="pm_flag" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium">
                      <Flag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                      PM Flag Issue
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">
                      Project specifications, scope, or requirements need clarification. 
                      Will be sent back to Project Manager.
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Rejection Reason (only for reject mode) */}
          {mode === 'reject' && (
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="rejection-reason" className="text-xs sm:text-sm font-medium">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Provide a clear reason for rejection (minimum 10 characters)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value.slice(0, 500))}
                rows={3}
                className="resize-none text-xs sm:text-sm"
                required
              />
              <div className="flex justify-between items-center">
                <p className="text-[10px] sm:text-xs text-gray-500">
                  {rejectionReason.length}/500 characters (minimum 10)
                </p>
                {rejectionReason.length < 10 && rejectionReason.length > 0 && (
                  <p className="text-[10px] sm:text-xs text-red-500">Too short</p>
                )}
              </div>
            </div>
          )}

          {/* Comments (for both approve and reject) */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="comments" className="text-xs sm:text-sm font-medium">
              Additional Comments {mode === 'reject' && '(Optional)'}
            </Label>
            <Textarea
              id="comments"
              placeholder={
                mode === 'approve' 
                  ? "Add any notes or conditions for the Technical Director..."
                  : "Add any additional context or suggestions..."
              }
              value={comments}
              onChange={(e) => setComments(e.target.value.slice(0, 1000))}
              rows={3}
              className="resize-none text-xs sm:text-sm"
            />
            <p className="text-[10px] sm:text-xs text-gray-500">
              {comments.length}/1000 characters
            </p>
          </div>

          {/* Info Alert */}
          <Alert className={mode === 'approve' ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {mode === 'approve' ? (
                <>
                  Approving this purchase will forward it to the <strong>Technical Director</strong> for 
                  final review and approval. An email notification will be sent automatically.
                </>
              ) : (
                <>
                  {rejectionType === 'cost' ? (
                    <>
                      Rejecting for cost issues will send this back to the <strong>Procurement team</strong> for 
                      revision. They will need to address the cost concerns before resubmitting.
                    </>
                  ) : (
                    <>
                      Rejecting for PM flag issues will send this back to the <strong>Project Manager</strong> for 
                      clarification. They will need to address the concerns before resubmitting.
                    </>
                  )}
                </>
              )}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (mode === 'reject' && !rejectionReason.trim())}
            className={mode === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {mode === 'approve' ? 'Approve & Send to TD' : 'Reject & Send Back'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};