const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'outputs/wa-replica-prototype');
const base = path.join(__dirname, 'fidelity-base');
const read = (dir, file) => fs.readFileSync(path.join(dir, file), 'utf8').replace(/\r\n/g, '\n');
const write = (dir, file, text) => fs.writeFileSync(path.join(dir, file), text);
const baseFiles = ['app.js', 'app.css', 'components.css', 'tokens.css', 'index.html', 'demo-data.js', 'requirements.json', 'lucide-license.txt'];
if (!fs.existsSync(base)) {
  assert.equal(JSON.parse(read(output, 'requirements.json')).version, '0.4-replica-ui');
  fs.mkdirSync(base);
  for (const file of baseFiles) fs.copyFileSync(path.join(output, file), path.join(base, file));
}

const baseline = JSON.parse(read(__dirname, 'baseline.json'));
let verifiedBaselineCount = 0;
for (const [name, hash] of Object.entries(baseline)) {
  const targetFile = path.join(root, 'outputs', name);
  if (fs.existsSync(targetFile)) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(targetFile)).digest('hex'), hash, name);
    verifiedBaselineCount++;
  }
}

let js = read(base, 'app.js');
function swap(from, to) {
  assert(js.includes(from), 'Missing prototype source anchor: ' + from.slice(0, 80));
  js = js.replace(from, () => to);
}
swap("const KEY='wa-desk-replica-ui-v01';", "const KEY='wa-desk-scrm-lifecycle-v06';");
swap('[1,2,3,4].includes(saved?.version)', '[6].includes(saved?.version)');
swap('{version:4,data,requirements:req,persona:ui.persona,', '{version:6,data,requirements:req,');
swap('if(previous){module.decision=previous.decision;module.notes=previous.notes}', `if(previous){
      const previousDefaultNotes={'P-AUTO':'不因原产品存在而自动纳入。','P-TEAM':'角色切换仅用于原型评审，不是生产鉴权。','P-CHAT-REVIEW':'快照与实时会话相互独立；正式版由主管在主站质检，原型开放操作以便评审。'};
      const revisedScope=Object.hasOwn(previousDefaultNotes,module.id)&&previous.basis!==module.basis;
      if(!revisedScope)module.decision=previous.decision;
      if(!revisedScope||previous.notes!==previousDefaultNotes[module.id])module.notes=previous.notes;
    }`);
swap("const views={inbox:'聚合会话',accounts:'WhatsApp账号',customers:'客户列表',tags:'标签管理',followups:'跟进管理',team:'团队与权限',scope:'功能范围'};", `const views={dashboard:'首页',inbox:'WhatsApp API',accounts:'账号列表',customers:'客户列表',followups:'跟进闭环','chat-records':'聊天记录',tags:'标签管理','tag-stats':'标签统计',materials:'素材管理',team:'组织架构',members:'账号管理',ai:'AI 能力',scope:'功能范围'};
  const defaultView=['numbers','chat'].includes(new URLSearchParams(location.search).get('tab'))?'inbox':'dashboard';`);
swap("view:views[location.hash.slice(1)]?location.hash.slice(1):'inbox'", "view:Object.hasOwn(views,location.hash.slice(1))?location.hash.slice(1):defaultView");
swap('  const ui={', "  const subsiteMember=window.WA_DEMO.members.find(m=>m.id==='lin');\n  const ui={");
swap("persona:saved?.persona||'lin'", 'persona:subsiteMember.id');
swap("if(!data.members.some(m=>m.id===ui.persona))ui.persona=data.members[0].id;", `if(!data.members.some(m=>m.id===ui.persona)){
    data.members.push(clone(subsiteMember));
  }`);
swap("ui.view=views[view]?view:'inbox'", "ui.view=Object.hasOwn(views,view)?view:defaultView");
swap("navigate(views[v]?v:'inbox','replace')", "if(subsiteSignedOut||v==='login')render();else if(v!=='view')navigate(v,'replace')");
swap("if(views[v]&&v!==ui.view)navigate(v,'replace')", "if(subsiteSignedOut||v==='login')render();else if(Object.hasOwn(views,v)&&v!==ui.view)navigate(v,'replace')");
swap('角色权限与客户归属仍是可操作的评审方案。', '当前为聊手子站。客户归属规则仍待评审。');
swap('切换主管视角查看团队</h2><p>聊手默认只查看自己负责的工作范围。<br>右上角可切换评审视角。', '团队管理在主站</h2><p>子站显示当前聊手的工作范围。');
swap('当前聊手只能使用公共标签，请切换主管视角维护。', '当前聊手可以使用公共标签，由主管维护。');
js = js.replaceAll("ui.view==='team'&&!manager()", "['team','members'].includes(ui.view)&&!manager()").replaceAll("id!=='team'||manager()", "!['team','members'].includes(id)||manager()");
swap('  function render() {\n', '  function render() {\n    if(!renderSignInState())return;\n');
swap('const pages={inbox:renderInbox', 'const pages={dashboard:renderDashboard,inbox:renderInbox');
swap('team:renderTeam,scope:renderScope', "team:renderTeam,members:renderMembers,'chat-records':renderChatRecords,'tag-stats':renderTagStats,materials:renderMaterials,ai:renderAiPage,scope:renderScope");
swap("'P-AUTO':'关键词自动回复、欢迎语及群发是否需要，本轮未预先纳入。'", "'P-AUTO':'关键词回复和欢迎语回复暂缓。','P-BROADCAST':'群发任务和在线聊天的群发功能暂缓。','P-LIFECYCLE':'客户全生命周期看板与阶段漏斗暂缓。','P-PIPELINES':'生命周期流程配置暂缓。','P-DEALS':'报价、订单与复购台账暂缓。','P-CHAT-REVIEW':'把 WhatsApp 会话的快照移入聊天记录，用于绩效复盘与审核。','P-AI':'翻译等 AI 功能经由统一接入点调用，可逐项启停并逐次记录用量。'");
swap("'P-FOLLOW':'把跟进安排成待办，完成后回写客户记录。'", "'P-FOLLOW':'每位客户要么有下一步跟进，要么已明确结束跟进；以自定义标签辅助筛选。'");
swap("'P-CUSTOMERS':'客户档案、来源、阶段、标签及跨账号接触记录。'", "'P-CUSTOMERS':'客户档案、来源、客户等级、客户状态、跟进状态、标签及跨账号接触记录。'");
swap('聊手管理自己的工作，主管查看团队并处理分配。', '团队成员、账号分配和客户交接由主站管理。');
const deferredScopeIds = JSON.stringify(['P-COMMERCIAL','P-TEAM','P-AUTO','P-REPLY-MANAGEMENT','P-BROADCAST','P-LIFECYCLE','P-PIPELINES','P-DEALS']);
swap("m.id!=='P-COMMERCIAL'||m.id==='P-ATTRIBUTION'", `!${deferredScopeIds}.includes(m.id)||m.id==='P-ATTRIBUTION'`);
swap("req.modules.filter(m=>m.id==='P-COMMERCIAL')", `req.modules.filter(m=>${deferredScopeIds}.includes(m.id))`);
swap("if(['customers','tags','followups'].includes(nav.dataset.nav))ui.customerNavOpen=true;", 'if(customerMenu.includes(nav.dataset.nav))ui.customerNavOpen=true;if(operationsMenu.includes(nav.dataset.nav))fid.operationsOpen=true;');
swap("(id==='inbox'?'':'<button class=\"icon-button\" aria-label=\"关闭'", "(id==='inbox'||id==='dashboard'||id!==ui.view?'':'<button class=\"icon-button\" aria-label=\"关闭'");
swap("case 'closeTab':{if(id==='inbox')break;", "case 'closeTab':{if(id==='inbox'||id==='dashboard')break;");
swap("ui.customer=id;if(ui.view!=='inbox'||(ui.account!=='all'&&c.account!==ui.account))ui.account='all';", "ui.customer=id;if(ui.view==='dashboard'){ui.query='';ui.conversationFilter='all'}if(ui.view!=='inbox'||(ui.account!=='all'&&c.account!==ui.account))ui.account='all';");
swap("(ui.navCollapsed?'展开导航':'收起导航')", "(ui.navCollapsed?'展开':'收起')");
js=js.replaceAll(`menuHTML()+'<a class="nav-item" href="#scope" data-nav="scope">'+icon('SlidersHorizontal')+'功能范围</a>'`, 'menuHTML(true)');
js=js.replaceAll(`menuHTML()+'<a class="nav-item" href="#scope" data-nav="scope">'+icon('SlidersHorizontal')+'功能范围</a></div>'`, `menuHTML(true)+'</div>'`);
swap("    $('#persona').innerHTML=data.members.map(m=>option(m.id,(m.role==='manager'?'主管':'聊手')+' · '+m.name,ui.persona)).join('');$('#header-avatar').innerHTML=avatar(me());\n", "    $('#app-shell').dataset.reviewPerspective='聊手 · '+me().name;\n");
swap("const manager=()=>me().role==='manager'", "const manager=()=>subsiteMember.role==='manager'");
swap("    if(t.id==='persona'){ui.persona=t.value;ui.account='all';ui.customerOwner='all';ui.customerTag='all';ui.selected.clear();ui.query='';ui.customer=null;if(['team','members'].includes(ui.view)&&!manager())ui.view='inbox';selectedCustomer();persist();render()}\n", '');
swap("case 'confirmReset':data=clone(window.WA_DEMO);", "case 'confirmReset':data=clone(window.WA_DEMO);fidResetExtras();");
swap("if(t.id==='customer-search'){ui.customerQuery=t.value;ui.selected.clear();updateCustomerRows()}", "if(t.id==='customer-search'&&!t.closest('.fid-customer-filter')){ui.customerQuery=t.value;ui.selected.clear();updateCustomerRows()}");
swap("(c.id===ui.customer?'selected':'')", "(fid.chatOpen&&c.id===ui.customer?'selected':'')");
swap("  function messagesHTML(c) {\n    const list=data.messages[c.id]||(c.preview==='新建客户档案'?[]:[{id:'seed'+c.id,side:'in',text:c.preview,translated:c.translation,time:c.last}]);\n    if(!list.length)return empty('还没有会话消息','写一条演示消息，或选择快捷回复开始。');", "  function conversationMessages(c) {\n    return data.messages[c.id]||(c.preview==='新建客户档案'?[]:[{id:'seed'+c.id,side:'in',text:c.preview,translated:c.translation,time:c.last}]);\n  }\n  function messagesHTML(c,{list=conversationMessages(c),showTranslation=ui.receiveTranslation,emptyHint='写一条演示消息，或选择快捷回复开始。'}={}) {\n    if(!list.length)return empty('还没有会话消息',emptyHint);");
swap("m.side==='in'&&m.translated&&ui.receiveTranslation?", "m.side==='in'&&m.translated&&showTranslation?");
swap(
  `<div class="composer-shortcuts">'+data.quickReplies.filter(q=>!q.owner||manager()||q.owner===ui.persona).slice(0,3).map(q=>'<button class="shortcut" data-action="quick" data-id="'+q.id+'">'+icon('Zap')+esc(q.title)+'</button>').join('')+'<button class="link" data-action="quickAll">快捷回复 '+icon('ChevronRight')+'</button></div>`,
  '',
);
swap("if(t.id==='receive-translation'){ui.receiveTranslation=t.checked;persist();if(ui.view==='inbox'){const c=selectedCustomer();$('#messages').innerHTML=messagesHTML(c);paintIcons($('#messages'))}", "if(t.id==='receive-translation'){ui.receiveTranslation=t.checked;persist();if(ui.view==='inbox'&&$('#messages')){const c=selectedCustomer();$('#messages').innerHTML=messagesHTML(c);paintIcons($('#messages'))}");
// The translation settings were removed on 2026-11-20: the entries in the baseline's tool rail and
// narrow-screen tools menu, the action and its dialog. Sample translations themselves are not affected.
swap(`<button class="icon-button" data-action="translation" aria-label="翻译设置">'+icon('Languages')+'</button>`, '');
swap(`<button data-action="translation">'+icon('Languages')+'翻译设置</button>`, '');
swap("      case 'translation':openTranslation();break;\n", '');
js = js.replace(/^  function openTranslation\(\)\{[^\n]*\}\n/m, '');
assert(!js.includes('openTranslation') && !js.includes('data-action="translation"'), 'the translation settings must be gone from the baseline');
// Translations can come from a real model service now (plan 018): the labels name neither a language nor "sample".
swap("+icon('Languages')+'中文译文</span>", "+icon('Languages')+'译文</span>");
swap("'+esc(c.language)+'示例译文</small>'", "'+esc(c.language)+'译文</small>'");
swap("(d.translated?'示例译文':'发送原文')", "(d.translated?'发送译文':'发送原文')");
swap("(ui.drafts[c.id].translated?'已有示例译文':'发送原文')", "(ui.drafts[c.id].translated?'发送译文':'发送原文')");
// Reply translation and the send guard (plan 020): the words beside the message box, the guard's switch after
// them and the line that explains the Enter key come from the AI module.
swap("(d.translated?'发送译文':'发送原文')+'</span></div><button class=\"send-button\"", "aiDraftHint(c)+'</span>'+aiGuardHTML(c)+'</div><button class=\"send-button\"");
swap("(ui.drafts[c.id].translated?'发送译文':'发送原文')", 'aiDraftHint(c)');
swap("icon('Keyboard')+'Enter 发送，Shift + Enter 换行</span>", "icon('Keyboard')+aiEnterHint(c)+'</span>");
swap('实际接入方式待确认，本轮不会连接 WhatsApp。', '在「号码管理」可体验 OpenWA 扫码绑定。');
swap("      case 'connect':openConnect(id);break;\n      case 'simulateConnect':{const a=account(id);a.state='online';a.lastSync='刚刚';persist();close();render();toast('已模拟恢复在线；没有连接真实 WhatsApp。');break}\n", '');
js = js.replace(/^  function openConnect\(id\)\{[^\n]*\}\n/m, '');
swap("function addActivity(id,text){(data.activities[id]??=[]).unshift({text,by:me().name,time:'刚刚'})}", "function addActivity(id,text){(data.activities[id]??=[]).unshift({text,by:me().name,time:'刚刚',createdAt:new Date().toISOString()});const c=customer(id);if(c)c.updatedAt=new Date().toISOString()}");
swap("const c={id:nextId('c'),name:val('name'),", "const c={id:nextId('c'),createdAt:new Date().toISOString(),name:val('name'),");
swap("layout:'light-sidebar-tabbar-conversation-chat-tools'", "layout:'reference-aligned-scrm-lifecycle'" );
swap("whatsapp-scrm-replica-ui-reviewed.json", "whatsapp-scrm-lifecycle-reviewed.json");
const elementReviewLaunch = '<div class="element-review-launch"><button class="button small" type="button" data-element-review-start>点选界面备注</button><span>也可按 Alt + 左键</span></div>';
swap("icon('PanelsTopLeft')+'</div>'+req.review.items.map", "icon('PanelsTopLeft')+'</div>'+" + JSON.stringify(elementReviewLaunch) + '+req.review.items.map');
js = js.replaceAll('Replica UI v0.1', 'SCRM 跟进闭环原型');
const customerPages = read(__dirname, 'fidelity-customer-pages.js');
const operationsPages = read(__dirname, 'fidelity-operations.js');
const openwaPages = read(__dirname, 'fidelity-openwa.js');
const dashboardPage = read(__dirname, 'fidelity-dashboard.js');
const lifecyclePages = read(__dirname, 'fidelity-lifecycle.js');
const aiPages = read(__dirname, 'fidelity-ai.js');
const subsiteSession = read(__dirname, 'fidelity-subsite.js');
swap('  render();\n})();', [read(__dirname, 'fidelity-ui.js'), customerPages, operationsPages, openwaPages, dashboardPage, lifecyclePages, aiPages, subsiteSession].join('\n') + '\n  render();\n  window.initWAElementReview(toast);\n})();');
// Reviewer tools removed (plan 019): the review panel, the requirements page with its export, and the notes
// tool. The app no longer loads the requirement records; they remain a build-time record in requirements.json.
const cut = (pattern, what) => { const next = js.replace(pattern, ''); assert(next !== js, 'Missing reviewer-tool code: ' + what); js = next; };
cut(/^  let req=clone\(window\.WA_REQUIREMENTS\);\n[\s\S]*?item\.notes=previous\.notes\}\}\}\n/m, 'loading of the requirement records');
swap('{version:6,data,requirements:req,', '{version:6,data,');
swap("$('#pending-count').textContent=req.modules.filter(m=>m.decision==='待定').length;$('.scope-link').classList.toggle('active',ui.view==='scope');", '');
cut(/^    \$\('#app-shell'\)\.dataset\.reviewPerspective=[^\n]*\n/m, 'review perspective');
cut(/^    const reviewed=req\.review\.items[^\n]*\n/m, 'review counter');
swap("ai:'AI 能力',scope:'功能范围'}", "ai:'AI 能力'}");
swap('ai:renderAiPage,scope:renderScope}', 'ai:renderAiPage}');
cut(/^  function scopeCard\(m\) \{\n[\s\S]*?^  function renderScope\(\) \{\n[\s\S]*?^  \}\n/m, 'requirements page');
cut(/^  function openReview\(\)\{[^\n]*\}\n/m, 'review panel');
cut(/^  function exportReq\(\)\{[^\n]*\}\n/m, 'requirements export');
swap("      case 'review':openReview();break;\n      case 'reviewDone':persist();renderNav();paintIcons();close();toast('评审备注已保存在本机，可导出后继续迭代。');break;\n      case 'export':exportReq();break;\n", '');
cut(/^    if\(t\.dataset\.reviewNote\)[^\n]*\n    if\(t\.dataset\.scopeNotes\)[^\n]*\n/m, 'note handlers');
cut(/^    if\(t\.dataset\.reviewStatus\)[^\n]*\n    if\(t\.dataset\.scopeDecision\)[^\n]*\n/m, 'status handlers');
swap('<br><button class="link" data-action="review">记录评审意见</button>', '');
swap('  window.initWAElementReview(toast);\n', '');
assert(!/\breq\b|WA_REQUIREMENTS|openReview|renderScope|scopeCard|exportReq|data-action="review"|data-action="export"|initWAElementReview/.test(js), 'the reviewer tools must be gone from the app');
// The page signs in and keeps its data on the server (plan 023). The app no longer starts by itself:
// fidelity-boot.js loads the signed-in user's data into window.WA_SITE and then calls window.WA_START.
swap("(() => {\n  'use strict';\n  const KEY=", "window.WA_START = () => {\n  'use strict';\n  const KEY=");
swap("let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem('wa-desk-internal-prototype-v02')||localStorage.getItem('wa-desk-internal-prototype-v01')||'null')}catch(e){}", "const UI_KEY=KEY+':'+window.WA_SITE.user.username;\n  let saved=null;try{saved=JSON.parse(localStorage.getItem(UI_KEY)||'null')}catch(e){}");
swap('let data=[6].includes(saved?.version)&&Array.isArray(saved?.data?.customers)?saved.data:clone(window.WA_DEMO);', 'let data=window.WA_SITE.data;');
swap("const subsiteMember=window.WA_DEMO.members.find(m=>m.id==='lin');", 'const subsiteMember=data.members.find(m=>m.id===window.WA_SITE.user.username);');
swap("persona:subsiteMember.id,customer:'c1',", "persona:subsiteMember.id,customer:data.customers[0]?.id||'',");
{
  // Only what belongs to this browser (drafts, open tabs) stays in its storage; the data goes to the server.
  const next = js.replace(/^  function persist\(\)\{[^\n]*\}\n/m, "  function persist(){try{localStorage.setItem(UI_KEY,JSON.stringify({version:6,receiveTranslation:ui.receiveTranslation,drafts:ui.drafts,noteDrafts:ui.noteDrafts,attachments:ui.attachments,openTabs:ui.openTabs,navCollapsed:ui.navCollapsed}))}catch(e){}window.WA_SITE.save(data)}\n");
  assert(next !== js, 'Missing the function that saves');
  js = next;
}
cut(/^      case 'resetDemo':[^\n]*\n      case 'confirmReset':[^\n]*\n/m, 'reset to the sample data');
{
  const next = js.replace(/\n  render\(\);\n\}\)\(\);\n$/, '\n  render();\n};\n');
  assert(next !== js, 'Missing the end of the app');
  js = next;
}
assert(!/clone\(window\.WA_DEMO\)|localStorage\.(setItem|getItem)\(KEY[,)]/.test(js), 'the app must not start from sample data or keep its data in the browser');
// The page uses the real WhatsApp connection (plan 026). A message carries its time and what became of it,
// the conversation with the latest message comes first, and what existed only for the demonstration is gone.
// The functions named here are in fidelity-openwa.js.
swap("const day=m.time.startsWith('昨天')?'昨天':'今天',separator=", 'const day=openwaDayLabel(m),separator=');
swap("esc(m.time.replace('昨天 ',''))+(m.side==='out'?icon(m.local?'Check':'CheckCheck')+(m.local?'<span>本地演示</span>':''):'')", "esc(openwaTimeLabel(m))+(m.side==='out'?openwaMessageMark(m):'')");
swap("emptyHint='写一条演示消息，或选择快捷回复开始。'", "emptyHint='输入消息，或选择快捷回复开始。'");
swap("'</strong><time>'+esc(c.last)+'</time>", "'</strong><time>'+esc(openwaLastLabel(c))+'</time>");
swap('.includes(q));return list}', '.includes(q));return openwaOrder(list)}');
swap('enabled=online&&(d.text.trim()||ui.attachment);', 'enabled=online&&Boolean(d.text.trim());');
swap(`<button class="icon-button" data-action="attachment" aria-label="添加演示附件">'+icon('Paperclip')+'</button>`, '');
swap('aria-label="发送演示消息"', 'aria-label="发送消息"');
swap("(online?'演示会话 · 草稿自动保存':'账号待连接 · 草稿已保留')", "(online?'草稿自动保存':'号码待连接 · 草稿已保留')");
swap('<span class="sample-label">演示来源</span>', '');
swap("toast('演示账号已保存；真实接入尚未执行。')", "toast('账号已保存；在号码管理中扫码绑定后开始收发。')");
swap("error('演示数据中已有该号码。重复客户归属/合并规则待确认。')", "error('已有使用该号码的客户。')");
{
  // Sending goes through the server: fidelity-openwa.js gives send its body.
  const next = js.replace(/^  function send\(\) \{\n[\s\S]*?^  \}\n/m, '  function send() {}\n');
  assert(next !== js, 'Missing the send function of the baseline');
  js = next;
}
// The dialog that added a made-up attachment to a message is gone with its button; real files come with the media step.
cut(/^      case 'attachment':\{[^\n]*\n/m, 'demo attachment dialog');
cut(/^    if\(formId==='attachment-form'\)[^\n]*\n/m, 'demo attachment form');
assert(!/<span>本地演示<\/span>|演示消息|添加演示附件|模拟扫码|模拟掉线|模拟重连|lcSimLeadOpen|lcSimReply|openwaDemoQr/.test(js), 'the app must not simulate the WhatsApp connection');
// Wording of a release (plan 032): the baseline's texts no longer speak of a demonstration, a prototype, a review
// or of saving on this machine. Every pair must be found. The texts of the modules were changed in their files.
for (const [from, to] of [
  ['当前为团队评审视角', '当前为团队视角'],
  ['也可以新增一位演示客户，体验资料、标签和跟进。', '也可以新建一位客户。'],
  ['本地演示附件', '附件'],
  ['来源信息<span class="sample-label">演示</span>', '来源信息'],
  ['已保存到本机', '已保存'],
  ['账号资料与连接状态均为本机演示', '账号资料与连接状态'],
  ['清除筛选，或添加一个演示账号。', '清除筛选，或添加一个账号。'],
  ['人数与账号数可继续扩展。真实 WhatsApp 接入路线在功能评审后确定。', '人数与账号数可继续扩展。'],
  ['调整筛选条件，或创建一位演示客户。', '调整筛选条件，或新建一位客户。'],
  ["+' 权限方案待评审。</span>", "+'</span>"],
  [' 位演示成员 ', ' 位成员 '],
  ['<li>此页是权限方案评审，不代表已实现真实鉴权</li>', '<li>此页的角色说明尚未与登录权限关联</li>'],
  ['接收译文展示和快捷话术填入；本轮是示例交互。', '接收译文展示和快捷话术填入。'],
  ['；现有来源只是示例，真实广告关联和回传待确认。', '；真实广告关联和回传待确认。'],
  ['仅保存演示数据', '保存后同步到服务器'],
  ['先体验账号信息与负责人配置。在「号码管理」可体验 OpenWA 扫码绑定。', '填写账号信息与负责人。扫码绑定在「号码管理」中进行。'],
  ['加入演示账号列表', '添加账号'],
  ['用于评审成员组织与分配。这里只创建演示成员，不会发送邀请或开通真实账号。', '这里只登记成员资料，不会发送邀请，也不会开通登录账号。'],
  ['创建演示成员', '创建成员'],
  ['这个演示只改变客户与未完成跟进的负责人，不移动账号。', '只改变客户与未完成跟进的负责人，不移动账号。'],
  ['确认演示转交', '确认转交'],
  ['原型只做提示，没有自动合并、抢单或改归属。', '这里只做提示，不会自动合并、抢单或改归属。'],
  ['要统一客户还是各聊手独立维护、重复进线由谁跟进，等你评审后确定。', '同一位客户由谁跟进，请在团队内约定。'],
  ['可修改后再发送。此处使用演示话术。', '可修改后再发送。'],
  ['内部演示数据 · 仅用于界面评审', '内部使用'],
  ['刷新演示视图', '刷新视图'],
  ['已刷新当前演示视图。', '已刷新当前视图。'],
  ['已展开示例中文译文。', '已展开中文译文。'],
  ['演示成员已创建，可继续分配账号。', '成员已创建，可继续分配账号。'],
  ['演示账号分配已更新，客户归属未改变。', '账号分配已更新，客户归属未改变。'],
  ['客户与未完成待办已演示转交。账号归属未改变。', '客户与未完成待办已转交。账号归属未改变。'],
]) {
  assert(js.includes(from), 'Missing baseline wording: ' + from);
  js = js.replaceAll(from, to);
}
// The materials screen is hidden until files are real (plan 032): it kept the names of files only. Its code stays in
// fidelity-operations.js; the screen has no title, no route and no menu entry, so old links open the home page.
swap("materials:'素材管理',", '');
swap('materials:renderMaterials,', '');
assert(!/演示|原型|评审|本机|示例|体验/.test(js), 'the app must not speak of a demonstration, a prototype or a review');
// A message shows its picture, voice note, video or file (plan 033): fidelity-openwa.js gives the bubble its
// media and the text under it.
swap(`<div class="message-bubble"><div class="message-text">'+esc(m.text)+'</div>'`, `<div class="message-bubble">'+openwaMediaHTML(c,m)+(openwaCaption(c,m)?'<div class="message-text">'+esc(openwaCaption(c,m))+'</div>':'')`);
// The customer's language is chosen in the conversation and nothing presets it (plan 038): the baseline's chat
// head, the words beside the message box and the strip above the conversation use what fidelity-ai.js gives.
swap("<span>'+esc(c.language)+'</span></div></div><div class=\"chat-heading-acti", "<span>'+esc(aiLanguageLabel(c))+'</span></div></div><div class=\"chat-heading-acti");
swap("<span class=\"language-hint\">'+icon('Languages')+esc(c.language)+' · '+aiDraftHint(c)+'</span>'", "<span class=\"language-hint\">'+icon('Languages')+esc(aiLanguageLabel(c))+' · '+aiDraftHint(c)+'</span>'");
swap("hint.innerHTML=icon('Languages')+esc(c.language)+' · '+aiDraftHint(c);", "hint.innerHTML=icon('Languages')+esc(aiLanguageLabel(c))+' · '+aiDraftHint(c);");
swap("<span>'+esc(c.campaign||'客户来源')+'</span></div>'", "<span>'+esc(c.campaign||'客户来源')+'</span>'+aiLanguagePicker(c)+'</div>'");
new vm.Script(js, {filename:'app.js'});

const requirement = JSON.parse(read(base, 'requirements.json'));
requirement.version = '0.8-scrm-engagement';
requirement.updatedOn = '2026-11-21';
const connection = 'OpenWA 桥接';
Object.assign(requirement.connectionDecision, {
  status: '已确认',
  options: [connection],
  selected: connection,
  provider: 'rmyndharis/OpenWA',
});
requirement.review.items.find(item => item.id === 'CONNECTION').question =
  '首版采用 OpenWA 桥接。请评审 WhatsApp Business 扫码绑定、连接状态和重新绑定流程。';
requirement.review.items.push({
  id: 'ENGAGEMENT',
  title: '客户跟进闭环',
  question: '生命周期阶段与漏斗已暂缓。请评审跟进闭环是否够用：完成跟进时必须安排下一步或结束跟进；客户待回复、跟进已逾期、复联待处理三类提示，只出现在已由人安排或结束跟进的客户上；以自定义标签辅助筛选。',
  status: '待评审',
  notes: '',
});
requirement.review.items.push({
  id: 'CUSTOMER_GRADING',
  title: '客户等级与客户状态',
  question: '客户等级（S / A / B / C / D）与客户状态（已成交 / 弃单 / 自然线索）均为手动设置，可在聊天界面调整。请评审各等级的含义、状态选项是否齐全，以及是否需要在更多位置展示。',
  status: '待评审',
  notes: '',
});
requirement.review.items.push({
  id: 'CHAT_REVIEW',
  title: '聊天记录归档',
  question: '聊天记录只保存从 WhatsApp 会话移入的快照，移入时必须填写原因；不设评分，也不做结论分类。请评审：由谁移入、谁可以查看。',
  status: '待评审',
  notes: '',
});
requirement.review.items.push({
  id: 'AI_HOOKS',
  title: 'AI 能力接入',
  question: 'AI 功能（目前为接收消息翻译与发送前翻译）统一经由一个接入点调用，可逐项启停，并逐次记录用量。服务器配置了模型服务时，翻译由本站服务器中转调用真实模型，密钥只保存在服务器；未配置时不提供翻译。请评审：还需要接入哪些 AI 能力、由谁管理启停与译文语言、用量按什么口径统计，以及中转接口是否需要访问限制。',
  status: '待评审',
  notes: '',
});
requirement.review.items.push({
  id: 'ORDER_TRACKING',
  title: '订单追踪',
  question: '客户档案新增「订单追踪」栏：显示客户首次联系时间，并按订单号分区列出每笔订单，订单号旁显示下单时间。每个订单的分区内，订单每到达一个物流状态就新增一条记录（状态与时间）：登记订单时为「待发货」并带下单时间，此后由两个按钮更新——沿「待发货 → 已发货 → 已签收」逐步推进，或在签收前标记为「异常」；「撤销上一步」可随时撤回最近一步，已签收与异常同样可撤回。订单由聊手手动登记，未对接店铺或物流系统。请评审：物流路径与状态是否齐全，撤销是否需要限制，订单还需要记录哪些信息，日后是否对接业务系统。',
  status: '待评审',
  notes: '',
});
requirement.modelOutline.relationships.push(
  '每个标签包含一个名称并归属一个自建分组。客户可同时使用同组或不同组的多个标签。',
  '客户的跟进由人建立：由人安排了待办的客户为「跟进中」，由人结束的为「已结束跟进」，其余客户没有跟进状态，页面不显示任何跟进信息；结束跟进需填写原因并结清待办，客户再次来信时提示复联，可重新跟进并保留全部历史。',
  '标签完全自定义，用于筛选跟进队列，并可在完成或结束跟进时同步更新。',
  '客户另有两项手动设置的分类：客户等级（S / A / B / C / D，S 最高，默认未评级）与客户状态（已成交 / 弃单 / 自然线索，默认未标记）。两者可在聊天界面或客户档案中随时调整，系统不自动评级或改状态。'
);
Object.assign(requirement.prototypeAssumptions.find(a => a.id === 'A001'), {
  text: '子站固定为已登录聊手的工作范围。顶栏提供退出登录。原型使用固定的演示身份与本地退出流程。',
  decision: '已确认',
});
const stagePresets = requirement.prototypeAssumptions.find(a => a.id === 'A006');
if (stagePresets) stagePresets.text = '语言、来源、备注和跟进时间先提供通用预设，后续可修改。客户不设固定阶段，以自定义标签分类。';
const proposal = requirement.prototypeAssumptions.find(a => a.id === 'A005');
proposal.text = '桌面在原工作台框架上补齐跟进闭环中心、客户档案与待处理信号。窄屏保留自适应切换。';
const teamModule = requirement.modules.find(module => module.id === 'P-TEAM');
Object.assign(teamModule, {
  decision:'本轮不展示', basis:'团队管理归主站', screens:[],
  features:teamModule.features.filter(feature=>feature!=='聊手/主管视角切换'),
  notes:'团队成员、账号分配和交接归主站管理。',
});
const autoIndex = requirement.modules.findIndex(module => module.id === 'P-AUTO');
const auto = requirement.modules[autoIndex];
const broadcastSources = ['ops-mass','D10'];
const deferredByReview = '用户评审备注确认暂缓';
auto.name = '自动回复';
auto.decision = '本轮不展示';
auto.basis = deferredByReview;
auto.originalIds = auto.originalIds.filter(id=>!broadcastSources.includes(id));
auto.features = auto.features.filter(feature=>feature!=='群发');
auto.notes = '关键词回复和欢迎语回复暂缓。';
requirement.modules.splice(autoIndex+1,0,{
  id:'P-BROADCAST', name:'群发', decision:'本轮不展示', basis:deferredByReview,
  originalIds:broadcastSources, screens:[], features:['群发任务'], notes:'群发暂时不做。',
});
requirement.modules.splice(autoIndex,0,{
  id:'P-MATERIALS', name:'素材管理', decision:'保留', basis:'用户评审备注确认保留',
  originalIds:['ops-material'], screens:['materials'], features:['素材分组','素材维护','预览','导入导出'], notes:'素材管理暂不开放：此前只保存文件名，待真实文件收发接入后恢复。',
}, {
  id:'P-REPLY-MANAGEMENT', name:'快捷回复管理', decision:'本轮不展示', basis:deferredByReview,
  originalIds:['ops-reply'], screens:[], features:['公共快捷回复模板维护'], notes:'运营管理的快捷回复页面暂缓。',
});
requirement.modules.unshift(
  {
    id:'P-DASHBOARD', name:'首页经营概览', decision:'首轮原型', basis:'用户要求首页仪表盘',
    originalIds:['HOME'], screens:['dashboard'], features:['未读与跟进概况','跟进闭环信号直达','号码状态与重连','客户来源分布'],
    notes:'汇总当前聊手名下未读、待办与跟进闭环信号。',
  },
  {
    id:'P-LIFECYCLE', name:'客户全生命周期看板', decision:'本轮不展示', basis:'用户确认暂缓（2026-11-17）', originalIds:['CLUE','CUST'], screens:[], features:['按流程切换的闭环看板/明细双视图','防漏健康度雷达','智能阶段推进门禁','360°客户全生命档案','沉睡与流失复联重激活','客户跨流程转移'],
    notes:'阶段、漏斗与交易台账暂缓；聚焦跟进闭环并以标签辅助。实现保留在 Git 历史（v0.7）。',
  },
  {
    id:'P-PIPELINES', name:'生命周期流程配置', decision:'本轮不展示', basis:'用户确认暂缓（2026-11-17）', originalIds:[], screens:[], features:['多条流程并行','阶段增删改与排序','阶段类型与进入时采集','自动流转落点','流失原因按流程维护','删除阶段/流程时迁移客户'],
    notes:'阶段、漏斗与交易台账暂缓；聚焦跟进闭环并以标签辅助。实现保留在 Git 历史（v0.7）。',
  },
  {
    id:'P-DEALS', name:'成交履约与复购中心', decision:'本轮不展示', basis:'用户确认暂缓（2026-11-17）', originalIds:[], screens:[], features:['报价单创建与一键转单','订单发货与签收闭环','签收自动开启复购周期','沉睡老客与暂缓客户唤醒池'],
    notes:'阶段、漏斗与交易台账暂缓；聚焦跟进闭环并以标签辅助。实现保留在 Git 历史（v0.7）。',
  }
);
const follow = requirement.modules.find(module => module.id === 'P-FOLLOW');
Object.assign(follow, {
  name: '跟进闭环',
  features: ['待办队列（逾期/今日/全部）', '完成跟进必须安排下一步或结束跟进', '已结束跟进与重新跟进', '按标签筛选', '操作日志'],
  notes: '每位客户要么有下一步跟进，要么已明确结束跟进。',
});
const customersModule = requirement.modules.find(module => module.id === 'P-CUSTOMERS');
customersModule.features = customersModule.features.map(feature => feature === '客户阶段' ? '跟进状态' : feature);
customersModule.features.push('客户等级（S/A/B/C/D）', '客户状态（已成交/弃单/自然线索）', '按等级与状态筛选', '导出含等级与状态');
customersModule.features.push('订单追踪（首次联系时间、订单下单时间与物流状态，手动登记）');
requirement.modules.find(module => module.id === 'P-TAGS').notes = '标签完全自定义，用于筛选跟进队列，并可在完成或结束跟进时同步更新。';
requirement.modules.find(module => module.id === 'P-INBOX').features.push('会话卡片显示客户标签');
requirement.modules.find(module => module.id === 'P-INBOX').features.push('协同条的跟进状态与下次跟进可跳转到跟进闭环并定位该客户');
requirement.modules.push({
  id:'P-CHAT-REVIEW', name:'聊天记录归档', decision:'首轮原型', basis:'用户要求把会话移入聊天记录用于绩效复盘与审核，不设评分（2026-11-17）',
  originalIds:[], screens:['chat-records'], features:['从 WhatsApp 会话移入快照','移入原因','快照内搜索与译文开关','移出聊天记录'],
  notes:'快照与实时会话相互独立；不设评分，也不做结论分类。',
});
requirement.modelOutline.entities.push('ChatArchive');
requirement.modelOutline.relationships.push('聊天记录是归档：从 WhatsApp 会话移入的快照（ChatArchive）保存移入时的全部消息、移入人、时间与原因，用于绩效复盘与审核；不设评分，也不做结论分类。快照与实时会话相互独立，移入不改变实时会话。');
requirement.modules.push({
  id:'P-AI', name:'AI 能力接入', decision:'首轮原型', basis:'用户要求为后续接入 AI 接口预留接入点（2026-11-17）',
  originalIds:[], screens:['ai','inbox'], features:['统一 AI 接入点','能力清单与逐项启停','逐次用量记录与按能力累计','接收消息翻译与发送前翻译经接入点调用','服务器中转调用模型服务（密钥仅存于服务器）','译文语言设置','回复翻译（语气、业务说明与会话上下文）','发送保护'],
  notes:'服务器配置了模型服务时，翻译经本站服务器中转调用真实模型，密钥不进入浏览器；未配置或以文件方式打开时不提供翻译。中转接口目前不设访问限制。用量记录仅作计量留存，本轮不含商业化内容。',
});
requirement.modules.find(module => module.id === 'P-ASSIST').notes = '翻译经由 AI 接入点调用：服务器配置了模型服务时提供翻译，否则不提供。聊天界面的翻译设置入口与弹窗已于 2026-11-20 移除；接收消息的译文始终显示，译文语言与是否产生译文在「AI 能力」页设置。输入的回复在第一次按 Enter 时译为客户语言并显示在输入框上方，再按一次发送；发送保护开启时，不是客户语言的回复不会直接发出。';
requirement.modelOutline.entities.push('AiUsage');
requirement.modelOutline.relationships.push('所有 AI 调用经由统一接入点：按能力登记，可逐项启停；每次调用留存一条用量记录（AiUsage：时间、能力、提供方、操作人、客户、输入与输出字符数、是否成功），并按能力累计。提供方只有服务器中转（页面只调用本站服务器的 /api/ai 接口，由服务器携带密钥调用模型服务）；服务器未配置或页面以文件方式打开时，AI 能力不运行。');
requirement.modelOutline.entities.push('Order');
requirement.modelOutline.relationships.push('客户档案的订单追踪：订单（Order）归属一位客户，记录订单号、下单时间、当前物流状态与物流记录，由聊手手动登记，每次变更写入互动轨迹；未对接店铺、支付或物流系统。登记订单是独立的一步，新订单的物流状态为待发货；此后推进按钮只能沿「待发货 → 已发货 → 已签收」逐步前进，或在签收前转为「异常」，已签收与异常之后不再有推进。订单每到达一个物流状态就在物流记录中追加一条（状态与时间），第一条为待发货并取下单时间；界面按订单号分区展示这些记录，订单号旁显示下单时间。「撤销上一步」随时移除最新一条物流记录并回到上一个状态，已签收与异常同样可撤回；第一条记录不可撤回，删除订单才会移除。客户首次联系时间取客户建档时间。登记订单不改变客户状态、等级、标签或跟进状态。');

const index = read(__dirname, 'fidelity-index.html');
let lucideIcons = null;
const localLucide = path.join(process.env.USERPROFILE || process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/lucide/dist/cjs/lucide.js');
for (const candidate of ['lucide', localLucide]) {
  try {
    if (candidate === 'lucide' || fs.existsSync(candidate)) {
      lucideIcons = require(candidate).icons;
      if (lucideIcons) break;
    }
  } catch {}
}
if (!lucideIcons && fs.existsSync(path.join(output, 'icons.js'))) {
  lucideIcons = vm.runInNewContext(read(output, 'icons.js') + ';window.WA_ICONS', { window: {} });
}
assert(lucideIcons, 'Unable to load icon definitions');
const names = [...new Set([...(index+js).matchAll(/["']([A-Z][A-Za-z0-9]*)["']/g)].map(m=>m[1]))].filter(n=>Array.isArray(lucideIcons[n]));
const iconJS = 'window.WA_ICONS='+JSON.stringify(Object.fromEntries(names.map(n=>[n,lucideIcons[n]])))+';\n';

// Record new dimensions and colors centrally; component rules use the token references.
let fidelityCSS = read(__dirname, 'fidelity.css')+'\n'+read(__dirname, 'fidelity-dashboard.css')+'\n'+read(__dirname, 'fidelity-lifecycle.css');
const media = [], lengths = new Map();
fidelityCSS = fidelityCSS.replace(/@media[^{}]+/g, s=>`__MEDIA_${media.push(s)-1}__`);
fidelityCSS = fidelityCSS.replace(/-?(?:\d*\.)?\d+px\b/g, value=>{
  const token = '--fid-px-'+value.slice(0,-2).replace('-', 'neg-').replace('.', 'p');
  lengths.set(token,value); return `var(${token})`;
}).replace(/__MEDIA_(\d+)__/g,(_,n)=>media[Number(n)]);
const palette = {bg:'#f5f7fa',surface:'#ffffff','surface-alt':'#f5f7fa',border:'#e5e7eb','border-input':'#dcdfe6',text:'#1e1b4b','text-muted':'#6b7280',accent:'#2f7bff','accent-hover':'#2269e5','accent-soft':'#ecf3ff','on-accent':'#ffffff','bubble-out':'#d9fdd3'};
const referencePaints = {'fid-ink':'#4a4770','fid-violet':'#5436e9','fid-royal':'#3358e8','fid-mint':'#24b95e','fid-mint-bg':'#edf8f1','fid-chat':'#efeae0','fid-quiet':'#8b91a2','fid-frame':'#e6e8ef','fid-disabled':'#f0f2f5','fid-shadow':'#1720390b','fid-inbox':'#d5d7df','fid-amber':'#a86813'};
const tokenCSS = read(base,'tokens.css')+'\n:root {\n'+Object.entries(palette).map(([k,v])=>`  --color-${k}:${v};`).concat(Object.entries(referencePaints).map(([k,v])=>`  --${k}:${v};`),[...lengths].map(([k,v])=>`  ${k}:${v};`)).join('\n')+'\n}\n';

const assets = {
  'index.html':index,'app.js':js,'app.css':read(base,'app.css')+'\n'+fidelityCSS,
  'tokens.css':tokenCSS,'components.css':read(base,'components.css'),
  'icons.js':iconJS,'boot.js':read(__dirname,'fidelity-boot.js'),
  'lucide-license.txt':read(base,'lucide-license.txt'),
  'requirements.json':JSON.stringify(requirement,null,2)+'\n',
};
for(const [file,content] of Object.entries(assets))write(output,file,content);
console.log(JSON.stringify({version:requirement.version,base:'0.4-replica-ui',historicalFilesUnchanged:verifiedBaselineCount,icons:names.length,bytes:Buffer.byteLength(js),externalNetwork:false},null,2));
