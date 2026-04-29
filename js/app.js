/*
 * Habit Tracker — точка входа.
 */

const SCREEN_DEFAULT = 'main';

let currentScreen = SCREEN_DEFAULT;
let previousScreen = null;
let activeSheet = null;
let activeAlert = null;


function showScreen(name) {
    const screens = document.querySelectorAll('[data-screen]');
    screens.forEach((screen) => {
        screen.hidden = true;
    });

    const target = document.querySelector(`[data-screen="${name}"]`);
    if (!target) {
        console.warn(`Экран "${name}" не найден`);
        return;
    }

    target.hidden = false;

    // Запоминаем предыдущий экран и скроллим только при смене
    if (currentScreen !== name) {
        previousScreen = currentScreen;
        window.scrollTo(0, 0);
    }

    currentScreen = name;
}


const backdrop = document.querySelector('.sheet-backdrop');


function showSheet(name) {
    if (activeSheet) hideSheet();

    const sheet = document.querySelector(`[data-sheet="${name}"]`);
    if (!sheet) {
        console.warn(`Модалка "${name}" не найдена`);
        return;
    }

    sheet.hidden = false;
    backdrop.hidden = false;
    activeSheet = name;
}

function hideSheet() {
    if (!activeSheet) return;
    const sheet = document.querySelector(`[data-sheet="${activeSheet}"]`);
    if (sheet) sheet.hidden = true;
    backdrop.hidden = true;
    activeSheet = null;
}


function showAlertModal(name) {
    if (activeAlert) hideAlertModal();
    const el = document.querySelector(`[data-alert="${name}"]`);
    if (!el) {
        console.warn(`Alert "${name}" не найден`);
        return;
    }
    el.hidden = false;
    backdrop.hidden = false;
    activeAlert = name;
}

function hideAlertModal() {
    if (!activeAlert) return;
    const el = document.querySelector(`[data-alert="${activeAlert}"]`);
    if (el) el.hidden = true;
    backdrop.hidden = true;
    activeAlert = null;
}


if (backdrop) {
    backdrop.addEventListener('click', () => {
        if (activeSheet) hideSheet();
        if (activeAlert) hideAlertModal();
    });
}


render.main();


window.showScreen = showScreen;
window.showSheet = showSheet;
window.hideSheet = hideSheet;
window.showAlert = showAlertModal;
window.hideAlert = hideAlertModal;
window.getPreviousScreen = () => previousScreen;
window.setPreviousScreen = (name) => { previousScreen = name; };


// Регистрация Service Worker для PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/habit-tracker/service-worker.js')
            .then((reg) => console.log('SW зарегистрирован:', reg.scope))
            .catch((err) => console.warn('SW регистрация не удалась:', err));
    });
}