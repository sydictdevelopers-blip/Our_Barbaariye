import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/frontend/', // App-ka waa http://192.145.173.81/frontend/ – haddii aad rabto root (/), u beddel '/'
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3030', // backend-ka – must match backend .env PORT
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {},
})
