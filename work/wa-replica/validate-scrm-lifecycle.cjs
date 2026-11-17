const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'outputs/wa-replica-prototype');
const read = p => fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
const json = p => JSON.parse(read(p));

// 1. Verify historical baseline files remain untouched when present locally
const hashes = json(path.join(__dirname, 'baseline.json'));
let verifiedBaseline = 0;
for (const [name, hash] of Object.entries(hashes)) {
  const target = path.join(root, 'outputs', name);
  if (fs.existsSync(target)) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    assert.equal(actual, hash, `Baseline file changed: ${name}`);
    verifiedBaseline++;
  }
}

// 2. Verify requirements.json integrity and lifecycle scope modules
const req = json(path.join(out, 'requirements.json'));
assert.equal(req.version, '0.8-scrm-engagement');
for (const id of ['P-LIFECYCLE', 'P-PIPELINES', 'P-DEALS']) {
  const deferred = req.modules.find(m => m.id === id);
  assert.equal(deferred?.decision, '本轮不展示', `${id} must be recorded as deferred`);
  assert.deepEqual(deferred.screens, [], `${id} must not expose a screen`);
}
assert(req.modules.some(m => m.id === 'P-FOLLOW' && m.screens.includes('followups')));
assert(req.review.items.some(i => i.id === 'ENGAGEMENT'));
assert(!req.review.items.some(i => i.id === 'LIFECYCLE'));
assert.equal(req.modules.find(m => m.id === 'P-BROADCAST')?.decision, '本轮不展示');
assert.equal(req.modules.find(m => m.id === 'P-MATERIALS')?.decision, '保留');

// 3. Verify app.js & standalone HTML bundles have zero external network dependencies and valid JS syntax
const appJs = read(path.join(out, 'app.js'));
assert(!/\b(fetch|WebSocket|XMLHttpRequest)\s*\(/.test(appJs), 'app.js must not issue network requests');
assert(!/S1\s*·\s*undefined/.test(appJs));
new vm.Script(appJs, { filename: 'app.js' });

for (const bundleName of ['whatsapp-scrm-lifecycle.html', 'whatsapp-replica-ui-fidelity.html']) {
  const standalone = read(path.join(root, 'outputs', bundleName));
  assert(!/<script\b[^>]*\bsrc=|<link\b[^>]*\brel="stylesheet"|chm123\.com/i.test(standalone), `External asset found in ${bundleName}`);
  const scripts = [...standalone.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 5, `Expected 5 inline script blocks in ${bundleName}`);
  for (const s of scripts) new vm.Script(s[1]);
}

// 4. The stage-based modules are gone and nothing in the engagement module still refers to them
for (const removed of ['fidelity-pipelines.js', 'fidelity-pipeline-settings.js']) {
  assert(!fs.existsSync(path.join(__dirname, removed)), `${removed} must not exist`);
}
const moduleSource = read(path.join(__dirname, 'fidelity-lifecycle.js'));
const removedIdentifiers = ['lcPipelines', 'lcDefaultPipeline', 'lcPipeline', 'lcCustomerPipeline', 'lcStageLookup', 'lcDecorate', 'lcStageMeta', 'lcStages', 'lcStageName', 'lcCategory', 'lcIsActive', 'lcIsRecovery', 'lcIsCategory', 'lcRoleStage', 'lcHasRole', 'lcIntakeStage', 'lcReactivateTarget', 'lcLostReasons', 'lcNewId', 'lcChain', 'lcNormalizeCustomer', 'lcStageBadge', 'lcMoney', 'lcDaysBetween', 'lcDwellDays', 'lcDaysUntil', 'lcCustomerQuotes', 'lcCustomerOrders', 'lcCustomerLtv', 'lcOpenQuotesValue', 'lcMatchesRadar', 'lcBoardPipeline', 'lcMatchesFilters', 'lcFilteredCustomers', 'lcCardHTML', 'renderLifecycleTable', 'lcStageMetric', 'lcPipelineTabs', 'renderLifecycle', 'lcTransitionDynamicFields', 'openLifecycleAdvance', 'renderDeals', 'openQuoteModal', 'openOrderModal', 'openOrderStepModal', 'lcFillSmartDraft', 'renderPipelines', 'lcPresetPipelines', 'LC_CATEGORIES', 'LC_CAPTURES', 'LC_METRICS', 'LC_ROLES', 'LC_TASK_TYPES', 'LC_LEGACY_STAGE_IDS', 'taskType', 'lcAdvance', 'lcJumpStage', 'lcJumpRadar', 'lcStageFilter', 'lcRadar', 'lcDealsTab', 'lcQuoteOpen', 'lcQuoteToOrder', 'lcQuoteExpire', 'lcOrderOpen', 'lcOrderStep', 'lcChatDraft', 'lcMode', 'lcResetFilters', 'lcToggleSop'];
for (const name of removedIdentifiers) {
  assert(!new RegExp(`\\b${name}\\b`).test(moduleSource), `fidelity-lifecycle.js still refers to removed identifier ${name}`);
  assert(!new RegExp(`\\b${name}\\b`).test(appJs), `app.js still refers to removed identifier ${name}`);
}

// 5. No lifecycle, funnel or deals wording is left in the UI source of the modules
const removedTerms = ['生命周期', '全周期', '漏斗', '流程配置', '推进阶段', '成交与复购', '报价单', '成交订单', 'LTV', '复购培育', '复购窗口'];
for (const file of ['fidelity-lifecycle.js', 'fidelity-ai.js', 'fidelity-dashboard.js', 'fidelity-ui.js', 'fidelity-customer-pages.js', 'fidelity-openwa.js', 'fidelity-operations.js', 'fidelity-subsite.js', 'fidelity-index.html']) {
  read(path.join(__dirname, file)).split('\n').forEach((line, index) => {
    for (const term of removedTerms) assert(!line.includes(term), `${file}:${index + 1} still mentions "${term}"`);
  });
}

// 6. The engagement loop is wired: two states, four signals, forced choice on completion
for (const required of ['lcMigrateEngagement', 'lcCloseEngagement', 'lcReopenEngagement', 'lcApplyFormTags', "'lc-close-engagement-form'", "'lc-follow-tag-filter-form'", '请填写下次跟进事项和提醒时间，或选择结束跟进。']) {
  assert(moduleSource.includes(required), `fidelity-lifecycle.js is missing ${required}`);
}

// 7. Invitation codes were removed from the prototype (2026-11-17): no wording, helper or filter field is left
const invitationCode = /邀请码|invite/i;
for (const file of ['fidelity-lifecycle.js', 'fidelity-ai.js', 'fidelity-dashboard.js', 'fidelity-ui.js', 'fidelity-customer-pages.js', 'fidelity-openwa.js', 'fidelity-operations.js', 'fidelity-subsite.js', 'fidelity-index.html', 'fidelity.css', 'fidelity-dashboard.css', 'fidelity-lifecycle.css']) {
  read(path.join(__dirname, file)).split('\n').forEach((line, index) => {
    assert(!invitationCode.test(line), `${file}:${index + 1} still refers to invitation codes`);
  });
}
assert(!invitationCode.test(appJs), 'app.js still refers to invitation codes');
for (const bundleName of ['whatsapp-scrm-lifecycle.html', 'whatsapp-replica-ui-fidelity.html']) {
  assert(!read(path.join(root, 'outputs', bundleName)).includes('邀请码'), `${bundleName} still mentions invitation codes`);
}

// 8. Customer tier and status are manual fields, editable from the chat screen and shown in the customer list
for (const required of ["const LC_TIERS = ['S', 'A', 'B', 'C', 'D'];", "['converted', '已成交'", "['abandoned', '弃单'", "['organic', '自然线索'", 'data-lc-tier=', 'data-lc-status=', 'lcCustomerTier:', 'lcCustomerStatusFilter:', 'fidActions.fidExportCustomers =']) {
  assert(moduleSource.includes(required), `fidelity-lifecycle.js is missing ${required}`);
}
assert.equal((moduleSource.match(/lcGradeControls\(c\)\}/g) || []).length, 2, 'tier and status controls must appear in the chat strip and in the dossier');
const customersRecord = req.modules.find(m => m.id === 'P-CUSTOMERS');
assert(customersRecord.features.some(f => f.startsWith('客户等级')) && customersRecord.features.some(f => f.startsWith('客户状态')), 'P-CUSTOMERS must record tier and status');
assert(req.review.items.some(i => i.id === 'CUSTOMER_GRADING'));

// 9. Chat history is an archive of conversation snapshots moved in from the WhatsApp chat; it has no rating and no pass/fail classification
const recordsSource = read(path.join(__dirname, 'fidelity-customer-pages.js'));
for (const required of ['data.chatArchives ??= []', 'function archiveConversation(c, reason)', "fidForms['fid-archive-add-form']", 'fidArchiveRemoveConfirm:']) {
  assert(recordsSource.includes(required), `fidelity-customer-pages.js is missing ${required}`);
}
for (const rating of ['fid-archive-review', 'fid-record-filter-form', 'ARCHIVE_RESULTS', 'archiveResult', '.review', '质检', '合格', '需改进']) {
  assert(!recordsSource.includes(rating), `fidelity-customer-pages.js still contains the chat-history rating (${rating})`);
}
assert(!appJs.includes('质检结论') && !appJs.includes('fid-archive-review'), 'app.js still contains the chat-history rating form');
for (const removed of ['recordsAccounts', 'selectRecordAccount', 'selectRecordContact', 'fidRecordAccount', 'fidRecordContact']) {
  assert(!recordsSource.includes(removed), `fidelity-customer-pages.js still contains the old conversation browser (${removed})`);
}
assert(moduleSource.includes("'fidArchiveOpen'"), 'the chat strip must offer moving the conversation into chat history');
assert(req.modules.some(m => m.id === 'P-CHAT-REVIEW' && m.screens.includes('chat-records')));
assert(req.review.items.some(i => i.id === 'CHAT_REVIEW'));

// 10. AI features go through one integration point that records usage; the AI module carries no commercial wording
const aiSource = read(path.join(__dirname, 'fidelity-ai.js'));
const openwaSource = read(path.join(__dirname, 'fidelity-openwa.js'));
for (const required of ['function aiRun(capabilityId, input, meta = {})', 'function aiRecordUsage(', "id: 'translate.inbound'", "id: 'translate.outbound'", 'function aiTranslateInbound(c, message, sample)', 'function renderAiPage()', 'data-ai-capability=']) {
  assert(aiSource.includes(required), `fidelity-ai.js is missing ${required}`);
}
assert(!/套餐|升级|付费|购买|订阅|充值|额度|计费|价格|定价|试用|会员|解锁|专业版|高级版|优惠|限时/.test(aiSource), 'the AI module must not contain pricing or sales wording');
assert.equal((moduleSource.match(/aiTranslateInbound\(/g) || []).length, 2, 'both incoming-message paths in fidelity-lifecycle.js must translate through the integration point');
assert(openwaSource.includes('aiTranslateInbound('), 'the OpenWA sample chat must translate through the integration point');
for (const direct of ['translated: pair[1]', 'translated: tr,', 'translation: tr,']) {
  assert(!moduleSource.includes(direct), `fidelity-lifecycle.js still writes a translation directly (${direct})`);
}
assert(!openwaSource.includes('text, translated, time'), 'fidelity-openwa.js still writes a translation directly');
assert(appJs.includes("ai:'AI 能力'") && appJs.includes('ai:renderAiPage'), 'the AI page must be routed');
assert(req.modules.some(m => m.id === 'P-AI' && m.screens.includes('ai')));
assert(req.review.items.some(i => i.id === 'AI_HOOKS'));

// 11. Conversation cards in the WhatsApp chat list show the customer's tags
assert(moduleSource.includes('function lcConversationTags(c)') && moduleSource.includes('${lcConversationTags(c)}'), 'conversation cards must show the customer tags');
assert(read(path.join(__dirname, 'fidelity-lifecycle.css')).includes('.conversation-tags {'), 'the tag row on conversation cards needs its styles');
assert(req.modules.find(m => m.id === 'P-INBOX').features.includes('会话卡片显示客户标签'));

const summary = {
  version: req.version,
  status: 'passed',
  checkedAt: new Date().toISOString(),
  projectRoot: path.basename(root),
  historicalBaselineVerified: verifiedBaseline,
  standaloneBundlesVerified: ['whatsapp-scrm-lifecycle.html', 'whatsapp-replica-ui-fidelity.html'],
  engagementStates: ['open', 'closed'],
  attentionSignals: ['reply', 'overdue', 'noplan', 'recontact'],
  deferredModules: ['P-LIFECYCLE', 'P-PIPELINES', 'P-DEALS'],
  invitationCodes: 'removed',
  customerTiers: ['S', 'A', 'B', 'C', 'D'],
  customerStatuses: ['converted', 'abandoned', 'organic'],
  chatHistory: 'archive of moved-in snapshots, no rating',
  aiCapabilities: ['translate.inbound', 'translate.outbound'],
  aiProvider: 'local demo (prepared sample results)',
  conversationCardTags: 'first 3 visible tags, then +N',
  externalNetworkCalls: false,
};
fs.writeFileSync(path.join(out, 'validation.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
