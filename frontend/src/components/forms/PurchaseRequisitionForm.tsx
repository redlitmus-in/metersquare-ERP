import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { formatDate, formatDateForInput, getTodayFormatted } from '@/utils/dateFormatter';
import { apiClient } from '@/api/config';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
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
  cost: number;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  category: string;
  design_reference?: string;
}

interface PurchaseRequisitionFormData {
  project_id: number;
  site_location: string;
  requested_by: string;
  date: string;
  purpose: string;
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

interface PurchaseRequisitionFormProps {
  onClose?: () => void;
  showAsPage?: boolean;
  existingData?: any;
  isEditMode?: boolean;
  editMode?: boolean;
  purchaseData?: any;
}

const PurchaseRequisitionForm: React.FC<PurchaseRequisitionFormProps> = ({ onClose, showAsPage, existingData, isEditMode, editMode, purchaseData }) => {
  // Initialize useForm first to get setValue
  const { register, handleSubmit, watch, formState: { errors }, setValue, getValues } = useForm<PurchaseRequisitionFormData>();
  
  // Get current user from auth store
  const { user } = useAuthStore();
  const currentUserName = user?.full_name || user?.name || 'Site Supervisor';
  const currentUserRole = user?.role || 'Site Supervisor';
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState('details');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [detailsCompleted, setDetailsCompleted] = useState(false);
  const [materialsCompleted, setMaterialsCompleted] = useState(false);
  const [designReference, setDesignReference] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);


  // Initialize form with existing data in edit mode
  useEffect(() => {
    try {
      // Always set requested_by to current user
      setValue('requested_by', currentUserName);
      
      // Check for both isEditMode and editMode props
      const isEditing = isEditMode || editMode;
      const dataToEdit = purchaseData || existingData;
    
    // Initialize date to today if not in edit mode and no existing data
    if (!isEditing && !dataToEdit) {
      setValue('date', getTodayFormatted());
    }
    
    
    if (isEditing && dataToEdit) {
      // Set project ID - handle both direct data and originalData from dashboard
      const purchaseDataToUse = dataToEdit.originalData || dataToEdit;
      
      // Make sure purchaseDataToUse exists before accessing properties
      if (!purchaseDataToUse) {
        toast.error('No data available for editing');
        return;
      }
      
      // Set project ID
      const projectId = purchaseDataToUse.project_id || dataToEdit.project_id;
      if (projectId) {
        setSelectedProjectId(projectId);
        setValue('project_id', projectId);
      }
      
      // Set all form values based on the actual register names
      // Site location
      setValue('site_location', purchaseDataToUse.site_location || '');
      
      // Requested by - always use current user in edit mode too
      setValue('requested_by', currentUserName);
      
      // Date
      const dateValue = purchaseDataToUse.date || dataToEdit.date;
      if (dateValue) {
        setValue('date', formatDateForInput(dateValue));
      } else {
        setValue('date', getTodayFormatted());
      }
      
      // Purpose/Justification
      setValue('purpose', purchaseDataToUse.purpose || '');
      
      // Additional fields if they exist in your form
      setValue('justification', purchaseDataToUse.justification || purchaseDataToUse.purpose || '');
      
      // Load materials if available
      const materialsData = purchaseDataToUse.materials || dataToEdit.materials || [];
      
      // Set design references if available
      // Check for design_reference at purchase level or from first material
      if (purchaseDataToUse.design_reference) {
        setDesignReference(purchaseDataToUse.design_reference);
        setValue('designReferences', [purchaseDataToUse.design_reference]);
      } else if (purchaseDataToUse.design_references) {
        setDesignReference(purchaseDataToUse.design_references.join(', '));
        setValue('designReferences', purchaseDataToUse.design_references);
      } else if (materialsData && materialsData.length > 0 && materialsData[0].design_reference) {
        // If no purchase-level design reference, get from first material
        setDesignReference(materialsData[0].design_reference);
      }
      if (materialsData.length > 0) {
        const formattedMaterials = materialsData.map((m: any, index: number) => ({
          id: `material_${m.material_id || index}_${Date.now()}`,
          material_id: m.material_id, // Preserve original material_id for updates
          description: m.description || m.item_name || '',
          specification: m.specification || '',
          unit: m.unit || 'pcs',
          quantity: m.quantity || 1,
          cost: m.cost || 0,
          priority: m.priority || 'Medium',
          category: m.category || 'General',
          design_reference: m.design_reference || ''
        }));
        
        setMaterials(formattedMaterials);
        
        // Calculate and set total cost
        const total = formattedMaterials.reduce((sum, m) => sum + (m.quantity * m.cost), 0);
        setValue('totalEstimatedCost', total);
      } else if (existingData && existingData.items && existingData.items > 0 && existingData.id) {
        // Fallback: fetch materials from API if not included
        fetchExistingMaterials(existingData.id).catch(err => {
          // Silently handle error - materials fetch is optional
        });
      }
      
      // Set approval flags if they exist
      if (purchaseDataToUse && purchaseDataToUse.approvals) {
        setValue('approvalFlags', {
          qtySpec: purchaseDataToUse.approvals.qtySpec || false,
          cost: purchaseDataToUse.approvals.cost || false
        });
      }
      
      // Set status
      if (purchaseDataToUse) {
        setValue('status', purchaseDataToUse.status || 'draft');
      }
      
      // Mark tabs as completed if we have data
      if (purchaseDataToUse && purchaseDataToUse.site_location && purchaseDataToUse.requested_by) {
        setDetailsCompleted(true);
      }
      if (materialsData && materialsData.length > 0) {
        setMaterialsCompleted(true);
      }
    } // This closes the if (isEditing && dataToEdit) block
    
    } catch (error) {
      toast.error('Failed to load form data. Please try again.');
    }
  }, [isEditMode, editMode, existingData, purchaseData, setValue, currentUserName]);

  // Fetch existing materials from API
  const fetchExistingMaterials = async (purchaseId: string) => {
    try {
      const response = await apiClient.get(`/purchase/${purchaseId}`);
      if (response.data.success) {
        const purchaseData = response.data.purchase;
        const materialsData = purchaseData.materials || [];
        
        if (materialsData.length > 0) {
          setMaterials(materialsData.map((m: any) => ({
            id: Date.now().toString() + Math.random(),
            description: m.description || m.item_name || '',
            specification: m.specification || '',
            unit: m.unit || 'pcs',
            quantity: m.quantity || 1,
            cost: m.cost || 0,
            priority: m.priority || 'Medium',
            category: m.category || 'General',
            design_reference: m.design_reference || ''
          })));
        }
      }
    } catch (error) {
      toast.error('Failed to load materials');
    }
  };

  const addMaterial = () => {
    const newMaterial: Material = {
      id: Date.now().toString(),
      description: '',
      specification: '',
      unit: 'pcs',
      quantity: 1,
      cost: 0,
      priority: 'Medium',
      category: '',
      design_reference: ''
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
    return materials.reduce((sum, m) => sum + (m.quantity * m.cost), 0);
  };

  const validateDetailsTab = () => {
    const values = getValues();
    const currentDate = watch('date');
    return selectedProjectId && values.site_location && values.requested_by && (values.date || currentDate) && values.purpose;
  };


  const validateMaterialsTab = () => {
    return materials.length > 0 && materials.every(m => 
      m.description && m.specification && m.quantity > 0 && m.category
    );
  };

  const handleTabChange = (value: string) => {
    if (value === 'materials' && !validateDetailsTab()) {
      toast.error('Please fill all required fields in Details tab first');
      return;
    }
    if (value === 'attachments' && !validateMaterialsTab()) {
      toast.error('Please add at least one material with complete information');
      return;
    }
    setActiveTab(value);
  };

  const formatDateForBackend = (dateStr: string) => {
    try {
      if (!dateStr) {
        // Return today's date if no date provided
        const today = new Date();
        return today.toISOString().split('T')[0];
      }
      
      // Check if already in YYYY-MM-DD format
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }
      
      // Convert from DD/MM/YYYY to YYYY-MM-DD
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // If it's an ISO string, extract just the date part
      if (dateStr.includes('T')) {
        return dateStr.split('T')[0];
      }
      
      return dateStr;
    } catch (error) {
      // Return today's date as fallback
      const today = new Date();
      return today.toISOString().split('T')[0];
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter(file => {
        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
          return false;
        }
        // Check file type
        const validTypes = ['application/pdf', 'application/msword', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel', 
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
          toast.error(`File ${file.name} has invalid format. Supported formats: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG`);
          return false;
        }
        return true;
      });
      setAttachments([...attachments, ...validFiles]);
      // Reset the input
      e.target.value = '';
    }
  };

  const onSubmit = async (data: PurchaseRequisitionFormData) => {
    if (!selectedProjectId) {
      toast.error('Please select a project');
      setIsUploading(false);
      return;
    }

    if (!validateMaterialsTab()) {
      toast.error('Please complete all material information');
      setIsUploading(false);
      return;
    }

    setIsUploading(true);

    // Get values directly from form state for reliability
    const formValues = getValues();
    const dateValue = watch('date') || formValues.date || getTodayFormatted();
    const siteLocation = watch('site_location') || formValues.site_location || '';
    const purposeValue = watch('purpose') || formValues.purpose || '';

    const payload = {
      project_id: selectedProjectId,
      site_location: siteLocation,
      requested_by: currentUserName, // Use current logged-in user or default
      date: formatDateForBackend(dateValue),
      purpose: purposeValue,
      design_reference: designReference || '', // Add at purchase level
      materials: materials.map(m => ({
        description: m.description,
        specification: m.specification,
        unit: m.unit,
        quantity: m.quantity,
        category: m.category,
        cost: m.cost,
        priority: m.priority,
        design_reference: designReference || m.design_reference || ''
      }))
    };

    console.log('Submitting payload:', payload);

    try {
      let response;
      let purchaseId;
      
      // Check for edit mode and use purchase_id correctly
      const dataForEdit = purchaseData || existingData;
      const purchaseIdToUpdate = dataForEdit?.purchase_id || dataForEdit?.id;
      if ((isEditMode || editMode) && purchaseIdToUpdate) {
        // Update existing purchase requisition
        // Construct update payload matching backend expectations
        const updatePayload = {
          requested_by: currentUserName, // Use current logged-in user or default
          site_location: siteLocation,
          date: formatDateForBackend(dateValue),
          project_id: selectedProjectId,
          purpose: purposeValue,
          file_path: dataForEdit?.originalData?.file_path || dataForEdit?.file_path || '', // Preserve existing file path
          materials: materials.map((m) => {
            // Build material object matching backend structure
            const materialData: any = {
              project_id: selectedProjectId,
              description: m.description,
              specification: m.specification,
              unit: m.unit,
              quantity: m.quantity,
              category: m.category,
              cost: m.cost,
              priority: m.priority,
              design_reference: m.design_reference || designReference || ''
            };
            
            // Only include material_id if it exists (for updating existing materials)
            if (m.material_id) {
              materialData.material_id = m.material_id;
            }
            
            return materialData;
          })
        };
        
        response = await apiClient.put(`/purchase/${purchaseIdToUpdate}`, updatePayload);
        purchaseId = purchaseIdToUpdate;
      } else {
        // Create new purchase requisition  
        response = await apiClient.post('/purchase', payload);
        purchaseId = response.data.purchase_id;
      }
      
      // Check if the response was successful
      if (!response.data.success && response.data.error) {
        toast.error(response.data.error || 'Failed to save purchase request');
        setIsUploading(false);
        return;
      }
      
      // Step 2: Upload files if any attachments exist (for both new and updated purchases)
      if (attachments.length > 0 && purchaseId) {
        // Upload each file
        for (const file of attachments) {
          const formData = new FormData();
          formData.append('file', file);
          
          try {
            const uploadResponse = await apiClient.post(
              `/upload_file?key=siteSupervisor&id=${purchaseId}`,
              formData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data',
                }
              }
            );
          } catch (uploadError: any) {
            toast.warning(`File ${file.name} could not be uploaded. Purchase requisition was ${isEditMode ? 'updated' : 'created'} successfully.`);
          }
        }
      }
      
      toast.success(isEditMode ? 'Purchase Requisition updated successfully!' : 'Purchase Requisition submitted successfully!');
      
      if (!isEditMode) {
        // Reset form only for new submissions
        setMaterials([]);
        setAttachments([]);
        setSelectedProjectId(null);
        setDesignReference('');
        setActiveTab('details');
        setValue('site_location', '');
        setValue('purpose', '');
        setValue('date', '');
        // Don't reset requested_by as it's always current user
      }
      setDetailsCompleted(false);
      setMaterialsCompleted(false);
      
      // Close form if callback provided
      if (onClose) {
        onClose();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          `Failed to ${isEditMode ? 'update' : 'submit'} purchase requisition`;
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const priorityColors = {
    Low: 'bg-slate-100 text-slate-700 border-slate-300',
    Medium: 'bg-red-100 text-red-700 border-red-300',
    High: 'bg-amber-100 text-amber-700 border-amber-300',
    Urgent: 'bg-red-100 text-red-700 border-red-300'
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {isEditMode ? 'Edit Purchase Request' : 'New Purchase Request'}
              </h1>
              <p className="text-sm text-gray-500">{isEditMode ? 'Update request details' : 'Create and submit material purchase requests'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">
              <Hash className="w-3 h-3 mr-1" />
              PR-2024-001
            </Badge>
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
              <Clock className="w-3 h-3 mr-1" />
              Draft
            </Badge>
            {onClose && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <div className="flex space-x-8">
            <button
              type="button"
              onClick={() => handleTabChange('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-4 h-4 mr-2 inline" />
              Details
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('materials')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'materials'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="w-4 h-4 mr-2 inline" />
              Materials
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('attachments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'attachments'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Paperclip className="w-4 h-4 mr-2 inline" />
              Attachments
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Building className="w-5 h-5 text-red-600" />
                    Project & Requester Information
                  </h3>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Project Name
                    </Label>
                    <Select 
                      value={selectedProjectId?.toString()} 
                      onValueChange={(value) => {
                        const projectId = parseInt(value);
                        setSelectedProjectId(projectId);
                        setValue('project_id', projectId);
                      }}
                    >
                      <SelectTrigger className="h-11 border-gray-300 focus:border-red-500 focus:ring-red-500">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Project Alpha</SelectItem>
                        <SelectItem value="2">Project Beta</SelectItem>
                        <SelectItem value="3">Project Gamma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Site Location
                    </Label>
                    <Input 
                      {...register('site_location', { required: true })}
                      placeholder="Enter site location (e.g., Erode)"
                      className="h-11 border-gray-300 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <User className="w-4 h-4 text-gray-500" />
                      Requested By
                    </Label>
                    <div className="relative">
                      <Input
                        {...register('requested_by')}
                        value={currentUserName}
                        readOnly
                        className="h-11 bg-gray-50 border-gray-200 cursor-not-allowed pr-20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {currentUserRole}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      Date Required
                    </Label>
                    <DateInput 
                      value={watch('date') || getTodayFormatted()}
                      onChange={(value) => setValue('date', value)}
                      className="h-11 border-gray-200 focus:border-red-500"
                      placeholder="dd/mm/yyyy"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Justification / Purpose
                    </Label>
                    <textarea 
                      {...register('purpose', { required: true })}
                      className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-red-500"
                      placeholder="Explain the purpose and urgency of this requisition (e.g., Foundation materials)..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Materials Tab */}
            {activeTab === 'materials' && (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="w-5 h-5 text-red-600" />
                      Material Requirements
                    </h3>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">
                        {materials.length} Items
                      </Badge>
                      <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                        <Banknote className="w-3 h-3 mr-1" />
                        Total: AED {calculateTotal().toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="p-6">
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
                                <SelectItem value="Structural">Structural</SelectItem>
                                <SelectItem value="Building Material">Building Material</SelectItem>
                                <SelectItem value="Hardware">Hardware</SelectItem>
                                <SelectItem value="Electrical">Electrical</SelectItem>
                                <SelectItem value="Plumbing">Plumbing</SelectItem>
                                <SelectItem value="Furniture">Furniture</SelectItem>
                                <SelectItem value="Finishes">Finishes</SelectItem>
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
                                <SelectItem value="bag">Bag</SelectItem>
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
                                value={material.cost}
                                onChange={(e) => updateMaterial(material.id, 'cost', parseFloat(e.target.value))}
                                className="pl-9 border-gray-200"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">Design Reference</Label>
                            <Input
                              value={material.design_reference}
                              onChange={(e) => updateMaterial(material.id, 'design_reference', e.target.value)}
                              placeholder="Drawing/Design reference (e.g., DR-001)"
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
                                <SelectItem value="Low">Low Priority</SelectItem>
                                <SelectItem value="Medium">Medium Priority</SelectItem>
                                <SelectItem value="High">High Priority</SelectItem>
                                <SelectItem value="Urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Subtotal:</span>
                            <span className="font-semibold text-lg text-red-600">
                              AED {(material.quantity * material.cost).toLocaleString()}
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

                </div>
              </div>
            )}

            {/* Attachments Tab */}
            {activeTab === 'attachments' && (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Paperclip className="w-5 h-5 text-red-600" />
                    Documents & References
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-6">
                  {/* Upload Area */}
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-red-400 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-red-400', 'bg-red-50');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-red-400', 'bg-red-50');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-red-400', 'bg-red-50');
                      const files = Array.from(e.dataTransfer.files);
                      const validFiles = files.filter(file => {
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
                          return false;
                        }
                        const validTypes = ['application/pdf', 'application/msword', 
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                          'application/vnd.ms-excel', 
                          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                          'image/png', 'image/jpeg', 'image/jpg'];
                        if (!validTypes.includes(file.type)) {
                          toast.error(`File ${file.name} has invalid format.`);
                          return false;
                        }
                        return true;
                      });
                      setAttachments([...attachments, ...validFiles]);
                    }}
                  >
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
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="pointer-events-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Select Files
                    </Button>
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
                      value={designReference}
                      onChange={(e) => setDesignReference(e.target.value)}
                    />
                  </div>
                </div>

                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modern Footer */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <div className="flex items-center gap-3">
              {activeTab !== 'details' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (activeTab === 'materials') handleTabChange('details');
                    if (activeTab === 'attachments') handleTabChange('materials');
                  }}
                  className="text-gray-600 border-gray-300 hover:bg-gray-50"
                >
                  Previous
                </Button>
              )}
              {activeTab === 'details' && (
                <Button
                  type="button"
                  onClick={() => {
                    const values = getValues();
                    if (values.project_id && values.site_location && values.requested_by && values.date && values.purpose) {
                      setDetailsCompleted(true);
                      handleTabChange('materials');
                    } else {
                      toast.error('Please fill all required fields');
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Next: Materials
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              {activeTab === 'materials' && (
                <Button
                  type="button"
                  onClick={() => handleTabChange('attachments')}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Next: Attachments
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              {activeTab === 'attachments' && (
                <Button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Submit Request
                  <Send className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" />
              Purchase Requisition Preview
            </DialogTitle>
            <DialogDescription>
              Review your purchase requisition before submission
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Project Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Project Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Project ID:</span>
                  <span className="ml-2 font-medium">{selectedProjectId || 'Not selected'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Site Location:</span>
                  <span className="ml-2 font-medium">{getValues('site_location') || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Requested By:</span>
                  <span className="ml-2 font-medium">{getValues('requested_by') || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Date:</span>
                  <span className="ml-2 font-medium">{getValues('date') || 'Not specified'}</span>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-gray-600">Purpose:</span>
                <p className="mt-1 font-medium">{getValues('purpose') || 'Not specified'}</p>
              </div>
            </div>

            {/* Materials */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Materials ({materials.length})
              </h3>
              {materials.length > 0 ? (
                <div className="space-y-2">
                  {materials.map((material, index) => (
                    <div key={material.id} className="bg-white p-3 rounded border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{index + 1}. {material.description}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {material.specification} | {material.quantity} {material.unit} × AED {material.cost}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={priorityColors[material.priority]}>
                            {material.priority}
                          </Badge>
                          <p className="text-sm font-semibold mt-1">
                            AED {(material.quantity * material.cost).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Amount:</span>
                      <span className="text-lg font-bold text-red-600">
                        AED {calculateTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No materials added</p>
              )}
            </div>

            {/* Attachments */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Attachments ({attachments.length})
              </h3>
              {attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span>{file.name}</span>
                      <span className="text-gray-500">({(file.size / 1024).toFixed(2)} KB)</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No files attached</p>
              )}
              {designReference && (
                <div className="mt-3 pt-3 border-t">
                  <span className="text-gray-600 text-sm">Design Reference:</span>
                  <p className="font-medium text-sm mt-1">{designReference}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowPreviewModal(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowPreviewModal(false);
                handleSubmit(onSubmit)();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!validateDetailsTab() || !validateMaterialsTab()}
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseRequisitionForm;