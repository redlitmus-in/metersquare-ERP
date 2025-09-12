/**
 * Payment Processing Modal Component
 * Modal for processing payment transactions with vendor details
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Building, 
  DollarSign, 
  FileText,
  AlertCircle,
  CheckCircle2,

  Upload,
  File,
  X,
  Paperclip,
  Image as ImageIcon,
  FileCheck
} from 'lucide-react';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import { accountsService } from '../services/accountsService';
import { apiClient } from '@/api/config';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface PaymentProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: number | null;
  onSuccess: () => void;
}

const PaymentProcessingModal: React.FC<PaymentProcessingModalProps> = ({
  isOpen,
  onClose,
  purchaseId,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    payment_reference: '',
    vendor_name: '',
    vendor_account_details: '',
    notes: '',
    supporting_documents: [] as string[]
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && purchaseId) {
      setFormData({
        amount: '',
        payment_method: 'bank_transfer',
        payment_reference: '',
        vendor_name: '',
        vendor_account_details: '',
        notes: '',
        supporting_documents: []
      });
      setUploadedFiles([]);
      setUploadProgress({});
    }
  }, [isOpen, purchaseId]);

  // File upload handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = (files: File[]) => {
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!validTypes.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}. Only images, PDFs, and documents are allowed.`);
        return false;
      }
      
      if (file.size > maxSize) {
        toast.error(`File too large: ${file.name}. Maximum size is 10MB.`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length > 0) {
      // Just store files locally, don't upload yet
      setUploadedFiles(prev => [...prev, ...validFiles]);
      toast.info(`${validFiles.length} file(s) selected. They will be uploaded when you create the payment transaction.`);
    }
  };

  const uploadFiles = async (transactionId: number) => {
    if (uploadedFiles.length === 0) return true;
    
    let allSuccess = true;
    
    for (const file of uploadedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        // Set initial progress
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const currentProgress = prev[file.name] || 0;
            if (currentProgress < 90) {
              return { ...prev, [file.name]: currentProgress + 10 };
            }
            return prev;
          });
        }, 200);
        
        const response = await apiClient.post(
          `/upload_file?key=accounts&id=${transactionId}`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
        
        clearInterval(progressInterval);
        
        if (response.data.message) {
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          toast.success(`File uploaded successfully: ${file.name}`);
        } else {
          throw new Error('Upload failed');
        }
      } catch (error: any) {
        console.error('Error uploading file:', error);
        toast.error(`Failed to upload ${file.name}: ${error.response?.data?.error || error.message}`);
        allSuccess = false;
        
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }
    }
    
    return allSuccess;
  };

  const removeFile = (index: number) => {
    const fileName = uploadedFiles[index]?.name;
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    // Clear progress if exists
    if (fileName) {
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileName];
        return newProgress;
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (fileType === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!purchaseId || !formData.amount) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      setIsLoading(true);
      
      // First, create the payment transaction
      const response = await accountsService.processPaymentTransaction({
        purchase_id: purchaseId,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        payment_reference: formData.payment_reference,
        vendor_name: formData.vendor_name,
        vendor_account_details: formData.vendor_account_details,
        notes: formData.notes,
        supporting_documents: [] // Will be updated after file upload
      });

      toast.success('Payment transaction created successfully');
      
      // Now upload files if any (using the purchase_id as the transaction reference)
      if (uploadedFiles.length > 0) {
        toast.info('Uploading supporting documents...');
        const uploadSuccess = await uploadFiles(purchaseId);
        
        if (uploadSuccess) {
          toast.success('All files uploaded successfully');
        } else {
          toast.warning('Some files failed to upload, but payment transaction was created');
        }
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error(error.message || 'Failed to process payment transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            Process Payment Transaction
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <DollarSign className="h-4 w-4 text-green-600" />
              Payment Details
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Payment Amount (AED) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  className="focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => handleInputChange('payment_method', value)}
                >
                  <SelectTrigger className="focus:border-green-500 focus:ring-green-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="online_payment">Online Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_reference">Payment Reference</Label>
              <Input
                id="payment_reference"
                placeholder="Transaction reference or check number"
                value={formData.payment_reference}
                onChange={(e) => handleInputChange('payment_reference', e.target.value)}
                className="focus:border-green-500 focus:ring-green-500"
              />
            </div>
          </div>

          <Separator />

          {/* Vendor Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Building className="h-4 w-4 text-blue-600" />
              Vendor Information
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vendor_name">Vendor Name</Label>
                <Input
                  id="vendor_name"
                  placeholder="Enter vendor or supplier name"
                  value={formData.vendor_name}
                  onChange={(e) => handleInputChange('vendor_name', e.target.value)}
                  className="focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor_account_details">Vendor Account Details</Label>
                <Textarea
                  id="vendor_account_details"
                  placeholder="Bank account details, address, or payment instructions"
                  value={formData.vendor_account_details}
                  onChange={(e) => handleInputChange('vendor_account_details', e.target.value)}
                  className="focus:border-blue-500 focus:ring-blue-500 min-h-[80px]"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* File Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Paperclip className="h-4 w-4 text-purple-600" />
              Supporting Documents
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 cursor-pointer
                ${isDragging 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50 bg-gray-50/50'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Upload payment proof documents"
              />
              
              <div className="text-center pointer-events-none">
                <Upload className={`mx-auto h-12 w-12 ${isDragging ? 'text-purple-500' : 'text-gray-400'}`} />
                <p className="mt-2 text-sm text-gray-600">
                  <span className="text-purple-600 font-medium">
                    Click to upload
                  </span>
                  {' '}or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, DOC, DOCX, JPG, PNG up to 10MB
                </p>
              </div>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <AnimatePresence>
                  {uploadedFiles.map((file, index) => {
                    const progress = uploadProgress[file.name];
                    const isUploading = progress !== undefined && progress < 100;
                    
                    return (
                      <motion.div
                        key={`${file.name}-${index}`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
                      >
                        <div className="flex-shrink-0">
                          {isUploading ? (
                            <ModernLoadingSpinners variant="pulse-wave" size="lg" />
                          ) : progress === 100 ? (
                            <FileCheck className="h-4 w-4 text-green-600" />
                          ) : (
                            getFileIcon(file.type)
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                            {progress === undefined && ' • Ready to upload'}
                          </p>
                          {isUploading && (
                            <Progress value={progress} className="h-1 mt-1" />
                          )}
                        </div>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={isUploading}
                          className="flex-shrink-0 p-1 h-auto"
                        >
                          <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
                        </Button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          <Separator />

          {/* Additional Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <FileText className="h-4 w-4 text-gray-600" />
              Additional Information
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes or comments"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="focus:border-gray-500 focus:ring-gray-500 min-h-[60px]"
              />
            </div>
          </div>

          {/* Information Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Payment Processing Information</p>
                <p className="text-xs text-blue-700">
                  This will create a payment transaction that requires internal approval before processing. 
                  You can approve or reject the transaction in the pending approvals section.
                </p>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.amount}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <ModernLoadingSpinners variant="pulse-wave" size="lg" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Create Payment Transaction
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentProcessingModal;