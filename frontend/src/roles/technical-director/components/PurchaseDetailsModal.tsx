/**
 * Purchase Details Modal Component for Technical Director Hub
 * Modern design with blue header and organized information cards
 */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
 Package, Calendar, MapPin, User, CheckCircle, 
  XCircle, Clock, AlertTriangle, MessageSquare, DollarSign,
  FileText, Building2, Download, Info, RefreshCw,
  Activity, ExternalLink, Users, Mail, Target, Hash,
  Briefcase, UserCheck, Send, Paperclip
} from 'lucide-react';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import { technicalDirectorService } from '../services/technicalDirectorService';
import { API_BASE_URL } from '@/api/config';
import { toast } from 'sonner';
import { formatDateTimeLocal } from '@/utils/dateFormatter';

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
  const [activeTab, setActiveTab] = useState('details');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && purchaseId) {
      fetchPurchaseDetails();
      setActiveTab(showHistoryOnly ? 'history' : 'details');
    }
  }, [isOpen, purchaseId, showHistoryOnly]);

  const fetchPurchaseDetails = async () => {
    if (!purchaseId) return;

    try {
      setLoading(true);
      setError(null);

      const response = showHistoryOnly
        ? await technicalDirectorService.getPurchaseHistory(purchaseId)
        : await technicalDirectorService.getPurchaseDetails(purchaseId);

      console.log('API Response:', response); // Debug log

      if (response && response.success === false) {
        setError(response.message || 'Failed to load purchase details');
        setPurchaseDetails(null);
      } else {
        if (showHistoryOnly && response.purchase) {
          const approvals = response.purchase.approvals || {};
          console.log('Approvals data:', approvals); // Debug log
          setPurchaseDetails({
            purchase: response.purchase,
            materials: response.purchase.materials || [],
            history: approvals, // Pass the entire approvals object
            latest_status: response.latest_status
          });
        } else if (!showHistoryOnly && response.purchase) {
          setPurchaseDetails({
            purchase: response.purchase,
            materials: response.purchase.materials || [],
            history: response.purchase.approvals || {},
            latest_status: response.latest_status
          });
        } else {
          setPurchaseDetails(response);
        }
      }
    } catch (error: any) {
      console.error('Error fetching purchase details:', error);
      setError('Failed to load purchase details. Please try again.');
      setPurchaseDetails(null);
      toast.error('Failed to load purchase details');
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
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300 px-3 py-1">
            <CheckCircle className="h-3 w-3 mr-1" />
            APPROVED
          </Badge>
        );
      case 'completed':
      case 'complete':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-300 px-3 py-1">
            <CheckCircle className="h-3 w-3 mr-1" />
            COMPLETED
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300 px-3 py-1">
            <XCircle className="h-3 w-3 mr-1" />
            REJECTED
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 px-3 py-1">
            <Clock className="h-3 w-3 mr-1" />
            PENDING
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-300 px-3 py-1 uppercase">
            {status}
          </Badge>
        );
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    return formatDateTimeLocal(date);
  };

  if (!isOpen) return null;

  const purchase = purchaseDetails?.purchase || purchaseDetails || {};
  const materials = purchaseDetails?.materials || purchase?.materials || [];
  // Handle both old and new history formats
  const history = purchaseDetails?.history ||
                  purchaseDetails?.purchase?.approvals ||
                  (purchase?.approvals ? purchase.approvals : []);
  const latestStatus = purchaseDetails?.latest_status;

  // Calculate total cost
  const totalCost = purchase.total_cost || materials.reduce((sum: number, m: any) => 
    sum + ((m.cost || 0) * (m.quantity || 1)), 0
  ) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        {/* Blue Header */}
        <div className="bg-[#243d8a] text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6" />
              <div>
                <h2 className="text-xl font-semibold">
                  {showHistoryOnly ? 'Purchase Request History' : 'Purchase Request Details'}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-blue-100 text-sm"># PR-{purchaseId}</span>
                  {(latestStatus?.status === 'completed' || latestStatus?.status === 'complete') 
                    ? getStatusBadge('completed')
                    : purchase?.technical_director_status 
                    ? getStatusBadge(purchase.technical_director_status)
                    : null
                  }
                </div>
              </div>
            </div>
            {/* Export option removed as requested */}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <ModernLoadingSpinners variant="pulse-wave" size="lg" />
            <p className="text-gray-600">Loading purchase details...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-lg font-medium text-gray-900">Unable to Load Details</p>
            <p className="text-sm text-gray-600 mt-2">{error}</p>
            <Button 
              onClick={fetchPurchaseDetails} 
              className="mt-4 bg-[#243d8a] hover:bg-[#243d8a]/90"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : purchaseDetails ? (
          <div className="flex-1 overflow-hidden">
            {/* Summary Cards - Only show when not in history mode */}
            {!showHistoryOnly && (
              <div className="grid grid-cols-3 gap-3 p-4">
                <Card className="bg-blue-50 border-blue-200 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600 font-medium">Total Amount</p>
                      <p className="text-lg font-bold text-blue-900 mt-0.5">
                        {formatCurrency(totalCost)}
                      </p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </Card>

                <Card className="bg-purple-50 border-purple-200 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-purple-600 font-medium">Materials</p>
                      <p className="text-lg font-bold text-purple-900 mt-0.5">
                        {materials.length} Items
                      </p>
                    </div>
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Package className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </Card>

                <Card className="bg-green-50 border-green-200 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-600 font-medium">Email Status</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {purchase.email_sent ? (
                          <>
                            <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Sent
                            </Badge>
                          </>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700 border-gray-300 text-xs">
                            Not Sent
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Mail className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <TabsList className="mx-4 bg-gray-100">
                {!showHistoryOnly ? (
                  <>
                    <TabsTrigger value="details" className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Details
                    </TabsTrigger>
                    <TabsTrigger value="materials" className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Materials
                    </TabsTrigger>
                    <TabsTrigger value="status" className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Latest Status
                    </TabsTrigger>
                  </>
                ) : (
                  <TabsTrigger value="history" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Approval History
                  </TabsTrigger>
                )}
              </TabsList>

              <div className="p-4 overflow-y-auto max-h-[calc(90vh-300px)]">
                {/* Details Tab */}
                {!showHistoryOnly && (
                  <TabsContent value="details" className="mt-0 space-y-6">
                    {/* Basic Information Section */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Info className="h-5 w-5 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div className="flex items-start gap-3">
                          <Building2 className="h-5 w-5 text-gray-400 mt-1" />
                          <div>
                            <p className="text-sm text-gray-500 uppercase tracking-wider">PROJECT ID</p>
                            <p className="font-semibold text-gray-900 mt-1">{purchase.project_id || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-gray-400 mt-1" />
                          <div>
                            <p className="text-sm text-gray-500 uppercase tracking-wider">REQUEST DATE</p>
                            <p className="font-semibold text-gray-900 mt-1">
                              {formatDate(purchase.date || purchase.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <User className="h-5 w-5 text-gray-400 mt-1" />
                          <div>
                            <p className="text-sm text-gray-500 uppercase tracking-wider">REQUESTED BY</p>
                            <p className="font-semibold text-gray-900 mt-1">{purchase.requested_by || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <UserCheck className="h-5 w-5 text-gray-400 mt-1" />
                          <div>
                            <p className="text-sm text-gray-500 uppercase tracking-wider">CREATED BY</p>
                            <p className="font-semibold text-gray-900 mt-1">{purchase.created_by || purchase.requested_by || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                          <div>
                            <p className="text-sm text-gray-500 uppercase tracking-wider">SITE LOCATION</p>
                            <p className="font-semibold text-gray-900 mt-1">{purchase.site_location || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Mail className="h-5 w-5 text-gray-400 mt-1" />
                          <div>
                            <p className="text-sm text-gray-500 uppercase tracking-wider">EMAIL STATUS</p>
                            {purchase.email_sent ? (
                              <Badge className="bg-blue-100 text-blue-700 mt-1">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Sent ✓
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-700 mt-1">Not Sent</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Purpose Section */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <Target className="h-5 w-5 text-orange-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Purpose</h3>
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        {purchase.purpose || 'No purpose specified'}
                      </p>
                    </div>

                    {/* File Attachments */}
                    {purchase?.file_path && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Paperclip className="h-5 w-5 text-green-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Attachments</h3>
                        </div>
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-gray-500" />
                            <span className="text-gray-900 font-medium">{purchase.file_path}</span>
                          </div>
                          <Button
                            onClick={async () => {
                              try {
                                const response = await fetch(`${API_BASE_URL}/download_files?key=siteSupervisor&id=${purchaseId}`, {
                                  headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                                    'Content-Type': 'application/json'
                                  }
                                });
                                
                                if (response.ok) {
                                  const data = await response.json();
                                  if (data.purchase_files && data.purchase_files.length > 0) {
                                    const fileData = data.purchase_files[0];
                                    if (fileData.public_url) {
                                      const link = document.createElement('a');
                                      link.href = fileData.public_url;
                                      link.download = fileData.filename || purchase.file_path || 'download';
                                      link.style.display = 'none';
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      toast.success('Download started');
                                    }
                                  }
                                }
                              } catch (error) {
                                toast.error('Error downloading file');
                              }
                            }}
                            size="sm"
                            className="bg-[#243d8a] hover:bg-[#243d8a]/90"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                )}

                {/* Materials Tab */}
                {!showHistoryOnly && (
                  <TabsContent value="materials" className="mt-0 space-y-4">
                    {materials.length > 0 ? (
                      materials.map((material: any, index: number) => (
                        <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <Package className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">
                                    {material.description || 'No description'}
                                  </h4>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {material.specification || 'No specification'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-4 gap-4 mt-4">
                                <div>
                                  <p className="text-sm text-gray-500">Category</p>
                                  <p className="font-medium text-gray-900">{material.category || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Quantity</p>
                                  <p className="font-medium text-gray-900">
                                    {material.quantity || 0} {material.unit || ''}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Unit Cost</p>
                                  <p className="font-medium text-green-600">
                                    {formatCurrency(material.unit_cost || material.cost || 0)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Priority</p>
                                  <Badge className={
                                    material.priority?.toLowerCase() === 'high' ? 'bg-red-100 text-red-700' :
                                    material.priority?.toLowerCase() === 'low' ? 'bg-green-100 text-green-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }>
                                    {material.priority || 'Normal'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right ml-6">
                              <p className="text-sm text-gray-500">Total Cost</p>
                              <p className="text-xl font-bold text-green-600">
                                {formatCurrency((material.quantity || 0) * (material.cost || material.unit_cost || 0))}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No Materials Found</h3>
                        <p className="text-gray-600 mt-2">No materials have been added to this purchase request.</p>
                      </div>
                    )}
                  </TabsContent>
                )}

                {/* Latest Status Tab */}
                {!showHistoryOnly && (
                  <TabsContent value="status" className="mt-0">
                    {latestStatus ? (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-6">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Activity className="h-5 w-5 text-blue-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Latest Status Information</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-sm text-gray-500 uppercase tracking-wider mb-2">Status</p>
                            {getStatusBadge(latestStatus.status)}
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-500 uppercase tracking-wider mb-2">Role</p>
                            <p className="font-semibold text-gray-900 capitalize">{latestStatus.role}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-500 uppercase tracking-wider mb-2">Decision By</p>
                            <p className="font-semibold text-gray-900">{latestStatus.created_by || 'N/A'}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-500 uppercase tracking-wider mb-2">Decision Date</p>
                            <p className="font-semibold text-gray-900">
                              {formatDate(latestStatus.decision_date)}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-500 uppercase tracking-wider mb-2">Workflow</p>
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{latestStatus.sender}</span>
                              <ExternalLink className="h-4 w-4 text-gray-400" />
                              <span className="font-medium capitalize">{latestStatus.receiver}</span>
                            </div>
                          </div>
                        </div>
                        
                        {latestStatus.comments && (
                          <div className="mt-6">
                            <p className="text-sm text-gray-500 uppercase tracking-wider mb-2">Comments</p>
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                              <p className="text-gray-700">{latestStatus.comments}</p>
                            </div>
                          </div>
                        )}
                        
                        {latestStatus.rejection_reason && (
                          <div className="mt-6">
                            <p className="text-sm text-gray-500 uppercase tracking-wider mb-2">Rejection Reason</p>
                            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                              <p className="text-red-700">{latestStatus.rejection_reason}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No Status Information</h3>
                        <p className="text-gray-600 mt-2">Latest status information is not available.</p>
                      </div>
                    )}
                  </TabsContent>
                )}

                {/* History Tab (for history mode) */}
                {showHistoryOnly && (
                  <TabsContent value="history" className="mt-0 space-y-4">
                    {/* Simple Details Section */}
                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                      <div className="grid grid-cols-3 gap-8">
                        {/* Purchase Details */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                            <Package className="h-5 w-5 text-blue-600" />
                            <h3 className="font-semibold text-gray-900">Purchase Details</h3>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm text-gray-500">Purpose: </span>
                              <span className="text-sm font-medium text-gray-900">{purchase.purpose || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Location: </span>
                              <span className="text-sm font-medium text-gray-900">{purchase.site_location || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Project: </span>
                              <span className="text-sm font-medium text-gray-900">#{purchase.project_id || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Request Info */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                            <User className="h-5 w-5 text-green-600" />
                            <h3 className="font-semibold text-gray-900">Request Info</h3>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm text-gray-500">Requested by: </span>
                              <span className="text-sm font-medium text-gray-900">{purchase.requested_by || purchase.created_by || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Date: </span>
                              <span className="text-sm font-medium text-gray-900">
                                {purchase.date || purchase.created_at ?
                                  formatDateTimeLocal(purchase.date || purchase.created_at) : 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">TD Status: </span>
                              <span className="text-sm font-medium text-gray-900 capitalize">
                                {purchase.technical_director_status || purchase.td_status || 'Pending'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Timeline Stats */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                            <Activity className="h-5 w-5 text-purple-600" />
                            <h3 className="font-semibold text-gray-900">Timeline Stats</h3>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm text-gray-500">Total Steps: </span>
                              <span className="text-sm font-medium text-gray-900">
                                {(() => {
                                  const historyActions = history?.action || (Array.isArray(history) ? history : []);
                                  return historyActions.length || 0;
                                })()}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Approvals: </span>
                              <span className="text-sm font-medium text-green-600">
                                {(() => {
                                  const historyActions = history?.action || (Array.isArray(history) ? history : []);
                                  return historyActions.filter((h: any) => h.status === 'approved').length || 0;
                                })()}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Rejections: </span>
                              <span className="text-sm font-medium text-red-600">
                                {(() => {
                                  const historyActions = history?.action || (Array.isArray(history) ? history : []);
                                  return historyActions.filter((h: any) => h.status === 'rejected').length || 0;
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {(() => {
                      // Debug logging
                      console.log('History data in render:', history);

                      // Extract the action array from history (handle both formats)
                      const historyActions = history?.action || (Array.isArray(history) ? history : []);
                      console.log('History actions extracted:', historyActions);

                      if (historyActions && historyActions.length > 0) {
                        return (
                          <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gray-200"></div>

                            {/* Timeline entries */}
                            <div className="space-y-6">
                              {historyActions.map((entry: any, index: number) => (
                            <div key={index} className="relative flex items-start gap-4">
                              {/* Timeline dot */}
                              <div className={`relative z-10 p-3 rounded-full ${
                                entry.status === 'approved' ? 'bg-green-100' :
                                entry.status === 'rejected' ? 'bg-red-100' :
                                entry.status === 'completed' || entry.status === 'complete' ? 'bg-blue-100' :
                                'bg-yellow-100'
                              }`}>
                                {entry.status === 'approved' ? (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : entry.status === 'rejected' ? (
                                  <XCircle className="h-5 w-5 text-red-600" />
                                ) : entry.status === 'completed' || entry.status === 'complete' ? (
                                  <CheckCircle className="h-5 w-5 text-blue-600" />
                                ) : (
                                  <Clock className="h-5 w-5 text-yellow-600" />
                                )}
                              </div>

                              {/* Content card */}
                              <div className="flex-1 bg-white rounded-lg border border-gray-200 p-5">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold text-gray-900">
                                      {entry.role ? entry.role.replace(/([A-Z])/g, ' $1').trim()
                                        .replace(/^./, (str: string) => str.toUpperCase())
                                        .replace('project Manager', 'Project Manager')
                                        .replace('technical Director', 'Technical Director')
                                        : 'Unknown Role'}
                                    </span>
                                    {getStatusBadge(entry.status)}
                                  </div>
                                  <span className="text-sm text-gray-500">
                                    {formatDate(entry.timestamp)}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-3">
                                  {entry.decided_by && (
                                    <div>
                                      <p className="text-xs text-gray-500 uppercase tracking-wider">Decided By</p>
                                      <p className="text-sm font-medium text-gray-900 mt-1">{entry.decided_by}</p>
                                    </div>
                                  )}

                                  {(entry.sender || entry.receiver) && (
                                    <div>
                                      <p className="text-xs text-gray-500 uppercase tracking-wider">Workflow</p>
                                      <div className="flex items-center gap-1 mt-1">
                                        <span className="text-sm font-medium capitalize">
                                          {entry.sender?.replace(/([A-Z])/g, ' $1').trim() || ''}
                                        </span>
                                        {entry.sender && entry.receiver && (
                                          <>
                                            <Send className="h-3 w-3 text-gray-400" />
                                            <span className="text-sm font-medium capitalize">
                                              {entry.receiver?.replace(/([A-Z])/g, ' $1').trim() || ''}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {entry.comments && (
                                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                    <div className="flex items-start gap-2">
                                      <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                                      <p className="text-sm text-blue-900 flex-1">{entry.comments}</p>
                                    </div>
                                  </div>
                                )}

                                {entry.rejection_reason && (
                                  <div className="mt-3 bg-red-50 rounded-lg p-3 border border-red-100">
                                    <div className="flex items-start gap-2">
                                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-red-900">Rejection Reason</p>
                                        <p className="text-sm text-red-700 mt-1">{entry.rejection_reason}</p>
                                        {entry.reject_category && (
                                          <Badge className="bg-red-100 text-red-700 mt-2">
                                            {entry.reject_category}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                              ))}
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-center py-12">
                            <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No History Available</h3>
                            <p className="text-gray-600 mt-2">No approval history has been recorded.</p>
                          </div>
                        );
                      }
                    })()}
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseDetailsModal;