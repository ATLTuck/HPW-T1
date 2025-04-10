import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

/**
 * Vite configuration optimized for Solid.js
 * 
 * Includes performance enhancements for development and production builds
 */
export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
    polyfillDynamicImport: false,
    // Production optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console logs in production
        drop_console: true,
        // More aggressive optimizations
        passes: 2,
      },
    },
    rollupOptions: {
      output: {
        // Code splitting for better caching
        manualChunks: {
          'solid-vendor': ['solid-js', 'solid-app-router'],
          'common-ui': ['solid-transition-group'],
        },
      },
    },
    // Generate source maps for debugging
    sourcemap: true,
  },
  optimizeDeps: {
    // Force inclusion of these dependencies in the optimization step
    include: ['solid-js', 'solid-app-router', 'solid-transition-group'],
    // Skip optimization of these packages (usually they're pre-optimized)
    exclude: [],
  },
}); 