import React, { useEffect, useState } from 'react';
import { PlusIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useTaskStore } from '@/store/taskStore';
import { useAuthStore } from '@/store/authStore';
import { Task, TaskStatus, Priority, UserRole } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const TasksPage: React.FC = () => {
  const { user } = useAuthStore();
  const { myTasks, fetchMyTasks, isLoading, markTaskComplete } = useTaskStore();
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  const handleTaskComplete = async (taskId: string) => {
    try {
      await markTaskComplete(taskId);
    } catch (error) {
      console.error('Failed to mark task as complete:', error);
    }
  };

  const filteredTasks = filter === 'all' 
    ? myTasks 
    : myTasks.filter(task => task.status === filter);

  const getStatusBadgeClass = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return 'badge-success';
      case TaskStatus.IN_PROGRESS:
        return 'badge-info';
      case TaskStatus.PENDING:
        return 'badge-warning';
      case TaskStatus.REJECTED:
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  };

  const getPriorityBadgeClass = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENT:
        return 'priority-urgent';
      case Priority.HIGH:
        return 'priority-high';
      case Priority.MEDIUM:
        return 'priority-medium';
      case Priority.LOW:
        return 'priority-low';
      default:
        return 'priority-medium';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-gray-600">
            Manage your assigned tasks and track progress
          </p>
        </div>
        
        {(user?.role_id === UserRole.BUSINESS_OWNER || 
          user?.role_id === UserRole.PROJECT_MANAGER) && (
          <button className="btn-primary flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Task
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <CheckCircleIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Tasks</h3>
                <p className="text-2xl font-bold text-gray-900">{myTasks.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Pending</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {myTasks.filter(t => t.status === TaskStatus.PENDING).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Completed</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {myTasks.filter(t => t.status === TaskStatus.COMPLETED).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <ClockIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">In Progress</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {myTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Tasks ({myTasks.length})
            </button>
            <button
              onClick={() => setFilter(TaskStatus.PENDING)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === TaskStatus.PENDING
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending ({myTasks.filter(t => t.status === TaskStatus.PENDING).length})
            </button>
            <button
              onClick={() => setFilter(TaskStatus.IN_PROGRESS)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === TaskStatus.IN_PROGRESS
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              In Progress ({myTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length})
            </button>
            <button
              onClick={() => setFilter(TaskStatus.COMPLETED)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === TaskStatus.COMPLETED
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Completed ({myTasks.filter(t => t.status === TaskStatus.COMPLETED).length})
            </button>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900">
            {filter === 'all' ? 'All Tasks' : `${filter.replace('_', ' ')} Tasks`}
          </h2>
        </div>
        <div className="card-body p-0">
          {filteredTasks.length > 0 ? (
            <div className="space-y-0">
              {filteredTasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`p-6 ${index !== filteredTasks.length - 1 ? 'border-b border-gray-200' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          {task.title}
                        </h3>
                        <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                        <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      
                      {task.description && (
                        <p className="text-gray-600 mt-2">{task.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500">
                        {task.due_date && (
                          <span>Due: {formatDate(task.due_date)}</span>
                        )}
                        {task.estimated_hours && (
                          <span>Estimated: {task.estimated_hours}h</span>
                        )}
                        {task.actual_hours && (
                          <span>Actual: {task.actual_hours}h</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {task.status !== TaskStatus.COMPLETED && (
                        <button
                          onClick={() => handleTaskComplete(task.id)}
                          className="btn-success text-sm"
                        >
                          Mark Complete
                        </button>
                      )}
                      <button className="btn-outline text-sm">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'all' 
                  ? "You don't have any tasks assigned yet." 
                  : `No ${filter.replace('_', ' ')} tasks found.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TasksPage;