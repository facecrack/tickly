/*
 * Detail — рендеринг и логика экрана детализации привычки.
 */


let currentDetailHabitId = null;
let heatmapMonthOffset = 0;  // 0 = текущий месяц, -1 = прошлый и т.д.
let chartOffset = 0;          // 0 = последние 7 дней, 1 = предыдущие 7 и т.д.


// ============================================
// ОТКРЫТИЕ ДЕТАЛЬНОГО ЭКРАНА
// ============================================

function openHabitDetail(habitId) {
    const habit = storage.getHabit(habitId);
    if (!habit) return;

    currentDetailHabitId = habitId;
    heatmapMonthOffset = 0;
    chartOffset = 0;

    if (habit.type === 'binary') {
        showScreen('habit-detail-binary');
        renderBinaryDetail(habit);
    } else {
        showScreen('habit-detail-counter');
        renderCounterDetail(habit);
    }
}


// ============================================
// BINARY DETAIL
// ============================================

function renderBinaryDetail(habit) {
    const screen = document.querySelector('[data-screen="habit-detail-binary"]');
    if (!screen) return;

    const icon = screen.querySelector('.detail-icon');
    if (icon) {
        icon.textContent = habit.icon;
        icon.style.backgroundColor = pickers.colorToBg(habit.color);
    }

    const name = screen.querySelector('.detail-name');
    if (name) name.textContent = habit.name;

    const meta = screen.querySelector('.detail-meta');
    if (meta) meta.textContent = formatSchedule(habit.schedule);

    // Pause state
    const banner = screen.querySelector('.detail-paused-banner');
    if (banner) banner.hidden = !habit.paused;

    updatePauseBtn(screen, habit.paused);

    // Stats
    const stats = calculateStats(habit);
    const statValues = screen.querySelectorAll('.stats-grid .stat-value');
    if (statValues[0]) {
        const streakNum = statValues[0].querySelector('span:last-child');
        if (streakNum) streakNum.textContent = stats.currentStreak;
    }
    if (statValues[1]) statValues[1].textContent = stats.bestStreak;
    if (statValues[2]) statValues[2].textContent = stats.donePercent + '%';

    // Heatmap
    renderHeatmap(habit);
}


// ============================================
// COUNTER DETAIL
// ============================================

function renderCounterDetail(habit) {
    const screen = document.querySelector('[data-screen="habit-detail-counter"]');
    if (!screen) return;

    const icon = screen.querySelector('.detail-icon');
    if (icon) {
        icon.textContent = habit.icon;
        icon.style.backgroundColor = pickers.colorToBg(habit.color);
    }

    const name = screen.querySelector('.detail-name');
    if (name) name.textContent = habit.name;

    const meta = screen.querySelector('.detail-meta');
    if (meta) meta.textContent = `${formatSchedule(habit.schedule)} / ${habit.target} ${habit.unit}`;

    // Pause state
    const banner = screen.querySelector('.detail-paused-banner');
    if (banner) banner.hidden = !habit.paused;

    updatePauseBtn(screen, habit.paused);

    // Today block
    const today = storage.getTodayString();
    const rawValue = habit.entries[today];
    const isSkipped = rawValue === 'Skipped' || rawValue === 'skipped';
    const isPaused = !!habit.paused;
    const isInactive = isSkipped || isPaused;
    const todayValue = typeof rawValue === 'number' ? rawValue : 0;
    const target = habit.target || 1;
    const percent = isInactive ? 0 : Math.min(100, Math.round((todayValue / target) * 100));

    const todayPercent = screen.querySelector('.today-block-percent');
    if (todayPercent) todayPercent.textContent = percent + '%';

    const todayValueEl = screen.querySelector('.today-block-value');
    if (todayValueEl) {
        todayValueEl.textContent = isPaused ? 'Paused' : isSkipped ? 'Skipped' : todayValue;
        todayValueEl.classList.toggle('today-block-value-skipped', isInactive);
    }

    const todayTarget = screen.querySelector('.today-block-target');
    if (todayTarget) todayTarget.textContent = `/ ${target} ${habit.unit}`;

    const todayBar = screen.querySelector('.today-block-bar-fill');
    if (todayBar) todayBar.style.width = (isInactive ? 0 : percent) + '%';

    // Stats
    const stats = calculateStats(habit);
    const statValues = screen.querySelectorAll('.stats-grid .stat-value');
    if (statValues[0]) {
        const streakNum = statValues[0].querySelector('span:last-child');
        if (streakNum) streakNum.textContent = stats.currentStreak;
    }
    if (statValues[1]) statValues[1].textContent = stats.average;
    if (statValues[2]) statValues[2].textContent = stats.bestValue;

    // Bar chart за 7 дней
    renderChart(habit);

}


// ============================================
// HEATMAP
// ============================================

function renderHeatmap(habit) {
    const screen = document.querySelector('[data-screen="habit-detail-binary"]');
    const grid = screen.querySelector('.heatmap-grid');
    const title = screen.querySelector('.heatmap-title');
    if (!grid || !title) return;

    // Сегодня — локальная полночь
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = storage.getTodayString();
    const created = parseLocalDate(habit.createdAt);

    // Целевой месяц
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + heatmapMonthOffset, 1);
    const monthName = targetMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    title.textContent = monthName;

    // Кнопки навигации: next — на текущем месяце, prev — на месяце создания
    const heatmapNextBtn = screen.querySelector('[data-action="heatmap-next"]');
    if (heatmapNextBtn) heatmapNextBtn.disabled = heatmapMonthOffset === 0;
    const heatmapPrevBtn = screen.querySelector('[data-action="heatmap-prev"]');
    if (heatmapPrevBtn) {
        const monthsBack = (today.getFullYear() - created.getFullYear()) * 12 + (today.getMonth() - created.getMonth());
        heatmapPrevBtn.disabled = heatmapMonthOffset <= -monthsBack;
    }

    grid.innerHTML = '';

    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Mon=0, Tue=1, ... Sun=6
    let leadingDays = (firstDay.getDay() + 6) % 7;

    // Дни прошлого месяца — leading
    for (let i = leadingDays; i > 0; i--) {
        const d = new Date(year, month, 1 - i);
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell heatmap-cell-other';
        cell.textContent = d.getDate();
        grid.appendChild(cell);
    }

    // Дни текущего месяца
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const d = new Date(year, month, day);
        d.setHours(0, 0, 0, 0);
        const dateKey = formatDateKey(d);
        const entry = habit.entries[dateKey];

        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.textContent = day;

        const isToday = dateKey === todayKey;
        const isFuture = d > today;
        const isBeforeCreated = d < created;
        const isDone = entry === 'done' || (typeof entry === 'number' && entry >= (habit.target || 1));
        const isSkipped = entry === 'Skipped' || entry === 'skipped';

        if (isFuture || isBeforeCreated) {
            // Пустая ячейка — но цифру оставляем приглушённой
            cell.classList.add('heatmap-cell-other');
        } else if (isDone) {
            cell.classList.add('heatmap-cell-done');
        } else if (isSkipped || isInPauseWindow(habit, d)) {
            cell.classList.add('heatmap-cell-skipped');
        } else if (isToday) {
            // Сегодня и не done — белая обводка
            cell.classList.add('heatmap-cell-today');
        } else if (isHabitDay(habit, d)) {
            // День прошёл, был запланирован, не выполнен
            cell.classList.add('heatmap-cell-missed');
        }
        // иначе — серый дефолт (не habit day, прошедший)

        grid.appendChild(cell);
    }

    // Хвост до 6 строк
    const totalCells = leadingDays + lastDay.getDate();
    const trailingDays = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= trailingDays; i++) {
        const d = new Date(year, month + 1, i);
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell heatmap-cell-other';
        cell.textContent = d.getDate();
        grid.appendChild(cell);
    }
}


function changeHeatmapMonth(delta) {
    const habit = storage.getHabit(currentDetailHabitId);
    if (!habit) return;
    const created = parseLocalDate(habit.createdAt);
    const now = new Date();
    const monthsBack = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
    heatmapMonthOffset = Math.max(-monthsBack, Math.min(0, heatmapMonthOffset + delta));
    renderHeatmap(habit);
}


// ============================================
// CHART (counter)
// ============================================

function renderChart(habit) {
    const screen = document.querySelector('[data-screen="habit-detail-counter"]');
    const chartBars = screen.querySelector('.chart-bars');
    if (!chartBars) return;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayKey = formatDateKey(now);

    // Конец периода: сегодня - offset*7
    const endDate = new Date(now);
    endDate.setDate(now.getDate() - chartOffset * 7);

    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(endDate.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const key = formatDateKey(d);
        const rawValue = habit.entries[key];
        const isPaused = isInPauseWindow(habit, d);
        const isSkipped = rawValue === 'Skipped' || rawValue === 'skipped' || isPaused;
        const value = typeof rawValue === 'number' && !isPaused ? rawValue : 0;
        days.push({
            date: d,
            key: key,
            value: value,
            isSkipped: isSkipped,
            isToday: key === todayKey
        });
    }

    // Заголовок — диапазон дат
    const chartTitle = screen.querySelector('.chart-title');
    if (chartTitle) {
        const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        chartTitle.textContent = `${fmt(days[0].date)} – ${fmt(days[6].date)}`;
    }

    // Кнопки навигации: next задизейблена на текущей неделе, prev — на 8-й (max)
    const nextBtn = screen.querySelector('[data-action="chart-next"]');
    if (nextBtn) nextBtn.disabled = chartOffset === 0;
    const prevBtn = screen.querySelector('[data-action="chart-prev"]');
    if (prevBtn) prevBtn.disabled = chartOffset >= 7;

    const target = habit.target || 1;
    const maxValue = Math.max(target, ...days.map((d) => d.value));

    chartBars.innerHTML = days.map((d) => {
        const reachedTarget = d.value >= target;
        const heightPx = maxValue > 0 ? Math.round((d.value / maxValue) * 80) : 0;
        const colorClass = d.isSkipped ? 'bar-skipped' : (reachedTarget ? 'bar-lime' : 'bar-purple');
        const todayClass = d.isToday ? 'bar-col-today' : '';
        const finalHeight = d.isSkipped ? 8 : heightPx;
        return `
            <div class="bar-col ${todayClass}">
                <span class="bar-value">${d.isSkipped ? '' : d.value}</span>
                <div class="bar ${colorClass}" style="height: ${finalHeight}px;"></div>
            </div>
        `;
    }).join('');

    const chartWeekdays = screen.querySelector('.chart-weekdays');
    if (chartWeekdays) {
        chartWeekdays.innerHTML = days.map((d) => {
            const letter = ['S','M','T','W','T','F','S'][d.date.getDay()];
            const todayClass = d.isToday ? 'chart-weekday-today' : '';
            return `<span class="${todayClass}">${letter}</span>`;
        }).join('');
    }
}


function changeChartWeek(delta) {
    const habit = storage.getHabit(currentDetailHabitId);
    if (!habit) return;
    chartOffset = Math.max(0, Math.min(7, chartOffset + delta));
    renderChart(habit);
}


// ============================================
// УТИЛИТЫ
// ============================================

// Парсит "YYYY-MM-DD" как локальную дату без UTC-сюрпризов
function parseLocalDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
}


function calculateStats(habit) {
    const entries = habit.entries;
    const dates = Object.keys(entries).sort();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = habit.target || 1;

    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    // Current streak — от сегодня назад, пропускаем незапланированные дни и паузу
    let currentStreak = 0;
    const todayEntry = entries[formatDateKey(today)];
    const todayDone = todayEntry === 'done' || (typeof todayEntry === 'number' && todayEntry >= target);
    const startOffset = todayDone ? 0 : 1;
    for (let i = startOffset; i < 365; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dayKey = dayKeys[d.getDay()];
        if (!habit.schedule.includes(dayKey)) continue;
        if (isInPauseWindow(habit, d)) continue;
        const key = formatDateKey(d);
        const entry = entries[key];
        const isSkipped = entry === 'Skipped' || entry === 'skipped';
        const isDone = entry === 'done' || (typeof entry === 'number' && entry >= target);
        if (isDone || isSkipped) {
            if (isDone) currentStreak++;
        } else {
            break;
        }
    }

    // Best streak за последний год, пропускаем незапланированные дни и паузу
    let bestStreak = 0;
    let tempStreak = 0;
    for (let i = 365; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dayKey = dayKeys[d.getDay()];
        if (!habit.schedule.includes(dayKey)) continue;
        if (isInPauseWindow(habit, d)) continue;
        const key = formatDateKey(d);
        const entry = entries[key];
        const isSkipped = entry === 'Skipped' || entry === 'skipped';
        const isDone = entry === 'done' || (typeof entry === 'number' && entry >= target);
        if (isDone || isSkipped) {
            if (isDone) {
                tempStreak++;
                if (tempStreak > bestStreak) bestStreak = tempStreak;
            }
        } else {
            tempStreak = 0;
        }
    }

    // Done percent — от запланированных дней с момента создания
    let donePercent = 0;
    if (habit.type === 'binary') {
        const created = parseLocalDate(habit.createdAt);
        const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        let scheduled = 0;
        let done = 0;
        const cursor = new Date(created);
        while (cursor <= today) {
            const dayKey = dayKeys[(cursor.getDay() + 6) % 7];
            if (habit.schedule.includes(dayKey) && !isInPauseWindow(habit, cursor)) {
                scheduled++;
                const key = formatDateKey(cursor);
                if (entries[key] === 'done') done++;
            }
            cursor.setDate(cursor.getDate() + 1);
        }
        donePercent = scheduled > 0 ? Math.round((done / scheduled) * 100) : 0;
    }

    // Average и best value (для counter)
    let average = 0;
    let bestValue = 0;
    if (habit.type === 'counter') {
        const values = Object.values(entries).filter((v) => typeof v === 'number');
        if (values.length > 0) {
            average = (values.reduce((s, v) => s + v, 0) / values.length).toFixed(1);
            bestValue = Math.max(...values);
        }
    }

    return { currentStreak, bestStreak, donePercent, average, bestValue };
}


function formatSchedule(schedule) {
    if (!schedule || schedule.length === 0) return '';
    if (schedule.length === 7) return 'Every day';

    const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const weekends = ['sat', 'sun'];
    const sorted = [...schedule].sort();

    if (sorted.length === 5 && weekdays.every((d) => sorted.includes(d))) return 'Weekdays';
    if (sorted.length === 2 && weekends.every((d) => sorted.includes(d))) return 'Weekends';

    const labels = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
    const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    return order.filter((d) => schedule.includes(d)).map((d) => labels[d]).join(' / ');
}


function isHabitDay(habit, date) {
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayKey = dayKeys[date.getDay()];
    return habit.schedule.includes(dayKey);
}


function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}


function updatePauseBtn(screen, isPaused) {
    const pauseBtn  = screen.querySelector('.detail-pause-btn');
    const skipBtn   = screen.querySelector('.detail-skip-btn');
    const resumeBtn = screen.querySelector('.detail-resume-btn');

    if (isPaused) {
        if (pauseBtn)  pauseBtn.hidden  = true;
        if (skipBtn)   skipBtn.hidden   = true;
        if (resumeBtn) resumeBtn.hidden = false;
    } else {
        if (pauseBtn)  pauseBtn.hidden  = false;
        if (skipBtn)   skipBtn.hidden   = false;
        if (resumeBtn) resumeBtn.hidden = true;
    }
}


// ============================================
// ДОСТУПНОСТЬ
// ============================================

window.detail = {
    open: openHabitDetail,
    changeMonth: changeHeatmapMonth,
    changeChartWeek,
    currentId: () => currentDetailHabitId
};