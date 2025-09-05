/**
 * Purchase History Modal Component
 * Shows full purchase history and details for Project Manager
 */

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, X, Package, Calendar, MapPin, User, CheckCircle, 
  XCircle, Clock, AlertTriangle, MessageSquare, DollarSign,
  FileText, Briefcase, Timer, History
} from 'lucide-react';
import { projectManagerService, PurchaseStatusDetails } from '../services/projectManagerService';
import { format, formatDistance } from 'date-fns';

interface PurchaseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: string;
}

export const PurchaseHistoryModal: React.FC<PurchaseHistoryModalProps> = ({
  isOpen,
  onClose,
  purchaseId
}) => {
  const [loading, setLoading] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseStatusDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && purchaseId) {
      fetchPurchaseDetails();
    }
  }, [isOpen, purchaseId]);

  const fetchPurchaseDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const details = await projectManagerService.getPurchaseStatusDetails(parseInt(purchaseId));
      setPurchaseDetails(details);
    } catch (error: any) {
      console.error('Error fetching purchase details:', error);
      setError(error.response?.data?.error || 'Failed to fetch purchase details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };

  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'procurement':
        return <Briefcase className="h-4 w-4" />;
      case 'projectManager':
        return <User className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (!purchaseDetails && !loading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Purchase #{purchaseId} - Full History
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchPurchaseDetails} className="mt-4" variant="outline">
              Try Again
            </Button>
          </div>
        ) : purchaseDetails ? (
          <div className="space-y-6">
            {/* Purchase Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Purchase Overview</span>
                  <Badge className={getStatusColor(purchaseDetails.latest_pm_proc_status.status)}>
                    {purchaseDetails.latest_pm_proc_status.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <MapPin className="h-4 w-4" />
                      Location
                    </div>
                    <p className="font-medium">{purchaseDetails.purchase_details.site_location}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Calendar className="h-4 w-4" />
                      Created Date
                    </div>
                    <p className="font-medium">{formatDate(purchaseDetails.purchase_details.created_at)}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <FileText className="h-4 w-4" />
                    Purpose
                  </div>
                  <p className="font-medium">{purchaseDetails.purchase_details.purpose}</p>
                </div>

                {/* Materials Summary */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-blue-600">Materials</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {purchaseDetails.purchase_details.materials_summary.total_materials}
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-green-600">Quantity</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {purchaseDetails.purchase_details.materials_summary.total_quantity}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                      <span className="text-xs text-purple-600">Total Cost</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatCurrency(purchaseDetails.purchase_details.materials_summary.total_cost)}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-orange-600" />
                      <span className="text-xs text-orange-600">Categories</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {purchaseDetails.purchase_details.materials_summary.categories.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Approval History Tabs */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="all">All History</TabsTrigger>
                <TabsTrigger value="procurement">Procurement</TabsTrigger>
                <TabsTrigger value="pm">Project Manager</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3">
                <h3 className="font-semibold text-lg mb-3">Complete Approval History</h3>
                {/* Combine and sort all statuses by date */}
                {[...purchaseDetails.procurement_statuses, ...purchaseDetails.project_manager_statuses]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((status, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(status.role)}
                          <span className="font-medium capitalize">{status.role.replace('Manager', ' Manager')}</span>
                        </div>
                        <Badge className={getStatusColor(status.status)}>
                          {status.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{formatDate(status.date)}</p>
                      {status.decision_by && (
                        <p className="text-sm">
                          <span className="text-gray-600">Decided by:</span> {status.decision_by.full_name}
                        </p>
                      )}
                      {status.comments && (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded mt-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-blue-900 mb-1">
                            <MessageSquare className="h-4 w-4" />
                            Comments
                          </div>
                          <p className="text-sm text-blue-800 pl-6">{status.comments}</p>
                        </div>
                      )}
                      {status.rejection_reason && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded mt-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-red-900 mb-1">
                            <AlertTriangle className="h-4 w-4" />
                            Rejection Reason
                          </div>
                          <p className="text-sm text-red-800 pl-6">{status.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="procurement" className="space-y-3">
                <h3 className="font-semibold text-lg mb-3">Procurement History</h3>
                {purchaseDetails.procurement_statuses.length > 0 ? (
                  purchaseDetails.procurement_statuses.map((status, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Procurement Review</span>
                        <Badge className={getStatusColor(status.status)}>
                          {status.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{formatDate(status.date)}</p>
                      {status.decision_by && (
                        <p className="text-sm">
                          <span className="text-gray-600">Reviewed by:</span> {status.decision_by.full_name}
                        </p>
                      )}
                      {status.comments && (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded mt-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-blue-900 mb-1">
                            <MessageSquare className="h-4 w-4" />
                            Comments
                          </div>
                          <p className="text-sm text-blue-800 pl-6">{status.comments}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No procurement history</p>
                )}
              </TabsContent>

              <TabsContent value="pm" className="space-y-3">
                <h3 className="font-semibold text-lg mb-3">Project Manager History</h3>
                {purchaseDetails.project_manager_statuses.length > 0 ? (
                  purchaseDetails.project_manager_statuses.map((status, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">PM Review</span>
                        <Badge className={getStatusColor(status.status)}>
                          {status.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{formatDate(status.date)}</p>
                      {status.decision_by && (
                        <p className="text-sm">
                          <span className="text-gray-600">Reviewed by:</span> {status.decision_by.full_name}
                        </p>
                      )}
                      {status.comments && (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded mt-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-blue-900 mb-1">
                            <MessageSquare className="h-4 w-4" />
                            Comments
                          </div>
                          <p className="text-sm text-blue-800 pl-6">{status.comments}</p>
                        </div>
                      )}
                      {status.rejection_reason && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded mt-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-red-900 mb-1">
                            <AlertTriangle className="h-4 w-4" />
                            Rejection Reason
                          </div>
                          <p className="text-sm text-red-800 pl-6">{status.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No project manager history</p>
                )}
              </TabsContent>
            </Tabs>

            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Summary Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {purchaseDetails.summary.total_procurement_statuses}
                    </p>
                    <p className="text-sm text-gray-600">Procurement Reviews</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {purchaseDetails.summary.total_pm_statuses}
                    </p>
                    <p className="text-sm text-gray-600">PM Reviews</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {purchaseDetails.summary.pm_approved_count}
                    </p>
                    <p className="text-sm text-gray-600">PM Approvals</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {purchaseDetails.summary.pm_rejected_count}
                    </p>
                    <p className="text-sm text-gray-600">PM Rejections</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseHistoryModal;