import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    base: mode === 'production' ? '/LeBarobiou/' : '/',
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate', // 👈 corrige la faute de frappe
            includeAssets: ['apple-touch-icon.png'],
            manifest: {
                name: 'Le Barobiou',
                short_name: 'Barobiou',
                description: 'Dashboard météo personnel (Weather Underground)',
                theme_color: '#f8fafc',
                background_color: '#f8fafc',
                display: 'standalone',
                start_url: '/LeBarobiou/', // 👈 chemin correct pour ton hébergement GitHub Pages
                scope: '/LeBarobiou/',     // 👈 facultatif mais évite certains 404
                lang: 'fr',
                icons: [
                    {
                        src: 'pwa-192.png', // 👈 pas besoin du "/" ici
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