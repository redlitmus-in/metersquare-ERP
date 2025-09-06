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
  FileText, Briefcase, Timer, History, ArrowRight, Info,
  Building, Hash, TrendingUp, UserCheck
} from 'lucide-react';
import { projectManagerService, PurchaseStatusDetails } from '../services/projectManagerService';
import { format } from 'date-fns';

interface PurchaseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: string;
}

// Helper component for workflow stages
const WorkflowStage: React.FC<{ name: string; status: 'pending' | 'in-progress' | 'completed' | 'rejected' }> = ({ name, status }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'in-progress':
        return 'text-yellow-600';
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {getStatusIcon()}
      <span className={`text-xs font-medium ${getStatusColor()}`}>{name}</span>
    </div>
  );
};

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
      console.log('Fetching details for purchase ID:', purchaseId);
      const details = await projectManagerService.getPurchaseStatusDetails(parseInt(purchaseId));
      console.log('Purchase details received:', details);
      setPurchaseDetails(details);
    } catch (error: any) {
      console.error('Error fetching purchase details:', error);
      setError(error.response?.data?.error || 'Failed to fetch purchase details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
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
            {/* Current Status Summary */}
            <div className="space-y-4">
              {/* Primary Status Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-600">Current Workflow Status</h4>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                      {purchaseDetails.latest_pm_proc_status?.role === 'projectManager' 
                        ? 'Awaiting Project Manager Review'
                        : purchaseDetails.latest_pm_proc_status?.role === 'procurement'
                          ? 'Under Procurement Review'
                        : purchaseDetails.latest_pm_proc_status?.role === 'estimation'
                          ? 'With Estimation Team'
                        : purchaseDetails.latest_pm_proc_status?.role === 'technicalDirector'
                          ? 'Technical Director Review'
                        : purchaseDetails.latest_pm_proc_status?.role 
                          ? `${purchaseDetails.latest_pm_proc_status.role} Review`
                          : 'Initial Request Submitted'}
                    </p>
                    {purchaseDetails.latest_pm_proc_status?.date && (
                      <p className="text-xs text-gray-600 mt-1">
                        Last updated: {formatDate(purchaseDetails.latest_pm_proc_status.date)}
                      </p>
                    )}
                  </div>
                  {purchaseDetails.latest_pm_proc_status?.status && (
                    <Badge className={`${getStatusColor(purchaseDetails.latest_pm_proc_status.status)} text-lg py-2 px-4`}>
                      {purchaseDetails.latest_pm_proc_status.status.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white border rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {(purchaseDetails.summary?.total_procurement_statuses || 0) + 
                     (purchaseDetails.summary?.total_pm_statuses || 0)}
                  </p>
                  <p className="text-xs text-gray-600">Total Reviews</p>
                </div>
                <div className="bg-white border rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {(purchaseDetails.summary?.pm_approved_count || 0) + 
                     (purchaseDetails.summary?.procurement_approved_count || 0)}
                  </p>
                  <p className="text-xs text-gray-600">Approvals</p>
                </div>
                <div className="bg-white border rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {(purchaseDetails.summary?.pm_rejected_count || 0) + 
                     (purchaseDetails.summary?.procurement_rejected_count || 0)}
                  </p>
                  <p className="text-xs text-gray-600">Rejections</p>
                </div>
                <div className="bg-white border rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {(purchaseDetails.summary?.pm_pending_count || 0) + 
                     (purchaseDetails.summary?.procurement_pending_count || 0)}
                  </p>
                  <p className="text-xs text-gray-600">Pending</p>
                </div>
              </div>
            </div>

            {/* Purchase Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Purchase Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Information */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Hash className="h-4 w-4" />
                      Purchase ID
                    </div>
                    <p className="font-medium">{purchaseId}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <MapPin className="h-4 w-4" />
                      Site Location
                    </div>
                    <p className="font-medium">{purchaseDetails.purchase_details?.site_location || 'Not Specified'}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Calendar className="h-4 w-4" />
                      Request Date
                    </div>
                    <p className="font-medium">{formatDate(purchaseDetails.purchase_details?.date || purchaseDetails.purchase_details?.created_at)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Building className="h-4 w-4" />
                      Department
                    </div>
                    <p className="font-medium">Site Operations</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <User className="h-4 w-4" />
                      Requested By
                    </div>
                    <p className="font-medium">Site Supervisor</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <TrendingUp className="h-4 w-4" />
                      Priority
                    </div>
                    <Badge className="bg-orange-100 text-orange-800">High</Badge>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <FileText className="h-4 w-4" />
                    Purpose / Justification
                  </div>
                  <p className="font-medium bg-gray-50 p-3 rounded-lg">
                    {purchaseDetails.purchase_details?.purpose || 'No purpose specified'}
                  </p>
                </div>

                {/* Materials Summary */}
                {purchaseDetails.purchase_details?.materials_summary && (
                  <div className="grid grid-cols-4 gap-4 mt-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-blue-600" />
                        <span className="text-xs text-blue-600">Materials</span>
                      </div>
                      <p className="text-lg font-semibold">
                        {purchaseDetails.purchase_details.materials_summary?.total_materials || 0}
                      </p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-green-600">Quantity</span>
                      </div>
                      <p className="text-lg font-semibold">
                        {purchaseDetails.purchase_details.materials_summary?.total_quantity || 0}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-purple-600" />
                        <span className="text-xs text-purple-600">Total Cost</span>
                      </div>
                      <p className="text-lg font-semibold">
                        {formatCurrency(purchaseDetails.purchase_details.materials_summary?.total_cost || 0)}
                      </p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-orange-600" />
                        <span className="text-xs text-orange-600">Categories</span>
                      </div>
                      <p className="text-lg font-semibold">
                        {purchaseDetails.purchase_details.materials_summary?.categories?.length || 0}
                      </p>
                    </div>
                  </div>
                )}

                {/* Categories Display */}
                {purchaseDetails.purchase_details?.materials_summary?.categories && 
                 purchaseDetails.purchase_details.materials_summary.categories.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Material Categories</h4>
                    <div className="flex flex-wrap gap-2">
                      {purchaseDetails.purchase_details.materials_summary.categories.map((category) => (
                        <Badge key={category} variant="outline" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Materials List */}
                {purchaseDetails.purchase_details?.materials_summary?.materials && 
                 purchaseDetails.purchase_details.materials_summary.materials.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Material Items ({purchaseDetails.purchase_details.materials_summary.materials.length})
                    </h4>
                    <div className="bg-gray-50 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-100 border-b">
                          <tr>
                            <th className="text-left px-3 py-2 text-xs font-medium text-gray-700">Item Description</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-gray-700">Category</th>
                            <th className="text-center px-3 py-2 text-xs font-medium text-gray-700">Priority</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-gray-700">Quantity</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-gray-700">Unit Cost</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-gray-700">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {purchaseDetails.purchase_details.materials_summary.materials.map((material, index) => (
                            <tr key={material?.material_id || index} className="border-b last:border-0">
                              <td className="px-3 py-2">
                                <p className="text-sm font-medium">{material?.description || 'N/A'}</p>
                              </td>
                              <td className="px-3 py-2">
                                <Badge variant="outline" className="text-xs">
                                  {material?.category || 'N/A'}
                                </Badge>
                              </td>
                              <td className="text-center px-3 py-2">
                                <Badge className={`text-xs ${
                                  material?.priority === 'high' ? 'bg-red-100 text-red-800' :
                                  material?.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {material?.priority || 'Normal'}
                                </Badge>
                              </td>
                              <td className="text-right px-3 py-2 text-sm">
                                {material?.quantity || 0} {material?.unit || ''}
                              </td>
                              <td className="text-right px-3 py-2 text-sm">
                                {formatCurrency(material?.cost || 0)}
                              </td>
                              <td className="text-right px-3 py-2 text-sm font-medium">
                                {formatCurrency((material?.cost || 0) * (material?.quantity || 0))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100 border-t-2">
                          <tr>
                            <td colSpan={5} className="px-3 py-2 text-right font-medium text-sm">Grand Total:</td>
                            <td className="px-3 py-2 text-right font-bold text-sm">
                              {formatCurrency(purchaseDetails.purchase_details.materials_summary?.total_cost || 0)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
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
                {/* Show workflow stages */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Workflow Progress</h4>
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                    <WorkflowStage name="Site Request" status="completed" />
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <WorkflowStage name="Procurement" status={purchaseDetails.procurement_statuses?.length > 0 ? 'completed' : 'pending'} />
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <WorkflowStage name="Project Manager" status={purchaseDetails.project_manager_statuses?.find(s => s.status === 'approved') ? 'completed' : purchaseDetails.project_manager_statuses?.length > 0 ? 'in-progress' : 'pending'} />
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <WorkflowStage name="Estimation" status="pending" />
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <WorkflowStage name="Technical Director" status="pending" />
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <WorkflowStage name="Accounts" status="pending" />
                  </div>
                </div>
                {/* Timeline View of Approvals */}
                <div className="relative">
                  {[...(purchaseDetails.procurement_statuses || []), ...(purchaseDetails.project_manager_statuses || [])]
                    .filter(status => status && status.date)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .length > 0 ? (
                      <>
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                        {[...(purchaseDetails.procurement_statuses || []), ...(purchaseDetails.project_manager_statuses || [])]
                          .filter(status => status && status.date)
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((status, index) => (
                            <div key={index} className="relative flex gap-4 pb-8">
                              {/* Timeline dot */}
                              <div className="relative z-10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  status.status === 'approved' ? 'bg-green-100' :
                                  status.status === 'rejected' ? 'bg-red-100' :
                                  status.status === 'pending' ? 'bg-yellow-100' :
                                  'bg-gray-100'
                                }`}>
                                  {status.status === 'approved' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                                   status.status === 'rejected' ? <XCircle className="h-5 w-5 text-red-600" /> :
                                   status.status === 'pending' ? <Clock className="h-5 w-5 text-yellow-600" /> :
                                   <Info className="h-5 w-5 text-gray-600" />}
                                </div>
                              </div>
                              
                              {/* Content Card */}
                              <div className="flex-1 bg-white border rounded-lg p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {status.role && getRoleIcon(status.role)}
                                    <span className="font-semibold text-gray-900">
                                      {status.role === 'procurement' ? 'Procurement Review' :
                                       status.role === 'projectManager' ? 'Project Manager Review' :
                                       status.role ? status.role.replace('Manager', ' Manager') : 'System'}
                                    </span>
                                  </div>
                                  <Badge className={`${getStatusColor(status.status)} font-semibold`}>
                                    {status.status?.toUpperCase()}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                                  <div>
                                    <span className="text-gray-500">Date:</span>
                                    <p className="font-medium">{formatDate(status.date)}</p>
                                  </div>
                                  {status.decision_by && (
                                    <div>
                                      <span className="text-gray-500">Reviewed by:</span>
                                      <p className="font-medium flex items-center gap-1">
                                        <UserCheck className="h-3 w-3" />
                                        {status.decision_by.full_name}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Action Details */}
                                {status.comments && (
                                  <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                                    <div className="flex items-center gap-2 text-sm font-medium text-blue-900 mb-1">
                                      <MessageSquare className="h-4 w-4" />
                                      Review Comments
                                    </div>
                                    <p className="text-sm text-blue-800">{status.comments}</p>
                                  </div>
                                )}
                                
                                {status.rejection_reason && (
                                  <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-3 rounded">
                                    <div className="flex items-center gap-2 text-sm font-medium text-red-900 mb-1">
                                      <AlertTriangle className="h-4 w-4" />
                                      Rejection Reason
                                    </div>
                                    <p className="text-sm text-red-800">{status.rejection_reason}</p>
                                    {status.reject_category && (
                                      <p className="text-xs text-red-600 mt-1">Category: {status.reject_category}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No approval history available yet</p>
                        <p className="text-sm mt-1">Waiting for initial review</p>
                      </div>
                    )}
                </div>
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
            {purchaseDetails.summary && (
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
                      <p className="text-2xl font-bold text-green-600">
                        {purchaseDetails.summary?.pm_approved_count || 0}
                      </p>
                      <p className="text-sm text-gray-600">PM Approvals</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {purchaseDetails.summary?.pm_rejected_count || 0}
                      </p>
                      <p className="text-sm text-gray-600">PM Rejections</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
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