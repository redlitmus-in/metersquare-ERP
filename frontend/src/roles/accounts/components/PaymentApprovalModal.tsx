/**
 * Payment Approval Modal Component
 * Modal for approving or rejecting payment transactions
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  
} from 'lucide-react';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import { accountsService } from '../services/accountsService';
import { toast } from 'sonner';

interface PaymentApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: number | null;
  mode: 'approve' | 'reject';
  onSuccess: () => void;
}

const PaymentApprovalModal: React.FC<PaymentApprovalModalProps> = ({
  isOpen,
  onClose,
  transactionId,
  mode,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [comments, setComments] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setComments('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transactionId) {
      toast.error('No transaction selected');
      return;
    }

    if (mode === 'reject' && !comments.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setIsLoading(true);
      
      await accountsService.approvePaymentTransaction({
        transaction_id: transactionId,
        approval_status: mode === 'approve' ? 'approved' : 'rejected',
        comments: comments.trim()
      });

      const action = mode === 'approve' ? 'approved' : 'rejected';
      toast.success(`Payment transaction ${action} successfully`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(`Error ${mode}ing payment:`, error);
      toast.error(error.message || `Failed to ${mode} payment transaction`);
    } finally {
      setIsLoading(false);
    }
  };

  const isApproval = mode === 'approve';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApproval ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            {isApproval ? 'Approve Payment' : 'Reject Payment'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Confirmation Message */}
          <div className={`border rounded-lg p-4 ${
            isApproval 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {isApproval ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="text-sm">
                <p className={`font-medium ${
                  isApproval ? 'text-green-800' : 'text-red-800'
                }`}>
                  {isApproval 
                    ? 'Confirm Payment Approval' 
                    : 'Confirm Payment Rejection'
                  }
                </p>
                <p className={`text-xs mt-1 ${
                  isApproval ? 'text-green-700' : 'text-red-700'
                }`}>
                  {isApproval
                    ? 'This will process the payment and mark the transaction as completed. The purchase will move to the final completion stage.'
                    : 'This will reject the payment transaction and send it back to the Technical Director for review.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="space-y-2">
            <Label htmlFor="comments">
              {isApproval ? 'Comments (Optional)' : 'Rejection Reason *'}
            </Label>
            <Textarea
              id="comments"
              placeholder={isApproval 
                ? 'Add any additional comments...' 
                : 'Please specify the reason for rejection...'
              }
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className={`min-h-[100px] ${
                isApproval 
                  ? 'focus:border-green-500 focus:ring-green-500' 
                  : 'focus:border-red-500 focus:ring-red-500'
              }`}
              required={!isApproval}
            />
            {!isApproval && (
              <p className="text-xs text-gray-500">
                This reason will be shared with the Technical Director and requesting department.
              </p>
            )}
          </div>

          {/* Transaction ID Display */}
          {transactionId && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">
                Transaction ID: <span className="font-mono font-medium">#{transactionId}</span>
              </p>
            </div>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || (!isApproval && !comments.trim())}
            className={isApproval 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-red-600 hover:bg-red-700'
            }
          >
            {isLoading ? (
              <>
                <ModernLoadingSpinners variant="pulse-wave" size="lg" />
                Processing...
              </>
            ) : (
              <>
                {isApproval ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                {isApproval ? 'Approve Payment' : 'Reject Payment'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentApprovalModal;