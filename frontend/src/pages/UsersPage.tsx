import React, { useEffect } from 'react';
import { PlusIcon, UsersIcon } from '@heroicons/react/24/outline';
import { apiWrapper, API_ENDPOINTS } from '@/api/config';
import { User, UserRole } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const UsersPage: React.FC = () => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const data = await apiWrapper.get<User[]>(API_ENDPOINTS.USERS.LIST);
        setUsers(data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const getRoleDisplayName = (roleId: UserRole) => {
    return roleId.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const getRoleColorClass = (roleId: UserRole) => {
    const roleColorMap = {
      [UserRole.BUSINESS_OWNER]: 'role-business-owner',
      [UserRole.PROJECT_MANAGER]: 'role-project-manager',
      [UserRole.FACTORY_SUPERVISOR]: 'role-factory-supervisor',
      [UserRole.SITE_ENGINEER]: 'role-site-engineer',
      [UserRole.TECHNICIANS]: 'role-technicians',
      [UserRole.PURCHASE_TEAM]: 'role-purchase-team',
      [UserRole.ACCOUNTS]: 'role-accounts',
      [UserRole.SUB_CONTRACTORS]: 'role-sub-contractors',
      [UserRole.VENDOR_MANAGEMENT]: 'role-vendor-management',
    };
    
    return roleColorMap[roleId] || 'role-technicians';
  };

  const groupUsersByRole = () => {
    const grouped = users.reduce((acc, user) => {
      if (!acc[user.role_id]) {
        acc[user.role_id] = [];
      }
      acc[user.role_id].push(user);
      return acc;
    }, {} as Record<UserRole, User[]>);

    return grouped;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const groupedUsers = groupUsersByRole();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">
            Manage team members and their roles
          </p>
        </div>
        
        <button className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-green-100 p-3 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Active</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.is_active).length}
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
                  <UsersIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Management</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => 
                    u.role_id === UserRole.BUSINESS_OWNER || 
                    u.role_id === UserRole.PROJECT_MANAGER
                  ).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Operations</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => 
                    u.role_id === UserRole.FACTORY_SUPERVISOR || 
                    u.role_id === UserRole.SITE_ENGINEER ||
                    u.role_id === UserRole.TECHNICIANS
                  ).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users by Role */}
      <div className="space-y-6">
        {Object.entries(groupedUsers).map(([roleId, roleUsers]) => (
          <div key={roleId} className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">
                {getRoleDisplayName(roleId as UserRole)} ({roleUsers.length})
              </h2>
            </div>
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {roleUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {user.avatar_url ? (
                                <img
                                  className="h-10 w-10 rounded-full"
                                  src={user.avatar_url}
                                  alt={user.full_name}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center">
                                  <span className="text-sm font-medium text-white">
                                    {user.full_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.full_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.department || 'Not specified'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.phone || 'Not provided'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
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
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding team members.
          </p>
          <div className="mt-6">
            <button className="btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              Add User
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;