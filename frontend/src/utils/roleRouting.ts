import { UserRole } from '@/types';

/**
 * Role-based routing configuration
 * Maps user roles to their specific dashboard paths
 */

export const ROLE_DASHBOARD_PATHS: Record<string, string> = {
  [UserRole.TECHNICAL_DIRECTOR]: '/dashboard/technical-director',
  [UserRole.PROJECT_MANAGER]: '/dashboard/project-manager',
  [UserRole.PROCUREMENT]: '/dashboard/procurement',
  [UserRole.SITE_SUPERVISOR]: '/dashboard/site-supervisor',
  [UserRole.MEP_SUPERVISOR]: '/dashboard/mep-supervisor',
  [UserRole.ESTIMATION]: '/dashboard/estimation',
  [UserRole.ACCOUNTS]: '/dashboard/accounts',
  [UserRole.DESIGN]: '/dashboard/design',
};

/**
 * Get dashboard path for a specific role
 * @param role - User role (camelCase format)
 * @returns Dashboard path for the role
 */
export const getRoleDashboardPath = (role: string | UserRole): string => {
  // Convert role to proper format if needed
  const roleKey = role as UserRole;
  
  // Return role-specific dashboard or default dashboard
  return ROLE_DASHBOARD_PATHS[roleKey] || '/dashboard';
};

/**
 * Get role display name
 * @param role - User role (camelCase format)
 * @returns Human-readable role name
 */
export const getRoleDisplayName = (role: string | UserRole): string => {
  const roleNames: Record<string, string> = {
    [UserRole.TECHNICAL_DIRECTOR]: 'Technical Director',
    [UserRole.PROJECT_MANAGER]: 'Project Manager',
    [UserRole.PROCUREMENT]: 'Procurement',
    [UserRole.SITE_SUPERVISOR]: 'Site Supervisor',
    [UserRole.MEP_SUPERVISOR]: 'MEP Supervisor',
    [UserRole.ESTIMATION]: 'Estimation',
    [UserRole.ACCOUNTS]: 'Accounts',
    [UserRole.DESIGN]: 'Design',
  };
  
  return roleNames[role as UserRole] || 'User';
};

/**
 * Get role-specific theme color
 * @param role - User role
 * @returns Tailwind color class for the role
 */
export const getRoleThemeColor = (role: string | UserRole): string => {
  const roleColors: Record<string, string> = {
    [UserRole.TECHNICAL_DIRECTOR]: 'blue',
    [UserRole.PROJECT_MANAGER]: 'green',
    [UserRole.PROCUREMENT]: 'red',
    [UserRole.SITE_SUPERVISOR]: 'orange',
    [UserRole.MEP_SUPERVISOR]: 'cyan',
    [UserRole.ESTIMATION]: 'amber',
    [UserRole.ACCOUNTS]: 'emerald',
    [UserRole.DESIGN]: 'purple',
  };
  
  return roleColors[role as UserRole] || 'gray';
};

/**
 * Check if user has access to a specific route
 * @param userRole - Current user's role
 * @param routePath - Route path to check
 * @returns Boolean indicating access permission
 */
export const hasRouteAccess = (userRole: string | UserRole, routePath: string): boolean => {
  // Technical Director has access to all routes
  if (userRole === UserRole.TECHNICAL_DIRECTOR) {
    return true;
  }
  
  // Check if route matches user's dashboard
  const userDashboard = getRoleDashboardPath(userRole);
  if (routePath.startsWith(userDashboard)) {
    return true;
  }
  
  // Common routes accessible to all roles
  const commonRoutes = ['/profile', '/tasks', '/projects', '/analytics'];
  if (commonRoutes.some(route => routePath.startsWith(route))) {
    return true;
  }
  
  // Role-specific access rules
  const roleAccess: Record<string, string[]> = {
    [UserRole.PROJECT_MANAGER]: ['/procurement', '/workflows'],
    [UserRole.PROCUREMENT]: ['/procurement', '/vendor'],
    [UserRole.SITE_SUPERVISOR]: ['/workflows/material-dispatch-site'],
    [UserRole.MEP_SUPERVISOR]: ['/workflows/material-dispatch-site'],
    [UserRole.ESTIMATION]: ['/procurement/quotations'],
    [UserRole.ACCOUNTS]: ['/procurement/approvals'],
    [UserRole.DESIGN]: ['/projects', '/workflows'],
  };
  
  const allowedRoutes = roleAccess[userRole as UserRole] || [];
  return allowedRoutes.some(route => routePath.startsWith(route));
};