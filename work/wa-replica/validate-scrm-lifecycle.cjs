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

// 3. Verify app.js has zero external network dependencies and valid JS syntax
const appJs = read(path.join(out, 'app.js'));
// The page may call only the AI relay of its own server (/api/ai/*); the relay, not the page, talks to the model service.
assert(!/\b(WebSocket|XMLHttpRequest)\s*\(/.test(appJs), 'app.js must not open sockets or use XMLHttpRequest');
for (const call of appJs.match(/\bfetch\s*\([^)]{0,40}/g) || []) assert(/^fetch\('\/api\/ai\//.test(call), `app.js may only call the AI relay of its own server, found: ${call}`);
assert(!/S1\s*·\s*undefined/.test(appJs));
new vm.Script(appJs, { filename: 'app.js' });

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
for (const required of ['function aiRun(capabilityId, input, meta = {})', 'function aiRecordUsage(', "id: 'translate.inbound'", "id: 'translate.outbound'", 'function aiTranslateInbound(c, message)', 'function renderAiPage()', 'data-ai-capability=']) {
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
assert(!moduleSource.includes('mini-stage'), 'conversation cards must not show the follow-up status chip');
assert(req.modules.find(m => m.id === 'P-INBOX').features.includes('会话卡片显示客户标签'));

// 12. The follow-up labels above an open chat open the follow-up centre on this customer's row
assert.equal((moduleSource.match(/data-action="lcTrackFollow"/g) || []).length, 2, 'both follow-up labels in the chat strip must open the follow-up centre');
assert(moduleSource.includes('lcTrackFollow: id =>') && moduleSource.includes('lcState.followFocus = {'), 'the follow-up centre must open on the customer row');
assert(moduleSource.includes("if (ui.view !== 'followups') lcState.followFocus = null;"), 'the highlighted row must be cleared when the follow-up centre is left');
assert(read(path.join(__dirname, 'fidelity-lifecycle.css')).includes('tr.lc-row-focus td {'), 'the highlighted row needs its style');
assert(req.modules.find(m => m.id === 'P-INBOX').features.includes('协同条的跟进状态与下次跟进可跳转到跟进闭环并定位该客户'));

// 13. Order tracking is a tab of the customer profile: first contact; one block per order with one entry per shipping step; shipping moves by two step buttons along fixed paths
for (const required of ["const LC_SHIPPING = [['pending', '待发货'", "['shipped', '已发货'", "['delivered', '已签收'", "['problem', '异常（退回/丢件）'", "const LC_SHIPPING_NEXT = { pending: 'shipped', shipped: 'delivered' };", "['orders', '订单追踪', lcOrders(c).length]", '<form id="lc-order-form"', "${tabFoot ? `<div class=\"lc-dossier-foot\">${tabFoot}</div>` : ''}", 'function lcSyncDossierFoot() {', "if (scrollTop) $('#dialog .lc-dossier-body').scrollTop = scrollTop;", '?.focus({ preventScroll: true });', "'lc-order-form': (f, v) =>", "shipping: 'pending', history: [{ shipping: 'pending', at: placedAt }] }, ...lcOrders(c)];", 'function lcOrderHistory(o) {', "class=\"lc-card-block lc-order${open ? ' is-open' : ''}\"", "const LC_SHIPPING_PATH = ['pending', 'shipped', 'delivered'];", 'const open = lcState.orderOpen.includes(o.id);', 'lcOrderToggle: (id, btn) =>', 'class="lc-order-toggle" data-action="lcOrderToggle"', '<span class="lc-order-progress ${statusTone}" role="img"', 'o.history = entries;', "'时间未记录'", 'lcOrderShipping: (id, btn) =>', 'data-shipping="problem"', 'lcOrderUndo: (id, btn) =>', 'class="icon-button lc-step-next" data-action="lcOrderShipping"', 'class="icon-button lc-step-problem" data-action="lcOrderShipping"', "title=\"${history.length > 1 ? '撤销上一步' : '暂无可撤销的步骤'}\"", 'if (history.length < 2) return;', '<span class="lc-order-time">下单时间 ${esc(fidDate(o.placedAt))}</span>', 'lcOrderRemove: (id, btn) =>', '首次联系时间', "order: '订单记录'"]) {
  assert(moduleSource.includes(required), `fidelity-lifecycle.js is missing ${required}`);
}
assert(!/orderOpen[^\n]*persist\(|\.open\s*=|\.collapsed\s*=/.test(moduleSource), 'whether an order block is open is view state only and is never stored on an order');
assert(!moduleSource.includes('data-lc-order-shipping') && !moduleSource.includes('name="shipping"') && !moduleSource.includes("v('shipping')"), 'shipping changes only through the two step buttons, and adding an order sets no status');
assert(!moduleSource.includes('data.orders'), 'orders live on the customer (c.orders); data.orders belongs to saved data of the removed deals centre');
assert(read(path.join(__dirname, 'fidelity-lifecycle.css')).includes('.lc-timeline-item.cat-order {'), 'order entries in the interaction timeline need their style');
assert(read(path.join(__dirname, 'fidelity-lifecycle.css')).includes('.lc-dossier-foot {') && read(path.join(__dirname, 'fidelity-lifecycle.css')).includes('bottom: calc(var(--lc-dossier-foot, 0px) + 20px);'), 'the pinned footer of the drawer and the toast above it need their styles');
assert(customersRecord.features.some(f => f.startsWith('订单追踪')), 'P-CUSTOMERS must record order tracking');
assert(req.review.items.some(i => i.id === 'ORDER_TRACKING'));
assert.equal(req.modules.find(m => m.id === 'P-ORDERS')?.decision, '待定', 'connecting a business system stays undecided');

// 14. The translation settings (entry points, action, dialog) were removed from the chat screen on 2026-11-20
const indexHtml = read(path.join(out, 'index.html'));
for (const removed of ['openTranslation', 'data-action="translation"', '翻译与发送偏好', 'id="receive-translation"']) {
  assert(!appJs.includes(removed), `app.js still contains the translation settings (${removed})`);
}
assert(!indexHtml.includes('data-action="translation"') && !indexHtml.includes('fid-header-lang'), 'the top bar must not offer the translation settings');
assert(!moduleSource.includes("'translation'") && !read(path.join(__dirname, 'fidelity-ui.js')).includes("'translation'"), 'no tool rail may offer the translation settings');
assert(aiSource.includes('ui.receiveTranslation = true;'), 'translations of incoming messages must always be shown now that their display switch is gone');
assert(appJs.includes('fid-record-translation'), 'the chat-history page keeps its own translation switch');

// 15. Real translation goes through the server relay; the page falls back to the demo when no relay is configured
const relaySource = read(path.join(__dirname, 'ai-relay.cjs'));
const serveSource = read(path.join(__dirname, 'serve.cjs'));
for (const required of ["server: { name: '服务器中转', run: (capabilityId, input) => capabilityId === 'translate.outbound' ? aiRelayReply(input) : aiRelayTranslate(input) },", "fetch('/api/ai/translate', {", "fetch('/api/ai/status')", 'const providerId = aiRuntime.provider;', "to: aiSettings().readLanguage }", 'data-ai-setting="readLanguage"', 'aiDetectRelay();']) {
  assert(aiSource.includes(required), `fidelity-ai.js is missing ${required}`);
}
for (const required of ['process.env.WA_SCRM_AI_ENV', "Authorization: 'Bearer ' + config.key", 'module.exports = { handle, loadConfig, parseEnv, translationPrompt, replyPrompt };']) {
  assert(relaySource.includes(required), `ai-relay.cjs is missing ${required}`);
}
assert(!/console\.(log|error)\([^\n]*(config\.key|\.text\b(?!\.length)|input\b)/.test(relaySource), 'the relay must not log the key or message text');
assert(serveSource.includes("pathname.startsWith('/api/ai/')") && serveSource.includes('await aiRelay.handle(req, res, pathname);'), 'the preview server must route /api/ai/* to the relay');
assert(fs.existsSync(path.join(__dirname, 'ai-relay.test.cjs')) && fs.existsSync(path.join(__dirname, 'ai.env.example')), 'the relay needs its tests and its example settings file');
assert(!/AI_API_KEY=\S/.test(read(path.join(__dirname, 'ai.env.example'))), 'the example settings file must not contain a key');
assert(!appJs.includes('中文译文</span>') && !appJs.includes('示例译文'), 'translation labels must not claim a fixed language or a sample');

// 16. The reviewer tools are removed: no review panel, requirements page, export, notes tool or notes endpoint
for (const gone of ['openReview', 'renderScope', 'scopeCard', 'exportReq', 'WA_REQUIREMENTS', 'initWAElementReview', 'data-action="review"', 'data-action="export"', "scope:'功能范围'", "renderItem('scope'", 'pending-count', 'review-count']) {
  assert(!appJs.includes(gone), `app.js still contains reviewer-tool code (${gone})`);
}
for (const gone of ['fid-float-review', 'fid-header-review', 'element-review', 'requirements-data.js', 'data-action="review"']) {
  assert(!indexHtml.includes(gone), `index.html still contains a reviewer tool (${gone})`);
}
for (const file of [path.join(out, 'element-review.js'), path.join(out, 'requirements-data.js'), path.join(__dirname, 'element-review.js'), path.join(__dirname, 'review-prompt-format.js')]) {
  assert(!fs.existsSync(file), `${path.basename(file)} must not exist`);
}
assert(!/review-prompts|promptFormat|saveReviewPrompt/.test(serveSource), 'the preview server must not offer the notes endpoint');
assert(fs.existsSync(path.join(out, 'requirements.json')), 'the requirement records stay as a build-time record');

// 17. Typed replies are translated through the relay with tone, business description and chat context; send guard
for (const required of ["fetch('/api/ai/reply', {", 'function aiTranslateDraft(c, text)', 'function aiGuardActive(c)', 'function aiGuardNeutral(text)', 'function aiDraftHint(c)', 'function aiEnterHint(c)', 'function aiGuardHTML(c)', 'const aiOldSend = send;', 'data-ai-setting="tone"', 'data-ai-setting="business"', 'data-ai-setting="sendGuard"']) {
  assert(aiSource.includes(required), `fidelity-ai.js is missing ${required}`);
}
for (const required of ["const ACTIONS = { '/api/ai/translate': ['translate', translate], '/api/ai/reply': ['reply', reply] };", 'function replyPrompt({ to, tone, business })', 'const MAX_CONTEXT_MESSAGES = 6;']) {
  assert(relaySource.includes(required), `ai-relay.cjs is missing ${required}`);
}
for (const required of ["aiDraftHint(c)+'</span>'+aiGuardHTML(c)+'</div><button class=\"send-button\"", "icon('Keyboard')+aiEnterHint(c)+'</span>"]) {
  assert(appJs.includes(required), `the message box must take its hint, guard switch and Enter line from the AI module (${required})`);
}
assert(!appJs.includes("'发送译文':'发送原文'"), 'the fixed hint texts of the baseline must be replaced');

// 18. No demo provider and no prepared sample translations: translations come from the model service only
assert(!/本地演示|sample|demo/.test(aiSource), 'the AI module must not contain a demo provider or sample results');
assert(aiSource.includes("if (!settings.enabled[capabilityId] || !aiRuntime.provider) return Promise.resolve({ ok: false, text: '', skipped: true });"), 'without a model service no capability may run');
for (const source of [moduleSource, openwaSource]) {
  assert(!/aiTranslateInbound\([^()]*,[^()]*,[^()]*\)/.test(source), 'callers must not hand a prepared translation to the AI module');
}

// 19. Server side of a sub-site: accounts, sessions and data behind WA_SCRM_DATA_DIR; the relay behind sign-in
const siteSources = Object.fromEntries(['site-auth.cjs', 'site-data.cjs', 'site-api.cjs', 'site-admin.cjs', 'site-api.test.cjs'].map(name => [name, read(path.join(__dirname, name))]));
for (const required of ['crypto.scrypt(', 'crypto.timingSafeEqual(', "crypto.createHash('sha256')", 'const LOCK_AFTER = 5;']) {
  assert(siteSources['site-auth.cjs'].includes(required), `site-auth.cjs is missing ${required}`);
}
for (const required of ["if (baseVersion !== current) throw problem('version-conflict', { version: current });", "db.exec('BEGIN IMMEDIATE');"]) {
  assert(siteSources['site-data.cjs'].includes(required), `site-data.cjs is missing ${required}`);
}
for (const required of ['Path=/; HttpOnly; SameSite=Lax;', "req.headers['sec-fetch-site'] === 'cross-site'", "if (!mayWrite(user)) throw problem('read-only');"]) {
  assert(siteSources['site-api.cjs'].includes(required), `site-api.cjs is missing ${required}`);
}
for (const [name, source] of Object.entries(siteSources)) {
  if (name.endsWith('.test.cjs')) continue;
  assert(!/console\.(log|error)\([^\n]*\$\{[^}]*(password|token|body|json)\b/i.test(source.replace(/temporary password: \$\{password\}/g, '')), `${name} must not log a password, a token or data`);
}
assert(serveSource.includes("if (site && !site.allows(req)) {") && serveSource.includes('process.env.WA_SCRM_DATA_DIR'), 'the preview server must put the relay behind sign-in when it keeps accounts');
// The page's start-up script talks to the account and data routes only (the app itself to the AI relay only, section 3).
const bootSource = read(path.join(__dirname, 'fidelity-boot.js'));
for (const call of bootSource.match(/request\('[^']*'/g) || []) assert(/^request\('\/api\/(site\/status|auth\/(session|login|logout|password)|data)'$/.test(call), `fidelity-boot.js calls an unexpected address: ${call}`);
assert(!/\bfetch\s*\(\s*['"`]/.test(bootSource), 'fidelity-boot.js must send every request through its request helper');

// 20. The page signs in and keeps its data on the server; no fictional data set is shipped or loaded
for (const required of ['window.WA_START = () => {', 'let data=window.WA_SITE.data;', 'window.WA_SITE.save(data)', "const UI_KEY=KEY+':'+window.WA_SITE.user.username;"]) {
  assert(appJs.includes(required), `app.js is missing ${required}`);
}
assert(!/clone\(window\.WA_DEMO\)|case 'resetDemo'|case 'confirmReset'|subsiteEnterDemo/.test(appJs), 'the app must not start from, or reset to, sample data');
for (const required of ['id="site-sign-in"', 'id="site-password"', '<script src="boot.js"></script>']) {
  assert(indexHtml.includes(required), `index.html is missing ${required}`);
}
assert(!indexHtml.includes('demo-data.js') && !indexHtml.includes('进入演示工作台') && !fs.existsSync(path.join(out, 'demo-data.js')), 'the page must not ship the fictional data set');
assert.equal(read(path.join(out, 'boot.js')), bootSource, 'boot.js must be the built copy of fidelity-boot.js');
for (const required of ["request('/api/data', { method: 'PUT'", 'window.WA_START();']) {
  assert(bootSource.includes(required), `fidelity-boot.js is missing ${required}`);
}
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
assert(siteSources['site-api.cjs'].includes('process.umask(0o077);') && siteSources['site-admin.cjs'].includes('process.umask(0o077);'), 'the files of the data folder must be created private');

// 21. Leftovers of the prototype are gone: sample-content code, single-file bundles, the Windows launcher
for (const [name, gone] of [['fidelity-lifecycle.js', 'lcSeededV06'], ['fidelity-lifecycle.js', 'lcSeededOrders'], ['fidelity-ui.js', 'fidRemovePresetTags'], ['fidelity-ui.js', 'WA_DEMO'], ['fidelity-customer-pages.js', 'seedChatArchives'], ['fidelity-operations.js', 'ops-material-1'], ['fidelity-boot.js', 'lcSeededV06']]) {
  assert(!read(path.join(__dirname, name)).includes(gone), `${name} still contains ${gone}`);
}
assert(!appJs.includes('WA_DEMO'), 'the app must not refer to the fictional data set');
for (const file of [path.join(root, 'outputs', 'whatsapp-scrm-lifecycle.html'), path.join(root, 'outputs', 'whatsapp-replica-ui-fidelity.html'), path.join(root, '启动SCRM原型预览.cmd')]) {
  assert(!fs.existsSync(file), `${path.basename(file)} must not exist`);
}
assert(!/standalone/.test(read(path.join(__dirname, 'build-fidelity.cjs'))), 'the build must not write single-file bundles');

const summary = {
  version: req.version,
  status: 'passed',
  checkedAt: new Date().toISOString(),
  projectRoot: path.basename(root),
  historicalBaselineVerified: verifiedBaseline,
  engagementStates: ['open', 'closed'],
  attentionSignals: ['reply', 'overdue', 'noplan', 'recontact'],
  deferredModules: ['P-LIFECYCLE', 'P-PIPELINES', 'P-DEALS'],
  invitationCodes: 'removed',
  customerTiers: ['S', 'A', 'B', 'C', 'D'],
  customerStatuses: ['converted', 'abandoned', 'organic'],
  chatHistory: 'archive of moved-in snapshots, no rating',
  aiCapabilities: ['translate.inbound', 'translate.outbound'],
  aiProvider: 'server relay to an OpenAI-compatible model service (key stays on the server); without it no AI capability runs',
  pageNetworkCalls: 'own server only: /api/ai/status, /api/ai/translate, /api/ai/reply',
  replyTranslation: 'typed replies and quick replies go to /api/ai/reply with tone, business description and the last six messages; send guard on by default: first Enter translates, second Enter sends',
  conversationCardTags: 'first 3 visible tags, then +N; no follow-up status chip',
  chatStripFollowLink: 'status and next-follow-up labels open the follow-up centre on the customer row',
  orderTracking: 'profile tab: first contact; one block per order, collapsed by default, head with number, time placed, a three-segment progress bar in the colour of the status and icon buttons (next step, exception, undo, remove); open: one entry per shipping step reached; the order form is pinned to the bottom of the drawer',
  translationSettings: 'removed from the chat screen (tool rail, top bar, narrow-screen menu, dialog); sample translations stay and are always shown, switched per capability on the AI page',
  reviewerTools: 'removed: review panel and its two buttons, requirements page and export, element notes tool and its server endpoint; requirements.json stays as a build-time record',
  serverSide: 'behind WA_SCRM_DATA_DIR: accounts with scrypt password hashes, sign-in sessions, one sub-site data document in SQLite, AI relay for signed-in users only',
  signIn: 'the page opens on a sign-in screen, loads the sub-site data from the server and saves changed parts back; the browser keeps only drafts and open tabs; a new sub-site starts empty',
  leftovers: 'removed: code that added sample customers, orders, archive entries and a sample material; the single-file bundles; the Windows launcher of the old preview',
  externalNetworkCalls: false,
};
fs.writeFileSync(path.join(out, 'validation.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
