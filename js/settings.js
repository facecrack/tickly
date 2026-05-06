/*
 * Settings — рендеринг и обновление настроек.
 */


function renderSettings() {
    const settings = storage.getSettings();
    const screen = document.querySelector('[data-screen="settings"]');
    if (!screen) return;

    // Archived section
    const archived = storage.getHabits().filter((h) => h.archived);
    const archivedGroup = screen.querySelector('.settings-archived-group');
    if (archivedGroup) {
        archivedGroup.hidden = archived.length === 0;
        const countEl = archivedGroup.querySelector('.settings-archived-count');
        if (countEl) countEl.textContent = `${archived.length} ${archived.length === 1 ? 'habit' : 'habits'}`;
    }

    // Theme
    const themeOptions = screen.querySelectorAll('.theme-option');
    themeOptions.forEach((opt) => {
        opt.classList.toggle('theme-option-active', opt.dataset.themeValue === (settings.theme || 'default'));
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

    if (enabling) {
        notifications.requestPermission().then((granted) => {
            if (granted) {
                storage.updateSettings({ remindersEnabled: true });
                renderSettings();
                notifications.scheduleReminders();
            } else {
                storage.updateSettings({ remindersEnabled: false });
                renderSettings();
                const screen = document.querySelector('[data-screen="settings"]');
                const toggle = screen?.querySelector('.settings-group:nth-of-type(2) .toggle');
                if (toggle) {
                    toggle.classList.add('schedule-error');
                    setTimeout(() => toggle.classList.remove('schedule-error'), 700);
                }
            }
        });
    } else {
        storage.updateSettings({ remindersEnabled: false });
        renderSettings();
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


function importData() {
    const input = document.getElementById('import-file-input');
    input.onchange = function () {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.habits) throw new Error('Invalid format');
                storage.saveData(data);
                window.location.reload();
            } catch {
                alert('Could not read the file. Make sure it\'s a valid Tickly backup.');
            }
        };
        reader.readAsText(file);
        input.value = '';
    };
    input.click();
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


function openArchived() {
    showScreen('archived');
    renderArchived();
}


function renderArchived() {
    const list = document.querySelector('[data-screen="archived"] .archived-list');
    if (!list) return;
    const habits = storage.getHabits().filter((h) => h.archived);
    if (habits.length === 0) {
        renderSettings();
        showScreen('settings');
        return;
    }
    list.innerHTML = habits.map((habit) => `
        <div class="archived-item">
            <div class="archived-item-icon" style="background-color: ${pickers.colorToBg(habit.color)};">${habit.icon}</div>
            <div class="archived-item-info">
                <p class="archived-item-name">${escapeHtml(habit.name)}</p>
                <p class="archived-item-meta">${formatScheduleShort(habit.schedule)}</p>
            </div>
            <button class="archived-restore-btn" data-action="restore-habit" data-habit-id="${habit.id}">Restore</button>
        </div>
    `).join('');
}


function setTheme(value) {
    storage.updateSettings({ theme: value });
    applyTheme(value);
    renderSettings();
}

function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.dataset.theme = 'light';
    } else {
        delete document.documentElement.dataset.theme;
    }
}


// ============================================
// ДОСТУПНОСТЬ
// ============================================

window.settings = {
    render: renderSettings,
    toggleReminders: toggleReminders,
    export: exportData,
    import: importData,
    setTheme,
    applyTheme,
    openArchived,
    renderArchived
};