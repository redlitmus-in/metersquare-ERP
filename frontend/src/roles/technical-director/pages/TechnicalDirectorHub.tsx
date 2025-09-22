/**
 * Technical Director Hub Page
 * Main workspace for Technical Director to review and approve/reject purchases
 * Updated with new UI alternatives (DataTable, Kanban, Split View, BentoGrid)
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Filter, X, Building2, MapPin, Package, Users
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

// Technical Director Metrics Carousel Component
const TechnicalMetricsCarousel: React.FC<{ metrics: any; formatCurrency: (amount: number) => string }> = ({ metrics, formatCurrency }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  const metricCards = [
    {
      title: 'Pending',
      value: metrics.pendingCount,
      icon: Clock,
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      bgIcon: 'bg-indigo-100',
      change: metrics.pendingCount > 0 ? '+5' : '0',
      changeColor: 'text-indigo-600'
    },
    {
      title: 'Approved',
      value: metrics.approvedCount,
      icon: CheckSquare,
      color: 'bg-green-50 border-green-200 text-green-700',
      bgIcon: 'bg-green-100',
      change: '+12%',
      changeColor: 'text-green-600'
    },
    {
      title: 'Rejected',
      value: metrics.rejectedCount,
      icon: XSquare,
      color: 'bg-red-50 border-red-200 text-red-700',
      bgIcon: 'bg-red-100',
      change: '-3%',
      changeColor: 'text-red-600'
    },
    {
      title: 'Value',
      value: formatCurrency(metrics.totalValue),
      icon: DollarSign,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      bgIcon: 'bg-emerald-100',
      change: '+8%',
      changeColor: 'text-emerald-600',
      isLarge: true
    },
    {
      title: 'Items',
      value: metrics.totalQuantity,
      icon: Package,
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      bgIcon: 'bg-purple-100',
      change: '+23',
      changeColor: 'text-purple-600'
    },
    {
      title: 'Processing',
      value: `${metrics.avgProcessingTime}d`,
      icon: TrendingUp,
      color: 'bg-orange-50 border-orange-200 text-orange-700',
      bgIcon: 'bg-orange-100',
      change: '-15%',
      changeColor: 'text-orange-600'
    },
    {
      title: 'Completed',
      value: metrics.completedCount,
      icon: FileText,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      bgIcon: 'bg-blue-100',
      change: '+88',
      changeColor: 'text-blue-600'
    }
  ];

  // Auto-rotate carousel
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % Math.max(1, metricCards.length - 4));
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [metricCards.length]);

  // Handle manual navigation
  const handleNext = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, metricCards.length - 4));
    // Restart auto-rotation after manual interaction
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % Math.max(1, metricCards.length - 4));
    }, 3000);
  };

  const handlePrev = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrentIndex((prev) => (prev - 1 + Math.max(1, metricCards.length - 4)) % Math.max(1, metricCards.length - 4));
    // Restart auto-rotation after manual interaction
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % Math.max(1, metricCards.length - 4));
    }, 3000);
  };

  // Get visible cards (show 5 at a time on desktop, 3 on tablet, 2 on mobile)
  const visibleCards = metricCards.slice(currentIndex, currentIndex + 5);
  if (visibleCards.length < 5) {
    visibleCards.push(...metricCards.slice(0, 5 - visibleCards.length));
  }

  return (
    <div className="mb-6">
      <div className="relative">
        {/* Navigation Buttons */}
        <button
          onClick={handlePrev}
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          aria-label="Previous metrics"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={handleNext}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          aria-label="Next metrics"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Metrics Cards */}
        <div className="overflow-hidden px-1">
          <motion.div
            className="flex gap-3"
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {visibleCards.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <motion.div
                  key={`${metric.title}-${index}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`flex-1 min-w-0 ${metric.isLarge ? 'col-span-2' : ''}`}
                >
                  <div className={`relative overflow-hidden border rounded-lg p-3 ${metric.color} transition-all hover:shadow-md`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-600 truncate">{metric.title}</p>
                        <p className="text-lg font-bold mt-1 truncate">{metric.value}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-xs font-medium ${metric.changeColor}`}>
                            {metric.change}
                          </span>
                        </div>
                      </div>
                      <div className={`p-2 rounded-lg ${metric.bgIcon}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Dot Indicators */}
        <div className="flex justify-center gap-1 mt-3">
          {Array.from({ length: Math.max(1, metricCards.length - 4) }).map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setCurrentIndex(index);
                intervalRef.current = setInterval(() => {
                  setCurrentIndex(prev => (prev + 1) % Math.max(1, metricCards.length - 4));
                }, 3000);
              }}
              className={`transition-all ${index === currentIndex
                ? 'w-6 h-1.5 bg-indigo-500 rounded-full'
                : 'w-1.5 h-1.5 bg-gray-300 rounded-full hover:bg-gray-400'
              }`}
              aria-label={`Go to metrics page ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const TechnicalDirectorHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [viewType, setViewType] = useState<ViewType>('kanban'); // Default to kanban for workflow

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
    avgProcessingTime: 2.5,
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
    localStorage.setItem('userRole', 'technicalDirector');
    setupRealtimeSubscription();
    startPolling('technicalDirector');
    storeFetchPurchases('technicalDirector');

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
      let pendingPurchases: Purchase[] = [];
      let approvedPurchases: Purchase[] = [];
      let rejectedPurchases: Purchase[] = [];
      let completedPurchases: Purchase[] = [];

      purchases.forEach(p => {
        const isCompleted = p.latest_status?.status === 'completed' ||
                           p.latest_status?.status === 'complete' ||
                           p.accounts_acknowledgement === true;

        if (isCompleted) {
          completedPurchases.push(p);
        } else {
          const tdStatus = p.technical_director_status?.toLowerCase();

          if (tdStatus === 'pending' || !tdStatus) {
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
        avgProcessingTime: 2.5,
        totalQuantity: totalQuantity
      });
    }
  }, [purchases]);

  // Filter purchases based on tab and search
  useEffect(() => {
    let filtered = [...purchases];

    // Tab filter
    switch (activeTab) {
      case 'pending':
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
        p.site_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

    // Apply sorting
    filtered.sort((a, b) => {
      const getMostRecentDate = (purchase: Purchase) => {
        if (purchase.latest_status?.date) {
          return new Date(purchase.latest_status.date).getTime();
        }
        if (purchase.last_modified_at) {
          return new Date(purchase.last_modified_at).getTime();
        }
        if (purchase.created_at) {
          return new Date(purchase.created_at).getTime();
        }
        if (purchase.date) {
          return new Date(purchase.date).getTime();
        }
        return 0;
      };

      return getMostRecentDate(b) - getMostRecentDate(a);
    });

    setFilteredPurchases(filtered);
  }, [purchases, activeTab, searchTerm, statusFilter, projectFilter, locationFilter, dateFilter]);

  // Transform data for different views
  const getTableColumns = () => [
    { key: 'purchase_id', label: 'PR #', sortable: true, width: '80px' },
    { key: 'purpose', label: 'Purpose', sortable: true },
    { key: 'site_location', label: 'Location', sortable: true },
    { key: 'technical_director_status', label: 'Status', sortable: true, width: '120px' },
    { key: 'priority', label: 'Priority', sortable: true, width: '100px' },
    { key: 'total_cost', label: 'Amount', sortable: true, width: '120px',
      render: (value: number) => `AED ${value?.toLocaleString() || 0}` },
    { key: 'date', label: 'Date', sortable: true, width: '120px' },
    { key: 'project_id', label: 'Project', sortable: false, width: '80px',
      render: (value: any) => value ? `P-${value}` : '-' }
  ];

  const transformToKanbanData = (purchases: Purchase[]) => {
    return purchases.map(p => ({
      id: p.purchase_id,
      title: `PR #${p.purchase_id}`,
      subtitle: p.purpose,
      status: p.technical_director_status?.toLowerCase() || 'pending',
      priority: p.materials?.[0]?.priority || 'medium',
      assignee: p.created_by || 'Unknown',
      date: p.date ? new Date(p.date).toLocaleDateString() : undefined,
      location: p.site_location,
      amount: p.total_cost,
      itemCount: p.materials?.length || 0,
      tags: p.project_id ? [`Project ${p.project_id}`] : []
    }));
  };

  const transformToSplitData = (purchases: Purchase[]) => {
    return purchases.map(p => ({
      id: p.purchase_id,
      title: `PR #${p.purchase_id}`,
      subtitle: p.purpose,
      status: p.technical_director_status?.toLowerCase() || 'pending',
      priority: p.materials?.[0]?.priority || 'medium',
      date: p.date ? new Date(p.date).toLocaleDateString() : undefined,
      amount: p.total_cost,
      location: p.site_location,
      assignee: p.created_by || 'Unknown',
      project_id: p.project_id,
      materials: p.materials
    }));
  };

  // Handlers
  const handleApprove = (purchaseId: number) => {
    setSelectedPurchaseId(purchaseId);
    setModalMode('approve');
    setApprovalModalOpen(true);
  };

  const handleReject = (purchaseId: number) => {
    setSelectedPurchaseId(purchaseId);
    setModalMode('reject');
    setApprovalModalOpen(true);
  };

  const handleViewDetails = (purchaseId: number) => {
    const purchase = purchases.find(p => p.purchase_id === purchaseId);
    if (purchase) {
      setSelectedPurchase(purchase);
      setDetailsModalOpen(true);
    }
  };

  const handleViewHistory = (purchaseId: number) => {
    setSelectedPurchaseId(purchaseId);
    setHistoryModalOpen(true);
  };

  const handleApprovalSuccess = () => {
    storeFetchPurchases('technicalDirector');
    setApprovalModalOpen(false);
  };

  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
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

  // Render different views
  const renderPurchaseView = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <ModernLoadingSpinners variant="pulse-wave" size="lg" />
            <p className="text-sm text-gray-600">Loading purchases...</p>
          </div>
        </div>
      );
    }

    if (filteredPurchases.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900">No purchases found</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchTerm
                ? 'Try adjusting your search criteria'
                : `No ${activeTab} purchases at this time`
              }
            </p>
          </CardContent>
        </Card>
      );
    }

    switch (viewType) {
      case 'table':
        return (
          <DataTableView
            data={filteredPurchases}
            columns={getTableColumns()}
            onApprove={handleApprove}
            onReject={handleReject}
            onViewDetails={handleViewDetails}
            onViewHistory={handleViewHistory}
            selectable={true}
            pageSize={10}
            sticky={true}
          />
        );

      case 'kanban':
        return (
          <KanbanView
            data={transformToKanbanData(filteredPurchases)}
            columns={[
              { id: 'pending', title: 'Pending Review', color: 'bg-yellow-100 border-yellow-300', icon: Clock },
              { id: 'approved', title: 'Approved', color: 'bg-green-100 border-green-300', icon: CheckSquare },
              { id: 'rejected', title: 'Rejected', color: 'bg-red-100 border-red-300', icon: XSquare },
              { id: 'under_review', title: 'Under Review', color: 'bg-purple-100 border-purple-300', icon: BarChart3 }
            ]}
            onApprove={handleApprove}
            onReject={handleReject}
            onViewDetails={handleViewDetails}
            onViewHistory={handleViewHistory}
            onStatusChange={(itemId, newStatus) => {
              // Handle status change if needed
              console.log(`Status change: ${itemId} -> ${newStatus}`);
            }}
            draggable={false} // Disable drag for approval workflow
          />
        );

      case 'split':
        return (
          <SplitView
            data={transformToSplitData(filteredPurchases)}
            onApprove={handleApprove}
            onReject={handleReject}
            onViewDetails={handleViewDetails}
            onViewHistory={handleViewHistory}
            resizable={true}
            renderDetails={(item) => (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Purchase Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div><strong>Purpose:</strong> {item.subtitle}</div>
                      <div><strong>Location:</strong> {item.location}</div>
                      <div><strong>Project:</strong> {item.project_id ? `Project ${item.project_id}` : 'N/A'}</div>
                      <div><strong>Total Amount:</strong> AED {item.amount?.toLocaleString() || 0}</div>
                      <div><strong>Items:</strong> {item.materials?.length || 0}</div>
                    </div>
                  </CardContent>
                </Card>
                {item.materials && item.materials.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Materials</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {item.materials.map((mat: any, idx: number) => (
                          <li key={idx}>{mat.item_name} - Qty: {mat.quantity}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          />
        );

      case 'cards':
      default:
        return (
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
        );
    }
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
      {/* Page Header */}
      <div className="mb-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#243d8a]/5 to-[#243d8a]/10 rounded-xl shadow-xl p-6 border border-[#243d8a]/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#243d8a] rounded-lg shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#243d8a]">Technical Director Hub</h1>
                <p className="text-[#243d8a]/80 mt-1">Review and approve technical specifications</p>
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Metrics Display - Compact Carousel */}
      <TechnicalMetricsCarousel metrics={metrics} formatCurrency={formatCurrency} />

      {/* Search Bar with View Toggle and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 lg:max-w-2xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search purchases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <ViewToggle
              currentView={viewType}
              onViewChange={setViewType}
              availableViews={['cards', 'table', 'kanban', 'split']}
              variant="buttons"
            />
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

      {/* Tabs with Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full min-w-[360px] max-w-none lg:max-w-3xl grid-cols-4">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending ({metrics.pendingCount})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Approved ({metrics.approvedCount})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2">
              <XSquare className="h-4 w-4" />
              Rejected ({metrics.rejectedCount})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Completed ({metrics.completedCount})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Render the same view for all tabs */}
        {['pending', 'approved', 'rejected', 'completed'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {renderPurchaseView()}
          </TabsContent>
        ))}
      </Tabs>

      {/* Modals */}
      <TechnicalDirectorApprovalModal
        isOpen={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        purchaseId={selectedPurchaseId}
        mode={modalMode}
        onSuccess={handleApprovalSuccess}
      />

      <PurchaseDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        purchase={selectedPurchase}
      />
    </div>
  );
};

export default TechnicalDirectorHub;