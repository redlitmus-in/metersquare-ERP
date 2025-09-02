import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon,
  HomeIcon, 
  CheckCircleIcon,
  UsersIcon,
  ChartBarIcon,
  ArrowPathIcon,
  UserIcon,
  ShoppingCartIcon,
  Cog6ToothIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentCheckIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';
import { 
  HomeIcon as HomeSolid,
  ShoppingCartIcon as ShoppingSolid,
  UsersIcon as UsersSolid,
  ChartBarIcon as ChartSolid
} from '@heroicons/react/24/solid';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { getRoleDisplayName, getRoleThemeColor } from '@/utils/roleRouting';
import { clsx } from 'clsx';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  iconSolid: React.ComponentType<any>;
  color?: string;
  children?: NavigationItem[];
}

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const ModernSidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const { user, getRoleDashboard } = useAuthStore();
  const roleName = getRoleDisplayName(user?.role_id || '');
  const roleColor = getRoleThemeColor(user?.role_id || '');
  const dashboardPath = getRoleDashboard();
  const [expandedSections, setExpandedSections] = useState<string[]>(['procurement']);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  // Listen for storage changes to sync collapsed state across components
  React.useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setIsCollapsed(saved === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sidebarToggle', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sidebarToggle', handleStorageChange);
    };
  }, []);

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionName) 
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    );
  };

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
    // Dispatch event for same-tab updates
    window.dispatchEvent(new Event('sidebarToggle'));
  };

  // Enhanced navigation with sections and colors
  const getNavigationItems = (): NavigationItem[] => {
    const baseItems: NavigationItem[] = [
      { 
        name: `Dashboard`, 
        href: dashboardPath, 
        icon: HomeIcon, 
        iconSolid: HomeSolid,
        color: 'text-[#243d8a]'
      },
      { 
        name: 'Procurement', 
        href: '/procurement', 
        icon: ShoppingCartIcon, 
        iconSolid: ShoppingSolid,
        color: 'text-red-600',
        children: [
          { name: 'Purchase Requests', href: '/procurement/requests', icon: DocumentTextIcon, iconSolid: DocumentTextIcon },
          { name: 'Vendor Quotations', href: '/procurement/quotations', icon: BuildingOfficeIcon, iconSolid: BuildingOfficeIcon },
          { name: 'Approvals', href: '/procurement/approvals', icon: ClipboardDocumentCheckIcon, iconSolid: ClipboardDocumentCheckIcon },
          { name: 'Deliveries', href: '/procurement/deliveries', icon: TruckIcon, iconSolid: TruckIcon }
        ]
      },
      { 
        name: 'Pending Actions', 
        href: '/tasks', 
        icon: CheckCircleIcon, 
        iconSolid: CheckCircleIcon,
        color: 'text-green-600'
      },
      { 
        name: 'Workflow Status', 
        href: '/workflow-status', 
        icon: ArrowPathIcon, 
        iconSolid: ArrowPathIcon,
        color: 'text-purple-600'
      },
    ];

    const managerItems: NavigationItem[] = [
      { 
        name: 'Team', 
        href: '/users', 
        icon: UsersIcon, 
        iconSolid: UsersSolid,
        color: 'text-cyan-600'
      },
    ];

    const executiveItems: NavigationItem[] = [
      { 
        name: 'Analytics', 
        href: '/analytics', 
        icon: ChartBarIcon, 
        iconSolid: ChartSolid,
        color: 'text-orange-600'
      },
    ];

    // Profile items removed - accessible via header dropdown

    let navigation = [...baseItems];

    if (user?.role_id === UserRole.TECHNICAL_DIRECTOR) {
      navigation.splice(-1, 0, ...managerItems, ...executiveItems);
    } else if (user?.role_id === UserRole.PROJECT_MANAGER) {
      navigation.splice(-1, 0, ...managerItems);
    }

    // Profile removed from sidebar - use header dropdown instead
    return navigation;
  };

  const navigation = getNavigationItems();

  const isPathActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 shadow-xl">
      {/* Logo Section with Toggle Button */}
      <div className={clsx(
        "border-b border-gray-100 transition-all duration-300",
        isCollapsed ? "px-2 py-3" : "px-4 py-4"
      )}>
        <div className="flex items-center justify-between">
          {/* MeterSquare Logo */}
          <div className={clsx(
            "relative transition-all duration-300",
            isCollapsed ? "hidden" : "block"
          )}>
            <img 
              src="/logo.png" 
              alt="MeterSquare" 
              className="h-10 w-auto"
              onError={(e) => {
                // Fallback if logo doesn't load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-lg shadow-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
          </div>
          {/* Collapsed Logo */}
          <div className={clsx(
            "transition-all duration-300",
            isCollapsed ? "block mx-auto" : "hidden"
          )}>
            <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-700 rounded-lg shadow-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
          </div>
          
          {/* Toggle Button */}
          <button
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
        {/* Decorative element */}
        <div className={clsx(
          "mt-3 h-0.5 bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-300",
          isCollapsed ? "hidden" : "block"
        )}></div>
      </div>

      {/* Navigation */}
      <div className={clsx(
        "flex-1 flex flex-col overflow-y-auto transition-all duration-300",
        isCollapsed ? "py-2 px-1" : "py-3 px-2"
      )}>
        <nav className="flex-1 space-y-1">
          {navigation.map((item, index) => {
            const isActive = isPathActive(item.href);
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedSections.includes(item.name.toLowerCase());
            const IconComponent = isActive ? item.iconSolid : item.icon;

            return (
              <div key={item.name}>
                {/* Main Navigation Item */}
                <div className="relative">
                  {hasChildren ? (
                    <div className="flex items-center">
                      <Link
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        title={isCollapsed ? item.name : ''}
                        className={clsx(
                          'flex-1 group flex items-center transition-all duration-200 text-xs font-medium rounded-lg',
                          isCollapsed ? 'px-2 py-2 justify-center' : 'px-2.5 py-2',
                          isActive 
                            ? item.name === 'Procurement' 
                              ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-900 shadow-md border border-red-200'
                              : 'bg-gradient-to-r from-[#243d8a]/5 to-[#243d8a]/10 text-[#243d8a] shadow-md border border-[#243d8a]/20'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        <div className="flex items-center">
                          <div className={clsx(
                            'rounded-md transition-colors duration-200',
                            isCollapsed ? 'p-1.5' : 'p-1.5 mr-2',
                            isActive 
                              ? item.name === 'Procurement'
                                ? 'bg-red-500 shadow-lg' 
                                : 'bg-[#243d8a] shadow-lg'
                              : 'bg-gray-100 group-hover:bg-gray-200'
                          )}>
                            <IconComponent className={clsx(
                              'w-4 h-4 transition-colors duration-200',
                              isActive ? 'text-white' : item.color || 'text-gray-500'
                            )} />
                          </div>
                          {!isCollapsed && <span className="font-semibold">{item.name}</span>}
                        </div>
                      </Link>
                      {!isCollapsed && (
                        <button
                          onClick={() => toggleSection(item.name.toLowerCase())}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title={`Toggle ${item.name} section`}
                          aria-label={`Toggle ${item.name} section`}
                        >
                          <ChevronRightIcon 
                            className={clsx(
                              'w-4 h-4 transition-transform duration-200',
                              isExpanded ? 'transform rotate-90' : '',
                              isActive ? 'text-gray-700' : 'text-gray-400'
                            )} 
                          />
                        </button>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      title={isCollapsed ? item.name : ''}
                      className={clsx(
                        'group flex items-center transition-all duration-200 text-xs font-medium rounded-lg relative overflow-hidden',
                        isCollapsed ? 'px-2 py-2 justify-center' : 'px-2.5 py-2',
                        isActive 
                          ? item.name === 'Procurement' 
                            ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-900 shadow-md border border-red-200'
                            : 'bg-gradient-to-r from-[#243d8a]/5 to-[#243d8a]/10 text-[#243d8a] shadow-md border border-[#243d8a]/20'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <div className={clsx(
                          "absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 rounded-r-full",
                          item.name === 'Procurement' ? 'bg-red-500' : 'bg-[#243d8a]'
                        )}></div>
                      )}
                      
                      <div className={clsx(
                        'rounded-md transition-colors duration-200',
                        isCollapsed ? 'p-1.5' : 'p-1.5 mr-2',
                        isActive 
                          ? item.name === 'Procurement'
                            ? 'bg-red-500 shadow-lg' 
                            : 'bg-[#243d8a] shadow-lg'
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      )}>
                        <IconComponent className={clsx(
                          'w-4 h-4 transition-colors duration-200',
                          isActive ? 'text-white' : item.color || 'text-gray-500'
                        )} />
                      </div>
                      {!isCollapsed && <span className="font-semibold">{item.name}</span>}
                      
                      {/* Hover glow effect */}
                      <div className={clsx(
                        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl",
                        item.name === 'Procurement' 
                          ? 'bg-gradient-to-r from-red-500/5 to-red-500/10' 
                          : 'bg-gradient-to-r from-[#243d8a]/5 to-[#243d8a]/10'
                      )}></div>
                    </Link>
                  )}
                </div>

                {/* Submenu - Hide when collapsed */}
                <AnimatePresence>
                  {hasChildren && isExpanded && !isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-4 mt-1 space-y-0.5 border-l-2 border-red-100 pl-4"
                    >
                      {item.children?.map((child) => {
                        const isChildActive = isPathActive(child.href);
                        const ChildIcon = isChildActive ? child.iconSolid : child.icon;
                        
                        return (
                          <Link
                            key={child.name}
                            to={child.href}
                            onClick={() => setSidebarOpen(false)}
                            className={clsx(
                              'group flex items-center px-3 py-2.5 text-xs font-medium rounded-lg transition-all duration-200',
                              isChildActive
                                ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border border-red-200 shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                            )}
                          >
                            <ChildIcon className={clsx(
                              'w-4 h-4 mr-2.5 transition-colors duration-200',
                              isChildActive ? 'text-red-600' : 'text-gray-400 group-hover:text-gray-600'
                            )} />
                            <span>{child.name}</span>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* User Info Section */}
        {user && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="bg-gradient-to-r from-gray-50 to-[#243d8a]/5 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#243d8a] to-[#243d8a] flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-xs">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {user.full_name}
                  </p>
                  <p className="text-[10px] text-gray-600 truncate">
                    {roleName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Version Info */}
        <div className="mt-4 px-4 text-center">
          <p className="text-xs text-gray-400">Version 1.0.0</p>
          <div className="mt-2 w-full h-0.5 bg-gradient-to-r from-transparent via-[#243d8a]/30 to-transparent"></div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 md:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-600/75 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex z-50">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full shadow-2xl">
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
                      className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white bg-white/10 backdrop-blur-sm"
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
      <div className={clsx(
        "hidden md:flex md:flex-col md:fixed md:inset-y-0 z-40 transition-all duration-300",
        isCollapsed ? "md:w-16" : "md:w-56"
      )}>
        <div className="flex-1 flex flex-col min-h-0">
          <SidebarContent />
        </div>
      </div>
    </>
  );
};

export default ModernSidebar;
