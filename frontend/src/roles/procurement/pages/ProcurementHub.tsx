import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import PurchaseCard from '../components/PurchaseCard';
import PurchaseDetailsModal from '../components/PurchaseDetailsModal';
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
  Search,
  Building2,
  ShoppingCart,
  TrendingDown,
  Award,
  Target,
  BarChart3,
  Filter,
  RefreshCw
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
  const [searchTerm, setSearchTerm] = useState('');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<'details' | 'history'>('details');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [pmEmailedPRs, setPmEmailedPRs] = useState<Set<number>>(new Set());

  // Confirmation Dialogs (removed 'delete' type)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject' | 'email';
    purchaseId: number | null;
    message: string;
  }>({
    isOpen: false,
    type: 'email',
    purchaseId: null,
    message: ''
  });

  // Fetch data on mount
  useEffect(() => {
    fetchPurchases();
  }, []);

  // Filter purchases when tab or search changes
  useEffect(() => {
    filterPurchases();
  }, [activeTab, searchTerm, purchases]);

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
          if (p.latest_status === 'approved' || p.approvals?.some((a: any) => 
            a.reviewer_role === 'procurement' && a.status === 'approved'
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
      
      try {
        metricsData = await procurementService.getDashboardMetrics();
      } catch (error: any) {
        console.error('Error fetching metrics:', error);
        // Use default/calculated metrics if dashboard endpoint fails
        metricsData = {
          totalPurchaseValue: purchaseData.reduce((sum, p) => {
            const amount = p.materials?.reduce((s, m) => s + (m.quantity * m.cost), 0) || 0;
            return sum + amount;
          }, 0),
          totalRequisitions: purchaseData.length,
          pendingRequisitions: purchaseData.filter(p => !p.latest_status || p.latest_status === 'pending').length,
          vendorPerformance: 92
        };
      }

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

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(purchase =>
        purchase.purchase_id.toString().includes(searchTerm) ||
        purchase.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.site_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.project_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply tab filter (removed 'all' and 'under_review')
    switch (activeTab) {
      case 'pending':
        filtered = filtered.filter(p => 
          (!p.latest_status || p.latest_status === 'pending') && 
          !pmEmailedPRs.has(p.purchase_id)
        );
        break;
      case 'approved':
        filtered = filtered.filter(p => 
          p.latest_status === 'approved' || 
          pmEmailedPRs.has(p.purchase_id)
        );
        break;
      case 'rejected':
        filtered = filtered.filter(p => 
          p.latest_status === 'rejected' || 
          p.status === 'rejected'
        );
        break;
      default:
        // Default to pending
        filtered = filtered.filter(p => 
          (!p.latest_status || p.latest_status === 'pending') && 
          !pmEmailedPRs.has(p.purchase_id)
        );
        break;
    }

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

  // Edit handler removed - procurement doesn't handle direct editing

  // Delete handler removed - procurement role doesn't have delete permission

  const handleSendEmail = (purchaseId: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'email',
      purchaseId,
      message: 'Send this purchase request to Project Manager for approval?'
    });
  };

  const handleApprove = (purchaseId: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'approve',
      purchaseId,
      message: 'Are you sure you want to approve this purchase request?'
    });
  };

  const handleReject = (purchaseId: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'reject',
      purchaseId,
      message: 'Are you sure you want to reject this purchase request?'
    });
  };

  const confirmAction = async () => {
    const { type, purchaseId } = confirmDialog;
    if (!purchaseId) return;

    try {
      switch (type) {
        case 'approve':
          await procurementService.approvePurchase(purchaseId);
          toast.success('Purchase request approved successfully');
          break;
        case 'reject':
          await procurementService.rejectPurchase(purchaseId, 'Rejected by procurement');
          toast.success('Purchase request rejected');
          break;
        case 'email':
          await procurementService.sendApprovalEmail(purchaseId);
          setPmEmailedPRs(prev => new Set(prev).add(purchaseId));
          toast.success('Approval request sent to Project Manager');
          break;
      }
      
      // Refresh data
      await fetchPurchases();
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setConfirmDialog({ isOpen: false, type: 'email', purchaseId: null, message: '' });
    }
  };

  const handleExport = () => {
    const data = JSON.stringify(filteredPurchases, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procurement_purchases_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
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
        className="bg-white rounded-xl shadow-sm p-6 border"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-7 h-7 text-red-600" />
              Procurement Hub
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Process purchase requisitions, manage vendor quotations, and handle approvals
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search purchases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchPurchases}
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
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
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-red-600" />
            Purchase Requisitions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b px-6 pt-4">
              <TabsList className="grid grid-cols-3 w-full max-w-xl">
                <TabsTrigger value="pending">
                  Pending ({purchases.filter(p => (!p.latest_status || p.latest_status === 'pending') && !pmEmailedPRs.has(p.purchase_id)).length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved ({purchases.filter(p => p.latest_status === 'approved' || pmEmailedPRs.has(p.purchase_id)).length})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({purchases.filter(p => p.latest_status === 'rejected').length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Purchase Cards Grid - 2 columns */}
            <TabsContent value={activeTab} className="p-6">
              {filteredPurchases.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredPurchases.map((purchase) => (
                    <PurchaseCard
                      key={purchase.purchase_id}
                      purchase={purchase}
                      onViewDetails={handleViewDetails}
                      onViewHistory={handleViewHistory}
                      onSendEmail={handleSendEmail}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      emailSent={pmEmailedPRs.has(purchase.purchase_id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No purchase requisitions found</p>
                  <p className="text-sm mt-1">
                    {searchTerm 
                      ? 'Try adjusting your search terms' 
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
      />

      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmDialog.isOpen} 
        onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, isOpen: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === 'approve' && 'Approve Purchase Request'}
              {confirmDialog.type === 'reject' && 'Reject Purchase Request'}
              {confirmDialog.type === 'email' && 'Send for Approval'}
            </DialogTitle>
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
              variant={confirmDialog.type === 'reject' ? 'destructive' : 'default'}
              onClick={confirmAction}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProcurementHub;