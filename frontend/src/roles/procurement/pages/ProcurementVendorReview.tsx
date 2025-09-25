import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { countries, findCountryByName, findCountryByPhoneCode, getDefaultCountry } from '@/data/countries';
import {
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  DollarSign,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Send,
  Package,
  ClipboardCheck,
  Grid3X3,
  List,
  Plus,
  Mail,
  Phone,
  MapPin,
  Globe,
  CheckSquare,
  Square,
  Edit2,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { apiClient } from '@/api/config';
import { procurementService } from '../services/procurementService';

interface VendorSOWReview {
  id: string;
  sowNumber: string;
  projectName: string;
  projectManager: string;
  vendorName?: string;
  vendorId?: string;
  category: string;
  boqReference: string;
  boqItems: any[];
  totalAmount: number;
  status: 'pending_vendor_selection' | 'quotation_requested' | 'quotation_received' | 'qty_scope_review';
  submittedDate: string;
  scopeDescription: string;
  deliverables: string[];
  availableVendors?: { id: string; name: string; rating: number; previousOrders: number }[];
  selectedVendors?: string[];
  quotations?: { vendorId: string; vendorName: string; amount: number; leadTime: string; submitted: boolean }[];
}

const ProcurementVendorReview: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('vendors');
  const [selectedSOW, setSelectedSOW] = useState<VendorSOWReview | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isVendorSelectionOpen, setIsVendorSelectionOpen] = useState(false);
  const [isCreateVendorOpen, setIsCreateVendorOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [vendors, setVendors] = useState<any[]>([]);
  const [sowRequests, setSowRequests] = useState<VendorSOWReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [vendorCategories] = useState(procurementService.getVendorCategories());
  const [selectedVendorsForApproval, setSelectedVendorsForApproval] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [isEditVendorOpen, setIsEditVendorOpen] = useState(false);

  // Vendor form state
  const defaultCountry = getDefaultCountry();
  const [vendorForm, setVendorForm] = useState({
    vendor_name: '',
    category: '',
    contact_person_name: '',
    email: '',
    phone_code: defaultCountry.phoneCode,
    phone: '',
    street_address: '',
    state: '',
    city: '',
    country: defaultCountry.name,
    pin_code: '',
    gst_number: ''
  });
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  // Fetch vendors and SOW requests on component mount
  useEffect(() => {
    fetchVendors();
    fetchSOWRequests();
  }, []);

  const fetchVendors = async () => {
    try {
      setIsLoading(true);
      const response = await procurementService.getAllVendors();
      setVendors(response.data || []);
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle country selection change
  const handleCountryChange = (countryName: string) => {
    const country = findCountryByName(countryName);
    if (country) {
      setSelectedCountry(country);
      setVendorForm({
        ...vendorForm,
        country: country.name,
        phone_code: country.phoneCode
      });
    }
  };

  // Handle phone code selection change
  const handlePhoneCodeChange = (phoneCode: string) => {
    const country = findCountryByPhoneCode(phoneCode);
    if (country) {
      setSelectedCountry(country);
      setVendorForm({
        ...vendorForm,
        country: country.name,
        phone_code: country.phoneCode
      });
    }
  };

  const handleCreateVendor = async () => {
    try {
      setFormErrors([]);

      // Validate required fields
      const errors: string[] = [];
      if (!vendorForm.vendor_name.trim()) {
        errors.push('Vendor name is required');
      }
      if (!vendorForm.email.trim()) {
        errors.push('Email is required');
      }

      if (errors.length > 0) {
        setFormErrors(errors);
        return;
      }

      setIsLoading(true);

      // Use custom category if "Other" was selected
      const vendorData = {
        ...vendorForm,
        category: showCustomCategory ? customCategory : vendorForm.category
      };

      const newVendor = await procurementService.createVendor(vendorData);
      toast.success('Vendor created successfully');
      setIsCreateVendorOpen(false);

      // Reset form with default country
      const defaultCountry = getDefaultCountry();
      setVendorForm({
        vendor_name: '',
        category: '',
        contact_person_name: '',
        email: '',
        phone_code: defaultCountry.phoneCode,
        phone: '',
        street_address: '',
        state: '',
        city: '',
        country: defaultCountry.name,
        pin_code: '',
        gst_number: ''
      });
      setSelectedCountry(defaultCountry);
      setShowCustomCategory(false);
      setCustomCategory('');

      // Refresh vendor list
      await fetchVendors();
    } catch (error: any) {
      console.error('Error creating vendor:', error);
      toast.error(error.message || 'Failed to create vendor');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch SOW requests from API
  const fetchSOWRequests = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual SOW API endpoint when available
      // const response = await procurementService.getSOWRequests();
      // setSowRequests(response.data || []);

      // For now, set empty array until API is ready
      setSowRequests([]);
    } catch (error: any) {
      console.error('Error fetching SOW requests:', error);
      toast.error('Failed to load SOW requests');
      setSowRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    newRequests: sowRequests.filter(s => s.status === 'pending_vendor_selection').length,
    awaitingQuotations: sowRequests.filter(s => s.status === 'quotation_requested').length,
    quotationsReceived: sowRequests.filter(s => s.status === 'quotation_received').length,
    underReview: sowRequests.filter(s => s.status === 'qty_scope_review').length
  };

  const handleVendorSelection = (sow: VendorSOWReview) => {
    setSelectedSOW(sow);
    setSelectedVendorIds([]);
    setIsVendorSelectionOpen(true);
  };

  const submitVendorSelection = () => {
    if (selectedVendorIds.length < 3) {
      toast.error('Please select at least 3 vendors for quotation');
      return;
    }
    toast.success(`Quotation request sent to ${selectedVendorIds.length} vendors`);
    setIsVendorSelectionOpen(false);
  };

  const handleQtyScopeReview = (sow: VendorSOWReview) => {
    setSelectedSOW(sow);
    setIsReviewDialogOpen(true);
  };

  const submitQtyScopeFlag = (approved: boolean) => {
    if (!approved && !reviewNotes) {
      toast.error('Please provide rejection notes');
      return;
    }

    const message = approved
      ? 'QTY/SCOPE FLAG approved - Sent to Project Manager'
      : 'QTY/SCOPE FLAG rejected - Sent back for revision';

    toast.success(message);
    setIsReviewDialogOpen(false);
    setReviewNotes('');
  };

  // Handle sending selected vendors for approval
  const handleSendVendorsForApproval = async () => {
    try {
      setIsLoading(true);

      // Get selected vendor details
      const selectedVendorDetails = vendors.filter(v =>
        selectedVendorsForApproval.includes(v.vendor_id.toString())
      );

      // TODO: Implement actual API call when backend endpoint is available
      // const response = await procurementService.sendVendorsForApproval({
      //   vendor_ids: selectedVendorsForApproval,
      //   requested_by: user?.id,
      //   request_date: new Date().toISOString()
      // });

      // For now, just show success message
      toast.success(`Successfully sent ${selectedVendorsForApproval.length} vendor(s) for approval`);

      // Reset selection
      setIsSelectMode(false);
      setSelectedVendorsForApproval([]);

      // Refresh vendor list
      await fetchVendors();
    } catch (error: any) {
      console.error('Error sending vendors for approval:', error);
      toast.error(error.message || 'Failed to send vendors for approval');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit vendor
  const handleEditVendor = async (vendor: any) => {
    try {
      // Fetch the latest vendor data
      const vendorData = await procurementService.getVendorById(vendor.vendor_id);
      setEditingVendor(vendorData);

      // Populate form with existing data
      const country = findCountryByName(vendorData.country) || getDefaultCountry();
      setSelectedCountry(country);
      setVendorForm({
        vendor_name: vendorData.vendor_name || '',
        category: vendorData.category || '',
        contact_person_name: vendorData.contact_person_name || '',
        email: vendorData.email || '',
        phone_code: vendorData.phone_code || country.phoneCode,
        phone: vendorData.phone || '',
        street_address: vendorData.street_address || '',
        state: vendorData.state || '',
        city: vendorData.city || '',
        country: vendorData.country || country.name,
        pin_code: vendorData.pin_code || '',
        gst_number: vendorData.gst_number || ''
      });

      setIsEditVendorOpen(true);
    } catch (error: any) {
      console.error('Error fetching vendor details:', error);
      toast.error(error.message || 'Failed to load vendor details');
    }
  };

  // Handle delete vendor
  const handleDeleteVendor = async (vendorId: number, vendorName: string) => {
    if (!confirm(`Are you sure you want to delete "${vendorName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsLoading(true);
      await procurementService.deleteVendor(vendorId);
      toast.success('Vendor deleted successfully');

      // Refresh vendor list
      await fetchVendors();
    } catch (error: any) {
      console.error('Error deleting vendor:', error);
      toast.error(error.message || 'Failed to delete vendor');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle update vendor
  const handleUpdateVendor = async () => {
    try {
      setFormErrors([]);

      // Validate required fields
      const errors: string[] = [];
      if (!vendorForm.vendor_name.trim()) {
        errors.push('Vendor name is required');
      }
      if (!vendorForm.email.trim()) {
        errors.push('Email is required');
      }

      if (errors.length > 0) {
        setFormErrors(errors);
        return;
      }

      setIsLoading(true);

      // Use custom category if "Other" was selected
      const vendorData = {
        ...vendorForm,
        category: showCustomCategory ? customCategory : vendorForm.category
      };

      await procurementService.updateVendor(editingVendor.vendor_id, vendorData);
      toast.success('Vendor updated successfully');
      setIsEditVendorOpen(false);
      setEditingVendor(null);

      // Reset form with default country
      const defaultCountry = getDefaultCountry();
      setVendorForm({
        vendor_name: '',
        category: '',
        contact_person_name: '',
        email: '',
        phone_code: defaultCountry.phoneCode,
        phone: '',
        street_address: '',
        state: '',
        city: '',
        country: defaultCountry.name,
        pin_code: '',
        gst_number: ''
      });
      setSelectedCountry(defaultCountry);
      setShowCustomCategory(false);
      setCustomCategory('');

      // Refresh vendor list
      await fetchVendors();
    } catch (error: any) {
      console.error('Error updating vendor:', error);
      toast.error(error.message || 'Failed to update vendor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header - PROCUREMENT View */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm p-6 border"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-7 h-7 text-red-600" />
              Vendor Management - Procurement
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Review SOWs, select vendors, and manage quotations
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-none border-0"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none border-0"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Workflow Alert */}
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertTitle>Your Role in Vendor Workflow</AlertTitle>
        <AlertDescription>
          You receive SOWs from Project Manager. Your responsibilities:
          <strong> Select Vendors → Request Quotations → Review with PM for QTY/SCOPE FLAG approval</strong>
        </AlertDescription>
      </Alert>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New Requests</p>
                <p className="text-2xl font-bold text-blue-600">{stats.newRequests}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Awaiting Quotes</p>
                <p className="text-2xl font-bold text-amber-600">{stats.awaitingQuotations}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Quotes Received</p>
                <p className="text-2xl font-bold text-green-600">{stats.quotationsReceived}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Under Review</p>
                <p className="text-2xl font-bold text-red-600">{stats.underReview}</p>
              </div>
              <Eye className="w-8 h-8 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-1">
              <TabsTrigger value="vendors" className="flex items-center gap-1 text-xs md:text-sm">
                <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Vendors</span>
                <span className="inline sm:hidden">V</span>
                ({vendors.length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-1 text-xs md:text-sm">
                <Clock className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Pending</span>
                <span className="inline sm:hidden">P</span>
                ({sowRequests.filter(s => s.status === 'pending_vendor_selection').length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-1 text-xs md:text-sm">
                <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Approved</span>
                <span className="inline sm:hidden">A</span>
                ({sowRequests.filter(s => s.status === 'quotation_received').length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-1 text-xs md:text-sm">
                <XCircle className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Rejected</span>
                <span className="inline sm:hidden">R</span>
                (0)
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-1 text-xs md:text-sm">
                <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Completed</span>
                <span className="inline sm:hidden">C</span>
                ({sowRequests.filter(s => s.status === 'qty_scope_review').length})
              </TabsTrigger>
            </TabsList>

            {/* Vendors Tab */}
            <TabsContent value="vendors" className="space-y-4 mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Input
                    placeholder="Search vendors..."
                    className="w-full sm:max-w-xs"
                  />
                  <Select>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {vendorCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {/* View Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-200'}`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-200'}`}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                  {!isSelectMode ? (
                    <Button
                      onClick={() => {
                        setIsSelectMode(true);
                        setSelectedVendorsForApproval([]);
                      }}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Select Vendors
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => {
                          setIsSelectMode(false);
                          setSelectedVendorsForApproval([]);
                        }}
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                      {selectedVendorsForApproval.length > 0 && (
                        <Button
                          onClick={handleSendVendorsForApproval}
                          disabled={isLoading}
                          className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send for Approval ({selectedVendorsForApproval.length})
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    onClick={() => setIsCreateVendorOpen(true)}
                    className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Vendor
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-8">Loading vendors...</div>
              ) : vendors.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No vendors found</p>
                  <Button onClick={() => setIsCreateVendorOpen(true)} className="bg-red-600 hover:bg-red-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Vendor
                  </Button>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                  {vendors.map((vendor) => {
                    const isSelected = selectedVendorsForApproval.includes(vendor.vendor_id.toString());
                    return (
                      <Card
                        key={vendor.vendor_id}
                        className={`${isSelectMode ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-red-500' : ''}`}
                        onClick={() => {
                          if (isSelectMode) {
                            if (isSelected) {
                              setSelectedVendorsForApproval(prev =>
                                prev.filter(id => id !== vendor.vendor_id.toString())
                              );
                            } else {
                              setSelectedVendorsForApproval(prev =>
                                [...prev, vendor.vendor_id.toString()]
                              );
                            }
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-start gap-2">
                              {isSelectMode && (
                                <div className="mt-1">
                                  {isSelected ? (
                                    <CheckSquare className="w-5 h-5 text-red-600" />
                                  ) : (
                                    <Square className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>
                              )}
                              <h3 className="font-semibold">{vendor.vendor_name}</h3>
                            </div>
                            <Badge variant={vendor.is_deleted ? 'destructive' : 'default'}>
                              {vendor.is_deleted ? 'Inactive' : 'Active'}
                            </Badge>
                          </div>
                        {vendor.category && (
                          <Badge variant="outline" className="mb-2">
                            {vendor.category}
                          </Badge>
                        )}
                        <div className="space-y-1 text-sm text-gray-600">
                          {vendor.contact_person_name && (
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {vendor.contact_person_name}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {vendor.email}
                          </div>
                          {vendor.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {vendor.phone_code} {vendor.phone}
                            </div>
                          )}
                          {vendor.city && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {vendor.city}, {vendor.country || 'UAE'}
                            </div>
                          )}
                        </div>
                        {!isSelectMode && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                // View vendor details
                                toast.info('Vendor details view coming soon');
                              }}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            {!vendor.is_deleted && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditVendor(vendor);
                                  }}
                                  disabled={isLoading}
                                >
                                  <Edit2 className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteVendor(vendor.vendor_id, vendor.vendor_name);
                                  }}
                                  disabled={isLoading}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Pending SOW Requests */}
            <TabsContent value="pending" className="space-y-4 mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Input
                    placeholder="Search pending requests..."
                    className="w-full sm:max-w-xs"
                  />
                  <Select>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {vendorCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {/* View Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-200'}`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-200'}`}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {sowRequests.filter(s => s.status === 'pending_vendor_selection').length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No pending requests found</p>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                  {sowRequests.filter(s => s.status === 'pending_vendor_selection').map((sow) => (
                <Card key={sow.id} className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{sow.sowNumber}</h3>
                          <Badge variant="secondary">{sow.category}</Badge>
                          <Badge className="bg-blue-100 text-blue-800">New</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <strong>Project:</strong> {sow.projectName}
                          </div>
                          <div>
                            <strong>PM:</strong> {sow.projectManager}
                          </div>
                          <div>
                            <strong>BOQ Ref:</strong> {sow.boqReference}
                          </div>
                          <div>
                            <strong>Est. Value:</strong> AED {sow.totalAmount.toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg mb-3">
                          <p className="text-sm font-medium mb-1">Scope Description:</p>
                          <p className="text-sm text-gray-600">{sow.scopeDescription}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Available Vendors ({sow.availableVendors?.length}):</p>
                          <div className="flex flex-wrap gap-2">
                            {sow.availableVendors?.map(vendor => (
                              <Badge key={vendor.id} variant="outline">
                                {vendor.name} • ⭐ {vendor.rating}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <Button
                          onClick={() => handleVendorSelection(sow)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Select Vendors
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Approved Tab */}
            <TabsContent value="approved" className="space-y-4 mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Input
                    placeholder="Search approved requests..."
                    className="w-full sm:max-w-xs"
                  />
                  <Select>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {vendorCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {/* View Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-200'}`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-200'}`}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {sowRequests.filter(s => s.status === 'quotation_received').length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No approved requests found</p>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                  {sowRequests.filter(s => s.status === 'quotation_received').map((sow) => (
                <Card key={sow.id}>
                  <CardContent className="p-4">
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{sow.sowNumber}</h3>
                        <Badge className="bg-green-100 text-green-800">Quotations Received</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{sow.projectName} • {sow.category}</p>
                    </div>

                    <div className="space-y-3">
                      <p className="font-medium text-sm">Vendor Quotations:</p>
                      {sow.quotations?.map((quote) => (
                        <div key={quote.vendorId} className={`p-3 rounded-lg border ${quote.submitted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{quote.vendorName}</p>
                              {quote.submitted ? (
                                <div className="text-sm text-gray-600 mt-1">
                                  <span className="font-medium">Amount:</span> AED {quote.amount.toLocaleString()} •
                                  <span className="font-medium ml-2">Lead Time:</span> {quote.leadTime}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 mt-1">Awaiting response...</p>
                              )}
                            </div>
                            {quote.submitted && (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={() => handleQtyScopeReview(sow)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <ClipboardCheck className="w-4 h-4 mr-2" />
                        Submit for QTY/SCOPE Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Rejected Tab */}
            <TabsContent value="rejected" className="space-y-4 mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Input
                    placeholder="Search rejected requests..."
                    className="w-full sm:max-w-xs"
                  />
                  <Select>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {vendorCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {/* View Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-200'}`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-200'}`}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-center py-12">
                <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No rejected vendor requests found</p>
              </div>
            </TabsContent>

            {/* Completed Tab */}
            <TabsContent value="completed" className="space-y-4 mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Input
                    placeholder="Search completed requests..."
                    className="w-full sm:max-w-xs"
                  />
                  <Select>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {vendorCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {/* View Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-200'}`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-200'}`}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription>
                  Items in this tab require joint review with Project Manager for QTY/SCOPE FLAG approval
                </AlertDescription>
              </Alert>

              {sowRequests.filter(s => s.status === 'qty_scope_review').length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No completed requests found</p>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                  {sowRequests.filter(s => s.status === 'qty_scope_review').map((sow) => (
                    <Card key={sow.id} className="border-amber-200">
                      <CardContent className="p-4">
                        <Badge className="bg-amber-100 text-amber-800 mb-3">Pending QTY/SCOPE Review</Badge>
                        <p className="font-medium">{sow.sowNumber} - {sow.projectName}</p>
                        <Button
                          size="sm"
                          className="mt-3 bg-amber-600 hover:bg-amber-700"
                          onClick={() => handleQtyScopeReview(sow)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Review
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Vendor Selection Dialog */}
      <Dialog open={isVendorSelectionOpen} onOpenChange={setIsVendorSelectionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Vendors for Quotation</DialogTitle>
            <DialogDescription>
              Choose at least 3 vendors to request quotations for {selectedSOW?.sowNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {selectedSOW?.availableVendors?.map(vendor => (
              <div key={vendor.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  id={vendor.id}
                  checked={selectedVendorIds.includes(vendor.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedVendorIds([...selectedVendorIds, vendor.id]);
                    } else {
                      setSelectedVendorIds(selectedVendorIds.filter(id => id !== vendor.id));
                    }
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor={vendor.id} className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">{vendor.name}</p>
                    <p className="text-sm text-gray-600">
                      Rating: ⭐ {vendor.rating} • Previous Orders: {vendor.previousOrders}
                    </p>
                  </div>
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVendorSelectionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitVendorSelection} className="bg-red-600 hover:bg-red-700">
              Send Quotation Request ({selectedVendorIds.length} vendors)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QTY/SCOPE Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QTY/SCOPE FLAG Review</DialogTitle>
            <DialogDescription>
              Review quantities and scope with Project Manager
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="notes">Review Notes</Label>
              <Textarea
                id="notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter review notes or rejection reason"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => submitQtyScopeFlag(false)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => submitQtyScopeFlag(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve QTY/SCOPE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Vendor Dialog */}
      <Dialog open={isCreateVendorOpen} onOpenChange={setIsCreateVendorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Vendor</DialogTitle>
            <DialogDescription>
              Add a new vendor to the system for quotations and procurement
            </DialogDescription>
          </DialogHeader>

          {formErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Validation Errors</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {formErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor_name">
                  Vendor Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="vendor_name"
                  value={vendorForm.vendor_name}
                  onChange={(e) => setVendorForm({ ...vendorForm, vendor_name: e.target.value })}
                  placeholder="Enter vendor name"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                {!showCustomCategory ? (
                  <Select
                    value={vendorForm.category}
                    onValueChange={(value) => {
                      if (value === 'Other') {
                        setShowCustomCategory(true);
                        setVendorForm({ ...vendorForm, category: value });
                      } else {
                        setVendorForm({ ...vendorForm, category: value });
                      }
                    }}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendorCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id="custom_category"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Enter custom category"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCustomCategory(false);
                        setCustomCategory('');
                        setVendorForm({ ...vendorForm, category: '' });
                      }}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_person_name">Contact Person</Label>
                <Input
                  id="contact_person_name"
                  value={vendorForm.contact_person_name}
                  onChange={(e) => setVendorForm({ ...vendorForm, contact_person_name: e.target.value })}
                  placeholder="Contact person name"
                />
              </div>
              <div>
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={vendorForm.email}
                  onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                  placeholder="vendor@example.com"
                />
              </div>
            </div>

            {/* Phone Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone_code">Phone Code</Label>
                <Select
                  value={selectedCountry.phoneCode}
                  onValueChange={handlePhoneCodeChange}
                >
                  <SelectTrigger id="phone_code">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {countries.map(country => (
                      <SelectItem
                        key={country.code}
                        value={country.phoneCode}
                      >
                        <span className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{country.phoneCode} ({country.name})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={vendorForm.phone}
                  onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                  placeholder="50 123 4567"
                />
              </div>
            </div>

            {/* Address Information */}
            <div>
              <Label htmlFor="street_address">Street Address</Label>
              <Input
                id="street_address"
                value={vendorForm.street_address}
                onChange={(e) => setVendorForm({ ...vendorForm, street_address: e.target.value })}
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={vendorForm.city}
                  onChange={(e) => setVendorForm({ ...vendorForm, city: e.target.value })}
                  placeholder="Dubai"
                />
              </div>
              <div>
                <Label htmlFor="state">State/Emirate</Label>
                <Input
                  id="state"
                  value={vendorForm.state}
                  onChange={(e) => setVendorForm({ ...vendorForm, state: e.target.value })}
                  placeholder="Dubai"
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Select
                  value={selectedCountry.name}
                  onValueChange={handleCountryChange}
                >
                  <SelectTrigger id="country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {countries.map(country => (
                      <SelectItem
                        key={country.code}
                        value={country.name}
                      >
                        <span className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{country.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pin_code">PIN/Postal Code</Label>
                <Input
                  id="pin_code"
                  value={vendorForm.pin_code}
                  onChange={(e) => setVendorForm({ ...vendorForm, pin_code: e.target.value })}
                  placeholder="12345"
                />
              </div>
              <div>
                <Label htmlFor="gst_number">GST/Tax Number</Label>
                <Input
                  id="gst_number"
                  value={vendorForm.gst_number}
                  onChange={(e) => setVendorForm({ ...vendorForm, gst_number: e.target.value })}
                  placeholder="Tax registration number"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateVendorOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateVendor}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Vendor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog open={isEditVendorOpen} onOpenChange={setIsEditVendorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update vendor information and contact details
            </DialogDescription>
          </DialogHeader>

          {formErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Validation Errors</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {formErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_vendor_name">Vendor Name *</Label>
                <Input
                  id="edit_vendor_name"
                  value={vendorForm.vendor_name}
                  onChange={(e) => setVendorForm({ ...vendorForm, vendor_name: e.target.value })}
                  placeholder="Enter vendor name"
                />
              </div>
              <div>
                <Label htmlFor="edit_category">Category</Label>
                <Select
                  value={vendorForm.category}
                  onValueChange={(value) => {
                    if (value === 'other') {
                      setShowCustomCategory(true);
                      setVendorForm({ ...vendorForm, category: value });
                    } else {
                      setShowCustomCategory(false);
                      setVendorForm({ ...vendorForm, category: value });
                    }
                  }}
                >
                  <SelectTrigger id="edit_category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {vendorCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">Other (Specify)</SelectItem>
                  </SelectContent>
                </Select>
                {showCustomCategory && (
                  <Input
                    className="mt-2"
                    placeholder="Specify category"
                    value={customCategory}
                    onChange={(e) => {
                      setCustomCategory(e.target.value);
                      setVendorForm({ ...vendorForm, category: '' });
                    }}
                  />
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_contact_person_name">Contact Person</Label>
                <Input
                  id="edit_contact_person_name"
                  value={vendorForm.contact_person_name}
                  onChange={(e) => setVendorForm({ ...vendorForm, contact_person_name: e.target.value })}
                  placeholder="Contact person name"
                />
              </div>
              <div>
                <Label htmlFor="edit_email">Email Address *</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={vendorForm.email}
                  onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                  placeholder="vendor@example.com"
                />
              </div>
            </div>

            {/* Phone Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_phone_code">Phone Code</Label>
                <Select
                  value={selectedCountry.phoneCode}
                  onValueChange={handlePhoneCodeChange}
                >
                  <SelectTrigger id="edit_phone_code">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {countries.map(country => (
                      <SelectItem
                        key={country.code}
                        value={country.phoneCode}
                      >
                        <span className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{country.phoneCode} ({country.name})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_phone">Phone Number</Label>
                <Input
                  id="edit_phone"
                  value={vendorForm.phone}
                  onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                  placeholder="50 123 4567"
                />
              </div>
            </div>

            {/* Address Information */}
            <div>
              <Label htmlFor="edit_street_address">Street Address</Label>
              <Input
                id="edit_street_address"
                value={vendorForm.street_address}
                onChange={(e) => setVendorForm({ ...vendorForm, street_address: e.target.value })}
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit_city">City</Label>
                <Input
                  id="edit_city"
                  value={vendorForm.city}
                  onChange={(e) => setVendorForm({ ...vendorForm, city: e.target.value })}
                  placeholder="Dubai"
                />
              </div>
              <div>
                <Label htmlFor="edit_state">State/Emirate</Label>
                <Input
                  id="edit_state"
                  value={vendorForm.state}
                  onChange={(e) => setVendorForm({ ...vendorForm, state: e.target.value })}
                  placeholder="Dubai"
                />
              </div>
              <div>
                <Label htmlFor="edit_country">Country</Label>
                <Select
                  value={selectedCountry.name}
                  onValueChange={handleCountryChange}
                >
                  <SelectTrigger id="edit_country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {countries.map(country => (
                      <SelectItem
                        key={country.code}
                        value={country.name}
                      >
                        <span className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{country.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_pin_code">PIN/Postal Code</Label>
                <Input
                  id="edit_pin_code"
                  value={vendorForm.pin_code}
                  onChange={(e) => setVendorForm({ ...vendorForm, pin_code: e.target.value })}
                  placeholder="12345"
                />
              </div>
              <div>
                <Label htmlFor="edit_gst_number">GST/Tax Number</Label>
                <Input
                  id="edit_gst_number"
                  value={vendorForm.gst_number}
                  onChange={(e) => setVendorForm({ ...vendorForm, gst_number: e.target.value })}
                  placeholder="Tax registration number"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditVendorOpen(false);
              setEditingVendor(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateVendor}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Update Vendor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProcurementVendorReview;