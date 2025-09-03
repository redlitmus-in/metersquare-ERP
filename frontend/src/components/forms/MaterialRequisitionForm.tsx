import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { formatDate, formatDateForInput, getTodayFormatted } from '@/utils/dateFormatter';
import {
  Package,
  Factory,
  User,
  Calendar,
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
  CheckCircle,
  Calculator,
  Building,
  MapPin,
  FileText,
  ShoppingCart,
  Truck,
  Settings,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MaterialItem {
  id: string;
  materialCode: string;
  materialName: string;
  specification: string;
  category: string;
  unit: string;
  requestedQuantity: number;
  availableStock: number;
  estimatedCost: number;
  totalCost: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  usage: string;
  supplier: string;
  leadTime: number;
}

interface MaterialRequisitionData {
  requisitionNumber: string;
  projectName: string;
  projectId: string;
  requestedBy: string;
  department: string;
  requestDate: string;
  requiredDate: string;
  purpose: string;
  workLocation: string;
  supervisorName: string;
  factorySection: string;
  productionLine: string;
  workOrderNumber: string;
  urgencyLevel: 'normal' | 'high' | 'urgent' | 'critical';
  justification: string;
  deliveryInstructions: string;
  specialHandling: string;
}

interface MaterialRequisitionFormProps {
  onClose?: () => void;
}

const MaterialRequisitionForm: React.FC<MaterialRequisitionFormProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [materialItems, setMaterialItems] = useState<MaterialItem[]>([
    {
      id: '1',
      materialCode: 'MAT-001',
      materialName: 'Steel Rebar 12mm',
      specification: 'Grade 460B, 12mm diameter, 12m length',
      category: 'Steel & Metal',
      unit: 'piece',
      requestedQuantity: 200,
      availableStock: 150,
      estimatedCost: 25.50,
      totalCost: 5100,
      priority: 'high',
      usage: 'Foundation reinforcement',
      supplier: 'Singapore Steel Suppliers',
      leadTime: 5
    }
  ]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<MaterialRequisitionData>();

  const addMaterialItem = () => {
    const newItem: MaterialItem = {
      id: Date.now().toString(),
      materialCode: '',
      materialName: '',
      specification: '',
      category: '',
      unit: 'piece',
      requestedQuantity: 0,
      availableStock: 0,
      estimatedCost: 0,
      totalCost: 0,
      priority: 'medium',
      usage: '',
      supplier: '',
      leadTime: 0
    };
    setMaterialItems([...materialItems, newItem]);
  };

  const removeMaterialItem = (id: string) => {
    setMaterialItems(materialItems.filter(item => item.id !== id));
  };

  const updateMaterialItem = (id: string, field: keyof MaterialItem, value: any) => {
    setMaterialItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'requestedQuantity' || field === 'estimatedCost') {
            updatedItem.totalCost = updatedItem.requestedQuantity * updatedItem.estimatedCost;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const totalRequisitionValue = materialItems.reduce((sum, item) => sum + item.totalCost, 0);
  const totalItems = materialItems.length;
  const criticalItems = materialItems.filter(item => item.requestedQuantity > item.availableStock).length;

  const onSubmit = (data: MaterialRequisitionData) => {
    const requisitionData = {
      ...data,
      materialItems,
      totalValue: totalRequisitionValue,
      totalItems,
      criticalItems,
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };
    console.log('Material Requisition:', requisitionData);
    
    // Close form after successful submission
    if (onClose) {
      onClose();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium': return 'bg-[#243d8a]/10 text-[#243d8a]/90 border-[#243d8a]/30';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStockStatus = (requested: number, available: number) => {
    if (available >= requested) {
      return { color: 'bg-green-100 text-green-700 border-green-300', label: 'In Stock' };
    } else if (available > 0) {
      return { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', label: 'Partial' };
    } else {
      return { color: 'bg-red-100 text-red-700 border-red-300', label: 'Out of Stock' };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto p-6 space-y-6"
    >
      {/* Header */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-[#243d8a]/5 to-[#243d8a]/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/60 rounded-lg">
                <Factory className="w-8 h-8 text-[#243d8a]" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-800">
                  Material Requisition Form
                </CardTitle>
                <p className="text-gray-600 mt-1">Production & Site Material Request</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-[#243d8a]/10 text-[#243d8a]/90 border border-[#243d8a]/30">
                <Package className="w-3 h-3 mr-1" />
                {totalItems} Items
              </Badge>
              {criticalItems > 0 && (
                <Badge className="bg-red-100 text-red-700 border border-red-300">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {criticalItems} Critical
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-white shadow-sm border">
            <TabsTrigger 
              value="basic" 
              className="data-[state=active]:bg-[#243d8a]/5 data-[state=active]:text-[#243d8a]/90"
            >
              <FileText className="w-4 h-4 mr-2" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger 
              value="project" 
              className="data-[state=active]:bg-[#243d8a]/5 data-[state=active]:text-[#243d8a]/90"
            >
              <Building className="w-4 h-4 mr-2" />
              Project Details
            </TabsTrigger>
            <TabsTrigger 
              value="materials" 
              className="data-[state=active]:bg-[#243d8a]/5 data-[state=active]:text-[#243d8a]/90"
            >
              <Package className="w-4 h-4 mr-2" />
              Materials
            </TabsTrigger>
            <TabsTrigger 
              value="delivery" 
              className="data-[state=active]:bg-[#243d8a]/5 data-[state=active]:text-[#243d8a]/90"
            >
              <Truck className="w-4 h-4 mr-2" />
              Delivery
            </TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-[#243d8a]/5 to-[#243d8a]/10 border-b">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#243d8a]" />
                  Requisition Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Hash className="w-4 h-4 text-[#243d8a]" />
                      Requisition Number
                    </Label>
                    <Input
                      {...register('requisitionNumber', { required: 'Requisition number is required' })}
                      placeholder="MRF-2024-001"
                      className="focus:border-[#243d8a] focus:ring-[#243d8a]"
                    />
                    {errors.requisitionNumber && (
                      <p className="text-red-500 text-sm flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.requisitionNumber.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <User className="w-4 h-4 text-[#243d8a]" />
                      Requested By
                    </Label>
                    <Input
                      {...register('requestedBy', { required: 'Requester name is required' })}
                      placeholder="John Tan - Factory Supervisor"
                      className="focus:border-[#243d8a] focus:ring-[#243d8a]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Building className="w-4 h-4 text-[#243d8a]" />
                      Department
                    </Label>
                    <Select onValueChange={(value) => setValue('department', value)}>
                      <SelectTrigger className="focus:border-[#243d8a] focus:ring-[#243d8a]">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="quality">Quality Control</SelectItem>
                        <SelectItem value="engineering">Engineering</SelectItem>
                        <SelectItem value="site">Site Operations</SelectItem>
                        <SelectItem value="warehouse">Warehouse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <User className="w-4 h-4 text-[#243d8a]" />
                      Supervisor Name
                    </Label>
                    <Input
                      {...register('supervisorName', { required: 'Supervisor name is required' })}
                      placeholder="Michael Lim"
                      className="focus:border-[#243d8a] focus:ring-[#243d8a]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-[#243d8a]" />
                      Request Date
                    </Label>
                    <DateInput
                      placeholder="dd/mm/yyyy"
                      {...register('requestDate', { required: 'Request date is required' })}
                      className="focus:border-[#243d8a] focus:ring-[#243d8a]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-[#243d8a]" />
                      Required Date
                    </Label>
                    <DateInput
                      placeholder="dd/mm/yyyy"
                      {...register('requiredDate', { required: 'Required date is required' })}
                      className="focus:border-[#243d8a] focus:ring-[#243d8a]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Settings className="w-4 h-4 text-[#243d8a]" />
                      Factory Section
                    </Label>
                    <Select onValueChange={(value) => setValue('factorySection', value)}>
                      <SelectTrigger className="focus:border-[#243d8a] focus:ring-[#243d8a]">
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="joinery">Joinery Workshop</SelectItem>
                        <SelectItem value="furniture">Furniture Production</SelectItem>
                        <SelectItem value="assembly">Assembly Line</SelectItem>
                        <SelectItem value="finishing">Finishing Section</SelectItem>
                        <SelectItem value="packaging">Packaging</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Clock className="w-4 h-4 text-[#243d8a]" />
                      Urgency Level
                    </Label>
                    <Select onValueChange={(value) => setValue('urgencyLevel', value as any)}>
                      <SelectTrigger className="focus:border-[#243d8a] focus:ring-[#243d8a]">
                        <SelectValue placeholder="Select urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <FileText className="w-4 h-4 text-[#243d8a]" />
                    Purpose of Requisition
                  </Label>
                  <textarea
                    {...register('purpose', { required: 'Purpose is required' })}
                    rows={3}
                    placeholder="Describe the purpose and intended use of materials..."
                    className="w-full p-3 border border-gray-200 rounded-lg focus:border-[#243d8a] focus:ring-1 focus:ring-[#243d8a]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-[#243d8a]" />
                    Justification
                  </Label>
                  <textarea
                    {...register('justification')}
                    rows={3}
                    placeholder="Business justification for urgent or high-value requisitions..."
                    className="w-full p-3 border border-gray-200 rounded-lg focus:border-[#243d8a] focus:ring-1 focus:ring-[#243d8a]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Project Details Tab */}
          <TabsContent value="project">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-[#243d8a]/5 to-[#243d8a]/10 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-[#243d8a]" />
                  Project Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Building className="w-4 h-4 text-[#243d8a]" />
                      Project Name
                    </Label>
                    <Input
                      {...register('projectName', { required: 'Project name is required' })}
                      placeholder="Marina Bay Residential Project"
                      className="focus:border-[#243d8a] focus:ring-[#243d8a]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Hash className="w-4 h-4 text-[#243d8a]" />
                      Project ID
                    </Label>
                    <Input
                      {...register('projectId', { required: 'Project ID is required' })}
                      placeholder="PRJ-2024-001"
                      className="focus:border-[#243d8a] focus:ring-[#243d8a]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-[#243d8a]" />
                      Work Location
                    </Label>
                    <Input
                      {...register('workLocation', { required: 'Work location is required' })}
                      placeholder="Factory Floor A / Site Location"
                      className="focus:border-[#243d8a] focus:ring-[#243d8a]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Hash className="w-4 h-4 text-[#243d8a]" />
                      Work Order Number
                    </Label>
                    <Input
                      {...register('workOrderNumber')}
                      placeholder="WO-2024-001"
                      className="focus:border-[#243d8a] focus:ring-[#243d8a]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Layers className="w-4 h-4 text-[#243d8a]" />
                      Production Line
                    </Label>
                    <Select onValueChange={(value) => setValue('productionLine', value)}>
                      <SelectTrigger className="focus:border-[#243d8a] focus:ring-[#243d8a]">
                        <SelectValue placeholder="Select production line" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="line-1">Production Line 1</SelectItem>
                        <SelectItem value="line-2">Production Line 2</SelectItem>
                        <SelectItem value="line-3">Production Line 3</SelectItem>
                        <SelectItem value="custom">Custom Workshop</SelectItem>
                        <SelectItem value="assembly">Assembly Area</SelectItem>
                        <SelectItem value="finishing">Finishing Area</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-[#243d8a]/5 to-[#243d8a]/10 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#243d8a]" />
                    Material Items
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-[#243d8a]/10 text-[#243d8a]/90 border border-[#243d8a]/30">
                      <Calculator className="w-3 h-3 mr-1" />
                      Total: AED {totalRequisitionValue.toLocaleString()}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      onClick={addMaterialItem}
                      className="bg-[#243d8a] hover:bg-[#243d8a]/90 text-white"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Material
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material Code</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {materialItems.map((item) => {
                        const stockStatus = getStockStatus(item.requestedQuantity, item.availableStock);
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <Input
                                value={item.materialCode}
                                onChange={(e) => updateMaterialItem(item.id, 'materialCode', e.target.value)}
                                className="min-w-[100px] text-sm"
                                placeholder="MAT-001"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                value={item.materialName}
                                onChange={(e) => updateMaterialItem(item.id, 'materialName', e.target.value)}
                                className="min-w-[150px] text-sm"
                                placeholder="Material name"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Select
                                value={item.category}
                                onValueChange={(value) => updateMaterialItem(item.id, 'category', value)}
                              >
                                <SelectTrigger className="min-w-[120px]">
                                  <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="steel">Steel & Metal</SelectItem>
                                  <SelectItem value="wood">Wood & Timber</SelectItem>
                                  <SelectItem value="concrete">Concrete & Cement</SelectItem>
                                  <SelectItem value="electrical">Electrical</SelectItem>
                                  <SelectItem value="plumbing">Plumbing</SelectItem>
                                  <SelectItem value="hardware">Hardware</SelectItem>
                                  <SelectItem value="tools">Tools & Equipment</SelectItem>
                                  <SelectItem value="consumables">Consumables</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-3">
                              <Select
                                value={item.unit}
                                onValueChange={(value) => updateMaterialItem(item.id, 'unit', value)}
                              >
                                <SelectTrigger className="min-w-[80px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="piece">Piece</SelectItem>
                                  <SelectItem value="meter">Meter</SelectItem>
                                  <SelectItem value="kg">Kg</SelectItem>
                                  <SelectItem value="liter">Liter</SelectItem>
                                  <SelectItem value="sqm">Sq.M</SelectItem>
                                  <SelectItem value="cum">Cu.M</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                value={item.requestedQuantity}
                                onChange={(e) => updateMaterialItem(item.id, 'requestedQuantity', Number(e.target.value))}
                                className="min-w-[80px] text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={item.availableStock}
                                  onChange={(e) => updateMaterialItem(item.id, 'availableStock', Number(e.target.value))}
                                  className="min-w-[70px] text-sm"
                                />
                                <Badge className={`${stockStatus.color} text-xs`}>
                                  {stockStatus.label}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.estimatedCost}
                                  onChange={(e) => updateMaterialItem(item.id, 'estimatedCost', Number(e.target.value))}
                                  className="min-w-[80px] text-sm"
                                />
                                <div className="text-xs font-semibold text-gray-600">
                                  AED {item.totalCost.toLocaleString()}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Select
                                value={item.priority}
                                onValueChange={(value) => updateMaterialItem(item.id, 'priority', value)}
                              >
                                <SelectTrigger className="min-w-[100px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => removeMaterialItem(item.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery Tab */}
          <TabsContent value="delivery">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-[#243d8a]/5 to-[#243d8a]/10 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#243d8a]" />
                  Delivery Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <Truck className="w-4 h-4 text-[#243d8a]" />
                    Delivery Instructions
                  </Label>
                  <textarea
                    {...register('deliveryInstructions')}
                    rows={4}
                    placeholder="Specific delivery instructions, location details, contact person, timing requirements..."
                    className="w-full p-3 border border-gray-200 rounded-lg focus:border-[#243d8a] focus:ring-1 focus:ring-[#243d8a]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-[#243d8a]" />
                    Special Handling Requirements
                  </Label>
                  <textarea
                    {...register('specialHandling')}
                    rows={4}
                    placeholder="Special handling, storage requirements, safety precautions, temperature controls..."
                    className="w-full p-3 border border-gray-200 rounded-lg focus:border-[#243d8a] focus:ring-1 focus:ring-[#243d8a]"
                  />
                </div>

                {/* Document Upload */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <Upload className="w-4 h-4 text-[#243d8a]" />
                    Supporting Documents
                  </Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#243d8a]/30 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Upload drawings, specifications, work orders
                    </p>
                    <Button type="button" variant="outline" size="sm">
                      Select Files
                    </Button>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#243d8a]/5 rounded-lg">
                  <div className="text-center">
                    <div className="font-bold text-lg text-[#243d8a]">{totalItems}</div>
                    <div className="text-sm text-gray-600">Total Items</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-[#243d8a]">{criticalItems}</div>
                    <div className="text-sm text-gray-600">Critical Items</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-[#243d8a]">AED {totalRequisitionValue.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Total Value</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-[#243d8a]">
                      {Math.max(...materialItems.map(item => item.leadTime))}
                    </div>
                    <div className="text-sm text-gray-600">Max Lead Time (days)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Submit Actions */}
        <Card className="shadow-lg border-2 border-[#243d8a]/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <p className="font-semibold">Total Requisition Value: <span className="text-[#243d8a]">AED {totalRequisitionValue.toLocaleString()}</span></p>
                <p className="text-xs mt-1">This requisition will be submitted for quantity & specification approval</p>
              </div>
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={onClose}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button type="button" variant="outline">
                  <Save className="w-4 h-4 mr-1" />
                  Save Draft
                </Button>
                <Button type="submit" className="bg-[#243d8a] hover:bg-[#243d8a]/90 text-white">
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

export default MaterialRequisitionForm;