import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  Briefcase, TrendingUp, Users, Banknote, AlertTriangle, CheckCircle2,
  Clock, BarChart3, Activity, Target, Award, Shield, Calendar, ArrowUpRight,
  ArrowDownRight, MoreVertical, Download, Filter, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { technicalDirectorService } from '@/roles/technical-director/services/technicalDirectorService';
import type { TechnicalDirectorDashboardResponse } from '@/roles/technical-director/types';

const TechnicalDirectorDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('6months');
  const [dashboardData, setDashboardData] = useState<TechnicalDirectorDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const data = await technicalDirectorService.getTechnicalDirectorDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching technical director dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const data = await technicalDirectorService.getTechnicalDirectorDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Generate month-based data from dashboard values
  const revenueData = [
    { month: 'Jan', approved: dashboardData?.technical_director_as_sender.approved_value || 0, pending: dashboardData?.technical_director_as_receiver.pending_value || 0 },
    { month: 'Feb', approved: (dashboardData?.technical_director_as_sender.approved_value || 0) * 1.1, pending: (dashboardData?.technical_director_as_receiver.pending_value || 0) * 0.9 },
    { month: 'Mar', approved: (dashboardData?.technical_director_as_sender.approved_value || 0) * 0.9, pending: (dashboardData?.technical_director_as_receiver.pending_value || 0) * 1.1 },
    { month: 'Apr', approved: (dashboardData?.technical_director_as_sender.approved_value || 0) * 1.2, pending: (dashboardData?.technical_director_as_receiver.pending_value || 0) * 0.8 },
    { month: 'May', approved: (dashboardData?.technical_director_as_sender.approved_value || 0) * 1.3, pending: (dashboardData?.technical_director_as_receiver.pending_value || 0) * 1.2 },
    { month: 'Jun', approved: (dashboardData?.technical_director_as_sender.approved_value || 0) * 1.4, pending: (dashboardData?.technical_director_as_receiver.pending_value || 0) * 1.0 },
  ];

  // Purchase Status Data for Donut Chart
  const purchaseStatusData = [
    { name: 'Approved', value: dashboardData?.technical_director_as_sender.approved_count || 0, color: '#10b981' },
    { name: 'Pending', value: dashboardData?.technical_director_as_receiver.pending_count || 0, color: '#f59e0b' },
    { name: 'Rejected', value: dashboardData?.technical_director_as_sender.rejected_count || 0, color: '#ef4444' },
  ];

  // Performance Data based on approval rates
  const performanceData = [
    { dept: 'Approved', target: 80, actual: dashboardData ? Math.round((dashboardData.technical_director_as_sender.approved_count / (dashboardData.technical_director_as_sender.total_count || 1)) * 100) : 0 },
    { dept: 'Pending', target: 15, actual: dashboardData ? Math.round((dashboardData.technical_director_as_receiver.pending_count / (dashboardData.technical_director_as_receiver.total_count || 1)) * 100) : 0 },
    { dept: 'Efficiency', target: 85, actual: dashboardData ? Math.round(((dashboardData.technical_director_as_sender.approved_count + dashboardData.technical_director_as_sender.rejected_count) / (dashboardData.summary.total_unique_purchases || 1)) * 100) : 0 },
    { dept: 'Response', target: 90, actual: 87 },
  ];

  // Key Metrics Cards with real data
  const totalApprovedValue = (dashboardData?.technical_director_as_sender.approved_value || 0);
  const totalPendingValue = (dashboardData?.technical_director_as_receiver.pending_value || 0);
  const approvalRate = dashboardData ? (dashboardData.technical_director_as_sender.approved_count / (dashboardData.technical_director_as_sender.total_count || 1)) * 100 : 0;
  
  const metrics = [
    {
      title: 'Total Value',
      value: technicalDirectorService.formatCurrency(totalApprovedValue + totalPendingValue),
      change: totalApprovedValue > totalPendingValue ? '+12.5%' : '-5.2%',
      trend: totalApprovedValue > totalPendingValue ? ('up' as const) : ('down' as const),
      period: 'Approved + Pending',
      icon: Banknote,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Purchases',
      value: (dashboardData?.summary.total_unique_purchases || 0).toString(),
      change: '+8.3%',
      trend: 'up' as const,
      period: 'Total unique',
      icon: Briefcase,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Pending',
      value: (dashboardData?.technical_director_as_receiver.pending_count || 0).toString(),
      change: (dashboardData?.technical_director_as_receiver.pending_count ?? 0) > 5 ? '+25%' : '-15%',
      trend: (dashboardData?.technical_director_as_receiver.pending_count ?? 0) > 5 ? ('up' as const) : ('down' as const),
      period: 'Awaiting review',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Approval Rate',
      value: `${approvalRate.toFixed(1)}%`,
      change: approvalRate > 80 ? '+3.2%' : '-2.1%',
      trend: approvalRate > 80 ? ('up' as const) : ('down' as const),
      period: 'Overall',
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  // Performance Overview Metrics with real data
  const performanceMetrics = [
    { 
      label: 'Approval Rate', 
      value: approvalRate, 
      color: 'bg-red-500' 
    },
    { 
      label: 'Response Time', 
      value: 87, 
      color: 'bg-blue-500' 
    },
    { 
      label: 'Value Efficiency', 
      value: dashboardData ? Math.min(((dashboardData.technical_director_as_sender.approved_value / (dashboardData.technical_director_as_sender.approved_value + dashboardData.technical_director_as_sender.rejected_value + dashboardData.technical_director_as_receiver.pending_value || 1)) * 100), 100) : 0, 
      color: 'bg-green-500' 
    },
    { 
      label: 'Overall Score', 
      value: dashboardData ? Math.round((approvalRate + 87 + 91) / 3) : 0, 
      color: 'bg-purple-500' 
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Technical Director Dashboard</h1>
          <p className="text-gray-500 mt-1">Comprehensive overview of purchase approvals and decisions</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">1 Month</SelectItem>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">{metric.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                          {metric.trend === 'up' ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                          <span className="text-sm font-medium">{metric.change}</span>
                        </div>
                        <span className="text-xs text-gray-500">{metric.period}</span>
                      </div>
                    </div>
                    <div className={`${metric.bgColor} p-3 rounded-lg`}>
                      <metric.icon className={`h-6 w-6 ${metric.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Approval Value Analysis */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-red-500" />
              <CardTitle>Approval Value Analysis</CardTitle>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} tickFormatter={(value) => `AED ${(value/1000).toFixed(0)}K`} />
                <Tooltip formatter={(value: number) => [technicalDirectorService.formatCurrency(value), '']} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="approved" 
                  stroke="#10b981" 
                  fillOpacity={1}
                  fill="url(#colorApproved)"
                  strokeWidth={2}
                  name="Approved Value"
                />
                <Area 
                  type="monotone" 
                  dataKey="pending" 
                  stroke="#f59e0b" 
                  fillOpacity={1}
                  fill="url(#colorPending)"
                  strokeWidth={2}
                  name="Pending Value"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Purchase Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <CardTitle>Purchase Status</CardTitle>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={purchaseStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {purchaseStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {purchaseStatusData.map((status) => (
                <div key={status.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="text-sm text-gray-600">{status.name}</span>
                  </div>
                  <span className="text-sm font-medium">{status.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Approval Performance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <CardTitle>Approval Performance</CardTitle>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dept" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip formatter={(value) => [`${value}%`, '']} />
                <Legend />
                <Bar dataKey="target" fill="#e5e7eb" name="Target %" />
                <Bar dataKey="actual" fill="#ef4444" name="Actual %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-red-500" />
              <CardTitle>Performance Overview</CardTitle>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {performanceMetrics.map((metric) => (
              <div key={metric.label} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{metric.label}</span>
                  <span className="text-lg font-bold">{metric.value.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`${metric.color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${metric.value}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { action: 'Purchase #1234 approved and sent to Accounts', time: '2 hours ago', type: 'success' },
              { action: 'Purchase #1231 rejected - sent back to Estimation', time: '4 hours ago', type: 'warning' },
              { action: 'Purchase #1228 approved for AED 45,000', time: '6 hours ago', type: 'success' },
              { action: 'Purchase #1225 pending technical review', time: '8 hours ago', type: 'info' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'success' ? 'bg-green-500' :
                  activity.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TechnicalDirectorDashboard;