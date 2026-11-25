# Plan 067: Saving that cannot stop silently: a time limit, a guard, a notice and a report

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c99cf05..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (the page's saving gets a time limit and a guard; one new signed-in route that writes a log line; exact text and checksums for every file)
- **Depends on**: plans/049-remove-the-price-list-for-good.md (DONE; its check of the purge request changes here), plans/066-sent-translated-back.md (DONE)
- **Category**: bug fix (approved by the owner)
- **Planned at**: commit `c99cf05`, 2026-11-25

## Why this matters

On 2026-11-25 an employee's page (workspace mango) stopped saving at 13:27:53 UTC and had not saved again 45 minutes later. It went on receiving, translating and sending messages, so nobody noticed: everything done in it — translations, notes, the record of its two sent replies — stayed in that browser tab only. No failing save request reached the server (the gateway logged none; every PUT /api/data in that hour answered 200), and a restart of the server did not make the page try again: the page was stuck in its own save routine. Two ways get it there, both possible in the current `work/wa-replica/fidelity-boot.js`:

- **A save request that never ends.** `flush()` sets `saving = true`, awaits `request()`, and only then sets it back. `request()` has no time limit. While a request hangs, every later `flush()` returns at once (`if (saving || stopped || !pending) return;`) — for good.
- **An error inside `flush()`.** `flush()` is called from a timer; an exception in it (for example `JSON.stringify` of a part that holds a cycle) rejects its promise unseen. Nothing is sent, nothing is shown, and the next save throws the same way. The advisor reproduced this in a browser on the current code: after an error in the save no notice appeared and no save request was ever sent again.

The owner asked for the page to protect itself — "a time limit on each save, a guard against the error that halts saving, a visible warning when saving stops, and a log entry so the cause can be found if it happens again" — and chose "Yes, fix it (Recommended)".

### Decisions already made (do not re-open; do not ask)

- **Time limit 30 s** for every save request (`PUT /api/data`, the price list's `DELETE /api/data`) and for the report itself; a save part is at most 256 KB and is answered in milliseconds. A save given up is treated like a save that could not reach the server: the changes stay, the existing notice 修改暂未保存到服务器，正在重试… shows, and it is tried again after 2, 4, 8, 16, 30, 30 … s. Should the server have applied it after all, the next save is refused with a conflict and the page shows its existing conflict screen — the existing behaviour for any answer that is lost.
- **A guard around the save.** `flush` becomes a small wrapper around the existing routine (renamed `saveNow`): an error in it resets `saving`, keeps the changes, shows 修改暂未保存：页面出错，正在重试。若一直如此，请刷新页面后重做最近的修改。 and tries again on the same schedule. The notice leaves at the next successful save, as the existing one does.
- **A save counts only with the new version in the answer** (`typeof answer.body.version === 'number'`); an answer cut off on its way is tried again like a failure.
- **The report**: `POST /api/site/report` (signed in; any role), body `{ kind, status?, error? }`, kind one of `timeout`, `unreachable`, `refused`, `error`. The server writes one line, `site page save failed user=<name> site=<sub-site or -> kind=<kind> status=<n or -> error=<words>`, where the words are the error's text up to its first quotation mark, letters and the signs ` .:>-` only (no digits), at most 120 characters — never data. The page tells each kind once (again only if the telling did not get through). The gateway sends `/api/site/…` to the master server, so every workspace's reports land in one log; no gateway change.
- The cause of the stall on 2026-11-25 is not known; this plan does not guess it. It makes both ways visible and recoverable, and the report will name the kind if it happens again.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/site-api.cjs` | `f956c122b9bf9dabf2cee5296aa9491c34f7b29ac85094b09871505d65e452d9` | `1a8dfc7d2c272e471d5fb8cc859f84dfde8c715090b4c6146ec4c7d172633824` | 2 |
| `work/wa-replica/site-api.test.cjs` | `9483bfbe56946c658c98c070663a50988ead9471aa12b35b4b346b7683873f83` | `f54c1e0081360649af736c4fe363998fba3eb00318fabd918d8786ca70d24574` | 1 |
| `work/wa-replica/fidelity-boot.js` | `55e2962f15309003b4674d8c91823e6c8977a6692f8c3fc588988f5755f47f2f` | `50338a99cbac16d5fc52a2da686ca16e75561b97ba081d58634f9774df76035f` | 6 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `be6b83f017991efbfa67554d682c252a91a8330d05499c3ae291a081b9ebef8f` | `bfcb5f39d1d4a348ec227cd8b8b6138a63ef6842be9741795808f85189f22a34` | 4 |
| `replica/build-log.md` | `ad09f290facdd1c5a4af5d035d8afaf764141ae9a69a839a54a19a9e5c0d80e0` | `e0d701f116a60da1e134cca6796ea93be34de7e5e045c6510a3e6aa80ac5f0c8` | 1 append |

- `site-api.cjs` — the server of a sub-site's accounts and data (also run by the master). Routes are a map `'METHOD /path': handler`; `signedIn(req)` checks the session; `readJson` reads a body; `problem(code)` makes an error answered by its status. A validator check forbids `${…body…}` or `${…json…}` inside a log line — the new line logs checked local values only.
- `site-api.test.cjs` — its tests; one test is added before "the log names users and outcomes, never a password, a token or data", which then also covers the new lines.
- `fidelity-boot.js` — the page's start-up and its saving (`save` → a 400 ms timer → `flush` → `PUT /api/data`). It is copied unchanged to `outputs/wa-replica-prototype/boot.js` by the build.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`. It allows `fidelity-boot.js` only a list of addresses (`/api/site/report` is added) and checks plan 049's purge request line (it gets the time limit).
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly two output files differ: `boot.js` (the copy of `fidelity-boot.js`) and `validation.json` (written by the validator); `app.js` does not change.

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer** (the server's accounts and data use `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout c99cf05 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 17`, `fail 0` (unchanged) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 19`, `fail 0` (18 before this plan) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-067/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/site-api.cjs`, `work/wa-replica/site-api.test.cjs` (Step 2)
- `work/wa-replica/fidelity-boot.js`, `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/boot.js`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — `serve.cjs`, `site-data.cjs`, `site-auth.cjs`, `openwa-link.cjs`, `ai-relay.cjs`, the `fidelity-*.js` modules other than `fidelity-boot.js`, the style sheets, `build-fidelity.cjs`, `deploy/**` (the gateway needs no change), `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/067-save-guard` first.
- One commit is fine. Conventional commit message, e.g. `fix(scrm): keep saving and say so when a save goes wrong`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese, Japanese, Korean, Cyrillic and Arabic text, regular expressions with backslashes, and backticks; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 13 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the five files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-067/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-067 && cat > /tmp/wa-scrm-plan-067/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 067: a page whose saving goes wrong keeps trying and says so; the server's log is told. NODE must be
# Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 19 ℹ fail 0 '
has 'the server takes a report of a page' "$W/site-api.cjs" "'POST /api/site/report': async req => {"
has 'its test is there' "$W/site-api.test.cjs" "test('a page that could not save tells the log, once for each kind"
has 'every save has a time limit' "$W/fidelity-boot.js" "request('/api/data', { method: 'PUT', keepalive, timeout: SAVE_TIMEOUT,"
has 'a guard around the save' "$W/fidelity-boot.js" 'async function flush(options) {'
has 'the log is told' "$W/fidelity-boot.js" "tell('error', 0, error);"
has 'the page is built with it' "$O/boot.js" 'const SAVE_TIMEOUT = 30000;'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  saveGuard: 'every save of the page has a time limit"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 保存出问题时页面会继续重试并提示，不再悄悄停止保存 · 2026-11-25'
same 'of the built files only the boot script and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(boot\.js|validation\.json)$')" 0
same 'the boot script and the server pass the syntax check' "$(node --check "$O/boot.js" 2>/dev/null && node --check "$W/site-api.cjs" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-067/smoke.sh && ls -l /tmp/wa-scrm-plan-067/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/site-api.cjs work/wa-replica/site-api.test.cjs work/wa-replica/fidelity-boot.js work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-067/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the sign-in and data tests pass` (got: ℹ pass 18 ℹ fail 0 ), `the server takes a report of a page`, `its test is there`, `every save has a time limit`, `a guard around the save`, `the log is told`, `the page is built with it`, `the validator knows it` and `the build log has the entry` (nine checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The server: the report of a page that could not save; its test

#### `site-api.cjs`

**Edit 2.1** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
const problem = (code, extra = {}) => Object.assign(new Error(code), { code, ...extra });

```

Replace them with:

```text
const problem = (code, extra = {}) => Object.assign(new Error(code), { code, ...extra });
// What a page may report about its saving (plan 067), and the words of an error as the log keeps them: up to the
// first quotation mark (what follows often quotes data), letters and a few signs only — no digits — and short.
const REPORT_KINDS = ['timeout', 'unreachable', 'refused', 'error'];
const plainWords = text => String(text ?? '').split(/["'`]/)[0].replace(/[^A-Za-z .:>-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || '-';

```

**Edit 2.2** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
    },
    'GET /api/data': req => {
```

Replace them with:

```text
    },
    // A page that could not save tells it here (plan 067), once for each kind of trouble: the log gets who, the
    // sub-site, the kind, the status of the answer and the first plain words of the error — never data.
    'POST /api/site/report': async req => {
      const user = signedIn(req);
      const body = await readJson(req);
      const { kind, status, error } = body;
      if (!REPORT_KINDS.includes(kind) || (status !== undefined && !(Number.isInteger(status) && status >= 0 && status < 600)) || (error !== undefined && typeof error !== 'string')) throw problem('invalid-request');
      const words = plainWords(error);
      console.error(`site page save failed user=${user.username} site=${user.site || '-'} kind=${kind} status=${status ?? '-'} error=${words}`);
      return { body: { ok: true } };
    },
    'GET /api/data': req => {
```

#### `site-api.test.cjs`

**Edit 2.3** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text

test('the log names users and outcomes, never a password, a token or data', () => {
```

Replace them with:

```text

test('a page that could not save tells the log, once for each kind: who, the sub-site, the kind, the status and the first plain words of the error — never data (plan 067)', async () => {
  const cookie = await member('tamsin', 'agent', 's1');
  const report = (body, options = {}) => call('/api/site/report', { method: 'POST', cookie, body, ...options });
  assert.equal((await call('/api/site/report', { method: 'POST', body: { kind: 'timeout' } })).status, 401, 'signed in only');
  for (const bad of [{}, { kind: 'other' }, { kind: 'error', status: 'x' }, { kind: 'error', status: 600 }, { kind: 'error', status: 1.5 }, { kind: 'error', error: 7 }]) assert.equal((await report(bad)).status, 400, JSON.stringify(bad));
  assert.equal((await report({ kind: 'error' }, { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403, 'not from a page of another site');
  const before = logged.length;
  assert.deepEqual((await report({ kind: 'error', status: 0, error: "TypeError: Converting circular structure to JSON --> starting at object with constructor 'Object' 13800138000 Gracias" })).json, { ok: true });
  assert.equal((await report({ kind: 'timeout', status: 0, error: 'TimeoutError: signal timed out' })).status, 200);
  assert.equal((await report({ kind: 'refused', status: 502 })).status, 200);
  assert.equal((await report({ kind: 'unreachable', status: 0, error: 'TypeError: Failed to fetch 张伟 13800138000' })).status, 200);
  assert.deepEqual(logged.slice(before), [
    'site page save failed user=tamsin site=s1 kind=error status=0 error=TypeError: Converting circular structure to JSON --> starting at object with constructor',
    'site page save failed user=tamsin site=s1 kind=timeout status=0 error=TimeoutError: signal timed out',
    'site page save failed user=tamsin site=s1 kind=refused status=502 error=-',
    'site page save failed user=tamsin site=s1 kind=unreachable status=0 error=TypeError: Failed to fetch',
  ]);
});

test('the log names users and outcomes, never a password, a token or data', () => {
```

What these edits do, so that you can recognise them: `site-api.cjs` gets `REPORT_KINDS` and `plainWords` after `problem`, and the route `'POST /api/site/report'` before `'GET /api/data'`; `site-api.test.cjs` gets one test before the test of what the log names.

**Verify**: `sha256sum work/wa-replica/site-api.cjs work/wa-replica/site-api.test.cjs` → `1a8dfc7d2c272e471d5fb8cc859f84dfde8c715090b4c6146ec4c7d172633824`, `f54c1e0081360649af736c4fe363998fba3eb00318fabd918d8786ca70d24574`; `node --check work/wa-replica/site-api.cjs` exits 0; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 19`, `fail 0`. If a checksum does not match, restore the file (`git checkout -- <file>`) and apply its edits again, once; if it still does not match, STOP.

### Step 3: The page: a time limit and a guard for every save, the report; the validator — and the build

#### `fidelity-boot.js`

**Edit 3.1** — `work/wa-replica/fidelity-boot.js`. Find exactly these lines (they occur once):

```text
  const SAVE_PART = 256 * 1024;
  const screen = { title: $('#subsite-login-title'), notice: $('#site-notice'), signIn: $('#site-sign-in'), password: $('#site-password'), leave: $('#site-leave') };

  const request = (path, { method = 'GET', body, keepalive = false } = {}) =>
    fetch(path, { method, keepalive, headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
      .then(async response => ({ status: response.status, body: await response.json().catch(() => ({})) }));
```

Replace them with:

```text
  const SAVE_PART = 256 * 1024;
  // A save that has had no answer after this long is given up and tried again (plan 067): a request that never
  // ends must not hold back every later save.
  const SAVE_TIMEOUT = 30000;
  const screen = { title: $('#subsite-login-title'), notice: $('#site-notice'), signIn: $('#site-sign-in'), password: $('#site-password'), leave: $('#site-leave') };

  const request = (path, { method = 'GET', body, keepalive = false, timeout = 0 } = {}) =>
    fetch(path, { method, keepalive, ...(timeout ? { signal: AbortSignal.timeout(timeout) } : {}), headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
      .then(async response => ({ status: response.status, body: await response.json().catch(() => ({})) }));
```

**Edit 3.2** — `work/wa-replica/fidelity-boot.js`. Find exactly these lines (they occur once):

```text
    };
    function stop(title, notice) {
```

Replace them with:

```text
    };
    // Tells the server's log, once for each kind of trouble, that this page could not save (plan 067): the kind,
    // the status of the answer and the name and first words of the error — nothing of the data. Told again only
    // when the telling itself did not get through.
    const told = new Set();
    function tell(kind, status, error) {
      if (told.has(kind)) return;
      told.add(kind);
      const words = error ? `${error.name}: ${String(error.message).split(/["'`]/)[0]}`.slice(0, 160) : '';
      request('/api/site/report', { method: 'POST', timeout: SAVE_TIMEOUT, body: { kind, status, error: words } })
        .then(answer => { if (answer.status !== 200) told.delete(kind); }, () => told.delete(kind));
    }
    function stop(title, notice) {
```

**Edit 3.3** — `work/wa-replica/fidelity-boot.js`. Find exactly these lines (they occur once):

```text
    }
    async function flush({ keepalive = false } = {}) {
      clearTimeout(timer);
```

Replace them with:

```text
    }
    async function saveNow({ keepalive = false } = {}) {
      clearTimeout(timer);
```

**Edit 3.4** — `work/wa-replica/fidelity-boot.js`. Find exactly these lines (they occur once):

```text
      try {
        answer = await request('/api/data', { method: 'PUT', keepalive, body: { baseVersion: version, set, remove } });
      } catch {
        answer = { status: 0, body: {} };
      }
      saving = false;
      if (answer.status === 200) {
        version = answer.body.version;
```

Replace them with:

```text
      try {
        answer = await request('/api/data', { method: 'PUT', keepalive, timeout: SAVE_TIMEOUT, body: { baseVersion: version, set, remove } });
      } catch (error) {
        answer = { status: 0, body: {}, error };
      }
      saving = false;
      // Saved only with the new version in the answer: an answer cut off on its way is tried again.
      if (answer.status === 200 && typeof answer.body.version === 'number') {
        version = answer.body.version;
```

**Edit 3.5** — `work/wa-replica/fidelity-boot.js`. Find exactly these lines (they occur once):

```text
        note(answer.status === 413 ? '修改未能保存：内容超过服务器允许的大小，请联系管理员。' : '修改暂未保存到服务器，正在重试…');
        timer = setTimeout(flush, Math.min(30000, 1000 * 2 ** failures));
```

Replace them with:

```text
        note(answer.status === 413 ? '修改未能保存：内容超过服务器允许的大小，请联系管理员。' : '修改暂未保存到服务器，正在重试…');
        tell(answer.error?.name === 'TimeoutError' ? 'timeout' : answer.status ? 'refused' : 'unreachable', answer.status, answer.error);
        timer = setTimeout(flush, Math.min(30000, 1000 * 2 ** failures));
      }
    }
    // Whatever goes wrong while saving must not end the saving for good (plan 067): the changes stay, the page says
    // that they are not saved and tries again, more slowly each time, and the server's log is told once.
    async function flush(options) {
      try {
        await saveNow(options);
      } catch (error) {
        saving = false;
        pending ??= window.WA_SITE.data;
        failures += 1;
        note('修改暂未保存：页面出错，正在重试。若一直如此，请刷新页面后重做最近的修改。');
        tell('error', 0, error);
        clearTimeout(timer);
        timer = setTimeout(flush, Math.min(30000, 1000 * 2 ** failures));
```

**Edit 3.6** — `work/wa-replica/fidelity-boot.js`. Find exactly these lines (they occur once):

```text
      try {
        answer = await request('/api/data', { method: 'DELETE', body: { baseVersion: version, field } });
      } catch {
```

Replace them with:

```text
      try {
        answer = await request('/api/data', { method: 'DELETE', timeout: SAVE_TIMEOUT, body: { baseVersion: version, field } });
      } catch {
```

#### `validate-scrm-lifecycle.cjs`

**Edit 3.7** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
const bootSource = read(path.join(__dirname, 'fidelity-boot.js'));
for (const call of bootSource.match(/request\('[^']*'/g) || []) assert(/^request\('\/api\/(site\/status|auth\/(session|login|logout|password)|data)'$/.test(call), `fidelity-boot.js calls an unexpected address: ${call}`);
assert(!/\bfetch\s*\(\s*['"`]/.test(bootSource), 'fidelity-boot.js must send every request through its request helper');
```

Replace them with:

```text
const bootSource = read(path.join(__dirname, 'fidelity-boot.js'));
for (const call of bootSource.match(/request\('[^']*'/g) || []) assert(/^request\('\/api\/(site\/(status|report)|auth\/(session|login|logout|password)|data)'$/.test(call), `fidelity-boot.js calls an unexpected address: ${call}`);
assert(!/\bfetch\s*\(\s*['"`]/.test(bootSource), 'fidelity-boot.js must send every request through its request helper');
```

**Edit 3.8** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// The supervisor page: master.js is the built copy of fidelity-master.js and is loaded before boot.js, which hands
```

Replace them with:

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// A page whose saving goes wrong keeps trying and says so (plan 067): every save has a time limit, a guard catches
// whatever goes wrong in the save, a save counts only with the new version in the answer, and the server's log is
// told once for each kind of trouble — with the first plain words of the error, never data.
for (const required of ['const SAVE_TIMEOUT = 30000;', '...(timeout ? { signal: AbortSignal.timeout(timeout) } : {})', "request('/api/data', { method: 'PUT', keepalive, timeout: SAVE_TIMEOUT,", "request('/api/data', { method: 'DELETE', timeout: SAVE_TIMEOUT,", "if (answer.status === 200 && typeof answer.body.version === 'number') {", 'async function flush(options) {', "tell('error', 0, error);", "tell(answer.error?.name === 'TimeoutError' ? 'timeout' : answer.status ? 'refused' : 'unreachable', answer.status, answer.error);"]) {
  assert(bootSource.includes(required), `fidelity-boot.js is missing ${required}`);
}
for (const required of ["const REPORT_KINDS = ['timeout', 'unreachable', 'refused', 'error'];", "'POST /api/site/report': async req => {", 'console.error(`site page save failed user=${user.username} site=${user.site || \'-\'} kind=${kind} status=${status ?? \'-\'} error=${words}`);']) {
  assert(read(path.join(__dirname, 'site-api.cjs')).includes(required), `site-api.cjs is missing ${required}`);
}
// The supervisor page: master.js is the built copy of fidelity-master.js and is loaded before boot.js, which hands
```

**Edit 3.9** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(!read(path.join(__dirname, 'fidelity-pricelist.js')).includes('delete data.priceList'), 'the price list must not be removed by an ordinary save');
for (const [file, required] of [['fidelity-boot.js', "answer = await request('/api/data', { method: 'DELETE', body: { baseVersion: version, field } });"], ['site-api.cjs', "const PURGEABLE = ['priceList'];"], ['site-api.cjs', "'DELETE /api/data': async req => {"], ['site-data.cjs', "db.exec('VACUUM');"], ['site-data.cjs', "db.exec('PRAGMA wal_checkpoint(TRUNCATE)');"], ['site-data.cjs', "else db.prepare('DELETE FROM saves WHERE version = ?').run(row.version);"]]) {
  assert(read(path.join(__dirname, file)).includes(required), `${file} is missing ${required}`);
```

Replace them with:

```text
assert(!read(path.join(__dirname, 'fidelity-pricelist.js')).includes('delete data.priceList'), 'the price list must not be removed by an ordinary save');
for (const [file, required] of [['fidelity-boot.js', "answer = await request('/api/data', { method: 'DELETE', timeout: SAVE_TIMEOUT, body: { baseVersion: version, field } });"], ['site-api.cjs', "const PURGEABLE = ['priceList'];"], ['site-api.cjs', "'DELETE /api/data': async req => {"], ['site-data.cjs', "db.exec('VACUUM');"], ['site-data.cjs', "db.exec('PRAGMA wal_checkpoint(TRUNCATE)');"], ['site-data.cjs', "else db.prepare('DELETE FROM saves WHERE version = ?').run(row.version);"]]) {
  assert(read(path.join(__dirname, file)).includes(required), `${file} is missing ${required}`);
```

**Edit 3.10** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  reasoningEffort: 'AI_REASONING_EFFORT in the server\'s settings (none, minimal, low, medium or high) is sent to the model service as reasoning_effort and named by the status; a value outside these leaves the service not configured (bad-reasoning-effort); without it nothing is sent',
```

Replace them with:

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  saveGuard: 'every save of the page has a time limit of 30 s and a guard around it: whatever goes wrong, the changes stay, the page says they are not saved and tries again, and the server\'s log is told once for each kind of trouble (POST /api/site/report, signed in; who, sub-site, kind, status, the first plain words of the error, never data)',
  reasoningEffort: 'AI_REASONING_EFFORT in the server\'s settings (none, minimal, low, medium or high) is sent to the model service as reasoning_effort and named by the status; a value outside these leaves the service not configured (bad-reasoning-effort); without it nothing is sent',
```

**Verify**: `sha256sum work/wa-replica/fidelity-boot.js work/wa-replica/validate-scrm-lifecycle.cjs` → `50338a99cbac16d5fc52a2da686ca16e75561b97ba081d58634f9774df76035f`, `bfcb5f39d1d4a348ec227cd8b8b6138a63ef6842be9741795808f85189f22a34`; `git checkout c99cf05 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `boot.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else (if `icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one); `sha256sum outputs/wa-replica-prototype/boot.js` → `50338a99cbac16d5fc52a2da686ca16e75561b97ba081d58634f9774df76035f`. If a checksum does not match, restore the file with `git checkout c99cf05 -- <file>` and apply its instructions again; if it still does not match, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 保存出问题时页面会继续重试并提示，不再悄悄停止保存 · 2026-11-25

一个员工页面在 13:27（UTC）之后再也没有把任何修改保存到服务器：页面仍能收发消息，但没有任何提示，修改只留在这个浏览器页面里。原因无法从服务器一侧确定（没有任何失败的保存请求到达服务器）。现在页面的保存有三重保护：

- **每次保存都有时间限制（30 秒）**：一次保存请求如果迟迟没有回应，就放弃并重新尝试，不会因为一个卡住的请求而让之后的所有保存都停下。
- **保存过程中出现任何错误都不会让保存永久停止**：修改仍然保留，页面提示「修改暂未保存：页面出错，正在重试……」，并按逐渐变长的间隔重试；保存成功后提示自动消失。网络或服务器问题仍提示「修改暂未保存到服务器，正在重试…」。
- **出问题时告诉服务器日志**：每种问题（超时、无法连接、服务器拒绝、页面出错）每个页面只报告一次，日志记录用户、子站、问题类型、状态码和错误名称的前几个词——不记录任何客户数据（数字和引号后的内容一律去掉）。以后再出现类似情况，可以从日志找到原因。

另外，只有服务器返回了新的数据版本才算保存成功；回应在途中被截断的保存会重新尝试。

验证：构建与校验脚本通过；子站接口测试新增一项（未登录拒绝、错误内容拒绝、跨站拒绝、日志内容只含允许的字词）；浏览器测试覆盖：保存请求一直没有回应时 30 秒后重试成功并在日志留下「timeout」，保存过程出错时显示提示、日志留下「error」、错误消除后自动保存成功并清除提示。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout c99cf05 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-067/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `e0d701f116a60da1e134cca6796ea93be34de7e5e045c6510a3e6aa80ac5f0c8`; `git status --porcelain` lists exactly these seven as changed and nothing as new: the five files of the table in "Current state" and `outputs/wa-replica-prototype/boot.js`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Sign-in and data tests** (19): the new test (pattern: the tests around it, with `member()` and `call()`) — signed out → 401; a wrong kind, status or error → 400; from a page of another site → 403; four reports → four log lines exactly as listed, the words cut at the first quotation mark, without digits; the following test of the log (no password, token or data) covers them too.
- **Validator** — the address list of `fidelity-boot.js` with `/api/site/report`; the time limit on the save and the purge; the guard; a save counted only with a version; the report's kinds, route and log line.
- **Smoke** (`/tmp/wa-scrm-plan-067/smoke.sh`) — the same facts, all three test files, which built files changed and the syntax of the boot script and the server.
- **Verified by the reviewer, not by you**: in a browser against a stand-in server — an error put into the save (a part with a cycle): the notice of an error, one report `kind=error`, and once the cycle is gone the change is saved and the notice leaves; a save held without an answer: given up after about 30 s, the notice, one report `kind=timeout`, then saved; a save dropped by the network: the notice, one report `kind=unreachable`, then saved; the log holds nothing of the data; the same probe fails on the code before this plan.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout c99cf05 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 17`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 19`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-067/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/site-api.cjs` → `1a8dfc7d2c272e471d5fb8cc859f84dfde8c715090b4c6146ec4c7d172633824`
- [ ] `sha256sum work/wa-replica/site-api.test.cjs` → `f54c1e0081360649af736c4fe363998fba3eb00318fabd918d8786ca70d24574`
- [ ] `sha256sum work/wa-replica/fidelity-boot.js` → `50338a99cbac16d5fc52a2da686ca16e75561b97ba081d58634f9774df76035f`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `bfcb5f39d1d4a348ec227cd8b8b6138a63ef6842be9741795808f85189f22a34`
- [ ] `sha256sum replica/build-log.md` → `e0d701f116a60da1e134cca6796ea93be34de7e5e045c6510a3e6aa80ac5f0c8`
- [ ] `sha256sum outputs/wa-replica-prototype/boot.js` → `50338a99cbac16d5fc52a2da686ca16e75561b97ba081d58634f9774df76035f`
- [ ] `git diff --name-only c99cf05..HEAD -- outputs` lists `boot.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only c99cf05..HEAD -- . ':!plans'` lists exactly seven paths: the five of the table in "Current state" and the two output files
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, or a test fails.
- An output file other than `boot.js` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file, creating a file or installing a package.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else. A page that is open keeps its old code until it is opened again.
- Reports are found with `sudo docker logs wa-scrm-master 2>&1 | grep 'site page save failed'` on the platform (the gateway sends `/api/site/…` to the master).
- A later field of the data that holds something `JSON.stringify` cannot write (a cycle, a BigInt) now shows the notice of an error and is reported, instead of stopping the saving unseen.
- What a reviewer should scrutinise: that `saving` can never stay `true` (the time limit, and the guard resets it); that the changes are never dropped on an error (`pending ??= window.WA_SITE.data`); that nothing of the data reaches the log (`plainWords`, the validator's check of log lines); that the address list of the boot script stays closed.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
