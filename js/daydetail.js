/*
 * Day Detail — past-day habit editing sheet.
 */

let _dayKey = null;
let _dayLabel = null;


function openDayDetail(dateKey, dateLabel) {
    _dayKey = dateKey;
    _dayLabel = dateLabel;
    renderDayList();
    showSheet('day-detail');
}


function _getScheduled() {
    const habits = storage.getHabits().filter(h => !h.archived);
    const [y, m, d] = _dayKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayKey = dayKeys[date.getDay()];
    return { habits: habits.filter(habit => {
        if (render.isInPauseWindow(habit, date)) return false;
        const created = render.parseLocalDate(habit.createdAt);
        if (date < created) return false;
        return habit.schedule.includes(dayKey);
    }), date };
}


function _refreshMeta() {
    const sheet = document.querySelector('[data-sheet="day-detail"]');
    if (!sheet) return;
    const { habits: scheduled } = _getScheduled();
    let doneCount = 0;
    scheduled.forEach(h => {
        const entry = h.entries[_dayKey];
        const target = h.target || 1;
        const isDone = h.limitMode
            ? (typeof entry === 'number' && entry > 0 && entry <= target)
            : (entry === 'done' || (typeof entry === 'number' && entry >= target));
        if (isDone) doneCount++;
    });
    const meta = sheet.querySelector('.day-detail-meta');
    if (meta) meta.textContent = `${doneCount} of ${scheduled.length} done`;
}


function renderDayList() {
    const sheet = document.querySelector('[data-sheet="day-detail"]');
    if (!sheet) return;

    const titleEl = sheet.querySelector('.day-detail-title');
    if (titleEl) titleEl.textContent = _dayLabel;

    const { habits: scheduled } = _getScheduled();

    let doneCount = 0;
    scheduled.forEach(h => {
        const entry = h.entries[_dayKey];
        const target = h.target || 1;
        const isDone = h.limitMode
            ? (typeof entry === 'number' && entry > 0 && entry <= target)
            : (entry === 'done' || (typeof entry === 'number' && entry >= target));
        if (isDone) doneCount++;
    });

    const meta = sheet.querySelector('.day-detail-meta');
    if (meta) meta.textContent = `${doneCount} of ${scheduled.length} done`;

    const list = sheet.querySelector('.day-detail-list');
    if (!list) return;

    if (scheduled.length === 0) {
        list.innerHTML = '<li class="day-detail-empty">No habits scheduled</li>';
        return;
    }

    list.innerHTML = scheduled.map(habit => {
        const entry = habit.entries[_dayKey];
        const target = habit.target || 1;
        const isDone = habit.limitMode
            ? (typeof entry === 'number' && entry > 0 && entry <= target)
            : (entry === 'done' || (typeof entry === 'number' && entry >= target));
        // Grey habits blend into --bg-elevated item background — use light overlay instead
        const bgColor = habit.color === '#353535'
            ? 'rgba(255, 255, 255, 0.1)'
            : pickers.colorToBg(habit.color);
        const value = typeof entry === 'number' ? entry : 0;

        if (habit.type === 'counter') {
            return `
                <li class="day-habit${isDone ? ' day-habit-done' : ''}" data-habit-id="${habit.id}">
                    <div class="habit-icon" style="background-color: ${bgColor};">${habit.icon}</div>
                    <div class="habit-info">
                        <h3 class="habit-name">${render.escapeHtml(habit.name)}</h3>
                        <p class="habit-streak">${value} / ${target}${habit.unit ? render.escapeHtml(habit.unit) : ''}</p>
                    </div>
                    <div class="day-counter-controls">
                        <button class="day-counter-btn day-counter-btn-minus" data-action="day-counter-decrement"${value <= 0 ? ' disabled' : ''}>−</button>
                        <button class="day-counter-btn day-counter-btn-plus" data-action="day-counter-increment">+</button>
                    </div>
                </li>
            `;
        }

        return `
            <li class="day-habit${isDone ? ' day-habit-done' : ''}" data-habit-id="${habit.id}">
                <div class="habit-icon" style="background-color: ${bgColor};">${habit.icon}</div>
                <div class="habit-info">
                    <h3 class="habit-name">${render.escapeHtml(habit.name)}</h3>
                </div>
                <button class="habit-check ${isDone ? 'habit-check-done' : ''}" data-action="day-habit-toggle">
                    <span class="habit-check-circle">${isDone ? '<img src="icons/check.svg" alt="Done">' : ''}</span>
                </button>
            </li>
        `;
    }).join('');
}


function _updateDayHabitEl(habitId) {
    const habit = storage.getHabit(habitId);
    if (!habit) return;

    const li = document.querySelector(`[data-sheet="day-detail"] [data-habit-id="${habitId}"]`);
    if (!li) return;

    const entry = habit.entries[_dayKey];
    const target = habit.target || 1;
    const isDone = habit.limitMode
        ? (typeof entry === 'number' && entry > 0 && entry <= target)
        : (entry === 'done' || (typeof entry === 'number' && entry >= target));

    li.className = `day-habit${isDone ? ' day-habit-done' : ''}`;

    const checkBtn = li.querySelector('.habit-check');
    if (checkBtn) {
        checkBtn.className = `habit-check${isDone ? ' habit-check-done' : ''}`;
        const circle = checkBtn.querySelector('.habit-check-circle');
        if (circle) circle.innerHTML = isDone ? '<img src="icons/check.svg" alt="Done">' : '';
    }

    if (habit.type === 'counter') {
        const value = typeof entry === 'number' ? entry : 0;
        const streakEl = li.querySelector('.habit-streak');
        if (streakEl) streakEl.textContent = `${value} / ${target}${habit.unit ? habit.unit : ''}`;
        const minusBtn = li.querySelector('.day-counter-btn-minus');
        if (minusBtn) minusBtn.disabled = value <= 0;
    }
}


function toggleHabitForDay(habitId) {
    const habit = storage.getHabit(habitId);
    if (!habit) return;

    const entry = habit.entries[_dayKey];
    const target = habit.target || 1;
    const isDone = habit.type === 'binary'
        ? entry === 'done'
        : habit.limitMode
            ? (typeof entry === 'number' && entry > 0 && entry <= target)
            : (typeof entry === 'number' && entry >= target);

    if (isDone) {
        storage.setEntry(habitId, _dayKey, null);
    } else {
        storage.setEntry(habitId, _dayKey, habit.type === 'binary' ? 'done' : target);
    }

    if (navigator.vibrate) navigator.vibrate(10);
    _updateDayHabitEl(habitId);
    _refreshMeta();
    render.refreshMoods();
}


function changeCounterForDay(habitId, delta) {
    const habit = storage.getHabit(habitId);
    if (!habit) return;

    const entry = habit.entries[_dayKey];
    const current = typeof entry === 'number' ? entry : 0;
    const next = Math.max(0, current + delta);

    storage.setEntry(habitId, _dayKey, next === 0 ? null : next);

    if (navigator.vibrate) navigator.vibrate(10);
    _updateDayHabitEl(habitId);
    _refreshMeta();
    render.refreshMoods();
}


window.dayDetail = {
    open: openDayDetail,
    toggle: toggleHabitForDay,
    changeCounter: changeCounterForDay,
};
