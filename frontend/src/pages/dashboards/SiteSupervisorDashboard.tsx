import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  HardHat,
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
  Hammer,
  Calendar,
  Bell,
  ChevronUp,
  ChevronDown,
  BarChart3,
  Target,
  Zap,
  Wrench,
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
  Plus
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

interface SiteData {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'completed' | 'paused' | 'planning';
  progress: number;
  workers: number;
  safety: number;
  phase: string;
  supervisor: string;
}

interface DeliveryData {
  id: string;
  material: string;
  quantity: string;
  time: string;
  status: 'pending' | 'in-transit' | 'delivered' | 'delayed';
  supplier: string;
  priority?: 'high' | 'medium' | 'low';
}

interface SafetyMetric {
  category: string;
  score: number;
  target: number;
  color: string;
}

const SiteSupervisorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(API_ENDPOINTS.DASHBOARDS.SITE_SUPERVISOR);
        console.log('Site supervisor dashboard response:', response.data);
        
        // Extract dashboard_data from the response
        if (response.data.success && response.data.dashboard_data) {
          setDashboardData(response.data.dashboard_data);
        } else {
          setDashboardData(response.data);
        }
      } catch (err: any) {
        console.error('Error fetching site supervisor dashboard:', err);
        setError(err.response?.data?.error || 'Failed to load dashboard data');
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

  // Site Progress Data - Generated from recent purchases
  const getSiteProgressData = () => {
    if (dashboardData?.recent_purchase_requests && dashboardData.recent_purchase_requests.length > 0) {
      const requests = dashboardData.recent_purchase_requests;
      // Group by week/day and calculate cumulative progress
      return requests.slice(0, 6).map((req: any, index: number) => ({
        week: `W${index + 1}`,
        planned: 20 + (index * 15),
        actual: req.status === 'approved' ? 20 + (index * 15) + 2 : 20 + (index * 15) - 2,
        materials: req.materials_summary?.total_materials || (20 + (index * 15))
      }));
    }
    
    // Return default data if no backend data
    return [
      { week: 'W1', planned: 20, actual: 18, materials: 22 },
      { week: 'W2', planned: 35, actual: 32, materials: 38 },
      { week: 'W3', planned: 50, actual: 48, materials: 52 },
      { week: 'W4', planned: 65, actual: 67, materials: 70 },
      { week: 'W5', planned: 80, actual: 82, materials: 85 },
      { week: 'W6', planned: 95, actual: 92, materials: 98 },
    ];
  };
  
  const siteProgressData = getSiteProgressData();

  // Material Flow Data - Generated from category breakdown
  const getMaterialFlowData = () => {
    if (dashboardData?.purchase_analytics?.material_details?.category_breakdown) {
      const categories = dashboardData.purchase_analytics.material_details.category_breakdown;
      const categoryNames = Object.keys(categories).slice(0, 4);
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      // Generate data for each day based on category costs
      return days.map((day, index) => {
        const dayData: any = { day };
        categoryNames.forEach((category) => {
          const baseCost = categories[category]?.cost || 0;
          // Add some variation for each day
          dayData[category.toLowerCase().replace(/\s+/g, '_')] = Math.round(baseCost * (0.8 + Math.random() * 0.4) / 6);
        });
        return dayData;
      });
    }
    
    // Return default data if no backend data
    return [
      { day: 'Mon', cement: 120, steel: 80, timber: 45, aggregate: 200 },
      { day: 'Tue', cement: 150, steel: 95, timber: 60, aggregate: 180 },
      { day: 'Wed', cement: 180, steel: 110, timber: 40, aggregate: 220 },
      { day: 'Thu', cement: 140, steel: 85, timber: 55, aggregate: 190 },
      { day: 'Fri', cement: 160, steel: 100, timber: 50, aggregate: 210 },
      { day: 'Sat', cement: 100, steel: 60, timber: 30, aggregate: 150 },
    ];
  };
  
  const materialFlowData = getMaterialFlowData();

  // Material Category Distribution from backend
  const getCategoryDistribution = () => {
    if (dashboardData?.purchase_analytics?.material_details?.category_breakdown) {
      const categories = dashboardData.purchase_analytics.material_details.category_breakdown;
      const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
      
      return Object.entries(categories).slice(0, 6).map(([name, details]: [string, any], index) => ({
        name: name || 'Uncategorized',
        value: details.count || 0,
        color: colors[index % colors.length]
      }));
    }
    
    // Return empty array if no data
    return [];
  };
  
  const workerDistribution = getCategoryDistribution();

  // Safety Compliance Data - Use API data if available
  const safetyData: SafetyMetric[] = dashboardData?.safety_metrics || [
    { category: 'PPE Compliance', score: 95, target: 100, color: '#10B981' },
    { category: 'Site Hazards', score: 88, target: 90, color: '#3B82F6' },
    { category: 'Tool Safety', score: 92, target: 95, color: '#F59E0B' },
    { category: 'Training', score: 85, target: 90, color: '#8B5CF6' },
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
          title: 'Total Purchases', 
          value: analytics.total_purchases || 0, 
          change: 0, 
          trend: 'stable' as const, 
          icon: Package, 
          color: 'text-orange-600', 
          subtitle: `${recentRequests.length} recent` 
        },
        { 
          title: 'Total Materials', 
          value: analytics.material_details?.total_materials || 0, 
          change: 0, 
          trend: 'stable' as const, 
          icon: Hammer, 
          color: 'text-blue-600', 
          subtitle: `${analytics.material_details?.total_quantity || 0} units` 
        },
        { 
          title: 'Total Cost', 
          value: `AED ${(analytics.material_details?.total_cost || 0).toLocaleString()}`, 
          change: 0, 
          trend: 'stable' as const, 
          icon: TrendingUp, 
          color: 'text-green-600', 
          subtitle: 'All purchases' 
        },
        { 
          title: 'Email Status', 
          value: analytics.procurement_email_send || 0, 
          change: ((analytics.procurement_email_send / (analytics.total_purchases || 1)) * 100).toFixed(1), 
          trend: 'up' as const, 
          icon: Bell, 
          color: 'text-purple-600', 
          subtitle: `${analytics.procurement_unemail_send || 0} pending` 
        }
      ];
    }

    // Fallback to default metrics if no data
    return [
      { title: 'Total Purchases', value: 0, change: 0, trend: 'stable' as const, icon: Package, color: 'text-orange-600', subtitle: 'No data' },
      { title: 'Total Materials', value: 0, change: 0, trend: 'stable' as const, icon: Hammer, color: 'text-blue-600', subtitle: 'No data' },
      { title: 'Total Cost', value: 'AED 0', change: 0, trend: 'stable' as const, icon: TrendingUp, color: 'text-green-600', subtitle: 'No data' },
      { title: 'Email Status', value: 0, change: 0, trend: 'stable' as const, icon: Bell, color: 'text-purple-600', subtitle: 'No data' }
    ];
  };

  const metrics = getMetricsForPeriod();

  // Recent Purchase Requests from backend
  const getRecentPurchases = (): SiteData[] => {
    if (dashboardData?.recent_purchase_requests && dashboardData.recent_purchase_requests.length > 0) {
      return dashboardData.recent_purchase_requests.slice(0, 3).map((purchase: any) => ({
        id: purchase.purchase_id,
        name: purchase.purpose || `Request #${purchase.purchase_id}`,
        location: purchase.site_location || 'Not specified',
        status: purchase.status === 'approved' ? 'active' : 
                purchase.status === 'rejected' ? 'paused' : 
                purchase.status === 'under_review' ? 'active' : 'planning',
        progress: purchase.status === 'approved' ? 100 : 
                  purchase.status === 'rejected' ? 0 : 
                  purchase.status === 'under_review' ? 60 : 30,
        workers: purchase.materials_summary?.total_materials || 0,
        safety: purchase.materials_summary?.total_quantity || 0,
        phase: purchase.status || 'pending',
        supervisor: purchase.status_by_role || 'Site Supervisor'
      }));
    }
    
    // Return empty array if no data
    return [];
  };
  
  const sites: SiteData[] = getRecentPurchases();

  // Material Categories from backend data
  const getMaterialDeliveries = (): DeliveryData[] => {
    if (dashboardData?.purchase_analytics?.material_details?.category_breakdown) {
      const categories = Object.entries(dashboardData.purchase_analytics.material_details.category_breakdown);
      return categories.slice(0, 5).map(([category, details]: [string, any], index) => ({
        id: String(index + 1),
        material: category || 'Uncategorized',
        quantity: `${details.quantity} ${dashboardData.purchase_analytics?.material_details?.units?.[0] || 'units'}`,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: details.count > 10 ? 'delivered' : details.count > 5 ? 'in-transit' : 'pending',
        supplier: `Various suppliers`,
        priority: details.cost > 10000 ? 'high' : details.cost > 5000 ? 'medium' : 'low'
      }));
    }
    
    // Return empty array if no data
    return [];
  };
  
  const deliveries: DeliveryData[] = getMaterialDeliveries();


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'planning':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'in-transit':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'delayed':
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
    <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
            Site Operations Dashboard
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Real-time monitoring of construction sites and operations
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
            className="h-8 px-4 flex items-center gap-2 text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Package className="w-4 h-4" />
            <span>Procurement Hub</span>
          </Button>
          <select
            aria-label="Select Period"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="h-8 px-3 text-sm border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-pointer transition-colors"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-orange-500">
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
                  <div className={`p-2 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100`}>
                    <metric.icon className={`w-4 h-4 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Site Progress Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              Site Progress Tracking - {getPeriodLabel()}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={siteProgressData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fontSize: 10 }}
                    axisLine={{ stroke: '#e0e0e0' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    axisLine={{ stroke: '#e0e0e0' }}
                    label={{ value: 'Progress %', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
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
                    dataKey="materials"
                    fill="url(#materialGradient)"
                    stroke="#F59E0B"
                    strokeWidth={1}
                    name="Materials Ready"
                  />
                  <Line
                    type="monotone"
                    dataKey="planned"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#3B82F6', strokeWidth: 1, r: 3 }}
                    name="Planned"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981', strokeWidth: 1, r: 3 }}
                    name="Actual"
                  />
                  <defs>
                    <linearGradient id="materialGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Worker Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-blue-600" />
              Worker Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={workerDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {workerDistribution.map((entry, index) => (
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Material Flow Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-purple-600" />
              Material Consumption Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={materialFlowData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
                  {/* Dynamically render areas based on available categories */}
                  {materialFlowData.length > 0 && Object.keys(materialFlowData[0])
                    .filter(key => key !== 'day')
                    .slice(0, 4)
                    .map((key, index) => {
                      const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];
                      return (
                        <Area 
                          key={key}
                          type="monotone" 
                          dataKey={key} 
                          stackId="1" 
                          stroke={colors[index % colors.length]} 
                          fill={colors[index % colors.length]} 
                          name={key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1)}
                        />
                      );
                    })
                  }
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Safety Compliance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-green-600" />
              Safety Compliance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              {safetyData.map((item, index) => (
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

      {/* Sites and Deliveries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Sites */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <HardHat className="w-4 h-4 text-orange-600" />
                Recent Purchase Requests
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('../procurement', { replace: false });
                  }}
                  className="text-xs h-6 px-2 bg-orange-600 hover:bg-orange-700"
                  title="Create New Purchase Request"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Create PR
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('../procurement', { replace: false });
                  }}
                  className="text-xs h-6 px-2"
                  title="View All Purchase Requests"
                >
                  View All
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {sites.map((site, index) => (
              <motion.div 
                key={site.id} 
                className="p-3 border rounded-lg hover:bg-orange-50 transition-all cursor-pointer"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">{site.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-600">{site.location}</p>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(site.status)} text-xs`}>
                    {site.status}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{site.progress}%</span>
                  </div>
                  <Progress value={site.progress} className="h-1" />
                </div>

                <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                  <div>
                    <span className="text-gray-500">Phase</span>
                    <p className="font-semibold text-gray-900">{site.phase}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Workers</span>
                    <p className="font-semibold text-blue-600">{site.workers}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Safety</span>
                    <p className="font-semibold text-green-600">{site.safety}%</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Lead</span>
                    <p className="font-semibold text-gray-900 truncate">{site.supervisor.split(' ')[0]}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Material Deliveries */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Truck className="w-4 h-4 text-blue-600" />
                {selectedPeriod === 'day' ? "Today's" : getPeriodLabel()} Delivery Schedule
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/workflows/material-dispatch-site')}
                className="text-xs h-6 px-2"
              >
                Track All
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {deliveries.map((delivery, index) => (
              <motion.div 
                key={delivery.id} 
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-blue-50 transition-all"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }}
              >
                <div className={`p-1.5 rounded-full ${
                  delivery.status === 'delivered' ? 'bg-green-100' :
                  delivery.status === 'in-transit' ? 'bg-blue-100' :
                  delivery.status === 'delayed' ? 'bg-red-100' :
                  'bg-yellow-100'
                }`}>
                  <Truck className={`w-3 h-3 ${
                    delivery.status === 'delivered' ? 'text-green-600' :
                    delivery.status === 'in-transit' ? 'text-blue-600' :
                    delivery.status === 'delayed' ? 'text-red-600' :
                    'text-yellow-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-900">{delivery.material}</p>
                      <p className="text-xs text-gray-600">{delivery.supplier}</p>
                    </div>
                    <Badge className={`${getDeliveryStatusColor(delivery.status)} text-xs`}>
                      {delivery.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{delivery.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{delivery.quantity}</span>
                    </div>
                    {delivery.priority && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          delivery.priority === 'high' ? 'border-red-300 text-red-700' :
                          delivery.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                          'border-gray-300 text-gray-700'
                        }`}
                      >
                        {delivery.priority}
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

export default SiteSupervisorDashboard;