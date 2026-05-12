import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (
            id.includes('/react/')
            || id.includes('/react-dom/')
            || id.includes('/scheduler/')
          ) {
            return 'react-vendor'
          }

          if (id.includes('react-router')) {
            return 'router-vendor'
          }

          if (
            id.includes('@supabase')
          ) {
            return 'supabase-vendor'
          }

          if (
            id.includes('jspdf')
          ) {
            return 'jspdf-vendor'
          }

          if (id.includes('html2canvas')) {
            return 'html2canvas-vendor'
          }

          if (id.includes('qrcode')) {
            return 'qrcode-vendor'
          }

          if (
            id.includes('chart.js')
            || id.includes('react-chartjs-2')
            || id.includes('recharts')
          ) {
            return 'charts-vendor'
          }

          if (
            id.includes('@mui')
            || id.includes('@emotion')
            || id.includes('@popperjs')
          ) {
            return 'mui-vendor'
          }

          if (id.includes('@radix-ui') || id.includes('vaul')) {
            return 'radix-vendor'
          }

          return undefined
        },
      },
    },
  },
})
