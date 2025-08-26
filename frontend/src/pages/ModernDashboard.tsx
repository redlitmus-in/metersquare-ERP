import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Users,
  Banknote,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  ArrowRight,
  Activity,
  BarChart3,
  Building2,
  ShoppingCart,
  Briefcase,
  Target,
  Award,
  Calendar,
  Bell,
  ChevronUp,
  ChevronDown,
  Filter,
  Plus,
  Eye,
  Zap,
  Shield,
  TrendingDown,
  Layers,
  Truck,
  CreditCard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { Progress } from '@/components/ui/progress';

interface MetricData {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down';
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}

interface ProjectData {
  id: string;
  name: string;
  client: string;
  status: 'active' | 'completed' | 'on-hold' | 'planning';
  progress: number;
  budget: number;
  spent: number;
  deadline: string;
  manager: string;
}

interface RecentActivity {
  id: string;
  type: 'approval' | 'purchase' | 'task' | 'vendor' | 'payment';
  title: string;
  description: string;
  time: string;
  urgent?: boolean;
  user?: string;
}

const ModernDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [showAllProjects, setShowAllProjects] = useState(false);

  // Main metrics based on user role
  const getMetrics = (): MetricData[] => {
    const baseMetrics: MetricData[] = [
      {
        title: 'Total Revenue',
        value: 'AED 2,456,890',
        change: 12.5,
        trend: 'up',
        icon: Banknote,
        color: 'bg-green-500',
        subtitle: 'This fiscal year'
      },
      {
        title: 'Active Projects',
        value: 24,
        change: 8.3,
        trend: 'up',
        icon: Briefcase,
        color: 'bg-blue-500',
        subtitle: '6 new this month'
      },
      {
        title: 'Pending Approvals',
        value: 15,
        change: -25.0,
        trend: 'down',
        icon: Clock,
        color: 'bg-amber-500',
        subtitle: 'Requires action'
      },
      {
        title: 'Vendor Performance',
        value: '94%',
        change: 3.2,
        trend: 'up',
        icon: Award,
        color: 'bg-red-500',
        subtitle: 'Satisfaction rate'
      }
    ];

    if (user?.role_id === 'TECHNICAL_DIRECTOR' || user?.role_id === 'BUSINESS_OWNER') {
      return [
        ...baseMetrics,
        {
          title: 'Cost Savings',
          value: 'AED 145,230',
          change: 18.7,
          trend: 'up',
          icon: TrendingDown,
          color: 'bg-indigo-500',
          subtitle: 'YTD optimization'
        },
        {
          title: 'Process Efficiency',
          value: '89%',
          change: 5.4,
          trend: 'up',
          icon: Zap,
          color: 'bg-pink-500',
          subtitle: 'Automation rate'
        }
      ];
    }

    return baseMetrics;
  };

  // Sample projects data
  const projects: ProjectData[] = [
    {
      id: '1',
      name: 'Marina Bay Residences - Tower A',
      client: 'Marina Development Ltd',
      status: 'active',
      progress: 75,
      budget: 850000,
      spent: 637500,
      deadline: '2024-03-15',
      manager: 'Jennifer Wong'
    },
    {
      id: '2',
      name: 'Orchard Central Office Fit-out',
      client: 'TechCorp Singapore',
      status: 'active',
      progress: 45,
      budget: 1200000,
      spent: 540000,
      deadline: '2024-04-30',
      manager: 'Michael Tan'
    },
    {
      id: '3',
      name: 'Sentosa Resort Renovation',
      client: 'Hospitality Group Asia',
      status: 'planning',
      progress: 15,
      budget: 2000000,
      spent: 0,
      deadline: '2024-06-01',
      manager: 'Sarah Chen'
    },
    {
      id: '4',
      name: 'CBD Corporate Tower - Level 23',
      client: 'Financial Services Inc',
      status: 'on-hold',
      progress: 30,
      budget: 650000,
      spent: 195000,
      deadline: '2024-05-15',
      manager: 'David Lim'
    }
  ];

  // Recent activities
  const recentActivities: RecentActivity[] = [
    {
      id: '1',
      type: 'approval',
      title: 'Purchase Requisition Approved',
      description: 'PR-2024-001 for Marina Bay project approved',
      time: '5 minutes ago',
      urgent: false,
      user: 'John Tan'
    },
    {
      id: '2',
      type: 'vendor',
      title: 'New Vendor Quotation',
      description: 'ABC Contractors submitted quotation for Orchard project',
      time: '1 hour ago',
      urgent: true
    },
    {
      id: '3',
      type: 'payment',
      title: 'Payment Processed',
      description: 'Invoice #INV-2024-089 paid to XYZ Suppliers',
      time: '3 hours ago',
      user: 'Finance Team'
    },
    {
      id: '4',
      type: 'task',
      title: 'Task Completed',
      description: 'Site inspection completed for Sentosa Resort',
      time: '5 hours ago',
      user: 'Site Team'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'on-hold':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'planning':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'purchase':
        return <ShoppingCart className="w-4 h-4 text-blue-600" />;
      case 'vendor':
        return <Users className="w-4 h-4 text-red-600" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-indigo-600" />;
      case 'task':
        return <FileText className="w-4 h-4 text-gray-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const metrics = getMetrics();
  const displayedProjects = showAllProjects ? projects : projects.slice(0, 3);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm p-6 border"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.full_name}!
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Here's what's happening with your projects today
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/procurement')}
              className="flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Procurement
            </Button>
            <Button
              onClick={() => navigate('/procurement')}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              New Purchase Request
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="xl:col-span-1 md:col-span-1"
          >
            <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg ${metric.color} bg-opacity-10`}>
                    <metric.icon className={`w-5 h-5 ${metric.color.replace('bg-', 'text-')}`} />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.trend === 'up' ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    {Math.abs(metric.change)}%
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                <p className="text-xs text-gray-600 mt-1">{metric.title}</p>
                {metric.subtitle && (
                  <p className="text-xs text-gray-500 mt-1">{metric.subtitle}</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects Section - 2 columns */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  Active Projects
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-700 border border-blue-300">
                    {projects.filter(p => p.status === 'active').length} Active
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/projects')}
                  >
                    View All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {displayedProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{project.name}</h4>
                        <p className="text-sm text-gray-600">{project.client}</p>
                      </div>
                      <Badge className={`${getStatusColor(project.status)} border`}>
                        {project.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            project.progress >= 75 ? 'bg-green-500' :
                            project.progress >= 50 ? 'bg-blue-500' :
                            project.progress >= 25 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
                      <div>
                        <p className="text-xs text-gray-500">Budget</p>
                        <p className="text-sm font-semibold">AED {project.budget.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Spent</p>
                        <p className="text-sm font-semibold text-blue-600">
                          AED {project.spent.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Deadline</p>
                        <p className="text-sm font-semibold">{project.deadline}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                          <Users className="w-3 h-3 text-gray-600" />
                        </div>
                        <span className="text-sm text-gray-600">{project.manager}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
              {!showAllProjects && projects.length > 3 && (
                <div className="p-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAllProjects(true)}
                  >
                    Show More Projects ({projects.length - 3} more)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card className="shadow-md border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Procurement This Month</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">AED 345,670</p>
                    <p className="text-xs text-green-600 mt-1">+12% from last month</p>
                  </div>
                  <Package className="w-8 h-8 text-blue-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending Deliveries</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">18</p>
                    <p className="text-xs text-amber-600 mt-1">5 arriving today</p>
                  </div>
                  <Truck className="w-8 h-8 text-amber-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Vendors</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">42</p>
                    <p className="text-xs text-purple-600 mt-1">3 new this week</p>
                  </div>
                  <Building2 className="w-8 h-8 text-purple-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Activities & Notifications */}
        <div className="lg:col-span-1 space-y-6">
          {/* Pending Approvals */}
          <Card className="shadow-md border-0">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-4 h-4 text-amber-600" />
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[
                { id: 'PR-2024-004', amount: 'AED 45,000', project: 'Marina Bay', urgent: true },
                { id: 'VQ-2024-003', amount: 'AED 78,500', project: 'Orchard Office', urgent: false },
                { id: 'PR-2024-005', amount: 'AED 23,400', project: 'Sentosa Resort', urgent: true }
              ].map((item) => (
                <div key={item.id} className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{item.id}</span>
                        {item.urgent && (
                          <Badge className="bg-red-100 text-red-700 border border-red-300 text-xs">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{item.project}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{item.amount}</p>
                      <Button
                        size="sm"
                        className="mt-1 h-7 text-xs bg-amber-600 hover:bg-amber-700"
                        onClick={() => navigate('/procurement')}
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full text-sm"
                onClick={() => navigate('/procurement')}
              >
                View All Approvals
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-md border-0">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4 text-gray-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-1">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">{activity.time}</span>
                      {activity.user && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{activity.user}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {activity.urgent && (
                    <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full text-sm"
                onClick={() => navigate('/notifications')}
              >
                View All Activity
                <Bell className="w-3 h-3 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Performance Overview */}
          <Card className="shadow-md border-0">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="w-4 h-4 text-green-600" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[
                { label: 'On-Time Delivery', value: 92, color: 'bg-green-500' },
                { label: 'Budget Compliance', value: 87, color: 'bg-blue-500' },
                { label: 'Quality Score', value: 95, color: 'bg-purple-500' },
                { label: 'Client Satisfaction', value: 89, color: 'bg-indigo-500' }
              ].map((metric) => (
                <div key={metric.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">{metric.label}</span>
                    <span className="text-sm font-semibold">{metric.value}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${metric.color}`}
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Quick Actions */}
      <Card className="shadow-md border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-blue-600" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { icon: Plus, label: 'New Project', color: 'text-blue-600', path: '/projects/new' },
              { icon: ShoppingCart, label: 'Purchase Request', color: 'text-green-600', path: '/procurement' },
              { icon: Users, label: 'Add Vendor', color: 'text-purple-600', path: '/vendors/new' },
              { icon: FileText, label: 'Create Invoice', color: 'text-indigo-600', path: '/invoices/new' },
              { icon: BarChart3, label: 'View Reports', color: 'text-orange-600', path: '/analytics' },
              { icon: Shield, label: 'Process Flow', color: 'text-pink-600', path: '/process-flow' }
            ].map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="flex flex-col items-center gap-2 h-20 hover:bg-gray-50"
                onClick={() => navigate(action.path)}
              >
                <action.icon className={`w-5 h-5 ${action.color}`} />
                <span className="text-xs text-center">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModernDashboard;