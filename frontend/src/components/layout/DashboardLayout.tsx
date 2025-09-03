import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ModernSidebar from './ModernSidebar';
import NotificationSystem from '@/components/NotificationSystem';
import { useAuthStore } from '@/store/authStore';
import { getRoleDisplayName } from '@/utils/roleRouting';

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const { user } = useAuthStore();
  const location = useLocation();

  // Update browser title with user role
  useEffect(() => {
    const getPageName = () => {
      const path = location.pathname;
      switch (path) {
        case '/dashboard': return 'Dashboard';
        case '/procurement': return 'Procurement';
        case '/tasks': return 'Tasks';
        case '/process-flow': return 'Process Flow';
        case '/analytics': return 'Analytics';
        case '/profile': return 'Profile';
        default:
          if (path.startsWith('/procurement')) return 'Procurement';
          return 'MeterSquare ERP';
      }
    };

    const roleName = user?.role_id ? getRoleDisplayName(String(user.role_id)) : 'User';
    const pageName = getPageName();
    document.title = `[${roleName}] ${pageName} - MeterSquare ERP`;
  }, [user, location]);

  // Listen for storage changes to sync sidebar state
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarCollapsed(saved === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom event for same-tab updates
    window.addEventListener('sidebarToggle', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sidebarToggle', handleStorageChange);
    };
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Sidebar */}
      <ModernSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main content */}
      <div className={`flex-1 overflow-hidden flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'md:pl-16' : 'md:pl-56'
      }`}>
        {/* Page content - no header */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gradient-to-br from-gray-50/50 to-white">
          <div className="min-h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Notifications - Always visible in top-right */}
      <div className="fixed top-4 right-4 z-50">
        <NotificationSystem />
      </div>
    </div>
  );
};

export default DashboardLayout;