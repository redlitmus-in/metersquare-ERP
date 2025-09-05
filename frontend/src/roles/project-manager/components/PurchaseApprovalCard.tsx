/**
 * Purchase Approval Card Component
 * Displays purchase requests pending PM approval
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, MapPin, Package, AlertCircle, Calendar,
  CheckCircle, XCircle, DollarSign
} from 'lucide-react';
import { ProcurementPurchase } from '../services/projectManagerService';

interface PurchaseApprovalCardProps {
  purchase: ProcurementPurchase;
  onApprove: (purchaseId: number) => void;
  onReject: (purchaseId: number) => void;
  onViewDetails: (purchaseId: number) => void;
  isLoading?: boolean;
}

export const PurchaseApprovalCard: React.FC<PurchaseApprovalCardProps> = ({
  purchase,
  onApprove,
  onReject,
  onViewDetails,
  isLoading = false
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Check PM status directly from the pm_status field
  const isPendingPMApproval = purchase.pm_status === 'pending' || purchase.pm_status === null;
  const pmStatus = purchase.pm_status || 'pending';
  
  // Get current workflow status for display
  const currentWorkflowStatus = purchase.current_workflow_status || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`hover:shadow-lg transition-all duration-200 ${
        isPendingPMApproval ? 'border-orange-200 bg-orange-50/30' : ''
      }`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Purchase #{purchase.purchase_id}
                </h3>
                <Badge className={`${getStatusColor(pmStatus)} border`}>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(pmStatus)}
                    {isPendingPMApproval ? 'Pending PM Review' : pmStatus === 'approved' ? 'PM Approved' : 'PM Rejected'}
                  </span>
                </Badge>
                {/* Show current workflow status if PM has already approved */}
                {pmStatus === 'approved' && currentWorkflowStatus && (
                  <Badge variant="outline" className="ml-2">
                    {currentWorkflowStatus.replace(/_/g, ' ').split(' ').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {purchase.site_location}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(purchase.date)}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-semibold">{formatCurrency(purchase.materials_summary.total_cost)}</span>
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Minimal Summary Row */}
          <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-gray-500">Materials</p>
                <p className="text-sm font-semibold">{purchase.materials_summary.total_materials} items</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Qty</p>
                <p className="text-sm font-semibold">{purchase.materials_summary.total_quantity}</p>
              </div>
              <div className="max-w-xs">
                <p className="text-xs text-gray-500">Purpose</p>
                <p className="text-sm font-medium truncate">{purchase.purpose}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {purchase.materials_summary.categories.slice(0, 2).map(category => (
                <Badge key={category} variant="outline" className="text-xs">
                  {category}
                </Badge>
              ))}
              {purchase.materials_summary.categories.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{purchase.materials_summary.categories.length - 2}
                </Badge>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isPendingPMApproval ? (
              <>
                <Button 
                  onClick={() => onApprove(purchase.purchase_id)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                  disabled={isLoading}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button 
                  onClick={() => onReject(purchase.purchase_id)}
                  variant="destructive"
                  className="flex-1"
                  size="sm"
                  disabled={isLoading}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button 
                  onClick={() => onViewDetails(purchase.purchase_id)}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                >
                  View Details
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => onViewDetails(purchase.purchase_id)}
                  variant={pmStatus === 'approved' ? 'default' : pmStatus === 'rejected' ? 'destructive' : 'outline'}
                  className="flex-1"
                  size="sm"
                  disabled={isLoading}
                >
                  View Full Details & History
                </Button>
                {pmStatus === 'rejected' && (
                  <Button 
                    onClick={() => onApprove(purchase.purchase_id)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    size="sm"
                    disabled={isLoading}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Reconsider & Approve
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};