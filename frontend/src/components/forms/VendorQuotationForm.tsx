import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import {
  Users,
  Building2,
  FileText,
  Banknote,
  Calendar,
  Package,
  Upload,
  Plus,
  Trash2,
  Check,
  X,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Globe,
  Briefcase,
  Award,
  Clock,
  TrendingUp,
  Calculator,
  CreditCard,
  Shield,
  CheckCircle2,
  Info,
  Send,
  Save,
  Eye,
  Download,
  Percent,
  Hash,
  Layers
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface QuotationItem {
  id: string;
  description: string;
  boqReference: string;
  unit: string;
  quantity: number;
  unitRate: number;
  discount: number;
  tax: number;
  totalAmount: number;
  remarks: string;
}

interface VendorDetails {
  companyName: string;
  registrationNumber: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  vendorCategory: string;
  rating: number;
}

interface PaymentTerms {
  advancePayment: number;
  progressPayment: number;
  finalPayment: number;
  retentionPercentage: number;
  paymentMethod: string;
  creditPeriod: number;
}

interface VendorQuotationFormData {
  quotationNumber: string;
  projectId: string;
  projectName: string;
  scopeOfWork: string;
  vendor: VendorDetails;
  items: QuotationItem[];
  paymentTerms: PaymentTerms;
  deliveryTerms: {
    deliveryPeriod: number;
    deliveryLocation: string;
    installationIncluded: boolean;
    warrantyPeriod: number;
  };
  validity: {
    validFrom: string;
    validUntil: string;
  };
  totalAmount: number;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'negotiation';
  approvalFlags: {
    technical: boolean;
    commercial: boolean;
    compliance: boolean;
  };
}

const VendorQuotationForm: React.FC = () => {
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [activeTab, setActiveTab] = useState('vendor');
  const [showComparison, setShowComparison] = useState(false);

  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm<VendorQuotationFormData>();

  const addQuotationItem = () => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      description: '',
      boqReference: '',
      unit: 'nos',
      quantity: 1,
      unitRate: 0,
      discount: 0,
      tax: 7, // GST
      totalAmount: 0,
      remarks: ''
    };
    setQuotationItems([...quotationItems, newItem]);
  };

  const removeQuotationItem = (id: string) => {
    setQuotationItems(quotationItems.filter(item => item.id !== id));
  };

  const updateQuotationItem = (id: string, field: keyof QuotationItem, value: any) => {
    setQuotationItems(quotationItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Calculate total amount
        const subtotal = updated.quantity * updated.unitRate;
        const discountAmount = subtotal * (updated.discount / 100);
        const afterDiscount = subtotal - discountAmount;
        const taxAmount = afterDiscount * (updated.tax / 100);
        updated.totalAmount = afterDiscount + taxAmount;
        return updated;
      }
      return item;
    }));
  };

  const calculateSubtotal = () => {
    return quotationItems.reduce((sum, item) => sum + (item.quantity * item.unitRate), 0);
  };

  const calculateTotalDiscount = () => {
    return quotationItems.reduce((sum, item) => {
      const subtotal = item.quantity * item.unitRate;
      return sum + (subtotal * (item.discount / 100));
    }, 0);
  };

  const calculateTotalTax = () => {
    return quotationItems.reduce((sum, item) => {
      const subtotal = item.quantity * item.unitRate;
      const afterDiscount = subtotal - (subtotal * (item.discount / 100));
      return sum + (afterDiscount * (item.tax / 100));
    }, 0);
  };

  const calculateGrandTotal = () => {
    return quotationItems.reduce((sum, item) => sum + item.totalAmount, 0);
  };

  const onSubmit = (data: VendorQuotationFormData) => {
    console.log('Submitting Vendor Quotation:', { ...data, items: quotationItems });
    // TODO: Integrate with ApprovalWorkflow
    // - Initialize workflow with QTY/SCOPE FLAG, PM FLAG
    // - Route to Project Manager -> Estimation -> Technical Director
    // - Set up rejection/revision loops for scope changes
    alert('Vendor Quotation submitted! (Workflow integration pending)');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl shadow-xl p-6 text-gray-800 border border-red-200"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Vendor/Subcontractor Quotation</h1>
              <p className="text-gray-600 mt-1">Submit and manage vendor quotations</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <Badge className="bg-red-100 text-red-700 border-red-300 px-3 py-1">
              <Hash className="w-3 h-3 mr-1" />
              VQ-2024-001
            </Badge>
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 px-3 py-1">
              <Clock className="w-3 h-3 mr-1" />
              Under Review
            </Badge>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full bg-white shadow-sm border">
            <TabsTrigger value="vendor" className="data-[state=active]:bg-red-50">
              <Building2 className="w-4 h-4 mr-2" />
              Vendor
            </TabsTrigger>
            <TabsTrigger value="scope" className="data-[state=active]:bg-red-50">
              <Briefcase className="w-4 h-4 mr-2" />
              Scope
            </TabsTrigger>
            <TabsTrigger value="quotation" className="data-[state=active]:bg-red-50">
              <Calculator className="w-4 h-4 mr-2" />
              Quotation
            </TabsTrigger>
            <TabsTrigger value="terms" className="data-[state=active]:bg-red-50">
              <CreditCard className="w-4 h-4 mr-2" />
              Terms
            </TabsTrigger>
            <TabsTrigger value="approval" className="data-[state=active]:bg-red-50">
              <Shield className="w-4 h-4 mr-2" />
              Approval
            </TabsTrigger>
          </TabsList>

          {/* Vendor Details Tab */}
          <TabsContent value="vendor">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-red-600" />
                  Vendor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      Company Name
                    </Label>
                    <Input 
                      {...register('vendor.companyName', { required: true })}
                      placeholder="Enter company name"
                      className="h-11 border-gray-200 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Hash className="w-4 h-4 text-gray-500" />
                      Registration Number
                    </Label>
                    <Input 
                      {...register('vendor.registrationNumber')}
                      placeholder="Business registration number"
                      className="h-11 border-gray-200 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Users className="w-4 h-4 text-gray-500" />
                      Contact Person
                    </Label>
                    <Input 
                      {...register('vendor.contactPerson', { required: true })}
                      placeholder="Primary contact name"
                      className="h-11 border-gray-200 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Phone className="w-4 h-4 text-gray-500" />
                      Phone Number
                    </Label>
                    <Input 
                      {...register('vendor.phone', { required: true })}
                      placeholder="+65 XXXX XXXX"
                      className="h-11 border-gray-200 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Mail className="w-4 h-4 text-gray-500" />
                      Email Address
                    </Label>
                    <Input 
                      type="email"
                      {...register('vendor.email', { required: true })}
                      placeholder="vendor@company.com"
                      className="h-11 border-gray-200 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Layers className="w-4 h-4 text-gray-500" />
                      Vendor Category
                    </Label>
                    <Select>
                      <SelectTrigger className="h-11 border-gray-200 focus:border-red-500">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contractor">General Contractor</SelectItem>
                        <SelectItem value="electrical">Electrical Contractor</SelectItem>
                        <SelectItem value="plumbing">Plumbing Contractor</SelectItem>
                        <SelectItem value="carpentry">Carpentry & Joinery</SelectItem>
                        <SelectItem value="painting">Painting & Finishing</SelectItem>
                        <SelectItem value="flooring">Flooring Specialist</SelectItem>
                        <SelectItem value="furniture">Furniture Supplier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    Business Address
                  </Label>
                  <textarea 
                    {...register('vendor.address')}
                    className="w-full min-h-[80px] p-3 border border-gray-200 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    placeholder="Complete business address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Globe className="w-4 h-4 text-gray-500" />
                      Website
                    </Label>
                    <Input 
                      {...register('vendor.website')}
                      placeholder="https://www.vendor.com"
                      className="h-11 border-gray-200 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Award className="w-4 h-4 text-gray-500" />
                      Vendor Rating
                    </Label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className="text-2xl text-gray-300 hover:text-yellow-400 transition-colors"
                        >
                          ★
                        </button>
                      ))}
                      <span className="text-sm text-gray-500 ml-2">Click to rate</span>
                    </div>
                  </div>
                </div>

                {/* Vendor Credentials */}
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-600" />
                    Vendor Credentials & Compliance
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['BCA Registered', 'ISO Certified', 'BizSafe', 'GST Registered'].map((cert) => (
                      <label key={cert} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded border-gray-300 text-red-600" />
                        <span className="text-sm text-gray-700">{cert}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scope of Work Tab */}
          <TabsContent value="scope">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-red-600" />
                  Scope of Work
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      Project Name
                    </Label>
                    <Select>
                      <SelectTrigger className="h-11 border-gray-200 focus:border-red-500">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="proj1">Marina Bay Residences - Tower A</SelectItem>
                        <SelectItem value="proj2">Orchard Central Office Fit-out</SelectItem>
                        <SelectItem value="proj3">Sentosa Resort Renovation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <FileText className="w-4 h-4 text-gray-500" />
                      BOQ Reference
                    </Label>
                    <Input 
                      placeholder="BOQ-2024-001"
                      className="h-11 border-gray-200 focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <Briefcase className="w-4 h-4 text-gray-500" />
                    Detailed Scope of Work
                  </Label>
                  <textarea 
                    {...register('scopeOfWork')}
                    className="w-full min-h-[150px] p-3 border border-gray-200 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    placeholder="Describe the complete scope of work, deliverables, and specifications..."
                  />
                </div>

                {/* Work Categories */}
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <h3 className="font-semibold text-gray-800 mb-3">Work Categories Included</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      'Civil Works',
                      'Electrical Works',
                      'Plumbing Works',
                      'Carpentry',
                      'Painting',
                      'Flooring',
                      'False Ceiling',
                      'Furniture Supply',
                      'MEP Works'
                    ].map((category) => (
                      <label key={category} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded border-gray-300 text-red-600" />
                        <span className="text-sm text-gray-700">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Site Conditions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      Site Location
                    </Label>
                    <Input 
                      placeholder="Site address"
                      className="h-11 border-gray-200 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Clock className="w-4 h-4 text-gray-500" />
                      Working Hours
                    </Label>
                    <Select>
                      <SelectTrigger className="h-11 border-gray-200 focus:border-red-500">
                        <SelectValue placeholder="Select working hours" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal Hours (8AM - 6PM)</SelectItem>
                        <SelectItem value="extended">Extended Hours (7AM - 9PM)</SelectItem>
                        <SelectItem value="24x7">24x7 Operations</SelectItem>
                        <SelectItem value="weekend">Weekends Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quotation Items Tab */}
          <TabsContent value="quotation">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-red-600" />
                    Quotation Details
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-red-100 text-red-700 border border-red-300">
                      {quotationItems.length} Items
                    </Badge>
                    <Badge className="bg-green-100 text-green-700 border border-green-300">
                      <Banknote className="w-3 h-3 mr-1" />
                      Total: AED {calculateGrandTotal().toLocaleString()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <AnimatePresence>
                    {quotationItems.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-4 border border-red-200"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600 font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">Item #{index + 1}</p>
                              <p className="text-xs text-gray-500">BOQ Ref: {item.boqReference || 'N/A'}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuotationItem(item.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">Description</Label>
                            <Input
                              value={item.description}
                              onChange={(e) => updateQuotationItem(item.id, 'description', e.target.value)}
                              placeholder="Item description"
                              className="border-gray-200"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">BOQ Reference</Label>
                            <Input
                              value={item.boqReference}
                              onChange={(e) => updateQuotationItem(item.id, 'boqReference', e.target.value)}
                              placeholder="BOQ item reference"
                              className="border-gray-200"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">Unit</Label>
                            <Select
                              value={item.unit}
                              onValueChange={(value) => updateQuotationItem(item.id, 'unit', value)}
                            >
                              <SelectTrigger className="border-gray-200 h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nos">Nos</SelectItem>
                                <SelectItem value="sqm">Sqm</SelectItem>
                                <SelectItem value="m">M</SelectItem>
                                <SelectItem value="kg">Kg</SelectItem>
                                <SelectItem value="set">Set</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">Qty</Label>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuotationItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="border-gray-200 h-9"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">Unit Rate</Label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 font-semibold">AED</span>
                              <Input
                                type="number"
                                value={item.unitRate}
                                onChange={(e) => updateQuotationItem(item.id, 'unitRate', parseFloat(e.target.value) || 0)}
                                className="pl-7 border-gray-200 h-9"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">Discount</Label>
                            <div className="relative">
                              <Percent className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                              <Input
                                type="number"
                                value={item.discount}
                                onChange={(e) => updateQuotationItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                className="pl-7 border-gray-200 h-9"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">Tax</Label>
                            <div className="relative">
                              <Percent className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                              <Input
                                type="number"
                                value={item.tax}
                                onChange={(e) => updateQuotationItem(item.id, 'tax', parseFloat(e.target.value) || 0)}
                                className="pl-7 border-gray-200 h-9"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">Total</Label>
                            <div className="bg-red-100 border border-red-300 rounded-md px-2 py-1 text-center">
                              <span className="font-bold text-red-700">
                                AED {item.totalAmount.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          <Label className="text-xs font-semibold text-gray-600">Remarks</Label>
                          <Input
                            value={item.remarks}
                            onChange={(e) => updateQuotationItem(item.id, 'remarks', e.target.value)}
                            placeholder="Additional notes or specifications"
                            className="border-gray-200 h-9"
                          />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <Button
                    type="button"
                    onClick={addQuotationItem}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Quotation Item
                  </Button>

                  {quotationItems.length > 0 && (
                    <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-6 border border-red-300">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-semibold">AED {calculateSubtotal().toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Total Discount:</span>
                          <span className="font-semibold text-red-600">-AED {calculateTotalDiscount().toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Total Tax (GST):</span>
                          <span className="font-semibold">AED {calculateTotalTax().toLocaleString()}</span>
                        </div>
                        <div className="pt-3 border-t border-red-300">
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-gray-800">Grand Total:</span>
                            <span className="text-2xl font-bold text-red-700">
                              AED {calculateGrandTotal().toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Terms Tab */}
          <TabsContent value="terms">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-red-600" />
                  Payment & Delivery Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Payment Terms */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-gray-600" />
                    Payment Terms
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Advance Payment (%)</Label>
                      <Input 
                        type="number" 
                        placeholder="30"
                        className="border-gray-200"
                        {...register('paymentTerms.advancePayment')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Progress Payment (%)</Label>
                      <Input 
                        type="number" 
                        placeholder="60"
                        className="border-gray-200"
                        {...register('paymentTerms.progressPayment')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Final Payment (%)</Label>
                      <Input 
                        type="number" 
                        placeholder="10"
                        className="border-gray-200"
                        {...register('paymentTerms.finalPayment')}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Payment Method</Label>
                      <Select>
                        <SelectTrigger className="border-gray-200">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="letter_credit">Letter of Credit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Credit Period (Days)</Label>
                      <Input 
                        type="number" 
                        placeholder="30"
                        className="border-gray-200"
                        {...register('paymentTerms.creditPeriod')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Retention (%)</Label>
                      <Input 
                        type="number" 
                        placeholder="5"
                        className="border-gray-200"
                        {...register('paymentTerms.retentionPercentage')}
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Terms */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-gray-600" />
                    Delivery Terms
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Delivery Period (Days)</Label>
                      <Input 
                        type="number" 
                        placeholder="45"
                        className="border-gray-200"
                        {...register('deliveryTerms.deliveryPeriod')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Delivery Location</Label>
                      <Input 
                        placeholder="Site address or warehouse"
                        className="border-gray-200"
                        {...register('deliveryTerms.deliveryLocation')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Warranty Period (Months)</Label>
                      <Input 
                        type="number" 
                        placeholder="12"
                        className="border-gray-200"
                        {...register('deliveryTerms.warrantyPeriod')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Installation</Label>
                      <Select>
                        <SelectTrigger className="border-gray-200">
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="included">Included</SelectItem>
                          <SelectItem value="excluded">Excluded</SelectItem>
                          <SelectItem value="separate">Separate Quote</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Validity Period */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    Quotation Validity
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Valid From</Label>
                      <Input 
                        type="date" 
                        className="border-gray-200"
                        placeholder="dd/mm/yyyy"
                        {...register('validity.validFrom')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Valid Until</Label>
                      <Input 
                        type="date" 
                        className="border-gray-200"
                        placeholder="dd/mm/yyyy"
                        {...register('validity.validUntil')}
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Terms */}
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Info className="w-5 h-5 text-amber-600" />
                    Additional Terms & Conditions
                  </h3>
                  <textarea 
                    className="w-full min-h-[100px] p-3 border border-gray-200 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    placeholder="Enter any additional terms, conditions, or special requirements..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approval Status Tab */}
          <TabsContent value="approval">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  Approval Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Approval Flags */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold">Technical Review</span>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 border border-blue-300">
                          Pending
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Technical specifications and scope validation
                      </p>
                    </div>

                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Banknote className="w-5 h-5 text-green-600" />
                          <span className="font-semibold">Commercial Review</span>
                        </div>
                        <Badge className="bg-green-100 text-green-700 border border-green-300">
                          Pending
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Pricing and payment terms evaluation
                      </p>
                    </div>

                    <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-red-600" />
                          <span className="font-semibold">Compliance Check</span>
                        </div>
                        <Badge className="bg-red-100 text-red-700 border border-red-300">
                          Pending
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Vendor credentials and compliance verification
                      </p>
                    </div>
                  </div>

                  {/* Approval Chain */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">Approval Workflow</h3>
                    <div className="space-y-4">
                      {[
                        { role: 'Procurement Officer', name: 'Sarah Chen', status: 'completed', date: '2024-01-15', icon: Package },
                        { role: 'Estimation Team', name: 'David Lim', status: 'in-progress', date: 'Pending', icon: Calculator },
                        { role: 'Technical Director', name: 'Michael Tan', status: 'pending', date: 'Pending', icon: Briefcase },
                        { role: 'Project Manager', name: 'Jennifer Wong', status: 'pending', date: 'Pending', icon: Users },
                        { role: 'Finance Director', name: 'Robert Lee', status: 'pending', date: 'Pending', icon: Banknote }
                      ].map((approver, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            approver.status === 'completed' ? 'bg-green-100 text-green-600' :
                            approver.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                            'bg-gray-100 text-gray-400'
                          }`}>
                            <approver.icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-800">{approver.role}</p>
                                <p className="text-sm text-gray-500">{approver.name}</p>
                              </div>
                              <div className="text-right">
                                {approver.status === 'completed' && (
                                  <CheckCircle2 className="w-5 h-5 text-green-600 mb-1" />
                                )}
                                {approver.status === 'in-progress' && (
                                  <Clock className="w-5 h-5 text-blue-600 mb-1 animate-pulse" />
                                )}
                                <p className="text-xs text-gray-500">{approver.date}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comparison with Other Vendors */}
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-red-600" />
                        Vendor Comparison
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowComparison(!showComparison)}
                      >
                        {showComparison ? 'Hide' : 'Show'} Comparison
                      </Button>
                    </div>
                    {showComparison && (
                      <div className="mt-4 space-y-2">
                        <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-gray-600 pb-2 border-b">
                          <div>Vendor</div>
                          <div>Quote Amount</div>
                          <div>Delivery</div>
                          <div>Rating</div>
                        </div>
                        {[
                          { name: 'Current Vendor', amount: calculateGrandTotal(), delivery: '45 days', rating: 4.5 },
                          { name: 'ABC Contractors', amount: calculateGrandTotal() * 1.1, delivery: '60 days', rating: 4.2 },
                          { name: 'XYZ Builders', amount: calculateGrandTotal() * 0.95, delivery: '50 days', rating: 3.8 }
                        ].map((vendor, idx) => (
                          <div key={idx} className={`grid grid-cols-4 gap-2 text-sm py-2 ${idx === 0 ? 'font-semibold text-red-700' : ''}`}>
                            <div>{vendor.name}</div>
                            <div>AED {vendor.amount.toLocaleString()}</div>
                            <div>{vendor.delivery}</div>
                            <div className="flex items-center gap-1">
                              <span>{vendor.rating}</span>
                              <span className="text-yellow-500">★</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row gap-4 justify-between mt-6"
        >
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </Button>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Submit Quotation
            </Button>
          </div>
        </motion.div>
      </form>
    </div>
  );
};

export default VendorQuotationForm;