# Plan 028: What is on a number comes into the workbench when it comes online, and at intervals

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat d640162..HEAD -- work/wa-replica README.md replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM (a background job on the server that reads a real number; exact text and checksums for every change)
- **Depends on**: plans/027-fresh-qr-code.md (DONE)
- **Category**: direction
- **Planned at**: commit `d640162`, 2026-11-22

## Why this matters

The owner linked the first real number on 2026-11-22 and found the workbench empty: the page shows only what arrives after the link, while the phone held 88 chats with one person. The owner asked: "is it possible to perform an automatic synchronization of WhatsApp content when coming online, and then schedule periodic syncs at other times?" and then: "Then, roll it out to everyone."

This plan builds exactly that, as a standard part of the link for every number:

- **When a number comes online** — the first link, a reconnect, a restart of the server — the server asks the sub-site's OpenWA for the number's chats with one person and for the latest 50 messages of each, and puts them into the feed the page already reads. The page creates the customers and their conversations from it; the unread count is the one WhatsApp reports.
- **Every quarter of an hour** the server looks at the list of chats again and fetches only those that hold something newer than what it knows — what the hook did not deliver. A message that came through the hook is not fetched again.
- **Gently.** Chats are read one after the other with a pause of a second; OpenWA's "deep" mode (up to 2,000 messages of a chat) is not used, because its documentation warns that large reads raise the risk of WhatsApp limiting the number.
- **Not news.** What is fetched this way gets no first-reply to-do, lights no signal and is not sent to the model service for translation — thousands of paid calls otherwise. New messages are handled as before.
- **Found while rehearsing:** events for a number that is just being linked could reach the page a moment before the page had recorded the number, and were dropped. The page now keeps them until the number is recorded.

### What was verified before this plan was written

On the linked number, structure only (no names, numbers or texts were read): the list of chats (`id, name, isGroup, kind, unreadCount, timestamp, …`; 87 of 88 chats are named by a privacy id `…@lid`, one chat `0@c.us` is WhatsApp's own), the history of a chat (an array, oldest first, the same fields as a delivered message; kinds seen: text, call, image, video, unknown), and the contact behind a privacy id (`{ id, name, pushName, number, … }` — it gave a phone number for 8 of 8 chats tried). The result of this plan passed 16 server tests and, in a real browser against a stand-in OpenWA, 17 sessions of the connection and the 65 of the rest of the product.

### Decisions already made (do not re-open; do not ask)

- 50 messages a chat, every 15 minutes, one second between two chats; told to the owner as the chosen settings.
- Group chats, channels and WhatsApp's own chat are not fetched. Messages of the kinds `unknown`, `masked` and `revoked` are not taken over.
- The two environment variables `WA_SCRM_OPENWA_SYNC_MS` and `WA_SCRM_OPENWA_SYNC_PAUSE_MS` exist so that tests need not wait; they are not documented for operators.
- No button in the page: the owner asked for it to happen by itself.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/openwa-link.cjs` | `b07fbe8eb644735318431bdc77999fbcf929c5fbf0ed32825a22bec2db36f655` | `0de835a1c110c7bc0a1943700bbbe8a09e55bae98172d227f3c35faf08a862ba` |
| `work/wa-replica/openwa-link.test.cjs` | `a633067f6b7e6294810f869ca2a3775f25d9c19aae076251d85d58a5f7cef305` | `2a1939470e052d8d0667058d41ba3e4def2de8ec6cdad08f6d16a2b650949d9e` |
| `work/wa-replica/fidelity-openwa.js` | `3d528b11c59d60fa685520a6f7d922d67e5a2a675e833b2e6f79ee998e7ded27` | `8ebcab390d0e729648ccded3a3ad5dcbd0742603d012130e154cac444889da1d` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `135444077b3d6a268ce2a013cda94a1479dcb42d88a8c46a5a6a4cc4de71a7d4` | `5b444279cdaa0e6aff9353a548ebec634df8cc77115c187228ad0d4affdc4c51` |

- `openwa-link.cjs` — the server's link to OpenWA. `create({ dir, siteId, site, now })` opens the link's records (tables `account`, `event`, `sent`), defines the routes and returns `{ handle, store, close }`. Its hook stores every signed delivery of OpenWA as a row of `event`; `present(row)` puts a row into the project's own form when a page reads the feed (`GET /api/wa/events`). `ask(config, method, path, body)` is one call to OpenWA; `wake()` releases pages that wait for the feed; `CHAT` is the pattern of a chat with one person; `digits(value)` keeps the digits of a text.
- `openwa-link.test.cjs` — 14 tests against a stand-in OpenWA inside the file. The stand-in does not know chats, histories or contacts yet.
- `fidelity-openwa.js` — the page module of the connection. `openwaApply(e)` applies one event of the feed to the data; `openwaNewCustomer(a, e)` creates the customer of a chat; `openwaBeginPairing`, `openwaPoll` and `openwaFinish` run the link dialog.
- `validate-scrm-lifecycle.cjs` — its section 22 lists texts that `fidelity-openwa.js` must contain; two are added.

### OpenWA routes this plan adds calls to (version 0.31.0)

`GET /api/sessions/{id}/chats?limit=1000` → an array of chats; `GET /api/sessions/{id}/messages/{chatId}/history?limit=50` → an array of messages, oldest first (409 or 503 when the number is not connected); `GET /api/sessions/{id}/contacts/{contactId}` → the contact, with `number`.

### How the build works

`work/wa-replica/build-fidelity.cjs` puts the module files into the app and writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout d640162 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Link tests | `env -u WA_SCRM_OPENWA_ENV -u WA_SCRM_OPENWA_SYNC_MS -u WA_SCRM_OPENWA_SYNC_PAUSE_MS $NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 16`, `fail 0` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 12`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-028/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |
| Icon set | `node -e "const vm=require('vm'),fs=require('fs'),cp=require('child_process');const keys=s=>{const w={};vm.runInNewContext(s,{window:w});return Object.keys(w.WA_ICONS)};const a=keys(cp.execSync('git show d640162:outputs/wa-replica-prototype/icons.js').toString()),b=keys(fs.readFileSync('outputs/wa-replica-prototype/icons.js','utf8'));console.log('removed='+a.filter(x=>!b.includes(x)).join(',')+' added='+b.filter(x=>!a.includes(x)).join(','))"` | `removed= added=` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/openwa-link.cjs`, `work/wa-replica/openwa-link.test.cjs` (Step 2)
- `work/wa-replica/fidelity-openwa.js`, `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `README.md`, `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{app.js,validation.json}` (the other output files must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular `serve.cjs`, `site-*.cjs`, `fidelity-boot.js`, the other modules, `build-fidelity.cjs`, `plans/**`, earlier entries of `replica/build-log.md`; any real OpenWA, any settings file with a key, any data folder inside the repository.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/028-catch-up-with-whatsapp` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): bring what is on a number into the workbench`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives a text to find (it occurs exactly once in the named file) and the text that replaces it. An **Insert** names the beginning of a line (exactly one line starts that way) and the text to put directly above it. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Before each change, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the four source files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-028/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-028 && cat > /tmp/wa-scrm-plan-028/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that the link catches up with what is on a number: the server part, its tests and the built page.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'the server fetches the chats of a number' "$W/openwa-link.cjs" 'async function syncAccount(account) {'
has 'the server catches up when a number comes online' "$W/openwa-link.cjs" "if (delivery.event === 'session.authenticated' || (delivery.event === 'session.status' && data.status === 'ready')) syncSoon(row.id);"
has 'the server remembers what it knows of a chat' "$W/openwa-link.cjs" 'CREATE TABLE IF NOT EXISTS chat ('
has 'the built page takes over a chat found while catching up' "$P/app.js" "if (e.kind === 'chat') {"
has 'the built page does not treat fetched messages as news' "$P/app.js" 'if (!e.fromMe && !e.history) {'
has 'the built page keeps what arrives for a number that is being linked' "$P/app.js" 'pair.held.push(e);'
same 'the link tests pass' "$(env -u WA_SCRM_OPENWA_ENV -u WA_SCRM_OPENWA_SYNC_MS -u WA_SCRM_OPENWA_SYNC_PAUSE_MS "$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 16 ℹ fail 0 '
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
same 'the page sources still pass the syntax check' "$(node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('$W/fidelity-openwa.js','utf8')+'})');console.log('ok')" 2>&1)" ok
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-028/smoke.sh && ls -l /tmp/wa-scrm-plan-028/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/openwa-link.cjs work/wa-replica/openwa-link.test.cjs work/wa-replica/fidelity-openwa.js work/wa-replica/validate-scrm-lifecycle.cjs` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-028/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the server fetches the chats of a number`, `the server catches up when a number comes online`, `the server remembers what it knows of a chat`, `the built page takes over a chat found while catching up`, `the built page does not treat fetched messages as news`, `the built page keeps what arrives for a number that is being linked` and `the link tests pass` (it reports `pass 14`; seven checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The server: fetch what is on a number, when it comes online and at intervals

**Edit 2.1** — `work/wa-replica/openwa-link.cjs`. Find exactly (it occurs once):

```text
//   POST /api/wa/hook                            deliveries from OpenWA, stored before they are acknowledged
```

Replace with:

```text
//   POST /api/wa/hook                            deliveries from OpenWA, stored before they are acknowledged
// The link also catches up by itself: when a number comes online it fetches the number's chats with one person
// and the latest messages of each, and every quarter of an hour it looks for what the hook did not deliver.
```

**Edit 2.2** — `work/wa-replica/openwa-link.cjs`. Find exactly (it occurs once):

```text
const TIMEOUT_MS = Number(process.env.WA_SCRM_OPENWA_TIMEOUT_MS) || 20000;
```

Replace with:

```text
const TIMEOUT_MS = Number(process.env.WA_SCRM_OPENWA_TIMEOUT_MS) || 20000;
// Catching up: how often, how long to wait between two chats, how many of a chat's latest messages, and which
// kinds of message are not taken over (what WhatsApp shows as a notice of its own, or has taken back).
const SYNC_EVERY_MS = Number(process.env.WA_SCRM_OPENWA_SYNC_MS) || 15 * 60 * 1000;
const SYNC_PAUSE_MS = process.env.WA_SCRM_OPENWA_SYNC_PAUSE_MS === undefined ? 1000 : Number(process.env.WA_SCRM_OPENWA_SYNC_PAUSE_MS);
const SYNC_MESSAGES = 50;
const SYNC_SKIP = ['unknown', 'masked', 'revoked'];
```

**Edit 2.3** — `work/wa-replica/openwa-link.cjs`. Find exactly (it occurs once):

```text
  if (name === 'message.received' || name === 'message.sent') {
    // Only chats with one person; groups, channels, status posts and broadcast lists are left out.
```

Replace with:

```text
  if (name === 'sync.chat') return { ...event, kind: 'chat', chat: String(d.chatId || ''), name: String(d.name || ''), phone: digits(d.phone), unread: Number(d.unread) || 0, at: Number(d.timestamp) > 0 ? Number(d.timestamp) * 1000 : Date.parse(at) };
  if (name === 'message.received' || name === 'message.sent' || name === 'sync.message') {
    // Only chats with one person; groups, channels, status posts and broadcast lists are left out.
```

**Edit 2.4** — `work/wa-replica/openwa-link.cjs`. Find exactly (it occurs once):

```text
      media: d.media ? { mime: String(d.media.mimetype || ''), name: String(d.media.filename || ''), size: Number(d.media.sizeBytes) || 0 } : null,
    };
```

Replace with:

```text
      media: d.media ? { mime: String(d.media.mimetype || ''), name: String(d.media.filename || ''), size: Number(d.media.sizeBytes) || 0 } : null,
      // Fetched while catching up, not delivered as it happened: the page takes it over without treating it as news.
      ...(name === 'sync.message' ? { history: true } : {}),
    };
```

**Edit 2.5** — `work/wa-replica/openwa-link.cjs`. Find exactly (it occurs once):

```text
    CREATE TABLE IF NOT EXISTS sent (request TEXT PRIMARY KEY, digest TEXT NOT NULL, outcome TEXT, at TEXT NOT NULL);
```

Replace with:

```text
    CREATE TABLE IF NOT EXISTS sent (request TEXT PRIMARY KEY, digest TEXT NOT NULL, outcome TEXT, at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS chat (account TEXT NOT NULL, chat TEXT NOT NULL, stamp INTEGER NOT NULL, imported INTEGER NOT NULL, PRIMARY KEY (account, chat));
```

**Edit 2.6** — `work/wa-replica/openwa-link.cjs`. Find exactly (it occurs once):

```text
    removeAccount: id => db.prepare('DELETE FROM account WHERE id = ?').run(id),
```

Replace with:

```text
    removeAccount: id => {
      db.prepare('DELETE FROM account WHERE id = ?').run(id);
      db.prepare('DELETE FROM chat WHERE account = ?').run(id);
    },
    // What is known of a chat: the time of its newest message here, and whether its messages were fetched once.
    chat: (account, chat) => db.prepare('SELECT stamp, imported FROM chat WHERE account = ? AND chat = ?').get(account, chat),
    keepChat: (account, chat, stamp, imported) => db.prepare('INSERT INTO chat (account, chat, stamp, imported) VALUES (?, ?, ?, ?) ON CONFLICT(account, chat) DO UPDATE SET stamp = MAX(stamp, excluded.stamp), imported = MAX(imported, excluded.imported)').run(account, chat, stamp, imported ? 1 : 0),
```

**Edit 2.7** — `work/wa-replica/openwa-link.cjs`. Find exactly (it occurs once):

```text
function create({ dir, siteId, site, now = () => Date.now() }) {
```

Replace with:

```text
// sync says how the link catches up: every (milliseconds between two rounds; 0 for none), pause (between two
// chats), delay (before a run that something triggered).
function create({ dir, siteId, site, now = () => Date.now(), sync = { every: SYNC_EVERY_MS, pause: SYNC_PAUSE_MS, delay: 3000 } }) {
```

**Edit 2.8** — `work/wa-replica/openwa-link.cjs`. Find exactly (it occurs once):

```text
      if (stored) {
        console.log(`wa hook stored event=${delivery.event} account=${row.id}`);
        wake();
      }
      return { ok: true, stored };
```

Replace with:

```text
      if (stored) {
        console.log(`wa hook stored event=${delivery.event} account=${row.id}`);
        wake();
        // A message that came through the hook needs no fetching later; a number that came online is caught up.
        if ((delivery.event === 'message.received' || delivery.event === 'message.sent') && CHAT.test(String(data.chatId || '')) && Number(data.timestamp) > 0) store.keepChat(row.id, String(data.chatId), Number(data.timestamp), false);
        if (delivery.event === 'session.authenticated' || (delivery.event === 'session.status' && data.status === 'ready')) syncSoon(row.id);
      }
      return { ok: true, stored };
```

**Edit 2.9** — `work/wa-replica/openwa-link.cjs`. Find exactly (it occurs once):

```text
  return { handle, store, close: () => { wake(); store.close(); } };
}
```

Replace with:

```text
  // ---- catching up with WhatsApp ----
  // What is on a number but did not come through the hook is fetched from OpenWA and put into the feed: when
  // a number comes online, its chats with one person and the latest messages of each; at intervals, only the
  // chats that hold something newer than what is known here. Chats are read one after the other, with a pause,
  // so that the number is not kept busy.
  const syncing = new Set();
  async function syncAccount(account) {
    const config = loadConfig();
    const row = store.account(account);
    if (!config.configured || !row || syncing.has(account)) return;
    syncing.add(account);
    let chats = 0, messages = 0;
    try {
      const list = await ask(config, 'GET', `/api/sessions/${row.session}/chats?limit=1000`);
      if (list.status !== 200 || !Array.isArray(list.body)) return;
      for (const chat of list.body) {
        const id = String(chat.id || ''), stamp = Number(chat.timestamp) || 0;
        if (chat.isGroup || (chat.kind || 'individual') !== 'individual' || !CHAT.test(id)) continue;
        const known = store.chat(account, id);
        if (known?.imported && stamp <= known.stamp) continue;
        const history = await ask(config, 'GET', `/api/sessions/${row.session}/messages/${encodeURIComponent(id)}/history?limit=${SYNC_MESSAGES}`);
        // A number that is no longer connected ends the run; any other refusal only skips this chat.
        if (history.status === 409 || history.status === 503) break;
        if (history.status !== 200 || !Array.isArray(history.body)) continue;
        // WhatsApp names most chats by a privacy id; the contact tells the phone number where it is known.
        const contact = id.endsWith('@lid') ? await ask(config, 'GET', `/api/sessions/${row.session}/contacts/${encodeURIComponent(id)}`) : null;
        const phone = contact ? digits(contact.status === 200 ? contact.body?.number : '') : id.split('@')[0];
        const at = new Date(now()).toISOString();
        store.addEvent({ key: `chat_${account}_${id}_${stamp}`, account, name: 'sync.chat', at, body: JSON.stringify({ chatId: id, name: String(chat.name || ''), phone, unread: Number(chat.unreadCount) || 0, timestamp: stamp }) });
        for (const m of history.body) {
          if (!m || typeof m.id !== 'string' || !m.id || SYNC_SKIP.includes(m.type)) continue;
          if (m.media && typeof m.media === 'object') delete m.media.data;
          if (store.addEvent({ key: `hist_${account}_${m.id}`, account, name: 'sync.message', at, body: JSON.stringify({ ...m, body: String(m.body || '').slice(0, MAX_TEXT) }) })) messages += 1;
        }
        store.keepChat(account, id, stamp, true);
        chats += 1;
        wake();
        if (sync.pause) await new Promise(resolve => setTimeout(resolve, sync.pause));
      }
    } catch (error) {
      console.error(`wa sync failed account=${account} error=${error.code || error.name}`);
    } finally {
      syncing.delete(account);
      if (chats) console.log(`wa sync ok account=${account} chats=${chats} messages=${messages}`);
    }
  }
  const syncAll = async () => { for (const row of store.accounts()) await syncAccount(row.id); };
  const timers = new Set();
  // Runs soon, not at once: a number that just came online settles first, and several triggers become one run.
  function syncSoon(account) {
    const timer = setTimeout(() => { timers.delete(timer); (account ? syncAccount(account) : syncAll()).catch(() => {}); }, sync.delay);
    timer.unref();
    timers.add(timer);
  }
  if (sync.every > 0) {
    syncSoon();
    const every = setInterval(() => { syncAll().catch(() => {}); }, sync.every);
    every.unref();
    timers.add(every);
  }

  return { handle, store, sync: syncAccount, close: () => { for (const timer of timers) clearTimeout(timer); wake(); store.close(); } };
}
```

**Edit 2.10** — `work/wa-replica/openwa-link.test.cjs`. Find exactly (it occurs once):

```text
const gw = { sessions: new Map(), hooks: new Map(), sends: [], calls: [], sendMode: 'ok', replies: new Map() };
```

Replace with:

```text
const gw = { sessions: new Map(), hooks: new Map(), sends: [], calls: [], sendMode: 'ok', replies: new Map(), chats: new Map(), history: new Map(), contacts: new Map() };
```

**Edit 2.11** — `work/wa-replica/openwa-link.test.cjs`. Find exactly (it occurs once):

```text
    if (action === 'messages' && third === 'send-text' && !fourth) {
```

Replace with:

```text
    // What is on the number: its chats, the latest messages of one chat, and the contact behind a privacy id.
    if (action === 'chats' || (action === 'messages' && fourth === 'history')) {
      if (session.status !== 'ready') return fail(409, 'Conflict', 'Session is not connected. The WhatsApp client is not ready.');
      if (action === 'chats') return answer(200, gw.chats.get(sessionId) || []);
      const limit = Number(new URL(req.url, 'http://localhost').searchParams.get('limit')) || 50;
      return answer(200, (gw.history.get(decodeURIComponent(third)) || []).slice(-limit));
    }
    if (action === 'contacts') return gw.contacts.has(decodeURIComponent(third)) ? answer(200, gw.contacts.get(decodeURIComponent(third))) : fail(404, 'Not Found', 'Contact not found');
    if (action === 'messages' && third === 'send-text' && !fourth) {
```

**Edit 2.12** — `work/wa-replica/openwa-link.test.cjs`. Find exactly (it occurs once):

```text
const link = openwaLink.create({ dir: path.join(tmp, 'main'), siteId: 's1', site, now: () => clock });
```

Replace with:

```text
// The link under test catches up only when a test asks for it or a number comes online, and without pauses.
const link = openwaLink.create({ dir: path.join(tmp, 'main'), siteId: 's1', site, now: () => clock, sync: { every: 0, pause: 0, delay: 20 } });
```

**Insert 2.13** — `work/wa-replica/openwa-link.test.cjs`. Find the line that starts with (one line starts this way):

```text
test('unlinking removes the session at OpenWA and the record; later deliveries of it are dropped', async () => {
```

Insert exactly this text as new lines directly above that line (the last line of the block is an empty line; it is part of the text):

```text
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

```

**Verify**: `sha256sum work/wa-replica/openwa-link.cjs work/wa-replica/openwa-link.test.cjs` → `0de835a1c110c7bc0a1943700bbbe8a09e55bae98172d227f3c35faf08a862ba`, `2a1939470e052d8d0667058d41ba3e4def2de8ec6cdad08f6d16a2b650949d9e`; `node --check work/wa-replica/openwa-link.cjs && node --check work/wa-replica/openwa-link.test.cjs && echo SYNTAX_OK` → `SYNTAX_OK`; the link tests → `pass 16`, `fail 0`. If a checksum does not match, restore the file with `git checkout d640162 -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 3: The page: take over what was fetched; keep what arrives for a number that is being linked

**Edit 3.1** — `work/wa-replica/fidelity-openwa.js`. Find exactly (it occurs once):

```text
    // The engagement module creates the first-reply to-do on the next render.
    if (!e.fromMe) c.needsFirstReply = true;
```

Replace with:

```text
    // The engagement module creates the first-reply to-do on the next render. Not for what was fetched while
    // catching up: those conversations are not new.
    if (!e.fromMe && !e.history) c.needsFirstReply = true;
```

**Edit 3.2** — `work/wa-replica/fidelity-openwa.js`. Find exactly (it occurs once):

```text
    if (e.kind !== 'message' || !e.chat) return false;
    let c = data.customers.find(c => c.account === a.id && c.waChat === e.chat)
      || (e.phone ? data.customers.find(c => c.account === a.id && !c.waChat && fidPhoneDigits(c.phone) === e.phone) : null);
    if (c && !c.waChat) c.waChat = e.chat;
    c ||= openwaNewCustomer(a, e);
```

Replace with:

```text
    if ((e.kind !== 'message' && e.kind !== 'chat') || !e.chat) return false;
    let c = data.customers.find(c => c.account === a.id && c.waChat === e.chat)
      || (e.phone ? data.customers.find(c => c.account === a.id && !c.waChat && fidPhoneDigits(c.phone) === e.phone) : null);
    if (c && !c.waChat) c.waChat = e.chat;
    if (e.kind === 'chat') {
      // A chat that is on the number, found while catching up: its customer, the number where WhatsApp tells it,
      // and how many messages are unread there.
      const before = c ? c.phone + '|' + c.unread : '';
      c ||= openwaNewCustomer(a, { ...e, history: true });
      if (!c.phone && e.phone) c.phone = '+' + e.phone;
      c.unread = Math.max(Number(c.unread) || 0, e.unread);
      return before !== c.phone + '|' + c.unread;
    }
    c ||= openwaNewCustomer(a, e);
```

**Edit 3.3** — `work/wa-replica/fidelity-openwa.js`. Find exactly (it occurs once):

```text
    if (!e.fromMe) {
      const closed = lcIsClosed(c);
```

Replace with:

```text
    // What was fetched while catching up is not news: no unread count of its own, no signal, no translation.
    if (!e.fromMe && !e.history) {
      const closed = lcIsClosed(c);
```

**Edit 3.4** — `work/wa-replica/fidelity-openwa.js`. Find exactly (it occurs once):

```text
phase: 'starting', qr: '', error: '' };
    openwaShowPairing();
    openwaRequestLink(pair);
  }

  // The dialog was closed
```

Replace with:

```text
phase: 'starting', qr: '', error: '', held: [] };
    openwaShowPairing();
    openwaRequestLink(pair);
  }

  // The dialog was closed
```

**Edit 3.5** — `work/wa-replica/fidelity-openwa.js`. Find exactly (it occurs once):

```text
    openwaSetState(a, link);
    persist();
    render();
    const bind = pair.mode === 'bind';
```

Replace with:

```text
    openwaSetState(a, link);
    // What the feed brought for this number before it was recorded here.
    for (const e of pair.held) openwaApply(e);
    persist();
    render();
    const bind = pair.mode === 'bind';
```

**Edit 3.6** — `work/wa-replica/fidelity-openwa.js`. Find exactly (it occurs once):

```text
    const a = data.accounts.find(a => a.id === e.account);
    if (!a) return false;
    if (e.kind === 'state') return openwaSetState(a, e);
```

Replace with:

```text
    const a = data.accounts.find(a => a.id === e.account);
    if (!a) {
      // The number that is being linked right now is recorded when its dialog sees it online. What the feed
      // brings for it before that moment is kept and applied then; the dialog is told to look at once.
      const pair = openwaPairing;
      if (pair?.accountId !== e.account) return false;
      pair.held.push(e);
      if (e.kind === 'state' && e.state === 'online' && pair.timer) {
        clearTimeout(pair.timer);
        pair.timer = 0;
        openwaPoll(pair);
      }
      return false;
    }
    if (e.kind === 'state') return openwaSetState(a, e);
```

**Edit 3.7** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly (it occurs once):

```text
"window.WA_SITE.halt('已在其他页面打开'", 
```

Replace with:

```text
"window.WA_SITE.halt('已在其他页面打开'", "if (e.kind === 'chat') {", 'if (!e.fromMe && !e.history) {', 
```

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js work/wa-replica/validate-scrm-lifecycle.cjs` → `8ebcab390d0e729648ccded3a3ad5dcbd0742603d012130e154cac444889da1d`, `5b444279cdaa0e6aff9353a548ebec634df8cc77115c187228ad0d4affdc4c51`; `node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/fidelity-openwa.js','utf8')+'})')" && echo SYNTAX_OK` → `SYNTAX_OK`; `git checkout d640162 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; the icon-set command → `removed= added=`.

### Step 4: Documentation, final verification

**Edit 4.1** — `README.md`. Find exactly (it occurs once):

```text
页面通过这些接口扫码绑定号码、接收消息并发送文本消息；
```

Replace with:

```text
页面通过这些接口扫码绑定号码、接收消息并发送文本消息。号码上线时，服务器会自动取回该号码上已有的一对一会话及每个会话最近的 50 条消息，之后每 15 分钟补取一次通知没有送达的内容（逐个会话读取，中间留有间隔）；
```

**Append 4.2** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```markdown
## 号码上线时自动同步已有会话，并定时补取 · 2026-11-22

此前页面只显示绑定之后新到的消息，号码上已有的会话不会出现。现在服务器在号码上线时（首次绑定、重新连接、服务重启后）自动从 OpenWA 取回该号码的一对一会话列表，以及每个会话最近的 50 条消息，写入事件流；页面据此建立客户档案和聊天记录，未读数取自 WhatsApp。之后每 15 分钟检查一次：只对「有比已知更新的消息」的会话补取，通知已经送达的会话不再读取。会话逐个读取，每个之间间隔 1 秒，不使用 OpenWA 的深度读取模式。

同步来的内容不当作新消息处理：不生成首响待办，不触发复联信号，不自动调用 AI 翻译（新到的消息照常翻译）。WhatsApp 现在多以隐私号（`@lid`）标识会话，同步时通过联系人接口取得对应的手机号，写入客户档案。不同步：群聊、频道，以及 WhatsApp 自己的系统通知和已撤回的消息。

依据：2026-11-22 在已绑定的真实号码上核对了会话列表、单个会话历史和联系人三个接口的字段（只看结构，不看内容）。
```

Then verify everything once more:

```bash
git checkout d640162 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && env -u WA_SCRM_OPENWA_ENV -u WA_SCRM_OPENWA_SYNC_MS -u WA_SCRM_OPENWA_SYNC_PAUSE_MS $NODE --test work/wa-replica/openwa-link.test.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-028/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test runs end with `pass 16` and `pass 12`, `fail 0` each; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md outputs/wa-replica-prototype/app.js` → `0a2370cdfcf4db83b78bdeabc91744a1ae849dd6a63d444d107e78b0c23591a5`, `2fccb431102532f6a7591a0ba92952d1f87792179d7d573ba5f0ce3ecb0159fb`, `dc6d1a6f998000ca07ad5fc88f6c793fb3cfa5dc7d78dcbe49fced143b7a0d7f`; `git status --porcelain` lists exactly eight paths: the four source files, `README.md`, `replica/build-log.md`, `outputs/wa-replica-prototype/app.js` and `outputs/wa-replica-prototype/validation.json` (if `outputs/wa-replica-prototype/icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **`work/wa-replica/openwa-link.test.cjs`** — two new tests (given in full in Step 2). The stand-in learns chats, histories and contacts. (1) A number that comes online: its chats with one person and their latest messages are in the feed, oldest first and marked as fetched; the phone number behind a privacy id comes from the contact; the group, the channel and WhatsApp's own chat are not read; a notice of WhatsApp's own is left out; a long text is cut and the bytes of a picture are not kept. (2) Catching up again fetches nothing; a message the hook never delivered is found once; a message the hook delivered is not fetched; a chat that got its first message through the hook is still read once; two runs at once are one; a number that is not connected is left alone; unlinking forgets what was known. The 14 existing tests stay green.
- **Validator** — section 22 expects the two new texts in the page module.
- **Smoke** (`/tmp/wa-scrm-plan-028/smoke.sh`) — the server part and the built page carry the new code; the tests pass.
- **Verified by the reviewer, not by you**: the page in a real browser (a number that comes online brings its chats without to-dos, signals or translations; a missed message is found at the next round, once), and the fetching against the real number (a few chats, structure only).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout d640162 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] the link tests → `pass 16`, `fail 0`; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-028/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/openwa-link.cjs` → `0de835a1c110c7bc0a1943700bbbe8a09e55bae98172d227f3c35faf08a862ba`
- [ ] `sha256sum work/wa-replica/openwa-link.test.cjs` → `2a1939470e052d8d0667058d41ba3e4def2de8ec6cdad08f6d16a2b650949d9e`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js` → `8ebcab390d0e729648ccded3a3ad5dcbd0742603d012130e154cac444889da1d`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `5b444279cdaa0e6aff9353a548ebec634df8cc77115c187228ad0d4affdc4c51`
- [ ] `sha256sum README.md` → `0a2370cdfcf4db83b78bdeabc91744a1ae849dd6a63d444d107e78b0c23591a5`
- [ ] `sha256sum replica/build-log.md` → `2fccb431102532f6a7591a0ba92952d1f87792179d7d573ba5f0ce3ecb0159fb`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `dc6d1a6f998000ca07ad5fc88f6c793fb3cfa5dc7d78dcbe49fced143b7a0d7f`
- [ ] the icon-set command prints `removed= added=`
- [ ] `git diff --name-only d640162..HEAD -- . ':!plans'` lists exactly: `README.md`, `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/fidelity-openwa.js`, `work/wa-replica/openwa-link.cjs`, `work/wa-replica/openwa-link.test.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- A text to find, or the beginning of a line of an Insert, does not occur exactly once in its file.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- A test fails, the build fails or reports another number of icons than 84, or the validator fails.
- An output file other than `app.js` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file or contacting a real OpenWA.

## Maintenance notes

- **Deployment**: the server file changes, so the live service must be restarted after the merge (the reviewer does that). A few seconds after the start the server catches up for every number that is online; for the number linked on 2026-11-22 that is its first fetch.
- `present()` knows two more rows: `sync.chat` and `sync.message`. They are written by the server itself, not by OpenWA's hook.
- A number that was linked, but whose page was closed before the number was recorded in the data, stays unknown to the page; its events are dropped. Rare; to be handled with the master site.
- The numbers of this plan (50, 15 minutes, 1 second) follow from the owner's wish and OpenWA's warning about large reads. When OpenWA or the engine changes, check the three routes again.
- What a reviewer should scrutinise: that nothing is fetched twice; that a fetched message can never become a to-do, a signal or a paid translation; that the job stops when the number is not connected.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
