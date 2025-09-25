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
import { procurementService } from '../services/procurementService';

interface VendorQuotation {
  id: string;
  quotation_id?: number;
  vq_number?: string;
  vqNumber?: string;
  vendor_id?: number;
  vendor_name?: string;
  vendor?: string;
  project_id?: string;
  project_name?: string;
  project?: string;
  total_amount?: number;
  amount?: number;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'negotiation';
  valid_until?: string;
  validUntil?: string;
  items_count?: number;
  items?: number;
  submitted_by?: string;
  submittedBy?: string;
  submitted_date?: string;
  submittedDate?: string;
  created_at?: string;
  created_by?: string;
  last_modified_at?: string;
  last_modified_by?: string;
  description?: string;
  terms_conditions?: string;
  payment_terms?: string;
  delivery_date?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  quotation_items?: QuotationItem[];
}

interface QuotationItem {
  item_id?: number;
  description: string;
  specification?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  remarks?: string;
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

  // Fetch vendor quotations from API
  useEffect(() => {
    fetchVendorQuotations();
  }, []);

  const fetchVendorQuotations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real vendor quotations from API
      const response = await apiClient.get('/vendor_quotations');
      if (response.data.success) {
        const quotations = response.data.quotations || [];
        // Transform API data to match our interface
        const transformedQuotations = quotations.map((q: any) => ({
          id: q.quotation_id?.toString() || q.id?.toString() || '',
          quotation_id: q.quotation_id,
          vqNumber: q.vq_number || `VQ-${q.quotation_id}`,
          vq_number: q.vq_number,
          vendor: q.vendor_name || 'Unknown Vendor',
          vendor_name: q.vendor_name,
          vendor_id: q.vendor_id,
          project: q.project_name || q.project_id || 'Unknown Project',
          project_id: q.project_id,
          project_name: q.project_name,
          amount: q.total_amount || 0,
          total_amount: q.total_amount || 0,
          status: q.status || 'draft',
          validUntil: q.valid_until ? new Date(q.valid_until).toLocaleDateString() : 'Not Set',
          valid_until: q.valid_until,
          items: q.items_count || 0,
          items_count: q.items_count || 0,
          submittedBy: q.submitted_by || q.created_by || 'Unknown',
          submitted_by: q.submitted_by || q.created_by,
          submittedDate: q.submitted_date ? new Date(q.submitted_date).toLocaleDateString() : new Date(q.created_at || Date.now()).toLocaleDateString(),
          submitted_date: q.submitted_date || q.created_at,
          description: q.description,
          terms_conditions: q.terms_conditions,
          payment_terms: q.payment_terms,
          delivery_date: q.delivery_date,
          contact_person: q.contact_person,
          phone: q.phone,
          email: q.email,
          quotation_items: q.quotation_items || [],
          created_at: q.created_at,
          created_by: q.created_by,
          last_modified_at: q.last_modified_at,
          last_modified_by: q.last_modified_by
        }));
        setVendorQuotations(transformedQuotations);
      } else {
        setVendorQuotations([]);
      }
    } catch (err: any) {
      console.error('Error fetching vendor quotations:', err);
      setError(err.message || err.response?.data?.error || 'Failed to fetch vendor quotations');
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
    return quotation.submittedBy === user?.id && quotation.status !== 'approved';
  };

  const canDeleteQuotation = (quotation: VendorQuotation) => {
    // Only creator can delete, and only if not approved
    return quotation.submittedBy === user?.id && quotation.status !== 'approved';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-300';
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
    const vendors = [...new Set(vendorQuotations.map(q => q.vendor_name || q.vendor))];
    return vendors.filter(v => v).sort();
  }, [vendorQuotations]);

  // Get unique projects for filter dropdown
  const uniqueProjects = useMemo(() => {
    const projects = [...new Set(vendorQuotations.map(q => q.project_id || q.project))];
    return projects.filter(p => p).sort();
  }, [vendorQuotations]);

  // Filter and sort quotations
  const filteredQuotations = useMemo(() => {
    let filtered = vendorQuotations;

    // Filter by project
    if (filterProject !== 'all') {
      filtered = filtered.filter(quotation => (quotation.project_id || quotation.project) === filterProject);
    }

    // Filter by validity range
    if (filterValidityRange !== 'all') {
      const today = new Date();
      filtered = filtered.filter(quotation => {
        if (!quotation.valid_until && !quotation.validUntil) {
          return filterValidityRange === 'not_set';
        }

        const validUntil = new Date(quotation.valid_until || quotation.validUntil || '');
        if (isNaN(validUntil.getTime())) {
          return filterValidityRange === 'not_set';
        }

        const daysDiff = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 3600 * 24));

        switch (filterValidityRange) {
          case 'expired':
            return daysDiff < 0;
          case 'expiring_soon':
            return daysDiff >= 0 && daysDiff <= 7;
          case 'valid':
            return daysDiff > 7;
          case 'not_set':
            return !quotation.valid_until && !quotation.validUntil;
          default:
            return true;
        }
      });
    }

    // Filter by amount range
    if (filterAmountRange.min || filterAmountRange.max) {
      filtered = filtered.filter(quotation => {
        const amount = quotation.total_amount || quotation.amount || 0;
        const min = filterAmountRange.min ? parseFloat(filterAmountRange.min) : 0;
        const max = filterAmountRange.max ? parseFloat(filterAmountRange.max) : Infinity;
        return amount >= min && amount <= max;
      });
    }

    // Filter by items range
    if (filterItemsRange.min || filterItemsRange.max) {
      filtered = filtered.filter(quotation => {
        const items = quotation.items_count || quotation.items || 0;
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
      filtered = filtered.filter(quotation => (quotation.vendor_name || quotation.vendor) === filterVendor);
    }

    // Sort results
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'submittedDate':
          aValue = new Date(a.submitted_date || a.submittedDate || a.created_at || 0).getTime();
          bValue = new Date(b.submitted_date || b.submittedDate || b.created_at || 0).getTime();
          break;
        case 'amount':
          aValue = a.total_amount || a.amount || 0;
          bValue = b.total_amount || b.amount || 0;
          break;
        case 'validUntil':
          aValue = new Date(a.valid_until || a.validUntil || 0).getTime();
          bValue = new Date(b.valid_until || b.validUntil || 0).getTime();
          break;
        case 'vendor':
          aValue = (a.vendor_name || a.vendor || '').toLowerCase();
          bValue = (b.vendor_name || b.vendor || '').toLowerCase();
          break;
        case 'project':
          aValue = (a.project_id || a.project || '').toLowerCase();
          bValue = (b.project_id || b.project || '').toLowerCase();
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'items':
          aValue = a.items_count || a.items || 0;
          bValue = b.items_count || b.items || 0;
          break;
        default:
          aValue = a.vqNumber || a.vq_number || '';
          bValue = b.vqNumber || b.vq_number || '';
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        const numA = typeof aValue === 'number' ? aValue : 0;
        const numB = typeof bValue === 'number' ? bValue : 0;
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }
    });

    return filtered;
  }, [vendorQuotations, filterStatus, filterVendor, filterProject, filterValidityRange, filterAmountRange, filterItemsRange, sortBy, sortOrder]);

  const handleEdit = (quotation: VendorQuotation) => {
    setSelectedQuotation(quotation);
    setIsFormOpen(true);
  };

  const handleView = async (quotation: VendorQuotation) => {
    try {
      // Fetch detailed quotation data
      const response = await apiClient.get(`/vendor_quotation/${quotation.quotation_id || quotation.id}`);
      if (response.data.success) {
        setSelectedQuotation(response.data.quotation);
        // TODO: Open view-only modal or navigate to detail page
        toast.success('Quotation loaded successfully');
      }
    } catch (error: any) {
      console.error('Error fetching quotation details:', error);
      toast.error(error.message || 'Failed to load quotation details');
    }
  };

  const handleDelete = async (quotationId: string) => {
    if (!confirm('Are you sure you want to delete this vendor quotation? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await apiClient.delete(`/vendor_quotation/${quotationId}`);
      if (response.data.success) {
        toast.success('Vendor quotation deleted successfully');
        // Refresh the list
        await fetchVendorQuotations();
      } else {
        throw new Error(response.data.message || 'Failed to delete vendor quotation');
      }
    } catch (error: any) {
      console.error('Error deleting vendor quotation:', error);
      toast.error(error.message || 'Failed to delete vendor quotation');
    }
  };

  const handleSend = async (quotationId: string) => {
    try {
      const response = await apiClient.post(`/vendor_quotation/${quotationId}/send`);
      if (response.data.success) {
        toast.success('Vendor quotation sent successfully');
        // Refresh the list to update status
        await fetchVendorQuotations();
      } else {
        throw new Error(response.data.message || 'Failed to send vendor quotation');
      }
    } catch (error: any) {
      console.error('Error sending vendor quotation:', error);
      toast.error(error.message || 'Failed to send vendor quotation');
    }
  };

  const handleCreateQuotation = async (quotationData: any) => {
    try {
      const response = await apiClient.post('/vendor_quotation', quotationData);
      if (response.data.success) {
        toast.success('Vendor quotation created successfully');
        setIsFormOpen(false);
        setSelectedQuotation(null);
        // Refresh the list
        await fetchVendorQuotations();
      } else {
        throw new Error(response.data.message || 'Failed to create vendor quotation');
      }
    } catch (error: any) {
      console.error('Error creating vendor quotation:', error);
      toast.error(error.message || 'Failed to create vendor quotation');
    }
  };

  const handleUpdateQuotation = async (quotationId: string, quotationData: any) => {
    try {
      const response = await apiClient.put(`/vendor_quotation/${quotationId}`, quotationData);
      if (response.data.success) {
        toast.success('Vendor quotation updated successfully');
        setIsFormOpen(false);
        setSelectedQuotation(null);
        // Refresh the list
        await fetchVendorQuotations();
      } else {
        throw new Error(response.data.message || 'Failed to update vendor quotation');
      }
    } catch (error: any) {
      console.error('Error updating vendor quotation:', error);
      toast.error(error.message || 'Failed to update vendor quotation');
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl shadow-xl p-6 text-gray-800 border border-red-200"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur">
              <Building2 className="w-6 sm:w-8 h-6 sm:h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Vendor Quotations</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
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
              className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="sm:inline">New Quotation</span>
            </Button>
          )}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600">Total Quotations</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {vendorQuotations.length}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600">Under Review</p>
                <p className="text-lg sm:text-2xl font-bold text-yellow-600">
                  {vendorQuotations.filter(q => q.status === 'under_review').length}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600">Approved</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600">
                  {vendorQuotations.filter(q => q.status === 'approved').length}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600">Total Value</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  AED {vendorQuotations.reduce((sum, q) => sum + (q.total_amount || q.amount || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex gap-2 flex-wrap flex-1 min-w-0">
                <select
                  className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white flex-1 min-w-[120px] text-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="Filter by status"
                  title="Filter by status"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="negotiation">Negotiation</option>
                </select>

                <select
                  className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white flex-1 min-w-[120px] text-sm"
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
                  className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white flex-1 min-w-[120px] text-sm"
                  value={filterValidityRange}
                  onChange={(e) => setFilterValidityRange(e.target.value)}
                  aria-label="Filter by validity"
                  title="Filter by validity"
                >
                  <option value="all">All Validity</option>
                  <option value="expired">Expired</option>
                  <option value="expiring_soon">Expiring Soon (7 days)</option>
                  <option value="valid">Valid ({'>'}7 days)</option>
                  <option value="not_set">Not Set</option>
                </select>
              </div>
              <div className="flex gap-2 flex-wrap lg:flex-nowrap">
                <select
                  className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white flex-1 min-w-[120px] text-sm"
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
                  className="px-2 sm:px-3 text-sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>

                <Button
                  variant="outline"
                  className="px-2 sm:px-4 text-sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <SlidersHorizontal className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{showAdvancedFilters ? 'Hide' : 'More'} Filters</span>
                </Button>

                <Button variant="outline" className="px-2 sm:px-4 text-sm">
                  <Download className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export</span>
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
                    aria-label="Filter by project"
                    title="Filter by project"
                  >
                    <option value="all">All Projects</option>
                  {uniqueProjects.map(project => (
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
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
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
                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
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
                        className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
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
                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
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
                        className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
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
                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
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
                        className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
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
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredQuotations.map((quotation) => (
                    <tr key={quotation.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                        <div className="sm:hidden text-xs text-gray-500 mb-1">VQ Number</div>
                        {quotation.vqNumber || quotation.vq_number || `VQ-${quotation.id}`}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="sm:hidden text-xs text-gray-500 mb-1">Vendor</div>
                        <div className="font-medium">{quotation.vendor_name || quotation.vendor}</div>
                        <div className="sm:hidden text-xs text-gray-500 mt-1">
                          Project: {quotation.project_id || quotation.project}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {quotation.project_id || quotation.project}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="sm:hidden text-xs text-gray-500 mb-1">Amount</div>
                        AED {(quotation.total_amount || quotation.amount || 0).toLocaleString()}
                        <div className="md:hidden text-xs text-gray-500 mt-1">
                          {quotation.items_count || quotation.items || 0} items
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {quotation.items_count || quotation.items || 0}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="sm:hidden text-xs text-gray-500 mb-1">Status</div>
                        <Badge className={`${getStatusColor(quotation.status)} border text-xs`}>
                          {(quotation.status || 'draft').replace('_', ' ').toUpperCase()}
                        </Badge>
                        <div className="lg:hidden text-xs text-gray-500 mt-1">
                          Valid: {quotation.validUntil || (quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString() : 'Not Set')}
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {quotation.validUntil || (quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString() : 'Not Set')}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex gap-1 sm:gap-2 flex-wrap justify-end sm:justify-start">
                          <button
                            onClick={() => handleView(quotation)}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canEditQuotation(quotation) && (
                            <button
                              onClick={() => handleEdit(quotation)}
                              className="text-yellow-600 hover:text-yellow-800 p-1 rounded hover:bg-yellow-50 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {(quotation.status === 'draft' || quotation.status === 'rejected') && (
                            <button
                              onClick={() => handleSend(quotation.id)}
                              className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50 transition-colors"
                              title="Send for Approval"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                            </button>
                          )}

                          {canDeleteQuotation(quotation) && (
                            <button
                              onClick={() => handleDelete(quotation.quotation_id?.toString() || quotation.id)}
                              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
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