import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PurchaseDetailsModal from '@/components/modals/PurchaseDetailsModal';
import { motion } from 'framer-motion';
import { apiClient } from '@/api/config';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import { useRolePermissions } from '@/roles/shared/hooks/useRolePermissions';
import {
  Package,
  Users,
  Banknote,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Plus,
  ArrowRight,
  Activity,
  BarChart3,
  Download,
  Bell,
  Search,
  Building2,
  ShoppingCart,
  Eye,
  Edit,
  MoreVertical,
  TrendingDown,
  Award,
  Target,
  Zap,
  Shield,
  Loader2,
  Trash2,
  Mail,
  MailCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PurchaseRequisitionForm from '@/components/forms/PurchaseRequisitionForm';
import VendorQuotationForm from '@/components/forms/VendorQuotationForm';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  color: string;
  trend: 'up' | 'down';
}

interface PurchaseRequest {
  id: string;
  prNumber: string;
  project: string;
  requester: string;
  amount: number;
  status: 'draft' | 'pending' | 'submitted' | 'approved' | 'rejected' | 'in_progress';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  date: string;
  items: number;
  originalData?: any; // Store original API data
  materials?: any[]; // Store materials array
}

interface VendorQuotation {
  id: string;
  vqNumber: string;
  vendor: string;
  project: string;
  amount: number;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'negotiation';
  validUntil: string;
  items: number;
}

const ProcurementDashboard: React.FC = (): React.ReactElement => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userRole = (user as any)?.role || '';
  const userName = (user as any)?.full_name || (user as any)?.name || '';
  
  // Debug logging for role issues
  console.log('Current user:', user);
  console.log('User role from auth:', userRole);
  
  // Get role-based permissions
  const { permissions, canCreatePurchaseRequest } = useRolePermissions();
  
  // Debug: Log permission check result
  console.log('Can create purchase request:', canCreatePurchaseRequest());
  console.log('Permissions:', permissions);
  
  const [activeView, setActiveView] = useState<'dashboard' | 'purchase' | 'vendor'>('dashboard');
  const [selectedPR, setSelectedPR] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPR, setEditingPR] = useState<PurchaseRequest | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorQuote, setSelectedVendorQuote] = useState<VendorQuotation | null>(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [emailedPRs, setEmailedPRs] = useState<Set<string>>(new Set());
  const [pmEmailedPRs, setPmEmailedPRs] = useState<Set<string>>(new Set()); // Track PRs sent to PM by procurement
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(7);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    prId: string;
    prNumber: string;
  }>({
    isOpen: false,
    prId: '',
    prNumber: ''
  });
  const [mailConfirm, setMailConfirm] = useState<{
    isOpen: boolean;
    pr: PurchaseRequest | null;
  }>({ isOpen: false, pr: null });
  const [isFetching, setIsFetching] = useState(false);

  // Fetch data from APIs - Only fetch once on mount
  useEffect(() => {
    // Prevent duplicate calls with a loading check
    if (!loading) return;
    
    fetchPurchaseRequests();
    // Only fetch these if endpoints are available
    // fetchVendorQuotations(); // Commented - endpoint not ready
    // fetchNotifications(); // Commented - endpoint not ready
  }, []);

  const fetchPurchaseRequests = async () => {
    // Prevent duplicate concurrent calls
    if (isFetching) {
      console.log('Already fetching purchase requests, skipping duplicate call');
      return;
    }
    
    try {
      setIsFetching(true);
      setLoading(true);
      // Use role-specific endpoint - procurement only sees email_sent=true purchases
      const normalizedRole = userRole?.toLowerCase().replace(/[\s_-]+/g, '_');
      console.log('Normalized role for endpoint selection:', normalizedRole);
      
      let endpoint = '/all_purchase'; // Default endpoint
      
      if (normalizedRole === 'procurement') {
        endpoint = '/all_procurement';  // Gets only purchases sent for approval (email_sent=true)
      } else if (normalizedRole === 'project_manager') {
        endpoint = '/projectmanager_purchases';  // Gets purchases approved by procurement for PM review
      }
      
      console.log('Using endpoint:', endpoint);
      const response = await apiClient.get(endpoint);
      
      console.log('API Response:', response.data); // Debug log
      console.log('User Role:', userRole); // Debug log
      
      // Handle different response structures based on endpoint
      // Check multiple possible response formats
      let purchaseData = [];
      
      if (normalizedRole === 'procurement') {
        // Procurement endpoint returns 'procurement' array
        purchaseData = response.data.procurement || [];
      } else if (normalizedRole === 'project_manager') {
        // Project manager endpoint returns different structure
        purchaseData = response.data.approved_procurement_purchases || 
                      response.data.purchase_requests || 
                      response.data.purchases || 
                      [];
      } else {
        // Try different possible response formats for /all_purchase
        purchaseData = response.data.purchase_requests || 
                      response.data.purchases || 
                      response.data.data || 
                      response.data.purchase || 
                      [];
                      
        // If still empty, check if response.data itself is an array
        if (purchaseData.length === 0 && Array.isArray(response.data)) {
          purchaseData = response.data;
        }
      }
      
      console.log('Purchase Data Array:', purchaseData); // Debug log
      console.log('Number of purchase requests:', purchaseData.length); // Debug log
      
      if (response.data.success) {
        // Transform API data to match our frontend structure
        const transformedRequests = purchaseData.map((pr: any, index: number) => {
          // Materials are nested within each purchase request
          const materials = pr.materials || [];
          
          // If no nested materials, try to find from the flat materials array
          if (materials.length === 0 && response.data.materials && pr.material_ids) {
            pr.material_ids.forEach((mid: number) => {
              const found = response.data.materials.find((m: any) => m.material_id === mid);
              if (found) materials.push(found);
            });
          }
          
          // Calculate total amount from materials
          const totalAmount = materials.reduce((sum: number, m: any) => 
            sum + (m.quantity * m.cost), 0
          );
          
          // Get priority from first material (or default to 'medium')
          const priority = materials[0]?.priority?.toLowerCase() || 'medium';
          
          // Determine status based on workflow state and role
          let status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'in_progress' = 'pending';
          
          // Check workflow states
          const isEmailSent = pr.email_sent === true;
          const procurementApproved = pr.latest_status === 'approved' || 
                                     (pr.approvals && pr.approvals.some((a: any) => 
                                       a.reviewer_role === 'procurement' && a.status === 'approved'));
          
          // Check if rejected by PM or any reviewer
          const isRejected = pr.latest_status === 'rejected' || 
                            pr.status === 'rejected' ||
                            (pr.approvals && pr.approvals.some((a: any) => a.status === 'rejected'));
          
          // Status logic based on role and workflow state
          const normalizedUserRole = userRole?.toLowerCase();
          
          // First check if rejected (highest priority)
          if (isRejected) {
            status = 'rejected';
          } else if (normalizedUserRole === 'site supervisor' || normalizedUserRole === 'site_supervisor' || normalizedUserRole === 'sitesupervisor') {
            // Site Supervisor view
            if (procurementApproved) {
              status = 'approved'; // Procurement has approved
            } else if (isEmailSent) {
              status = 'submitted'; // Sent to procurement, awaiting review
            } else {
              status = 'pending'; // Not yet sent
            }
          } else if (normalizedUserRole === 'procurement') {
            // Procurement view
            if (procurementApproved) {
              status = 'approved'; // Already approved and sent to PM
            } else if (isEmailSent) {
              status = 'in_progress'; // Received from Site Supervisor, processing
            } else {
              status = 'pending'; // Awaiting procurement action
            }
          } else if (pr.status) {
            // Use the actual status from backend for other roles
            status = pr.status as any;
          }
          
          return {
            id: pr.purchase_id.toString(),
            prNumber: `PR-2024-${String(pr.purchase_id).padStart(3, '0')}`,
            project: pr.project_id ? `Project ${pr.project_id}` : 'General Purchase',
            requester: (() => {
              // Parse requester field to extract proper name
              const rawRequester = pr.requested_by || pr.user_name || pr.created_by || 'Unknown';
              // Clean up Site Supervisor display only
              if (rawRequester.toLowerCase().includes('site') && rawRequester.toLowerCase().includes('supervisor')) {
                return 'Site Supervisor';
              }
              // Keep all other roles unchanged
              return rawRequester;
            })(),
            amount: totalAmount,
            status: status,
            priority: priority as 'low' | 'medium' | 'high' | 'urgent',
            date: pr.date || pr.created_at || new Date().toISOString(),
            items: materials.length,
            // Store original data for edit
            originalData: pr,
            materials: materials
          };
        });
        
        // Filter requests based on user role
        let filteredByRole = transformedRequests;
        
        // Filter based on user role
        if (userRole) {
          const role = userRole.toLowerCase();
          
          // For procurement role, the backend already filters to show only email_sent=true
          if (role === 'procurement' || role === 'procurement manager' || role === 'procurement_manager') {
            // Backend /all_procurement endpoint already filters for us
            filteredByRole = transformedRequests;
            console.log('Procurement role - showing requests sent for approval:', transformedRequests.length);
          } else {
            // Other roles see filtered requests
            switch(role) {
              case 'site supervisor':
              case 'site_supervisor':
              case 'sitesupervisor':  // Handle camelCase variation
                // Site Supervisor sees all their own requests (no filtering needed)
                // The /all_purchase endpoint should return their requests
                filteredByRole = transformedRequests;
                console.log('Site Supervisor - showing all purchase requests:', transformedRequests.length);
                break;
              case 'mep supervisor':
              case 'mep_supervisor':
                filteredByRole = transformedRequests.filter((pr: PurchaseRequest) => 
                  pr.requester.toLowerCase().includes('mep supervisor') ||
                  pr.requester.toLowerCase().includes('mep')
                );
                break;
              case 'project manager':
              case 'project_manager':
                // Project managers see all project-related requests
                filteredByRole = transformedRequests;
                break;
              case 'admin':
              case 'administrator':
                // Admins see everything
                filteredByRole = transformedRequests;
                break;
              default:
                // For other roles, show requests they created
                filteredByRole = transformedRequests.filter((pr: PurchaseRequest) => 
                  pr.requester === userName || 
                  pr.requester.toLowerCase().includes(role)
                );
            }
          }
        } else {
          // No role defined - show all
          filteredByRole = transformedRequests;
        }
        
        console.log('Filtered by role:', filteredByRole); // Debug log
        console.log('User role:', userRole); // Debug log
        
        setPurchaseRequests(filteredByRole);
        
        // Initialize emailedPRs set based on email_sent status
        const emailedSet = new Set<string>();
        const pmEmailedSet = new Set<string>();
        
        // Use filteredByRole instead of transformedRequests to track the correct items
        filteredByRole.forEach((pr: PurchaseRequest) => {
          // Check if email has been sent (for Site Supervisor, this means sent to procurement)
          if (pr.originalData?.email_sent === true) {
            emailedSet.add(pr.id);
          }
          
          // For Site Supervisor, also check status to determine if sent
          const normalizedRole = userRole?.toLowerCase();
          if (normalizedRole === 'site supervisor' || normalizedRole === 'site_supervisor' || normalizedRole === 'sitesupervisor') {
            if (pr.status === 'submitted' || pr.status === 'approved' || pr.originalData?.email_sent === true) {
              emailedSet.add(pr.id);
            }
          }
          
          // For procurement role, check if already sent to PM
          if (userRole?.toLowerCase() === 'procurement' && pr.originalData?.latest_status === 'approved') {
            pmEmailedSet.add(pr.id);
          }
        });
        
        console.log('Initialized emailed PRs:', Array.from(emailedSet)); // Debug log
        console.log('Purchase requests with email_sent status:', transformedRequests.map((pr: PurchaseRequest) => ({
          id: pr.id,
          prNumber: pr.prNumber,
          email_sent: pr.originalData?.email_sent
        }))); // Debug log
        
        setEmailedPRs(emailedSet);
        setPmEmailedPRs(pmEmailedSet);
        
        // Calculate metrics based on real data
        const totalValue = transformedRequests.reduce((sum: number, pr: PurchaseRequest) => sum + pr.amount, 0);
        const pendingCount = transformedRequests.filter((pr: PurchaseRequest) => pr.status === 'pending').length;
        const approvedCount = transformedRequests.filter((pr: PurchaseRequest) => pr.status === 'approved').length;
        
        setMetrics([
          {
            title: 'Total Purchase Value',
            value: `AED ${totalValue.toLocaleString()}`,
            change: 12.5, // You can calculate this from historical data
            icon: Banknote,
            color: 'bg-green-500',
            trend: 'up'
          },
          {
            title: 'Requisitions to Process',
            value: transformedRequests.length,
            change: -5.2,
            icon: FileText,
            color: 'bg-[#243d8a]',
            trend: 'down'
          },
          {
            title: 'Pending Processing',
            value: pendingCount,
            change: 25.0,
            icon: Clock,
            color: 'bg-amber-500',
            trend: 'up'
          },
          {
            title: 'Vendor Performance',
            value: '92%', // This would come from vendor metrics API
            change: 3.8,
            icon: Award,
            color: 'bg-purple-500',
            trend: 'up'
          }
        ]);
      } else {
        toast.error('Failed to fetch purchase requests');
        // Set empty data on error
        setPurchaseRequests([]);
        setMetrics([
          {
            title: 'Total Purchase Value',
            value: 'AED 0',
            change: 0,
            icon: Banknote,
            color: 'bg-green-500',
            trend: 'up'
          },
          {
            title: 'Active Requisitions',
            value: 0,
            change: 0,
            icon: FileText,
            color: 'bg-[#243d8a]',
            trend: 'down'
          },
          {
            title: 'Pending Approvals',
            value: 0,
            change: 0,
            icon: Clock,
            color: 'bg-amber-500',
            trend: 'up'
          },
          {
            title: 'Vendor Performance',
            value: '0%',
            change: 0,
            icon: Award,
            color: 'bg-purple-500',
            trend: 'up'
          }
        ]);
      }
    } catch (error: any) {
      console.error('Error fetching purchase requests:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch purchase requests');
      setPurchaseRequests([]);
      // Set default metrics on error
      setMetrics([
        {
          title: 'Total Purchase Value',
          value: 'AED 0',
          change: 0,
          icon: Banknote,
          color: 'bg-green-500',
          trend: 'up'
        },
        {
          title: 'Active Requisitions',
          value: 0,
          change: 0,
          icon: FileText,
          color: 'bg-[#243d8a]',
          trend: 'down'
        },
        {
          title: 'Pending Approvals',
          value: 0,
          change: 0,
          icon: Clock,
          color: 'bg-amber-500',
          trend: 'up'
        },
        {
          title: 'Vendor Performance',
          value: '0%',
          change: 0,
          icon: Award,
          color: 'bg-purple-500',
          trend: 'up'
        }
      ]);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  // Fetch vendor quotations from API (placeholder for now)
  const [vendorQuotations, setVendorQuotations] = useState<VendorQuotation[]>([]);
  
  // Commented out until backend endpoints are ready
  const fetchVendorQuotations = async () => {
    // Endpoint not implemented yet
    setVendorQuotations([]);
  };

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const fetchNotifications = async () => {
    // Endpoint not implemented yet
    setNotifications([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-[#4ade80]/20 text-[#16a34a] border border-[#4ade80] font-semibold shadow-md hover:bg-[#4ade80]/30 transition-all duration-200';
      case 'pending':
      case 'under_review':
        return 'bg-[#fbbf24]/20 text-[#d97706] border border-[#fbbf24] font-semibold shadow-md hover:bg-[#fbbf24]/30 transition-all duration-200';
      case 'submitted':
        return 'bg-[#60a5fa]/20 text-[#2563eb] border border-[#60a5fa] font-semibold shadow-md hover:bg-[#60a5fa]/30 transition-all duration-200';
      case 'rejected':
        return 'bg-[#f87171]/20 text-[#dc2626] border border-[#f87171] font-semibold shadow-md hover:bg-[#f87171]/30 transition-all duration-200';
      case 'in_progress':
        return 'bg-[#fbbf24]/20 text-[#d97706] border border-[#fbbf24] font-semibold shadow-md hover:bg-[#fbbf24]/30 transition-all duration-200';
      case 'negotiation':
        return 'bg-orange-100 text-orange-700 border border-orange-300 font-semibold shadow-lg shadow-orange-200/50 hover:bg-orange-200 hover:shadow-orange-300/50 transition-all duration-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-400 font-semibold shadow-lg shadow-gray-200/50 hover:bg-gray-200 hover:shadow-gray-300/50 transition-all duration-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-[#f87171]/20 text-[#dc2626] border border-[#f87171] font-bold shadow-md hover:bg-[#f87171]/30 transition-all duration-200 animate-pulse';
      case 'high':
        return 'bg-[#fb923c]/20 text-[#ea580c] border border-[#fb923c] font-bold shadow-md hover:bg-[#fb923c]/30 transition-all duration-200';
      case 'medium':
        return 'bg-[#60a5fa]/20 text-[#2563eb] border border-[#60a5fa] font-semibold shadow-md hover:bg-[#60a5fa]/30 transition-all duration-200';
      case 'low':
        return 'bg-[#4ade80]/20 text-[#16a34a] border border-[#4ade80] font-semibold shadow-md hover:bg-[#4ade80]/30 transition-all duration-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-400 font-semibold shadow-lg shadow-gray-200/50 hover:bg-gray-200 hover:shadow-gray-300/50 transition-all duration-200';
    }
  };

  const handleDeletePR = (prId: string, prNumber: string) => {
    // Check if already deleting
    if (deletingIds.has(prId)) {
      toast.warning('Delete operation already in progress');
      return;
    }

    // Open confirmation dialog
    setDeleteConfirm({
      isOpen: true,
      prId: prId,
      prNumber: prNumber
    });
  };

  const confirmDelete = async () => {
    const { prId, prNumber } = deleteConfirm;
    
    try {
      // Add to deleting set
      setDeletingIds(prev => new Set(prev).add(prId));
      
      // Close dialog
      setDeleteConfirm({ isOpen: false, prId: '', prNumber: '' });
      
      // Show loading toast
      const loadingToast = toast.loading(`Deleting ${prNumber}...`);
      
      const response = await apiClient.delete(`/purchase/${prId}`);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      // Check for success in multiple ways for backward compatibility
      const isSuccess = response.data.success || 
                       response.status === 200 || 
                       response.data.message?.includes('successfully');
      
      if (isSuccess) {
        // Update local state immediately for better UX
        setPurchaseRequests(prev => prev.filter(pr => pr.id !== prId));
        
        // Show success message
        toast.success(response.data.message || `Purchase request ${prNumber} deleted successfully`);
        
        // Refresh data from server after a short delay
        setTimeout(() => {
          fetchPurchaseRequests();
        }, 1000);
      } else {
        toast.error(response.data.error || response.data.message || 'Failed to delete purchase request');
      }
    } catch (error: any) {
      console.error('Error deleting purchase request:', error);
      
      // Check if the error is 404 (already deleted)
      if (error.response?.status === 404) {
        // Remove from local state and refresh
        setPurchaseRequests(prev => prev.filter(pr => pr.id !== prId));
        toast.info(`${prNumber} has already been deleted`);
        
        // Refresh list
        setTimeout(() => {
          fetchPurchaseRequests();
        }, 1000);
      } else {
        toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to delete purchase request');
      }
    } finally {
      // Remove from deleting set
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(prId);
        return newSet;
      });
    }
  };

  const handleSendMailToProcurement = async (pr: PurchaseRequest) => {
    try {
      // Show loading toast
      const loadingToast = toast.loading(`Sending email for ${pr.prNumber}...`);
      
      // Log the purchase ID for debugging
      console.log('Sending email for purchase ID:', pr.id, 'PR Number:', pr.prNumber);
      
      const response = await apiClient.get(`/purchase_email/${pr.id}`);
      
      toast.dismiss(loadingToast);
      
      if (response.data.success) {
        // Update appropriate set based on user role
        if (userRole?.toLowerCase() === 'procurement') {
          // Procurement sending to PM
          setPmEmailedPRs(prev => new Set(prev).add(pr.id));
          toast.success(`Approval request sent to Project Manager for ${pr.prNumber}`);
        } else {
          // Site Supervisor sending to Procurement
          setEmailedPRs(prev => new Set(prev).add(pr.id));
          toast.success(response.data.message || `Email sent successfully for ${pr.prNumber}`);
        }
        
        // Refresh the purchase requests data to get updated status
        setTimeout(() => {
          fetchPurchaseRequests();
        }, 1500);
      } else {
        toast.error(response.data.message || response.data.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.dismiss(); // Dismiss any loading toasts
      
      // Better error handling
      if (error.response?.status === 401) {
        toast.error('You are not authorized to send emails. Please check your permissions.');
      } else if (error.response?.status === 404) {
        toast.error(`Purchase request ${pr.prNumber} not found. It may have been deleted.`);
        // Refresh the list
        await fetchPurchaseRequests();
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to send emails for this purchase request.');
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to send email. Please check your internet connection and try again.');
      }
    }
  };

  const handleViewPR = (prId: string) => {
    // Directly open modal - let the modal handle fetching and error states
    setSelectedPR(prId);
    setShowDetailsModal(true);
  };

  const handleEditPR = async (pr: PurchaseRequest) => {
    try {
      // Show loading toast
      const loadingToast = toast.loading('Loading purchase details...');
      
      const response = await apiClient.get(`/purchase/${pr.id}`);
      toast.dismiss(loadingToast);
      
      if (response.data.success) {
        // Backend returns 'purchase' not 'purchase_request'
        const purchase = response.data.purchase;
        const materials = purchase.materials || [];
        const totalAmount = materials.reduce((sum: number, m: any) => 
          sum + (m.quantity * m.cost), 0
        );
        
        const updatedPR = {
          ...pr,
          amount: totalAmount,
          items: materials.length,
          // Pass the full purchase data for editing
          originalData: purchase,
          materials: materials
        };
        
        setEditingPR(updatedPR);
        setShowEditModal(true);
      } else {
        toast.error('Purchase request not found');
        await fetchPurchaseRequests();
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('Purchase request no longer exists');
        await fetchPurchaseRequests();
      } else {
        // Still open the edit form with existing data
        setEditingPR(pr);
        setShowEditModal(true);
      }
    }
  };

  if (activeView === 'purchase' || showEditModal) {
    return (
      <PurchaseRequisitionForm 
        existingData={editingPR}
        isEditMode={!!editingPR}
        onClose={() => {
          setActiveView('dashboard');
          setShowEditModal(false);
          setEditingPR(null);
          // Refresh data after form submission with a small delay to ensure backend is updated
          setTimeout(() => {
            fetchPurchaseRequests();
          }, 500);
        }} 
      />
    );
  }

  if (activeView === 'vendor') {
    return (
      <VendorQuotationForm 
        onClose={() => {
          setActiveView('dashboard');
          // fetchVendorQuotations(); // Commented - endpoint not ready
        }} 
      />
    );
  }


  // Show loading spinner while fetching data
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ModernLoadingSpinners variant="pulse-wave" size="lg" />
          <p className="text-gray-600 mt-4">Loading procurement data...</p>
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-7 h-7 text-[#243d8a]" />
              Procurement Processing Hub
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {userRole?.toLowerCase() === 'procurement' 
                ? 'Process all purchase requisitions, manage vendor quotations, and handle approvals'
                : 'Process purchase requisitions, manage vendor quotations, and handle cost revisions'}
              {userName && <span className="ml-2 text-xs">• Logged in as: {userName} ({userRole})</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search PR, VQ, or vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            
          </div>
        </div>
      </motion.div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {metric.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ${
                        metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {metric.change}%
                      </span>
                      <span className="text-xs text-gray-500">vs last month</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${metric.color} bg-opacity-10`}>
                    <metric.icon className={`w-6 h-6 ${metric.color.replace('bg-', 'text-')}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Tabs */}
      <style>{`
        .no-focus-border *:focus {
          outline: none !important;
          box-shadow: none !important;
          border-color: inherit !important;
        }
        .no-focus-border *:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>
      <Tabs defaultValue="requisitions" className="space-y-6 no-focus-border">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-white shadow-sm">
          <TabsTrigger value="requisitions" className="data-[state=active]:bg-[#243d8a]/5">
            <FileText className="w-4 h-4 mr-2" />
            Requisitions
          </TabsTrigger>
          <TabsTrigger value="quotations" className="data-[state=active]:bg-purple-50">
            <Users className="w-4 h-4 mr-2" />
            Quotations
          </TabsTrigger>
          <TabsTrigger value="approvals" className="data-[state=active]:bg-amber-50">
            <CheckCircle className="w-4 h-4 mr-2" />
            Cost Review
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-green-50">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Purchase Requisitions Tab */}
        <TabsContent value="requisitions" className="focus:outline-none">
          <Card className="shadow-lg border-0 focus:outline-none" tabIndex={-1}>
            <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b focus:outline-none">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-red-600" />
                  Purchase Requisitions to Process
                </CardTitle>
                <div className="flex items-center gap-3">
                  {/* Show New Purchase Request button only for Site/MEP Supervisors */}
                  {canCreatePurchaseRequest() && (
                    <Button
                      onClick={() => setActiveView('purchase')}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Purchase Request
                    </Button>
                  )}
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto focus:outline-none">
                <table className="w-full focus:outline-none">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PR Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requester
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      // Calculate pagination directly without search filtering
                      const totalItems = purchaseRequests.length;
                      const totalPages = Math.ceil(totalItems / itemsPerPage);
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedData = purchaseRequests.slice(startIndex, endIndex);
                      
                      // Store total pages for pagination controls
                      const paginationInfo = { totalPages, currentPage, totalItems };
                      
                      if (paginatedData.length === 0) {
                        return (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-lg font-medium">No purchase requisitions found</p>
                            <p className="text-sm mt-1">
                              {canCreatePurchaseRequest() 
                                ? "Create your first purchase requisition to get started" 
                                : "Waiting for new purchase requisitions to process"}
                            </p>
                            {canCreatePurchaseRequest() && (
                              <Button 
                                onClick={() => setActiveView('purchase')}
                                className="mt-4 bg-[#243d8a] hover:bg-[#243d8a]/90"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Purchase Request
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                        );
                      }
                      
                      return paginatedData.map((pr: PurchaseRequest) => (
                      <motion.tr 
                        key={pr.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-[#243d8a] hover:text-[#243d8a]/80 cursor-pointer">
                              {pr.prNumber}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm text-gray-900">{pr.project}</p>
                            <p className="text-xs text-gray-500">{pr.items} items</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {(() => {
                                // Generate role abbreviation
                                const role = pr.requester.toLowerCase();
                                // Handle Site Supervisor variations
                                if (role.includes('site') && role.includes('supervisor')) return 'SST';
                                if (role.includes('mep') && role.includes('supervisor')) return 'MEP';
                                if (role.includes('procurement')) return 'PROC';
                                if (role.includes('project') && role.includes('manager')) return 'PM';
                                if (role.includes('estimation')) return 'EST';
                                if (role.includes('technical') && role.includes('director')) return 'TD';
                                if (role.includes('admin')) return 'ADM';
                                // Default: use first letters of role
                                return pr.requester.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 3);
                              })()}
                            </span>
                            <span className="text-sm text-gray-900">{pr.requester}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            AED {pr.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={`${getPriorityColor(pr.priority)} border`}>
                            {pr.priority.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Badge className={`${(() => {
                              const role = userRole?.toLowerCase();
                              // For Procurement role showing approved as submitted, use blue color
                              if (role === 'procurement' && pr.status === 'approved') {
                                return 'bg-[#60a5fa]/20 text-[#2563eb] border border-[#60a5fa] font-semibold shadow-md hover:bg-[#60a5fa]/30 transition-all duration-200';
                              }
                              return getStatusColor(pr.status);
                            })()} border`}>
                              {(() => {
                                const role = userRole?.toLowerCase();
                                
                                // For Procurement role, change "APPROVED" to "SUBMITTED"
                                if (role === 'procurement' && pr.status === 'approved') {
                                  return 'SUBMITTED';
                                }
                                
                                // Default display
                                return pr.status.replace('_', ' ').toUpperCase();
                              })()}
                            </Badge>
                            
                            {/* Additional status badges based on role and workflow state */}
                            {(() => {
                              const role = userRole?.toLowerCase();
                              
                              // For Site Supervisor
                              if (role === 'site supervisor' || role === 'site_supervisor' || role === 'sitesupervisor') {
                                if (pr.status === 'approved') {
                                  return (
                                    <Badge className="bg-[#4ade80]/20 text-[#16a34a] border border-[#4ade80] font-semibold shadow-md hover:bg-[#4ade80]/30 transition-all duration-200">
                                      Approved by Procurement
                                    </Badge>
                                  );
                                } else if (pr.status === 'in_progress' && emailedPRs.has(pr.id)) {
                                  return (
                                    <Badge className="bg-[#60a5fa]/20 text-[#2563eb] border border-[#60a5fa] font-semibold shadow-md hover:bg-[#60a5fa]/30 transition-all duration-200">
                                      Sent for Approval
                                    </Badge>
                                  );
                                }
                              }
                              
                              // For Procurement
                              if (role === 'procurement') {
                                // First check if rejected
                                if (pr.status === 'rejected') {
                                  return (
                                    <Badge className="bg-[#f87171]/20 text-[#dc2626] border border-[#f87171] font-semibold shadow-md hover:bg-[#f87171]/30 transition-all duration-200">
                                      Rejected by PM
                                    </Badge>
                                  );
                                }
                                // Then check if sent to PM
                                if (pmEmailedPRs.has(pr.id)) {
                                  return (
                                    <Badge className="bg-[#4ade80]/20 text-[#16a34a] border border-[#4ade80] font-semibold shadow-md hover:bg-[#4ade80]/30 transition-all duration-200">
                                      Sent to PM
                                    </Badge>
                                  );
                                }
                              }
                              
                              return null;
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(pr.date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewPR(pr.id)}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {/* Edit button visibility based on workflow state */}
                            {(() => {
                              const role = userRole?.toLowerCase();
                              const isSiteSupervisor = role === 'site supervisor' || role === 'site_supervisor' || role === 'sitesupervisor';
                              const isProcurement = role === 'procurement';
                              
                              // Hide edit for Site Supervisor after sending to procurement
                              if (isSiteSupervisor) {
                                // Check both status and email_sent flag
                                if (pr.status !== 'pending' || pr.originalData?.email_sent === true) {
                                  return null;
                                }
                              }
                              
                              // Hide edit for Procurement after sending to PM
                              if (isProcurement && pmEmailedPRs.has(pr.id)) {
                                return null;
                              }
                              
                              return (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEditPR(pr)}
                                  title="Edit Purchase Request"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              );
                            })()}
                            
                            {/* Mail button visibility based on workflow state */}
                            {(() => {
                              const role = userRole?.toLowerCase();
                              const isSiteSupervisor = role === 'site supervisor' || role === 'site_supervisor' || role === 'sitesupervisor';
                              const isProcurement = role === 'procurement';
                              
                              // For Site Supervisor - show mail button or sent icon
                              if (isSiteSupervisor) {
                                // If already sent, show check icon
                                if (pr.originalData?.email_sent === true) {
                                  return (
                                    <div className="px-2" title="Sent to Procurement">
                                      <MailCheck className="w-4 h-4 text-green-600" />
                                    </div>
                                  );
                                }
                                // Only show mail button if status is pending
                                if (pr.status !== 'pending') {
                                  return null;
                                }
                                return (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setMailConfirm({ isOpen: true, pr })}
                                    title="Send for Procurement Approval"
                                  >
                                    <Mail className="w-4 h-4" />
                                  </Button>
                                );
                              }
                              
                              // For Procurement - keep existing logic
                              if (isProcurement && !pmEmailedPRs.has(pr.id)) {
                                return (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setMailConfirm({ isOpen: true, pr })}
                                    title="Send Approval Request to Project Manager"
                                  >
                                    <Mail className="w-4 h-4" />
                                  </Button>
                                );
                              }
                              
                              return null;
                            })()}
                            
                            {/* Delete button - only for Site Supervisor and not sent */}
                            {(() => {
                              const role = userRole?.toLowerCase();
                              const isSiteSupervisor = role === 'site supervisor' || role === 'site_supervisor' || role === 'sitesupervisor';
                              
                              // Only show for Site Supervisor if status is pending AND not sent
                              if (isSiteSupervisor && pr.status === 'pending' && pr.originalData?.email_sent !== true) {
                                return (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeletePR(pr.id, pr.prNumber)}
                                    disabled={deletingIds.has(pr.id)}
                                    title="Delete Request"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    {deletingIds.has(pr.id) ? (
                                      <ModernLoadingSpinners variant="pulse-wave" size="sm" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </Button>
                                );
                              }
                              
                              return null;
                            })()}
                          </div>
                        </td>
                      </motion.tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {(() => {
                const totalItems = purchaseRequests.length;
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                
                if (totalPages <= 1) return null;
                
                return (
                  <div className="px-6 py-4 border-t bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="flex items-center gap-1"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        
                        {/* Page Numbers */}
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            
                            if (pageNum < 1 || pageNum > totalPages) return null;
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="w-10"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="flex items-center gap-1"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendor Quotations Tab */}
        <TabsContent value="quotations" className="focus:outline-none">
          <Card className="shadow-lg border-0 focus:outline-none" tabIndex={-1}>
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b focus:outline-none">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  Vendor Quotations
                </CardTitle>
                <Button
                  onClick={() => setActiveView('vendor')}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Quotation
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto focus:outline-none">
                <table className="w-full focus:outline-none">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        VQ Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valid Until
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendorQuotations.map((vq) => (
                      <motion.tr 
                        key={vq.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-medium text-purple-600 hover:text-purple-800 cursor-pointer">
                              {vq.vqNumber}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm text-gray-900">{vq.vendor}</p>
                            <p className="text-xs text-gray-500">{vq.items} items</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {vq.project}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            AED {vq.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={`${getStatusColor(vq.status)} border`}>
                            {vq.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vq.validUntil}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedVendorQuote(vq);
                                setShowVendorModal(true);
                              }}
                              title="View Vendor Quotation"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/procurement/vendor-quotations/edit/${vq.id}`)}
                              title="Edit Vendor Quotation"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                const data = JSON.stringify(vq, null, 2);
                                const blob = new Blob([data], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `VQ_${vq.vqNumber}.json`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              }}
                              title="Download"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Review Tab (Procurement specific) */}
        <TabsContent value="approvals">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pending Cost Revisions */}
            <Card className="shadow-md lg:col-span-2">
              <CardHeader className="bg-amber-50 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-5 h-5 text-amber-600" />
                  Pending Cost Revisions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {/* Show empty state for now - will be populated when there are cost revision requests */}
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No cost revisions pending</p>
                  <p className="text-sm mt-1">All purchase requests are within budget</p>
                </div>
              </CardContent>
            </Card>

            {/* Processing Statistics */}
            <Card className="shadow-md">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="text-base">Processing Statistics</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Avg. Processing Time</span>
                    <span className="font-semibold text-sm">1.5 hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">This Week</span>
                    <span className="font-semibold text-sm">18 processed</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cost Savings</span>
                    <span className="font-semibold text-sm text-green-600">AED 12,450</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Vendor Negotiations</span>
                    <span className="font-semibold text-sm">5 active</span>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <Button className="w-full" variant="outline">
                    <Activity className="w-4 h-4 mr-2" />
                    View Full Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending Trends */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Cost Optimization Trends
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Chart Component Here</p>
                </div>
              </CardContent>
            </Card>

            {/* Top Vendors */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="w-5 h-5 text-purple-600" />
                  Top Performing Vendors
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {vendorQuotations.length > 0 ? 
                    // Show actual vendor data if available
                    vendorQuotations.slice(0, 3).map((vq, idx) => (
                      <div key={vq.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{vq.vendor}</p>
                            <p className="text-xs text-gray-500">Performance data pending</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">AED {vq.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{vq.items} items</p>
                        </div>
                      </div>
                    ))
                  : 
                    // Show placeholder when no data
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">No vendor data available</p>
                      <p className="text-xs mt-1">Vendor performance metrics will appear here</p>
                    </div>
                  }
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-[#243d8a]/5 to-cyan-50 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="w-5 h-5 text-[#243d8a]" />
                  Spending by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {[
                    { category: 'Materials', amount: 450000, percentage: 45 },
                    { category: 'Labor', amount: 350000, percentage: 35 },
                    { category: 'Equipment', amount: 150000, percentage: 15 },
                    { category: 'Others', amount: 50000, percentage: 5 }
                  ].map((item) => (
                    <div key={item.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{item.category}</span>
                        <span className="text-sm text-gray-600">AED {item.amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#243d8a] h-2 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* KPIs */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="w-5 h-5 text-indigo-600" />
                  Key Performance Indicators
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Cost Savings', value: '12%', icon: TrendingDown, color: 'text-green-600' },
                    { label: 'Process Efficiency', value: '89%', icon: Zap, color: 'text-[#243d8a]' },
                    { label: 'Vendor Satisfaction', value: '4.5/5', icon: Award, color: 'text-purple-600' },
                    { label: 'Compliance Rate', value: '98%', icon: Shield, color: 'text-indigo-600' }
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                        <span className="text-xs text-gray-600">{kpi.label}</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Vendor Quotation View Modal */}
      {/* Purchase Details Modal */}
      <PurchaseDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedPR(null);
          // Only refresh if data might have changed (not needed for view-only modal)
        }}
        purchaseId={selectedPR || ''}
      />

      {/* Mail Confirmation Dialog */}
      <Dialog 
        open={mailConfirm.isOpen} 
        onOpenChange={(open) => !open && setMailConfirm({ isOpen: false, pr: null })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Confirm Email Sending
            </DialogTitle>
            <DialogDescription className="pt-3 space-y-2">
              <p>Are you sure you want to send this purchase request for approval?</p>
              {mailConfirm.pr && (
                <div className="bg-gray-50 p-3 rounded-lg space-y-1 mt-3">
                  <p className="text-sm font-medium">PR Number: {mailConfirm.pr.prNumber}</p>
                  <p className="text-sm">Amount: AED {mailConfirm.pr.amount.toLocaleString()}</p>
                  <p className="text-sm">
                    {userRole?.toLowerCase() === 'procurement' 
                      ? 'This will send the request to Project Manager for approval.'
                      : (userRole?.toLowerCase() === 'site supervisor' || userRole?.toLowerCase() === 'site_supervisor' || userRole?.toLowerCase() === 'sitesupervisor')
                        ? 'This will send the request to Procurement for review and approval.'
                        : 'This will send the request to Procurement for processing.'}
                  </p>
                </div>
              )}
              <p className="text-sm text-amber-600 mt-2">
                ⚠️ Once sent, you will not be able to edit this request.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:flex sm:justify-between gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMailConfirm({ isOpen: false, pr: null })}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (mailConfirm.pr) {
                  handleSendMailToProcurement(mailConfirm.pr);
                  setMailConfirm({ isOpen: false, pr: null });
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteConfirm.isOpen} 
        onOpenChange={(open) => !open && setDeleteConfirm({ isOpen: false, prId: '', prNumber: '' })}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Delete Purchase Request
            </DialogTitle>
            <DialogDescription className="pt-3">
              Are you sure you want to delete <span className="font-semibold">{deleteConfirm.prNumber}</span>? 
              This action cannot be undone and will permanently remove this purchase request and all associated materials.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:flex sm:justify-between gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirm({ isOpen: false, prId: '', prNumber: '' })}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProcurementDashboard;