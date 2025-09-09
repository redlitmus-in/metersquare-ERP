/**
 * Payment Transaction Details Modal Component
 * Shows detailed transaction information and transfer history
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowRightLeft,
  Building,
  Calendar,
  User,
  FileText,
  DollarSign,
  AlertCircle,
  Loader2,
  Hash,
  Clock,
  CheckCircle,
  BanknoteIcon,
  CreditCard,
  Wallet,
  Receipt,
  TrendingUp,
  Send,
  Download,
  Eye
} from 'lucide-react';
import { accountsService } from '../services/accountsService';
import { toast } from 'sonner';

interface PaymentTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: number | null;
}

interface TransactionDetails {
  purchase_id: number;
  purchase_reference?: string;
  transactions: Array<{
    transaction_id: number;
    amount: number;
    currency: string;
    payment_method: string;
    payment_reference?: string;
    vendor_name?: string;
    vendor_account_details?: string;
    status: string;
    notes?: string;
    supporting_documents?: string;
    transaction_type?: string;
    approval_required?: boolean;
    created_at?: string;
    created_by?: string;
    processed_at?: string;
    processed_by?: string;
    approved_at?: string;
    approved_by?: string;
    failure_reason?: string;
    last_modified_at?: string;
    last_modified_by?: string;
    project_id?: number;
  }>;
  vendor?: {
    id?: number;
    name?: string;
  };
}

const PaymentTransactionModal: React.FC<PaymentTransactionModalProps> = ({
  isOpen,
  onClose,
  purchaseId
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [transactionData, setTransactionData] = useState<TransactionDetails | null>(null);

  useEffect(() => {
    if (isOpen && purchaseId) {
      fetchTransactionDetails();
    }
  }, [isOpen, purchaseId]);

  const fetchTransactionDetails = async () => {
    if (!purchaseId) return;
    
    setIsLoading(true);
    try {
      const response = await accountsService.getPaymentTransactionDetails(purchaseId);
      setTransactionData(response);
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      toast.error('Failed to load transaction details - API endpoints not available');
      setTransactionData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'bank transfer':
        return <Building className="h-4 w-4" />;
      case 'credit card':
        return <CreditCard className="h-4 w-4" />;
      case 'cash':
        return <BanknoteIcon className="h-4 w-4" />;
      case 'check':
      case 'cheque':
        return <Receipt className="h-4 w-4" />;
      case 'digital wallet':
        return <Wallet className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            Payment Transaction Details
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : transactionData ? (
          <div className="max-h-[calc(90vh-80px)] overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Purchase Information */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Purchase ID: {transactionData.purchase_id}
                      </CardTitle>
                      {transactionData.purchase_reference && (
                        <p className="text-sm text-gray-500 mt-1">
                          Reference: {transactionData.purchase_reference}
                        </p>
                      )}
                    </div>
                    {transactionData.vendor && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{transactionData.vendor.name}</p>
                        <p className="text-xs text-gray-500">Vendor</p>
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>

              {/* Transactions */}
              {transactionData.transactions && transactionData.transactions.map((transaction, index) => (
                <Card key={transaction.transaction_id || index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          Transaction ID: {transaction.transaction_id}
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          Type: {transaction.transaction_type || 'Payment'}
                        </p>
                      </div>
                      <Badge className={getStatusColor(transaction.status)} variant="outline">
                        {transaction.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          {getPaymentMethodIcon(transaction.payment_method)}
                          <span className="text-gray-500">Method:</span>
                          <span className="font-medium capitalize">{transaction.payment_method}</span>
                        </div>
                        {transaction.vendor_name && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-500">Vendor:</span>
                            <span className="font-medium">{transaction.vendor_name}</span>
                          </div>
                        )}
                        {transaction.created_by && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-500">Created by:</span>
                            <span className="font-medium">{transaction.created_by}</span>
                          </div>
                        )}
                        {transaction.approval_required && (
                          <div className="flex items-center gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            <span className="text-gray-500">Status:</span>
                            <span className="font-medium text-orange-600">Approval Required</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-gray-500">Amount:</span>
                          <span className="font-bold text-green-600">
                            {transaction.currency || 'AED'} {(transaction.amount || 0).toLocaleString()}
                          </span>
                        </div>
                        {transaction.created_at && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-500">Created:</span>
                            <span className="font-medium">
                              {new Date(transaction.created_at).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {transaction.processed_at && (
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-gray-500">Processed:</span>
                            <span className="font-medium">
                              {new Date(transaction.processed_at).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment Reference */}
                    {transaction.payment_reference && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Payment Reference:</span>
                          <span className="font-mono font-medium text-sm">
                            {transaction.payment_reference}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Vendor Account Details */}
                    {transaction.vendor_account_details && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Building className="h-4 w-4 text-blue-500 mt-0.5" />
                          <div>
                            <span className="text-sm text-blue-700 font-medium">Vendor Account Details:</span>
                            <p className="text-sm text-blue-600 mt-1">{transaction.vendor_account_details}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {transaction.notes && (
                      <div className="bg-amber-50 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-amber-500 mt-0.5" />
                          <div>
                            <span className="text-sm text-amber-700 font-medium">Notes:</span>
                            <p className="text-sm text-amber-600 mt-1">{transaction.notes}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Supporting Documents */}
                    {transaction.supporting_documents && (
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-700 font-medium">Supporting Documents:</span>
                          <span className="text-sm text-green-600">{transaction.supporting_documents}</span>
                        </div>
                      </div>
                    )}

                    {/* Failure Reason */}
                    {transaction.failure_reason && (
                      <div className="bg-red-50 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                          <div>
                            <span className="text-sm text-red-700 font-medium">Failure Reason:</span>
                            <p className="text-sm text-red-600 mt-1">{transaction.failure_reason}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}


              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Export transaction details
                    const dataStr = JSON.stringify(transactionData, null, 2);
                    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                    const exportFileDefaultName = `purchase_${transactionData.purchase_id}_transactions.json`;
                    const linkElement = document.createElement('a');
                    linkElement.setAttribute('href', dataUri);
                    linkElement.setAttribute('download', exportFileDefaultName);
                    linkElement.click();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Details
                </Button>
                <Button onClick={onClose}>Close</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No transaction details available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentTransactionModal;