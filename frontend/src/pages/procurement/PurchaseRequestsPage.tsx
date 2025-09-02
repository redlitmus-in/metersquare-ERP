import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Eye, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import PurchaseRequisitionForm from '@/components/forms/PurchaseRequisitionForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { toast } from 'sonner';

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

  // Mock data for purchase requests
  const [purchaseRequests, setPurchaseRequests] = useState([
    {
      id: 'PR-2024-001',
      project: 'Mall of Asia - Phase 2',
      requestor: 'John Smith',
      requestorId: 'siteSupervisor',
      department: 'Site Operations',
      date: '2024-01-15',
      status: 'pending',
      amount: 45000,
      items: 5,
      priority: 'high',
      currentApprover: 'procurement'
    },
    {
      id: 'PR-2024-002',
      project: 'Tech Park Building A',
      requestor: 'Sarah Johnson',
      requestorId: 'siteSupervisor2',
      department: 'MEP',
      date: '2024-01-16',
      status: 'approved',
      amount: 125000,
      items: 12,
      priority: 'medium',
      currentApprover: null
    },
    {
      id: 'PR-2024-003',
      project: 'Residential Complex B',
      requestor: 'Mike Wilson',
      requestorId: 'siteSupervisor3',
      department: 'Factory',
      date: '2024-01-17',
      status: 'rejected',
      amount: 35000,
      items: 3,
      priority: 'low',
      currentApprover: null
    },
    {
      id: 'PR-2024-004',
      project: 'Office Tower C',
      requestor: 'Emily Davis',
      requestorId: 'siteSupervisor',
      department: 'Procurement',
      date: '2024-01-18',
      status: 'in_review',
      amount: 85000,
      items: 8,
      priority: 'high',
      currentApprover: 'projectManager'
    }
  ]);

  // Role-based permissions
  const canCreateRequest = () => {
    const supervisorRoles = [UserRole.SITE_SUPERVISOR, UserRole.MEP_SUPERVISOR, UserRole.FACTORY_SUPERVISOR];
    const roleStrings = ['siteSupervisor', 'mepSupervisor', 'factorySupervisor'];
    return supervisorRoles.includes(user?.role_id as UserRole) || roleStrings.includes(user?.role_id as string);
  };

  const canApproveRequest = () => {
    return [UserRole.PROCUREMENT, UserRole.PROJECT_MANAGER, UserRole.TECHNICAL_DIRECTOR].includes(user?.role_id as UserRole);
  };

  const canEditRequest = (request: any) => {
    // Can edit if you created it and it's still pending
    if (request.requestorId === user?.user_id && request.status === 'pending') {
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
    return request.requestorId === user?.user_id && request.status === 'pending';
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
      filtered = filtered.filter(req => req.requestorId === user.user_id || req.requestorId === 'siteSupervisor');
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
    <div className="p-6 space-y-6">
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

      {/* Role-specific Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isSiteSupervisor && (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">My Requests</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {filteredRequests.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {filteredRequests.filter(r => r.status === 'pending').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {user?.role_id === UserRole.PROCUREMENT && (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">To Process</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {purchaseRequests.filter(r => r.currentApprover === 'procurement').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{purchaseRequests.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredRequests.filter(r => r.status === 'approved').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{filteredRequests.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
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
          <div className="overflow-x-auto">
            <table className="w-full">
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
                      ₹{request.amount.toLocaleString()}
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
        </CardContent>
      </Card>

      {/* Purchase Request Form Dialog (for non-Site Supervisors) */}
      {!isSiteSupervisor && (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Purchase Request</DialogTitle>
            </DialogHeader>
            <PurchaseRequisitionForm onClose={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PurchaseRequestsPage;