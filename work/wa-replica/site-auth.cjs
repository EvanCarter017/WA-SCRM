// Accounts and sign-in sessions of the platform. One database file holds every account: employees ("agent",
// each belonging to one sub-site), supervisors and administrators. Passwords are stored as scrypt hashes,
// session tokens as SHA-256 hashes; neither a password nor a token is ever logged.
// Needs Node 22.13 or newer (built-in SQLite).
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');

const ROLES = ['agent', 'supervisor', 'admin'];
const USERNAME = /^[a-z0-9][a-z0-9._-]{2,31}$/;
// Eight characters since 2026-11-23, on the owner's decision: the system is used internally for now. To be
// raised again (it was ten) before it is opened to outside services.
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };
const SESSION_IDLE_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_MAX_MS = 30 * 24 * 60 * 60 * 1000;
const TOUCH_EVERY_MS = 60 * 1000;
const LOCK_AFTER = 5;
const LOCK_MS = 5 * 60 * 1000;

const problem = code => Object.assign(new Error(code), { code });
const scrypt = (password, salt, options) => new Promise((resolve, reject) => {
  crypto.scrypt(password, salt, options.keylen, { N: options.N, r: options.r, p: options.p }, (error, key) => error ? reject(error) : resolve(key));
});
const tokenHash = token => crypto.createHash('sha256').update(token).digest('hex');

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), key.toString('base64')].join('$');
}

async function checkPassword(password, stored) {
  const [scheme, N, r, p, salt, key] = String(stored).split('$');
  if (scheme !== 'scrypt') return false;
  const expected = Buffer.from(key, 'base64');
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), { N: Number(N), r: Number(r), p: Number(p), keylen: expected.length });
  return crypto.timingSafeEqual(actual, expected);
}

// A password people can type: 16 characters without look-alikes.
function temporaryPassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(16), byte => letters[byte % letters.length]).join('');
}

function validPassword(password) {
  return typeof password === 'string' && password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;
}

// Opens (and creates) the account database. now() is replaceable for tests.
function openAuth(file, { now = () => Date.now() } = {}) {
  const db = new DatabaseSync(file);
  // The servers of several sub-sites and the administration tool use this file at the same time: a write waits
  // for another one that is under way instead of failing.
  db.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('agent', 'supervisor', 'admin')),
      site TEXT,
      password TEXT NOT NULL,
      must_change INTEGER NOT NULL DEFAULT 1,
      disabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL
    );
  `);
  const failures = new Map(); // username → { count, lockedUntil }
  const iso = () => new Date(now()).toISOString();
  const publicUser = row => row && { id: row.id, username: row.username, name: row.name, role: row.role, site: row.site, mustChangePassword: Boolean(row.must_change), disabled: Boolean(row.disabled) };
  const byName = username => db.prepare('SELECT * FROM users WHERE username = ?').get(String(username || '').trim().toLowerCase());
  // The hash a sign-in is compared with when the account does not exist, so that it takes as long as a real one.
  const decoy = hashPassword(crypto.randomBytes(16).toString('hex'));

  async function createUser({ username, name, role, site = null, password }) {
    const normalised = String(username || '').trim().toLowerCase();
    if (!USERNAME.test(normalised)) throw problem('invalid-username');
    if (!ROLES.includes(role)) throw problem('invalid-role');
    if (role === 'agent' && !site) throw problem('site-required');
    if (!String(name || '').trim()) throw problem('invalid-name');
    if (byName(normalised)) throw problem('username-taken');
    const initial = password === undefined ? temporaryPassword() : password;
    if (!validPassword(initial)) throw problem('invalid-password');
    db.prepare('INSERT INTO users (username, name, role, site, password, must_change, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)')
      .run(normalised, String(name).trim(), role, role === 'agent' ? String(site) : null, await hashPassword(initial), iso());
    return { user: publicUser(byName(normalised)), password: initial };
  }

  // An administrator's reset: a new temporary password, to be changed at the next sign-in; every session ends.
  async function resetPassword(username) {
    const row = byName(username);
    if (!row) throw problem('unknown-user');
    const password = temporaryPassword();
    db.prepare('UPDATE users SET password = ?, must_change = 1 WHERE id = ?').run(await hashPassword(password), row.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.id);
    failures.delete(row.username);
    return { user: publicUser(byName(row.username)), password };
  }

  // The owner's own change. Ends every other session of the account.
  async function changePassword(userId, current, next, keepToken) {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!row || !(await checkPassword(String(current || ''), row.password))) throw problem('invalid-credentials');
    if (!validPassword(next) || next === current) throw problem('invalid-password');
    db.prepare('UPDATE users SET password = ?, must_change = 0 WHERE id = ?').run(await hashPassword(next), row.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?').run(row.id, keepToken ? tokenHash(keepToken) : '');
    return publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(userId));
  }

  function setDisabled(username, disabled) {
    const row = byName(username);
    if (!row) throw problem('unknown-user');
    db.prepare('UPDATE users SET disabled = ? WHERE id = ?').run(disabled ? 1 : 0, row.id);
    if (disabled) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.id);
    return publicUser(byName(row.username));
  }

  // Checks a sign-in. Resolves to { token, user }; every failure is the same error, except a temporary lock.
  async function signIn(username, password) {
    const key = String(username || '').trim().toLowerCase();
    const failed = failures.get(key);
    if (failed && failed.lockedUntil > now()) throw Object.assign(problem('too-many-attempts'), { retryAfter: Math.ceil((failed.lockedUntil - now()) / 1000) });
    const row = byName(key);
    const matches = await checkPassword(String(password || ''), row ? row.password : await decoy);
    if (!row || !matches || row.disabled) {
      const count = (failed && failed.lockedUntil <= now() && failed.count >= LOCK_AFTER ? 0 : failed?.count || 0) + 1;
      if (failures.size > 5000) failures.clear(); // made-up names must not fill the memory
      failures.set(key, { count, lockedUntil: count >= LOCK_AFTER ? now() + LOCK_MS : 0 });
      throw problem('invalid-credentials');
    }
    failures.delete(key);
    const token = crypto.randomBytes(32).toString('base64url');
    db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, last_seen) VALUES (?, ?, ?, ?)').run(tokenHash(token), row.id, now(), now());
    return { token, user: publicUser(row) };
  }

  // The signed-in user of a token, or null. A session ends after seven idle days and after thirty days at most.
  function sessionUser(token) {
    if (typeof token !== 'string' || !token) return null;
    const hash = tokenHash(token);
    const row = db.prepare('SELECT s.created_at AS session_created, s.last_seen, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?').get(hash);
    if (!row) return null;
    if (row.disabled || now() - row.last_seen > SESSION_IDLE_MS || now() - row.session_created > SESSION_MAX_MS) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash);
      return null;
    }
    if (now() - row.last_seen > TOUCH_EVERY_MS) db.prepare('UPDATE sessions SET last_seen = ? WHERE token_hash = ?').run(now(), hash);
    return publicUser(row);
  }

  function signOut(token) {
    if (typeof token === 'string' && token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
  }

  const listUsers = () => db.prepare('SELECT * FROM users ORDER BY username').all().map(publicUser);
  return { createUser, resetPassword, changePassword, setDisabled, signIn, sessionUser, signOut, listUsers, close: () => db.close() };
}

module.exports = { openAuth, ROLES, PASSWORD_MIN, SESSION_IDLE_MS, SESSION_MAX_MS, LOCK_AFTER, LOCK_MS };
