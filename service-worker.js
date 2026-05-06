/*
 * Service Worker — кэш + уведомления.
 */

const CACHE_NAME = 'tickly-v37';
const SCOPE = self.registration.scope;

function url(path) {
    return SCOPE + path;
}

const STATIC_FILES = [
    SCOPE,
    url('index.html'),
    url('style.css'),
    url('manifest.json'),
    // CSS
    url('css/tokens.css'),
    url('css/base.css'),
    url('css/components.css'),
    url('css/screens/alert.css'),
    url('css/screens/feedback.css'),
    url('css/screens/habit-detail.css'),
    url('css/screens/main-empty.css'),
    url('css/screens/main.css'),
    url('css/screens/new-habit.css'),
    url('css/screens/picker-icon-color.css'),
    url('css/screens/picker-time.css'),
    url('css/screens/privacy.css'),
    url('css/screens/settings.css'),
    url('css/screens/sheet.css'),
    url('css/screens/statistic.css'),
    // JS
    url('js/storage.js'),
    url('js/render.js'),
    url('js/habits.js'),
    url('js/detail.js'),
    url('js/form.js'),
    url('js/pickers.js'),
    url('js/settings.js'),
    url('js/statistic.js'),
    url('js/feedback.js'),
    url('js/notifications.js'),
    url('js/dragdrop.js'),
    url('js/router.js'),
    url('js/app.js'),
    // Fonts
    url('fonts/FixelDisplay-Bold.woff2'),
    url('fonts/FixelDisplay-Medium.woff2'),
    url('fonts/FixelDisplay-Regular.woff2'),
    url('fonts/FixelDisplay-SemiBold.woff2'),
    // Icons
    url('icons/archive.svg'),
    url('icons/arrow-left.svg'),
    url('icons/bell.svg'),
    url('icons/check.svg'),
    url('icons/chevron-down.svg'),
    url('icons/chevron-left.svg'),
    url('icons/chevron-right.svg'),
    url('icons/close.svg'),
    url('icons/download.svg'),
    url('icons/edit.svg'),
    url('icons/info.svg'),
    url('icons/minus.svg'),
    url('icons/moon-grey.svg'),
    url('icons/moon-lime.svg'),
    url('icons/plus.svg'),
    url('icons/settings.svg'),
    url('icons/shield.svg'),
    url('icons/skip.svg'),
    url('icons/stats.svg'),
    url('icons/trash.svg'),
    url('icons/app-icon-192.png'),
    url('icons/app-icon-512.png'),
    // Moods
    url('moods/mood-bad.svg'),
    url('moods/mood-great.svg'),
    url('moods/mood-ok.svg'),
    url('moods/mood-soso.svg'),
];


self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_FILES))
    );
    self.skipWaiting();
});


self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});


self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});


self.addEventListener('push', (event) => {
    const data  = event.data?.json() ?? {};
    const title = data.title ?? 'Tickly';
    const opts  = {
        body:  data.body  ?? 'Time to check in!',
        icon:  SCOPE + 'icons/app-icon-192.png',
        badge: SCOPE + 'icons/app-icon-192.png',
        tag:   data.habitId ?? 'tickly',
        data:  { url: SCOPE }
    };
    event.waitUntil(self.registration.showNotification(title, opts));
});


self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            for (const client of list) {
                if ('focus' in client) return client.focus();
            }
            return clients.openWindow(SCOPE);
        })
    );
});
