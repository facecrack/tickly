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
let scrollDebounce = null;
let scrollListenerAttached = false;

function openTimePicker() {
    const [h, m] = formState.reminder.time.split(':').map(Number);
    pickerDraft = { hour24: h, minute: m };

    buildTimeWheels();
    showSheet('time');

    // Прокрутить к нужному значению после рендера
    requestAnimationFrame(() => requestAnimationFrame(scrollToCurrentTime));
}


function buildTimeWheels() {
    const use12h = storage.getSettings().timeFormat === '12h';

    const hourScroll   = document.querySelector('[data-col="hour"] .time-col-scroll');
    const minScroll    = document.querySelector('[data-col="minute"] .time-col-scroll');
    const periodWrap   = document.querySelector('[data-col="period"]');
    const periodScroll = document.querySelector('[data-col="period"] .time-col-scroll');

    if (!hourScroll || !minScroll) return;

    periodWrap.hidden = !use12h;

    // Часы
    const hours = use12h
        ? Array.from({ length: 12 }, (_, i) => pad(i + 1))   // 01–12
        : Array.from({ length: 24 }, (_, i) => pad(i));       // 00–23

    hourScroll.innerHTML =
        '<div class="time-pad"></div>' +
        hours.map(v => `<div class="time-item">${v}</div>`).join('') +
        '<div class="time-pad"></div>';

    // Минуты
    const minutes = Array.from({ length: 60 }, (_, i) => pad(i));
    minScroll.innerHTML =
        '<div class="time-pad"></div>' +
        minutes.map(v => `<div class="time-item">${v}</div>`).join('') +
        '<div class="time-pad"></div>';

    // AM/PM
    if (use12h) {
        periodScroll.innerHTML =
            '<div class="time-pad"></div>' +
            '<div class="time-item">AM</div>' +
            '<div class="time-item">PM</div>' +
            '<div class="time-pad"></div>';
    }

    // Слушатель scroll — один раз на весь sheet
    if (!scrollListenerAttached) {
        document.querySelector('[data-sheet="time"]').addEventListener('scroll', () => {
            clearTimeout(scrollDebounce);
            scrollDebounce = setTimeout(readTimeWheels, 200);
        }, { capture: true, passive: true });
        scrollListenerAttached = true;
    }
}


function scrollToCurrentTime() {
    const use12h = storage.getSettings().timeFormat === '12h';
    const h = pickerDraft.hour24;
    const m = pickerDraft.minute;

    const hourScroll   = document.querySelector('[data-col="hour"] .time-col-scroll');
    const minScroll    = document.querySelector('[data-col="minute"] .time-col-scroll');
    const periodScroll = document.querySelector('[data-col="period"] .time-col-scroll');

    if (!hourScroll || !minScroll) return;

    if (use12h) {
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        hourScroll.scrollTop = (hour12 - 1) * ITEM_H;
        if (periodScroll) periodScroll.scrollTop = (h >= 12 ? 1 : 0) * ITEM_H;
    } else {
        hourScroll.scrollTop = h * ITEM_H;
    }
    minScroll.scrollTop = m * ITEM_H;
}


function readTimeWheels() {
    const use12h = storage.getSettings().timeFormat === '12h';

    const hourScroll   = document.querySelector('[data-col="hour"] .time-col-scroll');
    const minScroll    = document.querySelector('[data-col="minute"] .time-col-scroll');
    const periodScroll = document.querySelector('[data-col="period"] .time-col-scroll');

    if (!hourScroll || !minScroll) return;

    const hourIdx = Math.round(hourScroll.scrollTop / ITEM_H);
    const minIdx  = Math.round(minScroll.scrollTop  / ITEM_H);

    if (use12h) {
        const hour12  = (hourIdx % 12) + 1;  // 1–12
        const isPM    = periodScroll ? Math.round(periodScroll.scrollTop / ITEM_H) === 1 : false;
        pickerDraft.hour24 = (hour12 % 12) + (isPM ? 12 : 0);
    } else {
        pickerDraft.hour24 = hourIdx % 24;
    }
    pickerDraft.minute = minIdx % 60;
}


function saveTimePicker() {
    readTimeWheels();  // Читаем финальную позицию перед сохранением
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
    storage.updateSettings({ sound: map[label] });
    hideSheet();
    settings.render();
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
    openStartWeek: openStartWeekPicker,
    selectStartWeek: selectStartWeek,
    openTimeFormat: openTimeFormatPicker,
    selectTimeFormat: selectTimeFormat,
    colorToBg: colorToBg
};