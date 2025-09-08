/**
 * Purchase Details Modal Component for Estimation Hub
 * Shows comprehensive purchase information with proper formatting
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
  FileText, Building2, Mail, Download, Hash, Info
} from 'lucide-react';
import { estimationService } from '../services/estimationService';
import type { PurchaseStatusDetails } from '../services/estimationService';
import { toast } from 'sonner';

interface PurchaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: number | null;
  showHistoryOnly?: boolean;
}

export const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({
  isOpen,
  onClose,
  purchaseId,
  showHistoryOnly = false
}) => {
  const [loading, setLoading] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseStatusDetails | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen && purchaseId) {
      fetchPurchaseDetails();
      setActiveTab('overview');
    }
  }, [isOpen, purchaseId, showHistoryOnly]);

  const fetchPurchaseDetails = async () => {
    if (!purchaseId) return;
    
    try {
      setLoading(true);
      
      // Use different endpoints based on mode
      const response = showHistoryOnly 
        ? await estimationService.getPurchaseHistory(purchaseId)
        : await estimationService.getPurchaseDetails(purchaseId);
      
      // Handle different response structures
      if (!showHistoryOnly) {
        // Details endpoint response structure
        const purchase = response.purchase || {};
        const latestStatus = response.latest_status || {};
        
        const formattedDetails = {
          purchase_id: purchase.purchase_id,
          purchase_details: {
            site_location: purchase.site_location || 'Not specified',
            purpose: purchase.purpose || 'Not specified',
            created_at: purchase.created_at,
            date: purchase.date,
            requested_by: purchase.requested_by || 'Not specified',
            project_id: purchase.project_id,
            email_sent: purchase.email_sent || false,
            materials_summary: {
              total_materials: purchase.materials?.length || 0,
              total_quantity: purchase.materials?.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0) || 0,
              total_cost: purchase.materials?.reduce((sum: number, m: any) => sum + ((m.quantity || 0) * (m.cost || 0)), 0) || 0,
              categories: [...new Set(purchase.materials?.map((m: any) => m.category).filter(Boolean) || [])] as string[],
              materials: purchase.materials || []
            }
          },
          latest_pm_proc_status: {
            status: latestStatus.status || 'pending',
            sender: latestStatus.sender,
            receiver: latestStatus.receiver,
            role: latestStatus.role,
            comments: latestStatus.comments,
            rejection_reason: latestStatus.rejection_reason
          },
          // Empty arrays for history since details view doesn't need them
          procurement_statuses: [],
          project_manager_statuses: [],
          estimation_statuses: [],
          summary: {
            total_procurement_statuses: 0,
            total_pm_statuses: 0,
            total_estimation_statuses: 0,
            pm_approved_count: 0
          }
        };
        
        setPurchaseDetails(formattedDetails);
      } else {
        // History endpoint response structure
        const purchase = response.purchase || {};
        const approvals = purchase.approvals || [];
        
        // Group approvals by role
        const procurementStatuses = approvals.filter((a: any) => a.role === 'procurement' || a.sender === 'procurement');
        const pmStatuses = approvals.filter((a: any) => a.role === 'projectManager' || a.sender === 'projectManager');
        const estimationStatuses = approvals.filter((a: any) => a.role === 'estimation' || a.sender === 'estimation');
        
        // Get latest status
        const latestStatus = approvals.length > 0 ? approvals[approvals.length - 1] : {};
        
        const formattedDetails = {
          purchase_id: purchase.purchase_id,
          purchase_details: {
            site_location: purchase.site_location || 'Not specified',
            purpose: purchase.purpose || 'Not specified',
            created_at: purchase.created_at,
            date: purchase.date,
            requested_by: purchase.requested_by || 'Not specified',
            project_id: purchase.project_id,
            email_sent: purchase.email_sent || false,
            materials_summary: {
              total_materials: purchase.materials?.length || 0,
              total_quantity: purchase.materials?.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0) || 0,
              total_cost: purchase.materials?.reduce((sum: number, m: any) => sum + ((m.quantity || 0) * (m.cost || 0)), 0) || 0,
              categories: [...new Set(purchase.materials?.map((m: any) => m.category).filter(Boolean) || [])] as string[],
              materials: purchase.materials || []
            }
          },
          latest_pm_proc_status: {
            status: latestStatus.status || purchase.status || 'pending',
            sender: latestStatus.sender,
            receiver: latestStatus.receiver,
            role: latestStatus.role,
            comments: latestStatus.comments,
            rejection_reason: latestStatus.rejection_reason
          },
          procurement_statuses: procurementStatuses.map((s: any) => ({
            ...s,
            date: s.created_at || s.decision_date
          })),
          project_manager_statuses: pmStatuses.map((s: any) => ({
            ...s,
            date: s.created_at || s.decision_date
          })),
          estimation_statuses: estimationStatuses.map((s: any) => ({
            ...s,
            date: s.created_at || s.decision_date
          })),
          summary: {
            total_procurement_statuses: procurementStatuses.length,
            total_pm_statuses: pmStatuses.length,
            total_estimation_statuses: estimationStatuses.length,
            pm_approved_count: pmStatuses.filter((s: any) => s.status === 'approved').length
          }
        };
        
        setPurchaseDetails(formattedDetails);
      }
    } catch (error: any) {
      console.error('Error fetching purchase details:', error);
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
    switch (status?.toLowerCase()) {
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

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const handleExport = () => {
    if (!purchaseDetails) return;
    
    const data = JSON.stringify(purchaseDetails, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PR-${purchaseDetails.purchase_id}_details.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Purchase details exported successfully');
  };

  const getRoleName = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'projectManager': 'Project Manager',
      'procurement': 'Procurement',
      'estimation': 'Estimation',
      'technicalDirector': 'Technical Director',
      'accounts': 'Accounts',
      'siteSupervisor': 'Site Supervisor',
      'mepSupervisor': 'MEP Supervisor',
      'design': 'Design'
    };
    
    return roleMap[role] || role;
  };

  // Combine all statuses for history
  const allStatuses = [
    ...(purchaseDetails?.procurement_statuses || []),
    ...(purchaseDetails?.project_manager_statuses || []),
    ...(purchaseDetails?.estimation_statuses || [])
  ].sort((a, b) => {
    const dateA = a?.date ? new Date(a.date).getTime() : 0;
    const dateB = b?.date ? new Date(b.date).getTime() : 0;
    return dateA - dateB; // Chronological order
  });

  const currentStatus = purchaseDetails?.latest_pm_proc_status?.status || 'pending';

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gray-50">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-amber-600" />
              <span className="text-xl font-semibold">Purchase Request Details</span>
              {purchaseDetails && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  PR-{purchaseDetails.purchase_id}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${getStatusColor(currentStatus)} border uppercase`}>
                {currentStatus}
              </Badge>
              {!showHistoryOnly && (
                <Button variant="ghost" size="sm" onClick={handleExport}>
                  <Download className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
            </div>
          ) : purchaseDetails ? (
            <>
              {!showHistoryOnly ? (
                // Details View with Tabs
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b bg-gray-50 h-12 p-0">
                    <TabsTrigger 
                      value="overview" 
                      className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-8"
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger 
                      value="materials"
                      className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-8"
                    >
                      Materials
                    </TabsTrigger>
                    <TabsTrigger 
                      value="additional"
                      className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-8"
                    >
                      Additional Info
                    </TabsTrigger>
                  </TabsList>

                  <div className="p-6">
                    <TabsContent value="overview" className="mt-0 space-y-6">
                      {/* Purchase Overview Header */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-gray-600" />
                          Purchase Overview
                        </h3>
                        
                        {/* Two Column Layout */}
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wide">Location</label>
                              <div className="flex items-center gap-2 mt-1">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span className="text-base font-medium">
                                  {purchaseDetails.purchase_details?.site_location}
                                </span>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wide">Purpose</label>
                              <p className="text-base font-medium mt-1">
                                {purchaseDetails.purchase_details?.purpose}
                              </p>
                            </div>
                            
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wide">Requested By</label>
                              <div className="flex items-center gap-2 mt-1">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="text-base font-medium">
                                  {purchaseDetails.purchase_details?.requested_by}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wide">Created Date</label>
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-base font-medium">
                                  {formatDate(purchaseDetails.purchase_details?.created_at)}
                                </span>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wide">Project ID</label>
                              <div className="flex items-center gap-2 mt-1">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <span className="text-base font-medium">
                                  #{purchaseDetails.purchase_details?.project_id || 'N/A'}
                                </span>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wide">Email Status</label>
                              <div className="mt-1">
                                <Badge 
                                  variant={purchaseDetails.purchase_details?.email_sent ? "default" : "outline"}
                                  className={purchaseDetails.purchase_details?.email_sent ? "bg-blue-600" : ""}
                                >
                                  <Mail className="w-3 h-3 mr-1" />
                                  {purchaseDetails.purchase_details?.email_sent ? 'Sent' : 'Not Sent'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Statistics Cards */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-5 h-5 text-blue-600" />
                            <span className="text-sm text-blue-700 font-medium">Materials</span>
                          </div>
                          <p className="text-2xl font-bold text-blue-900">
                            {purchaseDetails.purchase_details?.materials_summary?.total_materials || 0}
                          </p>
                        </div>
                        
                        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-green-700 font-medium">Quantity</span>
                          </div>
                          <p className="text-2xl font-bold text-green-900">
                            {purchaseDetails.purchase_details?.materials_summary?.total_quantity || 0}
                          </p>
                        </div>
                        
                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-5 h-5 text-purple-600" />
                            <span className="text-sm text-purple-700 font-medium">Total Cost</span>
                          </div>
                          <p className="text-xl font-bold text-purple-900">
                            {formatCurrency(purchaseDetails.purchase_details?.materials_summary?.total_cost || 0)}
                          </p>
                        </div>
                        
                        <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-5 h-5 text-orange-600" />
                            <span className="text-sm text-orange-700 font-medium">Categories</span>
                          </div>
                          <p className="text-2xl font-bold text-orange-900">
                            {purchaseDetails.purchase_details?.materials_summary?.categories?.length || 0}
                          </p>
                        </div>
                      </div>

                      {/* Current Status */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Current Status</h3>
                        <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
                          <Clock className="w-5 h-5 text-gray-600" />
                          <div className="flex-1">
                            <span className="text-sm text-gray-600 mr-2">Status</span>
                            <Badge className={`${getStatusColor(currentStatus)} border uppercase`}>
                              {currentStatus}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="materials" className="mt-0 space-y-4">
                      <h3 className="text-lg font-semibold mb-4">Materials List</h3>
                      {purchaseDetails.purchase_details?.materials_summary?.materials && 
                       purchaseDetails.purchase_details.materials_summary.materials.length > 0 ? (
                        <div className="space-y-3">
                          {purchaseDetails.purchase_details.materials_summary.materials.map((material, idx) => (
                            <div key={material.material_id || idx} className="border rounded-lg p-4 hover:bg-gray-50">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">
                                    {material.description || `Material ${idx + 1}`}
                                  </h4>
                                  {material.specification && (
                                    <p className="text-sm text-gray-600 mt-1">{material.specification}</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {material.category && (
                                    <Badge variant="outline">{material.category}</Badge>
                                  )}
                                  {material.priority && (
                                    <Badge 
                                      variant="outline" 
                                      className={
                                        material.priority === 'high' ? 'border-red-500 text-red-700' :
                                        material.priority === 'medium' ? 'border-yellow-500 text-yellow-700' :
                                        'border-green-500 text-green-700'
                                      }
                                    >
                                      {material.priority.toUpperCase()}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Quantity:</span>
                                  <p className="font-semibold">{material.quantity} {material.unit}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Unit Cost:</span>
                                  <p className="font-semibold">{formatCurrency(material.cost || 0)}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Total:</span>
                                  <p className="font-semibold text-green-600">
                                    {formatCurrency((material.quantity || 0) * (material.cost || 0))}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          <div className="border-t pt-4 mt-4">
                            <div className="flex justify-between items-center text-lg">
                              <span className="font-semibold">Grand Total:</span>
                              <span className="font-bold text-green-600 text-xl">
                                {formatCurrency(purchaseDetails.purchase_details?.materials_summary?.total_cost || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>No materials found</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="additional" className="mt-0 space-y-4">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Info className="w-5 h-5 text-gray-600" />
                        Additional Information
                      </h3>
                      
                      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Purchase ID</label>
                            <p className="text-base font-medium mt-1">PR-{purchaseDetails.purchase_id}</p>
                          </div>
                          
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Request Date</label>
                            <p className="text-base font-medium mt-1">
                              {formatDate(purchaseDetails.purchase_details?.date || purchaseDetails.purchase_details?.created_at)}
                            </p>
                          </div>
                        </div>
                        
                        {purchaseDetails.purchase_details?.materials_summary?.categories && 
                         purchaseDetails.purchase_details.materials_summary.categories.length > 0 && (
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Categories</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {purchaseDetails.purchase_details.materials_summary.categories.map((category) => (
                                <Badge key={category} variant="secondary">
                                  {category}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div>
                          <label className="text-xs text-gray-500 uppercase tracking-wide">Summary</label>
                          <div className="grid grid-cols-3 gap-4 mt-2">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-blue-600">
                                {purchaseDetails.purchase_details?.materials_summary?.total_materials || 0}
                              </p>
                              <p className="text-sm text-gray-600">Total Items</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600">
                                {purchaseDetails.purchase_details?.materials_summary?.total_quantity || 0}
                              </p>
                              <p className="text-sm text-gray-600">Total Quantity</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold text-purple-600">
                                {formatCurrency(purchaseDetails.purchase_details?.materials_summary?.total_cost || 0)}
                              </p>
                              <p className="text-sm text-gray-600">Total Value</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              ) : (
                // History View
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-6 text-center">Approval History</h2>
                  
                  {allStatuses.length > 0 ? (
                    <div className="space-y-4">
                      {allStatuses.map((status, idx) => (
                        <div key={idx} className="relative">
                          {/* Timeline connector */}
                          {idx < allStatuses.length - 1 && (
                            <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
                          )}
                          
                          <div className="flex gap-4">
                            {/* Status Icon */}
                            <div className="flex-shrink-0">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                status.status === 'approved' ? 'bg-green-100' :
                                status.status === 'rejected' ? 'bg-red-100' :
                                'bg-yellow-100'
                              }`}>
                                {getStatusIcon(status.status)}
                              </div>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 bg-white border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900">
                                  {getRoleName(status.role)}
                                </h4>
                                <Badge className={`${getStatusColor(status.status)} border uppercase`}>
                                  {status.status}
                                </Badge>
                              </div>
                              
                              {status.comments && (
                                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded mt-3">
                                  <div className="flex items-start gap-2">
                                    <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5" />
                                    <div>
                                      <p className="text-sm font-medium text-blue-900">Comments</p>
                                      <p className="text-sm text-blue-800">{status.comments}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {status.rejection_reason && (
                                <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded mt-3">
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                                    <div>
                                      <p className="text-sm font-medium text-red-900">Rejection Reason</p>
                                      <p className="text-sm text-red-800">{status.rejection_reason}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              <p className="text-xs text-gray-500 mt-2">
                                {formatDate(status.date)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg">No history available</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No purchase data available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};