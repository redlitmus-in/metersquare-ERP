import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { getRoleName } from '@/utils/roleRouting';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';

// Import all role-specific dashboards
import TechnicalDirectorDashboard from '@/pages/dashboards/TechnicalDirectorDashboard';
import ProjectManagerDashboard from '@/pages/dashboards/ProjectManagerDashboard';
import ProcurementDashboard from '@/pages/dashboards/ProcurementDashboard';
import SiteSupervisorDashboard from '@/pages/dashboards/SiteSupervisorDashboard';
import MEPSupervisorDashboard from '@/pages/dashboards/MEPSupervisorDashboard';
import EstimationDashboard from '@/pages/dashboards/EstimationDashboard';
import AccountsDashboard from '@/pages/dashboards/AccountsDashboard';
import DesignDashboard from '@/pages/dashboards/DesignDashboard';

/**
 * Component that dynamically loads the appropriate dashboard based on user role
 */
const RoleDashboard: React.FC = () => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ModernLoadingSpinners variant="pulse-wave" size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">No user data available</h2>
          <p className="text-gray-500 mt-2">Please try logging in again</p>
        </div>
      </div>
    );
  }

  // Get the role name from role_id (handles both numeric and string formats)
  const roleName = getRoleName(user.role_id);
  
  // Render dashboard based on user role
  switch (roleName) {
    case UserRole.TECHNICAL_DIRECTOR:
      return <TechnicalDirectorDashboard />;
    
    case UserRole.PROJECT_MANAGER:
      return <ProjectManagerDashboard />;
    
    case UserRole.PROCUREMENT:
      return <ProcurementDashboard />;
    
    case UserRole.SITE_SUPERVISOR:
      return <SiteSupervisorDashboard />;
    
    case UserRole.MEP_SUPERVISOR:
      return <MEPSupervisorDashboard />;
    
    case UserRole.ESTIMATION:
      return <EstimationDashboard />;
    
    case UserRole.ACCOUNTS:
      return <AccountsDashboard />;
    
    case UserRole.DESIGN:
      return <DesignDashboard />;
    
    default:
      // Fallback to a generic dashboard if role is not recognized
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-700">Dashboard not configured</h2>
            <p className="text-gray-500 mt-2">Dashboard for role (ID: {user.role_id}) is not yet available</p>
            <p className="text-xs text-gray-400 mt-1">Resolved to: {roleName}</p>
          </div>
        </div>
      );
  }
};

export default RoleDashboard;