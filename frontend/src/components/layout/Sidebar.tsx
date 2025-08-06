import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Link, useLocation } from 'react-router-dom';
import { 
  XMarkIcon, 
  HomeIcon, 
  FolderIcon, 
  CheckCircleIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  ArrowPathIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { clsx } from 'clsx';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const { user } = useAuthStore();

  // Navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
      { name: 'My Tasks', href: '/tasks', icon: CheckCircleIcon },
      { name: 'Process Flow', href: '/process-flow', icon: ArrowPathIcon },
      { name: 'Profile', href: '/profile', icon: UserIcon },
    ];

    const managerItems = [
      { name: 'Projects', href: '/projects', icon: FolderIcon },
      { name: 'Users', href: '/users', icon: UsersIcon },
    ];

    const executiveItems = [
      { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
    ];

    let navigation = [...baseItems];

    if (user?.role_id === UserRole.BUSINESS_OWNER) {
      navigation.splice(2, 0, ...managerItems, ...executiveItems);
    } else if (user?.role_id === UserRole.PROJECT_MANAGER) {
      navigation.splice(2, 0, ...managerItems);
    }

    return navigation;
  };

  const navigation = getNavigationItems();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 flex-shrink-0 px-4 bg-primary-800">
        <img
          className="h-8 w-auto"
          src="/logo.svg"
          alt="Corporate Interiors ERP"
        />
        <span className="ml-2 text-white font-semibold text-lg">
          ERP System
        </span>
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  isActive
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-100 hover:bg-primary-600 hover:text-white',
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon
                  className={clsx(
                    isActive ? 'text-white' : 'text-primary-300 group-hover:text-white',
                    'mr-3 flex-shrink-0 h-6 w-6 transition-colors duration-200'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        {user && (
          <div className="flex-shrink-0 px-4 py-4 border-t border-primary-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">
                  {user.full_name}
                </p>
                <p className="text-xs text-primary-300">
                  {user.role_id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 md:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 flex z-40">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full bg-primary-800">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                <SidebarContent />
              </Dialog.Panel>
            </Transition.Child>
            <div className="flex-shrink-0 w-14">{/* Force sidebar to shrink to fit close icon */}</div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-primary-800">
          <SidebarContent />
        </div>
      </div>
    </>
  );
};

export default Sidebar;