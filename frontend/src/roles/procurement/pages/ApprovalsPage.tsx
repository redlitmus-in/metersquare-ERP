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
  Download
} from 'lucide-react';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
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
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    fetchApprovalItems();
  }, []);

  const fetchApprovalItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch from procurement endpoint
      const response = await apiClient.get('/get_all_procurement');
      
      if (response.data.success) {
        // Transform the API data to match our frontend structure
        const transformedApprovals: ApprovalItem[] = response.data.procurement.map((item: any) => ({
          id: item.purchase_id.toString(),
          documentType: 'purchase_requisition' as const,
          documentId: `PR-${item.purchase_id}`,
          documentNumber: `PR-${item.purchase_id}`,
          title: item.purpose || 'Purchase Request',
          requester: item.requested_by || item.created_by,
          department: 'Site Operations',
          amount: item.materials?.reduce((sum: number, m: any) => sum + (m.quantity * m.cost), 0) || 0,
          priority: (item.materials?.[0]?.priority?.toLowerCase() || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
          status: (item.sender_latest_status === 'approved' ? 'approved' : 
                  item.sender_latest_status === 'rejected' ? 'rejected' : 
                  item.sender_latest_status === 'pending' ? 'pending' : 'under_review') as 'pending' | 'approved' | 'rejected' | 'under_review',
          submittedDate: item.date || item.created_at?.split('T')[0] || '',
          dueDate: new Date(new Date(item.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          currentApprover: item.status_receiver === 'projectManager' ? 'Project Manager' : 
                          item.status_receiver === 'accounts' ? 'Accounts' : 
                          item.status_receiver === 'technicalDirector' ? 'Technical Director' : 
                          item.status_receiver === 'estimation' ? 'Estimation' : 'Procurement',
          approvalLevel: item.status_sender === 'procurement' ? 1 : 
                        item.status_sender === 'projectManager' ? 2 : 
                        item.status_sender === 'estimation' ? 3 : 
                        item.status_sender === 'technicalDirector' ? 4 : 1,
          totalLevels: 5,
          project: `Project ${item.project_id}`,
          site_location: item.site_location,
          status_comments: item.status_comments,
          decision_date: item.decision_date
        }));
        
        setApprovalItems(transformedApprovals);
      } else {
        setError('Failed to fetch approvals');
      }
    } catch (err: any) {
      console.error('Error fetching approval items:', err);
      setError(err.response?.data?.error || 'Failed to fetch approval items');
      setApprovalItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter by status for tabs
  const getPendingApprovals = () => {
    return approvalItems.filter(item => item.status === 'pending' || item.status === 'under_review');
  };

  const getApprovedApprovals = () => {
    return approvalItems.filter(item => item.status === 'approved');
  };

  const getRejectedApprovals = () => {
    return approvalItems.filter(item => item.status === 'rejected');
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

  const pendingApprovals = getFilteredApprovals(getPendingApprovals());
  const approvedApprovals = getFilteredApprovals(getApprovedApprovals());
  const rejectedApprovals = getFilteredApprovals(getRejectedApprovals());

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
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-orange-600">
                  {pendingApprovals.length}
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
                <p className="text-sm text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-blue-600">
                  {approvalItems.length}
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
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {approvedApprovals.length}
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
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">
                  {rejectedApprovals.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
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
                aria-label="Filter by document type"
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
                aria-label="Filter by status"
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
          <ModernLoadingSpinners variant="pulse-wave" size="lg" />
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
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex space-x-4 border-b">
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'pending' 
                  ? 'text-orange-600 border-b-2 border-orange-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('pending')}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending ({pendingApprovals.length})
              </div>
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'approved' 
                  ? 'text-green-600 border-b-2 border-green-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('approved')}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Approved ({approvedApprovals.length})
              </div>
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'rejected' 
                  ? 'text-red-600 border-b-2 border-red-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('rejected')}
            >
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Rejected ({rejectedApprovals.length})
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <Card>
            <CardContent className="p-6">
              {activeTab === 'pending' && (
                <div>
                  {pendingApprovals.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No pending approvals</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {pendingApprovals.map(approval => (
                        <ApprovalCard 
                          key={approval.id} 
                          approval={approval} 
                          showActions={user?.role_id === UserRole.PROCUREMENT || user?.role_id === 'procurement'} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'approved' && (
                <div>
                  {approvedApprovals.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No approved purchases</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {approvedApprovals.map(approval => (
                        <ApprovalCard 
                          key={approval.id} 
                          approval={approval} 
                          showActions={false} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'rejected' && (
                <div>
                  {rejectedApprovals.length === 0 ? (
                    <div className="text-center py-12">
                      <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No rejected purchases</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {rejectedApprovals.map(approval => (
                        <ApprovalCard 
                          key={approval.id} 
                          approval={approval} 
                          showActions={false} 
                        />
                      ))}
                    </div>
                  )}
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
              currentUserRole={String(user?.role_id || user?.role || '')}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalsPage;