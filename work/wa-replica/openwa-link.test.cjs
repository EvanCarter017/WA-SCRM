// Tests of the link between a sub-site and its OpenWA. A stand-in answers like OpenWA 0.31.0 did when its
// routes were tried on 2026-11-21 (statuses, bodies, the signature of its deliveries).
// Run with Node 22.13 or newer:  node --test work/wa-replica/openwa-link.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const siteApi = require('./site-api.cjs');
const openwaLink = require('./openwa-link.cjs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-scrm-openwa-'));
let clock = Date.parse('2026-11-21T08:00:00Z');
const KEY = 'owa_k1_test-key-0123456789';
const SECRET = 'hook-secret-0123456789abcdef0123456789abcdef';
const HOOK_URL = 'http://host.docker.internal:8141/api/wa/hook';
const PASSWORD = 'correct horse battery';
const QR = 'data:image/png;base64,QUJD';
const settingsFile = path.join(tmp, 'openwa.env');
const logged = [];
for (const level of ['log', 'error']) {
  const original = console[level];
  console[level] = (...args) => { logged.push(args.join(' ')); if (!/^(wa|site) /.test(String(args[0]))) original(...args); };
}

// ---- the stand-in for OpenWA ----
const gw = { sessions: new Map(), hooks: new Map(), sends: [], calls: [], sendMode: 'ok', replies: new Map() };
const uuid = () => crypto.randomUUID();
const gwSession = name => ({ id: uuid(), name, status: 'created', phone: null, pushName: null, connectedAt: null, lastActive: null, createdAt: new Date(clock).toISOString(), updatedAt: new Date(clock).toISOString(), lastError: null, restriction: null, engineLoaded: false });
const publicHook = ({ secret, ...hook }) => hook;
const gateway = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined;
    const answer = (status, json) => { res.writeHead(status, json === undefined ? {} : { 'Content-Type': 'application/json' }); res.end(json === undefined ? '' : JSON.stringify(json)); };
    const fail = (status, error, message) => answer(status, { message, error, statusCode: status });
    gw.calls.push(`${req.method} ${req.url}`);
    if (req.headers['x-api-key'] !== KEY) return fail(401, 'Unauthorized', 'API key is required');
    const [, , , sessionId, action, third, fourth] = req.url.split('?')[0].split('/');
    if (!sessionId) {
      if (req.method === 'GET') return answer(200, [...gw.sessions.values()]);
      if ([...gw.sessions.values()].some(s => s.name === body.name)) return fail(409, 'Conflict', `Session with name '${body.name}' already exists`);
      const session = gwSession(body.name);
      gw.sessions.set(session.id, session);
      gw.hooks.set(session.id, []);
      return answer(201, session);
    }
    const session = gw.sessions.get(sessionId);
    if (!session) return fail(404, 'Not Found', `Session with id '${sessionId}' not found`);
    const started = !['created', 'disconnected', 'failed'].includes(session.status);
    if (!action) {
      if (req.method === 'GET') return answer(200, session);
      gw.sessions.delete(sessionId);
      gw.hooks.delete(sessionId);
      return answer(204);
    }
    if (action === 'start') {
      if (started) return fail(400, 'Bad Request', 'Session is already started');
      Object.assign(session, { status: 'qr_ready', engineLoaded: true, starts: (session.starts || 0) + 1 });
      return answer(200, session);
    }
    if (action === 'stop') {
      if (!started) return fail(400, 'Bad Request', 'Session is not started. Call POST /sessions/:sessionId/start first.');
      Object.assign(session, { status: 'disconnected', engineLoaded: false });
      return answer(200, session);
    }
    // Every start brings a new code: the first one is QR, later ones carry the number of the start.
    if (action === 'qr') return session.status === 'qr_ready' ? answer(200, { qrCode: session.starts > 1 ? QR + session.starts : QR, status: 'qr_ready' }) : fail(400, 'Bad Request', 'Session is not started. Call POST /sessions/:sessionId/start first.');
    if (action === 'logout') {
      if (!started) return fail(400, 'Bad Request', 'Session is not started. Call POST /sessions/:sessionId/start first.');
      Object.assign(session, { status: 'disconnected', phone: null, engineLoaded: false });
      return answer(200, session);
    }
    if (action === 'webhooks') {
      const hooks = gw.hooks.get(sessionId);
      if (req.method === 'GET') return answer(200, hooks.map(publicHook));
      if (req.method === 'DELETE') {
        gw.hooks.set(sessionId, hooks.filter(h => h.id !== third));
        return answer(204);
      }
      const hook = { id: uuid(), sessionId, url: body.url, events: body.events, filters: null, active: true, retryCount: body.retryCount, lastTriggeredAt: null, secret: body.secret };
      hooks.push(hook);
      return answer(201, publicHook(hook));
    }
    if (action === 'messages' && third === 'send-text' && !fourth) {
      const key = req.headers['idempotency-key'];
      gw.sends.push({ sessionId, key, body });
      if (!started) return fail(400, 'Bad Request', `Session '${sessionId}' is not active`);
      if (session.status !== 'ready') return fail(409, 'Conflict', 'Session is not connected. The WhatsApp client is not ready.');
      if (gw.sendMode === 'error') return fail(500, 'Internal Server Error', 'boom');
      if (gw.sendMode === 'unknown') return answer(409, { message: 'outcome unknown', error: 'Conflict', statusCode: 409, code: 'IDEMPOTENCY_OUTCOME_UNKNOWN' });
      if (gw.sendMode === 'reused') return answer(422, { message: 'key reused', error: 'Unprocessable Entity', statusCode: 422, code: 'IDEMPOTENCY_KEY_REUSED' });
      if (!gw.replies.has(key)) gw.replies.set(key, { messageId: `true_${body.chatId}_3EB0${gw.replies.size}`, timestamp: Math.floor(clock / 1000) });
      return answer(201, gw.replies.get(key));
    }
    return fail(404, 'Not Found', 'Cannot ' + req.method + ' ' + req.url);
  });
});
const gwSessionOf = account => [...gw.sessions.values()].find(s => s.name === 's1-' + account);

// ---- the sub-site with its link ----
const site = siteApi.create({ dir: path.join(tmp, 'main'), siteId: 's1', now: () => clock });
const link = openwaLink.create({ dir: path.join(tmp, 'main'), siteId: 's1', site, now: () => clock });
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  return pathname.startsWith('/api/wa/') ? link.handle(req, res, pathname) : site.handle(req, res, pathname);
});
let port, gwPort, lin, deliveries = 0;

const call = (pathname, { method = 'GET', body, cookie, headers = {}, base = `http://127.0.0.1:${port}` } = {}) =>
  fetch(base + pathname, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) })
    .then(async response => ({ status: response.status, raw: await response.text() }))
    .then(result => ({ ...result, json: JSON.parse(result.raw) }));
const cookieOf = response => response.setCookie.split(';')[0];
async function member(username, role, siteId, own = true) {
  const { password } = await site.auth.createUser({ username, role, name: username + ' name', site: siteId });
  const first = await fetch(`http://127.0.0.1:${port}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
  const cookie = cookieOf({ setCookie: first.headers.get('set-cookie') });
  if (own) assert.equal((await call('/api/auth/password', { method: 'POST', cookie, body: { current: password, next: PASSWORD } })).status, 200);
  return cookie;
}
function useSettings(values) {
  if (!values) return void delete process.env.WA_SCRM_OPENWA_ENV;
  fs.writeFileSync(settingsFile, Object.entries(values).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
  process.env.WA_SCRM_OPENWA_ENV = settingsFile;
}
const good = () => ({ OPENWA_BASE_URL: `http://127.0.0.1:${gwPort}/`, OPENWA_API_KEY: KEY, OPENWA_HOOK_URL: HOOK_URL, OPENWA_HOOK_SECRET: SECRET });
// What OpenWA posts to the hook: the body it signs, and its headers.
function deliver(sessionId, event, data, { key = `${event}_${++deliveries}`, secret = SECRET, signature, raw, headers = {} } = {}) {
  const body = raw ?? JSON.stringify({ event, timestamp: new Date(clock).toISOString(), sessionId, idempotencyKey: key, deliveryId: 'dlv_' + key, data });
  const header = signature === undefined ? 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex') : signature;
  return call('/api/wa/hook', { method: 'POST', body, headers: { ...(header ? { 'X-OpenWA-Signature': header } : {}), 'X-OpenWA-Event': event, 'User-Agent': 'OpenWA-Webhook/1.0.0', ...headers } });
}
const post = (pathname, body, cookie = lin) => call(pathname, { method: 'POST', cookie, body });
const feed = (client, after = 0, extra = '') => call(`/api/wa/events?after=${after}&client=${client}${extra}`, { cookie: lin });

test.before(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', () => { port = server.address().port; resolve(); }));
  await new Promise(resolve => gateway.listen(0, '127.0.0.1', () => { gwPort = gateway.address().port; resolve(); }));
  lin = await member('lin', 'agent', 's1');
});
test.after(() => {
  server.close(); server.closeAllConnections();
  gateway.close(); gateway.closeAllConnections();
  link.close(); site.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('without settings the link says so; every route but the hook needs the sub-site\'s employee', async () => {
  useSettings(null);
  assert.deepEqual((await call('/api/wa/status', { cookie: lin })).json, { configured: false, reason: 'no-settings-file' });
  assert.deepEqual([(await post('/api/wa/link', { account: 'a1' })).status, (await post('/api/wa/link', { account: 'a1' })).json], [503, { error: 'not-configured' }]);
  assert.deepEqual((await deliver('x', 'session.status', {})).json, { error: 'not-configured' });
  for (const [values, reason] of [[{ ...good(), OPENWA_BASE_URL: 'localhost:2785' }, 'missing-address'], [{ ...good(), OPENWA_API_KEY: '' }, 'missing-key'], [{ ...good(), OPENWA_HOOK_URL: '' }, 'missing-hook-address'], [{ ...good(), OPENWA_HOOK_SECRET: 'too-short' }, 'missing-hook-secret']]) {
    useSettings(values);
    assert.deepEqual(openwaLink.loadConfig(), { configured: false, reason });
  }
  useSettings(good());
  assert.deepEqual(openwaLink.loadConfig(), { configured: true, baseUrl: `http://127.0.0.1:${gwPort}`, key: KEY, hookUrl: HOOK_URL, hookSecret: SECRET });
  assert.deepEqual([(await call('/api/wa/status')).status, (await call('/api/wa/status')).json], [401, { error: 'not-signed-in' }]);
  assert.equal((await call('/api/wa/events?after=0&client=client-0001')).status, 401);
  const other = await member('eve', 'agent', 'elsewhere');
  assert.deepEqual([(await call('/api/wa/status', { cookie: other })).status, (await post('/api/wa/link', { account: 'a1' }, other)).status], [403, 403]);
  const boss = await member('boss', 'supervisor', null);
  assert.deepEqual((await call('/api/wa/status', { cookie: boss })).json, { configured: true, reachable: true, accounts: [] }, 'a supervisor reads the status');
  for (const [pathname, body] of [['/api/wa/link', { account: 'a1' }], ['/api/wa/unlink', { account: 'a1' }], ['/api/wa/send', { account: 'a1', to: '15550001111@c.us', text: 'x', requestId: 'req-00000000' }], ['/api/wa/claim', { client: 'client-0001' }]]) {
    assert.deepEqual((await post(pathname, body, boss)).json, { error: 'read-only' }, pathname);
  }
  assert.deepEqual((await call('/api/wa/events?after=0&client=client-0001', { cookie: boss })).json, { error: 'read-only' });
  const fresh = await member('newbie', 'agent', 's1', false);
  assert.deepEqual((await call('/api/wa/status', { cookie: fresh })).json, { error: 'password-change-required' });
  assert.deepEqual((await call('/api/wa/link', { method: 'POST', cookie: lin, body: { account: 'a1' }, headers: { 'Sec-Fetch-Site': 'cross-site' } })).json, { error: 'forbidden' }, 'not from a page of another site');
  assert.deepEqual([(await call('/api/wa/nothing', { cookie: lin })).status, (await call('/api/wa/send', { cookie: lin })).status], [404, 405]);
  assert.equal(gw.sessions.size, 0, 'nothing was created at OpenWA');
});

test('linking a number creates its session and webhook at OpenWA once, starts it and returns the QR code', async () => {
  const first = await post('/api/wa/link', { account: 'a1' });
  assert.deepEqual([first.status, first.json], [200, { account: 'a1', state: 'scan', phone: '', name: '', error: '', restricted: false, qr: QR }]);
  const session = gwSessionOf('a1');
  assert.deepEqual([gw.sessions.size, session.status], [1, 'qr_ready']);
  const [hook] = gw.hooks.get(session.id);
  assert.deepEqual([gw.hooks.get(session.id).length, hook.url, hook.events, hook.secret, hook.retryCount], [1, HOOK_URL, openwaLink.EVENTS, SECRET, 5]);
  assert(!hook.events.includes('session.qr') && !hook.events.includes('*'), 'QR codes are asked for, not pushed');
  const again = await post('/api/wa/link', { account: 'a1' });
  assert.deepEqual([again.json.state, gw.sessions.size, gw.hooks.get(session.id).length], ['scan', 1, 1], 'nothing is created twice');
  assert.deepEqual((await call('/api/wa/link?account=a1', { cookie: lin })).json, first.json);
  assert.deepEqual([(await call('/api/wa/link?account=zz', { cookie: lin })).status, (await call('/api/wa/link?account=zz', { cookie: lin })).json], [404, { error: 'unknown-account' }]);
  for (const account of ['', 'a-1', 'x'.repeat(25), 7]) assert.equal((await post('/api/wa/link', { account })).status, 400, String(account));
  assert.equal((await call('/api/wa/link', { method: 'POST', cookie: lin, body: 'account=a1', headers: { 'Content-Type': 'text/plain' } })).status, 400);
  Object.assign(session, { status: 'ready', phone: '15550009999', pushName: 'Lin Shop' });
  assert.deepEqual((await call('/api/wa/link?account=a1', { cookie: lin })).json, { account: 'a1', state: 'online', phone: '15550009999', name: 'Lin Shop', error: '', restricted: false }, 'no QR code once the number is linked');
  const linked = await post('/api/wa/link', { account: 'a1' });
  assert.deepEqual([linked.json.state, gw.calls.filter(c => c.endsWith('/start')).length], ['online', 1], 'a running session is not started again');
  assert.deepEqual((await call('/api/wa/status', { cookie: lin })).json, { configured: true, reachable: true, accounts: [{ account: 'a1', state: 'online', phone: '15550009999', name: 'Lin Shop', error: '', restricted: false }] });
  Object.assign(session, { status: 'action_required', lastError: 'Passkey step', restriction: { kind: 'temporary' } });
  assert.deepEqual((await call('/api/wa/link?account=a1', { cookie: lin })).json, { account: 'a1', state: 'attention', phone: '15550009999', name: 'Lin Shop', error: 'Passkey step', restricted: true });
  Object.assign(session, { status: 'ready', lastError: null, restriction: null });
});

test('an attempt that stopped half-way is completed; a session removed at OpenWA is made again', async () => {
  const left = gwSession('s1-a2');
  gw.sessions.set(left.id, left);
  gw.hooks.set(left.id, [{ id: 'old-hook', sessionId: left.id, url: HOOK_URL, events: ['*'], secret: 'an older secret', retryCount: 3 }, { id: 'foreign', sessionId: left.id, url: 'https://example.org/hook', events: ['*'], secret: 'x', retryCount: 3 }]);
  const linked = await post('/api/wa/link', { account: 'a2' });
  assert.deepEqual([linked.status, linked.json.state, gw.sessions.size], [200, 'scan', 2], 'the session of that name is taken over');
  assert.deepEqual(gw.hooks.get(left.id).map(h => [h.url, h.secret === SECRET || h.id]), [['https://example.org/hook', 'foreign'], [HOOK_URL, true]], 'the webhook that pointed here is replaced; another one is left alone');
  gw.sessions.delete(left.id);
  gw.hooks.delete(left.id);
  assert.deepEqual((await call('/api/wa/link?account=a2', { cookie: lin })).json, { account: 'a2', state: 'missing', phone: '', name: '', error: '', restricted: false });
  assert.equal((await call('/api/wa/status', { cookie: lin })).json.accounts.find(a => a.account === 'a2').state, 'missing');
  const anew = await post('/api/wa/link', { account: 'a2' });
  assert.deepEqual([anew.json.state, gwSessionOf('a2').id !== left.id, gw.hooks.get(gwSessionOf('a2').id).length], ['scan', true, 1]);
  gwSessionOf('a2').status = 'disconnected';
  assert.deepEqual([(await call('/api/wa/link?account=a2', { cookie: lin })).json.state, (await post('/api/wa/link', { account: 'a2' })).json.state], ['offline', 'scan'], 'a stopped session is started again');
});

test('a fresh QR code on request: a number that waits for the scan is started anew; a linked number is left alone', async () => {
  const first = await post('/api/wa/link', { account: 'a5' });
  assert.deepEqual([first.json.state, first.json.qr], ['scan', QR]);
  const session = gwSessionOf('a5');
  const stops = () => gw.calls.filter(c => c === `POST /api/sessions/${session.id}/stop`).length;
  assert.deepEqual([(await post('/api/wa/link', { account: 'a5' })).json.qr, stops()], [QR, 0], 'without the request the waiting session is left as it is');
  assert.deepEqual([(await post('/api/wa/link', { account: 'a5', fresh: 'yes' })).json.qr, stops()], [QR, 0], 'only the value true asks for a new code');
  const fresh = await post('/api/wa/link', { account: 'a5', fresh: true });
  assert.deepEqual([fresh.status, fresh.json.state, fresh.json.qr, stops(), gwSessionOf('a5').id], [200, 'scan', QR + '2', 1, session.id], 'the same session, stopped once and started again, with a new code');
  assert.deepEqual((await call('/api/wa/link?account=a5', { cookie: lin })).json.qr, QR + '2');
  Object.assign(session, { status: 'ready', phone: '15550005555' });
  assert.deepEqual([(await post('/api/wa/link', { account: 'a5', fresh: true })).json.state, stops()], ['online', 1], 'a linked number is never stopped');
  assert.equal((await post('/api/wa/unlink', { account: 'a5' })).status, 200);
});

test('OpenWA down, or refusing the key: the status says so and nothing is half-done', async () => {
  const dead = await new Promise(resolve => { const s = http.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
  useSettings({ ...good(), OPENWA_BASE_URL: `http://127.0.0.1:${dead}` });
  const down = (await call('/api/wa/status', { cookie: lin })).json;
  assert.deepEqual([down.reachable, down.accounts.map(a => a.state)], [false, ['unknown', 'unknown']]);
  assert.deepEqual([(await post('/api/wa/link', { account: 'a3' })).status, (await post('/api/wa/link', { account: 'a3' })).json], [502, { error: 'gateway-unreachable' }]);
  assert.deepEqual((await post('/api/wa/send', { account: 'a1', to: '15550001111@c.us', text: 'x', requestId: 'req-down-0001' })).json, { error: 'gateway-unreachable' });
  useSettings({ ...good(), OPENWA_API_KEY: 'wrong' });
  assert.deepEqual((await call('/api/wa/status', { cookie: lin })).json.reachable, false);
  assert.deepEqual([(await post('/api/wa/link', { account: 'a3' })).status, (await post('/api/wa/link', { account: 'a3' })).json], [502, { error: 'gateway-refused' }]);
  useSettings(good());
  assert.equal(link.store.account('a3'), undefined);
  assert.equal(gwSessionOf('a3'), undefined);
});

test('the hook stores only signed deliveries of the sub-site\'s numbers, once each', async () => {
  const id = gwSessionOf('a1').id;
  const before = link.store.lastEvent();
  const message = { id: 'false_15550001111@c.us_AAA1', from: '15550001111@c.us', to: '15550009999@c.us', chatId: '15550001111@c.us', body: 'Hi there', type: 'image', timestamp: 1795000000, fromMe: false, isGroup: false, kind: 'individual', media: { mimetype: 'image/jpeg', data: 'QUJDREVGRw==', sizeBytes: 7 } };
  assert.deepEqual([(await deliver(id, 'message.received', message, { signature: '' })).status, (await deliver(id, 'message.received', message, { signature: 'sha256=' + '0'.repeat(64) })).json], [401, { error: 'bad-signature' }]);
  assert.equal((await deliver(id, 'message.received', message, { secret: 'an older secret' })).status, 401);
  assert.equal((await deliver(id, 'message.received', message, { signature: 'sha256=short' })).status, 401);
  assert.equal(link.store.lastEvent(), before, 'nothing unsigned is stored');
  assert.deepEqual((await deliver(id, 'message.received', null, { raw: 'not json' })).json, { error: 'invalid-request' });
  assert.deepEqual((await deliver(id, 'message.received', null, { raw: JSON.stringify({ event: 'message.received', sessionId: id }) })).json, { error: 'invalid-request' });
  assert.deepEqual((await deliver(uuid(), 'message.received', message)).json, { ok: true, stored: false }, 'a session that is not ours is acknowledged and dropped');
  assert.deepEqual((await deliver(id, 'session.qr', { sessionId: id, qr: QR })).json, { ok: true, stored: false }, 'an event that is not used is dropped');
  const stored = await deliver(id, 'message.received', message, { key: 'msg_once', headers: { 'Sec-Fetch-Site': 'cross-site' } });
  assert.deepEqual([stored.status, stored.json], [200, { ok: true, stored: true }], 'no cookie is needed');
  assert.deepEqual((await deliver(id, 'message.received', message, { key: 'msg_once' })).json, { ok: true, stored: false }, 'a repeated delivery is acknowledged, not stored again');
  const rows = link.store.eventsAfter(before, 10);
  assert.deepEqual(rows.map(r => [r.account, r.name, r.at]), [['a1', 'message.received', new Date(clock).toISOString()]]);
  assert.deepEqual(JSON.parse(rows[0].body).media, { mimetype: 'image/jpeg', sizeBytes: 7 }, 'the bytes of a picture are not kept');
  assert.equal((await call('/api/wa/hook', { cookie: lin })).status, 405);
  assert.equal((await deliver(id, 'message.received', null, { raw: 'x'.repeat(4 * 1024 * 1024 + 1) })).status, 413);
});

test('the feed gives the deliveries in this project\'s own form, in order', async () => {
  const id = gwSessionOf('a1').id;
  const start = link.store.lastEvent();
  const send = (event, data) => deliver(id, event, data).then(r => assert.deepEqual(r.json, { ok: true, stored: true }));
  await send('message.received', { id: 'false_22334455667788@lid_B1', from: '22334455667788@lid', to: '15550009999@c.us', chatId: '22334455667788@lid', body: 'Hola', type: 'text', timestamp: 1795000100, fromMe: false, isGroup: false, kind: 'individual', isLidSender: true, senderPhone: '34600111222', contact: { pushName: 'Ana' } });
  await send('message.received', { id: 'false_15550001111@c.us_B2', from: '15550001111@c.us', to: '15550009999@c.us', chatId: '15550001111@c.us', body: '', type: 'voice', timestamp: 1795000101, fromMe: false, isGroup: false, kind: 'individual', contact: { name: 'Bo Saved', pushName: 'Bo' }, media: { mimetype: 'audio/ogg; codecs=opus', omitted: true, sizeBytes: 4321 } });
  await send('message.sent', { id: 'true_15550001111@c.us_B3', from: '15550009999@c.us', to: '15550001111@c.us', chatId: '15550001111@c.us', body: 'On my way', type: 'text', timestamp: 1795000102, fromMe: true, isGroup: false, kind: 'individual', contact: { pushName: 'Lin Shop' } });
  await send('message.received', { id: 'false_1203630@g.us_B4', from: '1203630@g.us', to: '15550009999@c.us', chatId: '1203630@g.us', body: 'group talk', type: 'text', timestamp: 1795000103, fromMe: false, isGroup: true, kind: 'group', author: '15550001111@c.us' });
  await send('message.ack', { id: 'true_15550001111@c.us_B3', messageId: 'true_15550001111@c.us_B3', status: 'read', ack: 3, chatId: '15550001111@c.us' });
  await send('message.ack', { id: 'x', messageId: 'x', status: 'pending', ack: 0 });
  await send('message.revoked', { id: 'false_15550001111@c.us_B9', revokedId: 'false_15550001111@c.us_B2', chatId: '15550001111@c.us', from: '15550001111@c.us', to: '15550009999@c.us', type: 'revoked', body: '', timestamp: 1795000104 });
  await send('message.edited', { messageId: 'false_22334455667788@lid_B1', chatId: '22334455667788@lid', body: 'Hola!', senderId: '22334455667788@lid', fromMe: false, isGroup: false, type: 'text' });
  await send('session.status', { sessionId: id, status: 'authenticating' });
  await send('session.authenticated', { sessionId: id, phone: '15550009999', pushName: 'Lin Shop' });
  await send('session.disconnected', { sessionId: id, reason: 'LOGOUT' });
  await send('session.restriction', { sessionId: id, active: true, kind: 'temporary', code: 'TEMP_BAN', expiresAt: null });
  await send('message.received', { id: 'status_B5', from: 'status@broadcast', to: '15550009999@c.us', chatId: 'status@broadcast', body: 'a status', type: 'text', timestamp: 1795000105, fromMe: false, isGroup: false, kind: 'status', isStatusBroadcast: true });
  const claimed = await post('/api/wa/claim', { client: 'client-feed-1' });
  assert.deepEqual(claimed.json, { ok: true, last: start + 13 });
  const read = await feed('client-feed-1', start);
  const at = seconds => seconds * 1000;
  assert.deepEqual(read.json, { last: start + 13, events: [
    { seq: start + 1, account: 'a1', kind: 'message', id: 'false_22334455667788@lid_B1', chat: '22334455667788@lid', fromMe: false, type: 'text', text: 'Hola', at: at(1795000100), name: 'Ana', phone: '34600111222', media: null },
    { seq: start + 2, account: 'a1', kind: 'message', id: 'false_15550001111@c.us_B2', chat: '15550001111@c.us', fromMe: false, type: 'voice', text: '', at: at(1795000101), name: 'Bo Saved', phone: '15550001111', media: { mime: 'audio/ogg; codecs=opus', name: '', size: 4321 } },
    { seq: start + 3, account: 'a1', kind: 'message', id: 'true_15550001111@c.us_B3', chat: '15550001111@c.us', fromMe: true, type: 'text', text: 'On my way', at: at(1795000102), name: '', phone: '15550001111', media: null },
    { seq: start + 5, account: 'a1', kind: 'receipt', id: 'true_15550001111@c.us_B3', status: 'read' },
    { seq: start + 7, account: 'a1', kind: 'revoked', id: 'false_15550001111@c.us_B2', chat: '15550001111@c.us' },
    { seq: start + 8, account: 'a1', kind: 'edited', id: 'false_22334455667788@lid_B1', chat: '22334455667788@lid', text: 'Hola!' },
    { seq: start + 9, account: 'a1', kind: 'state', state: 'verifying' },
    { seq: start + 10, account: 'a1', kind: 'state', state: 'online', phone: '15550009999', name: 'Lin Shop' },
    { seq: start + 11, account: 'a1', kind: 'state', state: 'offline', reason: 'LOGOUT' },
    { seq: start + 12, account: 'a1', kind: 'restriction', active: true, code: 'TEMP_BAN' },
  ] }, 'group, status and unknown-receipt deliveries are left out, and the position still moves past them');
  assert.deepEqual((await feed('client-feed-1', start + 13)).json, { events: [], last: start + 13 });
  assert.deepEqual((await feed('client-feed-1', start + 10)).json.events.map(e => e.seq), [start + 11, start + 12]);
  for (const query of ['after=-1&client=client-feed-1', 'after=1.5&client=client-feed-1', 'after=0&client=short', 'after=0&client=client-feed-1&wait=abc']) assert.equal((await call('/api/wa/events?' + query, { cookie: lin })).status, 400, query);
  assert.equal((await post('/api/wa/claim', { client: 'no' })).status, 400);
});

test('one page reads the feed: a page that claims it takes it over, also from a page that is waiting', async () => {
  const last = (await post('/api/wa/claim', { client: 'client-page-A' })).json.last;
  assert.equal((await feed('client-page-A', last)).status, 200);
  await post('/api/wa/claim', { client: 'client-page-B' });
  assert.deepEqual([(await feed('client-page-A', last)).status, (await feed('client-page-A', last)).json], [409, { error: 'taken-over' }]);
  assert.equal((await feed('client-page-B', last)).status, 200);
  const began = Date.now();
  const waitingB = feed('client-page-B', last, '&wait=20');
  await new Promise(resolve => setTimeout(resolve, 150));
  await post('/api/wa/claim', { client: 'client-page-A' });
  assert.deepEqual((await waitingB).json, { error: 'taken-over' });
  assert(Date.now() - began < 5000, 'the waiting page is told at once');
});

test('a waiting read answers as soon as a delivery arrives, and with nothing when the time is up', async () => {
  const id = gwSessionOf('a1').id;
  const last = (await post('/api/wa/claim', { client: 'client-wait-1' })).json.last;
  let began = Date.now();
  const waiting = feed('client-wait-1', last, '&wait=20');
  await new Promise(resolve => setTimeout(resolve, 150));
  await deliver(id, 'session.status', { sessionId: id, status: 'ready' });
  assert.deepEqual((await waiting).json, { last: last + 1, events: [{ seq: last + 1, account: 'a1', kind: 'state', state: 'online' }] });
  assert(Date.now() - began < 5000);
  began = Date.now();
  assert.deepEqual((await feed('client-wait-1', last + 1, '&wait=1')).json, { events: [], last: last + 1 });
  assert(Date.now() - began >= 900 && Date.now() - began < 5000);
});

test('sending: one message per request, however often the request is repeated', async () => {
  gwSessionOf('a1').status = 'ready';
  gw.sends.length = 0;
  const request = { account: 'a1', to: '15550001111@c.us', text: 'hello', requestId: 'req-00000001' };
  const sent = await post('/api/wa/send', request);
  assert.deepEqual([sent.status, sent.json], [200, { messageId: 'true_15550001111@c.us_3EB00', timestamp: clock }]);
  assert.deepEqual(gw.sends, [{ sessionId: gwSessionOf('a1').id, key: 's1-req-00000001', body: { chatId: '15550001111@c.us', text: 'hello' } }]);
  assert.deepEqual((await post('/api/wa/send', request)).json, sent.json);
  assert.equal(gw.sends.length, 1, 'the repeated request does not reach OpenWA');
  assert.deepEqual([(await post('/api/wa/send', { ...request, text: 'other' })).status, (await post('/api/wa/send', { ...request, text: 'other' })).json], [409, { error: 'request-conflict' }]);
  assert.deepEqual((await post('/api/wa/send', { ...request, to: '22334455667788@lid', requestId: 'req-00000002' })).status, 200, 'a privacy id is a valid chat');
  for (const [change, status] of [[{ to: '1203630@g.us' }, 400], [{ to: 'status@broadcast' }, 400], [{ to: '15550001111' }, 400], [{ text: '   ' }, 400], [{ text: 7 }, 400], [{ requestId: 'short' }, 400], [{ text: 'x'.repeat(4097) }, 413], [{ account: 'zz' }, 404]]) {
    assert.equal((await post('/api/wa/send', { ...request, requestId: 'req-invalid-1', ...change })).status, status, JSON.stringify(change).slice(0, 40));
  }
  assert.equal(gw.sends.length, 2);
});

test('sending while the number is not connected, and answers that leave the outcome open', async () => {
  const session = gwSessionOf('a1');
  gw.sends.length = 0;
  const request = { account: 'a1', to: '15550001111@c.us', text: 'later', requestId: 'req-00000010' };
  session.status = 'qr_ready';
  assert.deepEqual([(await post('/api/wa/send', request)).status, (await post('/api/wa/send', request)).json], [409, { error: 'not-connected' }]);
  session.status = 'ready';
  assert.equal((await post('/api/wa/send', request)).status, 200, 'the same request goes out once the number is back');
  assert.deepEqual(gw.sends.map(s => s.key), ['s1-req-00000010', 's1-req-00000010', 's1-req-00000010']);
  const open = { ...request, requestId: 'req-00000011' };
  gw.sendMode = 'error';
  assert.deepEqual([(await post('/api/wa/send', open)).status, (await post('/api/wa/send', open)).json], [409, { error: 'outcome-unknown' }]);
  gw.sendMode = 'unknown';
  assert.deepEqual((await post('/api/wa/send', open)).json, { error: 'outcome-unknown' });
  gw.sendMode = 'reused';
  assert.deepEqual((await post('/api/wa/send', open)).json, { error: 'request-conflict' });
  gw.sendMode = 'ok';
  assert.equal((await post('/api/wa/send', open)).status, 200);
  assert.deepEqual(gw.sends.slice(3).map(s => s.key), Array(5).fill('s1-req-00000011'), 'OpenWA gets the same key every time');
  session.status = 'disconnected';
  assert.deepEqual((await post('/api/wa/send', { ...request, requestId: 'req-00000012' })).json, { error: 'send-refused' });
  session.status = 'ready';
});

test('unlinking removes the session at OpenWA and the record; later deliveries of it are dropped', async () => {
  await post('/api/wa/link', { account: 'a4' });
  const id = gwSessionOf('a4').id;
  gwSessionOf('a4').status = 'ready';
  assert.deepEqual((await deliver(id, 'session.status', { sessionId: id, status: 'ready' })).json, { ok: true, stored: true });
  assert.deepEqual((await post('/api/wa/unlink', { account: 'a4' })).json, { ok: true });
  assert.deepEqual([gw.sessions.has(id), link.store.account('a4'), gw.calls.includes(`POST /api/sessions/${id}/logout`)], [false, undefined, true]);
  assert.deepEqual((await deliver(id, 'session.status', { sessionId: id, status: 'disconnected' })).json, { ok: true, stored: false });
  assert.deepEqual((await post('/api/wa/unlink', { account: 'a4' })).json, { error: 'unknown-account' });
  assert.equal((await post('/api/wa/unlink', { account: 'a2' })).status, 200, 'a number that was never scanned can be removed too');
  assert.deepEqual((await call('/api/wa/status', { cookie: lin })).json.accounts.map(a => a.account), ['a1']);
});

test('the log names actions and numbers, never a key, a secret, a phone number or message text', () => {
  const lines = logged.filter(line => line.startsWith('wa '));
  for (const expected of ['wa link ok account=a1 state=scan', 'wa hook stored event=message.received account=a1', 'wa send ok account=a1 chars=5', 'wa send failed account=a1 error=not-connected upstream=409', 'wa unlink ok account=a4', 'error=gateway-unreachable', 'error=gateway-refused']) {
    assert(lines.some(line => line.includes(expected)), expected);
  }
  for (const secret of [KEY, SECRET, '15550001111', '15550009999', 'hello', 'Hola', 'On my way', QR]) assert(!lines.some(line => line.includes(secret)), secret);
  const stored = ['wa-s1.db', 'wa-s1.db-wal'].map(name => path.join(tmp, 'main', name)).filter(file => fs.existsSync(file)).map(file => fs.readFileSync(file).toString('latin1')).join('');
  assert(!stored.includes(KEY) && !stored.includes(SECRET), 'the link\'s records hold neither the key nor the secret');
  assert.equal(fs.statSync(path.join(tmp, 'main', 'wa-s1.db')).mode & 0o077, 0, 'the records are private');
});

test('the preview server: /api/wa/ is off without a data folder and asks for sign-in with one', async () => {
  const start = env => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, 'serve.cjs'), '0'], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', chunk => { out += chunk; const m = out.match(/PREVIEW_URL=(http:\/\/127\.0\.0\.1:\d+)/); if (m) resolve({ child, base: m[1] }); });
    child.on('exit', code => reject(new Error('serve.cjs exited early: ' + code)));
    setTimeout(() => reject(new Error('serve.cjs did not start')), 8000);
  });
  const off = await start({ WA_SCRM_DATA_DIR: '', WA_SCRM_AI_ENV: '' });
  try {
    assert.deepEqual((await call('/api/wa/status', { base: off.base })).json, { configured: false, reason: 'not-enabled' });
    const linkOff = await call('/api/wa/link', { base: off.base, method: 'POST', body: { account: 'a1' } });
    assert.deepEqual([linkOff.status, linkOff.json], [503, { error: 'not-enabled' }]);
  } finally {
    off.child.kill();
  }
  const dir = path.join(tmp, 'served');
  const setup = siteApi.create({ dir, siteId: 'default' });
  const { password } = await setup.auth.createUser({ username: 'lia', role: 'agent', name: 'Lia', site: 'default' });
  setup.close();
  const on = await start({ WA_SCRM_DATA_DIR: dir, WA_SCRM_SITE_ID: '', WA_SCRM_AI_ENV: '', WA_SCRM_OPENWA_ENV: settingsFile });
  try {
    assert.deepEqual((await call('/api/wa/status', { base: on.base })).json, { error: 'not-signed-in' });
    const login = await fetch(on.base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'lia', password }) });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    assert.equal((await call('/api/auth/password', { base: on.base, method: 'POST', cookie, body: { current: password, next: PASSWORD } })).status, 200);
    assert.deepEqual((await call('/api/wa/status', { base: on.base, cookie })).json, { configured: true, reachable: true, accounts: [] });
    const linked = await call('/api/wa/link', { base: on.base, method: 'POST', cookie, body: { account: 'b1' } });
    assert.deepEqual([linked.status, linked.json.state, Boolean([...gw.sessions.values()].find(s => s.name === 'default-b1'))], [200, 'scan', true]);
    assert.equal((await call('/api/wa/hook', { base: on.base, method: 'POST', body: '{}' })).status, 401, 'the hook is there and wants a signature');
    assert(fs.existsSync(path.join(dir, 'wa-default.db')));
  } finally {
    on.child.kill();
  }
});
