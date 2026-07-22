import webpush from 'web-push';

const TABLE = 'discipline_os_push_subscriptions';

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  return await new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 100_000) reject(new Error('PAYLOAD_TOO_LARGE'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('INVALID_JSON')); }
    });
    req.on('error', reject);
  });
}

function envConfig() {
  return {
    supabaseUrl: process.env.VITE_SUPABASE_URL || '',
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    vapidSubject: process.env.VAPID_SUBJECT || 'mailto:erictan827@gmail.com',
  };
}

async function authenticatedIdentity(req, config) {
  const authorization = String(req.headers.authorization || '');
  if (!authorization.startsWith('Bearer ') || !config.supabaseUrl || !config.anonKey) return null;
  const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: config.anonKey },
  });
  if (!response.ok) return null;
  const user = await response.json();
  const email = String(user.email || '').trim().toLowerCase();
  return email ? { id: user.id, email } : null;
}

async function supabaseAdmin(config, path, options = {}) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`SUPABASE_${response.status}:${await response.text()}`);
  const raw = await response.text();
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`SUPABASE_INVALID_JSON_${response.status}`);
  }
}

export default async function pushHandler(req, res) {
  const config = envConfig();
  if (req.method === 'GET') {
    sendJson(res, 200, {
      configured: Boolean(config.vapidPublicKey && config.vapidPrivateKey && config.serviceKey),
      publicKey: config.vapidPublicKey,
      supportedHours: [8, 12, 18, 20, 21, 22],
    });
    return;
  }
  if (!config.supabaseUrl || !config.anonKey || !config.serviceKey || !config.vapidPublicKey || !config.vapidPrivateKey) {
    sendJson(res, 503, { error: 'PUSH_NOT_CONFIGURED' });
    return;
  }
  const identity = await authenticatedIdentity(req, config);
  if (!identity) {
    sendJson(res, 401, { error: 'LOGIN_REQUIRED' });
    return;
  }
  try {
    const body = await readBody(req);
    const action = body.action || 'subscribe';
    const endpoint = String(body.subscription?.endpoint || body.endpoint || '');
    if (!endpoint) throw new Error('SUBSCRIPTION_REQUIRED');
    if (action === 'unsubscribe') {
      await supabaseAdmin(config, `${TABLE}?identity_key=eq.${encodeURIComponent(identity.email)}&endpoint=eq.${encodeURIComponent(endpoint)}`, { method: 'DELETE' });
      sendJson(res, 200, { ok: true, subscribed: false });
      return;
    }
    const keys = body.subscription?.keys || {};
    if (!keys.p256dh || !keys.auth) throw new Error('SUBSCRIPTION_KEYS_REQUIRED');
    const settings = body.settings || {};
    const primaryHour = [8, 12, 18, 20, 21, 22].includes(Number(settings.primaryHour)) ? Number(settings.primaryHour) : 21;
    const fallbackHour = [8, 12, 18, 20, 21, 22].includes(Number(settings.fallbackHour)) && Number(settings.fallbackHour) !== primaryHour
      ? Number(settings.fallbackHour)
      : null;
    await supabaseAdmin(config, `${TABLE}?on_conflict=endpoint`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        identity_key: identity.email,
        user_id: identity.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        timezone: settings.timezone || 'Asia/Kuala_Lumpur',
        primary_hour: primaryHour,
        fallback_hour: fallbackHour,
        enabled: settings.enabled !== false,
        updated_at: new Date().toISOString(),
      }),
    });
    if (action === 'test') {
      webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey);
      await webpush.sendNotification(body.subscription, JSON.stringify({
        title: 'Discipline OS 已接上提醒',
        body: '以后只在你还没记录时提醒。点这里直接回到今天。',
        tag: 'discipline-os-test',
        url: '/?view=life',
        test: true,
      }));
    }
    sendJson(res, 200, { ok: true, subscribed: true });
  } catch (error) {
    sendJson(res, 400, { error: String(error.message || error) });
  }
}
