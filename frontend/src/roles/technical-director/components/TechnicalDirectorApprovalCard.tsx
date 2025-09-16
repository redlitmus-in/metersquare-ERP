/**
 * Technical Director Approval Card Component
 * Individual card for purchase approval with materials summary and actions
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  User, 
  Package, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Eye,
  History,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { technicalDirectorService } from '../services/technicalDirectorService';
import type { Purchase } from '../types';

interface TechnicalDirectorApprovalCardProps {
  purchase: Purchase;
  onApprove: (purchaseId: number) => void;
  onReject: (purchaseId: number) => void;
  onViewDetails: (purchaseId: number) => void;
  onViewHistory: (purchaseId: number) => void;
  isLoading?: boolean;
}

const TechnicalDirectorApprovalCard: React.FC<TechnicalDirectorApprovalCardProps> = ({
  purchase,
  onApprove,
  onReject,
  onViewDetails,
  onViewHistory,
  isLoading = false
}) => {
  // Get TD status directly from purchase
  const tdStatus = purchase.technical_director_status?.toLowerCase() || 'pending';
  const estimationStatus = purchase.estimation_status?.toLowerCase() || 'pending';
  
  // Check if needs TD review (estimation approved and TD pending)
  const needsReview = estimationStatus === 'approved' && (!tdStatus || tdStatus === 'pending');
  
  // Check if the purchase is completed (accounts has acknowledged)
  const isCompleted = purchase.latest_status?.status === 'completed' || 
                     purchase.latest_status?.status === 'complete' ||
                     purchase.accounts_acknowledgement === true;
  
  // Get status badge color
  const getStatusColor = () => {
    if (isCompleted) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    switch (tdStatus) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  // Get priority from first material or default
  const priority = purchase.materials?.[0]?.priority || 'medium';
  const getPriorityColor = () => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="h-full hover:shadow-lg transition-shadow max-w-sm mx-auto">
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base font-semibold truncate">
                PR #{purchase.purchase_id}
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                Project: {purchase.project_id}
              </p>
            </div>
            <div className="flex flex-col gap-1 items-end flex-shrink-0">
              <Badge className={`${getStatusColor()} text-xs`} variant="outline">
                {isCompleted ? 'Completed' :
                 tdStatus === 'pending' ? 'Pending' : 
                 tdStatus === 'approved' ? 'Approved' : 
                 tdStatus === 'rejected' ? 'Rejected' : 'Pending'}
              </Badge>
              <Badge className={`${getPriorityColor()} text-xs`} variant="outline">
                {priority?.charAt(0).toUpperCase() + priority?.slice(1)} priority
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 px-4 pb-4">
          {/* Key Information */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-gray-600">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{purchase.site_location}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{purchase.requested_by}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{new Date(purchase.date).toLocaleDateString()}</span>
            </div>
          </div>

          <Separator />

          {/* Materials & Cost Summary */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Package className="h-3 w-3" />
                <span>{purchase.material_count || 0} items</span>
              </div>
              <span className="text-gray-600">
                Qty: {purchase.total_quantity || 0}
              </span>
            </div>
            <div className="flex items-center justify-between bg-indigo-50 rounded-md px-2 py-1.5">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-green-600" />
                <span className="text-xs font-medium text-green-900">Total</span>
              </div>
              <span className="text-xs font-bold text-green-600 truncate">
                AED {(purchase.total_cost || 0).toLocaleString()}
              </span>
            </div>
          </div>


          {/* Comments if rejected */}
          {tdStatus === 'rejected' && purchase.technical_director_rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
              <p className="text-xs text-red-700 line-clamp-2">
                <span className="font-medium">Reason:</span> {purchase.technical_director_rejection_reason}
              </p>
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-1.5">
            {needsReview ? (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    onClick={() => onApprove(purchase.purchase_id)}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                    size="sm"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => onReject(purchase.purchase_id)}
                    disabled={isLoading}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs"
                    size="sm"
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    onClick={() => onViewDetails(purchase.purchase_id)}
                    variant="outline"
                    className="h-8 text-xs"
                    size="sm"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                  <Button
                    onClick={() => onViewHistory(purchase.purchase_id)}
                    variant="outline"
                    className="h-8 text-xs"
                    size="sm"
                  >
                    <History className="h-3 w-3 mr-1" />
                    History
                  </Button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  onClick={() => onViewDetails(purchase.purchase_id)}
                  variant="outline"
                  className="w-full h-8 text-xs"
                  size="sm"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </Button>
                <Button
                  onClick={() => onViewHistory(purchase.purchase_id)}
                  variant="outline"
                  className="w-full h-8 text-xs"
                  size="sm"
                >
                  <History className="h-3 w-3 mr-1" />
                  View History
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TechnicalDirectorApprovalCard;