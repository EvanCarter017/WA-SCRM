# Plan 091: The QR dialog asks every ten seconds and for three minutes at most, then offers 刷新二维码

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat d2be337..HEAD -- work/wa-replica/fidelity-openwa.js work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (the timing of one dialog; the server, the feed and the rest of the page are not touched; exact text and checksums for every file)
- **Depends on**: plans/027-fresh-qr-code.md and plans/026-page-real-whatsapp.md (DONE; they made the dialog and its expiry this plan changes)
- **Category**: bug found live 2026-11-27 and owner decision ("Like WhatsApp Web (Recommended)")
- **Planned at**: commit `d2be337`, 2026-11-27

## Why this matters

To link a number, an employee opens 号码管理 and presses 扫码绑定 (`openwaBeginPairing` in `work/wa-replica/fidelity-openwa.js`). The dialog shows the QR code of the employee's own OpenWA (the WhatsApp gateway) and keeps it current: `openwaPoll` asks the server `GET /api/wa/link?account=…` every 2 seconds (plus the time of the answer), and for each question the server asks OpenWA twice — the session's state and the current code. WhatsApp renews a code about every 20 seconds, in rounds, for as long as nobody scans; the dialog stops asking only when a code has not changed for 90 seconds (`openwaQrLife`), which therefore never happens while WhatsApp keeps renewing.

What happened live on 2026-11-27: an employee left the dialog open from 13:26 to 14:18. OpenWA answers at most 1000 questions of one kind an hour (its `api.rateLimit.longLimit`); at 14:18 the 1000th question about the session came, and OpenWA answered `429 Too Many Requests` for the next hour (`retry-after` until 15:18). The page showed no code; every 扫码绑定 failed with `gateway-failed`.

The owner was asked how the dialog should behave and chose "Like WhatsApp Web (Recommended)": the code renews by itself, but the page asks every 10 seconds and stops after 3 minutes, then shows a refresh button; a scan that went through is noticed by itself either way.

Shown in the reviewer's harness with this plan's change: 5 questions in the first minute of a waiting code (before: about 20–30); the code still shown after 170 s while WhatsApp kept renewing it; after 185 s "二维码已过期，请点击「刷新二维码」获取新的二维码。" with the button 刷新二维码; no question after that; a scan arriving after the stop still finished the dialog (绑定成功); 18 questions for the whole dialog.

### Decisions already made (do not re-open; do not ask)

- While the dialog's phase is `scan` (a code is shown) it asks every `OPENWA_SCAN_POLL_MS = 10000` ms; in every other phase it keeps asking (`starting` — the code is being prepared —, `verifying` — a scan is being checked) every `OPENWA_BUSY_POLL_MS = 2000` ms, so that the first code and the result of a scan show at once. One helper, `openwaNextPoll(pair)`, schedules the next question; `openwaRequestLink` and `openwaPoll` both use it.
- `pair.scanSince` is the time the first code of this dialog was shown (set in `openwaPairStep`); `openwaPoll` ends the asking when `Date.now() - pair.scanSince > OPENWA_SCAN_LIMIT_MS` (180000 ms) or, as before, when the code has not changed for `openwaQrLife` (90 s): the phase becomes `error` with `expired: true` and the notice "二维码已过期，请点击「刷新二维码」获取新的二维码。".
- The button of an expired code reads 刷新二维码 (other errors keep 重试); it is the same action `openwaRetry`, which now also resets `scanSince` (another three minutes) and, as before, asks the server for a new code (`fresh: true`).
- A scan that went through is told to the page by the feed (`kind: 'state', state: 'online'` for the account being linked); the dialog now looks at once whenever that comes — also after it has stopped asking (before, only while a question was scheduled).
- Not changed: the server (`openwa-link.cjs`), OpenWA, the 90-second rule, the dialog's texts other than the notice and the button, closing the dialog (`openwaAbandon`).

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity-openwa.js` | `72588afc9ce0ceee61fc57e9c10d215f9a6c4eae89888f253efc67f8430529c5` | `b5b85d1207af815de3dd8eefa35ecc51cefd638df18afe57f2ad0b241f2ddd75` | 7 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `a1d3061203ec6e69eaf1833ef75f89e6957d9083ace2ebde0e07723b9965ccbe` | `d3e0e50e918a9c6ec1f4a4cd9e612e2373e481edc6fbdaab9569a0946a808d3d` | 2 |
| `replica/build-log.md` | `c3e9803d25fad80e1dec47a464243b925d05a6c0901fe93dcbd293e4364f3f20` | `057a9cdbd85951d606a3652b3d246eac7dc18a67dbb2b8c416737669d1872124` | 1 append |

- `fidelity-openwa.js` — the WhatsApp module of the built page: the pairing dialog (`openwaShowPairing`, `openwaPairStep`, `openwaRequestLink`, `openwaPoll`, `openwaBeginPairing`), the feed (`openwaApply` — the part that holds events for the number being linked), and the actions (`openwaRetry` in `Object.assign(fidActions, { … })`).
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly two output files differ: `app.js` (the module is part of it) and `validation.json` (written by the validator).

## Commands you will need

Run from the repository root.

**The tests and the smoke script need Node 22.13 or newer** (`node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout d2be337 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| All tests | `$NODE --test` (from the repository root) | `tests 91`, `pass 91`, `fail 0` (unchanged) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-091/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-openwa.js` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.js`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — the server (`openwa-link.cjs`, `serve.cjs`), the other modules and style sheets, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch you are given. If (and only if) you find yourself on `main`, create and switch to `advisor/091-qr-polling` first.
- One commit is fine. Conventional commit message, e.g. `fix(scrm): ask for the QR code every ten seconds and for three minutes at most`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy the text exactly, including spaces, quotes, backticks and Chinese punctuation. Apply the edits of a file in the order given.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-091/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-091 && cat > /tmp/wa-scrm-plan-091/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 091: the QR dialog asks for the current code every ten seconds while a code waits to be scanned, for
# three minutes at most, then offers 刷新二维码; a scan that went through is told by the feed. NODE must be Node 22.13 or
# newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'the dialog has its three times' "$W/fidelity-openwa.js" '  const OPENWA_SCAN_POLL_MS = 10000, OPENWA_BUSY_POLL_MS = 2000, OPENWA_SCAN_LIMIT_MS = 180000;'
has 'the next question waits ten seconds while a code waits' "$W/fidelity-openwa.js" "    pair.timer = setTimeout(() => openwaPoll(pair), pair.phase === 'scan' ? OPENWA_SCAN_POLL_MS : OPENWA_BUSY_POLL_MS);"
same 'nothing asks every two seconds any more' "$(grep -c 'setTimeout(() => openwaPoll(pair), 2000)' "$W/fidelity-openwa.js")" 0
has 'three minutes of waiting end the asking' "$W/fidelity-openwa.js" 'Date.now() - pair.scanSince > OPENWA_SCAN_LIMIT_MS'
has 'the time of the first code is kept' "$W/fidelity-openwa.js" "    if (phase === 'scan' && !pair.scanSince) pair.scanSince = Date.now();"
has 'an expired code offers 刷新二维码' "$W/fidelity-openwa.js" "fidButton(pair.expired ? '刷新二维码' : '重试','openwaRetry','RefreshCw','blue')"
has 'the notice names the button' "$W/fidelity-openwa.js" "error: '二维码已过期，请点击「刷新二维码」获取新的二维码。', expired: true"
has 'a new code starts a new three minutes' "$W/fidelity-openwa.js" "      Object.assign(pair, { phase: 'starting', qr: '', error: '', scanSince: 0 });"
has 'a scan that went through is told by the feed whenever it comes' "$W/fidelity-openwa.js" "      if (e.kind === 'state' && e.state === 'online') {"
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  qrPolling: 'the QR dialog (plan 091):"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 扫码绑定时二维码对话框不再频繁询问服务器 · 2026-11-27'
has 'the page is built with it' "$O/app.js" 'const OPENWA_SCAN_POLL_MS = 10000, OPENWA_BUSY_POLL_MS = 2000, OPENWA_SCAN_LIMIT_MS = 180000;'
same 'of the built files only the page and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.js|validation\.json)$')" 0
same 'the built page passes the syntax check' "$("$NODE" --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the price file pass' "$("$NODE" --test "$W/price-file.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the provisioner pass' "$("$NODE" --test "$W/site-provisioner.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-091/smoke.sh && ls -l /tmp/wa-scrm-plan-091/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-091/smoke.sh` → exactly these 12 checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the dialog has its three times`, `the next question waits ten seconds while a code waits`, `nothing asks every two seconds any more`, `three minutes of waiting end the asking`, `the time of the first code is kept`, `an expired code offers 刷新二维码`, `the notice names the button`, `a new code starts a new three minutes`, `a scan that went through is told by the feed whenever it comes`, `the validator knows it`, `the build log has the entry`, `the page is built with it`; every other check is printed with `ok`; `git status --porcelain` prints nothing.

### Step 2: The QR dialog asks less often

#### `work/wa-replica/fidelity-openwa.js`

**Edit 2.1** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
  const openwaQrLife = 90000;

```

Replace them with:

```text
  const openwaQrLife = 90000;
  // While a code waits to be scanned the dialog asks for the current one every ten seconds — WhatsApp renews it about
  // every twenty — and for three minutes at most; then it says the code has expired and offers a new one, as
  // WhatsApp Web does (plan 091). While the code is being prepared or checked it asks every two seconds. A scan
  // that went through is told by the feed at once in either case.
  const OPENWA_SCAN_POLL_MS = 10000, OPENWA_BUSY_POLL_MS = 2000, OPENWA_SCAN_LIMIT_MS = 180000;

```

**Edit 2.2** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
      <p class="openwa-pair-hint">二维码会自动更换；扫码没有成功时，请等新的二维码出现后再扫。绑定后，这个号码的新消息会显示在在线聊天里。</p>
    </div>`, fidButton('取消','close')+(pair.phase === 'error' ? fidButton('重试','openwaRetry','RefreshCw','blue') : ''),
      pair.phase === 'error' ? '[data-action="openwaRetry"]' : '.openwa-pair-state');
```

Replace them with:

```text
      <p class="openwa-pair-hint">二维码会自动更换；扫码没有成功时，请等新的二维码出现后再扫。绑定后，这个号码的新消息会显示在在线聊天里。</p>
    </div>`, fidButton('取消','close')+(pair.phase === 'error' ? fidButton(pair.expired ? '刷新二维码' : '重试','openwaRetry','RefreshCw','blue') : ''),
      pair.phase === 'error' ? '[data-action="openwaRetry"]' : '.openwa-pair-state');
```

**Edit 2.3** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    const qr = phase === 'scan' ? link.qr || '' : '';
    if (phase === pair.phase && qr === pair.qr && error === pair.error) return;
```

Replace them with:

```text
    const qr = phase === 'scan' ? link.qr || '' : '';
    if (phase === 'scan' && !pair.scanSince) pair.scanSince = Date.now();
    if (phase === pair.phase && qr === pair.qr && error === pair.error) return;
```

**Edit 2.4** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    }
    if (openwaPairing === pair && pair.phase !== 'error') pair.timer = setTimeout(() => openwaPoll(pair), 2000);
  }
```

Replace them with:

```text
    }
    if (openwaPairing === pair && pair.phase !== 'error') openwaNextPoll(pair);
  }

  function openwaNextPoll(pair) {
    pair.timer = setTimeout(() => openwaPoll(pair), pair.phase === 'scan' ? OPENWA_SCAN_POLL_MS : OPENWA_BUSY_POLL_MS);
  }
```

**Edit 2.5** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    if (openwaPairing !== pair) return;
    if (pair.phase === 'scan' && Date.now() - pair.qrAt > openwaQrLife) {
      // The code is no longer renewed. "重试" asks the server for a new one.
      Object.assign(pair, { phase: 'error', qr: '', error: '二维码已过期，请点击「重试」获取新的二维码。', expired: true });
      return openwaShowPairing();
    }
    if (pair.phase !== 'error') pair.timer = setTimeout(() => openwaPoll(pair), 2000);
  }
```

Replace them with:

```text
    if (openwaPairing !== pair) return;
    if (pair.phase === 'scan' && (Date.now() - pair.qrAt > openwaQrLife || Date.now() - pair.scanSince > OPENWA_SCAN_LIMIT_MS)) {
      // The code is no longer renewed, or three minutes have passed: the dialog stops asking. "刷新二维码" asks the
      // server for a new one.
      Object.assign(pair, { phase: 'error', qr: '', error: '二维码已过期，请点击「刷新二维码」获取新的二维码。', expired: true });
      return openwaShowPairing();
    }
    if (pair.phase !== 'error') openwaNextPoll(pair);
  }
```

**Edit 2.6** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
      pair.held.push(e);
      if (e.kind === 'state' && e.state === 'online' && pair.timer) {
        clearTimeout(pair.timer);
```

Replace them with:

```text
      pair.held.push(e);
      if (e.kind === 'state' && e.state === 'online') {
        clearTimeout(pair.timer);
```

**Edit 2.7** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
      if (pair?.phase !== 'error') return;
      Object.assign(pair, { phase: 'starting', qr: '', error: '' });
      openwaShowPairing();
```

Replace them with:

```text
      if (pair?.phase !== 'error') return;
      Object.assign(pair, { phase: 'starting', qr: '', error: '', scanSince: 0 });
      openwaShowPairing();
```

What these edits do, so that you can recognise them: the three times under `openwaQrLife`; the button of an expired code; `scanSince` in `openwaPairStep`; `openwaNextPoll` after `openwaRequestLink` and its use there and in `openwaPoll`; the end after three minutes in `openwaPoll`; the feed's look at a scan that went through; `scanSince: 0` in `openwaRetry`.

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js` → `b5b85d1207af815de3dd8eefa35ecc51cefd638df18afe57f2ad0b241f2ddd75`. If the checksum does not match, restore the file (`git checkout -- <file>`) and apply the edits again, once; if it still does not match, STOP.

### Step 3: The validator — and the build

#### `work/wa-replica/validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert.equal(Math.round(keptColumns.reduce((sum, m) => sum + Number(m[2]), 0) * 10) / 10, 100, 'the customer list\'s columns must add up to 100%');
const summary = {
```

Replace them with:

```text
assert.equal(Math.round(keptColumns.reduce((sum, m) => sum + Number(m[2]), 0) * 10) / 10, 100, 'the customer list\'s columns must add up to 100%');
// The QR dialog (plan 091): while a code waits to be scanned it asks every ten seconds and for three minutes at most,
// then offers 刷新二维码; a scan that went through is told by the feed whenever it comes.
for (const required of ['const OPENWA_SCAN_POLL_MS = 10000, OPENWA_BUSY_POLL_MS = 2000, OPENWA_SCAN_LIMIT_MS = 180000;', "pair.timer = setTimeout(() => openwaPoll(pair), pair.phase === 'scan' ? OPENWA_SCAN_POLL_MS : OPENWA_BUSY_POLL_MS);", 'Date.now() - pair.scanSince > OPENWA_SCAN_LIMIT_MS', "fidButton(pair.expired ? '刷新二维码' : '重试','openwaRetry'", "if (e.kind === 'state' && e.state === 'online') {"]) {
  assert(appJs.includes(required), `the QR dialog must ask the server less often (plan 091): ${required}`);
}
assert(!appJs.includes('setTimeout(() => openwaPoll(pair), 2000)'), 'the QR dialog must not ask every two seconds while a code waits to be scanned');
const summary = {
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  personaManual: 'the persona of the customer profile (画像与跟进) holds only what a person entered with 保存画像: 意向等级 starts on 请选择, the other fields empty; a customer from WhatsApp or made with 新增客户 gets nothing filled in (the 初步需求 stays in the notes); 广告素材 / 证据 shows — when nothing is recorded; what the page filled in before was cleared once (data.personaManual), except where a person had saved the persona',
  uiUpgradeWithdrawn: 'the UI upgrade of plans 081–087 (font, colours, chat-page layout, tables, dialogs, supervisor page) is withdrawn at the owner\'s request; kept: a dialog\'s footer stays in view while a long dialog scrolls, and the customer list\'s thirteen columns add up to 100%',
```

Replace them with:

```text
  personaManual: 'the persona of the customer profile (画像与跟进) holds only what a person entered with 保存画像: 意向等级 starts on 请选择, the other fields empty; a customer from WhatsApp or made with 新增客户 gets nothing filled in (the 初步需求 stays in the notes); 广告素材 / 证据 shows — when nothing is recorded; what the page filled in before was cleared once (data.personaManual), except where a person had saved the persona',
  qrPolling: 'the QR dialog (plan 091): while a code waits to be scanned it asks the server every 10 s (every 2 s while the code is prepared or checked), for at most 3 minutes; then it says the code expired and offers 刷新二维码; a scan that went through is told by the feed at once — a dialog left open no longer uses up OpenWA\'s limit of 1000 questions an hour',
  uiUpgradeWithdrawn: 'the UI upgrade of plans 081–087 (font, colours, chat-page layout, tables, dialogs, supervisor page) is withdrawn at the owner\'s request; kept: a dialog\'s footer stays in view while a long dialog scrolls, and the customer list\'s thirteen columns add up to 100%',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `d3e0e50e918a9c6ec1f4a4cd9e612e2373e481edc6fbdaab9569a0946a808d3d`; `git checkout d2be337 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` → exactly `app.js` and `validation.json`.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 扫码绑定时二维码对话框不再频繁询问服务器 · 2026-11-27

扫码绑定的对话框以前每 2 秒向服务器询问一次最新的二维码。对话框开着的时间一长（约 50 分钟），OpenWA 每小时 1000 次询问的上限就会用完，之后一小时内这个号码无法显示二维码。现在：

- 等待扫码时每 10 秒询问一次（WhatsApp 大约每 20 秒更换一次二维码）；准备二维码和验证扫码时仍每 2 秒询问一次。
- 最多自动更换 3 分钟，之后显示「二维码已过期」，点击「刷新二维码」获取新的二维码，与 WhatsApp 网页版相同。
- 扫码成功会立即显示，即使对话框已经停止询问。

验证：构建与校验脚本通过；浏览器测试（扫码绑定、二维码更换、过期与刷新）；实测一分钟内的询问次数与三分钟后停止询问。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout d2be337 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-091/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `057a9cdbd85951d606a3652b3d246eac7dc18a67dbb2b8c416737669d1872124`; `git status --porcelain` lists exactly these five as changed and nothing as new: the three files of the table in "Current state" and `outputs/wa-replica-prototype/app.js`, `validation.json`. Commit everything (one commit is fine).

## Test plan

- **Validator** — the three times, the helper, the three-minute end, the button, the feed's look; nothing asks every two seconds.
- **Smoke** (`/tmp/wa-scrm-plan-091/smoke.sh`) — the same facts in the sources and the built page, which built files changed, the syntax of the built page, the five test files.
- **Verified by the reviewer, not by you**: in a browser against the reviewer's harness with a stand-in OpenWA — the probe under "Why this matters" (questions per minute, the end after three minutes, the button, silence after it, a late scan); the WhatsApp suite's three linking tests (a changing code, closing the dialog, an expired code and its new one).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout d2be337 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test` → `tests 91`, `pass 91`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-091/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "after this plan" values of the table in "Current state"
- [ ] `git status --porcelain` (before the commit) lists exactly the five files named in Step 4; after the commit the working tree is clean

## STOP conditions

Stop and report (do not improvise) if:

- the drift check shows that an in-scope file changed since `d2be337` and the "Current state" facts no longer match;
- a "find" block does not occur exactly once, or a checksum does not match after one careful retry;
- the build or the validator fails, a test fails, or a test count differs from the expected numbers;
- the build changes an output file other than `app.js` and `validation.json`;
- the smoke script reports `MISS` for anything at the end of Step 4;
- you would need to touch a file outside the scope, or install anything.

## Maintenance notes

- **OpenWA's limits** (`api.rateLimit.*`: 10 a second, 100 a minute, 1000 an hour by default, per kind of question) still apply; the dialog now stays far below them (at most about 40 questions per opening). Anything new that asks OpenWA repeatedly should be measured against them.
- **The times** are named constants beside `openwaQrLife`; plan 090 (the WhatsApp API page) changes other parts of the same file and is applied after this plan.
