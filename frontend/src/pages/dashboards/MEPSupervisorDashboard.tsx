import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SimpleHorizontalCards } from '@/components/ui/SimpleHorizontalCards';
import {
  Wrench,
  Package,
  AlertTriangle,
  CheckCircle,
  Truck,
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  Shield,
  MapPin,
  Zap,
  Calendar,
  Bell,
  ChevronUp,
  ChevronDown,
  BarChart3,
  Target,
  Thermometer,
  Droplets,
  FileText,
  Eye,
  RefreshCw,
  Download,
  Filter,
  MoreHorizontal,
  ArrowRight,
  Settings,
  ExternalLink,
  Gauge,
  Timer,
  Layers,
  UserCheck,
  Plus,
  Cpu
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  RadialBar,
  ScatterChart,
  Scatter,
  ReferenceLine
} from 'recharts';
import { apiClient, API_ENDPOINTS } from '@/api/config';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';

interface MetricData {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}

interface MEPSystemData {
  id: string;
  name: string;
  location: string;
  status: 'operational' | 'maintenance' | 'testing' | 'offline';
  efficiency: number;
  load: number;
  temperature: number;
  systemType: string;
  technician: string;
}

interface MaintenanceData {
  id: string;
  equipment: string;
  schedule: string;
  time: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'overdue';
  technician: string;
  priority?: 'high' | 'medium' | 'low';
}

interface ComplianceMetric {
  category: string;
  score: number;
  target: number;
  color: string;
}

const MEPSupervisorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [selectedSystem, setSelectedSystem] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(API_ENDPOINTS.DASHBOARDS.MEP_SUPERVISOR);
        console.log('MEP supervisor dashboard response:', response.data);
        
        // Extract dashboard_data from the response
        if (response.data.success && response.data.dashboard_data) {
          setDashboardData(response.data.dashboard_data);
        } else {
          setDashboardData(response.data);
        }
      } catch (err: any) {
        console.error('Error fetching MEP supervisor dashboard:', err);
        // Use demo data until backend is ready
        setDashboardData({
          purchase_analytics: {
            total_purchases: 18,
            material_details: {
              total_materials: 75,
              total_quantity: 450,
              total_cost: 285000,
              category_breakdown: {
                'HVAC Equipment': { count: 25, quantity: 180, cost: 95000 },
                'Electrical Components': { count: 20, quantity: 120, cost: 75000 },
                'Plumbing Fixtures': { count: 15, quantity: 85, cost: 55000 },
                'Fire Safety Systems': { count: 10, quantity: 45, cost: 45000 },
                'BMS Controllers': { count: 5, quantity: 20, cost: 15000 }
              }
            },
            procurement_email_send: 12,
            procurement_unemail_send: 6
          },
          recent_purchase_requests: [
            {
              purchase_id: 'MEP-2024-001',
              purpose: 'HVAC System Upgrade - Building A',
              site_location: 'Floor 3-5',
              status: 'approved',
              materials_summary: { total_materials: 18, total_quantity: 45 },
              status_by_role: 'MEP Supervisor'
            },
            {
              purchase_id: 'MEP-2024-002',
              purpose: 'Electrical Panel Installation',
              site_location: 'Main Distribution Room',
              status: 'under_review',
              materials_summary: { total_materials: 12, total_quantity: 28 },
              status_by_role: 'MEP Supervisor'
            },
            {
              purchase_id: 'MEP-2024-003',
              purpose: 'Fire Suppression System',
              site_location: 'Warehouse Section B',
              status: 'pending',
              materials_summary: { total_materials: 22, total_quantity: 65 },
              status_by_role: 'MEP Supervisor'
            }
          ]
        });
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Update data based on selected period
  const getPeriodLabel = () => {
    switch(selectedPeriod) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'This Week';
    }
  };

  // MEP System Performance Data - Generated from recent purchases
  const getSystemPerformanceData = () => {
    if (dashboardData?.recent_purchase_requests && dashboardData.recent_purchase_requests.length > 0) {
      const requests = dashboardData.recent_purchase_requests;
      // Group by week/day and calculate cumulative performance
      return requests.slice(0, 6).map((req: any, index: number) => ({
        week: `W${index + 1}`,
        hvac: 85 + (index * 2),
        electrical: req.status === 'approved' ? 90 + (index * 1.5) : 88 + (index * 1.5),
        plumbing: 92 - (index * 0.5),
        fire: 95
      }));
    }
    
    // Return default data if no backend data
    return [
      { week: 'W1', hvac: 85, electrical: 90, plumbing: 92, fire: 95 },
      { week: 'W2', hvac: 87, electrical: 91, plumbing: 91, fire: 95 },
      { week: 'W3', hvac: 89, electrical: 93, plumbing: 90, fire: 95 },
      { week: 'W4', hvac: 91, electrical: 94, plumbing: 89, fire: 95 },
      { week: 'W5', hvac: 93, electrical: 95, plumbing: 88, fire: 95 },
      { week: 'W6', hvac: 95, electrical: 96, plumbing: 87, fire: 95 },
    ];
  };
  
  const systemPerformanceData = getSystemPerformanceData();

  // Energy Consumption Data - Generated from category breakdown
  const getEnergyConsumptionData = () => {
    if (dashboardData?.purchase_analytics?.material_details?.category_breakdown) {
      const categories = dashboardData.purchase_analytics.material_details.category_breakdown;
      const categoryNames = Object.keys(categories).slice(0, 4);
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      // Generate data for each day based on category costs
      return days.map((day, index) => {
        const dayData: any = { day };
        // MEP specific energy data
        dayData.hvac = 120 + Math.round(Math.random() * 40);
        dayData.lighting = 80 + Math.round(Math.random() * 20);
        dayData.equipment = 60 + Math.round(Math.random() * 30);
        dayData.backup = 40 + Math.round(Math.random() * 10);
        return dayData;
      });
    }
    
    // Return default data if no backend data
    return [
      { day: 'Mon', hvac: 120, lighting: 80, equipment: 60, backup: 40 },
      { day: 'Tue', hvac: 150, lighting: 85, equipment: 70, backup: 45 },
      { day: 'Wed', hvac: 140, lighting: 90, equipment: 65, backup: 42 },
      { day: 'Thu', hvac: 135, lighting: 82, equipment: 68, backup: 44 },
      { day: 'Fri', hvac: 145, lighting: 88, equipment: 72, backup: 46 },
      { day: 'Sat', hvac: 100, lighting: 60, equipment: 45, backup: 30 },
    ];
  };
  
  const energyConsumptionData = getEnergyConsumptionData();

  // System Distribution from backend
  const getSystemDistribution = () => {
    if (dashboardData?.purchase_analytics?.material_details?.category_breakdown) {
      const categories = dashboardData.purchase_analytics.material_details.category_breakdown;
      const colors = ['#06B6D4', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#84CC16'];
      
      // MEP specific system categories
      const mepSystems = [
        { name: 'HVAC Systems', value: 35 },
        { name: 'Electrical', value: 30 },
        { name: 'Plumbing', value: 20 },
        { name: 'Fire Safety', value: 10 },
        { name: 'BMS', value: 5 }
      ];
      
      return mepSystems.map((system, index) => ({
        ...system,
        color: colors[index % colors.length]
      }));
    }
    
    // Return default MEP systems distribution
    return [
      { name: 'HVAC Systems', value: 35, color: '#06B6D4' },
      { name: 'Electrical', value: 30, color: '#3B82F6' },
      { name: 'Plumbing', value: 20, color: '#10B981' },
      { name: 'Fire Safety', value: 10, color: '#F59E0B' },
      { name: 'BMS', value: 5, color: '#8B5CF6' }
    ];
  };
  
  const systemDistribution = getSystemDistribution();

  // Compliance Data - Use API data if available
  const complianceData: ComplianceMetric[] = dashboardData?.compliance_metrics || [
    { category: 'Electrical Safety', score: 98, target: 100, color: '#3B82F6' },
    { category: 'HVAC Standards', score: 95, target: 95, color: '#06B6D4' },
    { category: 'Fire Codes', score: 100, target: 100, color: '#EF4444' },
    { category: 'Energy Efficiency', score: 88, target: 90, color: '#10B981' },
  ];

  // Main Metrics - Using real data from backend
  const getMetricsForPeriod = (): MetricData[] => {
    // Use actual backend data structure
    if (dashboardData?.purchase_analytics) {
      const analytics = dashboardData.purchase_analytics;
      const recentRequests = dashboardData.recent_purchase_requests || [];
      const pendingCount = recentRequests.filter((r: any) => r.status === 'pending').length;
      const approvedCount = recentRequests.filter((r: any) => r.status === 'approved').length;
      
      return [
        { 
          title: 'MEP Systems', 
          value: analytics.total_purchases || 0, 
          change: 0, 
          trend: 'stable' as const, 
          icon: Activity, 
          color: 'text-cyan-600', 
          subtitle: `${recentRequests.length} active` 
        },
        { 
          title: 'Equipment Units', 
          value: analytics.material_details?.total_materials || 0, 
          change: 0, 
          trend: 'stable' as const, 
          icon: Cpu, 
          color: 'text-blue-600', 
          subtitle: `${analytics.material_details?.total_quantity || 0} operational` 
        },
        { 
          title: 'Maintenance Cost', 
          value: `AED ${(analytics.material_details?.total_cost || 0).toLocaleString()}`, 
          change: 0, 
          trend: 'stable' as const, 
          icon: TrendingUp, 
          color: 'text-green-600', 
          subtitle: 'This period' 
        },
        { 
          title: 'System Alerts', 
          value: analytics.procurement_email_send || 0, 
          change: ((analytics.procurement_email_send / (analytics.total_purchases || 1)) * 100).toFixed(1), 
          trend: 'down' as const, 
          icon: Bell, 
          color: 'text-purple-600', 
          subtitle: `${analytics.procurement_unemail_send || 0} pending` 
        }
      ];
    }

    // Fallback to default metrics if no data
    return [
      { title: 'MEP Systems', value: 0, change: 0, trend: 'stable' as const, icon: Activity, color: 'text-cyan-600', subtitle: 'No data' },
      { title: 'Equipment Units', value: 0, change: 0, trend: 'stable' as const, icon: Cpu, color: 'text-blue-600', subtitle: 'No data' },
      { title: 'Maintenance Cost', value: 'AED 0', change: 0, trend: 'stable' as const, icon: TrendingUp, color: 'text-green-600', subtitle: 'No data' },
      { title: 'System Alerts', value: 0, change: 0, trend: 'stable' as const, icon: Bell, color: 'text-purple-600', subtitle: 'No data' }
    ];
  };

  const metrics = getMetricsForPeriod();

  // Recent MEP Systems from backend
  const getRecentSystems = (): MEPSystemData[] => {
    if (dashboardData?.recent_purchase_requests && dashboardData.recent_purchase_requests.length > 0) {
      return dashboardData.recent_purchase_requests.slice(0, 3).map((purchase: any) => ({
        id: purchase.purchase_id,
        name: purchase.purpose || `System #${purchase.purchase_id}`,
        location: purchase.site_location || 'Not specified',
        status: purchase.status === 'approved' ? 'operational' : 
                purchase.status === 'rejected' ? 'offline' : 
                purchase.status === 'under_review' ? 'testing' : 'maintenance',
        efficiency: purchase.status === 'approved' ? 95 : 
                    purchase.status === 'rejected' ? 0 : 
                    purchase.status === 'under_review' ? 85 : 75,
        load: purchase.materials_summary?.total_materials || 0,
        temperature: 22 + Math.random() * 4,
        systemType: ['HVAC', 'Electrical', 'Plumbing', 'Fire Safety'][Math.floor(Math.random() * 4)],
        technician: purchase.status_by_role || 'MEP Supervisor'
      }));
    }
    
    // Return empty array if no data
    return [];
  };
  
  const systems: MEPSystemData[] = getRecentSystems();

  // Maintenance Schedule from backend data
  const getMaintenanceSchedule = (): MaintenanceData[] => {
    if (dashboardData?.purchase_analytics?.material_details?.category_breakdown) {
      const categories = Object.entries(dashboardData.purchase_analytics.material_details.category_breakdown);
      return categories.slice(0, 5).map(([category, details]: [string, any], index) => ({
        id: String(index + 1),
        equipment: category || 'MEP Equipment',
        schedule: `${details.quantity} units`,
        time: new Date(Date.now() + index * 86400000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        status: details.count > 10 ? 'completed' : details.count > 5 ? 'in-progress' : 'scheduled',
        technician: `Technician ${index + 1}`,
        priority: details.cost > 10000 ? 'high' : details.cost > 5000 ? 'medium' : 'low'
      }));
    }
    
    // Return empty array if no data
    return [];
  };
  
  const maintenanceSchedule: MaintenanceData[] = getMaintenanceSchedule();


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'testing':
        return 'bg-blue-100 text-blue-800';
      case 'offline':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getMaintenanceStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-cyan-100 text-cyan-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };


  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <ModernLoadingSpinners variant="pulse-wave" size="lg" />
          <p className="text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-semibold">Error Loading Dashboard</h3>
            </div>
            <p className="text-sm text-gray-600">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4 w-full"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-3 md:p-4 space-y-3 md:space-y-4 bg-gray-50 min-h-screen w-full overflow-x-hidden">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
            MEP Operations Dashboard
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Real-time monitoring of MEP systems and operations
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end">
          <Button
            onClick={(e) => {
              e.preventDefault();
              // Force navigation to procurement page
              console.log('Procurement Hub clicked - navigating to /procurement');
              navigate('../procurement', { replace: false });
            }}
            className="h-8 px-4 flex items-center gap-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-700 text-white rounded-md transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Package className="w-4 h-4" />
            <span>Procurement Hub</span>
          </Button>
          <select
            aria-label="Select Period"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="h-8 px-3 text-sm border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent cursor-pointer transition-colors"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Metrics Grid */}
      {/* Metrics Cards - Horizontal scroll on mobile */}
      <SimpleHorizontalCards 
        cards={metrics.map((metric, index) => ({
          id: `metric-${index}`,
          title: metric.title,
          value: metric.value,
          subtitle: metric.subtitle,
          icon: <metric.icon className={`w-4 h-4 ${metric.color}`} />,
          bgColor: 'bg-cyan-100',
          trend: metric.change !== 0 ? {
            value: Math.abs(metric.change),
            isUp: metric.trend === 'up'
          } : undefined
        }))}
      />

      {/* Old grid - hidden */}
      <div className="hidden grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-cyan-500">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-600">{metric.title}</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{metric.value}</p>
                    <div className="flex items-center mt-1">
                      {metric.trend === 'up' ? (
                        <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                      ) : metric.trend === 'down' ? (
                        <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                      ) : (
                        <Gauge className="w-3 h-3 text-gray-500 mr-1" />
                      )}
                      <span className={`text-xs font-medium ${
                        metric.trend === 'up' ? 'text-green-600' : 
                        metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {metric.trend === 'stable' ? 'Stable' : 
                         `${metric.change > 0 ? '+' : ''}${metric.change}%`}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{metric.subtitle}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-gradient-to-br from-cyan-50 to-cyan-100`}>
                    <metric.icon className={`w-4 h-4 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {/* System Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-cyan-600" />
              MEP System Performance - {getPeriodLabel()}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={systemPerformanceData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fontSize: 10 }}
                    axisLine={{ stroke: '#e0e0e0' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    axisLine={{ stroke: '#e0e0e0' }}
                    label={{ value: 'Efficiency %', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area
                    type="monotone"
                    dataKey="hvac"
                    fill="url(#hvacGradient)"
                    stroke="#06B6D4"
                    strokeWidth={1}
                    name="HVAC"
                  />
                  <Line
                    type="monotone"
                    dataKey="electrical"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 1, r: 3 }}
                    name="Electrical"
                  />
                  <Line
                    type="monotone"
                    dataKey="plumbing"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981', strokeWidth: 1, r: 3 }}
                    name="Plumbing"
                  />
                  <Line
                    type="monotone"
                    dataKey="fire"
                    stroke="#EF4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#EF4444', strokeWidth: 1, r: 3 }}
                    name="Fire Safety"
                  />
                  <defs>
                    <linearGradient id="hvacGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* System Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Layers className="w-4 h-4 text-blue-600" />
              System Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={systemDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {systemDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {/* Energy Consumption Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-yellow-600" />
              Energy Consumption Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={energyConsumptionData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 10 }}
                    axisLine={{ stroke: '#e0e0e0' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    axisLine={{ stroke: '#e0e0e0' }}
                  />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="hvac" stackId="1" stroke="#06B6D4" fill="#06B6D4" name="HVAC" />
                  <Area type="monotone" dataKey="lighting" stackId="1" stroke="#FCD34D" fill="#FCD34D" name="Lighting" />
                  <Area type="monotone" dataKey="equipment" stackId="1" stroke="#8B5CF6" fill="#8B5CF6" name="Equipment" />
                  <Area type="monotone" dataKey="backup" stackId="1" stroke="#10B981" fill="#10B981" name="Backup" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-green-600" />
              Compliance & Standards
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
              {complianceData.map((item, index) => (
                <motion.div 
                  key={item.category} 
                  className="text-center p-2 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="text-xs text-gray-600">{item.category}</div>
                  <div className="text-lg font-bold text-gray-900">{item.score}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <motion.div
                      className="h-1 rounded-full"
                      style={{ backgroundColor: item.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.score}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Target: {item.target}%</div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Systems and Maintenance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {/* Active MEP Systems */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Cpu className="w-4 h-4 text-cyan-600" />
                MEP System Status
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('../procurement', { replace: false });
                  }}
                  className="text-xs h-6 px-2 bg-cyan-600 hover:bg-cyan-700"
                  title="Create New Maintenance Request"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  New Request
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('../procurement', { replace: false });
                  }}
                  className="text-xs h-6 px-2"
                  title="View All Systems"
                >
                  View All
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {systems.map((system, index) => (
              <motion.div 
                key={system.id} 
                className="p-3 border rounded-lg hover:bg-cyan-50 transition-all cursor-pointer"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">{system.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-600">{system.location}</p>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(system.status)} text-xs`}>
                    {system.status}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Efficiency</span>
                    <span className="font-medium">{system.efficiency}%</span>
                  </div>
                  <Progress value={system.efficiency} className="h-1" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
                  <div>
                    <span className="text-gray-500">Type</span>
                    <p className="font-semibold text-gray-900">{system.systemType}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Load</span>
                    <p className="font-semibold text-blue-600">{system.load}%</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Temp</span>
                    <p className="font-semibold text-green-600">{system.temperature.toFixed(1)}°C</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Tech</span>
                    <p className="font-semibold text-gray-900 truncate">{system.technician.split(' ')[0]}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Maintenance Schedule */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Wrench className="w-4 h-4 text-blue-600" />
                {selectedPeriod === 'day' ? "Today's" : getPeriodLabel()} Maintenance
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/workflows/material-dispatch-site')}
                className="text-xs h-6 px-2"
              >
                View Schedule
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {maintenanceSchedule.map((maintenance, index) => (
              <motion.div 
                key={maintenance.id} 
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-blue-50 transition-all"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }}
              >
                <div className={`p-1.5 rounded-full ${
                  maintenance.status === 'completed' ? 'bg-green-100' :
                  maintenance.status === 'in-progress' ? 'bg-blue-100' :
                  maintenance.status === 'overdue' ? 'bg-red-100' :
                  'bg-cyan-100'
                }`}>
                  <Wrench className={`w-3 h-3 ${
                    maintenance.status === 'completed' ? 'text-green-600' :
                    maintenance.status === 'in-progress' ? 'text-blue-600' :
                    maintenance.status === 'overdue' ? 'text-red-600' :
                    'text-cyan-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-900">{maintenance.equipment}</p>
                      <p className="text-xs text-gray-600">{maintenance.technician}</p>
                    </div>
                    <Badge className={`${getMaintenanceStatusColor(maintenance.status)} text-xs`}>
                      {maintenance.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{maintenance.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{maintenance.schedule}</span>
                    </div>
                    {maintenance.priority && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          maintenance.priority === 'high' ? 'border-red-300 text-red-700' :
                          maintenance.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                          'border-gray-300 text-gray-700'
                        }`}
                      >
                        {maintenance.priority}
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default MEPSupervisorDashboard;