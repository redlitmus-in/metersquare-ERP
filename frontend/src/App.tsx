import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { validateSupabaseConnection } from '@/utils/environment';
import { setupCacheValidator } from '@/utils/clearCache';

// Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import LoginPageOTP from '@/pages/auth/LoginPageOTP';
import ModernDashboard from '@/pages/ModernDashboard';
import TasksPage from '@/pages/common/TasksPage';
import ProjectsPage from '@/pages/common/ProjectsPage';
import ProcessFlowPage from '@/pages/common/ProcessFlowPage';
import ProfilePage from '@/pages/common/ProfilePage';
import AnalyticsPage from '@/pages/common/AnalyticsPage';
import ProcurementDashboard from '@/pages/dashboards/ProcurementDashboard';
import WorkflowStatusPage from '@/pages/common/WorkflowStatusPage';

// Role-specific dashboards
import {
  TechnicalDirectorDashboard,
  ProjectManagerDashboard,
  ProcurementDashboard as ProcurementOfficerDashboard,
  SiteSupervisorDashboard,
  MEPSupervisorDashboard,
  EstimationDashboard,
  AccountsDashboard,
  DesignDashboard
} from '@/pages/dashboards';

// Procurement pages (now in roles folder)
import { 
  ProcurementHub,
  DeliveriesPage,
  ApprovalsPage,
  PurchaseRequestsPage,
  VendorQuotationsPage
} from '@/roles/procurement/pages';

// Project Manager pages
import { ProjectManagerHub } from '@/roles/project-manager';

import EstimationHub from '@/roles/estimation/pages/EstimationHub';
import TechnicalDirectorHub from '@/roles/technical-director/pages/TechnicalDirectorHub';
// Workflow pages
import MaterialDispatchProductionPage from '@/pages/workflows/MaterialDispatchProductionPage';
import MaterialDispatchSitePage from '@/pages/workflows/MaterialDispatchSitePage';

// Layout
import DashboardLayout from '@/components/layout/DashboardLayout';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import RoleBasedRedirect from '@/components/routing/RoleBasedRedirect';
import RoleRouteWrapper from '@/components/routing/RoleRouteWrapper';
import RoleDashboard from '@/components/routing/RoleDashboard';

// Role-specific Procurement Hub Component
const RoleSpecificProcurementHub: React.FC = () => {
  const { user } = useAuthStore();
  
  // Get user role (backend sends camelCase: technicalDirector)
  const userRole = (user as any)?.role || '';
  const userRoleLower = userRole.toLowerCase();
  
  console.log('User role from backend:', userRole, 'Lowercase:', userRoleLower);
  // Check if user is Project Manager
  if (userRoleLower === 'project manager' || userRoleLower === 'project_manager' || userRoleLower === 'projectmanager') {
    return <ProjectManagerHub />;
  }
  
  if (userRoleLower === 'estimation') {
    return <EstimationHub />;
  }
  
  if (userRole === 'technicalDirector' || userRoleLower === 'technical director' || userRoleLower === 'technical_director' || userRoleLower === 'technicaldirector') {
    return <TechnicalDirectorHub />;
  }
  
  // Default to ProcurementHub for all other roles
  return <ProcurementHub />;
};

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, getCurrentUser } = useAuthStore();
  const [tokenChecked, setTokenChecked] = useState(false);
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    // Check token validity when component mounts
    const checkToken = async () => {
      if (token && !isAuthenticated) {
        try {
          await getCurrentUser();
        } catch (error) {
          // Token is invalid, getCurrentUser will handle cleanup
        }
      }
      setTokenChecked(true);
    };
    
    checkToken();
  }, [token, isAuthenticated, getCurrentUser]);

  // Show loading only during initial token check
  if (!tokenChecked && token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ModernLoadingSpinners variant="pulse-wave" size="lg" />
      </div>
    );
  }

  // After token check, redirect if not authenticated
  if (!isAuthenticated && !token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirects if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, getRoleDashboard } = useAuthStore();
  const token = localStorage.getItem('access_token');

  // Redirect to dashboard if authenticated
  if (isAuthenticated && token) {
    const dashboardPath = getRoleDashboard();
    return <Navigate to={dashboardPath} replace />;
  }

  return <>{children}</>
};

function App() {
  const { getCurrentUser, isAuthenticated, logout } = useAuthStore();
  const [isEnvironmentValid, setIsEnvironmentValid] = useState<boolean | null>(null);

  useEffect(() => {
    // Setup cache validation for role mismatches
    setupCacheValidator();
    
    // Validate environment configuration on app startup
    const validateEnvironment = async () => {
      try {
        const { success } = await validateSupabaseConnection();
        setIsEnvironmentValid(success);
       
        if (success) {
          // Check for existing session on app load
          const token = localStorage.getItem('access_token');
          if (token && !isAuthenticated) {
            try {
              await getCurrentUser();
            } catch (error) {
              // Token is invalid/expired, ensure clean logout
              console.log('Token validation failed, cleaning up...');
              logout();
            }
          }
        }
      } catch (error) {
        console.error('Environment validation failed:', error);
        setIsEnvironmentValid(false);
      }
    };

    validateEnvironment();
  }, [getCurrentUser, isAuthenticated, logout]);

  // Show loading while validating environment
  if (isEnvironmentValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ModernLoadingSpinners variant="pulse-wave" size="lg" />
          <p className="mt-4 text-gray-600">Validating environment configuration...</p>
        </div>
      </div>
    );
  }

  // Show error if environment is invalid
  if (isEnvironmentValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Configuration Error</h1>
          <p className="text-gray-600 mb-6">
            The application cannot start due to missing or invalid environment configuration.
          </p>
          <div className="text-left bg-gray-100 p-4 rounded text-sm">
            <p className="font-semibold mb-2">To fix this issue:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Create a <code className="bg-gray-200 px-1 rounded">.env</code> file in the frontend directory</li>
              <li>Add your Supabase credentials (see <code className="bg-gray-200 px-1 rounded">env.example</code>)</li>
              <li>Restart the development server</li>
            </ol>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[#243d8a] text-white rounded hover:bg-[#243d8a]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Toaster position="top-right" richColors />
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        
        {/* Direct demo page - no auth required */}

        {/* Root redirect to login or dashboard */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoleBasedRedirect />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes with Role Prefix */}
        <Route
          path="/:role"
          element={
            <ProtectedRoute>
              <RoleRouteWrapper />
            </ProtectedRoute>
          }
        >
          <Route element={<DashboardLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            
            {/* Main Routes - Use role-based dashboard for main dashboard, role-specific hub for procurement section */}
            <Route path="dashboard" element={<RoleDashboard />} />
            <Route path="procurement" element={
              <RoleSpecificProcurementHub />
            } />
            <Route path="procurement/deliveries" element={<DeliveriesPage />} />
            <Route path="procurement/deliveries/edit/:id" element={<DeliveriesPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectsPage />} />
            <Route path="projects/:id/edit" element={<ProjectsPage />} />
            <Route path="process-flow" element={<ProcessFlowPage />} />
            <Route path="workflow-status" element={<WorkflowStatusPage />} />
            <Route path="workflows/material-dispatch-production" element={<MaterialDispatchProductionPage />} />
            <Route path="workflows/material-dispatch-site" element={<MaterialDispatchSitePage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Catch all route - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App;