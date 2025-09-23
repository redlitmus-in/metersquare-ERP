import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Eye,
  Award,
  AlertCircle,
  CheckCircle,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  TrendingDown,
  MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComboboxInput } from '@/components/ui/combobox-input';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/api/config';
import { toast } from 'sonner';

interface Vendor {
  id: string;
  name: string;
  category: string;
  email: string;
  phone: string;
  countryCode?: string;
  address: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
  registrationNumber?: string; // Made optional for backward compatibility
  taxId: string;
  status: 'active' | 'inactive' | 'blacklisted' | 'pending';
  rating: number;
  totalOrders: number;
  totalSpend: number;
  complianceScore: number;
  qualityScore: number;
  deliveryScore: number;
  lastOrderDate: string;
  createdAt: string;
  contactPerson: string;
  notes?: string;
}

const VendorListPage: React.FC = () => {
  const { user } = useAuthStore();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Check if user can manage vendors (only Procurement role)
  const userRole = (user as any)?.role?.toLowerCase() || '';
  const canManageVendors = userRole === 'procurement';
  const canEditVendors = userRole === 'procurement';

  // Form state for new/edit vendor
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    email: '',
    countryCode: '+971', // Default UAE code
    phone: '',
    street: '',
    city: '',
    state: '',
    country: 'UAE',
    pinCode: '',
    taxId: '',
    contactPerson: '',
    notes: ''
  });

  // Sample vendor data
  useEffect(() => {
    const sampleVendors: Vendor[] = [
      {
        id: '1',
        name: 'ABC Trading LLC',
        category: 'Electrical',
        email: 'contact@abctrading.ae',
        phone: '+971 4 123 4567',
        address: 'Dubai Industrial City, Dubai, UAE',
        registrationNumber: 'REG-2024-001',
        taxId: 'TRN100234567890003',
        status: 'active',
        rating: 4.5,
        totalOrders: 127,
        totalSpend: 2450000,
        complianceScore: 98,
        qualityScore: 95,
        deliveryScore: 92,
        lastOrderDate: '2024-03-15',
        createdAt: '2023-01-10',
        contactPerson: 'Mohammed Ali'
      },
      {
        id: '2',
        name: 'XYZ Contractors',
        category: 'Civil Works',
        email: 'info@xyzcontractors.ae',
        phone: '+971 2 555 8899',
        address: 'Mussafah, Abu Dhabi, UAE',
        registrationNumber: 'REG-2024-002',
        taxId: 'TRN100234567890004',
        status: 'active',
        rating: 4.8,
        totalOrders: 89,
        totalSpend: 3200000,
        complianceScore: 100,
        qualityScore: 97,
        deliveryScore: 95,
        lastOrderDate: '2024-03-18',
        createdAt: '2022-06-15',
        contactPerson: 'Sarah Johnson'
      },
      {
        id: '3',
        name: 'Global MEP Solutions',
        category: 'MEP Systems',
        email: 'sales@globalmep.ae',
        phone: '+971 3 777 2233',
        address: 'Sharjah Industrial Area, UAE',
        registrationNumber: 'REG-2024-003',
        taxId: 'TRN100234567890005',
        status: 'active',
        rating: 4.2,
        totalOrders: 76,
        totalSpend: 1850000,
        complianceScore: 95,
        qualityScore: 91,
        deliveryScore: 88,
        lastOrderDate: '2024-03-10',
        createdAt: '2023-03-20',
        contactPerson: 'Ahmed Hassan'
      },
      {
        id: '4',
        name: 'Prime Furniture Co.',
        category: 'Furniture',
        email: 'orders@primefurniture.ae',
        phone: '+971 4 888 3344',
        address: 'Al Quoz, Dubai, UAE',
        registrationNumber: 'REG-2024-004',
        taxId: 'TRN100234567890006',
        status: 'inactive',
        rating: 3.9,
        totalOrders: 45,
        totalSpend: 980000,
        complianceScore: 88,
        qualityScore: 86,
        deliveryScore: 82,
        lastOrderDate: '2024-02-20',
        createdAt: '2023-08-12',
        contactPerson: 'Fatima Al Rashid'
      },
      {
        id: '5',
        name: 'Elite Joinery Works',
        category: 'Joinery',
        email: 'info@elitejoinery.ae',
        phone: '+971 6 444 5566',
        address: 'Ajman Free Zone, UAE',
        registrationNumber: 'REG-2024-005',
        taxId: 'TRN100234567890007',
        status: 'pending',
        rating: 0,
        totalOrders: 0,
        totalSpend: 0,
        complianceScore: 0,
        qualityScore: 0,
        deliveryScore: 0,
        lastOrderDate: '',
        createdAt: '2024-03-19',
        contactPerson: 'John Smith',
        notes: 'New vendor - pending verification'
      }
    ];
    setVendors(sampleVendors);
  }, []);

  // Dynamic categories list that gets updated with custom entries
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([
    'Electrical',
    'MEP Systems',
    'Civil Works',
    'Joinery',
    'Furniture',
    'Safety Equipment',
    'Plumbing',
    'HVAC',
    'Fire Fighting',
    'Structural Steel',
    'Glass & Aluminium',
    'Flooring',
    'Painting',
    'Waterproofing',
    'Landscaping'
  ]);

  // Categories for filter dropdown (includes "All Categories")
  const categories = ['All Categories', ...dynamicCategories];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { variant: 'default', className: 'bg-green-100 text-green-800' },
      inactive: { variant: 'secondary', className: 'bg-gray-100 text-gray-800' },
      blacklisted: { variant: 'destructive', className: '' },
      pending: { variant: 'outline', className: 'bg-amber-100 text-amber-800' }
    };
    return variants[status] || variants.inactive;
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vendor.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vendor.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || vendor.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || vendor.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleAddVendor = () => {
    // Add vendor logic here

    // Add new category to dynamic list if it's custom
    if (formData.category && !dynamicCategories.includes(formData.category)) {
      setDynamicCategories(prev => [...prev, formData.category]);
    }

    toast.success('Vendor added successfully');
    setIsAddDialogOpen(false);
    setFormData({
      name: '',
      category: '',
      email: '',
      countryCode: '+971',
      phone: '',
      street: '',
      city: '',
      state: '',
      country: 'UAE',
      pinCode: '',
      taxId: '',
      contactPerson: '',
      notes: ''
    });
  };

  const handleEditVendor = () => {
    // Edit vendor logic here

    // Add new category to dynamic list if it's custom
    if (formData.category && !dynamicCategories.includes(formData.category)) {
      setDynamicCategories(prev => [...prev, formData.category]);
    }

    toast.success('Vendor updated successfully');
    setIsEditDialogOpen(false);
  };

  const handleDeleteVendor = (vendorId: string) => {
    // Delete vendor logic here
    toast.success('Vendor deleted successfully');
  };

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
              <Users className="w-7 h-7 text-blue-600" />
              Vendor List Management
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage and evaluate your vendor partners
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            {canManageVendors && (
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Add New Vendor
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Role-based Access Alert */}
      {!canManageVendors && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle>View Only Access</AlertTitle>
          <AlertDescription>
            You can view vendor information. Only Procurement team can add, edit, or delete vendors.
            {userRole === 'project manager' || userRole === 'project_manager' || userRole === 'projectmanager' ?
              ' As a Project Manager, you can create Vendor SOW from the Scope of Work page.' : ''}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm p-4 border"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.slice(1).map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="blacklisted">Blacklisted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Vendor Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Vendors</p>
                <p className="text-2xl font-bold text-gray-900">{vendors.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {vendors.filter(v => v.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-amber-600">
                  {vendors.filter(v => v.status === 'pending').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(vendors.reduce((acc, v) => acc + v.rating, 0) / vendors.filter(v => v.rating > 0).length).toFixed(1)}
                </p>
              </div>
              <Award className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-700">Vendor Name</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">Category</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">Contact</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-gray-700">Rating</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-gray-700">Orders</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-gray-700">Total Spend</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor) => (
                    <tr key={vendor.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium text-gray-900">{vendor.name}</p>
                          <p className="text-xs text-gray-500">{vendor.registrationNumber}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="secondary">{vendor.category}</Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-sm text-gray-900">{vendor.contactPerson}</p>
                          <p className="text-xs text-gray-500">{vendor.phone}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Award className={`w-4 h-4 ${getRatingColor(vendor.rating)}`} />
                          <span className={`font-semibold ${getRatingColor(vendor.rating)}`}>
                            {vendor.rating > 0 ? vendor.rating.toFixed(1) : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-gray-900">{vendor.totalOrders}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm font-medium text-gray-900">
                          {vendor.totalSpend > 0 ? `AED ${(vendor.totalSpend / 1000).toFixed(0)}K` : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge {...getStatusBadge(vendor.status)}>
                          {vendor.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedVendor(vendor);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canEditVendors && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedVendor(vendor);
                                setFormData({
                                  name: vendor.name,
                                  category: vendor.category,
                                  email: vendor.email,
                                  countryCode: '+971',
                                  phone: vendor.phone,
                                  street: vendor.street || '',
                                  city: vendor.city || '',
                                  state: vendor.state || '',
                                  country: vendor.country || 'UAE',
                                  pinCode: vendor.pinCode || '',
                                  taxId: vendor.taxId,
                                  contactPerson: vendor.contactPerson,
                                  notes: vendor.notes || ''
                                });
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {canManageVendors && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteVendor(vendor.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Vendor Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>
              Enter the vendor details to add them to your approved vendor list
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label htmlFor="name">Vendor Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter vendor name"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <ComboboxInput
                value={formData.category}
                onChange={(value) => setFormData({ ...formData, category: value })}
                options={dynamicCategories}
                placeholder="Select or type category"
                allowCustom={true}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="vendor@example.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.countryCode}
                  onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+971">🇦🇪 +971</SelectItem>
                    <SelectItem value="+966">🇸🇦 +966</SelectItem>
                    <SelectItem value="+965">🇰🇼 +965</SelectItem>
                    <SelectItem value="+968">🇴🇲 +968</SelectItem>
                    <SelectItem value="+974">🇶🇦 +974</SelectItem>
                    <SelectItem value="+973">🇧🇭 +973</SelectItem>
                    <SelectItem value="+91">🇮🇳 +91</SelectItem>
                    <SelectItem value="+1">🇺🇸 +1</SelectItem>
                    <SelectItem value="+44">🇬🇧 +44</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="50 123 4567"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="Contact person name"
              />
            </div>
            <div>
              <Label htmlFor="taxId">VAT</Label>
              <Input
                id="taxId"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                placeholder="VAT Number"
              />
            </div>
            <div>
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="Street address"
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div>
              <Label htmlFor="state">State/Emirate</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData({ ...formData, state: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dubai">Dubai</SelectItem>
                  <SelectItem value="Abu Dhabi">Abu Dhabi</SelectItem>
                  <SelectItem value="Sharjah">Sharjah</SelectItem>
                  <SelectItem value="Ajman">Ajman</SelectItem>
                  <SelectItem value="Fujairah">Fujairah</SelectItem>
                  <SelectItem value="Ras Al Khaimah">Ras Al Khaimah</SelectItem>
                  <SelectItem value="Umm Al Quwain">Umm Al Quwain</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => setFormData({ ...formData, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UAE">United Arab Emirates</SelectItem>
                  <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                  <SelectItem value="Kuwait">Kuwait</SelectItem>
                  <SelectItem value="Oman">Oman</SelectItem>
                  <SelectItem value="Qatar">Qatar</SelectItem>
                  <SelectItem value="Bahrain">Bahrain</SelectItem>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pinCode">PIN/Postal Code</Label>
              <Input
                id="pinCode"
                value={formData.pinCode}
                onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                placeholder="PIN/Postal code"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about the vendor"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddVendor} className="bg-blue-600 hover:bg-blue-700">
              Add Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Vendor Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
          </DialogHeader>
          {selectedVendor && (
            <Tabs defaultValue="details" className="mt-4">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Vendor Name</p>
                    <p className="font-medium">{selectedVendor.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <Badge variant="secondary">{selectedVendor.category}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Contact Person</p>
                    <p className="font-medium">{selectedVendor.contactPerson}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{selectedVendor.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{selectedVendor.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium">{selectedVendor.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Registration Number</p>
                    <p className="font-medium">{selectedVendor.registrationNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tax ID</p>
                    <p className="font-medium">{selectedVendor.taxId}</p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="performance" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Compliance Score</p>
                        <p className="text-2xl font-bold text-green-600">{selectedVendor.complianceScore}%</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Quality Score</p>
                        <p className="text-2xl font-bold text-blue-600">{selectedVendor.qualityScore}%</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Delivery Score</p>
                        <p className="text-2xl font-bold text-blue-600">{selectedVendor.deliveryScore}%</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-xl font-bold">{selectedVendor.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Spend</p>
                    <p className="text-xl font-bold">AED {selectedVendor.totalSpend.toLocaleString()}</p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="history" className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Member Since</p>
                  <p className="font-medium">{new Date(selectedVendor.createdAt).toLocaleDateString()}</p>
                </div>
                {selectedVendor.lastOrderDate && (
                  <div>
                    <p className="text-sm text-gray-600">Last Order Date</p>
                    <p className="font-medium">{new Date(selectedVendor.lastOrderDate).toLocaleDateString()}</p>
                  </div>
                )}
                {selectedVendor.notes && (
                  <div>
                    <p className="text-sm text-gray-600">Notes</p>
                    <p className="font-medium">{selectedVendor.notes}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update vendor information
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label htmlFor="edit-name">Vendor Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter vendor name"
              />
            </div>
            <div>
              <Label htmlFor="edit-category">Category</Label>
              <ComboboxInput
                value={formData.category}
                onChange={(value) => setFormData({ ...formData, category: value })}
                options={dynamicCategories}
                placeholder="Select or type category"
                allowCustom={true}
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="vendor@example.com"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone Number</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.countryCode}
                  onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+971">🇦🇪 +971</SelectItem>
                    <SelectItem value="+966">🇸🇦 +966</SelectItem>
                    <SelectItem value="+965">🇰🇼 +965</SelectItem>
                    <SelectItem value="+968">🇴🇲 +968</SelectItem>
                    <SelectItem value="+974">🇶🇦 +974</SelectItem>
                    <SelectItem value="+973">🇧🇭 +973</SelectItem>
                    <SelectItem value="+91">🇮🇳 +91</SelectItem>
                    <SelectItem value="+1">🇺🇸 +1</SelectItem>
                    <SelectItem value="+44">🇬🇧 +44</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="50 123 4567"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-contactPerson">Contact Person</Label>
              <Input
                id="edit-contactPerson"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="Contact person name"
              />
            </div>
            <div>
              <Label htmlFor="edit-taxId">VAT</Label>
              <Input
                id="edit-taxId"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                placeholder="VAT Number"
              />
            </div>
            <div>
              <Label htmlFor="edit-street">Street Address</Label>
              <Input
                id="edit-street"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="Street address"
              />
            </div>
            <div>
              <Label htmlFor="edit-city">City</Label>
              <Input
                id="edit-city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div>
              <Label htmlFor="edit-state">State/Emirate</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData({ ...formData, state: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dubai">Dubai</SelectItem>
                  <SelectItem value="Abu Dhabi">Abu Dhabi</SelectItem>
                  <SelectItem value="Sharjah">Sharjah</SelectItem>
                  <SelectItem value="Ajman">Ajman</SelectItem>
                  <SelectItem value="Fujairah">Fujairah</SelectItem>
                  <SelectItem value="Ras Al Khaimah">Ras Al Khaimah</SelectItem>
                  <SelectItem value="Umm Al Quwain">Umm Al Quwain</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-country">Country</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => setFormData({ ...formData, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UAE">United Arab Emirates</SelectItem>
                  <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                  <SelectItem value="Kuwait">Kuwait</SelectItem>
                  <SelectItem value="Oman">Oman</SelectItem>
                  <SelectItem value="Qatar">Qatar</SelectItem>
                  <SelectItem value="Bahrain">Bahrain</SelectItem>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-pinCode">PIN/Postal Code</Label>
              <Input
                id="edit-pinCode"
                value={formData.pinCode}
                onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                placeholder="PIN/Postal code"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about the vendor"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditVendor} className="bg-blue-600 hover:bg-blue-700">
              Update Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorListPage;