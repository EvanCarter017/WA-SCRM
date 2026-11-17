(() => {
  'use strict';
  const KEY='wa-desk-scrm-lifecycle-v06';
  const clone=x=>JSON.parse(JSON.stringify(x));
  let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem('wa-desk-internal-prototype-v02')||localStorage.getItem('wa-desk-internal-prototype-v01')||'null')}catch(e){}
  let data=[6].includes(saved?.version)&&Array.isArray(saved?.data?.customers)?saved.data:clone(window.WA_DEMO);
  let req=clone(window.WA_REQUIREMENTS);
  if(saved?.requirements){for(const module of req.modules){const previous=saved.requirements.modules?.find(x=>x.id===module.id);if(previous){
      const previousDefaultNotes={'P-AUTO':'不因原产品存在而自动纳入。','P-TEAM':'角色切换仅用于原型评审，不是生产鉴权。'};
      const revisedScope=Object.hasOwn(previousDefaultNotes,module.id)&&previous.basis!==module.basis;
      if(!revisedScope)module.decision=previous.decision;
      if(!revisedScope||previous.notes!==previousDefaultNotes[module.id])module.notes=previous.notes;
    }}for(const item of req.review.items){const previous=saved.requirements.review?.items?.find(x=>x.id===item.id);if(previous){item.status=previous.status;item.notes=previous.notes}}}
  const views={dashboard:'首页',lifecycle:'全周期看板',inbox:'WhatsApp API',accounts:'账号列表',customers:'客户列表',followups:'跟进与待办',deals:'成交与复购','chat-records':'聊天记录',tags:'标签管理','tag-stats':'标签统计',materials:'素材管理',team:'组织架构',members:'账号管理',pipelines:'流程配置',scope:'功能范围'};
  const defaultView=['numbers','chat'].includes(new URLSearchParams(location.search).get('tab'))?'inbox':'dashboard';
  const subsiteMember=window.WA_DEMO.members.find(m=>m.id==='lin');
  const ui={view:Object.hasOwn(views,location.hash.slice(1))?location.hash.slice(1):defaultView,persona:subsiteMember.id,customer:'c1',account:'all',conversationFilter:'all',query:'',customerQuery:'',customerTag:'all',customerStage:'all',customerOwner:'all',tagScope:'team',taskFilter:'pending',profileTab:'details',mobileChat:false,selected:new Set(),drafts:saved?.drafts||{},noteDrafts:saved?.noteDrafts||{},attachments:saved?.attachments||{},profileOpen:saved?.profileOpen!==false,receiveTranslation:saved?.receiveTranslation!==false,attachment:null};
  Object.assign(ui,{openTabs:saved?.openTabs||['inbox','accounts','customers','tags','followups'],navCollapsed:saved?.navCollapsed||false,customerNavOpen:true,accountQuery:'',accountStatus:'all',tagGroup:'all',tagQuery:'',pages:{},pageSizes:{}});
  Object.defineProperty(ui,'attachment',{get(){return ui.customer?ui.attachments[ui.customer]||null:null},set(value){if(ui.customer){if(value)ui.attachments[ui.customer]=value;else delete ui.attachments[ui.customer]}}});
  if(!data.members.some(m=>m.id===ui.persona)){
    data.members.push(clone(subsiteMember));
  }
  let toastTimer=null;
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=(name,cls='')=>'<span class="icon '+cls+'" data-icon="'+name+'" aria-hidden="true"></span>';
  function paintIcons(root=document) {
    for(const el of root.querySelectorAll('[data-icon]')) {
      const nodes=window.WA_ICONS[el.dataset.icon]; if(!nodes)continue;
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      for(const [k,v] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(k,v);
      for(const [tag,attrs] of nodes){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))if(k!=='key')n.setAttribute(k,String(v));svg.append(n)}
      el.classList.add('icon');el.replaceChildren(svg);el.removeAttribute('data-icon');
    }
    root.querySelectorAll('button:not([type])').forEach(b=>b.type='button');
    root.querySelectorAll('button[aria-label]').forEach(b=>{if(!b.title)b.title=b.getAttribute('aria-label')});
    root.querySelectorAll('input:not([autocomplete]),textarea:not([autocomplete])').forEach(t=>t.autocomplete='off');
    root.querySelectorAll('input,textarea,select').forEach(t=>{if(!t.name)t.name=t.id||Object.entries(t.dataset).map(([k,v])=>k+'-'+v).join('-')||'field'});
    root.querySelectorAll('input[name="phone"],input[name="number"]').forEach(t=>{t.type='tel';t.inputMode='tel'});
  }
  const me=()=>data.members.find(m=>m.id===ui.persona);
  const manager=()=>subsiteMember.role==='manager';
  const member=id=>data.members.find(m=>m.id===id);
  const account=id=>data.accounts.find(a=>a.id===id);
  const customer=id=>data.customers.find(c=>c.id===id);
  const group=id=>data.tagGroups.find(g=>g.id===id);
  const tag=id=>data.tags.find(t=>t.id===id);
  const myAccounts=()=>data.accounts.filter(a=>manager()||a.owner===ui.persona);
  const myCustomers=()=>data.customers.filter(c=>manager()||c.owner===ui.persona);
  const myTasks=()=>data.tasks.filter(t=>manager()||t.owner===ui.persona);
  const myTags=()=>data.tags.filter(t=>{const g=group(t.group);return g&&(g.scope==='team'||g.owner===ui.persona||manager())});
  const nextId=prefix=>prefix+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const initial=s=>String(s||'新').split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase();
  const avatar=(c,classes='')=>'<span class="avatar '+esc(c.color||'jade')+' '+classes+'">'+esc(c.initials||c.initial||initial(c.name))+'</span>';
  const country=c=>c.country==='PR'?'波多黎各':c.country==='US'?'美国':c.country;
  const sameDay=(a,b=new Date())=>new Date(a).toDateString()===b.toDateString();
  const beforeToday=a=>{const d=new Date();d.setHours(0,0,0,0);return new Date(a)<d};
  function dateLabel(a,includeTime=true){if(!a)return '未设置';const d=new Date(a);if(Number.isNaN(d.getTime()))return '未设置';return (sameDay(a)?'今天':new Intl.DateTimeFormat('zh-CN',{month:'numeric',day:'numeric'}).format(d))+(includeTime?' '+d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}):'')}
  const inputDate=a=>{const d=a?new Date(a):new Date(Date.now()+3600000);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
  const option=(value,label,selected)=>'<option value="'+esc(value)+'"'+(value===selected?' selected':'')+'>'+esc(label)+'</option>';
  const stateText=a=>'<span class="state-text '+(a.state==='reconnect'?'warn':'')+'"><span class="state-dot '+(a.state==='reconnect'?'warning':a.state==='pending'?'offline':'')+'"></span>'+(a.state==='online'?'在线':a.state==='reconnect'?'需重新连接':'待连接')+'</span>';
  function tagsHTML(c,max=99,remove=false){return c.tags.filter(id=>tag(id)).slice(0,max).map(id=>{const t=tag(id);return '<span class="tag '+esc(t.color)+'">'+esc(t.name)+(remove?'<button class="icon-button" aria-label="移除标签'+esc(t.name)+'" data-action="removeTag" data-customer="'+c.id+'" data-id="'+t.id+'">'+icon('X')+'</button>':'')+'</span>'}).join('')}
  const unreadCount=()=>myCustomers().reduce((n,c)=>n+c.unread,0);
  const pendingTasks=()=>myTasks().filter(t=>!t.done);
  const draft=c=>ui.drafts[c.id]||{text:'',translated:'',source:''};
  function persist(){try{localStorage.setItem(KEY,JSON.stringify({version:6,data,requirements:req,receiveTranslation:ui.receiveTranslation,drafts:ui.drafts,noteDrafts:ui.noteDrafts,attachments:ui.attachments,openTabs:ui.openTabs,navCollapsed:ui.navCollapsed}))}catch(e){toast('浏览器未允许本机保存，请导出需求与评审留档。')}}
  function toast(message,undo=null) {
    const box=$('#toast'),host=$('#dialog').open?$('#dialog'):document.body;if(box.parentElement!==host)host.append(box);box.dataset.dismissOnClose=undo&&$('#dialog').open?'1':'';box.replaceChildren(document.createTextNode(message));
    if(undo){const button=document.createElement('button');button.type='button';button.textContent='撤销';button.addEventListener('click',()=>{undo();box.classList.remove('show')},{once:true});box.append(button)}
    box.classList.add('show');clearTimeout(toastTimer);if(!undo)toastTimer=setTimeout(()=>box.classList.remove('show'),3800);
  }
  function addActivity(id,text){(data.activities[id]??=[]).unshift({text,by:me().name,time:'刚刚',createdAt:new Date().toISOString()});const c=customer(id);if(c)c.updatedAt=new Date().toISOString()}
  function navigate(view,historyMode='push') {
    ui.view=Object.hasOwn(views,view)?view:defaultView;if(['team','members'].includes(ui.view)&&!manager())ui.view='inbox';ui.selected.clear();
    if(location.hash!=='#'+ui.view)history[historyMode==='replace'?'replaceState':'pushState'](null,'','#'+ui.view);
    render();
  }
  function selectedCustomer(){const scope=myCustomers().filter(c=>ui.view!=='inbox'||ui.account==='all'||c.account===ui.account);let c=customer(ui.customer);if(!c||!scope.some(x=>x.id===c.id)){c=scope[0];ui.customer=c?.id||null}return c}
  function renderNav() {
    const allowed=Object.keys(views).filter(id=>!['team','members'].includes(id)||manager());ui.openTabs=ui.openTabs.filter(id=>allowed.includes(id));if(!ui.openTabs.includes(ui.view))ui.openTabs.push(ui.view);
    $('#app-shell').classList.toggle('nav-collapsed',ui.navCollapsed);
    $('#nav').innerHTML=menuHTML();$('#pending-count').textContent=req.modules.filter(m=>m.decision==='待定').length;$('.scope-link').classList.toggle('active',ui.view==='scope');
    $('#app-shell').dataset.reviewPerspective='聊手 · '+me().name;
    $('#header-tasks').textContent=pendingTasks().length;$('#header-tasks').hidden=!pendingTasks().length;
    const reviewed=req.review.items.filter(i=>i.notes||i.status!=='待评审').length;$('#review-count').textContent=reviewed;$('#review-count').hidden=!reviewed;
    $('#workspace-tabs').innerHTML=ui.openTabs.map(id=>'<div class="workspace-tab '+(id===ui.view?'active':'')+'"><a href="#'+id+'" data-nav="'+id+'"'+(id===ui.view?' aria-current="page"':'')+'>'+icon(viewIcon(id))+'<span>'+views[id]+'</span></a>'+(id==='inbox'||id==='dashboard'||id==='lifecycle'||id!==ui.view?'':'<button class="icon-button" aria-label="关闭'+views[id]+'页签" data-action="closeTab" data-id="'+id+'">'+icon('X')+'</button>')+'</div>').join('');
    const collapse=$('.collapse-button');collapse.setAttribute('aria-label',ui.navCollapsed?'展开菜单':'折叠菜单');collapse.innerHTML=icon(ui.navCollapsed?'PanelLeftOpen':'PanelLeftClose')+'<span class="nav-label">'+(ui.navCollapsed?'展开':'收起')+'</span>';
    if(location.hash!=='#'+ui.view)history.replaceState(null,'','#'+ui.view);persist();
  }
  function render() {
    if(!renderSignInState())return;
    const active=document.activeElement,action=active?.dataset?.action,actionId=active?.dataset?.id,activeId=active?.id,stage=active?.dataset?.stage,nav=active?.dataset?.nav;
    const old=$('#messages'),position=old?{customer:old.dataset.customer,top:old.scrollTop,bottom:old.scrollHeight-old.clientHeight-old.scrollTop}:null;
    renderNav();const pages={dashboard:renderDashboard,lifecycle:renderLifecycle,inbox:renderInbox,accounts:renderAccounts,customers:renderCustomers,tags:renderTags,followups:renderFollowups,team:renderTeam,members:renderMembers,deals:renderDeals,'chat-records':renderChatRecords,'tag-stats':renderTagStats,materials:renderMaterials,pipelines:renderPipelines,scope:renderScope};
    $('#view').innerHTML=pages[ui.view]();paintIcons();
    if(ui.view==='inbox')requestAnimationFrame(()=>{const el=$('#messages');if(el)el.scrollTop=position&&position.customer===el.dataset.customer&&position.bottom>40?position.top:el.scrollHeight});
    let target=activeId?document.getElementById(activeId):null;
    if(!target&&action)target=[...document.querySelectorAll('[data-action]')].find(e=>e.dataset.action===action&&e.dataset.id===actionId);
    if(!target&&stage)target=document.querySelector('[data-stage="'+stage+'"]');
    if(!target&&nav)target=document.querySelector('[data-nav="'+nav+'"]');
    if(target&&target.getBoundingClientRect().width>0)target.focus({preventScroll:true});
  }
  function pageHeader(unused,title,desc,actions=''){return '<div class="page-heading"><div><h1>'+title+'</h1><p>'+desc+'</p></div><div class="heading-actions">'+actions+'</div></div>'}
  function empty(title,description){return '<div class="empty-state">'+icon('Inbox')+'<strong>'+esc(title)+'</strong><p>'+esc(description)+'</p></div>'}
  function filteredConversations(){let list=myCustomers().filter(c=>ui.account==='all'||c.account===ui.account);if(ui.conversationFilter==='unread')list=list.filter(c=>c.unread>0);if(ui.conversationFilter==='reply')list=list.filter(c=>((data.messages[c.id]||[]).at(-1)?.side||'in')==='in');if(ui.conversationFilter==='star')list=list.filter(c=>c.star);const q=ui.query.trim().toLowerCase();if(q)list=list.filter(c=>[c.name,c.phone,c.notes,account(c.account)?.name].join(' ').toLowerCase().includes(q));return list}
  function conversationRows() {
    return filteredConversations().map(c=>{const a=account(c.account);return '<button class="conversation '+(fid.chatOpen&&c.id===ui.customer?'selected':'')+'" aria-label="打开'+esc(c.name)+'的会话" data-action="openConversation" data-id="'+c.id+'">'+avatar(c)+'<span class="conversation-main"><span class="conversation-line"><strong>'+esc(c.name)+'</strong><time>'+esc(c.last)+'</time></span><span class="conversation-preview"><span>'+esc(c.preview)+'</span>'+(c.unread?'<span class="unread">'+c.unread+'</span>':'')+'</span><span class="conversation-account"><span>'+(ui.account==='all'?'<span class="state-dot '+(a?.state==='online'?'':a?.state==='pending'?'offline':'warning')+'"></span>'+esc(a?.name):esc(c.stage))+'</span>'+(c.star?icon('Star'):'<span class="mini-stage">'+esc(tag(c.tags[0])?.name||c.stage)+'</span>')+'</span></span></button>'}).join('')||empty('没有匹配会话','切换筛选，或清空搜索后再试。');
  }
  function renderInbox() {
    const c=selectedCustomer();
    return '<section class="inbox-page"><div class="workspace-switch" aria-label="WhatsApp 工作区"><a class="active" href="#inbox" data-nav="inbox">'+icon('MessagesSquare')+'聚合会话</a><a href="#accounts" data-nav="accounts">'+icon('PanelsTopLeft')+'账号列表</a></div><div class="inbox-layout '+(ui.mobileChat?'mobile-chat':'mobile-list')+'"><section class="conversation-pane" aria-label="会话列表"><div class="conversation-top"><div class="conversation-title"><h1>客户会话 <span>'+myCustomers().filter(c=>ui.account==='all'||c.account===ui.account).length+'</span></h1><button class="icon-button" data-action="addCustomer" aria-label="新增客户">'+icon('SquarePen')+'</button></div><div class="account-select">'+icon('MessageCircle')+'<select id="account-filter" aria-label="按 WhatsApp 账号查看">'+option('all',manager()?'全部团队账号':'我的全部账号',ui.account)+myAccounts().map(a=>option(a.id,a.name+(a.state!=='online'?' · 待连接':''),ui.account)).join('')+'</select>'+icon('ChevronDown')+'</div><label class="search-field">'+icon('Search')+'<input id="conversation-search" aria-label="搜索会话" placeholder="搜索客户或号码…" value="'+esc(ui.query)+'"></label><div class="chips" role="group" aria-label="会话筛选">'+[['all','全部'],['unread','未读'],['reply','待回复'],['star','星标']].map(([id,title])=>'<button class="chip '+(ui.conversationFilter===id?'active':'')+'" data-action="conversationFilter" data-id="'+id+'" aria-pressed="'+(ui.conversationFilter===id)+'">'+title+'</button>').join('')+'</div></div><div class="conversation-list" id="conversation-list">'+conversationRows()+'</div><div class="conversation-footer">'+icon('ShieldCheck')+(manager()?'当前为团队评审视角':'当前为我的工作范围')+'</div></section>'+(c?chatHTML(c):'<section class="chat-pane"><div class="chat-empty">'+empty('选择客户后继续沟通','也可以新增一位演示客户，体验资料、标签和跟进。')+'</div></section>')+toolsRailHTML(c)+'</div></section>';
  }
  function chatHTML(c) {
    const a=account(c.account),online=a?.state==='online';return '<section class="chat-pane" aria-label="'+esc(c.name)+'的会话"><div class="chat-heading"><button class="icon-button back-list" data-action="backList" aria-label="返回会话列表">'+icon('ArrowLeft')+'</button>'+avatar(c)+'<div class="chat-person"><h2>'+esc(c.name)+'</h2><div class="customer-sub"><span>'+esc(a?.name)+'</span><span class="separator"></span><span>'+esc(c.language)+'</span></div></div><div class="chat-heading-actions"><button class="icon-button star-action '+(c.star?'active':'')+'" data-action="star" data-id="'+c.id+'" aria-label="'+(c.star?'取消星标':'星标客户')+'" aria-pressed="'+c.star+'">'+icon('Star')+'</button><button class="button small" data-action="followup" data-id="'+c.id+'">'+icon('CalendarPlus')+'安排跟进</button><button class="icon-button mobile-profile" data-action="profile" data-id="'+c.id+'" aria-label="查看客户资料">'+icon('ContactRound')+'</button><button class="icon-button mobile-tools" data-action="chatTools" data-id="'+c.id+'" aria-label="更多会话工具">'+icon('EllipsisVertical')+'</button></div></div><div class="source-strip">'+icon(c.source==='Facebook 广告'?'Target':'Link')+'<strong>'+esc(c.source)+'</strong><span>'+esc(c.campaign||'客户来源')+'</span><span class="sample-label">演示来源</span></div>'+(online?'':'<div class="connection-banner">'+icon('WifiOff')+'<div><strong>'+esc(a?.name||'账号')+' 待连接</strong><span>当前草稿会保留，连接后可继续处理。</span></div><button class="button small" data-action="connect" data-id="'+c.account+'">重新连接</button></div>')+'<div class="messages" id="messages" data-customer="'+c.id+'" role="log" aria-label="会话消息" tabindex="0">'+messagesHTML(c)+'</div>'+composerHTML(c)+'</section>';
  }
  function conversationMessages(c) {
    return data.messages[c.id]||(c.preview==='新建客户档案'?[]:[{id:'seed'+c.id,side:'in',text:c.preview,translated:c.translation,time:c.last}]);
  }
  function messagesHTML(c,{list=conversationMessages(c),showTranslation=ui.receiveTranslation,emptyHint='写一条演示消息，或选择快捷回复开始。'}={}) {
    if(!list.length)return empty('还没有会话消息',emptyHint);
    let lastDay='';return list.map(m=>{const day=m.time.startsWith('昨天')?'昨天':'今天',separator=day!==lastDay?'<div class="day-separator">'+day+'</div>':'';lastDay=day;return separator+'<div class="message-row '+(m.side==='out'?'out':'')+'"><div><div class="message-bubble"><div class="message-text">'+esc(m.text)+'</div>'+(m.attachment?'<div class="attachment">'+icon('File')+esc(m.attachment)+'</div>':'')+(m.side==='in'&&m.translated&&showTranslation?'<div class="message-translation"><span class="translation-label">'+icon('Languages')+'中文译文</span><div>'+esc(m.translated)+'</div></div>':'')+'</div><div class="message-meta">'+esc(m.time.replace('昨天 ',''))+(m.side==='out'?icon(m.local?'Check':'CheckCheck')+(m.local?'<span>本地演示</span>':''):'')+'</div></div></div>'}).join('');
  }
  function composerHTML(c) {
    const d=draft(c),online=account(c.account)?.state==='online',enabled=online&&(d.text.trim()||ui.attachment);
    return '<div class="composer"><div id="translation-preview">'+previewHTML(c)+'</div><div class="composer-input"><textarea id="composer-text" aria-label="消息内容" placeholder="输入消息…">'+esc(d.text)+'</textarea><div class="composer-controls"><div class="composer-tools"><button class="icon-button" data-action="attachment" aria-label="添加演示附件">'+icon('Paperclip')+'</button><button class="icon-button" data-action="quickAll" aria-label="选择快捷回复">'+icon('MessageSquareText')+'</button><span class="language-hint">'+icon('Languages')+esc(c.language)+' · '+(d.translated?'示例译文':'发送原文')+'</span></div><button class="send-button" data-action="send" aria-label="发送演示消息"'+(!enabled?' disabled':'')+'>发送 '+icon('Send')+'</button></div></div><div class="composer-foot"><span>'+icon('Keyboard')+'Enter 发送，Shift + Enter 换行</span><span>'+(online?'演示会话 · 草稿自动保存':'账号待连接 · 草稿已保留')+'</span></div></div>';
  }
  function previewHTML(c){const d=draft(c);if(!d.translated&&!ui.attachment)return '';return (d.translated?'<div class="translation-preview"><small>发送前预览 · '+esc(c.language)+'示例译文</small>'+esc(d.translated)+'</div>':'')+(ui.attachment?'<div class="translation-preview"><small>本地演示附件</small>'+esc(ui.attachment)+' <button class="link" data-action="removeAttachment">移除</button></div>':'')}
  function localTime(c){try{return new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:c.timezone}).format(new Date())}catch(e){return '—'}}
  function profileHTML(c,drawer=false) {
    const m=member(c.owner),a=account(c.account),task=data.tasks.filter(t=>t.customer===c.id&&!t.done).sort((a,b)=>new Date(a.due)-new Date(b.due))[0],dirty=Object.hasOwn(ui.noteDrafts,c.id);
    const details='<section class="profile-section"><h3>客户标签<button class="link" data-action="assignTags" data-id="'+c.id+'">'+icon('Plus')+'添加</button></h3><div class="tag-row">'+(tagsHTML(c,99,true)||'<span class="muted">还没有标签</span>')+'</div></section><section class="profile-section"><h3>客户归属'+(manager()?'<button class="link" data-action="transfer" data-id="'+c.id+'">转交</button>':'')+'</h3><div class="info-row"><span>负责人</span><span class="small-avatar">'+avatar(m||{name:'未分配'},'small')+esc(m?.name||'未分配')+'</span></div><div class="info-row"><span>聊天账号</span><span>'+esc(a?.name)+'</span></div>'+(c.contactRefs.length>1?'<button class="duplicate-note" data-action="duplicate" data-id="'+c.id+'">'+icon('Copy')+'另有 '+(c.contactRefs.length-1)+' 个账号接触记录'+icon('ChevronRight')+'</button>':'')+'</section><section class="profile-section"><h3>来源信息<span class="sample-label">演示</span></h3><div class="profile-origin">'+icon('Target')+esc(c.source)+'</div><div class="origin-details">'+esc(c.campaign||'未关联广告活动')+'<br>'+esc(c.ad||'来源详情待补充')+'</div></section><div class="profile-permission">归属及可见范围为待确认方案。<br><button class="link" data-action="review">记录评审意见</button></div>';
    const activity=(data.activities[c.id]||[]).map(item=>'<div class="activity">'+esc(item.text)+'<small>'+esc(item.by)+' · '+esc(item.time)+'</small></div>').join('')||empty('还没有跟进记录','更新标签、备注或安排跟进后会显示在这里。');
    const notes='<textarea class="profile-note" data-note-customer="'+c.id+'" id="customer-note-'+c.id+(drawer?'-drawer':'')+'" aria-label="客户备注" placeholder="记下客户需求或下一步计划…">'+esc(dirty?ui.noteDrafts[c.id]:c.notes)+'</textarea><div class="note-save"><span role="status">'+(dirty?'未保存的修改':'已保存到本机')+'</span><button class="button small" data-action="saveNote" data-id="'+c.id+'">保存备注</button></div>';
    return '<aside class="customer-profile'+(drawer?' in-drawer':'')+'" aria-label="客户资料"><div class="profile-head"><span>客户资料</span><button class="icon-button" '+(drawer?'data-action="close" aria-label="关闭客户资料"':'data-action="toggleProfile" aria-label="收起客户资料"')+'>'+icon('X')+'</button></div><div class="profile-top"><div class="profile-topline">'+avatar(c,'large')+'<div><h2>'+esc(c.name)+'</h2><p>'+esc(c.phone)+'</p></div></div><div class="profile-location"><span>'+esc(country(c))+'，'+esc(c.city)+'</span><span>当地 '+esc(localTime(c))+'</span></div></div><div class="profile-stage"><span>客户阶段</span><select data-stage="'+c.id+'" aria-label="客户阶段">'+['新客户','跟进中','已报价','已成交','培育中'].map(s=>option(s,s,c.stage)).join('')+'</select></div><section class="profile-next"><div class="profile-next-title"><strong>下一步跟进</strong><button class="icon-button" aria-label="新增跟进" data-action="followup" data-id="'+c.id+'">'+icon('Plus')+'</button></div>'+(task?'<div class="followup-card"><strong>'+esc(task.title)+'</strong><span class="due '+(beforeToday(task.due)?'overdue':'')+'">'+icon('Clock3')+dateLabel(task.due)+(beforeToday(task.due)?' · 已逾期':'')+'</span><button class="link" aria-label="完成此跟进" data-action="taskDone" data-id="'+task.id+'">'+icon('CircleCheck')+'</button></div>':'<button class="button small full" data-action="followup" data-id="'+c.id+'">'+icon('CalendarPlus')+'安排跟进</button>')+'</section><div class="profile-tabs" role="group" aria-label="客户资料内容">'+[['details','资料'],['activity','记录'],['notes','备注']].map(([id,title])=>'<button class="profile-tab '+(ui.profileTab===id?'active':'')+'" data-action="profileTab" data-id="'+id+'" data-customer="'+c.id+'" aria-pressed="'+(ui.profileTab===id)+'">'+title+'</button>').join('')+'</div><div class="profile-content">'+(ui.profileTab==='notes'?notes:ui.profileTab==='activity'?activity:details)+'</div></aside>';
  }
  function scrollMessages(){requestAnimationFrame(()=>{const el=$('#messages');if(el)el.scrollTop=el.scrollHeight})}
  function renderAccounts() {
    const list=filteredAccounts();
    return '<section class="section-page"><div class="replica-panel"><h1 class="sr-only">WhatsApp账号列表</h1><div class="channel-line"><span>业务渠道</span><span class="channel-badge">'+icon('Check')+'WhatsApp</span><span>'+(manager()?'团队账号':'我的账号')+'</span></div><div class="filter-row"><label class="filter-control wide">账号名称或号码<input id="account-query" aria-label="搜索账号" value="'+esc(ui.accountQuery)+'" placeholder="输入名称、号码或备注…"></label><label class="filter-control">连接状态<select id="account-state" aria-label="账号状态筛选">'+[['all','全部状态'],['online','在线'],['reconnect','需重连'],['pending','待连接']].map(([id,name])=>option(id,name,ui.accountStatus)).join('')+'</select></label><div class="filter-actions"><button class="button primary" data-action="queryAccounts">'+icon('Search')+'查询</button><button class="button" data-action="resetAccounts">'+icon('RotateCcw')+'清除筛选</button></div></div><div class="action-toolbar"><button class="button" data-action="addAccount">'+icon('Plus')+'添加账号</button><span class="toolbar-note">账号资料与连接状态均为本机演示</span></div><div class="table-wrap"><table class="data-table account-table"><thead><tr><th>序号</th><th>WhatsApp账号</th><th>在线状态</th><th>负责人</th><th>客户数</th><th>未读</th><th>待跟进</th><th>操作</th></tr></thead><tbody>'+paged(list,'accounts').map((a,i)=>{const customers=myCustomers().filter(c=>c.account===a.id);return '<tr><td>'+rowNumber('accounts',i)+'</td><td><button class="cell-link customer-cell" data-action="accountInbox" data-id="'+a.id+'" aria-label="查看'+esc(a.name)+'会话"><span class="avatar '+esc(a.color)+'">'+icon('MessageCircle')+'</span><span><strong>'+esc(a.name)+'</strong><span class="account-number">'+esc(a.number)+'</span><span class="account-note">'+esc(a.note||'暂无账号备注')+'</span></span></button></td><td>'+stateText(a)+'</td><td>'+esc(member(a.owner)?.name||'未分配')+'</td><td>'+customers.length+'</td><td>'+customers.reduce((n,c)=>n+c.unread,0)+'</td><td>'+data.tasks.filter(t=>!t.done&&customers.some(c=>c.id===t.customer)).length+'</td><td><div>'+(a.state==='online'?'<button class="button small" data-action="accountInbox" data-id="'+a.id+'">打开会话</button>':'<button class="button small" data-action="connect" data-id="'+a.id+'">'+icon('RefreshCw')+'重新连接</button>')+'<button class="icon-button" data-action="editAccount" data-id="'+a.id+'" aria-label="编辑'+esc(a.name)+'">'+icon('Pencil')+'</button></div></td></tr>'}).join('')+(!list.length?'<tr><td colspan="8">'+empty('没有匹配的账号','清除筛选，或添加一个演示账号。')+'</td></tr>':'')+'</tbody></table></div><div class="table-bottom"><span>共 '+myAccounts().length+' 个账号，当前匹配 '+list.length+' 个</span>'+pagerHTML(list.length,'accounts')+'</div></div><div class="helper-note">'+icon('Info')+'<div>人数与账号数可继续扩展。真实 WhatsApp 接入路线在功能评审后确定。</div></div></section>';
  }
  function filteredCustomers(){let list=myCustomers();const q=ui.customerQuery.trim().toLowerCase();if(q)list=list.filter(c=>[c.name,c.phone,c.notes,c.source,account(c.account)?.name].join(' ').toLowerCase().includes(q));if(ui.customerTag!=='all')list=list.filter(c=>c.tags.includes(ui.customerTag));if(ui.customerStage!=='all')list=list.filter(c=>c.stage===ui.customerStage);if(manager()&&ui.customerOwner!=='all')list=list.filter(c=>c.owner===ui.customerOwner);return list}
  function customerRows() {
    const list=filteredCustomers();return paged(list,'customers').map((c,i)=>'<tr><td><input type="checkbox" data-select-customer="'+c.id+'" aria-label="选择'+esc(c.name)+'"'+(ui.selected.has(c.id)?' checked':'')+'></td><td>'+rowNumber('customers',i)+'</td><td><button class="cell-link customer-cell" data-action="profile" data-id="'+c.id+'" aria-label="查看'+esc(c.name)+'资料">'+avatar(c,'small')+'<span><strong>'+esc(c.name)+'</strong><small>'+esc(c.phone)+'</small></span></button></td><td><span class="account-cell">'+esc(account(c.account)?.name)+'</span><small class="muted">'+esc(member(c.owner)?.name||'未分配')+'</small></td><td><div class="tag-row">'+tagsHTML(c,2)+(c.tags.length>2?'<span class="muted">+'+(c.tags.length-2)+'</span>':'')+'</div></td><td><span class="stage '+(c.stage==='已成交'?'won':c.stage==='新客户'?'new':'')+'">'+esc(c.stage)+'</span></td><td>'+esc(country(c))+'</td><td>'+esc(c.source)+'</td><td><span class="'+(beforeToday(c.followup)?'notice':'')+'">'+dateLabel(c.followup)+'</span></td><td><button class="link" data-action="openConversation" data-id="'+c.id+'" aria-label="打开'+esc(c.name)+'会话">打开会话</button></td></tr>').join('')||'<tr><td colspan="10">'+empty('没有匹配客户','调整筛选条件，或创建一位演示客户。')+'</td></tr>';
  }
  function batchbar(){return '<div class="batchbar" id="batchbar"'+(!ui.selected.size?' hidden':'')+'><strong>已选 <span id="selected-count">'+ui.selected.size+'</span> 位客户</strong><button class="button" data-action="batchTags">'+icon('Tags')+'批量打标签</button>'+(manager()?'<button class="button" data-action="batchTransfer">'+icon('ArrowRightLeft')+'转交客户</button>':'')+'<button class="link" data-action="clearSelection">取消选择</button></div>'}
  function renderCustomers() {
    return '<section class="section-page"><div class="replica-panel"><h1 class="sr-only">客户列表</h1><div class="customer-filters"><div class="channel-line"><span>业务渠道</span><span class="channel-badge">'+icon('Check')+'WhatsApp</span></div><div class="filter-row"><label class="filter-control wide">客户检索<input id="customer-search" aria-label="搜索客户库" value="'+esc(ui.customerQuery)+'" placeholder="输入称呼、号码或备注…"></label><label class="filter-control">客户阶段<select id="customer-stage" aria-label="按阶段筛选">'+option('all','全部阶段',ui.customerStage)+['新客户','跟进中','已报价','已成交','培育中'].map(s=>option(s,s,ui.customerStage)).join('')+'</select></label>'+(manager()?'<label class="filter-control">负责人<select id="customer-owner" aria-label="按负责人筛选">'+option('all','全部负责人',ui.customerOwner)+data.members.map(m=>option(m.id,m.name,ui.customerOwner)).join('')+'</select></label>':'')+'<div class="filter-actions"><button class="button primary" data-action="queryCustomers">'+icon('Search')+'查询</button><button class="button" data-action="resetCustomerFilters">'+icon('RotateCcw')+'清除筛选</button></div></div><div class="tag-query-line"><span>标签条件</span><select id="customer-tag" aria-label="按标签筛选">'+option('all','全部标签',ui.customerTag)+myTags().map(t=>option(t.id,t.name,ui.customerTag)).join('')+'</select><button class="link" data-action="resetTagFilter">重置标签条件</button></div></div><div class="action-toolbar"><button class="button" data-action="addCustomer">'+icon('UserRoundPlus')+'新增客户</button><button class="button" data-action="batchTags">'+icon('Tags')+'批量打标签</button><button class="button" data-nav="followups">'+icon('ClipboardList')+'跟进管理</button><span class="toolbar-note">仅使用虚构号码与客户</span></div>'+batchbar()+'<div class="table-wrap"><table class="data-table"><thead><tr><th><input type="checkbox" id="select-all-customers" aria-label="选择当前结果全部客户"></th><th>序号</th><th>客户资料</th><th>账号 / 负责人</th><th>标签</th><th>客户阶段</th><th>国家 / 地区</th><th>来源</th><th>下次跟进</th><th>操作</th></tr></thead><tbody id="customer-rows">'+customerRows()+'</tbody></table></div><div class="table-bottom"><span id="customer-total">当前 '+filteredCustomers().length+' 位客户</span>'+pagerHTML(filteredCustomers().length,'customers')+'</div></div></section>';
  }
  function renderTags() {
    const groups=visibleTagGroups();if(ui.tagGroup!=='all'&&!groups.some(g=>g.id===ui.tagGroup))ui.tagGroup='all';const editable=ui.tagScope==='private'||manager(),list=filteredTags();
    return '<section class="section-page"><div class="replica-panel"><div class="section-heading"><h1>标签管理</h1><p>按分组维护标签，给客户添加工作标记。</p></div><div class="scope-tabs">'+[['team','公共标签'],['private','个人标签']].map(([id,label])=>'<button class="'+(ui.tagScope===id?'active':'')+'" data-action="tagScope" data-id="'+id+'" aria-pressed="'+(ui.tagScope===id)+'">'+label+'</button>').join('')+'</div><div class="filter-row"><label class="filter-control wide">查找标签<input id="replica-tag-search" aria-label="搜索标签" value="'+esc(ui.tagQuery)+'" placeholder="输入标签名称…"></label><div class="filter-actions"><button class="button primary" data-action="queryTags">'+icon('Search')+'查询</button><button class="button" data-action="resetTags">'+icon('RotateCcw')+'清除筛选</button></div></div><div class="action-toolbar"><button class="button" data-action="addTag"'+(ui.tagGroup!=='all'?' data-group="'+ui.tagGroup+'"':'')+(!editable?' disabled title="公共标签暂由主管维护"':'')+'>'+icon('Plus')+'添加标签</button><span class="toolbar-note">'+(ui.tagScope==='team'?'公共标签暂由主管维护，聊手可使用。':'个人标签仅当前成员维护。')+' 权限方案待评审。</span></div><div class="tag-layout"><aside class="tag-group-list" aria-label="标签分组"><button class="tag-group-choice '+(ui.tagGroup==='all'?'active':'')+'" data-action="tagGroupSelect" data-id="all"><span>全部分组</span><small>'+groups.length+'</small></button>'+groups.map(g=>'<button class="tag-group-choice '+(ui.tagGroup===g.id?'active':'')+'" data-action="tagGroupSelect" data-id="'+g.id+'"><span>'+esc(g.name)+'</span><small>'+data.tags.filter(t=>t.group===g.id).length+'</small></button>').join('')+'<button class="button" data-action="addTagGroup">'+icon('Plus')+'新增分组</button></aside><div class="tag-table-area"><div class="table-wrap"><table class="data-table"><thead><tr><th>标签名称</th><th>标签预览</th><th>所属分组</th><th>客户数</th><th>操作</th></tr></thead><tbody>'+tagRows()+'</tbody></table></div><div class="table-bottom"><span>当前 '+list.length+' 个标签</span>'+pagerHTML(list.length,'tags')+'</div></div></div></div></section>';
  }
  const canEditGroup=g=>manager()||(g.scope==='private'&&g.owner===ui.persona);
  function renderFollowups() {
    const all=myTasks(),pending=all.filter(t=>!t.done),today=pending.filter(t=>sameDay(t.due)),done=all.filter(t=>t.done),list=(ui.taskFilter==='done'?done:ui.taskFilter==='today'?today:pending).sort((a,b)=>new Date(a.due)-new Date(b.due));
    return '<section class="section-page"><div class="replica-panel"><div class="section-heading"><h1>跟进管理</h1><p>查看提醒与完成状态，操作记录保留在客户资料中。</p></div><div class="scope-tabs">'+[['pending','待跟进',pending.length],['today','今天',today.length],['done','已完成',done.length]].map(([id,name,n])=>'<button class="'+(ui.taskFilter===id?'active':'')+'" data-action="taskFilter" data-id="'+id+'" aria-pressed="'+(ui.taskFilter===id)+'">'+name+' '+n+'</button>').join('')+'</div><div class="action-toolbar"><button class="button primary" data-action="newTask">'+icon('Plus')+'安排跟进</button><span class="toolbar-note">按浏览器本地时间显示</span></div><div class="table-wrap"><table class="data-table followup-table"><thead><tr><th>客户</th><th>跟进事项</th><th>负责人</th><th>账号</th><th>提醒时间</th><th>优先级</th><th>状态</th><th>操作</th></tr></thead><tbody>'+paged(list,'followups').map(t=>{const c=customer(t.customer);return '<tr><td><button class="link customer-link" data-action="openConversation" data-id="'+c.id+'">'+esc(c.name)+'</button></td><td><span class="task-title '+(t.done?'completed':'')+'">'+esc(t.title)+'</span></td><td>'+esc(member(t.owner)?.name)+'</td><td>'+esc(account(c.account)?.name)+'</td><td><span class="task-time '+(!t.done&&beforeToday(t.due)?'overdue':'')+'">'+dateLabel(t.due)+(!t.done&&beforeToday(t.due)?'<br>逾期未完成':'')+'</span></td><td>'+(t.priority==='high'?'<span class="priority-badge">重点</span>':'普通')+'</td><td><span class="table-status '+(t.done?'done':'')+'">'+icon(t.done?'CircleCheck':'Clock3')+(t.done?'已完成':'待处理')+'</span></td><td><div class="task-actions"><button class="button small" data-action="taskDone" data-id="'+t.id+'" aria-label="'+(t.done?'重新打开':'完成')+esc(t.title)+'">'+icon(t.done?'RotateCcw':'Check')+(t.done?'重新打开':'完成')+'</button><button class="icon-button" data-action="profile" data-id="'+c.id+'" aria-label="查看'+esc(c.name)+'资料">'+icon('ContactRound')+'</button></div></td></tr>'}).join('')+(!list.length?'<tr><td colspan="8">'+empty('当前没有待处理记录','切换其他状态，或安排一次跟进。')+'</td></tr>':'')+'</tbody></table></div><div class="table-bottom"><span>共 '+list.length+' 条跟进</span>'+pagerHTML(list.length,'followups')+'</div></div></section>';
  }
  function renderTeam(){if(!manager())return '<div class="view-empty"><div><h2>团队管理在主站</h2><p>子站显示当前聊手的工作范围。</p></div></div>';return '<section class="section-page">'+pageHeader('TEAM & ACCESS','团队与权限','先明确谁管理账号、谁负责客户，再决定团队数据如何共享。','<button class="button primary" data-action="addMember">'+icon('UserRoundPlus')+'新增成员</button>')+'<div class="role-count"><strong>'+data.members.length+'</strong> 位演示成员 <span style="margin:0 12px;color:#cad8bf">/</span> '+data.accounts.length+' 个账号 · '+data.customers.length+' 位客户</div><div class="page-panel"><div class="panel-header"><div><h2>团队成员</h2><p>人数、角色和账号分配均可继续扩展</p></div><span class="tag slate">权限方案待确认</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>成员</th><th>团队</th><th>角色</th><th>负责账号</th><th>客户</th><th>待跟进</th><th>操作</th></tr></thead><tbody>'+data.members.map(m=>'<tr><td><div class="customer-cell">'+avatar(m,'small')+'<strong>'+esc(m.name)+'</strong></div></td><td>'+esc(m.team)+'</td><td><span class="tag '+(m.role==='manager'?'purple':'jade')+'">'+(m.role==='manager'?'主管':'聊手')+'</span></td><td>'+data.accounts.filter(a=>a.owner===m.id).length+'</td><td>'+data.customers.filter(c=>c.owner===m.id).length+'</td><td>'+data.tasks.filter(t=>t.owner===m.id&&!t.done).length+'</td><td><button class="link" data-action="memberAccounts" data-id="'+m.id+'">分配账号</button></td></tr>').join('')+'</tbody></table></div></div><div class="permission-grid"><section class="permission-card"><h3>'+icon('UserRound')+'聊手 <span class="tag jade">我的工作空间</span></h3><ul><li>使用获分配的 WhatsApp 账号</li><li>查看、标记并跟进自己负责的客户</li><li>使用公共标签，维护自己的个人标签</li><li>主管可见范围与转交规则需你确认</li></ul></section><section class="permission-card"><h3>'+icon('ShieldCheck')+'主管 <span class="tag purple">团队工作空间</span></h3><ul><li>查看团队账号、客户与待办</li><li>维护公共标签，分配账号和转交客户</li><li>成员与角色可在后续扩展</li><li>此页是权限方案评审，不代表已实现真实鉴权</li></ul></section></div><p class="team-section-note">“客户属于聊手还是团队”“账号转移后历史归谁”“离职交接如何处理”仍待确认。当前只是可操作的默认方案。</p></section>'}
  const scopeDescriptions={
    'P-INBOX':'按账号聚合会话，将聊天、客户档案和下一步跟进放在一起。','P-ACCOUNTS':'账号状态、备注、负责人和重新连接流程。','P-CUSTOMERS':'客户档案、来源、阶段、标签及跨账号接触记录。','P-TAGS':'公共与个人标签分组，支持打标和筛选客户。','P-FOLLOW':'把跟进安排成待办，完成后回写客户记录。','P-TEAM':'团队成员、账号分配和客户交接由主站管理。','P-ASSIST':'接收译文展示和快捷话术填入；本轮是示例交互。','P-WALLET':'识别聊天中的加密货币钱包地址，用白名单及记录/拦截/提醒策略管控。它不是钱包余额或收款账本。','P-GUARD':'监控敏感词或删除、编辑等操作。哪些行为需要记录与提醒尚未确定。','P-AUTO':'关键词回复和欢迎语回复暂缓。','P-BROADCAST':'群发任务和在线聊天的群发功能暂缓。','P-LIFECYCLE':'按可配置流程展示客户全生命周期的防漏闭环看板；预设「零售客户」7 阶段与「大B经销商」8 阶段两条流程。','P-PIPELINES':'阶段名称、数量、顺序、类型、进入时采集内容与自动流转落点均可配置，支持多条流程并行。','P-DEALS':'在途报价转单、订单发货签收联动复购周期及老客唤醒台账。','P-ATTRIBUTION':'已有Facebook转WhatsApp背景；现有来源只是示例，真实广告关联和回传待确认。','P-ORDERS':'需要对接哪些订单信息、由谁查看或操作，后续再明确。','P-NETWORK':'代理与会话环境依赖最终接入路线，不先把配置入口塞进工作台。','P-LEGACY':'出海猫的工单、底库、分流和号池，逐项对照你的业务再决定。','P-COMMERCIAL':'套餐售卖、充值、推广返利、字符售卖和端口授权不出现在内部工作台。'};
  function scopeCard(m) {
    const choices=['首轮原型','保留','魔改','待定','本轮不展示'];
    return '<article class="scope-card"><h3>'+esc(m.name)+'<span class="tag '+(m.decision==='待定'?'gold':m.decision==='本轮不展示'?'slate':'jade')+'">'+esc(m.decision)+'</span></h3><p>'+esc(scopeDescriptions[m.id]||m.explanation||m.notes)+(m.id==='P-WALLET'?'<br>原站解析时标注客户端检测仍在开发。':'')+'</p><div class="scope-form"><select data-scope-decision="'+m.id+'" aria-label="'+esc(m.name)+'范围选择">'+choices.map(x=>option(x,x,m.decision)).join('')+'</select></div><textarea class="scope-notes" data-scope-notes="'+m.id+'" aria-label="'+esc(m.name)+'修改意见" placeholder="写下需要保留、去掉或魔改的细节…">'+esc(m.notes)+'</textarea><div class="scope-source">原清单关联：'+esc(m.originalIds.join('、')||'新增业务需求')+'</div></article>';
  }
  function renderScope() {
    return '<section class="section-page">'+pageHeader('','本轮功能范围','确定保留、魔改与暂不需要的模块，记录下一轮修改方向。','<button class="button" data-action="review">'+icon('MessageSquareText')+'布局评审</button><button class="button primary" data-action="export">'+icon('Download')+'导出需求 JSON</button>')+'<div class="scope-intro">'+icon('Info')+'<div><strong>已明确：WhatsApp 聚合、多聊手各自管理账号、客户和标签，内部自用。</strong><br>当前为聊手子站。客户归属规则仍待评审。此处记录你的判断，原始325项模块清单保持不变。</div></div>'+[['本轮呈现的工作流',req.modules.filter(m=>m.screens.length&&m.id!=='P-ATTRIBUTION')],['等待判断的模块',req.modules.filter(m=>!m.screens.length&&!["P-COMMERCIAL","P-TEAM","P-AUTO","P-REPLY-MANAGEMENT","P-BROADCAST"].includes(m.id)||m.id==='P-ATTRIBUTION')],['内部使用的范围调整',req.modules.filter(m=>["P-COMMERCIAL","P-TEAM","P-AUTO","P-REPLY-MANAGEMENT","P-BROADCAST"].includes(m.id))]].map(([name,list])=>'<div class="scope-section"><h2>'+name+'</h2><span>'+list.length+' 项</span></div><div class="scope-grid">'+list.map(scopeCard).join('')+'</div>').join('')+'<div class="reset-note"><span>演示操作和评审意见保存在当前浏览器。导出 JSON 后可交给下一轮迭代。</span><button class="link" data-action="resetDemo">恢复演示数据</button></div></section>';
  }
  function modal(title,body,footer='',options={}) {
    const dlg=$('#dialog');if(dlg.open)dlg.close();dlg.className=options.drawer?'drawer':options.wide?'wide':'';dlg.setAttribute('aria-label',title);
    $('#dialog-content').innerHTML='<div class="modal-head"><h2>'+esc(title)+'</h2><button class="icon-button" data-action="close" aria-label="关闭弹窗">'+icon('X')+'</button></div>'+body+(footer?'<div class="modal-footer">'+footer+'</div>':'');paintIcons(dlg);dlg.showModal();
  }
  const close=()=>$('#dialog').close();
  const cancel='<button class="button" data-action="close">取消</button>';
  function formModal(title,formId,body,submitLabel='保存',options={}){modal(title,'<form id="'+formId+'" novalidate><div class="modal-body">'+body+'<div class="form-error" id="form-error" role="alert"></div></div><div class="modal-footer"><span class="footnote">仅保存演示数据</span>'+cancel+'<button class="button primary" type="submit">'+submitLabel+'</button></div></form>','',options)}
  function error(message) {
    const form=$('#dialog form');$('#form-error').textContent=message;if(!form)return;
    form.querySelectorAll('[aria-invalid]').forEach(x=>{x.removeAttribute('aria-invalid');x.removeAttribute('aria-describedby')});form.querySelectorAll('.field-error').forEach(x=>x.remove());
    const field=[...form.querySelectorAll('[required]')].find(x=>!x.value.trim())||(message.includes('号码')?form.querySelector('[name="phone"]'):form.querySelector('input:not([type="hidden"]),textarea,select'));
    if(field){const label=field.closest('label');if(label&&!field.hasAttribute('aria-label'))field.setAttribute('aria-label',label.textContent.trim());const note=document.createElement('small');note.className='field-error';note.id='active-field-error';note.textContent=message;field.setAttribute('aria-invalid','true');field.setAttribute('aria-describedby',note.id);field.after(note);field.focus()}
  }
  function openProfile(id){const c=customer(id);if(!c||!myCustomers().includes(c))return;ui.customer=id;modal('客户资料','<div class="profile-dialog">'+profileHTML(c,true)+'</div>','',{drawer:true})}
  function openTagAssign(ids){const customers=ids.map(customer).filter(c=>c&&myCustomers().includes(c));if(!customers.length)return toast('请先选择客户。');const common=customers.length===1?customers[0].tags:[];const groups=data.tagGroups.filter(g=>g.scope==='team'||g.owner===ui.persona||manager());formModal(customers.length===1?'管理客户标签':'批量打标签','assign-tags-form','<input type="hidden" name="ids" value="'+esc(customers.map(c=>c.id).join(','))+'"><p class="modal-description">'+(customers.length===1?'为 '+esc(customers[0].name)+' 选择标签。':'为选中的 '+customers.length+' 位客户追加标签，不覆盖其他已有标签。')+'</p>'+groups.map(g=>'<div class="setting-block"><h3>'+esc(g.name)+' <span class="sample-label">'+(g.scope==='team'?'公共':'个人')+'</span></h3><div class="choice-list">'+data.tags.filter(t=>t.group===g.id).map(t=>'<label class="choice-option"><input type="checkbox" name="tags" value="'+t.id+'"'+(common.includes(t.id)?' checked':'')+'><span class="tag '+esc(t.color)+'">'+esc(t.name)+'</span></label>').join('')+'</div></div>').join(''),customers.length===1?'保存标签':'追加标签')}
  function openTagForm(id=null,groupId=null){const t=id?tag(id):null;if(t&&!canEditGroup(group(t.group)))return toast('当前聊手可以使用公共标签，由主管维护。');let groups=data.tagGroups.filter(canEditGroup);if(!groups.length){ui.tagScope='private';return openGroupForm()}formModal(t?'编辑标签':'新建标签','tag-form','<input name="id" type="hidden" value="'+esc(id||'')+'"><div class="form-grid"><label class="field full">标签名称<input name="name" required maxlength="24" placeholder="例如：等待确认" value="'+esc(t?.name||'')+'"></label><label class="field full">所属分组<select name="group">'+groups.map(g=>option(g.id,g.name+' · '+(g.scope==='team'?'公共':member(g.owner)?.name),(t?.group||groupId||groups.find(g=>g.scope===ui.tagScope)?.id))).join('')+'</select></label><div class="field full"><span>标签颜色</span><input type="hidden" name="color" id="tag-color" value="'+esc(t?.color||'jade')+'"><div class="color-options">'+['jade','blue','peach','purple','gold','slate'].map(c=>'<button class="color-option '+((t?.color||'jade')===c?'selected':'')+'" type="button" data-action="tagColor" data-id="'+c+'" aria-label="标签颜色'+c+'"><span class="color-dot '+c+'"></span></button>').join('')+'</div></div></div>')}
  function openGroupForm(){formModal('新增标签分组','group-form','<div class="form-grid"><label class="field full">分组名称<input name="name" required maxlength="30" placeholder="例如：我的跟进标记"></label><label class="field full">适用范围<select name="scope">'+option('private','我的个人分组','private')+(manager()?option('team','团队公共分组','private'):'')+'</select><small>公共分组暂由主管维护，个人分组归当前成员。</small></label></div>')}
  function openFollowup(id=null){const list=myCustomers(),c=id?customer(id):selectedCustomer();if(!list.length)return toast('请先新增客户。');formModal('安排下一步跟进','followup-form','<div class="form-grid"><label class="field full">客户<select name="customer">'+list.map(x=>option(x.id,x.name+' · '+account(x.account)?.name,c?.id)).join('')+'</select></label><label class="field full">跟进事项<input name="title" required maxlength="100" placeholder="写清下一次具体要做什么"></label><label class="field">提醒时间<input type="datetime-local" name="due" required value="'+inputDate()+'"></label><label class="field">优先级<select name="priority">'+option('normal','普通','normal')+option('high','重点','normal')+'</select></label></div>','创建跟进')}
  function openAccountForm(id=null){const a=id?account(id):null;if(a&&!myAccounts().includes(a))return;formModal(a?'编辑账号':'添加 WhatsApp 账号','account-form','<input type="hidden" name="id" value="'+esc(a?.id||'')+'"><p class="modal-description">先体验账号信息与负责人配置。在「号码管理」可体验 OpenWA 扫码绑定。</p><div class="form-grid"><label class="field full">账号名称<input name="name" required maxlength="40" placeholder="例如：美国 · 咨询 04" value="'+esc(a?.name||'')+'"></label><label class="field">号码（选填）<input name="number" placeholder="+1 …" value="'+esc(a?.number||'')+'"></label><label class="field">服务地区<select name="country">'+option('US','美国',a?.country||'US')+option('PR','波多黎各',a?.country||'US')+option('OTHER','其他地区',a?.country||'US')+'</select></label>'+(manager()?'<label class="field full">负责人<select name="owner">'+data.members.map(m=>option(m.id,m.name,a?.owner||ui.persona)).join('')+'</select></label>':'')+'<label class="field full">账号备注<textarea name="note" placeholder="账号用途、服务范围或注意事项">'+esc(a?.note||'')+'</textarea></label></div>',a?'保存信息':'加入演示账号列表')}
  function openCustomerForm(){const accounts=myAccounts();if(!accounts.length)return toast('请先添加账号。');formModal('新增客户','customer-form','<div class="form-grid"><label class="field full">客户称呼<input name="name" required maxlength="50" placeholder="客户姓名或备注名"></label><label class="field">WhatsApp 号码<input name="phone" required placeholder="含国家区号"></label><label class="field">沟通语言<select name="language">'+option('英语','英语','英语')+option('西班牙语','西班牙语','英语')+option('其他','其他','英语')+'</select></label><label class="field full">归属账号<select name="account">'+accounts.map(a=>option(a.id,a.name,accounts.find(x=>x.id===ui.account)?.id||accounts[0].id)).join('')+'</select></label><label class="field">国家 / 地区<select name="country">'+option('US','美国','US')+option('PR','波多黎各','US')+option('OTHER','其他','US')+'</select></label><label class="field">客户来源<select name="source">'+['手动添加','Facebook 广告','网站咨询','客户转介绍','其他'].map(s=>option(s,s,'手动添加')).join('')+'</select></label><label class="field full">客户备注<textarea name="notes" placeholder="记下已知需求或下一步计划"></textarea></label></div>','创建客户')}
  function openMemberForm(){if(!manager())return;formModal('新增团队成员','member-form','<p class="modal-description">用于评审成员组织与分配。这里只创建演示成员，不会发送邀请或开通真实账号。</p><div class="form-grid"><label class="field full">成员姓名<input name="name" required maxlength="30" placeholder="成员姓名"></label><label class="field">所属团队<input name="team" required value="北美一组"></label><label class="field">角色<select name="role">'+option('agent','聊手','agent')+option('manager','主管','agent')+'</select></label></div>','创建演示成员')}
  function openMemberAccounts(id){if(!manager())return;const m=member(id);formModal('为 '+m.name+' 分配账号','member-accounts-form','<input type="hidden" name="member" value="'+id+'"><p class="modal-description">选择后将改变账号负责人；客户归属本轮保持独立，客户转交需单独处理。</p><div class="choice-list">'+data.accounts.map(a=>'<label class="choice-option" style="width:100%;justify-content:space-between"><span><input type="checkbox" name="accounts" value="'+a.id+'"'+(a.owner===id?' checked':'')+'> '+esc(a.name)+'</span><small>当前：'+esc(member(a.owner)?.name||'未分配')+'</small></label>').join('')+'</div><p class="transfer-note">取消此成员已分配的账号会将它改为未分配。账号转交时的历史访问范围仍待确认。</p>','保存分配')}
  function openTransfer(ids){if(!manager())return;const list=ids.map(customer).filter(Boolean);if(!list.length)return toast('请先选择客户。');formModal('转交客户','transfer-form','<input name="ids" type="hidden" value="'+list.map(c=>c.id).join(',')+'"><p class="modal-description">把 '+list.map(c=>esc(c.name)).join('、')+' 转给新的负责人。这个演示只改变客户与未完成跟进的负责人，不移动账号。</p><label class="field">接收成员<select name="owner">'+data.members.filter(m=>m.role==='agent').map(m=>option(m.id,m.name+(m.id===list[0].owner?'（当前负责人）':''),'')).join('')+'</select></label><label class="field" style="margin-top:18px">交接说明<textarea name="reason" placeholder="写明客户现状与下一步事项"></textarea></label><p class="transfer-note">转交后的消息访问、历史档案、个人标签和账号授权之间的关系，需要进一步确定。</p>','确认演示转交')}
  function openDuplicate(id){const c=customer(id);modal('跨账号接触记录','<div class="modal-body"><p class="modal-description">'+esc(c.name)+' 在多个账号下有接触记录。原型只做提示，没有自动合并、抢单或改归属。</p>'+c.contactRefs.map(r=>{const mine=manager()||r.owner===ui.persona;return '<div class="duplicate-item">'+icon(mine?'MessageCircle':'LockKeyhole')+'<div><strong>'+esc(mine?account(r.account)?.name:'其他成员负责的账号')+'</strong><small>'+esc(mine?member(r.owner)?.name:'当前视角不展示对方客户资料')+'</small></div></div>'}).join('')+'<p class="review-hint">要统一客户还是各聊手独立维护、重复进线由谁跟进，等你评审后确定。</p></div>','<button class="button primary" data-action="close">知道了</button>')}
  function openTranslation(){modal('翻译与发送偏好','<div class="modal-body"><div class="setting-block"><h3>接收消息译文</h3><label class="toggle-control"><input type="checkbox" id="receive-translation"'+(ui.receiveTranslation?' checked':'')+'>在原文下方展示中文译文</label><p>此原型使用预先准备的示例译文，方便评审消息层级与可读性。</p></div><div class="setting-block"><h3>发送前预览</h3><p>选择快捷话术后展示客户语言的示例译文，你确认后再发送。自行输入的内容将以原文展示。</p></div><div class="setting-block"><h3>后续要确认</h3><p>是否自动翻译、翻译目标语言、是否必须预览，以及语音/图片翻译是否需要。</p></div></div>','<button class="button primary" data-action="close">完成</button>')}
  function openQuick(){modal('快捷回复','<div class="modal-body"><p class="modal-description">选择一条填入输入框，可修改后再发送。此处使用演示话术。</p><div class="quick-list">'+data.quickReplies.filter(q=>!q.owner||q.owner===ui.persona||manager()).map(q=>'<button class="quick-card" data-action="quick" data-id="'+q.id+'"><strong>'+esc(q.title)+'<small>'+esc(q.scope)+'</small></strong><p>'+esc(q.zh)+'</p></button>').join('')+'</div></div>','',{eyebrow:'QUICK REPLIES'})}
  function openReview(){modal('原型评审','<div class="modal-body"><div class="review-summary"><div><strong>你的初步需求 · SCRM 全周期闭环原型</strong>只评审布局与功能，尚未进入正式开发。</div>'+icon('PanelsTopLeft')+'</div>'+"<div class=\"element-review-launch\"><button class=\"button small\" type=\"button\" data-element-review-start>点选界面备注</button><span>也可按 Alt + 左键</span></div>"+req.review.items.map(i=>'<section class="review-section"><h3>'+esc(i.title)+'</h3><small>'+esc(i.question)+'</small><select data-review-status="'+i.id+'" aria-label="'+esc(i.title)+'评审状态">'+['待评审','方向认可','需要调整'].map(s=>option(s,s,i.status)).join('')+'</select><textarea data-review-note="'+i.id+'" aria-label="'+esc(i.title)+'评审备注" placeholder="写下你的具体想法…">'+esc(i.notes)+'</textarea></section>').join('')+'<p class="review-hint">备注会保存在当前浏览器。导出 JSON 后可用于下一轮迭代；导出不会表示你已批准正式开发。</p></div>','<button class="button" data-action="export">'+icon('Download')+'导出需求与评审</button><button class="button primary" data-action="reviewDone">保存评审备注</button>',{drawer:true,eyebrow:'REVIEW & ITERATE'})}
  function fillQuick(id){const q=data.quickReplies.find(q=>q.id===id),c=selectedCustomer();if(!q||!c)return;ui.drafts[c.id]={text:q.zh,translated:c.language==='西班牙语'?q.es:q.en,source:q.zh};persist();if($('#dialog').open)close();if(ui.view!=='inbox')navigate('inbox');else{const box=$('.chat-pane');box.outerHTML=chatHTML(c);paintIcons();scrollMessages()}$('#composer-text')?.focus()}
  function send() {
    const c=selectedCustomer(),el=$('#composer-text');if(!c||!el)return;
    if(account(c.account)?.state!=='online')return toast('账号尚未连接，草稿会保留。');
    const text=el.value.trim();if(!text&&!ui.attachment)return;
    const d=draft(c),outgoing=d.translated&&d.source===text?d.translated:text;
    (data.messages[c.id]??=c.preview==='新建客户档案'?[]:[{id:'seed'+c.id,side:'in',text:c.preview,translated:c.translation,time:c.last}]).push({id:nextId('m'),side:'out',text:outgoing,attachment:ui.attachment,time:new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}),local:true});
    c.preview=outgoing||'[附件]';c.last='刚刚';c.unread=0;ui.drafts[c.id]={text:'',translated:'',source:''};ui.attachment=null;persist();render();toast('演示消息已保存到本地。');
  }
  function exportReq(){const obj={...clone(req),exportedAt:new Date().toISOString(),prototypeReview:{activeView:ui.view,persona:me().role,layout:'reference-aligned-scrm-lifecycle',receiveTranslation:ui.receiveTranslation,note:'本文件仅包含需求和评审，不包含演示聊天或真实客户数据。'}};const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='whatsapp-scrm-lifecycle-reviewed.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('已导出需求与评审 JSON。')}
  function refreshInboxProfiles(c) {
    const profile=$('#dialog .customer-profile');if($('#dialog').open&&profile){profile.outerHTML=profileHTML(c,true);paintIcons($('#dialog'));if($('#conversation-list')){$('#conversation-list').innerHTML=conversationRows();paintIcons($('#conversation-list'))}return}render();
  }
  function accountChoicesHTML() {
    const accounts=myAccounts();
    return '<div class="account-list"><button class="account-choice '+(ui.account==='all'?'active':'')+'" data-action="accountScope" data-id="all" aria-pressed="'+(ui.account==='all')+'" aria-label="切换到全部账号"><span class="account-choice-icon">'+icon('Inbox')+'</span><span class="account-choice-main"><strong>全部会话</strong><small>'+accounts.length+' 个账号</small></span>'+(unreadCount()?'<span class="unread">'+unreadCount()+'</span>':'')+'</button>'+accounts.map(a=>{const customers=myCustomers().filter(c=>c.account===a.id),unread=customers.reduce((n,c)=>n+c.unread,0);return '<button class="account-choice '+(ui.account===a.id?'active':'')+'" data-action="accountScope" data-id="'+a.id+'" aria-label="切换到'+esc(a.name)+'" aria-pressed="'+(ui.account===a.id)+'"><span class="account-choice-icon">'+icon('MessageCircle')+'</span><span class="account-choice-main"><strong>'+esc(a.name)+'</strong><small><span class="state-dot '+(a.state==='online'?'':a.state==='pending'?'offline':'warning')+'"></span>'+(a.state==='online'?'在线':a.state==='reconnect'?'需重连':'待连接')+'，'+customers.length+' 位客户</small></span>'+(unread?'<span class="unread">'+unread+'</span>':'')+'</button>'}).join('')+'</div>';
  }
  function accountPaneHTML(){return '<aside class="account-pane" aria-label="WhatsApp 账号列表"><div class="account-pane-head"><h2>我的账号 <span>'+myAccounts().length+'</span></h2><button class="icon-button" aria-label="添加账号" data-action="addAccount">'+icon('Plus')+'</button></div>'+accountChoicesHTML()+'<a class="account-pane-foot" href="#accounts" data-nav="accounts">'+icon('Settings2')+'账号管理'+icon('ChevronRight')+'</a></aside>'}
  function openAccountSwitcher(){modal('切换 WhatsApp 账号','<div class="account-switcher">'+accountChoicesHTML()+'</div>','')}
  function switchProfileTab(id,cid){ui.profileTab=id;const c=customer(cid),inDialog=$('#dialog').open&&!!$('.profile-dialog'),host=inDialog?$('#dialog .customer-profile'):$('.inbox-layout>.customer-profile');if(!c||!host)return;host.outerHTML=profileHTML(c,inDialog);const root=inDialog?$('#dialog'):$('#view');paintIcons(root);root.querySelector('[data-action="profileTab"][data-id="'+id+'"]')?.focus({preventScroll:true})}
  
  function viewIcon(id){return {inbox:'MessagesSquare',accounts:'PanelsTopLeft',customers:'ContactRound',tags:'Tags',followups:'ClipboardList',team:'UsersRound',scope:'SlidersHorizontal'}[id]||'FileText'}
  function menuLink(id,label,child=false){return '<a class="nav-item '+(ui.view===id?'active':'')+'" href="#'+id+'" data-nav="'+id+'" aria-label="'+views[id]+'" title="'+views[id]+'"'+(ui.view===id?' aria-current="page"':'')+'>'+icon(viewIcon(id))+'<span class="nav-label">'+label+'</span>'+(id==='inbox'&&unreadCount()?'<span class="nav-count">'+unreadCount()+'</span>':'')+'</a>'}
  function menuHTML(){const open=ui.customerNavOpen;return '<div class="nav-caption">工作空间</div>'+menuLink('inbox','聚合会话')+menuLink('accounts','WhatsApp账号')+'<div class="nav-caption">客户运营</div><button class="nav-group-button '+(['customers','tags','followups'].includes(ui.view)?'group-active':'')+'" data-action="toggleCustomerNav" aria-expanded="'+open+'">'+icon('ContactRound')+'<span class="nav-label">客户管理</span>'+icon(open?'ChevronUp':'ChevronDown')+'</button><div class="submenu"'+(!open?' hidden':'')+'>'+menuLink('customers','客户列表',true)+menuLink('tags','标签管理',true)+menuLink('followups','跟进管理',true)+'</div>'+(manager()?'<div class="nav-caption">团队协作</div>'+menuLink('team','团队与权限'):'')+'<div class="nav-caption">内部演示数据 · 仅用于界面评审</div>'}
  function toolsRailHTML(c){const id=c?.id||'';return '<aside class="tool-rail" aria-label="会话工具"><button class="icon-button" data-action="profile" data-id="'+id+'" aria-label="查看客户资料"'+(!c?' disabled':'')+'>'+icon('ContactRound')+'</button><button class="icon-button" data-action="translation" aria-label="翻译设置">'+icon('Languages')+'</button><button class="icon-button" data-action="quickAll" aria-label="选择快捷回复"'+(!c?' disabled':'')+'>'+icon('MessageSquareText')+'</button><button class="icon-button" data-action="followup" data-id="'+id+'" aria-label="安排客户跟进"'+(!c?' disabled':'')+'>'+icon('CalendarPlus')+'</button><button class="icon-button" data-action="profileNote" data-id="'+id+'" aria-label="查看客户备注"'+(!c?' disabled':'')+'>'+icon('NotebookPen')+'</button><span class="tool-separator"></span><a class="icon-button" href="#accounts" data-nav="accounts" aria-label="管理WhatsApp账号" title="管理WhatsApp账号">'+icon('Settings2')+'</a><button class="icon-button" data-action="refreshUI" aria-label="刷新演示视图">'+icon('RefreshCw')+'</button></aside>'}
  function filteredAccounts(){const q=ui.accountQuery.trim().toLowerCase();return myAccounts().filter(a=>(ui.accountStatus==='all'||a.state===ui.accountStatus)&&(!q||[a.name,a.number,a.note,member(a.owner)?.name].join(' ').toLowerCase().includes(q)))}
  function visibleTagGroups(){return data.tagGroups.filter(g=>g.scope===ui.tagScope&&(g.scope==='team'||g.owner===ui.persona||manager()))}
  function filteredTags(){const groups=visibleTagGroups(),q=ui.tagQuery.trim().toLowerCase();return data.tags.filter(t=>groups.some(g=>g.id===t.group)&&(ui.tagGroup==='all'||t.group===ui.tagGroup)&&(!q||t.name.toLowerCase().includes(q)))}
  function tagRows(){const list=filteredTags();return paged(list,'tags').map(t=>'<tr><td>'+esc(t.name)+'</td><td><button class="tag '+esc(t.color)+'" data-action="tagCustomers" data-id="'+t.id+'">'+esc(t.name)+'</button></td><td>'+esc(group(t.group)?.name)+'</td><td>'+myCustomers().filter(c=>c.tags.includes(t.id)).length+'</td><td><div class="task-actions"><button class="link" data-action="tagCustomers" data-id="'+t.id+'">查看客户</button>'+(canEditGroup(group(t.group))?'<button class="icon-button" data-action="editTag" data-id="'+t.id+'" aria-label="编辑标签'+esc(t.name)+'">'+icon('Pencil')+'</button>':'')+'</div></td></tr>').join('')||'<tr><td colspan="5">'+empty('没有匹配标签','选择其他分组，或在有权限的范围添加标签。')+'</td></tr>'}
  function paged(list,view){const size=ui.pageSizes[view]||10,max=Math.max(0,Math.ceil(list.length/size)-1);ui.pages[view]=Math.min(max,Math.max(0,ui.pages[view]||0));return list.slice(ui.pages[view]*size,(ui.pages[view]+1)*size)}
  function rowNumber(view,i){return (ui.pages[view]||0)*(ui.pageSizes[view]||10)+i+1}
  function pagerHTML(total,view){const size=ui.pageSizes[view]||10,max=Math.max(1,Math.ceil(total/size)),page=Math.min(max,(ui.pages[view]||0)+1);return '<div class="pagination" id="'+view+'-pager"><span class="total-count">共 '+total+' 条</span><select data-page-size="'+view+'" aria-label="'+views[view]+'每页数量">'+[10,20,50].map(n=>option(String(n),n+'条/页',String(size))).join('')+'</select><button class="icon-button" data-action="turnPage" data-id="-1" data-view="'+view+'" aria-label="'+views[view]+'上一页"'+(page===1?' disabled':'')+'>'+icon('ChevronLeft')+'</button><span class="page-current">'+page+'</span><button class="icon-button" data-action="turnPage" data-id="1" data-view="'+view+'" aria-label="'+views[view]+'下一页"'+(page===max?' disabled':'')+'>'+icon('ChevronRight')+'</button><span class="jump-label">前往</span><input type="number" min="1" max="'+max+'" value="'+page+'" data-page-jump="'+view+'" aria-label="'+views[view]+'页码"><span class="jump-label">页</span></div>'}
  function openChatTools(id){modal('会话工具','<div class="modal-body"><div class="mobile-tool-menu"><button data-action="profile" data-id="'+id+'">'+icon('ContactRound')+'客户资料</button><button data-action="translation">'+icon('Languages')+'翻译设置</button><button data-action="quickAll">'+icon('MessageSquareText')+'快捷回复</button><button data-action="followup" data-id="'+id+'">'+icon('CalendarPlus')+'安排跟进</button><button data-action="profileNote" data-id="'+id+'">'+icon('NotebookPen')+'客户备注</button><a href="#accounts" data-nav="accounts">'+icon('Settings2')+'账号管理</a></div></div>')}
  
  document.addEventListener('click',e=>{
    const nav=e.target.closest('[data-nav]');if(nav){if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();if($('#dialog').open)close();if(customerMenu.includes(nav.dataset.nav)||nav.dataset.nav==="deals")ui.customerNavOpen=true;if(operationsMenu.includes(nav.dataset.nav))fid.operationsOpen=true;navigate(nav.dataset.nav);return}
    const btn=e.target.closest('[data-action]');if(!btn)return;const a=btn.dataset.action,id=btn.dataset.id;
    switch(a){
      case 'close':close();break;
      case 'toggleSidebar':if(matchMedia('(max-width:760px)').matches)modal('功能导航','<div class="mobile-menu">'+menuHTML(true)+'</div>');else{ui.navCollapsed=!ui.navCollapsed;renderNav();paintIcons();persist()}break;
      case 'toggleCustomerNav':ui.customerNavOpen=!ui.customerNavOpen;renderNav();if($('#dialog').open&&$('#dialog .mobile-menu')){$('#dialog .mobile-menu').innerHTML=menuHTML(true);paintIcons($('#dialog'));$('#dialog .nav-group-button')?.focus()}else paintIcons();break;
      case 'closeTab':{if(id==='inbox'||id==='dashboard'||id==='lifecycle')break;const i=ui.openTabs.indexOf(id);ui.openTabs=ui.openTabs.filter(x=>x!==id);if(ui.view===id)navigate(ui.openTabs[Math.max(0,i-1)]||'inbox','replace');else{renderNav();paintIcons()}persist();break}
      case 'profileNote':ui.profileTab='notes';openProfile(id);break;
      case 'chatTools':openChatTools(id);break;
      case 'refreshUI':render();toast('已刷新当前演示视图。');break;
      case 'queryAccounts':ui.accountQuery=$('#account-query').value;ui.accountStatus=$('#account-state').value;ui.pages.accounts=0;render();break;
      case 'resetAccounts':ui.accountQuery='';ui.accountStatus='all';ui.pages.accounts=0;render();break;
      case 'queryCustomers':ui.pages.customers=0;updateCustomerRows();break;
      case 'resetTagFilter':ui.customerTag='all';$('#customer-tag').value='all';ui.selected.clear();updateCustomerRows();break;
      case 'tagGroupSelect':ui.tagGroup=id;ui.pages.tags=0;render();break;
      case 'queryTags':ui.tagQuery=$('#replica-tag-search').value;ui.pages.tags=0;render();break;
      case 'resetTags':ui.tagQuery='';ui.tagGroup='all';ui.pages.tags=0;render();break;
      case 'turnPage':ui.pages[btn.dataset.view]=(ui.pages[btn.dataset.view]||0)+Number(id);render();break;
      case 'accountScope':{ui.account=id;ui.query='';ui.conversationFilter='all';const c=myCustomers().find(c=>id==='all'||c.account===id);ui.customer=c?.id||null;ui.mobileChat=false;ui.profileTab='details';if($('#dialog').open)close();render();break}
      case 'switchAccount':openAccountSwitcher();break;
      case 'toggleProfile':ui.profileOpen=!ui.profileOpen;persist();render();break;
      case 'review':openReview();break;
      case 'reviewDone':persist();renderNav();paintIcons();close();toast('评审备注已保存在本机，可导出后继续迭代。');break;
      case 'export':exportReq();break;
      case 'openConversation':{const c=customer(id);if(!c||!myCustomers().includes(c))return;ui.customer=id;if(ui.view==='dashboard'){ui.query='';ui.conversationFilter='all'}if(ui.view!=='inbox'||(ui.account!=='all'&&c.account!==ui.account))ui.account='all';ui.mobileChat=true;c.unread=0;ui.profileTab='details';if($('#dialog').open)close();persist();navigate('inbox');break}
      case 'backList':ui.mobileChat=false;render();break;
      case 'conversationFilter':ui.conversationFilter=id;render();break;
      case 'star':{const c=customer(id);c.star=!c.star;persist();render();break}
      case 'profile':openProfile(id);break;
      case 'profileTab':switchProfileTab(id,btn.dataset.customer);break;
      case 'saveNote':{const c=customer(id);c.notes=btn.closest('.customer-profile').querySelector('.profile-note').value;delete ui.noteDrafts[c.id];addActivity(c.id,'更新客户备注');persist();btn.closest('.customer-profile').querySelector('.note-save span').textContent='已保存到本机';toast('客户备注已保存。');break}
      case 'removeTag':{const c=customer(btn.dataset.customer),removed=tag(id);c.tags=c.tags.filter(t=>t!==id);addActivity(c.id,'移除标签「'+(removed?.name||'')+'」');persist();refreshInboxProfiles(c);toast('已移除标签「'+(removed?.name||'')+'」。',()=>{if(!c.tags.includes(id))c.tags.push(id);addActivity(c.id,'撤销移除标签「'+(removed?.name||'')+'」');persist();refreshInboxProfiles(c)});break}
      case 'assignTags':openTagAssign([id]);break;
      case 'batchTags':openTagAssign([...ui.selected]);break;
      case 'addTag':openTagForm(null,btn.dataset.group||null);break;
      case 'editTag':openTagForm(id);break;
      case 'addTagGroup':openGroupForm();break;
      case 'tagColor':$('#tag-color').value=id;document.querySelectorAll('.color-option').forEach(x=>x.classList.toggle('selected',x.dataset.id===id));break;
      case 'tagScope':ui.tagScope=id;ui.tagGroup='all';ui.tagQuery='';ui.pages.tags=0;render();break;
      case 'tagCustomers':ui.customerTag=id;ui.customerQuery='';ui.customerStage='all';ui.customerOwner='all';navigate('customers');break;
      case 'followup':openFollowup(id);break;
      case 'newTask':openFollowup();break;
      case 'taskFilter':ui.taskFilter=id;render();break;
      case 'taskDone':{const t=data.tasks.find(t=>t.id===id);if(!t||(!manager()&&t.owner!==ui.persona))return;t.done=!t.done;addActivity(t.customer,(t.done?'完成跟进：':'重新打开跟进：')+t.title);const c=customer(t.customer);const next=data.tasks.filter(x=>x.customer===c.id&&!x.done).sort((a,b)=>new Date(a.due)-new Date(b.due))[0];c.followup=next?.due||null;persist();render();if($('#dialog').open&&$('.profile-dialog'))openProfile(c.id);toast(t.done?'跟进已完成，记录已写回客户档案。':'已重新打开跟进。');break}
      case 'addAccount':openAccountForm();break;
      case 'editAccount':openAccountForm(id);break;
      case 'accountInbox':{ui.account=id;ui.conversationFilter='all';ui.query='';const c=myCustomers().find(c=>c.account===id);ui.customer=c?.id||null;ui.mobileChat=false;navigate('inbox');break}
      case 'addCustomer':openCustomerForm();break;
      case 'resetCustomerFilters':ui.customerQuery='';ui.customerTag='all';ui.customerStage='all';ui.customerOwner='all';ui.selected.clear();render();break;
      case 'clearSelection':ui.selected.clear();render();break;
      case 'addMember':openMemberForm();break;
      case 'memberAccounts':openMemberAccounts(id);break;
      case 'transfer':openTransfer([id]);break;
      case 'batchTransfer':openTransfer([...ui.selected]);break;
      case 'duplicate':openDuplicate(id);break;
      case 'translation':openTranslation();break;
      case 'quickAll':openQuick();break;
      case 'quick':fillQuick(id);break;
      case 'send':send();break;
      case 'attachment':{formModal('添加演示附件','attachment-form','<p class="modal-description">输入一个文件名以评审附件在聊天中的位置。不会读取、上传或发送任何真实文件。</p><label class="field">演示文件名<input name="name" required maxlength="100" placeholder="例如：产品目录.pdf"></label>','加入演示消息');break}
      case 'removeAttachment':ui.attachment=null;persist();updateSendState(selectedCustomer());$('#translation-preview').innerHTML=previewHTML(selectedCustomer());paintIcons();break;
      case 'resetDemo':modal('恢复初始演示数据','<div class="modal-body"><p class="modal-description">恢复虚构账号、客户、消息、标签和待办。你已经填写的功能范围判断和评审备注会保留。</p></div>',cancel+'<button class="button primary" data-action="confirmReset">恢复演示数据</button>');break;
      case 'confirmReset':data=clone(window.WA_DEMO);fidResetExtras();ui.persona='lin';ui.customer='c1';ui.account='all';ui.selected.clear();ui.drafts={};ui.noteDrafts={};ui.attachments={};ui.attachment=null;ui.profileOpen=true;ui.pages={};ui.tagGroup='all';ui.tagQuery='';ui.accountQuery='';ui.accountStatus='all';persist();close();render();toast('演示数据已恢复；范围判断与评审备注已保留。');break;
    }
  });
  document.addEventListener('input',e=>{
    const t=e.target;
    if(t.id==='conversation-search'){ui.query=t.value;$('#conversation-list').innerHTML=conversationRows();paintIcons($('#conversation-list'))}
    if(t.id==='customer-search'&&!t.closest('.fid-customer-filter')){ui.customerQuery=t.value;ui.selected.clear();updateCustomerRows()}
    if(t.id==='composer-text'){const c=selectedCustomer();const old=draft(c);ui.drafts[c.id]={text:t.value,translated:old.source===t.value?old.translated:'',source:old.source};$('#translation-preview').innerHTML=previewHTML(c);paintIcons($('#translation-preview'));persist();updateSendState(c);const hint=$('.language-hint');if(hint){hint.innerHTML=icon('Languages')+esc(c.language)+' · '+(ui.drafts[c.id].translated?'已有示例译文':'发送原文');paintIcons(hint)}}
    if(t.dataset.noteCustomer){ui.noteDrafts[t.dataset.noteCustomer]=t.value;persist();t.closest('.customer-profile').querySelector('.note-save span').textContent='未保存的修改'}
    if(t.dataset.reviewNote){const i=req.review.items.find(i=>i.id===t.dataset.reviewNote);i.notes=t.value;persist();renderNav();paintIcons()}
    if(t.dataset.scopeNotes){req.modules.find(m=>m.id===t.dataset.scopeNotes).notes=t.value;persist()}
  });
  function updateCustomerRows() {
    if(!$('#customer-rows'))return;ui.pages.customers=0;$('#customer-rows').innerHTML=customerRows();$('#customer-total').textContent='当前 '+filteredCustomers().length+' 位客户';$('#selected-count').textContent=ui.selected.size;$('#batchbar').hidden=!ui.selected.size;$('#select-all-customers').checked=filteredCustomers().length>0&&filteredCustomers().every(c=>ui.selected.has(c.id));$('#customers-pager').outerHTML=pagerHTML(filteredCustomers().length,'customers');paintIcons($('#view'));
  }
  document.addEventListener('change',e=>{
    const t=e.target;
    if(t.dataset.pageSize){ui.pageSizes[t.dataset.pageSize]=Number(t.value);ui.pages[t.dataset.pageSize]=0;render()}
    if(t.dataset.pageJump){ui.pages[t.dataset.pageJump]=Math.max(0,Number(t.value)-1);render()}
    if(t.id==='account-filter'){ui.account=t.value;const list=filteredConversations();if(list.length&&!list.some(c=>c.id===ui.customer))ui.customer=list[0].id;render()}
    if(t.dataset.stage){const c=customer(t.dataset.stage);c.stage=t.value;addActivity(c.id,'客户阶段更新为「'+t.value+'」');persist();refreshInboxProfiles(c);toast('客户阶段已更新。')}
    if(t.id==='customer-tag'||t.id==='customer-stage'||t.id==='customer-owner'){ui[{ 'customer-tag':'customerTag','customer-stage':'customerStage','customer-owner':'customerOwner'}[t.id]]=t.value;ui.selected.clear();updateCustomerRows()}
    if(t.dataset.selectCustomer){if(t.checked)ui.selected.add(t.dataset.selectCustomer);else ui.selected.delete(t.dataset.selectCustomer);$('#selected-count').textContent=ui.selected.size;$('#batchbar').hidden=!ui.selected.size}
    if(t.id==='select-all-customers'){filteredCustomers().forEach(c=>t.checked?ui.selected.add(c.id):ui.selected.delete(c.id));updateCustomerRows()}
    if(t.id==='receive-translation'){ui.receiveTranslation=t.checked;persist();if(ui.view==='inbox'&&$('#messages')){const c=selectedCustomer();$('#messages').innerHTML=messagesHTML(c);paintIcons($('#messages'))}toast(t.checked?'已展开示例中文译文。':'已收起中文译文。')}
    if(t.dataset.reviewStatus){req.review.items.find(i=>i.id===t.dataset.reviewStatus).status=t.value;persist();renderNav();paintIcons()}
    if(t.dataset.scopeDecision){req.modules.find(m=>m.id===t.dataset.scopeDecision).decision=t.value;persist();renderNav();const badge=t.closest('.scope-card').querySelector('h3 .tag');badge.textContent=t.value;badge.className='tag '+(t.value==='待定'?'gold':t.value==='本轮不展示'?'slate':'jade');paintIcons()}
  });
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!$('#dialog').open&&!e.target.closest('input,textarea,select,[contenteditable]')){const search=$('#conversation-search')||$('#customer-search');if(search){e.preventDefault();search.focus()}}if(e.target.id==='composer-text'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send()}});
  document.addEventListener('submit',e=>{
    const form=e.target,formId=form.getAttribute('id')||'';if(!formId.endsWith('-form'))return;e.preventDefault();form.querySelectorAll('[aria-invalid]').forEach(x=>{x.removeAttribute('aria-invalid');x.removeAttribute('aria-describedby')});form.querySelectorAll('.field-error').forEach(x=>x.remove());const f=new FormData(form),val=k=>String(f.get(k)||'').trim();
    if(formId==='account-form'){const name=val('name');if(!name)return error('请填写账号名称。');let a=account(val('id'));const values={name,number:val('number')||'号码待授权后识别',country:val('country'),note:val('note'),owner:manager()?val('owner'):ui.persona};if(a)Object.assign(a,values);else data.accounts.push({id:nextId('a'),...values,state:'pending',color:['jade','blue','peach','purple','gold'][data.accounts.length%5],lastSync:'尚未连接'});persist();close();render();toast('演示账号已保存；真实接入尚未执行。')}
    if(formId==='customer-form'){if(!val('name')||!val('phone'))return error('请填写客户称呼和 WhatsApp 号码。');const phone=val('phone').replace(/[^\d]/g,'');if(phone.length<7)return error('请使用包含国家区号的号码。');const duplicate=data.customers.find(c=>c.phone.replace(/[^\d]/g,'')===phone);if(duplicate)return error('演示数据中已有该号码。重复客户归属/合并规则待确认。');const a=account(val('account'));const c={id:nextId('c'),createdAt:new Date().toISOString(),name:val('name'),initials:initial(val('name')),phone:val('phone'),country:val('country'),city:'待补充',timezone:val('country')==='PR'?'America/Puerto_Rico':'America/New_York',language:val('language'),owner:a.owner||ui.persona,account:a.id,tags:[],stage:'新客户',source:val('source'),campaign:'',ad:'',unread:0,star:false,last:'刚刚',preview:'新建客户档案',translation:'',followup:null,notes:val('notes'),color:'jade',contactRefs:[{account:a.id,owner:a.owner||ui.persona}]};data.customers.unshift(c);addActivity(c.id,'手动建立客户档案');persist();close();render();toast('客户档案已创建。')}
    if(formId==='tag-form'){const name=val('name'),gid=val('group');if(!name)return error('请填写标签名称。');const g=group(gid);if(!g||!canEditGroup(g))return error('没有修改此分组的权限。');const t=tag(val('id'));if(data.tags.some(x=>x.name===name&&x.group===gid&&x.id!==t?.id))return error('同一分组已存在这个标签。');if(t)Object.assign(t,{name,group:gid,color:val('color')});else data.tags.push({id:nextId('tag'),name,group:gid,color:val('color')});ui.tagScope=g.scope;persist();close();render();toast('标签已保存。')}
    if(formId==='group-form'){if(!val('name'))return error('请填写分组名称。');const scope=manager()?val('scope'):'private';data.tagGroups.push({id:nextId('g'),name:val('name'),scope,owner:scope==='private'?ui.persona:null});ui.tagScope=scope;persist();close();navigate('tags');toast('标签分组已创建。')}
    if(formId==='assign-tags-form'){const ids=val('ids').split(','),selected=f.getAll('tags');for(const id of ids){const c=customer(id);if(!c||!myCustomers().includes(c))continue;c.tags=ids.length===1?selected:[...new Set([...c.tags,...selected])];addActivity(c.id,'更新客户标签')}persist();close();render();toast(ids.length===1?'客户标签已更新。':'已为所选客户追加标签。')}
    if(formId==='followup-form'){const c=customer(val('customer'));if(!c||!val('title')||!val('due'))return error('请填写客户、跟进事项和时间。');const due=new Date(val('due'));if(Number.isNaN(due.getTime()))return error('请填写有效的时间。');data.tasks.push({id:nextId('t'),customer:c.id,owner:c.owner,title:val('title'),due:due.toISOString(),priority:val('priority'),done:false});const tasks=data.tasks.filter(t=>t.customer===c.id&&!t.done).sort((a,b)=>new Date(a.due)-new Date(b.due));c.followup=tasks[0].due;addActivity(c.id,'安排跟进：'+val('title'));persist();close();render();toast('跟进已安排，客户档案与待办已同步。')}
    if(formId==='member-form'){if(!manager())return;if(!val('name')||!val('team'))return error('请填写成员姓名和团队。');data.members.push({id:nextId('u'),name:val('name'),initial:val('name').slice(-1),role:val('role'),team:val('team'),color:'blue'});persist();close();render();toast('演示成员已创建，可继续分配账号。')}
    if(formId==='member-accounts-form'){if(!manager())return;const id=val('member'),chosen=f.getAll('accounts');for(const a of data.accounts){if(chosen.includes(a.id))a.owner=id;else if(a.owner===id)a.owner=null}persist();close();render();toast('演示账号分配已更新，客户归属未改变。')}
    if(formId==='transfer-form'){if(!manager())return;const ids=val('ids').split(','),owner=val('owner');if(!member(owner))return error('请选择接收成员。');for(const id of ids){const c=customer(id);if(!c)continue;const old=member(c.owner)?.name;c.owner=owner;data.tasks.filter(t=>t.customer===id&&!t.done).forEach(t=>t.owner=owner);addActivity(id,'客户由 '+old+' 转交给 '+member(owner).name+(val('reason')?'：'+val('reason'):''))}persist();close();ui.selected.clear();render();toast('客户与未完成待办已演示转交。账号归属未改变。')}
    if(formId==='attachment-form'){if(!val('name'))return error('请填写演示文件名。');ui.attachment=val('name');persist();close();updateSendState(selectedCustomer());if(ui.view==='inbox'){const c=selectedCustomer();$('#translation-preview').innerHTML=previewHTML(c);paintIcons()}toast('附件仅使用文件名演示，没有上传文件。')}
  });
  $('#dialog').addEventListener('close',()=>{const d=$('#dialog'),t=$('#toast');if(!d.open){if(t.parentElement===d)document.body.append(t);if(t.dataset.dismissOnClose==='1'){t.classList.remove('show');t.dataset.dismissOnClose=''}}});
  $('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const r=$('#dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});
  window.addEventListener('popstate',()=>{const v=location.hash.slice(1);if(subsiteSignedOut||v==='login')render();else if(v!=='view')navigate(v,'replace')});
  window.addEventListener('hashchange',()=>{const v=location.hash.slice(1);if(subsiteSignedOut||v==='login')render();else if(Object.hasOwn(views,v)&&v!==ui.view)navigate(v,'replace')});
  function updateSendState(c){const b=document.querySelector('[data-action="send"]');if(b&&c)b.disabled=account(c.account)?.state!=='online'||(!draft(c).text.trim()&&!ui.attachment)}
  if(['team','members'].includes(ui.view)&&!manager())ui.view='inbox';
  // Presentation and demo interactions for the measured reference layout.
  const fid = { tagChecked:new Set(), accountChecked:new Set(), customerTags:[],
    customerCountry:'all', customerType:'all', customerField:'name', customerStart:'',customerEnd:'',customerPlatform:true,
    accountField:'name',accountPlatform:true,accountChannel:'all',
    orgOpen:true, operationsOpen:true, roleState:'all', memberFilter:{id:'',name:'',role:'all',status:'all'},
    waTab:new URLSearchParams(location.search).get('tab')==='numbers'?'numbers':'chat', chatOpen:false, followMode:'history',
    logFilter:{start:'',end:'',app:'all',field:'invite',query:''} };
  const oldFollowupView = renderFollowups;
  const customerMenu = ['customers','chat-records','tags','tag-stats','followups'];
  const operationsMenu = ['materials'];
  const fidDate = v => !v ? '—' : Number.isNaN(new Date(v).getTime()) ? String(v) : new Date(v).toLocaleString('sv-SE').slice(0,16);
  const fidDay = (offset=0) => new Date(Date.now()+offset*86400000).toISOString();
  const fidStages = ['新客户','跟进中','已报价','已成交','培育中'];
  const fidPerms = ['账号列表','WhatsApp API','客户列表','标签管理','跟进记录'];
  const fidMemberRole = m => m?.roleGroup || (m?.role==='manager'?'lead':'agent');
  const fidRole = id => data.roleGroups.find(r=>r.id===id);
  const fidInvite = a => a?.invite || (a ? 'WA-'+String(data.accounts.indexOf(a)+1).padStart(3,'0') : '—');
  const fidGroupList = () => data.tagGroups.filter(g=>g.scope==='team'||g.owner===ui.persona||manager());
  const fidBaseTags=tagsHTML;
  tagsHTML=function(c,max=99,remove=false){const allowed=new Set(myTags().map(t=>t.id));return fidBaseTags({...c,tags:c.tags.filter(id=>allowed.has(id))},max,remove);};
  const fidLegacyTagLabels = {interest:['意向标记','multi'],source:['来源渠道','single'],preference:['沟通语言','single'],personal:['工作标记','multi']};
  function fidRemovePresetTags() {
    if (data.presetTagsRemoved) return;
    const seed = window.WA_DEMO;
    const legacyTags = new Map(seed.tags.map(t=>[t.id,t]));
    const legacyGroups = new Map(seed.tagGroups.map(g=>[g.id,g]));
    const legacyAssignments = new Map(seed.customers.map(c=>[c.id,new Set(c.tags)]));
    const presetGroups = new Set(data.tagGroups.filter(g=>{
      const original = legacyGroups.get(g.id);
      return original && g.name===original.name && g.scope===original.scope && g.owner===original.owner;
    }).map(g=>g.id));
    const retained = new Set(data.customers.flatMap(c=>c.tags.filter(id=>!legacyAssignments.get(c.id)?.has(id))));
    for (const d of data.tagDefs || []) {
      const label = fidLegacyTagLabels[d.group];
      const edited = !label || d.id!=='def-'+d.group || d.name!==label[0] || d.mode!==label[1] || d.values.some(id=>legacyTags.get(id)?.group!==d.group);
      if (edited) d.values.forEach(id=>retained.add(id));
    }
    const removed = new Set();
    for (const t of data.tags) {
      const original = legacyTags.get(t.id);
      const untouched = original && presetGroups.has(t.group) && t.name===original.name && t.group===original.group && t.color===original.color;
      if (untouched && !retained.has(t.id)) removed.add(t.id);
    }
    data.tags = data.tags.filter(t=>!removed.has(t.id));
    for (const c of data.customers) c.tags = c.tags.filter(id=>!removed.has(id));
    const groupsInUse = new Set(data.tags.map(t=>t.group));
    data.tagGroups = data.tagGroups.filter(g=>!presetGroups.has(g.id) || groupsInUse.has(g.id));
    const exampleHistory = seed.activities.c1.find(entry=>entry.text.startsWith('加入标签'));
    if ((removed.has('high') || removed.has('quote')) && exampleHistory && data.activities.c1) {
      data.activities.c1 = data.activities.c1.filter(item=>item.by!==exampleHistory.by || item.time!==exampleHistory.time || ![exampleHistory.text,'加入标签「待报价」'].includes(item.text));
    }
    data.presetTagsRemoved = true;
  }
  function fidMigrateTags() {
    fidRemovePresetTags();
    if (!Array.isArray(data.tagDefs)) return;

    // Older definitions already stored each value as a tag and assigned its ID to customers.
    const tagIds = new Map();
    const aliases = new Map();
    data.tags = data.tags.filter(t=>{
      const key = JSON.stringify([t.group,t.name.trim().toLowerCase()]);
      const existing = tagIds.get(key);
      if (existing) {
        aliases.set(t.id,existing);
        return false;
      }
      tagIds.set(key,t.id);
      return true;
    });
    if (aliases.size) {
      for (const c of data.customers) c.tags = [...new Set(c.tags.map(id=>aliases.get(id)??id))];
    }
    delete data.tagDefs;
  }
  function fidSeed() {
    fidMigrateTags();
    if (!Array.isArray(data.roleGroups)) data.roleGroups=[
      {id:'lead',name:'主管',enabled:true,view:[...fidPerms],write:[...fidPerms],created:fidDay(-7),builtIn:true},
      {id:'agent',name:'聊手',enabled:true,view:[...fidPerms],write:['WhatsApp API','客户列表','跟进记录'],created:fidDay(-7),builtIn:true},
    ];
    for (const [i,c] of data.customers.entries()) {
      c.createdAt ||= fidDay(-i-2);
      c.updatedAt ||= fidDay(-Math.min(i,3));
      c.clientType ||= i===4?'新增线索-补录':c.contactRefs?.length>1?'重复线索':'新增线索-实时';
    }
  }
  fidSeed();
  ui.pageSizes.customers=20; ui.pageSizes.followups=20;
  ui.tagGroup=(fidGroupList().find(canEditGroup)||fidGroupList()[0])?.id||'all';
  ui.openTabs=[...new Set(['dashboard','accounts','inbox',...customerMenu,...ui.openTabs])];

  function fidButton(label, action, glyph='', style='', attrs='') {
    return `<button type="button" class="fid-btn ${style}" ${action?`data-action="${action}"`:''} ${attrs}>${glyph?icon(glyph):''}${esc(label)}</button>`;
  }
  function fidIcon(label,action,glyph,id='',extra='') {
    return `<button class="icon-button ${extra}" data-action="${action}" data-id="${esc(id)}" aria-label="${esc(label)}">${icon(glyph)}</button>`;
  }
  const fidActionID = id => `data-id="${esc(id)}"`;
  const fidOption = (values,value) => values.map(x=>Array.isArray(x)?option(x[0],x[1],value):option(x,x,value)).join('');
  const fidHead = (title,description='') => `<div class="fid-heading"><h1>${esc(title)}</h1>${description?`<p>${esc(description)}</p>`:''}</div>`;
  function fidTable(cls,columns,rows,emptyLabel='暂无数据',large=false,emptyIcon='Inbox') {
    return `<div class="fid-table-scroll" tabindex="0" aria-label="${esc(views[ui.view])}表格"><table class="fid-table ${cls}"><colgroup>${columns.map(()=>'<col>').join('')}</colgroup><thead><tr>${columns.map(s=>`<th scope="col">${s}</th>`).join('')}</tr></thead><tbody>${rows||fidEmptyRow(columns.length,emptyLabel,large,emptyIcon)}</tbody></table></div>`;
  }
  function fidEmptyRow(cols,label,large=false,glyph='Inbox') {
    return `<tr><td class="${large?'fid-large-empty':'fid-plain-empty'}" colspan="${cols}">${large?`<div class="fid-empty">${icon(glyph)}<span>${esc(label)}</span></div>`:esc(label)}</td></tr>`;
  }
  function fidPager(total,key,choices=[10,20,50,100]) {
    const size=ui.pageSizes[key]||10, max=Math.max(1,Math.ceil(total/size)), page=Math.min(max,(ui.pages[key]||0)+1), label=views[key]||'记录';
    return `<div class="fid-pager" id="${key}-pager"><span>共 ${total} 条</span><select class="fid-select" data-page-size="${key}" aria-label="${label}每页数量">${choices.map(n=>option(String(n),n+'条/页',String(size))).join('')}</select><button data-action="turnPage" data-id="-1" data-view="${key}" aria-label="上一页" ${page<=1?'disabled':''}>${icon('ChevronLeft')}</button><span class="fid-page-number" aria-current="page">${page}</span><button data-action="turnPage" data-id="1" data-view="${key}" aria-label="下一页" ${page>=max?'disabled':''}>${icon('ChevronRight')}</button><span class="fid-jump">前往</span><input class="fid-input fid-jump" type="number" min="1" max="${max}" value="${page}" data-page-jump="${key}" aria-label="${label}页码"><span class="fid-jump">页</span></div>`;
  }
  function fidDialog(title,body,footer='',wide=false) {
    modal(title,body,footer); $('#dialog').classList.add('fid-dialog'); if(wide)$('#dialog').classList.add('fid-wide');
  }
  function fidForm(title,id,body,submit='确 定',opts={}) {
    const save=`<button type="submit" class="fid-btn blue">${esc(submit)}</button>`, closeButton=fidButton('取 消','close');
    fidDialog(title,`<form id="${id}-form" novalidate><div class="modal-body">${body}<div id="form-error" class="form-error" role="alert"></div></div><div class="modal-footer">${opts.saveLast?closeButton+save:save+closeButton}</div></form>`,'',opts.wide);
    $('#dialog form input:not([type="hidden"]):not([disabled])')?.focus();
  }
  const fidFormRow = (label,content,field='',required=false) => `<div class="fid-form-row">${field?`<label for="${field}">`:'<span class="fid-form-label">'}${required?'<b class="fid-required">*</b>':''}${esc(label)}${field?'</label>':'</span>'}<div>${content}</div></div>`;
  function fidCountField(id,name,value,max,placeholder,required=false) {
    return `<span class="fid-count-field"><input class="fid-input" id="${id}" name="${name}" value="${esc(value)}" maxlength="${max}" placeholder="${esc(placeholder)}" ${required?'required':''} data-fid-count><span class="fid-count" aria-hidden="true">${String(value).length} / ${max}</span></span>`;
  }
  function fidConfirm(title,message,action,id='',style='blue') {
    fidDialog(title,`<div class="modal-body"><p>${esc(message)}</p></div>`,fidButton('确 定',action,'',style,fidActionID(id))+fidButton('取 消','close'));
  }

  viewIcon = id => ({dashboard:'LayoutDashboard',inbox:'MessageCircle',accounts:'Smartphone',customers:'ContactRound','chat-records':'MessagesSquare',tags:'Tags','tag-stats':'ChartColumn',followups:'ClipboardList',materials:'Images',team:'Network',members:'UsersRound',scope:'SlidersHorizontal'}[id]||'FileText');
  menuLink = function(id,label,child=false,mobile=false) {
    return `<a class="nav-item ${ui.view===id?'active':''} ${id==='scope'?'scope-link':''}" href="#${id}" data-nav="${id}" aria-label="${esc(label)}" title="${esc(label)}" ${ui.view===id?'aria-current="page"':''}>${icon(viewIcon(id))}<span class="nav-label">${esc(label)}</span>${id==='scope'&&!mobile?'<span class="nav-count" id="pending-count"></span>':''}</a>`;
  };
  menuHTML = function(mobile=false) {
    const navGroup=(title,glyph,action,opened,ids)=>`<button class="nav-group-button ${ids.includes(ui.view)?'group-active':''}" data-action="${action}" aria-expanded="${opened}">${icon(glyph)}<span class="nav-label">${title}</span>${icon(opened?'ChevronUp':'ChevronDown')}</button><div class="submenu" ${opened?'':'hidden'}>${ids.map(id=>menuLink(id,views[id],true)).join('')}</div>`;
    return menuLink('dashboard',views.dashboard)+menuLink('accounts',views.accounts)+menuLink('inbox',views.inbox)+'<div class="nav-caption">客户运营</div>'+navGroup('客户管理','ContactRound','fidNavCustomers',ui.customerNavOpen,customerMenu)+navGroup('运营管理','ChartColumn','fidNavOperations',fid.operationsOpen,operationsMenu)+(manager()?'<div class="nav-caption">账户与组织</div>'+navGroup('组织管理','Network','fidNavOrg',fid.orgOpen,['team','members']):'')+'<div class="nav-caption">工作台设置</div>'+menuLink('scope',views.scope,false,mobile);
  };

  const fidTagCount = (id, customers=myCustomers()) => customers.filter(c=>c.tags.includes(id)).length;
  const fidGroupForCreate = () => ui.tagGroup==='all' ? fidGroupList().find(canEditGroup) : group(ui.tagGroup);
  renderTags = function() {
    const groups=fidGroupList();
    if (!groups.length) {
      ui.tagGroup='all';
      return `<section class="fid-page"><div class="fid-panel">${fidHead('标签管理')}<div class="fid-tag-setup">
        ${icon('Tags')}<h2>还没有标签分组</h2><p>创建分组后可添加标签。</p>
        ${fidButton('添加分组','fidGroupAdd','Plus','blue')}
      </div></div></section>`;
    }
    if(ui.tagGroup!=='all'&&!groups.some(g=>g.id===ui.tagGroup))ui.tagGroup=groups[0].id;
    const tags=myTags(), customers=myCustomers();
    const list=tags.filter(t=>(ui.tagGroup==='all'||ui.tagGroup===t.group)&&fidMatch(t.name,ui.tagQuery));
    const selected=group(ui.tagGroup), candidate=fidGroupForCreate(), editable=candidate&&canEditGroup(candidate);
    const gRow=(id,label,g)=>`<div class="fid-group-row ${ui.tagGroup===id?'active':''}"><button data-action="fidGroupSelect" ${fidActionID(id)} aria-pressed="${ui.tagGroup===id}" title="${esc(label)}">${esc(label)}</button>${g&&canEditGroup(g)?fidIcon('编辑分组'+g.name,'fidGroupEdit','SquarePen',g.id)+fidIcon('删除分组'+g.name,'fidGroupDelete','Trash2',g.id,'fid-danger'):''}</div>`;
    const rows=paged(list,'tags').map(t=>{
      const g=group(t.group), canEdit=canEditGroup(g);
      return `<tr>
        <td><input type="checkbox" data-fid-tag-select="${esc(t.id)}" aria-label="选择标签${esc(t.name)}" ${fid.tagChecked.has(t.id)?'checked':''} ${canEdit?'':'disabled'}></td>
        <td><button class="tag ${esc(t.color)}" data-action="fidTagCustomers" ${fidActionID(t.id)}>${esc(t.name)}</button></td>
        <td>${esc(g.name)}</td>
        <td><button class="fid-link" data-action="fidTagCustomers" ${fidActionID(t.id)} aria-label="查看${esc(t.name)}客户">${fidTagCount(t.id,customers)}</button></td>
        <td><div class="fid-icon-actions">${canEdit?fidIcon('编辑标签'+t.name,'fidTagEdit','SquarePen',t.id)+fidIcon('删除标签'+t.name,'fidTagDelete','Trash2',t.id,'fid-danger'):'<span class="muted">仅查看</span>'}</div></td>
      </tr>`;
    }).join('');
    const columns=['<input id="fid-tag-all" type="checkbox" aria-label="全选可维护标签">','标签','分组','客户数','操作'];
    return `<section class="fid-page"><div class="fid-panel">
      ${fidHead('标签管理')}
      <div class="fid-filter-row fid-tag-query"><input class="fid-input" id="replica-tag-search" placeholder="搜索标签" aria-label="搜索标签" value="${esc(ui.tagQuery)}">${fidButton('搜索','queryTags','Search','blue')}${fidButton('重选','fidTagReset','RotateCw')}</div>
      <div class="fid-actions fid-tag-actions">${fidButton('添加标签','fidTagAdd','Plus','tint',editable?'':'disabled title="请选择可维护的分组"')}${fidButton('批量删除','fidTagBatchDelete','Trash2','',fid.tagChecked.size?'':'disabled')}${selected?.scope==='private'?'<span class="fid-small-note">个人分组</span>':''}</div>
      <div class="fid-tag-layout"><aside class="fid-tag-groups" aria-label="标签分组">
        ${gRow('all','全部分组',null)}${groups.map(g=>gRow(g.id,`${g.name} (${tags.filter(t=>t.group===g.id).length})`,g)).join('')}
        <button class="fid-btn fid-group-add" data-action="fidGroupAdd">${icon('Plus')}添加分组</button>
      </aside><div>${fidTable('fid-tag-table',columns,rows,ui.tagQuery?'没有匹配的标签':'此分组还没有标签')}${fidPager(list.length,'tags')}</div></div>
    </div></section>`;
  };
  function fidTagEdit(id) {
    const t=tag(id),g=id?group(t?.group):fidGroupForCreate();
    if(!g||!canEditGroup(g)) return toast('选择可维护的分组后再添加标签。');
    fidForm(t?'编辑标签':'添加标签','fid-tag',`<input type="hidden" name="id" value="${esc(t?.id||'')}"><input type="hidden" name="group" value="${esc(g.id)}">
      ${fidFormRow('所属分组',`<span class="fid-tag-group-label">${esc(g.name)}</span>`)}
      ${fidFormRow('标签',fidCountField('fid-tag-name','name',t?.name||'',30,'输入标签内容',true),'fid-tag-name',true)}`,'保存');
  }
  function fidGroupEdit(id) {
    const g=group(id);if(g&&!canEditGroup(g))return;
    fidForm(g?'编辑分组':'添加分组','fid-group',`<input name="id" type="hidden" value="${esc(id||'')}">${fidFormRow('分组名称',fidCountField('fid-group-name','name',g?.name||'',20,'请输入分组名称',true),'fid-group-name',true)}${manager()&&!g?fidFormRow('适用范围',`<select id="fid-group-scope" name="scope" class="fid-select">${fidOption([['team','公共分组'],['private','个人分组']],'team')}</select>`,'fid-group-scope'):''}`);
  }
  function fidRemoveTags(ids) {
    const selected=myTags().filter(t=>ids.includes(t.id)&&canEditGroup(group(t.group)));
    if (!selected.length) return;
    const originalTags=data.tags.slice();
    const removed=new Set(selected.map(t=>t.id));
    const assignments=new Map();
    for (const c of data.customers) {
      const assigned=c.tags.filter(id=>removed.has(id));
      if (!assigned.length) continue;
      assignments.set(c.id,assigned);
      c.tags=c.tags.filter(id=>!removed.has(id));
    }
    data.tags=data.tags.filter(t=>!removed.has(t.id));
    fid.customerTags=fid.customerTags.filter(id=>!removed.has(id));
    if (removed.has(ui.customerTag)) ui.customerTag='all';
    fid.tagChecked.clear();
    persist();close();render();
    toast('已删除 '+selected.length+' 个演示标签。',()=>{
      data.tags=originalTags;
      for (const [id,tags] of assignments) {
        const c=customer(id);
        if (c) c.tags=[...new Set([...c.tags,...tags])];
      }
      persist();render();
    });
  }
  function fidTagChoices(checked) {
    const tags=myTags();
    return fidGroupList().map(g=>{
      const values=tags.filter(t=>t.group===g.id).map(t=>`<label class="fid-choice" data-fid-tag-label="${esc(t.name.toLowerCase())}">
        <input type="checkbox" name="tags" value="${esc(t.id)}" ${checked.includes(t.id)?'checked':''}>
        <span class="tag ${esc(t.color)}">${esc(t.name)}</span>
      </label>`).join('');
      return values?`<section><h3>${esc(g.name)}</h3>${values}</section>`:'';
    }).join('');
  }
  function fidOpenTagPicker(title,formId,checked,{ids=[],submit}={}) {
    const choices=fidTagChoices(checked);
    const manage=`<a class="fid-btn ${choices?'':'blue'}" href="#tags" data-nav="tags">${icon('Settings2')}管理标签</a>`;
    if (!choices) {
      fidDialog(title,'<div class="modal-body"><p class="fid-empty">还没有标签</p></div>',fidButton('取消','close')+manage);
      return;
    }
    const targets=ids.length?`<input type="hidden" name="ids" value="${esc(ids.join(','))}">`:'';
    fidForm(title,formId,`${targets}<div class="fid-tag-picker-tools"><input class="fid-input" id="fid-choice-search" aria-label="搜索可用标签" placeholder="搜索标签">${manage}</div><div class="fid-tag-picker">${choices}<p class="fid-tag-no-match" role="status" hidden>没有匹配的标签</p></div>`,submit);
  }
  function fidOpenTagFilter() {
    fidOpenTagPicker('按标签筛选客户','fid-tag-filter',fid.customerTags,{submit:'筛选'});
  }
  openTagAssign = function(ids) {
    const records=ids.map(customer).filter(c=>c&&myCustomers().includes(c));if(!records.length)return toast('请先选择客户。');
    fidOpenTagPicker(records.length===1?'设置客户标签':'批量打标签','fid-tag-assign',records.length===1?records[0].tags:[],{ids:records.map(c=>c.id),submit:'保存'});
  };

  function fidViewCustomerTags(id) {
    const c=myCustomers().find(item=>item.id===id);
    if(!c)return;
    const assigned=myTags().filter(t=>c.tags.includes(t.id));
    const sections=fidGroupList().map(g=>{
      const tags=assigned.filter(t=>t.group===g.id);
      if(!tags.length)return '';
      const items=tags.map(t=>`<li class="tag ${esc(t.color)}">${esc(t.name)}</li>`).join('');
      return `<section><h3>${esc(g.name)}</h3><ul role="list">${items}</ul></section>`;
    }).join('');
    fidDialog('客户标签',`<div class="modal-body">
      <div class="fid-customer-tag-summary"><strong>${esc(c.name)}</strong><small>共 ${assigned.length} 个标签</small></div>
      ${sections?`<div class="fid-tag-picker fid-customer-tag-list">${sections}</div>`:'<p class="fid-customer-tag-empty">该客户还没有标签。</p>'}
    </div>`,fidButton('关闭','close'));
  }

  const fidInRange=(date,start,end)=>{const day=fidDate(date).slice(0,10);return (!start||day>=start)&&(!end||day<=end)};
  const fidMatch=(s,q)=>String(s??'').toLowerCase().includes(q.trim().toLowerCase());
  const fidPhoneDigits = value => String(value ?? '').replace(/\D/g, '');
  const fidCustomerHasTags=c=>fid.customerTags.every(id=>c.tags.includes(id));
  filteredCustomers = function() {
    return myCustomers().filter(c=>{
      if(!fid.customerPlatform || fid.customerCountry!=='all'&&c.country!==fid.customerCountry || fid.customerType!=='all'&&c.clientType!==fid.customerType)return false;
      if(ui.customerStage!=='all'&&c.stage!==ui.customerStage||manager()&&ui.customerOwner!=='all'&&c.owner!==ui.customerOwner)return false;
      if(!fidInRange(c.createdAt,fid.customerStart,fid.customerEnd)||!fidCustomerHasTags(c)||ui.customerTag!=='all'&&!c.tags.includes(ui.customerTag))return false;
      const fields={name:c.name,phone:c.phone,account:account(c.account)?.name,note:c.notes,source:c.source};
      return fidMatch(fields[fid.customerField],ui.customerQuery);
    });
  };
  customerRows = function() {
    const rows=paged(filteredCustomers(),'customers'), tags=myTags();
    return rows.map((c,i)=>{
      const a=account(c.account), assigned=tags.filter(t=>c.tags.includes(t.id)), first=assigned[0];
      const tagPreview=first?`<span class="tag ${esc(first.color)}">${esc(first.name)}</span>`:'<span>0 个</span>';
      const tagDetail=assigned.length>1?`<small>+${assigned.length-1}</small>`:icon('ChevronRight');
      return `<tr>
        <td><input type="checkbox" data-select-customer="${esc(c.id)}" aria-label="选择${esc(c.name)}" ${ui.selected.has(c.id)?'checked':''}></td>
        <td>${rowNumber('customers',i)}</td>
        <td>${esc(a?.name||'—')}<span class="fid-cell-detail">${esc(member(c.owner)?.name||'未分配')}</span></td>
        <td><button class="fid-link fid-note-link" data-action="profileNote" ${fidActionID(c.id)} title="${esc(c.notes||'')}" aria-label="查看${esc(c.name)}备注"><span class="fid-cell-note">${esc(c.notes||'—')}</span></button></td>
        <td><button class="fid-link" data-action="profile" ${fidActionID(c.id)} aria-label="查看${esc(c.name)}资料">${esc(c.name)}</button><span class="fid-cell-detail">${esc(c.source)}</span></td>
        <td><button type="button" class="fid-link fid-tag-cell" data-action="fidViewCustomerTags" ${fidActionID(c.id)} aria-label="查看${esc(c.name)}的标签，共 ${assigned.length} 个">${tagPreview}${tagDetail}</button></td><td>${esc(c.phone)}</td>
        <td>${esc(c.clientType||'新增线索-实时')}<span class="fid-cell-detail">${esc(c.stage)}</span></td>
        <td>${esc(country(c))}</td><td>${esc(fidDate(c.createdAt))}</td><td>${esc(fidDate(c.updatedAt))}</td>
        <td><div class="fid-icon-actions">${fidIcon('打开'+c.name+'会话','openConversation','MessageCircle',c.id)}${fidIcon('客户画像：'+c.name,'profile','ContactRound',c.id)}${manager()?fidIcon('转交'+c.name,'transfer','ArrowRightLeft',c.id):''}</div></td>
      </tr>`;
    }).join('');
  };
  renderCustomers = function() {
    const list=filteredCustomers(),marked=fid.customerTags.map(tag).filter(Boolean),selected=ui.selected.size;
    const filters=`<form class="fid-customer-filter fid-rounded" id="fid-customer-search-form">
      <div class="fid-customer-platform"><span>平台:</span>${fidButton(fid.customerPlatform?'全选(1)':'全选(0)','fidCustomerPlatform','Check','fid-platform',`aria-pressed="${fid.customerPlatform}"`)}<span class="sr-only">WhatsApp</span></div>
      <div class="fid-filter-row fid-customer-fields">
        <input class="fid-input" id="fid-customer-start" aria-label="开始时间" placeholder="开始时间" value="${esc(fid.customerStart)}" data-fid-date><span> - </span>
        <input class="fid-input" id="fid-customer-end" aria-label="截止时间" placeholder="截止时间" value="${esc(fid.customerEnd)}" data-fid-date>
        <select class="fid-select" id="fid-customer-field" aria-label="客户查询字段">${fidOption([['name','联系人'],['phone','手机号'],['account','主账号'],['note','备注'],['source','来源']],fid.customerField)}</select>
        <input class="fid-input" id="customer-search" aria-label="搜索客户库" placeholder="请输入" value="${esc(ui.customerQuery)}">
        <select class="fid-select" id="fid-customer-country" aria-label="国家">${fidOption([['all','请选择国家'],['US','美国'],['PR','波多黎各'],['OTHER','其他地区']],fid.customerCountry)}</select>
        <select class="fid-select" id="fid-customer-type" aria-label="客户类型">${fidOption([['all','请选择客户类型'],'新增线索-实时','新增线索-补录','重复线索'],fid.customerType)}</select>
      </div>
      <div class="fid-actions fid-filter-submit"><button class="fid-btn gradient" type="submit">${icon('Search')}搜索</button>${fidButton('重置','fidCustomerReset','RotateCw')}</div>
      <div class="fid-actions fid-tag-filter"><span>标签查询</span><span class="fid-small-note" aria-live="polite">${marked.length?marked.map(t=>esc(t.name)).join('、'):'未选'}</span>${fidButton('选择标签','fidCustomerChooseTags','Tag')}${fidButton('重置标签','fidCustomerClearFilter','X')}</div>
    </form>`;
    const toolbar=`<div class="fid-actions fid-list-toolbar">${fidButton('批量打标签','batchTags','Tag','gradient',selected?'':'disabled')}${fidButton('清空标签','fidClearCustomerTags','Eraser','',selected?'':'disabled')}${fidButton('跟进记录','','ClipboardList','green','data-nav="followups"')}${fidButton('导出列表','fidExportCustomers','FileDown')}${fidButton('新增客户','addCustomer','Plus','slim')}${manager()&&selected?fidButton('转交客户','batchTransfer','ArrowRightLeft','slim'):''}<span class="fid-small-note">演示号码</span></div>`;
    const header=['<input type="checkbox" id="select-all-customers" aria-label="选择当前结果全部客户">','序号','主账号信息','备注','联系人信息','标签','手机号','客户类型','国家','添加时间','更新时间','操作 '+icon('Settings2')];
    const table=fidTable('fid-customer-table',header,customerRows(),'暂无数据',true).replace('<tbody>','<tbody id="customer-rows">');
    return `<section class="fid-page"><h1 class="sr-only">客户列表</h1>${filters}${toolbar}<div class="fid-batchbar" id="batchbar" hidden><span id="selected-count">${selected}</span></div><div class="fid-table-card">${table}${fidPager(list.length,'customers',[10,20,50])}</div></section>`;
  };
  updateCustomerRows = function() {if(ui.view==='customers') render();};
  function fidSyncCustomerSelection() {
    const checks=[...document.querySelectorAll('[data-select-customer]')],all=$('#select-all-customers'),n=ui.selected.size;
    if(all){all.checked=checks.length>0&&checks.every(e=>e.checked);all.indeterminate=checks.some(e=>e.checked)&&!all.checked;}
    for(const el of document.querySelectorAll('.fid-list-toolbar [data-action="batchTags"],.fid-list-toolbar [data-action="fidClearCustomerTags"]'))el.disabled=!n;
    const count=$('#selected-count');if(count)count.textContent=n;
  }
  function fidApplyCustomerSearch() {
    Object.assign(fid,{customerField:$('#fid-customer-field').value,customerCountry:$('#fid-customer-country').value,customerType:$('#fid-customer-type').value,customerStart:$('#fid-customer-start').value,customerEnd:$('#fid-customer-end').value});
    ui.customerQuery=$('#customer-search').value;ui.customerTag='all';ui.selected.clear();ui.pages.customers=0;render();
  }
  function fidAccountList() {
    const query = ui.accountQuery.trim();
    const byPhone = fid.accountField === 'number';
    const digits = byPhone ? fidPhoneDigits(query) : '';
    return myAccounts().filter(a => {
      const matchesQuery = !query || (byPhone
        ? Boolean(digits) && fidPhoneDigits(a.number).includes(digits)
        : fidMatch(a.name, query));
      return fid.accountPlatform && matchesQuery && (ui.accountStatus === 'all' || ui.accountStatus === a.state);
    });
  }
  renderAccounts = function() {
    const list=fidAccountList(),n=fid.accountChecked.size;
    const top=`<div class="fid-account-platform fid-rounded"><b>平台 ${icon('Info')}</b><div class="fid-actions">${fidButton('全选','fidAccountPlatform','Check','fid-platform '+(fid.accountPlatform?'active':''),`aria-pressed="${fid.accountPlatform}"`)}${fidButton('WhatsApp','fidAccountPlatform',fid.accountPlatform?'Check':'','fid-platform',`aria-pressed="${fid.accountPlatform}"`)}</div></div>`;
    const filters=`<form class="fid-account-filter fid-filter-row fid-rounded" id="fid-account-search-form">
      <span class="fid-joined">
        <select class="fid-select" id="fid-account-field" aria-label="账号查询字段">${fidOption([['name','账号名'],['number','手机号']],fid.accountField)}</select>
        <input class="fid-input" id="account-query" aria-label="搜索账号" placeholder="请输入" value="${esc(ui.accountQuery)}">
      </span>
      <select class="fid-select" id="fid-account-channel" aria-label="平台">${fidOption([['all','全部平台'],['wa','WhatsApp']],fid.accountChannel)}</select>
      <select class="fid-select" id="account-state" aria-label="在线状态">${fidOption([['all','全部在线状态'],['online','在线'],['reconnect','离线'],['pending','待连接']],ui.accountStatus)}</select>
      <button class="fid-btn gradient" type="submit">${icon('Search')}搜索</button>${fidButton('重置','fidAccountReset','RotateCw')}
    </form>`;
    const toolbar=`<div class="fid-actions fid-account-actions">${fidButton('移除账号','fidAccountDelete','Trash2','danger',n?'':'disabled')}${fidButton('批量注释','fidAccountNote','SquarePen','warn',n?'':'disabled')}${fidButton('统计清零','fidAccountZero','Eraser','danger',n?'':'disabled')}${fidButton('添加账号','addAccount','Plus','slim')}</div>`;
    const rows=paged(list,'accounts').map((a,i)=>`<tr>
      <td><input type="checkbox" data-fid-account-select="${esc(a.id)}" aria-label="选择${esc(a.name)}" ${fid.accountChecked.has(a.id)?'checked':''}></td>
      <td>${rowNumber('accounts',i)}</td><td>${esc(member(a.owner)?.name||'未分配')}</td>
      <td><button class="fid-link" data-action="accountInbox" ${fidActionID(a.id)}>${esc(a.name)}</button></td>
      <td>${esc(a.number)}</td><td>${stateText(a)}</td>
      <td>${esc(a.annotation||'—')}</td><td>${esc(a.note||'—')}</td>
      <td>${esc(fidDate(a.createdAt||fidDay(-8)))} / ${esc(a.lastSync||'—')}</td>
      <td>${esc(country(a))}</td><td>演示</td><td>—</td><td>—</td>
      <td><div class="fid-icon-actions">${fidIcon('编辑'+a.name,'editAccount','SquarePen',a.id)}${a.state!=='online'?fidIcon('重连'+a.name,'connect','RefreshCw',a.id):fidIcon('打开'+a.name+'会话','accountInbox','MessageCircle',a.id)}</div></td>
    </tr>`).join('');
    const columns=['<input type="checkbox" id="fid-account-all" aria-label="全选账号">','序号','主账号详情','用户名/ID','手机号','在线状态','注释','备注','首登时间/最近活跃','地区','版本号','主页地址','二维码','操作'];
    return `<section class="fid-page fid-accounts"><h1 class="sr-only">账号列表</h1>${top}${filters}${toolbar}<div class="fid-table-card">${fidTable('fid-account-table',columns,rows,'暂无数据',true)}${fidPager(list.length,'accounts')}</div></section>`;
  };
  const fidSelectedAccounts=()=>myAccounts().filter(a=>fid.accountChecked.has(a.id));

  function fidLogs() {
    const f=fid.logFilter;
    return myCustomers().flatMap(c=>(data.activities[c.id]||[]).map((entry,i)=>({c,entry,at:entry.createdAt||fidDay(-i-1),kind:entry.text.includes('标签')?'标签修改':entry.text.includes('跟进')?'跟进记录':'资料更新'})))
      .filter(({c,entry,at})=>fidInRange(at,f.start,f.end)&&fidMatch({invite:fidInvite(account(c.account)),customer:[c.name,c.phone].join(' '),text:entry.text,actor:entry.by}[f.field],f.query)).sort((a,b)=>b.at.localeCompare(a.at));
  }
  renderFollowups = function() {
    if(fid.followMode==='todo')return oldFollowupView().replace('<section class="section-page">','<section class="section-page"><div class="fid-actions fid-return-tasks">'+fidButton('返回跟进记录','fidLogHistory','ArrowLeft')+'</div>').replace('跟进管理</h1>','跟进待办</h1>');
    const f=fid.logFilter,rows=fidLogs(),body=paged(rows,'followups').map(({c,entry,at,kind})=>`<tr><td>${esc(fidInvite(account(c.account)))}</td><td>${esc(entry.by)}</td><td>${esc(kind)}</td><td>${esc(account(c.account)?.name||'—')}</td><td><button class="fid-link" data-action="profile" ${fidActionID(c.id)}>${esc(c.name)}</button></td><td>${esc(c.phone)}</td><td>${esc(fidDate(at))}</td><td>${esc(entry.text)}</td></tr>`).join('');
    return `<section class="fid-page"><div class="fid-panel fid-log">${fidHead('跟进记录','客户资料、标签与跟进操作会记录在这里。')}<form class="fid-filter-row fid-log-filter" id="fid-log-search-form"><div class="fid-range">${icon('Clock3')}<input id="fid-log-start" aria-label="开始时间" placeholder="开始时间" value="${esc(f.start)}" data-fid-date><span>~</span><input id="fid-log-end" aria-label="截止时间" placeholder="截止时间" value="${esc(f.end)}" data-fid-date></div><select class="fid-select" id="fid-log-app" aria-label="选择APP">${fidOption([['all','请选择APP'],['wa','WhatsApp']],f.app)}</select><div class="fid-joined"><select class="fid-select" id="fid-log-field" aria-label="跟进查询字段">${fidOption([['invite','邀请码'],['customer','线索账号'],['text','内容'],['actor','操作人']],f.field)}</select><input class="fid-input" id="fid-log-query" aria-label="搜索跟进记录" placeholder="请输入线索账号或内容" value="${esc(f.query)}"></div><button class="fid-btn blue" type="submit">${icon('Search')}搜索</button>${fidButton('重选','fidLogReset','RotateCw')}</form><div class="fid-log-line"><span class="fid-small-note">演示号码</span><button class="fid-link" data-action="fidTasks">跟进待办 (${pendingTasks().length})</button></div>${fidTable('fid-log-table',['邀请码','操作人','操作类型','主账号','线索账号信息','线索账号','创建日期','内容'],body)}${fidPager(rows.length,'followups')}</div></section>`;
  };

  toolsRailHTML = function(c) {
    const t=(label,action,glyph,needs=false)=>`<button class="icon-button" data-action="${action}" ${fidActionID(c?.id||'')} aria-label="${label}" ${needs&&!c?'disabled':''}>${icon(glyph)}</button>`;
    return `<aside class="tool-rail" aria-label="会话工具">${t('会话筛选','fidChatFilters','Bot')}${t('查看客户资料','profile','ContactRound',true)}${t('翻译设置','translation','Languages')}${t('安排客户跟进','followup','ListOrdered',true)}${t('客户标签','assignTags','Tags',true)}${t('查看客户备注','profileNote','StickyNote',true)}<span class="tool-separator"></span>${t('刷新演示视图','refreshUI','RefreshCw')}${t('权限说明','fidChatPermissions','ShieldCheck')}</aside>`;
  };
  const fidOldFillQuick=fillQuick;
  fillQuick = function(id) {
    fid.waTab='chat';fid.chatOpen=true;ui.mobileChat=true;if(ui.view==='inbox')render();fidOldFillQuick(id);
  };

  function fidOrgHead(title,desc,action,button,glyph) {
    return `<header class="fid-org-header"><div><h1>${icon(glyph)}${title}</h1><p>${desc}</p></div>${fidButton(button,action,'Plus','gradient')}</header>`;
  }
  renderTeam = function() {
    if(!manager())return '';
    fidSeed();const roles=data.roleGroups.filter(g=>fid.roleState==='all'||g.enabled===(fid.roleState==='enabled'));
    const rows=roles.map((g,i)=>`<tr><td>${i+1}</td><td>${esc(g.name)}</td><td><button class="fid-link" data-action="fidRoleDetails" ${fidActionID(g.id)}>查看 ${g.view.length} 页 · 操作 ${g.write.length} 页</button></td><td>${data.members.filter(m=>fidMemberRole(m)===g.id).length}</td><td><span class="tag ${g.enabled?'jade':'slate'}">${g.enabled?'正常':'禁用'}</span></td><td>${esc(fidDate(g.created))}</td><td><div class="fid-icon-actions">${fidIcon('编辑权限组'+g.name,'fidRoleEdit','SquarePen',g.id)}${!g.builtIn?fidIcon('删除权限组'+g.name,'fidRoleDelete','Trash2',g.id,'fid-danger'):''}</div></td></tr>`).join('');
    return `<section class="fid-page">${fidOrgHead('组织架构','权限组决定子账号能查看的页面和可用操作。先配置权限组，再到「账号管理」创建子账号。','fidRoleAdd','新增权限组','Network')}<div class="fid-filter-row fid-org-filter"><select class="fid-select" id="fid-role-state" aria-label="权限组状态">${fidOption([['all','全部状态'],['enabled','正常'],['disabled','禁用']],fid.roleState)}</select></div><div class="fid-table-card">${fidTable('fid-org-table fid-role-table',['序号','权限组名称','权限','子账号数','状态','创建时间','操作'],rows,'还没有权限组，点右上角创建',true,'ShieldCheck')}</div></section>`;
  };
  function renderMembers() {
    if(!manager())return '';
    fidSeed();const f=fid.memberFilter, list=data.members.filter(m=>fidMatch(m.login||m.id,f.id)&&fidMatch([m.name,m.team,m.note].join(' '),f.name)&&(f.role==='all'||fidMemberRole(m)===f.role)&&(f.status==='all'||(m.enabled!==false)===(f.status==='enabled')));
    const rows=paged(list,'members').map((m,i)=>`<tr><td>${rowNumber('members',i)}</td><td>${esc(m.login||m.id)}</td><td>${esc(m.name)}</td><td>${esc(fidRole(fidMemberRole(m))?.name||'—')}</td><td>${esc(data.accounts.filter(a=>a.owner===m.id).map(fidInvite).join('、')||'—')}</td><td>${esc(m.note||m.team)}</td><td><span class="tag ${m.enabled!==false?'jade':'slate'}">${m.enabled!==false?'正常':'禁用'}</span></td><td>—</td><td>${esc(fidDate(m.created||fidDay(-7)))}</td><td><div class="fid-icon-actions">${fidIcon('编辑子账号'+m.name,'fidMemberEdit','SquarePen',m.id)}${fidIcon('分配账号给'+m.name,'memberAccounts','UsersRound',m.id)}</div></td></tr>`).join('');
    return `<section class="fid-page">${fidOrgHead('账号管理','为员工建立子账号，并用权限组管理可查看和可操作的页面。','fidMemberAdd','新增子账号','UsersRound')}<p class="fid-org-help">子账号的权限、绑定邀请码和备注都可以在这里评审。当前为本地演示。</p><form class="fid-filter-row fid-org-filter" id="fid-member-search-form"><input id="fid-member-id" class="fid-input" placeholder="账号" aria-label="筛选账号" value="${esc(f.id)}"><input id="fid-member-name" class="fid-input" placeholder="昵称 / 备注" aria-label="筛选昵称或备注" value="${esc(f.name)}"><select class="fid-select" id="fid-member-role" aria-label="筛选权限组">${fidOption([['all','全部权限组'],...data.roleGroups.map(g=>[g.id,g.name])],f.role)}</select><select class="fid-select" id="fid-member-status" aria-label="筛选子账号状态">${fidOption([['all','全部状态'],['enabled','正常'],['disabled','禁用']],f.status)}</select><button type="submit" class="fid-btn gradient">${icon('Search')}搜索</button>${fidButton('重置','fidMemberReset')}</form><div class="fid-table-card">${fidTable('fid-org-table fid-member-table',['序号','账号','昵称','权限组','绑定邀请码','备注','状态','最近登录','创建时间','操作'],rows,'暂无子账号',true,'UsersRound')}${fidPager(list.length,'members',[10,20,50])}</div></section>`;
  }
  function fidPermissionTree(g,readOnly=false) {
    return `<div class="fid-permission-box">${fidPerms.map((page,i)=>`<div class="fid-permission-row"><label><input type="checkbox" name="view" value="${esc(page)}" data-fid-perm="${i}" ${g?.view.includes(page)?'checked':''} ${readOnly?'disabled':''}>${esc(page)}</label><label><input type="checkbox" name="write" value="${esc(page)}" data-fid-perm="${i}" ${g?.write.includes(page)?'checked':''} ${readOnly?'disabled':''}>操作</label></div>`).join('')}</div>`;
  }
  function fidRoleEdit(id='') {
    if(!manager())return;const g=fidRole(id);
    fidForm(g?'编辑权限组':'新增权限组','fid-role',`<input type="hidden" name="id" value="${esc(id)}">${fidFormRow('权限组名称',fidCountField('fid-role-name','name',g?.name||'',30,'请输入权限组名称',true),'fid-role-name',true)}${fidFormRow('状态',`<select name="enabled" id="fid-role-enabled" class="fid-select" ${g?.builtIn?'disabled':''}>${fidOption([['1','正常'],['0','禁用']],g?.enabled===false?'0':'1')}</select>`,'fid-role-enabled')}${fidFormRow('页面权限',fidPermissionTree(g)+'<small class="fid-field-help">勾选操作会同时勾选查看。此处用于评审权限方案。</small>')}`,'保存',{wide:true,saveLast:true});
  }
  function fidMemberEdit(id='') {
    if(!manager())return;const m=member(id),roles=data.roleGroups.filter(g=>g.enabled||g.id===fidMemberRole(m));
    fidForm(m?'编辑子账号':'新增子账号','fid-member',`<input type="hidden" name="id" value="${esc(id)}">${fidFormRow('账号',fidCountField('fid-member-login','login',m?.login||m?.id||'',30,'输入演示账号',true),'fid-member-login',true)}${fidFormRow('昵称',fidCountField('fid-member-nick','name',m?.name||'',30,'输入成员昵称',true),'fid-member-nick',true)}${fidFormRow('权限组',`<select class="fid-select" id="fid-member-group" name="roleGroup">${roles.map(g=>option(g.id,g.name,fidMemberRole(m))).join('')}</select>`,'fid-member-group',true)}${fidFormRow('所属团队',fidCountField('fid-member-team','team',m?.team||'北美一组',30,'输入团队名称',true),'fid-member-team',true)}${fidFormRow('备注',fidCountField('fid-member-note','note',m?.note||'',80,'选填'),'fid-member-note')}${fidFormRow('状态',`<select class="fid-select" id="fid-member-enabled" name="enabled" ${m?.id===ui.persona?'disabled':''}>${fidOption([['1','正常'],['0','禁用']],m?.enabled===false?'0':'1')}</select>`,'fid-member-enabled')}`,'保存',{wide:true,saveLast:true});
  }

  function fidResetExtras() {
    fid.tagChecked.clear();fid.accountChecked.clear();fid.customerTags=[];fid.chatOpen=false;fid.waTab='chat';fid.followMode='history';resetCustomerPages();resetOperationsView();fidSeed();
  }
  function fidRenderNavInDialog() {
    renderNav();const mobile=$('#dialog .mobile-menu');if($('#dialog').open&&mobile)mobile.innerHTML=menuHTML(true);paintIcons();
  }
  function fidSyncCheck(which) {
    const isTag=which==='tag',set=isTag?fid.tagChecked:fid.accountChecked,box=$('#fid-'+which+'-all'),checks=[...document.querySelectorAll('[data-fid-'+which+'-select]:not(:disabled)')];
    if(box){box.disabled=!checks.length;box.checked=checks.length>0&&checks.every(e=>e.checked);box.indeterminate=checks.some(e=>e.checked)&&!box.checked;}
    for(const b of document.querySelectorAll(isTag?'[data-action="fidTagBatchDelete"]':'[data-action="fidAccountDelete"],[data-action="fidAccountNote"],[data-action="fidAccountZero"]'))b.disabled=!set.size;
  }
  function fidExportCustomers() {
    const safe=v=>'"'+( /^[=+\-@\t\r]/.test(String(v??'')) ? "'" : '' )+String(v??'').replaceAll('"','""')+'"';
    const rows=[['主账号','联系人','手机号','客户类型','国家','标签'],...filteredCustomers().map(c=>[account(c.account)?.name,c.name,c.phone,c.clientType,country(c),c.tags.map(tag).filter(t=>t&&myTags().includes(t)).map(t=>t.name).join('、')])];
    const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(r=>r.map(safe).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='whatsapp-演示客户列表.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('已导出当前筛选的演示客户列表。');
  }
  const fidConversationFilters = {all:'全部',unread:'未读',reply:'待回复',star:'星标'};
  function fidResetCustomerFilters() {
    Object.assign(fid,{customerTags:[],customerCountry:'all',customerType:'all',customerField:'name',customerStart:'',customerEnd:'',customerPlatform:true});
    Object.assign(ui,{customerQuery:'',customerTag:'all',customerStage:'all',customerOwner:'all'});
    ui.pages.customers=0;
    ui.selected.clear();
  }
  const fidActions = {
    fidNavCustomers:()=>{ui.customerNavOpen=!ui.customerNavOpen;fidRenderNavInDialog();},
    fidNavOperations:()=>{fid.operationsOpen=!fid.operationsOpen;fidRenderNavInDialog();},
    fidNavOrg:()=>{fid.orgOpen=!fid.orgOpen;fidRenderNavInDialog();},
    fidGroupSelect:id=>{ui.tagGroup=id;fid.tagChecked.clear();ui.pages.tags=0;render();},
    queryTags:()=>{ui.tagQuery=$('#replica-tag-search').value;fid.tagChecked.clear();ui.pages.tags=0;render();},
    fidTagReset:()=>{ui.tagQuery='';fid.tagChecked.clear();ui.pages.tags=0;render();},
    fidTagAdd:()=>fidTagEdit(), fidTagEdit,
    fidTagDelete:id=>fidConfirm('删除标签','删除此标签并从客户资料中移除？','fidDoTagDelete',id),
    fidDoTagDelete:id=>fidRemoveTags([id]),
    fidTagBatchDelete:()=>fidConfirm('批量删除','删除选中的标签并从客户资料中移除？','fidDoTagBatchDelete'),
    fidDoTagBatchDelete:()=>fidRemoveTags([...fid.tagChecked]),
    fidGroupAdd:()=>fidGroupEdit(),fidGroupEdit,
    fidGroupDelete:id=>{if(!group(id)||!canEditGroup(group(id)))return;if(data.tags.some(t=>t.group===id))return toast('请先清空此分组的标签。');fidConfirm('删除分组','删除此空的演示分组？','fidDoGroupDelete',id);},
    fidDoGroupDelete:id=>{const g=group(id);if(!g||!canEditGroup(g)||data.tags.some(t=>t.group===id))return;data.tagGroups=data.tagGroups.filter(x=>x!==g);ui.tagGroup='all';persist();close();render();toast('分组已删除。');},
    fidTagCustomers:id=>{if(!myTags().some(t=>t.id===id))return;fid.customerTags=[id];ui.customerTag='all';ui.customerQuery='';ui.pages.customers=0;navigate('customers');},
    fidViewCustomerTags,
    fidCustomerChooseTags:fidOpenTagFilter,
    fidCustomerClearFilter:()=>{fid.customerTags=[];ui.customerTag='all';ui.selected.clear();ui.pages.customers=0;render();},
    fidCustomerPlatform:()=>{fid.customerPlatform=!fid.customerPlatform;ui.selected.clear();ui.pages.customers=0;render();},
    fidCustomerReset:()=>{fidResetCustomerFilters();render();},
    fidClearCustomerTags:()=>{if(ui.selected.size)fidConfirm('清空标签','清空所选客户的可见演示标签？','fidDoClearCustomerTags');},
    fidDoClearCustomerTags:()=>{const scope=new Set(myTags().map(t=>t.id)),before=[];for(const c of myCustomers()){if(!ui.selected.has(c.id))continue;before.push([c,c.tags]);c.tags=c.tags.filter(id=>!scope.has(id));addActivity(c.id,'清空可见标签');}persist();close();render();toast('已清空所选客户的可见标签。',()=>{for(const [c,t] of before)c.tags=t;persist();render()});},
    fidExportCustomers,
    fidAccountPlatform:()=>{fid.accountPlatform=!fid.accountPlatform;fid.accountChecked.clear();ui.pages.accounts=0;render();},
    fidAccountReset:()=>{fid.accountChecked.clear();Object.assign(fid,{accountField:'name',accountPlatform:true,accountChannel:'all'});ui.accountQuery='';ui.accountStatus='all';ui.pages.accounts=0;render();},
    fidAccountNote:()=>fidForm('批量注释','fid-account-note',fidFormRow('注释',fidCountField('fid-annotation','note','',80,'输入选中账号的注释',true),'fid-annotation',true)),
    fidAccountDelete:()=>{const selected=fidSelectedAccounts();if(!selected.length)return;if(selected.some(a=>data.customers.some(c=>c.account===a.id)))return toast('选中的账号仍有关联客户，演示中不能移除。');fidConfirm('移除账号','移除选中的无客户演示账号？','fidDoAccountDelete');},
    fidDoAccountDelete:()=>{const selected=fidSelectedAccounts().filter(a=>!data.customers.some(c=>c.account===a.id));data.accounts=data.accounts.filter(a=>!selected.includes(a));fid.accountChecked.clear();persist();close();render();toast('已移除选中的演示账号。');},
    fidAccountZero:()=>fidConfirm('统计清零','将已选账号的演示未读统计清零？','fidDoAccountZero'),
    fidDoAccountZero:()=>{const selected=new Set(fidSelectedAccounts().map(a=>a.id));myCustomers().filter(c=>selected.has(c.account)).forEach(c=>c.unread=0);persist();close();render();toast('演示未读统计已清零。');},
    fidLogReset:()=>{fid.logFilter={start:'',end:'',app:'all',field:'invite',query:''};ui.pages.followups=0;render();},
    fidTasks:()=>{fid.followMode='todo';ui.pages.followups=0;navigate('followups');},
    fidLogHistory:()=>{fid.followMode='history';ui.pages.followups=0;render();},
    fidWaTab:id=>{fid.waTab=id==='numbers'?'numbers':'chat';render();},
    fidChatFilters:()=>fidDialog('会话筛选','<div class="modal-body fid-conversation-filters">'+Object.entries(fidConversationFilters).map(([id,label])=>fidButton(label,'fidChatFilter','',ui.conversationFilter===id?'blue':'',`${fidActionID(id)} aria-pressed="${ui.conversationFilter===id}"`)).join('')+'</div>'),
    fidChatFilter:id=>{ui.conversationFilter=id;close();render();},
    fidClearChatFilter:()=>{ui.conversationFilter='all';render();$('#conversation-search')?.focus({preventScroll:true});},
    fidChatPermissions:()=>fidDialog('会话权限','<div class="modal-body">'+(manager()?'主管可评审团队演示账号及其会话。':'聊手只查看分配给自己的演示账号及客户。')+'</div>',fidButton('关闭','close')),
    fidRoleAdd:()=>fidRoleEdit(),fidRoleEdit,
    fidRoleDetails:id=>{if(!manager())return;const g=fidRole(id);if(g)fidDialog('权限详情 · '+g.name,'<div class="modal-body">'+fidPermissionTree(g,true)+'</div>',fidButton('关闭','close'));},
    fidRoleDelete:id=>{if(!manager())return;const g=fidRole(id);if(!g||g.builtIn)return;if(data.members.some(m=>fidMemberRole(m)===id))return toast('请先迁移此权限组下的演示子账号。');fidConfirm('删除权限组','删除此演示权限组？','fidDoRoleDelete',id);},
    fidDoRoleDelete:id=>{const g=fidRole(id);if(!manager()||!g||g.builtIn||data.members.some(m=>fidMemberRole(m)===id))return;data.roleGroups=data.roleGroups.filter(r=>r!==g);persist();close();render();toast('权限组已删除。');},
    fidMemberAdd:()=>fidMemberEdit(),fidMemberEdit,
    fidMemberReset:()=>{fid.memberFilter={id:'',name:'',role:'all',status:'all'};ui.pages.members=0;render();},
  };
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-action]'),nav=e.target.closest('[data-nav]'),action=btn?.dataset.action;
    if(nav?.dataset.nav==='followups')fid.followMode='history';
    if(action==='openConversation'){fid.waTab='chat';fid.chatOpen=true;}
    if(action==='accountInbox'){fid.waTab='chat';fid.chatOpen=false;}
    if(action==='backList')fid.chatOpen=false;
    if(!Object.hasOwn(fidActions,action))return;
    e.preventDefault();e.stopImmediatePropagation();fidActions[action](btn.dataset.id,btn);
  },true);
  document.addEventListener('focusin',e=>{if(e.target.matches('[data-fid-date]'))e.target.type='date';});
  document.addEventListener('focusout',e=>{if(e.target.matches('[data-fid-date]')&&!e.target.value)e.target.type='text';});
  document.addEventListener('input',e=>{
    const t=e.target;
    if(t.hasAttribute('data-fid-count'))t.parentElement.querySelector('.fid-count').textContent=t.value.length+' / '+t.maxLength;
    if(t.id==='fid-choice-search'){
      const sections=[...t.form.querySelectorAll('.fid-tag-picker section')],q=t.value.trim().toLowerCase();
      for (const section of sections) {
        const choices=[...section.querySelectorAll('[data-fid-tag-label]')];
        for (const choice of choices) choice.hidden=!choice.dataset.fidTagLabel.includes(q);
        section.hidden=choices.every(choice=>choice.hidden);
      }
      t.form.querySelector('.fid-tag-no-match').hidden=sections.some(section=>!section.hidden);
    }
  });
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='replica-tag-search'){e.preventDefault();fidActions.queryTags();}});
  document.addEventListener('change',e=>{
    const t=e.target;
    if(t.id==='account-filter'){fid.chatOpen=false;ui.mobileChat=false;}
    if(t.id==='fid-role-state'){fid.roleState=t.value;render();return;}
    if(t.dataset.fidPerm!==undefined){const matching=[...t.form.querySelectorAll('[data-fid-perm]')].find(x=>x!==t&&x.dataset.fidPerm===t.dataset.fidPerm);if(matching){if(t.name==='write'&&t.checked)matching.checked=true;if(t.name==='view'&&!t.checked)matching.checked=false;}}
    for(const key of ['tag','account']){
      const id=t.getAttribute('data-fid-'+key+'-select'),all=t.id==='fid-'+key+'-all',set=key==='tag'?fid.tagChecked:fid.accountChecked;
      if(all||id){for(const box of all?document.querySelectorAll('[data-fid-'+key+'-select]:not(:disabled)'):[t]){box.checked=t.checked;const v=box.getAttribute('data-fid-'+key+'-select');if(t.checked)set.add(v);else set.delete(v);}fidSyncCheck(key);return;}
    }
    if(t.id==='select-all-customers'||t.dataset.selectCustomer){
      e.stopImmediatePropagation();for(const box of t.id==='select-all-customers'?document.querySelectorAll('[data-select-customer]'):[t]){box.checked=t.checked;if(t.checked)ui.selected.add(box.dataset.selectCustomer);else ui.selected.delete(box.dataset.selectCustomer);}
      if(manager()&&t.id==='select-all-customers')render();else fidSyncCustomerSelection();
    }
  },true);

  const fidForms={
    'fid-tag-form':(f,v)=>{
      const id=v('id'),t=tag(id),g=group(v('group')),name=v('name');
      if(!g||!canEditGroup(g)||(id&&t?.group!==g.id))return error('没有维护此分组的权限。');
      if(!name)return error('请输入标签内容。');
      const groupTags=data.tags.filter(x=>x.group===g.id);
      if(groupTags.some(x=>x!==t&&x.name.trim().toLowerCase()===name.toLowerCase()))return error('同一分组已存在此标签。');
      if(t)t.name=name;
      else{
        const colors=['blue','jade','gold','purple','peach'];
        data.tags.push({id:nextId('tag'),name,group:g.id,color:colors[groupTags.length%colors.length]});
      }
      ui.tagGroup=g.id;ui.tagQuery='';fid.tagChecked.clear();persist();close();render();toast('标签已保存。');
    },
    'fid-group-form':(f,v)=>{
      const g=group(v('id')),name=v('name');if(!name)return error('请输入分组名称。');if(g&&!canEditGroup(g))return error('没有维护此分组的权限。');
      if(fidGroupList().some(x=>x!==g&&x.name===name))return error('已存在同名分组。');
      if(g){g.name=name;ui.tagGroup=g.id;}else{const scope=manager()&&v('scope')==='team'?'team':'private';const id=nextId('g');data.tagGroups.push({id,name,scope,owner:scope==='team'?null:ui.persona});ui.tagGroup=id;}
      ui.tagQuery='';fid.tagChecked.clear();persist();close();render();toast('分组已保存。');
    },
    'fid-tag-filter-form':f=>{fid.customerTags=f.getAll('tags').map(String).filter(id=>myTags().some(t=>t.id===id));ui.customerTag='all';ui.selected.clear();ui.pages.customers=0;close();render();},
    'fid-tag-assign-form':(f,v)=>{
      const ids=v('ids').split(','),allowed=new Set(myTags().map(t=>t.id)),chosen=f.getAll('tags').map(String).filter(t=>allowed.has(t));
      for (const id of ids) {
        const c=customer(id);
        if (!c||!myCustomers().includes(c)) continue;
        const retained=ids.length===1?c.tags.filter(t=>!allowed.has(t)):c.tags;
        c.tags=[...new Set([...retained,...chosen])];
        addActivity(c.id,'更新客户标签');
      }
      persist();close();render();toast('客户标签已更新。');
    },
    'fid-customer-search-form':fidApplyCustomerSearch,
    'fid-account-search-form':()=>{Object.assign(fid,{accountField:$('#fid-account-field').value,accountChannel:$('#fid-account-channel').value});ui.accountQuery=$('#account-query').value;ui.accountStatus=$('#account-state').value;fid.accountChecked.clear();ui.pages.accounts=0;render();},
    'fid-account-note-form':(f,v)=>{if(!v('note'))return error('请输入注释。');fidSelectedAccounts().forEach(a=>a.annotation=v('note'));persist();close();render();toast('所选演示账号已更新注释。');},
    'fid-log-search-form':()=>{fid.logFilter={start:$('#fid-log-start').value,end:$('#fid-log-end').value,app:$('#fid-log-app').value,field:$('#fid-log-field').value,query:$('#fid-log-query').value};ui.pages.followups=0;render();},
    'fid-role-form':(f,v)=>{
      if(!manager())return;if(!v('name'))return error('请输入权限组名称。');const g=fidRole(v('id')),view=f.getAll('view').filter(x=>fidPerms.includes(x)),write=f.getAll('write').filter(x=>view.includes(x));
      if(data.roleGroups.some(r=>r!==g&&r.name===v('name')))return error('已存在同名权限组。');
      const values={name:v('name'),enabled:g?.builtIn?g.enabled:v('enabled')==='1',view,write};if(g)Object.assign(g,values);else data.roleGroups.push({id:nextId('role'),...values,created:fidDay()});persist();close();render();toast('演示权限组已保存。');
    },
    'fid-member-form':(f,v)=>{
      if(!manager())return;const m=member(v('id')),g=fidRole(v('roleGroup'));
      if(!v('login')||!v('name')||!v('team')||!g)return error('请填写账号、昵称、权限组和团队。');
      if(data.members.some(x=>x!==m&&(x.login||x.id).toLowerCase()===v('login').toLowerCase()))return error('演示账号已存在。');
      if(m?.id===ui.persona&&g.id!=='lead')return error('请保留当前主管的主管权限。');
      const values={login:v('login'),name:v('name'),team:v('team'),note:v('note'),roleGroup:g.id,role:g.id==='lead'?'manager':'agent',enabled:m?.id===ui.persona?true:v('enabled')==='1'};
      if(m)Object.assign(m,values);else data.members.push({id:nextId('u'),...values,initial:initial(values.name),color:'blue',created:fidDay()});persist();close();render();toast('演示子账号已保存。');
    },
    'fid-member-search-form':()=>{fid.memberFilter={id:$('#fid-member-id').value,name:$('#fid-member-name').value,role:$('#fid-member-role').value,status:$('#fid-member-status').value};ui.pages.members=0;render();},
  };
  document.addEventListener('submit',e=>{
    const id=e.target.getAttribute('id'),handler=fidForms[id];if(!Object.hasOwn(fidForms,id)||typeof handler!=='function')return;
    e.preventDefault();e.stopImmediatePropagation();const form=e.target,values=new FormData(form);
    form.querySelectorAll('.field-error').forEach(x=>x.remove());form.querySelectorAll('[aria-invalid]').forEach(x=>{x.removeAttribute('aria-invalid');x.removeAttribute('aria-describedby');});
    const report=form.querySelector('#form-error');if(report)report.textContent='';handler(values,k=>String(values.get(k)||'').trim());
  },true);

  const fidOldRender=render;
  render=function(){
    fidOldRender();
    if(ui.view==='tags')fidSyncCheck('tag');
    if(ui.view==='accounts')fidSyncCheck('account');
    if(ui.view==='customers')fidSyncCustomerSelection();
  };

  // Customer history and tag usage share the same demo records as the other pages.
  const recordView = { translate: true };
  let statsTagId = '';

  function resetRecordFilters() {
    Object.assign(recordView, {
      invite: '', inviteQuery: '', inviteNote: '', platform: '',
      accountId: '', customerId: '', accountQuery: '', contactQuery: '',
      messageQuery: '', limit: 200, step: 'accounts',
    });
  }

  function resetCustomerPages() {
    resetRecordFilters();
    statsTagId = '';
  }
  resetCustomerPages();

  const recordsAccounts = () => myAccounts().filter(a =>
    (!recordView.invite || fidInvite(a) === recordView.invite) &&
    fidMatch(fidInvite(a), recordView.inviteQuery) &&
    fidMatch([a.note, a.annotation].filter(Boolean).join(' '), recordView.inviteNote) &&
    (!recordView.platform || recordView.platform === 'wa')
  );

  function recordListItem(label, detail, search, action, id, selected) {
    return `<button type="button" class="fid-record-item" data-record-search="${esc(search)}" data-action="${action}" ${fidActionID(id)} aria-label="${esc(label)}" aria-pressed="${selected}">
      <strong>${esc(label)}</strong><small>${esc(detail)}</small>
    </button>`;
  }

  function recordList(title, type, placeholder, query, rows, emptyLabel) {
    const searchId = `fid-record-${type}-search`;
    return `<section class="fid-record-column fid-record-${type}" aria-label="${title}">
      <div class="fid-record-heading"><h2>${title}</h2>${fidIcon('刷新'+title,'fidRecordsRefresh','RefreshCw')}</div>
      ${type==='contact'?fidButton('返回社交账号','fidRecordBack','ArrowLeft','fid-record-back',fidActionID('accounts')):''}
      <div class="fid-record-search"><input type="search" id="${searchId}" class="fid-input" value="${esc(query)}" placeholder="${placeholder}" aria-label="${title}搜索"></div>
      <div class="fid-record-list" data-record-list="${type}">${rows}<p class="fid-record-empty" data-record-empty>${esc(emptyLabel)}</p></div>
    </section>`;
  }

  function filterRecordList(type, query) {
    const list = document.querySelector(`[data-record-list="${type}"]`);
    if (!list) return;
    let matches = 0;
    for (const row of list.querySelectorAll('[data-record-search]')) {
      row.hidden = !fidMatch(row.dataset.recordSearch, query);
      if (!row.hidden) matches++;
    }
    list.querySelector('[data-record-empty]').hidden = matches > 0;
  }

  function recordMessages(customer) {
    if (!customer) return empty(recordView.accountId ? '选择联系人查看聊天记录' : '选择账号查看聊天记录', '');
    const list = conversationMessages(customer).filter(message =>
      fidMatch([message.text, message.translated, message.attachment].filter(Boolean).join(' '), recordView.messageQuery)
    );
    if (!list.length && recordView.messageQuery) return empty('没有匹配的消息', '试试其他关键词。');
    const older = list.length > recordView.limit ? fidButton('加载更早消息','fidRecordsOlder','', 'fid-record-older') : '';
    return older + messagesHTML(customer, { list: list.slice(-recordView.limit), showTranslation: recordView.translate, emptyHint: '这个联系人还没有聊天记录。' });
  }

  function renderChatRecords() {
    const accounts = recordsAccounts();
    const selectedAccount = accounts.find(item => item.id === recordView.accountId);
    const contacts = selectedAccount ? myCustomers().filter(item => item.account === selectedAccount.id) : [];
    const selectedContact = contacts.find(item => item.id === recordView.customerId);
    if (!selectedAccount) Object.assign(recordView, {accountId:'', customerId:'', step:'accounts'});
    else if (!selectedContact) Object.assign(recordView, {customerId:'', step:'contacts'});
    const inviteOptions = [...new Set(myAccounts().map(fidInvite))];
    const accountRows = accounts.map(item => recordListItem(item.name, `${fidInvite(item)} · ${item.number}`,
      [item.name,item.number,fidInvite(item)].join(' '), 'fidRecordAccount', item.id, item === selectedAccount)).join('');
    const contactRows = contacts.map(item => recordListItem(item.name, item.phone,
      [item.name,item.phone,item.notes].join(' '), 'fidRecordContact', item.id, item === selectedContact)).join('');

    return `<section class="fid-page fid-history-page">
      ${fidHead('聊天记录','按社交账号和联系人查看 WhatsApp 演示消息。')}
      <form id="fid-record-filter-form" class="fid-filter-row fid-record-filters">
        <select class="fid-select" name="invite" aria-label="选择邀请码">${fidOption([['','全部邀请码'],...inviteOptions], recordView.invite)}</select>
        <input class="fid-input" name="inviteQuery" aria-label="邀请码搜索" placeholder="请输入邀请码" value="${esc(recordView.inviteQuery)}">
        <input class="fid-input" name="inviteNote" aria-label="邀请码备注搜索" placeholder="请输入邀请码备注" value="${esc(recordView.inviteNote)}">
        <select class="fid-select" name="platform" aria-label="选择平台">${fidOption([['','请选择平台'],['wa','WhatsApp']], recordView.platform)}</select>
        <button type="submit" class="fid-btn gradient">${icon('Search')}搜索</button>${fidButton('重置','fidRecordsReset','RotateCw')}
      </form>
      <div class="fid-history-grid" data-record-step="${recordView.step}">
        ${recordList('社交账号','account','账号/昵称搜索',recordView.accountQuery,accountRows,'暂无匹配账号')}
        ${recordList('对话','contact','账号/昵称/备注搜索',recordView.contactQuery,contactRows,selectedAccount?'暂无匹配对话':'请先选择账号')}
        <section class="fid-record-column fid-record-thread" aria-label="历史消息">
          <div class="fid-record-heading"><h2>${esc(selectedContact?.name || (selectedAccount ? '未选择对话' : '未选择账号'))}</h2>${fidIcon('刷新消息','fidRecordsRefresh','RefreshCw')}</div>
          ${fidButton('返回对话','fidRecordBack','ArrowLeft','fid-record-back',fidActionID('contacts'))}
          <div class="fid-record-search"><input type="search" id="fid-record-message-search" class="fid-input" aria-label="搜索历史消息" placeholder="搜索消息" value="${esc(recordView.messageQuery)}" ${selectedContact?'':'disabled'}></div>
          <div class="messages fid-record-messages" id="fid-record-messages" tabindex="0">${recordMessages(selectedContact)}</div>
        </section>
        <aside class="fid-record-translate" aria-label="翻译设置">
          <h2>翻译设置</h2>
          <label class="fid-record-toggle" for="fid-record-translation">聊天翻译 <input type="checkbox" id="fid-record-translation" role="switch" ${recordView.translate?'checked':''}></label>
          <label for="fid-record-language">目标语言</label>
          <select id="fid-record-language" class="fid-select"><option>中文（简体）</option></select>
        </aside>
      </div>
    </section>`;
  }

  function selectRecordAccount(id) {
    if (!recordsAccounts().some(item => item.id === id)) return;
    Object.assign(recordView, { accountId:id, customerId:'', contactQuery:'', messageQuery:'', limit:200, step:'contacts' });
    render();
  }

  function selectRecordContact(id) {
    if (!myCustomers().some(item => item.id === id && item.account === recordView.accountId)) return;
    Object.assign(recordView, { customerId:id, messageQuery:'', limit:200, step:'messages' });
    render();
  }

  function applyRecordFilters(values, value) {
    const invite = value('invite');
    const inviteQuery = value('inviteQuery');
    const inviteNote = value('inviteNote');
    const platform = value('platform');
    Object.assign(recordView, { invite, inviteQuery, inviteNote, platform });
    render();
  }

  function refreshRecordMessages() {
    const container = $('#fid-record-messages');
    if (!container) return;
    const selected = myCustomers().find(item => item.id === recordView.customerId && item.account === recordView.accountId);
    container.innerHTML = recordMessages(selected);
    paintIcons(container);
  }

  function tagStatCard(glyph, used, total, caption, tone) {
    return `<div class="fid-stat-card"><span class="fid-stat-symbol ${tone}">${icon(glyph)}</span>
      <div><strong>${used}/${total}</strong><span>${esc(caption)}</span></div></div>`;
  }

  function tagStatsDetail(item, customers) {
    if (!item) return '<p class="fid-stats-empty">还没有标签，请先到 <a class="fid-link" href="#tags" data-nav="tags">标签管理</a> 添加。</p>';
    const count = fidTagCount(item.id,customers);
    return `<div class="fid-stats-detail">
      <div class="fid-heading"><h2>${esc(item.name)}</h2><span class="fid-field-help">${esc(group(item.group)?.name)}</span></div>
      ${tagStatCard('UsersRound',count,customers.length,'打了此标签的客户数/客户总数','jade')}
      <p class="fid-stats-drill">${fidButton('查看客户','fidTagCustomers','UsersRound','tint',fidActionID(item.id))}</p>
    </div>`;
  }

  function renderTagStats() {
    const groups = fidGroupList();
    const tags = myTags();
    const customers = myCustomers();
    const usedIds = new Set(customers.flatMap(item => item.tags));
    const usedTags = tags.filter(t=>usedIds.has(t.id)).length;
    const visibleIds = new Set(tags.map(t=>t.id));
    const taggedCustomers = customers.filter(item => item.tags.some(id => visibleIds.has(id))).length;
    const current = tags.find(item => item.id === statsTagId) || tags[0];
    statsTagId = current?.id || '';
    const tree = groups.map(group => {
      const groupTags = tags.filter(item => item.group === group.id);
      if (!groupTags.length) return '';
      const buttons = groupTags.map(item => `<button type="button" class="fid-stats-tag" data-action="fidStatsTag" ${fidActionID(item.id)} aria-pressed="${item===current}">${esc(item.name)}</button>`).join('');
      return `<details open><summary>${esc(group.name)}</summary>${buttons}</details>`;
    }).join('');
    return `<section class="fid-page"><div class="fid-panel fid-stats-panel">
      ${fidHead('标签统计')}
      <div class="fid-stats-cards">${tagStatCard('Tag',usedTags,tags.length,'已使用标签数/标签总数','blue')}${tagStatCard('UsersRound',taggedCustomers,customers.length,'已打标签客户数/客户总数','jade')}</div>
      <div class="fid-stats-grid"><aside class="fid-stats-tree" aria-label="标签分组"><h2>全部标签</h2>${tree}</aside>${tagStatsDetail(current,customers)}</div>
    </div></section>`;
  }

  Object.assign(fidActions, {
    fidRecordAccount: selectRecordAccount,
    fidRecordContact: selectRecordContact,
    fidRecordBack: id => {
      if (id === 'accounts') Object.assign(recordView, { accountId:'', customerId:'' });
      if (id === 'contacts') recordView.customerId = '';
      recordView.step = id;
      render();
    },
    fidRecordsOlder: () => { recordView.limit += 200; refreshRecordMessages(); },
    fidRecordsReset: () => { resetRecordFilters(); render(); },
    fidRecordsRefresh: () => { render(); toast('聊天记录已刷新。'); },
    fidStatsTag: id => { statsTagId = id; render(); },
  });
  fidForms['fid-record-filter-form'] = applyRecordFilters;

  document.addEventListener('input', event => {
    const input = event.target;
    if (input.id === 'fid-record-account-search') {
      recordView.accountQuery = input.value;
      filterRecordList('account', input.value);
    } else if (input.id === 'fid-record-contact-search') {
      recordView.contactQuery = input.value;
      filterRecordList('contact', input.value);
    } else if (input.id === 'fid-record-message-search') {
      recordView.messageQuery = input.value;
      refreshRecordMessages();
    }
  });
  document.addEventListener('change', event => {
    if (event.target.id !== 'fid-record-translation') return;
    recordView.translate = event.target.checked;
    refreshRecordMessages();
  });

  const renderCustomerPages = render;
  render = function() {
    renderCustomerPages();
    if (ui.view !== 'chat-records') return;
    filterRecordList('account', recordView.accountQuery);
    filterRecordList('contact', recordView.contactQuery);
  };

  const assetTypes = { text:'文本', image:'图片', contact:'名片', rich:'图文', audio:'音频', video:'视频' };
  function operationsData() {
    return data.operations ??= {
      assetGroups: [{id:'ops-text',type:'text',name:'常用文本',note:''}],
      assets: [{id:'ops-material-1',type:'text',groupId:'ops-text',title:'资料发送说明',body:'你好，我会整理相关资料后发给你。',file:'',contact:'',nickname:''}],
    };
  }

  const operationsView = {};
  function resetOperationsView() {
    Object.assign(operationsView, {
      assetType:'text', assetGroup:'', assetQuery:'', assetSelection:new Set(),
    });
    operationsData();
  }
  resetOperationsView();
  ui.pageSizes.materials ||= 20;

  const opsInput = (name, value='', placeholder='', attrs='') =>
    `<input class="fid-input" name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${attrs}>`;
  const opsSelect = (name, values, value, attrs='') =>
    `<select class="fid-select" name="${name}" ${attrs}>${fidOption(values,value)}</select>`;
  const opsArea = (name, value='', placeholder='请输入内容') =>
    `<textarea name="${name}" rows="4" maxlength="4000" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
  const opsField = (label, control) => `<label class="field"><span>${esc(label)}</span>${control}</label>`;
  const opsHidden = (name, value) => `<input type="hidden" name="${name}" value="${esc(value)}">`;
  const opsSubmit = label => `<button type="submit" class="fid-btn blue">${esc(label)}</button>`;
  const opsReadOnly = () => manager() ? '' : '<span class="fid-ops-hint">子站可查看和导出素材。</span>';
  const opsAssetGroups = () => operationsData().assetGroups.filter(item => item.type===operationsView.assetType);

  function saveOperation(message) {
    persist();
    if ($('#dialog').open) close();
    render();
    toast(message);
  }

  function openMaterialGroup(id='') {
    if (!manager()) return;
    const group = opsAssetGroups().find(item => item.id===id);
    fidForm(group?'编辑分组':'新建分组','fid-ops-group',opsHidden('id',id)+
      opsField('分组名称',opsInput('name',group?.name,'请输入分组名称','maxlength="20" required'))+
      opsField('备注',opsInput('note',group?.note,'选填','maxlength="100"')));
  }

  function saveMaterialGroup(values, value) {
    if (!manager()) return;
    const id=value('id'), name=value('name'), type=operationsView.assetType;
    const groups=opsAssetGroups();
    const existing=groups.find(item=>item.id===id);
    if(!name)return error('请输入分组名称。');
    if(groups.some(item=>item.id!==id&&item.name===name))return error('已有同名分组。');
    const group={id:existing?.id||nextId('ops-group'),type,name,note:value('note')};
    if(existing)Object.assign(existing,group);else operationsData().assetGroups.push(group);
    operationsView.assetGroup=group.id;
    saveOperation('分组已保存。');
  }

  function matchingAssets() {
    const { assetType, assetGroup, assetQuery } = operationsView;
    return operationsData().assets.filter(item=>item.type===assetType&&(!assetGroup||item.groupId===assetGroup)&&
      fidMatch([item.title,item.body,item.file,item.contact,item.nickname].join(' '),assetQuery));
  }

  function renderMaterials() {
    const state=operationsData(), groups=opsAssetGroups(), list=matchingAssets();
    const page=paged(list,'materials'), canEdit=manager(), selected=operationsView.assetSelection;
    const selectedOnPage=page.filter(item=>selected.has(item.id));
    const type=assetTypes[operationsView.assetType];
    const groupButtons=[{id:'',name:'全部'},...groups].map(item=>{
      const count=state.assets.filter(asset=>asset.type===operationsView.assetType&&(!item.id||item.id===asset.groupId)).length;
      const edit=item.id&&canEdit?fidIcon('编辑分组'+item.name,'opsMaterialGroupEdit','Pencil',item.id)+fidIcon('删除分组'+item.name,'opsMaterialGroupDelete','Trash2',item.id):'';
      return `<div class="fid-ops-group-row"><button type="button" data-action="opsMaterialGroup" ${fidActionID(item.id)} aria-pressed="${operationsView.assetGroup===item.id}"><span>${esc(item.name)}</span><small>${count}</small></button>${edit}</div>`;
    }).join('');
    const typeButtons=Object.entries(assetTypes).map(([id,name])=>{
      const count=state.assets.filter(item=>item.type===id).length;
      return `<button type="button" data-action="opsMaterialType" ${fidActionID(id)} aria-label="${name}" aria-pressed="${id===operationsView.assetType}">${name}<small>${count}</small></button>`;
    }).join('');
    const rows=page.map(item=>{
      const group=groups.find(g=>g.id===item.groupId);
      const check=`<input type="checkbox" data-ops-asset-check="${esc(item.id)}" aria-label="选择${esc(item.title)}" ${selected.has(item.id)?'checked':''} ${canEdit?'':'disabled'}>`;
      const actions=fidButton('预览','opsAssetPreview','','slim',fidActionID(item.id))+(canEdit?fidButton('编辑','opsAssetEdit','','slim',fidActionID(item.id)):'');
      return `<tr><td>${check}</td><td>${esc(item.title)}</td><td>${esc(group?.name||'—')}</td><td><span class="fid-ops-excerpt">${esc(item.body||item.file||item.contact)}</span></td><td>${actions}</td></tr>`;
    }).join('');
    return `<section class="fid-page fid-ops-materials"><h1 class="sr-only">素材管理</h1>
      <form id="fid-ops-material-search-form" class="fid-filter-row">${opsInput('query',operationsView.assetQuery,'请输入素材名称或内容','aria-label="搜索素材"')}${opsSubmit('搜索')}${fidButton('重置','opsMaterialReset')}</form>
      <div class="fid-ops-type-tabs" aria-label="素材类型">${typeButtons}</div>
      <div class="fid-ops-groups"><div class="fid-ops-section-head"><strong>全部分组</strong>${fidButton('新建分组','opsMaterialGroupAdd','Plus','slim',canEdit?'':'disabled')}</div>${groupButtons}${groups.length?'':'<p class="fid-ops-hint">新建分组后可以添加'+type+'素材。</p>'}</div>
      <div class="fid-actions fid-ops-toolbar"><label class="fid-ops-check"><input type="checkbox" id="fid-ops-asset-all" ${page.length&&selectedOnPage.length===page.length?'checked':''} ${page.length&&canEdit?'':'disabled'}>全选本页</label>
        <div class="fid-actions">${fidButton('新增'+type,'opsAssetAdd','Plus','gradient',canEdit&&groups.length?'':'disabled')}${fidButton('导入素材','opsMaterialImport','','',canEdit&&groups.length&&operationsView.assetType==='text'?'':'disabled')}${fidButton('导出素材','opsMaterialExport','','',list.length?'':'disabled')}${fidButton('移动分组','opsAssetMove','','',selectedOnPage.length&&groups.length>1?'':'disabled')}${fidButton('批量删除','opsAssetDelete','','',selectedOnPage.length?'':'disabled')}</div>
      </div>${opsReadOnly()}
      ${rows?fidTable('fid-ops-table',['','素材名称','分组','内容','操作'],rows):'<div class="fid-ops-empty">'+(groups.length?'暂无匹配素材':'先新建分组，再添加'+type+'素材')+'</div>'}
      ${fidPager(list.length,'materials')}
    </section>`;
  }

  function openAsset(id='') {
    if(!manager())return;
    const item=operationsData().assets.find(asset=>asset.id===id), groups=opsAssetGroups();
    if(!groups.length)return;
    const type=operationsView.assetType;
    const currentGroup=item?.groupId||operationsView.assetGroup||groups[0].id;
    const body=type==='text'||type==='rich'?opsField('素材内容',opsArea('body',item?.body)):'';
    const contact=type==='contact'?opsField('昵称',opsInput('nickname',item?.nickname,'选填','maxlength="30"'))+
      opsField('联系方式',opsInput('contact',item?.contact,'含国家区号的 WhatsApp 号码','type="tel" maxlength="24" required')):'';
    const media=type==='text'||type==='contact'?'':opsField('本地文件',`<input type="file" name="file" accept="${type==='rich'?'image':type}/*"><small class="fid-ops-hint">${item?.file?esc(item.file)+' · ':''}演示保留文件名。</small>`);
    fidForm(item?'编辑素材':'新增'+assetTypes[type],'fid-ops-asset',opsHidden('id',id)+
      opsField('分组',opsSelect('groupId',groups.map(group=>[group.id,group.name]),currentGroup))+
      opsField('素材名称',opsInput('title',item?.title,'请输入素材名称','maxlength="50" required'))+body+contact+media);
  }

  function saveAsset(values,value) {
    if(!manager())return;
    const state=operationsData(), id=value('id'), type=operationsView.assetType;
    const existing=state.assets.find(item=>item.id===id), title=value('title'), groupId=value('groupId');
    if(!title||!opsAssetGroups().some(group=>group.id===groupId))return error('请填写名称并选择分组。');
    const file=values.get('file');
    const fileName=file?.name||existing?.file||'';
    const body=value('body'), contact=value('contact'), nickname=value('nickname');
    if((type==='text'||type==='rich')&&!body)return error('请填写素材内容。');
    if(type==='contact'&&contact.replace(/\D/g,'').length<6)return error('请填写完整的联系方式。');
    if(type!=='text'&&type!=='contact'&&!fileName)return error('请选择一个文件。');
    if(file?.size>(type==='image'||type==='rich'?10:16)*1024*1024)return error('所选文件超过该类型的大小限制。');
    const asset={id:id||nextId('ops-asset'),type,groupId,title,body,contact,nickname,file:fileName};
    if(existing)Object.assign(existing,asset);else state.assets.push(asset);
    operationsView.assetSelection.clear();
    saveOperation('素材已保存。');
  }

  function previewAsset(id) {
    const item=operationsData().assets.find(asset=>asset.id===id);
    if(!item)return;
    fidDialog(item.title,`<div class="modal-body fid-ops-preview"><p>${esc(assetTypes[item.type])}</p><pre>${esc([item.body,item.nickname,item.contact,item.file].filter(Boolean).join('\n'))}</pre></div>`,fidButton('关闭','close'));
  }

  function deleteMaterialGroup(id) {
    if(!manager())return;
    if(operationsData().assets.some(item=>item.groupId===id))return toast('请先移动或删除该分组里的素材。');
    fidConfirm('删除素材分组','确定删除这个空分组？','opsMaterialGroupDeleteConfirmed',id);
  }

  function moveAssets() {
    const groups=opsAssetGroups();
    if(!manager()||!operationsView.assetSelection.size||groups.length<2)return;
    fidForm('移动分组','fid-ops-move',opsField('目标分组',opsSelect('groupId',groups.map(item=>[item.id,item.name]),groups[0].id)));
  }

  function saveAssetMove(values,value) {
    const groupId=value('groupId');
    if(!manager()||!opsAssetGroups().some(group=>group.id===groupId))return;
    for(const asset of operationsData().assets)if(operationsView.assetSelection.has(asset.id))asset.groupId=groupId;
    operationsView.assetSelection.clear();
    saveOperation('素材已移动。');
  }

  function downloadOperationsCsv(filename,rows) {
    const cell=value=>{
      const text=String(value??'');
      const safe=/^[=+\-@\t\r]/.test(text)?"'"+text:text;
      return '"'+safe.replaceAll('"','""')+'"';
    };
    const body='\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([body],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');
    link.href=url;link.download=filename;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function parseOperationsCsv(text) {
    const rows=[];
    let row=[],cell='',quoted=false;
    const source=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n')+'\n';
    for(let i=0;i<source.length;i++){
      const char=source[i];
      if(char==='"'){
        if(quoted&&source[i+1]==='"'){cell+='"';i++;}
        else quoted=!quoted;
      }else if(!quoted&&(char===','||char==='\n')){
        row.push(cell.trim());cell='';
        if(char==='\n'){if(row.some(Boolean))rows.push(row);row=[];}
      }else cell+=char;
    }
    return quoted ? null : rows;
  }

  function openMaterialImport() {
    if(!manager())return;
    const groups=opsAssetGroups();
    if(operationsView.assetType!=='text'||!groups.length)return;
    const columns='素材名称,素材内容';
    fidForm('导入素材','fid-ops-import',opsField('导入到分组',opsSelect('groupId',groups.map(item=>[item.id,item.name]),operationsView.assetGroup||groups[0].id))+
      `<p class="fid-ops-hint">粘贴 CSV 文本，首行为「${columns}」。每次最多导入 100 条。</p>`+
      opsField('CSV 内容',opsArea('csv','',columns)),'导入');
  }

  function saveMaterialImport(values,value) {
    if(!manager())return;
    const groupId=value('groupId'), parsed=parseOperationsCsv(value('csv'));
    if(!parsed)return error('CSV 引号没有配对。');
    const columns=['素材名称','素材内容'];
    const header=parsed.shift();
    if(!header||header.length!==columns.length||header.some((label,index)=>label!==columns[index]))return error('请按提示填写 CSV 表头。');
    if(!parsed.length||parsed.length>100||parsed.some(row=>row.length!==columns.length||row.some(cell=>!cell)))return error('请填写 1 至 100 条完整记录。');
    const state=operationsData();
    if(!state.assetGroups.some(item=>item.id===groupId&&item.type==='text'))return error('请选择文本分组。');
    if(parsed.some(([title,body])=>title.length>50||body.length>4000))return error('素材名称最多 50 字，内容最多 4000 字。');
    for(const [title,body] of parsed)state.assets.push({id:nextId('ops-asset'),type:'text',groupId,title,body,file:'',contact:'',nickname:''});
    operationsView.assetGroup=groupId;
    saveOperation('已导入 '+parsed.length+' 条记录。');
  }

  function updateMaterialFilter(changes) {
    Object.assign(operationsView,changes);
    operationsView.assetSelection.clear();
    ui.pages.materials=0;
    render();
  }

  Object.assign(fidActions,{
    opsMaterialType:id=>{if(Object.hasOwn(assetTypes,id))updateMaterialFilter({assetType:id,assetGroup:'',assetQuery:''});},
    opsMaterialGroup:id=>updateMaterialFilter({assetGroup:id}),
    opsMaterialReset:()=>updateMaterialFilter({assetGroup:'',assetQuery:''}),
    opsMaterialGroupAdd:()=>openMaterialGroup(),
    opsMaterialGroupEdit:openMaterialGroup,
    opsMaterialGroupDelete:deleteMaterialGroup,
    opsMaterialGroupDeleteConfirmed:id=>{
      if(!manager()||operationsData().assets.some(item=>item.groupId===id))return;
      operationsData().assetGroups=operationsData().assetGroups.filter(item=>item.id!==id);
      if(operationsView.assetGroup===id)operationsView.assetGroup='';
      saveOperation('分组已删除。');
    },
    opsAssetAdd:()=>openAsset(),opsAssetEdit:openAsset,opsAssetPreview:previewAsset,
    opsAssetMove:moveAssets,
    opsAssetDelete:()=>{
      if(manager()&&operationsView.assetSelection.size)fidConfirm('批量删除素材','确定删除所选的演示素材？','opsAssetDeleteConfirmed');
    },
    opsAssetDeleteConfirmed:()=>{
      if(!manager())return;
      operationsData().assets=operationsData().assets.filter(item=>!operationsView.assetSelection.has(item.id));
      operationsView.assetSelection.clear();saveOperation('素材已删除。');
    },
    opsMaterialImport:openMaterialImport,
    opsMaterialExport:()=>downloadOperationsCsv('素材-'+assetTypes[operationsView.assetType]+'.csv',[
      ['素材名称','素材内容'],...matchingAssets().map(item=>[item.title,[item.body,item.file,item.nickname,item.contact].filter(Boolean).join('\n')]),
    ]),
  });

  Object.assign(fidForms,{
    'fid-ops-group-form':saveMaterialGroup,'fid-ops-asset-form':saveAsset,'fid-ops-move-form':saveAssetMove,
    'fid-ops-import-form':saveMaterialImport,
    'fid-ops-material-search-form':(values,value)=>updateMaterialFilter({assetQuery:value('query')}),
  });

  document.addEventListener('click',event=>{
    const target=event.target.closest('[data-action="turnPage"][data-view="materials"]');
    if(target)operationsView.assetSelection.clear();
  },true);

  document.addEventListener('change',event=>{
    const input=event.target;
    if(input.dataset.pageSize==='materials'||input.dataset.pageJump==='materials')operationsView.assetSelection.clear();
    if(input.id==='fid-ops-asset-all'&&manager()){
      const current=paged(matchingAssets(),'materials');
      operationsView.assetSelection=new Set(input.checked?current.map(item=>item.id):[]);render();
    }
    if(input.hasAttribute('data-ops-asset-check')&&manager()){
      const id=input.dataset.opsAssetCheck;
      if(input.checked)operationsView.assetSelection.add(id);else operationsView.assetSelection.delete(id);
      render();
    }
  },true);

  // Static QR containing only the text "WA Desk demo only".
  const openwaDemoQr = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACEAAAAhAQAAAAB/n//CAAAAtUlEQVR4nGP8z8DA0MjEAAIo5EepoxwMTOw7Ln5gYPpbL6HAwMTA7ACSZetgYGD4fvfv9wamnxbhAgxM/PeafzCw/Hi0RIyB6ddt0wsMTCzZtyMYmFhFxD8wMP6+Fx38k/Hrl78XTzIxKdZ+YGD88olZrZCJKYv9BwPj/y8qApFMHzXvGTCwsO83YtBk+dskKc7AwvBn4redTAz/5wkwMH5//iXVk+mn8ZYGBhb+dwwMJzFdCwAGiTqc5pPifAAAAABJRU5ErkJggg==';
  const openwaDialog = $('#dialog');
  let openwaPairing = null;

  function openwaNextNumber() {
    const used = new Set([
      ...data.accounts.map(a => fidPhoneDigits(a.number)),
      ...data.customers.map(c => fidPhoneDigits(c.phone)),
    ]);
    for (const area of ['202', '787']) {
      for (let suffix = 199; suffix >= 100; suffix--) {
        if (!used.has('1'+area+'5550'+suffix)) return `+1 (${area}) 555-0${suffix}`;
      }
    }
    return '';
  }

  const openwaVisibleAccount = id => myAccounts().find(a => a.id === id);
  const openwaState = a => a.state === 'online' ? '在线' : a.state === 'reconnect' ? '已掉线' : '待绑定';

  function openwaTabs() {
    return `<div class="fid-wa-top">
      <div class="fid-wa-tabs" role="group" aria-label="WhatsApp 工作区">
        ${fidButton('号码管理','fidWaTab','Smartphone',fid.waTab==='numbers'?'gradient':'',`${fidActionID('numbers')} aria-pressed="${fid.waTab==='numbers'}"`)}
        ${fidButton('在线聊天','fidWaTab','MessageCircle',fid.waTab==='chat'?'gradient':'',`${fidActionID('chat')} aria-pressed="${fid.waTab==='chat'}"`)}
      </div>
      ${fid.waTab==='numbers'?fidButton('扫码绑定','openwaBind','QrCode','gradient'):''}
    </div>`;
  }

  function renderOpenwaNumbers() {
    const list = myAccounts();
    const chatCounts = new Map();
    for (const c of myCustomers()) chatCounts.set(c.account, (chatCounts.get(c.account) || 0) + 1);
    const rows = list.map(a => {
      const actions = a.state === 'pending'
        ? fidButton('扫码绑定','openwaBind','QrCode','tint',fidActionID(a.id))
        : fidButton('进入聊天','openwaOpenChat','MessageCircle',a.state==='online'?'tint':'',fidActionID(a.id)) +
          (a.state==='online'
            ? fidButton('模拟掉线','openwaDrop','','slim',fidActionID(a.id))
            : fidButton('重新连接','connect','RefreshCw','tint',fidActionID(a.id)));
      return `<tr>
        <td><strong>${esc(a.name)}</strong><span class="openwa-row-meta">${esc(a.number)}</span></td>
        <td><span class="state-text ${a.state==='reconnect'?'warn':''}"><span class="state-dot ${a.state==='reconnect'?'warning':a.state==='pending'?'offline':''}"></span>${openwaState(a)}</span></td>
        <td>${esc(member(a.owner)?.name||'未分配')}</td>
        <td>${chatCounts.get(a.id)||0}</td>
        <td>${esc(a.lastSync||'—')}</td>
        <td><div class="openwa-row-actions">${actions}</div></td>
      </tr>`;
    }).join('');
    return `<section class="fid-page fid-wa fid-wa-numbers">
      ${openwaTabs()}
      <div class="fid-table-card openwa-panel">
        <div class="openwa-panel-head">${fidHead('号码管理','通过 OpenWA 关联 WhatsApp Business 号码。')}<span class="tag slate">演示模式</span></div>
        ${fidTable('fid-numbers-table',['WhatsApp 号码','连接状态','负责人','会话','最近活跃','操作'],rows,'还没有号码，点击「扫码绑定」开始。',true,'Smartphone')}
      </div>
    </section>`;
  }

  function openwaDialogContent(title, body, footer, focus) {
    if (!openwaDialog.open) {
      fidDialog(title, body, footer);
      openwaDialog.classList.add('openwa-pair-dialog');
    } else {
      openwaDialog.setAttribute('aria-label', title);
      $('#dialog .modal-head h2').textContent = title;
      $('#openwa-dialog-body').outerHTML = body;
      $('#dialog .modal-footer').innerHTML = footer;
      paintIcons(openwaDialog);
    }
    $('#dialog '+focus)?.focus();
  }

  function openwaShowPairing() {
    const pair = openwaPairing;
    const reauth = pair.mode === 'reauth';
    const loading = pair.phase === 'connecting';
    const title = reauth ? '重新扫码绑定' : '扫码绑定 WhatsApp Business';
    const description = reauth ? `<p>${esc(pair.name)} · ${esc(pair.number)}</p>` : '';
    const status = loading
      ? `<div class="openwa-pair-state" role="status" tabindex="-1">${icon('LoaderCircle')}<strong>已模拟扫码，正在验证会话…</strong></div>`
      : `<div class="openwa-qr" role="img" aria-label="演示二维码，无法关联设备"><img alt="" width="165" height="165" src="${openwaDemoQr}"><span>演示码</span></div><div class="openwa-pair-state"><span class="state-dot warning"></span>等待扫码</div>`;
    openwaDialogContent(title, `<div id="openwa-dialog-body" class="modal-body openwa-pair-body">
      <div class="openwa-pair-copy"><strong>在手机上打开 WhatsApp Business</strong><p>选择「关联设备」→「关联新设备」，扫描二维码。</p>${description}</div>
      ${status}
      <p class="openwa-pair-hint">本地演示。点击「模拟扫码」体验绑定。</p>
    </div>`, fidButton('取消','close')+fidButton('模拟扫码','openwaScan','ScanQrCode','blue',loading?'disabled':''),
      loading?'.openwa-pair-state':'[data-action="openwaScan"]');
  }

  function openwaBeginPairing(mode, a) {
    const existingNumber = fidPhoneDigits(a?.number);
    const number = existingNumber.length >= 7 ? a.number : openwaNextNumber();
    if (!number) return toast('当前演示号码已用完。');
    openwaPairing = {mode, accountId:a?.id, persona:ui.persona, name:a?.name, number, phase:'waiting'};
    openwaShowPairing();
  }

  function openwaAddSampleChat(a) {
    if (data.customers.some(c => c.account === a.id)) return;
    const id = nextId('c');
    const text = 'Hi! I found you on Facebook. Can you share more details?';
    const translated = '你好！我是在 Facebook 上看到你们的。能多介绍一下吗？';
    const time = new Date().toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit', hour12:false});
    data.customers.unshift({
      id, name:'Taylor Morgan', initials:'TM', color:'peach', phone:'+1 (415) 555-0198',
      country:'US', city:'San Francisco', timezone:'America/Los_Angeles', language:'英语',
      owner:a.owner||ui.persona, account:a.id, tags:[], stage:'', // lifecycle engine assigns the default pipeline's intake stage
      source:'Facebook 广告', campaign:'示例广告', ad:'', unread:1, star:false,
      last:time, preview:text, translation:translated, followup:null, notes:'',
      contactRefs:[{account:a.id, owner:a.owner||ui.persona}], createdAt:fidDay(), updatedAt:fidDay(), clientType:'新增线索-实时',
    });
    data.messages[id] = [{id:nextId('m'), side:'in', text, translated, time}];
  }

  function openwaFinish(pair) {
    if (openwaPairing !== pair || !openwaDialog.open || pair.persona !== ui.persona) return;
    let a = openwaVisibleAccount(pair.accountId);
    if (pair.accountId && !a) { close(); return toast('此号码已不可用。'); }
    if (!a) {
      a = {id:nextId('a'), name:'WhatsApp Business · '+pair.number.slice(-4), owner:ui.persona,
        number:pair.number, country:pair.number.includes('(787)')?'PR':'US', color:'jade', note:'OpenWA 演示绑定', createdAt:fidDay()};
      data.accounts.push(a);
    }
    a.number = pair.number;
    a.state = 'online';
    a.lastSync = '刚刚';
    if (pair.mode === 'bind') openwaAddSampleChat(a);
    persist();
    render();
    openwaPairing = null;
    const title = pair.mode === 'bind' ? '绑定成功' : '连接已恢复';
    const action = pair.mode === 'bind' ? 'openwaOpenChat' : 'openwaReturnToChat';
    const inChat = ui.view === 'inbox' && fid.waTab === 'chat';
    const label = pair.mode !== 'bind' && inChat && fid.chatOpen ? '返回当前会话' : '进入在线聊天';
    openwaDialogContent(title, `<div id="openwa-dialog-body" class="modal-body openwa-pair-body">
      <div class="openwa-success-mark">${icon('Check')}</div>
      <div class="openwa-pair-copy"><strong>${esc(a.name)}</strong><p>${esc(a.number)} · 在线</p></div>
      <p class="openwa-pair-hint">${pair.mode==='bind'?'已准备一条示例咨询，可进入聊天体验收发。':'原有会话和草稿已保留。'}</p>
    </div>`, fidButton('完成','close')+fidButton(label,action,'ArrowRight','blue',fidActionID(a.id)),
      `[data-action="${action}"]`);
  }

  function openwaOpenChat(id) {
    const a = openwaVisibleAccount(id);
    if (!a) return;
    const c = myCustomers().find(c => c.account === id);
    if (openwaDialog.open) close();
    Object.assign(ui, {account:id, customer:c?.id||null, query:'', conversationFilter:'all', mobileChat:Boolean(c), profileTab:'details'});
    fid.waTab = 'chat';
    fid.chatOpen = Boolean(c);
    if (c) c.unread = 0;
    navigate('inbox');
    if (c) $('.chat-person h2')?.focus({preventScroll:true});
    else $('#account-filter')?.focus({preventScroll:true});
  }

  function openwaReconnect(id) {
    const a = openwaVisibleAccount(id);
    if (!a || a.state === 'online') return;
    if (a.state === 'pending') return openwaBeginPairing('bind', a);
    openwaDialogContent('重新连接', `<div id="openwa-dialog-body" class="modal-body openwa-pair-body">
      <div class="openwa-pair-copy"><strong>${esc(a.name)}</strong><p>${esc(a.number)}</p></div>
      <p class="openwa-pair-hint">先尝试恢复原会话。手机已解除设备关联时，需要重新扫码。</p>
    </div>`, fidButton('重新扫码','openwaReauth','QrCode','',fidActionID(id))+
      fidButton('模拟重连','openwaRestore','RefreshCw','blue',fidActionID(id)), '[data-action="openwaRestore"]');
  }

  const openwaBaseChat = chatHTML;
  chatHTML = function(c) {
    const a = account(c.account);
    let chat = openwaBaseChat(c);
    if (!a) return chat;
    chat = chat.replace('<div class="chat-person"><h2>', '<div class="chat-person"><h2 tabindex="-1">');
    const action = a.state === 'online' && openwaVisibleAccount(a.id)
      ? fidButton('模拟掉线','openwaDrop','WifiOff','slim',fidActionID(a.id)) : '';
    chat = chat.replace('<div class="source-strip">', `<div class="openwa-chat-status">
      <span>${icon('Smartphone')}<b>${esc(a.number)}</b></span><span class="state-text ${a.state==='reconnect'?'warn':''}" role="status"><span class="state-dot ${a.state==='reconnect'?'warning':a.state==='pending'?'offline':''}"></span>${openwaState(a)}</span>${action}
    </div><div class="source-strip">`);
    if (a.state !== 'online') {
      chat = chat.replace(`${esc(a.name)} 待连接`, '发送已暂停')
        .replace('当前草稿会保留，连接后可继续处理。','草稿和聊天记录已保留。');
      if (a.state === 'pending') chat = chat.replace('>重新连接</button>', '>扫码绑定</button>');
    }
    return chat;
  };

  renderInbox = function() {
    if (fid.waTab === 'numbers') return renderOpenwaNumbers();
    const scope = myAccounts();
    const c = fid.chatOpen ? selectedCustomer() : null;
    const a = openwaVisibleAccount(ui.account);
    const hasChat = myCustomers().some(c => ui.account === 'all' || c.account === ui.account);
    const blank = scope.length
      ? (hasChat ? '选择左侧的会话开始聊天' : '这个号码还没有会话') : '扫码绑定后开始聊天';
    const rows = hasChat ? conversationRows() : (scope.length ? '<div class="fid-wa-empty">还没有会话</div>'
      : `<div class="fid-wa-empty">${fidButton('前往号码管理','fidWaTab','Smartphone','tint',fidActionID('numbers'))}</div>`);
    return `<section class="inbox-page fid-wa"><h1 class="sr-only">WhatsApp API 在线聊天</h1>${openwaTabs()}
      <div class="inbox-layout ${ui.mobileChat&&c?'mobile-chat':'mobile-list'}">
        <section class="conversation-pane" aria-label="会话列表"><div class="conversation-top">
          <select class="fid-select fid-wa-select" id="account-filter" aria-label="按 WhatsApp 账号查看">
            ${option('all',scope.length?(manager()?'全部团队号码':'我的全部号码'):'还没有号码',ui.account)}
            ${scope.map(a=>option(a.id,a.name+(a.state==='online'?'':' · '+openwaState(a)),ui.account)).join('')}
          </select>
          <input class="fid-input fid-wa-search" id="conversation-search" aria-label="搜索会话" placeholder="搜索号码或名字" value="${esc(ui.query)}" ${hasChat?'':'disabled'}>
          ${ui.conversationFilter!=='all'?`<div class="fid-wa-active-filter"><span>${esc(fidConversationFilters[ui.conversationFilter])}会话</span>${fidIcon('清除会话筛选','fidClearChatFilter','X')}</div>`:''}
          <div class="fid-wa-conversation-actions">${fidButton('新建会话','addCustomer','SquarePen','',scope.length?'':'disabled')}${fidButton('模板','quickAll','FileText','',hasChat?'':'disabled')}</div>
          ${!hasChat&&a&&a.state!=='online'?`<div class="openwa-empty-action">${fidButton(a.state==='reconnect'?'重新连接':'扫码绑定','connect','RefreshCw','tint',fidActionID(a.id))}</div>`:''}
        </div><div class="conversation-list" id="conversation-list">${rows}</div></section>
        ${c?chatHTML(c):`<section class="chat-pane fid-chat-blank"><div>${icon('MessageCircle')}<span>${blank}</span><small>客户给你的号码发消息后，会话会显示在这里</small></div></section>`}
        ${toolsRailHTML(c)}
      </div></section>`;
  };

  Object.assign(fidActions, {
    openwaBind:id=>{
      const a = openwaVisibleAccount(id);
      if (id && a?.state !== 'pending') return;
      openwaBeginPairing('bind',a);
    },
    openwaScan:()=>{
      const pair = openwaPairing;
      if (pair?.phase !== 'waiting') return;
      pair.phase = 'connecting';
      openwaShowPairing();
      pair.timer = setTimeout(()=>openwaFinish(pair),650);
    },
    openwaOpenChat,
    openwaReturnToChat:id=>{
      if (ui.view !== 'inbox' || fid.waTab !== 'chat' || !fid.chatOpen) return openwaOpenChat(id);
      close();
      render();
      $('#composer-text')?.focus({preventScroll:true});
    },
    openwaDrop:id=>{
      const a = openwaVisibleAccount(id);
      if (a?.state !== 'online') return;
      a.state = 'reconnect';
      a.lastSync = '刚刚掉线';
      persist();
      render();
      document.querySelector(`[data-action="connect"][data-id="${CSS.escape(id)}"]`)?.focus({preventScroll:true});
      toast('已模拟掉线。');
    },
    connect:openwaReconnect,
    openwaReauth:id=>{
      const a = openwaVisibleAccount(id);
      if (a?.state === 'reconnect') openwaBeginPairing('reauth', a);
    },
    openwaRestore:id=>{
      const a = openwaVisibleAccount(id);
      if (a?.state !== 'reconnect') return;
      const pair = {mode:'reconnect', accountId:id, persona:ui.persona, number:a.number};
      openwaPairing = pair;
      openwaDialogContent('正在重连', `<div id="openwa-dialog-body" class="modal-body openwa-pair-body"><div class="openwa-pair-state" role="status" tabindex="-1">${icon('LoaderCircle')}<strong>正在恢复原会话…</strong></div></div>`,
        fidButton('取消','close'), '.openwa-pair-state');
      pair.timer = setTimeout(()=>openwaFinish(pair),650);
    },
  });

  openwaDialog.addEventListener('close', () => {
    if (openwaDialog.open) return;
    clearTimeout(openwaPairing?.timer);
    openwaPairing = null;
  });

  const dashboardFollowFilters = { all:'全部', overdue:'逾期', today:'今天', later:'以后' };
  const dashboardDateFormat = new Intl.DateTimeFormat('zh-CN', {dateStyle:'full'});
  const dashboardNumberFormat = new Intl.NumberFormat('zh-CN');
  let dashboardFollowFilter = 'all';

  function dashboardTabLink(tab) {
    return `href="?tab=${tab}#inbox" data-dashboard-tab="${tab}"`;
  }

  function dashboardMetric({label, glyph, value, detail, tone='', action, tab}) {
    const attrs = tab ? dashboardTabLink(tab) : `type="button" data-action="${action}"`;
    const element = tab ? 'a' : 'button';
    return `<${element} class="dash-metric ${tone}" ${attrs}>
      <span class="dash-metric-label"><span class="dash-metric-icon">${icon(glyph)}</span>${label}${icon('ChevronRight','dash-metric-arrow')}</span>
      <strong class="dash-metric-value">${value}</strong>
      <small>${detail}</small>
    </${element}>`;
  }

  function dashboardEmpty(glyph, message) {
    return `<div class="dash-empty">${icon(glyph)}<p>${message}</p></div>`;
  }

  function dashboardFollowups(tasks) {
    const counts = {all:tasks.length,overdue:0,today:0,later:0};
    for (const {period} of tasks) counts[period]++;
    const filters = Object.entries(dashboardFollowFilters).map(([id,label])=>
      `<button type="button" data-action="dashboardFollowFilter" ${fidActionID(id)} aria-pressed="${id===dashboardFollowFilter}">${label} <span>${dashboardNumberFormat.format(counts[id])}</span></button>`).join('');
    const selected = dashboardFollowFilter==='all' ? tasks : tasks.filter(item=>item.period===dashboardFollowFilter);
    const rows = selected.slice(0,3).map(({task, customer:c, period})=>
      `<li>
        <button class="dash-task-row" type="button" data-action="openConversation" ${fidActionID(c.id)} aria-label="打开${esc(c.name)}会话，${esc(task.title)}">
          <span class="dash-task-date ${period}">${icon(period==='overdue'?'ClockAlert':'CalendarDays')}</span>
          <span class="dash-row-copy"><strong>${esc(task.title)}</strong><small>${esc(c.name)}<span class="dash-meta-dot">·</span>${esc(dateLabel(task.due))}</small></span>
          ${period==='overdue'?'<span class="dash-status warn">逾期</span>':icon('ChevronRight','dash-row-arrow')}
        </button>
      </li>`).join('');
    const emptyText = {all:'暂无待跟进事项',overdue:'暂无逾期跟进',today:'今天暂无跟进安排',later:'暂无后续跟进安排'};
    return `<section class="dash-panel" aria-labelledby="dash-follow-title">
      <header class="dash-panel-head"><h2 id="dash-follow-title">跟进待办</h2><button type="button" class="dash-link" data-action="dashboardTasks">查看待办${icon('ChevronRight')}</button></header>
      <div class="dash-segment" role="group" aria-label="筛选跟进时间">${filters}</div>
      <div aria-live="polite">${rows?`<ul class="dash-rows">${rows}</ul>`:dashboardEmpty('CalendarCheck',emptyText[dashboardFollowFilter])}</div>
    </section>`;
  }

  function dashboardAccounts(accounts) {
    const priority = {reconnect:0,pending:1,online:2};
    const rows = [...accounts].sort((a,b)=>(priority[a.state]??2)-(priority[b.state]??2)).slice(0,3).map(a=>{
      const online = a.state==='online';
      const owner = manager() ? `<span class="dash-meta-dot">·</span>${esc(member(a.owner)?.name||'未分配')}` : '';
      const action = online
        ? `<button type="button" class="dash-icon-button" data-action="accountInbox" ${fidActionID(a.id)} aria-label="打开${esc(a.name)}的会话">${icon('MessageCircle')}</button>`
        : `<button type="button" class="dash-reconnect" data-action="connect" ${fidActionID(a.id)} aria-label="${a.state==='reconnect'?'重连':'绑定'}${esc(a.name)}">${a.state==='reconnect'?'重连':'绑定'}</button>`;
      return `<li class="dash-account-row">
        <span class="dash-account-icon">${icon('Smartphone')}</span>
        <span class="dash-row-copy"><strong>${esc(a.name)}</strong><small><span class="dash-phone">${esc(a.number)}</span>${owner}</small></span>
        <span class="dash-status ${online?'ok':a.state==='reconnect'?'warn':'quiet'}"><i aria-hidden="true"></i>${openwaState(a)}</span>
        ${action}
      </li>`;
    }).join('');
    return `<section class="dash-panel dash-accounts" aria-labelledby="dash-accounts-title">
      <header class="dash-panel-head"><h2 id="dash-accounts-title">号码状态</h2><a class="dash-link" ${dashboardTabLink('numbers')}>号码管理${icon('ChevronRight')}</a></header>
      ${rows?`<ul class="dash-rows">${rows}</ul>`:dashboardEmpty('Smartphone','暂无号码，可前往号码管理扫码绑定。')}
    </section>`;
  }

  function dashboardUnread(customers) {
    const rows = customers.slice(0,3).map(c=>`<li>
      <button class="dash-unread-row" type="button" data-action="openConversation" ${fidActionID(c.id)} aria-label="打开${esc(c.name)}的会话，${c.unread}条未读">
        ${avatar(c,'small')}
        <span class="dash-row-copy"><strong>${esc(c.name)}</strong><small>${esc(c.preview||'有未读消息')}</small></span>
        <span class="dash-unread-meta"><span>${esc(c.last||'')}</span><b class="dash-unread-count">${dashboardNumberFormat.format(c.unread)}</b></span>
      </button>
    </li>`).join('');
    return `<section class="dash-panel" aria-labelledby="dash-unread-title">
      <header class="dash-panel-head"><h2 id="dash-unread-title">未读会话</h2><button type="button" class="dash-link" data-action="dashboardUnread">查看全部${icon('ChevronRight')}</button></header>
      ${rows?`<ul class="dash-rows">${rows}</ul>`:dashboardEmpty('MessageSquareCheck','当前没有未读会话')}
    </section>`;
  }

  function dashboardSources(customers) {
    const counts = new Map();
    for (const c of customers) {
      const key = c.source?.trim() || '未记录来源';
      counts.set(key,(counts.get(key)||0)+1);
    }
    const ranking = [...counts.entries()].sort((a,b)=>b[1]-a[1]);
    const visible = ranking.slice(0,4);
    if (ranking.length>4) visible.push(['其余来源',ranking.slice(4).reduce((sum,[,n])=>sum+n,0)]);
    const rows = visible.map(([label,count])=>`<li class="dash-source-row">
      <div><span>${esc(label)}</span><strong>${dashboardNumberFormat.format(count)}<small> 位</small></strong></div>
      <span class="dash-source-bar" aria-hidden="true"><span style="width:${count/customers.length*100}%"></span></span>
    </li>`).join('');
    return `<section class="dash-panel" aria-labelledby="dash-sources-title">
      <header class="dash-panel-head"><h2 id="dash-sources-title">客户来源</h2><button type="button" class="dash-link" data-action="dashboardCustomers">客户列表${icon('ChevronRight')}</button></header>
      ${rows?`<ul class="dash-sources">${rows}</ul>`:dashboardEmpty('UsersRound','新增客户后会显示来源分布')}
    </section>`;
  }

  function renderDashboard() {
    const customers = myCustomers(), accounts = myAccounts(), now = new Date();
    const customerIndex = new Map(customers.map(c=>[c.id,c]));
    const unread = customers.filter(c=>c.unread>0);
    const tasks = pendingTasks().filter(t=>customerIndex.has(t.customer)).map(task=>({
      task, customer:customerIndex.get(task.customer),
      period:beforeToday(task.due)?'overdue':sameDay(task.due,now)?'today':'later',
    })).sort((a,b)=>new Date(a.task.due)-new Date(b.task.due));
    const overdue = tasks.filter(item=>item.period==='overdue').length;
    const today = tasks.filter(item=>item.period==='today').length;
    const online = accounts.filter(a=>a.state==='online').length;
    const dropped = accounts.filter(a=>a.state==='reconnect').length;
    const waiting = accounts.filter(a=>a.state==='pending').length;
    const unreadMessages = unread.reduce((sum,c)=>sum+Number(c.unread),0);
    const count = value => dashboardNumberFormat.format(value);

    return `<section class="fid-page dash" aria-labelledby="dashboard-title">
      <div class="dash-content">
        <header class="dash-header">
          <div><h1 id="dashboard-title">工作台概览</h1><p>${dashboardDateFormat.format(now)}<span class="dash-meta-dot">·</span>${manager()?'团队工作范围':'我的工作范围'}</p></div>
          <div class="dash-header-actions">${fidButton('新增客户','addCustomer','UserRoundPlus','dash-secondary')}
            <a ${dashboardTabLink('chat')} class="fid-btn dash-primary">${icon('MessagesSquare')}在线聊天${icon('ChevronRight')}</a>
          </div>
        </header>
        <div class="dash-metrics" aria-label="工作概况">
          ${dashboardMetric({label:'未读会话',glyph:'MessageSquare',value:count(unread.length),detail:unreadMessages?`${count(unreadMessages)} 条未读消息`:'没有未读消息',tone:'is-unread',action:'dashboardUnread'})}
          ${dashboardMetric({label:'待跟进',glyph:'ClipboardList',value:count(tasks.length),detail:`${count(overdue)} 项逾期 · ${count(today)} 项今天`,tone:overdue?'has-overdue':'',action:'dashboardTasks'})}
          ${dashboardMetric({label:'在线号码',glyph:'Smartphone',value:`${count(online)} <span>/ ${count(accounts.length)}</span>`,detail:dropped||waiting?[dropped?`${count(dropped)} 个掉线`:'',waiting?`${count(waiting)} 个待绑定`:''].filter(Boolean).join(' · '):accounts.length?'全部号码在线':'还没有绑定号码',tone:dropped?'has-overdue':'',tab:'numbers'})}
          ${dashboardMetric({label:'客户总数',glyph:'UsersRound',value:count(customers.length),detail:`${count(customers.filter(c=>c.source==='Facebook 广告').length)} 位来自 Facebook 广告`,action:'dashboardCustomers'})}
        </div>
        <div class="dash-grid">
          ${dashboardFollowups(tasks)}
          ${dashboardAccounts(accounts)}
          ${dashboardUnread(unread)}
          ${dashboardSources(customers)}
        </div>
      </div>
    </section>`;
  }

  function dashboardChatList(filter) {
    Object.assign(ui,{account:'all',query:'',conversationFilter:filter,mobileChat:false});
    fid.waTab='chat';
    fid.chatOpen=false;
  }

  document.addEventListener('click',event=>{
    const link=event.target.closest('a[data-dashboard-tab]');
    if (!link||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||link.search!==location.search) return;
    // A same-document anchor keeps the current prototype state, including its selected WhatsApp tab.
    if (link.dataset.dashboardTab==='chat') dashboardChatList('all');
    else fid.waTab='numbers';
  });

  Object.assign(fidActions, {
    dashboardFollowFilter:id=>{
      if (!Object.hasOwn(dashboardFollowFilters,id)) return;
      dashboardFollowFilter=id;
      render();
    },
    dashboardTasks:()=>{
      ui.taskFilter='pending';
      fidActions.fidTasks();
      $('#view').focus({preventScroll:true});
    },
    dashboardUnread:()=>{
      dashboardChatList('unread');
      navigate('inbox');
      $('#view').focus({preventScroll:true});
    },
    dashboardCustomers:()=>{
      fidResetCustomerFilters();
      ui.customerNavOpen=true;
      navigate('customers');
      $('#view').focus({preventScroll:true});
    },
  });

  // ============================================================================
  // Configurable lifecycle pipelines (v0.7)
  // Stages are data, not code. Behaviour is driven by each stage's category,
  // entry capture and the pipeline's automation roles — never by stage names.
  // This file is pure (no app state) so build/validation tooling can evaluate it.
  // ============================================================================

  // Stage category drives health rules, board grouping and reactivation.
  const LC_CATEGORIES = {
    open: { label: '转化推进', tone: 'blue', active: true, recovery: false },
    won: { label: '成交与存量', tone: 'purple', active: true, recovery: false },
    dormant: { label: '沉睡唤醒', tone: 'peach', active: false, recovery: true },
    lost: { label: '流失归档', tone: 'slate', active: false, recovery: true },
  };

  // What the transition dialog collects when a customer enters the stage.
  const LC_CAPTURES = {
    none: '仅记录备注',
    qualify: '需求画像（意向度 / 核心需求 / 预计体量）',
    quote: '报价单（金额 / 方案 / 顾虑）',
    order: '成交订单（金额 / 履约状态）',
    repurchase: '复购周期',
    dormant: '沉睡原因',
    lost: '流失原因（必填）与观察期，并结清待办',
  };

  // Figure shown under the stage on the board and funnel.
  const LC_METRICS = {
    unread: '未读会话数',
    quotes: '在途报价金额',
    ltv: '累计成交金额',
  };

  // Automation landing points. Each maps to a stage id or '' (automation does not move the stage).
  const LC_ROLES = {
    intake: { label: '新客进线落点', help: '模拟进线、手动建档、OpenWA 扫码会话进入此阶段，并触发「首响待破冰」提醒。' },
    quoting: { label: '新建报价落点', help: '新建报价单时，处于更早阶段或沉睡/流失阶段的客户自动推进到此阶段。' },
    fulfillment: { label: '订单履约落点', help: '登记尚未签收的成交订单时，客户进入此阶段。' },
    nurture: { label: '签收复购落点', help: '订单确认签收后进入此阶段并开启复购窗口提醒。' },
    reactivate: { label: '重激活回流落点', help: '沉睡/流失客户点击「重激活」时默认回到此阶段。' },
  };

  const LC_TASK_TYPES = ['首响破冰', '需求跟进', '报价催单', '履约回访', '复购关怀', '沉睡唤醒'];
  // [value, label] pairs offered in the stage editor. Icons are limited to the bundled set.
  const LC_TONES = [['blue', '蓝色'], ['jade', '青绿'], ['gold', '金色'], ['purple', '紫色'], ['peach', '橙色'], ['slate', '灰色']];
  const LC_STAGE_ICONS = [
    ['UserRoundPlus', '新客'], ['Compass', '需求'], ['Target', '目标'], ['ShieldCheck', '核验'], ['FileSpreadsheet', '报价单'],
    ['PackageCheck', '包裹'], ['BadgeCheck', '签约'], ['Truck', '物流'], ['Repeat', '复购'], ['Star', '重点'],
    ['Flame', '高热'], ['MessageCircle', '沟通'], ['BellRing', '唤醒'], ['Archive', '归档'],
  ];

  // Stage names stored by v0.6 and earlier builds, mapped to the retail preset's stable ids.
  const LC_LEGACY_STAGE_IDS = {
    '新进线': 'rt_new', '需求澄明': 'rt_qualify', '报价推进': 'rt_quote', '成交履约': 'rt_fulfill',
    '复购培育': 'rt_nurture', '沉睡唤醒': 'rt_dormant', '流失归档': 'rt_lost',
    '新客户': 'rt_new', '跟进中': 'rt_qualify', '已报价': 'rt_quote', '已成交': 'rt_nurture', '培育中': 'rt_dormant',
  };

  function lcPresetPipelines() {
    return [
      {
        id: 'retail', name: '零售客户', isDefault: true,
        lostReasons: ['需求暂缓/预算延后', '价格敏感/超出预算', '交付时效或物流不符', '已选择其他供应商', '长期失联未回复', '非目标客群/无效咨询'],
        roles: { intake: 'rt_new', quoting: 'rt_quote', fulfillment: 'rt_fulfill', nurture: 'rt_nurture', reactivate: 'rt_qualify' },
        stages: [
          {
            id: 'rt_new', name: '新进线', category: 'open', tone: 'blue', icon: 'UserRoundPlus', capture: 'none', metric: 'unread',
            goal: '黄金首响破冰，核实进线来源、语言偏好与初步咨询意图',
            sop: '15分钟内首响 · 确认英/西语与收件地区 · 建立首次跟进计划',
            exitRule: '客户回复并表达明确咨询方向 → 推进至下一阶段',
            next: 'rt_qualify', defaultTask: '首响破冰与确认客户来意', defaultHours: 4, taskType: '首响破冰',
          },
          {
            id: 'rt_qualify', name: '需求澄明', category: 'open', tone: 'jade', icon: 'Compass', capture: 'qualify', metric: 'unread',
            goal: '补全客户需求画像（规格偏好、采购规模、时效要求），发送匹配目录资料',
            sop: '发送对应语种目录 · 记录预算/体量区间 · 识别潜在跨号撞单',
            exitRule: '客户确认具体需求并询价 → 推进至报价',
            next: 'rt_quote', defaultTask: '跟进目录查看反馈与具体需求', defaultHours: 24, taskType: '需求跟进',
          },
          {
            id: 'rt_quote', name: '报价推进', category: 'open', tone: 'gold', icon: 'FileSpreadsheet', capture: 'quote', metric: 'quotes',
            goal: '发出结构化报价方案，跟进价格、运费与时效异议，推动拍板成交',
            sop: '登记报价单金额与有效期 · 24-48h 内跟进反馈 · 消解核心顾虑',
            exitRule: '确认付款下单 → 成交；明确放弃 → 记录原因归档',
            next: 'rt_fulfill', defaultTask: '跟进报价单确认情况与异议解答', defaultHours: 24, taskType: '报价催单',
          },
          {
            id: 'rt_fulfill', name: '成交履约', category: 'won', tone: 'purple', icon: 'PackageCheck', capture: 'order', metric: 'ltv',
            goal: '登记成交订单与外部单号，主动同步发货与物流轨迹直至安心签收',
            sop: '核对收款与订单号 · WhatsApp 同步物流单号 · 签收后做满意度回访',
            exitRule: '客户确认签收且体验良好 → 自动计算复购周期并转入复购阶段',
            next: 'rt_nurture', defaultTask: '同步发货单号并跟进物流签收', defaultHours: 48, taskType: '履约回访',
          },
          {
            id: 'rt_nurture', name: '复购培育', category: 'won', tone: 'jade', icon: 'Repeat', capture: 'repurchase', metric: 'ltv',
            goal: '围绕老客消耗/补货周期持续维护关系，在复购窗口期精准触达促成连单',
            sop: '跟踪预计复购日期 · 窗口前 5 天主动关怀询单 · 新询盘直接创建复购报价',
            exitRule: '产生复购新单 → 循环履约累加 LTV；超期未互动 → 转入沉睡唤醒',
            next: 'rt_quote', defaultTask: '复购窗口期老客关怀与补货确认', defaultHours: 120, taskType: '复购关怀',
          },
          {
            id: 'rt_dormant', name: '沉睡唤醒', category: 'dormant', tone: 'peach', icon: 'BellRing', capture: 'dormant', metric: 'unread',
            goal: '针对超期未复购老客或长期已读不回潜客，执行低打扰价值触达唤醒',
            sop: '区分老客断购与潜客静默 · 发送近况关怀或新版目录 · 避免高频骚扰',
            exitRule: '客户回复互动 → 一键重激活回流；确认无需求 → 流失归档',
            next: 'rt_qualify', defaultTask: '执行沉睡客户关怀唤醒触达', defaultHours: 72, taskType: '沉睡唤醒',
          },
          {
            id: 'rt_lost', name: '流失归档', category: 'lost', tone: 'slate', icon: 'Archive', capture: 'lost', metric: 'unread',
            goal: '沉淀结构化流失原因与竞品/价格反馈，对暂缓型客户保留观察期回流入口',
            sop: '必填真实未成交主因 · 自动清理无效日常待办 · 客户复联支持一键重激活',
            exitRule: 'WhatsApp 再次来信或观察期满重评 → 一键重激活回流（保留完整历史）',
            next: 'rt_qualify', defaultTask: '流失观察期满复盘回访', defaultHours: 720, taskType: '沉睡唤醒',
          },
        ],
      },
      {
        id: 'b2b', name: '大B经销商', isDefault: false,
        lostReasons: ['价格/账期条款未谈拢', '资质或合规不符', '最低起订量不匹配', '已签约其他供应商', '渠道冲突/区域重叠', '长期失联未回复'],
        roles: { intake: 'b2b_inquiry', quoting: 'b2b_quote', fulfillment: 'b2b_supply', nurture: 'b2b_replenish', reactivate: 'b2b_quote' },
        stages: [
          {
            id: 'b2b_inquiry', name: '批发询盘', category: 'open', tone: 'blue', icon: 'Target', capture: 'qualify', metric: 'unread',
            goal: '识别批发/经销询盘，确认公司主体、销售区域与预计采购规模',
            sop: '当日首响 · 记录公司名称与渠道类型 · 确认预计月采购额',
            exitRule: '对方提供公司资料 → 进入资质核验',
            next: 'b2b_verify', defaultTask: '核实经销商身份与采购规模', defaultHours: 8, taskType: '首响破冰',
          },
          {
            id: 'b2b_verify', name: '资质核验', category: 'open', tone: 'jade', icon: 'ShieldCheck', capture: 'none', metric: 'unread',
            goal: '核验经销商主体、渠道与合规资质，确认可合作范围与区域',
            sop: '收集营业资料 · 核对销售区域是否冲突 · 主管确认合作资格',
            exitRule: '资质通过 → 样品试单；不符合 → 归档并注明原因',
            next: 'b2b_sample', defaultTask: '收集并核验经销商资质资料', defaultHours: 48, taskType: '需求跟进',
          },
          {
            id: 'b2b_sample', name: '样品试单', category: 'open', tone: 'gold', icon: 'PackageCheck', capture: 'none', metric: 'unread',
            goal: '寄送样品或小批量试单，收集品质与包装反馈',
            sop: '确认样品规格与寄送地址 · 同步物流单号 · 到货 3 天内回访',
            exitRule: '试用反馈良好 → 批量报价谈判',
            next: 'b2b_quote', defaultTask: '寄送样品并跟进试用反馈', defaultHours: 120, taskType: '履约回访',
          },
          {
            id: 'b2b_quote', name: '批量报价谈判', category: 'open', tone: 'gold', icon: 'FileSpreadsheet', capture: 'quote', metric: 'quotes',
            goal: '按阶梯价、起订量与账期出具批量报价，推进条款确认',
            sop: '登记阶梯报价 · 明确起订量与付款节点 · 48h 内跟进决策人反馈',
            exitRule: '条款确认并首付款到账 → 签约供货',
            next: 'b2b_supply', defaultTask: '跟进批量报价与条款确认', defaultHours: 48, taskType: '报价催单',
          },
          {
            id: 'b2b_supply', name: '签约供货', category: 'won', tone: 'purple', icon: 'BadgeCheck', capture: 'order', metric: 'ltv',
            goal: '执行首批供货，确认排期、付款与到货验收',
            sop: '登记供货订单 · 同步排期与物流 · 到货验收后确认补货节奏',
            exitRule: '首批验收完成 → 进入周期补货',
            next: 'b2b_replenish', defaultTask: '确认首批供货排期与付款节点', defaultHours: 48, taskType: '履约回访',
          },
          {
            id: 'b2b_replenish', name: '周期补货', category: 'won', tone: 'jade', icon: 'Repeat', capture: 'repurchase', metric: 'ltv',
            goal: '按经销商动销节奏维护补货周期，提前锁定下一批采购',
            sop: '补货窗口前 7 天确认库存 · 同步新品与价格调整 · 记录动销反馈',
            exitRule: '持续补货循环；长期无补货 → 暂停合作',
            next: 'b2b_quote', defaultTask: '按补货周期确认下一批采购计划', defaultHours: 240, taskType: '复购关怀',
          },
          {
            id: 'b2b_paused', name: '暂停合作', category: 'dormant', tone: 'peach', icon: 'BellRing', capture: 'dormant', metric: 'unread',
            goal: '经销商暂停进货时保持低频联系，了解原因与恢复时机',
            sop: '记录暂停原因 · 每两周低频关怀 · 新品或价格调整时主动告知',
            exitRule: '恢复采购意向 → 重激活至批量报价',
            next: 'b2b_quote', defaultTask: '了解暂停原因并约定回访时间', defaultHours: 336, taskType: '沉睡唤醒',
          },
          {
            id: 'b2b_lost', name: '合作终止', category: 'lost', tone: 'slate', icon: 'Archive', capture: 'lost', metric: 'unread',
            goal: '记录终止原因与竞品条件，保留重新合作入口',
            sop: '必填终止原因 · 结清待办 · 设观察期复盘',
            exitRule: '对方重新来询 → 重激活回流（保留历史）',
            next: 'b2b_quote', defaultTask: '合作终止观察期满复盘', defaultHours: 720, taskType: '沉睡唤醒',
          },
        ],
      },
    ];
  }

  // A minimal starting point for a brand-new pipeline.
  function lcBlankPipelineStages(makeId) {
    const lead = makeId('st'), won = makeId('st'), lost = makeId('st');
    return {
      roles: { intake: lead, quoting: '', fulfillment: won, nurture: won, reactivate: lead },
      stages: [
        { id: lead, name: '新线索', category: 'open', tone: 'blue', icon: 'UserRoundPlus', capture: 'none', metric: 'unread', goal: '', sop: '', exitRule: '', next: won, defaultTask: '首次联系并确认需求', defaultHours: 24, taskType: '首响破冰' },
        { id: won, name: '已成交', category: 'won', tone: 'purple', icon: 'BadgeCheck', capture: 'order', metric: 'ltv', goal: '', sop: '', exitRule: '', next: '', defaultTask: '成交后回访', defaultHours: 72, taskType: '履约回访' },
        { id: lost, name: '已流失', category: 'lost', tone: 'slate', icon: 'Archive', capture: 'lost', metric: 'unread', goal: '', sop: '', exitRule: '', next: lead, defaultTask: '观察期满复盘', defaultHours: 720, taskType: '沉睡唤醒' },
      ],
    };
  }

  // Structural problems an admin should see before relying on a pipeline.
  function lcPipelineIssues(pipeline) {
    const ids = new Set(pipeline.stages.map(s => s.id));
    const issues = [];
    if (!pipeline.stages.length) issues.push('流程至少需要一个阶段。');
    if (!pipeline.stages.some(s => LC_CATEGORIES[s.category]?.active)) issues.push('没有转化或成交类阶段，防漏提醒不会生效。');
    for (const [role, def] of Object.entries(LC_ROLES)) {
      const target = pipeline.roles?.[role];
      if (target && !ids.has(target)) issues.push(`「${def.label}」指向的阶段已不存在。`);
    }
    if (!pipeline.roles?.intake) issues.push('未设置「新客进线落点」，新客户将进入第一个阶段。');
    for (const s of pipeline.stages) {
      if (s.next && !ids.has(s.next)) issues.push(`阶段「${s.name}」的默认下一阶段已不存在。`);
    }
    return issues;
  }

  // ============================================================================
  // WhatsApp SCRM Customer Lifecycle Engine (v0.7)
  // Stages come from configurable pipelines (data.pipelines, see fidelity-pipelines.js).
  // Logic keys off stage category, entry capture and pipeline roles — never stage names.
  // ============================================================================

  const lcPipelines = () => data.pipelines || [];
  const lcDefaultPipeline = () => lcPipelines().find(p => p.isDefault) || lcPipelines()[0];
  const lcPipeline = id => lcPipelines().find(p => p.id === id) || lcDefaultPipeline();
  const lcCustomerPipeline = c => lcPipeline(c?.pipelineId);
  function lcStageLookup(stageId) {
    for (const pipeline of lcPipelines()) {
      const index = pipeline.stages.findIndex(s => s.id === stageId);
      if (index >= 0) return { pipeline, stage: pipeline.stages[index], index };
    }
    return null;
  }
  function lcDecorate(pipeline, stage, index) {
    return { ...stage, index, code: 'S' + (index + 1), short: stage.name, pipelineId: pipeline.id, pipelineName: pipeline.name };
  }
  function lcStageMeta(stageId) {
    const hit = lcStageLookup(stageId);
    if (hit) return lcDecorate(hit.pipeline, hit.stage, hit.index);
    const p = lcDefaultPipeline();
    return lcDecorate(p, p.stages[0], 0);
  }
  const lcStages = pipeline => (pipeline?.stages || []).map((s, i) => lcDecorate(pipeline, s, i));
  const lcStageName = stageId => lcStageLookup(stageId)?.stage.name || '未知阶段';
  const lcCategory = stageId => LC_CATEGORIES[lcStageLookup(stageId)?.stage.category] || LC_CATEGORIES.open;
  const lcIsActive = stageId => lcCategory(stageId).active;
  const lcIsRecovery = stageId => lcCategory(stageId).recovery;
  const lcIsCategory = (stageId, category) => lcStageLookup(stageId)?.stage.category === category;
  const lcRoleStage = (pipeline, role) => {
    const target = pipeline?.roles?.[role] || '';
    return pipeline?.stages.some(s => s.id === target) ? target : '';
  };
  const lcHasRole = (c, role) => Boolean(c) && c.stage === lcRoleStage(lcCustomerPipeline(c), role);
  const lcIntakeStage = pipeline => lcRoleStage(pipeline, 'intake') || pipeline?.stages[0]?.id || '';
  function lcReactivateTarget(c) {
    const pipeline = lcCustomerPipeline(c);
    return lcRoleStage(pipeline, 'reactivate')
      || pipeline.stages.find(s => LC_CATEGORIES[s.category]?.active && s.id !== lcRoleStage(pipeline, 'intake'))?.id
      || lcIntakeStage(pipeline);
  }
  const lcLostReasons = c => lcCustomerPipeline(c)?.lostReasons?.length ? lcCustomerPipeline(c).lostReasons : ['其他原因'];
  const lcNewId = prefix => prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const lcChain = pipeline => (pipeline?.stages || []).map(s => s.name).join(' → ');

  // Map a customer onto a valid pipeline + stage id, migrating legacy stage names.
  function lcNormalizeCustomer(c) {
    const hit = lcStageLookup(c.stage);
    if (hit) {
      c.pipelineId = hit.pipeline.id;
      return;
    }
    const pipeline = lcPipelines().find(p => p.id === c.pipelineId) || lcDefaultPipeline();
    c.pipelineId = pipeline.id;
    const legacy = LC_LEGACY_STAGE_IDS[c.stage];
    const byName = pipeline.stages.find(s => s.name === c.stage);
    c.stage = (legacy && pipeline.stages.some(s => s.id === legacy) && legacy) || byName?.id || lcIntakeStage(pipeline);
  }

  function lcStageBadge(stage, clickableId = '') {
    const meta = lcStageMeta(stage);
    if (clickableId) {
      return `<button type="button" class="lc-stage-badge ${meta.tone}" data-action="lcAdvance" ${fidActionID(clickableId)} title="点击推进或变更阶段（${esc(meta.pipelineName)}）">${icon(meta.icon)}${esc(meta.name)}</button>`;
    }
    return `<span class="lc-stage-badge ${meta.tone}">${icon(meta.icon)}${esc(meta.name)}</span>`;
  }

  const LC_INTENT_LEVELS = ['高意向', '中意向', '了解中'];

  const lcMoneyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const lcMoney = n => lcMoneyFmt.format(Number(n) || 0);

  const lcState = {
    pipeline: '',
    cfgPipeline: '',
    mode: 'board',
    stageFilter: 'all',
    radar: 'all',
    account: 'all',
    query: '',
    sopOpen: true,
    dealsTab: 'quotes',
    dealsQuery: '',
    followTab: 'todo',
    customerHealthFilter: 'all',
    dossierTab: 'overview',
    timelineFilter: 'all',
  };

  function lcDaysBetween(fromIso, toIso = new Date().toISOString()) {
    if (!fromIso) return 0;
    const diff = new Date(toIso).getTime() - new Date(fromIso).getTime();
    return Math.round(diff / 86400000);
  }
  function lcDwellDays(c) {
    return Math.max(0, lcDaysBetween(c.stageEnteredAt || c.createdAt));
  }
  function lcDaysUntil(iso) {
    if (!iso) return null;
    const target = new Date(iso);
    if (Number.isNaN(target.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dest = new Date(target);
    dest.setHours(0, 0, 0, 0);
    return Math.round((dest.getTime() - today.getTime()) / 86400000);
  }

  function lcSeed() {
    data.quotes ??= [];
    data.orders ??= [];
    if (!Array.isArray(data.pipelines) || !data.pipelines.length) data.pipelines = lcPresetPipelines();

    // Seed additional lifecycle-complete demo customers once so all 7 stages have realistic cases
    if (!data.lcSeededV06) {
      const extraCustomers = [
        {
          id: 'c9', name: 'Brandon Miller', initials: 'BM', color: 'blue',
          phone: '+1 (737) 555-0162', country: 'US', city: 'Austin', timezone: 'America/Chicago',
          language: '英语', owner: 'lin', account: 'a1', tags: [], stage: 'rt_new',
          source: 'Facebook 广告', campaign: 'US · 目录直达广告 D', ad: '规格答疑 · 素材 04',
          unread: 2, star: true, last: '10 分钟前',
          preview: 'Hi! Just added your WhatsApp from the ad. Do you ship to Texas and have a price list?',
          translation: '你好！刚从广告加了你们 WhatsApp。请问支持发德州吗？有价目目录吗？',
          followup: fidDay(0), notes: '刚进线高意向咨询，需首响回复目录与德州时效。',
          contactRefs: [{ account: 'a1', owner: 'lin' }],
          createdAt: fidDay(0), updatedAt: fidDay(0), stageEnteredAt: fidDay(0),
          clientType: '新增线索-实时', intentLevel: '高意向',
          qualification: {
            demand: '询问常规目录价目表与德州派送安排',
            volume: '待首响确认（预计首批测试）',
            deliveryRegion: 'US · TX Austin',
            objection: '关注发货地与签收时效',
            commWindow: '美中工作时间（文字沟通）',
          },
        },
        {
          id: 'c10', name: 'Harper Davis', initials: 'HD', color: 'gold',
          phone: '+1 (312) 555-0168', country: 'US', city: 'Chicago', timezone: 'America/Chicago',
          language: '英语', owner: 'lin', account: 'a1', tags: [], stage: 'rt_quote',
          source: 'Facebook 广告', campaign: 'US · 咨询广告 A', ad: '目录介绍 · 素材 02',
          unread: 0, star: false, last: '2 天前',
          preview: 'Got the quote PDF, let me review the quantities with my partner.',
          translation: '收到报价单了，我和合伙人核对一下采购数量。',
          followup: null, notes: '已发组合报价 $2,450，客户表示与合伙人商议，当前漏排下一步跟进（断档示例）。',
          contactRefs: [{ account: 'a1', owner: 'lin' }],
          createdAt: fidDay(-6), updatedAt: fidDay(-2), stageEnteredAt: fidDay(-2),
          clientType: '新增线索-实时', intentLevel: '高意向',
          qualification: {
            demand: '双规格组合采购方案，要求分批包装说明',
            volume: '$2,000 - $3,000 / 批',
            deliveryRegion: 'US · IL Chicago（期望 5 日内达）',
            objection: '需合伙人确认首批数量与阶梯折扣',
            commWindow: '美中上午 9:00 - 12:00',
          },
        },
        {
          id: 'c11', name: 'Carlos Vega', initials: 'CV', color: 'purple',
          phone: '+1 (787) 555-0173', country: 'PR', city: 'Bayamón', timezone: 'America/Puerto_Rico',
          language: '西班牙语', owner: 'lin', account: 'a2', tags: [], stage: 'rt_fulfill',
          source: 'Instagram 广告', campaign: 'PR · 西语私域引流', ad: '西语客服直连 · 03',
          unread: 0, star: true, last: '昨天',
          preview: '¡Perfecto! Quedo atento a la entrega del paquete esta semana.',
          translation: '太好了！我会留意这周包裹的派送签收。',
          followup: fidDay(1), notes: '首单 $1,320 已收款并发出 USPS Priority，预计明日签收后回访转入复购培育。',
          contactRefs: [{ account: 'a2', owner: 'lin' }],
          createdAt: fidDay(-9), updatedAt: fidDay(-1), stageEnteredAt: fidDay(-3),
          clientType: '新增线索-实时', intentLevel: '高意向', repurchaseCycleDays: 30,
          qualification: {
            demand: '首批标准规格订单履约中，后续有按月补货意向',
            volume: '$1,300 - $1,800 / 月',
            deliveryRegion: 'PR · Bayamón',
            objection: '重点关注波多黎各派送稳定性',
            commWindow: '西语优先 · 当地午后',
          },
        },
        {
          id: 'c12', name: 'Rachel Green', initials: 'RG', color: 'slate',
          phone: '+1 (602) 555-0184', country: 'US', city: 'Phoenix', timezone: 'America/Phoenix',
          language: '英语', owner: 'lin', account: 'a1', tags: [], stage: 'rt_lost',
          source: 'Facebook 广告', campaign: 'US · 咨询广告 A', ad: '目录介绍 · 素材 01',
          unread: 0, star: false, last: '12 天前',
          preview: 'We need to pause purchasing until next month’s budget opens up.',
          translation: '我们需要暂停采购，等下个月预算开放后再推进。',
          followup: null, notes: '原报价 $3,100，因季度预算排期暂缓，设观察期可随时唤醒重激活。',
          contactRefs: [{ account: 'a1', owner: 'lin' }],
          createdAt: fidDay(-22), updatedAt: fidDay(-12), stageEnteredAt: fidDay(-12),
          clientType: '新增线索-实时', intentLevel: '中意向',
          lostReason: '需求暂缓/预算延后',
          lostDetail: '客户团队月度采购预算冻结，明确表示新一轮预算窗口可重新对接报价。',
          reactivateWatchAt: fidDay(2),
          qualification: {
            demand: '季度常规采购询盘，曾索取整箱阶梯报价',
            volume: '$3,000+ / 季度',
            deliveryRegion: 'US · AZ Phoenix',
            objection: '内部预算节点延后，对产品本身无异议',
            commWindow: '英语沟通 · 工作日邮件/WA同步',
          },
        },
      ];
      for (const ec of extraCustomers) {
        if (!data.customers.some(x => x.id === ec.id)) data.customers.push(ec);
      }

      data.messages.c9 ??= [
        { id: 'm901', side: 'in', text: 'Hello, saw your post on Facebook.', translated: '你好，在 Facebook 上看到了你们的推广。', time: '09:45' },
        { id: 'm902', side: 'in', text: 'Hi! Just added your WhatsApp from the ad. Do you ship to Texas and have a price list?', translated: '你好！刚从广告加了你们 WhatsApp。请问支持发德州吗？有价目目录吗？', time: '09:48' },
      ];
      data.messages.c10 ??= [
        { id: 'm1001', side: 'in', text: 'Can you share a formal quote for two sets shipped to Chicago?', translated: '可以发一份两套发往芝加哥的正式报价单吗？', time: '2天前 11:10' },
        { id: 'm1002', side: 'out', text: 'Sure Harper! I have prepared Quote #QT-202611-02 ($2,450 total including priority shipping).', attachment: 'Quote-QT-202611-02.pdf', time: '2天前 11:26', read: true },
        { id: 'm1003', side: 'in', text: 'Got the quote PDF, let me review the quantities with my partner.', translated: '收到报价单了，我和合伙人核对一下采购数量。', time: '2天前 14:05' },
      ];
      data.messages.c11 ??= [
        { id: 'm1101', side: 'in', text: 'Pago enviado, ¿cuándo sale el envío para Bayamón?', translated: '款项已付，请问什么时候发往巴亚蒙？', time: '昨天 10:15' },
        { id: 'm1102', side: 'out', text: '¡Gracias Carlos! Tu pedido #ORD-202611-104 ya salió por USPS Priority. Te aviso al entregarse.', time: '昨天 15:40', read: true },
        { id: 'm1103', side: 'in', text: '¡Perfecto! Quedo atento a la entrega del paquete esta semana.', translated: '太好了！我会留意这周包裹的派送签收。', time: '昨天 16:02' },
      ];
      data.messages.c12 ??= [
        { id: 'm1201', side: 'out', text: 'Hi Rachel, checking in on Quote #QT-202610-19 ($3,100). Would you like to lock in this batch?', time: '12天前 10:30', read: true },
        { id: 'm1202', side: 'in', text: 'We need to pause purchasing until next month’s budget opens up.', translated: '我们需要暂停采购，等下个月预算开放后再推进。', time: '12天前 13:18' },
      ];

      // Enrich existing c1-c8 stages & SCRM profiles
      const enrichMap = {
        c1: {
          stage: 'rt_qualify', stageEnteredAt: fidDay(-1), intentLevel: '高意向',
          qualification: {
            demand: '索取最新产品总目录，对比常规规格与批次交付周期',
            volume: '$1,200 - $2,000 / 首单',
            deliveryRegion: 'US · TX Austin',
            objection: '正在横向对比 2 家渠道的响应速度与交付稳定性',
            commWindow: '偏好文字消息 · 美中白天',
          },
        },
        c2: {
          stage: 'rt_new', stageEnteredAt: fidDay(-1), intentLevel: '高意向',
          qualification: {
            demand: '确认波多黎各（San Juan）是否支持稳定直发与时效',
            volume: '待确认具体采购量',
            deliveryRegion: 'PR · San Juan',
            objection: '担心海岛地区运费偏高或清关延误',
            commWindow: '西班牙语沟通优先',
          },
        },
        c3: {
          stage: 'rt_nurture', stageEnteredAt: fidDay(-22), intentLevel: '高意向',
          repurchaseCycleDays: 25, nextRepurchaseAt: fidDay(2), reactivatedCount: 1,
          qualification: {
            demand: '长期稳定老客（已完成 2 单），按月固定补货常规组合',
            volume: '$1,500 - $2,200 / 月',
            deliveryRegion: 'US · FL Miami',
            objection: '无价格异议，重视批次稳定与邮件同步资料',
            commWindow: '英语沟通 · 偏好提前 3 天确认排期',
          },
        },
        c4: {
          stage: 'rt_quote', stageEnteredAt: fidDay(-1), intentLevel: '高意向',
          qualification: {
            demand: '已发首批标准方案报价 $1,680，正在核实加州签收时效',
            volume: '$1,680（首单报价确认中）',
            deliveryRegion: 'US · CA San Francisco',
            objection: '希望确认付款后 48h 内发出并给追踪号',
            commWindow: '美西上午活跃',
          },
        },
        c5: {
          stage: 'rt_qualify', stageEnteredAt: fidDay(-2), intentLevel: '中意向',
          qualification: {
            demand: '需要全套西语版说明手册与入门规格建议',
            volume: '$600 - $1,000 / 试单',
            deliveryRegion: 'PR · Ponce',
            objection: '首次接触，需阅读西语详细参数后再决定数量',
            commWindow: '西语文字沟通',
          },
        },
        c6: {
          stage: 'rt_dormant', stageEnteredAt: fidDay(-10), intentLevel: '中意向',
          repurchaseCycleDays: 25, nextRepurchaseAt: fidDay(-15),
          qualification: {
            demand: '老客转介绍试单客户（首单 $890 已签收 40 天），发新版目录后未回',
            volume: '$800 - $1,500',
            deliveryRegion: 'US · NY New York',
            objection: '上次回复看完目录再联系，超期 15 天未复购需关怀唤醒',
            commWindow: '美东工作时间',
          },
        },
        c7: { stage: 'rt_qualify', stageEnteredAt: fidDay(-1), intentLevel: '高意向' },
        c8: { stage: 'rt_quote', stageEnteredAt: fidDay(-2), intentLevel: '高意向' },
      };
      for (const [cid, patch] of Object.entries(enrichMap)) {
        const target = customer(cid);
        if (target) Object.assign(target, patch);
      }

      if (!data.quotes.length) {
        data.quotes.push(
          {
            id: 'qte1', quoteNo: 'QT-202611-01', customerId: 'c4', accountId: 'a1', owner: 'lin',
            amount: 1680, currency: 'USD', summary: '加州首批标准规格组合方案（含特快专递）',
            validUntil: fidDay(4).slice(0, 10), status: '待确认',
            objectionNote: '客户追问具体派送天数，确认时效后即可成单',
            createdAt: fidDay(-1), updatedAt: fidDay(0),
          },
          {
            id: 'qte2', quoteNo: 'QT-202611-02', customerId: 'c10', accountId: 'a1', owner: 'lin',
            amount: 2450, currency: 'USD', summary: '芝加哥双规格阶梯报价单（2套组合折后价）',
            validUntil: fidDay(2).slice(0, 10), status: '待确认',
            objectionNote: '合伙人共同评估数量中，急需补排催单跟进',
            createdAt: fidDay(-2), updatedAt: fidDay(-2),
          },
          {
            id: 'qte3', quoteNo: 'QT-202611-03', customerId: 'c11', accountId: 'a2', owner: 'lin',
            amount: 1320, currency: 'USD', summary: '波多黎各首单直发方案',
            validUntil: fidDay(5).slice(0, 10), status: '已转单',
            objectionNote: '已确认付款转入订单履约',
            createdAt: fidDay(-4), updatedAt: fidDay(-3),
          },
          {
            id: 'qte4', quoteNo: 'QT-202610-19', customerId: 'c12', accountId: 'a1', owner: 'lin',
            amount: 3100, currency: 'USD', summary: '凤凰城季度整箱阶梯报价方案',
            validUntil: fidDay(-8).slice(0, 10), status: '已失效',
            objectionNote: '因客户月度预算延后归档，重激活时可一键恢复更新报价',
            createdAt: fidDay(-16), updatedAt: fidDay(-12),
          },
          {
            id: 'qte5', quoteNo: 'QT-202611-05', customerId: 'c8', accountId: 'a5', owner: 'su',
            amount: 1490, currency: 'USD', summary: 'Carolina 西语询盘标准报价',
            validUntil: fidDay(3).slice(0, 10), status: '待确认',
            objectionNote: '等待客户回复收件细节',
            createdAt: fidDay(-1), updatedAt: fidDay(-1),
          }
        );
      }

      if (!data.orders.length) {
        data.orders.push(
          {
            id: 'ord1', orderNo: 'ORD-202611-104', quoteId: 'qte3', customerId: 'c11', accountId: 'a2', owner: 'lin',
            amount: 1320, currency: 'USD', orderType: '首单', paymentStatus: '已收款',
            fulfillmentStatus: '运输中', carrierNote: 'USPS Priority · 预计明日投递 Bayamón',
            createdAt: fidDay(-3), deliveredAt: null,
          },
          {
            id: 'ord2', orderNo: 'ORD-202609-041', quoteId: '', customerId: 'c3', accountId: 'a2', owner: 'lin',
            amount: 1180, currency: 'USD', orderType: '首单', paymentStatus: '已收款',
            fulfillmentStatus: '已签收', carrierNote: 'FedEx 2Day · Miami 已本人签收',
            createdAt: fidDay(-52), deliveredAt: fidDay(-49),
          },
          {
            id: 'ord3', orderNo: 'ORD-202610-088', quoteId: '', customerId: 'c3', accountId: 'a2', owner: 'lin',
            amount: 1960, currency: 'USD', orderType: '复购', paymentStatus: '已收款',
            fulfillmentStatus: '已签收', carrierNote: 'FedEx 2Day · 第二次复购加量单已签收',
            createdAt: fidDay(-26), deliveredAt: fidDay(-23),
          },
          {
            id: 'ord4', orderNo: 'ORD-202610-052', quoteId: '', customerId: 'c6', accountId: 'a2', owner: 'lin',
            amount: 890, currency: 'USD', orderType: '首单', paymentStatus: '已收款',
            fulfillmentStatus: '已签收', carrierNote: 'UPS Ground · New York 已签收（超期未复购）',
            createdAt: fidDay(-44), deliveredAt: fidDay(-40),
          }
        );
      }

      // Add closed-loop tasks for new customers (intentionally leaving c10 without a task to showcase gap detection!)
      if (!data.tasks.some(t => t.customer === 'c9')) {
        data.tasks.unshift(
          { id: 't9', customer: 'c9', owner: 'lin', title: '首响回复目录与德州发货时效说明', due: fidDay(0), priority: 'high', taskType: '首响破冰', done: false },
          { id: 't11', customer: 'c11', owner: 'lin', title: '跟进波多黎各包裹签收并做首单满意度回访', due: fidDay(1), priority: 'normal', taskType: '履约回访', done: false }
        );
      }
      const taskTypePatch = { t1: '首响破冰', t2: '需求跟进', t3: '报价催单', t4: '复购关怀', t5: '需求跟进', t6: '沉睡唤醒' };
      for (const t of data.tasks) {
        if (taskTypePatch[t.id]) t.taskType ||= taskTypePatch[t.id];
        t.taskType ||= '需求跟进';
      }

      // Enrich lifecycle timeline activities
      data.activities.c3 = [
        { category: 'deal', text: '订单 ORD-202610-088（复购 $1,960）确认签收，转入「复购培育」（周期 25 天）', by: '林予', time: '23天前', createdAt: fidDay(-23) },
        { category: 'deal', text: '首单 ORD-202609-041（$1,180）完成交付建档', by: '林予', time: '49天前', createdAt: fidDay(-49) },
      ];
      data.activities.c4 = [
        { category: 'deal', text: '创建报价单 QT-202611-01（$1,680），阶段由「需求澄明」推进至「报价推进」', by: '林予', time: '昨天 14:05', createdAt: fidDay(-1) },
      ];
      data.activities.c11 = [
        { category: 'deal', text: '订单 ORD-202611-104 已发出（USPS Priority），同步单号给客户', by: '林予', time: '昨天 15:40', createdAt: fidDay(-1) },
        { category: 'stage', text: '报价单 QT-202611-03（$1,320）确认收款转单，阶段推进至「成交履约」', by: '林予', time: '3天前', createdAt: fidDay(-3) },
      ];
      data.activities.c12 = [
        { category: 'stage', text: '阶段归入「流失归档」· 原因：需求暂缓/预算延后（设观察期复盘）', by: '林予', time: '12天前', createdAt: fidDay(-12) },
      ];

      data.lcSeededV06 = true;
    }

    // v0.7: move the dealer-style demo customer into the B2B pipeline once.
    if (!data.lcPipelinesV07) {
      const dealer = customer('c10');
      if (dealer) lcNormalizeCustomer(dealer);
      if (dealer?.stage === 'rt_quote' && lcStageLookup('b2b_quote')) {
        dealer.pipelineId = 'b2b';
        dealer.stage = 'b2b_quote';
        dealer.clientType ||= '新增线索-实时';
      }
      data.lcPipelinesV07 = true;
    }

    // Ensure every customer has normalized stage & safe defaults
    for (const c of data.customers) {
      lcNormalizeCustomer(c);
      c.stageEnteredAt ||= c.updatedAt || c.createdAt || fidDay(-2);
      c.intentLevel ||= '中意向';
      c.reactivatedCount ??= 0;
      c.repurchaseCycleDays ||= 30;
      c.qualification = {
        demand: '',
        volume: '',
        deliveryRegion: `${country(c)}${c.city && c.city !== '待补充' ? ' · ' + c.city : ''}`,
        objection: '',
        commWindow: `${c.language || '英语'}沟通`,
        ...(c.qualification || {}),
      };
      c.attribution ||= {
        platform: c.source || '未知来源',
        method: c.campaign ? '广告入口参数' : '人工核实',
        campaign: c.campaign || '',
        ad: c.ad || '',
      };
      const pending = data.tasks.filter(t => t.customer === c.id && !t.done).sort((a, b) => new Date(a.due) - new Date(b.due));
      c.followup = pending[0]?.due || null;
    }
  }

  lcSeed();
  const lcOrigResetExtras = fidResetExtras;
  fidResetExtras = function() {
    lcOrigResetExtras();
    Object.assign(lcState, {
      pipeline: '', cfgPipeline: '', mode: 'board', stageFilter: 'all', radar: 'all', account: 'all', query: '',
      dealsTab: 'quotes', dealsQuery: '', followTab: 'todo', customerHealthFilter: 'all',
    });
    lcSeed();
  };

  // Ensure key SCRM lifecycle views appear in workspace tabs cleanly
  ui.openTabs = [...new Set(['dashboard', 'lifecycle', 'inbox', 'customers', 'followups', 'deals', ...ui.openTabs.filter(id => Object.hasOwn(views, id))])];

  // ============================================================================
  // Real-Time Customer Metrics, LTV & Anti-Leakage Health Signals
  // ============================================================================
  const lcCustomerQuotes = cid => (data.quotes || []).filter(q => q.customerId === cid).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const lcCustomerOrders = cid => (data.orders || []).filter(o => o.customerId === cid).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const lcCustomerLtv = cid => lcCustomerOrders(cid).reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const lcOpenQuotesValue = cid => lcCustomerQuotes(cid).filter(q => q.status === '待确认').reduce((sum, q) => sum + (Number(q.amount) || 0), 0);
  const lcNextTask = cid => data.tasks.filter(t => t.customer === cid && !t.done).sort((a, b) => new Date(a.due) - new Date(b.due))[0] || null;

  function lcHealth(c) {
    const stage = c.stage;
    const nextTask = lcNextTask(c.id);
    const openQuote = lcCustomerQuotes(c.id).find(q => q.status === '待确认');
    const inTransitOrder = lcCustomerOrders(c.id).find(o => o.fulfillmentStatus !== '已签收');
    const repDays = lcDaysUntil(c.nextRepurchaseAt);
    const isDormant = lcIsCategory(stage, 'dormant');
    const isLost = lcIsCategory(stage, 'lost');
    const inboundReactivate = lcIsRecovery(stage) && c.unread > 0;
    const firstResponse = lcHasRole(c, 'intake') && (c.unread > 0 || (conversationMessages(c).at(-1)?.side === 'in'));
    const overdue = Boolean(nextTask && beforeToday(nextTask.due));
    const noPlan = lcIsActive(stage) && !nextTask;
    const repurchaseSoon = lcHasRole(c, 'nurture') && repDays !== null && repDays <= 5;
    const dormantWatch = isDormant || (isLost && c.reactivateWatchAt && lcDaysUntil(c.reactivateWatchAt) <= 3);

    let primary = { key: 'healthy', label: '推进正常', tone: 'ok', icon: 'BadgeCheck' };
    if (inboundReactivate) primary = { key: 'reactivate', label: '复联待重激活', tone: 'hot', icon: 'Flame' };
    else if (overdue) primary = { key: 'overdue', label: '跟进已逾期', tone: 'hot', icon: 'ClockAlert' };
    else if (firstResponse) primary = { key: 'first', label: '首响待破冰', tone: 'warn', icon: 'Zap' };
    else if (noPlan) primary = { key: 'noplan', label: '跟进断档', tone: 'warn', icon: 'TriangleAlert' };
    else if (repurchaseSoon) primary = { key: 'repurchase', label: repDays < 0 ? `复购超期 ${Math.abs(repDays)}天` : `复购窗口 (${repDays === 0 ? '今天' : repDays + '天后'})`, tone: 'info', icon: 'Repeat' };
    else if (openQuote) primary = { key: 'quote', label: `报价待确认 ${lcMoney(openQuote.amount)}`, tone: 'info', icon: 'FileSpreadsheet' };
    else if (inTransitOrder) primary = { key: 'fulfill', label: `履约 · ${inTransitOrder.fulfillmentStatus}`, tone: 'info', icon: 'Truck' };
    else if (dormantWatch) primary = { key: 'dormant', label: isDormant ? '待关怀唤醒' : '观察期可回访', tone: 'neutral', icon: 'BellRing' };
    else if (isLost) primary = { key: 'archived', label: c.lostReason || '已流失归档', tone: 'neutral', icon: 'Archive' };

    return {
      primary,
      nextTask,
      openQuote,
      inTransitOrder,
      repDays,
      inboundReactivate,
      firstResponse,
      overdue,
      noPlan,
      quoteOpen: Boolean(openQuote),
      repurchaseSoon,
      dormantWatch,
    };
  }

  function lcLog(customerId, category, text, extra = {}) {
    const entry = {
      id: nextId('act'),
      category,
      text,
      by: me()?.name || '林予',
      time: '刚刚',
      createdAt: new Date().toISOString(),
      ...extra,
    };
    (data.activities[customerId] ??= []).unshift(entry);
    const c = customer(customerId);
    if (c) c.updatedAt = entry.createdAt;
  }

  function lcCreateTask({ customerId, title, dueIso, priority = 'normal', taskType = '需求跟进' }) {
    const c = customer(customerId);
    if (!c || !title) return null;
    const due = dueIso || new Date(Date.now() + 86400000).toISOString();
    const t = {
      id: nextId('t'),
      customer: c.id,
      owner: c.owner || ui.persona,
      title,
      due,
      priority,
      taskType,
      done: false,
    };
    data.tasks.push(t);
    const next = lcNextTask(c.id);
    c.followup = next?.due || due;
    return t;
  }

  // ============================================================================
  // Navigation & Sidebar Integration
  // ============================================================================
  const lcCustomerMenu = ['lifecycle', 'customers', 'followups', 'deals', 'chat-records', 'tags', 'tag-stats'];
  viewIcon = id => ({
    dashboard: 'LayoutDashboard',
    lifecycle: 'Kanban',
    inbox: 'MessageCircle',
    accounts: 'Smartphone',
    customers: 'ContactRound',
    followups: 'ClipboardList',
    deals: 'Receipt',
    'chat-records': 'MessagesSquare',
    tags: 'Tags',
    'tag-stats': 'ChartColumn',
    materials: 'Images',
    team: 'Network',
    members: 'UsersRound',
    scope: 'SlidersHorizontal',
    pipelines: 'GitBranch',
  }[id] || 'FileText');

  menuHTML = function(mobile = false) {
    const gapCount = myCustomers().filter(c => {
      const h = lcHealth(c);
      return h.inboundReactivate || h.overdue || h.noPlan;
    }).length;
    const renderItem = (id, label) => {
      const badge = id === 'lifecycle' && gapCount && !mobile
        ? `<span class="nav-count" title="需关注防漏信号">${gapCount}</span>`
        : id === 'scope' && !mobile
          ? '<span class="nav-count" id="pending-count"></span>'
          : '';
      return `<a class="nav-item ${ui.view === id ? 'active' : ''} ${id === 'scope' ? 'scope-link' : ''}" href="#${id}" data-nav="${id}" aria-label="${esc(label)}" title="${esc(label)}" ${ui.view === id ? 'aria-current="page"' : ''}>${icon(viewIcon(id))}<span class="nav-label">${esc(label)}</span>${badge}</a>`;
    };
    const navGroup = (title, glyph, action, opened, ids) =>
      `<button class="nav-group-button ${ids.includes(ui.view) ? 'group-active' : ''}" data-action="${action}" aria-expanded="${opened}">${icon(glyph)}<span class="nav-label">${title}</span>${icon(opened ? 'ChevronUp' : 'ChevronDown')}</button><div class="submenu" ${opened ? '' : 'hidden'}>${ids.map(id => renderItem(id, views[id])).join('')}</div>`;
    return (
      renderItem('dashboard', views.dashboard) +
      renderItem('lifecycle', views.lifecycle) +
      renderItem('inbox', views.inbox) +
      renderItem('accounts', views.accounts) +
      '<div class="nav-caption">客户全生命管理</div>' +
      navGroup('客户与跟进闭环', 'ContactRound', 'fidNavCustomers', ui.customerNavOpen, lcCustomerMenu.filter(id => id !== 'lifecycle')) +
      navGroup('运营管理', 'Images', 'fidNavOperations', fid.operationsOpen, operationsMenu) +
      (manager() ? '<div class="nav-caption">账户与组织</div>' + navGroup('组织管理', 'Network', 'fidNavOrg', fid.orgOpen, ['team', 'members']) : '') +
      '<div class="nav-caption">工作台设置</div>' +
      renderItem('pipelines', views.pipelines) +
      renderItem('scope', views.scope)
    );
  };

  // ============================================================================
  // Page 1: #lifecycle (客户全周期看板 — 漏斗 + 存量价值环 + 防漏雷达)
  // ============================================================================
  function lcMatchesRadar(c, radar) {
    if (radar === 'all') return true;
    const h = lcHealth(c);
    if (radar === 'reactivate') return h.inboundReactivate || lcIsRecovery(c.stage);
    if (radar === 'first') return h.firstResponse;
    if (radar === 'overdue') return h.overdue;
    if (radar === 'noplan') return h.noPlan;
    if (radar === 'quote') return h.quoteOpen;
    if (radar === 'repurchase') return h.repurchaseSoon || lcHasRole(c, 'nurture');
    return true;
  }

  // Board scope: the selected pipeline (falls back to the default one).
  function lcBoardPipeline() {
    const p = lcPipelines().find(x => x.id === lcState.pipeline) || lcDefaultPipeline();
    lcState.pipeline = p.id;
    return p;
  }

  function lcMatchesFilters(c, { ignoreStage = false } = {}) {
    const q = lcState.query.trim().toLowerCase();
    if (!ignoreStage && lcState.stageFilter !== 'all' && c.stage !== lcState.stageFilter) return false;
    if (lcState.account !== 'all' && c.account !== lcState.account) return false;
    if (!lcMatchesRadar(c, lcState.radar)) return false;
    if (!q) return true;
    return [c.name, c.phone, c.source, c.notes, c.qualification?.demand, account(c.account)?.name]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
  }

  function lcFilteredCustomers() {
    const pipeline = lcBoardPipeline();
    return myCustomers().filter(c => c.pipelineId === pipeline.id && lcMatchesFilters(c));
  }

  function lcCardHTML(c) {
    const a = account(c.account);
    const h = lcHealth(c);
    const ltv = lcCustomerLtv(c.id);
    const openQuoteVal = lcOpenQuotesValue(c.id);
    const dwell = lcDwellDays(c);
    const cardTone = h.primary.tone === 'hot' ? 'has-hot' : h.primary.tone === 'warn' ? 'has-warn' : ltv > 0 ? 'has-good' : '';
    const summaryText = lcIsCategory(c.stage, 'lost')
      ? `流失原因：${c.lostReason || '未注明'}${c.lostDetail ? ' · ' + c.lostDetail : ''}`
      : (c.qualification?.demand || c.notes || c.preview || '待补充客户核心需求画像');

    const valuePill = openQuoteVal > 0 && h.primary.key !== 'quote'
      ? `<span class="lc-pill info">${icon('FileSpreadsheet')}报价 ${lcMoney(openQuoteVal)}</span>`
      : ltv > 0
        ? `<span class="lc-pill ok">${icon('DollarSign')}累计 ${lcMoney(ltv)}</span>`
        : `<span class="lc-pill neutral">${esc(c.intentLevel || '中意向')}</span>`;

    const nextLine = h.nextTask
      ? `${icon(h.overdue ? 'ClockAlert' : 'CalendarClock')}<span>${esc(dateLabel(h.nextTask.due))} · ${esc(h.nextTask.title)}</span>`
      : lcIsActive(c.stage)
        ? `${icon('TriangleAlert')}<span>未安排下一步跟进（点击补排防断档）</span>`
        : `${icon('RotateCcw')}<span>${c.reactivateWatchAt ? '观察复盘：' + esc(dateLabel(c.reactivateWatchAt, false)) : '收到新消息可随时一键重激活'}</span>`;

    const primaryBtn = lcIsRecovery(c.stage)
      ? fidButton(h.inboundReactivate ? '立即重激活' : '重激活回流', 'lcAdvance', 'RotateCcw', h.inboundReactivate ? 'blue' : 'tint', `${fidActionID(c.id)} data-target="${esc(lcReactivateTarget(c))}"`)
      : fidButton('推进阶段', 'lcAdvance', 'ArrowRight', 'tint', fidActionID(c.id));

    const extraRecoveryBtn = lcIsRecovery(c.stage) && !h.inboundReactivate
      ? `<button type="button" class="icon-button" data-action="lcSimReply" ${fidActionID(c.id)} aria-label="模拟${esc(c.name)}发来复联消息">${icon('MessageSquareReply')}</button>`
      : `<button type="button" class="icon-button" data-action="followup" ${fidActionID(c.id)} aria-label="为${esc(c.name)}安排跟进">${icon('CalendarPlus')}</button>`;

    return `<article class="lc-card ${cardTone}" data-customer-card="${esc(c.id)}">
      <div class="lc-card-head">
        ${avatar(c, 'small')}
        <div class="lc-card-person">
          <strong>
            <button type="button" data-action="profile" ${fidActionID(c.id)}>${esc(c.name)}</button>
            ${c.unread ? `<span class="unread" title="${c.unread} 条未读">${c.unread}</span>` : ''}
          </strong>
          <small>${esc(a?.name || '未绑号')} · ${esc(c.language)} · 当地 ${esc(localTime(c))}</small>
        </div>
        <span class="lc-dwell" title="当前阶段停留时长">${dwell === 0 ? '今日入场' : dwell + '天'}</span>
      </div>
      <div class="lc-card-summary">${esc(summaryText)}</div>
      <div class="lc-card-badges">
        <span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span>
        ${valuePill}
        ${c.reactivatedCount > 0 ? `<span class="lc-pill info">回流×${c.reactivatedCount}</span>` : ''}
      </div>
      <div class="lc-card-next">${nextLine}</div>
      <div class="lc-card-actions">
        ${primaryBtn}
        ${fidButton('去聊天', 'openConversation', 'MessageCircle', '', fidActionID(c.id))}
        ${extraRecoveryBtn}
        <button type="button" class="icon-button" data-action="profile" ${fidActionID(c.id)} aria-label="查看${esc(c.name)} 360档案">${icon('ContactRound')}</button>
      </div>
    </article>`;
  }

  function renderLifecycleTable(list) {
    const cols = ['客户 / 来源', '归属 WhatsApp 号', '当前阶段 / 停留', '核心需求画像', '在途报价 / 累计成交', '防漏状态 / 下一步跟进', '操作'];
    const rows = list.map(c => {
      const a = account(c.account);
      const h = lcHealth(c);
      const ltv = lcCustomerLtv(c.id);
      const oq = lcOpenQuotesValue(c.id);
      return `<tr>
        <td style="text-align:left"><button type="button" class="fid-link" data-action="profile" ${fidActionID(c.id)}><strong>${esc(c.name)}</strong></button><span class="fid-cell-detail">${esc(c.phone)} · ${esc(c.source)}</span></td>
        <td style="text-align:left">${esc(a?.name || '—')}<span class="fid-cell-detail">${esc(c.language)} · 当地 ${esc(localTime(c))}</span></td>
        <td>${lcStageBadge(c.stage, c.id)}<span class="fid-cell-detail">停留 ${lcDwellDays(c)} 天</span></td>
        <td style="text-align:left"><span class="fid-cell-note">${esc(c.qualification?.demand || c.notes || '—')}</span><span class="fid-cell-detail">${esc(c.qualification?.volume || '')}</span></td>
        <td>${oq ? `<strong style="color:var(--fid-royal)">报价 ${lcMoney(oq)}</strong>` : ''}${oq && ltv ? '<br>' : ''}${ltv ? `<strong style="color:var(--fid-mint)">成交 ${lcMoney(ltv)}</strong>` : (!oq ? '—' : '')}</td>
        <td style="text-align:left"><span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span><span class="fid-cell-detail">${h.nextTask ? esc(dateLabel(h.nextTask.due) + ' · ' + h.nextTask.title) : '暂无待办跟进'}</span></td>
        <td><div class="fid-icon-actions">
          ${fidButton(lcIsRecovery(c.stage) ? '重激活' : '推进', 'lcAdvance', 'ArrowRight', 'slim tint', fidActionID(c.id))}
          ${fidIcon('打开会话', 'openConversation', 'MessageCircle', c.id)}
          ${fidIcon('360° 客户档案', 'profile', 'ContactRound', c.id)}
        </div></td>
      </tr>`;
    }).join('');
    return `<div class="fid-table-card">${fidTable('lc-stage-table', cols, rows, '当前筛选条件下没有匹配的客户', true, 'Kanban')}</div>`;
  }

  // Figure shown for a stage, chosen by the stage's configured metric.
  function lcStageMetric(stage, list, { prefix = false } = {}) {
    if (stage.metric === 'quotes') return (prefix ? '在途 ' : '') + lcMoney(list.reduce((s, c) => s + lcOpenQuotesValue(c.id), 0));
    if (stage.metric === 'ltv') return (prefix ? 'LTV ' : '') + lcMoney(list.reduce((s, c) => s + lcCustomerLtv(c.id), 0));
    return `${list.filter(c => c.unread > 0).length} 未读`;
  }

  function lcPipelineTabs(active, action, counts) {
    return `<div class="lc-subtabs lc-pipeline-tabs" role="tablist" aria-label="客户流程">
      ${lcPipelines().map(p => `<button type="button" class="lc-subtab" role="tab" data-action="${action}" ${fidActionID(p.id)} aria-selected="${p.id === active.id}" aria-pressed="${p.id === active.id}">${icon('GitBranch')}${esc(p.name)}<b>${counts(p)}</b></button>`).join('')}
    </div>`;
  }

  function renderLifecycle() {
    const pipeline = lcBoardPipeline();
    const stages = lcStages(pipeline);
    const everyone = myCustomers();
    const all = everyone.filter(c => c.pipelineId === pipeline.id);
    const list = lcFilteredCustomers();
    const funnelStages = stages.filter(s => LC_CATEGORIES[s.category]?.active);
    const recoveryStages = stages.filter(s => LC_CATEGORIES[s.category]?.recovery);
    if (lcState.stageFilter !== 'all' && !stages.some(s => s.id === lcState.stageFilter)) lcState.stageFilter = 'all';
    const reactivatedTotal = all.reduce((s, c) => s + (c.reactivatedCount || 0), 0);
    const totalQuotePool = all.reduce((s, c) => s + lcOpenQuotesValue(c.id), 0);
    const totalLtv = all.reduce((s, c) => s + lcCustomerLtv(c.id), 0);

    const radarCounts = {
      all: all.length,
      reactivate: all.filter(c => lcHealth(c).inboundReactivate || lcIsRecovery(c.stage)).length,
      first: all.filter(c => lcHealth(c).firstResponse).length,
      overdue: all.filter(c => lcHealth(c).overdue).length,
      noplan: all.filter(c => lcHealth(c).noPlan).length,
      quote: all.filter(c => lcHealth(c).quoteOpen).length,
      repurchase: all.filter(c => lcHealth(c).repurchaseSoon || lcHasRole(c, 'nurture')).length,
    };
    const hotReactivate = all.filter(c => lcHealth(c).inboundReactivate).length;

    const funnelHTML = funnelStages.map(st => {
      const stageCustomers = all.filter(c => c.stage === st.id);
      const active = lcState.stageFilter === st.id;
      return `<button type="button" class="lc-step-card ${active ? 'active' : ''}" data-action="lcStageFilter" ${fidActionID(st.id)} aria-pressed="${active}">
        <span class="lc-step-top"><span class="lc-step-code">${st.code}</span>${icon(st.icon)}</span>
        <span class="lc-step-name">${esc(st.name)}</span>
        <span class="lc-step-metrics"><b>${stageCustomers.length}</b><small>${esc(lcStageMetric(st, stageCustomers))}</small></span>
      </button>`;
    }).join('');

    const recoveryHTML = recoveryStages.length ? `<div class="lc-recovery-box">
            <div class="lc-recovery-head">
              <span>${icon('RotateCcw')}休眠唤醒与战败回流环</span>
              <small>闭环池</small>
            </div>
            <div class="lc-recovery-grid" style="--lc-cols:${Math.min(recoveryStages.length, 3)}">
              ${recoveryStages.map(st => `<button type="button" class="lc-recovery-pill ${lcState.stageFilter === st.id ? 'active' : ''}" data-action="lcStageFilter" ${fidActionID(st.id)}>
                <span>${esc(st.code)} · ${esc(st.name)}</span><strong>${all.filter(c => c.stage === st.id).length}</strong>
              </button>`).join('')}
            </div>
            <div class="lc-recovery-foot">
              <span>累计唤醒/回流激活：<b>${reactivatedTotal} 人次</b></span>
              ${lcState.stageFilter !== 'all' ? `<button type="button" class="fid-link" data-action="lcStageFilter" data-id="all">清除阶段筛选</button>` : ''}
            </div>
          </div>` : '';

    const activeSopMeta = lcState.stageFilter !== 'all' ? lcStageMeta(lcState.stageFilter) : null;
    const sopHTML = lcState.sopOpen ? `<div class="lc-sop-strip" role="region" aria-label="阶段推进准则">
      ${activeSopMeta
        ? `<strong>${icon(activeSopMeta.icon)}${esc(activeSopMeta.code + ' · ' + activeSopMeta.name)} SOP：</strong>
           ${activeSopMeta.goal ? `<span class="lc-sop-item">目标：${esc(activeSopMeta.goal)}</span>` : ''}
           ${activeSopMeta.sop ? `<span class="lc-sop-item">动作：${esc(activeSopMeta.sop)}</span>` : ''}
           ${activeSopMeta.exitRule ? `<span class="lc-sop-item">出口：${esc(activeSopMeta.exitRule)}</span>` : ''}
           <button type="button" class="fid-link" data-action="lcStageFilter" data-id="all">显示全部 ${stages.length} 个阶段</button>`
        : `<strong>${icon('Sparkles')}「${esc(pipeline.name)}」流程规则：</strong>
           <span class="lc-sop-item">1. 新客进线自动进入「${esc(lcStageName(lcIntakeStage(pipeline)))}」并立首响待办</span>
           <span class="lc-sop-item">2. 每次完成跟进必衔接下一步计划（防断档）</span>
           <span class="lc-sop-item">3. 报价、订单与签收按流程配置自动流转</span>
           <span class="lc-sop-item">4. 沉睡/流失客户来信即刻触发回流重激活</span>
           <button type="button" class="fid-link" data-nav="pipelines">调整流程配置</button>
           <button type="button" class="fid-link" data-action="lcToggleSop">收起提示</button>`}
    </div>` : '';

    const radarDefs = [
      ['all', '全部客户', 'UsersRound', ''],
      ['first', '首响待破冰', 'Zap', radarCounts.first ? 'is-alert' : ''],
      ['overdue', '跟进已逾期', 'ClockAlert', radarCounts.overdue ? 'is-hot' : ''],
      ['noplan', '跟进断档(无计划)', 'TriangleAlert', radarCounts.noplan ? 'is-alert' : ''],
      ['quote', '报价待催单', 'FileSpreadsheet', ''],
      ['repurchase', '复购培育池', 'Repeat', ''],
      ['reactivate', hotReactivate ? `复联待激活(${hotReactivate})` : '沉睡与回流池', 'RotateCcw', hotReactivate ? 'is-hot' : ''],
    ];

    // Customers matching the current filters in other pipelines, so nothing hides behind the tab.
    const elsewhere = lcPipelines().filter(p => p.id !== pipeline.id).map(p => ({
      p, n: everyone.filter(c => c.pipelineId === p.id && lcMatchesFilters(c, { ignoreStage: true })).length,
    })).filter(x => x.n && (lcState.radar !== 'all' || lcState.query || lcState.account !== 'all'));
    const elsewhereHTML = elsewhere.length
      ? `<p class="lc-elsewhere">${icon('Info')}其他流程中还有匹配客户：${elsewhere.map(x => `<button type="button" class="fid-link" data-action="lcPipeline" ${fidActionID(x.p.id)}>${esc(x.p.name)} ${x.n} 位</button>`).join(' · ')}</p>`
      : '';

    const visibleStages = lcState.stageFilter === 'all' ? stages : stages.filter(s => s.id === lcState.stageFilter);
    const boardHTML = `<div class="lc-board" style="--lc-cols:${visibleStages.length}">
      ${visibleStages.map(st => {
        const cards = list.filter(c => c.stage === st.id);
        const recovery = LC_CATEGORIES[st.category]?.recovery;
        const stageVal = st.metric === 'unread' ? (recovery ? '支持随时回流重激活' : '点击卡片可快速推进') : lcStageMetric(st, cards, { prefix: true });
        return `<section class="lc-col ${recovery ? 'is-recovery' : ''}" aria-label="${esc(st.name)}阶段列">
          <header class="lc-col-head">
            <div class="lc-col-title">
              <strong>${icon(st.icon)}${esc(st.name)}</strong>
              <span class="lc-col-count">${cards.length}</span>
            </div>
            <div class="lc-col-sub"><span>${esc(st.code)} · ${esc(LC_CATEGORIES[st.category]?.label || '')}</span><span>${esc(stageVal)}</span></div>
          </header>
          <div class="lc-col-body">
            ${cards.length ? cards.map(lcCardHTML).join('') : '<div class="lc-col-empty">当前无匹配客户</div>'}
          </div>
        </section>`;
      }).join('')}
    </div>`;

    return `<section class="lc-page" aria-labelledby="lc-page-title">
      <div class="lc-wrap">
        <header class="lc-hero">
          <div class="lc-hero-title">
            <h1 id="lc-page-title">${icon('Kanban')}WhatsApp 客户全生命周期看板</h1>
            <p>当前流程「${esc(pipeline.name)}」：${esc(lcChain(pipeline))}。阶段、自动流转与流失原因均可在「流程配置」中调整。</p>
          </div>
          <div class="lc-hero-actions">
            ${fidButton('模拟新客加微进线', 'lcSimLeadOpen', 'Sparkles', 'tint')}
            ${fidButton('新增客户建档', 'addCustomer', 'UserRoundPlus', '')}
            ${fidButton('成交与复购台账', '', 'Receipt', 'gradient', 'data-nav="deals"')}
            <div class="lc-view-switch" role="group" aria-label="视图切换">
              <button type="button" data-action="lcMode" data-id="board" aria-pressed="${lcState.mode === 'board'}">${icon('LayoutGrid')}看板</button>
              <button type="button" data-action="lcMode" data-id="table" aria-pressed="${lcState.mode === 'table'}">${icon('Table2')}明细表</button>
            </div>
          </div>
        </header>

        <div class="lc-pipeline-bar">
          ${lcPipelineTabs(pipeline, 'lcPipeline', p => everyone.filter(c => c.pipelineId === p.id).length)}
          ${fidButton('流程配置', '', 'Settings2', 'slim', 'data-nav="pipelines"')}
        </div>

        <div class="lc-loop-banner ${recoveryHTML ? '' : 'no-recovery'}">
          <div class="lc-loop-main">
            <div class="lc-loop-caption">
              <strong>${icon('TrendingUp')}转化漏斗 & 存量价值链</strong>
              <span>在途报价池：<b>${lcMoney(totalQuotePool)}</b> · 历史累计成交 LTV：<b>${lcMoney(totalLtv)}</b></span>
            </div>
            <div class="lc-funnel-steps" style="--lc-cols:${Math.max(1, funnelStages.length)}">${funnelHTML}</div>
          </div>
          ${recoveryHTML}
        </div>

        ${sopHTML}

        <div class="lc-radar-bar">
          <div class="lc-radar-chips" role="group" aria-label="防漏健康度雷达">
            ${radarDefs.map(([id, label, glyph, cls]) =>
              `<button type="button" class="lc-radar-chip ${cls}" data-action="lcRadar" ${fidActionID(id)} aria-pressed="${lcState.radar === id}">${icon(glyph)}${esc(label)}<b>${radarCounts[id]}</b></button>`
            ).join('')}
          </div>
          <div class="lc-radar-controls">
            <select class="fid-select" id="lc-account-filter" aria-label="按号码筛选生命周期">
              ${option('all', '全部负责号码', lcState.account)}
              ${myAccounts().map(a => option(a.id, a.name, lcState.account)).join('')}
            </select>
            <input class="fid-input" id="lc-search-input" aria-label="搜索客户或需求" placeholder="搜索姓名、号码、需求…" value="${esc(lcState.query)}">
            ${(lcState.stageFilter !== 'all' || lcState.radar !== 'all' || lcState.account !== 'all' || lcState.query)
              ? fidButton('重置筛选', 'lcResetFilters', 'RotateCw', 'slim') : ''}
          </div>
        </div>
        ${elsewhereHTML}

        ${lcState.mode === 'board' ? boardHTML : renderLifecycleTable(list)}
      </div>
    </section>`;
  }

  // ============================================================================
  // Smart Stage Transition Gateway Modal (阶段推进门禁与下一步待办自动衔接)
  // ============================================================================
  function lcTransitionDynamicFields(c, targetStage) {
    const meta = lcStageMeta(targetStage);
    const isReactivating = lcIsRecovery(c.stage) && lcIsActive(targetStage);
    const crossPipeline = meta.pipelineId !== c.pipelineId;
    const openQuote = lcCustomerQuotes(c.id).find(q => q.status === '待确认');
    const dueDefault = inputDate(new Date(Date.now() + (Number(meta.defaultHours) || 24) * 3600000).toISOString());
    const lostReasons = lcPipeline(meta.pipelineId).lostReasons?.length ? lcPipeline(meta.pipelineId).lostReasons : ['其他原因'];
    const reasonOptions = c.lostReason && !lostReasons.includes(c.lostReason) ? [c.lostReason, ...lostReasons] : lostReasons;

    let stageSpecific = '';
    if (meta.capture === 'qualify') {
      stageSpecific = `
        ${fidFormRow('意向度', `<select class="fid-select" name="intentLevel" style="width:100%">${LC_INTENT_LEVELS.map(x => option(x, x, c.intentLevel)).join('')}</select>`)}
        ${fidFormRow('核心需求', `<input class="fid-input" style="width:100%" name="demand" value="${esc(c.qualification?.demand || '')}" placeholder="如：常规规格咨询、目标数量、包装要求" required>`, '', true)}
        ${fidFormRow('预计体量', `<input class="fid-input" style="width:100%" name="volume" value="${esc(c.qualification?.volume || '')}" placeholder="如：$1,000 - $2,000 / 首批">`)}`;
    } else if (meta.capture === 'quote') {
      stageSpecific = `
        ${fidFormRow('报价金额', `<input class="fid-input" style="width:100%" type="number" min="1" step="1" name="quoteAmount" value="${esc(openQuote?.amount || '')}" placeholder="输入 USD 金额（如 1680）" required>`, '', true)}
        ${fidFormRow('报价方案', `<input class="fid-input" style="width:100%" name="quoteSummary" value="${esc(openQuote?.summary || c.qualification?.demand || '')}" placeholder="如：首批标准组合含优先快递" required>`, '', true)}
        ${fidFormRow('客户顾虑', `<input class="fid-input" style="width:100%" name="objection" value="${esc(openQuote?.objectionNote || c.qualification?.objection || '')}" placeholder="选填：价格对比 / 时效确认 / 合伙人审批">`)}`;
    } else if (meta.capture === 'order') {
      const priorOrders = lcCustomerOrders(c.id).length;
      stageSpecific = `
        ${fidFormRow('成交金额', `<input class="fid-input" style="width:100%" type="number" min="1" step="1" name="orderAmount" value="${esc(openQuote?.amount || '')}" placeholder="输入实收 USD 金额" required>`, '', true)}
        ${fidFormRow('订单属性', `<select class="fid-select" name="orderType" style="width:100%">${fidOption(['首单', '复购'], priorOrders > 0 ? '复购' : '首单')}</select>`)}
        ${fidFormRow('履约状态', `<select class="fid-select" name="fulfillmentStatus" style="width:100%">${fidOption(['待发货', '运输中', '已签收'], '待发货')}</select>`)}
        ${fidFormRow('交付备注', `<input class="fid-input" style="width:100%" name="carrierNote" placeholder="外部订单号或物流说明（如 USPS / FedEx）">`)}`;
    } else if (meta.capture === 'repurchase') {
      stageSpecific = `
        ${fidFormRow('复购周期', `<select class="fid-select" name="repurchaseCycleDays" style="width:100%">${fidOption([['15', '15 天（高频补货）'], ['25', '25 天（标准周期）'], ['30', '30 天（月度复购）'], ['45', '45 天（中长周期）'], ['60', '60 天（季度补货）']], String(c.repurchaseCycleDays || 30))}</select>`)}
        ${fidFormRow('维护备注', `<input class="fid-input" style="width:100%" name="transitionNote" placeholder="记录签收反馈或下次预计补货偏好">`)}`;
    } else if (meta.capture === 'dormant') {
      stageSpecific = `
        ${fidFormRow('沉睡原因', `<select class="fid-select" name="dormantReason" style="width:100%">${fidOption(['老客超复购期未下单', '发目录/报价后长期静默', '已读未回转低频培育'], '发目录/报价后长期静默')}</select>`)}
        ${fidFormRow('唤醒方向', `<input class="fid-input" style="width:100%" name="transitionNote" placeholder="如：下周发送新版资料或节日问候">`)}`;
    } else if (meta.capture === 'lost') {
      stageSpecific = `
        ${fidFormRow('流失主因', `<select class="fid-select" name="lostReason" style="width:100%" required>${reasonOptions.map(r => option(r, r, c.lostReason || reasonOptions[0])).join('')}</select>`, '', true)}
        ${fidFormRow('详细说明', `<input class="fid-input" style="width:100%" name="lostDetail" value="${esc(c.lostDetail || '')}" placeholder="记录具体异议或竞品情况，便于后续复盘" required>`, '', true)}
        ${fidFormRow('回流观察', `<select class="fid-select" name="watchDays" style="width:100%">${fidOption([['30', '30 天后提醒观察复盘（推荐暂缓型客户）'], ['14', '14 天后短期复盘'], ['0', '不设观察提醒（仅客户主动来信时唤醒）']], '30')}</select>`)}`;
    } else {
      stageSpecific = fidFormRow('阶段备注', `<input class="fid-input" style="width:100%" name="transitionNote" placeholder="选填：记录本次阶段调整说明">`);
    }

    const reactivateBanner = isReactivating
      ? `<div class="lc-card-block" style="margin-bottom:12px;background:var(--fid-mint-bg);border-color:color-mix(in srgb,var(--fid-mint) 35%,var(--fid-frame))">
           <strong style="color:var(--fid-mint);font-size:12px">${icon('RotateCcw')}闭环重激活回流：</strong>
           <small style="display:block;margin-top:3px;color:var(--fid-ink)">系统将保留该客户全部历史聊天、报价与订单档案，回流计数 +1，并重新纳入活跃跟进防漏保护。</small>
         </div>`
      : '';
    const crossBanner = crossPipeline
      ? `<p class="fid-field-help lc-cross-pipeline">${icon('GitBranch')}客户将从「${esc(lcCustomerPipeline(c).name)}」转入「${esc(meta.pipelineName)}」流程，历史聊天、报价与订单全部保留。</p>`
      : '';

    const followupBlock = meta.capture === 'lost'
      ? `<p class="fid-field-help">归入「${esc(meta.name)}」将自动结清该客户名下未完成的待办，避免干扰每日活跃工作队列。</p>`
      : `<div class="lc-card-block" style="background:var(--color-surface-alt)">
           <label style="display:flex;align-items:center;gap:6px;font-weight:650;font-size:12px;margin-bottom:8px">
             <input type="checkbox" name="createNextTask" value="1" checked> 自动衔接本阶段下一步跟进待办（防断档）
           </label>
           <div class="lc-qual-grid">
             <label class="lc-field full"><span>跟进事项</span><input class="fid-input" name="nextTaskTitle" value="${esc(meta.defaultTask)}"></label>
             <label class="lc-field"><span>计划时间</span><input class="fid-input" type="datetime-local" name="nextTaskDue" value="${dueDefault}"></label>
             <label class="lc-field"><span>优先级</span><select class="fid-select" name="nextTaskPriority">${fidOption([['normal', '普通'], ['high', '重点优先']], meta.capture === 'quote' || isReactivating ? 'high' : 'normal')}</select></label>
           </div>
         </div>`;

    return `${reactivateBanner}${crossBanner}
      ${meta.goal ? `<p class="fid-field-help" style="margin:0 0 12px">${icon('Info')} 阶段目标：${esc(meta.goal)}</p>` : ''}
      ${stageSpecific}
      ${followupBlock}`;
  }

  function openLifecycleAdvance(id, explicitTarget = '') {
    const c = customer(id);
    if (!c || !myCustomers().includes(c)) return;
    const currentMeta = lcStageMeta(c.stage);
    const own = lcCustomerPipeline(c);
    const fallback = lcStageLookup(currentMeta.next) ? currentMeta.next
      : lcIsRecovery(c.stage) ? lcReactivateTarget(c)
      : (own.stages[currentMeta.index + 1] || own.stages[currentMeta.index]).id;
    const targetStage = explicitTarget && lcStageLookup(explicitTarget) ? explicitTarget : fallback;
    const stageOptions = `<optgroup label="${esc(own.name)}（当前流程）">${lcStages(own).map(s => option(s.id, `${s.code} · ${s.name}`, targetStage)).join('')}</optgroup>`
      + lcPipelines().filter(p => p.id !== own.id).map(p => `<optgroup label="转入「${esc(p.name)}」流程">${lcStages(p).map(s => option(s.id, `${p.name} · ${s.code} · ${s.name}`, targetStage)).join('')}</optgroup>`).join('');

    fidForm(
      lcIsRecovery(c.stage) && lcIsActive(targetStage) ? `重激活客户 · ${c.name}` : `推进客户生命周期 · ${c.name}`,
      'lc-transition',
      `<input type="hidden" name="customerId" value="${esc(c.id)}">
       <div class="lc-transition-banner">
         ${lcStageBadge(c.stage)}
         ${icon('ArrowRight')}
         <select class="fid-select" id="lc-target-stage" name="targetStage" aria-label="目标生命周期阶段" data-customer="${esc(c.id)}">
           ${stageOptions}
         </select>
       </div>
       <div id="lc-transition-dynamic">${lcTransitionDynamicFields(c, targetStage)}</div>`,
      '确认变更并闭环保存',
      { wide: true }
    );
  }

  // ============================================================================
  // Upgraded Customer 360° Lifecycle Dossier Drawer
  // ============================================================================
  profileHTML = function(c) {
    const a = account(c.account);
    const m = member(c.owner);
    const h = lcHealth(c);
    const quotes = lcCustomerQuotes(c.id);
    const orders = lcCustomerOrders(c.id);
    const ltv = lcCustomerLtv(c.id);
    const openQuoteVal = lcOpenQuotesValue(c.id);
    const currentIdx = lcStageMeta(c.stage).index;
    const pipeline = lcCustomerPipeline(c);
    const pipelineStages = lcStages(pipeline);
    const tab = lcState.dossierTab || 'overview';
    const dirtyNote = Object.hasOwn(ui.noteDrafts, c.id);

    const stepper = pipelineStages.map((st, idx) => {
      const cls = st.id === c.stage ? 'current' : (idx < currentIdx && !LC_CATEGORIES[st.category]?.recovery && !lcIsRecovery(c.stage) ? 'passed' : '');
      return `<button type="button" class="lc-stepper-btn ${cls}" data-action="lcAdvance" ${fidActionID(c.id)} data-target="${esc(st.id)}" title="切换到 ${esc(st.name)}">
        <span>${st.code}</span><small>${esc(st.short)}</small>
      </button>`;
    }).join('');

    let tabBody = '';
    if (tab === 'overview') {
      const nextCard = h.nextTask
        ? `<div class="lc-card-block ${h.overdue ? 'hot-block' : ''}">
             <div class="lc-block-head">
               <h3>${icon(h.overdue ? 'ClockAlert' : 'CalendarClock')}当前待办跟进 ${h.overdue ? '<span class="lc-pill hot">已逾期</span>' : ''}</h3>
               <div class="lc-deal-actions">
                 ${fidButton('完成并衔接下一步', 'taskDone', 'CheckCircle2', 'slim blue', fidActionID(h.nextTask.id))}
                 ${fidButton('新增待办', 'followup', 'Plus', 'slim', fidActionID(c.id))}
               </div>
             </div>
             <p style="font-size:13px;font-weight:650">${esc(h.nextTask.title)}</p>
             <small style="color:var(--color-text-muted)">计划时间：${esc(dateLabel(h.nextTask.due))} · 类型：${esc(h.nextTask.taskType || '需求跟进')}</small>
           </div>`
        : lcIsActive(c.stage)
          ? `<div class="lc-card-block warn-block">
               <div class="lc-block-head">
                 <h3>${icon('TriangleAlert')}漏跟进断档预警</h3>
                 ${fidButton('立即补排跟进', 'followup', 'CalendarPlus', 'slim blue', fidActionID(c.id))}
               </div>
               <p style="font-size:12px;color:var(--fid-ink)">该客户处于活跃阶段「${esc(lcStageName(c.stage))}」，但尚未设置下一次跟进时间，极易造成意向流失。</p>
             </div>`
          : `<div class="lc-card-block">
               <div class="lc-block-head">
                 <h3>${icon('RotateCcw')}${esc(lcStageName(c.stage))} · ${lcIsCategory(c.stage, 'lost') ? '归档与观察状态' : '唤醒状态'}</h3>
                 ${fidButton('一键重激活回流', 'lcAdvance', 'RotateCcw', 'slim blue', `${fidActionID(c.id)} data-target="${esc(lcReactivateTarget(c))}"`)}
               </div>
               <p style="font-size:12px;color:var(--fid-ink)">${lcIsCategory(c.stage, 'lost') ? `归档原因：${esc(c.lostReason || '未记录')} — ${esc(c.lostDetail || '可随时重新激活')}` : '当前处于沉睡培育池，可发送关怀消息或等待客户复联后激活。'}</p>
             </div>`;

      const duplicateNotice = (c.contactRefs?.length || 0) > 1
        ? `<button type="button" class="duplicate-note" style="margin-top:10px;width:100%" data-action="duplicate" ${fidActionID(c.id)}>${icon('Copy')}跨号撞单提示：该号码在 ${c.contactRefs.length} 个业务 WhatsApp 号下有接触记录${icon('ChevronRight')}</button>`
        : '';

      tabBody = `
        ${nextCard}
        <form id="lc-qual-form" class="lc-card-block">
          <input type="hidden" name="customerId" value="${esc(c.id)}">
          <div class="lc-block-head">
            <h3>${icon('Compass')}结构化客户需求画像（Qualification）</h3>
            <button type="submit" class="fid-btn slim blue">${icon('Check')}保存画像</button>
          </div>
          <div class="lc-qual-grid">
            <label class="lc-field"><span>意向等级</span><select class="fid-select" name="intentLevel">${LC_INTENT_LEVELS.map(x => option(x, x, c.intentLevel)).join('')}</select></label>
            <label class="lc-field"><span>预计规模 / 预算区间</span><input class="fid-input" name="volume" value="${esc(c.qualification?.volume || '')}" placeholder="如 $1,500 - $2,500 / 批"></label>
            <label class="lc-field full"><span>核心咨询需求与关注点</span><input class="fid-input" name="demand" value="${esc(c.qualification?.demand || '')}" placeholder="客户主要询问的品类方向、规格或合作诉求"></label>
            <label class="lc-field"><span>收件地区与时效要求</span><input class="fid-input" name="deliveryRegion" value="${esc(c.qualification?.deliveryRegion || '')}" placeholder="如 US · TX Austin"></label>
            <label class="lc-field"><span>沟通时段与偏好</span><input class="fid-input" name="commWindow" value="${esc(c.qualification?.commWindow || '')}" placeholder="如 英语文字 · 美中上午"></label>
            <label class="lc-field full"><span>当前异议 / 推进卡点</span><input class="fid-input" name="objection" value="${esc(c.qualification?.objection || '')}" placeholder="如 对比运费、等待合伙人拍板、关注清关"></label>
          </div>
        </form>
        <div class="lc-card-block">
          <div class="lc-block-head">
            <h3>${icon('Tags')}客户标签与进线归因</h3>
            ${fidButton('设置标签', 'assignTags', 'Plus', 'slim', fidActionID(c.id))}
          </div>
          <div class="tag-row" style="margin-bottom:12px">${tagsHTML(c, 99, true) || '<span class="muted">暂未打标（可在标签管理自定义分组标签）</span>'}</div>
          <div class="info-row"><span>进线渠道</span><span><strong>${esc(c.source)}</strong>${c.campaign ? ' · ' + esc(c.campaign) : ''}</span></div>
          <div class="info-row"><span>广告素材 / 证据</span><span>${esc(c.ad || c.attribution?.method || '人工建档')}</span></div>
          <div class="info-row"><span>负责聊手 / 接待号</span><span>${esc(m?.name || '未分配')} · ${esc(a?.name || '—')}</span></div>
          ${duplicateNotice}
        </div>`;
    } else if (tab === 'deals') {
      const quoteItems = quotes.map(q => `
        <div class="lc-deal-item">
          <div class="lc-deal-main">
            <strong>${esc(q.quoteNo)} · ${lcMoney(q.amount)} <span class="lc-pill ${q.status === '待确认' ? 'info' : q.status === '已转单' ? 'ok' : 'neutral'}">${esc(q.status)}</span></strong>
            <small>${esc(q.summary)}${q.validUntil ? ` · 有效期至 ${esc(q.validUntil)}` : ''}</small>
            ${q.objectionNote ? `<small>备注：${esc(q.objectionNote)}</small>` : ''}
          </div>
          <div class="lc-deal-actions">
            ${q.status === '待确认' ? fidButton('转为成交订单', 'lcQuoteToOrder', 'CheckCircle2', 'slim blue', fidActionID(q.id)) : ''}
            ${q.status === '待确认' ? fidButton('发催单话术', 'lcChatDraft', 'SendHorizontal', 'slim', `${fidActionID(c.id)} data-draft-kind="quote"`) : ''}
            ${q.status === '待确认' ? fidButton('失效', 'lcQuoteExpire', 'X', 'slim', fidActionID(q.id)) : ''}
          </div>
        </div>`).join('');

      const orderItems = orders.map(o => {
        const nextShipLabel = o.fulfillmentStatus === '待发货' ? '标记已发货' : o.fulfillmentStatus === '运输中' ? '确认客户签收' : '';
        return `<div class="lc-deal-item">
          <div class="lc-deal-main">
            <strong>${esc(o.orderNo)} · ${lcMoney(o.amount)} <span class="lc-pill ${o.fulfillmentStatus === '已签收' ? 'ok' : 'info'}">${esc(o.orderType)} · ${esc(o.fulfillmentStatus)}</span></strong>
            <small>${esc(o.carrierNote || '暂无物流备注')} · 创建于 ${esc(fidDate(o.createdAt).slice(0, 10))}</small>
          </div>
          <div class="lc-deal-actions">
            ${nextShipLabel ? fidButton(nextShipLabel, 'lcOrderStep', 'Truck', 'slim blue', fidActionID(o.id)) : ''}
            ${fidButton('去聊天同步', 'lcChatDraft', 'MessageCircle', 'slim', `${fidActionID(c.id)} data-draft-kind="order"`)}
          </div>
        </div>`;
      }).join('');

      tabBody = `
        <div class="lc-card-block">
          <div class="lc-block-head">
            <h3>${icon('FileSpreadsheet')}报价单记录 (${quotes.length})</h3>
            ${fidButton('新建报价单', 'lcQuoteOpen', 'Plus', 'slim tint', fidActionID(c.id))}
          </div>
          ${quoteItems ? `<div class="lc-deal-list">${quoteItems}</div>` : '<p class="muted" style="font-size:12px">暂无报价单。客户进入询价阶段时可登记报价金额并自动生成跟进提醒。</p>'}
        </div>
        <div class="lc-card-block">
          <div class="lc-block-head">
            <h3>${icon('PackageCheck')}成交订单与履约台账 (${orders.length})</h3>
            ${fidButton('登记成交订单', 'lcOrderOpen', 'Plus', 'slim blue', fidActionID(c.id))}
          </div>
          ${orderItems ? `<div class="lc-deal-list">${orderItems}</div>` : '<p class="muted" style="font-size:12px">暂无已成交订单。可从上方报价单一键转成交，或直接登记订单。</p>'}
        </div>
        <div class="lc-card-block">
          <div class="lc-block-head">
            <h3>${icon('Repeat')}老客复购节奏配置</h3>
            ${c.nextRepurchaseAt ? fidButton('发复购关怀话术', 'lcChatDraft', 'SendHorizontal', 'slim tint', `${fidActionID(c.id)} data-draft-kind="repurchase"`) : ''}
          </div>
          <div class="info-row"><span>预计复购补货周期</span><span>每 <strong>${c.repurchaseCycleDays || 30}</strong> 天</span></div>
          <div class="info-row"><span>下次预计复购窗口</span><span>${c.nextRepurchaseAt ? esc(fidDate(c.nextRepurchaseAt).slice(0, 10)) + `（${lcDaysUntil(c.nextRepurchaseAt) < 0 ? '已超期 ' + Math.abs(lcDaysUntil(c.nextRepurchaseAt)) + ' 天' : lcDaysUntil(c.nextRepurchaseAt) + ' 天后'}）` : '首单签收后自动开启复购窗口'}</span></div>
        </div>`;
    } else if (tab === 'timeline') {
      const raw = data.activities[c.id] || [];
      const catLabels = { all: '全部轨迹', stage: '阶段跃迁', deal: '报价成交', followup: '跟进动作', profile: '资料与标签' };
      const filtered = raw.filter(item => {
        if (lcState.timelineFilter === 'all') return true;
        const cat = item.category || (item.text.includes('阶段') ? 'stage' : item.text.includes('订单') || item.text.includes('报价') ? 'deal' : item.text.includes('跟进') ? 'followup' : 'profile');
        return cat === lcState.timelineFilter;
      });
      tabBody = `
        <div class="lc-radar-chips">
          ${Object.entries(catLabels).map(([k, label]) =>
            `<button type="button" class="lc-radar-chip" data-action="lcTimelineFilter" ${fidActionID(k)} data-customer="${esc(c.id)}" aria-pressed="${lcState.timelineFilter === k}">${label}</button>`
          ).join('')}
        </div>
        <div class="lc-timeline">
          ${filtered.length
            ? filtered.map(item => {
                const cat = item.category || 'profile';
                return `<div class="lc-timeline-item cat-${esc(cat)}">
                  <div class="lc-timeline-top"><strong>${esc(item.by)}</strong><span>${esc(item.time || fidDate(item.createdAt))}</span></div>
                  <div class="lc-timeline-text">${esc(item.text)}</div>
                </div>`;
              }).join('')
            : '<p class="muted" style="padding:18px 0;text-align:center">该分类下暂无操作轨迹</p>'}
        </div>`;
    } else {
      tabBody = `
        <div class="lc-card-block customer-profile" style="border:1px solid var(--fid-frame)">
          <div class="lc-block-head"><h3>${icon('StickyNote')}客户沟通备忘与交接摘要</h3></div>
          <textarea class="profile-note" style="width:100%;min-height:140px" data-note-customer="${esc(c.id)}" id="customer-note-${esc(c.id)}-drawer" aria-label="客户备注" placeholder="记录客户性格偏好、关键决策人、特殊包装或历史约定…">${esc(dirtyNote ? ui.noteDrafts[c.id] : c.notes)}</textarea>
          <div class="note-save" style="margin-top:10px;display:flex;justify-content:space-between;align-items:center">
            <span role="status" style="font-size:12px;color:var(--color-text-muted)">${dirtyNote ? '有未保存的修改' : '已实时同步至本地档案'}</span>
            <button type="button" class="fid-btn blue slim" data-action="saveNote" ${fidActionID(c.id)}>保存备注</button>
          </div>
        </div>`;
    }

    return `<aside class="lc-dossier customer-profile in-drawer" aria-label="${esc(c.name)}的360度全周期档案">
      <div class="lc-dossier-head">
        <div class="lc-dossier-topbar">
          <span class="lc-dossier-eyebrow">${icon('Layers')}SCRM 客户 360° 全生命档案</span>
          <div class="lc-dossier-actions">
            <button type="button" class="icon-button star-action ${c.star ? 'active' : ''}" data-action="star" ${fidActionID(c.id)} aria-label="${c.star ? '取消星标' : '星标客户'}">${icon('Star')}</button>
            <button type="button" class="icon-button" data-action="close" aria-label="关闭客户档案">${icon('X')}</button>
          </div>
        </div>
        <div class="lc-dossier-identity">
          <div class="lc-dossier-person">
            ${avatar(c, 'large')}
            <div>
              <h2>${esc(c.name)}</h2>
              <div class="lc-dossier-meta">
                <span>${esc(c.phone)}</span>
                <span>·</span>
                <span>${esc(country(c))} ${esc(c.city !== '待补充' ? c.city : '')}（当地 ${esc(localTime(c))}）</span>
                <span>·</span>
                <span>${esc(c.language)}</span>
              </div>
            </div>
          </div>
          <div class="lc-dossier-actions">
            ${fidButton('推进阶段', 'lcAdvance', 'ArrowRight', 'tint slim', fidActionID(c.id))}
            ${fidButton('打开会话', 'openConversation', 'MessageCircle', 'blue slim', fidActionID(c.id))}
          </div>
        </div>
        <div class="lc-stepper-head"><span>${icon('GitBranch')}所属流程：<strong>${esc(pipeline.name)}</strong></span><small>选择其他流程的阶段即可转入该流程</small></div>
        <div class="lc-stepper" role="group" aria-label="生命周期阶段进度" style="--lc-cols:${pipelineStages.length}">${stepper}</div>
      </div>
      <div class="lc-dossier-kpis">
        <div class="lc-mini-kpi"><span>当前防漏状态</span><strong style="font-size:12px">${esc(h.primary.label)}</strong></div>
        <div class="lc-mini-kpi"><span>累计成交 LTV</span><strong>${lcMoney(ltv)} <small style="font-weight:400;color:var(--color-text-muted)">(${orders.length}单)</small></strong></div>
        <div class="lc-mini-kpi"><span>在途待确认报价</span><strong>${lcMoney(openQuoteVal)}</strong></div>
        <div class="lc-mini-kpi"><span>本阶段停留</span><strong>${lcDwellDays(c)} 天</strong></div>
      </div>
      <div class="lc-dossier-tabs" role="tablist" aria-label="客户档案分栏">
        ${[
          ['overview', '画像与跟进', ''],
          ['deals', '报价与订单', quotes.length + orders.length],
          ['timeline', '生命周期轨迹', (data.activities[c.id] || []).length],
          ['notes', '沟通备注', ''],
        ].map(([id, label, count]) =>
          `<button type="button" role="tab" class="lc-dossier-tab ${tab === id ? 'active' : ''}" data-action="lcDossierTab" ${fidActionID(id)} data-customer="${esc(c.id)}" aria-selected="${tab === id}">${esc(label)}${count !== '' ? `<b>${count}</b>` : ''}</button>`
        ).join('')}
      </div>
      <div class="lc-dossier-body">${tabBody}</div>
    </aside>`;
  };

  openProfile = function(id, initialTab = '') {
    const c = customer(id);
    if (!c || !myCustomers().includes(c)) return;
    ui.customer = id;
    if (initialTab) lcState.dossierTab = initialTab;
    else if (ui.profileTab === 'notes') { lcState.dossierTab = 'notes'; ui.profileTab = 'details'; }
    modal('客户 360° 档案', '<div class="profile-dialog">' + profileHTML(c, true) + '</div>', '', { drawer: true });
    $('#dialog').classList.add('lc-dossier-drawer');
  };

  function lcRefreshOpenDossier(cid) {
    const dlg = $('#dialog');
    if (dlg?.open && dlg.classList.contains('lc-dossier-drawer') && ui.customer === cid) {
      const c = customer(cid);
      if (c) {
        $('#dialog .profile-dialog').innerHTML = profileHTML(c, true);
        paintIcons(dlg);
      }
    }
  }

  // ============================================================================
  // Page 2: #deals (成交履约与复购唤醒闭环中心)
  // ============================================================================
  function renderDeals() {
    const visibleIds = new Set(myCustomers().map(c => c.id));
    const quotes = (data.quotes || []).filter(q => visibleIds.has(q.customerId));
    const orders = (data.orders || []).filter(o => visibleIds.has(o.customerId));
    const openQuotes = quotes.filter(q => q.status === '待确认');
    const inTransit = orders.filter(o => o.fulfillmentStatus !== '已签收');
    const totalLtv = orders.reduce((s, o) => s + (Number(o.amount) || 0), 0);
    const retentionPool = myCustomers().filter(c => lcHasRole(c, 'nurture') || lcIsRecovery(c.stage));
    const q = lcState.dealsQuery.trim().toLowerCase();

    let tableCard = '';
    if (lcState.dealsTab === 'quotes') {
      const list = quotes.filter(item => {
        const c = customer(item.customerId);
        return !q || [item.quoteNo, item.summary, item.objectionNote, c?.name, c?.phone].filter(Boolean).join(' ').toLowerCase().includes(q);
      });
      const rows = list.map(item => {
        const c = customer(item.customerId);
        const h = c ? lcHealth(c) : null;
        return `<tr>
          <td><strong>${esc(item.quoteNo)}</strong><span class="fid-cell-detail">${esc(fidDate(item.createdAt).slice(0, 10))}</span></td>
          <td style="text-align:left"><button type="button" class="fid-link" data-action="profile" ${fidActionID(c?.id || '')} data-tab="deals"><strong>${esc(c?.name || '—')}</strong></button><span class="fid-cell-detail">${esc(c?.phone || '')}</span></td>
          <td><strong>${lcMoney(item.amount)}</strong></td>
          <td style="text-align:left">${esc(item.summary)}<span class="fid-cell-detail">${esc(item.objectionNote || '暂无异议记录')}</span></td>
          <td><span class="lc-pill ${item.status === '待确认' ? 'info' : item.status === '已转单' ? 'ok' : 'neutral'}">${esc(item.status)}</span><span class="fid-cell-detail">有效期至 ${esc(item.validUntil || '—')}</span></td>
          <td style="text-align:left">${h?.nextTask ? esc(dateLabel(h.nextTask.due) + ' · ' + h.nextTask.title) : '<span class="lc-pill warn">未设催单待办</span>'}</td>
          <td><div class="fid-icon-actions">
            ${item.status === '待确认' ? fidButton('转成交单', 'lcQuoteToOrder', 'CheckCircle2', 'slim blue', fidActionID(item.id)) : ''}
            ${c ? fidButton('去催单', 'lcChatDraft', 'MessageCircle', 'slim', `${fidActionID(c.id)} data-draft-kind="quote"`) : ''}
          </div></td>
        </tr>`;
      }).join('');
      tableCard = `<div class="fid-table-card">${fidTable('lc-deals-table', ['报价单号', '客户', '报价金额', '方案摘要与顾虑', '状态 / 有效期', '下一步催单计划', '闭环操作'], rows, '暂无报价单记录', true, 'FileSpreadsheet')}</div>`;
    } else if (lcState.dealsTab === 'orders') {
      const list = orders.filter(item => {
        const c = customer(item.customerId);
        return !q || [item.orderNo, item.carrierNote, item.orderType, c?.name, c?.phone].filter(Boolean).join(' ').toLowerCase().includes(q);
      });
      const rows = list.map(item => {
        const c = customer(item.customerId);
        const stepLabel = item.fulfillmentStatus === '待发货' ? '标记发货' : item.fulfillmentStatus === '运输中' ? '确认签收转复购' : '';
        return `<tr>
          <td><strong>${esc(item.orderNo)}</strong><span class="fid-cell-detail">${esc(fidDate(item.createdAt).slice(0, 10))}</span></td>
          <td style="text-align:left"><button type="button" class="fid-link" data-action="profile" ${fidActionID(c?.id || '')} data-tab="deals"><strong>${esc(c?.name || '—')}</strong></button><span class="fid-cell-detail">${esc(account(item.accountId)?.name || '')}</span></td>
          <td><strong>${lcMoney(item.amount)}</strong><span class="fid-cell-detail">${esc(item.paymentStatus)}</span></td>
          <td><span class="lc-pill ${item.orderType === '复购' ? 'ok' : 'info'}">${esc(item.orderType)}</span></td>
          <td><span class="lc-pill ${item.fulfillmentStatus === '已签收' ? 'ok' : 'warn'}">${esc(item.fulfillmentStatus)}</span></td>
          <td style="text-align:left">${esc(item.carrierNote || '—')}${item.deliveredAt ? `<span class="fid-cell-detail">签收于 ${esc(fidDate(item.deliveredAt).slice(0, 10))}</span>` : ''}</td>
          <td><div class="fid-icon-actions">
            ${stepLabel ? fidButton(stepLabel, 'lcOrderStep', 'Truck', 'slim blue', fidActionID(item.id)) : ''}
            ${c ? fidButton('同步物流', 'lcChatDraft', 'SendHorizontal', 'slim', `${fidActionID(c.id)} data-draft-kind="order"`) : ''}
          </div></td>
        </tr>`;
      }).join('');
      tableCard = `<div class="fid-table-card">${fidTable('lc-orders-table', ['订单编号', '客户 / 接待号', '成交金额', '首单/复购', '履约状态', '物流与交付说明', '履约闭环操作'], rows, '暂无订单记录', true, 'PackageCheck')}</div>`;
    } else {
      const list = retentionPool.filter(c => !q || [c.name, c.phone, c.lostReason, c.notes].filter(Boolean).join(' ').toLowerCase().includes(q));
      const rows = list.map(c => {
        const ltv = lcCustomerLtv(c.id);
        const ordCount = lcCustomerOrders(c.id).length;
        const repDays = lcDaysUntil(c.nextRepurchaseAt);
        const h = lcHealth(c);
        const windowDesc = lcIsCategory(c.stage, 'lost')
          ? `流失原因：${c.lostReason || '未填'}${c.reactivateWatchAt ? ' · 观察日 ' + fidDate(c.reactivateWatchAt).slice(0, 10) : ''}`
          : c.nextRepurchaseAt
            ? `${fidDate(c.nextRepurchaseAt).slice(0, 10)}（${repDays < 0 ? '超期 ' + Math.abs(repDays) + ' 天' : repDays === 0 ? '今日到期' : '剩 ' + repDays + ' 天'}）`
            : `周期 ${c.repurchaseCycleDays || 30} 天`;
        return `<tr>
          <td style="text-align:left"><button type="button" class="fid-link" data-action="profile" ${fidActionID(c.id)}><strong>${esc(c.name)}</strong></button><span class="fid-cell-detail">${esc(c.phone)} · ${esc(c.language)}</span></td>
          <td>${lcStageBadge(c.stage, c.id)}</td>
          <td><strong>${lcMoney(ltv)}</strong><span class="fid-cell-detail">已购 ${ordCount} 单</span></td>
          <td style="text-align:left">${esc(windowDesc)}</td>
          <td><span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span></td>
          <td><div class="fid-icon-actions">
            ${lcHasRole(c, 'nurture')
              ? fidButton('复购触达', 'lcChatDraft', 'Repeat', 'slim blue', `${fidActionID(c.id)} data-draft-kind="repurchase"`)
              : fidButton('重激活回流', 'lcAdvance', 'RotateCcw', h.inboundReactivate ? 'slim blue' : 'slim tint', `${fidActionID(c.id)} data-target="${esc(lcReactivateTarget(c))}"`)}
            ${lcIsRecovery(c.stage) ? fidButton('模拟客户复联', 'lcSimReply', 'MessageSquareReply', 'slim', fidActionID(c.id)) : fidButton('排期跟进', 'followup', 'CalendarPlus', 'slim', fidActionID(c.id))}
          </div></td>
        </tr>`;
      }).join('');
      tableCard = `<div class="fid-table-card">${fidTable('lc-retention-table', ['客户信息', '当前所处阶段', '历史贡献 LTV', '复购窗口 / 归档说明', '信号状态', '唤醒与复购动作'], rows, '暂无复购或待唤醒客户', true, 'Repeat')}</div>`;
    }

    return `<section class="lc-page" aria-labelledby="deals-page-title">
      <div class="lc-wrap">
        <header class="lc-hero">
          <div class="lc-hero-title">
            <h1 id="deals-page-title">${icon('Receipt')}报价转化、订单履约与复购中心</h1>
            <p>打通「发出报价 → 拍板成单 → 物流签收 → 复购窗口提醒 → 沉睡唤醒/流失重激活」的交易价值后半程闭环；各流程的落点阶段在「流程配置」中设定。</p>
          </div>
          <div class="lc-hero-actions">
            ${fidButton('新建报价单', 'lcQuoteOpen', 'FileSpreadsheet', 'tint')}
            ${fidButton('登记成交订单', 'lcOrderOpen', 'Plus', 'gradient')}
          </div>
        </header>

        <div class="lc-kpis-4">
          <div class="lc-kpi-card"><span>${icon('FileSpreadsheet')}在途待确认报价</span><strong>${lcMoney(openQuotes.reduce((s, x) => s + Number(x.amount || 0), 0))}</strong><small>${openQuotes.length} 笔报价正在跟进推进</small></div>
          <div class="lc-kpi-card"><span>${icon('DollarSign')}累计已成交总额 (LTV)</span><strong>${lcMoney(totalLtv)}</strong><small>共 ${orders.length} 笔订单（复购 ${orders.filter(o => o.orderType === '复购').length} 笔）</small></div>
          <div class="lc-kpi-card"><span>${icon('Truck')}履约交付中订单</span><strong>${inTransit.length}</strong><small>签收确认后自动开启老客复购倒计时</small></div>
          <div class="lc-kpi-card"><span>${icon('Repeat')}复购培育与唤醒池</span><strong>${retentionPool.length}</strong><small>${retentionPool.filter(c => lcHealth(c).repurchaseSoon).length} 位临近复购窗口 · ${retentionPool.filter(c => lcIsRecovery(c.stage)).length} 位可唤醒</small></div>
        </div>

        <div class="lc-radar-bar">
          <div class="lc-subtabs" role="tablist">
            <button type="button" class="lc-subtab" data-action="lcDealsTab" data-id="quotes" aria-pressed="${lcState.dealsTab === 'quotes'}">${icon('FileSpreadsheet')}在途与历史报价<b>${quotes.length}</b></button>
            <button type="button" class="lc-subtab" data-action="lcDealsTab" data-id="orders" aria-pressed="${lcState.dealsTab === 'orders'}">${icon('PackageCheck')}订单与发货签收<b>${orders.length}</b></button>
            <button type="button" class="lc-subtab" data-action="lcDealsTab" data-id="retention" aria-pressed="${lcState.dealsTab === 'retention'}">${icon('Repeat')}复购窗口与流失唤醒池<b>${retentionPool.length}</b></button>
          </div>
          <div class="lc-radar-controls">
            <input class="fid-input" id="lc-deals-search" aria-label="搜索报价或订单" placeholder="搜索单号、客户、备注…" value="${esc(lcState.dealsQuery)}">
          </div>
        </div>

        ${tableCard}
      </div>
    </section>`;
  }

  // ============================================================================
  // Page 3: Upgraded #followups (跟进待办队列 + 断档扫描 + 历史操作审计记录)
  // ============================================================================
  renderFollowups = function() {
    const allTasks = myTasks();
    const pending = allTasks.filter(t => !t.done);
    const overdue = pending.filter(t => beforeToday(t.due));
    const today = pending.filter(t => sameDay(t.due));
    const done = allTasks.filter(t => t.done);
    const gapCustomers = myCustomers().filter(c => lcHealth(c).noPlan);

    const headerTabs = `<div class="lc-radar-bar" style="margin-bottom:14px">
      <div class="lc-subtabs" role="tablist" aria-label="跟进管理视图">
        <button type="button" class="lc-subtab" data-action="lcFollowTab" data-id="todo" aria-pressed="${lcState.followTab === 'todo'}">${icon('ClipboardList')}跟进待办队列<b>${pending.length}</b></button>
        <button type="button" class="lc-subtab" data-action="lcFollowTab" data-id="gaps" aria-pressed="${lcState.followTab === 'gaps'}">${icon('TriangleAlert')}漏跟进断档检测<b>${gapCustomers.length}</b></button>
        <button type="button" class="lc-subtab" data-action="lcFollowTab" data-id="history" aria-pressed="${lcState.followTab === 'history'}">${icon('History')}跟进与操作审计日志<b>${fidLogs().length}</b></button>
      </div>
      <div class="lc-radar-controls">
        ${fidButton('新建跟进任务', 'newTask', 'Plus', 'blue')}
      </div>
    </div>`;

    if (lcState.followTab === 'gaps') {
      const gapRows = gapCustomers.map(c => {
        const a = account(c.account);
        return `<tr>
          <td style="text-align:left"><button type="button" class="fid-link" data-action="profile" ${fidActionID(c.id)}><strong>${esc(c.name)}</strong></button><span class="fid-cell-detail">${esc(c.phone)}</span></td>
          <td>${lcStageBadge(c.stage, c.id)}</td>
          <td>${esc(a?.name || '—')}</td>
          <td style="text-align:left">${esc(c.preview || c.notes || '—')}<span class="fid-cell-detail">最后活跃：${esc(c.last || '—')}</span></td>
          <td><span class="lc-pill warn">${icon('TriangleAlert')}活跃阶段无后续待办</span></td>
          <td><div class="fid-icon-actions">
            ${fidButton('立即补排跟进', 'followup', 'CalendarPlus', 'slim blue', fidActionID(c.id))}
            ${fidButton('去聊天', 'openConversation', 'MessageCircle', 'slim', fidActionID(c.id))}
          </div></td>
        </tr>`;
      }).join('');
      return `<section class="fid-page"><div class="lc-wrap">
        ${fidHead('跟进与防漏中心', '实时扫描处于转化或成交类阶段却未安排下一步计划的断档客户，杜绝私域漏跟进。')}
        ${headerTabs}
        <div class="fid-table-card">${fidTable('lc-gaps-table', ['客户', '当前阶段', '接待 WhatsApp 号', '最近沟通上下文', '风险诊断', '补救操作'], gapRows, '太棒了！当前所有活跃阶段客户均已安排下一步跟进计划。', true, 'BadgeCheck')}</div>
      </div></section>`;
    }

    if (lcState.followTab === 'history') {
      const f = fid.logFilter;
      const rows = fidLogs();
      const body = paged(rows, 'followups').map(({ c, entry, at, kind }) => {
        const label = entry.category === 'stage' ? '阶段跃迁' : entry.category === 'deal' ? '报价与订单' : entry.category === 'inbound' ? '客户来信' : kind;
        return `<tr><td>${esc(fidInvite(account(c.account)))}</td><td>${esc(entry.by)}</td><td><span class="lc-pill neutral">${esc(label)}</span></td><td>${esc(account(c.account)?.name || '—')}</td><td><button class="fid-link" data-action="profile" ${fidActionID(c.id)}>${esc(c.name)}</button></td><td>${esc(c.phone)}</td><td>${esc(fidDate(at))}</td><td style="text-align:left">${esc(entry.text)}</td></tr>`;
      }).join('');
      return `<section class="fid-page"><div class="lc-wrap">
        ${fidHead('跟进与防漏中心', '完整留存每一次跟进完成结果、阶段流转、报价成单与资料修改记录。')}
        ${headerTabs}
        <div class="fid-panel fid-log">
          <form class="fid-filter-row fid-log-filter" id="fid-log-search-form"><div class="fid-range">${icon('Clock3')}<input id="fid-log-start" aria-label="开始时间" placeholder="开始时间" value="${esc(f.start)}" data-fid-date><span>~</span><input id="fid-log-end" aria-label="截止时间" placeholder="截止时间" value="${esc(f.end)}" data-fid-date></div><select class="fid-select" id="fid-log-app" aria-label="选择APP">${fidOption([['all', '请选择APP'], ['wa', 'WhatsApp']], f.app)}</select><div class="fid-joined"><select class="fid-select" id="fid-log-field" aria-label="跟进查询字段">${fidOption([['invite', '邀请码'], ['customer', '线索账号'], ['text', '内容'], ['actor', '操作人']], f.field)}</select><input class="fid-input" id="fid-log-query" aria-label="搜索跟进记录" placeholder="请输入线索账号或内容" value="${esc(f.query)}"></div><button class="fid-btn blue" type="submit">${icon('Search')}搜索</button>${fidButton('重选', 'fidLogReset', 'RotateCw')}</form>
          <div style="margin-top:14px">${fidTable('fid-log-table', ['邀请码', '操作人', '操作类型', '主账号', '线索账号信息', '线索账号', '创建日期', '内容'], body)}${fidPager(rows.length, 'followups')}</div>
        </div>
      </div></section>`;
    }

    // Default: 'todo' actionable queue
    const filterKey = ui.taskFilter || 'pending';
    const list = (filterKey === 'done' ? done : filterKey === 'overdue' ? overdue : filterKey === 'today' ? today : pending)
      .slice().sort((a, b) => new Date(a.due) - new Date(b.due));
    const taskRows = paged(list, 'followups').map(t => {
      const c = customer(t.customer);
      if (!c) return '';
      const isOverdue = !t.done && beforeToday(t.due);
      return `<tr>
        <td style="text-align:left"><button type="button" class="fid-link" data-action="profile" ${fidActionID(c.id)}><strong>${esc(c.name)}</strong></button><span class="fid-cell-detail">${esc(account(c.account)?.name || '')} · ${esc(c.language)}</span></td>
        <td>${lcStageBadge(c.stage, c.id)}</td>
        <td><span class="lc-pill info">${esc(t.taskType || '需求跟进')}</span></td>
        <td style="text-align:left"><span class="task-title ${t.done ? 'completed' : ''}"><strong>${esc(t.title)}</strong></span>${t.outcome ? `<span class="fid-cell-detail">结果：${esc(t.outcome)}</span>` : ''}</td>
        <td><span class="${isOverdue ? 'overdue' : ''}" style="font-weight:${isOverdue ? '700' : '400'}">${esc(dateLabel(t.due))}${isOverdue ? ' · 已逾期' : ''}</span></td>
        <td>${t.priority === 'high' ? '<span class="priority-badge">重点</span>' : '普通'}</td>
        <td><div class="fid-icon-actions">
          ${t.done
            ? fidButton('重开', 'taskDone', 'RotateCcw', 'slim', fidActionID(t.id))
            : fidButton('完成并衔接下一步', 'taskDone', 'CheckCircle2', 'slim blue', fidActionID(t.id))}
          ${fidIcon('打开会话', 'openConversation', 'MessageCircle', c.id)}
          ${fidIcon('360° 档案', 'profile', 'ContactRound', c.id)}
        </div></td>
      </tr>`;
    }).join('');

    return `<section class="fid-page"><div class="lc-wrap">
      ${fidHead('跟进与防漏中心', '完成跟进时同步记录沟通结果并排定下一次触达，确保客户在全生命周期内不断线。')}
      ${headerTabs}
      <div class="fid-panel">
        <div class="lc-radar-chips" style="margin-bottom:14px">
          ${[
            ['pending', '全部待处理', pending.length, ''],
            ['overdue', '已逾期必处理', overdue.length, overdue.length ? 'is-hot' : ''],
            ['today', '今日到期', today.length, ''],
            ['done', '已完成归档', done.length, ''],
          ].map(([id, label, n, cls]) =>
            `<button type="button" class="lc-radar-chip ${cls}" data-action="taskFilter" ${fidActionID(id)} aria-pressed="${filterKey === id}">${esc(label)}<b>${n}</b></button>`
          ).join('')}
        </div>
        ${fidTable('lc-todo-table', ['客户 / 接待号', '当前生命周期', '任务类型', '跟进事项与结果', '计划跟进时间', '优先级', '闭环操作'], taskRows, '当前筛选下没有跟进任务', true, 'CalendarCheck')}
        ${fidPager(list.length, 'followups')}
      </div>
    </div></section>`;
  };

  // ============================================================================
  // Page 4: Upgraded #customers (原站筛选兼容 + 生命周期阶段与防漏健康度穿透)
  // ============================================================================
  const lcOrigFilteredCustomers = filteredCustomers;
  filteredCustomers = function() {
    return lcOrigFilteredCustomers().filter(c => {
      if (lcState.customerHealthFilter === 'all') return true;
      const h = lcHealth(c);
      if (lcState.customerHealthFilter === 'overdue') return h.overdue;
      if (lcState.customerHealthFilter === 'noplan') return h.noPlan;
      if (lcState.customerHealthFilter === 'quote') return h.quoteOpen;
      if (lcState.customerHealthFilter === 'repurchase') return h.repurchaseSoon;
      return true;
    });
  };

  customerRows = function() {
    const rows = paged(filteredCustomers(), 'customers');
    const tags = myTags();
    return rows.map((c, i) => {
      const a = account(c.account);
      const h = lcHealth(c);
      const ltv = lcCustomerLtv(c.id);
      const oq = lcOpenQuotesValue(c.id);
      const assigned = tags.filter(t => c.tags.includes(t.id));
      const first = assigned[0];
      const tagPreview = first ? `<span class="tag ${esc(first.color)}">${esc(first.name)}</span>` : '<span>0 个</span>';
      const tagDetail = assigned.length > 1 ? `<small>+${assigned.length - 1}</small>` : icon('ChevronRight');
      const valueText = ltv > 0 ? `LTV ${lcMoney(ltv)}` : oq > 0 ? `报价 ${lcMoney(oq)}` : (c.intentLevel || '—');
      return `<tr>
        <td><input type="checkbox" data-select-customer="${esc(c.id)}" aria-label="选择${esc(c.name)}" ${ui.selected.has(c.id) ? 'checked' : ''}></td>
        <td>${rowNumber('customers', i)}</td>
        <td>${esc(a?.name || '—')}<span class="fid-cell-detail">${esc(member(c.owner)?.name || '未分配')}</span></td>
        <td><button class="fid-link fid-note-link" data-action="profileNote" ${fidActionID(c.id)} title="${esc(c.notes || '')}" aria-label="查看${esc(c.name)}备注"><span class="fid-cell-note">${esc(c.qualification?.demand || c.notes || '—')}</span></button></td>
        <td><button class="fid-link" data-action="profile" ${fidActionID(c.id)} aria-label="查看${esc(c.name)}资料"><strong>${esc(c.name)}</strong></button><span class="fid-cell-detail">${esc(c.source)}</span></td>
        <td><button type="button" class="fid-link fid-tag-cell" data-action="fidViewCustomerTags" ${fidActionID(c.id)} aria-label="查看${esc(c.name)}的标签，共 ${assigned.length} 个">${tagPreview}${tagDetail}</button></td>
        <td>${esc(c.phone)}<span class="fid-cell-detail">${esc(country(c))} · ${esc(c.language)}</span></td>
        <td>${lcStageBadge(c.stage, c.id)}<span class="fid-cell-detail">${esc(valueText)}</span></td>
        <td><span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span><span class="fid-cell-detail">${h.nextTask ? esc(dateLabel(h.nextTask.due)) : '无待办'}</span></td>
        <td>${esc(fidDate(c.createdAt))}</td>
        <td>${esc(fidDate(c.updatedAt))}</td>
        <td><div class="fid-icon-actions">${fidIcon('打开' + c.name + '会话', 'openConversation', 'MessageCircle', c.id)}${fidIcon('360° 客户档案：' + c.name, 'profile', 'ContactRound', c.id)}${fidIcon('推进阶段：' + c.name, 'lcAdvance', 'GitBranch', c.id)}</div></td>
      </tr>`;
    }).join('');
  };

  renderCustomers = function() {
    const list = filteredCustomers();
    const marked = fid.customerTags.map(tag).filter(Boolean);
    const selected = ui.selected.size;
    const filters = `<form class="fid-customer-filter fid-rounded" id="fid-customer-search-form">
      <div class="fid-customer-platform"><span>平台:</span>${fidButton(fid.customerPlatform ? '全选(1)' : '全选(0)', 'fidCustomerPlatform', 'Check', 'fid-platform', `aria-pressed="${fid.customerPlatform}"`)}<span class="sr-only">WhatsApp</span></div>
      <div class="fid-filter-row fid-customer-fields">
        <input class="fid-input" id="fid-customer-start" aria-label="开始时间" placeholder="开始时间" value="${esc(fid.customerStart)}" data-fid-date><span> - </span>
        <input class="fid-input" id="fid-customer-end" aria-label="截止时间" placeholder="截止时间" value="${esc(fid.customerEnd)}" data-fid-date>
        <select class="fid-select" id="fid-customer-field" aria-label="客户查询字段">${fidOption([['name', '联系人'], ['phone', '手机号'], ['account', '主账号'], ['note', '备注'], ['source', '来源']], fid.customerField)}</select>
        <input class="fid-input" id="customer-search" aria-label="搜索客户库" placeholder="请输入" value="${esc(ui.customerQuery)}">
        <select class="fid-select" id="fid-customer-stage-select" aria-label="生命周期阶段">${option('all', '全部生命周期', ui.customerStage)}${lcPipelines().map(p => `<optgroup label="${esc(p.name)}">${lcStages(p).map(s => option(s.id, `${p.name} · ${s.code} · ${s.name}`, ui.customerStage)).join('')}</optgroup>`).join('')}</select>
        <select class="fid-select" id="fid-customer-health-select" aria-label="防漏状态">${fidOption([['all', '全部跟进状态'], ['overdue', '跟进已逾期'], ['noplan', '跟进断档(无待办)'], ['quote', '报价待确认'], ['repurchase', '复购窗口临近']], lcState.customerHealthFilter)}</select>
        <select class="fid-select" id="fid-customer-country" aria-label="国家">${fidOption([['all', '请选择国家'], ['US', '美国'], ['PR', '波多黎各'], ['OTHER', '其他地区']], fid.customerCountry)}</select>
        <select class="fid-select" id="fid-customer-type" aria-label="客户类型">${fidOption([['all', '请选择客户类型'], '新增线索-实时', '新增线索-补录', '重复线索'], fid.customerType)}</select>
      </div>
      <div class="fid-actions fid-filter-submit"><button class="fid-btn gradient" type="submit">${icon('Search')}搜索</button>${fidButton('重置', 'fidCustomerReset', 'RotateCw')}</div>
      <div class="fid-actions fid-tag-filter"><span>标签查询</span><span class="fid-small-note" aria-live="polite">${marked.length ? marked.map(t => esc(t.name)).join('、') : '未选'}</span>${fidButton('选择标签', 'fidCustomerChooseTags', 'Tag')}${fidButton('重置标签', 'fidCustomerClearFilter', 'X')}</div>
    </form>`;
    const toolbar = `<div class="fid-actions fid-list-toolbar">${fidButton('全周期看板', '', 'Kanban', 'tint', 'data-nav="lifecycle"')}${fidButton('批量打标签', 'batchTags', 'Tag', 'gradient', selected ? '' : 'disabled')}${fidButton('清空标签', 'fidClearCustomerTags', 'Eraser', '', selected ? '' : 'disabled')}${fidButton('跟进与防漏', '', 'ClipboardList', 'green', 'data-nav="followups"')}${fidButton('导出列表', 'fidExportCustomers', 'FileDown')}${fidButton('新增客户', 'addCustomer', 'Plus', 'slim')}<span class="fid-small-note">点击阶段胶囊可直接推进生命周期</span></div>`;
    const header = ['<input type="checkbox" id="select-all-customers" aria-label="选择当前结果全部客户">', '序号', '主账号信息', '需求画像 / 备注', '联系人 / 来源', '标签', '手机号 / 地区', '生命周期 / 价值', '防漏状态 / 下次跟进', '添加时间', '更新时间', '操作 ' + icon('Settings2')];
    const table = fidTable('fid-customer-table', header, customerRows(), '暂无匹配客户', true).replace('<tbody>', '<tbody id="customer-rows">');
    return `<section class="fid-page"><h1 class="sr-only">客户列表</h1>${filters}${toolbar}<div class="fid-batchbar" id="batchbar" hidden><span id="selected-count">${selected}</span></div><div class="fid-table-card">${table}${fidPager(list.length, 'customers', [10, 20, 50])}</div></section>`;
  };

  fidForms['fid-customer-search-form'] = () => {
    Object.assign(fid, {
      customerField: $('#fid-customer-field').value,
      customerCountry: $('#fid-customer-country').value,
      customerType: $('#fid-customer-type').value,
      customerStart: $('#fid-customer-start').value,
      customerEnd: $('#fid-customer-end').value,
    });
    ui.customerStage = $('#fid-customer-stage-select')?.value || 'all';
    lcState.customerHealthFilter = $('#fid-customer-health-select')?.value || 'all';
    ui.customerQuery = $('#customer-search').value;
    ui.customerTag = 'all';
    ui.selected.clear();
    ui.pages.customers = 0;
    render();
  };

  const lcOrigResetCustomerFilters = fidActions.fidCustomerReset;
  fidActions.fidCustomerReset = () => {
    lcState.customerHealthFilter = 'all';
    lcOrigResetCustomerFilters();
  };

  // ============================================================================
  // Page 5: Upgraded #dashboard (经营概览 + 7阶段全周期闭环轨道)
  // ============================================================================
  const lcBaseRenderDashboard = renderDashboard;
  renderDashboard = function() {
    const html = lcBaseRenderDashboard();
    const customers = myCustomers();
    const openQuoteTotal = customers.reduce((s, c) => s + lcOpenQuotesValue(c.id), 0);
    const totalLtv = customers.reduce((s, c) => s + lcCustomerLtv(c.id), 0);
    const overdueCount = customers.filter(c => lcHealth(c).overdue).length;
    const gapCount = customers.filter(c => lcHealth(c).noPlan).length;
    const repCount = customers.filter(c => lcHealth(c).repurchaseSoon).length;
    const reactivateCount = customers.filter(c => lcHealth(c).inboundReactivate).length;

    const tracks = lcPipelines().map(p => {
      const stages = lcStages(p);
      const nodes = stages.map(st => {
        const count = customers.filter(c => c.stage === st.id).length;
        return `<button type="button" class="dash-lc-node" data-action="lcJumpStage" ${fidActionID(st.id)}>
          <span>${esc(st.code)} · ${esc(st.name)}</span>
          <strong>${count}</strong>
          <small>${esc(LC_CATEGORIES[st.category]?.label || '')}</small>
        </button>`;
      }).join('');
      const total = customers.filter(c => c.pipelineId === p.id).length;
      return `<div class="dash-lc-pipeline"><div class="dash-lc-pipeline-name">${icon('GitBranch')}${esc(p.name)}<b>${total}</b></div><div class="dash-lc-track" style="--lc-cols:${stages.length}">${nodes}</div></div>`;
    }).join('');

    const lcPanel = `<section class="dash-lc-panel" aria-label="客户全生命周期总览">
      <div class="dash-lc-head">
        <h2>${icon('Kanban')}客户全生命周期闭环漏斗</h2>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <span style="font-size:12px;color:var(--color-text-muted)">在途报价：<b>${lcMoney(openQuoteTotal)}</b> · 累计成交 LTV：<b>${lcMoney(totalLtv)}</b></span>
          <a class="dash-link" href="#lifecycle" data-nav="lifecycle">进入全周期看板${icon('ChevronRight')}</a>
        </div>
      </div>
      ${tracks}
      <div class="dash-lc-alerts">
        <span style="font-size:12px;color:var(--color-text-muted);font-weight:600">防漏雷达快达：</span>
        <button type="button" class="lc-radar-chip ${overdueCount ? 'is-hot' : ''}" data-action="lcJumpRadar" data-id="overdue">${icon('ClockAlert')}逾期未跟进 <b>${overdueCount}</b></button>
        <button type="button" class="lc-radar-chip ${gapCount ? 'is-alert' : ''}" data-action="lcJumpRadar" data-id="noplan">${icon('TriangleAlert')}跟进断档 <b>${gapCount}</b></button>
        <button type="button" class="lc-radar-chip" data-action="lcJumpRadar" data-id="quote">${icon('FileSpreadsheet')}在途报价催单 <b>${customers.filter(c => lcHealth(c).quoteOpen).length}</b></button>
        <button type="button" class="lc-radar-chip" data-action="lcJumpRadar" data-id="repurchase">${icon('Repeat')}复购窗口临近 <b>${repCount}</b></button>
        ${reactivateCount ? `<button type="button" class="lc-radar-chip is-hot" data-action="lcJumpRadar" data-id="reactivate">${icon('Flame')}老客来信待激活 <b>${reactivateCount}</b></button>` : ''}
      </div>
    </section>`;

    return html.replace('<div class="dash-grid">', lcPanel + '<div class="dash-grid">');
  };

  // ============================================================================
  // Page 6: Upgraded #inbox (WhatsApp 在线聊天与全生命周期实时联动)
  // ============================================================================
  conversationRows = function() {
    return filteredConversations().map(c => {
      const a = account(c.account);
      const h = lcHealth(c);
      const selected = fid.chatOpen && c.id === ui.customer ? 'selected' : '';
      return `<button type="button" class="conversation ${selected}" aria-label="打开${esc(c.name)}的会话" data-action="openConversation" data-id="${esc(c.id)}">
        ${avatar(c)}
        <span class="conversation-main">
          <span class="conversation-line"><strong>${esc(c.name)}</strong><time>${esc(c.last)}</time></span>
          <span class="conversation-preview"><span>${esc(c.preview)}</span>${c.unread ? `<span class="unread">${c.unread}</span>` : ''}</span>
          <span class="conversation-account">
            <span><span class="state-dot ${a?.state === 'online' ? '' : a?.state === 'pending' ? 'offline' : 'warning'}"></span>${esc(ui.account === 'all' ? a?.name : c.language)}</span>
            <span class="mini-stage" title="生命周期阶段：${esc(lcCustomerPipeline(c).name)} · ${esc(lcStageName(c.stage))}">${esc(lcStageName(c.stage))}${h.overdue || h.noPlan || h.inboundReactivate ? ' · !' : ''}</span>
          </span>
        </span>
      </button>`;
    }).join('') || empty('没有匹配会话', '切换筛选，或清空搜索后再试。');
  };

  const lcPrevChatHTML = chatHTML;
  chatHTML = function(c) {
    let html = lcPrevChatHTML(c);
    const h = lcHealth(c);
    const ltv = lcCustomerLtv(c.id);
    const oq = lcOpenQuotesValue(c.id);
    const strip = `<div class="lc-chat-strip" aria-label="客户全周期协同栏">
      ${lcStageBadge(c.stage, c.id)}
      <span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span>
      ${oq > 0 ? `<button type="button" class="lc-pill info" style="border:0" data-action="profile" ${fidActionID(c.id)} data-tab="deals">${icon('FileSpreadsheet')}在途报价 ${lcMoney(oq)}</button>` : ''}
      ${ltv > 0 ? `<button type="button" class="lc-pill ok" style="border:0" data-action="profile" ${fidActionID(c.id)} data-tab="deals">${icon('DollarSign')}累计成交 ${lcMoney(ltv)}</button>` : ''}
      <div class="lc-chat-strip-right">
        ${lcIsRecovery(c.stage)
          ? fidButton('一键重激活', 'lcAdvance', 'RotateCcw', 'slim blue', `${fidActionID(c.id)} data-target="${esc(lcReactivateTarget(c))}"`)
          : fidButton('推进阶段', 'lcAdvance', 'ArrowRight', 'slim tint', fidActionID(c.id))}
        ${fidButton('模拟对方回复', 'lcSimReply', 'MessageSquareReply', 'slim', fidActionID(c.id))}
        ${fidButton('360° 档案', 'profile', 'ContactRound', 'slim', fidActionID(c.id))}
      </div>
    </div>`;
    return html.replace('<div class="source-strip">', strip + '<div class="source-strip">');
  };

  toolsRailHTML = function(c) {
    const t = (label, action, glyph, needs = false, extra = '') =>
      `<button type="button" class="icon-button" data-action="${action}" ${fidActionID(c?.id || '')} ${extra} aria-label="${label}" ${needs && !c ? 'disabled' : ''}>${icon(glyph)}</button>`;
    return `<aside class="tool-rail" aria-label="会话工具">
      ${t('会话筛选', 'fidChatFilters', 'Filter')}
      ${t('客户 360° 全周期档案', 'profile', 'ContactRound', true)}
      ${t('推进生命周期阶段', 'lcAdvance', 'GitBranch', true)}
      ${t('报价与成交订单', 'profile', 'Receipt', true, 'data-tab="deals"')}
      ${t('安排客户跟进', 'followup', 'CalendarPlus', true)}
      ${t('客户标签', 'assignTags', 'Tags', true)}
      ${t('客户沟通备注', 'profileNote', 'StickyNote', true)}
      ${t('翻译设置', 'translation', 'Languages')}
      <span class="tool-separator"></span>
      ${t('刷新视图', 'refreshUI', 'RefreshCw')}
      ${t('权限说明', 'fidChatPermissions', 'ShieldCheck')}
    </aside>`;
  };

  // ============================================================================
  // Modals: Follow-up Scheduling, Closed-Loop Task Completion, Quotes, Orders & Sim
  // ============================================================================
  openFollowup = function(id = null) {
    const list = myCustomers();
    const c = id ? customer(id) : selectedCustomer();
    if (!list.length) return toast('请先新增客户。');
    const meta = lcStageMeta(c?.stage);
    fidForm(
      '安排客户下一步跟进',
      'lc-followup',
      `${fidFormRow('目标客户', `<select class="fid-select" style="width:100%" name="customer">${list.map(x => option(x.id, `${x.name}（${lcStageName(x.stage)} · ${account(x.account)?.name || ''}）`, c?.id)).join('')}</select>`, '', true)}
       ${fidFormRow('任务类型', `<select class="fid-select" style="width:100%" name="taskType">${LC_TASK_TYPES.map(k => option(k, k, meta.taskType || '需求跟进')).join('')}</select>`)}
       ${fidFormRow('跟进事项', `<input class="fid-input" style="width:100%" name="title" required maxlength="100" value="${esc(meta.defaultTask)}" placeholder="写清本次跟进要达成的具体目标">`, '', true)}
       ${fidFormRow('提醒时间', `<input class="fid-input" style="width:100%" type="datetime-local" id="lc-due-input" name="due" required value="${inputDate(new Date(Date.now() + (Number(meta.defaultHours) || 24) * 3600000).toISOString())}">
         <div class="lc-quick-dates">
           <button type="button" data-action="lcQuickDue" data-id="2">2小时后</button>
           <button type="button" data-action="lcQuickDue" data-id="24">明天此时</button>
           <button type="button" data-action="lcQuickDue" data-id="72">3天后</button>
           <button type="button" data-action="lcQuickDue" data-id="168">7天后</button>
           <button type="button" data-action="lcQuickDue" data-id="600">25天复购期</button>
         </div>`, 'lc-due-input', true)}
       ${fidFormRow('优先级', `<select class="fid-select" style="width:100%" name="priority">${fidOption([['normal', '普通'], ['high', '重点优先']], 'normal')}</select>`)}`,
      '保存跟进计划',
      { wide: true }
    );
  };

  function openTaskCompleteModal(taskId) {
    const t = data.tasks.find(x => x.id === taskId);
    if (!t || (!manager() && t.owner !== ui.persona)) return;
    const c = customer(t.customer);
    if (!c) return;
    if (t.done) {
      t.done = false;
      c.followup = lcNextTask(c.id)?.due || t.due;
      lcLog(c.id, 'followup', `重新打开跟进待办：${t.title}`);
      persist();
      render();
      lcRefreshOpenDossier(c.id);
      toast('已重新打开该条跟进待办。');
      return;
    }
    const meta = lcStageMeta(c.stage);
    const nextMeta = lcStageLookup(meta.next) ? lcStageMeta(meta.next) : meta;
    fidForm(
      `完成跟进闭环 · ${c.name}`,
      'lc-complete-task',
      `<input type="hidden" name="taskId" value="${esc(t.id)}">
       <div class="lc-card-block" style="margin-bottom:14px;background:var(--color-surface-alt)">
         <strong style="font-size:13px">已完成事项：${esc(t.title)}</strong>
         <small style="display:block;margin-top:3px;color:var(--color-text-muted)">当前阶段：${esc(meta.pipelineName)} · ${esc(meta.name)} · 完成后请记录结果并衔接下一步动作，防止线索断档。</small>
       </div>
       ${fidFormRow('跟进结果', `<select class="fid-select" style="width:100%" name="outcome" required>
         ${fidOption(['客户已积极回复推进', '已发送资料/方案待看', '客户暂未回复需顺延追访', '客户提出价格/时效异议', '客户确认意向请求报价', '已确认下单成交', '明确无需求/暂缓归档'], '客户已积极回复推进')}
       </select>`, '', true)}
       ${fidFormRow('结果纪要', `<input class="fid-input" style="width:100%" name="outcomeNote" placeholder="选填：补充客户反馈细节，将自动写入 360° 轨迹">`)}
       ${fidFormRow('阶段联动', `<select class="fid-select" style="width:100%" name="nextStage" id="lc-complete-stage">
         ${option(c.stage, `保持当前阶段（${meta.name}）`, c.stage)}
         ${lcStages(lcCustomerPipeline(c)).filter(s => s.id !== c.stage).map(s => option(s.id, `同步推进至 → ${s.code} · ${s.name}`, '')).join('')}
       </select>`)}
       <div class="lc-card-block" style="background:var(--color-surface-alt)">
         <label style="display:flex;align-items:center;gap:6px;font-weight:650;font-size:12px;margin-bottom:8px">
           <input type="checkbox" name="scheduleNext" value="1" checked> 立即衔接下一次跟进提醒（防漏闭环推荐）
         </label>
         <div class="lc-qual-grid">
           <label class="lc-field full"><span>下次跟进事项</span><input class="fid-input" name="nextTitle" value="${esc(nextMeta.defaultTask)}"></label>
           <label class="lc-field"><span>下次提醒时间</span><input class="fid-input" type="datetime-local" id="lc-due-input" name="nextDue" value="${inputDate(new Date(Date.now() + 48 * 3600000).toISOString())}"></label>
           <label class="lc-field"><span>优先级</span><select class="fid-select" name="nextPriority">${fidOption([['normal', '普通'], ['high', '重点优先']], 'normal')}</select></label>
         </div>
       </div>`,
      '确认完成并闭环',
      { wide: true }
    );
  }

  function openQuoteModal(cid = '') {
    const list = myCustomers();
    const c = customer(cid) || selectedCustomer() || list[0];
    if (!c) return toast('请先添加客户。');
    fidForm(
      '新建客户报价单',
      'lc-quote',
      `${fidFormRow('选择客户', `<select class="fid-select" style="width:100%" name="customerId">${list.map(x => option(x.id, `${x.name}（${lcStageName(x.stage)}）`, c.id)).join('')}</select>`, '', true)}
       ${fidFormRow('报价金额', `<input class="fid-input" style="width:100%" type="number" min="1" step="1" name="amount" placeholder="USD 金额，如 1850" required>`, '', true)}
       ${fidFormRow('方案摘要', `<input class="fid-input" style="width:100%" name="summary" value="${esc(c.qualification?.demand || '')}" placeholder="如：常规规格组合 + 特快专递含税价" required>`, '', true)}
       ${fidFormRow('有效天数', `<select class="fid-select" style="width:100%" name="validDays">${fidOption([['3', '3 天'], ['5', '5 天'], ['7', '7 天'], ['15', '15 天']], '5')}</select>`)}
       ${fidFormRow('异议备注', `<input class="fid-input" style="width:100%" name="objectionNote" placeholder="选填：记录客户对价格或运费的关注点">`)}
       <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-left:92px">
         <input type="checkbox" name="autoFollow" value="1" checked> 自动推进至客户所属流程的报价阶段（当前客户：「${esc(lcStageName(lcRoleStage(lcCustomerPipeline(c), 'quoting')) )}」）并生成 24h 催单跟进待办
       </label>`,
      '保存报价单',
      { wide: true }
    );
  }

  function openOrderModal(cid = '', fromQuote = null) {
    const list = myCustomers();
    const c = customer(fromQuote?.customerId || cid) || selectedCustomer() || list[0];
    if (!c) return toast('请先添加客户。');
    const priorOrders = lcCustomerOrders(c.id).length;
    fidForm(
      fromQuote ? `报价转成交订单 · ${fromQuote.quoteNo}` : '登记客户成交订单',
      'lc-order',
      `<input type="hidden" name="quoteId" value="${esc(fromQuote?.id || '')}">
       ${fidFormRow('成交客户', `<select class="fid-select" style="width:100%" name="customerId" ${fromQuote ? 'readonly' : ''}>${list.map(x => option(x.id, `${x.name}（${lcStageName(x.stage)}）`, c.id)).join('')}</select>`, '', true)}
       ${fidFormRow('成交金额', `<input class="fid-input" style="width:100%" type="number" min="1" step="1" name="amount" value="${esc(fromQuote?.amount || '')}" placeholder="USD 实收金额" required>`, '', true)}
       ${fidFormRow('订单类型', `<select class="fid-select" style="width:100%" name="orderType">${fidOption(['首单', '复购'], priorOrders > 0 ? '复购' : '首单')}</select>`)}
       ${fidFormRow('履约状态', `<select class="fid-select" style="width:100%" name="fulfillmentStatus">${fidOption(['待发货', '运输中', '已签收'], '待发货')}</select>`)}
       ${fidFormRow('物流/单号', `<input class="fid-input" style="width:100%" name="carrierNote" value="${esc(fromQuote ? '关联报价 ' + fromQuote.quoteNo : '')}" placeholder="外部订单号、物流承运商或交付备注">`)}
       ${fidFormRow('复购周期', `<select class="fid-select" style="width:100%" name="repurchaseCycleDays">${fidOption([['15', '15 天'], ['25', '25 天'], ['30', '30 天'], ['45', '45 天']], String(c.repurchaseCycleDays || 30))}</select>`)}`,
      '确认登记成交',
      { wide: true }
    );
  }

  function openOrderStepModal(orderId) {
    const ord = (data.orders || []).find(o => o.id === orderId);
    if (!ord) return;
    const c = customer(ord.customerId);
    if (!c) return;
    const nextStatus = ord.fulfillmentStatus === '待发货' ? '运输中' : '已签收';
    const nurture = lcRoleStage(lcCustomerPipeline(c), 'nurture');
    fidForm(
      nextStatus === '运输中' ? `标记订单发货 · ${ord.orderNo}` : nurture ? `确认客户签收并转入「${lcStageName(nurture)}」 · ${ord.orderNo}` : `确认客户签收 · ${ord.orderNo}`,
      'lc-order-step',
      `<input type="hidden" name="orderId" value="${esc(ord.id)}">
       <input type="hidden" name="nextStatus" value="${esc(nextStatus)}">
       <div class="lc-transition-banner">
         <span class="lc-pill warn">${esc(ord.fulfillmentStatus)}</span>
         ${icon('ArrowRight')}
         <span class="lc-pill ok">${esc(nextStatus)}</span>
       </div>
       ${fidFormRow('物流说明', `<input class="fid-input" style="width:100%" name="carrierNote" value="${esc(ord.carrierNote || '')}" placeholder="${nextStatus === '运输中' ? '输入承运商与追踪单号（如 USPS 9405...）' : '记录签收情况与客户初步反馈'}" required>`, '', true)}
       ${nextStatus === '已签收'
         ? `${fidFormRow('复购周期', `<select class="fid-select" style="width:100%" name="repurchaseCycleDays">${fidOption([['15', '15 天后进入复购窗口'], ['25', '25 天后进入复购窗口'], ['30', '30 天后进入复购窗口'], ['45', '45 天后进入复购窗口']], String(c.repurchaseCycleDays || 30))}</select>`)}
            <p class="fid-field-help">${nurture ? `确认签收后，客户将自动转入「${esc(lcStageName(nurture))}」，并生成复购窗口关怀待办。` : '当前流程未设置「签收复购落点」，签收后客户阶段保持不变，仍会生成复购关怀待办。'}</p>`
         : ''}
       <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-top:8px">
         <input type="checkbox" name="openChatDraft" value="1" checked> 同步生成对应语种（${esc(c.language)}）WhatsApp 通知草稿并打开聊天窗
       </label>`,
      nextStatus === '运输中' ? '确认发货' : '确认签收并开启复购周期',
      { wide: true }
    );
  }

  function openSimLeadModal() {
    const accounts = myAccounts();
    if (!accounts.length) return toast('请先在号码管理绑定至少一个 WhatsApp 号码。');
    fidForm(
      '模拟新客户加微进线',
      'lc-sim-lead',
      `<p class="fid-field-help" style="margin-bottom:12px">模拟一位潜在客户从广告或转介绍添加你的 WhatsApp 号码并发来首条咨询，自动进入所选流程的进线阶段并立首响破冰待办。</p>
       ${fidFormRow('进入流程', `<select class="fid-select" style="width:100%" name="pipelineId">${lcPipelines().map(p => option(p.id, `${p.name}（进线阶段：${lcStageName(lcIntakeStage(p))}）`, lcBoardPipeline().id)).join('')}</select>`)}
       ${fidFormRow('进线号码', `<select class="fid-select" style="width:100%" name="accountId">${accounts.map(a => option(a.id, `${a.name} (${a.number})`, accounts[0].id)).join('')}</select>`)}
       ${fidFormRow('客户称呼', `<input class="fid-input" style="width:100%" name="name" value=" Jordan Brooks" required>`, '', true)}
       ${fidFormRow('客户语言', `<select class="fid-select" style="width:100%" name="language">${fidOption(['英语', '西班牙语'], '英语')}</select>`)}
       ${fidFormRow('来源归因', `<select class="fid-select" style="width:100%" name="source">${fidOption(['Facebook 广告', 'Instagram 广告', '客户转介绍', '网站咨询'], 'Facebook 广告')}</select>`)}
       ${fidFormRow('广告系列', `<input class="fid-input" style="width:100%" name="campaign" value="US · 咨询直连广告 E" placeholder="选填广告系列名称">`)}`,
      '生成进线会话并查看',
      { wide: true }
    );
  }

  function lcFillSmartDraft(customerId, kind = 'quote') {
    const c = customer(customerId);
    if (!c) return;
    const isEs = c.language === '西班牙语';
    const q = lcCustomerQuotes(c.id)[0];
    const o = lcCustomerOrders(c.id)[0];
    let zh = '', target = '';
    if (kind === 'quote') {
      zh = `你好 ${c.name}，跟进一下之前发给你的报价方案${q ? ' ' + q.quoteNo + ' ($' + q.amount + ')' : ''}，请问对规格或交付时效还有需要调整的地方吗？`;
      target = isEs
        ? `Hola ${c.name}, quería dar seguimiento a la cotización${q ? ' ' + q.quoteNo + ' ($' + q.amount + ')' : ''}. ¿Tienes alguna duda sobre los detalles o el tiempo de envío?`
        : `Hi ${c.name}, just following up on the quote${q ? ' ' + q.quoteNo + ' ($' + q.amount + ')' : ''} I shared. Let me know if you have any questions on specs or delivery timing!`;
    } else if (kind === 'order') {
      zh = `你好 ${c.name}，同步一下你的订单${o ? ' ' + o.orderNo : ''}最新进度：${o?.carrierNote || '已安排优先派送'}，收到包裹后请随时告诉我！`;
      target = isEs
        ? `Hola ${c.name}, te comparto la actualización de tu pedido${o ? ' ' + o.orderNo : ''}: ${o?.carrierNote || 'en tránsito prioritario'}. ¡Avísame cuando lo recibas!`
        : `Hi ${c.name}, quick update on your order${o ? ' ' + o.orderNo : ''}: ${o?.carrierNote || 'shipped via priority carrier'}. Please let me know once it arrives safely!`;
    } else {
      zh = `你好 ${c.name}，距离上次交付已经一段时间了，想问问之前批次使用体验如何？近期是否需要为你预留新一轮补货排期？`;
      target = isEs
        ? `Hola ${c.name}, ¿cómo te ha ido con el pedido anterior? Quería saber si necesitas programar reposición para esta semana.`
        : `Hi ${c.name}, hope everything went great with your previous order! Just checking in to see if you’d like to line up your next restock batch this week.`;
    }
    ui.drafts[c.id] = { text: zh, translated: target, source: zh };
    ui.customer = c.id;
    ui.account = 'all';
    fid.waTab = 'chat';
    fid.chatOpen = true;
    ui.mobileChat = true;
    if ($('#dialog').open) close();
    persist();
    navigate('inbox');
    toast(`已根据「${c.language}」生成沟通草稿，核对后可一键发送。`);
  }

  function lcSimulateCustomerReply(customerId) {
    const c = customer(customerId);
    if (!c) return;
    const isEs = c.language === '西班牙语';
    const inRecovery = lcIsRecovery(c.stage);
    const pair = inRecovery
      ? (isEs
          ? ['Hola, retomamos las compras esta semana. ¿Podemos revisar la cotización actualizada?', '你好，我们这周恢复采购计划了，可以重新核对一下最新报价吗？']
          : ['Hi! Our budget is ready now—could we revisit the quote and check current lead time?', '你好！我们的采购预算已经批下来了，可以重新确认一下报价和当前发货时效吗？'])
      : lcStageMeta(c.stage).capture === 'quote'
        ? (isEs
            ? ['El precio nos parece bien. ¿Aceptan pago hoy para enviarlo mañana?', '价格我们觉得合适。今天付款的话明天能安排发出吗？']
            : ['The quote looks good to us! If we confirm today, how soon can it ship out?', '这份报价我们认可！如果今天确认付款，最快多久能发出？'])
        : (isEs
            ? ['Gracias por responder rápido, me interesa ver las opciones disponibles.', '谢谢你的快速回复，我想看看目前可选的规格方案。']
            : ['Thanks for the quick response! Could you share the recommended starter option?', '谢谢快速回复！可以推荐一下适合首批采购的方案吗？']);

    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    (data.messages[c.id] ??= []).push({ id: nextId('m'), side: 'in', text: pair[0], translated: pair[1], time });
    c.preview = pair[0];
    c.translation = pair[1];
    c.last = '刚刚';
    c.unread = (Number(c.unread) || 0) + 1;
    lcLog(c.id, 'inbound', inRecovery ? '沉睡/归档老客主动发来新消息（触发复联重激活信号）' : '收到客户最新 WhatsApp 回复消息');
    persist();
    render();
    lcRefreshOpenDossier(c.id);
    toast(inRecovery ? `收到 ${c.name} 复联消息！已点亮「复联待重激活」信号，可一键重激活回流。` : `已模拟收到 ${c.name} 的新回复。`);
  }

  // Override addCustomer so newly created customers enter their pipeline's intake stage with an initial SLA task
  function openLifecycleCustomerForm() {
    const accounts = myAccounts();
    if (!accounts.length) return toast('请先添加账号。');
    fidForm(
      '新增 WhatsApp 客户档案（自动进入流程进线阶段）',
      'lc-new-customer',
      `${fidFormRow('客户称呼', `<input class="fid-input" style="width:100%" name="name" required maxlength="50" placeholder="客户姓名或备注称呼">`, '', true)}
       ${fidFormRow('WhatsApp号', `<input class="fid-input" style="width:100%" name="phone" required placeholder="含国家区号，如 +1 (512) 555-0192">`, '', true)}
       ${fidFormRow('归属接待号', `<select class="fid-select" style="width:100%" name="account">${accounts.map(a => option(a.id, a.name, accounts[0].id)).join('')}</select>`)}
       ${fidFormRow('沟通语言', `<select class="fid-select" style="width:100%" name="language">${fidOption(['英语', '西班牙语', '其他'], '英语')}</select>`)}
       ${fidFormRow('国家地区', `<select class="fid-select" style="width:100%" name="country">${fidOption([['US', '美国'], ['PR', '波多黎各'], ['OTHER', '其他地区']], 'US')}</select>`)}
       ${fidFormRow('来源渠道', `<select class="fid-select" style="width:100%" name="source">${fidOption(['Facebook 广告', 'Instagram 广告', '客户转介绍', '网站咨询', '手动添加'], 'Facebook 广告')}</select>`)}
       ${fidFormRow('所属流程', `<select class="fid-select" style="width:100%" name="pipelineId">${lcPipelines().map(p => option(p.id, p.name, lcBoardPipeline().id)).join('')}</select>`)}
       ${fidFormRow('初步需求', `<input class="fid-input" style="width:100%" name="demand" placeholder="记录客户首句来意或咨询重点">`)}`,
      '创建并纳入全周期管理',
      { wide: true }
    );
  }

  // ============================================================================
  // Register All SCRM Lifecycle Actions & Form Submissions
  // ============================================================================
  Object.assign(fidActions, {
    lcMode: id => { lcState.mode = id === 'table' ? 'table' : 'board'; render(); },
    lcStageFilter: id => { lcState.stageFilter = lcState.stageFilter === id ? 'all' : id; render(); },
    lcRadar: id => { lcState.radar = lcState.radar === id && id !== 'all' ? 'all' : id; render(); },
    lcResetFilters: () => { Object.assign(lcState, { stageFilter: 'all', radar: 'all', account: 'all', query: '' }); render(); },
    lcToggleSop: () => { lcState.sopOpen = !lcState.sopOpen; render(); },
    lcJumpStage: id => {
      const hit = lcStageLookup(id);
      if (hit) lcState.pipeline = hit.pipeline.id;
      lcState.stageFilter = hit ? id : 'all';
      lcState.radar = 'all';
      navigate('lifecycle');
    },
    lcPipeline: id => { lcState.pipeline = id; lcState.stageFilter = 'all'; render(); },
    lcJumpRadar: id => { lcState.stageFilter = 'all'; lcState.radar = id; navigate('lifecycle'); },
    lcAdvance: (id, btn) => openLifecycleAdvance(id, btn?.dataset?.target || ''),
    lcSimLeadOpen: openSimLeadModal,
    lcSimReply: lcSimulateCustomerReply,
    lcDossierTab: (id, btn) => {
      lcState.dossierTab = id;
      const cid = btn?.dataset?.customer || ui.customer;
      lcRefreshOpenDossier(cid);
    },
    lcTimelineFilter: (id, btn) => {
      lcState.timelineFilter = id;
      lcRefreshOpenDossier(btn?.dataset?.customer || ui.customer);
    },
    lcDealsTab: id => { lcState.dealsTab = id; render(); },
    lcFollowTab: id => { lcState.followTab = id; ui.pages.followups = 0; render(); },
    fidTasks: () => { lcState.followTab = 'todo'; ui.taskFilter = 'pending'; ui.pages.followups = 0; navigate('followups'); },
    lcQuoteOpen: id => openQuoteModal(id),
    lcQuoteToOrder: id => {
      const q = (data.quotes || []).find(x => x.id === id);
      if (q) openOrderModal(q.customerId, q);
    },
    lcQuoteExpire: id => {
      const q = (data.quotes || []).find(x => x.id === id);
      if (!q) return;
      q.status = '已失效';
      q.updatedAt = new Date().toISOString();
      lcLog(q.customerId, 'deal', `报价单 ${q.quoteNo}（${lcMoney(q.amount)}）标记为已失效`);
      persist();
      render();
      lcRefreshOpenDossier(q.customerId);
      toast(`已将报价单 ${q.quoteNo} 标记为失效。`);
    },
    lcOrderOpen: id => openOrderModal(id),
    lcOrderStep: id => openOrderStepModal(id),
    lcChatDraft: (id, btn) => lcFillSmartDraft(id, btn?.dataset?.draftKind || 'quote'),
    taskDone: id => openTaskCompleteModal(id),
    followup: id => openFollowup(id),
    newTask: () => openFollowup(),
    addCustomer: openLifecycleCustomerForm,
    profile: (id, btn) => openProfile(id, btn?.dataset?.tab || ''),
    profileNote: id => openProfile(id, 'notes'),
    star: id => {
      const c = customer(id);
      if (!c) return;
      c.star = !c.star;
      persist();
      render();
      lcRefreshOpenDossier(id);
    },
    lcQuickDue: hours => {
      const input = $('#lc-due-input');
      if (input) input.value = inputDate(new Date(Date.now() + Number(hours) * 3600000).toISOString());
    },
  });

  Object.assign(fidForms, {
    'lc-transition-form': (f, v) => {
      const c = customer(v('customerId'));
      const targetStage = v('targetStage');
      const target = lcStageLookup(targetStage);
      if (!c || !target) return error('请选择有效的生命周期阶段。');
      const meta = lcStageMeta(targetStage);
      const prevStage = c.stage;
      const prevName = lcStageName(prevStage);
      const prevPipeline = lcCustomerPipeline(c);
      const wasRecovery = lcIsRecovery(prevStage);
      const reactivating = wasRecovery && lcIsActive(targetStage);

      if (meta.capture === 'qualify') {
        if (!v('demand')) return error('请填写客户核心咨询需求，以便后续精准跟进。');
        c.intentLevel = v('intentLevel') || c.intentLevel;
        c.qualification.demand = v('demand');
        if (v('volume')) c.qualification.volume = v('volume');
      } else if (meta.capture === 'quote') {
        const amt = Number(v('quoteAmount'));
        if (!amt || amt <= 0 || !v('quoteSummary')) return error('请填写有效的报价金额和方案摘要。');
        let openQ = lcCustomerQuotes(c.id).find(q => q.status === '待确认');
        if (openQ) {
          Object.assign(openQ, { amount: amt, summary: v('quoteSummary'), objectionNote: v('objection'), updatedAt: new Date().toISOString() });
        } else {
          openQ = {
            id: nextId('qte'),
            quoteNo: 'QT-' + new Date().toISOString().slice(0, 7).replace('-', '') + '-' + String((data.quotes?.length || 0) + 1).padStart(2, '0'),
            customerId: c.id, accountId: c.account, owner: c.owner,
            amount: amt, currency: 'USD', summary: v('quoteSummary'),
            validUntil: fidDay(5).slice(0, 10), status: '待确认',
            objectionNote: v('objection'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          };
          data.quotes.unshift(openQ);
        }
        if (v('objection')) c.qualification.objection = v('objection');
      } else if (meta.capture === 'order') {
        const amt = Number(v('orderAmount'));
        if (!amt || amt <= 0) return error('请填写有效的成交金额。');
        const openQ = lcCustomerQuotes(c.id).find(q => q.status === '待确认');
        if (openQ) openQ.status = '已转单';
        const fStatus = v('fulfillmentStatus') || '待发货';
        const ord = {
          id: nextId('ord'),
          orderNo: 'ORD-' + new Date().toISOString().slice(0, 7).replace('-', '') + '-' + String(101 + (data.orders?.length || 0)),
          quoteId: openQ?.id || '', customerId: c.id, accountId: c.account, owner: c.owner,
          amount: amt, currency: 'USD', orderType: v('orderType') || '首单',
          paymentStatus: '已收款', fulfillmentStatus: fStatus,
          carrierNote: v('carrierNote') || '待录入物流单号',
          createdAt: new Date().toISOString(),
          deliveredAt: fStatus === '已签收' ? new Date().toISOString() : null,
        };
        data.orders.unshift(ord);
      } else if (meta.capture === 'repurchase') {
        const days = Number(v('repurchaseCycleDays')) || 30;
        c.repurchaseCycleDays = days;
        c.nextRepurchaseAt = fidDay(days);
      } else if (meta.capture === 'lost') {
        if (!v('lostReason') || !v('lostDetail')) return error('请选择流失主因并填写简要说明。');
        c.lostReason = v('lostReason');
        c.lostDetail = v('lostDetail');
        const watch = Number(v('watchDays') || 0);
        c.reactivateWatchAt = watch > 0 ? fidDay(watch) : null;
        // Close obsolete active tasks so lost leads don't pollute daily active queues
        for (const t of data.tasks) {
          if (t.customer === c.id && !t.done) {
            t.done = true;
            t.outcome = '随客户流失归档自动结清';
          }
        }
        c.followup = null;
      }

      c.stage = targetStage;
      c.pipelineId = target.pipeline.id;
      c.stageEnteredAt = new Date().toISOString();
      if (reactivating) {
        c.reactivatedCount = (c.reactivatedCount || 0) + 1;
        c.unread = 0;
      }

      if (meta.capture !== 'lost' && f.get('createNextTask') === '1' && v('nextTaskTitle')) {
        lcCreateTask({
          customerId: c.id,
          title: v('nextTaskTitle'),
          dueIso: v('nextTaskDue') ? new Date(v('nextTaskDue')).toISOString() : fidDay(1),
          priority: v('nextTaskPriority') || 'normal',
          taskType: meta.taskType || '需求跟进',
        });
      }

      const noteExtra = v('transitionNote') || v('dormantReason') || (meta.capture === 'lost' ? `${c.lostReason}（${c.lostDetail}）` : '');
      const crossed = prevPipeline.id !== target.pipeline.id ? `【转入「${target.pipeline.name}」流程】` : '';
      lcLog(
        c.id,
        'stage',
        `${reactivating ? '【重激活回流】' : ''}${crossed}阶段由「${prevName}」变更为「${meta.name}」${noteExtra ? ' · ' + noteExtra : ''}`,
        { fromStage: prevStage, toStage: targetStage }
      );

      persist();
      close();
      render();
      toast(`已将 ${c.name} 更新至「${meta.name}」并完成闭环同步。`);
    },

    'lc-qual-form': (f, v) => {
      const c = customer(v('customerId'));
      if (!c) return;
      c.intentLevel = v('intentLevel') || c.intentLevel;
      Object.assign(c.qualification, {
        demand: v('demand'),
        volume: v('volume'),
        deliveryRegion: v('deliveryRegion'),
        commWindow: v('commWindow'),
        objection: v('objection'),
      });
      lcLog(c.id, 'profile', `更新客户需求画像（意向度：${c.intentLevel}${c.qualification.volume ? ' · 规模：' + c.qualification.volume : ''}）`);
      persist();
      render();
      openProfile(c.id, 'overview');
      toast('客户需求画像已保存并写入轨迹。');
    },

    'lc-followup-form': (f, v) => {
      const c = customer(v('customer'));
      if (!c || !v('title') || !v('due')) return error('请填写完整的客户、事项和计划时间。');
      const due = new Date(v('due'));
      if (Number.isNaN(due.getTime())) return error('请填写有效的跟进时间。');
      lcCreateTask({
        customerId: c.id,
        title: v('title'),
        dueIso: due.toISOString(),
        priority: v('priority') || 'normal',
        taskType: v('taskType') || '需求跟进',
      });
      lcLog(c.id, 'followup', `安排${v('taskType') || '跟进'}待办：${v('title')}（${dateLabel(due.toISOString())}）`);
      persist();
      close();
      render();
      toast('跟进计划已建立，防漏状态已更新。');
    },

    'lc-complete-task-form': (f, v) => {
      const t = data.tasks.find(x => x.id === v('taskId'));
      if (!t) return;
      const c = customer(t.customer);
      if (!c) return;
      t.done = true;
      t.outcome = v('outcome') + (v('outcomeNote') ? ' — ' + v('outcomeNote') : '');
      t.completedAt = new Date().toISOString();
      lcLog(c.id, 'followup', `完成跟进「${t.title}」· 结果：${t.outcome}`);

      const nextStage = v('nextStage');
      const nextHit = nextStage && nextStage !== c.stage ? lcStageLookup(nextStage) : null;
      if (nextHit) {
        const prev = lcStageName(c.stage);
        c.stage = nextStage;
        c.pipelineId = nextHit.pipeline.id;
        c.stageEnteredAt = new Date().toISOString();
        if (lcIsCategory(nextStage, 'lost')) c.lostReason ||= '明确无需求/暂缓归档';
        lcLog(c.id, 'stage', `随跟进完成同步推进阶段：「${prev}」→「${nextHit.stage.name}」`, { toStage: nextStage });
      }

      if (!lcIsCategory(c.stage, 'lost') && f.get('scheduleNext') === '1' && v('nextTitle') && v('nextDue')) {
        const due = new Date(v('nextDue'));
        if (!Number.isNaN(due.getTime())) {
          lcCreateTask({
            customerId: c.id,
            title: v('nextTitle'),
            dueIso: due.toISOString(),
            priority: v('nextPriority') || 'normal',
            taskType: lcStageMeta(c.stage).taskType || '需求跟进',
          });
        }
      } else {
        c.followup = lcNextTask(c.id)?.due || null;
      }

      persist();
      close();
      render();
      toast('本次跟进已闭环归档，下一步计划已同步。');
    },

    'lc-quote-form': (f, v) => {
      const c = customer(v('customerId'));
      const amount = Number(v('amount'));
      if (!c || !amount || amount <= 0 || !v('summary')) return error('请填写有效的报价金额和方案摘要。');
      const days = Number(v('validDays')) || 5;
      const q = {
        id: nextId('qte'),
        quoteNo: 'QT-' + new Date().toISOString().slice(0, 7).replace('-', '') + '-' + String((data.quotes?.length || 0) + 1).padStart(2, '0'),
        customerId: c.id, accountId: c.account, owner: c.owner,
        amount, currency: 'USD', summary: v('summary'),
        validUntil: fidDay(days).slice(0, 10), status: '待确认',
        objectionNote: v('objectionNote'),
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      data.quotes.unshift(q);
      if (f.get('autoFollow') === '1') {
        // Advance to the pipeline's quoting stage only from an earlier open stage or a recovery stage.
        const quoting = lcRoleStage(lcCustomerPipeline(c), 'quoting');
        const here = lcStageMeta(c.stage);
        const earlier = here.category === 'open' && here.index < (lcStageLookup(quoting)?.index ?? -1);
        if (quoting && c.stage !== quoting && (earlier || lcIsRecovery(c.stage))) {
          c.stage = quoting;
          c.stageEnteredAt = new Date().toISOString();
          lcLog(c.id, 'stage', `新建报价单 ${q.quoteNo}，阶段由「${here.name}」推进至「${lcStageName(quoting)}」`, { toStage: quoting });
        }
        lcCreateTask({
          customerId: c.id,
          title: `跟进报价单 ${q.quoteNo}（${lcMoney(amount)}）客户反馈`,
          dueIso: new Date(Date.now() + 24 * 3600000).toISOString(),
          priority: 'high',
          taskType: '报价催单',
        });
      }
      lcLog(c.id, 'deal', `创建报价单 ${q.quoteNo} · 金额 ${lcMoney(amount)}（${q.summary}）`);
      persist();
      close();
      render();
      toast(`报价单 ${q.quoteNo} 已创建并关联跟进计划。`);
    },

    'lc-order-form': (f, v) => {
      const c = customer(v('customerId'));
      const amount = Number(v('amount'));
      if (!c || !amount || amount <= 0) return error('请填写有效的成交金额。');
      const qid = v('quoteId');
      const linkedQ = qid ? (data.quotes || []).find(q => q.id === qid) : lcCustomerQuotes(c.id).find(q => q.status === '待确认');
      if (linkedQ) linkedQ.status = '已转单';
      const fStatus = v('fulfillmentStatus') || '待发货';
      const cycle = Number(v('repurchaseCycleDays')) || 30;
      c.repurchaseCycleDays = cycle;
      const ord = {
        id: nextId('ord'),
        orderNo: 'ORD-' + new Date().toISOString().slice(0, 7).replace('-', '') + '-' + String(101 + (data.orders?.length || 0)),
        quoteId: linkedQ?.id || '', customerId: c.id, accountId: c.account, owner: c.owner,
        amount, currency: 'USD', orderType: v('orderType') || '首单',
        paymentStatus: '已收款', fulfillmentStatus: fStatus,
        carrierNote: v('carrierNote') || '待安排仓库发货',
        createdAt: new Date().toISOString(),
        deliveredAt: fStatus === '已签收' ? new Date().toISOString() : null,
      };
      data.orders.unshift(ord);
      const prev = c.stage;
      const orderPipeline = lcCustomerPipeline(c);
      const landing = lcRoleStage(orderPipeline, fStatus === '已签收' ? 'nurture' : 'fulfillment');
      if (landing) c.stage = landing;
      if (fStatus === '已签收') {
        c.nextRepurchaseAt = fidDay(cycle);
        lcCreateTask({
          customerId: c.id,
          title: `复购窗口关怀（订单 ${ord.orderNo} 签收后周期维护）`,
          dueIso: fidDay(Math.max(3, cycle - 5)),
          priority: 'normal',
          taskType: '复购关怀',
        });
      } else {
        lcCreateTask({
          customerId: c.id,
          title: `跟进订单 ${ord.orderNo} 发货单号与客户签收`,
          dueIso: new Date(Date.now() + 24 * 3600000).toISOString(),
          priority: 'high',
          taskType: '履约回访',
        });
      }
      if (c.stage !== prev) c.stageEnteredAt = new Date().toISOString();
      lcLog(c.id, 'deal', c.stage !== prev
        ? `登记${ord.orderType}成交 ${ord.orderNo}（${lcMoney(amount)}），阶段由「${lcStageName(prev)}」进入「${lcStageName(c.stage)}」`
        : `登记${ord.orderType}成交 ${ord.orderNo}（${lcMoney(amount)}），阶段保持「${lcStageName(c.stage)}」`);
      persist();
      close();
      render();
      toast(c.stage !== prev ? `订单 ${ord.orderNo} 已登记，客户已进入「${lcStageName(c.stage)}」阶段。` : `订单 ${ord.orderNo} 已登记。`);
    },

    'lc-order-step-form': (f, v) => {
      const ord = (data.orders || []).find(o => o.id === v('orderId'));
      if (!ord) return;
      const c = customer(ord.customerId);
      if (!c || !v('carrierNote')) return error('请填写物流单号或签收说明。');
      const nextStatus = v('nextStatus');
      ord.fulfillmentStatus = nextStatus;
      ord.carrierNote = v('carrierNote');
      if (nextStatus === '已签收') {
        ord.deliveredAt = new Date().toISOString();
        const cycle = Number(v('repurchaseCycleDays')) || c.repurchaseCycleDays || 30;
        c.repurchaseCycleDays = cycle;
        c.nextRepurchaseAt = fidDay(cycle);
        const prev = c.stage;
        const nurture = lcRoleStage(lcCustomerPipeline(c), 'nurture');
        if (nurture && nurture !== prev) {
          c.stage = nurture;
          c.stageEnteredAt = new Date().toISOString();
        }
        lcCreateTask({
          customerId: c.id,
          title: `老客复购窗口触达（预计 ${cycle} 天补货周期）`,
          dueIso: fidDay(Math.max(2, cycle - 4)),
          priority: 'normal',
          taskType: '复购关怀',
        });
        lcLog(c.id, 'deal', c.stage !== prev
          ? `订单 ${ord.orderNo} 确认签收，自动由「${lcStageName(prev)}」转入「${lcStageName(c.stage)}」（下次复购窗口 ${fidDate(c.nextRepurchaseAt).slice(0, 10)}）`
          : `订单 ${ord.orderNo} 确认签收（下次复购窗口 ${fidDate(c.nextRepurchaseAt).slice(0, 10)}）`);
      } else {
        lcLog(c.id, 'deal', `订单 ${ord.orderNo} 更新为「运输中」· ${ord.carrierNote}`);
      }
      persist();
      close();
      if (f.get('openChatDraft') === '1') {
        lcFillSmartDraft(c.id, 'order');
      } else {
        render();
        toast(`订单 ${ord.orderNo} 已更新为「${nextStatus}」。`);
      }
    },

    'lc-sim-lead-form': (f, v) => {
      const a = account(v('accountId'));
      const name = v('name');
      if (!a || !name) return error('请填写客户称呼并选择接待号码。');
      const phone = openwaNextNumber() || '+1 (512) 555-0199';
      const isEs = v('language') === '西班牙语';
      const msg = isEs
        ? 'Hola, vi su anuncio y agregué su WhatsApp. ¿Me comparte el catálogo y tiempos de envío?'
        : 'Hi! Just added your WhatsApp from your ad. Could you share the catalog and shipping details?';
      const tr = isEs
        ? '你好，看到你们的广告加了 WhatsApp，能发一下目录和发货时效吗？'
        : '你好！刚从广告加了你们的 WhatsApp，可以发一下目录和发货说明吗？';
      const id = nextId('c');
      const nowIso = new Date().toISOString();
      const leadPipeline = lcPipeline(v('pipelineId'));
      const intake = lcIntakeStage(leadPipeline);
      const c = {
        id, name, initials: initial(name), color: 'blue', phone,
        country: a.country || 'US', city: a.country === 'PR' ? 'San Juan' : 'Dallas',
        timezone: a.country === 'PR' ? 'America/Puerto_Rico' : 'America/Chicago',
        language: v('language'), owner: a.owner || ui.persona, account: a.id,
        tags: [], pipelineId: leadPipeline.id, stage: intake, stageEnteredAt: nowIso,
        source: v('source'), campaign: v('campaign'), ad: '模拟进线会话',
        unread: 1, star: false, last: '刚刚', preview: msg, translation: tr,
        followup: null, notes: '', contactRefs: [{ account: a.id, owner: a.owner || ui.persona }],
        createdAt: nowIso, updatedAt: nowIso, clientType: '新增线索-实时', intentLevel: '高意向',
        repurchaseCycleDays: 30, reactivatedCount: 0,
        qualification: { demand: '新加微咨询目录与发货安排', volume: '待首响确认', deliveryRegion: a.country === 'PR' ? 'PR · San Juan' : 'US · TX', objection: '', commWindow: v('language') + '沟通' },
      };
      data.customers.unshift(c);
      data.messages[id] = [{ id: nextId('m'), side: 'in', text: msg, translated: tr, time: '刚刚' }];
      lcCreateTask({
        customerId: id,
        title: `首响破冰回复 ${name} 并确认具体需求`,
        dueIso: new Date(Date.now() + 3600000).toISOString(),
        priority: 'high',
        taskType: '首响破冰',
      });
      lcLog(id, 'inbound', `通过「${c.source}」首次加微进线，自动进入「${leadPipeline.name} · ${lcStageName(intake)}」并生成首响待办`, { toStage: intake });
      persist();
      close();
      lcState.pipeline = leadPipeline.id;
      lcState.stageFilter = 'all';
      lcState.radar = 'all';
      navigate('lifecycle');
      toast(`新客户 ${name} 已加微进线！已自动归入「${lcStageName(intake)}」并建立首响待办。`);
    },

    'lc-new-customer-form': (f, v) => {
      if (!v('name') || !v('phone')) return error('请填写客户称呼与 WhatsApp 号码。');
      const digits = fidPhoneDigits(v('phone'));
      if (digits.length < 7) return error('请输入含国家区号的有效号码。');
      const dup = data.customers.find(x => fidPhoneDigits(x.phone) === digits);
      if (dup) return error(`该号码已存在于客户「${dup.name}」（当前阶段：${lcStageName(dup.stage)}），请直接前往其档案跟进避免撞单。`);
      const a = account(v('account'));
      const nowIso = new Date().toISOString();
      const id = nextId('c');
      const newPipeline = lcPipeline(v('pipelineId'));
      const intake = lcIntakeStage(newPipeline);
      const c = {
        id, name: v('name'), initials: initial(v('name')), color: 'jade',
        phone: v('phone'), country: v('country'), city: '待补充',
        timezone: v('country') === 'PR' ? 'America/Puerto_Rico' : 'America/New_York',
        language: v('language'), owner: a?.owner || ui.persona, account: a?.id || myAccounts()[0]?.id,
        tags: [], pipelineId: newPipeline.id, stage: intake, stageEnteredAt: nowIso,
        source: v('source'), campaign: '', ad: '',
        unread: 0, star: false, last: '刚刚', preview: v('demand') || '新建客户档案', translation: '',
        followup: null, notes: v('demand'), contactRefs: [{ account: a?.id, owner: a?.owner || ui.persona }],
        createdAt: nowIso, updatedAt: nowIso, clientType: '新增线索-补录', intentLevel: '中意向',
        repurchaseCycleDays: 30, reactivatedCount: 0,
        qualification: { demand: v('demand'), volume: '', deliveryRegion: country({ country: v('country') }), objection: '', commWindow: v('language') + '沟通' },
      };
      data.customers.unshift(c);
      lcCreateTask({
        customerId: id,
        title: `首次主动触达 ${c.name} 确认需求`,
        dueIso: new Date(Date.now() + 4 * 3600000).toISOString(),
        priority: 'normal',
        taskType: '首响破冰',
      });
      lcLog(id, 'stage', `手动建档纳入「${newPipeline.name} · ${lcStageName(intake)}」并自动创建首次跟进待办`, { toStage: intake });
      persist();
      close();
      render();
      toast(`客户 ${c.name} 已创建并纳入全周期管理。`);
    },
  });

  // Keep customers added elsewhere (OpenWA sample chats, legacy saves) on a valid pipeline stage
  function lcSyncRuntimeCustomers() {
    if (!Array.isArray(data.pipelines) || !data.pipelines.length) data.pipelines = lcPresetPipelines();
    if (ui.customerStage !== 'all' && !lcStageLookup(ui.customerStage)) ui.customerStage = 'all';
    for (const c of data.customers) {
      const before = c.stage;
      lcNormalizeCustomer(c);
      if (c.stage !== before) c.stageEnteredAt ||= new Date().toISOString();
      c.qualification ||= {
        demand: c.notes || c.preview || '',
        volume: '待确认',
        deliveryRegion: country(c),
        objection: '',
        commWindow: (c.language || '英语') + '沟通',
      };
      if (lcHasRole(c, 'intake') && !data.tasks.some(t => t.customer === c.id) && !(data.activities[c.id] || []).length) {
        lcCreateTask({
          customerId: c.id,
          title: `首响破冰回复 ${c.name} 并确认咨询需求`,
          dueIso: new Date(Date.now() + 2 * 3600000).toISOString(),
          priority: 'high',
          taskType: '首响破冰',
        });
        lcLog(c.id, 'inbound', `OpenWA 扫码进线会话自动归入「${lcStageName(c.stage)}」并建立首响待办`);
      }
    }
  }
  const lcWrapRender = render;
  render = function() {
    lcSyncRuntimeCustomers();
    lcWrapRender();
  };

  // Dynamic input/change listeners for Lifecycle controls & Transition modal
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'lc-target-stage') {
      const c = customer(t.dataset.customer);
      const host = $('#lc-transition-dynamic');
      if (c && host) {
        host.innerHTML = lcTransitionDynamicFields(c, t.value);
        paintIcons(host);
      }
    }
    if (t.id === 'lc-account-filter') {
      lcState.account = t.value;
      render();
    }
  });

  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'lc-search-input') {
      lcState.query = t.value;
      const pos = t.selectionStart;
      render();
      const next = $('#lc-search-input');
      if (next) { next.focus({ preventScroll: true }); next.setSelectionRange(pos, pos); }
    }
    if (t.id === 'lc-deals-search') {
      lcState.dealsQuery = t.value;
      const pos = t.selectionStart;
      render();
      const next = $('#lc-deals-search');
      if (next) { next.focus({ preventScroll: true }); next.setSelectionRange(pos, pos); }
    }
  });

  // ============================================================================
  // Page: #pipelines (生命周期流程配置)
  // Lets a reviewer reshape pipelines: add / rename / reorder / delete stages,
  // map automation landing points, and create, copy or delete whole pipelines.
  // Counts here use every customer, because a stage change affects the whole team.
  // ============================================================================
  const LC_DEFAULT_LOST_REASONS = ['价格不合适', '暂无需求', '已选择其他供应商', '长期失联未回复'];
  const lcStageCustomers = stageId => data.customers.filter(c => c.stage === stageId);
  const lcPipelineCustomers = pipelineId => data.customers.filter(c => c.pipelineId === pipelineId);

  function lcCfgPipeline() {
    const p = lcPipelines().find(x => x.id === lcState.cfgPipeline) || lcBoardPipeline();
    lcState.cfgPipeline = p.id;
    return p;
  }

  function lcClonePipeline(source, name) {
    const ids = new Map(source.stages.map(s => [s.id, lcNewId('st')]));
    return {
      id: lcNewId('pl'), name, isDefault: false,
      lostReasons: [...(source.lostReasons || [])],
      roles: Object.fromEntries(Object.keys(LC_ROLES).map(role => [role, ids.get(source.roles?.[role]) || ''])),
      stages: source.stages.map(s => ({ ...s, id: ids.get(s.id), next: ids.get(s.next) || '' })),
    };
  }

  function lcUniquePipelineName(base) {
    let name = base, n = 2;
    while (lcPipelines().some(p => p.name === name)) name = `${base} ${n++}`;
    return name;
  }

  // Move customers between stages (used when a stage or pipeline is removed).
  function lcMoveCustomers(customers, targetStage, reason) {
    const hit = lcStageLookup(targetStage);
    if (!hit) return;
    for (const c of customers) {
      const prev = lcStageName(c.stage);
      c.stage = targetStage;
      c.pipelineId = hit.pipeline.id;
      c.stageEnteredAt = new Date().toISOString();
      lcLog(c.id, 'stage', `${reason}：阶段由「${prev}」调整为「${hit.pipeline.name} · ${hit.stage.name}」`, { toStage: targetStage });
    }
  }

  function renderPipelines() {
    const pipeline = lcCfgPipeline();
    const stages = lcStages(pipeline);
    const issues = lcPipelineIssues(pipeline);
    const stageSelect = (selected, emptyLabel) =>
      option('', emptyLabel, selected || '') + stages.map(s => option(s.id, `${s.code} · ${s.name}`, selected || '')).join('');

    const rows = stages.map((st, i) => {
      const count = lcStageCustomers(st.id).length;
      const roleTags = Object.entries(LC_ROLES)
        .filter(([role]) => pipeline.roles?.[role] === st.id)
        .map(([, def]) => `<span class="lc-pill info">${esc(def.label)}</span>`).join('');
      return `<tr>
        <td><div class="lc-cfg-order">
          <button type="button" class="icon-button" data-action="lcStageMove" ${fidActionID(st.id)} data-dir="-1" aria-label="上移阶段 ${esc(st.name)}" ${i === 0 ? 'disabled' : ''}>${icon('ChevronUp')}</button>
          <span>${esc(st.code)}</span>
          <button type="button" class="icon-button" data-action="lcStageMove" ${fidActionID(st.id)} data-dir="1" aria-label="下移阶段 ${esc(st.name)}" ${i === stages.length - 1 ? 'disabled' : ''}>${icon('ChevronDown')}</button>
        </div></td>
        <td style="text-align:left"><span class="lc-stage-badge ${esc(st.tone)}">${icon(st.icon)}${esc(st.name)}</span>${roleTags ? `<div class="lc-cfg-roles">${roleTags}</div>` : ''}</td>
        <td>${esc(LC_CATEGORIES[st.category]?.label || '—')}</td>
        <td style="text-align:left">${esc(LC_CAPTURES[st.capture] || LC_CAPTURES.none)}</td>
        <td>${esc(LC_METRICS[st.metric] || LC_METRICS.unread)}</td>
        <td>${st.next && lcStageLookup(st.next) ? esc(lcStageName(st.next)) : '按顺序'}</td>
        <td style="text-align:left">${esc(st.defaultTask || '—')}<span class="fid-cell-detail">${Number(st.defaultHours) || 24} 小时内 · ${esc(st.taskType || '需求跟进')}</span></td>
        <td>${count}</td>
        <td><div class="fid-icon-actions">
          ${fidButton('编辑', 'lcStageEdit', 'Pencil', 'slim', fidActionID(st.id))}
          ${fidButton('删除', 'lcStageDelete', 'Trash2', 'slim', `${fidActionID(st.id)} ${stages.length <= 1 ? 'disabled' : ''}`)}
        </div></td>
      </tr>`;
    }).join('');

    const roleFields = Object.entries(LC_ROLES).map(([role, def]) => `<label class="lc-field lc-cfg-role">
      <span>${esc(def.label)}</span>
      <select class="fid-select" data-lc-role="${role}" data-pipeline="${esc(pipeline.id)}" aria-label="${esc(def.label)}">${stageSelect(lcRoleStage(pipeline, role), '不自动变更阶段')}</select>
      <small>${esc(def.help)}</small>
    </label>`).join('');

    return `<section class="lc-page" aria-labelledby="lc-cfg-title">
      <div class="lc-wrap">
        <header class="lc-hero">
          <div class="lc-hero-title">
            <h1 id="lc-cfg-title">${icon('GitBranch')}生命周期流程配置</h1>
            <p>不同客户类型可以走不同流程。阶段的名称、数量与顺序都能调整；系统按「阶段类型」「进入时采集」与「自动流转落点」运行，与阶段叫什么无关。</p>
          </div>
          <div class="lc-hero-actions">
            ${fidButton('恢复预设流程', 'lcPipelinesReset', 'RotateCcw', '')}
            ${fidButton('新建流程', 'lcPipelineNew', 'Plus', 'gradient')}
          </div>
        </header>

        <div class="lc-sop-strip" role="note">
          <strong>${icon('Info')}原型说明：</strong>
          <span class="lc-sop-item">正式版由主管在主站统一维护，聊手只读</span>
          <span class="lc-sop-item">此处开放编辑，便于评审流程是否贴合业务</span>
          <span class="lc-sop-item">修改即时生效，客户历史记录不受影响</span>
        </div>

        <div class="lc-pipeline-bar">
          ${lcPipelineTabs(pipeline, 'lcCfgPipeline', p => lcPipelineCustomers(p.id).length)}
        </div>

        <div class="lc-card-block lc-cfg-head">
          <div class="lc-block-head">
            <h3>${icon('GitBranch')}${esc(pipeline.name)}${pipeline.isDefault ? ' <span class="lc-pill ok">默认流程</span>' : ''}</h3>
            <div class="lc-deal-actions">
              ${fidButton('流程设置', 'lcPipelineEdit', 'Settings2', 'slim', fidActionID(pipeline.id))}
              ${fidButton('复制为新流程', 'lcPipelineCopy', 'Copy', 'slim', fidActionID(pipeline.id))}
              ${fidButton('在看板查看', 'lcPipelineView', 'Kanban', 'slim tint', fidActionID(pipeline.id))}
              ${fidButton('删除流程', 'lcPipelineDelete', 'Trash2', 'slim', `${fidActionID(pipeline.id)} ${lcPipelines().length <= 1 ? 'disabled' : ''}`)}
            </div>
          </div>
          <p class="lc-cfg-chain">${esc(lcChain(pipeline))}</p>
          <div class="info-row"><span>流失原因选项</span><span>${esc((pipeline.lostReasons || []).join('、') || '未设置')}</span></div>
          ${issues.length
            ? `<ul class="lc-cfg-issues">${issues.map(x => `<li>${icon('TriangleAlert')}${esc(x)}</li>`).join('')}</ul>`
            : `<p class="lc-cfg-ok">${icon('BadgeCheck')}流程配置完整。</p>`}
        </div>

        <div class="lc-card-block">
          <div class="lc-block-head">
            <h3>${icon('ListOrdered')}阶段（${stages.length}）</h3>
            ${fidButton('新增阶段', 'lcStageAdd', 'Plus', 'slim blue')}
          </div>
          <div class="fid-table-card">${fidTable('lc-cfg-table', ['顺序', '阶段', '类型', '进入时采集', '看板指标', '默认下一阶段', '默认跟进事项', '客户数', '操作'], rows, '还没有阶段', true, 'GitBranch')}</div>
        </div>

        <div class="lc-card-block">
          <div class="lc-block-head"><h3>${icon('Zap')}自动流转落点</h3></div>
          <p class="fid-field-help" style="margin:0 0 12px">进线、报价、订单与重激活发生时，客户自动进入这里指定的阶段。选择「不自动变更阶段」即关闭该项自动流转。</p>
          <div class="lc-cfg-role-grid">${roleFields}</div>
        </div>
      </div>
    </section>`;
  }

  function openStageForm(pipelineId, stageId = '') {
    const pipeline = lcPipelines().find(p => p.id === pipelineId);
    if (!pipeline) return;
    const st = pipeline.stages.find(s => s.id === stageId);
    const val = st || { name: '', category: 'open', tone: 'blue', icon: 'Compass', capture: 'none', metric: 'unread', next: '', defaultTask: '', defaultHours: 24, taskType: '需求跟进', goal: '', sop: '', exitRule: '' };
    const others = lcStages(pipeline).filter(s => s.id !== stageId);
    const row = (label, name, placeholder) => fidFormRow(label, `<input class="fid-input" style="width:100%" name="${name}" maxlength="80" value="${esc(val[name] || '')}" placeholder="${esc(placeholder)}">`);
    fidForm(
      st ? `编辑阶段 · ${st.name}` : `新增阶段 · ${pipeline.name}`,
      'lc-stage',
      `<input type="hidden" name="pipelineId" value="${esc(pipeline.id)}">
       <input type="hidden" name="stageId" value="${esc(st?.id || '')}">
       ${fidFormRow('阶段名称', `<input class="fid-input" style="width:100%" name="name" required maxlength="12" value="${esc(val.name)}" placeholder="如：样品试用">`, '', true)}
       ${fidFormRow('阶段类型', `<select class="fid-select" style="width:100%" name="category">${Object.entries(LC_CATEGORIES).map(([id, def]) => option(id, `${def.label}（${def.active ? '需持续跟进，无待办时提示断档' : '不计入断档，客户来信可重激活'}）`, val.category)).join('')}</select>`)}
       ${fidFormRow('进入时采集', `<select class="fid-select" style="width:100%" name="capture">${Object.entries(LC_CAPTURES).map(([id, label]) => option(id, label, val.capture)).join('')}</select>`)}
       ${fidFormRow('看板指标', `<select class="fid-select" style="width:100%" name="metric">${Object.entries(LC_METRICS).map(([id, label]) => option(id, label, val.metric)).join('')}</select>`)}
       ${fidFormRow('默认下一阶段', `<select class="fid-select" style="width:100%" name="next">${option('', '按顺序进入下一个阶段', val.next || '')}${others.map(s => option(s.id, `${s.code} · ${s.name}`, val.next || '')).join('')}</select>`)}
       ${st ? '' : fidFormRow('插入位置', `<select class="fid-select" style="width:100%" name="after">${option('', '排在最后', '')}${others.map(s => option(s.id, `排在「${s.name}」之后`, '')).join('')}</select>`)}
       ${row('默认跟进事项', 'defaultTask', '进入该阶段时自动带出的待办标题')}
       ${fidFormRow('跟进时限', `<span class="lc-cfg-inline"><input class="fid-input" type="number" min="1" max="2160" step="1" name="defaultHours" value="${esc(Number(val.defaultHours) || 24)}"><span>小时内</span><select class="fid-select" name="taskType" aria-label="待办类型">${LC_TASK_TYPES.map(t => option(t, t, val.taskType)).join('')}</select></span>`)}
       ${fidFormRow('图标与颜色', `<span class="lc-cfg-inline"><select class="fid-select" name="icon" aria-label="阶段图标">${LC_STAGE_ICONS.map(([id, label]) => option(id, label, val.icon)).join('')}</select><select class="fid-select" name="tone" aria-label="阶段颜色">${LC_TONES.map(([id, label]) => option(id, label, val.tone)).join('')}</select></span>`)}
       ${row('阶段目标', 'goal', '选填：这个阶段要达成什么')}
       ${row('标准动作', 'sop', '选填：聊手在这个阶段的标准动作')}
       ${row('出口条件', 'exitRule', '选填：满足什么条件进入下一阶段')}`,
      '保存阶段',
      { wide: true }
    );
  }

  function openStageDelete(stageId) {
    const hit = lcStageLookup(stageId);
    if (!hit) return;
    if (hit.pipeline.stages.length <= 1) return toast('流程至少保留一个阶段。');
    const affected = lcStageCustomers(stageId);
    const others = lcStages(hit.pipeline).filter(s => s.id !== stageId);
    fidForm(
      `删除阶段 · ${hit.stage.name}`,
      'lc-stage-delete',
      `<input type="hidden" name="stageId" value="${esc(stageId)}">
       <p class="fid-field-help" style="margin:0 0 12px">${affected.length
         ? `该阶段下有 ${affected.length} 位客户，删除前需迁移到其他阶段。客户的聊天、报价、订单与轨迹全部保留。`
         : '该阶段下没有客户，可直接删除。'}指向该阶段的自动流转落点与「默认下一阶段」会被清空。</p>
       ${affected.length ? fidFormRow('客户迁移至', `<select class="fid-select" style="width:100%" name="moveTo">${others.map(s => option(s.id, `${s.code} · ${s.name}`, others[0].id)).join('')}</select>`, '', true) : ''}`,
      '确认删除'
    );
  }

  function openPipelineForm(pipelineId = '') {
    const p = lcPipelines().find(x => x.id === pipelineId);
    fidForm(
      p ? `流程设置 · ${p.name}` : '新建客户流程',
      'lc-pipeline',
      `<input type="hidden" name="pipelineId" value="${esc(p?.id || '')}">
       ${fidFormRow('流程名称', `<input class="fid-input" style="width:100%" name="name" required maxlength="16" value="${esc(p?.name || '')}" placeholder="如：复购老客、代理商">`, '', true)}
       ${p ? '' : fidFormRow('起始模板', `<select class="fid-select" style="width:100%" name="template">${option('', '空白流程（新线索 → 已成交 / 已流失）', '')}${lcPipelines().map(x => option(x.id, `复制「${x.name}」的 ${x.stages.length} 个阶段`, '')).join('')}</select>`)}
       ${fidFormRow('流失原因', `<textarea class="fid-input lc-cfg-textarea" name="lostReasons" rows="5" placeholder="每行一个原因；新建时留空则沿用模板">${esc((p?.lostReasons || []).join('\n'))}</textarea>`)}
       <label class="lc-cfg-check"><input type="checkbox" name="isDefault" value="1" ${p?.isDefault ? 'checked disabled' : ''}> 设为默认流程（未指定流程的新客户进入此流程）</label>`,
      '保存流程',
      { wide: true }
    );
  }

  function openPipelineDelete(pipelineId) {
    const p = lcPipelines().find(x => x.id === pipelineId);
    if (!p) return;
    if (lcPipelines().length <= 1) return toast('至少保留一个客户流程。');
    const affected = lcPipelineCustomers(p.id);
    const others = lcPipelines().filter(x => x !== p);
    const preferred = lcIntakeStage(others.find(x => x.isDefault) || others[0]);
    fidForm(
      `删除流程 · ${p.name}`,
      'lc-pipeline-delete',
      `<input type="hidden" name="pipelineId" value="${esc(p.id)}">
       <p class="fid-field-help" style="margin:0 0 12px">${affected.length
         ? `该流程下有 ${affected.length} 位客户，需迁移到其他流程的指定阶段。历史记录全部保留。`
         : '该流程下没有客户，可直接删除。'}${p.isDefault ? '删除后，迁移目标所在流程将成为默认流程。' : ''}</p>
       ${affected.length ? fidFormRow('客户迁移至', `<select class="fid-select" style="width:100%" name="moveTo">${others.map(o => `<optgroup label="${esc(o.name)}">${lcStages(o).map(s => option(s.id, `${o.name} · ${s.code} · ${s.name}`, preferred)).join('')}</optgroup>`).join('')}</select>`, '', true) : ''}`,
      '确认删除'
    );
  }

  Object.assign(fidActions, {
    lcCfgPipeline: id => { lcState.cfgPipeline = id; render(); },
    lcPipelineView: id => { lcState.pipeline = id; lcState.stageFilter = 'all'; lcState.radar = 'all'; navigate('lifecycle'); },
    lcStageAdd: () => openStageForm(lcCfgPipeline().id),
    lcStageEdit: id => { const hit = lcStageLookup(id); if (hit) openStageForm(hit.pipeline.id, id); },
    lcStageDelete: id => openStageDelete(id),
    lcStageMove: (id, btn) => {
      const hit = lcStageLookup(id);
      const to = hit ? hit.index + Number(btn?.dataset?.dir || 0) : -1;
      if (!hit || to < 0 || to >= hit.pipeline.stages.length || to === hit.index) return;
      const list = hit.pipeline.stages;
      [list[hit.index], list[to]] = [list[to], list[hit.index]];
      persist();
      render();
      document.querySelector(`[data-action="lcStageMove"][data-id="${CSS.escape(id)}"][data-dir="${btn.dataset.dir}"]:not([disabled])`)?.focus();
    },
    lcPipelineNew: () => openPipelineForm(),
    lcPipelineEdit: id => openPipelineForm(id),
    lcPipelineDelete: id => openPipelineDelete(id),
    lcPipelineCopy: id => {
      const source = lcPipelines().find(p => p.id === id);
      if (!source) return;
      const copy = lcClonePipeline(source, lcUniquePipelineName(source.name + ' 副本'));
      data.pipelines.push(copy);
      lcState.cfgPipeline = copy.id;
      persist();
      render();
      toast(`已复制为「${copy.name}」，可在此基础上调整阶段。`);
    },
    lcPipelinesReset: () => fidForm(
      '恢复预设流程',
      'lc-pipelines-reset',
      `<p class="fid-field-help" style="margin:0">将流程恢复为预设的「零售客户」与「大B经销商」。自定义流程和阶段会被移除；不在预设阶段中的客户回到默认流程的进线阶段，历史记录保留。</p>`,
      '确认恢复'
    ),
  });

  Object.assign(fidForms, {
    'lc-stage-form': (f, v) => {
      const pipeline = lcPipelines().find(p => p.id === v('pipelineId'));
      if (!pipeline) return;
      const name = v('name');
      if (!name) return error('请填写阶段名称。');
      const existing = pipeline.stages.find(s => s.id === v('stageId'));
      if (pipeline.stages.some(s => s !== existing && s.name === name)) return error('该流程中已有同名阶段，请换一个名称。');
      const pick = (table, key, fallback) => Object.hasOwn(table, v(key)) ? v(key) : fallback;
      const values = {
        name,
        category: pick(LC_CATEGORIES, 'category', 'open'),
        capture: pick(LC_CAPTURES, 'capture', 'none'),
        metric: pick(LC_METRICS, 'metric', 'unread'),
        icon: LC_STAGE_ICONS.some(([id]) => id === v('icon')) ? v('icon') : 'Compass',
        tone: LC_TONES.some(([id]) => id === v('tone')) ? v('tone') : 'blue',
        next: pipeline.stages.some(s => s.id === v('next') && s !== existing) ? v('next') : '',
        defaultTask: v('defaultTask') || `跟进「${name}」阶段客户`,
        defaultHours: Math.min(2160, Math.max(1, Math.round(Number(v('defaultHours')) || 24))),
        taskType: LC_TASK_TYPES.includes(v('taskType')) ? v('taskType') : '需求跟进',
        goal: v('goal'), sop: v('sop'), exitRule: v('exitRule'),
      };
      if (existing) {
        Object.assign(existing, values);
      } else {
        const after = pipeline.stages.findIndex(s => s.id === v('after'));
        pipeline.stages.splice(after >= 0 ? after + 1 : pipeline.stages.length, 0, { id: lcNewId('st'), ...values });
      }
      persist();
      close();
      render();
      toast(existing ? `阶段「${name}」已更新。` : `已在「${pipeline.name}」新增阶段「${name}」。`);
    },

    'lc-stage-delete-form': (f, v) => {
      const hit = lcStageLookup(v('stageId'));
      if (!hit || hit.pipeline.stages.length <= 1) return;
      const affected = lcStageCustomers(hit.stage.id);
      if (affected.length) {
        const target = lcStageLookup(v('moveTo'));
        if (!target || target.pipeline !== hit.pipeline || target.stage === hit.stage) return error('请选择要迁移到的阶段。');
        lcMoveCustomers(affected, target.stage.id, `阶段「${hit.stage.name}」已删除`);
      }
      const { pipeline, stage } = hit;
      pipeline.stages.splice(hit.index, 1);
      for (const role of Object.keys(LC_ROLES)) if (pipeline.roles?.[role] === stage.id) pipeline.roles[role] = '';
      for (const s of pipeline.stages) if (s.next === stage.id) s.next = '';
      if (lcState.stageFilter === stage.id) lcState.stageFilter = 'all';
      persist();
      close();
      render();
      toast(`已删除阶段「${stage.name}」${affected.length ? `，${affected.length} 位客户已迁移` : ''}。`);
    },

    'lc-pipeline-form': (f, v) => {
      const name = v('name');
      if (!name) return error('请填写流程名称。');
      const existing = lcPipelines().find(p => p.id === v('pipelineId'));
      if (lcPipelines().some(p => p !== existing && p.name === name)) return error('已存在同名流程，请换一个名称。');
      const reasons = [...new Set(String(f.get('lostReasons') || '').split('\n').map(x => x.trim()).filter(Boolean))].slice(0, 20);
      let target = existing;
      if (!target) {
        const source = lcPipelines().find(p => p.id === v('template'));
        target = source
          ? lcClonePipeline(source, name)
          : { id: lcNewId('pl'), name, isDefault: false, lostReasons: [...LC_DEFAULT_LOST_REASONS], ...lcBlankPipelineStages(lcNewId) };
        data.pipelines.push(target);
      }
      target.name = name;
      if (reasons.length) target.lostReasons = reasons;
      else if (existing || !target.lostReasons?.length) target.lostReasons = [...LC_DEFAULT_LOST_REASONS];
      if (f.get('isDefault') === '1') for (const p of data.pipelines) p.isDefault = p === target;
      lcState.cfgPipeline = target.id;
      persist();
      close();
      render();
      toast(existing ? `流程「${name}」已更新。` : `已新建流程「${name}」。`);
    },

    'lc-pipeline-delete-form': (f, v) => {
      const p = lcPipelines().find(x => x.id === v('pipelineId'));
      if (!p || lcPipelines().length <= 1) return;
      const affected = lcPipelineCustomers(p.id);
      const target = lcStageLookup(v('moveTo'));
      if (affected.length) {
        if (!target || target.pipeline === p) return error('请选择要迁移到的流程阶段。');
        lcMoveCustomers(affected, target.stage.id, `流程「${p.name}」已删除`);
      }
      data.pipelines.splice(data.pipelines.indexOf(p), 1);
      if (p.isDefault) (target?.pipeline || data.pipelines[0]).isDefault = true;
      if (lcState.pipeline === p.id) lcState.pipeline = '';
      lcState.cfgPipeline = '';
      lcState.stageFilter = 'all';
      persist();
      close();
      render();
      toast(`已删除流程「${p.name}」${affected.length ? `，${affected.length} 位客户已迁移` : ''}。`);
    },

    'lc-pipelines-reset-form': () => {
      data.pipelines = lcPresetPipelines();
      Object.assign(lcState, { pipeline: '', cfgPipeline: '', stageFilter: 'all' });
      for (const c of data.customers) lcNormalizeCustomer(c);
      persist();
      close();
      render();
      toast('已恢复预设流程。');
    },
  });

  // Automation landing points save as soon as they are changed.
  document.addEventListener('change', e => {
    const t = e.target;
    const role = t.dataset?.lcRole;
    if (!role || !Object.hasOwn(LC_ROLES, role)) return;
    const p = lcPipelines().find(x => x.id === t.dataset.pipeline);
    if (!p) return;
    p.roles ||= {};
    p.roles[role] = p.stages.some(s => s.id === t.value) ? t.value : '';
    persist();
    render();
    toast(`「${LC_ROLES[role].label}」已更新为：${p.roles[role] ? lcStageName(p.roles[role]) : '不自动变更阶段'}。`);
  });

  const subsiteSignOutKey = KEY+'-subsite-signed-out';
  function subsiteExitWasSaved() {
    try { return localStorage.getItem(subsiteSignOutKey)==='1'; } catch { return false; }
  }
  let subsiteSignedOut = location.hash==='#login'||subsiteExitWasSaved();

  function renderSignInState() {
    const signedOut = subsiteSignedOut||location.hash==='#login';
    const shell = $('#app-shell');
    const login = $('#subsite-login');
    const enteringLogin = signedOut&&login.hidden;
    shell.hidden = signedOut;
    login.hidden = !signedOut;
    $('.skip-link').hidden = signedOut;
    $('.fid-float-review').hidden = signedOut;
    if (!signedOut) return true;

    if (location.hash!=='#login') history.replaceState(null,'','#login');
    if (enteringLogin) {
      if ($('#dialog').open) close();
      if ($('#element-review-dialog').open) $('#element-review-dialog').close();
      $('#view').replaceChildren();
      $('#toast').classList.remove('show');
      paintIcons(login);
      $('#subsite-login-title').focus();
    }
    return false;
  }

  Object.assign(fidActions, {
    subsiteLogout:()=>{
      subsiteSignedOut = true;
      try { localStorage.setItem(subsiteSignOutKey,'1'); } catch {}
      render();
    },
    subsiteEnterDemo:()=>{
      subsiteSignedOut = false;
      try { localStorage.removeItem(subsiteSignOutKey); } catch {}
      navigate('dashboard','replace');
      $('#view').focus({preventScroll:true});
    },
  });

  window.addEventListener('storage',event=>{
    if (event.key!==subsiteSignOutKey||event.newValue!=='1') return;
    subsiteSignedOut = true;
    render();
  });
  window.addEventListener('pageshow',event=>{
    if (!event.persisted||subsiteSignedOut||!subsiteExitWasSaved()) return;
    subsiteSignedOut = true;
    render();
  });

  render();
  window.initWAElementReview(toast);
})();
