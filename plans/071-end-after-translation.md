# Plan 071: A conversation at its end stays there when a translation redraws it

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ec07fcd..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (one line: the redraw by a translation scrolls to the end with the WhatsApp module's own step; exact text and checksums for every file)
- **Depends on**: plans/066-sent-translated-back.md (DONE; this fixes a race it made visible), plans/070-no-permissions-note.md (DONE)
- **Category**: bug fix (a regression of plan 066, found in review)
- **Planned at**: commit `ec07fcd`, 2026-11-25

## Why this matters

Since plan 066 a reply or caption that was put into the customer's language is translated back after it is sent; when the translation arrives, `aiRedraw` (`fidelity-ai.js`) draws the conversation anew and, if it was at its end, scrolls there with the base app's `scrollMessages()` — one frame later, and without noting it. The WhatsApp module (`fidelity-openwa.js`) keeps a conversation at its end while pictures load: it notes where the page itself put the conversation (`openwaNoteEnd`, `openwaEndTop`) so that the later scroll event of that move is not taken for someone scrolling away, and a picture that loads in a conversation noted as at its end scrolls it to the end again (`openwaShowEnd`).

The review of plan 070 caught the WhatsApp suite's file test timing out, now and then, at "the conversation to show its end after the file with a translated caption". A recorded failure (2026-11-25) shows the order: the conversation at its end (scrollTop 97 of 451); the translation arrives and the conversation is drawn anew; `scrollMessages` sets scrollTop 164 — the end while the new picture element has no height yet (518); the picture takes its 80 px (598); the scroll event of that move comes, does not match the noted position (97), and is read as someone scrolling away (80 px from the end > 40) — so when the picture's load event comes, the conversation is no longer noted as at its end and stays 80 px short, for good. Sent from the page, a picture with a translated caption could end the conversation short of its end this way. A debug build that showed the WhatsApp module's note (never committed) confirmed it: the note said "at its end, at 97" until the scroll event of `scrollMessages`'s move to 164 came after the picture had its height and turned it to "not at its end" — the picture's load event then left the conversation where it was.

### Decisions already made (do not re-open; do not ask)

- In `aiRedraw` the conversation at its end is scrolled there with `openwaShowEnd()` (it scrolls at once and notes the move) instead of `scrollMessages()`. `openwaShowEnd` is defined in `fidelity-openwa.js`, which comes before `fidelity-ai.js` in the built page; `aiRedraw` already uses that module (`openwaKeepPlaying`).
- A conversation that is not at its end keeps what is being read where it is, as before. Nothing else changes.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity-ai.js` | `20ca788021e78b11bd5bd95e97350550ef1bd444e502809d6bed7ebbb3d15bd3` | `656670b61d4f4ea3a888a4419e5cd94b240251b72e8a8d895835507a372c124e` | 1 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `be8b304ad94e2cf040ee763da3807ba884b6ad82fd28ed9262bcf805c83baeff` | `23c73ae55aa4eb9edd38cddefa1a9ed00bf9fca907850571ffb189ca9bad08d1` | 2 |
| `replica/build-log.md` | `785d7f93c95132538de1ff6ddff2cfb6252ee20b3f6d9002a6e64f5b4e89b9ac` | `ff072bc99daa17ed6360dc15192c8ae88465479d7fb70823cb941ecc919081dd` | 1 append |

- `fidelity-ai.js` — the page's AI module; `aiRedraw(c)` draws the open conversation anew when a translation or the words of a voice note arrive.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly two output files differ: `app.js` and `validation.json` (written by the validator).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer** (the server's accounts and data use `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout ec07fcd -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 17`, `fail 0` (unchanged) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 20`, `fail 0` (unchanged) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-071/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-ai.js` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.js`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — `fidelity-openwa.js` (`openwaShowEnd` is used as it is), the base app, the other modules, the style sheets, the servers, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/071-end-after-translation` first.
- One commit is fine. Conventional commit message, e.g. `fix(scrm): keep a conversation at its end when a translation redraws it`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese, Japanese, Korean, Cyrillic and Arabic text, regular expressions with backslashes, and backticks; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 3 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the five files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-071/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-071 && cat > /tmp/wa-scrm-plan-071/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 071: a redraw by a translation keeps a conversation at its end the way the WhatsApp module does. NODE
# must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'the redraw keeps the end the way the WhatsApp module does' "$W/fidelity-ai.js" '    if (atBottom) openwaShowEnd();'
same 'no plain scroll left in the redraw' "$(grep -c 'if (atBottom) scrollMessages();' "$W/fidelity-ai.js")" 0
has 'the page is built with it' "$O/app.js" '    if (atBottom) openwaShowEnd();'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  endAfterTranslation: 'a conversation that shows its end"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 发送带译文说明的图片后，会话偶尔停在离底部不远处：已修复 · 2026-11-25'
same 'of the built files only the page and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.js|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-071/smoke.sh && ls -l /tmp/wa-scrm-plan-071/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-ai.js work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-071/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the redraw keeps the end the way the WhatsApp module does`, `no plain scroll left in the redraw` (got: 1), `the page is built with it`, `the validator knows it` and `the build log has the entry` (five checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The redraw by a translation keeps the end the way the WhatsApp module does

#### `fidelity-ai.js`

**Edit 2.1** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
    paintIcons(box);
    // At its end the conversation stays at its end; further up, what is being read stays where it is while
    // translations come in above it.
    if (atBottom) scrollMessages();
    else box.scrollTop = box.scrollHeight - fromEnd;
```

Replace them with:

```text
    paintIcons(box);
    // At its end the conversation stays at its end: scrolled there now and noted as the page's own move (plan 071),
    // so that a picture that takes its height a moment later keeps it there instead of reading as someone scrolling
    // away. Further up, what is being read stays where it is while translations come in above it.
    if (atBottom) openwaShowEnd();
    else box.scrollTop = box.scrollHeight - fromEnd;
```

What this edit does, so that you can recognise it: in `aiRedraw` the line `if (atBottom) scrollMessages();` becomes `if (atBottom) openwaShowEnd();`, with the comment above it saying why.

**Verify**: `sha256sum work/wa-replica/fidelity-ai.js` → `656670b61d4f4ea3a888a4419e5cd94b240251b72e8a8d895835507a372c124e`; `grep -c 'if (atBottom) scrollMessages();' work/wa-replica/fidelity-ai.js` → `0`. If the checksum does not match, restore the file (`git checkout -- <file>`) and apply the edit again, once; if it still does not match, STOP.

### Step 3: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// The chat's tool rail has no permissions note any more (plan 070): neither the shield button "权限说明" nor its
```

Replace them with:

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// A conversation at its end stays at its end when a translation redraws it (plan 071): the redraw scrolls there with
// the WhatsApp module's own step, which notes the move, so that a picture taking its height a moment later keeps it
// there instead of reading as someone scrolling away.
assert(aiSource.includes('    if (atBottom) openwaShowEnd();\n') && appJs.includes('    if (atBottom) openwaShowEnd();\n') && !aiSource.includes('if (atBottom) scrollMessages();'), 'a redraw by a translation must keep the end in view the way the WhatsApp module does');
// The chat's tool rail has no permissions note any more (plan 070): neither the shield button "权限说明" nor its
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  noPermissionsNote: 'the chat\'s tool rail ends with 刷新视图; the shield button 权限说明 and its dialog 会话权限 are gone (the rules of who sees what are unchanged)',
```

Replace them with:

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  endAfterTranslation: 'a conversation that shows its end keeps showing it when a translation redraws it, also when a picture takes its height a moment later (the redraw scrolls with the WhatsApp module\'s own noted step)',
  noPermissionsNote: 'the chat\'s tool rail ends with 刷新视图; the shield button 权限说明 and its dialog 会话权限 are gone (the rules of who sees what are unchanged)',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `23c73ae55aa4eb9edd38cddefa1a9ed00bf9fca907850571ffb189ca9bad08d1`; `git checkout ec07fcd -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.js` and `validation.json` of `outputs/wa-replica-prototype/` only; `sha256sum outputs/wa-replica-prototype/app.js` → `0233041d5b17ba062e53934de2d55dad437b86ca42376a2d7ab2022585d40cd7`. If a checksum does not match, restore the file and apply its edits again, once; if it still does not match, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 发送带译文说明的图片后，会话偶尔停在离底部不远处：已修复 · 2026-11-25

自从发出的消息会在下方显示回译（2026-11-25 的「回译」改动）以来，发送一张说明经过翻译的图片后，会话偶尔停在离最底部约一行的位置，最新的一行在可见区域下方，需要手动往下滚。原因：回译到达时会重新绘制会话并滚到底部，但这一步没有被记下为页面自己的滚动；如果图片恰好在这之后才占满它的高度，页面就误以为是用户往上滚了，于是不再跟随到底部。

现在回译重新绘制会话时，用和 WhatsApp 部分相同的方式滚到底部并记下这一步，图片随后占满高度时会话仍然停在最底部。会话不在底部时（正在往上看旧消息），位置保持不变，与以前一样。

验证：构建与校验脚本通过；浏览器测试：发送带译文说明的图片这一测试在修改前偶尔失败（约每 5 次 1 次），修改后连续多次全部通过；记录到的滚动过程与上述原因一致。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout ec07fcd -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-071/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `ff072bc99daa17ed6360dc15192c8ae88465479d7fb70823cb941ecc919081dd`; `git status --porcelain` lists exactly these five as changed and nothing as new: the three files of the table in "Current state" and `outputs/wa-replica-prototype/app.js`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — `aiRedraw` keeps the end with `openwaShowEnd()`, in the source and the built page; no `scrollMessages()` left there.
- **Smoke** (`/tmp/wa-scrm-plan-071/smoke.sh`) — the same facts, all three test files, which built files changed, the syntax of the built page.
- **Verified by the reviewer, not by you**: the WhatsApp suite's file test, instrumented with a timeline of scrolls, redraws and picture loads, many times in a row — before this plan 4 of 28 runs ended short of the end; with it, 1 of 44 (a rarer case whose cause the timeline did not show; the debug build with this plan's change passed 30 of 30); the full site and WhatsApp suites.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout ec07fcd -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 17`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 20`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-071/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-ai.js` → `656670b61d4f4ea3a888a4419e5cd94b240251b72e8a8d895835507a372c124e`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `23c73ae55aa4eb9edd38cddefa1a9ed00bf9fca907850571ffb189ca9bad08d1`
- [ ] `sha256sum replica/build-log.md` → `ff072bc99daa17ed6360dc15192c8ae88465479d7fb70823cb941ecc919081dd`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `0233041d5b17ba062e53934de2d55dad437b86ca42376a2d7ab2022585d40cd7`
- [ ] `git diff --name-only ec07fcd..HEAD -- outputs` lists `app.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only ec07fcd..HEAD -- . ':!plans'` lists exactly five paths: the three of the table in "Current state", `app.js` and `validation.json`
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
- Anything else that draws the conversation anew and scrolls it to its end should use `openwaShowEnd()` too, so that the WhatsApp module's note of the end stays true.
- What a reviewer should scrutinise: that a conversation further up still keeps its place when a translation comes in; that `openwaShowEnd` exists wherever `aiRedraw` runs (the built page holds both modules).
- Known: in 1 of 44 runs with this change the conversation still ended short of its end after a picture with a translated caption, for a reason the recorded timeline did not show; a later look should record the WhatsApp module's note (`openwaAtEnd`, `openwaEndTop`) in that case.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
