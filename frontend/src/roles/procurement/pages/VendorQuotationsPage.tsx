import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Eye, Edit2, Trash2, Building2 } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
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

  // Filter quotations based on search and status
  const getFilteredQuotations = () => {
    let filtered = vendorQuotations;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(quotation => 
        quotation.vqNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quotation.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quotation.project.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(quotation => quotation.status === filterStatus);
    }

    return filtered;
  };

  const filteredQuotations = getFilteredQuotations();

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Quotations</h1>
          <p className="text-gray-600 mt-1">
            Manage vendor quotations and compare proposals
          </p>
        </div>
        {canCreateQuotation() && (
          <Button 
            onClick={() => {
              setSelectedQuotation(null);
              setIsFormOpen(true);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Quotation
          </Button>
        )}
      </div>

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

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by VQ number, vendor, or project..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              <Button variant="outline" className="px-4">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
              <Button variant="outline" className="px-4">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
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
                      Items
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