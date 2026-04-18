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
      port: 3000,
      proxy: {
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true
        }
      }
    },
    build: {
      // Remove console logs in production build
      minify: 'esbuild',
      target: 'es2015',
    },
    esbuild: {
      // Drop console and debugger in production
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    // Expose env variables to the client
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || '/api'),
      'import.meta.env.VITE_APP_ENV': JSON.stringify(env.VITE_APP_ENV || mode)
    }
  }
})

