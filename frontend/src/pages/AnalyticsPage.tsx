import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ResponsiveContainer 
} from 'recharts';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Banknote,
  ShoppingCart,
  Package,
  Users,
  Calendar,
  Download,
  Filter,
  Eye,
  ArrowUp,
  ArrowDown,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  PieChart,
  BarChart,
  TrendingUp as LineChart,
  Activity
} from 'lucide-react';

interface ChartData {
  name: string;
  value: number;
  change: number;
  color: string;
}

interface ReportData {
  id: string;
  title: string;
  description: string;
  category: string;
  lastGenerated: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  status: 'generated' | 'pending' | 'error';
}

const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  // Sample chart data
  const procurementData: ChartData[] = [
    { name: 'Jan', value: 125000, change: 12, color: '#ef4444' },
    { name: 'Feb', value: 145000, change: 16, color: '#ef4444' },
    { name: 'Mar', value: 132000, change: -9, color: '#ef4444' },
    { name: 'Apr', value: 168000, change: 27, color: '#ef4444' },
    { name: 'May', value: 189000, change: 13, color: '#ef4444' },
    { name: 'Jun', value: 205000, change: 8, color: '#ef4444' }
  ];

  const projectData: ChartData[] = [
    { name: 'Completed', value: 24, change: 20, color: '#22c55e' },
    { name: 'In Progress', value: 15, change: 7, color: '#3b82f6' },
    { name: 'On Hold', value: 3, change: -2, color: '#f59e0b' },
    { name: 'Cancelled', value: 2, change: -1, color: '#ef4444' }
  ];

  const vendorPerformance: ChartData[] = [
    { name: 'Excellent', value: 12, change: 3, color: '#22c55e' },
    { name: 'Good', value: 18, change: 2, color: '#3b82f6' },
    { name: 'Average', value: 8, change: -1, color: '#f59e0b' },
    { name: 'Poor', value: 2, change: -1, color: '#ef4444' }
  ];

  // Sample reports data
  const reports: ReportData[] = [
    {
      id: '1',
      title: 'Procurement Spending Analysis',
      description: 'Detailed analysis of procurement spending across all projects',
      category: 'Financial',
      lastGenerated: '2024-08-25',
      frequency: 'monthly',
      status: 'generated'
    },
    {
      id: '2',
      title: 'Vendor Performance Report',
      description: 'Performance metrics and ratings for all active vendors',
      category: 'Vendor Management',
      lastGenerated: '2024-08-24',
      frequency: 'weekly',
      status: 'generated'
    },
    {
      id: '3',
      title: 'Project Progress Dashboard',
      description: 'Real-time project progress and milestone tracking',
      category: 'Project Management',
      lastGenerated: '2024-08-25',
      frequency: 'daily',
      status: 'generated'
    },
    {
      id: '4',
      title: 'Cost Overrun Analysis',
      description: 'Analysis of budget vs actual costs across projects',
      category: 'Financial',
      lastGenerated: '2024-08-23',
      frequency: 'monthly',
      status: 'pending'
    },
    {
      id: '5',
      title: 'Approval Workflow Metrics',
      description: 'Time analysis and bottlenecks in approval processes',
      category: 'Operations',
      lastGenerated: '2024-08-24',
      frequency: 'weekly',
      status: 'generated'
    }
  ];

  const getStatusBadge = (status: ReportData['status']) => {
    const configs = {
      generated: { color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle, label: 'Generated' },
      pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: Clock, label: 'Pending' },
      error: { color: 'bg-red-100 text-red-700 border-red-300', icon: AlertCircle, label: 'Error' }
    };
    const config = configs[status];
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} border flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getFrequencyBadge = (frequency: ReportData['frequency']) => {
    const colors = {
      daily: 'bg-blue-100 text-blue-700 border-blue-300',
      weekly: 'bg-purple-100 text-purple-700 border-purple-300',
      monthly: 'bg-orange-100 text-orange-700 border-orange-300'
    };
    
    return (
      <Badge className={`${colors[frequency]} border`}>
        <Calendar className="w-3 h-3 mr-1" />
        {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl shadow-xl p-6 text-gray-800 border border-orange-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/60 rounded-lg">
              <BarChart3 className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Analytics & Reports</h1>
              <p className="text-gray-600 mt-1">Business insights and performance metrics</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="3m">Last 3 months</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Procurement', value: 'AED 1.2M', change: '+12%', icon: ShoppingCart, color: 'text-red-600', bgColor: 'bg-red-50' },
          { title: 'Active Projects', value: '44', change: '+8%', icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-50' },
          { title: 'Vendor Partners', value: '127', change: '+15%', icon: Users, color: 'text-green-600', bgColor: 'bg-green-50' },
          { title: 'Cost Savings', value: 'AED 185K', change: '+23%', icon: Target, color: 'text-purple-600', bgColor: 'bg-purple-50' }
        ].map((metric, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    <div className="flex items-center mt-2">
                      <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600 font-medium">{metric.change}</span>
                      <span className="text-sm text-gray-500 ml-2">vs last month</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                    <metric.icon className={`w-6 h-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-white shadow-sm border">
          <TabsTrigger value="overview" className="data-[state=active]:bg-orange-50">
            <BarChart className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="procurement" className="data-[state=active]:bg-orange-50">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Procurement
          </TabsTrigger>
          <TabsTrigger value="projects" className="data-[state=active]:bg-orange-50">
            <Package className="w-4 h-4 mr-2" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-orange-50">
            <Calendar className="w-4 h-4 mr-2" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Procurement Trend Chart */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-orange-600" />
                  Procurement Spending Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {procurementData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900">${(item.value / 1000).toFixed(0)}K</span>
                        <div className={`flex items-center gap-1 ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.change >= 0 ? (
                            <ArrowUp className="w-4 h-4" />
                          ) : (
                            <ArrowDown className="w-4 h-4" />
                          )}
                          <span className="text-sm font-medium">{Math.abs(item.change)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Interactive Line Chart */}
                <div className="mt-6 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={procurementData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        axisLine={{ stroke: '#e0e0e0' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        axisLine={{ stroke: '#e0e0e0' }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`$${(value / 1000).toFixed(0)}K`, 'Procurement']}
                        labelStyle={{ color: '#374151' }}
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#ef4444" 
                        strokeWidth={3}
                        dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: '#dc2626' }}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Project Status Distribution */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-orange-600" />
                  Project Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {projectData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900">{item.value}</span>
                        <div className={`flex items-center gap-1 ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.change >= 0 ? (
                            <ArrowUp className="w-4 h-4" />
                          ) : (
                            <ArrowDown className="w-4 h-4" />
                          )}
                          <span className="text-sm font-medium">{Math.abs(item.change)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Interactive Pie Chart */}
                <div className="mt-6 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={projectData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {projectData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [value, 'Projects']}
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value) => <span style={{ color: '#374151', fontSize: '12px' }}>{value}</span>}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Procurement Tab */}
        <TabsContent value="procurement">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Procurement KPIs */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-red-600" />
                  Procurement KPIs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {[
                  { label: 'Purchase Orders', value: '156', change: '+12%' },
                  { label: 'Average Order Value', value: 'AED 7.8K', change: '+8%' },
                  { label: 'Approval Time', value: '2.3 days', change: '-15%' },
                  { label: 'Cost Savings', value: '12.5%', change: '+3%' }
                ].map((kpi, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{kpi.label}</span>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{kpi.value}</p>
                      <p className="text-xs text-green-600">{kpi.change}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Vendor Performance */}
            <Card className="lg:col-span-2 shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-600" />
                  Vendor Performance Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {vendorPerformance.map((item, index) => (
                    <div key={index} className="text-center">
                      <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: `${item.color}20` }}>
                        <span className="font-bold text-lg" style={{ color: item.color }}>{item.value}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className={`text-xs ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.change >= 0 ? '+' : ''}{item.change}
                      </p>
                    </div>
                  ))}
                </div>
                
                {/* Interactive Bar Chart */}
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={vendorPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 11 }}
                        axisLine={{ stroke: '#e0e0e0' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 11 }}
                        axisLine={{ stroke: '#e0e0e0' }}
                      />
                      <Tooltip 
                        formatter={(value: any) => [value, 'Vendors']}
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar 
                        dataKey="value" 
                        fill={(entry: any, index: number) => vendorPerformance[index % vendorPerformance.length].color}
                        radius={[4, 4, 0, 0]}
                      >
                        {vendorPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects">
          <div className="space-y-6">
            {/* Budget Overview Chart */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Monthly Budget vs Actual Spending
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { month: 'Jan', budget: 450, actual: 425, variance: -25 },
                        { month: 'Feb', budget: 380, actual: 395, variance: 15 },
                        { month: 'Mar', budget: 520, actual: 485, variance: -35 },
                        { month: 'Apr', budget: 420, actual: 445, variance: 25 },
                        { month: 'May', budget: 380, actual: 365, variance: -15 },
                        { month: 'Jun', budget: 480, actual: 505, variance: 25 }
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        axisLine={{ stroke: '#e0e0e0' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        axisLine={{ stroke: '#e0e0e0' }}
                        tickFormatter={(value) => `$${value}K`}
                      />
                      <Tooltip 
                        formatter={(value: any, name: string) => [`$${value}K`, name === 'budget' ? 'Budget' : name === 'actual' ? 'Actual' : 'Variance']}
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="budget"
                        stackId="1"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.3}
                        name="Budget"
                      />
                      <Area
                        type="monotone"
                        dataKey="actual"
                        stackId="2"
                        stroke="#ef4444"
                        fill="#ef4444"
                        fillOpacity={0.3}
                        name="Actual"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Timeline */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Project Timeline & Milestones
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[
                    { project: 'Marina Bay Residential', progress: 85, status: 'On Track', dueDate: '2024-09-15' },
                    { project: 'Orchard Office Tower', progress: 62, status: 'Delayed', dueDate: '2024-10-30' },
                    { project: 'Sentosa Resort Renovation', progress: 95, status: 'Ahead', dueDate: '2024-08-30' },
                    { project: 'Clarke Quay Commercial', progress: 40, status: 'At Risk', dueDate: '2024-11-20' }
                  ].map((project, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{project.project}</h4>
                        <Badge className={
                          project.status === 'On Track' ? 'bg-green-100 text-green-700 border-green-300' :
                          project.status === 'Ahead' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                          project.status === 'Delayed' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                          'bg-red-100 text-red-700 border-red-300'
                        }>
                          {project.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{project.progress}% Complete</span>
                        <span>Due: {project.dueDate}</span>
                      </div>
                      <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            project.status === 'On Track' || project.status === 'Ahead' ? 'bg-green-500' :
                            project.status === 'Delayed' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Budget Analysis */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-blue-600" />
                  Budget vs Actual Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {[
                    { category: 'Materials', budget: 450000, actual: 425000, variance: -25000 },
                    { category: 'Labor', budget: 320000, actual: 335000, variance: 15000 },
                    { category: 'Equipment', budget: 180000, actual: 165000, variance: -15000 },
                    { category: 'Subcontractors', budget: 280000, actual: 295000, variance: 15000 }
                  ].map((item, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{item.category}</h4>
                        <div className={`flex items-center gap-1 ${item.variance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.variance <= 0 ? (
                            <ArrowDown className="w-4 h-4" />
                          ) : (
                            <ArrowUp className="w-4 h-4" />
                          )}
                          <span className="text-sm font-medium">
                            ${Math.abs(item.variance / 1000).toFixed(0)}K {item.variance <= 0 ? 'under' : 'over'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Budget: </span>
                          <span className="font-medium">${(item.budget / 1000).toFixed(0)}K</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Actual: </span>
                          <span className="font-medium">${(item.actual / 1000).toFixed(0)}K</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            </div>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  Automated Reports
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Report
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Frequency
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Generated
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reports.map((report, index) => (
                      <motion.tr 
                        key={report.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="hover:bg-gray-50 transition-colors duration-200"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold text-gray-900">{report.title}</div>
                            <div className="text-sm text-gray-500">{report.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="text-xs">
                            {report.category}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {getFrequencyBadge(report.frequency)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{report.lastGenerated}</div>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(report.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="text-gray-600 hover:text-gray-900">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-gray-600 hover:text-gray-900">
                              <Download className="w-4 h-4" />
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
      </Tabs>
    </div>
  );
};

export default AnalyticsPage;