import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  FileText, 
  User,
  Calendar,
  DollarSign,
  Building,
  Search,
  Filter,
  Download,
  Loader2
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { toast } from 'sonner';
import { apiClient } from '@/api/config';
import ApprovalWorkflow from '@/components/workflow/ApprovalWorkflow';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ApprovalItem {
  id: string;
  documentType: 'purchase_requisition' | 'vendor_quotation' | 'material_requisition' | 'delivery_note';
  documentId: string;
  documentNumber: string;
  title: string;
  requester: string;
  department: string;
  amount: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  submittedDate: string;
  dueDate: string;
  currentApprover: string;
  approvalLevel: number;
  totalLevels: number;
  project?: string;
}

const ApprovalsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [approvalItems, setApprovalItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);

  useEffect(() => {
    fetchApprovalItems();
  }, []);

  const fetchApprovalItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with actual API call when backend is ready
      // const response = await apiClient.get('/approvals');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data for now - will be replaced with real API call
      const mockApprovals: ApprovalItem[] = [
        {
          id: '1',
          documentType: 'purchase_requisition',
          documentId: 'PR-001',
          documentNumber: 'PR-2024-001',
          title: 'Construction Materials - Phase 1',
          requester: 'Site Supervisor',
          department: 'Site Operations',
          amount: 45000,
          priority: 'high',
          status: 'pending',
          submittedDate: '2024-09-01',
          dueDate: '2024-09-05',
          currentApprover: user?.role_id === UserRole.PROCUREMENT ? 'You' : 'Procurement',
          approvalLevel: 1,
          totalLevels: 4,
          project: 'Marina Bay Residences'
        },
        {
          id: '2',
          documentType: 'vendor_quotation',
          documentId: 'VQ-001',
          documentNumber: 'VQ-2024-002',
          title: 'Electrical Components Quotation',
          requester: 'Procurement',
          department: 'Procurement',
          amount: 32000,
          priority: 'medium',
          status: 'under_review',
          submittedDate: '2024-08-30',
          dueDate: '2024-09-03',
          currentApprover: user?.role_id === UserRole.PROJECT_MANAGER ? 'You' : 'Project Manager',
          approvalLevel: 2,
          totalLevels: 3,
          project: 'Orchard Office Tower'
        },
        {
          id: '3',
          documentType: 'material_requisition',
          documentId: 'MR-001',
          documentNumber: 'MR-2024-001',
          title: 'Factory Production Materials',
          requester: 'Factory Supervisor',
          department: 'Production',
          amount: 15000,
          priority: 'urgent',
          status: 'pending',
          submittedDate: '2024-09-02',
          dueDate: '2024-09-04',
          currentApprover: user?.role_id === UserRole.PROCUREMENT ? 'You' : 'Procurement',
          approvalLevel: 1,
          totalLevels: 3
        }
      ];
      
      setApprovalItems(mockApprovals);
    } catch (err: any) {
      console.error('Error fetching approval items:', err);
      setError(err.response?.data?.error || 'Failed to fetch approval items');
      setApprovalItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Role-based filtering
  const getMyApprovals = () => {
    return approvalItems.filter(item => item.currentApprover === 'You');
  };

  const getAllApprovals = () => {
    return approvalItems;
  };

  // Filter approvals based on search and filters
  const getFilteredApprovals = (items: ApprovalItem[]) => {
    let filtered = items;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.requester.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.project?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by document type
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.documentType === filterType);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    return filtered;
  };

  const myApprovals = getFilteredApprovals(getMyApprovals());
  const allApprovals = getFilteredApprovals(getAllApprovals());

  const handleApprove = async (approvalId: string) => {
    try {
      // TODO: Replace with actual API call
      // await apiClient.post(`/approvals/${approvalId}/approve`);
      
      setApprovalItems(prev => 
        prev.map(item => 
          item.id === approvalId 
            ? { ...item, status: 'approved' as const }
            : item
        )
      );
      toast.success('Item approved successfully');
    } catch (error) {
      toast.error('Failed to approve item');
    }
  };

  const handleReject = async (approvalId: string) => {
    try {
      // TODO: Replace with actual API call
      // await apiClient.post(`/approvals/${approvalId}/reject`);
      
      setApprovalItems(prev => 
        prev.map(item => 
          item.id === approvalId 
            ? { ...item, status: 'rejected' as const }
            : item
        )
      );
      toast.success('Item rejected successfully');
    } catch (error) {
      toast.error('Failed to reject item');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'under_review': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase_requisition': return 'Purchase Requisition';
      case 'vendor_quotation': return 'Vendor Quotation';
      case 'material_requisition': return 'Material Requisition';
      case 'delivery_note': return 'Delivery Note';
      default: return 'Document';
    }
  };

  const ApprovalCard: React.FC<{ approval: ApprovalItem; showActions?: boolean }> = ({ 
    approval, 
    showActions = false 
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-semibold text-gray-900">{approval.documentNumber}</span>
              <Badge className={`${getPriorityColor(approval.priority)} border text-xs`}>
                {approval.priority.toUpperCase()}
              </Badge>
              <Badge className={`${getStatusColor(approval.status)} border text-xs`}>
                {approval.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            
            <h3 className="text-base font-medium text-gray-900 mb-2">{approval.title}</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{approval.requester}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                <span>{approval.department}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>AED {approval.amount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Due: {approval.dueDate}</span>
              </div>
            </div>
            
            {approval.project && (
              <div className="text-sm text-gray-600 mb-3">
                <span className="font-medium">Project:</span> {approval.project}
              </div>
            )}
            
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">
                Type: {getDocumentTypeLabel(approval.documentType)}
              </span>
              <span className="text-gray-500">
                Level: {approval.approvalLevel}/{approval.totalLevels}
              </span>
              <span className="text-gray-500">
                Current: {approval.currentApprover}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 ml-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedApproval(approval);
                setShowWorkflowModal(true);
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </Button>
            
            {showActions && approval.currentApprover === 'You' && approval.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleApprove(approval.id)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReject(approval.id)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Approvals Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage workflow approvals and track document status
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending My Action</p>
                <p className="text-2xl font-bold text-orange-600">
                  {myApprovals.filter(a => a.status === 'pending').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Approvals</p>
                <p className="text-2xl font-bold text-blue-600">
                  {allApprovals.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {allApprovals.filter(a => a.status === 'approved').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {allApprovals.filter(a => 
                    a.status === 'pending' && new Date(a.dueDate) < new Date()
                  ).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by document number, title, or requester..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="purchase_requisition">Purchase Requisitions</option>
                <option value="vendor_quotation">Vendor Quotations</option>
                <option value="material_requisition">Material Requisitions</option>
                <option value="delivery_note">Delivery Notes</option>
              </select>
              <select
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <Button variant="outline" className="px-4">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
              <Button variant="outline" className="px-4">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading approvals...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchApprovalItems} variant="outline">
            Try Again
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Approvals */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Pending My Approval ({myApprovals.filter(a => a.status === 'pending').length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {myApprovals.filter(a => a.status === 'pending').length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No pending approvals</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myApprovals
                    .filter(a => a.status === 'pending')
                    .map(approval => (
                      <ApprovalCard 
                        key={approval.id} 
                        approval={approval} 
                        showActions={true} 
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Approvals */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                All Approvals ({allApprovals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {allApprovals.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No approvals found</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {allApprovals.map(approval => (
                    <ApprovalCard 
                      key={approval.id} 
                      approval={approval} 
                      showActions={false} 
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Approval Workflow Modal */}
      <Dialog open={showWorkflowModal} onOpenChange={setShowWorkflowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Approval Workflow - {selectedApproval?.documentNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedApproval && (
            <ApprovalWorkflow 
              documentType={selectedApproval.documentType}
              documentId={selectedApproval.documentId}
              currentUserRole={user?.role_id || ''}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalsPage;