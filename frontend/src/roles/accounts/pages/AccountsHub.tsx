/**
 * Accounts Hub Page
 * Main workspace for Accounts department to process payments and manage transactions
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  RefreshCw, Search, CreditCard, 
  CheckSquare, XSquare, Clock, TrendingUp,
  DollarSign, FileText, BarChart3, AlertCircle,
  Building, Receipt, Banknote, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import AccountsApprovalCard from '../components/AccountsApprovalCard';
import PaymentProcessingModal from '../components/PaymentProcessingModal';
import PaymentApprovalModal from '../components/PaymentApprovalModal';
import PurchaseDetailsModal from '../components/PurchaseDetailsModal';
import PaymentTransactionModal from '../components/PaymentTransactionModal';
import AcknowledgementModal from '../components/AcknowledgementModal';
import { accountsService } from '../services/accountsService';
import type { Purchase } from '../types';
import { toast } from 'sonner';

const AccountsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('processing');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Modal states
  const [paymentProcessingModalOpen, setPaymentProcessingModalOpen] = useState(false);
  const [paymentApprovalModalOpen, setPaymentApprovalModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [transactionDetailsModalOpen, setTransactionDetailsModalOpen] = useState(false);
  const [acknowledgementModalOpen, setAcknowledgementModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [approvalMode, setApprovalMode] = useState<'approve' | 'reject'>('approve');

  // Metrics
  const [metrics, setMetrics] = useState({
    pendingPaymentCount: 0,
    processingCount: 0,
    processedCount: 0,
    rejectedCount: 0,
    totalValue: 0,
    avgProcessingTime: 0,
    totalTransactions: 0
  });

  // Fetch purchases data
  const fetchPurchases = async () => {
    try {
      setIsLoading(true);
      
      const response = await accountsService.getAccountsPurchases();
      
      if (response && response.purchase_details) {
        const allPurchases = response.purchase_details.map(purchase => {
          // Use material_details if available, fallback to materials
          const materials = purchase.material_details || purchase.materials || [];
          
          return {
            ...purchase,
            materials: materials, // Normalize to 'materials' for consistency
            // Calculate total cost from materials
            total_cost: materials.reduce((sum: number, material: any) => 
              sum + (material.cost || 0) * (material.quantity || 1), 0
            ) || 0,
            // Calculate total quantity from materials
            total_quantity: materials.reduce((sum: number, material: any) => 
              sum + (material.quantity || 0), 0
            ) || 0,
            // Set material count
            material_count: materials.length || 0
          };
        });
        setPurchases(allPurchases);
        
        // Calculate metrics based on accounts_status - only processing and processed
        let processingPurchases: Purchase[] = [];
        let processedPurchases: Purchase[] = [];
        
        allPurchases.forEach(p => {
          // Get status from latest_status object
          const latestStatus = p.latest_status;
          
          if (latestStatus) {
            const sender = latestStatus.sender;
            const receiver = latestStatus.receiver;
            const status = latestStatus.status?.toLowerCase();
            
            // Check if this is ready for accounts processing (TD approved, sent to accounts)
            // OR if accounts is processing (accounts sent status but not final)
            if ((sender === 'technicalDirector' && receiver === 'accounts' && status === 'approved') ||
                (sender === 'accounts' && status === 'pending')) {
              processingPurchases.push(p);
            }
            // Check if accounts has approved/processed/completed/transferred
            else if (sender === 'accounts' && (
              status === 'approved' || 
              status === 'payment_processed' || 
              status === 'completed' ||
              status === 'transferred' ||
              status === 'payment_processing'
            )) {
              processedPurchases.push(p);
            }
          }
          
          // Fallback: Also check direct status fields if they exist
          const accountsStatus = p.accounts_status?.toLowerCase();
          const tdStatus = p.technical_director_status?.toLowerCase();
          
          if (!p.latest_status) {
            if ((tdStatus === 'approved' && (!accountsStatus || accountsStatus === 'pending')) ||
                accountsStatus === 'payment_processing') {
              processingPurchases.push(p);
            } else if (accountsStatus === 'payment_processed' || 
                       accountsStatus === 'approved' || 
                       accountsStatus === 'transferred' ||
                       accountsStatus === 'completed') {
              processedPurchases.push(p);
            }
          }
        });
        
        const processingValue = processingPurchases.reduce((sum, p) => 
          sum + (p.total_cost || 0), 0
        );
        
        const totalTransactions = processingPurchases.length + processedPurchases.length;

        setMetrics({
          pendingPaymentCount: 0, // Remove pending tab
          processingCount: processingPurchases.length,
          processedCount: processedPurchases.length,
          rejectedCount: 0, // Remove rejected tab
          totalValue: processingValue,
          avgProcessingTime: 0, // Would need to calculate from transaction data
          totalTransactions: totalTransactions
        });
      } else {
        setPurchases([]);
        setMetrics({
          pendingPaymentCount: 0,
          processingCount: 0,
          processedCount: 0,
          rejectedCount: 0,
          totalValue: 0,
          avgProcessingTime: 0,
          totalTransactions: 0
        });
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
      setPurchases([]);
      setMetrics({
        pendingPaymentCount: 0,
        processingCount: 0,
        processedCount: 0,
        rejectedCount: 0,
        totalValue: 0,
        avgProcessingTime: 0,
        totalTransactions: 0
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

    // Tab filter - Only processing and processed tabs
    switch (activeTab) {
      case 'processing':
        // Show purchases ready for payment processing OR currently processing
        filtered = purchases.filter(p => {
          const latestStatus = p.latest_status;
          
          if (latestStatus) {
            const sender = latestStatus.sender;
            const receiver = latestStatus.receiver;
            const status = latestStatus.status?.toLowerCase();
            
            // Ready for processing (TD approved, sent to accounts) OR currently processing
            return (sender === 'technicalDirector' && receiver === 'accounts' && status === 'approved') ||
                   (sender === 'accounts' && status === 'pending');
          }
          
          // Fallback to direct status fields
          const accountsStatus = p.accounts_status?.toLowerCase();
          const tdStatus = p.technical_director_status?.toLowerCase();
          return (tdStatus === 'approved' && (!accountsStatus || accountsStatus === 'pending')) ||
                 accountsStatus === 'payment_processing';
        });
        break;
        
      case 'processed':
        // Show purchases where payment processed (accounts approved/completed/transferred)
        filtered = purchases.filter(p => {
          const latestStatus = p.latest_status;
          
          if (latestStatus) {
            const sender = latestStatus.sender;
            const status = latestStatus.status?.toLowerCase();
            // Check for all possible processed statuses
            return sender === 'accounts' && (
              status === 'approved' || 
              status === 'payment_processed' || 
              status === 'completed' ||
              status === 'transferred' ||
              status === 'payment_processing' // Include payment_processing as it means payment was initiated
            );
          }
          
          // Fallback to direct status fields
          const accountsStatus = p.accounts_status?.toLowerCase();
          return accountsStatus === 'payment_processed' || 
                 accountsStatus === 'approved' || 
                 accountsStatus === 'transferred' ||
                 accountsStatus === 'completed';
        });
        break;
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.purchase_id.toString().includes(searchTerm) ||
        p.site_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.project_id?.toString().includes(searchTerm)
      );
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || a.date).getTime();
      const dateB = new Date(b.created_at || b.date).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    setFilteredPurchases(filtered);
  }, [purchases, activeTab, searchTerm, sortOrder]);

  // Handle process payment button click
  const handleProcessPayment = (purchaseId: number) => {
    setSelectedPurchaseId(purchaseId);
    setPaymentProcessingModalOpen(true);
  };

  // Handle approve payment button click
  const handleApprovePayment = (purchaseId: number) => {
    const purchase = purchases.find(p => p.purchase_id === purchaseId);
    if (purchase) {
      setSelectedPurchaseId(purchaseId);
      // Try to get transaction_id from multiple possible sources
      const transactionId = purchase.payment_transaction?.transaction_id || 
                           purchase.payment_details?.transaction_id || 
                           purchaseId; // Fallback to purchase_id
      setSelectedTransactionId(transactionId);
      setApprovalMode('approve');
      setPaymentApprovalModalOpen(true);
    }
  };

  // Handle reject payment button click
  const handleRejectPayment = (purchaseId: number) => {
    const purchase = purchases.find(p => p.purchase_id === purchaseId);
    if (purchase) {
      setSelectedPurchaseId(purchaseId);
      // Try to get transaction_id from multiple possible sources
      const transactionId = purchase.payment_transaction?.transaction_id || 
                           purchase.payment_details?.transaction_id || 
                           purchaseId; // Fallback to purchase_id
      setSelectedTransactionId(transactionId);
      setApprovalMode('reject');
      setPaymentApprovalModalOpen(true);
    }
  };

  // Handle view details button click
  const handleViewDetails = (purchaseId: number) => {
    const purchase = purchases.find(p => p.purchase_id === purchaseId);
    if (purchase) {
      setSelectedPurchase(purchase);
      setSelectedPurchaseId(purchaseId);
      setDetailsModalOpen(true);
    }
  };

  // Handle view payment button click - now redirects to transaction details
  const handleViewPayment = (purchaseId: number) => {
    setSelectedPurchaseId(purchaseId);
    setTransactionDetailsModalOpen(true);
  };

  // Handle send acknowledgement button click - opens modal
  const handleSendAcknowledgement = (purchaseId: number) => {
    const purchase = purchases.find(p => p.purchase_id === purchaseId);
    if (purchase) {
      setSelectedPurchase(purchase);
      setAcknowledgementModalOpen(true);
    } else {
      toast.error('Purchase not found');
    }
  };

  // Handle view transaction details button click
  const handleViewTransactionDetails = (purchaseId: number) => {
    setSelectedPurchaseId(purchaseId);
    setTransactionDetailsModalOpen(true);
  };


  // Handle success after any operation
  const handleOperationSuccess = async () => {
    setIsLoading(true);
    
    // Wait for backend to properly update
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Refresh the list to get updated data
    await fetchPurchases();
    
    // Show appropriate tab based on operation
    if (approvalMode === 'approve') {
      setActiveTab('processed');
      toast.success('Payment approved and processed successfully');
    } else if (approvalMode === 'reject') {
      setActiveTab('rejected');
      toast.success('Payment rejected successfully');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString()}`;
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            <span className="truncate">Accounts Hub</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Process payments and manage financial transactions
          </p>
        </div>
        <Button
          onClick={fetchPurchases}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1.5 sm:gap-2">
              <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
              <span className="truncate">Processing</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <p className="text-xl sm:text-2xl font-bold text-blue-600">{metrics.processingCount}</p>
            <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1.5 sm:gap-2">
              <CheckSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
              <span className="truncate">Processed</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <p className="text-xl sm:text-2xl font-bold text-green-600">{metrics.processedCount}</p>
            <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">Payments complete</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1.5 sm:gap-2">
              <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500 flex-shrink-0" />
              <span className="truncate">Total Value</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <p className="text-sm sm:text-lg lg:text-xl font-bold text-purple-600 truncate">
              {formatCurrency(metrics.totalValue)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">Processing value</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1.5 sm:gap-2">
              <Banknote className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-500 flex-shrink-0" />
              <span className="truncate">Transactions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <p className="text-xl sm:text-2xl font-bold text-indigo-600">{metrics.totalTransactions}</p>
            <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">Total handled</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar and Sort */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 lg:max-w-2xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <Input
            placeholder="Search purchases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base bg-white border-gray-200 focus:border-green-500 focus:ring-green-500"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
          className="flex items-center gap-2 min-w-[120px]"
        >
          {sortOrder === 'newest' ? (
            <>
              <ArrowDown className="h-4 w-4" />
              Newest First
            </>
          ) : (
            <>
              <ArrowUp className="h-4 w-4" />
              Oldest First
            </>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="grid w-full min-w-[280px] max-w-none lg:max-w-2xl grid-cols-2 bg-gray-100 h-auto">
            <TabsTrigger 
              value="processing" 
              className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap"
            >
              <Receipt className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden xs:inline">Processing</span>
              <span className="text-[10px] xs:text-xs sm:text-sm">({metrics.processingCount})</span>
            </TabsTrigger>
            <TabsTrigger 
              value="processed" 
              className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-green-600 text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap"
            >
              <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden xs:inline">Processed</span>
              <span className="text-[10px] xs:text-xs sm:text-sm">({metrics.processedCount})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        {['processing', 'processed'].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue} className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
              </div>
            ) : filteredPurchases.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                  <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
                  <p className="text-base sm:text-lg font-medium text-gray-900">No purchases found</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 text-center px-4">
                    {searchTerm 
                      ? 'Try adjusting your search criteria'
                      : `No purchases in ${tabValue} status at this time`
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredPurchases.map((purchase) => (
                    <AccountsApprovalCard
                      key={purchase.purchase_id}
                      purchase={purchase}
                      onProcessPayment={handleProcessPayment}
                      onApprovePayment={handleApprovePayment}
                      onRejectPayment={handleRejectPayment}
                      onViewDetails={handleViewDetails}
                      onViewTransactionDetails={handleViewTransactionDetails}
                      onSendAcknowledgement={handleSendAcknowledgement}
                      isLoading={isLoading}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Payment Processing Modal */}
      <PaymentProcessingModal
        isOpen={paymentProcessingModalOpen}
        onClose={() => setPaymentProcessingModalOpen(false)}
        purchaseId={selectedPurchaseId}
        onSuccess={handleOperationSuccess}
      />
      
      {/* Payment Approval Modal */}
      <PaymentApprovalModal
        isOpen={paymentApprovalModalOpen}
        onClose={() => setPaymentApprovalModalOpen(false)}
        transactionId={selectedTransactionId}
        mode={approvalMode}
        onSuccess={handleOperationSuccess}
      />
      
      {/* Purchase Details Modal */}
      <PurchaseDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedPurchase(null);
        }}
        purchaseId={selectedPurchaseId}
      />
      
      {/* Payment Transaction Details Modal */}
      <PaymentTransactionModal
        isOpen={transactionDetailsModalOpen}
        onClose={() => {
          setTransactionDetailsModalOpen(false);
        }}
        purchaseId={selectedPurchaseId}
      />
      
      {/* Acknowledgement Modal */}
      <AcknowledgementModal
        isOpen={acknowledgementModalOpen}
        onClose={() => {
          setAcknowledgementModalOpen(false);
          setSelectedPurchase(null);
        }}
        purchase={selectedPurchase}
        onSuccess={() => {
          setAcknowledgementModalOpen(false);
          setSelectedPurchase(null);
          fetchPurchases();
        }}
      />
    </div>
  );
};

export default AccountsHub;