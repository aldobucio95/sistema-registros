import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    /** App.jsx sigue siendo grande; vendors separados evitan un único megachunk. */
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      /** Evita el aviso [PLUGIN_TIMINGS] en consola (solo diagnóstico de rendimiento del bundler). */
      checks: { pluginTimings: false },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('firebase')) return 'firebase-vendor'
          if (id.includes('lucide-react')) return 'lucide'
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react-vendor'
        },
      },
    },
  },
})
