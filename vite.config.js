import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.jpg', 'app-icon.jpg'],
      manifest: {
        name: 'ระบบเบิกพัสดุ',
        short_name: 'Inventory',
        description: 'ระบบจัดการคลังพัสดุสำหรับโรงเรียน',
        theme_color: '#0A3D91',
        background_color: '#f4f7fb',
        icons: [
          {
            src: 'app-icon.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'app-icon.jpg',
            sizes: '512x512',
            type: 'image/jpeg'
          },
          {
            src: 'app-icon.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
