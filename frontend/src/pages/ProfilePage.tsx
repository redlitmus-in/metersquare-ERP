import React from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';

const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Info */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
        </div>
        <div className="card-body">
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              {user?.avatar_url ? (
                <img
                  className="h-20 w-20 rounded-full"
                  src={user.avatar_url}
                  alt={user.full_name}
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-primary-600 flex items-center justify-center">
                  <span className="text-2xl font-medium text-white">
                    {user?.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-medium text-gray-900">{user?.full_name}</h3>
              <p className="text-gray-500">{user?.email}</p>
              <p className="text-sm text-gray-500">
                {user?.role_id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {user?.department || 'Not specified'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {user?.phone || 'Not provided'}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <button className="btn-primary">
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;