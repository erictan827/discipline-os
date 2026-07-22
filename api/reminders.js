import webpush from 'web-push';

const SUBSCRIPTIONS_TABLE = 'discipline_os_push_subscriptions';
const STATES_TABLE = 'discipline_os_states';

function config() {
  return {
    supabaseUrl: process.env.VITE_SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:erictan827@gmail.com',
    cronSecret: process.env.CRON_SECRET || '',
  };
}

async function adminRequest(env, path, options = {}) {
  const response = await fetch(`${env.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: env.serviceKey,
      Authorization: `Bearer ${env.serviceKey}`,
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

function localParts(timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'Asia/Kuala_Lumpur',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type)?.value || '';
  return { date: `${value('year')}-${value('month')}-${value('day')}`, hour: Number(value('hour')) };
}

function reminderCopy(state, date) {
  const life = state?.life || {};
  const dates = Object.keys(life.checkins || {}).filter((key) => key < date).sort();
  const last = dates.at(-1);
  const gap = last ? Math.max(0, Math.floor((new Date(`${date}T12:00:00Z`) - new Date(`${last}T12:00:00Z`)) / 86400000) - 1) : 0;
  if (life.mode === 'travel') return { title: '旅行中也保持一条线', body: '大概花费、有没有动、最重要的一步。30 秒就好。' };
  if (life.mode === 'recovery') return { title: '今天只做最低版本', body: '不用追回进度。留一个最小记录，就算重新接上。' };
  if (gap >= 2) return { title: '不用补前几天，今天回来就好', body: `中间空了 ${gap} 天没有关系。点一下，从今天继续。` };
  return { title: '今天还没留下三个信号', body: '大概花费、身体、关键一步。30 秒保存，不用写得漂亮。' };
}

export default async function remindersHandler(req, res) {
  const env = config();
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  if (!env.cronSecret || req.headers.authorization !== `Bearer ${env.cronSecret}`) return res.status(401).json({ error: 'UNAUTHORIZED' });
  if (!env.supabaseUrl || !env.serviceKey || !env.publicKey || !env.privateKey) return res.status(503).json({ error: 'PUSH_NOT_CONFIGURED' });
  try {
    const subscriptions = await adminRequest(env, `${SUBSCRIPTIONS_TABLE}?enabled=eq.true&select=*`);
    const due = (subscriptions || []).filter((item) => {
      const local = localParts(item.timezone);
      const recentlyNotified = item.last_notified_at && (Date.now() - new Date(item.last_notified_at).getTime() < 90 * 60 * 1000);
      return (local.hour === item.primary_hour || local.hour === item.fallback_hour)
        && !recentlyNotified
        && !(item.last_notified_date === local.date && item.last_notified_hour === local.hour);
    });
    if (!due.length) return res.status(200).json({ ok: true, due: 0, sent: 0 });
    const identities = [...new Set(due.map((item) => item.identity_key))];
    const stateRows = await Promise.all(identities.map((identity) => (
      adminRequest(env, `${STATES_TABLE}?identity_key=eq.${encodeURIComponent(identity)}&select=identity_key,state&limit=1`)
    )));
    const states = stateRows.flat();
    const stateMap = new Map((states || []).map((item) => [item.identity_key, item.state || {}]));
    webpush.setVapidDetails(env.subject, env.publicKey, env.privateKey);
    let sent = 0;
    for (const item of due) {
      const local = localParts(item.timezone);
      const state = stateMap.get(item.identity_key) || {};
      if (state.life?.checkins?.[local.date]) continue;
      const copy = reminderCopy(state, local.date);
      try {
        await webpush.sendNotification({ endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } }, JSON.stringify({
          ...copy,
          tag: `discipline-os-${local.date}`,
          url: '/?view=life&reminder=1',
        }));
        sent += 1;
        await adminRequest(env, `${SUBSCRIPTIONS_TABLE}?id=eq.${item.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ last_notified_date: local.date, last_notified_hour: local.hour, last_notified_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
        });
      } catch (error) {
        if ([404, 410].includes(Number(error.statusCode))) {
          await adminRequest(env, `${SUBSCRIPTIONS_TABLE}?id=eq.${item.id}`, { method: 'DELETE' });
        }
      }
    }
    res.status(200).json({ ok: true, due: due.length, sent });
  } catch (error) {
    res.status(500).json({ error: String(error.message || error) });
  }
}
