# Plan 074: The WhatsApp feed starts also when its first questions fail

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7634f93..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (the two first questions of the feed are asked in a loop like the feed loop below them; exact text and checksums for every file)
- **Depends on**: plans/073-linked-number-kept.md (DONE; it changed the validator and the build log that this plan edits after it); plans/072-stopped-page-stays.md (DONE; `window.WA_SITE.halted()`, used here)
- **Category**: bug fix (deep audit of 2026-11-25, finding CORR-06 in `plans/PROJECT-SPEC.md`; chosen by the owner)
- **Planned at**: commit `7634f93`, 2026-11-25

## Why this matters

When the app starts, the WhatsApp module (`fidelity-openwa.js`) runs `openwaListen()` once. It asks the server for the state of its WhatsApp link (`GET /api/wa/status`), then takes the feed for this page (`POST /api/wa/claim`), and then reads the feed in a loop. The loop already survives trouble: a failed answer is asked again after 2, 4, 8 … at most 30 seconds, and an ended session (401) stops the page with the notice 登录已失效. The two first questions do not: if the answer to the state is anything but 200, the function returns; if taking the feed fails, it draws the page once and returns. Nothing asks again, nothing tells the user, and the page receives no WhatsApp messages until it is reloaded.

That happens whenever the page is opened (or reopened by the browser) while the server is restarting — every upgrade restarts the workspace servers — or while the network drops for a moment. `openwaCall` returns status 0 when the request fails and the server's status code otherwise.

Shown in a browser (the reviewer's harness, 2026-11-25): with the first two answers to the state broken (no network), a message that came in afterwards never appeared, and the page never asked for the feed; with the first answer to taking the feed broken, the same; with the state answered 401, the page went on as if nothing had happened. With this plan's change the message appears a few seconds later in both cases, and the 401 shows 登录已失效.

### Decisions already made (do not re-open; do not ask)

- Both first questions are asked in a loop of the same form as the feed loop: `for (let failures = 0; ;) { … }`; on 200 the loop ends; otherwise `failures += 1` and `await openwaWait(Math.min(30000, 1000 * 2 ** failures))` (2, 4, 8 … at most 30 s), then ask again.
- Inside each loop, before waiting: a stopped page (`window.WA_SITE.halted()`, plan 072) ends the function; a 401 stops the page with the notice the feed loop uses: `window.WA_SITE.halt('登录已失效', '请刷新页面后重新登录。')`.
- Taking the feed draws the page once on its first failure, as it did before (`if (!failures) render();`) — not on every failure.
- Everything between and after the two loops stays as it is (the state is kept in `openwaServer`, a server without WhatsApp ends the function after drawing, messages still marked 发送中 become 结果待确认, the feed loop).

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity-openwa.js` | `3ef53c41b95d6f1a89fafc14c807aea6b6f0eba448f18213c068019db57b7fa3` | `7c5814d495413f71c4229fddaa6f2e45154998d65c39f04838c0bc396ddcdf89` | 2 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `81378b6ca32528c8f388273a6ef73aa02ea066e4016b3214092461911baddc8a` | `09f4c626723db7834d8218aa60a53425719fca0ab9bb37b7d96504db36149f62` | 2 |
| `replica/build-log.md` | `fc4a0a461bbc0d45a4ce7075c42282281a4fd08e5494ca549811ae0247b74829` | `490e24657c8a8277f573ec59836cbb86049f20e6042231991825d5feb466eeb4` | 1 append |

- `fidelity-openwa.js` — the WhatsApp module of the built page; `openwaListen()` (near the end of the file) asks the two first questions and then reads the feed in a loop for as long as the page is open; `openwaWait(ms)` is defined right above it.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly two output files differ: `app.js` and `validation.json` (written by the validator).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer** (the server's accounts and data use `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 7634f93 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (unchanged) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 20`, `fail 0` (unchanged) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-074/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-openwa.js` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.js`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — `fidelity-boot.js` (`halt` and `halted` are used as they are), the base app, the other modules, the style sheets, the servers, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/074-feed-starts-again` first.
- One commit is fine. Conventional commit message, e.g. `fix(scrm): start the WhatsApp feed also when its first questions fail`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, very long lines, quotes and backslashes; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 4 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the three files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-074/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-074 && cat > /tmp/wa-scrm-plan-074/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 074: the WhatsApp feed starts also when its first questions fail — they are asked again, more slowly each
# time, until they are answered. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'the server state is asked again until it is answered' "$W/fidelity-openwa.js" '      if (status.status === 200) break;'
has 'the feed for this page is asked again until it is answered' "$W/fidelity-openwa.js" '      if (claim.status === 200) break;'
has 'an ended session stops the page at the start' "$W/fidelity-openwa.js" "      if (claim.status === 401) return window.WA_SITE.halt('登录已失效', '请刷新页面后重新登录。');"
same 'no failed first question ends the feed' "$(grep -c 'if (status.status !== 200) return;' "$W/fidelity-openwa.js")" 0
has 'the page is built with it' "$O/app.js" '      if (claim.status === 200) break;'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  feedStartsAgain: 'the WhatsApp feed starts also"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 打开页面时连接失败，WhatsApp 新消息不再一直收不到：已修复 · 2026-11-25'
same 'of the built files only the page and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.js|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-074/smoke.sh && ls -l /tmp/wa-scrm-plan-074/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-074/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the server state is asked again until it is answered`, `the feed for this page is asked again until it is answered`, `an ended session stops the page at the start`, `no failed first question ends the feed` (got: 1), `the page is built with it`, `the validator knows it` and `the build log has the entry` (seven checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The first questions of the feed are asked again until they are answered

#### `fidelity-openwa.js`

**Edit 2.1** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
  // Reads the feed for as long as the page is open. Another page that opens the sub-site takes the feed over.
  async function openwaListen() {
    const status = await openwaCall('GET', 'status');
    if (status.status !== 200) return;
    openwaServer = { configured: Boolean(status.body.configured), reachable: Boolean(status.body.reachable) };
```

Replace them with:

```text
  // Reads the feed for as long as the page is open. Another page that opens the sub-site takes the feed over.
  // What is asked first — the server's state, then the feed for this page — is asked again, more slowly each time,
  // until it is answered (plan 074): a server that is restarting, or a moment without network, must not leave the
  // page without new messages until it is reloaded.
  async function openwaListen() {
    let status;
    for (let failures = 0; ;) {
      status = await openwaCall('GET', 'status');
      if (status.status === 200) break;
      if (window.WA_SITE.halted()) return;
      if (status.status === 401) return window.WA_SITE.halt('登录已失效', '请刷新页面后重新登录。');
      failures += 1;
      await openwaWait(Math.min(30000, 1000 * 2 ** failures));
    }
    openwaServer = { configured: Boolean(status.body.configured), reachable: Boolean(status.body.reachable) };
```

**Edit 2.2** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    if (changed) persist();
    if ((await openwaCall('POST', 'claim', { client: openwaClient })).status !== 200) return render();
    // First everything that happened while no page was open; then the numbers' states as the server sees them now.
```

Replace them with:

```text
    if (changed) persist();
    for (let failures = 0; ;) {
      const claim = await openwaCall('POST', 'claim', { client: openwaClient });
      if (claim.status === 200) break;
      if (window.WA_SITE.halted()) return;
      if (claim.status === 401) return window.WA_SITE.halt('登录已失效', '请刷新页面后重新登录。');
      if (!failures) render();
      failures += 1;
      await openwaWait(Math.min(30000, 1000 * 2 ** failures));
    }
    // First everything that happened while no page was open; then the numbers' states as the server sees them now.
```

What these edits do, so that you can recognise them: the single question for the server's state (`const status = await openwaCall('GET', 'status'); if (status.status !== 200) return;`) becomes a loop that asks until the answer is 200; the single question that takes the feed (`if ((await openwaCall('POST', 'claim', …)).status !== 200) return render();`) becomes a loop of the same form; the comment above `openwaListen` says why.

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js` → `7c5814d495413f71c4229fddaa6f2e45154998d65c39f04838c0bc396ddcdf89`. If the checksum does not match, restore the file (`git checkout -- <file>`) and apply the edit again, once; if it still does not match, STOP.

### Step 3: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// A number still linked to WhatsApp is not removed from the account list (plan 073): it goes on receiving, and every
```

Replace them with:

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// The WhatsApp feed starts also when its first questions fail (plan 074): the server's state and the feed for this page
// are asked again, more slowly each time, until they are answered; an ended session stops the page, as in the loop.
for (const required of ["      status = await openwaCall('GET', 'status');\n      if (status.status === 200) break;\n      if (window.WA_SITE.halted()) return;\n      if (status.status === 401) return window.WA_SITE.halt('登录已失效', '请刷新页面后重新登录。');\n      failures += 1;\n      await openwaWait(Math.min(30000, 1000 * 2 ** failures));\n", "      const claim = await openwaCall('POST', 'claim', { client: openwaClient });\n      if (claim.status === 200) break;\n      if (window.WA_SITE.halted()) return;\n      if (claim.status === 401) return window.WA_SITE.halt('登录已失效', '请刷新页面后重新登录。');\n      if (!failures) render();\n      failures += 1;\n      await openwaWait(Math.min(30000, 1000 * 2 ** failures));\n"]) {
  assert(openwaSource.includes(required) && appJs.includes(required), 'the WhatsApp feed must ask its first questions again until they are answered: ' + required.split('\n')[0].trim());
}
assert(!openwaSource.includes("    if (status.status !== 200) return;\n") && !openwaSource.includes(".status !== 200) return render();\n"), 'a failed first question must not end the WhatsApp feed for good');
// A number still linked to WhatsApp is not removed from the account list (plan 073): it goes on receiving, and every
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  linkedNumberKept: '移除账号 refuses a number that is still linked to WhatsApp (online or offline) and asks to unlink it first in 号码管理 (解除绑定); a removed number that was still linked went on receiving, and every message for it was dropped',
```

Replace them with:

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  feedStartsAgain: 'the WhatsApp feed starts also when its first questions fail (the server restarting, a moment without network): the server\'s state and the feed for this page are asked again after 2, 4, 8 … at most 30 s until they are answered; an ended session shows 登录已失效, as the feed loop does',
  linkedNumberKept: '移除账号 refuses a number that is still linked to WhatsApp (online or offline) and asks to unlink it first in 号码管理 (解除绑定); a removed number that was still linked went on receiving, and every message for it was dropped',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `09f4c626723db7834d8218aa60a53425719fca0ab9bb37b7d96504db36149f62`; `git checkout 7634f93 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.js` and `validation.json` of `outputs/wa-replica-prototype/` only; `sha256sum outputs/wa-replica-prototype/app.js` → `95779e8e24f26d6aaa996c99031499ae968ae3e4a4eb3c88d1ffa2c364949090`. If a checksum does not match, restore the file and apply its edits again, once; if it still does not match, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 打开页面时连接失败，WhatsApp 新消息不再一直收不到：已修复 · 2026-11-25

页面打开时会先向服务器询问 WhatsApp 连接的状态，再领取这个页面的新消息。此前，如果这两步中的任何一步失败（例如服务器正在重启升级，或网络恰好中断了一下），页面就再也不会接收 WhatsApp 新消息，而且没有任何提示，直到手动刷新页面。

现在这两步失败时，页面会自动重试，间隔逐渐拉长（2 秒、4 秒、8 秒……最长 30 秒），直到成功为止，之后照常接收新消息。如果失败的原因是登录已失效，页面会像接收消息时一样显示「登录已失效」的提示。

验证：构建与校验脚本通过；浏览器测试：让页面打开时的前两次询问失败，修改前之后发来的新消息一直不出现，修改后几秒钟内正常出现；登录失效时显示「登录已失效」。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout 7634f93 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-074/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `490e24657c8a8277f573ec59836cbb86049f20e6042231991825d5feb466eeb4`; `git status --porcelain` lists exactly these five as changed and nothing as new: the three files of the table in "Current state" and `outputs/wa-replica-prototype/app.js`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the refusal and the confirmed removal's filter, in the source and the built page.
- **Smoke** (`/tmp/wa-scrm-plan-074/smoke.sh`) — the same facts, three test files, which built files changed, the syntax of the built page.
- **Verified by the reviewer, not by you**: in a browser against the reviewer's harness — the first two answers to the state broken (no network): a message that comes in afterwards appears; the first answer to taking the feed broken: the same; the state answered 401: the notice 登录已失效 (before this plan: no message, no feed, no notice). The full site and WhatsApp suites.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 7634f93 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 20`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-074/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js` → `7c5814d495413f71c4229fddaa6f2e45154998d65c39f04838c0bc396ddcdf89`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `09f4c626723db7834d8218aa60a53425719fca0ab9bb37b7d96504db36149f62`
- [ ] `sha256sum replica/build-log.md` → `490e24657c8a8277f573ec59836cbb86049f20e6042231991825d5feb466eeb4`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `95779e8e24f26d6aaa996c99031499ae968ae3e4a4eb3c88d1ffa2c364949090`
- [ ] `git diff --name-only 7634f93..HEAD -- outputs` lists `app.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only 7634f93..HEAD -- . ':!plans'` lists exactly five paths: the three of the table in "Current state", `app.js` and `validation.json`
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
- Something that throws while the feed is applied still ends the loop (reported in the audit as part of CORR-06, not confirmed and not fixed here).
- What a reviewer should scrutinise: that a page whose first questions are answered at once starts exactly as before (no extra drawing, no waiting); that a stopped page asks nothing more.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
