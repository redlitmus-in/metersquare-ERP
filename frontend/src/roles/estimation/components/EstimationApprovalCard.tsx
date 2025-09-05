/**
 * Estimation Approval Card Component
 * Displays purchase requests pending estimation review
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, MapPin, Package, AlertCircle, Calendar,
  CheckCircle, XCircle, DollarSign, Calculator,
  TrendingUp, FileText
} from 'lucide-react';
import { Purchase, estimationService } from '../services/estimationService';
import type { Material } from '../types';

interface EstimationApprovalCardProps {
  purchase: Purchase;
  onApprove: (purchaseId: number) => void;
  onReject: (purchaseId: number) => void;
  onViewDetails?: (purchaseId: number) => void;
  isLoading?: boolean;
  isReadOnly?: boolean; // For approved/rejected items
}

export const EstimationApprovalCard: React.FC<EstimationApprovalCardProps> = ({
  purchase,
  onApprove,
  onReject,
  onViewDetails,
  isLoading = false,
  isReadOnly = false
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const pmStatus = purchase.status_info?.pm_status || estimationService.getPMStatus(purchase);
  const estimationStatus = purchase.status_info?.estimation_status?.toLowerCase() || estimationService.getEstimationStatus(purchase);
  const totalCost = purchase.total_cost || 
                   purchase.materials_summary?.total_cost || 
                   estimationService.calculateTotalCost(purchase.materials);
  
  // A purchase needs review if estimation_status is pending
  const needsReview = estimationStatus === 'pending';
  
  const isResubmission = estimationService.hasResubmission(purchase);
  
  // Check procurement status from procurement_approved_status
  const procurementApproved = purchase.procurement_approved_status?.status === 'approved';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <Card className={`hover:shadow-lg transition-all duration-300 h-full flex flex-col ${
        estimationStatus === 'approved' ? 'ring-2 ring-green-200 border-green-300' :
        estimationStatus === 'rejected' ? 'ring-2 ring-red-200 border-red-300' :
        needsReview ? 'ring-2 ring-amber-200 border-amber-300' :
        'border-gray-200'
      }`}>
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-gray-900">
                  Purchase #{purchase.purchase_id}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {purchase.site_location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(purchase.date)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {pmStatus === 'approved' && (
                <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  PM Approved
                </Badge>
              )}
              {needsReview && (
                <Badge className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5">
                  Awaiting Cost Analysis
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 py-3 space-y-3 flex-1 flex flex-col">
          {/* Purpose - Compact */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Purpose</p>
            <p className="text-sm text-gray-800 line-clamp-1">{purchase.purpose}</p>
          </div>

          {/* Cost Analysis - Ultra Compact */}
          <div className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded">
            <div className="flex items-center gap-2">
              <DollarSign className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Cost Analysis</span>
            </div>
            <span className="text-base font-bold text-blue-900">
              {formatCurrency(totalCost)}
            </span>
          </div>

          {/* Material Categories - Compact */}
          {purchase.materials && purchase.materials.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {[...new Set(purchase.materials.map((m: Material) => m.category))]
                .slice(0, 2).map((category, index) => (
                <Badge key={index} variant="outline" className="text-[10px] px-2 py-0.5">
                  {category}
                </Badge>
              ))}
              {[...new Set(purchase.materials.map((m: Material) => m.category))].length > 2 && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                  +{[...new Set(purchase.materials.map((m: Material) => m.category))].length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Spacer to push buttons to bottom */}
          <div className="flex-1"></div>
          
          {/* Action Buttons - Compact */}
          {needsReview && !isReadOnly && (
            <div className="flex gap-2 pt-3 mt-auto border-t border-gray-100">
              <Button
                onClick={() => onApprove(purchase.purchase_id)}
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9 text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Approve & Send to TD
              </Button>
              <Button
                onClick={() => onReject(purchase.purchase_id)}
                disabled={isLoading}
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 h-9 text-xs"
              >
                <XCircle className="h-3 w-3 mr-1" />
                Reject with Reason
              </Button>
            </div>
          )}

          {/* Status Display for Approved/Rejected Items */}
          {!needsReview && estimationStatus !== 'pending' && (
            <div className="pt-2 mt-auto border-t border-gray-100">
              <div className={`text-center py-2 rounded ${
                estimationStatus === 'approved' ? 'bg-green-50 text-green-700' : 
                estimationStatus === 'rejected' ? 'bg-red-50 text-red-700' : 
                'bg-gray-50 text-gray-700'
              }`}>
                <div className="flex items-center justify-center gap-1 text-xs font-medium">
                  {estimationStatus === 'approved' ? (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      <span>Approved - Sent to TD</span>
                    </>
                  ) : estimationStatus === 'rejected' ? (
                    <>
                      <XCircle className="h-3 w-3" />
                      <span>Rejected - Sent Back</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* View Details Button - Always visible */}
          <Button
            onClick={() => onViewDetails ? onViewDetails(purchase.purchase_id) : null}
            variant="outline"
            className="w-full mt-2 h-8 text-xs"
            disabled={isLoading}
          >
            <Package className="h-3 w-3 mr-1" />
            View Full Details
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};