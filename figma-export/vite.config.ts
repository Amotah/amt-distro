import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['brand/amt-distro-logo.svg', 'brand/amt-distro-wordmark.svg'],
      manifest: {
        name: 'AMTDISTRO Listener',
        short_name: 'AMT Listen',
        description: 'Listener-facing AMTDISTRO streaming, discovery, and rewards web app.',
        theme_color: '#0A0A0A',
        background_color: '#0A0A0A',
        display: 'standalone',
        start_url: '/listen',
        scope: '/',
        icons: [
          {
            src: '/brand/amt-distro-logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Discover music',
            short_name: 'Discover',
            url: '/listen',
          },
          {
            name: 'Artist dashboard',
            short_name: 'Dashboard',
            url: '/dashboard',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg}'],
      },
    }),
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
