/*
 * Notifications — локальные уведомления через ServiceWorkerRegistration.
 * Работают пока браузер активен; для фоновых push нужен сервер.
 */

const pendingTimers = new Set();


function getTodayDayKey() {
    const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return keys[new Date().getDay()];
}


async function requestPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
}


function cancelReminders() {
    pendingTimers.forEach((id) => clearTimeout(id));
    pendingTimers.clear();
}


function scheduleReminders() {
    cancelReminders();

    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const appSettings = storage.getSettings();
    if (!appSettings.remindersEnabled) return;

    const habits = storage.getHabits();
    const now = new Date();
    const today = storage.getTodayString();
    const todayKey = getTodayDayKey();

    habits.forEach((habit) => {
        if (!habit.reminder?.enabled) return;
        if (!habit.schedule.includes(todayKey)) return;

        const [h, m] = habit.reminder.time.split(':').map(Number);
        const fireAt = new Date();
        fireAt.setHours(h, m, 0, 0);

        const delay = fireAt.getTime() - now.getTime();
        if (delay < 0) return;

        const timerId = setTimeout(() => {
            pendingTimers.delete(timerId);

            const fresh = storage.getHabit(habit.id);
            if (!fresh) return;

            const entry = fresh.entries[today];
            const isDone = entry === 'done' || (typeof entry === 'number' && entry >= (fresh.target || 1));
            if (isDone) return;

            fireNotification(fresh);
        }, delay);

        pendingTimers.add(timerId);
    });
}


function fireNotification(habit) {
    const base = new URL('./', location.href).href;
    const opts = {
        body: 'Time to check in!',
        icon: base + 'icons/app-icon-192.png',
        badge: base + 'icons/app-icon-192.png',
        tag: 'habit-' + habit.id,
        data: { habitId: habit.id }
    };

    const title = habit.icon + ' ' + habit.name;

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => reg.showNotification(title, opts));
    } else {
        new Notification(title, opts);
    }
}


window.notifications = {
    requestPermission,
    scheduleReminders,
    cancelReminders
};
