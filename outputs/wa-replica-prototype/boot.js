// Start-up of the page. It asks the server who is signed in, shows the sign-in screen when nobody is, loads
// the sub-site's data, and only then starts the app (window.WA_START, defined by app.js). It also keeps the
// data saved on the server: after every change the app calls WA_SITE.save(data) and the changed parts are sent.
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  // Fields that are maps by customer id; each entry is saved on its own.
  const SPLIT = ['messages', 'activities'];
  const SAVE_DELAY = 400;
  const screen = { title: $('#subsite-login-title'), notice: $('#site-notice'), signIn: $('#site-sign-in'), password: $('#site-password'), leave: $('#site-leave') };

  const request = (path, { method = 'GET', body, keepalive = false } = {}) =>
    fetch(path, { method, keepalive, headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
      .then(async response => ({ status: response.status, body: await response.json().catch(() => ({})) }));

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

  // Shows the screen before the app: a title, an optional notice, and one of the two forms or none.
  function show(title, notice = '', form = null, { leave = false } = {}) {
    $('#app-shell').hidden = true;
    $('.skip-link').hidden = true;
    $('#subsite-login').hidden = false;
    screen.title.textContent = title;
    screen.notice.textContent = notice;
    screen.notice.hidden = !notice;
    screen.signIn.hidden = form !== 'signIn';
    screen.password.hidden = form !== 'password';
    screen.leave.hidden = !leave;
    for (const line of document.querySelectorAll('.fid-sign-in-error')) line.hidden = true;
    for (const input of document.querySelectorAll('#subsite-login input[type="password"]')) input.value = '';
    paintIcons($('#subsite-login'));
    (form ? (form === 'signIn' ? screen.signIn : screen.password).querySelector('input') : screen.title).focus();
  }
  function fail(form, text) {
    const line = form.querySelector('.fid-sign-in-error');
    line.textContent = text;
    line.hidden = false;
  }
  const busy = (form, on) => { form.querySelector('button[type="submit"]').disabled = on; };

  async function begin() {
    let status, me;
    try {
      status = await request('/api/site/status');
      if (status.status !== 200 || !status.body.enabled) return show('服务器尚未启用账号', '服务器没有开启账号与数据存储，请联系管理员。');
      me = await request('/api/auth/session');
    } catch {
      return show('无法连接服务器', '请通过工作台的服务器地址打开本页面；如果服务器正在重启，请稍后刷新。');
    }
    if (me.status !== 200) return show('无法连接服务器', '请稍后刷新重试。');
    if (!me.body.user) return show('登录', '', 'signIn');
    return enter(me.body.user, me.body.site);
  }

  async function enter(user, site) {
    if (user.mustChangePassword) return show('请先修改临时密码', `${user.name}，你正在使用管理员发放的临时密码。设置自己的密码后才能进入工作台。`, 'password', { leave: true });
    if (user.role !== 'agent') return show('主管与管理员入口尚未开放', '查看各员工子站的入口将随主站一起提供。请使用员工账号登录。', null, { leave: true });
    let loaded;
    try {
      loaded = await request('/api/data');
    } catch {
      return show('无法连接服务器', '请稍后刷新重试。');
    }
    if (loaded.status === 403) return show('无法进入这个子站', '当前账号不属于这个子站，请联系管理员。', null, { leave: true });
    if (loaded.status !== 200) return show('无法读取数据', '请稍后刷新重试。', null, { leave: true });
    return start(user, site, loaded.body);
  }

  // One [key, value] per saved part: a whole top-level field, or one entry of a split field.
  function parts(data) {
    const list = [];
    for (const [field, value] of Object.entries(data)) {
      if (SPLIT.includes(field) && value && typeof value === 'object' && !Array.isArray(value)) for (const [id, part] of Object.entries(value)) list.push([field + '/' + id, part]);
      else list.push([field, value]);
    }
    return list;
  }

  function start(user, site, { version, data }) {
    // What the server holds, as text per key; a save sends what differs from it.
    const synced = new Map(parts(data).map(([key, value]) => [key, JSON.stringify(value)]));
    // A new sub-site starts empty. The flags mark the sample content of earlier builds as "already handled",
    // so that nothing fictional is ever added to it.
    if (!Object.keys(data).length) {
      Object.assign(data, {
        presetTagsRemoved: true, lcSeededV06: true, lcSeededOrders: true, lcSeededOrderHistory: true, chatArchiveSeeded: true,
        operations: { assetGroups: [{ id: 'ops-text', type: 'text', name: '常用文本', note: '' }], assets: [] },
      });
    }
    for (const [field, empty] of Object.entries({ version: 1, members: [], accounts: [], tagGroups: [], tags: [], customers: [], messages: {}, activities: {}, tasks: [], quickReplies: [] })) data[field] ??= empty;
    if (!data.members.some(member => member.id === user.username)) data.members.push({ id: user.username, name: user.name, initial: [...user.name].at(-1) || '', role: 'agent', team: '', color: 'jade' });

    let timer = 0, saving = false, pending = null, failures = 0, stopped = false;
    const note = text => {
      const toast = $('#toast');
      toast.textContent = text;
      toast.classList.toggle('show', Boolean(text));
    };
    function stop(title, notice) {
      stopped = true;
      clearTimeout(timer);
      show(title, notice, null, { leave: true });
      screen.leave.textContent = '刷新页面';
      screen.leave.dataset.reload = '1';
    }
    async function flush({ keepalive = false } = {}) {
      clearTimeout(timer);
      timer = 0;
      if (saving || stopped || !pending) return;
      const current = new Map(parts(pending).map(([key, value]) => [key, JSON.stringify(value)]));
      const set = {}, remove = [...synced.keys()].filter(key => !current.has(key));
      for (const [key, json] of current) if (synced.get(key) !== json) set[key] = JSON.parse(json);
      pending = null;
      if (!Object.keys(set).length && !remove.length) return;
      saving = true;
      let answer;
      try {
        answer = await request('/api/data', { method: 'PUT', keepalive, body: { baseVersion: version, set, remove } });
      } catch {
        answer = { status: 0, body: {} };
      }
      saving = false;
      if (answer.status === 200) {
        version = answer.body.version;
        for (const key of Object.keys(set)) synced.set(key, current.get(key));
        for (const key of remove) synced.delete(key);
        if (failures) note('');
        failures = 0;
        if (pending) timer = setTimeout(flush, SAVE_DELAY);
      } else if (answer.status === 409) {
        stop('数据已在别处更新', '这个子站的数据刚刚在另一个页面或设备上被修改。请刷新后继续；本页最近一次修改没有保存。');
      } else if (answer.status === 401) {
        stop('登录已失效', '请刷新页面后重新登录；本页最近一次修改没有保存。');
      } else {
        // The server could not be reached or had trouble: keep the changes and try again, more slowly each time.
        pending ??= window.WA_SITE.data;
        failures += 1;
        note('修改暂未保存到服务器，正在重试…');
        timer = setTimeout(flush, Math.min(30000, 1000 * 2 ** failures));
      }
    }
    function save(data) {
      if (stopped) return;
      pending = data;
      clearTimeout(timer);
      timer = setTimeout(flush, SAVE_DELAY);
    }
    // Resolves when everything is saved (used before signing out, and by tests).
    const idle = () => new Promise(resolve => {
      const check = () => (stopped || (!timer && !saving && !pending) ? resolve() : setTimeout(check, 50));
      check();
    });
    async function signOut() {
      await flush();
      await idle();
      await request('/api/auth/logout', { method: 'POST', body: {} }).catch(() => {});
      location.reload();
    }
    addEventListener('pagehide', () => { flush({ keepalive: true }); });

    window.WA_SITE = { user, site, data, save, idle, signOut };
    $('#subsite-login').hidden = true;
    $('#app-shell').hidden = false;
    $('.skip-link').hidden = false;
    $('.fid-sign-out').title = `已登录：${user.name}（${user.username}）`;
    window.WA_START();
    // A new sub-site, or one with a new member entry, is saved right away.
    save(data);
  }

  screen.signIn.addEventListener('submit', async event => {
    event.preventDefault();
    const form = screen.signIn, username = form.elements.username.value.trim(), password = form.elements.password.value;
    if (!username || !password) return fail(form, '请输入用户名和密码。');
    busy(form, true);
    let answer;
    try {
      answer = await request('/api/auth/login', { method: 'POST', body: { username, password } });
    } catch {
      answer = { status: 0, body: {} };
    }
    busy(form, false);
    if (answer.status === 200) return begin();
    form.elements.password.value = '';
    form.elements.password.focus();
    if (answer.status === 429) return fail(form, `尝试次数过多，请 ${Math.max(1, Math.ceil((answer.body.retryAfter || 60) / 60))} 分钟后再试。`);
    if (answer.status === 401) return fail(form, '用户名或密码不正确。');
    return fail(form, '暂时无法登录，请稍后再试。');
  });

  screen.password.addEventListener('submit', async event => {
    event.preventDefault();
    const form = screen.password, current = form.elements.current.value, next = form.elements.next.value;
    if (next.length < 10) return fail(form, '新密码至少 10 位。');
    if (next !== form.elements.repeat.value) return fail(form, '两次输入的新密码不一致。');
    busy(form, true);
    let answer;
    try {
      answer = await request('/api/auth/password', { method: 'POST', body: { current, next } });
    } catch {
      answer = { status: 0, body: {} };
    }
    busy(form, false);
    if (answer.status === 200) return begin();
    if (answer.status === 401) return fail(form, '当前密码不正确。');
    if (answer.status === 400) return fail(form, '新密码至少 10 位，且不能与当前密码相同。');
    return fail(form, '暂时无法修改密码，请稍后再试。');
  });

  screen.leave.addEventListener('click', async () => {
    if (!screen.leave.dataset.reload) await request('/api/auth/logout', { method: 'POST', body: {} }).catch(() => {});
    location.reload();
  });

  begin();
})();
