// Tests of the accounts, the sessions and the data store of a sub-site.
// Run with Node 22.13 or newer:  node --test work/wa-replica/site-api.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
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

test('the supervisor page\'s questions: the sub-sites and their employees; only some fields of a sub-site\'s data; each read by someone else than the employee leaves a line', async () => {
  const [gus, ivo, joy] = await Promise.all(['gus', 'ivo', 'joy'].map(async username => cookieOf(await call('/api/auth/login', { method: 'POST', body: { username, password: PASSWORD } }))));
  // the list: every sub-site that has an employee, with the employees' names; not for an employee, not without sign-in
  const list = await call('/api/auth/sites', { cookie: ivo });
  assert.equal(list.status, 200);
  assert.deepEqual(list.json.sites.map(entry => entry.site), [...list.json.sites.map(entry => entry.site)].sort(), 'in the order of the names');
  assert.deepEqual(list.json.sites.find(entry => entry.site === 's2').employees, [{ username: 'hana', name: 'hana name', disabled: false }, { username: 'max', name: 'max name', disabled: false }, { username: 'nora', name: 'Nora', disabled: false }]);
  assert(list.json.sites.find(entry => entry.site === 's1').employees.some(employee => employee.username === 'dana' && employee.name === 'dana name'));
  assert(!JSON.stringify(list.json).includes('ivo') && !JSON.stringify(list.json).includes('joy') && !list.raw.includes('scrypt'), 'supervisors and administrators are no employees; no password hash');
  assert.deepEqual((await call('/api/auth/sites', { cookie: joy })).json, list.json, 'an administrator gets the same');
  site.auth.setDisabled('max', true);
  assert.equal((await call('/api/auth/sites', { cookie: ivo })).json.sites.find(entry => entry.site === 's2').employees.find(employee => employee.username === 'max').disabled, true);
  site.auth.setDisabled('max', false);
  assert.deepEqual([(await call('/api/auth/sites', { cookie: gus })).json, (await call('/api/auth/sites')).status, (await call('/api/auth/sites', { method: 'POST', cookie: ivo, body: {} })).status], [{ error: 'forbidden' }, 401, 405]);
  // only some fields: the others are left out, a split field comes back whole, a field that is not there is simply missing
  const version = (await call('/api/data', { cookie: gus })).json.version;
  assert.equal((await call('/api/data', { method: 'PUT', cookie: gus, body: { baseVersion: version, set: { customers: [{ id: 'c1' }], tasks: [], 'messages/c1': [{ id: 'm1' }], 'messages/c2': [] } } })).status, 200);
  const some = await call('/api/data?fields=customers,tasks,nothing', { cookie: ivo });
  assert.deepEqual([some.status, some.json], [200, { version: version + 1, data: { customers: [{ id: 'c1' }], tasks: [] } }]);
  assert.deepEqual((await call('/api/data?fields=messages', { cookie: gus })).json.data, { messages: { c1: [{ id: 'm1' }], c2: [] } });
  const whole = (await call('/api/data', { cookie: ivo })).json.data;
  assert(['customers', 'messages', 'note', 'tasks'].every(field => field in whole) && Object.keys(whole).length > 4, 'without the question everything comes, as before');
  for (const fields of ['', 'customers,', 'messages/c1', 'a b', '1st', 'x'.repeat(41), Array.from({ length: 21 }, (_, i) => 'f' + i).join(',')]) {
    assert.deepEqual((await call('/api/data?fields=' + encodeURIComponent(fields), { cookie: ivo })).json, { error: 'invalid-request' }, JSON.stringify(fields));
  }
  assert.deepEqual((await call('/api/data?fields=customers', { cookie: await member('olga', 'agent', 's2') })).json, { error: 'forbidden' }, 'not for an employee of another sub-site');
  // a field or a part called like something every object has, or like something special, is a name like any other:
  // it is in the document as it was saved, and reading the document touches nothing else
  const odd = (await call('/api/data', { cookie: gus })).json.version;
  assert.equal((await call('/api/data', { method: 'PUT', cookie: gus, body: { baseVersion: odd, set: { 'constructor/keys': 1, 'messages/__proto__': [{ id: 'odd' }], toString: 'a field' } } })).status, 200);
  const read = (await call('/api/data', { cookie: ivo })).raw;
  for (const part of ['"constructor":{"keys":1}', '"__proto__":[{"id":"odd"}]', '"toString":"a field"']) assert(read.includes(part), part);
  assert.deepEqual([typeof Object.keys, Object.keys({ a: 1 }), {}.id, String({})], ['function', ['a'], undefined, '[object Object]'], 'nothing but the document was touched');
  assert.deepEqual((await call('/api/data?fields=constructor,toString', { cookie: ivo })).json.data, { constructor: { keys: 1 }, toString: 'a field' });
  assert.equal((await call('/api/data', { method: 'PUT', cookie: gus, body: { baseVersion: odd + 1, remove: ['constructor/keys', 'messages/__proto__', 'toString'] } })).status, 200, 'and saving goes on');
  assert.deepEqual(Object.keys((await call('/api/data', { cookie: gus })).json.data.messages), ['c1', 'c2']);
  // the lines: one for each read of a supervisor or an administrator, none for the employee's own
  const reads = logged.filter(line => line.startsWith('site data read '));
  assert(reads.includes('site data read user=ivo role=supervisor site=s1 fields=customers,tasks,nothing') && reads.includes('site data read user=ivo role=supervisor site=s1 fields=all') && reads.includes('site data read user=joy role=admin site=s1 fields=all'), reads.join('\n'));
  assert(!reads.some(line => line.includes('user=gus')), 'the employee\'s own reads leave no line');
});

test('accounts from the supervisor page: the list; a new supervisor with a temporary or a given password; a new temporary password; an account off and on — for supervisors and administrators, never their own account, an administrator\'s only as an administrator, each action in the log', async () => {
  const signIn = async username => cookieOf(await call('/api/auth/login', { method: 'POST', body: { username, password: PASSWORD } }));
  const [gus, ivo, joy] = [await signIn('gus'), await signIn('ivo'), await signIn('joy')];
  const send = (pathname, cookie, body) => call(pathname, { method: 'POST', cookie, body });
  const count = async () => (await call('/api/auth/users', { cookie: ivo })).json.users.length;
  // the list: every account with its role, its sub-site and its state — and nothing of a password
  const list = await call('/api/auth/users', { cookie: ivo });
  assert.equal(list.status, 200);
  assert.deepEqual(list.json.users.find(user => user.username === 'gus'), { username: 'gus', name: 'gus name', role: 'agent', site: 's1', mustChangePassword: false, disabled: false });
  assert.deepEqual(list.json.users.find(user => user.username === 'joy'), { username: 'joy', name: 'joy name', role: 'admin', site: null, mustChangePassword: false, disabled: false });
  assert(!list.raw.includes('scrypt') && !/"(password|id|token)[a-z_]*":/i.test(list.raw), 'no password, no hash, no number of a row');
  assert.deepEqual((await call('/api/auth/users', { cookie: joy })).json, list.json, 'an administrator gets the same');
  assert.deepEqual([(await call('/api/auth/users', { cookie: gus })).json, (await call('/api/auth/users')).status], [{ error: 'forbidden' }, 401]);
  // a new supervisor without a password: a temporary one comes back, once, and has to be changed
  const made = await send('/api/auth/users', ivo, { username: ' Pia ', name: ' Pia P ', role: 'supervisor' });
  assert.deepEqual([made.status, made.json.user, made.json.password.length], [200, { username: 'pia', name: 'Pia P', role: 'supervisor' }, 16]);
  const first = await call('/api/auth/login', { method: 'POST', body: { username: 'pia', password: made.json.password } });
  assert.deepEqual([first.status, first.json.user.mustChangePassword, first.json.user.site, first.json.user.role], [200, true, null, 'supervisor']);
  assert.equal((await call('/api/auth/users', { cookie: cookieOf(first) })).status, 403, 'not before the temporary password is changed');
  // with a password: it is the account's own, it does not come back, and the supervisor is one at once
  const own = await send('/api/auth/users', joy, { username: 'quin', name: 'Quin', role: 'supervisor', password: 'quin-own-password' });
  assert.deepEqual([own.status, own.json], [200, { user: { username: 'quin', name: 'Quin', role: 'supervisor' } }]);
  const quin = await call('/api/auth/login', { method: 'POST', body: { username: 'quin', password: 'quin-own-password' } });
  assert.deepEqual([quin.status, quin.json.user.mustChangePassword, (await call('/api/auth/sites', { cookie: cookieOf(quin) })).status], [200, false, 200]);
  // what is refused makes nothing
  const before = await count();
  for (const [body, error, status] of [
    [{ username: 'ab', name: 'Short', role: 'supervisor' }, 'invalid-username', 400],
    [{ username: 'pia', name: 'Again', role: 'supervisor' }, 'username-taken', 409],
    [{ username: 'rita', name: '  ', role: 'supervisor' }, 'invalid-name', 400],
    [{ username: 'rita', name: 'x'.repeat(61), role: 'supervisor' }, 'invalid-name', 400],
    [{ username: 'rita', name: 'Rita', role: 'supervisor', password: 'short' }, 'invalid-password', 400],
    [{ username: 'rita', name: 'Rita', role: 'supervisor', password: 12345678 }, 'invalid-password', 400],
    [{ username: 'rita', name: 'Rita', role: 'admin' }, 'invalid-role', 400],
    [{ username: 'rita', name: 'Rita', role: 'agent' }, 'invalid-role', 400],
    [{ username: 'rita', name: 'Rita' }, 'invalid-role', 400],
    [{ username: ['rita'], name: 'Rita', role: 'supervisor' }, 'invalid-request', 400],
    [{ username: 'rita', name: { a: 1 }, role: 'supervisor' }, 'invalid-request', 400],
  ]) {
    const answer = await send('/api/auth/users', ivo, body);
    assert.deepEqual([answer.status, answer.json], [status, { error }], JSON.stringify(body));
  }
  assert.deepEqual([(await send('/api/auth/users', gus, { username: 'rita', name: 'Rita', role: 'supervisor' })).json, (await call('/api/auth/users', { method: 'POST', body: { username: 'rita', name: 'Rita', role: 'supervisor' } })).status], [{ error: 'forbidden' }, 401]);
  const crossSite = await call('/api/auth/users', { method: 'POST', cookie: ivo, body: { username: 'rita', name: 'Rita', role: 'supervisor' }, headers: { 'Sec-Fetch-Site': 'cross-site' } });
  assert.deepEqual([crossSite.status, await count()], [403, before], 'a page of another site makes no account with a supervisor\'s cookie');
  // a new temporary password: the old password and the sessions end
  const reset = await send('/api/auth/users/reset', ivo, { username: ' GUS ' });
  assert.deepEqual([reset.status, reset.json.user, reset.json.password.length], [200, { username: 'gus', name: 'gus name', role: 'agent' }, 16]);
  assert.deepEqual([(await call('/api/auth/me', { cookie: gus })).status, (await call('/api/auth/login', { method: 'POST', body: { username: 'gus', password: PASSWORD } })).status], [401, 401]);
  const again = await call('/api/auth/login', { method: 'POST', body: { username: 'gus', password: reset.json.password } });
  assert.equal(again.json.user.mustChangePassword, true);
  assert.equal((await call('/api/auth/password', { method: 'POST', cookie: cookieOf(again), body: { current: reset.json.password, next: PASSWORD } })).status, 200);
  // off: the session ends and nobody signs in; on again
  const max = await signIn('max');
  assert.deepEqual((await send('/api/auth/users/disable', ivo, { username: 'max' })).json, { ok: true });
  assert.deepEqual([(await call('/api/auth/me', { cookie: max })).status, (await call('/api/auth/login', { method: 'POST', body: { username: 'max', password: PASSWORD } })).status, (await call('/api/auth/users', { cookie: ivo })).json.users.find(user => user.username === 'max').disabled], [401, 401, true]);
  assert.deepEqual((await send('/api/auth/users/enable', ivo, { username: 'max' })).json, { ok: true });
  assert.equal((await call('/api/auth/login', { method: 'POST', body: { username: 'max', password: PASSWORD } })).status, 200);
  // never one's own account; an administrator's only as an administrator; an account that is not there; not for an employee
  const employee = await signIn('gus');
  for (const pathname of ['/api/auth/users/reset', '/api/auth/users/disable', '/api/auth/users/enable']) {
    assert.deepEqual([(await send(pathname, ivo, { username: 'ivo' })).json, (await send(pathname, ivo, { username: 'joy' })).json, (await send(pathname, ivo, { username: 'nobody' })).json, (await send(pathname, ivo, {})).json, (await send(pathname, employee, { username: 'max' })).json, (await call(pathname, { method: 'POST', body: { username: 'max' } })).status],
      [{ error: 'own-account' }, { error: 'forbidden' }, { error: 'unknown-user' }, { error: 'unknown-user' }, { error: 'forbidden' }, 401], pathname);
  }
  assert.deepEqual([(await call('/api/auth/me', { cookie: ivo })).status, (await call('/api/auth/me', { cookie: joy })).status, (await call('/api/auth/login', { method: 'POST', body: { username: 'max', password: PASSWORD } })).status], [200, 200, 200], 'none of the refused did anything');
  // a supervisor acts on another supervisor, an administrator on a supervisor
  assert.deepEqual([(await send('/api/auth/users/disable', ivo, { username: 'quin' })).status, (await call('/api/auth/me', { cookie: cookieOf(quin) })).status, (await send('/api/auth/users/enable', joy, { username: 'quin' })).status], [200, 401, 200]);
  // every action is in the log with who did it; no password is
  const lines = logged.filter(line => line.startsWith('site account '));
  for (const line of ['site account created by=ivo user=pia role=supervisor', 'site account created by=joy user=quin role=supervisor', 'site account reset by=ivo user=gus', 'site account disabled by=ivo user=max', 'site account enabled by=ivo user=max', 'site account disabled by=ivo user=quin', 'site account enabled by=joy user=quin']) assert(lines.includes(line), line + '\n' + lines.join('\n'));
  for (const secret of [made.json.password, reset.json.password, 'quin-own-password']) assert(!logged.join('\n').includes(secret), 'a password in the log');
});

test('employees from the supervisor page, where the platform makes sub-sites: the sub-site is asked for first and bears the sign-in name; what is refused makes neither; off, the sub-site stops unless another employee of it can sign in; on, it starts first; the list tells each sub-site\'s state', async () => {
  // a stand-in for the first server's client of the provisioner: what it was asked, and how it answers
  const asked = [], states = new Map([['s1', 'ready'], ['s2', 'ready'], ['depot', 'ready'], ['orphan', 'stopped']]);
  const refuse = {};
  let reachable = true;
  const no = code => Object.assign(new Error(code), { code });
  const answer = (what, id, to) => {
    asked.push(`${what} ${id}`);
    if (!reachable) throw no('workspace-unavailable');
    if (refuse[what]) throw no(refuse[what]);
    if (what === 'make' ? states.has(id) : !states.has(id)) throw no(what === 'make' ? 'workspace-exists' : 'workspace-unknown-site');
    states.set(id, to);
    return { id, state: to };
  };
  const workspaces = {
    list: async () => { if (!reachable) throw no('workspace-unavailable'); return { sites: [...states].map(([id, state]) => ({ id, state })), room: { max: 4, running: 2, freeMb: 3000, minFreeMb: 1400, canStart: true } }; },
    make: async id => answer('make', id, 'starting'), start: async id => answer('start', id, 'starting'), stop: async id => answer('stop', id, 'stopped'),
  };
  const first = siteApi.create({ dir: path.join(tmp, 'main'), siteId: 'hq', now: () => clock, workspaces });
  const firstServer = http.createServer((req, res) => first.handle(req, res, new URL(req.url, 'http://localhost').pathname));
  await new Promise(resolve => firstServer.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${firstServer.address().port}`;
  try {
    const signIn = async (username, password = PASSWORD) => call('/api/auth/login', { method: 'POST', body: { username, password } });
    const [gus, ivo, joy] = [cookieOf(await signIn('gus')), cookieOf(await signIn('ivo')), cookieOf(await signIn('joy'))];
    const send = (pathname, cookie, body) => call(pathname, { method: 'POST', cookie, body, base });
    const sites = async (cookie = ivo) => (await call('/api/auth/sites', { cookie, base })).json;
    const account = async username => (await call('/api/auth/users', { cookie: ivo, base })).json.users.find(user => user.username === username);
    const count = async () => (await call('/api/auth/users', { cookie: ivo, base })).json.users.length;
    await site.auth.createUser({ username: 'otto', role: 'agent', name: 'Otto', site: 'depot' });
    await site.auth.createUser({ username: 'zed', role: 'agent', name: 'Zed', site: 'nowhere' });
    // the list: the platform makes sub-sites, and each one has its state — one the provisioner does not know is missing
    const list = await sites();
    assert.deepEqual([list.provisioned, list.sites.find(entry => entry.site === 's1').state, list.sites.find(entry => entry.site === 'depot').state, list.sites.find(entry => entry.site === 'nowhere').state], [true, 'ready', 'ready', 'missing']);
    assert.deepEqual(list.sites.find(entry => entry.site === 'depot'), { site: 'depot', employees: [{ username: 'otto', name: 'Otto', disabled: false }], state: 'ready' });
    // a server that is not the first server of such a platform says nothing of it, and makes no employee
    const plain = (await call('/api/auth/sites', { cookie: ivo })).json;
    assert.deepEqual([plain.provisioned, plain.sites.some(entry => 'state' in entry), (await call('/api/auth/users', { method: 'POST', cookie: ivo, body: { username: 'lena', name: 'Lena', role: 'agent' } })).json], [undefined, false, { error: 'invalid-role' }]);
    // a new employee: the sub-site is asked for, then the account is made — in its sub-site, with a temporary password
    asked.length = 0;
    const made = await send('/api/auth/users', ivo, { username: ' Lena ', name: ' Lena L ', role: 'agent' });
    assert.deepEqual([made.status, made.json.user, made.json.password.length, asked], [200, { username: 'lena', name: 'Lena L', role: 'agent' }, 16, ['make lena']]);
    assert.deepEqual(await account('lena'), { username: 'lena', name: 'Lena L', role: 'agent', site: 'lena', mustChangePassword: true, disabled: false });
    const lena = await call('/api/auth/login', { method: 'POST', base, body: { username: 'lena', password: made.json.password } });
    assert.deepEqual([lena.status, lena.cookies[1]], [200, 'scrm_site=lena; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000']);
    assert.deepEqual((await sites()).sites.find(entry => entry.site === 'lena'), { site: 'lena', employees: [{ username: 'lena', name: 'Lena L', disabled: false }], state: 'starting' });
    states.set('lena', 'ready');
    assert.equal((await sites(joy)).sites.find(entry => entry.site === 'lena').state, 'ready');
    // with a password of their own: it does not come back, and need not be changed
    const own = await send('/api/auth/users', joy, { username: 'mia-2', name: 'Mia', role: 'agent', password: 'mia-own-password' });
    assert.deepEqual([own.status, own.json, (await account('mia-2')).mustChangePassword, (await account('mia-2')).site], [200, { user: { username: 'mia-2', name: 'Mia', role: 'agent' } }, false, 'mia-2']);
    // a supervisor is made as before, and the provisioner is not asked
    asked.length = 0;
    assert.deepEqual([(await send('/api/auth/users', ivo, { username: 'sven', name: 'Sven', role: 'supervisor' })).status, asked, (await account('sven')).site], [200, [], null]);
    // what would stop the account is found before anything is asked of the provisioner
    const before = await count();
    for (const [body, error, status] of [
      [{ username: 'ab', name: 'Short' }, 'invalid-username', 400],
      [{ username: 'le.na', name: 'Dot' }, 'invalid-username', 400],
      [{ username: 'le_na', name: 'Underscore' }, 'invalid-username', 400],
      [{ username: 'lena-', name: 'Ends with a hyphen' }, 'invalid-username', 400],
      [{ username: '-lena', name: 'Begins with a hyphen' }, 'invalid-username', 400],
      [{ username: 'x'.repeat(33), name: 'Long' }, 'invalid-username', 400],
      [{ username: 'master', name: 'The platform\'s own' }, 'invalid-username', 400],
      [{ username: 'gateway', name: 'The platform\'s own' }, 'invalid-username', 400],
      [{ username: 'provisioner', name: 'The platform\'s own' }, 'invalid-username', 400],
      [{ username: 'rita', name: '  ' }, 'invalid-name', 400],
      [{ username: 'rita', name: 'x'.repeat(61) }, 'invalid-name', 400],
      [{ username: 'rita', name: 'Rita', password: 'short' }, 'invalid-password', 400],
      [{ username: 'rita', name: 'Rita', password: 12345678 }, 'invalid-password', 400],
      [{ username: 'lena', name: 'Again' }, 'username-taken', 409],
      [{ username: 'ivo', name: 'A supervisor\'s name' }, 'username-taken', 409],
      [{ username: 'rita', name: 'Rita', role: 'admin' }, 'invalid-role', 400],
    ]) {
      const refused = await send('/api/auth/users', ivo, { role: 'agent', ...body });
      assert.deepEqual([refused.status, refused.json], [status, { error }], JSON.stringify(body));
    }
    assert.deepEqual([asked, await count()], [[], before], 'nothing was asked, nothing was made');
    assert.deepEqual([(await send('/api/auth/users', gus, { username: 'rita', name: 'Rita', role: 'agent' })).json, (await call('/api/auth/users', { method: 'POST', base, body: { username: 'rita', name: 'Rita', role: 'agent' } })).status, (await call('/api/auth/users', { method: 'POST', base, cookie: ivo, body: { username: 'rita', name: 'Rita', role: 'agent' }, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, asked], [{ error: 'forbidden' }, 401, 403, []]);
    // what the provisioner refuses makes no account: no room, too little memory, busy, no answer, a sub-site that is somebody's
    for (const [reason, status] of [['workspace-full', 409], ['workspace-low-memory', 409], ['workspace-busy', 409], ['workspace-unavailable', 503]]) {
      refuse.make = reason;
      const refused = await send('/api/auth/users', ivo, { username: 'rita', name: 'Rita', role: 'agent' });
      assert.deepEqual([refused.status, refused.json], [status, { error: reason }]);
    }
    delete refuse.make;
    asked.length = 0;
    assert.deepEqual([(await send('/api/auth/users', ivo, { username: 'depot', name: 'Depot', role: 'agent' })).json, asked, await count()], [{ error: 'workspace-exists' }, ['make depot'], before], 'the sub-site of another account is not taken');
    // a sub-site that is there and is nobody's — its account was not made the last time — is taken and started
    asked.length = 0;
    const taken = await send('/api/auth/users', ivo, { username: 'orphan', name: 'Orphan', role: 'agent' });
    assert.deepEqual([taken.status, asked, (await account('orphan')).site, states.get('orphan')], [200, ['make orphan', 'start orphan'], 'orphan', 'starting']);
    refuse.start = 'workspace-full';
    states.set('second', 'stopped');
    assert.deepEqual([(await send('/api/auth/users', ivo, { username: 'second', name: 'Second', role: 'agent' })).json, await account('second')], [{ error: 'workspace-full' }, undefined], 'not when it cannot be started');
    delete refuse.start;
    // off: the session ends, and the sub-site stops — its place is free
    asked.length = 0;
    const off = await send('/api/auth/users/disable', ivo, { username: 'lena' });
    assert.deepEqual([off.json, asked, (await call('/api/auth/me', { cookie: cookieOf(lena), base })).status, (await sites()).sites.find(entry => entry.site === 'lena')], [{ ok: true, workspace: 'stopped' }, ['stop lena'], 401, { site: 'lena', employees: [{ username: 'lena', name: 'Lena L', disabled: true }], state: 'stopped' }]);
    // on: the sub-site is started first — when there is no room for it, the account stays off
    asked.length = 0;
    refuse.start = 'workspace-full';
    assert.deepEqual([(await send('/api/auth/users/enable', ivo, { username: 'lena' })).json, asked, (await account('lena')).disabled], [{ error: 'workspace-full' }, ['start lena'], true]);
    refuse.start = 'workspace-low-memory';
    assert.deepEqual([(await send('/api/auth/users/enable', ivo, { username: 'lena' })).status, (await account('lena')).disabled], [409, true]);
    delete refuse.start;
    assert.deepEqual([(await send('/api/auth/users/enable', joy, { username: 'lena' })).json, (await account('lena')).disabled, states.get('lena')], [{ ok: true, workspace: 'starting' }, false, 'starting']);
    // a sub-site with several employees stops only when the last of them who could sign in is switched off
    const several = (await sites()).sites.find(entry => entry.site === 's2').employees.map(employee => employee.username);
    assert(several.length > 2 && several.includes('max'));
    asked.length = 0;
    for (const username of several.slice(1)) assert.deepEqual((await send('/api/auth/users/disable', ivo, { username })).json, { ok: true }, username);
    assert.deepEqual(asked, [], 'the first of them can still sign in');
    assert.deepEqual([(await send('/api/auth/users/disable', ivo, { username: several[0] })).json, asked, states.get('s2')], [{ ok: true, workspace: 'stopped' }, ['stop s2'], 'stopped']);
    for (const username of several) assert.deepEqual((await send('/api/auth/users/enable', ivo, { username })).json, { ok: true, workspace: 'starting' }, username);
    states.set('s2', 'ready');
    // a sub-site that cannot be stopped: the account is off all the same, and the answer says that it still runs
    refuse.stop = 'workspace-unavailable';
    assert.deepEqual([(await send('/api/auth/users/disable', ivo, { username: 'otto' })).json, (await account('otto')).disabled], [{ ok: true, workspace: 'running' }, true]);
    delete refuse.stop;
    // an employee whose sub-site the platform did not make, and a supervisor: the account only
    asked.length = 0;
    assert.deepEqual([(await send('/api/auth/users/disable', ivo, { username: 'zed' })).json, (await send('/api/auth/users/enable', ivo, { username: 'zed' })).json, (await account('zed')).disabled, asked], [{ ok: true }, { ok: true }, false, ['stop nowhere', 'start nowhere']]);
    asked.length = 0;
    assert.deepEqual([(await send('/api/auth/users/disable', ivo, { username: 'sven' })).json, (await send('/api/auth/users/enable', ivo, { username: 'sven' })).json, asked], [{ ok: true }, { ok: true }, []]);
    // the provisioner does not answer: the list is there without the states, and no employee is made
    reachable = false;
    const blind = await sites();
    assert.deepEqual([blind.provisioned, blind.sites.some(entry => 'state' in entry), blind.sites.find(entry => entry.site === 'lena').employees.length, (await send('/api/auth/users', ivo, { username: 'rita', name: 'Rita', role: 'agent' })).status, await account('rita')], [true, false, 1, 503, undefined]);
    reachable = true;
    // each thing asked of the provisioner is in the log with who asked; no password is
    const lines = logged.filter(line => line.startsWith('site workspace '));
    for (const line of ['site workspace make ok by=ivo site=lena', 'site workspace make ok by=joy site=mia-2', 'site workspace make failed by=ivo site=rita error=workspace-full', 'site workspace make failed by=ivo site=depot error=workspace-exists', 'site workspace make ok by=ivo site=orphan', 'site workspace stop ok by=ivo site=lena', 'site workspace start failed by=ivo site=lena error=workspace-full', 'site workspace start ok by=joy site=lena', 'site workspace stop failed by=ivo site=depot error=workspace-unavailable']) assert(lines.includes(line), line + '\n' + lines.join('\n'));
    assert(logged.includes('site account created by=ivo user=lena role=agent'));
    for (const secret of [made.json.password, 'mia-own-password']) assert(!logged.join('\n').includes(secret), 'a password in the log');
  } finally {
    firstServer.closeAllConnections(); firstServer.close(); first.close();
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
    // the server also answers under the name of its sub-site — for its data and its WhatsApp link, nothing else —
    // and under no other name
    assert.deepEqual((await call('/site/default/api/data?fields=customers', { base: on.base, cookie: cookieOf(first) })).json, { version: 0, data: {} });
    assert.deepEqual([(await call('/site/default/api/data', { base: on.base })).status, (await call('/site/default/api/wa/status', { base: on.base })).status, (await call('/site/default/api/wa/status', { base: on.base, cookie: cookieOf(first) })).status], [401, 401, 200]);
    const named = async (pathname, options = {}) => (await fetch(on.base + pathname, { ...options, headers: { Cookie: cookieOf(first), ...options.headers } })).status;
    assert.deepEqual([await named('/site/default/api/site/status'), await named('/site/default/api/auth/session'), await named('/site/default/api/auth/me'), await named('/site/default/api/ai/status'), await named('/site/default/api/data/more'), await named('/site/default/api/wax')], [404, 404, 404, 404, 404, 404], 'signing in, the status and the relay have the plain address only');
    assert.notEqual(await named('/site/default/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'lia', password: PASSWORD }) }), 200, 'nobody signs in under the name of a sub-site');
    assert.deepEqual([await named('/site/other/api/data'), await named('/site/default/index.html'), await named('/site/default')], [404, 404, 404]);
    for (const name of fs.readdirSync(dir).filter(name => name.startsWith('site-default.db'))) assert.equal(fs.statSync(path.join(dir, name)).mode & 0o077, 0, name + ' is private');
    assert.equal((await fetch(on.base + '/')).status, 200, 'the page itself needs no sign-in');
    // an address with a backslash — a slash to this server, none to a gateway in front of it — is refused
    // (asked over a bare connection: a client of Node's own would not send such an address)
    const plainly = (method, pathname) => new Promise((resolve, reject) => {
      const socket = net.connect(Number(new URL(on.base).port), '127.0.0.1', () => socket.write(`${method} ${pathname} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n${method === 'POST' ? 'Content-Type: application/json\r\nContent-Length: 2\r\n\r\n{}' : '\r\n'}`));
      let answer = '';
      socket.on('data', chunk => { answer += chunk; });
      socket.on('end', () => resolve(Number(answer.split(' ')[1])));
      socket.on('error', reject);
    });
    assert.deepEqual([await plainly('POST', '/api/wa/\\..\\..\\auth/login'), await plainly('GET', '/api/site\\status'), await plainly('GET', '/api/site/status'), await plainly('GET', '/api/site/status?note=a\\b')], [400, 400, 200, 200]);
    // the server is for this machine only, unless it is told to listen elsewhere — as it is in a container
    const outside = Object.values(os.networkInterfaces()).flat().find(address => address.family === 'IPv4' && !address.internal)?.address;
    if (outside) {
      await assert.rejects(fetch(`http://${outside}:${new URL(on.base).port}/api/site/status`), 'not by another address of the machine');
      const open = await start({ WA_SCRM_DATA_DIR: dir, WA_SCRM_SITE_ID: '', WA_SCRM_AI_ENV: '', WA_SCRM_LISTEN: '0.0.0.0' });
      try {
        assert.deepEqual(await (await fetch(`http://${outside}:${new URL(open.base).port}/api/site/status`)).json(), { enabled: true, site: 'default' });
      } finally {
        open.child.kill();
      }
    }
  } finally {
    on.child.kill();
  }
});
