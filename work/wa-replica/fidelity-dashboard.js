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
