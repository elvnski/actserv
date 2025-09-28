import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()], // Only the React plugin is needed
  server: {
    proxy: {
      // Proxy /api requests to Django backend
      '/api': {
        target: 'http://localhost:8000', 
        changeOrigin: true,
        secure: false, 
      },
      // Proxy media uploads
      '/media': {
        target: 'http://localhost:8000', 
        changeOrigin: true,
        secure: false,
      }
    },
  },
});