/*
 * Settings — рендеринг и обновление настроек.
 */


function renderSettings() {
    const settings = storage.getSettings();
    const screen = document.querySelector('[data-screen="settings"]');
    if (!screen) return;

    // Theme
    const themeOptions = screen.querySelectorAll('.theme-option');
    themeOptions.forEach((opt, i) => {
        const isActive = (i === 0 && settings.theme === 'default') ||
                          (i === 1 && settings.theme === 'minimal');
        opt.classList.toggle('theme-option-active', isActive);
    });

    // Reminders toggle
    const remindersToggle = screen.querySelector('.settings-group:nth-of-type(2) .toggle');
    if (remindersToggle) {
        remindersToggle.classList.toggle('toggle-on', settings.remindersEnabled);
    }

    // Sound — текст
    const soundRow = screen.querySelectorAll('.settings-row-button');
    if (soundRow[0]) {
        const value = soundRow[0].querySelector('.settings-row-value span:first-child');
        if (value) value.textContent = formatSound(settings.sound);
    }

    // Start week
    if (soundRow[1]) {
        const value = soundRow[1].querySelector('.settings-row-value span:first-child');
        if (value) value.textContent = capitalize(settings.startWeekOn);
    }

    // Time format
    if (soundRow[2]) {
        const value = soundRow[2].querySelector('.settings-row-value span:first-child');
        if (value) value.textContent = settings.timeFormat === '24h' ? '24-hour' : '12-hour';
    }
}


function toggleReminders() {
    const current = storage.getSettings();
    const enabling = !current.remindersEnabled;
    storage.updateSettings({ remindersEnabled: enabling });
    renderSettings();

    if (enabling) {
        notifications.requestPermission().then((granted) => {
            if (granted) notifications.scheduleReminders();
        });
    } else {
        notifications.cancelReminders();
    }
}


function exportData() {
    const data = storage.loadData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-tracker-backup-${storage.getTodayString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


function formatSound(value) {
    const map = {
        'gentle-chime': 'Gentle chime',
        'bell': 'Bell',
        'chirp': 'Chirp',
        'none': 'None (vibration only)'
    };
    return map[value] || value;
}


function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}


// ============================================
// ДОСТУПНОСТЬ
// ============================================

window.settings = {
    render: renderSettings,
    toggleReminders: toggleReminders,
    export: exportData
};