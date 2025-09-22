import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import PurchaseCard from '../components/PurchaseCard';
import PurchaseDetailsModal from '../components/PurchaseDetailsModal';
import EditPurchaseModal from '../components/EditPurchaseModal';
import { procurementService, Purchase } from '../services/procurementService';
import usePurchaseStore, { startPolling, stopPolling } from '@/store/purchaseStore';

import {
  Package,
  Users,
  Banknote,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
  Building2,
  ShoppingCart,
  TrendingDown,
  Award,
  Target,
  BarChart3,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  FileDown,
  SlidersHorizontal,
  DollarSign,
  Calendar,
  ArrowUpDown,
  MapPin
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { exportToPDF, exportToExcel } from '@/utils/exportUtils';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  color: string;
  trend: 'up' | 'down';
}

// Procurement Metrics Carousel Component
const ProcurementMetricsCarousel: React.FC<{ metrics: MetricCard[] }> = ({ metrics }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Transform metrics to carousel format
  const metricCards = metrics.map(metric => {
    const colorMap: Record<string, string> = {
      'bg-green-500': 'bg-green-50 border-green-200 text-green-700',
      'bg-red-500': 'bg-red-50 border-red-200 text-red-700',
      'bg-yellow-500': 'bg-yellow-50 border-yellow-200 text-yellow-700',
      'bg-blue-500': 'bg-blue-50 border-blue-200 text-blue-700',
      'bg-purple-500': 'bg-purple-50 border-purple-200 text-purple-700',
      'bg-orange-500': 'bg-orange-50 border-orange-200 text-orange-700',
      'bg-indigo-500': 'bg-indigo-50 border-indigo-200 text-indigo-700',
      'bg-emerald-500': 'bg-emerald-50 border-emerald-200 text-emerald-700'
    };

    const bgIconMap: Record<string, string> = {
      'bg-green-500': 'bg-green-100',
      'bg-red-500': 'bg-red-100',
      'bg-yellow-500': 'bg-yellow-100',
      'bg-blue-500': 'bg-blue-100',
      'bg-purple-500': 'bg-purple-100',
      'bg-orange-500': 'bg-orange-100',
      'bg-indigo-500': 'bg-indigo-100',
      'bg-emerald-500': 'bg-emerald-100'
    };

    const changeColorMap: Record<string, string> = {
      'bg-green-500': 'text-green-600',
      'bg-red-500': 'text-red-600',
      'bg-yellow-500': 'text-yellow-600',
      'bg-blue-500': 'text-blue-600',
      'bg-purple-500': 'text-purple-600',
      'bg-orange-500': 'text-orange-600',
      'bg-indigo-500': 'text-indigo-600',
      'bg-emerald-500': 'text-emerald-600'
    };

    return {
      title: metric.title.replace(' Requisitions', '').replace('Total ', ''),
      value: metric.value,
      icon: metric.icon,
      color: colorMap[metric.color] || 'bg-gray-50 border-gray-200 text-gray-700',
      bgIcon: bgIconMap[metric.color] || 'bg-gray-100',
      change: metric.trend === 'up' ? `+${Math.abs(metric.change)}%` : `-${Math.abs(metric.change)}%`,
      changeColor: metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
    };
  });

  // Add more metrics if less than 8
  while (metricCards.length < 8) {
    metricCards.push({
      title: 'In Progress',
      value: Math.floor(Math.random() * 10),
      icon: Clock,
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      bgIcon: 'bg-indigo-100',
      change: '+3%',
      changeColor: 'text-indigo-600'
    });
  }

  // Auto-rotate carousel
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % Math.max(1, metricCards.length - 3));
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [metricCards.length]);

  // Handle manual navigation
  const handleNext = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, metricCards.length - 3));
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % Math.max(1, metricCards.length - 3));
    }, 3000);
  };

  const handlePrev = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrentIndex((prev) => (prev - 1 + Math.max(1, metricCards.length - 3)) % Math.max(1, metricCards.length - 3));
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % Math.max(1, metricCards.length - 3));
    }, 3000);
  };

  // Get visible cards (show 4 at a time)
  const visibleCards = metricCards.slice(currentIndex, currentIndex + 4);
  if (visibleCards.length < 4) {
    visibleCards.push(...metricCards.slice(0, 4 - visibleCards.length));
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
                  className="flex-1 min-w-0"
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
          {Array.from({ length: Math.max(1, metricCards.length - 3) }).map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setCurrentIndex(index);
                intervalRef.current = setInterval(() => {
                  setCurrentIndex(prev => (prev + 1) % Math.max(1, metricCards.length - 3));
                }, 3000);
              }}
              className={`transition-all ${index === currentIndex
                ? 'w-6 h-1.5 bg-red-500 rounded-full'
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

const ProcurementHub: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userRole = (user as any)?.role || 'procurement';
  const userName = (user as any)?.full_name || (user as any)?.name || '';

  // State Management
  const [activeTab, setActiveTab] = useState('pending'); // Changed default to 'pending'
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterAmountRange, setFilterAmountRange] = useState({ min: '', max: '' });
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
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

  const purchases = getPurchasesForRole('procurement') as Purchase[];
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<'details' | 'history'>('details');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [pmEmailedPRs, setPmEmailedPRs] = useState<Set<number>>(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [sendingEmailIds, setSendingEmailIds] = useState<Set<number>>(new Set());
  const [resendingToPMIds, setResendingToPMIds] = useState<Set<number>>(new Set());

  // Check for real-time status
  const isRealtime = lastFetchTime && Date.now() - lastFetchTime.getTime() < 15000;

  // Confirmation Dialog for email
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    purchaseId: number | null;
    message: string;
    isLoading?: boolean;
  }>({
    isOpen: false,
    purchaseId: null,
    message: '',
    isLoading: false
  });

  // Initialize real-time updates on mount
  useEffect(() => {
    // Store user role for the purchase store
    localStorage.setItem('userRole', 'procurement');

    // Setup real-time subscriptions
    setupRealtimeSubscription();

    // Start polling for updates
    startPolling('procurement');

    // Initial fetch
    storeFetchPurchases('procurement');

    // Cleanup on unmount
    return () => {
      stopPolling();
      cleanupRealtimeSubscription();
    };
  }, [setupRealtimeSubscription, cleanupRealtimeSubscription, storeFetchPurchases]);

  // Filter purchases when filters change
  useEffect(() => {
    filterPurchases();
  }, [activeTab, filterPriority, filterProject, filterLocation, filterAmountRange, filterDateRange, sortBy, sortOrder, purchases]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await storeFetchPurchases('procurement');
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  // Update metrics and email tracking when purchases change
  useEffect(() => {
    if (purchases && purchases.length >= 0) {
      // Track emails sent to PM
      const emailedSet = new Set<number>();
      purchases.forEach((p: Purchase) => {
        if (p.latest_status === 'approved' || p.approvals?.action?.some((a: any) =>
          a.role === 'procurement' && a.status === 'approved'
        )) {
          emailedSet.add(p.purchase_id);
        }
      });
      setPmEmailedPRs(emailedSet);

      // Calculate metrics from purchase data
      const metricsData = {
        totalPurchaseValue: purchases.reduce((sum, p) => {
          const amount = p.materials?.reduce((s, m) => s + (m.quantity * m.cost), 0) || 0;
          return sum + amount;
        }, 0),
        totalRequisitions: purchases.length,
        pendingRequisitions: purchases.filter(p => !p.latest_status || p.latest_status === 'pending').length,
        vendorPerformance: 95 // Default vendor performance
      };

      // Set metrics
      setMetrics([
        {
          title: 'Total Purchase Value',
          value: `AED ${(metricsData?.totalPurchaseValue || 0).toLocaleString()}`,
          change: 12.5,
          icon: Banknote,
          color: 'bg-green-500',
          trend: 'up'
        },
        {
          title: 'Requisitions to Process',
          value: metricsData?.totalRequisitions || 0,
          change: -5.2,
          icon: FileText,
          color: 'bg-red-500',
          trend: 'down'
        },
        {
          title: 'Pending Requisitions',
          value: metricsData?.pendingRequisitions || 0,
          change: 8.1,
          icon: Clock,
          color: 'bg-blue-500',
          trend: 'up'
        },
        {
          title: 'Vendor Performance',
          value: `${metricsData?.vendorPerformance || 0}%`,
          change: 3.8,
          icon: Award,
          color: 'bg-purple-500',
          trend: 'up'
        }
      ]);
    }
  }, [purchases]);

  // Keep fetchPurchases for legacy calls (email send, resend, etc.)
  const fetchPurchases = async () => {
    await storeFetchPurchases('procurement');
  };

  const filterPurchases = () => {
    let filtered = [...purchases];
    
    // Sort by most recent activity - check multiple date fields
    filtered.sort((a, b) => {
      // Get the most recent date for each purchase
      const getLatestDate = (p: Purchase) => {
        const dates = [
          p.last_modified_at,
          p.status_date,
          p.decision_date,
          p.created_at
        ].filter(d => d).map(d => new Date(d!).getTime());
        
        return Math.max(...dates, new Date(p.created_at).getTime());
      };
      
      const dateA = getLatestDate(a);
      const dateB = getLatestDate(b);
      
      // Sort by most recent first
      return dateB - dateA;
    });

    // Apply priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(purchase => {
        const priority = purchase.materials?.[0]?.priority?.toLowerCase() || 'medium';
        return priority === filterPriority;
      });
    }

    // Apply project filter
    if (filterProject !== 'all') {
      filtered = filtered.filter(purchase => 
        purchase.project_id === filterProject
      );
    }

    // Apply location filter
    if (filterLocation !== 'all') {
      filtered = filtered.filter(purchase => 
        purchase.site_location === filterLocation
      );
    }

    // Apply amount range filter
    if (filterAmountRange.min || filterAmountRange.max) {
      filtered = filtered.filter(purchase => {
        const amount = purchase.materials?.reduce((sum, m) => sum + (m.quantity * m.cost), 0) || 0;
        const min = filterAmountRange.min ? parseFloat(filterAmountRange.min) : 0;
        const max = filterAmountRange.max ? parseFloat(filterAmountRange.max) : Infinity;
        return amount >= min && amount <= max;
      });
    }

    // Apply date range filter
    if (filterDateRange !== 'all') {
      const today = new Date();
      filtered = filtered.filter(purchase => {
        const purchaseDate = new Date(purchase.created_at);
        const daysDiff = Math.ceil((today.getTime() - purchaseDate.getTime()) / (1000 * 3600 * 24));
        
        switch (filterDateRange) {
          case 'today':
            return daysDiff === 0;
          case 'week':
            return daysDiff <= 7;
          case 'month':
            return daysDiff <= 30;
          default:
            return true;
        }
      });
    }

    // Apply tab filter based on actual status from backend
    switch (activeTab) {
      case 'pending':
        // Show ONLY true pending items, NOT rejections
        filtered = filtered.filter(p => {
          const status = p.sender_latest_status || p.latest_status || p.status || 'pending';

          // Exclude completed items
          if (status === 'completed' || status === 'delivered' || status === 'closed' || status === 'finished') {
            return false;
          }

          // Exclude ALL rejected items - they should go to their respective rejection tabs
          if (status === 'rejected') {
            return false;
          }

          // Check if this purchase was rejected by PM or Estimation (need revision from procurement)
          // But NOT TD rejections (those should show in approved tab)
          const hasProcurementRejection = p.project_manager_status === 'rejected' ||
                                         (p.estimation_status === 'rejected' &&
                                          p.status_receiver === 'procurement') ||
                                         p.accounts_status === 'rejected' ||
                                         (p.rejected_status && p.status_receiver === 'procurement');

          if (hasProcurementRejection) {
            return false;
          }

          // Only show true pending items that haven't been sent to PM
          return (status === 'pending' || status === 'draft') && !pmEmailedPRs.has(p.purchase_id);
        });
        break;
        
      case 'approved':
        // Show items that are approved but NOT completed
        filtered = filtered.filter(p => {
          const status = p.sender_latest_status || p.latest_status || p.status;

          // Exclude completed items
          if (status === 'completed' || status === 'delivered' || status === 'closed' || status === 'finished') {
            return false;
          }

          // Check if it has accounts acknowledgement (which means it's completed)
          if (p.approvals?.action?.some((a: any) =>
            a.role === 'accounts' && (a.status === 'completed' || a.status === 'acknowledged')
          )) {
            return false;
          }

          // Include TD rejected purchases in approved tab (since procurement already approved them)
          const isTDRejected = p.technical_director_status === 'rejected' ||
                              (p.status_sender === 'technicalDirector' && p.status === 'rejected');

          // Include items that have been approved by procurement, even if rejected by others
          // This ensures purchases with mixed approvals/rejections remain visible
          const hasAnyApproval = p.approvals?.action?.some((a: any) =>
            a.status === 'approved'
          );

          const procurementApproved = pmEmailedPRs.has(p.purchase_id) ||
                                     (p.status_sender === 'procurement' &&
                                      (p.sender_latest_status === 'approved' || status === 'approved'));

          // Include approved items that haven't reached completion
          // Include TD rejected items (they were approved by procurement before going to TD)
          return status === 'approved' ||
                 procurementApproved ||
                 hasAnyApproval ||
                 isTDRejected ||
                 (p.status_receiver === 'projectManager' && p.status_sender === 'procurement') ||
                 (p.status_receiver === 'accounts' && status !== 'completed') ||
                 (p.status_receiver === 'technicalDirector' && status === 'approved') ||
                 (p.status_receiver === 'estimation' && p.status_sender === 'technicalDirector');
        });
        break;
        
      case 'pm_rejected':
        // Filter for purchases rejected by PM that need revision
        filtered = filtered.filter(p => {
          const status = p.sender_latest_status || p.latest_status || p.status;

          // Exclude completed items
          if (status === 'completed' || status === 'delivered' || status === 'closed' || status === 'finished') {
            return false;
          }

          // Check if it was rejected by project manager specifically
          const hasRejection = p.approvals?.action?.some((a: any) =>
            a.role === 'projectManager' &&
            a.status === 'rejected'
          );

          // Check the latest status fields - looking for PM rejections
          const rejectedByPM = (
            // PM rejected and sent back to procurement
            (p.status_role === 'projectManager' && p.sender_latest_status === 'rejected') ||
            (p.status_sender === 'projectManager' && p.sender_latest_status === 'rejected') ||
            (p.status_sender === 'projectManager' && p.latest_status === 'rejected')
          );

          return hasRejection || rejectedByPM;
        });
        break;
        
      case 'est_rejected':
        // Filter for purchases rejected by Estimation with COST flag only
        filtered = filtered.filter(p => {
          const status = p.sender_latest_status || p.latest_status || p.status;

          // Exclude completed items
          if (status === 'completed' || status === 'delivered' || status === 'closed' || status === 'finished') {
            return false;
          }

          // Check if it was rejected by estimation specifically
          const hasRejection = p.approvals?.action?.some((a: any) =>
            a.role === 'estimation' &&
            a.status === 'rejected'
          );

          // Check the latest status fields - looking for Estimation rejections
          const rejectedByEst = (
            // Estimation rejected and sent back to procurement
            (p.status_role === 'estimation' && p.sender_latest_status === 'rejected') ||
            (p.status_sender === 'estimation' && p.sender_latest_status === 'rejected') ||
            (p.status_sender === 'estimation' && p.latest_status === 'rejected') ||
            (p.status_sender === 'estimation' && p.status_receiver === 'procurement' && status === 'rejected')
          );

          // IMPORTANT: Only show COST flag rejections in Procurement
          // PM flag rejections should go to Project Manager
          // Check multiple places for reject_category
          const isCostRejection = p.rejected_status?.reject_category === 'cost' ||
                                 p.status_info?.reject_category === 'cost' ||
                                 p.reject_category === 'cost' ||
                                 (p.status_receiver === 'procurement' && p.status_sender === 'estimation' && status === 'rejected') ||
                                 p.approvals?.action?.some((a: any) =>
                                   a.role === 'estimation' &&
                                   a.status === 'rejected' &&
                                   a.reject_category === 'cost'
                                 );

          return (hasRejection || rejectedByEst) && (isCostRejection || (rejectedByEst && p.status_receiver === 'procurement'));
        });
        break;
        
      case 'completed':
        // Filter for fully completed purchases (with accounts acknowledgement)
        filtered = filtered.filter(p => {
          const status = p.sender_latest_status || p.latest_status || p.status;

          // Check if status is explicitly marked as completed
          if (status === 'completed' || status === 'delivered' || status === 'closed' || status === 'finished') {
            return true;
          }

          // Check if it has accounts acknowledgement (final step of completion)
          if (p.approvals?.action?.some((a: any) =>
            a.role === 'accounts' && (a.status === 'completed' || a.status === 'acknowledged')
          )) {
            return true;
          }

          // Check if the last approval action is from accounts with completion status
          const lastApproval = p.approvals?.action?.[p.approvals.action.length - 1];
          if (lastApproval?.role === 'accounts' &&
              (lastApproval.status === 'completed' || lastApproval.comments?.includes('completed'))) {
            return true;
          }

          return false;
        });
        break;
        
      default:
        // Default to pending
        filtered = filtered.filter(p => {
          const status = p.sender_latest_status || p.latest_status || p.status || 'pending';
          return status === 'pending' && !pmEmailedPRs.has(p.purchase_id);
        });
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'amount':
          aValue = a.materials?.reduce((sum, m) => sum + (m.quantity * m.cost), 0) || 0;
          bValue = b.materials?.reduce((sum, m) => sum + (m.quantity * m.cost), 0) || 0;
          break;
        case 'priority':
          const priorityOrder: Record<string, number> = { 'high': 3, 'medium': 2, 'low': 1 };
          aValue = priorityOrder[a.materials?.[0]?.priority?.toLowerCase() || 'medium'] || 2;
          bValue = priorityOrder[b.materials?.[0]?.priority?.toLowerCase() || 'medium'] || 2;
          break;
        case 'project':
          aValue = a.project_id?.toLowerCase() || '';
          bValue = b.project_id?.toLowerCase() || '';
          break;
        case 'location':
          aValue = a.site_location?.toLowerCase() || '';
          bValue = b.site_location?.toLowerCase() || '';
          break;
        default:
          aValue = a.purchase_id;
          bValue = b.purchase_id;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

    setFilteredPurchases(filtered);
  };

  // Action Handlers
  const handleViewDetails = (purchaseId: number) => {
    setSelectedPurchaseId(purchaseId);
    setModalMode('details');
    setShowDetailsModal(true);
  };

  const handleViewHistory = (purchaseId: number) => {
    setSelectedPurchaseId(purchaseId);
    setModalMode('history');
    setShowDetailsModal(true);
  };

  const handleEdit = (purchaseId: number) => {
    // Find the purchase to edit
    const purchaseToEdit = purchases.find(p => p.purchase_id === purchaseId);
    if (!purchaseToEdit) {
      toast.error('Purchase not found');
      return;
    }
    
    // Check if purchase can be edited by procurement
    // Procurement can edit purchases that are pending or rejected by PM/Estimation
    const status = purchaseToEdit.sender_latest_status || purchaseToEdit.latest_status || purchaseToEdit.status;
    
    // Allow editing if:
    // 1. Status is pending (not yet sent to PM)
    // 2. Rejected by PM (needs revision)
    // 3. Rejected by Estimation (needs revision)
    const canEdit = (
      status === 'pending' ||
      status === 'rejected' ||
      activeTab === 'pm_rejected' ||
      activeTab === 'est_rejected'
    );
    
    if (!canEdit && status === 'approved') {
      toast.error('Cannot edit approved purchase requests');
      return;
    }
    
    if (!canEdit && pmEmailedPRs.has(purchaseId)) {
      toast.error('Cannot edit purchase requests that have been sent for approval');
      return;
    }
    
    // Open edit modal
    setEditingPurchase(purchaseToEdit);
    setShowEditModal(true);
  };

  const handleSendEmail = (purchaseId: number) => {
    // Find the purchase to check if it's a rejection
    const purchase = purchases.find(p => p.purchase_id === purchaseId);
    const isRejection = purchase && (
      purchase.project_manager_status === 'rejected' ||
      purchase.estimation_status === 'rejected' ||
      purchase.status === 'rejected'
    );

    setConfirmDialog({
      isOpen: true,
      purchaseId,
      message: isRejection
        ? 'Resend this purchase request to Project Manager after addressing the rejection issues?'
        : 'Send this purchase request to Project Manager for approval?'
    });
  };

  const handleResendToPM = async (purchaseId: number) => {
    try {
      // Add to resending state
      setResendingToPMIds(prev => new Set(prev).add(purchaseId));

      // Send back to Project Manager after estimation rejection
      await procurementService.sendApprovalEmail(purchaseId);
      toast.success('Purchase request resent to Project Manager for approval');

      // Refresh data
      await fetchPurchases();
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend email to Project Manager');
    } finally {
      // Remove from resending state
      setResendingToPMIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(purchaseId);
        return newSet;
      });
    }
  };

  const confirmAction = async () => {
    const { purchaseId } = confirmDialog;
    if (!purchaseId) return;

    try {
      // Set loading state for dialog button
      setConfirmDialog(prev => ({ ...prev, isLoading: true }));

      // Add to sending state
      setSendingEmailIds(prev => new Set(prev).add(purchaseId));

      // Check if this is a resend after rejection
      const purchase = purchases.find(p => p.purchase_id === purchaseId);
      const isRejection = purchase && (
        purchase.project_manager_status === 'rejected' ||
        purchase.estimation_status === 'rejected' ||
        purchase.status === 'rejected'
      );

      await procurementService.sendApprovalEmail(purchaseId);
      setPmEmailedPRs(prev => new Set(prev).add(purchaseId));
      toast.success(isRejection
        ? 'Purchase request resent to Project Manager for approval'
        : 'Purchase request sent to Project Manager for approval'
      );

      // Refresh data
      await fetchPurchases();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email');
    } finally {
      // Remove from sending state
      setSendingEmailIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(purchaseId);
        return newSet;
      });
      setConfirmDialog({ isOpen: false, purchaseId: null, message: '', isLoading: false });
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const dataToExport = filteredPurchases.length > 0 ? filteredPurchases : purchases;
      const exportTitle = `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Purchase Requests`;
      
      switch (format) {
        case 'pdf':
          await exportToPDF(dataToExport, exportTitle);
          toast.success('PDF exported successfully');
          break;
        case 'excel':
          await exportToExcel(dataToExport, exportTitle);
          toast.success('Excel file exported successfully');
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };


  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ModernLoadingSpinners variant="pulse-wave" size="lg" />
          <p className="text-gray-600 mt-4">Loading procurement data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl shadow-xl p-6 text-gray-800 border border-red-200"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur">
              <Package className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Procurement Hub
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Process purchase requisitions, manage vendor quotations, and handle approvals
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Export Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('pdf')}
                className="gap-1"
                title="Export as PDF"
              >
                <FileText className="w-4 h-4 text-red-600" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('excel')}
                className="gap-1"
                title="Export as Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                Excel
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Metrics Carousel */}
      <ProcurementMetricsCarousel metrics={metrics} />

      {/* Main Content */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-red-600" />
              Purchase Requisitions
            </CardTitle>
            
            {/* Filter and Sort Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <ArrowUpDown className="w-4 h-4" />
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <SlidersHorizontal className="w-4 h-4 mr-1" />
                {showAdvancedFilters ? 'Hide' : 'More'} Filters
              </Button>
            </div>
          </div>
          
          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-white/80 rounded-lg border border-red-200"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    Project
                  </label>
                  <Select value={filterProject} onValueChange={setFilterProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {[...new Set(purchases.map(p => p.project_id).filter(Boolean))].map(project => (
                        <SelectItem key={project} value={project}>{project}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Location
                  </label>
                  <Select value={filterLocation} onValueChange={setFilterLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {[...new Set(purchases.map(p => p.site_location).filter(Boolean))].map(location => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Date Range
                  </label>
                  <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Past Week</SelectItem>
                      <SelectItem value="month">Past Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    Amount Range (AED)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filterAmountRange.min}
                      onChange={(e) => setFilterAmountRange(prev => ({ ...prev, min: e.target.value }))}
                      className="text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filterAmountRange.max}
                      onChange={(e) => setFilterAmountRange(prev => ({ ...prev, max: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <div className="flex flex-wrap gap-2">
                  {(filterPriority !== 'all' || filterProject !== 'all' || filterLocation !== 'all' || filterDateRange !== 'all' || filterAmountRange.min || filterAmountRange.max) && (
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-sm text-gray-500">Active filters:</span>
                      {filterPriority !== 'all' && (
                        <Badge variant="secondary" className="text-xs">
                          Priority: {filterPriority}
                          <button 
                            className="ml-1 text-gray-400 hover:text-gray-600"
                            onClick={() => setFilterPriority('all')}
                          >
                            ×
                          </button>
                        </Badge>
                      )}
                      {filterProject !== 'all' && (
                        <Badge variant="secondary" className="text-xs">
                          Project: {filterProject}
                          <button 
                            className="ml-1 text-gray-400 hover:text-gray-600"
                            onClick={() => setFilterProject('all')}
                          >
                            ×
                          </button>
                        </Badge>
                      )}
                      {filterLocation !== 'all' && (
                        <Badge variant="secondary" className="text-xs">
                          Location: {filterLocation}
                          <button 
                            className="ml-1 text-gray-400 hover:text-gray-600"
                            onClick={() => setFilterLocation('all')}
                          >
                            ×
                          </button>
                        </Badge>
                      )}
                      {filterDateRange !== 'all' && (
                        <Badge variant="secondary" className="text-xs">
                          Date: {filterDateRange}
                          <button 
                            className="ml-1 text-gray-400 hover:text-gray-600"
                            onClick={() => setFilterDateRange('all')}
                          >
                            ×
                          </button>
                        </Badge>
                      )}
                      {(filterAmountRange.min || filterAmountRange.max) && (
                        <Badge variant="secondary" className="text-xs">
                          Amount: AED {filterAmountRange.min || '0'} - {filterAmountRange.max || '∞'}
                          <button 
                            className="ml-1 text-gray-400 hover:text-gray-600"
                            onClick={() => setFilterAmountRange({ min: '', max: '' })}
                          >
                            ×
                          </button>
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterPriority('all');
                    setFilterProject('all');
                    setFilterLocation('all');
                    setFilterDateRange('all');
                    setFilterAmountRange({ min: '', max: '' });
                    setSortBy('date');
                    setSortOrder('desc');
                  }}
                >
                  Clear All Filters
                </Button>
              </div>
            </motion.div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b px-6 pt-4">
              <TabsList className="grid grid-cols-5 w-full max-w-4xl">
                <TabsTrigger value="pending">
                  Pending ({purchases.filter(p => {
                    const status = p.sender_latest_status || p.latest_status || p.status || 'pending';
                    // Exclude completed items
                    if (status === 'completed' || status === 'delivered' || status === 'closed' || status === 'finished') {
                      return false;
                    }
                    return (status === 'pending' || status === 'draft') && !pmEmailedPRs.has(p.purchase_id);
                  }).length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved ({purchases.filter(p => {
                    const status = p.sender_latest_status || p.latest_status || p.status;
                    // Exclude completed items
                    if (status === 'completed' || status === 'delivered' || status === 'closed' || status === 'finished') {
                      return false;
                    }
                    // Check if it has accounts acknowledgement (which means it's completed)
                    if (p.approvals?.action?.some((a: any) =>
                      a.role === 'accounts' && (a.status === 'completed' || a.status === 'acknowledged')
                    )) {
                      return false;
                    }
                    return status === 'approved' ||
                           pmEmailedPRs.has(p.purchase_id) ||
                           (p.status_receiver === 'projectManager' && p.status_sender === 'procurement') ||
                           (p.status_receiver === 'accounts' && status !== 'completed') ||
                           (p.status_receiver === 'technicalDirector' && status === 'approved');
                  }).length})
                </TabsTrigger>
                <TabsTrigger value="pm_rejected" className="text-red-600 data-[state=active]:text-red-700 data-[state=active]:border-red-500">
                  PM Reject ({purchases.filter(p => {
                    const status = p.sender_latest_status || p.latest_status || p.status;
                    // Exclude completed items
                    if (status === 'completed' || status === 'delivered' || status === 'closed' || status === 'finished') {
                      return false;
                    }
                    const hasRejection = p.approvals?.action?.some((a: any) =>
                      a.role === 'projectManager' && a.status === 'rejected'
                    );
                    const rejectedByPM = (
                      (p.status_role === 'projectManager' && p.sender_latest_status === 'rejected') ||
                      (p.status_sender === 'projectManager' && p.sender_latest_status === 'rejected') ||
                      (p.status_sender === 'projectManager' && p.latest_status === 'rejected')
                    );
                    return hasRejection || rejectedByPM;
                  }).length})
                </TabsTrigger>
                <TabsTrigger value="est_rejected" className="text-blue-600 data-[state=active]:text-blue-700 data-[state=active]:border-blue-500">
                  Est Reject ({purchases.filter(p => {
                    const status = p.sender_latest_status || p.latest_status || p.status;
                    // Exclude completed items
                    if (status === 'completed' || status === 'delivered' || status === 'closed' || status === 'finished') {
                      return false;
                    }
                    const hasRejection = p.approvals?.action?.some((a: any) =>
                      a.role === 'estimation' && a.status === 'rejected'
                    );
                    const rejectedByEst = (
                      (p.status_role === 'estimation' && p.sender_latest_status === 'rejected') ||
                      (p.status_sender === 'estimation' && p.sender_latest_status === 'rejected') ||
                      (p.status_sender === 'estimation' && p.latest_status === 'rejected') ||
                      (p.status_sender === 'estimation' && p.status_receiver === 'procurement' && status === 'rejected')
                    );
                    // Only count COST flag rejections for Procurement
                    const isCostRejection = p.rejected_status?.reject_category === 'cost' ||
                                          p.status_info?.reject_category === 'cost' ||
                                          p.reject_category === 'cost' ||
                                          (p.status_receiver === 'procurement' && p.status_sender === 'estimation' && status === 'rejected') ||
                                          p.approvals?.action?.some((a: any) =>
                                            a.role === 'estimation' &&
                                            a.status === 'rejected' &&
                                            a.reject_category === 'cost'
                                          );
                    return (hasRejection || rejectedByEst) && (isCostRejection || (rejectedByEst && p.status_receiver === 'procurement'));
                  }).length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-green-600 data-[state=active]:text-green-700 data-[state=active]:border-green-500">
                  Completed ({purchases.filter(p => {
                    const status = p.sender_latest_status || p.latest_status || p.status;
                    // Check if status is explicitly marked as completed
                    if (status === 'completed' || status === 'delivered' || status === 'closed' || status === 'finished') {
                      return true;
                    }
                    // Check if it has accounts acknowledgement (final step of completion)
                    if (p.approvals?.action?.some((a: any) =>
                      a.role === 'accounts' && (a.status === 'completed' || a.status === 'acknowledged')
                    )) {
                      return true;
                    }
                    // Check if the last approval action is from accounts with completion status
                    const lastApproval = p.approvals?.action?.[p.approvals.action.length - 1];
                    if (lastApproval?.role === 'accounts' &&
                        (lastApproval.status === 'completed' || lastApproval.comments?.includes('completed'))) {
                      return true;
                    }
                    return false;
                  }).length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Purchase Cards Grid - 2 columns */}
            <TabsContent value={activeTab} className="p-6">
              {activeTab === 'pm_rejected' && filteredPurchases.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900">
                        These purchase requests were rejected by the Project Manager
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        Review the rejection reasons and make necessary revisions. You can resend these to PM after addressing the issues.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'est_rejected' && filteredPurchases.length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        These purchase requests were rejected by the Estimation team
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Review the technical specifications and cost estimates. You can resend these to Estimation after corrections.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'completed' && filteredPurchases.length > 0 && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        These purchase requests have been fully completed
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        These purchases have gone through the entire approval process and have been delivered/closed successfully.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {filteredPurchases.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredPurchases.map((purchase) => (
                    <PurchaseCard
                      key={purchase.purchase_id}
                      purchase={purchase}
                      onViewDetails={handleViewDetails}
                      onViewHistory={handleViewHistory}
                      onEdit={handleEdit}
                      onSendEmail={handleSendEmail}
                      onResendToPM={handleResendToPM}
                      onResendToEst={handleResendToPM}
                      emailSent={pmEmailedPRs.has(purchase.purchase_id)}
                      sendingEmail={sendingEmailIds.has(purchase.purchase_id)}
                      isLoading={resendingToPMIds.has(purchase.purchase_id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">
                    {activeTab === 'pm_rejected' 
                      ? 'No PM rejected requisitions found' 
                      : activeTab === 'est_rejected'
                      ? 'No Estimation rejected requisitions found'
                      : activeTab === 'completed'
                      ? 'No completed requisitions found'
                      : 'No purchase requisitions found'}
                  </p>
                  <p className="text-sm mt-1">
                    {(filterPriority !== 'all' || filterProject !== 'all' || filterLocation !== 'all' || filterDateRange !== 'all' || filterAmountRange.min || filterAmountRange.max)
                      ? 'Try adjusting your filter settings' 
                      : activeTab === 'pm_rejected'
                      ? 'Purchase requests rejected by PM will appear here for revision'
                      : activeTab === 'est_rejected'
                      ? 'Purchase requests rejected by Estimation will appear here for revision'
                      : activeTab === 'completed'
                      ? 'Fully completed/delivered purchase requests will appear here'
                      : 'Waiting for new purchase requisitions to process'}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <PurchaseDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedPurchaseId(null);
        }}
        purchaseId={selectedPurchaseId}
        mode={modalMode}
        activeTab={activeTab}
      />

      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmDialog.isOpen} 
        onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, isOpen: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send for Approval</DialogTitle>
            <DialogDescription>
              {confirmDialog.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={confirmDialog.isLoading}
              style={{ backgroundColor: confirmDialog.isLoading ? '#64748b' : '#243d8a' }}
              onMouseEnter={(e) => !confirmDialog.isLoading && (e.currentTarget.style.backgroundColor = '#1a2d66')}
              onMouseLeave={(e) => !confirmDialog.isLoading && (e.currentTarget.style.backgroundColor = '#243d8a')}
              className="text-white flex items-center gap-2"
            >
              {confirmDialog.isLoading ? (
                <>
                  <ModernLoadingSpinners variant="pulse-wave" size="sm" />
                  Sending...
                </>
              ) : (
                'Send to PM'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Purchase Modal */}
      <EditPurchaseModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingPurchase(null);
        }}
        purchase={editingPurchase}
        onSave={() => {
          // Remove from emailed set if it was edited
          if (editingPurchase) {
            setPmEmailedPRs(prev => {
              const newSet = new Set(prev);
              newSet.delete(editingPurchase.purchase_id);
              return newSet;
            });
          }
          setShowEditModal(false);
          setEditingPurchase(null);
          fetchPurchases(); // Refresh the list after saving
        }}
      />
    </div>
  );
};

export default ProcurementHub;