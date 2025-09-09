import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Download, Eye, Edit2, Trash2, CheckCircle, XCircle, FileText, Clock, AlertTriangle, Package, Mail, AlertCircle as AlertCircleIcon } from 'lucide-react';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import PurchaseRequisitionForm from '@/components/forms/PurchaseRequisitionForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { toast } from 'sonner';
import { apiClient, API_ENDPOINTS } from '@/api/config';
import { SimpleHorizontalCards } from '@/components/ui/SimpleHorizontalCards';

const PurchaseRequestsPage: React.FC = () => {
  const { user } = useAuthStore();
  
  // Check if user is Site Supervisor (handle both enum and string values)
  const isSiteSupervisor = user?.role_id === UserRole.SITE_SUPERVISOR || 
                           user?.role_id === 'siteSupervisor' ||
                           user?.role_id === 'SITE_SUPERVISOR';
  
  // State for form modal (for non-Site Supervisors)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('pending');

  // Initialize empty purchase requests - will be fetched from API
  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch purchase requests from API
  useEffect(() => {
    fetchPurchaseRequests();
  }, []);

  const fetchPurchaseRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the correct endpoint for procurement role
      const response = await apiClient.get(API_ENDPOINTS.PROCUREMENT.ALL_PURCHASES);
      
      if (response.data.success && response.data.procurement) {
        // Transform the API data to match our frontend structure
        const transformedRequests = response.data.procurement.map((pr: any) => {
          // Calculate total amount from materials
          const totalAmount = pr.materials?.reduce((sum: number, m: any) => 
            sum + (m.quantity * m.cost), 0
          ) || 0;
          
          // Get priority from first material (or default to 'Medium')
          const priority = pr.materials?.[0]?.priority || 'Medium';
          
          // Determine rejection type and status
          let rejectionType = null;
          let status = 'pending';
          
          if (pr.sender_latest_status === 'rejected') {
            status = 'rejected';
            // Check who rejected based on status_role
            if (pr.status_role === 'projectManager') {
              rejectionType = 'pm';
            } else if (pr.status_role === 'estimation') {
              rejectionType = 'estimation';
            } else if (pr.status_role === 'technicalDirector') {
              rejectionType = 'technical';
            }
          } else if (pr.sender_latest_status === 'approved') {
            status = 'approved';
          }
          
          return {
            id: `PR-${pr.purchase_id}`,
            purchase_id: pr.purchase_id,
            project: pr.project_id ? `Project ${pr.project_id}` : 'N/A',
            requestor: pr.requested_by || pr.created_by,
            requestorId: pr.user_id,
            department: 'Site Operations',
            date: pr.date ? new Date(pr.date).toLocaleDateString() : new Date(pr.created_at).toLocaleDateString(),
            status: status,
            rejectionType: rejectionType,
            amount: totalAmount,
            items: pr.materials?.length || 0,
            priority: priority.toLowerCase(),
            site_location: pr.site_location,
            purpose: pr.purpose,
            materials: pr.materials || [],
            currentApprover: pr.status_receiver,
            statusComments: pr.status_comments,
            statusRole: pr.status_role,
            statusSender: pr.status_sender,
            senderStatus: pr.sender_latest_status,
            receiverStatus: pr.receiver_latest_status
          };
        });
        
        setPurchaseRequests(transformedRequests);
      } else {
        setError('Failed to fetch purchase requests');
      }
    } catch (err: any) {
      console.error('Error fetching purchase requests:', err);
      setError(err.response?.data?.error || 'Failed to fetch purchase requests');
      setPurchaseRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Role-based permissions
  const canCreateRequest = () => {
    const supervisorRoles = [UserRole.SITE_SUPERVISOR, UserRole.MEP_SUPERVISOR];
    const roleStrings = ['siteSupervisor', 'mepSupervisor'];
    return supervisorRoles.includes(user?.role_id as UserRole) || roleStrings.includes(user?.role_id as string);
  };

  const canApproveRequest = () => {
    return [UserRole.PROCUREMENT, UserRole.PROJECT_MANAGER, UserRole.TECHNICAL_DIRECTOR].includes(user?.role_id as UserRole);
  };

  const canEditRequest = (request: any) => {
    // Can edit if you created it and it's still pending
    if (request.requestorId === user?.id && request.status === 'pending') {
      return true;
    }
    // Procurement can edit any pending request
    if (user?.role_id === UserRole.PROCUREMENT && request.status === 'pending') {
      return true;
    }
    return false;
  };

  const canDeleteRequest = (request: any) => {
    // Only creator can delete, and only if pending
    return request.requestorId === user?.id && request.status === 'pending';
  };

  const handleApprove = (requestId: string) => {
    setPurchaseRequests(prev => 
      prev.map(req => 
        req.id === requestId 
          ? { ...req, status: 'approved', currentApprover: null }
          : req
      )
    );
    toast.success('Purchase request approved successfully');
  };

  const handleReject = (requestId: string) => {
    setPurchaseRequests(prev => 
      prev.map(req => 
        req.id === requestId 
          ? { ...req, status: 'rejected', currentApprover: null }
          : req
      )
    );
    toast.error('Purchase request rejected');
  };

  const handleSendMail = async (requestId: string) => {
    try {
      // Find the request details
      const request = purchaseRequests.find(r => r.id === requestId);
      if (!request) {
        toast.error('Request not found');
        return;
      }

      // Call API to send email for approval using proper endpoint
      const response = await apiClient.post(API_ENDPOINTS.PURCHASE.EMAIL(request.purchase_id));

      if (response.data.success) {
        toast.success('Approval email sent successfully');
        // Refresh the data to get updated status
        await fetchPurchaseRequests();
      } else {
        toast.error('Failed to send approval email');
      }
    } catch (error: any) {
      console.error('Error sending approval email:', error);
      toast.error(error.response?.data?.error || 'Failed to send approval email');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'in_review': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get counts for tabs - memoized to avoid recalculation
  const tabCounts = useMemo(() => {
    const counts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      pmRejected: 0,
      estimationRejected: 0
    };

    purchaseRequests.forEach(request => {
      if (request.status === 'pending') {
        counts.pending++;
      } else if (request.status === 'approved') {
        counts.approved++;
      } else if (request.status === 'rejected') {
        counts.rejected++;
        if (request.rejectionType === 'pm') {
          counts.pmRejected++;
        } else if (request.rejectionType === 'estimation') {
          counts.estimationRejected++;
        }
      }
    });

    return counts;
  }, [purchaseRequests]);

  // Filter requests based on user role and tab
  const filteredRequests = useMemo(() => {
    let filtered = purchaseRequests;

    // Site Supervisors only see their own requests
    if (isSiteSupervisor) {
      filtered = filtered.filter(req => req.requestorId === user?.id || req.requestorId === 'siteSupervisor');
    }

    // Filter by tab
    if (activeTab === 'pending') {
      filtered = filtered.filter(request => request.status === 'pending');
    } else if (activeTab === 'approved') {
      filtered = filtered.filter(request => request.status === 'approved');
    } else if (activeTab === 'rejected') {
      filtered = filtered.filter(request => request.status === 'rejected');
    } else if (activeTab === 'pm-rejected') {
      filtered = filtered.filter(request => request.status === 'rejected' && request.rejectionType === 'pm');
    } else if (activeTab === 'estimation-rejected') {
      filtered = filtered.filter(request => request.status === 'rejected' && request.rejectionType === 'estimation');
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(request => 
        request.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requestor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status (from dropdown)
    if (filterStatus !== 'all') {
      filtered = filtered.filter(request => request.status === filterStatus);
    }

    return filtered;
  }, [purchaseRequests, activeTab, searchTerm, filterStatus, isSiteSupervisor, user?.id]);

  // Get role-specific title
  const getPageTitle = () => {
    if (isSiteSupervisor) {
      return 'My Purchase Requests';
    }
    switch (user?.role_id) {
      case UserRole.PROCUREMENT:
      case 'procurement':
        return 'Purchase Request Processing';
      case UserRole.PROJECT_MANAGER:
      case 'projectManager':
        return 'Purchase Request Approvals';
      default:
        return 'Purchase Requests';
    }
  };

  // For Site Supervisor, always show the form directly
  if (isSiteSupervisor) {
    return (
      <div className="max-w-7xl mx-auto">
        <PurchaseRequisitionForm 
          onClose={() => {
            // Optional: Navigate back or show list
            console.log('Form closed');
          }} 
          showAsPage={true}
        />
      </div>
    );
  }

  return (
    <div className="w-full px-3 py-4 sm:p-4 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{getPageTitle()}</h1>
          <p className="text-gray-600 mt-1">
            {isSiteSupervisor && 'Create and track your purchase requisitions'}
            {user?.role_id === UserRole.PROCUREMENT && 'Process and manage incoming purchase requests'}
            {user?.role_id === UserRole.PROJECT_MANAGER && 'Review and approve purchase requests'}
          </p>
        </div>
        {canCreateRequest() && !isFormOpen && (
          <Button 
            onClick={() => setIsFormOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Purchase Request
          </Button>
        )}
      </div>

      {/* Role-specific Stats Cards - Horizontal scroll on mobile */}
      {isSiteSupervisor && (
        <SimpleHorizontalCards 
          cards={[
            {
              id: 'my-requests',
              title: 'My Requests',
              value: filteredRequests.length,
              icon: <FileText className="w-4 h-4 text-blue-600" />,
              bgColor: 'bg-blue-100'
            },
            {
              id: 'pending',
              title: 'Pending',
              value: tabCounts.pending,
              icon: <Clock className="w-4 h-4 text-yellow-600" />,
              bgColor: 'bg-yellow-100'
            },
            {
              id: 'approved',
              title: 'Approved',
              value: tabCounts.approved,
              icon: <CheckCircle className="w-4 h-4 text-green-600" />,
              bgColor: 'bg-green-100'
            },
            {
              id: 'rejected',
              title: 'Rejected',
              value: tabCounts.rejected,
              icon: <XCircle className="w-4 h-4 text-red-600" />,
              bgColor: 'bg-red-100'
            }
          ]}
        />
      )}

      {user?.role_id === UserRole.PROCUREMENT && (
        <SimpleHorizontalCards 
          cards={[
            {
              id: 'to-process',
              title: 'To Process',
              value: purchaseRequests.filter(r => r.currentApprover === 'procurement').length,
              icon: <Package className="w-4 h-4 text-orange-600" />,
              bgColor: 'bg-orange-100',
              trend: {
                value: 12.5,
                isUp: true
              }
            },
            {
              id: 'total-requests',
              title: 'Total Requests',
              value: purchaseRequests.length,
              icon: <FileText className="w-4 h-4 text-gray-600" />,
              bgColor: 'bg-gray-100'
            },
            {
              id: 'approved',
              title: 'Approved',
              value: tabCounts.approved,
              icon: <CheckCircle className="w-4 h-4 text-green-600" />,
              bgColor: 'bg-green-100'
            },
            {
              id: 'total-value',
              title: 'Total Value',
              value: `AED ${filteredRequests.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}`,
              icon: <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>,
              bgColor: 'bg-purple-100'
            }
          ]}
        />
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by PR number, project, or requestor..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Filter by status"
                title="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_review">In Review</option>
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

      {/* Purchase Requests Table with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>
            {user?.role_id === UserRole.PROCUREMENT && 'All Purchase Requests'}
            {isSiteSupervisor && 'My Purchase Requests'}
            {user?.role_id === UserRole.PROJECT_MANAGER && 'Requests for Approval'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tabs for different statuses */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid grid-cols-5 w-full max-w-4xl bg-gray-100/50">
              <TabsTrigger value="pending" className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <span className="flex items-center gap-2">
                  Pending
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                    {tabCounts.pending}
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger value="approved" className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <span className="flex items-center gap-2">
                  Approved
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                    {tabCounts.approved}
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger value="rejected" className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <span className="flex items-center gap-2">
                  Rejected
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">
                    {tabCounts.rejected}
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger value="pm-rejected" className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <span className="flex items-center gap-2">
                  PM Rejected
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium">
                    {tabCounts.pmRejected}
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger value="estimation-rejected" className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <span className="flex items-center gap-2">
                  Estimation Rejected
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium">
                    {tabCounts.estimationRejected}
                  </span>
                </span>
              </TabsTrigger>
            </TabsList>

            {/* Alert Messages for Rejection Tabs */}
            {activeTab === 'pm-rejected' && tabCounts.pmRejected > 0 && (
              <Alert className="mt-4 border-orange-200 bg-orange-50">
                <AlertCircleIcon className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  These purchase requests were rejected by the Project Manager.
                  Review the rejection reasons and make necessary revisions before resubmitting for approval.
                </AlertDescription>
              </Alert>
            )}

            {activeTab === 'estimation-rejected' && tabCounts.estimationRejected > 0 && (
              <Alert className="mt-4 border-purple-200 bg-purple-50">
                <AlertCircleIcon className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-800">
                  These purchase requests were rejected by the Estimation team.
                  Review the technical specifications and cost estimates before resubmitting.
                </AlertDescription>
              </Alert>
            )}

            {activeTab === 'rejected' && tabCounts.rejected > 0 && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertCircleIcon className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  These purchase requests have been rejected.
                  Check the rejection reason and revise accordingly before resubmitting.
                </AlertDescription>
              </Alert>
            )}

            {/* Tab Content for each status */}
            <TabsContent value={activeTab} className="mt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <ModernLoadingSpinners variant="pulse-wave" size="lg" />
                  <span className="ml-4 text-gray-600">Loading purchase requests...</span>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-500 mb-4">{error}</p>
                  <Button onClick={fetchPurchaseRequests} variant="outline">
                    Try Again
                  </Button>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No purchase requests found</p>
                  {canCreateRequest() && (
                    <Button onClick={() => setIsFormOpen(true)} className="bg-red-500 hover:bg-red-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Request
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto mobile-scroll-x -mx-3 px-3 sm:mx-0 sm:px-0">
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            PR Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Project
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Requestor
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
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
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRequests.map((request) => (
                          <tr key={request.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{request.id}</span>
                                {request.date && (
                                  <span className="text-xs text-gray-500">{request.date}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {request.project}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm text-gray-900">{request.requestor}</span>
                                {request.site_location && (
                                  <span className="text-xs text-gray-500">{request.site_location}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {request.department}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {request.date}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              AED {request.amount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={getPriorityColor(request.priority)}>
                                {request.priority}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <Badge className={getStatusColor(request.status)}>
                                  {request.status.replace('_', ' ')}
                                </Badge>
                                {request.status === 'rejected' && request.statusRole && (
                                  <span className="text-xs text-gray-500">
                                    Rejected by {request.statusRole}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex gap-2">
                                <button 
                                  className="text-blue-600 hover:text-blue-800"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                
                                {canEditRequest(request) && (
                                  <button 
                                    className="text-yellow-600 hover:text-yellow-800"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                                
                                {canDeleteRequest(request) && (
                                  <button 
                                    className="text-red-600 hover:text-red-800"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                                
                                {canApproveRequest() && request.status === 'pending' && (
                                  <>
                                    <button 
                                      onClick={() => handleSendMail(request.id)}
                                      className="text-blue-600 hover:text-blue-800"
                                      title="Send Approval Email"
                                    >
                                      <Mail className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleApprove(request.id)}
                                      className="text-green-600 hover:text-green-800"
                                      title="Approve"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleReject(request.id)}
                                      className="text-red-600 hover:text-red-800"
                                      title="Reject"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile scroll hint */}
                  <div className="sm:hidden text-center mt-2">
                    <span className="text-xs text-gray-500">← Swipe to see more →</span>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Purchase Request Form Dialog (for non-Site Supervisors) */}
      {!isSiteSupervisor && (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" hideCloseButton>
            <PurchaseRequisitionForm onClose={() => {
              setIsFormOpen(false);
              fetchPurchaseRequests(); // Refresh data after form submission
            }} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PurchaseRequestsPage;