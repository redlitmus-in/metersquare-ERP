import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import {
  Truck,
  Package,
  User,
  Calendar,
  Hash,
  MapPin,
  Clock,
  Plus,
  Trash2,
  Upload,
  Save,
  Send,
  AlertCircle,
  CheckCircle,
  Building,
  FileText,
  Shield,
  Eye,
  Edit,
  Phone,
  Mail,
  Clipboard,
  Scale,
  Tag,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DeliveryItem {
  id: string;
  materialCode: string;
  materialName: string;
  specification: string;
  orderedQuantity: number;
  deliveredQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  unit: string;
  condition: 'good' | 'damaged' | 'incomplete' | 'defective';
  batchNumber: string;
  expiryDate?: string;
  remarks: string;
  storageLocation: string;
}

interface MaterialDeliveryData {
  deliveryNoteNumber: string;
  purchaseOrderNumber: string;
  supplierName: string;
  supplierContact: string;
  supplierPhone: string;
  deliveryDate: string;
  deliveryTime: string;
  expectedDeliveryDate: string;
  projectName: string;
  projectId: string;
  siteLocation: string;
  receivedBy: string;
  receiverDesignation: string;
  inspectedBy: string;
  approvedBy: string;
  vehicleNumber: string;
  driverName: string;
  driverLicense: string;
  deliveryType: 'full' | 'partial' | 'emergency' | 'back_order';
  urgencyLevel: 'normal' | 'high' | 'urgent' | 'critical';
  specialInstructions: string;
  qualityRemarks: string;
  storageInstructions: string;
  safetyRequirements: string;
}

const MaterialDeliveryNote: React.FC = () => {
  const [activeTab, setActiveTab] = useState('basic');
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([
    {
      id: '1',
      materialCode: 'STL-001',
      materialName: 'Steel Rebar 12mm',
      specification: 'Grade 460B, 12mm diameter',
      orderedQuantity: 100,
      deliveredQuantity: 100,
      acceptedQuantity: 95,
      rejectedQuantity: 5,
      unit: 'piece',
      condition: 'good',
      batchNumber: 'STL2024001',
      storageLocation: 'Warehouse A-1',
      remarks: 'Minor surface rust on 5 pieces'
    }
  ]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<MaterialDeliveryData>();

  const addDeliveryItem = () => {
    const newItem: DeliveryItem = {
      id: Date.now().toString(),
      materialCode: '',
      materialName: '',
      specification: '',
      orderedQuantity: 0,
      deliveredQuantity: 0,
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      unit: 'piece',
      condition: 'good',
      batchNumber: '',
      storageLocation: '',
      remarks: ''
    };
    setDeliveryItems([...deliveryItems, newItem]);
  };

  const removeDeliveryItem = (id: string) => {
    setDeliveryItems(deliveryItems.filter(item => item.id !== id));
  };

  const updateDeliveryItem = (id: string, field: keyof DeliveryItem, value: any) => {
    setDeliveryItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          // Auto-calculate accepted/rejected quantities
          if (field === 'deliveredQuantity' || field === 'acceptedQuantity') {
            if (field === 'deliveredQuantity') {
              updatedItem.acceptedQuantity = value;
              updatedItem.rejectedQuantity = 0;
            } else if (field === 'acceptedQuantity') {
              updatedItem.rejectedQuantity = updatedItem.deliveredQuantity - value;
            }
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const totalItemsDelivered = deliveryItems.reduce((sum, item) => sum + item.deliveredQuantity, 0);
  const totalItemsAccepted = deliveryItems.reduce((sum, item) => sum + item.acceptedQuantity, 0);
  const totalItemsRejected = deliveryItems.reduce((sum, item) => sum + item.rejectedQuantity, 0);

  const onSubmit = (data: MaterialDeliveryData) => {
    const deliveryData = {
      ...data,
      deliveryItems,
      totalItemsDelivered,
      totalItemsAccepted,
      totalItemsRejected,
      deliveryStatus: totalItemsRejected > 0 ? 'partial' : 'complete',
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };
    console.log('Material Delivery Note:', deliveryData);
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'good': return 'bg-green-100 text-green-700 border-green-300';
      case 'damaged': return 'bg-red-100 text-red-700 border-red-300';
      case 'incomplete': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'defective': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getDeliveryTypeColor = (type: string) => {
    switch (type) {
      case 'full': return 'bg-green-100 text-green-700 border-green-300';
      case 'partial': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'emergency': return 'bg-red-100 text-red-700 border-red-300';
      case 'back_order': return 'bg-blue-100 text-blue-700 border-blue-300';
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
      <Card className="shadow-lg border-0 bg-gradient-to-r from-green-50 to-green-100">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/60 rounded-lg">
                <Truck className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-800">
                  Material Delivery Note
                </CardTitle>
                <p className="text-gray-600 mt-1">Site Works & Production Material Delivery</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700 border border-green-300">
                <Package className="w-3 h-3 mr-1" />
                {deliveryItems.length} Items
              </Badge>
              {totalItemsRejected > 0 && (
                <Badge className="bg-red-100 text-red-700 border border-red-300">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {totalItemsRejected} Rejected
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
              className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              Delivery Info
            </TabsTrigger>
            <TabsTrigger 
              value="supplier" 
              className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
            >
              <Building className="w-4 h-4 mr-2" />
              Supplier
            </TabsTrigger>
            <TabsTrigger 
              value="items" 
              className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
            >
              <Package className="w-4 h-4 mr-2" />
              Items
            </TabsTrigger>
            <TabsTrigger 
              value="inspection" 
              className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
            >
              <Shield className="w-4 h-4 mr-2" />
              Inspection
            </TabsTrigger>
          </TabsList>

          {/* Delivery Information Tab */}
          <TabsContent value="basic">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Hash className="w-4 h-4 text-green-500" />
                      Delivery Note Number
                    </Label>
                    <Input
                      {...register('deliveryNoteNumber', { required: 'Delivery note number is required' })}
                      placeholder="DN-2024-001"
                      className="focus:border-green-500 focus:ring-green-500"
                    />
                    {errors.deliveryNoteNumber && (
                      <p className="text-red-500 text-sm flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.deliveryNoteNumber.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Hash className="w-4 h-4 text-green-500" />
                      Purchase Order Number
                    </Label>
                    <Input
                      {...register('purchaseOrderNumber', { required: 'PO number is required' })}
                      placeholder="PO-2024-001"
                      className="focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-green-500" />
                      Delivery Date
                    </Label>
                    <Input
                      type="date"
                      placeholder="dd/mm/yyyy"
                      {...register('deliveryDate', { required: 'Delivery date is required' })}
                      className="focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Clock className="w-4 h-4 text-green-500" />
                      Delivery Time
                    </Label>
                    <Input
                      type="time"
                      {...register('deliveryTime', { required: 'Delivery time is required' })}
                      className="focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-green-500" />
                      Expected Delivery Date
                    </Label>
                    <Input
                      type="date"
                      placeholder="dd/mm/yyyy"
                      {...register('expectedDeliveryDate')}
                      className="focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Tag className="w-4 h-4 text-green-500" />
                      Delivery Type
                    </Label>
                    <Select onValueChange={(value) => setValue('deliveryType', value as any)}>
                      <SelectTrigger className="focus:border-green-500 focus:ring-green-500">
                        <SelectValue placeholder="Select delivery type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full Delivery</SelectItem>
                        <SelectItem value="partial">Partial Delivery</SelectItem>
                        <SelectItem value="emergency">Emergency Delivery</SelectItem>
                        <SelectItem value="back_order">Back Order</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Building className="w-4 h-4 text-green-500" />
                      Project Name
                    </Label>
                    <Input
                      {...register('projectName', { required: 'Project name is required' })}
                      placeholder="Marina Bay Residential"
                      className="focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Hash className="w-4 h-4 text-green-500" />
                      Project ID
                    </Label>
                    <Input
                      {...register('projectId', { required: 'Project ID is required' })}
                      placeholder="PRJ-2024-001"
                      className="focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-green-500" />
                      Site Location
                    </Label>
                    <Input
                      {...register('siteLocation', { required: 'Site location is required' })}
                      placeholder="Block A, Marina Bay Construction Site"
                      className="focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-green-500" />
                      Urgency Level
                    </Label>
                    <Select onValueChange={(value) => setValue('urgencyLevel', value as any)}>
                      <SelectTrigger className="focus:border-green-500 focus:ring-green-500">
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
                    <Clipboard className="w-4 h-4 text-green-500" />
                    Special Instructions
                  </Label>
                  <textarea
                    {...register('specialInstructions')}
                    rows={3}
                    placeholder="Special delivery instructions, safety requirements, handling notes..."
                    className="w-full p-3 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Supplier Information Tab */}
          <TabsContent value="supplier">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-green-600" />
                  Supplier & Transport Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Building className="w-4 h-4 text-green-500" />
                      Supplier Name
                    </Label>
                    <Input
                      {...register('supplierName', { required: 'Supplier name is required' })}
                      placeholder="Singapore Steel Suppliers Pte Ltd"
                      className="focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <User className="w-4 h-4 text-green-500" />
                      Contact Person
                    </Label>
                    <Input
                      {...register('supplierContact', { required: 'Contact person is required' })}
                      placeholder="John Tan"
                      className="focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Phone className="w-4 h-4 text-green-500" />
                      Supplier Phone
                    </Label>
                    <Input
                      {...register('supplierPhone', { required: 'Supplier phone is required' })}
                      placeholder="+65 9123 4567"
                      className="focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Truck className="w-4 h-4 text-green-500" />
                      Vehicle Number
                    </Label>
                    <Input
                      {...register('vehicleNumber', { required: 'Vehicle number is required' })}
                      placeholder="SG1234A"
                      className="focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <User className="w-4 h-4 text-green-500" />
                      Driver Name
                    </Label>
                    <Input
                      {...register('driverName', { required: 'Driver name is required' })}
                      placeholder="Ahmad bin Hassan"
                      className="focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Shield className="w-4 h-4 text-green-500" />
                      Driver License Number
                    </Label>
                    <Input
                      {...register('driverLicense', { required: 'Driver license is required' })}
                      placeholder="S1234567A"
                      className="focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery Items Tab */}
          <TabsContent value="items">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-green-600" />
                    Delivery Items
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2 text-xs">
                      <Badge className="bg-blue-100 text-blue-700 border border-blue-300">
                        Delivered: {totalItemsDelivered}
                      </Badge>
                      <Badge className="bg-green-100 text-green-700 border border-green-300">
                        Accepted: {totalItemsAccepted}
                      </Badge>
                      <Badge className="bg-red-100 text-red-700 border border-red-300">
                        Rejected: {totalItemsRejected}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={addDeliveryItem}
                      className="bg-green-600 hover:bg-green-700 text-white"
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
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specification</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordered</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivered</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accepted</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rejected</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Storage</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {deliveryItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3">
                            <div className="space-y-1">
                              <Input
                                value={item.materialCode}
                                onChange={(e) => updateDeliveryItem(item.id, 'materialCode', e.target.value)}
                                className="min-w-[80px] text-xs"
                                placeholder="Code"
                              />
                              <Input
                                value={item.materialName}
                                onChange={(e) => updateDeliveryItem(item.id, 'materialName', e.target.value)}
                                className="min-w-[120px] text-xs"
                                placeholder="Material name"
                              />
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              value={item.specification}
                              onChange={(e) => updateDeliveryItem(item.id, 'specification', e.target.value)}
                              className="min-w-[150px] text-xs"
                              placeholder="Specification"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <Select
                              value={item.unit}
                              onValueChange={(value) => updateDeliveryItem(item.id, 'unit', value)}
                            >
                              <SelectTrigger className="min-w-[70px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="piece">Pcs</SelectItem>
                                <SelectItem value="meter">M</SelectItem>
                                <SelectItem value="kg">Kg</SelectItem>
                                <SelectItem value="liter">L</SelectItem>
                                <SelectItem value="sqm">SqM</SelectItem>
                                <SelectItem value="cum">CuM</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              type="number"
                              value={item.orderedQuantity}
                              onChange={(e) => updateDeliveryItem(item.id, 'orderedQuantity', Number(e.target.value))}
                              className="min-w-[60px] text-xs"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              type="number"
                              value={item.deliveredQuantity}
                              onChange={(e) => updateDeliveryItem(item.id, 'deliveredQuantity', Number(e.target.value))}
                              className="min-w-[60px] text-xs"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              type="number"
                              value={item.acceptedQuantity}
                              onChange={(e) => updateDeliveryItem(item.id, 'acceptedQuantity', Number(e.target.value))}
                              className="min-w-[60px] text-xs"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              type="number"
                              value={item.rejectedQuantity}
                              readOnly
                              className="min-w-[60px] text-xs bg-gray-50"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <Select
                              value={item.condition}
                              onValueChange={(value) => updateDeliveryItem(item.id, 'condition', value)}
                            >
                              <SelectTrigger className="min-w-[90px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="good">Good</SelectItem>
                                <SelectItem value="damaged">Damaged</SelectItem>
                                <SelectItem value="incomplete">Incomplete</SelectItem>
                                <SelectItem value="defective">Defective</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              value={item.batchNumber}
                              onChange={(e) => updateDeliveryItem(item.id, 'batchNumber', e.target.value)}
                              className="min-w-[80px] text-xs"
                              placeholder="Batch No."
                            />
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              value={item.storageLocation}
                              onChange={(e) => updateDeliveryItem(item.id, 'storageLocation', e.target.value)}
                              className="min-w-[80px] text-xs"
                              placeholder="Location"
                            />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => removeDeliveryItem(item.id)}
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

          {/* Inspection & Approval Tab */}
          <TabsContent value="inspection">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  Inspection & Approval
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <User className="w-4 h-4 text-green-500" />
                      Received By
                    </Label>
                    <Input
                      {...register('receivedBy', { required: 'Receiver name is required' })}
                      placeholder="Site Supervisor / Store In Charge"
                      className="focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Tag className="w-4 h-4 text-green-500" />
                      Receiver Designation
                    </Label>
                    <Input
                      {...register('receiverDesignation', { required: 'Designation is required' })}
                      placeholder="Site Supervisor"
                      className="focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Eye className="w-4 h-4 text-green-500" />
                      Inspected By
                    </Label>
                    <Input
                      {...register('inspectedBy', { required: 'Inspector name is required' })}
                      placeholder="Quality Control Inspector"
                      className="focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Approved By
                    </Label>
                    <Input
                      {...register('approvedBy', { required: 'Approver name is required' })}
                      placeholder="Project Manager"
                      className="focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <Shield className="w-4 h-4 text-green-500" />
                    Quality Inspection Remarks
                  </Label>
                  <textarea
                    {...register('qualityRemarks')}
                    rows={4}
                    placeholder="Quality inspection findings, defects noted, compliance status..."
                    className="w-full p-3 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <Scale className="w-4 h-4 text-green-500" />
                    Storage Instructions
                  </Label>
                  <textarea
                    {...register('storageInstructions')}
                    rows={3}
                    placeholder="Storage location, handling requirements, environmental conditions..."
                    className="w-full p-3 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-green-500" />
                    Safety Requirements
                  </Label>
                  <textarea
                    {...register('safetyRequirements')}
                    rows={3}
                    placeholder="Safety protocols during unloading, handling precautions, PPE requirements..."
                    className="w-full p-3 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />
                </div>

                {/* Document Upload */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <Upload className="w-4 h-4 text-green-500" />
                    Supporting Documents
                  </Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-300 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Upload photos, inspection reports, certificates
                    </p>
                    <Button type="button" variant="outline" size="sm">
                      Select Files
                    </Button>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-green-50 rounded-lg">
                  <div className="text-center">
                    <div className="font-bold text-lg text-green-600">{totalItemsDelivered}</div>
                    <div className="text-sm text-gray-600">Items Delivered</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-green-600">{totalItemsAccepted}</div>
                    <div className="text-sm text-gray-600">Items Accepted</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-red-600">{totalItemsRejected}</div>
                    <div className="text-sm text-gray-600">Items Rejected</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-blue-600">
                      {totalItemsRejected === 0 ? '100%' : `${Math.round((totalItemsAccepted / totalItemsDelivered) * 100)}%`}
                    </div>
                    <div className="text-sm text-gray-600">Acceptance Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Submit Actions */}
        <Card className="shadow-lg border-2 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <p className="font-semibold">
                  Delivery Status: 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    totalItemsRejected === 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {totalItemsRejected === 0 ? 'Complete' : 'Partial'}
                  </span>
                </p>
                <p className="text-xs mt-1">
                  This delivery note requires QTY/SPEC/REQ FLAG approval for {totalItemsRejected > 0 ? 'partial' : 'full'} acceptance
                </p>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline">
                  <Save className="w-4 h-4 mr-1" />
                  Save Draft
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
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

export default MaterialDeliveryNote;