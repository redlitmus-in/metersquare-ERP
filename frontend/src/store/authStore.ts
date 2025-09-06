import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginRequest, LoginResponse } from '@/types';
import { apiWrapper, API_ENDPOINTS } from '@/api/config';
import { toast } from 'sonner';
import { getRoleDashboardPath } from '@/utils/roleRouting';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  getCurrentUser: () => Promise<void>;
  updateProfile: (userData: any) => Promise<void>;
  clearError: () => void;
  getRoleDashboard: () => string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginRequest) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await apiWrapper.post<LoginResponse>(
            API_ENDPOINTS.AUTH.LOGIN,
            credentials
          );

          // Clear any stale cached data first
          localStorage.removeItem('user');
          localStorage.removeItem('auth-storage');
          
          // Store token and user data
          localStorage.setItem('access_token', response.access_token);
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          toast.success('Login successful!');
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || 'Login failed';
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });
          toast.error(errorMessage);
          throw error;
        }
      },

      register: async (userData: any) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await apiWrapper.post<User>(
            API_ENDPOINTS.AUTH.REGISTER,
            userData
          );

          set({
            isLoading: false,
            error: null,
          });

          toast.success('Registration successful! Please login.');
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || 'Registration failed';
          set({
            error: errorMessage,
            isLoading: false,
          });
          toast.error(errorMessage);
          throw error;
        }
      },

      logout: () => {
        // Clear all auth-related data from localStorage
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage');
        
        // Reset state
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
        toast.success('Logged out successfully');
      },

      getCurrentUser: async () => {
        try {
          const token = localStorage.getItem('access_token');
          if (!token) {
            set({ isAuthenticated: false, user: null, isLoading: false });
            return;
          }

          set({ isLoading: true });
          
          const response = await apiWrapper.get<any>(API_ENDPOINTS.AUTH.ME);
          
          // Extract user from response (backend returns { user: {...}, api_info: {...} })
          const user = response.user || response;
          
          // Cache user data
          localStorage.setItem('user', JSON.stringify(user));
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          // Clear all auth data on error
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          localStorage.removeItem('auth-storage');
          
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null, // Don't set error to avoid toast messages on token expiry
          });
          
          // Throw error so calling code knows it failed
          throw error;
        }
      },

      updateProfile: async (userData: any) => {
        try {
          set({ isLoading: true, error: null });
          
          const updatedUser = await apiWrapper.put<User>(
            API_ENDPOINTS.AUTH.ME,
            userData
          );

          set({
            user: updatedUser,
            isLoading: false,
            error: null,
          });

          toast.success('Profile updated successfully!');
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || 'Profile update failed';
          set({
            error: errorMessage,
            isLoading: false,
          });
          toast.error(errorMessage);
          throw error;
        }
      },

      clearError: () => set({ error: null }),
      
      
      getRoleDashboard: () => {
        const state = get();
        if (!state.user || !state.user.role_id) {
          return '/dashboard';
        }
        return getRoleDashboardPath(state.user.role_id);
      },

    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);