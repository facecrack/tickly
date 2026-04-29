/*
 * Service Worker — кэширует статические файлы для офлайн-работы.
 */


const CACHE_NAME = 'habit-tracker-v1';
const STATIC_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/manifest.json',
    // CSS
    '/css/tokens.css',
    '/css/base.css',
    '/css/components.css',
    // JS
    '/js/storage.js',
    '/js/render.js',
    '/js/habits.js',
    '/js/detail.js',
    '/js/form.js',
    '/js/pickers.js',
    '/js/settings.js',
    '/js/router.js',
    '/js/app.js'
];


self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_FILES);
        })
    );
});


self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
});


self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});