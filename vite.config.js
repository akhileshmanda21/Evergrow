import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const productionCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "form-action 'self'",
].join('; ')

const productionCspPlugin = {
  name: 'evergrow-production-csp',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html) {
      return html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${productionCsp}">`,
      )
    },
  },
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react(), productionCspPlugin],
  test: {
    environment: 'jsdom',
    setupFiles: './src/testSetup.js',
  },
})
