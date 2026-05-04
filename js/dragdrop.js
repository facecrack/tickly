/*
 * Drag & Drop — long-press на карточке запускает перетаскивание.
 */

let dragState = null;
let longPressTimer = null;
let touchStartX = 0;
let touchStartY = 0;
let preventNextClick = false;

function initDragDrop() {
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);

    // Блокируем клик по карточке если только что закончили drag
    document.addEventListener('click', e => {
        if (preventNextClick) {
            preventNextClick = false;
            e.stopPropagation();
        }
    }, true);
}

function onTouchStart(e) {
    // Если нажали на кнопку внутри карточки (check, +, −) — не трогаем
    if (e.target.closest('button')) return;

    const item = e.target.closest('[data-habit-id]');
    if (!item || !item.closest('.today-list, .counters-list')) return;

    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;

    longPressTimer = setTimeout(() => {
        longPressTimer = null;
        beginDrag(touch, item);
    }, 300);
}

function onTouchMove(e) {
    if (dragState) {
        e.preventDefault();
        const touch = e.touches[0];
        dragState.lastTouchY = touch.clientY;
        dragState.ghost.style.top = (touch.clientY - dragState.offsetY) + 'px';
        updateDropTarget(touch.clientY);
        return;
    }

    // Отмена long-press если палец сдвинулся
    if (longPressTimer) {
        const touch = e.touches[0];
        if (Math.abs(touch.clientX - touchStartX) > 6 || Math.abs(touch.clientY - touchStartY) > 6) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }
}

function onTouchEnd() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }

    if (!dragState) return;

    const { item, list, ghost, currentTarget } = dragState;

    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    item.classList.remove('drag-placeholder');
    ghost.remove();

    if (currentTarget) {
        const allItems = Array.from(list.querySelectorAll('[data-habit-id]'));
        const sourceIndex = allItems.indexOf(item);
        const targetIndex = allItems.indexOf(currentTarget);

        if (sourceIndex > targetIndex) {
            list.insertBefore(item, currentTarget);
        } else {
            currentTarget.after(item);
        }

        const ids = Array.from(list.querySelectorAll('[data-habit-id]')).map(el => el.dataset.habitId);
        storage.reorderHabitsInSection(ids);
        preventNextClick = true;
    }

    dragState = null;
}

function beginDrag(touch, item) {
    const rect = item.getBoundingClientRect();

    const ghost = item.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.style.cssText = `position:fixed;width:${rect.width}px;top:${rect.top}px;left:${rect.left}px;z-index:999;pointer-events:none;margin:0`;
    document.body.appendChild(ghost);

    item.classList.add('drag-placeholder');

    if (navigator.vibrate) navigator.vibrate(15);

    dragState = {
        item,
        list: item.closest('.today-list, .counters-list'),
        ghost,
        offsetY: touch.clientY - rect.top,
        currentTarget: null,
        lastTouchY: touch.clientY
    };
}

function updateDropTarget(touchY) {
    const items = Array.from(dragState.list.querySelectorAll('[data-habit-id]'))
        .filter(el => el !== dragState.item);

    let closest = null;
    let closestDist = Infinity;

    items.forEach(el => {
        const r = el.getBoundingClientRect();
        const dist = Math.abs(touchY - (r.top + r.height / 2));
        if (dist < closestDist) {
            closestDist = dist;
            closest = el;
        }
    });

    items.forEach(el => el.classList.remove('drag-over'));
    if (closest) {
        closest.classList.add('drag-over');
        dragState.currentTarget = closest;
    }
}

window.dragdrop = { init: initDragDrop };
