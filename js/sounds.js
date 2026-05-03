/*
 * Sounds — синтез звуков через Web Audio API.
 */

let audioCtx = null;

function getCtx() {
    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}


function playGentleChime() {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // Два синусоидальных осциллятора — основной тон + октава выше
    [[1046, 0.35, 1.8], [2093, 0.15, 1.2]].forEach(([freq, vol, dur]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.start(t);
        osc.stop(t + dur);
    });
}


function playBell() {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // Колокол: резкая атака, медленное затухание, несколько гармоник
    [[660, 0.5, 2.2], [990, 0.25, 1.6], [1320, 0.1, 1.0]].forEach(([freq, vol, dur]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.start(t);
        osc.stop(t + dur);
    });
}


function playChirp() {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // Два быстрых чирпа с FM-свипом
    [0, 0.18].forEach(offset => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900,  t + offset);
        osc.frequency.exponentialRampToValueAtTime(1800, t + offset + 0.1);
        gain.gain.setValueAtTime(0.3, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.14);
        osc.start(t + offset);
        osc.stop(t + offset + 0.15);
    });
}


function playSound(key) {
    try {
        if (key === 'gentle-chime') playGentleChime();
        else if (key === 'bell')    playBell();
        else if (key === 'chirp')   playChirp();
        // 'none' — без звука
    } catch (e) {
        console.warn('Sound playback failed:', e);
    }
}


window.sounds = { play: playSound };
