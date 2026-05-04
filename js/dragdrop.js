/*
 * Drag & Drop — touch-based reordering of habit cards.
 */

let dragState = null;

function initDragDrop() {
    document.addEventListener('touchstart', dragStart, { passive: false });
    document.addEventListener('touchmove', dragMove, { passive: false });
    document.addEventListener('touchend', dragEnd);
    document.addEventListener('touchcancel', dragEnd);
    // Prevent drag-handle taps from opening the detail screen
    document.addEventListener('click', e => {
        if (e.target.closest('.drag-handle')) e.stopPropagation();
    });
}

function dragStart(e) {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;

    const item = handle.closest('[data-habit-id]');
    if (!item) return;

    e.preventDefault();

    const touch = e.touches[0];
    const rect = item.getBoundingClientRect();

    const ghost = item.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.style.cssText = `position:fixed;width:${rect.width}px;top:${rect.top}px;left:${rect.left}px;z-index:999;pointer-events:none;margin:0`;
    document.body.appendChild(ghost);

    item.classList.add('drag-placeholder');

    dragState = {
        item,
        list: item.closest('.today-list, .counters-list'),
        ghost,
        offsetY: touch.clientY - rect.top,
        currentTarget: null,
        lastTouchY: touch.clientY
    };
}

function dragMove(e) {
    if (!dragState) return;
    e.preventDefault();

    const touch = e.touches[0];
    dragState.lastTouchY = touch.clientY;

    dragState.ghost.style.top = (touch.clientY - dragState.offsetY) + 'px';

    const items = Array.from(dragState.list.querySelectorAll('[data-habit-id]'))
        .filter(el => el !== dragState.item);

    let closest = null;
    let closestDist = Infinity;

    items.forEach(el => {
        const r = el.getBoundingClientRect();
        const dist = Math.abs(touch.clientY - (r.top + r.height / 2));
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

function dragEnd() {
    if (!dragState) return;

    const { item, list, ghost, currentTarget, lastTouchY } = dragState;

    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    item.classList.remove('drag-placeholder');
    ghost.remove();

    if (currentTarget) {
        const r = currentTarget.getBoundingClientRect();
        if (lastTouchY < r.top + r.height / 2) {
            list.insertBefore(item, currentTarget);
        } else {
            currentTarget.after(item);
        }

        const ids = Array.from(list.querySelectorAll('[data-habit-id]')).map(el => el.dataset.habitId);
        storage.reorderHabitsInSection(ids);
    }

    dragState = null;
}

window.dragdrop = { init: initDragDrop };
