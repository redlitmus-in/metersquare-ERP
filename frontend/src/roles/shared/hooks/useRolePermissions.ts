/**
 * Custom hook for role-based permissions
 * Provides easy access to user permissions throughout the application
 */

import { useAuthStore } from '@/store/authStore';
import { getRolePermissions, hasPermission } from '@/roles';

export const useRolePermissions = () => {
  const { user } = useAuthStore();
  const userRole = (user as any)?.role || '';
  
  const permissions = getRolePermissions(userRole);
  
  /**
   * Check if user has a specific permission
   */
  const can = (category: string, action: string): boolean => {
    return hasPermission(userRole, category, action);
  };
  
  /**
   * Check if user can create purchase requests
   * Only Site/MEP Supervisors can create based on workflow
   */
  const canCreatePurchaseRequest = (): boolean => {
    const normalizedRole = userRole.toLowerCase().replace(/\s+/g, '_');
    return ['site_supervisor', 'mep_supervisor', 'admin'].includes(normalizedRole);
  };
  
  /**
   * Check if user can process purchase requests
   * Procurement role processes requests
   */
  const canProcessPurchaseRequest = (): boolean => {
    const normalizedRole = userRole.toLowerCase().replace(/\s+/g, '_');
    return ['procurement', 'procurement_manager', 'admin'].includes(normalizedRole);
  };
  
  /**
   * Check if user can approve purchase requests
   * PM, Estimation, TD have approval authority
   */
  const canApprovePurchaseRequest = (): boolean => {
    return permissions.purchaseRequests.approve;
  };
  
  return {
    permissions,
    can,
    canCreatePurchaseRequest,
    canProcessPurchaseRequest,
    canApprovePurchaseRequest,
    userRole
  };
};