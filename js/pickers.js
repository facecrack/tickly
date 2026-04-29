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
// TIME PICKER
// ============================================

function openTimePicker() {
    const [h, m] = formState.reminder.time.split(':').map(Number);
    pickerDraft = { hour24: h, minute: m };
    renderTimePicker();
    showSheet('time');
}


function renderTimePicker() {
    const sheet = document.querySelector('[data-sheet="time"]');
    if (!sheet) return;

    const cols = sheet.querySelectorAll('.time-col');
    const hourCol = cols[0];
    const minCol = cols[1];
    const periodCol = cols[2];

    const hour12 = pickerDraft.hour24 % 12 === 0 ? 12 : pickerDraft.hour24 % 12;
    const period = pickerDraft.hour24 < 12 ? 'AM' : 'PM';

    const hourCells = hourCol.querySelectorAll('.time-cell');
    hourCells[0].textContent = pad((hour12 - 2 + 11) % 12 + 1);
    hourCells[1].textContent = pad((hour12 - 1 + 11) % 12 + 1);
    hourCells[2].textContent = pad(hour12);
    hourCells[3].textContent = pad((hour12) % 12 + 1);
    hourCells[4].textContent = pad((hour12 + 1) % 12 + 1);

    const minCells = minCol.querySelectorAll('.time-cell');
    minCells[0].textContent = pad((pickerDraft.minute - 2 + 60) % 60);
    minCells[1].textContent = pad((pickerDraft.minute - 1 + 60) % 60);
    minCells[2].textContent = pad(pickerDraft.minute);
    minCells[3].textContent = pad((pickerDraft.minute + 1) % 60);
    minCells[4].textContent = pad((pickerDraft.minute + 2) % 60);

    const periodCells = periodCol.querySelectorAll('.time-cell');
    periodCells[2].textContent = period;
}


function timeStep(direction, column) {
    if (column === 'hour') {
        pickerDraft.hour24 = (pickerDraft.hour24 + direction + 24) % 24;
    } else if (column === 'minute') {
        pickerDraft.minute = (pickerDraft.minute + direction + 60) % 60;
    }
    renderTimePicker();
}


function timeTogglePeriod() {
    pickerDraft.hour24 = (pickerDraft.hour24 + 12) % 24;
    renderTimePicker();
}


function saveTimePicker() {
    const h = pad(pickerDraft.hour24);
    const m = pad(pickerDraft.minute);
    formState.reminder.time = `${h}:${m}`;
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
    timeStep: timeStep,
    timeTogglePeriod: timeTogglePeriod,
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