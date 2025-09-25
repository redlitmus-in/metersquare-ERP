import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  FileText,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Building2,
  ClipboardList,
  TrendingUp,
  Package,
  DollarSign,
  Calendar,
  XCircle,
  Grid3X3,
  List
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/store/authStore';
import { buildRolePath } from '@/utils/roleRouting';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/api/config';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { vendorService } from '@/services/vendorService';

interface VendorSOW {
  id: string;
  sowNumber: string;
  projectName: string;
  vendorName: string;
  category: string;
  status: 'draft' | 'submitted' | 'qty_scope_review' | 'pm_approved' | 'estimation_check' | 'approved' | 'rejected';
  totalAmount: number;
  createdDate: string;
  boqReference: string;
  approvalStage?: string;
  rejectionReason?: string;
}

const PMVendorManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userName = (user as any)?.full_name || (user as any)?.name || '';
  const buildPath = (path: string) => buildRolePath(user?.role_id || '', path);

  const [activeTab, setActiveTab] = useState('pending');
  const [sows, setSows] = useState<VendorSOW[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSOWs: 0,
    pendingApproval: 0,
    approved: 0,
    rejected: 0,
    totalValue: 0
  });

  // Approval dialog state
  const [selectedSOW, setSelectedSOW] = useState<VendorSOW | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // View mode state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load SOW data from API
  useEffect(() => {
    loadSOWData();
  }, []);

  const loadSOWData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual SOW API endpoint when available
      // const response = await apiClient.get('/project-manager/sows');
      // For now, using empty data until API is implemented
      const sowData: VendorSOW[] = [];
      setSows(sowData);

      // Calculate stats from loaded data
      updateStats(sowData);
    } catch (error) {
      console.error('Error loading SOW data:', error);
      toast.error('Failed to load vendor SOW data');
      setSows([]);
      updateStats([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (sowData: VendorSOW[]) => {
    const newStats = {
      totalSOWs: sowData.length,
      pendingApproval: sowData.filter(s => s.status === 'qty_scope_review').length,
      approved: sowData.filter(s => s.status === 'pm_approved' || s.status === 'approved').length,
      rejected: sowData.filter(s => s.status === 'rejected').length,
      totalValue: sowData.reduce((sum, sow) => sum + sow.totalAmount, 0)
    };
    setStats(newStats);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, any> = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: <Clock className="w-3 h-3" /> },
      submitted: { color: 'bg-blue-100 text-blue-800', icon: <Send className="w-3 h-3" /> },
      qty_scope_review: { color: 'bg-amber-100 text-amber-800', icon: <AlertCircle className="w-3 h-3" /> },
      pm_approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      estimation_check: { color: 'bg-indigo-100 text-indigo-800', icon: <TrendingUp className="w-3 h-3" /> },
      approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      rejected: { color: 'bg-red-100 text-red-800', icon: <AlertCircle className="w-3 h-3" /> }
    };
    return statusConfig[status] || statusConfig.draft;
  };

  const getWorkflowStep = (status: string): number => {
    const steps: Record<string, number> = {
      draft: 0,
      submitted: 1,
      qty_scope_review: 2,
      pm_approved: 3,
      estimation_check: 4,
      approved: 5
    };
    return steps[status] || 0;
  };

  // Handle SOW approval
  const handleSOWReview = (sow: VendorSOW) => {
    setSelectedSOW(sow);
    setApprovalNotes('');
    setIsApprovalDialogOpen(true);
  };

  // Submit PM approval
  const submitPMApproval = async (approved: boolean) => {
    if (!selectedSOW) return;

    if (!approved && !approvalNotes.trim()) {
      toast.error('Please provide rejection notes');
      return;
    }

    setIsProcessing(true);

    try {
      // Update SOW status
      const updatedSOWs = sows.map(sow => {
        if (sow.id === selectedSOW.id) {
          return {
            ...sow,
            status: approved ? 'pm_approved' : 'rejected',
            approvalStage: approved
              ? 'PM FLAG Approved - Sent to Estimation'
              : 'Rejected by Project Manager',
            rejectionReason: approved ? undefined : approvalNotes.trim()
          };
        }
        return sow;
      });

      setSows(updatedSOWs);

      // Update stats
      const newStats = {
        ...stats,
        approved: updatedSOWs.filter(s => s.status === 'pm_approved' || s.status === 'approved').length,
        rejected: updatedSOWs.filter(s => s.status === 'rejected').length,
        pendingApproval: updatedSOWs.filter(s => s.status === 'qty_scope_review').length
      };
      setStats(newStats);

      const message = approved
        ? `SOW ${selectedSOW.sowNumber} approved and sent to Estimation for verification`
        : `SOW ${selectedSOW.sowNumber} rejected and sent back to Procurement`;

      toast.success(message);

      // Close dialog
      setIsApprovalDialogOpen(false);
      setSelectedSOW(null);
      setApprovalNotes('');

    } catch (error) {
      toast.error('Failed to process SOW approval');
      console.error('SOW approval error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header - PROJECT MANAGER View */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm p-6 border"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-7 h-7 text-blue-600" />
              Vendor Management - Project Manager
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Initiate and manage vendor scope of work with BOQ reference
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-none border-0"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none border-0"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={() => navigate(buildPath('/vendors/scope-of-work'))}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              New Vendor SOW
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Workflow Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertTitle>Your Role in Vendor Workflow</AlertTitle>
        <AlertDescription>
          As Project Manager, you initiate vendor requests with BOQ reference. Your SOWs go through:
          <strong> Procurement → QTY/SCOPE FLAG → PM Approval → Estimation Check → Technical Director → Accounts</strong>
        </AlertDescription>
      </Alert>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Total SOWs</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{loading ? '-' : stats.totalSOWs}</p>
              </div>
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 opacity-20 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pendingApproval}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-xl font-bold text-blue-600">AED {(stats.totalValue / 1000000).toFixed(1)}M</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">
                <Clock className="h-4 w-4 mr-2" />
                Pending ({sows.filter(s => s.status === 'qty_scope_review').length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                <CheckCircle className="h-4 w-4 mr-2" />
                Approved ({sows.filter(s => s.status === 'pm_approved' || s.status === 'approved').length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                <XCircle className="h-4 w-4 mr-2" />
                Rejected ({sows.filter(s => s.status === 'rejected').length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                <CheckCircle className="h-4 w-4 mr-2" />
                Completed ({sows.filter(s => s.status === 'approved').length})
              </TabsTrigger>
            </TabsList>

            {/* Pending SOWs Tab */}
            <TabsContent value="pending" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-blue-200 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(buildPath('/vendors/scope-of-work'))}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-blue-100">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">Create New SOW</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Start a new vendor scope of work with BOQ reference
                        </p>
                        <Button className="mt-3 bg-blue-600 hover:bg-blue-700" size="sm">
                          Start <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-gray-100">
                        <ClipboardList className="w-6 h-6 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">BOQ Templates</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Access standard BOQ templates for vendor work
                        </p>
                        <Badge variant="secondary" className="mt-3">Coming Soon</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Approved Tab */}
            <TabsContent value="approved" className="space-y-4 mt-6">
              {sows.filter(sow => sow.status === 'pm_approved' || sow.status === 'approved').map((sow) => (
                <Card key={sow.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{sow.sowNumber}</h3>
                          <Badge className={getStatusBadge(sow.status).color}>
                            {getStatusBadge(sow.status).icon}
                            <span className="ml-1">{sow.status.replace('_', ' ').toUpperCase()}</span>
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {sow.vendorName}
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {sow.projectName}
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            BOQ: {sow.boqReference}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(sow.createdDate).toLocaleDateString()}
                          </div>
                        </div>
                        {sow.approvalStage && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500">Current Stage:</p>
                            <p className="text-sm font-medium text-blue-600">{sow.approvalStage}</p>
                          </div>
                        )}
                        <div className="mt-3">
                          <Progress value={(getWorkflowStep(sow.status) / 5) * 100} className="h-2" />
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm text-gray-600">Amount</p>
                        <p className="text-xl font-bold text-blue-600">AED {sow.totalAmount.toLocaleString()}</p>
                        {sow.status === 'qty_scope_review' && (
                          <Button
                            size="sm"
                            className="mt-2 bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleSOWReview(sow)}
                          >
                            Review & Approve
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Rejected Tab */}
            <TabsContent value="rejected" className="space-y-4 mt-6">
              {sows.filter(sow => sow.status === 'rejected').map((sow) => (
                <Card key={sow.id} className={sow.status === 'rejected' ? 'border-red-200' : 'border-green-200'}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{sow.sowNumber}</h3>
                          <Badge className={getStatusBadge(sow.status).color}>
                            {getStatusBadge(sow.status).icon}
                            <span className="ml-1">{sow.status.toUpperCase()}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{sow.vendorName} • {sow.projectName}</p>
                        {sow.rejectionReason && (
                          <p className="text-sm text-red-600 mt-2">Reason: {sow.rejectionReason}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">AED {sow.totalAmount.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">{new Date(sow.createdDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Completed Tab */}
            <TabsContent value="completed" className="space-y-4 mt-6">
              {sows.filter(sow => sow.status === 'approved').map((sow) => (
                <Card key={sow.id} className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{sow.sowNumber}</h3>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{sow.projectName}</p>
                        <p className="text-sm text-blue-600 font-medium">AED {sow.totalAmount.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{sow.createdDate}</p>
                        <p className="text-xs text-green-600">Workflow Complete</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* PM Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              PM Review - {selectedSOW?.sowNumber}
            </DialogTitle>
            <DialogDescription>
              Review and approve/reject this vendor scope of work for estimation.
            </DialogDescription>
          </DialogHeader>

          {selectedSOW && (
            <div className="space-y-4">
              {/* SOW Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Project</p>
                  <p className="text-sm text-gray-900">{selectedSOW.projectName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Vendor</p>
                  <p className="text-sm text-gray-900">{selectedSOW.vendorName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Category</p>
                  <p className="text-sm text-gray-900">{selectedSOW.category}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Amount</p>
                  <p className="text-sm font-semibold text-blue-600">
                    AED {selectedSOW.totalAmount.toLocaleString()}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-700">BOQ Reference</p>
                  <p className="text-sm text-gray-900">{selectedSOW.boqReference}</p>
                </div>
              </div>

              {/* Approval Notes */}
              <div className="space-y-2">
                <Label htmlFor="approval-notes">
                  PM Review Notes <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="approval-notes"
                  placeholder="Enter your approval/rejection notes..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApprovalDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => submitPMApproval(false)}
              disabled={isProcessing}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Reject'}
            </Button>
            <Button
              onClick={() => submitPMApproval(true)}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Approve PM FLAG'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// SOW Card Component
interface SOWCardProps {
  sow: VendorSOW;
  viewMode: 'grid' | 'list';
  onReview?: (sow: VendorSOW) => void;
  showRejectionReason?: boolean;
  isCompleted?: boolean;
}

const SOWCard: React.FC<SOWCardProps> = ({
  sow,
  viewMode,
  onReview,
  showRejectionReason = false,
  isCompleted = false
}) => {
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, any> = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: <Clock className="w-3 h-3" /> },
      submitted: { color: 'bg-blue-100 text-blue-800', icon: <Send className="w-3 h-3" /> },
      qty_scope_review: { color: 'bg-amber-100 text-amber-800', icon: <AlertCircle className="w-3 h-3" /> },
      pm_approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      estimation_check: { color: 'bg-indigo-100 text-indigo-800', icon: <TrendingUp className="w-3 h-3" /> },
      approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      rejected: { color: 'bg-red-100 text-red-800', icon: <AlertCircle className="w-3 h-3" /> }
    };
    return statusConfig[status] || statusConfig.draft;
  };

  const getWorkflowStep = (status: string): number => {
    const steps: Record<string, number> = {
      draft: 0,
      submitted: 1,
      qty_scope_review: 2,
      pm_approved: 3,
      estimation_check: 4,
      approved: 5
    };
    return steps[status] || 0;
  };

  const borderClass = showRejectionReason ? 'border-red-200' : isCompleted ? 'border-green-200' : 'border-gray-200';

  return (
    <Card className={`${borderClass} hover:shadow-md transition-shadow`}>
      <CardContent className="p-3 sm:p-4">
        <div className={`flex ${viewMode === 'list' ? 'flex-col sm:flex-row sm:items-center' : 'flex-col'} gap-4`}>
          {/* Header */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{sow.sowNumber}</h3>
              <Badge className={`${getStatusBadge(sow.status).color} text-xs w-fit`}>
                {getStatusBadge(sow.status).icon}
                <span className="ml-1">
                  {isCompleted ? 'Completed' : sow.status.replace('_', ' ').toUpperCase()}
                </span>
              </Badge>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs sm:text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1 min-w-0">
                <Building2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{sow.vendorName}</span>
              </div>
              <div className="flex items-center gap-1 min-w-0">
                <Package className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{sow.projectName}</span>
              </div>
              <div className="flex items-center gap-1 min-w-0">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">BOQ: {sow.boqReference}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>{new Date(sow.createdDate).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Approval Stage */}
            {sow.approvalStage && (
              <div className="mb-3">
                <p className="text-xs text-gray-500">Current Stage:</p>
                <p className="text-xs sm:text-sm font-medium text-blue-600">{sow.approvalStage}</p>
              </div>
            )}

            {/* Rejection Reason */}
            {showRejectionReason && sow.rejectionReason && (
              <div className="mb-3">
                <p className="text-xs text-gray-500">Rejection Reason:</p>
                <p className="text-xs sm:text-sm text-red-600">{sow.rejectionReason}</p>
              </div>
            )}

            {/* Progress Bar */}
            {!isCompleted && (
              <div className="mb-3">
                <Progress value={(getWorkflowStep(sow.status) / 5) * 100} className="h-1.5 sm:h-2" />
              </div>
            )}
          </div>

          {/* Amount and Actions */}
          <div className={`${viewMode === 'list' ? 'flex items-center justify-between sm:flex-col sm:items-end' : 'flex items-center justify-between'} gap-2 sm:gap-4`}>
            <div className={`${viewMode === 'list' ? 'sm:text-right' : 'text-left sm:text-right'} min-w-0`}>
              <p className="text-xs sm:text-sm text-gray-600">Amount</p>
              <p className="text-base sm:text-lg lg:text-xl font-bold text-blue-600 truncate">
                AED {sow.totalAmount.toLocaleString()}
              </p>
              {isCompleted && (
                <p className="text-xs text-green-600">Workflow Complete</p>
              )}
            </div>

            {/* Action Button */}
            {sow.status === 'qty_scope_review' && onReview && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0"
                onClick={() => onReview(sow)}
              >
                <span className="hidden sm:inline">Review & Approve</span>
                <span className="sm:hidden">Review</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PMVendorManagement;