import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const SESSION_COOKIE = 'discipline_os_session';
const SESSION_TTL_DAYS = 30;
const OPENAI_TIMEOUT_MS = 20000;
const EXERCISE_API_BASE = 'https://oss.exercisedb.dev/api/v1';
const exerciseCache = new Map();

function getAiConfig({ aiProvider = '', openaiApiKey = '', groqApiKey = '' }) {
  const preferred = String(aiProvider || '').trim().toLowerCase();
  if ((preferred === 'groq' && groqApiKey) || (!preferred && groqApiKey)) {
    return {
      provider: 'groq',
      apiKey: groqApiKey,
      baseURL: 'https://api.groq.com/openai/v1/responses',
      model: 'openai/gpt-oss-20b',
      missingError: 'GROQ_API_KEY_NOT_CONFIGURED',
    };
  }
  if (openaiApiKey) {
    return {
      provider: 'openai',
      apiKey: openaiApiKey,
      baseURL: 'https://api.openai.com/v1/responses',
      model: 'gpt-5.4-mini',
      missingError: 'OPENAI_API_KEY_NOT_CONFIGURED',
    };
  }
  return {
    provider: preferred === 'groq' ? 'groq' : 'openai',
    apiKey: '',
    baseURL: preferred === 'groq' ? 'https://api.groq.com/openai/v1/responses' : 'https://api.openai.com/v1/responses',
    model: preferred === 'groq' ? 'openai/gpt-oss-20b' : 'gpt-5.4-mini',
    missingError: preferred === 'groq' ? 'GROQ_API_KEY_NOT_CONFIGURED' : 'OPENAI_API_KEY_NOT_CONFIGURED',
  };
}

function readOutputText(response) {
  if (response.output_text) return response.output_text;
  return (response.output || [])
    .flatMap((item) => item.content || [])
    .filter((content) => content.type === 'output_text')
    .map((content) => content.text)
    .join('\n');
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        return index === -1
          ? [part, '']
          : [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function appendSetCookie(res, value) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', value);
    return;
  }
  res.setHeader('Set-Cookie', Array.isArray(existing) ? [...existing, value] : [existing, value]);
}

function setSessionCookie(res, token, maxAge) {
  appendSetCookie(
    res,
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
  );
}

function clearSessionCookie(res) {
  appendSetCookie(
    res,
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

async function readBody(req) {
  return await new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_500_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

function sanitizeUser(user) {
  return user ? { id: user.id, email: user.email, name: user.name || 'Eric' } : null;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { passwordHash, passwordSalt: salt };
}

function verifyPassword(password, user) {
  const hash = crypto.scryptSync(password, user.passwordSalt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.passwordHash, 'hex'));
}

function normalizeEmail(value = '') {
  return String(value).trim().toLowerCase();
}

async function parseJsonBody(req, res) {
  try {
    const raw = await readBody(req);
    return JSON.parse(raw || '{}');
  } catch (error) {
    sendJson(res, 400, { error: error.message || 'INVALID_JSON' });
    return null;
  }
}

export function createApiRouter({ rootDir, aiProvider = '', openaiApiKey = '', groqApiKey = '' }) {
  const statePath = path.resolve(rootDir, 'data', 'discipline-os-state.json');
  const usersPath = path.resolve(rootDir, 'data', 'cloud-users.json');
  const sessionsPath = path.resolve(rootDir, 'data', 'cloud-sessions.json');
  const ai = getAiConfig({ aiProvider, openaiApiKey, groqApiKey });

  async function getUsers() {
    const db = await readJson(usersPath, { users: [] });
    db.users = Array.isArray(db.users) ? db.users : [];
    return db;
  }

  async function saveUsers(db) {
    db.users = Array.isArray(db.users) ? db.users : [];
    await writeJson(usersPath, db);
  }

  async function getSessions() {
    const db = await readJson(sessionsPath, { sessions: [] });
    db.sessions = Array.isArray(db.sessions) ? db.sessions : [];
    return db;
  }

  async function saveSessions(db) {
    db.sessions = Array.isArray(db.sessions) ? db.sessions : [];
    await writeJson(sessionsPath, db);
  }

  async function createSession(res, userId) {
    const db = await getSessions();
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 86400000).toISOString();
    db.sessions = db.sessions.filter((session) => session.userId !== userId);
    db.sessions.push({
      token,
      userId,
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt,
    });
    await saveSessions(db);
    setSessionCookie(res, token, SESSION_TTL_DAYS * 24 * 60 * 60);
    return token;
  }

  async function getSession(req, res) {
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies[SESSION_COOKIE];
    if (!token) return null;
    const sessionsDb = await getSessions();
    const now = Date.now();
    sessionsDb.sessions = sessionsDb.sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
    const session = sessionsDb.sessions.find((item) => item.token === token);
    if (!session) {
      await saveSessions(sessionsDb);
      clearSessionCookie(res);
      return null;
    }
    session.lastSeenAt = new Date().toISOString();
    await saveSessions(sessionsDb);
    const usersDb = await getUsers();
    const user = usersDb.users.find((item) => item.id === session.userId);
    if (!user) {
      clearSessionCookie(res);
      return null;
    }
    return { session, user, usersDb, sessionsDb };
  }

  async function handleStateMirror(req, res) {
    if (req.method === 'GET') {
      try {
        const raw = await fs.readFile(statePath, 'utf8');
        sendJson(res, 200, JSON.parse(raw));
      } catch {
        sendJson(res, 200, { state: null, exists: false });
      }
      return true;
    }
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
      return true;
    }
    const body = await parseJsonBody(req, res);
    if (!body) return true;
    await writeJson(statePath, { state: body.state || null, updatedAt: new Date().toISOString() });
    sendJson(res, 200, { ok: true, path: statePath });
    return true;
  }

  async function handleSession(req, res) {
    const auth = await getSession(req, res);
    sendJson(res, 200, {
      authenticated: Boolean(auth),
      user: sanitizeUser(auth?.user),
      lastSyncAt: auth?.user?.lastSyncAt || null,
      mode: auth ? 'cloud' : 'local',
    });
    return true;
  }

  async function handleRegister(req, res) {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
      return true;
    }
    const body = await parseJsonBody(req, res);
    if (!body) return true;
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    const name = String(body.name || '').trim() || email.split('@')[0] || 'Eric';
    if (!email || !email.includes('@')) {
      sendJson(res, 400, { error: 'VALID_EMAIL_REQUIRED' });
      return true;
    }
    if (password.length < 8) {
      sendJson(res, 400, { error: 'PASSWORD_TOO_SHORT' });
      return true;
    }
    const usersDb = await getUsers();
    if (usersDb.users.some((user) => user.email === email)) {
      sendJson(res, 409, { error: 'EMAIL_ALREADY_REGISTERED' });
      return true;
    }
    const now = new Date().toISOString();
    const { passwordHash, passwordSalt } = hashPassword(password);
    const user = {
      id: crypto.randomUUID(),
      email,
      name,
      passwordHash,
      passwordSalt,
      state: body.seedState || null,
      createdAt: now,
      updatedAt: now,
      lastSyncAt: body.seedState ? now : null,
    };
    usersDb.users.push(user);
    await saveUsers(usersDb);
    await createSession(res, user.id);
    sendJson(res, 200, {
      ok: true,
      user: sanitizeUser(user),
      lastSyncAt: user.lastSyncAt,
      importedLocalState: Boolean(body.seedState),
    });
    return true;
  }

  async function handleLogin(req, res) {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
      return true;
    }
    const body = await parseJsonBody(req, res);
    if (!body) return true;
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    const usersDb = await getUsers();
    const user = usersDb.users.find((item) => item.email === email);
    if (!user || !verifyPassword(password, user)) {
      sendJson(res, 401, { error: 'INVALID_CREDENTIALS' });
      return true;
    }
    await createSession(res, user.id);
    sendJson(res, 200, {
      ok: true,
      user: sanitizeUser(user),
      lastSyncAt: user.lastSyncAt || null,
      hasState: Boolean(user.state),
    });
    return true;
  }

  async function handleLogout(req, res) {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
      return true;
    }
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies[SESSION_COOKIE];
    if (token) {
      const sessionsDb = await getSessions();
      sessionsDb.sessions = sessionsDb.sessions.filter((session) => session.token !== token);
      await saveSessions(sessionsDb);
    }
    clearSessionCookie(res);
    sendJson(res, 200, { ok: true });
    return true;
  }

  async function requireAuth(req, res) {
    const auth = await getSession(req, res);
    if (!auth) {
      sendJson(res, 401, { error: 'AUTH_REQUIRED' });
      return null;
    }
    return auth;
  }

  async function handleCloudState(req, res) {
    const auth = await requireAuth(req, res);
    if (!auth) return true;
    if (req.method === 'GET') {
      sendJson(res, 200, {
        ok: true,
        state: auth.user.state || null,
        updatedAt: auth.user.lastSyncAt || null,
      });
      return true;
    }
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
      return true;
    }
    const body = await parseJsonBody(req, res);
    if (!body) return true;
    const nextState = body.state || null;
    auth.user.state = nextState;
    auth.user.updatedAt = new Date().toISOString();
    auth.user.lastSyncAt = auth.user.updatedAt;
    await saveUsers(auth.usersDb);
    sendJson(res, 200, {
      ok: true,
      updatedAt: auth.user.lastSyncAt,
      state: auth.user.state,
    });
    return true;
  }

  async function handleExercises(req, res) {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
      return true;
    }
    const url = new URL(req.url, 'http://127.0.0.1');
    const mode = String(url.searchParams.get('mode') || 'list');
    let upstream = `${EXERCISE_API_BASE}/exercises`;
    if (mode === 'search') {
      const search = String(url.searchParams.get('q') || '').trim().slice(0, 80);
      upstream += `/search?search=${encodeURIComponent(search)}`;
    } else if (mode === 'detail') {
      const id = String(url.searchParams.get('id') || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
      if (!id) {
        sendJson(res, 400, { error: 'EXERCISE_ID_REQUIRED' });
        return true;
      }
      upstream += `/${id}`;
    } else if (mode === 'bodyparts' || mode === 'equipments' || mode === 'muscles') {
      upstream = `${EXERCISE_API_BASE}/${mode}`;
    } else {
      const limit = Math.max(1, Math.min(24, Number(url.searchParams.get('limit') || 18)));
      const after = String(url.searchParams.get('after') || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
      upstream += `?limit=${limit}${after ? `&after=${encodeURIComponent(after)}` : ''}`;
    }
    const cached = exerciseCache.get(upstream);
    if (cached && Date.now() - cached.at < 30 * 60 * 1000) {
      sendJson(res, 200, cached.payload);
      return true;
    }
    try {
      const response = await fetch(upstream, {
        headers: { Accept: 'application/json', 'User-Agent': 'Discipline-OS/1.0' },
        signal: AbortSignal.timeout(12000),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || `EXERCISE_API_${response.status}`);
      exerciseCache.set(upstream, { at: Date.now(), payload });
      sendJson(res, 200, payload);
    } catch (error) {
      sendJson(res, 502, { error: error.name === 'TimeoutError' ? 'EXERCISE_API_TIMEOUT' : 'EXERCISE_API_UNAVAILABLE' });
    }
    return true;
  }

  async function handleAI(req, res) {
    if (req.method === 'GET') {
      sendJson(res, 200, {
        configured: Boolean(ai.apiKey),
        provider: ai.provider,
        model: ai.model,
      });
      return true;
    }
    if (!ai.apiKey) {
      sendJson(res, 503, { error: ai.missingError, provider: ai.provider });
      return true;
    }
    const body = await parseJsonBody(req, res);
    if (!body) return true;
    try {
      const context = JSON.stringify(body.context || {});
      const isAnalysis = body.action === 'analyze';
      const isEarnedDropAnalysis = isAnalysis && body.context?.product?.earnedFromDrop === true;
      const isEarnedDropChat = body.action === 'chat' && body.context?.product?.earnedFromDrop === true;
      const isTransaction = body.action === 'transaction';
      const isSport = body.action === 'sport';
      const isSportSkill = body.action === 'sportSkill';
      const isSportTechnique = body.action === 'sportTechnique';
      const isDropCandidate = body.action === 'dropCandidate';
      const isHabit = body.action === 'habit';
      const isHabitPenalty = body.action === 'habitPenalty';
      const isSavingsEntry = body.action === 'savingsEntry';
      const isSavingsOverall = body.action === 'savingsOverall';
      const isSavingsReward = body.action === 'savingsReward';
      const instructions = isDropCandidate
        ? '你是 Eric 的未知掉落奖励裁判。这个掉落箱已经靠纪律正式赢得，不准要求 Eric 再储蓄、再累积奖励余额或再等冷静期。你的工作只是在当前掉落阶段判断他填写的具体候选奖励是否适合现在领取。严格检查：候选价格不可超过 drop.allowance；用途应尽量符合 drop.direction、drop.description 与 category；要结合 Eric 当前守住的钱、连续纪录和真实需要，避免为了开箱硬买垃圾。如果不适合，给一个同预算内、更符合本阶段的具体替代方案。suitable_now 只有在价格和阶段方向都合适时才能为 true。用自然直接的马来西亚华人中文。只输出有效 JSON：{"score":0到100整数,"verdict":"适合现在拿|可以但要调整|暂时不适合","suitable_now":true或false,"summary":"两句内直接结论","stage_fit":"为何符合或不符合这个掉落阶段","budget_fit":"价格与本箱上限的判断","why":"现在适合或不适合 Eric 的具体原因","risk":"最大的购买风险","better_option":"不适合时给同预算内的具体替代；适合时给优化建议","condition":"领取或调整前的明确条件"}'
        : isSavingsEntry
        ? '你是 Eric 的现金流裁判。判断这一笔收入或花费是否合理、对储蓄目标有什么影响。固定必要开支不等于乱花，但要指出是否偏贵、可优化或有订阅浪费。用自然直接的马来西亚华人中文。只输出有效 JSON：{"score":0到100整数,"verdict":"值得|合理必要|可以优化|偏浪费|高风险","summary":"两句总结","why":"具体原因","risk":"最大风险","next_move":"下一步具体做法","label":"短标签"}'
        : isSavingsOverall
          ? '你是 Eric 的私人储蓄教练。综合实际收入、花费、每月固定收支、近期走势和目标，做现金流体检与下月判断。不要空泛鼓励，用自然直接的马来西亚华人中文。只输出有效 JSON：{"score":0到100整数,"verdict":"财务状态短判断","summary":"两句最重要结论","why":"现金流结构分析","cashflow":"收入花费与固定项目判断","forecast":"下个月可能存到多少以及依据","risk":"最大风险","next_move":"现在最该做的具体动作","label":"短标签"}'
          : isSavingsReward
            ? '你是 Eric 的神秘储蓄奖励设计师。Eric 已达到储蓄目标。根据他的净存款、现金流、固定开支和性格，随机但合理地设计一个不会破坏储蓄、够有成就感、适合当下的奖励。奖励可以是低成本体验、训练升级、休息许可、成长工具或特别挑战；不可建议动用大笔储蓄。只输出有效 JSON：{"title":"神秘奖励标题","reward":"具体可领取的奖励内容和预算上限","reason":"为什么现在最适合 Eric","glyph":"✦|◆|⬡|✪"}'
      : isEarnedDropAnalysis
        ? '你是 Eric 的已赢得奖励效用顾问。这件具体奖励已经靠纪律正式赢得，不是普通消费，也不需要再赚一次。先检查价格是否不超过 product.dropAllowance；只要在本箱预算内，就绝对不准批评它花钱、影响储蓄、容易超支、只是临时补给，或要求 Eric 再等冷静期、再完成挑战。你的核心任务是针对 product.name、category、why 与掉落阶段，评估这个具体奖励会怎样帮助 Eric：实际用途、恢复/表现/成长/快乐价值、使用方式与怎样发挥最大效果。风险只能写物品本身的局限、选错规格、浪费或不适配，不可把已批准预算本身说成风险。若超过本箱上限，才指出超出的准确金额并建议压回上限。用自然直接的马来西亚华人中文。只输出有效 JSON：{"verdict":"很适合领取|适合领取|有帮助但要选对|超出本箱预算","score":0到100整数,"necessity":"作用很大|有实际帮助|奖励体验|需要选对","summary":"两句内说明这个具体奖励对 Eric 的作用","why":"它针对 Eric 有什么具体帮助","risk":"物品本身最大的局限或选购风险；预算内不可批评花费","better_move":"怎样挑选或使用才能发挥最大作用","fair_price":"明确说明实际价格是否在掉落预算内","challenge":"领取或使用时的实用建议；预算内不得加设门槛"}'
      : isAnalysis
        ? '你是 Eric 的消费与奖励顾问。Eric 极度重视自律、破纪录、运动、长期成长，但容易冲动消费。请用自然的马来西亚华人中文，直接、不官腔。根据资料判断物品的必要性和价值。只输出有效 JSON：{"verdict":"建议买|延后再看|不建议买","score":0到100整数,"necessity":"必要|有帮助|纯享受|冲动风险","summary":"两句直接分析","why":"为什么适合或不适合Eric","risk":"主要风险","better_move":"更好的做法","fair_price":"合理预算建议","challenge":"买之前要完成的具体条件"}'
        : isTransaction
          ? '你是 Eric 的单笔消费裁判。Eric 喜欢直接、够力、不官腔、像马来西亚华人会讲的话。请根据这一笔的金额、用途、类型、当天总花费、是不是食物、是不是训练相关、是不是贪方便，判断这笔消费到底合不合理。不是只判对错，也要看这东西是否符合他现在的需求。只输出有效 JSON：{"score":0到100整数,"verdict":"值得|勉强合理|冲动偏高|纯破功","importance_score":0到100整数,"necessity":"高必要|中必要|低必要","fit":"很符合当前需求|有点符合|不太符合","food_angle":"蛋白补给|正餐解决|嘴馋满足|方便税|非食物","summary":"两句内总结这笔消费","why":"为什么这样判","risk":"这笔的风险点","next_move":"下次遇到这种情况该怎样挡","label":"一句短标签"}'
        : isSportSkill
          ? '你是 Eric 的运动技能评估教练。你要为任何运动项目做极度保守、可解释、证据驱动的 0–100 掌握度校准。100 只代表用户写下的完整目标已经逐项被客观证明，不代表职业水平。训练次数、训练时长和主观努力本身不增加掌握分；19 次没有客观成果的训练也绝不可能因此接近 90 分。优先看可验证表现（距离、时间、回位时间、步频、命中率、动作质量、教练反馈、比赛/测验结果）、多次重复稳定性、技术、体能、战术/知识与独立完成能力。严格服从 context.evidenceProfile.evidenceCeiling，progress_score 不可超过该上限。只有主观描述时要显著降低 progress_score 与 confidence，并明确列出 evidence_gap。首次评估根据 baseline 建立保守基线；后续普通训练通常变化 0–2 分，新增可测量能力证据通常最多 3–5 分，只有明确跨过里程碑才可更高；退步、旧分虚高或长期停练必须降分。next_actions 必须是三个独立数组项目，禁止把 1、2、3 拼成同一个字符串；每项必须可执行、可测量，并按项目需要覆盖专项柔韧、间歇性高强度步法、回位时间/步频监测等真正有帮助的训练。用自然直接的马来西亚华人中文。只输出有效 JSON：{"progress_score":0到100整数,"delta":-100到10整数,"confidence":0到100整数,"stage":"阶段名称","summary":"两句证据化结论","score_reason":"具体说明为什么是这个分数，不是更高或更低","dimensions":{"technique":0到100整数,"physical":0到100整数,"consistency":0到100整数,"knowledge":0到100整数,"independence":0到100整数},"milestone":"当前正在攻克的里程碑","next_actions":["接下来最具体的动作1","动作2","动作3"],"evidence_gap":["要补充什么证据才能更准确"],"roadmap":[{"score":25,"label":"阶段目标","proof":"通过标准"},{"score":50,"label":"阶段目标","proof":"通过标准"},{"score":75,"label":"阶段目标","proof":"通过标准"},{"score":100,"label":"最终目标","proof":"通过标准"}]}'
        : isSportTechnique
          ? '你是严谨的运动动作技术分析教练。根据同一次动作的连续照片和用户说明分析动作，不做医疗诊断，也不能从看不清的角度假装确定。评分必须区分可见证据与无法判断的部分；如果照片角度、顺序或关键关节不清楚，要降低 confidence。只输出有效 JSON：{"score":0到100整数,"confidence":0到100整数,"verdict":"技术判断短句","summary":"两句总结","observed":["从照片明确看到的优点或问题"],"uncertain":["无法从这些照片确定的部分"],"safety":["安全提醒，不做医疗诊断"],"fixes":[{"issue":"问题","cue":"下一组马上能执行的口令","drill":"辅助练习"}],"next_capture":"下次应从什么角度怎样拍才能更准"}'
        : isSport
          ? '你是 Eric 的运动训练裁判。除了费用价值，更重要的是判断这次训练是否为其运动目标提供有效证据。结合训练内容、时长、强度、主观价值与项目当前进度，具体说出练到的技能和可验证成果。请用自然的马来西亚华人中文，直接、不官腔。只输出有效 JSON：{"score":0到100整数,"verdict":"高质量突破|值得继续|基础积累|训练偏水","performance_fit":"很符合当前目标|有帮助|普通|帮助不大","intensity_value":"训练量够|普通|偏水","skill_gain":"这场主要练到了什么技能与证据","attribute_boost":"身体或表现属性加成","discipline_bonus":"纪律、稳定性加成","importance_score":0到100整数,"summary":"两句内总结本次训练","why":"为什么这样判","risk":"训练最大风险","next_move":"下次最具体的进阶动作","label":"一句短标签"}'
        : isHabit
          ? '你是 Eric 的习惯战区裁判。Eric 极度吃连续纪录、成就感、等级感，也会对自己很狠。你要分开判断两件事：第一，这个习惯本身对 Eric 的适配度和长期价值有多高；第二，他今天和最近执行得怎样。今天没做，不代表这个习惯本身就低分。请用自然的马来西亚华人中文，直接、不官腔。要讲出这习惯练到了什么，也要讲这习惯到底适不适合 Eric。只输出有效 JSON：{"fit_score":0到100整数,"execution_score":0到100整数,"importance_score":0到100整数,"verdict":"非常适合继续练|适合长期养|有价值但要调整|不够适合现在","fit_reason":"为什么这个习惯本身适合或不适合 Eric","skill_gain":"这个习惯主要练到了什么","attribute_boost":"加成了什么能力或状态","discipline_bonus":"对纪律或身份感有什么加成","summary":"两句内总结这习惯当前表现","risk":"现在最大的风险","next_move":"明天最该怎样做才不会断","label":"一句短标签"}'
        : isHabitPenalty
          ? '你是 Eric 的 AI 惩罚箱设计师。Eric 对普通人那种轻飘飘的惩罚没感觉。你要根据他漏掉的习惯类型、失败规模、惩罚等级，写出一个够痛、够具体、可执行、会让他不爽但不会过头的惩罚。优先用：时间补课、金钱锁定、公开认账。不要写不能奶茶、不能零食、不能外卖这种没感觉的废惩罚。请用自然的马来西亚华人中文，直接、有压迫感、不官腔。只输出有效 JSON：{"title":"惩罚标题","copy":"具体惩罚内容","label":"短标签","glyph":"✦|⬡|◆|✪"}'
        : body.action === 'record'
          ? '你是 Eric 的每日消费裁判。Eric 喜欢直接、够力、不官腔、像马来西亚华人会讲的话。请根据这一天的消费记录、连续纪录、花费类型、金额、原因，给出直接判断。今天有可能是守住 RM0，也可能是破功，所以 verdict 要自己选最贴切的，不用被范例限制。只输出有效 JSON：{"score":0到100整数,"verdict":"稳稳守住|守得不错|普通破功|危险冲动|值得的必要支出","summary":"两句内总结今天表现","why":"为什么这样判","risk":"今天最大的风险","next_move":"明天最该做什么","label":"一句短标签"}'
        : isEarnedDropChat
          ? '你是 Eric 的已赢得奖励使用顾问。这件具体奖励已靠纪律赢得。只要价格在掉落预算内，不准再用普通消费、储蓄超支或冷静期角度训话；直接围绕这个具体物品对 Eric 的用途、效果、选购和使用方式回答。'
          : '你是 Eric 私人的战利品顾问。Eric 喜欢直接、够力、可执行的建议，不要翻译腔，不要空泛鼓励。你已经知道这个产品资料。回答时要结合他的省钱进度、运动习惯、购买动机和战利品规则。';
      const input = isDropCandidate
        ? `判断这个已赢得掉落箱里的候选奖励现在是否适合领取：${context}`
        : isSavingsEntry
        ? `分析这一笔独立现金流：${context}`
        : isSavingsOverall
          ? `分析目前整体储蓄与预测：${context}`
          : isSavingsReward
            ? `生成本次达标后的神秘奖励：${context}`
      : isAnalysis
        ? `分析这个战利品：${context}`
        : isTransaction
          ? `分析这一笔消费：${context}`
        : isSportSkill
          ? `校准这项运动技能的真实掌握度：${context}`
        : isSportTechnique
          ? `分析这组连续动作照片。用户资料：${context}`
        : isSport
          ? `分析这一场运动训练：${context}`
        : isHabit
          ? `分析这个习惯战区：${context}`
        : isHabitPenalty
          ? `根据这次失败情况，生成一条真正适合 Eric 的惩罚箱内容：${context}`
        : body.action === 'record'
          ? `分析这一天的纪录：${context}`
        : [
            ...(body.messages || []).slice(-10).map((message) => `${message.role === 'user' ? 'Eric' : '顾问'}：${message.content}`),
            `产品与进度资料：${context}`,
          ].join('\n');
      const imageInputs = isSportTechnique
        ? (Array.isArray(body.images) ? body.images : []).slice(0, 3).filter((item) => /^data:image\/(jpeg|png|webp);base64,/.test(String(item || '')))
        : [];
      if (isSportTechnique && imageInputs.length < 2) {
        sendJson(res, 400, { error: 'AT_LEAST_TWO_IMAGES_REQUIRED' });
        return true;
      }
      const requestInput = imageInputs.length
        ? [{ role: 'user', content: [{ type: 'input_text', text: input }, ...imageInputs.map((imageUrl) => ({ type: 'input_image', image_url: imageUrl }))] }]
        : input;
      const apiResponse = await fetch(ai.baseURL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ai.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
        body: JSON.stringify({
          model: isSportTechnique && ai.provider === 'groq' ? 'qwen/qwen3.6-27b' : ai.model,
          instructions,
          input: requestInput,
          ...(isSportTechnique && ai.provider === 'groq' ? {} : { reasoning: { effort: 'low' } }),
          max_output_tokens: isSportSkill || isSportTechnique ? 1400 : isAnalysis ? 900 : 700,
        }),
      });
      const result = await apiResponse.json();
      if (!apiResponse.ok) {
        throw new Error(result.error?.message || 'OpenAI request failed');
      }
      sendJson(res, 200, {
        text: readOutputText(result),
        responseId: result.id,
        model: result.model,
        provider: ai.provider,
      });
    } catch (error) {
      sendJson(res, 500, {
        error: error.name === 'TimeoutError'
          ? 'AI_REQUEST_TIMEOUT'
          : error.message,
      });
    }
    return true;
  }

  return async function route(req, res) {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/api/state') return handleStateMirror(req, res);
    if (url.pathname === '/api/session') return handleSession(req, res);
    if (url.pathname === '/api/auth/register') return handleRegister(req, res);
    if (url.pathname === '/api/auth/login') return handleLogin(req, res);
    if (url.pathname === '/api/auth/logout') return handleLogout(req, res);
    if (url.pathname === '/api/cloud/state') return handleCloudState(req, res);
    if (url.pathname === '/api/exercises') return handleExercises(req, res);
    if (url.pathname === '/api/ai') return handleAI(req, res);
    return false;
  };
}
