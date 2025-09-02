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
<<<<<<< Updated upstream
  getRoleDashboard: () => string;
=======
>>>>>>> Stashed changes
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
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
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
            set({ isAuthenticated: false, user: null });
            return;
          }

          // Check if we have cached user data
          const cachedUserData = localStorage.getItem('user');
          if (cachedUserData) {
            try {
              const cachedUser = JSON.parse(cachedUserData);
              set({
                user: cachedUser,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
              return;
            } catch (e) {
              // If cached data is invalid, fetch from API
            }
          }

          set({ isLoading: true });
          
          const user = await apiWrapper.get<User>(API_ENDPOINTS.AUTH.ME);
          
          // Cache user data
          localStorage.setItem('user', JSON.stringify(user));
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Failed to fetch user profile',
          });
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
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
<<<<<<< Updated upstream
      
      getRoleDashboard: () => {
        const { user } = get();
        if (!user || !user.role_id) {
          return '/dashboard';
        }
        return getRoleDashboardPath(user.role_id);
      },
=======
>>>>>>> Stashed changes
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