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
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isPendingPMApproval = purchase.current_status.role !== 'projectManager';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Purchase #{purchase.purchase_id}
              </h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {purchase.site_location}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(purchase.date)}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={getStatusColor(purchase.procurement_approved_status.status)}>
                Procurement: {purchase.procurement_approved_status.status}
              </Badge>
              {isPendingPMApproval && (
                <Badge className="bg-orange-100 text-orange-800">
                  <Clock className="h-3 w-3 mr-1" />
                  Awaiting PM Review
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Purpose */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Purpose</p>
            <p className="text-sm text-gray-900">{purchase.purpose}</p>
          </div>

          {/* Materials Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-blue-600 font-medium">Materials</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {purchase.materials_summary.total_materials}
              </p>
            </div>

            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-600 font-medium">Quantity</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {purchase.materials_summary.total_quantity}
              </p>
            </div>

            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-purple-600" />
                <span className="text-xs text-purple-600 font-medium">Total Cost</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(purchase.materials_summary.total_cost)}
              </p>
            </div>

            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-xs text-orange-600 font-medium">Categories</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {purchase.materials_summary.categories.length}
              </p>
            </div>
          </div>

          {/* Categories List */}
          {purchase.materials_summary.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {purchase.materials_summary.categories.map(category => (
                <Badge key={category} variant="outline">
                  {category}
                </Badge>
              ))}
            </div>
          )}

          {/* Procurement Comments */}
          {purchase.procurement_approved_status.comments && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
              <p className="text-sm font-medium text-blue-900 mb-1">
                Procurement Comments:
              </p>
              <p className="text-sm text-blue-800">
                {purchase.procurement_approved_status.comments}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {isPendingPMApproval && (
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={() => onApprove(purchase.purchase_id)}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button 
                onClick={() => onReject(purchase.purchase_id)}
                variant="destructive"
                className="flex-1"
                disabled={isLoading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button 
                onClick={() => onViewDetails(purchase.purchase_id)}
                variant="outline"
                disabled={isLoading}
              >
                View Details
              </Button>
            </div>
          )}

          {/* Already Reviewed */}
          {!isPendingPMApproval && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                Already reviewed by Project Manager
              </p>
              <Button 
                onClick={() => onViewDetails(purchase.purchase_id)}
                variant="outline"
                className="mt-2"
                disabled={isLoading}
              >
                View Full History
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};