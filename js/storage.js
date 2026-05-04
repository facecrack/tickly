/*
 * Storage — модуль работы с localStorage.
 * Все функции для чтения/записи данных приложения.
 */


// Ключ под которым храним всё в localStorage
const STORAGE_KEY = 'habit-tracker-data';


// Структура данных по умолчанию (для нового пользователя)
const DEFAULT_DATA = {
    habits: [],
    settings: {
        theme: 'default',
        remindersEnabled: true,
        sound: 'gentle-chime',
        vibrate: true,
        startWeekOn: 'monday',
        timeFormat: '24h'
    },
    version: 1
};


// ============================================
// БАЗОВЫЕ ФУНКЦИИ
// ============================================

/**
 * Загрузить все данные из localStorage.
 * Если данных нет — вернуть дефолтные.
 */
function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
        // Первый запуск — возвращаем дефолтные данные
        return structuredClone(DEFAULT_DATA);
    }

    try {
        return JSON.parse(raw);
    } catch (error) {
        console.error('Не удалось распарсить данные из localStorage:', error);
        return structuredClone(DEFAULT_DATA);
    }
}


/**
 * Сохранить все данные в localStorage целиком.
 */
function saveData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Не удалось сохранить данные:', error);
    }
}


/**
 * Полностью очистить все данные (для разработки или сброса).
 */
function clearData() {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Все данные удалены');
}


// ============================================
// РАБОТА С ПРИВЫЧКАМИ
// ============================================

/**
 * Получить все привычки.
 */
function getHabits() {
    const data = loadData();
    return data.habits;
}


/**
 * Получить одну привычку по ID.
 */
function getHabit(id) {
    const habits = getHabits();
    return habits.find((h) => h.id === id) || null;
}


/**
 * Добавить новую привычку.
 * Возвращает созданный объект (с ID).
 */
function addHabit(habitData) {
    const data = loadData();

    // Создаём ID на основе текущего времени
    const newHabit = {
        id: 'habit_' + Date.now(),
        createdAt: getTodayString(),
        entries: {},
        notes: {},
        ...habitData
    };

    data.habits.push(newHabit);
    saveData(data);

    return newHabit;
}


/**
 * Обновить существующую привычку по ID.
 */
function updateHabit(id, updates) {
    const data = loadData();
    const index = data.habits.findIndex((h) => h.id === id);

    if (index === -1) {
        console.warn(`Привычка "${id}" не найдена`);
        return null;
    }

    data.habits[index] = { ...data.habits[index], ...updates };
    saveData(data);

    return data.habits[index];
}


/**
 * Удалить привычку по ID.
 */
function deleteHabit(id) {
    const data = loadData();
    data.habits = data.habits.filter((h) => h.id !== id);
    saveData(data);
}


/**
 * Переставить привычки внутри одной секции (binary или counter).
 * newIds — новый порядок ID для этой секции.
 * Привычки другого типа остаются на своих позициях в массиве.
 */
function reorderHabitsInSection(newIds) {
    const data = loadData();
    const habits = data.habits;

    // Найти индексы этих привычек в исходном массиве (отсортированные)
    const sectionIndices = newIds
        .map(id => habits.findIndex(h => h.id === id))
        .filter(i => i !== -1)
        .sort((a, b) => a - b);

    // Поставить переупорядоченные привычки на те же индексы
    const reordered = [...habits];
    newIds.forEach((id, i) => {
        const habit = habits.find(h => h.id === id);
        if (habit) reordered[sectionIndices[i]] = habit;
    });

    data.habits = reordered;
    saveData(data);
}


/**
 * Записать значение для привычки на дату.
 * Для binary: value — это "done" / "skipped" / "missed"
 * Для counter: value — это число
 */
function setEntry(habitId, dateString, value) {
    const data = loadData();
    const habit = data.habits.find((h) => h.id === habitId);

    if (!habit) {
        console.warn(`Привычка "${habitId}" не найдена`);
        return;
    }

    if (value === null || value === undefined) {
        // Удалить запись
        delete habit.entries[dateString];
    } else {
        habit.entries[dateString] = value;
    }

    saveData(data);
}


/**
 * Сохранить заметку для привычки на дату (null = удалить).
 */
function setNote(habitId, dateString, text) {
    const data = loadData();
    const habit = data.habits.find((h) => h.id === habitId);
    if (!habit) return;
    if (!habit.notes) habit.notes = {};
    if (!text) {
        delete habit.notes[dateString];
    } else {
        habit.notes[dateString] = text;
    }
    saveData(data);
}


// ============================================
// РАБОТА С НАСТРОЙКАМИ
// ============================================

/**
 * Получить все настройки.
 */
function getSettings() {
    const data = loadData();
    return data.settings;
}


/**
 * Обновить настройки (частично).
 */
function updateSettings(updates) {
    const data = loadData();
    data.settings = { ...data.settings, ...updates };
    saveData(data);
    return data.settings;
}


// ============================================
// УТИЛИТА — текущая дата
// ============================================

/**
 * Получить сегодняшнюю дату как строку "YYYY-MM-DD".
 */
function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}


// ============================================
// ДЕЛАЕМ ДОСТУПНЫМ ИЗ КОНСОЛИ И ИЗ app.js
// ============================================

window.storage = {
    loadData,
    saveData,
    clearData,
    getHabits,
    getHabit,
    addHabit,
    updateHabit,
    deleteHabit,
    setEntry,
    getSettings,
    updateSettings,
    getTodayString,
    reorderHabitsInSection,
    setNote
};