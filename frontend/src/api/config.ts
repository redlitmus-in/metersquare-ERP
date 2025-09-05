import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { getEnvironmentConfig } from '../utils/environment';

// Get validated environment configuration
const envConfig = getEnvironmentConfig();

// API Configuration
export const API_BASE_URL = envConfig.api.baseUrl;

// Supabase Configuration
export const supabase = createClient(envConfig.supabase.url, envConfig.supabase.anonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Axios instance with enhanced error handling
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Increased timeout for production
  headers: {
    'Content-Type': 'application/json',
  },
});

// Enhanced request interceptor with retry logic
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request ID for tracing
    config.headers['X-Request-ID'] = crypto.randomUUID();
    
    // Debug logging
    console.log('API Request:', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data
    });
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor with comprehensive error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.warn('Unauthorized access detected, redirecting to login');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data);
    }
    
    // Handle 500 Server Error
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.data);
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    LOGOUT: '/logout',
    ME: '/self',
    VERIFY_OTP: '/verification_otp',
    SEND_OTP: '/send_otp',
  },
  USERS: {
    LIST: '/users',
    GET: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    DEACTIVATE: (id: string) => `/users/${id}`,
    COUNT_BY_ROLE: (roleId: string) => `/users/role/${roleId}/count`,
  },
  PROJECTS: {
    LIST: '/projects',
    GET: (id: string) => `/projects/${id}`,
    CREATE: '/projects',
    UPDATE: (id: string) => `/projects/${id}`,
    DELETE: (id: string) => `/projects/${id}`,
    PROGRESS: (id: string) => `/projects/${id}/progress`,
  },
  TASKS: {
    LIST: '/tasks',
    GET: (id: string) => `/tasks/${id}`,
    CREATE: '/tasks',
    UPDATE: (id: string) => `/tasks/${id}`,
    DELETE: (id: string) => `/tasks/${id}`,
    MY_TASKS: '/tasks/my-tasks',
  },
  PROCESSES: {
    ROLES: '/processes/roles',
    GET_ROLE: (id: string) => `/processes/roles/${id}`,
    LIST: '/processes',
    GET: (id: string) => `/processes/${id}`,
    CONNECTIONS: '/processes/connections/workflow',
    MY_PROCESSES: '/processes/my-processes',
    ROLE_WORKFLOW: (roleId: string) => `/processes/role/${roleId}/workflow`,
    HIERARCHY: '/processes/hierarchy/organizational',
  },
  ANALYTICS: {
    DASHBOARD: '/analytics/dashboard',
    PROJECTS_PROGRESS: '/analytics/projects/progress',
    FINANCIAL_REPORT: '/analytics/reports/financial',
    PRODUCTIVITY_REPORT: '/analytics/reports/productivity',
  },
  PROCUREMENT: {
    PURCHASE_REQUISITION: '/purchase',
    VENDOR_QUOTATIONS: '/vendor-quotations',
    MATERIAL_REQUISITIONS: '/material-requisitions',
    DELIVERIES: '/deliveries',
  },
  DASHBOARDS: {
    SITE_SUPERVISOR: '/site_supervisor_dashboard',
    PROCUREMENT: '/procurement_dashboard',
  },
  PROJECT_MANAGER: {
    DASHBOARD: '/project_manager/dashboard',
    APPROVE_PURCHASE: '/pm_approval',
    GET_PURCHASES: '/projectmanger_purchases', // Note: backend has typo
    PURCHASE_STATUS: (id: string | number) => `/purchase_status/${id}`,
  },
  ESTIMATION: {
    APPROVAL: '/estimation_approval',
    DASHBOARD: '/estimation_dashboard',
    PURCHASES: '/estimation_purchase',
    PURCHASE_WITH_STATUS: (id: string | number) => `/purchase_with_status/${id}`,
    CHECK_APPROVAL: (id: string | number) => `/check_estimation_approval/${id}`,
  },
  TECHNICAL_DIRECTOR: {
    APPROVAL: '/tech_approval',
    DASHBOARD: '/tech_dashboard',
    PURCHASES: '/technical_purchase',
  },
};

// Response wrapper utility
export const apiWrapper = {
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await apiClient.get(url, { params });
    return response.data;
  },

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await apiClient.post(url, data);
    return response.data;
  },

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await apiClient.put(url, data);
    return response.data;
  },

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await apiClient.patch(url, data);
    return response.data;
  },

  async delete<T>(url: string): Promise<T> {
    const response = await apiClient.delete(url);
    return response.data;
  },
};