import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import {
  formatDisplayVersion,
  isProductionBuildCommand,
  projectRoot,
  readPackageSemver,
  resolveBuildSeqForProductionBuild,
  getStoredBuildSeq,
} from './scripts/vite-build-version.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Cambia en cada `vite build`; se copia a `dist/version.json` para detectar nuevos deploys. */
function newBuildId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  /** Versión semántica manual: sube `package.json` cuando haya un hito (1.1.0, 2.0.0, …). */
  const APP_SEMVER = readPackageSemver()
  const isProdBuild = isProductionBuildCommand(command)
  const APP_BUILD_SEQ = isProdBuild ? resolveBuildSeqForProductionBuild(APP_SEMVER) : getStoredBuildSeq(APP_SEMVER)
  const APP_DISPLAY_VERSION = formatDisplayVersion(APP_SEMVER, APP_BUILD_SEQ)
  const APP_BUILD_ID = newBuildId()

  return {
    define: {
      'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(APP_BUILD_ID),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_SEMVER),
      'import.meta.env.VITE_APP_BUILD_SEQ': JSON.stringify(String(APP_BUILD_SEQ)),
      'import.meta.env.VITE_APP_DISPLAY_VERSION': JSON.stringify(APP_DISPLAY_VERSION),
    },
    plugins: [
      react(),
      VitePWA({
        /**
         * `prompt` desactiva la recarga automática en `activated` de workbox-window.
         * La recarga por nueva versión la coordina `hostingVersionCheck.js` (poll de
         * `version.json` + recarga inmediata al detectar `buildId` distinto).
         */
        registerType: 'prompt',
        includeAssets: ['favicon.png', 'pwa-icon-512.png', 'icons.svg'],
        manifest: {
          /** Mismo nombre que en login (`LoginScreen.jsx`) y `<title>`. */
          name: 'Registros VNPM',
          short_name: 'Registros VNPM',
          description: 'Registros VNPM — Vida Nueva para el Mundo.',
          theme_color: '#4f46e5',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          lang: 'es',
          /**
           * Icono cuadrado ≥144px (`public/pwa-icon-512.png`) — logo Commons encajado sin deformar (`pnpm run generate:pwa-icon`).
           * `purpose: any` cumple instalación PWA (evitar solo `favicon.png` rectangular).
           */
          icons: [
            {
              src: '/pwa-icon-512.png',
              type: 'image/png',
              sizes: '512x512',
              purpose: 'any',
            },
            {
              src: '/pwa-icon-512.png',
              type: 'image/png',
              sizes: '192x192',
              purpose: 'any',
            },
            {
              src: '/pwa-icon-512.png',
              type: 'image/png',
              sizes: '144x144',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          navigateFallback: 'index.html',
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
      {
        name: 'emit-hosting-version-json',
        closeBundle() {
          const outDir = path.join(projectRoot, 'dist', 'version.json')
          fs.writeFileSync(
            outDir,
            `${JSON.stringify({
              semver: APP_SEMVER,
              buildSeq: APP_BUILD_SEQ,
              displayVersion: APP_DISPLAY_VERSION,
              buildId: APP_BUILD_ID,
              builtAt: new Date().toISOString(),
            })}\n`,
            'utf8',
          )
        },
      },
    ],
    build: {
      chunkSizeWarningLimit: 1200,
      rolldownOptions: {
        /** Evita el aviso [PLUGIN_TIMINGS] en consola (solo diagnóstico de rendimiento del bundler). */
        checks: { pluginTimings: false },
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'firebase-vendor',
                test: /node_modules[\\/]firebase/,
                priority: 30,
              },
              {
                name: 'lucide',
                test: /node_modules[\\/]lucide-react/,
                priority: 25,
              },
              {
                name: 'react-router',
                test: /node_modules[\\/]react-router/,
                priority: 25,
              },
              {
                name: 'react-vendor',
                test: /node_modules[\\/](react-dom|react)[\\/]/,
                priority: 25,
              },
            ],
          },
        },
      },
    },
    test: {
      environment: 'node',
      include: ['src/__tests__/**/*.test.js'],
    },
  }
})
