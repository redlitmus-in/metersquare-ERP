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
  developmentRole?: string; // For development testing
  
  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  getCurrentUser: () => Promise<void>;
  updateProfile: (userData: any) => Promise<void>;
  clearError: () => void;
  setDevelopmentRole: (role: string) => void;
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
          
          // Check if this is a development role login
          const devRole = localStorage.getItem('dev_role');
          if (devRole && credentials.role) {
            // For development, we'll simulate a successful login with the selected role
            const mockUser: User = {
              id: 'dev-user-id',
              email: credentials.email,
              full_name: `Dev User (${credentials.role})`,
              role_id: credentials.role as any,
              department: 'Development',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            
            // Store development token
            localStorage.setItem('access_token', 'dev-token');
            localStorage.setItem('dev_role', credentials.role);
            
            set({
              user: mockUser,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              developmentRole: credentials.role,
            });
            
            toast.success(`Development login successful as ${credentials.role}!`);
            return;
          }
          
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
        localStorage.removeItem('dev_role');
        localStorage.removeItem('demo_user');
        set({
          user: null,
          isAuthenticated: false,
          error: null,
          developmentRole: undefined,
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

          // Check if this is a demo user
          const demoUserData = localStorage.getItem('demo_user');
          if (token === 'demo-token' && demoUserData) {
            const demoUser = JSON.parse(demoUserData);
            const mockUser: User = {
              id: 'demo-user-id',
              email: demoUser.email,
              full_name: demoUser.name,
              role_id: demoUser.role as any,
              department: 'Demo',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            
            set({
              user: mockUser,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
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
      setDevelopmentRole: (role: string) => set({ developmentRole: role }),
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