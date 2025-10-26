import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    base: mode === 'production' ? '/LeBarobiou/' : '/',
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['apple-touch-icon.png', 'favicon.ico', 'marker-icon.png', 'marker-icon-2x.png', 'marker-shadow.png'],
            manifest: {
                name: 'Le Barobiou',
                short_name: 'Barobiou',
                description: 'Dashboard météo personnel (Weather Underground)',
                theme_color: '#f8fafc',
                background_color: '#f8fafc',
                display: 'standalone',
                start_url: '/LeBarobiou/',
                scope: '/LeBarobiou/',
                lang: 'fr',
                icons: [
                    {
                        src: 'pwa-192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: 'maskable-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable any'
                    }
                ]
            },
            workbox: {
                runtimeCaching: [
                    {
                        urlPattern: ({ url }) => url.origin.includes('api.weather.com'),
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'wu-api-cache',
                            expiration: { maxEntries: 60, maxAgeSeconds: 10 * 60 },
                            cacheableResponse: { statuses: [0, 200] }
                        }
                    }
                ]
            }
        })
    ]
}))
