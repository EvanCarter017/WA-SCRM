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
      const previousDefaultNotes={'P-AUTO':'不因原产品存在而自动纳入。','P-TEAM':'角色切换仅用于原型评审，不是生产鉴权。'};
      const revisedScope=Object.hasOwn(previousDefaultNotes,module.id)&&previous.basis!==module.basis;
      if(!revisedScope)module.decision=previous.decision;
      if(!revisedScope||previous.notes!==previousDefaultNotes[module.id])module.notes=previous.notes;
    }`);
swap("const views={inbox:'聚合会话',accounts:'WhatsApp账号',customers:'客户列表',tags:'标签管理',followups:'跟进管理',team:'团队与权限',scope:'功能范围'};", `const views={dashboard:'首页',lifecycle:'全周期看板',inbox:'WhatsApp API',accounts:'账号列表',customers:'客户列表',followups:'跟进与待办',deals:'成交与复购','chat-records':'聊天记录',tags:'标签管理','tag-stats':'标签统计',materials:'素材管理',team:'组织架构',members:'账号管理',pipelines:'流程配置',scope:'功能范围'};
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
swap('const pages={inbox:renderInbox', 'const pages={dashboard:renderDashboard,lifecycle:renderLifecycle,inbox:renderInbox');
swap('team:renderTeam,scope:renderScope', "team:renderTeam,members:renderMembers,deals:renderDeals,'chat-records':renderChatRecords,'tag-stats':renderTagStats,materials:renderMaterials,pipelines:renderPipelines,scope:renderScope");
swap("'P-AUTO':'关键词自动回复、欢迎语及群发是否需要，本轮未预先纳入。'", "'P-AUTO':'关键词回复和欢迎语回复暂缓。','P-BROADCAST':'群发任务和在线聊天的群发功能暂缓。','P-LIFECYCLE':'按可配置流程展示客户全生命周期的防漏闭环看板；预设「零售客户」7 阶段与「大B经销商」8 阶段两条流程。','P-PIPELINES':'阶段名称、数量、顺序、类型、进入时采集内容与自动流转落点均可配置，支持多条流程并行。','P-DEALS':'在途报价转单、订单发货签收联动复购周期及老客唤醒台账。'");
swap('聊手管理自己的工作，主管查看团队并处理分配。', '团队成员、账号分配和客户交接由主站管理。');
const deferredScopeIds = JSON.stringify(['P-COMMERCIAL','P-TEAM','P-AUTO','P-REPLY-MANAGEMENT','P-BROADCAST']);
swap("m.id!=='P-COMMERCIAL'||m.id==='P-ATTRIBUTION'", `!${deferredScopeIds}.includes(m.id)||m.id==='P-ATTRIBUTION'`);
swap("req.modules.filter(m=>m.id==='P-COMMERCIAL')", `req.modules.filter(m=>${deferredScopeIds}.includes(m.id))`);
swap("if(['customers','tags','followups'].includes(nav.dataset.nav))ui.customerNavOpen=true;", 'if(customerMenu.includes(nav.dataset.nav)||nav.dataset.nav==="deals")ui.customerNavOpen=true;if(operationsMenu.includes(nav.dataset.nav))fid.operationsOpen=true;');
swap("(id==='inbox'?'':'<button class=\"icon-button\" aria-label=\"关闭'", "(id==='inbox'||id==='dashboard'||id==='lifecycle'||id!==ui.view?'':'<button class=\"icon-button\" aria-label=\"关闭'");
swap("case 'closeTab':{if(id==='inbox')break;", "case 'closeTab':{if(id==='inbox'||id==='dashboard'||id==='lifecycle')break;");
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
swap('实际接入方式待确认，本轮不会连接 WhatsApp。', '在「号码管理」可体验 OpenWA 扫码绑定。');
swap("      case 'connect':openConnect(id);break;\n      case 'simulateConnect':{const a=account(id);a.state='online';a.lastSync='刚刚';persist();close();render();toast('已模拟恢复在线；没有连接真实 WhatsApp。');break}\n", '');
js = js.replace(/^  function openConnect\(id\)\{[^\n]*\}\n/m, '');
swap("function addActivity(id,text){(data.activities[id]??=[]).unshift({text,by:me().name,time:'刚刚'})}", "function addActivity(id,text){(data.activities[id]??=[]).unshift({text,by:me().name,time:'刚刚',createdAt:new Date().toISOString()});const c=customer(id);if(c)c.updatedAt=new Date().toISOString()}");
swap("const c={id:nextId('c'),name:val('name'),", "const c={id:nextId('c'),createdAt:new Date().toISOString(),name:val('name'),");
swap("layout:'light-sidebar-tabbar-conversation-chat-tools'", "layout:'reference-aligned-scrm-lifecycle'" );
swap("whatsapp-scrm-replica-ui-reviewed.json", "whatsapp-scrm-lifecycle-reviewed.json");
const elementReviewLaunch = '<div class="element-review-launch"><button class="button small" type="button" data-element-review-start>点选界面备注</button><span>也可按 Alt + 左键</span></div>';
swap("icon('PanelsTopLeft')+'</div>'+req.review.items.map", "icon('PanelsTopLeft')+'</div>'+" + JSON.stringify(elementReviewLaunch) + '+req.review.items.map');
js = js.replaceAll('Replica UI v0.1', 'SCRM 全周期闭环原型');
const customerPages = read(__dirname, 'fidelity-customer-pages.js');
const operationsPages = read(__dirname, 'fidelity-operations.js');
const openwaPages = read(__dirname, 'fidelity-openwa.js');
const dashboardPage = read(__dirname, 'fidelity-dashboard.js');
const pipelineDefinitions = read(__dirname, 'fidelity-pipelines.js');
const lifecyclePages = read(__dirname, 'fidelity-lifecycle.js');
const pipelineSettings = read(__dirname, 'fidelity-pipeline-settings.js');
const subsiteSession = read(__dirname, 'fidelity-subsite.js');
swap('  render();\n})();', [read(__dirname, 'fidelity-ui.js'), customerPages, operationsPages, openwaPages, dashboardPage, pipelineDefinitions, lifecyclePages, pipelineSettings, subsiteSession].join('\n') + '\n  render();\n  window.initWAElementReview(toast);\n})();');
new vm.Script(js, {filename:'app.js'});

const requirement = JSON.parse(read(base, 'requirements.json'));
requirement.version = '0.7-scrm-pipelines';
requirement.updatedOn = '2026-11-17';
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
  id: 'LIFECYCLE',
  title: '客户全生命周期闭环',
  question: '生命周期已改为可配置流程：预设「零售客户」与「大B经销商」两条。请评审各流程的阶段划分、进入阶段时的采集内容、自动流转落点、防断档跟进与复购提醒是否契合实际业务，并在「流程配置」中直接调整。',
  status: '待评审',
  notes: '',
});
requirement.modelOutline.entities.push('Pipeline', 'PipelineStage', 'Quote', 'Order', 'LifecycleTransition');
requirement.modelOutline.relationships.push(
  '每个标签包含一个名称并归属一个自建分组。客户可同时使用同组或不同组的多个标签。',
  '每位客户归属一条流程（Pipeline）并处于其中一个阶段（PipelineStage）。阶段以稳定 ID 存储，名称、顺序与数量可配置；与自定义标签解耦。',
  '系统行为由阶段类型（转化推进 / 成交与存量 / 沉睡唤醒 / 流失归档）、进入时采集内容和流程的自动流转落点决定，不依赖阶段名称。沉睡与流失客户来信支持保留历史档案重激活回流。',
  '报价单可一键转成交订单，订单确认签收后自动开启复购周期窗口并衔接关怀待办。'
);
Object.assign(requirement.prototypeAssumptions.find(a => a.id === 'A001'), {
  text: '子站固定为已登录聊手的工作范围。顶栏提供退出登录。原型使用固定的演示身份与本地退出流程。',
  decision: '已确认',
});
const stagePresets = requirement.prototypeAssumptions.find(a => a.id === 'A006');
if (stagePresets) stagePresets.text = '客户阶段以流程预设提供（零售客户、大B经销商），可在「流程配置」中增删改阶段、调整顺序与自动流转，或新建流程。语言、来源、备注和跟进时间先提供通用预设，后续可修改。';
const proposal = requirement.prototypeAssumptions.find(a => a.id === 'A005');
proposal.text = '桌面在原工作台框架上补齐 WhatsApp 客户全生命周期看板、360° 档案、防漏跟进与报价订单复购闭环。窄屏保留自适应切换。';
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
  originalIds:['ops-material'], screens:['materials'], features:['素材分组','素材维护','预览','导入导出'], notes:'运营管理保留素材管理。',
}, {
  id:'P-REPLY-MANAGEMENT', name:'快捷回复管理', decision:'本轮不展示', basis:deferredByReview,
  originalIds:['ops-reply'], screens:[], features:['公共快捷回复模板维护'], notes:'运营管理的快捷回复页面暂缓。',
});
requirement.modules.unshift(
  {
    id:'P-DASHBOARD', name:'首页经营与全周期概览', decision:'首轮原型', basis:'用户要求首页仪表盘与生命周期总览',
    originalIds:['HOME'], screens:['dashboard'], features:['未读与跟进概况','各流程全周期漏斗','防漏雷达直达','号码状态与重连','客户来源分布'],
    notes:'汇总当前聊手名下客户全周期分布、在途报价、累计成交 LTV 与防漏信号。',
  },
  {
    id:'P-LIFECYCLE', name:'客户全生命周期看板', decision:'首轮原型', basis:'用户明确补充 WhatsApp 客户全生命流程闭环',
    originalIds:['CLUE','CUST'], screens:['lifecycle'], features:['按流程切换的闭环看板/明细双视图','防漏健康度雷达','智能阶段推进门禁','360°客户全生命档案','沉睡与流失复联重激活','客户跨流程转移'],
    notes:'覆盖从加微进线破冰到复购培育与流失回流的完整闭环；阶段来自流程配置。',
  },
  {
    id:'P-PIPELINES', name:'生命周期流程配置', decision:'首轮原型', basis:'SCRM 需适配不同客户类型与业务变化，阶段不应写死',
    originalIds:[], screens:['pipelines'], features:['多条流程并行','阶段增删改与排序','阶段类型与进入时采集','自动流转落点','流失原因按流程维护','删除阶段/流程时迁移客户'],
    notes:'正式版由主管在主站维护；原型开放编辑供评审。',
  },
  {
    id:'P-DEALS', name:'成交履约与复购中心', decision:'首轮原型', basis:'全生命周期交易与存量复购闭环必需',
    originalIds:[], screens:['deals'], features:['报价单创建与一键转单','订单发货与签收闭环','签收自动开启复购周期','沉睡老客与暂缓客户唤醒池'],
    notes:'以轻量 SCRM 交易与履约台账打通成单后半程生命周期，不越界做重型进销存。',
  }
);
const requirementJS = 'window.WA_REQUIREMENTS='+JSON.stringify(requirement)+';\n';

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
  'demo-data.js':read(base,'demo-data.js'),'icons.js':iconJS,
  'element-review.js':read(__dirname,'review-prompt-format.js')+'\n'+read(__dirname,'element-review.js'),
  'lucide-license.txt':read(base,'lucide-license.txt'),'requirements-data.js':requirementJS,
  'requirements.json':JSON.stringify(requirement,null,2)+'\n',
};
let standalone=index.replace('<head>',()=>'<head>\n<!-- Lucide license\n'+assets['lucide-license.txt'].replaceAll('-->','-- >')+'\n-->');
standalone=standalone.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,file)=>'<style>'+assets[file]+'</style>').replace(/<script src="([^"]+)"><\/script>/g,(_,file)=>'<script>'+assets[file].replace(/<\/script/gi,'<\\/script')+'</script>');
assert(!/chm123\.com|reference-accounts\.png|<script\b[^>]*\bsrc=/.test(standalone));
for(const script of standalone.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
for(const [file,content] of Object.entries(assets))write(output,file,content);
write(path.join(root,'outputs'),'whatsapp-replica-ui-fidelity.html',standalone);
write(path.join(root,'outputs'),'whatsapp-scrm-lifecycle.html',standalone);
console.log(JSON.stringify({version:requirement.version,base:'0.4-replica-ui',historicalFilesUnchanged:verifiedBaselineCount,icons:names.length,bytes:Buffer.byteLength(standalone),externalNetwork:false},null,2));
