import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { validateSupabaseConnection } from '@/utils/environment';

// Pages
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ProjectsPage from '@/pages/ProjectsPage';
import TasksPage from '@/pages/TasksPage';
import ProcessFlowPage from '@/pages/ProcessFlowPage';
import ProfilePage from '@/pages/ProfilePage';
import UsersPage from '@/pages/UsersPage';
import AnalyticsPage from '@/pages/AnalyticsPage';

// Layout
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirects if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { getCurrentUser, isAuthenticated } = useAuthStore();
  const [isEnvironmentValid, setIsEnvironmentValid] = useState<boolean | null>(null);

  useEffect(() => {
    // Validate environment configuration on app startup
    const validateEnvironment = async () => {
      try {
        const { success } = await validateSupabaseConnection();
        setIsEnvironmentValid(success);
        
        if (success) {
          // Check for existing session on app load
          const token = localStorage.getItem('access_token');
          if (token && !isAuthenticated) {
            getCurrentUser();
          }
        }
      } catch (error) {
        console.error('Environment validation failed:', error);
        setIsEnvironmentValid(false);
      }
    };

    validateEnvironment();
  }, [getCurrentUser, isAuthenticated]);

  // Show loading while validating environment
  if (isEnvironmentValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
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
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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


        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="process-flow" element={<ProcessFlowPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default App;