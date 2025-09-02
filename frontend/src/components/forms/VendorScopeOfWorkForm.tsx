import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { formatDate, formatDateForInput, getTodayFormatted } from '@/utils/dateFormatter';
import {
  Building,
  FileText,
  User,
  Calendar,
  Banknote,
  Calculator,
  Package,
  MapPin,
  Phone,
  Mail,
  Hash,
  Layers,
  Tag,
  Clock,
  Plus,
  Trash2,
  Upload,
  Save,
  Send,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BOQItem {
  id: string;
  itemCode: string;
  description: string;
  specification: string;
  unit: string;
  quantity: number;
  unitRate: number;
  totalAmount: number;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface VendorScopeData {
  projectName: string;
  projectId: string;
  vendorName: string;
  vendorId: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  scopeDescription: string;
  workLocation: string;
  startDate: string;
  completionDate: string;
  totalValue: number;
  boqReference: string;
  workCategory: string;
  priorityLevel: 'low' | 'medium' | 'high' | 'urgent';
  specialRequirements: string;
  qualityStandards: string;
  safetyRequirements: string;
}

const VendorScopeOfWorkForm: React.FC = () => {
  const [activeTab, setActiveTab] = useState('basic');
  const [boqItems, setBOQItems] = useState<BOQItem[]>([
    {
      id: '1',
      itemCode: 'ELE-001',
      description: 'Electrical conduit installation',
      specification: '20mm PVC conduit with accessories',
      unit: 'meter',
      quantity: 500,
      unitRate: 8.50,
      totalAmount: 4250,
      category: 'Electrical',
      priority: 'high'
    }
  ]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<VendorScopeData>();

  const addBOQItem = () => {
    const newItem: BOQItem = {
      id: Date.now().toString(),
      itemCode: '',
      description: '',
      specification: '',
      unit: 'piece',
      quantity: 0,
      unitRate: 0,
      totalAmount: 0,
      category: '',
      priority: 'medium'
    };
    setBOQItems([...boqItems, newItem]);
  };

  const removeBOQItem = (id: string) => {
    setBOQItems(boqItems.filter(item => item.id !== id));
  };

  const updateBOQItem = (id: string, field: keyof BOQItem, value: any) => {
    setBOQItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitRate') {
            updatedItem.totalAmount = updatedItem.quantity * updatedItem.unitRate;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const totalProjectValue = boqItems.reduce((sum, item) => sum + item.totalAmount, 0);

  const onSubmit = (data: VendorScopeData) => {
    const scopeData = {
      ...data,
      boqItems,
      totalValue: totalProjectValue,
      submittedAt: new Date().toISOString(),
      status: 'draft'
    };
    console.log('Vendor Scope of Work:', scopeData);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium': return 'bg-[#243d8a]/10 text-[#243d8a]/90 border-[#243d8a]/30';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto p-6 space-y-6"
    >
      {/* Header */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-red-50 to-red-100">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/60 rounded-lg">
                <Building className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-800">
                  Vendor Scope of Work Form
                </CardTitle>
                <p className="text-gray-600 mt-1">BOQ Reference & Project Specifications</p>
              </div>
            </div>
            <Badge className="bg-red-100 text-red-700 border border-red-300">
              <FileText className="w-3 h-3 mr-1" />
              BOQ Referenced
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-white shadow-sm border">
            <TabsTrigger 
              value="basic" 
              className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700"
            >
              <Building className="w-4 h-4 mr-2" />
              Project Info
            </TabsTrigger>
            <TabsTrigger 
              value="vendor" 
              className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700"
            >
              <User className="w-4 h-4 mr-2" />
              Vendor Details
            </TabsTrigger>
            <TabsTrigger 
              value="boq" 
              className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700"
            >
              <Calculator className="w-4 h-4 mr-2" />
              BOQ Items
            </TabsTrigger>
            <TabsTrigger 
              value="requirements" 
              className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Requirements
            </TabsTrigger>
          </TabsList>

          {/* Project Information Tab */}
          <TabsContent value="basic">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-red-600" />
                  Project Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Hash className="w-4 h-4 text-red-500" />
                      Project Name
                    </Label>
                    <Input
                      {...register('projectName', { required: 'Project name is required' })}
                      placeholder="Marina Bay Residential Project"
                      className="focus:border-red-500 focus:ring-red-500"
                    />
                    {errors.projectName && (
                      <p className="text-red-500 text-sm flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.projectName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Hash className="w-4 h-4 text-red-500" />
                      Project ID
                    </Label>
                    <Input
                      {...register('projectId', { required: 'Project ID is required' })}
                      placeholder="PRJ-2024-001"
                      className="focus:border-red-500 focus:ring-red-500"
                    />
                    {errors.projectId && (
                      <p className="text-red-500 text-sm flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.projectId.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-red-500" />
                      Work Location
                    </Label>
                    <Input
                      {...register('workLocation', { required: 'Work location is required' })}
                      placeholder="Marina Bay, Singapore"
                      className="focus:border-red-500 focus:ring-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Tag className="w-4 h-4 text-red-500" />
                      Work Category
                    </Label>
                    <Select onValueChange={(value) => setValue('workCategory', value)}>
                      <SelectTrigger className="focus:border-red-500 focus:ring-red-500">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electrical">Electrical Works</SelectItem>
                        <SelectItem value="plumbing">Plumbing & MEP</SelectItem>
                        <SelectItem value="civil">Civil & Structural</SelectItem>
                        <SelectItem value="finishing">Finishing Works</SelectItem>
                        <SelectItem value="hvac">HVAC Systems</SelectItem>
                        <SelectItem value="fire-safety">Fire Safety Systems</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-red-500" />
                      Start Date
                    </Label>
                    <DateInput
                      placeholder="dd/mm/yyyy"
                      {...register('startDate', { required: 'Start date is required' })}
                      className="focus:border-red-500 focus:ring-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-red-500" />
                      Completion Date
                    </Label>
                    <DateInput
                      placeholder="dd/mm/yyyy"
                      {...register('completionDate', { required: 'Completion date is required' })}
                      className="focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <FileText className="w-4 h-4 text-red-500" />
                    Scope Description
                  </Label>
                  <textarea
                    {...register('scopeDescription', { required: 'Scope description is required' })}
                    rows={4}
                    placeholder="Detailed description of work scope, deliverables, and expectations..."
                    className="w-full p-3 border border-gray-200 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendor Details Tab */}
          <TabsContent value="vendor">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-red-600" />
                  Vendor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Building className="w-4 h-4 text-red-500" />
                      Vendor Name
                    </Label>
                    <Input
                      {...register('vendorName', { required: 'Vendor name is required' })}
                      placeholder="Singapore Electrical Contractors Pte Ltd"
                      className="focus:border-red-500 focus:ring-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Hash className="w-4 h-4 text-red-500" />
                      Vendor ID
                    </Label>
                    <Input
                      {...register('vendorId', { required: 'Vendor ID is required' })}
                      placeholder="VEN-2024-001"
                      className="focus:border-red-500 focus:ring-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <User className="w-4 h-4 text-red-500" />
                      Contact Person
                    </Label>
                    <Input
                      {...register('contactPerson', { required: 'Contact person is required' })}
                      placeholder="John Tan"
                      className="focus:border-red-500 focus:ring-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Phone className="w-4 h-4 text-red-500" />
                      Phone Number
                    </Label>
                    <Input
                      {...register('phone', { required: 'Phone number is required' })}
                      placeholder="+65 9123 4567"
                      className="focus:border-red-500 focus:ring-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Mail className="w-4 h-4 text-red-500" />
                      Email Address
                    </Label>
                    <Input
                      type="email"
                      {...register('email', { 
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address'
                        }
                      })}
                      placeholder="contact@vendor.com"
                      className="focus:border-red-500 focus:ring-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Clock className="w-4 h-4 text-red-500" />
                      Priority Level
                    </Label>
                    <Select onValueChange={(value) => setValue('priorityLevel', value as any)}>
                      <SelectTrigger className="focus:border-red-500 focus:ring-red-500">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-red-500" />
                    Vendor Address
                  </Label>
                  <textarea
                    {...register('address', { required: 'Address is required' })}
                    rows={3}
                    placeholder="Complete vendor address with postal code..."
                    className="w-full p-3 border border-gray-200 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BOQ Items Tab */}
          <TabsContent value="boq">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-red-600" />
                    Bill of Quantities (BOQ) Items
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-red-100 text-red-700 border border-red-300">
                      <Banknote className="w-3 h-3 mr-1" />
                      Total: AED {totalProjectValue.toLocaleString()}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      onClick={addBOQItem}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Rate</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {boqItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Input
                              value={item.itemCode}
                              onChange={(e) => updateBOQItem(item.id, 'itemCode', e.target.value)}
                              className="min-w-[100px] text-sm"
                              placeholder="ELE-001"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              value={item.description}
                              onChange={(e) => updateBOQItem(item.id, 'description', e.target.value)}
                              className="min-w-[200px] text-sm"
                              placeholder="Item description"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={item.unit}
                              onValueChange={(value) => updateBOQItem(item.id, 'unit', value)}
                            >
                              <SelectTrigger className="min-w-[100px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="piece">Piece</SelectItem>
                                <SelectItem value="meter">Meter</SelectItem>
                                <SelectItem value="sqm">Sq.M</SelectItem>
                                <SelectItem value="cum">Cu.M</SelectItem>
                                <SelectItem value="kg">Kg</SelectItem>
                                <SelectItem value="lot">Lot</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateBOQItem(item.id, 'quantity', Number(e.target.value))}
                              className="min-w-[80px] text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.unitRate}
                              onChange={(e) => updateBOQItem(item.id, 'unitRate', Number(e.target.value))}
                              className="min-w-[100px] text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-sm">
                              AED {item.totalAmount.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={getPriorityColor(item.priority)}>
                              {item.priority}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => removeBOQItem(item.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Requirements Tab */}
          <TabsContent value="requirements">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-red-600" />
                  Project Requirements & Standards
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <FileText className="w-4 h-4 text-red-500" />
                    BOQ Reference
                  </Label>
                  <Input
                    {...register('boqReference', { required: 'BOQ reference is required' })}
                    placeholder="BOQ-2024-MB-001"
                    className="focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <Layers className="w-4 h-4 text-red-500" />
                    Special Requirements
                  </Label>
                  <textarea
                    {...register('specialRequirements')}
                    rows={4}
                    placeholder="Any special technical requirements, certifications, or compliance needs..."
                    className="w-full p-3 border border-gray-200 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-red-500" />
                    Quality Standards
                  </Label>
                  <textarea
                    {...register('qualityStandards')}
                    rows={4}
                    placeholder="Quality standards, testing requirements, inspection criteria..."
                    className="w-full p-3 border border-gray-200 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Safety Requirements
                  </Label>
                  <textarea
                    {...register('safetyRequirements')}
                    rows={4}
                    placeholder="Safety protocols, PPE requirements, site safety measures..."
                    className="w-full p-3 border border-gray-200 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                {/* Document Upload */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <Upload className="w-4 h-4 text-red-500" />
                    Supporting Documents
                  </Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-300 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Upload BOQ files, drawings, specifications
                    </p>
                    <Button type="button" variant="outline" size="sm">
                      Select Files
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Submit Actions */}
        <Card className="shadow-lg border-2 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <p className="font-semibold">Total Project Value: <span className="text-red-600">AED {totalProjectValue.toLocaleString()}</span></p>
                <p className="text-xs mt-1">This form will be submitted for procurement approval</p>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline">
                  <Save className="w-4 h-4 mr-1" />
                  Save Draft
                </Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                  <Send className="w-4 h-4 mr-1" />
                  Submit for Approval
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </motion.div>
  );
};

export default VendorScopeOfWorkForm;