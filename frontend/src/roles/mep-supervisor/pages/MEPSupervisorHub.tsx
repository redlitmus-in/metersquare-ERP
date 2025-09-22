import React, { useState, useEffect, useRef } from 'react';
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
  MapPin,
  Zap,
  Droplets,
  Wind,
  Activity,
  Grid3X3,
  List,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { mepSupervisorService, Purchase } from '../services/mepSupervisorService';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import usePurchaseStore from '@/store/purchaseStore';

// MEP Supervisor Metrics Carousel Component
const MEPSupervisorMetricsCarousel: React.FC<{ metrics: any; formatCurrency: (amount: number) => string }> = ({ metrics, formatCurrency }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  const metricCards = [
    {
      title: 'Total MEP Requests',
      value: metrics.totalPurchases,
      icon: Activity,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      bgIcon: 'bg-blue-100'
    },
    {
      title: 'Electrical',
      value: metrics.electricalCount || 0,
      icon: Zap,
      color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      bgIcon: 'bg-yellow-100'
    },
    {
      title: 'Mechanical',
      value: metrics.mechanicalCount || 0,
      icon: Wind,
      color: 'bg-green-50 border-green-200 text-green-700',
      bgIcon: 'bg-green-100'
    },
    {
      title: 'Plumbing',
      value: metrics.plumbingCount || 0,
      icon: Droplets,
      color: 'bg-cyan-50 border-cyan-200 text-cyan-700',
      bgIcon: 'bg-cyan-100'
    },
    {
      title: 'Pending',
      value: metrics.pendingCount,
      icon: Clock,
      color: 'bg-orange-50 border-orange-200 text-orange-700',
      bgIcon: 'bg-orange-100'
    },
    {
      title: 'Total Value',
      value: formatCurrency(metrics.totalValue),
      icon: DollarSign,
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      bgIcon: 'bg-purple-100'
    },
    {
      title: 'Approved',
      value: metrics.approvedCount || 0,
      icon: CheckSquare,
      color: 'bg-green-50 border-green-200 text-green-700',
      bgIcon: 'bg-green-100'
    },
    {
      title: 'Rejected',
      value: metrics.rejectedCount || 0,
      icon: XSquare,
      color: 'bg-red-50 border-red-200 text-red-700',
      bgIcon: 'bg-red-100'
    }
  ];

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.ceil(metricCards.length / 4));
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [metricCards.length]);

  const getVisibleCards = () => {
    const startIdx = currentIndex * 4;
    return metricCards.slice(startIdx, startIdx + 4);
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          {getVisibleCards().map((metric, index) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={`${currentIndex}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`${metric.color} border-2 hover:shadow-lg transition-all`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium opacity-80">{metric.title}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-2xl font-bold">{metric.value}</p>
                        </div>
                      </div>
                      <div className={`${metric.bgIcon} p-3 rounded-lg`}>
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Carousel Indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {Array.from({ length: Math.ceil(metricCards.length / 4) }).map((_, index) => (
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
    </div>
  );
};

const MEPSupervisorHub: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryPurchase, setSelectedHistoryPurchase] = useState<Purchase | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
  const [mepCategory, setMepCategory] = useState<'all' | 'electrical' | 'mechanical' | 'plumbing'>('all');

  // Use purchase store for MEP purchases
  const { purchases: storePurchases, fetchPurchases, getPurchasesForRole } = usePurchaseStore();
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  // View mode and pagination
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [metrics, setMetrics] = useState({
    totalPurchases: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    emailSentCount: 0,
    totalValue: 0,
    electricalCount: 0,
    mechanicalCount: 0,
    plumbingCount: 0
  });

  // Currency formatting - Using AED
  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString()}`;
  };

  // Initialize data
  useEffect(() => {
    // Ensure role is properly set in localStorage for the purchase store
    localStorage.setItem('userRole', 'mepsupervisor');
    loadData();
    // Don't start polling to reduce API calls
    // Manually refresh when needed
  }, []);

  // Update purchases when store changes
  useEffect(() => {
    const mepPurchases = getPurchasesForRole('mepsupervisor');
    setPurchases(mepPurchases as Purchase[]);
  }, [storePurchases]);

  const loadDashboard = async () => {
    try {
      // Single call to dashboard for statistics only
      const dashboardData = await mepSupervisorService.getDashboard();

      if (dashboardData) {
        const summary = dashboardData.summary || {};
        const categories = dashboardData.categories || {};

        setMetrics({
          totalPurchases: summary.total_mep_purchases || 0,
          pendingCount: summary.pending || 0,
          approvedCount: summary.approved || 0,
          rejectedCount: summary.rejected || 0,
          emailSentCount: summary.approved || 0,
          totalValue: summary.total_value || 0,
          electricalCount: categories.electrical?.count || 0,
          mechanicalCount: categories.mechanical?.count || 0,
          plumbingCount: categories.plumbing?.count || 0
        });
      }
    } catch (error) {
      console.error('Error loading MEP dashboard:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Single call to load dashboard stats
      await loadDashboard();

      // Fetch purchases using the centralized store
      await fetchPurchases('mepsupervisor');

      // Get MEP-specific purchases from the store
      const mepPurchases = getPurchasesForRole('mepsupervisor');
      setPurchases(mepPurchases as Purchase[]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load MEP data');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort purchases
  const getFilteredPurchases = () => {
    let filtered = [...purchases];

    // Apply MEP category filter (using backend-provided category)
    if (mepCategory !== 'all') {
      filtered = filtered.filter(purchase => {
        // Use mep_category from backend if available
        if ((purchase as any).mep_category) {
          return (purchase as any).mep_category === mepCategory;
        }
        // Fallback to purpose-based filtering
        const desc = purchase.purpose?.toLowerCase() || '';
        switch (mepCategory) {
          case 'electrical':
            return desc.includes('electrical') || desc.includes('wiring') || desc.includes('circuit');
          case 'mechanical':
            return desc.includes('hvac') || desc.includes('mechanical') || desc.includes('ventilation');
          case 'plumbing':
            return desc.includes('plumbing') || desc.includes('pipe') || desc.includes('water');
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          (p.project_id?.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
          (p.purpose?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (p.site_location?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((p) => p.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime();
        case 'amount':
          const aTotal = a.materials?.reduce((sum: number, m: any) => sum + (m.cost || 0) * (m.quantity || 0), 0) || a.total_cost || 0;
          const bTotal = b.materials?.reduce((sum: number, m: any) => sum + (m.cost || 0) * (m.quantity || 0), 0) || b.total_cost || 0;
          return bTotal - aTotal;
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        default:
          return 0;
      }
    });

    return filtered;
  };

  const handleDeletePurchase = async () => {
    if (!purchaseToDelete) return;

    try {
      await mepSupervisorService.deletePurchase(purchaseToDelete.purchase_id);
      toast.success('MEP request deleted successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to delete MEP request');
    } finally {
      setShowDeleteConfirm(false);
      setPurchaseToDelete(null);
    }
  };

  const confirmDelete = (purchase: Purchase) => {
    setPurchaseToDelete(purchase);
    setShowDeleteConfirm(true);
  };

  const handleEditPurchase = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setShowPurchaseForm(true);
  };

  const handleViewHistory = (purchase: Purchase) => {
    setSelectedHistoryPurchase(purchase);
    setShowHistoryModal(true);
  };

  const handleSendToProcurement = async (purchase: Purchase) => {
    try {
      await mepSupervisorService.sendToProcurement(purchase.purchase_id);
      toast.success('Purchase request sent to procurement successfully');
      loadData(); // Refresh the data
    } catch (error) {
      toast.error('Failed to send to procurement');
      console.error('Error sending to procurement:', error);
    }
  };

  const filteredPurchases = getFilteredPurchases();

  // Pagination calculations
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
  const paginatedPurchases = filteredPurchases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ModernLoadingSpinners size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
            MEP Supervisor Hub
          </h1>
          <p className="text-gray-600 mt-1">Manage Mechanical, Electrical & Plumbing requests</p>
        </div>
        <Button
          onClick={() => {
            setSelectedPurchase(null);
            setShowPurchaseForm(true);
          }}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          New MEP Request
        </Button>
      </div>

      {/* MEP Category Filter */}
      <div className="flex gap-2">
        <Button
          variant={mepCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMepCategory('all')}
          className={mepCategory === 'all' ? 'bg-blue-500 hover:bg-blue-600' : ''}
        >
          All MEP
        </Button>
        <Button
          variant={mepCategory === 'electrical' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMepCategory('electrical')}
          className={mepCategory === 'electrical' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
        >
          <Zap className="w-4 h-4 mr-1" />
          Electrical
        </Button>
        <Button
          variant={mepCategory === 'mechanical' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMepCategory('mechanical')}
          className={mepCategory === 'mechanical' ? 'bg-green-500 hover:bg-green-600' : ''}
        >
          <Wind className="w-4 h-4 mr-1" />
          Mechanical
        </Button>
        <Button
          variant={mepCategory === 'plumbing' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMepCategory('plumbing')}
          className={mepCategory === 'plumbing' ? 'bg-cyan-500 hover:bg-cyan-600' : ''}
        >
          <Droplets className="w-4 h-4 mr-1" />
          Plumbing
        </Button>
      </div>

      {/* Metrics Carousel */}
      <MEPSupervisorMetricsCarousel metrics={metrics} formatCurrency={formatCurrency} />

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search MEP requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="email_sent">Email Sent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={loadData}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Purchases Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="pending">
              Pending ({filteredPurchases.filter(p => p.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="email_sent">
              Send Mail ({filteredPurchases.filter(p => p.status !== 'completed' && p.status !== 'approved' && (p.email_sent || p.status === 'email_sent' || p.current_workflow_status === 'email_sent' || p.procurement_status === 'approved')).length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Completed ({filteredPurchases.filter(p => p.status === 'approved' || p.status === 'completed').length})
            </TabsTrigger>
          </TabsList>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 px-2"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-2"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-6">
          {filteredPurchases.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No MEP requests found</h3>
                <p className="text-gray-500">
                  {searchTerm || filterStatus !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first MEP request to get started'}
                </p>
              </div>
            </Card>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedPurchases
                    .filter(p => {
                  switch (activeTab) {
                    case 'pending':
                      return p.status === 'pending';
                    case 'email_sent':
                      return p.status !== 'completed' && p.status !== 'approved' &&
                             (p.email_sent ||
                             p.status === 'email_sent' ||
                             p.current_workflow_status === 'email_sent' ||
                             p.procurement_status === 'approved');
                    case 'approved':
                      // Only show completed items in the completed tab
                      return p.status === 'approved' || p.status === 'completed';
                    default:
                      return true;
                  }
                })
                .map((purchase) => {
                  // Transform purchase data to match PurchaseCard expectations
                  const purchaseData = {
                    ...purchase,
                    purchase_id: purchase.purchase_id,
                    site_location: purchase.site_location,
                    project_id: purchase.project_id,
                    purpose: purchase.purpose,
                    date: purchase.date || purchase.created_at,
                    materials: purchase.materials || purchase.material_details || [],
                    email_sent: purchase.email_sent || false,
                    latest_status: purchase.latest_status || purchase.current_workflow_status,
                    created_at: purchase.created_at
                  };

                  return (
                    <PurchaseCard
                      key={purchase.purchase_id}
                      purchase={purchaseData}
                      onViewDetails={() => setSelectedPurchase(purchase)}
                      onEdit={() => handleEditPurchase(purchase)}
                      onDelete={() => confirmDelete(purchase)}
                      onViewHistory={() => handleViewHistory(purchase)}
                      onSendToProcurement={() => handleSendToProcurement(purchase)}
                    />
                  );
                })
              }
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Purchase ID</TableHead>
                        <TableHead className="font-semibold">Purpose</TableHead>
                        <TableHead className="font-semibold">Location</TableHead>
                        <TableHead className="font-semibold">MEP Type</TableHead>
                        <TableHead className="font-semibold">Quantity</TableHead>
                        <TableHead className="font-semibold">Total Cost</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPurchases
                        .filter(p => {
                          switch (activeTab) {
                            case 'pending':
                              return p.status === 'pending';
                            case 'email_sent':
                              return p.status !== 'completed' && p.status !== 'approved' &&
                                     (p.email_sent ||
                                     p.status === 'email_sent' ||
                                     p.current_workflow_status === 'email_sent' ||
                                     p.procurement_status === 'approved');
                            case 'approved':
                              return p.status === 'approved' || p.status === 'completed';
                            default:
                              return true;
                          }
                        })
                        .map((purchase) => (
                          <TableRow key={purchase.purchase_id} className="hover:bg-gray-50 transition-colors">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-gray-500" />
                                PR-{purchase.purchase_id.toString().padStart(4, '0')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{purchase.purpose}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-gray-500" />
                                <span className="text-sm">{purchase.site_location}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm capitalize">
                                {(purchase as any).mep_category || 'General'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{purchase.materials?.length || 0} items</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium">
                                AED {(purchase.total_cost || 0).toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              {purchase.status && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  purchase.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  purchase.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">
                                {new Date(purchase.created_at || purchase.date).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setSelectedPurchase(purchase)}
                                  className="h-8 px-2 text-xs hover:bg-gray-100"
                                  title="View Details"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                {activeTab === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setSelectedPurchase(purchase);
                                        setShowPurchaseForm(true);
                                      }}
                                      className="h-8 px-2 text-xs hover:bg-gray-100"
                                      title="Edit"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleSendToProcurement(purchase)}
                                      className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                      title="Send to Procurement"
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
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
                      <ChevronLeft className="h-4 w-4" />
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
                          <Button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            variant="ghost"
                            size="sm"
                            className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                              pageNum === currentPage
                                ? 'bg-blue-600 text-white'
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </Button>
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
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog open={showPurchaseForm} onOpenChange={setShowPurchaseForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <PurchaseRequisitionForm
            onClose={() => {
              setShowPurchaseForm(false);
              setSelectedPurchase(null);
              loadData();
            }}
            existingData={selectedPurchase}
            isEditMode={!!selectedPurchase}
          />
        </DialogContent>
      </Dialog>

      {selectedPurchase && !showPurchaseForm && (
        <PurchaseDetailsModal
          purchaseId={selectedPurchase.purchase_id}
          isOpen={!!selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
        />
      )}

      {showHistoryModal && selectedHistoryPurchase && (
        <PurchaseHistoryModal
          purchaseId={selectedHistoryPurchase.purchase_id}
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedHistoryPurchase(null);
          }}
        />
      )}

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeletePurchase}
        title="Delete MEP Request"
        message={`Are you sure you want to delete this MEP request for ${purchaseToDelete?.project_id}?`}
        confirmText="Delete"
      />
    </div>
  );
};

export default MEPSupervisorHub;