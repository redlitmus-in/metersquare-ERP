import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import PurchaseCard from '../components/PurchaseCard';
import PurchaseDetailsModal from '../components/PurchaseDetailsModal';
import EditPurchaseModal from '../components/EditPurchaseModal';
import { procurementService, Purchase } from '../services/procurementService';

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
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<'details' | 'history'>('details');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [pmEmailedPRs, setPmEmailedPRs] = useState<Set<number>>(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [sendingEmailIds, setSendingEmailIds] = useState<Set<number>>(new Set());
  const [resendingToPMIds, setResendingToPMIds] = useState<Set<number>>(new Set());

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

  // Fetch data on mount with delay to prevent duplicate calls
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPurchases();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Filter purchases when filters change
  useEffect(() => {
    filterPurchases();
  }, [activeTab, filterPriority, filterProject, filterLocation, filterAmountRange, filterDateRange, sortBy, sortOrder, purchases]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      
      // Fetch purchases and metrics separately with error handling
      let purchaseData: Purchase[] = [];
      let metricsData: any = {};
      
      try {
        purchaseData = await procurementService.getPurchases();
        setPurchases(purchaseData);

        // Track emails sent to PM
        const emailedSet = new Set<number>();
        purchaseData.forEach((p: Purchase) => {
          if (p.latest_status === 'approved' || p.approvals?.action?.some((a: any) =>
            a.role === 'procurement' && a.status === 'approved'
          )) {
            emailedSet.add(p.purchase_id);
          }
        });
        setPmEmailedPRs(emailedSet);
      } catch (error: any) {
        console.error('Error fetching purchases:', error);
        setPurchases([]);
        toast.error(error.message || 'Failed to fetch purchase requests');
      }

      // Calculate metrics from purchase data without calling dashboard API
      metricsData = {
        totalPurchaseValue: purchaseData.reduce((sum, p) => {
          const amount = p.materials?.reduce((s, m) => s + (m.quantity * m.cost), 0) || 0;
          return sum + amount;
        }, 0),
        totalRequisitions: purchaseData.length,
        pendingRequisitions: purchaseData.filter(p => !p.latest_status || p.latest_status === 'pending').length,
        vendorPerformance: 95 // Default vendor performance
      };

      // Set metrics with safe access
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
          value: metricsData?.totalRequisitions || purchaseData.length || 0,
          change: -5.2,
          icon: FileText,
          color: 'bg-red-500',
          trend: 'down'
        },
        {
          title: 'Pending Processing',
          value: metricsData?.pendingRequisitions || 0,
          change: 25.0,
          icon: Clock,
          color: 'bg-amber-500',
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
    } catch (error: any) {
      console.error('Unexpected error in fetchPurchases:', error);
      toast.error('An unexpected error occurred');
      
      // Set default empty state
      setPurchases([]);
      setMetrics([
        {
          title: 'Total Purchase Value',
          value: 'AED 0',
          change: 0,
          icon: Banknote,
          color: 'bg-green-500',
          trend: 'up'
        },
        {
          title: 'Requisitions to Process',
          value: 0,
          change: 0,
          icon: FileText,
          color: 'bg-red-500',
          trend: 'down'
        },
        {
          title: 'Pending Processing',
          value: 0,
          change: 0,
          icon: Clock,
          color: 'bg-amber-500',
          trend: 'up'
        },
        {
          title: 'Vendor Performance',
          value: '0%',
          change: 0,
          icon: Award,
          color: 'bg-purple-500',
          trend: 'up'
        }
      ]);
    } finally {
      setLoading(false);
    }
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
        // Show pending items including those edited by procurement
        filtered = filtered.filter(p => {
          const status = p.sender_latest_status || p.latest_status || p.status || 'pending';

          // Exclude completed items
          if (status === 'completed' || status === 'delivered' || status === 'closed' || status === 'finished') {
            return false;
          }

          // Include pending items that haven't been sent to PM or were just edited
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

          // Include approved items that haven't reached completion
          return status === 'approved' ||
                 pmEmailedPRs.has(p.purchase_id) ||
                 (p.status_receiver === 'projectManager' && p.status_sender === 'procurement') ||
                 (p.status_receiver === 'accounts' && status !== 'completed') ||
                 (p.status_receiver === 'technicalDirector' && status === 'approved');
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
        // Filter for purchases rejected by Estimation
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
            (p.status_sender === 'estimation' && p.latest_status === 'rejected')
          );

          return hasRejection || rejectedByEst;
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
    setConfirmDialog({
      isOpen: true,
      purchaseId,
      message: 'Send this purchase request to Project Manager for approval?'
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
      
      await procurementService.sendApprovalEmail(purchaseId);
      setPmEmailedPRs(prev => new Set(prev).add(purchaseId));
      toast.success('Purchase request sent to Project Manager for approval');
      
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
  if (loading) {
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
            <Button
              variant="outline"
              size="icon"
              onClick={fetchPurchases}
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
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

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {metric.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ${
                        metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {metric.change}%
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${metric.color} bg-opacity-10`}>
                    <metric.icon className={`w-6 h-6 ${metric.color.replace('bg-', 'text-')}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

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
                      (p.status_sender === 'estimation' && p.latest_status === 'rejected')
                    );
                    return hasRejection || rejectedByEst;
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