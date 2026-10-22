const CACHE_NAME = 'evergrow-shell-v1'
const APP_ROOT = new URL('.', self.location.href).href
const SHELL_FILES = [
  APP_ROOT,
  new URL('manifest.webmanifest', APP_ROOT).href,
  new URL('evergrow-icon.svg', APP_ROOT).href,
  new URL('evergrow-192.png', APP_ROOT).href,
  new URL('evergrow-512.png', APP_ROOT).href,
  new URL('apple-touch-icon.png', APP_ROOT).href,
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('evergrow-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(async (response) => {
      await caches.open(CACHE_NAME).then((cache) => cache.put(APP_ROOT, response.clone()))
      return response
    }).catch(() => caches.match(APP_ROOT)))
    return
  }

  event.respondWith(caches.match(request).then(async (cached) => {
    if (cached) return cached
    const response = await fetch(request)
    if (response.ok) await caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
    return response
  }))
})
