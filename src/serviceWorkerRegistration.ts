// Service worker hanya didaftarkan di build produksi; di `npm start` caching
// akan mengganggu hot reload.
export function register() {
  if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;
    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        registration.onupdatefound = () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.onstatechange = () => {
            // Versi baru langsung aktif; halaman memakai versi baru saat dibuka berikutnya.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              installing.postMessage({ type: 'SKIP_WAITING' });
            }
          };
        };
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
  });
}
