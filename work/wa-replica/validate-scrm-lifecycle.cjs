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
// The page may call only its own server: the AI relay (/api/ai/*) and the link to OpenWA (/api/wa/*). The server,
// not the page, talks to the model service and to OpenWA.
assert(!/\b(WebSocket|XMLHttpRequest)\s*\(/.test(appJs), 'app.js must not open sockets or use XMLHttpRequest');
for (const call of appJs.match(/\bfetch\s*\([^)]{0,40}/g) || []) assert(/^fetch\('\/api\/(ai|wa)\//.test(call), `app.js may only call the AI relay and the OpenWA link of its own server, found: ${call}`);
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

// 6. The engagement loop is wired: two states, forced choice on completion. The follow-up centre lists what
// people entered by hand: it has no tab of signals the system works out; the dashboard's status chips open the
// customer list.
for (const gone of ["subtab('signals'", "tab === 'signals'", 'lcSignalDefs', 'lc-signals-table', 'lcState.signal', 'title="待处理信号"']) {
  assert(!moduleSource.includes(gone), `fidelity-lifecycle.js still has the tab of pending signals (${gone})`);
}
for (const required of ["const tab = ['todo', 'closed', 'history'].includes(lcState.followTab) ? lcState.followTab : 'todo';", "lcJumpSignal: id => { lcState.customerHealthFilter = id; ui.pages.customers = 0; navigate('customers'); },", 'if (!h.closed && !task) return openFollowup(c.id);', 'const late = myTasks().filter(t => !t.done && beforeToday(t.due)).length;']) {
  assert(moduleSource.includes(required), `fidelity-lifecycle.js is missing ${required}`);
}
for (const required of ['lcMigrateEngagement', 'lcCloseEngagement', 'lcReopenEngagement', 'lcApplyFormTags', "'lc-close-engagement-form'", "'lc-follow-tag-filter-form'", '请填写下次跟进事项和提醒时间，或选择结束跟进。']) {
  assert(moduleSource.includes(required), `fidelity-lifecycle.js is missing ${required}`);
}

// A to-do can be deleted by hand from the queue, after a confirmation.
for (const required of ["${fidIcon('删除待办：' + t.title, 'lcTaskDelete', 'Trash2', t.id)}", "fidConfirm('删除待办', `删除待办「${t.title}」？删除后不能恢复。`, 'lcTaskDeleteDo', id);", 'data.tasks = data.tasks.filter(x => x !== t);', "c.followup = lcNextTask(c.id)?.due || null;"]) {
  assert(moduleSource.includes(required), `fidelity-lifecycle.js is missing ${required}`);
}

// A follow-up that was ended by hand can be removed by hand from the list of ended follow-ups.
for (const required of ["${fidIcon('移除已结束的跟进：' + c.name, 'lcClosedRemove', 'Trash2', c.id)}", "'lcClosedRemoveDo', id);", "c.engagement = 'open';\n      delete c.closedReason;\n      delete c.closedAt;", "toast('已移除，该客户不再显示跟进信息。');"]) {
  assert(moduleSource.includes(required), `fidelity-lifecycle.js is missing ${required}`);
}

// A customer has a follow-up status only where a person made one (an unfinished to-do, or a follow-up ended by
// hand). Nothing works out a status for the other customers, and the status "no to-do planned" is gone.
for (const gone of ['跟进断档', 'noPlan', "'noplan'", '尚未安排跟进', '立即补排跟进', "let primary = { key: 'healthy'"]) {
  assert(!moduleSource.includes(gone), `fidelity-lifecycle.js still works out a follow-up status for a customer nobody planned one for (${gone})`);
  assert(!appJs.includes(gone), `app.js still works out a follow-up status for a customer nobody planned one for (${gone})`);
}
for (const required of ['const planned = !closed && Boolean(nextTask);', 'const awaitingReply = planned && c.unread > 0;', "let primary = planned ? { key: 'healthy', label: '跟进正常', tone: 'ok', icon: 'BadgeCheck' } : null;", "${h.primary ? `<button type=\"button\" class=\"lc-pill lc-pill-link ${h.primary.tone}\" data-action=\"lcTrackFollow\"", "lcHealth(c).primary?.label || ''", 'const plannedCount = customers.filter(c => lcHealth(c).planned).length;']) {
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
assert.equal((moduleSource.match(/aiTranslateInbound\(/g) || []).length, 0, 'fidelity-lifecycle.js no longer creates incoming messages; the feed in fidelity-openwa.js does');
assert(openwaSource.includes('aiTranslateInbound(c, message)'), 'incoming messages of the feed must translate through the integration point');
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
for (const required of ["server: { name: '服务器中转', run: (capabilityId, input) => capabilityId === 'voice.transcribe' ? aiRelayTranscribe(input) : capabilityId === 'translate.outbound' ? aiRelayReply(input) : aiRelayTranslate(input) },", "fetch('/api/ai/translate', {", "fetch('/api/ai/status')", 'const providerId = aiRuntime.provider;', "to: aiSettings().readLanguage }", 'data-ai-setting="readLanguage"', 'aiDetectRelay();']) {
  assert(aiSource.includes(required), `fidelity-ai.js is missing ${required}`);
}
for (const required of ['process.env.WA_SCRM_AI_ENV', "Authorization: 'Bearer ' + config.key", 'module.exports = { handle, loadConfig, loadVoiceConfig, parseEnv, transcribeAudio, translationPrompt, replyPrompt };', "gemini: { name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-3.5-transcribe', native: 'gemini' },", "headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.key }", "const REASONING_EFFORTS = ['none', 'minimal', 'low', 'medium', 'high'];", '...(config.reasoning ? { reasoning_effort: config.reasoning } : {}),', 'if (bytes.length > (gemini ? GEMINI_VOICE_MAX : MAX_VOICE_BYTES)) throw failure(413, \'too-long\');']) {
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
// A message is translated once. The page keeps the translation on the message with the language it was made
// for and asks only for the messages of the conversation on screen that are not marked; the relay keeps every
// translation it has made and gives it again; an answer from that store is no call to the model service.
for (const required of ['const aiWantsTranslation = (message, language) => aiTranslatable(message) && !aiAsked.has(message.id)', '&& (message.translatedTo ? message.translatedTo !== language : !message.translated);', 'message.translatedTo = language;', 'function aiTranslateConversation(c) {', 'if (c) aiTranslateConversation(c);', 'if (!kept) aiRecordUsage(capabilityId, providerId, input, result, meta);', 'const AI_TRANSLATE_AT_ONCE = 2;']) {
  assert(aiSource.includes(required), `fidelity-ai.js is missing ${required}`);
}
assert.equal((aiSource.match(/aiRun\('translate\.inbound'/g) || []).length, 2, 'messages are translated in one place (the line), the words of a voice note in another');
for (const required of ["...(outgoing === text ? { translatedTo: aiSettings().readLanguage } : {}) };", "if (!e.history && e.type === 'text' && e.text) aiTranslateInbound(c, message);", 'delete m.translatedTo;']) {
  assert(openwaSource.includes(required), `fidelity-openwa.js is missing ${required}`);
}
for (const required of ["new DatabaseSync(path.join(dir, 'ai-translations.db'))", "const translationKey = (to, text) => crypto.createHash('sha256').update(to + '\\n' + text).digest('hex');", "if (typeof known === 'string') return { text: known, inputChars: text.length, cached: true };", 'store?.put(key, translated);']) {
  assert(read(path.join(__dirname, 'ai-relay.cjs')).includes(required), `ai-relay.cjs is missing ${required}`);
}
assert(appJs.includes('m.translated&&showTranslation?') && !appJs.includes("m.side==='in'&&m.translated"), 'a translation must be shown below a message of either side');
const bootSource = read(path.join(__dirname, 'fidelity-boot.js'));
for (const call of bootSource.match(/request\('[^']*'/g) || []) assert(/^request\('\/api\/(site\/(status|report)|auth\/(session|login|logout|password)|data)'$/.test(call), `fidelity-boot.js calls an unexpected address: ${call}`);
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
for (const required of ["request('/api/data', { method: 'PUT'", 'window.WA_START();', 'const SAVE_PART = 256 * 1024;', 'if (size && size + json.length > SAVE_PART) {', "const order = key => (key === 'waCursor' ? 2 : key.includes('/') ? 1 : 0);", 'answer.status === 413 ?']) {
  assert(bootSource.includes(required), `fidelity-boot.js is missing ${required}`);
}
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// A customer made by hand (新增客户) starts with an empty conversation (plan 076): without a list of its own, the
// conversation showed the 初步需求 as a message from the customer, and the first message sent saved it so.
assert(moduleSource.includes("      data.customers.unshift(c);\n      // A customer made by hand starts with an empty conversation (plan 076)") && moduleSource.includes("      data.messages[id] = [];\n      lcLog(id, 'profile', '手动建档');\n") && appJs.includes("      data.messages[id] = [];\n      lcLog(id, 'profile', '手动建档');\n"), 'a customer made by hand must start with an empty conversation');
// A reply whose outcome is open (结果待确认: the page was closed while it was on its way, or the answer was lost) is
// matched with its copy from the WhatsApp feed like a reply still on its way, so that it does not show twice (plan 075).
for (const required of ["(m.wa ? m.wa === e.id : ['sending', 'unknown'].includes(m.status) && m.text === e.text)", "const mine = list.find(m => m.side === 'out' && !m.wa && ['sending', 'unknown'].includes(m.status) && m.text === e.text);"]) {
  assert(openwaSource.includes(required) && appJs.includes(required), 'a reply whose outcome is open must be matched with its copy from the feed: ' + required.slice(0, 60));
}
assert(!openwaSource.includes("m.status === 'sending' && m.text === e.text"), 'no copy from the feed may be matched with replies on their way only');
// The WhatsApp feed starts also when its first questions fail (plan 074): the server's state and the feed for this page
// are asked again, more slowly each time, until they are answered; an ended session stops the page, as in the loop.
for (const required of ["      status = await openwaCall('GET', 'status');\n      if (status.status === 200) break;\n      if (window.WA_SITE.halted()) return;\n      if (status.status === 401) return window.WA_SITE.halt('登录已失效', '请刷新页面后重新登录。');\n      failures += 1;\n      await openwaWait(Math.min(30000, 1000 * 2 ** failures));\n", "      const claim = await openwaCall('POST', 'claim', { client: openwaClient });\n      if (claim.status === 200) break;\n      if (window.WA_SITE.halted()) return;\n      if (claim.status === 401) return window.WA_SITE.halt('登录已失效', '请刷新页面后重新登录。');\n      if (!failures) render();\n      failures += 1;\n      await openwaWait(Math.min(30000, 1000 * 2 ** failures));\n"]) {
  assert(openwaSource.includes(required) && appJs.includes(required), 'the WhatsApp feed must ask its first questions again until they are answered: ' + required.split('\n')[0].trim());
}
assert(!openwaSource.includes("    if (status.status !== 200) return;\n") && !openwaSource.includes(".status !== 200) return render();\n"), 'a failed first question must not end the WhatsApp feed for good');
// A number still linked to WhatsApp is not removed from the account list (plan 073): it goes on receiving, and every
// message for a number the page no longer knows would be dropped for good. 移除账号 asks to unlink it first.
assert(read(path.join(__dirname, 'fidelity-ui.js')).includes("if(selected.some(a=>a.linked))return toast('选中的账号仍绑定着 WhatsApp，请先在号码管理中解除绑定。');fidConfirm('移除账号',") && appJs.includes("if(selected.some(a=>a.linked))return toast('选中的账号仍绑定着 WhatsApp，请先在号码管理中解除绑定。');fidConfirm('移除账号',") && appJs.includes('fidDoAccountDelete:()=>{const selected=fidSelectedAccounts().filter(a=>!a.linked&&!data.customers.some(c=>c.account===a.id));'), 'a number that is still linked must not be removed from the account list');
// A stopped page stays stopped (plan 072): drawing the app again would hide the notice while every later change is
// thrown away unsaved, so the drawing asks first whether the page was stopped, and the WhatsApp feed is read no more.
const subsiteSource = read(path.join(__dirname, 'fidelity-subsite.js'));
assert(subsiteSource.includes("  function renderSignInState() {\n    // A stopped page") && subsiteSource.includes("    if (window.WA_SITE.halted()) return false;\n    $('#app-shell').hidden = false;\n") && appJs.includes("    if (window.WA_SITE.halted()) return false;\n    $('#app-shell').hidden = false;\n"), 'drawing the app must leave the notice of a stopped page in place');
assert(openwaSource.includes("&wait=${caughtUp ? 25 : 0}`);\n      // A page that was stopped (fidelity-boot.js) reads no further") && openwaSource.includes('      if (window.WA_SITE.halted()) return;\n') && appJs.includes('      if (window.WA_SITE.halted()) return;\n'), 'a stopped page must read no more of the WhatsApp feed');
// A conversation at its end stays at its end when a translation redraws it (plan 071): the redraw scrolls there with
// the WhatsApp module's own step, which notes the move, so that a picture taking its height a moment later keeps it
// there instead of reading as someone scrolling away.
assert(aiSource.includes('    if (atBottom) openwaShowEnd();\n') && appJs.includes('    if (atBottom) openwaShowEnd();\n') && !aiSource.includes('if (atBottom) scrollMessages();'), 'a redraw by a translation must keep the end in view the way the WhatsApp module does');
// The chat's tool rail has no permissions note any more (plan 070): neither the shield button "权限说明" nor its
// dialog "会话权限"; the rail keeps its other buttons.
assert(!appJs.includes('fidChatPermissions') && !appJs.includes('会话权限') && !appJs.includes('权限说明'), 'the permissions note must be gone from the chat\'s tool rail');
assert(appJs.includes("${t('刷新视图', 'refreshUI', 'RefreshCw')}\n    </aside>`;"), 'the tool rail must end with the button that refreshes the view');
// Every emoji drawn the same way on every computer (plan 068): the eleven parts of Noto Color Emoji (SIL OFL 1.1) and
// its licence are shipped as they are and copied by the build; the page's style sheet names each part with its
// characters and the colour format it needs, after the fonts of the text; the server sends the parts as fonts the
// browser keeps.
const emojiFontDir = path.join(__dirname, 'fonts');
const emojiParts = Array.from({ length: 11 }, (_, n) => `noto-color-emoji-v50-${n}.woff2`);
const emojiFiles = [...emojiParts, 'noto-color-emoji-OFL.txt'].sort();
assert.deepEqual(fs.readdirSync(emojiFontDir).sort(), emojiFiles, 'work/wa-replica/fonts must hold the eleven parts of the emoji font and its licence');
assert.deepEqual(fs.readdirSync(path.join(out, 'fonts')).sort(), emojiFiles, 'the built fonts folder must hold the same files');
for (const file of emojiFiles) assert(fs.readFileSync(path.join(out, 'fonts', file)).equals(fs.readFileSync(path.join(emojiFontDir, file))), `fonts/${file} must be the built copy`);
assert(read(path.join(emojiFontDir, 'noto-color-emoji-OFL.txt')).includes('SIL Open Font License, Version 1.1'), 'the licence of the emoji font must be shipped');
const builtCss = read(path.join(out, 'app.css'));
for (const file of emojiParts) assert(builtCss.includes(`src:url("fonts/${file}") format("woff2") tech(color-COLRv1); unicode-range:U+`), `app.css must name ${file}`);
assert.equal((builtCss.match(/font-family:"SCRM Emoji"/g) || []).length, 11, 'app.css must have the eleven parts of the emoji font');
assert(builtCss.includes('font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei","SCRM Emoji",sans-serif;'), 'the emoji font must come after the fonts of the text');
for (const required of ["'.woff2': 'font/woff2',", "'Cache-Control': pathname.startsWith('/fonts/') && pathname.endsWith('.woff2') ? 'public, max-age=31536000, immutable' : 'no-cache',"]) {
  assert(read(path.join(__dirname, 'serve.cjs')).includes(required), `serve.cjs is missing ${required}`);
}
// A page whose saving goes wrong keeps trying and says so (plan 067): every save has a time limit, a guard catches
// whatever goes wrong in the save, a save counts only with the new version in the answer, and the server's log is
// told once for each kind of trouble — with the first plain words of the error, never data.
for (const required of ['const SAVE_TIMEOUT = 30000;', '...(timeout ? { signal: AbortSignal.timeout(timeout) } : {})', "request('/api/data', { method: 'PUT', keepalive, timeout: SAVE_TIMEOUT,", "request('/api/data', { method: 'DELETE', timeout: SAVE_TIMEOUT,", "if (answer.status === 200 && typeof answer.body.version === 'number') {", 'async function flush(options) {', "tell('error', 0, error);", "tell(answer.error?.name === 'TimeoutError' ? 'timeout' : answer.status ? 'refused' : 'unreachable', answer.status, answer.error);"]) {
  assert(bootSource.includes(required), `fidelity-boot.js is missing ${required}`);
}
for (const required of ["const REPORT_KINDS = ['timeout', 'unreachable', 'refused', 'error'];", "'POST /api/site/report': async req => {", 'console.error(`site page save failed user=${user.username} site=${user.site || \'-\'} kind=${kind} status=${status ?? \'-\'} error=${words}`);']) {
  assert(read(path.join(__dirname, 'site-api.cjs')).includes(required), `site-api.cjs is missing ${required}`);
}
// The supervisor page: master.js is the built copy of fidelity-master.js and is loaded before boot.js, which hands
// a supervisor or an administrator over to it. The page only reads: the addresses it asks are these, each of a
// sub-site under the sub-site's name, and its one request that is not a GET signs out.
const masterSource = read(path.join(__dirname, 'fidelity-master.js'));
assert.equal(read(path.join(out, 'master.js')), masterSource, 'master.js must be the built copy of fidelity-master.js');
assert(indexHtml.includes('<main id="master" class="fid-master" aria-label="主管视图" hidden></main>') && indexHtml.includes('<script src="app.js"></script><script src="master.js"></script><script src="boot.js"></script>'), 'index.html must hold the supervisor page and load master.js before boot.js');
assert(bootSource.includes("if (user.role !== 'agent') {") && bootSource.includes('return window.WA_MASTER(user);') && !bootSource.includes('主管与管理员入口尚未开放'), 'fidelity-boot.js must hand a supervisor over to the supervisor page');
assert.deepEqual([...new Set(masterSource.match(/'\/api\/[^']*'/g))].sort(), ["'/api/auth/logout'", "'/api/auth/sites'", "'/api/auth/users'", "'/api/auth/users/disable'", "'/api/auth/users/enable'", "'/api/auth/users/remove'", "'/api/auth/users/reset'", "'/api/data'", "'/api/data?fields=accounts,customers,tasks'", "'/api/wa/media?account='", "'/api/wa/status'"], 'the supervisor page asks an unexpected address');
// What the page changes goes through one helper, and only to the addresses of accounts and of signing out —
// never to a sub-site, which it only reads.
assert.deepEqual(masterSource.match(/method: '[A-Z]+'/g), ["method: 'POST'"], 'the supervisor page must send its changes through one helper');
assert.deepEqual([...new Set(masterSource.match(/\bpost\([^,]+,/g))].sort(), ["post('/api/auth/logout',", "post('/api/auth/users',", "post('/api/auth/users/remove',", "post('/api/auth/users/reset',", "post(on ? '/api/auth/users/enable' : '/api/auth/users/disable',"], 'the supervisor page must change accounts only, and sign out');
assert(masterSource.includes("const at = (site, path) => '/site/' + encodeURIComponent(site) + path;") && !/fetch\(at\(/.test(masterSource), 'the supervisor page must ask each sub-site under its own name, and only ask');
for (const required of ["'GET /api/auth/users': req => {", "'POST /api/auth/users': async req => {", "if (body.role !== 'supervisor' && !(body.role === 'agent' && workspaces)) throw problem('invalid-role');", "if (target.username === actor.username) throw problem('own-account');", "if (target.role === 'admin' && actor.role !== 'admin') throw problem('forbidden');", 'console.log(`site account created by=${actor.username} user=${user.username} role=${user.role}`);']) {
  assert(siteSources['site-api.cjs'].includes(required), `site-api.cjs is missing ${required}`);
}
assert(siteSources['site-auth.cjs'].includes('async function createUser({ username, name, role, site = null, password, mustChange = true }) {'), 'an account made with a given password must be able to keep it');
// The platform in containers. The server listens where it is told to. The provisioner is the one part that talks
// to Docker: it checks the shared secret before anything else, takes nothing but the id of a sub-site from a
// request, and makes containers after its own fixed recipe. The images are pinned; only the gateway is published,
// and only the provisioner has the Docker socket.
const provisionerSource = read(path.join(__dirname, 'site-provisioner.cjs')), deploy = name => read(path.join(__dirname, '../../deploy', name));
assert(read(path.join(__dirname, 'serve.cjs')).includes("server.listen(port, process.env.WA_SCRM_LISTEN || '127.0.0.1', () => {"), 'the server must listen on this machine only unless it is told otherwise');
assert(provisionerSource.includes("if (given.length !== secret.length || !crypto.timingSafeEqual(given, secret)) throw problem('not-allowed');") && provisionerSource.indexOf("throw problem('not-allowed')") < provisionerSource.indexOf('const route = routes['), 'the provisioner must check the shared secret before it looks at what is asked');
assert.deepEqual([...new Set(provisionerSource.match(/(?<![.\w])body\.[A-Za-z]+/g))], ['body.id'], 'the provisioner must take nothing but the id of a sub-site from a request');
assert(provisionerSource.includes("const SITE_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;") && provisionerSource.includes("const RESERVED = ['master', 'gateway', 'provisioner'];") && provisionerSource.includes("const known = id => { if (typeof id !== 'string' || !SITE_ID.test(id) || RESERVED.includes(id)) throw problem('invalid-request'); return id; };"), 'the provisioner must accept only the id of a sub-site');
assert(!/child_process|execSync|spawn\(/.test(provisionerSource), 'the provisioner must talk to the Docker Engine only, and run no command itself');
assert(/^FROM node:24-slim@sha256:[0-9a-f]{64}$/m.test(deploy('Dockerfile')) && deploy('Dockerfile').includes('USER 1000:1000'), 'the image of the servers must be built on a pinned base and run as an ordinary user');
const compose = deploy('compose.yml');
assert.deepEqual([compose.split('/var/run/docker.sock:/var/run/docker.sock').length - 1, compose.split('\n    ports:').length - 1, compose.includes("      - '${WA_SCRM_PORT:-8141}:8141'"), /image: nginx:[0-9.]+-alpine@sha256:[0-9a-f]{64}\n/.test(compose)], [1, 1, true, true], 'only the provisioner may have the Docker socket, only the gateway a published port, and the gateway image must be pinned');
for (const required of ['resolver 127.0.0.11 valid=5s ipv6=off;', 'location ~ ^/site/(?<scrm_named>[a-z0-9][a-z0-9-]*)/api/(data$|wa/) {', 'if ($scrm_cookie_site != "") { set $scrm_upstream "wa-scrm-site-$scrm_cookie_site"; }', 'proxy_connect_timeout 3s;']) {
  assert(deploy('gateway.conf').includes(required), `deploy/gateway.conf is missing ${required}`);
}
// What the review of these files found, held: the provisioner asks for the secret before it reads the address,
// is busy with a sub-site while it stops it, and leaves no volume behind for a container it could not make; the
// server refuses an address that it and a gateway read differently; the gateway keeps nothing in memory that is
// sent up, logs no query string, passes no delivery of OpenWA from outside; the upgrade script knows a sub-site
// by its OpenWA and touches none while the provisioner is not there; a machine can set what it must.
assert(provisionerSource.indexOf("throw problem('not-allowed')") < provisionerSource.indexOf("new URL(req.url, 'http://localhost')"), 'the provisioner must check the shared secret before it reads the address');
assert(provisionerSource.includes("work.set(id, 'stopping');") && provisionerSource.includes("if (fresh) await docker('DELETE', `/volumes/${n.volume}`).catch(() => {});") && provisionerSource.includes("const volume = ok(await docker('GET', `/volumes/${n.volume}`), 200, 404), fresh = volume.status === 404;") && !/Number\(env\.WA_SCRM_[A-Z_]+\) \|\|/.test(provisionerSource), 'the provisioner must be busy while it stops a sub-site, take away a volume it made for nothing, and take a 0 among its settings as meant');
assert(serveSource.includes("const raw = req.url.split('?')[0];") && serveSource.includes('|%2f|%5c|') && serveSource.includes("raw.split('/').some(part => ") && serveSource.includes(".test(part))) return sendJson(res, 400, { error: 'invalid-request' });"), 'the server must refuse an address that a gateway could read differently: a backslash, an encoded slash or backslash, an empty part, a part of dots');
for (const required of ['proxy_request_buffering off;', 'proxy_max_temp_file_size 0;', 'if ($request_uri ~* "^[^?]*(\\x5c|%2f|%5c|//|/(\\.|%2e){1,2}(/|\\?|$))") { return 400; }', 'location = /api/wa/hook { return 404; }', 'location ~ ^/site/[a-z0-9][a-z0-9-]*/api/wa/hook$ { return 404; }', 'access_log /dev/stdout plain;', 'client_max_body_size 16k;']) {
  assert(deploy('gateway.conf').includes(required), `deploy/gateway.conf is missing ${required}`);
}
assert(!/log_format[^;]*\$(request|request_uri|args|query_string)\b/.test(deploy('gateway.conf')), 'the gateway must not write a query string into its log');
// A lighter page (plan 069): the gateway compresses what goes out as text, also through a proxy or a VPN; the server
// lets the browser keep the page's files and answers an empty 304, by a tag of their content, when they did not
// change — a weak tag from a compressing gateway counts the same.
for (const required of ['gzip on;', 'gzip_proxied any;', 'gzip_vary on;', 'gzip_types text/css application/javascript application/json text/plain;']) {
  assert(deploy('gateway.conf').includes(required), `deploy/gateway.conf is missing ${required}`);
}
for (const required of ["const tag = '\"' + crypto.createHash('sha256').update(body).digest('base64url').slice(0, 32) + '\"';", "if (String(req.headers['if-none-match'] || '').split(',').some(asked => asked.trim().replace(/^W\\//, '') === tag)) {", 'res.writeHead(304, kept);']) {
  assert(read(path.join(__dirname, 'serve.cjs')).includes(required), `serve.cjs is missing ${required}`);
}
assert(deploy('upgrade.sh').includes("docker ps -a --filter label=wa-scrm.part=openwa --format") && deploy('upgrade.sh').includes('healthy || { echo "the provisioner is not healthy: the sub-sites are left as they are" >&2; exit 1; }') && deploy('upgrade.sh').indexOf('healthy || {') < deploy('upgrade.sh').indexOf('docker rm -f "wa-scrm-site-$SITE"'), 'the upgrade script must know a sub-site by its OpenWA and touch none while the provisioner is not healthy');
assert(compose.includes('      - WA_SCRM_OPENWA_MEMORY_MB=${WA_SCRM_OPENWA_MEMORY_MB:-1536}') && compose.includes('      - WA_SCRM_SERVER_MEMORY_MB=${WA_SCRM_SERVER_MEMORY_MB:-512}') && compose.includes('    mem_limit: ${WA_SCRM_SERVER_MEMORY_MB:-512}m') && compose.includes('      - WA_SCRM_COOKIE_SECURE=${WA_SCRM_COOKIE_SECURE:-0}'), 'a machine must be able to set the memory of a server and of a sub-site\'s OpenWA, and that its address is HTTPS');
// An employee is made from the supervisor page where the platform makes sub-sites: the first server asks the
// provisioner through its client — for the sub-site before the account, because the sub-site is the part that
// can be refused. Switched off, the account is off before its sub-site is stopped; switched on, the sub-site
// is started before the account is on. The page offers an employee only where the server says so.
const apiSource = siteSources['site-api.cjs'];
for (const required of ["function create({ dir, siteId = 'default', now, workspaces = null }) {", 'const EMPLOYEE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;', "if (!EMPLOYEE.test(id) || RESERVED.includes(id)) throw problem('invalid-username');", "if (error.code !== 'workspace-exists' || auth.listUsers().some(user => user.site === id)) throw error;", "if (!workspaces || target.role !== 'agent' || auth.listUsers().some(user => user.site === target.site && !user.disabled)) return {};", '...(workspaces ? { provisioned: true } : {})']) {
  assert(apiSource.includes(required), `site-api.cjs is missing ${required}`);
}
const asksFirst = apiSource.indexOf("const site = body.role === 'agent' ? await newWorkspace(actor, body, given) : null;");
assert(asksFirst > 0 && asksFirst < apiSource.indexOf('const { user, password } = await auth.createUser({ username: body.username, name: body.name, role: body.role, site,'), 'the sub-site of a new employee must be asked for before the account is made');
assert(apiSource.indexOf('auth.setDisabled(target.username, true);') < apiSource.indexOf('...(await workspaceOff(actor, target))') && apiSource.indexOf('const workspace = await workspaceOn(actor, target);') > 0 && apiSource.indexOf('const workspace = await workspaceOn(actor, target);') < apiSource.indexOf('auth.setDisabled(target.username, false);'), 'an account must be off before its sub-site is stopped, and a sub-site started before its account is on');
assert(read(path.join(__dirname, 'serve.cjs')).includes("workspaces: require('./site-provisioner.cjs').clientFromEnv() })"), 'the server must take its client of the provisioner from the environment');
assert(provisionerSource.includes("throw problem(['exists', 'full', 'low-memory', 'busy', 'unknown-site'].includes(answer?.error) ? 'workspace-' + answer.error : 'workspace-unavailable');") && provisionerSource.includes('const named = (id, action) => `/sites/${encodeURIComponent(id)}/${action}`;'), 'the first server\'s client must name a refusal by its reason, and an id must not reach into the address');
assert(masterSource.includes('const kind = state.provisioned') && masterSource.includes('state.provisioned = !state.failed && list.body.provisioned === true;') && masterSource.includes("const answer = await post('/api/auth/users', values);"), 'the supervisor page must offer an employee only where the server says that sub-sites are made');
// An account can be deleted for good: by a supervisor or an administrator, never one's own, an administrator's
// only by an administrator, its sessions with it. An employee's sub-site goes with the last account of it — the
// sub-site first, the account once it is gone — and the translations of its messages under the relay's own
// fingerprint; a server that makes no sub-sites deletes no employee. The provisioner deletes what the id names,
// signs the numbers out first, and is busy meanwhile. The page asks for the sign-in name to be typed.
for (const required of ['function deleteUser(username) {', "db.prepare('DELETE FROM users WHERE id = ?').run(row.id);", 'user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,', 'PRAGMA foreign_keys = ON;']) {
  assert(siteSources['site-auth.cjs'].includes(required), `site-auth.cjs is missing ${required}`);
}
for (const required of ["'POST /api/auth/users/remove': async req => {", "if (!workspaces) throw problem('workspace-unavailable');", "crypto.createHash('sha256').update(language + '\\n' + text).digest('hex')", "const drop = db.prepare('DELETE FROM translations WHERE key = ?');"]) {
  assert(apiSource.includes(required), `site-api.cjs is missing ${required}`);
}
assert(apiSource.indexOf('const actor = manager(req), target = managed(actor, (await readJson(req)).username);\n      const { shared, ...workspace } = await workspaceRemove(actor, target);\n      auth.deleteUser(target.username);') > 0, 'an account must be deleted only after the sub-site that goes with it');
// What the review of plan 057 found, held: the translations of a deleted sub-site are looked for part by part and
// within bounds, in batches between which the server answers others; the first server's own name is no
// employee's sub-site; a sub-site another account has stops when none can sign in; signing numbers out is bounded
// in time, sessions and answers, and a settings file is read only when it is a plain file; the gateway's
// configuration is tried before an upgrade changes anything; the note about the phone is not lost.
for (const required of ['const TRANSLATION_LANGUAGES = 12;', 'const TRANSLATED_MAX = 4000;', 'if (++done >= TRANSLATIONS_AT_MOST) return;', 'await new Promise(resolve => setImmediate(resolve));', 'for (const raw of [message.text, message.transcript]) {', "if (id === siteId) throw problem('invalid-username');", "if (!SITE_ID.test(target.site) || RESERVED.includes(target.site) || target.site === siteId) return {};", '...(shared ? await workspaceOff(actor, target) : {})']) {
  assert(apiSource.includes(required), `site-api.cjs is missing ${required}`);
}
assert(read(path.join(__dirname, 'ai-relay.cjs')).includes('const MAX_TEXT = 4000;'), 'the longest text looked at for a translation must be the longest the relay translates');
assert(apiSource.indexOf('await forgetTranslations(target.site);') < apiSource.indexOf('removed = await workspaces.remove(target.site);'), 'the translations must be looked for while the sub-site\'s data is still there');
for (const required of ['const SIGN_OUT_BUDGET_MS = 60000;', 'const SESSIONS_AT_MOST = 20;', 'const ANSWER_MAX = 1024 * 1024;', 'stat?.isFile() && stat.size <= 4096', 'if (size > ANSWER_MAX) return { status: 0, body: null };', 'signal: AbortSignal.timeout(Math.min(20000, left()))', 'for (const session of listed.body.slice(0, SESSIONS_AT_MOST)) {']) {
  assert(provisionerSource.includes(required), `site-provisioner.cjs is missing ${required}`);
}
assert(deploy('upgrade.sh').indexOf('-t -q || { echo "deploy/gateway.conf has an error: nothing was changed" >&2; exit 1; }') > 0 && deploy('upgrade.sh').indexOf('-t -q ||') < deploy('upgrade.sh').indexOf('"${COMPOSE[@]}" up -d\n'), 'the upgrade script must try the gateway\'s configuration before it changes anything');
assert(masterSource.includes("if (phone && (asking.isConnected || !$('#dialog').open)) showDialog('账号已删除', `<p>账号已删除。${NOT_SIGNED_OUT}</p>`, DONE);"), 'the note about the phone must not be lost when the dialog was closed meanwhile');
assert(read(path.join(__dirname, 'ai-relay.cjs')).includes("const translationKey = (to, text) => crypto.createHash('sha256').update(to + '\\n' + text).digest('hex');"), 'the fingerprint of a translation must be the relay\'s own');
for (const required of ["'POST /sites/remove': async (body, id) => {", "work.set(id, 'removing');", "const files = [n.settings, ...['site', 'wa'].flatMap(kind => ['', '-wal', '-shm'].map(end => `${kind}-${id}.db${end}`)), `wa-media-${id}`].map(name => path.join(config.dataDir, name));", "const signedOut = await signOut(id, parts, volume);", "/^\\/sites\\/([^/]+)\\/(start|stop|remove)$/"]) {
  assert(provisionerSource.includes(required), `site-provisioner.cjs is missing ${required}`);
}
assert(provisionerSource.indexOf('const signedOut = await signOut(id, parts, volume);') < provisionerSource.indexOf("for (const name of [n.server, n.openwa]) ok(await docker('DELETE', `/containers/${name}?force=true`), 204, 404);"), 'the numbers of a sub-site must be signed out before its containers are taken away');
assert(masterSource.includes("if (form.elements.confirm.value.trim().toLowerCase() !== username) return removeForm(username, '输入的登录名不一致。');") && masterSource.includes("const answer = await post('/api/auth/users/remove', { username });"), 'the supervisor page must ask for the sign-in name to be typed before an account is deleted');
assert(!/演示|原型|评审|本机|示例|体验/.test(masterSource) && !/WA_SITE|localStorage|sessionStorage/.test(masterSource), 'the supervisor page must not speak of a demonstration, nor touch the app or the browser\'s storage');
// Under a sub-site's name the server gives its data and its WhatsApp link only; the supervisor page takes what a
// sub-site saved where it has the expected shape; a name every object has touches nothing but the document.
assert(masterSource.includes("const rows = value => (Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : []);") && masterSource.includes('const drawn = entry.reached ? guarded(() => ({ f: figures(entry), list: numbers(entry) }), null) : null;') && !masterSource.includes("esc(c.color"), 'the supervisor page must not be stopped by one sub-site\'s odd data');
assert(siteSources['site-data.cjs'].includes('const own = (target, name, value) => Object.defineProperty(target, name, { value, enumerable: true, writable: true, configurable: true });') && !siteSources['site-data.cjs'].includes('(data[field] ??= {})[id]'), 'reading the document must set nothing but properties of the document');
for (const required of ["const named = site ? '/site/' + site.siteId : null;", "if (named && (pathname === named + '/api/data' || pathname.startsWith(named + '/api/wa/'))) pathname = pathname.slice(named.length);"]) {
  assert(read(path.join(__dirname, 'serve.cjs')).includes(required), `serve.cjs is missing ${required}`);
}
for (const required of ["'GET /api/auth/sites': async req => {", "if (signedIn(req).role === 'agent') throw problem('forbidden');", "if (user.role !== 'agent') console.log(`site data read user=${user.username} role=${user.role} site=${siteId} fields=${fields ? fields.join(',') : 'all'}`);", 'return { body: data.read(fields) };']) {
  assert(siteSources['site-api.cjs'].includes(required), `site-api.cjs is missing ${required}`);
}
assert(siteSources['site-api.cjs'].includes('process.umask(0o077);') && siteSources['site-admin.cjs'].includes('process.umask(0o077);'), 'the files of the data folder must be created private');
// Several sub-sites behind one address: signing in names the employee's sub-site in a second cookie, signing out
// takes it away, asking who is signed in gives it again; the accounts wait for another server's write.
for (const required of ["const SITE_COOKIE = 'scrm_site';", "return { body: { user }, headers: { 'Set-Cookie': [cookieHeader(req, token, 30 * 24 * 60 * 60), siteCookie(req, user)] } };", "return { body: { ok: true }, headers: { 'Set-Cookie': [cookieHeader(req, '', 0), siteCookie(req, null)] } };", "const named = user?.role !== 'agent' || cookieValue(req, SITE_COOKIE) === user.site;"]) {
  assert(siteSources['site-api.cjs'].includes(required), `site-api.cjs is missing ${required}`);
}
assert(siteSources['site-auth.cjs'].includes('PRAGMA busy_timeout = 5000;'), 'the accounts must wait for another server that is writing');

// 21. Leftovers of the prototype are gone: sample-content code, single-file bundles, the Windows launcher
for (const [name, gone] of [['fidelity-lifecycle.js', 'lcSeededV06'], ['fidelity-lifecycle.js', 'lcSeededOrders'], ['fidelity-ui.js', 'fidRemovePresetTags'], ['fidelity-ui.js', 'WA_DEMO'], ['fidelity-customer-pages.js', 'seedChatArchives'], ['fidelity-operations.js', 'ops-material-1'], ['fidelity-boot.js', 'lcSeededV06']]) {
  assert(!read(path.join(__dirname, name)).includes(gone), `${name} still contains ${gone}`);
}
assert(!appJs.includes('WA_DEMO'), 'the app must not refer to the fictional data set');
for (const file of [path.join(root, 'outputs', 'whatsapp-scrm-lifecycle.html'), path.join(root, 'outputs', 'whatsapp-replica-ui-fidelity.html'), path.join(root, '启动SCRM原型预览.cmd')]) {
  assert(!fs.existsSync(file), `${path.basename(file)} must not exist`);
}
assert(!/standalone/.test(read(path.join(__dirname, 'build-fidelity.cjs'))), 'the build must not write single-file bundles');

// The words of a voice note come from the server, on a click; the page keeps them on the message.
for (const required of ["{ id: 'voice.transcribe', name: '语音转文字',", "fetch('/api/wa/transcribe', {", 'function aiTranscriptHTML(c, m) {', "aiRun('voice.transcribe', { account: c.account, chat: c.waChat, id: message.wa }, { customerId: c.id })", 'message.transcript = result.text;', 'data-ai-transcribe=']) {
  assert(read(path.join(__dirname, 'fidelity-ai.js')).includes(required), `fidelity-ai.js is missing ${required}`);
}
assert(read(path.join(__dirname, 'fidelity-openwa.js')).includes("aria-label=\"语音\"></audio></div>` + aiTranscriptHTML(c, m);"), 'a voice note must show its words or the button that asks for them');
// The customer's language is chosen in the conversation; nothing presets it, and the helpers that read it exist
// from the start of the page (the follow-up module reads a language while it starts up).
for (const required of ['function aiCustomerLanguage(c) {', 'function aiLanguageLabel(c) {', 'function aiLanguagePicker(c) {', "fidForms['ai-language-form'] = (f, v) => {", 'data-ai-language=', "to: aiCustomerLanguage(c),"]) {
  assert(read(path.join(__dirname, 'fidelity-ai.js')).includes(required), `fidelity-ai.js is missing ${required}`);
}
assert(!/language: '其他'/.test(read(path.join(__dirname, 'fidelity-openwa.js'))), 'a customer made from a WhatsApp chat must not get a preset language');
assert(read(path.join(__dirname, 'fidelity-openwa.js')).includes("const chosenFrom = document.activeElement?.tagName === 'SELECT' && document.activeElement.closest('.lc-chat-strip, .source-strip');"), 'a refresh must not draw the page again under a list box that is being chosen from');
assert.equal((appJs.match(/\.language (===|!==) '其他'/g) || []).length, 1, 'whether a customer has a language is asked through aiCustomerLanguage, the only place that knows the old value');
assert(appJs.includes("+aiLanguagePicker(c)+'</div>'") && appJs.includes("esc(aiLanguageLabel(c))+' · '+aiDraftHint(c)"), 'the conversation must offer the choice of the customer\'s language and show it beside the message box');
// The price list: a file a person uploads is read in the browser by pricefile.js — the built copy of
// fidelity-pricefile.js, which the page loads before the app. Neither the reader nor the page module calls a
// server or runs what a file holds, and the button "报价" puts a price into the message box without sending.
const priceReader = read(path.join(__dirname, 'fidelity-pricefile.js')), pricePage = read(path.join(__dirname, 'fidelity-pricelist.js'));
assert.equal(read(path.join(out, 'pricefile.js')), priceReader, 'pricefile.js must be the built copy of fidelity-pricefile.js');
assert(indexHtml.includes('<script src="icons.js"></script><script src="pricefile.js"></script><script src="app.js"></script>'), 'index.html must load pricefile.js before app.js');
for (const [name, source] of [['fidelity-pricefile.js', priceReader], ['fidelity-pricelist.js', pricePage]]) {
  assert(!/\b(?:fetch|XMLHttpRequest|WebSocket|eval|importScripts)\s*\(|new Function\b/.test(source), `${name} must not call a server or run text as code`);
}
assert(!/\bsend\s*\(/.test(pricePage), 'the price list must not send a message');
for (const required of ['function priceQuoteButton() {', 'function renderPriceList() {', 'window.WA_PRICE_FILE.read(new Uint8Array(await file.arrayBuffer()))', "fidButton('确认使用', 'priceUse', '', 'blue')", 'priceInsert: id => {', "box.dispatchEvent(new Event('input', { bubbles: true }));"]) {
  assert(pricePage.includes(required), `fidelity-pricelist.js is missing ${required}`);
}
for (const required of ["+priceQuoteButton()+'<span class=\"language-hint\">'", "ai:'AI 能力',prices:'价格表'}", 'ai:renderAiPage,prices:renderPriceList}', "renderItem('prices', views.prices)"]) {
  assert(appJs.includes(required), `app.js is missing ${required}`);
}
// In the rows of the list of conversations the dot of the number is drawn only when the number is not connected.
assert(moduleSource.includes("const lcNumberDot = a => (a?.state === 'online' ? '' : `<span class=\"state-dot ${a?.state === 'pending' ? 'offline' : 'warning'}\"></span>`);") && moduleSource.includes('<span>${lcNumberDot(a)}${esc(ui.account === \'all\' ? a?.name : aiLanguageLabel(c))}</span>'), 'a connected number must not put a green dot into the rows of the list of conversations');
// At the top of a conversation the state of the number is said only when the number is not connected.
assert(openwaSource.includes("const state = a.state === 'online' ? '' : `<span class=\"state-text ${a.state==='reconnect'?'warn':''}\" role=\"status\">"), 'a connected number must not show "online" beside a conversation');
// 22. The page uses the real WhatsApp connection through its own server; nothing simulates it any more.
// A message shows its picture, voice note, video or file through the server's media route.
for (const required of ['function openwaMediaUrl(c, m) {', "'/api/wa/media?account=' + encodeURIComponent(owner.account)", 'function openwaMediaHTML(c, m) {', 'function openwaKeepPlaying(draw) {', "...(e.media?.name ? { file: e.media.name } : {})"]) {
  assert(openwaSource.includes(required), `fidelity-openwa.js is missing ${required}`);
}
assert(appJs.includes("<div class=\"message-bubble\">'+openwaMediaHTML(c,m)+(openwaCaption(c,m)?"), 'a message bubble must show its media and the text under it');
// A file is attached to a message and sent with it: the button stands where the baseline had its made-up one, the
// file goes to the server as it is, what the page sends is marked like every message, and what was just sent or
// has just arrived stays in view.
for (const required of ['function openwaAttachButton() {', "fetch('/api/wa/send-file', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Blob([details, '\\n', item.file]) })", 'if (held) return openwaSendFiles(c, held, text, outgoing);', "if (item.caption !== caption) Object.assign(item, { caption, request: nextId('r') });", 'const OPENWA_FILES_MAX = 10;', "for (let first = true; held.list.length && !failed; first = false) failed = await openwaSendFile(c, held.list[0], first ? text : '', first ? caption : '');", 'for (const id of Object.keys(ui.attachments)) delete ui.attachments[id];', 'if (e.fromMe && openwaFiles.get(c.id)?.sending) message.translatedTo = aiSettings().readLanguage;', 'if (box && box.contains(event.target) && openwaAtEnd) openwaShowEnd();', 'requestAnimationFrame(openwaShowEnd);']) {
  assert(openwaSource.includes(required), `fidelity-openwa.js is missing ${required}`);
}
for (const required of ["<div class=\"composer-tools\">'+openwaAttachButton()+'<button class=\"icon-button\" data-action=\"quickAll\"", 'enabled=online&&(d.text.trim()||ui.attachment);']) {
  assert(appJs.includes(required), `the built page is missing ${required}`);
}
assert(!/添加演示附件|data-action="attachment"/.test(appJs), 'the made-up attachment of the baseline must be gone');
for (const required of ["'POST /api/wa/send-file': async req => {", "if (mediaType(req.headers['content-type']) !== 'application/octet-stream') {", 'const body = await readRaw(req, SEND_DETAILS_MAX + SEND_FILE_MAX), end = body.subarray(0, SEND_DETAILS_MAX).indexOf(10);', 'const SEND_FILE_MAX = 16 * 1024 * 1024;', 'mediaKeep(mediaKey(row.id, to, outcome.messageId), { mime, name, bytes });', "function sendForm(bytes, declared = '') {"]) {
  assert(read(path.join(__dirname, 'openwa-link.cjs')).includes(required), `openwa-link.cjs is missing ${required}`);
}
// A customer shows the profile picture WhatsApp gives for the chat, over the initials: every avatar offers it,
// and the server takes a picture only from WhatsApp's own servers or from the gateway.
for (const required of ['function openwaAvatar(c) {', "if (!c.account || !account(c.account)?.linked || (!c.waChat && digits.length < 7)) return '';", "if (event.target.classList?.contains('openwa-avatar')) event.target.remove();"]) {
  assert(openwaSource.includes(required), `fidelity-openwa.js is missing ${required}`);
}
assert(appJs.includes("+esc(c.initials||c.initial||initial(c.name))+openwaAvatar(c)+'</span>';"), 'every avatar must offer the customer\'s picture');
for (const required of ["'GET /api/wa/avatar': avatar,", 'const AVATAR_FRESH_MS = 24 * 60 * 60 * 1000;', "if (address.origin !== new URL(config.baseUrl).origin && !(address.protocol === 'https:' && AVATAR_HOSTS.test(address.hostname))) throw problem('gateway-failed');", "response = await fetch(address, { redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS) });"]) {
  assert(read(path.join(__dirname, 'openwa-link.cjs')).includes(required), `openwa-link.cjs is missing ${required}`);
}
// A receipt that reached the link before its message is not lost: the feed gives the message the best receipt
// from before, and the page takes it — for a new message and for one it has already.
for (const required of ["const RECEIPTS_BEFORE = ['delivered', 'read', 'played'];", 'const receipts = store.receiptsBefore(rows.at(-1).seq, own.map(e => e.id));', 'const status = RECEIPTS_BEFORE.findLast(s => receipts.some(r => r.account === e.account && r.id === e.id && r.seq < e.seq && r.status === s));']) {
  assert(read(path.join(__dirname, 'openwa-link.cjs')).includes(required), `openwa-link.cjs is missing ${required}`);
}
for (const required of ["...(e.fromMe ? { status: e.status || 'sent' } : {}) };", "Object.assign(mine, { wa: e.id, status: e.status || 'sent' });", "if (known.side !== 'out' || !e.status || order.indexOf(e.status) <= order.indexOf(known.status)) return named;"]) {
  assert(openwaSource.includes(required), `fidelity-openwa.js is missing ${required}`);
}
// The price list is taken out for good: the page asks the server to remove it with every trace, never by an
// ordinary save that would name it in the log of saves.
for (const required of ["if (!(await window.WA_SITE.purge('priceList'))) return toast('价格表没有删除：暂时无法连接服务器，请稍后重试。');", "fidButton('彻底删除价格表', 'priceClear', 'Trash2')"]) {
  assert(read(path.join(__dirname, 'fidelity-pricelist.js')).includes(required), `fidelity-pricelist.js is missing ${required}`);
}
assert(!read(path.join(__dirname, 'fidelity-pricelist.js')).includes('delete data.priceList'), 'the price list must not be removed by an ordinary save');
for (const [file, required] of [['fidelity-boot.js', "answer = await request('/api/data', { method: 'DELETE', timeout: SAVE_TIMEOUT, body: { baseVersion: version, field } });"], ['site-api.cjs', "const PURGEABLE = ['priceList'];"], ['site-api.cjs', "'DELETE /api/data': async req => {"], ['site-data.cjs', "db.exec('VACUUM');"], ['site-data.cjs', "db.exec('PRAGMA wal_checkpoint(TRUNCATE)');"], ['site-data.cjs', "else db.prepare('DELETE FROM saves WHERE version = ?').run(row.version);"]]) {
  assert(read(path.join(__dirname, file)).includes(required), `${file} is missing ${required}`);
}
// The shortest password: the server's rule and what the page checks and says are the same number.
assert(read(path.join(__dirname, 'site-auth.cjs')).includes('const PASSWORD_MIN = 8;') && bootSource.includes("if (next.length < 8) return fail(form, '新密码至少 8 位。');") && read(path.join(__dirname, 'fidelity-index.html')).includes('新密码（至少 8 位）'), 'the page and the server must agree on the shortest password');
// The list of conversations keeps its place when the page is drawn again.
for (const required of ["const openwaListKey = () => [ui.account, ui.conversationFilter, ui.query].join('\\n');", "if (event.target.id === 'conversation-list') Object.assign(openwaListPlace, { key: openwaListKey(), top: event.target.scrollTop });", 'else if (openwaListPlace.top) list.scrollTop = openwaListPlace.top;']) {
  assert(openwaSource.includes(required), `fidelity-openwa.js is missing ${required}`);
}
assert(read(path.join(__dirname, 'fidelity-ai.js')).includes('openwaKeepPlaying(() => {'), 'the redraw after a translation must keep a playing voice note');
for (const required of ["fetch('/api/wa/' + path, {", "openwaCall('POST', 'link', pair.expired ? { account: pair.accountId, fresh: true } : { account: pair.accountId })", 'const openwaQrLife = 90000;', "openwaCall('POST', 'claim', { client: openwaClient })", 'events?after=${Number(data.waCursor) || 0}&client=${openwaClient}&wait=${caughtUp ? 25 : 0}', "openwaCall('POST', 'send', {", "requestId: message.request", "window.WA_SITE.halt('已在其他页面打开'", "if (e.kind === 'chat') {", 'function openwaJoinTwins() {', "if (!c && e.kind === 'message' && e.fromMe) {", 'if (!e.fromMe && !e.history) {', 'send = function() {', "document.addEventListener('compositionstart'"]) {
  assert(openwaSource.includes(required), `fidelity-openwa.js is missing ${required}`);
}
assert(!/openwaDemoQr|openwaScan|openwaDrop|openwaRestore|openwaAddSampleChat|openwaNextNumber|模拟|演示/.test(openwaSource), 'fidelity-openwa.js must not simulate linking, losing or restoring a connection');
assert(!/lcSimLeadOpen|lcSimReply|openSimLeadModal|lcSimulateCustomerReply|lc-sim-lead|模拟/.test(moduleSource), 'fidelity-lifecycle.js must not simulate leads or replies');
assert(bootSource.includes('window.WA_SITE = { user, site, data, save, idle, signOut, halt: stop, halted: () => stopped, purge };'), 'fidelity-boot.js must let the app stop the page with a notice and ask whether it was stopped');
// A release does not speak of a demonstration, a prototype, a review or of saving on this machine (plan 032),
// and the materials screen is hidden.
for (const word of ['演示', '原型', '评审', '本机', '示例', '体验']) {
  assert(!appJs.includes(word), `app.js still says ${word}`);
  assert(!indexHtml.includes(word), `index.html still says ${word}`);
}
assert(!appJs.includes("materials:'素材管理'") && !appJs.includes('materials:renderMaterials'), 'the materials screen must have no title and no route');
assert(appJs.includes('const operationsMenu = [];'), 'the materials screen must have no menu entry');
for (const gone of ['<span>本地演示</span>', '演示消息', '模拟扫码', '模拟掉线', '模拟新客进线', '模拟对方回复', '模拟客户复联', '添加演示附件', '演示来源', '首响回复', '首次主动触达', '自动建立']) {
  assert(!appJs.includes(gone), `app.js still contains ${gone}`);
}
for (const required of ['const day=openwaDayLabel(m),separator=', "(m.side==='out'?openwaMessageMark(m):'')", 'return openwaOrder(list)}', '  function send() {}\n']) {
  assert(appJs.includes(required), `app.js is missing ${required}`);
}
// One currency for the whole price list, chosen in the confirm dialog of an upload (plan 059). It starts on the
// currency the headers name; every price the page shows or quotes carries it, and a list saved before the choice
// existed keeps the currencies of its headers.
for (const required of ['<select class="fid-select" id="price-currency">', "const start = list.columns.prices.map(priceHeaderCurrency).find(Boolean) || '';", 'if (list.currency === undefined) return priceMoney(list.columns.prices[at], value);', 'return list.currency && !/[$€£¥]/.test(value) ? `${list.currency} ${value}` : value;', "const chosen = $('#price-currency')?.value || '', currency = PRICE_CURRENCIES.some(([code]) => code === chosen) ? chosen : '';", 'data.priceList = { file: pending.file, at: new Date().toISOString(), by: ui.persona, currency, columns: pending.columns, rows: pending.rows };', '${esc(priceShown(list, at, value))}</button>', ': ${priceShown(list, at, entry.prices[at])}']) {
  assert(pricePage.includes(required), `fidelity-pricelist.js is missing ${required}`);
  assert(appJs.includes(required), `app.js is missing ${required}`);
}
assert.equal(pricePage.match(/priceMoney\(/g).length, 2, 'a price must be shown and quoted only through priceShown');
// The translation shortcut (plans 060 and 062): set under a gear beside the customer's language by pressing it —
// any key, any combination, or modifier keys on their own; in the message box it translates what was typed and
// shows it above the box. It is caught before the page's own handling of Enter, so that a shortcut with Enter
// translates instead of sending, and not while an input method composes.
for (const required of ["const AI_SHORTCUT_DEFAULT = 'Ctrl+Enter';", 'const AI_SHORTCUT_FORM = /^((Ctrl|Alt|Shift|Meta)\\+){0,4}[A-Za-z0-9]{1,24}$/;', 'if (event.isComposing || event.keyCode === 229) return void (aiLone.spoiled = true);', 'if (aiShortcutOf(event) !== aiShortcut()) return;', "if (lone && id === 'composer-text' && lone === aiShortcut()) aiTranslateByShortcut();", "else if (lone && id === 'ai-shortcut-key' && aiRecording) aiShortcutShow(lone);", "if (event.target.id === 'ai-shortcut-key') aiShortcutRecord(true);", "fidForms['ai-shortcut-form'] = (f, v) => {", 'aiSettings().translateKey = combo;', "</select></label>${aiShortcutGear()}`;", "if (event.target.closest?.('[data-ai-shortcut]')) aiShortcutOpen();", 'const shortcut = aiShortcut(), named = `${esc(aiShortcutLabel(shortcut))} 翻译`;', "aiRun('translate.outbound', aiOutboundInput(c, text), { customerId: c.id }).then(result => {"]) {
  assert(aiSource.includes(required), `fidelity-ai.js is missing ${required}`);
  assert(appJs.includes(required), `app.js is missing ${required}`);
}
assert(aiSource.includes('    if (combo) aiShortcutShow(combo);\n  }, true);\n'), 'the shortcut must be caught before the page sends on Enter');
assert(!aiSource.includes('AI_SHORTCUT_TAKEN'), 'any key can be the shortcut: no combination is refused (plan 062)');
// A reply that was put into the customer's language is translated back into the reading language after it is sent
// (plan 066): the page leaves its own translated message, and a file's translated caption, unmarked, so that the
// translator of the conversation takes it like a message sent from the phone. The typed words are no longer kept as
// the reply's translation back (plan 063 undone); two workspaces of a server show the same translation back, which
// the relay keeps once; a translation on its way is shared by a request for the same one, so that two workspaces
// asking at the same moment get the same words.
for (const required of ['if (caption === text) message.translatedTo = aiSettings().readLanguage;', "else for (const field of ['translatedTo', 'translated']) delete message[field];"]) {
  assert(openwaSource.includes(required), `fidelity-openwa.js is missing ${required}`);
  assert(appJs.includes(required), `app.js is missing ${required}`);
}
assert(!openwaSource.includes('{ translated: text }'), 'a sent message must not keep the typed words as its translation');
assert(!read(path.join(__dirname, 'ai-relay.cjs')).includes('writtenIn(') && !aiSource.includes('from: settings.readLanguage'), 'the relay must not keep the typed words of a reply as its translation back');
assert(read(path.join(__dirname, 'ai-relay.cjs')).includes('if (translating.has(key)) return { text: await translating.get(key), inputChars: text.length, cached: true };'), 'a translation on its way must be shared by a request for the same one');
assert(read(path.join(out, 'icons.js')).includes('"Settings":[["path"'), 'the gear must be in the icon pool');
// Pinning chats (plan 061): a right-click on a chat in the list opens a menu with 置顶 or 取消置顶; pinned chats come
// first in every filter and search, marked with a pin; the pin is kept with the customer and survives the merging
// of a duplicate chat.
for (const required of ['return [...list.filter(c => c.pinned), ...list.filter(c => !c.pinned)];', "document.addEventListener('contextmenu', event => {", "const row = event.target.closest?.('#conversation-list .conversation[data-id]'), c = row && customer(row.dataset.id);", "${c.pinned ? '取消置顶' : '置顶'}</button>", 'if (c.pinned) delete c.pinned;', "<time>${esc(c.last)}</time>${c.pinned ? `<span class=\"conversation-pin\" title=\"已置顶\">${icon('Pin')}</span>` : ''}</span>"]) {
  assert(moduleSource.includes(required), `fidelity-lifecycle.js is missing ${required}`);
  assert(appJs.includes(required), `app.js is missing ${required}`);
}
assert(openwaSource.includes('star: keep.star || drop.star, pinned: keep.pinned || drop.pinned,'), 'merging a duplicate chat must keep its pin');
for (const name of ['"Pin":[["path"', '"PinOff":[["path"']) assert(read(path.join(out, 'icons.js')).includes(name), `the icon pool must hold ${name}`);

const summary = {
  version: req.version,
  status: 'passed',
  checkedAt: new Date().toISOString(),
  projectRoot: path.basename(root),
  historicalBaselineVerified: verifiedBaseline,
  engagementStates: ['open', 'closed'],
  attentionSignals: ['reply', 'overdue', 'recontact'],
  deferredModules: ['P-LIFECYCLE', 'P-PIPELINES', 'P-DEALS'],
  invitationCodes: 'removed',
  customerTiers: ['S', 'A', 'B', 'C', 'D'],
  customerStatuses: ['converted', 'abandoned', 'organic'],
  chatHistory: 'archive of moved-in snapshots, no rating',
  aiCapabilities: ['translate.inbound', 'translate.outbound', 'voice.transcribe'],
  aiProvider: 'server relay to an OpenAI-compatible model service (key stays on the server); without it no AI capability runs',
  pageNetworkCalls: 'own server only: /api/ai/status, /api/ai/translate, /api/ai/reply, /api/wa/transcribe',
  replyTranslation: 'typed replies and quick replies go to /api/ai/reply with tone, business description and the last six messages; send guard on by default: first Enter translates, second Enter sends',
  conversationCardTags: 'first 3 visible tags, then +N; no follow-up status chip',
  chatStripFollowLink: 'status and next-follow-up labels open the follow-up centre on the customer row',
  orderTracking: 'profile tab: first contact; one block per order, collapsed by default, head with number, time placed, a three-segment progress bar in the colour of the status and icon buttons (next step, exception, undo, remove); open: one entry per shipping step reached; the order form is pinned to the bottom of the drawer',
  translationSettings: 'removed from the chat screen (tool rail, top bar, narrow-screen menu, dialog); sample translations stay and are always shown, switched per capability on the AI page',
  reviewerTools: 'removed: review panel and its two buttons, requirements page and export, element notes tool and its server endpoint; requirements.json stays as a build-time record',
  serverSide: 'behind WA_SCRM_DATA_DIR: accounts with scrypt password hashes, sign-in sessions, one sub-site data document in SQLite, AI relay for signed-in users only',
  signIn: 'the page opens on a sign-in screen, loads the sub-site data from the server and saves changed parts back; the browser keeps only drafts and open tabs; a new sub-site starts empty',
  leftovers: 'removed: code that added sample customers, orders, archive entries and a sample material; the single-file bundles; the Windows launcher of the old preview',
  whatsappConnection: 'real, through the sub-site\'s own server: QR code, incoming events, sending; no simulation',
  priceList: 'an .xlsx or .csv file is read in the browser (pricefile.js) and, once confirmed, replaces the list; the button 报价 beside the message box puts one product\'s price into the message box and sends nothing; the list can be taken out for good: its rows, its name in the log of saves and what it left in the database files',
  messageTranslation: 'once per message and reading language: kept on the message (translatedTo) and saved; the conversation on screen asks only for messages without a mark; the relay keeps every translation in ai-translations.db and gives it again',
  fileSending: 'up to ten files at once from the message box (the + button, paste, drop), sent by the server through OpenWA one after the other, each as a message of its own, the typed words as the caption of the first; told by its bytes: JPEG and PNG as a picture, MP4 (H.264) as a video, MP3, OGG, M4A and AAC as a recording, everything else as a document; 16 MB at most',
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  handMadeEmpty: 'a customer made by hand (新增客户) starts with an empty conversation; the 初步需求 stays in the profile and the notes (before, the conversation showed it as a message from the customer, and the first message sent saved it so); the chat list still shows it as the row\'s preview until the first message',
  openOutcomeMatched: 'a reply whose outcome is open (结果待确认: the page was closed while it was on its way, or the answer was lost) is matched with its copy from the WhatsApp feed and shows once, with the copy\'s status; before, the copy showed as a second reply (or, for a customer known by phone number only, as a new customer)',
  feedStartsAgain: 'the WhatsApp feed starts also when its first questions fail (the server restarting, a moment without network): the server\'s state and the feed for this page are asked again after 2, 4, 8 … at most 30 s until they are answered; an ended session shows 登录已失效, as the feed loop does',
  linkedNumberKept: '移除账号 refuses a number that is still linked to WhatsApp (online or offline) and asks to unlink it first in 号码管理 (解除绑定); a removed number that was still linked went on receiving, and every message for it was dropped',
  haltedStays: 'a page stopped with a notice (数据已在别处更新, 登录已失效, 已在其他页面打开) stays stopped: the app is not drawn behind the notice again and nothing more is taken in from the WhatsApp feed; 刷新页面 reloads the page, which reads the feed on from the saved position',
  endAfterTranslation: 'a conversation that shows its end keeps showing it when a translation redraws it, also when a picture takes its height a moment later (the redraw scrolls with the WhatsApp module\'s own noted step)',
  noPermissionsNote: 'the chat\'s tool rail ends with 刷新视图; the shield button 权限说明 and its dialog 会话权限 are gone (the rules of who sees what are unchanged)',
  lighterPage: 'the gateway compresses the page\'s program, style sheets and data (gzip, also through a proxy or a VPN); the browser keeps the page\'s files and asks each time with their tag (ETag), getting an empty 304 when they did not change; the data stays no-store',
  ownEmoji: 'emoji are drawn with Noto Color Emoji (SIL OFL 1.1; work/wa-replica/fonts, copied by the build) in eleven parts named by their characters: a browser loads only the parts of the emoji on screen and keeps them (font/woff2, immutable); digits and signs keep the fonts of the text; a browser that cannot draw the colour format keeps its own emoji',
  saveGuard: 'every save of the page has a time limit of 30 s and a guard around it: whatever goes wrong, the changes stay, the page says they are not saved and tries again, and the server\'s log is told once for each kind of trouble (POST /api/site/report, signed in; who, sub-site, kind, status, the first plain words of the error, never data)',
  reasoningEffort: 'AI_REASONING_EFFORT in the server\'s settings (none, minimal, low, medium or high) is sent to the model service as reasoning_effort and named by the status; a value outside these leaves the service not configured (bad-reasoning-effort); without it nothing is sent',
  voiceWithGemini: 'voice notes into text can use Google Gemini (VOICE_PROVIDER=gemini, model gemini-3.5-transcribe): the sound goes inline into a generateContent request with the key in its own header, 14 MB at most; the answer\'s words without the model\'s thoughts',
  sentTranslatedBack: 'a reply or caption that was put into the customer\'s language is translated back into the reading language after it is sent, like a message sent from the phone, and that translation shows under it; what went out as typed gets none; the typed words are not kept as a translation (plan 063 undone); requests for the same translation at the same moment share one call to the service',
  pinnedChats: 'a right-click (or the menu key) on a chat in the list opens a menu with 置顶 / 取消置顶; pinned chats stay at the top of the list in every filter and search, in the order of their last message, marked with a pin; kept with the customer in this workspace, WhatsApp on the phone unchanged',
  translateShortcut: 'a key, a combination or modifier keys on their own, recorded under the gear beside the customer\'s language once its field is clicked (Ctrl + Enter at first; any key, plan 062), translates the message box into the customer\'s language and shows it above the box, guard on or off; Enter (or the send button, when Enter is the shortcut) then sends the translation; the line under the box names it',
  priceCurrency: 'one currency for the whole price list, chosen in the confirm dialog of an upload (18 currencies or none) and starting on the one the headers name; every price shown on the page and quoted into the message box carries it ("USD 40") unless the file gives the price with its own sign; a list saved before keeps the currencies of its headers',
  externalNetworkCalls: false,
};
fs.writeFileSync(path.join(out, 'validation.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
