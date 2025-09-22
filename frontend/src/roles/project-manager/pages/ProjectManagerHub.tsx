/**
 * Project Manager Hub Page
 * Main workspace for Project Manager role
 * Following the standardized hub implementation pattern
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RefreshCw, Download, Search, Filter, LayoutDashboard,
  Package, CheckSquare, BarChart3, Bell, Settings,
  Clock, CheckCircle, XCircle, AlertTriangle, FileText,
  TrendingUp, Users, Calendar, X, Grid3X3, List,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PurchaseApprovalCard } from '../components/PurchaseApprovalCard';
import PurchaseDetailsModal from '../components/PurchaseDetailsModal';
import { projectManagerService, ProcurementPurchase } from '../services/projectManagerService';
import { toast } from 'sonner';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import { AnimatePresence } from 'framer-motion';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import usePurchaseStore, { startPolling, stopPolling } from '@/store/purchaseStore';

// Metric card component
interface MetricCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral';
  bgColor: string;
  iconColor: string;
}

const MetricCardComponent: React.FC<{ metric: MetricCard }> = ({ metric }) => (
  <div className={`${metric.bgColor} rounded-lg p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 h-full`}>
    <div className="flex items-center justify-between h-full">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-600 truncate">{metric.title}</p>
        <p className="text-lg lg:text-xl font-bold text-gray-900 mt-1 break-words">{metric.value}</p>
      </div>
      <div className={`${metric.iconColor} p-2 rounded-lg flex-shrink-0 ml-3`}>
        {metric.icon}
      </div>
    </div>
  </div>
);

// Metrics Carousel Component
const MetricsCarousel: React.FC<{ metrics: MetricCard[] }> = ({ metrics }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (metrics.length > 4) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % Math.ceil(metrics.length / 4));
      }, 5000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [metrics.length]);

  const getVisibleCards = () => {
    const startIdx = currentIndex * 4;
    return metrics.slice(startIdx, startIdx + 4);
  };

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -300 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {getVisibleCards().map((metric, index) => (
            <motion.div
              key={`${currentIndex}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="h-full"
            >
              <MetricCardComponent metric={metric} />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Carousel Indicators */}
      {metrics.length > 4 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: Math.ceil(metrics.length / 4) }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to metric slide ${index + 1}`}
              className={`h-2 transition-all rounded-full ${
                index === currentIndex ? 'w-8 bg-blue-500' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// List view component for purchases
interface PurchaseListViewProps {
  purchases: ProcurementPurchase[];
  activeTab: string;
  onViewDetails: (id: number) => void;
  onViewHistory: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number, reason: string) => void;
  onSendToEstimation: (id: number) => void;
  processingPurchases: {
    approving: Set<number>;
    rejecting: Set<number>;
    resending: Set<number>;
  };
}

const PurchaseListView: React.FC<PurchaseListViewProps> = ({
  purchases,
  activeTab,
  onViewDetails,
  onViewHistory,
  onApprove,
  onReject,
  onSendToEstimation,
  processingPurchases
}) => {
  const getStatusBadge = (purchase: ProcurementPurchase) => {
    const status = purchase.pm_status || purchase.current_workflow_status || 'pending';
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleQuickReject = (id: number) => {
    onReject(id, 'Quick rejection from list view');
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold">Purchase ID</TableHead>
            <TableHead className="font-semibold">Purpose</TableHead>
            <TableHead className="font-semibold">Location</TableHead>
            <TableHead className="font-semibold">Quantity</TableHead>
            <TableHead className="font-semibold">Total Cost</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.map((purchase) => (
            <TableRow
              key={purchase.purchase_id}
              className="hover:bg-gray-50 transition-colors"
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  PR #{purchase.purchase_id}
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-xs">
                  <p className="text-sm font-medium truncate">{purchase.purpose}</p>
                  {purchase.materials_summary?.total_materials > 0 && (
                    <p className="text-xs text-gray-500">
                      {purchase.materials_summary.total_materials} materials
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">{purchase.site_location}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm font-medium">
                  {purchase.total_quantity?.toLocaleString() || 0}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm font-medium">
                  AED {purchase.total_cost?.toLocaleString() || 0}
                </span>
              </TableCell>
              <TableCell>
                <Badge
                  className={`${getStatusBadge(purchase)} text-xs`}
                  variant="secondary"
                >
                  {(purchase.pm_status || purchase.current_workflow_status || 'pending').charAt(0).toUpperCase() +
                   (purchase.pm_status || purchase.current_workflow_status || 'pending').slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-600">
                  {formatDate(purchase.created_at || purchase.date)}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewDetails(purchase.purchase_id)}
                    className="h-8 px-2 text-xs"
                  >
                    <FileText className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewHistory(purchase.purchase_id)}
                    className="h-8 px-2 text-xs"
                  >
                    <Clock className="h-3 w-3" />
                  </Button>

                  {/* Action buttons based on tab */}
                  {activeTab === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => onApprove(purchase.purchase_id)}
                        disabled={processingPurchases.approving.has(purchase.purchase_id)}
                        className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700"
                      >
                        {processingPurchases.approving.has(purchase.purchase_id) ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleQuickReject(purchase.purchase_id)}
                        disabled={processingPurchases.rejecting.has(purchase.purchase_id)}
                        className="h-8 px-3 text-xs"
                      >
                        {processingPurchases.rejecting.has(purchase.purchase_id) ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                      </Button>
                    </>
                  )}

                  {activeTab === 'estimation_rejected' && (
                    <Button
                      size="sm"
                      onClick={() => onSendToEstimation(purchase.purchase_id)}
                      disabled={processingPurchases.resending.has(purchase.purchase_id)}
                      className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      {processingPurchases.resending.has(purchase.purchase_id) ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        'Resend'
                      )}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const ProjectManagerHub: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [activeTab, setActiveTab] = useState('pending');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Pagination state for purchase cards
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Show 10 purchase cards per page

  // Use centralized store for real-time updates - EXACTLY like ProcurementHub
  const {
    isLoading,
    lastFetchTime,
    fetchPurchases: storeFetchPurchases,
    setupRealtimeSubscription,
    cleanupRealtimeSubscription,
    getPurchasesForRole
  } = usePurchaseStore();

  // Get purchases directly from store - no local state needed!
  const allStorePurchases = getPurchasesForRole('projectManager') as ProcurementPurchase[];

  // Transform and separate purchases by status
  const purchases = (allStorePurchases || []).map(p => ({
    ...p,
    pm_status: p.project_manager_status || p.pm_status,
    materials_summary: p.materials_summary || {
      total_materials: p.materials?.length || 0,
      total_quantity: p.total_quantity || 0,
      total_cost: p.total_cost || 0,
      materials: p.materials || []
    }
  })).filter(p => {
    // Check if TD rejected (these should remain visible)
    const isTDRejected = p.technical_director_status === 'rejected' ||
                        (p.status_sender === 'technicalDirector' && p.status === 'rejected');

    // If TD rejected and PM approved, always include
    if (isTDRejected && p.pm_status === 'approved') {
      return true;
    }

    return (
      // Active purchases (not completed)
      p.latest_status?.status !== 'completed' &&
      p.latest_status?.status !== 'complete' &&
      p.accounts_acknowledgement !== true &&
      p.current_workflow_status !== 'completed' &&
      // Exclude ONLY PM flag estimation rejections - they go to estimation_rejected tab
      // But include purchases rejected by other roles for different reasons
      (p.rejection_from !== 'estimation' ||
       !p.rejected_status?.reject_category?.includes('pm_flag') ||
       // Include if PM has already approved and it was rejected by a later role
       p.pm_status === 'approved')
    );
  }) || [];
  // Derived from store data - Only show PM flag rejections from Estimation
  const estimationRejectedPurchases = (allStorePurchases || [])
    .filter(p =>
      // Check if it's a rejection that needs PM action
      (p.requires_pm_action === true ||
       p.rejection_from === 'estimation' ||
       p.estimation_status === 'rejected') &&
      // Check for PM flag rejection specifically
      (p.rejected_status?.reject_category === 'pm_flag' ||
       p.status_info?.reject_category === 'pm_flag' ||
       p.reject_category === 'pm_flag' ||
       p.approvals?.action?.some((a: any) =>
         a.role === 'estimation' &&
         a.status === 'rejected' &&
         a.reject_category === 'pm_flag'
       )) && // Only PM flag rejections
      // Ensure PM hasn't already rejected it
      p.pm_status !== 'rejected' &&
      // Not completed
      p.latest_status?.status !== 'completed' &&
      p.accounts_acknowledgement !== true &&
      p.current_workflow_status !== 'completed'
    )
    .map(p => ({
      ...p,
      pm_status: p.project_manager_status || p.pm_status
    })) || [];

  const completedPurchases = (allStorePurchases || [])
    .filter(p =>
      p.latest_status?.status === 'completed' ||
      p.latest_status?.status === 'complete' ||
      p.accounts_acknowledgement === true ||
      p.current_workflow_status === 'completed'
    )
    .map(p => ({
      ...p,
      pm_status: p.project_manager_status || p.pm_status
    })) || [];
  const [filteredPurchases, setFilteredPurchases] = useState<ProcurementPurchase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination calculations
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
  const paginatedPurchases = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPurchases.slice(startIndex, endIndex);
  }, [filteredPurchases, currentPage, itemsPerPage]);

  // Reset to first page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Pagination handlers
  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  // Modal states
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<'details' | 'history'>('details');
  
  // Success dialog state
  const [successDialog, setSuccessDialog] = useState<{
    isOpen: boolean;
    message: string;
  }>({ isOpen: false, message: '' });
  
  // Processing states for individual purchases
  const [processingPurchases, setProcessingPurchases] = useState<{
    approving: Set<number>;
    rejecting: Set<number>;
    resending: Set<number>;
  }>({
    approving: new Set(),
    rejecting: new Set(),
    resending: new Set()
  });

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await storeFetchPurchases('projectManager');
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  // Check for real-time status
  const isRealtime = lastFetchTime && Date.now() - lastFetchTime.getTime() < 15000;

  // Calculate metrics from current data - multiple sets for auto-swap
  const calculateMetrics = useCallback(() => {
    const pendingPurchases = purchases.filter(p => !p.pm_status || p.pm_status === 'pending');
    const approvedPurchases = purchases.filter(p => p.pm_status === 'approved');
    const rejectedPurchases = purchases.filter(p => p.pm_status === 'rejected');

    const totalQuantity = allStorePurchases.reduce((sum, p) => sum + (p.total_quantity || 0), 0);
    const totalValue = allStorePurchases.reduce((sum, p) => sum + (p.total_cost || 0), 0);

    // Calculate additional metrics for different sets
    const todayPurchases = allStorePurchases.filter(p => {
      const today = new Date().toDateString();
      const purchaseDate = new Date(p.created_at || p.date).toDateString();
      return purchaseDate === today;
    });

    const thisWeekPurchases = allStorePurchases.filter(p => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const purchaseDate = new Date(p.created_at || p.date);
      return purchaseDate >= weekAgo;
    });

    const avgValue = allStorePurchases.length > 0 ? totalValue / allStorePurchases.length : 0;
    const materialTypes = [...new Set(allStorePurchases.flatMap(p => p.materials?.map(m => m.material_name) || []))].length;

    // Create different metric sets for auto-swapping
    const metricSets: MetricCard[][] = [
      // Set 1: Overview Metrics
      [
        {
          title: 'Total Purchases',
          value: allStorePurchases.length,
          icon: <Package className="h-5 w-5 text-blue-600" />,
          bgColor: 'bg-blue-50',
          iconColor: 'bg-blue-100',
          trend: '+12%',
          trendType: 'up'
        },
        {
          title: 'Pending Approvals',
          value: pendingPurchases.length,
          icon: <Clock className="h-5 w-5 text-yellow-600" />,
          bgColor: 'bg-yellow-50',
          iconColor: 'bg-yellow-100',
          trend: '-5%',
          trendType: 'down'
        },
        {
          title: 'Approved',
          value: approvedPurchases.length,
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          bgColor: 'bg-green-50',
          iconColor: 'bg-green-100',
          trend: '+8%',
          trendType: 'up'
        },
        {
          title: 'Rejected',
          value: rejectedPurchases.length,
          icon: <XCircle className="h-5 w-5 text-red-600" />,
          bgColor: 'bg-red-50',
          iconColor: 'bg-red-100',
          trend: '-2%',
          trendType: 'down'
        },
        {
          title: 'Completed',
          value: completedPurchases.length,
          icon: <FileText className="h-5 w-5 text-blue-600" />,
          bgColor: 'bg-blue-50',
          iconColor: 'bg-blue-100',
          trend: '+10%',
          trendType: 'up'
        },
        {
          title: 'Est. Rejected',
          value: estimationRejectedPurchases.length,
          icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
          bgColor: 'bg-orange-50',
          iconColor: 'bg-orange-100',
          trend: '-3%',
          trendType: 'down'
        },
        {
          title: 'Total Value',
          value: `AED ${totalValue.toLocaleString()}`,
          icon: <TrendingUp className="h-5 w-5 text-indigo-600" />,
          bgColor: 'bg-indigo-50',
          iconColor: 'bg-indigo-100',
          trend: '+15%',
          trendType: 'up'
        }
      ],
      // Set 2: Financial Metrics
      [
        {
          title: 'Total Value',
          value: `AED ${totalValue.toLocaleString()}`,
          icon: <TrendingUp className="h-5 w-5 text-indigo-600" />,
          bgColor: 'bg-indigo-50',
          iconColor: 'bg-indigo-100',
          trend: '+15%',
          trendType: 'up'
        },
        {
          title: 'Average Cost',
          value: `AED ${Math.round(avgValue).toLocaleString()}`,
          icon: <BarChart3 className="h-5 w-5 text-purple-600" />,
          bgColor: 'bg-purple-50',
          iconColor: 'bg-purple-100',
          trend: '+5%',
          trendType: 'up'
        },
        {
          title: 'Today\'s Purchases',
          value: todayPurchases.length,
          icon: <Calendar className="h-5 w-5 text-green-600" />,
          bgColor: 'bg-green-50',
          iconColor: 'bg-green-100',
          trend: '+20%',
          trendType: 'up'
        },
        {
          title: 'This Week',
          value: thisWeekPurchases.length,
          icon: <Users className="h-5 w-5 text-blue-600" />,
          bgColor: 'bg-blue-50',
          iconColor: 'bg-blue-100',
          trend: '+18%',
          trendType: 'up'
        },
        {
          title: 'Material Types',
          value: materialTypes,
          icon: <Settings className="h-5 w-5 text-gray-600" />,
          bgColor: 'bg-gray-50',
          iconColor: 'bg-gray-100',
          trend: '+2%',
          trendType: 'up'
        },
        {
          title: 'Total Quantity',
          value: totalQuantity.toLocaleString(),
          icon: <Package className="h-5 w-5 text-purple-600" />,
          bgColor: 'bg-purple-50',
          iconColor: 'bg-purple-100',
          trend: '+7%',
          trendType: 'up'
        },
        {
          title: 'Efficiency Rate',
          value: `${Math.round((approvedPurchases.length / Math.max(allStorePurchases.length, 1)) * 100)}%`,
          icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
          bgColor: 'bg-emerald-50',
          iconColor: 'bg-emerald-100',
          trend: '+12%',
          trendType: 'up'
        }
      ]
    ];

    return metricSets;
  }, [purchases, allStorePurchases, completedPurchases, estimationRejectedPurchases]);

  // Initialize real-time updates on mount - EXACTLY like ProcurementHub
  useEffect(() => {
    // Store user role for the purchase store
    localStorage.setItem('userRole', 'projectManager');

    // Setup real-time subscriptions
    setupRealtimeSubscription();

    // Start polling for updates
    startPolling('projectManager');

    // Initial fetch
    storeFetchPurchases('projectManager');

    // Cleanup on unmount
    return () => {
      stopPolling();
      cleanupRealtimeSubscription();
    };
  }, [setupRealtimeSubscription, cleanupRealtimeSubscription, storeFetchPurchases]);

  // Calculate metrics whenever purchases change - keep it simple, just one set
  const metrics = useMemo(() => {
    const pendingPurchases = purchases.filter(p => !p.pm_status || p.pm_status === 'pending');
    const approvedPurchases = purchases.filter(p => p.pm_status === 'approved');
    const rejectedPurchases = purchases.filter(p => p.pm_status === 'rejected');

    const totalQuantity = allStorePurchases.reduce((sum, p) => sum + (p.total_quantity || 0), 0);
    const totalValue = allStorePurchases.reduce((sum, p) => sum + (p.total_cost || 0), 0);

    const metricsData: MetricCard[] = [
      {
        title: 'Total Purchases',
        value: allStorePurchases.length,
        icon: <Package className="h-5 w-5 text-blue-600" />,
        bgColor: 'bg-blue-50',
        iconColor: 'bg-blue-100'
      },
      {
        title: 'Pending Approvals',
        value: pendingPurchases.length,
        icon: <Clock className="h-5 w-5 text-yellow-600" />,
        bgColor: 'bg-yellow-50',
        iconColor: 'bg-yellow-100'
      },
      {
        title: 'Approved',
        value: approvedPurchases.length,
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        bgColor: 'bg-green-50',
        iconColor: 'bg-green-100'
      },
      {
        title: 'Rejected',
        value: rejectedPurchases.length,
        icon: <XCircle className="h-5 w-5 text-red-600" />,
        bgColor: 'bg-red-50',
        iconColor: 'bg-red-100'
      },
      {
        title: 'Completed',
        value: completedPurchases.length,
        icon: <FileText className="h-5 w-5 text-blue-600" />,
        bgColor: 'bg-blue-50',
        iconColor: 'bg-blue-100'
      },
      {
        title: 'Total Quantity',
        value: totalQuantity.toLocaleString(),
        icon: <Package className="h-5 w-5 text-purple-600" />,
        bgColor: 'bg-purple-50',
        iconColor: 'bg-purple-100'
      },
      {
        title: 'Total Value',
        value: `AED ${totalValue.toLocaleString()}`,
        icon: <TrendingUp className="h-5 w-5 text-indigo-600" />,
        bgColor: 'bg-indigo-50',
        iconColor: 'bg-indigo-100'
      },
      {
        title: 'Avg Processing Time',
        value: '2.5 days',
        icon: <Calendar className="h-5 w-5 text-orange-600" />,
        bgColor: 'bg-orange-50',
        iconColor: 'bg-orange-100'
      }
    ];

    return metricsData;
  }, [purchases, allStorePurchases, completedPurchases, estimationRejectedPurchases]);


  // Filter purchases based on active tab and search
  useEffect(() => {
    let filtered: ProcurementPurchase[] = [];

    // Filter by status based on active tab
    switch (activeTab) {
      case 'pending':
        // Show purchases waiting for PM action
        filtered = [...purchases].filter(p => {
          // Exclude TD rejected purchases from pending (they should stay in approved)
          const isTDRejected = p.technical_director_status === 'rejected' ||
                              (p.status_sender === 'technicalDirector' && p.status === 'rejected');

          if (isTDRejected) return false;

          return (
            (!p.pm_status || p.pm_status === 'pending') &&
            // Check multiple possible status fields for procurement approval
            (p.procurement_status === 'approved' ||
             p.sender_latest_status === 'approved' ||
             p.current_workflow_status === 'project_manager' ||
             p.latest_status?.sender === 'procurement' ||
             // If no specific procurement status, show all pending for PM
             (!p.procurement_status && !p.rejection_from))
          );
        });
        break;
      case 'approved':
        // Show ALL PM approved purchases (including ones that moved to next stage or were rejected by TD)
        filtered = [...allStorePurchases].filter(p => {
          // Include TD rejected purchases in approved tab (PM already approved them)
          const isTDRejected = p.technical_director_status === 'rejected' ||
                              (p.status_sender === 'technicalDirector' && p.status === 'rejected');

          return (p.pm_status === 'approved' ||
                  p.project_manager_status === 'approved' ||
                  (isTDRejected && p.pm_status !== 'rejected'));
        });
        break;
      case 'rejected':
        filtered = [...purchases].filter(p => p.pm_status === 'rejected');
        break;
      case 'estimation_rejected':
        // Use the estimation_pm_rejections data from API
        filtered = [...estimationRejectedPurchases];
        break;
      case 'completed':
        // Show completed purchases
        filtered = [...completedPurchases];
        break;
      default:
        filtered = [...purchases];
        break;
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => {
        const purchaseId = p.purchase_id ? p.purchase_id.toString() : '';
        const purpose = p.purpose || '';
        const siteLocation = p.site_location || '';
        
        return purchaseId.includes(search) ||
               purpose.toLowerCase().includes(search) ||
               siteLocation.toLowerCase().includes(search);
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => {
        const status = p.pm_status || p.current_workflow_status || 'pending';
        return status === statusFilter;
      });
    }

    // Apply location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(p => p.site_location === locationFilter);
    }

    // Apply date filter
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
          default:
            return true;
        }
      };
      filtered = filtered.filter(p => filterDate(p.created_at || p.date));
    }

    // Sort purchases based on tab
    switch (activeTab) {
      case 'pending':
        // Sort pending by creation date (oldest first - FIFO for processing)
        filtered.sort((a, b) => {
          const dateA = new Date(a.created_at || a.date || 0).getTime();
          const dateB = new Date(b.created_at || b.date || 0).getTime();
          return dateA - dateB;
        });
        break;
      case 'approved':
        // Sort approved by approval date (recently approved first)
        filtered.sort((a, b) => {
          const dateA = new Date(a.pm_status_date || a.created_at || a.date || 0).getTime();
          const dateB = new Date(b.pm_status_date || b.created_at || b.date || 0).getTime();
          return dateB - dateA;
        });
        break;
      case 'rejected':
        // Sort rejected by rejection date (recently rejected first)
        filtered.sort((a, b) => {
          const dateA = new Date(a.pm_status_date || a.created_at || a.date || 0).getTime();
          const dateB = new Date(b.pm_status_date || b.created_at || b.date || 0).getTime();
          return dateB - dateA;
        });
        break;
      case 'completed':
        // Sort completed by completion date (recently completed first)
        filtered.sort((a, b) => {
          const dateA = new Date(a.latest_status?.date || a.created_at || a.date || 0).getTime();
          const dateB = new Date(b.latest_status?.date || b.created_at || b.date || 0).getTime();
          return dateB - dateA;
        });
        break;
      case 'estimation_rejected':
        // Sort estimation rejected by creation date (oldest first)
        filtered.sort((a, b) => {
          const dateA = new Date(a.created_at || a.date || 0).getTime();
          const dateB = new Date(b.created_at || b.date || 0).getTime();
          return dateA - dateB;
        });
        break;
      default:
        // Default sort by creation date (newest first)
        filtered.sort((a, b) => {
          const dateA = new Date(a.created_at || a.date || 0).getTime();
          const dateB = new Date(b.created_at || b.date || 0).getTime();
          return dateB - dateA;
        });
    }

    setFilteredPurchases(filtered);
  }, [purchases, estimationRejectedPurchases, completedPurchases, activeTab, searchTerm, statusFilter, projectFilter, locationFilter, dateFilter]);

  // Handle approval action
  const handleApprove = async (purchaseId: number) => {
    // Add to approving set
    setProcessingPurchases(prev => ({
      ...prev,
      approving: new Set(prev.approving).add(purchaseId)
    }));
    
    try {
      const result = await projectManagerService.approvePurchase(purchaseId, 'Approved by Project Manager');
      if (result.success) {
        // Show success dialog
        setSuccessDialog({
          isOpen: true,
          message: 'Purchase request has been approved successfully and sent to the next workflow stage!'
        });

        // Refresh data from store
        storeFetchPurchases('projectManager');
      }
    } catch (error) {
      toast.error('Failed to approve purchase');
    } finally {
      // Remove from approving set
      setProcessingPurchases(prev => {
        const newApproving = new Set(prev.approving);
        newApproving.delete(purchaseId);
        return { ...prev, approving: newApproving };
      });
    }
  };

  // Handle rejection action
  const handleReject = async (purchaseId: number, reason: string) => {
    // Add to rejecting set
    setProcessingPurchases(prev => ({
      ...prev,
      rejecting: new Set(prev.rejecting).add(purchaseId)
    }));
    
    try {
      // Check if the purchase has already been rejected
      const purchase = purchases.find(p => p.purchase_id === purchaseId);
      if (purchase?.pm_status === 'rejected') {
        toast.warning('This purchase has already been rejected by Project Manager');
        return;
      }
      
      const result = await projectManagerService.rejectPurchase(purchaseId, reason, 'Rejected by Project Manager');
      if (result.success) {
        // Show success dialog
        setSuccessDialog({
          isOpen: true,
          message: 'Purchase request has been rejected and sent back to the requester for revision!'
        });

        // Refresh data from store
        storeFetchPurchases('projectManager');
      }
    } catch (error: any) {
      // Show specific error message if available
      const errorMessage = error.message || 'Failed to reject purchase';
      toast.error(errorMessage);
      console.error('Rejection error:', error);
    } finally {
      // Remove from rejecting set
      setProcessingPurchases(prev => {
        const newRejecting = new Set(prev.rejecting);
        newRejecting.delete(purchaseId);
        return { ...prev, rejecting: newRejecting };
      });
    }
  };


  // Handle view details
  const handleViewDetails = (purchaseId: number) => {
    setSelectedPurchaseId(purchaseId);
    setModalMode('details');
    setDetailsModalOpen(true);
  };

  // Handle view history
  const handleViewHistory = (purchaseId: number) => {
    setSelectedPurchaseId(purchaseId);
    setModalMode('history');
    setDetailsModalOpen(true);
  };

  // Handle edit (if applicable)
  const handleEdit = (purchaseId: number) => {
    toast.info(`Edit functionality for purchase ${purchaseId}`);
  };

  // Handle send to estimation (for estimation rejected purchases)
  const handleSendToEstimation = async (purchaseId: number) => {
    // Add to resending set
    setProcessingPurchases(prev => ({
      ...prev,
      resending: new Set(prev.resending).add(purchaseId)
    }));
    
    try {
      // Find the purchase to check its status
      const purchase = estimationRejectedPurchases.find(p => p.purchase_id === purchaseId);
      
      // Check if PM previously rejected this purchase
      if (purchase?.pm_status === 'rejected') {
        toast.error('Cannot resend: This purchase was rejected by Project Manager. Please approve it from the Pending tab first.');
        return;
      }
      
      // Log the purchase status for debugging
      console.log('Attempting to resend purchase:', {
        purchaseId,
        pm_status: purchase?.pm_status,
        rejected_status: purchase?.rejected_status
      });
      
      const result = await projectManagerService.resendToEstimation(
        purchaseId, 
        'Reviewed and resending to Estimation for further review'
      );
      
      // Check if the response indicates success
      if (result.success || result.message?.includes('successfully')) {
        // Show success dialog
        setSuccessDialog({
          isOpen: true,
          message: 'Purchase request has been resent to Estimation team for further review!'
        });
        // Refresh data from store
        storeFetchPurchases('projectManager');
      } else {
        // If there's an error in the response
        toast.error(result.message || result.error || 'Failed to resend to Estimation');
      }
    } catch (error: any) {
      // Handle different error structures
      let errorMessage = 'Failed to resend to Estimation';
      
      if (typeof error === 'object' && error !== null) {
        // If error is the response data directly
        if (error.error) {
          errorMessage = error.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        // Handle axios error structure
        else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      toast.error(errorMessage);
      console.error('Error resending to estimation:', error);
    } finally {
      // Remove from resending set
      setProcessingPurchases(prev => {
        const newResending = new Set(prev.resending);
        newResending.delete(purchaseId);
        return { ...prev, resending: newResending };
      });
    }
  };

  // Export data
  const handleExport = () => {
    const dataToExport = {
      purchases: filteredPurchases,
      metrics: metrics.map(m => ({ title: m.title, value: m.value })),
      exportDate: new Date().toISOString(),
      role: 'Project Manager'
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pm-purchases-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Data exported successfully');
  };

  // Get unique values for filter dropdowns
  const getUniqueLocations = () => {
    const locations = [...new Set([...purchases, ...estimationRejectedPurchases, ...completedPurchases].map(p => p.site_location))].filter(Boolean);
    return locations;
  };

  const getUniqueStatuses = () => {
    const statuses = [...new Set([...purchases, ...estimationRejectedPurchases, ...completedPurchases].map(p => p.pm_status || p.current_workflow_status || 'pending'))];
    return statuses.filter(Boolean);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setProjectFilter('all');
    setLocationFilter('all');
    setDateFilter('all');
    setShowFilters(false);
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return searchTerm !== '' || 
           statusFilter !== 'all' || 
           projectFilter !== 'all' || 
           locationFilter !== 'all' || 
           dateFilter !== 'all';
  };

  // Calculate tab counts
  const tabCounts = useMemo(() => ({
    pending: purchases.filter(p => !p.pm_status || p.pm_status === 'pending').length,
    approved: purchases.filter(p => p.pm_status === 'approved').length,
    rejected: purchases.filter(p => p.pm_status === 'rejected').length,
    estimation_rejected: estimationRejectedPurchases.length,
    completed: completedPurchases.length
  }), [purchases, estimationRejectedPurchases, completedPurchases]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="px-6 py-4">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#243d8a]/5 to-[#243d8a]/10 rounded-xl shadow-xl p-6 border border-[#243d8a]/20"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#243d8a] rounded-lg shadow-lg">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#243d8a]">Project Manager Hub</h1>
              <p className="text-[#243d8a]/80 mt-1">Manage purchase approvals and project workflows</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Metrics Section */}
      <div className="px-6 py-6">
        <MetricsCarousel metrics={metrics} />
      </div>

      {/* Main Content Section */}
      <div className="px-6 pb-6">
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-gray-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Package className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Purchase Approvals</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search purchases..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>

                {/* View Toggle Buttons */}
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-none border-0"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-none border-0"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant={hasActiveFilters() ? "default" : "outline"}
                  className={hasActiveFilters() ? "bg-blue-600 hover:bg-blue-700" : ""}
                  size="sm"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {hasActiveFilters() && (
                    <Badge variant="secondary" className="ml-2 bg-white text-blue-600">
                      Active
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-b"
              >
                <div className="p-4 bg-gray-50/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                          {getUniqueStatuses().map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
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
                          {getUniqueLocations().map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
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
                        className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear All Filters
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <CardContent className="p-0">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b px-6 pt-4">
                <TabsList className="grid w-full max-w-2xl grid-cols-5 bg-gray-100/50">
                  <TabsTrigger value="pending" className="relative">
                    <Clock className="h-4 w-4 mr-2" />
                    Pending
                    {tabCounts.pending > 0 && (
                      <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-700">
                        {tabCounts.pending}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="relative">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approved
                    {tabCounts.approved > 0 && (
                      <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                        {tabCounts.approved}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="relative">
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejected
                    {tabCounts.rejected > 0 && (
                      <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700">
                        {tabCounts.rejected}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="estimation_rejected" className="relative">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Est. Rejected
                    {tabCounts.estimation_rejected > 0 && (
                      <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">
                        {tabCounts.estimation_rejected}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="relative">
                    <FileText className="h-4 w-4 mr-2" />
                    Completed
                    {tabCounts.completed > 0 && (
                      <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                        {tabCounts.completed}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab Content */}
              <TabsContent value={activeTab} className="p-6">
                {activeTab === 'estimation_rejected' && filteredPurchases.length > 0 && (
                  <Alert className="mb-4 border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      These purchases were rejected by the Estimation team. Review their feedback and take appropriate action.
                    </AlertDescription>
                  </Alert>
                )}
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <ModernLoadingSpinners variant="pulse-wave" size="md" />
                  </div>
                ) : filteredPurchases.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No purchases found</p>
                  </div>
                ) : (
                  <>
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {paginatedPurchases.map((purchase) => (
                          <PurchaseApprovalCard
                            key={purchase.purchase_id}
                            purchase={purchase}
                            onViewDetails={handleViewDetails}
                            onViewHistory={handleViewHistory}
                            onEdit={() => handleEdit(purchase.purchase_id)}
                            onApprove={() => handleApprove(purchase.purchase_id)}
                            onReject={(reason) => handleReject(purchase.purchase_id, reason)}
                            onSendToEstimation={() => handleSendToEstimation(purchase.purchase_id)}
                            isLoading={processingPurchases.approving.has(purchase.purchase_id) || processingPurchases.rejecting.has(purchase.purchase_id) || processingPurchases.resending.has(purchase.purchase_id)}
                            isApproving={processingPurchases.approving.has(purchase.purchase_id)}
                            isRejecting={processingPurchases.rejecting.has(purchase.purchase_id)}
                            isResending={processingPurchases.resending.has(purchase.purchase_id)}
                            isEstimationRejected={activeTab === 'estimation_rejected'}
                          />
                        ))}
                      </div>
                    ) : (
                      <PurchaseListView
                        purchases={paginatedPurchases}
                        activeTab={activeTab}
                        onViewDetails={handleViewDetails}
                        onViewHistory={handleViewHistory}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onSendToEstimation={handleSendToEstimation}
                        processingPurchases={processingPurchases}
                      />
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-6 border-t">
                        <div className="text-sm text-gray-600">
                          Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredPurchases.length)} of {filteredPurchases.length} purchases
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Previous Button */}
                          <Button
                            onClick={goToPrevPage}
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            className="flex items-center gap-1"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                          </Button>

                          {/* Page Numbers */}
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = index + 1;
                              } else if (currentPage <= 3) {
                                pageNum = index + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + index;
                              } else {
                                pageNum = currentPage - 2 + index;
                              }

                              if (pageNum > totalPages) return null;

                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => goToPage(pageNum)}
                                  className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                                    pageNum === currentPage
                                      ? 'bg-blue-600 text-white'
                                      : 'text-gray-700 hover:bg-gray-100'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>

                          {/* Next Button */}
                          <Button
                            onClick={goToNextPage}
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            className="flex items-center gap-1"
                          >
                            Next
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Details Modal */}
      <PurchaseDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedPurchaseId(null);
        }}
        purchaseId={selectedPurchaseId}
        mode={modalMode}
      />
      
      {/* Success Dialog */}
      <ConfirmationDialog
        isOpen={successDialog.isOpen}
        onClose={() => setSuccessDialog({ isOpen: false, message: '' })}
        type="success"
        message={successDialog.message}
        confirmText="OK"
        showCancel={false}
      />
    </div>
  );
};

export default ProjectManagerHub;