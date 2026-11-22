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
const gw = { sessions: new Map(), hooks: new Map(), sends: [], files: [], calls: [], sendMode: 'ok', replies: new Map(), chats: new Map(), history: new Map(), contacts: new Map(), media: new Map() };
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
    const [, , , sessionId, action, third, fourth, fifth] = req.url.split('?')[0].split('/');
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
    // The media of a message: the copy OpenWA stored when the message came in or went out, as an attachment.
    if (action === 'messages' && fifth === 'media') {
      const stored = gw.media.get(decodeURIComponent(fourth));
      if (!stored) return fail(404, 'Not Found', 'No stored media for this message');
      res.writeHead(200, { 'Content-Type': stored.mimetype, 'Content-Disposition': `attachment; filename="${stored.filename}"` });
      return res.end(stored.bytes);
    }
    // What is on the number: its chats, the latest messages of one chat, and the contact behind a privacy id.
    if (action === 'chats' || (action === 'messages' && fourth === 'history')) {
      if (session.status !== 'ready') return fail(409, 'Conflict', 'Session is not connected. The WhatsApp client is not ready.');
      if (action === 'chats') return answer(200, gw.chats.get(sessionId) || []);
      const limit = Number(new URL(req.url, 'http://localhost').searchParams.get('limit')) || 50;
      return answer(200, (gw.history.get(decodeURIComponent(third)) || []).slice(-limit));
    }
    if (action === 'contacts') return gw.contacts.has(decodeURIComponent(third)) ? answer(200, gw.contacts.get(decodeURIComponent(third))) : fail(404, 'Not Found', 'Contact not found');
    if (action === 'messages' && /^send-(text|image|video|audio|document)$/.test(third) && !fourth) {
      const key = req.headers['idempotency-key'];
      // A text is noted as it is, a file by its route, its fingerprint and what came with it.
      if (third === 'send-text') gw.sends.push({ sessionId, key, body });
      else gw.files.push({ route: third, key, chatId: body.chatId, mimetype: body.mimetype, filename: body.filename, caption: body.caption, sha: crypto.createHash('sha256').update(Buffer.from(body.base64, 'base64')).digest('hex') });
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

// ---- the stand-in for the speech service (an OpenAI-compatible /audio/transcriptions) ----
const speech = { mode: 'ok', calls: [] };
const speechServer = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('latin1'), file = /name="file"; filename="([^"]*)"\r\nContent-Type: ([^\r]*)\r\n\r\n/.exec(raw);
    speech.calls.push({ auth: req.headers.authorization, file: file?.[1], bytes: file ? raw.indexOf('\r\n--', file.index + file[0].length) - file.index - file[0].length : -1 });
    if (speech.mode === 'error') { res.writeHead(500, { 'Content-Type': 'application/json' }); return res.end('{"error":{"message":"boom"}}'); }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    setTimeout(() => res.end(JSON.stringify({ text: speech.mode === 'silent' ? '' : ' Hola, quiero dos cajas. ' })), 30);
  });
});
const voiceFile = path.join(tmp, 'ai.env');

// ---- the sub-site with its link ----
const site = siteApi.create({ dir: path.join(tmp, 'main'), siteId: 's1', now: () => clock });
// The link under test catches up only when a test asks for it or a number comes online, and without pauses.
const link = openwaLink.create({ dir: path.join(tmp, 'main'), siteId: 's1', site, now: () => clock, sync: { every: 0, pause: 0, delay: 20 } });
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
  speechServer.close(); speechServer.closeAllConnections();
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
  await send('message.edited', { messageId: 'false_15550001111@c.us_B2', chatId: '15550001111@c.us', body: '', senderId: '15550001111@c.us', fromMe: false, isGroup: false, type: 'image', hasMedia: true });
  const claimed = await post('/api/wa/claim', { client: 'client-feed-1' });
  assert.deepEqual(claimed.json, { ok: true, last: start + 14 });
  const read = await feed('client-feed-1', start);
  const at = seconds => seconds * 1000;
  assert.deepEqual(read.json, { last: start + 14, events: [
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
  ] }, 'group, status and unknown-receipt deliveries and an edit without text are left out, and the position still moves past them');
  assert.deepEqual((await feed('client-feed-1', start + 14)).json, { events: [], last: start + 14 });
  assert.deepEqual((await feed('client-feed-1', start + 13)).json, { events: [], last: start + 14 });
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

test('when a number comes online, its chats with one person and their latest messages are fetched into the feed', async () => {
  await post('/api/wa/link', { account: 'a6' });
  const session = gwSessionOf('a6');
  Object.assign(session, { status: 'ready', phone: '15550006666' });
  const t = 1795100000;
  const message = (chat, n, extra = {}) => ({ id: `${extra.fromMe ? 'true' : 'false'}_${chat}_H${n}`, from: extra.fromMe ? '15550006666@c.us' : chat, to: extra.fromMe ? chat : '15550006666@c.us', chatId: chat, body: 'history ' + n, type: 'text', timestamp: t + n, fromMe: false, isGroup: false, kind: 'individual', ...extra });
  const ana = '111222333444555@lid', bo = '15550007777@c.us';
  gw.chats.set(session.id, [
    { id: ana, name: 'Ana Saved', isGroup: false, kind: 'individual', unreadCount: 2, timestamp: t + 4, lastMessage: 'x', lastMessageType: 'text', archived: false, pinned: false, muted: false },
    { id: bo, name: 'Bo', isGroup: false, kind: 'individual', unreadCount: 0, timestamp: t + 1, lastMessage: 'x', lastMessageType: 'text' },
    { id: '1203630299@g.us', name: 'A group', isGroup: true, kind: 'group', unreadCount: 5, timestamp: t + 9 },
    { id: '0@c.us', name: 'WhatsApp', isGroup: false, kind: 'individual', unreadCount: 0, timestamp: t + 9 },
    { id: '120363@newsletter', name: 'A channel', isGroup: false, kind: 'channel', unreadCount: 0, timestamp: t + 9 },
  ]);
  gw.history.set(ana, [message(ana, 1, { isLidSender: true, contact: { name: 'Ana Saved', pushName: 'Ana' } }), message(ana, 2, { fromMe: true }), message(ana, 3, { type: 'unknown', body: 'x'.repeat(9000) }), message(ana, 4, { type: 'call', body: '', call: { video: false, missed: true } })]);
  gw.history.set(bo, [message(bo, 1, { body: 'y'.repeat(5000), type: 'image', media: { mimetype: 'image/jpeg', data: 'QUJD', sizeBytes: 3 } })]);
  gw.history.set('1203630299@g.us', [message('1203630299@g.us', 1, { isGroup: true, kind: 'group' })]);
  gw.contacts.set(ana, { id: '34600111222@c.us', name: 'Ana Saved', pushName: 'Ana', number: '34600111222', isMyContact: true, isBlocked: false });
  const start = link.store.lastEvent();
  gw.calls.length = 0;
  assert.deepEqual((await deliver(session.id, 'session.authenticated', { sessionId: session.id, phone: '15550006666', pushName: 'Shop Six' })).json, { ok: true, stored: true });
  for (let i = 0; i < 100 && link.store.lastEvent() < start + 7; i++) await new Promise(resolve => setTimeout(resolve, 20));
  await post('/api/wa/claim', { client: 'client-sync-01' });
  const read = (await feed('client-sync-01', start)).json;
  assert.deepEqual(read.events.map(e => e.kind + ':' + (e.history ? 'history' : e.kind === 'chat' ? e.chat : 'live')), ['state:live', 'chat:' + ana, 'message:history', 'message:history', 'message:history', 'chat:' + bo, 'message:history']);
  assert.deepEqual(read.events[1], { seq: start + 2, account: 'a6', kind: 'chat', chat: ana, name: 'Ana Saved', phone: '34600111222', unread: 2, at: (t + 4) * 1000 }, 'the phone number behind a privacy id comes from the contact');
  assert.deepEqual(read.events[5], { seq: start + 6, account: 'a6', kind: 'chat', chat: bo, name: 'Bo', phone: '15550007777', unread: 0, at: (t + 1) * 1000 });
  assert.deepEqual(read.events.slice(2, 5).map(e => [e.id, e.fromMe, e.type, e.text, e.at, e.name, e.history]), [
    [`false_${ana}_H1`, false, 'text', 'history 1', (t + 1) * 1000, 'Ana Saved', true],
    [`true_${ana}_H2`, true, 'text', 'history 2', (t + 2) * 1000, '', true],
    [`false_${ana}_H4`, false, 'call', '', (t + 4) * 1000, '', true],
  ], 'oldest first; what WhatsApp shows as a notice of its own is left out');
  assert.deepEqual([read.events[6].text.length, read.events[6].media], [4096, { mime: 'image/jpeg', name: '', size: 3 }], 'a long text is cut and the bytes of a picture are not kept');
  assert.deepEqual(gw.calls, [`GET /api/sessions/${session.id}/chats?limit=1000`, `GET /api/sessions/${session.id}/messages/${encodeURIComponent(ana)}/history?limit=50`, `GET /api/sessions/${session.id}/contacts/${encodeURIComponent(ana)}`, `GET /api/sessions/${session.id}/messages/${encodeURIComponent(bo)}/history?limit=50`], 'only chats with one person are read: not the group, the channel or the chat of WhatsApp itself');
  assert(logged.some(line => line === 'wa sync ok account=a6 chats=2 messages=4'));
});

test('catching up again fetches only what is new; what the hook delivered is not fetched; a number that is not connected is left alone', async () => {
  const session = gwSessionOf('a6'), ana = '111222333444555@lid', bo = '15550007777@c.us', cy = '999888777666@lid', t = 1795100000;
  const historyCalls = () => gw.calls.filter(c => c.includes('/history')).length;
  const base = { from: 'x', to: 'y', type: 'text', fromMe: false, isGroup: false, kind: 'individual' };
  gw.calls.length = 0;
  let last = link.store.lastEvent();
  await link.sync('a6');
  assert.deepEqual([historyCalls(), link.store.lastEvent()], [0, last], 'nothing is newer: one look at the list of chats, nothing fetched');
  // a message the hook never delivered
  Object.assign(gw.chats.get(session.id)[0], { timestamp: t + 20, unreadCount: 3 });
  gw.history.get(ana).push({ ...base, id: `false_${ana}_H5`, chatId: ana, body: 'missed by the hook', timestamp: t + 20 });
  await link.sync('a6');
  assert.deepEqual([historyCalls(), link.store.lastEvent()], [1, last + 2], 'the chat with something newer is read once');
  assert.deepEqual(link.store.eventsAfter(last, 5).map(r => r.name), ['sync.chat', 'sync.message'], 'its state, and the one message that was not known');
  last += 2;
  // a message the hook delivered: the list of chats shows it too, and it is not fetched
  assert.equal((await deliver(session.id, 'message.received', { ...base, id: `false_${bo}_L1`, chatId: bo, body: 'live', timestamp: t + 30 })).json.stored, true);
  gw.chats.get(session.id)[1].timestamp = t + 30;
  gw.history.get(bo).push({ ...base, id: `false_${bo}_L1`, chatId: bo, body: 'live', timestamp: t + 30 });
  await link.sync('a6');
  assert.deepEqual([historyCalls(), link.store.lastEvent()], [1, last + 1], 'only the delivery itself is in the feed');
  last += 1;
  // a chat that is new on the number and already got a message through the hook is still read once
  assert.equal((await deliver(session.id, 'message.received', { ...base, id: `false_${cy}_L1`, chatId: cy, body: 'first contact', timestamp: t + 40 })).json.stored, true);
  gw.chats.get(session.id).push({ id: cy, name: 'Cy', isGroup: false, kind: 'individual', unreadCount: 1, timestamp: t + 40 });
  gw.history.set(cy, [{ ...base, id: `false_${cy}_L0`, chatId: cy, body: 'before the link', timestamp: t - 500 }, { ...base, id: `false_${cy}_L1`, chatId: cy, body: 'first contact', timestamp: t + 40 }]);
  await link.sync('a6');
  assert.deepEqual([historyCalls(), link.store.eventsAfter(last + 1, 9).map(r => r.name)], [2, ['sync.chat', 'sync.message', 'sync.message']]);
  await link.sync('a6');
  assert.equal(historyCalls(), 2, 'and not again');
  // two runs at once are one run; a number that is not connected is left alone; so is a number nobody knows
  gw.chats.get(session.id)[0].timestamp = t + 50;
  await Promise.all([link.sync('a6'), link.sync('a6')]);
  assert.equal(historyCalls(), 3);
  session.status = 'disconnected';
  gw.chats.get(session.id)[0].timestamp = t + 60;
  gw.calls.length = 0;
  await link.sync('a6');
  assert.deepEqual(gw.calls, [`GET /api/sessions/${session.id}/chats?limit=1000`], 'the list is asked for, refused, and nothing else happens');
  await link.sync('zz');
  assert.equal(gw.calls.length, 1);
  session.status = 'ready';
  assert.equal((await post('/api/wa/unlink', { account: 'a6' })).status, 200);
  assert.equal(link.store.chat('a6', ana), undefined, 'unlinking forgets what was known about the number\'s chats');
});

test('the media of a message: the stored copy, or the chat read again for a fetched message; kept after the first time; shown inside the page only when its bytes say what it is', async () => {
  await post('/api/wa/link', { account: 'a7' });
  const session = gwSessionOf('a7'), chat = '15550008888@c.us', lid = '222333444555666@lid';
  Object.assign(session, { status: 'ready', phone: '15550007070' });
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 7)]);
  const ogg = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(64, 1)]);
  const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(64, 2)]);
  const page = Buffer.from('<!doctype html><script>alert(1)</script>' + ' '.repeat(40));
  const media = (query, cookie = lin) => fetch(`http://127.0.0.1:${port}/api/wa/media?${query}`, { headers: cookie ? { Cookie: cookie } : {} })
    .then(async r => ({ status: r.status, type: r.headers.get('content-type'), disposition: r.headers.get('content-disposition'), nosniff: r.headers.get('x-content-type-options'), csp: r.headers.get('content-security-policy'), cache: r.headers.get('cache-control'), bytes: Buffer.from(await r.arrayBuffer()) }));
  const q = (c, id, extra = '') => `account=a7&chat=${encodeURIComponent(c)}&id=${encodeURIComponent(id)}${extra}`;
  const storedCalls = () => gw.calls.filter(c => c.endsWith('/media')).length, readCalls = () => gw.calls.filter(c => c.includes('includeMedia=true')).length;
  gw.calls.length = 0;

  // a message that came in while the number was linked: OpenWA has its copy
  gw.media.set(`false_${chat}_M1`, { mimetype: 'image/jpeg', filename: 'photo.jpg', bytes: jpeg });
  const first = await media(q(chat, `false_${chat}_M1`));
  assert.deepEqual([first.status, first.type, first.disposition, first.nosniff, first.csp, first.cache], [200, 'image/jpeg', 'inline', 'nosniff', "sandbox; default-src 'none'", 'private, max-age=31536000, immutable']);
  assert(first.bytes.equals(jpeg));
  assert.deepEqual([storedCalls(), readCalls()], [1, 0]);
  // kept: the second time OpenWA is not asked; as a download it is the same bytes under the file's name
  const again = await media(q(chat, `false_${chat}_M1`, '&download=1'));
  assert.deepEqual([again.status, again.type, again.disposition, storedCalls()], [200, 'application/octet-stream', "attachment; filename*=UTF-8''photo.jpg", 1]);
  assert(again.bytes.equals(jpeg));

  // messages fetched while catching up: OpenWA has no copy; the chat is read once with its media, for all of them
  gw.history.set(lid, [
    { id: `false_${lid}_V1`, chatId: lid, type: 'voice', body: '', timestamp: 1795200001, fromMe: false, media: { mimetype: 'audio/ogg; codecs=opus', data: ogg.toString('base64') } },
    { id: `true_${lid}_D1`, chatId: lid, type: 'document', body: 'the offer', timestamp: 1795200002, fromMe: true, media: { mimetype: 'application/pdf', filename: '报价 2026.pdf', data: pdf.toString('base64') } },
    { id: `false_${lid}_X1`, chatId: lid, type: 'image', body: '', timestamp: 1795200003, fromMe: false, media: { mimetype: 'image/png', filename: 'picture.png', data: page.toString('base64') } },
    { id: `false_${lid}_T1`, chatId: lid, type: 'text', body: 'no media here', timestamp: 1795200004, fromMe: false },
  ]);
  const [voice, doc] = await Promise.all([media(q(lid, `false_${lid}_V1`)), media(q(lid, `true_${lid}_D1`))]);
  assert.deepEqual([voice.status, voice.type, voice.disposition], [200, 'audio/ogg', 'inline']);
  assert(voice.bytes.equals(ogg));
  assert.deepEqual([doc.status, doc.type, doc.disposition], [200, 'application/octet-stream', `attachment; filename*=UTF-8''${encodeURIComponent('报价 2026.pdf')}`], 'a document is a download under its own name');
  assert(doc.bytes.equals(pdf));
  assert.equal(readCalls(), 1, 'two files of one chat asked for at the same time: one read');
  // a file that is not what it is called is never shown inside the page
  const fake = await media(q(lid, `false_${lid}_X1`));
  assert.deepEqual([fake.status, fake.type, fake.disposition, fake.nosniff, readCalls()], [200, 'application/octet-stream', "attachment; filename*=UTF-8''picture.png", 'nosniff', 1]);
  assert(fake.bytes.equals(page));

  // nothing to be had: said so, and OpenWA is not asked again for a while
  const none = await call('/api/wa/media?' + q(lid, `false_${lid}_T1`), { cookie: lin });
  assert.deepEqual([none.status, none.json, readCalls()], [404, { error: 'media-unavailable' }, 2]);
  const calls = gw.calls.length;
  assert.equal((await call('/api/wa/media?' + q(lid, `false_${lid}_T1`), { cookie: lin })).status, 404);
  assert.equal(gw.calls.length, calls, 'not asked again at once');
  clock += 11 * 60 * 1000;
  assert.equal((await call('/api/wa/media?' + q(lid, `false_${lid}_T1`), { cookie: lin })).status, 404);
  assert(gw.calls.length > calls, 'asked again later');

  // who may ask, and for what
  assert.deepEqual((await call('/api/wa/media?' + q(chat, `false_${chat}_M1`))).json, { error: 'not-signed-in' });
  const outsider = await member('ines', 'agent', 'elsewhere'), reader = await member('rita', 'supervisor', null);
  assert.equal((await call('/api/wa/media?' + q(chat, `false_${chat}_M1`), { cookie: outsider })).status, 403);
  assert.equal((await media(q(chat, `false_${chat}_M1`), reader)).status, 200, 'a supervisor may look at media');
  for (const bad of ['account=a7&chat=120363000000000000%40g.us&id=x_1', `account=a%2F7&chat=${chat}&id=false_1`, `account=a7&chat=${chat}`, `account=a7&chat=${chat}&id=..%2F..%2Fetc%2Fpasswd`]) {
    assert.deepEqual((await call('/api/wa/media?' + bad, { cookie: lin })).json, { error: 'invalid-request' }, bad);
  }
  assert.deepEqual((await call(`/api/wa/media?account=a9&chat=${chat}&id=false_${chat}_M9`, { cookie: lin })).json, { error: 'unknown-account' });

  // OpenWA out of reach: said so; what was kept is still handed out, also after the number is unlinked
  useSettings({ ...good(), OPENWA_BASE_URL: 'http://127.0.0.1:9/' });
  const down = await call('/api/wa/media?' + q(chat, `false_${chat}_M2`), { cookie: lin });
  assert.deepEqual([down.status, down.json], [502, { error: 'gateway-unreachable' }]);
  assert.equal((await media(q(chat, `false_${chat}_M1`))).status, 200);
  useSettings(good());
  assert.equal((await post('/api/wa/unlink', { account: 'a7' })).status, 200);
  assert.equal((await media(q(lid, `false_${lid}_V1`))).status, 200, 'kept media outlives the link');
  assert.deepEqual((await call('/api/wa/media?' + q(chat, `false_${chat}_M2`), { cookie: lin })).json, { error: 'unknown-account' });

  // the folder of kept files is private
  const folder = path.join(tmp, 'main', 'wa-media-s1'), kept = fs.readdirSync(folder);
  assert.deepEqual([kept.filter(f => f.endsWith('.bin')).length, kept.filter(f => f.endsWith('.json')).length], [4, 4]);
  assert.equal(fs.statSync(folder).mode & 0o077, 0);
  assert(kept.every(f => (fs.statSync(path.join(folder, f)).mode & 0o077) === 0 && /^[0-9a-f]{64}\.(bin|json)$/.test(f)));
});

test('the words of a voice note: the speech service is asked once and the text kept beside the file; only sound is sent; only the employee may ask', async () => {
  const speechPort = await new Promise(resolve => speechServer.listen(0, '127.0.0.1', () => resolve(speechServer.address().port)));
  const aiBefore = process.env.WA_SCRM_AI_ENV;
  await post('/api/wa/link', { account: 'a8' });
  const session = gwSessionOf('a8'), chat = '15550008899@c.us';
  Object.assign(session, { status: 'ready', phone: '15550008080' });
  const ogg = n => Buffer.concat([Buffer.from('OggS'), Buffer.alloc(60 + n, n)]);
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 7)]);
  for (const n of [1, 3, 4, 5]) gw.media.set(`false_${chat}_S${n}`, { mimetype: 'audio/ogg; codecs=opus', filename: 'ptt.ogg', bytes: ogg(n) });
  gw.media.set(`false_${chat}_S2`, { mimetype: 'image/jpeg', filename: 'photo.jpg', bytes: jpeg });
  const ask = (n, cookie = lin) => post('/api/wa/transcribe', { account: 'a8', chat, id: `false_${chat}_S${n}` }, cookie);
  try {
    // no speech service in the settings: said so, nothing is sent anywhere
    delete process.env.WA_SCRM_AI_ENV;
    const off = await ask(1);
    assert.deepEqual([off.status, off.json, speech.calls.length], [503, { error: 'not-configured' }, 0]);
    fs.writeFileSync(voiceFile, `VOICE_PROVIDER=other\nVOICE_API_KEY=voice-key-for-the-link-tests\nVOICE_BASE_URL=http://127.0.0.1:${speechPort}/v1\nVOICE_MODEL=test-voice\n`);
    process.env.WA_SCRM_AI_ENV = voiceFile;
    // the voice note goes to the speech service: its bytes, under a name that fits what it is
    const first = await ask(1);
    assert.deepEqual([first.status, first.json], [200, { text: 'Hola, quiero dos cajas.' }]);
    assert.deepEqual(speech.calls, [{ auth: 'Bearer voice-key-for-the-link-tests', file: 'voice.ogg', bytes: ogg(1).length }]);
    // kept: asked again, the same text without a second call — also after the service has gone
    speech.mode = 'error';
    assert.deepEqual([(await ask(1)).json, speech.calls.length], [{ text: 'Hola, quiero dos cajas.' }, 1]);
    const note = fs.readdirSync(path.join(tmp, 'main', 'wa-media-s1')).filter(name => name.endsWith('.json')).map(name => JSON.parse(fs.readFileSync(path.join(tmp, 'main', 'wa-media-s1', name), 'utf8'))).filter(n => n.transcript);
    assert.deepEqual(note, [{ mime: 'audio/ogg', name: 'ptt.ogg', transcript: 'Hola, quiero dos cajas.' }]);
    // the service fails: said so, nothing kept, and it is asked again the next time
    const failed = await ask(3);
    assert.deepEqual([failed.status, failed.json, speech.calls.length], [502, { error: 'transcription-failed' }, 2]);
    speech.mode = 'ok';
    // two requests for one voice note at the same time: one call
    const both = await Promise.all([ask(3), ask(3)]);
    assert.deepEqual([both.map(r => r.json.text), speech.calls.length], [['Hola, quiero dos cajas.', 'Hola, quiero dos cajas.'], 3]);
    // no speech in it: said so, not kept
    speech.mode = 'silent';
    const silent = await ask(4);
    assert.deepEqual([silent.status, silent.json, speech.calls.length], [422, { error: 'no-speech' }, 4]);
    speech.mode = 'ok';
    assert.deepEqual([(await ask(4)).json, speech.calls.length], [{ text: 'Hola, quiero dos cajas.' }, 5]);
    // a picture is not sent to the speech service; a message without media has nothing to send
    const picture = await ask(2);
    assert.deepEqual([picture.status, picture.json, speech.calls.length], [415, { error: 'not-audio' }, 5]);
    assert.deepEqual((await ask(9)).json, { error: 'media-unavailable' });
    // who may ask, and for what
    assert.deepEqual((await post('/api/wa/transcribe', { account: 'a8', chat, id: `false_${chat}_S5` }, '')).json, { error: 'not-signed-in' });
    assert.deepEqual((await ask(5, await member('rhea', 'supervisor', null))).json, { error: 'read-only' });
    assert.equal((await ask(5, await member('iris', 'agent', 'elsewhere'))).status, 403);
    for (const bad of [{ account: 'a8', chat: '1203630299@g.us', id: 'x_1' }, { account: 'a8', chat }, { chat, id: `false_${chat}_S5` }, []]) assert.deepEqual((await post('/api/wa/transcribe', bad)).json, { error: 'invalid-request' }, JSON.stringify(bad));
    assert.equal((await call('/api/wa/transcribe', { cookie: lin })).status, 405);
    assert.equal(speech.calls.length, 5);
    // the log names the number and sizes, never the words
    const lines = logged.filter(line => /^(wa|ai) transcribe/.test(line));
    assert(lines.some(line => /^wa transcribe ok account=a8 bytes=\d+ chars=23$/.test(line)) && lines.some(line => line === 'wa transcribe failed account=a8 error=provider-error') && lines.some(line => /^wa transcribe empty account=a8 /.test(line)), lines.join('\n'));
    assert(!logged.some(line => line.includes('cajas') || line.includes('voice-key-for-the-link-tests')));
    assert.equal((await post('/api/wa/unlink', { account: 'a8' })).status, 200);
  } finally {
    if (aiBefore === undefined) delete process.env.WA_SCRM_AI_ENV; else process.env.WA_SCRM_AI_ENV = aiBefore;
  }
});

test('what kind of media some bytes are is told by how they begin', () => {
  const kind = (head, declared) => openwaLink.mediaKind(Buffer.concat([Buffer.from(head), Buffer.alloc(32)]), declared);
  assert.deepEqual([
    kind([0xff, 0xd8, 0xff, 0xe1]), kind([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), kind('GIF89a'), kind('RIFF\0\0\0\0WEBPVP8 '), kind('RIFF\0\0\0\0WAVEfmt '),
    kind('OggS'), kind('ID3\x04'), kind([0xff, 0xfb, 0x90]), kind([0xff, 0xf1, 0x50]), kind('\0\0\0\x20ftypisom'), kind('\0\0\0\x20ftypisom', 'audio/mp4'), kind('\0\0\0\x20ftypM4A '),
    kind([0x1a, 0x45, 0xdf, 0xa3]), kind([0x1a, 0x45, 0xdf, 0xa3], 'audio/webm'),
  ], ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/wav', 'audio/ogg', 'audio/mpeg', 'audio/mpeg', 'audio/aac', 'video/mp4', 'audio/mp4', 'audio/mp4', 'video/webm', 'audio/webm']);
  for (const other of ['%PDF-1.7', '<!doctype html>', '<svg xmlns="http://www.w3.org/2000/svg">', 'PK\x03\x04', 'MZ\x90\0']) assert.equal(kind(other, 'image/png'), null, other);
  assert.equal(openwaLink.mediaKind(Buffer.from([0xff, 0xd8, 0xff])), null, 'too short to tell');
});

test('what a file is sent as is told by its bytes: a picture, a video or a recording only in a format WhatsApp shows as such, everything else a document', () => {
  const form = (head, declared, tail = '') => openwaLink.sendForm(Buffer.concat([Buffer.from(head), Buffer.alloc(32), Buffer.from(tail)]), declared);
  assert.deepEqual([
    form([0xff, 0xd8, 0xff, 0xe1], 'image/jpeg'), form([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'image/png'), form([0xff, 0xd8, 0xff, 0xe1], 'application/pdf'), form([0xff, 0xd8, 0xff, 0xe1]),
    form('\0\0\0\x20ftypisom', 'video/mp4'), form('\0\0\0\x20ftypmp42', 'video/mp4', 'stsd....avc1'), form('\0\0\0\x20ftypisom', 'application/octet-stream'),
    form('OggS', 'audio/ogg'), form('ID3\x04', 'audio/mpeg'), form('\0\0\0\x20ftypM4A ', 'audio/x-m4a'), form('\0\0\0\x20ftypisom', 'audio/mp4'), form([0xff, 0xf1, 0x50], 'audio/aac'),
  ], [
    { type: 'image', mime: 'image/jpeg' }, { type: 'image', mime: 'image/png' }, { type: 'image', mime: 'image/jpeg' }, { type: 'image', mime: 'image/jpeg' },
    { type: 'video', mime: 'video/mp4' }, { type: 'video', mime: 'video/mp4' }, { type: 'video', mime: 'video/mp4' },
    { type: 'audio', mime: 'audio/ogg' }, { type: 'audio', mime: 'audio/mpeg' }, { type: 'audio', mime: 'audio/mp4' }, { type: 'audio', mime: 'audio/mp4' }, { type: 'audio', mime: 'audio/aac' },
  ]);
  // a document: under the type the browser gave it, or what its bytes say, or as bytes without a type
  assert.deepEqual([
    form('%PDF-1.7', 'application/pdf'), form('PK\x03\x04', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), form('GIF89a', 'image/gif'), form('RIFF\0\0\0\0WEBPVP8 ', 'image/webp'),
    form('RIFF\0\0\0\0WAVEfmt ', 'audio/wav'), form([0x1a, 0x45, 0xdf, 0xa3], 'video/webm'), form('<!doctype html>', 'image/jpeg'), form('%PDF-1.7'), form('GIF89a'), form('%PDF-1.7', 'not a type'), form('%PDF-1.7', 'a/' + 'b'.repeat(100)),
  ], [
    { type: 'document', mime: 'application/pdf' }, { type: 'document', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, { type: 'document', mime: 'image/gif' }, { type: 'document', mime: 'image/webp' },
    { type: 'document', mime: 'audio/wav' }, { type: 'document', mime: 'video/webm' }, { type: 'document', mime: 'image/jpeg' }, { type: 'document', mime: 'application/octet-stream' }, { type: 'document', mime: 'image/gif' },
    { type: 'document', mime: 'application/octet-stream' }, { type: 'document', mime: 'application/octet-stream' },
  ]);
  // a video WhatsApp Web could not play goes out as a document: another kind of file in the same wrapping, or pictures in a newer format
  for (const [head, declared, tail] of [['\0\0\0\x20ftypqt  ', 'video/quicktime'], ['\0\0\0\x20ftypheic', 'image/heic'], ['\0\0\0\x20ftyp3gp4', 'video/3gpp'], ['\0\0\0\x20ftypisom', 'video/mp4', 'stsd....hvc1'], ['\0\0\0\x20ftypmp42', 'video/mp4', 'hev1'], ['\0\0\0\x20ftypisom', 'video/mp4', 'av01'], ['\0\0\0\x20ftypiso5', 'video/mp4', 'vp09']]) {
    assert.deepEqual(form(head, declared, tail), { type: 'document', mime: declared }, head.slice(4) + ' ' + (tail || ''));
  }
  assert.deepEqual(openwaLink.sendForm(Buffer.from([0xff, 0xd8, 0xff]), 'image/jpeg'), { type: 'document', mime: 'image/jpeg' }, 'too short to tell');
});

test('sending a file: its details come first in the request, then the file; it goes out by the route of its kind with its caption; one file per request; what was sent is kept for the page; limits and who may send', async () => {
  gwSessionOf('a1').status = 'ready';
  gw.files.length = 0;
  const to = '15550001111@c.us', sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(300, 7)]);
  const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.alloc(120, 3)]);
  const ogg = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(120, 1)]);
  const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(120, 2)]);
  // The body of a request: one line of JSON with the details, then the file as it is.
  const send = (bytes, details, { content = 'application/octet-stream', cookie = lin, headers = {}, line } = {}) =>
    fetch(`http://127.0.0.1:${port}/api/wa/send-file`, { method: 'POST', headers: { 'Content-Type': content, ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: Buffer.concat([Buffer.from(line ?? JSON.stringify({ account: 'a1', to, ...details }) + '\n'), bytes]) })
      .then(async r => ({ status: r.status, json: await r.json() }));
  // a picture with a caption
  const sent = await send(jpeg, { requestId: 'file-0000001', name: 'photo.jpg', type: 'image/jpeg', caption: '  Here it is  ' });
  assert.deepEqual([sent.status, sent.json.type, sent.json.file, sent.json.timestamp, typeof sent.json.messageId], [200, 'image', 'photo.jpg', Math.floor(clock / 1000) * 1000, 'string']);
  assert.deepEqual(gw.files, [{ route: 'send-image', key: 's1-file-0000001', chatId: to, mimetype: 'image/jpeg', filename: undefined, caption: 'Here it is', sha: sha(jpeg) }]);
  // repeated, it is not sent again; the same request with another file or another caption is a conflict
  assert.deepEqual((await send(jpeg, { requestId: 'file-0000001', name: 'photo.jpg', type: 'image/jpeg', caption: 'Here it is' })).json, sent.json);
  assert.equal(gw.files.length, 1, 'the repeated request does not reach OpenWA');
  assert.deepEqual([(await send(pdf, { requestId: 'file-0000001', name: 'photo.jpg', caption: 'Here it is' })).status, (await send(jpeg, { requestId: 'file-0000001', name: 'photo.jpg', caption: 'Other' })).json], [409, { error: 'request-conflict' }]);
  // what was sent is kept: the page gets it without OpenWA being asked
  gw.calls.length = 0;
  const kept = await fetch(`http://127.0.0.1:${port}/api/wa/media?account=a1&chat=${encodeURIComponent(to)}&id=${encodeURIComponent(sent.json.messageId)}`, { headers: { Cookie: lin } });
  assert.deepEqual([kept.status, kept.headers.get('content-type'), Buffer.from(await kept.arrayBuffer()).equals(jpeg)], [200, 'image/jpeg', true]);
  assert.deepEqual(gw.calls, [], 'the kept file is served without a call to OpenWA');
  // each kind by its route; a document under its own name, cleaned of what cannot be part of one
  gw.files.length = 0;
  for (const [id, bytes, type, name, route, mime, filename] of [
    ['file-0000010', mp4, 'video/mp4', 'clip.mp4', 'send-video', 'video/mp4', undefined],
    ['file-0000011', ogg, 'audio/ogg', 'note.ogg', 'send-audio', 'audio/ogg', undefined],
    ['file-0000012', pdf, 'application/pdf', '报价 2026.pdf', 'send-document', 'application/pdf', '报价 2026.pdf'],
    ['file-0000013', jpeg, 'application/pdf', 'really a picture.pdf', 'send-image', 'image/jpeg', undefined],
    ['file-0000014', pdf, '', '', 'send-document', 'application/octet-stream', 'file'],
    ['file-0000015', pdf, 'application/pdf', 'a/b\\c\u0001d.pdf', 'send-document', 'application/pdf', 'a b c d.pdf'],
    ['file-0000016', pdf, 'application/pdf', 'x'.repeat(300) + '.pdf', 'send-document', 'application/pdf', 'x'.repeat(200)],
  ]) {
    const answer = await send(bytes, { requestId: id, name, type });
    assert.deepEqual([answer.status, answer.json.type, answer.json.file], [200, route.replace('send-', ''), filename === 'file' ? undefined : filename ?? name], id);
    assert.deepEqual(gw.files.at(-1), { route, key: 's1-' + id, chatId: to, mimetype: mime, filename, caption: undefined, sha: sha(bytes) }, id);
  }
  // limits and bad requests: nothing reaches OpenWA
  const before = gw.files.length;
  const sven = await member('sven', 'supervisor', null), olga = await member('olga', 'agent', 'elsewhere');
  for (const [what, bytes, details, options, status, error] of [
    ['an empty file', Buffer.alloc(0), { requestId: 'file-0000020', name: 'a.pdf' }, {}, 400, 'invalid-request'],
    ['details that are not JSON', pdf, {}, { line: 'account=a1\n' }, 400, 'invalid-request'],
    ['details that are a list', pdf, {}, { line: '["a1"]\n' }, 400, 'invalid-request'],
    ['details without their end of line', Buffer.alloc(200, 2), {}, { line: JSON.stringify({ account: 'a1', to, requestId: 'file-0000018' }) }, 400, 'invalid-request'],
    ['details that take more than their room', pdf, { requestId: 'file-0000019', name: 'x'.repeat(17000) }, {}, 400, 'invalid-request'],
    ['details of another kind than text', pdf, { requestId: 'file-0000017', to: 15550001111 }, {}, 400, 'invalid-request'],
    ['a file over the limit', Buffer.alloc(16 * 1024 * 1024 + 1, 1), { requestId: 'file-0000021', name: 'big.bin' }, {}, 413, 'too-long'],
    ['a caption over the limit', pdf, { requestId: 'file-0000022', name: 'a.pdf', caption: 'x'.repeat(1025) }, {}, 400, 'invalid-request'],
    ['a group', pdf, { requestId: 'file-0000023', name: 'a.pdf', to: '1203630@g.us' }, {}, 400, 'invalid-request'],
    ['a request id that is too short', pdf, { requestId: 'short', name: 'a.pdf' }, {}, 400, 'invalid-request'],
    ['a body announced as a form', pdf, { requestId: 'file-0000024', name: 'a.pdf' }, { content: 'text/plain' }, 400, 'invalid-request'],
    ['a body announced as a picture', jpeg, { requestId: 'file-0000025', name: 'a.jpg' }, { content: 'image/jpeg' }, 400, 'invalid-request'],
    ['an unknown number', pdf, { requestId: 'file-0000026', name: 'a.pdf', account: 'zz' }, {}, 404, 'unknown-account'],
    ['nobody signed in', pdf, { requestId: 'file-0000027', name: 'a.pdf' }, { cookie: '' }, 401, 'not-signed-in'],
    ['a supervisor', pdf, { requestId: 'file-0000028', name: 'a.pdf' }, { cookie: sven }, 403, 'read-only'],
    ['an employee of another sub-site', pdf, { requestId: 'file-0000029', name: 'a.pdf' }, { cookie: olga }, 403, 'forbidden'],
    ['a page of another site', pdf, { requestId: 'file-0000030', name: 'a.pdf' }, { headers: { 'Sec-Fetch-Site': 'cross-site' } }, 403, 'forbidden'],
  ]) {
    const answer = await send(bytes, details, options);
    assert.deepEqual([answer.status, answer.json], [status, { error }], what);
  }
  assert.equal(gw.files.length, before);
  // a file of exactly the largest size goes through
  const largest = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(16 * 1024 * 1024 - 9, 5)]);
  assert.equal((await send(largest, { requestId: 'file-0000040', name: 'large.pdf', type: 'application/pdf' })).status, 200);
  assert.equal(gw.files.at(-1).sha, sha(largest));
  // the number is not connected; an answer that leaves the outcome open; the same request again goes through
  gwSessionOf('a1').status = 'qr_ready';
  assert.deepEqual((await send(pdf, { requestId: 'file-0000050', name: 'a.pdf' })).json, { error: 'not-connected' });
  gwSessionOf('a1').status = 'ready';
  gw.sendMode = 'error';
  assert.deepEqual([(await send(pdf, { requestId: 'file-0000051', name: 'a.pdf' })).status, (await send(pdf, { requestId: 'file-0000051', name: 'a.pdf' })).json], [409, { error: 'outcome-unknown' }]);
  gw.sendMode = 'ok';
  assert.equal((await send(pdf, { requestId: 'file-0000051', name: 'a.pdf' })).status, 200, 'the same request goes through once OpenWA answers');
  assert.deepEqual(gw.files.slice(-3).map(f => f.key), Array(3).fill('s1-file-0000051'), 'OpenWA gets the same key every time');
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
  for (const expected of ['wa link ok account=a1 state=scan', 'wa hook stored event=message.received account=a1', 'wa send ok account=a1 chars=5', 'wa send failed account=a1 error=not-connected upstream=409', 'wa send ok account=a1 file=image bytes=304', 'wa send failed account=a1 file=document error=not-connected upstream=409', 'wa unlink ok account=a4', 'error=gateway-unreachable', 'error=gateway-refused']) {
    assert(lines.some(line => line.includes(expected)), expected);
  }
  for (const secret of [KEY, SECRET, '15550001111', '15550009999', 'hello', 'Hola', 'On my way', 'Here it is', 'photo.jpg', QR]) assert(!lines.some(line => line.includes(secret)), secret);
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
