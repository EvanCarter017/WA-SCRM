// The supervisor page: what a supervisor or an administrator sees after signing in. fidelity-boot.js calls
// window.WA_MASTER(user) instead of starting the app. The page lists the employees with a few figures of each
// one's sub-site and shows, read-only, the customers and conversations of one of them.
// It only reads: every request is a GET, except the one that signs out. A sub-site is asked under its own name,
// /site/<id>/api/…, so that several sub-sites can be read side by side; the server of a sub-site leaves a log
// line for every read of its data by someone who is not its own employee.
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = text => String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const icon = name => `<span class="icon" data-icon="${name}" aria-hidden="true"></span>`;
  const get = path => fetch(path).then(async response => ({ status: response.status, body: await response.json().catch(() => ({})) }), () => ({ status: 0, body: {} }));
  // The address of a sub-site's own server for a path of its API.
  const at = (site, path) => '/site/' + encodeURIComponent(site) + path;

  // user: who is signed in. sites: the list, each { site, employees, reached, data, link }.
  // open: the sub-site that is being looked at, { site, name, data, customer, query, chat } — or null for the list.
  // atEnd, endTop: whether the conversation shows its latest message, and where the page last put it there.
  const state = { user: null, sites: [], loading: true, failed: false, open: null, atEnd: true, endTop: -1 };

  function paintIcons(root) {
    for (const el of root.querySelectorAll('[data-icon]:empty')) {
      const nodes = window.WA_ICONS?.[el.dataset.icon];
      if (!nodes) continue;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      for (const [name, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(name, value);
      for (const [tag, attributes] of nodes) {
        const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
        svg.append(node);
      }
      el.replaceChildren(svg);
    }
  }

  // ---- days and times, as the app shows them ----
  const dayOf = at => new Date(at).toLocaleDateString('sv-SE');
  const clock = at => new Date(at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dayWord = at => (dayOf(at) === dayOf(Date.now()) ? '今天' : dayOf(at) === dayOf(Date.now() - 86400000) ? '昨天' : dayOf(at));
  const lastLabel = c => (!c.lastAt ? c.last || '' : dayOf(c.lastAt) === dayOf(Date.now()) ? clock(c.lastAt) : dayOf(c.lastAt) === dayOf(Date.now() - 86400000) ? '昨天' : dayOf(c.lastAt).slice(5));
  const messageDay = m => (m.at ? dayWord(m.at) : String(m.time || '').startsWith('昨天') ? '昨天' : '今天');
  const messageTime = m => (m.at ? clock(m.at) : String(m.time || '').replace('昨天 ', ''));
  // The conversation with the latest message comes first; the others keep their order after them.
  const ordered = list => list.map((c, i) => [c, i]).sort((x, y) => (y[0].lastAt || 0) - (x[0].lastAt || 0) || x[1] - y[1]).map(x => x[0]);

  // ---- the list of employees ----
  const LINK = { online: '已连接', scan: '等待扫码', starting: '连接中', verifying: '连接中', offline: '已掉线', attention: '需要在手机上处理', failed: '连接失败', missing: '需要重新绑定' };
  const SAVED = { online: '已连接', reconnect: '已掉线', pending: '待绑定' };
  const names = entry => {
    const active = entry.employees.filter(employee => !employee.disabled);
    return (active.length ? active : entry.employees).map(employee => employee.name + (employee.disabled ? '（已停用）' : '')).join('、');
  };
  // The state of each of a sub-site's numbers: what its WhatsApp link says now, or — when the link cannot be
  // asked or does not know the number — what the employee's page saved last (never "connected" on that alone).
  function numbers(entry) {
    return (entry.data.accounts || []).map(account => {
      const live = entry.link?.configured && entry.link.reachable ? entry.link.accounts.find(a => a.account === account.id)?.state : '';
      return { name: account.number || account.name || '', on: live === 'online', text: live ? LINK[live] || '已掉线' : SAVED[account.state === 'online' ? 'reconnect' : account.state] || '待绑定' };
    });
  }
  function figures(entry) {
    const customers = entry.data.customers || [], open = (entry.data.tasks || []).filter(task => !task.done);
    return {
      customers: customers.length,
      unread: customers.filter(c => c.unread > 0).length,
      tasks: open.length,
      late: open.filter(task => Date.parse(task.due) < Date.now()).length,
      last: Math.max(0, ...customers.map(c => c.lastAt || 0)),
    };
  }
  async function load() {
    state.loading = true;
    render();
    const list = await get('/api/auth/sites');
    state.failed = list.status !== 200;
    state.sites = state.failed ? [] : await Promise.all(list.body.sites.map(async entry => {
      const [doc, link] = await Promise.all([get(at(entry.site, '/api/data?fields=accounts,customers,tasks')), get(at(entry.site, '/api/wa/status'))]);
      return { ...entry, reached: doc.status === 200, data: doc.status === 200 ? doc.body.data : {}, link: link.status === 200 ? link.body : null };
    }));
    state.loading = false;
    render();
  }
  function listHTML() {
    if (state.loading) return '<p class="fid-master-note">正在读取…</p>';
    if (state.failed) return '<p class="fid-master-note">暂时无法读取员工列表，请稍后点击「刷新」。</p>';
    if (!state.sites.length) return '<p class="fid-master-note">还没有员工账号。</p>';
    const rows = state.sites.map(entry => {
      const who = `<strong>${esc(names(entry))}</strong><small>${esc(entry.employees.map(employee => employee.username).join('、'))}</small>`;
      if (!entry.reached) return `<tr><td class="fid-master-who">${who}</td><td colspan="5" class="fid-master-quiet">暂时无法读取这位员工的工作区</td><td></td></tr>`;
      const f = figures(entry), list = numbers(entry);
      return `<tr>
        <td class="fid-master-who">${who}</td>
        <td>${list.map(n => `<span class="fid-master-number"><span class="fid-master-dot ${n.on ? 'on' : 'warn'}"></span>${esc(n.name)}<small>${esc(n.text)}</small></span>`).join('') || '<span class="fid-master-quiet">还没有绑定号码</span>'}</td>
        <td>${f.customers}</td>
        <td>${f.unread}</td>
        <td>${f.tasks}${f.late ? `<small class="fid-master-late">${f.late} 项已逾期</small>` : ''}</td>
        <td>${f.last ? esc(dayWord(f.last) + ' ' + clock(f.last)) : '—'}</td>
        <td><button type="button" class="fid-btn tint" data-master="open" data-id="${esc(entry.site)}">${icon('MessagesSquare')}查看</button></td>
      </tr>`;
    }).join('');
    return `<div class="fid-table-scroll" tabindex="0" aria-label="员工总览表格"><table class="fid-table fid-master-table"><thead><tr>${['员工', 'WhatsApp 号码', '客户', '未读会话', '待跟进', '最近消息', '操作'].map(title => `<th scope="col">${title}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // ---- one employee's customers and conversations ----
  const SHOWN = { image: 'image', sticker: 'image', video: 'video', audio: 'audio', voice: 'audio', document: 'file' };
  const WORDS = { image: '[图片]', video: '[视频]', audio: '[语音]', voice: '[语音]', document: '[文件]', sticker: '[贴图]', location: '[位置]', contact: '[名片]', poll: '[投票]', call: '[通话]' };
  const mediaUrl = (c, m) => (!m.wa || !SHOWN[m.type] || !c.waChat || !c.account ? '' : at(state.open.site, '/api/wa/media?account=' + encodeURIComponent(c.account) + '&chat=' + encodeURIComponent(c.waChat) + '&id=' + encodeURIComponent(m.wa)));
  function mediaHTML(c, m) {
    const url = esc(mediaUrl(c, m)), shown = SHOWN[m.type];
    if (!url) return '';
    if (shown === 'image') return `<a class="openwa-media" href="${url}" target="_blank" rel="noopener" aria-label="在新标签页查看${m.type === 'sticker' ? '贴图' : '图片'}"><img src="${url}" alt="${m.type === 'sticker' ? '贴图' : '图片'}" loading="lazy"></a>`;
    if (shown === 'video') return `<div class="openwa-media"><video src="${url}" controls preload="none" aria-label="视频"></video></div>`;
    if (shown === 'audio') return `<div class="openwa-media"><audio src="${url}" controls preload="none" aria-label="语音"></audio></div>`;
    return `<a class="openwa-file" href="${url}&amp;download=1" download>${icon('FileDown')}<span>${esc(m.file || '文件')}</span></a>`;
  }
  // The words that only stood for the media ("[图片]") are left out when the media is shown.
  const caption = (c, m) => (mediaUrl(c, m) && m.text === WORDS[m.type] ? '' : m.text || '');
  // What a message of the number says about its way: on its way, not sent, outcome open, read, delivered or sent.
  const mark = m => (m.status === 'sending' ? '<span>发送中</span>' : m.status === 'failed' ? '<span class="fid-master-warn">未发送</span>' : m.status === 'unknown' ? '<span class="fid-master-warn">结果待确认</span>'
    : m.status === 'read' || m.status === 'played' ? icon('CheckCheck') + '<span>已读</span>' : icon(m.status === 'delivered' ? 'CheckCheck' : 'Check'));
  const selected = () => state.open.data.customers.find(c => c.id === state.open.customer);
  const matches = c => {
    const words = state.open.query.trim().toLowerCase().split(/\s+/).filter(Boolean), text = (c.name + ' ' + c.phone).toLowerCase(), digits = String(c.phone || '').replace(/\D/g, '');
    return words.every(word => text.includes(word) || (/^\d+$/.test(word) && digits.includes(word)));
  };
  function peopleHTML() {
    const list = ordered(state.open.data.customers).filter(matches);
    if (!list.length) return `<p class="fid-master-note">${state.open.data.customers.length ? '没有匹配的客户' : '这位员工还没有客户'}</p>`;
    return list.map(c => `<button type="button" class="fid-master-row ${c.id === state.open.customer ? 'selected' : ''}" data-master="customer" data-id="${esc(c.id)}" aria-label="查看${esc(c.name)}的会话">
      <span class="avatar ${esc(c.color || 'jade')}">${esc(c.initials || [...String(c.name || '')].slice(0, 1).join(''))}</span>
      <span class="fid-master-row-main"><span class="fid-master-row-line"><strong>${esc(c.name)}</strong><time>${esc(lastLabel(c))}</time></span>
      <span class="fid-master-row-line"><span class="fid-master-preview">${esc(c.preview)}</span>${c.unread > 0 ? `<span class="fid-master-unread">${Number(c.unread)}</span>` : ''}</span></span>
    </button>`).join('');
  }
  function chatHTML() {
    const c = selected(), data = state.open.data;
    if (!c) return '<p class="fid-master-note">选择左侧的客户查看会话</p>';
    const number = (data.accounts || []).find(a => a.id === c.account), tags = (c.tags || []).map(id => (data.tags || []).find(tag => tag.id === id)?.name).filter(Boolean);
    const tasks = (data.tasks || []).filter(task => task.customer === c.id && !task.done), list = data.messages?.[c.id] || [];
    let lastDay = '';
    const messages = list.map(m => {
      const day = messageDay(m), separator = day !== lastDay ? `<div class="fid-master-day">${esc(day)}</div>` : '';
      lastDay = day;
      return `${separator}<div class="fid-master-msg ${m.side === 'out' ? 'out' : ''}"><div class="fid-master-bubble">${mediaHTML(c, m)}${caption(c, m) ? `<div class="fid-master-text">${esc(caption(c, m))}</div>` : ''}${m.translated ? `<div class="fid-master-translation">${icon('Languages')}${esc(m.translated)}</div>` : ''}</div><div class="fid-master-meta"><time>${esc(messageTime(m))}</time>${m.side === 'out' ? mark(m) : ''}</div></div>`;
    }).join('');
    return `<div class="fid-master-chat-head"><button type="button" class="fid-btn fid-master-back" data-master="people" aria-label="返回客户列表">${icon('ArrowLeft')}</button><span class="avatar ${esc(c.color || 'jade')}">${esc(c.initials || [...String(c.name || '')].slice(0, 1).join(''))}</span><div><h2>${esc(c.name)}</h2><p>${esc([c.phone, number?.name, c.language].filter(Boolean).join(' · '))}</p></div></div>
      <dl class="fid-master-facts">
        <div><dt>标签</dt><dd>${esc(tags.join('、') || '无')}</dd></div>
        <div><dt>待跟进</dt><dd>${tasks.length ? tasks.map(task => esc(task.title) + (task.due ? `（${esc(dayOf(Date.parse(task.due)).slice(5))} 到期${Date.parse(task.due) < Date.now() ? '，已逾期' : ''}）` : '')).join('；') : '无'}</dd></div>
        ${c.notes ? `<div><dt>备注</dt><dd>${esc(c.notes)}</dd></div>` : ''}
      </dl>
      <div class="fid-master-messages" id="master-messages" tabindex="0" aria-label="${esc(c.name)}的会话">${messages || '<p class="fid-master-note">还没有会话消息</p>'}</div>`;
  }
  async function openSite(site, keep = '') {
    const entry = state.sites.find(e => e.site === site);
    state.open = { site, name: entry ? names(entry) : site, data: null, customer: '', query: '', chat: false, failed: false };
    render();
    const doc = await get(at(site, '/api/data'));
    if (state.open?.site !== site) return;
    if (doc.status !== 200) state.open.failed = true;
    else {
      const data = doc.body.data;
      data.customers ??= [];
      state.open.data = data;
      state.open.customer = data.customers.some(c => c.id === keep) ? keep : ordered(data.customers)[0]?.id || '';
    }
    render();
  }
  function siteHTML() {
    const open = state.open;
    const bar = `<div class="fid-master-bar"><button type="button" class="fid-btn" data-master="list">${icon('ArrowLeft')}返回员工总览</button><h1>${esc(open.name)} 的工作区</h1><span class="fid-master-readonly">${icon('LockKeyhole')}只读</span><button type="button" class="fid-btn" data-master="reload">${icon('RefreshCw')}刷新</button><p>这里只能查看：不能发送消息，也不能修改客户资料。每次查看都会记入服务器日志。</p></div>`;
    if (open.failed) return bar + '<p class="fid-master-note">暂时无法读取这位员工的工作区，请稍后点击「刷新」。</p>';
    if (!open.data) return bar + '<p class="fid-master-note">正在读取…</p>';
    return `${bar}<div class="fid-master-site ${open.chat ? 'chat-open' : ''}">
      <aside class="fid-master-people" aria-label="客户列表"><div class="fid-master-search"><input id="master-search" type="search" placeholder="搜索客户姓名或号码" aria-label="搜索客户" value="${esc(open.query)}"></div><div class="fid-master-list" id="master-list">${peopleHTML()}</div></aside>
      <section class="fid-master-chat" id="master-chat">${chatHTML()}</section>
    </div>`;
  }

  // ---- the page ----
  function render() {
    const root = $('#master');
    root.innerHTML = `<header class="fid-master-top"><div class="fid-sign-in-brand" translate="no"><span class="brand-symbol" data-icon="MessagesSquare"></span><strong>WA Desk SCRM</strong></div><span class="fid-master-title">主管视图</span><span class="fid-master-user">已登录：${esc(state.user.name)}（${esc(state.user.username)}）</span><button type="button" class="fid-btn" data-master="leave">${icon('LogOut')}退出登录</button></header>
      <div class="fid-master-body">${state.open ? siteHTML() : `<div class="fid-master-bar"><h1>员工总览</h1><button type="button" class="fid-btn" data-master="reload">${icon('RefreshCw')}刷新</button><p>每位员工的号码、客户与待办概况。点击「查看」可以只读方式查看该员工的客户与会话。</p></div>${listHTML()}`}</div>`;
    paintIcons(root);
    showEnd();
  }
  // A conversation opens at its latest message, and stays there while pictures take their height — unless the
  // reader has moved up.
  function showEnd() {
    const box = $('#master-messages');
    if (!box) return;
    box.scrollTop = box.scrollHeight;
    Object.assign(state, { atEnd: true, endTop: box.scrollTop });
  }
  function showCustomer() {
    $('#master-list').innerHTML = peopleHTML();
    $('#master-chat').innerHTML = chatHTML();
    $('.fid-master-site').classList.toggle('chat-open', state.open.chat);
    paintIcons($('#master'));
    showEnd();
  }

  const actions = {
    open: id => openSite(id),
    list: () => { state.open = null; load(); },
    reload: () => (state.open ? openSite(state.open.site, state.open.customer) : load()),
    customer: id => { Object.assign(state.open, { customer: id, chat: true }); showCustomer(); },
    people: () => { state.open.chat = false; showCustomer(); },
    leave: async () => {
      await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
      location.reload();
    },
  };

  window.WA_MASTER = user => {
    const root = $('#master');
    state.user = user;
    root.hidden = false;
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-master]');
      if (button) actions[button.dataset.master](button.dataset.id);
    });
    root.addEventListener('input', event => {
      if (event.target.id !== 'master-search') return;
      state.open.query = event.target.value;
      $('#master-list').innerHTML = peopleHTML();
    });
    // Media that cannot be had — gone from the phone, or the number is not connected — gives way to a short note.
    root.addEventListener('error', event => {
      const el = event.target, holder = el.closest?.('.openwa-media');
      if (!holder || !['IMG', 'VIDEO', 'AUDIO'].includes(el.tagName)) return;
      const note = document.createElement('span');
      note.className = 'openwa-media-missing';
      note.textContent = (el.tagName === 'IMG' ? '图片' : el.tagName === 'VIDEO' ? '视频' : '语音') + '暂时无法加载';
      holder.replaceWith(note);
    }, true);
    // A picture that arrives later makes the conversation taller: its end stays in view while the reader is there.
    // (The scroll the page made itself reports the place it was put to; that is no move of the reader.)
    root.addEventListener('scroll', event => {
      const box = event.target;
      if (box.id === 'master-messages' && box.scrollTop !== state.endTop) state.atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
    }, true);
    root.addEventListener('load', event => { if (state.atEnd && event.target.tagName === 'IMG' && event.target.closest('#master-messages')) showEnd(); }, true);
    return load();
  };
})();
