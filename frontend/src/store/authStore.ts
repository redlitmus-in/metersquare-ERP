import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginRequest, LoginResponse } from '@/types';
import { apiWrapper, API_ENDPOINTS } from '@/api/config';
import toast from 'react-hot-toast';

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

          set({ isLoading: true });
          
          const user = await apiWrapper.get<User>(API_ENDPOINTS.AUTH.ME);
          
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