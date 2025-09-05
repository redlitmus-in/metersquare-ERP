/**
 * Approval Modal Component
 * Handles approve/reject actions with comments and reasons
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, XCircle, AlertTriangle, Info,
  FileText, MessageSquare
} from 'lucide-react';
import { ProcurementPurchase } from '../services/projectManagerService';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: ProcurementPurchase | null;
  mode: 'approve' | 'reject';
  onConfirm: (data: {
    purchaseId: number;
    action: 'approve' | 'reject';
    rejectionReason?: string;
    comments?: string;
  }) => void;
  isLoading?: boolean;
}

const rejectionReasons = [
  { value: 'budget_exceeded', label: 'Budget Exceeded' },
  { value: 'specification_mismatch', label: 'Specification Mismatch' },
  { value: 'quantity_issue', label: 'Quantity Issue' },
  { value: 'vendor_concern', label: 'Vendor Concern' },
  { value: 'quality_concern', label: 'Quality Concern' },
  { value: 'timing_issue', label: 'Timing Issue' },
  { value: 'duplicate_request', label: 'Duplicate Request' },
  { value: 'other', label: 'Other (specify in comments)' },
];

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  onClose,
  purchase,
  mode,
  onConfirm,
  isLoading = false
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');

    // Validate rejection reason if rejecting
    if (mode === 'reject' && !rejectionReason) {
      setError('Please select a rejection reason');
      return;
    }

    // Validate comments for rejection
    if (mode === 'reject' && rejectionReason === 'other' && !comments.trim()) {
      setError('Please provide details in comments for "Other" rejection reason');
      return;
    }

    if (!purchase) return;

    onConfirm({
      purchaseId: purchase.purchase_id,
      action: mode,
      rejectionReason: mode === 'reject' ? 
        rejectionReasons.find(r => r.value === rejectionReason)?.label || rejectionReason : 
        undefined,
      comments: comments.trim() || undefined
    });

    // Reset form
    setRejectionReason('');
    setComments('');
    setError('');
  };

  const handleClose = () => {
    setRejectionReason('');
    setComments('');
    setError('');
    onClose();
  };

  if (!purchase) return null;

  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString()}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'approve' ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Approve Purchase Request
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                Reject Purchase Request
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Purchase #{purchase.purchase_id} - {purchase.site_location}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Purchase Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Purpose:</span>
                <p className="font-medium">{purchase.purpose}</p>
              </div>
              <div>
                <span className="text-gray-600">Total Cost:</span>
                <p className="font-medium">
                  {formatCurrency(purchase.materials_summary.total_cost)}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Materials:</span>
                <p className="font-medium">
                  {purchase.materials_summary.total_materials} items
                </p>
              </div>
              <div>
                <span className="text-gray-600">Categories:</span>
                <p className="font-medium">
                  {purchase.materials_summary.categories.join(', ')}
                </p>
              </div>
            </div>
          </div>

          {/* Rejection Reason (only for reject mode) */}
          {mode === 'reject' && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Rejection Reason *
              </Label>
              <RadioGroup value={rejectionReason} onValueChange={setRejectionReason}>
                <div className="grid grid-cols-2 gap-3">
                  {rejectionReasons.map(reason => (
                    <div key={reason.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={reason.value} id={reason.value} />
                      <Label 
                        htmlFor={reason.value} 
                        className="font-normal cursor-pointer"
                      >
                        {reason.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments {mode === 'reject' && rejectionReason === 'other' && '*'}
            </Label>
            <Textarea
              id="comments"
              placeholder={
                mode === 'approve' 
                  ? "Add any additional comments or conditions..."
                  : "Provide detailed feedback for the procurement team..."
              }
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Warning/Info Alert */}
          {mode === 'approve' ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                By approving this purchase request, you confirm that:
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>The specifications meet project requirements</li>
                  <li>The quantities are appropriate for the project</li>
                  <li>The request will be forwarded to the Estimation team</li>
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription>
                This purchase request will be sent back to the Procurement team for revision.
                Please provide clear feedback to help them address the issues.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className={mode === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
            variant={mode === 'reject' ? 'destructive' : 'default'}
          >
            {isLoading ? (
              'Processing...'
            ) : (
              <>
                {mode === 'approve' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Purchase
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Purchase
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};