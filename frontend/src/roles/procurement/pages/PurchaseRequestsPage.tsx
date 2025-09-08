import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Eye, Edit2, Trash2, CheckCircle, XCircle, FileText, Clock, AlertTriangle, Package, Mail, Send } from 'lucide-react';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import PurchaseRequisitionForm from '@/components/forms/PurchaseRequisitionForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { toast } from 'sonner';
import { apiClient } from '@/api/config';
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
      const response = await apiClient.get('/all_purchase');
      
      if (response.data.success) {
        // Transform the API data to match our frontend structure
        const transformedRequests = response.data.purchase_requests.map((pr: any) => {
          // Find materials for this purchase request
          const materials = response.data.materials.filter((m: any) => 
            pr.material_ids?.includes(m.material_id)
          );
          
          // Calculate total amount from materials
          const totalAmount = materials.reduce((sum: number, m: any) => 
            sum + (m.quantity * m.cost), 0
          );
          
          // Get priority from first material (or default to 'Medium')
          const priority = materials[0]?.priority || 'Medium';
          
          return {
            id: `PR-${pr.purchase_id}`,
            purchase_id: pr.purchase_id,
            project: pr.project_id ? `Project ${pr.project_id}` : 'N/A',
            requestor: pr.requested_by || pr.created_by,
            requestorId: pr.created_by,
            department: 'Site Operations',
            date: pr.date || pr.created_at,
            status: 'pending', // Default status, will be updated from workflow
            amount: totalAmount,
            items: materials.length,
            priority: priority.toLowerCase(),
            site_location: pr.site_location,
            purpose: pr.purpose,
            materials: materials,
            currentApprover: 'procurement'
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

      // Call API to send email for approval
      const response = await apiClient.post('/send_approval_email', {
        purchase_id: request.purchase_id,
        requestor: request.requestor,
        amount: request.amount,
        project: request.project,
        current_approver: request.currentApprover,
        purpose: request.purpose,
        site_location: request.site_location
      });

      if (response.data.success) {
        toast.success('Approval email sent successfully');
        // Update the status to show email was sent
        setPurchaseRequests(prev => 
          prev.map(req => 
            req.id === requestId 
              ? { ...req, emailSent: true }
              : req
          )
        );
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

  // Filter requests based on user role
  const getFilteredRequests = () => {
    let filtered = purchaseRequests;

    // Site Supervisors only see their own requests
    if (isSiteSupervisor) {
      filtered = filtered.filter(req => req.requestorId === user?.id || req.requestorId === 'siteSupervisor');
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(request => 
        request.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requestor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(request => request.status === filterStatus);
    }

    return filtered;
  };

  const filteredRequests = getFilteredRequests();

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
              value: filteredRequests.filter(r => r.status === 'pending').length,
              icon: <Clock className="w-4 h-4 text-yellow-600" />,
              bgColor: 'bg-yellow-100'
            },
            {
              id: 'approved',
              title: 'Approved',
              value: filteredRequests.filter(r => r.status === 'approved').length,
              icon: <CheckCircle className="w-4 h-4 text-green-600" />,
              bgColor: 'bg-green-100'
            },
            {
              id: 'rejected',
              title: 'Rejected',
              value: filteredRequests.filter(r => r.status === 'rejected').length,
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
              value: filteredRequests.filter(r => r.status === 'approved').length,
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

      {/* Purchase Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {user?.role_id === UserRole.PROCUREMENT && 'All Purchase Requests'}
            {isSiteSupervisor && 'My Purchase Requests'}
            {user?.role_id === UserRole.PROJECT_MANAGER && 'Requests for Approval'}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {request.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.project}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.requestor}
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
                      <Badge className={getStatusColor(request.status)}>
                        {request.status.replace('_', ' ')}
                      </Badge>
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
        </CardContent>
      </Card>

      {/* Purchase Request Form Dialog (for non-Site Supervisors) */}
      {!isSiteSupervisor && (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Purchase Request</DialogTitle>
            </DialogHeader>
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