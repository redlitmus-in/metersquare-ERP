import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Search,
  Filter,
  RefreshCw,
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  CheckSquare,
  XSquare,
  AlertCircle,
  Mail,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import PurchaseCard from '../components/PurchaseCard';
import PurchaseDetailsModal from '../components/PurchaseDetailsModal';
import { siteSupervisorService, Purchase } from '../services/siteSupervisorService';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';

const SiteSupervisorHub: React.FC = () => {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<'details' | 'history'>('details');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Metrics state
  const [metrics, setMetrics] = useState({
    totalPurchases: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalValue: 0,
    emailSentCount: 0
  });

  // Fetch purchases on component mount
  useEffect(() => {
    fetchPurchases();
  }, []);

  // Filter purchases based on search and tab
  useEffect(() => {
    filterPurchases();
  }, [purchases, searchTerm, activeTab]);

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

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(purchase =>
        purchase.purchase_id.toString().includes(searchTerm) ||
        purchase.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.site_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.project_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply tab filter
    switch (activeTab) {
      case 'pending':
        // Only show purchases that are pending AND have NOT been sent via email
        filtered = filtered.filter(p => (p.status === 'pending' || !p.status) && !p.email_sent);
        break;
      case 'email-sent':
        // Only show purchases that have been sent via email
        filtered = filtered.filter(p => p.email_sent);
        break;
    }

    setFilteredPurchases(filtered);
  };

  const calculateMetrics = () => {
    const total = purchases.length;
    // Pending count: purchases that are pending AND not sent via email
    const pending = purchases.filter(p => (p.status === 'pending' || !p.status) && !p.email_sent).length;
    const approved = purchases.filter(p => p.status === 'approved').length;
    const rejected = purchases.filter(p => p.status === 'rejected').length;
    // Email sent count: all purchases that have been sent via email
    const emailSent = purchases.filter(p => p.email_sent).length;

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
      emailSentCount: emailSent
    });
  };

  const handleViewDetails = (purchaseId: number) => {
    setSelectedPurchaseId(purchaseId);
    setModalMode('details');
    setDetailsModalOpen(true);
  };

  const handleViewHistory = (purchaseId: number) => {
    setSelectedPurchaseId(purchaseId);
    setModalMode('history');
    setDetailsModalOpen(true);
  };

  const handleEdit = (purchaseId: number) => {
    // Navigate to procurement page with edit mode
    // The procurement form will handle the edit
    navigate(`/procurement?edit=${purchaseId}`);
  };

  const handleDelete = async (purchaseId: number) => {
    if (!window.confirm('Are you sure you want to delete this purchase request? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      await siteSupervisorService.deletePurchase(purchaseId);
      toast.success('Purchase request deleted successfully');
      // Remove the deleted purchase from the list immediately for better UX
      setPurchases(prev => prev.filter(p => p.purchase_id !== purchaseId));
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete purchase request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = async (purchaseId: number) => {
    if (!window.confirm('Send this purchase request via email to the procurement team?')) {
      return;
    }

    setIsLoading(true);
    try {
      await siteSupervisorService.sendPurchaseEmail(purchaseId);
      toast.success('Email sent successfully to procurement team');
      // Update the purchase's email_sent status immediately
      setPurchases(prev => prev.map(p => 
        p.purchase_id === purchaseId ? { ...p, email_sent: true } : p
      ));
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
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboards/site-supervisor')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          <Button
            onClick={() => navigate('/procurement')}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Purchase Request
          </Button>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mt-4">Purchase Management Hub</h1>
        <p className="text-gray-600 text-sm mt-1">Manage and track all your purchase requests</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-500" />
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
              <DollarSign className="h-4 w-4 text-purple-500" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-purple-600">{formatCurrency(metrics.totalValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by ID, purpose, location, or project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={fetchPurchases}
          disabled={isLoading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-auto max-w-md">
          <TabsTrigger value="pending" className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Pending ({metrics.pendingCount})
          </TabsTrigger>
          <TabsTrigger value="email-sent" className="flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" />
            Email Sent ({metrics.emailSentCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredPurchases.length > 0 ? (
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
          ) : (
            <Card className="p-8">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No purchases found</h3>
                <p className="text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search criteria' : 'Create your first purchase request to get started'}
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => navigate('/procurement')}
                    className="mt-4 bg-orange-600 hover:bg-orange-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Purchase Request
                  </Button>
                )}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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

export default SiteSupervisorHub;