/*
 * Render — модуль рендеринга экранов из данных.
 */


function renderMainScreen() {
    const habits = storage.getHabits().filter((h) => !h.archived);

    if (habits.length === 0) {
        renderEmptyDate();
        showScreen('main-empty');
        return;
    }

    renderMainDate();
    renderLast5Days(habits);
    showScreen('main');

    const scrollY = window.scrollY;

    const counters = habits.filter((h) => h.type === 'counter');
    const binaries = habits.filter((h) => h.type === 'binary');

    renderCounters(counters);
    renderBinaries(binaries);

    requestAnimationFrame(() => window.scrollTo(0, scrollY));
}

function renderLast5Days(habits) {
    const screen = document.querySelector('[data-screen="main"]');
    const daysList = screen.querySelector('.week-days');
    const moodsList = screen.querySelector('.week-moods');
    if (!daysList || !moodsList) return;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 4; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        days.push({
            date: d,
            key: formatDateKey(d),
            name: dayNames[d.getDay()],
            number: d.getDate(),
            dayKey: dayKeys[d.getDay()],
            isToday: i === 0
        });
    }

    daysList.innerHTML = days.map((d) => `
        <li class="day ${d.isToday ? 'day-today' : ''}">
            <span class="day-name">${d.name}</span>
            <span class="day-number">${d.number}</span>
        </li>
    `).join('');

    moodsList.innerHTML = days.map((d) => {
        const mood = calculateDayMood(habits, d);
        if (mood === null) {
            return `<li class="mood mood-rest" aria-label="Rest day"></li>`;
        }
        const file = moodFile(mood.percent);
        const label = moodLabel(mood.percent);
        const tipText = `${mood.done}/${mood.scheduled} habit${mood.scheduled !== 1 ? 's' : ''}`;
        return `<li class="mood" data-action="mood-tap" data-mood-label="${tipText}" data-date="${d.name}"><img src="moods/${file}" alt="${label}"></li>`;
    }).join('');
}


// Возвращает {percent, done, scheduled} или null если день без привычек
function calculateDayMood(habits, day) {
    let scheduled = 0;
    let done = 0;

    habits.forEach((habit) => {
        if (isInPauseWindow(habit, day.date)) return;
        const created = parseLocalDate(habit.createdAt);
        if (day.date < created) return;
        if (!habit.schedule.includes(day.dayKey)) return;

        const entry = habit.entries[day.key];
        const isSkipped = entry === 'Skipped';
        if (isSkipped) return;

        scheduled++;
        const target = habit.target || 1;
        const isDone = entry === 'done' || (typeof entry === 'number' && entry >= target);
        if (isDone) done++;
    });

    if (scheduled === 0) return null;
    return { percent: Math.round((done / scheduled) * 100), done, scheduled };
}


function moodFile(percent) {
    if (percent <= 25) return 'mood-bad.svg';
    if (percent <= 50) return 'mood-soso.svg';
    if (percent <= 75) return 'mood-ok.svg';
    return 'mood-great.svg';
}


function moodLabel(percent) {
    if (percent <= 25) return 'Bad day';
    if (percent <= 50) return 'So-so day';
    if (percent <= 75) return 'OK day';
    return 'Great day';
}


// Парсит "YYYY-MM-DD" как локальную дату
function parseLocalDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
}


// Проверяет, попадает ли дата в период паузы привычки
function isInPauseWindow(habit, date) {
    if (!habit.pausedAt) return false;
    const pausedFrom = parseLocalDate(habit.pausedAt);
    if (date < pausedFrom) return false;
    if (habit.paused) return true;
    if (habit.resumedAt) return date < parseLocalDate(habit.resumedAt);
    return false;
}


function renderMainDate() {
    const date = new Date();
    const formatted = date.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
    });
    const el = document.querySelector('[data-screen="main"] .main-date');
    if (el) el.textContent = formatted;
}


function renderEmptyDate() {
    const date = new Date();
    const formatted = date.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
    });
    const el = document.querySelector('[data-screen="main-empty"] .empty-date');
    if (el) el.textContent = formatted;
}


function renderCounters(counters) {
    const section = document.querySelector('[data-screen="main"] .counters');
    const list = document.querySelector('[data-screen="main"] .counters-list');
    const meta = document.querySelector('[data-screen="main"] .counters .section-meta');

    const todayDayKey = getTodayDayKey();
    const scheduled = counters.filter(h => h.schedule.includes(todayDayKey));

    if (scheduled.length === 0) {
        section.hidden = true;
        return;
    }
    section.hidden = false;

    const activeCount = scheduled.filter(h => !h.paused).length;
    meta.textContent = `${activeCount} ${activeCount === 1 ? 'counter' : 'counters'}`;

    const todayKey = storage.getTodayString();

    list.innerHTML = scheduled.map((habit) => {
        const rawValue = habit.entries[todayKey];
        const isSkipped = rawValue === 'Skipped';
        const value = typeof rawValue === 'number' ? rawValue : 0;
        const target = habit.target || 1;

        if (habit.paused) {
            return `
                <li class="counter counter-paused" data-habit-id="${habit.id}" data-action="open-detail">
                    <header class="counter-header">
                        <div class="counter-icon" style="background-color: ${pickers.colorToBg(habit.color)};">${habit.icon}</div>
                        <h3 class="counter-name">${escapeHtml(habit.name)}</h3>
                    </header>
                    <div class="counter-progress">
                        <span class="counter-value counter-value-skipped">Paused</span>
                        <span class="counter-target">/ ${target}${habit.unit ? ' ' + escapeHtml(habit.unit) : ''}</span>
                    </div>
                    <div class="counter-bar">
                        <div class="counter-bar-fill" style="width: 0%;"></div>
                    </div>
                    <div class="counter-buttons">
                        <button class="counter-btn counter-btn-minus" data-action="counter-decrement">
                            <img src="icons/minus.svg" alt="Decrease">
                        </button>
                        <span class="counter-step">×${habit.step || 1}</span>
                        <button class="counter-btn counter-btn-plus" data-action="counter-increment">
                            <img src="icons/plus.svg" alt="Increase">
                        </button>
                    </div>
                </li>
            `;
        }

        const percent = isSkipped ? 0 : Math.min(100, (value / target) * 100);
        const displayValue = isSkipped ? 'Skipped' : value;
        const valueClass = isSkipped ? 'counter-value counter-value-skipped' : 'counter-value';
        const isComplete = !isSkipped && value >= target;
        const stateClass = isComplete ? 'counter-done' : isSkipped ? 'counter-skipped' : '';

        return `
            <li class="counter ${stateClass}" data-habit-id="${habit.id}" data-action="open-detail">
                <header class="counter-header">
                    <div class="counter-icon" style="background-color: ${pickers.colorToBg(habit.color)};">${habit.icon}</div>
                    <h3 class="counter-name">${escapeHtml(habit.name)}</h3>
                </header>

                <div class="counter-progress">
                    <span class="${valueClass}">${displayValue}</span>
                    <span class="counter-target">/ ${target}${habit.unit ? ' ' + escapeHtml(habit.unit) : ''}</span>
                </div>

                <div class="counter-bar">
                    <div class="counter-bar-fill" style="width: ${percent}%;"></div>
                </div>

                <div class="counter-buttons">
                    <button class="counter-btn counter-btn-minus" data-action="counter-decrement">
                        <img src="icons/minus.svg" alt="Decrease">
                    </button>
                    <span class="counter-step">×${habit.step || 1}</span>
                    <button class="counter-btn counter-btn-plus" data-action="counter-increment">
                        <img src="icons/plus.svg" alt="Increase">
                    </button>
                </div>
            </li>
        `;
    }).join('');
}


function renderBinaries(binaries) {
    const section = document.querySelector('[data-screen="main"] .today');
    const list = document.querySelector('[data-screen="main"] .today-list');
    const meta = document.querySelector('[data-screen="main"] .today .section-meta');

    // Фильтруем только привычки, запланированные на сегодня
    const todayDayKey = getTodayDayKey();
    const scheduled = binaries.filter((h) => h.schedule.includes(todayDayKey));

    if (scheduled.length === 0) {
        section.hidden = true;
        return;
    }
    section.hidden = false;

    const todayKey = storage.getTodayString();

    const activeScheduled = scheduled.filter((h) => !h.paused);
    const doneCount = activeScheduled.filter((h) => h.entries[todayKey] === 'done').length;
    meta.textContent = `${doneCount} of ${activeScheduled.length} done`;

    list.innerHTML = scheduled.map((habit) => {
        if (habit.paused) {
            return `
                <li class="habit habit-paused" data-habit-id="${habit.id}" data-action="open-detail">
                    <div class="habit-icon" style="background-color: ${pickers.colorToBg(habit.color)};">${habit.icon}</div>
                    <div class="habit-info">
                        <h3 class="habit-name">${escapeHtml(habit.name)}</h3>
                        <p class="habit-streak">Paused</p>
                    </div>
                    <button class="habit-check" data-action="habit-toggle">
                        <span class="habit-check-circle"></span>
                    </button>
                </li>
            `;
        }

        const todayEntry = habit.entries[todayKey];
        const isDone = todayEntry === 'done';
        const isSkipped = todayEntry === 'Skipped';
        const streak = calculateStreak(habit);

        const stateClass = isDone ? 'habit-done' : isSkipped ? 'habit-skipped' : '';
        const subLabel = isSkipped ? '<p class="habit-streak">Skipped</p>' : streak > 0 ? `<p class="habit-streak">${streak} day streak</p>` : '';

        return `
            <li class="habit ${stateClass}" data-habit-id="${habit.id}" data-action="open-detail">
                <div class="habit-icon" style="background-color: ${pickers.colorToBg(habit.color)};">${habit.icon}</div>
                <div class="habit-info">
                    <h3 class="habit-name">${escapeHtml(habit.name)}</h3>
                    ${subLabel}
                </div>
                <button class="habit-check ${isDone ? 'habit-check-done' : ''}" data-action="habit-toggle">
                    <span class="habit-check-circle">${isDone ? '<img src="icons/check.svg" alt="Done">' : ''}</span>
                </button>
            </li>
        `;
    }).join('');
}


function calculateStreak(habit) {
    let streak = 0;
    const today = new Date();
    const target = habit.target || 1;
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    const todayEntry = habit.entries[formatDateKey(today)];
    const todayDone = todayEntry === 'done' || (typeof todayEntry === 'number' && todayEntry >= target);
    const startOffset = todayDone ? 0 : 1;

    for (let i = startOffset; i < 365; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        const dayKey = dayKeys[date.getDay()];
        if (!habit.schedule.includes(dayKey)) continue;
        if (isInPauseWindow(habit, date)) continue;

        const key = formatDateKey(date);
        const entry = habit.entries[key];
        const isSkipped = entry === 'Skipped';
        const isDone = entry === 'done' || (typeof entry === 'number' && entry >= target);

        if (isDone || isSkipped) {
            if (isDone) streak++;
        } else {
            break;
        }
    }

    return streak;
}


function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTodayDayKey() {
    const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const today = new Date();
    return dayKeys[(today.getDay() + 6) % 7];
}


function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


function updateBinary(habitId) {
    const habit = storage.getHabit(habitId);
    if (!habit) return;

    const li = document.querySelector(`[data-screen="main"] [data-habit-id="${habitId}"]`);
    if (!li) return;

    const today = storage.getTodayString();
    const todayEntry = habit.entries[today];
    const isDone = todayEntry === 'done';
    const isSkipped = todayEntry === 'Skipped';
    const streak = calculateStreak(habit);

    li.className = `habit${isDone ? ' habit-done' : isSkipped ? ' habit-skipped' : ''}`;

    const checkBtn = li.querySelector('.habit-check');
    if (checkBtn) {
        checkBtn.className = `habit-check${isDone ? ' habit-check-done' : ''}`;
        const circle = checkBtn.querySelector('.habit-check-circle');
        if (circle) circle.innerHTML = isDone ? '<img src="icons/check.svg" alt="Done">' : '';
    }

    const infoEl = li.querySelector('.habit-info');
    if (infoEl) {
        let streakEl = infoEl.querySelector('.habit-streak');
        if (isSkipped) {
            if (!streakEl) {
                streakEl = document.createElement('p');
                streakEl.className = 'habit-streak';
                infoEl.appendChild(streakEl);
            }
            streakEl.textContent = 'Skipped';
        } else if (streak > 0) {
            if (!streakEl) {
                streakEl = document.createElement('p');
                streakEl.className = 'habit-streak';
                infoEl.appendChild(streakEl);
            }
            streakEl.textContent = `${streak} day streak`;
        } else if (streakEl) {
            streakEl.remove();
        }
    }

    const meta = document.querySelector('[data-screen="main"] .today .section-meta');
    if (meta) {
        const allHabits = storage.getHabits().filter((h) => !h.archived);
        const todayDayKey = getTodayDayKey();
        const scheduled = allHabits.filter(h => h.type === 'binary' && h.schedule.includes(todayDayKey) && !h.paused);
        const doneCount = scheduled.filter(h => h.entries[today] === 'done').length;
        meta.textContent = `${doneCount} of ${scheduled.length} done`;
    }

    renderLast5Days(storage.getHabits().filter((h) => !h.archived));
}


function updateCounter(habitId) {
    const habit = storage.getHabit(habitId);
    if (!habit) return;

    const li = document.querySelector(`[data-screen="main"] [data-habit-id="${habitId}"]`);
    if (!li) return;

    const today = storage.getTodayString();
    const rawValue = habit.entries[today];
    const isSkipped = rawValue === 'Skipped';
    const value = typeof rawValue === 'number' ? rawValue : 0;
    const target = habit.target || 1;
    const percent = isSkipped ? 0 : Math.min(100, (value / target) * 100);
    const isComplete = !isSkipped && value >= target;

    const valueEl = li.querySelector('.counter-value');
    if (valueEl) {
        if (habit.paused) {
            valueEl.textContent = 'Paused';
            valueEl.className = 'counter-value counter-value-skipped';
        } else {
            valueEl.textContent = isSkipped ? 'Skipped' : value;
            valueEl.className = isSkipped ? 'counter-value counter-value-skipped' : 'counter-value';
        }
    }

    const fill = li.querySelector('.counter-bar-fill');
    if (fill) fill.style.width = (isSkipped || habit.paused ? 0 : percent) + '%';

    li.classList.toggle('counter-done', isComplete && !habit.paused);
    li.classList.toggle('counter-skipped', isSkipped && !isComplete && !habit.paused);
    li.classList.toggle('counter-paused', !!habit.paused);
}


let _tooltipTimer = null;

function hideMoodTooltip() {
    const tip = document.getElementById('mood-tooltip');
    if (tip) tip.classList.remove('mood-tooltip-visible');
    clearTimeout(_tooltipTimer);
    window.removeEventListener('scroll', hideMoodTooltip);
}

function showMoodTooltip(anchor, text) {
    let tip = document.getElementById('mood-tooltip');
    if (!tip) {
        tip = document.createElement('div');
        tip.id = 'mood-tooltip';
        tip.className = 'mood-tooltip';
        document.body.appendChild(tip);
    }
    tip.textContent = text;
    const rect = anchor.getBoundingClientRect();
    tip.style.left = (rect.left + rect.width / 2) + 'px';
    tip.style.top = rect.top + 'px';
    tip.classList.add('mood-tooltip-visible');
    clearTimeout(_tooltipTimer);
    _tooltipTimer = setTimeout(hideMoodTooltip, 2500);
    window.addEventListener('scroll', hideMoodTooltip, { once: true, passive: true });
}


window.render = {
    main: renderMainScreen,
    counters: renderCounters,
    binaries: renderBinaries,
    updateBinary: updateBinary,
    updateCounter: updateCounter,
    showMoodTooltip: showMoodTooltip,
    hideMoodTooltip: hideMoodTooltip
};