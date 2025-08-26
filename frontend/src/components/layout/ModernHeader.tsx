import React, { Fragment, useState } from 'react';
import { Menu, Transition, Popover } from '@headlessui/react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  HomeIcon,
  ShoppingCartIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import NotificationSystem from '@/components/NotificationSystem';
import { clsx } from 'clsx';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

const ModernHeader: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
  };

  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return 'Dashboard';
      case '/procurement':
        return 'Procurement Hub';
      case '/tasks':
        return 'Pending Actions';
      case '/process-flow':
        return 'Process Flow';
      case '/users':
        return 'Team Management';
      case '/analytics':
        return 'Analytics & Reports';
      case '/profile':
        return 'Profile Settings';
      default:
        if (path.startsWith('/procurement')) {
          return 'Procurement';
        }
        return 'MeterSquare ERP';
    }
  };

  const getBreadcrumb = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    
    return segments.map((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const name = segment.charAt(0).toUpperCase() + segment.slice(1);
      return { name, href, current: index === segments.length - 1 };
    });
  };

  const quickActions = [
    { name: 'New Purchase Request', href: '/procurement', icon: ShoppingCartIcon, color: 'text-red-600' },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, color: 'text-green-600' },
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, color: 'text-purple-600' },
  ];

  return (
    <div className="sticky top-0 z-30 flex-shrink-0">
      {/* Main Header */}
      <div className="flex h-16 bg-white shadow-lg border-b border-gray-200">
        {/* Mobile menu button */}
        <button
          type="button"
          className="px-4 border-r border-gray-200 text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500 md:hidden transition-colors duration-200"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>

        <div className="flex-1 px-4 flex items-center justify-between">
          {/* Left side - Logo and Page Title */}
          <div className="flex items-center space-x-4">
            {/* Logo for mobile */}
            <div className="md:hidden flex items-center space-x-2">
              <img 
                src="/logo.png" 
                alt="MeterSquare" 
                className="h-6 w-auto"
                onError={(e) => {
                  // Fallback if logo doesn't load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden w-7 h-7 bg-[#243d8a] rounded-lg shadow-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="text-lg font-bold text-gray-900">MeterSquare</span>
            </div>

            {/* Page Title and Breadcrumb */}
            <div className="hidden md:block">
              <div className="flex items-center space-x-2">
                <h1 className={clsx(
                  "text-2xl font-bold",
                  location.pathname.startsWith('/procurement') 
                    ? 'text-red-700' 
                    : 'text-[#243d8a]/90'
                )}>
                  {getPageTitle()}
                </h1>
                {getBreadcrumb().length > 1 && (
                  <nav className="flex" aria-label="Breadcrumb">
                    <ol className="flex items-center space-x-2">
                      {getBreadcrumb().map((item, index) => (
                        <li key={item.name}>
                          <div className="flex items-center">
                            {index > 0 && (
                              <ChevronDownIcon 
                                className="flex-shrink-0 h-4 w-4 text-gray-400 transform rotate-[-90deg]" 
                                aria-hidden="true" 
                              />
                            )}
                            <Link
                              to={item.href}
                              className={clsx(
                                index === 0 ? '' : 'ml-2',
                                item.current 
                                  ? 'text-red-600 font-semibold' 
                                  : 'text-gray-500 hover:text-gray-700',
                                'text-sm transition-colors duration-200'
                              )}
                              aria-current={item.current ? 'page' : undefined}
                            >
                              {item.name}
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </nav>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Welcome back, {user?.full_name}
              </p>
            </div>
          </div>

          {/* Center - Search Bar */}
          <div className="hidden lg:block flex-1 max-w-md mx-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search projects, tasks, vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 text-sm"
              />
              {searchQuery && (
                <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-2">
                    <p className="text-xs text-gray-500 px-2 py-1">No results found</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-3">
            {/* Quick Actions Dropdown */}
            <Popover className="relative hidden lg:block">
              <Popover.Button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-[#243d8a] rounded-full"></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </Popover.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1"
              >
                <Popover.Panel className="absolute right-0 z-50 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {quickActions.map((action) => (
                        <Link
                          key={action.name}
                          to={action.href}
                          className="p-3 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all duration-200 group"
                        >
                          <action.icon className={`w-5 h-5 ${action.color} group-hover:text-red-600 mb-2`} />
                          <p className="text-xs font-medium text-gray-900 group-hover:text-red-900">
                            {action.name}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </Popover.Panel>
              </Transition>
            </Popover>

            {/* Notifications */}
            <NotificationSystem />

            {/* Profile dropdown */}
            <Menu as="div" className="relative">
              <div>
                <Menu.Button className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 hover:ring-2 hover:ring-red-200 transition-all duration-200">
                  <span className="sr-only">Open user menu</span>
                  {user?.avatar_url ? (
                    <img
                      className="h-9 w-9 rounded-full border-2 border-red-200"
                      src={user.avatar_url}
                      alt={user.full_name}
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#243d8a] via-red-500 to-purple-600 flex items-center justify-center shadow-lg border-2 border-white">
                      <span className="text-sm font-bold text-white">
                        {user?.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <ChevronDownIcon className="ml-2 h-4 w-4 text-gray-400" />
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="origin-top-right absolute right-0 mt-2 w-64 rounded-xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200 overflow-hidden">
                  {/* User Info Header */}
                  <div className="px-4 py-4 bg-gradient-to-r from-[#243d8a]/5 via-red-50 to-purple-50 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#243d8a] via-red-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <span className="text-lg font-bold text-white">
                          {user?.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {user?.full_name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {user?.role_id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </p>
                        <p className="text-xs text-gray-500">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/profile"
                          className={clsx(
                            active ? 'bg-red-50 text-red-900' : 'text-gray-700',
                            'flex items-center px-4 py-3 text-sm transition-colors duration-200'
                          )}
                        >
                          <UserCircleIcon className={clsx(
                            active ? 'text-red-600' : 'text-gray-400',
                            'mr-3 h-5 w-5'
                          )} />
                          View Profile
                        </Link>
                      )}
                    </Menu.Item>

                    <Menu.Item>
                      {({ active }) => (
                        <button
                          className={clsx(
                            active ? 'bg-gray-50 text-gray-900' : 'text-gray-700',
                            'flex items-center w-full px-4 py-3 text-sm transition-colors duration-200'
                          )}
                        >
                          <Cog6ToothIcon className={clsx(
                            active ? 'text-gray-600' : 'text-gray-400',
                            'mr-3 h-5 w-5'
                          )} />
                          Account Settings
                        </button>
                      )}
                    </Menu.Item>

                    <hr className="my-2 border-gray-200" />

                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={clsx(
                            active ? 'bg-red-50 text-red-900' : 'text-gray-700',
                            'flex items-center w-full px-4 py-3 text-sm transition-colors duration-200'
                          )}
                        >
                          <ArrowRightOnRectangleIcon className={clsx(
                            active ? 'text-red-600' : 'text-gray-400',
                            'mr-3 h-5 w-5'
                          )} />
                          Sign Out
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className={clsx(
        "h-1",
        location.pathname.startsWith('/procurement') 
          ? 'bg-red-500' 
          : 'bg-[#243d8a]'
      )}></div>
    </div>
  );
};

export default ModernHeader;