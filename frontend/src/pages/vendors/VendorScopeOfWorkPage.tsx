import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Save,
  Send,
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Calculator,
  AlertCircle,
  CheckCircle,
  Building2,
  Package,
  Calendar,
  User,
  Hash,
  DollarSign,
  ClipboardList
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuthStore } from '@/store/authStore';
import { buildRolePath } from '@/utils/roleRouting';
import { toast } from 'sonner';

interface BOQItem {
  id: string;
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  remarks?: string;
}

interface ScopeOfWork {
  // Basic Information
  sowNumber: string;
  projectId: string;
  projectName: string;
  vendorId: string;
  vendorName: string;
  category: string;

  // BOQ Reference
  boqReference: string;
  boqItems: BOQItem[];

  // Scope Details
  scopeTitle: string;
  scopeDescription: string;
  deliverables: string[];
  milestones: { description: string; targetDate: string; payment: number }[];

  // Terms
  paymentTerms: string;
  deliveryTerms: string;
  warrantyTerms: string;
  qualityStandards: string;

  // Amounts
  subtotal: number;
  vatAmount: number;
  totalAmount: number;

  // Approval Flags
  qtyScopeFlag?: boolean;
  pmFlag?: boolean;
  estimationCheck?: boolean;

  // Metadata
  createdBy: string;
  createdDate: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
}

const VendorScopeOfWorkPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userName = (user as any)?.full_name || (user as any)?.name || '';

  const buildPath = (path: string) => buildRolePath(user?.role_id || '', path);

  // Check if user can create SOW (only Project Manager role)
  const userRole = (user as any)?.role?.toLowerCase() || '';
  const canCreateSOW = userRole === 'project manager' || userRole === 'project_manager' || userRole === 'projectmanager';

  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<ScopeOfWork>({
    sowNumber: `SOW-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    projectId: '',
    projectName: '',
    vendorId: '',
    vendorName: '',
    category: '',
    boqReference: '',
    boqItems: [],
    scopeTitle: '',
    scopeDescription: '',
    deliverables: [''],
    milestones: [{ description: '', targetDate: '', payment: 0 }],
    paymentTerms: '30% Advance, 70% on Delivery',
    deliveryTerms: '',
    warrantyTerms: '',
    qualityStandards: '',
    subtotal: 0,
    vatAmount: 0,
    totalAmount: 0,
    createdBy: userName,
    createdDate: new Date().toISOString().split('T')[0],
    status: 'draft'
  });

  const [boqItems, setBoqItems] = useState<BOQItem[]>([
    {
      id: '1',
      itemCode: 'BOQ-001',
      description: '',
      unit: 'nos',
      quantity: 0,
      rate: 0,
      amount: 0
    }
  ]);

  const projects = [
    { id: 'PRJ-001', name: 'Dubai Marina Tower' },
    { id: 'PRJ-002', name: 'Abu Dhabi Mall Renovation' },
    { id: 'PRJ-003', name: 'Sharjah Office Complex' }
  ];

  const vendors = [
    { id: 'VND-001', name: 'ABC Trading LLC', category: 'Electrical' },
    { id: 'VND-002', name: 'XYZ Contractors', category: 'Civil Works' },
    { id: 'VND-003', name: 'Global MEP Solutions', category: 'MEP Systems' }
  ];

  const categories = [
    'Electrical',
    'MEP Systems',
    'Civil Works',
    'Joinery',
    'Furniture',
    'Interior Fit-out'
  ];

  const addBOQItem = () => {
    const newItem: BOQItem = {
      id: String(boqItems.length + 1),
      itemCode: `BOQ-${String(boqItems.length + 1).padStart(3, '0')}`,
      description: '',
      unit: 'nos',
      quantity: 0,
      rate: 0,
      amount: 0
    };
    setBoqItems([...boqItems, newItem]);
  };

  const updateBOQItem = (index: number, field: keyof BOQItem, value: any) => {
    const updatedItems = [...boqItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Calculate amount if quantity or rate changes
    if (field === 'quantity' || field === 'rate') {
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].rate;
    }

    setBoqItems(updatedItems);

    // Update totals
    const subtotal = updatedItems.reduce((sum, item) => sum + item.amount, 0);
    const vatAmount = subtotal * 0.05; // 5% VAT
    setFormData({
      ...formData,
      boqItems: updatedItems,
      subtotal,
      vatAmount,
      totalAmount: subtotal + vatAmount
    });
  };

  const removeBOQItem = (index: number) => {
    const updatedItems = boqItems.filter((_, i) => i !== index);
    setBoqItems(updatedItems);
  };

  const addDeliverable = () => {
    setFormData({
      ...formData,
      deliverables: [...formData.deliverables, '']
    });
  };

  const updateDeliverable = (index: number, value: string) => {
    const updatedDeliverables = [...formData.deliverables];
    updatedDeliverables[index] = value;
    setFormData({ ...formData, deliverables: updatedDeliverables });
  };

  const removeDeliverable = (index: number) => {
    setFormData({
      ...formData,
      deliverables: formData.deliverables.filter((_, i) => i !== index)
    });
  };

  const addMilestone = () => {
    setFormData({
      ...formData,
      milestones: [...formData.milestones, { description: '', targetDate: '', payment: 0 }]
    });
  };

  const updateMilestone = (index: number, field: string, value: any) => {
    const updatedMilestones = [...formData.milestones];
    updatedMilestones[index] = { ...updatedMilestones[index], [field]: value };
    setFormData({ ...formData, milestones: updatedMilestones });
  };

  const removeMilestone = (index: number) => {
    setFormData({
      ...formData,
      milestones: formData.milestones.filter((_, i) => i !== index)
    });
  };

  const handleSaveDraft = () => {
    toast.success('Scope of Work saved as draft');
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.projectId || !formData.vendorId || !formData.scopeTitle || boqItems.length === 0) {
      toast.error('Please fill in all required fields and add at least one BOQ item');
      return;
    }

    toast.success('Scope of Work submitted for approval');
    navigate(buildPath('/vendors/quotations'));
  };

  const isTabComplete = (tab: string): boolean => {
    switch (tab) {
      case 'basic':
        return !!(formData.projectId && formData.vendorId && formData.scopeTitle);
      case 'boq':
        return boqItems.length > 0 && boqItems.every(item => item.description && item.quantity > 0);
      case 'scope':
        return formData.deliverables.length > 0 && formData.deliverables.every(d => d);
      case 'terms':
        return !!(formData.paymentTerms && formData.deliveryTerms);
      default:
        return false;
    }
  };

  // Show access denied message if user is not Project Manager
  if (!canCreateSOW) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto mt-20">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>
              Only Project Managers can create Vendor Scope of Work (SOW) documents.
              According to the workflow, Project Managers initiate SOW with BOQ reference,
              which is then sent to Procurement for vendor selection.
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => navigate(buildPath('/vendors/list'))}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            View Vendor List
          </Button>
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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(buildPath('/vendors/quotations'))}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-7 h-7 text-blue-600" />
                Vendor Scope of Work - BOQ Reference
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {formData.sowNumber} • Created by {formData.createdBy} on {formData.createdDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={formData.status === 'draft' ? 'secondary' : 'default'}>
              {formData.status}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Send className="w-4 h-4" />
              Submit for Approval
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Approval Flags Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertTitle>Approval Workflow</AlertTitle>
        <AlertDescription>
          This Scope of Work will go through the following approval gates:
          <div className="flex gap-4 mt-2">
            <Badge variant="outline" className="bg-white">QTY/SCOPE FLAG</Badge>
            <Badge variant="outline" className="bg-white">PM FLAG</Badge>
            <Badge variant="outline" className="bg-white">ESTIMATION-VENDOR CHECK</Badge>
          </div>
        </AlertDescription>
      </Alert>

      {/* Form Tabs */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="basic" className="relative">
                Basic Info
                {isTabComplete('basic') && (
                  <CheckCircle className="w-4 h-4 text-green-500 absolute -top-1 -right-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="boq" className="relative">
                BOQ Reference
                {isTabComplete('boq') && (
                  <CheckCircle className="w-4 h-4 text-green-500 absolute -top-1 -right-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="scope" className="relative">
                Scope Details
                {isTabComplete('scope') && (
                  <CheckCircle className="w-4 h-4 text-green-500 absolute -top-1 -right-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="terms" className="relative">
                Terms
                {isTabComplete('terms') && (
                  <CheckCircle className="w-4 h-4 text-green-500 absolute -top-1 -right-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="summary">
                Summary
              </TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="project">Project *</Label>
                  <Select
                    value={formData.projectId}
                    onValueChange={(value) => {
                      const project = projects.find(p => p.id === value);
                      setFormData({
                        ...formData,
                        projectId: value,
                        projectName: project?.name || ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="vendor">Vendor *</Label>
                  <Select
                    value={formData.vendorId}
                    onValueChange={(value) => {
                      const vendor = vendors.find(v => v.id === value);
                      setFormData({
                        ...formData,
                        vendorId: value,
                        vendorName: vendor?.name || '',
                        category: vendor?.category || ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="boqRef">BOQ Reference *</Label>
                  <Input
                    id="boqRef"
                    value={formData.boqReference}
                    onChange={(e) => setFormData({ ...formData, boqReference: e.target.value })}
                    placeholder="BOQ-2024-XXX"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="scopeTitle">Scope Title *</Label>
                  <Input
                    id="scopeTitle"
                    value={formData.scopeTitle}
                    onChange={(e) => setFormData({ ...formData, scopeTitle: e.target.value })}
                    placeholder="Enter scope of work title"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="scopeDesc">Scope Description</Label>
                  <Textarea
                    id="scopeDesc"
                    value={formData.scopeDescription}
                    onChange={(e) => setFormData({ ...formData, scopeDescription: e.target.value })}
                    placeholder="Detailed description of the scope of work"
                    rows={4}
                  />
                </div>
              </div>
            </TabsContent>

            {/* BOQ Reference Tab */}
            <TabsContent value="boq" className="space-y-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">BOQ Items</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addBOQItem}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border p-2 text-left text-sm font-medium">Item Code</th>
                      <th className="border p-2 text-left text-sm font-medium">Description</th>
                      <th className="border p-2 text-left text-sm font-medium">Unit</th>
                      <th className="border p-2 text-left text-sm font-medium">Quantity</th>
                      <th className="border p-2 text-left text-sm font-medium">Rate (AED)</th>
                      <th className="border p-2 text-left text-sm font-medium">Amount (AED)</th>
                      <th className="border p-2 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boqItems.map((item, index) => (
                      <tr key={item.id}>
                        <td className="border p-2">
                          <Input
                            value={item.itemCode}
                            onChange={(e) => updateBOQItem(index, 'itemCode', e.target.value)}
                            className="h-8"
                          />
                        </td>
                        <td className="border p-2">
                          <Input
                            value={item.description}
                            onChange={(e) => updateBOQItem(index, 'description', e.target.value)}
                            placeholder="Item description"
                            className="h-8"
                          />
                        </td>
                        <td className="border p-2">
                          <Select
                            value={item.unit}
                            onValueChange={(value) => updateBOQItem(index, 'unit', value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nos">Nos</SelectItem>
                              <SelectItem value="sqm">Sqm</SelectItem>
                              <SelectItem value="lm">Lm</SelectItem>
                              <SelectItem value="kg">Kg</SelectItem>
                              <SelectItem value="set">Set</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="border p-2">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateBOQItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-8"
                          />
                        </td>
                        <td className="border p-2">
                          <Input
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateBOQItem(index, 'rate', parseFloat(e.target.value) || 0)}
                            className="h-8"
                          />
                        </td>
                        <td className="border p-2">
                          <Input
                            value={item.amount.toFixed(2)}
                            readOnly
                            className="h-8 bg-gray-50"
                          />
                        </td>
                        <td className="border p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBOQItem(index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="border p-2 text-right font-medium">Subtotal:</td>
                      <td className="border p-2 font-bold">AED {formData.subtotal.toFixed(2)}</td>
                      <td className="border p-2"></td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="border p-2 text-right font-medium">VAT (5%):</td>
                      <td className="border p-2 font-bold">AED {formData.vatAmount.toFixed(2)}</td>
                      <td className="border p-2"></td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td colSpan={5} className="border p-2 text-right font-bold">Total Amount:</td>
                      <td className="border p-2 font-bold text-blue-600">AED {formData.totalAmount.toFixed(2)}</td>
                      <td className="border p-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </TabsContent>

            {/* Scope Details Tab */}
            <TabsContent value="scope" className="space-y-4 mt-6">
              <div className="space-y-6">
                {/* Deliverables */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Deliverables</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addDeliverable}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Deliverable
                    </Button>
                  </div>
                  {formData.deliverables.map((deliverable, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={deliverable}
                        onChange={(e) => updateDeliverable(index, e.target.value)}
                        placeholder={`Deliverable ${index + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDeliverable(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Milestones */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Milestones & Payment Schedule</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addMilestone}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Milestone
                    </Button>
                  </div>
                  {formData.milestones.map((milestone, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2 mb-2">
                      <Input
                        value={milestone.description}
                        onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                        placeholder="Milestone description"
                      />
                      <Input
                        type="date"
                        value={milestone.targetDate}
                        onChange={(e) => updateMilestone(index, 'targetDate', e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={milestone.payment}
                          onChange={(e) => updateMilestone(index, 'payment', parseFloat(e.target.value) || 0)}
                          placeholder="Payment %"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMilestone(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Terms Tab */}
            <TabsContent value="terms" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="paymentTerms">Payment Terms *</Label>
                  <Textarea
                    id="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    placeholder="Enter payment terms"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryTerms">Delivery Terms *</Label>
                  <Textarea
                    id="deliveryTerms"
                    value={formData.deliveryTerms}
                    onChange={(e) => setFormData({ ...formData, deliveryTerms: e.target.value })}
                    placeholder="Enter delivery terms"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="warrantyTerms">Warranty Terms</Label>
                  <Textarea
                    id="warrantyTerms"
                    value={formData.warrantyTerms}
                    onChange={(e) => setFormData({ ...formData, warrantyTerms: e.target.value })}
                    placeholder="Enter warranty terms"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="qualityStandards">Quality Standards & Compliance</Label>
                  <Textarea
                    id="qualityStandards"
                    value={formData.qualityStandards}
                    onChange={(e) => setFormData({ ...formData, qualityStandards: e.target.value })}
                    placeholder="Enter quality standards and compliance requirements"
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-4 mt-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Scope of Work Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">SOW Number</p>
                        <p className="font-medium">{formData.sowNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Project</p>
                        <p className="font-medium">{formData.projectName || 'Not selected'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Vendor</p>
                        <p className="font-medium">{formData.vendorName || 'Not selected'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Category</p>
                        <p className="font-medium">{formData.category || 'Not selected'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">BOQ Reference</p>
                        <p className="font-medium">{formData.boqReference || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="font-medium text-blue-600">AED {formData.totalAmount.toFixed(2)}</p>
                      </div>
                    </div>

                    {formData.scopeTitle && (
                      <div>
                        <p className="text-sm text-gray-600">Scope Title</p>
                        <p className="font-medium">{formData.scopeTitle}</p>
                      </div>
                    )}

                    {boqItems.filter(item => item.description).length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">BOQ Items</p>
                        <div className="space-y-1">
                          {boqItems.filter(item => item.description).map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{item.description}</span>
                              <span className="font-medium">AED {item.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {formData.deliverables.filter(d => d).length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Deliverables</p>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {formData.deliverables.filter(d => d).map((deliverable, index) => (
                            <li key={index}>{deliverable}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorScopeOfWorkPage;