/*
 * Router — обработка кликов по навигационным кнопкам.
 */


document.addEventListener('click', (event) => {

    // TYPE SWITCH
    const typeOption = event.target.closest('.type-option');
    if (typeOption) {
        const screen = typeOption.closest('[data-screen]');
        const allOptions = screen.querySelectorAll('.type-option');
        const isFirst = typeOption === allOptions[0];
        form.setType(isFirst ? 'binary' : 'counter');
        return;
    }

    // SCHEDULE DAY
    const dayBtn = event.target.closest('.schedule-day');
    if (dayBtn) {
        const screen = dayBtn.closest('[data-screen]');
        const allDays = screen.querySelectorAll('.schedule-day');
        const dayIndex = Array.from(allDays).indexOf(dayBtn);
        form.toggleDay(dayIndex);
        return;
    }

    // SCHEDULE PRESET
    const presetBtn = event.target.closest('.preset');
    if (presetBtn) {
        const text = presetBtn.textContent.trim().toLowerCase().replace(' ', '-');
        form.applyPreset(text);
        return;
    }

    // REMINDER TOGGLE (form)
    const reminderToggle = event.target.closest('.reminder .toggle');
    if (reminderToggle) {
        form.toggleReminder();
        return;
    }

    // ICON OPTION
    const iconOption = event.target.closest('.icon-option');
    if (iconOption) {
        pickers.setDraftIcon(iconOption.textContent.trim());
        return;
    }

    // COLOR OPTION
    const colorOption = event.target.closest('.color-option');
    if (colorOption) {
        const sheet = colorOption.closest('[data-sheet]');
        const allColors = sheet.querySelectorAll('.color-option');
        const index = Array.from(allColors).indexOf(colorOption);
        const colors = ['#353535', '#6B71FF', '#B2F041', '#E5A632', '#F53942'];
        pickers.setDraftColor(colors[index]);
        return;
    }

    // SELECT UNIT
    const unitItem = event.target.closest('[data-action="select-unit"]');
    if (unitItem) {
        const label = unitItem.querySelector('.picker-item-label')?.textContent.trim();
        if (label) pickers.selectUnit(label);
        return;
    }

    // SELECT SOUND
    const soundItem = event.target.closest('[data-action="select-sound"]');
    if (soundItem) {
        const label = soundItem.querySelector('.picker-item-label')?.textContent.trim();
        if (label) pickers.selectSound(label);
        return;
    }

    // SELECT START WEEK
    const startWeekItem = event.target.closest('[data-action="select-start-week"]');
    if (startWeekItem) {
        const label = startWeekItem.querySelector('.picker-item-label')?.textContent.trim();
        if (label) pickers.selectStartWeek(label);
        return;
    }

    // SELECT TIME FORMAT
    const timeFormatItem = event.target.closest('[data-action="select-time-format"]');
    if (timeFormatItem) {
        const label = timeFormatItem.querySelector('.picker-item-label')?.textContent.trim();
        if (label) pickers.selectTimeFormat(label);
        return;
    }

    // DATA-ACTION
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.dataset.action;

    switch (action) {
        case 'new-habit':
            form.open();
            break;

        case 'back-to-main': {
            const prev = window.getPreviousScreen();
            if (prev === 'statistic') {
                statistic.open();
                window.setPreviousScreen('main');
            } else if ((prev === 'habit-detail-binary' || prev === 'habit-detail-counter') && detail.currentId()) {
                detail.open(detail.currentId());
            } else {
                render.main();
            }
            break;
        }

        case 'open-settings':
            settings.render();
            showScreen('settings');
            break;

        case 'open-privacy':
            showScreen('privacy');
            break;

        case 'open-feedback':
    feedback.open();
    break;

        case 'save-habit':
            form.save();
            break;

        case 'open-icon-picker':
            pickers.openIcon();
            break;

        case 'cancel-picker':
            pickers.cancel();
            break;

        case 'save-icon-picker':
            pickers.saveIcon();
            break;

        case 'open-time-picker':
            pickers.openTime();
            break;

        case 'save-time-picker':
            pickers.saveTime();
            break;

        case 'open-unit-picker':
            pickers.openUnit();
            break;

        case 'step-decrement':
            form.changeStep(-1);
            break;

        case 'step-increment':
            form.changeStep(1);
            break;

        case 'habit-toggle': {
            event.stopPropagation();
            const li = actionEl.closest('[data-habit-id]');
            if (li) habits.toggle(li.dataset.habitId);
            break;
        }

        case 'counter-increment': {
            event.stopPropagation();
            const li = actionEl.closest('[data-habit-id]');
            if (li) habits.changeCounter(li.dataset.habitId, 1);
            break;
        }

        case 'counter-decrement': {
            event.stopPropagation();
            const li = actionEl.closest('[data-habit-id]');
            if (li) habits.changeCounter(li.dataset.habitId, -1);
            break;
        }

        case 'open-detail': {
            const li = actionEl.closest('[data-habit-id]');
            if (li) detail.open(li.dataset.habitId);
            break;
        }

        case 'heatmap-prev':
            detail.changeMonth(-1);
            break;

        case 'heatmap-next':
            detail.changeMonth(1);
            break;

        case 'open-note': {
            const date = actionEl.dataset.date;
            if (date) detail.openNote(detail.currentId(), date);
            break;
        }

        case 'save-note':
            detail.saveNote();
            break;

        case 'edit-habit':
            form.openEdit(detail.currentId());
            break;

        case 'skip-today':
            habits.skipToday(detail.currentId());
            break;

        case 'open-delete-alert':
            showAlert('delete-habit');
            break;

        case 'confirm-delete-habit':
            habits.deleteHabit(detail.currentId());
            hideAlert();
            break;

        case 'cancel-alert':
            hideAlert();
            break;

        case 'pause-habit':
            habits.pause(detail.currentId());
            break;

        case 'resume-habit':
            habits.resume(detail.currentId());
            break;

        case 'open-sound-picker':
            pickers.openSound();
            break;

        case 'toggle-vibrate':
            pickers.toggleVibrate();
            break;

        case 'open-start-week-picker':
            pickers.openStartWeek();
            break;

        case 'open-time-format-picker':
            pickers.openTimeFormat();
            break;

        case 'toggle-reminders-setting':
            settings.toggleReminders();
            break;

        case 'export-data':
            settings.export();
            break;

        case 'import-data':
            settings.import();
            break;

						case 'feedback-category':
    feedback.selectCategory(actionEl.dataset.category);
    break;

case 'send-feedback':
    feedback.send();
    break;

		case 'open-statistic':
    statistic.open();
    break;

case 'stat-tab':
    statistic.setTab(actionEl.dataset.tab);
    break;
    }
});


// Input listeners (имя и Goal)
document.addEventListener('input', (event) => {
    if (event.target.classList.contains('form-input-field')) {
        form.setName(event.target.value);
    }
    if (event.target.classList.contains('target-input')) {
        form.setTarget(event.target.value);
    }
    if (event.target.classList.contains('feedback-textarea')) {
        feedback.setMessage(event.target.value);
    }
});