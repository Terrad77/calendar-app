import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables for the current mode (development/production/staging)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    resolve: {
      alias: {
        // Enable absolute imports: import { foo } from '@/components/foo'
        '@': path.resolve(__dirname, './src'),
      },
    },

    logLevel: 'info', // Set to 'info' to see the server URL and startup messages
    server: {
      host: 'localhost', // Explicitly set host to localhost for development
      port: 5173,
      strictPort: true,
      clearScreen: false, // Prevent terminal clearing on restart

      proxy: {
        // Proxy API calls to backend — avoids CORS in development
        '/api': {
          target: env.VITE_BACKEND_API_BASE_URL || 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },

    build: {
      // Use inline sourcemaps to ensure `source-map-explorer` can parse mappings
      // (workaround for tools that report "generated column Infinity").
      // Revert to `true` or adjust for CI as needed.
      sourcemap: 'inline',

      // Raise chunk size warning threshold (default 500kb is too aggressive)
      chunkSizeWarningLimit: 1000,

      rollupOptions: {
        output: {
          // Split vendor chunks for better long-term caching and smaller initial bundle
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('framer-motion')) return 'vendor_framer';
              if (id.includes('@dnd-kit')) return 'vendor_dndkit';
              if (id.includes('react-router')) return 'vendor_router';
              if (id.includes('lucide-react') || id.includes('react-icons')) return 'vendor_icons';
              if (id.includes('@reduxjs/toolkit')) return 'vendor_rtk';
              if (id.includes('react-dom')) return 'vendor_react_dom';
              return 'vendor';
            }
          },
        },
      },
    },
  };
});
