import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/pages': resolve(__dirname, './src/pages'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/store': resolve(__dirname, './src/store'),
      '@/types': resolve(__dirname, './src/types'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/api': resolve(__dirname, './src/api'),
      '@/lib': resolve(__dirname, './src/lib'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Add hash to filenames for cache busting
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        // Optimized manual chunks for better code splitting
        manualChunks: (id) => {
          // Core React libraries - always needed
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'vendor';
          }
          // UI libraries - loaded when UI components are used
          if (id.includes('framer-motion') || id.includes('@radix-ui')) {
            return 'ui';
          }
          // Heavy charting library - only for analytics pages
          if (id.includes('recharts')) {
            return 'charts';
          }
          // Form handling
          if (id.includes('react-hook-form') || id.includes('zod')) {
            return 'forms';
          }
          // PDF generation - lazy loaded
          if (id.includes('jspdf') || id.includes('html2canvas')) {
            return 'pdf';
          }
          // Excel handling - lazy loaded
          if (id.includes('xlsx')) {
            return 'excel';
          }
          // Supabase auth - loaded for authenticated routes
          if (id.includes('@supabase')) {
            return 'auth';
          }
          // Date utilities
          if (id.includes('date-fns')) {
            return 'dates';
          }
        }
      }
    },
    // Clear the output directory before building
    emptyOutDir: true,
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    // Terser for better minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    // Better source maps for production
    sourcemap: false,
    // Aggressive code splitting
    cssCodeSplit: true,
    // Preload critical chunks
    modulePreload: {
      polyfill: true
    },
    // Optimize dependencies
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['msq.kol.tel'],
  },
})