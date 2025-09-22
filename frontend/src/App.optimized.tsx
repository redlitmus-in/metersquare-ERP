import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { validateSupabaseConnection } from '@/utils/environment';
import { setupCacheValidator } from '@/utils/clearCache';
import { queryClient } from '@/lib/queryClient';
import { setupRealtimeSubscriptions } from '@/lib/realtimeSubscriptions';
import { initPerformanceMonitoring } from '@/utils/performance';

// Critical components loaded immediately (required for initial render)
import { LoginPage } from '@/pages/auth/LoginPage';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import RoleBasedRedirect from '@/components/routing/RoleBasedRedirect';

// Optimized lazy loading with preload capabilities
const lazyWithPreload = (importFn: () => Promise<any>) => {
  const Component = lazy(importFn);
  (Component as any).preload = importFn;
  return Component;
};

// Common pages - lazy loaded
const TasksPage = lazyWithPreload(() => import('@/pages/common/TasksPage'));
const ProjectsPage = lazyWithPreload(() => import('@/pages/common/ProjectsPage'));
const ProcessFlowPage = lazyWithPreload(() => import('@/pages/common/ProcessFlowPage'));
const ProfilePage = lazyWithPreload(() => import('@/pages/common/ProfilePage'));
const AnalyticsPage = lazyWithPreload(() => import('@/pages/common/AnalyticsPage'));
const WorkflowStatusPage = lazyWithPreload(() => import('@/pages/common/WorkflowStatusPage'));
const CreativeErrorPage = lazyWithPreload(() => import('@/components/ui/CreativeErrorPage'));

// Role-specific hubs - lazy loaded
const ProcurementHub = lazyWithPreload(() => import('@/roles/procurement/pages/ProcurementHub'));
const DeliveriesPage = lazyWithPreload(() => import('@/roles/procurement/pages/DeliveriesPage'));
const ProjectManagerHub = lazyWithPreload(() => import('@/roles/project-manager/pages/ProjectManagerHub'));
const PurchaseApprovalsPage = lazyWithPreload(() => import('@/roles/project-manager/pages/PurchaseApprovalsPage'));
const EstimationHub = lazyWithPreload(() => import('@/roles/estimation/pages/EstimationHub'));
const TechnicalDirectorHub = lazyWithPreload(() => import('@/roles/technical-director/pages/TechnicalDirectorHub'));
const SiteSupervisorHub = lazyWithPreload(() => import('@/roles/site-supervisor/pages/SiteSupervisorHub'));
const AccountsHub = lazyWithPreload(() => import('@/roles/accounts/pages/AccountsHub'));

// Workflow pages - lazy loaded
const MaterialDispatchProductionPage = lazyWithPreload(() => import('@/pages/workflows/MaterialDispatchProductionPage'));
const MaterialDispatchSitePage = lazyWithPreload(() => import('@/pages/workflows/MaterialDispatchSitePage'));

// Other components
const RoleRouteWrapper = lazyWithPreload(() => import('@/components/routing/RoleRouteWrapper'));
const RoleDashboard = lazyWithPreload(() => import('@/components/routing/RoleDashboard'));

// Optimized page loader with skeleton
import PageLoader from '@/components/ui/PageLoader';

// Enhanced loading fallback with timeout detection
const LoadingFallback: React.FC = () => {
  const [isSlowLoad, setIsSlowLoad] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSlowLoad(true);
    }, 3000); // Show slow load message after 3 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <ModernLoadingSpinners type="spinner" size="large" />
        <p className="mt-4 text-gray-600">Loading...</p>
        {isSlowLoad && (
          <p className="mt-2 text-sm text-gray-500">
            This is taking longer than usual. Please check your connection.
          </p>
        )}
      </div>
    </div>
  );
};

// Role-specific Procurement Hub Component
const RoleSpecificProcurementHub: React.FC = () => {
  const { user } = useAuthStore();
  const userRole = user?.role?.toLowerCase();

  if (userRole === 'procurement') {
    return <ProcurementHub />;
  }

  return <Navigate to="/dashboard" replace />;
};

function App() {
  const { isAuthenticated, user, initialize } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean | null>(null);

  useEffect(() => {
    // Initialize performance monitoring in production
    if (process.env.NODE_ENV === 'production') {
      initPerformanceMonitoring();
    }

    // Validate connections and initialize auth
    const initApp = async () => {
      try {
        // Check Supabase connection
        const connected = await validateSupabaseConnection();
        setIsSupabaseConnected(connected);

        // Setup cache validator
        setupCacheValidator();

        // Initialize auth
        await initialize();

        // Setup realtime subscriptions if authenticated
        if (connected) {
          setupRealtimeSubscriptions();
        }
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();

    // Preload critical routes based on user role
    const preloadCriticalRoutes = () => {
      const role = user?.role?.toLowerCase();

      // Preload role-specific hub
      switch (role) {
        case 'procurement':
          (ProcurementHub as any).preload?.();
          break;
        case 'project_manager':
          (ProjectManagerHub as any).preload?.();
          break;
        case 'estimation':
          (EstimationHub as any).preload?.();
          break;
        case 'technical_director':
          (TechnicalDirectorHub as any).preload?.();
          break;
        case 'site_supervisor':
          (SiteSupervisorHub as any).preload?.();
          break;
        case 'accounts':
          (AccountsHub as any).preload?.();
          break;
      }
    };

    if (user) {
      // Preload after a short delay to prioritize initial render
      setTimeout(preloadCriticalRoutes, 1000);
    }
  }, [initialize, user]);

  // Preload analytics when hovering over analytics link
  useEffect(() => {
    const handleAnalyticsHover = () => {
      (AnalyticsPage as any).preload?.();
    };

    // Add event listeners to navigation links
    const analyticsLinks = document.querySelectorAll('a[href*="/analytics"]');
    analyticsLinks.forEach(link => {
      link.addEventListener('mouseenter', handleAnalyticsHover);
    });

    return () => {
      analyticsLinks.forEach(link => {
        link.removeEventListener('mouseenter', handleAnalyticsHover);
      });
    };
  }, []);

  if (isLoading) {
    return <LoadingFallback />;
  }

  // Show connection error if Supabase is not connected
  if (isSupabaseConnected === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">Connection Error</h2>
          <p className="text-gray-600 text-center mb-4">
            Unable to connect to the database. Please check your internet connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />

          {/* Protected routes with lazy loading */}
          <Route path="/" element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" />}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<RoleBasedRedirect />} />

            {/* Common pages */}
            <Route path="profile" element={<ProfilePage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="process-flow" element={<ProcessFlowPage />} />
            <Route path="workflow-status" element={<WorkflowStatusPage />} />

            {/* Role-specific dashboards */}
            <Route path="procurement" element={<RoleRouteWrapper requiredRoles={['procurement', 'technical_director']} />}>
              <Route index element={<RoleDashboard />} />
              <Route path="hub" element={<RoleSpecificProcurementHub />} />
              <Route path="deliveries" element={<DeliveriesPage />} />
            </Route>

            <Route path="project-manager" element={<RoleRouteWrapper requiredRoles={['project_manager']} />}>
              <Route index element={<RoleDashboard />} />
              <Route path="hub" element={<ProjectManagerHub />} />
              <Route path="approvals" element={<PurchaseApprovalsPage />} />
            </Route>

            <Route path="estimation" element={<RoleRouteWrapper requiredRoles={['estimation']} />}>
              <Route index element={<RoleDashboard />} />
              <Route path="hub" element={<EstimationHub />} />
            </Route>

            <Route path="technical-director" element={<RoleRouteWrapper requiredRoles={['technical_director']} />}>
              <Route index element={<RoleDashboard />} />
              <Route path="hub" element={<TechnicalDirectorHub />} />
            </Route>

            <Route path="site-supervisor" element={<RoleRouteWrapper requiredRoles={['site_supervisor', 'mep_supervisor']} />}>
              <Route index element={<RoleDashboard />} />
              <Route path="hub" element={<SiteSupervisorHub />} />
            </Route>

            <Route path="accounts" element={<RoleRouteWrapper requiredRoles={['accounts']} />}>
              <Route index element={<RoleDashboard />} />
              <Route path="hub" element={<AccountsHub />} />
            </Route>

            {/* Workflow pages */}
            <Route path="workflows">
              <Route path="material-dispatch-production" element={<MaterialDispatchProductionPage />} />
              <Route path="material-dispatch-site" element={<MaterialDispatchSitePage />} />
            </Route>

            {/* Error page */}
            <Route path="*" element={<CreativeErrorPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Suspense>

      {/* Global toaster */}
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#333',
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;