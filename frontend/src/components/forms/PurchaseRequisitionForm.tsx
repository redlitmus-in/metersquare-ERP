import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { formatDate, formatDateForInput, getTodayFormatted } from '@/utils/dateFormatter';
import {
  Package,
  User,
  Calendar,
  Banknote,
  FileText,
  Upload,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Building,
  Hash,
  Phone,
  Mail,
  MapPin,
  Paperclip,
  ChevronRight,
  Save,
  Send,
  X,
  Calculator,
  Layers,
  Tag,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Material {
  id: string;
  description: string;
  specification: string;
  unit: string;
  quantity: number;
  estimatedCost: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  referenceDesign?: string;
}

interface PurchaseRequisitionFormData {
  requisitionNumber: string;
  projectId: string;
  projectName: string;
  siteLocation: string;
  requestedBy: string;
  department: string;
  dateRequired: string;
  materials: Material[];
  justification: string;
  attachments: File[];
  designReferences: string[];
  approvalFlags: {
    qtySpec: boolean;
    cost: boolean;
  };
  totalEstimatedCost: number;
  status: 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'revision_required';
}

const PurchaseRequisitionForm: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState('details');
  const [showPreview, setShowPreview] = useState(false);

  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm<PurchaseRequisitionFormData>();

  const addMaterial = () => {
    const newMaterial: Material = {
      id: Date.now().toString(),
      description: '',
      specification: '',
      unit: 'pcs',
      quantity: 1,
      estimatedCost: 0,
      priority: 'medium',
      category: '',
      referenceDesign: ''
    };
    setMaterials([...materials, newMaterial]);
  };

  const removeMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const updateMaterial = (id: string, field: keyof Material, value: any) => {
    setMaterials(materials.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const calculateTotal = () => {
    return materials.reduce((sum, m) => sum + (m.quantity * m.estimatedCost), 0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const onSubmit = (data: PurchaseRequisitionFormData) => {
    console.log('Submitting Purchase Requisition:', { ...data, materials, attachments });
    
    try {
      // Initialize workflow according to PDF requirements
      const { initializeWorkflow } = require('@/utils/workflowIntegration');
      const workflow = initializeWorkflow(
        'purchase_requisition',
        `PR-${Date.now()}`, 
        { ...data, materials, attachments }
      );
      
      console.log('Workflow initialized:', workflow);
      alert(`Purchase Requisition submitted successfully!\nWorkflow ID: ${workflow.workflowId}\nNext Step: ${workflow.currentStep}\n\n(Backend integration required for full functionality)`);
    } catch (error) {
      console.error('Workflow initialization error:', error);
      alert('Purchase Requisition submitted! (Workflow integration pending)');
    }
  };

  const priorityColors = {
    low: 'bg-slate-100 text-slate-700 border-slate-300',
    medium: 'bg-red-100 text-red-700 border-red-300',
    high: 'bg-amber-100 text-amber-700 border-amber-300',
    urgent: 'bg-red-100 text-red-700 border-red-300'
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
              <Package className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Purchase Requisition Form</h1>
              <p className="text-gray-600 mt-1">Create and submit material purchase requests</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <Badge className="bg-red-100 text-red-700 border-red-300 px-3 py-1">
              <Hash className="w-3 h-3 mr-1" />
              PR-2024-001
            </Badge>
            <Badge className="bg-green-100 text-green-700 border-green-300 px-3 py-1">
              <Clock className="w-3 h-3 mr-1" />
              Draft
            </Badge>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-white shadow-sm border">
            <TabsTrigger value="details" className="data-[state=active]:bg-red-50">
              <FileText className="w-4 h-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="materials" className="data-[state=active]:bg-red-50">
              <Package className="w-4 h-4 mr-2" />
              Materials
            </TabsTrigger>
            <TabsTrigger value="approvals" className="data-[state=active]:bg-red-50">
              <Check className="w-4 h-4 mr-2" />
              Approvals
            </TabsTrigger>
            <TabsTrigger value="attachments" className="data-[state=active]:bg-red-50">
              <Paperclip className="w-4 h-4 mr-2" />
              Attachments
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-red-600" />
                  Project & Requester Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Building className="w-4 h-4 text-gray-500" />
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
                      <MapPin className="w-4 h-4 text-gray-500" />
                      Site Location
                    </Label>
                    <Input 
                      {...register('siteLocation', { required: true })}
                      placeholder="Enter site location"
                      className="h-11 border-gray-200 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <User className="w-4 h-4 text-gray-500" />
                      Requested By
                    </Label>
                    <Select>
                      <SelectTrigger className="h-11 border-gray-200 focus:border-red-500">
                        <SelectValue placeholder="Select requester" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supervisor1">John Tan - Site Supervisor</SelectItem>
                        <SelectItem value="supervisor2">Sarah Lim - MEP Supervisor</SelectItem>
                        <SelectItem value="procurement">David Lee - Procurement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      Date Required
                    </Label>
                    <DateInput 
                      {...register('dateRequired', { required: true })}
                      className="h-11 border-gray-200 focus:border-red-500"
                      placeholder="dd/mm/yyyy"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="w-4 h-4 text-gray-500" />
                    Justification / Purpose
                  </Label>
                  <textarea 
                    {...register('justification')}
                    className="w-full min-h-[100px] p-3 border border-gray-200 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    placeholder="Explain the purpose and urgency of this requisition..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-red-600" />
                    Material Requirements
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-red-100 text-red-700 border border-red-300">
                      {materials.length} Items
                    </Badge>
                    <Badge className="bg-green-100 text-green-700 border border-green-300">
                      <Banknote className="w-3 h-3 mr-1" />
                      Total: AED {calculateTotal().toLocaleString()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <AnimatePresence>
                    {materials.map((material, index) => (
                      <motion.div
                        key={material.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 font-semibold text-sm">
                              {index + 1}
                            </div>
                            <Badge className={`${priorityColors[material.priority]} border`}>
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {material.priority}
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMaterial(material.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2 space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">Description</Label>
                            <Input
                              value={material.description}
                              onChange={(e) => updateMaterial(material.id, 'description', e.target.value)}
                              placeholder="Material description"
                              className="border-gray-200"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">Category</Label>
                            <Select
                              value={material.category}
                              onValueChange={(value) => updateMaterial(material.id, 'category', value)}
                            >
                              <SelectTrigger className="border-gray-200">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hardware">Hardware</SelectItem>
                                <SelectItem value="electrical">Electrical</SelectItem>
                                <SelectItem value="plumbing">Plumbing</SelectItem>
                                <SelectItem value="furniture">Furniture</SelectItem>
                                <SelectItem value="finishes">Finishes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">Specification</Label>
                            <Input
                              value={material.specification}
                              onChange={(e) => updateMaterial(material.id, 'specification', e.target.value)}
                              placeholder="Specs/Model"
                              className="border-gray-200"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">Unit</Label>
                            <Select
                              value={material.unit}
                              onValueChange={(value) => updateMaterial(material.id, 'unit', value)}
                            >
                              <SelectTrigger className="border-gray-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pcs">Pieces</SelectItem>
                                <SelectItem value="kg">Kilogram</SelectItem>
                                <SelectItem value="m">Meter</SelectItem>
                                <SelectItem value="sqm">Sq. Meter</SelectItem>
                                <SelectItem value="box">Box</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">Quantity</Label>
                            <Input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => updateMaterial(material.id, 'quantity', parseFloat(e.target.value))}
                              className="border-gray-200"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">Est. Unit Cost</Label>
                            <div className="relative">
                              <Banknote className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <Input
                                type="number"
                                value={material.estimatedCost}
                                onChange={(e) => updateMaterial(material.id, 'estimatedCost', parseFloat(e.target.value))}
                                className="pl-9 border-gray-200"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">Design Reference</Label>
                            <Input
                              value={material.referenceDesign}
                              onChange={(e) => updateMaterial(material.id, 'referenceDesign', e.target.value)}
                              placeholder="Drawing/Design reference"
                              className="border-gray-200"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">Priority</Label>
                            <Select
                              value={material.priority}
                              onValueChange={(value) => updateMaterial(material.id, 'priority', value as Material['priority'])}
                            >
                              <SelectTrigger className="border-gray-200">
                                <SelectValue />
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

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Subtotal:</span>
                            <span className="font-semibold text-lg text-red-600">
                              AED {(material.quantity * material.estimatedCost).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <Button
                    type="button"
                    onClick={addMaterial}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Material Item
                  </Button>

                  {materials.length > 0 && (
                    <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calculator className="w-6 h-6 text-red-600" />
                          <span className="text-lg font-semibold text-gray-800">Total Estimated Cost:</span>
                        </div>
                        <span className="text-2xl font-bold text-red-600">
                          AED {calculateTotal().toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-red-600" />
                  Approval Workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Approval Flags */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Layers className="w-5 h-5 text-amber-600" />
                          <span className="font-semibold text-gray-800">Quantity & Specification</span>
                        </div>
                        <Badge className="bg-amber-100 text-amber-700 border border-amber-300">
                          Pending
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Requires approval from Estimation Department
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-gray-500">Awaiting submission</span>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Banknote className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-gray-800">Cost Approval</span>
                        </div>
                        <Badge className="bg-green-100 text-green-700 border border-green-300">
                          Pending
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Requires approval from Project Manager
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-gray-500">Awaiting submission</span>
                      </div>
                    </div>
                  </div>

                  {/* Approval Chain */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-gray-600" />
                      Approval Chain
                    </h3>
                    <div className="space-y-3">
                      {[
                        { role: 'Site Supervisor', name: 'John Tan', status: 'current', icon: User },
                        { role: 'Procurement', name: 'Pending', status: 'pending', icon: Package },
                        { role: 'Estimation', name: 'Pending', status: 'pending', icon: Calculator },
                        { role: 'Project Manager', name: 'Pending', status: 'pending', icon: Building },
                        { role: 'Technical Director', name: 'Pending', status: 'pending', icon: Check }
                      ].map((approver, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            approver.status === 'current' ? 'bg-red-100 text-red-600' :
                            approver.status === 'approved' ? 'bg-green-100 text-green-600' :
                            'bg-gray-100 text-gray-400'
                          }`}>
                            <approver.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm text-gray-800">{approver.role}</p>
                                <p className="text-xs text-gray-500">{approver.name}</p>
                              </div>
                              {approver.status === 'current' && (
                                <Badge className="bg-red-100 text-red-700 text-xs">
                                  Current Step
                                </Badge>
                              )}
                            </div>
                          </div>
                          {index < 4 && (
                            <ChevronRight className="w-4 h-4 text-gray-300" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attachments Tab */}
          <TabsContent value="attachments">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-red-600" />
                  Documents & References
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-red-400 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Drop files here or click to upload</p>
                    <p className="text-xs text-gray-500 mb-4">
                      Supported formats: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG (Max 10MB)
                    </p>
                    <Input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <Label htmlFor="file-upload">
                      <Button type="button" variant="outline" className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Select Files
                      </Button>
                    </Label>
                  </div>

                  {/* Attached Files */}
                  {attachments.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-800">Attached Files ({attachments.length})</h3>
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-red-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-800">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Design References */}
                  <div className="bg-[#243d8a]/5 rounded-xl p-4 border border-[#243d8a]/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-gray-800">Design References</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Link this requisition to design drawings or specifications
                    </p>
                    <Input
                      placeholder="Enter drawing number or reference ID"
                      className="bg-white border-gray-200"
                    />
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
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Preview
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
              Submit for Approval
            </Button>
          </div>
        </motion.div>
      </form>
    </div>
  );
};

export default PurchaseRequisitionForm;