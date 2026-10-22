export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener(
    'load',
    () => {
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}service-worker.js`)
        .catch((error) => {
          console.warn('Riseo could not enable offline support:', error)
        })
    },
    { once: true },
  )
}
