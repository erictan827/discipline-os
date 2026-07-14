import {
  fetchSupabaseState,
  getSupabaseUserIdentities,
  getSupabasePublicConfig,
  getSupabaseSession,
  hasSupabaseConfig,
  linkGoogleSupabaseIdentity,
  loginSupabaseUser,
  logoutSupabaseUser,
  mapSupabaseUser,
  onSupabaseAuthStateChange,
  registerSupabaseUser,
  resendSupabaseConfirmationEmail,
  saveSupabaseState,
  signInWithGoogle,
  subscribeToSupabaseState,
  updateSupabasePassword,
} from './supabase.js';

const STORAGE_KEY = 'discipline-os-zero-v1';
const SIDEBAR_STATE_KEY = 'discipline-os-sidebar-collapsed';
const DAY = 86400000;
const PAGE_SIZE = 8;
const SYNC_DEBOUNCE_MS = 500;
const AI_REQUEST_TIMEOUT_MS = 25000;
const defaultSettings = {
  lastBrowserNoticeKey: '',
  themeMode: 'dark',
  themeAccent: '#b6f43b',
  themeAccent2: '#79d917',
  themeBg: '#090a09',
  themePanel: '#101210',
  themeText: '#f2f5ef',
  themeDanger: '#ff5e55',
};
const defaultData = {
  name: 'Eric',
  dailyTarget: 30,
  language: 'zh',
  rewardRate: 0.1,
  rewards: [],
  secretDrops: [],
  impulses: [],
  sportsSessions: [],
  sportSkills: [],
  sportTechniqueReviews: [],
  savingsEntries: [],
  savingsAccounts: [],
  savingsBattleSync: {},
  recurringSavings: [],
  savingsGoal: null,
  savingsAnalysis: null,
  habits: [],
  habitLogs: {},
  habitDrops: [],
  habitPerks: [],
  habitPenalties: [],
  habitGraceUses: [],
  habitRecoveryUntil: null,
  sportBudget: 200,
  focusRewardId: null,
  records: {},
  settings: { ...defaultSettings },
};

const baseDropCatalog = [
  { id: 'drop_food_50', threshold: 50, code: 'DROP 01', glyph: '◈', title: '补血箱', teaser: '这箱会偏向让你爽一下，但不会毁纪律。', rewardName: '未知掉落：补血奖励', rewardCost: 18, category: 'food', priority: 2, why: '你先扛住了 RM50，系统给你一口气。', revealTitle: '吃点好的许可证', revealCopy: '允许你用低罪恶感预算吃一餐舒服的，不用大手一挥。' },
  { id: 'drop_gear_120', threshold: 120, code: 'DROP 02', glyph: '⬡', title: '升级箱', teaser: '这箱通常会掉对表现有帮助的东西。', rewardName: '未知掉落：装备升级', rewardCost: 35, category: 'gear', priority: 3, why: '省下来的钱开始值得换成更强的工具。', revealTitle: '小型装备升级', revealCopy: '可以开始考虑那种会让你训练、工作、出门更顺手的小升级。' },
  { id: 'drop_exp_240', threshold: 240, code: 'DROP 03', glyph: '✦', title: '放风箱', teaser: '这箱比较像高质量体验，不是乱买。', rewardName: '未知掉落：体验通行证', rewardCost: 55, category: 'experience', priority: 2, why: '你不是不能爽，只是现在有资格爽。', revealTitle: '体验型奖励', revealCopy: '可以解锁一场你真的会记得的体验，不要拿去做无感消费。' },
  { id: 'drop_growth_420', threshold: 420, code: 'DROP 04', glyph: '⬢', title: '成长箱', teaser: '越后面的箱，越偏向让你更强而不是更爽。', rewardName: '未知掉落：成长投资', rewardCost: 88, category: 'growth', priority: 3, why: '这一阶段的省下，不该只换短爽，要开始换成长。', revealTitle: '成长投资许可', revealCopy: '这笔更适合拿去换会让你以后更强的课、工具、书或训练资源。' },
  { id: 'drop_boss_700', threshold: 700, code: 'DROP BOSS', glyph: '✪', title: 'Boss 箱', teaser: '这箱不是小奖励，是你真的靠纪律打出来的许可。', rewardName: '未知掉落：Boss 奖励', rewardCost: 150, category: 'other', priority: 3, why: '你已经不是在玩了，这种奖励要够记忆点。', revealTitle: 'Boss 级奖励', revealCopy: '可以规划一个真正让你兴奋的大件奖励，但必须是你会记住的。' },
];

const dropExpansionTemplates = [
  { glyph: '◈', title: '恢复箱', teaser: '越能守住，恢复也要越有质量。', rewardName: '未知掉落：高质量恢复', category: 'growth', priority: 2, revealTitle: '恢复升级许可', revealCopy: '换一次真正能恢复状态的安排，不拿去无意识消费。', why: '纪律不是只会硬扛，也要会把恢复变成下一轮表现。' },
  { glyph: '⬡', title: '装备箱', teaser: '只掉能减少阻力、提高表现的实用升级。', rewardName: '未知掉落：实用装备', category: 'gear', priority: 3, revealTitle: '实用装备许可', revealCopy: '可以买一件确实会频繁使用、能让训练或工作更顺的装备。', why: '你已经先证明纪律，才有资格用工具放大表现。' },
  { glyph: '✦', title: '体验箱', teaser: '这次掉落偏向值得记住的体验，不是短暂乱爽。', rewardName: '未知掉落：记忆体验', category: 'experience', priority: 2, revealTitle: '高质量体验许可', revealCopy: '安排一次有记忆点、对状态有帮助的体验，并先写好预算上限。', why: '省钱不是把生活清空，而是把钱集中到真正记得住的地方。' },
  { glyph: '⬢', title: '能力箱', teaser: '越后段越偏向技能、课程和长期能力。', rewardName: '未知掉落：能力投资', category: 'growth', priority: 3, revealTitle: '能力投资许可', revealCopy: '把奖励放到课程、工具、书或训练资源，让它继续产生回报。', why: '这一段纪律适合换成会留在你身上的能力。' },
  { glyph: '✪', title: '里程碑箱', teaser: '这是阶段 Boss 奖励，要够特别，也要守住预算。', rewardName: '未知掉落：里程碑奖励', category: 'other', priority: 3, revealTitle: '里程碑奖励许可', revealCopy: '选一个真正有纪念意义的奖励，但预算必须远低于你守住的钱。', why: '这一箱纪念的是身份升级，不是给冲动开后门。' },
];

function expandedDropThreshold(index) {
  if (index <= baseDropCatalog.length) return baseDropCatalog[index - 1].threshold;
  const extra = index - baseDropCatalog.length;
  return Math.round(700 + (extra * 250) + (Math.floor((extra - 1) / 5) * 250));
}

function buildDropCatalog(count = 20) {
  const catalog = [...baseDropCatalog];
  for (let index = baseDropCatalog.length + 1; index <= count; index += 1) {
    const template = dropExpansionTemplates[(index - baseDropCatalog.length - 1) % dropExpansionTemplates.length];
    const threshold = expandedDropThreshold(index);
    const boss = index % 5 === 0;
    catalog.push({
      ...template,
      id: `drop_dynamic_${index}`,
      threshold,
      code: boss ? `DROP BOSS ${index / 5}` : `DROP ${String(index).padStart(2, '0')}`,
      glyph: boss ? '✪' : template.glyph,
      rewardName: `${template.rewardName} ${index}`,
      rewardCost: Math.max(30, Math.round(threshold * (boss ? 0.12 : 0.08))),
    });
  }
  return catalog;
}

let dropCatalog = buildDropCatalog(20);

const habitDropCatalog = [
  { id: 'habit_drop_10', threshold: 10, code: 'HABIT DROP 01', glyph: '◈', title: '节奏箱', teaser: '先让你上瘾，不是先让你舒服。', rewardName: '习惯掉落：节奏强化', rewardCost: 12, category: 'growth', priority: 2, revealTitle: '节奏强化奖励', revealCopy: '这箱偏向小奖励，但重点是让你继续连击。' },
  { id: 'habit_drop_25', threshold: 25, code: 'HABIT DROP 02', glyph: '⬡', title: '升级箱', teaser: '开始给真正会让你变强的东西。', rewardName: '习惯掉落：升级强化', rewardCost: 22, category: 'growth', priority: 3, revealTitle: '升级强化奖励', revealCopy: '这箱偏向会提升表现、执行力、恢复力的东西。' },
  { id: 'habit_drop_50', threshold: 50, code: 'HABIT DROP 03', glyph: '✦', title: '封神箱', teaser: '不是奖励你做完，是奖励你已经变成那种人。', rewardName: '习惯掉落：封神级奖励', rewardCost: 45, category: 'experience', priority: 3, revealTitle: '封神级奖励', revealCopy: '这箱给的是更有记忆点的许可，不是随便爽一下。' },
];

const habitPenaltyCatalog = [
  {
    level: 1,
    stage: 'time',
    title: '补时惩罚',
    pool: [
      { title: '硬补 25 分钟', copy: '补做 25 分钟你最容易拖的低爽高价值任务。不开音乐，不开影片，不切走。', label: '补时 25 分钟' },
      { title: '加练 30 分钟', copy: '今天额外塞 30 分钟恢复、整理、复盘或基础训练。先做完，才算翻页。', label: '多塞 30 分钟' },
      { title: '当晚先清一件烂尾', copy: '今晚先把一个最烦的小烂尾收掉，不能带着它睡。', label: '清 1 个烂尾' },
    ],
  },
  {
    level: 2,
    stage: 'time',
    title: '压榨惩罚',
    pool: [
      { title: '无聊任务 40 分钟', copy: '补 40 分钟不会让你爽、但会让你更整齐更强的任务。别选你本来就爱做的。', label: '补时 40 分钟' },
      { title: '先做最硬那件', copy: '明天第一段专注时间必须先做最不想碰的事，做满 35 分钟后才能碰别的。', label: '最硬任务优先' },
      { title: '补一轮纪律训练', copy: '加一轮基础纪律训练：拉伸、收纳、复盘、清 inbox、清桌面，至少做满 4 项。', label: '纪律四连做' },
    ],
  },
  {
    level: 3,
    stage: 'money',
    title: '钱包出血',
    pool: [
      { title: '转 RM8 去锁定储蓄', copy: '把 RM8 转进你不会随便拿回来的储蓄区，当作今天漏做的代价。', label: '锁 RM8' },
      { title: '转 RM12 去未来基金', copy: '今天不是嘴上说重来，是直接转 RM12 去未来基金，提醒自己拖延有价。', label: '锁 RM12' },
      { title: '失败税 RM15', copy: '交 RM15 失败税，立刻转走，不准拖到明天。', label: '失败税 RM15' },
    ],
  },
  {
    level: 4,
    stage: 'money',
    title: '流血惩罚',
    pool: [
      { title: '锁 RM20', copy: '把 RM20 直接推进储蓄或投资，不准找理由拿回来。', label: '锁 RM20' },
      { title: '捐 RM15', copy: '如果你真的连续烂掉，就把 RM15 捐掉或转去一个你不会爽着花掉的地方。', label: '捐 RM15' },
      { title: '双倍失败税', copy: '今天直接扣 RM25，当作对摆烂的真实反馈。', label: '失败税 RM25' },
    ],
  },
  {
    level: 5,
    stage: 'social',
    title: '公开认账',
    pool: [
      { title: '写失败战报', copy: '把漏做原因和补救动作写进系统，不准只写“忙”。要写到你自己会不爽。', label: '写失败战报' },
      { title: '发给一个人', copy: '把今天没守住和你明天的补救计划，发给一个你不想丢脸的人。', label: '发 1 个 accountability' },
      { title: '公开承诺补回', copy: '选一个人或群，讲你明天几点前会补回哪一项。讲了就要做到。', label: '公开承诺补回' },
    ],
  },
];

let data = loadData();
let calendarDate = new Date();
let warCryIndex = 0;
let pendingLootImage = '';
let undoStack = [];
let pendingUndoToast = false;
let activeAIRewardId = null;
let activeAISportId = null;
let activeSportSkillId = null;
let pendingDropClaim = null;
let exerciseLibrary = { items: [], meta: {}, page: 1, cursors: [''], loading: false, query: '', bodyPart: '', equipment: '' };
let techniqueImageData = [];
let pendingSavingsAccountImage = '';
let savingsMode = 'month';
let sportSessionsPage = 1;
let secretDropPage = 1;
const SPORT_SESSIONS_PAGE_SIZE = 6;
const SECRET_DROP_PAGE_SIZE = 8;

function savingsRange() {
  const today = new Date();
  if (savingsMode === 'all') return { start: '', end: '', label: '全部时间' };
  if (savingsMode === 'day') return { start: keyOf(today), end: keyOf(today), label: '今天' };
  if (savingsMode === 'year') return { start: `${today.getFullYear()}-01-01`, end: `${today.getFullYear()}-12-31`, label: `${today.getFullYear()} 年` };
  if (savingsMode === 'range') {
    const start = document.querySelector('#savingsStartInput')?.value || keyOf(new Date(today.getFullYear(), today.getMonth(), 1));
    const end = document.querySelector('#savingsEndInput')?.value || keyOf(today);
    return { start, end, label: `${formatDateKey(start)} — ${formatDateKey(end)}` };
  }
  const start = keyOf(new Date(today.getFullYear(), today.getMonth(), 1));
  const end = keyOf(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  return { start, end, label: today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }) };
}

function openSavingForm(item = null) {
  document.querySelector('#savingEditId').value = item?.id || '';
  document.querySelector('#savingDialogTitle').textContent = item ? '修改这笔现金流' : '加一笔现金流';
  document.querySelector('#savingDateInput').value = item?.date || keyOf();
  document.querySelector('#savingTitleInput').value = item?.title || '';
  document.querySelector('#savingAmountInput').value = item?.amount || '';
  document.querySelector('#savingNoteInput').value = item?.note || '';
  const accountSelect = document.querySelector('#savingAccountInput');
  accountSelect.innerHTML = `<option value="">未分配账户</option>${(data.savingsAccounts || []).map((account) => `<option value="${account.id}">${escapeHtml(account.name)}</option>`).join('')}`;
  accountSelect.value = item?.accountId || '';
  document.querySelector(`input[name="savingType"][value="${item?.type || 'income'}"]`).checked = true;
  document.querySelector('#savingDialog').showModal();
}

function adjustAccountForEntry(entry, direction = 1) {
  if (!entry?.accountId) return;
  if (direction < 0 && !entry.accountEffectApplied) return;
  const account = (data.savingsAccounts || []).find((item) => item.id === entry.accountId);
  if (!account) return;
  const multiplier = account.type === 'creditCard'
    ? (entry.type === 'expense' ? 1 : -1)
    : (entry.type === 'income' ? 1 : -1);
  const signedAmount = multiplier * Number(entry.amount || 0) * direction;
  account.balance = Math.max(0, Number(account.balance || 0) + signedAmount);
  account.updatedAt = new Date().toISOString();
  entry.accountEffectApplied = direction > 0;
}

function openSavingsAccountForm(item = null) {
  pendingSavingsAccountImage = item?.image || '';
  document.querySelector('#savingsAccountEditId').value = item?.id || '';
  document.querySelector('#savingsAccountDialogTitle').textContent = item ? '更新资产账户' : '添加资产账户';
  document.querySelector('#savingsAccountNameInput').value = item?.name || '';
  document.querySelector('#savingsAccountTypeInput').value = item?.type || 'bank';
  document.querySelector('#savingsAccountBalanceInput').value = item?.balance ?? '';
  document.querySelector('#savingsAccountNoteInput').value = item?.note || '';
  const preview = document.querySelector('#savingsAccountImagePreview');
  preview.style.backgroundImage = pendingSavingsAccountImage ? `url('${pendingSavingsAccountImage}')` : '';
  preview.classList.toggle('has-image', Boolean(pendingSavingsAccountImage));
  document.querySelector('#savingsAccountDialog').showModal();
}

function renderSavingsAccounts(ledgerNet) {
  const accounts = data.savingsAccounts || [];
  const totalAssets = accounts.filter((account) => account.type !== 'creditCard').reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const totalLiabilities = accounts.filter((account) => account.type === 'creditCard').reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const netWorth = totalAssets - totalLiabilities;
  const difference = netWorth - ledgerNet;
  document.querySelector('#actualAssetTotal').textContent = money(totalAssets);
  document.querySelector('#creditLiabilityTotal').textContent = money(totalLiabilities);
  document.querySelector('#netWorthTotal').textContent = `${netWorth < 0 ? '− ' : ''}${money(Math.abs(netWorth))}`;
  document.querySelector('#accountReconcileValue').textContent = `${difference > 0 ? '+' : difference < 0 ? '−' : ''} RM ${money(Math.abs(difference))}`;
  document.querySelector('#accountReconcileValue').className = Math.abs(difference) < 0.005 ? 'aligned' : 'different';
  document.querySelector('#accountReconcileCopy').textContent = !accounts.length
    ? '先加入 RHB、TNG、ASNB 等账户，才能看到真实资产。'
    : Math.abs(difference) < 0.005
      ? '✓ 净资产与账本净现金流完全对齐。'
      : `净资产与账本相差 RM ${money(Math.abs(difference))}；可能来自开户前余额、漏记交易或账户间转账。`;
  const grid = document.querySelector('#savingsAccountGrid');
  grid.innerHTML = accounts.length ? accounts.map((account) => {
    const ratioBase = account.type === 'creditCard' ? totalLiabilities : totalAssets;
    const ratio = ratioBase > 0 ? Number(account.balance || 0) / ratioBase * 100 : 0;
    const fallback = { bank: 'BANK', ewallet: 'WALLET', investment: 'INVEST', cash: 'CASH', creditCard: 'CREDIT', other: 'ASSET' }[account.type] || 'ASSET';
    return `<article class="savings-account-card">
      <div class="savings-account-image ${account.image ? 'has-image' : ''}" ${account.image ? `style="background-image:url('${account.image}')"` : ''}><span>${account.image ? '' : fallback}</span></div>
      <div class="savings-account-main ${account.type === 'creditCard' ? 'credit-card' : ''}"><span>${escapeHtml(account.typeLabel || fallback)}</span><h4>${escapeHtml(account.name)}</h4><strong>${account.type === 'creditCard' ? '欠款 ' : ''}RM ${money(account.balance)}</strong><small>${ratio.toFixed(1)}% ${account.type === 'creditCard' ? '信用卡负债' : '总资产'} · 更新 ${formatDateKey(keyOf(new Date(account.updatedAt)))}</small><i><u style="width:${Math.min(100, ratio)}%"></u></i>${account.note ? `<p>${escapeHtml(account.note)}</p>` : ''}</div>
      <div class="savings-account-actions"><button data-edit-savings-account="${account.id}">修改</button><button data-delete-savings-account="${account.id}">删除</button></div>
    </article>`;
  }).join('') : '<div class="saving-empty">还没有资产账户。加入 RHB、TNG、ASNB 或现金，真实总资产才会开始计算。</div>';
}

function battleSpendSyncItems() {
  return Object.entries(data.records || {})
    .flatMap(([recordDate, record]) => getRecordTransactions(record).map((transaction) => ({ recordDate, transaction })))
    .sort((a, b) => b.recordDate.localeCompare(a.recordDate) || new Date(b.transaction.createdAt) - new Date(a.transaction.createdAt));
}

function battleSyncStatus(transactionId) {
  return data.savingsBattleSync?.[transactionId]?.status || 'pending';
}

function linkedSavingEntry(transactionId) {
  return (data.savingsEntries || []).find((entry) => entry.sourceTransactionId === transactionId);
}

function renderBattleSyncDialog() {
  const root = document.querySelector('#battleSyncContent');
  if (!root) return;
  const items = battleSpendSyncItems();
  const groups = [
    ['pending', '待同步', '逐笔决定要不要放进存钱账本'],
    ['approved', '已批准', '已经作为花费写入存钱账本'],
    ['declined', '已拒绝', '目前不计入存钱账本，之后仍可改回来'],
  ];
  document.querySelector('#battleSyncDialogCount').textContent = `${items.filter((item) => battleSyncStatus(item.transaction.id) === 'pending').length} 笔待同步`;
  root.innerHTML = groups.map(([status, title, copy]) => {
    const rows = items.filter((item) => battleSyncStatus(item.transaction.id) === status);
    const totalAmount = rows.reduce((sum, item) => sum + Number(item.transaction.amount || 0), 0);
    return `<section class="battle-sync-group ${status}">
      <div class="battle-sync-group-head"><div><span>${status.toUpperCase()}</span><h3>${title}</h3><p>${copy}</p></div><div class="battle-sync-group-total"><strong>${rows.length} 笔</strong><b>RM ${money(totalAmount)}</b></div></div>
      <div class="battle-sync-list">${rows.length ? rows.map(({ recordDate, transaction }) => {
        const linked = linkedSavingEntry(transaction.id);
        return `<article class="battle-sync-row">
          <div class="battle-sync-main"><span>${formatDateKey(recordDate)} · ${transaction.type === 'essential' ? '必要消费' : '冲动消费'}</span><strong>${escapeHtml(transaction.reason || '未命名消费')}</strong><small>${linked ? `账本项目：${escapeHtml(linked.title)}` : '来自战绩逐笔消费'}</small></div>
          <b>− RM ${money(transaction.amount)}</b>
          <div class="battle-sync-actions">
            ${status === 'pending' ? `<button class="approve" data-battle-sync-action="approved" data-battle-sync-id="${transaction.id}">批准同步</button><button data-battle-sync-action="declined" data-battle-sync-id="${transaction.id}">拒绝</button>` : ''}
            ${status === 'approved' ? `<button class="approve" data-battle-sync-action="approved" data-battle-sync-id="${transaction.id}">重新同步</button><button data-battle-sync-action="declined" data-battle-sync-id="${transaction.id}">改为拒绝</button><button data-battle-sync-action="pending" data-battle-sync-id="${transaction.id}">回待同步</button>` : ''}
            ${status === 'declined' ? `<button class="approve" data-battle-sync-action="approved" data-battle-sync-id="${transaction.id}">改为批准</button><button data-battle-sync-action="pending" data-battle-sync-id="${transaction.id}">回待同步</button>` : ''}
          </div>
        </article>`;
      }).join('') : '<div class="battle-sync-empty">这一栏目前没有记录。</div>'}</div>
    </section>`;
  }).join('');
}

function openBattleSyncDialog() {
  renderBattleSyncDialog();
  document.querySelector('#battleSyncDialog').showModal();
}

function setBattleSyncStatus(transactionId, status) {
  if (!requireCloudAuth(isZh() ? '同步战绩消费' : 'sync battle spending')) return;
  const source = battleSpendSyncItems().find((item) => item.transaction.id === transactionId);
  if (!source || !['pending', 'approved', 'declined'].includes(status)) return;
  checkpoint(status === 'approved' ? '批准战绩消费同步' : status === 'declined' ? '拒绝战绩消费同步' : '战绩消费回待同步');
  const existing = linkedSavingEntry(transactionId);
  if (status === 'approved') {
    const nativeEntry = {
      ...(existing || {}),
      id: existing?.id || crypto.randomUUID(),
      date: source.recordDate,
      type: 'expense',
      title: source.transaction.reason || '战绩消费',
      amount: Math.abs(Number(source.transaction.amount || 0)),
      note: `同步自战绩 · ${source.transaction.type === 'essential' ? '必要消费' : '冲动消费'}`,
      createdAt: existing?.createdAt || new Date().toISOString(),
      aiReview: existing?.aiReview || null,
      source: 'battle-record',
      sourceTransactionId: transactionId,
      sourceRecordDate: source.recordDate,
    };
    if (existing) adjustAccountForEntry(existing, -1);
    adjustAccountForEntry(nativeEntry, 1);
    if (existing) data.savingsEntries = data.savingsEntries.map((entry) => entry.id === existing.id ? nativeEntry : entry);
    else data.savingsEntries = [...(data.savingsEntries || []), nativeEntry];
  } else {
    if (existing) adjustAccountForEntry(existing, -1);
    data.savingsEntries = (data.savingsEntries || []).filter((entry) => entry.sourceTransactionId !== transactionId);
  }
  if (status === 'pending') delete data.savingsBattleSync[transactionId];
  else data.savingsBattleSync[transactionId] = { status, updatedAt: new Date().toISOString() };
  saveData();
  render();
  renderBattleSyncDialog();
  showToast(status === 'approved' ? '已同步到存钱账本' : status === 'declined' ? '已放进拒绝清单' : '已放回待同步', status === 'approved' ? `${source.transaction.reason} · RM ${money(source.transaction.amount)}` : '之后随时可以重新批准。');
}

function materializeRecurringSavings() {
  let changed = false;
  const today = new Date();
  const recurringSignature = (item) => [String(item.title || '').trim().toLowerCase(), item.type, Number(item.amount || 0).toFixed(2), Number(item.day || 1)].join('|');
  const recurringBySignature = new Map();
  data.recurringSavings = (data.recurringSavings || []).filter((item) => {
    const signature = recurringSignature(item);
    if (recurringBySignature.has(signature)) { changed = true; return false; }
    recurringBySignature.set(signature, item); return true;
  });
  const seenRecurring = new Set();
  data.savingsEntries = (data.savingsEntries || []).filter((entry) => {
    const recurring = (data.recurringSavings || []).find((item) => item.id === entry.recurringId || (String(entry.note || '').includes('固定项目') && item.title.trim().toLowerCase() === String(entry.title || '').trim().toLowerCase() && Number(item.amount) === Number(entry.amount) && item.type === entry.type));
    if (!recurring) return true;
    const key = `${recurringSignature(recurring)}|${String(entry.date || '').slice(0, 7)}`;
    entry.recurringId = recurring.id; entry.recurringKey = key;
    if (seenRecurring.has(key)) { changed = true; return false; }
    seenRecurring.add(key); return true;
  });
  (data.recurringSavings || []).filter((item) => item.active).forEach((item) => {
    const start = parseKey(item.startDate);
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth(), 1);
    while (cursor <= last) {
      const y = cursor.getFullYear(); const m = cursor.getMonth();
      const date = new Date(y, m, Math.min(item.day, new Date(y, m + 1, 0).getDate()));
      const recurringKey = `${recurringSignature(item)}|${y}-${String(m + 1).padStart(2, '0')}`;
      if (date <= today && !(data.savingsEntries || []).some((entry) => entry.recurringKey === recurringKey)) {
        const entry = { id: crypto.randomUUID(), date: keyOf(date), type: item.type, title: item.title, amount: item.amount, note: '每月固定项目 · 自动记入', recurringKey, recurringId: item.id, accountId: item.accountId || '', createdAt: new Date().toISOString(), aiReview: null };
        data.savingsEntries.push(entry);
        adjustAccountForEntry(entry, 1);
        changed = true;
      }
      cursor = new Date(y, m + 1, 1);
    }
  });
  if (changed) saveData();
}

function savingsContext(entry = null) {
  const entries = data.savingsEntries || [];
  const income = entries.filter((x) => x.type === 'income').reduce((s, x) => s + x.amount, 0);
  const expense = entries.filter((x) => x.type === 'expense').reduce((s, x) => s + x.amount, 0);
  const accounts = data.savingsAccounts || [];
  const actualAssets = accounts.filter((account) => account.type !== 'creditCard').reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const creditLiabilities = accounts.filter((account) => account.type === 'creditCard').reduce((sum, account) => sum + Number(account.balance || 0), 0);
  return { entry, totals: { income, expense, net: income - expense, actualAssets, creditLiabilities, netWorth: actualAssets - creditLiabilities }, accounts, recurring: data.recurringSavings || [], goal: data.savingsGoal, recent: entries.slice(-30), profile: 'Eric 重视自律、成长、运动、长期存款；要直接具体的马来西亚华人中文建议。' };
}

function showSavingsAI(title, status, content = '') {
  document.querySelector('#savingsAiTitle').textContent = title;
  document.querySelector('#savingsAiStatus').textContent = status;
  document.querySelector('#savingsAiContent').innerHTML = content || '<div class="ai-loading">AI 正在计算最适合你的判断……</div>';
  document.querySelector('#savingsAiDialog').showModal();
}

function savingsAIHtml(a = {}) {
  return `<div class="savings-ai-score"><strong>${Number(a.score || 0)}</strong><span>/ 100</span><b>${escapeHtml(a.verdict || '分析完成')}</b></div><div class="ai-verdict"><h3>${escapeHtml(a.summary || '')}</h3><p>${escapeHtml(a.why || a.cashflow || '')}</p></div><div class="ai-details"><div class="ai-detail"><b>最大风险</b><span>${escapeHtml(a.risk || '暂时没有明显风险')}</span></div><div class="ai-detail"><b>下一步</b><span>${escapeHtml(a.next_move || a.action || '继续记录')}</span></div>${a.forecast ? `<div class="ai-detail"><b>预测</b><span>${escapeHtml(a.forecast)}</span></div>` : ''}${a.label ? `<div class="ai-detail"><b>AI 标签</b><span>${escapeHtml(a.label)}</span></div>` : ''}</div>`;
}

async function analyzeSavings(entryId = '') {
  const entry = (data.savingsEntries || []).find((item) => item.id === entryId) || null;
  showSavingsAI(entry ? `AI 分析：${entry.title}` : 'AI 分析全部存款', entry ? '正在判断这笔收入／花费是否合理……' : '正在分析现金流、固定项目和储蓄速度……');
  try {
    const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: entry ? 'savingsEntry' : 'savingsOverall', context: savingsContext(entry) }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error);
    const review = JSON.parse(result.text.replace(/^```json\s*|\s*```$/g, '').trim());
    if (entry) entry.aiReview = review; else data.savingsAnalysis = review;
    saveData(); renderSavings();
    document.querySelector('#savingsAiStatus').textContent = entry ? '这笔现金流的判断' : '你的整体存款体检';
    document.querySelector('#savingsAiContent').innerHTML = savingsAIHtml(review);
  } catch (error) {
    document.querySelector('#savingsAiStatus').textContent = 'AI 暂时没连上';
    document.querySelector('#savingsAiContent').innerHTML = `<div class="empty-impact">${escapeHtml(String(error.message || error))}</div>`;
  }
}

async function openSavingsReward() {
  const goal = data.savingsGoal; if (!goal || goal.loading) return;
  const net = (data.savingsEntries || []).reduce((s, x) => s + (x.type === 'income' ? x.amount : -x.amount), 0);
  if (net < goal.amount) return;
  goal.loading = true; goal.error = ''; saveData(); renderSavings();
  try {
    const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'savingsReward', context: savingsContext() }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error);
    goal.reward = JSON.parse(result.text.replace(/^```json\s*|\s*```$/g, '').trim()); goal.openedAt = new Date().toISOString();
  } catch (error) { goal.error = String(error.message || error); }
  goal.loading = false; saveData(); renderSavings();
}

function renderSavings() {
  const list = document.querySelector('#savingsList');
  if (!list) return;
  materializeRecurringSavings();
  const pendingBattleSync = battleSpendSyncItems().filter((item) => battleSyncStatus(item.transaction.id) === 'pending').length;
  document.querySelector('#battleSyncCount').textContent = `${pendingBattleSync} 笔待同步`;
  document.querySelector('#battleSyncBtn').classList.toggle('has-pending', pendingBattleSync > 0);
  const entries = [...(data.savingsEntries || [])].sort((a, b) => b.date.localeCompare(a.date) || new Date(b.createdAt) - new Date(a.createdAt));
  const allNet = entries.reduce((sum, item) => sum + (item.type === 'income' ? item.amount : -item.amount), 0);
  renderSavingsAccounts(allNet);
  const range = savingsRange();
  const filtered = entries.filter((item) => (!range.start || item.date >= range.start) && (!range.end || item.date <= range.end));
  const income = filtered.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expense = filtered.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  document.querySelector('#savingsAllTime').textContent = money(allNet);
  document.querySelector('#savingsIncome').textContent = `RM ${money(income)}`;
  document.querySelector('#savingsExpense').textContent = `RM ${money(expense)}`;
  document.querySelector('#savingsNet').textContent = `${income - expense < 0 ? '− ' : ''}RM ${money(Math.abs(income - expense))}`;
  document.querySelector('#savingsCount').textContent = filtered.length;
  document.querySelector('#savingsRangeLabel').textContent = range.label;
  document.querySelectorAll('[data-savings-mode]').forEach((button) => button.classList.toggle('active', button.dataset.savingsMode === savingsMode));
  document.querySelector('.savings-date-controls').hidden = savingsMode !== 'range';
  if (!document.querySelector('#savingsStartInput').value) document.querySelector('#savingsStartInput').value = keyOf(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  if (!document.querySelector('#savingsEndInput').value) document.querySelector('#savingsEndInput').value = keyOf();
  const monthlyRecurringNet = (data.recurringSavings || []).filter((x) => x.active).reduce((s, x) => s + (x.type === 'income' ? x.amount : -x.amount), 0);
  const recentMonths = [...new Set(entries.map((x) => x.date.slice(0, 7)))].slice(0, 3);
  const averageNet = recentMonths.length ? recentMonths.reduce((sum, month) => sum + entries.filter((x) => x.date.startsWith(month) && !x.recurringId).reduce((s, x) => s + (x.type === 'income' ? x.amount : -x.amount), 0), 0) / recentMonths.length : 0;
  const projection = monthlyRecurringNet + averageNet;
  document.querySelector('#savingsProjection').textContent = `${projection < 0 ? '− ' : ''}RM ${money(Math.abs(projection))}`;
  document.querySelector('#savingsProjectionCopy').textContent = `固定项目净额 RM ${money(monthlyRecurringNet)}，再结合最近 ${recentMonths.length || 0} 个月实际记录。`;
  const goal = data.savingsGoal; const goalPct = goal?.amount ? Math.max(0, Math.min(100, allNet / goal.amount * 100)) : 0;
  document.querySelector('#savingsGoalTitle').textContent = goal ? `${goal.name} · RM ${money(goal.amount)}` : '还没设储蓄目标';
  document.querySelector('#savingsGoalProgress').textContent = `${Math.round(goalPct)}%`;
  document.querySelector('#savingsGoalBar').style.width = `${goalPct}%`;
  document.querySelector('#savingsRewardBox').innerHTML = !goal ? '<div class="saving-empty">先设置一个储蓄目标，系统才会生成神秘箱。</div>' : goal.reward ? `<article class="savings-mystery-box opened"><span>已开箱</span><div class="mystery-glyph">${escapeHtml(goal.reward.glyph || '✦')}</div><h4>${escapeHtml(goal.reward.title || 'AI 奖励')}</h4><p>${escapeHtml(goal.reward.reward || '')}</p><small>${escapeHtml(goal.reward.reason || '')}</small></article>` : `<article class="savings-mystery-box ${goalPct >= 100 ? 'unlocked' : ''}"><span>${goalPct >= 100 ? 'UNLOCKED' : 'LOCKED'}</span><div class="mystery-glyph">?</div><h4>${goalPct >= 100 ? '目标达成，等你领取' : '未知奖励'}</h4><p>${goalPct >= 100 ? 'AI 会在开箱这一刻，按你现在的财务状态决定奖励。' : `还差 RM ${money(Math.max(0, goal.amount - allNet))}`}</p><button data-open-savings-reward ${goalPct >= 100 && !goal.loading ? '' : 'disabled'}>${goal.loading ? 'AI 正在决定…' : '领取并开箱'}</button>${goal.error ? `<small>${escapeHtml(goal.error)}</small>` : ''}</article>`;
  const recurring = document.querySelector('#recurringList');
  recurring.innerHTML = (data.recurringSavings || []).length ? data.recurringSavings.map((item) => { const account = (data.savingsAccounts || []).find((candidate) => candidate.id === item.accountId); return `<div class="recurring-row"><div><strong>${escapeHtml(item.title)}</strong><small>每月 ${item.day} 号 · ${item.active ? '自动记入' : '已暂停'} · ${account ? escapeHtml(account.name) : '未分配账户'}</small></div><span class="${item.type}">${item.type === 'income' ? '+' : '−'} RM ${money(item.amount)}</span><div><button data-toggle-recurring="${item.id}">${item.active ? '暂停' : '启用'}</button><button data-edit-recurring="${item.id}">修改</button><button data-delete-recurring="${item.id}">删除</button></div></div>`; }).join('') : '<div class="saving-empty">还没有固定项目。设置后可自动入账和预测下月存款。</div>';
  list.innerHTML = filtered.length ? filtered.map((item) => { const account = (data.savingsAccounts || []).find((candidate) => candidate.id === item.accountId); return `<div class="saving-row"><span>${formatDateKey(item.date)}</span><div><strong>${escapeHtml(item.title)}</strong>${account ? `<small class="saving-account-label">◎ ${escapeHtml(account.name)}</small>` : ''}${item.note ? `<small>${escapeHtml(item.note)}</small>` : ''}${item.sourceTransactionId ? '<small class="saving-sync-label">⇄ 来自战绩同步</small>' : ''}${item.aiReview ? `<small class="saving-ai-label">✦ ${escapeHtml(item.aiReview.label || item.aiReview.verdict || 'AI 已分析')}</small>` : ''}</div><span class="saving-type ${item.type}">${item.type === 'income' ? '收入' : '花费'}</span><span class="saving-amount ${item.type}">${item.type === 'income' ? '+' : '−'} RM ${money(item.amount)}</span><div class="saving-actions"><button data-ai-saving="${item.id}">✦ AI</button><button data-edit-saving="${item.id}">修改</button><button data-delete-saving="${item.id}">删除</button></div></div>`; }).join('') : '<div class="saving-empty">这个范围还没有现金流记录。</div>';
}
let activeAIHabitId = null;
let managerState = { section: 'records', page: 1 };
let historyRangeState = {
  mode: 'month',
  start: '',
  end: '',
};
let habitReportRangeState = {
  mode: 'month',
  start: '',
  end: '',
};
let saveMirrorTimer = null;
let sidebarDesktopCollapsed = localStorage.getItem(SIDEBAR_STATE_KEY) === '1';
let cloudRealtimeUnsubscribe = null;
let cloudPollTimer = null;
let syncDialogMode = 'register';
let syncDialogReason = '';
let pendingVerificationEmail = '';
let authBootPrompted = false;
const THEME_PRESETS = {
  dark: {
    accent: '#b6f43b',
    accent2: '#79d917',
    bg: '#090a09',
    panel: '#101210',
    text: '#f2f5ef',
    danger: '#ff5e55',
  },
  light: {
    accent: '#6ea91a',
    accent2: '#4b8f14',
    bg: '#f3f6ee',
    panel: '#ffffff',
    text: '#141814',
    danger: '#d84a43',
  },
};
const cloud = {
  configured: hasSupabaseConfig(),
  authenticated: false,
  user: null,
  identities: [],
  lastSyncedAt: '',
  syncing: false,
  status: hasSupabaseConfig() ? 'LOCAL ONLY' : 'SUPABASE NOT READY',
  message: hasSupabaseConfig() ? '只存在这台机器' : 'Supabase 未配置',
};

const copy = {
  zh: {
    command: '今天',
    history: '战绩',
    loot: '战利品库',
    sports: '运动',
    manager: '数据管理',
    protocol: '规矩',
    settings: '设置',
    local: '全部资料只放在这台 Mac',
    online: '系统开着',
    battleTitle: '今天敢不敢 RM0 到底？',
    battleSubtitle: '不是没钱，是不要再给手痒控制你。',
    countdownLabel: '离今天结束还有',
    countdownStatus: '守着，别临尾香。',
    current: '现在连赢',
    best: '最强纪录',
    goat: '距离 GOAT',
    dayUnit: '天',
    identity: '今天的你',
    complete: '✓ 今天拿下',
    live: '● 还在守',
    survived: '拿下今天',
    spentMoney: '我破功了',
    archiveTitle: '赢过、输过，全都算数。',
    archiveSub: '不用装厉害。看清楚自己，下一次才会更强。',
    managerTitle: '全部资料，集中改。',
    managerSub: '漏记、按错、想重排、想删除，都在这里一次做完。',
    warningTitle: '今天还没结算。',
    warningCopy: '你设的提醒线快到了。不要放着不管。',
    quote: '“你不是没得买。你只是不再让一时手痒，决定你的未来。”',
    quoteBy: '— DISCIPLINE OS',
  },
};

function isZh() {
  return (data.language || 'zh') === 'zh';
}

function normalizeHexColor(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
}

function hexToRgb(hex) {
  const value = normalizeHexColor(hex, '#000000').slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function mixHex(from, to, weight = 0.5) {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  const ratio = Math.max(0, Math.min(1, weight));
  const channel = (a, b) => Math.round(a + (b - a) * ratio).toString(16).padStart(2, '0');
  return `#${channel(start.r, end.r)}${channel(start.g, end.g)}${channel(start.b, end.b)}`;
}

function alphaHex(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getThemePreset(mode = data.settings.themeMode) {
  return THEME_PRESETS[mode] || THEME_PRESETS.dark;
}

function getResolvedTheme() {
  const preset = getThemePreset(data.settings.themeMode);
  const accent = normalizeHexColor(data.settings.themeAccent, preset.accent);
  const accent2 = normalizeHexColor(data.settings.themeAccent2, preset.accent2);
  const bg = normalizeHexColor(data.settings.themeBg, preset.bg);
  const panel = normalizeHexColor(data.settings.themePanel, preset.panel);
  const text = normalizeHexColor(data.settings.themeText, preset.text);
  const danger = normalizeHexColor(data.settings.themeDanger, preset.danger);
  return {
    mode: data.settings.themeMode === 'light' ? 'light' : 'dark',
    accent,
    accent2,
    bg,
    panel,
    text,
    danger,
    panel2: mixHex(panel, bg, 0.24),
    line: mixHex(bg, text, 0.16),
    muted: mixHex(text, bg, 0.56),
    sidebarBg: alphaHex(bg, 0.88),
    accentSoft: alphaHex(accent2, data.settings.themeMode === 'light' ? 0.12 : 0.08),
  };
}

function applyTheme() {
  const theme = getResolvedTheme();
  const root = document.documentElement;
  root.style.setProperty('--bg', theme.bg);
  root.style.setProperty('--panel', theme.panel);
  root.style.setProperty('--panel2', theme.panel2);
  root.style.setProperty('--line', theme.line);
  root.style.setProperty('--muted', theme.muted);
  root.style.setProperty('--text', theme.text);
  root.style.setProperty('--green', theme.accent);
  root.style.setProperty('--green2', theme.accent2);
  root.style.setProperty('--red', theme.danger);
  root.style.setProperty('--sidebar-bg', theme.sidebarBg);
  root.style.setProperty('--accent-soft', theme.accentSoft);
  root.classList.toggle('theme-light', theme.mode === 'light');
  root.classList.toggle('theme-dark', theme.mode !== 'light');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bg);
}

function getRewardOutcome(item = {}) {
  if (item.outcome) return item.outcome;
  if (item.redeemedAt) return 'bought';
  return null;
}

function getRewardOutcomeAt(item = {}) {
  return item.outcomeAt || item.redeemedAt || item.earnedAt || null;
}

function isRewardBought(item = {}) {
  return getRewardOutcome(item) === 'bought';
}

function isRewardResolved(item = {}) {
  return Boolean(getRewardOutcome(item));
}

function rewardOutcomeLabel(item = {}) {
  const outcome = getRewardOutcome(item);
  if (outcome === 'bought') return isZh() ? '已买到' : 'Bought';
  if (outcome === 'earned') return isZh() ? '掉落已赢得' : 'Drop earned';
  if (outcome === 'later') return isZh() ? '以后再买' : 'Later';
  if (outcome === 'dropped') return isZh() ? '已放弃' : 'Dropped';
  return isZh() ? '进行中' : 'Active';
}

function normalizeData(raw = {}) {
  const next = {
    ...defaultData,
    ...raw,
    rewards: Array.isArray(raw.rewards) ? raw.rewards : [],
    secretDrops: Array.isArray(raw.secretDrops) ? raw.secretDrops : [],
    impulses: Array.isArray(raw.impulses) ? raw.impulses : [],
    sportsSessions: Array.isArray(raw.sportsSessions) ? raw.sportsSessions : [],
    sportSkills: Array.isArray(raw.sportSkills) ? raw.sportSkills : [],
    sportTechniqueReviews: Array.isArray(raw.sportTechniqueReviews) ? raw.sportTechniqueReviews : [],
    savingsEntries: Array.isArray(raw.savingsEntries) ? raw.savingsEntries : [],
    savingsAccounts: Array.isArray(raw.savingsAccounts) ? raw.savingsAccounts : [],
    savingsBattleSync: raw.savingsBattleSync && typeof raw.savingsBattleSync === 'object' ? raw.savingsBattleSync : {},
    recurringSavings: Array.isArray(raw.recurringSavings) ? raw.recurringSavings : [],
    habits: Array.isArray(raw.habits) ? raw.habits : [],
    habitDrops: Array.isArray(raw.habitDrops) ? raw.habitDrops : [],
    habitPerks: Array.isArray(raw.habitPerks) ? raw.habitPerks : [],
    habitPenalties: Array.isArray(raw.habitPenalties) ? raw.habitPenalties : [],
    habitLogs: raw.habitLogs && typeof raw.habitLogs === 'object' ? raw.habitLogs : {},
    habitGraceUses: Array.isArray(raw.habitGraceUses) ? raw.habitGraceUses : [],
    habitRecoveryUntil: raw.habitRecoveryUntil || null,
    records: raw.records && typeof raw.records === 'object' ? raw.records : {},
    settings: { ...defaultSettings, ...(raw.settings || {}) },
  };
  next.rewards = next.rewards.map((item) => ({
    ...item,
    createdAt: item.createdAt || new Date().toISOString(),
    outcome: item.outcome || (item.redeemedAt ? 'bought' : null),
    outcomeAt: item.outcomeAt || item.redeemedAt || null,
    redeemedAt: item.redeemedAt || null,
    image: item.image || '',
    sourceDropId: item.sourceDropId || null,
    sourceDropCode: item.sourceDropCode || '',
    dropThreshold: Number(item.dropThreshold || 0),
    dropAllowance: Number(item.dropAllowance || 0),
    earnedAt: item.earnedAt || null,
    dropAnalysis: item.dropAnalysis || null,
    needsDropChoice: Boolean(item.needsDropChoice),
  }));
  next.secretDrops = initializeSecretDrops(next.secretDrops);
  next.secretDrops.forEach((state) => {
    if (!state.claimedAt || !state.convertedRewardId) return;
    const reward = next.rewards.find((item) => item.id === state.convertedRewardId);
    const drop = dropCatalog.find((item) => item.id === state.id);
    if (!reward || !drop || reward.sourceDropId) return;
    reward.sourceDropId = drop.id;
    reward.sourceDropCode = drop.code;
    reward.dropThreshold = drop.threshold;
    reward.dropAllowance = drop.rewardCost;
    reward.earnedAt = state.claimedAt;
    reward.needsDropChoice = /^未知掉落[：:]/.test(reward.name || '');
    if (reward.needsDropChoice) {
      reward.aiAnalysis = null;
      reward.aiError = '';
      reward.aiChat = [];
    }
    if (!getRewardOutcome(reward)) {
      reward.outcome = 'earned';
      reward.outcomeAt = state.claimedAt;
    }
  });
  next.impulses = next.impulses.map((item) => ({
    ...item,
    createdAt: item.createdAt || new Date().toISOString(),
    resolution: item.resolution || null,
    resolvedAt: item.resolvedAt || null,
  }));
  next.sportsSessions = next.sportsSessions.map((item) => ({
    ...item,
    date: item.date || keyOf(),
    createdAt: item.createdAt || new Date().toISOString(),
    countSpend: item.countSpend ?? true,
    aiReview: item.aiReview || null,
    recurringKey: item.recurringKey || null,
    recurringId: item.recurringId || null,
    skillId: item.skillId || null,
    note: item.note || '',
    effort: Math.max(1, Math.min(10, Number(item.effort || 5))),
  }));
  next.sportSkills = next.sportSkills.map((item) => ({
    id: item.id || crypto.randomUUID(),
    name: item.name || '未命名运动',
    goal: item.goal || '',
    baseline: item.baseline || '',
    experience: item.experience || 'none',
    frequency: item.frequency || 'flexible',
    progress: Math.max(0, Math.min(100, Number(item.progress || item.aiAssessment?.progress_score || 0))),
    aiAssessment: item.aiAssessment || null,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
  }));
  next.sportTechniqueReviews = next.sportTechniqueReviews.map((item) => ({
    ...item,
    id: item.id || crypto.randomUUID(),
    skillId: item.skillId || null,
    movement: item.movement || '',
    createdAt: item.createdAt || new Date().toISOString(),
  }));
  next.sportSkills = next.sportSkills.map((skill) => {
    const profile = sportEvidenceProfile(skill, next);
    const correctedProgress = Math.min(Number(skill.progress || 0), profile.evidenceCeiling);
    if (correctedProgress === Number(skill.progress || 0)) return skill;
    return {
      ...skill,
      progress: correctedProgress,
      aiAssessment: skill.aiAssessment ? {
        ...skill.aiAssessment,
        progress_score: correctedProgress,
        delta: correctedProgress - Number(skill.progress || 0),
        score_guardrail: `旧分数缺乏足够能力证据，已从 ${Number(skill.progress || 0)} 校正到 ${correctedProgress}。能力证据上限 ${profile.evidenceCeiling}；训练 ${profile.totalLogs} 次本身不计分。`,
        evidence_snapshot: profile,
        correctedAt: new Date().toISOString(),
      } : null,
    };
  });
  next.savingsEntries = next.savingsEntries.map((item) => ({
    id: item.id || crypto.randomUUID(),
    date: item.date || keyOf(),
    type: item.type === 'expense' ? 'expense' : 'income',
    title: item.title || '',
    amount: Math.abs(Number(item.amount || 0)),
    note: item.note || '',
    createdAt: item.createdAt || new Date().toISOString(),
    aiReview: item.aiReview || null,
    recurringKey: item.recurringKey || null,
    recurringId: item.recurringId || null,
    source: item.source || '',
    sourceTransactionId: item.sourceTransactionId || '',
    sourceRecordDate: item.sourceRecordDate || '',
    accountId: item.accountId || '',
    accountEffectApplied: Boolean(item.accountEffectApplied),
  }));
  next.savingsAccounts = next.savingsAccounts.map((item) => ({
    id: item.id || crypto.randomUUID(),
    name: item.name || '未命名账户',
    type: ['bank', 'ewallet', 'investment', 'cash', 'creditCard', 'other'].includes(item.type) ? item.type : 'other',
    balance: Math.max(0, Number(item.balance || 0)),
    image: item.image || '',
    note: item.note || '',
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
  }));
  Object.entries(next.savingsBattleSync).forEach(([transactionId, decision]) => {
    if (!decision || !['approved', 'declined'].includes(decision.status)) delete next.savingsBattleSync[transactionId];
  });
  next.recurringSavings = next.recurringSavings.map((item) => ({
    id: item.id || crypto.randomUUID(), title: item.title || '', type: item.type === 'expense' ? 'expense' : 'income',
    amount: Math.abs(Number(item.amount || 0)), day: Math.max(1, Math.min(31, Number(item.day || 1))),
    startDate: item.startDate || keyOf(), accountId: item.accountId || '', active: item.active !== false, createdAt: item.createdAt || new Date().toISOString(),
  }));
  next.savingsGoal = raw.savingsGoal && typeof raw.savingsGoal === 'object' ? {
    id: raw.savingsGoal.id || crypto.randomUUID(), name: raw.savingsGoal.name || '储蓄目标', amount: Math.abs(Number(raw.savingsGoal.amount || 0)),
    createdAt: raw.savingsGoal.createdAt || new Date().toISOString(), openedAt: raw.savingsGoal.openedAt || null,
    reward: raw.savingsGoal.reward || null, loading: Boolean(raw.savingsGoal.loading), error: raw.savingsGoal.error || '',
  } : null;
  next.habits = next.habits.map((item) => ({
    id: item.id || crypto.randomUUID(),
    name: item.name || '',
    category: item.category || 'discipline',
    difficulty: Number(item.difficulty || 3),
    createdAt: item.createdAt || new Date().toISOString(),
    aiReview: item.aiReview || null,
  }));
  next.habitDrops = initializeHabitDrops(next.habitDrops);
  next.habitPerks = next.habitPerks.map((item) => ({
    id: item.id || crypto.randomUUID(),
    title: item.title || '',
    copy: item.copy || '',
    dropId: item.dropId || '',
    createdAt: item.createdAt || new Date().toISOString(),
    status: item.status || 'earned',
    usedAt: item.usedAt || null,
  }));
  next.habitPenalties = next.habitPenalties.map((item) => ({
    id: item.id || crypto.randomUUID(),
    forDate: item.forDate || keyOf(new Date(item.createdAt || new Date().toISOString())),
    showDate: item.showDate || keyOf(new Date(parseKey(item.forDate || keyOf(new Date(item.createdAt || new Date().toISOString()))).getTime() + 86400000)),
    habitIds: Array.isArray(item.habitIds) ? item.habitIds : item.habitId ? [item.habitId] : [],
    activeCount: Number(item.activeCount || item.totalHabits || 0),
    missedCount: Number(item.missedCount || (Array.isArray(item.habitIds) ? item.habitIds.length : item.habitId ? 1 : 0)),
    level: Number(item.level || 1),
    stage: item.stage || habitPenaltyCatalog[0].stage,
    title: item.title || habitPenaltyCatalog[0].pool[0].title,
    copy: item.copy || habitPenaltyCatalog[0].pool[0].copy,
    label: item.label || habitPenaltyCatalog[0].pool[0].label,
    teaser: item.teaser || (isZh() ? '昨天没全守住。今天轮到你开罚箱。' : 'You missed yesterday. A punishment box is waiting.'),
    status: item.status === 'active' ? 'revealed' : item.status === 'resolved' ? 'done' : item.status || 'hidden',
    createdAt: item.createdAt || new Date().toISOString(),
    revealedAt: item.revealedAt || (item.status === 'active' ? item.createdAt || new Date().toISOString() : null),
    resolvedAt: item.resolvedAt || null,
  }));
  next.habitLogs = Object.fromEntries(
    Object.entries(next.habitLogs).map(([date, value]) => [
      date,
      value && typeof value === 'object' ? value : {},
    ]),
  );
  next.records = Object.fromEntries(
    Object.entries(next.records).map(([key, item]) => [
      key,
      normalizeRecord(item),
    ]),
  );
  return next;
}

function normalizeRecord(item = {}) {
  const status = item?.status || 'win';
  let transactions = Array.isArray(item?.transactions) ? item.transactions : [];
  if (!transactions.length && status === 'spent' && Number(item?.amount || 0) > 0) {
    transactions = [{
      id: crypto.randomUUID(),
      amount: Number(item.amount || 0),
      reason: item.reason || '',
      type: item.type || 'impulse',
      createdAt: item.closedAt || new Date().toISOString(),
      aiReview: null,
    }];
  }
  transactions = transactions.map((tx) => ({
    id: tx.id || crypto.randomUUID(),
    amount: Number(tx.amount || 0),
    reason: tx.reason || '',
    type: tx.type || 'impulse',
    createdAt: tx.createdAt || new Date().toISOString(),
    aiReview: tx.aiReview || null,
  }));
  const amount = status === 'win' ? 0 : transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const reason = status === 'win'
    ? ''
    : transactions.map((tx) => tx.reason).filter(Boolean).join('、');
  return {
    ...item,
    status,
    transactions,
    amount,
    reason,
    type: status === 'win' ? 'zero' : (transactions[transactions.length - 1]?.type || item?.type || 'impulse'),
    aiReview: item?.aiReview || null,
  };
}

function syncRecordFields(record) {
  const normalized = normalizeRecord(record);
  Object.assign(record, normalized);
  return record;
}

function getRecordTransactions(record) {
  return Array.isArray(record?.transactions) ? record.transactions : [];
}

function hasMeaningfulLocalState() {
  return Boolean(
    (data.rewards || []).length
    || (data.secretDrops || []).some((item) => item.revealedAt || item.claimedAt)
    || (data.impulses || []).length
    || (data.sportsSessions || []).length
    || (data.sportSkills || []).length
    || (data.sportTechniqueReviews || []).length
    || (data.savingsEntries || []).length
    || (data.recurringSavings || []).length
    || data.savingsGoal
    || Object.keys(data.records || {}).length,
  );
}

function cloudErrorMessage(error) {
  const raw = String(error?.message || error?.code || 'REQUEST_FAILED');
  if (raw.includes('SUPABASE_NOT_CONFIGURED')) {
    return isZh()
      ? '还没填 Supabase 网址和 Anon Key。'
      : 'Supabase URL and anon key are still missing.';
  }
  if (raw.includes('Invalid login credentials')) {
    return isZh() ? '邮箱或密码不对。' : 'Email or password is incorrect.';
  }
  if (raw.includes('Email rate limit exceeded')) {
    return isZh() ? '寄信太频繁了，等一下再试。' : 'Too many emails sent. Try again later.';
  }
  if (raw.includes('User already registered')) {
    return isZh() ? '这个 email 已经注册过。' : 'This email is already registered.';
  }
  if (raw.includes('Email not confirmed')) {
    return isZh() ? '先去邮箱确认帐号，再回来登入。' : 'Confirm your email first, then log in.';
  }
  if (raw.includes('EMAIL_NOT_SET')) {
    return isZh() ? '还没拿到要确认的邮箱。重新注册或登入一次就好。' : 'No pending email found yet. Try registering or logging in again.';
  }
  if (raw.includes('Password should be at least')) {
    return isZh() ? '密码太短，至少要 8 个字。' : 'Password is too short. Use at least 8 characters.';
  }
  if (raw.includes('provider is not enabled') || raw.includes('Unsupported provider')) {
    return isZh() ? 'Google 登录还没在 Supabase 里开启。' : 'Google sign-in is not enabled in Supabase yet.';
  }
  if (raw.includes('Enable Manual Linking') || raw.includes('manual linking')) {
    return isZh() ? 'Supabase 还没开启 Manual Linking，所以暂时不能把 Google 绑进同一个帐号。' : 'Manual Linking is not enabled in Supabase yet, so Google cannot be linked into the same account.';
  }
  if (raw.includes('Identity is already linked') || raw.includes('already linked')) {
    return isZh() ? '这个 Google 已经绑过了。' : 'This Google identity is already linked.';
  }
  return raw;
}

function initializeSecretDrops(existing = []) {
  const claimedCount = existing.filter((item) => item?.claimedAt).length;
  let catalogSize = Math.max(20, existing.length);
  while (catalogSize - claimedCount <= 5) catalogSize += 5;
  dropCatalog = buildDropCatalog(catalogSize);
  return dropCatalog.map((drop) => {
    const saved = existing.find((item) => item.id === drop.id) || {};
    return {
      id: drop.id,
      revealedAt: saved.revealedAt || null,
      claimedAt: saved.claimedAt || null,
      convertedRewardId: saved.convertedRewardId || null,
    };
  });
}

function ensureSecretDropExpansion() {
  const current = Array.isArray(data.secretDrops) ? data.secretDrops : [];
  const claimedCount = current.filter((item) => item.claimedAt).length;
  let catalogSize = Math.max(20, dropCatalog.length, current.length);
  while (catalogSize - claimedCount <= 5) catalogSize += 5;
  if (catalogSize === dropCatalog.length && current.length === catalogSize) return false;
  dropCatalog = buildDropCatalog(catalogSize);
  data.secretDrops = dropCatalog.map((drop) => {
    const saved = current.find((item) => item.id === drop.id) || {};
    return {
      id: drop.id,
      revealedAt: saved.revealedAt || null,
      claimedAt: saved.claimedAt || null,
      convertedRewardId: saved.convertedRewardId || null,
    };
  });
  return true;
}

function initializeHabitDrops(existing = []) {
  return habitDropCatalog.map((drop) => {
    const saved = existing.find((item) => item.id === drop.id) || {};
    return {
      id: drop.id,
      revealedAt: saved.revealedAt || null,
      claimedAt: saved.claimedAt || null,
      convertedRewardId: saved.convertedRewardId || null,
    };
  });
}

function loadData() {
  try {
    return normalizeData(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  } catch {
    return normalizeData();
  }
}

function saveData({ mirror = true, cloudSync = true } = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if (!mirror && !cloudSync) return;
  clearTimeout(saveMirrorTimer);
  saveMirrorTimer = setTimeout(() => syncState({ mirror, cloudSync }), SYNC_DEBOUNCE_MS);
}

async function syncState({ mirror = true, cloudSync = true } = {}) {
  if (cloudSync && cloud.authenticated) {
    await syncStateToCloud();
  }
  if (mirror) {
    await syncStateToFile();
  }
}

async function syncStateToFile() {
  try {
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: data }),
    });
  } catch {}
}

async function syncStateToCloud({ silent = true } = {}) {
  if (!cloud.configured || !cloud.authenticated || cloud.syncing || !cloud.user) return;
  cloud.syncing = true;
  updateCloudUI();
  try {
    const result = await saveSupabaseState({
      user: cloud.user,
      state: data,
      name: data.name,
    });
    cloud.lastSyncedAt = result.updatedAt || new Date().toISOString();
    cloud.status = isZh() ? '云端已同步' : 'CLOUD SYNCED';
    cloud.message = isZh()
      ? `最后同步：${formatSyncTime(cloud.lastSyncedAt)}`
      : `Last synced ${formatSyncTime(cloud.lastSyncedAt)}`;
  } catch (error) {
    cloud.status = isZh() ? '同步失败' : 'SYNC FAILED';
    cloud.message = isZh() ? '资料先保留本机，等下再试。' : 'Local cache kept. Retry soon.';
    if (!silent) {
      showToast(isZh() ? '同步失败' : 'Sync failed', cloudErrorMessage(error));
    }
  } finally {
    cloud.syncing = false;
    updateCloudUI();
  }
}

function checkpoint(label) {
  undoStack.push({ label, data: JSON.parse(JSON.stringify(data)) });
  if (undoStack.length > 25) undoStack.shift();
  pendingUndoToast = true;
  updateUndoUI();
}

function updateUndoUI() {
  const btn = document.querySelector('#undoHeaderBtn');
  if (!btn) return;
  btn.disabled = !undoStack.length;
  document.querySelector('#undoCount').textContent = undoStack.length;
}

function undoLast() {
  const snapshot = undoStack.pop();
  if (!snapshot) return;
  data = normalizeData(snapshot.data);
  saveData();
  render();
  updateUndoUI();
  pendingUndoToast = false;
  showToast('已经撤销', `${snapshot.label} 已恢复。`);
}

function keyOf(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateKey(key, locale = isZh() ? 'zh-CN' : 'en-GB') {
  return parseKey(key).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    weekday: isZh() ? 'short' : undefined,
  });
}

function money(value) {
  return Number(value || 0).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function splitMoney(value) {
  const [whole, cents] = money(value).split('.');
  return [whole, `.${cents}`];
}

function formatSyncTime(value) {
  if (!value) return isZh() ? '还没同步' : 'not synced yet';
  return new Date(value).toLocaleString(isZh() ? 'zh-CN' : 'en-GB', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(value) {
  const el = document.createElement('div');
  el.textContent = String(value);
  return el.innerHTML;
}

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

function shortEmail(email = '') {
  if (!email) return isZh() ? '未登入' : 'Guest';
  if (email.length <= 28) return email;
  const [name, domain] = email.split('@');
  if (!domain) return email.slice(0, 28);
  return `${name.slice(0, 12)}…@${domain}`;
}

function getCloudProviders() {
  return [...new Set((cloud.identities || []).map((item) => item?.provider).filter(Boolean))];
}

function hasCloudProvider(provider) {
  return getCloudProviders().includes(provider);
}

async function refreshCloudIdentities() {
  if (!cloud.authenticated) {
    cloud.identities = [];
    return [];
  }
  try {
    cloud.identities = await getSupabaseUserIdentities();
  } catch {
    cloud.identities = [];
  }
  return cloud.identities;
}

function setSyncDialogMode(mode = 'register') {
  syncDialogMode = ['login', 'verify'].includes(mode) ? mode : 'register';
}

function requireCloudAuth(action = '') {
  if (cloud.authenticated) return true;
  setSyncDialogMode('register');
  pendingVerificationEmail = '';
  syncDialogReason = action
    ? (isZh()
      ? `要${action}，先注册或登入。`
      : `Please register or log in before you ${action}.`)
    : (isZh()
      ? '先注册或登入，系统才会开始替你记、替你同步。'
      : 'Register or log in before using the system.');
  renderSyncDialog();
  document.querySelector('#syncDialog')?.showModal();
  return false;
}

function hasOpenDialog() {
  return Array.from(document.querySelectorAll('dialog')).some((dialog) => dialog.open);
}

function stopCloudLiveSync() {
  cloudRealtimeUnsubscribe?.();
  cloudRealtimeUnsubscribe = null;
  if (cloudPollTimer) {
    clearInterval(cloudPollTimer);
    cloudPollTimer = null;
  }
}

function startCloudLiveSync() {
  stopCloudLiveSync();
  if (!cloud.authenticated || !cloud.user?.id) return;

  cloudRealtimeUnsubscribe = subscribeToSupabaseState(cloud.user?.email || '', ({ state, updatedAt }) => {
    if (!state) return;
    const nextStamp = updatedAt || '';
    if (nextStamp && cloud.lastSyncedAt && nextStamp === cloud.lastSyncedAt) return;
    data = normalizeData(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    cloud.lastSyncedAt = nextStamp || new Date().toISOString();
    cloud.message = isZh()
      ? `自动同步：${formatSyncTime(cloud.lastSyncedAt)}`
      : `Auto synced ${formatSyncTime(cloud.lastSyncedAt)}`;
    render();
  });

  cloudPollTimer = setInterval(async () => {
    if (!cloud.authenticated || cloud.syncing || document.hidden) return;
    try {
      const result = await fetchSupabaseState(cloud.user?.email || '', cloud.user?.id || '');
      if (!result.state) return;
      if (result.updatedAt && cloud.lastSyncedAt && result.updatedAt === cloud.lastSyncedAt) return;
      data = normalizeData(result.state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      cloud.lastSyncedAt = result.updatedAt || new Date().toISOString();
      cloud.message = isZh()
        ? `自动同步：${formatSyncTime(cloud.lastSyncedAt)}`
        : `Auto synced ${formatSyncTime(cloud.lastSyncedAt)}`;
      render();
    } catch {}
  }, 5000);
}

function updateCloudUI() {
  const pill = document.querySelector('.local-pill');
  const chip = document.querySelector('.status-chip');
  const syncBtn = document.querySelector('#syncBtn');
  if (pill) {
    pill.innerHTML = cloud.authenticated
      ? `<span></span> ${isZh() ? '帐号' : 'ACCOUNT'} · ${escapeHtml(shortEmail(cloud.user?.email || ''))}`
      : `<span></span> ${isZh() ? '先登入，资料才会真的开始算你的。' : 'Log in first so the data belongs to your account.'}`;
    pill.classList.toggle('cloud-live', cloud.authenticated);
  }
  if (chip) {
    chip.hidden = true;
  }
  if (syncBtn) {
    syncBtn.innerHTML = cloud.authenticated
      ? `<i class="account-avatar" aria-hidden="true">${escapeHtml((cloud.user?.name || cloud.user?.email || 'E').charAt(0).toUpperCase())}</i><span class="account-copy"><b>${isZh() ? '我的帐号' : 'My account'}</b><small>${escapeHtml(shortEmail(cloud.user?.email || ''))}</small></span><em aria-hidden="true">›</em>`
      : `<i class="account-avatar" aria-hidden="true">+</i><span class="account-copy"><b>${isZh() ? '登入 / 注册' : 'Login / Register'}</b><small>${isZh() ? '同步你的进度' : 'Sync your progress'}</small></span><em aria-hidden="true">›</em>`;
    syncBtn.classList.toggle('connected', cloud.authenticated);
    syncBtn.title = cloud.authenticated
      ? (isZh() ? '帐号中心' : 'Account center')
      : (isZh() ? '登入或注册' : 'Log in or register');
  }
  renderSyncDialog();
}

function registerPWA() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

function enforcePortraitControlDeck() {
  const deck = document.querySelector('.control-deck');
  const header = document.querySelector('main > header');
  if (!deck || !header) return;
  const portrait = window.innerWidth <= 760 && window.innerHeight > window.innerWidth;
  const buttons = ['.deck-menu', '.deck-account', '.deck-language'].map((selector) => deck.querySelector(selector)).filter(Boolean);
  if (!portrait) {
    deck.removeAttribute('style');
    buttons.forEach((button) => button.removeAttribute('style'));
    header.style.removeProperty('padding-top');
    return;
  }
  const force = (element, properties) => Object.entries(properties).forEach(([name, value]) => element.style.setProperty(name, value, 'important'));
  force(deck, {
    display: 'flex', visibility: 'visible', opacity: '1', position: 'fixed',
    left: '14px', right: '14px', top: '10px', width: 'auto', height: '60px',
    'min-height': '60px', 'z-index': '1000', 'flex-flow': 'row nowrap',
    'align-items': 'center', gap: '6px', padding: '6px', overflow: 'visible',
    'border-radius': '16px', border: '1px solid rgba(126,151,103,.32)',
    background: 'rgba(12,16,12,.98)', 'box-shadow': '0 14px 35px rgba(0,0,0,.48)',
  });
  const [menu, account, language] = buttons;
  force(menu, { display: 'flex', visibility: 'visible', opacity: '1', flex: '0 0 46px', width: '46px', height: '46px', 'align-items': 'center', 'justify-content': 'center' });
  force(account, { display: 'flex', visibility: 'visible', opacity: '1', flex: '1 1 auto', width: 'auto', height: '46px', 'min-width': '0', 'align-items': 'center' });
  force(language, { display: 'flex', visibility: 'visible', opacity: '1', flex: '0 0 58px', width: '58px', height: '46px', 'align-items': 'center', 'justify-content': 'center' });
  header.style.setProperty('padding-top', '84px', 'important');
}

function secondsUntilMidnight() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((end - now) / 1000));
}

function getStats() {
  const keys = Object.keys(data.records).sort();
  let run = 0;
  let best = 0;
  keys.forEach((key, index) => {
    const current = data.records[key];
    const prevKey = keys[index - 1];
    const consecutive = prevKey && parseKey(key) - parseKey(prevKey) === DAY;
    run = current.status === 'win' ? (consecutive ? run + 1 : 1) : 0;
    best = Math.max(best, run);
  });

  let current = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!data.records[keyOf(cursor)]) cursor = new Date(cursor.getTime() - DAY);
  while (data.records[keyOf(cursor)]?.status === 'win') {
    current += 1;
    cursor = new Date(cursor.getTime() - DAY);
  }

  const wins = keys.filter((key) => data.records[key].status === 'win').length;
  const xp = wins * 100;
  const saved = wins * Number(data.dailyTarget || 0);
  const rewardEarned = saved * Number(data.rewardRate || 0.1);
  const rewardSpent = (data.rewards || [])
    .filter((item) => isRewardBought(item) && !item.sourceDropId)
    .reduce((sum, item) => sum + Number(item.cost || 0), 0);
  return {
    current,
    best,
    wins,
    xp,
    saved,
    rewardEarned,
    rewardSpent,
    rewardBalance: Math.max(0, rewardEarned - rewardSpent),
  };
}

function rankFor(days) {
  const ranks = isZh()
    ? [
        { at: 0, next: 3, name: '刚开局', copy: '先拿下第一天，其他的等下再讲。' },
        { at: 3, next: 7, name: '热身完毕', copy: '三天不是运气，你开始有点东西了。' },
        { at: 7, next: 14, name: '开始上头', copy: '一个星期后，你已经不想给纪录断掉。' },
        { at: 14, next: 30, name: '够稳', copy: '手痒归手痒，你已经比较难乱来。' },
        { at: 30, next: 50, name: '很难搞', copy: '三十天都打不死你，冲动也会怕。' },
        { at: 50, next: 100, name: '狠角色', copy: '这已经不是忍，是你的作风。' },
        { at: 100, next: 100, name: 'GOAT', copy: '你把自律练成默认值了。' },
      ]
    : [
        { at: 0, next: 3, name: 'INITIATE', copy: 'The first decision changes everything.' },
        { at: 3, next: 7, name: 'BRONZE', copy: 'Momentum is real now.' },
        { at: 7, next: 14, name: 'SILVER', copy: 'You hate breaking the streak.' },
        { at: 14, next: 30, name: 'GOLD', copy: 'Impulse is losing its grip.' },
        { at: 30, next: 50, name: 'DIAMOND', copy: 'Hard to shake, harder to stop.' },
        { at: 50, next: 100, name: 'IMMORTAL', copy: 'This is becoming identity.' },
        { at: 100, next: 100, name: 'GOAT', copy: 'Discipline won.' },
      ];
  return [...ranks].reverse().find((rank) => days >= rank.at);
}

function getKilledImpulses() {
  return (data.impulses || []).filter((item) => item.resolution === 'killed');
}

function getImpactStats() {
  const stats = getStats();
  const intercepted = getKilledImpulses().reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const totalDays = Object.keys(data.records).length;
  const winRate = totalDays ? stats.wins / totalDays : 0;
  return {
    intercepted,
    total: stats.saved + intercepted,
    winRate,
    projection: Number(data.dailyTarget || 0) * 30 * winRate,
  };
}

function getHistoryRangeBounds() {
  const today = new Date();
  if (historyRangeState.mode === 'day') {
    const key = keyOf(today);
    return { start: key, end: key, label: isZh() ? '今天' : 'Today' };
  }
  if (historyRangeState.mode === 'year') {
    const start = `${today.getFullYear()}-01-01`;
    const end = `${today.getFullYear()}-12-31`;
    return { start, end, label: isZh() ? `${today.getFullYear()} 年` : `${today.getFullYear()}` };
  }
  if (historyRangeState.mode === 'range') {
    const start = historyRangeState.start || keyOf(today);
    const end = historyRangeState.end || start;
    return { start: start <= end ? start : end, end: start <= end ? end : start, label: isZh() ? '自订区间' : 'Custom range' };
  }
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return {
    start: `${today.getFullYear()}-${month}-01`,
    end: `${today.getFullYear()}-${month}-${String(lastDay).padStart(2, '0')}`,
    label: isZh() ? `${today.getFullYear()}年${today.getMonth() + 1}月` : today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
  };
}

function getHistoryRecordsInRange() {
  const { start, end } = getHistoryRangeBounds();
  return Object.entries(data.records)
    .filter(([key]) => key >= start && key <= end)
    .sort(([a], [b]) => b.localeCompare(a));
}

function getHistoryAnalytics() {
  const entries = getHistoryRecordsInRange();
  const allTransactions = entries.flatMap(([key, record]) => getRecordTransactions(record).map((tx) => ({ ...tx, date: key })));
  const impulseTotal = allTransactions.filter((tx) => tx.type !== 'essential').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const essentialTotal = allTransactions.filter((tx) => tx.type === 'essential').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const spendDays = entries.filter(([, record]) => record.status === 'spent').length;
  const winDays = entries.filter(([, record]) => record.status === 'win').length;
  const reasons = allTransactions.reduce((map, tx) => {
    const key = (tx.reason || (isZh() ? '未写原因' : 'No reason')).trim();
    map.set(key, (map.get(key) || 0) + Number(tx.amount || 0));
    return map;
  }, new Map());
  const topReason = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    ...getHistoryRangeBounds(),
    entries,
    total: impulseTotal + essentialTotal,
    impulseTotal,
    essentialTotal,
    spendDays,
    winDays,
    transactionCount: allTransactions.length,
    topReason: topReason ? topReason[0] : (isZh() ? '这段时间没有消费' : 'No spend in this range'),
  };
}

function getHabitReportRangeBounds() {
  const today = new Date();
  if (habitReportRangeState.mode === 'day') {
    const key = keyOf(today);
    return { start: key, end: key, label: isZh() ? '今天习惯战报' : 'Today habit report' };
  }
  if (habitReportRangeState.mode === 'year') {
    const start = `${today.getFullYear()}-01-01`;
    const end = `${today.getFullYear()}-12-31`;
    return { start, end, label: isZh() ? `${today.getFullYear()} 年习惯战报` : `${today.getFullYear()} habit report` };
  }
  if (habitReportRangeState.mode === 'range') {
    const start = habitReportRangeState.start || keyOf(today);
    const end = habitReportRangeState.end || start;
    return {
      start: start <= end ? start : end,
      end: start <= end ? end : start,
      label: isZh() ? '自订区间习惯战报' : 'Custom habit report',
    };
  }
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return {
    start: `${today.getFullYear()}-${month}-01`,
    end: `${today.getFullYear()}-${month}-${String(lastDay).padStart(2, '0')}`,
    label: isZh() ? `${today.getFullYear()}年${today.getMonth() + 1}月习惯战报` : `${today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} habit report`,
  };
}

function getDatesBetween(start, end) {
  const dates = [];
  for (let cursor = parseKey(start); keyOf(cursor) <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(keyOf(cursor));
  }
  return dates;
}

function getHabitReportAnalytics() {
  const { start, end, label } = getHabitReportRangeBounds();
  const habits = data.habits || [];
  const dates = getDatesBetween(start, end);
  const rows = habits.map((habit) => {
    const activeDates = dates.filter((dateKey) => keyOf(new Date(habit.createdAt || new Date().toISOString())) <= dateKey);
    const doneDates = activeDates.filter((dateKey) => getHabitDone(dateKey, habit.id));
    const opportunities = activeDates.length;
    const completed = doneDates.length;
    const rate = opportunities ? completed / opportunities : 0;
    const stats = getHabitStats(habit);
    return {
      habit,
      opportunities,
      completed,
      rate,
      stats,
    };
  }).filter((row) => row.opportunities > 0);
  const totalOpportunities = rows.reduce((sum, row) => sum + row.opportunities, 0);
  const totalCompleted = rows.reduce((sum, row) => sum + row.completed, 0);
  const perfectDays = dates.filter((dateKey) => {
    const summary = getHabitDaySummary(dateKey);
    return summary.activeCount > 0 && summary.passed;
  }).length;
  const failDays = dates.filter((dateKey) => {
    const summary = getHabitDaySummary(dateKey);
    return summary.activeCount > 0 && !summary.passed;
  }).length;
  const bestHabit = [...rows].sort((a, b) => (b.rate - a.rate) || (b.completed - a.completed))[0] || null;
  const weakestHabit = [...rows].sort((a, b) => (b.opportunities - b.completed) - (a.opportunities - a.completed) || (a.rate - b.rate))[0] || null;
  return {
    start,
    end,
    label,
    dates,
    rows,
    totalOpportunities,
    totalCompleted,
    completionRate: totalOpportunities ? totalCompleted / totalOpportunities : 0,
    perfectDays,
    failDays,
    bestHabit,
    weakestHabit,
    penaltiesTriggered: (data.habitPenalties || []).filter((item) => item.forDate >= start && item.forDate <= end).length,
  };
}

function getHabitLog(dateKey) {
  return data.habitLogs?.[dateKey] || {};
}

function getHabitDone(dateKey, habitId) {
  return Boolean(getHabitLog(dateKey)?.[habitId]);
}

function getHabitCompletionScore() {
  const habits = data.habits || [];
  if (!habits.length) return 0;
  return Object.values(data.habitLogs || {}).reduce((sum, log) => (
    sum + habits.filter((habit) => log?.[habit.id]).length
  ), 0);
}

function getHabitRank(score = getHabitCompletionScore()) {
  if (score >= 80) return isZh() ? '习惯怪物' : 'Habit Monster';
  if (score >= 45) return isZh() ? '钢铁执行者' : 'Steel Executor';
  if (score >= 20) return isZh() ? '连击者' : 'Combo Grinder';
  if (score >= 8) return isZh() ? '开始变硬' : 'Getting Harder';
  return isZh() ? '起步中' : 'Starting Up';
}

function getHabitDangerScore() {
  return (data.habits || []).reduce((sum, habit) => sum + getHabitStats(habit).currentMiss, 0);
}

function getHabitStats(habit) {
  const dates = Object.keys(data.habitLogs || {}).sort();
  let totalDone = 0;
  let streak = 0;
  let maxStreak = 0;
  let currentMiss = 0;
  let worstMiss = 0;
  let running = 0;
  let missingRun = 0;
  dates.forEach((date) => {
    const done = getHabitDone(date, habit.id);
    if (done) {
      totalDone += 1;
      running += 1;
      maxStreak = Math.max(maxStreak, running);
      missingRun = 0;
    } else {
      running = 0;
      missingRun += 1;
      worstMiss = Math.max(worstMiss, missingRun);
    }
  });
  const createdAt = new Date(habit.createdAt || new Date().toISOString());
  for (let cursor = new Date(); cursor >= createdAt; ) {
    const key = keyOf(cursor);
    if (getHabitDone(key, habit.id)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }
  for (let cursor = new Date(); cursor >= createdAt; ) {
    const key = keyOf(cursor);
    if (!getHabitDone(key, habit.id)) {
      currentMiss += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }
  return {
    totalDone,
    streak,
    maxStreak,
    currentMiss,
    worstMiss,
    todayDone: getHabitDone(keyOf(), habit.id),
  };
}

function getHabitPenaltyForLevel(level) {
  return habitPenaltyCatalog[Math.min(habitPenaltyCatalog.length, Math.max(1, level)) - 1];
}

function getHabitPenaltySeed(input = '') {
  return String(input).split('').reduce((sum, char, index) => sum + (char.charCodeAt(0) * (index + 11)), 0);
}

function getHabitsActiveOn(dateKey) {
  return (data.habits || []).filter((habit) => keyOf(new Date(habit.createdAt || new Date().toISOString())) <= dateKey);
}

function getHabitDaySummary(dateKey) {
  const activeHabits = getHabitsActiveOn(dateKey);
  const doneHabits = activeHabits.filter((habit) => getHabitDone(dateKey, habit.id));
  const missedHabits = activeHabits.filter((habit) => !getHabitDone(dateKey, habit.id));
  const categories = [...new Set(missedHabits.map((habit) => habit.category))];
  return {
    dateKey,
    activeHabits,
    activeCount: activeHabits.length,
    doneHabits,
    doneCount: doneHabits.length,
    missedHabits,
    missedCount: missedHabits.length,
    categories,
    passed: activeHabits.length > 0 && doneHabits.length === activeHabits.length,
  };
}

function getHabitFailureDays() {
  const today = keyOf();
  const habits = data.habits || [];
  if (!habits.length) return [];
  const earliest = habits.reduce((min, habit) => {
    const created = keyOf(new Date(habit.createdAt || new Date().toISOString()));
    return !min || created < min ? created : min;
  }, '');
  const days = [];
  for (let cursor = parseKey(earliest); keyOf(cursor) < today; cursor.setDate(cursor.getDate() + 1)) {
    days.push(keyOf(cursor));
  }
  return days
    .map((dateKey) => getHabitDaySummary(dateKey))
    .filter((summary) => summary.activeCount > 0 && !summary.passed);
}

function getHabitFailPressure(dateKey) {
  const failed = getHabitFailureDays().map((item) => item.dateKey);
  const index = failed.indexOf(dateKey);
  if (index === -1) return 1;
  let streak = 1;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const prev = parseKey(failed[cursor]);
    prev.setDate(prev.getDate() + 1);
    if (keyOf(prev) === failed[cursor + 1]) streak += 1;
    else break;
  }
  return streak;
}

function getHabitPenaltyLevel(summary) {
  if (data.habitRecoveryUntil && summary.dateKey <= data.habitRecoveryUntil) return 1;
  const pressure = getHabitFailPressure(summary.dateKey);
  if (pressure >= 4 || summary.missedCount === summary.activeCount) return 5;
  if (pressure >= 3 || summary.missedCount >= Math.max(3, summary.activeCount - 1)) return 4;
  if (pressure >= 2 || summary.missedCount >= 3) return 3;
  if (summary.missedCount >= 2) return 2;
  return 1;
}

function buildHabitPenalty(summary, existing = null) {
  const level = getHabitPenaltyLevel(summary);
  const catalog = getHabitPenaltyForLevel(level);
  const basePool = catalog.pool || [];
  const fitnessMiss = summary.categories.includes('fitness');
  const buildMiss = summary.categories.includes('build');
  const disciplineMiss = summary.categories.includes('discipline');
  let pool = basePool;
  if (catalog.stage === 'time' && (buildMiss || disciplineMiss)) {
    pool = [...basePool, { title: '先补项目硬任务', copy: '今天先补 45 分钟你最想逃的项目/纪律任务，不准先碰轻松的。', label: '先补 45 分钟硬任务' }];
  }
  if (catalog.stage === 'time' && fitnessMiss) {
    pool = [...pool, { title: '加一段体能补课', copy: '补 30 分钟基础体能、恢复或有氧，提醒自己身体类习惯不能空着。', label: '补 30 分钟体能' }];
  }
  if (catalog.stage === 'money' && buildMiss) {
    pool = [...pool, { title: '拖延税 RM18', copy: '把 RM18 转去成长基金，告诉自己项目类拖延不是没代价。', label: '成长税 RM18' }];
  }
  if (catalog.stage === 'social' && disciplineMiss) {
    pool = [...pool, { title: '写明天军令状', copy: '把明天要补回的纪律任务、时间、时长写下来，不能只有一句“明天做”。', label: '写军令状' }];
  }
  const seed = getHabitPenaltySeed(`${summary.dateKey}-${summary.missedHabits.map((habit) => habit.id).join('|')}-${level}`);
  const template = pool[seed % pool.length] || basePool[0];
  return {
    id: existing?.id || crypto.randomUUID(),
    forDate: summary.dateKey,
    showDate: keyOf(new Date(parseKey(summary.dateKey).getTime() + 86400000)),
    habitIds: summary.missedHabits.map((habit) => habit.id),
    activeCount: summary.activeCount,
    missedCount: summary.missedCount,
    level,
    stage: catalog.stage,
    title: template.title,
    copy: template.copy,
    label: template.label,
    teaser: isZh()
      ? `你在 ${formatDateKey(summary.dateKey)} 没有全清 ${summary.activeCount} 个习惯。隔天掉 1 个惩罚箱。`
      : `You missed a full clear on ${formatDateKey(summary.dateKey)}. One punishment box drops the next day.`,
    status: existing?.status || 'hidden',
    glyph: existing?.glyph || '✦',
    aiReview: existing?.aiReview || null,
    aiLoading: Boolean(existing?.aiLoading),
    aiError: existing?.aiError || '',
    animationAt: existing?.animationAt || null,
    createdAt: existing?.createdAt || new Date().toISOString(),
    revealedAt: existing?.revealedAt || null,
    resolvedAt: existing?.resolvedAt || null,
  };
}

function syncHabitPenaltyQueue() {
  const recoveryBefore = data.habitRecoveryUntil;
  const existing = new Map((data.habitPenalties || []).map((item) => [item.forDate, item]));
  const gracedDates = new Set((data.habitGraceUses || []).map((item) => item.date));
  const failures = getHabitFailureDays();
  const recent = failures.slice(-2);
  if (recent.length === 2) {
    const expected = parseKey(recent[0].dateKey); expected.setDate(expected.getDate() + 1);
    if (keyOf(expected) === recent[1].dateKey && (!data.habitRecoveryUntil || data.habitRecoveryUntil < keyOf())) {
      const until = new Date(); until.setDate(until.getDate() + 3); data.habitRecoveryUntil = keyOf(until);
    }
  }
  const next = failures.filter((summary) => !gracedDates.has(summary.dateKey)).map((summary) => buildHabitPenalty(summary, existing.get(summary.dateKey)));
  const before = JSON.stringify((data.habitPenalties || []).map((item) => ({
    forDate: item.forDate,
    status: item.status,
    title: item.title,
    copy: item.copy,
    revealedAt: item.revealedAt,
    resolvedAt: item.resolvedAt,
  })));
  const after = JSON.stringify(next.map((item) => ({
    forDate: item.forDate,
    status: item.status,
    title: item.title,
    copy: item.copy,
    revealedAt: item.revealedAt,
    resolvedAt: item.resolvedAt,
  })));
  data.habitPenalties = next.sort((a, b) => new Date(b.showDate) - new Date(a.showDate));
  return before !== after || recoveryBefore !== data.habitRecoveryUntil;
}

function applyLanguage() {
  const zh = isZh();
  document.documentElement.lang = zh ? 'zh-CN' : 'en';
  document.querySelector('#languageBtn').innerHTML = `<span>${zh ? 'EN' : '中文'}</span>`;
  document.querySelector('#languageBtn').title = zh ? 'Switch to English' : '切换为中文';

  const t = copy.zh;
  if (zh) {
    setText('#battleTitle', t.battleTitle);
    setText('#battleSubtitle', t.battleSubtitle);
    setText('#countdownLabel', t.countdownLabel);
    setText('#countdownStatus', t.countdownStatus);
    setText('#ribbonCurrentLabel', t.current);
    setText('#ribbonBestLabel', t.best);
    setText('#goatLabel', t.goat);
    setText('#ribbonDayUnit', t.dayUnit);
    setText('#goatRemainingLabel', t.dayUnit);
    setText('#identityLabel', t.identity);
    setText('#victoryTitle', '可以，今天是你的。');
    setText('#victoryCopy', '连赢 +1 · XP +100');
    setText('#todayMonth', '回到今天');
    document.querySelector('[data-view="command"]').innerHTML = `<span class="nav-icon">⌁</span> ${t.command}`;
    document.querySelector('[data-view="history"]').innerHTML = `<span class="nav-icon">◫</span> ${t.history}`;
    document.querySelector('[data-view="loot"]').innerHTML = `<span class="nav-icon">◆</span> ${t.loot}`;
    document.querySelector('[data-view="sports"]').innerHTML = `<span class="nav-icon">◉</span> ${t.sports}`;
    document.querySelector('[data-view="habits"]').innerHTML = `<span class="nav-icon">▤</span> 习惯打卡`;
    document.querySelector('[data-view="savings"]').innerHTML = '<span class="nav-icon">◒</span> 存钱账本';
    document.querySelector('[data-view="manager"]').innerHTML = `<span class="nav-icon">▣</span> ${t.manager}`;
    document.querySelector('[data-view="protocol"]').innerHTML = `<span class="nav-icon">◇</span> ${t.protocol}`;
    document.querySelector('#settingsBtn').innerHTML = `<span class="nav-icon">⚙</span> ${t.settings}`;
    document.querySelector('.local-pill').innerHTML = `<span></span> ${t.local}`;
    document.querySelector('.status-chip').innerHTML = `<span></span> ${t.online}`;
    document.querySelector('blockquote').innerHTML = `${t.quote}<span>${t.quoteBy}</span>`;
    document.querySelector('#historyView .page-heading h2').textContent = t.archiveTitle;
    document.querySelector('#historyView .page-heading p').textContent = t.archiveSub;
    document.querySelector('#managerView .manager-hero h2').textContent = t.managerTitle;
    document.querySelector('#managerView .manager-hero p').textContent = t.managerSub;
    document.querySelector('#openManagerBtn').textContent = '打开数据管理';
    document.querySelector('#addRecordBtn').textContent = '＋ 补一笔记录';
    document.querySelector('#managerAddBtn').textContent = '＋ 新增资料';
    document.querySelector('#spendDialog .modal-kicker').textContent = '记录一笔消费';
    document.querySelector('#spendDialog h2').textContent = '是什么让 RM0 破功了？';
    document.querySelector('#spendDialog p').textContent = '老实记下来。数据比内疚有用。';
    document.querySelector('#spendDialog label:nth-of-type(1)').textContent = '金额';
    document.querySelector('#spendDialog label:nth-of-type(2)').textContent = '原因';
    document.querySelector('#spendDialog label:nth-of-type(3)').textContent = '类型';
    document.querySelector('#reasonInput').placeholder = '咖啡、交通、午餐、宵夜……';
    document.querySelector('#spendDialog .type-options label:nth-child(1) span').textContent = '冲动';
    document.querySelector('#spendDialog .type-options label:nth-child(2) span').textContent = '必要';
    document.querySelector('#spendDialog .danger-btn').textContent = '记下这笔消费';
    setText('#pressureText', '纪律压力');
    setText('#missionLabel', '今日任务');
    setText('#todaySpendLabel', '今日已花');
    setText('#dayAiLabel', '今日 AI 裁判');
    setText('#dayAiOpenBtn', '看 AI 评语');
    setText('#currentStreakLabel', '现在连赢');
    document.querySelector('#streakUnitLabel').innerHTML = '天<br>没断过';
    setText('#personalBestLabel', '个人最佳');
    setText('#bestStreakUnit', '天');
    setText('#moneyDefendedLabel', '守住的金额');
    setText('#moneySavedHint', '按你每日目标估出来的真金白银');
    setText('#thisMonthLabel', '这个月');
    setText('#liveProgressLabel', '即时进度');
    setText('#battleLogLabel', '战绩月历');
    document.querySelector('#calendarWeek').innerHTML = '<span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>';
    document.querySelector('#legendWin').innerHTML = '<i class="win"></i> 守住 RM0';
    document.querySelector('#legendSpent').innerHTML = '<i class="spent"></i> 有消费';
    document.querySelector('#legendPending').innerHTML = '<i class="pending"></i> 还没记';
    setText('#saverRankLabel', '省钱称号');
    setText('#dashboardAddSportBtn', '＋ 记录一场运动');
    document.querySelector('#recordAiKicker').textContent = '当天 AI 裁判';
    document.querySelector('#recordAiTitle').textContent = '这一天的 AI 评语';
    document.querySelector('#historyView .history-head span:nth-child(1)').textContent = '日期';
    document.querySelector('#historyView .history-head span:nth-child(2)').textContent = '结果';
    document.querySelector('#historyView .history-head span:nth-child(3)').textContent = '金额';
    document.querySelector('#historyView .history-head span:nth-child(4)').textContent = '原因';
    document.querySelector('#historyView .history-head span:nth-child(5)').textContent = '操作';
    document.querySelector('#protocolView .section-label').innerHTML = '<i></i> 纪律规矩';
    document.querySelector('#protocolView .page-heading h2').textContent = '你的零消费规矩。';
    document.querySelector('#protocolView .page-heading p').textContent = '简单到能执行，够硬才能改变你。';
    document.querySelector('#settingsDialog .modal-kicker').textContent = '系统设置';
    document.querySelector('#settingsDialog h2').textContent = '调整你的系统。';
    document.querySelector('#settingsDialog>form>p').textContent = '这里只会改变估算方式，不会动到你的记录。';
    document.querySelector('#settingsDialog>form>label:nth-of-type(1)').textContent = '你的名字';
    document.querySelector('#settingsDialog>form>label:nth-of-type(2)').textContent = '每日储蓄目标';
    document.querySelector('#themeModeInput option[value="dark"]').textContent = '深色模式';
    document.querySelector('#themeModeInput option[value="light"]').textContent = '浅色模式';
    document.querySelector('#settingsForm .primary-btn').textContent = '保存设置';
    document.querySelector('#resetBtn').textContent = '清除全部本机资料';
  } else {
    setText('#battleTitle', 'Can you keep RM0 alive until midnight?');
    setText('#battleSubtitle', 'Your enemy is not poverty. It is the part of you demanding pleasure now.');
    setText('#countdownLabel', 'UNTIL TODAY IS DECIDED');
    setText('#countdownStatus', 'Hold. Do not surrender today.');
    setText('#ribbonCurrentLabel', 'CURRENT STREAK');
    setText('#ribbonBestLabel', 'ALL-TIME BEST');
    setText('#goatLabel', 'ROAD TO GOAT');
    setText('#ribbonDayUnit', 'DAYS');
    setText('#goatRemainingLabel', 'DAYS');
    setText('#identityLabel', 'TODAY\'S IDENTITY');
    setText('#victoryTitle', 'Today, you beat yourself.');
    setText('#victoryCopy', 'STREAK +1 · XP +100');
    setText('#todayMonth', 'TODAY');
    document.querySelector('[data-view="command"]').innerHTML = '<span class="nav-icon">⌁</span> Today';
    document.querySelector('[data-view="history"]').innerHTML = '<span class="nav-icon">◫</span> Records';
    document.querySelector('[data-view="loot"]').innerHTML = '<span class="nav-icon">◆</span> Reward Vault';
    document.querySelector('[data-view="sports"]').innerHTML = '<span class="nav-icon">◉</span> Sports';
    document.querySelector('[data-view="habits"]').innerHTML = '<span class="nav-icon">▤</span> Habit Mode';
    document.querySelector('[data-view="savings"]').innerHTML = '<span class="nav-icon">◒</span> Savings Ledger';
    document.querySelector('[data-view="manager"]').innerHTML = '<span class="nav-icon">▣</span> Data Control';
    document.querySelector('[data-view="protocol"]').innerHTML = '<span class="nav-icon">◇</span> Rules';
    document.querySelector('#settingsBtn').innerHTML = '<span class="nav-icon">⚙</span> Settings';
    document.querySelector('#protocolView .section-label').innerHTML = '<i></i> THE RULES';
    document.querySelector('#protocolView .page-heading h2').textContent = 'Your zero-spend protocol.';
    document.querySelector('#protocolView .page-heading p').textContent = 'Simple enough to obey. Hard enough to change you.';
    document.querySelector('#settingsDialog .modal-kicker').textContent = 'LOCAL SETTINGS';
    document.querySelector('#settingsDialog h2').textContent = 'Calibrate your system.';
    document.querySelector('#settingsDialog>form>p').textContent = 'This changes estimates only. Your records stay untouched.';
    document.querySelector('#themeModeInput option[value="dark"]').textContent = 'Dark mode';
    document.querySelector('#themeModeInput option[value="light"]').textContent = 'Light mode';
    document.querySelector('.local-pill').innerHTML = '<span></span> DATA STORED LOCALLY';
    document.querySelector('.status-chip').innerHTML = '<span></span> SYSTEM ONLINE';
    document.querySelector('blockquote').innerHTML = '“Discipline is choosing between what you want now and what you want most.”<span>— DISCIPLINE OS</span>';
    document.querySelector('#historyView .page-heading h2').textContent = 'Your battle history.';
    document.querySelector('#historyView .page-heading p').textContent = 'Every decision, stored only on this Mac.';
    document.querySelector('#managerView .manager-hero h2').textContent = 'All data, one control center.';
    document.querySelector('#managerView .manager-hero p').textContent = 'Backfill old days, fix mistakes, and clean every log from one place.';
    document.querySelector('#openManagerBtn').textContent = 'Open Data Control';
    document.querySelector('#addRecordBtn').textContent = '+ Add Record';
    document.querySelector('#dashboardAddSportBtn').textContent = '+ Log Workout';
    document.querySelector('#managerAddBtn').textContent = '+ Add';
    document.querySelector('#spendDialog .modal-kicker').textContent = 'LOG A TRANSACTION';
    document.querySelector('#spendDialog h2').textContent = 'What broke the zero?';
    document.querySelector('#spendDialog p').textContent = 'Record it honestly. Data beats guilt.';
    document.querySelector('#spendDialog label:nth-of-type(1)').textContent = 'AMOUNT';
    document.querySelector('#spendDialog label:nth-of-type(2)').textContent = 'REASON';
    document.querySelector('#spendDialog label:nth-of-type(3)').textContent = 'TYPE';
    document.querySelector('#reasonInput').placeholder = 'Coffee, transport, lunch...';
    document.querySelector('#spendDialog .type-options label:nth-child(1) span').textContent = 'IMPULSE';
    document.querySelector('#spendDialog .type-options label:nth-child(2) span').textContent = 'ESSENTIAL';
    document.querySelector('#spendDialog .danger-btn').textContent = 'RECORD SPEND';
    setText('#pressureText', 'DISCIPLINE PRESSURE');
    setText('#missionLabel', 'TODAY\'S MISSION');
    setText('#todaySpendLabel', 'SPENT TODAY');
    setText('#dayAiLabel', 'TODAY\'S AI JUDGE');
    setText('#dayAiOpenBtn', 'View AI review');
    setText('#currentStreakLabel', 'CURRENT STREAK');
    document.querySelector('#streakUnitLabel').innerHTML = 'DAYS<br>UNBROKEN';
    setText('#personalBestLabel', 'PERSONAL BEST');
    setText('#bestStreakUnit', 'DAYS');
    setText('#moneyDefendedLabel', 'MONEY DEFENDED');
    setText('#moneySavedHint', 'Estimated from your daily target');
    setText('#thisMonthLabel', 'THIS MONTH');
    setText('#liveProgressLabel', 'LIVE PROGRESS');
    setText('#battleLogLabel', 'BATTLE LOG');
    document.querySelector('#calendarWeek').innerHTML = '<span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>';
    document.querySelector('#legendWin').innerHTML = '<i class="win"></i> ZERO SPEND';
    document.querySelector('#legendSpent').innerHTML = '<i class="spent"></i> SPENT';
    document.querySelector('#legendPending').innerHTML = '<i class="pending"></i> NO RECORD';
    setText('#saverRankLabel', 'SAVER RANK');
    document.querySelector('#recordAiKicker').textContent = 'DAY JUDGE';
    document.querySelector('#recordAiTitle').textContent = 'AI day review';
    document.querySelector('#historyView .history-head span:nth-child(1)').textContent = 'DATE';
    document.querySelector('#historyView .history-head span:nth-child(2)').textContent = 'RESULT';
    document.querySelector('#historyView .history-head span:nth-child(3)').textContent = 'SPENT';
    document.querySelector('#historyView .history-head span:nth-child(4)').textContent = 'REASON';
    document.querySelector('#historyView .history-head span:nth-child(5)').textContent = 'ACTIONS';
  }
}

function updateClock() {
  const now = new Date();
  document.querySelector('#dateEyebrow').textContent = now
    .toLocaleDateString(isZh() ? 'zh-CN' : 'en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    })
    .toUpperCase()
    .replace(',', ' ·');
  document.querySelector('#greeting').textContent = isZh()
    ? `${data.name}，今天只准赢。`
    : `${data.name}. Winning is the only option today.`;
}

function render() {
  applyTheme();
  applyLanguage();
  updateClock();
  renderRules();
  renderDashboard();
  renderCalendar();
  renderHistory();
  renderImpact();
  renderLoot();
  renderSports();
  renderHabits();
  renderSavings();
  renderManager();
  updateUndoUI();
  updateCloudUI();
  updateSidebarToggleLabel();
}

function renderSyncDialog() {
  const shell = document.querySelector('#syncDialogState');
  if (!shell) return;
  const title = document.querySelector('#syncDialogTitle');
  const copy = document.querySelector('#syncDialogCopy');
  const supabaseConfig = getSupabasePublicConfig();
  const providers = getCloudProviders();
  const hasGoogleIdentity = hasCloudProvider('google');
  const hasEmailIdentity = hasCloudProvider('email');
  const identityChips = providers.length
    ? providers.map((provider) => `<span>${escapeHtml(provider === 'google' ? 'Google' : provider === 'email' ? (isZh() ? '密码' : 'Password') : provider)}</span>`).join('')
    : `<span>${isZh() ? '刚连上，正在读取绑定方式' : 'Reading linked sign-in methods'}</span>`;
  if (title) title.textContent = cloud.authenticated
    ? (isZh() ? '帐号中心' : 'Account center')
    : (isZh() ? '先登入，再开始记' : 'Log in before you start');
  if (copy) {
    copy.textContent = !cloud.configured
      ? (isZh() ? '先把 Supabase 接上，这套系统才能真的从 localhost 升级成手机电脑同帐号同步。' : 'Connect Supabase first to unlock real multi-device sync.')
      : cloud.authenticated
      ? (isZh() ? '现在开始全自动同步。电脑、手机、同帐号，看到的是同一份资料。' : 'Sync is automatic now. Desktop and phone on the same account see the same state.')
      : (syncDialogReason || (isZh() ? '注册或登入后，记录、修改、删除都会自动跟着你的帐号同步。' : 'After you log in, every change syncs automatically with your account.'));
  }
  shell.innerHTML = !cloud.configured
    ? `
      <div class="sync-status-card">
        <span>${isZh() ? '还差的东西' : 'What is still missing'}</span>
        <strong>${isZh() ? 'Supabase 还没接上' : 'Supabase is not connected yet'}</strong>
        <p>${isZh() ? '你只需要把 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 填进 .env.local，然后重开网站。' : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, then restart the app.'}</p>
      </div>
      <div class="sync-status-card">
        <span>${isZh() ? '预期项目' : 'Expected project'}</span>
        <strong>${escapeHtml(supabaseConfig.url || 'VITE_SUPABASE_URL')}</strong>
        <p>${isZh() ? '等你把项目资料给我，这里就会真的上线。' : 'Once you provide the project values, this will go live.'}</p>
      </div>
    `
    : cloud.authenticated
    ? `
      <div class="auth-duo account-duo">
        <section class="auth-showcase">
          <span class="auth-badge">${isZh() ? '帐号在线' : 'ACCOUNT ONLINE'}</span>
          <h3>${isZh() ? '现在开始，手机电脑同一份。' : 'One account. One live state.'}</h3>
          <p>${escapeHtml(cloud.message || (isZh() ? '现在开始所有记录都会自动同步。' : 'All changes sync automatically now.'))}</p>
          <div class="auth-benefits">
            <span>${isZh() ? '自动同步记录' : 'Auto sync records'}</span>
            <span>${isZh() ? '同帐号共用进度' : 'Shared progress'}</span>
            <span>${isZh() ? '改动会自动跟上' : 'Edits follow everywhere'}</span>
          </div>
        </section>
        <section class="auth-panel">
          <div class="sync-status-card account-card">
            <span>${isZh() ? '当前帐号' : 'Current account'}</span>
            <strong>${escapeHtml(cloud.user?.email || '')}</strong>
            <p>${isZh() ? '这份资料现在跟着这个 email 走。只要 email 一样，Google 和密码都会认成同一个 Discipline OS 身份。' : 'This state now follows this email. Same email means Google and password point to the same Discipline OS identity.'}</p>
            <div class="identity-chip-row">${identityChips}</div>
          </div>
          <div class="sync-actions-grid">
            <button type="button" class="ghost-btn full-btn" id="googleLinkBtn" ${hasGoogleIdentity ? 'disabled' : ''}>${hasGoogleIdentity ? (isZh() ? 'Google 已绑定' : 'Google linked') : (isZh() ? '把 Google 绑进这个帐号' : 'Link Google to this account')}</button>
            <button type="button" class="ghost-btn full-btn" id="logoutCloudBtn">${isZh() ? '登出云端帐号' : 'Log out cloud account'}</button>
          </div>
          <form id="cloudPasswordForm" class="sync-form active-sync-form inline-password-form">
            <label>${hasEmailIdentity ? (isZh() ? '更新密码' : 'Update password') : (isZh() ? '设一个密码' : 'Create a password')}</label>
            <input id="cloudPasswordInput" type="password" minlength="8" placeholder="${isZh() ? '至少 8 个字元' : 'At least 8 characters'}" required />
            <input id="cloudPasswordConfirmInput" type="password" minlength="8" placeholder="${isZh() ? '再输一次确认' : 'Confirm password'}" required />
            <button class="primary-btn full-btn" type="submit">${hasEmailIdentity ? (isZh() ? '更新这组密码' : 'Save new password') : (isZh() ? '设好后就能用密码登入' : 'Save password login')}</button>
            <small class="auth-inline-note">${hasEmailIdentity
              ? (isZh() ? '以后你可以继续用 Google，也可以直接用这组密码登入。' : 'After this, you can keep using Google or sign in directly with this password.')
              : (isZh() ? '如果你是先用 Google 进来的，设好这里后，以后同一个 email 也能直接用密码登入。' : 'If you came in with Google first, setting this lets the same email sign in with a password too.')}</small>
          </form>
        </section>
      </div>
    `
    : `
      <div class="auth-duo">
        <section class="auth-showcase">
          <span class="auth-badge">${isZh() ? '正式线上同步版' : 'ONLINE SYNC READY'}</span>
          <h3>${isZh() ? '现在记下来的，都会跟着你。' : 'Everything you record finally belongs to you.'}</h3>
          <p>${isZh()
            ? '用同一个 email，Google 登录和密码登录都会认成同一份 Discipline OS 进度。Mac、iPhone、朋友的帐号，各自独立。'
            : 'Use the same email and Google / password logins will point to the same Discipline OS progress. Mac, iPhone, and every customer stay separated by account.'}</p>
          <div class="auth-benefits">
            <span>${isZh() ? '跨装置自动同步' : 'Cross-device auto sync'}</span>
            <span>${isZh() ? '同 email 共用身份' : 'Same-email identity'}</span>
            <span>${isZh() ? '多人帐号互不串' : 'Safe multi-user accounts'}</span>
          </div>
        </section>
        <section class="auth-panel">
          <div class="sync-mode-tabs">
            <button type="button" class="sync-tab ${syncDialogMode === 'register' ? 'active' : ''}" data-sync-mode="register">${isZh() ? '注册' : 'Register'}</button>
            <button type="button" class="sync-tab ${syncDialogMode === 'login' ? 'active' : ''}" data-sync-mode="login">${isZh() ? '登入' : 'Login'}</button>
          </div>
          <div class="oauth-block auth-google-block">
            <button type="button" class="ghost-btn oauth-btn" id="googleAuthBtn">G ${isZh() ? 'Google 一键继续' : 'Continue with Google'}</button>
            <small>${isZh() ? '重点只有一个：以后 Google 和密码都继续用同一个 email。' : 'Simple rule: keep using the same email for Google and password sign-in.'}</small>
          </div>
          <div class="sync-divider"><span>${isZh() ? '或' : 'OR'}</span></div>
          <form id="cloudRegisterForm" class="sync-form ${syncDialogMode === 'register' ? 'active-sync-form' : ''}">
            <label>${isZh() ? '你的名字' : 'Your name'}</label>
            <input id="cloudRegisterName" type="text" maxlength="30" placeholder="Eric" />
            <label>Email</label>
            <input id="cloudRegisterEmail" type="email" maxlength="120" placeholder="erictan827@gmail.com" required />
            <label>${isZh() ? '密码' : 'Password'}</label>
            <input id="cloudRegisterPassword" type="password" minlength="8" placeholder="${isZh() ? '至少 8 个字元' : 'At least 8 characters'}" required />
            <button class="primary-btn full-btn" type="submit">${isZh() ? '注册并开始使用' : 'Register and start'}</button>
          </form>
          <form id="cloudLoginForm" class="sync-form ${syncDialogMode === 'login' ? 'active-sync-form' : ''}">
            <label>Email</label>
            <input id="cloudLoginEmail" type="email" maxlength="120" placeholder="erictan827@gmail.com" required />
            <label>${isZh() ? '密码' : 'Password'}</label>
            <input id="cloudLoginPassword" type="password" minlength="8" placeholder="${isZh() ? '输入云端密码' : 'Enter your cloud password'}" required />
            <button class="primary-btn full-btn" type="submit">${isZh() ? '登入并进入系统' : 'Log in and enter'}</button>
          </form>
          <div class="sync-form ${syncDialogMode === 'verify' ? 'active-sync-form' : ''}">
            <div class="sync-status-card verify-card">
              <span>${isZh() ? '下一步' : 'Next step'}</span>
              <strong>${isZh() ? '先去确认邮箱' : 'Confirm your email first'}</strong>
              <p>${isZh()
                ? `刚刚这次注册 / 登录还差最后一步。先去 ${escapeHtml(shortEmail(pendingVerificationEmail || '你的邮箱'))} 收确认信，点开后再回来登入。`
                : `There is one step left. Open the verification email sent to ${escapeHtml(shortEmail(pendingVerificationEmail || 'your inbox'))}, then come back and log in.`}</p>
            </div>
            <div class="sync-actions-grid">
              <button type="button" class="primary-btn full-btn" id="resendConfirmBtn">${isZh() ? '重发确认信' : 'Resend confirmation email'}</button>
              <button type="button" class="ghost-btn full-btn" data-sync-mode="login">${isZh() ? '我确认好了，现在登入' : 'I confirmed it, log me in'}</button>
              <button type="button" class="ghost-btn full-btn" data-sync-mode="register">${isZh() ? '换一个 email' : 'Use another email'}</button>
            </div>
          </div>
        </section>
      </div>
    `;
}

function renderDashboard() {
  const stats = getStats();
  const todayKey = keyOf();
  const today = data.records[todayKey] || { amount: 0 };
  const battleDay = Math.max(1, Object.keys(data.records).length + (data.records[keyOf()] ? 0 : 1));
  document.querySelector('#battleCode').textContent = isZh()
    ? `第 ${String(battleDay).padStart(3, '0')} 天 · RM0 生存战`
    : `DAY ${String(battleDay).padStart(3, '0')} · ZERO SPEND WAR`;
  document.querySelector('#ribbonCurrent').textContent = stats.current;
  document.querySelector('#ribbonBest').textContent = stats.best;
  document.querySelector('#goatRemaining').textContent = Math.max(0, 100 - stats.current);
  document.querySelector('#goatBar').style.width = `${Math.min(100, stats.current)}%`;
  document.querySelector('#identityValue').textContent = isZh()
    ? today.status === 'win'
      ? '胜利者'
      : today.amount > 0
        ? '反击者'
        : '挑战者'
    : today.status === 'win'
      ? 'VICTOR'
      : today.amount > 0
        ? 'COMEBACK'
        : 'CHALLENGER';
  document.querySelector('#pressureValue').textContent = today.status === 'win'
    ? (isZh() ? '拿下' : 'SECURED')
    : today.amount > 0
      ? (isZh() ? '反击' : 'COMEBACK')
      : (isZh() ? '拉满' : 'MAX');
  const [whole, cents] = splitMoney(today.amount);
  document.querySelector('#todaySpend').textContent = whole;
  document.querySelector('#todayCents').textContent = cents;
  document.querySelector('#todayState').textContent = today.status === 'win' ? (isZh() ? '赢了' : 'SECURED') : today.amount > 0 ? (isZh() ? '今天破功' : 'BROKEN') : (isZh() ? 'RM0 还在' : 'UNBROKEN');
  document.querySelector('#liveLabel').textContent = today.status === 'win'
    ? (isZh() ? '✓ 今天拿下' : '✓ COMPLETE')
    : today.amount > 0
      ? (isZh() ? '× 今天破功' : '× BROKEN')
      : (isZh() ? '● 还在守' : '● LIVE');
  const survivedBtn = document.querySelector('#survivedBtn');
  const spentBtn = document.querySelector('#spentBtn');
  survivedBtn.innerHTML = today.status === 'win'
    ? `<span>✓</span> ${isZh() ? '今日已锁定' : 'DAY SECURED'}`
    : today.amount > 0
      ? `<span>⛔</span> ${isZh() ? '今天已经破功' : 'ZERO ALREADY BROKEN'}`
    : `<span>✓</span> ${isZh() ? '我今天守住了' : 'I SURVIVED TODAY'}`;
  survivedBtn.disabled = today.status === 'win' || Number(today.amount || 0) > 0;
  spentBtn.innerHTML = `${isZh() ? '我花钱了' : 'I spent money'} <span>→</span>`;
  document.querySelector('#missionCopy').innerHTML = today.status === 'win'
    ? (isZh() ? '今天赢了。<br>明天继续守。' : 'Mission complete.<br>Return tomorrow.')
    : today.amount > 0
      ? (isZh() ? '今天输了就认。<br>明天重开。' : 'The streak resets.<br>The mission continues.')
      : (isZh() ? '守到睡觉，今天就是你的。' : 'Keep the zero alive until sleep.');
  document.querySelector('#lockHint').textContent = today.status === 'win'
    ? (isZh() ? '今天已经写进战绩。' : 'Today is already locked in.')
    : today.amount > 0
      ? (isZh() ? '今天已经破功，只能认账，不能再装 RM0。' : 'Zero is already broken today.')
      : (isZh() ? '按下，就是把今天写进战绩。' : 'Press once to lock today in.');

  document.querySelector('#currentStreak').textContent = stats.current;
  document.querySelector('#bestStreak').textContent = stats.best;
  const nextMilestone = [3, 7, 14, 30, 50, 100].find((value) => value > stats.current) || 100;
  document.querySelector('#streakBar').style.width = `${Math.min(100, (stats.current / nextMilestone) * 100)}%`;
  document.querySelector('#streakTarget').textContent = stats.current >= 100 ? 'GOAT STATUS' : `${isZh() ? '下一个纪录' : 'NEXT'}: ${nextMilestone}`;

  const [savedWhole, savedCents] = splitMoney(stats.saved);
  document.querySelector('#moneySaved').textContent = savedWhole;
  document.querySelector('#savedCents').textContent = savedCents;
  const monthPrefix = keyOf().slice(0, 7);
  const monthWins = Object.keys(data.records).filter((key) => key.startsWith(monthPrefix) && data.records[key].status === 'win').length;
  document.querySelector('#monthSaved').textContent = `+ RM ${money(monthWins * Number(data.dailyTarget || 0))}`;

  const level = Math.floor(stats.xp / 500) + 1;
  const levelXp = stats.xp % 500;
  document.querySelector('#sideLevel').textContent = String(level).padStart(2, '0');
  document.querySelector('#sideXp').textContent = `${levelXp} / 500 XP`;
  document.querySelector('#sideXpBar').style.width = `${levelXp / 5}%`;

  const rank = rankFor(stats.current);
  const span = Math.max(1, rank.next - rank.at);
  const rankPct = stats.current >= 100 ? 100 : Math.round(((stats.current - rank.at) / span) * 100);
  document.querySelector('#rankName').textContent = rank.name;
  document.querySelector('#rankCopy').textContent = rank.copy;
  document.querySelector('#rankProgressText').textContent = stats.current >= 100 ? (isZh() ? '已经封顶' : 'MAXIMUM RANK') : `${stats.current} / ${rank.next} ${isZh() ? '天' : 'DAYS'}`;
  document.querySelector('#rankPercent').textContent = `${rankPct}%`;
  document.querySelector('#rankBar').style.width = `${rankPct}%`;
  renderDayAiStrip(todayKey, today);
}

function renderCalendar() {
  const current = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
  const startDay = (current.getDay() + 6) % 7;
  const gridStart = new Date(current);
  gridStart.setDate(current.getDate() - startDay);
  const monthName = current.toLocaleDateString(isZh() ? 'zh-CN' : 'en-GB', {
    year: 'numeric',
    month: 'long',
  });
  document.querySelector('#monthTitle').textContent = monthName;

  const todayKey = keyOf();
  const nodes = [];
  for (let index = 0; index < 42; index += 1) {
    const day = new Date(gridStart.getTime() + index * DAY);
    const key = keyOf(day);
    const record = data.records[key];
    const classes = ['day'];
    if (day.getMonth() !== current.getMonth()) classes.push('other');
    if (key === todayKey) classes.push('today');
    if (record?.status === 'win') classes.push('win');
    if (record?.status === 'spent') classes.push('spent');
    if (day > new Date()) classes.push('future');
    nodes.push(`<button class="${classes.join(' ')}" data-calendar-key="${key}">${day.getDate()}</button>`);
  }
  document.querySelector('#calendarDays').innerHTML = nodes.join('');
}

function renderHistory() {
  const list = document.querySelector('#historyList');
  const analytics = getHistoryAnalytics();
  const entries = analytics.entries;
  const summary = document.querySelector('#historySummary');
  const rangeLabel = document.querySelector('#historyRangeLabel');
  const startInput = document.querySelector('#historyStartInput');
  const endInput = document.querySelector('#historyEndInput');
  if (startInput && endInput) {
    startInput.value = historyRangeState.start;
    endInput.value = historyRangeState.end;
    const enabled = historyRangeState.mode === 'range';
    startInput.disabled = !enabled;
    endInput.disabled = !enabled;
  }
  if (summary) {
    summary.innerHTML = `
      <article class="panel history-stat"><span>${isZh() ? '总花费' : 'Total spent'}</span><strong>RM ${money(analytics.total)}</strong><small>${analytics.label}</small></article>
      <article class="panel history-stat"><span>${isZh() ? '必要 / 冲动' : 'Essential / Impulse'}</span><strong>RM ${money(analytics.essentialTotal)} / RM ${money(analytics.impulseTotal)}</strong><small>${analytics.transactionCount}${isZh() ? ' 笔记录' : ' transactions'}</small></article>
      <article class="panel history-stat"><span>${isZh() ? '破功 / 守住' : 'Spent / Win days'}</span><strong>${analytics.spendDays} / ${analytics.winDays}</strong><small>${isZh() ? '这段时间的日数表现' : 'Day outcome split'}</small></article>
      <article class="panel history-stat"><span>${isZh() ? '花最多在' : 'Top spend reason'}</span><strong>${escapeHtml(analytics.topReason)}</strong><small>${isZh() ? '最容易漏血的点' : 'Your biggest leak in this range'}</small></article>
    `;
  }
  if (rangeLabel) rangeLabel.textContent = analytics.label;
  if (!entries.length) {
    list.innerHTML = `<div class="empty-history">${isZh() ? '还没有战绩。今天 RM0，就是你的第一胜。' : 'No records yet. Secure today to begin.'}</div>`;
    return;
  }
  list.innerHTML = entries
    .map(([key, record]) => `
      <div class="history-item">
        <span>${formatDateKey(key).toUpperCase()}</span>
        <span class="result-pill ${record.status}">${record.status === 'win' ? (isZh() ? '赢' : 'ZERO') : (isZh() ? '破功' : 'SPENT')}</span>
        <span>${record.amount ? `RM ${money(record.amount)}` : 'RM 0.00'}</span>
        <span>${record.status === 'win' ? '—' : `${escapeHtml(record.reason || '—')} · ${getRecordTransactions(record).length}${isZh() ? ' 笔' : ' tx'}`}</span>
        <span class="record-actions">
          <button class="mini-action" data-add-record-transaction="${key}" title="${isZh() ? '这一天再加一笔' : 'Add another transaction'}"><span>＋</span><small>${isZh() ? '加笔' : 'Add'}</small></button>
          <button class="mini-action mini-action-ai" data-ai-record="${key}" title="${isZh() ? 'AI 评语' : 'AI review'}"><span>✦</span><small>AI</small></button>
          <button class="mini-action mini-action-edit" data-edit-record="${key}" title="${isZh() ? '修改' : 'Edit'}"><span>✎</span><small>${isZh() ? '改' : 'Edit'}</small></button>
          <button class="mini-action mini-action-delete delete-record" data-delete-record="${key}" title="${isZh() ? '删除' : 'Delete'}"><span>×</span><small>${isZh() ? '删' : 'Delete'}</small></button>
        </span>
      </div>
    `)
    .join('');
}

function renderHabitReport() {
  const analytics = getHabitReportAnalytics();
  const rangeLabel = document.querySelector('#habitReportRangeLabel');
  const summary = document.querySelector('#habitReportSummary');
  const list = document.querySelector('#habitReportList');
  const startInput = document.querySelector('#habitReportStartInput');
  const endInput = document.querySelector('#habitReportEndInput');
  if (rangeLabel) rangeLabel.textContent = analytics.label;
  if (startInput && endInput) {
    startInput.value = habitReportRangeState.start;
    endInput.value = habitReportRangeState.end;
    const enabled = habitReportRangeState.mode === 'range';
    startInput.disabled = !enabled;
    endInput.disabled = !enabled;
  }
  if (summary) {
    summary.innerHTML = `
      <article class="panel history-stat"><span>${isZh() ? '总完成率' : 'Completion rate'}</span><strong>${Math.round(analytics.completionRate * 100)}%</strong><small>${analytics.totalCompleted} / ${analytics.totalOpportunities}</small></article>
      <article class="panel history-stat"><span>${isZh() ? '全清天数' : 'Perfect-clear days'}</span><strong>${analytics.perfectDays}</strong><small>${isZh() ? '当天全部习惯都守住' : 'Every active habit secured'}</small></article>
      <article class="panel history-stat"><span>${isZh() ? '失守天数' : 'Fail days'}</span><strong>${analytics.failDays}</strong><small>${isZh() ? `触发了 ${analytics.penaltiesTriggered} 次惩罚结算` : `${analytics.penaltiesTriggered} penalty settlements`}</small></article>
      <article class="panel history-stat"><span>${isZh() ? '本段最稳' : 'Steadiest habit'}</span><strong>${escapeHtml(analytics.bestHabit?.habit.name || (isZh() ? '还没有' : 'None yet'))}</strong><small>${analytics.bestHabit ? `${Math.round(analytics.bestHabit.rate * 100)}%` : '—'}</small></article>
    `;
  }
  if (!list) return;
  if (!analytics.rows.length) {
    list.innerHTML = `<div class="empty-history">${isZh() ? '这段时间还没有足够的习惯数据。' : 'Not enough habit data in this range yet.'}</div>`;
    return;
  }
  list.innerHTML = analytics.rows
    .sort((a, b) => (b.rate - a.rate) || (b.completed - a.completed))
    .map((row) => {
      const misses = Math.max(0, row.opportunities - row.completed);
      const performance = row.rate >= 0.9
        ? (isZh() ? '稳得狠' : 'Locked in')
        : row.rate >= 0.7
          ? (isZh() ? '有在守' : 'Holding')
          : row.rate >= 0.45
            ? (isZh() ? '时好时坏' : 'Shaky')
            : (isZh() ? '一直漏' : 'Leaking');
      const risk = misses === 0
        ? (isZh() ? '无压力' : 'No pressure')
        : misses <= 2
          ? (isZh() ? '轻压' : 'Light')
          : misses <= 5
            ? (isZh() ? '偏危险' : 'Risky')
            : (isZh() ? '快炸了' : 'Critical');
      return `
        <div class="history-item habit-report-row">
          <span>${escapeHtml(row.habit.name)}</span>
          <span>${row.completed} / ${row.opportunities}</span>
          <span>${Math.round(row.rate * 100)}%</span>
          <span>${performance} · ${isZh() ? `最佳连击 ${row.stats.maxStreak}` : `Best streak ${row.stats.maxStreak}`}</span>
          <span>${risk}</span>
        </div>
      `;
    })
    .join('');
}

function renderImpact() {
  const impact = getImpactStats();
  const milestones = [100, 300, 500, 1000, 3000, 10000];
  const next = milestones.find((value) => impact.total < value) || milestones[milestones.length - 1];
  const [whole, cents] = splitMoney(impact.total);
  document.querySelector('#totalImpact').textContent = whole;
  document.querySelector('#totalImpactCents').textContent = cents;
  document.querySelector('#impactMeaning').textContent = isZh()
    ? 'RM0 赢下来的、还有真正挡掉的冲动，都会算进去。'
    : 'Every defended RM0 day and every killed impulse counts.';
  document.querySelector('#impactLevel').textContent = isZh() ? `冲下一个 RM${next}` : `Push to RM${next}`;
  document.querySelector('#impactPercent').textContent = `${Math.min(100, Math.round((impact.total / next) * 100))}%`;
  document.querySelector('#impactBar').style.width = `${Math.min(100, (impact.total / next) * 100)}%`;
  document.querySelector('#impactRemaining').textContent = impact.total >= next
    ? (isZh() ? '这一关已经过了。' : 'This level is cleared.')
    : (isZh() ? `还差 RM${money(next - impact.total)}` : `RM${money(next - impact.total)} to go`);
  document.querySelector('#impactPush').textContent = isZh()
    ? '你要的不是感觉，是一笔一笔真的留下来。'
    : 'This is proof, not vibes.';
  document.querySelector('#impactZero').textContent = `RM ${money(getStats().saved)}`;
  document.querySelector('#impactIntercepted').textContent = `RM ${money(impact.intercepted)}`;
  document.querySelector('#impactWinRate').textContent = `${Math.round(impact.winRate * 100)}%`;
  document.querySelector('#impactProjection').textContent = `RM ${money(impact.projection)}`;
  renderImpactFeed();
  renderAchievementDots(impact.total, milestones);
}

function renderAchievementDots(total, milestones) {
  document.querySelector('#achievementDots').innerHTML = milestones
    .map((value) => `<span class="achievement-dot ${total >= value ? 'done' : ''}" data-label="RM${value}"></span>`)
    .join('');
}

function renderImpactFeed() {
  const events = [];
  Object.entries(data.records).forEach(([key, record]) => {
    if (record.status === 'win') {
      events.push({
        at: record.closedAt || `${key}T23:00:00`,
        icon: '✓',
        title: isZh() ? '今天 RM0 守住了' : 'Zero held',
        sub: key,
        value: Number(data.dailyTarget || 0),
        negative: false,
      });
    } else {
      getRecordTransactions(record).forEach((tx) => {
        events.push({
          at: tx.createdAt || record.closedAt || `${key}T23:00:00`,
          icon: tx.type === 'essential' ? '•' : '×',
          title: tx.type === 'essential' ? (isZh() ? '必要消费记下' : 'Essential spend logged') : (isZh() ? '冲动消费记下' : 'Impulse spend logged'),
          sub: tx.reason || key,
          value: Number(tx.amount || 0),
          negative: true,
        });
      });
    }
  });
  getKilledImpulses().forEach((item) => {
    events.push({
      at: item.resolvedAt || item.createdAt,
      icon: '✦',
      title: isZh() ? `忍住没买：${item.name}` : `Killed impulse: ${item.name}`,
      sub: isZh() ? '冲动被你挡掉了' : 'Impulse defeated',
      value: Number(item.cost || 0),
      negative: false,
    });
  });
  (data.rewards || [])
    .filter((item) => isRewardResolved(item))
    .forEach((item) => {
      const outcome = getRewardOutcome(item);
      events.push({
        at: getRewardOutcomeAt(item),
        icon: '◆',
        title: outcome === 'bought'
          ? (isZh() ? `已买到：${item.name}` : `Bought: ${item.name}`)
          : outcome === 'later'
            ? (isZh() ? `以后再买：${item.name}` : `Later: ${item.name}`)
            : (isZh() ? `已放弃：${item.name}` : `Dropped: ${item.name}`),
        sub: outcome === 'bought'
          ? (isZh() ? '这是你正式赢回来的' : 'Earned and purchased')
          : outcome === 'later'
            ? (isZh() ? '你先把决定留给未来' : 'Deferred for later')
            : (isZh() ? '你主动放弃了这个目标' : 'You let this target go'),
        value: Number(item.cost || 0),
        negative: outcome === 'bought',
      });
    });
  events.sort((a, b) => new Date(b.at) - new Date(a.at));
  document.querySelector('#impactActionCount').textContent = isZh()
    ? `${events.length} 个有效行动`
    : `${events.length} valid actions`;
  document.querySelector('#impactFeed').innerHTML = events.length
    ? events.slice(0, 10).map((event) => `
        <article class="impact-item ${event.negative ? 'negative' : ''}">
          <b>${event.icon}</b>
          <div>
            <strong>${escapeHtml(event.title)}</strong>
            <span>${escapeHtml(event.sub)}</span>
          </div>
          <em>${event.negative ? '-' : '+'} RM ${money(event.value)}</em>
        </article>
      `).join('')
    : `<div class="empty-impact">${isZh() ? '你一有动作，这里就会开始累积。' : 'Actions will show up here.'}</div>`;
}

function rewardAIContext(reward) {
  const stats = getStats();
  return {
    product: {
      name: reward.name,
      cost: reward.cost,
      priority: reward.priority,
      category: reward.category,
      why: reward.why,
      earnedFromDrop: Boolean(reward.sourceDropId),
      dropCode: reward.sourceDropCode || '',
      dropThreshold: Number(reward.dropThreshold || 0),
      dropAllowance: Number(reward.dropAllowance || 0),
      dropStageAnalysis: reward.dropAnalysis || null,
    },
    eric: {
      dailySavingTarget: data.dailyTarget,
      currentStreak: stats.current,
      bestStreak: stats.best,
      totalSaved: stats.saved,
      rewardBalance: stats.rewardBalance,
      killedImpulses: getKilledImpulses().length,
    },
    rule: reward.sourceDropId
      ? 'This reward was already earned from an unlocked mystery drop. Judge whether the chosen item fits that drop stage; do not ask Eric to earn or save for it a second time.'
      : 'Only 10% of defended money becomes guilt-free reward money.',
  };
}

async function analyzeReward(id, open = false) {
  const reward = (data.rewards || []).find((item) => item.id === id);
  if (!reward) return;
  if (reward.needsDropChoice) {
    showToast(
      isZh() ? '先补选具体奖励' : 'Choose the actual reward first',
      isZh() ? '这箱已经赢到；等你写下真正要拿的东西后，AI 才会针对它评估。' : 'This drop is already earned. AI will assess the actual item after you choose it.',
    );
    return;
  }
  reward.aiLoading = true;
  saveData();
  renderLoot();
  if (open) openAIAdvisor(id);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        action: 'analyze',
        context: rewardAIContext(reward),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    reward.aiAnalysis = JSON.parse(result.text.replace(/^```json\s*|\s*```$/g, '').trim());
    reward.aiError = '';
  } catch (error) {
    reward.aiError = error.name === 'AbortError'
      ? 'AI 分析超时了。不是你按错，是这次请求卡太久。重试一次；如果还这样，我再继续帮你查。'
      : error.message === 'OPENAI_API_KEY_NOT_CONFIGURED'
      ? 'AI 还没连上：请把 OPENAI_API_KEY 放进 .env.local，然后重开本地服务器。'
      : error.message === 'GROQ_API_KEY_NOT_CONFIGURED'
        ? 'Groq 还没连上：请把 GROQ_API_KEY 放进 .env.local，然后重开本地服务器。'
      : error.message === 'AI_REQUEST_TIMEOUT'
        ? 'AI 那边这次超时了。通常不是你这边的问题，重试一次看看。'
      : `AI 分析失败：${error.message}`;
  } finally {
    clearTimeout(timeoutId);
    reward.aiLoading = false;
    saveData();
    renderLoot();
    if (activeAIRewardId === id) renderAIAdvisor(reward);
  }
}

function openAIAdvisor(id) {
  const reward = (data.rewards || []).find((item) => item.id === id);
  if (!reward || reward.needsDropChoice) {
    showToast(
      isZh() ? 'AI 还不能分析' : 'AI analysis is not ready',
      isZh() ? '请先按「补选具体奖励」。AI 会评估你选的具体物品，不会评估未知箱名。' : 'Choose the actual reward first so AI can assess the real item.',
    );
    return;
  }
  activeAIRewardId = id;
  document.querySelector('#aiDialog').showModal();
  renderAIAdvisor(reward);
  if (reward && !reward.aiAnalysis && !reward.aiLoading) analyzeReward(id);
}

function renderAIAdvisor(reward) {
  if (!reward) return;
  document.querySelector('#aiRewardName').textContent = reward.name;
  const box = document.querySelector('#aiAnalysis');
  if (reward.aiLoading) {
    document.querySelector('#aiStatus').textContent = isZh() ? 'AI 正在拆这个东西值不值得你赢。' : 'AI is analyzing the reward.';
    box.innerHTML = `<div class="empty-impact">${isZh() ? '分析中，等一下。' : 'Analyzing…'}</div>`;
  } else if (reward.aiError) {
    document.querySelector('#aiStatus').textContent = isZh() ? 'AI 目前没连上' : 'AI unavailable';
    box.innerHTML = `<div class="empty-impact">${escapeHtml(reward.aiError)}</div>`;
  } else if (reward.aiAnalysis) {
    const a = reward.aiAnalysis;
    document.querySelector('#aiStatus').textContent = `${a.necessity} · ${a.verdict}`;
    box.innerHTML = `
      <div class="ai-score-card">
        <div class="ai-score">
          <strong>${a.score}</strong>
          <span>${isZh() ? '必要性' : 'NECESSITY'}</span>
        </div>
      </div>
      <div class="ai-verdict"><h3>${escapeHtml(a.verdict)}</h3><p>${escapeHtml(a.summary)}</p></div>
      <div class="ai-details">
        <div class="ai-detail"><b>${isZh() ? '为什么' : 'WHY'}</b><span>${escapeHtml(a.why)}</span></div>
        <div class="ai-detail"><b>${isZh() ? '风险' : 'RISK'}</b><span>${escapeHtml(a.risk)}</span></div>
        <div class="ai-detail"><b>${isZh() ? '更好的做法' : 'BETTER MOVE'}</b><span>${escapeHtml(a.better_move)}</span></div>
        <div class="ai-detail"><b>${isZh() ? '合理价位' : 'FAIR PRICE'}</b><span>${escapeHtml(a.fair_price || (isZh() ? '目前没有建议价位。' : 'No fair price suggested yet.'))}</span></div>
        <div class="ai-detail ai-detail-wide"><b>${isZh() ? '购买条件' : 'CHALLENGE'}</b><span>${escapeHtml(a.challenge)}</span></div>
      </div>
    `;
  } else {
    box.innerHTML = `<div class="empty-impact">${isZh() ? '准备开始分析。' : 'Ready to analyze.'}</div>`;
  }
  document.querySelector('#aiChat').innerHTML = (reward.aiChat || [])
    .map((message) => `<div class="ai-message ${message.role}">${escapeHtml(message.content)}</div>`)
    .join('');
}

async function askRewardAI(message) {
  const reward = (data.rewards || []).find((item) => item.id === activeAIRewardId);
  if (!reward) return;
  reward.aiChat = reward.aiChat || [];
  reward.aiChat.push({ role: 'user', content: message });
  saveData();
  renderAIAdvisor(reward);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        action: 'chat',
        context: { ...rewardAIContext(reward), analysis: reward.aiAnalysis },
        messages: reward.aiChat,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    reward.aiChat.push({ role: 'assistant', content: result.text });
  } catch (error) {
    reward.aiChat.push({
      role: 'assistant',
      content: error.name === 'AbortError'
        ? '这次 AI 回太久了，先当它超时。你可以再问一次。'
        : error.message === 'OPENAI_API_KEY_NOT_CONFIGURED'
        ? 'AI 还没连接。先放入 OPENAI_API_KEY。'
        : error.message === 'GROQ_API_KEY_NOT_CONFIGURED'
          ? 'Groq 还没连接。先放入 GROQ_API_KEY。'
        : error.message === 'AI_REQUEST_TIMEOUT'
          ? 'AI 这次请求超时了。再发一次试试看。'
        : `暂时失败：${error.message}`,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  saveData();
  renderAIAdvisor(reward);
}

function renderLoot() {
  const stats = getStats();
  const rewards = [...(data.rewards || [])].sort((a, b) => {
    const aDone = isRewardResolved(a) ? 1 : 0;
    const bDone = isRewardResolved(b) ? 1 : 0;
    return aDone - bDone || (b.id === data.focusRewardId) - (a.id === data.focusRewardId) || Number(b.priority || 2) - Number(a.priority || 2) || new Date(b.createdAt) - new Date(a.createdAt);
  });
  const grid = document.querySelector('#lootGrid');
  const archiveGrid = document.querySelector('#lootArchiveGrid');
  const archiveHead = document.querySelector('#lootArchiveHead');
  const killed = getKilledImpulses();
  const intercepted = killed.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  document.querySelector('#rewardBalance').textContent = money(stats.rewardBalance);
  const balanceCopy = document.querySelector('#rewardBalanceCopy');
  if (balanceCopy) balanceCopy.textContent = isZh()
    ? `累计赚入 RM${money(stats.rewardEarned)} · 已使用 RM${money(stats.rewardSpent)}${stats.rewardSpent > stats.rewardEarned ? ' · 超出的部分不会变成负数' : ''}`
    : `Earned RM${money(stats.rewardEarned)} · Used RM${money(stats.rewardSpent)}`;
  document.querySelector('#disciplineCoins').textContent = stats.wins;
  document.querySelector('#urgeKills').textContent = killed.length;
  document.querySelector('#interceptedAmount').textContent = money(intercepted);
  document.querySelector('#futureFund').textContent = money(stats.saved * 0.9);
  const activeRewards = rewards.filter((item) => !isRewardResolved(item));
  const redeemedRewards = rewards.filter((item) => isRewardResolved(item));
  document.querySelector('#lootCount').textContent = isZh()
    ? `${activeRewards.length} 个还没拿到 · 已按优先级排列`
    : `${activeRewards.length} active targets`;
  document.querySelector('#lootArchiveCount').textContent = isZh()
    ? `${redeemedRewards.length} 个你已经赢回来`
    : `${redeemedRewards.length} won-back rewards`;
  const highest = Math.max(1, ...activeRewards.map((item) => Number(item.cost || 0)));
  document.querySelector('#rewardBalanceBar').style.width = `${Math.min(100, (stats.rewardBalance / highest) * 100)}%`;
  renderSecretDrops(stats);
  renderImpulses();

  if (!rewards.length) {
    grid.innerHTML = `<div class="empty-loot"><div><b>${isZh() ? '战利品库还是空的。' : 'Your vault is empty.'}</b>${isZh() ? '想吃好料、想买鞋、想升级，就先放进来。' : 'Add something worth earning.'}</div></div>`;
    archiveHead.hidden = true;
    archiveGrid.hidden = true;
    archiveGrid.innerHTML = '';
    return;
  }

  const categories = {
    food: ['吃好料', '🍜'],
    gear: ['装备', '⚡'],
    experience: ['体验', '✦'],
    growth: ['升级自己', '↗'],
    other: ['其他', '◆'],
  };
  const priorities = { 3: '非拿不可', 2: '很想要', 1: '有就爽' };
  const renderRewardCard = (item, { archived = false } = {}) => {
      const cost = Number(item.cost || 0);
      const progress = item.sourceDropId ? 100 : Math.min(100, (stats.rewardBalance / Math.max(1, cost)) * 100);
      const age = Date.now() - new Date(item.createdAt).getTime();
      const coolLeft = Math.max(0, DAY - age);
      const cooled = coolLeft === 0;
      const afford = stats.rewardBalance >= cost;
      const ready = afford && cooled && !isRewardResolved(item);
      const daysLeft = Math.ceil(Math.max(0, cost - stats.rewardBalance) / Math.max(1, Number(data.dailyTarget || 0) * Number(data.rewardRate || 0.1)));
      const hoursLeft = Math.ceil(coolLeft / 3600000);
      const category = categories[item.category] || categories.other;
      const focus = item.id === data.focusRewardId;
      const outcome = getRewardOutcome(item);
      const outcomeAt = getRewardOutcomeAt(item);
      const status = item.needsDropChoice
        ? (isZh() ? `旧掉落已保留 · 请补选你真正要的奖励` : 'Legacy drop preserved · choose your real reward')
        : outcome
        ? outcome === 'earned'
          ? (isZh() ? `掉落奖励已到账 · ${item.sourceDropCode || 'DROP'}` : `Drop reward earned · ${item.sourceDropCode || 'DROP'}`)
          : outcome === 'bought'
          ? (isZh() ? `已买到 · ${formatDateKey(keyOf(new Date(outcomeAt)))}` : 'Bought')
          : outcome === 'later'
            ? (isZh() ? `以后再买 · ${formatDateKey(keyOf(new Date(outcomeAt)))}` : 'Later')
            : (isZh() ? `已放弃 · ${formatDateKey(keyOf(new Date(outcomeAt)))}` : 'Dropped')
        : ready
          ? (isZh() ? '可以拿了' : 'Ready to claim')
          : !cooled
            ? (isZh() ? `先冷静，还有 ${hoursLeft} 小时` : `${hoursLeft}h cooldown left`)
            : (isZh() ? `还要赢 ${daysLeft} 天` : `${daysLeft} days to go`);
      return `
        <article class="loot-card panel ${ready ? 'ready' : ''} ${isRewardResolved(item) ? 'redeemed' : ''} ${focus ? 'focus-card' : ''} ${archived ? 'archive-card' : ''}">
          <div class="loot-card-media ${item.image ? '' : 'no-image'}" ${item.image ? `style="background-image:url('${item.image}')"` : ''}>${item.image ? '' : category[1]}</div>
          <div class="loot-tools">
            ${item.sourceDropId ? '' : `<button class="mini-action mini-action-focus ${focus ? 'active' : ''}" data-focus-loot="${item.id}" title="${isZh() ? '设为主攻目标' : 'Set as focus'}"><span>★</span><small>${isZh() ? '主' : 'Focus'}</small></button>`}
            <button class="mini-action mini-action-ai" data-ai-loot="${item.id}" title="${item.needsDropChoice ? (isZh() ? '补选具体奖励后才能分析' : 'Choose the actual reward before analysis') : (isZh() ? 'AI 分析' : 'AI analysis')}" ${item.needsDropChoice ? 'disabled aria-disabled="true"' : ''}><span>✦</span><small>AI</small></button>
            <button class="mini-action mini-action-edit" data-edit-loot="${item.id}" title="${isZh() ? '编辑' : 'Edit'}"><span>✎</span><small>${isZh() ? '改' : 'Edit'}</small></button>
            <button class="mini-action mini-action-delete loot-delete" data-delete-loot="${item.id}" title="${isZh() ? '删除' : 'Delete'}"><span>×</span><small>${isZh() ? '删' : 'Delete'}</small></button>
          </div>
          <div class="loot-card-body">
            <div class="loot-meta">
              <span class="loot-badge priority-${item.priority || 2}">${priorities[item.priority || 2]}</span>
              <span class="loot-badge">${category[0]}</span>
              ${outcome ? `<span class="loot-badge outcome-${outcome}">${rewardOutcomeLabel(item)}</span>` : ''}
              ${item.needsDropChoice
                ? `<span class="ai-badge">${isZh() ? '补选后 AI 评估' : 'AI after selection'}</span>`
                : item.aiAnalysis
                  ? `<span class="ai-badge">${escapeHtml(item.aiAnalysis.verdict)}</span>`
                  : `<span class="ai-badge ${item.aiLoading ? 'loading' : ''}">${item.aiLoading ? '分析中' : '等 AI 分析'}</span>`}
            </div>
            <h4>${escapeHtml(item.name)}</h4>
            <div class="loot-cost">RM ${money(cost)}</div>
            <p class="loot-why">${escapeHtml((item.needsDropChoice ? item.why : item.aiAnalysis?.summary) || item.why || '理由先写清楚，系统才知道该不该排前面。')}</p>
            <p class="loot-days">${escapeHtml(status)}</p>
            <div class="loot-progress"><i style="width:${progress}%"></i></div>
            <footer>
              <span>${outcome
                ? item.needsDropChoice
                  ? (isZh() ? '这箱已赢得；补选后不会重新跑进度。' : 'Already earned; choose the actual item without re-grinding.')
                  : outcome === 'earned'
                  ? (isZh() ? `你已经靠 ${item.sourceDropCode || '掉落箱'} 赢到，不用再累积一次。` : 'Already earned from this drop. No second grind required.')
                  : outcome === 'bought'
                  ? (isZh() ? '这笔爽钱已经正式花掉。' : 'This one consumed reward balance.')
                  : outcome === 'later'
                    ? (isZh() ? '先收着，未来再决定。' : 'Saved for a later decision.')
                    : (isZh() ? '你已经主动放掉这目标。' : 'You intentionally dropped this target.')
                : `${Math.round(progress)}%`}</span>
              ${outcome
                ? item.needsDropChoice
                  ? `<button class="redeem-btn" data-choose-drop-reward="${item.id}">${isZh() ? '补选具体奖励' : 'Choose actual reward'}</button>`
                  : `<button class="redeem-btn muted" data-resolve-loot="${item.id}">${outcome === 'earned' ? (isZh() ? '记录使用结果' : 'Record usage') : (isZh() ? '改结果' : 'Change result')}</button>`
                : `<button class="redeem-btn" data-resolve-loot="${item.id}" ${ready ? '' : 'disabled'}>${ready ? (isZh() ? '结算战利品' : 'Resolve reward') : (isZh() ? '还没资格' : 'Not ready')}</button>`}
            </footer>
          </div>
        </article>
      `;
    };

  grid.innerHTML = activeRewards.length
    ? activeRewards.map((item) => renderRewardCard(item)).join('')
    : `<div class="empty-loot"><div><b>${isZh() ? '现在没有进行中的战利品。' : 'No active rewards right now.'}</b>${isZh() ? '你已经赢回来的会留在下面，不会无声无息消失。' : 'Won-back rewards stay below instead of vanishing.'}</div></div>`;

  if (redeemedRewards.length) {
    archiveHead.hidden = false;
    archiveGrid.hidden = false;
    archiveGrid.innerHTML = redeemedRewards.map((item) => renderRewardCard(item, { archived: true })).join('');
  } else {
    archiveHead.hidden = true;
    archiveGrid.hidden = true;
    archiveGrid.innerHTML = '';
  }
}

function getDropState(dropId) {
  return (data.secretDrops || []).find((item) => item.id === dropId);
}

function paginationHtml({ page, totalPages, totalItems, scope, label }) {
  if (totalItems <= 0) return '';
  const pageButtons = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((number) => number === 1 || number === totalPages || Math.abs(number - page) <= 1)
    .reduce((items, number, index, numbers) => {
      if (index && number - numbers[index - 1] > 1) items.push('<span class="pagination-gap">…</span>');
      items.push(`<button data-${scope}-page="${number}" class="${number === page ? 'active' : ''}" aria-label="第 ${number} 页">${number}</button>`);
      return items;
    }, [])
    .join('');
  return `<div class="pagination-summary"><strong>${label}</strong><span>共 ${totalItems} 个 · 第 ${page}/${totalPages} 页</span></div><div class="pagination-actions"><button data-${scope}-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>←</button>${pageButtons}<button data-${scope}-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>→</button></div>`;
}

function renderSecretDrops(stats = getStats()) {
  ensureSecretDropExpansion();
  const savedMoney = Number(stats.saved || 0);
  const totalPages = Math.max(1, Math.ceil(dropCatalog.length / SECRET_DROP_PAGE_SIZE));
  secretDropPage = Math.max(1, Math.min(secretDropPage, totalPages));
  const start = (secretDropPage - 1) * SECRET_DROP_PAGE_SIZE;
  const visibleDrops = dropCatalog.slice(start, start + SECRET_DROP_PAGE_SIZE);
  document.querySelector('#dropSavedMoney').textContent = money(savedMoney);
  document.querySelector('#dropStrip').innerHTML = visibleDrops.map((drop) => {
    const state = getDropState(drop.id) || {};
    const unlocked = savedMoney >= drop.threshold;
    const revealed = Boolean(state.revealedAt);
    const claimed = Boolean(state.claimedAt);
    const progress = Math.min(100, savedMoney / drop.threshold * 100);
    const title = revealed ? drop.revealTitle : (unlocked ? '已解锁，等你开箱' : '未知掉落');
    const body = revealed ? drop.revealCopy : (unlocked ? '你已经打到这一箱了。按下去，看看系统放了什么给你。' : drop.teaser);
    const metaLeft = unlocked ? `门槛 RM ${money(drop.threshold)}` : `还差 RM ${money(drop.threshold - savedMoney)}`;
    const metaRight = revealed ? (claimed ? '已转成战利品' : `可换 RM ${money(drop.rewardCost)}`) : `${Math.round(progress)}%`;
    return `
      <article class="drop-card ${revealed ? 'revealed' : unlocked ? 'unlocked' : 'locked'}">
        <div class="drop-top"><span class="drop-tier">${drop.code}</span><span class="drop-status">${claimed ? 'CLAIMED' : revealed ? 'REVEALED' : unlocked ? 'UNLOCKED' : 'LOCKED'}</span></div>
        <div class="drop-glyph">${drop.glyph}</div>
        <h4>${escapeHtml(title)}</h4>
        <p>${escapeHtml(body)}</p>
        <div class="drop-progress"><i style="width:${progress}%"></i></div>
        <div class="drop-meta"><span class="drop-meta-main">${metaLeft}</span><span class="drop-meta-side">${metaRight}</span></div>
        <div class="drop-actions">
          ${!revealed
            ? `<button class="primary-drop" data-reveal-drop="${drop.id}" ${unlocked ? '' : 'disabled'}>${unlocked ? '开箱' : '还没到'}</button>`
            : `<button class="primary-drop" data-claim-drop="${drop.id}" ${claimed ? 'disabled' : ''}>${claimed ? '奖励已到账' : '选择我要什么'}</button>`}
          <button data-preview-drop="${drop.id}">${revealed ? '看内容' : '看门槛'}</button>
        </div>
      </article>
    `;
  }).join('');
  document.querySelector('#dropPagination').innerHTML = paginationHtml({
    page: secretDropPage,
    totalPages,
    totalItems: dropCatalog.length,
    scope: 'drop',
    label: '持续掉落轨道',
  });
}

function renderImpulses() {
  const list = document.querySelector('#impulseList');
  const active = (data.impulses || []).filter((item) => !item.resolution);
  if (!active.length) {
    list.innerHTML = `<div class="empty-impulses">${isZh() ? '现在没有东西在冷静区。下次手痒，先丢进来。' : 'Nothing cooling down right now.'}</div>`;
    return;
  }
  const triggers = {
    bored: '闲到手痒',
    stress: '压力大',
    sale: '怕错过折扣',
    social: '看到别人有',
    hungry: '嘴馋',
    other: '其他',
  };
  list.innerHTML = active
    .map((item) => {
      const left = Math.max(0, DAY - (Date.now() - new Date(item.createdAt).getTime()));
      const ready = left === 0;
      const hours = Math.ceil(left / 3600000);
      const minutes = Math.ceil((left % 3600000) / 60000);
      return `
        <article class="impulse-card ${ready ? 'ready' : ''}">
          <div class="impulse-top">
            <span>${triggers[item.trigger] || '一时手痒'}</span>
            <span>
              <button class="impulse-delete" data-edit-impulse="${item.id}" title="修改">✎</button>
              <button class="impulse-delete" data-delete-impulse="${item.id}" title="删除">×</button>
            </span>
          </div>
          <h4>${escapeHtml(item.name)}</h4>
          <div class="impulse-cost">RM ${money(item.cost)}</div>
          ${ready
            ? `<div class="impulse-actions"><button class="kill-btn" data-kill-impulse="${item.id}">其实不要了</button><button class="keep-btn" data-keep-impulse="${item.id}">还是想要</button></div>`
            : `<p class="impulse-wait">再等 ${hours} 小时 ${minutes} 分钟，先不要买。</p>`}
        </article>
      `;
    })
    .join('');
}

function renderSports() {
  const sessions = [...(data.sportsSessions || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '') || new Date(b.createdAt) - new Date(a.createdAt));
  const monthPrefix = keyOf().slice(0, 7);
  const monthSessions = sessions.filter((item) => String(item.date || '').startsWith(monthPrefix));
  const monthSpend = monthSessions.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const monthMinutes = monthSessions.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  const monthHours = monthMinutes / 60;
  document.querySelector('#sportSessions').textContent = isZh() ? `${monthSessions.length} 场` : `${monthSessions.length} sessions`;
  document.querySelector('#sportSpend').textContent = `RM ${money(monthSpend)}`;
  document.querySelector('#sportHourly').textContent = `RM ${money(monthHours ? monthSpend / monthHours : 0)}`;
  document.querySelector('#sportHours').textContent = isZh() ? `${monthHours.toFixed(1)} 小时` : `${monthHours.toFixed(1)} hours`;
  document.querySelector('#sportBudgetProgress').textContent = `RM ${money(monthSpend)} / RM ${money(data.sportBudget)}`;
  document.querySelector('#sportBudgetBar').style.width = `${Math.min(100, (monthSpend / Math.max(1, Number(data.sportBudget || 0))) * 100)}%`;
  const avgValue = monthSessions.length ? monthSessions.reduce((sum, item) => sum + Number(item.value || 0), 0) / monthSessions.length : 0;
  document.querySelector('#sportVerdict').textContent = !monthSessions.length
    ? (isZh() ? '先记录第一场，系统才知道值不值。' : 'Log your first session to judge value.')
    : monthSessions[0]?.aiReview?.summary
      ? `${monthSessions[0].aiReview.verdict} · ${monthSessions[0].aiReview.summary}`
      : avgValue >= 4
      ? (isZh() ? '这类运动钱花得值，继续。' : 'These sessions are paying off.')
      : avgValue >= 3
        ? (isZh() ? '还行，但可以更挑一点。' : 'Decent, but choose better sessions.')
        : (isZh() ? '要开始挑局了，不然很容易花得不爽。' : 'Be more selective with paid sessions.');
  const skillGrid = document.querySelector('#sportSkillGrid');
  const latestAI = monthSessions.find((item) => item.aiReview?.skill_gain || item.aiReview?.attribute_boost || item.aiReview?.discipline_bonus)?.aiReview;
  const fallbackSkills = monthSessions.length
    ? [
        { title: isZh() ? '耐力' : 'Endurance', value: monthHours >= 6 ? (isZh() ? '明显上升' : 'Up clearly') : (isZh() ? '慢慢堆' : 'Building') },
        { title: isZh() ? '执行力' : 'Discipline', value: monthSessions.length >= 4 ? (isZh() ? '在变硬' : 'Getting sharper') : (isZh() ? '还在养' : 'Still forming') },
        { title: isZh() ? '技术感' : 'Skill feel', value: avgValue >= 4 ? (isZh() ? '状态不错' : 'Strong feel') : (isZh() ? '需要更多高质量局' : 'Needs better reps') },
      ]
    : [];
  if (skillGrid) {
    const cards = latestAI
      ? [
          { title: isZh() ? '这场加成' : 'Skill gain', value: latestAI.skill_gain || (isZh() ? '有进步' : 'Progress made') },
          { title: isZh() ? '属性提升' : 'Attribute boost', value: latestAI.attribute_boost || (isZh() ? '身体层面有赚到' : 'Physical return gained') },
          { title: isZh() ? '纪律加成' : 'Discipline bonus', value: latestAI.discipline_bonus || (isZh() ? '不是白练' : 'Not wasted') },
        ]
      : fallbackSkills;
    skillGrid.innerHTML = cards.map((card) => `
      <article class="panel sport-skill-card">
        <span>${card.title}</span>
        <strong>${escapeHtml(card.value)}</strong>
      </article>
    `).join('');
  }
  const goalGrid = document.querySelector('#sportGoalGrid');
  if (goalGrid) {
    const skills = [...(data.sportSkills || [])].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    goalGrid.innerHTML = skills.length ? skills.map((skill) => {
      const score = Math.max(0, Math.min(100, Number(skill.progress || 0)));
      const review = skill.aiAssessment || {};
      const linked = sessions.filter((item) => item.skillId === skill.id);
      const techniqueEvidence = (data.sportTechniqueReviews || []).filter((item) => item.skillId === skill.id);
      const lastSession = linked[0];
      const confidence = Number(review.confidence || 0);
      return `<article class="sport-goal-card panel" data-sport-skill-card="${skill.id}">
        <div class="sport-goal-top"><div><span>${escapeHtml(review.stage || sportStage(score))}</span><h4>${escapeHtml(skill.name)}</h4></div><div class="sport-goal-score"><strong>${score}</strong><small>/100</small></div></div>
        <div class="skill-progress-track"><i style="width:${score}%"></i></div>
        <div class="skill-progress-meta"><span>AI 置信度 ${confidence || '—'}%</span><span>${linked.length + techniqueEvidence.length} 份能力证据</span></div>
        <p>${escapeHtml(review.summary || '等待 AI 建立基线。描述得越具体，初始分数越准确。')}</p>
        <div class="skill-milestone"><span>当前关卡</span><strong>${escapeHtml(review.milestone || '先完成基线评估')}</strong></div>
        ${lastSession ? `<small class="skill-last-log">最近：${formatDateKey(lastSession.date)} · ${escapeHtml(lastSession.name)}</small>` : ''}
        <div class="skill-card-actions"><button data-open-sport-progress="${skill.id}">查看路线</button><button data-log-sport-skill="${skill.id}">＋ 训练</button><button data-edit-sport-skill="${skill.id}">修改</button><button class="danger-lite" data-delete-sport-skill="${skill.id}">删除</button></div>
      </article>`;
    }).join('') : `<div class="empty-sports sport-goal-empty"><b>还没有运动技能项目</b><span>加“游泳”“篮球”“网球”或任何你正在学的运动，AI 会建立第一条 0–100 路线。</span><button class="primary-btn compact-btn" data-create-first-sport>＋ 开始第一项运动</button></div>`;
  }
  const sportTotalPages = Math.max(1, Math.ceil(sessions.length / SPORT_SESSIONS_PAGE_SIZE));
  sportSessionsPage = Math.max(1, Math.min(sportSessionsPage, sportTotalPages));
  const sportPageStart = (sportSessionsPage - 1) * SPORT_SESSIONS_PAGE_SIZE;
  const visibleSessions = sessions.slice(sportPageStart, sportPageStart + SPORT_SESSIONS_PAGE_SIZE);
  document.querySelector('#sportList').innerHTML = sessions.length
    ? visibleSessions.map((item) => `
        <article class="sport-card panel">
          <span>${formatDateKey(item.date)}</span>
          <h4>${escapeHtml(item.name)}</h4>
          <div class="sport-meta"><span>RM ${money(item.cost)}</span><span>${Number(item.minutes)} min</span></div>
          ${item.skillId ? `<span class="sport-linked-skill">${escapeHtml((data.sportSkills || []).find((skill) => skill.id === item.skillId)?.name || '已删除项目')}</span>` : ''}
          ${item.note ? `<p class="sport-training-note">${escapeHtml(item.note)}</p>` : ''}
          <p class="sport-ai-copy">${escapeHtml(item.aiReview?.summary || (isZh() ? '还没跑运动 AI。' : 'No sport AI yet.'))}</p>
          <footer>
            <small>${item.aiReview?.verdict ? escapeHtml(item.aiReview.verdict) : (isZh() ? `值得度 ${item.value}/5` : `Value ${item.value}/5`)}</small>
            <div class="record-actions">
              <button class="mini-action mini-action-ai" data-ai-sport="${item.id}" title="${isZh() ? 'AI 评估' : 'AI review'}"><span>✦</span><small>AI</small></button>
              <button class="mini-action mini-action-edit" data-edit-sport="${item.id}" title="${isZh() ? '修改' : 'Edit'}"><span>✎</span><small>${isZh() ? '改' : 'Edit'}</small></button>
              <button class="mini-action mini-action-delete delete-record" data-delete-sport="${item.id}" title="${isZh() ? '删除' : 'Delete'}"><span>×</span><small>${isZh() ? '删' : 'Delete'}</small></button>
            </div>
          </footer>
        </article>
      `).join('')
    : `<div class="empty-sports">${isZh() ? '还没有运动记录。' : 'No sports sessions yet.'}</div>`;
  document.querySelector('#sportPagination').innerHTML = paginationHtml({
    page: sportSessionsPage,
    totalPages: sportTotalPages,
    totalItems: sessions.length,
    scope: 'sport',
    label: isZh() ? '完整训练记录' : 'All training logs',
  });
}

function sportStage(score) {
  if (score >= 90) return '掌握 · MASTERED';
  if (score >= 75) return '进阶 · ADVANCED';
  if (score >= 50) return '独立 · INDEPENDENT';
  if (score >= 25) return '基础 · FOUNDATION';
  return '入门 · STARTER';
}

const exerciseTerms = {
  chest: '胸部', back: '背部', shoulders: '肩部', waist: '核心/腰腹', 'upper arms': '上臂', 'lower arms': '前臂', 'upper legs': '大腿', 'lower legs': '小腿', cardio: '心肺', neck: '颈部',
  abs: '腹肌', pectorals: '胸肌', glutes: '臀肌', quadriceps: '股四头肌', hamstrings: '腿后侧', triceps: '肱三头肌', biceps: '肱二头肌', lats: '背阔肌', calves: '小腿肌', spine: '脊柱稳定肌',
  'body weight': '自重', dumbbell: '哑铃', barbell: '杠铃', cable: '绳索', kettlebell: '壶铃', band: '弹力带', assisted: '辅助器械', leverage: '固定器械', 'smith machine': '史密斯机',
};

function exerciseLabel(value = '') {
  return exerciseTerms[String(value).toLowerCase()] || String(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeExercisePayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.data && typeof payload.data === 'object') return [payload.data];
  if (payload && (payload.exerciseId || payload.id)) return [payload];
  return [];
}

async function loadExerciseFilters() {
  try {
    const [bodyResponse, equipmentResponse] = await Promise.all([
      fetch('/api/exercises?mode=bodyparts'), fetch('/api/exercises?mode=equipments'),
    ]);
    const [bodyPayload, equipmentPayload] = await Promise.all([bodyResponse.json(), equipmentResponse.json()]);
    const extract = (payload) => (Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []).map((item) => typeof item === 'string' ? item : item.name).filter(Boolean);
    const fill = (selector, values, first) => {
      const select = document.querySelector(selector);
      if (!select) return;
      select.innerHTML = `<option value="">${first}</option>${[...new Set(values)].sort().map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(exerciseLabel(value))}</option>`).join('')}`;
    };
    fill('#exerciseBodyPartFilter', extract(bodyPayload), '全部部位');
    fill('#exerciseEquipmentFilter', extract(equipmentPayload), '全部器械');
  } catch { /* filters remain optional */ }
}

async function loadExercises({ direction = 'current' } = {}) {
  if (exerciseLibrary.loading) return;
  exerciseLibrary.loading = true;
  document.querySelector('#exerciseState').textContent = '正在加载动作 GIF 与教学资料…';
  document.querySelector('#exerciseGrid').classList.add('is-loading');
  try {
    const query = exerciseLibrary.query.trim();
    let url;
    if (query) {
      url = `/api/exercises?mode=search&q=${encodeURIComponent(query)}`;
      exerciseLibrary.page = 1;
    } else {
      if (direction === 'next' && exerciseLibrary.meta?.nextCursor) {
        exerciseLibrary.cursors[exerciseLibrary.page] = exerciseLibrary.meta.nextCursor;
        exerciseLibrary.page += 1;
      } else if (direction === 'prev' && exerciseLibrary.page > 1) {
        exerciseLibrary.page -= 1;
      }
      const cursor = exerciseLibrary.cursors[exerciseLibrary.page - 1] || '';
      url = `/api/exercises?limit=18${cursor ? `&after=${encodeURIComponent(cursor)}` : ''}`;
    }
    const response = await fetch(url);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'EXERCISE_API_UNAVAILABLE');
    exerciseLibrary.items = normalizeExercisePayload(payload);
    exerciseLibrary.meta = payload.meta || {};
    renderExerciseLibrary();
  } catch (error) {
    document.querySelector('#exerciseState').innerHTML = `动作库暂时连不上（${escapeHtml(error.message)}）。<button data-retry-exercises>重试</button>`;
    document.querySelector('#exerciseGrid').innerHTML = '';
  } finally {
    exerciseLibrary.loading = false;
    document.querySelector('#exerciseGrid').classList.remove('is-loading');
  }
}

function renderExerciseLibrary() {
  const bodyPart = document.querySelector('#exerciseBodyPartFilter')?.value || '';
  const equipment = document.querySelector('#exerciseEquipmentFilter')?.value || '';
  exerciseLibrary.bodyPart = bodyPart;
  exerciseLibrary.equipment = equipment;
  const items = exerciseLibrary.items.filter((item) => (!bodyPart || (item.bodyParts || [item.bodyPart]).includes(bodyPart)) && (!equipment || (item.equipments || [item.equipment]).includes(equipment)));
  document.querySelector('#exerciseState').textContent = items.length ? `显示 ${items.length} 个动作${exerciseLibrary.meta.total ? ` · 全库 ${exerciseLibrary.meta.total} 个` : ''}` : '这一页没有符合筛选的动作，换个筛选或搜索词。';
  document.querySelector('#exerciseGrid').innerHTML = items.map((item) => {
    const id = item.exerciseId || item.id;
    const body = item.bodyParts || (item.bodyPart ? [item.bodyPart] : []);
    const target = item.targetMuscles || (item.target ? [item.target] : []);
    const equipmentList = item.equipments || (item.equipment ? [item.equipment] : []);
    return `<button class="exercise-card" data-exercise-id="${escapeHtml(id)}"><span class="exercise-gif-wrap"><img src="${escapeHtml(item.gifUrl || '')}" alt="${escapeHtml(item.name)} 动作示范" loading="lazy" /></span><span class="exercise-card-body"><small>${escapeHtml(body.map(exerciseLabel).join(' · ') || '健身动作')}</small><strong>${escapeHtml(item.name)}</strong><span>目标：${escapeHtml(target.map(exerciseLabel).join('、') || '点开查看')}</span><em>${escapeHtml(equipmentList.map(exerciseLabel).join('、') || '器械不限')}</em></span></button>`;
  }).join('');
  document.querySelector('#exercisePageLabel').textContent = exerciseLibrary.query ? `搜索：${exerciseLibrary.query}` : `第 ${exerciseLibrary.page} 页`;
  document.querySelector('#exercisePrevBtn').disabled = Boolean(exerciseLibrary.query) || exerciseLibrary.page <= 1;
  document.querySelector('#exerciseNextBtn').disabled = Boolean(exerciseLibrary.query) || !exerciseLibrary.meta.hasNextPage;
}

async function openExerciseDetail(id) {
  const dialog = document.querySelector('#exerciseDialog');
  document.querySelector('#exerciseDetail').innerHTML = '<div class="empty-impact">正在加载完整动作教学…</div>';
  dialog.showModal();
  try {
    const response = await fetch(`/api/exercises?mode=detail&id=${encodeURIComponent(id)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    const item = normalizeExercisePayload(payload)[0];
    if (!item) throw new Error('EXERCISE_NOT_FOUND');
    const list = (value, fallback = []) => Array.isArray(value) ? value : fallback;
    document.querySelector('#exerciseDetail').innerHTML = `<div class="exercise-detail-grid"><div class="exercise-detail-media"><img src="${escapeHtml(item.gifUrl || '')}" alt="${escapeHtml(item.name)} 完整动作 GIF" /></div><div class="exercise-detail-copy"><span>EXERCISEDB MOVEMENT</span><h2>${escapeHtml(item.name)}</h2><div class="exercise-tags"><b>目标 · ${escapeHtml(list(item.targetMuscles, [item.target]).filter(Boolean).map(exerciseLabel).join('、'))}</b><b>部位 · ${escapeHtml(list(item.bodyParts, [item.bodyPart]).filter(Boolean).map(exerciseLabel).join('、'))}</b><b>器械 · ${escapeHtml(list(item.equipments, [item.equipment]).filter(Boolean).map(exerciseLabel).join('、'))}</b></div><h3>分步教学</h3><ol>${list(item.instructions).map((step) => `<li>${escapeHtml(String(step).replace(/^Step:\s*\d+\s*/i, ''))}</li>`).join('')}</ol><div class="exercise-secondary"><span>辅助肌群</span><p>${escapeHtml(list(item.secondaryMuscles).map(exerciseLabel).join('、') || '未标注')}</p></div><div class="exercise-detail-actions"><button class="ghost-btn" data-log-this-exercise="${escapeHtml(item.name)}">＋ 加进训练记录</button><button class="primary-btn" data-check-this-exercise="${escapeHtml(item.name)}">拍这个动作让 AI 评分</button></div></div></div>`;
  } catch (error) {
    document.querySelector('#exerciseDetail').innerHTML = `<div class="empty-impact">完整资料加载失败：${escapeHtml(error.message)}</div>`;
  }
}

function openTechniqueCheck(name = '') {
  populateSportSkillSelects();
  document.querySelector('#techniqueForm').reset();
  document.querySelector('#techniqueNameInput').value = name;
  techniqueImageData = [];
  document.querySelector('#techniquePreview').innerHTML = '';
  document.querySelector('#techniqueResult').innerHTML = '';
  document.querySelector('#techniqueDialog').showModal();
}

function resizeTechniqueImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function analyzeTechnique() {
  const name = document.querySelector('#techniqueNameInput').value.trim();
  const note = document.querySelector('#techniqueNoteInput').value.trim();
  const skillId = document.querySelector('#techniqueSkillInput').value;
  if (!name || techniqueImageData.length < 2) { showToast('至少要 2 张连续照片', '起始、中段、结束越完整，判断越准。'); return; }
  const button = document.querySelector('#techniqueSubmitBtn');
  button.disabled = true; button.textContent = 'AI 正在逐张看动作…';
  document.querySelector('#techniqueResult').innerHTML = '<div class="empty-impact">正在比较关节位置、动作轨迹与稳定性…</div>';
  try {
    const skill = (data.sportSkills || []).find((item) => item.id === skillId);
    const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sportTechnique', context: { movement: name, userConcern: note, sport: skill?.name || '', sportGoal: skill?.goal || '', imageCount: techniqueImageData.length }, images: techniqueImageData }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    const review = JSON.parse(payload.text.replace(/^```json\s*|\s*```$/g, '').trim());
    data.sportTechniqueReviews.unshift({ id: crypto.randomUUID(), skillId: skillId || null, movement: name, note, ...review, createdAt: new Date().toISOString() });
    saveData();
    document.querySelector('#techniqueResult').innerHTML = `<div class="technique-score"><strong>${Number(review.score || 0)}</strong><span>/100 · 置信度 ${Number(review.confidence || 0)}%</span><h3>${escapeHtml(review.verdict || '')}</h3><p>${escapeHtml(review.summary || '')}</p></div><div class="technique-result-grid"><section><b>明确看到</b><ul>${(review.observed || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section><section><b>照片无法确定</b><ul>${(review.uncertain || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section><section><b>下一组这样修</b>${(review.fixes || []).map((item) => `<article><strong>${escapeHtml(item.issue || '')}</strong><p>${escapeHtml(item.cue || '')}</p><small>${escapeHtml(item.drill || '')}</small></article>`).join('')}</section><section><b>安全与下次拍摄</b><ul>${(review.safety || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul><p>${escapeHtml(review.next_capture || '')}</p></section></div>`;
    if (skillId) analyzeSportSkill(skillId);
  } catch (error) {
    document.querySelector('#techniqueResult').innerHTML = `<div class="empty-impact">动作分析失败：${escapeHtml(error.message)}</div>`;
  } finally {
    button.disabled = false; button.textContent = '让 AI 分析并评分';
  }
}

function renderHabits() {
  const habits = [...(data.habits || [])];
  const todayKey = keyOf();
  const penaltyChanged = syncHabitPenaltyQueue();
  if (penaltyChanged) saveData();
  const completionScore = getHabitCompletionScore();
  const habitRank = getHabitRank(completionScore);
  const dangerScore = getHabitDangerScore();
  const todayDone = habits.filter((habit) => getHabitDone(todayKey, habit.id)).length;
  const livePenalties = [...(data.habitPenalties || [])].filter((item) => item.showDate <= todayKey);
  const activePenalty = livePenalties.find((item) => item.status === 'revealed');
  const hiddenPenalty = livePenalties.find((item) => item.status === 'hidden');
  const topPenalty = activePenalty || hiddenPenalty || livePenalties[0] || null;
  const livePenaltyLevel = topPenalty?.level || 0;
  const earnedPerks = [...(data.habitPerks || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const weekStart = new Date(); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const graceAvailable = !(data.habitGraceUses || []).some((item) => item.usedAt >= weekStart.toISOString());
  const recoveryActive = Boolean(data.habitRecoveryUntil && data.habitRecoveryUntil >= todayKey);
  const graceCount = document.querySelector('#habitGraceCount'); if (graceCount) graceCount.textContent = graceAvailable ? '1 张' : '0 张';
  const recoveryState = document.querySelector('#habitRecoveryState'); if (recoveryState) recoveryState.textContent = recoveryActive ? `开启至 ${formatDateKey(data.habitRecoveryUntil)}` : '稳定模式';
  const rewardInventory = document.querySelector('#habitRewardInventory'); if (rewardInventory) rewardInventory.textContent = `${earnedPerks.filter((item) => item.status !== 'used').length} 个可用`;
  const recoveryCopy = document.querySelector('#habitRecoveryCopy'); if (recoveryCopy) recoveryCopy.textContent = recoveryActive ? '连续失守后自动降压 3 天：惩罚锁定 Lv.1，先恢复节奏。' : '连续失守两天会自动进入 3 天恢复期，不再越罚越重。';
  document.querySelector('#habitCount').textContent = String(habits.length);
  document.querySelector('#habitTodayDone').textContent = `${todayDone}/${Math.max(1, habits.length)}`;
  document.querySelector('#habitCompletionScore').textContent = String(completionScore);
  document.querySelector('#habitPenaltyLevel').textContent = topPenalty ? `Lv.${topPenalty.level}` : (isZh() ? '无' : 'None');
  document.querySelector('#habitRank').textContent = habitRank;
  document.querySelector('#habitDangerScore').textContent = String(dangerScore);
  document.querySelector('#habitPenaltyCopy').textContent = activePenalty
    ? `${activePenalty.title} · ${activePenalty.copy}`
    : hiddenPenalty
      ? (isZh() ? `昨天没全清。今天有 1 个隐藏惩罚箱在等你开。` : 'You missed a full clear yesterday. One hidden punishment box is waiting.')
      : (isZh() ? '今天没有惩罚在追杀你。继续守。' : 'No active punishment is chasing you today.');

  const dropWrap = document.querySelector('#habitDropStrip');
  dropWrap.innerHTML = habitDropCatalog.map((drop) => {
    const state = (data.habitDrops || []).find((item) => item.id === drop.id) || {};
    const unlocked = completionScore >= drop.threshold;
    const revealed = Boolean(state.revealedAt);
    const claimed = Boolean(state.claimedAt);
    const progress = Math.min(100, completionScore / drop.threshold * 100);
    return `
      <article class="drop-card ${revealed ? 'revealed' : unlocked ? 'unlocked' : 'locked'}">
        <div class="drop-top"><span class="drop-tier">${drop.code}</span><span class="drop-status">${claimed ? 'CLAIMED' : revealed ? 'READY' : unlocked ? 'UNLOCKED' : 'LOCKED'}</span></div>
        <div class="drop-glyph">${drop.glyph}</div>
        <h4>${escapeHtml(revealed ? drop.revealTitle : drop.title)}</h4>
        <p>${escapeHtml(revealed ? drop.revealCopy : drop.teaser)}</p>
        <div class="drop-progress"><i style="width:${progress}%"></i></div>
        <div class="drop-meta"><span>${unlocked ? (isZh() ? `门槛 RM ${money(drop.threshold)}` : `Gate ${drop.threshold}`) : (isZh() ? `还差 ${drop.threshold - completionScore} 次完成` : `${drop.threshold - completionScore} completions left`)}</span><span>${Math.round(progress)}%</span></div>
        <div class="drop-actions">
          ${!revealed
            ? `<button class="primary-drop" data-reveal-habit-drop="${drop.id}" ${unlocked ? '' : 'disabled'}>${unlocked ? (isZh() ? '开箱' : 'Reveal') : (isZh() ? '还没到' : 'Locked')}</button>`
            : `<button class="primary-drop" data-claim-habit-drop="${drop.id}" ${claimed ? 'disabled' : ''}>${claimed ? (isZh() ? '已领取' : 'Claimed') : (isZh() ? '收下奖励' : 'Claim perk')}</button>`}
          <button data-preview-habit-drop="${drop.id}">${isZh() ? '看内容' : 'Preview'}</button>
        </div>
      </article>
    `;
  }).join('');

  const penaltyList = document.querySelector('#habitPenaltyList');
  const penalties = [...(data.habitPenalties || [])].filter((item) => item.showDate <= todayKey).sort((a, b) => {
    const statusWeight = { revealed: 0, hidden: 1, done: 2, skipped: 3 };
    if ((statusWeight[a.status] ?? 9) === (statusWeight[b.status] ?? 9)) return new Date(b.showDate) - new Date(a.showDate);
    return (statusWeight[a.status] ?? 9) - (statusWeight[b.status] ?? 9);
  });
  penaltyList.innerHTML = penalties.length
    ? penalties.slice(0, 6).map((item) => `
        <article class="panel drop-card habit-penalty-card ${item.status} ${item.animationAt && (Date.now() - new Date(item.animationAt).getTime() < 2200) ? 'drop-opening' : ''}">
          <div class="habit-penalty-top">
            <span>Lv.${item.level} · ${escapeHtml(item.stage || 'time')}</span>
            <b>${item.status === 'revealed' ? (isZh() ? '已开罚箱' : 'Revealed') : item.status === 'hidden' ? (isZh() ? '隐藏中' : 'Hidden') : item.status === 'done' ? (isZh() ? '已执行' : 'Done') : (isZh() ? '已跳过' : 'Skipped')}</b>
          </div>
          <div class="drop-glyph">${escapeHtml(item.glyph || '✦')}</div>
          <h4>${escapeHtml(item.status === 'hidden' ? (isZh() ? '隐藏惩罚箱' : 'Hidden punishment drop') : item.title)}</h4>
          <p>${escapeHtml(item.status === 'hidden' ? item.teaser : (item.aiLoading ? (isZh() ? 'AI 正在替你写这次真正会痛的惩罚。' : 'AI is writing a punishment that actually stings.') : item.copy))}</p>
          ${item.aiError && item.status === 'revealed' ? `<p class="habit-penalty-error">${escapeHtml(item.aiError)}</p>` : ''}
          <div class="drop-meta"><span>${isZh() ? `失败日：${formatDateKey(item.forDate)}` : `Failed on ${formatDateKey(item.forDate)}`}</span><span>${isZh() ? `漏了 ${item.missedCount} / ${Math.max(item.activeCount || item.missedCount, item.missedCount)} 项` : `${item.missedCount}/${Math.max(item.activeCount || item.missedCount, item.missedCount)} missed`}</span></div>
          <div class="habit-actions">
            ${item.status === 'hidden'
              ? `<button class="primary-btn compact-btn" data-reveal-penalty="${item.id}">${isZh() ? '开罚箱' : 'Reveal box'}</button>`
              : `<button class="ghost-btn compact-btn" data-done-penalty="${item.id}" ${item.status === 'revealed' ? '' : 'disabled'}>${isZh() ? '我执行了' : 'Done it'}</button>`}
            <button class="ghost-btn compact-btn" data-grace-penalty="${item.id}" ${graceAvailable && (item.status === 'hidden' || item.status === 'revealed') ? '' : 'disabled'}>${isZh() ? '用本周宽限券' : 'Use grace pass'}</button>
            <button class="ghost-btn compact-btn" data-skip-penalty="${item.id}" ${item.status === 'revealed' ? '' : 'disabled'}>${isZh() ? '先认罚但跳过' : 'Skip once'}</button>
          </div>
        </article>
      `).join('')
    : `<div class="empty-history">${isZh() ? '还没出惩罚箱。最好永远不要出现。' : 'No punishment boxes yet. Keep it that way.'}</div>`;

  const perkList = document.querySelector('#habitPerkList');
  perkList.innerHTML = earnedPerks.length
    ? earnedPerks.map((item) => `
        <article class="panel habit-perk-card">
          <span>${escapeHtml((habitDropCatalog.find((drop) => drop.id === item.dropId)?.code) || 'HABIT DROP')}</span>
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.copy)}</p>
          <small>${item.status === 'used' ? (isZh() ? '已使用' : 'Used') : (isZh() ? '可立即使用' : 'Ready to use')} · ${formatDateKey(keyOf(new Date(item.createdAt)))}</small>
          ${item.status === 'used' ? '' : `<button class="primary-btn compact-btn" data-use-habit-perk="${item.id}">${isZh() ? '现在使用' : 'Use now'}</button>`}
        </article>
      `).join('')
    : `<div class="empty-history">${isZh() ? '还没有习惯奖励入袋。继续刷。' : 'No earned habit perks yet. Keep grinding.'}</div>`;

  const list = document.querySelector('#habitList');
  if (!habits.length) {
    list.innerHTML = `<div class="empty-history">${isZh() ? '先加一个你每天都不想断的习惯。' : 'Add the first habit you refuse to miss.'}</div>`;
    return;
  }
  list.innerHTML = habits.map((habit) => {
    const stats = getHabitStats(habit);
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = keyOf(yesterday);
    const yesterdayDone = getHabitDone(yesterdayKey, habit.id);
    const missLevel = Math.min(5, Math.max(0, stats.currentMiss));
    return `
      <article class="panel habit-card ${stats.todayDone ? 'done' : ''}">
        <div class="habit-card-head">
          <div class="habit-card-title">
            <span>${escapeHtml(habit.category)}</span>
            <h4>${escapeHtml(habit.name)}</h4>
          </div>
          <div class="habit-card-side">
            <strong>${stats.streak}</strong>
            <small>${isZh() ? '连击' : 'streak'}</small>
          </div>
        </div>
        <div class="habit-metrics">
          <div><span>${isZh() ? '今天' : 'Today'}</span><strong>${stats.todayDone ? (isZh() ? '完成' : 'Done') : (isZh() ? '未打卡' : 'Open')}</strong></div>
          <div><span>${isZh() ? '总完成' : 'Total done'}</span><strong>${stats.totalDone}</strong></div>
          <div><span>${isZh() ? '最佳连击' : 'Best streak'}</span><strong>${stats.maxStreak}</strong></div>
          <div><span>${isZh() ? '危险等级' : 'Risk'}</span><strong>${missLevel ? `Lv.${missLevel}` : (isZh() ? '稳' : 'Safe')}</strong></div>
        </div>
        <p class="habit-ai-copy">${escapeHtml(habit.aiReview?.summary || (stats.todayDone ? (isZh() ? '今天有推进，继续连着打。' : 'Progress made today. Keep chaining it.') : (isZh() ? '今天还没完成，但这不代表这习惯本身没价值。' : 'Not done yet, but that does not erase the habit’s value.')))}</p>
        <div class="habit-footer">
          <div class="habit-boosts">
            <span>${escapeHtml((habit.aiReview?.fit_score ?? habit.aiReview?.score) ? `${isZh() ? '适配度' : 'Fit'} ${(habit.aiReview?.fit_score ?? habit.aiReview?.score)}` : (isZh() ? '适配度待判' : 'Fit pending'))}</span>
            <span>${escapeHtml(habit.aiReview?.skill_gain || (isZh() ? '执行力 +1' : 'Discipline +1'))}</span>
            <span>${escapeHtml(habit.aiReview?.discipline_bonus || (isZh() ? '抗摆烂 +1' : 'Anti-slack +1'))}</span>
          </div>
          <div class="habit-actions">
            <button class="primary-btn compact-btn" data-toggle-habit="${habit.id}">${stats.todayDone ? (isZh() ? '取消今天完成' : 'Undo today') : (isZh() ? '今天拿下' : 'Mark done')}</button>
            <button class="ghost-btn compact-btn" data-backfill-habit="${habit.id}" data-backfill-date="${yesterdayKey}">${yesterdayDone ? (isZh() ? '取消昨天补打' : 'Undo yesterday') : (isZh() ? '补打昨天' : 'Backfill yesterday')}</button>
            <button class="ghost-btn compact-btn" data-ai-habit="${habit.id}">AI</button>
            <button class="ghost-btn compact-btn" data-edit-habit="${habit.id}">${isZh() ? '修改' : 'Edit'}</button>
            <button class="ghost-btn compact-btn" data-delete-habit="${habit.id}">${isZh() ? '删除' : 'Delete'}</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
  renderHabitReport();
}

function getManagerDataset() {
  const section = managerState.section;
  if (section === 'records') {
    return Object.entries(data.records)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, record]) => ({
        id: key,
        title: formatDateKey(key),
        subtitle: record.status === 'win' ? (isZh() ? 'RM0 胜利' : 'Zero-spend win') : `${record.reason || (isZh() ? '有消费' : 'Spend logged')} · ${getRecordTransactions(record).length}${isZh() ? ' 笔' : ' tx'}`,
        value: record.status === 'win' ? 'RM 0.00' : `RM ${money(record.amount)}`,
        tag: record.status === 'win' ? (isZh() ? '赢' : 'WIN') : (isZh() ? '破功' : 'SPENT'),
        kind: 'record',
      }));
  }
  if (section === 'rewards') {
    return [...(data.rewards || [])]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: isRewardResolved(item)
          ? `${rewardOutcomeLabel(item)} · ${formatDateKey(keyOf(new Date(getRewardOutcomeAt(item))))}`
          : (isZh() ? '还在冲' : 'Still grinding'),
        value: `RM ${money(item.cost)}`,
        tag: isRewardResolved(item) ? rewardOutcomeLabel(item) : item.priority === 3 ? 'P1' : item.priority === 2 ? 'P2' : 'P3',
        kind: 'reward',
      }));
  }
  if (section === 'impulses') {
    return [...(data.impulses || [])]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: item.resolution === 'killed'
          ? (isZh() ? '已挡掉' : 'Killed')
          : item.resolution === 'vault'
            ? (isZh() ? '转进战利品' : 'Moved to rewards')
            : (isZh() ? '冷静中' : 'Cooling down'),
        value: `RM ${money(item.cost)}`,
        tag: item.trigger || 'other',
        kind: 'impulse',
      }));
  }
  return [...(data.sportsSessions || [])]
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || new Date(b.createdAt) - new Date(a.createdAt))
    .map((item) => ({
      id: item.id,
      title: item.name,
      subtitle: `${formatDateKey(item.date)} · ${Number(item.minutes)} min`,
      value: `RM ${money(item.cost)}`,
      tag: `${item.value}/5`,
      kind: 'sport',
    }));
}

function renderManager() {
  document.querySelectorAll('[data-manager-section]').forEach((button) => {
    button.classList.toggle('active', button.dataset.managerSection === managerState.section);
  });
  const dataset = getManagerDataset();
  const totalPages = Math.max(1, Math.ceil(dataset.length / PAGE_SIZE));
  managerState.page = Math.min(managerState.page, totalPages);
  const pageItems = dataset.slice((managerState.page - 1) * PAGE_SIZE, managerState.page * PAGE_SIZE);

  const summary = document.querySelector('#managerSummary');
  const killed = getKilledImpulses();
  summary.innerHTML = `
    <article class="panel"><span>${isZh() ? '总战绩' : 'Records'}</span><strong>${Object.keys(data.records).length}</strong></article>
    <article class="panel"><span>${isZh() ? '战利品' : 'Rewards'}</span><strong>${(data.rewards || []).length}</strong></article>
    <article class="panel"><span>${isZh() ? '冲动记录' : 'Impulses'}</span><strong>${(data.impulses || []).length}</strong></article>
    <article class="panel"><span>${isZh() ? '挡掉次数' : 'Killed urges'}</span><strong>${killed.length}</strong></article>
  `;

  const heads = {
    records: [isZh() ? '每日战绩总表' : 'All daily records', isZh() ? '同一天可以记录多笔；补记旧消费也会逐笔追加并自动汇总。' : 'Add multiple transactions to any day; backfilled spends are appended and totaled automatically.'],
    rewards: [isZh() ? '战利品总表' : 'All rewards', isZh() ? '进行中、已买到、以后再买、已放弃都能改。' : 'Edit active, bought, later, or dropped rewards here.'],
    impulses: [isZh() ? '冲动记录总表' : 'All impulses', isZh() ? '删掉一笔，挡掉次数和金额会立刻重算。' : 'Deleting one recalculates totals instantly.'],
    sports: [isZh() ? '运动记录总表' : 'All sports sessions', isZh() ? '前几天的球局也能补进去。' : 'Backfill older sports sessions too.'],
  };
  document.querySelector('#managerHead').innerHTML = `
    <div>
      <h3>${heads[managerState.section][0]}</h3>
      <p>${heads[managerState.section][1]}</p>
    </div>
    <button class="primary-btn compact-btn" id="managerQuickAddBtn">＋ ${managerState.section === 'records' ? (isZh() ? '补战绩' : 'Add record') : managerState.section === 'rewards' ? (isZh() ? '加战利品' : 'Add reward') : managerState.section === 'impulses' ? (isZh() ? '加冲动' : 'Add impulse') : (isZh() ? '加运动' : 'Add sport')}</button>
  `;
  document.querySelector('#managerList').innerHTML = pageItems.length
    ? pageItems.map((item) => renderManagerItem(item)).join('')
    : `<div class="empty-history">${isZh() ? '这一栏目前还没有资料。' : 'Nothing here yet.'}</div>`;
  document.querySelector('#managerPageLabel').textContent = isZh()
    ? `第 ${managerState.page} / ${totalPages} 页`
    : `Page ${managerState.page} / ${totalPages}`;
  document.querySelector('#managerPrevBtn').disabled = managerState.page === 1;
  document.querySelector('#managerNextBtn').disabled = managerState.page === totalPages;
}

function renderManagerItem(item) {
  const actions = {
    record: `<button data-add-record-transaction="${item.id}">＋ ${isZh() ? '加一笔' : 'Add tx'}</button><button data-ai-record="${item.id}">${isZh() ? 'AI' : 'AI'}</button><button data-edit-record="${item.id}">${isZh() ? '修改' : 'Edit'}</button><button class="danger-lite" data-delete-record="${item.id}">${isZh() ? '删除' : 'Delete'}</button>`,
    reward: `<button data-edit-loot="${item.id}">修改</button><button data-resolve-loot="${item.id}">${isRewardResolved((data.rewards || []).find((r) => r.id === item.id) || {}) ? '改状态' : '结算'}</button><button class="danger-lite" data-delete-loot="${item.id}">删除</button>`,
    impulse: `<button data-edit-impulse="${item.id}">修改</button><button class="danger-lite" data-delete-impulse="${item.id}">删除</button>`,
    sport: `<button data-ai-sport="${item.id}">AI</button><button data-edit-sport="${item.id}">修改</button><button class="danger-lite" data-delete-sport="${item.id}">删除</button>`,
  };
  return `
    <article class="manager-item" data-manager-kind="${item.kind}" data-manager-id="${item.id}">
      <div class="manager-item-main">
        <span class="manager-tag">${escapeHtml(item.tag)}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.subtitle)}</small>
      </div>
      <div class="manager-item-side">
        <b>${escapeHtml(item.value)}</b>
        <div class="manager-item-actions">${actions[item.kind]}</div>
      </div>
    </article>
  `;
}

function renderRules() {
  const rules = isZh()
    ? [
        ['RM0 就是 RM0。', '今天没有必要花，就一分钱都不要出。'],
        ['花了就认，不要骗自己。', '钱一出去就马上记。不是为了内疚，是为了抓弱点。'],
        ['输一天可以，不准连输两天。', '今天破功就算，明天直接反击。'],
      ]
    : [
        ['Protect the zero.', 'If it is not necessary, do not spend it.'],
        ['Record the truth.', 'Logging the spend beats pretending it never happened.'],
        ['Never miss twice.', 'One bad day is data. Two is a pattern.'],
      ];
  document.querySelectorAll('.rule-card').forEach((card, index) => {
    card.querySelector('h3').textContent = rules[index][0];
    card.querySelector('p').textContent = rules[index][1];
  });
}

function openRecordForm(key = '', source = 'manual') {
  if (!requireCloudAuth(isZh() ? '管理战绩' : 'manage records')) return;
  const existing = key ? data.records[key] : null;
  if (existing?.status === 'spent' && getRecordTransactions(existing).length > 1) {
    openRecordAI(key);
    showToast(
      isZh() ? '这天有多笔消费' : 'Multiple transactions on this day',
      isZh() ? '请在逐笔战报里分别修改，系统会自动重算当天总额。' : 'Edit each transaction in the detailed report; the daily total updates automatically.',
    );
    return;
  }
  document.querySelector('#recordOriginalKey').value = key;
  document.querySelector('#recordDialogKicker').textContent = existing ? 'EDIT DAILY RECORD' : 'BACKFILL DAILY RECORD';
  document.querySelector('#recordDialogTitle').textContent = existing ? (isZh() ? '改回正确的记录' : 'Fix this daily record') : (isZh() ? '补一笔消费或 RM0 战绩' : 'Add a transaction or zero-spend day');
  document.querySelector('#recordEditDate').textContent = existing ? formatDateKey(key) : (source === 'warning' ? (isZh() ? '现在补今天，别拖。' : 'Log today before midnight.') : (isZh() ? '前几天漏了？现在补。' : 'Missed a day? Add it now.'));
  document.querySelector('#recordDateInput').value = key || keyOf();
  document.querySelector('#recordStatusInput').value = existing?.status || 'win';
  document.querySelector('#recordAmountInput').value = existing?.amount || 0;
  document.querySelector('#recordReasonInput').value = existing?.reason || '';
  document.querySelector('#recordSubmitBtn').textContent = existing ? (isZh() ? '保存修改' : 'Save changes') : (isZh() ? '追加进这天战绩' : 'Add to this day');
  document.querySelector('#recordDeleteBtn').hidden = !existing;
  document.querySelector('#recordDialog').showModal();
}

function openSpendDialog(recordKey = keyOf(), transactionId = '') {
  if (!requireCloudAuth(isZh() ? '记录消费' : 'log spending')) return;
  const form = document.querySelector('#spendForm');
  form.reset();
  const record = data.records[recordKey];
  const tx = getRecordTransactions(record).find((item) => item.id === transactionId);
  document.querySelector('#spendRecordKeyInput').value = recordKey;
  document.querySelector('#spendTransactionIdInput').value = transactionId;
  document.querySelector('#spendDialog .modal-kicker').textContent = transactionId
    ? (isZh() ? '修改这一笔消费' : 'EDIT TRANSACTION')
    : (isZh() ? '记录一笔消费' : 'LOG A TRANSACTION');
  document.querySelector('#spendDialog h2').textContent = transactionId
    ? (isZh() ? '改回这一笔的真相' : 'Fix this transaction')
    : (isZh() ? '是什么让 RM0 破功了？' : 'What broke the zero?');
  document.querySelector('#spendDialog p').textContent = transactionId
    ? (isZh() ? '一笔一笔改清楚，战报才有用。' : 'Clean transaction logs make the report useful.')
    : (isZh() ? '老实记下来。数据比内疚有用。' : 'Record it honestly. Data beats guilt.');
  if (tx) {
    document.querySelector('#amountInput').value = tx.amount || '';
    document.querySelector('#reasonInput').value = tx.reason || '';
    const radio = form.querySelector(`input[name="spendType"][value="${tx.type || 'impulse'}"]`);
    if (radio) radio.checked = true;
  }
  document.querySelector('#spendDialog .danger-btn').textContent = transactionId
    ? (isZh() ? '保存这笔修改' : 'SAVE TRANSACTION')
    : (isZh() ? '记下这笔消费' : 'RECORD SPEND');
  document.querySelector('#spendDialog').showModal();
  setTimeout(() => document.querySelector('#amountInput').focus(), 100);
}

function openLootForm(item = null) {
  if (!requireCloudAuth(isZh() ? '管理战利品' : 'manage rewards')) return;
  const form = document.querySelector('#lootForm');
  form.reset();
  pendingLootImage = item?.image || '';
  document.querySelector('#lootEditId').value = item?.id || '';
  document.querySelector('#lootDialogTitle').textContent = item ? (isZh() ? '改一下这个战利品' : 'Edit reward') : (isZh() ? '你想赢什么回来？' : 'What do you want to earn?');
  document.querySelector('#lootSubmitBtn').textContent = item ? (isZh() ? '保存修改' : 'Save reward') : (isZh() ? '放进战利品库' : 'Add to vault');
  document.querySelector('#lootNameInput').value = item?.name || '';
  document.querySelector('#lootCostInput').value = item?.cost || '';
  document.querySelector('#lootPriorityInput').value = item?.priority || 2;
  document.querySelector('#lootCategoryInput').value = item?.category || 'food';
  document.querySelector('#lootWhyInput').value = item?.why || '';
  const preview = document.querySelector('#lootImagePreview');
  preview.style.backgroundImage = pendingLootImage ? `url('${pendingLootImage}')` : '';
  preview.classList.toggle('has-image', !!pendingLootImage);
  document.querySelector('#imagePickerText').textContent = pendingLootImage ? (isZh() ? '更换图片' : 'Change image') : (isZh() ? '选择图片' : 'Pick image');
  document.querySelector('#lootDialog').showModal();
}

function openImpulseForm(item = null) {
  if (!requireCloudAuth(isZh() ? '记录冲动' : 'log impulses')) return;
  const form = document.querySelector('#impulseForm');
  form.reset();
  document.querySelector('#impulseEditId').value = item?.id || '';
  document.querySelector('#impulseNameInput').value = item?.name || '';
  document.querySelector('#impulseCostInput').value = item?.cost || '';
  document.querySelector('#impulseTriggerInput').value = item?.trigger || 'bored';
  document.querySelector('#impulseSubmitBtn').textContent = item ? (isZh() ? '保存修改' : 'Save impulse') : (isZh() ? '拦下来，开始冷静 24 小时' : 'Intercept it');
  document.querySelector('#impulseDialog h2').textContent = item ? (isZh() ? '改一下这个冲动记录' : 'Edit impulse log') : (isZh() ? '现在手痒想买什么？' : 'What are you itching to buy?');
  document.querySelector('#impulseDialog').showModal();
}

function openRewardResolveDialog(item) {
  if (!item) return;
  document.querySelector('#rewardResolveId').value = item.id;
  document.querySelector('#rewardResolveTitle').textContent = getRewardOutcome(item) === 'earned'
    ? (isZh() ? '这个已赢得奖励最后怎样了？' : 'What happened to this earned reward?')
    : isRewardResolved(item)
    ? (isZh() ? '改一下这件战利品的结局' : 'Change this reward outcome')
    : (isZh() ? '这件战利品最后怎样了？' : 'How did this reward end?');
  document.querySelector('#rewardResolveCopy').textContent = getRewardOutcome(item) === 'earned'
    ? (isZh() ? '它已经是你赢到的，不会再扣普通奖励额度。只记录你已使用、延后或放弃。' : 'It is already earned and will not consume normal reward balance.')
    : isRewardResolved(item)
    ? (isZh() ? '它不会消失，只是换个状态而已。' : 'It will not disappear. You are just changing its state.')
    : (isZh() ? '不要让它无声无息结束，给它一个明确结果。' : 'Do not let it fade out. Give it a clear ending.');
  const selected = getRewardOutcome(item) === 'earned' ? 'bought' : (getRewardOutcome(item) || 'bought');
  document.querySelectorAll('input[name="rewardResolution"]').forEach((input) => {
    input.checked = input.value === selected;
  });
  document.querySelector('#rewardResolveSubmit').textContent = isZh() ? '确认结果' : 'Save outcome';
  document.querySelector('#rewardResolveReset').hidden = !isRewardResolved(item);
  document.querySelector('#rewardResolveDialog').showModal();
}

function saveRewardResolution() {
  if (!requireCloudAuth(isZh() ? '改战利品结果' : 'change reward outcome')) return;
  const id = document.querySelector('#rewardResolveId').value;
  const choice = document.querySelector('input[name="rewardResolution"]:checked')?.value;
  const item = (data.rewards || []).find((reward) => reward.id === id);
  if (!item || !choice) return;
  checkpoint(choice === 'bought' ? '战利品已买到' : choice === 'later' ? '战利品延后' : '战利品放弃');
  item.outcome = choice;
  item.outcomeAt = new Date().toISOString();
  item.redeemedAt = choice === 'bought' ? item.outcomeAt : null;
  saveData();
  document.querySelector('#rewardResolveDialog').close();
  render();
  showToast(
    choice === 'bought'
      ? (isZh() ? '这件战利品算正式拿下了' : 'Reward marked as bought')
      : choice === 'later'
        ? (isZh() ? '这件战利品先留到以后' : 'Reward moved to later')
        : (isZh() ? '这件战利品已放弃' : 'Reward dropped'),
    choice === 'bought'
      ? (isZh() ? '只有真的买到，才会扣掉你的爽钱额度。' : 'Only bought rewards consume reward balance.')
      : (isZh() ? '它不会消失，只是从进行中换去归档区。' : 'It will stay archived instead of disappearing.')
  );
}

function resetRewardResolution(id) {
  if (!requireCloudAuth(isZh() ? '恢复战利品' : 'restore rewards')) return;
  const item = (data.rewards || []).find((reward) => reward.id === id);
  if (!item) return;
  checkpoint('战利品恢复进行中');
  item.outcome = item.sourceDropId ? 'earned' : null;
  item.outcomeAt = item.sourceDropId ? (item.earnedAt || new Date().toISOString()) : null;
  item.redeemedAt = null;
  saveData();
  document.querySelector('#rewardResolveDialog').close();
  render();
  showToast(
    item.sourceDropId ? (isZh() ? '已恢复为掉落奖励' : 'Drop reward restored') : (isZh() ? '战利品已放回进行中' : 'Reward moved back to active'),
    item.sourceDropId ? (isZh() ? '它仍留在你已经赢回来的奖励区。' : 'It stays in your earned rewards.') : (isZh() ? '现在会重新回到你正在赢回来的清单。' : 'It is active again.'),
  );
}

function populateSportSkillSelects(selected = '') {
  const options = (data.sportSkills || []).map((skill) => `<option value="${skill.id}" ${skill.id === selected ? 'selected' : ''}>${escapeHtml(skill.name)}</option>`).join('');
  const sessionSelect = document.querySelector('#sportSkillInput');
  const techniqueSelect = document.querySelector('#techniqueSkillInput');
  if (sessionSelect) sessionSelect.innerHTML = `<option value="">未建立项目／一般运动</option>${options}`;
  if (techniqueSelect) techniqueSelect.innerHTML = `<option value="">一般动作分析</option>${options}`;
}

function openSportForm(item = null, skillId = '') {
  if (!requireCloudAuth(isZh() ? '记录运动' : 'log sports')) return;
  const form = document.querySelector('#sportForm');
  form.reset();
  populateSportSkillSelects(item?.skillId || skillId);
  document.querySelector('#sportEditId').value = item?.id || '';
  document.querySelector('#sportDateInput').value = item?.date || keyOf();
  document.querySelector('#sportNameInput').value = item?.name || '';
  document.querySelector('#sportNoteInput').value = item?.note || '';
  document.querySelector('#sportCostInput').value = item?.cost || '';
  document.querySelector('#sportMinutesInput').value = item?.minutes || 60;
  document.querySelector('#sportValueInput').value = item?.value || 4;
  document.querySelector('#sportEffortInput').value = item?.effort || 5;
  document.querySelector('#sportCountSpend').checked = item?.countSpend ?? true;
  document.querySelector('#sportDialog').showModal();
}

function openSportSkillForm(item = null) {
  if (!requireCloudAuth(isZh() ? '建立运动项目' : 'create a sport skill')) return;
  document.querySelector('#sportSkillForm').reset();
  document.querySelector('#sportSkillEditId').value = item?.id || '';
  document.querySelector('#sportSkillNameInput').value = item?.name || '';
  document.querySelector('#sportSkillGoalInput').value = item?.goal || '';
  document.querySelector('#sportSkillBaselineInput').value = item?.baseline || '';
  document.querySelector('#sportSkillExperienceInput').value = item?.experience || 'none';
  document.querySelector('#sportSkillFrequencyInput').value = item?.frequency || 'flexible';
  document.querySelector('#sportSkillDialogTitle').textContent = item ? '修改运动目标与现况' : '开始学一项运动';
  document.querySelector('#sportSkillDialog').showModal();
}

function openHabitForm(item = null) {
  if (!requireCloudAuth(isZh() ? '管理习惯' : 'manage habits')) return;
  const form = document.querySelector('#habitForm');
  form.reset();
  document.querySelector('#habitEditId').value = item?.id || '';
  document.querySelector('#habitNameInput').value = item?.name || '';
  document.querySelector('#habitCategoryInput').value = item?.category || 'discipline';
  document.querySelector('#habitDifficultyInput').value = item?.difficulty || 3;
  document.querySelector('#habitDialogTitle').textContent = item ? (isZh() ? '改这个习惯任务' : 'Edit habit') : (isZh() ? '加一个不能断的习惯' : 'Add a must-hit habit');
  document.querySelector('#habitSubmitBtn').textContent = item ? (isZh() ? '保存习惯' : 'Save habit') : (isZh() ? '放进每日打卡' : 'Add habit');
  document.querySelector('#habitDialog').showModal();
}

function habitAIContext(habit) {
  const stats = getHabitStats(habit);
  const allHabits = data.habits || [];
  const categoryCount = allHabits.filter((item) => item.category === habit.category).length;
  return {
    habit: {
      name: habit.name,
      category: habit.category,
      difficulty: Number(habit.difficulty || 3),
      todayDone: stats.todayDone,
      streak: stats.streak,
      maxStreak: stats.maxStreak,
      totalDone: stats.totalDone,
      currentMiss: stats.currentMiss,
      worstMiss: stats.worstMiss,
      categoryCount,
      createdAt: habit.createdAt,
    },
    eric: {
      traits: [
        '极度吃连续纪录、等级、成就感',
        '讨厌摆烂，喜欢硬核挑战',
        '越像游戏越会认真',
        '需要看到自己到底变强了什么',
      ],
      priorities: [
        '习惯要真的对长期成长有帮助',
        '习惯本身的适配度要高，不是为了凑数',
        '今天没做到要批执行，不要直接否定习惯本身',
      ],
    },
  };
}

function habitPenaltyAIContext(item) {
  const missedHabits = (data.habits || []).filter((habit) => item.habitIds?.includes(habit.id));
  return {
    penalty: {
      forDate: item.forDate,
      showDate: item.showDate,
      level: item.level,
      stage: item.stage,
      missedCount: item.missedCount,
      activeCount: item.activeCount,
      missedHabits: missedHabits.map((habit) => ({
        name: habit.name,
        category: habit.category,
        difficulty: habit.difficulty,
      })),
    },
    eric: {
      traits: [
        '极度吃挑战、连续纪录、成就感',
        '对普通人觉得痛的惩罚未必有感觉',
        '时间惩罚、金钱惩罚、公开认账会更有效',
        '讨厌空话，惩罚必须具体、够力、可执行',
      ],
    },
  };
}

async function analyzeHabit(id, { open = false } = {}) {
  const habit = (data.habits || []).find((item) => item.id === id);
  if (!habit) return;
  habit.aiReview = habit.aiReview || {};
  habit.aiReview.loading = true;
  habit.aiReview.error = '';
  saveData();
  render();
  if (open) openHabitAI(id);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        action: 'habit',
        context: habitAIContext(habit),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    habit.aiReview = {
      ...(habit.aiReview || {}),
      ...JSON.parse(result.text.replace(/^```json\s*|\s*```$/g, '').trim()),
      loading: false,
      error: '',
      updatedAt: new Date().toISOString(),
      provider: result.provider,
    };
  } catch (error) {
    habit.aiReview = {
      ...(habit.aiReview || {}),
      loading: false,
      error: error.name === 'AbortError'
        ? 'AI 这次看太久了，等下再跑。'
        : error.message === 'GROQ_API_KEY_NOT_CONFIGURED'
          ? 'Groq 还没接好。'
          : error.message === 'AI_REQUEST_TIMEOUT'
            ? 'AI 请求超时了，重试一次。'
            : `AI 分析失败：${error.message}`,
    };
  } finally {
    clearTimeout(timeoutId);
    saveData();
    render();
    if (document.querySelector('#habitAiDialog')?.open) {
      renderHabitAI((data.habits || []).find((item) => item.id === id));
    }
  }
}

async function analyzeHabitPenalty(id) {
  const item = (data.habitPenalties || []).find((penalty) => penalty.id === id);
  if (!item) return;
  item.aiLoading = true;
  item.aiError = '';
  saveData();
  renderHabits();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        action: 'habitPenalty',
        context: habitPenaltyAIContext(item),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    const review = JSON.parse(result.text.replace(/^```json\s*|\s*```$/g, '').trim());
    item.aiReview = review;
    item.title = review.title || item.title;
    item.copy = review.copy || item.copy;
    item.label = review.label || item.label;
    item.glyph = review.glyph || item.glyph || '✦';
    item.aiLoading = false;
    item.aiError = '';
  } catch (error) {
    item.aiLoading = false;
    item.aiError = error.name === 'AbortError'
      ? 'AI 惩罚箱这次想太久了。'
      : error.message === 'AI_REQUEST_TIMEOUT'
        ? 'AI 惩罚箱请求超时。'
        : `AI 惩罚生成失败：${error.message}`;
  } finally {
    clearTimeout(timeoutId);
    saveData();
    renderHabits();
  }
}

function openHabitAI(id) {
  activeAIHabitId = id;
  const habit = (data.habits || []).find((item) => item.id === id);
  if (!habit) return;
  document.querySelector('#habitAiDialog').showModal();
  renderHabitAI(habit);
  if (!habit.aiReview?.summary && !habit.aiReview?.loading) analyzeHabit(id);
}

function renderHabitAI(habit) {
  if (!habit) return;
  const stats = getHabitStats(habit);
  document.querySelector('#habitAiName').textContent = habit.name;
  document.querySelector('#habitAiStatus').textContent = `${isZh() ? '连击' : 'Streak'} ${stats.streak} · ${isZh() ? '总完成' : 'Total done'} ${stats.totalDone}`;
  const box = document.querySelector('#habitAiAnalysis');
  if (habit.aiReview?.loading) {
    box.innerHTML = `<div class="empty-impact">${isZh() ? 'AI 正在判这个习惯有没有把你变强。' : 'AI is reviewing this habit.'}</div>`;
    return;
  }
  if (habit.aiReview?.error) {
    box.innerHTML = `<div class="empty-impact">${escapeHtml(habit.aiReview.error)}</div>`;
    return;
  }
  const review = habit.aiReview || {};
  const fitScore = review.fit_score ?? review.importance_score ?? review.score ?? '—';
  const executionScore = review.execution_score ?? (stats.todayDone ? 100 : Math.max(20, 65 - (stats.currentMiss * 12)));
  box.innerHTML = `
    <div class="day-ai-hero">
      <div class="ai-score-card"><div class="ai-score"><strong>${escapeHtml(fitScore)}</strong><span>${isZh() ? '习惯适配分' : 'HABIT FIT'}</span></div></div>
      <div class="ai-verdict"><h3>${escapeHtml(review.verdict || (isZh() ? '还没判' : 'Pending'))}</h3><p>${escapeHtml(review.summary || (isZh() ? '先打一轮数据给它看。' : 'Give it more data first.'))}</p></div>
    </div>
    <div class="ai-details">
      <div class="ai-detail"><b>${isZh() ? '今天执行分' : 'EXECUTION TODAY'}</b><span>${escapeHtml(executionScore)}</span></div>
      <div class="ai-detail"><b>${isZh() ? '为什么这习惯适合你' : 'WHY THIS FITS YOU'}</b><span>${escapeHtml(review.fit_reason || review.why || '—')}</span></div>
      <div class="ai-detail"><b>${isZh() ? '你加成了什么' : 'SKILL GAIN'}</b><span>${escapeHtml(review.skill_gain || '—')}</span></div>
      <div class="ai-detail"><b>${isZh() ? '属性提升' : 'ATTRIBUTE'}</b><span>${escapeHtml(review.attribute_boost || '—')}</span></div>
      <div class="ai-detail"><b>${isZh() ? '纪律加成' : 'DISCIPLINE BONUS'}</b><span>${escapeHtml(review.discipline_bonus || '—')}</span></div>
      <div class="ai-detail"><b>${isZh() ? '最大风险' : 'RISK'}</b><span>${escapeHtml(review.risk || '—')}</span></div>
      <div class="ai-detail ai-detail-wide"><b>${isZh() ? '下一步' : 'NEXT MOVE'}</b><span>${escapeHtml(review.next_move || '—')}</span></div>
    </div>
    <div class="record-ai-actions"><button class="primary-btn compact-btn" data-retry-ai-habit="${habit.id}">${isZh() ? '重跑习惯 AI' : 'Run habit AI again'}</button></div>
  `;
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const max = 800;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.76));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function showToast(title = 'DAY SECURED', copyText = 'Your streak lives on.') {
  const toast = document.querySelector('#toast');
  toast.querySelector('b').textContent = title;
  toast.querySelector('small').textContent = copyText;
  const undo = toast.querySelector('#toastUndoBtn');
  undo.hidden = !pendingUndoToast;
  pendingUndoToast = false;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 4200);
}

function recordAIContext(recordKey, record) {
  const stats = getStats();
  return {
    date: recordKey,
    status: record.status || 'pending',
    amount: Number(record.amount || 0),
    reason: record.reason || '',
    type: record.type || '',
    transactions: getRecordTransactions(record).map((tx) => ({
      amount: Number(tx.amount || 0),
      reason: tx.reason || '',
      type: tx.type || 'impulse',
    })),
    dailyTarget: Number(data.dailyTarget || 0),
    currentStreak: stats.current,
    bestStreak: stats.best,
    totalSaved: stats.saved,
    recentRecords: Object.entries(data.records)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7)
      .map(([key, item]) => ({
        date: key,
        status: item.status,
        amount: Number(item.amount || 0),
        reason: item.reason || '',
      })),
  };
}

function transactionAIContext(recordKey, record, transaction) {
  const stats = getStats();
  const lowerReason = String(transaction.reason || '').toLowerCase();
  const spendProfile = {
    foodRelated: /鸡|鸡胸|蛋|饭|面|奶茶|咖啡|午餐|晚餐|宵夜|food|meal|coffee|tea|protein|lunch|dinner/.test(lowerReason),
    trainingRelated: /鸡胸|蛋白|protein|gym|健身|跑步|训练|运动/.test(lowerReason),
    convenienceSpend: /grab|外卖|delivery|便利店|7-11|全家/.test(lowerReason),
    utilitySpend: /交通|油|parking|park|toll|车费|transport/.test(lowerReason),
  };
  return {
    date: recordKey,
    transaction: {
      id: transaction.id,
      amount: Number(transaction.amount || 0),
      reason: transaction.reason || '',
      type: transaction.type || 'impulse',
      createdAt: transaction.createdAt,
      profile: spendProfile,
    },
    day: {
      totalAmount: Number(record.amount || 0),
      transactionCount: getRecordTransactions(record).length,
      status: record.status || 'spent',
    },
    eric: {
      dailyTarget: Number(data.dailyTarget || 0),
      currentStreak: stats.current,
      bestStreak: stats.best,
      totalSaved: stats.saved,
      traits: [
        '非常吃游戏化和数据感',
        '喜欢破纪录，不喜欢模糊答案',
        '会为了目标对自己很狠',
        '花钱最大敌人是冲动，不是没钱',
        '如果是训练、表现、真正有价值的东西，会接受合理支出',
      ],
    },
  };
}

function sportAIContext(session) {
  const monthPrefix = String(session.date || keyOf()).slice(0, 7);
  const monthSessions = (data.sportsSessions || []).filter((item) => String(item.date || '').startsWith(monthPrefix));
  const monthSpend = monthSessions.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const monthMinutes = monthSessions.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  return {
    session: {
      name: session.name,
      date: session.date,
      cost: Number(session.cost || 0),
      minutes: Number(session.minutes || 0),
      hours: Number(session.minutes || 0) / 60,
      hourlyCost: Number(session.minutes || 0) ? Number(session.cost || 0) / (Number(session.minutes || 0) / 60) : 0,
      value: Number(session.value || 0),
      effort: Number(session.effort || 5),
      trainingEvidence: session.note || '',
      countSpend: Boolean(session.countSpend),
    },
    linkedSkill: session.skillId ? (() => {
      const skill = (data.sportSkills || []).find((item) => item.id === session.skillId);
      return skill ? { name: skill.name, goal: skill.goal, currentProgress: skill.progress, stage: skill.aiAssessment?.stage, milestone: skill.aiAssessment?.milestone } : null;
    })() : null,
    month: {
      sessions: monthSessions.length,
      totalSpend: monthSpend,
      totalHours: monthMinutes / 60,
      budget: Number(data.sportBudget || 0),
    },
    eric: {
      traits: [
        '会认真训练，喜欢看数据和进步',
        '愿意为真正有帮助的运动花钱',
        '不喜欢只是花钱买参与感',
        '想把每一笔开销都换成实际表现和成长',
      ],
    },
  };
}

function sportEvidenceProfile(skill, state = data) {
  const logs = (state.sportsSessions || []).filter((item) => item.skillId === skill.id);
  const techniqueReviews = (state.sportTechniqueReviews || []).filter((item) => item.skillId === skill.id);
  const objectivePattern = /(\d+(?:\.\d+)?\s*(?:km|m|cm|kg|lb|秒|分钟|小时|次|组|趟|圈|%|bpm|spm)|命中率|成功率|配速|步频|回位时间|比赛|测验|测试)/i;
  const coachPattern = /(教练|老师|裁判|比赛|录像|视频|动作分析|评分|测试|测验|pb|pr)/i;
  const objectiveEvidenceCount = logs.filter((item) => objectivePattern.test(`${item.name || ''} ${item.note || ''}`)).length;
  const coachedEvidenceCount = logs.filter((item) => coachPattern.test(`${item.name || ''} ${item.note || ''}`)).length;
  const verifiedTechniqueCount = techniqueReviews.filter((item) => Number(item.confidence || 0) >= 60).length;
  const experienceBase = { none: 15, basic: 25, regular: 40, advanced: 55 }[skill.experience] || 15;
  const evidenceCeiling = Math.min(94,
    experienceBase
    + Math.min(24, objectiveEvidenceCount * 4)
    + Math.min(15, verifiedTechniqueCount * 5)
    + Math.min(6, coachedEvidenceCount * 2));
  const confidenceCeiling = Math.min(92, 28 + (objectiveEvidenceCount * 7) + (verifiedTechniqueCount * 9) + (coachedEvidenceCount * 4));
  return {
    totalLogs: logs.length,
    objectiveEvidenceCount,
    coachedEvidenceCount,
    verifiedTechniqueCount,
    evidenceCeiling,
    confidenceCeiling,
    rule: '训练次数本身不加掌握分；没有距离、时间、命中率、动作评分、教练反馈、比赛或测试等能力证据时，分数必须受上限约束。',
  };
}

function applyStrictSportScore(skill, parsed) {
  const previous = Number(skill.progress || 0);
  const profile = sportEvidenceProfile(skill);
  const previousSnapshot = skill.aiAssessment?.evidence_snapshot || {};
  const newObjectiveProof = profile.objectiveEvidenceCount > Number(previousSnapshot.objectiveEvidenceCount || 0)
    || profile.verifiedTechniqueCount > Number(previousSnapshot.verifiedTechniqueCount || 0);
  const proposed = Math.max(0, Math.min(100, Number(parsed.progress_score || 0)));
  let strictScore = Math.min(proposed, profile.evidenceCeiling);
  if (skill.aiAssessment?.updatedAt && strictScore > previous) {
    strictScore = Math.min(strictScore, previous + (newObjectiveProof ? 5 : 2));
  }
  if (previous > profile.evidenceCeiling) strictScore = Math.min(strictScore, profile.evidenceCeiling);
  else if (skill.aiAssessment?.updatedAt && strictScore < previous - 12) strictScore = previous - 12;
  strictScore = Math.round(Math.max(0, strictScore));
  const dimensions = Object.fromEntries(Object.entries(parsed.dimensions || {}).map(([key, value]) => [
    key,
    Math.round(Math.max(0, Math.min(Number(value || 0), Math.min(100, profile.evidenceCeiling + 10)))),
  ]));
  return {
    ...parsed,
    progress_score: strictScore,
    delta: strictScore - previous,
    confidence: Math.round(Math.max(0, Math.min(Number(parsed.confidence || 0), profile.confidenceCeiling))),
    dimensions,
    evidence_snapshot: profile,
    score_guardrail: `能力证据上限 ${profile.evidenceCeiling}；${profile.objectiveEvidenceCount} 份客观表现、${profile.verifiedTechniqueCount} 份可信动作评分、${profile.coachedEvidenceCount} 份外部反馈。训练 ${profile.totalLogs} 次本身不计分。`,
  };
}

function sportSkillAIContext(skill) {
  const logs = [...(data.sportsSessions || [])]
    .filter((item) => item.skillId === skill.id)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .slice(-20)
    .map((item) => ({
      date: item.date,
      training: item.name,
      minutes: Number(item.minutes || 0),
      effort: Number(item.effort || 5),
      selfValue: Number(item.value || 0),
      evidence: item.note || '',
      aiSessionVerdict: item.aiReview?.verdict || '',
      aiSessionSkillGain: item.aiReview?.skill_gain || '',
    }));
  const techniqueReviews = [...(data.sportTechniqueReviews || [])]
    .filter((item) => item.skillId === skill.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-8)
    .map((item) => ({ date: item.createdAt, movement: item.movement, score: item.score, confidence: item.confidence, observed: item.observed, fixes: item.fixes }));
  return {
    sport: skill.name,
    definitionOf100: skill.goal,
    baselineDescription: skill.baseline,
    experience: skill.experience,
    intendedFrequency: skill.frequency,
    previousScore: Number(skill.progress || 0),
    previousAssessment: skill.aiAssessment?.updatedAt ? {
      score: skill.aiAssessment.progress_score,
      confidence: skill.aiAssessment.confidence,
      stage: skill.aiAssessment.stage,
      milestone: skill.aiAssessment.milestone,
      dimensions: skill.aiAssessment.dimensions,
      assessedAt: skill.aiAssessment.updatedAt,
    } : null,
    trainingLogs: logs,
    techniqueReviews,
    evidenceCount: logs.length + techniqueReviews.length,
    totalMinutes: logs.reduce((sum, item) => sum + item.minutes, 0),
    lastTrainingDate: logs.at(-1)?.date || null,
    evidenceProfile: sportEvidenceProfile(skill),
    scoringRule: '评分必须由能力证据决定，训练次数本身得 0 分，不按打卡次数线性增加。缺乏客观结果时必须明显压低分数与 confidence。100 只等于用户的 definitionOf100 已被逐项证明。',
  };
}

async function analyzeRecord(recordKey, { open = false } = {}) {
  const record = data.records[recordKey];
  if (!record) return;
  record.aiReview = record.aiReview || {};
  record.aiReview.loading = true;
  record.aiReview.error = '';
  saveData();
  render();
  if (open) openRecordAI(recordKey);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        action: 'record',
        context: recordAIContext(recordKey, record),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    record.aiReview = {
      ...(record.aiReview || {}),
      ...JSON.parse(result.text.replace(/^```json\s*|\s*```$/g, '').trim()),
      loading: false,
      error: '',
      updatedAt: new Date().toISOString(),
      provider: result.provider,
    };
  } catch (error) {
    record.aiReview = {
      ...(record.aiReview || {}),
      loading: false,
      error: error.name === 'AbortError'
        ? 'AI 这次想太久了。你等一下再按一次。'
        : error.message === 'GROQ_API_KEY_NOT_CONFIGURED'
          ? 'Groq 还没接好。'
          : error.message === 'AI_REQUEST_TIMEOUT'
            ? 'AI 请求超时了，重试一次。'
            : `AI 分析失败：${error.message}`,
    };
  } finally {
    clearTimeout(timeoutId);
    saveData();
    render();
    if (document.querySelector('#recordAiDialog').open) {
      renderRecordAI(recordKey, data.records[recordKey]);
    }
  }
}

async function analyzeTransaction(recordKey, transactionId, { open = false } = {}) {
  const record = data.records[recordKey];
  if (!record) return;
  const transaction = getRecordTransactions(record).find((item) => item.id === transactionId);
  if (!transaction) return;
  transaction.aiReview = transaction.aiReview || {};
  transaction.aiReview.loading = true;
  transaction.aiReview.error = '';
  saveData();
  if (open) openRecordAI(recordKey);
  render();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        action: 'transaction',
        context: transactionAIContext(recordKey, record, transaction),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    transaction.aiReview = {
      ...(transaction.aiReview || {}),
      ...JSON.parse(result.text.replace(/^```json\s*|\s*```$/g, '').trim()),
      loading: false,
      error: '',
      updatedAt: new Date().toISOString(),
      provider: result.provider,
    };
  } catch (error) {
    transaction.aiReview = {
      ...(transaction.aiReview || {}),
      loading: false,
      error: error.name === 'AbortError'
        ? '这笔 AI 想太久了，等一下再按一次。'
        : error.message === 'GROQ_API_KEY_NOT_CONFIGURED'
          ? 'Groq 还没接好。'
          : error.message === 'AI_REQUEST_TIMEOUT'
            ? 'AI 请求超时了，重试一次。'
            : `AI 分析失败：${error.message}`,
    };
  } finally {
    clearTimeout(timeoutId);
    saveData();
    render();
    if (document.querySelector('#recordAiDialog').open) {
      renderRecordAI(recordKey, data.records[recordKey]);
    }
  }
}

async function analyzeSportSkill(id, { open = false } = {}) {
  const skill = (data.sportSkills || []).find((item) => item.id === id);
  if (!skill) return;
  skill.aiAssessment = { ...(skill.aiAssessment || {}), loading: true, error: '' };
  saveData();
  render();
  if (open) openSportProgress(id, false);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch('/api/ai', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ action: 'sportSkill', context: sportSkillAIContext(skill) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    const parsed = JSON.parse(result.text.replace(/^```json\s*|\s*```$/g, '').trim());
    const previous = Number(skill.progress || 0);
    const calibrated = applyStrictSportScore(skill, parsed);
    skill.progress = calibrated.progress_score;
    skill.aiAssessment = { ...calibrated, progress_score: skill.progress, delta: skill.progress - previous, loading: false, error: '', updatedAt: new Date().toISOString(), provider: result.provider };
    skill.updatedAt = new Date().toISOString();
  } catch (error) {
    skill.aiAssessment = { ...(skill.aiAssessment || {}), loading: false, error: error.name === 'AbortError' ? 'AI 校准超时了，保留原分数，请稍后重试。' : `AI 校准失败：${error.message}` };
  } finally {
    clearTimeout(timeoutId);
    saveData();
    render();
    if (document.querySelector('#sportProgressDialog')?.open) renderSportProgress(skill);
  }
}

function openSportProgress(id, autoAnalyze = true) {
  activeSportSkillId = id;
  const skill = (data.sportSkills || []).find((item) => item.id === id);
  if (!skill) return;
  const dialog = document.querySelector('#sportProgressDialog');
  if (!dialog.open) dialog.showModal();
  renderSportProgress(skill);
  if (autoAnalyze && !skill.aiAssessment?.updatedAt && !skill.aiAssessment?.loading) analyzeSportSkill(id);
}

function sportAdviceItems(value) {
  if (Array.isArray(value)) return value.flatMap((item) => sportAdviceItems(String(item || ''))).filter(Boolean);
  const text = String(value || '').trim();
  if (!text) return [];
  const numbered = text.split(/\s*(?=\d+[.、)]\s*)/).map((item) => item.replace(/^\d+[.、)]\s*/, '').trim()).filter(Boolean);
  if (numbered.length > 1) return numbered;
  return text.split(/[\n；;]+/).map((item) => item.trim()).filter(Boolean);
}

function renderSportProgress(skill) {
  if (!skill) return;
  const assessment = skill.aiAssessment || {};
  document.querySelector('#sportProgressName').textContent = `${skill.name} · ${Number(skill.progress || 0)}/100`;
  document.querySelector('#sportProgressStatus').textContent = `100 分目标：${skill.goal}`;
  const box = document.querySelector('#sportProgressAnalysis');
  if (assessment.loading) { box.innerHTML = '<div class="empty-impact">AI 正在对照你的目标、基线和训练证据校准进度…</div>'; return; }
  if (assessment.error) { box.innerHTML = `<div class="empty-impact">${escapeHtml(assessment.error)}<div class="record-ai-actions"><button class="primary-btn compact-btn" data-retry-sport-progress="${skill.id}">重试校准</button></div></div>`; return; }
  if (!assessment.updatedAt) { box.innerHTML = '<div class="empty-impact">还没有完成基线评估。</div>'; return; }
  const dimensions = assessment.dimensions || {};
  const techniqueHistory = [...(data.sportTechniqueReviews || [])].filter((item) => item.skillId === skill.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const dimensionLabels = { technique: '技术', physical: '体能', consistency: '稳定性', knowledge: '理解/战术', independence: '独立完成' };
  const nextActions = sportAdviceItems(assessment.next_actions);
  const evidenceGaps = sportAdviceItems(assessment.evidence_gap);
  box.innerHTML = `<div class="skill-analysis-hero"><div class="skill-score-ring" style="--score:${skill.progress}"><strong>${skill.progress}</strong><span>/100</span></div><div><span>${escapeHtml(assessment.stage || sportStage(skill.progress))}</span><h3>${escapeHtml(assessment.summary || '')}</h3><p>${escapeHtml(assessment.score_reason || '')}</p><small>AI 置信度 ${Number(assessment.confidence || 0)}% · 本次 ${Number(assessment.delta || 0) >= 0 ? '+' : ''}${Number(assessment.delta || 0)} 分</small></div></div>
    <div class="skill-dimensions">${Object.entries(dimensionLabels).map(([key, label]) => `<div><span>${label}</span><i><u style="width:${Math.max(0, Math.min(100, Number(dimensions[key] || 0)))}%"></u></i><b>${Number(dimensions[key] || 0)}</b></div>`).join('')}</div>
    ${assessment.score_guardrail ? `<div class="sport-score-guardrail"><span>STRICT SCORE GUARDRAIL</span><p>${escapeHtml(assessment.score_guardrail)}</p></div>` : ''}
    <div class="skill-analysis-grid"><section><span>CURRENT MILESTONE</span><h4>${escapeHtml(assessment.milestone || '—')}</h4></section><section class="sport-action-section"><span>NEXT ACTIONS</span><ol>${nextActions.map((item) => `<li><b>${escapeHtml(item)}</b></li>`).join('') || '<li><b>继续补充具体训练证据</b></li>'}</ol></section><section><span>ACCURACY GAPS</span><ul>${evidenceGaps.map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>目前证据足够</li>'}</ul></section></div>
    <div class="skill-roadmap">${(assessment.roadmap || []).map((step) => `<article class="${Number(skill.progress) >= Number(step.score) ? 'done' : ''}"><b>${Number(step.score)}</b><div><strong>${escapeHtml(step.label || '')}</strong><span>${escapeHtml(step.proof || '')}</span></div></article>`).join('')}</div>
    ${techniqueHistory.length ? `<div class="technique-history"><span>动作技术评分记录</span>${techniqueHistory.map((item) => `<article><div><strong>${escapeHtml(item.movement)}</strong><small>${new Date(item.createdAt).toLocaleDateString('zh-CN')} · 置信度 ${Number(item.confidence || 0)}%</small></div><b>${Number(item.score || 0)}</b></article>`).join('')}</div>` : ''}
    <div class="record-ai-actions skill-analysis-actions"><button class="primary-btn compact-btn" data-log-sport-progress="${skill.id}">＋ 记录训练证据</button><button class="ghost-btn compact-btn" data-retry-sport-progress="${skill.id}">重新校准</button></div>`;
}

async function analyzeSport(id, { open = false } = {}) {
  const session = (data.sportsSessions || []).find((item) => item.id === id);
  if (!session) return;
  session.aiReview = session.aiReview || {};
  session.aiReview.loading = true;
  session.aiReview.error = '';
  saveData();
  render();
  if (open) openSportAI(id);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        action: 'sport',
        context: sportAIContext(session),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    session.aiReview = {
      ...(session.aiReview || {}),
      ...JSON.parse(result.text.replace(/^```json\s*|\s*```$/g, '').trim()),
      loading: false,
      error: '',
      updatedAt: new Date().toISOString(),
      provider: result.provider,
    };
  } catch (error) {
    session.aiReview = {
      ...(session.aiReview || {}),
      loading: false,
      error: error.name === 'AbortError'
        ? 'AI 这次想太久了，等一下再跑。'
        : error.message === 'GROQ_API_KEY_NOT_CONFIGURED'
          ? 'Groq 还没接好。'
          : error.message === 'AI_REQUEST_TIMEOUT'
            ? 'AI 请求超时了，重试一次。'
            : `AI 分析失败：${error.message}`,
    };
  } finally {
    clearTimeout(timeoutId);
    saveData();
    render();
    if (document.querySelector('#sportAiDialog')?.open) {
      renderSportAI((data.sportsSessions || []).find((item) => item.id === id));
    }
  }
}

function openSportAI(id) {
  activeAISportId = id;
  const session = (data.sportsSessions || []).find((item) => item.id === id);
  if (!session) return;
  document.querySelector('#sportAiDialog').showModal();
  renderSportAI(session);
  if (!session.aiReview?.summary && !session.aiReview?.loading) analyzeSport(id);
}

function renderSportAI(session) {
  if (!session) return;
  document.querySelector('#sportAiName').textContent = `${session.name} · ${formatDateKey(session.date)}`;
  document.querySelector('#sportAiStatus').textContent = `RM ${money(session.cost)} · ${Number(session.minutes)} min · ${isZh() ? `自评分 ${session.value}/5` : `self-score ${session.value}/5`}`;
  const box = document.querySelector('#sportAiAnalysis');
  if (session.aiReview?.loading) {
    box.innerHTML = `<div class="empty-impact">${isZh() ? 'AI 正在判这场运动值不值。' : 'AI is reviewing this session.'}</div>`;
    return;
  }
  if (session.aiReview?.error) {
    box.innerHTML = `<div class="empty-impact">${escapeHtml(session.aiReview.error)}</div>`;
    return;
  }
  if (!session.aiReview?.summary) {
    box.innerHTML = `<div class="empty-impact">${isZh() ? '这场还没跑 AI。' : 'No AI review yet.'}</div>`;
    return;
  }
  const review = session.aiReview;
  box.innerHTML = `
    <div class="day-ai-hero">
      <div class="ai-score-card">
        <div class="ai-score"><strong>${escapeHtml(review.score ?? '—')}</strong><span>${isZh() ? '运动投资分' : 'SPORT SCORE'}</span></div>
      </div>
      <div class="ai-verdict">
        <h3>${escapeHtml(review.verdict || '')}</h3>
        <p>${escapeHtml(review.summary || '')}</p>
      </div>
    </div>
    <div class="ai-details">
      <div class="ai-detail"><b>${isZh() ? '目标匹配' : 'FIT'}</b><span>${escapeHtml(review.performance_fit || '—')}</span></div>
      <div class="ai-detail"><b>${isZh() ? '训练量判断' : 'INTENSITY'}</b><span>${escapeHtml(review.intensity_value || '—')}</span></div>
      <div class="ai-detail"><b>${isZh() ? '练到了什么' : 'SKILL GAIN'}</b><span>${escapeHtml(review.skill_gain || '—')}</span></div>
      <div class="ai-detail"><b>${isZh() ? '属性加成' : 'ATTRIBUTE BOOST'}</b><span>${escapeHtml(review.attribute_boost || '—')}</span></div>
      <div class="ai-detail"><b>${isZh() ? '纪律加成' : 'DISCIPLINE BONUS'}</b><span>${escapeHtml(review.discipline_bonus || '—')}</span></div>
      <div class="ai-detail"><b>${isZh() ? '重要指数' : 'IMPORTANCE'}</b><span>${escapeHtml(String(review.importance_score ?? '—'))}</span></div>
      <div class="ai-detail"><b>${isZh() ? '一句标签' : 'LABEL'}</b><span>${escapeHtml(review.label || '—')}</span></div>
      <div class="ai-detail"><b>${isZh() ? '为什么这样判' : 'WHY'}</b><span>${escapeHtml(review.why || '—')}</span></div>
      <div class="ai-detail"><b>${isZh() ? '最大风险' : 'RISK'}</b><span>${escapeHtml(review.risk || '—')}</span></div>
      <div class="ai-detail"><b>${isZh() ? '下次怎么排更值' : 'NEXT MOVE'}</b><span>${escapeHtml(review.next_move || '—')}</span></div>
    </div>
    <div class="record-ai-actions">
      <button class="primary-btn compact-btn" data-retry-ai-sport="${session.id}">${isZh() ? '重跑运动 AI' : 'Run sport AI again'}</button>
    </div>
  `;
}

function renderDayAiStrip(recordKey, record) {
  const strip = document.querySelector('#dayAiStrip');
  if (!strip) return;
  if (!record?.aiReview && !record?.status) {
    strip.hidden = true;
    return;
  }
  strip.hidden = false;
  if (record.aiReview?.loading) {
    document.querySelector('#dayAiVerdict').textContent = isZh() ? 'AI 正在判今天' : 'AI is judging today';
    document.querySelector('#dayAiSummary').textContent = isZh() ? '等一下，它在看你今天到底算稳住、乱花，还是花得值得。' : 'Hold on while AI reviews the day.';
  } else if (record.aiReview?.error) {
    document.querySelector('#dayAiVerdict').textContent = isZh() ? 'AI 暂时失手' : 'AI unavailable';
    document.querySelector('#dayAiSummary').textContent = record.aiReview.error;
  } else if (record.aiReview?.summary) {
    document.querySelector('#dayAiVerdict').textContent = `${record.aiReview.label ? `${record.aiReview.label} · ` : ''}${record.aiReview.verdict || (isZh() ? '今日总结' : 'Day review')}`;
    document.querySelector('#dayAiSummary').textContent = record.aiReview.summary;
  } else {
    document.querySelector('#dayAiVerdict').textContent = isZh() ? '今天还没出评语' : 'No AI review yet';
    document.querySelector('#dayAiSummary').textContent = isZh() ? '你一记下今天，AI 就会给你一句够直接的评价。' : 'Once the day is recorded, AI will summarize it.';
  }
  document.querySelector('#dayAiOpenBtn').dataset.aiRecord = recordKey;
}

function openRecordAI(recordKey) {
  const record = data.records[recordKey];
  if (!record) return;
  document.querySelector('#recordAiDialog').showModal();
  renderRecordAI(recordKey, record);
  if (!record.aiReview?.summary && !record.aiReview?.loading) analyzeRecord(recordKey);
}

function renderRecordAI(recordKey, record) {
  if (!record) return;
  document.querySelector('#recordAiTitle').textContent = isZh()
    ? `${recordKey} · AI 裁判结果`
    : `${recordKey} · AI day review`;
  const statusText = record.status === 'win'
    ? (isZh() ? 'RM0 守住日' : 'Zero-spend day')
    : (isZh() ? `有消费 · RM ${money(record.amount)}` : `Spent · RM ${money(record.amount)}`);
  document.querySelector('#recordAiStatus').textContent = `${statusText}${record.reason ? ` · ${record.reason}` : ''}`;
  const box = document.querySelector('#recordAiAnalysis');
  if (record.aiReview?.loading) {
    box.innerHTML = `<div class="empty-impact">${isZh() ? 'AI 正在拆这一天。' : 'AI is reviewing this day.'}</div>`;
    return;
  }
  if (record.aiReview?.error) {
    box.innerHTML = `<div class="empty-impact">${escapeHtml(record.aiReview.error)}</div>`;
    return;
  }
  if (!record.aiReview?.summary) {
    box.innerHTML = `<div class="empty-impact">${isZh() ? '这一天还没分析，按一下重试就会跑。' : 'No analysis yet. Try again.'}</div>`;
    return;
  }
  const review = record.aiReview;
  const transactions = getRecordTransactions(record);
  box.innerHTML = `
    <div class="day-ai-hero">
      <div class="ai-score-card">
        <div class="ai-score"><strong>${escapeHtml(review.score ?? '—')}</strong><span>${isZh() ? '今日分数' : 'DAY SCORE'}</span></div>
      </div>
      <div class="ai-verdict">
        <h3>${escapeHtml(review.verdict || '')}</h3>
        <p>${escapeHtml(review.summary || '')}</p>
      </div>
    </div>
    <div class="ai-details">
      <div class="ai-detail"><b>${isZh() ? '为什么这样判' : 'WHY'}</b><span>${escapeHtml(review.why || '—')}</span></div>
      <div class="ai-detail"><b>${isZh() ? '今天最大风险' : 'RISK'}</b><span>${escapeHtml(review.risk || '—')}</span></div>
      <div class="ai-detail"><b>${isZh() ? '明天该怎么打' : 'NEXT MOVE'}</b><span>${escapeHtml(review.next_move || '—')}</span></div>
      <div class="ai-detail"><b>${isZh() ? '一句标签' : 'LABEL'}</b><span>${escapeHtml(review.label || '—')}</span></div>
    </div>
    ${transactions.length ? `
      <div class="tx-report">
        <div class="tx-report-head">
          <div>
            <h3>${isZh() ? `逐笔消费战报 · ${transactions.length} 笔` : `Transaction battle report · ${transactions.length} tx`}</h3>
            <p>${isZh() ? '每一笔都会看必要性、重要指数、需求匹配，不只是讲值不值得。' : 'Each transaction shows necessity, importance, and fit — not just verdict.'}</p>
          </div>
          <button class="primary-btn compact-btn" data-retry-ai-record="${recordKey}">${isZh() ? '重跑 AI 分析' : 'Run AI again'}</button>
        </div>
        <div class="tx-report-list">
          ${transactions.map((tx, index) => `
            <article class="tx-item">
              <div class="tx-item-main">
                <span class="tx-item-index">#${index + 1} · ${tx.type === 'essential' ? (isZh() ? '必要' : 'essential') : (isZh() ? '冲动' : 'impulse')}</span>
                <strong>RM ${money(tx.amount)}</strong>
                <p>${escapeHtml(tx.reason || (isZh() ? '没写原因' : 'No reason'))}</p>
                <div class="tx-metrics">
                  <span>${isZh() ? '重要指数' : 'IMPORTANCE'} · <b>${escapeHtml(tx.aiReview?.importance_score ?? '—')}</b></span>
                  <span>${isZh() ? '必要性' : 'NECESSITY'} · <b>${escapeHtml(tx.aiReview?.necessity || (isZh() ? '未判' : 'pending'))}</b></span>
                  <span>${isZh() ? '需求匹配' : 'FIT'} · <b>${escapeHtml(tx.aiReview?.fit || (isZh() ? '未判' : 'pending'))}</b></span>
                  <span>${isZh() ? '食物角度' : 'FOOD ANGLE'} · <b>${escapeHtml(tx.aiReview?.food_angle || (isZh() ? '未判' : 'pending'))}</b></span>
                </div>
                <small>${tx.aiReview?.summary ? escapeHtml(tx.aiReview.summary) : tx.aiReview?.loading ? (isZh() ? 'AI 正在看这笔' : 'AI is reviewing this transaction') : tx.aiReview?.error ? escapeHtml(tx.aiReview.error) : (isZh() ? '这笔还没跑 AI。' : 'No AI review yet.')}</small>
              </div>
              <div class="tx-item-side">
                <b>${tx.aiReview?.verdict ? escapeHtml(tx.aiReview.verdict) : (isZh() ? '未判' : 'PENDING')}</b>
                <div class="tx-item-actions">
                  <button data-ai-transaction="${recordKey}:${tx.id}">✦ AI</button>
                  <button data-edit-transaction="${recordKey}:${tx.id}">✎ ${isZh() ? '改' : 'Edit'}</button>
                  <button class="danger-lite" data-delete-transaction="${recordKey}:${tx.id}">× ${isZh() ? '删' : 'Delete'}</button>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

function updateCountdown() {
  const seconds = secondsUntilMidnight();
  document.querySelector('#midnightCountdown').textContent = [
    Math.floor(seconds / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ].map((value) => String(value).padStart(2, '0')).join(':');
  document.querySelector('.midnight-box').classList.toggle('final-hours', seconds < 10800);
}

function rotateWarCry() {
  const zh = [
    '今天不用完美，不要破功就好。',
    'Shopee 不会跑掉，你的钱会。',
    '不要跟自己讲酱多，RM0 就 RM0。',
    '忍过这十分钟，你通常就不想买了。',
    '真正够狠，是没人看也照样守。',
    '一百天后的你，会很感谢今天没手痒。',
  ];
  const en = [
    'Perfection is irrelevant. Just do not surrender.',
    'You are not saving money. You are taking back control.',
    'Every resisted impulse makes the enemy weaker.',
    'Do not negotiate with feelings. Protect RM0.',
    'Real discipline wins when nobody is watching.',
    'In 100 days, you will thank the self who refused to quit.',
  ];
  const lines = isZh() ? zh : en;
  const el = document.querySelector('#warCry');
  el.classList.add('swap');
  setTimeout(() => {
    warCryIndex = (warCryIndex + 1) % lines.length;
    el.textContent = lines[warCryIndex];
    el.classList.remove('swap');
  }, 240);
}

function animateVictory() {
  const hero = document.querySelector('.hero-card');
  const overlay = document.querySelector('#victoryOverlay');
  hero.classList.add('celebrating');
  overlay.classList.add('show');
  for (let index = 0; index < 34; index += 1) {
    const particle = document.createElement('span');
    particle.className = 'victory-particle';
    particle.style.setProperty('--x', `${(Math.random() - 0.5) * 650}px`);
    particle.style.setProperty('--y', `${(Math.random() - 0.5) * 430}px`);
    particle.style.setProperty('--r', `${Math.random() * 540}deg`);
    particle.style.animationDelay = `${Math.random() * 0.18}s`;
    overlay.append(particle);
  }
  setTimeout(() => {
    overlay.classList.remove('show');
    hero.classList.remove('celebrating');
    overlay.querySelectorAll('.victory-particle').forEach((particle) => particle.remove());
  }, 2200);
}

function saveRecordFromDialog() {
  if (!requireCloudAuth(isZh() ? '保存战绩' : 'save records')) return;
  const originalKey = document.querySelector('#recordOriginalKey').value;
  const key = document.querySelector('#recordDateInput').value;
  const status = document.querySelector('#recordStatusInput').value;
  const amount = status === 'win' ? 0 : Number(document.querySelector('#recordAmountInput').value || 0);
  const reason = status === 'win' ? '' : document.querySelector('#recordReasonInput').value.trim();
  if (!key) return;
  if (key > keyOf()) {
    showToast(isZh() ? '不能写未来' : 'Future date blocked', isZh() ? '记录只能写今天或之前。' : 'Only today or past dates are allowed.');
    return;
  }
  if (originalKey && originalKey !== key && data.records[key] && !window.confirm(isZh() ? '新的日期本来就有记录。要直接覆盖吗？' : 'The new date already has a record. Replace it?')) {
    return;
  }

  if (!originalKey) {
    const existing = data.records[key];
    if (status === 'win') {
      if (existing?.status === 'spent') {
        showToast(isZh() ? '这天已有消费' : 'This day already has spending', isZh() ? '不能再标成 RM0；你可以继续逐笔补消费。' : 'It cannot be marked RM0, but you can keep adding transactions.');
        return;
      }
      if (existing?.status === 'win') {
        showToast(isZh() ? '这天已经守住' : 'Day already secured', isZh() ? 'RM0 战绩一天只需要一条；有消费则选择「有花钱」追加。' : 'A zero-spend day only needs one result. Choose spent to append a transaction.');
        return;
      }
      checkpoint('补记 RM0 战绩');
      data.records[key] = normalizeRecord({ status: 'win', transactions: [], closedAt: new Date().toISOString() });
    } else {
      if (!amount || !reason) {
        showToast(isZh() ? '这一笔还没写完整' : 'Transaction incomplete', isZh() ? '金额和买了什么都要填写。' : 'Enter both the amount and reason.');
        return;
      }
      checkpoint(existing ? '追加旧日消费' : '补记旧日消费');
      const transactions = existing?.status === 'spent' ? [...getRecordTransactions(existing)] : [];
      transactions.push({
        id: crypto.randomUUID(),
        amount,
        reason,
        type: 'impulse',
        createdAt: new Date().toISOString(),
        aiReview: null,
      });
      data.records[key] = normalizeRecord({
        ...existing,
        status: 'spent',
        transactions,
        closedAt: existing?.closedAt || new Date().toISOString(),
        aiReview: null,
      });
    }
    saveData();
    document.querySelector('#recordDialog').close();
    render();
    showToast(
      isZh() ? '这一笔已追加' : 'Entry appended',
      status === 'win'
        ? (isZh() ? 'RM0 战绩已经补回。' : 'The zero-spend result was backfilled.')
        : (isZh() ? `这天现在共有 ${getRecordTransactions(data.records[key]).length} 笔，合计 RM ${money(data.records[key].amount)}。` : `${getRecordTransactions(data.records[key]).length} transactions now total RM ${money(data.records[key].amount)}.`),
    );
    analyzeRecord(key);
    if (status === 'spent') {
      const latestId = getRecordTransactions(data.records[key]).at(-1)?.id;
      if (latestId) analyzeTransaction(key, latestId);
    }
    return;
  }

  checkpoint(originalKey ? '修改每日战绩' : '新增每日战绩');
  if (originalKey && originalKey !== key) delete data.records[originalKey];
  const old = data.records[key];
  const existingTransactions = getRecordTransactions(old);
  data.records[key] = normalizeRecord({
    ...old,
    status,
    transactions: status === 'win'
      ? []
      : existingTransactions.length > 1
        ? [{
            id: crypto.randomUUID(),
            amount,
            reason,
            type: old?.type || 'impulse',
            createdAt: old?.closedAt || new Date().toISOString(),
            aiReview: null,
          }]
        : existingTransactions.length === 1
          ? [{
              ...existingTransactions[0],
              amount,
              reason,
            }]
          : [{
              id: crypto.randomUUID(),
              amount,
              reason,
              type: old?.type || 'impulse',
              createdAt: old?.closedAt || new Date().toISOString(),
              aiReview: null,
            }],
    closedAt: old?.closedAt || new Date().toISOString(),
  });
  saveData();
  document.querySelector('#recordDialog').close();
  render();
  showToast(isZh() ? '战绩已写入' : 'Record saved', isZh() ? '这一天已经回到系统里了。' : 'The day is back in the system.');
  analyzeRecord(key);
}

function deleteRecord(key) {
  if (!requireCloudAuth(isZh() ? '删除战绩' : 'delete records')) return;
  if (!data.records[key]) return;
  checkpoint('删除每日战绩');
  delete data.records[key];
  saveData();
  render();
  showToast(isZh() ? '这天删掉了' : 'Record deleted', isZh() ? '按错的话可以马上撤销。' : 'Undo is available if needed.');
}

function recordSpendToday(form) {
  if (!requireCloudAuth(isZh() ? '记录消费' : 'log spending')) return;
  const amount = Number(document.querySelector('#amountInput').value);
  const reason = document.querySelector('#reasonInput').value.trim();
  if (!amount || !reason) return;
  checkpoint('消费记录');
  const key = document.querySelector('#spendRecordKeyInput').value || keyOf();
  const transactionId = document.querySelector('#spendTransactionIdInput').value;
  const spendType = new FormData(form).get('spendType');
  const current = syncRecordFields(data.records[key] || { status: 'spent', transactions: [], closedAt: new Date().toISOString() });
  const transactions = getRecordTransactions(current);
  if (transactionId) {
    const tx = transactions.find((item) => item.id === transactionId);
    if (tx) {
      tx.amount = amount;
      tx.reason = reason;
      tx.type = spendType;
      tx.aiReview = null;
    }
  } else {
    transactions.push({
      id: crypto.randomUUID(),
      amount,
      reason,
      type: spendType,
      createdAt: new Date().toISOString(),
      aiReview: null,
    });
  }
  data.records[key] = syncRecordFields({
    ...current,
    status: 'spent',
    transactions,
    closedAt: new Date().toISOString(),
  });
  saveData();
  form.reset();
  document.querySelector('#spendDialog').close();
  render();
  showToast(transactionId ? (isZh() ? '这笔改好了' : 'Transaction updated') : (isZh() ? '已经记下来了' : 'Spend recorded'), isZh() ? '认了就好，明天继续赢。' : 'Truth logged. Counterattack tomorrow.');
  analyzeRecord(key);
  const latestTransactionId = transactionId || data.records[key].transactions[data.records[key].transactions.length - 1]?.id;
  if (latestTransactionId) analyzeTransaction(key, latestTransactionId);
}

function saveRewardFromDialog(form) {
  if (!requireCloudAuth(isZh() ? '保存战利品' : 'save rewards')) return;
  const id = document.querySelector('#lootEditId').value;
  const name = document.querySelector('#lootNameInput').value.trim();
  const cost = Number(document.querySelector('#lootCostInput').value);
  const priority = Number(document.querySelector('#lootPriorityInput').value);
  const category = document.querySelector('#lootCategoryInput').value;
  const why = document.querySelector('#lootWhyInput').value.trim();
  if (!name || !cost) return;
  const existing = (data.rewards || []).find((item) => item.id === id);
  const nextId = existing?.id || crypto.randomUUID();
  checkpoint(existing ? '战利品修改' : '新增战利品');
  if (existing) {
    Object.assign(existing, {
      name,
      cost,
      priority,
      category,
      why,
      image: pendingLootImage,
      aiAnalysis: null,
      aiError: '',
    });
  } else {
    data.rewards.unshift({
      id: nextId,
      name,
      cost,
      priority,
      category,
      why,
      image: pendingLootImage,
      createdAt: new Date().toISOString(),
      outcome: null,
      outcomeAt: null,
      redeemedAt: null,
    });
  }
  saveData();
  form.reset();
  document.querySelector('#lootDialog').close();
  render();
  showToast(existing ? (isZh() ? '战利品改好了' : 'Reward updated') : (isZh() ? '战利品已加入' : 'Reward added'), isZh() ? 'AI 会按新的资料重算。' : 'AI will re-evaluate it.');
  analyzeReward(nextId);
}

function revealDrop(dropId) {
  if (!requireCloudAuth(isZh() ? '开启掉落' : 'reveal drops')) return;
  const drop = dropCatalog.find((item) => item.id === dropId);
  const state = getDropState(dropId);
  const savedMoney = Number(getStats().saved || 0);
  if (!drop || !state || savedMoney < drop.threshold || state.revealedAt) return;
  checkpoint('开启未知掉落');
  state.revealedAt = new Date().toISOString();
  saveData();
  render();
  showToast('未知掉落已开启', `${drop.revealTitle} 出来了。先看懂它，再决定要不要领。`);
}

function claimDrop(dropId, existingRewardId = '') {
  if (!requireCloudAuth(isZh() ? '领取掉落' : 'claim drops')) return;
  const drop = dropCatalog.find((item) => item.id === dropId);
  const state = getDropState(dropId);
  const existingReward = existingRewardId ? (data.rewards || []).find((item) => item.id === existingRewardId && item.sourceDropId === dropId) : null;
  if (!drop || !state || !state.revealedAt || (state.claimedAt && !existingReward)) return;
  pendingDropClaim = { dropId, existingRewardId: existingReward?.id || '', analysis: null, candidate: null, loading: false, error: '' };
  const form = document.querySelector('#dropClaimForm');
  form.reset();
  document.querySelector('#dropClaimId').value = dropId;
  document.querySelector('#dropClaimTitle').textContent = `${drop.code} · ${drop.revealTitle}`;
  document.querySelector('#dropClaimContext').textContent = '你已经赢到这箱，不需要重新存一次。填下现在真正想拿的东西，AI 会按这一阶段判断是否适合。';
  document.querySelector('#dropCandidateCategory').value = drop.category || 'other';
  document.querySelector('#dropCandidateCost').value = drop.rewardCost || '';
  document.querySelector('#dropCandidateName').value = existingReward?.needsDropChoice ? '' : (existingReward?.name || '');
  document.querySelector('#dropCandidateWhy').value = existingReward?.needsDropChoice ? '' : (existingReward?.why || '');
  document.querySelector('#dropClaimStage').innerHTML = `<div><span>已守住门槛</span><strong>RM ${money(drop.threshold)}</strong></div><div><span>本箱建议上限</span><strong>RM ${money(drop.rewardCost)}</strong></div><div><span>奖励方向</span><strong>${escapeHtml(drop.revealTitle)}</strong></div>`;
  document.querySelector('#dropCandidateAnalysis').innerHTML = '<div class="drop-analysis-placeholder">先写下具体想要的东西，AI 才能判断它是否配得上这一箱。</div>';
  const confirmButton = document.querySelector('#dropConfirmClaimBtn');
  confirmButton.disabled = true;
  confirmButton.textContent = '通过 AI 判断后才能领取';
  document.querySelector('#dropClaimDialog').showModal();
}

function dropCandidateFromForm() {
  return {
    name: document.querySelector('#dropCandidateName').value.trim(),
    cost: Number(document.querySelector('#dropCandidateCost').value || 0),
    category: document.querySelector('#dropCandidateCategory').value,
    why: document.querySelector('#dropCandidateWhy').value.trim(),
  };
}

function renderDropCandidateAnalysis() {
  const box = document.querySelector('#dropCandidateAnalysis');
  const confirmButton = document.querySelector('#dropConfirmClaimBtn');
  if (!pendingDropClaim) return;
  if (pendingDropClaim.loading) {
    box.innerHTML = '<div class="drop-analysis-placeholder loading">AI 正在对照掉落阶段、价格和你现在的进度…</div>';
    confirmButton.disabled = true;
    return;
  }
  if (pendingDropClaim.error) {
    box.innerHTML = `<div class="drop-analysis-placeholder error">${escapeHtml(pendingDropClaim.error)}</div>`;
    confirmButton.disabled = true;
    return;
  }
  const analysis = pendingDropClaim.analysis;
  if (!analysis) return;
  const drop = dropCatalog.find((item) => item.id === pendingDropClaim.dropId);
  const withinAllowance = Number(pendingDropClaim.candidate?.cost || 0) <= Number(drop?.rewardCost || 0);
  const suitable = (analysis.suitable_now === true || analysis.suitable_now === 'true') && withinAllowance;
  box.innerHTML = `<article class="drop-analysis-result ${suitable ? 'approved' : 'blocked'}">
    <div class="drop-analysis-score"><strong>${Math.max(0, Math.min(100, Number(analysis.score || 0)))}</strong><span>/100 · ${escapeHtml(analysis.verdict || '')}</span></div>
    <h3>${escapeHtml(analysis.summary || '')}</h3>
    <div class="drop-analysis-grid"><div><b>阶段适配</b><span>${escapeHtml(analysis.stage_fit || '—')}</span></div><div><b>预算适配</b><span>${escapeHtml(analysis.budget_fit || '—')}</span></div><div><b>为什么</b><span>${escapeHtml(analysis.why || '—')}</span></div><div><b>风险</b><span>${escapeHtml(analysis.risk || '—')}</span></div></div>
    ${suitable ? '<p class="drop-analysis-pass">✓ 这个选择符合当前掉落阶段，可以直接领取。</p>' : `<p class="drop-analysis-block">先不要领取：${escapeHtml(analysis.better_option || analysis.condition || '调整选择后再让 AI 判断一次。')}</p>`}
  </article>`;
  confirmButton.disabled = !suitable;
  confirmButton.textContent = suitable ? '确认领取，直接放进已赢得奖励' : '调整后重新分析';
}

async function analyzeDropCandidate() {
  if (!pendingDropClaim) return;
  const drop = dropCatalog.find((item) => item.id === pendingDropClaim.dropId);
  const state = getDropState(pendingDropClaim.dropId);
  const candidate = dropCandidateFromForm();
  if (!drop || !state || !candidate.name || !candidate.cost || !candidate.why) return;
  pendingDropClaim = { ...pendingDropClaim, candidate, analysis: null, loading: true, error: '' };
  renderDropCandidateAnalysis();
  try {
    const stats = getStats();
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'dropCandidate',
        context: {
          drop: { code: drop.code, threshold: drop.threshold, allowance: drop.rewardCost, direction: drop.revealTitle, description: drop.revealCopy, category: drop.category },
          candidate,
          ericNow: { saved: stats.saved, currentStreak: stats.current, bestStreak: stats.best, rewardBalance: stats.rewardBalance, dailyTarget: data.dailyTarget },
          rule: '这箱已经赢得，不可要求 Eric 再储蓄一次。只判断候选奖励是否符合本阶段方向、实际需要与本箱预算。',
        },
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    pendingDropClaim.analysis = JSON.parse(result.text.replace(/^```json\s*|\s*```$/g, '').trim());
  } catch (error) {
    pendingDropClaim.error = error.name === 'AbortError' ? 'AI 判断超时，请再试一次。' : `AI 判断失败：${error.message}`;
  } finally {
    pendingDropClaim.loading = false;
    renderDropCandidateAnalysis();
  }
}

function confirmDropClaim() {
  if (!pendingDropClaim?.analysis || !pendingDropClaim?.candidate) return;
  if (!requireCloudAuth(isZh() ? '领取掉落奖励' : 'claim drop reward')) return;
  const drop = dropCatalog.find((item) => item.id === pendingDropClaim.dropId);
  const state = getDropState(pendingDropClaim.dropId);
  const candidate = pendingDropClaim.candidate;
  const suitable = pendingDropClaim.analysis.suitable_now === true || pendingDropClaim.analysis.suitable_now === 'true';
  const existingReward = pendingDropClaim.existingRewardId ? (data.rewards || []).find((item) => item.id === pendingDropClaim.existingRewardId) : null;
  if (!drop || !state || (state.claimedAt && !existingReward) || !suitable || candidate.cost > drop.rewardCost) return;
  checkpoint(existingReward ? '补选专属未知掉落奖励' : '领取专属未知掉落奖励');
  const rewardId = existingReward?.id || crypto.randomUUID();
  state.claimedAt = state.claimedAt || new Date().toISOString();
  state.convertedRewardId = rewardId;
  const reward = {
    id: rewardId,
    name: candidate.name,
    cost: candidate.cost,
    priority: drop.priority,
    category: candidate.category,
    why: candidate.why,
    image: '',
    createdAt: new Date().toISOString(),
    outcome: 'earned',
    outcomeAt: state.claimedAt,
    earnedAt: state.claimedAt,
    redeemedAt: null,
    sourceDropId: drop.id,
    sourceDropCode: drop.code,
    dropThreshold: drop.threshold,
    dropAllowance: drop.rewardCost,
    dropAnalysis: pendingDropClaim.analysis,
    needsDropChoice: false,
    aiAnalysis: {
      verdict: pendingDropClaim.analysis.verdict,
      score: pendingDropClaim.analysis.score,
      necessity: pendingDropClaim.analysis.stage_fit,
      summary: pendingDropClaim.analysis.summary,
      why: pendingDropClaim.analysis.why,
      risk: pendingDropClaim.analysis.risk,
      better_move: pendingDropClaim.analysis.better_option,
      fair_price: pendingDropClaim.analysis.budget_fit,
      challenge: pendingDropClaim.analysis.condition,
    },
  };
  if (existingReward) Object.assign(existingReward, reward);
  else data.rewards.unshift(reward);
  ensureSecretDropExpansion();
  saveData();
  document.querySelector('#dropClaimDialog').close();
  pendingDropClaim = null;
  render();
  showToast('这是你已经赢回来的奖励', `${candidate.name} 已直接放进“你已经赢回来的东西”，不会再跑一次进度。`);
}

function saveImpulseFromDialog(form) {
  if (!requireCloudAuth(isZh() ? '保存冲动记录' : 'save impulse logs')) return;
  const id = document.querySelector('#impulseEditId').value;
  const name = document.querySelector('#impulseNameInput').value.trim();
  const cost = Number(document.querySelector('#impulseCostInput').value);
  const trigger = document.querySelector('#impulseTriggerInput').value;
  if (!name || !cost) return;
  const existing = (data.impulses || []).find((item) => item.id === id);
  checkpoint(existing ? '修改冲动记录' : '新增冲动拦截');
  if (existing) {
    Object.assign(existing, { name, cost, trigger });
  } else {
    data.impulses.unshift({
      id: crypto.randomUUID(),
      name,
      cost,
      trigger,
      createdAt: new Date().toISOString(),
      resolution: null,
      resolvedAt: null,
    });
  }
  saveData();
  form.reset();
  document.querySelector('#impulseDialog').close();
  render();
  showToast(existing ? (isZh() ? '冲动记录改好了' : 'Impulse updated') : (isZh() ? '已经先帮你挡下来' : 'Impulse intercepted'), isZh() ? '删掉、改掉、24 小时后再决定，都可以。' : 'You can still edit or delete it later.');
}

function saveSportFromDialog() {
  if (!requireCloudAuth(isZh() ? '保存运动记录' : 'save sports logs')) return;
  const id = document.querySelector('#sportEditId').value;
  const date = document.querySelector('#sportDateInput').value;
  const name = document.querySelector('#sportNameInput').value.trim();
  const skillId = document.querySelector('#sportSkillInput').value || null;
  const note = document.querySelector('#sportNoteInput').value.trim();
  const cost = Number(document.querySelector('#sportCostInput').value || 0);
  const minutes = Number(document.querySelector('#sportMinutesInput').value);
  const value = Number(document.querySelector('#sportValueInput').value);
  const effort = Number(document.querySelector('#sportEffortInput').value || 5);
  const countSpend = document.querySelector('#sportCountSpend').checked;
  if (!name || !minutes || !date) return;
  const existing = (data.sportsSessions || []).find((item) => item.id === id);
  checkpoint(existing ? '修改运动记录' : '新增运动记录');
  if (existing) {
    Object.assign(existing, { date, name, skillId, note, cost, minutes, value, effort, countSpend });
  } else {
    sportSessionsPage = 1;
    data.sportsSessions.unshift({
      id: crypto.randomUUID(),
      date,
      name,
      skillId,
      note,
      cost,
      minutes,
      value,
      effort,
      countSpend,
      createdAt: new Date().toISOString(),
    });
  }
  saveData();
  document.querySelector('#sportDialog').close();
  render();
  showToast(isZh() ? '运动记录好了' : 'Sport logged', isZh() ? '前几天的球局也算回来了。' : 'Backfilled or updated successfully.');
  const savedId = existing ? existing.id : data.sportsSessions[0]?.id;
  analyzeSport(savedId);
  if (skillId) analyzeSportSkill(skillId, { open: true });
}

function saveSportSkillFromDialog() {
  if (!requireCloudAuth(isZh() ? '保存运动项目' : 'save sport skill')) return;
  const id = document.querySelector('#sportSkillEditId').value;
  const name = document.querySelector('#sportSkillNameInput').value.trim();
  const goal = document.querySelector('#sportSkillGoalInput').value.trim();
  const baseline = document.querySelector('#sportSkillBaselineInput').value.trim();
  const experience = document.querySelector('#sportSkillExperienceInput').value;
  const frequency = document.querySelector('#sportSkillFrequencyInput').value;
  if (!name || !goal || !baseline) return;
  const existing = (data.sportSkills || []).find((item) => item.id === id);
  checkpoint(existing ? '修改运动技能项目' : '新增运动技能项目');
  let skill = existing;
  if (existing) {
    Object.assign(existing, { name, goal, baseline, experience, frequency, updatedAt: new Date().toISOString() });
  } else {
    skill = { id: crypto.randomUUID(), name, goal, baseline, experience, frequency, progress: 0, aiAssessment: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.sportSkills.unshift(skill);
  }
  saveData();
  document.querySelector('#sportSkillDialog').close();
  render();
  showToast(existing ? '运动目标已更新' : `${name} 项目建立了`, 'AI 正在按你的真实现况建立基线与进阶路线。');
  analyzeSportSkill(skill.id, { open: true });
}

function saveHabitFromDialog() {
  if (!requireCloudAuth(isZh() ? '保存习惯' : 'save habits')) return;
  const id = document.querySelector('#habitEditId').value;
  const name = document.querySelector('#habitNameInput').value.trim();
  const category = document.querySelector('#habitCategoryInput').value;
  const difficulty = Number(document.querySelector('#habitDifficultyInput').value || 3);
  if (!name) return;
  const existing = (data.habits || []).find((item) => item.id === id);
  checkpoint(existing ? '修改习惯' : '新增习惯');
  if (existing) {
    Object.assign(existing, { name, category, difficulty, aiReview: null });
  } else {
    data.habits.unshift({
      id: crypto.randomUUID(),
      name,
      category,
      difficulty,
      createdAt: new Date().toISOString(),
      aiReview: null,
    });
  }
  saveData();
  document.querySelector('#habitDialog').close();
  render();
  showToast(existing ? (isZh() ? '习惯改好了' : 'Habit updated') : (isZh() ? '新习惯已加入' : 'Habit added'), isZh() ? '现在开始，它会单独追杀你。' : 'It will now be tracked daily.');
}

function toggleHabitDone(id) {
  if (!requireCloudAuth(isZh() ? '打卡习惯' : 'check habits')) return;
  const habit = (data.habits || []).find((item) => item.id === id);
  if (!habit) return;
  const date = keyOf();
  checkpoint('习惯打卡');
  data.habitLogs[date] = data.habitLogs[date] || {};
  data.habitLogs[date][id] = !data.habitLogs[date][id];
  syncHabitPenaltyQueue();
  saveData();
  render();
  showToast(
    data.habitLogs[date][id]
      ? (isZh() ? '习惯已拿下' : 'Habit secured')
      : (isZh() ? '今天打卡已取消' : 'Today mark removed'),
    data.habitLogs[date][id]
      ? (isZh() ? '继续刷连击，不要断。' : 'Keep the chain alive.')
      : (isZh() ? '那就不要再拖了。' : 'Then don’t leave it undone.')
  );
  analyzeHabit(id);
}

function toggleHabitDoneForDate(id, date) {
  if (!requireCloudAuth(isZh() ? '补打习惯' : 'backfill habits')) return;
  const habit = (data.habits || []).find((item) => item.id === id);
  if (!habit || !date || date > keyOf() || date < keyOf(new Date(habit.createdAt || 0))) return;
  checkpoint('补打昨天习惯');
  data.habitLogs[date] = data.habitLogs[date] || {};
  data.habitLogs[date][id] = !data.habitLogs[date][id];
  syncHabitPenaltyQueue();
  saveData(); render();
  showToast(data.habitLogs[date][id] ? (isZh() ? '已补回昨天' : 'Yesterday restored') : (isZh() ? '昨天补打已取消' : 'Backfill removed'), isZh() ? '连击与惩罚已经重新计算。' : 'Streaks and penalties were recalculated.');
}

function revealHabitPenalty(id) {
  if (!requireCloudAuth(isZh() ? '开启惩罚箱' : 'reveal punishment')) return;
  const item = (data.habitPenalties || []).find((penalty) => penalty.id === id);
  if (!item || item.status !== 'hidden' || item.showDate > keyOf()) return;
  checkpoint('开启惩罚箱');
  item.status = 'revealed';
  item.revealedAt = new Date().toISOString();
  item.animationAt = new Date().toISOString();
  saveData();
  render();
  showToast(isZh() ? '惩罚箱已打开' : 'Punishment revealed', isZh() ? '这次不是看看而已，是要认。' : 'This one is meant to sting.');
  if (!item.aiReview && cloud.configured) analyzeHabitPenalty(id);
}

function revealHabitDrop(dropId) {
  if (!requireCloudAuth(isZh() ? '开习惯奖励箱' : 'reveal habit drop')) return;
  const drop = habitDropCatalog.find((item) => item.id === dropId);
  const state = (data.habitDrops || []).find((item) => item.id === dropId);
  const score = getHabitCompletionScore();
  if (!drop || !state || score < drop.threshold || state.revealedAt) return;
  checkpoint('开启习惯奖励箱');
  state.revealedAt = new Date().toISOString();
  saveData();
  render();
  showToast(isZh() ? '习惯奖励箱开了' : 'Habit drop revealed', isZh() ? `${drop.revealTitle} 已出现。` : `${drop.revealTitle} is now visible.`);
}

function claimHabitDrop(dropId) {
  if (!requireCloudAuth(isZh() ? '领取习惯奖励' : 'claim habit perk')) return;
  const drop = habitDropCatalog.find((item) => item.id === dropId);
  const state = (data.habitDrops || []).find((item) => item.id === dropId);
  if (!drop || !state || !state.revealedAt || state.claimedAt) return;
  checkpoint('领取习惯奖励');
  state.claimedAt = new Date().toISOString();
  const perkId = crypto.randomUUID();
  state.convertedRewardId = perkId;
  data.habitPerks.unshift({
    id: perkId,
    title: drop.revealTitle,
    copy: drop.revealCopy,
    dropId,
    createdAt: new Date().toISOString(),
    status: 'earned',
  });
  saveData();
  render();
  showToast(isZh() ? '习惯奖励已收下' : 'Habit perk claimed', isZh() ? '这是你靠稳定刷出来的，不是白给。' : 'You earned this through consistency.');
}

function resolveHabitPenalty(id, status = 'done') {
  if (!requireCloudAuth(isZh() ? '处理惩罚箱' : 'resolve penalty box')) return;
  const item = (data.habitPenalties || []).find((penalty) => penalty.id === id);
  if (!item || item.status !== 'revealed') return;
  checkpoint(status === 'done' ? '执行习惯惩罚' : '跳过习惯惩罚');
  item.status = status;
  item.resolvedAt = new Date().toISOString();
  saveData();
  render();
  showToast(
    status === 'done' ? (isZh() ? '惩罚已执行' : 'Penalty completed') : (isZh() ? '这次先跳过' : 'Penalty skipped'),
    status === 'done'
      ? (isZh() ? '至少你认了，也执行了。' : 'At least you owned it and did it.')
      : (isZh() ? '再连续摆烂，它只会变更狠。' : 'If you keep missing, it will escalate.')
  );
}

function saveSettings() {
  checkpoint('系统设置');
  data.name = document.querySelector('#nameInput').value.trim() || 'Eric';
  data.dailyTarget = Number(document.querySelector('#targetInput').value) || 30;
  data.settings.themeMode = document.querySelector('#themeModeInput').value === 'light' ? 'light' : 'dark';
  data.settings.themeAccent = document.querySelector('#themeAccentInput').value;
  data.settings.themeAccent2 = document.querySelector('#themeAccent2Input').value;
  data.settings.themeBg = document.querySelector('#themeBgInput').value;
  data.settings.themePanel = document.querySelector('#themePanelInput').value;
  data.settings.themeText = document.querySelector('#themeTextInput').value;
  data.settings.themeDanger = document.querySelector('#themeDangerInput').value;
  saveData();
  applyTheme();
  document.querySelector('#settingsDialog').close();
  render();
  showToast(isZh() ? '设置存好了' : 'Settings saved', isZh() ? '名字、每日目标、主题都已经更新。' : 'Name, target, and theme were updated.');
}

function fillThemeInputs(mode = data.settings.themeMode, { usePreset = false } = {}) {
  const preset = getThemePreset(mode);
  const source = usePreset ? preset : getResolvedTheme();
  document.querySelector('#themeModeInput').value = mode === 'light' ? 'light' : 'dark';
  document.querySelector('#themeAccentInput').value = source.accent || preset.accent;
  document.querySelector('#themeAccent2Input').value = source.accent2 || preset.accent2;
  document.querySelector('#themeBgInput').value = source.bg || preset.bg;
  document.querySelector('#themePanelInput').value = source.panel || preset.panel;
  document.querySelector('#themeTextInput').value = source.text || preset.text;
  document.querySelector('#themeDangerInput').value = source.danger || preset.danger;
}

function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `discipline-os-backup-${keyOf()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(isZh() ? '备份已导出' : 'Backup exported', isZh() ? '本地资料已经打包好。' : 'Your local data is safe.');
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'REQUEST_FAILED');
  return result;
}

async function pullStateFromCloud({ silent = false } = {}) {
  if (!cloud.configured || !cloud.user) throw new Error('SUPABASE_NOT_CONFIGURED');
  const result = await fetchSupabaseState(cloud.user?.email || '', cloud.user?.id || '');
  if (result.state) {
    data = normalizeData(result.state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    render();
  }
  cloud.lastSyncedAt = result.updatedAt || new Date().toISOString();
  cloud.message = isZh()
    ? `自动同步：${formatSyncTime(cloud.lastSyncedAt)}`
    : `Auto synced ${formatSyncTime(cloud.lastSyncedAt)}`;
  if (!silent) {
    showToast(isZh() ? '资料已同步回来' : 'Cloud state loaded', isZh() ? '这台装置已经换成最新帐号资料。' : 'This device now matches the account state.');
  }
}

async function pushStateToCloud({ silent = false } = {}) {
  await syncStateToCloud({ silent: true });
  if (!silent) {
    showToast(isZh() ? '帐号资料已更新' : 'Account updated', isZh() ? '现在其他装置会跟上这份最新资料。' : 'Other devices will pick up this latest state.');
  }
}

async function initializeCloud() {
  cloud.configured = hasSupabaseConfig();
  if (!cloud.configured) {
    stopCloudLiveSync();
    cloud.authenticated = false;
    cloud.user = null;
    cloud.identities = [];
    cloud.lastSyncedAt = '';
    cloud.message = isZh() ? '先填 Supabase 项目资料，之后手机和 Mac 才能同帐号同步。' : 'Add your Supabase project values first to unlock shared account sync.';
    updateCloudUI();
    return;
  }
  try {
    const { session, user } = await getSupabaseSession();
    if (!session || !user) {
      stopCloudLiveSync();
      cloud.authenticated = false;
      cloud.user = null;
      cloud.identities = [];
      cloud.lastSyncedAt = '';
      cloud.message = isZh() ? '还没登入。要开始记录前，先注册或登入。' : 'Not signed in yet. Register or log in before recording.';
      updateCloudUI();
      if (!authBootPrompted && !hasOpenDialog()) {
        authBootPrompted = true;
        syncDialogReason = isZh() ? '先登入，系统才会开始帮你记录和同步。' : 'Log in first to start recording and syncing.';
        setSyncDialogMode('register');
        renderSyncDialog();
        document.querySelector('#syncDialog')?.showModal();
      }
      return;
    }
    cloud.authenticated = true;
    cloud.user = mapSupabaseUser(user);
    await refreshCloudIdentities();
    cloud.lastSyncedAt = '';
    cloud.message = isZh() ? '帐号已连接，正在接上你的资料。' : 'Account connected, loading your state.';
    const result = await fetchSupabaseState(user?.email || '', user.id);
    if (result.state) {
      data = normalizeData(result.state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      cloud.lastSyncedAt = result.updatedAt || cloud.lastSyncedAt;
      cloud.message = isZh()
        ? `自动同步：${formatSyncTime(cloud.lastSyncedAt)}`
        : `Auto synced ${formatSyncTime(cloud.lastSyncedAt)}`;
    } else if (hasMeaningfulLocalState()) {
      await pushStateToCloud({ silent: true });
    } else {
      cloud.message = isZh() ? '帐号已准备好，开始记录就会自动同步。' : 'Your account is ready. New records will sync automatically.';
    }
    startCloudLiveSync();
    authBootPrompted = true;
    render();
  } catch (error) {
    stopCloudLiveSync();
    cloud.authenticated = false;
    cloud.user = null;
    cloud.identities = [];
    cloud.lastSyncedAt = '';
    cloud.message = cloudErrorMessage(error) || (isZh() ? '先继续用本机资料。' : 'Continuing with local cache.');
    updateCloudUI();
  }
}

async function registerCloudAccount(form) {
  if (!cloud.configured) throw new Error('SUPABASE_NOT_CONFIGURED');
  const payload = {
    name: form.querySelector('#cloudRegisterName').value.trim() || data.name || 'Eric',
    email: form.querySelector('#cloudRegisterEmail').value.trim().toLowerCase(),
    password: form.querySelector('#cloudRegisterPassword').value,
  };
  const result = await registerSupabaseUser(payload);
  if (!result.user) throw new Error('REGISTER_FAILED');
  pendingVerificationEmail = payload.email;
  cloud.lastSyncedAt = '';
  if (!result.session) {
    cloud.authenticated = false;
    cloud.user = null;
    cloud.message = isZh() ? '帐号建好了，但还没确认邮箱。先去收信，再回来登入。' : 'Account created, but email verification is still pending.';
    setSyncDialogMode('verify');
    render();
    showToast(
      isZh() ? '帐号已建立' : 'Account created',
      isZh() ? '先去邮箱点确认信，再回来登入。' : 'Check your inbox, confirm the email, then log in.',
    );
    return;
  }

  cloud.authenticated = true;
  cloud.user = mapSupabaseUser(result.user);
  await refreshCloudIdentities();
  if (hasMeaningfulLocalState()) {
    await pushStateToCloud({ silent: true });
    cloud.message = isZh() ? '帐号建好了，这台装置的资料已经带进你的帐号。' : 'Account created and this device state was moved into your account.';
  } else {
    cloud.message = isZh() ? '帐号建好了。现在电脑和手机会一起看同一份。' : 'Account created. Desktop and phone now share the same state.';
  }
  pendingVerificationEmail = '';
  startCloudLiveSync();
  render();
  document.querySelector('#syncDialog').close();
  showToast(
    isZh() ? '帐号已建立' : 'Account created',
    isZh() ? '现在开始记录、修改、删除都会自动同步。' : 'New changes now sync automatically.',
  );
}

async function loginCloudAccount(form) {
  if (!cloud.configured) throw new Error('SUPABASE_NOT_CONFIGURED');
  const payload = {
    email: form.querySelector('#cloudLoginEmail').value.trim().toLowerCase(),
    password: form.querySelector('#cloudLoginPassword').value,
  };
  pendingVerificationEmail = payload.email;
  await loginSupabaseUser(payload);
  await initializeCloud();
  pendingVerificationEmail = '';
  document.querySelector('#syncDialog').close();
  showToast(isZh() ? '登入成功' : 'Logged in', isZh() ? '这台装置已经切到你的帐号资料。' : 'This device now uses your account state.');
}

async function loginWithGoogle() {
  if (!cloud.configured) throw new Error('SUPABASE_NOT_CONFIGURED');
  await signInWithGoogle({ redirectTo: window.location.origin });
}

async function linkGoogleToCloudAccount() {
  if (!cloud.configured || !cloud.authenticated) throw new Error('SUPABASE_NOT_CONFIGURED');
  await linkGoogleSupabaseIdentity({ redirectTo: window.location.origin });
}

async function saveCloudPassword(form) {
  if (!cloud.configured || !cloud.authenticated) throw new Error('SUPABASE_NOT_CONFIGURED');
  const password = form.querySelector('#cloudPasswordInput')?.value || '';
  const confirm = form.querySelector('#cloudPasswordConfirmInput')?.value || '';
  if (password.length < 8) throw new Error('Password should be at least 8 characters');
  if (password !== confirm) throw new Error(isZh() ? '两次密码不一样。' : 'Passwords do not match.');
  await updateSupabasePassword({ password });
  await refreshCloudIdentities();
  form.reset();
  renderSyncDialog();
  showToast(
    isZh() ? '密码已更新' : 'Password updated',
    isZh() ? '这个 email 现在也可以直接用密码登入。' : 'This email can now sign in with a password too.',
  );
}

async function resendConfirmationEmail() {
  if (!cloud.configured) throw new Error('SUPABASE_NOT_CONFIGURED');
  if (!pendingVerificationEmail) throw new Error('EMAIL_NOT_SET');
  await resendSupabaseConfirmationEmail({
    email: pendingVerificationEmail,
    redirectTo: window.location.origin,
  });
  showToast(
    isZh() ? '确认信已重发' : 'Confirmation email resent',
    isZh() ? '去邮箱找一封 Supabase / Google 风格的确认信。' : 'Check your inbox for a new confirmation email.',
  );
}

async function logoutCloudAccount() {
  stopCloudLiveSync();
  await logoutSupabaseUser();
  cloud.authenticated = false;
  cloud.user = null;
  cloud.identities = [];
  cloud.lastSyncedAt = '';
  cloud.message = isZh() ? '你已登出。再记录前要重新登入。' : 'You are logged out. Log back in before recording.';
  render();
  showToast(isZh() ? '已登出帐号' : 'Logged out', isZh() ? '这台装置已经回到未登入状态。' : 'This device is now back in signed-out mode.');
}

function switchView(name) {
  document.querySelectorAll('.nav-item[data-view]').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === name);
  });
  document.querySelectorAll('.view').forEach((view) => view.classList.remove('active-view'));
  document.querySelector(`#${name}View`).classList.add('active-view');
}

function isMobileSidebarMode() {
  return window.innerWidth <= 1180;
}

function updateSidebarToggleLabel() {
  const btn = document.querySelector('#sidebarToggleBtn');
  if (!btn) return;
  const mobileOpen = document.querySelector('.app-shell')?.classList.contains('sidebar-open');
  const expanded = isMobileSidebarMode() ? mobileOpen : !sidebarDesktopCollapsed;
  btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  btn.title = isZh()
    ? (expanded ? '收起菜单' : '展开菜单')
    : (expanded ? 'Hide menu' : 'Show menu');
  btn.setAttribute('aria-label', btn.title);
  btn.textContent = expanded ? '✕' : '☰';
}

function applySidebarState() {
  const shell = document.querySelector('.app-shell');
  const backdrop = document.querySelector('#sidebarBackdrop');
  if (!shell || !backdrop) return;
  if (isMobileSidebarMode()) {
    shell.classList.remove('sidebar-collapsed');
    backdrop.classList.toggle('show', shell.classList.contains('sidebar-open'));
    backdrop.hidden = !shell.classList.contains('sidebar-open');
  } else {
    shell.classList.remove('sidebar-open');
    backdrop.classList.remove('show');
    backdrop.hidden = true;
    shell.classList.toggle('sidebar-collapsed', sidebarDesktopCollapsed);
  }
  updateSidebarToggleLabel();
}

function openSidebar() {
  const shell = document.querySelector('.app-shell');
  if (!shell) return;
  if (isMobileSidebarMode()) {
    shell.classList.add('sidebar-open');
  } else {
    sidebarDesktopCollapsed = false;
    localStorage.setItem(SIDEBAR_STATE_KEY, '0');
  }
  applySidebarState();
}

function closeSidebar() {
  const shell = document.querySelector('.app-shell');
  if (!shell) return;
  if (isMobileSidebarMode()) {
    shell.classList.remove('sidebar-open');
  } else {
    sidebarDesktopCollapsed = true;
    localStorage.setItem(SIDEBAR_STATE_KEY, '1');
  }
  applySidebarState();
}

function toggleSidebar() {
  if (isMobileSidebarMode()) {
    const shell = document.querySelector('.app-shell');
    shell?.classList.toggle('sidebar-open');
    applySidebarState();
    return;
  }
  sidebarDesktopCollapsed = !sidebarDesktopCollapsed;
  localStorage.setItem(SIDEBAR_STATE_KEY, sidebarDesktopCollapsed ? '1' : '0');
  applySidebarState();
}

document.querySelector('#survivedBtn').addEventListener('click', () => {
  if (!requireCloudAuth(isZh() ? '锁定今天' : 'lock today')) return;
  if (data.records[keyOf()]?.amount > 0) {
    showToast(isZh() ? '今天已经破功' : 'Zero already broken', isZh() ? '今天就认了，明天不要连输。' : 'Return tomorrow. Never miss twice.');
    return;
  }
  const todayKey = keyOf();
  checkpoint('今天的胜利记录');
  data.records[todayKey] = {
    status: 'win',
    amount: 0,
    reason: '',
    type: 'zero',
    closedAt: new Date().toISOString(),
  };
  saveData();
  render();
  animateVictory();
  showToast(isZh() ? '今日胜利已锁定' : 'Day secured', isZh() ? '你又赢了自己一次。' : 'Your streak lives on.');
  analyzeRecord(todayKey);
});

document.querySelector('#spentBtn').addEventListener('click', () => {
  openSpendDialog(keyOf());
});

document.querySelectorAll('dialog .close-btn').forEach((button) => {
  button.addEventListener('click', () => button.closest('dialog').close());
});

document.querySelector('#syncBtn').addEventListener('click', () => {
  syncDialogReason = '';
  pendingVerificationEmail = pendingVerificationEmail || '';
  setSyncDialogMode(cloud.authenticated ? 'login' : 'register');
  renderSyncDialog();
  document.querySelector('#syncDialog').showModal();
});

document.querySelector('#sidebarToggleBtn').addEventListener('click', toggleSidebar);
document.querySelector('#sidebarBackdrop').addEventListener('click', () => {
  if (isMobileSidebarMode()) closeSidebar();
});

document.querySelector('#languageBtn').addEventListener('click', () => {
  checkpoint('语言设置');
  data.language = isZh() ? 'en' : 'zh';
  saveData({ mirror: false });
  renderRules();
  render();
  showToast(isZh() ? '已切换为中文' : 'LANGUAGE: ENGLISH', isZh() ? '语言选择已储存在本机。' : 'Language saved locally.');
});

document.querySelector('#addRecordBtn').addEventListener('click', () => openRecordForm('', 'history'));
document.querySelector('#openManagerBtn').addEventListener('click', () => switchView('manager'));
document.querySelector('#addLootBtn').addEventListener('click', () => openLootForm());
document.querySelector('#addImpulseBtn').addEventListener('click', () => openImpulseForm());
document.querySelector('#addSportBtn').addEventListener('click', () => openSportForm());
document.querySelector('#addSportSkillBtn').addEventListener('click', () => openSportSkillForm());
document.querySelector('#dashboardAddSportBtn').addEventListener('click', () => openSportForm());
document.querySelector('#techniqueCheckBtn').addEventListener('click', () => openTechniqueCheck());
document.querySelector('#addHabitBtn')?.addEventListener('click', () => openHabitForm());
document.querySelector('#managerAddBtn').addEventListener('click', () => {
  if (managerState.section === 'records') openRecordForm('', 'manager');
  if (managerState.section === 'rewards') openLootForm();
  if (managerState.section === 'impulses') openImpulseForm();
  if (managerState.section === 'sports') openSportForm();
});

document.querySelector('#lootImageInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  document.querySelector('#imagePickerText').textContent = isZh() ? '图片处理中…' : 'Processing image…';
  try {
    pendingLootImage = await compressImage(file);
    const preview = document.querySelector('#lootImagePreview');
    preview.style.backgroundImage = `url('${pendingLootImage}')`;
    preview.classList.add('has-image');
    document.querySelector('#imagePickerText').textContent = isZh() ? '更换图片' : 'Change image';
  } catch {
    document.querySelector('#imagePickerText').textContent = isZh() ? '图片读不到，再选一次' : 'Image failed, try again';
  }
});

document.querySelector('#recordStatusInput').addEventListener('change', (event) => {
  if (event.target.value === 'win') {
    document.querySelector('#recordAmountInput').value = 0;
    document.querySelector('#recordReasonInput').value = '';
  }
});

document.querySelector('#recordForm').addEventListener('submit', (event) => {
  event.preventDefault();
  saveRecordFromDialog();
});

document.querySelector('#recordDeleteBtn').addEventListener('click', () => {
  const key = document.querySelector('#recordOriginalKey').value;
  if (!key) return;
  if (!window.confirm(isZh() ? '确定删除这一天？' : 'Delete this day?')) return;
  deleteRecord(key);
  document.querySelector('#recordDialog').close();
});

document.querySelector('#lootForm').addEventListener('submit', (event) => {
  event.preventDefault();
  saveRewardFromDialog(event.target);
});

document.querySelector('#dropClaimForm').addEventListener('submit', (event) => {
  event.preventDefault();
  analyzeDropCandidate();
});

document.querySelector('#dropClaimForm').addEventListener('input', (event) => {
  if (!pendingDropClaim?.analysis || event.target.id === 'dropClaimId') return;
  pendingDropClaim = { ...pendingDropClaim, analysis: null, candidate: null, error: '' };
  document.querySelector('#dropCandidateAnalysis').innerHTML = '<div class="drop-analysis-placeholder">资料已改变，刚才的 AI 资格判断已经失效。请用新资料重新分析。</div>';
  const confirmButton = document.querySelector('#dropConfirmClaimBtn');
  confirmButton.disabled = true;
  confirmButton.textContent = '资料已改变，请重新 AI 分析';
});

document.querySelector('#dropConfirmClaimBtn').addEventListener('click', confirmDropClaim);

document.querySelector('#rewardResolveForm').addEventListener('submit', (event) => {
  event.preventDefault();
  saveRewardResolution();
});

document.querySelector('#rewardResolveReset').addEventListener('click', () => {
  const id = document.querySelector('#rewardResolveId').value;
  if (!id) return;
  resetRewardResolution(id);
});

document.querySelector('#impulseForm').addEventListener('submit', (event) => {
  event.preventDefault();
  saveImpulseFromDialog(event.target);
});

document.querySelector('#sportForm').addEventListener('submit', (event) => {
  event.preventDefault();
  saveSportFromDialog();
});

document.querySelector('#sportSkillForm').addEventListener('submit', (event) => {
  event.preventDefault();
  saveSportSkillFromDialog();
});

document.querySelector('#techniqueForm').addEventListener('submit', (event) => {
  event.preventDefault();
  analyzeTechnique();
});

document.querySelector('#techniqueImagesInput').addEventListener('change', async (event) => {
  const files = [...event.target.files].slice(0, 3);
  document.querySelector('#techniquePreview').innerHTML = '<span>照片处理中…</span>';
  try {
    techniqueImageData = await Promise.all(files.map(resizeTechniqueImage));
    document.querySelector('#techniquePreview').innerHTML = techniqueImageData.map((src, index) => `<figure><img src="${src}" alt="动作序列 ${index + 1}" /><b>${index + 1}</b></figure>`).join('');
  } catch {
    techniqueImageData = [];
    document.querySelector('#techniquePreview').innerHTML = '<span>照片处理失败，请重新选择。</span>';
  }
});

document.querySelector('#sportGoalGrid').addEventListener('click', (event) => {
  const create = event.target.closest('[data-create-first-sport]');
  const open = event.target.closest('[data-open-sport-progress]');
  const log = event.target.closest('[data-log-sport-skill]');
  const edit = event.target.closest('[data-edit-sport-skill]');
  const remove = event.target.closest('[data-delete-sport-skill]');
  if (create) openSportSkillForm();
  if (open) openSportProgress(open.dataset.openSportProgress);
  if (log) openSportForm(null, log.dataset.logSportSkill);
  if (edit) {
    const skill = (data.sportSkills || []).find((item) => item.id === edit.dataset.editSportSkill);
    if (skill) openSportSkillForm(skill);
  }
  if (remove && window.confirm('删除这个运动项目？已有训练记录会保留为一般运动。')) {
    if (!requireCloudAuth('删除运动项目')) return;
    checkpoint('删除运动技能项目');
    const id = remove.dataset.deleteSportSkill;
    data.sportSkills = (data.sportSkills || []).filter((item) => item.id !== id);
    (data.sportsSessions || []).forEach((session) => { if (session.skillId === id) session.skillId = null; });
    saveData(); render();
  }
});

document.querySelector('#sportProgressDialog').addEventListener('click', (event) => {
  const retry = event.target.closest('[data-retry-sport-progress]');
  const log = event.target.closest('[data-log-sport-progress]');
  if (retry) analyzeSportSkill(retry.dataset.retrySportProgress);
  if (log) { document.querySelector('#sportProgressDialog').close(); openSportForm(null, log.dataset.logSportProgress); }
});

document.querySelector('#exerciseSearchBtn').addEventListener('click', () => {
  exerciseLibrary.query = document.querySelector('#exerciseSearchInput').value.trim();
  exerciseLibrary.page = 1; exerciseLibrary.cursors = ['']; loadExercises();
});
document.querySelector('#exerciseSearchInput').addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); document.querySelector('#exerciseSearchBtn').click(); } });
document.querySelector('#exerciseBodyPartFilter').addEventListener('change', renderExerciseLibrary);
document.querySelector('#exerciseEquipmentFilter').addEventListener('change', renderExerciseLibrary);
document.querySelector('#exercisePrevBtn').addEventListener('click', () => loadExercises({ direction: 'prev' }));
document.querySelector('#exerciseNextBtn').addEventListener('click', () => loadExercises({ direction: 'next' }));
document.querySelector('#exerciseGrid').addEventListener('click', (event) => {
  const card = event.target.closest('[data-exercise-id]');
  if (card) openExerciseDetail(card.dataset.exerciseId);
});
document.querySelector('#exerciseState').addEventListener('click', (event) => { if (event.target.closest('[data-retry-exercises]')) loadExercises(); });
document.querySelector('#exerciseDialog').addEventListener('click', (event) => {
  const check = event.target.closest('[data-check-this-exercise]');
  const log = event.target.closest('[data-log-this-exercise]');
  if (check) { document.querySelector('#exerciseDialog').close(); openTechniqueCheck(check.dataset.checkThisExercise); }
  if (log) { document.querySelector('#exerciseDialog').close(); openSportForm({ name: log.dataset.logThisExercise, minutes: 45, value: 4, effort: 5, countSpend: false }); }
});

document.querySelector('#habitForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  saveHabitFromDialog();
});

document.querySelector('#spendForm').addEventListener('submit', (event) => {
  event.preventDefault();
  recordSpendToday(event.target);
});

document.querySelector('#settingsBtn').addEventListener('click', () => {
  document.querySelector('#nameInput').value = data.name;
  document.querySelector('#targetInput').value = data.dailyTarget;
  fillThemeInputs(data.settings.themeMode);
  document.querySelector('#settingsDialog').showModal();
});

document.querySelector('#settingsForm').addEventListener('submit', (event) => {
  event.preventDefault();
  saveSettings();
});

document.querySelector('#themeModeInput').addEventListener('change', (event) => {
  fillThemeInputs(event.target.value, { usePreset: true });
});

document.querySelector('#themePresetBtn').addEventListener('click', () => {
  fillThemeInputs(document.querySelector('#themeModeInput').value, { usePreset: true });
});

document.querySelector('#syncDialog').addEventListener('click', async (event) => {
  const tab = event.target.closest('[data-sync-mode]');
  if (tab) {
    setSyncDialogMode(tab.dataset.syncMode);
    renderSyncDialog();
  }
  if (event.target.closest('#googleAuthBtn')) {
    try {
      await loginWithGoogle();
    } catch (error) {
      showToast(isZh() ? 'Google 登入失败' : 'Google login failed', cloudErrorMessage(error));
    }
  }
  if (event.target.closest('#googleLinkBtn')) {
    try {
      await linkGoogleToCloudAccount();
    } catch (error) {
      showToast(isZh() ? 'Google 绑定失败' : 'Google linking failed', cloudErrorMessage(error));
    }
  }
  if (event.target.closest('#resendConfirmBtn')) {
    try {
      await resendConfirmationEmail();
    } catch (error) {
      showToast(isZh() ? '确认信重发失败' : 'Resend failed', cloudErrorMessage(error));
    }
  }
  if (event.target.closest('#logoutCloudBtn')) {
    if (!window.confirm(isZh() ? '确定登出云端帐号？' : 'Log out of cloud account?')) return;
    try {
      await logoutCloudAccount();
      document.querySelector('#syncDialog').close();
    } catch (error) {
      showToast(isZh() ? '云端操作失败' : 'Cloud action failed', cloudErrorMessage(error));
    }
  }
});

document.querySelector('#syncDialog').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  try {
    if (form.id === 'cloudRegisterForm') {
      await registerCloudAccount(form);
    }
    if (form.id === 'cloudLoginForm') {
      await loginCloudAccount(form);
    }
    if (form.id === 'cloudPasswordForm') {
      await saveCloudPassword(form);
    }
  } catch (error) {
    if (String(error?.message || '').includes('Email not confirmed')) {
      const emailInput = form.querySelector('#cloudLoginEmail') || form.querySelector('#cloudRegisterEmail');
      pendingVerificationEmail = emailInput?.value?.trim() || pendingVerificationEmail;
      setSyncDialogMode('verify');
      renderSyncDialog();
    }
    showToast(isZh() ? '云端操作失败' : 'Cloud action failed', cloudErrorMessage(error));
  }
});

document.querySelector('#resetBtn').addEventListener('click', () => {
  if (!window.confirm(isZh() ? '确定清掉全部本地资料？清掉后仍然可以立刻 Undo。' : 'Reset all local data? Undo will still be available.')) return;
  checkpoint('清空全部资料');
  data = normalizeData();
  saveData();
  document.querySelector('#settingsDialog').close();
  render();
  showToast(isZh() ? '全部资料已清空' : 'All data reset', isZh() ? '后悔的话现在按撤销。' : 'Undo is available right now.');
});

function handleLootGridClick(event) {
  const edit = event.target.closest('[data-edit-loot]');
  const remove = event.target.closest('[data-delete-loot]');
  const focus = event.target.closest('[data-focus-loot]');
  const ai = event.target.closest('[data-ai-loot]');
  const resolve = event.target.closest('[data-resolve-loot]');
  const chooseDropReward = event.target.closest('[data-choose-drop-reward]');
  if (chooseDropReward) {
    const item = (data.rewards || []).find((reward) => reward.id === chooseDropReward.dataset.chooseDropReward);
    if (item?.sourceDropId) claimDrop(item.sourceDropId, item.id);
  }
  if (ai) openAIAdvisor(ai.dataset.aiLoot);
  if (edit) {
    const item = (data.rewards || []).find((reward) => reward.id === edit.dataset.editLoot);
    if (item) openLootForm(item);
  }
  if (focus) {
    if (!requireCloudAuth(isZh() ? '设置主攻目标' : 'set focus rewards')) return;
    checkpoint('主攻目标设置');
    data.focusRewardId = data.focusRewardId === focus.dataset.focusLoot ? null : focus.dataset.focusLoot;
    saveData();
    render();
    showToast(isZh() ? '主攻目标已更新' : 'Focus reward updated', isZh() ? '下一波先冲这个。' : 'This is the next target.');
  }
  if (resolve) {
    const item = (data.rewards || []).find((reward) => reward.id === resolve.dataset.resolveLoot);
    if (item) openRewardResolveDialog(item);
  }
  if (remove && window.confirm(isZh() ? '这个战利品不要了？' : 'Delete this reward?')) {
    if (!requireCloudAuth(isZh() ? '删除战利品' : 'delete rewards')) return;
    checkpoint('删除战利品');
    data.rewards = (data.rewards || []).filter((reward) => reward.id !== remove.dataset.deleteLoot);
    if (data.focusRewardId === remove.dataset.deleteLoot) data.focusRewardId = null;
    saveData();
    render();
    showToast(isZh() ? '已经删除' : 'Deleted', isZh() ? '按错的话可以马上撤销。' : 'Undo is available.');
  }
}

document.querySelector('#lootGrid').addEventListener('click', handleLootGridClick);
document.querySelector('#lootArchiveGrid').addEventListener('click', handleLootGridClick);

document.querySelector('#dropStrip').addEventListener('click', (event) => {
  const reveal = event.target.closest('[data-reveal-drop]');
  const claim = event.target.closest('[data-claim-drop]');
  const preview = event.target.closest('[data-preview-drop]');
  if (reveal) revealDrop(reveal.dataset.revealDrop);
  if (claim) claimDrop(claim.dataset.claimDrop);
  if (preview) {
    const drop = dropCatalog.find((item) => item.id === preview.dataset.previewDrop);
    const state = getDropState(preview.dataset.previewDrop);
    if (!drop || !state) return;
    const message = state.revealedAt
      ? `${drop.revealTitle}\n\n${drop.revealCopy}\n\n你可以选择一个最高 RM ${money(drop.rewardCost)}、符合这个阶段的具体奖励；AI 判断通过后会直接进入“已经赢回来的东西”。`
      : `这是一箱未知掉落。\n\n门槛：RM ${money(drop.threshold)}\n\n提示：${drop.teaser}`;
    window.alert(message);
  }
});

document.querySelector('#dropPagination').addEventListener('click', (event) => {
  const button = event.target.closest('[data-drop-page]');
  if (!button || button.disabled) return;
  secretDropPage = Number(button.dataset.dropPage || 1);
  renderSecretDrops();
  document.querySelector('.drop-zone')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.querySelector('#impulseList').addEventListener('click', (event) => {
  const edit = event.target.closest('[data-edit-impulse]');
  const remove = event.target.closest('[data-delete-impulse]');
  const kill = event.target.closest('[data-kill-impulse]');
  const keep = event.target.closest('[data-keep-impulse]');
  if (edit) {
    const item = (data.impulses || []).find((impulse) => impulse.id === edit.dataset.editImpulse);
    if (item) openImpulseForm(item);
  }
  if (kill) {
    if (!requireCloudAuth(isZh() ? '处理冲动记录' : 'manage impulses')) return;
    checkpoint('冲动判定');
    const item = (data.impulses || []).find((impulse) => impulse.id === kill.dataset.killImpulse);
    if (!item) return;
    item.resolution = 'killed';
    item.resolvedAt = new Date().toISOString();
    saveData();
    render();
    showToast(`RM ${money(item.cost)} ${isZh() ? '守住了' : 'saved'}`, isZh() ? '这次不是省一点，是冲动没赢你。' : 'Impulse lost this round.');
  }
  if (keep) {
    if (!requireCloudAuth(isZh() ? '处理冲动记录' : 'manage impulses')) return;
    checkpoint('冲动转入战利品');
    const item = (data.impulses || []).find((impulse) => impulse.id === keep.dataset.keepImpulse);
    if (!item) return;
    const rewardId = crypto.randomUUID();
    item.resolution = 'vault';
    item.resolvedAt = new Date().toISOString();
    data.rewards.unshift({
      id: rewardId,
      name: item.name,
      cost: item.cost,
      priority: 2,
      category: 'other',
      why: '冷静 24 小时后还是想要。',
      image: '',
      createdAt: item.createdAt,
      outcome: null,
      outcomeAt: null,
      redeemedAt: null,
    });
    saveData();
    render();
    showToast(isZh() ? '已经转进战利品库' : 'Moved into reward vault', isZh() ? 'AI 会继续帮你拆它值不值得。' : 'AI will analyze it next.');
    analyzeReward(rewardId);
  }
  if (remove && window.confirm(isZh() ? '这个冲动记录不要了？' : 'Delete this impulse log?')) {
    if (!requireCloudAuth(isZh() ? '删除冲动记录' : 'delete impulses')) return;
    checkpoint('删除冲动记录');
    data.impulses = (data.impulses || []).filter((impulse) => impulse.id !== remove.dataset.deleteImpulse);
    saveData();
    render();
    showToast(isZh() ? '已经删除' : 'Deleted', isZh() ? '挡掉次数和金额已经自动重算。' : 'Counters were recalculated instantly.');
  }
});

document.querySelector('#historyList').addEventListener('click', (event) => {
  const addTransaction = event.target.closest('[data-add-record-transaction]');
  const ai = event.target.closest('[data-ai-record]');
  const edit = event.target.closest('[data-edit-record]');
  const remove = event.target.closest('[data-delete-record]');
  if (addTransaction) openSpendDialog(addTransaction.dataset.addRecordTransaction);
  if (ai) openRecordAI(ai.dataset.aiRecord);
  if (edit) openRecordForm(edit.dataset.editRecord, 'history');
  if (remove && window.confirm(isZh() ? '这一天的记录确定要删除？' : 'Delete this day?')) {
    deleteRecord(remove.dataset.deleteRecord);
  }
});

document.querySelectorAll('[data-history-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    historyRangeState.mode = button.dataset.historyMode;
    document.querySelectorAll('[data-history-mode]').forEach((item) => item.classList.toggle('active', item === button));
    renderHistory();
  });
});

document.querySelector('#historyStartInput')?.addEventListener('change', (event) => {
  historyRangeState.start = event.target.value;
  historyRangeState.mode = 'range';
  document.querySelectorAll('[data-history-mode]').forEach((item) => item.classList.toggle('active', item.dataset.historyMode === 'range'));
  renderHistory();
});

document.querySelector('#historyEndInput')?.addEventListener('change', (event) => {
  historyRangeState.end = event.target.value;
  historyRangeState.mode = 'range';
  document.querySelectorAll('[data-history-mode]').forEach((item) => item.classList.toggle('active', item.dataset.historyMode === 'range'));
  renderHistory();
});

document.querySelectorAll('[data-habit-report-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    habitReportRangeState.mode = button.dataset.habitReportMode;
    document.querySelectorAll('[data-habit-report-mode]').forEach((item) => item.classList.toggle('active', item === button));
    renderHabitReport();
  });
});

document.querySelector('#habitReportStartInput')?.addEventListener('change', (event) => {
  habitReportRangeState.start = event.target.value;
  habitReportRangeState.mode = 'range';
  document.querySelectorAll('[data-habit-report-mode]').forEach((item) => item.classList.toggle('active', item.dataset.habitReportMode === 'range'));
  renderHabitReport();
});

document.querySelector('#habitReportEndInput')?.addEventListener('change', (event) => {
  habitReportRangeState.end = event.target.value;
  habitReportRangeState.mode = 'range';
  document.querySelectorAll('[data-habit-report-mode]').forEach((item) => item.classList.toggle('active', item.dataset.habitReportMode === 'range'));
  renderHabitReport();
});

document.querySelector('#sportList').addEventListener('click', (event) => {
  const ai = event.target.closest('[data-ai-sport]');
  const edit = event.target.closest('[data-edit-sport]');
  const remove = event.target.closest('[data-delete-sport]');
  if (ai) openSportAI(ai.dataset.aiSport);
  if (edit) {
    const item = (data.sportsSessions || []).find((sport) => sport.id === edit.dataset.editSport);
    if (item) openSportForm(item);
  }
  if (remove && window.confirm(isZh() ? '删除这场运动记录？' : 'Delete this sports session?')) {
    if (!requireCloudAuth(isZh() ? '删除运动记录' : 'delete sports logs')) return;
    checkpoint('删除运动记录');
    data.sportsSessions = (data.sportsSessions || []).filter((sport) => sport.id !== remove.dataset.deleteSport);
    saveData();
    render();
    showToast(isZh() ? '运动记录删掉了' : 'Sport deleted', isZh() ? '按错可以马上撤销。' : 'Undo is available.');
  }
});

document.querySelector('#sportPagination').addEventListener('click', (event) => {
  const button = event.target.closest('[data-sport-page]');
  if (!button || button.disabled) return;
  sportSessionsPage = Number(button.dataset.sportPage || 1);
  renderSports();
  document.querySelector('#sportList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.querySelector('#managerList').addEventListener('click', (event) => {
  const quickAdd = event.target.closest('#managerQuickAddBtn');
  if (quickAdd) return;
  const addRecordTransaction = event.target.closest('[data-add-record-transaction]');
  const aiRecord = event.target.closest('[data-ai-record]');
  const editRecord = event.target.closest('[data-edit-record]');
  const deleteRecordBtn = event.target.closest('[data-delete-record]');
  const editLoot = event.target.closest('[data-edit-loot]');
  const deleteLootBtn = event.target.closest('[data-delete-loot]');
  const resolveLootBtn = event.target.closest('[data-resolve-loot]');
  const editImpulse = event.target.closest('[data-edit-impulse]');
  const deleteImpulseBtn = event.target.closest('[data-delete-impulse]');
  const aiSport = event.target.closest('[data-ai-sport]');
  const editSport = event.target.closest('[data-edit-sport]');
  const deleteSportBtn = event.target.closest('[data-delete-sport]');
  if (addRecordTransaction) openSpendDialog(addRecordTransaction.dataset.addRecordTransaction);
  if (aiRecord) openRecordAI(aiRecord.dataset.aiRecord);
  if (editRecord) openRecordForm(editRecord.dataset.editRecord, 'manager');
  if (deleteRecordBtn && window.confirm(isZh() ? '删掉这天？' : 'Delete this day?')) deleteRecord(deleteRecordBtn.dataset.deleteRecord);
  if (editLoot) {
    const item = (data.rewards || []).find((reward) => reward.id === editLoot.dataset.editLoot);
    if (item) openLootForm(item);
  }
  if (resolveLootBtn) {
    const item = (data.rewards || []).find((reward) => reward.id === resolveLootBtn.dataset.resolveLoot);
    if (item) openRewardResolveDialog(item);
  }
  if (deleteLootBtn && window.confirm(isZh() ? '删掉这个战利品？' : 'Delete this reward?')) {
    if (!requireCloudAuth(isZh() ? '删除战利品' : 'delete rewards')) return;
    checkpoint('删除战利品');
    data.rewards = (data.rewards || []).filter((reward) => reward.id !== deleteLootBtn.dataset.deleteLoot);
    if (data.focusRewardId === deleteLootBtn.dataset.deleteLoot) data.focusRewardId = null;
    saveData();
    render();
  }
  if (editImpulse) {
    const item = (data.impulses || []).find((impulse) => impulse.id === editImpulse.dataset.editImpulse);
    if (item) openImpulseForm(item);
  }
  if (deleteImpulseBtn && window.confirm(isZh() ? '删掉这个冲动记录？' : 'Delete this impulse log?')) {
    if (!requireCloudAuth(isZh() ? '删除冲动记录' : 'delete impulses')) return;
    checkpoint('删除冲动记录');
    data.impulses = (data.impulses || []).filter((impulse) => impulse.id !== deleteImpulseBtn.dataset.deleteImpulse);
    saveData();
    render();
  }
  if (aiSport) openSportAI(aiSport.dataset.aiSport);
  if (editSport) {
    const item = (data.sportsSessions || []).find((sport) => sport.id === editSport.dataset.editSport);
    if (item) openSportForm(item);
  }
  if (deleteSportBtn && window.confirm(isZh() ? '删掉这场运动？' : 'Delete this session?')) {
    if (!requireCloudAuth(isZh() ? '删除运动记录' : 'delete sports logs')) return;
    checkpoint('删除运动记录');
    data.sportsSessions = (data.sportsSessions || []).filter((sport) => sport.id !== deleteSportBtn.dataset.deleteSport);
    saveData();
    render();
  }
});

document.querySelector('#sportAiDialog').addEventListener('click', (event) => {
  const retry = event.target.closest('[data-retry-ai-sport]');
  if (retry) analyzeSport(retry.dataset.retryAiSport, { open: true });
});

document.querySelector('#habitAiDialog')?.addEventListener('click', (event) => {
  const retry = event.target.closest('[data-retry-ai-habit]');
  if (retry) analyzeHabit(retry.dataset.retryAiHabit, { open: true });
});

document.querySelector('#habitList')?.addEventListener('click', (event) => {
  const toggle = event.target.closest('[data-toggle-habit]');
  const backfill = event.target.closest('[data-backfill-habit]');
  const ai = event.target.closest('[data-ai-habit]');
  const edit = event.target.closest('[data-edit-habit]');
  const remove = event.target.closest('[data-delete-habit]');
  if (toggle) toggleHabitDone(toggle.dataset.toggleHabit);
  if (backfill) toggleHabitDoneForDate(backfill.dataset.backfillHabit, backfill.dataset.backfillDate);
  if (ai) openHabitAI(ai.dataset.aiHabit);
  if (edit) {
    const item = (data.habits || []).find((habit) => habit.id === edit.dataset.editHabit);
    if (item) openHabitForm(item);
  }
  if (remove && window.confirm(isZh() ? '删掉这个习惯？' : 'Delete this habit?')) {
    if (!requireCloudAuth(isZh() ? '删除习惯' : 'delete habits')) return;
    checkpoint('删除习惯');
    data.habits = (data.habits || []).filter((habit) => habit.id !== remove.dataset.deleteHabit);
    Object.keys(data.habitLogs || {}).forEach((date) => {
      if (data.habitLogs[date]) delete data.habitLogs[date][remove.dataset.deleteHabit];
    });
    syncHabitPenaltyQueue();
    saveData();
    render();
    showToast(isZh() ? '习惯删掉了' : 'Habit deleted', isZh() ? '相关打卡和惩罚也一起清掉。' : 'Related logs and penalties were cleared.');
  }
});

document.querySelector('#habitDropStrip')?.addEventListener('click', (event) => {
  const reveal = event.target.closest('[data-reveal-habit-drop]');
  const claim = event.target.closest('[data-claim-habit-drop]');
  const preview = event.target.closest('[data-preview-habit-drop]');
  if (reveal) revealHabitDrop(reveal.dataset.revealHabitDrop);
  if (claim) claimHabitDrop(claim.dataset.claimHabitDrop);
  if (preview) {
    const drop = habitDropCatalog.find((item) => item.id === preview.dataset.previewHabitDrop);
    const state = (data.habitDrops || []).find((item) => item.id === preview.dataset.previewHabitDrop);
    if (!drop || !state) return;
    window.alert(
      state.revealedAt
        ? `${drop.revealTitle}\n\n${drop.revealCopy}`
        : `${drop.title}\n\n${drop.teaser}\n\n${isZh() ? `门槛：累计完成 ${drop.threshold} 次` : `Requirement: ${drop.threshold} total completions`}`,
    );
  }
});

document.querySelector('#habitPerkList')?.addEventListener('click', (event) => {
  const use = event.target.closest('[data-use-habit-perk]');
  if (!use || !requireCloudAuth(isZh() ? '使用习惯奖励' : 'use habit perk')) return;
  const perk = (data.habitPerks || []).find((item) => item.id === use.dataset.useHabitPerk);
  if (!perk || perk.status === 'used') return;
  checkpoint('使用习惯奖励');
  perk.status = 'used'; perk.usedAt = new Date().toISOString();
  saveData(); render();
  showToast(isZh() ? '补血奖励已使用' : 'Perk used', isZh() ? '兑换就是兑现，不会再挂着让你猜。' : 'The reward is now consumed.');
});

document.querySelector('#habitPenaltyList')?.addEventListener('click', (event) => {
  const reveal = event.target.closest('[data-reveal-penalty]');
  const grace = event.target.closest('[data-grace-penalty]');
  const done = event.target.closest('[data-done-penalty]');
  const skip = event.target.closest('[data-skip-penalty]');
  if (reveal) revealHabitPenalty(reveal.dataset.revealPenalty);
  if (grace) {
    if (!requireCloudAuth(isZh() ? '使用宽限券' : 'use a grace pass')) return;
    const penalty = (data.habitPenalties || []).find((item) => item.id === grace.dataset.gracePenalty);
    const weekStart = new Date(); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    if (!penalty || (data.habitGraceUses || []).some((item) => item.usedAt >= weekStart.toISOString())) return;
    checkpoint('使用习惯宽限券');
    data.habitGraceUses.push({ date: penalty.forDate, usedAt: new Date().toISOString() });
    syncHabitPenaltyQueue(); saveData(); render();
    showToast(isZh() ? '本周宽限券已使用' : 'Grace pass used', isZh() ? '这天保留真实记录，但不会受罚。下周一补回 1 张。' : 'The miss stays truthful, but carries no punishment.');
  }
  if (done) resolveHabitPenalty(done.dataset.donePenalty, 'done');
  if (skip) resolveHabitPenalty(skip.dataset.skipPenalty, 'skipped');
});

document.querySelector('#dayAiOpenBtn').addEventListener('click', (event) => {
  const key = event.currentTarget.dataset.aiRecord || keyOf();
  openRecordAI(key);
});

document.querySelector('#recordAiDialog').addEventListener('click', (event) => {
  const retry = event.target.closest('[data-retry-ai-record]');
  const txAI = event.target.closest('[data-ai-transaction]');
  const txEdit = event.target.closest('[data-edit-transaction]');
  const txDelete = event.target.closest('[data-delete-transaction]');
  if (retry) analyzeRecord(retry.dataset.retryAiRecord, { open: true });
  if (txAI) {
    const [recordKey, transactionId] = txAI.dataset.aiTransaction.split(':');
    analyzeTransaction(recordKey, transactionId, { open: true });
  }
  if (txEdit) {
    const [recordKey, transactionId] = txEdit.dataset.editTransaction.split(':');
    openSpendDialog(recordKey, transactionId);
  }
  if (txDelete) {
    if (!requireCloudAuth(isZh() ? '删除消费记录' : 'delete transactions')) return;
    const [recordKey, transactionId] = txDelete.dataset.deleteTransaction.split(':');
    const record = data.records[recordKey];
    if (!record) return;
    if (!window.confirm(isZh() ? '删掉这一笔消费？' : 'Delete this transaction?')) return;
    checkpoint('删除单笔消费');
    record.transactions = getRecordTransactions(record).filter((item) => item.id !== transactionId);
    if (!record.transactions.length) {
      delete data.records[recordKey];
      saveData();
      render();
      document.querySelector('#recordAiDialog').close();
      showToast(isZh() ? '这笔删掉了' : 'Transaction deleted', isZh() ? '当天已经没有消费记录了。' : 'That day now has no spend record.');
      return;
    } else {
      data.records[recordKey] = syncRecordFields({
        ...record,
        status: 'spent',
        transactions: record.transactions,
      });
      analyzeRecord(recordKey);
    }
    saveData();
    render();
    renderRecordAI(recordKey, data.records[recordKey]);
    showToast(isZh() ? '这笔删掉了' : 'Transaction deleted', isZh() ? '当天总额已经自动重算。' : 'Day total was recalculated.');
  }
});

document.querySelector('#managerHead').addEventListener('click', (event) => {
  const quickAdd = event.target.closest('#managerQuickAddBtn');
  if (!quickAdd) return;
  if (managerState.section === 'records') openRecordForm('', 'manager');
  if (managerState.section === 'rewards') openLootForm();
  if (managerState.section === 'impulses') openImpulseForm();
  if (managerState.section === 'sports') openSportForm();
});

document.querySelector('#addSavingEntryBtn')?.addEventListener('click', () => openSavingForm());
document.querySelector('#addSavingsAccountBtn')?.addEventListener('click', () => openSavingsAccountForm());
document.querySelector('#savingsAccountImageInput')?.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  pendingSavingsAccountImage = await compressImage(file);
  const preview = document.querySelector('#savingsAccountImagePreview');
  preview.style.backgroundImage = `url('${pendingSavingsAccountImage}')`;
  preview.classList.add('has-image');
});
document.querySelector('#savingsAccountForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!requireCloudAuth(isZh() ? '保存资产账户' : 'save asset accounts')) return;
  const id = document.querySelector('#savingsAccountEditId').value;
  const old = (data.savingsAccounts || []).find((item) => item.id === id);
  const account = {
    id: id || crypto.randomUUID(),
    name: document.querySelector('#savingsAccountNameInput').value.trim(),
    type: document.querySelector('#savingsAccountTypeInput').value,
    balance: Math.max(0, Number(document.querySelector('#savingsAccountBalanceInput').value || 0)),
    image: pendingSavingsAccountImage,
    note: document.querySelector('#savingsAccountNoteInput').value.trim(),
    createdAt: old?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (!account.name) return;
  checkpoint(id ? '更新资产账户余额' : '新增资产账户');
  if (old) data.savingsAccounts = data.savingsAccounts.map((item) => item.id === id ? account : item);
  else data.savingsAccounts = [...(data.savingsAccounts || []), account];
  saveData(); document.querySelector('#savingsAccountDialog').close(); render();
  showToast('资产账户已对齐', `${account.name} · RM ${money(account.balance)}`);
});
document.querySelector('#battleSyncBtn')?.addEventListener('click', openBattleSyncDialog);
document.querySelector('#battleSyncDialog')?.addEventListener('click', (event) => {
  const action = event.target.closest('[data-battle-sync-action]');
  if (action) setBattleSyncStatus(action.dataset.battleSyncId, action.dataset.battleSyncAction);
});
document.querySelector('#analyzeSavingsBtn')?.addEventListener('click', () => analyzeSavings());
document.querySelector('#setSavingsGoalBtn')?.addEventListener('click', () => {
  document.querySelector('#savingsGoalNameInput').value = data.savingsGoal?.name || '';
  document.querySelector('#savingsGoalAmountInput').value = data.savingsGoal?.amount || '';
  document.querySelector('#savingsGoalDialog').showModal();
});
document.querySelector('#savingsGoalForm')?.addEventListener('submit', (event) => {
  event.preventDefault(); if (!requireCloudAuth('设置储蓄目标')) return;
  checkpoint('设置储蓄目标');
  data.savingsGoal = { id: crypto.randomUUID(), name: document.querySelector('#savingsGoalNameInput').value.trim(), amount: Math.abs(Number(document.querySelector('#savingsGoalAmountInput').value)), createdAt: new Date().toISOString(), openedAt: null, reward: null, loading: false, error: '' };
  saveData(); document.querySelector('#savingsGoalDialog').close(); render();
});
function openRecurringForm(item = null) {
  document.querySelector('#recurringEditId').value = item?.id || '';
  document.querySelector('#recurringTitleInput').value = item?.title || '';
  document.querySelector('#recurringAmountInput').value = item?.amount || '';
  document.querySelector('#recurringDayInput').value = item?.day || new Date().getDate();
  document.querySelector('#recurringStartInput').value = item?.startDate || keyOf();
  const accountSelect = document.querySelector('#recurringAccountInput');
  accountSelect.innerHTML = `<option value="">未分配账户</option>${(data.savingsAccounts || []).map((account) => `<option value="${account.id}">${escapeHtml(account.name)}</option>`).join('')}`;
  accountSelect.value = item?.accountId || '';
  document.querySelector(`input[name="recurringType"][value="${item?.type || 'expense'}"]`).checked = true;
  document.querySelector('#recurringDialog').showModal();
}
document.querySelector('#addRecurringBtn')?.addEventListener('click', () => openRecurringForm());
document.querySelector('#recurringForm')?.addEventListener('submit', (event) => {
  event.preventDefault(); if (!requireCloudAuth('设置固定现金流')) return;
  const id = document.querySelector('#recurringEditId').value; const old = (data.recurringSavings || []).find((x) => x.id === id);
  const item = { id: id || crypto.randomUUID(), title: document.querySelector('#recurringTitleInput').value.trim(), type: document.querySelector('input[name="recurringType"]:checked').value, amount: Math.abs(Number(document.querySelector('#recurringAmountInput').value)), day: Number(document.querySelector('#recurringDayInput').value), startDate: document.querySelector('#recurringStartInput').value, accountId: document.querySelector('#recurringAccountInput').value, active: old?.active !== false, createdAt: old?.createdAt || new Date().toISOString() };
  checkpoint(id ? '修改固定项目' : '新增固定项目');
  data.recurringSavings = id ? data.recurringSavings.map((x) => x.id === id ? item : x) : [...data.recurringSavings, item];
  saveData(); document.querySelector('#recurringDialog').close(); render();
});
document.querySelector('#savingForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!requireCloudAuth(isZh() ? '记录存钱账本' : 'save ledger entries')) return;
  const id = document.querySelector('#savingEditId').value;
  const oldEntry = (data.savingsEntries || []).find((item) => item.id === id);
  const entry = {
    ...((data.savingsEntries || []).find((item) => item.id === id) || {}),
    id: id || crypto.randomUUID(),
    date: document.querySelector('#savingDateInput').value,
    type: document.querySelector('input[name="savingType"]:checked').value,
    title: document.querySelector('#savingTitleInput').value.trim(),
    amount: Math.abs(Number(document.querySelector('#savingAmountInput').value || 0)),
    note: document.querySelector('#savingNoteInput').value.trim(),
    accountId: document.querySelector('#savingAccountInput').value,
    createdAt: (data.savingsEntries || []).find((item) => item.id === id)?.createdAt || new Date().toISOString(),
  };
  if (!entry.title || !entry.amount || !entry.date) return;
  checkpoint(id ? '修改存钱账本' : '新增存钱账本');
  if (oldEntry) adjustAccountForEntry(oldEntry, -1);
  adjustAccountForEntry(entry, 1);
  if (id) data.savingsEntries = (data.savingsEntries || []).map((item) => item.id === id ? entry : item);
  else data.savingsEntries = [...(data.savingsEntries || []), entry];
  saveData();
  document.querySelector('#savingDialog').close();
  render();
  showToast('账本已更新', entry.type === 'income' ? `收入 + RM ${money(entry.amount)}` : `花费 − RM ${money(entry.amount)}`);
});
document.querySelector('#savingsView')?.addEventListener('click', (event) => {
  const mode = event.target.closest('[data-savings-mode]');
  const edit = event.target.closest('[data-edit-saving]');
  const remove = event.target.closest('[data-delete-saving]');
  const ai = event.target.closest('[data-ai-saving]');
  const openReward = event.target.closest('[data-open-savings-reward]');
  const editRecurring = event.target.closest('[data-edit-recurring]');
  const toggleRecurring = event.target.closest('[data-toggle-recurring]');
  const deleteRecurring = event.target.closest('[data-delete-recurring]');
  const editAccount = event.target.closest('[data-edit-savings-account]');
  const deleteAccount = event.target.closest('[data-delete-savings-account]');
  if (mode) { savingsMode = mode.dataset.savingsMode; renderSavings(); }
  if (ai) analyzeSavings(ai.dataset.aiSaving);
  if (openReward) openSavingsReward();
  if (edit) {
    const item = (data.savingsEntries || []).find((entry) => entry.id === edit.dataset.editSaving);
    if (item) openSavingForm(item);
  }
  if (remove && window.confirm('删除这笔账本记录？')) {
    if (!requireCloudAuth('删除存钱账本记录')) return;
    checkpoint('删除存钱账本');
    const removed = (data.savingsEntries || []).find((item) => item.id === remove.dataset.deleteSaving);
    if (removed) adjustAccountForEntry(removed, -1);
    data.savingsEntries = (data.savingsEntries || []).filter((item) => item.id !== remove.dataset.deleteSaving);
    if (removed?.sourceTransactionId) delete data.savingsBattleSync[removed.sourceTransactionId];
    saveData(); render();
  }
  if (editRecurring) openRecurringForm(data.recurringSavings.find((x) => x.id === editRecurring.dataset.editRecurring));
  if (toggleRecurring) { const item = data.recurringSavings.find((x) => x.id === toggleRecurring.dataset.toggleRecurring); if (item) { checkpoint('切换固定项目'); item.active = !item.active; saveData(); render(); } }
  if (deleteRecurring && window.confirm('删除这个固定项目？已经自动写入的旧记录会保留。')) { checkpoint('删除固定项目'); data.recurringSavings = data.recurringSavings.filter((x) => x.id !== deleteRecurring.dataset.deleteRecurring); saveData(); render(); }
  if (editAccount) {
    const account = (data.savingsAccounts || []).find((item) => item.id === editAccount.dataset.editSavingsAccount);
    if (account) openSavingsAccountForm(account);
  }
  if (deleteAccount && window.confirm('删除这个资产账户？账本记录会保留，但会变成未分配账户。')) {
    if (!requireCloudAuth('删除资产账户')) return;
    checkpoint('删除资产账户');
    const accountId = deleteAccount.dataset.deleteSavingsAccount;
    data.savingsAccounts = (data.savingsAccounts || []).filter((item) => item.id !== accountId);
    data.savingsEntries = (data.savingsEntries || []).map((entry) => entry.accountId === accountId ? { ...entry, accountId: '' } : entry);
    saveData(); render();
  }
});
document.querySelector('#savingsStartInput')?.addEventListener('change', () => { savingsMode = 'range'; renderSavings(); });
document.querySelector('#savingsEndInput')?.addEventListener('change', () => { savingsMode = 'range'; renderSavings(); });
document.querySelector('#savingDialog .close-btn')?.addEventListener('click', () => document.querySelector('#savingDialog').close());
['recurringDialog','savingsGoalDialog','savingsAiDialog','battleSyncDialog','savingsAccountDialog'].forEach((id) => document.querySelector(`#${id} .close-btn`)?.addEventListener('click', () => document.querySelector(`#${id}`).close()));

document.querySelectorAll('.nav-item[data-view]').forEach((button) => {
  button.addEventListener('click', () => {
    switchView(button.dataset.view);
    if (isMobileSidebarMode()) closeSidebar();
  });
});

document.querySelectorAll('[data-manager-section]').forEach((button) => {
  button.addEventListener('click', () => {
    managerState.section = button.dataset.managerSection;
    managerState.page = 1;
    renderManager();
  });
});

document.querySelector('#managerPrevBtn').addEventListener('click', () => {
  managerState.page = Math.max(1, managerState.page - 1);
  renderManager();
});

document.querySelector('#managerNextBtn').addEventListener('click', () => {
  managerState.page += 1;
  renderManager();
});

document.querySelector('#prevMonth').addEventListener('click', () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
  renderCalendar();
});

document.querySelector('#nextMonth').addEventListener('click', () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
  renderCalendar();
});

document.querySelector('#todayMonth').addEventListener('click', () => {
  calendarDate = new Date();
  renderCalendar();
});

document.querySelector('#calendarDays').addEventListener('click', (event) => {
  const button = event.target.closest('[data-calendar-key]');
  if (!button) return;
  openRecordForm(button.dataset.calendarKey, 'calendar');
});

document.querySelector('#aiChatForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.querySelector('#aiChatInput');
  const message = input.value.trim();
  if (!message) return;
  input.value = '';
  askRewardAI(message);
});

document.querySelector('#undoHeaderBtn').addEventListener('click', undoLast);
document.querySelector('#toastUndoBtn').addEventListener('click', undoLast);
document.querySelector('#exportBtn').addEventListener('click', exportData);

renderRules();
applyTheme();
applySidebarState();
render();
loadExercises();
loadExerciseFilters();
enforcePortraitControlDeck();
window.addEventListener('resize', enforcePortraitControlDeck);
window.addEventListener('orientationchange', () => setTimeout(enforcePortraitControlDeck, 120));
updateCountdown();
registerPWA();
syncStateToFile();
setInterval(updateCountdown, 1000);
setInterval(rotateWarCry, 4200);
setInterval(renderImpulses, 60000);
initializeCloud();

onSupabaseAuthStateChange((session) => {
  if (!hasSupabaseConfig()) return;
  if (!session) {
    stopCloudLiveSync();
    cloud.authenticated = false;
    cloud.user = null;
    cloud.identities = [];
    cloud.lastSyncedAt = '';
    cloud.message = isZh() ? '你现在是未登入状态。' : 'You are currently signed out.';
    updateCloudUI();
    return;
  }
  initializeCloud();
});

window.addEventListener('online', () => {
  if (cloud.authenticated) {
    syncStateToCloud({ silent: true });
    pullStateFromCloud({ silent: true }).catch(() => {});
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden || !cloud.authenticated) return;
  pullStateFromCloud({ silent: true }).catch(() => {});
});

window.addEventListener('resize', applySidebarState);

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isMobileSidebarMode()) {
    closeSidebar();
  }
});
