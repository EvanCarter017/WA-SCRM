# Plan 048: A receipt that arrives before its message is not lost

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 6d2d84d..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (the feed adds one field to a message of the number; the page reads it; exact text and checksums for every edit)
- **Depends on**: plans/047-several-files-at-once.md (DONE)
- **Category**: bug (found while answering an owner question; fix chosen by the owner)
- **Planned at**: commit `6d2d84d`, 2026-11-22

## Why this matters

A message the number has sent shows how far it got: sent, delivered, read. The owner asked, 2026-11-22: "is OpenWA unable to handle 'read' receipts as well?" It handles them — and the owner's data showed a fault in how they are taken over: of the 12 messages a receipt had arrived for, 2 still showed "sent" although the link held their receipt ("delivered" for one, "read" for the other).

The cause, read from the order of the deliveries: for both, the receipt reached the link **before** the message itself. The messages were on the phone before the number was linked; right after linking OpenWA announced their receipts through the hook, and the messages themselves came a little later, fetched while catching up. The page applies a receipt to the message it is about — and when the receipt came, the page did not have that message yet, so the receipt did nothing. The same happens whenever a delivery of a message is late and its receipt overtakes it.

Asked "Shall I fix this, so that such receipts are kept and shown?", the owner chose "Yes, fix it".

What this plan does:

- **The feed gives a message of the number the best receipt from before.** When the server hands the page a message the number sent, it looks among the deliveries that came before it for receipts about that message and, when one says more than "sent" (delivered, read, played), adds the best of them to the message as `status`. Receipts themselves are delivered as before.
- **The page takes it**: a message of the number that arrives through the feed starts with that status instead of "sent" — also the page's own message that the feed confirms, and a message the page has already when the status says more than what it shows.

### Decisions already made (do not re-open; do not ask)

- Nothing is stored anew: the receipts are among the deliveries the link keeps anyway (the last 50 000).
- The two messages of the owner's data that lost their receipt are not repaired: the page has read past them. The owner was told that the fix works "from then on".
- Messages fetched from WhatsApp's history carry no receipt (OpenWA's history has none): they show "sent" unless a receipt for them arrived through the hook.
- Telling WhatsApp that a customer's message was read (so that the customer sees blue ticks) is **not** part of this plan or of any other: the owner was asked and answered "Don't worry about this anymore."
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/openwa-link.cjs` | `31d38dde9c32879bd3a68fb09c9fe1d0a8777988caac454806571fa9cd10d910` | `4c73ddb6fac6bb2cf8fab9baaa67e8132c435412c0c46c1dd18bfbabae2dbeff` |
| `work/wa-replica/openwa-link.test.cjs` | `d1ab1dd7474ae17209a5938a58fc468ad90c35409d641b226f62d870503229f0` | `adfb8b54c9daad07a9a1fc6786aab23110e1b8bf37c63b119e8c7cb212dc0eaa` |
| `work/wa-replica/fidelity-openwa.js` | `583ac3618310877cf5118368ef05962e8a83a1d2c1f1dd7dc26ac8f1b77af375` | `99fd88dcc39b1917cb1092a898ca9ee3bbd1924f0a6663fcd6de259eb85164e7` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `f129d8548746b4c9c6ee327819bbd36bc1c03f508cf7550824406360e23f4584` | `daa461cd7f24e81fe63e8435cb093b182f7c82a77a34eb0dfa1d391e888043f0` |

- `openwa-link.cjs` — the server's link to the sub-site's OpenWA. Every delivery of OpenWA's hook, and every message fetched while catching up, is a row of the table `event` (`seq`, `account`, `name`, `body` — the JSON OpenWA sent). `GET /api/wa/events` is the feed: it reads the rows after the page's position (`store.eventsAfter`) and gives each in this project's own form (`present`): a message is `{ kind: 'message', id, fromMe, … }`, a receipt (`message.ack`) is `{ kind: 'receipt', id, status }` with the id of the message it is about. `openwa-link.test.cjs` — its tests (22) with a stand-in OpenWA.
- `fidelity-openwa.js` — the chat module of the page. `openwaApply(e)` applies one event of the feed to the data: a receipt moves the status of the message it finds (and does nothing when it finds none); a message of the number that is new is added with the status "sent".
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page; a block is added.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 6d2d84d -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Syntax of the chat module | `node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/fidelity-openwa.js','utf8')+'})');console.log('SYNTAX_OK')"` | `SYNTAX_OK` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (they send a 16 MB file twice; allow a few seconds) |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 14`, `fail 0` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 12`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-048/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/openwa-link.cjs`, `openwa-link.test.cjs` (Step 2)
- `work/wa-replica/fidelity-openwa.js`, `validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{app.js,validation.json}` (the other output files, `icons.js` among them, must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular `serve.cjs`, `site-*.cjs`, `ai-relay.cjs`, `fidelity-boot.js`, the other page modules, the other style sheets, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/048-early-receipts` first.
- One commit is fine. Conventional commit message, e.g. `fix(scrm): keep a receipt that arrives before its message`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the four files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-048/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-048 && cat > /tmp/wa-scrm-plan-048/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that a receipt which reached the link before its message is given to the page with the message.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the tests of the link pass, with the one for an early receipt' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
has 'the link looks up the receipts from before a message' "$W/openwa-link.cjs" 'const receipts = store.receiptsBefore(rows.at(-1).seq, own.map(e => e.id));'
has 'the best of them is given to the message' "$W/openwa-link.cjs" "const RECEIPTS_BEFORE = ['delivered', 'read', 'played'];"
has 'a new message of the number takes the receipt it is given' "$P/app.js" "...(e.fromMe ? { status: e.status || 'sent' } : {}) };"
has 'a message that is here already takes it when it says more' "$P/app.js" "if (known.side !== 'out' || !e.status || order.indexOf(e.status) <= order.indexOf(known.status)) return named;"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 先于消息到达的回执不再丢失'
same 'the link passes the syntax check' "$(node --check "$W/openwa-link.cjs" 2>&1 && echo SYNTAX_OK)" SYNTAX_OK
same 'the chat module passes the syntax check' "$(cd "$ROOT" && node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/fidelity-openwa.js','utf8')+'})');console.log('SYNTAX_OK')" 2>&1)" SYNTAX_OK
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-048/smoke.sh && ls -l /tmp/wa-scrm-plan-048/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/openwa-link.cjs work/wa-replica/openwa-link.test.cjs work/wa-replica/fidelity-openwa.js work/wa-replica/validate-scrm-lifecycle.cjs` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-048/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the tests of the link pass, with the one for an early receipt` (got: ℹ pass 22 ℹ fail 0 ), `the link looks up the receipts from before a message`, `the best of them is given to the message`, `a new message of the number takes the receipt it is given`, `a message that is here already takes it when it says more` and `the build log has the entry` (six checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The feed gives a message the receipt from before

#### `openwa-link.cjs`

**Edit 2.1** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
const RECEIPTS = ['sent', 'delivered', 'read', 'played', 'failed'];
const STATUS = {
```

Replace them with:

```text
const RECEIPTS = ['sent', 'delivered', 'read', 'played', 'failed'];
// The receipts that say more than "sent", from the least to the most. A message of the number is given the best
// of them that reached the link before the message itself did.
const RECEIPTS_BEFORE = ['delivered', 'read', 'played'];
const STATUS = {
```

**Edit 2.2** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
    eventsAfter: (seq, limit) => db.prepare('SELECT seq, account, name, at, body FROM event WHERE seq > ? ORDER BY seq LIMIT ?').all(seq, limit),
    lastEvent: () => db.prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM event').get().seq,
```

Replace them with:

```text
    eventsAfter: (seq, limit) => db.prepare('SELECT seq, account, name, at, body FROM event WHERE seq > ? ORDER BY seq LIMIT ?').all(seq, limit),
    // The receipts among the deliveries before seq that are about one of these messages: [{ seq, account, id, status }].
    receiptsBefore(seq, ids) {
      if (!ids.length) return [];
      const about = "COALESCE(json_extract(body, '$.messageId'), json_extract(body, '$.id'))";
      return db.prepare(`SELECT seq, account, ${about} AS id, json_extract(body, '$.status') AS status FROM event WHERE name = 'message.ack' AND seq < ? AND ${about} IN (${ids.map(() => '?').join(', ')})`).all(seq, ...ids);
    },
    lastEvent: () => db.prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM event').get().seq,
```

**Edit 2.3** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
        const rows = store.eventsAfter(after, FEED_PAGE);
        return rows.length ? { events: rows.map(present).filter(Boolean), last: rows.at(-1).seq } : null;
      };
```

Replace them with:

```text
        const rows = store.eventsAfter(after, FEED_PAGE);
        if (!rows.length) return null;
        // A receipt can reach the link before the message it is about — a message that was on the phone already
        // and is fetched while catching up, or a delivery that was late. The page did not know the message then
        // and could do nothing with the receipt. So a message of the number says the best receipt the link holds
        // for it from before.
        const events = rows.map(present).filter(Boolean), own = events.filter(e => e.kind === 'message' && e.fromMe && e.id);
        const receipts = store.receiptsBefore(rows.at(-1).seq, own.map(e => e.id));
        for (const e of own) {
          const status = RECEIPTS_BEFORE.findLast(s => receipts.some(r => r.account === e.account && r.id === e.id && r.seq < e.seq && r.status === s));
          if (status) e.status = status;
        }
        return { events, last: rows.at(-1).seq };
      };
```

#### `openwa-link.test.cjs`

**Edit 2.4** — `work/wa-replica/openwa-link.test.cjs`. Find exactly these lines (they occur once):

```text

test('one page reads the feed: a page that claims it takes it over, also from a page that is waiting', async () => {
```

Replace them with:

```text

test('a receipt that came before its message: the message of the number says the best one; a receipt after the message, or about a customer\'s message, changes nothing', async () => {
  const id = gwSessionOf('a1').id, start = link.store.lastEvent(), chat = '15550001111@c.us';
  const send = (event, data) => deliver(id, event, data).then(r => assert.deepEqual(r.json, { ok: true, stored: true }));
  const own = (name, at) => ({ id: `true_${chat}_${name}`, from: '15550009999@c.us', to: chat, chatId: chat, body: 'text ' + name, type: 'text', timestamp: at, fromMe: true, isGroup: false, kind: 'individual' });
  const ack = (name, status) => send('message.ack', { id: `true_${chat}_${name}`, messageId: `true_${chat}_${name}`, status, ack: 0, chatId: chat });
  // E1: delivered and read before the message. E2: only "sent" before it. E3: its receipt comes after it.
  // E4: a customer's message whose id had a receipt. E5: played, then read (the lesser one later) before the message.
  await ack('E1', 'delivered');
  await ack('E1', 'read');
  await ack('E2', 'sent');
  await ack('E4', 'read');
  await ack('E5', 'played');
  await ack('E5', 'read');
  await send('message.sent', own('E1', 1795000201));
  await send('message.sent', own('E2', 1795000202));
  await send('message.sent', own('E3', 1795000203));
  await ack('E3', 'delivered');
  await send('message.received', { ...own('E4', 1795000204), from: chat, to: '15550009999@c.us', fromMe: false, senderPhone: '15550001111' });
  await send('message.sent', own('E5', 1795000205));
  await post('/api/wa/claim', { client: 'client-feed-2' });
  const events = (await feed('client-feed-2', start)).json.events;
  assert.deepEqual(events.filter(e => e.kind === 'message').map(e => [e.id.slice(-2), e.fromMe, e.status]), [['E1', true, 'read'], ['E2', true, undefined], ['E3', true, undefined], ['E4', false, undefined], ['E5', true, 'played']]);
  assert.deepEqual(events.filter(e => e.kind === 'receipt').map(e => [e.id.slice(-2), e.status]), [['E1', 'delivered'], ['E1', 'read'], ['E2', 'sent'], ['E4', 'read'], ['E5', 'played'], ['E5', 'read'], ['E3', 'delivered']], 'the receipts themselves are delivered as before');
  assert.equal(Object.hasOwn(events.find(e => e.kind === 'message' && e.id.endsWith('E2')), 'status'), false, 'a message without such a receipt says nothing');
  // a page that reads on from a later position: what came before that position still counts
  const later = (await feed('client-feed-2', start + 6)).json.events;
  assert.deepEqual(later.filter(e => e.kind === 'message').map(e => [e.id.slice(-2), e.status]), [['E1', 'read'], ['E2', undefined], ['E3', undefined], ['E4', undefined], ['E5', 'played']]);
});

test('one page reads the feed: a page that claims it takes it over, also from a page that is waiting', async () => {
```

**Verify**: `sha256sum work/wa-replica/openwa-link.cjs work/wa-replica/openwa-link.test.cjs` → `4c73ddb6fac6bb2cf8fab9baaa67e8132c435412c0c46c1dd18bfbabae2dbeff`, `adfb8b54c9daad07a9a1fc6786aab23110e1b8bf37c63b119e8c7cb212dc0eaa`; `node --check work/wa-replica/openwa-link.cjs` exits 0; `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`. If a checksum does not match, restore the file with `git checkout 6d2d84d -- <file>` and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 3: The page takes the receipt

#### `fidelity-openwa.js`

**Edit 3.1** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    const list = data.messages[c.id] ??= conversationMessages(c);
    if (e.id && list.some(m => m.wa === e.id)) return named;
    const text = e.text || openwaMediaText[e.type] || '[消息]';
```

Replace them with:

```text
    const list = data.messages[c.id] ??= conversationMessages(c);
    // e.status is the receipt the server holds for a message of the number from before the message itself: a
    // receipt that came first found no message here and was left aside.
    const known = e.id && list.find(m => m.wa === e.id);
    if (known) {
      const order = ['sending', 'unknown', 'sent', 'delivered', 'read', 'played'];
      if (known.side !== 'out' || !e.status || order.indexOf(e.status) <= order.indexOf(known.status)) return named;
      known.status = e.status;
      return true;
    }
    const text = e.text || openwaMediaText[e.type] || '[消息]';
```

**Edit 3.2** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
      if (mine) {
        Object.assign(mine, { wa: e.id, status: 'sent' });
        return true;
```

Replace them with:

```text
      if (mine) {
        Object.assign(mine, { wa: e.id, status: e.status || 'sent' });
        return true;
```

**Edit 3.3** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    }
    const message = { id: nextId('m'), side: e.fromMe ? 'out' : 'in', text, time: openwaClock(e.at), at: e.at, wa: e.id, type: e.type, ...(e.media?.name ? { file: e.media.name } : {}), ...(e.fromMe ? { status: 'sent' } : {}) };
    // A file this page is sending comes through the feed before the server has answered: it is the page's own
```

Replace them with:

```text
    }
    const message = { id: nextId('m'), side: e.fromMe ? 'out' : 'in', text, time: openwaClock(e.at), at: e.at, wa: e.id, type: e.type, ...(e.media?.name ? { file: e.media.name } : {}), ...(e.fromMe ? { status: e.status || 'sent' } : {}) };
    // A file this page is sending comes through the feed before the server has answered: it is the page's own
```

#### `validate-scrm-lifecycle.cjs`

**Edit 3.4** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
}
// The list of conversations keeps its place when the page is drawn again.
```

Replace them with:

```text
}
// A receipt that reached the link before its message is not lost: the feed gives the message the best receipt
// from before, and the page takes it — for a new message and for one it has already.
for (const required of ["const RECEIPTS_BEFORE = ['delivered', 'read', 'played'];", 'const receipts = store.receiptsBefore(rows.at(-1).seq, own.map(e => e.id));', 'const status = RECEIPTS_BEFORE.findLast(s => receipts.some(r => r.account === e.account && r.id === e.id && r.seq < e.seq && r.status === s));']) {
  assert(read(path.join(__dirname, 'openwa-link.cjs')).includes(required), `openwa-link.cjs is missing ${required}`);
}
for (const required of ["...(e.fromMe ? { status: e.status || 'sent' } : {}) };", "Object.assign(mine, { wa: e.id, status: e.status || 'sent' });", "if (known.side !== 'out' || !e.status || order.indexOf(e.status) <= order.indexOf(known.status)) return named;"]) {
  assert(openwaSource.includes(required), `fidelity-openwa.js is missing ${required}`);
}
// The list of conversations keeps its place when the page is drawn again.
```

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js work/wa-replica/validate-scrm-lifecycle.cjs` → `99fd88dcc39b1917cb1092a898ca9ee3bbd1924f0a6663fcd6de259eb85164e7`, `daa461cd7f24e81fe63e8435cb093b182f7c82a77a34eb0dfa1d391e888043f0`; the syntax command → `SYNTAX_OK`; `git checkout 6d2d84d -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84` (a message "Missing prototype source anchor" means a swap does not match the baseline — STOP); `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `sha256sum outputs/wa-replica-prototype/app.js` → `816d993bccfa9c0195b8b0799e6a5c54d87d5dcbf12c894bdb7ddcf09744f8bc`. If a checksum does not match, restore the file with `git checkout 6d2d84d -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 先于消息到达的回执不再丢失 · 2026-11-22

已发出的消息旁显示送达状态：✓ 已发送、✓✓ 已送达、「已读」。检查负责人号码上的数据时发现：收到过回执的 12 条消息里，有 2 条仍只显示「已发送」。原因是回执比消息本身先到——这两条消息在号码绑定之前就已经在手机上，绑定后回执先由 OpenWA 通知过来，消息本身稍后才在补取历史时进入系统；页面收到回执时还不认识这条消息，回执就被丢掉了。

现在：服务器在把一条本号码发出的消息交给页面时，会附上此前已经收到的、关于这条消息的最高一级回执（已送达、已读或已播放）；页面据此直接显示正确的状态。之后到达的回执照常处理。

说明：从 WhatsApp 历史中导入的旧消息本身不带回执状态（OpenWA 的历史接口不提供），这些消息仍只显示「已发送」，只有号码绑定之后产生的回执才能显示。此前已经丢失回执的那 2 条消息不会自动补上。

部署：服务器文件有变更，合并后需要重启一次预览服务。
```

Then verify everything once more:

```bash
git checkout 6d2d84d -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && $NODE --test work/wa-replica/openwa-link.test.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-048/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test runs end with `pass 23`, `fail 0` and `pass 12`, `fail 0`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `99d73f98c72b90515d36162f4127ba175bdd1f40988168cf60e85322a59a3a26`; `git status --porcelain` lists exactly seven paths: `replica/build-log.md`, the four source files under `work/wa-replica/`, and `outputs/wa-replica-prototype/app.js` and `validation.json` (if `outputs/wa-replica-prototype/icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Tests of the link** (23, one new): a message of the number whose receipts came before it says the best of them, also when the lesser one came later and when the page reads on from a position after those receipts; a message with only "sent" before it, a message whose receipt comes after it, and a customer's message say nothing; the receipts themselves are delivered as before.
- **Validator** — the link looks the receipts up and gives the best; the page takes it for a new message, for its own message that the feed confirms, and for one it has already.
- **Smoke** (`/tmp/wa-scrm-plan-048/smoke.sh`) — the same facts on the sources and the built page, the build log, the syntax of the two files and the tests of the link, the relay and the server.
- The build and the validator do not run the page. **Verified by the reviewer in scripted browser sessions, not by you**: "delivered" and "read" reach the page before the message they are about and nothing breaks; the message, typed on the phone, comes afterwards and shows "read" at once; a message without an earlier receipt is "sent" and its receipts afterwards move it on; a message that had only "delivered" before starts there and "read" afterwards still arrives; what the page shows is saved. The sessions of the rest of the product and of the connection still pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 6d2d84d -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 14`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-048/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/openwa-link.cjs` → `4c73ddb6fac6bb2cf8fab9baaa67e8132c435412c0c46c1dd18bfbabae2dbeff`
- [ ] `sha256sum work/wa-replica/openwa-link.test.cjs` → `adfb8b54c9daad07a9a1fc6786aab23110e1b8bf37c63b119e8c7cb212dc0eaa`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js` → `99fd88dcc39b1917cb1092a898ca9ee3bbd1924f0a6663fcd6de259eb85164e7`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `daa461cd7f24e81fe63e8435cb093b182f7c82a77a34eb0dfa1d391e888043f0`
- [ ] `sha256sum replica/build-log.md` → `99d73f98c72b90515d36162f4127ba175bdd1f40988168cf60e85322a59a3a26`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `816d993bccfa9c0195b8b0799e6a5c54d87d5dcbf12c894bdb7ddcf09744f8bc`
- [ ] `git diff --quiet 6d2d84d -- outputs/wa-replica-prototype/icons.js` exits 0 (the icon file is unchanged)
- [ ] `git diff --name-only 6d2d84d..HEAD -- . ':!plans'` lists exactly these seven: `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/fidelity-openwa.js`, `work/wa-replica/openwa-link.cjs`, `work/wa-replica/openwa-link.test.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build stops with "Missing prototype source anchor" or another assertion, reports another number of icons than 84, a test fails, or the validator fails.
- An output file other than `app.js` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file.

## Maintenance notes

- **Deployment**: `openwa-link.cjs` is loaded when the server starts — **the preview service must be restarted once after the merge**.
- The lookup is one query for a page of the feed (200 deliveries at most), and only when that page holds messages of the number; it reads the receipts among the deliveries the link keeps.
- A page that is open while the service is restarted keeps working: it only gains the field once the server sends it.
- Not part of this: marking a customer's messages as read at WhatsApp. The owner declined to pursue it.
- What a reviewer should scrutinise: that a receipt after the message is not applied twice or lost; that a customer's message never gets a status.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
