  // WhatsApp numbers through the sub-site's own OpenWA. The page talks to its own server only (/api/wa/*):
  // linking a number by QR code, the feed of what happens on the numbers, and sending.
  const openwaDialog = $('#dialog');
  let openwaPairing = null;
  // What the server said about the link: null until asked, then { configured, reachable }.
  let openwaServer = null;
  const openwaClient = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

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
      <p class="openwa-pair-hint">二维码会自动更新。绑定后，这个号码的新消息会显示在在线聊天里。</p>
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
    Object.assign(pair, { phase, qr, error });
    openwaShowPairing();
  }

  async function openwaRequestLink(pair) {
    const answer = await openwaCall('POST', 'link', { account: pair.accountId });
    if (openwaPairing !== pair) return openwaAbandon(pair);
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
    if (openwaPairing === pair && pair.phase !== 'error') pair.timer = setTimeout(() => openwaPoll(pair), 2000);
  }

  function openwaBeginPairing(mode, a) {
    if (openwaServer && !openwaServer.configured) return toast('服务器尚未接入 WhatsApp 连接，请联系管理员。');
    const pair = openwaPairing = { mode, accountId: a?.id || nextId('a'), label: a ? a.name + (fidPhoneDigits(a.number).length >= 7 ? ' · ' + a.number : '') : '', phase: 'starting', qr: '', error: '' };
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
    const message = { id: nextId('m'), side: 'out', text: outgoing, time: openwaClock(), at: Date.now(), request: nextId('r'), status: 'sending' };
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
      country: a.country || '', city: '', timezone: '', language: '其他', owner: a.owner || ui.persona, account: a.id, tags: [], engagement: 'open',
      source: '未知来源', campaign: '', ad: '', unread: 0, star: false, last: '', preview: '', translation: '', followup: null, notes: '',
      contactRefs: [{ account: a.id, owner: a.owner || ui.persona }], createdAt: nowIso, updatedAt: nowIso, clientType: '新增线索-实时', reactivatedCount: 0 };
    // The engagement module creates the first-reply to-do on the next render.
    if (!e.fromMe) c.needsFirstReply = true;
    data.customers.unshift(c);
    data.messages[c.id] = [];
    return c;
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
    if (!a) return false;
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
      if ((data.messages[c.id] || []).at(-1) === m) c.preview = m.text;
      if (e.kind === 'edited' && m.side === 'in') aiTranslateInbound(c, m);
      return true;
    }
    if (e.kind !== 'message' || !e.chat) return false;
    let c = data.customers.find(c => c.account === a.id && c.waChat === e.chat)
      || (e.phone ? data.customers.find(c => c.account === a.id && !c.waChat && fidPhoneDigits(c.phone) === e.phone) : null);
    if (c && !c.waChat) c.waChat = e.chat;
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
    const message = { id: nextId('m'), side: e.fromMe ? 'out' : 'in', text, time: openwaClock(e.at), at: e.at, wa: e.id, type: e.type, ...(e.fromMe ? { status: 'sent' } : {}) };
    list.push(message);
    list.sort((x, y) => (x.at || 0) - (y.at || 0));
    if (list.at(-1) === message) Object.assign(c, { preview: text, translation: '', last: message.time, lastAt: e.at });
    if (!e.fromMe) {
      const closed = lcIsClosed(c);
      c.unread = (Number(c.unread) || 0) + 1;
      if (closed) lcLog(c.id, 'inbound', '已结束跟进的客户主动发来新消息（触发复联信号）');
      if (e.type === 'text' && e.text) aiTranslateInbound(c, message);
    }
    return true;
  }

  // Draws the page again after the feed changed the data, without disturbing what is being typed.
  let openwaComposing = false, openwaStale = false;
  document.addEventListener('compositionstart', () => { openwaComposing = true; });
  document.addEventListener('compositionend', () => { openwaComposing = false; if (openwaStale) openwaRefresh(); });
  function openwaRefresh() {
    if (openwaComposing) return void (openwaStale = true);
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
