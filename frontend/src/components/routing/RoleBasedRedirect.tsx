import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getRoleDashboardPath } from '@/utils/roleRouting';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface RoleBasedRedirectProps {
  children?: React.ReactNode;
}

/**
 * Component that handles role-based redirection
 * Redirects users to their role-specific dashboard if accessing generic /dashboard
 */
const RoleBasedRedirect: React.FC<RoleBasedRedirectProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is accessing generic /dashboard, redirect to role-specific dashboard
  if (location.pathname === '/dashboard' && user.role_id) {
    const roleDashboard = getRoleDashboardPath(user.role_id);
    return <Navigate to={roleDashboard} replace />;
  }

  // Otherwise, render children
  return <>{children}</>;
};

export default RoleBasedRedirect;