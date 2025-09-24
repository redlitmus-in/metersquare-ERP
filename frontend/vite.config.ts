import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    // Add gzip compression for production builds
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // Only compress files larger than 10kb
      algorithm: 'gzip',
      ext: '.gz',
    }),
    // Add brotli compression for better compression ratio
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'brotliCompress',
      ext: '.br',
    })
  ],
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
        entryFileNames: 'assets/js/[name]-[hash].js',
        chunkFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name){
            return 'assets/images/[name]-[hash][extname]';
          }
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash][extname]`;
          } else {
            return `assets/[name]-[hash][extname]`;
          }
        },
        // Optimized manual chunks
        manualChunks: {
          // React core - always needed
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI framework - split Radix UI for better caching
          'ui-vendor': ['framer-motion'],
          'radix-ui': ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip', '@radix-ui/react-popover'],
          // Form handling
          'forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
          // Auth
          'auth': ['@supabase/supabase-js'],
          // Utils
          'utils': ['axios', 'date-fns', 'clsx', 'tailwind-merge'],
          // Charts - lazy loaded but pre-chunked
          'charts': ['recharts'],
          // Export utilities - lazy loaded but pre-chunked
          'export-utils': ['jspdf', 'jspdf-autotable', 'xlsx', 'file-saver'],
          // Icons - separate chunk for better caching
          'icons': ['lucide-react', '@heroicons/react'],
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
    // Disable source maps completely in production for security
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