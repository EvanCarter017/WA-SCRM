# Plan 072: A page stopped with a notice stays stopped

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 63a9e54..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (three short additions: the page can be asked whether it was stopped; drawing and the WhatsApp feed ask it; exact text and checksums for every file)
- **Depends on**: none (plans/067-save-guard.md, DONE, is where the 30-second save limit that can lead here came from)
- **Category**: bug fix (deep audit of 2026-11-25, finding CORR-01 in `plans/PROJECT-SPEC.md`; chosen by the owner)
- **Planned at**: commit `63a9e54`, 2026-11-25

## Why this matters

The page stops itself with a notice in three cases (`fidelity-boot.js`): a save is refused because the data changed elsewhere (409, notice "数据已在别处更新"), the session ended (401, "登录已失效"), or another page took the WhatsApp feed over ("已在其他页面打开", called by `fidelity-openwa.js` through `window.WA_SITE.halt`). `stop()` sets a private `stopped` flag, hides the app (`#app-shell`) and shows the notice screen (`#subsite-login`) with a 刷新页面 (reload) button; from then on `save()` returns at once without saving anything.

But every full drawing of the app starts with `renderSignInState()` (`fidelity-subsite.js`; the build puts `if(!renderSignInState())return;` at the top of `render()`), and that function always shows the app again and hides the notice screen. The WhatsApp feed loop (`openwaListen` in `fidelity-openwa.js`) keeps running after a stop caused by a save, and draws the app after every message it takes in; going back in the browser's history draws it too. So the next new message brings the app back, with no notice, looking normal — and every change made from then on is silently thrown away. The deep audit found this; it plausibly explains a page that stopped saving without any sign on 2026-11-25.

Shown in a browser (the reviewer's harness, 2026-11-25): signed in, the server's data made newer, a change saved → the notice "数据已在别处更新" appears; one WhatsApp message later the app is shown again and the notice is gone; going back one page leaves the app shown; the page asked the feed again after the stop. With this plan's change the notice stays after the message and after going back, and the page does not ask the feed again.

### Decisions already made (do not re-open; do not ask)

- `window.WA_SITE` gets `halted: () => stopped` (a function, like its other members), placed between `halt: stop` and `purge`.
- `renderSignInState()` returns `false` at once when `window.WA_SITE.halted()` is true; `render()` then draws nothing (the build's existing `if(!renderSignInState())return;` does that). The notice screen stays as `stop()` left it.
- The WhatsApp feed loop returns right after each answer of the feed when the page was stopped: nothing more is taken in, drawn or asked for. Messages stay on the server; a reloaded page reads on from the position that was saved (unchanged behaviour).
- Nothing else changes: the notice texts, the 刷新页面 button, the conditions under which the page stops, saving, and every other module stay as they are.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity-boot.js` | `50338a99cbac16d5fc52a2da686ca16e75561b97ba081d58634f9774df76035f` | `f41b3fd4f85dfa6f1bc268a2b55ffa4373dccdc73dc550550dc13e699250e8f9` | 1 |
| `work/wa-replica/fidelity-subsite.js` | `bbfc7e4a7498630aec321284fc056d3ccb2bd258e793f253781a34e802e8d2d0` | `fa4dfeb90c9a76c7e9d4297cb650c7626d38d4f85eaddf80e6f6899874bcde5d` | 1 |
| `work/wa-replica/fidelity-openwa.js` | `e8b7d77615e0522bf66dfd6c6f0a59b54d4c44fe9e6f9ec8d32dbbda4ed42af0` | `3ef53c41b95d6f1a89fafc14c807aea6b6f0eba448f18213c068019db57b7fa3` | 1 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `23c73ae55aa4eb9edd38cddefa1a9ed00bf9fca907850571ffb189ca9bad08d1` | `a8872faea7a217080630a730d2615c3ebc60c06a1ac059bf667b41274c76e7ca` | 3 |
| `replica/build-log.md` | `ff072bc99daa17ed6360dc15192c8ae88465479d7fb70823cb941ecc919081dd` | `41f688c519c5e390f1f5c4eeacd171522ec3990e86712a6d877d445da55bfbab` | 1 append |

- `fidelity-boot.js` — start-up and saving; built unchanged into `outputs/wa-replica-prototype/boot.js`. `start()` defines `stop()` and `window.WA_SITE`.
- `fidelity-subsite.js` — the last module of the built page; `renderSignInState()` runs at the start of every `render()`.
- `fidelity-openwa.js` — the WhatsApp module; `openwaListen()` reads the feed in a loop for as long as the page is open.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`; it already asserts the exact `window.WA_SITE = …` line, which this plan updates.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly three output files differ: `app.js`, `boot.js` and `validation.json` (written by the validator).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer** (the server's accounts and data use `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 63a9e54 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (unchanged) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 20`, `fail 0` (unchanged) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-072/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-boot.js`, `work/wa-replica/fidelity-subsite.js`, `work/wa-replica/fidelity-openwa.js` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.js`, `boot.js`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — `build-fidelity.cjs` (its `if(!renderSignInState())return;` is used as it is), the base app, the other modules, the style sheets, the servers, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/072-stopped-page-stays` first.
- One commit is fine. Conventional commit message, e.g. `fix(scrm): keep a stopped page stopped`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, template literals with `${…}`, backslashes and backticks; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 6 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the five files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-072/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-072 && cat > /tmp/wa-scrm-plan-072/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 072: a page stopped with a notice stays stopped — nothing draws the app behind the notice again and the
# WhatsApp feed is read no more. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'the page tells whether it was stopped' "$W/fidelity-boot.js" 'halt: stop, halted: () => stopped, purge };'
has 'drawing the app leaves a stopped page alone' "$W/fidelity-subsite.js" '    if (window.WA_SITE.halted()) return false;'
has 'a stopped page reads no more of the feed' "$W/fidelity-openwa.js" '      if (window.WA_SITE.halted()) return;'
has 'the page is built with the drawing rule' "$O/app.js" '    if (window.WA_SITE.halted()) return false;'
has 'the page is built with the feed rule' "$O/app.js" '      if (window.WA_SITE.halted()) return;'
has 'the built start-up has it' "$O/boot.js" 'halt: stop, halted: () => stopped, purge };'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  haltedStays: 'a page stopped with a notice"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 页面停下后不再悄悄恢复：已修复 · 2026-11-25'
same 'of the built files only the page, the start-up and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.js|boot\.js|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the built start-up passes the syntax check' "$(node --check "$O/boot.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-072/smoke.sh && ls -l /tmp/wa-scrm-plan-072/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-boot.js work/wa-replica/fidelity-subsite.js work/wa-replica/fidelity-openwa.js work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-072/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the page tells whether it was stopped`, `drawing the app leaves a stopped page alone`, `a stopped page reads no more of the feed`, `the page is built with the drawing rule`, `the page is built with the feed rule`, `the built start-up has it`, `the validator knows it` and `the build log has the entry` (eight checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: A stopped page stays stopped

#### `fidelity-boot.js`

**Edit 2.1** — `work/wa-replica/fidelity-boot.js`. Find exactly these lines (they occur once):

```text

    // halt stops this page with a notice; the app uses it when another page takes over the sub-site.
    window.WA_SITE = { user, site, data, save, idle, signOut, halt: stop, purge };
    $('#subsite-login').hidden = true;
```

Replace them with:

```text

    // halt stops this page with a notice; the app uses it when another page takes over the sub-site. halted tells
    // whether the page was stopped: from then on the app draws nothing behind the notice and reads no more of the
    // WhatsApp feed, since nothing done on a stopped page could be saved (plan 072).
    window.WA_SITE = { user, site, data, save, idle, signOut, halt: stop, halted: () => stopped, purge };
    $('#subsite-login').hidden = true;
```

#### `fidelity-subsite.js`

**Edit 2.2** — `work/wa-replica/fidelity-subsite.js`. Find exactly these lines (they occur once):

```text
  function renderSignInState() {
    $('#app-shell').hidden = false;
```

Replace them with:

```text
  function renderSignInState() {
    // A stopped page (the data changed elsewhere, the session ended, another page took over) keeps its notice:
    // drawing the app again would hide it, and nothing done there could be saved (plan 072).
    if (window.WA_SITE.halted()) return false;
    $('#app-shell').hidden = false;
```

#### `fidelity-openwa.js`

**Edit 2.3** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
      const answer = await openwaCall('GET', `events?after=${Number(data.waCursor) || 0}&client=${openwaClient}&wait=${caughtUp ? 25 : 0}`);
      if (answer.status === 409 && answer.body.error === 'taken-over') return window.WA_SITE.halt('已在其他页面打开', '这个子站刚刚在另一个页面或设备上打开，新消息改由那里接收。需要在本页继续时，请刷新页面。');
```

Replace them with:

```text
      const answer = await openwaCall('GET', `events?after=${Number(data.waCursor) || 0}&client=${openwaClient}&wait=${caughtUp ? 25 : 0}`);
      // A page that was stopped (fidelity-boot.js) reads no further: nothing it took in could be saved (plan 072).
      if (window.WA_SITE.halted()) return;
      if (answer.status === 409 && answer.body.error === 'taken-over') return window.WA_SITE.halt('已在其他页面打开', '这个子站刚刚在另一个页面或设备上打开，新消息改由那里接收。需要在本页继续时，请刷新页面。');
```

What these edits do, so that you can recognise them: `window.WA_SITE` gains `halted: () => stopped`; `renderSignInState()` begins with `if (window.WA_SITE.halted()) return false;`; in `openwaListen()` the line `if (window.WA_SITE.halted()) return;` follows the request for the feed. Each comes with a comment saying why.

**Verify**: `sha256sum work/wa-replica/fidelity-boot.js work/wa-replica/fidelity-subsite.js work/wa-replica/fidelity-openwa.js` → `f41b3fd4f85dfa6f1bc268a2b55ffa4373dccdc73dc550550dc13e699250e8f9`, `fa4dfeb90c9a76c7e9d4297cb650c7626d38d4f85eaddf80e6f6899874bcde5d`, `3ef53c41b95d6f1a89fafc14c807aea6b6f0eba448f18213c068019db57b7fa3`. If a checksum does not match, restore that file (`git checkout -- <file>`) and apply its edit again, once; if it still does not match, STOP.

### Step 3: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// A conversation at its end stays at its end when a translation redraws it (plan 071): the redraw scrolls there with
```

Replace them with:

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// A stopped page stays stopped (plan 072): drawing the app again would hide the notice while every later change is
// thrown away unsaved, so the drawing asks first whether the page was stopped, and the WhatsApp feed is read no more.
const subsiteSource = read(path.join(__dirname, 'fidelity-subsite.js'));
assert(subsiteSource.includes("  function renderSignInState() {\n    // A stopped page") && subsiteSource.includes("    if (window.WA_SITE.halted()) return false;\n    $('#app-shell').hidden = false;\n") && appJs.includes("    if (window.WA_SITE.halted()) return false;\n    $('#app-shell').hidden = false;\n"), 'drawing the app must leave the notice of a stopped page in place');
assert(openwaSource.includes("&wait=${caughtUp ? 25 : 0}`);\n      // A page that was stopped (fidelity-boot.js) reads no further") && openwaSource.includes('      if (window.WA_SITE.halted()) return;\n') && appJs.includes('      if (window.WA_SITE.halted()) return;\n'), 'a stopped page must read no more of the WhatsApp feed');
// A conversation at its end stays at its end when a translation redraws it (plan 071): the redraw scrolls there with
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(!/lcSimLeadOpen|lcSimReply|openSimLeadModal|lcSimulateCustomerReply|lc-sim-lead|模拟/.test(moduleSource), 'fidelity-lifecycle.js must not simulate leads or replies');
assert(bootSource.includes('window.WA_SITE = { user, site, data, save, idle, signOut, halt: stop, purge };'), 'fidelity-boot.js must let the app stop the page with a notice');
// A release does not speak of a demonstration, a prototype, a review or of saving on this machine (plan 032),
```

Replace them with:

```text
assert(!/lcSimLeadOpen|lcSimReply|openSimLeadModal|lcSimulateCustomerReply|lc-sim-lead|模拟/.test(moduleSource), 'fidelity-lifecycle.js must not simulate leads or replies');
assert(bootSource.includes('window.WA_SITE = { user, site, data, save, idle, signOut, halt: stop, halted: () => stopped, purge };'), 'fidelity-boot.js must let the app stop the page with a notice and ask whether it was stopped');
// A release does not speak of a demonstration, a prototype, a review or of saving on this machine (plan 032),
```

**Edit 3.3** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  endAfterTranslation: 'a conversation that shows its end keeps showing it when a translation redraws it, also when a picture takes its height a moment later (the redraw scrolls with the WhatsApp module\'s own noted step)',
```

Replace them with:

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  haltedStays: 'a page stopped with a notice (数据已在别处更新, 登录已失效, 已在其他页面打开) stays stopped: the app is not drawn behind the notice again and nothing more is taken in from the WhatsApp feed; 刷新页面 reloads the page, which reads the feed on from the saved position',
  endAfterTranslation: 'a conversation that shows its end keeps showing it when a translation redraws it, also when a picture takes its height a moment later (the redraw scrolls with the WhatsApp module\'s own noted step)',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `a8872faea7a217080630a730d2615c3ebc60c06a1ac059bf667b41274c76e7ca`; `git checkout 63a9e54 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.js`, `boot.js` and `validation.json` of `outputs/wa-replica-prototype/` only; `sha256sum outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/boot.js` → `dfe264e522eb2b7ca68d7225023983390abe581b423b9952bda5264bd585a075`, `f41b3fd4f85dfa6f1bc268a2b55ffa4373dccdc73dc550550dc13e699250e8f9`. If a checksum does not match, restore the file and apply its edits again, once; if it still does not match, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 页面停下后不再悄悄恢复：已修复 · 2026-11-25

页面在三种情况下会停下并显示提示：数据已在别处更新、登录已失效、子站已在其他页面打开。此前，停下之后只要页面再绘制一次（例如收到一条新的 WhatsApp 消息，或使用浏览器的后退/前进），工作台就会重新出现，看起来一切正常，但之后的所有修改都不会保存，也没有任何提示。

现在页面一旦停下，就一直停在提示上：工作台不会再被绘制出来，页面也不再读取 WhatsApp 新消息（停下的页面无法保存任何内容）。点击提示中的「刷新页面」即可重新载入并继续工作；新消息保存在服务器上，刷新后的页面会从已保存的位置继续读取。

验证：构建与校验脚本通过；浏览器测试：制造“数据已在别处更新”之后再收到一条新消息、再后退一页，修改前工作台会重新出现，修改后提示保持不变，页面也不再读取新消息。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout 63a9e54 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-072/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `41f688c519c5e390f1f5c4eeacd171522ec3990e86712a6d877d445da55bfbab`; `git status --porcelain` lists exactly these eight as changed and nothing as new: the five files of the table in "Current state" and `outputs/wa-replica-prototype/app.js`, `boot.js`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — `window.WA_SITE` has `halted`; `renderSignInState()` returns early on a stopped page, in the source and the built page; the feed loop returns on a stopped page, in the source and the built page.
- **Smoke** (`/tmp/wa-scrm-plan-072/smoke.sh`) — the same facts, the built start-up, three test files, which built files changed, the syntax of the built page and start-up.
- **Verified by the reviewer, not by you**: in a browser against the reviewer's harness — signed in, the server's data made newer, a change saved: the notice "数据已在别处更新" appears and stays after a WhatsApp message comes in and after going back one page; the page asks the feed no more after the stop (before this plan: the app came back with the message, and the page asked the feed again). The full site and WhatsApp suites.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 63a9e54 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 20`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-072/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-boot.js` → `f41b3fd4f85dfa6f1bc268a2b55ffa4373dccdc73dc550550dc13e699250e8f9`
- [ ] `sha256sum work/wa-replica/fidelity-subsite.js` → `fa4dfeb90c9a76c7e9d4297cb650c7626d38d4f85eaddf80e6f6899874bcde5d`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js` → `3ef53c41b95d6f1a89fafc14c807aea6b6f0eba448f18213c068019db57b7fa3`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `a8872faea7a217080630a730d2615c3ebc60c06a1ac059bf667b41274c76e7ca`
- [ ] `sha256sum replica/build-log.md` → `41f688c519c5e390f1f5c4eeacd171522ec3990e86712a6d877d445da55bfbab`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `dfe264e522eb2b7ca68d7225023983390abe581b423b9952bda5264bd585a075`
- [ ] `sha256sum outputs/wa-replica-prototype/boot.js` → `f41b3fd4f85dfa6f1bc268a2b55ffa4373dccdc73dc550550dc13e699250e8f9`
- [ ] `git diff --name-only 63a9e54..HEAD -- outputs` lists `app.js`, `boot.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only 63a9e54..HEAD -- . ':!plans'` lists exactly eight paths: the five of the table in "Current state", `app.js`, `boot.js` and `validation.json`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, or a test fails.
- An output file other than `app.js`, `boot.js` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file, creating a file or installing a package.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else. An open page keeps the old behaviour until it is opened again.
- Anything new that shows the app again, or that keeps working in the background (a loop, a timer), must ask `window.WA_SITE.halted()` first: a stopped page saves nothing.
- Related findings not fixed here (see `plans/PROJECT-SPEC.md` §11): a save whose answer was lost is retried with the old version and then meets a false conflict (CORR-03) — with this plan that ends on the notice instead of in silent loss.
- What a reviewer should scrutinise: that a page that was not stopped draws exactly as before (`halted()` is false); that the supervisor page, which never starts the app, is untouched.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
