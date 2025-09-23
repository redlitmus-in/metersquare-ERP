import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { validateSupabaseConnection } from '@/utils/environment';
import { setupCacheValidator } from '@/utils/clearCache';
import { queryClient } from '@/lib/queryClient';
import { setupRealtimeSubscriptions } from '@/lib/realtimeSubscriptions';
import { initializeNotificationService } from '@/store/notificationStore';
import '@/utils/testNotifications';

// Critical components loaded immediately
import { LoginPage } from '@/pages/auth/LoginPage';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import RoleBasedRedirect from '@/components/routing/RoleBasedRedirect';

// Lazy load all non-critical pages
const TasksPage = lazy(() => import('@/pages/common/TasksPage'));
const ProjectsPage = lazy(() => import('@/pages/common/ProjectsPage'));
const ProcessFlowPage = lazy(() => import('@/pages/common/ProcessFlowPage'));
const ProfilePage = lazy(() => import('@/pages/common/ProfilePage'));
const AnalyticsPage = lazy(() => import('@/pages/common/AnalyticsPage'));
const WorkflowStatusPage = lazy(() => import('@/pages/common/WorkflowStatusPage'));
const CreativeErrorPage = lazy(() => import('@/components/ui/CreativeErrorPage'));

// Lazy load procurement pages - Direct imports for proper code splitting
const ProcurementHub = lazy(() => import('@/roles/procurement/pages/ProcurementHub'));
const DeliveriesPage = lazy(() => import('@/roles/procurement/pages/DeliveriesPage'));

// Lazy load role hubs - Direct import for better code splitting
const ProjectManagerHub = lazy(() => import('@/roles/project-manager/pages/ProjectManagerHub'));
const PurchaseApprovalsPage = lazy(() => import('@/roles/project-manager/pages/PurchaseApprovalsPage'));
const EstimationHub = lazy(() => import('@/roles/estimation/pages/EstimationHub'));
const TechnicalDirectorHub = lazy(() => import('@/roles/technical-director/pages/TechnicalDirectorHub'));
const SiteSupervisorHub = lazy(() => import('@/roles/site-supervisor/pages/SiteSupervisorHub'));
const MEPSupervisorHub = lazy(() => import('@/roles/mep-supervisor/pages/MEPSupervisorHub'));
const AccountsHub = lazy(() => import('@/roles/accounts/pages/AccountsHub'));

// Lazy load workflow pages
const MaterialDispatchProductionPage = lazy(() => import('@/pages/workflows/MaterialDispatchProductionPage'));
const MaterialDispatchSitePage = lazy(() => import('@/pages/workflows/MaterialDispatchSitePage'));

// Other components
const RoleRouteWrapper = lazy(() => import('@/components/routing/RoleRouteWrapper'));
const RoleDashboard = lazy(() => import('@/components/routing/RoleDashboard'));

// Page loader component
import PageLoader from '@/components/ui/PageLoader';

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
  
  // Check if user is Site Supervisor
  if (userRole === 'siteSupervisor' || userRoleLower === 'site supervisor' || userRoleLower === 'site_supervisor' || userRoleLower === 'sitesupervisor') {
    return <SiteSupervisorHub />;
  }

  // Check if user is MEP Supervisor
  if (userRole === 'mepSupervisor' || userRoleLower === 'mep supervisor' || userRoleLower === 'mep_supervisor' || userRoleLower === 'mepsupervisor') {
    return <MEPSupervisorHub />;
  }

  // Check if user is Accounts
  if (userRoleLower === 'accounts' || userRoleLower === 'account') {
    return <AccountsHub />;
  }
  
  // Default to ProcurementHub for all other roles
  return <ProcurementHub />;
};

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, getCurrentUser, user } = useAuthStore();
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    // Check token validity when component mounts - but don't block rendering
    if (token && !isAuthenticated && !user) {
      // Try to get current user but don't await - it will update state when ready
      getCurrentUser().catch(() => {
        // Token is invalid, getCurrentUser will handle cleanup
      });
    }
  }, [token, isAuthenticated, user, getCurrentUser]);

  // Quick check - if no token, redirect immediately
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If we have a token, show the content (auth check happens in background)
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
  const { getCurrentUser, isAuthenticated, logout, user } = useAuthStore();
  const [isEnvironmentValid, setIsEnvironmentValid] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Setup real-time subscriptions when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const userRole = (user as any)?.role || '';
      const unsubscribe = setupRealtimeSubscriptions(userRole);

      return () => {
        unsubscribe();
      };
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    // Setup cache validation for role mismatches
    setupCacheValidator();

    // Initialize notification service
    initializeNotificationService();

    // Quick initialization - don't block on environment validation
    const initialize = async () => {
      try {
        // Set a SHORT timeout for environment validation to prevent long waits
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ success: true }), 500));
        const validationPromise = validateSupabaseConnection();

        const result = await Promise.race([validationPromise, timeoutPromise]) as { success: boolean };
        const { success } = result;
        setIsEnvironmentValid(success);

        if (success) {
          // Check for existing session on app load - don't wait for it
          const token = localStorage.getItem('access_token');
          if (token && !isAuthenticated) {
            // Fire and forget - don't await
            getCurrentUser().catch(() => {
              console.log('Token validation failed, cleaning up...');
              logout();
            });
          }
        }
      } catch (error) {
        console.error('Environment validation failed:', error);
        setIsEnvironmentValid(true); // Continue anyway
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, []);

  // Only show loading for initial app load, not environment validation
  if (isInitializing) {
    return null; // Let the HTML loader show
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
            type="button"
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
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              marginTop: '80px',
              marginRight: '16px'
            }
          }}
        />
        <Suspense fallback={<PageLoader />}>
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
            <Route path="purchase/:purchaseId" element={<PurchaseApprovalsPage />} />
            <Route path="site-supervisor" element={<SiteSupervisorHub />} />
            <Route path="mep-supervisor" element={<MEPSupervisorHub />} />
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

        {/* Error Routes */}
        <Route 
          path="/404" 
          element={
            <CreativeErrorPage 
              variant="liquid-motion"
              errorCode="404"
              errorTitle="Page Not Found"
              errorMessage="The page you're looking for doesn't exist or has been moved."
            />
          } 
        />
        <Route 
          path="/403" 
          element={
            <CreativeErrorPage 
              variant="liquid-motion"
              errorCode="403"
              errorTitle="Access Denied"
              errorMessage="You don't have permission to access this resource."
            />
          } 
        />
        <Route 
          path="/500" 
          element={
            <CreativeErrorPage 
              variant="liquid-motion"
              errorCode="500"
              errorTitle="Server Error"
              errorMessage="Something went wrong on our end. Please try again later."
              onRefresh={() => window.location.reload()}
            />
          } 
        />
        
        {/* Catch all route - show 404 error page */}
        <Route 
          path="*" 
          element={
            <CreativeErrorPage 
              variant="liquid-motion"
              errorCode="404"
              errorTitle="Page Not Found"
              errorMessage="The page you're looking for doesn't exist or has been moved."
            />
          } 
        />
      </Routes>
        </Suspense>
      </div>
    </QueryClientProvider>
  );
}

export default App;