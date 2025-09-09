/**
 * Acknowledgement Modal Component
 * Modal for sending payment acknowledgement with optional document upload and viewing
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, Upload, FileText, X, CheckCircle, 
  AlertCircle, File, Loader2, Eye, Download, 
  Trash2, ExternalLink
} from 'lucide-react';
import { accountsService } from '../services/accountsService';
import { toast } from 'sonner';
import type { Purchase } from '../types';

interface AcknowledgementModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
  onSuccess?: () => void;
}

interface UploadedFile {
  fn: string;           // filename
  orig: string;         // original filename
  path: string;         // file path in storage
  size: number;         // file size
  type: string;         // content type
  url?: string;         // public URL if available
}

const AcknowledgementModal: React.FC<AcknowledgementModalProps> = ({
  isOpen,
  onClose,
  purchase,
  onSuccess
}) => {
  const [acknowledgementMessage, setAcknowledgementMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [existingFiles, setExistingFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [activeTab, setActiveTab] = useState('message');

  // Reset form when modal opens and load existing files
  React.useEffect(() => {
    if (isOpen && purchase) {
      // Generate default acknowledgement message
      const paymentAmount = purchase.payment_transaction?.amount || 
                           (purchase.payment_details as any)?.amount || 
                           purchase.total_cost || 0;
      
      const defaultMessage = `Payment of AED ${paymentAmount.toLocaleString()} has been successfully processed and settled for Purchase Request #${purchase.purchase_id}. ` +
                            `The transaction has been verified and recorded in our financial system. ` +
                            `All materials have been delivered as per specifications and quality standards have been met. ` +
                            `Invoice and supporting documents have been archived for audit purposes.`;
      
      setAcknowledgementMessage(defaultMessage);
      setSelectedFiles([]);
      setUploadedFiles([]);
      setActiveTab('message');
      
      // Load existing files for this purchase
      loadExistingFiles();
    }
  }, [isOpen, purchase]);
  
  // Load existing uploaded files - COMMENTED OUT
  const loadExistingFiles = async () => {
    // if (!purchase) return;
    // 
    // setIsLoadingFiles(true);
    // try {
    //   const response = await accountsService.getUploadedFiles(purchase.purchase_id);
    //   if (response && response.uploaded_files) {
    //     setExistingFiles(response.uploaded_files);
    //   } else if (response && response.files) {
    //     setExistingFiles(response.files);
    //   }
    // } catch (error) {
    //   console.error('Error loading existing files:', error);
    //   // Don't show error toast - files might not exist yet
    //   setExistingFiles([]);
    // } finally {
    //   setIsLoadingFiles(false);
    // }
    setExistingFiles([]);
    setIsLoadingFiles(false);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    
    // Validate file types
    const allowedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg'];
    const invalidFiles = newFiles.filter(file => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return !allowedTypes.includes(ext);
    });
    
    if (invalidFiles.length > 0) {
      toast.error(`Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }
    
    // Validate file size (max 5MB per file)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = newFiles.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      toast.error(`Files exceed 5MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    // Add files to the selected list
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  // Handle file removal from selected list
  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle file upload - COMMENTED OUT
  const handleUploadFiles = async () => {
    // if (!purchase || selectedFiles.length === 0) return;

    // setIsUploading(true);
    // try {
    //   // Upload all files at once
    //   const response = await accountsService.uploadFile(purchase.purchase_id, selectedFiles);
    //   
    //   if (response && response.uploaded_files) {
    //     setUploadedFiles(prev => [...prev, ...response.uploaded_files]);
    //     toast.success(`${response.uploaded_files.length} file(s) uploaded successfully`);
    //     
    //     // Clear selected files after successful upload
    //     setSelectedFiles([]);
    //     
    //     // Reload existing files to show the newly uploaded ones
    //     await loadExistingFiles();
    //   }
    // } catch (error: any) {
    //   console.error('File upload error:', error);
    //   toast.error(error.response?.data?.error || 'Failed to upload files');
    // } finally {
    //   setIsUploading(false);
    // }
    toast.info('File upload functionality is currently disabled');
    setIsUploading(false);
  };

  // Handle file view/download
  const handleViewFile = (file: UploadedFile) => {
    if (file.url) {
      window.open(file.url, '_blank');
    } else {
      toast.error('File URL not available');
    }
  };

  // Handle file deletion - COMMENTED OUT
  const handleDeleteFile = async (file: UploadedFile) => {
    // if (!purchase) return;
    // 
    // try {
    //   await accountsService.deleteUploadedFile(purchase.purchase_id, file.fn);
    //   toast.success('File deleted successfully');
    //   
    //   // Remove from local state
    //   setExistingFiles(prev => prev.filter(f => f.fn !== file.fn));
    //   setUploadedFiles(prev => prev.filter(f => f.fn !== file.fn));
    // } catch (error: any) {
    //   console.error('Error deleting file:', error);
    //   toast.error(error.response?.data?.error || 'Failed to delete file');
    // }
    toast.info('File deletion functionality is currently disabled');
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!purchase) return;

    setIsSubmitting(true);
    try {
      // Upload any pending files first - COMMENTED OUT
      // if (selectedFiles.length > 0) {
      //   await handleUploadFiles();
      // }

      // Get transaction ID from purchase data
      let transactionId: number | undefined;
      
      if (purchase.payment_transaction && typeof purchase.payment_transaction === 'object') {
        transactionId = purchase.payment_transaction.transaction_id;
      } else if (purchase.payment_details && typeof purchase.payment_details === 'object') {
        transactionId = (purchase.payment_details as any).transaction_id;
      } else if ('transaction_id' in purchase) {
        transactionId = (purchase as any).transaction_id;
      }

      // Collect all file names (existing + newly uploaded) - COMMENTED OUT
      // const allFiles = [...existingFiles, ...uploadedFiles];
      // const fileNames = allFiles.map(f => f.fn);
      const fileNames: string[] = []; // Empty array since upload is disabled

      // Prepare acknowledgement data
      const acknowledgementData = {
        purchase_id: purchase.purchase_id,
        transaction_id: transactionId,
        acknowledgement_type: 'payment_settled',
        acknowledgement_message: acknowledgementMessage,
        // supporting_documents: fileNames.length > 0 ? fileNames : undefined // COMMENTED OUT
        supporting_documents: undefined // Upload disabled
      };

      // Send acknowledgement
      const response = await accountsService.createAcknowledgement(acknowledgementData);
      
      if (response && response.message) {
        toast.success('Acknowledgement sent successfully');
        
        // Clear form
        setAcknowledgementMessage('');
        setSelectedFiles([]);
        setUploadedFiles([]);
        setExistingFiles([]);
        
        // Trigger success callback
        if (onSuccess) {
          onSuccess();
        }
        
        // Close modal
        onClose();
      }
    } catch (error: any) {
      console.error('Error sending acknowledgement:', error);
      toast.error(error.response?.data?.error || 'Failed to send acknowledgement');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Get file icon based on type
  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext || '')) return '📄';
    if (['doc', 'docx'].includes(ext || '')) return '📝';
    if (['xls', 'xlsx'].includes(ext || '')) return '📊';
    if (['png', 'jpg', 'jpeg'].includes(ext || '')) return '🖼️';
    return '📎';
  };

  if (!purchase) return null;

  const totalFiles = existingFiles.length + uploadedFiles.length + selectedFiles.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-green-600" />
            Send Payment Acknowledgement
          </DialogTitle>
          <DialogDescription>
            Confirm payment settlement for Purchase Request #{purchase.purchase_id}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          {/* Purchase Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Purchase Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Purchase ID:</span>
                <span className="font-medium">#{purchase.purchase_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Project:</span>
                <span className="font-medium">{purchase.project_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Amount:</span>
                <span className="font-bold text-green-600">
                  AED {(purchase.payment_transaction?.amount || purchase.total_cost || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Message Section - Document upload disabled */}
          <div className="space-y-2">
            <Label htmlFor="message">Acknowledgement Message</Label>
            <Textarea
              id="message"
              value={acknowledgementMessage}
              onChange={(e) => setAcknowledgementMessage(e.target.value)}
              placeholder="Enter acknowledgement message..."
              className="min-h-[200px]"
            />
            <p className="text-xs text-gray-500">
              This message will be sent to confirm the payment settlement
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !acknowledgementMessage.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Acknowledgement
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AcknowledgementModal;