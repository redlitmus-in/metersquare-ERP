/**
 * Project Manager Hub Page
 * Main workspace for Project Manager role
 * Following the standardized hub implementation pattern
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  RefreshCw, Download, Search, Filter, LayoutDashboard, 
  Package, CheckSquare, BarChart3, Bell, Settings,
  Clock, CheckCircle, XCircle, AlertTriangle, FileText,
  TrendingUp, Users, Calendar, X
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
import { AnimatePresence } from 'framer-motion';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

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
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`${metric.bgColor} rounded-lg p-4 border border-gray-100`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{metric.title}</p>
        <p className="text-xl font-bold text-gray-900 mt-1">{metric.value}</p>
        {metric.trend && (
          <div className="flex items-center mt-1">
            <TrendingUp className={`h-4 w-4 ${
              metric.trendType === 'up' ? 'text-green-600' : 
              metric.trendType === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`} />
            <span className={`text-sm ml-1 ${
              metric.trendType === 'up' ? 'text-green-600' : 
              metric.trendType === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {metric.trend}
            </span>
          </div>
        )}
      </div>
      <div className={`${metric.iconColor} p-2 rounded-lg`}>
        {metric.icon}
      </div>
    </div>
  </motion.div>
);

const ProjectManagerHub: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [activeTab, setActiveTab] = useState('pending');
  const [purchases, setPurchases] = useState<ProcurementPurchase[]>([]);
  const [estimationRejectedPurchases, setEstimationRejectedPurchases] = useState<ProcurementPurchase[]>([]);
  const [completedPurchases, setCompletedPurchases] = useState<ProcurementPurchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<ProcurementPurchase[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
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

  // Fetch purchases from API
  const fetchPurchases = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');
      const response = await projectManagerService.getProcurementApprovedPurchases();
      
      if (response.success) {
        const allPurchases = response.approved_procurement_purchases || [];
        
        // Map purchases to include latest_status from status_history
        const mappedPurchases = allPurchases.map((p: any) => {
          // Get the latest status from status_history
          const latestStatusEntry = p.status_history && p.status_history.length > 0 
            ? p.status_history[p.status_history.length - 1]
            : null;
          
          return {
            ...p,
            latest_status: latestStatusEntry ? {
              status: latestStatusEntry.status,
              sender: latestStatusEntry.sender,
              receiver: latestStatusEntry.receiver,
              date: latestStatusEntry.date
            } : undefined
          };
        });
        
        // Separate completed purchases from active ones
        const completed = mappedPurchases.filter((p: ProcurementPurchase) => {
          const isCompleted = p.latest_status?.status === 'completed' || 
                             p.latest_status?.status === 'complete' ||
                             p.accounts_acknowledgement === true ||
                             p.current_workflow_status === 'completed';
          return isCompleted;
        });
        
        const active = mappedPurchases.filter((p: ProcurementPurchase) => {
          const isCompleted = p.latest_status?.status === 'completed' || 
                             p.latest_status?.status === 'complete' ||
                             p.accounts_acknowledgement === true ||
                             p.current_workflow_status === 'completed';
          return !isCompleted;
        });
        
        setPurchases(active);
        setCompletedPurchases(completed);
        
        // Filter estimation rejected purchases to exclude those rejected by PM
        // Only show purchases that were approved by PM but rejected by Estimation
        const estimationRejectionsMapped = (response.estimation_pm_rejections || []).map((p: any) => {
          // Get the latest status from status_history
          const latestStatusEntry = p.status_history && p.status_history.length > 0 
            ? p.status_history[p.status_history.length - 1]
            : null;
          
          return {
            ...p,
            latest_status: latestStatusEntry ? {
              status: latestStatusEntry.status,
              sender: latestStatusEntry.sender,
              receiver: latestStatusEntry.receiver,
              date: latestStatusEntry.date
            } : undefined
          };
        });
        
        const estimationRejections = estimationRejectionsMapped.filter(
          (purchase: ProcurementPurchase) => {
            // Exclude completed purchases
            const isCompleted = purchase.latest_status?.status === 'completed' || 
                               purchase.latest_status?.status === 'complete' ||
                               purchase.accounts_acknowledgement === true ||
                               purchase.current_workflow_status === 'completed';
            if (isCompleted) return false;
            
            // Only include purchases where PM approved but Estimation rejected
            // Exclude purchases where PM rejected (pm_status === 'rejected')
            return purchase.pm_status !== 'rejected';
          }
        );
        setEstimationRejectedPurchases(estimationRejections);
        
        // Calculate metrics from the response
        const metricsData: MetricCard[] = [
          {
            title: 'Total Purchases',
            value: response.total_approved_procurement_purchases || 0,
            icon: <Package className="h-5 w-5 text-blue-600" />,
            bgColor: 'bg-blue-50',
            iconColor: 'bg-blue-100',
            trend: '+12%',
            trendType: 'up'
          },
          {
            title: 'Pending Approvals',
            value: response.summary?.workflow_status_counts?.pending_pm_review || 0,
            icon: <Clock className="h-5 w-5 text-yellow-600" />,
            bgColor: 'bg-yellow-50',
            iconColor: 'bg-yellow-100',
            trend: '-5%',
            trendType: 'down'
          },
          {
            title: 'Approved',
            value: response.summary?.workflow_status_counts?.pm_approved || 0,
            icon: <CheckCircle className="h-5 w-5 text-green-600" />,
            bgColor: 'bg-green-50',
            iconColor: 'bg-green-100',
            trend: '+8%',
            trendType: 'up'
          },
          {
            title: 'Rejected',
            value: response.summary?.workflow_status_counts?.pm_rejected || 0,
            icon: <XCircle className="h-5 w-5 text-red-600" />,
            bgColor: 'bg-red-50',
            iconColor: 'bg-red-100',
            trend: '-2%',
            trendType: 'down'
          },
          {
            title: 'Completed',
            value: completed.length || 0,
            icon: <FileText className="h-5 w-5 text-blue-600" />,
            bgColor: 'bg-blue-50',
            iconColor: 'bg-blue-100',
            trend: '+10%',
            trendType: 'up'
          },
          {
            title: 'Total Value',
            value: `AED ${(response.summary?.financial_summary?.total_value || 0).toLocaleString()}`,
            icon: <TrendingUp className="h-5 w-5 text-indigo-600" />,
            bgColor: 'bg-indigo-50',
            iconColor: 'bg-indigo-100',
            trend: '+15%',
            trendType: 'up'
          }
        ];
        
        setMetrics(metricsData);
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
      
      // Set error state
      setHasError(true);
      
      // Provide fallback data when API fails
      setPurchases([]);
      setEstimationRejectedPurchases([]);
      setCompletedPurchases([]);
      
      // Set default metrics when API fails
      const fallbackMetrics: MetricCard[] = [
        {
          title: 'Total Purchases',
          value: 0,
          icon: <Package className="h-5 w-5 text-blue-600" />,
          bgColor: 'bg-blue-50',
          iconColor: 'bg-blue-100',
          trend: 'N/A',
          trendType: 'neutral'
        },
        {
          title: 'Pending Approvals',
          value: 0,
          icon: <Clock className="h-5 w-5 text-yellow-600" />,
          bgColor: 'bg-yellow-50',
          iconColor: 'bg-yellow-100',
          trend: 'N/A',
          trendType: 'neutral'
        },
        {
          title: 'Approved',
          value: 0,
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          bgColor: 'bg-green-50',
          iconColor: 'bg-green-100',
          trend: 'N/A',
          trendType: 'neutral'
        },
        {
          title: 'Rejected',
          value: 0,
          icon: <XCircle className="h-5 w-5 text-red-600" />,
          bgColor: 'bg-red-50',
          iconColor: 'bg-red-100',
          trend: 'N/A',
          trendType: 'neutral'
        }
      ];
      
      setMetrics(fallbackMetrics);
      
      // Set error message based on error type
      let message = 'An unknown error occurred';
      if (error instanceof Error && error.message.includes('500')) {
        message = 'Server is temporarily unavailable. Please try again later.';
      } else if (error instanceof Error && error.message.includes('Network Error')) {
        message = 'Network connection error. Please check your internet connection.';
      } else {
        message = 'Failed to fetch purchase requests. Please try again.';
      }
      
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Retry function
  const handleRetry = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases, refreshKey]);

  // Filter purchases based on active tab and search
  useEffect(() => {
    let filtered: ProcurementPurchase[] = [];

    // Filter by status based on active tab
    switch (activeTab) {
      case 'pending':
        filtered = [...purchases].filter(p => !p.pm_status || p.pm_status === 'pending');
        break;
      case 'approved':
        filtered = [...purchases].filter(p => p.pm_status === 'approved');
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
        
        // Refresh data
        setRefreshKey(prev => prev + 1);
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
        
        // Refresh data
        setRefreshKey(prev => prev + 1);
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
        setRefreshKey(prev => prev + 1);
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
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Manager Hub</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage purchase approvals and project workflows
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {metrics.map((metric, index) => (
            <MetricCardComponent key={index} metric={metric} />
          ))}
        </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredPurchases.map((purchase) => (
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