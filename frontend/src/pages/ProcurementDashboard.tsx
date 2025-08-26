import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PurchaseRequisitionForm from '@/components/forms/PurchaseRequisitionForm';
import VendorQuotationForm from '@/components/forms/VendorQuotationForm';
import ApprovalWorkflow from '@/components/workflow/ApprovalWorkflow';

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
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'in_progress';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  date: string;
  items: number;
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

const ProcurementDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'purchase' | 'vendor' | 'approval'>('dashboard');
  const [selectedPR, setSelectedPR] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Metrics data
  const metrics: MetricCard[] = [
    {
      title: 'Total Purchase Value',
      value: 'AED 1,245,890',
      change: 12.5,
      icon: Banknote,
      color: 'bg-green-500',
      trend: 'up'
    },
    {
      title: 'Active Requisitions',
      value: 28,
      change: -5.2,
      icon: FileText,
      color: 'bg-blue-500',
      trend: 'down'
    },
    {
      title: 'Pending Approvals',
      value: 15,
      change: 25.0,
      icon: Clock,
      color: 'bg-amber-500',
      trend: 'up'
    },
    {
      title: 'Vendor Performance',
      value: '92%',
      change: 3.8,
      icon: Award,
      color: 'bg-purple-500',
      trend: 'up'
    }
  ];

  // Purchase requests data
  const purchaseRequests: PurchaseRequest[] = [
    {
      id: '1',
      prNumber: 'PR-2024-001',
      project: 'Marina Bay Residences',
      requester: 'John Tan',
      amount: 45000,
      status: 'pending',
      priority: 'high',
      date: '2024-01-15',
      items: 12
    },
    {
      id: '2',
      prNumber: 'PR-2024-002',
      project: 'Orchard Office Fit-out',
      requester: 'Sarah Chen',
      amount: 78500,
      status: 'approved',
      priority: 'medium',
      date: '2024-01-14',
      items: 8
    },
    {
      id: '3',
      prNumber: 'PR-2024-003',
      project: 'Sentosa Resort',
      requester: 'David Lim',
      amount: 23400,
      status: 'in_progress',
      priority: 'urgent',
      date: '2024-01-13',
      items: 5
    }
  ];

  // Vendor quotations data
  const vendorQuotations: VendorQuotation[] = [
    {
      id: '1',
      vqNumber: 'VQ-2024-001',
      vendor: 'ABC Contractors Pte Ltd',
      project: 'Marina Bay Residences',
      amount: 125000,
      status: 'under_review',
      validUntil: '2024-02-15',
      items: 15
    },
    {
      id: '2',
      vqNumber: 'VQ-2024-002',
      vendor: 'XYZ Builders',
      project: 'Orchard Office',
      amount: 98000,
      status: 'approved',
      validUntil: '2024-02-20',
      items: 10
    }
  ];

  // Notifications
  const notifications = [
    {
      id: '1',
      type: 'approval',
      message: 'PR-2024-004 requires your approval',
      time: '5 min ago',
      urgent: true
    },
    {
      id: '2',
      type: 'update',
      message: 'Vendor quotation VQ-2024-003 has been updated',
      time: '1 hour ago',
      urgent: false
    },
    {
      id: '3',
      type: 'alert',
      message: 'Material delivery delayed for PR-2024-002',
      time: '2 hours ago',
      urgent: true
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'pending':
      case 'under_review':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'in_progress':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'negotiation':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'low':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  if (activeView === 'purchase') {
    return (
      <div>
        <Button
          onClick={() => setActiveView('dashboard')}
          className="mb-4 flex items-center gap-2"
          variant="outline"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back to Dashboard
        </Button>
        <PurchaseRequisitionForm />
      </div>
    );
  }

  if (activeView === 'vendor') {
    return (
      <div>
        <Button
          onClick={() => setActiveView('dashboard')}
          className="mb-4 flex items-center gap-2"
          variant="outline"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back to Dashboard
        </Button>
        <VendorQuotationForm />
      </div>
    );
  }

  if (activeView === 'approval' && selectedPR) {
    return (
      <div>
        <Button
          onClick={() => {
            setActiveView('dashboard');
            setSelectedPR(null);
          }}
          className="mb-4 flex items-center gap-2"
          variant="outline"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back to Dashboard
        </Button>
        <ApprovalWorkflow 
          documentType="purchase_requisition"
          documentId={selectedPR}
          currentUserRole="Estimation"
        />
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
              <Package className="w-7 h-7 text-blue-600" />
              Procurement & Costing Hub
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage purchase requisitions, vendor quotations, and approvals
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
            
            {/* Notifications */}
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              </Button>
              
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50"
                >
                  <div className="p-4 border-b">
                    <h3 className="font-semibold text-gray-800">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map(notif => (
                      <div key={notif.id} className="p-4 border-b hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-start gap-3">
                          {notif.urgent && <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />}
                          <div className="flex-1">
                            <p className="text-sm text-gray-800">{notif.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
            
            {/* Quick Actions */}
            <Button
              onClick={() => setActiveView('purchase')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New PR
            </Button>
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
      <Tabs defaultValue="requisitions" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-white shadow-sm">
          <TabsTrigger value="requisitions" className="data-[state=active]:bg-blue-50">
            <FileText className="w-4 h-4 mr-2" />
            Requisitions
          </TabsTrigger>
          <TabsTrigger value="quotations" className="data-[state=active]:bg-purple-50">
            <Users className="w-4 h-4 mr-2" />
            Quotations
          </TabsTrigger>
          <TabsTrigger value="approvals" className="data-[state=active]:bg-amber-50">
            <CheckCircle className="w-4 h-4 mr-2" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-green-50">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Purchase Requisitions Tab */}
        <TabsContent value="requisitions">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-red-600" />
                  Purchase Requisitions
                </CardTitle>
                <div className="flex items-center gap-3">
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
              <div className="overflow-x-auto">
                <table className="w-full">
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
                    {purchaseRequests.map((pr) => (
                      <motion.tr 
                        key={pr.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
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
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                {pr.requester.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
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
                          <Badge className={`${getStatusColor(pr.status)} border`}>
                            {pr.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pr.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPR(pr.id);
                                setActiveView('approval');
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
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

        {/* Vendor Quotations Tab */}
        <TabsContent value="quotations">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
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
              <div className="overflow-x-auto">
                <table className="w-full">
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
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
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

        {/* Approvals Tab */}
        <TabsContent value="approvals">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pending Approvals */}
            <Card className="shadow-md lg:col-span-2">
              <CardHeader className="bg-amber-50 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-5 h-5 text-amber-600" />
                  Pending Your Approval
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">PR-2024-00{item + 3}</span>
                          <Badge className="bg-amber-100 text-amber-700 border border-amber-300 text-xs">
                            Urgent
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">Marina Bay Residences - Phase 2</p>
                        <p className="text-xs text-gray-500 mt-1">Submitted by John Tan • 2 hours ago</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg text-gray-900">AED 45,000</p>
                        <Button size="sm" className="mt-2 bg-amber-600 hover:bg-amber-700">
                          Review
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="shadow-md">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="text-base">Approval Statistics</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Avg. Approval Time</span>
                    <span className="font-semibold text-sm">2.5 hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">This Week</span>
                    <span className="font-semibold text-sm">12 approved</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Rejection Rate</span>
                    <span className="font-semibold text-sm text-red-600">8%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Escalations</span>
                    <span className="font-semibold text-sm">3 cases</span>
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
                  Monthly Spending Trends
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
                  {['ABC Contractors', 'XYZ Builders', 'DEF Suppliers'].map((vendor, idx) => (
                    <div key={vendor} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          idx === 0 ? 'bg-gold-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{vendor}</p>
                          <p className="text-xs text-gray-500">95% on-time delivery</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">AED 245,000</p>
                        <p className="text-xs text-gray-500">12 orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
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
                          className="bg-blue-500 h-2 rounded-full"
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
                    { label: 'Process Efficiency', value: '89%', icon: Zap, color: 'text-blue-600' },
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
    </div>
  );
};

export default ProcurementDashboard;