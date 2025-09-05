/**
 * Purchase Approvals Page
 * Dedicated page for managing purchase approvals
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, RefreshCw, Download, Share2, 
  FileText, History, AlertCircle
} from 'lucide-react';
import { PurchaseDetailsView } from '../components/PurchaseDetailsView';
import { PurchaseStatusTimeline } from '../components/PurchaseStatusTimeline';
import { ApprovalModal } from '../components/ApprovalModal';
import { projectManagerService, PurchaseStatusDetails, ProcurementPurchase } from '../services/projectManagerService';
import { toast } from 'sonner';

const PurchaseApprovalsPage: React.FC = () => {
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const navigate = useNavigate();
  
  const [statusDetails, setStatusDetails] = useState<PurchaseStatusDetails | null>(null);
  const [purchase, setPurchase] = useState<ProcurementPurchase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  
  // Modal states
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'approve' | 'reject'>('approve');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch purchase details
  const fetchPurchaseDetails = async () => {
    if (!purchaseId) return;
    
    try {
      setIsLoading(true);
      const details = await projectManagerService.getPurchaseStatusDetails(parseInt(purchaseId));
      setStatusDetails(details);
      
      // Create a ProcurementPurchase object from details for the modal
      const purchaseData: ProcurementPurchase = {
        purchase_id: details.purchase_id,
        site_location: details.purchase_details.site_location,
        purpose: details.purchase_details.purpose,
        date: details.purchase_details.date,
        email_sent: details.purchase_details.email_sent,
        created_at: details.purchase_details.created_at,
        current_workflow_status: 'pending_pm_review',
        pm_status: null,
        pm_status_date: null,
        pm_comments: null,
        pm_rejection_reason: null,
        procurement_status: 'approved',
        procurement_status_date: new Date().toISOString(),
        procurement_comments: '',
        materials_summary: details.purchase_details.materials_summary,
        status_history: []
      };
      setPurchase(purchaseData);
    } catch (error) {
      console.error('Error fetching purchase details:', error);
      toast.error('Failed to fetch purchase details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseDetails();
  }, [purchaseId]);

  // Handle approval/rejection
  const handleConfirmApproval = async (data: {
    purchaseId: number;
    action: 'approve' | 'reject';
    rejectionReason?: string;
    comments?: string;
  }) => {
    try {
      setIsProcessing(true);
      
      let response;
      if (data.action === 'approve') {
        response = await projectManagerService.approvePurchase(data.purchaseId, data.comments);
      } else {
        response = await projectManagerService.rejectPurchase(
          data.purchaseId, 
          data.rejectionReason || '', 
          data.comments
        );
      }

      if (response.success) {
        toast.success(response.message || `Purchase ${data.action}d successfully`);

        // Refresh data
        await fetchPurchaseDetails();
        setApprovalModalOpen(false);
      } else {
        throw new Error(response.error || 'Operation failed');
      }
    } catch (error: any) {
      console.error('Error processing approval:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to process request');
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if purchase is pending PM approval
  // Check if the latest status exists and if it's not from PM or if PM hasn't acted yet
  const isPendingPMApproval = statusDetails && (
    !statusDetails.latest_pm_proc_status || 
    !statusDetails.latest_pm_proc_status.role ||
    (statusDetails.latest_pm_proc_status.role !== 'projectManager' &&
     statusDetails.latest_pm_proc_status.status !== 'rejected')
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading purchase details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!statusDetails) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Purchase Not Found</h2>
              <p className="text-gray-500 mb-4">The requested purchase could not be found.</p>
              <Button onClick={() => navigate('/project-manager')}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/project-manager')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Purchase #{statusDetails.purchase_id}
              </h1>
              <p className="text-gray-500 mt-1">
                {statusDetails.purchase_details.site_location} • {statusDetails.purchase_details.purpose}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isPendingPMApproval && (
              <>
                <Button 
                  onClick={() => {
                    setModalMode('approve');
                    setApprovalModalOpen(true);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isProcessing}
                >
                  Approve Purchase
                </Button>
                <Button 
                  onClick={() => {
                    setModalMode('reject');
                    setApprovalModalOpen(true);
                  }}
                  variant="destructive"
                  disabled={isProcessing}
                >
                  Reject Purchase
                </Button>
              </>
            )}
            <Button onClick={fetchPurchaseDetails} variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            <PurchaseDetailsView details={statusDetails} />
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <PurchaseStatusTimeline statusDetails={statusDetails} />
          </TabsContent>
        </Tabs>

        {/* Approval Modal */}
        {purchase && (
          <ApprovalModal
            isOpen={approvalModalOpen}
            onClose={() => setApprovalModalOpen(false)}
            purchase={purchase}
            mode={modalMode}
            onConfirm={handleConfirmApproval}
            isLoading={isProcessing}
          />
        )}
      </motion.div>
    </div>
  );
};

export default PurchaseApprovalsPage;