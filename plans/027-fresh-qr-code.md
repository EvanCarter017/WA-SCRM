# Plan 027: The link dialog says how QR codes change; a code that is no longer renewed can be replaced

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 47baaea..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (three small edits on the server, five in one page module, one new test)
- **Depends on**: plans/026-page-real-whatsapp.md (DONE)
- **Category**: bug
- **Planned at**: commit `47baaea`, 2026-11-21
- **Version of this plan**: 2. The first version rested on a three-minute measurement that took the pause between two rounds of QR codes for the end of the renewals. An executor carried it out correctly; the reviewer did not merge it and rewrote the plan after watching for fourteen minutes.

## Why this matters

Since plan 026 the page links a WhatsApp number by showing the QR code of the sub-site's own OpenWA. Measured on a running OpenWA 0.31.0 (engine whatsapp-web.js) on 2026-11-21, watching one unscanned link for fourteen minutes: QR codes come **in rounds**. The first code of a round is replaced after about 60 seconds, five more follow every 20 seconds, then nothing happens for about a minute until the next round starts (24 codes in 14 minutes). All the time the session reports that it waits for the scan. So one code stays on screen for 70 seconds at most, and during the pause the code on screen may already be dead: a scan then fails on the phone, and the page gives no hint.

This plan does two things:

- **A hint.** The dialog says that the code changes by itself and that after a scan that did not work one waits for the next code.
- **A safety net.** Should OpenWA ever stop renewing — a code shown for more than 90 seconds without a new one — the page takes the code away, says "二维码已过期" and offers "重试"; the retry asks the server for a new code with `fresh: true` on `POST /api/wa/link`. The server then stops a session that waits for the scan and starts it again, which brings a new code (verified on the running instance: stop answers 200 with `disconnected`, the next start answers `qr_ready` with a different code). A number that is linked is never stopped.

### Decisions already made (do not re-open; do not ask)

- The page does not renew by itself: the employee presses "重试". A dialog left open must not keep a browser session at OpenWA running forever.
- 90 seconds: longer than the longest time OpenWA shows one code (about 70), so a code is not called expired while OpenWA is still renewing.
- Only the value `true` asks for a new code.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/openwa-link.cjs` | `b9e337848b9184c12a12c65b4e4122eef0cb85fe31156e8b617d773cfa2e847d` | `b07fbe8eb644735318431bdc77999fbcf929c5fbf0ed32825a22bec2db36f655` |
| `work/wa-replica/openwa-link.test.cjs` | `cda4d8421e27b1d28ea9f3936425f2fab150acf737dbe01bbce0f0960b68d20b` | `a633067f6b7e6294810f869ca2a3775f25d9c19aae076251d85d58a5f7cef305` |
| `work/wa-replica/fidelity-openwa.js` | `cd4a1737be6a009c3c6ae6bb61e5d7b8a80cbf4ebf8009c78b8c56d6dcef37c1` | `3d528b11c59d60fa685520a6f7d922d67e5a2a675e833b2e6f79ee998e7ded27` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `e0e7b3f621483c75b4fc426bc6c2c0f976362038c2e218aab790f896530f1840` | `135444077b3d6a268ce2a013cda94a1479dcb42d88a8c46a5a6a4cc4de71a7d4` |

- `openwa-link.cjs` — the server's link to OpenWA. Its route `POST /api/wa/link` reads `{ account }`, makes sure the session exists, starts it when its status is `created`, `disconnected` or `failed`, and answers with the number's state and, while it waits for the scan, the QR code.
- `openwa-link.test.cjs` — 13 tests against a stand-in OpenWA inside the file (an HTTP server that answers like the real one). The stand-in has no `stop` route yet and always returns the same QR code.
- `fidelity-openwa.js` — the page module of the connection. `openwaRequestLink(pair)` posts to `link`; `openwaPoll(pair)` asks for the state every two seconds while the dialog is open; `openwaPairStep(pair, link)` puts an answer into the dialog; the action `openwaRetry` calls `openwaRequestLink` again after an error.
- `validate-scrm-lifecycle.cjs` — its section 22 lists texts that `fidelity-openwa.js` must contain; one of them changes with this plan.

### How the build works

`work/wa-replica/build-fidelity.cjs` puts the module files into the app and writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 47baaea -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Link tests | `env -u WA_SCRM_OPENWA_ENV $NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 14`, `fail 0` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 12`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-027/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |
| Icon set | `node -e "const vm=require('vm'),fs=require('fs'),cp=require('child_process');const keys=s=>{const w={};vm.runInNewContext(s,{window:w});return Object.keys(w.WA_ICONS)};const a=keys(cp.execSync('git show 47baaea:outputs/wa-replica-prototype/icons.js').toString()),b=keys(fs.readFileSync('outputs/wa-replica-prototype/icons.js','utf8'));console.log('removed='+a.filter(x=>!b.includes(x)).join(',')+' added='+b.filter(x=>!a.includes(x)).join(','))"` | `removed= added=` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/openwa-link.cjs`, `work/wa-replica/openwa-link.test.cjs` (Step 2)
- `work/wa-replica/fidelity-openwa.js`, `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{app.js,validation.json}` (the other output files must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular `serve.cjs`, `site-*.cjs`, `fidelity-boot.js`, the other modules, `build-fidelity.cjs`, `plans/**`, earlier entries of `replica/build-log.md`; any real OpenWA, any settings file with a key, any data folder inside the repository.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/027-fresh-qr-code` first.
- One commit is fine. Conventional commit message, e.g. `fix(scrm): replace a QR code that is no longer renewed`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives a text to find (it occurs exactly once in the named file) and the text that replaces it. An **Insert** names the beginning of a line (exactly one line starts that way) and the text to put directly above it. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Before each change, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the four source files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-027/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-027 && cat > /tmp/wa-scrm-plan-027/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that a QR code that is no longer renewed can be replaced: the server part, its tests and the built page.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'the server starts a waiting session anew on request' "$W/openwa-link.cjs" "if (fresh === true && session.body.status === 'qr_ready') {"
has 'the built page knows how long a QR code may stay' "$P/app.js" 'const openwaQrLife = 90000;'
has 'the dialog says what to do when a scan did not work' "$P/app.js" '扫码没有成功时，请等新的二维码出现后再扫'
has 'the built page asks for a new code after the old one expired' "$P/app.js" "pair.expired ? { account: pair.accountId, fresh: true } : { account: pair.accountId }"
has 'the built page says that the code expired' "$P/app.js" '二维码已过期'
same 'the link tests pass' "$(env -u WA_SCRM_OPENWA_ENV "$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
same 'the page sources still pass the syntax check' "$(node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('$W/fidelity-openwa.js','utf8')+'})');console.log('ok')" 2>&1)" ok
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-027/smoke.sh && ls -l /tmp/wa-scrm-plan-027/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/openwa-link.cjs work/wa-replica/openwa-link.test.cjs work/wa-replica/fidelity-openwa.js work/wa-replica/validate-scrm-lifecycle.cjs` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-027/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the server starts a waiting session anew on request`, `the built page knows how long a QR code may stay`, `the dialog says what to do when a scan did not work`, `the built page asks for a new code after the old one expired`, `the built page says that the code expired` and `the link tests pass` (it reports `pass 13`; six checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The server: a waiting session is started anew on request

**Edit 2.1** — `work/wa-replica/openwa-link.cjs`. Find exactly (it occurs once):

```text
//   POST /api/wa/link    { account }             creates the number's session if needed and starts it
```

Replace with:

```text
//   POST /api/wa/link    { account, fresh? }     creates the number's session if needed and starts it; with fresh,
//                                                a session that waits for the scan is started anew (a new QR code)
```

**Edit 2.2** — `work/wa-replica/openwa-link.cjs`. Find exactly (it occurs once):

```text
      const { account } = await readJson(req);
      if (typeof account !== 'string' || !ACCOUNT.test(account)) throw problem('invalid-request');
      let row = await ensureAccount(config, account);
```

Replace with:

```text
      const { account, fresh } = await readJson(req);
      if (typeof account !== 'string' || !ACCOUNT.test(account)) throw problem('invalid-request');
      let row = await ensureAccount(config, account);
```

**Edit 2.3** — `work/wa-replica/openwa-link.cjs`. Find exactly (it occurs once):

```text
      if (session.status !== 200) throw problem('gateway-failed');
      if (['created', 'disconnected', 'failed'].includes(session.body.status)) {
```

Replace with:

```text
      if (session.status !== 200) throw problem('gateway-failed');
      // When the page finds that a QR code is no longer renewed, it asks for a new one: a session that still
      // waits for the scan is stopped, so that the start below brings a new code.
      if (fresh === true && session.body.status === 'qr_ready') {
        await ask(config, 'POST', `/api/sessions/${row.session}/stop`);
        session = await ask(config, 'GET', `/api/sessions/${row.session}`);
        if (session.status !== 200) throw problem('gateway-failed');
      }
      if (['created', 'disconnected', 'failed'].includes(session.body.status)) {
```

**Edit 2.4** — `work/wa-replica/openwa-link.test.cjs`. Find exactly (it occurs once):

```text
      Object.assign(session, { status: 'qr_ready', engineLoaded: true });
      return answer(200, session);
    }
```

Replace with:

```text
      Object.assign(session, { status: 'qr_ready', engineLoaded: true, starts: (session.starts || 0) + 1 });
      return answer(200, session);
    }
    if (action === 'stop') {
      if (!started) return fail(400, 'Bad Request', 'Session is not started. Call POST /sessions/:sessionId/start first.');
      Object.assign(session, { status: 'disconnected', engineLoaded: false });
      return answer(200, session);
    }
```

**Edit 2.5** — `work/wa-replica/openwa-link.test.cjs`. Find exactly (it occurs once):

```text
    if (action === 'qr') return session.status === 'qr_ready' ? answer(200, { qrCode: QR, status: 'qr_ready' })
```

Replace with:

```text
    // Every start brings a new code: the first one is QR, later ones carry the number of the start.
    if (action === 'qr') return session.status === 'qr_ready' ? answer(200, { qrCode: session.starts > 1 ? QR + session.starts : QR, status: 'qr_ready' })
```

**Insert 2.6** — `work/wa-replica/openwa-link.test.cjs`. Find the line that starts with (one line starts this way):

```text
test('OpenWA down, or refusing the key: the status says so and nothing is half-done', async () => {
```

Insert exactly this text as new lines directly above that line (the last line of the block is an empty line; it is part of the text):

```text
test('a fresh QR code on request: a number that waits for the scan is started anew; a linked number is left alone', async () => {
  const first = await post('/api/wa/link', { account: 'a5' });
  assert.deepEqual([first.json.state, first.json.qr], ['scan', QR]);
  const session = gwSessionOf('a5');
  const stops = () => gw.calls.filter(c => c === `POST /api/sessions/${session.id}/stop`).length;
  assert.deepEqual([(await post('/api/wa/link', { account: 'a5' })).json.qr, stops()], [QR, 0], 'without the request the waiting session is left as it is');
  assert.deepEqual([(await post('/api/wa/link', { account: 'a5', fresh: 'yes' })).json.qr, stops()], [QR, 0], 'only the value true asks for a new code');
  const fresh = await post('/api/wa/link', { account: 'a5', fresh: true });
  assert.deepEqual([fresh.status, fresh.json.state, fresh.json.qr, stops(), gwSessionOf('a5').id], [200, 'scan', QR + '2', 1, session.id], 'the same session, stopped once and started again, with a new code');
  assert.deepEqual((await call('/api/wa/link?account=a5', { cookie: lin })).json.qr, QR + '2');
  Object.assign(session, { status: 'ready', phone: '15550005555' });
  assert.deepEqual([(await post('/api/wa/link', { account: 'a5', fresh: true })).json.state, stops()], ['online', 1], 'a linked number is never stopped');
  assert.equal((await post('/api/wa/unlink', { account: 'a5' })).status, 200);
});

```

**Verify**: `sha256sum work/wa-replica/openwa-link.cjs work/wa-replica/openwa-link.test.cjs` → `b07fbe8eb644735318431bdc77999fbcf929c5fbf0ed32825a22bec2db36f655`, `a633067f6b7e6294810f869ca2a3775f25d9c19aae076251d85d58a5f7cef305`; `node --check work/wa-replica/openwa-link.cjs && node --check work/wa-replica/openwa-link.test.cjs && echo SYNTAX_OK` → `SYNTAX_OK`; `env -u WA_SCRM_OPENWA_ENV $NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 14`, `fail 0`. If a checksum does not match, restore the file with `git checkout 47baaea -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 3: The page: the hint, and a code that is no longer renewed

**Edit 3.1** — `work/wa-replica/fidelity-openwa.js`. Find exactly (it occurs once):

```text
  const openwaClient = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
```

Replace with:

```text
  const openwaClient = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  // OpenWA renews a QR code in rounds: the first code of a round after about a minute, five more every twenty
  // seconds, then nothing for about a minute until the next round. The longest it shows one code is about seventy
  // seconds; a code that has been shown longer than this without a new one is no longer renewed.
  const openwaQrLife = 90000;
```

**Edit 3.2** — `work/wa-replica/fidelity-openwa.js`. Find exactly (it occurs once):

```text
<p class="openwa-pair-hint">二维码会自动更新。绑定后，这个号码的新消息会显示在在线聊天里。</p>
```

Replace with:

```text
<p class="openwa-pair-hint">二维码会自动更换；扫码没有成功时，请等新的二维码出现后再扫。绑定后，这个号码的新消息会显示在在线聊天里。</p>
```

**Edit 3.3** — `work/wa-replica/fidelity-openwa.js`. Find exactly (it occurs once):

```text
    if (phase === pair.phase && qr === pair.qr && error === pair.error) return;
    Object.assign(pair, { phase, qr, error });
```

Replace with:

```text
    if (phase === pair.phase && qr === pair.qr && error === pair.error) return;
    if (qr !== pair.qr) pair.qrAt = Date.now();
    Object.assign(pair, { phase, qr, error });
```

**Edit 3.4** — `work/wa-replica/fidelity-openwa.js`. Find exactly (it occurs once):

```text
    const answer = await openwaCall('POST', 'link', { account: pair.accountId });
    if (openwaPairing !== pair) return openwaAbandon(pair);
    if (answer.status === 200) openwaPairStep(pair, answer.body);
```

Replace with:

```text
    const answer = await openwaCall('POST', 'link', pair.expired ? { account: pair.accountId, fresh: true } : { account: pair.accountId });
    if (openwaPairing !== pair) return openwaAbandon(pair);
    if (answer.status === 200) pair.expired = false;
    if (answer.status === 200) openwaPairStep(pair, answer.body);
```

**Edit 3.5** — `work/wa-replica/fidelity-openwa.js`. Find exactly (it occurs once):

```text
    if (answer.status === 200) openwaPairStep(pair, answer.body);
    else if (answer.status === 404) openwaPairStep(pair, { state: 'missing' });
    if (openwaPairing === pair && pair.phase !== 'error') pair.timer = setTimeout(() => openwaPoll(pair), 2000);
```

Replace with:

```text
    if (answer.status === 200) openwaPairStep(pair, answer.body);
    else if (answer.status === 404) openwaPairStep(pair, { state: 'missing' });
    if (openwaPairing !== pair) return;
    if (pair.phase === 'scan' && Date.now() - pair.qrAt > openwaQrLife) {
      // The code is no longer renewed. "重试" asks the server for a new one.
      Object.assign(pair, { phase: 'error', qr: '', error: '二维码已过期，请点击「重试」获取新的二维码。', expired: true });
      return openwaShowPairing();
    }
    if (pair.phase !== 'error') pair.timer = setTimeout(() => openwaPoll(pair), 2000);
```

**Edit 3.6** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly (it occurs once):

```text
"openwaCall('POST', 'link', { account: pair.accountId })", 
```

Replace with:

```text
"openwaCall('POST', 'link', pair.expired ? { account: pair.accountId, fresh: true } : { account: pair.accountId })", 'const openwaQrLife = 90000;', 
```

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js work/wa-replica/validate-scrm-lifecycle.cjs` → `3d528b11c59d60fa685520a6f7d922d67e5a2a675e833b2e6f79ee998e7ded27`, `135444077b3d6a268ce2a013cda94a1479dcb42d88a8c46a5a6a4cc4de71a7d4`; `node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/fidelity-openwa.js','utf8')+'})')" && echo SYNTAX_OK` → `SYNTAX_OK`; `git checkout 47baaea -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; the icon-set command → `removed= added=`.

### Step 4: Build log, final verification

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```markdown
## 扫码弹窗：说明二维码的更换方式；不再更换时可重新获取 · 2026-11-21

在真实 OpenWA 上实测（连续观察 14 分钟）：二维码按轮更换——每轮第一张约 60 秒后更换，随后 5 张每 20 秒更换一次，然后停顿约一分钟再开始下一轮；同一张二维码最长显示约 70 秒，停顿期间屏幕上的二维码可能已经失效，等待扫码的状态一直不变。弹窗的提示因此改为「二维码会自动更换；扫码没有成功时，请等新的二维码出现后再扫」。

另外增加一道保险：同一张二维码显示超过 90 秒仍未更换（说明已不再更换）时，弹窗撤下它，提示「二维码已过期」并提供「重试」；重试时页面请求新的二维码（`POST /api/wa/link` 带 `fresh: true`），服务器对仍在等待扫码的会话先停止再启动，返回新的二维码（已在真实实例上核对）。页面不会自行重启会话；已绑定在线的号码不受这个请求影响。
```

Then verify everything once more:

```bash
git checkout 47baaea -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && env -u WA_SCRM_OPENWA_ENV $NODE --test work/wa-replica/openwa-link.test.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-027/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test runs end with `pass 14` and `pass 12`, `fail 0` each; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md outputs/wa-replica-prototype/app.js` → `2e35bda1873ccab7d0ffb90ea453c48c0eb4ff778d873a50e3521b17e8f62e52`, `a6ec95b533c58235ad9a06dd97a774c91b69cebdf3349d01c123140020226217`; `git status --porcelain` lists exactly seven paths: the four source files, `replica/build-log.md`, `outputs/wa-replica-prototype/app.js` and `outputs/wa-replica-prototype/validation.json` (if `outputs/wa-replica-prototype/icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **`work/wa-replica/openwa-link.test.cjs`** — one new test (given in full in Step 2): without the request a waiting session is left alone; only the value `true` counts; with it the same session is stopped once and started again and answers with a different code; a linked number is never stopped. The stand-in gets a `stop` route and a code that changes with every start. The 13 existing tests stay green.
- **Validator** — section 22 expects the new form of the link request and the life span of a code.
- **Smoke** (`/tmp/wa-scrm-plan-027/smoke.sh`) — the server part is there, the built page carries the new texts, the tests pass.
- **Verified by the reviewer, not by you**: the dialog in a real browser (the hint; a code that stays for more than 90 seconds is called expired, "重试" brings a different one, nothing is restarted before the employee asks), and the request for a new code against a real OpenWA.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 47baaea -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `env -u WA_SCRM_OPENWA_ENV $NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 14`, `fail 0`; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-027/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/openwa-link.cjs` → `b07fbe8eb644735318431bdc77999fbcf929c5fbf0ed32825a22bec2db36f655`
- [ ] `sha256sum work/wa-replica/openwa-link.test.cjs` → `a633067f6b7e6294810f869ca2a3775f25d9c19aae076251d85d58a5f7cef305`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js` → `3d528b11c59d60fa685520a6f7d922d67e5a2a675e833b2e6f79ee998e7ded27`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `135444077b3d6a268ce2a013cda94a1479dcb42d88a8c46a5a6a4cc4de71a7d4`
- [ ] `sha256sum replica/build-log.md` → `2e35bda1873ccab7d0ffb90ea453c48c0eb4ff778d873a50e3521b17e8f62e52`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `a6ec95b533c58235ad9a06dd97a774c91b69cebdf3349d01c123140020226217`
- [ ] the icon-set command prints `removed= added=`
- [ ] `git diff --name-only 47baaea..HEAD -- . ':!plans'` lists exactly: `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/fidelity-openwa.js`, `work/wa-replica/openwa-link.cjs`, `work/wa-replica/openwa-link.test.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs`
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

- **Deployment**: the server file changes, so the live service must be restarted after the merge (the reviewer does that). Until then the page's request for a new code is answered like an ordinary link request.
- The 90 seconds follow from what OpenWA 0.31.0 with whatsapp-web.js did on 2026-11-21 (rounds of six codes, about 70 seconds at most for one code). Measure again when the version or the engine changes.
- What a reviewer should scrutinise: that a linked number can never be stopped by this request; that the page restarts nothing by itself.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
