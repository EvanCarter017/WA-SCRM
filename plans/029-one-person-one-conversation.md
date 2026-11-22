# Plan 029: One person, one conversation — a customer known by phone and the chat WhatsApp names by a privacy id are one record

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat cdcfa1a..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MEDIUM (the page joins two customer records by itself; exact text and checksums for every change)
- **Depends on**: plans/028-catch-up-with-whatsapp.md (DONE)
- **Category**: bug
- **Planned at**: commit `cdcfa1a`, 2026-11-22

## Why this matters

In the owner's first real use on 2026-11-22 one person ended up with two conversations. The owner had made a customer by hand, with a phone number, and sent a message from the page. WhatsApp names most chats by a privacy id (`…@lid`) and reported that message back under such an id. The page did not know that chat id, took the report for a message of a new chat and made a second customer; the reply and the read receipts then went to the copy, and the customer made by hand kept a message that stayed at "sent".

This plan closes that:

- **The page knows its own message.** When a message of this page comes back under a chat id no customer has, the customer who holds that very message (the same WhatsApp id, or the message still waiting for its answer with the same text) is the customer of that chat. No second record is made.
- **Phone numbers are filled in.** An event that carries the phone number of a chat fills it into a customer who has none.
- **Records that are already double are joined.** Whenever, on one number, a customer known by chat id and a customer without a chat id carry the same phone number, they are one person: the one without a chat id — made by hand — stays and takes over the conversation (in order of time, every message once, the further receipt wins), the unread count, tags, notes, to-dos, history entries and archived records of the other, which is removed.
- **An edit without text is left out** of the feed by the server: OpenWA sends one for some pictures, and the page has nothing to show for it.

### Decisions already made (do not re-open; do not ask)

- The record made by hand survives a join; its name and its own fields are never overwritten, only empty notes are filled and tags are added.
- Records are joined only within one number and only on the same phone number (at least seven digits).
- No question to the employee: two records of one person on one number are never wanted.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/openwa-link.cjs` | `0de835a1c110c7bc0a1943700bbbe8a09e55bae98172d227f3c35faf08a862ba` | `65631bced96ff6eaf7722b78b078f2f0adeca6f3be57923ed0b973d282968f05` |
| `work/wa-replica/openwa-link.test.cjs` | `2a1939470e052d8d0667058d41ba3e4def2de8ec6cdad08f6d16a2b650949d9e` | `75f4544f23b60d79de284d557c35afc2421a62c3fe5dac6ae42385a75f12ab40` |
| `work/wa-replica/fidelity-openwa.js` | `8ebcab390d0e729648ccded3a3ad5dcbd0742603d012130e154cac444889da1d` | `c6ba981ea8b49c353fee7fe9d512adcf7c5b57efd4da8c6f6da3a98bab084746` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `5b444279cdaa0e6aff9353a548ebec634df8cc77115c187228ad0d4affdc4c51` | `e10c299c2a3898ff61817bc094d382b860e24527e9443d6d4fcf5a592d342bb0` |

- `fidelity-openwa.js` — the page module of the connection. `openwaApply(e)` applies one event of the server's feed: it looks for the customer of the event's chat (`c.waChat === e.chat`, or the phone number for a customer without a chat id), makes one with `openwaNewCustomer` when there is none, and adds the message to `data.messages[c.id]`. A message carries `wa` (WhatsApp's id), `at` (time) and, when this page sent it, `status`. `openwaListen()` reads the feed in a loop and applies every batch. Other records that point at a customer: `data.tasks[].customer`, `data.activities[customerId]`, `data.chatArchives[].customerId`.
- `openwa-link.cjs` — the server's link to OpenWA; `present(row)` puts a stored delivery into the form the page reads, or returns `null` for one the page has no use for.
- `openwa-link.test.cjs` — 16 tests; the test "the feed gives the deliveries in this project's own form, in order" sends 13 deliveries and checks the feed.
- `validate-scrm-lifecycle.cjs` — its section 22 lists texts that `fidelity-openwa.js` must contain; two are added.

### How the build works

`work/wa-replica/build-fidelity.cjs` puts the module files into the app and writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout cdcfa1a -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Link tests | `env -u WA_SCRM_OPENWA_ENV -u WA_SCRM_OPENWA_SYNC_MS -u WA_SCRM_OPENWA_SYNC_PAUSE_MS $NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 16`, `fail 0` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 12`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-029/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |
| Icon set | `node -e "const vm=require('vm'),fs=require('fs'),cp=require('child_process');const keys=s=>{const w={};vm.runInNewContext(s,{window:w});return Object.keys(w.WA_ICONS)};const a=keys(cp.execSync('git show cdcfa1a:outputs/wa-replica-prototype/icons.js').toString()),b=keys(fs.readFileSync('outputs/wa-replica-prototype/icons.js','utf8'));console.log('removed='+a.filter(x=>!b.includes(x)).join(',')+' added='+b.filter(x=>!a.includes(x)).join(','))"` | `removed= added=` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/openwa-link.cjs`, `work/wa-replica/openwa-link.test.cjs` (Step 2)
- `work/wa-replica/fidelity-openwa.js`, `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{app.js,validation.json}` (the other output files must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular `serve.cjs`, `site-*.cjs`, `fidelity-boot.js`, the other modules, `build-fidelity.cjs`, `README.md`, `plans/**`, earlier entries of `replica/build-log.md`; any real OpenWA, any settings file with a key, any data folder inside the repository.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/029-one-person-one-conversation` first.
- One commit is fine. Conventional commit message, e.g. `fix(scrm): one person, one conversation`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives a text to find (it occurs exactly once in the named file) and the text that replaces it. An **Insert** names the beginning of a line (exactly one line starts that way) and the text to put directly above it. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Before each change, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the four source files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-029/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-029 && cat > /tmp/wa-scrm-plan-029/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that one person has one conversation: the server part, its tests and the built page.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'the server leaves out an edit without text' "$W/openwa-link.cjs" "if (name === 'message.edited') return d.body ? {"
has 'the built page knows its own message under another chat id' "$P/app.js" "if (!c && e.kind === 'message' && e.fromMe) {"
has 'the built page joins two records of one person' "$P/app.js" 'function openwaJoinTwins() {'
has 'the built page fills in a phone number it learns' "$P/app.js" "if (c && !c.phone && e.phone) c.phone = '+' + e.phone;"
has 'the feed test covers the edit without text' "$W/openwa-link.test.cjs" "an edit without text are left out"
same 'the link tests pass' "$(env -u WA_SCRM_OPENWA_ENV -u WA_SCRM_OPENWA_SYNC_MS -u WA_SCRM_OPENWA_SYNC_PAUSE_MS "$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 16 ℹ fail 0 '
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
same 'the page sources still pass the syntax check' "$(node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('$W/fidelity-openwa.js','utf8')+'})');console.log('ok')" 2>&1)" ok
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-029/smoke.sh && ls -l /tmp/wa-scrm-plan-029/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/openwa-link.cjs work/wa-replica/openwa-link.test.cjs work/wa-replica/fidelity-openwa.js work/wa-replica/validate-scrm-lifecycle.cjs` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-029/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the server leaves out an edit without text`, `the built page knows its own message under another chat id`, `the built page joins two records of one person`, `the built page fills in a phone number it learns` and `the feed test covers the edit without text` (five checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The server: an edit without text is left out of the feed

**Edit 2.1** — `work/wa-replica/openwa-link.cjs`. Find exactly (it occurs once):

```text
  if (name === 'message.edited') return { ...event, kind: 'edited', id: String(d.messageId || ''), chat: String(d.chatId || ''), text: String(d.body || '') };
```

Replace with:

```text
  // An edit that leaves no text (WhatsApp sends one for some pictures) says nothing the page could show.
  if (name === 'message.edited') return d.body ? { ...event, kind: 'edited', id: String(d.messageId || ''), chat: String(d.chatId || ''), text: String(d.body) } : null;
```

**Edit 2.2** — `work/wa-replica/openwa-link.test.cjs`. Find exactly (it occurs once):

```text
  await send('message.received', { id: 'status_B5', from: 'status@broadcast', to: '15550009999@c.us', chatId: 'status@broadcast', body: 'a status', type: 'text', timestamp: 1795000105, fromMe: false, isGroup: false, kind: 'status', isStatusBroadcast: true });
```

Replace with:

```text
  await send('message.received', { id: 'status_B5', from: 'status@broadcast', to: '15550009999@c.us', chatId: 'status@broadcast', body: 'a status', type: 'text', timestamp: 1795000105, fromMe: false, isGroup: false, kind: 'status', isStatusBroadcast: true });
  await send('message.edited', { messageId: 'false_15550001111@c.us_B2', chatId: '15550001111@c.us', body: '', senderId: '15550001111@c.us', fromMe: false, isGroup: false, type: 'image', hasMedia: true });
```

**Edit 2.3** — `work/wa-replica/openwa-link.test.cjs`. Find exactly (it occurs once):

```text
  assert.deepEqual(claimed.json, { ok: true, last: start + 13 });
```

Replace with:

```text
  assert.deepEqual(claimed.json, { ok: true, last: start + 14 });
```

**Edit 2.4** — `work/wa-replica/openwa-link.test.cjs`. Find exactly (it occurs once):

```text
  assert.deepEqual(read.json, { last: start + 13, events: [
```

Replace with:

```text
  assert.deepEqual(read.json, { last: start + 14, events: [
```

**Edit 2.5** — `work/wa-replica/openwa-link.test.cjs`. Find exactly (it occurs once):

```text
'group, status and unknown-receipt deliveries are left out, and the position still moves past them');
```

Replace with:

```text
'group, status and unknown-receipt deliveries and an edit without text are left out, and the position still moves past them');
```

**Edit 2.6** — `work/wa-replica/openwa-link.test.cjs`. Find exactly (it occurs once):

```text
  assert.deepEqual((await feed('client-feed-1', start + 13)).json, { events: [], last: start + 13 });
```

Replace with:

```text
  assert.deepEqual((await feed('client-feed-1', start + 14)).json, { events: [], last: start + 14 });
  assert.deepEqual((await feed('client-feed-1', start + 13)).json, { events: [], last: start + 14 });
```

**Verify**: `sha256sum work/wa-replica/openwa-link.cjs work/wa-replica/openwa-link.test.cjs` → `65631bced96ff6eaf7722b78b078f2f0adeca6f3be57923ed0b973d282968f05`, `75f4544f23b60d79de284d557c35afc2421a62c3fe5dac6ae42385a75f12ab40`; `node --check work/wa-replica/openwa-link.cjs && node --check work/wa-replica/openwa-link.test.cjs && echo SYNTAX_OK` → `SYNTAX_OK`; the link tests → `pass 16`, `fail 0`. If a checksum does not match, restore the file with `git checkout cdcfa1a -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 3: The page: know the own message, fill in phone numbers, join two records of one person

**Insert 3.1** — `work/wa-replica/fidelity-openwa.js`. Find the line that starts with (one line starts this way):

```text
  const openwaFindMessage = (accountId, wa) => {
```

Insert exactly this text as new lines directly above that line (the last line of the block is an empty line; it is part of the text):

```text
  // Two records of one person on one number: one made by hand and known by its phone number, one made from a
  // message and known by the chat id WhatsApp uses (often a privacy id). The one made by hand stays: it takes
  // over the conversation, the to-dos and the history of the other.
  function openwaJoin(keep, drop) {
    const order = ['sending', 'unknown', 'failed', 'sent', 'delivered', 'read', 'played'];
    const list = data.messages[keep.id] ??= conversationMessages(keep);
    for (const m of data.messages[drop.id] || []) {
      const same = m.wa && list.find(x => x.wa === m.wa);
      if (!same) list.push(m);
      else if (order.indexOf(m.status) > order.indexOf(same.status)) same.status = m.status;
    }
    list.sort((x, y) => (x.at || 0) - (y.at || 0));
    const last = list.at(-1);
    Object.assign(keep, { waChat: drop.waChat, unread: Math.max(Number(keep.unread) || 0, Number(drop.unread) || 0), star: keep.star || drop.star,
      tags: [...new Set([...keep.tags, ...drop.tags])], notes: keep.notes || drop.notes, ...(last?.at ? { preview: last.text, translation: '', last: last.time, lastAt: last.at } : {}) });
    for (const t of data.tasks) if (t.customer === drop.id) t.customer = keep.id;
    for (const record of data.chatArchives || []) if (record.customerId === drop.id) record.customerId = keep.id;
    if (data.activities[drop.id]) data.activities[keep.id] = [...data.activities[drop.id], ...(data.activities[keep.id] || [])];
    delete data.activities[drop.id];
    delete data.messages[drop.id];
    data.customers = data.customers.filter(c => c !== drop);
    if (ui.customer === drop.id) ui.customer = keep.id;
  }
  // Joins such pairs wherever the phone number of a chat has become known. Returns true when it joined any.
  function openwaJoinTwins() {
    const byPhone = new Map();
    for (const c of data.customers) if (!c.waChat && fidPhoneDigits(c.phone).length >= 7) byPhone.set(c.account + ' ' + fidPhoneDigits(c.phone), c);
    let joined = false;
    for (const drop of [...data.customers]) {
      const key = drop.account + ' ' + fidPhoneDigits(drop.phone), keep = drop.waChat ? byPhone.get(key) : null;
      if (!keep) continue;
      openwaJoin(keep, drop);
      byPhone.delete(key);
      joined = true;
    }
    return joined;
  }

```

**Edit 3.2** — `work/wa-replica/fidelity-openwa.js`. Find exactly (it occurs once):

```text
    if (c && !c.waChat) c.waChat = e.chat;
    if (e.kind === 'chat') {
```

Replace with:

```text
    // A message this page sent to a customer who was known by phone number only comes back under the chat id
    // WhatsApp uses for that person: the customer who holds that message is the one of this chat.
    if (!c && e.kind === 'message' && e.fromMe) {
      c = data.customers.find(x => x.account === a.id && !x.waChat && (data.messages[x.id] || []).some(m => m.side === 'out' && (m.wa ? m.wa === e.id : m.status === 'sending' && m.text === e.text)));
    }
    if (c && !c.waChat) c.waChat = e.chat;
    if (c && !c.phone && e.phone) c.phone = '+' + e.phone;
    if (e.kind === 'chat') {
```

**Edit 3.3** — `work/wa-replica/fidelity-openwa.js`. Find exactly (it occurs once):

```text
      for (const e of answer.body.events) applied = openwaApply(e) || applied;
```

Replace with:

```text
      for (const e of answer.body.events) applied = openwaApply(e) || applied;
      if (openwaJoinTwins()) {
        applied = true;
        persist();
      }
```

**Edit 3.4** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly (it occurs once):

```text
"if (e.kind === 'chat') {", 
```

Replace with:

```text
"if (e.kind === 'chat') {", 'function openwaJoinTwins() {', "if (!c && e.kind === 'message' && e.fromMe) {", 
```

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js work/wa-replica/validate-scrm-lifecycle.cjs` → `c6ba981ea8b49c353fee7fe9d512adcf7c5b57efd4da8c6f6da3a98bab084746`, `e10c299c2a3898ff61817bc094d382b860e24527e9443d6d4fcf5a592d342bb0`; `node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/fidelity-openwa.js','utf8')+'})')" && echo SYNTAX_OK` → `SYNTAX_OK`; `git checkout cdcfa1a -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; the icon-set command → `removed= added=`.

### Step 4: Build log, final verification

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```markdown
## 同一个人只保留一个会话：按手机号建的客户与隐私号会话合并 · 2026-11-22

真实号码首次使用时发现：给一位「手动建档、只有手机号」的客户发消息后，WhatsApp 以隐私号（`@lid`）回报这条消息，页面把它当成了新客户，于是同一个人出现两个会话，对方的回复和已读回执都落到了副本上。

现在：页面自己发出的消息以另一个会话标识回报时，认领持有这条消息的客户，不再新建；收到带手机号的消息或同步到会话的手机号时补全客户手机号；同一号码下「手动建档、按手机号」的客户与「由消息生成、按会话标识」的客户手机号相同时自动合并——保留手动建档的那一个，接管对方的聊天记录、待办、操作记录与归档，消息按时间排序并去重，回执状态取较新的。服务器不再把「内容为空的编辑通知」交给页面（WhatsApp 会为部分图片发送这种通知）。
```

Then verify everything once more:

```bash
git checkout cdcfa1a -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && env -u WA_SCRM_OPENWA_ENV -u WA_SCRM_OPENWA_SYNC_MS -u WA_SCRM_OPENWA_SYNC_PAUSE_MS $NODE --test work/wa-replica/openwa-link.test.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-029/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test runs end with `pass 16` and `pass 12`, `fail 0` each; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md outputs/wa-replica-prototype/app.js` → `b478f7a32980f4a92f9ce57f318677caf06f9af7854dbf4437429728b653fb1d`, `f1a664dee6c4bc9d6dfbd0d229e0128f13a21db264a1815d09c32f3173f16a20`; `git status --porcelain` lists exactly seven paths: the four source files, `replica/build-log.md`, `outputs/wa-replica-prototype/app.js` and `outputs/wa-replica-prototype/validation.json` (if `outputs/wa-replica-prototype/icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **`work/wa-replica/openwa-link.test.cjs`** — the feed test gets a fourteenth delivery, an edit without text, and checks that the feed leaves it out while the position still moves past it. The number of tests stays 16.
- **Validator** — section 22 expects the two new texts in the page module.
- **Smoke** (`/tmp/wa-scrm-plan-029/smoke.sh`) — the server part and the built page carry the new code; the tests pass.
- **Verified by the reviewer in scripted browser sessions, not by you**: a message sent to a customer known by phone that comes back under a privacy id — after the answer to the send and before it — stays with that customer, and so do the receipt and the reply, with no second customer and no first-reply to-do; two records of one person are joined once the phone number of the chat is known, the one made by hand keeping the conversation, the to-do and its name, on the page and on the server; later messages go to the kept record. And the join on the owner's own data, where the two records exist.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout cdcfa1a -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] the link tests → `pass 16`, `fail 0`; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-029/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/openwa-link.cjs` → `65631bced96ff6eaf7722b78b078f2f0adeca6f3be57923ed0b973d282968f05`
- [ ] `sha256sum work/wa-replica/openwa-link.test.cjs` → `75f4544f23b60d79de284d557c35afc2421a62c3fe5dac6ae42385a75f12ab40`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js` → `c6ba981ea8b49c353fee7fe9d512adcf7c5b57efd4da8c6f6da3a98bab084746`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `e10c299c2a3898ff61817bc094d382b860e24527e9443d6d4fcf5a592d342bb0`
- [ ] `sha256sum replica/build-log.md` → `b478f7a32980f4a92f9ce57f318677caf06f9af7854dbf4437429728b653fb1d`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `f1a664dee6c4bc9d6dfbd0d229e0128f13a21db264a1815d09c32f3173f16a20`
- [ ] the icon-set command prints `removed= added=`
- [ ] `git diff --name-only cdcfa1a..HEAD -- . ':!plans'` lists exactly: `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/fidelity-openwa.js`, `work/wa-replica/openwa-link.cjs`, `work/wa-replica/openwa-link.test.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs`
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

- **Deployment**: the server file changes, so the live service must be restarted after the merge (the reviewer does that). The owner's two records of one person are joined the next time the owner's page reads the feed.
- A join removes a customer record. What points at a customer and is not re-pointed by `openwaJoin` (for example the customer id inside AI usage records) keeps the old id; those records only show a name they stored themselves.
- What a reviewer should scrutinise: that a join never loses a message, a to-do or a history entry; that the record made by hand keeps its own name, number and fields; that nothing is joined across two numbers or on a short or missing phone number.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
