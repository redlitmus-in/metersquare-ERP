import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  Package, 
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  Activity
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { getRoleDisplayName, getRoleThemeColor } from '@/utils/roleRouting';

interface DashboardMetric {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ComponentType<any>;
  color: string;
}

interface BaseDashboardProps {
  title?: string;
  subtitle?: string;
  metrics: DashboardMetric[];
  children?: React.ReactNode;
  roleSpecificContent?: React.ReactNode;
}

const BaseDashboard: React.FC<BaseDashboardProps> = ({
  title,
  subtitle,
  metrics,
  children,
  roleSpecificContent
}) => {
  const { user } = useAuthStore();
  const roleColor = getRoleThemeColor(user?.role_id || '');
  const roleName = getRoleDisplayName(user?.role_id || '');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {title || `${roleName} Dashboard`}
            </h1>
            {subtitle && (
              <p className="text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`px-4 py-2 bg-${roleColor}-100 text-${roleColor}-800 rounded-lg font-semibold`}>
            {roleName}
          </div>
        </div>
        
        {/* Current Role Indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
          <Activity className="w-4 h-4" />
          <span>Logged in as: {user?.full_name || 'User'}</span>
          <span className="text-gray-400">•</span>
          <span>Role: {roleName}</span>
          <span className="text-gray-400">•</span>
          <span>Department: {user?.department || 'N/A'}</span>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    {metric.change && (
                      <p className={`text-sm mt-1 ${
                        metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {metric.change} from last month
                      </p>
                    )}
                  </div>
                  <div className={`p-3 bg-${metric.color}-100 rounded-lg`}>
                    <Icon className={`w-6 h-6 text-${metric.color}-600`} />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Role-Specific Content */}
      {roleSpecificContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          {roleSpecificContent}
        </motion.div>
      )}

      {/* Additional Content */}
      {children && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
};

export default BaseDashboard;