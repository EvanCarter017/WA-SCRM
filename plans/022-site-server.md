# Plan 022: Server side of a sub-site — accounts, sign-in sessions and data

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat f7dc51e..HEAD -- work/wa-replica README.md PRODUCT.md replica/build-log.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (first code that stores passwords and data on the server; nothing a user sees changes yet)
- **Depends on**: plans/021-remove-ai-demo.md (DONE)
- **Category**: direction
- **Planned at**: commit `f7dc51e`, 2026-11-21

## Why this matters

Until now this product keeps everything in the visitor's browser: customers, chats, to-dos, tags. Every browser has its own copy, there is no sign-in, and the AI relay answers anyone. On 2026-11-21 the owner decided to turn the prototype into a product ("Transition everything from a prototype state to a production-ready state") and described the target: every employee has an individual account; each employee works in a "sub-site" of their own; supervisors and technical staff manage the sub-sites and can read their data. Five employees with one WhatsApp number each are planned.

This plan builds the **server side of one sub-site**. Nothing the user sees changes: the page is not touched, and the new routes are off unless the server is started with a data folder. The next plan switches the page over (real sign-in screen, data on the server, no fictional data).

What the server can do after this plan, when started with `WA_SCRM_DATA_DIR`:

1. **Accounts** with three roles — `agent` (an employee; belongs to one sub-site), `supervisor` and `admin`. Passwords are stored as scrypt hashes. A new account gets a temporary password that must be changed at the first sign-in.
2. **Sign-in sessions** in an HttpOnly cookie; five failed attempts lock the name for five minutes; a session ends after seven idle days and after thirty days at most.
3. **The sub-site's data** as one document saved by key with a version number: a save that is based on an older version is refused, so two open pages cannot silently overwrite each other. The employee reads and writes; supervisors and administrators read only.
4. **The AI relay** answers signed-in users only.
5. An **administration tool** for the command line creates, resets and disables accounts and exports and imports a sub-site's data.

### Decisions already made (do not re-open; do not ask)

- Storage is SQLite through Node's built-in module `node:sqlite`; no dependency is added. This needs **Node 22.13 or newer**. Without `WA_SCRM_DATA_DIR` the server does not load that module and still runs on Node 18.
- One database file for all accounts (`auth.db`) and one per sub-site (`site-<id>.db`), both in the data folder, which lies outside the repository.
- The page is served without sign-in (it will show the sign-in screen of the next plan); only the data, the relay and the account routes ask for a session.
- Protection against requests from other websites: the cookie is `SameSite=Lax`, bodies must be JSON, and a request the browser marks as cross-site is refused.
- A supervisor or administrator cannot write a sub-site's data.
- No route for creating accounts over the web in this plan: accounts are made with the tool on the server.
- The six files of Steps 2 and 3 are given in full; write them as given.
- The version string and `requirement.updatedOn` do not change; the build's requirement records are not touched.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser, and a small Node server, `work/wa-replica/serve.cjs`, that serves the built page from `outputs/wa-replica-prototype/` and relays AI requests (`work/wa-replica/ai-relay.cjs`, routes `/api/ai/*`). There is no package.json. Documentation text is **Simplified Chinese**; write it exactly as given in this plan.

### The preview server, `work/wa-replica/serve.cjs`

52 lines; sha256 at the planned commit `04d6d477081f47edb68571529e3490db3681092bc398aab9303484b82c8753dd`. It reads the port from its first argument (`0` picks a free port), prints `PREVIEW_URL=http://127.0.0.1:<port>` when ready, sends `/api/ai/*` to the relay and everything else to the static files. Step 3 replaces the file as a whole.

### Tests that exist

`work/wa-replica/ai-relay.test.cjs` (twelve tests, Node's built-in test runner). Its last test starts `serve.cjs`; it must keep passing, also on Node 18.

### The validator, `work/wa-replica/validate-scrm-lifecycle.cjs`

Numbered sections 1–18 of assertions over sources and built files, then a `const summary = {` object written to `outputs/wa-replica-prototype/validation.json`. It already defines `read`, `path`, `fs`, `assert`, `appJs` (the built page script) and `serveSource` (the text of `serve.cjs`).

### Repo conventions to match

- Two-space indentation, semicolons, single quotes.
- Commit messages: conventional commits, e.g. `feat(scrm): remove the reviewer tools`.

## Commands you will need

Run from the repository root (inside your worktree).

**This plan needs Node 22.13 or newer for the new tests.** Run `node --version`. If it prints an older version, find a newer binary on the machine (for example `ls ~/.local/node/bin/node`) and set `NODE` to its full path; otherwise set `NODE=node`. If the machine has none, STOP. The commands below use `$NODE` where the version matters.

| Purpose | Command | Expected on success |
|---|---|---|
| New tests | `$NODE --test work/wa-replica/site-api.test.cjs` | the summary shows `pass 12` and `fail 0` |
| Relay tests (with the machine's default Node) | `node --test work/wa-replica/ai-relay.test.cjs` | the summary shows `pass 12` and `fail 0` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Server smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-022/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |
| Checksum of a file | `sha256sum <file>` | the value given in the step |

The build (`node work/wa-replica/build-fidelity.cjs`) is **not** run in this plan: no file it reads changes.

## Scope

**In scope** (the only files you may create or modify):

- New: `work/wa-replica/site-auth.cjs`, `work/wa-replica/site-data.cjs`, `work/wa-replica/site-api.cjs`, `work/wa-replica/site-admin.cjs`, `work/wa-replica/site-api.test.cjs` (Step 2)
- `work/wa-replica/serve.cjs` (Step 3)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 4)
- `README.md`, `PRODUCT.md`, `replica/build-log.md` (Step 5)
- `outputs/wa-replica-prototype/validation.json`, **only by running the validator**

**Out of scope** (do NOT touch):

- The page: every `fidelity-*` file, `fidelity-base/**`, the build script, and every other file under `outputs/`.
- `work/wa-replica/ai-relay.cjs`, `ai-relay.test.cjs`, `ai.env.example`.
- Any real password, key or data folder inside the repository. Do not create a data folder in the repository; the tests use temporary folders.
- A web route for creating accounts; a change of the page to use the new routes (the next plan).
- `plans/**`, `outputs/review-prompts/**`, earlier entries of `replica/build-log.md`.
- New dependencies or a package.json.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/022-site-server` first.
- One to three commits are fine. Conventional commit message, e.g. `feat(scrm): accounts, sign-in sessions and data on the server`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: a **New file** / **Whole file** instruction gives the complete content of a file; compare the checksum afterwards. An **Edit** gives a text to find (it occurs exactly once in the named file) and the text that replaces it. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. A block fenced with four backticks contains lines with three backticks that belong to the text.

### Step 1: Create the server smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-022/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-022 && cat > /tmp/wa-scrm-plan-022/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks what the preview server answers without and with a data folder. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); OUT=$(mktemp -d); FAIL=0; NODE=${NODE:-node}
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
start() { PORT=$(( 56400 + RANDOM % 400 )); env -u WA_SCRM_AI_ENV "$@" "$NODE" "$ROOT/work/wa-replica/serve.cjs" "$PORT" >"$OUT/serve.log" 2>&1 & SRV=$!; for i in $(seq 1 40); do curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break; sleep 0.25; done; }
start -u WA_SCRM_DATA_DIR
same 'without a data folder: the page is served' "$(code "http://127.0.0.1:$PORT/")" 200
same 'without a data folder: the app script is served' "$(code "http://127.0.0.1:$PORT/app.js")" 200
same 'without a data folder: status says off' "$(curl -s "http://127.0.0.1:$PORT/api/site/status")" '{"enabled":false}'
same 'without a data folder: sign-in routes are off' "$(code "http://127.0.0.1:$PORT/api/auth/me")" 503
same 'without a data folder: the relay answers as before' "$(curl -s "http://127.0.0.1:$PORT/api/ai/status")" '{"configured":false,"reason":"no-settings-file"}'
kill "$SRV" 2>/dev/null; wait "$SRV" 2>/dev/null
start WA_SCRM_DATA_DIR="$OUT/data" WA_SCRM_SITE_ID=demo
same 'with a data folder: the page is served' "$(code "http://127.0.0.1:$PORT/")" 200
same 'with a data folder: status says on' "$(curl -s "http://127.0.0.1:$PORT/api/site/status")" '{"enabled":true,"site":"demo"}'
same 'with a data folder: data needs sign-in' "$(curl -s "http://127.0.0.1:$PORT/api/data")" '{"error":"not-signed-in"}'
same 'with a data folder: the relay needs sign-in' "$(code "http://127.0.0.1:$PORT/api/ai/status")" 401
same 'with a data folder: a wrong sign-in is refused' "$(code -X POST -H 'Content-Type: application/json' -d '{"username":"nobody","password":"not a real one"}' "http://127.0.0.1:$PORT/api/auth/login")" 401
kill "$SRV" 2>/dev/null; wait "$SRV" 2>/dev/null
same 'the data folder was created with private rights' "$(stat -c '%a' "$OUT/data" 2>/dev/null)" 700
echo "artifacts: $OUT"
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-022/smoke.sh && ls -l /tmp/wa-scrm-plan-022/smoke.sh
```

**Verify**: `$NODE --version` → v22.13 or newer; `sha256sum work/wa-replica/serve.cjs` → `04d6d477081f47edb68571529e3490db3681092bc398aab9303484b82c8753dd`; `NODE=$NODE bash /tmp/wa-scrm-plan-022/smoke.sh; git status --porcelain` → the first line is `ok   Node … is new enough`; exactly these checks fail, so the run ends with `SMOKE FAIL` (expected at this point): the two `MISS without a data folder: …` lines about the status and the sign-in routes, the four `MISS with a data folder: …` lines about the status, the data, the relay and the sign-in, and `MISS the data folder was created with private rights` — seven in all; `git status --porcelain` prints **nothing**. If another check fails, the checksum differs, or `git status` shows changes, STOP.

### Step 2: The five new files

**New file 2.1** — create `work/wa-replica/site-auth.cjs` with this content (164 lines; one newline at the end of the last line and nothing after it):

```js
// Accounts and sign-in sessions of the platform. One database file holds every account: employees ("agent",
// each belonging to one sub-site), supervisors and administrators. Passwords are stored as scrypt hashes,
// session tokens as SHA-256 hashes; neither a password nor a token is ever logged.
// Needs Node 22.13 or newer (built-in SQLite).
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');

const ROLES = ['agent', 'supervisor', 'admin'];
const USERNAME = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const PASSWORD_MIN = 10;
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
  db.exec(`
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
```

**New file 2.2** — create `work/wa-replica/site-data.cjs` with this content (97 lines; one newline at the end of the last line and nothing after it):

```js
// The data of one sub-site: one document, stored as rows so that a save rewrites only what changed.
// A key is the name of a top-level field ("customers"), or "<field>/<id>" for one entry of a field that is a
// map ("messages/c4"). Every save names the version it was based on; a save based on an older version is
// refused, so two open pages cannot silently overwrite each other.
// Needs Node 22.13 or newer (built-in SQLite).
const { DatabaseSync } = require('node:sqlite');

const KEY = /^[A-Za-z][A-Za-z0-9]{0,39}(\/[A-Za-z0-9_.-]{1,80})?$/;
const MAX_VALUE = 2 * 1024 * 1024;
const SAVES_KEPT = 10000;

const problem = (code, extra = {}) => Object.assign(new Error(code), { code, ...extra });

// Opens (and creates) the database of one sub-site. now() is replaceable for tests.
function openData(file, { now = () => Date.now() } = {}) {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS doc (key TEXT PRIMARY KEY, json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS saves (version INTEGER PRIMARY KEY, at TEXT NOT NULL, by TEXT NOT NULL, keys TEXT NOT NULL);
  `);
  const version = () => db.prepare('SELECT COALESCE(MAX(version), 0) AS v FROM saves').get().v;

  // The whole document with its version. Split fields are put together again.
  function read() {
    const data = {};
    for (const { key, json } of db.prepare('SELECT key, json FROM doc ORDER BY key').all()) {
      const [field, id] = key.split('/');
      if (id === undefined) data[field] = JSON.parse(json);
      else (data[field] ??= {})[id] = JSON.parse(json);
    }
    return { version: version(), data };
  }

  function apply(set, remove, by) {
    const current = version();
    for (const [key, json] of set) {
      const [field, id] = key.split('/');
      // A field is stored either whole or split: a whole value replaces its parts, a part needs a split field.
      if (id === undefined) db.prepare('DELETE FROM doc WHERE key LIKE ?').run(field + '/%');
      else if (db.prepare('SELECT 1 FROM doc WHERE key = ?').get(field)) throw problem('key-conflict');
      db.prepare('INSERT INTO doc (key, json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET json = excluded.json').run(key, json);
    }
    for (const key of remove) {
      db.prepare('DELETE FROM doc WHERE key = ?').run(key);
      if (!key.includes('/')) db.prepare('DELETE FROM doc WHERE key LIKE ?').run(key + '/%');
    }
    const keys = [...set.map(([key]) => key), ...remove];
    db.prepare('INSERT INTO saves (version, at, by, keys) VALUES (?, ?, ?, ?)').run(current + 1, new Date(now()).toISOString(), String(by), keys.join(' '));
    if ((current + 1) % 1000 === 0) db.prepare('DELETE FROM saves WHERE version <= ?').run(current + 1 - SAVES_KEPT);
    return current + 1;
  }

  function transaction(work) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  // Saves the named keys. baseVersion must be the version the caller last read.
  function write({ baseVersion, set = {}, remove = [], by }) {
    if (!set || typeof set !== 'object' || Array.isArray(set) || !Array.isArray(remove)) throw problem('invalid-request');
    const keys = [...Object.keys(set), ...remove];
    if (!Number.isInteger(baseVersion) || !keys.length || keys.some(key => typeof key !== 'string' || !KEY.test(key)) || new Set(keys).size !== keys.length) throw problem('invalid-request');
    const rows = Object.entries(set).map(([key, value]) => {
      const json = JSON.stringify(value);
      if (json === undefined) throw problem('invalid-request');
      if (json.length > MAX_VALUE) throw problem('too-long');
      return [key, json];
    });
    return transaction(() => {
      const current = version();
      if (baseVersion !== current) throw problem('version-conflict', { version: current });
      return { version: apply(rows, remove, by) };
    });
  }

  // Replaces the whole document (used by the administration tool to load a saved copy).
  function replace(data, by) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(key => !KEY.test(key) || key.includes('/'))) throw problem('invalid-request');
    return transaction(() => {
      db.exec('DELETE FROM doc');
      return { version: apply(Object.entries(data).map(([key, value]) => [key, JSON.stringify(value)]), [], by) };
    });
  }

  const lastSaves = (count = 20) => db.prepare('SELECT version, at, by, keys FROM saves ORDER BY version DESC LIMIT ?').all(count);
  return { read, write, replace, lastSaves, close: () => db.close() };
}

module.exports = { openData, KEY, MAX_VALUE };
```

**New file 2.3** — create `work/wa-replica/site-api.cjs` with this content (151 lines; one newline at the end of the last line and nothing after it):

```js
// Sign-in and data routes of one sub-site, used by the preview server when WA_SCRM_DATA_DIR is set:
//   GET  /api/site/status    is the sub-site's server side switched on?
//   POST /api/auth/login     { username, password } → session cookie
//   POST /api/auth/logout
//   GET  /api/auth/me        the signed-in user
//   POST /api/auth/password  { current, next }
//   GET  /api/data           the sub-site's data document
//   PUT  /api/data           { baseVersion, set, remove }
// The employee the sub-site belongs to reads and writes its data; supervisors and administrators read it.
// A log line carries the action, the user name and the outcome; never a password, a token or data.
const path = require('node:path');
const fs = require('node:fs');
const { openAuth } = require('./site-auth.cjs');
const { openData } = require('./site-data.cjs');

const COOKIE = 'scrm_sid';
const MAX_BODY = 8 * 1024 * 1024;
const SITE_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const STATUS = {
  'invalid-request': 400, 'invalid-password': 400, 'key-conflict': 400, 'not-signed-in': 401, 'invalid-credentials': 401,
  'password-change-required': 403, 'forbidden': 403, 'read-only': 403, 'version-conflict': 409, 'too-long': 413, 'too-many-attempts': 429,
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

function cookieToken(req) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0 && part.slice(0, at).trim() === COOKIE) return part.slice(at + 1).trim();
  }
  return '';
}

// The cookie is marked Secure when the request came in over HTTPS, or when WA_SCRM_COOKIE_SECURE=1.
function cookieHeader(req, token, maxAgeSeconds) {
  const secure = process.env.WA_SCRM_COOKIE_SECURE === '1' || req.headers['x-forwarded-proto'] === 'https';
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`;
}

function create({ dir, siteId = 'default', now }) {
  if (!SITE_ID.test(siteId)) throw new Error('WA_SCRM_SITE_ID must be lower-case letters, digits and hyphens');
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

  const routes = {
    'GET /api/site/status': () => ({ body: { enabled: true, site: siteId } }),
    'POST /api/auth/login': async req => {
      const body = await readJson(req);
      try {
        const { token, user } = await auth.signIn(body.username, body.password);
        console.log(`site login ok user=${user.username}`);
        return { body: { user }, headers: { 'Set-Cookie': cookieHeader(req, token, 30 * 24 * 60 * 60) } };
      } catch (error) {
        if (error.code) console.error(`site login failed error=${error.code}`);
        throw error;
      }
    },
    'POST /api/auth/logout': req => {
      auth.signOut(cookieToken(req));
      return { body: { ok: true }, headers: { 'Set-Cookie': cookieHeader(req, '', 0) } };
    },
    'GET /api/auth/me': req => ({ body: { user: signedIn(req, { allowPendingPassword: true }), site: siteId } }),
    'POST /api/auth/password': async req => {
      const user = signedIn(req, { allowPendingPassword: true });
      const body = await readJson(req);
      const changed = await auth.changePassword(user.id, body.current, body.next, cookieToken(req));
      console.log(`site password changed user=${user.username}`);
      return { body: { user: changed } };
    },
    'GET /api/data': req => {
      const user = signedIn(req);
      if (!mayRead(user)) throw problem('forbidden');
      return { body: data.read() };
    },
    'PUT /api/data': async req => {
      const user = signedIn(req);
      if (!mayRead(user)) throw problem('forbidden');
      if (!mayWrite(user)) throw problem('read-only');
      const body = await readJson(req);
      const saved = data.write({ baseVersion: body.baseVersion, set: body.set, remove: body.remove, by: user.username });
      return { body: saved };
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

module.exports = { create, COOKIE };
```

**New file 2.4** — create `work/wa-replica/site-admin.cjs` with this content (66 lines; one newline at the end of the last line and nothing after it):

```js
// Administration tool for the accounts and the data of a sub-site. Run it on the server, as the user that runs
// the service:
//   node site-admin.cjs user add <username> <agent|supervisor|admin> <display name>
//   node site-admin.cjs user reset <username>        a new temporary password; ends the account's sessions
//   node site-admin.cjs user disable <username>      user enable <username>
//   node site-admin.cjs user list
//   node site-admin.cjs data export <file>           data import <file>
// Environment: WA_SCRM_DATA_DIR (required), WA_SCRM_SITE_ID (the sub-site an agent is created for and whose
// data is exported or imported; default "default"). A temporary password is printed once and stored nowhere
// else; its owner has to change it at the first sign-in. Needs Node 22.13 or newer.
const fs = require('node:fs');
const path = require('node:path');

async function main([area, action, ...rest]) {
  const dir = process.env.WA_SCRM_DATA_DIR;
  const siteId = process.env.WA_SCRM_SITE_ID || 'default';
  if (!dir) throw new Error('WA_SCRM_DATA_DIR is not set');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (area === 'user') {
    const auth = require('./site-auth.cjs').openAuth(path.join(dir, 'auth.db'));
    try {
      if (action === 'add') {
        const [username, role, ...name] = rest;
        const { user, password } = await auth.createUser({ username, role, name: name.join(' '), site: role === 'agent' ? siteId : null });
        return console.log(`created ${user.username} (${user.role}${user.site ? ', sub-site ' + user.site : ''})\ntemporary password: ${password}`);
      }
      if (action === 'reset') {
        const { user, password } = await auth.resetPassword(rest[0]);
        return console.log(`password of ${user.username} was reset\ntemporary password: ${password}`);
      }
      if (action === 'disable' || action === 'enable') {
        const user = auth.setDisabled(rest[0], action === 'disable');
        return console.log(`${user.username} is ${user.disabled ? 'disabled' : 'enabled'}`);
      }
      if (action === 'list') {
        for (const user of auth.listUsers()) console.log([user.username, user.role, user.site || '-', user.disabled ? 'disabled' : 'active', user.mustChangePassword ? 'temporary password' : 'own password', user.name].join('\t'));
        return;
      }
    } finally {
      auth.close();
    }
  }
  if (area === 'data' && rest[0]) {
    const data = require('./site-data.cjs').openData(path.join(dir, `site-${siteId}.db`));
    try {
      if (action === 'export') {
        const saved = data.read();
        fs.writeFileSync(rest[0], JSON.stringify(saved, null, 2) + '\n', { mode: 0o600 });
        return console.log(`exported version ${saved.version} of sub-site ${siteId} to ${rest[0]}`);
      }
      if (action === 'import') {
        const loaded = JSON.parse(fs.readFileSync(rest[0], 'utf8'));
        const { version } = data.replace(loaded.data || loaded, 'site-admin');
        return console.log(`imported ${rest[0]} into sub-site ${siteId} as version ${version}`);
      }
    } finally {
      data.close();
    }
  }
  throw new Error('usage: site-admin.cjs user add|reset|disable|enable|list … | data export|import <file>');
}

main(process.argv.slice(2)).catch(error => {
  console.error('site-admin: ' + (error.code || error.message));
  process.exitCode = 1;
});
```

**New file 2.5** — create `work/wa-replica/site-api.test.cjs` with this content (291 lines; one newline at the end of the last line and nothing after it):

```js
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
const { SESSION_IDLE_MS, SESSION_MAX_MS, LOCK_MS } = require('./site-auth.cjs');

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
    .then(async response => ({ status: response.status, setCookie: response.headers.get('set-cookie') || '', retryAfter: response.headers.get('retry-after'), raw: await response.text() }))
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
  assert.match(ok.setCookie, /^scrm_sid=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000$/);
  const https = await call('/api/auth/login', { method: 'POST', body: { username: 'ana', password }, headers: { 'X-Forwarded-Proto': 'https' } });
  assert(https.setCookie.endsWith('; Secure'), 'Secure when the request came over HTTPS');
  assert(!ok.raw.includes(password) && !ok.raw.includes('scrypt'));
  const me = await call('/api/auth/me', { cookie: cookieOf(ok) });
  assert.deepEqual([me.status, me.json.user.username, me.json.site], [200, 'ana', 's1']);
  assert.deepEqual((await call('/api/auth/me')).json, { error: 'not-signed-in' });
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
  assert.match(signedOut.setCookie, /^scrm_sid=; Path=\/; HttpOnly; SameSite=Lax; Max-Age=0$/);
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
  assert.deepEqual((await put({ baseVersion: 2, set: { 'customers/c9': {} } })).json, { error: 'key-conflict' });
  assert.deepEqual((await put({ baseVersion: 2, set: { messages: {} } })).json, { version: 3 }, 'a whole value replaces the parts');
  assert.deepEqual((await call('/api/data', { cookie })).json.data.messages, {});
  assert.deepEqual((await put({ baseVersion: 3, remove: ['messages'] })).json, { version: 4 });
  assert.equal('messages' in (await call('/api/data', { cookie })).json.data, false);
  assert.deepEqual(site.data.lastSaves(2).map(save => [save.version, save.by, save.keys]), [[4, 'eli', 'messages'], [3, 'eli', 'messages']]);
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
  assert.equal((await call('/api/data', { method: 'DELETE', cookie: owner })).status, 405);
  assert.equal((await call('/api/auth/unknown')).status, 404);
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
    assert.deepEqual((await call('/api/ai/status', { base: on.base, cookie: cookieOf(first) })).json, { configured: false, reason: 'no-settings-file' });
    assert.deepEqual((await call('/api/data', { base: on.base, cookie: cookieOf(first) })).json, { version: 0, data: {} });
    assert.equal((await fetch(on.base + '/')).status, 200, 'the page itself needs no sign-in');
  } finally {
    on.child.kill();
  }
});
```

**Verify**: `sha256sum work/wa-replica/site-auth.cjs work/wa-replica/site-data.cjs work/wa-replica/site-api.cjs work/wa-replica/site-admin.cjs work/wa-replica/site-api.test.cjs` → in this order `2c7e02dc0ae7c0a8bc4443b554a6f313c095f7655c5f5cb3b1bfd752cb115eb2`, `6dd8e14b1738a7d2f836904a77282a6995ff2516ed95e49c4c1c3e8c89d5baf3`, `43bfbabe69e82a995888ab7bf3da5bedd139a60698901371c21f8bcf14157581`, `b61f9cf79b91e17ea3906b1c120aff52fc5c493bfc7b311dbb9cef0c8b7e72e9`, `5f9f953f976ae132009dd76ce565ced9c9dd7039282b3c294a31fa4a2b811903`. If a checksum does not match, write that file again from this plan; do not edit it by hand. Do not run the tests yet: the last one needs Step 3.

### Step 3: The preview server (`work/wa-replica/serve.cjs`)

**Whole file 3.1** — replace the complete content of `work/wa-replica/serve.cjs` with (73 lines; one newline at the end of the last line and nothing after it):

```js
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const aiRelay = require('./ai-relay.cjs');

const workspace = path.resolve(__dirname, '../..');
const root = path.join(workspace, 'outputs/wa-replica-prototype');
const port = Number(process.argv[2] || 56141);
// With WA_SCRM_DATA_DIR set, the server keeps the accounts and the data of one sub-site (site-api.cjs; needs
// Node 22.13 or newer) and the AI relay answers signed-in users only. Without it, the server serves the page
// and the relay as before.
const site = process.env.WA_SCRM_DATA_DIR
  ? require('./site-api.cjs').create({ dir: process.env.WA_SCRM_DATA_DIR, siteId: process.env.WA_SCRM_SITE_ID || 'default' })
  : null;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function serveFile(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end('Method not allowed');
  }
  if (pathname === '/favicon.ico') {
    res.writeHead(204);
    return res.end();
  }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  const body = await fs.readFile(file);
  res.writeHead(200, {
    'Content-Type': mime[path.extname(file)] || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

const isSiteRoute = pathname => pathname.startsWith('/api/site/') || pathname.startsWith('/api/auth/') || pathname === '/api/data';

const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (isSiteRoute(pathname)) {
      if (site) await site.handle(req, res, pathname);
      else if (pathname === '/api/site/status') sendJson(res, 200, { enabled: false });
      else sendJson(res, 503, { error: 'not-enabled' });
    } else if (pathname.startsWith('/api/ai/')) {
      if (site && !site.allows(req)) {
        req.resume();
        sendJson(res, 401, { error: 'not-signed-in' });
      } else await aiRelay.handle(req, res, pathname);
    } else await serveFile(req, res, pathname);
  } catch {
    if (!res.headersSent) res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log('PREVIEW_URL=http://127.0.0.1:' + server.address().port);
});
process.on('SIGINT', () => server.close(() => process.exit(0)));
```

What changed against the old file, for your orientation (write the file as given): with `WA_SCRM_DATA_DIR` set it loads `site-api.cjs`, sends `/api/site/*`, `/api/auth/*` and `/api/data` to it and lets the relay answer signed-in users only; without it those routes answer "off" and everything else is as before.

**Verify**: `sha256sum work/wa-replica/serve.cjs` → `f39507259685f50bae11be4cbd0c315d6aece59750b77461c4fa218220961719`; `$NODE --test work/wa-replica/site-api.test.cjs` → twelve tests pass (`pass 12`, `fail 0`; about ten seconds); `node --test work/wa-replica/ai-relay.test.cjs` → `pass 12`, `fail 0` (with the machine's default `node`, whatever its version). Do not change a test to make it pass.

### Step 4: Validator (`work/wa-replica/validate-scrm-lifecycle.cjs`)

**Edit 4.1** — `work/wa-replica/validate-scrm-lifecycle.cjs` — section 15: the relay route is now a branch of its own. Find exactly (it occurs once):

```text
assert(serveSource.includes("if (pathname.startsWith('/api/ai/')) await aiRelay.handle(req, res, pathname);"), 'the preview server must route /api/ai/* to the relay');
```

Replace with:

```text
assert(serveSource.includes("pathname.startsWith('/api/ai/')") && serveSource.includes('await aiRelay.handle(req, res, pathname);'), 'the preview server must route /api/ai/* to the relay');
```

**Edit 4.2** — `work/wa-replica/validate-scrm-lifecycle.cjs` — a new section 19, directly above the summary object. Find exactly (it occurs once):

```text
const summary = {
```

Replace with:

```text
// 19. Server side of a sub-site: accounts, sessions and data behind WA_SCRM_DATA_DIR; the relay behind sign-in
const siteSources = Object.fromEntries(['site-auth.cjs', 'site-data.cjs', 'site-api.cjs', 'site-admin.cjs', 'site-api.test.cjs'].map(name => [name, read(path.join(__dirname, name))]));
for (const required of ['crypto.scrypt(', 'crypto.timingSafeEqual(', "crypto.createHash('sha256')", 'const LOCK_AFTER = 5;']) {
  assert(siteSources['site-auth.cjs'].includes(required), `site-auth.cjs is missing ${required}`);
}
for (const required of ["if (baseVersion !== current) throw problem('version-conflict', { version: current });", "db.exec('BEGIN IMMEDIATE');"]) {
  assert(siteSources['site-data.cjs'].includes(required), `site-data.cjs is missing ${required}`);
}
for (const required of ['Path=/; HttpOnly; SameSite=Lax;', "req.headers['sec-fetch-site'] === 'cross-site'", "if (!mayWrite(user)) throw problem('read-only');"]) {
  assert(siteSources['site-api.cjs'].includes(required), `site-api.cjs is missing ${required}`);
}
for (const [name, source] of Object.entries(siteSources)) {
  if (name.endsWith('.test.cjs')) continue;
  assert(!/console\.(log|error)\([^\n]*\$\{[^}]*(password|token|body|json)\b/i.test(source.replace(/temporary password: \$\{password\}/g, '')), `${name} must not log a password, a token or data`);
}
assert(serveSource.includes("if (site && !site.allows(req)) {") && serveSource.includes('process.env.WA_SCRM_DATA_DIR'), 'the preview server must put the relay behind sign-in when it keeps accounts');
assert(!/\b(localhost|127\.0\.0\.1):\d+\/api\/(auth|data)/.test(appJs), 'the page does not use the account and data routes yet');

const summary = {
```

**Edit 4.3** — `work/wa-replica/validate-scrm-lifecycle.cjs` — the summary. Find exactly (it occurs once):

```text
  externalNetworkCalls: false,
};
```

Replace with:

```text
  serverSide: 'optional, behind WA_SCRM_DATA_DIR: accounts with scrypt password hashes, sign-in sessions, one sub-site data document in SQLite, AI relay for signed-in users only; the page still keeps its data in the browser',
  externalNetworkCalls: false,
};
```

**Verify**: `node work/wa-replica/validate-scrm-lifecycle.cjs` → exit 0 with `"status": "passed"` and `"serverSide"` in the output; `git diff --stat -- work/wa-replica/validate-scrm-lifecycle.cjs` → `1 file changed, 20 insertions(+), 1 deletion(-)`.

### Step 5: Documentation and final verification

**Edit 5.1** — `README.md`. Find exactly (it occurs once):

```text
未设置该变量、文件不完整，或以方式 A 打开单文件时，没有翻译（「AI 能力」页显示「未连接」）。填好的文件不要提交到仓库。
```

Replace with:

````text
未设置该变量、文件不完整，或以方式 A 打开单文件时，没有翻译（「AI 能力」页显示「未连接」）。填好的文件不要提交到仓库。

#### 服务器端账号与数据（可选；页面尚未接入）
预览服务可以保存账号和一个子站的数据。把环境变量 `WA_SCRM_DATA_DIR` 指向**仓库以外**的私有目录后，服务提供登录接口（`/api/auth/*`）与数据接口（`/api/data`），AI 中转接口同时改为只对已登录用户开放。这部分需要 Node 22.13 或更新版本（使用内置 SQLite）。账号用管理工具创建：
```bash
WA_SCRM_DATA_DIR=/path/to/private/data node work/wa-replica/site-admin.cjs user add <用户名> <agent|supervisor|admin> <显示名>
```
工具只显示一次临时密码，持有人首次登录后必须修改。子站编号由 `WA_SCRM_SITE_ID` 指定（默认 `default`）。未设置 `WA_SCRM_DATA_DIR` 时以上接口关闭，页面仍把数据保存在浏览器中；页面改为使用这些接口是下一步工作（见 `plans/`）。
````

**Edit 5.2** — `README.md`. Find exactly (it occurs once):

```text
node --test work/wa-replica/ai-relay.test.cjs   # AI 中转接口的测试（使用本地替身，不调用真实服务）
```

Replace with:

```text
node --test work/wa-replica/ai-relay.test.cjs   # AI 中转接口的测试（使用本地替身，不调用真实服务）
node --test work/wa-replica/site-api.test.cjs   # 账号、会话与数据接口的测试（需要 Node 22.13 或更新版本）
```

**Edit 5.3** — `README.md`. Find exactly (it occurs once):

```text
│       ├── ai.env.example                             # AI 设置文件示例（填写后的副本放在仓库之外）
```

Replace with:

```text
│       ├── ai.env.example                             # AI 设置文件示例（填写后的副本放在仓库之外）
│       ├── site-auth.cjs / site-data.cjs              # 账号与登录会话；子站数据文档（内置 SQLite）
│       ├── site-api.cjs / site-api.test.cjs           # 登录与数据接口及其测试
│       ├── site-admin.cjs                             # 账号与数据管理工具（在服务器上运行）
```

**Edit 5.4** — `README.md`. Find exactly (it occurs once):

```text
│       ├── serve.cjs                                  # 本地静态预览与 AI 中转服务
```

Replace with:

```text
│       ├── serve.cjs                                  # 预览服务：页面、AI 中转，以及可选的账号与数据接口
```

**Edit 5.5** — `PRODUCT.md`. Find exactly (it occurs once):

```text
- 首版真实通信架构规划通过 `rmyndharis/OpenWA` 桥接
```

Replace with:

```text
- 服务器端已具备账号、登录会话与子站数据存储（由环境变量启用，页面尚未接入）：每位员工一个账号，员工读写自己子站的数据，主管与管理员只读。
- 首版真实通信架构规划通过 `rmyndharis/OpenWA` 桥接
```

**Append 5.6** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```markdown
## 服务器端：账号、登录会话与子站数据 · 2026-11-21

转为正式产品的基础第一步，只涉及服务器，页面暂无变化。预览服务在设置 `WA_SCRM_DATA_DIR` 后保存两类数据：账号库（员工、主管、管理员；密码以 scrypt 哈希保存，登录会话以令牌哈希保存）和一个子站的数据文档（按键分行保存，每次保存带版本号，基于旧版本的保存会被拒绝，避免两个页面互相覆盖）。新增接口：`/api/site/status`、`/api/auth/login`、`/api/auth/logout`、`/api/auth/me`、`/api/auth/password`、`/api/data`。员工读写自己子站的数据，主管与管理员只读；临时密码必须先修改；连续 5 次登录失败锁定 5 分钟；会话闲置 7 天或满 30 天失效。启用后 AI 中转接口只对已登录用户开放。

账号由服务器上的管理工具 `site-admin.cjs` 创建、重置与停用，它也能导出、导入子站数据。这部分使用 Node 内置的 SQLite，需要 Node 22.13 或更新版本；未设置 `WA_SCRM_DATA_DIR` 时一切照旧，旧版本 Node 仍可运行预览服务。页面改用这些接口（真实登录页、数据存到服务器、移除虚构数据与角色切换）是下一步。
```

Then verify everything once more:

```bash
$NODE --test work/wa-replica/site-api.test.cjs && node --test work/wa-replica/ai-relay.test.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-022/smoke.sh
```

**Verify**: both test runs `pass 12`, `fail 0`; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `git status --porcelain` lists only in-scope paths. Commit everything (the five new files included). After the commit `git status --porcelain` must be empty.

## Test plan

- **New tests** (`work/wa-replica/site-api.test.cjs`, twelve): the rules for accounts and that no password is stored; sign-in answers and the cookie; the forced change of a temporary password; the lock after five failures; the ends of a session; saving by key with a version, conflicts, split fields; malformed saves; who may read and write; that the log holds no password, token or data; the administration tool; the preview server with and without a data folder, including the relay behind sign-in.
- **Relay tests** — unchanged; their last test proves the rewritten server still starts on the machine's default Node.
- **Validator** — the adjusted check of section 15 and the new section 19 (Step 4).
- **Server smoke** (`/tmp/wa-scrm-plan-022/smoke.sh`) — what the server answers without and with a data folder.
- **Verified by the reviewer, not by you**: the whole browser test suite of the product against the rewritten server without a data folder (nothing may change for the page); a sign-in and a save with a real data folder; a review of the password, session and access code.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → its summary shows `pass 12` and `fail 0`
- [ ] `node --test work/wa-replica/ai-relay.test.cjs` → its summary shows `pass 12` and `fail 0`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-022/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/site-auth.cjs` → `2c7e02dc0ae7c0a8bc4443b554a6f313c095f7655c5f5cb3b1bfd752cb115eb2`
- [ ] `sha256sum work/wa-replica/site-data.cjs` → `6dd8e14b1738a7d2f836904a77282a6995ff2516ed95e49c4c1c3e8c89d5baf3`
- [ ] `sha256sum work/wa-replica/site-api.cjs` → `43bfbabe69e82a995888ab7bf3da5bedd139a60698901371c21f8bcf14157581`
- [ ] `sha256sum work/wa-replica/site-admin.cjs` → `b61f9cf79b91e17ea3906b1c120aff52fc5c493bfc7b311dbb9cef0c8b7e72e9`
- [ ] `sha256sum work/wa-replica/site-api.test.cjs` → `5f9f953f976ae132009dd76ce565ced9c9dd7039282b3c294a31fa4a2b811903`
- [ ] `sha256sum work/wa-replica/serve.cjs` → `f39507259685f50bae11be4cbd0c315d6aece59750b77461c4fa218220961719`
- [ ] `git diff --stat f7dc51e -- outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/index.html outputs/whatsapp-scrm-lifecycle.html outputs/whatsapp-replica-ui-fidelity.html work/wa-replica/fidelity-base work/wa-replica/fidelity-ai.js work/wa-replica/fidelity-lifecycle.js work/wa-replica/build-fidelity.cjs work/wa-replica/ai-relay.cjs work/wa-replica/ai-relay.test.cjs` → empty (the page and the relay are untouched)
- [ ] `git ls-files | grep -cE '\.db(-wal|-shm)?$'` → `0` (no database file is in the repository)
- [ ] `git status --porcelain` is empty after your final commit, and `git diff --name-only f7dc51e..HEAD` lists only in-scope paths (plus `plans/` files changed by commits that are not yours)
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- No Node 22.13 or newer exists on the machine.
- Step 1's baseline check fails (a failing check other than the named ones, a different checksum of `serve.cjs`).
- A checksum does not match after you have written the file a second time from this plan.
- A test of `site-api.test.cjs` fails although all six checksums match, or a relay test fails.
- A text to find does not occur exactly once in its file.
- The validator fails in a section this plan does not change.
- The work appears to require editing an out-of-scope file, or creating a data folder, a password or a key inside the repository.
- You believe a decision under "Decisions already made" is wrong. Report it; do not act on it.

## Maintenance notes

- **Deployment is not part of this plan, and the data folder must not be switched on for the live service before the page uses it**: with `WA_SCRM_DATA_DIR` set, the relay refuses the current page's requests, because that page cannot sign in.
- The service must run on Node 22.13 or newer once the data folder is used.
- A locked name (five failures) is locked for everyone who tries it, also for its owner; that is the usual trade-off of a simple lock and acceptable for a handful of internal users.
- The cookie is marked `Secure` only when the request arrives over HTTPS (header `X-Forwarded-Proto: https`) or when `WA_SCRM_COOKIE_SECURE=1`. Over plain HTTP a password and a session can be read on the network path; the service should be reachable from known addresses only until it has HTTPS.
- In the target design a gateway in front of several sub-sites checks the session and routes each employee to their own sub-site. `site-api.cjs` keeps the question "who is this request from" in one function (`authenticate`), which is the place to accept the gateway's answer later.
- The table `saves` records who saved which keys and when; it keeps the last ten thousand saves.
- What a reviewer should scrutinise: password hashing and comparison; that tokens are stored hashed; the lock; who may read and write; that nothing secret is logged; that the server still starts on Node 18 without a data folder.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
