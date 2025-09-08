/**
 * Payment Processing Modal Component
 * Modal for processing payment transactions with vendor details
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Building, 
  DollarSign, 
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { accountsService } from '../services/accountsService';
import { toast } from 'sonner';

interface PaymentProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: number | null;
  onSuccess: () => void;
}

const PaymentProcessingModal: React.FC<PaymentProcessingModalProps> = ({
  isOpen,
  onClose,
  purchaseId,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    payment_reference: '',
    vendor_name: '',
    vendor_account_details: '',
    notes: '',
    supporting_documents: [] as string[]
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && purchaseId) {
      setFormData({
        amount: '',
        payment_method: 'bank_transfer',
        payment_reference: '',
        vendor_name: '',
        vendor_account_details: '',
        notes: '',
        supporting_documents: []
      });
    }
  }, [isOpen, purchaseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!purchaseId || !formData.amount) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      setIsLoading(true);
      
      await accountsService.processPaymentTransaction({
        purchase_id: purchaseId,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        payment_reference: formData.payment_reference,
        vendor_name: formData.vendor_name,
        vendor_account_details: formData.vendor_account_details,
        notes: formData.notes,
        supporting_documents: formData.supporting_documents
      });

      toast.success('Payment transaction created successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error(error.message || 'Failed to process payment transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            Process Payment Transaction
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <DollarSign className="h-4 w-4 text-green-600" />
              Payment Details
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Payment Amount (AED) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  className="focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => handleInputChange('payment_method', value)}
                >
                  <SelectTrigger className="focus:border-green-500 focus:ring-green-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="online_payment">Online Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_reference">Payment Reference</Label>
              <Input
                id="payment_reference"
                placeholder="Transaction reference or check number"
                value={formData.payment_reference}
                onChange={(e) => handleInputChange('payment_reference', e.target.value)}
                className="focus:border-green-500 focus:ring-green-500"
              />
            </div>
          </div>

          <Separator />

          {/* Vendor Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Building className="h-4 w-4 text-blue-600" />
              Vendor Information
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vendor_name">Vendor Name</Label>
                <Input
                  id="vendor_name"
                  placeholder="Enter vendor or supplier name"
                  value={formData.vendor_name}
                  onChange={(e) => handleInputChange('vendor_name', e.target.value)}
                  className="focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor_account_details">Vendor Account Details</Label>
                <Textarea
                  id="vendor_account_details"
                  placeholder="Bank account details, address, or payment instructions"
                  value={formData.vendor_account_details}
                  onChange={(e) => handleInputChange('vendor_account_details', e.target.value)}
                  className="focus:border-blue-500 focus:ring-blue-500 min-h-[80px]"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Additional Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <FileText className="h-4 w-4 text-gray-600" />
              Additional Information
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes or comments"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="focus:border-gray-500 focus:ring-gray-500 min-h-[60px]"
              />
            </div>
          </div>

          {/* Information Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Payment Processing Information</p>
                <p className="text-xs text-blue-700">
                  This will create a payment transaction that requires internal approval before processing. 
                  You can approve or reject the transaction in the pending approvals section.
                </p>
              </div>
            </div>
          </div>
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
            disabled={isLoading || !formData.amount}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Create Payment Transaction
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentProcessingModal;