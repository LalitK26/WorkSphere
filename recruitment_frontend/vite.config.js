import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  // Determine API base URL from environment
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      port: 3001,
      proxy: {
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true
        }
      }
    },
    build: {
      minify: 'esbuild',
      target: 'es2015',
      chunkSizeWarningLimit: 1000,
      // Do NOT split React into a separate chunk (manualChunks) - it causes "useState undefined"
      // and blank screen in production when the vendor chunk fails to load or loads after entry.
      rollupOptions: {
        // Ensure React is never treated as external (would break runtime in production).
        external: []
      }
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || '/api'),
      'import.meta.env.VITE_APP_ENV': JSON.stringify(env.VITE_APP_ENV || mode)
    },
    resolve: {
      alias: {
        // Polyfill for Node.js global variable used by sockjs-client
        global: 'globalThis'
      }
    },
    optimizeDeps: {
      // Explicitly include React so it is pre-bundled and always available in production.
      include: ['react', 'react-dom', 'react-router-dom', 'sockjs-client']
    }
  }
})

