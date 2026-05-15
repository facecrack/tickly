/*
 * Habits — операции над существующими привычками.
 */


function getEffectiveTarget(habit, dateString) {
    return habit.dailyOverrides?.[dateString] ?? (habit.target || 1);
}


function toggleHabit(habitId) {
    const habit = storage.getHabit(habitId);
    if (!habit || habit.type !== 'binary') return;

    const today = storage.getTodayString();

    if (habit.paused) {
        storage.updateHabit(habitId, { paused: false, resumedAt: today });
        storage.setEntry(habitId, today, 'done');
        if (navigator.vibrate) navigator.vibrate(10);
        render.updateBinary(habitId);
        return;
    }

    const current = habit.entries[today];

    if (current === 'done') {
        storage.setEntry(habitId, today, null);
    } else {
        storage.setEntry(habitId, today, 'done');
        if (navigator.vibrate) navigator.vibrate(10);
    }

    render.updateBinary(habitId);
}


function changeCounter(habitId, delta) {
    const habit = storage.getHabit(habitId);
    if (!habit || habit.type !== 'counter') return;

    if (habit.paused) {
        storage.updateHabit(habitId, {
            paused: false,
            resumedAt: storage.getTodayString()
        });
    }

    const today = storage.getTodayString();
    const raw = habit.entries[today];

    const current = typeof raw === 'number' ? raw : 0;
    const step = habit.step || 1;
    const target = getEffectiveTarget(habit, today);

    let newValue = current + (delta * step);
    if (newValue < 0) newValue = 0;

    const goalJustReached = !habit.limitMode && newValue >= target && current < target;

    if (newValue === 0) {
        storage.setEntry(habitId, today, null);
    } else {
        storage.setEntry(habitId, today, newValue);
    }

    // Update only the changed card — preserves DOM so touch events stay intact
    render.updateCounter(habitId);
    render.refreshMoods();

    if (navigator.vibrate) {
        navigator.vibrate(goalJustReached ? [10, 40, 10] : 5);
    }

    requestAnimationFrame(() => {
        const card = document.querySelector(`[data-screen="main"] [data-habit-id="${habitId}"]`);
        if (!card) return;
        card.classList.add('counter-bump');
        setTimeout(() => card.classList.remove('counter-bump'), 250);
    });
}


function deleteHabit(habitId) {
    storage.deleteHabit(habitId);
    render.main();
}


function archiveHabit(habitId) {
    storage.updateHabit(habitId, { archived: true });
    render.main();
    const s = storage.getSettings();
    if (!s.archiveTipShown) {
        storage.updateSettings({ archiveTipShown: true });
        showAlert('archive-tip');
    }
}


function restoreHabit(habitId) {
    storage.updateHabit(habitId, { archived: false });
    const remaining = storage.getHabits().filter((h) => h.archived);
    if (remaining.length === 0) {
        settings.render();
        showScreen('settings');
    } else {
        settings.renderArchived();
    }
}


function pauseHabit(habitId) {
    storage.updateHabit(habitId, {
        paused: true,
        pausedAt: storage.getTodayString(),
        resumedAt: null
    });
    detail.open(habitId);
}


function resumeHabit(habitId) {
    storage.updateHabit(habitId, {
        paused: false,
        resumedAt: storage.getTodayString()
    });
    detail.open(habitId);
}


// ============================================
// LONG-PRESS REPEAT — удержание +/−
// ============================================

let _holdTimer = null;
let _holdInterval = null;
let _longPressActive = false;
let _holdStartX = 0;
let _holdStartY = 0;

function initCounterRepeat() {
    document.addEventListener('touchstart', (e) => {
        const btn = e.target.closest('.counter-btn-plus, .counter-btn-minus, .counter-edit-btn-plus, .counter-edit-btn-minus');
        if (!btn) return;
        const isEdit = btn.classList.contains('counter-edit-btn-plus') || btn.classList.contains('counter-edit-btn-minus');
        const delta = (btn.classList.contains('counter-btn-plus') || btn.classList.contains('counter-edit-btn-plus')) ? 1 : -1;

        let habitId = null;
        if (!isEdit) {
            const li = btn.closest('[data-habit-id]');
            if (!li) return;
            habitId = li.dataset.habitId;
        }

        const doChange = () => isEdit ? dayDetail.changeEditValue(delta) : changeCounter(habitId, delta);

        _stopHold();
        _longPressActive = false;
        _holdStartX = e.touches[0].clientX;
        _holdStartY = e.touches[0].clientY;

        _holdTimer = setTimeout(() => {
            _holdTimer = null;
            _longPressActive = true;
            _holdInterval = setInterval(doChange, 150);
        }, 500);
    }, { passive: true });

    document.addEventListener('touchend', _stopHold, { passive: true });
    document.addEventListener('touchcancel', _stopHold, { passive: true });

    // Only cancel on significant movement (>10px) — ignore natural finger tremor
    document.addEventListener('touchmove', (e) => {
        if (!_holdTimer && !_holdInterval) return;
        const t = e.touches[0];
        if (Math.hypot(t.clientX - _holdStartX, t.clientY - _holdStartY) > 10) {
            _stopHold();
        }
    }, { passive: true });

    // Suppress the synthetic click after a completed long-press
    document.addEventListener('click', (e) => {
        if (_longPressActive) {
            _longPressActive = false;
            e.stopPropagation();
        }
    }, true);
}

function _stopHold() {
    if (_holdTimer) { clearTimeout(_holdTimer); _holdTimer = null; }
    if (_holdInterval) { clearInterval(_holdInterval); _holdInterval = null; }
}


// ============================================
// ДОСТУПНОСТЬ
// ============================================

window.habits = {
    toggle: toggleHabit,
    changeCounter: changeCounter,
    deleteHabit: deleteHabit,
    pause: pauseHabit,
    resume: resumeHabit,
    archive: archiveHabit,
    restore: restoreHabit,
    initRepeat: initCounterRepeat,
    getEffectiveTarget
};