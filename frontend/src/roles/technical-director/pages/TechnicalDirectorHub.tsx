/**
 * Technical Director Hub - Main Page
 * Central hub for managing all technical director workflows and approvals
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Search, 
  Filter,
  RefreshCw,
  AlertTriangle,
  Eye,
  FileText,
  BarChart3,
  TrendingUp,
  Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { technicalDirectorService } from '../services/technicalDirectorService';
import TechnicalDirectorApprovalCard from '../components/TechnicalDirectorApprovalCard';
import TechnicalDirectorApprovalModal from '../components/TechnicalDirectorApprovalModal';
import PurchaseDetailsModal from '../components/PurchaseDetailsModal';
import type { Purchase, TechnicalDirectorPurchasesResponse } from '../types';

const TechnicalDirectorHub: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [summary, setSummary] = useState<TechnicalDirectorPurchasesResponse['summary'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  
  // Modal states
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [processingPurchases, setProcessingPurchases] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchPurchases();
  }, []);

  useEffect(() => {
    filterPurchases();
  }, [purchases, searchTerm, statusFilter, priorityFilter]);

  const fetchPurchases = async () => {
    try {
      setIsLoading(true);
      const response = await technicalDirectorService.getTechnicalDirectorPurchases();
      setPurchases(response.purchases || []);
      setSummary(response.summary);
    } catch (error) {
      console.error('Error fetching technical director purchases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const response = await technicalDirectorService.getTechnicalDirectorPurchases();
      setPurchases(response.purchases || []);
      setSummary(response.summary);
    } catch (error) {
      console.error('Error refreshing purchases:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filterPurchases = () => {
    let filtered = [...purchases];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(purchase => 
        purchase.purchase_id.toString().includes(searchTerm) ||
        purchase.project_id.toString().includes(searchTerm) ||
        purchase.requested_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.site_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.purpose.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(purchase => {
        const tdStatus = technicalDirectorService.getTechnicalDirectorStatus(purchase);
        return tdStatus === statusFilter;
      });
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(purchase => {
        const priority = purchase.materials?.[0]?.priority || 'medium';
        return priority.toLowerCase() === priorityFilter;
      });
    }

    setFilteredPurchases(filtered);
  };

  const handleApprove = (purchaseId: number) => {
    const purchase = purchases.find(p => p.purchase_id === purchaseId);
    if (purchase) {
      setSelectedPurchase(purchase);
      setApprovalModalOpen(true);
    }
  };

  const handleReject = (purchaseId: number) => {
    const purchase = purchases.find(p => p.purchase_id === purchaseId);
    if (purchase) {
      setSelectedPurchase(purchase);
      setApprovalModalOpen(true);
    }
  };

  const handleViewDetails = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setDetailsModalOpen(true);
  };

  const handleViewStatus = (purchaseId: number) => {
    const purchase = purchases.find(p => p.purchase_id === purchaseId);
    if (purchase) {
      setSelectedPurchase(purchase);
      setDetailsModalOpen(true);
    }
  };

  const handleApprovalSubmit = async (action: 'approve' | 'reject', data: any) => {
    if (!selectedPurchase) return;

    const purchaseId = selectedPurchase.purchase_id;
    setProcessingPurchases(prev => new Set(prev).add(purchaseId));

    try {
      if (action === 'approve') {
        await technicalDirectorService.submitApproval(data.purchaseId, data.comments);
      } else {
        await technicalDirectorService.submitRejection(
          data.purchaseId, 
          data.rejectionReason, 
          data.comments
        );
      }

      // Refresh purchases after successful action
      await fetchPurchases();
      
    } catch (error) {
      console.error('Error submitting approval:', error);
      // Show error message
    } finally {
      setProcessingPurchases(prev => {
        const newSet = new Set(prev);
        newSet.delete(purchaseId);
        return newSet;
      });
    }
  };

  // Separate purchases by status
  const pendingPurchases = filteredPurchases.filter(purchase => {
    const tdStatus = technicalDirectorService.getTechnicalDirectorStatus(purchase);
    return tdStatus === 'pending' && technicalDirectorService.needsTechnicalDirectorReview(purchase);
  });

  const approvedPurchases = filteredPurchases.filter(purchase => {
    const tdStatus = technicalDirectorService.getTechnicalDirectorStatus(purchase);
    return tdStatus === 'approved';
  });

  const rejectedPurchases = filteredPurchases.filter(purchase => {
    const tdStatus = technicalDirectorService.getTechnicalDirectorStatus(purchase);
    return tdStatus === 'rejected';
  });

  // Get summary stats
  const summaryStats = [
    {
      title: 'Total Purchases',
      value: summary?.total_count || 0,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Pending Review',
      value: summary?.pending_count || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Approved',
      value: summary?.approved_count || 0,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Value',
      value: technicalDirectorService.formatCurrency(summary?.total_value || 0),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Technical Director Hub</h1>
          <p className="text-gray-500 mt-1">Manage purchase approvals and technical reviews</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryStats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by ID, project, requester, location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Pending, Approved, and Rejected */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingPurchases.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Approved ({approvedPurchases.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Rejected ({rejectedPurchases.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4">
          {pendingPurchases.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {pendingPurchases.map((purchase) => (
                <TechnicalDirectorApprovalCard
                  key={purchase.purchase_id}
                  purchase={purchase}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onViewDetails={handleViewDetails}
                  onViewStatus={handleViewStatus}
                  isProcessing={processingPurchases.has(purchase.purchase_id)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Reviews</h3>
                <p className="text-gray-500">All purchases have been reviewed</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Approved Tab */}
        <TabsContent value="approved" className="space-y-4">
          {approvedPurchases.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {approvedPurchases.map((purchase) => (
                <TechnicalDirectorApprovalCard
                  key={purchase.purchase_id}
                  purchase={purchase}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onViewDetails={handleViewDetails}
                  onViewStatus={handleViewStatus}
                  isProcessing={processingPurchases.has(purchase.purchase_id)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Approved Purchases</h3>
                <p className="text-gray-500">No purchases have been approved yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Rejected Tab */}
        <TabsContent value="rejected" className="space-y-4">
          {rejectedPurchases.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {rejectedPurchases.map((purchase) => (
                <TechnicalDirectorApprovalCard
                  key={purchase.purchase_id}
                  purchase={purchase}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onViewDetails={handleViewDetails}
                  onViewStatus={handleViewStatus}
                  isProcessing={processingPurchases.has(purchase.purchase_id)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Rejected Purchases</h3>
                <p className="text-gray-500">No purchases have been rejected</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <TechnicalDirectorApprovalModal
        isOpen={approvalModalOpen}
        onClose={() => {
          setApprovalModalOpen(false);
          setSelectedPurchase(null);
        }}
        purchase={selectedPurchase}
        onSubmit={handleApprovalSubmit}
        isLoading={selectedPurchase ? processingPurchases.has(selectedPurchase.purchase_id) : false}
      />

      <PurchaseDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedPurchase(null);
        }}
        purchase={selectedPurchase}
      />
    </div>
  );
};

export default TechnicalDirectorHub;