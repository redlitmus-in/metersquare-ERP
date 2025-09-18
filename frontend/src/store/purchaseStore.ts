/**
 * Centralized Purchase Store
 * Manages real-time purchase data across all roles with automatic updates
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { apiClient, API_ENDPOINTS } from '@/api/config';
import { toast } from 'sonner';
import { subscribeToRealtime } from '@/lib/realtimeSubscriptions';

interface Purchase {
  purchase_id: number;
  project_id: string;
  requested_by: string;
  site_location: string;
  date: string;
  materials?: any[];
  material_details?: any[];
  material_count?: number;
  total_cost?: number;
  total_quantity?: number;
  priority?: string;
  status?: string;
  latest_status?: {
    sender: string;
    receiver: string;
    status: string;
    timestamp?: string;
  };
  project_manager_status?: string;
  estimation_status?: string;
  technical_director_status?: string;
  accounts_status?: string;
  accounts_acknowledgement?: boolean;
  acknowledgement?: boolean;
  acknowledgement_sent?: boolean;
  project_manager_rejection_reason?: string;
  estimation_rejection_reason?: string;
  technical_director_rejection_reason?: string;
  accounts_rejection_reason?: string;
  payment_details?: any;
}

interface PurchaseStore {
  // Data
  purchases: Purchase[];
  isLoading: boolean;
  error: string | null;
  lastFetchTime: Date | null;
  isPollingEnabled: boolean;
  pollingInterval: number;

  // Actions
  fetchPurchases: (role?: string) => Promise<void>;
  setPurchases: (purchases: Purchase[]) => void;
  updatePurchase: (purchaseId: number, updates: Partial<Purchase>) => void;
  addPurchase: (purchase: Purchase) => void;
  removePurchase: (purchaseId: number) => void;
  setPollingEnabled: (enabled: boolean) => void;
  setPollingInterval: (interval: number) => void;
  clearError: () => void;

  // Subscription management
  subscriptionCleanup: (() => void) | null;
  setupRealtimeSubscription: () => void;
  cleanupRealtimeSubscription: () => void;

  // Role-specific getters
  getPurchasesForRole: (role: string) => Purchase[];
}

// Polling interval (2 seconds for real-time feel)
const DEFAULT_POLLING_INTERVAL = 2000; // Reduced to 2 seconds for even faster updates

// Debounce timer for fetch requests
let fetchDebounceTimer: NodeJS.Timeout | null = null;

// Create store with persistence and subscriptions
const usePurchaseStore = create<PurchaseStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    purchases: [],
    isLoading: false,
    error: null,
    lastFetchTime: null,
    isPollingEnabled: true,
    pollingInterval: DEFAULT_POLLING_INTERVAL,
    subscriptionCleanup: null,

    // Fetch purchases based on role - NO DEBOUNCING for instant updates
    fetchPurchases: async (role?: string) => {
      // REMOVED debouncing - we want instant updates!
      const currentStore = get();

      try {
        // Only show loading on initial fetch, not on refresh
        if (!currentStore.lastFetchTime) {
          set({ isLoading: true, error: null });
        } else {
          set({ error: null });
        }

        let endpoint = '';
        let response: any;

        // Determine endpoint based on role - MATCHING ACTUAL BACKEND ROUTES
        switch (role?.toLowerCase()) {
          case 'procurement':
            endpoint = '/all_procurement';  // Backend: /all_procurement
            break;
          case 'projectmanager':
          case 'project manager':
          case 'project_manager':
            endpoint = '/projectmanger_purchases';  // Backend has typo: projectmanger (missing 'a')
            break;
          case 'estimation':
            endpoint = '/estimation_purchase';  // Backend: /estimation_purchase (correct)
            break;
          case 'technicaldirector':
          case 'technical director':
          case 'technical_director':
            endpoint = '/technical_purchase';  // Backend: /technical_purchase (not /purchases)
            break;
          case 'accounts':
            endpoint = '/account_purchase';  // Backend: /account_purchase (not /accounts/purchases)
            break;
          case 'sitesupervisor':
          case 'site supervisor':
          case 'site_supervisor':
            endpoint = '/all_purchase';  // Changed to use /all_purchase for site supervisor
            break;
          default:
            endpoint = '/all_purchase';  // Backend: /all_purchase
        }

        response = await apiClient.get(endpoint);

        // Extract purchases from response
        let purchaseData: Purchase[] = [];

        if (response.data) {
          // Check for different response formats from different endpoints
          if (response.data.procurement) {
            // For /all_procurement endpoint
            purchaseData = response.data.procurement;
          } else if (response.data.approved_procurement_purchases) {
            // For project manager endpoint
            purchaseData = response.data.approved_procurement_purchases;
          } else if (response.data.purchase_details) {
            purchaseData = response.data.purchase_details;
          } else if (response.data.purchases) {
            purchaseData = response.data.purchases;
          } else if (Array.isArray(response.data)) {
            purchaseData = response.data;
          } else {
            // If none of the above, check for any array property
            const dataKeys = Object.keys(response.data);
            for (const key of dataKeys) {
              if (Array.isArray(response.data[key])) {
                purchaseData = response.data[key];
                break;
              }
            }
          }

          // Normalize materials field (only if we have data)
          if (purchaseData && purchaseData.length > 0) {
            purchaseData = purchaseData.map(purchase => {
            const materials = purchase.material_details || purchase.materials || [];
            return {
              ...purchase,
              materials,
              total_cost: materials.reduce((sum: number, m: any) =>
                sum + (m.cost || 0) * (m.quantity || 1), 0
              ) || purchase.total_cost || 0,
              total_quantity: materials.reduce((sum: number, m: any) =>
                sum + (m.quantity || 0), 0
              ) || purchase.total_quantity || 0,
              material_count: materials.length || purchase.material_count || 0
            };
          });
          }

          // Only update if data has changed
          const currentPurchases = get().purchases;
          const hasChanges = JSON.stringify(currentPurchases) !== JSON.stringify(purchaseData);

          if (hasChanges) {
            // Check for new purchases that need attention
            const newPurchases = purchaseData.filter(p =>
              !currentPurchases.find(cp => cp.purchase_id === p.purchase_id)
            );

            if (newPurchases.length > 0 && currentPurchases.length > 0) {
              toast.info(`${newPurchases.length} new purchase${newPurchases.length > 1 ? 's' : ''} received`);
            }

            set({
              purchases: purchaseData,
              lastFetchTime: new Date(),
              isLoading: false,
              error: null
            });
          } else {
            // Update last fetch time even if no changes
            set({ lastFetchTime: new Date() });
          }
        }
      } catch (error: any) {
        console.error('Error fetching purchases:', error);
        // Don't show error toast for background polling failures
        if (!get().lastFetchTime) {
          set({ error: error.message || 'Failed to fetch purchases' });
        }
      } finally {
        // Only set loading to false if it was true
        const currentStore = get();
        if (currentStore.isLoading) {
          set({ isLoading: false });
        }
      }
    },

    // Set purchases directly
    setPurchases: (purchases) => {
      set({
        purchases,
        lastFetchTime: new Date()
      });
    },

    // Update a single purchase
    updatePurchase: (purchaseId, updates) => {
      set((state) => ({
        purchases: state.purchases.map(p =>
          p.purchase_id === purchaseId ? { ...p, ...updates } : p
        )
      }));
    },

    // Add a new purchase
    addPurchase: (purchase) => {
      set((state) => ({
        purchases: [purchase, ...state.purchases]
      }));
      toast.success(`New purchase PR #${purchase.purchase_id} added`);
    },

    // Remove a purchase
    removePurchase: (purchaseId) => {
      set((state) => ({
        purchases: state.purchases.filter(p => p.purchase_id !== purchaseId)
      }));
    },

    // Toggle polling
    setPollingEnabled: (enabled) => {
      set({ isPollingEnabled: enabled });
    },

    // Set polling interval
    setPollingInterval: (interval) => {
      set({ pollingInterval: interval });
    },

    // Clear error
    clearError: () => {
      set({ error: null });
    },

    // Setup real-time subscription with instant updates
    setupRealtimeSubscription: () => {
      const state = get();
      if (state.subscriptionCleanup) {
        state.subscriptionCleanup();
      }

      // Subscribe to purchase_workflow_status changes for INSTANT updates
      const cleanup = subscribeToRealtime({
        table: 'purchase_workflow_status',
        event: '*',
        onInsert: (payload) => {
          // INSTANT refetch - no delay for real-time experience
          const userRole = localStorage.getItem('userRole');
          get().fetchPurchases(userRole || undefined);

          // Show notification for new data
          toast.success('New purchase data available!', {
            duration: 2000,
            position: 'top-right',
          });
        },
        onUpdate: (payload) => {
          // INSTANT refetch - no delay for real-time experience
          const userRole = localStorage.getItem('userRole');
          get().fetchPurchases(userRole || undefined);

          // Show notification for updated data
          toast.info('Purchase data updated!', {
            duration: 2000,
            position: 'top-right',
          });
        },
        onDelete: (payload) => {
          // INSTANT refetch for deletions too
          const userRole = localStorage.getItem('userRole');
          get().fetchPurchases(userRole || undefined);
        },
        invalidateKeys: [
          ['purchases'],
          ['dashboard', 'metrics'],
          ['approvals', 'pending'],
        ],
      });

      set({ subscriptionCleanup: cleanup });
    },

    // Cleanup real-time subscription
    cleanupRealtimeSubscription: () => {
      const state = get();
      if (state.subscriptionCleanup) {
        state.subscriptionCleanup();
        set({ subscriptionCleanup: null });
      }
    },

    // Get purchases filtered for a specific role
    getPurchasesForRole: (role: string) => {
      const purchases = get().purchases;
      const roleLower = role.toLowerCase();

      // Filter based on role-specific logic
      switch (roleLower) {
        case 'procurement':
          // All purchases visible to procurement
          return purchases;

        case 'projectmanager':
        case 'project manager':
        case 'project_manager':
          // Show purchases relevant to Project Manager
          return purchases.filter(p => {
            // Show if it has any PM-related status or is in PM workflow stage
            return p.project_manager_status ||
                   p.pm_status ||
                   p.procurement_status === 'approved' ||
                   p.current_workflow_status === 'project_manager' ||
                   true; // For now, show all to ensure nothing is missed
          });

        case 'estimation':
          // Show purchases relevant to Estimation
          return purchases.filter(p => {
            return p.estimation_status ||
                   p.project_manager_status === 'approved' ||
                   p.pm_status === 'approved' ||
                   p.current_workflow_status === 'estimation' ||
                   true; // For now, show all to ensure nothing is missed
          });

        case 'technicaldirector':
        case 'technical director':
        case 'technical_director':
          // Show purchases relevant to Technical Director
          return purchases.filter(p => {
            return p.technical_director_status ||
                   p.estimation_status === 'approved' ||
                   p.current_workflow_status === 'technical_director' ||
                   true; // For now, show all to ensure nothing is missed
          });

        case 'accounts':
          // Show purchases relevant to Accounts
          return purchases.filter(p => {
            return p.accounts_status ||
                   p.technical_director_status === 'approved' ||
                   p.current_workflow_status === 'accounts' ||
                   p.accounts_acknowledgement !== undefined ||
                   true; // For now, show all to ensure nothing is missed
          });

        case 'sitesupervisor':
        case 'site supervisor':
        case 'site_supervisor':
          // Purchases created by site supervisor
          return purchases.filter(p =>
            p.requested_by?.toLowerCase().includes('site') ||
            p.requested_by?.toLowerCase().includes('supervisor')
          );

        default:
          return purchases;
      }
    },
  }))
);

// Setup polling mechanism with aggressive real-time updates
let pollingIntervalId: NodeJS.Timeout | null = null;

export const startPolling = (role?: string) => {
  const store = usePurchaseStore.getState();

  // Clear existing interval
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
  }

  // Start new polling interval for REAL-TIME updates
  if (store.isPollingEnabled) {
    // Initial fetch
    store.fetchPurchases(role);

    // Setup real-time subscription for instant updates
    store.setupRealtimeSubscription();

    // Setup aggressive polling (every 2 seconds when tab is visible)
    pollingIntervalId = setInterval(() => {
      const currentStore = usePurchaseStore.getState();
      // Always poll when tab is visible - no conditions
      if (document.visibilityState === 'visible') {
        currentStore.fetchPurchases(role);
      }
    }, store.pollingInterval);

  }
};

export const stopPolling = () => {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
};

// Auto-refresh INSTANTLY when tab becomes visible
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // INSTANT refresh when tab becomes active - no delays!
    const store = usePurchaseStore.getState();
    const userRole = localStorage.getItem('userRole');

    store.fetchPurchases(userRole || undefined);
  }
});

export default usePurchaseStore;