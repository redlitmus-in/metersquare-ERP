/**
 * Project Manager Hub Page
 * Main workspace for Project Manager role with new UI alternatives
 * Updated with DataTable, Kanban, Split View, and BentoGrid
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RefreshCw, Download, Search, Filter, LayoutDashboard,
  Package, CheckSquare, BarChart3, Bell, Settings,
  Clock, CheckCircle, XCircle, AlertTriangle, FileText,
  TrendingUp, Users, Calendar, X, Building2, MapPin,
  DollarSign, Target, Activity, Briefcase
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import usePurchaseStore, { startPolling, stopPolling } from '@/store/purchaseStore';

// Import new UI components
import DataTableView from '@/components/ui/DataTableView';
import KanbanView from '@/components/ui/KanbanView';
import SplitView from '@/components/ui/SplitView';
import BentoGrid, { BentoGridPresets } from '@/components/ui/BentoGrid';
import ViewToggle, { ViewType } from '@/components/ui/ViewToggle';

// Metrics Carousel Component
const MetricsCarousel: React.FC<{ metrics: any; formatCurrency: (amount: number) => string }> = ({ metrics, formatCurrency }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  const metricCards = [
    {
      title: 'Pending',
      value: metrics.pendingCount,
      icon: Clock,
      color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      bgIcon: 'bg-yellow-100',
      change: metrics.pendingCount > 5 ? '+8%' : '+2%',
      changeColor: 'text-yellow-600'
    },
    {
      title: 'Approved',
      value: metrics.approvedCount,
      icon: CheckCircle,
      color: 'bg-green-50 border-green-200 text-green-700',
      bgIcon: 'bg-green-100',
      change: '+15%',
      changeColor: 'text-green-600'
    },
    {
      title: 'Rejected',
      value: metrics.rejectedCount,
      icon: XCircle,
      color: 'bg-red-50 border-red-200 text-red-700',
      bgIcon: 'bg-red-100',
      change: '-2%',
      changeColor: 'text-red-600'
    },
    {
      title: 'Projects',
      value: metrics.activeProjects,
      icon: Building2,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      bgIcon: 'bg-blue-100',
      change: '+3',
      changeColor: 'text-blue-600'
    },
    {
      title: 'Budget',
      value: formatCurrency(metrics.totalValue),
      icon: DollarSign,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      bgIcon: 'bg-emerald-100',
      change: '+12%',
      changeColor: 'text-emerald-600',
      isLarge: true
    },
    {
      title: 'Critical',
      value: metrics.criticalItems,
      icon: AlertTriangle,
      color: 'bg-orange-50 border-orange-200 text-orange-700',
      bgIcon: 'bg-orange-100',
      change: metrics.criticalItems > 0 ? '+5' : '0',
      changeColor: 'text-orange-600'
    },
    {
      title: 'Processing',
      value: `${metrics.avgProcessingTime}d`,
      icon: Activity,
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      bgIcon: 'bg-purple-100',
      change: '-12%',
      changeColor: 'text-purple-600'
    },
    {
      title: 'Total',
      value: metrics.totalPurchases,
      icon: Package,
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      bgIcon: 'bg-indigo-100',
      change: '+23',
      changeColor: 'text-indigo-600'
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
                ? 'w-6 h-1.5 bg-blue-500 rounded-full'
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

const ProjectManagerHub: React.FC = () => {
  const navigate = useNavigate();

  // State management
  const [activeTab, setActiveTab] = useState('pending');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('split'); // Default to split view for PM

  // Use centralized store for real-time updates
  const {
    isLoading,
    lastFetchTime,
    fetchPurchases: storeFetchPurchases,
    setupRealtimeSubscription,
    cleanupRealtimeSubscription,
    getPurchasesForRole
  } = usePurchaseStore();

  // Get purchases directly from store
  const purchases = useMemo(() => {
    return getPurchasesForRole('projectManager') as ProcurementPurchase[];
  }, [getPurchasesForRole]);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [selectedPurchase, setSelectedPurchase] = useState<ProcurementPurchase | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<{ purchaseId: number; action: 'approve' | 'reject' } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Filter purchases based on tab and search
  const filteredPurchases = useMemo(() => {
    let filtered = [...purchases];

    // Tab filtering
    switch (activeTab) {
      case 'pending':
        filtered = filtered.filter(p => {
          const pmStatus = p.project_manager_status?.toLowerCase();
          const procStatus = p.procurement_status?.toLowerCase();
          return (!pmStatus || pmStatus === 'pending') && procStatus === 'approved';
        });
        break;
      case 'approved':
        filtered = filtered.filter(p =>
          p.project_manager_status?.toLowerCase() === 'approved'
        );
        break;
      case 'rejected':
        filtered = filtered.filter(p =>
          p.project_manager_status?.toLowerCase() === 'rejected'
        );
        break;
      case 'all':
        // Show all purchases
        break;
    }

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.purchase_id.toString().includes(searchTerm) ||
        p.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.site_location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Priority filtering
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(p => {
        const priority = p.materials?.[0]?.priority || 'medium';
        return priority.toLowerCase() === priorityFilter;
      });
    }

    // Project filtering
    if (projectFilter !== 'all') {
      filtered = filtered.filter(p => p.project_id === projectFilter);
    }

    // Location filtering
    if (locationFilter !== 'all') {
      filtered = filtered.filter(p => p.site_location === locationFilter);
    }

    // Date filtering
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
      filtered = filtered.filter(p => filterDate(p.date || p.created_at));
    }

    // Sort by most recent
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || a.date || 0).getTime();
      const dateB = new Date(b.created_at || b.date || 0).getTime();
      return dateB - dateA;
    });

    return filtered;
  }, [purchases, activeTab, searchTerm, priorityFilter, projectFilter, locationFilter, dateFilter]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const pendingCount = purchases.filter(p => {
      const pmStatus = p.project_manager_status?.toLowerCase();
      const procStatus = p.procurement_status?.toLowerCase();
      return (!pmStatus || pmStatus === 'pending') && procStatus === 'approved';
    }).length;

    const approvedCount = purchases.filter(p =>
      p.project_manager_status?.toLowerCase() === 'approved'
    ).length;

    const rejectedCount = purchases.filter(p =>
      p.project_manager_status?.toLowerCase() === 'rejected'
    ).length;

    const totalValue = purchases.reduce((sum, p) => sum + (p.total_cost || 0), 0);

    const activeProjects = new Set(purchases.map(p => p.project_id).filter(Boolean)).size;

    const criticalItems = purchases.filter(p =>
      p.materials?.some(m => m.priority === 'high')
    ).length;

    return {
      pendingCount,
      approvedCount,
      rejectedCount,
      totalValue,
      activeProjects,
      criticalItems,
      totalPurchases: purchases.length,
      avgProcessingTime: 1.8
    };
  }, [purchases]);

  // Transform data for different views
  const getTableColumns = () => [
    { key: 'purchase_id', label: 'PR #', sortable: true, width: '80px' },
    { key: 'purpose', label: 'Purpose', sortable: true },
    { key: 'site_location', label: 'Location', sortable: true },
    { key: 'project_manager_status', label: 'PM Status', sortable: true, width: '120px' },
    { key: 'procurement_status', label: 'Proc Status', sortable: true, width: '120px' },
    { key: 'total_cost', label: 'Amount', sortable: true, width: '120px',
      render: (value: number) => `AED ${value?.toLocaleString() || 0}` },
    { key: 'date', label: 'Date', sortable: true, width: '120px' },
    { key: 'project_id', label: 'Project', sortable: false, width: '80px',
      render: (value: any) => value ? `P-${value}` : '-' }
  ];

  const transformToKanbanData = (purchases: ProcurementPurchase[]) => {
    return purchases.map(p => ({
      id: p.purchase_id,
      title: `PR #${p.purchase_id}`,
      subtitle: p.purpose,
      status: p.project_manager_status?.toLowerCase() || 'pending',
      priority: p.materials?.[0]?.priority || 'medium',
      assignee: p.created_by || 'Unknown',
      date: p.date ? new Date(p.date).toLocaleDateString() : undefined,
      location: p.site_location,
      amount: p.total_cost,
      itemCount: p.materials?.length || 0,
      tags: p.project_id ? [`Project ${p.project_id}`] : []
    }));
  };

  const transformToSplitData = (purchases: ProcurementPurchase[]) => {
    return purchases.map(p => ({
      id: p.purchase_id,
      title: `PR #${p.purchase_id}`,
      subtitle: p.purpose,
      status: p.project_manager_status?.toLowerCase() || 'pending',
      priority: p.materials?.[0]?.priority || 'medium',
      date: p.date ? new Date(p.date).toLocaleDateString() : undefined,
      amount: p.total_cost,
      location: p.site_location,
      assignee: p.created_by || 'Unknown',
      project_id: p.project_id,
      materials: p.materials,
      procurement_status: p.procurement_status,
      estimation_status: p.estimation_status
    }));
  };

  // Initialize real-time updates
  useEffect(() => {
    localStorage.setItem('userRole', 'projectManager');
    setupRealtimeSubscription();
    startPolling('projectManager');
    storeFetchPurchases('projectManager');

    return () => {
      stopPolling();
      cleanupRealtimeSubscription();
    };
  }, [setupRealtimeSubscription, cleanupRealtimeSubscription, storeFetchPurchases]);

  // Handlers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await storeFetchPurchases('projectManager');
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleApprove = (purchaseId: number) => {
    setApprovalAction({ purchaseId, action: 'approve' });
    setShowConfirmDialog(true);
  };

  const handleReject = (purchaseId: number) => {
    setApprovalAction({ purchaseId, action: 'reject' });
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = async () => {
    if (!approvalAction) return;

    try {
      if (approvalAction.action === 'approve') {
        await projectManagerService.approvePurchase(approvalAction.purchaseId, {
          comments: 'Approved by Project Manager',
          project_manager_status: 'approved'
        });
        toast.success('Purchase approved successfully');
      } else {
        await projectManagerService.rejectPurchase(approvalAction.purchaseId, {
          comments: 'Rejected by Project Manager',
          project_manager_status: 'rejected'
        });
        toast.success('Purchase rejected successfully');
      }
      storeFetchPurchases('projectManager');
    } catch (error) {
      console.error('Action failed:', error);
      toast.error('Failed to process action');
    } finally {
      setShowConfirmDialog(false);
      setApprovalAction(null);
    }
  };

  const handleViewDetails = (purchaseId: number) => {
    const purchase = purchases.find(p => p.purchase_id === purchaseId);
    if (purchase) {
      setSelectedPurchase(purchase);
      setShowDetailsModal(true);
    }
  };

  const handleExport = () => {
    toast.info('Export functionality coming soon');
  };

  // Helper functions
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
    return priorityFilter !== 'all' ||
           projectFilter !== 'all' ||
           locationFilter !== 'all' ||
           dateFilter !== 'all';
  };

  const clearFilters = () => {
    setPriorityFilter('all');
    setProjectFilter('all');
    setLocationFilter('all');
    setDateFilter('all');
  };

  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
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
            <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
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
              { id: 'approved', title: 'Approved', color: 'bg-green-100 border-green-300', icon: CheckCircle },
              { id: 'rejected', title: 'Rejected', color: 'bg-red-100 border-red-300', icon: XCircle },
              { id: 'under_review', title: 'Under Review', color: 'bg-blue-100 border-blue-300', icon: BarChart3 }
            ]}
            onApprove={handleApprove}
            onReject={handleReject}
            onViewDetails={handleViewDetails}
            draggable={false}
          />
        );

      case 'split':
        return (
          <SplitView
            data={transformToSplitData(filteredPurchases)}
            onApprove={handleApprove}
            onReject={handleReject}
            onViewDetails={handleViewDetails}
            resizable={true}
            renderDetails={(item) => (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Purchase Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Purpose:</span>
                        <span className="font-medium">{item.subtitle}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-medium">{item.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Project:</span>
                        <span className="font-medium">{item.project_id ? `Project ${item.project_id}` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-bold text-green-600">AED {item.amount?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Items:</span>
                        <span className="font-medium">{item.materials?.length || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Approval Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Procurement:</span>
                        <Badge className={item.procurement_status === 'approved' ? 'bg-green-100' : 'bg-yellow-100'}>
                          {item.procurement_status || 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Project Manager:</span>
                        <Badge className={item.status === 'approved' ? 'bg-green-100' : item.status === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'}>
                          {item.status || 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Estimation:</span>
                        <Badge className={item.estimation_status === 'approved' ? 'bg-green-100' : 'bg-gray-100'}>
                          {item.estimation_status || 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {item.materials && item.materials.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Materials ({item.materials.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {item.materials.slice(0, 5).map((mat: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">{mat.item_name}</span>
                            <span className="font-medium">Qty: {mat.quantity} {mat.unit}</span>
                          </div>
                        ))}
                        {item.materials.length > 5 && (
                          <p className="text-xs text-gray-500 mt-2">
                            And {item.materials.length - 5} more items...
                          </p>
                        )}
                      </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredPurchases.map((purchase) => (
                <PurchaseApprovalCard
                  key={purchase.purchase_id}
                  purchase={purchase}
                  onApprove={() => handleApprove(purchase.purchase_id)}
                  onReject={() => handleReject(purchase.purchase_id)}
                  onViewDetails={() => handleViewDetails(purchase.purchase_id)}
                />
              ))}
            </AnimatePresence>
          </div>
        );
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 border border-blue-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-lg shadow-md">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Project Manager Hub</h1>
                <p className="text-gray-600 mt-1">Manage project purchases and approvals</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
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
          </div>
        </motion.div>
      </div>

      {/* Metrics Display - Compact Carousel */}
      <MetricsCarousel metrics={metrics} formatCurrency={formatCurrency} />

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
              availableViews={['split', 'table', 'kanban', 'cards']}
              variant="buttons"
            />
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className={`flex items-center gap-2 ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters() && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 ml-1">
                  {[priorityFilter, projectFilter, locationFilter, dateFilter].filter(f => f !== 'all').length}
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
                  {/* Priority Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Priority</label>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Priorities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
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
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            All ({purchases.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({metrics.pendingCount})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Approved ({metrics.approvedCount})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Rejected ({metrics.rejectedCount})
          </TabsTrigger>
        </TabsList>

        {/* Render the same view for all tabs */}
        {['all', 'pending', 'approved', 'rejected'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {renderPurchaseView()}
          </TabsContent>
        ))}
      </Tabs>

      {/* Modals */}
      <PurchaseDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        purchase={selectedPurchase}
      />

      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmAction}
        title={approvalAction?.action === 'approve' ? 'Approve Purchase' : 'Reject Purchase'}
        message={`Are you sure you want to ${approvalAction?.action} this purchase request?`}
        confirmText={approvalAction?.action === 'approve' ? 'Approve' : 'Reject'}
        confirmVariant={approvalAction?.action === 'approve' ? 'default' : 'destructive'}
      />
    </div>
  );
};

export default ProjectManagerHub;