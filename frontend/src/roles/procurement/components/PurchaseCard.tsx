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
  History
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';

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
  status_role?: string;
  status_sender?: string;
  sender_latest_status?: string;
  status_receiver?: string;
  receiver_latest_status?: string;
}

interface PurchaseCardProps {
  purchase: Purchase;
  onViewDetails?: (purchaseId: number) => void;
  onViewHistory?: (purchaseId: number) => void;
  onEdit?: (purchaseId: number) => void;
  onSendEmail?: (purchaseId: number) => void;
  onResendToPM?: (purchaseId: number) => void;
  onResendToEst?: (purchaseId: number) => void;
  isLoading?: boolean;
  emailSent?: boolean;
  sendingEmail?: boolean;
}

const PurchaseCard = forwardRef<HTMLDivElement, PurchaseCardProps>(({
  purchase,
  onViewDetails,
  onViewHistory,
  onEdit,
  onSendEmail,
  onResendToPM,
  onResendToEst,
  isLoading = false,
  emailSent = false,
  sendingEmail = false
}, ref) => {
  // Calculate total amount from materials
  const totalAmount = purchase.materials?.reduce((sum, m) => 
    sum + (m.quantity * m.cost), 0
  ) || 0;

  // Determine status display - check sender_latest_status first for procurement view
  const getStatus = () => {
    // For procurement view, check if they have approved it
    if (purchase.sender_latest_status) return purchase.sender_latest_status;
    if (purchase.latest_status) return purchase.latest_status;
    if (purchase.status) return purchase.status;
    return 'pending';
  };

  const status = getStatus();

  // Check if rejected by Project Manager
  const isRejectedByPM = () => {
    // Check approvals array
    const pmRejection = purchase.approvals?.some((a: any) => 
      a.reviewer_role === 'projectManager' && a.status === 'rejected'
    );
    
    // Check status fields
    const statusRejectedByPM = (
      (purchase.status_role === 'projectManager' && purchase.sender_latest_status === 'rejected') ||
      (purchase.status_sender === 'projectManager' && purchase.sender_latest_status === 'rejected')
    );
    
    return pmRejection || statusRejectedByPM;
  };

  // Check if rejected by Estimation
  const isRejectedByEstimation = () => {
    // Check approvals array
    const estRejection = purchase.approvals?.some((a: any) => 
      a.reviewer_role === 'estimation' && a.status === 'rejected'
    );
    
    // Check status fields
    const statusRejectedByEst = (
      (purchase.status_role === 'estimation' && purchase.sender_latest_status === 'rejected') ||
      (purchase.status_sender === 'estimation' && purchase.sender_latest_status === 'rejected')
    );
    
    return estRejection || statusRejectedByEst;
  };

  const rejectedByPM = status === 'rejected' && isRejectedByPM();
  const rejectedByEst = status === 'rejected' && isRejectedByEstimation();

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
      case 'delivered':
      case 'closed':
      case 'finished':
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
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-50 rounded-lg">
                <FileText className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {purchase.prNumber || `PR-${purchase.purchase_id}`}
                </h3>
                <p className="text-xs text-gray-500">
                  {new Date(purchase.date || purchase.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 items-end">
              <div className="flex flex-col gap-1 items-end">
                <Badge className={`${getStatusColor(status)} border`}>
                  {status.toUpperCase()}
                </Badge>
                {rejectedByPM && (
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 border text-xs">
                    Rejected by PM
                  </Badge>
                )}
              </div>
              {priority && (
                <Badge className={`${getPriorityColor(priority)} border text-xs`}>
                  {priority.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>

          <Separator className="my-3" />

          {/* Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Building2 className="w-3 h-3 text-gray-400" />
              <span className="font-medium text-gray-900">{purchase.project_id}</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Package className="w-3 h-3 text-gray-400" />
              <span className="font-medium text-gray-900">{purchase.requested_by}</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <DollarSign className="w-3 h-3 text-gray-400" />
              <span className="font-semibold text-gray-900">
                AED {totalAmount.toLocaleString()}
              </span>
            </div>

            {purchase.materials && (
              <div className="flex items-center gap-2 text-xs">
                <Package className="w-3 h-3 text-gray-400" />
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

          <Separator className="my-3" />

          {/* Actions */}
          <div className="space-y-2">
            {/* Primary Actions Row */}
            <div className="flex items-center gap-1.5 w-full">
              {/* View Actions - Always visible */}
              {onViewDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(purchase.purchase_id)}
                  disabled={isLoading}
                  className="flex-1 h-7 text-xs flex items-center justify-center min-w-0"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Details
                </Button>
              )}
              
              {onViewHistory && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewHistory(purchase.purchase_id)}
                  disabled={isLoading}
                  className="flex-1 h-7 text-xs flex items-center justify-center min-w-0"
                >
                  <History className="w-3 h-3 mr-1" />
                  History
                </Button>
              )}

              {/* Edit Action - Show only for pending items */}
              {onEdit && status === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(purchase.purchase_id)}
                  disabled={isLoading}
                  title="Edit Purchase Request"
                  className="flex-1 h-7 text-xs flex items-center justify-center min-w-0"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>

            {/* Action Row - Send to PM */}
            {!emailSent && status === 'pending' && onSendEmail && (
              <div className="flex items-center justify-center">
                <Button
                  size="sm"
                  onClick={() => onSendEmail(purchase.purchase_id)}
                  disabled={isLoading || sendingEmail}
                  className="text-white w-full h-7 text-xs flex items-center justify-center"
                  style={{ backgroundColor: sendingEmail ? '#64748b' : '#243d8a' }}
                  onMouseEnter={(e) => !sendingEmail && (e.currentTarget.style.backgroundColor = '#1a2d66')}
                  onMouseLeave={(e) => !sendingEmail && (e.currentTarget.style.backgroundColor = '#243d8a')}
                  title="Send to Project Manager"
                >
                  {sendingEmail ? (
                    <>
                      <ModernLoadingSpinners variant="dots" size="sm" className="mr-1" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-3 h-3 mr-1" />
                      Send to PM
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* Resend to PM Button for PM-rejected PRs */}
            {rejectedByPM && onResendToPM && (
              <div className="flex items-center justify-center">
                <Button
                  size="sm"
                  onClick={() => onResendToPM(purchase.purchase_id)}
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 text-white w-full h-7 text-xs flex items-center justify-center"
                  title="Resend to Project Manager after revision"
                >
                  <Mail className="w-3 h-3 mr-1" />
                  Resend to PM
                </Button>
              </div>
            )}
            
            {/* Resend to Estimation Button for Est-rejected PRs */}
            {rejectedByEst && onResendToEst && (
              <div className="flex items-center justify-center">
                <Button
                  size="sm"
                  onClick={() => onResendToEst(purchase.purchase_id)}
                  disabled={isLoading}
                  className="text-white w-full h-7 text-xs flex items-center justify-center"
                  style={{ backgroundColor: '#243d8a', hover: { backgroundColor: '#1a2d66' } }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a2d66'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#243d8a'}
                  title="Resend to Estimation after revision"
                >
                  <Mail className="w-3 h-3 mr-1" />
                  Resend to Estimation
                </Button>
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