/*
 * Habits — операции над существующими привычками.
 */


function toggleHabit(habitId) {
    const habit = storage.getHabit(habitId);
    if (!habit || habit.type !== 'binary') return;

    const today = storage.getTodayString();
    const current = habit.entries[today];

    if (current === 'done') {
        storage.setEntry(habitId, today, null);
    } else {
        storage.setEntry(habitId, today, 'done');
    }

    render.main();
}


function changeCounter(habitId, delta) {
    const habit = storage.getHabit(habitId);
    if (!habit || habit.type !== 'counter') return;

    const today = storage.getTodayString();
    const raw = habit.entries[today];

    const current = typeof raw === 'number' ? raw : 0;
    const step = habit.step || 1;

    let newValue = current + (delta * step);
    if (newValue < 0) newValue = 0;

    if (newValue === 0) {
        storage.setEntry(habitId, today, null);
    } else {
        storage.setEntry(habitId, today, newValue);
    }

    render.main();

    // Bump анимация на изменённой карточке
    requestAnimationFrame(() => {
        const card = document.querySelector(`[data-habit-id="${habitId}"]`);
        if (card) {
            card.classList.add('counter-bump');
            setTimeout(() => card.classList.remove('counter-bump'), 250);
        }
    });
}


function skipToday(habitId) {
    const habit = storage.getHabit(habitId);
    if (!habit) return;

    const today = storage.getTodayString();
    storage.setEntry(habitId, today, 'Skipped');

    // Перерендериваем deteail если открыт
    if (typeof detail !== 'undefined' && detail.currentId() === habitId) {
        detail.open(habitId);
    }
}


function deleteHabit(habitId) {
    storage.deleteHabit(habitId);
    render.main();
}


// ============================================
// ДОСТУПНОСТЬ
// ============================================

window.habits = {
    toggle: toggleHabit,
    changeCounter: changeCounter,
    skipToday: skipToday,
    deleteHabit: deleteHabit
};