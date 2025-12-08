import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  // Fallback to the hardcoded IP if the env var is not found
  const apiUrl = env.VITE_API_URL || 'http://localhost:5001';

  console.log(`[Vite Build] Mode: ${mode}`);
  console.log(`[Vite Build] VITE_API_URL: ${apiUrl}`);

  return {
    plugins: [react()],
    define: {
      // Explicitly define the env variable to ensure it gets replaced
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
    server: {
      host: true, // Listen on all local IPs (needed for mobile/lan access)
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:5001',
          changeOrigin: true,
          secure: false,
        },
        '/auth': {
          target: 'http://localhost:5001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});