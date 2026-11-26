# Plan 077: The row of a customer made by hand reads 新建客户档案 until the first message

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 8cb192b..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (one field of a new customer made by hand; exact text and checksums for every file)
- **Depends on**: plans/076-hand-made-empty.md (DONE; it made the conversation of such a customer empty, and its summary in the validator is corrected here)
- **Category**: owner request of 2026-11-26 ("Show 新建客户档案 in the preview line too"), completing plan 076
- **Planned at**: commit `8cb192b`, 2026-11-26

## Why this matters

Since plan 076 a customer made by hand in 客户列表 (the customer list) with 新增客户 (add customer) starts with an empty conversation; the 初步需求 (initial need) the employee typed stays in the profile and the notes. But the handler `'lc-new-customer-form'` in `fidelity-lifecycle.js` still sets `preview: v('demand') || '新建客户档案'`, and the preview is the line under the customer's name in the chat list (`.conversation-preview`, drawn by `fidelity-lifecycle.js`) and in the supervisor page's list (`fidelity-master.js`) — the place where the last message normally shows. So the 初步需求 still looked like the customer's last message. The owner asked: "Show 新建客户档案 in the preview line too."

新建客户档案 ("new customer profile") is the placeholder that the handler already uses when the 初步需求 is left empty. The first message sent or received replaces the preview as before (the WhatsApp module sets `c.preview` to the newest message).

Everything that reads `c.preview` was mapped: the chat list row, the supervisor page's row, the dashboard's 未读会话 (unread conversations) list (only customers with unread messages, so never a new customer made by hand), the AI module's translation of the preview (only when a message is translated), and `lcSyncRuntimeCustomers` (`demand: c.notes || c.preview`, only for customers that have no `qualification` yet — a customer made by hand gets one when it is made). Search does not read the preview. The build's `conversationMessages(c)` gives an empty conversation for the preview 新建客户档案 as well.

Shown in a browser (the reviewer's harness, 2026-11-26): a customer made by hand with a 初步需求 — before this plan the row and the saved preview showed the 初步需求; with it both read 新建客户档案, the 初步需求 is in the notes, and after the first message the row shows that message. Live data was checked (counts only): the customers made by hand that exist already have messages, so their rows show their newest message and no data needs changing.

### Decisions already made (do not re-open; do not ask)

- The handler sets `preview: '新建客户档案'` for every customer made by hand, with a comment saying why. `notes` and `qualification.demand` keep the 初步需求 as before.
- The validator's summary of plan 076 (`handMadeEmpty`) loses its clause that the row still shows the 初步需求, and a summary `handMadePreview` is added.
- Nothing else changes: the form, the other fields, existing customers, `conversationMessages` in the build and every other module stay as they are.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity-lifecycle.js` | `611986aabd5802502e9524dab505028e71bdfe97c6604c4f874eeeacdf00c0cd` | `a0320de7bba41164b3410a91a9c0f6f2b7538ca631f176bf994a9f7de379b096` | 1 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `381b2b4772047e857ebd5fcdc7ddac720b45b03ef0ab82bdbb22d6dd3f1fcb1c` | `048c9d7af5d2b10bab996dcd0d70cd5c986d5f5d3c2f087ca8453cd3a0e4dfea` | 2 |
| `replica/build-log.md` | `9c5e4f6bd3a8257390969638c102a4f7c18fc576d0fa46f330457a4d9b580923` | `26663daa80ce718480f576519a0725a21a34321e9121dd33d6a3159bd6dca8b6` | 1 append |

- `fidelity-lifecycle.js` — the follow-up module of the built page; among others the form handlers (`Object.assign(fidForms, { … })`), of which `'lc-new-customer-form'` makes a customer by hand.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly two output files differ: `app.js` and `validation.json` (written by the validator).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer** (the server's accounts and data use `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 8cb192b -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (unchanged) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 20`, `fail 0` (unchanged) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-077/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-lifecycle.js` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.js`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — `build-fidelity.cjs` (`conversationMessages` is left as it is), `fidelity-openwa.js`, the base app, the other modules, the style sheets, the servers, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/077-hand-made-preview` first.
- One commit is fine. Conventional commit message, e.g. `fix(scrm): show 新建客户档案 as the preview of a customer made by hand`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, very long lines, quotes and backslashes; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 3 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the three files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-077/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-077 && cat > /tmp/wa-scrm-plan-077/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 077: the row of a customer made by hand reads 新建客户档案 in its preview line until the first message.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'the preview line reads 新建客户档案' "$W/fidelity-lifecycle.js" "        unread: 0, star: false, last: '刚刚', preview: '新建客户档案', translation: '',"
same 'the 初步需求 is no longer the preview' "$(grep -c "preview: v('demand')" "$W/fidelity-lifecycle.js")" 0
has 'the page is built with it' "$O/app.js" "        unread: 0, star: false, last: '刚刚', preview: '新建客户档案', translation: '',"
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  handMadePreview: 'the row of a customer made by hand"
same 'the summary of plan 076 no longer says the row shows the 初步需求' "$(grep -c 'the chat list still shows it as the row' "$W/validate-scrm-lifecycle.cjs")" 0
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 手动新增客户的预览行显示「新建客户档案」 · 2026-11-26'
same 'of the built files only the page and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.js|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-077/smoke.sh && ls -l /tmp/wa-scrm-plan-077/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-lifecycle.js work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-077/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the preview line reads 新建客户档案`, `the 初步需求 is no longer the preview` (got: 1), `the page is built with it`, `the validator knows it`, `the summary of plan 076 no longer says the row shows the 初步需求` (got: 1) and `the build log has the entry` (six checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The preview line of a customer made by hand reads 新建客户档案

#### `fidelity-lifecycle.js`

**Edit 2.1** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
        source: v('source'), campaign: '', ad: '',
        unread: 0, star: false, last: '刚刚', preview: v('demand') || '新建客户档案', translation: '',
        followup: null, notes: v('demand'), contactRefs: [{ account: a?.id, owner: a?.owner || ui.persona }],
```

Replace them with:

```text
        source: v('source'), campaign: '', ad: '',
        // The row's preview line reads 新建客户档案 until the first message (plan 077): the 初步需求 is the employee's
        // note, kept in the profile and the notes; as the preview it looked like the customer's last message.
        unread: 0, star: false, last: '刚刚', preview: '新建客户档案', translation: '',
        followup: null, notes: v('demand'), contactRefs: [{ account: a?.id, owner: a?.owner || ui.persona }],
```

What this edit does, so that you can recognise it: in `'lc-new-customer-form'`, the line `unread: 0, star: false, last: '刚刚', preview: v('demand') || '新建客户档案', translation: '',` gets `preview: '新建客户档案'`, with a two-line comment above it.

**Verify**: `sha256sum work/wa-replica/fidelity-lifecycle.js` → `a0320de7bba41164b3410a91a9c0f6f2b7538ca631f176bf994a9f7de379b096`. If the checksum does not match, restore the file (`git checkout -- <file>`) and apply the edit again, once; if it still does not match, STOP.

### Step 3: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// A customer made by hand (新增客户) starts with an empty conversation (plan 076): without a list of its own, the
```

Replace them with:

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// The row of a customer made by hand reads 新建客户档案 in its preview line until the first message (plan 077): the
// 初步需求 there looked like the customer's last message.
assert(moduleSource.includes("        unread: 0, star: false, last: '刚刚', preview: '新建客户档案', translation: '',\n") && appJs.includes("        unread: 0, star: false, last: '刚刚', preview: '新建客户档案', translation: '',\n") && !moduleSource.includes("preview: v('demand')"), 'the preview line of a customer made by hand must read 新建客户档案 until the first message');
// A customer made by hand (新增客户) starts with an empty conversation (plan 076): without a list of its own, the
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  handMadeEmpty: 'a customer made by hand (新增客户) starts with an empty conversation; the 初步需求 stays in the profile and the notes (before, the conversation showed it as a message from the customer, and the first message sent saved it so); the chat list still shows it as the row\'s preview until the first message',
  openOutcomeMatched: 'a reply whose outcome is open (结果待确认: the page was closed while it was on its way, or the answer was lost) is matched with its copy from the WhatsApp feed and shows once, with the copy\'s status; before, the copy showed as a second reply (or, for a customer known by phone number only, as a new customer)',
```

Replace them with:

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  handMadeEmpty: 'a customer made by hand (新增客户) starts with an empty conversation; the 初步需求 stays in the profile and the notes (before, the conversation showed it as a message from the customer, and the first message sent saved it so)',
  handMadePreview: 'the row of a customer made by hand reads 新建客户档案 in its preview line (chat list, supervisor page) until the first message; before, it showed the 初步需求, which looked like the customer\'s last message',
  openOutcomeMatched: 'a reply whose outcome is open (结果待确认: the page was closed while it was on its way, or the answer was lost) is matched with its copy from the WhatsApp feed and shows once, with the copy\'s status; before, the copy showed as a second reply (or, for a customer known by phone number only, as a new customer)',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `048c9d7af5d2b10bab996dcd0d70cd5c986d5f5d3c2f087ca8453cd3a0e4dfea`; `git checkout 8cb192b -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.js` and `validation.json` of `outputs/wa-replica-prototype/` only; `sha256sum outputs/wa-replica-prototype/app.js` → `84e3d3ab71dddc83eb615323649025fc0b8daea219048fbc6b5d035035ced64a`. If a checksum does not match, restore the file and apply its edits again, once; if it still does not match, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 手动新增客户的预览行显示「新建客户档案」 · 2026-11-26

在「客户列表」中点击「新增客户」后，会话列表（以及主管页面的客户列表）中这位客户一行的预览文字此前显示「初步需求」，看起来像客户发来的最后一条消息。现在在第一条消息之前显示「新建客户档案」；「初步需求」仍保存在客户档案和备注中。发出或收到第一条消息后，预览行照常显示最新的消息。

线上数据检查（只统计数量）：已有的手动新增客户都已有消息，预览行显示的是最新消息，不受影响，无需修改数据。

验证：构建与校验脚本通过；浏览器测试：手动新增一位填写了「初步需求」的客户，修改前会话列表中这一行显示「初步需求」，修改后显示「新建客户档案」；发出第一条消息后显示这条消息。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout 8cb192b -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-077/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `26663daa80ce718480f576519a0725a21a34321e9121dd33d6a3159bd6dca8b6`; `git status --porcelain` lists exactly these five as changed and nothing as new: the three files of the table in "Current state" and `outputs/wa-replica-prototype/app.js`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the refusal and the confirmed removal's filter, in the source and the built page.
- **Smoke** (`/tmp/wa-scrm-plan-077/smoke.sh`) — the same facts, three test files, which built files changed, the syntax of the built page.
- **Verified by the reviewer, not by you**: in a browser against the reviewer's harness — a customer made by hand with a 初步需求: the chat list row and the saved preview read 新建客户档案, the notes hold the 初步需求, and after the first message the row shows that message (before this plan: the row and the saved preview showed the 初步需求). The full site and WhatsApp suites.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 8cb192b -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 20`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-077/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.js` → `a0320de7bba41164b3410a91a9c0f6f2b7538ca631f176bf994a9f7de379b096`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `048c9d7af5d2b10bab996dcd0d70cd5c986d5f5d3c2f087ca8453cd3a0e4dfea`
- [ ] `sha256sum replica/build-log.md` → `26663daa80ce718480f576519a0725a21a34321e9121dd33d6a3159bd6dca8b6`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `84e3d3ab71dddc83eb615323649025fc0b8daea219048fbc6b5d035035ced64a`
- [ ] `git diff --name-only 8cb192b..HEAD -- outputs` lists `app.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only 8cb192b..HEAD -- . ':!plans'` lists exactly five paths: the three of the table in "Current state", `app.js` and `validation.json`
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
- A customer made by hand now always starts with the placeholder preview; anything that wants the 初步需求 reads `c.notes` or `c.qualification.demand`, never `c.preview`.
- What a reviewer should scrutinise: that the 初步需求 is still in the profile and the notes; that a customer made from a WhatsApp chat is untouched.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
