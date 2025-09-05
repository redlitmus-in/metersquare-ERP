/**
 * Project Manager Hub Page
 * Main workspace for Project Manager role
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  RefreshCw, Download, Search, Filter, LayoutDashboard, 
  Package, CheckSquare, BarChart3, Bell, Settings
} from 'lucide-react';
import { PMMetricsCards } from '../components/PMMetricsCards';
import { PurchaseApprovalCard } from '../components/PurchaseApprovalCard';
import { ApprovalModal } from '../components/ApprovalModal';
import { PurchaseHistoryModal } from '../components/PurchaseHistoryModal';
import { projectManagerService, PMDashboardData, ProcurementPurchase } from '../services/projectManagerService';
import { toast } from 'sonner';

const ProjectManagerHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all-purchases');
  const [dashboardData, setDashboardData] = useState<PMDashboardData>({
    totalPurchases: 0,
    pendingApprovals: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
    averageApprovalTime: 0,
    recentPurchases: [],
    approvalTrends: [],
    categoryBreakdown: []
  });
  const [purchases, setPurchases] = useState<ProcurementPurchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<ProcurementPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  // Modal states
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<ProcurementPurchase | null>(null);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>('');
  const [modalMode, setModalMode] = useState<'approve' | 'reject'>('approve');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const data = await projectManagerService.getPMDashboardData();
      setDashboardData(data);
      setPurchases(data.recentPurchases);
      setFilteredPurchases(data.recentPurchases);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch purchases
  const fetchPurchases = async () => {
    try {
      setIsLoading(true);
      const response = await projectManagerService.getProcurementApprovedPurchases();
      if (response.success) {
        setPurchases(response.approved_procurement_purchases);
        setFilteredPurchases(response.approved_procurement_purchases);
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast.error('Failed to fetch purchase requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filter purchases based on search and status
  useEffect(() => {
    let filtered = [...purchases];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.purchase_id.toString().includes(searchTerm) ||
        p.site_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.purpose.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => {
        if (filterStatus === 'pending') {
          // Pending PM approval - not yet reviewed by PM
          return p.current_status.role !== 'projectManager';
        }
        if (filterStatus === 'approved') {
          // PM approved - role is projectManager and status is approved
          return p.current_status.role === 'projectManager' && p.current_status.status === 'approved';
        }
        if (filterStatus === 'rejected') {
          // PM rejected - role is projectManager and status is rejected
          return p.current_status.role === 'projectManager' && p.current_status.status === 'rejected';
        }
        return true;
      });
    }

    setFilteredPurchases(filtered);
  }, [searchTerm, filterStatus, purchases]);

  // Handle approve
  const handleApprove = (purchaseId: number) => {
    const purchase = purchases.find(p => p.purchase_id === purchaseId);
    if (purchase) {
      setSelectedPurchase(purchase);
      setModalMode('approve');
      setApprovalModalOpen(true);
    }
  };

  // Handle reject
  const handleReject = (purchaseId: number) => {
    const purchase = purchases.find(p => p.purchase_id === purchaseId);
    if (purchase) {
      setSelectedPurchase(purchase);
      setModalMode('reject');
      setApprovalModalOpen(true);
    }
  };

  // Handle view details
  const handleViewDetails = (purchaseId: number) => {
    setSelectedPurchaseId(purchaseId.toString());
    setDetailsModalOpen(true);
  };

  // Confirm approval/rejection
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
        await fetchDashboardData();
        setApprovalModalOpen(false);
        setSelectedPurchase(null);
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

  const pendingPurchases = filteredPurchases.filter(p => p.current_status.role !== 'projectManager');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Project Manager Hub</h1>
            <p className="text-gray-500 mt-1">Manage purchase approvals and project workflows</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchDashboardData} variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <PMMetricsCards data={dashboardData} />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-1 lg:w-auto lg:inline-grid">
            <TabsTrigger value="all-purchases" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              All Purchases
              {pendingPurchases.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                  {pendingPurchases.length} pending
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* All Purchases Tab */}
          <TabsContent value="all-purchases" className="space-y-4">
            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                size="sm"
                className="flex-grow sm:flex-grow-0"
              >
                All
              </Button>
              <Button
                variant={filterStatus === 'pending' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('pending')}
                size="sm"
                className="flex-grow sm:flex-grow-0"
              >
                Pending
                {purchases.filter(p => p.current_status.role !== 'projectManager').length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                    {purchases.filter(p => p.current_status.role !== 'projectManager').length}
                  </span>
                )}
              </Button>
              <Button
                variant={filterStatus === 'approved' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('approved')}
                size="sm"
                className="flex-grow sm:flex-grow-0"
              >
                Approved
              </Button>
              <Button
                variant={filterStatus === 'rejected' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('rejected')}
                size="sm"
                className="flex-grow sm:flex-grow-0"
              >
                Rejected
              </Button>
            </div>

            {/* All Purchases List */}
            <div className="grid grid-cols-1 gap-4">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : filteredPurchases.length > 0 ? (
                filteredPurchases.map(purchase => (
                  <PurchaseApprovalCard
                    key={purchase.purchase_id}
                    purchase={purchase}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onViewDetails={handleViewDetails}
                    isLoading={isProcessing}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">No purchases found</p>
                  <p className="text-sm mt-1">Try adjusting your filters</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Approval Modal */}
        <ApprovalModal
          isOpen={approvalModalOpen}
          onClose={() => {
            setApprovalModalOpen(false);
            setSelectedPurchase(null);
          }}
          purchase={selectedPurchase}
          mode={modalMode}
          onConfirm={handleConfirmApproval}
          isLoading={isProcessing}
        />
        
        {/* Purchase History Modal */}
        <PurchaseHistoryModal
          isOpen={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedPurchaseId('');
          }}
          purchaseId={selectedPurchaseId}
        />
      </motion.div>
    </div>
  );
};

export default ProjectManagerHub;