# Plan 076: A customer made by hand starts with an empty conversation

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a9aa112..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (one line, the same one the WhatsApp module writes when it makes a customer; exact text and checksums for every file)
- **Depends on**: plans/075-open-outcome-once.md (DONE; it changed the validator and the build log that this plan edits after it)
- **Category**: bug fix (deep audit of 2026-11-25, finding CORR-07 in `plans/PROJECT-SPEC.md`; chosen by the owner on 2026-11-26)
- **Planned at**: commit `a9aa112`, 2026-11-26

## Why this matters

In 客户列表 (the customer list) the button 新增客户 (add customer) opens a form; its handler `'lc-new-customer-form'` in `fidelity-lifecycle.js` makes the customer with `preview: v('demand') || '新建客户档案'` and `notes: v('demand')` — the 初步需求 (initial need) the employee typed — and adds it to `data.customers`. It makes no conversation for it: `data.messages[id]` stays undefined.

The conversation of a customer is read through `conversationMessages(c)`, defined by the build (`build-fidelity.cjs`): `data.messages[c.id]||(c.preview==='新建客户档案'?[]:[{id:'seed'+c.id,side:'in',text:c.preview,…}])` — a customer without a list gets one made-up message *from the customer* holding the preview, i.e. the 初步需求 (only an empty 初步需求, whose preview is the placeholder 新建客户档案, gives an empty conversation). Worse, the WhatsApp module stores what that function gives the first time something is added (`(data.messages[c.id] ??= conversationMessages(c)).push(message)` when sending; the same when a message comes in or two records of one person are joined), so the made-up message is saved for good, ahead of the first real one.

The WhatsApp module already does the right thing for the customers it makes: `openwaNewCustomer` writes `data.customers.unshift(c); data.messages[c.id] = [];`. A customer made by hand is the only kind that is made without its list.

Shown in a browser (the reviewer's harness, 2026-11-26): a customer made by hand with a 初步需求 — the conversation showed one message from the customer holding the 初步需求, and after the first message was sent the conversation held that made-up message and the real one. With this plan's change the conversation is empty (还没有会话消息 / 输入消息，或选择快捷回复开始。) and afterwards holds only the real message. Live data was checked (counts only): neither workspace that has data holds such a made-up message, so nothing needs cleaning.

### Decisions already made (do not re-open; do not ask)

- The handler writes `data.messages[id] = [];` right after `data.customers.unshift(c);`, as `openwaNewCustomer` does, with a comment saying why.
- Nothing else changes: the form, the customer's fields (the preview keeps the 初步需求, so the chat list row still shows it until the first message; the notes and `qualification.demand` keep it too), `conversationMessages` in the build and every other module stay as they are.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity-lifecycle.js` | `6b140f59b5eb71783f4069be6c0db4e3bc13544b94843e9275474bcead9348df` | `611986aabd5802502e9524dab505028e71bdfe97c6604c4f874eeeacdf00c0cd` | 1 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `c7cd109484bda01456b438ad59ffcdc09968ba3c57f7eb315e3ed416a31e545f` | `381b2b4772047e857ebd5fcdc7ddac720b45b03ef0ab82bdbb22d6dd3f1fcb1c` | 2 |
| `replica/build-log.md` | `583fd32fd78fc576382e03ef2ecf64904a77f15ceb7cf9902a3b92f37ed48a17` | `9c5e4f6bd3a8257390969638c102a4f7c18fc576d0fa46f330457a4d9b580923` | 1 append |

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
| Restore icon pool (before **every** build) | `git checkout a9aa112 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (unchanged) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 20`, `fail 0` (unchanged) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-076/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-lifecycle.js` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.js`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — `build-fidelity.cjs` (`conversationMessages` is left as it is), `fidelity-openwa.js`, the base app, the other modules, the style sheets, the servers, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/076-hand-made-empty` first.
- One commit is fine. Conventional commit message, e.g. `fix(scrm): start a customer made by hand with an empty conversation`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, very long lines, quotes and backslashes; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 3 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the three files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-076/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-076 && cat > /tmp/wa-scrm-plan-076/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 076: a customer made by hand (新增客户) starts with an empty conversation. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'a customer made by hand gets an empty conversation' "$W/fidelity-lifecycle.js" '      data.messages[id] = [];'
has 'the comment says why' "$W/fidelity-lifecycle.js" '      // A customer made by hand starts with an empty conversation (plan 076)'
has 'the page is built with it' "$O/app.js" '      data.messages[id] = [];'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  handMadeEmpty: 'a customer made by hand"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 手动新增的客户不再显示一条“客户发来”的假消息：已修复 · 2026-11-26'
same 'of the built files only the page and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.js|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-076/smoke.sh && ls -l /tmp/wa-scrm-plan-076/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-lifecycle.js work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-076/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `a customer made by hand gets an empty conversation`, `the comment says why`, `the page is built with it`, `the validator knows it` and `the build log has the entry` (five checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: A customer made by hand starts with an empty conversation

#### `fidelity-lifecycle.js`

**Edit 2.1** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
      data.customers.unshift(c);
      lcLog(id, 'profile', '手动建档');
```

Replace them with:

```text
      data.customers.unshift(c);
      // A customer made by hand starts with an empty conversation (plan 076): the 初步需求 is the employee's note,
      // kept in the profile and the notes; without a list of its own, the conversation would show it as a message
      // from the customer, and the first message sent would save it so.
      data.messages[id] = [];
      lcLog(id, 'profile', '手动建档');
```

What this edit does, so that you can recognise it: in `'lc-new-customer-form'`, between `data.customers.unshift(c);` and `lcLog(id, 'profile', '手动建档');`, a three-line comment and `data.messages[id] = [];` are added.

**Verify**: `sha256sum work/wa-replica/fidelity-lifecycle.js` → `611986aabd5802502e9524dab505028e71bdfe97c6604c4f874eeeacdf00c0cd`. If the checksum does not match, restore the file (`git checkout -- <file>`) and apply the edit again, once; if it still does not match, STOP.

### Step 3: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// A reply whose outcome is open (结果待确认: the page was closed while it was on its way, or the answer was lost) is
```

Replace them with:

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// A customer made by hand (新增客户) starts with an empty conversation (plan 076): without a list of its own, the
// conversation showed the 初步需求 as a message from the customer, and the first message sent saved it so.
assert(moduleSource.includes("      data.customers.unshift(c);\n      // A customer made by hand starts with an empty conversation (plan 076)") && moduleSource.includes("      data.messages[id] = [];\n      lcLog(id, 'profile', '手动建档');\n") && appJs.includes("      data.messages[id] = [];\n      lcLog(id, 'profile', '手动建档');\n"), 'a customer made by hand must start with an empty conversation');
// A reply whose outcome is open (结果待确认: the page was closed while it was on its way, or the answer was lost) is
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  openOutcomeMatched: 'a reply whose outcome is open (结果待确认: the page was closed while it was on its way, or the answer was lost) is matched with its copy from the WhatsApp feed and shows once, with the copy\'s status; before, the copy showed as a second reply (or, for a customer known by phone number only, as a new customer)',
```

Replace them with:

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  handMadeEmpty: 'a customer made by hand (新增客户) starts with an empty conversation; the 初步需求 stays in the profile and the notes (before, the conversation showed it as a message from the customer, and the first message sent saved it so); the chat list still shows it as the row\'s preview until the first message',
  openOutcomeMatched: 'a reply whose outcome is open (结果待确认: the page was closed while it was on its way, or the answer was lost) is matched with its copy from the WhatsApp feed and shows once, with the copy\'s status; before, the copy showed as a second reply (or, for a customer known by phone number only, as a new customer)',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `381b2b4772047e857ebd5fcdc7ddac720b45b03ef0ab82bdbb22d6dd3f1fcb1c`; `git checkout a9aa112 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.js` and `validation.json` of `outputs/wa-replica-prototype/` only; `sha256sum outputs/wa-replica-prototype/app.js` → `9ad28e8bcfa3aacb5397f21b0a31eb8d0ffe5628901e33b499b9892aa2cb88e5`. If a checksum does not match, restore the file and apply its edits again, once; if it still does not match, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 手动新增的客户不再显示一条“客户发来”的假消息：已修复 · 2026-11-26

此前，在「客户列表」中点击「新增客户」并填写了「初步需求」，打开这位客户的会话时，「初步需求」的内容会显示成一条客户发来的消息；向客户发出第一条消息时，这条假消息还会被一起保存下来，从此留在聊天记录里。

现在手动新增的客户从空白会话开始，会话中显示「还没有会话消息」。「初步需求」仍保存在客户档案和备注中。会话列表中这一行的预览文字与以前一样，在第一条消息之前显示「初步需求」。

线上数据检查（只统计数量）：两个有数据的子站中都没有已保存的这类假消息，无需清理。

验证：构建与校验脚本通过；浏览器测试：手动新增一位填写了「初步需求」的客户，修改前会话中出现一条客户发来的假消息，发出第一条消息后被保存；修改后会话为空，发出第一条消息后会话中只有这条消息。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout a9aa112 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-076/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `9c5e4f6bd3a8257390969638c102a4f7c18fc576d0fa46f330457a4d9b580923`; `git status --porcelain` lists exactly these five as changed and nothing as new: the three files of the table in "Current state" and `outputs/wa-replica-prototype/app.js`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the refusal and the confirmed removal's filter, in the source and the built page.
- **Smoke** (`/tmp/wa-scrm-plan-076/smoke.sh`) — the same facts, three test files, which built files changed, the syntax of the built page.
- **Verified by the reviewer, not by you**: in a browser against the reviewer's harness — a customer made by hand with a 初步需求: the conversation opens empty, and after the first message it holds only that message (before this plan: one made-up message from the customer, saved with the first real one). The full site and WhatsApp suites.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout a9aa112 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 20`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-076/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.js` → `611986aabd5802502e9524dab505028e71bdfe97c6604c4f874eeeacdf00c0cd`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `381b2b4772047e857ebd5fcdc7ddac720b45b03ef0ab82bdbb22d6dd3f1fcb1c`
- [ ] `sha256sum replica/build-log.md` → `9c5e4f6bd3a8257390969638c102a4f7c18fc576d0fa46f330457a4d9b580923`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `9ad28e8bcfa3aacb5397f21b0a31eb8d0ffe5628901e33b499b9892aa2cb88e5`
- [ ] `git diff --name-only a9aa112..HEAD -- outputs` lists `app.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only a9aa112..HEAD -- . ':!plans'` lists exactly five paths: the three of the table in "Current state", `app.js` and `validation.json`
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
- Any new way of making a customer must give it its own list, `data.messages[id] = []`, as `openwaNewCustomer` and this handler do: `conversationMessages` still makes up a message for a customer without one.
- The chat list row of a customer made by hand still shows the 初步需求 as its preview until the first message (left as it is; not part of this plan).
- What a reviewer should scrutinise: that a customer made by hand with an empty 初步需求 behaves as before (empty conversation); that sending, a message coming in and the joining of two records work for a customer made by hand.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
