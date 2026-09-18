import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Vite does not perform %ENV% substitution in index.html, so this tiny plugin
// injects the build-time API base URL as a global the inline warm-up script
// (and the app) can read before the JS bundle finishes downloading. This lets
// the very first byte of the page start waking the Render free-tier server.
function injectApiUrl(): Plugin {
  return {
    name: 'inject-api-url',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const mode = ctx.server ? 'development' : 'production'
        const env = loadEnv(mode, process.cwd(), '')
        const apiUrl = env.VITE_API_URL ?? 'http://localhost:5000'
        return html.replace(
          '</title>',
          `</title>\n    <script>window.__SMARTDOCS_API_URL__ = ${JSON.stringify(apiUrl)};</script>`,
        )
      },
    },
  }
}

export default defineConfig({
  plugins: [
    injectApiUrl(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
})
