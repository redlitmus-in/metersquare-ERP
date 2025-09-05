/**
 * Purchase Details Modal Component
 * Shows comprehensive purchase information for estimation review
 * Styled to match PM module's PurchaseHistoryModal
 */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Loader2, Package, Calendar, MapPin, User, CheckCircle, 
  XCircle, Clock, AlertTriangle, MessageSquare, DollarSign,
  FileText, Briefcase, History, Calculator, TrendingUp
} from 'lucide-react';
import { estimationService } from '../services/estimationService';
import type { PurchaseStatusDetails } from '../services/estimationService';
import { toast } from 'sonner';

interface PurchaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: number | null;
}

export const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({
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
    if (!purchaseId) return;
    
    try {
      setLoading(true);
      setError(null);
      const details = await estimationService.getPurchaseStatusDetails(purchaseId);
      setPurchaseDetails(details);
    } catch (error: any) {
      console.error('Error fetching purchase details:', error);
      setError(error.response?.data?.error || 'Failed to fetch purchase details');
      toast.error('Failed to load purchase details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      case 'estimation':
        return <Calculator className="h-4 w-4" />;
      case 'technicalDirector':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (!purchaseDetails && !loading) return null;

  // Combine all statuses for the "All" tab
  const allStatuses = [
    ...(purchaseDetails?.procurement_statuses || []),
    ...(purchaseDetails?.project_manager_statuses || []),
    ...(purchaseDetails?.estimation_statuses || [])
  ].sort((a, b) => {
    const dateA = a?.date ? new Date(a.date).getTime() : 0;
    const dateB = b?.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Purchase #{purchaseId} - Full Details & History
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
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
                  <Badge className={getStatusColor(purchaseDetails.latest_pm_proc_status?.status || 'pending')}>
                    {purchaseDetails.latest_pm_proc_status?.status || 'pending'}
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
                    <p className="font-medium">{purchaseDetails.purchase_details?.site_location || 'N/A'}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Calendar className="h-4 w-4" />
                      Created Date
                    </div>
                    <p className="font-medium">{formatDate(purchaseDetails.purchase_details?.created_at || '')}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <FileText className="h-4 w-4" />
                    Purpose
                  </div>
                  <p className="font-medium">{purchaseDetails.purchase_details?.purpose || 'N/A'}</p>
                </div>

                {/* Materials Summary - Colored Cards */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-blue-600">Materials</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {purchaseDetails.purchase_details?.materials_summary?.total_materials || 0}
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-green-600">Quantity</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {purchaseDetails.purchase_details?.materials_summary?.total_quantity || 0}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                      <span className="text-xs text-purple-600">Total Cost</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatCurrency(purchaseDetails.purchase_details?.materials_summary?.total_cost || 0)}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-orange-600" />
                      <span className="text-xs text-orange-600">Categories</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {purchaseDetails.purchase_details?.materials_summary?.categories?.length || 0}
                    </p>
                  </div>
                </div>

                {/* Categories Display */}
                {purchaseDetails.purchase_details?.materials_summary?.categories && 
                 purchaseDetails.purchase_details.materials_summary.categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {purchaseDetails.purchase_details.materials_summary.categories.map((category) => (
                      <Badge key={category} variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Materials List */}
                {purchaseDetails.purchase_details?.materials_summary?.materials && 
                 purchaseDetails.purchase_details.materials_summary.materials.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Materials Details</h4>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                      {purchaseDetails.purchase_details.materials_summary.materials.map((material, index) => (
                        <div key={material.material_id || index} className="flex justify-between items-center py-2 border-b last:border-0">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{material.description}</p>
                            <p className="text-xs text-gray-600">
                              {material.category} | Priority: {material.priority}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {material.quantity} {material.unit}
                            </p>
                            <p className="text-xs text-gray-600">
                              {formatCurrency(material.cost * material.quantity)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Approval History Tabs */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="all">All History</TabsTrigger>
                <TabsTrigger value="procurement">Procurement</TabsTrigger>
                <TabsTrigger value="pm">Project Manager</TabsTrigger>
                <TabsTrigger value="estimation">Estimation</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3">
                <h3 className="font-semibold text-lg mb-3">Complete Approval History</h3>
                {allStatuses.length > 0 ? (
                  allStatuses.map((status, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {status.role && getRoleIcon(status.role)}
                          <span className="font-medium capitalize">
                            {status.role ? status.role.replace(/([A-Z])/g, ' $1').trim() : 'Unknown'}
                          </span>
                        </div>
                        <Badge className={getStatusColor(status.status || 'pending')}>
                          {status.status || 'pending'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{formatDate(status.date || '')}</p>
                      {status.decision_by && (
                        <p className="text-sm">
                          <span className="text-gray-600">Decided by:</span> {status.decision_by?.full_name || 'Unknown'}
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
                            {'reject_category' in status && status.reject_category && (
                              <Badge variant="outline" className="text-xs ml-2">
                                {status.reject_category === 'cost' ? 'Cost Issue' : 'PM Flag'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-red-800 pl-6">{status.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No history available</p>
                )}
              </TabsContent>

              <TabsContent value="procurement" className="space-y-3">
                <h3 className="font-semibold text-lg mb-3">Procurement History</h3>
                {purchaseDetails.procurement_statuses && purchaseDetails.procurement_statuses.length > 0 ? (
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
                          <span className="text-gray-600">Reviewed by:</span> {status.decision_by?.full_name || 'Unknown'}
                        </p>
                      )}
                      {status.comments && (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded mt-3">
                          <MessageSquare className="h-4 w-4 text-blue-900 inline mr-2" />
                          <span className="text-sm text-blue-800">{status.comments}</span>
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
                {purchaseDetails.project_manager_statuses && purchaseDetails.project_manager_statuses.length > 0 ? (
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
                          <span className="text-gray-600">Reviewed by:</span> {status.decision_by?.full_name || 'Unknown'}
                        </p>
                      )}
                      {status.comments && (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded mt-3">
                          <MessageSquare className="h-4 w-4 text-blue-900 inline mr-2" />
                          <span className="text-sm text-blue-800">{status.comments}</span>
                        </div>
                      )}
                      {status.rejection_reason && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded mt-3">
                          <AlertTriangle className="h-4 w-4 text-red-900 inline mr-2" />
                          <span className="text-sm text-red-800">{status.rejection_reason}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No project manager history</p>
                )}
              </TabsContent>

              <TabsContent value="estimation" className="space-y-3">
                <h3 className="font-semibold text-lg mb-3">Estimation History</h3>
                {purchaseDetails.estimation_statuses && purchaseDetails.estimation_statuses.length > 0 ? (
                  purchaseDetails.estimation_statuses.map((status, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Estimation Review</span>
                        <Badge className={getStatusColor(status.status)}>
                          {status.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{formatDate(status.date)}</p>
                      {status.decision_by && (
                        <p className="text-sm">
                          <span className="text-gray-600">Reviewed by:</span> {status.decision_by?.full_name || 'Unknown'}
                        </p>
                      )}
                      {status.comments && (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded mt-3">
                          <MessageSquare className="h-4 w-4 text-blue-900 inline mr-2" />
                          <span className="text-sm text-blue-800">{status.comments}</span>
                        </div>
                      )}
                      {status.rejection_reason && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded mt-3">
                          <AlertTriangle className="h-4 w-4 text-red-900 inline mr-2" />
                          <span className="text-sm text-red-800">{status.rejection_reason}</span>
                          {status.reject_category && (
                            <Badge variant="outline" className="text-xs ml-2">
                              {status.reject_category === 'cost' ? 'Cost Issue' : 'PM Flag'}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No estimation history yet</p>
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
                      {purchaseDetails.summary?.total_procurement_statuses || 0}
                    </p>
                    <p className="text-sm text-gray-600">Procurement Reviews</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {purchaseDetails.summary?.total_pm_statuses || 0}
                    </p>
                    <p className="text-sm text-gray-600">PM Reviews</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600">
                      {purchaseDetails.summary?.total_estimation_statuses || 0}
                    </p>
                    <p className="text-sm text-gray-600">Estimation Reviews</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {purchaseDetails.summary?.pm_approved_count || 0}
                    </p>
                    <p className="text-sm text-gray-600">Total Approvals</p>
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