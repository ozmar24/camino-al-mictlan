// ============================================================
//  sw-pwa.js — Service Worker mínimo de la PWA
//  Filosofía conservadora: NADA de caché agresiva.
//  - Nunca toca /api/ (los retiros y saldos deben ser siempre frescos)
//  - Nunca toca peticiones que no sean GET
//  - Solo sirve un fallback offline para navegaciones (HTML)
//  Su propósito principal: habilitar la instalación en navegadores
//  que aún exigen service worker.
// ============================================================
const CACHE_NAME = 'mictlan-pwa-v1';
const OFFLINE_URL = '/index.html';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Solo GET; la API y todo lo demas pasa directo a la red
    if (req.method !== 'GET') return;
    if (new URL(req.url).pathname.startsWith('/api/')) return;

    // Navegaciones (HTML): red primero, offline fallback si no hay conexion
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req).catch(() => caches.match(OFFLINE_URL))
        );
    }
    // Todo lo demas: red directa (sin cache para evitar datos viejos)
});
