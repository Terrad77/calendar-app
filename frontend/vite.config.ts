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

    server: {
      port: 5173,
      strictPort: true,

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
      // Generate source maps for production error tracking (Sentry, etc.)
      sourcemap: true,

      // Raise chunk size warning threshold (default 500kb is too aggressive)
      chunkSizeWarningLimit: 1000,

      rollupOptions: {
        output: {
          // Split vendor chunks for better long-term caching
          manualChunks: {
            vendor: ['react', 'react-dom'],
          },
        },
      },
    },

    // Suppress noisy source map warnings from browser extensions (React DevTools)
    logLevel: 'warn',
  };
});

// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   define: {
//     'import.meta.env.VITE_BACKEND_API_BASE_URL': JSON.stringify(
//       process.env.VITE_BACKEND_API_BASE_URL
//     ),
//   },
// });
