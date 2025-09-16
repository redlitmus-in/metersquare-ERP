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
        // Better file naming with hashes for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Optimized manual chunks
        manualChunks: {
          // React core - always needed
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI framework
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs', 'framer-motion'],
          // Form handling
          'forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
          // Auth
          'auth': ['@supabase/supabase-js'],
          // Utils
          'utils': ['axios', 'date-fns', 'clsx', 'tailwind-merge'],
        }
      }
    },
    // Target modern browsers
    target: 'es2020',
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Minification with terser
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      format: {
        comments: false
      }
    },
    // No source maps in production for smaller size
    sourcemap: false,
    // CSS code splitting
    cssCodeSplit: true,
    // Report compressed size
    reportCompressedSize: false,
    // Assets inline limit
    assetsInlineLimit: 4096
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['msq.kol.tel'],
  },
})