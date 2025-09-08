import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Building2, 
  Calendar, 
  DollarSign, 
  Package, 
  Eye, 
  Edit, 
  Mail, 
  MailCheck,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  History
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Material {
  material_id: number;
  description: string;
  quantity: number;
  unit: string;
  cost: number;
  priority?: string;
}

interface Purchase {
  purchase_id: number;
  prNumber?: string;
  project_id: string;
  requested_by: string;
  site_location: string;
  date: string;
  purpose: string;
  materials?: Material[];
  email_sent: boolean;
  status?: string;
  latest_status?: string;
  approvals?: any[];
  created_at: string;
}

interface PurchaseCardProps {
  purchase: Purchase;
  onViewDetails?: (purchaseId: number) => void;
  onViewHistory?: (purchaseId: number) => void;
  onEdit?: (purchaseId: number) => void;
  onSendEmail?: (purchaseId: number) => void;
  onApprove?: (purchaseId: number) => void;
  onReject?: (purchaseId: number) => void;
  isLoading?: boolean;
  emailSent?: boolean;
}

const PurchaseCard = forwardRef<HTMLDivElement, PurchaseCardProps>(({
  purchase,
  onViewDetails,
  onViewHistory,
  onEdit,
  onSendEmail,
  onApprove,
  onReject,
  isLoading = false,
  emailSent = false
}, ref) => {
  // Calculate total amount from materials
  const totalAmount = purchase.materials?.reduce((sum, m) => 
    sum + (m.quantity * m.cost), 0
  ) || 0;

  // Determine status display
  const getStatus = () => {
    if (purchase.latest_status) return purchase.latest_status;
    if (purchase.status) return purchase.status;
    return 'pending';
  };

  const status = getStatus();

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
      case 'under_review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get priority from first material
  const priority = purchase.materials?.[0]?.priority || 'medium';

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="shadow-md hover:shadow-lg transition-shadow border-0">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <FileText className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {purchase.prNumber || `PR-${purchase.purchase_id}`}
                </h3>
                <p className="text-sm text-gray-500">
                  {new Date(purchase.date || purchase.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge className={`${getStatusColor(status)} border`}>
                {status.toUpperCase()}
              </Badge>
              {priority && (
                <Badge className={`${getPriorityColor(priority)} border text-xs`}>
                  {priority.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Project:</span>
              <span className="font-medium text-gray-900">{purchase.project_id}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Requested by:</span>
              <span className="font-medium text-gray-900">{purchase.requested_by}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-semibold text-gray-900">
                AED {totalAmount.toLocaleString()}
              </span>
            </div>

            {purchase.materials && (
              <div className="flex items-center gap-2 text-sm">
                <Package className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Items:</span>
                <span className="font-medium text-gray-900">
                  {purchase.materials.length} material{purchase.materials.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Material Summary */}
            {purchase.materials && purchase.materials.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-600 mb-2">Material Summary:</p>
                <div className="space-y-1">
                  {purchase.materials.slice(0, 2).map((material, idx) => (
                    <div key={material.material_id} className="text-xs text-gray-600">
                      • {material.description} ({material.quantity} {material.unit})
                    </div>
                  ))}
                  {purchase.materials.length > 2 && (
                    <div className="text-xs text-gray-500 italic">
                      +{purchase.materials.length - 2} more items...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Actions */}
          <div className="space-y-3">
            {/* Primary Actions Row */}
            <div className="flex items-center gap-2 justify-between">
              {/* View Actions - Always visible */}
              <div className="flex items-center gap-2">
                {onViewDetails && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(purchase.purchase_id)}
                    disabled={isLoading}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                )}
                
                {onViewHistory && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewHistory(purchase.purchase_id)}
                    disabled={isLoading}
                  >
                    <History className="w-4 h-4 mr-1" />
                    View History
                  </Button>
                )}
              </div>

              {/* Edit Action */}
              {!emailSent && status !== 'approved' && status !== 'rejected' && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(purchase.purchase_id)}
                  disabled={isLoading}
                  title="Edit Purchase Request"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>

            {/* Secondary Actions Row - Approve/Reject/Send */}
            {!emailSent && status !== 'approved' && status !== 'rejected' && (
              <div className="flex items-center gap-2 justify-end">
                {onApprove && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onApprove(purchase.purchase_id)}
                    disabled={isLoading}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-300"
                    title="Approve Request"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                )}
                
                {onReject && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReject(purchase.purchase_id)}
                    disabled={isLoading}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                    title="Reject Request"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                )}
                
                {onSendEmail && (
                  <Button
                    size="sm"
                    onClick={() => onSendEmail(purchase.purchase_id)}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    title="Send to Project Manager"
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    Send to PM
                  </Button>
                )}
              </div>
            )}
            
            {/* Email Sent Indicator */}
            {emailSent && (
              <div className="flex items-center justify-center gap-2 py-2 bg-green-50 rounded-lg">
                <MailCheck className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Sent to Project Manager</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

PurchaseCard.displayName = 'PurchaseCard';

export default PurchaseCard;