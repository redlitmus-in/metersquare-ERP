import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PurchaseDetailsModal from '@/components/modals/PurchaseDetailsModal';
import { motion } from 'framer-motion';
import { apiClient } from '@/api/config';
import { toast } from 'sonner';
import {
  Package,
  Users,
  Banknote,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Plus,
  ArrowRight,
  Activity,
  BarChart3,
  Download,
  Bell,
  Search,
  Building2,
  ShoppingCart,
  Eye,
  Edit,
  MoreVertical,
  TrendingDown,
  Award,
  Target,
  Zap,
  Shield,
  Loader2,
  Trash2,
  Mail,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PurchaseRequisitionForm from '@/components/forms/PurchaseRequisitionForm';
import VendorQuotationForm from '@/components/forms/VendorQuotationForm';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  color: string;
  trend: 'up' | 'down';
}

interface PurchaseRequest {
  id: string;
  prNumber: string;
  project: string;
  requester: string;
  amount: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'in_progress';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  date: string;
  items: number;
  originalData?: any; // Store original API data
  materials?: any[]; // Store materials array
}

interface VendorQuotation {
  id: string;
  vqNumber: string;
  vendor: string;
  project: string;
  amount: number;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'negotiation';
  validUntil: string;
  items: number;
}

const ProcurementDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'dashboard' | 'purchase' | 'vendor'>('dashboard');
  const [selectedPR, setSelectedPR] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPR, setEditingPR] = useState<PurchaseRequest | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorQuote, setSelectedVendorQuote] = useState<VendorQuotation | null>(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);

  // Fetch data from APIs
  useEffect(() => {
    fetchPurchaseRequests();
    fetchVendorQuotations();
    fetchNotifications();
  }, []);

  const fetchPurchaseRequests = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/all_purchase');
      
      if (response.data.success) {
        // Transform API data to match our frontend structure
        const transformedRequests = response.data.purchase_requests.map((pr: any, index: number) => {
          // Materials are nested within each purchase request
          const materials = pr.materials || [];
          
          // If no nested materials, try to find from the flat materials array
          if (materials.length === 0 && response.data.materials && pr.material_ids) {
            pr.material_ids.forEach((mid: number) => {
              const found = response.data.materials.find((m: any) => m.material_id === mid);
              if (found) materials.push(found);
            });
          }
          
          // Calculate total amount from materials
          const totalAmount = materials.reduce((sum: number, m: any) => 
            sum + (m.quantity * m.cost), 0
          );
          
          // Get priority from first material (or default to 'medium')
          const priority = materials[0]?.priority?.toLowerCase() || 'medium';
          
          return {
            id: pr.purchase_id.toString(),
            prNumber: `PR-2024-${String(pr.purchase_id).padStart(3, '0')}`,
            project: pr.project_id ? `Project ${pr.project_id}` : 'General Purchase',
            requester: pr.requested_by || pr.user_name || pr.created_by || 'Unknown',
            amount: totalAmount,
            status: 'pending' as const, // Default status, will be updated from workflow
            priority: priority as 'low' | 'medium' | 'high' | 'urgent',
            date: pr.date || pr.created_at || new Date().toISOString(),
            items: materials.length,
            // Store original data for edit
            originalData: pr,
            materials: materials
          };
        });
        
        setPurchaseRequests(transformedRequests);
        
        // Calculate metrics based on real data
        const totalValue = transformedRequests.reduce((sum: number, pr: PurchaseRequest) => sum + pr.amount, 0);
        const pendingCount = transformedRequests.filter((pr: PurchaseRequest) => pr.status === 'pending').length;
        const approvedCount = transformedRequests.filter((pr: PurchaseRequest) => pr.status === 'approved').length;
        
        setMetrics([
          {
            title: 'Total Purchase Value',
            value: `AED ${totalValue.toLocaleString()}`,
            change: 12.5, // You can calculate this from historical data
            icon: Banknote,
            color: 'bg-green-500',
            trend: 'up'
          },
          {
            title: 'Active Requisitions',
            value: transformedRequests.length,
            change: -5.2,
            icon: FileText,
            color: 'bg-[#243d8a]',
            trend: 'down'
          },
          {
            title: 'Pending Approvals',
            value: pendingCount,
            change: 25.0,
            icon: Clock,
            color: 'bg-amber-500',
            trend: 'up'
          },
          {
            title: 'Vendor Performance',
            value: '92%', // This would come from vendor metrics API
            change: 3.8,
            icon: Award,
            color: 'bg-purple-500',
            trend: 'up'
          }
        ]);
      } else {
        toast.error('Failed to fetch purchase requests');
        // Set empty data on error
        setPurchaseRequests([]);
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
            title: 'Active Requisitions',
            value: 0,
            change: 0,
            icon: FileText,
            color: 'bg-[#243d8a]',
            trend: 'down'
          },
          {
            title: 'Pending Approvals',
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
      }
    } catch (error: any) {
      console.error('Error fetching purchase requests:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch purchase requests');
      setPurchaseRequests([]);
      // Set default metrics on error
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
          title: 'Active Requisitions',
          value: 0,
          change: 0,
          icon: FileText,
          color: 'bg-[#243d8a]',
          trend: 'down'
        },
        {
          title: 'Pending Approvals',
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

  // Fetch vendor quotations from API (placeholder for now)
  const [vendorQuotations, setVendorQuotations] = useState<VendorQuotation[]>([]);
  
  const fetchVendorQuotations = async () => {
    try {
      // TODO: Replace with actual API call when backend is ready
      // const response = await apiClient.get('/vendor_quotations');
      
      // For now, use empty array as no hardcoded data
      setVendorQuotations([]);
    } catch (error) {
      console.error('Error fetching vendor quotations:', error);
      setVendorQuotations([]);
    }
  };

  // Fetch notifications from API (placeholder for now)
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const fetchNotifications = async () => {
    try {
      // TODO: Replace with actual API call when backend is ready
      // const response = await apiClient.get('/notifications');
      
      // For now, use empty array as no hardcoded data
      setNotifications([]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'pending':
      case 'under_review':
        return 'bg-[#243d8a]/10 text-[#243d8a]/90 border-[#243d8a]/30';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'in_progress':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'negotiation':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium':
        return 'bg-[#243d8a]/10 text-[#243d8a]/90 border-[#243d8a]/30';
      case 'low':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const handleDeletePR = async (prId: string, prNumber: string) => {
    if (window.confirm(`Are you sure you want to delete ${prNumber}? This action cannot be undone.`)) {
      try {
        // Show loading toast
        const loadingToast = toast.loading(`Deleting ${prNumber}...`);
        
        const response = await apiClient.delete(`/purchase/${prId}`);
        
        if (response.data.success) {
          // Dismiss loading toast
          toast.dismiss(loadingToast);
          
          // Update local state immediately for better UX
          setPurchaseRequests(prev => prev.filter(pr => pr.id !== prId));
          
          // Refresh data from server to ensure consistency
          await fetchPurchaseRequests();
          
          toast.success(`Purchase request ${prNumber} deleted successfully`);
        } else {
          toast.dismiss(loadingToast);
          toast.error(response.data.error || 'Failed to delete purchase request');
        }
      } catch (error: any) {
        console.error('Error deleting purchase request:', error);
        
        // Check if the error is 404 (already deleted)
        if (error.response?.status === 404) {
          // Remove from local state and refresh
          setPurchaseRequests(prev => prev.filter(pr => pr.id !== prId));
          await fetchPurchaseRequests();
          toast.info(`${prNumber} has already been deleted`);
        } else {
          toast.error(error.response?.data?.error || 'Failed to delete purchase request');
        }
      }
    }
  };

  const handleSendMailToProcurement = async (pr: PurchaseRequest) => {
    try {
      // Show loading toast
      const loadingToast = toast.loading(`Sending email for ${pr.prNumber}...`);
      
      const response = await apiClient.get(`/purchase_email/${pr.id}`);
      
      toast.dismiss(loadingToast);
      
      if (response.data.success) {
        toast.success(`Email sent to procurement team for ${pr.prNumber}`);
      } else {
        toast.error(response.data.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      
      // Check if the purchase request exists
      if (error.response?.status === 404) {
        toast.error(`Purchase request ${pr.prNumber} not found. It may have been deleted.`);
        // Refresh the list
        await fetchPurchaseRequests();
      } else {
        toast.error(error.response?.data?.error || 'Failed to send email to procurement team');
      }
    }
  };

  const handleViewPR = (prId: string) => {
    // Directly open modal - let the modal handle fetching and error states
    setSelectedPR(prId);
    setShowDetailsModal(true);
  };

  const handleEditPR = async (pr: PurchaseRequest) => {
    try {
      // Show loading toast
      const loadingToast = toast.loading('Loading purchase details...');
      
      const response = await apiClient.get(`/purchase/${pr.id}`);
      toast.dismiss(loadingToast);
      
      if (response.data.success) {
        // Backend returns 'purchase' not 'purchase_request'
        const purchase = response.data.purchase;
        const materials = purchase.materials || [];
        const totalAmount = materials.reduce((sum: number, m: any) => 
          sum + (m.quantity * m.cost), 0
        );
        
        const updatedPR = {
          ...pr,
          amount: totalAmount,
          items: materials.length,
          // Pass the full purchase data for editing
          originalData: purchase,
          materials: materials
        };
        
        setEditingPR(updatedPR);
        setShowEditModal(true);
      } else {
        toast.error('Purchase request not found');
        await fetchPurchaseRequests();
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('Purchase request no longer exists');
        await fetchPurchaseRequests();
      } else {
        // Still open the edit form with existing data
        setEditingPR(pr);
        setShowEditModal(true);
      }
    }
  };

  if (activeView === 'purchase' || showEditModal) {
    return (
      <PurchaseRequisitionForm 
        existingData={editingPR}
        isEditMode={!!editingPR}
        onClose={() => {
          setActiveView('dashboard');
          setShowEditModal(false);
          setEditingPR(null);
          fetchPurchaseRequests(); // Refresh data after form submission
        }} 
      />
    );
  }

  if (activeView === 'vendor') {
    return (
      <VendorQuotationForm 
        onClose={() => {
          setActiveView('dashboard');
          fetchVendorQuotations(); // Refresh data after form submission
        }} 
      />
    );
  }


  // Show loading spinner while fetching data
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#243d8a] mx-auto mb-4" />
          <p className="text-gray-600">Loading procurement data...</p>
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
        className="bg-white rounded-xl shadow-sm p-6 border"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-7 h-7 text-[#243d8a]" />
              Procurement & Costing Hub
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage purchase requisitions, vendor quotations, and approvals
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search PR, VQ, or vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
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
                      <span className="text-xs text-gray-500">vs last month</span>
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="requisitions" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-white shadow-sm">
          <TabsTrigger value="requisitions" className="data-[state=active]:bg-[#243d8a]/5">
            <FileText className="w-4 h-4 mr-2" />
            Requisitions
          </TabsTrigger>
          <TabsTrigger value="quotations" className="data-[state=active]:bg-purple-50">
            <Users className="w-4 h-4 mr-2" />
            Quotations
          </TabsTrigger>
          <TabsTrigger value="approvals" className="data-[state=active]:bg-amber-50">
            <CheckCircle className="w-4 h-4 mr-2" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-green-50">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Purchase Requisitions Tab */}
        <TabsContent value="requisitions">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-red-600" />
                  Purchase Requisitions
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setActiveView('purchase')}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Purchase Request
                  </Button>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PR Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requester
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {purchaseRequests.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-lg font-medium">No purchase requisitions found</p>
                            <p className="text-sm mt-1">Create your first purchase requisition to get started</p>
                            <Button 
                              onClick={() => setActiveView('purchase')}
                              className="mt-4 bg-[#243d8a] hover:bg-[#243d8a]/90"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Create Purchase Request
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                    purchaseRequests.map((pr) => (
                      <motion.tr 
                        key={pr.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-[#243d8a] hover:text-[#243d8a]/80 cursor-pointer">
                              {pr.prNumber}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm text-gray-900">{pr.project}</p>
                            <p className="text-xs text-gray-500">{pr.items} items</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                {pr.requester.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <span className="text-sm text-gray-900">{pr.requester}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            AED {pr.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={`${getPriorityColor(pr.priority)} border`}>
                            {pr.priority.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={`${getStatusColor(pr.status)} border`}>
                            {pr.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(pr.date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewPR(pr.id)}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditPR(pr)}
                              title="Edit Purchase Request"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendMailToProcurement(pr)}
                              title="Send Mail to Procurement"
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePR(pr.id, pr.prNumber)}
                              title="Delete Request"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendor Quotations Tab */}
        <TabsContent value="quotations">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  Vendor Quotations
                </CardTitle>
                <Button
                  onClick={() => setActiveView('vendor')}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Quotation
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        VQ Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valid Until
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendorQuotations.map((vq) => (
                      <motion.tr 
                        key={vq.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-medium text-purple-600 hover:text-purple-800 cursor-pointer">
                              {vq.vqNumber}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm text-gray-900">{vq.vendor}</p>
                            <p className="text-xs text-gray-500">{vq.items} items</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {vq.project}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            AED {vq.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={`${getStatusColor(vq.status)} border`}>
                            {vq.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vq.validUntil}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedVendorQuote(vq);
                                setShowVendorModal(true);
                              }}
                              title="View Vendor Quotation"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/procurement/vendor-quotations/edit/${vq.id}`)}
                              title="Edit Vendor Quotation"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                const data = JSON.stringify(vq, null, 2);
                                const blob = new Blob([data], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `VQ_${vq.vqNumber}.json`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              }}
                              title="Download"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pending Approvals */}
            <Card className="shadow-md lg:col-span-2">
              <CardHeader className="bg-amber-50 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-5 h-5 text-amber-600" />
                  Pending Your Approval
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">PR-2024-00{item + 3}</span>
                          <Badge className="bg-amber-100 text-amber-700 border border-amber-300 text-xs">
                            Urgent
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">Marina Bay Residences - Phase 2</p>
                        <p className="text-xs text-gray-500 mt-1">Submitted by John Tan • 2 hours ago</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg text-gray-900">AED 45,000</p>
                        <Button size="sm" className="mt-2 bg-amber-600 hover:bg-amber-700">
                          Review
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="shadow-md">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="text-base">Approval Statistics</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Avg. Approval Time</span>
                    <span className="font-semibold text-sm">2.5 hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">This Week</span>
                    <span className="font-semibold text-sm">12 approved</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Rejection Rate</span>
                    <span className="font-semibold text-sm text-red-600">8%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Escalations</span>
                    <span className="font-semibold text-sm">3 cases</span>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <Button className="w-full" variant="outline">
                    <Activity className="w-4 h-4 mr-2" />
                    View Full Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending Trends */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Monthly Spending Trends
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Chart Component Here</p>
                </div>
              </CardContent>
            </Card>

            {/* Top Vendors */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="w-5 h-5 text-purple-600" />
                  Top Performing Vendors
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {['ABC Contractors', 'XYZ Builders', 'DEF Suppliers'].map((vendor, idx) => (
                    <div key={vendor} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          idx === 0 ? 'bg-gold-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{vendor}</p>
                          <p className="text-xs text-gray-500">95% on-time delivery</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">AED 245,000</p>
                        <p className="text-xs text-gray-500">12 orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-[#243d8a]/5 to-cyan-50 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="w-5 h-5 text-[#243d8a]" />
                  Spending by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {[
                    { category: 'Materials', amount: 450000, percentage: 45 },
                    { category: 'Labor', amount: 350000, percentage: 35 },
                    { category: 'Equipment', amount: 150000, percentage: 15 },
                    { category: 'Others', amount: 50000, percentage: 5 }
                  ].map((item) => (
                    <div key={item.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{item.category}</span>
                        <span className="text-sm text-gray-600">AED {item.amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#243d8a] h-2 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* KPIs */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="w-5 h-5 text-indigo-600" />
                  Key Performance Indicators
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Cost Savings', value: '12%', icon: TrendingDown, color: 'text-green-600' },
                    { label: 'Process Efficiency', value: '89%', icon: Zap, color: 'text-[#243d8a]' },
                    { label: 'Vendor Satisfaction', value: '4.5/5', icon: Award, color: 'text-purple-600' },
                    { label: 'Compliance Rate', value: '98%', icon: Shield, color: 'text-indigo-600' }
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                        <span className="text-xs text-gray-600">{kpi.label}</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Vendor Quotation View Modal */}
      {/* Purchase Details Modal */}
      <PurchaseDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedPR(null);
          // Refresh data when modal closes
          fetchPurchaseRequests();
        }}
        purchaseId={selectedPR || ''}
      />
    </div>
  );
};

export default ProcurementDashboard;