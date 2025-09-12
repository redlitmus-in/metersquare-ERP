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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, Search, Filter, Calculator, 
  CheckSquare, XSquare, Clock, TrendingUp,
  DollarSign, FileText, BarChart3, AlertCircle,
  ArrowUpDown, ArrowUp, ArrowDown, X
} from 'lucide-react';
import { EstimationApprovalCard } from '../components/EstimationApprovalCard';
import { EstimationApprovalModal } from '../components/EstimationApprovalModal';
import { PurchaseDetailsModal } from '../components/PurchaseDetailsModal';
import { Purchase, estimationService } from '../services/estimationService';
import { toast } from 'sonner';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';

const EstimationHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sort and Filter states
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'priority' | 'id'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterByAmount, setFilterByAmount] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [filterByPriority, setFilterByPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [filterByCategory, setFilterByCategory] = useState<string>('all');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  
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
    tdRejectedCount: 0,
    completedCount: 0,
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
        
        // Extract unique categories from all purchases
        const categories = new Set<string>();
        allPurchases.forEach(purchase => {
          if (purchase.materials) {
            purchase.materials.forEach(material => {
              if (material.category) {
                categories.add(material.category);
              }
            });
          }
        });
        setAvailableCategories(Array.from(categories).sort());
        
        // Calculate metrics based on actual estimation status in each purchase
        let pendingPurchases: Purchase[] = [];
        let approvedPurchases: Purchase[] = [];
        let rejectedPurchases: Purchase[] = [];
        let tdRejectedPurchases: Purchase[] = [];
        let completedPurchases: Purchase[] = [];
        
        allPurchases.forEach(p => {
          // Check if purchase is completed (accounts has acknowledged or status is complete)
          const isCompleted = p.latest_status?.status === 'completed' || 
                             p.latest_status?.status === 'complete' ||
                             p.status_info?.completed_status === 'completed' ||
                             p.accounts_acknowledgement === true ||
                             (p.status_info?.receiver === 'accounts' && p.status_info?.accounts_status === 'approved') ||
                             (p.status_info?.sender === 'accounts' && p.status_info?.status === 'approved');
          
          
          if (isCompleted) {
            completedPurchases.push(p);
          } else {
            // Check estimation_status field directly from status_info
            const estimationStatus = p.status_info?.estimation_status?.toLowerCase();
            
            // Check for TD rejection - when receiver is estimation and sender is technicalDirector
            // This happens when TD rejects and sends back to estimation
            const isTDRejected = p.status_info?.receiver === 'estimation' && 
                                p.status_info?.sender === 'technicalDirector';
            
            // Check if estimation itself rejected (not TD rejection)
            const isEstimationRejected = estimationStatus === 'rejected' && 
                                         p.status_info?.sender === 'estimation';
            
            if (isTDRejected) {
              tdRejectedPurchases.push(p);
            } else if (estimationStatus === 'pending') {
              pendingPurchases.push(p);
            } else if (estimationStatus === 'approved') {
              approvedPurchases.push(p);
            } else if (isEstimationRejected) {
              rejectedPurchases.push(p);
            }
          }
        });
        
        // Calculate total value across ALL purchases (pending, approved, rejected, td-rejected)
        const totalValue = purchases.reduce((sum, p) => {
          const cost = p.total_cost || 
                      p.materials_summary?.total_cost || 
                      (p.materials ? p.materials.reduce((matSum, mat) => matSum + (mat.cost * mat.quantity), 0) : 0);
          return sum + cost;
        }, 0);
        
        // Calculate total quantity across ALL purchases
        const totalQuantity = purchases.reduce((sum, p) => {
          const quantity = p.total_quantity || 
                          (p.materials ? p.materials.reduce((matSum, mat) => matSum + mat.quantity, 0) : 0);
          return sum + quantity;
        }, 0);


        setMetrics({
          pendingCount: pendingPurchases.length,
          approvedCount: approvedPurchases.length,
          rejectedCount: rejectedPurchases.length,
          tdRejectedCount: tdRejectedPurchases.length,
          completedCount: completedPurchases.length,
          totalValue: totalValue,
          avgProcessingTime: 0,
          totalQuantity: totalQuantity,
          costRejections: rejectedPurchases.filter(p => p.status_info?.rejection_reason?.includes('cost')).length,
          pmFlagRejections: rejectedPurchases.filter(p => p.status_info?.rejection_reason?.includes('PM')).length
        });
      } else {
        setPurchases([]);
        setMetrics({
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
          tdRejectedCount: 0,
          completedCount: 0,
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
        tdRejectedCount: 0,
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

  // Helper function to get purchase amount
  const getPurchaseAmount = (purchase: Purchase) => {
    return purchase.total_cost || 
           purchase.materials_summary?.total_cost || 
           (purchase.materials ? purchase.materials.reduce((sum, mat) => sum + (mat.cost * mat.quantity), 0) : 0);
  };

  // Helper function to get purchase priority
  const getPurchasePriority = (purchase: Purchase) => {
    if (!purchase.materials || purchase.materials.length === 0) return 'medium';
    
    // Find highest priority material
    const priorities = purchase.materials.map(m => m.priority?.toLowerCase()).filter(Boolean);
    if (priorities.includes('high')) return 'high';
    if (priorities.includes('medium')) return 'medium';
    if (priorities.includes('low')) return 'low';
    return 'medium'; // default
  };

  // Filter and sort purchases based on tab, filters, and search
  useEffect(() => {
    let filtered = [...purchases];


    // Tab filter - Check estimation_status field from status_info and completion status
    switch (activeTab) {
      case 'pending':
        filtered = purchases.filter(p => {
          const isCompleted = p.latest_status?.status === 'completed' || 
                             p.latest_status?.status === 'complete' ||
                             p.status_info?.completed_status === 'completed' ||
                             p.accounts_acknowledgement === true ||
                             (p.status_info?.receiver === 'accounts' && p.status_info?.accounts_status === 'approved') ||
                             (p.status_info?.sender === 'accounts' && p.status_info?.status === 'approved');
          if (isCompleted) return false;
          
          const estimationStatus = p.status_info?.estimation_status?.toLowerCase();
          return estimationStatus === 'pending';
        });
        break;
        
      case 'approved':
        filtered = purchases.filter(p => {
          const isCompleted = p.latest_status?.status === 'completed' || 
                             p.latest_status?.status === 'complete' ||
                             p.status_info?.completed_status === 'completed' ||
                             p.accounts_acknowledgement === true ||
                             (p.status_info?.receiver === 'accounts' && p.status_info?.accounts_status === 'approved') ||
                             (p.status_info?.sender === 'accounts' && p.status_info?.status === 'approved');
          if (isCompleted) return false;
          
          const estimationStatus = p.status_info?.estimation_status?.toLowerCase();
          return estimationStatus === 'approved';
        });
        break;
        
      case 'rejected':
        filtered = purchases.filter(p => {
          const isCompleted = p.latest_status?.status === 'completed' || 
                             p.latest_status?.status === 'complete' ||
                             p.status_info?.completed_status === 'completed' ||
                             p.accounts_acknowledgement === true ||
                             (p.status_info?.receiver === 'accounts' && p.status_info?.accounts_status === 'approved') ||
                             (p.status_info?.sender === 'accounts' && p.status_info?.status === 'approved');
          if (isCompleted) return false;
          
          const estimationStatus = p.status_info?.estimation_status?.toLowerCase();
          const isEstimationRejected = estimationStatus === 'rejected' && 
                                       p.status_info?.sender === 'estimation';
          return isEstimationRejected;
        });
        break;
        
      case 'td-rejected':
        filtered = purchases.filter(p => {
          const isCompleted = p.latest_status?.status === 'completed' || 
                             p.latest_status?.status === 'complete' ||
                             p.status_info?.completed_status === 'completed' ||
                             p.accounts_acknowledgement === true ||
                             (p.status_info?.receiver === 'accounts' && p.status_info?.accounts_status === 'approved') ||
                             (p.status_info?.sender === 'accounts' && p.status_info?.status === 'approved');
          if (isCompleted) return false;
          
          return p.status_info?.receiver === 'estimation' && 
                 p.status_info?.sender === 'technicalDirector';
        });
        break;
        
      case 'completed':
        filtered = purchases.filter(p => {
          const isCompleted = p.latest_status?.status === 'completed' || 
                             p.latest_status?.status === 'complete' ||
                             p.status_info?.completed_status === 'completed' ||
                             p.accounts_acknowledgement === true ||
                             (p.status_info?.receiver === 'accounts' && p.status_info?.accounts_status === 'approved') ||
                             (p.status_info?.sender === 'accounts' && p.status_info?.status === 'approved');
          return isCompleted;
        });
        break;
    }

    // Amount filter
    if (filterByAmount !== 'all') {
      filtered = filtered.filter(p => {
        const amount = getPurchaseAmount(p);
        switch (filterByAmount) {
          case 'low': return amount < 5000;
          case 'medium': return amount >= 5000 && amount < 25000;
          case 'high': return amount >= 25000;
          default: return true;
        }
      });
    }

    // Priority filter
    if (filterByPriority !== 'all') {
      filtered = filtered.filter(p => getPurchasePriority(p) === filterByPriority);
    }

    // Category filter
    if (filterByCategory !== 'all') {
      filtered = filtered.filter(p => {
        return p.materials?.some(m => m.category === filterByCategory) || false;
      });
    }


    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date || a.created_at || '').getTime();
          bValue = new Date(b.date || b.created_at || '').getTime();
          break;
        case 'amount':
          aValue = getPurchaseAmount(a);
          bValue = getPurchaseAmount(b);
          break;
        case 'priority':
          const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          aValue = priorityOrder[getPurchasePriority(a) as keyof typeof priorityOrder];
          bValue = priorityOrder[getPurchasePriority(b) as keyof typeof priorityOrder];
          break;
        case 'id':
          aValue = a.purchase_id;
          bValue = b.purchase_id;
          break;
        default:
          aValue = a.purchase_id;
          bValue = b.purchase_id;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredPurchases(filtered);
  }, [purchases, activeTab, sortBy, sortOrder, filterByAmount, filterByPriority, filterByCategory]);

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

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSortBy('date');
    setSortOrder('desc');
    setFilterByAmount('all');
    setFilterByPriority('all');
    setFilterByCategory('all');
  };

  // Check if any filters are active
  const hasActiveFilters = sortBy !== 'date' || sortOrder !== 'desc' || 
                          filterByAmount !== 'all' || filterByPriority !== 'all' || 
                          filterByCategory !== 'all';

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
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#243d8a]">Estimation Hub</h1>
              <p className="text-[#243d8a]/80 mt-1">Review and analyze cost implications</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Metrics Cards - Compact Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3 mb-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-1 px-3 pt-3">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-500 flex-shrink-0" />
              <span className="truncate">Pending Review</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <p className="text-lg sm:text-xl font-bold text-amber-600">{metrics.pendingCount}</p>
            <p className="text-xs text-gray-500 truncate">Awaiting analysis</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-1 px-3 pt-3">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <CheckSquare className="h-3 w-3 text-green-500 flex-shrink-0" />
              <span className="truncate">Approved</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <p className="text-lg sm:text-xl font-bold text-green-600">{metrics.approvedCount}</p>
            <p className="text-xs text-gray-500 truncate">Sent to TD</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-1 px-3 pt-3">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <XSquare className="h-3 w-3 text-red-500 flex-shrink-0" />
              <span className="truncate">Rejected</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <p className="text-lg sm:text-xl font-bold text-red-600">{metrics.rejectedCount}</p>
            <div className="text-xs text-gray-500 space-y-0.5">
              <p className="truncate">Cost: {metrics.costRejections}</p>
              <p className="truncate">PM Flag: {metrics.pmFlagRejections}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-1 px-3 pt-3">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-orange-500 flex-shrink-0" />
              <span className="truncate">TD Rejected</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <p className="text-lg sm:text-xl font-bold text-orange-600">{metrics.tdRejectedCount}</p>
            <p className="text-xs text-gray-500 truncate">Sent back by TD</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-1 px-3 pt-3">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-green-500 flex-shrink-0" />
              <span className="truncate">Total Value</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <p className="text-sm sm:text-base font-bold text-green-600 truncate">
              {formatCurrency(metrics.totalValue)}
            </p>
            <p className="text-xs text-gray-500 truncate">Pending value</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-1 px-3 pt-3">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-purple-500 flex-shrink-0" />
              <span className="truncate">Total Quantity</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <p className="text-lg sm:text-xl font-bold text-purple-600">{metrics.totalQuantity}</p>
            <p className="text-xs text-gray-500 truncate">Pending items</p>
          </CardContent>
        </Card>
      </div>

      {/* Sort and Filter Controls */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Sort and Filter Row */}
          <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Sort:</span>
              <Select value={sortBy} onValueChange={(value: 'date' | 'amount' | 'priority' | 'id') => setSortBy(value)}>
                <SelectTrigger className="w-32 h-9 bg-white border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="id">ID</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSortOrder}
                className="h-9 w-9 p-0 border-gray-200"
              >
                {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
            </div>

            {/* Amount Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Amount:</span>
              <Select value={filterByAmount} onValueChange={(value: 'all' | 'low' | 'medium' | 'high') => setFilterByAmount(value)}>
                <SelectTrigger className="w-28 h-9 bg-white border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="low">&lt; 5K</SelectItem>
                  <SelectItem value="medium">5K - 25K</SelectItem>
                  <SelectItem value="high">&gt; 25K</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Priority:</span>
              <Select value={filterByPriority} onValueChange={(value: 'all' | 'low' | 'medium' | 'high') => setFilterByPriority(value)}>
                <SelectTrigger className="w-24 h-9 bg-white border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            {availableCategories.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">Category:</span>
                <Select value={filterByCategory} onValueChange={setFilterByCategory}>
                  <SelectTrigger className="w-32 h-9 bg-white border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {availableCategories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="h-9 text-sm border-gray-200 text-gray-600 hover:text-gray-800"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs text-gray-500 font-medium">Active filters:</span>
            {sortBy !== 'date' && (
              <Badge variant="secondary" className="text-xs">
                Sort: {sortBy} {sortOrder === 'asc' ? '↑' : '↓'}
              </Badge>
            )}
            {sortOrder !== 'desc' && sortBy === 'date' && (
              <Badge variant="secondary" className="text-xs">
                Sort: oldest first
              </Badge>
            )}
            {filterByAmount !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Amount: {filterByAmount === 'low' ? '< 5K' : filterByAmount === 'medium' ? '5K-25K' : '> 25K'}
              </Badge>
            )}
            {filterByPriority !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Priority: {filterByPriority}
              </Badge>
            )}
            {filterByCategory !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Category: {filterByCategory}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Tabs - Responsive */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="grid w-full min-w-[400px] max-w-none lg:max-w-4xl grid-cols-5 bg-gray-100 h-auto">
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
            <TabsTrigger 
              value="td-rejected" 
              className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-orange-600 text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap"
            >
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden xs:inline">TD Rejected</span>
              <span className="text-[10px] xs:text-xs sm:text-sm">({metrics.tdRejectedCount})</span>
            </TabsTrigger>
            <TabsTrigger 
              value="completed" 
              className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-green-600 text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap"
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
            <div className="flex justify-center items-center py-12">
              <ModernLoadingSpinners variant="pulse-wave" size="lg" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <AnimatePresence mode="popLayout">
                {filteredPurchases.map((purchase) => (
                  <EstimationApprovalCard
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
            <div className="flex justify-center items-center py-12">
              <ModernLoadingSpinners variant="pulse-wave" size="lg" />
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
                  <EstimationApprovalCard
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
            <div className="flex justify-center items-center py-12">
              <ModernLoadingSpinners variant="pulse-wave" size="lg" />
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
                  <EstimationApprovalCard
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

        {/* TD Rejected Tab */}
        <TabsContent value="td-rejected" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <ModernLoadingSpinners variant="pulse-wave" size="lg" />
            </div>
          ) : filteredPurchases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-orange-500 mb-3 sm:mb-4" />
                <p className="text-base sm:text-lg font-medium text-gray-900">No TD rejected purchases</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 text-center px-4">
                  Purchases rejected by Technical Director will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <AnimatePresence mode="popLayout">
                {filteredPurchases.map((purchase) => (
                  <EstimationApprovalCard
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
            <div className="flex justify-center items-center py-12">
              <ModernLoadingSpinners variant="pulse-wave" size="lg" />
            </div>
          ) : filteredPurchases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-green-500 mb-3 sm:mb-4" />
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
                  <EstimationApprovalCard
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

export default EstimationHub;