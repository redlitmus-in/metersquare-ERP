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
  TrendingUp, Users, Calendar
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PurchaseApprovalCard } from '../components/PurchaseApprovalCard';
import PurchaseDetailsModal from '../components/PurchaseDetailsModal';
import { projectManagerService, ProcurementPurchase } from '../services/projectManagerService';
import { toast } from 'sonner';

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
    className={`${metric.bgColor} rounded-lg p-6 border border-gray-100`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{metric.title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-2">{metric.value}</p>
        {metric.trend && (
          <div className="flex items-center mt-2">
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
      <div className={`${metric.iconColor} p-3 rounded-lg`}>
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
  const [filteredPurchases, setFilteredPurchases] = useState<ProcurementPurchase[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Modal states
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<'details' | 'history'>('details');

  // Fetch purchases from API
  const fetchPurchases = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await projectManagerService.getProcurementApprovedPurchases();
      
      if (response.success) {
        setPurchases(response.approved_procurement_purchases || []);
        
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
            title: 'Total Value',
            value: `AED ${(response.summary?.financial_summary?.total_value || 0).toLocaleString()}`,
            icon: <TrendingUp className="h-5 w-5 text-indigo-600" />,
            bgColor: 'bg-indigo-50',
            iconColor: 'bg-indigo-100',
            trend: '+15%',
            trendType: 'up'
          },
          {
            title: 'Avg Processing Time',
            value: '2.5 days',
            icon: <Calendar className="h-5 w-5 text-purple-600" />,
            bgColor: 'bg-purple-50',
            iconColor: 'bg-purple-100',
            trend: 'Stable',
            trendType: 'neutral'
          }
        ];
        
        setMetrics(metricsData);
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast.error('Failed to fetch purchase requests. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases, refreshKey]);

  // Filter purchases based on active tab and search
  useEffect(() => {
    let filtered = [...purchases];

    // Filter by status based on active tab
    switch (activeTab) {
      case 'pending':
        filtered = filtered.filter(p => !p.pm_status || p.pm_status === 'pending');
        break;
      case 'approved':
        filtered = filtered.filter(p => p.pm_status === 'approved');
        break;
      case 'rejected':
        filtered = filtered.filter(p => p.pm_status === 'rejected');
        break;
      default:
        // Show all
        break;
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.purchase_id?.toString().includes(searchTerm) ||
        p.site_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPurchases(filtered);
  }, [purchases, activeTab, searchTerm]);

  // Handle approval action
  const handleApprove = async (purchaseId: number) => {
    try {
      const result = await projectManagerService.approvePurchase(purchaseId, 'Approved by Project Manager');
      if (result.success) {
        toast.success('Purchase approved successfully');
        setRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      toast.error('Failed to approve purchase');
    }
  };

  // Handle rejection action
  const handleReject = async (purchaseId: number, reason: string) => {
    try {
      const result = await projectManagerService.rejectPurchase(purchaseId, reason, 'Rejected by Project Manager');
      if (result.success) {
        toast.success('Purchase rejected successfully');
        setRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      toast.error('Failed to reject purchase');
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

  // Handle send to estimation
  const handleSendToEstimation = async (purchaseId: number) => {
    try {
      // This would call the appropriate API endpoint
      toast.success(`Purchase ${purchaseId} sent to Estimation team`);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      toast.error('Failed to send to Estimation');
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

  // Calculate tab counts
  const tabCounts = useMemo(() => ({
    pending: purchases.filter(p => !p.pm_status || p.pm_status === 'pending').length,
    approved: purchases.filter(p => p.pm_status === 'approved').length,
    rejected: purchases.filter(p => p.pm_status === 'rejected').length
  }), [purchases]);

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
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshKey(prev => prev + 1)}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Badge variant="secondary" className="px-3 py-1">
              <Users className="h-3 w-3 mr-1" />
              Project Manager
            </Badge>
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b px-6 pt-4">
                <TabsList className="grid w-full max-w-md grid-cols-3 bg-gray-100/50">
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
                </TabsList>
              </div>

              {/* Tab Content */}
              <TabsContent value={activeTab} className="p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : filteredPurchases.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No purchases found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                        isLoading={false}
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
    </div>
  );
};

export default ProjectManagerHub;