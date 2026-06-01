import { defineConfig, loadEnv, type ConfigEnv, type PluginOption, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Note: we import @sentry/vite dynamically later to avoid failing when dev-deps
// are not installed (pre-commit hooks / CI). Do not use a static import here.
import path from 'path';

type SentryVitePluginFactory = (options: {
  org?: string;
  project?: string;
  authToken?: string;
  include?: string;
  url?: string;
}) => PluginOption;

type SentryViteModule = {
  sentryVitePlugin?: SentryVitePluginFactory;
  default?: {
    sentryVitePlugin?: SentryVitePluginFactory;
  };
};

// https://vite.dev/config/
export default defineConfig(async ({ mode }: ConfigEnv): Promise<UserConfig> => {
  // Load env variables for the current mode (development/production/staging)
  const env = loadEnv(mode, process.cwd(), '');

  const isProd = mode === 'production';
  const enableSentry =
    Boolean(env.SENTRY_AUTH_TOKEN) &&
    Boolean(env.SENTRY_ORG) &&
    Boolean(env.SENTRY_PROJECT) &&
    isProd;

  // Try dynamic import of @sentry/vite. If it's not installed, skip plugin.
  let sentryPluginFactory: SentryVitePluginFactory | null = null;
  if (enableSentry) {
    try {
      // @ts-expect-error - optional dev dependency, may not be installed in some environments
      const mod: SentryViteModule = await import('@sentry/vite');
      sentryPluginFactory = mod?.sentryVitePlugin ?? mod?.default?.sentryVitePlugin ?? null;
    } catch (err: unknown) {
      console.warn(
        'Sentry Vite plugin not available, skipping sourcemap upload:',
        err instanceof Error ? err.message : String(err)
      );
      sentryPluginFactory = null;
    }
  }

  const plugins: PluginOption[] = [react()];
  if (sentryPluginFactory) {
    plugins.push(
      sentryPluginFactory({
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        authToken: env.SENTRY_AUTH_TOKEN,
        include: path.resolve(__dirname, 'dist'),
        url: env.SENTRY_URL || undefined,
      })
    );
  }

  return {
    plugins,

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
      // `clearScreen` removed — keep server options minimal for compatibility

      proxy: {
        // Proxy API calls to backend — avoids CORS in development
        '/api': {
          target: env.VITE_BACKEND_API_BASE_URL || 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/api/, ''),
        },
      },
    },

    build: {
      // Use inline sourcemaps for development, full sourcemaps for production
      sourcemap: isProd ? true : 'inline',

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
