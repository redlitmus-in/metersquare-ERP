/**
 * Technical Director Hub Page
 * Main workspace for Technical Director to review and approve/reject purchases
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw, Search, Shield,
  CheckSquare, XSquare, Clock, TrendingUp,
  DollarSign, FileText, BarChart3, AlertCircle,
  Filter, X, Building2, MapPin, Package
} from 'lucide-react';
import TechnicalDirectorApprovalCard from '../components/TechnicalDirectorApprovalCard';
import TechnicalDirectorApprovalModal from '../components/TechnicalDirectorApprovalModal';
import PurchaseDetailsModal from '../components/PurchaseDetailsModal';
import { Purchase, technicalDirectorService } from '../services/technicalDirectorService';
import { toast } from 'sonner';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import usePurchaseStore, { startPolling, stopPolling } from '@/store/purchaseStore';

// Import new UI components
import DataTableView from '@/components/ui/DataTableView';
import KanbanView from '@/components/ui/KanbanView';
import SplitView from '@/components/ui/SplitView';
import BentoGrid, { BentoGridPresets } from '@/components/ui/BentoGrid';
import ViewToggle, { ViewType } from '@/components/ui/ViewToggle';

const TechnicalDirectorHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [viewType, setViewType] = useState<ViewType>('cards');

  // Use centralized store for real-time updates
  const {
    purchases: storePurchases,
    isLoading,
    lastFetchTime,
    fetchPurchases: storeFetchPurchases,
    setupRealtimeSubscription,
    cleanupRealtimeSubscription,
    getPurchasesForRole
  } = usePurchaseStore();

  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Search and Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  // Modal states
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [modalMode, setModalMode] = useState<'approve' | 'reject'>('approve');

  // Metrics
  const [metrics, setMetrics] = useState({
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    completedCount: 0,
    totalValue: 0,
    avgProcessingTime: 0,
    totalQuantity: 0
  });

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await storeFetchPurchases('technicalDirector');
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  // Check for real-time status
  const isRealtime = lastFetchTime && Date.now() - lastFetchTime.getTime() < 15000;

  // Initialize real-time updates on mount
  useEffect(() => {
    // Store user role for the purchase store
    localStorage.setItem('userRole', 'technicalDirector');

    // Setup real-time subscriptions
    setupRealtimeSubscription();

    // Start polling for updates
    startPolling('technicalDirector');

    // Initial fetch
    storeFetchPurchases('technicalDirector');

    // Cleanup on unmount
    return () => {
      stopPolling();
      cleanupRealtimeSubscription();
    };
  }, [setupRealtimeSubscription, cleanupRealtimeSubscription, storeFetchPurchases]);

  // Watch store purchases and update local state for role-specific data
  useEffect(() => {
    setPurchases(getPurchasesForRole('technicalDirector'));
  }, [storePurchases, getPurchasesForRole]);

  // Calculate metrics whenever purchases change
  useEffect(() => {
    if (purchases.length > 0) {
        
        // Calculate metrics based on actual technical_director_status in each purchase
        let pendingPurchases: Purchase[] = [];
        let approvedPurchases: Purchase[] = [];
        let rejectedPurchases: Purchase[] = [];
        let completedPurchases: Purchase[] = [];

        purchases.forEach(p => {
          // Check if purchase is completed (accounts has acknowledged)
          const isCompleted = p.latest_status?.status === 'completed' || 
                             p.latest_status?.status === 'complete' ||
                             p.accounts_acknowledgement === true;
          
          if (isCompleted) {
            completedPurchases.push(p);
          } else {
            // Check technical_director_status field directly
            const tdStatus = p.technical_director_status?.toLowerCase();
            
            if (tdStatus === 'pending' || !tdStatus) {
              // Also check if estimation approved (TD is next)
              if (p.estimation_status === 'approved') {
                pendingPurchases.push(p);
              }
            } else if (tdStatus === 'approved') {
              approvedPurchases.push(p);
            } else if (tdStatus === 'rejected') {
              rejectedPurchases.push(p);
            }
          }
        });
        
        const pendingValue = pendingPurchases.reduce((sum, p) => 
          sum + (p.total_cost || 0), 0
        );
        
        const totalQuantity = pendingPurchases.reduce((sum, p) => 
          sum + (p.total_quantity || 0), 0
        );

        setMetrics({
          pendingCount: pendingPurchases.length,
          approvedCount: approvedPurchases.length,
          rejectedCount: rejectedPurchases.length,
        completedCount: completedPurchases.length,
        totalValue: pendingValue,
        avgProcessingTime: 0,
        totalQuantity: totalQuantity
      });
    }
  }, [purchases]);

  // Filter purchases based on tab and search
  useEffect(() => {
    let filtered = [...purchases];

    // Tab filter - Check technical_director_status field and completion status
    switch (activeTab) {
      case 'pending':
        // Show purchases where TD hasn't acted yet and estimation approved (exclude completed)
        filtered = purchases.filter(p => {
          const isCompleted = p.latest_status?.status === 'completed' || 
                             p.latest_status?.status === 'complete' ||
                             p.accounts_acknowledgement === true;
          if (isCompleted) return false;
          
          const tdStatus = p.technical_director_status?.toLowerCase();
          const estimationStatus = p.estimation_status?.toLowerCase();
          return (!tdStatus || tdStatus === 'pending') && estimationStatus === 'approved';
        });
        break;
        
      case 'approved':
        // Show purchases where technical_director_status is approved (exclude completed)
        filtered = purchases.filter(p => {
          const isCompleted = p.latest_status?.status === 'completed' || 
                             p.latest_status?.status === 'complete' ||
                             p.accounts_acknowledgement === true;
          if (isCompleted) return false;
          
          const tdStatus = p.technical_director_status?.toLowerCase();
          return tdStatus === 'approved';
        });
        break;
        
      case 'rejected':
        // Show purchases where technical_director_status is rejected (exclude completed)
        filtered = purchases.filter(p => {
          const isCompleted = p.latest_status?.status === 'completed' || 
                             p.latest_status?.status === 'complete' ||
                             p.accounts_acknowledgement === true;
          if (isCompleted) return false;
          
          const tdStatus = p.technical_director_status?.toLowerCase();
          return tdStatus === 'rejected';
        });
        break;
        
      case 'completed':
        // Show completed purchases only
        filtered = purchases.filter(p => {
          const isCompleted = p.latest_status?.status === 'completed' || 
                             p.latest_status?.status === 'complete' ||
                             p.accounts_acknowledgement === true;
          return isCompleted;
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

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => {
        const status = p.technical_director_status?.toLowerCase() || 'pending';
        return status === statusFilter;
      });
    }

    // Project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter(p => p.project_id === projectFilter);
    }

    // Location filter  
    if (locationFilter !== 'all') {
      filtered = filtered.filter(p => p.site_location === locationFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = (date: string) => {
        const purchaseDate = new Date(date);
        switch (dateFilter) {
          case 'today':
            return purchaseDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return purchaseDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return purchaseDate >= monthAgo;
          case 'quarter':
            const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            return purchaseDate >= quarterAgo;
          default:
            return true;
        }
      };
      filtered = filtered.filter(p => filterDate(p.date || p.created_at));
    }

    // Apply sorting - prioritize most recent activity
    filtered.sort((a, b) => {
      // For sorting, use the most recent date available:
      // 1. latest_status.date (if exists) - shows most recent approval/action
      // 2. last_modified_at (if exists) - shows recent edits
      // 3. created_at (if exists)
      // 4. date (fallback)
      
      const getMostRecentDate = (purchase: Purchase) => {
        // If there's a latest status with date, use it (most recent workflow action)
        if (purchase.latest_status?.date) {
          return new Date(purchase.latest_status.date).getTime();
        }
        // If last modified, use it (recent edits/updates)
        if (purchase.last_modified_at) {
          return new Date(purchase.last_modified_at).getTime();
        }
        // If created at, use it
        if (purchase.created_at) {
          return new Date(purchase.created_at).getTime();
        }
        // Fallback to date field
        return new Date(purchase.date).getTime();
      };
      
      const dateA = getMostRecentDate(a);
      const dateB = getMostRecentDate(b);
      
      // Sort by most recent first (newest activity at top)
      return dateB - dateA;
    });

    setFilteredPurchases(filtered);
  }, [purchases, activeTab, searchTerm, statusFilter, projectFilter, locationFilter, dateFilter]);

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
    const purchase = purchases.find(p => p.purchase_id === purchaseId);
    if (purchase) {
      setSelectedPurchase(purchase);
      setSelectedPurchaseId(purchaseId);
      setDetailsModalOpen(true);
    }
  };

  // Handle view history button click
  const handleViewHistory = (purchaseId: number) => {
    const purchase = purchases.find(p => p.purchase_id === purchaseId);
    if (purchase) {
      setSelectedPurchase(purchase);
      setSelectedPurchaseId(purchaseId);
      setHistoryModalOpen(true);
    }
  };

  // Handle success after approval/rejection
  const handleApprovalSuccess = async () => {
    // Wait for backend to properly update
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Refresh the list to get updated data
    await storeFetchPurchases('technicalDirector');

    // Move to appropriate tab after action
    if (modalMode === 'approve') {
      setActiveTab('approved');
      toast.success('Purchase approved successfully');
    } else if (modalMode === 'reject') {
      setActiveTab('rejected');
      toast.success('Purchase rejected successfully');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString()}`;
  };

  // Helper functions for filters
  const getUniqueProjects = () => {
    const projects = purchases
      .map(p => p.project_id)
      .filter((project, index, self) => 
        project && self.indexOf(project) === index
      );
    return projects;
  };

  const getUniqueLocations = () => {
    const locations = purchases
      .map(p => p.site_location)
      .filter((location, index, self) => 
        location && self.indexOf(location) === index
      );
    return locations;
  };

  const hasActiveFilters = () => {
    return statusFilter !== 'all' || 
           projectFilter !== 'all' || 
           locationFilter !== 'all' || 
           dateFilter !== 'all';
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setProjectFilter('all');
    setLocationFilter('all');
    setDateFilter('all');
  };

  // Show loading state
  if (isLoading && purchases.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <ModernLoadingSpinners variant="pulse-wave" size="lg" />
          <p className="text-sm text-gray-600">Loading purchases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header - Responsive */}
      <div className="mb-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#243d8a]/5 to-[#243d8a]/10 rounded-xl shadow-xl p-6 border border-[#243d8a]/20"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#243d8a] rounded-lg shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#243d8a]">Technical Director Hub</h1>
              <p className="text-[#243d8a]/80 mt-1">Review and approve technical specifications</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Metrics Display - BentoGrid */}
      <div className="mb-6">
        <BentoGrid
          items={[
            {
              id: 'pending',
              title: 'Pending Review',
              value: metrics.pendingCount,
              subtitle: 'Awaiting approval',
              icon: Clock,
              color: 'indigo',
              size: 'medium',
              change: metrics.pendingCount > 0 ? 5 : 0,
              changeType: 'increase' as const,
              details: [
                { label: 'Today', value: Math.floor(metrics.pendingCount * 0.3) },
                { label: 'This Week', value: metrics.pendingCount }
              ]
            },
            {
              id: 'approved',
              title: 'Approved',
              value: metrics.approvedCount,
              subtitle: 'Sent to Accounts',
              icon: CheckSquare,
              color: 'green',
              change: 12,
              changeType: 'increase' as const
            },
            {
              id: 'rejected',
              title: 'Rejected',
              value: metrics.rejectedCount,
              subtitle: 'Sent back',
              icon: XSquare,
              color: 'red',
              change: 3,
              changeType: 'decrease' as const
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <p className="text-lg font-bold text-red-600">{metrics.rejectedCount}</p>
            <p className="text-xs text-gray-500 truncate">Sent back</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-1 px-3">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-green-500 flex-shrink-0" />
              <span className="truncate">Total Value</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <p className="text-sm font-bold text-green-600 truncate">
              {formatCurrency(metrics.totalValue)}
            </p>
            <p className="text-xs text-gray-500 truncate">Pending value</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-1 px-3">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-purple-500 flex-shrink-0" />
              <span className="truncate">Total Quantity</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <p className="text-lg font-bold text-purple-600">{metrics.totalQuantity}</p>
            <p className="text-xs text-gray-500 truncate">Pending items</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar with Filters */}
      <div className="mb-4 sm:mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 lg:max-w-2xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <Input
              placeholder="Search purchases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base bg-white border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className={`flex items-center gap-2 ${showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : ''}`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters() && (
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 text-xs px-1.5 py-0.5 ml-1">
                  {[statusFilter, projectFilter, locationFilter, dateFilter].filter(f => f !== 'all').length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <Card className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Project Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Project</label>
                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Projects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {getUniqueProjects().map(project => (
                          <SelectItem key={project} value={project}>
                            <span className="flex items-center gap-2">
                              <Building2 className="h-3 w-3" />
                              Project {project}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Location</label>
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {getUniqueLocations().map(location => (
                          <SelectItem key={location} value={location}>
                            <span className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              {location}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Date Range</label>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">Last 7 Days</SelectItem>
                        <SelectItem value="month">Last 30 Days</SelectItem>
                        <SelectItem value="quarter">Last 90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters() && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={clearFilters}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tabs - Responsive */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="grid w-full min-w-[360px] max-w-none lg:max-w-3xl grid-cols-4 bg-gray-100 h-auto">
            <TabsTrigger 
              value="pending" 
              className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-indigo-600 text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap"
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
            <TabsTrigger 
              value="completed" 
              className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap"
            >
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden xs:inline">Completed</span>
              <span className="text-[10px] xs:text-xs sm:text-sm">({metrics.completedCount})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <ModernLoadingSpinners variant="pulse-wave" size="lg" />
                <p className="text-sm text-gray-600">Loading purchases...</p>
              </div>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
                <p className="text-base sm:text-lg font-medium text-gray-900">No purchases found</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 text-center px-4">
                  {searchTerm 
                    ? 'Try adjusting your search criteria'
                    : 'No purchases require technical review at this time'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <AnimatePresence mode="popLayout">
                {filteredPurchases.map((purchase) => (
                  <TechnicalDirectorApprovalCard
                    key={purchase.purchase_id}
                    purchase={purchase}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onViewDetails={handleViewDetails}
                    onViewHistory={handleViewHistory}
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
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <ModernLoadingSpinners variant="pulse-wave" size="lg" />
                <p className="text-sm text-gray-600">Loading purchases...</p>
              </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <AnimatePresence mode="popLayout">
                {filteredPurchases.map((purchase) => (
                  <TechnicalDirectorApprovalCard
                    key={purchase.purchase_id}
                    purchase={purchase}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onViewDetails={handleViewDetails}
                    onViewHistory={handleViewHistory}
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
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <ModernLoadingSpinners variant="pulse-wave" size="lg" />
                <p className="text-sm text-gray-600">Loading purchases...</p>
              </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <AnimatePresence mode="popLayout">
                {filteredPurchases.map((purchase) => (
                  <TechnicalDirectorApprovalCard
                    key={purchase.purchase_id}
                    purchase={purchase}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onViewDetails={handleViewDetails}
                    onViewHistory={handleViewHistory}
                    isLoading={isLoading}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <ModernLoadingSpinners variant="pulse-wave" size="lg" />
                <p className="text-sm text-gray-600">Loading purchases...</p>
              </div>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-blue-500 mb-3 sm:mb-4" />
                <p className="text-base sm:text-lg font-medium text-gray-900">No completed purchases</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 text-center px-4">
                  Completed purchases will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <AnimatePresence mode="popLayout">
                {filteredPurchases.map((purchase) => (
                  <TechnicalDirectorApprovalCard
                    key={purchase.purchase_id}
                    purchase={purchase}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onViewDetails={handleViewDetails}
                    onViewHistory={handleViewHistory}
                    isLoading={isLoading}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approval/Rejection Modal */}
      <TechnicalDirectorApprovalModal
        isOpen={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        purchaseId={selectedPurchaseId}
        mode={modalMode}
        onSuccess={handleApprovalSuccess}
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
      
      {/* Purchase History Modal */}
      <PurchaseDetailsModal
        isOpen={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setSelectedPurchase(null);
        }}
        purchaseId={selectedPurchaseId}
        showHistoryOnly={true}
      />
    </div>
  );
};

export default TechnicalDirectorHub;