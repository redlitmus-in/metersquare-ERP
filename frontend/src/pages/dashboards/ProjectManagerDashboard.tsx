import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  Briefcase, Users, Calendar, AlertTriangle, CheckCircle2, Clock,
  TrendingUp, Activity, Target, FileText, ArrowUpRight, ArrowDownRight,
  MoreVertical, Download, Filter, RefreshCw, Layers, GitBranch, Timer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { projectManagerService, PMDashboardData } from '@/roles/project-manager/services/projectManagerService';
import { PMMetricsCards } from '@/roles/project-manager/components/PMMetricsCards';
import { PurchaseApprovalCard } from '@/roles/project-manager/components/PurchaseApprovalCard';
import { ApprovalModal } from '@/roles/project-manager/components/ApprovalModal';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ProjectManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<PMDashboardData>({
    totalPurchases: 0,
    pendingApprovals: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
    averageApprovalTime: 0,
    recentPurchases: [],
    approvalTrends: [],
    categoryBreakdown: []
  });
  
  // Modal states
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'approve' | 'reject'>('approve');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const data = await projectManagerService.getPMDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle approval/rejection
  const handleApprove = (purchaseId: number) => {
    const purchase = dashboardData.recentPurchases.find(p => p.purchase_id === purchaseId);
    if (purchase) {
      setSelectedPurchase(purchase);
      setModalMode('approve');
      setApprovalModalOpen(true);
    }
  };

  const handleReject = (purchaseId: number) => {
    const purchase = dashboardData.recentPurchases.find(p => p.purchase_id === purchaseId);
    if (purchase) {
      setSelectedPurchase(purchase);
      setModalMode('reject');
      setApprovalModalOpen(true);
    }
  };

  const handleViewDetails = (purchaseId: number) => {
    navigate(`/project-manager/purchase/${purchaseId}`);
  };

  const handleConfirmApproval = async (data: any) => {
    try {
      setIsProcessing(true);
      
      let response;
      if (data.action === 'approve') {
        response = await projectManagerService.approvePurchase(data.purchaseId, data.comments);
      } else {
        response = await projectManagerService.rejectPurchase(
          data.purchaseId, 
          data.rejectionReason || '', 
          data.comments
        );
      }

      if (response.success) {
        toast.success(response.message || `Purchase ${data.action}d successfully`);

        // Refresh data
        await fetchDashboardData();
        setApprovalModalOpen(false);
        setSelectedPurchase(null);
      } else {
        throw new Error(response.error || 'Operation failed');
      }
    } catch (error: any) {
      console.error('Error processing approval:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to process request');
    } finally {
      setIsProcessing(false);
    }
  };

  // Use real data for timeline
  const timelineData = dashboardData.approvalTrends.map((trend, idx) => ({
    week: trend.month.substring(0, 3),
    planned: trend.approved + trend.rejected + trend.pending,
    actual: trend.approved
  })).slice(0, 6);

  // Resource Allocation Data from categories
  const resourceData = dashboardData.categoryBreakdown.slice(0, 4).map((cat, idx) => ({
    name: cat.category,
    value: Math.round((cat.value / Math.max(1, dashboardData.categoryBreakdown.reduce((sum, c) => sum + c.value, 0))) * 100),
    color: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'][idx] || '#6b7280'
  }));

  // Team Performance Radar
  const teamPerformance = [
    { skill: 'Technical', A: 85, B: 90 },
    { skill: 'Communication', A: 92, B: 85 },
    { skill: 'Problem Solving', A: 88, B: 87 },
    { skill: 'Time Management', A: 78, B: 92 },
    { skill: 'Quality', A: 90, B: 88 },
    { skill: 'Innovation', A: 85, B: 82 },
  ];

  // Task Distribution based on purchase status
  const totalPurchases = Math.max(1, dashboardData.totalPurchases);
  const taskData = [
    { 
      status: 'Approved', 
      count: dashboardData.approvedThisMonth, 
      percentage: Math.round((dashboardData.approvedThisMonth / totalPurchases) * 100) 
    },
    { 
      status: 'Pending', 
      count: dashboardData.pendingApprovals, 
      percentage: Math.round((dashboardData.pendingApprovals / totalPurchases) * 100) 
    },
    { 
      status: 'Rejected', 
      count: dashboardData.rejectedThisMonth, 
      percentage: Math.round((dashboardData.rejectedThisMonth / totalPurchases) * 100) 
    },
    { 
      status: 'In Process', 
      count: Math.max(0, totalPurchases - dashboardData.approvedThisMonth - dashboardData.pendingApprovals - dashboardData.rejectedThisMonth), 
      percentage: Math.max(0, 100 - Math.round((dashboardData.approvedThisMonth / totalPurchases) * 100) - Math.round((dashboardData.pendingApprovals / totalPurchases) * 100) - Math.round((dashboardData.rejectedThisMonth / totalPurchases) * 100)) 
    },
  ];

  // Key Metrics from real data (not used since we'll use PMMetricsCards)
  const metrics = [
    {
      title: 'Total Purchases',
      value: dashboardData.totalPurchases.toString(),
      change: '+12%',
      trend: 'up' as const,
      period: 'All time',
      icon: Briefcase,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Pending Approvals',
      value: dashboardData.pendingApprovals.toString(),
      change: dashboardData.pendingApprovals > 5 ? '+' + (dashboardData.pendingApprovals - 5) : '0',
      trend: dashboardData.pendingApprovals > 5 ? 'up' as const : 'down' as const,
      period: 'Awaiting review',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Approved This Month',
      value: dashboardData.approvedThisMonth.toString(),
      change: '+18%',
      trend: 'up' as const,
      period: 'Current month',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Avg Approval Time',
      value: `${dashboardData.averageApprovalTime} days`,
      change: '-0.5',
      trend: 'down' as const,
      period: 'Processing time',
      icon: Timer,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  // Recent purchases as active projects
  const activeProjects = dashboardData.recentPurchases.slice(0, 4).map(purchase => ({
    id: purchase.purchase_id,
    name: purchase.site_location,
    progress: purchase.current_status.status === 'approved' ? 100 : 
              purchase.current_status.status === 'rejected' ? 0 : 50,
    status: purchase.current_status.status === 'approved' ? 'on-track' :
            purchase.current_status.status === 'rejected' ? 'delayed' : 'at-risk',
    deadline: purchase.date,
    budget: `AED ${purchase.materials_summary.total_cost.toLocaleString()}`,
    purpose: purchase.purpose
  }));

  const pendingPurchases = dashboardData.recentPurchases.filter(p => p.current_status.role !== 'projectManager');

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Manager Dashboard</h1>
          <p className="text-gray-500 mt-1">Monitor and manage all active projects</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button onClick={fetchDashboardData} variant="outline" size="icon" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics - Use PMMetricsCards component */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <PMMetricsCards data={dashboardData} />
      )}

      {/* Project Timeline & Resource Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <CardTitle>Project Timeline Progress</CardTitle>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="planned" 
                  stroke="#3b82f6" 
                  fillOpacity={1}
                  fill="url(#colorPlanned)"
                  strokeWidth={2}
                  name="Planned %"
                />
                <Area 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#10b981" 
                  fillOpacity={1}
                  fill="url(#colorActual)"
                  strokeWidth={2}
                  name="Actual %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Resource Allocation */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-500" />
              <CardTitle>Resource Allocation</CardTitle>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={resourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {resourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {resourceData.map((resource) => (
                <div key={resource.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: resource.color }}
                    />
                    <span className="text-sm text-gray-600">{resource.name}</span>
                  </div>
                  <span className="text-sm font-medium">{resource.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance & Task Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Performance Radar */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <CardTitle>Team Performance Analysis</CardTitle>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={teamPerformance}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="skill" stroke="#888" fontSize={12} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#888" fontSize={10} />
                <Radar name="Team A" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Radar name="Team B" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Distribution */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-orange-500" />
              <CardTitle>Task Distribution</CardTitle>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {taskData.map((task, index) => (
              <div key={task.status} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{task.status}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{task.count} purchases</span>
                    <Badge variant="outline">{task.percentage}%</Badge>
                  </div>
                </div>
                <Progress 
                  value={task.percentage} 
                  className="h-2"
                  style={{
                    '--progress-background': index === 0 ? '#10b981' : 
                                            index === 1 ? '#f59e0b' :
                                            index === 2 ? '#ef4444' : '#3b82f6'
                  } as React.CSSProperties}
                />
              </div>
            ))}
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Purchases</span>
                <span className="text-lg font-bold">{dashboardData.totalPurchases}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Purchases / Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Purchase Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : pendingPurchases.length > 0 ? (
            <div className="space-y-4">
              {pendingPurchases.slice(0, 3).map((purchase) => (
                <PurchaseApprovalCard
                  key={purchase.purchase_id}
                  purchase={purchase}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onViewDetails={handleViewDetails}
                  isLoading={isProcessing}
                />
              ))}
            </div>
          ) : activeProjects.length > 0 ? (
            <div className="space-y-4">
              {activeProjects.map((project) => (
                <div key={project.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">Purchase #{project.id} - {project.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{project.purpose}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-500">Budget: {project.budget}</span>
                        <span className="text-sm text-gray-500">Date: {new Date(project.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Badge 
                      variant={
                        project.status === 'on-track' ? 'default' :
                        project.status === 'delayed' ? 'destructive' : 'secondary'
                      }
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No purchase requests available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Modal */}
      <ApprovalModal
        isOpen={approvalModalOpen}
        onClose={() => {
          setApprovalModalOpen(false);
          setSelectedPurchase(null);
        }}
        purchase={selectedPurchase}
        mode={modalMode}
        onConfirm={handleConfirmApproval}
        isLoading={isProcessing}
      />
    </div>
  );
};

export default ProjectManagerDashboard;