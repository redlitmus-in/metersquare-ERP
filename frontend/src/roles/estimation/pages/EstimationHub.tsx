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
,
  Calendar, MapPin, Building2, Eye, History,
  CheckCircle, XCircle
} from 'lucide-react';
import { EstimationApprovalCard } from '../components/EstimationApprovalCard';
import { EstimationApprovalModal } from '../components/EstimationApprovalModal';
import { PurchaseDetailsModal } from '../components/PurchaseDetailsModal';
import { estimationService } from '../services/estimationService';
import { toast } from 'sonner';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import usePurchaseStore, { startPolling, stopPolling } from '@/store/purchaseStore';

// Define Purchase type to match the store
interface Purchase {
  purchase_id: number;
  project_id: string;
  requested_by: string;
  site_location: string;
  date: string;
  purpose?: string;
  materials?: any[];
  material_details?: any[];
  material_count?: number;
  total_cost?: number;
  total_quantity?: number;
  priority?: string;
  status?: string;
  created_at?: string;
  latest_status?: {
    sender: string;
    receiver: string;
    status: string;
    timestamp?: string;
  };
  status_info?: {
    estimation_status?: string;
    sender?: string;
    receiver?: string;
    rejection_reason?: string;
    accounts_status?: string;
    completed_status?: string;
  };
  materials_summary?: {
    total_cost?: number;
  };
  project_manager_status?: string;
  estimation_status?: string;
  technical_director_status?: string;
  accounts_status?: string;
  accounts_acknowledgement?: boolean;
  acknowledgement?: boolean;
  acknowledgement_sent?: boolean;
  project_manager_rejection_reason?: string;
  estimation_rejection_reason?: string;
  technical_director_rejection_reason?: string;
  accounts_rejection_reason?: string;
  payment_details?: any;
}

// Material type for internal use
interface Material {
  material_id?: number;
  description: string;
  specification?: string;
  unit?: string;
  quantity: number;
  category?: string;
  cost?: number;
  unit_cost?: number;
  total_cost?: number;
  priority?: string;
  design_reference?: string;
}

const EstimationHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Sort and Filter states
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'priority' | 'id'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterByAmount, setFilterByAmount] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  // Additional filters like Site Supervisor has
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
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

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await storeFetchPurchases('estimation');
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  // Check for real-time status
  const isRealtime = lastFetchTime && Date.now() - lastFetchTime.getTime() < 15000;

  // Initialize real-time updates on mount
  useEffect(() => {
    // Store user role for the purchase store
    localStorage.setItem('userRole', 'estimation');

    // Setup real-time subscriptions
    setupRealtimeSubscription();

    // Start polling for updates
    startPolling('estimation');

    // Initial fetch
    storeFetchPurchases('estimation');

    // Cleanup on unmount
    return () => {
      stopPolling();
      cleanupRealtimeSubscription();
    };
  }, [setupRealtimeSubscription, cleanupRealtimeSubscription, storeFetchPurchases]);

  // Watch store purchases and update local state for role-specific data
  useEffect(() => {
    setPurchases(getPurchasesForRole('estimation'));
  }, [storePurchases, getPurchasesForRole]);

  // Calculate metrics whenever purchases change
  useEffect(() => {
    if (purchases.length > 0) {
        const allPurchases = purchases;

        // Debug logging for rejected purchases
        console.log('All purchases:', allPurchases.length);
        allPurchases.forEach(p => {
          if (p.status_info?.estimation_status === 'rejected') {
            console.log(`Purchase ${p.purchase_id} - estimation_status: ${p.status_info.estimation_status}, sender: ${p.status_info.sender}`);
          }
        });
        
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
            
            // Check for TD rejection - comprehensive check for all TD rejection indicators
            const isTDRejected = (p.status_info?.receiver === 'estimation' &&
                                 p.status_info?.sender === 'technicalDirector') ||
                                 p.technical_director_status === 'rejected' ||
                                 (p.latest_status?.sender === 'technicalDirector' &&
                                  p.latest_status?.status === 'rejected') ||
                                 (p.status_sender === 'technicalDirector' &&
                                  (p.status === 'rejected' || p.sender_latest_status === 'rejected')) ||
                                 (p.current_workflow_status === 'technical_director_rejected') ||
                                 // Additional check for TD rejection in rejected_status
                                 (p.rejected_status && p.rejection_from === 'technicalDirector') ||
                                 (p.status === 'rejected' && p.status_info?.receiver === 'estimation');

            // Debug logging to see the actual data
            if (p.purchase_id === 74 || p.purchase_id === 80) {
              console.log(`Purchase ${p.purchase_id} TD rejection check:`, {
                statusInfo: p.status_info,
                tdStatus: p.technical_director_status,
                latestStatus: p.latest_status,
                statusSender: p.status_sender,
                status: p.status,
                rejectedStatus: p.rejected_status,
                rejectionFrom: p.rejection_from,
                isTDRejected
              });
            }

            // Check if estimation rejected (regardless of who the sender is in current status)
            const isEstimationRejected = estimationStatus === 'rejected';

            // IMPORTANT: Check TD rejection FIRST before checking estimation status
            if (isTDRejected) {
              tdRejectedPurchases.push(p);
              // Don't add to pending even if estimationStatus is pending
            } else if (isEstimationRejected) {
              rejectedPurchases.push(p);
            } else if (estimationStatus === 'approved') {
              approvedPurchases.push(p);
            } else if (estimationStatus === 'pending' ||
                      (estimationStatus === 'approved' && p.status_receiver === 'estimation' && !p.technical_director_status) ||
                      (!estimationStatus && p.status_receiver === 'estimation')) {
              // Include as pending if:
              // - estimation status is pending
              // - estimation approved but now back for review (but not TD rejected)
              // - no estimation status but receiver is estimation
              pendingPurchases.push(p);
            }
          }
        });
        
        // Calculate total value across ALL purchases (pending, approved, rejected, td-rejected)
        const totalValue = purchases.reduce((sum, p) => {
          const cost = p.total_cost || 
                      p.materials_summary?.total_cost || 
                      (p.materials ? p.materials.reduce((matSum, mat) => matSum + ((mat.cost || mat.unit_cost || 0) * mat.quantity), 0) : 0);
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
    }
  }, [purchases]);

  // Helper function to get purchase amount
  const getPurchaseAmount = (purchase: Purchase) => {
    return purchase.total_cost || 
           purchase.materials_summary?.total_cost || 
           (purchase.materials ? purchase.materials.reduce((sum, mat) => sum + ((mat.cost || mat.unit_cost || 0) * mat.quantity), 0) : 0);
  };

  // Helper function to get purchase priority
  const getPurchasePriority = (purchase: Purchase) => {
    if (!purchase.materials || purchase.materials.length === 0) return 'medium';
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

          // Exclude TD rejected purchases from pending tab - comprehensive check
          const isTDRejected = (p.status_info?.receiver === 'estimation' &&
                               p.status_info?.sender === 'technicalDirector') ||
                              p.technical_director_status === 'rejected' ||
                              (p.latest_status?.sender === 'technicalDirector' &&
                               p.latest_status?.status === 'rejected') ||
                              (p.status_sender === 'technicalDirector' &&
                               (p.status === 'rejected' || p.sender_latest_status === 'rejected')) ||
                              (p.current_workflow_status === 'technical_director_rejected');
          if (isTDRejected) return false;

          const estimationStatus = p.status_info?.estimation_status?.toLowerCase();
          // Include as pending if no status yet or status is pending
          return estimationStatus === 'pending' ||
                 (!estimationStatus && p.status_receiver === 'estimation');
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
          // Show any purchase where estimation status is rejected, regardless of sender
          // This includes purchases that estimation has rejected (either sent back to procurement or PM)
          return estimationStatus === 'rejected';
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

          // Show purchases rejected by TD - comprehensive check
          return (p.status_info?.receiver === 'estimation' &&
                  p.status_info?.sender === 'technicalDirector') ||
                 p.technical_director_status === 'rejected' ||
                 (p.latest_status?.sender === 'technicalDirector' &&
                  p.latest_status?.status === 'rejected') ||
                 (p.status_sender === 'technicalDirector' &&
                  (p.status === 'rejected' || p.sender_latest_status === 'rejected')) ||
                 (p.current_workflow_status === 'technical_director_rejected');
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

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => {
        const purchaseId = p.purchase_id ? p.purchase_id.toString() : '';
        const purpose = p.purpose || '';
        const siteLocation = p.site_location || '';
        const projectId = p.project_id ? p.project_id.toString() : '';
        const requestedBy = p.requested_by || '';
        
        const matchesBasicFields = 
          purchaseId.includes(search) ||
          purpose.toLowerCase().includes(search) ||
          siteLocation.toLowerCase().includes(search) ||
          projectId.toLowerCase().includes(search) ||
          requestedBy.toLowerCase().includes(search);
        
        const matchesMaterials = p.materials?.some(m => {
          const description = m.description || '';
          const category = m.category || '';
          return description.toLowerCase().includes(search) || 
                 category.toLowerCase().includes(search);
        }) || false;
        
        return matchesBasicFields || matchesMaterials;
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter(p => p.project_id?.toString() === projectFilter);
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

    // Debug logging for filtered results
    if (activeTab === 'rejected') {
      console.log(`Rejected tab filtering: ${filtered.length} purchases found`);
      filtered.forEach(p => {
        console.log(`- Purchase ${p.purchase_id}: estimation_status=${p.status_info?.estimation_status}, sender=${p.status_info?.sender}`);
      });
    }

    setFilteredPurchases(filtered);
  }, [purchases, activeTab, sortBy, sortOrder, filterByAmount, filterByPriority, filterByCategory, searchTerm, statusFilter, projectFilter, locationFilter, dateFilter]);

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
    await storeFetchPurchases('estimation');
    
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
    setSearchTerm('');
    setStatusFilter('all');
    setProjectFilter('all');
    setLocationFilter('all');
    setDateFilter('all');
  };

  // Check if any filters are active
  const hasActiveFilters = sortBy !== 'date' || sortOrder !== 'desc' || filterByAmount !== 'all' || filterByPriority !== 'all' || filterByCategory !== 'all' || searchTerm !== '' || statusFilter !== 'all' || projectFilter !== 'all' || locationFilter !== 'all' || dateFilter !== 'all';
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

      {/* Search and Filter Bar */}
      <div className="space-y-4 mb-6">
        {/* Search Bar and Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by PR#, purpose, location, project, or material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={hasActiveFilters ? "default" : "outline"}
              className={hasActiveFilters ? "bg-red-600 hover:bg-red-700" : ""}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 bg-white text-red-600">
                  Active
                </Badge>
              )}
            </Button>
            <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">
                  <span className="flex items-center gap-2">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    Newest First
                  </span>
                </SelectItem>
                <SelectItem value="asc">
                  <span className="flex items-center gap-2">
                    <ArrowUpDown className="h-3.5 w-3.5 rotate-180" />
                    Oldest First
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
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
                        {availableProjects.map(project => (
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
                        {availableLocations.map(location => (
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
                {hasActiveFilters && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={() => {
                        setStatusFilter('all');
                        setProjectFilter('all');
                        setLocationFilter('all');
                        setDateFilter('all');
                      }}
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="w-full overflow-x-auto">
          <TabsList className="grid w-full grid-cols-5 h-auto max-w-full">
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