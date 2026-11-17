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
      owner:a.owner||ui.persona, account:a.id, tags:[], stage:'新客户',
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
