/*
 * Day Detail — past-day habit editing sheet.
 */

let _dayKey = null;
let _dayLabel = null;
let _editHabitId = null;
let _editValue = 0;


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

        const controls = `
            <button class="habit-check ${isDone ? 'habit-check-done' : ''}" data-action="day-habit-toggle">
                <span class="habit-check-circle">${isDone ? '<img src="icons/check.svg" alt="Done">' : ''}</span>
            </button>`;

        if (habit.type === 'counter') {
            return `
                <li class="day-habit${isDone ? ' day-habit-done' : ''}" data-habit-id="${habit.id}">
                    <button class="day-counter-edit-area" data-action="day-counter-edit">
                        <div class="habit-icon" style="background-color: ${bgColor};">${habit.icon}</div>
                        <div class="habit-info">
                            <h3 class="habit-name">${render.escapeHtml(habit.name)}</h3>
                            <p class="habit-streak day-counter-streak-row">
                                <span>${value} / ${target}${habit.unit ? render.escapeHtml(habit.unit) : ''}</span>
                                <img src="icons/edit.svg" alt="" class="day-counter-edit-icon">
                            </p>
                        </div>
                    </button>
                    ${controls}
                </li>
            `;
        }

        return `
            <li class="day-habit${isDone ? ' day-habit-done' : ''}" data-habit-id="${habit.id}">
                <div class="habit-icon" style="background-color: ${bgColor};">${habit.icon}</div>
                <div class="habit-info">
                    <h3 class="habit-name">${render.escapeHtml(habit.name)}</h3>
                </div>
                ${controls}
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
        const streakSpan = li.querySelector('.day-counter-streak-row span');
        if (streakSpan) streakSpan.textContent = `${value} / ${target}${habit.unit ? habit.unit : ''}`;
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


function openCounterEdit(habitId) {
    const habit = storage.getHabit(habitId);
    if (!habit) return;

    _editHabitId = habitId;
    const entry = habit.entries[_dayKey];
    _editValue = typeof entry === 'number' ? entry : 0;

    const overlay = document.querySelector('[data-overlay="counter-edit"]');
    if (!overlay) return;

    const step = habit.step || 1;
    overlay.querySelector('.counter-edit-name').textContent = habit.name;
    overlay.querySelector('.counter-edit-btn-minus').textContent = `−${step}`;
    overlay.querySelector('.counter-edit-btn-plus').textContent = `+${step}`;
    overlay.querySelector('.counter-edit-hint').textContent = `/ ${habit.target}${habit.unit || ''}`;

    _refreshEditDisplay(overlay, habit);
    overlay.hidden = false;
}

function _refreshEditDisplay(overlay, habit) {
    const target = habit.target || 1;
    const isOverLimit = !!habit.limitMode && _editValue > target;

    const valEl = overlay.querySelector('.counter-edit-value');
    if (valEl) {
        valEl.textContent = _editValue;
        valEl.style.color = isOverLimit ? 'var(--status-red)' : '';
    }

    const minusBtn = overlay.querySelector('.counter-edit-btn-minus');
    if (minusBtn) minusBtn.disabled = _editValue <= 0;
}

function changeEditValue(delta) {
    const habit = storage.getHabit(_editHabitId);
    if (!habit) return;

    const step = habit.step || 1;
    _editValue = Math.max(0, _editValue + delta * step);

    const overlay = document.querySelector('[data-overlay="counter-edit"]');
    if (overlay) _refreshEditDisplay(overlay, habit);

    if (navigator.vibrate) navigator.vibrate(5);
}

function saveCounterEdit() {
    if (!_editHabitId) return;

    storage.setEntry(_editHabitId, _dayKey, _editValue === 0 ? null : _editValue);
    _updateDayHabitEl(_editHabitId);
    _refreshMeta();
    render.refreshMoods();
    closeCounterEdit();
}

function closeCounterEdit() {
    const overlay = document.querySelector('[data-overlay="counter-edit"]');
    if (overlay) overlay.hidden = true;
    _editHabitId = null;
    _editValue = 0;
}


window.dayDetail = {
    open: openDayDetail,
    toggle: toggleHabitForDay,
    openEdit: openCounterEdit,
    changeEditValue,
    saveEdit: saveCounterEdit,
    closeEdit: closeCounterEdit,
};
