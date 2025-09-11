import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Filter, Download, Eye, Edit2, Trash2, Building2, SlidersHorizontal, DollarSign, Calendar, Package, Users } from 'lucide-react';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import VendorQuotationForm from '@/components/forms/VendorQuotationForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { toast } from 'sonner';
import { apiClient } from '@/api/config';

interface VendorQuotation {
  id: string;
  vqNumber: string;
  vendor: string;
  project: string;
  amount: number;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'negotiation';
  validUntil: string;
  items: number;
  submittedBy: string;
  submittedDate: string;
}

const VendorQuotationsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterVendor, setFilterVendor] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [filterValidityRange, setFilterValidityRange] = useState('all');
  const [filterAmountRange, setFilterAmountRange] = useState({ min: '', max: '' });
  const [filterItemsRange, setFilterItemsRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('submittedDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<VendorQuotation | null>(null);
  const [vendorQuotations, setVendorQuotations] = useState<VendorQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch vendor quotations from API (currently using mock data as API doesn't exist yet)
  useEffect(() => {
    fetchVendorQuotations();
  }, []);

  const fetchVendorQuotations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with actual API call when backend is ready
      // const response = await apiClient.get('/vendor_quotations');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data for now - will be replaced with real API call
      const mockQuotations: VendorQuotation[] = [
        {
          id: '1',
          vqNumber: 'VQ-2024-001',
          vendor: 'ABC Contractors Pte Ltd',
          project: 'Marina Bay Residences - Phase 1',
          amount: 125000,
          status: 'under_review',
          validUntil: '2024-12-15',
          items: 15,
          submittedBy: 'procurement',
          submittedDate: '2024-08-20'
        },
        {
          id: '2',
          vqNumber: 'VQ-2024-002',
          vendor: 'Singapore Construction Solutions',
          project: 'Orchard Office Tower',
          amount: 98000,
          status: 'approved',
          validUntil: '2024-12-20',
          items: 10,
          submittedBy: 'procurement',
          submittedDate: '2024-08-22'
        },
        {
          id: '3',
          vqNumber: 'VQ-2024-003',
          vendor: 'Elite Building Materials',
          project: 'Sentosa Resort Extension',
          amount: 75000,
          status: 'negotiation',
          validUntil: '2024-12-25',
          items: 8,
          submittedBy: 'procurement',
          submittedDate: '2024-08-25'
        }
      ];
      
      setVendorQuotations(mockQuotations);
    } catch (err: any) {
      console.error('Error fetching vendor quotations:', err);
      setError(err.response?.data?.error || 'Failed to fetch vendor quotations');
      setVendorQuotations([]);
    } finally {
      setLoading(false);
    }
  };

  // Role-based permissions
  const canCreateQuotation = () => {
    return [UserRole.PROCUREMENT, UserRole.PROJECT_MANAGER].includes(user?.role_id as UserRole);
  };

  const canEditQuotation = (quotation: VendorQuotation) => {
    // Procurement can edit any quotation, others can edit only their own
    if (user?.role_id === UserRole.PROCUREMENT) return true;
    return quotation.submittedBy === user?.user_id && quotation.status !== 'approved';
  };

  const canDeleteQuotation = (quotation: VendorQuotation) => {
    // Only creator can delete, and only if not approved
    return quotation.submittedBy === user?.user_id && quotation.status !== 'approved';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'under_review': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      case 'negotiation': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Get unique vendors for filter dropdown
  const uniqueVendors = useMemo(() => {
    const vendors = [...new Set(vendorQuotations.map(q => q.vendor))];
    return vendors.sort();
  }, [vendorQuotations]);

  // Filter and sort quotations
  const filteredQuotations = useMemo(() => {
    let filtered = vendorQuotations;

    // Filter by project
    if (filterProject !== 'all') {
      filtered = filtered.filter(quotation => quotation.project === filterProject);
    }

    // Filter by validity range
    if (filterValidityRange !== 'all') {
      const today = new Date();
      filtered = filtered.filter(quotation => {
        const validUntil = new Date(quotation.validUntil);
        const daysDiff = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 3600 * 24));
        
        switch (filterValidityRange) {
          case 'expired':
            return daysDiff < 0;
          case 'expiring_soon':
            return daysDiff >= 0 && daysDiff <= 7;
          case 'valid':
            return daysDiff > 7;
          default:
            return true;
        }
      });
    }

    // Filter by amount range
    if (filterAmountRange.min || filterAmountRange.max) {
      filtered = filtered.filter(quotation => {
        const amount = quotation.amount;
        const min = filterAmountRange.min ? parseFloat(filterAmountRange.min) : 0;
        const max = filterAmountRange.max ? parseFloat(filterAmountRange.max) : Infinity;
        return amount >= min && amount <= max;
      });
    }

    // Filter by items range
    if (filterItemsRange.min || filterItemsRange.max) {
      filtered = filtered.filter(quotation => {
        const items = quotation.items;
        const min = filterItemsRange.min ? parseInt(filterItemsRange.min) : 0;
        const max = filterItemsRange.max ? parseInt(filterItemsRange.max) : Infinity;
        return items >= min && items <= max;
      });
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(quotation => quotation.status === filterStatus);
    }

    // Filter by vendor
    if (filterVendor !== 'all') {
      filtered = filtered.filter(quotation => quotation.vendor === filterVendor);
    }

    // Sort results
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'submittedDate':
          aValue = new Date(a.submittedDate).getTime();
          bValue = new Date(b.submittedDate).getTime();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'validUntil':
          aValue = new Date(a.validUntil).getTime();
          bValue = new Date(b.validUntil).getTime();
          break;
        case 'vendor':
          aValue = a.vendor.toLowerCase();
          bValue = b.vendor.toLowerCase();
          break;
        case 'project':
          aValue = a.project.toLowerCase();
          bValue = b.project.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'items':
          aValue = a.items;
          bValue = b.items;
          break;
        default:
          aValue = a.vqNumber;
          bValue = b.vqNumber;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

    return filtered;
  }, [vendorQuotations, filterStatus, filterVendor, filterProject, filterValidityRange, filterAmountRange, filterItemsRange, sortBy, sortOrder]);

  const handleEdit = (quotation: VendorQuotation) => {
    setSelectedQuotation(quotation);
    setIsFormOpen(true);
  };

  const handleDelete = (quotationId: string) => {
    setVendorQuotations(prev => prev.filter(q => q.id !== quotationId));
    toast.success('Vendor quotation deleted successfully');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl shadow-xl p-6 text-gray-800 border border-red-200"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Vendor Quotations</h1>
              <p className="text-gray-600 mt-1">
                Manage vendor quotations and compare proposals
              </p>
            </div>
          </div>
          {canCreateQuotation() && (
            <Button 
              onClick={() => {
                setSelectedQuotation(null);
                setIsFormOpen(true);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Quotation
            </Button>
          )}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Quotations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredQuotations.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Under Review</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredQuotations.filter(q => q.status === 'under_review').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredQuotations.filter(q => q.status === 'approved').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  AED {filteredQuotations.reduce((sum, q) => sum + q.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Sort Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Primary Filter and Sort Row */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex gap-2 flex-wrap flex-1">
                <select
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white min-w-[150px]"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="Filter by status"
                  title="Filter by status"
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="negotiation">Negotiation</option>
                </select>
                
                <select
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white min-w-[150px]"
                  value={filterVendor}
                  onChange={(e) => setFilterVendor(e.target.value)}
                  aria-label="Filter by vendor"
                  title="Filter by vendor"
                >
                  <option value="all">All Vendors</option>
                  {uniqueVendors.map(vendor => (
                    <option key={vendor} value={vendor}>{vendor}</option>
                  ))}
                </select>
                
                <select
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white min-w-[150px]"
                  value={filterValidityRange}
                  onChange={(e) => setFilterValidityRange(e.target.value)}
                  aria-label="Filter by validity"
                  title="Filter by validity"
                >
                  <option value="all">All Validity</option>
                  <option value="expired">Expired</option>
                  <option value="expiring_soon">Expiring Soon</option>
                  <option value="valid">Valid</option>
                </select>
              </div>
              <div className="flex gap-2">
                <select
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white min-w-[150px]"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort by"
                  title="Sort by"
                >
                  <option value="submittedDate">Sort by Date</option>
                  <option value="amount">Sort by Amount</option>
                  <option value="vendor">Sort by Vendor</option>
                  <option value="project">Sort by Project</option>
                  <option value="status">Sort by Status</option>
                  <option value="validUntil">Sort by Valid Until</option>
                  <option value="items">Sort by Items</option>
                </select>
                
                <Button 
                  variant="outline" 
                  className="px-3"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="px-4"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  {showAdvancedFilters ? 'Hide' : 'More'} Filters
                </Button>
                
                <Button variant="outline" className="px-4">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Advanced Filters Row */}
            {showAdvancedFilters && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    Project
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
                    value={filterProject}
                    onChange={(e) => setFilterProject(e.target.value)}
                  >
                    <option value="all">All Projects</option>
                    {[...new Set(vendorQuotations.map(q => q.project))].map(project => (
                      <option key={project} value={project}>{project}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    Amount Range (AED)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      value={filterAmountRange.min}
                      onChange={(e) => setFilterAmountRange(prev => ({ ...prev, min: e.target.value }))}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      value={filterAmountRange.max}
                      onChange={(e) => setFilterAmountRange(prev => ({ ...prev, max: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    Items Count Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      value={filterItemsRange.min}
                      onChange={(e) => setFilterItemsRange(prev => ({ ...prev, min: e.target.value }))}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      value={filterItemsRange.max}
                      onChange={(e) => setFilterItemsRange(prev => ({ ...prev, max: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="px-4 py-2 text-sm w-full"
                    onClick={() => {
                      setFilterStatus('all');
                      setFilterVendor('all');
                      setFilterProject('all');
                      setFilterValidityRange('all');
                      setFilterAmountRange({ min: '', max: '' });
                      setFilterItemsRange({ min: '', max: '' });
                      setSortBy('submittedDate');
                      setSortOrder('desc');
                    }}
                  >
                    Clear All Filters
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Active Filters Display */}
            {(filterStatus !== 'all' || filterVendor !== 'all' || filterProject !== 'all' || filterValidityRange !== 'all' || filterAmountRange.min || filterAmountRange.max || filterItemsRange.min || filterItemsRange.max) && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-gray-500">Active filters:</span>
                {filterStatus !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Status: {filterStatus}
                    <button 
                      className="ml-1 text-gray-400 hover:text-gray-600"
                      onClick={() => setFilterStatus('all')}
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {filterVendor !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Vendor: {filterVendor}
                    <button 
                      className="ml-1 text-gray-400 hover:text-gray-600"
                      onClick={() => setFilterVendor('all')}
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
                {filterValidityRange !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Validity: {filterValidityRange.replace('_', ' ')}
                    <button 
                      className="ml-1 text-gray-400 hover:text-gray-600"
                      onClick={() => setFilterValidityRange('all')}
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
                {(filterItemsRange.min || filterItemsRange.max) && (
                  <Badge variant="secondary" className="text-xs">
                    Items: {filterItemsRange.min || '0'} - {filterItemsRange.max || '∞'}
                    <button 
                      className="ml-1 text-gray-400 hover:text-gray-600"
                      onClick={() => setFilterItemsRange({ min: '', max: '' })}
                    >
                      ×
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vendor Quotations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Quotations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <ModernLoadingSpinners variant="pulse-wave" size="lg" />
              <span className="ml-4 text-gray-600">Loading vendor quotations...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={fetchVendorQuotations} variant="outline">
                Try Again
              </Button>
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No vendor quotations found</p>
              {canCreateQuotation() && (
                <Button 
                  onClick={() => {
                    setSelectedQuotation(null);
                    setIsFormOpen(true);
                  }} 
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Quotation
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => {
                        setSortBy('vqNumber');
                        setSortOrder(sortBy === 'vqNumber' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      title="Click to sort by VQ Number"
                    >
                      <div className="flex items-center gap-1">
                        VQ Number
                        {sortBy === 'vqNumber' && (
                          <span className="text-purple-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => {
                        setSortBy('vendor');
                        setSortOrder(sortBy === 'vendor' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      title="Click to sort by Vendor"
                    >
                      <div className="flex items-center gap-1">
                        Vendor
                        {sortBy === 'vendor' && (
                          <span className="text-purple-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => {
                        setSortBy('project');
                        setSortOrder(sortBy === 'project' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      title="Click to sort by Project"
                    >
                      <div className="flex items-center gap-1">
                        Project
                        {sortBy === 'project' && (
                          <span className="text-purple-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => {
                        setSortBy('amount');
                        setSortOrder(sortBy === 'amount' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      title="Click to sort by Amount"
                    >
                      <div className="flex items-center gap-1">
                        Amount
                        {sortBy === 'amount' && (
                          <span className="text-purple-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => {
                        setSortBy('items');
                        setSortOrder(sortBy === 'items' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      title="Click to sort by Items"
                    >
                      <div className="flex items-center gap-1">
                        Items
                        {sortBy === 'items' && (
                          <span className="text-purple-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => {
                        setSortBy('status');
                        setSortOrder(sortBy === 'status' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      title="Click to sort by Status"
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {sortBy === 'status' && (
                          <span className="text-purple-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => {
                        setSortBy('validUntil');
                        setSortOrder(sortBy === 'validUntil' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      title="Click to sort by Valid Until"
                    >
                      <div className="flex items-center gap-1">
                        Valid Until
                        {sortBy === 'validUntil' && (
                          <span className="text-purple-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredQuotations.map((quotation) => (
                    <tr key={quotation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                        {quotation.vqNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {quotation.vendor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {quotation.project}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        AED {quotation.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {quotation.items}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={`${getStatusColor(quotation.status)} border`}>
                          {quotation.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {quotation.validUntil}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex gap-2">
                          <button 
                            className="text-blue-600 hover:text-blue-800"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {canEditQuotation(quotation) && (
                            <button 
                              onClick={() => handleEdit(quotation)}
                              className="text-yellow-600 hover:text-yellow-800"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          
                          {canDeleteQuotation(quotation) && (
                            <button 
                              onClick={() => handleDelete(quotation.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendor Quotation Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedQuotation ? 'Edit Vendor Quotation' : 'New Vendor Quotation'}
            </DialogTitle>
          </DialogHeader>
          <VendorQuotationForm 
            quotation={selectedQuotation}
            onClose={() => {
              setIsFormOpen(false);
              setSelectedQuotation(null);
              fetchVendorQuotations(); // Refresh data after form submission
            }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorQuotationsPage;