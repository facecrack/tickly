/*
 * Notifications — Web Push через Cloudflare Worker.
 *
 * После деплоя воркера вставь сюда его URL:
 */
const PUSH_WORKER = 'https://tickly-push.alexandrovvvsasha-831.workers.dev';


// ─── PUBLIC API ───────────────────────────────────────────────────────────────

async function requestPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied')  return false;
    return (await Notification.requestPermission()) === 'granted';
}

async function scheduleReminders() {
    if (!workerConfigured()) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission !== 'granted') return;

    const appSettings = storage.getSettings();
    if (!appSettings.remindersEnabled) return;

    try {
        const sub = await getOrCreateSubscription();
        if (!sub) return;
        await syncWithWorker(sub);
    } catch (e) {
        console.warn('Push sync failed:', e);
    }
}

async function cancelReminders() {
    if (!workerConfigured()) return;
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return;

        await fetch(`${PUSH_WORKER}/unsubscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint })
        });

        await sub.unsubscribe();
    } catch (e) {
        console.warn('Unsubscribe failed:', e);
    }
}


// ─── INTERNAL ─────────────────────────────────────────────────────────────────

function workerConfigured() {
    return PUSH_WORKER && !PUSH_WORKER.includes('YOUR_ACCOUNT');
}

async function getOrCreateSubscription() {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
        const vapidKey = await fetchVapidPublicKey();
        if (!vapidKey) return null;

        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidKey
        });
    }

    return sub;
}

async function fetchVapidPublicKey() {
    try {
        const res = await fetch(`${PUSH_WORKER}/public-key`);
        const { key } = await res.json();
        return key;
    } catch {
        return null;
    }
}

async function syncWithWorker(sub) {
    const reminders = buildReminders();
    const timezone  = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const payload   = JSON.stringify({ reminders, timezone, endpoint: sub.endpoint });

    // Skip the KV write if nothing changed since last sync
    if (localStorage.getItem('tickly-last-sync') === payload) return;

    await fetch(`${PUSH_WORKER}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), reminders, timezone })
    });

    localStorage.setItem('tickly-last-sync', payload);
}

function buildReminders() {
    return storage.getHabits()
        .filter((h) => !h.archived && h.reminders && h.reminders.length > 0)
        .flatMap((h) => h.reminders.map((r) => ({
            habitId: h.id,
            name:    h.name,
            icon:    h.icon,
            time:    r.time,
            days:    h.schedule
        })));
}


window.notifications = {
    requestPermission,
    scheduleReminders,
    cancelReminders
};
