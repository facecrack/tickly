/*
 * Form — логика формы создания/редактирования привычки.
 */


function createDefaultFormState() {
    return {
        name: '',
        icon: '✨',
        color: '#353535',
        type: 'binary',
        target: 1,
        unit: '',
        step: 1,
        schedule: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        reminders: []
    };
}


let formState = createDefaultFormState();
let editingHabitId = null;  // null = новая, иначе ID редактируемой


function openNewHabitForm() {
    formState = createDefaultFormState();
    editingHabitId = null;

    if (formState.type === 'binary') {
        showScreen('new-habit-binary');
    } else {
        showScreen('new-habit-counter');
    }

    updateFormTitle('New habit');
    renderForm();
}


function openEditForm(habitId) {
    const habit = storage.getHabit(habitId);
    if (!habit) return;

    editingHabitId = habitId;
    formState = {
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        type: habit.type,
        target: habit.target || 1,
        unit: habit.unit || '',
        step: habit.step || 1,
        schedule: [...habit.schedule],
        reminders: [...(habit.reminders || [])]
    };

    if (formState.type === 'binary') {
        showScreen('new-habit-binary');
    } else {
        showScreen('new-habit-counter');
    }

    updateFormTitle('Edit habit');
    renderForm();
}


function updateFormTitle(text) {
    const screenName = formState.type === 'binary' ? 'new-habit-binary' : 'new-habit-counter';
    const title = document.querySelector(`[data-screen="${screenName}"] .form-title`);
    if (title) title.textContent = text;
}


function setType(newType) {
    if (newType !== 'binary' && newType !== 'counter') return;
    formState.type = newType;
    const savedPrev = window.getPreviousScreen();
    if (newType === 'binary') {
        showScreen('new-habit-binary');
    } else {
        showScreen('new-habit-counter');
    }
    window.setPreviousScreen(savedPrev);
    updateFormTitle(editingHabitId ? 'Edit habit' : 'New habit');
    renderForm();
}


function toggleDay(dayIndex) {
    const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const dayKey = dayKeys[dayIndex];
    if (!dayKey) return;

    const isActive = formState.schedule.includes(dayKey);
    if (isActive) {
        formState.schedule = formState.schedule.filter((d) => d !== dayKey);
    } else {
        formState.schedule.push(dayKey);
    }

    renderForm();
}


function applyPreset(preset) {
    const allDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const weekends = ['sat', 'sun'];

    if (preset === 'every-day') formState.schedule = [...allDays];
    else if (preset === 'weekdays') formState.schedule = [...weekdays];
    else if (preset === 'weekends') formState.schedule = [...weekends];

    renderForm();
}


function toggleReminder() {
    if (formState.reminders.length > 0) {
        formState.reminders = [];
    } else {
        formState.reminders = [{ time: '09:00' }];
    }
    renderForm();
}


function addReminder() {
    if (formState.reminders.length >= 3) return;
    formState.reminders.push({ time: '09:00' });
    renderForm();
}


function removeReminder(index) {
    formState.reminders.splice(index, 1);
    renderForm();
}


function setName(value) {
    formState.name = value;
    const screenName = formState.type === 'binary' ? 'new-habit-binary' : 'new-habit-counter';
    const saveBtn = document.querySelector(`[data-screen="${screenName}"] .save-btn`);
    if (saveBtn) {
        saveBtn.classList.toggle('save-btn-disabled', !value.trim());
    }
}


function setTarget(value) {
    const num = parseInt(value, 10);
    formState.target = isNaN(num) || num < 1 ? 1 : num;
}


function changeStep(delta) {
    const newStep = formState.step + delta;
    formState.step = newStep < 1 ? 1 : newStep;
    renderForm();
}


function saveHabit() {
    const name = formState.name.trim();
    if (!name) return;
    if (formState.schedule.length === 0) {
        const screenName = formState.type === 'binary' ? 'new-habit-binary' : 'new-habit-counter';
        const scheduleEl = document.querySelector(`[data-screen="${screenName}"] .schedule`);
        if (scheduleEl) {
            scheduleEl.classList.add('schedule-error');
            setTimeout(() => scheduleEl.classList.remove('schedule-error'), 700);
        }
        return;
    }

    const habitData = {
        name: name,
        icon: formState.icon,
        color: formState.color,
        type: formState.type,
        schedule: [...formState.schedule],
        reminders: [...formState.reminders]
    };

    if (formState.type === 'counter') {
        habitData.target = formState.target;
        habitData.unit = formState.unit;
        habitData.step = formState.step;
    }

    if (editingHabitId) {
        const savedId = editingHabitId;
        const existing = storage.getHabit(savedId);
        if (existing && existing.type !== habitData.type) {
            habitData.entries = {};
        }
        storage.updateHabit(savedId, habitData);
        editingHabitId = null;
        notifications.scheduleReminders();
        detail.open(savedId);
    } else {
        storage.addHabit(habitData);
        notifications.scheduleReminders();
        if (!storage.getSettings().hintShown) {
            storage.updateSettings({ hintShown: true });
            render.main();
            setTimeout(() => showAlert('hints'), 300);
        } else {
            render.main();
        }
    }
}


function renderForm() {
    const screenName = formState.type === 'binary' ? 'new-habit-binary' : 'new-habit-counter';
    const screen = document.querySelector(`[data-screen="${screenName}"]`);
    if (!screen) return;

    const iconPreview = screen.querySelector('.icon-preview-emoji');
if (iconPreview) iconPreview.textContent = formState.icon;

const iconPreviewBtn = screen.querySelector('.icon-preview');
if (iconPreviewBtn) {
    iconPreviewBtn.style.backgroundColor = pickers.colorToBg(formState.color);
}

    const nameInput = screen.querySelector('.form-input-field');
    if (nameInput && nameInput.value !== formState.name) {
        nameInput.value = formState.name;
    }

    const dayBtns = screen.querySelectorAll('.schedule-day');
    const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    dayBtns.forEach((btn, index) => {
        const dayKey = dayKeys[index];
        btn.classList.toggle('schedule-day-active', formState.schedule.includes(dayKey));
    });

    updateActivePreset(screen);

    const multiToggle = screen.querySelector('.reminder-multi .toggle');
    if (multiToggle) multiToggle.classList.toggle('toggle-on', formState.reminders.length > 0);

    const timesList = screen.querySelector('.reminder-times-list');
    if (timesList) {
        if (formState.reminders.length === 0) {
            timesList.innerHTML = '';
        } else {
            const rows = formState.reminders.map((r, i) => `
                <div class="reminder-time-row">
                    <button class="reminder-time-btn" data-action="open-time-picker" data-reminder-index="${i}">
                        <img src="icons/bell.svg" alt="" class="reminder-time-icon">
                        <span>${formatReminderTime(r.time)}</span>
                    </button>
                    <button class="reminder-remove-btn" data-action="remove-reminder" data-reminder-index="${i}">
                        <img src="icons/close.svg" alt="Remove">
                    </button>
                </div>
            `).join('');
            const addBtn = formState.reminders.length < 3 ? `
                <button class="reminder-add-btn" data-action="add-reminder">
                    <img src="icons/plus.svg" alt="" class="reminder-add-icon">
                    <span>Add reminder</span>
                </button>
            ` : '';
            timesList.innerHTML = rows + addBtn;
        }
    }

    const typeOptions = screen.querySelectorAll('.type-option');
    typeOptions.forEach((opt, index) => {
        const isActive = (index === 0 && formState.type === 'binary') ||
                          (index === 1 && formState.type === 'counter');
        opt.classList.toggle('type-option-active', isActive);
    });

    if (formState.type === 'counter') {
        const targetInput = screen.querySelector('.target-input');
        if (targetInput && targetInput.value !== String(formState.target)) {
            targetInput.value = formState.target;
        }

        const stepValue = screen.querySelector('.step-value');
        if (stepValue) stepValue.textContent = formState.step;

        const unitBtn = screen.querySelector('.target-unit-btn span:first-child');
        if (unitBtn) unitBtn.textContent = formState.unit || 'Choose unit';
    }

    const saveBtn = screen.querySelector('.save-btn');
    if (saveBtn) {
        saveBtn.classList.toggle('save-btn-disabled', !formState.name.trim());
    }
}


function updateActivePreset(screen) {
    const presetBtns = screen.querySelectorAll('.preset');
    if (!presetBtns.length) return;

    const days = formState.schedule;
    const allDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const weekends = ['sat', 'sun'];

    let activePreset = 'custom';
    if (arraysEqual(days, allDays)) activePreset = 'every-day';
    else if (arraysEqual(days, weekdays)) activePreset = 'weekdays';
    else if (arraysEqual(days, weekends)) activePreset = 'weekends';

    presetBtns.forEach((btn) => {
        const text = btn.textContent.trim().toLowerCase().replace(' ', '-');
        btn.classList.toggle('preset-active', text === activePreset);
    });
}


function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, i) => val === sortedB[i]);
}


function formatReminderTime(time) {
    if (storage.getSettings().timeFormat !== '12h') return time;
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}


window.form = {
    state: () => formState,
    open: openNewHabitForm,
    openEdit: openEditForm,
    render: renderForm,
    setType: setType,
    toggleDay: toggleDay,
    applyPreset: applyPreset,
    toggleReminder: toggleReminder,
    addReminder: addReminder,
    removeReminder: removeReminder,
    setName: setName,
    setTarget: setTarget,
    changeStep: changeStep,
    save: saveHabit
};