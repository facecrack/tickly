/*
 * Feedback — экран обратной связи.
 */


let feedbackState = {
    category: null,   // 'idea' / 'bug' / 'love' / 'other'
    message: ''
};


function openFeedback() {
    feedbackState = { category: null, message: '' };
    renderFeedback();
    showScreen('feedback');
}


function selectCategory(category) {
    feedbackState.category = category;
    renderFeedback();
}


function setMessage(value) {
    feedbackState.message = value;
    updateCounter();
    updateSendButton();
}


function renderFeedback() {
    const screen = document.querySelector('[data-screen="feedback"]');
    if (!screen) return;

    // Chips
    const chips = screen.querySelectorAll('.feedback-chip');
    const categories = ['idea', 'bug', 'love', 'other'];
    chips.forEach((chip, i) => {
        chip.classList.toggle('feedback-chip-active', categories[i] === feedbackState.category);
    });

    // Textarea
    const textarea = screen.querySelector('.feedback-textarea');
    if (textarea && textarea.value !== feedbackState.message) {
        textarea.value = feedbackState.message;
    }

    updateCounter();
    updateSendButton();
}


function updateCounter() {
    const counter = document.querySelector('[data-screen="feedback"] .feedback-counter');
    if (counter) counter.textContent = `${feedbackState.message.length} / 1000`;
}


function updateSendButton() {
    const btn = document.querySelector('[data-screen="feedback"] .save-btn');
    if (!btn) return;
    const canSend = feedbackState.category && feedbackState.message.trim().length > 0;
    btn.classList.toggle('save-btn-disabled', !canSend);
}


function sendFeedback() {
    if (!feedbackState.category || !feedbackState.message.trim()) return;

    const subject = `[Habit Tracker] ${capitalizeCategory(feedbackState.category)}`;
    const body = feedbackState.message;
    const email = 'alexandrovvvsasha@gmail.com';  // ← поменяй на свой

    const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
}


function capitalizeCategory(cat) {
    const map = { idea: 'Idea', bug: 'Bug report', love: 'Love note', other: 'Other' };
    return map[cat] || 'Feedback';
}


window.feedback = {
    open: openFeedback,
    selectCategory: selectCategory,
    setMessage: setMessage,
    send: sendFeedback
};