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

  // ---- the customer's picture ----
  // A customer of a linked number shows the profile picture WhatsApp gives for the chat, laid over the initials
  // wherever an avatar is drawn. Where there is none — or the customer hides it from this number — the server
  // answers without a picture, and the initials stay.
  function openwaAvatar(c) {
    const digits = fidPhoneDigits(c.phone || '');
    if (!c.account || !account(c.account)?.linked || (!c.waChat && digits.length < 7)) return '';
    return `<img class="openwa-avatar" src="/api/wa/avatar?account=${encodeURIComponent(c.account)}&amp;chat=${encodeURIComponent(c.waChat || digits + '@c.us')}" alt="" loading="lazy">`;
  }
  document.addEventListener('error', event => {
    if (event.target.classList?.contains('openwa-avatar')) event.target.remove();
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
    // Once the draw has put the conversation where it belongs: is its end in view?
    requestAnimationFrame(openwaNoteEnd);
    const list = $('#conversation-list');
    if (!list) return;
    if (openwaListPlace.key !== openwaListKey()) Object.assign(openwaListPlace, { key: openwaListKey(), top: 0 });
    else if (openwaListPlace.top) list.scrollTop = openwaListPlace.top;
  };
  // A picture or a video takes its height only once it has loaded, and a line above the message box takes room
  // from the conversation. A conversation that showed its end goes on showing it then: what was just sent, or has
  // just arrived, is not left below the edge. Whether the end is in view is noted, with where the conversation
  // stood, after every draw and whenever the page itself moves the conversation.
  let openwaAtEnd = true, openwaEndTop = 0;
  function openwaNoteEnd() {
    const box = $('#messages');
    if (!box) return;
    openwaAtEnd = box.scrollHeight - box.clientHeight - box.scrollTop <= 40;
    openwaEndTop = box.scrollTop;
  }
  function openwaShowEnd() {
    const box = $('#messages');
    if (!box) return;
    box.scrollTop = box.scrollHeight;
    openwaNoteEnd();
  }
  // Scrolling by hand changes the note. What the page did itself was noted when it happened: its scroll event
  // comes later, when a picture may have taken its height, and must not look like someone scrolling away.
  document.addEventListener('scroll', event => {
    if (event.target.id === 'messages' && event.target.scrollTop !== openwaEndTop) openwaNoteEnd();
  }, true);
  for (const type of ['load', 'loadedmetadata']) {
    document.addEventListener(type, event => {
      const box = event.target.closest?.('.openwa-media') && $('#messages');
      if (box && box.contains(event.target) && openwaAtEnd) openwaShowEnd();
    }, true);
  }

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
    // Beside a conversation, "online" reads as if the customer were online — which WhatsApp does not tell this
    // number. So the state of the employee's number is said here only when it is not connected.
    const state = a.state === 'online' ? '' : `<span class="state-text ${a.state==='reconnect'?'warn':''}" role="status"><span class="state-dot ${a.state==='reconnect'?'warning':'offline'}"></span>${openwaState(a)}</span>`;
    chat = chat.replace('<div class="source-strip">', `<div class="openwa-chat-status">
      <span>${icon('Smartphone')}<b>${esc(a.number)}</b></span>${state}
    </div><div class="source-strip">`);
    if (a.state !== 'online') {
      chat = chat.replace(`${esc(a.name)} 待连接`, '发送已暂停')
        .replace('当前草稿会保留，连接后可继续处理。','草稿和聊天记录已保留。');
      if (a.state === 'pending') chat = chat.replace('>重新连接</button>', '>扫码绑定</button>');
    }
    // While a file is on its way the send button waits.
    if (openwaFiles.get(c.id)?.sending) chat = chat.replace('data-action="send" aria-label="发送消息">', 'data-action="send" aria-label="发送消息" disabled>');
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

  // ---- sending files ----
  // Files can be attached to a conversation, ten at most: with the "+" button, by pasting them into the message
  // box, or by dropping them on the conversation. They go out one after the other, each as a message of its own
  // — the way WhatsApp itself sends several files — and the first one carries what is in the message box as its
  // caption. A file stays attached until the server says it was sent: pressing send again goes on where the row
  // stopped and repeats the same request for the file whose outcome was open, which never sends twice. The files
  // live in this page only: after a reload nothing is attached.
  const OPENWA_FILE_MAX = 16 * 1024 * 1024;
  const OPENWA_FILES_MAX = 10;
  const OPENWA_CAPTION_MAX = 1024;
  // Pictures the browser can show are shown small beside the name of the file.
  const OPENWA_FILE_SHOWN = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  // For each conversation: the files that wait, in the order they were added, and whether they are on their way.
  // The baseline's label of an attachment says how many there are; it is what enables the send button.
  const openwaFiles = new Map();
  const openwaFilesLabel = count => `${count} 个文件`;
  for (const id of Object.keys(ui.attachments)) delete ui.attachments[id];
  const openwaFileSize = bytes => bytes < 1024 * 1024 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1024 / 1024).toFixed(1) + ' MB';
  function openwaAttachButton() {
    return `<button class="icon-button" type="button" data-action="openwaAttach" aria-label="添加文件" title="添加图片、视频、音频或文件，也可以粘贴或拖到会话里；一次最多 ${OPENWA_FILES_MAX} 个">${icon('Plus')}</button><input type="file" id="openwa-file" multiple hidden>`;
  }
  // Draws the line above the message box and the send button again, as the page does while a message is typed.
  // The line takes room from the conversation: one that showed its end goes on showing it.
  function openwaShowFile(c) {
    const box = $('#translation-preview');
    if (ui.view !== 'inbox' || selectedCustomer() !== c || !box) return;
    box.innerHTML = previewHTML(c);
    paintIcons(box);
    updateSendState(c);
    if (openwaAtEnd) openwaShowEnd();
  }
  // Takes one file off a conversation — or, when none is named, all of them.
  function openwaDetach(id, item) {
    const held = openwaFiles.get(id);
    if (!held) return;
    for (const gone of item ? [item] : held.list) if (gone.url) URL.revokeObjectURL(gone.url);
    held.list = item ? held.list.filter(other => other !== item) : [];
    if (held.list.length) return void (ui.attachments[id] = openwaFilesLabel(held.list.length));
    openwaFiles.delete(id);
    delete ui.attachments[id];
  }
  // Adds files to the ones that wait. What cannot be sent — an empty file, one that is too large, more than ten —
  // is left out, and one sentence says so.
  function openwaAttach(files) {
    const c = selectedCustomer();
    if (!c || !files.length || ui.view !== 'inbox' || !$('#composer-text')) return;
    const held = openwaFiles.get(c.id) || { list: [], sending: false };
    if (held.sending) return toast('文件还在发送，请稍候再添加。');
    const fit = files.filter(file => file.size && file.size <= OPENWA_FILE_MAX), room = OPENWA_FILES_MAX - held.list.length;
    for (const file of fit.slice(0, room)) held.list.push({ file, url: OPENWA_FILE_SHOWN.includes(file.type) ? URL.createObjectURL(file) : '' });
    if (held.list.length) {
      openwaFiles.set(c.id, held);
      ui.attachments[c.id] = openwaFilesLabel(held.list.length);
    }
    openwaShowFile(c);
    $('#composer-text').focus({ preventScroll: true });
    const empty = files.filter(file => !file.size).length, large = files.filter(file => file.size > OPENWA_FILE_MAX).length, many = Math.max(0, fit.length - room);
    const left = [empty && `${empty} 个空文件`, large && `${large} 个超过 16 MB 的文件`, many && `${many} 个超出数量的文件（一次最多 ${OPENWA_FILES_MAX} 个）`].filter(Boolean);
    if (left.length) toast(`没有添加：${left.join('、')}。`);
  }
  // The line above the message box lists the attached files, each with its size and — a picture — shown small.
  // While they are on their way none can be removed. It takes the place of the baseline's own line, which names
  // one attachment by its label.
  const openwaBasePreview = previewHTML;
  previewHTML = function(c) {
    const held = openwaFiles.get(c.id), html = openwaBasePreview(c);
    if (!held) return html;
    const files = held.list.map((item, at) => `<span class="openwa-attached-file">${item.url ? `<img class="openwa-attached" src="${item.url}" alt="">` : ''}<span>${esc(item.file.name || '文件')} · ${openwaFileSize(item.file.size)}</span>${held.sending ? '' : `<button class="link" data-action="removeAttachment" ${fidActionID(at)} aria-label="移除 ${esc(item.file.name || '文件')}">移除</button>`}</span>`).join('');
    return html.replace(`<small>附件</small>${esc(ui.attachments[c.id])} <button class="link" data-action="removeAttachment">移除</button>`,
      `<small>附件${held.list.length > 1 ? `（${held.list.length} 个，逐个发出）` : ''}</small><span class="openwa-attached-list">${files}</span>${held.sending ? '<span class="openwa-attached-busy" role="status">发送中…</span>' : ''}`);
  };
  const openwaBaseSendState = updateSendState;
  updateSendState = function(c) {
    openwaBaseSendState(c);
    const button = document.querySelector('[data-action="send"]');
    if (button && c && openwaFiles.get(c.id)?.sending) button.disabled = true;
  };
  document.addEventListener('change', event => {
    if (event.target.id !== 'openwa-file') return;
    const files = [...event.target.files];
    event.target.value = '';
    openwaAttach(files);
  });
  document.addEventListener('paste', event => {
    const files = event.target.id === 'composer-text' ? [...(event.clipboardData?.files || [])] : [];
    if (!files.length) return;
    event.preventDefault();
    openwaAttach(files);
  });
  // A file that is dragged over the open conversation can be dropped anywhere on it.
  const openwaDragged = event => ([...(event.dataTransfer?.types || [])].includes('Files') ? event.target.closest?.('.chat-pane:not(.fid-chat-blank)') : null);
  document.addEventListener('dragover', event => {
    const pane = openwaDragged(event);
    if (!pane) return;
    event.preventDefault();
    pane.classList.add('openwa-file-over');
  });
  document.addEventListener('dragleave', event => {
    const pane = openwaDragged(event);
    if (pane && !pane.contains(event.relatedTarget)) pane.classList.remove('openwa-file-over');
  });
  document.addEventListener('drop', event => {
    const pane = openwaDragged(event);
    if (!pane) return;
    event.preventDefault();
    pane.classList.remove('openwa-file-over');
    if (event.dataTransfer.items?.[0]?.webkitGetAsEntry?.()?.isDirectory) return toast('不能发送文件夹，请选择文件。');
    openwaAttach([...event.dataTransfer.files]);
  });
  // The files go out one after the other, in their order; the first carries the caption. text is what was typed;
  // caption is what goes out with the first file (the translation when one was made). A file that is not sent
  // stops the row: it and the ones after it stay attached.
  async function openwaSendFiles(c, held, text, caption) {
    if (held.sending) return;
    const digits = fidPhoneDigits(c.phone);
    if (!c.waChat && digits.length < 7) return toast('这位客户没有可用的 WhatsApp 号码。');
    if (caption.length > OPENWA_CAPTION_MAX) return toast(`带文件发送时，文字最多 ${OPENWA_CAPTION_MAX} 个字符。`);
    held.sending = true;
    openwaShowFile(c);
    let failed = '';
    for (let first = true; held.list.length && !failed; first = false) failed = await openwaSendFile(c, held.list[0], first ? text : '', first ? caption : '');
    held.sending = false;
    if (failed) toast(failed + (held.list.length > 1 ? `其余 ${held.list.length - 1} 个文件也还没有发出。` : ''));
    openwaShowFile(c);
  }
  // One file goes to the server as it is, behind one line with its details: whom it is for, its name, its type
  // and the caption. Answers with nothing when it was sent, and with what to tell the employee when it was not.
  async function openwaSendFile(c, item, text, caption) {
    const digits = fidPhoneDigits(c.phone);
    // The same press repeated is the same request; with another caption it is a new one.
    if (item.caption !== caption) Object.assign(item, { caption, request: nextId('r') });
    const details = JSON.stringify({ account: c.account, to: c.waChat || digits + '@c.us', requestId: item.request, name: item.file.name, type: item.file.type, caption });
    let answer;
    try {
      const response = await fetch('/api/wa/send-file', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Blob([details, '\n', item.file]) });
      answer = { status: response.status, body: await response.json().catch(() => ({})) };
    } catch (e) {
      answer = { status: 0, body: {} };
    }
    if (answer.status !== 200) {
      const open = answer.status === 0 || answer.status === 502 || answer.body.error === 'outcome-unknown';
      return open ? '发送结果待确认。文件还在消息框上方，再按一次发送即可，不会重复发出。' : answer.body.error === 'not-connected' ? '号码未连接，文件没有发出。' : answer.status === 413 ? '文件超过 16 MB，无法从这里发送。' : '文件没有发出，可再按一次发送。';
    }
    const sent = answer.body, shown = caption || openwaMediaText[sent.type];
    const list = data.messages[c.id] ??= conversationMessages(c);
    // The feed may have brought the message first: that one is kept and completed.
    let message = list.find(m => m.wa === sent.messageId);
    if (!message) {
      message = { id: nextId('m'), side: 'out', time: openwaClock(sent.timestamp), at: sent.timestamp, wa: sent.messageId, status: 'sent' };
      list.push(message);
      list.sort((x, y) => (x.at || 0) - (y.at || 0));
    }
    // A caption that went out as it was typed is marked as read in the reading language and never asked for. One
    // that was put into the customer's language is translated back into the reading language after it is sent,
    // like a message sent from the phone (plan 066): what shows under it is what the customer reads.
    Object.assign(message, { text: shown, type: sent.type, ...(sent.file ? { file: sent.file } : {}) });
    if (caption === text) message.translatedTo = aiSettings().readLanguage;
    else for (const field of ['translatedTo', 'translated']) delete message[field];
    if (list.at(-1) === message) Object.assign(c, { preview: shown, last: message.time, lastAt: message.at });
    c.unread = 0;
    if (draft(c).text.trim() === text) ui.drafts[c.id] = { text: '', translated: '', source: '' };
    openwaDetach(c.id, item);
    persist();
    openwaRefresh();
    // What was just sent is in view, wherever the conversation stood.
    if (ui.view === 'inbox' && selectedCustomer() === c) requestAnimationFrame(openwaShowEnd);
    return '';
  }

  send = function() {
    const c = selectedCustomer(), el = $('#composer-text');
    if (!c || !el) return;
    if (account(c.account)?.state !== 'online') return toast('号码尚未连接，草稿会保留。');
    const text = el.value.trim(), held = openwaFiles.get(c.id);
    if (!text && !held) return;
    const d = draft(c), outgoing = d.translated && d.source === text ? d.translated : text;
    // With files attached, the text is the caption of the first: they go out together.
    if (held) return openwaSendFiles(c, held, text, outgoing);
    // What the employee sends from here as it was typed is marked as read in the reading language and never asked
    // for. A reply that was put into the customer's language is translated back into the reading language after
    // it is sent, like a message sent from the phone (plan 066): what shows under it is what the customer reads.
    const message = { id: nextId('m'), side: 'out', text: outgoing, time: openwaClock(), at: Date.now(), request: nextId('r'), status: 'sending', ...(outgoing === text ? { translatedTo: aiSettings().readLanguage } : {}) };
    (data.messages[c.id] ??= conversationMessages(c)).push(message);
    Object.assign(c, { preview: outgoing, last: message.time, lastAt: message.at, unread: 0 });
    ui.drafts[c.id] = { text: '', translated: '', source: '' };
    persist();
    render();
    // What was just sent is in view, also when the line above the message box had pushed the end out of it.
    requestAnimationFrame(openwaShowEnd);
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
    Object.assign(keep, { waChat: drop.waChat, unread: Math.max(Number(keep.unread) || 0, Number(drop.unread) || 0), star: keep.star || drop.star, pinned: keep.pinned || drop.pinned,
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
    // The same for a file on its way to such a customer: no message of it exists yet, so the customer is the one
    // this number is sending a file to right now.
    if (!c && e.kind === 'message' && e.fromMe && e.type !== 'text') {
      const waiting = data.customers.filter(x => x.account === a.id && !x.waChat && openwaFiles.get(x.id)?.sending);
      if (waiting.length === 1) c = waiting[0];
    }
    // A customer who was known by phone number only learns the chat id here. That is a change of its own: a
    // file that was sent to the customer shows only once the chat is known.
    const named = Boolean(c && !c.waChat);
    if (named) c.waChat = e.chat;
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
    // e.status is the receipt the server holds for a message of the number from before the message itself: a
    // receipt that came first found no message here and was left aside.
    const known = e.id && list.find(m => m.wa === e.id);
    if (known) {
      const order = ['sending', 'unknown', 'sent', 'delivered', 'read', 'played'];
      if (known.side !== 'out' || !e.status || order.indexOf(e.status) <= order.indexOf(known.status)) return named;
      known.status = e.status;
      return true;
    }
    const text = e.text || openwaMediaText[e.type] || '[消息]';
    if (e.fromMe) {
      // What this page sent comes back through the feed: it is the message that is still waiting for its answer.
      const mine = list.find(m => m.side === 'out' && !m.wa && m.status === 'sending' && m.text === e.text);
      if (mine) {
        Object.assign(mine, { wa: e.id, status: e.status || 'sent' });
        return true;
      }
    }
    const message = { id: nextId('m'), side: e.fromMe ? 'out' : 'in', text, time: openwaClock(e.at), at: e.at, wa: e.id, type: e.type, ...(e.media?.name ? { file: e.media.name } : {}), ...(e.fromMe ? { status: e.status || 'sent' } : {}) };
    // A file this page is sending comes through the feed before the server has answered: it is the page's own
    // message, marked like everything the page sends.
    if (e.fromMe && openwaFiles.get(c.id)?.sending) message.translatedTo = aiSettings().readLanguage;
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
    openwaAttach:()=>$('#openwa-file')?.click(),
    removeAttachment:id=>{
      const c = selectedCustomer(), held = c && openwaFiles.get(c.id);
      if (!held || held.sending || !held.list[Number(id)]) return;
      openwaDetach(c.id, held.list[Number(id)]);
      openwaShowFile(c);
    },
  });

  openwaDialog.addEventListener('close', () => {
    if (openwaDialog.open || !openwaPairing) return;
    openwaAbandon(openwaPairing);
    openwaPairing = null;
  });
  setTimeout(openwaListen, 0);
