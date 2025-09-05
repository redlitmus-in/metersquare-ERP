/**
 * Estimation Hub Page
 * Main workspace for Estimation team to review and approve/reject purchases
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  RefreshCw, Search, Filter, Calculator, 
  CheckSquare, XSquare, Clock, TrendingUp,
  DollarSign, FileText, BarChart3, AlertCircle
} from 'lucide-react';
import { EstimationApprovalCard } from '../components/EstimationApprovalCard';
import { EstimationApprovalModal } from '../components/EstimationApprovalModal';
import { PurchaseDetailsModal } from '../components/PurchaseDetailsModal';
import { Purchase, estimationService } from '../services/estimationService';
import { toast } from 'sonner';

const EstimationHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<'approve' | 'reject'>('approve');

  // Metrics
  const [metrics, setMetrics] = useState({
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalValue: 0,
    avgProcessingTime: 0,
    totalQuantity: 0,
    costRejections: 0,
    pmFlagRejections: 0
  });

  // Fetch purchases data ONLY - no dashboard API call here
  const fetchPurchases = async () => {
    try {
      setIsLoading(true);
      
      // Only fetch estimation purchases, NOT dashboard
      const response = await estimationService.getEstimationPurchases();
      
      if (response && response.purchases) {
        const allPurchases = response.purchases;
        
        setPurchases(allPurchases);
        
        // Calculate metrics based on actual estimation status in each purchase
        let pendingPurchases = [];
        let approvedPurchases = [];
        let rejectedPurchases = [];
        
        allPurchases.forEach(p => {
          // Check estimation_status field directly from status_info
          const estimationStatus = p.status_info?.estimation_status?.toLowerCase();
          
          if (estimationStatus === 'pending') {
            pendingPurchases.push(p);
          } else if (estimationStatus === 'approved') {
            approvedPurchases.push(p);
          } else if (estimationStatus === 'rejected') {
            rejectedPurchases.push(p);
          }
        });
        
        const pendingValue = pendingPurchases.reduce((sum, p) => 
          sum + (p.total_cost || 0), 0
        );
        
        const approvedValue = approvedPurchases.reduce((sum, p) => 
          sum + (p.total_cost || 0), 0
        );
        
        const rejectedValue = rejectedPurchases.reduce((sum, p) => 
          sum + (p.total_cost || 0), 0
        );
        
        const totalQuantity = pendingPurchases.reduce((sum, p) => 
          sum + (p.total_quantity || 0), 0
        );

        setMetrics({
          pendingCount: pendingPurchases.length,
          approvedCount: approvedPurchases.length,
          rejectedCount: rejectedPurchases.length,
          totalValue: pendingValue,
          avgProcessingTime: 0,
          totalQuantity: totalQuantity,
          costRejections: rejectedPurchases.filter(p => p.rejection_reason?.includes('cost')).length,
          pmFlagRejections: rejectedPurchases.filter(p => p.rejection_reason?.includes('PM')).length
        });
      } else {
        setPurchases([]);
        setMetrics({
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
          totalValue: 0,
          avgProcessingTime: 0,
          totalQuantity: 0,
          costRejections: 0,
          pmFlagRejections: 0
        });
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
      setPurchases([]);
      setMetrics({
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        totalValue: 0,
        avgProcessingTime: 0,
        totalQuantity: 0,
        costRejections: 0,
        pmFlagRejections: 0
      });
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchPurchases();
  }, []);

  // Filter purchases based on tab and search
  useEffect(() => {
    let filtered = [...purchases];

    // Tab filter - Check estimation_status field from status_info
    switch (activeTab) {
      case 'pending':
        // Show purchases where estimation_status is pending
        filtered = purchases.filter(p => {
          const estimationStatus = p.status_info?.estimation_status?.toLowerCase();
          return estimationStatus === 'pending';
        });
        break;
        
      case 'approved':
        // Show purchases where estimation_status is approved
        filtered = purchases.filter(p => {
          const estimationStatus = p.status_info?.estimation_status?.toLowerCase();
          return estimationStatus === 'approved';
        });
        break;
        
      case 'rejected':
        // Show purchases where estimation_status is rejected
        filtered = purchases.filter(p => {
          const estimationStatus = p.status_info?.estimation_status?.toLowerCase();
          return estimationStatus === 'rejected';
        });
        break;
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.purchase_id.toString().includes(searchTerm) ||
        p.site_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.project_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPurchases(filtered);
  }, [purchases, activeTab, searchTerm]);

  // Handle approve button click
  const handleApprove = (purchaseId: number) => {
    setSelectedPurchaseId(purchaseId);
    setModalMode('approve');
    setApprovalModalOpen(true);
  };

  // Handle reject button click
  const handleReject = (purchaseId: number) => {
    setSelectedPurchaseId(purchaseId);
    setModalMode('reject');
    setApprovalModalOpen(true);
  };

  // Handle view details button click
  const handleViewDetails = (purchaseId: number) => {
    setSelectedPurchaseId(purchaseId);
    setDetailsModalOpen(true);
  };

  // Handle success after approval/rejection
  const handleApprovalSuccess = async () => {
    // Show loading state briefly
    setIsLoading(true);
    
    // Wait for backend to properly update
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Refresh the list to get updated data
    await fetchPurchases();
    
    // Move to appropriate tab after action
    if (modalMode === 'approve') {
      setActiveTab('approved');
      toast.success('Purchase moved to Approved tab');
    } else if (modalMode === 'reject') {
      setActiveTab('rejected');
      toast.success('Purchase moved to Rejected tab');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString()}`;
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pb-8">
      {/* Page Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <Calculator className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600" />
            <span className="truncate">Estimation Hub</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Review and analyze cost implications
          </p>
        </div>
        <Button
          onClick={fetchPurchases}
          disabled={isLoading}
          className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Metrics Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1.5 sm:gap-2">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 flex-shrink-0" />
              <span className="truncate">Pending Review</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <p className="text-xl sm:text-2xl font-bold text-amber-600">{metrics.pendingCount}</p>
            <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">Awaiting analysis</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1.5 sm:gap-2">
              <CheckSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
              <span className="truncate">Approved</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <p className="text-xl sm:text-2xl font-bold text-green-600">{metrics.approvedCount}</p>
            <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">Sent to TD</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1.5 sm:gap-2">
              <XSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
              <span className="truncate">Rejected</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <p className="text-xl sm:text-2xl font-bold text-red-600">{metrics.rejectedCount}</p>
            <div className="text-xs text-gray-500 mt-0.5 sm:mt-1 space-y-0.5">
              <p className="truncate">Cost: {metrics.costRejections}</p>
              <p className="truncate">PM Flag: {metrics.pmFlagRejections}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1.5 sm:gap-2">
              <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
              <span className="truncate">Total Value</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <p className="text-sm sm:text-lg lg:text-xl font-bold text-blue-600 truncate">
              {formatCurrency(metrics.totalValue)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">Pending value</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1.5 sm:gap-2">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500 flex-shrink-0" />
              <span className="truncate">Total Quantity</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <p className="text-xl sm:text-2xl font-bold text-purple-600">{metrics.totalQuantity}</p>
            <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">Pending items</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar - Responsive */}
      <div className="mb-4 sm:mb-6">
        <div className="relative w-full lg:max-w-2xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <Input
            placeholder="Search purchases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base bg-white border-gray-200 focus:border-amber-500 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Tabs - Responsive */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="grid w-full min-w-[280px] max-w-none lg:max-w-2xl grid-cols-3 bg-gray-100 h-auto">
            <TabsTrigger 
              value="pending" 
              className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-amber-600 text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap"
            >
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden xs:inline">Pending</span>
              <span className="text-[10px] xs:text-xs sm:text-sm">({metrics.pendingCount})</span>
            </TabsTrigger>
            <TabsTrigger 
              value="approved" 
              className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-green-600 text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap"
            >
              <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden xs:inline">Approved</span>
              <span className="text-[10px] xs:text-xs sm:text-sm">({metrics.approvedCount})</span>
            </TabsTrigger>
            <TabsTrigger 
              value="rejected" 
              className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-red-600 text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap"
            >
              <XSquare className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden xs:inline">Rejected</span>
              <span className="text-[10px] xs:text-xs sm:text-sm">({metrics.rejectedCount})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : filteredPurchases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
                <p className="text-base sm:text-lg font-medium text-gray-900">No purchases found</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 text-center px-4">
                  {searchTerm 
                    ? 'Try adjusting your search criteria'
                    : activeTab === 'pending'
                    ? 'No purchases require estimation review at this time'
                    : `No ${activeTab} purchases to display`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredPurchases.map((purchase) => (
                  <EstimationApprovalCard
                  key={purchase.purchase_id}
                  purchase={purchase}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onViewDetails={handleViewDetails}
                  isLoading={isLoading}
                />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Approved Tab */}
        <TabsContent value="approved" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : filteredPurchases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                <CheckSquare className="h-10 w-10 sm:h-12 sm:w-12 text-green-500 mb-3 sm:mb-4" />
                <p className="text-base sm:text-lg font-medium text-gray-900">No approved purchases</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 text-center px-4">
                  Approved purchases will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredPurchases.map((purchase) => (
                  <EstimationApprovalCard
                  key={purchase.purchase_id}
                  purchase={purchase}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onViewDetails={handleViewDetails}
                  isLoading={isLoading}
                />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Rejected Tab */}
        <TabsContent value="rejected" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : filteredPurchases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                <XSquare className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mb-3 sm:mb-4" />
                <p className="text-base sm:text-lg font-medium text-gray-900">No rejected purchases</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 text-center px-4">
                  Rejected purchases will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredPurchases.map((purchase) => (
                  <EstimationApprovalCard
                  key={purchase.purchase_id}
                  purchase={purchase}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onViewDetails={handleViewDetails}
                  isLoading={isLoading}
                />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approval/Rejection Modal */}
      <EstimationApprovalModal
        isOpen={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        purchaseId={selectedPurchaseId}
        mode={modalMode}
        onSuccess={handleApprovalSuccess}
      />
      
      {/* Purchase Details Modal */}
      <PurchaseDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        purchaseId={selectedPurchaseId}
      />
    </div>
  );
};

export default EstimationHub;