// The supervisor page: what a supervisor or an administrator sees after signing in. fidelity-boot.js calls
// window.WA_MASTER(user) instead of starting the app. The page lists the employees with a few figures of each
// one's sub-site and shows, read-only, the customers and conversations of one of them.
// Of a sub-site it only reads: a sub-site is asked under its own name, /site/<id>/api/…, with GET and nothing
// else, so that several can be read side by side, and the server of a sub-site leaves a log line for every read
// of its data by someone who is not its own employee. What the page changes are accounts and nothing else: a new
// supervisor — or, where the platform makes sub-sites, a new employee, who gets a sub-site of their own —, a new
// temporary password for someone, an account switched off or on, an account deleted — and it signs out.
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = text => String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const icon = name => `<span class="icon" data-icon="${name}" aria-hidden="true"></span>`;
  const get = path => fetch(path).then(async response => ({ status: response.status, body: await response.json().catch(() => ({})) }), () => ({ status: 0, body: {} }));
  // The requests that change something: about accounts, and signing out. Never to a sub-site.
  const post = (path, body) => fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async response => ({ status: response.status, body: await response.json().catch(() => ({})) }), () => ({ status: 0, body: {} }));
  // The address of a sub-site's own server for a path of its API.
  const at = (site, path) => '/site/' + encodeURIComponent(site) + path;
  // What a sub-site saved is taken where it has the shape the page expects and left out where it has not: one
  // sub-site's odd data must not stop the page for the others.
  const rows = value => (Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : []);
  const guarded = (make, instead) => { try { return make(); } catch { return instead; } };
  // The colour of a customer's initials is one word of the style sheet, whatever was saved.
  const tone = c => String(c.color || '').replace(/[^a-z]/g, '') || 'jade';

  // user: who is signed in. sites: the list, each { site, employees, state, reached, data, link } (state: of a
  // sub-site the platform made, as the server tells it). users: every account. provisioned: whether the platform
  // makes sub-sites, so that an employee can be made here.
  // open: the sub-site that is being looked at, { site, name, data, customer, query, chat } — or null for the list.
  // atEnd, endTop: whether the conversation shows its latest message, and where the page last put it there.
  const state = { user: null, sites: [], users: [], provisioned: false, loading: true, failed: false, open: null, atEnd: true, endTop: -1 };

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
  // A time that was saved as something else than a number counts as none.
  const time = value => (Number.isFinite(value) ? value : 0);
  const lastLabel = c => (!time(c.lastAt) ? c.last || '' : dayOf(c.lastAt) === dayOf(Date.now()) ? clock(c.lastAt) : dayOf(c.lastAt) === dayOf(Date.now() - 86400000) ? '昨天' : dayOf(c.lastAt).slice(5));
  const messageDay = m => (time(m.at) ? dayWord(m.at) : String(m.time || '').startsWith('昨天') ? '昨天' : '今天');
  const messageTime = m => (time(m.at) ? clock(m.at) : String(m.time || '').replace('昨天 ', ''));
  // The conversation with the latest message comes first; the others keep their order after them.
  const ordered = list => list.map((c, i) => [c, i]).sort((x, y) => time(y[0].lastAt) - time(x[0].lastAt) || x[1] - y[1]).map(x => x[0]);

  // ---- the list of employees ----
  const LINK = { online: '已连接', scan: '等待扫码', starting: '连接中', verifying: '连接中', offline: '已掉线', attention: '需要在手机上处理', failed: '连接失败', missing: '需要重新绑定' };
  const SAVED = { online: '已连接', reconnect: '已掉线', pending: '待绑定' };
  // The accounts a row of the list stands for: the employees that are not switched off, or all when none is on.
  const shown = entry => {
    const active = entry.employees.filter(employee => !employee.disabled);
    return active.length ? active : entry.employees;
  };
  const names = entry => shown(entry).map(employee => employee.name + (employee.disabled ? '（已停用）' : '')).join('、');
  // The state of each of a sub-site's numbers: what its WhatsApp link says now, or — when the link cannot be
  // asked or does not know the number — what the employee's page saved last (never "connected" on that alone).
  function numbers(entry) {
    return rows(entry.data.accounts).map(account => {
      const live = entry.link?.configured && entry.link.reachable ? rows(entry.link.accounts).find(a => a.account === account.id)?.state : '';
      return { name: account.number || account.name || '', on: live === 'online', text: live ? LINK[live] || '已掉线' : SAVED[account.state === 'online' ? 'reconnect' : account.state] || '待绑定' };
    });
  }
  function figures(entry) {
    const customers = rows(entry.data.customers), open = rows(entry.data.tasks).filter(task => !task.done);
    return {
      customers: customers.length,
      unread: customers.filter(c => c.unread > 0).length,
      tasks: open.length,
      late: open.filter(task => Date.parse(task.due) < Date.now()).length,
      last: Math.max(0, ...customers.map(c => time(c.lastAt))),
    };
  }
  // What the list says of a sub-site the platform made, while it is not ready to be read.
  const WORKSPACE = { starting: '正在准备，大约需要一分钟…', ready: '已就绪', stopping: '正在停止…', removing: '正在删除…', stopped: '已停止', failed: '启动失败，可先「停用」再「启用」重试', missing: '尚未创建' };
  const workspaceText = value => '工作区：' + (WORKSPACE[value] || '状态未知');
  // quiet: asked in passing, while a sub-site is being made or started — what is shown stays until the answer is
  // there, and a sub-site that was read already and is as it was is not read again.
  async function load(quiet = false) {
    if (!quiet) {
      state.loading = true;
      render();
    }
    const before = new Map(quiet ? state.sites.map(entry => [entry.site, entry]) : []);
    const [list, accounts] = await Promise.all([get('/api/auth/sites'), get('/api/auth/users')]);
    state.failed = list.status !== 200;
    state.users = accounts.status === 200 ? rows(accounts.body.users) : [];
    state.provisioned = !state.failed && list.body.provisioned === true;
    state.sites = state.failed ? [] : await Promise.all(list.body.sites.map(async entry => {
      // A sub-site that does not run has nobody to answer for it.
      if (entry.state && entry.state !== 'ready') return { ...entry, reached: false, data: {}, link: null };
      const known = before.get(entry.site);
      if (known?.reached && known.state === entry.state) return { ...known, employees: entry.employees };
      const [doc, link] = await Promise.all([get(at(entry.site, '/api/data?fields=accounts,customers,tasks')), get(at(entry.site, '/api/wa/status'))]);
      return { ...entry, reached: doc.status === 200, data: doc.status === 200 && doc.body.data && typeof doc.body.data === 'object' ? doc.body.data : {}, link: link.status === 200 ? link.body : null };
    }));
    state.loading = false;
    // What was asked in passing does not draw over an employee's conversations that were opened meanwhile.
    if (!quiet || !state.open) render();
    // The line about the new sub-site in the dialog that follows the making of an employee's account.
    const line = $('#master-workspace'), made = line && state.sites.find(entry => entry.site === line.dataset.id);
    if (made?.state) line.textContent = workspaceText(made.state);
    watch();
  }
  // While a sub-site is being made, started, stopped or deleted, the list is asked again every few seconds —
  // until all have settled, and not while an employee's conversations are open.
  function watch() {
    clearTimeout(watch.timer);
    if (!state.open && state.sites.some(entry => ['starting', 'stopping', 'removing'].includes(entry.state))) watch.timer = setTimeout(() => load(true), 4000);
  }
  function listHTML() {
    if (state.loading) return '<p class="fid-master-note">正在读取…</p>';
    if (state.failed) return '<p class="fid-master-note">暂时无法读取员工列表，请稍后点击「刷新」。</p>';
    if (!state.sites.length) return '<p class="fid-master-note">还没有员工账号。</p>';
    const table = state.sites.map(entry => {
      const who = `<strong>${esc(names(entry))}</strong><small>${esc(entry.employees.map(employee => employee.username).join('、'))}</small>`;
      // A sub-site whose saved data cannot be worked with is listed like one that cannot be read.
      const drawn = entry.reached ? guarded(() => ({ f: figures(entry), list: numbers(entry) }), null) : null;
      // Every account of the sub-site can be acted on — also one that is switched off and so not named in front.
      const acts = `<div class="fid-master-acts">${entry.employees.map(employee => `<span>${entry.employees.length > 1 ? esc(employee.username) + (employee.disabled ? '（已停用）' : '') + '：' : ''}${accountActs(employee)}</span>`).join('')}</div>`;
      // A sub-site the platform made that is not ready — being prepared, stopped, failed — says so in its row.
      if (entry.state && entry.state !== 'ready') return `<tr><td class="fid-master-who">${who}</td><td colspan="5" class="fid-master-quiet">${esc(workspaceText(entry.state))}</td><td>${acts}</td></tr>`;
      if (!drawn) return `<tr><td class="fid-master-who">${who}</td><td colspan="5" class="fid-master-quiet">暂时无法读取这位员工的工作区</td><td>${acts}</td></tr>`;
      const { f, list } = drawn;
      return `<tr>
        <td class="fid-master-who">${who}</td>
        <td>${list.map(n => `<span class="fid-master-number"><span class="fid-master-dot ${n.on ? 'on' : 'warn'}"></span>${esc(n.name)}<small>${esc(n.text)}</small></span>`).join('') || '<span class="fid-master-quiet">还没有绑定号码</span>'}</td>
        <td>${f.customers}</td>
        <td>${f.unread}</td>
        <td>${f.tasks}${f.late ? `<small class="fid-master-late">${f.late} 项已逾期</small>` : ''}</td>
        <td>${f.last ? esc(dayWord(f.last) + ' ' + clock(f.last)) : '—'}</td>
        <td><button type="button" class="fid-btn tint" data-master="open" data-id="${esc(entry.site)}">${icon('MessagesSquare')}查看</button>${acts}</td>
      </tr>`;
    }).join('');
    return `<div class="fid-table-scroll" tabindex="0" aria-label="员工总览表格"><table class="fid-table fid-master-table"><thead><tr>${['员工', 'WhatsApp 号码', '客户', '未读会话', '待跟进', '最近消息', '操作'].map(title => `<th scope="col">${title}</th>`).join('')}</tr></thead><tbody>${table}</tbody></table></div>`;
  }

  // ---- accounts: a new supervisor or employee, a new temporary password, an account off or on, deleted ----
  const ROLE = { agent: '员工', supervisor: '主管', admin: '管理员' };
  const PROBLEM = {
    'invalid-username': '登录名需为 3–32 位：小写字母、数字、点、下划线或连字符，并以字母或数字开头。', 'username-taken': '这个登录名已经有人使用。', 'invalid-name': '请填写显示名称（最多 60 个字）。',
    'invalid-password': '密码至少 8 位；留空则生成临时密码。', 'own-account': '不能在这里操作自己的账号。', forbidden: '当前账号不能执行这个操作。', 'unknown-user': '这个账号已不存在，请刷新后再试。',
    'workspace-full': '工作区数量已达上限，无法再启动新的工作区。停用一位员工可以空出位置。', 'workspace-low-memory': '服务器的可用内存不足，暂时无法启动新的工作区。', 'workspace-busy': '这个工作区正在准备中，请稍后再试。',
    'workspace-exists': '这个登录名对应的工作区已经存在，请换一个登录名。', 'workspace-unavailable': '暂时无法创建或启动工作区，请稍后再试。',
  };
  // An employee's sign-in name is the name of the sub-site as well, and has a narrower rule.
  const EMPLOYEE_NAME = '员工的登录名需为 3–32 位：小写字母、数字或连字符，并以字母或数字开头和结尾。';
  const problemText = (answer, role) => (role === 'agent' && answer.body.error === 'invalid-username' ? EMPLOYEE_NAME : PROBLEM[answer.body.error]) || (answer.status === 401 ? '登录已失效，请刷新页面后重新登录。' : '暂时无法完成，请稍后再试。');
  const label = username => {
    const user = state.users.find(candidate => candidate.username === username);
    return user ? `${user.name}（${user.username}）` : username;
  };
  // What can be done with someone else's account. One's own has none, and an administrator's only an administrator.
  // An employee's account (the list's rows carry no role) can be deleted where the platform makes sub-sites:
  // elsewhere their data would stay behind.
  function accountActs(account) {
    if (account.username === state.user.username) return '<span class="fid-master-quiet">当前账号</span>';
    if (account.role === 'admin' && state.user.role !== 'admin') return '<span class="fid-master-quiet">由管理员管理</span>';
    const id = esc(account.username);
    return `<button type="button" class="link" data-master="reset" data-id="${id}">重置密码</button>` + (account.disabled ? `<button type="button" class="link" data-master="enable" data-id="${id}">启用</button>` : `<button type="button" class="link" data-master="disable" data-id="${id}">停用</button>`)
      + ((account.role || 'agent') !== 'agent' || state.provisioned ? `<button type="button" class="link danger" data-master="remove" data-id="${id}">删除</button>` : '');
  }
  function managersHTML() {
    const list = state.users.filter(user => user.role !== 'agent');
    if (state.loading || state.failed || !list.length) return '';
    const body = list.map(user => `<tr><td class="fid-master-who"><strong>${esc(user.name)}</strong><small>${esc(user.username)}</small></td><td>${ROLE[user.role] || ''}</td><td>${user.disabled ? '<span class="fid-master-warn">已停用</span>' : user.mustChangePassword ? '使用临时密码' : '正常'}</td><td><div class="fid-master-acts">${accountActs(user)}</div></td></tr>`).join('');
    return `<h2 class="fid-master-sub">主管与管理员账号</h2><div class="fid-table-scroll" tabindex="0" aria-label="主管与管理员账号表格"><table class="fid-table fid-master-table fid-master-accounts"><thead><tr>${['账号', '类型', '状态', '操作'].map(title => `<th scope="col">${title}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
  }
  function showDialog(title, body, footer) {
    const box = $('#dialog');
    $('#dialog-content').innerHTML = `<div class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-button" data-master="close" aria-label="关闭弹窗">${icon('X')}</button></div><div class="modal-body fid-master-dialog">${body}</div><div class="modal-footer">${footer}</div>`;
    paintIcons(box);
    if (!box.open) box.showModal();
  }
  // A dialog that is closed keeps nothing: a temporary password that was shown in it is gone from the page.
  function closeDialog() {
    if ($('#dialog').open) $('#dialog').close();
    $('#dialog-content').innerHTML = '';
  }
  function say(text) {
    const toast = $('#toast');
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(say.timer);
    say.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  const askFirst = (title, text, word, action, username) => showDialog(title, `<p>${esc(text)}</p>`, `<button type="button" class="fid-btn" data-master="close">取消</button><button type="button" class="fid-btn blue" data-master="${action}" data-id="${esc(username)}">${word}</button>`);
  // The one time a temporary password is shown.
  const secretHTML = password => `<div class="fid-master-secret"><span>临时密码</span><input id="master-secret" readonly value="${esc(password)}" aria-label="临时密码"><button type="button" class="fid-btn" data-master="copy">复制</button></div><p class="fid-master-quiet">临时密码只显示这一次。对方首次登录时需要设置自己的密码。</p>`;
  const DONE = '<button type="button" class="fid-btn blue" data-master="close">完成</button>';
  function createForm(problem = '', values = {}) {
    // Where the platform makes sub-sites the new account is an employee's — with a sub-site and a WhatsApp link
    // of their own — or a supervisor's; elsewhere it is a supervisor's.
    const kind = state.provisioned
      ? `<fieldset class="fid-master-kinds"><legend>类型</legend>
          <label><input type="radio" name="role" value="agent" ${values.role === 'supervisor' ? '' : 'checked'}>员工：独立工作区 + WhatsApp 号码</label>
          <label><input type="radio" name="role" value="supervisor" ${values.role === 'supervisor' ? 'checked' : ''}>主管：只读查看全部员工，并可管理账号</label>
        </fieldset>`
      : '<p class="fid-master-kind">类型：主管（只读查看全部员工，并可管理账号）</p>';
    showDialog('新建账号', `<form id="master-create" class="fid-master-form" novalidate>
        ${kind}
        <label class="field">登录名<input name="username" autocomplete="off" autocapitalize="none" spellcheck="false" value="${esc(values.username)}"></label>
        <label class="field">显示名称<input name="name" autocomplete="off" value="${esc(values.name)}"></label>
        <label class="field">密码<input name="password" type="password" autocomplete="new-password" placeholder="留空则生成临时密码"></label>
        <p class="fid-master-problem" role="alert" ${problem ? '' : 'hidden'}>${esc(problem)}</p>
      </form>`, '<button type="button" class="fid-btn" data-master="close">取消</button><button type="submit" form="master-create" class="fid-btn blue">创建</button>');
    $('#master-create [name="username"]').focus();
  }
  async function createAccount(form) {
    const values = { role: form.elements.role?.value || 'supervisor', username: form.elements.username.value.trim().toLowerCase(), name: form.elements.name.value.trim(), password: form.elements.password.value };
    for (const button of $('#dialog').querySelectorAll('button')) button.disabled = true;
    const answer = await post('/api/auth/users', values);
    if (answer.status !== 200) return createForm(problemText(answer, values.role), values);
    const made = answer.body.user;
    // An employee's sub-site is being made while this is read: the line below it is kept up to date by load.
    showDialog('账号已创建', `<p>登录名：<strong>${esc(made.username)}</strong>（${esc(made.name)}，${ROLE[made.role] || ''}）</p>${answer.body.password ? secretHTML(answer.body.password) : '<p class="fid-master-quiet">请使用刚才填写的密码登录。</p>'}${made.role === 'agent' ? `<p id="master-workspace" data-id="${esc(made.username)}" role="status">${esc(workspaceText('starting'))}</p>` : ''}`, DONE);
    load();
  }
  async function resetAccount(username) {
    const answer = await post('/api/auth/users/reset', { username });
    if (answer.status !== 200) return showDialog('重置密码', `<p>${esc(problemText(answer))}</p>`, DONE);
    showDialog('密码已重置', `<p>登录名：<strong>${esc(username)}</strong></p>${secretHTML(answer.body.password)}`, DONE);
    load();
  }
  // Is this the account whose switching off stops a sub-site: on a platform that makes sub-sites, the last
  // employee of a sub-site who can sign in?
  const stops = username => state.provisioned && state.sites.some(entry => entry.employees.some(employee => employee.username === username) && entry.employees.every(employee => employee.disabled || employee.username === username));
  async function switchAccount(username, on) {
    // Stopping a sub-site can take a moment: the dialog that asked stays, and says so. The answer closes that
    // dialog only — not one that was opened meanwhile.
    const asking = $('#dialog').open ? $('#dialog-content').firstElementChild : null;
    for (const button of $('#dialog').querySelectorAll('button')) button.disabled = true;
    if (!on && $('#dialog [data-master="disableDo"]')) $('#dialog [data-master="disableDo"]').textContent = '正在停用…';
    const answer = await post(on ? '/api/auth/users/enable' : '/api/auth/users/disable', { username });
    if (asking?.isConnected) closeDialog();
    const also = { starting: '，工作区正在启动', stopped: '，工作区已停止', running: '，但工作区没能停止' }[answer.body.workspace] || '';
    say(answer.status === 200 ? (on ? '账号已启用' : '账号已停用') + also : problemText(answer));
    load();
  }
  // Deleting an account: asked first, and the sign-in name is typed to confirm — what is deleted cannot come back.
  // The question says what goes: an employee's workspace with the last account of it.
  function removeForm(username, problem = '') {
    const account = state.users.find(user => user.username === username) || { username, role: 'agent' };
    const shared = state.sites.some(entry => entry.employees.length > 1 && entry.employees.some(employee => employee.username === username));
    const text = account.role !== 'agent' ? `删除「${label(username)}」的账号？账号会被永久删除，无法恢复。`
      : shared ? `删除「${label(username)}」的账号？账号会被永久删除。工作区还有其他员工的账号，会保留。`
        : `删除「${label(username)}」的账号？账号、工作区、WhatsApp 连接（手机上也会退出）以及全部客户和聊天记录都会被永久删除，无法恢复。如需保留数据，请改用「停用」。`;
    showDialog('删除账号', `<form id="master-remove" class="fid-master-form" data-id="${esc(username)}" novalidate>
        <p>${esc(text)}</p>
        <label class="field">请输入登录名「${esc(username)}」以确认<input name="confirm" autocomplete="off" autocapitalize="none" spellcheck="false"></label>
        <p class="fid-master-problem" role="alert" ${problem ? '' : 'hidden'}>${esc(problem)}</p>
      </form>`, '<button type="button" class="fid-btn" data-master="close">取消</button><button type="submit" form="master-remove" class="fid-btn danger">删除</button>');
    $('#master-remove [name="confirm"]').focus();
  }
  const REMOVE_PROBLEM = { 'workspace-busy': '这个工作区正在准备或停止中，请稍后再试。', 'workspace-unavailable': '暂时无法删除工作区，请稍后再试。' };
  async function removeAccount(form) {
    const username = form.dataset.id;
    if (form.elements.confirm.value.trim().toLowerCase() !== username) return removeForm(username, '输入的登录名不一致。');
    // Deleting a workspace takes a moment — its numbers are signed out first: the dialog waits, and says so. The
    // answer closes that dialog only — not one that was opened meanwhile.
    const asking = $('#dialog-content').firstElementChild;
    for (const button of $('#dialog').querySelectorAll('button')) button.disabled = true;
    $('#dialog [type="submit"]').textContent = '正在删除…';
    const answer = await post('/api/auth/users/remove', { username });
    if (!asking.isConnected) say(answer.status === 200 ? '账号已删除' : problemText(answer));
    else if (answer.status !== 200) removeForm(username, REMOVE_PROBLEM[answer.body.error] || problemText(answer));
    else if (answer.body.phone === 'not-signed-out') showDialog('账号已删除', '<p>账号已删除。WhatsApp 号码没能在手机上自动退出：如果这位员工绑定过号码，请在手机 WhatsApp 的「设置 → 已关联的设备」中把它移除。</p>', DONE);
    else {
      closeDialog();
      say('账号已删除');
    }
    load();
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
    const words = state.open.query.trim().toLowerCase().split(/\s+/).filter(Boolean), text = (c.name + ' ' + c.phone).toLowerCase(), digits = String(c.phone ?? '').replace(/\D/g, '');
    return words.every(word => text.includes(word) || (/^\d+$/.test(word) && digits.includes(word)));
  };
  function peopleHTML() {
    const list = ordered(state.open.data.customers).filter(matches);
    if (!list.length) return `<p class="fid-master-note">${state.open.data.customers.length ? '没有匹配的客户' : '这位员工还没有客户'}</p>`;
    return list.map(c => `<button type="button" class="fid-master-row ${c.id === state.open.customer ? 'selected' : ''}" data-master="customer" data-id="${esc(c.id)}" aria-label="查看${esc(c.name)}的会话">
      <span class="avatar ${tone(c)}">${esc(c.initials || [...String(c.name || '')].slice(0, 1).join(''))}</span>
      <span class="fid-master-row-main"><span class="fid-master-row-line"><strong>${esc(c.name)}</strong><time>${esc(lastLabel(c))}</time></span>
      <span class="fid-master-row-line"><span class="fid-master-preview">${esc(c.preview)}</span>${c.unread > 0 ? `<span class="fid-master-unread">${Number(c.unread)}</span>` : ''}</span></span>
    </button>`).join('');
  }
  function chatHTML() {
    const c = selected(), data = state.open.data;
    if (!c) return '<p class="fid-master-note">选择左侧的客户查看会话</p>';
    const number = data.accounts.find(a => a.id === c.account), tags = (Array.isArray(c.tags) ? c.tags : []).map(id => data.tags.find(tag => tag.id === id)?.name).filter(Boolean);
    const tasks = data.tasks.filter(task => task.customer === c.id && !task.done), list = rows(data.messages[c.id]);
    let lastDay = '';
    const messages = list.map(m => {
      const day = messageDay(m), separator = day !== lastDay ? `<div class="fid-master-day">${esc(day)}</div>` : '';
      lastDay = day;
      return `${separator}<div class="fid-master-msg ${m.side === 'out' ? 'out' : ''}"><div class="fid-master-bubble">${mediaHTML(c, m)}${caption(c, m) ? `<div class="fid-master-text">${esc(caption(c, m))}</div>` : ''}${m.translated ? `<div class="fid-master-translation">${icon('Languages')}${esc(m.translated)}</div>` : ''}</div><div class="fid-master-meta"><time>${esc(messageTime(m))}</time>${m.side === 'out' ? mark(m) : ''}</div></div>`;
    }).join('');
    return `<div class="fid-master-chat-head"><button type="button" class="fid-btn fid-master-back" data-master="people" aria-label="返回客户列表">${icon('ArrowLeft')}</button><span class="avatar ${tone(c)}">${esc(c.initials || [...String(c.name || '')].slice(0, 1).join(''))}</span><div><h2>${esc(c.name)}</h2><p>${esc([c.phone, number?.name, c.language].filter(Boolean).join(' · '))}</p></div></div>
      <dl class="fid-master-facts">
        <div><dt>标签</dt><dd>${esc(tags.join('、') || '无')}</dd></div>
        <div><dt>待跟进</dt><dd>${tasks.length ? tasks.map(task => esc(task.title) + (Number.isFinite(Date.parse(task.due)) ? `（${esc(dayOf(Date.parse(task.due)).slice(5))} 到期${Date.parse(task.due) < Date.now() ? '，已逾期' : ''}）` : '')).join('；') : '无'}</dd></div>
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
      // Only what has the expected shape is kept (see rows above).
      const saved = doc.body.data && typeof doc.body.data === 'object' ? doc.body.data : {};
      const data = { accounts: rows(saved.accounts), customers: rows(saved.customers), tasks: rows(saved.tasks), tags: rows(saved.tags), messages: saved.messages && typeof saved.messages === 'object' ? saved.messages : {} };
      state.open.data = data;
      state.open.customer = data.customers.some(c => c.id === keep) ? keep : ordered(data.customers)[0]?.id || '';
    }
    render();
  }
  function siteHTML() {
    const open = state.open;
    const bar = `<div class="fid-master-bar"><button type="button" class="fid-btn" data-master="list">${icon('ArrowLeft')}返回员工总览</button><h1>${esc(open.name)} 的工作区</h1><span class="fid-master-readonly">${icon('LockKeyhole')}只读</span><button type="button" class="fid-btn" data-master="reload">${icon('RefreshCw')}刷新</button><p>这里只能查看：不能发送消息，也不能修改客户资料。每次打开一位员工的工作区，服务器都会记下是谁在查看。</p></div>`;
    if (open.failed) return bar + '<p class="fid-master-note">暂时无法读取这位员工的工作区，请稍后点击「刷新」。</p>';
    if (!open.data) return bar + '<p class="fid-master-note">正在读取…</p>';
    return `${bar}<div class="fid-master-site ${open.chat ? 'chat-open' : ''}">
      <aside class="fid-master-people" aria-label="客户列表"><div class="fid-master-search"><input id="master-search" type="search" placeholder="搜索客户姓名或号码" aria-label="搜索客户" value="${esc(open.query)}"></div><div class="fid-master-list" id="master-list">${guarded(peopleHTML, UNSHOWN)}</div></aside>
      <section class="fid-master-chat" id="master-chat">${guarded(chatHTML, UNSHOWN)}</section>
    </div>`;
  }

  // What stands in the place of a part of the page that cannot be drawn from what a sub-site saved.
  const UNSHOWN = '<p class="fid-master-note">这部分内容暂时无法显示</p>';

  // ---- the page ----
  function render() {
    const root = $('#master');
    root.innerHTML = `<header class="fid-master-top"><div class="fid-sign-in-brand" translate="no"><span class="brand-symbol" data-icon="MessagesSquare"></span><strong>WA Desk SCRM</strong></div><span class="fid-master-title">主管视图</span><span class="fid-master-user">已登录：${esc(state.user.name)}（${esc(state.user.username)}）</span><button type="button" class="fid-btn" data-master="leave">${icon('LogOut')}退出登录</button></header>
      <div class="fid-master-body">${state.open ? siteHTML() : `<div class="fid-master-bar"><h1>员工总览</h1><button type="button" class="fid-btn" data-master="create">${icon('UserRoundPlus')}新建账号</button><button type="button" class="fid-btn" data-master="reload">${icon('RefreshCw')}刷新</button><p>每位员工的号码、客户与待办概况。点击「查看」可以只读方式查看该员工的客户与会话。</p></div>${listHTML()}${managersHTML()}`}</div>`;
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
    $('#master-list').innerHTML = guarded(peopleHTML, UNSHOWN);
    $('#master-chat').innerHTML = guarded(chatHTML, UNSHOWN);
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
      await post('/api/auth/logout', {});
      location.reload();
    },
    create: () => createForm(),
    close: closeDialog,
    copy: () => {
      $('#master-secret').select();
      $('[data-master="copy"]').textContent = document.execCommand('copy') ? '已复制' : '请手动复制';
    },
    reset: username => askFirst('重置密码', `重置「${label(username)}」的密码？对方会被退出登录，需要用新的临时密码重新登录。`, '重置', 'resetDo', username),
    resetDo: resetAccount,
    disable: username => askFirst('停用账号', `停用「${label(username)}」的账号？对方将无法登录，已经登录的页面也会失效。${stops(username) ? '对方的工作区和 WhatsApp 连接会停止，数据保留；重新启用时再启动。' : ''}`, '停用', 'disableDo', username),
    disableDo: username => switchAccount(username, false),
    enable: username => switchAccount(username, true),
    remove: username => removeForm(username),
  };

  window.WA_MASTER = user => {
    const root = $('#master');
    state.user = user;
    root.hidden = false;
    // The dialogs for accounts stand outside the page's own element; their buttons are the page's all the same.
    for (const place of [root, $('#dialog')]) {
      place.addEventListener('click', event => {
        const button = event.target.closest('[data-master]');
        if (button) actions[button.dataset.master](button.dataset.id);
      });
    }
    $('#dialog').addEventListener('submit', event => {
      event.preventDefault();
      if (event.target.id === 'master-create') createAccount(event.target);
      else if (event.target.id === 'master-remove') removeAccount(event.target);
    });
    // The Escape key closes a dialog as its buttons do.
    $('#dialog').addEventListener('close', closeDialog);
    root.addEventListener('input', event => {
      if (event.target.id !== 'master-search') return;
      state.open.query = event.target.value;
      $('#master-list').innerHTML = guarded(peopleHTML, UNSHOWN);
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
