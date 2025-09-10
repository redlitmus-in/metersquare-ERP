import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Calendar,
  MapPin,
  FileText,
  DollarSign,
  Eye,
  History,
  Edit,
  Trash2,
  Mail,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Material {
  material_id: number;
  description: string;
  quantity: number;
  unit: string;
  cost: number;
  category: string;
}

interface Purchase {
  purchase_id: number;
  requested_by: string;
  site_location: string;
  date: string;
  project_id: string;
  purpose: string;
  materials?: Material[];
  email_sent: boolean;
  created_at: string;
  status?: string;
  total_cost?: number;
  total_quantity?: number;
}

interface PurchaseCardProps {
  purchase: Purchase;
  onViewDetails: (purchaseId: number) => void;
  onViewHistory: (purchaseId: number) => void;
  onEdit?: (purchaseId: number) => void;
  onDelete?: (purchaseId: number) => void;
  onSendEmail?: (purchaseId: number) => void;
  isLoading?: boolean;
}

const PurchaseCard = forwardRef<HTMLDivElement, PurchaseCardProps>(({
  purchase,
  onViewDetails,
  onViewHistory,
  onEdit,
  onDelete,
  onSendEmail,
  isLoading = false
}, ref) => {
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'under_review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="h-3.5 w-3.5" />;
      case 'rejected':
        return <XCircle className="h-3.5 w-3.5" />;
      case 'pending':
      case 'under_review':
        return <Clock className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  // Calculate totals from materials
  const totalCost = purchase.materials?.reduce((sum, mat) => sum + (mat.cost * mat.quantity), 0) || 0;
  const totalQuantity = purchase.materials?.reduce((sum, mat) => sum + mat.quantity, 0) || 0;
  const materialCount = purchase.materials?.length || 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-orange-500">
        <CardContent className="p-3">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-gray-900">
                  PR #{purchase.purchase_id}
                </h3>
                <Badge className={`${getStatusColor(purchase.status)} text-xs flex items-center gap-1`}>
                  {getStatusIcon(purchase.status)}
                  {purchase.status || 'Pending'}
                </Badge>
                {purchase.email_sent && (
                  <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                    <Mail className="h-3 w-3 mr-1" />
                    Email Sent
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-600 text-left">{purchase.purpose}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs">
              <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span className="font-medium text-gray-900">{purchase.site_location}</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <FileText className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span className="font-medium text-gray-900">{purchase.project_id}</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span className="font-medium text-gray-900">
                {new Date(purchase.date).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Materials Summary */}
          <div className="bg-gray-50 rounded-lg p-2 mb-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-xs text-gray-500">Materials</p>
                <p className="text-sm font-bold text-gray-900">{materialCount}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Total Quantity</p>
                <p className="text-sm font-bold text-blue-600">{totalQuantity}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Total Cost</p>
                <p className="text-sm font-bold text-green-600">
                  AED {totalCost.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {/* Always show View Details and View History */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewDetails(purchase.purchase_id)}
              disabled={isLoading}
              className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7 text-xs"
            >
              <Eye className="h-3 w-3" />
              Details
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewHistory(purchase.purchase_id)}
              disabled={isLoading}
              className="flex items-center justify-center gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50 h-7 text-xs"
            >
              <History className="h-3 w-3" />
              History
            </Button>

            {/* Show Edit, Delete, and Send Email only if email NOT sent */}
            {!purchase.email_sent && (
              <>
                {onEdit && purchase.status !== 'approved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(purchase.purchase_id)}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-7 text-xs"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                )}

                {onDelete && purchase.status !== 'approved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDelete(purchase.purchase_id)}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-xs"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                )}

                {onSendEmail && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSendEmail(purchase.purchase_id)}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 h-7 text-xs"
                  >
                    <Mail className="h-3 w-3" />
                    Send Email
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-left">
              Created {formatDistanceToNow(new Date(purchase.created_at), { addSuffix: true })} by {purchase.requested_by}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

PurchaseCard.displayName = 'PurchaseCard';

export default PurchaseCard;