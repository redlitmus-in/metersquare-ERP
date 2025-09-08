/**
 * Purchase Details Modal Component for Accounts
 * Shows detailed purchase information with payment focus
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  MapPin, 
  Calendar, 
  User, 
  FileText,
  DollarSign,
  CreditCard,
  Building,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { accountsService } from '../services/accountsService';

interface PurchaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: number | null;
  showHistoryOnly?: boolean;
}

const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({
  isOpen,
  onClose,
  purchaseId,
  showHistoryOnly = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseData, setPurchaseData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && purchaseId) {
      fetchPurchaseDetails();
    }
  }, [isOpen, purchaseId]);

  const fetchPurchaseDetails = async () => {
    try {
      setIsLoading(true);
      const response = await accountsService.getPurchaseDetails(purchaseId!);
      setPurchaseData(response);
    } catch (error) {
      console.error('Error fetching purchase details:', error);
      setPurchaseData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'approved':
      case 'payment_processed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">{status}</Badge>;
      case 'rejected':
      case 'payment_rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">{status}</Badge>;
      case 'pending':
      case 'payment_processing':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">{status}</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status}</Badge>;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {showHistoryOnly ? 'Payment History' : 'Purchase Details'} 
            {purchaseId && `- PR #${purchaseId}`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : !purchaseData ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Failed to load purchase details</p>
              </div>
            </div>
          ) : (
            <Tabs defaultValue={showHistoryOnly ? "history" : "details"} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Purchase Details</TabsTrigger>
                <TabsTrigger value="payment">Payment Info</TabsTrigger>
                <TabsTrigger value="history">Status History</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                {purchaseData.purchase && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Basic Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Package className="h-5 w-5 text-blue-600" />
                          Purchase Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Location:</span>
                            <span className="text-sm font-medium">{purchaseData.purchase.site_location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Requested by:</span>
                            <span className="text-sm font-medium">{purchaseData.purchase.requested_by}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Date:</span>
                            <span className="text-sm font-medium">
                              {new Date(purchaseData.purchase.date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Total Cost:</span>
                            <span className="text-sm font-bold text-green-600">
                              {formatCurrency(purchaseData.purchase.total_cost || 0)}
                            </span>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <span className="text-sm text-gray-600">Purpose:</span>
                          <p className="text-sm mt-1 bg-gray-50 p-2 rounded">
                            {purchaseData.purchase.purpose}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Materials List */}
                    {purchaseData.materials && purchaseData.materials.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Package className="h-5 w-5 text-green-600" />
                            Materials ({purchaseData.materials.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {purchaseData.materials.map((material: any, index: number) => (
                              <div key={index} className="border rounded-lg p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-medium text-sm">{material.material_name}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {material.priority || 'Medium'} Priority
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                                  <div>
                                    <span className="font-medium">Quantity:</span> {material.quantity}
                                  </div>
                                  <div>
                                    <span className="font-medium">Unit Cost:</span> {formatCurrency(material.unit_cost || 0)}
                                  </div>
                                  <div>
                                    <span className="font-medium">Total:</span> {formatCurrency((material.quantity || 0) * (material.unit_cost || 0))}
                                  </div>
                                </div>
                                {material.specifications && (
                                  <p className="text-xs text-gray-500 mt-2">
                                    <span className="font-medium">Specs:</span> {material.specifications}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>
                )}
              </TabsContent>

              <TabsContent value="payment" className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Payment Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-green-600" />
                        Payment Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-medium text-green-900">Total Payment Amount</span>
                          <span className="text-2xl font-bold text-green-600">
                            {formatCurrency(purchaseData.purchase?.total_cost || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Payment Details */}
                      {purchaseData.purchase?.payment_details && (
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <Building className="h-4 w-4 text-blue-600" />
                            Payment Details
                          </h4>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="font-medium">Method:</span> 
                                {purchaseData.purchase.payment_details.payment_method || 'Bank Transfer'}
                              </div>
                              <div>
                                <span className="font-medium">Reference:</span> 
                                {purchaseData.purchase.payment_details.payment_reference || 'N/A'}
                              </div>
                              {purchaseData.purchase.payment_details.vendor_name && (
                                <div className="col-span-2">
                                  <span className="font-medium">Vendor:</span> 
                                  {purchaseData.purchase.payment_details.vendor_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Current Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        Payment Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Current Status:</span>
                        {getStatusBadge(purchaseData.purchase?.accounts_status || 'pending')}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        Status History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {purchaseData.history && purchaseData.history.length > 0 ? (
                        <div className="space-y-3">
                          {purchaseData.history.map((entry: any, index: number) => (
                            <div key={index} className="border-l-2 border-gray-200 pl-4 pb-4">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  {entry.status === 'approved' ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : entry.status === 'rejected' ? (
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-yellow-600" />
                                  )}
                                  <span className="font-medium text-sm">{entry.sender}</span>
                                  <span className="text-xs text-gray-500">→</span>
                                  <span className="font-medium text-sm">{entry.receiver}</span>
                                </div>
                                {getStatusBadge(entry.status)}
                              </div>
                              <p className="text-xs text-gray-500">
                                {new Date(entry.created_at).toLocaleString()}
                              </p>
                              {entry.comments && (
                                <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                                  {entry.comments}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No status history available</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseDetailsModal;