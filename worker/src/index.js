/*
 * Tickly Push Worker — хранит подписки и шлёт Web Push уведомления по расписанию.
 *
 * Secrets (wrangler secret put):
 *   VAPID_PUBLIC_KEY       — base64url uncompressed P-256 public key
 *   VAPID_PRIVATE_KEY_JWK  — JSON-строка private key в JWK-формате
 *   VAPID_SUBJECT          — "mailto:your@email.com"
 */

const ALLOWED_ORIGIN = 'https://facecrack.github.io';

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') return reply(null, 204);

        const path = new URL(request.url).pathname;

        try {
            if (path === '/public-key'  && request.method === 'GET')    return replyJson({ key: env.VAPID_PUBLIC_KEY });
            if (path === '/subscribe'   && request.method === 'POST')   return handleSubscribe(request, env);
            if (path === '/sync'        && request.method === 'POST')   return handleSync(request, env);
            if (path === '/unsubscribe' && request.method === 'POST')   return handleUnsubscribe(request, env);
        } catch (e) {
            console.error(e);
            return replyJson({ error: 'internal error' }, 500);
        }

        return reply('not found', 404);
    },

    async scheduled(event, env) {
        await sendDueReminders(env);
    }
};


// ─── HANDLERS ───────────────────────────────────────────────────────────────

async function handleSubscribe(request, env) {
    const { subscription, reminders, timezone } = await request.json();
    await env.PUSH_KV.put(kvKey(subscription.endpoint), JSON.stringify({
        subscription,
        reminders: reminders ?? [],
        timezone:  timezone  ?? 'UTC',
        sent: {}
    }));
    return replyJson({ ok: true });
}

async function handleSync(request, env) {
    const { endpoint, reminders } = await request.json();
    const key = kvKey(endpoint);
    const raw = await env.PUSH_KV.get(key);
    if (!raw) return replyJson({ error: 'not found' }, 404);
    const data = JSON.parse(raw);
    data.reminders = reminders;
    await env.PUSH_KV.put(key, JSON.stringify(data));
    return replyJson({ ok: true });
}

async function handleUnsubscribe(request, env) {
    const { endpoint } = await request.json();
    await env.PUSH_KV.delete(kvKey(endpoint));
    return replyJson({ ok: true });
}

function kvKey(endpoint) {
    return 'sub_' + endpoint.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-80);
}


// ─── CRON ────────────────────────────────────────────────────────────────────

async function sendDueReminders(env) {
    const { keys } = await env.PUSH_KV.list({ prefix: 'sub_' });
    const now = new Date();

    for (const { name } of keys) {
        const raw = await env.PUSH_KV.get(name);
        if (!raw) continue;

        let data;
        try { data = JSON.parse(raw); } catch { continue; }

        const tz = data.timezone ?? 'UTC';
        const fmt = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            weekday: 'short',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
        });
        const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));

        const timeStr = `${parts.hour}:${parts.minute}`;
        const dayStr  = parts.weekday.toLowerCase();   // "mon", "tue", …
        const dateStr = `${parts.year}-${parts.month}-${parts.day}`;

        let dirty = false;

        for (const r of data.reminders) {
            if (r.time !== timeStr)          continue;
            if (!r.days.includes(dayStr))    continue;

            const sentKey = `${r.habitId}_${dateStr}`;
            if (data.sent[sentKey])          continue;

            try {
                const res = await sendPush(data.subscription, {
                    title:   `${r.icon} ${r.name}`,
                    body:    'Time to check in!',
                    habitId: r.habitId
                }, env);

                if (res.status === 410 || res.status === 404) {
                    await env.PUSH_KV.delete(name);
                    dirty = false;
                    break;
                }

                data.sent[sentKey] = true;
                dirty = true;
            } catch (e) {
                console.error('push failed:', r.habitId, e.message);
            }
        }

        if (dirty) {
            // Удаляем sent-записи старше 7 дней
            const cutoff = new Date(now);
            cutoff.setDate(cutoff.getDate() - 7);
            const cutStr = cutoff.toISOString().slice(0, 10);
            for (const k of Object.keys(data.sent)) {
                if (k.slice(-10) < cutStr) delete data.sent[k];
            }
            await env.PUSH_KV.put(name, JSON.stringify(data));
        }
    }
}


// ─── WEB PUSH ────────────────────────────────────────────────────────────────

async function sendPush(subscription, payload, env) {
    const { endpoint, keys } = subscription;
    const audience = new URL(endpoint).origin;

    const vapid = {
        subject:       env.VAPID_SUBJECT,
        publicKey:     env.VAPID_PUBLIC_KEY,
        privateKeyJwk: JSON.parse(env.VAPID_PRIVATE_KEY_JWK)
    };

    const jwt  = await vapidJWT(audience, vapid);
    const body = await encryptPayload(
        fromB64(keys.p256dh),
        fromB64(keys.auth),
        new TextEncoder().encode(JSON.stringify(payload))
    );

    return fetch(endpoint, {
        method: 'POST',
        headers: {
            Authorization:      `vapid t=${jwt},k=${vapid.publicKey}`,
            'Content-Type':     'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            TTL:                '86400',
            Urgency:            'normal'
        },
        body
    });
}


// ─── VAPID JWT (RFC 8292) ─────────────────────────────────────────────────────

async function vapidJWT(audience, { subject, publicKey, privateKeyJwk }) {
    const privKey = await crypto.subtle.importKey(
        'jwk', privateKeyJwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false, ['sign']
    );

    const now     = Math.floor(Date.now() / 1000);
    const header  = b64u(te(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
    const payload = b64u(te(JSON.stringify({ aud: audience, exp: now + 43200, sub: subject })));
    const input   = `${header}.${payload}`;
    const sig     = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, te(input));

    return `${input}.${b64u(sig)}`;
}


// ─── PAYLOAD ENCRYPTION (RFC 8291, aes128gcm) ────────────────────────────────

async function encryptPayload(receiverPub, authSecret, plaintext) {
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Ephemeral ECDH key pair
    const senderKey    = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const senderPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', senderKey.publicKey));
    const receiverKey  = await crypto.subtle.importKey('raw', receiverPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);

    // ECDH shared secret
    const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverKey }, senderKey.privateKey, 256));

    // PRK_key = HKDF-Extract(auth_secret, ecdh_secret)
    // IKM     = HKDF-Expand(PRK_key, "WebPush: info\0" || receiver || sender, 32)
    const prkKey = await hkdfExtract(authSecret, ecdhSecret);
    const ikm    = await hkdfExpand(prkKey, cat(te('WebPush: info\0'), receiverPub, senderPubRaw), 32);

    // PRK = HKDF-Extract(salt, IKM)
    const prk   = await hkdfExtract(salt, ikm);
    const cek   = await hkdfExpand(prk, te('Content-Encoding: aes128gcm\0'), 16);
    const nonce = await hkdfExpand(prk, te('Content-Encoding: nonce\0'),     12);

    const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
    const ct     = new Uint8Array(await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce, tagLength: 128 },
        aesKey,
        cat(plaintext, new Uint8Array([2]))   // 0x02 = last-record delimiter
    ));

    // aes128gcm header: salt(16) || rs(4, BE) || idlen(1) || senderPub(65)
    return cat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([senderPubRaw.length]), senderPubRaw, ct);
}


// ─── HKDF (RFC 5869) ─────────────────────────────────────────────────────────

async function hkdfExtract(salt, ikm) {
    const k = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC', k, ikm));
}

async function hkdfExpand(prk, info, len) {
    const k   = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const okm = new Uint8Array(await crypto.subtle.sign('HMAC', k, cat(info, new Uint8Array([1]))));
    return okm.slice(0, len);
}


// ─── UTILS ───────────────────────────────────────────────────────────────────

const te = s => new TextEncoder().encode(s);

function cat(...parts) {
    const arrays = parts.map(p => p instanceof Uint8Array ? p : new Uint8Array(p));
    const out = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
    let i = 0;
    for (const a of arrays) { out.set(a, i); i += a.length; }
    return out;
}

function b64u(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

function reply(body, status = 200) {
    return new Response(body, {
        status,
        headers: {
            'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    });
}

function replyJson(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: {
            'Content-Type':                 'application/json',
            'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    });
}
