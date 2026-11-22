window.WA_START = () => {
  'use strict';
  const KEY='wa-desk-scrm-lifecycle-v06';
  const clone=x=>JSON.parse(JSON.stringify(x));
  const UI_KEY=KEY+':'+window.WA_SITE.user.username;
  let saved=null;try{saved=JSON.parse(localStorage.getItem(UI_KEY)||'null')}catch(e){}
  let data=window.WA_SITE.data;
  const views={dashboard:'首页',inbox:'WhatsApp API',accounts:'账号列表',customers:'客户列表',followups:'跟进闭环','chat-records':'聊天记录',tags:'标签管理','tag-stats':'标签统计',team:'组织架构',members:'账号管理',ai:'AI 能力',prices:'价格表'};
  const defaultView=['numbers','chat'].includes(new URLSearchParams(location.search).get('tab'))?'inbox':'dashboard';
  const subsiteMember=data.members.find(m=>m.id===window.WA_SITE.user.username);
  const ui={view:Object.hasOwn(views,location.hash.slice(1))?location.hash.slice(1):defaultView,persona:subsiteMember.id,customer:data.customers[0]?.id||'',account:'all',conversationFilter:'all',query:'',customerQuery:'',customerTag:'all',customerStage:'all',customerOwner:'all',tagScope:'team',taskFilter:'pending',profileTab:'details',mobileChat:false,selected:new Set(),drafts:saved?.drafts||{},noteDrafts:saved?.noteDrafts||{},attachments:saved?.attachments||{},profileOpen:saved?.profileOpen!==false,receiveTranslation:saved?.receiveTranslation!==false,attachment:null};
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
  function persist(){try{localStorage.setItem(UI_KEY,JSON.stringify({version:6,receiveTranslation:ui.receiveTranslation,drafts:ui.drafts,noteDrafts:ui.noteDrafts,attachments:ui.attachments,openTabs:ui.openTabs,navCollapsed:ui.navCollapsed}))}catch(e){}window.WA_SITE.save(data)}
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
    $('#nav').innerHTML=menuHTML();
    $('#header-tasks').textContent=pendingTasks().length;$('#header-tasks').hidden=!pendingTasks().length;
    $('#workspace-tabs').innerHTML=ui.openTabs.map(id=>'<div class="workspace-tab '+(id===ui.view?'active':'')+'"><a href="#'+id+'" data-nav="'+id+'"'+(id===ui.view?' aria-current="page"':'')+'>'+icon(viewIcon(id))+'<span>'+views[id]+'</span></a>'+(id==='inbox'||id==='dashboard'||id!==ui.view?'':'<button class="icon-button" aria-label="关闭'+views[id]+'页签" data-action="closeTab" data-id="'+id+'">'+icon('X')+'</button>')+'</div>').join('');
    const collapse=$('.collapse-button');collapse.setAttribute('aria-label',ui.navCollapsed?'展开菜单':'折叠菜单');collapse.innerHTML=icon(ui.navCollapsed?'PanelLeftOpen':'PanelLeftClose')+'<span class="nav-label">'+(ui.navCollapsed?'展开':'收起')+'</span>';
    if(location.hash!=='#'+ui.view)history.replaceState(null,'','#'+ui.view);persist();
  }
  function render() {
    if(!renderSignInState())return;
    const active=document.activeElement,action=active?.dataset?.action,actionId=active?.dataset?.id,activeId=active?.id,stage=active?.dataset?.stage,nav=active?.dataset?.nav;
    const old=$('#messages'),position=old?{customer:old.dataset.customer,top:old.scrollTop,bottom:old.scrollHeight-old.clientHeight-old.scrollTop}:null;
    renderNav();const pages={dashboard:renderDashboard,inbox:renderInbox,accounts:renderAccounts,customers:renderCustomers,tags:renderTags,followups:renderFollowups,team:renderTeam,members:renderMembers,'chat-records':renderChatRecords,'tag-stats':renderTagStats,ai:renderAiPage,prices:renderPriceList};
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
  function filteredConversations(){let list=myCustomers().filter(c=>ui.account==='all'||c.account===ui.account);if(ui.conversationFilter==='unread')list=list.filter(c=>c.unread>0);if(ui.conversationFilter==='reply')list=list.filter(c=>((data.messages[c.id]||[]).at(-1)?.side||'in')==='in');if(ui.conversationFilter==='star')list=list.filter(c=>c.star);const q=ui.query.trim().toLowerCase();if(q)list=list.filter(c=>[c.name,c.phone,c.notes,account(c.account)?.name].join(' ').toLowerCase().includes(q));return openwaOrder(list)}
  function conversationRows() {
    return filteredConversations().map(c=>{const a=account(c.account);return '<button class="conversation '+(fid.chatOpen&&c.id===ui.customer?'selected':'')+'" aria-label="打开'+esc(c.name)+'的会话" data-action="openConversation" data-id="'+c.id+'">'+avatar(c)+'<span class="conversation-main"><span class="conversation-line"><strong>'+esc(c.name)+'</strong><time>'+esc(openwaLastLabel(c))+'</time></span><span class="conversation-preview"><span>'+esc(c.preview)+'</span>'+(c.unread?'<span class="unread">'+c.unread+'</span>':'')+'</span><span class="conversation-account"><span>'+(ui.account==='all'?'<span class="state-dot '+(a?.state==='online'?'':a?.state==='pending'?'offline':'warning')+'"></span>'+esc(a?.name):esc(c.stage))+'</span>'+(c.star?icon('Star'):'<span class="mini-stage">'+esc(tag(c.tags[0])?.name||c.stage)+'</span>')+'</span></span></button>'}).join('')||empty('没有匹配会话','切换筛选，或清空搜索后再试。');
  }
  function renderInbox() {
    const c=selectedCustomer();
    return '<section class="inbox-page"><div class="workspace-switch" aria-label="WhatsApp 工作区"><a class="active" href="#inbox" data-nav="inbox">'+icon('MessagesSquare')+'聚合会话</a><a href="#accounts" data-nav="accounts">'+icon('PanelsTopLeft')+'账号列表</a></div><div class="inbox-layout '+(ui.mobileChat?'mobile-chat':'mobile-list')+'"><section class="conversation-pane" aria-label="会话列表"><div class="conversation-top"><div class="conversation-title"><h1>客户会话 <span>'+myCustomers().filter(c=>ui.account==='all'||c.account===ui.account).length+'</span></h1><button class="icon-button" data-action="addCustomer" aria-label="新增客户">'+icon('SquarePen')+'</button></div><div class="account-select">'+icon('MessageCircle')+'<select id="account-filter" aria-label="按 WhatsApp 账号查看">'+option('all',manager()?'全部团队账号':'我的全部账号',ui.account)+myAccounts().map(a=>option(a.id,a.name+(a.state!=='online'?' · 待连接':''),ui.account)).join('')+'</select>'+icon('ChevronDown')+'</div><label class="search-field">'+icon('Search')+'<input id="conversation-search" aria-label="搜索会话" placeholder="搜索客户或号码…" value="'+esc(ui.query)+'"></label><div class="chips" role="group" aria-label="会话筛选">'+[['all','全部'],['unread','未读'],['reply','待回复'],['star','星标']].map(([id,title])=>'<button class="chip '+(ui.conversationFilter===id?'active':'')+'" data-action="conversationFilter" data-id="'+id+'" aria-pressed="'+(ui.conversationFilter===id)+'">'+title+'</button>').join('')+'</div></div><div class="conversation-list" id="conversation-list">'+conversationRows()+'</div><div class="conversation-footer">'+icon('ShieldCheck')+(manager()?'当前为团队视角':'当前为我的工作范围')+'</div></section>'+(c?chatHTML(c):'<section class="chat-pane"><div class="chat-empty">'+empty('选择客户后继续沟通','也可以新建一位客户。')+'</div></section>')+toolsRailHTML(c)+'</div></section>';
  }
  function chatHTML(c) {
    const a=account(c.account),online=a?.state==='online';return '<section class="chat-pane" aria-label="'+esc(c.name)+'的会话"><div class="chat-heading"><button class="icon-button back-list" data-action="backList" aria-label="返回会话列表">'+icon('ArrowLeft')+'</button>'+avatar(c)+'<div class="chat-person"><h2>'+esc(c.name)+'</h2><div class="customer-sub"><span>'+esc(a?.name)+'</span><span class="separator"></span><span>'+esc(aiLanguageLabel(c))+'</span></div></div><div class="chat-heading-actions"><button class="icon-button star-action '+(c.star?'active':'')+'" data-action="star" data-id="'+c.id+'" aria-label="'+(c.star?'取消星标':'星标客户')+'" aria-pressed="'+c.star+'">'+icon('Star')+'</button><button class="button small" data-action="followup" data-id="'+c.id+'">'+icon('CalendarPlus')+'安排跟进</button><button class="icon-button mobile-profile" data-action="profile" data-id="'+c.id+'" aria-label="查看客户资料">'+icon('ContactRound')+'</button><button class="icon-button mobile-tools" data-action="chatTools" data-id="'+c.id+'" aria-label="更多会话工具">'+icon('EllipsisVertical')+'</button></div></div><div class="source-strip">'+icon(c.source==='Facebook 广告'?'Target':'Link')+'<strong>'+esc(c.source)+'</strong><span>'+esc(c.campaign||'客户来源')+'</span>'+aiLanguagePicker(c)+'</div>'+(online?'':'<div class="connection-banner">'+icon('WifiOff')+'<div><strong>'+esc(a?.name||'账号')+' 待连接</strong><span>当前草稿会保留，连接后可继续处理。</span></div><button class="button small" data-action="connect" data-id="'+c.account+'">重新连接</button></div>')+'<div class="messages" id="messages" data-customer="'+c.id+'" role="log" aria-label="会话消息" tabindex="0">'+messagesHTML(c)+'</div>'+composerHTML(c)+'</section>';
  }
  function conversationMessages(c) {
    return data.messages[c.id]||(c.preview==='新建客户档案'?[]:[{id:'seed'+c.id,side:'in',text:c.preview,translated:c.translation,time:c.last}]);
  }
  function messagesHTML(c,{list=conversationMessages(c),showTranslation=ui.receiveTranslation,emptyHint='输入消息，或选择快捷回复开始。'}={}) {
    if(!list.length)return empty('还没有会话消息',emptyHint);
    let lastDay='';return list.map(m=>{const day=openwaDayLabel(m),separator=day!==lastDay?'<div class="day-separator">'+day+'</div>':'';lastDay=day;return separator+'<div class="message-row '+(m.side==='out'?'out':'')+'"><div><div class="message-bubble">'+openwaMediaHTML(c,m)+(openwaCaption(c,m)?'<div class="message-text">'+esc(openwaCaption(c,m))+'</div>':'')+(m.attachment?'<div class="attachment">'+icon('File')+esc(m.attachment)+'</div>':'')+(m.translated&&showTranslation?'<div class="message-translation"><span class="translation-label">'+icon('Languages')+'译文</span><div>'+esc(m.translated)+'</div></div>':'')+'</div><div class="message-meta">'+esc(openwaTimeLabel(m))+(m.side==='out'?openwaMessageMark(m):'')+'</div></div></div>'}).join('');
  }
  function composerHTML(c) {
    const d=draft(c),online=account(c.account)?.state==='online',enabled=online&&Boolean(d.text.trim());
    return '<div class="composer"><div id="translation-preview">'+previewHTML(c)+'</div><div class="composer-input"><textarea id="composer-text" aria-label="消息内容" placeholder="输入消息…">'+esc(d.text)+'</textarea><div class="composer-controls"><div class="composer-tools"><button class="icon-button" data-action="quickAll" aria-label="选择快捷回复">'+icon('MessageSquareText')+'</button>'+priceQuoteButton()+'<span class="language-hint">'+icon('Languages')+esc(aiLanguageLabel(c))+' · '+aiDraftHint(c)+'</span>'+aiGuardHTML(c)+'</div><button class="send-button" data-action="send" aria-label="发送消息"'+(!enabled?' disabled':'')+'>发送 '+icon('Send')+'</button></div></div><div class="composer-foot"><span>'+icon('Keyboard')+aiEnterHint(c)+'</span><span>'+(online?'草稿自动保存':'号码待连接 · 草稿已保留')+'</span></div></div>';
  }
  function previewHTML(c){const d=draft(c);if(!d.translated&&!ui.attachment)return '';return (d.translated?'<div class="translation-preview"><small>发送前预览 · '+esc(c.language)+'译文</small>'+esc(d.translated)+'</div>':'')+(ui.attachment?'<div class="translation-preview"><small>附件</small>'+esc(ui.attachment)+' <button class="link" data-action="removeAttachment">移除</button></div>':'')}
  function localTime(c){try{return new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:c.timezone}).format(new Date())}catch(e){return '—'}}
  function profileHTML(c,drawer=false) {
    const m=member(c.owner),a=account(c.account),task=data.tasks.filter(t=>t.customer===c.id&&!t.done).sort((a,b)=>new Date(a.due)-new Date(b.due))[0],dirty=Object.hasOwn(ui.noteDrafts,c.id);
    const details='<section class="profile-section"><h3>客户标签<button class="link" data-action="assignTags" data-id="'+c.id+'">'+icon('Plus')+'添加</button></h3><div class="tag-row">'+(tagsHTML(c,99,true)||'<span class="muted">还没有标签</span>')+'</div></section><section class="profile-section"><h3>客户归属'+(manager()?'<button class="link" data-action="transfer" data-id="'+c.id+'">转交</button>':'')+'</h3><div class="info-row"><span>负责人</span><span class="small-avatar">'+avatar(m||{name:'未分配'},'small')+esc(m?.name||'未分配')+'</span></div><div class="info-row"><span>聊天账号</span><span>'+esc(a?.name)+'</span></div>'+(c.contactRefs.length>1?'<button class="duplicate-note" data-action="duplicate" data-id="'+c.id+'">'+icon('Copy')+'另有 '+(c.contactRefs.length-1)+' 个账号接触记录'+icon('ChevronRight')+'</button>':'')+'</section><section class="profile-section"><h3>来源信息</h3><div class="profile-origin">'+icon('Target')+esc(c.source)+'</div><div class="origin-details">'+esc(c.campaign||'未关联广告活动')+'<br>'+esc(c.ad||'来源详情待补充')+'</div></section><div class="profile-permission">归属及可见范围为待确认方案。</div>';
    const activity=(data.activities[c.id]||[]).map(item=>'<div class="activity">'+esc(item.text)+'<small>'+esc(item.by)+' · '+esc(item.time)+'</small></div>').join('')||empty('还没有跟进记录','更新标签、备注或安排跟进后会显示在这里。');
    const notes='<textarea class="profile-note" data-note-customer="'+c.id+'" id="customer-note-'+c.id+(drawer?'-drawer':'')+'" aria-label="客户备注" placeholder="记下客户需求或下一步计划…">'+esc(dirty?ui.noteDrafts[c.id]:c.notes)+'</textarea><div class="note-save"><span role="status">'+(dirty?'未保存的修改':'已保存')+'</span><button class="button small" data-action="saveNote" data-id="'+c.id+'">保存备注</button></div>';
    return '<aside class="customer-profile'+(drawer?' in-drawer':'')+'" aria-label="客户资料"><div class="profile-head"><span>客户资料</span><button class="icon-button" '+(drawer?'data-action="close" aria-label="关闭客户资料"':'data-action="toggleProfile" aria-label="收起客户资料"')+'>'+icon('X')+'</button></div><div class="profile-top"><div class="profile-topline">'+avatar(c,'large')+'<div><h2>'+esc(c.name)+'</h2><p>'+esc(c.phone)+'</p></div></div><div class="profile-location"><span>'+esc(country(c))+'，'+esc(c.city)+'</span><span>当地 '+esc(localTime(c))+'</span></div></div><div class="profile-stage"><span>客户阶段</span><select data-stage="'+c.id+'" aria-label="客户阶段">'+['新客户','跟进中','已报价','已成交','培育中'].map(s=>option(s,s,c.stage)).join('')+'</select></div><section class="profile-next"><div class="profile-next-title"><strong>下一步跟进</strong><button class="icon-button" aria-label="新增跟进" data-action="followup" data-id="'+c.id+'">'+icon('Plus')+'</button></div>'+(task?'<div class="followup-card"><strong>'+esc(task.title)+'</strong><span class="due '+(beforeToday(task.due)?'overdue':'')+'">'+icon('Clock3')+dateLabel(task.due)+(beforeToday(task.due)?' · 已逾期':'')+'</span><button class="link" aria-label="完成此跟进" data-action="taskDone" data-id="'+task.id+'">'+icon('CircleCheck')+'</button></div>':'<button class="button small full" data-action="followup" data-id="'+c.id+'">'+icon('CalendarPlus')+'安排跟进</button>')+'</section><div class="profile-tabs" role="group" aria-label="客户资料内容">'+[['details','资料'],['activity','记录'],['notes','备注']].map(([id,title])=>'<button class="profile-tab '+(ui.profileTab===id?'active':'')+'" data-action="profileTab" data-id="'+id+'" data-customer="'+c.id+'" aria-pressed="'+(ui.profileTab===id)+'">'+title+'</button>').join('')+'</div><div class="profile-content">'+(ui.profileTab==='notes'?notes:ui.profileTab==='activity'?activity:details)+'</div></aside>';
  }
  function scrollMessages(){requestAnimationFrame(()=>{const el=$('#messages');if(el)el.scrollTop=el.scrollHeight})}
  function renderAccounts() {
    const list=filteredAccounts();
    return '<section class="section-page"><div class="replica-panel"><h1 class="sr-only">WhatsApp账号列表</h1><div class="channel-line"><span>业务渠道</span><span class="channel-badge">'+icon('Check')+'WhatsApp</span><span>'+(manager()?'团队账号':'我的账号')+'</span></div><div class="filter-row"><label class="filter-control wide">账号名称或号码<input id="account-query" aria-label="搜索账号" value="'+esc(ui.accountQuery)+'" placeholder="输入名称、号码或备注…"></label><label class="filter-control">连接状态<select id="account-state" aria-label="账号状态筛选">'+[['all','全部状态'],['online','在线'],['reconnect','需重连'],['pending','待连接']].map(([id,name])=>option(id,name,ui.accountStatus)).join('')+'</select></label><div class="filter-actions"><button class="button primary" data-action="queryAccounts">'+icon('Search')+'查询</button><button class="button" data-action="resetAccounts">'+icon('RotateCcw')+'清除筛选</button></div></div><div class="action-toolbar"><button class="button" data-action="addAccount">'+icon('Plus')+'添加账号</button><span class="toolbar-note">账号资料与连接状态</span></div><div class="table-wrap"><table class="data-table account-table"><thead><tr><th>序号</th><th>WhatsApp账号</th><th>在线状态</th><th>负责人</th><th>客户数</th><th>未读</th><th>待跟进</th><th>操作</th></tr></thead><tbody>'+paged(list,'accounts').map((a,i)=>{const customers=myCustomers().filter(c=>c.account===a.id);return '<tr><td>'+rowNumber('accounts',i)+'</td><td><button class="cell-link customer-cell" data-action="accountInbox" data-id="'+a.id+'" aria-label="查看'+esc(a.name)+'会话"><span class="avatar '+esc(a.color)+'">'+icon('MessageCircle')+'</span><span><strong>'+esc(a.name)+'</strong><span class="account-number">'+esc(a.number)+'</span><span class="account-note">'+esc(a.note||'暂无账号备注')+'</span></span></button></td><td>'+stateText(a)+'</td><td>'+esc(member(a.owner)?.name||'未分配')+'</td><td>'+customers.length+'</td><td>'+customers.reduce((n,c)=>n+c.unread,0)+'</td><td>'+data.tasks.filter(t=>!t.done&&customers.some(c=>c.id===t.customer)).length+'</td><td><div>'+(a.state==='online'?'<button class="button small" data-action="accountInbox" data-id="'+a.id+'">打开会话</button>':'<button class="button small" data-action="connect" data-id="'+a.id+'">'+icon('RefreshCw')+'重新连接</button>')+'<button class="icon-button" data-action="editAccount" data-id="'+a.id+'" aria-label="编辑'+esc(a.name)+'">'+icon('Pencil')+'</button></div></td></tr>'}).join('')+(!list.length?'<tr><td colspan="8">'+empty('没有匹配的账号','清除筛选，或添加一个账号。')+'</td></tr>':'')+'</tbody></table></div><div class="table-bottom"><span>共 '+myAccounts().length+' 个账号，当前匹配 '+list.length+' 个</span>'+pagerHTML(list.length,'accounts')+'</div></div><div class="helper-note">'+icon('Info')+'<div>人数与账号数可继续扩展。</div></div></section>';
  }
  function filteredCustomers(){let list=myCustomers();const q=ui.customerQuery.trim().toLowerCase();if(q)list=list.filter(c=>[c.name,c.phone,c.notes,c.source,account(c.account)?.name].join(' ').toLowerCase().includes(q));if(ui.customerTag!=='all')list=list.filter(c=>c.tags.includes(ui.customerTag));if(ui.customerStage!=='all')list=list.filter(c=>c.stage===ui.customerStage);if(manager()&&ui.customerOwner!=='all')list=list.filter(c=>c.owner===ui.customerOwner);return list}
  function customerRows() {
    const list=filteredCustomers();return paged(list,'customers').map((c,i)=>'<tr><td><input type="checkbox" data-select-customer="'+c.id+'" aria-label="选择'+esc(c.name)+'"'+(ui.selected.has(c.id)?' checked':'')+'></td><td>'+rowNumber('customers',i)+'</td><td><button class="cell-link customer-cell" data-action="profile" data-id="'+c.id+'" aria-label="查看'+esc(c.name)+'资料">'+avatar(c,'small')+'<span><strong>'+esc(c.name)+'</strong><small>'+esc(c.phone)+'</small></span></button></td><td><span class="account-cell">'+esc(account(c.account)?.name)+'</span><small class="muted">'+esc(member(c.owner)?.name||'未分配')+'</small></td><td><div class="tag-row">'+tagsHTML(c,2)+(c.tags.length>2?'<span class="muted">+'+(c.tags.length-2)+'</span>':'')+'</div></td><td><span class="stage '+(c.stage==='已成交'?'won':c.stage==='新客户'?'new':'')+'">'+esc(c.stage)+'</span></td><td>'+esc(country(c))+'</td><td>'+esc(c.source)+'</td><td><span class="'+(beforeToday(c.followup)?'notice':'')+'">'+dateLabel(c.followup)+'</span></td><td><button class="link" data-action="openConversation" data-id="'+c.id+'" aria-label="打开'+esc(c.name)+'会话">打开会话</button></td></tr>').join('')||'<tr><td colspan="10">'+empty('没有匹配客户','调整筛选条件，或新建一位客户。')+'</td></tr>';
  }
  function batchbar(){return '<div class="batchbar" id="batchbar"'+(!ui.selected.size?' hidden':'')+'><strong>已选 <span id="selected-count">'+ui.selected.size+'</span> 位客户</strong><button class="button" data-action="batchTags">'+icon('Tags')+'批量打标签</button>'+(manager()?'<button class="button" data-action="batchTransfer">'+icon('ArrowRightLeft')+'转交客户</button>':'')+'<button class="link" data-action="clearSelection">取消选择</button></div>'}
  function renderCustomers() {
    return '<section class="section-page"><div class="replica-panel"><h1 class="sr-only">客户列表</h1><div class="customer-filters"><div class="channel-line"><span>业务渠道</span><span class="channel-badge">'+icon('Check')+'WhatsApp</span></div><div class="filter-row"><label class="filter-control wide">客户检索<input id="customer-search" aria-label="搜索客户库" value="'+esc(ui.customerQuery)+'" placeholder="输入称呼、号码或备注…"></label><label class="filter-control">客户阶段<select id="customer-stage" aria-label="按阶段筛选">'+option('all','全部阶段',ui.customerStage)+['新客户','跟进中','已报价','已成交','培育中'].map(s=>option(s,s,ui.customerStage)).join('')+'</select></label>'+(manager()?'<label class="filter-control">负责人<select id="customer-owner" aria-label="按负责人筛选">'+option('all','全部负责人',ui.customerOwner)+data.members.map(m=>option(m.id,m.name,ui.customerOwner)).join('')+'</select></label>':'')+'<div class="filter-actions"><button class="button primary" data-action="queryCustomers">'+icon('Search')+'查询</button><button class="button" data-action="resetCustomerFilters">'+icon('RotateCcw')+'清除筛选</button></div></div><div class="tag-query-line"><span>标签条件</span><select id="customer-tag" aria-label="按标签筛选">'+option('all','全部标签',ui.customerTag)+myTags().map(t=>option(t.id,t.name,ui.customerTag)).join('')+'</select><button class="link" data-action="resetTagFilter">重置标签条件</button></div></div><div class="action-toolbar"><button class="button" data-action="addCustomer">'+icon('UserRoundPlus')+'新增客户</button><button class="button" data-action="batchTags">'+icon('Tags')+'批量打标签</button><button class="button" data-nav="followups">'+icon('ClipboardList')+'跟进管理</button><span class="toolbar-note">仅使用虚构号码与客户</span></div>'+batchbar()+'<div class="table-wrap"><table class="data-table"><thead><tr><th><input type="checkbox" id="select-all-customers" aria-label="选择当前结果全部客户"></th><th>序号</th><th>客户资料</th><th>账号 / 负责人</th><th>标签</th><th>客户阶段</th><th>国家 / 地区</th><th>来源</th><th>下次跟进</th><th>操作</th></tr></thead><tbody id="customer-rows">'+customerRows()+'</tbody></table></div><div class="table-bottom"><span id="customer-total">当前 '+filteredCustomers().length+' 位客户</span>'+pagerHTML(filteredCustomers().length,'customers')+'</div></div></section>';
  }
  function renderTags() {
    const groups=visibleTagGroups();if(ui.tagGroup!=='all'&&!groups.some(g=>g.id===ui.tagGroup))ui.tagGroup='all';const editable=ui.tagScope==='private'||manager(),list=filteredTags();
    return '<section class="section-page"><div class="replica-panel"><div class="section-heading"><h1>标签管理</h1><p>按分组维护标签，给客户添加工作标记。</p></div><div class="scope-tabs">'+[['team','公共标签'],['private','个人标签']].map(([id,label])=>'<button class="'+(ui.tagScope===id?'active':'')+'" data-action="tagScope" data-id="'+id+'" aria-pressed="'+(ui.tagScope===id)+'">'+label+'</button>').join('')+'</div><div class="filter-row"><label class="filter-control wide">查找标签<input id="replica-tag-search" aria-label="搜索标签" value="'+esc(ui.tagQuery)+'" placeholder="输入标签名称…"></label><div class="filter-actions"><button class="button primary" data-action="queryTags">'+icon('Search')+'查询</button><button class="button" data-action="resetTags">'+icon('RotateCcw')+'清除筛选</button></div></div><div class="action-toolbar"><button class="button" data-action="addTag"'+(ui.tagGroup!=='all'?' data-group="'+ui.tagGroup+'"':'')+(!editable?' disabled title="公共标签暂由主管维护"':'')+'>'+icon('Plus')+'添加标签</button><span class="toolbar-note">'+(ui.tagScope==='team'?'公共标签暂由主管维护，聊手可使用。':'个人标签仅当前成员维护。')+'</span></div><div class="tag-layout"><aside class="tag-group-list" aria-label="标签分组"><button class="tag-group-choice '+(ui.tagGroup==='all'?'active':'')+'" data-action="tagGroupSelect" data-id="all"><span>全部分组</span><small>'+groups.length+'</small></button>'+groups.map(g=>'<button class="tag-group-choice '+(ui.tagGroup===g.id?'active':'')+'" data-action="tagGroupSelect" data-id="'+g.id+'"><span>'+esc(g.name)+'</span><small>'+data.tags.filter(t=>t.group===g.id).length+'</small></button>').join('')+'<button class="button" data-action="addTagGroup">'+icon('Plus')+'新增分组</button></aside><div class="tag-table-area"><div class="table-wrap"><table class="data-table"><thead><tr><th>标签名称</th><th>标签预览</th><th>所属分组</th><th>客户数</th><th>操作</th></tr></thead><tbody>'+tagRows()+'</tbody></table></div><div class="table-bottom"><span>当前 '+list.length+' 个标签</span>'+pagerHTML(list.length,'tags')+'</div></div></div></div></section>';
  }
  const canEditGroup=g=>manager()||(g.scope==='private'&&g.owner===ui.persona);
  function renderFollowups() {
    const all=myTasks(),pending=all.filter(t=>!t.done),today=pending.filter(t=>sameDay(t.due)),done=all.filter(t=>t.done),list=(ui.taskFilter==='done'?done:ui.taskFilter==='today'?today:pending).sort((a,b)=>new Date(a.due)-new Date(b.due));
    return '<section class="section-page"><div class="replica-panel"><div class="section-heading"><h1>跟进管理</h1><p>查看提醒与完成状态，操作记录保留在客户资料中。</p></div><div class="scope-tabs">'+[['pending','待跟进',pending.length],['today','今天',today.length],['done','已完成',done.length]].map(([id,name,n])=>'<button class="'+(ui.taskFilter===id?'active':'')+'" data-action="taskFilter" data-id="'+id+'" aria-pressed="'+(ui.taskFilter===id)+'">'+name+' '+n+'</button>').join('')+'</div><div class="action-toolbar"><button class="button primary" data-action="newTask">'+icon('Plus')+'安排跟进</button><span class="toolbar-note">按浏览器本地时间显示</span></div><div class="table-wrap"><table class="data-table followup-table"><thead><tr><th>客户</th><th>跟进事项</th><th>负责人</th><th>账号</th><th>提醒时间</th><th>优先级</th><th>状态</th><th>操作</th></tr></thead><tbody>'+paged(list,'followups').map(t=>{const c=customer(t.customer);return '<tr><td><button class="link customer-link" data-action="openConversation" data-id="'+c.id+'">'+esc(c.name)+'</button></td><td><span class="task-title '+(t.done?'completed':'')+'">'+esc(t.title)+'</span></td><td>'+esc(member(t.owner)?.name)+'</td><td>'+esc(account(c.account)?.name)+'</td><td><span class="task-time '+(!t.done&&beforeToday(t.due)?'overdue':'')+'">'+dateLabel(t.due)+(!t.done&&beforeToday(t.due)?'<br>逾期未完成':'')+'</span></td><td>'+(t.priority==='high'?'<span class="priority-badge">重点</span>':'普通')+'</td><td><span class="table-status '+(t.done?'done':'')+'">'+icon(t.done?'CircleCheck':'Clock3')+(t.done?'已完成':'待处理')+'</span></td><td><div class="task-actions"><button class="button small" data-action="taskDone" data-id="'+t.id+'" aria-label="'+(t.done?'重新打开':'完成')+esc(t.title)+'">'+icon(t.done?'RotateCcw':'Check')+(t.done?'重新打开':'完成')+'</button><button class="icon-button" data-action="profile" data-id="'+c.id+'" aria-label="查看'+esc(c.name)+'资料">'+icon('ContactRound')+'</button></div></td></tr>'}).join('')+(!list.length?'<tr><td colspan="8">'+empty('当前没有待处理记录','切换其他状态，或安排一次跟进。')+'</td></tr>':'')+'</tbody></table></div><div class="table-bottom"><span>共 '+list.length+' 条跟进</span>'+pagerHTML(list.length,'followups')+'</div></div></section>';
  }
  function renderTeam(){if(!manager())return '<div class="view-empty"><div><h2>团队管理在主站</h2><p>子站显示当前聊手的工作范围。</p></div></div>';return '<section class="section-page">'+pageHeader('TEAM & ACCESS','团队与权限','先明确谁管理账号、谁负责客户，再决定团队数据如何共享。','<button class="button primary" data-action="addMember">'+icon('UserRoundPlus')+'新增成员</button>')+'<div class="role-count"><strong>'+data.members.length+'</strong> 位成员 <span style="margin:0 12px;color:#cad8bf">/</span> '+data.accounts.length+' 个账号 · '+data.customers.length+' 位客户</div><div class="page-panel"><div class="panel-header"><div><h2>团队成员</h2><p>人数、角色和账号分配均可继续扩展</p></div><span class="tag slate">权限方案待确认</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>成员</th><th>团队</th><th>角色</th><th>负责账号</th><th>客户</th><th>待跟进</th><th>操作</th></tr></thead><tbody>'+data.members.map(m=>'<tr><td><div class="customer-cell">'+avatar(m,'small')+'<strong>'+esc(m.name)+'</strong></div></td><td>'+esc(m.team)+'</td><td><span class="tag '+(m.role==='manager'?'purple':'jade')+'">'+(m.role==='manager'?'主管':'聊手')+'</span></td><td>'+data.accounts.filter(a=>a.owner===m.id).length+'</td><td>'+data.customers.filter(c=>c.owner===m.id).length+'</td><td>'+data.tasks.filter(t=>t.owner===m.id&&!t.done).length+'</td><td><button class="link" data-action="memberAccounts" data-id="'+m.id+'">分配账号</button></td></tr>').join('')+'</tbody></table></div></div><div class="permission-grid"><section class="permission-card"><h3>'+icon('UserRound')+'聊手 <span class="tag jade">我的工作空间</span></h3><ul><li>使用获分配的 WhatsApp 账号</li><li>查看、标记并跟进自己负责的客户</li><li>使用公共标签，维护自己的个人标签</li><li>主管可见范围与转交规则需你确认</li></ul></section><section class="permission-card"><h3>'+icon('ShieldCheck')+'主管 <span class="tag purple">团队工作空间</span></h3><ul><li>查看团队账号、客户与待办</li><li>维护公共标签，分配账号和转交客户</li><li>成员与角色可在后续扩展</li><li>此页的角色说明尚未与登录权限关联</li></ul></section></div><p class="team-section-note">“客户属于聊手还是团队”“账号转移后历史归谁”“离职交接如何处理”仍待确认。当前只是可操作的默认方案。</p></section>'}
  const scopeDescriptions={
    'P-INBOX':'按账号聚合会话，将聊天、客户档案和下一步跟进放在一起。','P-ACCOUNTS':'账号状态、备注、负责人和重新连接流程。','P-CUSTOMERS':'客户档案、来源、客户等级、客户状态、跟进状态、标签及跨账号接触记录。','P-TAGS':'公共与个人标签分组，支持打标和筛选客户。','P-FOLLOW':'每位客户要么有下一步跟进，要么已明确结束跟进；以自定义标签辅助筛选。','P-TEAM':'团队成员、账号分配和客户交接由主站管理。','P-ASSIST':'接收译文展示和快捷话术填入。','P-WALLET':'识别聊天中的加密货币钱包地址，用白名单及记录/拦截/提醒策略管控。它不是钱包余额或收款账本。','P-GUARD':'监控敏感词或删除、编辑等操作。哪些行为需要记录与提醒尚未确定。','P-AUTO':'关键词回复和欢迎语回复暂缓。','P-BROADCAST':'群发任务和在线聊天的群发功能暂缓。','P-LIFECYCLE':'客户全生命周期看板与阶段漏斗暂缓。','P-PIPELINES':'生命周期流程配置暂缓。','P-DEALS':'报价、订单与复购台账暂缓。','P-CHAT-REVIEW':'把 WhatsApp 会话的快照移入聊天记录，用于绩效复盘与审核。','P-AI':'翻译等 AI 功能经由统一接入点调用，可逐项启停并逐次记录用量。','P-ATTRIBUTION':'已有Facebook转WhatsApp背景；真实广告关联和回传待确认。','P-ORDERS':'需要对接哪些订单信息、由谁查看或操作，后续再明确。','P-NETWORK':'代理与会话环境依赖最终接入路线，不先把配置入口塞进工作台。','P-LEGACY':'出海猫的工单、底库、分流和号池，逐项对照你的业务再决定。','P-COMMERCIAL':'套餐售卖、充值、推广返利、字符售卖和端口授权不出现在内部工作台。'};
  function modal(title,body,footer='',options={}) {
    const dlg=$('#dialog');if(dlg.open)dlg.close();dlg.className=options.drawer?'drawer':options.wide?'wide':'';dlg.setAttribute('aria-label',title);
    $('#dialog-content').innerHTML='<div class="modal-head"><h2>'+esc(title)+'</h2><button class="icon-button" data-action="close" aria-label="关闭弹窗">'+icon('X')+'</button></div>'+body+(footer?'<div class="modal-footer">'+footer+'</div>':'');paintIcons(dlg);dlg.showModal();
  }
  const close=()=>$('#dialog').close();
  const cancel='<button class="button" data-action="close">取消</button>';
  function formModal(title,formId,body,submitLabel='保存',options={}){modal(title,'<form id="'+formId+'" novalidate><div class="modal-body">'+body+'<div class="form-error" id="form-error" role="alert"></div></div><div class="modal-footer"><span class="footnote">保存后同步到服务器</span>'+cancel+'<button class="button primary" type="submit">'+submitLabel+'</button></div></form>','',options)}
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
  function openAccountForm(id=null){const a=id?account(id):null;if(a&&!myAccounts().includes(a))return;formModal(a?'编辑账号':'添加 WhatsApp 账号','account-form','<input type="hidden" name="id" value="'+esc(a?.id||'')+'"><p class="modal-description">填写账号信息与负责人。扫码绑定在「号码管理」中进行。</p><div class="form-grid"><label class="field full">账号名称<input name="name" required maxlength="40" placeholder="例如：美国 · 咨询 04" value="'+esc(a?.name||'')+'"></label><label class="field">号码（选填）<input name="number" placeholder="+1 …" value="'+esc(a?.number||'')+'"></label><label class="field">服务地区<select name="country">'+option('US','美国',a?.country||'US')+option('PR','波多黎各',a?.country||'US')+option('OTHER','其他地区',a?.country||'US')+'</select></label>'+(manager()?'<label class="field full">负责人<select name="owner">'+data.members.map(m=>option(m.id,m.name,a?.owner||ui.persona)).join('')+'</select></label>':'')+'<label class="field full">账号备注<textarea name="note" placeholder="账号用途、服务范围或注意事项">'+esc(a?.note||'')+'</textarea></label></div>',a?'保存信息':'添加账号')}
  function openCustomerForm(){const accounts=myAccounts();if(!accounts.length)return toast('请先添加账号。');formModal('新增客户','customer-form','<div class="form-grid"><label class="field full">客户称呼<input name="name" required maxlength="50" placeholder="客户姓名或备注名"></label><label class="field">WhatsApp 号码<input name="phone" required placeholder="含国家区号"></label><label class="field">沟通语言<select name="language">'+option('英语','英语','英语')+option('西班牙语','西班牙语','英语')+option('其他','其他','英语')+'</select></label><label class="field full">归属账号<select name="account">'+accounts.map(a=>option(a.id,a.name,accounts.find(x=>x.id===ui.account)?.id||accounts[0].id)).join('')+'</select></label><label class="field">国家 / 地区<select name="country">'+option('US','美国','US')+option('PR','波多黎各','US')+option('OTHER','其他','US')+'</select></label><label class="field">客户来源<select name="source">'+['手动添加','Facebook 广告','网站咨询','客户转介绍','其他'].map(s=>option(s,s,'手动添加')).join('')+'</select></label><label class="field full">客户备注<textarea name="notes" placeholder="记下已知需求或下一步计划"></textarea></label></div>','创建客户')}
  function openMemberForm(){if(!manager())return;formModal('新增团队成员','member-form','<p class="modal-description">这里只登记成员资料，不会发送邀请，也不会开通登录账号。</p><div class="form-grid"><label class="field full">成员姓名<input name="name" required maxlength="30" placeholder="成员姓名"></label><label class="field">所属团队<input name="team" required value="北美一组"></label><label class="field">角色<select name="role">'+option('agent','聊手','agent')+option('manager','主管','agent')+'</select></label></div>','创建成员')}
  function openMemberAccounts(id){if(!manager())return;const m=member(id);formModal('为 '+m.name+' 分配账号','member-accounts-form','<input type="hidden" name="member" value="'+id+'"><p class="modal-description">选择后将改变账号负责人；客户归属本轮保持独立，客户转交需单独处理。</p><div class="choice-list">'+data.accounts.map(a=>'<label class="choice-option" style="width:100%;justify-content:space-between"><span><input type="checkbox" name="accounts" value="'+a.id+'"'+(a.owner===id?' checked':'')+'> '+esc(a.name)+'</span><small>当前：'+esc(member(a.owner)?.name||'未分配')+'</small></label>').join('')+'</div><p class="transfer-note">取消此成员已分配的账号会将它改为未分配。账号转交时的历史访问范围仍待确认。</p>','保存分配')}
  function openTransfer(ids){if(!manager())return;const list=ids.map(customer).filter(Boolean);if(!list.length)return toast('请先选择客户。');formModal('转交客户','transfer-form','<input name="ids" type="hidden" value="'+list.map(c=>c.id).join(',')+'"><p class="modal-description">把 '+list.map(c=>esc(c.name)).join('、')+' 转给新的负责人。只改变客户与未完成跟进的负责人，不移动账号。</p><label class="field">接收成员<select name="owner">'+data.members.filter(m=>m.role==='agent').map(m=>option(m.id,m.name+(m.id===list[0].owner?'（当前负责人）':''),'')).join('')+'</select></label><label class="field" style="margin-top:18px">交接说明<textarea name="reason" placeholder="写明客户现状与下一步事项"></textarea></label><p class="transfer-note">转交后的消息访问、历史档案、个人标签和账号授权之间的关系，需要进一步确定。</p>','确认转交')}
  function openDuplicate(id){const c=customer(id);modal('跨账号接触记录','<div class="modal-body"><p class="modal-description">'+esc(c.name)+' 在多个账号下有接触记录。这里只做提示，不会自动合并、抢单或改归属。</p>'+c.contactRefs.map(r=>{const mine=manager()||r.owner===ui.persona;return '<div class="duplicate-item">'+icon(mine?'MessageCircle':'LockKeyhole')+'<div><strong>'+esc(mine?account(r.account)?.name:'其他成员负责的账号')+'</strong><small>'+esc(mine?member(r.owner)?.name:'当前视角不展示对方客户资料')+'</small></div></div>'}).join('')+'<p class="review-hint">同一位客户由谁跟进，请在团队内约定。</p></div>','<button class="button primary" data-action="close">知道了</button>')}
  function openQuick(){modal('快捷回复','<div class="modal-body"><p class="modal-description">选择一条填入输入框，可修改后再发送。</p><div class="quick-list">'+data.quickReplies.filter(q=>!q.owner||q.owner===ui.persona||manager()).map(q=>'<button class="quick-card" data-action="quick" data-id="'+q.id+'"><strong>'+esc(q.title)+'<small>'+esc(q.scope)+'</small></strong><p>'+esc(q.zh)+'</p></button>').join('')+'</div></div>','',{eyebrow:'QUICK REPLIES'})}
  function fillQuick(id){const q=data.quickReplies.find(q=>q.id===id),c=selectedCustomer();if(!q||!c)return;ui.drafts[c.id]={text:q.zh,translated:c.language==='西班牙语'?q.es:q.en,source:q.zh};persist();if($('#dialog').open)close();if(ui.view!=='inbox')navigate('inbox');else{const box=$('.chat-pane');box.outerHTML=chatHTML(c);paintIcons();scrollMessages()}$('#composer-text')?.focus()}
  function send() {}
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
  function menuHTML(){const open=ui.customerNavOpen;return '<div class="nav-caption">工作空间</div>'+menuLink('inbox','聚合会话')+menuLink('accounts','WhatsApp账号')+'<div class="nav-caption">客户运营</div><button class="nav-group-button '+(['customers','tags','followups'].includes(ui.view)?'group-active':'')+'" data-action="toggleCustomerNav" aria-expanded="'+open+'">'+icon('ContactRound')+'<span class="nav-label">客户管理</span>'+icon(open?'ChevronUp':'ChevronDown')+'</button><div class="submenu"'+(!open?' hidden':'')+'>'+menuLink('customers','客户列表',true)+menuLink('tags','标签管理',true)+menuLink('followups','跟进管理',true)+'</div>'+(manager()?'<div class="nav-caption">团队协作</div>'+menuLink('team','团队与权限'):'')+'<div class="nav-caption">内部使用</div>'}
  function toolsRailHTML(c){const id=c?.id||'';return '<aside class="tool-rail" aria-label="会话工具"><button class="icon-button" data-action="profile" data-id="'+id+'" aria-label="查看客户资料"'+(!c?' disabled':'')+'>'+icon('ContactRound')+'</button><button class="icon-button" data-action="quickAll" aria-label="选择快捷回复"'+(!c?' disabled':'')+'>'+icon('MessageSquareText')+'</button><button class="icon-button" data-action="followup" data-id="'+id+'" aria-label="安排客户跟进"'+(!c?' disabled':'')+'>'+icon('CalendarPlus')+'</button><button class="icon-button" data-action="profileNote" data-id="'+id+'" aria-label="查看客户备注"'+(!c?' disabled':'')+'>'+icon('NotebookPen')+'</button><span class="tool-separator"></span><a class="icon-button" href="#accounts" data-nav="accounts" aria-label="管理WhatsApp账号" title="管理WhatsApp账号">'+icon('Settings2')+'</a><button class="icon-button" data-action="refreshUI" aria-label="刷新视图">'+icon('RefreshCw')+'</button></aside>'}
  function filteredAccounts(){const q=ui.accountQuery.trim().toLowerCase();return myAccounts().filter(a=>(ui.accountStatus==='all'||a.state===ui.accountStatus)&&(!q||[a.name,a.number,a.note,member(a.owner)?.name].join(' ').toLowerCase().includes(q)))}
  function visibleTagGroups(){return data.tagGroups.filter(g=>g.scope===ui.tagScope&&(g.scope==='team'||g.owner===ui.persona||manager()))}
  function filteredTags(){const groups=visibleTagGroups(),q=ui.tagQuery.trim().toLowerCase();return data.tags.filter(t=>groups.some(g=>g.id===t.group)&&(ui.tagGroup==='all'||t.group===ui.tagGroup)&&(!q||t.name.toLowerCase().includes(q)))}
  function tagRows(){const list=filteredTags();return paged(list,'tags').map(t=>'<tr><td>'+esc(t.name)+'</td><td><button class="tag '+esc(t.color)+'" data-action="tagCustomers" data-id="'+t.id+'">'+esc(t.name)+'</button></td><td>'+esc(group(t.group)?.name)+'</td><td>'+myCustomers().filter(c=>c.tags.includes(t.id)).length+'</td><td><div class="task-actions"><button class="link" data-action="tagCustomers" data-id="'+t.id+'">查看客户</button>'+(canEditGroup(group(t.group))?'<button class="icon-button" data-action="editTag" data-id="'+t.id+'" aria-label="编辑标签'+esc(t.name)+'">'+icon('Pencil')+'</button>':'')+'</div></td></tr>').join('')||'<tr><td colspan="5">'+empty('没有匹配标签','选择其他分组，或在有权限的范围添加标签。')+'</td></tr>'}
  function paged(list,view){const size=ui.pageSizes[view]||10,max=Math.max(0,Math.ceil(list.length/size)-1);ui.pages[view]=Math.min(max,Math.max(0,ui.pages[view]||0));return list.slice(ui.pages[view]*size,(ui.pages[view]+1)*size)}
  function rowNumber(view,i){return (ui.pages[view]||0)*(ui.pageSizes[view]||10)+i+1}
  function pagerHTML(total,view){const size=ui.pageSizes[view]||10,max=Math.max(1,Math.ceil(total/size)),page=Math.min(max,(ui.pages[view]||0)+1);return '<div class="pagination" id="'+view+'-pager"><span class="total-count">共 '+total+' 条</span><select data-page-size="'+view+'" aria-label="'+views[view]+'每页数量">'+[10,20,50].map(n=>option(String(n),n+'条/页',String(size))).join('')+'</select><button class="icon-button" data-action="turnPage" data-id="-1" data-view="'+view+'" aria-label="'+views[view]+'上一页"'+(page===1?' disabled':'')+'>'+icon('ChevronLeft')+'</button><span class="page-current">'+page+'</span><button class="icon-button" data-action="turnPage" data-id="1" data-view="'+view+'" aria-label="'+views[view]+'下一页"'+(page===max?' disabled':'')+'>'+icon('ChevronRight')+'</button><span class="jump-label">前往</span><input type="number" min="1" max="'+max+'" value="'+page+'" data-page-jump="'+view+'" aria-label="'+views[view]+'页码"><span class="jump-label">页</span></div>'}
  function openChatTools(id){modal('会话工具','<div class="modal-body"><div class="mobile-tool-menu"><button data-action="profile" data-id="'+id+'">'+icon('ContactRound')+'客户资料</button><button data-action="quickAll">'+icon('MessageSquareText')+'快捷回复</button><button data-action="followup" data-id="'+id+'">'+icon('CalendarPlus')+'安排跟进</button><button data-action="profileNote" data-id="'+id+'">'+icon('NotebookPen')+'客户备注</button><a href="#accounts" data-nav="accounts">'+icon('Settings2')+'账号管理</a></div></div>')}
  
  document.addEventListener('click',e=>{
    const nav=e.target.closest('[data-nav]');if(nav){if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();if($('#dialog').open)close();if(customerMenu.includes(nav.dataset.nav))ui.customerNavOpen=true;if(operationsMenu.includes(nav.dataset.nav))fid.operationsOpen=true;navigate(nav.dataset.nav);return}
    const btn=e.target.closest('[data-action]');if(!btn)return;const a=btn.dataset.action,id=btn.dataset.id;
    switch(a){
      case 'close':close();break;
      case 'toggleSidebar':if(matchMedia('(max-width:760px)').matches)modal('功能导航','<div class="mobile-menu">'+menuHTML(true)+'</div>');else{ui.navCollapsed=!ui.navCollapsed;renderNav();paintIcons();persist()}break;
      case 'toggleCustomerNav':ui.customerNavOpen=!ui.customerNavOpen;renderNav();if($('#dialog').open&&$('#dialog .mobile-menu')){$('#dialog .mobile-menu').innerHTML=menuHTML(true);paintIcons($('#dialog'));$('#dialog .nav-group-button')?.focus()}else paintIcons();break;
      case 'closeTab':{if(id==='inbox'||id==='dashboard')break;const i=ui.openTabs.indexOf(id);ui.openTabs=ui.openTabs.filter(x=>x!==id);if(ui.view===id)navigate(ui.openTabs[Math.max(0,i-1)]||'inbox','replace');else{renderNav();paintIcons()}persist();break}
      case 'profileNote':ui.profileTab='notes';openProfile(id);break;
      case 'chatTools':openChatTools(id);break;
      case 'refreshUI':render();toast('已刷新当前视图。');break;
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
      case 'openConversation':{const c=customer(id);if(!c||!myCustomers().includes(c))return;ui.customer=id;if(ui.view==='dashboard'){ui.query='';ui.conversationFilter='all'}if(ui.view!=='inbox'||(ui.account!=='all'&&c.account!==ui.account))ui.account='all';ui.mobileChat=true;c.unread=0;ui.profileTab='details';if($('#dialog').open)close();persist();navigate('inbox');break}
      case 'backList':ui.mobileChat=false;render();break;
      case 'conversationFilter':ui.conversationFilter=id;render();break;
      case 'star':{const c=customer(id);c.star=!c.star;persist();render();break}
      case 'profile':openProfile(id);break;
      case 'profileTab':switchProfileTab(id,btn.dataset.customer);break;
      case 'saveNote':{const c=customer(id);c.notes=btn.closest('.customer-profile').querySelector('.profile-note').value;delete ui.noteDrafts[c.id];addActivity(c.id,'更新客户备注');persist();btn.closest('.customer-profile').querySelector('.note-save span').textContent='已保存';toast('客户备注已保存。');break}
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
      case 'quickAll':openQuick();break;
      case 'quick':fillQuick(id);break;
      case 'send':send();break;
      case 'removeAttachment':ui.attachment=null;persist();updateSendState(selectedCustomer());$('#translation-preview').innerHTML=previewHTML(selectedCustomer());paintIcons();break;
    }
  });
  document.addEventListener('input',e=>{
    const t=e.target;
    if(t.id==='conversation-search'){ui.query=t.value;$('#conversation-list').innerHTML=conversationRows();paintIcons($('#conversation-list'))}
    if(t.id==='customer-search'&&!t.closest('.fid-customer-filter')){ui.customerQuery=t.value;ui.selected.clear();updateCustomerRows()}
    if(t.id==='composer-text'){const c=selectedCustomer();const old=draft(c);ui.drafts[c.id]={text:t.value,translated:old.source===t.value?old.translated:'',source:old.source};$('#translation-preview').innerHTML=previewHTML(c);paintIcons($('#translation-preview'));persist();updateSendState(c);const hint=$('.language-hint');if(hint){hint.innerHTML=icon('Languages')+esc(aiLanguageLabel(c))+' · '+aiDraftHint(c);paintIcons(hint)}}
    if(t.dataset.noteCustomer){ui.noteDrafts[t.dataset.noteCustomer]=t.value;persist();t.closest('.customer-profile').querySelector('.note-save span').textContent='未保存的修改'}
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
    if(t.id==='receive-translation'){ui.receiveTranslation=t.checked;persist();if(ui.view==='inbox'&&$('#messages')){const c=selectedCustomer();$('#messages').innerHTML=messagesHTML(c);paintIcons($('#messages'))}toast(t.checked?'已展开中文译文。':'已收起中文译文。')}
  });
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!$('#dialog').open&&!e.target.closest('input,textarea,select,[contenteditable]')){const search=$('#conversation-search')||$('#customer-search');if(search){e.preventDefault();search.focus()}}if(e.target.id==='composer-text'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send()}});
  document.addEventListener('submit',e=>{
    const form=e.target,formId=form.getAttribute('id')||'';if(!formId.endsWith('-form'))return;e.preventDefault();form.querySelectorAll('[aria-invalid]').forEach(x=>{x.removeAttribute('aria-invalid');x.removeAttribute('aria-describedby')});form.querySelectorAll('.field-error').forEach(x=>x.remove());const f=new FormData(form),val=k=>String(f.get(k)||'').trim();
    if(formId==='account-form'){const name=val('name');if(!name)return error('请填写账号名称。');let a=account(val('id'));const values={name,number:val('number')||'号码待授权后识别',country:val('country'),note:val('note'),owner:manager()?val('owner'):ui.persona};if(a)Object.assign(a,values);else data.accounts.push({id:nextId('a'),...values,state:'pending',color:['jade','blue','peach','purple','gold'][data.accounts.length%5],lastSync:'尚未连接'});persist();close();render();toast('账号已保存；在号码管理中扫码绑定后开始收发。')}
    if(formId==='customer-form'){if(!val('name')||!val('phone'))return error('请填写客户称呼和 WhatsApp 号码。');const phone=val('phone').replace(/[^\d]/g,'');if(phone.length<7)return error('请使用包含国家区号的号码。');const duplicate=data.customers.find(c=>c.phone.replace(/[^\d]/g,'')===phone);if(duplicate)return error('已有使用该号码的客户。');const a=account(val('account'));const c={id:nextId('c'),createdAt:new Date().toISOString(),name:val('name'),initials:initial(val('name')),phone:val('phone'),country:val('country'),city:'待补充',timezone:val('country')==='PR'?'America/Puerto_Rico':'America/New_York',language:val('language'),owner:a.owner||ui.persona,account:a.id,tags:[],stage:'新客户',source:val('source'),campaign:'',ad:'',unread:0,star:false,last:'刚刚',preview:'新建客户档案',translation:'',followup:null,notes:val('notes'),color:'jade',contactRefs:[{account:a.id,owner:a.owner||ui.persona}]};data.customers.unshift(c);addActivity(c.id,'手动建立客户档案');persist();close();render();toast('客户档案已创建。')}
    if(formId==='tag-form'){const name=val('name'),gid=val('group');if(!name)return error('请填写标签名称。');const g=group(gid);if(!g||!canEditGroup(g))return error('没有修改此分组的权限。');const t=tag(val('id'));if(data.tags.some(x=>x.name===name&&x.group===gid&&x.id!==t?.id))return error('同一分组已存在这个标签。');if(t)Object.assign(t,{name,group:gid,color:val('color')});else data.tags.push({id:nextId('tag'),name,group:gid,color:val('color')});ui.tagScope=g.scope;persist();close();render();toast('标签已保存。')}
    if(formId==='group-form'){if(!val('name'))return error('请填写分组名称。');const scope=manager()?val('scope'):'private';data.tagGroups.push({id:nextId('g'),name:val('name'),scope,owner:scope==='private'?ui.persona:null});ui.tagScope=scope;persist();close();navigate('tags');toast('标签分组已创建。')}
    if(formId==='assign-tags-form'){const ids=val('ids').split(','),selected=f.getAll('tags');for(const id of ids){const c=customer(id);if(!c||!myCustomers().includes(c))continue;c.tags=ids.length===1?selected:[...new Set([...c.tags,...selected])];addActivity(c.id,'更新客户标签')}persist();close();render();toast(ids.length===1?'客户标签已更新。':'已为所选客户追加标签。')}
    if(formId==='followup-form'){const c=customer(val('customer'));if(!c||!val('title')||!val('due'))return error('请填写客户、跟进事项和时间。');const due=new Date(val('due'));if(Number.isNaN(due.getTime()))return error('请填写有效的时间。');data.tasks.push({id:nextId('t'),customer:c.id,owner:c.owner,title:val('title'),due:due.toISOString(),priority:val('priority'),done:false});const tasks=data.tasks.filter(t=>t.customer===c.id&&!t.done).sort((a,b)=>new Date(a.due)-new Date(b.due));c.followup=tasks[0].due;addActivity(c.id,'安排跟进：'+val('title'));persist();close();render();toast('跟进已安排，客户档案与待办已同步。')}
    if(formId==='member-form'){if(!manager())return;if(!val('name')||!val('team'))return error('请填写成员姓名和团队。');data.members.push({id:nextId('u'),name:val('name'),initial:val('name').slice(-1),role:val('role'),team:val('team'),color:'blue'});persist();close();render();toast('成员已创建，可继续分配账号。')}
    if(formId==='member-accounts-form'){if(!manager())return;const id=val('member'),chosen=f.getAll('accounts');for(const a of data.accounts){if(chosen.includes(a.id))a.owner=id;else if(a.owner===id)a.owner=null}persist();close();render();toast('账号分配已更新，客户归属未改变。')}
    if(formId==='transfer-form'){if(!manager())return;const ids=val('ids').split(','),owner=val('owner');if(!member(owner))return error('请选择接收成员。');for(const id of ids){const c=customer(id);if(!c)continue;const old=member(c.owner)?.name;c.owner=owner;data.tasks.filter(t=>t.customer===id&&!t.done).forEach(t=>t.owner=owner);addActivity(id,'客户由 '+old+' 转交给 '+member(owner).name+(val('reason')?'：'+val('reason'):''))}persist();close();ui.selected.clear();render();toast('客户与未完成待办已转交。账号归属未改变。')}
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
    logFilter:{start:'',end:'',app:'all',field:'customer',query:''} };
  const oldFollowupView = renderFollowups;
  const customerMenu = ['customers','chat-records','tags','tag-stats','followups'];
  // Empty while the materials screen is hidden (plan 032): it comes back with real files.
  const operationsMenu = [];
  const fidDate = v => !v ? '—' : Number.isNaN(new Date(v).getTime()) ? String(v) : new Date(v).toLocaleString('sv-SE').slice(0,16);
  const fidDay = (offset=0) => new Date(Date.now()+offset*86400000).toISOString();
  const fidStages = ['新客户','跟进中','已报价','已成交','培育中'];
  const fidPerms = ['账号列表','WhatsApp API','客户列表','标签管理','跟进记录'];
  const fidMemberRole = m => m?.roleGroup || (m?.role==='manager'?'lead':'agent');
  const fidRole = id => data.roleGroups.find(r=>r.id===id);
  const fidGroupList = () => data.tagGroups.filter(g=>g.scope==='team'||g.owner===ui.persona||manager());
  const fidBaseTags=tagsHTML;
  tagsHTML=function(c,max=99,remove=false){const allowed=new Set(myTags().map(t=>t.id));return fidBaseTags({...c,tags:c.tags.filter(id=>allowed.has(id))},max,remove);};
  function fidMigrateTags() {
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

  viewIcon = id => ({dashboard:'LayoutDashboard',inbox:'MessageCircle',accounts:'Smartphone',customers:'ContactRound','chat-records':'MessagesSquare',tags:'Tags','tag-stats':'ChartColumn',followups:'ClipboardList',materials:'Images',team:'Network',members:'UsersRound'}[id]||'FileText');
  menuLink = function(id,label,child=false,mobile=false) {
    return `<a class="nav-item ${ui.view===id?'active':''}" href="#${id}" data-nav="${id}" aria-label="${esc(label)}" title="${esc(label)}" ${ui.view===id?'aria-current="page"':''}>${icon(viewIcon(id))}<span class="nav-label">${esc(label)}</span></a>`;
  };
  menuHTML = function(mobile=false) {
    const navGroup=(title,glyph,action,opened,ids)=>`<button class="nav-group-button ${ids.includes(ui.view)?'group-active':''}" data-action="${action}" aria-expanded="${opened}">${icon(glyph)}<span class="nav-label">${title}</span>${icon(opened?'ChevronUp':'ChevronDown')}</button><div class="submenu" ${opened?'':'hidden'}>${ids.map(id=>menuLink(id,views[id],true)).join('')}</div>`;
    return menuLink('dashboard',views.dashboard)+menuLink('accounts',views.accounts)+menuLink('inbox',views.inbox)+'<div class="nav-caption">客户运营</div>'+navGroup('客户管理','ContactRound','fidNavCustomers',ui.customerNavOpen,customerMenu)+navGroup('运营管理','ChartColumn','fidNavOperations',fid.operationsOpen,operationsMenu)+(manager()?'<div class="nav-caption">账户与组织</div>'+navGroup('组织管理','Network','fidNavOrg',fid.orgOpen,['team','members']):'');
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
    toast('已删除 '+selected.length+' 个标签。',()=>{
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
    const toolbar=`<div class="fid-actions fid-list-toolbar">${fidButton('批量打标签','batchTags','Tag','gradient',selected?'':'disabled')}${fidButton('清空标签','fidClearCustomerTags','Eraser','',selected?'':'disabled')}${fidButton('跟进记录','','ClipboardList','green','data-nav="followups"')}${fidButton('导出列表','fidExportCustomers','FileDown')}${fidButton('新增客户','addCustomer','Plus','slim')}${manager()&&selected?fidButton('转交客户','batchTransfer','ArrowRightLeft','slim'):''}</div>`;
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
      <td>${esc(country(a))}</td><td>—</td><td>—</td><td>—</td>
      <td><div class="fid-icon-actions">${fidIcon('编辑'+a.name,'editAccount','SquarePen',a.id)}${a.state!=='online'?fidIcon('重连'+a.name,'connect','RefreshCw',a.id):fidIcon('打开'+a.name+'会话','accountInbox','MessageCircle',a.id)}</div></td>
    </tr>`).join('');
    const columns=['<input type="checkbox" id="fid-account-all" aria-label="全选账号">','序号','主账号详情','用户名/ID','手机号','在线状态','注释','备注','首登时间/最近活跃','地区','版本号','主页地址','二维码','操作'];
    return `<section class="fid-page fid-accounts"><h1 class="sr-only">账号列表</h1>${top}${filters}${toolbar}<div class="fid-table-card">${fidTable('fid-account-table',columns,rows,'暂无数据',true)}${fidPager(list.length,'accounts')}</div></section>`;
  };
  const fidSelectedAccounts=()=>myAccounts().filter(a=>fid.accountChecked.has(a.id));

  function fidLogs() {
    const f=fid.logFilter;
    return myCustomers().flatMap(c=>(data.activities[c.id]||[]).map((entry,i)=>({c,entry,at:entry.createdAt||fidDay(-i-1),kind:entry.text.includes('标签')?'标签修改':entry.text.includes('跟进')?'跟进记录':'资料更新'})))
      .filter(({c,entry,at})=>fidInRange(at,f.start,f.end)&&fidMatch({customer:[c.name,c.phone].join(' '),text:entry.text,actor:entry.by}[f.field],f.query)).sort((a,b)=>b.at.localeCompare(a.at));
  }
  renderFollowups = function() {
    if(fid.followMode==='todo')return oldFollowupView().replace('<section class="section-page">','<section class="section-page"><div class="fid-actions fid-return-tasks">'+fidButton('返回跟进记录','fidLogHistory','ArrowLeft')+'</div>').replace('跟进管理</h1>','跟进待办</h1>');
    const f=fid.logFilter,rows=fidLogs(),body=paged(rows,'followups').map(({c,entry,at,kind})=>`<tr><td>${esc(entry.by)}</td><td>${esc(kind)}</td><td>${esc(account(c.account)?.name||'—')}</td><td><button class="fid-link" data-action="profile" ${fidActionID(c.id)}>${esc(c.name)}</button></td><td>${esc(c.phone)}</td><td>${esc(fidDate(at))}</td><td>${esc(entry.text)}</td></tr>`).join('');
    return `<section class="fid-page"><div class="fid-panel fid-log">${fidHead('跟进记录','客户资料、标签与跟进操作会记录在这里。')}<form class="fid-filter-row fid-log-filter" id="fid-log-search-form"><div class="fid-range">${icon('Clock3')}<input id="fid-log-start" aria-label="开始时间" placeholder="开始时间" value="${esc(f.start)}" data-fid-date><span>~</span><input id="fid-log-end" aria-label="截止时间" placeholder="截止时间" value="${esc(f.end)}" data-fid-date></div><select class="fid-select" id="fid-log-app" aria-label="选择APP">${fidOption([['all','请选择APP'],['wa','WhatsApp']],f.app)}</select><div class="fid-joined"><select class="fid-select" id="fid-log-field" aria-label="跟进查询字段">${fidOption([['customer','线索账号'],['text','内容'],['actor','操作人']],f.field)}</select><input class="fid-input" id="fid-log-query" aria-label="搜索跟进记录" placeholder="请输入线索账号或内容" value="${esc(f.query)}"></div><button class="fid-btn blue" type="submit">${icon('Search')}搜索</button>${fidButton('重选','fidLogReset','RotateCw')}</form><div class="fid-log-line"><button class="fid-link" data-action="fidTasks">跟进待办 (${pendingTasks().length})</button></div>${fidTable('fid-log-table',['操作人','操作类型','主账号','线索账号信息','线索账号','创建日期','内容'],body)}${fidPager(rows.length,'followups')}</div></section>`;
  };

  toolsRailHTML = function(c) {
    const t=(label,action,glyph,needs=false)=>`<button class="icon-button" data-action="${action}" ${fidActionID(c?.id||'')} aria-label="${label}" ${needs&&!c?'disabled':''}>${icon(glyph)}</button>`;
    return `<aside class="tool-rail" aria-label="会话工具">${t('会话筛选','fidChatFilters','Bot')}${t('查看客户资料','profile','ContactRound',true)}${t('安排客户跟进','followup','ListOrdered',true)}${t('客户标签','assignTags','Tags',true)}${t('查看客户备注','profileNote','StickyNote',true)}<span class="tool-separator"></span>${t('刷新视图','refreshUI','RefreshCw')}${t('权限说明','fidChatPermissions','ShieldCheck')}</aside>`;
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
    const rows=paged(list,'members').map((m,i)=>`<tr><td>${rowNumber('members',i)}</td><td>${esc(m.login||m.id)}</td><td>${esc(m.name)}</td><td>${esc(fidRole(fidMemberRole(m))?.name||'—')}</td><td>${esc(m.note||m.team)}</td><td><span class="tag ${m.enabled!==false?'jade':'slate'}">${m.enabled!==false?'正常':'禁用'}</span></td><td>—</td><td>${esc(fidDate(m.created||fidDay(-7)))}</td><td><div class="fid-icon-actions">${fidIcon('编辑子账号'+m.name,'fidMemberEdit','SquarePen',m.id)}${fidIcon('分配账号给'+m.name,'memberAccounts','UsersRound',m.id)}</div></td></tr>`).join('');
    return `<section class="fid-page">${fidOrgHead('账号管理','为员工建立子账号，并用权限组管理可查看和可操作的页面。','fidMemberAdd','新增子账号','UsersRound')}<p class="fid-org-help">子账号的资料、权限组和备注在这里维护。</p><form class="fid-filter-row fid-org-filter" id="fid-member-search-form"><input id="fid-member-id" class="fid-input" placeholder="账号" aria-label="筛选账号" value="${esc(f.id)}"><input id="fid-member-name" class="fid-input" placeholder="昵称 / 备注" aria-label="筛选昵称或备注" value="${esc(f.name)}"><select class="fid-select" id="fid-member-role" aria-label="筛选权限组">${fidOption([['all','全部权限组'],...data.roleGroups.map(g=>[g.id,g.name])],f.role)}</select><select class="fid-select" id="fid-member-status" aria-label="筛选子账号状态">${fidOption([['all','全部状态'],['enabled','正常'],['disabled','禁用']],f.status)}</select><button type="submit" class="fid-btn gradient">${icon('Search')}搜索</button>${fidButton('重置','fidMemberReset')}</form><div class="fid-table-card">${fidTable('fid-org-table fid-member-table',['序号','账号','昵称','权限组','备注','状态','最近登录','创建时间','操作'],rows,'暂无子账号',true,'UsersRound')}${fidPager(list.length,'members',[10,20,50])}</div></section>`;
  }
  function fidPermissionTree(g,readOnly=false) {
    return `<div class="fid-permission-box">${fidPerms.map((page,i)=>`<div class="fid-permission-row"><label><input type="checkbox" name="view" value="${esc(page)}" data-fid-perm="${i}" ${g?.view.includes(page)?'checked':''} ${readOnly?'disabled':''}>${esc(page)}</label><label><input type="checkbox" name="write" value="${esc(page)}" data-fid-perm="${i}" ${g?.write.includes(page)?'checked':''} ${readOnly?'disabled':''}>操作</label></div>`).join('')}</div>`;
  }
  function fidRoleEdit(id='') {
    if(!manager())return;const g=fidRole(id);
    fidForm(g?'编辑权限组':'新增权限组','fid-role',`<input type="hidden" name="id" value="${esc(id)}">${fidFormRow('权限组名称',fidCountField('fid-role-name','name',g?.name||'',30,'请输入权限组名称',true),'fid-role-name',true)}${fidFormRow('状态',`<select name="enabled" id="fid-role-enabled" class="fid-select" ${g?.builtIn?'disabled':''}>${fidOption([['1','正常'],['0','禁用']],g?.enabled===false?'0':'1')}</select>`,'fid-role-enabled')}${fidFormRow('页面权限',fidPermissionTree(g)+'<small class="fid-field-help">勾选操作会同时勾选查看。</small>')}`,'保存',{wide:true,saveLast:true});
  }
  function fidMemberEdit(id='') {
    if(!manager())return;const m=member(id),roles=data.roleGroups.filter(g=>g.enabled||g.id===fidMemberRole(m));
    fidForm(m?'编辑子账号':'新增子账号','fid-member',`<input type="hidden" name="id" value="${esc(id)}">${fidFormRow('账号',fidCountField('fid-member-login','login',m?.login||m?.id||'',30,'输入账号',true),'fid-member-login',true)}${fidFormRow('昵称',fidCountField('fid-member-nick','name',m?.name||'',30,'输入成员昵称',true),'fid-member-nick',true)}${fidFormRow('权限组',`<select class="fid-select" id="fid-member-group" name="roleGroup">${roles.map(g=>option(g.id,g.name,fidMemberRole(m))).join('')}</select>`,'fid-member-group',true)}${fidFormRow('所属团队',fidCountField('fid-member-team','team',m?.team||'北美一组',30,'输入团队名称',true),'fid-member-team',true)}${fidFormRow('备注',fidCountField('fid-member-note','note',m?.note||'',80,'选填'),'fid-member-note')}${fidFormRow('状态',`<select class="fid-select" id="fid-member-enabled" name="enabled" ${m?.id===ui.persona?'disabled':''}>${fidOption([['1','正常'],['0','禁用']],m?.enabled===false?'0':'1')}</select>`,'fid-member-enabled')}`,'保存',{wide:true,saveLast:true});
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
    const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(r=>r.map(safe).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='whatsapp-客户列表.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('已导出当前筛选的客户列表。');
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
    fidGroupDelete:id=>{if(!group(id)||!canEditGroup(group(id)))return;if(data.tags.some(t=>t.group===id))return toast('请先清空此分组的标签。');fidConfirm('删除分组','删除此空分组？','fidDoGroupDelete',id);},
    fidDoGroupDelete:id=>{const g=group(id);if(!g||!canEditGroup(g)||data.tags.some(t=>t.group===id))return;data.tagGroups=data.tagGroups.filter(x=>x!==g);ui.tagGroup='all';persist();close();render();toast('分组已删除。');},
    fidTagCustomers:id=>{if(!myTags().some(t=>t.id===id))return;fid.customerTags=[id];ui.customerTag='all';ui.customerQuery='';ui.pages.customers=0;navigate('customers');},
    fidViewCustomerTags,
    fidCustomerChooseTags:fidOpenTagFilter,
    fidCustomerClearFilter:()=>{fid.customerTags=[];ui.customerTag='all';ui.selected.clear();ui.pages.customers=0;render();},
    fidCustomerPlatform:()=>{fid.customerPlatform=!fid.customerPlatform;ui.selected.clear();ui.pages.customers=0;render();},
    fidCustomerReset:()=>{fidResetCustomerFilters();render();},
    fidClearCustomerTags:()=>{if(ui.selected.size)fidConfirm('清空标签','清空所选客户的可见标签？','fidDoClearCustomerTags');},
    fidDoClearCustomerTags:()=>{const scope=new Set(myTags().map(t=>t.id)),before=[];for(const c of myCustomers()){if(!ui.selected.has(c.id))continue;before.push([c,c.tags]);c.tags=c.tags.filter(id=>!scope.has(id));addActivity(c.id,'清空可见标签');}persist();close();render();toast('已清空所选客户的可见标签。',()=>{for(const [c,t] of before)c.tags=t;persist();render()});},
    fidExportCustomers,
    fidAccountPlatform:()=>{fid.accountPlatform=!fid.accountPlatform;fid.accountChecked.clear();ui.pages.accounts=0;render();},
    fidAccountReset:()=>{fid.accountChecked.clear();Object.assign(fid,{accountField:'name',accountPlatform:true,accountChannel:'all'});ui.accountQuery='';ui.accountStatus='all';ui.pages.accounts=0;render();},
    fidAccountNote:()=>fidForm('批量注释','fid-account-note',fidFormRow('注释',fidCountField('fid-annotation','note','',80,'输入选中账号的注释',true),'fid-annotation',true)),
    fidAccountDelete:()=>{const selected=fidSelectedAccounts();if(!selected.length)return;if(selected.some(a=>data.customers.some(c=>c.account===a.id)))return toast('选中的账号仍有关联客户，不能移除。');fidConfirm('移除账号','移除选中的无客户账号？','fidDoAccountDelete');},
    fidDoAccountDelete:()=>{const selected=fidSelectedAccounts().filter(a=>!data.customers.some(c=>c.account===a.id));data.accounts=data.accounts.filter(a=>!selected.includes(a));fid.accountChecked.clear();persist();close();render();toast('已移除选中的账号。');},
    fidAccountZero:()=>fidConfirm('统计清零','将已选账号的未读统计清零？','fidDoAccountZero'),
    fidDoAccountZero:()=>{const selected=new Set(fidSelectedAccounts().map(a=>a.id));myCustomers().filter(c=>selected.has(c.account)).forEach(c=>c.unread=0);persist();close();render();toast('未读统计已清零。');},
    fidLogReset:()=>{fid.logFilter={start:'',end:'',app:'all',field:'customer',query:''};ui.pages.followups=0;render();},
    fidTasks:()=>{fid.followMode='todo';ui.pages.followups=0;navigate('followups');},
    fidLogHistory:()=>{fid.followMode='history';ui.pages.followups=0;render();},
    fidWaTab:id=>{fid.waTab=id==='numbers'?'numbers':'chat';render();},
    fidChatFilters:()=>fidDialog('会话筛选','<div class="modal-body fid-conversation-filters">'+Object.entries(fidConversationFilters).map(([id,label])=>fidButton(label,'fidChatFilter','',ui.conversationFilter===id?'blue':'',`${fidActionID(id)} aria-pressed="${ui.conversationFilter===id}"`)).join('')+'</div>'),
    fidChatFilter:id=>{ui.conversationFilter=id;close();render();},
    fidClearChatFilter:()=>{ui.conversationFilter='all';render();$('#conversation-search')?.focus({preventScroll:true});},
    fidChatPermissions:()=>fidDialog('会话权限','<div class="modal-body">'+(manager()?'主管可查看团队账号及其会话。':'聊手只查看分配给自己的账号及客户。')+'</div>',fidButton('关闭','close')),
    fidRoleAdd:()=>fidRoleEdit(),fidRoleEdit,
    fidRoleDetails:id=>{if(!manager())return;const g=fidRole(id);if(g)fidDialog('权限详情 · '+g.name,'<div class="modal-body">'+fidPermissionTree(g,true)+'</div>',fidButton('关闭','close'));},
    fidRoleDelete:id=>{if(!manager())return;const g=fidRole(id);if(!g||g.builtIn)return;if(data.members.some(m=>fidMemberRole(m)===id))return toast('请先迁移此权限组下的子账号。');fidConfirm('删除权限组','删除此权限组？','fidDoRoleDelete',id);},
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
    'fid-account-note-form':(f,v)=>{if(!v('note'))return error('请输入注释。');fidSelectedAccounts().forEach(a=>a.annotation=v('note'));persist();close();render();toast('所选账号已更新注释。');},
    'fid-log-search-form':()=>{fid.logFilter={start:$('#fid-log-start').value,end:$('#fid-log-end').value,app:$('#fid-log-app').value,field:$('#fid-log-field').value,query:$('#fid-log-query').value};ui.pages.followups=0;render();},
    'fid-role-form':(f,v)=>{
      if(!manager())return;if(!v('name'))return error('请输入权限组名称。');const g=fidRole(v('id')),view=f.getAll('view').filter(x=>fidPerms.includes(x)),write=f.getAll('write').filter(x=>view.includes(x));
      if(data.roleGroups.some(r=>r!==g&&r.name===v('name')))return error('已存在同名权限组。');
      const values={name:v('name'),enabled:g?.builtIn?g.enabled:v('enabled')==='1',view,write};if(g)Object.assign(g,values);else data.roleGroups.push({id:nextId('role'),...values,created:fidDay()});persist();close();render();toast('权限组已保存。');
    },
    'fid-member-form':(f,v)=>{
      if(!manager())return;const m=member(v('id')),g=fidRole(v('roleGroup'));
      if(!v('login')||!v('name')||!v('team')||!g)return error('请填写账号、昵称、权限组和团队。');
      if(data.members.some(x=>x!==m&&(x.login||x.id).toLowerCase()===v('login').toLowerCase()))return error('账号已存在。');
      if(m?.id===ui.persona&&g.id!=='lead')return error('请保留当前主管的主管权限。');
      const values={login:v('login'),name:v('name'),team:v('team'),note:v('note'),roleGroup:g.id,role:g.id==='lead'?'manager':'agent',enabled:m?.id===ui.persona?true:v('enabled')==='1'};
      if(m)Object.assign(m,values);else data.members.push({id:nextId('u'),...values,initial:initial(values.name),color:'blue',created:fidDay()});persist();close();render();toast('子账号已保存。');
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

  // Chat history is an archive: conversations are moved here from the WhatsApp chat as frozen snapshots,
  // for performance review and auditing. It has no rating and no pass/fail classification.
  // Tag statistics share this file.
  const recordView = { translate: true };
  let statsTagId = '';

  const chatArchives = () => (data.chatArchives ??= []);
  const myArchives = () => chatArchives().filter(record => manager() || record.ownerId === ui.persona);

  function resetRecordFilters() {
    Object.assign(recordView, { recordId: '', listQuery: '', messageQuery: '', limit: 200, step: 'archives' });
  }

  function resetCustomerPages() {
    resetRecordFilters();
    statsTagId = '';
  }
  resetCustomerPages();

  // Freeze a conversation as it is now. The live conversation is not changed.
  function archiveConversation(c, reason) {
    const record = {
      id: nextId('ar'),
      customerId: c.id, customerName: c.name, customerPhone: c.phone, language: c.language,
      accountId: c.account, accountName: account(c.account)?.name || '',
      ownerId: c.owner, ownerName: member(c.owner)?.name || '',
      movedBy: me()?.name || '', movedAt: new Date().toISOString(), reason,
      messages: conversationMessages(c).map(message => ({ ...message })),
    };
    chatArchives().unshift(record);
    return record;
  }

  function recordListItem(label, detail, search, action, id, selected) {
    return `<button type="button" class="fid-record-item" data-record-search="${esc(search)}" data-action="${action}" ${fidActionID(id)} aria-label="${esc(label)}" aria-pressed="${selected}">
      <strong>${esc(label)}</strong><small>${esc(detail)}</small>
    </button>`;
  }

  function recordList(title, type, placeholder, query, rows, emptyLabel) {
    const searchId = `fid-record-${type}-search`;
    return `<section class="fid-record-column fid-record-${type}" aria-label="${title}">
      <div class="fid-record-heading"><h2>${title}</h2>${fidIcon('刷新'+title,'fidRecordsRefresh','RefreshCw')}</div>
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

  function recordMessages(record) {
    if (!record) {
      return myArchives().length
        ? empty('选择左侧的归档会话查看快照', '')
        : empty('还没有归档会话', '在 WhatsApp 会话中点击「移入聊天记录」，或使用上方的「从 WhatsApp 会话移入」。');
    }
    const list = record.messages.filter(message =>
      fidMatch([message.text, message.translated, message.attachment].filter(Boolean).join(' '), recordView.messageQuery)
    );
    if (!list.length && recordView.messageQuery) return empty('没有匹配的消息', '试试其他关键词。');
    const older = list.length > recordView.limit ? fidButton('加载更早消息','fidRecordsOlder','', 'fid-record-older') : '';
    return older + messagesHTML(record, { list: list.slice(-recordView.limit), showTranslation: recordView.translate, emptyHint: '这个快照没有消息。' });
  }

  // Right-hand panel: snapshot facts, actions, and the translation switch.
  function archiveAside(record) {
    const translate = `<h2>翻译设置</h2>
      <label class="fid-record-toggle" for="fid-record-translation">聊天翻译 <input type="checkbox" id="fid-record-translation" role="switch" ${recordView.translate?'checked':''}></label>`;
    if (!record) return `<aside class="fid-record-translate fid-archive-aside" aria-label="快照信息与设置">${translate}</aside>`;
    const live = myCustomers().find(c => c.id === record.customerId);
    const newer = live ? conversationMessages(live).length - record.messages.length : 0;
    return `<aside class="fid-record-translate fid-archive-aside" aria-label="快照信息与设置">
      <h2>快照信息</h2>
      <dl class="fid-archive-meta">
        <dt>客户</dt><dd>${esc(record.customerName)}<small>${esc(record.customerPhone || '')}</small></dd>
        <dt>负责聊手</dt><dd>${esc(record.ownerName || '—')} · ${esc(record.accountName || '—')}</dd>
        <dt>移入</dt><dd>${esc(record.movedBy || '—')} · ${esc(fidDate(record.movedAt))}</dd>
        <dt>移入原因</dt><dd>${esc(record.reason)}</dd>
        <dt>快照消息</dt><dd>${record.messages.length} 条${newer > 0 ? `<small>实时会话之后新增 ${newer} 条，未计入快照</small>` : ''}</dd>
      </dl>
      <div class="fid-archive-actions">
        ${live ? fidButton('打开实时会话', 'openConversation', 'MessageCircle', 'slim', fidActionID(live.id)) : ''}
        ${fidButton('移出聊天记录', 'fidArchiveRemove', 'Trash2', 'slim', fidActionID(record.id))}
      </div>
      ${translate}
    </aside>`;
  }

  function renderChatRecords() {
    const records = myArchives();
    const selected = records.find(record => record.id === recordView.recordId);
    if (!selected) Object.assign(recordView, { recordId: '', step: 'archives' });
    const rows = records.map(record => recordListItem(record.customerName,
      `${record.ownerName || '—'} · ${fidDate(record.movedAt).slice(0, 10)}`,
      [record.customerName, record.customerPhone, record.ownerName, record.reason].join(' '),
      'fidArchiveSelect', record.id, record === selected)).join('');
    return `<section class="fid-page fid-history-page">
      ${fidHead('聊天记录','从 WhatsApp 会话移入的快照，用于绩效复盘与审核。实时会话不受影响。')}
      <div class="fid-filter-row fid-record-filters">
        ${fidButton('从 WhatsApp 会话移入','fidArchivePick','Plus','blue')}
        <span class="fid-small-note">共 ${records.length} 条归档</span>
      </div>
      <div class="fid-history-grid fid-archive-grid" data-record-step="${recordView.step}">
        ${recordList('归档会话','archive','客户/聊手/原因搜索',recordView.listQuery,rows,records.length?'暂无匹配的归档会话':'还没有归档会话')}
        <section class="fid-record-column fid-record-thread" aria-label="会话快照">
          <div class="fid-record-heading"><h2>${esc(selected ? selected.customerName + ' · 快照' : '未选择归档会话')}</h2></div>
          ${fidButton('返回归档列表','fidRecordBack','ArrowLeft','fid-record-back',fidActionID('archives'))}
          <div class="fid-record-search"><input type="search" id="fid-record-message-search" class="fid-input" aria-label="搜索快照消息" placeholder="搜索消息" value="${esc(recordView.messageQuery)}" ${selected?'':'disabled'}></div>
          <div class="messages fid-record-messages" id="fid-record-messages" tabindex="0">${recordMessages(selected)}</div>
        </section>
        ${archiveAside(selected)}
      </div>
    </section>`;
  }

  function selectArchive(id) {
    if (!myArchives().some(record => record.id === id)) return;
    Object.assign(recordView, { recordId: id, messageQuery: '', limit: 200, step: 'messages' });
    render();
  }

  function refreshRecordMessages() {
    const container = $('#fid-record-messages');
    if (!container) return;
    container.innerHTML = recordMessages(myArchives().find(record => record.id === recordView.recordId));
    paintIcons(container);
  }

  // Move a conversation in. With an id the customer is fixed (called from the chat screen); without one the user picks.
  function openArchiveAdd(id = '') {
    const list = myCustomers();
    if (!list.length) return toast('还没有可移入的会话。');
    const fixed = list.find(c => c.id === id);
    const count = c => conversationMessages(c).length;
    const target = fixed
      ? `<input type="hidden" name="customerId" value="${esc(fixed.id)}">`
      : fidFormRow('选择会话', `<select class="fid-select" style="width:100%" name="customerId">${list.map(c => option(c.id, `${c.name}（${count(c)} 条消息 · ${account(c.account)?.name || '未绑号'}）`, list[0].id)).join('')}</select>`, '', true);
    fidForm(
      fixed ? `移入聊天记录 · ${fixed.name}` : '从 WhatsApp 会话移入',
      'fid-archive-add',
      `${target}
       <p class="fid-field-help" style="margin:0 0 12px">${fixed ? `将该会话当前的 ${count(fixed)} 条消息` : '将所选会话当前的全部消息'}作为快照移入「聊天记录」，用于绩效复盘与审核。实时会话不受影响，可继续沟通。</p>
       ${fidFormRow('移入原因', `<input class="fid-input" style="width:100%" name="reason" required maxlength="80" placeholder="如：首单成交过程复盘 / 客户投诉处理">`, '', true)}`,
      '确认移入',
      { wide: true }
    );
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
    fidArchiveSelect: selectArchive,
    fidArchiveOpen: id => openArchiveAdd(id),
    fidArchivePick: () => openArchiveAdd(),
    fidArchiveRemove: id => {
      const record = myArchives().find(item => item.id === id);
      if (record) fidConfirm('移出聊天记录', `确认移出与 ${record.customerName} 的会话快照？快照将被删除，实时会话不受影响。`, 'fidArchiveRemoveConfirm', id);
    },
    fidArchiveRemoveConfirm: id => {
      const index = chatArchives().findIndex(item => item.id === id && (manager() || item.ownerId === ui.persona));
      if (index < 0) return;
      const [record] = chatArchives().splice(index, 1);
      if (recordView.recordId === id) Object.assign(recordView, { recordId: '', step: 'archives' });
      persist();
      close();
      render();
      toast(`已移出与 ${record.customerName} 的会话快照。`);
    },
    fidRecordBack: () => { Object.assign(recordView, { recordId: '', step: 'archives' }); render(); },
    fidRecordsOlder: () => { recordView.limit += 200; refreshRecordMessages(); },
    fidRecordsRefresh: () => { render(); toast('聊天记录已刷新。'); },
    fidStatsTag: id => { statsTagId = id; render(); },
  });

  fidForms['fid-archive-add-form'] = (f, v) => {
    const c = myCustomers().find(item => item.id === v('customerId'));
    if (!c) return error('请选择要移入的会话。');
    if (!v('reason')) return error('请填写移入原因。');
    const size = conversationMessages(c).length;
    if (!size) return error('该会话还没有消息，无法移入。');
    if (chatArchives().some(record => record.customerId === c.id && record.messages.length === size)) {
      return error('该会话的当前内容已在聊天记录中。');
    }
    const record = archiveConversation(c, v('reason'));
    lcLog(c.id, 'profile', `会话快照已移入聊天记录：${record.reason}`);
    Object.assign(recordView, { recordId: record.id, listQuery: '', messageQuery: '', limit: 200, step: 'messages' });
    persist();
    close();
    render();
    toast(`已将与 ${c.name} 的会话移入聊天记录（${size} 条消息）。`);
  };

  document.addEventListener('input', event => {
    const input = event.target;
    if (input.id === 'fid-record-archive-search') {
      recordView.listQuery = input.value;
      filterRecordList('archive', input.value);
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
    filterRecordList('archive', recordView.listQuery);
  };

  const assetTypes = { text:'文本', image:'图片', contact:'名片', rich:'图文', audio:'音频', video:'视频' };
  function operationsData() {
    return data.operations ??= {
      assetGroups: [{id:'ops-text',type:'text',name:'常用文本',note:''}],
      assets: [],
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
    const media=type==='text'||type==='contact'?'':opsField('本地文件',`<input type="file" name="file" accept="${type==='rich'?'image':type}/*"><small class="fid-ops-hint">${item?.file?esc(item.file)+' · ':''}仅保留文件名。</small>`);
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
      if(manager()&&operationsView.assetSelection.size)fidConfirm('批量删除素材','确定删除所选的素材？','opsAssetDeleteConfirmed');
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

  // WhatsApp numbers through the sub-site's own OpenWA. The page talks to its own server only (/api/wa/*):
  // linking a number by QR code, the feed of what happens on the numbers, and sending.
  const openwaDialog = $('#dialog');
  let openwaPairing = null;
  // What the server said about the link: null until asked, then { configured, reachable }.
  let openwaServer = null;
  const openwaClient = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  // OpenWA renews a QR code in rounds: the first code of a round after about a minute, five more every twenty
  // seconds, then nothing for about a minute until the next round. The longest it shows one code is about seventy
  // seconds; a code that has been shown longer than this without a new one is no longer renewed.
  const openwaQrLife = 90000;

  async function openwaCall(method, path, body) {
    try {
      const response = await fetch('/api/wa/' + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
      let answer = {};
      try { answer = await response.json(); } catch (e) {}
      return { status: response.status, body: answer };
    } catch (e) {
      return { status: 0, body: {} };
    }
  }
  const openwaProblem = answer => answer.status === 0 ? '无法连接服务器，请检查网络后重试。'
    : answer.status === 503 ? '服务器尚未接入 WhatsApp 连接，请联系管理员。'
    : answer.status === 502 ? 'WhatsApp 连接服务暂时不可用，请稍后重试。'
    : answer.status === 401 ? '登录已失效，请刷新页面后重新登录。'
    : answer.status === 403 ? '当前账号不能管理号码。' : '操作没有成功，请重试。';

  const openwaVisibleAccount = id => myAccounts().find(a => a.id === id);
  const openwaLinkStates = { scan: '需要重新扫码', attention: '需要在手机上处理', failed: '连接失败', missing: '需要重新绑定' };
  const openwaState = a => a.state === 'online' ? '在线' : a.state === 'reconnect' ? openwaLinkStates[a.linkState] || '已掉线' : '待绑定';
  const openwaClock = (at = Date.now()) => new Date(at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const openwaDayOf = at => new Date(at).toLocaleDateString('sv-SE');
  // How a message's day and time are shown. Messages from before the real connection carry a text only.
  const openwaDayLabel = m => !m.at ? (m.time.startsWith('昨天') ? '昨天' : '今天')
    : openwaDayOf(m.at) === openwaDayOf(Date.now()) ? '今天' : openwaDayOf(m.at) === openwaDayOf(Date.now() - 86400000) ? '昨天' : openwaDayOf(m.at);
  const openwaTimeLabel = m => m.at ? openwaClock(m.at) : m.time.replace('昨天 ', '');
  const openwaLastLabel = c => !c.lastAt ? c.last
    : openwaDayOf(c.lastAt) === openwaDayOf(Date.now()) ? openwaClock(c.lastAt) : openwaDayOf(c.lastAt) === openwaDayOf(Date.now() - 86400000) ? '昨天' : openwaDayOf(c.lastAt).slice(5);
  // The conversation with the latest message comes first; conversations without a real message keep their order after them.
  const openwaOrder = list => list.map((c, i) => [c, i]).sort((x, y) => (y[0].lastAt || 0) - (x[0].lastAt || 0) || x[1] - y[1]).map(x => x[0]);
  const openwaMediaText = { image: '[图片]', video: '[视频]', audio: '[语音]', voice: '[语音]', document: '[文件]', sticker: '[贴图]', location: '[位置]', contact: '[名片]', poll: '[投票]', call: '[通话]' };

  // ---- the media of a message ----
  // How a kind of message shows its media: a picture, a player, or a link to the file.
  const openwaMediaShown = { image: 'image', sticker: 'image', video: 'video', audio: 'audio', voice: 'audio', document: 'file' };
  // The address of a message's media at this server; '' when the message has none or its chat is not known.
  // c is the customer, or a record of the chat archive that names one.
  function openwaMediaUrl(c, m) {
    const owner = c.waChat ? c : customer(c.customerId);
    if (!m.wa || !openwaMediaShown[m.type] || !owner?.waChat || !owner.account) return '';
    return '/api/wa/media?account=' + encodeURIComponent(owner.account) + '&chat=' + encodeURIComponent(owner.waChat) + '&id=' + encodeURIComponent(m.wa);
  }
  // What a message shows above its text. A picture opens in a new tab; a file is a download.
  function openwaMediaHTML(c, m) {
    const url = esc(openwaMediaUrl(c, m)), shown = openwaMediaShown[m.type];
    if (!url) return '';
    if (shown === 'image') return `<a class="openwa-media" href="${url}" target="_blank" rel="noopener" aria-label="在新标签页查看${m.type === 'sticker' ? '贴图' : '图片'}"><img src="${url}" alt="${m.type === 'sticker' ? '贴图' : '图片'}" loading="lazy"></a>`;
    if (shown === 'video') return `<div class="openwa-media"><video src="${url}" controls preload="none" aria-label="视频"></video></div>`;
    if (shown === 'audio') return `<div class="openwa-media"><audio src="${url}" controls preload="none" aria-label="语音"></audio></div>` + aiTranscriptHTML(c, m);
    return `<a class="openwa-file" href="${url}&amp;download=1" download>${icon('FileDown')}<span>${esc(m.file || '文件')}</span></a>`;
  }
  // The text under the media: the words that only stood for the media ("[图片]") are left out when it is shown.
  const openwaCaption = (c, m) => (openwaMediaUrl(c, m) && m.text === openwaMediaText[m.type] ? '' : m.text);
  // Media that cannot be had — gone from the phone, or the number is not connected — gives way to a short note.
  document.addEventListener('error', event => {
    const el = event.target, holder = el.closest?.('.openwa-media');
    if (!holder || !['IMG', 'VIDEO', 'AUDIO'].includes(el.tagName)) return;
    const note = document.createElement('span');
    note.className = 'openwa-media-missing';
    note.textContent = (el.tagName === 'IMG' ? '图片' : el.tagName === 'VIDEO' ? '视频' : '语音') + '暂时无法加载';
    holder.replaceWith(note);
  }, true);
  // Drawing a conversation again must not stop a voice note or a video that is playing: its element takes the
  // place of its redrawn twin. Every full redraw goes through here; so does the AI module's own redraw.
  function openwaKeepPlaying(draw) {
    const playing = [...document.querySelectorAll('#messages audio, #messages video')].filter(media => !media.paused && !media.ended);
    draw();
    for (const media of playing) {
      const twin = [...document.querySelectorAll('#messages ' + media.tagName.toLowerCase())].find(x => x.getAttribute('src') === media.getAttribute('src'));
      if (twin) twin.replaceWith(media);
    }
  }
  // Drawing the page again must not move the list of conversations either: choosing a conversation far down the
  // list draws the page again, and the list used to jump back to its top. Where the list stands is noted whenever
  // it is scrolled and given back after every redraw, for as long as the list shows the same choice of
  // conversations — also when the list was out of sight in between, as it is on a narrow screen while a
  // conversation is open. Another number, filter or search shows its list from the top.
  const openwaListKey = () => [ui.account, ui.conversationFilter, ui.query].join('\n');
  const openwaListPlace = { key: openwaListKey(), top: 0 };
  document.addEventListener('scroll', event => {
    if (event.target.id === 'conversation-list') Object.assign(openwaListPlace, { key: openwaListKey(), top: event.target.scrollTop });
  }, true);
  document.addEventListener('input', event => {
    const list = $('#conversation-list');
    if (event.target.id !== 'conversation-search' || !list) return;
    list.scrollTop = 0;
    Object.assign(openwaListPlace, { key: openwaListKey(), top: 0 });
  });
  const openwaDraw = render;
  render = function() {
    openwaKeepPlaying(openwaDraw);
    const list = $('#conversation-list');
    if (!list) return;
    if (openwaListPlace.key !== openwaListKey()) Object.assign(openwaListPlace, { key: openwaListKey(), top: 0 });
    else if (openwaListPlace.top) list.scrollTop = openwaListPlace.top;
  };

  // The mark after the time of a message the employee sent.
  function openwaMessageMark(m) {
    if (m.status === 'sending') return icon('Clock3') + '<span>发送中</span>';
    if (m.status === 'failed') return `<span class="openwa-mark warn">${icon('TriangleAlert')}未发送</span><button type="button" class="link" data-action="openwaResend" ${fidActionID(m.id)}>重试</button>`;
    if (m.status === 'unknown') return `<span class="openwa-mark warn">${icon('ClockAlert')}结果待确认</span><button type="button" class="link" data-action="openwaResend" ${fidActionID(m.id)}>重试</button>`;
    if (m.status === 'read' || m.status === 'played') return `<span class="openwa-mark read">${icon('CheckCheck')}已读</span>`;
    return icon(m.status === 'delivered' ? 'CheckCheck' : 'Check');
  }

  // The page's three states of a number: online, reconnect (it was linked and is not connected now), pending.
  function openwaSetState(a, link) {
    const before = a.state + '|' + a.linkState + '|' + a.number;
    if (link.state === 'online') {
      Object.assign(a, { state: 'online', linked: true, lastSync: '刚刚' });
      if (link.phone) a.number = '+' + link.phone;
    } else if (a.linked || a.state === 'reconnect') {
      Object.assign(a, { state: 'reconnect', linked: true, lastSync: a.state === 'reconnect' ? a.lastSync : '已断开' });
    } else {
      a.state = 'pending';
    }
    a.linkState = link.state;
    return before !== a.state + '|' + a.linkState + '|' + a.number;
  }

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
          (a.state==='online' ? '' : fidButton('重新连接','connect','RefreshCw','tint',fidActionID(a.id))) +
          fidButton('解除绑定','openwaUnlinkAsk','','slim',fidActionID(a.id));
      return `<tr>
        <td><strong>${esc(a.name)}</strong><span class="openwa-row-meta">${esc(a.number)}</span></td>
        <td><span class="state-text ${a.state==='reconnect'?'warn':''}"><span class="state-dot ${a.state==='reconnect'?'warning':a.state==='pending'?'offline':''}"></span>${openwaState(a)}</span></td>
        <td>${esc(member(a.owner)?.name||'未分配')}</td>
        <td>${chatCounts.get(a.id)||0}</td>
        <td>${esc(a.lastSync||'—')}</td>
        <td><div class="openwa-row-actions">${actions}</div></td>
      </tr>`;
    }).join('');
    const notice = !openwaServer ? '' : !openwaServer.configured ? '<span class="tag slate">服务器尚未接入 WhatsApp 连接</span>'
      : !openwaServer.reachable ? '<span class="tag slate">连接服务暂时不可用</span>' : '';
    return `<section class="fid-page fid-wa fid-wa-numbers">
      ${openwaTabs()}
      <div class="fid-table-card openwa-panel">
        <div class="openwa-panel-head">${fidHead('号码管理','通过 OpenWA 关联 WhatsApp Business 号码。')}${notice}</div>
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
    const title = pair.mode === 'bind' ? '扫码绑定 WhatsApp Business' : '重新连接';
    const description = pair.label ? `<p>${esc(pair.label)}</p>` : '';
    const status = pair.phase === 'scan' && pair.qr
      ? `<div class="openwa-qr" role="img" aria-label="WhatsApp 关联设备二维码"><img alt="" width="264" height="264" src="${esc(pair.qr)}"></div><div class="openwa-pair-state"><span class="state-dot warning"></span>等待扫码</div>`
      : pair.phase === 'error'
        ? `<div class="openwa-pair-state openwa-pair-error" role="alert" tabindex="-1"><span class="state-dot offline"></span><strong>${esc(pair.error)}</strong></div>`
        : `<div class="openwa-pair-state" role="status" tabindex="-1">${icon('LoaderCircle')}<strong>${pair.phase === 'verifying' ? '已扫码，正在验证…' : pair.mode === 'bind' ? '正在准备二维码…' : '正在恢复连接…'}</strong></div>`;
    openwaDialogContent(title, `<div id="openwa-dialog-body" class="modal-body openwa-pair-body">
      <div class="openwa-pair-copy"><strong>在手机上打开 WhatsApp Business</strong><p>选择「关联设备」→「关联新设备」，扫描二维码。</p>${description}</div>
      ${status}
      <p class="openwa-pair-hint">二维码会自动更换；扫码没有成功时，请等新的二维码出现后再扫。绑定后，这个号码的新消息会显示在在线聊天里。</p>
    </div>`, fidButton('取消','close')+(pair.phase === 'error' ? fidButton('重试','openwaRetry','RefreshCw','blue') : ''),
      pair.phase === 'error' ? '[data-action="openwaRetry"]' : '.openwa-pair-state');
  }

  // One answer of the server about the number that is being linked.
  function openwaPairStep(pair, link) {
    if (link.state === 'online') return openwaFinish(pair, link);
    const phase = link.state === 'scan' ? 'scan' : link.state === 'verifying' ? 'verifying' : link.state === 'starting' ? 'starting' : 'error';
    const error = phase !== 'error' ? '' : link.state === 'attention' ? (link.error || '需要先在手机上完成 WhatsApp 的验证，然后重试。') : '二维码已失效或连接中断，请重试。';
    const qr = phase === 'scan' ? link.qr || '' : '';
    if (phase === pair.phase && qr === pair.qr && error === pair.error) return;
    if (qr !== pair.qr) pair.qrAt = Date.now();
    Object.assign(pair, { phase, qr, error });
    openwaShowPairing();
  }

  async function openwaRequestLink(pair) {
    const answer = await openwaCall('POST', 'link', pair.expired ? { account: pair.accountId, fresh: true } : { account: pair.accountId });
    if (openwaPairing !== pair) return openwaAbandon(pair);
    if (answer.status === 200) pair.expired = false;
    if (answer.status === 200) openwaPairStep(pair, answer.body);
    else {
      Object.assign(pair, { phase: 'error', qr: '', error: openwaProblem(answer) });
      openwaShowPairing();
    }
    if (openwaPairing === pair && pair.phase !== 'error') pair.timer = setTimeout(() => openwaPoll(pair), 2000);
  }

  async function openwaPoll(pair) {
    if (openwaPairing !== pair) return;
    const answer = await openwaCall('GET', 'link?account=' + encodeURIComponent(pair.accountId));
    if (openwaPairing !== pair) return;
    if (answer.status === 200) openwaPairStep(pair, answer.body);
    else if (answer.status === 404) openwaPairStep(pair, { state: 'missing' });
    if (openwaPairing !== pair) return;
    if (pair.phase === 'scan' && Date.now() - pair.qrAt > openwaQrLife) {
      // The code is no longer renewed. "重试" asks the server for a new one.
      Object.assign(pair, { phase: 'error', qr: '', error: '二维码已过期，请点击「重试」获取新的二维码。', expired: true });
      return openwaShowPairing();
    }
    if (pair.phase !== 'error') pair.timer = setTimeout(() => openwaPoll(pair), 2000);
  }

  function openwaBeginPairing(mode, a) {
    if (openwaServer && !openwaServer.configured) return toast('服务器尚未接入 WhatsApp 连接，请联系管理员。');
    const pair = openwaPairing = { mode, accountId: a?.id || nextId('a'), label: a ? a.name + (fidPhoneDigits(a.number).length >= 7 ? ' · ' + a.number : '') : '', phase: 'starting', qr: '', error: '', held: [] };
    openwaShowPairing();
    openwaRequestLink(pair);
  }

  // The dialog was closed before the number came online. A number that was never linked leaves nothing behind.
  function openwaAbandon(pair) {
    clearTimeout(pair.timer);
    if (!pair.done && !account(pair.accountId)?.linked) openwaCall('POST', 'unlink', { account: pair.accountId });
  }

  function openwaFinish(pair, link) {
    pair.done = true;
    clearTimeout(pair.timer);
    openwaPairing = null;
    let a = account(pair.accountId);
    if (!a) {
      a = { id: pair.accountId, name: link.name || 'WhatsApp · ' + String(link.phone || '').slice(-4), owner: ui.persona, number: '', country: '', note: '',
        color: ['jade','blue','peach','purple','gold'][data.accounts.length % 5], createdAt: fidDay() };
      data.accounts.push(a);
    }
    openwaSetState(a, link);
    // What the feed brought for this number before it was recorded here.
    for (const e of pair.held) openwaApply(e);
    persist();
    render();
    const bind = pair.mode === 'bind';
    const action = bind ? 'openwaOpenChat' : 'openwaReturnToChat';
    const inChat = ui.view === 'inbox' && fid.waTab === 'chat';
    const label = !bind && inChat && fid.chatOpen ? '返回当前会话' : '进入在线聊天';
    openwaDialogContent(bind ? '绑定成功' : '连接已恢复', `<div id="openwa-dialog-body" class="modal-body openwa-pair-body">
      <div class="openwa-success-mark">${icon('Check')}</div>
      <div class="openwa-pair-copy"><strong>${esc(a.name)}</strong><p>${esc(a.number)} · 在线</p></div>
      <p class="openwa-pair-hint">${bind ? '客户给这个号码发消息后，会话会显示在在线聊天里。' : '原有会话和草稿已保留。'}</p>
    </div>`, fidButton('完成','close')+fidButton(label,action,'ArrowRight','blue',fidActionID(a.id)),
      `[data-action="${action}"]`);
  }

  function openwaOpenChat(id) {
    const a = openwaVisibleAccount(id);
    if (!a) return;
    const c = openwaOrder(myCustomers().filter(c => c.account === id))[0];
    if (openwaDialog.open) close();
    Object.assign(ui, {account:id, customer:c?.id||null, query:'', conversationFilter:'all', mobileChat:Boolean(c), profileTab:'details'});
    fid.waTab = 'chat';
    fid.chatOpen = Boolean(c);
    navigate('inbox');
    if (c) $('.chat-person h2')?.focus({preventScroll:true});
    else $('#account-filter')?.focus({preventScroll:true});
  }

  function openwaReconnect(id) {
    const a = openwaVisibleAccount(id);
    if (!a || a.state === 'online') return;
    // An intact session comes back without a scan; otherwise the server answers with a new QR code.
    openwaBeginPairing(a.state === 'pending' ? 'bind' : 'reconnect', a);
  }

  const openwaBaseChat = chatHTML;
  chatHTML = function(c) {
    const a = account(c.account);
    let chat = openwaBaseChat(c);
    if (!a) return chat;
    chat = chat.replace('<div class="chat-person"><h2>', '<div class="chat-person"><h2 tabindex="-1">');
    chat = chat.replace('<div class="source-strip">', `<div class="openwa-chat-status">
      <span>${icon('Smartphone')}<b>${esc(a.number)}</b></span><span class="state-text ${a.state==='reconnect'?'warn':''}" role="status"><span class="state-dot ${a.state==='reconnect'?'warning':a.state==='pending'?'offline':''}"></span>${openwaState(a)}</span>
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

  // ---- sending ----
  // One press of the send button is one request: repeating it with the same id never sends twice.
  async function openwaDeliver(c, message) {
    const digits = fidPhoneDigits(c.phone);
    const answer = c.waChat || digits.length >= 7
      ? await openwaCall('POST', 'send', { account: c.account, to: c.waChat || digits + '@c.us', text: message.text, requestId: message.request })
      : { status: 400, body: { error: 'no-number' } };
    const list = data.messages[c.id] || [];
    if (answer.status === 200) {
      // The feed may have brought the same message first: keep this one and what the feed learned about it.
      const twin = list.find(m => m !== message && m.wa === answer.body.messageId);
      if (twin) data.messages[c.id] = list.filter(m => m !== twin);
      Object.assign(message, { wa: answer.body.messageId, at: answer.body.timestamp, status: twin?.status || (message.status === 'sending' ? 'sent' : message.status) });
      delete message.error;
    } else {
      const open = answer.status === 0 || answer.status === 502 || answer.body.error === 'outcome-unknown';
      Object.assign(message, { status: open ? 'unknown' : 'failed', error: answer.body.error || 'network' });
      toast(open ? '发送结果待确认，可稍后在消息旁重试。' : answer.body.error === 'not-connected' ? '号码未连接，消息没有发出。' : answer.body.error === 'no-number' ? '这位客户没有可用的 WhatsApp 号码。' : '消息没有发出，可在消息旁重试。');
    }
    persist();
    openwaRefresh();
  }

  send = function() {
    const c = selectedCustomer(), el = $('#composer-text');
    if (!c || !el) return;
    if (account(c.account)?.state !== 'online') return toast('号码尚未连接，草稿会保留。');
    const text = el.value.trim();
    if (!text) return;
    const d = draft(c), outgoing = d.translated && d.source === text ? d.translated : text;
    // What the employee sends from here is never asked for: it is marked as read in the reading language, and a
    // reply that was put into the customer's language keeps what was typed as its translation.
    const message = { id: nextId('m'), side: 'out', text: outgoing, time: openwaClock(), at: Date.now(), request: nextId('r'), status: 'sending', translatedTo: aiSettings().readLanguage, ...(outgoing !== text ? { translated: text } : {}) };
    (data.messages[c.id] ??= conversationMessages(c)).push(message);
    Object.assign(c, { preview: outgoing, last: message.time, lastAt: message.at, unread: 0 });
    ui.drafts[c.id] = { text: '', translated: '', source: '' };
    persist();
    render();
    openwaDeliver(c, message);
  };

  // ---- the feed ----
  function openwaNewCustomer(a, e) {
    const name = e.name || (e.phone ? '+' + e.phone : 'WhatsApp 客户'), nowIso = new Date().toISOString();
    const c = { id: nextId('c'), name, initials: initial(name), color: 'blue', phone: e.phone ? '+' + e.phone : '', waChat: e.chat,
      country: a.country || '', city: '', timezone: '', language: '', owner: a.owner || ui.persona, account: a.id, tags: [], engagement: 'open',
      source: '未知来源', campaign: '', ad: '', unread: 0, star: false, last: '', preview: '', translation: '', followup: null, notes: '',
      contactRefs: [{ account: a.id, owner: a.owner || ui.persona }], createdAt: nowIso, updatedAt: nowIso, clientType: '新增线索-实时', reactivatedCount: 0 };
    // The engagement module notes the first message in the customer's history on the next render. Not for what
    // was fetched while catching up: those conversations are not new.
    if (!e.fromMe && !e.history) c.needsFirstReply = true;
    data.customers.unshift(c);
    data.messages[c.id] = [];
    return c;
  }

  // Two records of one person on one number: one made by hand and known by its phone number, one made from a
  // message and known by the chat id WhatsApp uses (often a privacy id). The one made by hand stays: it takes
  // over the conversation, the to-dos and the history of the other.
  function openwaJoin(keep, drop) {
    const order = ['sending', 'unknown', 'failed', 'sent', 'delivered', 'read', 'played'];
    const list = data.messages[keep.id] ??= conversationMessages(keep);
    for (const m of data.messages[drop.id] || []) {
      const same = m.wa && list.find(x => x.wa === m.wa);
      if (!same) list.push(m);
      else if (order.indexOf(m.status) > order.indexOf(same.status)) same.status = m.status;
    }
    list.sort((x, y) => (x.at || 0) - (y.at || 0));
    const last = list.at(-1);
    Object.assign(keep, { waChat: drop.waChat, unread: Math.max(Number(keep.unread) || 0, Number(drop.unread) || 0), star: keep.star || drop.star,
      tags: [...new Set([...keep.tags, ...drop.tags])], notes: keep.notes || drop.notes, ...(last?.at ? { preview: last.text, translation: '', last: last.time, lastAt: last.at } : {}) });
    for (const t of data.tasks) if (t.customer === drop.id) t.customer = keep.id;
    for (const record of data.chatArchives || []) if (record.customerId === drop.id) record.customerId = keep.id;
    if (data.activities[drop.id]) data.activities[keep.id] = [...data.activities[drop.id], ...(data.activities[keep.id] || [])];
    delete data.activities[drop.id];
    delete data.messages[drop.id];
    data.customers = data.customers.filter(c => c !== drop);
    if (ui.customer === drop.id) ui.customer = keep.id;
  }
  // Joins such pairs wherever the phone number of a chat has become known. Returns true when it joined any.
  function openwaJoinTwins() {
    const byPhone = new Map();
    for (const c of data.customers) if (!c.waChat && fidPhoneDigits(c.phone).length >= 7) byPhone.set(c.account + ' ' + fidPhoneDigits(c.phone), c);
    let joined = false;
    for (const drop of [...data.customers]) {
      const key = drop.account + ' ' + fidPhoneDigits(drop.phone), keep = drop.waChat ? byPhone.get(key) : null;
      if (!keep) continue;
      openwaJoin(keep, drop);
      byPhone.delete(key);
      joined = true;
    }
    return joined;
  }

  const openwaFindMessage = (accountId, wa) => {
    for (const c of data.customers) {
      if (c.account !== accountId) continue;
      const m = (data.messages[c.id] || []).find(m => m.wa === wa);
      if (m) return [c, m];
    }
    return [];
  };

  // Applies one event of the feed to the data. Returns true when something changed.
  function openwaApply(e) {
    const a = data.accounts.find(a => a.id === e.account);
    if (!a) {
      // The number that is being linked right now is recorded when its dialog sees it online. What the feed
      // brings for it before that moment is kept and applied then; the dialog is told to look at once.
      const pair = openwaPairing;
      if (pair?.accountId !== e.account) return false;
      pair.held.push(e);
      if (e.kind === 'state' && e.state === 'online' && pair.timer) {
        clearTimeout(pair.timer);
        pair.timer = 0;
        openwaPoll(pair);
      }
      return false;
    }
    if (e.kind === 'state') return openwaSetState(a, e);
    if (e.kind === 'restriction') {
      a.restricted = e.active;
      if (e.active) toast(`WhatsApp 限制了 ${a.name} 的使用，请在手机上查看。`);
      return true;
    }
    if (e.kind === 'receipt') {
      const [, m] = openwaFindMessage(a.id, e.id);
      const order = ['sending', 'unknown', 'sent', 'delivered', 'read', 'played'];
      if (!m || m.side !== 'out' || (e.status !== 'failed' && order.indexOf(e.status) <= order.indexOf(m.status))) return false;
      m.status = e.status;
      return true;
    }
    if (e.kind === 'revoked' || e.kind === 'edited') {
      const [c, m] = openwaFindMessage(a.id, e.id);
      if (!m) return false;
      Object.assign(m, e.kind === 'revoked' ? { text: '此消息已撤回', revoked: true, translated: '' } : { text: e.text, edited: true, translated: '' });
      delete m.translatedTo;
      if ((data.messages[c.id] || []).at(-1) === m) c.preview = m.text;
      if (e.kind === 'edited') aiTranslateInbound(c, m);
      return true;
    }
    if ((e.kind !== 'message' && e.kind !== 'chat') || !e.chat) return false;
    let c = data.customers.find(c => c.account === a.id && c.waChat === e.chat)
      || (e.phone ? data.customers.find(c => c.account === a.id && !c.waChat && fidPhoneDigits(c.phone) === e.phone) : null);
    // A message this page sent to a customer who was known by phone number only comes back under the chat id
    // WhatsApp uses for that person: the customer who holds that message is the one of this chat.
    if (!c && e.kind === 'message' && e.fromMe) {
      c = data.customers.find(x => x.account === a.id && !x.waChat && (data.messages[x.id] || []).some(m => m.side === 'out' && (m.wa ? m.wa === e.id : m.status === 'sending' && m.text === e.text)));
    }
    if (c && !c.waChat) c.waChat = e.chat;
    if (c && !c.phone && e.phone) c.phone = '+' + e.phone;
    if (e.kind === 'chat') {
      // A chat that is on the number, found while catching up: its customer, the number where WhatsApp tells it,
      // and how many messages are unread there.
      const before = c ? c.phone + '|' + c.unread : '';
      c ||= openwaNewCustomer(a, { ...e, history: true });
      if (!c.phone && e.phone) c.phone = '+' + e.phone;
      c.unread = Math.max(Number(c.unread) || 0, e.unread);
      return before !== c.phone + '|' + c.unread;
    }
    c ||= openwaNewCustomer(a, e);
    const list = data.messages[c.id] ??= conversationMessages(c);
    if (e.id && list.some(m => m.wa === e.id)) return false;
    const text = e.text || openwaMediaText[e.type] || '[消息]';
    if (e.fromMe) {
      // What this page sent comes back through the feed: it is the message that is still waiting for its answer.
      const mine = list.find(m => m.side === 'out' && !m.wa && m.status === 'sending' && m.text === e.text);
      if (mine) {
        Object.assign(mine, { wa: e.id, status: 'sent' });
        return true;
      }
    }
    const message = { id: nextId('m'), side: e.fromMe ? 'out' : 'in', text, time: openwaClock(e.at), at: e.at, wa: e.id, type: e.type, ...(e.media?.name ? { file: e.media.name } : {}), ...(e.fromMe ? { status: 'sent' } : {}) };
    list.push(message);
    list.sort((x, y) => (x.at || 0) - (y.at || 0));
    if (list.at(-1) === message) Object.assign(c, { preview: text, translation: '', last: message.time, lastAt: e.at });
    // What was fetched while catching up is not news: no unread count of its own, no signal, no translation.
    if (!e.fromMe && !e.history) {
      const closed = lcIsClosed(c);
      c.unread = (Number(c.unread) || 0) + 1;
      if (closed) lcLog(c.id, 'inbound', '已结束跟进的客户主动发来新消息（触发复联信号）');
    }
    if (!e.history && e.type === 'text' && e.text) aiTranslateInbound(c, message);
    return true;
  }

  // Draws the page again after the feed changed the data, without disturbing what is being typed.
  let openwaComposing = false, openwaStale = false;
  document.addEventListener('compositionstart', () => { openwaComposing = true; });
  document.addEventListener('compositionend', () => { openwaComposing = false; if (openwaStale) openwaRefresh(); });
  // A list box in the strips above a conversation (the customer's language, grade, status) that has the focus is
  // being chosen from: drawing the page again would close it under the pointer. A refresh is put off until the
  // choice is made or the list box is left — and for ten seconds at most, so that a list box that merely kept
  // the focus cannot hold new messages back.
  const OPENWA_HOLD_MS = 10000;
  let openwaHold = 0;
  for (const type of ['change', 'focusout']) {
    document.addEventListener(type, event => {
      if (event.target?.tagName === 'SELECT') setTimeout(() => { if (openwaStale) openwaRefresh(); }, 0);
    });
  }
  function openwaRefresh() {
    if (openwaComposing) return void (openwaStale = true);
    const chosenFrom = document.activeElement?.tagName === 'SELECT' && document.activeElement.closest('.lc-chat-strip, .source-strip');
    if (chosenFrom && openwaHold !== -1) {
      openwaHold ||= setTimeout(() => {
        openwaHold = -1;
        if (openwaStale) openwaRefresh();
      }, OPENWA_HOLD_MS);
      return void (openwaStale = true);
    }
    clearTimeout(openwaHold);
    openwaHold = 0;
    openwaStale = false;
    const el = document.activeElement, id = $('#view').contains(el) ? el.id : '';
    const range = id && typeof el.selectionStart === 'number' ? [el.selectionStart, el.selectionEnd] : null;
    const box = $('#messages'), atBottom = !box || box.scrollHeight - box.clientHeight - box.scrollTop <= 40, top = box?.scrollTop;
    const listTop = $('#conversation-list')?.scrollTop;
    render();
    if ($('#conversation-list') && listTop) $('#conversation-list').scrollTop = listTop;
    if (!atBottom && $('#messages')) requestAnimationFrame(() => { const again = $('#messages'); if (again) again.scrollTop = top; });
    const again = id && document.getElementById(id);
    if (again) {
      if (again !== document.activeElement) again.focus({ preventScroll: true });
      if (range && typeof again.setSelectionRange === 'function') again.setSelectionRange(...range);
    }
  }

  const openwaWait = ms => new Promise(resolve => setTimeout(resolve, ms));
  // Reads the feed for as long as the page is open. Another page that opens the sub-site takes the feed over.
  async function openwaListen() {
    const status = await openwaCall('GET', 'status');
    if (status.status !== 200) return;
    openwaServer = { configured: Boolean(status.body.configured), reachable: Boolean(status.body.reachable) };
    if (!openwaServer.configured) return render();
    let changed = false;
    // Messages that were on their way when the page was closed: their outcome is open, and sending again is safe.
    for (const list of Object.values(data.messages)) for (const m of list) if (m.status === 'sending') { m.status = 'unknown'; changed = true; }
    if (changed) persist();
    if ((await openwaCall('POST', 'claim', { client: openwaClient })).status !== 200) return render();
    // First everything that happened while no page was open; then the numbers' states as the server sees them now.
    for (let failures = 0, caughtUp = false; ;) {
      const answer = await openwaCall('GET', `events?after=${Number(data.waCursor) || 0}&client=${openwaClient}&wait=${caughtUp ? 25 : 0}`);
      if (answer.status === 409 && answer.body.error === 'taken-over') return window.WA_SITE.halt('已在其他页面打开', '这个子站刚刚在另一个页面或设备上打开，新消息改由那里接收。需要在本页继续时，请刷新页面。');
      if (answer.status === 401) return window.WA_SITE.halt('登录已失效', '请刷新页面后重新登录。');
      if (answer.status !== 200) {
        failures += 1;
        await openwaWait(Math.min(30000, 1000 * 2 ** failures));
        continue;
      }
      failures = 0;
      let applied = false;
      for (const e of answer.body.events) applied = openwaApply(e) || applied;
      if (openwaJoinTwins()) {
        applied = true;
        persist();
      }
      if (answer.body.last > (Number(data.waCursor) || 0)) {
        data.waCursor = answer.body.last;
        persist();
      }
      if (!caughtUp && !answer.body.events.length) {
        caughtUp = true;
        const now = await openwaCall('GET', 'status');
        if (now.status === 200 && now.body.reachable) {
          openwaServer = { configured: true, reachable: true };
          for (const a of data.accounts) {
            const link = now.body.accounts.find(x => x.account === a.id);
            if (link ? openwaSetState(a, link) : a.linked && openwaSetState(a, { state: 'missing' })) applied = true;
          }
          if (applied) persist();
        }
        applied = true;
      }
      if (applied) openwaRefresh();
    }
  }

  Object.assign(fidActions, {
    openwaBind:id=>{
      const a = openwaVisibleAccount(id);
      if (id && a?.state !== 'pending') return;
      openwaBeginPairing('bind',a);
    },
    openwaRetry:()=>{
      const pair = openwaPairing;
      if (pair?.phase !== 'error') return;
      Object.assign(pair, { phase: 'starting', qr: '', error: '' });
      openwaShowPairing();
      openwaRequestLink(pair);
    },
    openwaOpenChat,
    openwaReturnToChat:id=>{
      if (ui.view !== 'inbox' || fid.waTab !== 'chat' || !fid.chatOpen) return openwaOpenChat(id);
      close();
      render();
      $('#composer-text')?.focus({preventScroll:true});
    },
    connect:openwaReconnect,
    openwaUnlinkAsk:id=>{
      const a = openwaVisibleAccount(id);
      if (a && a.state !== 'pending') fidConfirm('解除绑定', `解除「${a.name}」与 WhatsApp 的关联？聊天记录会保留，之后可以重新扫码绑定。`, 'openwaUnlink', id);
    },
    openwaUnlink:async id=>{
      const a = openwaVisibleAccount(id);
      if (!a) return;
      close();
      const answer = await openwaCall('POST', 'unlink', { account: id });
      if (answer.status !== 200 && answer.status !== 404) return toast(openwaProblem(answer));
      Object.assign(a, { state: 'pending', linked: false, linkState: '', lastSync: '已解除绑定' });
      persist();
      render();
      toast('已解除绑定。');
    },
    openwaResend:id=>{
      const c = selectedCustomer(), m = c && (data.messages[c.id] || []).find(m => m.id === id);
      if (!m || !['failed', 'unknown'].includes(m.status) || !m.request) return;
      if (account(c.account)?.state !== 'online') return toast('号码尚未连接，暂时不能重试。');
      m.status = 'sending';
      persist();
      openwaRefresh();
      openwaDeliver(c, m);
    },
  });

  openwaDialog.addEventListener('close', () => {
    if (openwaDialog.open || !openwaPairing) return;
    openwaAbandon(openwaPairing);
    openwaPairing = null;
  });
  setTimeout(openwaListen, 0);

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
  // WhatsApp SCRM Customer Engagement Loop (v0.8)
  // Every customer being followed up must have a next follow-up. A customer leaves
  // the loop only when follow-up is explicitly ended, and resurfaces when they write
  // again. User-defined tags are the only classification.
  // Lifecycle stages, pipelines and quotes/orders were removed in v0.8 (deferred).
  // The file name and the `lc` prefix are kept from the lifecycle build on purpose.
  // ============================================================================

  const lcIsClosed = c => c?.engagement === 'closed';

  // Saved data from the stage-based builds (v0.6 / v0.7): a customer archived as lost becomes "已结束跟进".
  // This is the only place allowed to read the legacy stage fields.
  function lcMigrateEngagement(c) {
    if (c.engagement === 'open' || c.engagement === 'closed') return;
    const legacyStage = (data.pipelines || []).flatMap(p => p.stages || []).find(s => s.id === c.stage);
    const wasLost = legacyStage?.category === 'lost' || c.stage === '流失归档';
    c.engagement = wasLost ? 'closed' : 'open';
    if (wasLost) {
      c.closedReason ||= [c.lostReason, c.lostDetail].filter(Boolean).join(' · ') || '未记录原因';
      c.closedAt ||= c.stageEnteredAt || c.updatedAt || null;
    }
  }

  const LC_INTENT_LEVELS = ['高意向', '中意向', '了解中'];

  // Customer tier (set by hand; S is the highest). '' means not rated yet.
  const LC_TIERS = ['S', 'A', 'B', 'C', 'D'];
  const LC_TIER_TONES = { S: 'purple', A: 'blue', B: 'jade', C: 'gold', D: 'slate' };
  // Customer status (set by hand; one value). '' means not marked yet.
  const LC_CUSTOMER_STATUSES = [['converted', '已成交', 'ok'], ['abandoned', '弃单', 'warn'], ['organic', '自然线索', 'info']];
  const lcTier = c => LC_TIERS.includes(c?.tier) ? c.tier : '';
  const lcCustomerStatus = c => LC_CUSTOMER_STATUSES.some(([id]) => id === c?.customerStatus) ? c.customerStatus : '';
  const lcCustomerStatusLabel = c => LC_CUSTOMER_STATUSES.find(([id]) => id === lcCustomerStatus(c))?.[1] || '未标记';
  const lcTierBadge = c => lcTier(c)
    ? `<span class="lc-stage-badge lc-tier ${LC_TIER_TONES[lcTier(c)]}" title="客户等级：${lcTier(c)} 级">${lcTier(c)}</span>`
    : '<span class="lc-pill neutral">未评级</span>';
  const lcCustomerStatusPill = c => `<span class="lc-pill ${LC_CUSTOMER_STATUSES.find(([id]) => id === lcCustomerStatus(c))?.[2] || 'neutral'}">${esc(lcCustomerStatusLabel(c))}</span>`;
  // Two drop-downs that save as soon as they change (see the change listener at the end of this file).
  function lcGradeControls(c) {
    return `<label class="lc-inline-select"><span>等级</span><select class="fid-select" data-lc-tier="${esc(c.id)}" aria-label="客户等级">${option('', '未评级', lcTier(c))}${LC_TIERS.map(t => option(t, t + ' 级', lcTier(c))).join('')}</select></label>
      <label class="lc-inline-select"><span>客户状态</span><select class="fid-select" data-lc-status="${esc(c.id)}" aria-label="客户状态">${option('', '未标记', lcCustomerStatus(c))}${LC_CUSTOMER_STATUSES.map(([id, label]) => option(id, label, lcCustomerStatus(c))).join('')}</select></label>`;
  }

  const lcState = {
    followTab: 'todo',
    followTags: [],
    followFocus: null,
    customerHealthFilter: 'all',
    customerTier: 'all',
    customerStatus: 'all',
    dossierTab: 'overview',
    timelineFilter: 'all',
    orderOpen: [],
  };

  function lcSeed() {
    // Ensure every customer has an engagement state and safe defaults
    for (const c of data.customers) {
      lcMigrateEngagement(c);
      c.intentLevel ||= '中意向';
      c.reactivatedCount ??= 0;
      c.qualification = {
        demand: '',
        volume: '',
        deliveryRegion: `${country(c)}${c.city && c.city !== '待补充' ? ' · ' + c.city : ''}`,
        objection: '',
        commWindow: aiCustomerLanguage(c) ? `${aiCustomerLanguage(c)}沟通` : '',
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
    Object.assign(lcState, { followTab: 'todo', followTags: [], followFocus: null, customerHealthFilter: 'all', customerTier: 'all', customerStatus: 'all', orderOpen: [] });
    lcSeed();
  };

  // Keep the engagement views in the workspace tabs; the base customer list's stage filter is no longer offered
  ui.openTabs = [...new Set(['dashboard', 'inbox', 'customers', 'followups', ...ui.openTabs.filter(id => Object.hasOwn(views, id))])];
  ui.customerStage = 'all';

  // ============================================================================
  // Engagement health signals
  // ============================================================================
  const lcNextTask = cid => data.tasks.filter(t => t.customer === cid && !t.done).sort((a, b) => new Date(a.due) - new Date(b.due))[0] || null;

  // A customer has a follow-up status only where a person made one: an unfinished to-do (`planned`), or a
  // follow-up that was ended by hand (`closed`). Without either, `primary` is null and the page shows nothing
  // about follow-ups for the customer.
  function lcHealth(c) {
    const closed = lcIsClosed(c);
    const nextTask = lcNextTask(c.id);
    const planned = !closed && Boolean(nextTask);
    const awaitingReply = planned && c.unread > 0;
    const recontact = closed && c.unread > 0;
    const overdue = planned && beforeToday(nextTask.due);

    let primary = planned ? { key: 'healthy', label: '跟进正常', tone: 'ok', icon: 'BadgeCheck' } : null;
    if (recontact) primary = { key: 'recontact', label: '复联待处理', tone: 'hot', icon: 'Flame' };
    else if (overdue) primary = { key: 'overdue', label: '跟进已逾期', tone: 'hot', icon: 'ClockAlert' };
    else if (awaitingReply) primary = { key: 'reply', label: '客户待回复', tone: 'warn', icon: 'Zap' };
    else if (closed) primary = { key: 'closed', label: '已结束跟进', tone: 'neutral', icon: 'Archive' };

    return { primary, nextTask, closed, planned, awaitingReply, recontact, overdue };
  }

  // Does the customer carry this status: 'reply', 'overdue' or 'recontact'. The dashboard counts by it.
  function lcMatchesSignal(c, signal) {
    const h = lcHealth(c);
    if (signal === 'reply') return h.awaitingReply;
    if (signal === 'overdue') return h.overdue;
    return signal === 'recontact' && h.recontact;
  }
  const lcHasFollowTags = c => lcState.followTags.every(id => c.tags.includes(id));

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

  function lcCreateTask({ customerId, title, dueIso, priority = 'normal' }) {
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
      done: false,
    };
    data.tasks.push(t);
    const next = lcNextTask(c.id);
    c.followup = next?.due || due;
    return t;
  }

  // End follow-up: the customer leaves the loop and pending to-dos are settled.
  // A later inbound message raises the "复联待处理" signal.
  function lcCloseEngagement(c, reason) {
    c.engagement = 'closed';
    c.closedReason = reason;
    c.closedAt = new Date().toISOString();
    for (const t of data.tasks) {
      if (t.customer === c.id && !t.done) {
        t.done = true;
        t.outcome = '随结束跟进自动结清';
        t.completedAt = c.closedAt;
      }
    }
    c.followup = null;
    c.unread = 0; // messages already seen when ending; anything unread afterwards is a real re-contact
    lcLog(c.id, 'followup', `结束跟进 · ${reason}`);
  }

  // Resume follow-up for a customer whose follow-up had ended; all history is kept.
  function lcReopenEngagement(c) {
    if (!lcIsClosed(c)) return;
    c.engagement = 'open';
    c.reactivatedCount = (c.reactivatedCount || 0) + 1;
    c.unread = 0;
    lcLog(c.id, 'followup', `重新跟进（第 ${c.reactivatedCount} 次）· 此前结束原因：${c.closedReason || '未记录'}`);
  }

  // Apply the tag checkboxes embedded in a follow-up dialog. Tags the current agent cannot see stay untouched.
  function lcApplyFormTags(c, f) {
    if (f.get('tagsTouched') !== '1') return;
    const allowed = new Set(myTags().map(t => t.id));
    const chosen = f.getAll('tags').map(String).filter(id => allowed.has(id));
    const next = [...new Set([...c.tags.filter(id => !allowed.has(id)), ...chosen])];
    if (next.length === c.tags.length && next.every(id => c.tags.includes(id))) return;
    c.tags = next;
    lcLog(c.id, 'profile', '同步更新客户标签');
  }

  // Collapsed tag picker for follow-up dialogs; '' when the agent has no tags yet.
  function lcTagDetails(c) {
    const choices = fidTagChoices(c.tags);
    return choices
      ? `<details class="lc-tag-details"><summary>同步更新客户标签（当前 ${c.tags.length} 个）</summary><input type="hidden" name="tagsTouched" value="1"><div class="fid-tag-picker">${choices}</div></details>`
      : '';
  }

  // ============================================================================
  // Navigation & Sidebar Integration
  // ============================================================================
  const lcCustomerMenu = ['customers', 'followups', 'chat-records', 'tags', 'tag-stats'];
  viewIcon = id => ({
    dashboard: 'LayoutDashboard',
    inbox: 'MessageCircle',
    accounts: 'Smartphone',
    customers: 'ContactRound',
    followups: 'ClipboardList',
    'chat-records': 'MessagesSquare',
    tags: 'Tags',
    'tag-stats': 'ChartColumn',
    materials: 'Images',
    team: 'Network',
    members: 'UsersRound',
    ai: 'Sparkles',
  }[id] || 'FileText');

  menuHTML = function(mobile = false) {
    // The follow-up centre holds what people entered by hand; its entry in the menu counts the viewer's to-dos
    // that are past their day.
    const late = myTasks().filter(t => !t.done && beforeToday(t.due)).length;
    const renderItem = (id, label) => {
      const badge = id === 'followups' && late && !mobile
        ? `<span class="nav-count" title="已逾期待办">${late}</span>`
        : '';
      return `<a class="nav-item ${ui.view === id ? 'active' : ''}" href="#${id}" data-nav="${id}" aria-label="${esc(label)}" title="${esc(label)}" ${ui.view === id ? 'aria-current="page"' : ''}>${icon(viewIcon(id))}<span class="nav-label">${esc(label)}</span>${badge}</a>`;
    };
    const navGroup = (title, glyph, action, opened, ids) =>
      `<button class="nav-group-button ${ids.includes(ui.view) ? 'group-active' : ''}" data-action="${action}" aria-expanded="${opened}">${icon(glyph)}<span class="nav-label">${title}</span>${icon(opened ? 'ChevronUp' : 'ChevronDown')}</button><div class="submenu" ${opened ? '' : 'hidden'}>${ids.map(id => renderItem(id, views[id])).join('')}</div>`;
    return (
      renderItem('dashboard', views.dashboard) +
      renderItem('inbox', views.inbox) +
      renderItem('accounts', views.accounts) +
      '<div class="nav-caption">客户与跟进</div>' +
      navGroup('客户与跟进闭环', 'ContactRound', 'fidNavCustomers', ui.customerNavOpen, lcCustomerMenu) +
      (operationsMenu.length ? navGroup('运营管理', 'Images', 'fidNavOperations', fid.operationsOpen, operationsMenu) : '') +
      (manager() ? '<div class="nav-caption">账户与组织</div>' + navGroup('组织管理', 'Network', 'fidNavOrg', fid.orgOpen, ['team', 'members']) : '') +
      '<div class="nav-caption">工作台设置</div>' +
      renderItem('ai', views.ai) +
      renderItem('prices', views.prices)
    );
  };

  // ============================================================================
  // Customer 360° dossier drawer
  // ============================================================================
  // Order tracking (the 订单追踪 tab). Orders are typed in by hand — no shop or courier system is
  // connected — and live on the customer as c.orders: { id, number, placedAt, shipping }.
  // The top-level orders list that saved data of the removed deals centre may still hold has another
  // shape and is never read or written here.
  // Shipping status: [id, label, pill tone, icon].
  const LC_SHIPPING = [['pending', '待发货', 'warn', 'Clock3'], ['shipped', '已发货', 'info', 'Send'], ['delivered', '已签收', 'ok', 'CircleCheck'], ['problem', '异常（退回/丢件）', 'hot', 'TriangleAlert']];
  const lcShipping = id => LC_SHIPPING.find(s => s[0] === id) || LC_SHIPPING[0];
  // Shipping moves along one path, pending → shipped → delivered, or leaves it for `problem` at any
  // point before delivery. A delivered order and an order marked `problem` have no further step.
  const LC_SHIPPING_NEXT = { pending: 'shipped', shipped: 'delivered' };
  // The forward path as a list: the three segments of the progress bar in the head of an order block.
  const LC_SHIPPING_PATH = ['pending', 'shipped', 'delivered'];
  // The customer's orders, newest first (a copy; write through c.orders).
  const lcOrders = c => (Array.isArray(c?.orders) ? c.orders : []).slice().sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  // The shipping entries of an order, oldest first: { shipping, at }. An order saved before the history
  // existed gets the steps its status implies, with no time for the steps that were never recorded.
  function lcOrderHistory(o) {
    if (Array.isArray(o.history)) return o.history;
    const implied = { shipped: ['shipped'], delivered: ['shipped', 'delivered'], problem: ['problem'] }[lcShipping(o.shipping)[0]] || [];
    return [{ shipping: 'pending', at: o.placedAt }, ...implied.map(shipping => ({ shipping, at: null }))];
  }

  profileHTML = function(c) {
    const a = account(c.account);
    const m = member(c.owner);
    const h = lcHealth(c);
    const tab = ['overview', 'timeline', 'orders', 'notes'].includes(lcState.dossierTab) ? lcState.dossierTab : 'overview';
    const dirtyNote = Object.hasOwn(ui.noteDrafts, c.id);

    let tabBody = '';
    // Content pinned below the scrolling body; only the 订单追踪 tab uses it (the order form).
    let tabFoot = '';
    if (tab === 'overview') {
      const nextCard = h.nextTask
        ? `<div class="lc-card-block ${h.overdue ? 'hot-block' : ''}">
             <div class="lc-block-head">
               <h3>${icon(h.overdue ? 'ClockAlert' : 'CalendarClock')}当前待办跟进 ${h.overdue ? '<span class="lc-pill hot">已逾期</span>' : ''}</h3>
               <div class="lc-deal-actions">
                 ${fidButton('完成并闭环', 'taskDone', 'CheckCircle2', 'slim blue', fidActionID(h.nextTask.id))}
                 ${fidButton('新增待办', 'followup', 'Plus', 'slim', fidActionID(c.id))}
                 ${fidButton('结束跟进', 'lcCloseOpen', 'Archive', 'slim', fidActionID(c.id))}
               </div>
             </div>
             <p style="font-size:13px;font-weight:650">${esc(h.nextTask.title)}</p>
             <small style="color:var(--color-text-muted)">计划时间：${esc(dateLabel(h.nextTask.due))}</small>
           </div>`
        : h.closed
          ? `<div class="lc-card-block">
               <div class="lc-block-head">
                 <h3>${icon('Archive')}已结束跟进</h3>
                 ${fidButton('重新跟进', 'followup', 'RotateCcw', 'slim blue', fidActionID(c.id))}
               </div>
               <p style="font-size:12px;color:var(--fid-ink)">结束原因：${esc(c.closedReason || '未记录')}${c.closedAt ? `（${esc(fidDate(c.closedAt).slice(0, 10))}）` : ''}。客户再次来信时会提示「复联待处理」。</p>
             </div>`
          : '';

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
    } else if (tab === 'timeline') {
      const raw = data.activities[c.id] || [];
      const catLabels = { all: '全部轨迹', followup: '跟进动作', inbound: '客户来信', order: '订单记录', profile: '资料与标签' };
      const filtered = raw.filter(item => {
        if (lcState.timelineFilter === 'all') return true;
        const cat = item.category || (item.text.includes('跟进') ? 'followup' : 'profile');
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
    } else if (tab === 'orders') {
      const orders = lcOrders(c);
      // One block per order number. Inside it, one entry per shipping step the order has reached,
      // oldest first; the first entry carries the time the order was placed.
      const orderSections = orders.map(o => {
        const [status, statusLabel, statusTone] = lcShipping(o.shipping);
        const next = LC_SHIPPING_NEXT[status] ? lcShipping(LC_SHIPPING_NEXT[status]) : null;
        const stepAttrs = `${fidActionID(o.id)} data-customer="${esc(c.id)}"`;
        const history = lcOrderHistory(o);
        // Collapsed by default; lcState.orderOpen lists the blocks the viewer has opened.
        const open = lcState.orderOpen.includes(o.id);
        // Progress bar: one segment per step of the forward path, filled up to the furthest step the order
        // has reached (an order in exception keeps what it had reached), in the colour of the current status.
        const reached = Math.max(0, ...history.map(entry => LC_SHIPPING_PATH.indexOf(lcShipping(entry.shipping)[0]))) + 1;
        const progress = `<span class="lc-order-progress ${statusTone}" role="img" title="${esc(statusLabel)}" aria-label="物流状态：${esc(statusLabel)}">${LC_SHIPPING_PATH.map((step, i) => `<i${i < reached ? ' class="on"' : ''}></i>`).join('')}</span>`;
        const entries = history.map((entry, i) => {
          const [, label, tone, glyph] = lcShipping(entry.shipping);
          return `<div class="lc-deal-item">
            <span class="lc-pill ${tone}">${icon(glyph)}${esc(label)}</span>
            <span class="muted" style="font-size:12px">${entry.at ? (i ? '' : '下单时间 ') + esc(fidDate(entry.at)) : '时间未记录'}</span>
          </div>`;
        }).join('');
        return `<div class="lc-card-block lc-order${open ? ' is-open' : ''}">
          <div class="lc-block-head lc-order-head">
            <h3><button type="button" class="lc-order-toggle" data-action="lcOrderToggle" ${stepAttrs} aria-expanded="${open}" title="${open ? '收起物流记录' : '展开物流记录'}">${icon(open ? 'ChevronDown' : 'ChevronRight')}订单 ${esc(o.number)}</button><span class="lc-order-time">下单时间 ${esc(fidDate(o.placedAt))}</span>${progress}</h3>
            <div class="lc-deal-actions">
              ${next ? `<button type="button" class="icon-button lc-step-next" data-action="lcOrderShipping" ${stepAttrs} data-shipping="${next[0]}" title="标记${next[1]}" aria-label="订单 ${esc(o.number)}：标记${next[1]}">${icon(next[3])}</button>` : ''}
              ${next ? `<button type="button" class="icon-button lc-step-problem" data-action="lcOrderShipping" ${stepAttrs} data-shipping="problem" title="标记异常" aria-label="订单 ${esc(o.number)}：标记异常">${icon('TriangleAlert')}</button>` : ''}
              <button type="button" class="icon-button" data-action="lcOrderUndo" ${stepAttrs} title="${history.length > 1 ? '撤销上一步' : '暂无可撤销的步骤'}" aria-label="订单 ${esc(o.number)}：撤销上一步" ${history.length > 1 ? '' : 'disabled'}>${icon('RotateCcw')}</button>
              <button type="button" class="icon-button" data-action="lcOrderRemove" ${stepAttrs} title="删除订单" aria-label="删除订单 ${esc(o.number)}">${icon('Trash2')}</button>
            </div>
          </div>
          ${open ? `<div class="lc-deal-list">${entries}</div>` : ''}
        </div>`;
      }).join('');
      tabBody = `
        <div class="lc-card-block">
          <div class="lc-block-head"><h3>${icon('MessageCircle')}首次联系</h3></div>
          <div class="info-row"><span>首次联系时间</span><span><strong>${esc(fidDate(c.createdAt))}</strong></span></div>
          <div class="info-row"><span>进线渠道</span><span>${esc(c.source || '—')}</span></div>
        </div>
        ${orderSections || `<div class="lc-card-block">
          <div class="lc-block-head"><h3>${icon('ClipboardList')}订单与物流</h3></div>
          <p class="muted" style="font-size:12px">暂无订单。客户下单后，在下方登记订单号与下单时间。</p>
        </div>`}`;
      // The order form is pinned to the bottom of the drawer; the list of orders scrolls above it.
      tabFoot = `
        <form id="lc-order-form" class="lc-card-block">
          <input type="hidden" name="customerId" value="${esc(c.id)}">
          <div class="lc-block-head">
            <h3>${icon('SquarePen')}登记订单</h3>
            <button type="submit" class="fid-btn slim blue">${icon('Plus')}添加订单</button>
          </div>
          <div class="lc-qual-grid">
            <label class="lc-field"><span>订单号</span><input class="fid-input" name="number" required maxlength="40" placeholder="如 ORD-202611-105"></label>
            <label class="lc-field"><span>下单时间</span><input class="fid-input" type="datetime-local" name="placedAt" required value="${inputDate(new Date().toISOString())}"></label>
          </div>
          <div id="form-error" class="form-error" role="alert"></div>
        </form>`;
    } else {
      tabBody = `
        <div class="lc-card-block customer-profile" style="border:1px solid var(--fid-frame)">
          <div class="lc-block-head"><h3>${icon('StickyNote')}客户沟通备忘与交接摘要</h3></div>
          <textarea class="profile-note" style="width:100%;min-height:140px" data-note-customer="${esc(c.id)}" id="customer-note-${esc(c.id)}-drawer" aria-label="客户备注" placeholder="记录客户性格偏好、关键决策人、特殊包装或历史约定…">${esc(dirtyNote ? ui.noteDrafts[c.id] : c.notes)}</textarea>
          <div class="note-save" style="margin-top:10px;display:flex;justify-content:space-between;align-items:center">
            <span role="status" style="font-size:12px;color:var(--color-text-muted)">${dirtyNote ? '有未保存的修改' : '已保存到客户档案'}</span>
            <button type="button" class="fid-btn blue slim" data-action="saveNote" ${fidActionID(c.id)}>保存备注</button>
          </div>
        </div>`;
    }

    return `<aside class="lc-dossier customer-profile in-drawer" aria-label="${esc(c.name)}的客户档案">
      <div class="lc-dossier-head">
        <div class="lc-dossier-topbar">
          <span class="lc-dossier-eyebrow">${icon('Layers')}SCRM 客户 360° 档案</span>
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
                <span>${esc(aiLanguageLabel(c))}</span>
              </div>
            </div>
          </div>
          <div class="lc-dossier-actions">
            ${fidButton(h.closed ? '重新跟进' : '安排跟进', 'followup', 'CalendarPlus', 'tint slim', fidActionID(c.id))}
            ${fidButton('打开会话', 'openConversation', 'MessageCircle', 'blue slim', fidActionID(c.id))}
          </div>
        </div>
        <div class="lc-dossier-grade">${lcGradeControls(c)}</div>
      </div>
      <div class="lc-dossier-kpis">
        ${h.primary ? `<div class="lc-mini-kpi"><span>当前跟进状态</span><strong style="font-size:12px">${esc(h.primary.label)}</strong></div>
        <div class="lc-mini-kpi"><span>下次跟进</span><strong>${h.nextTask ? esc(dateLabel(h.nextTask.due)) : '未安排'}</strong></div>` : ''}
        <div class="lc-mini-kpi"><span>最近互动</span><strong>${esc(c.last || '—')}</strong></div>
        ${h.primary ? `<div class="lc-mini-kpi"><span>重新跟进次数</span><strong>${c.reactivatedCount || 0} 次</strong></div>` : ''}
      </div>
      <div class="lc-dossier-tabs" role="tablist" aria-label="客户档案分栏">
        ${[
          ['overview', '画像与跟进', ''],
          ['timeline', '互动轨迹', (data.activities[c.id] || []).length],
          ['orders', '订单追踪', lcOrders(c).length],
          ['notes', '沟通备注', ''],
        ].map(([id, label, count]) =>
          `<button type="button" role="tab" class="lc-dossier-tab ${tab === id ? 'active' : ''}" data-action="lcDossierTab" ${fidActionID(id)} data-customer="${esc(c.id)}" aria-selected="${tab === id}">${esc(label)}${count !== '' ? `<b>${count}</b>` : ''}</button>`
        ).join('')}
      </div>
      <div class="lc-dossier-body">${tabBody}</div>
      ${tabFoot ? `<div class="lc-dossier-foot">${tabFoot}</div>` : ''}
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
    lcSyncDossierFoot();
  };

  function lcRefreshOpenDossier(cid) {
    const dlg = $('#dialog');
    if (dlg?.open && dlg.classList.contains('lc-dossier-drawer') && ui.customer === cid) {
      const c = customer(cid);
      if (c) {
        // Re-rendering the same tab keeps the reading position; a change of tab starts at the top.
        const sameTab = $('#dialog .lc-dossier-tab.active')?.dataset.id === lcState.dossierTab;
        const scrollTop = sameTab ? $('#dialog .lc-dossier-body')?.scrollTop || 0 : 0;
        $('#dialog .profile-dialog').innerHTML = profileHTML(c, true);
        paintIcons(dlg);
        if (scrollTop) $('#dialog .lc-dossier-body').scrollTop = scrollTop;
        lcSyncDossierFoot();
      }
    }
  }

  // Toasts are placed at the bottom of the dialog. The drawer records the height of its pinned footer
  // (0 when the tab has none) so that the stylesheet can place them above it.
  function lcSyncDossierFoot() {
    $('#dialog').style.setProperty('--lc-dossier-foot', ($('#dialog .lc-dossier-foot')?.offsetHeight || 0) + 'px');
  }

  // ============================================================================
  // Page: #followups (跟进闭环中心 — 待办队列 + 已结束跟进 + 操作日志). Everything in it was entered by hand; the
  // system adds the reminders of a to-do's day (due today, overdue). The statuses the system works out for a
  // customer are shown in the customer list and on the dashboard, not here.
  // ============================================================================
  renderFollowups = function() {
    const inScope = c => Boolean(c) && lcHasFollowTags(c);
    const allTasks = myTasks().filter(t => inScope(customer(t.customer)));
    const pending = allTasks.filter(t => !t.done);
    const overdue = pending.filter(t => beforeToday(t.due));
    const today = pending.filter(t => sameDay(t.due));
    const done = allTasks.filter(t => t.done);
    const customers = myCustomers().filter(inScope);
    const closedList = customers.filter(lcIsClosed);
    const marked = lcState.followTags.map(tag).filter(Boolean);
    const tab = ['todo', 'closed', 'history'].includes(lcState.followTab) ? lcState.followTab : 'todo';
    // The row opened from the chat strip (lcTrackFollow): a to-do, or a customer whose follow-up has ended.
    const focus = lcState.followFocus;
    const focusCustomer = c => focus && !focus.task && focus.customer === c.id ? ' class="lc-row-focus"' : '';

    const subtab = (id, label, glyph, count) =>
      `<button type="button" class="lc-subtab" data-action="lcFollowTab" data-id="${id}" aria-pressed="${tab === id}">${icon(glyph)}${label}<b>${count}</b></button>`;
    const headerTabs = `<div class="lc-radar-bar" style="margin-bottom:14px">
      <div class="lc-subtabs" role="tablist" aria-label="跟进闭环视图">
        ${subtab('todo', '跟进待办队列', 'ClipboardList', pending.length)}
        ${subtab('closed', '已结束跟进', 'Archive', closedList.length)}
        ${subtab('history', '跟进与操作日志', 'History', fidLogs().length)}
      </div>
      <div class="lc-radar-controls">
        ${fidButton('新建跟进任务', 'newTask', 'Plus', 'blue')}
      </div>
    </div>`;
    const tagBar = `<div class="fid-actions fid-tag-filter lc-follow-tags"><span>按标签筛选</span><span class="fid-small-note" aria-live="polite">${marked.length ? marked.map(t => esc(t.name)).join('、') : '未选'}</span>${fidButton('选择标签', 'lcFollowTagFilter', 'Tag')}${marked.length ? fidButton('清除标签', 'lcFollowTagClear', 'X') : ''}</div>`;
    const tagCell = c => `<div class="tag-row">${tagsHTML(c, 3) || '<span class="muted">未打标</span>'}</div>`;
    const nameCell = c => `<button type="button" class="fid-link" data-action="profile" ${fidActionID(c.id)}><strong>${esc(c.name)}</strong></button><span class="fid-cell-detail">${esc(c.phone)}</span>`;
    const page = (description, body) => `<section class="fid-page"><div class="lc-wrap">
      ${fidHead('跟进闭环中心', description)}
      ${headerTabs}
      ${body}
    </div></section>`;

    if (tab === 'closed') {
      const rows = closedList.map(c => {
        const h = lcHealth(c);
        return `<tr${focusCustomer(c)}>
          <td style="text-align:left">${nameCell(c)}</td>
          <td style="text-align:left">${esc(c.closedReason || '未记录原因')}<span class="fid-cell-detail">结束于 ${esc(c.closedAt ? fidDate(c.closedAt).slice(0, 10) : '—')}</span></td>
          <td style="text-align:left">${tagCell(c)}</td>
          <td><span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span></td>
          <td>${c.reactivatedCount || 0} 次</td>
          <td><div class="fid-icon-actions">
            ${fidButton('重新跟进', 'followup', 'RotateCcw', h.recontact ? 'slim blue' : 'slim tint', fidActionID(c.id))}
            ${fidButton('去聊天', 'openConversation', 'MessageCircle', 'slim', fidActionID(c.id))}
            ${fidIcon('移除已结束的跟进：' + c.name, 'lcClosedRemove', 'Trash2', c.id)}
          </div></td>
        </tr>`;
      }).join('');
      return page('已结束跟进的客户不再产生提醒；客户再次来信时会提示「复联待处理」，可随时重新跟进并保留全部历史。不再需要的记录可以移除。', `${tagBar}
        <div class="fid-table-card">${fidTable('lc-closed-table', ['客户', '结束原因', '标签', '当前信号', '重新跟进次数', '操作'], rows, '暂无已结束跟进的客户', true, 'Archive')}</div>`);
    }

    if (tab === 'history') {
      const f = fid.logFilter;
      const rows = fidLogs();
      const body = paged(rows, 'followups').map(({ c, entry, at, kind }) => {
        const label = entry.category === 'inbound' ? '客户来信' : kind;
        return `<tr><td>${esc(entry.by)}</td><td><span class="lc-pill neutral">${esc(label)}</span></td><td>${esc(account(c.account)?.name || '—')}</td><td><button class="fid-link" data-action="profile" ${fidActionID(c.id)}>${esc(c.name)}</button></td><td>${esc(c.phone)}</td><td>${esc(fidDate(at))}</td><td style="text-align:left">${esc(entry.text)}</td></tr>`;
      }).join('');
      return page('完整留存每一次跟进结果、结束与重新跟进、标签与资料修改记录。', `<div class="fid-panel fid-log">
          <form class="fid-filter-row fid-log-filter" id="fid-log-search-form"><div class="fid-range">${icon('Clock3')}<input id="fid-log-start" aria-label="开始时间" placeholder="开始时间" value="${esc(f.start)}" data-fid-date><span>~</span><input id="fid-log-end" aria-label="截止时间" placeholder="截止时间" value="${esc(f.end)}" data-fid-date></div><select class="fid-select" id="fid-log-app" aria-label="选择APP">${fidOption([['all', '请选择APP'], ['wa', 'WhatsApp']], f.app)}</select><div class="fid-joined"><select class="fid-select" id="fid-log-field" aria-label="跟进查询字段">${fidOption([['customer', '线索账号'], ['text', '内容'], ['actor', '操作人']], f.field)}</select><input class="fid-input" id="fid-log-query" aria-label="搜索跟进记录" placeholder="请输入线索账号或内容" value="${esc(f.query)}"></div><button class="fid-btn blue" type="submit">${icon('Search')}搜索</button>${fidButton('重选', 'fidLogReset', 'RotateCw')}</form>
          <div style="margin-top:14px">${fidTable('fid-log-table', ['操作人', '操作类型', '主账号', '线索账号信息', '线索账号', '创建日期', '内容'], body)}${fidPager(rows.length, 'followups')}</div>
        </div>`);
    }

    const filterKey = ui.taskFilter || 'pending';
    const list = (filterKey === 'done' ? done : filterKey === 'overdue' ? overdue : filterKey === 'today' ? today : pending)
      .slice().sort((a, b) => new Date(a.due) - new Date(b.due));
    if (focus?.task && !focus.placed) {
      const at = list.findIndex(t => t.id === focus.task);
      if (at >= 0) ui.pages.followups = Math.floor(at / (ui.pageSizes.followups || 10));
      focus.placed = true;
    }
    const taskRows = paged(list, 'followups').map(t => {
      const c = customer(t.customer);
      if (!c) return '';
      const isOverdue = !t.done && beforeToday(t.due);
      return `<tr${focus?.task === t.id ? ' class="lc-row-focus"' : ''}>
        <td style="text-align:left"><button type="button" class="fid-link" data-action="profile" ${fidActionID(c.id)}><strong>${esc(c.name)}</strong></button><span class="fid-cell-detail">${esc(account(c.account)?.name || '')} · ${esc(aiLanguageLabel(c))}</span></td>
        <td style="text-align:left">${tagCell(c)}</td>
        <td style="text-align:left"><span class="task-title ${t.done ? 'completed' : ''}"><strong>${esc(t.title)}</strong></span>${t.outcome ? `<span class="fid-cell-detail">结果：${esc(t.outcome)}</span>` : ''}</td>
        <td><span class="${isOverdue ? 'overdue' : ''}" style="font-weight:${isOverdue ? '700' : '400'}">${esc(dateLabel(t.due))}${isOverdue ? ' · 已逾期' : ''}</span></td>
        <td>${t.priority === 'high' ? '<span class="priority-badge">重点</span>' : '普通'}</td>
        <td><div class="fid-icon-actions">
          ${t.done
            ? fidButton('重开', 'taskDone', 'RotateCcw', 'slim', fidActionID(t.id))
            : fidButton('完成并闭环', 'taskDone', 'CheckCircle2', 'slim blue', fidActionID(t.id))}
          ${fidIcon('打开会话', 'openConversation', 'MessageCircle', c.id)}
          ${fidIcon('360° 档案', 'profile', 'ContactRound', c.id)}
          ${fidIcon('删除待办：' + t.title, 'lcTaskDelete', 'Trash2', t.id)}
        </div></td>
      </tr>`;
    }).join('');
    const taskChips = [
      ['pending', '全部待处理', pending.length, ''],
      ['overdue', '已逾期必处理', overdue.length, overdue.length ? 'is-hot' : ''],
      ['today', '今日到期', today.length, ''],
      ['done', '已完成', done.length, ''],
    ].map(([id, label, n, cls]) =>
      `<button type="button" class="lc-radar-chip ${cls}" data-action="taskFilter" ${fidActionID(id)} aria-pressed="${filterKey === id}">${esc(label)}<b>${n}</b></button>`
    ).join('');
    return page('完成一次跟进时，必须安排下一次跟进或明确结束跟进，确保每位客户都不会悬空。', `${tagBar}
      <div class="fid-panel">
        <div class="lc-radar-chips" style="margin-bottom:14px">${taskChips}</div>
        ${fidTable('lc-todo-table', ['客户 / 接待号', '标签', '跟进事项与结果', '计划跟进时间', '优先级', '闭环操作'], taskRows, '当前筛选下没有跟进任务', true, 'CalendarCheck')}
        ${fidPager(list.length, 'followups')}
      </div>`);
  };

  // ============================================================================
  // Page: #customers (客户列表 — 等级、客户状态、跟进状态与标签)
  // ============================================================================
  const lcOrigFilteredCustomers = filteredCustomers;
  // Customers after the search form and the follow-up filter, before the tier / status chips.
  const lcCustomerPool = () => lcOrigFilteredCustomers().filter(c => {
    if (lcState.customerHealthFilter === 'all') return true;
    const h = lcHealth(c);
    if (lcState.customerHealthFilter === 'reply') return h.awaitingReply;
    if (lcState.customerHealthFilter === 'overdue') return h.overdue;
    if (lcState.customerHealthFilter === 'recontact') return h.recontact;
    if (lcState.customerHealthFilter === 'closed') return h.closed;
    return true;
  });
  filteredCustomers = function() {
    return lcCustomerPool().filter(c =>
      (lcState.customerTier === 'all' || (lcTier(c) || 'none') === lcState.customerTier) &&
      (lcState.customerStatus === 'all' || (lcCustomerStatus(c) || 'none') === lcState.customerStatus));
  };

  customerRows = function() {
    const rows = paged(filteredCustomers(), 'customers');
    const tags = myTags();
    return rows.map((c, i) => {
      const a = account(c.account);
      const h = lcHealth(c);
      const assigned = tags.filter(t => c.tags.includes(t.id));
      const first = assigned[0];
      const tagPreview = first ? `<span class="tag ${esc(first.color)}">${esc(first.name)}</span>` : '<span>0 个</span>';
      const tagDetail = assigned.length > 1 ? `<small>+${assigned.length - 1}</small>` : icon('ChevronRight');
      return `<tr>
        <td><input type="checkbox" data-select-customer="${esc(c.id)}" aria-label="选择${esc(c.name)}" ${ui.selected.has(c.id) ? 'checked' : ''}></td>
        <td>${rowNumber('customers', i)}</td>
        <td>${esc(a?.name || '—')}<span class="fid-cell-detail">${esc(member(c.owner)?.name || '未分配')}</span></td>
        <td><button class="fid-link fid-note-link" data-action="profileNote" ${fidActionID(c.id)} title="${esc(c.notes || '')}" aria-label="查看${esc(c.name)}备注"><span class="fid-cell-note">${esc(c.qualification?.demand || c.notes || '—')}</span></button></td>
        <td><button class="fid-link" data-action="profile" ${fidActionID(c.id)} aria-label="查看${esc(c.name)}资料"><strong>${esc(c.name)}</strong></button><span class="fid-cell-detail">${esc(c.source)}</span></td>
        <td>${lcTierBadge(c)}</td>
        <td>${lcCustomerStatusPill(c)}</td>
        <td><button type="button" class="fid-link fid-tag-cell" data-action="fidViewCustomerTags" ${fidActionID(c.id)} aria-label="查看${esc(c.name)}的标签，共 ${assigned.length} 个">${tagPreview}${tagDetail}</button></td>
        <td>${esc(c.phone)}<span class="fid-cell-detail">${esc(country(c))} · ${esc(aiLanguageLabel(c))}</span></td>
        <td>${h.primary ? `<span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span><span class="fid-cell-detail">${h.nextTask ? esc(dateLabel(h.nextTask.due)) : '无待办'}</span>` : '—'}</td>
        <td>${esc(c.last || '—')}${c.unread ? `<span class="fid-cell-detail">${c.unread} 条未读</span>` : ''}</td>
        <td>${esc(fidDate(c.createdAt))}<span class="fid-cell-detail">更新 ${esc(fidDate(c.updatedAt))}</span></td>
        <td><div class="fid-icon-actions">${fidIcon('打开' + c.name + '会话', 'openConversation', 'MessageCircle', c.id)}${fidIcon('360° 客户档案：' + c.name, 'profile', 'ContactRound', c.id)}${fidIcon('安排跟进：' + c.name, 'followup', 'CalendarPlus', c.id)}</div></td>
      </tr>`;
    }).join('');
  };

  renderCustomers = function() {
    const list = filteredCustomers();
    const pool = lcCustomerPool();
    const marked = fid.customerTags.map(tag).filter(Boolean);
    const selected = ui.selected.size;
    const filters = `<form class="fid-customer-filter fid-rounded" id="fid-customer-search-form">
      <div class="fid-customer-platform"><span>平台:</span>${fidButton(fid.customerPlatform ? '全选(1)' : '全选(0)', 'fidCustomerPlatform', 'Check', 'fid-platform', `aria-pressed="${fid.customerPlatform}"`)}<span class="sr-only">WhatsApp</span></div>
      <div class="fid-filter-row fid-customer-fields">
        <input class="fid-input" id="fid-customer-start" aria-label="开始时间" placeholder="开始时间" value="${esc(fid.customerStart)}" data-fid-date><span> - </span>
        <input class="fid-input" id="fid-customer-end" aria-label="截止时间" placeholder="截止时间" value="${esc(fid.customerEnd)}" data-fid-date>
        <select class="fid-select" id="fid-customer-field" aria-label="客户查询字段">${fidOption([['name', '联系人'], ['phone', '手机号'], ['account', '主账号'], ['note', '备注'], ['source', '来源']], fid.customerField)}</select>
        <input class="fid-input" id="customer-search" aria-label="搜索客户库" placeholder="请输入" value="${esc(ui.customerQuery)}">
        <select class="fid-select" id="fid-customer-health-select" aria-label="跟进状态">${fidOption([['all', '全部跟进状态'], ['reply', '客户待回复'], ['overdue', '跟进已逾期'], ['recontact', '复联待处理'], ['closed', '已结束跟进']], lcState.customerHealthFilter)}</select>
        <select class="fid-select" id="fid-customer-country" aria-label="国家">${fidOption([['all', '请选择国家'], ['US', '美国'], ['PR', '波多黎各'], ['OTHER', '其他地区']], fid.customerCountry)}</select>
        <select class="fid-select" id="fid-customer-type" aria-label="客户类型">${fidOption([['all', '请选择客户类型'], '新增线索-实时', '新增线索-补录', '重复线索'], fid.customerType)}</select>
      </div>
      <div class="fid-actions fid-filter-submit"><button class="fid-btn gradient" type="submit">${icon('Search')}搜索</button>${fidButton('重置', 'fidCustomerReset', 'RotateCw')}</div>
      <div class="fid-actions fid-tag-filter"><span>标签查询</span><span class="fid-small-note" aria-live="polite">${marked.length ? marked.map(t => esc(t.name)).join('、') : '未选'}</span>${fidButton('选择标签', 'fidCustomerChooseTags', 'Tag')}${fidButton('重置标签', 'fidCustomerClearFilter', 'X')}</div>
    </form>`;
    const chip = (action, current, id, label, count) =>
      `<button type="button" class="lc-radar-chip" data-action="${action}" ${fidActionID(id)} aria-pressed="${current === id}">${esc(label)}<b>${count}</b></button>`;
    const tierCount = id => pool.filter(c => (lcTier(c) || 'none') === id).length;
    const statusCount = id => pool.filter(c => (lcCustomerStatus(c) || 'none') === id).length;
    const facets = `<div class="lc-customer-facets">
      <div class="lc-radar-chips" role="group" aria-label="按客户等级筛选"><span class="lc-facet-label">客户等级</span>${chip('lcCustomerTier', lcState.customerTier, 'all', '全部', pool.length)}${LC_TIERS.map(t => chip('lcCustomerTier', lcState.customerTier, t, t + ' 级', tierCount(t))).join('')}${chip('lcCustomerTier', lcState.customerTier, 'none', '未评级', tierCount('none'))}</div>
      <div class="lc-radar-chips" role="group" aria-label="按客户状态筛选"><span class="lc-facet-label">客户状态</span>${chip('lcCustomerStatusFilter', lcState.customerStatus, 'all', '全部', pool.length)}${LC_CUSTOMER_STATUSES.map(([id, label]) => chip('lcCustomerStatusFilter', lcState.customerStatus, id, label, statusCount(id))).join('')}${chip('lcCustomerStatusFilter', lcState.customerStatus, 'none', '未标记', statusCount('none'))}</div>
    </div>`;
    const toolbar = `<div class="fid-actions fid-list-toolbar">${fidButton('批量打标签', 'batchTags', 'Tag', 'gradient', selected ? '' : 'disabled')}${fidButton('清空标签', 'fidClearCustomerTags', 'Eraser', '', selected ? '' : 'disabled')}${fidButton('跟进闭环', '', 'ClipboardList', 'green', 'data-nav="followups"')}${fidButton('导出列表', 'fidExportCustomers', 'FileDown')}${fidButton('新增客户', 'addCustomer', 'Plus', 'slim')}<span class="fid-small-note">等级与客户状态在聊天界面或客户档案中调整</span></div>`;
    const header = ['<input type="checkbox" id="select-all-customers" aria-label="选择当前结果全部客户">', '序号', '主账号信息', '需求画像 / 备注', '联系人 / 来源', '等级', '客户状态', '标签', '手机号 / 地区', '跟进状态 / 下次跟进', '最近互动', '添加 / 更新时间', '操作 ' + icon('Settings2')];
    const table = fidTable('fid-customer-table', header, customerRows(), '暂无匹配客户', true).replace('<tbody>', '<tbody id="customer-rows">');
    return `<section class="fid-page"><h1 class="sr-only">客户列表</h1>${filters}${facets}${toolbar}<div class="fid-batchbar" id="batchbar" hidden><span id="selected-count">${selected}</span></div><div class="fid-table-card">${table}${fidPager(list.length, 'customers', [10, 20, 50])}</div></section>`;
  };

  fidForms['fid-customer-search-form'] = () => {
    Object.assign(fid, {
      customerField: $('#fid-customer-field').value,
      customerCountry: $('#fid-customer-country').value,
      customerType: $('#fid-customer-type').value,
      customerStart: $('#fid-customer-start').value,
      customerEnd: $('#fid-customer-end').value,
    });
    lcState.customerHealthFilter = $('#fid-customer-health-select')?.value || 'all';
    ui.customerQuery = $('#customer-search').value;
    ui.customerTag = 'all';
    ui.selected.clear();
    ui.pages.customers = 0;
    render();
  };

  const lcOrigResetCustomerFilters = fidActions.fidCustomerReset;
  fidActions.fidCustomerReset = () => {
    Object.assign(lcState, { customerHealthFilter: 'all', customerTier: 'all', customerStatus: 'all' });
    lcOrigResetCustomerFilters();
  };

  // The export of the earlier module does not know about tier and status; this one replaces it.
  fidActions.fidExportCustomers = function() {
    const safe = v => '"' + (/^[=+\-@\t\r]/.test(String(v ?? '')) ? "'" : '') + String(v ?? '').replaceAll('"', '""') + '"';
    const rows = [['主账号', '联系人', '手机号', '客户等级', '客户状态', '跟进状态', '最近互动', '客户类型', '国家', '标签'],
      ...filteredCustomers().map(c => [account(c.account)?.name, c.name, c.phone, lcTier(c) || '未评级', lcCustomerStatusLabel(c), lcHealth(c).primary?.label || '', c.last, c.clientType, country(c), c.tags.map(tag).filter(t => t && myTags().includes(t)).map(t => t.name).join('、')])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(r => r.map(safe).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whatsapp-客户列表.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('已导出当前筛选的客户列表。');
  };

  // ============================================================================
  // Page: #dashboard (经营概览 + 跟进闭环概览)
  // ============================================================================
  const lcBaseRenderDashboard = renderDashboard;
  renderDashboard = function() {
    const html = lcBaseRenderDashboard();
    const customers = myCustomers();
    const closedCount = customers.filter(lcIsClosed).length;
    const plannedCount = customers.filter(c => lcHealth(c).planned).length;
    const chip = (id, label, glyph, tone) => {
      const n = customers.filter(c => lcMatchesSignal(c, id)).length;
      return `<button type="button" class="lc-radar-chip ${n ? tone : ''}" data-action="lcJumpSignal" data-id="${id}">${icon(glyph)}${label} <b>${n}</b></button>`;
    };
    const lcPanel = `<section class="dash-lc-panel" aria-label="跟进闭环概览">
      <div class="dash-lc-head">
        <h2>${icon('ClipboardList')}跟进闭环概览</h2>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <span style="font-size:12px;color:var(--color-text-muted)">跟进中：<b>${plannedCount}</b> · 已结束跟进：<b>${closedCount}</b></span>
          <a class="dash-link" href="#followups" data-nav="followups">进入跟进闭环中心${icon('ChevronRight')}</a>
        </div>
      </div>
      <div class="dash-lc-alerts">
        <span style="font-size:12px;color:var(--color-text-muted);font-weight:600">待处理信号：</span>
        ${chip('reply', '客户待回复', 'Zap', 'is-alert')}
        ${chip('overdue', '跟进已逾期', 'ClockAlert', 'is-hot')}
        ${chip('recontact', '复联待处理', 'Flame', 'is-hot')}
      </div>
    </section>`;
    return html.replace('<div class="dash-grid">', lcPanel + '<div class="dash-grid">');
  };

  // ============================================================================
  // Page: #inbox (WhatsApp 在线聊天与跟进闭环联动)
  // ============================================================================
  // Tags on a conversation card: the first three the viewer may see, then a count of the rest.
  // The row never wraps; the full list is in its tooltip. A customer without tags gets no row.
  const LC_CARD_TAGS = 3;
  function lcConversationTags(c) {
    const visible = new Set(myTags().map(t => t.id));
    const names = c.tags.filter(id => visible.has(id)).map(id => tag(id).name);
    if (!names.length) return '';
    const more = names.length - LC_CARD_TAGS;
    return `<span class="conversation-tags" title="${esc('标签：' + names.join('、'))}">${tagsHTML(c, LC_CARD_TAGS)}${more > 0 ? `<span class="conversation-tags-more">+${more}</span>` : ''}</span>`;
  }

  conversationRows = function() {
    return filteredConversations().map(c => {
      const a = account(c.account);
      const selected = fid.chatOpen && c.id === ui.customer ? 'selected' : '';
      return `<button type="button" class="conversation ${selected}" aria-label="打开${esc(c.name)}的会话" data-action="openConversation" data-id="${esc(c.id)}">
        ${avatar(c)}
        <span class="conversation-main">
          <span class="conversation-line"><strong>${esc(c.name)}${lcTier(c) ? ' ' + lcTierBadge(c) : ''}</strong><time>${esc(c.last)}</time></span>
          <span class="conversation-preview"><span>${esc(c.preview)}</span>${c.unread ? `<span class="unread">${c.unread}</span>` : ''}</span>
          <span class="conversation-account">
            <span><span class="state-dot ${a?.state === 'online' ? '' : a?.state === 'pending' ? 'offline' : 'warning'}"></span>${esc(ui.account === 'all' ? a?.name : aiLanguageLabel(c))}</span>
          </span>
          ${lcConversationTags(c)}
        </span>
      </button>`;
    }).join('') || empty('没有匹配会话', '切换筛选，或清空搜索后再试。');
  };

  const lcPrevChatHTML = chatHTML;
  chatHTML = function(c) {
    let html = lcPrevChatHTML(c);
    const h = lcHealth(c);
    const strip = `<div class="lc-chat-strip" aria-label="客户跟进协同栏">
      ${h.primary ? `<button type="button" class="lc-pill lc-pill-link ${h.primary.tone}" data-action="lcTrackFollow" ${fidActionID(c.id)} title="在跟进闭环中查看此客户">${icon(h.primary.icon)}${esc(h.primary.label)}</button>` : ''}
      ${h.nextTask ? `<button type="button" class="lc-pill lc-pill-link info" data-action="lcTrackFollow" ${fidActionID(c.id)} title="在跟进闭环中查看此客户">${icon('CalendarClock')}下次跟进 ${esc(dateLabel(h.nextTask.due))}</button>` : ''}
      ${lcGradeControls(c)}
      <span class="tag-row">${tagsHTML(c, 3)}</span>
      <div class="lc-chat-strip-right">
        ${fidButton(h.closed ? '重新跟进' : '安排跟进', 'followup', 'CalendarPlus', h.closed ? 'slim blue' : 'slim tint', fidActionID(c.id))}
        ${fidButton('设置标签', 'assignTags', 'Tags', 'slim', fidActionID(c.id))}
        ${fidButton('移入聊天记录', 'fidArchiveOpen', 'Archive', 'slim', fidActionID(c.id))}
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
      ${t('客户 360° 档案', 'profile', 'ContactRound', true)}
      ${t('安排客户跟进', 'followup', 'CalendarPlus', true)}
      ${t('客户标签', 'assignTags', 'Tags', true)}
      ${t('客户沟通备注', 'profileNote', 'StickyNote', true)}
      <span class="tool-separator"></span>
      ${t('刷新视图', 'refreshUI', 'RefreshCw')}
      ${t('权限说明', 'fidChatPermissions', 'ShieldCheck')}
    </aside>`;
  };

  // ============================================================================
  // Dialogs: follow-up scheduling, closed-loop completion, ending follow-up, simulations
  // ============================================================================
  openFollowup = function(id = null) {
    const list = myCustomers();
    const c = id ? customer(id) : selectedCustomer();
    if (!list.length) return toast('请先新增客户。');
    const closed = lcIsClosed(c);
    fidForm(
      closed ? `重新跟进 · ${c.name}` : '安排客户下一步跟进',
      'lc-followup',
      `${fidFormRow('目标客户', `<select class="fid-select" style="width:100%" name="customer">${list.map(x => option(x.id, `${x.name}（${account(x.account)?.name || '未绑号'}${lcIsClosed(x) ? ' · 已结束跟进' : ''}）`, c?.id)).join('')}</select>`, '', true)}
       ${closed ? '<p class="fid-field-help" style="margin:0 0 12px">该客户已结束跟进。保存后重新纳入跟进闭环，历史记录全部保留。</p>' : ''}
       ${fidFormRow('跟进事项', `<input class="fid-input" style="width:100%" name="title" required maxlength="100" value="${esc(closed ? '重新联系并了解最新需求' : '跟进客户最新反馈')}" placeholder="写清本次跟进要达成的具体目标">`, '', true)}
       ${fidFormRow('提醒时间', `<input class="fid-input" style="width:100%" type="datetime-local" id="lc-due-input" name="due" required value="${inputDate(new Date(Date.now() + 24 * 3600000).toISOString())}">
         <div class="lc-quick-dates">
           <button type="button" data-action="lcQuickDue" data-id="2">2小时后</button>
           <button type="button" data-action="lcQuickDue" data-id="24">明天此时</button>
           <button type="button" data-action="lcQuickDue" data-id="72">3天后</button>
           <button type="button" data-action="lcQuickDue" data-id="168">7天后</button>
           <button type="button" data-action="lcQuickDue" data-id="720">30天后</button>
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
      if (lcIsClosed(c)) lcReopenEngagement(c);
      t.done = false;
      c.followup = lcNextTask(c.id)?.due || t.due;
      lcLog(c.id, 'followup', `重新打开跟进待办：${t.title}`);
      persist();
      render();
      lcRefreshOpenDossier(c.id);
      toast('已重新打开该条跟进待办。');
      return;
    }
    fidForm(
      `完成跟进闭环 · ${c.name}`,
      'lc-complete-task',
      `<input type="hidden" name="taskId" value="${esc(t.id)}">
       <div class="lc-card-block" style="margin-bottom:14px;background:var(--color-surface-alt)">
         <strong style="font-size:13px">已完成事项：${esc(t.title)}</strong>
         <small style="display:block;margin-top:3px;color:var(--color-text-muted)">完成后必须二选一：安排下一次跟进，或明确结束跟进，客户不会悬空。</small>
       </div>
       ${fidFormRow('跟进结果', `<select class="fid-select" style="width:100%" name="outcome" required>
         ${fidOption(['客户已积极回复推进', '已发送资料/方案待看', '客户暂未回复需顺延追访', '客户提出价格/时效异议', '客户确认意向', '已确认下单', '明确无需求/暂缓'], '客户已积极回复推进')}
       </select>`, '', true)}
       ${fidFormRow('结果纪要', `<input class="fid-input" style="width:100%" name="outcomeNote" placeholder="选填：补充客户反馈细节，将自动写入互动轨迹">`)}
       ${lcTagDetails(c)}
       ${fidFormRow('后续安排', `<select class="fid-select" style="width:100%" name="nextAction" id="lc-complete-next">${fidOption([['next', '继续跟进：安排下一次提醒'], ['close', '结束跟进：不再提醒，客户再次来信时提示复联']], 'next')}</select>`, 'lc-complete-next', true)}
       <div class="lc-card-block" id="lc-complete-next-block" style="background:var(--color-surface-alt)">
         <div class="lc-qual-grid">
           <label class="lc-field full"><span>下次跟进事项</span><input class="fid-input" name="nextTitle" required value="跟进客户最新反馈"></label>
           <label class="lc-field"><span>下次提醒时间</span><input class="fid-input" type="datetime-local" id="lc-due-input" name="nextDue" value="${inputDate(new Date(Date.now() + 48 * 3600000).toISOString())}"></label>
           <label class="lc-field"><span>优先级</span><select class="fid-select" name="nextPriority">${fidOption([['normal', '普通'], ['high', '重点优先']], 'normal')}</select></label>
         </div>
       </div>
       <div class="lc-card-block" id="lc-complete-close-block" style="background:var(--color-surface-alt)" hidden>
         <label class="lc-field full"><span>结束原因</span><input class="fid-input" name="closeReason" maxlength="80" placeholder="如：预算暂缓，下季度再联系"></label>
       </div>`,
      '确认完成并闭环',
      { wide: true }
    );
  }

  function openCloseEngagement(id) {
    const c = customer(id);
    if (!c || !myCustomers().includes(c) || lcIsClosed(c)) return;
    const pendingCount = data.tasks.filter(t => t.customer === c.id && !t.done).length;
    fidForm(
      `结束跟进 · ${c.name}`,
      'lc-close-engagement',
      `<input type="hidden" name="customerId" value="${esc(c.id)}">
       <p class="fid-field-help" style="margin:0 0 12px">结束后不再提醒跟进${pendingCount ? `，该客户名下 ${pendingCount} 条未完成待办会自动结清` : ''}。聊天、备注与轨迹全部保留；客户再次来信时会提示「复联待处理」，可随时重新跟进。</p>
       ${fidFormRow('结束原因', `<input class="fid-input" style="width:100%" name="closeReason" required maxlength="80" placeholder="如：预算暂缓，下季度再联系">`, '', true)}
       ${lcTagDetails(c)}`,
      '确认结束跟进',
      { wide: true }
    );
  }

  // New customers join the engagement loop with a first follow-up to-do
  function openLifecycleCustomerForm() {
    const accounts = myAccounts();
    if (!accounts.length) return toast('请先添加账号。');
    fidForm(
      '新增 WhatsApp 客户档案',
      'lc-new-customer',
      `${fidFormRow('客户称呼', `<input class="fid-input" style="width:100%" name="name" required maxlength="50" placeholder="客户姓名或备注称呼">`, '', true)}
       ${fidFormRow('WhatsApp号', `<input class="fid-input" style="width:100%" name="phone" required placeholder="含国家区号，如 +1 (512) 555-0192">`, '', true)}
       ${fidFormRow('归属接待号', `<select class="fid-select" style="width:100%" name="account">${accounts.map(a => option(a.id, a.name, accounts[0].id)).join('')}</select>`)}
       ${fidFormRow('沟通语言', `<select class="fid-select" style="width:100%" name="language">${fidOption([['', '未选择'], ...AI_CUSTOMER_LANGUAGES.map(language => [language, language])], '')}</select>`)}
       ${fidFormRow('国家地区', `<select class="fid-select" style="width:100%" name="country">${fidOption([['US', '美国'], ['PR', '波多黎各'], ['OTHER', '其他地区']], 'US')}</select>`)}
       ${fidFormRow('来源渠道', `<select class="fid-select" style="width:100%" name="source">${fidOption(['Facebook 广告', 'Instagram 广告', '客户转介绍', '网站咨询', '手动添加'], 'Facebook 广告')}</select>`)}
       ${fidFormRow('初步需求', `<input class="fid-input" style="width:100%" name="demand" placeholder="记录客户首句来意或咨询重点">`)}`,
      '创建并纳入跟进闭环',
      { wide: true }
    );
  }

  // ============================================================================
  // Register engagement actions & form submissions
  // ============================================================================
  Object.assign(fidActions, {
    lcDossierTab: (id, btn) => {
      lcState.dossierTab = id;
      const cid = btn?.dataset?.customer || ui.customer;
      lcRefreshOpenDossier(cid);
    },
    lcTimelineFilter: (id, btn) => {
      lcState.timelineFilter = id;
      lcRefreshOpenDossier(btn?.dataset?.customer || ui.customer);
    },
    // Order tracking tab: remove an order at once; the toast offers to put it back.
    lcOrderRemove: (id, btn) => {
      const c = customer(btn?.dataset?.customer);
      const o = lcOrders(c).find(x => x.id === id);
      if (!o || !myCustomers().includes(c)) return;
      const apply = (orders, text) => {
        c.orders = orders;
        lcLog(c.id, 'order', text);
        persist();
        render();
        lcRefreshOpenDossier(c.id);
      };
      apply(lcOrders(c).filter(x => x !== o), `删除订单记录 ${o.number}`);
      toast(`已删除订单 ${o.number}。`, () => apply([...lcOrders(c), o], `恢复订单记录 ${o.number}`));
    },
    // Order tracking tab: the two step buttons of an order. Shipping only moves one step forward
    // (LC_SHIPPING_NEXT) or to `problem`, and only while the order is not delivered. Each step adds an
    // entry to the order's history; the toast offers undo, which takes that entry away again.
    lcOrderShipping: (id, btn) => {
      const c = customer(btn?.dataset?.customer);
      const o = lcOrders(c).find(x => x.id === id);
      if (!o || !myCustomers().includes(c)) return;
      const before = lcShipping(o.shipping);
      const next = lcShipping(btn.dataset.shipping);
      const forward = LC_SHIPPING_NEXT[before[0]];
      if (!forward || (next[0] !== forward && next[0] !== 'problem')) return;
      const history = lcOrderHistory(o);
      const apply = (status, entries, text) => {
        o.shipping = status;
        o.history = entries;
        lcLog(c.id, 'order', text);
        persist();
        render();
        lcRefreshOpenDossier(c.id);
      };
      apply(next[0], [...history, { shipping: next[0], at: new Date().toISOString() }], `订单 ${o.number} 物流状态：${before[1]} → ${next[1]}`);
      toast(`订单 ${o.number} 已标记为「${next[1]}」。`, () => apply(before[0], history, `撤销：订单 ${o.number} 物流状态恢复为${before[1]}`));
    },
    // Order tracking tab: take back the latest step of an order, at any time. The newest entry of its
    // history is removed and the order returns to the step before — also from `delivered` or `problem`.
    // The first entry (the order being placed) is never taken back; removing the order does that.
    lcOrderUndo: (id, btn) => {
      const c = customer(btn?.dataset?.customer);
      const o = lcOrders(c).find(x => x.id === id);
      if (!o || !myCustomers().includes(c)) return;
      const history = lcOrderHistory(o);
      if (history.length < 2) return;
      const back = lcShipping(history[history.length - 2].shipping);
      o.history = history.slice(0, -1);
      o.shipping = back[0];
      lcLog(c.id, 'order', `撤销：订单 ${o.number} 物流状态恢复为${back[1]}`);
      persist();
      render();
      lcRefreshOpenDossier(c.id);
      toast(`已撤销订单 ${o.number} 的上一步，当前为「${back[1]}」。`);
    },
    // Order tracking tab: open or close an order block. Blocks are collapsed by default; which ones are
    // open is view state only (kept while the page is open, never saved). The drawer is re-rendered, so
    // the focus is put back on the button that was used.
    lcOrderToggle: (id, btn) => {
      lcState.orderOpen = lcState.orderOpen.includes(id) ? lcState.orderOpen.filter(x => x !== id) : [...lcState.orderOpen, id];
      lcRefreshOpenDossier(btn?.dataset?.customer || ui.customer);
      [...document.querySelectorAll('#dialog [data-action="lcOrderToggle"]')].find(b => b.dataset.id === id)?.focus({ preventScroll: true });
    },
    lcFollowTab: id => { lcState.followTab = id; ui.pages.followups = 0; render(); },
    fidTasks: () => { lcState.followTab = 'todo'; ui.taskFilter = 'pending'; ui.pages.followups = 0; navigate('followups'); },
    // A status chip of the dashboard → the customer list, filtered by that status.
    lcJumpSignal: id => { lcState.customerHealthFilter = id; ui.pages.customers = 0; navigate('customers'); },
    // Chat strip → follow-up centre, on this customer's row: the earliest unfinished to-do if the viewer
    // has one for the customer, or the customer among the ended follow-ups. The row stays highlighted until
    // the follow-up centre is left (see the render wrapper). A customer in follow-up without such a to-do has
    // no row there: the form that plans a follow-up opens instead.
    lcTrackFollow: id => {
      const c = customer(id);
      if (!c || !myCustomers().includes(c)) return;
      const h = lcHealth(c);
      const task = !h.closed && h.nextTask && myTasks().includes(h.nextTask) ? h.nextTask : null;
      if (!h.closed && !task) return openFollowup(c.id);
      if (!lcHasFollowTags(c)) lcState.followTags = [];
      lcState.followTab = h.closed ? 'closed' : 'todo';
      if (task) ui.taskFilter = 'pending';
      lcState.followFocus = { customer: c.id, task: task ? task.id : null, placed: false };
      ui.pages.followups = 0;
      navigate('followups');
      $('#view .lc-row-focus')?.scrollIntoView({ block: 'center' });
    },
    lcCloseOpen: id => openCloseEngagement(id),
    lcFollowTagFilter: () => fidOpenTagPicker('按标签筛选跟进', 'lc-follow-tag-filter', lcState.followTags, { submit: '筛选' }),
    lcFollowTagClear: () => { lcState.followTags = []; ui.pages.followups = 0; render(); },
    lcCustomerTier: id => { lcState.customerTier = id; ui.selected.clear(); ui.pages.customers = 0; render(); },
    lcCustomerStatusFilter: id => { lcState.customerStatus = id; ui.selected.clear(); ui.pages.customers = 0; render(); },
    taskDone: id => openTaskCompleteModal(id),
    // A to-do is removed by hand, after a confirmation. What the customer shows as the next follow-up follows
    // the to-dos that are left, and the removal is noted in the customer's history.
    lcTaskDelete: id => {
      const t = data.tasks.find(x => x.id === id);
      if (!t || (!manager() && t.owner !== ui.persona)) return;
      fidConfirm('删除待办', `删除待办「${t.title}」？删除后不能恢复。`, 'lcTaskDeleteDo', id);
    },
    lcTaskDeleteDo: id => {
      const t = data.tasks.find(x => x.id === id);
      if (!t || (!manager() && t.owner !== ui.persona)) return;
      const c = customer(t.customer);
      data.tasks = data.tasks.filter(x => x !== t);
      if (c) {
        c.followup = lcNextTask(c.id)?.due || null;
        lcLog(c.id, 'followup', `删除待办「${t.title}」`);
      }
      persist();
      close();
      render();
      toast('待办已删除。');
    },
    // A follow-up that was ended by hand is removed by hand, after a confirmation: the customer leaves the list of
    // ended follow-ups and shows no follow-up information again, as if none had been made. To-dos that were
    // finished stay among the finished to-dos, and the removal is noted in the customer's history.
    lcClosedRemove: id => {
      const c = customer(id);
      if (!c || !lcIsClosed(c) || !myCustomers().includes(c)) return;
      fidConfirm('移除已结束的跟进', `把 ${c.name} 从「已结束跟进」中移除？移除后该客户不再显示跟进信息，之后仍可重新安排跟进。`, 'lcClosedRemoveDo', id);
    },
    lcClosedRemoveDo: id => {
      const c = customer(id);
      if (!c || !lcIsClosed(c) || !myCustomers().includes(c)) return;
      const reason = c.closedReason;
      c.engagement = 'open';
      delete c.closedReason;
      delete c.closedAt;
      lcLog(c.id, 'followup', `移除已结束的跟进${reason ? `（结束原因：${reason}）` : ''}`);
      persist();
      close();
      render();
      toast('已移除，该客户不再显示跟进信息。');
    },
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

    'lc-order-form': (f, v) => {
      const c = customer(v('customerId'));
      if (!c || !myCustomers().includes(c)) return;
      const number = v('number');
      const placed = new Date(v('placedAt'));
      if (!number) return error('请填写订单号。');
      if (Number.isNaN(placed.getTime())) return error('请填写有效的下单时间。');
      if (placed.getTime() > Date.now()) return error('下单时间不能晚于当前时间。');
      if (lcOrders(c).some(o => o.number === number)) return error(`该客户已登记订单号 ${number}。`);
      // Adding an order is a step of its own: a new order always starts at the first step of the shipping
      // path, and that step, at the time the order was placed, is the first entry of its history.
      const placedAt = placed.toISOString();
      c.orders = [{ id: nextId('ord'), number, placedAt, shipping: 'pending', history: [{ shipping: 'pending', at: placedAt }] }, ...lcOrders(c)];
      lcLog(c.id, 'order', `登记订单 ${number}（下单时间 ${fidDate(placedAt)}）`);
      persist();
      render();
      lcRefreshOpenDossier(c.id);
      toast(`订单 ${number} 已登记。`);
    },

    'lc-followup-form': (f, v) => {
      const c = customer(v('customer'));
      if (!c || !v('title') || !v('due')) return error('请填写完整的客户、事项和计划时间。');
      const due = new Date(v('due'));
      if (Number.isNaN(due.getTime())) return error('请填写有效的跟进时间。');
      if (lcIsClosed(c)) lcReopenEngagement(c);
      lcCreateTask({
        customerId: c.id,
        title: v('title'),
        dueIso: due.toISOString(),
        priority: v('priority') || 'normal',
      });
      lcLog(c.id, 'followup', `安排跟进待办：${v('title')}（${dateLabel(due.toISOString())}）`);
      persist();
      close();
      render();
      toast('跟进计划已建立，跟进状态已更新。');
    },

    'lc-complete-task-form': (f, v) => {
      const t = data.tasks.find(x => x.id === v('taskId'));
      if (!t) return;
      const c = customer(t.customer);
      if (!c) return;
      const closing = v('nextAction') === 'close';
      const due = new Date(v('nextDue'));
      if (closing && !v('closeReason')) return error('请填写结束跟进的原因。');
      if (!closing && (!v('nextTitle') || Number.isNaN(due.getTime()))) return error('请填写下次跟进事项和提醒时间，或选择结束跟进。');
      t.done = true;
      t.outcome = v('outcome') + (v('outcomeNote') ? ' — ' + v('outcomeNote') : '');
      t.completedAt = new Date().toISOString();
      lcLog(c.id, 'followup', `完成跟进「${t.title}」· 结果：${t.outcome}`);
      lcApplyFormTags(c, f);
      if (closing) lcCloseEngagement(c, v('closeReason'));
      else lcCreateTask({ customerId: c.id, title: v('nextTitle'), dueIso: due.toISOString(), priority: v('nextPriority') || 'normal' });
      persist();
      close();
      render();
      toast(closing ? `已结束对 ${c.name} 的跟进，待办已结清。` : '本次跟进已闭环，下一步计划已同步。');
    },

    'lc-close-engagement-form': (f, v) => {
      const c = customer(v('customerId'));
      if (!c || lcIsClosed(c)) return;
      if (!v('closeReason')) return error('请填写结束跟进的原因。');
      lcApplyFormTags(c, f);
      lcCloseEngagement(c, v('closeReason'));
      persist();
      close();
      render();
      toast(`已结束对 ${c.name} 的跟进；客户再次来信时会提示复联。`);
    },

    'lc-follow-tag-filter-form': f => {
      lcState.followTags = f.getAll('tags').map(String).filter(id => myTags().some(t => t.id === id));
      ui.pages.followups = 0;
      close();
      render();
    },

    'lc-new-customer-form': (f, v) => {
      if (!v('name') || !v('phone')) return error('请填写客户称呼与 WhatsApp 号码。');
      const digits = fidPhoneDigits(v('phone'));
      if (digits.length < 7) return error('请输入含国家区号的有效号码。');
      const dup = data.customers.find(x => fidPhoneDigits(x.phone) === digits);
      if (dup) return error(`该号码已存在于客户「${dup.name}」，请直接前往其档案跟进避免撞单。`);
      const a = account(v('account'));
      const nowIso = new Date().toISOString();
      const id = nextId('c');
      const c = {
        id, name: v('name'), initials: initial(v('name')), color: 'jade',
        phone: v('phone'), country: v('country'), city: '待补充',
        timezone: v('country') === 'PR' ? 'America/Puerto_Rico' : 'America/New_York',
        language: v('language'), owner: a?.owner || ui.persona, account: a?.id || myAccounts()[0]?.id,
        tags: [], engagement: 'open',
        source: v('source'), campaign: '', ad: '',
        unread: 0, star: false, last: '刚刚', preview: v('demand') || '新建客户档案', translation: '',
        followup: null, notes: v('demand'), contactRefs: [{ account: a?.id, owner: a?.owner || ui.persona }],
        createdAt: nowIso, updatedAt: nowIso, clientType: '新增线索-补录', intentLevel: '中意向',
        reactivatedCount: 0,
        qualification: { demand: v('demand'), volume: '', deliveryRegion: country({ country: v('country') }), objection: '', commWindow: v('language') ? v('language') + '沟通' : '' },
      };
      data.customers.unshift(c);
      lcLog(id, 'profile', '手动建档');
      persist();
      close();
      render();
      toast(`客户 ${c.name} 已创建。`);
    },
  });

  // Customers added outside this module (new WhatsApp chats, legacy saves) join the loop on the next render
  function lcSyncRuntimeCustomers() {
    for (const c of data.customers) {
      lcMigrateEngagement(c);
      c.qualification ||= {
        demand: c.notes || c.preview || '',
        volume: '待确认',
        deliveryRegion: country(c),
        objection: '',
        commWindow: aiCustomerLanguage(c) ? aiCustomerLanguage(c) + '沟通' : '',
      };
      // Follow-up to-dos are made by hand only. A first message is noted in the customer's history; nothing about
      // follow-ups shows for the customer until a person plans one.
      if (c.needsFirstReply) {
        delete c.needsFirstReply;
        lcLog(c.id, 'inbound', '客户首次来信');
      }
    }
  }
  const lcWrapRender = render;
  render = function() {
    lcSyncRuntimeCustomers();
    if (ui.view !== 'followups') lcState.followFocus = null;
    lcWrapRender();
  };

  // Field toggles of the completion dialog, and the tier / status drop-downs
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'lc-complete-next') {
      const closing = t.value === 'close';
      $('#lc-complete-next-block').hidden = closing;
      $('#lc-complete-close-block').hidden = !closing;
      $('#dialog [name="nextTitle"]').required = !closing;
      $('#dialog [name="closeReason"]').required = closing;
    }
    if (t.dataset.lcTier || t.dataset.lcStatus) {
      const c = customer(t.dataset.lcTier || t.dataset.lcStatus);
      if (!c || !myCustomers().includes(c)) return;
      if (t.dataset.lcTier) {
        const next = LC_TIERS.includes(t.value) ? t.value : '';
        if (next === lcTier(c)) return;
        const before = lcTier(c) ? lcTier(c) + ' 级' : '未评级';
        c.tier = next;
        lcLog(c.id, 'profile', `客户等级：${before} → ${next ? next + ' 级' : '未评级'}`);
        toast(`已将 ${c.name} 的客户等级设为${next ? ' ' + next + ' 级' : '未评级'}。`);
      } else {
        const next = LC_CUSTOMER_STATUSES.some(([id]) => id === t.value) ? t.value : '';
        if (next === lcCustomerStatus(c)) return;
        const before = lcCustomerStatusLabel(c);
        c.customerStatus = next;
        lcLog(c.id, 'profile', `客户状态：${before} → ${lcCustomerStatusLabel(c)}`);
        toast(`已将 ${c.name} 的客户状态设为「${lcCustomerStatusLabel(c)}」。`);
      }
      persist();
      render();
      lcRefreshOpenDossier(c.id);
    }
  });

  // AI capabilities: the single integration point for every AI feature (translation today).
  // To add a capability: 1) list it in AI_CAPABILITIES; 2) call aiRun(id, input, meta) where the result is
  // needed and apply the result in .then(); 3) teach the provider to answer it.
  // Every provider call leaves one usage record in data.ai.usage and adds to the totals of its capability.
  const AI_CAPABILITIES = [
    { id: 'translate.inbound', name: '会话消息翻译', description: '把会话里的消息译为所选的译文语言，显示在原文下方。每条消息只翻译一次，译文保存后不再重复翻译；打开会话时补译还没有译文的消息。' },
    { id: 'translate.outbound', name: '发送前翻译', description: '把你输入的回复和快捷回复译为客户的语言，发送前可预览。' },
    { id: 'voice.transcribe', name: '语音转文字', description: '点击语音消息下方的「转文字」，把语音转成文字显示在语音下方；客户发来的语音还会译为所选的译文语言。' },
  ];
  // The provider answers run(capabilityId, input) with a Promise of { text }: the page's own server relays the
  // request to the model service (ai-relay.cjs), so the service key never reaches the browser. Without a server
  // that has a model service configured there is no provider, and no capability runs.
  const AI_PROVIDERS = {
    server: { name: '服务器中转', run: (capabilityId, input) => capabilityId === 'voice.transcribe' ? aiRelayTranscribe(input) : capabilityId === 'translate.outbound' ? aiRelayReply(input) : aiRelayTranslate(input) },
  };
  // Languages offered for a customer: the language replies are put into. Any other language can be typed in.
  const AI_CUSTOMER_LANGUAGES = ['英语', '西班牙语', '葡萄牙语', '法语', '德语', '意大利语', '荷兰语', '波兰语', '俄语', '土耳其语', '阿拉伯语', '印地语', '印尼语', '马来语', '越南语', '泰语', '菲律宾语', '日语', '韩语', '中文'];
  // A language name as the relay accepts it: letters of any script, spaces and a few separators.
  const AI_LANGUAGE_NAME = /^[\p{L}\p{M} ()·-]{1,40}$/u;
  // The customer's language, or '' while none is chosen. Nothing presets it: a customer made from a WhatsApp
  // chat has none until someone chooses one in the conversation. ('其他' is how older records say "none".)
  // Function declarations, because the follow-up module, which comes first in the page, reads a language while
  // it starts up.
  function aiCustomerLanguage(c) {
    return c?.language && c.language !== '其他' ? c.language : '';
  }
  function aiLanguageLabel(c) {
    return aiCustomerLanguage(c) || '未选语言';
  }
  // Languages offered for the translation shown below incoming messages.
  const AI_READ_LANGUAGES = ['中文', 'English', 'Español', 'Português', 'Français', 'Deutsch', 'Русский', 'العربية', '日本語', '한국어', 'Tiếng Việt', 'Bahasa Indonesia'];
  // How a reply should sound when it is translated: [value sent to the relay, label].
  const AI_TONES = [['casual', '轻松随意'], ['friendly', '亲切专业']];
  const AI_BUSINESS_MAX = 600;
  // Which provider this page uses: none until the page's own server reports that a model service is configured,
  // then the server relay. A page opened as a file has none.
  const aiRuntime = { provider: null, status: null };
  // Drafts waiting for their translation: customer id → a token of the newest request.
  const aiDraftPending = new Map();
  const AI_USAGE_KEPT = 200;
  const AI_USAGE_SHOWN = 20;

  // The translation settings dialog held the only switch for showing translations below incoming messages
  // and was removed on 2026-11-20. A translation a message carries is now always shown; whether new
  // messages get one is decided by the switch of the capability translate.inbound on the AI page.
  ui.receiveTranslation = true;

  function aiSettings() {
    const settings = (data.ai ??= { enabled: {}, totals: {}, usage: [] });
    for (const { id } of AI_CAPABILITIES) {
      settings.enabled[id] ??= true;
      settings.totals[id] ??= { calls: 0, inputChars: 0, outputChars: 0 };
    }
    if (!AI_READ_LANGUAGES.includes(settings.readLanguage)) settings.readLanguage = AI_READ_LANGUAGES[0];
    if (!AI_TONES.some(tone => tone[0] === settings.tone)) settings.tone = AI_TONES[0][0];
    if (typeof settings.business !== 'string') settings.business = '';
    if (typeof settings.sendGuard !== 'boolean') settings.sendGuard = true;
    return settings;
  }

  // One neutral record per provider call, plus running totals per capability.
  function aiRecordUsage(capabilityId, providerId, input, result, meta) {
    const settings = aiSettings();
    const inputChars = String(input.text || '').length;
    const outputChars = result.text.length;
    settings.usage.unshift({
      id: nextId('ai'), at: new Date().toISOString(), capability: capabilityId, provider: providerId,
      by: ui.persona, customerId: meta.customerId || '', inputChars, outputChars, ok: result.ok,
    });
    settings.usage.length = Math.min(settings.usage.length, AI_USAGE_KEPT);
    const total = settings.totals[capabilityId];
    total.calls += 1;
    total.inputChars += inputChars;
    total.outputChars += outputChars;
    persist();
  }

  // The single entry point for every AI call. Resolves to { ok, text }; it never rejects.
  // A capability that is switched off, and every capability while no model service is connected, is not run
  // and leaves no usage record.
  function aiRun(capabilityId, input, meta = {}) {
    const settings = aiSettings();
    if (!settings.enabled[capabilityId] || !aiRuntime.provider) return Promise.resolve({ ok: false, text: '', skipped: true });
    const providerId = aiRuntime.provider;
    return Promise.resolve()
      .then(() => AI_PROVIDERS[providerId].run(capabilityId, input))
      .then(output => ({ text: String(output?.text || ''), kept: output?.cached === true }), () => ({ text: '', kept: false }))
      .then(({ text, kept }) => {
        const result = { ok: Boolean(text), text };
        // A translation the server had kept was not made again: it is no call to the model service.
        if (!kept) aiRecordUsage(capabilityId, providerId, input, result, meta);
        return result;
      });
  }

  // The server relay: one translation per call. The relay detects the language of the text itself.
  // Rejects when the relay answers with an error, which aiRun turns into a call without result.
  function aiRelayTranslate(input) {
    return fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input.text, to: input.to }),
    }).then(response => response.json().then(body => response.ok ? { text: body.text, cached: body.cached === true } : Promise.reject(new Error('relay ' + body.error))));
  }

  // The server relay for a reply: the text is put into the customer's language with the chosen tone, with the
  // business description and the recent chat as context. A text already in that language comes back unchanged.
  function aiRelayReply(input) {
    return fetch('/api/ai/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input.text, to: input.to, tone: input.tone, business: input.business, context: input.context }),
    }).then(response => response.json().then(body => response.ok ? { text: body.text } : Promise.reject(new Error('relay ' + body.error))));
  }

  // The server turns the voice note of a message into text: it holds the file and calls the speech service.
  function aiRelayTranscribe(input) {
    return fetch('/api/wa/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: input.account, chat: input.chat, id: input.id }),
    }).then(response => response.json().then(body => response.ok ? { text: body.text } : Promise.reject(new Error('transcribe ' + body.error))));
  }

  // Ask the page's own server whether a model service is configured, and use the relay if it is.
  function aiDetectRelay() {
    if (!/^https?:$/.test(location.protocol)) return;
    fetch('/api/ai/status').then(response => response.ok ? response.json() : null).then(status => {
      aiRuntime.status = status;
      aiRuntime.provider = status?.configured ? 'server' : null;
      if (ui.view === 'ai' || ui.view === 'inbox') render();
    }).catch(() => {});
  }

  // ---- translation of the messages of a conversation ----
  // A message is translated at most once for a reading language. Its translation is kept on the message with
  // the language it was made for (translatedTo) and saved with the conversation; a message that is already in
  // the reading language is marked the same way and carries no translation. What is marked is never asked for
  // again: opening a conversation asks only for its messages that are not marked yet, the newest first, and a
  // message that arrives is asked for once. (A translation made before this marking existed carries no
  // language; it is left as it is.) The server keeps every translation too, so equal texts cost one request.
  const AI_TRANSLATE_AT_ONCE = 2;        // requests on their way at the same time
  const AI_TRANSLATE_GIVE_UP = 3;        // failures in a row after which the waiting messages are let go …
  const AI_TRANSLATE_PAUSE_MS = 60000;   // … and nothing more is asked for this long
  const aiWaiting = [];                  // [customer, message] pairs waiting for their turn
  const aiAsked = new Set();             // ids of the messages that wait or are on their way
  let aiOnTheWay = 0, aiFailuresInARow = 0, aiPausedUntil = 0;

  // Whether a message has words to translate: not the note that stands for a picture or a file, not a
  // withdrawn message, not a text without letters.
  function aiTranslatable(message) {
    const text = String(message.text || '').trim();
    return Boolean(text) && !message.revoked && text !== openwaMediaText[message.type] && text !== '[消息]' && !aiGuardNeutral(text);
  }
  const aiWantsTranslation = (message, language) => aiTranslatable(message) && !aiAsked.has(message.id)
    && (message.translatedTo ? message.translatedTo !== language : !message.translated);

  // Puts messages of a customer in the line. `first` puts them in front of what waits already: the conversation
  // on screen comes before messages that arrive elsewhere.
  function aiTranslateSoon(c, messages, first = false) {
    const settings = aiSettings();
    if (!settings.enabled['translate.inbound'] || !aiRuntime.provider || Date.now() < aiPausedUntil) return;
    const pairs = messages.filter(message => aiWantsTranslation(message, settings.readLanguage)).map(message => [c, message]);
    for (const [, message] of pairs) aiAsked.add(message.id);
    if (first) aiWaiting.unshift(...pairs);
    else aiWaiting.push(...pairs);
    aiTranslateNext();
  }
  function aiTranslateNext() {
    while (aiOnTheWay < AI_TRANSLATE_AT_ONCE && aiWaiting.length) {
      const [c, message] = aiWaiting.shift(), text = message.text, language = aiSettings().readLanguage;
      aiOnTheWay += 1;
      aiRun('translate.inbound', { text, to: language }, { customerId: c.id }).then(result => {
        aiOnTheWay -= 1;
        aiAsked.delete(message.id);
        if (result.ok && message.text === text) {
          aiFailuresInARow = 0;
          message.translatedTo = language;
          if (result.text.trim() === text.trim()) delete message.translated;
          else message.translated = result.text;
          if (message.translated && c.preview === text) c.translation = message.translated;
          persist();
          aiRedraw(c);
        } else if (!result.ok && !result.skipped && ++aiFailuresInARow >= AI_TRANSLATE_GIVE_UP) {
          // The service does not answer: what waits is let go, and asked for again when its conversation is
          // drawn after the pause.
          for (const [, waiting] of aiWaiting.splice(0)) aiAsked.delete(waiting.id);
          aiFailuresInARow = 0;
          aiPausedUntil = Date.now() + AI_TRANSLATE_PAUSE_MS;
        }
        aiTranslateNext();
      });
    }
  }
  // One message that has just arrived or was changed.
  function aiTranslateInbound(c, message) {
    aiTranslateSoon(c, [message]);
  }
  // The conversation on screen: its messages that carry no translation yet, the newest first.
  function aiTranslateConversation(c) {
    aiTranslateSoon(c, (data.messages[c.id] || []).slice().reverse(), true);
  }

  // Redraw the translation preview above the composer and the language hint beside it.
  function aiRefreshDraftPreview(c) {
    const preview = $('#translation-preview');
    if (ui.view !== 'inbox' || !preview || $('#messages')?.dataset.customer !== c.id) return;
    preview.innerHTML = previewHTML(c);
    paintIcons(preview);
    const hint = $('.language-hint');
    if (!hint) return;
    hint.innerHTML = icon('Languages') + esc(aiLanguageLabel(c)) + ' · ' + aiDraftHint(c);
    paintIcons(hint);
  }

  // What the relay gets for a reply: the text, the customer's language, the tone, the business description
  // and the last messages of the conversation as context.
  function aiOutboundInput(c, text) {
    const settings = aiSettings();
    const context = (data.messages[c.id] || []).slice(-6)
      .map(message => ({ from: message.side === 'out' ? 'me' : 'customer', text: String(message.text || '').slice(0, 300) }))
      .filter(message => message.text.trim());
    return { text, to: aiCustomerLanguage(c), tone: settings.tone, business: settings.business, context };
  }

  // Send guard. While the relay is in use, a reply that is not in the customer's language is translated first
  // and sent only after a second Enter. A customer without a chosen language is not guarded.
  // These helpers run while the page is drawn, so they read the saved settings without creating them.
  const aiGuardOn = () => data.ai?.sendGuard !== false;
  function aiGuardActive(c) {
    return aiRuntime.provider === 'server' && aiGuardOn() && data.ai?.enabled?.['translate.outbound'] !== false && Boolean(aiCustomerLanguage(c));
  }
  // Text that needs no translation in any language: no letters at all (numbers, emoji, links), or ok / no.
  function aiGuardNeutral(text) {
    const bare = text.replace(/https?:\/\/\S+|\S+@\S+/g, ' ');
    return !/\p{L}/u.test(bare) || /^(ok|okay|no)[.!?]*$/i.test(bare.trim());
  }
  // The same words, whatever the spacing, punctuation and capitals.
  const aiSameText = (a, b) => a.replace(/[\s\p{P}]/gu, '').toLowerCase() === b.replace(/[\s\p{P}]/gu, '').toLowerCase();

  // The words beside the message box: what Enter will do with the draft.
  function aiDraftHint(c) {
    if (aiDraftPending.has(c.id)) return '翻译中…';
    const d = draft(c), text = d.text.trim();
    if (d.translated) return '发送译文';
    return aiGuardActive(c) && text && !aiGuardNeutral(text) ? '待翻译' : '发送原文';
  }
  // The line under the message box that explains the Enter key.
  function aiEnterHint(c) {
    return aiGuardActive(c) ? 'Enter 先翻译，再按一次发送；Shift + Enter 换行' : 'Enter 发送，Shift + Enter 换行';
  }
  // The switch of the send guard, beside the message box. Shown only while the relay is in use.
  function aiGuardHTML(c) {
    if (aiRuntime.provider !== 'server' || !aiCustomerLanguage(c)) return '';
    const on = aiGuardOn();
    return `<button class="ai-guard${on ? ' on' : ''}" type="button" data-ai-guard aria-pressed="${on}" title="${on ? '发送保护已开启：不是客户语言的回复先翻译，确认后再发送' : '发送保护已关闭：回复按原文直接发送'}">${icon('ShieldCheck')}发送保护${on ? '开' : '关'}</button>`;
  }
  function aiSetGuard(on) {
    aiSettings().sendGuard = on;
    persist();
    if (ui.view === 'ai') render();
    const c = selectedCustomer(), button = $('[data-ai-guard]');
    if (c && button) {
      button.outerHTML = aiGuardHTML(c);
      paintIcons($('.composer-tools'));
      aiRefreshDraftPreview(c);
      const enter = $('.composer-foot span');
      if (enter) { enter.innerHTML = icon('Keyboard') + aiEnterHint(c); paintIcons(enter); }
    }
    toast(on ? '发送保护已开启。' : '发送保护已关闭，回复按原文直接发送。');
  }

  // Quick replies: the earlier layers fill the draft together with a prepared translation from the stored
  // quick-reply data. Take it off the draft and ask the integration point for a real translation instead, so
  // that translating before sending can be switched off and is recorded like every other AI call.
  const aiOldFillQuick = fillQuick;
  fillQuick = function(id) {
    const q = data.quickReplies.find(item => item.id === id), c = selectedCustomer();
    aiOldFillQuick(id);
    const filled = c && ui.drafts[c.id];
    if (!q || !filled || filled.source !== q.zh) return;
    filled.translated = '';
    persist();
    // Without a model service, or for a customer without a chosen language, the original is sent.
    if (!aiRuntime.provider || !aiCustomerLanguage(c)) return aiRefreshDraftPreview(c);
    const request = {};
    aiDraftPending.set(c.id, request);
    aiRefreshDraftPreview(c);
    aiRun('translate.outbound', aiOutboundInput(c, q.zh), { customerId: c.id }).then(result => {
      if (aiDraftPending.get(c.id) === request) aiDraftPending.delete(c.id);
      const current = ui.drafts[c.id];
      if (result.ok && current && current.source === q.zh && current.text === q.zh) {
        current.translated = result.text;
        persist();
      } else if (!result.ok && !result.skipped) {
        toast('未能取得译文，草稿保持原文。');
      }
      aiRefreshDraftPreview(c);
    });
  };

  // A reply typed into the message box. With the send guard active, Enter does not send a text that is not
  // in the customer's language: it asks for the translation, shows it above the box, and the next Enter sends
  // it. A text the relay returns unchanged already is in the customer's language and is sent as typed.
  function aiTranslateDraft(c, text) {
    const request = {};
    aiDraftPending.set(c.id, request);
    aiRefreshDraftPreview(c);
    aiRun('translate.outbound', aiOutboundInput(c, text), { customerId: c.id }).then(result => {
      if (aiDraftPending.get(c.id) === request) aiDraftPending.delete(c.id);
      const current = ui.drafts[c.id];
      const unchanged = current && current.text.trim() === text;
      if (!result.ok) {
        if (!result.skipped) toast('未能取得译文，消息未发送。可再按 Enter 重试，或关闭发送保护后按原文发送。');
      } else if (unchanged && aiSameText(result.text, text)) {
        const box = $('#composer-text');
        if (ui.view === 'inbox' && selectedCustomer() === c && box && box.value.trim() === text) return aiOldSend();
      } else if (unchanged) {
        current.translated = result.text;
        current.source = text;
        persist();
        toast(`已译为${c.language}，确认后再按 Enter 发送。`);
      }
      aiRefreshDraftPreview(c);
    });
  }
  const aiOldSend = send;
  send = function() {
    const c = selectedCustomer(), box = $('#composer-text');
    const text = box ? box.value.trim() : '';
    if (!c || !text || account(c.account)?.state !== 'online' || !aiGuardActive(c)) return aiOldSend();
    const d = draft(c);
    if ((d.translated && d.source === text) || aiGuardNeutral(text)) return aiOldSend();
    if (aiDraftPending.has(c.id)) return toast('正在翻译，请稍候。');
    aiTranslateDraft(c, text);
  };

  function renderAiPage() {
    const settings = aiSettings();
    const capabilityName = id => AI_CAPABILITIES.find(item => item.id === id)?.name || id;
    const relay = aiRuntime.provider === 'server';
    const voice = Boolean(aiRuntime.status?.voice?.configured);
    const providerNote = relay
      ? '由本站服务器中转调用模型服务，密钥只保存在服务器，不进入浏览器。'
      : aiRuntime.status
        ? '服务器尚未配置可用的模型服务，翻译暂不可用。'
        : '当前页面没有连接服务器，翻译不可用。';
    const capabilityRows = AI_CAPABILITIES.map(({ id, name, description }) => {
      const total = settings.totals[id], on = settings.enabled[id];
      return `<tr>
        <td><strong>${esc(name)}</strong><small>${esc(id)}</small></td>
        <td>${esc(description)}</td>
        <td><label class="fid-ai-switch"><input type="checkbox" role="switch" id="fid-ai-${esc(id.replace('.', '-'))}" data-ai-capability="${esc(id)}" ${on ? 'checked' : ''} aria-label="${esc(name)}">${on ? '已启用' : '已停用'}</label></td>
        <td>${total.calls}</td><td>${total.inputChars}</td><td>${total.outputChars}</td>
      </tr>`;
    }).join('');
    const usageRows = settings.usage.filter(entry => manager() || entry.by === ui.persona).slice(0, AI_USAGE_SHOWN).map(entry => `<tr>
        <td>${esc(fidDate(entry.at))}</td><td>${esc(capabilityName(entry.capability))}</td>
        <td>${esc(customer(entry.customerId)?.name || '—')}</td><td>${esc(member(entry.by)?.name || '—')}</td>
        <td>${entry.inputChars}</td><td>${entry.outputChars}</td>
        <td><span class="lc-pill ${entry.ok ? 'ok' : 'warn'}">${entry.ok ? '成功' : '无结果'}</span></td>
      </tr>`).join('');
    return `<section class="fid-page"><div class="fid-panel fid-ai">
      ${fidHead('AI 能力', '翻译等 AI 功能都经由同一个接入点调用，每次调用记录一条用量。')}
      <div class="fid-ai-provider"><strong>当前接入</strong><span class="lc-pill ${relay ? 'ok' : 'warn'}">${esc(relay ? `${aiRuntime.status.provider} · ${aiRuntime.status.model}` : '未连接')}</span><span>${providerNote}</span></div>
      <div class="fid-ai-provider"><strong>语音服务</strong><span class="lc-pill ${voice ? 'ok' : 'warn'}">${esc(voice ? `${aiRuntime.status.voice.provider} · ${aiRuntime.status.voice.model}` : '未连接')}</span><span>${voice ? '语音消息由本站服务器交给语音服务转成文字，每条语音只转一次。' : '服务器尚未配置语音服务，语音转文字暂不可用。'}</span></div>
      <div class="fid-ai-provider"><strong>译文语言</strong><select class="fid-select" data-ai-setting="readLanguage" aria-label="译文语言">${AI_READ_LANGUAGES.map(language => option(language, language, settings.readLanguage)).join('')}</select><span>客户发来的消息译为这种语言，显示在原文下方；只对之后收到的消息生效。</span></div>
      <div class="fid-ai-provider"><strong>回复语气</strong><select class="fid-select" data-ai-setting="tone" aria-label="回复语气">${AI_TONES.map(([value, label]) => option(value, label, settings.tone)).join('')}</select><span>把你的回复译给客户时采用的语气。</span></div>
      <div class="fid-ai-provider fid-ai-business"><strong>业务说明</strong><textarea class="fid-input" data-ai-setting="business" aria-label="业务说明" maxlength="${AI_BUSINESS_MAX}" rows="2" placeholder="选填，例如：我们向美国和波多黎各的小型餐饮企业销售厨房设备。">${esc(settings.business)}</textarea><span>选填。翻译回复时一并提供给模型，让用词贴合你的业务；同时提供的还有该会话最近 6 条消息。</span></div>
      <div class="fid-ai-provider"><strong>发送保护</strong><label class="fid-ai-switch"><input type="checkbox" role="switch" data-ai-setting="sendGuard" ${settings.sendGuard ? 'checked' : ''} aria-label="发送保护">${settings.sendGuard ? '已开启' : '已关闭'}</label><span>开启后，不是客户语言的回复不会直接发出：第一次按 Enter 先翻译，确认译文后再按一次发送。也可在输入框旁切换。</span></div>
      <h2>能力清单</h2>
      ${fidTable('fid-ai-capabilities', ['能力', '说明', '状态', '调用次数', '输入字符', '输出字符'], capabilityRows)}
      <p class="fid-field-help">停用后该能力不再被调用，也不产生用量记录。</p>
      <h2>最近调用</h2>
      ${fidTable('fid-ai-usage', ['时间', '能力', '客户', '操作人', '输入字符', '输出字符', '结果'], usageRows, '暂无调用记录。收到客户消息或翻译回复后，这里会出现记录。')}
      <p class="fid-field-help">显示最近 ${AI_USAGE_SHOWN} 次调用，最多保留 ${AI_USAGE_KEPT} 条；累计数见上表。</p>
    </div></section>`;
  }

  // ---- the customer's language ----
  // The choice in the strip above a conversation: none, one of the listed languages, or any other by name.
  function aiLanguagePicker(c) {
    const current = aiCustomerLanguage(c);
    const listed = !current || AI_CUSTOMER_LANGUAGES.includes(current) ? AI_CUSTOMER_LANGUAGES : [current, ...AI_CUSTOMER_LANGUAGES];
    return `<label class="ai-language-pick">${icon('Languages')}<span>客户语言</span><select class="fid-select" data-ai-language="${esc(c.id)}" aria-label="客户语言">${option('', '未选择（发送原文）', current)}${listed.map(language => option(language, language, current)).join('')}${option('__other', '其他语言…', current)}</select></label>`;
  }
  // Sets the customer's language ('' for none). A translation made for another language no longer fits the
  // draft, so the draft goes back to what was typed.
  function aiSetLanguage(c, language) {
    if (aiCustomerLanguage(c) === language) return;
    c.language = language;
    const d = ui.drafts[c.id];
    if (d) Object.assign(d, { translated: '', source: '' });
    aiDraftPending.delete(c.id);
    lcLog(c.id, 'profile', language ? `客户语言设为${language}` : '取消客户语言');
    persist();
    render();
    toast(language ? `客户语言已设为${language}，回复会先译为${language}。` : '已取消客户语言，回复按原文发送。');
  }
  fidForms['ai-language-form'] = (f, v) => {
    const c = customer(v('customer')), language = v('language').replace(/\s+/g, ' ').trim();
    if (!c) return;
    if (!AI_LANGUAGE_NAME.test(language) || language === '其他') return error('请填写语言的名称，例如 希腊语；只能包含文字、空格和括号。');
    close();
    aiSetLanguage(c, language);
  };

  document.addEventListener('change', event => {
    if (event.target.dataset?.aiLanguage) {
      const c = customer(event.target.dataset.aiLanguage), value = event.target.value;
      if (!c) return;
      if (value !== '__other') return aiSetLanguage(c, value);
      // Another language: asked for by name; the choice shows the current language again until it is given.
      event.target.value = aiCustomerLanguage(c);
      fidForm('其他语言', 'ai-language', `<input type="hidden" name="customer" value="${esc(c.id)}">${fidFormRow('语言名称', `<input class="fid-input" style="width:100%" name="language" maxlength="40" placeholder="例如 希腊语">`)}<p class="fid-field-help">回复会先译为这种语言，确认后再发送。</p>`);
      return;
    }
    if (event.target.dataset?.aiSetting === 'readLanguage') {
      aiSettings().readLanguage = event.target.value;
      persist();
      render();
      toast(`译文语言已设为 ${aiSettings().readLanguage}。`);
      return;
    }
    if (event.target.dataset?.aiSetting === 'tone') {
      aiSettings().tone = event.target.value;
      persist();
      render();
      toast(`回复语气已设为「${AI_TONES.find(tone => tone[0] === aiSettings().tone)[1]}」。`);
      return;
    }
    if (event.target.dataset?.aiSetting === 'business') {
      aiSettings().business = event.target.value.trim().slice(0, AI_BUSINESS_MAX);
      persist();
      render();
      toast('业务说明已保存。');
      return;
    }
    if (event.target.dataset?.aiSetting === 'sendGuard') return aiSetGuard(event.target.checked);
    const id = event.target.dataset?.aiCapability;
    const capability = AI_CAPABILITIES.find(item => item.id === id);
    if (!capability) return;
    const on = event.target.checked;
    aiSettings().enabled[id] = on;
    persist();
    render();
    toast(`${capability.name}已${on ? '启用' : '停用'}。`);
  });

  // ---- voice notes into text ----
  // Messages whose words are being asked for right now.
  const aiTranscribing = new Set();
  // Under a voice note or sound file: its words once they are known, otherwise a button that asks for them.
  // c is the customer, or a record of the chat archive, which only shows words that were known when it was made.
  function aiTranscriptHTML(c, m) {
    if (m.transcript) return `<div class="message-translation ai-transcript"><span class="translation-label">${icon('FileText')}转写</span><div>${esc(m.transcript)}</div></div>`;
    if (!c.waChat || !aiSettings().enabled['voice.transcribe'] || !aiRuntime.provider || !aiRuntime.status?.voice?.configured) return '';
    const busy = aiTranscribing.has(m.id);
    return `<button type="button" class="fid-link ai-transcribe" data-ai-transcribe="${esc(m.id)}" ${busy ? 'disabled' : ''}>${icon('FileText')}${busy ? '正在转文字…' : '转文字'}</button>`;
  }
  // Draws the open conversation again when it is this customer's.
  function aiRedraw(c) {
    const box = $('#messages');
    if (ui.view !== 'inbox' || !box || box.dataset.customer !== c.id) return;
    const atBottom = box.scrollHeight - box.clientHeight - box.scrollTop <= 40, fromEnd = box.scrollHeight - box.scrollTop;
    openwaKeepPlaying(() => {
      box.innerHTML = messagesHTML(c);
    });
    paintIcons(box);
    // At its end the conversation stays at its end; further up, what is being read stays where it is while
    // translations come in above it.
    if (atBottom) scrollMessages();
    else box.scrollTop = box.scrollHeight - fromEnd;
  }
  // Turns a voice note of the open conversation into text and keeps the text on the message. The words of a
  // voice note the customer sent are then translated like an incoming text.
  function aiTranscribe(messageId) {
    const c = selectedCustomer(), message = c && (data.messages[c.id] || []).find(m => m.id === messageId);
    if (!message || !message.wa || !c.waChat || aiTranscribing.has(messageId)) return;
    aiTranscribing.add(messageId);
    aiRedraw(c);
    aiRun('voice.transcribe', { account: c.account, chat: c.waChat, id: message.wa }, { customerId: c.id }).then(result => {
      aiTranscribing.delete(messageId);
      if (result.ok) {
        message.transcript = result.text;
        persist();
      } else if (!result.skipped) toast('这条语音未能转成文字，请稍后再试。');
      aiRedraw(c);
      if (!result.ok || message.side !== 'in') return;
      aiRun('translate.inbound', { text: result.text, to: aiSettings().readLanguage }, { customerId: c.id }).then(translated => {
        if (!translated.ok || translated.text.trim() === result.text.trim()) return;
        message.translated = translated.text;
        persist();
        aiRedraw(c);
      });
    });
  }

  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-ai-guard]')) aiSetGuard(!aiGuardOn());
    const ask = event.target.closest?.('[data-ai-transcribe]');
    if (ask) aiTranscribe(ask.dataset.aiTranscribe);
  });

  // Every time the page is drawn with a conversation on screen, the messages of that conversation that carry no
  // translation yet are put in the line. What is marked or already in the line is passed over, so a redraw
  // costs nothing.
  const aiDraw = render;
  render = function() {
    aiDraw();
    const box = $('#messages'), c = ui.view === 'inbox' && box ? customer(box.dataset.customer) : null;
    if (c) aiTranslateConversation(c);
  };

  aiDetectRelay();

  // ============================================================================
  // The price list (plan 037). A person uploads an Excel or CSV file on the page "价格表"; the file is read in the
  // browser (pricefile.js) and its products replace the list. In a conversation the button "报价" beside the
  // message box finds a product and puts its price into the message box. Nothing here sends a message, suggests
  // a product by itself or calls a server; a price is shown exactly as the file gives it.
  // ============================================================================
  const PRICE_MESSAGES = {
    'too-large': '文件超过 5 MB，无法作为价格表。',
    'too-long': '价格表的内容过多，请精简后再上传。',
    'too-many-rows': '价格表的行数过多，请拆分或精简后再上传。',
    'old-excel': '这是旧版 Excel（.xls）文件。请在 Excel 中另存为 .xlsx 或 CSV 后再上传。',
    unreadable: '无法读取这个文件。请上传 Excel（.xlsx）或 CSV 文件。',
    'no-table': '文件里没有找到表格：需要一行表头和至少一行产品。',
    'no-prices': '文件里没有找到价格列：价格一列的内容应为数字。',
  };
  const PRICE_QUOTE_ROWS = 50;
  const priceView = { query: '', quote: '', pending: null };
  ui.pageSizes.prices ||= 20;

  // The list in use: { file, at, by, columns: { code, name, spec, prices: [..] }, rows: [{ code, name, spec, prices }] }.
  function priceList() {
    const list = data.priceList;
    return list && Array.isArray(list.rows) && Array.isArray(list.columns?.prices) ? list : null;
  }
  // Letters and digits only, in lower case: "PRD-A 01" is found by "prda01".
  const priceFold = value => String(value ?? '').toLowerCase().replace(/[\s\-_./]+/g, '');
  // The products that carry every word of the query in their code, name or specification; those whose code
  // starts with the query come first.
  function priceMatches(query, list = priceList()) {
    if (!list) return [];
    const words = String(query || '').trim().split(/\s+/).map(priceFold).filter(Boolean);
    if (!words.length) return list.rows;
    const whole = words.join('');
    const found = list.rows.filter(entry => {
      const hay = [entry.code, entry.name, entry.spec].map(priceFold).join(' ');
      return words.every(word => hay.includes(word));
    });
    return [...found.filter(entry => priceFold(entry.code).startsWith(whole)), ...found.filter(entry => !priceFold(entry.code).startsWith(whole))];
  }
  // The currency a price column's header names: "Price ($)" gives "$40", "USD" gives "USD 40", none gives "40".
  // A price that carries its own sign in the file ("$40") stays as it is.
  const PRICE_CURRENCY = /US\$|HK\$|[$€£¥₹₽₩₫฿]|\b(?:USD|EUR|GBP|CNY|RMB|HKD|JPY|AUD|CAD|SGD|MXN|BRL|INR|AED|SAR)\b/i;
  const PRICE_CURRENCY_WORDS = [[/美元|美金/, '$'], [/欧元/, '€'], [/英镑/, '£'], [/人民币/, '¥']];
  function priceMoney(label, value) {
    const sign = PRICE_CURRENCY.exec(label || '')?.[0] || PRICE_CURRENCY_WORDS.find(([word]) => word.test(label || ''))?.[1] || '';
    return !sign || /[$€£¥]/.test(value) ? value : /^[A-Za-z]{3}$/.test(sign) ? `${sign.toUpperCase()} ${value}` : sign + value;
  }
  // What a price column is called once the currency is taken out of its header: "100+ ($)" is "100+".
  const priceColumnName = label => String(label || '').replace(PRICE_CURRENCY, '').replace(/[（(]\s*[）)]/g, '').replace(/\s+/g, ' ').trim();
  const priceHeads = list => [list.columns.code || '简称', ...(list.columns.name ? [list.columns.name] : []), ...(list.columns.spec ? [list.columns.spec] : []), ...list.columns.prices.map((label, i) => label || `价格 ${i + 1}`)];
  const priceCells = (list, entry) => [entry.code, ...(list.columns.name ? [entry.name] : []), ...(list.columns.spec ? [entry.spec] : []), ...list.columns.prices.map((label, i) => entry.prices[i] || '')];
  // The line that goes into the message box, e.g. "Product Alpha PRDA01 (100*10 Units): $40". With several price
  // columns the line says which one: "... : $10.5 (100+)".
  function priceLine(list, entry, at) {
    const label = list.columns.prices[at] || '';
    const column = list.columns.prices.length > 1 ? priceColumnName(label) : '';
    return `${[entry.name, entry.code].filter(Boolean).join(' ')}${entry.spec ? ` (${entry.spec})` : ''}: ${priceMoney(label, entry.prices[at])}${column ? ` (${column})` : ''}`;
  }

  // ---- page: #prices (价格表) ----
  function priceTableHTML() {
    const list = priceList();
    const found = priceMatches(priceView.query, list);
    const heads = ['序号', ...(list ? priceHeads(list) : ['简称', '名称', '规格', '价格'])].map(esc);
    const rows = paged(found, 'prices').map((entry, i) => `<tr><td>${rowNumber('prices', i)}</td>${priceCells(list, entry).map(cell => `<td>${esc(cell || '—')}</td>`).join('')}</tr>`).join('');
    return fidTable('price-table', heads, rows, list ? '没有匹配的产品' : '还没有价格表。请上传 Excel（.xlsx）或 CSV 文件。', true, 'FileText') + fidPager(found.length, 'prices', [20, 50, 100]);
  }
  function renderPriceList() {
    const list = priceList();
    const about = list
      ? `当前价格表：${list.file || '未命名文件'}，共 ${list.rows.length} 个产品，${fidDate(list.at)} 由 ${member(list.by)?.name || list.by || '—'} 上传`
      : '尚未上传价格表';
    return `<section class="fid-page"><div class="fid-panel price-panel">
      ${fidHead('价格表', '上传一份 Excel（.xlsx）或 CSV 文件作为价格表。在聊天界面点击消息框旁的「报价」，即可查找产品并把价格放入消息框；消息仍由你确认后发送。')}
      <div class="fid-actions price-toolbar">
        ${fidButton('上传价格表', 'priceUpload', 'File', 'blue')}
        <input type="file" id="price-file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden>
        <input type="search" class="fid-input" id="price-search" aria-label="搜索价格表" placeholder="搜索简称 / 名称 / 规格" value="${esc(priceView.query)}" ${list ? '' : 'disabled'}>
        ${list ? fidButton('清空价格表', 'priceClear', 'Trash2') : ''}
        <span class="fid-small-note" id="price-about">${esc(about)}</span>
      </div>
      <p class="price-note">文件要求：一张表，第一行为表头；内容为数字的列会被识别为价格（可以有多列），其余各列从左到右依次为产品简称、名称、规格。新上传的文件会替换当前价格表。</p>
      <div class="fid-table-card" id="price-table-card">${priceTableHTML()}</div>
    </div></section>`;
  }
  function priceRefreshTable() {
    const card = $('#price-table-card');
    if (!card) return;
    card.innerHTML = priceTableHTML();
    paintIcons(card);
  }
  const priceProblem = code => fidDialog('无法使用这个文件', `<div class="modal-body"><p>${esc(PRICE_MESSAGES[code] || PRICE_MESSAGES.unreadable)}</p></div>`, fidButton('知道了', 'close', '', 'blue'));
  // A file was chosen: read it here in the browser and show what was found before anything is replaced.
  async function priceRead(file) {
    if (!file) return;
    if (file.size > window.WA_PRICE_FILE.LIMITS.bytes) return priceProblem('too-large');
    let list;
    try {
      list = await window.WA_PRICE_FILE.read(new Uint8Array(await file.arrayBuffer()));
    } catch (problem) {
      return priceProblem(problem?.code);
    }
    priceView.pending = { file: String(file.name || '').slice(0, 120), columns: list.columns, rows: list.rows };
    const heads = priceHeads(list).map(esc), first = list.rows.slice(0, 5);
    const names = [['简称', list.columns.code], ['名称', list.columns.name], ['规格', list.columns.spec], ['价格', list.columns.prices.join('、')]].filter(([, label]) => label);
    fidDialog('确认价格表', `<div class="modal-body price-preview">
      <p>文件：<strong>${esc(priceView.pending.file)}</strong></p>
      <p>读取到 <strong>${list.rows.length}</strong> 个产品${list.skipped ? `，另有 ${list.skipped} 行没有价格，已略过` : ''}。各列按表头识别为：${names.map(([name, label]) => `${name} = ${esc(label)}`).join('；')}。</p>
      <div class="fid-table-scroll"><table class="fid-table price-table"><thead><tr>${heads.map(head => `<th scope="col">${head}</th>`).join('')}</tr></thead><tbody>${first.map(entry => `<tr>${priceCells(list, entry).map(cell => `<td>${esc(cell || '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="price-note">${list.rows.length > first.length ? `以上为前 ${first.length} 个产品。` : ''}确认后将${priceList() ? '替换当前价格表' : '作为价格表使用'}。</p>
    </div>`, fidButton('确认使用', 'priceUse', '', 'blue') + fidButton('取 消', 'close'), true);
  }

  // ---- conversation: the button "报价" and its dialog ----
  // Called by the message box (see build-fidelity.cjs); a function declaration, so it exists from the start.
  function priceQuoteButton() {
    return `<button type="button" class="price-quote-button" data-action="priceQuote" aria-label="报价" title="从价格表选择产品，把价格放入消息框">${icon('ListOrdered')}<span>报价</span></button>`;
  }
  function priceQuoteRows() {
    const list = priceList();
    if (!list) return `<div class="price-quote-empty"><p>还没有价格表。</p>${fidButton('去上传价格表', 'priceOpenPage', 'File', 'blue')}</div>`;
    const found = priceMatches(priceView.quote, list);
    if (!found.length) return '<div class="price-quote-empty"><p>没有匹配的产品</p></div>';
    const several = list.columns.prices.length > 1;
    const rows = found.slice(0, PRICE_QUOTE_ROWS).map(entry => {
      const prices = entry.prices.map((value, at) => (value
        ? `<button type="button" class="fid-btn slim tint" data-action="priceInsert" data-id="${list.rows.indexOf(entry)}:${at}" title="${esc(priceLine(list, entry, at))}">${several && priceColumnName(list.columns.prices[at]) ? `<small>${esc(priceColumnName(list.columns.prices[at]))}</small> ` : ''}${esc(priceMoney(list.columns.prices[at], value))}</button>`
        : '')).join('');
      return `<li class="price-quote-row"><span class="price-quote-product"><strong>${esc(entry.code)}</strong>${entry.name ? ` <span>${esc(entry.name)}</span>` : ''}${entry.spec ? ` <small>${esc(entry.spec)}</small>` : ''}</span><span class="price-quote-prices">${prices}</span></li>`;
    }).join('');
    const more = found.length - PRICE_QUOTE_ROWS;
    return `<ul class="price-quote-list">${rows}</ul>${more > 0 ? `<p class="price-note">还有 ${more} 个产品未显示，请继续输入以缩小范围。</p>` : ''}`;
  }
  function priceQuoteOpen() {
    if (!selectedCustomer() || !$('#composer-text')) return;
    priceView.quote = '';
    fidDialog('报价', `<div class="modal-body price-quote">
      <input type="search" class="fid-input" id="price-quote-search" aria-label="查找产品" placeholder="输入产品简称或名称查找" ${priceList() ? '' : 'disabled'}>
      <p class="price-note">点击价格，把这一行报价放入消息框；不会自动发送。</p>
      <div id="price-quote-rows">${priceQuoteRows()}</div>
    </div>`, fidButton('关 闭', 'close'), true);
    $('#price-quote-search')?.focus();
  }

  Object.assign(fidActions, {
    priceUpload: () => $('#price-file')?.click(),
    priceUse: () => {
      const pending = priceView.pending;
      if (!pending) return;
      data.priceList = { file: pending.file, at: new Date().toISOString(), by: ui.persona, columns: pending.columns, rows: pending.rows };
      Object.assign(priceView, { pending: null, query: '' });
      ui.pages.prices = 0;
      persist();
      close();
      render();
      toast(`价格表已更新，共 ${pending.rows.length} 个产品。`);
    },
    priceClear: () => { if (priceList()) fidConfirm('清空价格表', '清空后，聊天界面的「报价」将没有可选的产品。确认清空当前价格表？', 'priceClearDo'); },
    priceClearDo: () => {
      delete data.priceList;
      Object.assign(priceView, { pending: null, query: '' });
      persist();
      close();
      render();
      toast('价格表已清空。');
    },
    priceQuote: priceQuoteOpen,
    priceOpenPage: () => { close(); navigate('prices'); },
    // Puts the line of one price at the end of the message box. The message is not sent.
    priceInsert: id => {
      const list = priceList(), [row, at] = String(id).split(':').map(Number), entry = list?.rows[row], box = $('#composer-text');
      if (!entry || !entry.prices[at] || !box) return;
      close();
      const before = box.value.replace(/\s+$/, '');
      box.value = (before ? before + '\n' : '') + priceLine(list, entry, at);
      box.dispatchEvent(new Event('input', { bubbles: true }));
      box.focus();
      box.setSelectionRange(box.value.length, box.value.length);
    },
  });

  document.addEventListener('change', event => {
    if (event.target.id !== 'price-file') return;
    const file = event.target.files?.[0];
    event.target.value = '';
    priceRead(file);
  });
  document.addEventListener('input', event => {
    const input = event.target;
    if (input.id === 'price-search') {
      priceView.query = input.value;
      ui.pages.prices = 0;
      priceRefreshTable();
    } else if (input.id === 'price-quote-search') {
      priceView.quote = input.value;
      const rows = $('#price-quote-rows');
      rows.innerHTML = priceQuoteRows();
      paintIcons(rows);
    }
  });

  // Signing in happens before the app starts (fidelity-boot.js). The app shows itself and offers signing out,
  // which saves what is pending, ends the session on the server and returns to the sign-in screen.
  // The earlier layers ask this before they follow the address bar; the app only runs while someone is signed in.
  const subsiteSignedOut = false;
  function renderSignInState() {
    $('#app-shell').hidden = false;
    $('#subsite-login').hidden = true;
    $('.skip-link').hidden = false;
    return true;
  }

  Object.assign(fidActions, {
    subsiteLogout:()=>window.WA_SITE.signOut(),
  });

  render();
};
