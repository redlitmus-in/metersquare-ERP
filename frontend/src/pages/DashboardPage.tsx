import React, { useEffect, useState } from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  FolderIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import { useProjectStore } from '@/store/projectStore';
import { useTaskStore } from '@/store/taskStore';
import { apiWrapper, API_ENDPOINTS } from '@/api/config';
import { DashboardStats, UserRole } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  textColor: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  textColor,
}) => (
  <div className="card">
    <div className="card-body">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`${bgColor} p-3 rounded-lg`}>
            <Icon className={`h-6 w-6 ${textColor}`} />
          </div>
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
      </div>
    </div>
  </div>
);

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { projects, fetchProjects } = useProjectStore();
  const { myTasks, fetchMyTasks } = useTaskStore();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch dashboard stats
        const stats = await apiWrapper.get<DashboardStats>(
          API_ENDPOINTS.ANALYTICS.DASHBOARD
        );
        setDashboardStats(stats);

        // Fetch user-specific data
        if (user?.role_id === UserRole.BUSINESS_OWNER || 
            user?.role_id === UserRole.PROJECT_MANAGER) {
          await fetchProjects();
        }
        
        await fetchMyTasks();
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user, fetchProjects, fetchMyTasks]);

  const getRoleSpecificContent = () => {
    switch (user?.role_id) {
      case UserRole.BUSINESS_OWNER:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Projects"
              value={dashboardStats?.total_projects || 0}
              icon={FolderIcon}
              color="text-blue-600"
              bgColor="bg-blue-100"
              textColor="text-blue-600"
            />
            <StatCard
              title="Active Projects"
              value={dashboardStats?.active_projects || 0}
              icon={ChartBarIcon}
              color="text-green-600"
              bgColor="bg-green-100"
              textColor="text-green-600"
            />
            <StatCard
              title="Pending Approvals"
              value={dashboardStats?.pending_approvals || 0}
              icon={ExclamationCircleIcon}
              color="text-orange-600"
              bgColor="bg-orange-100"
              textColor="text-orange-600"
            />
            <StatCard
              title="Budget Utilization"
              value={`₹${(dashboardStats?.actual_spend || 0).toLocaleString()}`}
              icon={ChartBarIcon}
              color="text-purple-600"
              bgColor="bg-purple-100"
              textColor="text-purple-600"
            />
          </div>
        );

      case UserRole.PROJECT_MANAGER:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="My Projects"
              value={dashboardStats?.total_projects || 0}
              icon={FolderIcon}
              color="text-blue-600"
              bgColor="bg-blue-100"
              textColor="text-blue-600"
            />
            <StatCard
              title="Pending Tasks"
              value={dashboardStats?.pending_tasks || 0}
              icon={ClockIcon}
              color="text-orange-600"
              bgColor="bg-orange-100"
              textColor="text-orange-600"
            />
            <StatCard
              title="Pending Approvals"
              value={dashboardStats?.pending_approvals || 0}
              icon={ExclamationCircleIcon}
              color="text-red-600"
              bgColor="bg-red-100"
              textColor="text-red-600"
            />
          </div>
        );

      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <StatCard
              title="Pending Tasks"
              value={myTasks.filter(t => t.status === 'pending').length}
              icon={ClockIcon}
              color="text-orange-600"
              bgColor="bg-orange-100"
              textColor="text-orange-600"
            />
            <StatCard
              title="Completed Tasks"
              value={myTasks.filter(t => t.status === 'completed').length}
              icon={CheckCircleIcon}
              color="text-green-600"
              bgColor="bg-green-100"
              textColor="text-green-600"
            />
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="card">
        <div className="card-body">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.full_name}!
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.role_id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} Dashboard
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {getRoleSpecificContent()}

      {/* Recent Tasks Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900">Recent Tasks</h2>
        </div>
        <div className="card-body">
          {myTasks.length > 0 ? (
            <div className="space-y-4">
              {myTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      {task.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {task.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`badge ${
                      task.priority === 'urgent' ? 'priority-urgent' :
                      task.priority === 'high' ? 'priority-high' :
                      task.priority === 'medium' ? 'priority-medium' :
                      'priority-low'
                    }`}>
                      {task.priority}
                    </span>
                    <span className={`badge ${
                      task.status === 'completed' ? 'badge-success' :
                      task.status === 'in_progress' ? 'badge-info' :
                      task.status === 'pending' ? 'badge-warning' :
                      'badge-danger'
                    }`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
              <p className="mt-1 text-sm text-gray-500">
                You don't have any tasks assigned yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="btn-primary text-center p-4 rounded-lg">
              View Process Flow
            </button>
            <button className="btn-secondary text-center p-4 rounded-lg">
              My Tasks
            </button>
            {(user?.role_id === UserRole.BUSINESS_OWNER || 
              user?.role_id === UserRole.PROJECT_MANAGER) && (
              <>
                <button className="btn-outline text-center p-4 rounded-lg">
                  Create Project
                </button>
                <button className="btn-outline text-center p-4 rounded-lg">
                  Assign Task
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;