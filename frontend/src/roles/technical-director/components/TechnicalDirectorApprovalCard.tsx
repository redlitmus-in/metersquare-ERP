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
  Target, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Eye,
  FileText,
  AlertCircle
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
  onViewDetails: (purchase: Purchase) => void;
  onViewStatus: (purchaseId: number) => void;
  isProcessing?: boolean;
}

const TechnicalDirectorApprovalCard: React.FC<TechnicalDirectorApprovalCardProps> = ({
  purchase,
  onApprove,
  onReject,
  onViewDetails,
  onViewStatus,
  isProcessing = false
}) => {
  const tdStatus = technicalDirectorService.getTechnicalDirectorStatus(purchase);
  const needsReview = technicalDirectorService.needsTechnicalDirectorReview(purchase);

  // Get priority from first material or default to 'medium'
  const priority = purchase.materials?.[0]?.priority || 'medium';
  const priorityBadgeColor = technicalDirectorService.getPriorityBadgeColor(priority);
  const statusBadgeColor = technicalDirectorService.getStatusBadgeColor(tdStatus);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              PR #{purchase.purchase_id}
            </CardTitle>
            <Badge className={priorityBadgeColor} variant="outline">
              {priority}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 px-4 pb-4">
          {/* Key Info */}
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-3 w-3" />
              {purchase.site_location}
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <User className="h-3 w-3" />
              {purchase.requested_by}
            </div>
          </div>

          {/* Cost Summary */}
          <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-md">
            <span className="text-sm text-gray-600">{purchase.material_count} items</span>
            <span className="text-sm font-semibold">{technicalDirectorService.formatCurrency(purchase.total_cost)}</span>
          </div>

          {/* Action Buttons */}
          {needsReview && tdStatus === 'pending' ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  onClick={() => onApprove(purchase.purchase_id)}
                  disabled={isProcessing}
                  className="flex-1 h-8 text-xs"
                  variant="default"
                  size="sm"
                >
                  Approve
                </Button>
                <Button
                  onClick={() => onReject(purchase.purchase_id)}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex-1 h-8 text-xs"
                  size="sm"
                >
                  Reject
                </Button>
              </div>
              <Button
                onClick={() => onViewDetails(purchase)}
                variant="outline"
                className="w-full h-8 text-xs"
                size="sm"
              >
                View Details
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => onViewDetails(purchase)}
              variant="outline"
              className="w-full h-8 text-xs"
              size="sm"
            >
              View Details
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TechnicalDirectorApprovalCard;