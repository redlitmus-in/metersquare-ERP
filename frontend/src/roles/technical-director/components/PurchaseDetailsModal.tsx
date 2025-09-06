/**
 * Purchase Details Modal for Technical Director
 * Displays comprehensive purchase information with status history
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Package, 
  Calendar, 
  MapPin, 
  User, 
  Target,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Download,
  Eye
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { technicalDirectorService } from '../services/technicalDirectorService';
import type { Purchase, PurchaseStatusDetails } from '../types';

interface PurchaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
}

const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({
  isOpen,
  onClose,
  purchase
}) => {
  const [statusDetails, setStatusDetails] = useState<PurchaseStatusDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && purchase) {
      fetchStatusDetails();
    }
  }, [isOpen, purchase]);

  const fetchStatusDetails = async () => {
    if (!purchase) return;
    
    setIsLoading(true);
    try {
      const details = await technicalDirectorService.getPurchaseStatusDetails(purchase.purchase_id);
      setStatusDetails(details);
    } catch (error) {
      console.error('Error fetching status details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!purchase) return null;

  const priority = purchase.materials?.[0]?.priority || 'medium';
  const priorityBadgeColor = technicalDirectorService.getPriorityBadgeColor(priority);

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    return technicalDirectorService.getStatusBadgeColor(status);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-red-500" />
              <span>Purchase Request #{purchase.purchase_id}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={priorityBadgeColor}>
                {priority} Priority
              </Badge>
              {purchase.file_path && (
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            Project: {purchase.project_id} | Requested by: {purchase.requested_by}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="status">Status History</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Purchase Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Requested by:</span>
                    <span className="font-medium">{purchase.requested_by}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Site Location:</span>
                    <span className="font-medium">{purchase.site_location}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Request Date:</span>
                    <span className="font-medium">{purchase.date}</span>
                  </div>

                  {purchase.created_at && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Created:</span>
                      <span className="font-medium">{formatDate(purchase.created_at)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Financial Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center bg-red-50 p-4 rounded-lg">
                      <div className="text-3xl font-bold text-red-600">
                        {technicalDirectorService.formatCurrency(purchase.total_cost)}
                      </div>
                      <div className="text-sm text-red-600">Total Purchase Value</div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-xl font-bold text-blue-600">
                          {purchase.material_count}
                        </div>
                        <div className="text-xs text-blue-600">Items</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-xl font-bold text-green-600">
                          {purchase.total_quantity}
                        </div>
                        <div className="text-xs text-green-600">Total Qty</div>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="text-xl font-bold text-purple-600">
                          {purchase.materials?.length > 0 
                            ? (purchase.total_cost / purchase.total_quantity).toFixed(2)
                            : '0'
                          }
                        </div>
                        <div className="text-xs text-purple-600">Avg Cost</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Purpose */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-red-500" />
                  Purpose & Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                  {purchase.purpose}
                </p>
              </CardContent>
            </Card>

            {/* Current Status */}
            {purchase.status_info && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Current Workflow Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-sm text-gray-600">Current Stage:</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(purchase.status_info.status)}
                        <Badge className={getStatusBadgeColor(purchase.status_info.status)}>
                          {purchase.status_info.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm text-gray-600">Flow:</span>
                      <div className="text-sm">
                        <span className="font-medium capitalize">{purchase.status_info.sender}</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="font-medium capitalize">{purchase.status_info.receiver}</span>
                      </div>
                    </div>
                    {purchase.status_info.comments && (
                      <div className="col-span-2 space-y-2">
                        <span className="text-sm text-gray-600">Comments:</span>
                        <p className="text-sm bg-gray-50 p-3 rounded-md">
                          {purchase.status_info.comments}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Materials Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {purchase.materials?.map((material, index) => (
                    <motion.div
                      key={material.material_id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-2">
                            {material.description}
                          </h4>
                          
                          {material.specification && (
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Specification:</strong> {material.specification}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                              {material.category}
                            </Badge>
                            <Badge className={technicalDirectorService.getPriorityBadgeColor(material.priority)}>
                              {material.priority}
                            </Badge>
                          </div>
                          
                          {material.design_reference && (
                            <p className="text-xs text-gray-500 mt-2">
                              Design Ref: {material.design_reference}
                            </p>
                          )}
                        </div>
                        
                        <div className="text-right space-y-2 ml-4">
                          <div className="text-lg font-bold text-red-600">
                            {technicalDirectorService.formatCurrency(material.total_cost)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {material.quantity} {material.unit}
                          </div>
                          <div className="text-xs text-gray-500">
                            @ {technicalDirectorService.formatCurrency(material.unit_cost)} per {material.unit}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex justify-between items-center text-xl font-bold bg-red-50 p-4 rounded-lg">
                  <span className="text-gray-800">Total Materials Cost:</span>
                  <span className="text-red-600">
                    {technicalDirectorService.formatCurrency(purchase.total_cost)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Status History Tab */}
          <TabsContent value="status" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Approval Workflow History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Current status from purchase */}
                    {purchase.status_info && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(purchase.status_info.status)}
                            <span className="font-medium capitalize">
                              {purchase.status_info.sender} → {purchase.status_info.receiver}
                            </span>
                          </div>
                          <Badge className={getStatusBadgeColor(purchase.status_info.status)}>
                            {purchase.status_info.status}
                          </Badge>
                        </div>
                        
                        {purchase.status_info.decision_date && (
                          <p className="text-sm text-gray-600">
                            <Clock className="h-4 w-4 inline mr-1" />
                            {formatDate(purchase.status_info.decision_date)}
                          </p>
                        )}
                        
                        {purchase.status_info.decision_by && (
                          <p className="text-sm text-gray-600">
                            <User className="h-4 w-4 inline mr-1" />
                            Decision by: {purchase.status_info.decision_by}
                          </p>
                        )}
                        
                        {purchase.status_info.comments && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600 mb-1">
                              <MessageSquare className="h-4 w-4 inline mr-1" />
                              Comments:
                            </p>
                            <p className="text-sm bg-white p-2 rounded border">
                              {purchase.status_info.comments}
                            </p>
                          </div>
                        )}
                        
                        {purchase.status_info.rejection_reason && (
                          <div className="mt-2">
                            <p className="text-sm text-red-600 mb-1">
                              <AlertTriangle className="h-4 w-4 inline mr-1" />
                              Rejection Reason:
                            </p>
                            <p className="text-sm bg-red-50 p-2 rounded border border-red-200">
                              {purchase.status_info.rejection_reason}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Additional status details if available */}
                    {statusDetails && (
                      <div className="space-y-4">
                        {/* Technical Director Statuses */}
                        {statusDetails.technical_director_statuses?.map((status, index) => (
                          <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(status.status)}
                                <span className="font-medium">Technical Director</span>
                              </div>
                              <Badge className={getStatusBadgeColor(status.status)}>
                                {status.status}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-gray-600">
                              <Clock className="h-4 w-4 inline mr-1" />
                              {formatDate(status.date)}
                            </p>
                            
                            {status.decision_by?.full_name && (
                              <p className="text-sm text-gray-600">
                                <User className="h-4 w-4 inline mr-1" />
                                Decision by: {status.decision_by.full_name}
                              </p>
                            )}
                            
                            {status.comments && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-600 mb-1">Comments:</p>
                                <p className="text-sm bg-white p-2 rounded border">
                                  {status.comments}
                                </p>
                              </div>
                            )}
                            
                            {status.rejection_reason && (
                              <div className="mt-2">
                                <p className="text-sm text-red-600 mb-1">Rejection Reason:</p>
                                <p className="text-sm bg-red-100 p-2 rounded border border-red-200">
                                  {status.rejection_reason}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {!statusDetails && !purchase.status_info && (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No status history available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Attached Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {purchase.file_path ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-gray-500" />
                        <div>
                          <p className="font-medium">Purchase Request Document</p>
                          <p className="text-sm text-gray-600">{purchase.file_path}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No documents attached</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseDetailsModal;