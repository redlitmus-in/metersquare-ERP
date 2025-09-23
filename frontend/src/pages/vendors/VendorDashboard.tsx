import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  Package,
  Building2,
  ClipboardCheck,
  ArrowRight,
  Activity,
  Filter,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/store/authStore';
import { buildRolePath } from '@/utils/roleRouting';
import {
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
  RadialBarChart,
  RadialBar
} from 'recharts';
import { SimpleHorizontalCards } from '@/components/ui/SimpleHorizontalCards';
import { apiClient } from '@/api/config';
import { toast } from 'sonner';

interface VendorMetrics {
  totalVendors: number;
  activeVendors: number;
  pendingQuotations: number;
  approvedQuotations: number;
  totalSpend: number;
  avgLeadTime: number;
  complianceRate: number;
  qualityScore: number;
}

interface VendorActivity {
  id: string;
  type: 'quotation' | 'approval' | 'scope' | 'evaluation' | 'payment';
  title: string;
  description: string;
  vendor?: string;
  amount?: string;
  time: string;
  status?: 'pending' | 'approved' | 'rejected';
}

const VendorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userRole = (user as any)?.role || '';
  const userName = (user as any)?.full_name || (user as any)?.name || '';

  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<VendorMetrics>({
    totalVendors: 47,
    activeVendors: 32,
    pendingQuotations: 8,
    approvedQuotations: 124,
    totalSpend: 2450000,
    avgLeadTime: 5.2,
    complianceRate: 94,
    qualityScore: 88
  });

  const [vendorPerformance] = useState([
    { name: 'Quality', value: 88, fill: '#8b5cf6' },
    { name: 'Delivery', value: 92, fill: '#10b981' },
    { name: 'Cost', value: 85, fill: '#f59e0b' },
    { name: 'Compliance', value: 94, fill: '#3b82f6' }
  ]);

  const [categorySpend] = useState([
    { category: 'Electrical', spend: 650000, vendors: 12 },
    { category: 'Joinery', spend: 480000, vendors: 8 },
    { category: 'MEP Systems', spend: 520000, vendors: 7 },
    { category: 'Civil Works', spend: 450000, vendors: 9 },
    { category: 'Furniture', spend: 350000, vendors: 11 }
  ]);

  const [recentActivities] = useState<VendorActivity[]>([
    {
      id: '1',
      type: 'quotation',
      title: 'New Quotation Received',
      description: 'VQ-2024-089 from ABC Trading LLC',
      vendor: 'ABC Trading LLC',
      amount: 'AED 125,000',
      time: '2 hours ago',
      status: 'pending'
    },
    {
      id: '2',
      type: 'scope',
      title: 'Scope of Work Created',
      description: 'SOW-2024-045 for Project Phoenix',
      vendor: 'XYZ Contractors',
      time: '5 hours ago',
      status: 'pending'
    },
    {
      id: '3',
      type: 'approval',
      title: 'Quotation Approved',
      description: 'VQ-2024-087 approved by PM',
      vendor: 'Global MEP Solutions',
      amount: 'AED 280,000',
      time: '1 day ago',
      status: 'approved'
    },
    {
      id: '4',
      type: 'evaluation',
      title: 'Vendor Evaluation Completed',
      description: 'Performance review for Q3 2024',
      vendor: 'Prime Materials Co.',
      time: '2 days ago'
    }
  ]);

  const buildPath = (path: string) => buildRolePath(user?.role_id || '', path);

  const metricCards = [
    {
      id: 'vendors',
      title: 'Active Vendors',
      value: `${metrics.activeVendors}`,
      subtitle: `of ${metrics.totalVendors} total`,
      icon: <Users className="w-4 h-4 text-blue-600" />,
      bgColor: 'bg-blue-100',
      trend: { value: 5.2, isUp: true }
    },
    {
      id: 'quotations',
      title: 'Pending Quotations',
      value: metrics.pendingQuotations,
      subtitle: 'awaiting review',
      icon: <FileText className="w-4 h-4 text-blue-600" />,
      bgColor: 'bg-blue-100',
      trend: { value: 12, isUp: true }
    },
    {
      id: 'spend',
      title: 'Total Spend',
      value: `AED ${(metrics.totalSpend / 1000000).toFixed(1)}M`,
      subtitle: 'this quarter',
      icon: <DollarSign className="w-4 h-4 text-green-600" />,
      bgColor: 'bg-green-100',
      trend: { value: 8.3, isUp: false }
    },
    {
      id: 'compliance',
      title: 'Compliance Rate',
      value: `${metrics.complianceRate}%`,
      subtitle: 'vendor compliance',
      icon: <Award className="w-4 h-4 text-amber-600" />,
      bgColor: 'bg-amber-100',
      trend: { value: 2.1, isUp: true }
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quotation': return <FileText className="w-4 h-4" />;
      case 'approval': return <CheckCircle className="w-4 h-4" />;
      case 'scope': return <ClipboardCheck className="w-4 h-4" />;
      case 'evaluation': return <Award className="w-4 h-4" />;
      case 'payment': return <DollarSign className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'quotation': return 'text-blue-500 bg-blue-50';
      case 'approval': return 'text-green-500 bg-green-50';
      case 'scope': return 'text-blue-500 bg-blue-50';
      case 'evaluation': return 'text-amber-500 bg-amber-50';
      case 'payment': return 'text-indigo-500 bg-indigo-50';
      default: return 'text-gray-500 bg-gray-50';
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
              <Users className="w-7 h-7 text-blue-600" />
              Vendor Management Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage vendors, quotations, and scope of work
              {userName && <span className="ml-2 text-xs">• Welcome, {userName}</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(buildPath('/vendors/list'))}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Vendor List
            </Button>
            <Button
              onClick={() => navigate(buildPath('/vendors/scope-of-work'))}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              New Scope of Work
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Metrics Cards */}
      <SimpleHorizontalCards
        cards={metricCards}
        className="mb-4"
      />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vendor Performance Radar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Vendor Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={vendorPerformance}>
                  <RadialBar dataKey="value" cornerRadius={10} fill="#8b5cf6" />
                  <Tooltip />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {vendorPerformance.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-medium text-gray-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Spend Analysis */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Spend by Category</CardTitle>
                <Badge variant="secondary">Last Quarter</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsBarChart data={categorySpend}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="category" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(value: any) => `AED ${(value / 1000).toFixed(0)}K`} />
                  <Bar dataKey="spend" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-5 gap-2 mt-4">
                {categorySpend.map((cat) => (
                  <div key={cat.category} className="text-center">
                    <p className="text-xs text-gray-600">{cat.vendors} vendors</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions and Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate(buildPath('/vendors/quotations'))}
              >
                <FileText className="w-4 h-4 text-blue-600" />
                Review Quotations
                {metrics.pendingQuotations > 0 && (
                  <Badge variant="destructive" className="ml-auto">{metrics.pendingQuotations}</Badge>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate(buildPath('/vendors/scope-of-work'))}
              >
                <ClipboardCheck className="w-4 h-4 text-blue-600" />
                Create Scope of Work
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate(buildPath('/vendors/list'))}
              >
                <Users className="w-4 h-4 text-green-600" />
                Manage Vendors
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <Award className="w-4 h-4 text-amber-600" />
                Vendor Evaluation
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activities */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
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
                          {activity.vendor && (
                            <p className="text-xs text-gray-500 mt-1">Vendor: {activity.vendor}</p>
                          )}
                          {activity.amount && (
                            <p className="text-xs font-medium text-blue-600 mt-1">{activity.amount}</p>
                          )}
                        </div>
                        {activity.status && (
                          <Badge
                            variant={
                              activity.status === 'approved' ? 'default' :
                              activity.status === 'pending' ? 'secondary' : 'destructive'
                            }
                            className="text-xs"
                          >
                            {activity.status}
                          </Badge>
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

      {/* KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Key Performance Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900">Avg Lead Time</p>
                    <p className="text-2xl font-bold text-green-700 mt-1">{metrics.avgLeadTime} days</p>
                    <p className="text-xs text-green-600 mt-1">Target: 5 days</p>
                  </div>
                  <Clock className="w-5 h-5 text-green-500" />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Quality Score</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{metrics.qualityScore}%</p>
                    <p className="text-xs text-blue-600 mt-1">Target: 90%</p>
                  </div>
                  <Award className="w-5 h-5 text-blue-500" />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Compliance Rate</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{metrics.complianceRate}%</p>
                    <p className="text-xs text-blue-600 mt-1">Target: 95%</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-900">Approved Quotations</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">{metrics.approvedQuotations}</p>
                    <p className="text-xs text-amber-600 mt-1">This quarter</p>
                  </div>
                  <FileText className="w-5 h-5 text-amber-500" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default VendorDashboard;