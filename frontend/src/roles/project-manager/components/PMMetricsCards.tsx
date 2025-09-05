/**
 * PM Metrics Cards Component
 * Displays key performance metrics for Project Manager
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, TrendingDown, Minus, Package, 
  CheckCircle, XCircle, Clock, Activity
} from 'lucide-react';
import { PMDashboardData } from '../services/projectManagerService';

interface PMMetricsCardsProps {
  data: PMDashboardData;
}

export const PMMetricsCards: React.FC<PMMetricsCardsProps> = ({ data }) => {
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, direction: 'neutral' as const };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      direction: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const
    };
  };

  // Calculate trends (using mock previous values for now)
  const previousMonth = {
    approved: Math.max(0, data.approvedThisMonth - 3),
    rejected: Math.max(0, data.rejectedThisMonth - 1),
    pending: Math.max(0, data.pendingApprovals - 2)
  };

  const metrics = [
    {
      title: 'Total Purchases',
      value: data.totalPurchases,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: calculateTrend(data.totalPurchases, data.totalPurchases - 5),
      description: 'All time'
    },
    {
      title: 'Pending Approvals',
      value: data.pendingApprovals,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: calculateTrend(data.pendingApprovals, previousMonth.pending),
      description: 'Awaiting review'
    },
    {
      title: 'Approved This Month',
      value: data.approvedThisMonth,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: calculateTrend(data.approvedThisMonth, previousMonth.approved),
      description: 'Current month'
    },
    {
      title: 'Rejected This Month',
      value: data.rejectedThisMonth,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      trend: calculateTrend(data.rejectedThisMonth, previousMonth.rejected),
      description: 'Current month'
    },
    {
      title: 'Avg. Approval Time',
      value: `${data.averageApprovalTime}`,
      unit: 'days',
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: calculateTrend(data.averageApprovalTime, data.averageApprovalTime + 0.5),
      description: 'Processing time'
    },
    {
      title: 'Approval Rate',
      value: data.totalPurchases > 0 
        ? Math.round((data.approvedThisMonth / (data.approvedThisMonth + data.rejectedThisMonth || 1)) * 100)
        : 0,
      unit: '%',
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      trend: { value: 5, direction: 'up' as const },
      description: 'This month'
    }
  ];

  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />;
      case 'down':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = (direction: 'up' | 'down' | 'neutral', isPositiveMetric: boolean = true) => {
    if (direction === 'neutral') return 'text-gray-500';
    if (direction === 'up') return isPositiveMetric ? 'text-green-600' : 'text-red-600';
    return isPositiveMetric ? 'text-red-600' : 'text-green-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`${metric.bgColor} p-3 rounded-lg`}>
                  <metric.icon className={`h-6 w-6 ${metric.color}`} />
                </div>
                {metric.trend && (
                  <div className={`flex items-center gap-1 ${
                    getTrendColor(
                      metric.trend.direction, 
                      !metric.title.includes('Rejected') && !metric.title.includes('Time')
                    )
                  }`}>
                    {getTrendIcon(metric.trend.direction)}
                    <span className="text-sm font-medium">
                      {metric.trend.value.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">
                  {metric.title}
                </p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold text-gray-900">
                    {metric.value}
                  </p>
                  {metric.unit && (
                    <span className="text-sm text-gray-600">
                      {metric.unit}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {metric.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};