import React, { useEffect } from 'react';
import { PlusIcon, FolderIcon } from '@heroicons/react/24/outline';
import { useProjectStore } from '@/store/projectStore';
import { useAuthStore } from '@/store/authStore';
import { ProjectStatus } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const ProjectsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { projects, fetchProjects, isLoading } = useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const getStatusBadgeClass = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.COMPLETED:
        return 'badge-success';
      case ProjectStatus.IN_PROGRESS:
        return 'badge-info';
      case ProjectStatus.PLANNING:
        return 'badge-warning';
      case ProjectStatus.ON_HOLD:
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
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
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600">
            Manage your interior design projects
          </p>
        </div>
        
        <button className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          New Project
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <FolderIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Projects</h3>
                <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-green-100 p-3 rounded-lg">
                  <FolderIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Active</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {projects.filter(p => p.status === ProjectStatus.IN_PROGRESS).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <FolderIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Planning</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {projects.filter(p => p.status === ProjectStatus.PLANNING).length}
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
                  <FolderIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Completed</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {projects.filter(p => p.status === ProjectStatus.COMPLETED).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900">All Projects</h2>
        </div>
        <div className="card-body p-0">
          {projects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {project.name}
                          </div>
                          {project.description && (
                            <div className="text-sm text-gray-500">
                              {project.description.length > 50 
                                ? `${project.description.substring(0, 50)}...`
                                : project.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {project.client_name || 'Not specified'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getStatusBadgeClass(project.status)}`}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {project.budget ? formatCurrency(project.budget) : 'Not set'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Spent: {formatCurrency(project.actual_cost)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {project.start_date ? formatDate(project.start_date) : 'Not set'}
                        </div>
                        {project.end_date && (
                          <div className="text-xs text-gray-500">
                            Due: {formatDate(project.end_date)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2 justify-end">
                          <button className="text-primary-600 hover:text-primary-900">
                            View
                          </button>
                          <button className="text-gray-600 hover:text-gray-900">
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new project.
              </p>
              <div className="mt-6">
                <button className="btn-primary">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New Project
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectsPage;