// The link between one sub-site and its own OpenWA (https://github.com/rmyndharis/OpenWA), used by the preview
// server when WA_SCRM_DATA_DIR is set. The settings are read on every call from the file named by
// WA_SCRM_OPENWA_ENV (KEY=VALUE lines):
//   OPENWA_BASE_URL     where this server reaches OpenWA, for example http://127.0.0.1:2785
//   OPENWA_API_KEY      OpenWA's key; it never leaves the server
//   OPENWA_HOOK_URL     where OpenWA reaches this server's /api/wa/hook
//   OPENWA_HOOK_SECRET  signs OpenWA's deliveries; at least 32 characters
// Routes:
//   GET  /api/wa/status                          is the link set up and reachable; the numbers and their state
//   POST /api/wa/link    { account }             creates the number's session if needed and starts it
//   GET  /api/wa/link?account=<id>               the number's state; while it waits for the scan, the QR code
//   POST /api/wa/unlink  { account }             unlinks the phone and removes the session
//   POST /api/wa/send    { account, to, text, requestId }
//   POST /api/wa/claim   { client }              this page takes the event feed over from any other page
//   GET  /api/wa/events?after=<seq>&client=<id>&wait=<seconds>
//   POST /api/wa/hook                            deliveries from OpenWA, stored before they are acknowledged
// The employee of the sub-site uses all of them; supervisors and administrators read the status. The hook
// takes no cookie: it accepts only a body signed with the hook secret. A delivery is stored as OpenWA sent it
// and put into this project's own form when a page reads it, so the page never depends on OpenWA's structures.
// A log line carries the action, the number's id and the outcome; never a key, a phone number or message text.
// Needs Node 22.13 or newer (built-in SQLite).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { parseEnv } = require('./ai-relay.cjs');

const MAX_BODY = 16 * 1024;
const MAX_HOOK_BODY = 4 * 1024 * 1024;
const MAX_TEXT = 4096;
const MAX_WAIT_SECONDS = 25;
const FEED_PAGE = 200;
const EVENTS_KEPT = 50000;
const TIMEOUT_MS = Number(process.env.WA_SCRM_OPENWA_TIMEOUT_MS) || 20000;
const ACCOUNT = /^[A-Za-z0-9]{1,24}$/;
const CLIENT = /^[A-Za-z0-9_-]{8,64}$/;
// A chat with one person: a phone number, or the privacy id WhatsApp shows instead of it.
const CHAT = /^[0-9]{5,20}@(c\.us|lid)$/;
// What OpenWA is asked to deliver. Group, call, presence and QR events are not used.
const EVENTS = ['message.received', 'message.sent', 'message.ack', 'message.revoked', 'message.edited', 'session.status', 'session.authenticated', 'session.disconnected', 'session.restriction'];
// OpenWA's session states in this project's words.
const STATES = { created: 'starting', initializing: 'starting', qr_ready: 'scan', authenticating: 'verifying', ready: 'online', disconnected: 'offline', action_required: 'attention', failed: 'failed' };
const RECEIPTS = ['sent', 'delivered', 'read', 'played', 'failed'];
const STATUS = {
  'invalid-request': 400, 'send-refused': 400, 'not-signed-in': 401, 'bad-signature': 401, 'password-change-required': 403, 'forbidden': 403,
  'read-only': 403, 'unknown-account': 404, 'not-connected': 409, 'request-conflict': 409, 'outcome-unknown': 409, 'taken-over': 409,
  'too-long': 413, 'gateway-refused': 502, 'gateway-unreachable': 502, 'gateway-failed': 502, 'not-configured': 503,
};
const problem = (code, extra = {}) => Object.assign(new Error(code), { code, ...extra });
const digits = value => String(value || '').replace(/\D/g, '');

// Returns { configured: true, baseUrl, key, hookUrl, hookSecret } or { configured: false, reason }.
function loadConfig() {
  const file = process.env.WA_SCRM_OPENWA_ENV;
  if (!file) return { configured: false, reason: 'no-settings-file' };
  let values;
  try {
    values = parseEnv(fs.readFileSync(file, 'utf8'));
  } catch {
    return { configured: false, reason: 'no-settings-file' };
  }
  const baseUrl = (values.OPENWA_BASE_URL || '').replace(/\/+$/, '');
  if (!/^https?:\/\/\S+$/.test(baseUrl)) return { configured: false, reason: 'missing-address' };
  if (!values.OPENWA_API_KEY) return { configured: false, reason: 'missing-key' };
  if (!/^https?:\/\/\S+$/.test(values.OPENWA_HOOK_URL || '')) return { configured: false, reason: 'missing-hook-address' };
  if ((values.OPENWA_HOOK_SECRET || '').length < 32) return { configured: false, reason: 'missing-hook-secret' };
  return { configured: true, baseUrl, key: values.OPENWA_API_KEY, hookUrl: values.OPENWA_HOOK_URL, hookSecret: values.OPENWA_HOOK_SECRET };
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readRaw(req, limit) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > limit) {
      req.resume();
      throw problem('too-long');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  if ((req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') throw problem('invalid-request');
  let body = null;
  try {
    body = JSON.parse((await readRaw(req, MAX_BODY)).toString('utf8'));
  } catch (error) {
    if (error.code) throw error;
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw problem('invalid-request');
  return body;
}

// Is the header the HMAC-SHA256 of exactly these bytes? Compared in constant time.
function signed(raw, header, secret) {
  if (typeof header !== 'string') return false;
  const expected = Buffer.from('sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex'));
  const given = Buffer.from(header);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

// One call to OpenWA: { status, body } for every answer. No answer at all is 'gateway-unreachable', a key
// OpenWA does not accept is 'gateway-refused'.
async function ask(config, method, pathname, body, headers = {}) {
  let response;
  try {
    response = await fetch(config.baseUrl + pathname, {
      method,
      headers: { 'X-API-Key': config.key, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw problem('gateway-unreachable');
  }
  if (response.status === 401 || response.status === 403) throw problem('gateway-refused');
  let json = null;
  try {
    json = await response.json();
  } catch {}
  return { status: response.status, body: json };
}

// One stored delivery in this project's own form, or null when the page has no use for it.
function present({ seq, account, name, at, body }) {
  const d = JSON.parse(body);
  const event = { seq, account };
  if (name === 'message.received' || name === 'message.sent') {
    // Only chats with one person; groups, channels, status posts and broadcast lists are left out.
    if ((d.kind || 'individual') !== 'individual' || d.isGroup || d.isStatusBroadcast) return null;
    const fromMe = Boolean(d.fromMe);
    const chat = String(d.chatId || (fromMe ? d.to : d.from) || '');
    const number = /^([0-9]{5,20})@c\.us$/.exec(chat);
    return {
      ...event, kind: 'message', id: String(d.id || ''), chat, fromMe, type: String(d.type || 'text'), text: String(d.body || ''),
      at: Number(d.timestamp) > 0 ? Number(d.timestamp) * 1000 : Date.parse(at),
      name: fromMe ? '' : String(d.contact?.name || d.contact?.pushName || ''),
      phone: digits(fromMe ? '' : d.senderPhone) || (number ? number[1] : ''),
      media: d.media ? { mime: String(d.media.mimetype || ''), name: String(d.media.filename || ''), size: Number(d.media.sizeBytes) || 0 } : null,
    };
  }
  if (name === 'message.ack') return RECEIPTS.includes(d.status) ? { ...event, kind: 'receipt', id: String(d.messageId || d.id || ''), status: d.status } : null;
  if (name === 'message.revoked') return { ...event, kind: 'revoked', id: String(d.revokedId || d.id || ''), chat: String(d.chatId || '') };
  if (name === 'message.edited') return { ...event, kind: 'edited', id: String(d.messageId || ''), chat: String(d.chatId || ''), text: String(d.body || '') };
  if (name === 'session.status') return { ...event, kind: 'state', state: STATES[d.status] || 'offline' };
  if (name === 'session.authenticated') return { ...event, kind: 'state', state: 'online', phone: digits(d.phone), name: String(d.pushName || '') };
  if (name === 'session.disconnected') return { ...event, kind: 'state', state: 'offline', reason: String(d.reason || '') };
  if (name === 'session.restriction') return { ...event, kind: 'restriction', active: Boolean(d.active), code: String(d.code || '') };
  return null;
}

// The link's own records of one sub-site: its numbers, the deliveries, and what was sent for which request.
function openStore(file, now) {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS account (id TEXT PRIMARY KEY, session TEXT NOT NULL UNIQUE, hook TEXT NOT NULL, at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS event (seq INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, account TEXT NOT NULL, name TEXT NOT NULL, at TEXT NOT NULL, body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sent (request TEXT PRIMARY KEY, digest TEXT NOT NULL, outcome TEXT, at TEXT NOT NULL);
  `);
  const stamp = () => new Date(now()).toISOString();
  return {
    accounts: () => db.prepare('SELECT id, session, hook FROM account ORDER BY at, id').all(),
    account: id => db.prepare('SELECT id, session, hook FROM account WHERE id = ?').get(id),
    accountOfSession: session => db.prepare('SELECT id, session, hook FROM account WHERE session = ?').get(session),
    addAccount: (id, session, hook) => db.prepare('INSERT INTO account (id, session, hook, at) VALUES (?, ?, ?, ?)').run(id, session, hook, stamp()),
    removeAccount: id => db.prepare('DELETE FROM account WHERE id = ?').run(id),
    // Stores a delivery once; false when its key is already there.
    addEvent({ key, account, name, at, body }) {
      if (db.prepare('SELECT 1 FROM event WHERE key = ?').get(key)) return false;
      const seq = Number(db.prepare('INSERT INTO event (key, account, name, at, body) VALUES (?, ?, ?, ?, ?)').run(key, account, name, at, body).lastInsertRowid);
      if (seq % 1000 === 0) db.prepare('DELETE FROM event WHERE seq <= ?').run(seq - EVENTS_KEPT);
      return true;
    },
    eventsAfter: (seq, limit) => db.prepare('SELECT seq, account, name, at, body FROM event WHERE seq > ? ORDER BY seq LIMIT ?').all(seq, limit),
    lastEvent: () => db.prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM event').get().seq,
    request: id => db.prepare('SELECT request, digest, outcome FROM sent WHERE request = ?').get(id),
    addRequest: (id, digest) => db.prepare('INSERT INTO sent (request, digest, at) VALUES (?, ?, ?)').run(id, digest, stamp()),
    finishRequest: (id, outcome) => db.prepare('UPDATE sent SET outcome = ? WHERE request = ?').run(JSON.stringify(outcome), id),
    close: () => db.close(),
  };
}

// site is what site-api.cjs's create() returned; it says who is signed in.
function create({ dir, siteId, site, now = () => Date.now() }) {
  const store = openStore(path.join(dir, `wa-${siteId}.db`), now);
  const waiting = new Set();
  const wake = () => { for (const release of [...waiting]) release(); };
  // The page that reads the event feed. Another page that claims the feed takes it over.
  let holder = null;

  function signedIn(req) {
    const user = site.authenticate(req);
    if (!user) throw problem('not-signed-in');
    if (user.mustChangePassword) throw problem('password-change-required');
    if (user.role === 'agent' && user.site !== siteId) throw problem('forbidden');
    return user;
  }
  function employee(req) {
    const user = signedIn(req);
    if (user.role !== 'agent') throw problem('read-only');
    return user;
  }
  function settings() {
    const config = loadConfig();
    if (!config.configured) throw problem('not-configured');
    return config;
  }
  const sessionName = account => `${siteId}-${account}`;
  const view = (account, session, missing = 'missing') => ({
    account, state: session ? STATES[session.status] || 'offline' : missing, phone: digits(session?.phone), name: String(session?.pushName || ''),
    error: String(session?.lastError || ''), restricted: Boolean(session?.restriction),
  });

  // The number's record. When there is none yet, its session and the webhook are made at OpenWA first. An
  // earlier attempt that stopped half-way is completed: a session of that name is taken over, and a webhook
  // that already points here is replaced, because its secret may be an older one.
  async function ensureAccount(config, account) {
    const known = store.account(account);
    if (known) return known;
    const made = await ask(config, 'POST', '/api/sessions', { name: sessionName(account) });
    let session = made.status === 201 ? made.body?.id : null;
    if (made.status === 409) {
      const list = await ask(config, 'GET', '/api/sessions');
      session = (Array.isArray(list.body) ? list.body : []).find(s => s.name === sessionName(account))?.id;
    }
    if (!session) throw problem('gateway-failed');
    const hooks = await ask(config, 'GET', `/api/sessions/${session}/webhooks`);
    for (const old of (Array.isArray(hooks.body) ? hooks.body : []).filter(h => h.url === config.hookUrl)) await ask(config, 'DELETE', `/api/sessions/${session}/webhooks/${old.id}`);
    const hook = await ask(config, 'POST', `/api/sessions/${session}/webhooks`, { url: config.hookUrl, events: EVENTS, secret: config.hookSecret, retryCount: 5 });
    if (hook.status !== 201 || !hook.body?.id) throw problem('gateway-failed');
    store.addAccount(account, session, hook.body.id);
    return store.account(account);
  }

  // The number's state for the page; while it waits for the scan, with the QR code.
  async function linkView(config, row, session) {
    const state = view(row.id, session);
    if (state.state !== 'scan') return state;
    const qr = await ask(config, 'GET', `/api/sessions/${row.session}/qr`);
    return { ...state, qr: qr.status === 200 ? String(qr.body?.qrCode || '') : '' };
  }

  const routes = {
    'GET /api/wa/status': async req => {
      signedIn(req);
      const config = loadConfig();
      if (!config.configured) return { configured: false, reason: config.reason };
      let sessions = null;
      try {
        const list = await ask(config, 'GET', '/api/sessions');
        if (list.status === 200 && Array.isArray(list.body)) sessions = list.body;
      } catch (error) {
        if (!error.code) throw error;
      }
      return { configured: true, reachable: Boolean(sessions), accounts: store.accounts().map(row => view(row.id, sessions?.find(s => s.id === row.session), sessions ? 'missing' : 'unknown')) };
    },
    'POST /api/wa/link': async req => {
      employee(req);
      const config = settings();
      const { account } = await readJson(req);
      if (typeof account !== 'string' || !ACCOUNT.test(account)) throw problem('invalid-request');
      let row = await ensureAccount(config, account);
      let session = await ask(config, 'GET', `/api/sessions/${row.session}`);
      if (session.status === 404) {
        // The session is gone at OpenWA (removed there): start over with a new one.
        store.removeAccount(account);
        row = await ensureAccount(config, account);
        session = await ask(config, 'GET', `/api/sessions/${row.session}`);
      }
      if (session.status !== 200) throw problem('gateway-failed');
      if (['created', 'disconnected', 'failed'].includes(session.body.status)) {
        const started = await ask(config, 'POST', `/api/sessions/${row.session}/start`);
        session = started.status === 200 ? started : await ask(config, 'GET', `/api/sessions/${row.session}`);
        if (session.status !== 200) throw problem('gateway-failed');
      }
      const result = await linkView(config, row, session.body);
      console.log(`wa link ok account=${account} state=${result.state}`);
      return result;
    },
    'GET /api/wa/link': async (req, url) => {
      employee(req);
      const config = settings();
      const row = store.account(url.searchParams.get('account') || '');
      if (!row) throw problem('unknown-account');
      const session = await ask(config, 'GET', `/api/sessions/${row.session}`);
      if (session.status === 404) return view(row.id, null);
      if (session.status !== 200) throw problem('gateway-failed');
      return linkView(config, row, session.body);
    },
    'POST /api/wa/unlink': async req => {
      employee(req);
      const config = settings();
      const { account } = await readJson(req);
      const row = store.account(typeof account === 'string' ? account : '');
      if (!row) throw problem('unknown-account');
      // Logging out fails for a session that is not running; removing the session is what counts.
      await ask(config, 'POST', `/api/sessions/${row.session}/logout`);
      const removed = await ask(config, 'DELETE', `/api/sessions/${row.session}`);
      if (removed.status !== 204 && removed.status !== 404) throw problem('gateway-failed');
      store.removeAccount(row.id);
      console.log(`wa unlink ok account=${row.id}`);
      return { ok: true };
    },
    // requestId names one press of the send button. Repeating a request never sends twice: an answer that was
    // already "sent" is given again, and OpenWA gets the same idempotency key until it has answered.
    'POST /api/wa/send': async req => {
      employee(req);
      const config = settings();
      const { account, to, text, requestId } = await readJson(req);
      if (typeof text !== 'string' || !text.trim() || typeof to !== 'string' || !CHAT.test(to) || typeof requestId !== 'string' || !CLIENT.test(requestId)) throw problem('invalid-request');
      if (text.length > MAX_TEXT) throw problem('too-long');
      const row = store.account(typeof account === 'string' ? account : '');
      if (!row) throw problem('unknown-account');
      const digest = crypto.createHash('sha256').update(JSON.stringify([row.id, to, text])).digest('hex');
      const earlier = store.request(requestId);
      if (earlier && earlier.digest !== digest) throw problem('request-conflict');
      if (earlier?.outcome) return JSON.parse(earlier.outcome);
      if (!earlier) store.addRequest(requestId, digest);
      const answer = await ask(config, 'POST', `/api/sessions/${row.session}/messages/send-text`, { chatId: to, text }, { 'Idempotency-Key': `${siteId}-${requestId}` });
      if (answer.status === 201 && answer.body?.messageId) {
        const outcome = { messageId: String(answer.body.messageId), timestamp: Number(answer.body.timestamp) > 0 ? Number(answer.body.timestamp) * 1000 : now() };
        store.finishRequest(requestId, outcome);
        console.log(`wa send ok account=${row.id} chars=${text.length}`);
        return outcome;
      }
      const code = answer.status === 422 ? 'request-conflict' : answer.status === 400 ? 'send-refused' : answer.status === 404 ? 'not-connected'
        : answer.status === 409 && !String(answer.body?.code || '').startsWith('IDEMPOTENCY_') ? 'not-connected' : 'outcome-unknown';
      console.error(`wa send failed account=${row.id} error=${code} upstream=${answer.status}`);
      throw problem(code);
    },
    'POST /api/wa/claim': async req => {
      employee(req);
      const { client } = await readJson(req);
      if (typeof client !== 'string' || !CLIENT.test(client)) throw problem('invalid-request');
      holder = client;
      wake();
      return { ok: true, last: store.lastEvent() };
    },
    'GET /api/wa/events': async (req, url) => {
      employee(req);
      const client = url.searchParams.get('client') || '';
      const after = Number(url.searchParams.get('after') || 0);
      const wait = Math.min(MAX_WAIT_SECONDS, Number(url.searchParams.get('wait') || 0));
      if (!CLIENT.test(client) || !Number.isInteger(after) || after < 0 || !(wait >= 0)) throw problem('invalid-request');
      holder ??= client;
      const read = () => {
        if (holder !== client) throw problem('taken-over');
        const rows = store.eventsAfter(after, FEED_PAGE);
        return rows.length ? { events: rows.map(present).filter(Boolean), last: rows.at(-1).seq } : null;
      };
      let found = read();
      if (!found && wait > 0) {
        await new Promise(resolve => {
          const release = () => {
            clearTimeout(timer);
            waiting.delete(release);
            req.off('close', release);
            resolve();
          };
          const timer = setTimeout(release, wait * 1000);
          waiting.add(release);
          req.on('close', release);
        });
        found = read();
      }
      return found || { events: [], last: after };
    },
    'POST /api/wa/hook': async req => {
      const config = settings();
      const raw = await readRaw(req, MAX_HOOK_BODY);
      if (!signed(raw, req.headers['x-openwa-signature'], config.hookSecret)) throw problem('bad-signature');
      let delivery = null;
      try {
        delivery = JSON.parse(raw.toString('utf8'));
      } catch {}
      if (!delivery || typeof delivery.event !== 'string' || typeof delivery.sessionId !== 'string' || typeof delivery.idempotencyKey !== 'string' || !delivery.idempotencyKey) throw problem('invalid-request');
      const row = store.accountOfSession(delivery.sessionId);
      if (!row || !EVENTS.includes(delivery.event)) return { ok: true, stored: false };
      const data = delivery.data && typeof delivery.data === 'object' ? delivery.data : {};
      // The bytes of a picture or a recording are not kept here; they are fetched from OpenWA when needed.
      if (data.media && typeof data.media === 'object') delete data.media.data;
      const at = Number.isNaN(Date.parse(delivery.timestamp)) ? new Date(now()).toISOString() : new Date(delivery.timestamp).toISOString();
      const stored = store.addEvent({ key: delivery.idempotencyKey, account: row.id, name: delivery.event, at, body: JSON.stringify(data) });
      if (stored) {
        console.log(`wa hook stored event=${delivery.event} account=${row.id}`);
        wake();
      }
      return { ok: true, stored };
    },
  };

  async function handle(req, res, pathname) {
    const route = routes[`${req.method} ${pathname}`];
    if (!route) {
      const known = Object.keys(routes).some(key => key.endsWith(' ' + pathname));
      return sendJson(res, known ? 405 : 404, { error: known ? 'method-not-allowed' : 'not-found' });
    }
    // A page of another site must not act with this site's cookie: browsers mark such requests.
    if (pathname !== '/api/wa/hook' && req.method !== 'GET' && req.headers['sec-fetch-site'] === 'cross-site') {
      req.resume();
      return sendJson(res, 403, { error: 'forbidden' });
    }
    try {
      return sendJson(res, 200, await route(req, new URL(req.url, 'http://localhost')));
    } catch (error) {
      if (!error.code || !Object.hasOwn(STATUS, error.code)) {
        console.error(`wa request failed route=${req.method} ${pathname} error=${error.code || error.name}`);
        return sendJson(res, 500, { error: 'internal' });
      }
      if (error.code === 'gateway-unreachable' || error.code === 'gateway-refused' || error.code === 'gateway-failed') console.error(`wa request failed route=${req.method} ${pathname} error=${error.code}`);
      return sendJson(res, STATUS[error.code], { error: error.code });
    }
  }

  return { handle, store, close: () => { wake(); store.close(); } };
}

module.exports = { create, loadConfig, present, signed, EVENTS, STATES };
