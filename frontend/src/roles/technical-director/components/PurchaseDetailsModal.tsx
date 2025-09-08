/**
 * Purchase Details Modal Component for Technical Director Hub
 * Shows comprehensive purchase information with proper formatting
 * Reuses the service layer for consistent data fetching
 */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, Package, Calendar, MapPin, User, CheckCircle, 
  XCircle, Clock, AlertTriangle, MessageSquare, DollarSign,
  FileText, Building2, Shield, Download, Hash, Info, RefreshCw
} from 'lucide-react';
import { technicalDirectorService } from '../services/technicalDirectorService';
import { toast } from 'sonner';

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
  const [loading, setLoading] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (isOpen && purchaseId) {
      fetchPurchaseDetails();
      setActiveTab(showHistoryOnly ? 'history' : 'overview');
    }
  }, [isOpen, purchaseId, showHistoryOnly]);

  const fetchPurchaseDetails = async () => {
    if (!purchaseId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Use different endpoints based on mode
      const response = showHistoryOnly 
        ? await technicalDirectorService.getPurchaseHistory(purchaseId)
        : await technicalDirectorService.getPurchaseDetails(purchaseId);
      
      // Check if response indicates an error
      if (response && response.success === false) {
        setError(response.message || 'Failed to load purchase details');
        setPurchaseDetails(null);
      } else {
        // Normalize the response structure
        if (showHistoryOnly && response.purchase) {
          // For history endpoint, extract approvals as history
          setPurchaseDetails({
            purchase: response.purchase,
            materials: response.purchase.materials || [],
            history: response.purchase.approvals || [],
            latest_status: response.latest_status
          });
        } else if (!showHistoryOnly && response.purchase) {
          // For details endpoint, use the purchase data
          setPurchaseDetails({
            purchase: response.purchase,
            materials: response.purchase.materials || [],
            history: response.purchase.approvals || [],
            latest_status: response.latest_status
          });
        } else {
          setPurchaseDetails(response);
        }
      }
    } catch (error: any) {
      console.error('Error fetching purchase details:', error);
      
      // Set appropriate error message
      if (error.response?.status === 404) {
        setError('Purchase details not found. The purchase may have been deleted.');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to view this purchase.');
      } else if (error.response?.status === 401) {
        setError('Your session has expired. Please login again.');
      } else if (!navigator.onLine) {
        setError('No internet connection. Please check your network.');
      } else {
        setError('Failed to load purchase details. Please try again.');
      }
      
      setPurchaseDetails(null);
      toast.error(error.response?.data?.message || 'Failed to load purchase details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return 'AED 0';
    }
    return `AED ${amount.toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchPurchaseDetails();
  };

  // Don't render if modal is not open
  if (!isOpen) return null;

  const purchase = purchaseDetails?.purchase || purchaseDetails || {};
  const materials = purchaseDetails?.materials || purchase?.materials || [];
  const history = purchaseDetails?.history || purchaseDetails?.purchase?.approvals || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              {showHistoryOnly ? 'Purchase History' : 'Purchase Details'} - #{purchaseId}
            </span>
            {purchase?.technical_director_status && (
              getStatusBadge(purchase.technical_director_status)
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-2 text-sm text-gray-600">Loading purchase details...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-lg font-medium text-gray-900">Unable to Load Details</p>
            <p className="text-sm text-gray-600 mt-2 text-center max-w-md">{error}</p>
            <Button 
              onClick={handleRetry} 
              className="mt-4 bg-indigo-600 hover:bg-indigo-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : !purchaseDetails ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Info className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900">No Data Available</p>
            <p className="text-sm text-gray-600 mt-2">Purchase details could not be loaded</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            {showHistoryOnly ? (
              // History-only mode: Just show history without tabs
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="history">Approval History</TabsTrigger>
              </TabsList>
            ) : (
              // Details mode: Show overview and materials tabs only
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="materials">Materials</TabsTrigger>
              </TabsList>
            )}

            <div className="flex-1 overflow-y-auto">
              {/* Overview Tab - Only show in details mode */}
              {!showHistoryOnly && (
                <TabsContent value="overview" className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Location:</span>
                      <span className="font-medium">{purchase.site_location || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Requested by:</span>
                      <span className="font-medium">{purchase.requested_by || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Date:</span>
                      <span className="font-medium">
                        {purchase.date || purchase.created_at 
                          ? new Date(purchase.date || purchase.created_at).toLocaleDateString() 
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Project ID:</span>
                      <span className="font-medium">{purchase.project_id || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Purpose:</span>
                      <span className="font-medium">{purchase.purpose || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Cost Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Cost Summary
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Items</p>
                      <p className="text-lg font-semibold">{materials.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Quantity</p>
                      <p className="text-lg font-semibold">{purchase.total_quantity || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Cost</p>
                      <p className="text-lg font-semibold text-indigo-600">
                        {formatCurrency(purchase.total_cost || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Current Status - Show latest status or technical director status */}
                {(purchaseDetails?.latest_status || purchase?.technical_director_status) && (
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">Current Status</h3>
                    <div className="space-y-2">
                      {purchaseDetails?.latest_status ? (
                        <>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(purchaseDetails.latest_status.status)}
                            <span className="text-sm text-gray-600">
                              Role: {purchaseDetails.latest_status.role}
                            </span>
                          </div>
                          {purchaseDetails.latest_status.created_by && (
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">By:</span> {purchaseDetails.latest_status.created_by}
                            </p>
                          )}
                          {purchaseDetails.latest_status.comments && (
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Comments:</span> {purchaseDetails.latest_status.comments}
                            </p>
                          )}
                          {purchaseDetails.latest_status.rejection_reason && (
                            <p className="text-sm text-red-700">
                              <span className="font-medium">Rejection Reason:</span> {purchaseDetails.latest_status.rejection_reason}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(purchase.technical_director_status)}
                            {purchase?.technical_director_decision_by && (
                              <span className="text-sm text-gray-600">
                                by {purchase.technical_director_decision_by}
                              </span>
                            )}
                          </div>
                          {purchase?.technical_director_comments && (
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Comments:</span> {purchase.technical_director_comments}
                            </p>
                          )}
                          {purchase?.technical_director_rejection_reason && (
                            <p className="text-sm text-red-700">
                              <span className="font-medium">Rejection Reason:</span> {purchase.technical_director_rejection_reason}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
                </TabsContent>
              )}

              {/* Materials Tab - Only show in details mode */}
              {!showHistoryOnly && (
                <TabsContent value="materials" className="p-4">
                <div className="space-y-3">
                  {materials.map((material: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{material.description || 'No description'}</h4>
                          <p className="text-sm text-gray-600 mt-1">{material.specification || 'No specification'}</p>
                          <div className="flex gap-4 mt-2">
                            <span className="text-sm">
                              <span className="text-gray-600">Category:</span> {material.category || 'N/A'}
                            </span>
                            <span className="text-sm">
                              <span className="text-gray-600">Quantity:</span> {material.quantity || 0} {material.unit || ''}
                            </span>
                            <span className="text-sm">
                              <span className="text-gray-600">Unit Cost:</span> {formatCurrency(material.unit_cost || material.cost)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total</p>
                          <p className="font-semibold text-indigo-600">
                            {formatCurrency(material.total_cost || (material.quantity * (material.unit_cost || material.cost)) || 0)}
                          </p>
                          <Badge className="mt-1" variant="outline">
                            {material.priority || 'Normal'} Priority
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                </TabsContent>
              )}

              {/* History Tab - Always show in history mode, never in details mode */}
              {showHistoryOnly && (
                <TabsContent value="history" className="p-4">
                <div className="space-y-3">
                  {history.length > 0 ? (
                    history.map((entry: any, index: number) => {
                      // Handle different date field names
                      const entryDate = entry.decision_date || entry.created_at || entry.date;
                      const decisionBy = entry.created_by || entry.decision_by || entry.decision_by_user_id;
                      
                      return (
                        <div key={index} className="border-l-2 border-gray-200 pl-4 pb-4">
                          <div className="flex items-center gap-2">
                            {entry.status === 'approved' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : entry.status === 'rejected' ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className="font-medium capitalize">
                              {entry.role || entry.sender || 'Unknown Role'}
                            </span>
                            {getStatusBadge(entry.status)}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {entryDate ? new Date(entryDate).toLocaleString() : 'Date not available'}
                          </p>
                          {decisionBy && (
                            <p className="text-sm mt-1">
                              <span className="text-gray-600">By:</span> {decisionBy}
                            </p>
                          )}
                          {entry.comments && (
                            <p className="text-sm mt-1">
                              <span className="text-gray-600">Comments:</span> {entry.comments}
                            </p>
                          )}
                          {entry.rejection_reason && (
                            <p className="text-sm text-red-600 mt-1">
                              <span className="font-medium">Rejection:</span> {entry.rejection_reason}
                            </p>
                          )}
                          {entry.receiver && entry.receiver !== entry.role && (
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">Sent to:</span> {entry.receiver}
                            </p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-gray-500 py-4">No history available</p>
                  )}
                </div>
                </TabsContent>
              )}
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseDetailsModal;