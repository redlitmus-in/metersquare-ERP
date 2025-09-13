import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  CalendarDays,
  ArrowUpDown,
  RefreshCw,
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  CheckSquare,
  XSquare,
  AlertCircle,
  Mail,
  Search,
  Filter,
  X,
  Building2,
  MapPin
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import PurchaseCard from '../components/PurchaseCard';
import PurchaseDetailsModal from '../components/PurchaseDetailsModal';
import PurchaseHistoryModal from '../components/PurchaseHistoryModal';
import PurchaseRequisitionForm from '@/components/forms/PurchaseRequisitionForm';
import { siteSupervisorService, Purchase } from '../services/siteSupervisorService';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';

const SiteSupervisorHub: React.FC = () => {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyPurchaseId, setHistoryPurchaseId] = useState<number | null>(null);
  const [newPurchaseModalOpen, setNewPurchaseModalOpen] = useState(false);
  const [editPurchaseModalOpen, setEditPurchaseModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  // Dialog states for confirmations
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    purchaseId: number | null;
    type: 'email' | 'delete';
  }>({ isOpen: false, purchaseId: null, type: 'email' });
  const [successDialog, setSuccessDialog] = useState<{
    isOpen: boolean;
    message: string;
  }>({ isOpen: false, message: '' });

  // Metrics state
  const [metrics, setMetrics] = useState({
    totalPurchases: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalValue: 0,
    emailSentCount: 0,
    completedCount: 0
  });

  // Fetch purchases on component mount
  useEffect(() => {
    fetchPurchases();
  }, []);

  // Filter and sort purchases based on tab, filters, search and sort order
  useEffect(() => {
    filterPurchases();
  }, [purchases, sortOrder, activeTab, searchTerm, statusFilter, projectFilter, locationFilter, dateFilter]);

  // Calculate metrics whenever purchases change
  useEffect(() => {
    calculateMetrics();
  }, [purchases]);

  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      const data = await siteSupervisorService.getPurchases();
      setPurchases(data);
      toast.success(`Loaded ${data.length} purchase requests`);
    } catch (error: any) {
      console.error('Error fetching purchases:', error);
      toast.error(error.message || 'Failed to load purchases');
    } finally {
      setIsLoading(false);
    }
  };

  const filterPurchases = () => {
    let filtered = [...purchases];

    // Apply tab filter
    switch (activeTab) {
      case 'pending':
        // Only show purchases that are pending AND have NOT been sent via email
        filtered = filtered.filter(p => (p.status === 'pending' || !p.status) && !p.email_sent);
        break;
      case 'email-sent':
        // Only show purchases that have been sent via email BUT are not completed
        filtered = filtered.filter(p => {
          if (!p.email_sent) return false;
          
          // Exclude completed purchases
          if (p.latest_status) {
            const latestStatus = p.latest_status.status?.toLowerCase();
            const senderStatus = p.latest_status.sender_latest_status?.toLowerCase();
            const isCompleted = latestStatus === 'completed' || senderStatus === 'completed' ||
                               latestStatus === 'delivered' || latestStatus === 'closed' || latestStatus === 'finished';
            return !isCompleted;
          }
          
          // Fallback check for regular status
          const status = p.status?.toLowerCase();
          const isCompleted = status === 'completed' || status === 'delivered' || status === 'closed' || status === 'finished';
          return !isCompleted;
        });
        break;
      case 'completed':
        // Only show purchases that are fully completed based on latest_status
        filtered = filtered.filter(p => {
          if (p.latest_status) {
            const latestStatus = p.latest_status.status?.toLowerCase();
            const senderStatus = p.latest_status.sender_latest_status?.toLowerCase();
            return latestStatus === 'completed' || senderStatus === 'completed' ||
                   latestStatus === 'delivered' || latestStatus === 'closed' || latestStatus === 'finished';
          }
          // Fallback to regular status if latest_status is not available
          const status = p.status?.toLowerCase();
          return status === 'completed' || status === 'delivered' || status === 'closed' || status === 'finished';
        });
        break;
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => {
        // Convert all fields to strings safely before searching
        const purchaseId = p.purchase_id ? p.purchase_id.toString() : '';
        const purpose = p.purpose || '';
        const siteLocation = p.site_location || '';
        const projectId = p.project_id ? p.project_id.toString() : '';
        const requestedBy = p.requested_by || '';
        
        // Check if search term matches any field
        const matchesBasicFields = 
          purchaseId.includes(search) ||
          purpose.toLowerCase().includes(search) ||
          siteLocation.toLowerCase().includes(search) ||
          projectId.toLowerCase().includes(search) ||
          requestedBy.toLowerCase().includes(search);
        
        // Check materials
        const matchesMaterials = p.materials?.some(m => {
          const description = m.description || '';
          const category = m.category || '';
          return description.toLowerCase().includes(search) || 
                 category.toLowerCase().includes(search);
        }) || false;
        
        return matchesBasicFields || matchesMaterials;
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Apply project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter(p => p.project_id === projectFilter);
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
          case 'quarter':
            const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            return purchaseDate >= quarterAgo;
          default:
            return true;
        }
      };
      filtered = filtered.filter(p => filterDate(p.date || p.created_at));
    }

    // Apply date sorting - prioritize most recent activity
    filtered.sort((a, b) => {
      // For sorting, use the most recent date available:
      // 1. last_modified_at (if exists) - shows recent edits/email sends
      // 2. created_at (if exists)
      // 3. date (fallback)
      
      const getMostRecentDate = (purchase: Purchase) => {
        // If email was sent, last_modified_at should reflect when it was sent
        if (purchase.last_modified_at) {
          return new Date(purchase.last_modified_at).getTime();
        }
        if (purchase.created_at) {
          return new Date(purchase.created_at).getTime();
        }
        return new Date(purchase.date).getTime();
      };
      
      const dateA = getMostRecentDate(a);
      const dateB = getMostRecentDate(b);
      
      if (sortOrder === 'newest') {
        return dateB - dateA; // Newest activity first
      } else {
        return dateA - dateB; // Oldest activity first
      }
    });

    setFilteredPurchases(filtered);
  };

  const calculateMetrics = () => {
    const total = purchases.length;
    // Pending count: purchases that are pending AND not sent via email
    const pending = purchases.filter(p => (p.status === 'pending' || !p.status) && !p.email_sent).length;
    const approved = purchases.filter(p => p.status === 'approved').length;
    const rejected = purchases.filter(p => p.status === 'rejected').length;
    // Email sent count: purchases that have been sent via email BUT are not completed
    const emailSent = purchases.filter(p => {
      if (!p.email_sent) return false;
      
      // Exclude completed purchases
      if (p.latest_status) {
        const latestStatus = p.latest_status.status?.toLowerCase();
        const senderStatus = p.latest_status.sender_latest_status?.toLowerCase();
        const isCompleted = latestStatus === 'completed' || senderStatus === 'completed' ||
                           latestStatus === 'delivered' || latestStatus === 'closed' || latestStatus === 'finished';
        return !isCompleted;
      }
      
      // Fallback check for regular status
      const status = p.status?.toLowerCase();
      const isCompleted = status === 'completed' || status === 'delivered' || status === 'closed' || status === 'finished';
      return !isCompleted;
    }).length;
    // Completed count: fully completed purchases based on latest_status
    const completed = purchases.filter(p => {
      if (p.latest_status) {
        const latestStatus = p.latest_status.status?.toLowerCase();
        const senderStatus = p.latest_status.sender_latest_status?.toLowerCase();
        return latestStatus === 'completed' || senderStatus === 'completed' ||
               latestStatus === 'delivered' || latestStatus === 'closed' || latestStatus === 'finished';
      }
      // Fallback to regular status if latest_status is not available
      const status = p.status?.toLowerCase();
      return status === 'completed' || status === 'delivered' || status === 'closed' || status === 'finished';
    }).length;

    const totalValue = purchases.reduce((sum, purchase) => {
      const purchaseTotal = purchase.materials?.reduce((materialSum, mat) => 
        materialSum + (mat.cost * mat.quantity), 0) || 0;
      return sum + purchaseTotal;
    }, 0);

    setMetrics({
      totalPurchases: total,
      pendingCount: pending,
      approvedCount: approved,
      rejectedCount: rejected,
      totalValue,
      emailSentCount: emailSent,
      completedCount: completed
    });
  };

  const handleViewDetails = (purchaseId: number) => {
    setSelectedPurchaseId(purchaseId);
    setDetailsModalOpen(true);
  };

  const handleViewHistory = (purchaseId: number) => {
    setHistoryPurchaseId(purchaseId);
    setHistoryModalOpen(true);
  };

  const handleEdit = async (purchaseId: number) => {
    // Find the purchase to edit
    const purchaseToEdit = purchases.find(p => p.purchase_id === purchaseId);
    if (!purchaseToEdit) {
      toast.error('Purchase not found');
      return;
    }
    
    // Check if purchase can be edited (not approved or email sent)
    if (purchaseToEdit.status === 'approved') {
      toast.error('Cannot edit approved purchase requests');
      return;
    }
    
    if (purchaseToEdit.email_sent) {
      toast.error('Cannot edit purchase requests that have been sent via email');
      return;
    }
    
    // Open edit modal with the purchase data
    setEditingPurchase(purchaseToEdit);
    setEditPurchaseModalOpen(true);
  };

  const handleDelete = async (purchaseId: number) => {
    // Find the purchase to check if it can be deleted
    const purchaseToDelete = purchases.find(p => p.purchase_id === purchaseId);
    if (!purchaseToDelete) {
      toast.error('Purchase not found');
      return;
    }
    
    // Check if purchase can be deleted (not approved or email sent)
    if (purchaseToDelete.status === 'approved') {
      toast.error('Cannot delete approved purchase requests');
      return;
    }
    
    if (purchaseToDelete.email_sent) {
      toast.error('Cannot delete purchase requests that have been sent via email');
      return;
    }
    
    // Show confirmation dialog
    setConfirmDialog({ isOpen: true, purchaseId, type: 'delete' });
  };

  const handleSendEmail = (purchaseId: number) => {
    // Show confirmation dialog
    setConfirmDialog({ isOpen: true, purchaseId, type: 'email' });
  };
  
  const confirmDelete = async () => {
    if (!confirmDialog.purchaseId) return;
    
    const purchaseId = confirmDialog.purchaseId;
    setConfirmDialog({ isOpen: false, purchaseId: null, type: 'delete' });
    setIsLoading(true);
    
    try {
      await siteSupervisorService.deletePurchase(purchaseId);
      
      // Show success dialog
      setSuccessDialog({
        isOpen: true,
        message: 'Purchase request has been deleted successfully!'
      });
      
      // Remove the deleted purchase from the list
      setPurchases(prev => prev.filter(p => p.purchase_id !== purchaseId));
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete purchase request');
    } finally {
      setIsLoading(false);
    }
  };
  
  const confirmSendEmail = async () => {
    if (!confirmDialog.purchaseId) return;
    
    const purchaseId = confirmDialog.purchaseId;
    setConfirmDialog({ isOpen: false, purchaseId: null, type: 'email' });

    setIsLoading(true);
    
    try {
      await siteSupervisorService.sendPurchaseEmail(purchaseId);
      
      // Show success dialog
      setSuccessDialog({
        isOpen: true,
        message: 'Email has been sent successfully to the procurement team!'
      });
      
      // Update the purchase to mark it as email sent with current timestamp
      const now = new Date().toISOString();
      setPurchases(prev => prev.map(p => 
        p.purchase_id === purchaseId 
          ? { 
              ...p, 
              email_sent: true,
              last_modified_at: now, // Set to current time to ensure it appears at top
              last_modified_by: 'Site Supervisor'
            } 
          : p
      ));
      
      // Optional: Fetch fresh data to ensure we have the latest from server
      // Uncomment if you want to ensure server-side data is synced
      // setTimeout(() => fetchPurchases(), 500);
      
    } catch (error: any) {
      console.error('Send email error:', error);
      toast.error(error.message || 'Failed to send email');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `AED ${value.toLocaleString()}`;
  };

  // Get unique values for filter dropdowns
  const getUniqueProjects = () => {
    const projects = [...new Set(purchases.map(p => p.project_id))].filter(Boolean);
    return projects;
  };

  const getUniqueLocations = () => {
    const locations = [...new Set(purchases.map(p => p.site_location))].filter(Boolean);
    return locations;
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
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen [&_*:focus]:outline-none [&_*:focus]:ring-0">
      {/* Header */}
      <div className="mb-6 space-y-4">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl shadow-xl p-6 text-gray-800 border border-red-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur">
                <Package className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Purchase Management Hub</h1>
                <p className="text-gray-600 mt-1">Manage and track all your purchase requests</p>
              </div>
            </div>
            <Button
              onClick={() => setNewPurchaseModalOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Purchase Request
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Package className="h-4 w-4 text-red-500" />
              Total Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{metrics.totalPurchases}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{metrics.pendingCount}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-green-500" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{metrics.approvedCount}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <XSquare className="h-4 w-4 text-red-500" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{metrics.rejectedCount}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" />
              Email Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{metrics.emailSentCount}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-green-600">{formatCurrency(metrics.totalValue)}</p>
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
              variant={hasActiveFilters() ? "default" : "outline"}
              className={hasActiveFilters() ? "bg-red-600 hover:bg-red-700" : ""}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters() && (
                <Badge variant="secondary" className="ml-2 bg-white text-red-600">
                  Active
                </Badge>
              )}
            </Button>
            <Select value={sortOrder} onValueChange={(value: 'newest' | 'oldest') => setSortOrder(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">
                  <span className="flex items-center gap-2">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    Newest First
                  </span>
                </SelectItem>
                <SelectItem value="oldest">
                  <span className="flex items-center gap-2">
                    <ArrowUpDown className="h-3.5 w-3.5 rotate-180" />
                    Oldest First
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={fetchPurchases}
              disabled={isLoading}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
                              {project}
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto max-w-lg">
          <TabsTrigger value="pending" className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Pending ({metrics.pendingCount})
          </TabsTrigger>
          <TabsTrigger value="email-sent" className="flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" />
            Email Sent ({metrics.emailSentCount})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-1 text-green-600 data-[state=active]:text-green-700">
            <CheckSquare className="h-3.5 w-3.5" />
            Completed ({metrics.completedCount || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredPurchases.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <AnimatePresence mode="popLayout">
                {filteredPurchases.map((purchase) => (
                <PurchaseCard
                  key={purchase.purchase_id}
                  purchase={purchase}
                  onViewDetails={handleViewDetails}
                  onViewHistory={handleViewHistory}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSendEmail={handleSendEmail}
                  isLoading={isLoading}
                />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <Card className="p-8">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No purchases found</h3>
                <p className="text-sm text-gray-500">
                  {activeTab === 'pending' ? 'No pending purchase requests' : 
                   activeTab === 'email-sent' ? 'No email sent purchases' : 'No completed purchases'}
                </p>
                <Button
                  onClick={() => setNewPurchaseModalOpen(true)}
                  className="mt-4 bg-red-600 hover:bg-red-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Purchase Request
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Purchase Details Modal */}
      {/* New Purchase Request Form Modal */}
      <Dialog open={newPurchaseModalOpen} onOpenChange={setNewPurchaseModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto p-0" hideCloseButton>
          <PurchaseRequisitionForm
            onClose={() => {
              setNewPurchaseModalOpen(false);
              fetchPurchases(); // Refresh the list after creating a new purchase
            }}
            showAsPage={false}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Purchase Request Form Modal */}
      <Dialog open={editPurchaseModalOpen} onOpenChange={setEditPurchaseModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto p-0" hideCloseButton>
          <PurchaseRequisitionForm
            onClose={() => {
              setEditPurchaseModalOpen(false);
              setEditingPurchase(null);
              fetchPurchases(); // Refresh the list after editing
            }}
            showAsPage={false}
            editMode={true}
            purchaseData={editingPurchase}
          />
        </DialogContent>
      </Dialog>

      <PurchaseDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedPurchaseId(null);
        }}
        purchaseId={selectedPurchaseId}
        mode="details"
      />

      <PurchaseHistoryModal
        isOpen={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setHistoryPurchaseId(null);
        }}
        purchaseId={historyPurchaseId}
      />
      
      {/* Confirmation Dialog for Email/Delete */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, purchaseId: null, type: 'email' })}
        type={confirmDialog.type === 'email' ? 'email' : 'warning'}
        title={confirmDialog.type === 'email' ? 'Send Email Confirmation' : 'Delete Confirmation'}
        message={
          confirmDialog.type === 'email' 
            ? 'Are you sure you want to send this purchase request via email to the procurement team?' 
            : 'Are you sure you want to delete this purchase request? This action cannot be undone.'
        }
        confirmText={confirmDialog.type === 'email' ? 'Send Email' : 'Delete'}
        cancelText="Cancel"
        showCancel={true}
        onConfirm={confirmDialog.type === 'email' ? confirmSendEmail : confirmDelete}
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

export default SiteSupervisorHub;