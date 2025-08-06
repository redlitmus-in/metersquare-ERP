/**
 * Environment configuration and validation utilities
 * Centralized environment variable management for production applications
 */

export interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  api: {
    baseUrl: string;
  };
  environment: 'development' | 'production' | 'test';
}

/**
 * Validates and returns environment configuration
 * Throws descriptive errors for missing required variables
 */
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const missingVars: string[] = [];
  
  // Required Supabase variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
  
  if (missingVars.length > 0) {
    const errorMessage = `
🚨 Missing Required Environment Variables: ${missingVars.join(', ')}

To fix this error:

1. Create a .env file in the frontend directory
2. Add the following variables:

VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=http://localhost:8000

3. Get your Supabase credentials from:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to Settings > API
   - Copy the Project URL and anon/public key

4. Restart your development server

For production deployment, set these as environment variables in your hosting platform.
    `;
    
    console.error(errorMessage);
    throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
  }
  
  return {
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    },
    api: {
      baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    },
    environment: (import.meta.env.NODE_ENV || 'development') as EnvironmentConfig['environment'],
  };
};

/**
 * Environment-specific configuration helpers
 */
export const isDevelopment = (): boolean => import.meta.env.DEV;
export const isProduction = (): boolean => import.meta.env.PROD;
export const isTest = (): boolean => import.meta.env.MODE === 'test';

/**
 * Safe environment variable access with fallbacks
 */
export const getEnvVar = (key: string, fallback?: string): string => {
  const value = import.meta.env[key];
  if (!value && fallback === undefined) {
    console.warn(`Environment variable ${key} is not set`);
  }
  return value || fallback || '';
};

/**
 * Validates Supabase connection on app startup
 */
export const validateSupabaseConnection = async () => {
  try {
    const config = getEnvironmentConfig();
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(config.supabase.url, config.supabase.anonKey);
    
    // Test connection by attempting to get auth session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('Supabase connection warning:', error.message);
    } else {
      console.log('✅ Supabase connection validated');
    }
    
    return { success: !error, error };
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return { success: false, error };
  }
}; 