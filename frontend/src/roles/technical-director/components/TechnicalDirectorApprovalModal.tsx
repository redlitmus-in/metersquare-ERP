/**
 * Technical Director Approval Modal Component
 * Handles approval and rejection workflows for technical director
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
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, XCircle, AlertCircle, Shield, 
  Send, Loader2 
} from 'lucide-react';
import { technicalDirectorService } from '../services/technicalDirectorService';
import { toast } from 'sonner';

interface TechnicalDirectorApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: number | null;
  mode: 'approve' | 'reject';
  onSuccess?: () => void;
}

const TechnicalDirectorApprovalModal: React.FC<TechnicalDirectorApprovalModalProps> = ({
  isOpen,
  onClose,
  purchaseId,
  mode,
  onSuccess
}) => {
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setComments('');
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
        response = await technicalDirectorService.submitApproval(purchaseId, comments);
        toast.success('Purchase approved and sent to Accounts');
      } else {
        response = await technicalDirectorService.submitRejection(
          purchaseId,
          rejectionReason,
          comments
        );
        toast.success('Purchase rejected and sent back to Estimation');
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
      const errorMessage = error.response?.data?.detail || 'Failed to submit decision';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className={`h-5 w-5 ${mode === 'approve' ? 'text-green-600' : 'text-red-600'}`} />
            {mode === 'approve' ? 'Approve' : 'Reject'} Purchase #{purchaseId}
          </DialogTitle>
          <DialogDescription>
            {mode === 'approve' 
              ? 'This purchase will be sent to Accounts for payment processing.'
              : 'This purchase will be sent back to Estimation for revision.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Alert for action */}
          <Alert className={mode === 'approve' ? 'border-green-200' : 'border-red-200'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {mode === 'approve' ? (
                <span>
                  <strong>Approving</strong> will forward this purchase to the Accounts team for final processing.
                </span>
              ) : (
                <span>
                  <strong>Rejecting</strong> will send this purchase back to Estimation with your feedback.
                </span>
              )}
            </AlertDescription>
          </Alert>

          {/* Rejection Reason (only for reject mode) */}
          {mode === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="rejection-reason" className="text-sm font-medium">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please provide a detailed reason for rejection (minimum 10 characters)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
                required
              />
              <p className="text-xs text-gray-500">
                This will help the Estimation team understand what needs to be revised.
              </p>
            </div>
          )}

          {/* Additional Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments" className="text-sm font-medium">
              Additional Comments {mode === 'reject' ? '' : '(Optional)'}
            </Label>
            <Textarea
              id="comments"
              placeholder={mode === 'approve' 
                ? "Add any notes for the Accounts team (optional)..." 
                : "Add any additional guidance or suggestions..."
              }
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Character count for rejection reason */}
          {mode === 'reject' && (
            <div className="flex justify-end">
              <span className={`text-xs ${rejectionReason.length < 10 ? 'text-red-500' : 'text-gray-500'}`}>
                {rejectionReason.length} / 10 minimum characters
              </span>
            </div>
          )}
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
            disabled={isSubmitting || (mode === 'reject' && rejectionReason.trim().length < 10)}
            className={mode === 'approve' 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-red-600 hover:bg-red-700'
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {mode === 'approve' ? (
                  <CheckCircle className="h-4 w-4 mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                {mode === 'approve' ? 'Approve' : 'Reject'} Purchase
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TechnicalDirectorApprovalModal;