# Plan 025: Server side of the WhatsApp connection — the sub-site's link to its own OpenWA

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2374a65..HEAD -- work/wa-replica README.md replica/build-log.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (two new server files, three small additions to the server's entry file; the page is not touched)
- **Depends on**: plans/022-site-server-accounts-and-data.md (DONE), plans/024-remove-prototype-leftovers.md (DONE)
- **Category**: direction
- **Planned at**: commit `2374a65`, 2026-11-21

## Why this matters

The owner decided on 2026-11-21 to turn the prototype into a product, with this architecture: every employee has an account and a sub-site of their own, and every sub-site has **its own OpenWA** (the open-source WhatsApp gateway `rmyndharis/OpenWA`) for its WhatsApp numbers. Sign-in and server-side data exist since plans 022–023. In the page, linking a number by QR code, losing the connection and exchanging messages are still simulated.

This plan builds the **server side** of the real connection, and nothing else: a module through which the sub-site's server talks to its OpenWA — it creates and starts the session of a number and returns the QR code, receives OpenWA's signed deliveries and stores them before acknowledging, hands them to the page in order and in this project's own form, sends text messages without ever sending one twice, and unlinks a number. The page keeps its simulation until the next plan switches it over.

### What was verified before this plan was written

On 2026-11-21 the routes used here were tried against a running OpenWA 0.31.0 (engine whatsapp-web.js), without a phone: creating a session (201; the same name again 409), creating a webhook (201; listing returns an array without the secret; deleting 204), starting (200 with status `qr_ready`; again 400), the QR code (`{ qrCode: "data:image/png;base64,…", status }`), sending while not linked (400 before the start, 409 after it), logging out (400 before the start, 200 after it), deleting (204, then 404), and the deliveries to a webhook (JSON `{ event, timestamp, sessionId, idempotencyKey, deliveryId, data }`, header `X-OpenWA-Signature: sha256=<HMAC-SHA256 of the raw body>`). The module of this plan, exactly as given below, then ran against that instance: link, QR code, real deliveries through the hook, the feed, a refused send and the unlinking all worked. The stand-in inside the new test file answers the way that instance did.

Not verified yet, because it needs a linked number: the fields of real messages, privacy ids (`…@lid`), receipts, media. Deliveries are stored as they arrive and translated when they are read, so a correction later loses nothing.

### Decisions already made (do not re-open; do not ask)

- Only chats with one person reach the page. Group, channel, status and broadcast messages are stored but left out of the feed.
- QR codes are asked for when needed, not pushed; the webhook subscribes to nine named events, not to `*`.
- One page reads the feed at a time; a page that claims the feed takes it over (kept in memory, not stored).
- The bytes of pictures and recordings are not kept by this module.
- The page is not changed. The build and the validator are **not run** in this plan; `outputs/` stays as it is.
- No new dependency. `parseEnv` is reused from `ai-relay.cjs`.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server with accounts and one sub-site's data (built-in SQLite; Node 22.13 or newer). There is no package.json. Documentation text is **Simplified Chinese**; code, comments and commit messages are English.

### The server files this plan builds on (do not change them, except `serve.cjs` as instructed)

- `work/wa-replica/serve.cjs` (73 lines) — the entry file. It serves the page, routes `/api/site/*`, `/api/auth/*` and `/api/data` to `site-api.cjs` when the environment variable `WA_SCRM_DATA_DIR` is set, and `/api/ai/*` to `ai-relay.cjs`. Its relevant lines today:

```js
const site = process.env.WA_SCRM_DATA_DIR
  ? require('./site-api.cjs').create({ dir: process.env.WA_SCRM_DATA_DIR, siteId: process.env.WA_SCRM_SITE_ID || 'default' })
  : null;
const mime = {
```

```js
    } else if (pathname.startsWith('/api/ai/')) {
      if (site && !site.allows(req)) {
        req.resume();
        sendJson(res, 401, { error: 'not-signed-in' });
      } else await aiRelay.handle(req, res, pathname);
    } else await serveFile(req, res, pathname);
```

- `work/wa-replica/site-api.cjs` — `create({ dir, siteId, now })` returns `{ handle, authenticate, allows, auth, data, siteId, close }`. `authenticate(req)` returns the signed-in user (`{ id, username, name, role, site, mustChangePassword, disabled }`) or `null`. It sets `process.umask(0o077)`, so files created afterwards are private.
- `work/wa-replica/ai-relay.cjs` — exports `parseEnv(text)` (KEY=VALUE lines).
- `work/wa-replica/site-api.test.cjs` — the pattern of the new tests (`node:test`, a real HTTP server on a free port, a temporary folder).

### Repo conventions to match

- Two spaces, single quotes, semicolons; comments say why, in plain English.
- Log lines: `<area> <action> ok|failed key=value …`; never a secret, a phone number or message text.
- Commit messages: conventional commits, e.g. `feat(scrm): sign in and keep the data on the server`.

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Link tests | `env -u WA_SCRM_OPENWA_ENV $NODE --test work/wa-replica/openwa-link.test.cjs` | the summary shows `pass 13` and `fail 0` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | the summary shows `pass 12` and `fail 0` |
| Relay tests | `node --test work/wa-replica/ai-relay.test.cjs` | the summary shows `pass 12` and `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-025/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |
| Syntax | `node --check work/wa-replica/openwa-link.cjs && node --check work/wa-replica/openwa-link.test.cjs && node --check work/wa-replica/serve.cjs && echo SYNTAX_OK` | `SYNTAX_OK` |

## Scope

**In scope** (the only files you may create or modify):

- New: `work/wa-replica/openwa-link.cjs`, `work/wa-replica/openwa-link.test.cjs`, `work/wa-replica/openwa.env.example` (Step 2)
- `work/wa-replica/serve.cjs` (Step 3)
- `README.md`, `replica/build-log.md` (Step 4)

**Out of scope** (do NOT touch):

- Every other file under `work/wa-replica/` (`site-*.cjs`, `ai-relay*.cjs`, `fidelity-*`, `build-fidelity.cjs`, `validate-scrm-lifecycle.cjs`, `fidelity-base/**`).
- `outputs/**` — do not run the build or the validator.
- `PRODUCT.md`, `DESIGN.md`, `plans/**`, earlier entries of `replica/build-log.md`.
- Any real OpenWA, any settings file with a key, any data folder inside the repository. The tests use a stand-in on a free local port and a temporary folder.
- New dependencies.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/025-openwa-link-server` first.
- One or two commits are fine. Conventional commit message, e.g. `feat(scrm): server side of the link to OpenWA`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: a **New file** gives the whole content of a file that does not exist yet; write exactly that content and end the file with one line end. An **Edit** gives a text to find (it occurs exactly once in the named file) and the text that replaces it. An **Insert** names the beginning of a line (exactly one line starts that way) and the text to put directly above it. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. The checksums in Step 2 tell you whether the new files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-025/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-025 && cat > /tmp/wa-scrm-plan-025/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks the server side of the link to OpenWA: the tests, and the preview server with and without a data folder.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); OUT=$(mktemp -d); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the three new files exist' "$(ls "$W/openwa-link.cjs" "$W/openwa-link.test.cjs" "$W/openwa.env.example" 2>/dev/null | wc -l)" 3
same 'the link tests pass' "$(env -u WA_SCRM_OPENWA_ENV "$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 13 ℹ fail 0 '
same 'the sign-in and data tests still pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
start() { PORT=$(( 56600 + RANDOM % 300 )); "$@" "$NODE" "$W/serve.cjs" "$PORT" >"$OUT/serve.log" 2>&1 & SRV=$!; B="http://127.0.0.1:$PORT"; for i in $(seq 1 40); do curl -s -o /dev/null "$B/" && break; sleep 0.25; done; }
stop() { kill "$SRV" 2>/dev/null; wait "$SRV" 2>/dev/null; }
start env -u WA_SCRM_DATA_DIR -u WA_SCRM_AI_ENV -u WA_SCRM_OPENWA_ENV
same 'without a data folder the link is off' "$(curl -s "$B/api/wa/status")" '{"configured":false,"reason":"not-enabled"}'
same 'and its other routes answer 503' "$(code -X POST -H 'Content-Type: application/json' -d '{"account":"a1"}' "$B/api/wa/link")" 503
same 'the page is still served' "$(code "$B/")" 200
stop
export WA_SCRM_DATA_DIR="$OUT/data" WA_SCRM_SITE_ID=demo
PW=$("$NODE" "$W/site-admin.cjs" user add smoke agent Smoke Test | sed -n 's/^temporary password: //p')
start env -u WA_SCRM_AI_ENV -u WA_SCRM_OPENWA_ENV
same 'with a data folder the status asks for sign-in' "$(code "$B/api/wa/status")" 401
J="$OUT/jar"
same 'signing in works' "$(code -b "$J" -c "$J" -X POST -H 'Content-Type: application/json' -d "{\"username\":\"smoke\",\"password\":\"$PW\"}" "$B/api/auth/login")" 200
same 'the password can be changed' "$(code -b "$J" -c "$J" -X POST -H 'Content-Type: application/json' -d "{\"current\":\"$PW\",\"next\":\"smoke-test-passphrase\"}" "$B/api/auth/password")" 200
same 'signed in, without a settings file: not set up' "$(curl -s -b "$J" "$B/api/wa/status")" '{"configured":false,"reason":"no-settings-file"}'
same 'the hook answers 503 without a settings file' "$(code -X POST -H 'Content-Type: application/json' -d '{}' "$B/api/wa/hook")" 503
same 'the records of the link are a private file in the data folder' "$(stat -c '%a' "$OUT/data/wa-demo.db" 2>/dev/null)" 600
stop
unset WA_SCRM_DATA_DIR WA_SCRM_SITE_ID
echo "artifacts: $OUT"
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-025/smoke.sh && ls -l /tmp/wa-scrm-plan-025/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/serve.cjs` → `f39507259685f50bae11be4cbd0c315d6aece59750b77461c4fa218220961719`; `NODE=$NODE bash /tmp/wa-scrm-plan-025/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the three new files exist`, `the link tests pass`, `without a data folder the link is off`, `and its other routes answer 503`, `with a data folder the status asks for sign-in`, `signed in, without a settings file: not set up`, `the hook answers 503 without a settings file` and `the records of the link are a private file in the data folder` (eight checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, the checksum differs, or `git status` shows changes, STOP.

### Step 2: The link module, its tests and the example settings file

**New file 2.1** — `work/wa-replica/openwa-link.cjs`. Create it with exactly this content, followed by one line end after the last line (426 lines, sha256 `b9e337848b9184c12a12c65b4e4122eef0cb85fe31156e8b617d773cfa2e847d`):

```js
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
```

**New file 2.2** — `work/wa-replica/openwa-link.test.cjs`. Create it with exactly this content, followed by one line end after the last line (419 lines, sha256 `cda4d8421e27b1d28ea9f3936425f2fab150acf737dbe01bbce0f0960b68d20b`):

```js
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
      Object.assign(session, { status: 'qr_ready', engineLoaded: true });
      return answer(200, session);
    }
    if (action === 'qr') return session.status === 'qr_ready' ? answer(200, { qrCode: QR, status: 'qr_ready' }) : fail(400, 'Bad Request', 'Session is not started. Call POST /sessions/:sessionId/start first.');
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
```

**New file 2.3** — `work/wa-replica/openwa.env.example`. Create it with exactly this content, followed by one line end after the last line (16 lines, sha256 `968c7471d16d3b02f8ea23db2e99a0d34063706a64337b49214a6cdaa14162dd`):

```text
# WA-SCRM — settings of the link to OpenWA (example). Copy this file to a private place outside the
# repository, fill it in, and start the preview server with WA_SCRM_OPENWA_ENV set to the copy's path
# (WA_SCRM_DATA_DIR must be set as well). Never commit a filled copy.

# 1) Where this server reaches the sub-site's own OpenWA
OPENWA_BASE_URL=http://127.0.0.1:2785

# 2) OpenWA's API key (its first start writes one to data/.api-key)
OPENWA_API_KEY=

# 3) Where OpenWA reaches this server's hook. From a Docker container on the same machine the host is
#    usually host.docker.internal; that name must then be in OpenWA's SSRF_ALLOWED_HOSTS.
OPENWA_HOOK_URL=http://host.docker.internal:56141/api/wa/hook

# 4) A long random text (at least 32 characters). It signs what OpenWA delivers to the hook.
OPENWA_HOOK_SECRET=
```

**Verify**: `sha256sum work/wa-replica/openwa-link.cjs work/wa-replica/openwa-link.test.cjs work/wa-replica/openwa.env.example` → `b9e337848b9184c12a12c65b4e4122eef0cb85fe31156e8b617d773cfa2e847d`, `cda4d8421e27b1d28ea9f3936425f2fab150acf737dbe01bbce0f0960b68d20b`, `968c7471d16d3b02f8ea23db2e99a0d34063706a64337b49214a6cdaa14162dd`, in that order; `node --check work/wa-replica/openwa-link.cjs && node --check work/wa-replica/openwa-link.test.cjs && echo SYNTAX_OK` → `SYNTAX_OK`; `env -u WA_SCRM_OPENWA_ENV $NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 12`, `fail 1` at this point: only the last test (`the preview server: /api/wa/ is off without a data folder and asks for sign-in with one`) fails, because the entry file does not route `/api/wa/` before Step 3. If a checksum does not match, delete the file and write it again; if it still does not match, STOP. If another test fails, STOP.

### Step 3: Route `/api/wa/` in the entry file (`work/wa-replica/serve.cjs`)

**Edit 3.1** — `work/wa-replica/serve.cjs`. Find exactly (it occurs once):

```text
// With WA_SCRM_DATA_DIR set, the server keeps the accounts and the data of one sub-site (site-api.cjs; needs
// Node 22.13 or newer) and the AI relay answers signed-in users only. Without it, the server serves the page
// and the relay as before.
```

Replace with:

```text
// With WA_SCRM_DATA_DIR set, the server keeps the accounts and the data of one sub-site (site-api.cjs; needs
// Node 22.13 or newer), the AI relay answers signed-in users only, and the sub-site can be linked to its own
// OpenWA (openwa-link.cjs; settings file named by WA_SCRM_OPENWA_ENV). Without it, the server serves the page
// and the relay as before.
```

**Edit 3.2** — `work/wa-replica/serve.cjs`. Find exactly (it occurs once):

```text
  : null;
const mime = {
```

Replace with:

```text
  : null;
const waLink = site ? require('./openwa-link.cjs').create({ dir: process.env.WA_SCRM_DATA_DIR, siteId: site.siteId, site }) : null;
const mime = {
```

**Edit 3.3** — `work/wa-replica/serve.cjs`. Find exactly (it occurs once):

```text
      } else await aiRelay.handle(req, res, pathname);
    } else await serveFile(req, res, pathname);
```

Replace with:

```text
      } else await aiRelay.handle(req, res, pathname);
    } else if (pathname.startsWith('/api/wa/')) {
      if (waLink) await waLink.handle(req, res, pathname);
      else if (pathname === '/api/wa/status') sendJson(res, 200, { configured: false, reason: 'not-enabled' });
      else sendJson(res, 503, { error: 'not-enabled' });
    } else await serveFile(req, res, pathname);
```

**Verify**: `sha256sum work/wa-replica/serve.cjs` → `de1572b9423fbbada8bbb468121ce400db7602c9ab6efc35155c1328df25269f`; `git diff --stat -- work/wa-replica/serve.cjs` → `1 file changed, 7 insertions(+), 1 deletion(-)`; `env -u WA_SCRM_OPENWA_ENV $NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 13`, `fail 0`; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`.

### Step 4: Documentation, final verification

**Insert 4.1** — `README.md`. Find the line that starts with (one line starts this way):

```text
### 重新编译与完整性校验
```

Insert exactly this text as new lines directly above that line (the last line of the block is an empty line; it is part of the text):

```text
#### 接入 OpenWA（WhatsApp 连接，可选）
服务带有子站与其专属 OpenWA 之间的连接接口（`/api/wa/*`，需要已设置 `WA_SCRM_DATA_DIR`）：为号码创建并启动会话、返回扫码二维码、接收 OpenWA 的事件通知并在落库后应答、按顺序提供给页面，以及发送文本消息。把 `work/wa-replica/openwa.env.example` 复制到私有位置并填写，再用环境变量 `WA_SCRM_OPENWA_ENV` 指向它启动服务。OpenWA 的密钥只保存在服务器；OpenWA 的通知必须带有效签名才会被接收。页面上的扫码与收发目前仍是模拟的，改用这些接口是下一步。

```

**Edit 4.2** — `README.md`. Find exactly (it occurs once):

```text
node --test work/wa-replica/site-api.test.cjs   # 账号、会话与数据接口的测试（需要 Node 22.13 或更新版本）
```

Replace with:

```text
node --test work/wa-replica/site-api.test.cjs   # 账号、会话与数据接口的测试（需要 Node 22.13 或更新版本）
node --test work/wa-replica/openwa-link.test.cjs   # OpenWA 连接接口的测试（使用本地替身，不连接真实 OpenWA；需要 Node 22.13 或更新版本）
```

**Edit 4.3** — `README.md`. Find exactly (it occurs once):

```text
│       ├── ai.env.example                             # AI 设置文件示例（填写后的副本放在仓库之外）
```

Replace with:

```text
│       ├── ai.env.example                             # AI 设置文件示例（填写后的副本放在仓库之外）
│       ├── openwa-link.cjs / openwa-link.test.cjs     # 子站与其专属 OpenWA 的连接接口（会话、二维码、事件通知、发送）及其测试
│       ├── openwa.env.example                         # OpenWA 连接设置文件示例（填写后的副本放在仓库之外）
```

**Edit 4.4** — `README.md`. Find exactly (it occurs once):

```text
│       ├── serve.cjs                                  # 预览服务：页面、AI 中转，以及可选的账号与数据接口
```

Replace with:

```text
│       ├── serve.cjs                                  # 预览服务：页面、AI 中转，以及可选的账号与数据接口、OpenWA 连接接口
```

**Append 4.5** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```markdown
## 服务器端：子站与专属 OpenWA 的连接接口 · 2026-11-21

真实 WhatsApp 连接的服务器部分。新增 `openwa-link.cjs`：按号码在 OpenWA 创建会话与事件通知地址、启动会话并返回扫码二维码；接收 OpenWA 的事件通知（校验签名、按幂等键去重、落库后才应答）；把事件转换成本项目自己的格式按顺序提供给页面（同一时间只有一个页面读取，后打开的页面接管）；发送文本消息（同一次点击的重复请求不会重复发送）；解除绑定。设置文件由 `WA_SCRM_OPENWA_ENV` 指定，密钥只在服务器上。

依据：`rmyndharis/OpenWA` 0.31.0 的公开接口，并于 2026-11-21 在真实实例上逐项核对（创建与启动会话、二维码、通知的签名与请求头、未连接时发送被拒、退出与删除）。尚未用真实号码核对的部分：真实消息的字段、隐私号（`@lid`）、送达与已读回执、媒体、手机端发出的消息。

本次不改页面：扫码、掉线重连与收发消息在页面上仍是模拟的，下一步由页面改用这些接口。只处理一对一聊天；群聊、频道与动态不进入事件流。图片、语音等媒体只记录类型与大小，文件内容的获取与语音转写随后安排。
```

Then verify everything once more:

```bash
node --check work/wa-replica/openwa-link.cjs && node --check work/wa-replica/openwa-link.test.cjs && node --check work/wa-replica/serve.cjs && env -u WA_SCRM_OPENWA_ENV $NODE --test work/wa-replica/openwa-link.test.cjs && $NODE --test work/wa-replica/site-api.test.cjs && node --test work/wa-replica/ai-relay.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-025/smoke.sh
```

**Verify**: the three test runs end with `pass 13`, `pass 12`, `pass 12` and `fail 0` each; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `0043a72eb8e391766c647e9b2dd3df81c846147b89842e09cbd7e5d0f4ef7863`, `cfce76c88d50576db0dee8e27f59d18dc1c765d679c0053f7d45dd59449775e0`; `git status --porcelain` lists exactly six paths: three new files under `work/wa-replica/`, and `work/wa-replica/serve.cjs`, `README.md`, `replica/build-log.md` as modified. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **`work/wa-replica/openwa-link.test.cjs`** (new, 13 tests, given in full in Step 2). A stand-in OpenWA on a free local port answers as the real one did. Covered: who may use which route; the reasons a settings file is incomplete; linking creates one session and one webhook, starts the session and returns the QR code, and does nothing twice; a half-finished attempt is completed and a session removed at OpenWA is made again; OpenWA down or refusing the key; the hook stores only correctly signed deliveries of the sub-site's own numbers, once each, without the bytes of media; the feed in this project's own form and order; taking the feed over, also from a waiting page; a waiting read; one message per send request however often it is repeated; sends while not connected and answers that leave the outcome open; unlinking; what the log may contain; the entry file's routing.
- **Existing tests** (`site-api.test.cjs`, `ai-relay.test.cjs`) run unchanged as a regression check.
- **Smoke** (`/tmp/wa-scrm-plan-025/smoke.sh`) — the tests, and the real entry file with and without a data folder.
- **Verified by the reviewer, not by you**: the module against a real OpenWA instance; the product in scripted browser sessions (the page must behave exactly as before).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `env -u WA_SCRM_OPENWA_ENV $NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 13`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`; `node --test work/wa-replica/ai-relay.test.cjs` → `pass 12`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-025/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/openwa-link.cjs` → `b9e337848b9184c12a12c65b4e4122eef0cb85fe31156e8b617d773cfa2e847d`
- [ ] `sha256sum work/wa-replica/openwa-link.test.cjs` → `cda4d8421e27b1d28ea9f3936425f2fab150acf737dbe01bbce0f0960b68d20b`
- [ ] `sha256sum work/wa-replica/openwa.env.example` → `968c7471d16d3b02f8ea23db2e99a0d34063706a64337b49214a6cdaa14162dd`
- [ ] `sha256sum work/wa-replica/serve.cjs` → `de1572b9423fbbada8bbb468121ce400db7602c9ab6efc35155c1328df25269f`
- [ ] `sha256sum README.md` → `0043a72eb8e391766c647e9b2dd3df81c846147b89842e09cbd7e5d0f4ef7863`
- [ ] `sha256sum replica/build-log.md` → `cfce76c88d50576db0dee8e27f59d18dc1c765d679c0053f7d45dd59449775e0`
- [ ] `git diff --name-only 2374a65..HEAD -- . ':!plans'` lists exactly: `README.md`, `replica/build-log.md`, `work/wa-replica/openwa-link.cjs`, `work/wa-replica/openwa-link.test.cjs`, `work/wa-replica/openwa.env.example`, `work/wa-replica/serve.cjs`
- [ ] `git diff --stat 2374a65..HEAD -- outputs | wc -l` → `0`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- A text to find, or the beginning of a line of an Insert, does not occur exactly once in its file.
- A checksum does not match after you have written the file a second time.
- A test fails that this plan says should pass, or the last link test still fails after Step 3.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file, running the build, or contacting a real OpenWA.
- You believe a decision under "Decisions already made" is wrong. Report it; do not act on it.

## Maintenance notes

- **Deployment is not part of this plan.** The reviewer writes the settings file outside the repository, points the live service at it and restarts it.
- The hook is reachable by whoever can reach the server; it accepts nothing without a signature made with the hook secret. Keep the secret out of logs and out of the repository.
- When OpenWA is upgraded, try its routes again first: the stand-in in the test file mirrors version 0.31.0.
- `present()` is the one place that knows OpenWA's event structures. Deliveries are stored as received, so correcting `present()` corrects what later reads return.
- The next plan switches the page over (QR code in the link dialog, messages from the feed, sending through the server) and removes the simulation. After that: media and voice transcription.
- What a reviewer should scrutinise: the signature check (raw bytes, constant time); that a repeated send request cannot send twice; that no route but the hook works without the sub-site's employee being signed in; that the log carries no key, secret, phone number or message text.
