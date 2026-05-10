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


function renderDayList() {
    const sheet = document.querySelector('[data-sheet="day-detail"]');
    if (!sheet) return;

    const titleEl = sheet.querySelector('.day-detail-title');
    if (titleEl) titleEl.textContent = _dayLabel;

    const habits = storage.getHabits().filter(h => !h.archived);
    const [y, m, d] = _dayKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayKey = dayKeys[date.getDay()];

    const scheduled = habits.filter(habit => {
        if (render.isInPauseWindow(habit, date)) return false;
        const created = render.parseLocalDate(habit.createdAt);
        if (date < created) return false;
        return habit.schedule.includes(dayKey);
    });

    let doneCount = 0;
    scheduled.forEach(h => {
        const entry = h.entries[_dayKey];
        const target = h.target || 1;
        if (entry === 'done' || (typeof entry === 'number' && entry >= target)) doneCount++;
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
        const isDone = entry === 'done' || (typeof entry === 'number' && entry >= target);
        const bgColor = pickers.colorToBg(habit.color);
        const value = typeof entry === 'number' ? entry : 0;
        const subtitle = habit.type === 'counter'
            ? `<p class="habit-streak">${value} / ${target}${habit.unit ? ' ' + render.escapeHtml(habit.unit) : ''}</p>`
            : '';

        return `
            <li class="day-habit${isDone ? ' day-habit-done' : ''}" data-habit-id="${habit.id}">
                <div class="habit-icon" style="background-color: ${bgColor};">${habit.icon}</div>
                <div class="habit-info">
                    <h3 class="habit-name">${render.escapeHtml(habit.name)}</h3>
                    ${subtitle}
                </div>
                <button class="habit-check ${isDone ? 'habit-check-done' : ''}" data-action="day-habit-toggle">
                    <span class="habit-check-circle">${isDone ? '<img src="icons/check.svg" alt="Done">' : ''}</span>
                </button>
            </li>
        `;
    }).join('');
}


function toggleHabitForDay(habitId) {
    const habit = storage.getHabit(habitId);
    if (!habit) return;

    const entry = habit.entries[_dayKey];
    const target = habit.target || 1;
    const isDone = habit.type === 'binary'
        ? entry === 'done'
        : (typeof entry === 'number' && entry >= target);

    if (isDone) {
        storage.setEntry(habitId, _dayKey, null);
    } else {
        storage.setEntry(habitId, _dayKey, habit.type === 'binary' ? 'done' : target);
    }

    if (navigator.vibrate) navigator.vibrate(10);
    renderDayList();
    render.refreshMoods();
}


window.dayDetail = {
    open: openDayDetail,
    toggle: toggleHabitForDay,
};
