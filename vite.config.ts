/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg', 'brand/*.svg'],
      manifest: {
        name: 'Frame by WhatBit — Behaviour Support',
        short_name: 'Frame',
        description:
          'Behaviour support intake, descriptive data, and function screener — local-first, decision support only.',
        theme_color: '#0B0B0C',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'brand/favicon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'brand/favicon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // Local-first: precache the app shell only. Participant data lives in
        // IndexedDB and is never fetched/cached by the service worker.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/lib/testSetup.ts'],
    include: ['src/**/*.test.ts', 'shared/**/*.test.ts', 'worker/**/*.test.ts'],
  },
})

