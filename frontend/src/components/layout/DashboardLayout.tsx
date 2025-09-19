import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ModernSidebar from './ModernSidebar';
import NotificationSystem from '@/components/NotificationSystem';
import { useAuthStore } from '@/store/authStore';
import { getRoleDisplayName } from '@/utils/roleRouting';
import { MobileMenuButton } from './MobileMenuButton';
import { Clock } from 'lucide-react';

const DashboardLayout: React.FC = React.memo(() => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const [currentTime, setCurrentTime] = useState(new Date());
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

  // Update current time every second - optimized with RAF
  useEffect(() => {
    let animationFrameId: number;
    let lastUpdate = Date.now();

    const updateTime = () => {
      const now = Date.now();
      // Only update every second to reduce re-renders
      if (now - lastUpdate >= 1000) {
        setCurrentTime(new Date());
        lastUpdate = now;
      }
      animationFrameId = requestAnimationFrame(updateTime);
    };

    animationFrameId = requestAnimationFrame(updateTime);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Mobile Menu Button */}
      <MobileMenuButton onClick={() => setSidebarOpen(true)} />
      
      {/* Sidebar - Responsive */}
      <ModernSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main content */}
      <div className={`flex-1 overflow-hidden flex flex-col transition-[padding-left] duration-200 ease-in-out ${
        sidebarCollapsed ? 'md:pl-16' : 'md:pl-56'
      }`}>
        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto overflow-x-hidden focus:outline-none bg-gradient-to-br from-gray-50/50 to-white">
          <div className="min-h-full w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Notifications - Positioned below time display */}
      <div className="fixed top-16 right-4 z-[100]">
        <NotificationSystem />
      </div>

      {/* Date and Time Display - Top Right Corner */}
      <div className="fixed top-4 right-4 z-30 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-md">
        <div className="flex items-center gap-2.5 text-sm">
          <Clock className="w-4 h-4 text-gray-500" />
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-gray-800">
              {currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600 font-medium">
              {currentTime.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

DashboardLayout.displayName = 'DashboardLayout';

export default DashboardLayout;