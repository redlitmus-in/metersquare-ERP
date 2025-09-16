/**
 * Payment Transaction Details Modal Component
 * Shows detailed transaction information and transfer history
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Eye,
  Phone,
  Mail,
  MapPin,
  FileDown
} from 'lucide-react';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import { accountsService } from '../services/accountsService';
import { toast } from 'sonner';
// jsPDF will be dynamically imported when needed

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
  const contentRef = useRef<HTMLDivElement>(null);

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

  const parseVendorAccountDetails = (details: string) => {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(details);
      return parsed;
    } catch {
      // If not valid JSON, return as is
      return details;
    }
  };

  const exportToPDF = async () => {
    if (!transactionData) return;

    // Dynamically import jsPDF to reduce initial bundle size
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Title
    pdf.setFontSize(18);
    pdf.setTextColor(30, 64, 175); // Blue color
    pdf.text('Payment Transaction Details', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Purchase Information
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Purchase ID: ${transactionData.purchase_id}`, 20, yPosition);
    yPosition += 8;
    
    if (transactionData.purchase_reference) {
      pdf.setFontSize(11);
      pdf.text(`Reference: ${transactionData.purchase_reference}`, 20, yPosition);
      yPosition += 8;
    }

    if (transactionData.vendor) {
      pdf.text(`Vendor: ${transactionData.vendor.name}`, 20, yPosition);
      yPosition += 10;
    }

    // Transactions
    transactionData.transactions.forEach((transaction, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }

      // Transaction header
      pdf.setFillColor(240, 240, 240);
      pdf.rect(15, yPosition - 5, pageWidth - 30, 10, 'F');
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Transaction ID: ${transaction.transaction_id}`, 20, yPosition);
      yPosition += 10;

      // Status
      pdf.setFontSize(10);
      pdf.text(`Status: ${transaction.status}`, 20, yPosition);
      yPosition += 6;

      // Amount
      pdf.setTextColor(0, 128, 0);
      pdf.text(`Amount: ${transaction.currency || 'AED'} ${(transaction.amount || 0).toLocaleString()}`, 20, yPosition);
      pdf.setTextColor(0, 0, 0);
      yPosition += 6;

      // Payment Method
      pdf.text(`Payment Method: ${transaction.payment_method}`, 20, yPosition);
      yPosition += 6;

      // Payment Reference
      if (transaction.payment_reference) {
        pdf.text(`Payment Reference: ${transaction.payment_reference}`, 20, yPosition);
        yPosition += 6;
      }

      // Vendor Account Details
      if (transaction.vendor_account_details) {
        const vendorDetails = parseVendorAccountDetails(transaction.vendor_account_details);
        pdf.setFontSize(11);
        pdf.setTextColor(30, 64, 175);
        pdf.text('Vendor Account Details:', 20, yPosition);
        yPosition += 6;
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        
        if (typeof vendorDetails === 'object') {
          Object.entries(vendorDetails).forEach(([key, value]) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = 20;
            }
            const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            pdf.text(`${displayKey}: ${value}`, 25, yPosition);
            yPosition += 5;
          });
        } else {
          pdf.text(String(vendorDetails), 25, yPosition);
          yPosition += 6;
        }
      }

      // Notes
      if (transaction.notes) {
        pdf.setTextColor(184, 134, 11);
        pdf.text('Notes:', 20, yPosition);
        pdf.setTextColor(0, 0, 0);
        yPosition += 6;
        
        // Wrap long text
        const splitNotes = pdf.splitTextToSize(transaction.notes, pageWidth - 45);
        splitNotes.forEach((line: string) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(line, 25, yPosition);
          yPosition += 5;
        });
      }

      // Dates
      if (transaction.created_at) {
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Created: ${new Date(transaction.created_at).toLocaleString()}`, 20, yPosition);
        yPosition += 5;
      }

      yPosition += 10; // Space between transactions
    });

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Save the PDF
    pdf.save(`payment_transaction_${transactionData.purchase_id}_${new Date().getTime()}.pdf`);
    toast.success('PDF exported successfully');
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
            <ModernLoadingSpinners variant="pulse-wave" size="lg" />
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
                    {transaction.vendor_account_details && (() => {
                      const vendorDetails = parseVendorAccountDetails(transaction.vendor_account_details);
                      
                      if (typeof vendorDetails === 'object' && vendorDetails !== null) {
                        return (
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-start gap-2 mb-3">
                              <Building className="h-4 w-4 text-blue-500 mt-0.5" />
                              <span className="text-sm text-blue-700 font-medium">Vendor Account Details:</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {Object.entries(vendorDetails).map(([key, value]) => {
                                // Format the key for display
                                const displayKey = key
                                  .replace(/_/g, ' ')
                                  .replace(/\b\w/g, l => l.toUpperCase())
                                  .replace('Account Number', 'Account')
                                  .replace('Swift Code', 'SWIFT')
                                  .replace('Iban', 'IBAN');
                                
                                // Get appropriate icon for each field
                                let icon = null;
                                if (key.includes('account')) icon = <CreditCard className="h-3 w-3" />;
                                else if (key.includes('bank')) icon = <Building className="h-3 w-3" />;
                                else if (key.includes('phone')) icon = <Phone className="h-3 w-3" />;
                                else if (key.includes('email')) icon = <Mail className="h-3 w-3" />;
                                else if (key.includes('address')) icon = <MapPin className="h-3 w-3" />;
                                else icon = <FileText className="h-3 w-3" />;
                                
                                return (
                                  <div key={key} className="bg-white rounded-md p-2.5 border border-blue-100">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                                      {icon}
                                      <span>{displayKey}:</span>
                                    </div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {String(value) || '-'}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      } else {
                        // If not an object, display as plain text
                        return (
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <Building className="h-4 w-4 text-blue-500 mt-0.5" />
                              <div>
                                <span className="text-sm text-blue-700 font-medium">Vendor Account Details:</span>
                                <p className="text-sm text-blue-600 mt-1">{String(vendorDetails)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })()}

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
                    {transaction.supporting_documents && (() => {
                      // Check if it's an empty object or array
                      const docs = transaction.supporting_documents;
                      const isEmpty = docs === '{}' || docs === '[]' || 
                                     (typeof docs === 'object' && Object.keys(docs).length === 0);
                      
                      if (isEmpty) {
                        return (
                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-green-700 font-medium">Supporting Documents:</span>
                              <span className="text-sm text-green-600 italic">No documents attached</span>
                            </div>
                          </div>
                        );
                      }
                      
                      // Try to parse if it's a JSON string
                      let parsedDocs = docs;
                      if (typeof docs === 'string') {
                        try {
                          parsedDocs = JSON.parse(docs);
                        } catch {
                          // If not JSON, use as is
                          parsedDocs = docs;
                        }
                      }
                      
                      // Display based on type
                      if (Array.isArray(parsedDocs) && parsedDocs.length > 0) {
                        return (
                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-green-500 mt-0.5" />
                              <div>
                                <span className="text-sm text-green-700 font-medium">Supporting Documents:</span>
                                <ul className="mt-2 space-y-1">
                                  {parsedDocs.map((doc: any, index: number) => (
                                    <li key={index} className="text-sm text-green-600 flex items-center gap-1">
                                      <span>•</span>
                                      <span>{typeof doc === 'string' ? doc : doc.name || `Document ${index + 1}`}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        );
                      } else if (typeof parsedDocs === 'object' && parsedDocs !== null && Object.keys(parsedDocs).length > 0) {
                        return (
                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-green-500 mt-0.5" />
                              <div>
                                <span className="text-sm text-green-700 font-medium">Supporting Documents:</span>
                                <div className="mt-2 space-y-1">
                                  {Object.entries(parsedDocs).map(([key, value]) => (
                                    <div key={key} className="text-sm text-green-600">
                                      <span className="font-medium">{key}:</span> {String(value)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      } else if (typeof parsedDocs === 'string' && parsedDocs.trim() !== '') {
                        return (
                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-green-700 font-medium">Supporting Documents:</span>
                              <span className="text-sm text-green-600">{parsedDocs}</span>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-green-700 font-medium">Supporting Documents:</span>
                              <span className="text-sm text-green-600 italic">No documents attached</span>
                            </div>
                          </div>
                        );
                      }
                    })()}

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
                  onClick={exportToPDF}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export as PDF
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