# Plan 075: A reply whose outcome is open shows once

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1e35323..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (two conditions widened from one status to two; exact text and checksums for every file)
- **Depends on**: plans/074-feed-starts-again.md (DONE; it changed `fidelity-openwa.js`, the validator and the build log that this plan edits after it)
- **Category**: bug fix (deep audit of 2026-11-25, finding CORR-05 in `plans/PROJECT-SPEC.md`; chosen by the owner)
- **Planned at**: commit `1e35323`, 2026-11-25

## Why this matters

A reply sent from the page (`fidelity-openwa.js`) is added to the conversation with `status: 'sending'` (发送中) and a request id, and sent through the server (`openwaDeliver`). Two things then come back, in either order: the server's answer (with WhatsApp's message id) and a copy of the sent message through the WhatsApp feed (`e.fromMe`). `openwaApply` pairs the copy with the page's own message — "the message that is still waiting for its answer": `m.side === 'out' && !m.wa && m.status === 'sending' && m.text === e.text` — so the reply shows once.

A reply can also have an open outcome, `status: 'unknown'` (shown as 结果待确认 with a 重试 button): `openwaDeliver` sets it when the answer was lost on its way (no connection, 502, or the server's `outcome-unknown`), and `openwaListen` sets it for every reply still marked 发送中 when the page starts again (the page was closed or reloaded while the reply was on its way). Such a reply may well have been sent — and then its copy comes through the feed. Because only `'sending'` is paired, the copy is taken for another message: the same reply shows twice in the conversation. For a customer known by phone number only (no chat id yet), the copy is not even recognised as this customer's (the lookup above uses the same `'sending'` condition), so it can start a new customer of its own.

Shown in a browser (the reviewer's harness, 2026-11-25): with OpenWA answering "outcome unknown" and the copy coming afterwards, the conversation held two copies of the reply (结果待确认 and 已发送); reloaded while a reply was on its way, the same. With this plan's change each reply shows once, with the copy's status.

### Decisions already made (do not re-open; do not ask)

- Both conditions accept `'sending'` and `'unknown'`, written `['sending', 'unknown'].includes(m.status)` (the module already writes `['failed', 'unknown'].includes(m.status)` in `openwaResend`). `'failed'` stays out: the server said that such a reply was not sent.
- When the copy is paired, the page's message takes the copy's id and status (unchanged code: `Object.assign(mine, { wa: e.id, status: e.status || 'sent' })`), so 结果待确认 and its 重试 button give way to 已发送.
- Nothing else changes: pairing still needs the same text and no WhatsApp id yet; the marking of 发送中 as 结果待确认 at start, sending, retrying and the server stay as they are.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity-openwa.js` | `7c5814d495413f71c4229fddaa6f2e45154998d65c39f04838c0bc396ddcdf89` | `72588afc9ce0ceee61fc57e9c10d215f9a6c4eae89888f253efc67f8430529c5` | 2 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `09f4c626723db7834d8218aa60a53425719fca0ab9bb37b7d96504db36149f62` | `c7cd109484bda01456b438ad59ffcdc09968ba3c57f7eb315e3ed416a31e545f` | 2 |
| `replica/build-log.md` | `490e24657c8a8277f573ec59836cbb86049f20e6042231991825d5feb466eeb4` | `583fd32fd78fc576382e03ef2ecf64904a77f15ceb7cf9902a3b92f37ed48a17` | 1 append |

- `fidelity-openwa.js` — the WhatsApp module of the built page; `openwaApply(e)` applies one event of the feed: it first looks for the customer of the chat (including the lookup for a customer known by phone number only), then pairs a copy of the page's own message.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly two output files differ: `app.js` and `validation.json` (written by the validator).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer** (the server's accounts and data use `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 1e35323 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (unchanged) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 20`, `fail 0` (unchanged) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-075/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-openwa.js` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.js`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — the rest of `fidelity-openwa.js` (sending, retrying, the marking at start), the base app, the other modules, the style sheets, the servers, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/075-open-outcome-once` first.
- One commit is fine. Conventional commit message, e.g. `fix(scrm): show a reply whose outcome is open once`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, very long lines, quotes and backslashes; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 4 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the three files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-075/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-075 && cat > /tmp/wa-scrm-plan-075/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 075: a reply whose outcome is open (结果待确认) is matched with its copy from the WhatsApp feed and shows
# once. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'a reply whose outcome is open is matched with its copy' "$W/fidelity-openwa.js" "const mine = list.find(m => m.side === 'out' && !m.wa && ['sending', 'unknown'].includes(m.status) && m.text === e.text);"
has 'such a reply also finds a customer known by phone number only' "$W/fidelity-openwa.js" "(m.wa ? m.wa === e.id : ['sending', 'unknown'].includes(m.status) && m.text === e.text)"
same 'no matching on replies on their way only' "$(grep -c "m.status === 'sending' && m.text === e.text" "$W/fidelity-openwa.js")" 0
has 'the page is built with it' "$O/app.js" "const mine = list.find(m => m.side === 'out' && !m.wa && ['sending', 'unknown'].includes(m.status) && m.text === e.text);"
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  openOutcomeMatched: 'a reply whose outcome is open"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 发送结果待确认的回复不再显示两次：已修复 · 2026-11-25'
same 'of the built files only the page and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.js|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-075/smoke.sh && ls -l /tmp/wa-scrm-plan-075/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-075/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `a reply whose outcome is open is matched with its copy`, `such a reply also finds a customer known by phone number only`, `no matching on replies on their way only` (got: 2), `the page is built with it`, `the validator knows it` and `the build log has the entry` (six checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: A reply whose outcome is open is paired with its copy

#### `fidelity-openwa.js`

**Edit 2.1** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    // A message this page sent to a customer who was known by phone number only comes back under the chat id
    // WhatsApp uses for that person: the customer who holds that message is the one of this chat.
    if (!c && e.kind === 'message' && e.fromMe) {
      c = data.customers.find(x => x.account === a.id && !x.waChat && (data.messages[x.id] || []).some(m => m.side === 'out' && (m.wa ? m.wa === e.id : m.status === 'sending' && m.text === e.text)));
    }
```

Replace them with:

```text
    // A message this page sent to a customer who was known by phone number only comes back under the chat id
    // WhatsApp uses for that person: the customer who holds that message is the one of this chat. Also when the
    // message's outcome was open (结果待确认; plan 075), as below.
    if (!c && e.kind === 'message' && e.fromMe) {
      c = data.customers.find(x => x.account === a.id && !x.waChat && (data.messages[x.id] || []).some(m => m.side === 'out' && (m.wa ? m.wa === e.id : ['sending', 'unknown'].includes(m.status) && m.text === e.text)));
    }
```

**Edit 2.2** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    if (e.fromMe) {
      // What this page sent comes back through the feed: it is the message that is still waiting for its answer.
      const mine = list.find(m => m.side === 'out' && !m.wa && m.status === 'sending' && m.text === e.text);
      if (mine) {
```

Replace them with:

```text
    if (e.fromMe) {
      // What this page sent comes back through the feed: it is the message that is still waiting for its answer, or
      // the one whose answer never came (结果待确认: the page was closed while it was on its way, or the answer was
      // lost) — taken for another message, the reply would show twice (plan 075).
      const mine = list.find(m => m.side === 'out' && !m.wa && ['sending', 'unknown'].includes(m.status) && m.text === e.text);
      if (mine) {
```

What these edits do, so that you can recognise them: in the lookup of a customer known by phone number only, `m.status === 'sending' && m.text === e.text` becomes `['sending', 'unknown'].includes(m.status) && m.text === e.text`; in the pairing of the copy (`const mine = …`) the same; the comments above both say why.

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js` → `72588afc9ce0ceee61fc57e9c10d215f9a6c4eae89888f253efc67f8430529c5`. If the checksum does not match, restore the file (`git checkout -- <file>`) and apply the edit again, once; if it still does not match, STOP.

### Step 3: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// The WhatsApp feed starts also when its first questions fail (plan 074): the server's state and the feed for this page
```

Replace them with:

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// A reply whose outcome is open (结果待确认: the page was closed while it was on its way, or the answer was lost) is
// matched with its copy from the WhatsApp feed like a reply still on its way, so that it does not show twice (plan 075).
for (const required of ["(m.wa ? m.wa === e.id : ['sending', 'unknown'].includes(m.status) && m.text === e.text)", "const mine = list.find(m => m.side === 'out' && !m.wa && ['sending', 'unknown'].includes(m.status) && m.text === e.text);"]) {
  assert(openwaSource.includes(required) && appJs.includes(required), 'a reply whose outcome is open must be matched with its copy from the feed: ' + required.slice(0, 60));
}
assert(!openwaSource.includes("m.status === 'sending' && m.text === e.text"), 'no copy from the feed may be matched with replies on their way only');
// The WhatsApp feed starts also when its first questions fail (plan 074): the server's state and the feed for this page
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  feedStartsAgain: 'the WhatsApp feed starts also when its first questions fail (the server restarting, a moment without network): the server\'s state and the feed for this page are asked again after 2, 4, 8 … at most 30 s until they are answered; an ended session shows 登录已失效, as the feed loop does',
```

Replace them with:

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  openOutcomeMatched: 'a reply whose outcome is open (结果待确认: the page was closed while it was on its way, or the answer was lost) is matched with its copy from the WhatsApp feed and shows once, with the copy\'s status; before, the copy showed as a second reply (or, for a customer known by phone number only, as a new customer)',
  feedStartsAgain: 'the WhatsApp feed starts also when its first questions fail (the server restarting, a moment without network): the server\'s state and the feed for this page are asked again after 2, 4, 8 … at most 30 s until they are answered; an ended session shows 登录已失效, as the feed loop does',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `c7cd109484bda01456b438ad59ffcdc09968ba3c57f7eb315e3ed416a31e545f`; `git checkout 1e35323 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.js` and `validation.json` of `outputs/wa-replica-prototype/` only; `sha256sum outputs/wa-replica-prototype/app.js` → `6d6f6b01eefe28e17319f87e8916b9005181cc154ea9327443778ffe7e86db37`. If a checksum does not match, restore the file and apply its edits again, once; if it still does not match, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 发送结果待确认的回复不再显示两次：已修复 · 2026-11-25

回复发出后，页面会等待服务器的答复；同时 WhatsApp 也会把这条已发出的消息再传回来，页面把两者对上，消息只显示一次。此前，只有仍在“发送中”的回复才会被对上。如果回复的结果变成了「结果待确认」（发送途中刷新或关闭了页面，或服务器的答复在网络上丢失），WhatsApp 传回的那条就被当成另一条消息，同一条回复在会话中显示两次；如果客户当时只有手机号，还可能多出一个新客户。

现在「结果待确认」的回复也会与 WhatsApp 传回的消息对上：会话中只显示一条，并带上 WhatsApp 报告的状态（已发送、已送达、已读）。

验证：构建与校验脚本通过；浏览器测试：服务器答复“结果未知”后 WhatsApp 传回消息，以及在发送途中刷新页面，这两种情况修改前回复都显示两次，修改后只显示一次。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout 1e35323 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-075/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `583fd32fd78fc576382e03ef2ecf64904a77f15ceb7cf9902a3b92f37ed48a17`; `git status --porcelain` lists exactly these five as changed and nothing as new: the three files of the table in "Current state" and `outputs/wa-replica-prototype/app.js`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the refusal and the confirmed removal's filter, in the source and the built page.
- **Smoke** (`/tmp/wa-scrm-plan-075/smoke.sh`) — the same facts, three test files, which built files changed, the syntax of the built page.
- **Verified by the reviewer, not by you**: in a browser against the reviewer's harness — OpenWA answers "outcome unknown", then the copy comes through the feed: one reply, 已发送 (before this plan: two); the page reloaded while a reply is on its way, then the copy comes: one reply (before: two). The full site and WhatsApp suites.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 1e35323 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 20`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-075/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js` → `72588afc9ce0ceee61fc57e9c10d215f9a6c4eae89888f253efc67f8430529c5`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `c7cd109484bda01456b438ad59ffcdc09968ba3c57f7eb315e3ed416a31e545f`
- [ ] `sha256sum replica/build-log.md` → `583fd32fd78fc576382e03ef2ecf64904a77f15ceb7cf9902a3b92f37ed48a17`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `6d6f6b01eefe28e17319f87e8916b9005181cc154ea9327443778ffe7e86db37`
- [ ] `git diff --name-only 1e35323..HEAD -- outputs` lists `app.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only 1e35323..HEAD -- . ':!plans'` lists exactly five paths: the three of the table in "Current state", `app.js` and `validation.json`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, or a test fails.
- An output file other than `app.js` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file, creating a file or installing a package.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else. An open page keeps the old behaviour until it is opened again.
- Pairing is by text: two replies with the same text whose outcomes are both open pair with their copies in order; that was already so for replies on their way.
- Related, not changed here (`plans/PROJECT-SPEC.md` §11, CORR-08): the lookup of a customer known by phone number only guesses the chat from a pending reply with the same text; this plan lets a reply with an open outcome take part in that guess as well.
- What a reviewer should scrutinise: that a reply marked 未发送 (`failed`) is never paired; that a reply already carrying a WhatsApp id is never paired again.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
