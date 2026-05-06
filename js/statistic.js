/*
 * Statistic — рендеринг статистики (Weekly + Overall).
 */


let activeStatTab = 'weekly';


function openStatistic() {
    const saved = storage.getSettings().lastStatTab || 'weekly';
    activeStatTab = saved;
    showScreen('statistic');
    setStatTab(saved);
}


function setStatTab(tab) {
    if (tab !== 'weekly' && tab !== 'overall') return;
    activeStatTab = tab;
    storage.updateSettings({ lastStatTab: tab });

    const screen = document.querySelector('[data-screen="statistic"]');
    screen.querySelectorAll('.stat-tab').forEach((btn) => {
        btn.classList.toggle('stat-tab-active', btn.dataset.tab === tab);
    });
    screen.querySelectorAll('.stat-section').forEach((sec) => {
        sec.hidden = sec.dataset.statSection !== tab;
    });

    renderStatistic();
}


function renderStatistic() {
    if (activeStatTab === 'weekly') {
        renderStatWeekly();
    } else {
        renderStatOverall();
    }
}


// ============================================
// WEEKLY
// ============================================

function renderStatWeekly() {
    const habits = storage.getHabits().filter((h) => !h.archived);
    const list = document.querySelector('.stat-weekly-list');
    if (!list) return;

    if (habits.length === 0) {
        list.innerHTML = '<p style="color: var(--text-secondary); padding: 24px; text-align: center;">No habits yet</p>';
        return;
    }

    list.innerHTML = habits.map((habit) => renderStatWeeklyCard(habit)).join('');
}


function renderStatWeeklyCard(habit) {
    const streak = calculateStreak(habit);
    const days = getCurrentWeekDays();
    const todayKey = storage.getTodayString();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const created = parseLocalDate(habit.createdAt);

    const dayCircles = days.map((day) => {
        const entry = habit.entries[day.key];
        const isToday = day.key === todayKey;
        const isHabitDay = habit.schedule.includes(day.dayKey);
        const dayDate = day.date;
        const isBeforeCreated = dayDate < created;
        const isFuture = dayDate > today;
        const isDone = entry === 'done' || (typeof entry === 'number' && entry >= (habit.target || 1));
        const isSkipped = entry === 'Skipped';
        const isPaused = isInPauseWindow(habit, dayDate) && isHabitDay && !isFuture && !isBeforeCreated;
        const isMissed = isHabitDay && !isDone && !isSkipped && !isPaused && !isFuture && !isBeforeCreated && !isToday;

        let circleClass = 'stat-week-day-circle';
        let icon = '';

        if (isDone) {
            circleClass += ' stat-week-day-circle-done';
            icon = '<svg class="stat-week-day-icon" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        } else if (isSkipped || isPaused) {
            circleClass += ' stat-week-day-circle-skipped';
        } else if (isToday) {
            circleClass += ' stat-week-day-circle-today';
        } else if (isMissed) {
            circleClass += ' stat-week-day-circle-missed';
            icon = '<svg class="stat-week-day-icon" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';
        }

        return `
            <div class="stat-week-day">
                <span class="stat-week-day-label ${isToday ? 'stat-week-day-today-label' : ''}">${day.letter}</span>
                <div class="${circleClass}">${icon}</div>
            </div>
        `;
    }).join('');

    return `
        <div class="stat-week-card" data-habit-id="${habit.id}" data-action="open-detail">
            <div class="stat-week-head">
                <div class="stat-week-info">
                    <div class="stat-week-icon" style="background-color: ${pickers.colorToBg(habit.color)};">${habit.icon}</div>
                    <div class="stat-week-text">
                        <p class="stat-week-name">${escapeHtml(habit.name)}</p>
                        <p class="stat-week-streak">${streak} day streak</p>
                    </div>
                </div>
                <span class="stat-week-schedule">${formatScheduleShort(habit.schedule)}</span>
            </div>
            <div class="stat-week-divider"></div>
            <div class="stat-week-days">${dayCircles}</div>
        </div>
    `;
}


// ============================================
// OVERALL
// ============================================

function renderStatOverall() {
    const habits = storage.getHabits().filter((h) => !h.archived);

    // Summary
    const summary = calculateSummary(habits);
    document.querySelector('[data-stat="total-habits"]').textContent = summary.totalHabits;

    const successEl = document.querySelector('[data-stat="success-rate"]');
    successEl.textContent = summary.successRate + '%';
    successEl.style.color = moodColor(summary.successRate);

    document.querySelector('[data-stat="best-streak"]').innerHTML = `${summary.bestStreak} <span>days</span>`;
    document.querySelector('[data-stat="total-done"]').textContent = summary.totalDone;

    // List
    const list = document.querySelector('.stat-overall-list');
    if (!list) return;

    if (habits.length === 0) {
        list.innerHTML = '<p style="color: var(--text-secondary); padding: 24px; text-align: center;">No habits yet</p>';
        return;
    }

    list.innerHTML = habits.map((habit) => renderStatOverallCard(habit)).join('');
}


function renderStatOverallCard(habit) {
    const successPercent = calculateSuccessPercent(habit);
    const heatmap = renderHeatmap12Weeks(habit);

    // Сегодняшний день недели для подсветки лейбла слева
    const today = new Date();
    const todayDayIdx = (today.getDay() + 6) % 7;  // Mon=0 ... Sun=6
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const labelHtml = labels.map((letter, i) => {
        const todayClass = i === todayDayIdx ? ' stat-heatmap-label-today' : '';
        return `<span class="stat-heatmap-label${todayClass}">${letter}</span>`;
    }).join('');

    return `
        <div class="stat-overall-card" data-habit-id="${habit.id}" data-action="open-detail">
            <div class="stat-overall-head">
                <div class="stat-overall-info">
                    <div class="stat-overall-icon" style="background-color: ${pickers.colorToBg(habit.color)};">${habit.icon}</div>
                    <div class="stat-overall-text">
                        <p class="stat-overall-name">${escapeHtml(habit.name)}</p>
                        <p class="stat-overall-meta">${formatScheduleShort(habit.schedule)}</p>
                    </div>
                </div>
                <span class="stat-overall-percent" style="color: ${moodColor(successPercent)};">${successPercent}% Success</span>
            </div>

            <div class="stat-heatmap-wrap">
                <div class="stat-heatmap-labels">${labelHtml}</div>
                <div class="stat-heatmap-grid">${heatmap}</div>
            </div>

            <div class="stat-overall-divider"></div>
            <div class="stat-overall-legend">
                <div class="stat-legend-item"><span class="stat-legend-dot stat-legend-dot-done"></span>Done</div>
                <div class="stat-legend-item"><span class="stat-legend-dot stat-legend-dot-skipped"></span>Skipped / Paused</div>
                <div class="stat-legend-item"><span class="stat-legend-dot stat-legend-dot-missed"></span>Missed</div>
            </div>
        </div>
    `;
}


function renderHeatmap12Weeks(habit) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = storage.getTodayString();
    const created = parseLocalDate(habit.createdAt);

    // Понедельник текущей недели → отступаем 11 недель назад → начало 12-недельного окна
    const currentMonday = new Date(today);
    const offsetToMonday = (today.getDay() + 6) % 7;
    currentMonday.setDate(today.getDate() - offsetToMonday);

    const startDate = new Date(currentMonday);
    startDate.setDate(currentMonday.getDate() - 11 * 7);
    startDate.setHours(0, 0, 0, 0);

    const cells = [];
    const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 12; col++) {
            const cellDate = new Date(startDate);
            cellDate.setDate(startDate.getDate() + col * 7 + row);
            cellDate.setHours(0, 0, 0, 0);

            const cellKey = formatDateKey(cellDate);
            const entry = habit.entries[cellKey];
            const isToday = cellKey === todayKey;
            const isFuture = cellDate > today;
            const isBeforeCreated = cellDate < created;
            const dayKey = dayKeys[(cellDate.getDay() + 6) % 7];
            const isHabitDay = habit.schedule.includes(dayKey);
            const isDone = entry === 'done' || (typeof entry === 'number' && entry >= (habit.target || 1));
            const isSkipped = entry === 'Skipped';

            let cellClass = 'stat-heatmap-cell';
            let inlineStyle = '';

            if (isFuture || isBeforeCreated) {
                // пустая
            } else if (isDone) {
                cellClass += ' stat-heatmap-cell-done';
            } else if (isSkipped || isInPauseWindow(habit, cellDate)) {
                cellClass += ' stat-heatmap-cell-skipped';
            } else if (isToday) {
                cellClass += ' stat-heatmap-cell-today';
            } else if (isHabitDay) {
                cellClass += ' stat-heatmap-cell-missed';
            }

            const style = `grid-row: ${row + 1}; grid-column: ${col + 1};`;
            cells.push(`<div class="${cellClass}" style="${style}"></div>`);
        }
    }

    return cells.join('');
}


// ============================================
// SUMMARY CALCULATIONS
// ============================================

function calculateSummary(habits) {
    let bestStreak = 0;
    let totalDone = 0;
    let totalDays = 0;
    let totalSuccess = 0;

    habits.forEach((habit) => {
        const streak = calculateBestStreak(habit);
        if (streak > bestStreak) bestStreak = streak;

        Object.values(habit.entries).forEach((entry) => {
            if (entry === 'done' || (typeof entry === 'number' && entry >= (habit.target || 1))) {
                totalDone++;
            }
        });

        const habitSuccess = calculateSuccessPercent(habit);
        totalSuccess += habitSuccess;
        totalDays++;
    });

    const successRate = totalDays > 0 ? Math.round(totalSuccess / totalDays) : 0;

    return {
        totalHabits: habits.length,
        successRate: successRate,
        bestStreak: bestStreak,
        totalDone: totalDone
    };
}


function calculateSuccessPercent(habit) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const created = parseLocalDate(habit.createdAt);
    const target = habit.target || 1;

    let scheduledDays = 0;
    let doneDays = 0;
    const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    const cursor = new Date(created);
    while (cursor <= today) {
        const dayKey = dayKeys[(cursor.getDay() + 6) % 7];
        if (habit.schedule.includes(dayKey) && !isInPauseWindow(habit, cursor)) {
            const key = formatDateKey(cursor);
            const entry = habit.entries[key];
            const isSkipped = entry === 'Skipped';
            if (!isSkipped) {
                scheduledDays++;
                if (entry === 'done' || (typeof entry === 'number' && entry >= target)) {
                    doneDays++;
                }
            }
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    return scheduledDays > 0 ? Math.round((doneDays / scheduledDays) * 100) : 0;
}


function calculateBestStreak(habit) {
    let best = 0;
    let temp = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = habit.target || 1;
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    for (let i = 365; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dayKey = dayKeys[d.getDay()];
        if (!habit.schedule.includes(dayKey)) continue;
        if (isInPauseWindow(habit, d)) continue;
        const key = formatDateKey(d);
        const entry = habit.entries[key];
        const isSkipped = entry === 'Skipped';
        const isDone = entry === 'done' || (typeof entry === 'number' && entry >= target);

        if (isDone || isSkipped) {
            if (isDone) {
                temp++;
                if (temp > best) best = temp;
            }
        } else {
            temp = 0;
        }
    }

    return best;
}


// ============================================
// УТИЛИТЫ
// ============================================

function moodColor(percent) {
    if (percent <= 25) return '#F53942';
    if (percent <= 50) return '#E5A632';
    if (percent <= 75) return '#6B71FF';
    return '#B2F041';
}


function getCurrentWeekDays() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const s = storage.getSettings();
    const startOn = s.startWeekOn || 'monday';
    const startDayJs = { monday: 1, sunday: 0, saturday: 6 }[startOn] ?? 1;

    const startOfWeek = new Date(today);
    const diff = (today.getDay() - startDayJs + 7) % 7;
    startOfWeek.setDate(today.getDate() - diff);

    const allLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const allDayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const days = [];

    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        d.setHours(0, 0, 0, 0);
        const dow = d.getDay();
        days.push({
            date: d,
            key: formatDateKey(d),
            letter: allLetters[dow],
            dayKey: allDayKeys[dow]
        });
    }

    return days;
}


function formatScheduleShort(schedule) {
    if (!schedule || schedule.length === 0) return '';
    if (schedule.length === 7) return 'Every day';

    const labels = { mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S', sun: 'S' };
    const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    return order.filter((d) => schedule.includes(d)).map((d) => labels[d]).join(' / ');
}


// ============================================
// ДОСТУПНОСТЬ
// ============================================

window.statistic = {
    open: openStatistic,
    setTab: setStatTab,
    render: renderStatistic
};