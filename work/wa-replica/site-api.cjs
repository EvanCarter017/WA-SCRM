// Sign-in and data routes of one sub-site, used by the preview server when WA_SCRM_DATA_DIR is set:
//   GET  /api/site/status    is the sub-site's server side switched on?
//   POST /api/auth/login     { username, password } → session cookie, and the cookie that names the sub-site
//   POST /api/auth/logout
//   GET  /api/auth/me        the signed-in user (401 when nobody is signed in)
//   GET  /api/auth/session   the signed-in user or null; what the page asks when it opens
//   POST /api/auth/password  { current, next }
//   GET  /api/auth/sites     the sub-sites and their employees, for supervisors and administrators
//   GET  /api/auth/users     every account, for supervisors and administrators
//   POST /api/auth/users     { username, name, role: 'supervisor', password? } → a new supervisor's account
//   POST /api/auth/users/reset | disable | enable   { username }: a new temporary password; the account off, on
//   GET  /api/data           the sub-site's data document; ?fields=a,b gives only these top-level fields
//   PUT  /api/data           { baseVersion, set, remove }
//   DELETE /api/data         { baseVersion, field }: takes a field out for good, with every trace of it
// The employee the sub-site belongs to reads and writes its data; supervisors and administrators read it, and
// each of their reads leaves a log line that says who read which sub-site and which fields.
// Supervisors and administrators manage the accounts: never their own, and an administrator's only as an
// administrator. Each of these actions leaves a log line with who did it and to which account.
// A log line carries the action, the user name and the outcome; never a password, a token or data.
//
// Several sub-sites can share one address. Each runs this server with its own WA_SCRM_SITE_ID on the same data
// folder — there is one set of accounts — and a gateway in front of them passes the requests for a sub-site's
// data (/api/data) and WhatsApp link (/api/wa/*) to the sub-site that the cookie scrm_site names; everything
// else can be answered by any of them. That cookie only says where a request goes: it grants nothing, every
// sub-site checks the session and the account's sub-site itself.
const path = require('node:path');
const fs = require('node:fs');
const { openAuth } = require('./site-auth.cjs');
const { openData } = require('./site-data.cjs');

const COOKIE = 'scrm_sid';
const SITE_COOKIE = 'scrm_site';
const MAX_BODY = 8 * 1024 * 1024;
// The fields that can be taken out for good, leaving no trace (see purge in site-data.cjs).
const PURGEABLE = ['priceList'];
const SITE_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const FIELD = /^[A-Za-z][A-Za-z0-9]{0,39}$/;
const NAME_MAX = 60;
const STATUS = {
  'invalid-request': 400, 'invalid-password': 400, 'key-conflict': 400, 'not-signed-in': 401, 'invalid-credentials': 401,
  'password-change-required': 403, 'forbidden': 403, 'read-only': 403, 'version-conflict': 409, 'too-long': 413, 'too-many-attempts': 429,
  'invalid-username': 400, 'invalid-name': 400, 'invalid-role': 400, 'own-account': 400, 'unknown-user': 404, 'username-taken': 409,
};
const problem = (code, extra = {}) => Object.assign(new Error(code), { code, ...extra });

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  if ((req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') throw problem('invalid-request');
  let size = 0;
  const chunks = [];
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > MAX_BODY) {
      req.resume();
      throw problem('too-long');
    }
    chunks.push(chunk);
  }
  let body = null;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {}
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw problem('invalid-request');
  return body;
}

function cookieValue(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0 && part.slice(0, at).trim() === name) return part.slice(at + 1).trim();
  }
  return '';
}
const cookieToken = req => cookieValue(req, COOKIE);

// A cookie is marked Secure when the request came in over HTTPS, or when WA_SCRM_COOKIE_SECURE=1.
function cookieHeader(req, token, maxAgeSeconds, name = COOKIE) {
  const secure = process.env.WA_SCRM_COOKIE_SECURE === '1' || req.headers['x-forwarded-proto'] === 'https';
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`;
}
// The cookie that names an employee's sub-site, for as long as a session lasts at most; anyone else's is taken away.
const siteCookie = (req, user) => (user?.role === 'agent' ? cookieHeader(req, user.site, 30 * 24 * 60 * 60, SITE_COOKIE) : cookieHeader(req, '', 0, SITE_COOKIE));

function create({ dir, siteId = 'default', now }) {
  if (!SITE_ID.test(siteId)) throw new Error('WA_SCRM_SITE_ID must be lower-case letters, digits and hyphens');
  // The databases hold password hashes and customer data: every file this process creates from now on is private.
  process.umask(0o077);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const auth = openAuth(path.join(dir, 'auth.db'), { now });
  const data = openData(path.join(dir, `site-${siteId}.db`), { now });

  const authenticate = req => auth.sessionUser(cookieToken(req));
  // May this request use the other services of the server (the AI relay)? Signed in, and no password change pending.
  const allows = req => { const user = authenticate(req); return Boolean(user && !user.mustChangePassword); };
  // Who may read this sub-site's data: its own employee, and every supervisor and administrator.
  const mayRead = user => user.role !== 'agent' || user.site === siteId;
  const mayWrite = user => user.role === 'agent' && user.site === siteId;

  function signedIn(req, { allowPendingPassword = false } = {}) {
    const user = authenticate(req);
    if (!user) throw problem('not-signed-in');
    if (user.mustChangePassword && !allowPendingPassword) throw problem('password-change-required');
    return user;
  }

  // Who manages accounts: a supervisor or an administrator.
  function manager(req) {
    const user = signedIn(req);
    if (user.role === 'agent') throw problem('forbidden');
    return user;
  }
  // The account a manager acts on: another one than their own, and an administrator's only for an administrator.
  function managed(actor, username) {
    const target = auth.listUsers().find(user => user.username === String(username || '').trim().toLowerCase());
    if (!target) throw problem('unknown-user');
    if (target.username === actor.username) throw problem('own-account');
    if (target.role === 'admin' && actor.role !== 'admin') throw problem('forbidden');
    return target;
  }
  const brief = user => ({ username: user.username, name: user.name, role: user.role });

  const routes = {
    'GET /api/site/status': () => ({ body: { enabled: true, site: siteId } }),
    'POST /api/auth/login': async req => {
      const body = await readJson(req);
      try {
        const { token, user } = await auth.signIn(body.username, body.password);
        console.log(`site login ok user=${user.username}`);
        return { body: { user }, headers: { 'Set-Cookie': [cookieHeader(req, token, 30 * 24 * 60 * 60), siteCookie(req, user)] } };
      } catch (error) {
        if (error.code) console.error(`site login failed error=${error.code}`);
        throw error;
      }
    },
    'POST /api/auth/logout': req => {
      auth.signOut(cookieToken(req));
      return { body: { ok: true }, headers: { 'Set-Cookie': [cookieHeader(req, '', 0), siteCookie(req, null)] } };
    },
    'GET /api/auth/me': req => ({ body: { user: signedIn(req, { allowPendingPassword: true }), site: siteId } }),
    'GET /api/auth/session': req => {
      const user = authenticate(req);
      // An employee whose request does not name their sub-site — the cookie is gone, or is another account's —
      // gets it again: the page asks this first, so what it asks next goes to the right sub-site.
      const named = user?.role !== 'agent' || cookieValue(req, SITE_COOKIE) === user.site;
      return { body: { user, site: siteId }, headers: named ? {} : { 'Set-Cookie': siteCookie(req, user) } };
    },
    'POST /api/auth/password': async req => {
      const user = signedIn(req, { allowPendingPassword: true });
      const body = await readJson(req);
      const changed = await auth.changePassword(user.id, body.current, body.next, cookieToken(req));
      console.log(`site password changed user=${user.username}`);
      return { body: { user: changed } };
    },
    // The sub-sites and the employees of each, from the accounts: what the supervisor page lists.
    'GET /api/auth/sites': req => {
      if (signedIn(req).role === 'agent') throw problem('forbidden');
      const sites = new Map();
      for (const account of auth.listUsers()) {
        if (account.role !== 'agent') continue;
        if (!sites.has(account.site)) sites.set(account.site, []);
        sites.get(account.site).push({ username: account.username, name: account.name, disabled: account.disabled });
      }
      return { body: { sites: [...sites].sort(([a], [b]) => (a < b ? -1 : 1)).map(([site, employees]) => ({ site, employees })) } };
    },
    // Accounts, managed from the supervisor page.
    'GET /api/auth/users': req => {
      manager(req);
      return { body: { users: auth.listUsers().map(({ username, name, role, site, mustChangePassword, disabled }) => ({ username, name, role, site, mustChangePassword, disabled })) } };
    },
    'POST /api/auth/users': async req => {
      const actor = manager(req), body = await readJson(req);
      if (typeof body.username !== 'string' || typeof body.name !== 'string') throw problem('invalid-request');
      if (body.role !== 'supervisor') throw problem('invalid-role');
      if (body.name.trim().length > NAME_MAX) throw problem('invalid-name');
      if (body.password !== undefined && typeof body.password !== 'string') throw problem('invalid-password');
      // A password that is given is the account's own. Without one a temporary password is made, which its
      // owner has to change at the first sign-in; it goes back in this answer and is kept nowhere.
      const given = Boolean(body.password);
      const { user, password } = await auth.createUser({ username: body.username, name: body.name, role: body.role, password: given ? body.password : undefined, mustChange: !given });
      console.log(`site account created by=${actor.username} user=${user.username} role=${user.role}`);
      return { body: { user: brief(user), ...(given ? {} : { password }) } };
    },
    'POST /api/auth/users/reset': async req => {
      const actor = manager(req), target = managed(actor, (await readJson(req)).username);
      const { password } = await auth.resetPassword(target.username);
      console.log(`site account reset by=${actor.username} user=${target.username}`);
      return { body: { user: brief(target), password } };
    },
    'POST /api/auth/users/disable': async req => {
      const actor = manager(req), target = managed(actor, (await readJson(req)).username);
      auth.setDisabled(target.username, true);
      console.log(`site account disabled by=${actor.username} user=${target.username}`);
      return { body: { ok: true } };
    },
    'POST /api/auth/users/enable': async req => {
      const actor = manager(req), target = managed(actor, (await readJson(req)).username);
      auth.setDisabled(target.username, false);
      console.log(`site account enabled by=${actor.username} user=${target.username}`);
      return { body: { ok: true } };
    },
    'GET /api/data': req => {
      const user = signedIn(req);
      if (!mayRead(user)) throw problem('forbidden');
      const asked = new URL(req.url, 'http://localhost').searchParams.get('fields');
      const fields = asked === null ? null : asked.split(',');
      if (fields && (fields.length > 20 || !fields.every(field => FIELD.test(field)))) throw problem('invalid-request');
      // Who is not the sub-site's own employee leaves a line for every read: who, which sub-site, which fields.
      if (user.role !== 'agent') console.log(`site data read user=${user.username} role=${user.role} site=${siteId} fields=${fields ? fields.join(',') : 'all'}`);
      return { body: data.read(fields) };
    },
    'PUT /api/data': async req => {
      const user = signedIn(req);
      if (!mayRead(user)) throw problem('forbidden');
      if (!mayWrite(user)) throw problem('read-only');
      const body = await readJson(req);
      const saved = data.write({ baseVersion: body.baseVersion, set: body.set, remove: body.remove, by: user.username });
      return { body: saved };
    },
    // Nothing of it is written to the log: what was removed is not to be told anywhere.
    'DELETE /api/data': async req => {
      const user = signedIn(req);
      if (!mayRead(user)) throw problem('forbidden');
      if (!mayWrite(user)) throw problem('read-only');
      const body = await readJson(req);
      if (!PURGEABLE.includes(body.field)) throw problem('invalid-request');
      return { body: data.purge({ baseVersion: body.baseVersion, field: body.field, by: user.username }) };
    },
  };

  async function handle(req, res, pathname) {
    const route = routes[`${req.method} ${pathname}`];
    if (!route) {
      const known = Object.keys(routes).some(key => key.endsWith(' ' + pathname));
      return sendJson(res, known ? 405 : 404, { error: known ? 'method-not-allowed' : 'not-found' });
    }
    // A page of another site must not act with this site's cookie: browsers mark such requests.
    if (req.method !== 'GET' && req.headers['sec-fetch-site'] === 'cross-site') {
      req.resume();
      return sendJson(res, 403, { error: 'forbidden' });
    }
    try {
      const { body, headers } = await route(req);
      return sendJson(res, 200, body, headers);
    } catch (error) {
      if (!error.code || !Object.hasOwn(STATUS, error.code)) {
        console.error(`site request failed route=${req.method} ${pathname} error=${error.code || error.name}`);
        return sendJson(res, 500, { error: 'internal' });
      }
      const extra = error.code === 'version-conflict' ? { version: error.version } : error.code === 'too-many-attempts' ? { retryAfter: error.retryAfter } : {};
      return sendJson(res, STATUS[error.code], { error: error.code, ...extra }, error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {});
    }
  }

  return { handle, authenticate, allows, auth, data, siteId, close: () => { auth.close(); data.close(); } };
}

module.exports = { create, COOKIE, SITE_COOKIE };
