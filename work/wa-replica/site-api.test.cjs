// Tests of the accounts, the sessions and the data store of a sub-site.
// Run with Node 22.13 or newer:  node --test work/wa-replica/site-api.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const siteApi = require('./site-api.cjs');
const { PASSWORD_MIN, SESSION_IDLE_MS, SESSION_MAX_MS, LOCK_MS } = require('./site-auth.cjs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-scrm-site-'));
let clock = Date.parse('2026-11-21T08:00:00Z');
const site = siteApi.create({ dir: path.join(tmp, 'main'), siteId: 's1', now: () => clock });
const server = http.createServer((req, res) => site.handle(req, res, new URL(req.url, 'http://localhost').pathname));
let port;
const PASSWORD = 'correct horse battery';
const logged = [];
for (const level of ['log', 'error']) {
  const original = console[level];
  console[level] = (...args) => { logged.push(args.join(' ')); if (!String(args[0]).startsWith('site ')) original(...args); };
}

const call = (pathname, { method = 'GET', body, cookie, headers = {}, base = `http://127.0.0.1:${port}` } = {}) =>
  fetch(base + pathname, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) })
    .then(async response => ({ status: response.status, setCookie: response.headers.get('set-cookie') || '', cookies: response.headers.getSetCookie(), retryAfter: response.headers.get('retry-after'), raw: await response.text() }))
    .then(result => ({ ...result, json: JSON.parse(result.raw) }));
const cookieOf = response => response.setCookie.split(';')[0];
// Creates an account whose password is already its owner's, and signs it in.
async function member(username, role, siteId) {
  const { password } = await site.auth.createUser({ username, role, name: username + ' name', site: siteId });
  const first = await call('/api/auth/login', { method: 'POST', body: { username, password } });
  assert.equal(first.status, 200);
  const changed = await call('/api/auth/password', { method: 'POST', cookie: cookieOf(first), body: { current: password, next: PASSWORD } });
  assert.equal(changed.status, 200);
  return cookieOf(first);
}

test.before(() => new Promise(resolve => server.listen(0, '127.0.0.1', () => { port = server.address().port; resolve(); })));
test.after(() => {
  server.closeAllConnections(); server.close(); site.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('status: the sub-site answers without sign-in', async () => {
  const status = await call('/api/site/status');
  assert.deepEqual([status.status, status.json], [200, { enabled: true, site: 's1' }]);
});

test('accounts: rules for names, roles and passwords; the password is not stored', async () => {
  const add = fields => site.auth.createUser({ username: 'rules', role: 'agent', name: 'Rules', site: 's1', ...fields });
  await assert.rejects(add({ username: 'ab' }), { code: 'invalid-username' });
  await assert.rejects(add({ username: 'Has Space' }), { code: 'invalid-username' });
  await assert.rejects(add({ role: 'owner' }), { code: 'invalid-role' });
  await assert.rejects(add({ site: null }), { code: 'site-required' });
  await assert.rejects(add({ name: '  ' }), { code: 'invalid-name' });
  await assert.rejects(add({ password: 'short' }), { code: 'invalid-password' });
  // eight characters are the least; the page says the same number
  assert.equal(PASSWORD_MIN, 8);
  await assert.rejects(add({ password: '1234567' }), { code: 'invalid-password' });
  assert.equal((await add({ username: 'eight', password: '12345678' })).user.username, 'eight');
  const created = await add({ username: ' Rules ' });
  assert.equal(created.user.username, 'rules');
  assert.equal(created.user.mustChangePassword, true);
  assert.match(created.password, /^[a-zA-Z2-9]{16}$/);
  await assert.rejects(add({ username: 'RULES' }), { code: 'username-taken' });
  const supervisor = await site.auth.createUser({ username: 'boss', role: 'supervisor', name: 'Boss', site: 's1' });
  assert.equal(supervisor.user.site, null, 'only an agent belongs to a sub-site');
  assert(!JSON.stringify(site.auth.listUsers()).includes('scrypt'), 'the list of accounts carries no password hash');
  const stored = fs.readFileSync(path.join(tmp, 'main', 'auth.db')).toString('latin1') + (fs.existsSync(path.join(tmp, 'main', 'auth.db-wal')) ? fs.readFileSync(path.join(tmp, 'main', 'auth.db-wal')).toString('latin1') : '');
  assert(!stored.includes(created.password) && stored.includes('scrypt$16384$8$1$'), 'the database holds a hash, not the password');
});

test('sign-in: a wrong password and an unknown account get the same answer; the cookie is HttpOnly; me returns the user', async () => {
  const { password } = await site.auth.createUser({ username: 'ana', role: 'agent', name: 'Ana', site: 's1' });
  const wrong = await call('/api/auth/login', { method: 'POST', body: { username: 'ana', password: 'not the password' } });
  const unknown = await call('/api/auth/login', { method: 'POST', body: { username: 'nobody', password: 'not the password' } });
  assert.deepEqual([wrong.status, wrong.json], [401, { error: 'invalid-credentials' }]);
  assert.deepEqual([unknown.status, unknown.json], [401, { error: 'invalid-credentials' }]);
  assert.equal(wrong.setCookie, '');
  const ok = await call('/api/auth/login', { method: 'POST', body: { username: ' ANA ', password } });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.json.user, { id: ok.json.user.id, username: 'ana', name: 'Ana', role: 'agent', site: 's1', mustChangePassword: true, disabled: false });
  assert.equal(ok.cookies.length, 2);
  assert.match(ok.cookies[0], /^scrm_sid=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000$/);
  assert.equal(ok.cookies[1], 'scrm_site=s1; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000', 'the second cookie names the employee\'s sub-site');
  const https = await call('/api/auth/login', { method: 'POST', body: { username: 'ana', password }, headers: { 'X-Forwarded-Proto': 'https' } });
  assert(https.cookies.length === 2 && https.cookies.every(cookie => cookie.endsWith('; Secure')), 'Secure when the request came over HTTPS');
  assert(!ok.raw.includes(password) && !ok.raw.includes('scrypt'));
  const me = await call('/api/auth/me', { cookie: cookieOf(ok) });
  assert.deepEqual([me.status, me.json.user.username, me.json.site], [200, 'ana', 's1']);
  assert.deepEqual((await call('/api/auth/me')).json, { error: 'not-signed-in' });
  assert.deepEqual([(await call('/api/auth/session')).status, (await call('/api/auth/session')).json], [200, { user: null, site: 's1' }], 'the page can ask without an error');
  assert.equal((await call('/api/auth/session', { cookie: cookieOf(ok) })).json.user.username, 'ana');
  assert.equal((await call('/api/auth/session', { cookie: 'scrm_sid=forged' })).json.user, null);
  assert.equal((await call('/api/auth/me', { cookie: 'scrm_sid=forged' })).status, 401);
  assert.equal((await call('/api/auth/login', { method: 'POST', body: 'username=ana', headers: { 'Content-Type': 'text/plain' } })).status, 400);
});

test('a temporary password must be changed first; the change ends the other sessions', async () => {
  const { password } = await site.auth.createUser({ username: 'ben', role: 'agent', name: 'Ben', site: 's1' });
  const one = cookieOf(await call('/api/auth/login', { method: 'POST', body: { username: 'ben', password } }));
  const two = cookieOf(await call('/api/auth/login', { method: 'POST', body: { username: 'ben', password } }));
  assert.deepEqual((await call('/api/data', { cookie: one })).json, { error: 'password-change-required' });
  assert.equal((await call('/api/data', { method: 'PUT', cookie: one, body: { baseVersion: 0, set: { a: 1 } } })).status, 403);
  const change = body => call('/api/auth/password', { method: 'POST', cookie: one, body });
  assert.deepEqual([(await change({ current: 'wrong password!', next: PASSWORD })).status, (await change({ current: password, next: 'short' })).json.error, (await change({ current: password, next: password })).json.error], [401, 'invalid-password', 'invalid-password']);
  const changed = await change({ current: password, next: PASSWORD });
  assert.deepEqual([changed.status, changed.json.user.mustChangePassword], [200, false]);
  assert.equal((await call('/api/data', { cookie: one })).status, 200, 'the session that changed the password stays');
  assert.equal((await call('/api/auth/me', { cookie: two })).status, 401, 'the other session ended');
  assert.equal((await call('/api/auth/login', { method: 'POST', body: { username: 'ben', password } })).status, 401, 'the temporary password no longer works');
  assert.equal((await call('/api/auth/password', { method: 'POST', body: { current: PASSWORD, next: PASSWORD + '!' } })).status, 401, 'not without a session');
});

test('five failed sign-ins lock the account for five minutes, also for the right password', async () => {
  await member('cleo', 'agent', 's1');
  const attempt = password => call('/api/auth/login', { method: 'POST', body: { username: 'cleo', password } });
  for (let i = 0; i < 5; i++) assert.equal((await attempt('wrong password ' + i)).status, 401);
  const locked = await attempt(PASSWORD);
  assert.deepEqual([locked.status, locked.json, locked.retryAfter], [429, { error: 'too-many-attempts', retryAfter: 300 }, '300']);
  clock += LOCK_MS - 1000;
  assert.equal((await attempt(PASSWORD)).status, 429);
  clock += 2000;
  assert.equal((await attempt(PASSWORD)).status, 200);
  for (let i = 0; i < 4; i++) await attempt('wrong again ' + i);
  assert.equal((await attempt(PASSWORD)).status, 200, 'a success clears the count');
});

test('sessions end: after seven idle days, after thirty days, on sign-out, when the account is disabled or reset', async () => {
  const idle = await member('dana', 'agent', 's1');
  clock += SESSION_IDLE_MS - 60000;
  assert.equal((await call('/api/auth/me', { cookie: idle })).status, 200, 'used within seven days: still valid');
  clock += SESSION_IDLE_MS + 1000;
  assert.equal((await call('/api/auth/me', { cookie: idle })).status, 401, 'seven idle days');
  const long = cookieOf(await call('/api/auth/login', { method: 'POST', body: { username: 'dana', password: PASSWORD } }));
  for (let day = 0; day < 29; day += 5) { clock += 5 * 24 * 60 * 60 * 1000; assert.equal((await call('/api/auth/me', { cookie: long })).status, 200, 'day ' + (day + 5)); }
  clock += SESSION_MAX_MS - 29 * 24 * 60 * 60 * 1000;
  assert.equal((await call('/api/auth/me', { cookie: long })).status, 401, 'thirty days at most');
  const out = cookieOf(await call('/api/auth/login', { method: 'POST', body: { username: 'dana', password: PASSWORD } }));
  const signedOut = await call('/api/auth/logout', { method: 'POST', cookie: out, body: {} });
  assert.deepEqual(signedOut.cookies, ['scrm_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0', 'scrm_site=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0']);
  assert.equal((await call('/api/auth/me', { cookie: out })).status, 401);
  const disabled = cookieOf(await call('/api/auth/login', { method: 'POST', body: { username: 'dana', password: PASSWORD } }));
  site.auth.setDisabled('dana', true);
  assert.equal((await call('/api/auth/me', { cookie: disabled })).status, 401);
  assert.equal((await call('/api/auth/login', { method: 'POST', body: { username: 'dana', password: PASSWORD } })).status, 401, 'a disabled account cannot sign in');
  site.auth.setDisabled('dana', false);
  const reset = cookieOf(await call('/api/auth/login', { method: 'POST', body: { username: 'dana', password: PASSWORD } }));
  const { password } = await site.auth.resetPassword('dana');
  assert.equal((await call('/api/auth/me', { cookie: reset })).status, 401, 'a reset ends the sessions');
  assert.equal((await call('/api/auth/login', { method: 'POST', body: { username: 'dana', password } })).json.user.mustChangePassword, true);
});

test('data: saved by key with a version; a save based on an old version is refused; split fields are put together', async () => {
  const cookie = await member('eli', 'agent', 's1');
  const put = body => call('/api/data', { method: 'PUT', cookie, body });
  assert.deepEqual((await call('/api/data', { cookie })).json, { version: 0, data: {} });
  const first = await put({ baseVersion: 0, set: { customers: [{ id: 'c1', name: '张伟' }], 'messages/c1': [{ id: 'm1', text: 'Hola' }], 'messages/c2': [], settings: { tone: 'casual' } } });
  assert.deepEqual([first.status, first.json], [200, { version: 1 }]);
  assert.deepEqual((await call('/api/data', { cookie })).json, { version: 1, data: { customers: [{ id: 'c1', name: '张伟' }], messages: { c1: [{ id: 'm1', text: 'Hola' }], c2: [] }, settings: { tone: 'casual' } } });
  const stale = await put({ baseVersion: 0, set: { customers: [] } });
  assert.deepEqual([stale.status, stale.json], [409, { error: 'version-conflict', version: 1 }]);
  assert.equal((await call('/api/data', { cookie })).json.data.customers.length, 1, 'a refused save changes nothing');
  assert.deepEqual((await put({ baseVersion: 1, set: { 'messages/c1': [{ id: 'm1', text: 'Hola' }, { id: 'm2', text: 'Gracias' }] }, remove: ['messages/c2', 'settings'] })).json, { version: 2 });
  assert.deepEqual((await call('/api/data', { cookie })).json.data, { customers: [{ id: 'c1', name: '张伟' }], messages: { c1: [{ id: 'm1', text: 'Hola' }, { id: 'm2', text: 'Gracias' }] } });
  assert.deepEqual((await put({ baseVersion: 2, set: { 'customers/c9': {} } })).json, { error: 'key-conflict' }, 'a list cannot be saved in parts');
  assert.deepEqual((await put({ baseVersion: 2, set: { messages: {} } })).json, { version: 3 }, 'a whole value replaces the parts');
  assert.deepEqual((await call('/api/data', { cookie })).json.data.messages, {});
  assert.deepEqual((await put({ baseVersion: 3, remove: ['messages'] })).json, { version: 4 });
  assert.equal('messages' in (await call('/api/data', { cookie })).json.data, false);
  // a map that was saved whole is split when one of its parts is saved or removed
  assert.deepEqual((await put({ baseVersion: 4, set: { activities: { c1: ['a'], c2: ['b'], c3: ['c'] } } })).json, { version: 5 });
  assert.deepEqual((await put({ baseVersion: 5, set: { 'activities/c2': ['b', 'b2'] } })).json, { version: 6 });
  assert.deepEqual((await put({ baseVersion: 6, remove: ['activities/c3'] })).json, { version: 7 });
  assert.deepEqual((await call('/api/data', { cookie })).json.data.activities, { c1: ['a'], c2: ['b', 'b2'] });
  assert.deepEqual((await put({ baseVersion: 7, set: { odd: { 'not a key': 1 } } })).json, { version: 8 });
  assert.deepEqual((await put({ baseVersion: 8, set: { 'odd/x': 1 } })).json, { error: 'key-conflict' }, 'entry names that cannot be keys keep the field whole');
  assert.deepEqual((await put({ baseVersion: 8, remove: ['odd', 'activities'] })).json, { version: 9 });
  assert.deepEqual(site.data.lastSaves(2).map(save => [save.version, save.by, save.keys]), [[9, 'eli', 'odd activities'], [8, 'eli', 'odd']]);
});

test('data: the price list can be taken out for good — its rows, its name in the log of saves and what it left in the files; only the sub-site\'s employee may, and only for a field meant for it', async () => {
  const cookie = await member('kai', 'agent', 's1');
  const send = (method, body, options = {}) => call('/api/data', { method, cookie, body, ...options });
  const files = () => ['', '-wal', '-shm'].map(ending => path.join(tmp, 'main', 'site-s1.db' + ending)).filter(file => fs.existsSync(file)).map(file => fs.readFileSync(file).toString('latin1')).join('');
  const start = (await call('/api/data', { cookie })).json.version;
  // a list is saved, then replaced by another in a save that also changes something else
  assert.deepEqual((await send('PUT', { baseVersion: start, set: { priceList: { file: 'prices-FIRST-7781.xlsx', rows: [['PRICE-MARK-ALPHA-7781', 40]] } } })).json, { version: start + 1 });
  assert.deepEqual((await send('PUT', { baseVersion: start + 1, set: { priceList: { file: 'prices-SECOND-7782.xlsx', rows: [['PRICE-MARK-BETA-7782', 55]] }, keep: 'stays' } })).json, { version: start + 2 });
  assert(files().includes('PRICE-MARK-BETA-7782') && files().includes('priceList'), 'before: the list is in the files');
  assert.deepEqual(site.data.lastSaves(2).map(save => save.keys), ['priceList keep', 'priceList']);
  // a removal based on an old version is refused and changes nothing
  assert.deepEqual((await send('DELETE', { baseVersion: start, field: 'priceList' })).json, { error: 'version-conflict', version: start + 2 });
  assert.equal((await call('/api/data', { cookie })).json.data.priceList.rows.length, 1);
  // taken out: gone from the data, the rest untouched, and the version moves on
  const purged = await send('DELETE', { baseVersion: start + 2, field: 'priceList' });
  assert.deepEqual([purged.status, purged.json], [200, { version: start + 3 }]);
  const after = (await call('/api/data', { cookie })).json;
  assert.deepEqual([after.version, 'priceList' in after.data, after.data.keep], [start + 3, false, 'stays']);
  // the log of saves: the entry that named only the list is gone, the other one no longer names it, the removal names nothing
  const log = site.data.lastSaves(10000);
  assert.deepEqual(log.slice(0, 2).map(save => [save.version, save.by, save.keys]), [[start + 3, 'kai', ''], [start + 2, 'kai', 'keep']]);
  assert.deepEqual([log.some(save => save.version === start + 1), log.some(save => save.keys.includes('priceList'))], [false, false]);
  // the files: neither list, neither file name, not even the name of the field
  for (const word of ['PRICE-MARK-ALPHA-7781', 'PRICE-MARK-BETA-7782', 'prices-FIRST-7781', 'prices-SECOND-7782', 'priceList']) assert.equal(files().includes(word), false, word + ' is still in the files');
  assert(files().includes('stays'), 'what was kept is still there');
  // once more with nothing to remove: fine; and saving goes on
  assert.deepEqual((await send('DELETE', { baseVersion: start + 3, field: 'priceList' })).json, { version: start + 4 });
  assert.deepEqual((await send('PUT', { baseVersion: start + 4, set: { keep: 'changed' }, remove: [] })).json, { version: start + 5 });
  // only a field that is meant for it, in a well-formed request
  for (const body of [{ baseVersion: start + 5, field: 'customers' }, { baseVersion: start + 5, field: 'keep' }, { baseVersion: start + 5, field: 'priceList/1' }, { baseVersion: start + 5, field: 5 }, { baseVersion: start + 5 }, { baseVersion: 'x', field: 'priceList' }, { field: 'priceList' }]) {
    assert.deepEqual((await send('DELETE', body)).json, { error: 'invalid-request' }, JSON.stringify(body));
  }
  // only the sub-site's employee
  const supervisor = await member('lea', 'supervisor'), other = await member('max', 'agent', 's2');
  assert.deepEqual((await send('DELETE', { baseVersion: start + 5, field: 'priceList' }, { cookie: supervisor })).json, { error: 'read-only' });
  assert.deepEqual((await send('DELETE', { baseVersion: start + 5, field: 'priceList' }, { cookie: other })).json, { error: 'forbidden' });
  assert.equal((await send('DELETE', { baseVersion: start + 5, field: 'priceList' }, { cookie: '' })).status, 401);
  assert.equal((await send('DELETE', { baseVersion: start + 5, field: 'priceList' }, { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.deepEqual([(await call('/api/data', { cookie })).json.version, (await call('/api/data', { cookie })).json.data.keep], [start + 5, 'changed'], 'the refused requests changed nothing');
  // nothing of a removal is written to the server's log
  assert.equal(logged.some(line => /purge|priceList|price/i.test(line)), false);
});

test('data: malformed saves are refused and change nothing', async () => {
  const cookie = await member('finn', 'agent', 's1');
  const version = (await call('/api/data', { cookie })).json.version;
  const refused = async (body, status, error, headers) => { const r = await call('/api/data', { method: 'PUT', cookie, body, headers }); assert.deepEqual([r.status, r.json.error], [status, error], JSON.stringify(body).slice(0, 80)); };
  await refused({ set: { a: 1 } }, 400, 'invalid-request');
  await refused({ baseVersion: String(version), set: { a: 1 } }, 400, 'invalid-request');
  await refused({ baseVersion: version }, 400, 'invalid-request');
  await refused({ baseVersion: version, set: [] }, 400, 'invalid-request');
  await refused({ baseVersion: version, set: { 'bad key': 1 } }, 400, 'invalid-request');
  await refused({ baseVersion: version, set: { 'a/b/c': 1 } }, 400, 'invalid-request');
  await refused({ baseVersion: version, set: { '../x': 1 } }, 400, 'invalid-request');
  await refused({ baseVersion: version, set: { a: 1 }, remove: ['a'] }, 400, 'invalid-request');
  await refused({ baseVersion: version, set: { a: 1 }, remove: 'a' }, 400, 'invalid-request');
  await refused({ baseVersion: version, set: { big: 'x'.repeat(2 * 1024 * 1024) } }, 413, 'too-long');
  await refused('[1]', 400, 'invalid-request');
  await refused('not json', 400, 'invalid-request');
  await refused('{"baseVersion":0,"set":{"a":1}}', 400, 'invalid-request', { 'Content-Type': 'text/plain' });
  assert.equal((await call('/api/data', { cookie })).json.version, version);
});

test('access: only the sub-site\'s own employee writes; supervisors and administrators read; others are refused', async () => {
  const owner = await member('gus', 'agent', 's1');
  const other = await member('hana', 'agent', 's2');
  const supervisor = await member('ivo', 'supervisor');
  const admin = await member('joy', 'admin');
  const version = (await call('/api/data', { cookie: owner })).json.version;
  assert.equal((await call('/api/data', { method: 'PUT', cookie: owner, body: { baseVersion: version, set: { note: 'mine' } } })).status, 200);
  for (const cookie of [supervisor, admin]) {
    assert.equal((await call('/api/data', { cookie })).json.data.note, 'mine');
    assert.deepEqual((await call('/api/data', { method: 'PUT', cookie, body: { baseVersion: version + 1, set: { note: 'changed' } } })).json, { error: 'read-only' });
  }
  assert.deepEqual((await call('/api/data', { cookie: other })).json, { error: 'forbidden' });
  assert.deepEqual((await call('/api/data', { method: 'PUT', cookie: other, body: { baseVersion: version + 1, set: { note: 'x' } } })).json, { error: 'forbidden' });
  assert.equal((await call('/api/data')).status, 401);
  assert.equal((await call('/api/data', { cookie: owner })).json.data.note, 'mine');
  const crossSite = await call('/api/data', { method: 'PUT', cookie: owner, body: { baseVersion: version + 1, set: { note: 'x' } }, headers: { 'Sec-Fetch-Site': 'cross-site' } });
  assert.deepEqual([crossSite.status, crossSite.json], [403, { error: 'forbidden' }]);
  assert.equal((await call('/api/data', { method: 'PATCH', cookie: owner })).status, 405);
  assert.equal((await call('/api/auth/unknown')).status, 404);
});

test('several sub-sites on one set of accounts: signing in names the employee\'s sub-site; each sub-site checks the session itself; a write to the accounts waits for another server', async () => {
  // a second sub-site: its own server on the same data folder
  const second = siteApi.create({ dir: path.join(tmp, 'main'), siteId: 's2', now: () => clock });
  const secondServer = http.createServer((req, res) => second.handle(req, res, new URL(req.url, 'http://localhost').pathname));
  await new Promise(resolve => secondServer.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${secondServer.address().port}`;
  const names = site => `scrm_site=${site}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`;
  try {
    // an employee of the second sub-site signs in at the first: the second cookie names their own
    const { password } = await site.auth.createUser({ username: 'nora', role: 'agent', name: 'Nora', site: 's2' });
    const first = await call('/api/auth/login', { method: 'POST', body: { username: 'nora', password } });
    assert.equal(first.cookies[1], names('s2'));
    const nora = cookieOf(first);
    assert.equal((await call('/api/auth/password', { method: 'POST', cookie: nora, body: { current: password, next: PASSWORD } })).status, 200);
    // the session holds at both; the data of a sub-site is for its own employee
    assert.deepEqual([(await call('/api/auth/session', { cookie: nora })).json.site, (await call('/api/auth/session', { cookie: nora, base })).json.site], ['s1', 's2']);
    assert.deepEqual([(await call('/api/data', { cookie: nora })).json, (await call('/api/data', { cookie: nora, base })).json], [{ error: 'forbidden' }, { version: 0, data: {} }]);
    assert.deepEqual((await call('/api/data', { method: 'PUT', cookie: nora, base, body: { baseVersion: 0, set: { note: 'of s2' } } })).json, { version: 1 });
    const gus = cookieOf(await call('/api/auth/login', { method: 'POST', body: { username: 'gus', password: PASSWORD } }));
    assert.deepEqual([(await call('/api/data', { cookie: gus, base })).json, (await call('/api/data', { cookie: gus })).json.data.note], [{ error: 'forbidden' }, 'mine']);
    // a supervisor reads both and writes neither; signing in as one takes the cookie away
    const boss = await call('/api/auth/login', { method: 'POST', body: { username: 'ivo', password: PASSWORD } });
    assert.equal(boss.cookies[1], 'scrm_site=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    assert.deepEqual([(await call('/api/data', { cookie: cookieOf(boss) })).json.data.note, (await call('/api/data', { cookie: cookieOf(boss), base })).json.data.note], ['mine', 'of s2']);
    assert.deepEqual((await call('/api/data', { method: 'PUT', cookie: cookieOf(boss), base, body: { baseVersion: 1, set: { note: 'x' } } })).json, { error: 'read-only' });
    // asking who is signed in gives an employee the cookie again when it is gone or names another sub-site — only then
    const asked = cookie => call('/api/auth/session', { cookie }).then(answer => answer.cookies);
    assert.deepEqual(await asked(nora), [names('s2')]);
    assert.deepEqual(await asked(nora + '; scrm_site=s1'), [names('s2')]);
    assert.deepEqual(await asked(nora + '; scrm_site=s2'), []);
    assert.deepEqual(await asked(cookieOf(boss) + '; scrm_site=s2'), [], 'a supervisor\'s is left as it is');
    assert.deepEqual(await asked('scrm_site=s2'), [], 'nobody is signed in');
    assert.deepEqual((await call('/api/auth/session', { cookie: nora, headers: { 'X-Forwarded-Proto': 'https' } })).cookies, [names('s2') + '; Secure']);
    // signing out at one sub-site ends the session at the other
    assert.equal((await call('/api/auth/logout', { method: 'POST', cookie: nora, base, body: {} })).status, 200);
    assert.equal((await call('/api/auth/me', { cookie: nora })).status, 401);
    // another server (or the administration tool) is in the middle of a write to the accounts: a write here waits for it
    const accounts = path.join(tmp, 'main', 'auth.db');
    const holder = spawn(process.execPath, ['-e', "const { DatabaseSync } = require('node:sqlite'); const db = new DatabaseSync(process.argv[1]); db.exec('BEGIN IMMEDIATE'); console.log('held'); setTimeout(() => { db.exec('COMMIT'); db.close(); }, 1500);", accounts], { stdio: ['ignore', 'pipe', 'ignore'] });
    await new Promise(resolve => holder.stdout.once('data', resolve));
    const probe = new (require('node:sqlite').DatabaseSync)(accounts);
    assert.throws(() => probe.exec('BEGIN IMMEDIATE'), /locked/, 'the other writer holds the file at this moment');
    probe.close();
    assert.equal((await site.auth.createUser({ username: 'waits', role: 'agent', name: 'Waits', site: 's1' })).user.username, 'waits');
    await new Promise(resolve => holder.once('exit', resolve));
  } finally {
    secondServer.closeAllConnections(); secondServer.close(); second.close();
  }
});

test('the log names users and outcomes, never a password, a token or data', () => {
  const lines = logged.filter(line => line.startsWith('site '));
  assert(lines.some(line => line === 'site login ok user=ana') && lines.some(line => line === 'site login failed error=invalid-credentials') && lines.some(line => line === 'site password changed user=ben'), lines.slice(0, 8).join('\n'));
  const all = logged.join('\n');
  for (const secret of [PASSWORD, 'scrm_sid', '张伟', 'Gracias', 'wrong password']) assert(!all.includes(secret), secret);
});

test('administration tool: creates an account with a temporary password, lists, resets, disables; exports and imports the data', async () => {
  const dir = path.join(tmp, 'cli');
  const run = (...args) => spawnSync(process.execPath, [path.join(__dirname, 'site-admin.cjs'), ...args], { env: { ...process.env, WA_SCRM_DATA_DIR: dir, WA_SCRM_SITE_ID: 'shop' }, encoding: 'utf8' });
  const added = run('user', 'add', 'kim', 'agent', 'Kim', 'Lee');
  assert.equal(added.status, 0, added.stderr);
  const password = added.stdout.match(/^temporary password: ([a-zA-Z2-9]{16})$/m)?.[1];
  assert(password && added.stdout.startsWith('created kim (agent, sub-site shop)\n'), added.stdout);
  assert.equal(run('user', 'add', 'kim', 'agent', 'Again').stderr.trim(), 'site-admin: username-taken');
  assert.equal(run('user', 'add', 'lead', 'supervisor', 'Lead').status, 0);
  assert.deepEqual(run('user', 'list').stdout.trim().split('\n'), ['kim\tagent\tshop\tactive\ttemporary password\tKim Lee', 'lead\tsupervisor\t-\tactive\ttemporary password\tLead']);
  const other = siteApi.create({ dir, siteId: 'shop' });
  try {
    assert.equal((await other.auth.signIn('kim', password)).user.site, 'shop');
    other.data.write({ baseVersion: 0, set: { customers: [{ id: 'c1' }], 'messages/c1': [{ text: 'hi' }] }, by: 'kim' });
  } finally {
    other.close();
  }
  const reset = run('user', 'reset', 'kim');
  assert.match(reset.stdout, /^password of kim was reset\ntemporary password: [a-zA-Z2-9]{16}\n$/);
  assert(!reset.stdout.includes(password));
  assert.equal(run('user', 'disable', 'kim').stdout.trim(), 'kim is disabled');
  assert.equal(run('user', 'enable', 'kim').stdout.trim(), 'kim is enabled');
  assert.equal(run('user', 'reset', 'ghost').stderr.trim(), 'site-admin: unknown-user');
  const file = path.join(tmp, 'export.json');
  assert.equal(run('data', 'export', file).stdout.trim(), `exported version 1 of sub-site shop to ${file}`);
  const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(exported, { version: 1, data: { customers: [{ id: 'c1' }], messages: { c1: [{ text: 'hi' }] } } });
  exported.data.customers.push({ id: 'c2' });
  fs.writeFileSync(file, JSON.stringify(exported));
  assert.equal(run('data', 'import', file).stdout.trim(), `imported ${file} into sub-site shop as version 2`);
  const again = siteApi.create({ dir, siteId: 'shop' });
  try {
    assert.deepEqual(again.data.read(), { version: 2, data: { customers: [{ id: 'c1' }, { id: 'c2' }], messages: { c1: [{ text: 'hi' }] } } });
  } finally {
    again.close();
  }
  for (const name of fs.readdirSync(dir)) assert.equal(fs.statSync(path.join(dir, name)).mode & 0o077, 0, name + ' is private');
  assert.equal(fs.statSync(file).mode & 0o077, 0, 'an exported copy is private');
  assert.equal(run('nonsense').status, 1);
  assert.equal(spawnSync(process.execPath, [path.join(__dirname, 'site-admin.cjs'), 'user', 'list'], { env: { ...process.env, WA_SCRM_DATA_DIR: '' }, encoding: 'utf8' }).stderr.trim(), 'site-admin: WA_SCRM_DATA_DIR is not set');
});

test('the preview server: without a data folder the routes are off; with one, the AI relay answers signed-in users only', async () => {
  const start = env => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, 'serve.cjs'), '0'], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', chunk => { out += chunk; const m = out.match(/PREVIEW_URL=(http:\/\/127\.0\.0\.1:\d+)/); if (m) resolve({ child, base: m[1] }); });
    child.on('exit', code => reject(new Error('serve.cjs exited early: ' + code)));
    setTimeout(() => reject(new Error('serve.cjs did not start')), 8000);
  });
  const off = await start({ WA_SCRM_DATA_DIR: '', WA_SCRM_AI_ENV: '' });
  try {
    assert.deepEqual((await call('/api/site/status', { base: off.base })).json, { enabled: false });
    const me = await call('/api/auth/me', { base: off.base });
    assert.deepEqual([me.status, me.json], [503, { error: 'not-enabled' }]);
    assert.equal((await call('/api/ai/status', { base: off.base })).status, 200, 'the relay is open as before');
    assert.equal((await fetch(off.base + '/')).status, 200);
  } finally {
    off.child.kill();
  }
  const dir = path.join(tmp, 'served');
  const setup = siteApi.create({ dir, siteId: 'default' });
  const { password } = await setup.auth.createUser({ username: 'lia', role: 'agent', name: 'Lia', site: 'default' });
  setup.close();
  const on = await start({ WA_SCRM_DATA_DIR: dir, WA_SCRM_SITE_ID: '', WA_SCRM_AI_ENV: '' });
  try {
    assert.deepEqual((await call('/api/site/status', { base: on.base })).json, { enabled: true, site: 'default' });
    assert.deepEqual((await call('/api/ai/status', { base: on.base })).json, { error: 'not-signed-in' });
    assert.equal((await call('/api/ai/translate', { base: on.base, method: 'POST', body: { text: 'hi', to: 'English' } })).status, 401);
    const first = await call('/api/auth/login', { base: on.base, method: 'POST', body: { username: 'lia', password } });
    assert.equal((await call('/api/ai/status', { base: on.base, cookie: cookieOf(first) })).status, 401, 'not before the temporary password is changed');
    assert.equal((await call('/api/auth/password', { base: on.base, method: 'POST', cookie: cookieOf(first), body: { current: password, next: PASSWORD } })).status, 200);
    assert.deepEqual((await call('/api/ai/status', { base: on.base, cookie: cookieOf(first) })).json, { configured: false, reason: 'no-settings-file', voice: { configured: false, reason: 'no-settings-file' } });
    assert.deepEqual((await call('/api/data', { base: on.base, cookie: cookieOf(first) })).json, { version: 0, data: {} });
    for (const name of fs.readdirSync(dir).filter(name => name.startsWith('site-default.db'))) assert.equal(fs.statSync(path.join(dir, name)).mode & 0o077, 0, name + ' is private');
    assert.equal((await fetch(on.base + '/')).status, 200, 'the page itself needs no sign-in');
  } finally {
    on.child.kill();
  }
});
