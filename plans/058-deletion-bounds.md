# Plan 058: What the independent review of plan 057 found

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a7dee76..HEAD -- work/wa-replica replica/build-log.md outputs deploy`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (bounds and guards around the deleting of accounts and sub-sites, added by plan 057; exact text and checksums for every file)
- **Depends on**: plans/057-delete-accounts.md (DONE)
- **Category**: security (findings of an independent review)
- **Planned at**: commit `a7dee76`, 2026-11-23

## Why this matters

Plan 057 let supervisors and administrators delete accounts — an employee's together with their workspace (sub-site). It runs on the platform. An independent security review of its changes found nothing critical and nothing high; this plan puts right what it found:

| # | What the review found | Here |
|---|---|---|
| 1 | Medium: the translations the relay keeps of a deleted workspace's messages are found by every language × every text of the workspace's data, all held at once. An employee who fills their own data with thousands of made-up languages and texts makes the first server compute millions of fingerprints and run out of memory when a supervisor deletes them — and their account could then never be deleted | the data is read part by part; at most 12 languages (the page offers 12) and texts the relay translates (4000 characters at most) are looked at, 2,000,000 fingerprints at most; the work is done in batches of 500, between which the server answers other requests |
| 2 | The signing out of a deleted workspace's numbers had no time limit in all: with several numbers whose phones are offline it could take longer than the first server waits (110 s) | signing out has 60 seconds in all; every call to OpenWA gets the time that is left |
| 3 | An OpenWA could keep the provisioner busy with many sessions or exhaust its memory with a huge answer | at most 20 sessions are looked at (more: "not signed out"); an answer is read up to 1 MB |
| 4 | A pipe placed where the settings file should be would block the provisioner for good | the settings file is read only when it is a plain file of at most 4 KB |
| 6 | Translations of voice-note transcripts were not found | they are, with the texts |
| 7 | When the dialog was closed while a deletion ran, the note "the number could not be signed out — remove it on the phone" was lost | it comes in a dialog of its own (or in the note at the bottom when another dialog is open by then) |
| 8 | An error in the gateway's configuration went unnoticed by the upgrade script | the configuration is tried before anything is changed; with an error the upgrade stops |
| 9 | Only the name "master" was kept from being an employee's workspace; a first server running under another id could delete its own files | the first server's own id is neither made nor deleted as an employee's workspace |
| 10 | Deleting one employee of a shared workspace left it running even when nobody else could sign in | it stops then, as switching off does |

Left as they are, knowingly: a stopped workspace's OpenWA that was started for the signing out stays running when the deletion fails half-way (a second deletion clears it); an account whose workspace was deleted but whose own deletion then failed (the database busy) is deleted by a second attempt.

### Decisions already made (do not re-open; do not ask)

- The translations are taken out of the relay's store before the provisioner is asked to delete the workspace (they are found by the workspace's data). If the provisioner then refuses, the account and the workspace stay; their cached translations do not — the messages keep their own saved translation, so nothing is asked again.
- The numbers, limits and texts in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/site-provisioner.cjs` | `33f61520610f98f57f1e3faa5bbafd240d0e37e50dbca6886069709963a47495` | `dde93e9b07f4e68053224e0bfa238cf50f9aadb4a0bec3cbda363d1757c61fcf` | 8 |
| `work/wa-replica/site-provisioner.test.cjs` | `ae5860d61588eedb4450f14945e9299d5ae8e404f98b06ae3c0e7b80acd723d8` | `914f61420960e717f93a0de2d68674cb040fbcb5199f1e61f15cbfeb2840e4ab` | 6 |
| `work/wa-replica/site-api.cjs` | `3c684ec6cfcb2d9edbab3d74939365c3df3d483678463efbc1430efc185b187d` | `f956c122b9bf9dabf2cee5296aa9491c34f7b29ac85094b09871505d65e452d9` | 7 |
| `work/wa-replica/site-api.test.cjs` | `3578e934fe8c180e62124b4142bfce158601d99e94549524335978cbaa658f79` | `9483bfbe56946c658c98c070663a50988ead9471aa12b35b4b346b7683873f83` | 6 |
| `deploy/upgrade.sh` | `db93436ecffab10bd9d5ec89656c7c07d3aceb5b001857f4bd09da233591cdec` | `6ea6f36b3a04fb42397a8ff81b5e42a1be09c453c75397d39667a309c29d0ec6` | 2 |
| `work/wa-replica/fidelity-master.js` | `34123b5deab3bf3d641199ca9c451c02b83cba5ef12c091d8e121c4f7a188ec8` | `28df13dc5829117ffa2ca8ce727b279249964744ec3766605cd3bfb9fe2526b7` | 2 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `b77a9fccbe9e09a565369db15e48a939f236e396ee2ba268556e75bf5c62509d` | `6ad53eafcfbc3d35f7296e566d763f206a44685a02cfc44e46a687e0ed32f270` | 1 |
| `replica/build-log.md` | `ef37adac71a4afc8b5cd764c20815e0c98cd8c62eb62d40a7985bd335595fe0f` | `443ac067fbea8e7ec260c2576b5a41c6f2896f957425fd3e56a5b9b6a18d6afa` | 1 append |

- `site-provisioner.cjs` — the provisioner; `signOut` signs a deleted workspace's numbers out at its OpenWA.
- `site-api.cjs` — the routes; `translationsOf`/`forgetTranslations` (replaced by one bounded `forgetTranslations`) and `workspaceRemove` serve `POST /api/auth/users/remove`.
- `fidelity-master.js` — the supervisor page (built into `outputs/wa-replica-prototype/master.js` as a copy).
- `deploy/upgrade.sh` — the upgrade script.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly two output files differ: `master.js` and `validation.json` (written by the validator).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. **The tests of the provisioner make a named pipe with `mkfifo`** (part of every Linux system); if the machine has no `mkfifo`, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout a7dee76 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the provisioner | `$NODE --test work/wa-replica/site-provisioner.test.cjs` | `pass 13`, `fail 0` (stand-ins for Docker and OpenWA; no container is made) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 18`, `fail 0` |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 14`, `fail 0` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (they send a 16 MB file twice; allow a few seconds) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-058/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/site-provisioner.cjs`, `site-provisioner.test.cjs` (Step 2)
- `work/wa-replica/site-api.cjs`, `site-api.test.cjs` (Step 3)
- `deploy/upgrade.sh` (Step 4)
- `work/wa-replica/fidelity-master.js`, `validate-scrm-lifecycle.cjs` (Step 5)
- `replica/build-log.md` (Step 6)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/master.js`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — `README.md`, `serve.cjs`, `site-auth.cjs`, `site-data.cjs`, `openwa-link.cjs`, `ai-relay.cjs`, `fidelity.css`, the other files under `deploy/`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. **Do not use Docker at all** — do not build an image, do not start a container, do not run the upgrade script.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/058-deletion-bounds` first.
- One commit is fine. Conventional commit message, e.g. `fix(scrm): bound the deleting of a workspace, as an independent review found`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 32 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the eight files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-058/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-058 && cat > /tmp/wa-scrm-plan-058/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 058: what the review of plan 057 found. No container is made and Docker is not needed.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; D="$ROOT/deploy"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the tests of the provisioner pass' "$("$NODE" --test "$W/site-provisioner.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 13 ℹ fail 0 '
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 18 ℹ fail 0 '
has 'the translations are looked for within bounds' "$W/site-api.cjs" 'const TRANSLATION_LANGUAGES = 12;'
has 'and in batches, between which the server answers others' "$W/site-api.cjs" 'await new Promise(resolve => setImmediate(resolve));'
has 'the translations of voice notes go too' "$W/site-api.cjs" 'for (const raw of [message.text, message.transcript]) {'
has 'signing the numbers out has a time limit in all' "$W/site-provisioner.cjs" 'const SIGN_OUT_BUDGET_MS = 60000;'
has 'an answer of OpenWA is read up to a limit' "$W/site-provisioner.cjs" 'if (size > ANSWER_MAX) return { status: 0, body: null };'
has 'a settings file is read only when it is a plain file' "$W/site-provisioner.cjs" 'stat?.isFile() && stat.size <= 4096'
has 'the upgrade script tries the gateway configuration first' "$D/upgrade.sh" 'deploy/gateway.conf has an error: nothing was changed'
has 'the page keeps the note about the phone' "$O/master.js" 'const NOT_SIGNED_OUT = '
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 删除账号的加固：按独立复查的结果'
same 'of the built files only the page and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(master\.js|validation\.json)$')" 0
same 'the files pass the syntax check' "$(node --check "$W/site-api.cjs" 2>/dev/null && node --check "$W/site-provisioner.cjs" 2>/dev/null && node --check "$W/fidelity-master.js" 2>/dev/null && bash -n "$D/upgrade.sh" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-058/smoke.sh && ls -l /tmp/wa-scrm-plan-058/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/site-provisioner.cjs work/wa-replica/site-provisioner.test.cjs work/wa-replica/site-api.cjs work/wa-replica/site-api.test.cjs deploy/upgrade.sh work/wa-replica/fidelity-master.js work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-058/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the tests of the provisioner pass` (got: ℹ pass 12 ℹ fail 0 ), `the translations are looked for within bounds`, `and in batches, between which the server answers others`, `the translations of voice notes go too`, `signing the numbers out has a time limit in all`, `an answer of OpenWA is read up to a limit`, `a settings file is read only when it is a plain file`, `the upgrade script tries the gateway configuration first`, `the page keeps the note about the phone` and `the build log has the entry` (ten checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The provisioner: signing out within bounds

#### `site-provisioner.cjs`

**Edit 2.1** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
const SIGN_OUT_WAIT_MS = 30000;
const ENGINE_TIMEOUT_MS = 120000;
```

Replace them with:

```text
const SIGN_OUT_WAIT_MS = 30000;
// How long the signing out of a deleted sub-site's numbers may take in all — the first server waits for less
// than two minutes —, how many of its sessions are looked at, and how much of an answer of its OpenWA is read.
const SIGN_OUT_BUDGET_MS = 60000;
const SESSIONS_AT_MOST = 20;
const ANSWER_MAX = 1024 * 1024;
const ENGINE_TIMEOUT_MS = 120000;
```

**Edit 2.2** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
// memory. openwaUrl: id → the address of a sub-site's OpenWA; wait, healthWaitMs and signOutWaitMs: how the
// provisioner waits for an OpenWA to come up, and for a number's connection when it is deleted (all replaceable
// for tests).
function create({ config, docker, freeMb, openwaUrl = openwaAddress, wait = sleep, healthWaitMs = HEALTH_WAIT_MS, signOutWaitMs = SIGN_OUT_WAIT_MS }) {
  const names = id => ({ server: `wa-scrm-site-${id}`, openwa: `wa-scrm-openwa-${id}`, volume: `wa-scrm-openwa-${id}`, settings: `openwa-${id}.env` });
```

Replace them with:

```text
// memory. openwaUrl: id → the address of a sub-site's OpenWA; wait, healthWaitMs and signOutWaitMs: how the
// provisioner waits for an OpenWA to come up, and for a number's connection when it is deleted; signOutBudgetMs:
// how long the signing out may take in all (all replaceable for tests).
function create({ config, docker, freeMb, openwaUrl = openwaAddress, wait = sleep, healthWaitMs = HEALTH_WAIT_MS, signOutWaitMs = SIGN_OUT_WAIT_MS, signOutBudgetMs = SIGN_OUT_BUDGET_MS }) {
  const names = id => ({ server: `wa-scrm-site-${id}`, openwa: `wa-scrm-openwa-${id}`, volume: `wa-scrm-openwa-${id}`, settings: `openwa-${id}.env` });
```

**Edit 2.3** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
  async function signOut(id, parts, volume) {
    const n = names(id), file = path.join(config.dataDir, n.settings);
    if (!parts.openwa) return volume ? false : null;
    const key = fs.existsSync(file) ? ((fs.readFileSync(file, 'utf8').match(/^OPENWA_API_KEY=(.+)$/m) || [])[1] || '').trim() : '';
    if (!key) return false;
```

Replace them with:

```text
  async function signOut(id, parts, volume) {
    const n = names(id), file = path.join(config.dataDir, n.settings), until = Date.now() + signOutBudgetMs, left = () => until - Date.now();
    if (!parts.openwa) return volume ? false : null;
    // The settings file is read when it is a plain file of a settings file's size: anything else in its place —
    // a pipe would never end — holds no key.
    const stat = fs.lstatSync(file, { throwIfNoEntry: false });
    const key = stat?.isFile() && stat.size <= 4096 ? ((fs.readFileSync(file, 'utf8').match(/^OPENWA_API_KEY=(.+)$/m) || [])[1] || '').trim() : '';
    if (!key) return false;
```

**Edit 2.4** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
      try {
        await healthy(id, signOutWaitMs);
      } catch {
```

Replace them with:

```text
      try {
        await healthy(id, Math.min(signOutWaitMs, left()));
      } catch {
```

**Edit 2.5** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
    }
    const openwaAsk = async (method, pathname) => {
      try {
        const answer = await fetch(openwaUrl(id) + pathname, { method, headers: { 'X-API-Key': key }, signal: AbortSignal.timeout(20000) });
        return { status: answer.status, body: await answer.json().catch(() => null) };
      } catch {
```

Replace them with:

```text
    }
    // Each call has the time that is left — twenty seconds at most —, and an answer is read up to ANSWER_MAX.
    const openwaAsk = async (method, pathname) => {
      if (left() <= 0) return { status: 0, body: null };
      try {
        const answer = await fetch(openwaUrl(id) + pathname, { method, headers: { 'X-API-Key': key }, signal: AbortSignal.timeout(Math.min(20000, left())) });
        const chunks = [];
        let size = 0;
        for await (const chunk of answer.body || []) {
          size += chunk.length;
          if (size > ANSWER_MAX) return { status: 0, body: null };
          chunks.push(chunk);
        }
        let body = null;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {}
        return { status: answer.status, body };
      } catch {
```

**Edit 2.6** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
    let linked = 0, out = 0;
    for (const session of listed.body) {
      if (typeof session?.id !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(session.id)) continue;
```

Replace them with:

```text
    let linked = 0, out = 0;
    for (const session of listed.body.slice(0, SESSIONS_AT_MOST)) {
      if (typeof session?.id !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(session.id)) continue;
```

**Edit 2.7** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
        linked += 1;
        // A linked number is signed out once its connection is up again.
        for (const end = Date.now() + signOutWaitMs; session.status !== 'ready' && Date.now() < end;) {
          await wait(2000);
```

Replace them with:

```text
        linked += 1;
        // A linked number is signed out once its connection is up again — while there is time left.
        for (const end = Date.now() + Math.min(signOutWaitMs, left()); session.status !== 'ready' && Date.now() < end;) {
          await wait(2000);
```

**Edit 2.8** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
    }
    return linked ? out === linked : null;
```

Replace them with:

```text
    }
    // Sessions beyond those looked at may hold a number as well: then it cannot be said that every one is out.
    if (listed.body.length > SESSIONS_AT_MOST) return false;
    return linked ? out === linked : null;
```

#### `site-provisioner.test.cjs`

**Edit 2.9** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
const path = require('node:path');
const { create, engine, configFromEnv, client, clientFromEnv, openwaAddress, RESERVED } = require('./site-provisioner.cjs');
```

Replace them with:

```text
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { create, engine, configFromEnv, client, clientFromEnv, openwaAddress, RESERVED } = require('./site-provisioner.cjs');
```

**Edit 2.10** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
const keys = [];
// The sessions of the sub-sites' numbers, by sub-site: { id, status, phone, polls }. A sub-site is known by the
// restricted key its settings file holds. sessionCalls: what was asked of them, in order.
const sessions = new Map(), sessionCalls = [];
let logoutDelay = 0;
```

Replace them with:

```text
const keys = [];
// The sessions of the sub-sites' numbers, by sub-site: { id, status, phone, polls, stuck }. A sub-site is known by
// the restricted key its settings file holds. sessionCalls: what was asked of them, in order. hugeSites: the
// sub-sites whose list of sessions is answered with far too much.
const sessions = new Map(), sessionCalls = [], hugeSites = new Set();
let logoutDelay = 0;
```

**Edit 2.11** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
  sessionCalls.push(`${req.method} ${site}${id ? ' ' + id : ''}${action ? ' ' + action : ''}`);
  if (!id) return send(200, list.map(({ polls, ...session }) => session));
  const session = list.find(s => s.id === id);
```

Replace them with:

```text
  sessionCalls.push(`${req.method} ${site}${id ? ' ' + id : ''}${action ? ' ' + action : ''}`);
  if (!id && hugeSites.has(site)) return send(200, 'x'.repeat(2 * 1024 * 1024));
  if (!id) return send(200, list.map(({ polls, stuck, ...session }) => session));
  const session = list.find(s => s.id === id);
```

**Edit 2.12** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
    // a linked number whose connection is down is up again after it was asked about twice
    if (session.status === 'disconnected' && session.phone && ++session.polls >= 2) session.status = 'ready';
    const { polls, ...shown } = session;
    return send(200, shown);
```

Replace them with:

```text
    // a linked number whose connection is down is up again after it was asked about twice
    if (session.status === 'disconnected' && session.phone && !session.stuck && ++session.polls >= 2) session.status = 'ready';
    const { polls, stuck, ...shown } = session;
    return send(200, shown);
```

**Edit 2.13** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
let base, openwaBase;
const provisioner = () => create({ config, docker: engine(socket), freeMb: () => free, openwaUrl: () => openwaBase, wait: () => new Promise(resolve => setImmediate(resolve)), healthWaitMs: 150, signOutWaitMs: 150 });
let front;
```

Replace them with:

```text
let base, openwaBase;
const provisioner = () => create({ config, docker: engine(socket), freeMb: () => free, openwaUrl: () => openwaBase, wait: () => new Promise(resolve => setImmediate(resolve)), healthWaitMs: 150, signOutWaitMs: 150, signOutBudgetMs: 2000 });
let front;
```

**Edit 2.14** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text

test('an answer of the engine about a volume that is neither "there" nor "not there" makes nothing and takes nothing away', async () => {
```

Replace them with:

```text

test('signing out the numbers of a deleted sub-site is bounded — in time, in sessions, in what is read of an answer; a settings file that is no plain file holds no key — and the sub-site is deleted all the same', async () => {
  const make = async id => { assert.equal((await call('/sites', { method: 'POST', body: { id } })).status, 202, id); assert.equal((await settled(id)).state, 'ready', id); };
  // a stopped sub-site whose number never comes back, deleted by a provisioner with little time to spare
  await make('y1');
  sessions.set('y1', [{ id: 'ffff-1', status: 'ready', phone: '15550011', polls: 0 }]);
  assert.equal((await call('/sites/y1/stop', { method: 'POST' })).status, 200);
  Object.assign(sessions.get('y1')[0], { status: 'disconnected', stuck: true });
  const hasty = create({ config, docker: engine(socket), freeMb: () => free, openwaUrl: () => openwaBase, wait: () => new Promise(resolve => setTimeout(resolve, 20)), healthWaitMs: 150, signOutWaitMs: 5000, signOutBudgetMs: 300 });
  const server = http.createServer(hasty.handle);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const started = Date.now();
    const answer = await (await fetch(`http://127.0.0.1:${server.address().port}/sites/y1/remove`, { method: 'POST', headers: { Authorization: 'Bearer ' + SECRET } })).json();
    assert.deepEqual([answer, Date.now() - started < 2000, containers.has('wa-scrm-openwa-y1')], [{ id: 'y1', state: 'removed', signedOut: false }, true, false]);
  } finally {
    server.closeAllConnections(); server.close();
  }
  // twenty-five sessions: twenty are looked at, and it cannot be said that every number is signed out
  await make('y2');
  sessions.set('y2', Array.from({ length: 25 }, (_, i) => ({ id: 'gggg-' + i, status: 'qr_ready', phone: null, polls: 0 })));
  sessionCalls.length = 0;
  assert.deepEqual([(await call('/sites/y2/remove', { method: 'POST' })).json, sessionCalls.filter(line => line.startsWith('DELETE')).length], [{ id: 'y2', state: 'removed', signedOut: false }, 20]);
  // an answer far too large is no answer
  await make('y3');
  hugeSites.add('y3');
  assert.deepEqual((await call('/sites/y3/remove', { method: 'POST' })).json, { id: 'y3', state: 'removed', signedOut: false });
  hugeSites.delete('y3');
  // a pipe in place of the settings file: nothing waits for it, and it goes with the rest
  await make('y4');
  const settingsFile = path.join(dataDir, 'openwa-y4.env');
  fs.rmSync(settingsFile);
  assert.equal(spawnSync('mkfifo', [settingsFile]).status, 0);
  assert.deepEqual([(await call('/sites/y4/remove', { method: 'POST' })).json, fs.existsSync(settingsFile)], [{ id: 'y4', state: 'removed', signedOut: false }, false]);
});

test('an answer of the engine about a volume that is neither "there" nor "not there" makes nothing and takes nothing away', async () => {
```

**Verify**: `sha256sum work/wa-replica/site-provisioner.cjs work/wa-replica/site-provisioner.test.cjs` → `dde93e9b07f4e68053224e0bfa238cf50f9aadb4a0bec3cbda363d1757c61fcf`, `914f61420960e717f93a0de2d68674cb040fbcb5199f1e61f15cbfeb2840e4ab`; `node --check work/wa-replica/site-provisioner.cjs` exits 0; `$NODE --test work/wa-replica/site-provisioner.test.cjs` → `pass 13`, `fail 0`. If a checksum does not match, restore the file with `git checkout a7dee76 -- <file>` and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 3: The routes: the translations within bounds; the first server's own name; a shared workspace

#### `site-api.cjs`

**Edit 3.1** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
const NAME_MAX = 60;
// An employee's sign-in name where it is the name of a sub-site as well: what does as the name of a host.
```

Replace them with:

```text
const NAME_MAX = 60;
// How much of a deleted sub-site's data is looked at for the translations the relay keeps of it: the languages
// (the page offers 12), the longest text the relay translates (ai-relay.cjs MAX_TEXT), and fingerprints in all.
const TRANSLATION_LANGUAGES = 12;
const TRANSLATED_MAX = 4000;
const TRANSLATIONS_AT_MOST = 2000000;
// An employee's sign-in name where it is the name of a sub-site as well: what does as the name of a host.
```

**Edit 3.2** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
    if (!EMPLOYEE.test(id) || RESERVED.includes(id)) throw problem('invalid-username');
    if (!body.name.trim()) throw problem('invalid-name');
```

Replace them with:

```text
    if (!EMPLOYEE.test(id) || RESERVED.includes(id)) throw problem('invalid-username');
    if (id === siteId) throw problem('invalid-username');
    if (!body.name.trim()) throw problem('invalid-name');
```

**Edit 3.3** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
    if (!workspaces || target.role !== 'agent' || auth.listUsers().some(user => user.site === target.site && !user.disabled)) return {};
    try {
```

Replace them with:

```text
    if (!workspaces || target.role !== 'agent' || auth.listUsers().some(user => user.site === target.site && !user.disabled)) return {};
    // A name no sub-site can have, or the first server's own, has no sub-site to stop.
    if (!SITE_ID.test(target.site) || RESERVED.includes(target.site) || target.site === siteId) return {};
    try {
```

**Edit 3.4** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
  }
  // The fingerprints under which the relay keeps the translations of a sub-site's messages for everyone
  // (ai-relay.cjs: the language and the text), read from the sub-site's data before it is deleted: every text of
  // its messages, for every language they were translated into and the one its employee reads in.
  function translationsOf(id) {
    const file = path.join(dir, `site-${id}.db`);
    if (!fs.existsSync(file)) return [];
    const doc = openData(file);
    let data;
    try {
      data = doc.read(['messages', 'ai']).data;
    } finally {
      doc.close();
    }
    const languages = new Set(), texts = new Set();
    if (typeof data.ai?.readLanguage === 'string') languages.add(data.ai.readLanguage.trim());
    for (const list of Object.values(data.messages && typeof data.messages === 'object' ? data.messages : {})) {
      for (const message of Array.isArray(list) ? list : []) {
        if (typeof message?.text === 'string' && message.text.trim()) texts.add(message.text.trim());
        if (typeof message?.translatedTo === 'string') languages.add(message.translatedTo.trim());
      }
    }
    languages.delete('');
    return [...languages].flatMap(language => [...texts].map(text => crypto.createHash('sha256').update(language + '\n' + text).digest('hex')));
  }
  // Those translations taken out of the relay's store; nothing else of it is touched.
  function forgetTranslations(id, keys) {
    const file = path.join(dir, 'ai-translations.db');
    if (!keys.length || !fs.existsSync(file)) return;
    const db = new DatabaseSync(file);
    try {
      db.exec('PRAGMA busy_timeout = 5000');
      const drop = db.prepare('DELETE FROM translations WHERE key = ?');
      let rows = 0;
      db.exec('BEGIN');
      for (const key of keys) rows += Number(drop.run(key).changes);
      db.exec('COMMIT');
      console.log(`site workspace translations removed site=${id} rows=${rows}`);
    } finally {
      db.close();
```

Replace them with:

```text
  }
  // The translations the relay keeps for everyone of a sub-site's messages (ai-relay.cjs: a fingerprint of the
  // language and the text), taken out of its store before the sub-site's data goes: of every text and voice
  // transcript of its messages, for every language they were translated into and the one its employee reads in.
  // The data is read part by part, and only what a translation can have come from is looked at — at most
  // TRANSLATION_LANGUAGES languages, texts the relay translates, TRANSLATIONS_AT_MOST fingerprints in all —; the
  // work is done in batches, and the server answers other requests between them.
  async function forgetTranslations(id) {
    const file = path.join(dir, `site-${id}.db`), storeFile = path.join(dir, 'ai-translations.db');
    if (!fs.existsSync(file) || !fs.existsSync(storeFile)) return;
    const source = new DatabaseSync(file), db = new DatabaseSync(storeFile);
    try {
      source.exec('PRAGMA busy_timeout = 5000');
      db.exec('PRAGMA busy_timeout = 5000');
      // The messages one by one: a part is one customer's messages; the field stored whole is a map of them.
      const messages = function* () {
        for (const { json } of source.prepare("SELECT json FROM doc WHERE key = 'messages' OR key LIKE 'messages/%' ORDER BY key").iterate()) {
          let value = null;
          try {
            value = JSON.parse(json);
          } catch {}
          for (const list of Array.isArray(value) ? [value] : Object.values(value && typeof value === 'object' ? value : {})) {
            for (const message of Array.isArray(list) ? list : []) if (message && typeof message === 'object') yield message;
          }
        }
      };
      const languages = new Set();
      const language = value => { if (typeof value === 'string' && value.trim() && languages.size < TRANSLATION_LANGUAGES) languages.add(value.trim()); };
      try {
        language(JSON.parse(source.prepare("SELECT json FROM doc WHERE key = 'ai'").get()?.json ?? 'null')?.readLanguage);
      } catch {}
      for (const message of messages()) language(message.translatedTo);
      const fingerprint = (language, text) => crypto.createHash('sha256').update(language + '\n' + text).digest('hex');
      const drop = db.prepare('DELETE FROM translations WHERE key = ?');
      let rows = 0, done = 0;
      const forget = async () => {
        for (const message of messages()) {
          for (const raw of [message.text, message.transcript]) {
            const text = typeof raw === 'string' ? raw.trim() : '';
            if (!text || text.length > TRANSLATED_MAX) continue;
            for (const to of languages) {
              rows += Number(drop.run(fingerprint(to, text)).changes);
              if (++done >= TRANSLATIONS_AT_MOST) return;
              if (done % 500 === 0) {
                db.exec('COMMIT');
                await new Promise(resolve => setImmediate(resolve));
                db.exec('BEGIN');
              }
            }
          }
        }
      };
      db.exec('BEGIN');
      try {
        await forget();
      } finally {
        db.exec('COMMIT');
      }
      console.log(`site workspace translations removed site=${id} rows=${rows}`);
    } finally {
      source.close();
      db.close();
```

**Edit 3.5** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
  // An employee's sub-site goes with the last account of it — the account is deleted only once it is gone — and
  // the translations of its messages with it. A sub-site the platform does not know, or whose name no sub-site
  // can have, is nothing to delete. Where the platform does not make sub-sites an employee's account is not
  // deleted here: its data would stay behind.
  async function workspaceRemove(actor, target) {
    if (target.role !== 'agent' || auth.listUsers().some(user => user.site === target.site && user.username !== target.username)) return {};
    if (!workspaces) throw problem('workspace-unavailable');
    if (!SITE_ID.test(target.site) || RESERVED.includes(target.site)) return {};
    let keys = [], removed = null;
    try {
      keys = translationsOf(target.site);
    } catch (error) {
      console.error(`site workspace translations unread site=${target.site} error=${error.code || error.name}`);
    }
    await asked('remove', actor, target.site, async () => {
```

Replace them with:

```text
  // An employee's sub-site goes with the last account of it — the account is deleted only once it is gone — and
  // the translations of its messages with it (taken first: they are what the relay keeps, and the sub-site's
  // data is what they are found by). A sub-site the platform does not know, a name no sub-site can have, or the
  // first server's own is nothing to delete. Where the platform does not make sub-sites an employee's account is
  // not deleted here: its data would stay behind. A sub-site another account still has is said so (shared).
  async function workspaceRemove(actor, target) {
    if (target.role !== 'agent') return {};
    if (auth.listUsers().some(user => user.site === target.site && user.username !== target.username)) return { shared: true };
    if (!workspaces) throw problem('workspace-unavailable');
    if (!SITE_ID.test(target.site) || RESERVED.includes(target.site) || target.site === siteId) return {};
    try {
      await forgetTranslations(target.site);
    } catch (error) {
      console.error(`site workspace translations failed site=${target.site} error=${error.code || error.name}`);
    }
    let removed = null;
    await asked('remove', actor, target.site, async () => {
```

**Edit 3.6** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
    if (!removed) return {};
    try {
      forgetTranslations(target.site, keys);
    } catch (error) {
      console.error(`site workspace translations failed site=${target.site} error=${error.code || error.name}`);
    }
    return { workspace: 'removed', ...(removed.signedOut === false ? { phone: 'not-signed-out' } : {}) };
```

Replace them with:

```text
    if (!removed) return {};
    return { workspace: 'removed', ...(removed.signedOut === false ? { phone: 'not-signed-out' } : {}) };
```

**Edit 3.7** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
      const actor = manager(req), target = managed(actor, (await readJson(req)).username);
      const workspace = await workspaceRemove(actor, target);
      auth.deleteUser(target.username);
      console.log(`site account removed by=${actor.username} user=${target.username} role=${target.role}`);
      return { body: { ok: true, ...workspace } };
    },
```

Replace them with:

```text
      const actor = manager(req), target = managed(actor, (await readJson(req)).username);
      const { shared, ...workspace } = await workspaceRemove(actor, target);
      auth.deleteUser(target.username);
      console.log(`site account removed by=${actor.username} user=${target.username} role=${target.role}`);
      // A sub-site another account still has stays — and stops when none of them can sign in any more.
      return { body: { ok: true, ...workspace, ...(shared ? await workspaceOff(actor, target) : {}) } };
    },
```

#### `site-api.test.cjs`

**Edit 3.8** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
    'messages/c1': [{ id: 'm1', text: ' Hola, ¿tienen cajas? ', translated: '你好，有箱子吗？', translatedTo: '简体中文' }, { id: 'm2', text: 'Gracias', translatedTo: 'English' }],
    'messages/c2': [{ id: 'm3', text: '[图片]' }],
    ai: { readLanguage: '简体中文' },
```

Replace them with:

```text
    'messages/c1': [{ id: 'm1', text: ' Hola, ¿tienen cajas? ', translated: '你好，有箱子吗？', translatedTo: '简体中文' }, { id: 'm2', text: 'Gracias', translatedTo: 'English' }],
    'messages/c2': [{ id: 'm3', text: '[图片]' }, { id: 'm4', text: '[语音]', transcript: 'Necesito diez cajas', translatedTo: '简体中文' }, { id: 'm5', text: 'x'.repeat(4001), translatedTo: '简体中文' }],
    // a language for each of these — more than a page ever offered: only so many are looked at
    'messages/c3': Array.from({ length: 13 }, (_, i) => ({ id: 'l' + i, text: 'Hola', translatedTo: 'Lang' + String(i + 1).padStart(2, '0') })),
    ai: { readLanguage: '简体中文' },
```

**Edit 3.9** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
  store.exec('CREATE TABLE IF NOT EXISTS translations (key TEXT PRIMARY KEY, text TEXT NOT NULL, at TEXT NOT NULL)');
  for (const [to, text] of [['简体中文', 'Hola, ¿tienen cajas?'], ['English', 'Gracias'], ['简体中文', 'Gracias'], ['简体中文', 'Bonjour à tous']]) store.prepare('INSERT OR REPLACE INTO translations (key, text, at) VALUES (?, ?, ?)').run(fingerprint(to, text), 'translated', 'now');
  const kept = () => store.prepare('SELECT key FROM translations').all().map(row => row.key);
```

Replace them with:

```text
  store.exec('CREATE TABLE IF NOT EXISTS translations (key TEXT PRIMARY KEY, text TEXT NOT NULL, at TEXT NOT NULL)');
  for (const [to, text] of [['简体中文', 'Hola, ¿tienen cajas?'], ['English', 'Gracias'], ['简体中文', 'Gracias'], ['简体中文', 'Bonjour à tous'], ['简体中文', 'Necesito diez cajas'], ['Lang10', 'Gracias'], ['Lang11', 'Gracias'], ['简体中文', 'x'.repeat(4001)]]) store.prepare('INSERT OR REPLACE INTO translations (key, text, at) VALUES (?, ?, ?)').run(fingerprint(to, text), 'translated', 'now');
  const kept = () => store.prepare('SELECT key FROM translations').all().map(row => row.key);
```

**Edit 3.10** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
    assert.deepEqual([exists('zara'), (await call('/api/auth/me', { cookie: zara, base })).status, (await call('/api/auth/login', { method: 'POST', base, body: { username: 'zara', password: PASSWORD } })).status, asked], [false, 401, 401, []]);
    // an employee whose sub-site another account still has — also one that is switched off: the account only
    assert.deepEqual([(await send(ivo, 'tim')).json, exists('tim'), asked, states.has('pair')], [{ ok: true }, false, [], true]);
    // the last account of it: the sub-site goes too — and while the provisioner refuses, the account stays
```

Replace them with:

```text
    assert.deepEqual([exists('zara'), (await call('/api/auth/me', { cookie: zara, base })).status, (await call('/api/auth/login', { method: 'POST', base, body: { username: 'zara', password: PASSWORD } })).status, asked], [false, 401, 401, []]);
    // an employee whose sub-site another account still has — also one that is switched off: the account only;
    // and as nobody can sign in to the sub-site any more, it stops
    assert.deepEqual([(await send(ivo, 'tim')).json, exists('tim'), asked, states.has('pair')], [{ ok: true, workspace: 'stopped' }, false, ['stop pair'], true]);
    asked.length = 0;
    // the last account of it: the sub-site goes too — and while the provisioner refuses, the account stays
```

**Edit 3.11** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
    assert.deepEqual([(await send(ivo, 'tom')).json, exists('tom'), asked, states.has('pair')], [{ ok: true, workspace: 'removed' }, false, ['remove pair'], false]);
    // rosa's: her sub-site, and the translations of its messages — those of another stay; her session ends
    asked.length = 0;
    assert.deepEqual((await send(ivo, 'rosa')).json, { ok: true, workspace: 'removed' });
    assert.deepEqual([exists('rosa'), asked, kept(), (await call('/api/auth/me', { cookie: rosa, base })).status], [false, ['remove rosa'], [fingerprint('简体中文', 'Bonjour à tous')], 401]);
    // a number that could not be signed out at WhatsApp is said so
```

Replace them with:

```text
    assert.deepEqual([(await send(ivo, 'tom')).json, exists('tom'), asked, states.has('pair')], [{ ok: true, workspace: 'removed' }, false, ['remove pair'], false]);
    // rosa's: her sub-site, and the translations of its messages and voice notes — those of another stay, and
    // what no translation can have come from is not looked at; her session ends
    asked.length = 0;
    assert.deepEqual((await send(ivo, 'rosa')).json, { ok: true, workspace: 'removed' });
    assert.deepEqual([exists('rosa'), asked, kept().sort(), (await call('/api/auth/me', { cookie: rosa, base })).status], [false, ['remove rosa'], [fingerprint('简体中文', 'Bonjour à tous'), fingerprint('Lang11', 'Gracias'), fingerprint('简体中文', 'x'.repeat(4001))].sort(), 401]);
    // a number that could not be signed out at WhatsApp is said so
```

**Edit 3.12** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
    signedOut = true;
    // a sub-site the provisioner does not know, and a name no sub-site can have: the account only
```

Replace them with:

```text
    signedOut = true;
    // the first server's own name is no employee's sub-site: neither made nor deleted
    await site.auth.createUser({ username: 'hqa', role: 'agent', name: 'Hqa', site: 'hq3' });
    asked.length = 0;
    assert.deepEqual([(await call('/api/auth/users', { method: 'POST', cookie: ivo, base, body: { username: 'hq3', name: 'Own', role: 'agent' } })).json, (await send(ivo, 'hqa')).json, exists('hqa'), asked], [{ error: 'invalid-username' }, { ok: true }, false, []]);
    // a sub-site the provisioner does not know, and a name no sub-site can have: the account only
```

**Edit 3.13** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
    const lines = logged.filter(line => /^site (account removed|workspace (remove|translations))/.test(line));
    for (const line of ['site account removed by=joy user=zara role=supervisor', 'site account removed by=ivo user=tim role=agent', 'site workspace remove failed by=ivo site=pair error=workspace-busy', 'site workspace remove ok by=ivo site=pair', 'site workspace remove ok by=ivo site=rosa', 'site workspace translations removed site=rosa rows=3', 'site account removed by=ivo user=rosa role=agent', 'site account removed by=ivo user=quint role=supervisor']) assert(lines.includes(line), line + '\n' + lines.join('\n'));
    assert(!logged.join('\n').includes(PASSWORD), 'a password in the log');
```

Replace them with:

```text
    const lines = logged.filter(line => /^site (account removed|workspace (remove|translations))/.test(line));
    for (const line of ['site account removed by=joy user=zara role=supervisor', 'site account removed by=ivo user=tim role=agent', 'site workspace remove failed by=ivo site=pair error=workspace-busy', 'site workspace remove ok by=ivo site=pair', 'site workspace remove ok by=ivo site=rosa', 'site workspace translations removed site=rosa rows=5', 'site account removed by=ivo user=rosa role=agent', 'site account removed by=ivo user=quint role=supervisor']) assert(lines.includes(line), line + '\n' + lines.join('\n'));
    assert(!logged.join('\n').includes(PASSWORD), 'a password in the log');
```

**Verify**: `sha256sum work/wa-replica/site-api.cjs work/wa-replica/site-api.test.cjs` → `f956c122b9bf9dabf2cee5296aa9491c34f7b29ac85094b09871505d65e452d9`, `9483bfbe56946c658c98c070663a50988ead9471aa12b35b4b346b7683873f83`; `node --check work/wa-replica/site-api.cjs` exits 0; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 18`, `fail 0`. If a checksum does not match, restore the file with `git checkout a7dee76 -- <file>` and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 4: The upgrade script

#### `deploy/upgrade.sh`

**Edit 4.1** — `deploy/upgrade.sh`. Find exactly these lines (they occur once):

```text
IMAGE=${IMAGE:-wa-scrm-server:current}
echo "building $IMAGE"
```

Replace them with:

```text
IMAGE=${IMAGE:-wa-scrm-server:current}
# The gateway's configuration is tried before anything is changed: one with an error stops the upgrade here.
GATEWAY_IMAGE=$(sed -n 's/^    image: \(nginx:[^ ]*\)$/\1/p' deploy/compose.yml)
docker run --rm --entrypoint nginx -v "$PWD/deploy/gateway.conf:/etc/nginx/nginx.conf:ro" "$GATEWAY_IMAGE" -t -q || { echo "deploy/gateway.conf has an error: nothing was changed" >&2; exit 1; }
echo "building $IMAGE"
```

**Edit 4.2** — `deploy/upgrade.sh`. Find exactly these lines (they occur once):

```text
else
  docker exec wa-scrm-gateway nginx -s reload 2> /dev/null || true
fi
```

Replace them with:

```text
else
  docker exec wa-scrm-gateway nginx -s reload || echo "the gateway could NOT read its configuration again" >&2
fi
```

**Verify**: `sha256sum deploy/upgrade.sh` → `6ea6f36b3a04fb42397a8ff81b5e42a1be09c453c75397d39667a309c29d0ec6`; `bash -n deploy/upgrade.sh` exits 0; `git ls-files -s deploy/upgrade.sh` still begins with `100644`. Do not run it. If the checksum does not match, restore the file with `git checkout a7dee76 -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 5: The page, the validator — and the build

#### `fidelity-master.js`

**Edit 5.1** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
  const REMOVE_PROBLEM = { 'workspace-busy': '这个工作区正在准备或停止中，请稍后再试。', 'workspace-unavailable': '暂时无法删除工作区，请稍后再试。' };
  async function removeAccount(form) {
```

Replace them with:

```text
  const REMOVE_PROBLEM = { 'workspace-busy': '这个工作区正在准备或停止中，请稍后再试。', 'workspace-unavailable': '暂时无法删除工作区，请稍后再试。' };
  const NOT_SIGNED_OUT = 'WhatsApp 号码没能在手机上自动退出：如果这位员工绑定过号码，请在手机 WhatsApp 的「设置 → 已关联的设备」中把它移除。';
  async function removeAccount(form) {
```

**Edit 5.2** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    const answer = await post('/api/auth/users/remove', { username });
    if (!asking.isConnected) say(answer.status === 200 ? '账号已删除' : problemText(answer));
    else if (answer.status !== 200) removeForm(username, REMOVE_PROBLEM[answer.body.error] || problemText(answer));
    else if (answer.body.phone === 'not-signed-out') showDialog('账号已删除', '<p>账号已删除。WhatsApp 号码没能在手机上自动退出：如果这位员工绑定过号码，请在手机 WhatsApp 的「设置 → 已关联的设备」中把它移除。</p>', DONE);
    else {
```

Replace them with:

```text
    const answer = await post('/api/auth/users/remove', { username });
    const phone = answer.status === 200 && answer.body.phone === 'not-signed-out';
    // What is left to do on the phone is said in a dialog — also when the one that asked was closed meanwhile,
    // unless another one is open by now: then the note says it.
    if (phone && (asking.isConnected || !$('#dialog').open)) showDialog('账号已删除', `<p>账号已删除。${NOT_SIGNED_OUT}</p>`, DONE);
    else if (!asking.isConnected) say(phone ? '账号已删除。' + NOT_SIGNED_OUT : answer.status === 200 ? '账号已删除' : problemText(answer));
    else if (answer.status !== 200) removeForm(username, REMOVE_PROBLEM[answer.body.error] || problemText(answer));
    else {
```

#### `validate-scrm-lifecycle.cjs`

**Edit 5.3** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
}
assert(apiSource.indexOf('const actor = manager(req), target = managed(actor, (await readJson(req)).username);\n      const workspace = await workspaceRemove(actor, target);\n      auth.deleteUser(target.username);') > 0, 'an account must be deleted only after the sub-site that goes with it');
assert(read(path.join(__dirname, 'ai-relay.cjs')).includes("const translationKey = (to, text) => crypto.createHash('sha256').update(to + '\\n' + text).digest('hex');"), 'the fingerprint of a translation must be the relay\'s own');
```

Replace them with:

```text
}
assert(apiSource.indexOf('const actor = manager(req), target = managed(actor, (await readJson(req)).username);\n      const { shared, ...workspace } = await workspaceRemove(actor, target);\n      auth.deleteUser(target.username);') > 0, 'an account must be deleted only after the sub-site that goes with it');
// What the review of plan 057 found, held: the translations of a deleted sub-site are looked for part by part and
// within bounds, in batches between which the server answers others; the first server's own name is no
// employee's sub-site; a sub-site another account has stops when none can sign in; signing numbers out is bounded
// in time, sessions and answers, and a settings file is read only when it is a plain file; the gateway's
// configuration is tried before an upgrade changes anything; the note about the phone is not lost.
for (const required of ['const TRANSLATION_LANGUAGES = 12;', 'const TRANSLATED_MAX = 4000;', 'if (++done >= TRANSLATIONS_AT_MOST) return;', 'await new Promise(resolve => setImmediate(resolve));', 'for (const raw of [message.text, message.transcript]) {', "if (id === siteId) throw problem('invalid-username');", "if (!SITE_ID.test(target.site) || RESERVED.includes(target.site) || target.site === siteId) return {};", '...(shared ? await workspaceOff(actor, target) : {})']) {
  assert(apiSource.includes(required), `site-api.cjs is missing ${required}`);
}
assert(read(path.join(__dirname, 'ai-relay.cjs')).includes('const MAX_TEXT = 4000;'), 'the longest text looked at for a translation must be the longest the relay translates');
assert(apiSource.indexOf('await forgetTranslations(target.site);') < apiSource.indexOf('removed = await workspaces.remove(target.site);'), 'the translations must be looked for while the sub-site\'s data is still there');
for (const required of ['const SIGN_OUT_BUDGET_MS = 60000;', 'const SESSIONS_AT_MOST = 20;', 'const ANSWER_MAX = 1024 * 1024;', 'stat?.isFile() && stat.size <= 4096', 'if (size > ANSWER_MAX) return { status: 0, body: null };', 'signal: AbortSignal.timeout(Math.min(20000, left()))', 'for (const session of listed.body.slice(0, SESSIONS_AT_MOST)) {']) {
  assert(provisionerSource.includes(required), `site-provisioner.cjs is missing ${required}`);
}
assert(deploy('upgrade.sh').indexOf('-t -q || { echo "deploy/gateway.conf has an error: nothing was changed" >&2; exit 1; }') > 0 && deploy('upgrade.sh').indexOf('-t -q ||') < deploy('upgrade.sh').indexOf('"${COMPOSE[@]}" up -d\n'), 'the upgrade script must try the gateway\'s configuration before it changes anything');
assert(masterSource.includes("if (phone && (asking.isConnected || !$('#dialog').open)) showDialog('账号已删除', `<p>账号已删除。${NOT_SIGNED_OUT}</p>`, DONE);"), 'the note about the phone must not be lost when the dialog was closed meanwhile');
assert(read(path.join(__dirname, 'ai-relay.cjs')).includes("const translationKey = (to, text) => crypto.createHash('sha256').update(to + '\\n' + text).digest('hex');"), 'the fingerprint of a translation must be the relay\'s own');
```

**Verify**: `sha256sum work/wa-replica/fidelity-master.js work/wa-replica/validate-scrm-lifecycle.cjs` → `28df13dc5829117ffa2ca8ce727b279249964744ec3766605cd3bfb9fe2526b7`, `6ad53eafcfbc3d35f7296e566d763f206a44685a02cfc44e46a687e0ed32f270`; `git checkout a7dee76 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `master.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else (if `icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one); `cmp outputs/wa-replica-prototype/master.js work/wa-replica/fidelity-master.js` exits 0. If a checksum does not match, restore the file with `git checkout a7dee76 -- <file>` and apply its instructions again; if it still does not match, or another output file changed, STOP.

### Step 6: Build log, final verification

#### `replica/build-log.md`

**Append 6.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 删除账号的加固：按独立复查的结果 · 2026-11-23

删除账号上线前做了一次独立的安全复查（只读代码），没有发现严重或高风险的问题。这一步处理了复查提出的其余问题，删除功能的用法不变：

- 删除员工时会顺带删除共用翻译缓存里该工作区消息的译文。现在逐段读取工作区数据，只看翻译可能来自的内容（最多 12 种语言、AI 中转会翻译的文本长度），分批删除，期间主服务照常响应其他请求；即使工作区里存放了刻意构造的大量数据，也不会拖垮主服务。语音转写文字的译文现在也一并删除。
- 让号码在手机上退出的步骤有了总时限（60 秒），所以整个删除在主服务等待的时间内完成；查看的会话数量和读取的应答大小都有上限；连接设置文件只有是普通文件时才会读取。
- 删除一位员工后，如果同一工作区剩下的账号都已停用，工作区会停止并空出位置。主服务自己的编号不会被当作员工的工作区。
- 删除过程中关掉了确认框时，"号码没能在手机上自动退出"的提示仍会显示。
- 升级脚本在做任何改动之前先检查网关配置；配置有错误时直接停止，什么都不改。

验证：接口测试覆盖以上各种情形（包括号码一直不恢复连接、25 个会话、过大的应答、用管道文件替代设置文件、超出数量的语言和过长的文本）；浏览器测试覆盖确认框中途被关掉的情形；并在真实 Docker 上重新走完创建、停用、启用、升级和删除。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout a7dee76 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-058/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `443ac067fbea8e7ec260c2576b5a41c6f2896f957425fd3e56a5b9b6a18d6afa`; `git status --porcelain` lists exactly these ten as changed and nothing as new: the eight files of the table in "Current state" and `outputs/wa-replica-prototype/master.js`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Tests of the provisioner** (13; one new): a stopped workspace whose number never comes back, deleted by a provisioner with little time to spare — done within its budget, said not to be signed out; twenty-five sessions — twenty looked at, said not to be signed out; an answer of OpenWA far too large — no answer; a named pipe in place of the settings file — nothing waits for it, and it goes with the rest. Each workspace is deleted all the same.
- **Sign-in and data tests** (18; one extended): the translations of a deleted workspace's voice-note transcripts go too; languages beyond twelve and texts beyond 4000 characters are not looked at; an employee whose shared workspace nobody else can sign in to any more stops it; the first server's own id is neither made nor deleted as an employee's workspace.
- **Validator** — the facts of the review's points (see the block changed in Step 5).
- **Smoke** (`/tmp/wa-scrm-plan-058/smoke.sh`) — the same facts, the syntax of the files, which built files changed, and the tests of the server, the relay and the link.
- **Verified by the reviewer, not by you**: in a browser against a stand-in provisioner — closing the dialog while a deletion runs still brings the note about the phone; the earlier sessions. On a real Docker, on a test port and removed again: the whole stack with deletions, and an upgrade, whose gateway test refuses a configuration with an error before anything changes.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout a7dee76 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/site-provisioner.test.cjs` → `pass 13`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 18`, `fail 0`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 14`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-058/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/site-provisioner.cjs` → `dde93e9b07f4e68053224e0bfa238cf50f9aadb4a0bec3cbda363d1757c61fcf`
- [ ] `sha256sum work/wa-replica/site-provisioner.test.cjs` → `914f61420960e717f93a0de2d68674cb040fbcb5199f1e61f15cbfeb2840e4ab`
- [ ] `sha256sum work/wa-replica/site-api.cjs` → `f956c122b9bf9dabf2cee5296aa9491c34f7b29ac85094b09871505d65e452d9`
- [ ] `sha256sum work/wa-replica/site-api.test.cjs` → `9483bfbe56946c658c98c070663a50988ead9471aa12b35b4b346b7683873f83`
- [ ] `sha256sum deploy/upgrade.sh` → `6ea6f36b3a04fb42397a8ff81b5e42a1be09c453c75397d39667a309c29d0ec6`
- [ ] `sha256sum work/wa-replica/fidelity-master.js` → `28df13dc5829117ffa2ca8ce727b279249964744ec3766605cd3bfb9fe2526b7`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `6ad53eafcfbc3d35f7296e566d763f206a44685a02cfc44e46a687e0ed32f270`
- [ ] `sha256sum replica/build-log.md` → `443ac067fbea8e7ec260c2576b5a41c6f2896f957425fd3e56a5b9b6a18d6afa`
- [ ] `cmp outputs/wa-replica-prototype/master.js work/wa-replica/fidelity-master.js` exits 0
- [ ] `git diff --name-only a7dee76..HEAD -- outputs` lists `master.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only a7dee76..HEAD -- . ':!plans'` lists exactly ten paths: the eight of the table in "Current state" and the two output files
- [ ] `git ls-files -s deploy/upgrade.sh` begins with `100644`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, the build reports another number of icons than 84, or a test fails.
- An output file other than `master.js` and `validation.json` changes.
- No Node 22.13 or newer, or no `mkfifo`, exists on the machine.
- The work appears to require editing an out-of-scope file, creating a file, or using Docker.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else.
- The bounds (12 languages, 4000 characters, 2,000,000 fingerprints; 60 s, 20 sessions, 1 MB) are well above what honest data needs; a workspace beyond them is still deleted, only some cached translations may be left (they can be read only by someone who has the text).
- What a reviewer should scrutinise: that every OpenWA call in `signOut` has the time that is left; that the batches of deleted translations commit between yields; that the upgrade script changes nothing when the gateway's configuration has an error.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
