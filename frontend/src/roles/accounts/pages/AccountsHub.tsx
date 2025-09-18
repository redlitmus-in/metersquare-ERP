/**
 * Accounts Hub Page
 * Main workspace for Accounts department to process payments and manage transactions
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { 
  RefreshCw, Search, CreditCard, 
  CheckSquare, XSquare, Clock, TrendingUp,
  DollarSign, FileText, BarChart3, AlertCircle,
  Building, Receipt, Banknote, ArrowUpDown, ArrowUp, ArrowDown,
  Filter, Calendar, SlidersHorizontal, X
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
import usePurchaseStore, { startPolling, stopPolling } from '@/store/purchaseStore';

const AccountsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('processing');
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);

  // Use centralized store for real-time updates - PROPER SUBSCRIPTION
  const storePurchases = usePurchaseStore((state) => state.purchases);
  const isLoading = usePurchaseStore((state) => state.isLoading);
  const lastFetchTime = usePurchaseStore((state) => state.lastFetchTime);
  const fetchPurchases = usePurchaseStore((state) => state.fetchPurchases);
  const setupRealtimeSubscription = usePurchaseStore((state) => state.setupRealtimeSubscription);
  const cleanupRealtimeSubscription = usePurchaseStore((state) => state.cleanupRealtimeSubscription);
  const getPurchasesForRole = usePurchaseStore((state) => state.getPurchasesForRole);

  // Local state for filtered purchases
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'project' | 'location'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [amountFilter, setAmountFilter] = useState({ min: '', max: '' });
  const [locationFilter, setLocationFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState({ start: '', end: '' });
  
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

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPurchases('accounts');
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  // Check for real-time status
  const isRealtime = lastFetchTime && Date.now() - lastFetchTime.getTime() < 15000;

  // Initialize real-time updates on mount
  useEffect(() => {
    // Store user role for the purchase store
    localStorage.setItem('userRole', 'accounts');

    // Fetch immediately on mount
    fetchPurchases('accounts');

    // Setup real-time subscriptions
    setupRealtimeSubscription();

    // Start polling for updates (every 3 seconds)
    startPolling('accounts');

    console.log('✅ Real-time updates initialized for Accounts');

    // Cleanup on unmount
    return () => {
      stopPolling();
      cleanupRealtimeSubscription();
    };
  }, [setupRealtimeSubscription, cleanupRealtimeSubscription, fetchPurchases]);

  // AUTO-UPDATE from store when data changes!
  useEffect(() => {
    // Get purchases for accounts role from the store
    const accountsPurchases = getPurchasesForRole('accounts');

    if (accountsPurchases) {
      console.log('🔄 Auto-updating from store:', accountsPurchases.length, 'purchases');
      // Update local state with store data
      setPurchases(accountsPurchases);
    }
  }, [storePurchases, getPurchasesForRole]); // Re-run whenever store purchases change!

  // Calculate metrics whenever purchases change
  useEffect(() => {
    if (purchases.length > 0) {
        const allPurchases = purchases;
        
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
    }
  }, [purchases]);

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

    // Amount filter
    if (amountFilter.min || amountFilter.max) {
      filtered = filtered.filter(p => {
        const amount = p.total_cost || 0;
        const min = amountFilter.min ? parseFloat(amountFilter.min) : 0;
        const max = amountFilter.max ? parseFloat(amountFilter.max) : Infinity;
        return amount >= min && amount <= max;
      });
    }

    // Location filter
    if (locationFilter && locationFilter !== 'all') {
      filtered = filtered.filter(p => 
        p.site_location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    // Project filter
    if (projectFilter && projectFilter !== 'all') {
      filtered = filtered.filter(p => 
        p.project_id?.toString().includes(projectFilter)
      );
    }

    // Date range filter
    if (dateRangeFilter.start || dateRangeFilter.end) {
      filtered = filtered.filter(p => {
        const purchaseDate = new Date(p.created_at || p.date);
        const startDate = dateRangeFilter.start ? new Date(dateRangeFilter.start) : new Date('1900-01-01');
        const endDate = dateRangeFilter.end ? new Date(dateRangeFilter.end) : new Date();
        return purchaseDate >= startDate && purchaseDate <= endDate;
      });
    }

    // Sort by selected criteria
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'amount':
          aValue = a.total_cost || 0;
          bValue = b.total_cost || 0;
          break;
        case 'project':
          aValue = a.project_id?.toString() || '';
          bValue = b.project_id?.toString() || '';
          break;
        case 'location':
          aValue = a.site_location || '';
          bValue = b.site_location || '';
          break;
        case 'date':
        default:
          aValue = new Date(a.created_at || a.date).getTime();
          bValue = new Date(b.created_at || b.date).getTime();
          break;
      }

      if (sortBy === 'amount' || sortBy === 'date') {
        return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      } else {
        return sortOrder === 'desc' 
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      }
    });

    setFilteredPurchases(filtered);
  }, [purchases, activeTab, searchTerm, sortBy, sortOrder, amountFilter, locationFilter, projectFilter, dateRangeFilter]);

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

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setAmountFilter({ min: '', max: '' });
    setLocationFilter('');
    setProjectFilter('');
    setDateRangeFilter({ start: '', end: '' });
    setSortBy('date');
    setSortOrder('desc');
  };

  // Get unique locations for dropdown
  const getUniqueLocations = () => {
    const locations = purchases.map(p => p.site_location).filter(Boolean);
    return [...new Set(locations)].sort();
  };

  // Get unique projects for dropdown
  const getUniqueProjects = () => {
    const projects = purchases.map(p => p.project_id?.toString()).filter(Boolean);
    return [...new Set(projects)].sort();
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return searchTerm || 
           amountFilter.min || 
           amountFilter.max || 
           (locationFilter && locationFilter !== 'all') || 
           (projectFilter && projectFilter !== 'all') || 
           dateRangeFilter.start || 
           dateRangeFilter.end;
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Green Gradient Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-100 via-green-50 to-emerald-50 p-6 rounded-xl mb-4 shadow-lg border border-green-200"
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-green-800 flex items-center gap-3">
              <CreditCard className="h-7 w-7 sm:h-8 sm:w-8 text-green-700 drop-shadow-md" />
              <span>Accounts Hub</span>
            </h1>
            <p className="text-green-700 text-sm sm:text-base opacity-90">
              Process payments and manage financial transactions
            </p>
          </div>
        </div>
      </motion.div>

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
            <p className="text-sm sm:text-lg lg:text-xl font-bold text-green-600 truncate">
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

      {/* Search Bar, Filters and Sort */}
      <div className="mb-4 sm:mb-6 space-y-3">
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 lg:max-w-2xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <Input
              placeholder="Search by ID, location, purpose, or project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base bg-white border-gray-200 focus:border-green-500 focus:ring-green-500"
            />
          </div>
          
          {/* Filter Toggle Button */}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button
                variant={hasActiveFilters() ? "default" : "outline"}
                className={`flex items-center gap-2 min-w-[100px] ${
                  hasActiveFilters() ? 'bg-green-600 hover:bg-green-700 text-white' : ''
                }`}
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters() && (
                  <span className="bg-white text-green-600 rounded-full px-1.5 py-0.5 text-xs font-medium">
                    {[searchTerm, amountFilter.min, amountFilter.max, locationFilter, projectFilter, dateRangeFilter.start, dateRangeFilter.end].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 space-y-4" align="end">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Filters</h4>
                {hasActiveFilters() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              {/* Amount Range Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Amount Range (AED)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Min"
                    type="number"
                    value={amountFilter.min}
                    onChange={(e) => setAmountFilter({ ...amountFilter, min: e.target.value })}
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder="Max"
                    type="number"
                    value={amountFilter.max}
                    onChange={(e) => setAmountFilter({ ...amountFilter, max: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Location Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Location</Label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {getUniqueLocations().map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Project ID</Label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {getUniqueProjects().map((project) => (
                      <SelectItem key={project} value={project}>
                        Project {project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date Range</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dateRangeFilter.start}
                    onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, start: e.target.value })}
                    className="h-8 text-sm"
                    max={dateRangeFilter.end || undefined}
                  />
                  <Input
                    type="date"
                    value={dateRangeFilter.end}
                    onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, end: e.target.value })}
                    className="h-8 text-sm"
                    min={dateRangeFilter.start || undefined}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium whitespace-nowrap">Sort by:</Label>
            <Select value={sortBy} onValueChange={(value: 'date' | 'amount' | 'project' | 'location') => setSortBy(value)}>
              <SelectTrigger className="w-[140px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="location">Location</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-2 min-w-[120px] h-8"
          >
            {sortOrder === 'desc' ? (
              <>
                <ArrowDown className="h-3.5 w-3.5" />
                Descending
              </>
            ) : (
              <>
                <ArrowUp className="h-3.5 w-3.5" />
                Ascending
              </>
            )}
          </Button>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters() && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border">
            <span className="text-sm font-medium text-gray-700">Active filters:</span>
            
            {searchTerm && (
              <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                <span>Search: "{searchTerm}"</span>
                <button
                  onClick={() => setSearchTerm('')}
                  className="hover:bg-green-200 rounded-full p-0.5"
                  aria-label="Clear search filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {(amountFilter.min || amountFilter.max) && (
              <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                <span>
                  Amount: {amountFilter.min || '0'} - {amountFilter.max || '∞'} AED
                </span>
                <button
                  onClick={() => setAmountFilter({ min: '', max: '' })}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                  aria-label="Clear amount filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {locationFilter && locationFilter !== 'all' && (
              <div className="flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                <span>Location: {locationFilter}</span>
                <button
                  onClick={() => setLocationFilter('')}
                  className="hover:bg-purple-200 rounded-full p-0.5"
                  aria-label="Clear location filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {projectFilter && projectFilter !== 'all' && (
              <div className="flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                <span>Project: {projectFilter}</span>
                <button
                  onClick={() => setProjectFilter('')}
                  className="hover:bg-orange-200 rounded-full p-0.5"
                  aria-label="Clear project filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {(dateRangeFilter.start || dateRangeFilter.end) && (
              <div className="flex items-center gap-1 bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs">
                <span>
                  Date: {dateRangeFilter.start || 'Start'} to {dateRangeFilter.end || 'End'}
                </span>
                <button
                  onClick={() => setDateRangeFilter({ start: '', end: '' })}
                  className="hover:bg-indigo-200 rounded-full p-0.5"
                  aria-label="Clear date range filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
            >
              Clear All
            </Button>
          </div>
        )}
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
                <ModernLoadingSpinners variant="pulse-wave" className="text-green-600" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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