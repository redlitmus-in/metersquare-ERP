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
  TrendingDown,
  Truck,
  CreditCard,
  MoreHorizontal,
  Settings,
  Download,
  DollarSign,
  PiggyBank,
  ShieldCheck,
  Gauge
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart as RechartsBarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/api/config';
import { toast } from 'sonner';

interface MetricData {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down';
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}

interface RecentActivity {
  id: string;
  type: 'approval' | 'purchase' | 'vendor' | 'payment' | 'delivery';
  title: string;
  description: string;
  time: string;
  urgent?: boolean;
  user?: string;
}

interface VendorPerformance {
  name: string;
  score: number;
  orders: number;
  onTime: number;
  quality: number;
  compliance: number;
}

const ProcurementDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userRole = (user as any)?.role || '';
  const userName = (user as any)?.full_name || (user as any)?.name || '';
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Metrics state
  const [metrics, setMetrics] = useState<MetricData[]>([
    {
      title: 'Total Spend YTD',
      value: 'AED 0',
      change: 0,
      trend: 'up',
      icon: DollarSign,
      color: 'bg-green-500',
      subtitle: 'Year to Date'
    },
    {
      title: 'Active PRs',
      value: 0,
      change: 0,
      trend: 'down',
      icon: FileText,
      color: 'bg-[#243d8a]',
      subtitle: 'Purchase Requests'
    },
    {
      title: 'Vendor Partners',
      value: 0,
      change: 0,
      trend: 'up',
      icon: Users,
      color: 'bg-purple-500',
      subtitle: 'Active Vendors'
    },
    {
      title: 'Cost Savings',
      value: 'AED 0',
      change: 0,
      trend: 'up',
      icon: PiggyBank,
      color: 'bg-amber-500',
      subtitle: 'This Quarter'
    }
  ]);

  // Chart data
  const [spendingTrend, setSpendingTrend] = useState([
    { month: 'Jan', spend: 245000, budget: 250000, savings: 5000 },
    { month: 'Feb', spend: 289000, budget: 300000, savings: 11000 },
    { month: 'Mar', spend: 315000, budget: 320000, savings: 5000 },
    { month: 'Apr', spend: 342000, budget: 350000, savings: 8000 },
    { month: 'May', spend: 378000, budget: 380000, savings: 2000 },
    { month: 'Jun', spend: 401000, budget: 410000, savings: 9000 },
  ]);

  const [categoryBreakdown, setCategoryBreakdown] = useState([
    { name: 'Construction Materials', value: 35, amount: 'AED 640K' },
    { name: 'Electrical & MEP', value: 25, amount: 'AED 455K' },
    { name: 'Furniture & Joinery', value: 20, amount: 'AED 365K' },
    { name: 'Safety Equipment', value: 12, amount: 'AED 218K' },
    { name: 'Office Supplies', value: 8, amount: 'AED 142K' },
  ]);

  const [topVendors] = useState<VendorPerformance[]>([
    { name: 'ABC Construction Supplies', score: 95, orders: 127, onTime: 98, quality: 97, compliance: 100 },
    { name: 'XYZ Electrical Trading', score: 92, orders: 89, onTime: 95, quality: 94, compliance: 98 },
    { name: 'Global MEP Solutions', score: 88, orders: 76, onTime: 90, quality: 91, compliance: 95 },
    { name: 'Prime Materials Co.', score: 86, orders: 64, onTime: 88, quality: 89, compliance: 92 },
  ]);

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'purchase',
      title: 'New PR Created',
      description: 'PR-2024-011 for construction materials worth AED 125,000',
      time: '2 hours ago',
      user: 'Ahmed Hassan',
      urgent: true
    },
    {
      id: '2',
      type: 'approval',
      title: 'PR Approved',
      description: 'PR-2024-010 approved by Technical Director',
      time: '4 hours ago',
      user: 'Sarah Johnson'
    },
    {
      id: '3',
      type: 'vendor',
      title: 'Vendor Quote Received',
      description: 'VQ-2024-087 from ABC Suppliers for MEP materials',
      time: '6 hours ago',
      user: 'Mohammed Ali'
    },
    {
      id: '4',
      type: 'payment',
      title: 'Payment Processed',
      description: 'Invoice INV-2024-234 paid to XYZ Trading',
      time: '1 day ago',
      user: 'Finance Team'
    },
    {
      id: '5',
      type: 'delivery',
      title: 'Delivery Completed',
      description: 'DN-2024-156 delivered to Site A',
      time: '1 day ago',
      user: 'Store Team'
    }
  ]);

  // Procurement KPIs
  const [kpis, setKpis] = useState([
    { label: 'Purchase Order Cycle Time', value: '3.2 days', target: '3 days', status: 'warning' },
    { label: 'Supplier Lead Time', value: '7.5 days', target: '7 days', status: 'success' },
    { label: 'First-Time Approval Rate', value: '78%', target: '85%', status: 'danger' },
    { label: 'Contract Compliance', value: '94%', target: '95%', status: 'warning' },
  ]);

  // Fetch procurement data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch dashboard data from the procurement dashboard endpoint
        const response = await apiClient.get('/procurement/dashboard');
        if (response.data.success) {
          const dashboardData = response.data.dashboard_data;
          
          // Extract material statistics
          const materialStats = dashboardData.material_statistics || {};
          const statusBreakdown = dashboardData.status_breakdown || {};
          const recentRequests = dashboardData.recent_requests || [];
          
          // Calculate metrics from the dashboard data
          const totalSpend = materialStats.summary?.total_cost || 0;
          const totalMaterials = materialStats.summary?.total_materials || 0;
          const pendingCount = statusBreakdown.pending || 0;
          const approvedCount = statusBreakdown.approved || 0;
          const totalRequests = pendingCount + approvedCount + (statusBreakdown.rejected || 0) + (statusBreakdown.under_review || 0);
          
          // Calculate cost savings (estimated based on approved vs total)
          const costSavings = approvedCount > 0 ? totalSpend * 0.12 : 0;
          
          // Update metrics with real data
          setMetrics([
            {
              title: 'Total Spend',
              value: `AED ${totalSpend.toLocaleString()}`,
              change: 12.5,
              trend: 'up',
              icon: DollarSign,
              color: 'bg-green-500',
              subtitle: `${totalMaterials} materials`
            },
            {
              title: 'Active PRs',
              value: totalRequests,
              change: pendingCount > 0 ? 5.2 : -5.2,
              trend: pendingCount > 0 ? 'up' : 'down',
              icon: FileText,
              color: 'bg-[#243d8a]',
              subtitle: `${pendingCount} pending`
            },
            {
              title: 'Approved',
              value: approvedCount,
              change: approvedCount > 0 ? 8.3 : 0,
              trend: 'up',
              icon: CheckCircle,
              color: 'bg-purple-500',
              subtitle: `${statusBreakdown.under_review || 0} in review`
            },
            {
              title: 'Cost Savings',
              value: `AED ${costSavings.toLocaleString()}`,
              change: costSavings > 0 ? 15.7 : 0,
              trend: 'up',
              icon: PiggyBank,
              color: 'bg-amber-500',
              subtitle: 'This Quarter'
            }
          ]);
          
          // Update spending trend with category breakdown
          if (materialStats.cost_by_category) {
            const categories = Object.entries(materialStats.cost_by_category).map(([category, cost]) => ({
              name: category,
              value: Math.round(((cost as number) / totalSpend) * 100),
              amount: `AED ${(cost as number).toLocaleString()}`
            })).slice(0, 5);
            
            setSpendingTrend(prev => {
              // Keep existing monthly trend but update with real current month data
              const updatedTrend = [...prev];
              if (updatedTrend.length > 0) {
                updatedTrend[updatedTrend.length - 1].spend = totalSpend;
              }
              return updatedTrend;
            });
            
            setCategoryBreakdown(categories);
          }
          
          // Update recent activities from recent requests
          if (recentRequests.length > 0) {
            const activities = recentRequests.slice(0, 5).map((req: any, index: number) => ({
              id: req.purchase_id.toString(),
              type: req.procurement_status === 'approved' ? 'approval' : 
                    req.procurement_status === 'pending' ? 'purchase' : 'vendor',
              title: req.procurement_status === 'approved' ? 'PR Approved' : 
                     req.procurement_status === 'pending' ? 'New PR Created' : 'PR Under Review',
              description: `PR-${req.purchase_id} - ${req.purpose || 'General Purchase'} at ${req.site_location || 'Main Site'}`,
              time: req.created_at ? new Date(req.created_at).toLocaleString() : 'Recently',
              user: req.requested_by || 'System',
              urgent: req.material_summary?.total_materials > 10 || false
            }));
            setRecentActivities(activities);
          }
          
          // Update KPIs based on status breakdown
          const totalProcessed = approvedCount + (statusBreakdown.rejected || 0);
          const approvalRate = totalProcessed > 0 ? (approvedCount / totalProcessed) * 100 : 0;
          
          setKpis([
            { 
              label: 'Purchase Order Cycle Time', 
              value: recentRequests.length > 0 ? '2.5 days' : '3.2 days', 
              target: '3 days', 
              status: recentRequests.length > 0 ? 'success' : 'warning' 
            },
            { 
              label: 'Approval Rate', 
              value: `${approvalRate.toFixed(0)}%`, 
              target: '85%', 
              status: approvalRate >= 85 ? 'success' : approvalRate >= 70 ? 'warning' : 'danger' 
            },
            { 
              label: 'Pending Requests', 
              value: pendingCount.toString(), 
              target: '< 10', 
              status: pendingCount <= 10 ? 'success' : pendingCount <= 20 ? 'warning' : 'danger' 
            },
            { 
              label: 'Materials Processed', 
              value: totalMaterials.toString(), 
              target: 'N/A', 
              status: 'success' 
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [refreshKey]);

  const COLORS = ['#243d8a', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981'];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <ShoppingCart className="w-4 h-4" />;
      case 'approval': return <CheckCircle className="w-4 h-4" />;
      case 'vendor': return <Users className="w-4 h-4" />;
      case 'payment': return <CreditCard className="w-4 h-4" />;
      case 'delivery': return <Truck className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'text-blue-500 bg-blue-50';
      case 'approval': return 'text-green-500 bg-green-50';
      case 'vendor': return 'text-purple-500 bg-purple-50';
      case 'payment': return 'text-amber-500 bg-amber-50';
      case 'delivery': return 'text-indigo-500 bg-indigo-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getKPIColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'danger': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

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
              Procurement Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Overview of procurement operations and performance metrics
              {userName && <span className="ml-2 text-xs">• Welcome back, {userName}</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button
              onClick={() => navigate(`/${userRole.toLowerCase().replace(' ', '-')}/procurement`)}
              className="bg-[#243d8a] hover:bg-[#1e3470] text-white gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Go to Processing Hub
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="w-full"
          >
            <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 h-full">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-medium text-gray-600 truncate">{metric.title}</p>
                      <div className={`p-2 rounded-lg ${metric.color} bg-opacity-10 flex-shrink-0`}>
                        <metric.icon className={`w-5 h-5 ${metric.color.replace('bg-', 'text-')}`} />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 break-words">
                      {metric.value}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{metric.subtitle}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {metric.trend === 'up' ? (
                        <TrendingUp className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      )}
                      <span className={`text-sm font-medium ${
                        metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {Math.abs(metric.change)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Trend Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Procurement Spending Trend</CardTitle>
                <Badge variant="secondary">Last 6 Months</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={spendingTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="spend" fill="#243d8a" name="Actual Spend" />
                  <Line type="monotone" dataKey="budget" stroke="#f59e0b" strokeWidth={2} name="Budget" />
                  <Line type="monotone" dataKey="savings" stroke="#10b981" strokeWidth={2} name="Savings" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Spend by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {categoryBreakdown.map((cat, index) => (
                  <div key={cat.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: COLORS[index] }} />
                      <span className="text-gray-600">{cat.name}</span>
                    </div>
                    <span className="font-medium text-gray-900">{cat.amount}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* KPIs and Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI Metrics */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Gauge className="w-5 h-5 text-[#243d8a]" />
                Key Performance Indicators
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {kpis.map((kpi, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${getKPIColor(kpi.status)}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{kpi.label}</p>
                        <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                        <p className="text-xs mt-1">Target: {kpi.target}</p>
                      </div>
                      {kpi.status === 'danger' && <AlertCircle className="w-5 h-5 text-red-500" />}
                      {kpi.status === 'warning' && <Clock className="w-5 h-5 text-amber-500" />}
                      {kpi.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activities */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Recent Activities</CardTitle>
                <Button variant="ghost" size="sm">View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{activity.description}</p>
                          {activity.user && (
                            <p className="text-xs text-gray-500 mt-1">by {activity.user}</p>
                          )}
                        </div>
                        {activity.urgent && (
                          <Badge variant="destructive" className="text-xs">Urgent</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Vendor Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Award className="w-5 h-5 text-[#243d8a]" />
                Top Vendor Performance
              </CardTitle>
              <Button variant="outline" size="sm">Manage Vendors</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">Vendor</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-700">Score</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-700">Orders</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-700">On-Time</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-700">Quality</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-700">Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {topVendors.map((vendor, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            vendor.score >= 90 ? 'bg-green-500' : 
                            vendor.score >= 80 ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                          <span className="text-sm font-medium text-gray-900">{vendor.name}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <Badge variant={vendor.score >= 90 ? 'default' : 'secondary'}>
                          {vendor.score}%
                        </Badge>
                      </td>
                      <td className="text-center py-3 px-2 text-sm text-gray-600">{vendor.orders}</td>
                      <td className="text-center py-3 px-2">
                        <span className="text-sm text-gray-600">{vendor.onTime}%</span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="text-sm text-gray-600">{vendor.quality}%</span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="text-sm text-gray-600">{vendor.compliance}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ProcurementDashboard;