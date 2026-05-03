/*
 * Pickers — логика модалок (icon-color, time, unit, settings).
 */


let pickerDraft = {};


// ============================================
// ICON & COLOR PICKER
// ============================================

const ICON_LIST = [
    '💪','🏃','🧘','🚴','⚽','🥊','👟',
    '💧','🥦','🍎','☕','💊','🥗','🍵',
    '📖','✏️','🎨','🎸','💻','💬','🧠',
    '😴','🌅','🌙','🎯','⭐','🔥','✨'
];

const COLOR_LIST = ['#353535', '#6B71FF', '#B2F041', '#E5A632', '#F53942'];


function openIconPicker() {
    pickerDraft = {
        icon: formState.icon,
        color: formState.color
    };
    renderIconPicker();
    showSheet('icon-color');
}


function renderIconPicker() {
    const sheet = document.querySelector('[data-sheet="icon-color"]');
    if (!sheet) return;

    const preview = sheet.querySelector('.picker-preview-box');
    if (preview) {
        preview.textContent = pickerDraft.icon;
        preview.style.backgroundColor = colorToBg(pickerDraft.color);
    }

    const colorBtns = sheet.querySelectorAll('.color-option');
    colorBtns.forEach((btn, i) => {
        btn.classList.toggle('color-option-active', COLOR_LIST[i] === pickerDraft.color);
    });

    const iconBtns = sheet.querySelectorAll('.icon-option');
    iconBtns.forEach((btn) => {
        btn.classList.toggle('icon-option-active', btn.textContent.trim() === pickerDraft.icon);
    });
}


// Утилита — конвертирует цвет привычки в фон с прозрачностью
function colorToBg(color) {
    const map = {
        '#353535': 'rgba(53, 53, 53, 1)',
        '#6B71FF': 'rgba(107, 113, 255, 0.25)',
        '#B2F041': 'rgba(178, 240, 65, 0.25)',
        '#E5A632': 'rgba(229, 166, 50, 0.25)',
        '#F53942': 'rgba(245, 57, 66, 0.25)'
    };
    return map[color] || 'rgba(53, 53, 53, 1)';
}


function setDraftIcon(icon) {
    pickerDraft.icon = icon;
    renderIconPicker();
}


function setDraftColor(color) {
    pickerDraft.color = color;
    renderIconPicker();
}


function saveIconPicker() {
    formState.icon = pickerDraft.icon;
    formState.color = pickerDraft.color;
    hideSheet();
    renderForm();
}


function cancelPicker() {
    pickerDraft = {};
    hideSheet();
}


// ============================================
// TIME PICKER — scroll wheel
// ============================================

const ITEM_H = 44;
let twHour = null, twMin = null, twPeriod = null;


class TimeWheel {
    constructor(el, count) {
        this.el = el;
        this.count = count;
        this._raf = null;
        this._wheelTimer = null;
        this._attach();
    }

    _attach() {
        let startY, startTop, lastY, lastT, vel;

        this.el.addEventListener('touchstart', e => {
            if (this._raf) cancelAnimationFrame(this._raf);
            startY = lastY = e.touches[0].clientY;
            startTop = this.el.scrollTop;
            vel = 0;
            lastT = performance.now();
        }, { passive: true });

        this.el.addEventListener('touchmove', e => {
            e.preventDefault();
            const y = e.touches[0].clientY;
            const now = performance.now();
            const dt = now - lastT || 1;
            vel = (lastY - y) / dt;
            lastY = y;
            lastT = now;
            this.el.scrollTop = startTop + (startY - y);
            this._updateSelected();
        }, { passive: false });

        this.el.addEventListener('touchend', () => this._settle(vel), { passive: true });

        this.el.addEventListener('wheel', e => {
            e.preventDefault();
            this.el.scrollTop += e.deltaY;
            this._updateSelected();
            clearTimeout(this._wheelTimer);
            this._wheelTimer = setTimeout(() => this._settle(0), 150);
        }, { passive: false });

        this.el.addEventListener('click', e => {
            const item = e.target.closest('.time-item');
            if (!item) return;
            const items = this.el.querySelectorAll('.time-item');
            const idx = Array.from(items).indexOf(item);
            if (idx >= 0) this._animateTo(idx * ITEM_H);
        });
    }

    _updateSelected() {
        const idx = this.getIndex();
        this.el.querySelectorAll('.time-item').forEach((el, i) => {
            el.classList.toggle('time-item-selected', i === idx);
        });
    }

    _settle(vel) {
        const momentum = vel * 80;
        const raw = this.el.scrollTop + momentum;
        const max = (this.count - 1) * ITEM_H;
        const target = Math.round(Math.max(0, Math.min(raw, max)) / ITEM_H) * ITEM_H;
        this._animateTo(target);
    }

    _animateTo(target) {
        if (this._raf) cancelAnimationFrame(this._raf);
        const start = this.el.scrollTop;
        const diff = target - start;
        if (Math.abs(diff) < 1) {
            this.el.scrollTop = target;
            this._updateSelected();
            return;
        }
        const dur = Math.min(380, Math.abs(diff) * 1.8);
        const t0 = performance.now();
        const step = now => {
            const p = Math.min(1, (now - t0) / dur);
            const e = 1 - Math.pow(1 - p, 3);
            this.el.scrollTop = start + diff * e;
            this._updateSelected();
            if (p < 1) this._raf = requestAnimationFrame(step);
        };
        this._raf = requestAnimationFrame(step);
    }

    scrollToIndex(i, animate = true) {
        const target = Math.max(0, Math.min(i, this.count - 1)) * ITEM_H;
        if (animate) {
            this._animateTo(target);
        } else {
            this.el.scrollTop = target;
            this._updateSelected();
        }
    }

    getIndex() {
        return Math.max(0, Math.min(this.count - 1, Math.round(this.el.scrollTop / ITEM_H)));
    }
}


function openTimePicker() {
    const [h, m] = formState.reminder.time.split(':').map(Number);
    pickerDraft = { hour24: h, minute: m };
    buildTimeWheels();
    renderTimePickerRows();
    showSheet('time');
    requestAnimationFrame(() => requestAnimationFrame(scrollToCurrentTime));
}


function buildTimeWheels() {
    const use12h = storage.getSettings().timeFormat === '12h';

    const hourEl   = document.querySelector('[data-col="hour"] .time-col-scroll');
    const minEl    = document.querySelector('[data-col="minute"] .time-col-scroll');
    const periodWrap = document.querySelector('[data-col="period"]');
    const periodEl = document.querySelector('[data-col="period"] .time-col-scroll');

    if (!hourEl || !minEl) return;
    periodWrap.hidden = !use12h;

    const hours = use12h
        ? Array.from({ length: 12 }, (_, i) => pad(i + 1))
        : Array.from({ length: 24 }, (_, i) => pad(i));

    hourEl.innerHTML =
        '<div class="time-pad"></div>' +
        hours.map(v => `<div class="time-item">${v}</div>`).join('') +
        '<div class="time-pad"></div>';

    minEl.innerHTML =
        '<div class="time-pad"></div>' +
        Array.from({ length: 60 }, (_, i) => `<div class="time-item">${pad(i)}</div>`).join('') +
        '<div class="time-pad"></div>';

    twHour = new TimeWheel(hourEl, hours.length);
    twMin  = new TimeWheel(minEl, 60);

    if (use12h && periodEl) {
        periodEl.innerHTML =
            '<div class="time-pad"></div>' +
            '<div class="time-item">AM</div>' +
            '<div class="time-item">PM</div>' +
            '<div class="time-pad"></div>';
        twPeriod = new TimeWheel(periodEl, 2);
    } else {
        twPeriod = null;
    }
}


function scrollToCurrentTime() {
    const use12h = storage.getSettings().timeFormat === '12h';
    const h = pickerDraft.hour24;
    const m = pickerDraft.minute;

    if (!twHour || !twMin) return;

    if (use12h) {
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        twHour.scrollToIndex(hour12 - 1, false);
        if (twPeriod) twPeriod.scrollToIndex(h >= 12 ? 1 : 0, false);
    } else {
        twHour.scrollToIndex(h, false);
    }
    twMin.scrollToIndex(m, false);
}


function readTimeWheels() {
    const use12h = storage.getSettings().timeFormat === '12h';
    if (!twHour || !twMin) return;

    const hourIdx = twHour.getIndex();
    const minIdx  = twMin.getIndex();

    if (use12h) {
        const hour12 = hourIdx + 1;  // 1–12
        const isPM   = twPeriod ? twPeriod.getIndex() === 1 : false;
        pickerDraft.hour24 = (hour12 % 12) + (isPM ? 12 : 0);
    } else {
        pickerDraft.hour24 = hourIdx;
    }
    pickerDraft.minute = minIdx;
}


function saveTimePicker() {
    readTimeWheels();
    formState.reminder.time    = `${pad(pickerDraft.hour24)}:${pad(pickerDraft.minute)}`;
    formState.reminder.enabled = true;
    hideSheet();
    renderForm();
}


function pad(n) {
    return String(n).padStart(2, '0');
}


// ============================================
// UNIT PICKER (form)
// ============================================

function openUnitPicker() {
    pickerDraft = { unit: formState.unit };
    renderUnitPicker();
    showSheet('unit');
}


function renderUnitPicker() {
    const sheet = document.querySelector('[data-sheet="unit"]');
    if (!sheet) return;

    const items = sheet.querySelectorAll('.picker-item');
    items.forEach((item) => {
        const label = item.querySelector('.picker-item-label')?.textContent.trim();
        const isActive = label === pickerDraft.unit;
        item.classList.toggle('picker-item-active', isActive);

        let check = item.querySelector('.picker-item-check');
        if (isActive && !check) {
            check = document.createElement('span');
            check.className = 'picker-item-check';
            check.setAttribute('aria-hidden', 'true');
            item.appendChild(check);
        } else if (!isActive && check) {
            check.remove();
        }
    });
}


function selectUnit(unit) {
    formState.unit = unit;
    hideSheet();
    renderForm();
}


// ============================================
// SETTINGS PICKERS — Sound, Start week, Time format
// ============================================

function openSoundPicker() {
    const settings = storage.getSettings();
    pickerDraft = { sound: settings.sound };
    renderSoundPicker();
    showSheet('sound');
}


function renderSoundPicker() {
    const sheet = document.querySelector('[data-sheet="sound"]');
    if (!sheet) return;

    const map = {
        'Gentle chime': 'gentle-chime',
        'Bell': 'bell',
        'Chirp': 'chirp',
        'None (vibration only)': 'none'
    };

    const items = sheet.querySelectorAll('.picker-item');
    items.forEach((item) => {
        const label = item.querySelector('.picker-item-label')?.textContent.trim();
        const value = map[label];
        const isActive = value === pickerDraft.sound;
        item.classList.toggle('picker-item-active', isActive);
        toggleCheck(item, isActive);
    });
}


function selectSound(label) {
    const map = {
        'Gentle chime': 'gentle-chime',
        'Bell': 'bell',
        'Chirp': 'chirp',
        'None (vibration only)': 'none'
    };
    const key = map[label];
    storage.updateSettings({ sound: key });
    sounds.play(key);
    hideSheet();
    const settingsScreen = document.querySelector('[data-screen="settings"]');
    if (settingsScreen && !settingsScreen.hidden) {
        settings.render();
    } else {
        renderTimePickerRows();
    }
}


function renderTimePickerRows() {
    const s = storage.getSettings();
    const soundLabel = document.querySelector('.time-picker-sound-label');
    if (soundLabel) soundLabel.textContent = formatSoundLabel(s.sound);
    const vibrateToggle = document.querySelector('.time-picker-vibrate-toggle');
    if (vibrateToggle) vibrateToggle.classList.toggle('toggle-on', s.vibrate !== false);
}


function formatSoundLabel(value) {
    const map = {
        'gentle-chime': 'Gentle chime',
        'bell': 'Bell',
        'chirp': 'Chirp',
        'none': 'None (vibration only)'
    };
    return map[value] || value;
}


function toggleVibrate() {
    const s = storage.getSettings();
    storage.updateSettings({ vibrate: !s.vibrate });
    renderTimePickerRows();
}


function openStartWeekPicker() {
    const s = storage.getSettings();
    pickerDraft = { startWeek: s.startWeekOn };
    renderStartWeekPicker();
    showSheet('start-week');
}


function renderStartWeekPicker() {
    const sheet = document.querySelector('[data-sheet="start-week"]');
    if (!sheet) return;

    const items = sheet.querySelectorAll('.picker-item');
    items.forEach((item) => {
        const label = item.querySelector('.picker-item-label')?.textContent.trim();
        const isActive = label && label.toLowerCase() === pickerDraft.startWeek;
        item.classList.toggle('picker-item-active', isActive);
        toggleCheck(item, isActive);
    });
}


function selectStartWeek(label) {
    storage.updateSettings({ startWeekOn: label.toLowerCase() });
    hideSheet();
    settings.render();
}


function openTimeFormatPicker() {
    const s = storage.getSettings();
    pickerDraft = { timeFormat: s.timeFormat };
    renderTimeFormatPicker();
    showSheet('time-format');
}


function renderTimeFormatPicker() {
    const sheet = document.querySelector('[data-sheet="time-format"]');
    if (!sheet) return;

    const items = sheet.querySelectorAll('.picker-item');
    items.forEach((item) => {
        const label = item.querySelector('.picker-item-label')?.textContent.trim();
        const value = label === '24-hour' ? '24h' : '12h';
        const isActive = value === pickerDraft.timeFormat;
        item.classList.toggle('picker-item-active', isActive);
        toggleCheck(item, isActive);
    });
}


function selectTimeFormat(label) {
    const value = label === '24-hour' ? '24h' : '12h';
    storage.updateSettings({ timeFormat: value });
    hideSheet();
    settings.render();
}


// Утилита — управление галочкой
function toggleCheck(item, isActive) {
    let check = item.querySelector('.picker-item-check');
    if (isActive && !check) {
        check = document.createElement('span');
        check.className = 'picker-item-check';
        check.setAttribute('aria-hidden', 'true');
        item.appendChild(check);
    } else if (!isActive && check) {
        check.remove();
    }
}


window.pickers = {
    openIcon: openIconPicker,
    setDraftIcon: setDraftIcon,
    setDraftColor: setDraftColor,
    saveIcon: saveIconPicker,
    cancel: cancelPicker,
    openTime: openTimePicker,
    saveTime: saveTimePicker,
    openUnit: openUnitPicker,
    selectUnit: selectUnit,
    openSound: openSoundPicker,
    selectSound: selectSound,
    toggleVibrate: toggleVibrate,
    openStartWeek: openStartWeekPicker,
    selectStartWeek: selectStartWeek,
    openTimeFormat: openTimeFormatPicker,
    selectTimeFormat: selectTimeFormat,
    colorToBg: colorToBg
};