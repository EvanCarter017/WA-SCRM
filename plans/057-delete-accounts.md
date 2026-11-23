# Plan 057: An account can be deleted for good; what the review of plan 056 found

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1cae1b3..HEAD -- work/wa-replica replica/build-log.md outputs README.md deploy`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MEDIUM (deleting is for good: an employee's account takes their workspace and data with it — exact text and checksums for every file)
- **Depends on**: plans/056-employees-with-sub-sites.md (DONE)
- **Category**: feature (owner request) and security (findings of an independent review)
- **Planned at**: commit `1cae1b3`, 2026-11-23

## Why this matters

**The feature.** The owner wrote on 2026-11-23: "I need to be able to remove an account." Asked what should happen to an employee's workspace, the owner chose **"Delete everything"**: the account, the workspace, the WhatsApp link (also signed out on the phone) and all their customers and chats are deleted for good, and the workspace's place is freed; a workspace that another employee still uses stays; supervisors' accounts are simply deleted; to keep someone's data, "停用" (disable) is used instead. The owner had chosen before that supervisors manage accounts as administrators do; the confirmation of a deletion asks for the person's sign-in name to be typed.

**The review.** An independent security review of plan 056 found nothing critical and nothing high. Three medium findings and some low ones are put right here:

| # | What the review found | Here |
|---|---|---|
| 1 | A slash written as `%2F` followed by parts of dots is read differently by the gateway and by a server (the gateway decodes and resolves the dots first, the server the other way round): `/api/wa/a%2Fb/../../auth/login` reached the sign-in of a sub-site's server, which counts wrong attempts for itself; `/api/wa/a%2Fb/../hook` reached OpenWA's delivery address from outside | refused with 400 by every server and by the gateway: a backslash, a slash or backslash written as `%2F` or `%5C`, an empty part (`//`) or a part of dots (`.`, `..`, also written with `%2E`) in the path |
| 2 | An employee whose sub-site failed before anything of it was made could never get one: "启用" (enable) found no sub-site and switched the account on without one | "on" makes a sub-site that is not there |
| 3 | The rule "a sub-site that an account has is no other's" was only checked when the provisioner said it existed | it is checked first, against the accounts |
| 5 | The upgrade script printed "renewed" for a server it could not take away, and counted a server as up as soon as it ran | a server that cannot be taken away is said so; a new one counts once it answers its health check |
| 6 | A volume was made, or taken away, on any answer of the engine other than "there" | only on a clear "not there" |
| 7 | A sub-site gone between "exists" and "start" was answered with 500 | a refusal (409) |
| 8 | The answer to "off" or "on" closed whatever dialog was open by then — also one that showed a temporary password | it closes the dialog that asked only |
| 4 | A gateway configuration changed in place was not read again by the upgrade script | the gateway is told to read it again |

### Decisions already made (do not re-open; do not ask)

- "删除" (delete) stands beside every account a manager may act on (not one's own; an administrator's only for an administrator). Supervisors and administrators may delete.
- The confirmation names what goes and asks for the sign-in name to be typed (letters compared without regard to case). While a workspace is deleted the dialog waits ("正在删除…").
- An employee's workspace goes with the **last** account that has it — also when the other account is switched off. Order: the workspace first, then the account; while the workspace cannot be deleted (busy, provisioner not answering) the account stays.
- Deleting a workspace (the provisioner): sign out its linked numbers at WhatsApp first — an OpenWA that does not run is started for this when the machine has the memory to spare (`WA_SCRM_MIN_FREE_MB`), and skipped otherwise —; take away the sessions; delete both containers, the data volume of its OpenWA, its settings file and its data files (`site-<id>.db*`, `wa-<id>.db*`, `wa-media-<id>/`). The answer says whether the numbers were signed out (`signedOut`: true, false, or null when none was linked). When a number could not be signed out, the page says to remove it on the phone under "设置 → 已关联的设备".
- The translations the relay keeps for everyone (`ai-translations.db`, a fingerprint of language and text) are deleted for the texts of the deleted workspace's messages, for every language they were translated into and the one the employee reads in — read from the workspace's data before it is deleted.
- A server that makes no sub-sites does not delete an employee's account (its data would stay behind); a supervisor's it does.
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/site-provisioner.cjs` | `50595fb5494189bdf4cf971962a114ae1b138aba8c3b73be5cae8324967df762` | `33f61520610f98f57f1e3faa5bbafd240d0e37e50dbca6886069709963a47495` | 12 |
| `work/wa-replica/site-provisioner.test.cjs` | `30ac1fc784ce3f77bcc7982a440d9d5af96be655f35d5959e3a49193efd6fd6c` | `ae5860d61588eedb4450f14945e9299d5ae8e404f98b06ae3c0e7b80acd723d8` | 8 |
| `work/wa-replica/serve.cjs` | `7ed108bcfb3a65929bac3cbfd432af70211ab1d0f531b4dffe8c30845cccd2be` | `77eb8f61424af71fd48c044d30b4c8643b27ef50621a83c0dfc7774680e9f15e` | 1 |
| `work/wa-replica/site-auth.cjs` | `c9cff2ddab10f6969ae63b55c3d79a6acdc2c39abae97ba738b008a06fe20f6a` | `2bf72a70cb477624dcefbcf8d9374a61f77b03e2da37a47fbdbfe100d7f56e25` | 2 |
| `work/wa-replica/site-api.cjs` | `4a8320bffae7b4fae942b91568049f83e340cdeb8ec943f398136140c9fa83bf` | `3c684ec6cfcb2d9edbab3d74939365c3df3d483678463efbc1430efc185b187d` | 7 |
| `work/wa-replica/site-api.test.cjs` | `ef9f0dc97ba4214743043778ad4d7c525bec4a1bb4cad5cd7032d52968fee425` | `3578e934fe8c180e62124b4142bfce158601d99e94549524335978cbaa658f79` | 8 |
| `deploy/gateway.conf` | `2d0b212c60ce49716687e8a14cd4ec38c5cbf320f27f21fa117b8fca17071d39` | `ecfce3459172d23f3bfe5ea021d27321e0952b3b2a5179693f141145768a299c` | 1 |
| `deploy/upgrade.sh` | `a5c0905dd029eb0009021909138eb6f7e16248562f64ac59208c322a2c098bf2` | `db93436ecffab10bd9d5ec89656c7c07d3aceb5b001857f4bd09da233591cdec` | 5 |
| `work/wa-replica/fidelity-master.js` | `ee3db1afc1b58f658a23607cb25a00bc13db5ef66394baa061abaf786d63d3af` | `34123b5deab3bf3d641199ca9c451c02b83cba5ef12c091d8e121c4f7a188ec8` | 8 |
| `work/wa-replica/fidelity.css` | `8105f962a780c9de6054b18c63e01f42fd12932196cf79a4273fb553fc8cd59f` | `d46b124c6a4690edd0590dd83d03ec993ced85648ec197a682793bf591051618` | 1 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `2ab95687f41136d2e8d0ea6be64ffca8382a01497580fa903d3a1c15563d2988` | `b77a9fccbe9e09a565369db15e48a939f236e396ee2ba268556e75bf5c62509d` | 4 |
| `README.md` | `373d33d6c6299ba282a292f50019981741f55befa2147b0321affe3caa23ff35` | `9a0a832c08b0cc23292b14eb17e5f1270bb68b90cc73469b607e918a23e3b785` | 2 |
| `replica/build-log.md` | `48acf5269a0f95697bb8f608e32b8836dc39f67cdab50fad98afacde15363b62` | `ef37adac71a4afc8b5cd764c20815e0c98cd8c62eb62d40a7985bd335595fe0f` | 1 append |

- `site-provisioner.cjs` — the provisioner (plans 055–056): makes, starts and stops the two containers of a sub-site; `client()` is the first server's side of it.
- `site-api.cjs` — the routes of sign-in, accounts and data; `workspaces` is the first server's client of the provisioner, or null.
- `site-auth.cjs` — the store of accounts. Its `sessions` table already deletes an account's sessions with the account (`ON DELETE CASCADE`, `PRAGMA foreign_keys = ON`).
- `serve.cjs` — the server; it refuses an address with a backslash (plan 056).
- `fidelity-master.js` — the supervisor page (built into `outputs/wa-replica-prototype/master.js` as a copy); `fidelity.css` — its styles (built into `app.css`).
- `deploy/gateway.conf`, `deploy/upgrade.sh` — the gateway's configuration and the upgrade script.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly three output files differ: `app.css`, `master.js` and `validation.json` (written by the validator).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 1cae1b3 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the provisioner | `$NODE --test work/wa-replica/site-provisioner.test.cjs` | `pass 12`, `fail 0` (stand-ins for Docker and OpenWA; no container is made) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 18`, `fail 0` |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 14`, `fail 0` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (they send a 16 MB file twice; allow a few seconds) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-057/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/site-provisioner.cjs`, `site-provisioner.test.cjs` (Step 2)
- `work/wa-replica/serve.cjs`, `site-auth.cjs`, `site-api.cjs`, `site-api.test.cjs` (Step 3)
- `deploy/gateway.conf`, `deploy/upgrade.sh` (Step 4)
- `work/wa-replica/fidelity-master.js`, `fidelity.css`, `validate-scrm-lifecycle.cjs` (Step 5)
- `README.md`, `replica/build-log.md` (Step 6)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.css`, `master.js`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular `site-data.cjs`, `site-admin.cjs`, `openwa-link.cjs`, `ai-relay.cjs`, `fidelity-boot.js`, `fidelity-index.html`, `deploy/Dockerfile`, `deploy/compose.yml`, `deploy/platform.env.template`, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. **Do not use Docker at all** — do not build an image, do not start a container, do not run the upgrade script.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/057-delete-accounts` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): delete an account for good, an employee's workspace with it`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block whose text has a fence of its own is opened and closed with four backticks; a block ends only at a line that equals its opening run of backticks. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 59 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the thirteen files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-057/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-057 && cat > /tmp/wa-scrm-plan-057/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 057: an account can be deleted for good, and what the review of plan 056 found.
# No container is made and Docker is not needed. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; D="$ROOT/deploy"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the tests of the provisioner pass' "$("$NODE" --test "$W/site-provisioner.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 18 ℹ fail 0 '
has 'the provisioner deletes a sub-site' "$W/site-provisioner.cjs" "'POST /sites/remove': async (body, id) => {"
has 'the provisioner signs the numbers out first' "$W/site-provisioner.cjs" 'const signedOut = await signOut(id, parts, volume);'
has 'the store of accounts deletes an account' "$W/site-auth.cjs" 'function deleteUser(username) {'
has 'the routes delete an account' "$W/site-api.cjs" "'POST /api/auth/users/remove': async req => {"
has 'the translations of a deleted sub-site go with it' "$W/site-api.cjs" 'function forgetTranslations(id, keys) {'
has 'the server refuses an encoded slash' "$W/serve.cjs" '|%2f|%5c|'
has 'the gateway refuses an encoded slash' "$D/gateway.conf" '(\x5c|%2f|%5c|//|'
has 'the upgrade script waits for a server that answers' "$D/upgrade.sh" 'answers() {'
has 'the page offers to delete an account' "$O/master.js" 'data-master="remove"'
has 'the page asks for the sign-in name' "$O/master.js" '输入的登录名不一致。'
has 'the style of the link is built' "$O/app.css" '.fid-master-acts .link.danger'
has 'the README says how an account is deleted' "$ROOT/README.md" '「删除」会永久删除账号'
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 账号可以删除；员工的工作区随最后一个账号一起删除'
same 'of the built files only the page, its style and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.css|master\.js|validation\.json)$')" 0
same 'the server files pass the syntax check' "$(node --check "$W/serve.cjs" 2>/dev/null && node --check "$W/site-api.cjs" 2>/dev/null && node --check "$W/site-auth.cjs" 2>/dev/null && node --check "$W/site-provisioner.cjs" 2>/dev/null && node --check "$W/fidelity-master.js" 2>/dev/null && bash -n "$D/upgrade.sh" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-057/smoke.sh && ls -l /tmp/wa-scrm-plan-057/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/site-provisioner.cjs work/wa-replica/site-provisioner.test.cjs work/wa-replica/serve.cjs work/wa-replica/site-auth.cjs work/wa-replica/site-api.cjs work/wa-replica/site-api.test.cjs deploy/gateway.conf deploy/upgrade.sh work/wa-replica/fidelity-master.js work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs README.md replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-057/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the tests of the provisioner pass` (got: ℹ pass 10 ℹ fail 0 ), `the sign-in and data tests pass` (got: ℹ pass 17 ℹ fail 0 ), `the provisioner deletes a sub-site`, `the provisioner signs the numbers out first`, `the store of accounts deletes an account`, `the routes delete an account`, `the translations of a deleted sub-site go with it`, `the server refuses an encoded slash`, `the gateway refuses an encoded slash`, `the upgrade script waits for a server that answers`, `the page offers to delete an account`, `the page asks for the sign-in name`, `the style of the link is built`, `the README says how an account is deleted` and `the build log has the entry` (fifteen checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The provisioner: deleting a sub-site; what the review found

#### `site-provisioner.cjs`

**Edit 2.1** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
//   POST /sites/<id>/start      POST /sites/<id>/stop
// Settings (environment):
```

Replace them with:

```text
//   POST /sites/<id>/start      POST /sites/<id>/stop
//   POST /sites/<id>/remove     the sub-site deleted for good (see remove below)
// Settings (environment):
```

**Edit 2.2** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
const HEALTH_WAIT_MS = 180000;
const ENGINE_TIMEOUT_MS = 120000;
```

Replace them with:

```text
const HEALTH_WAIT_MS = 180000;
// How long a sub-site that is deleted is waited for: its OpenWA to come up, and a number's connection to be up.
const SIGN_OUT_WAIT_MS = 30000;
const ENGINE_TIMEOUT_MS = 120000;
```

**Edit 2.3** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
// config: see the settings above. docker: (method, path, body) → { status, body }. freeMb: () → the host's free
// memory. openwaUrl: id → the address of a sub-site's OpenWA; wait and healthWaitMs: how the provisioner waits
// for an OpenWA to come up (all three replaceable for tests).
function create({ config, docker, freeMb, openwaUrl = openwaAddress, wait = sleep, healthWaitMs = HEALTH_WAIT_MS }) {
  const names = id => ({ server: `wa-scrm-site-${id}`, openwa: `wa-scrm-openwa-${id}`, volume: `wa-scrm-openwa-${id}`, settings: `openwa-${id}.env` });
  const labels = (id, part) => ({ 'wa-scrm.site': id, 'wa-scrm.part': part });
  // What is being made or started right now ('working'), what is being stopped ('stopping'), and what went
  // wrong the last time (the reason it failed), by id.
  const work = new Map();
  const busy = id => work.get(id) === 'working' || work.get(id) === 'stopping';
  // Does this part take memory: it runs, or Docker is starting it again this moment.
```

Replace them with:

```text
// config: see the settings above. docker: (method, path, body) → { status, body }. freeMb: () → the host's free
// memory. openwaUrl: id → the address of a sub-site's OpenWA; wait, healthWaitMs and signOutWaitMs: how the
// provisioner waits for an OpenWA to come up, and for a number's connection when it is deleted (all replaceable
// for tests).
function create({ config, docker, freeMb, openwaUrl = openwaAddress, wait = sleep, healthWaitMs = HEALTH_WAIT_MS, signOutWaitMs = SIGN_OUT_WAIT_MS }) {
  const names = id => ({ server: `wa-scrm-site-${id}`, openwa: `wa-scrm-openwa-${id}`, volume: `wa-scrm-openwa-${id}`, settings: `openwa-${id}.env` });
  const labels = (id, part) => ({ 'wa-scrm.site': id, 'wa-scrm.part': part });
  // What is being made or started right now ('working'), what is being stopped ('stopping') or deleted
  // ('removing'), and what went wrong the last time (the reason it failed), by id.
  const work = new Map();
  const busy = id => ['working', 'stopping', 'removing'].includes(work.get(id));
  // Does this part take memory: it runs, or Docker is starting it again this moment.
```

**Edit 2.4** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
  }
  // ready: both run and OpenWA answers. starting: on the way there. stopping: on the way down. stopped: its
  // OpenWA is there and does not run, and no server runs (the server may be gone: an upgrade takes it away, and
  // the next start makes it anew). failed: the last attempt to make or start it went wrong, or a part is missing.
  function stateOf(id, parts) {
```

Replace them with:

```text
  }
  // ready: both run and OpenWA answers. starting: on the way there. stopping: on the way down. removing: being
  // deleted. stopped: its OpenWA is there and does not run, and no server runs (the server may be gone: an
  // upgrade takes it away, and the next start makes it anew). failed: the last attempt to make or start it went
  // wrong, or a part is missing.
  function stateOf(id, parts) {
```

**Edit 2.5** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
    if (work.get(id) === 'stopping') return 'stopping';
    const { server, openwa } = parts || {};
```

Replace them with:

```text
    if (work.get(id) === 'stopping') return 'stopping';
    if (work.get(id) === 'removing') return 'removing';
    const { server, openwa } = parts || {};
```

**Edit 2.6** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text

  async function healthy(id) {
    for (const end = Date.now() + healthWaitMs; Date.now() < end;) {
      const state = ok(await docker('GET', `/containers/${names(id).openwa}/json`), 200).body.State;
```

Replace them with:

```text

  async function healthy(id, patience = healthWaitMs) {
    for (const end = Date.now() + patience; Date.now() < end;) {
      const state = ok(await docker('GET', `/containers/${names(id).openwa}/json`), 200).body.State;
```

**Edit 2.7** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
    if (!parts.openwa) {
      const volume = await docker('GET', `/volumes/${n.volume}`);
      if (volume.status === 200 && !kept) throw problem('settings-missing');
      if (volume.status !== 200 && kept) throw problem('data-missing');
      const masterKey = kept ? '' : crypto.randomBytes(36).toString('base64url');
      if (volume.status !== 200) ok(await docker('POST', '/volumes/create', { Name: n.volume, Labels: labels(id, 'openwa') }), 201);
      try {
```

Replace them with:

```text
    if (!parts.openwa) {
      // Whether its OpenWA has data already: the volume is there (200) or not (404). Any other answer is the
      // engine's trouble, and nothing is made or taken away on it.
      const volume = ok(await docker('GET', `/volumes/${n.volume}`), 200, 404), fresh = volume.status === 404;
      if (!fresh && !kept) throw problem('settings-missing');
      if (fresh && kept) throw problem('data-missing');
      const masterKey = kept ? '' : crypto.randomBytes(36).toString('base64url');
      if (fresh) ok(await docker('POST', '/volumes/create', { Name: n.volume, Labels: labels(id, 'openwa') }), 201);
      try {
```

**Edit 2.8** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
        // nothing. Left behind it would pass for data whose settings are missing, and the id could never be used.
        if (volume.status !== 200) await docker('DELETE', `/volumes/${n.volume}`).catch(() => {});
        throw error;
```

Replace them with:

```text
        // nothing. Left behind it would pass for data whose settings are missing, and the id could never be used.
        if (fresh) await docker('DELETE', `/volumes/${n.volume}`).catch(() => {});
        throw error;
```

**Edit 2.9** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text

  const known = id => { if (typeof id !== 'string' || !SITE_ID.test(id) || RESERVED.includes(id)) throw problem('invalid-request'); return id; };
```

Replace them with:

```text

  // The numbers of a sub-site signed out at WhatsApp — so that the phone lists them no more — and their sessions
  // taken away, asked of its OpenWA with the key of the sub-site's settings file. An OpenWA that does not run is
  // started for this when the host has the memory to spare. Resolves to true (every number that was linked is
  // signed out), false (one could not be, or OpenWA could not be asked) or null (no number was linked).
  async function signOut(id, parts, volume) {
    const n = names(id), file = path.join(config.dataDir, n.settings);
    if (!parts.openwa) return volume ? false : null;
    const key = fs.existsSync(file) ? ((fs.readFileSync(file, 'utf8').match(/^OPENWA_API_KEY=(.+)$/m) || [])[1] || '').trim() : '';
    if (!key) return false;
    if (!up(parts.openwa)) {
      if (freeMb() < config.minFreeMb) return false;
      ok(await docker('POST', `/containers/${n.openwa}/start`), 204, 304);
      try {
        await healthy(id, signOutWaitMs);
      } catch {
        return false;
      }
    }
    const openwaAsk = async (method, pathname) => {
      try {
        const answer = await fetch(openwaUrl(id) + pathname, { method, headers: { 'X-API-Key': key }, signal: AbortSignal.timeout(20000) });
        return { status: answer.status, body: await answer.json().catch(() => null) };
      } catch {
        return { status: 0, body: null };
      }
    };
    const listed = await openwaAsk('GET', '/api/sessions');
    if (listed.status !== 200 || !Array.isArray(listed.body)) return false;
    let linked = 0, out = 0;
    for (const session of listed.body) {
      if (typeof session?.id !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(session.id)) continue;
      if (session.phone) {
        linked += 1;
        // A linked number is signed out once its connection is up again.
        for (const end = Date.now() + signOutWaitMs; session.status !== 'ready' && Date.now() < end;) {
          await wait(2000);
          session.status = (await openwaAsk('GET', `/api/sessions/${session.id}`)).body?.status;
        }
        const logout = await openwaAsk('POST', `/api/sessions/${session.id}/logout`);
        if (logout.status >= 200 && logout.status < 300) out += 1;
      }
      await openwaAsk('DELETE', `/api/sessions/${session.id}`);
    }
    return linked ? out === linked : null;
  }
  // The sub-site deleted for good: its numbers signed out, its two containers, the data of its OpenWA, its
  // settings file and its data files — the document of its customers and chats, its WhatsApp store and media.
  // What is not there is skipped; the names come from the id alone, so nothing of another sub-site is touched.
  async function remove(id) {
    const n = names(id), parts = (await containers()).get(id) || {};
    const files = [n.settings, ...['site', 'wa'].flatMap(kind => ['', '-wal', '-shm'].map(end => `${kind}-${id}.db${end}`)), `wa-media-${id}`].map(name => path.join(config.dataDir, name));
    const volume = ok(await docker('GET', `/volumes/${n.volume}`), 200, 404).status === 200;
    if (!parts.server && !parts.openwa && !volume && !files.some(file => fs.existsSync(file))) throw problem('unknown-site');
    const signedOut = await signOut(id, parts, volume);
    for (const name of [n.server, n.openwa]) ok(await docker('DELETE', `/containers/${name}?force=true`), 204, 404);
    if (volume) ok(await docker('DELETE', `/volumes/${n.volume}`), 204, 404);
    for (const file of files) fs.rmSync(file, { recursive: true, force: true });
    return signedOut;
  }

  const known = id => { if (typeof id !== 'string' || !SITE_ID.test(id) || RESERVED.includes(id)) throw problem('invalid-request'); return id; };
```

**Edit 2.10** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
    },
  };
```

Replace them with:

```text
    },
    'POST /sites/remove': async (body, id) => {
      known(id);
      if (busy(id)) throw problem('busy');
      // While it is being deleted a sub-site is busy: nothing else is begun with it.
      const before = work.get(id);
      work.set(id, 'removing');
      let signedOut;
      try {
        signedOut = await remove(id);
      } catch (error) {
        // When nothing of it was there, a mark of what went wrong with it before goes as well.
        if (error.code === 'unknown-site' || before === undefined) work.delete(id);
        else work.set(id, before);
        throw error;
      }
      work.delete(id);
      console.log(`provisioner remove ok site=${id} signed-out=${signedOut === null ? 'none' : signedOut ? 'yes' : 'no'}`);
      return { status: 200, body: { id, state: 'removed', signedOut } };
    },
  };
```

**Edit 2.11** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
      try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { throw problem('not-found'); }
      const named = pathname.match(/^\/sites\/([^/]+)\/(start|stop)$/);
      const route = routes[`${req.method} ${named ? '/sites/' + named[2] : pathname}`];
```

Replace them with:

```text
      try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { throw problem('not-found'); }
      const named = pathname.match(/^\/sites\/([^/]+)\/(start|stop|remove)$/);
      const route = routes[`${req.method} ${named ? '/sites/' + named[2] : pathname}`];
```

**Edit 2.12** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
    stop: id => ask('POST', named(id, 'stop'), undefined, stopTimeoutMs),
  };
```

Replace them with:

```text
    stop: id => ask('POST', named(id, 'stop'), undefined, stopTimeoutMs),
    // Deleting takes as long as signing its numbers out: { id, state: 'removed', signedOut: true | false | null }.
    remove: id => ask('POST', named(id, 'remove'), undefined, stopTimeoutMs),
  };
```

#### `site-provisioner.test.cjs`

**Edit 2.13** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
const containers = new Map(), volumes = new Set(), calls = [];
let mood = 'ok', free = 4000, stopDelay = 0;
const isOpenwa = c => c.spec.Labels['wa-scrm.part'] === 'openwa';
```

Replace them with:

```text
const containers = new Map(), volumes = new Set(), calls = [];
let mood = 'ok', free = 4000, stopDelay = 0, volumeTrouble = false;
const isOpenwa = c => c.spec.Labels['wa-scrm.part'] === 'openwa';
```

**Edit 2.14** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
    }
    if (one) {
```

Replace them with:

```text
    }
    const gone = url.pathname.match(/^\/containers\/([^/]+)$/);
    if (gone && req.method === 'DELETE') return containers.delete(gone[1]) ? send(204) : send(404, { message: 'No such container: ' + gone[1] });
    if (one) {
```

**Edit 2.15** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
    const volume = url.pathname.match(/^\/volumes\/([^/]+)$/);
    if (volume && req.method === 'DELETE') { volumes.delete(volume[1]); return send(204); }
```

Replace them with:

```text
    const volume = url.pathname.match(/^\/volumes\/([^/]+)$/);
    if (volume && volumeTrouble) return send(500, { message: 'the engine is in trouble' });
    if (volume && req.method === 'DELETE') { volumes.delete(volume[1]); return send(204); }
```

**Edit 2.16** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
const keys = [];
const openwa = http.createServer((req, res) => {
```

Replace them with:

```text
const keys = [];
// The sessions of the sub-sites' numbers, by sub-site: { id, status, phone, polls }. A sub-site is known by the
// restricted key its settings file holds. sessionCalls: what was asked of them, in order.
const sessions = new Map(), sessionCalls = [];
let logoutDelay = 0;
const siteOfKey = key => keys.find(k => k.apiKey === key)?.name.replace(/^wa-scrm-(.+)-[0-9a-z]+$/, '$1');
function sessionAnswer(site, req, res) {
  const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
  const [, id, action] = req.url.slice('/api/sessions'.length).split('/'), list = sessions.get(site) || [];
  sessionCalls.push(`${req.method} ${site}${id ? ' ' + id : ''}${action ? ' ' + action : ''}`);
  if (!id) return send(200, list.map(({ polls, ...session }) => session));
  const session = list.find(s => s.id === id);
  if (!session) return send(404, { message: 'no such session' });
  if (req.method === 'GET') {
    // a linked number whose connection is down is up again after it was asked about twice
    if (session.status === 'disconnected' && session.phone && ++session.polls >= 2) session.status = 'ready';
    const { polls, ...shown } = session;
    return send(200, shown);
  }
  if (action === 'logout') return void setTimeout(() => (session.status === 'ready' ? (session.status = 'logged-out', send(200, { ok: true })) : send(400, { message: 'not running' })), logoutDelay);
  if (req.method === 'DELETE' && !action) { sessions.set(site, list.filter(s => s !== session)); return send(204); }
  return send(404, { message: 'no such route' });
}
const openwa = http.createServer((req, res) => {
```

**Edit 2.17** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
  req.on('end', () => {
    const started = [...containers.values()].filter(isOpenwa).flatMap(c => c.spec.Env).filter(line => line.startsWith('API_MASTER_KEY=')).map(line => line.slice(15));
```

Replace them with:

```text
  req.on('end', () => {
    const site = siteOfKey(req.headers['x-api-key']);
    if (site && req.url.startsWith('/api/sessions')) return sessionAnswer(site, req, res);
    const started = [...containers.values()].filter(isOpenwa).flatMap(c => c.spec.Env).filter(line => line.startsWith('API_MASTER_KEY=')).map(line => line.slice(15));
```

**Edit 2.18** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
let base, openwaBase;
const provisioner = () => create({ config, docker: engine(socket), freeMb: () => free, openwaUrl: () => openwaBase, wait: () => new Promise(resolve => setImmediate(resolve)), healthWaitMs: 150 });
let front;
```

Replace them with:

```text
let base, openwaBase;
const provisioner = () => create({ config, docker: engine(socket), freeMb: () => free, openwaUrl: () => openwaBase, wait: () => new Promise(resolve => setImmediate(resolve)), healthWaitMs: 150, signOutWaitMs: 150 });
let front;
```

**Edit 2.19** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
  assert.deepEqual((await call('/sites')).json, { sites: [], room: { max: 2, running: 0, freeMb: 4000, minFreeMb: 1400, canStart: true } });
  assert.deepEqual([(await call('/nothing')).status, (await call('/sites', { method: 'DELETE' })).status, (await call('/sites/t1/start')).status, (await call('/sites/t1/remove', { method: 'POST' })).status], [404, 405, 405, 404]);
  // what is no address at all: the secret is asked first, and nothing of it is written down
```

Replace them with:

```text
  assert.deepEqual((await call('/sites')).json, { sites: [], room: { max: 2, running: 0, freeMb: 4000, minFreeMb: 1400, canStart: true } });
  assert.deepEqual([(await call('/nothing')).status, (await call('/sites', { method: 'DELETE' })).status, (await call('/sites/t1/start')).status, (await call('/sites/t1/delete', { method: 'POST' })).status], [404, 405, 405, 404]);
  // what is no address at all: the secret is asked first, and nothing of it is written down
```

**Edit 2.20** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text

test('the settings from the environment: what is needed is asked for, the secret is long enough, the rest has its defaults', () => {
```

Replace them with:

```text

test('deleting a sub-site: its numbers signed out at WhatsApp — an OpenWA that is stopped is started for it when there is memory —, its containers, the data of its OpenWA, its settings and data files; nothing of another; busy meanwhile; afterwards its name is free', async () => {
  const filesOf = id => [`openwa-${id}.env`, `site-${id}.db`, `site-${id}.db-wal`, `wa-${id}.db`, `wa-${id}.db-shm`, `wa-media-${id}`].map(name => path.join(dataDir, name));
  const lay = id => {
    for (const file of filesOf(id).slice(1)) {
      if (!file.endsWith('wa-media-' + id)) fs.writeFileSync(file, 'data of ' + id);
      else { fs.mkdirSync(file); fs.writeFileSync(path.join(file, 'a.jpg'), 'picture of ' + id); }
    }
  };
  const there = id => filesOf(id).map(file => fs.existsSync(file));
  const make = async id => { assert.equal((await call('/sites', { method: 'POST', body: { id } })).status, 202, id); assert.equal((await settled(id)).state, 'ready', id); };
  fs.writeFileSync(path.join(dataDir, 'site-t1.db'), 'data of t1');
  // one that runs, with a linked number and one that waits for its scan
  await make('x1');
  lay('x1');
  sessions.set('x1', [{ id: 'aaaa-1', status: 'ready', phone: '15550001', polls: 0 }, { id: 'aaaa-2', status: 'qr_ready', phone: null, polls: 0 }]);
  let from = calls.length;
  sessionCalls.length = 0;
  const removed = await call('/sites/x1/remove', { method: 'POST' });
  assert.deepEqual([removed.status, removed.json], [200, { id: 'x1', state: 'removed', signedOut: true }]);
  assert.deepEqual(sessionCalls, ['GET x1', 'POST x1 aaaa-1 logout', 'DELETE x1 aaaa-1', 'DELETE x1 aaaa-2'], 'the linked number signed out, both sessions taken away');
  assert.deepEqual(changes(from), ['DELETE /containers/wa-scrm-site-x1', 'DELETE /containers/wa-scrm-openwa-x1', 'DELETE /volumes/wa-scrm-openwa-x1']);
  assert.deepEqual([there('x1'), fs.existsSync(path.join(dataDir, 'site-t1.db')), await stateOf('x1'), await stateOf('t1')], [[false, false, false, false, false, false], true, undefined, { id: 't1', state: 'ready' }], 'all of it is gone, nothing of another');
  // one that is stopped: its OpenWA is started to sign its number out
  await make('x2');
  sessions.set('x2', [{ id: 'bbbb-1', status: 'ready', phone: '15550002', polls: 0 }]);
  assert.equal((await call('/sites/x2/stop', { method: 'POST' })).status, 200);
  sessions.get('x2')[0].status = 'disconnected';
  from = calls.length;
  sessionCalls.length = 0;
  assert.deepEqual((await call('/sites/x2/remove', { method: 'POST' })).json, { id: 'x2', state: 'removed', signedOut: true });
  assert.deepEqual([changes(from)[0], sessionCalls], ['POST /containers/wa-scrm-openwa-x2/start', ['GET x2', 'GET x2 bbbb-1', 'GET x2 bbbb-1', 'POST x2 bbbb-1 logout', 'DELETE x2 bbbb-1']]);
  // stopped, and too little memory to start it: deleted all the same, and said not to be signed out
  await make('x3');
  lay('x3');
  sessions.set('x3', [{ id: 'cccc-1', status: 'ready', phone: '15550003', polls: 0 }]);
  assert.equal((await call('/sites/x3/stop', { method: 'POST' })).status, 200);
  free = 1000;
  from = calls.length;
  sessionCalls.length = 0;
  assert.deepEqual((await call('/sites/x3/remove', { method: 'POST' })).json, { id: 'x3', state: 'removed', signedOut: false });
  free = 4000;
  assert.deepEqual([changes(from), sessionCalls, there('x3')], [['DELETE /containers/wa-scrm-site-x3', 'DELETE /containers/wa-scrm-openwa-x3', 'DELETE /volumes/wa-scrm-openwa-x3'], [], [false, false, false, false, false, false]]);
  // only data files left of it: they go, and there was no number to sign out
  lay('x4');
  assert.deepEqual([(await call('/sites/x4/remove', { method: 'POST' })).json, there('x4')], [{ id: 'x4', state: 'removed', signedOut: null }, [false, false, false, false, false, false]]);
  // nothing at all of it, the platform's own names, no names: refused, and nothing reached the engine
  from = calls.length;
  assert.deepEqual([(await call('/sites/x9/remove', { method: 'POST' })).json, (await call('/sites/master/remove', { method: 'POST' })).status, (await call('/sites/X1/remove', { method: 'POST' })).status, changes(from)], [{ error: 'unknown-site' }, 400, 400, []]);
  // busy while it is being made, and while it is being deleted
  assert.equal((await call('/sites', { method: 'POST', body: { id: 'x5' } })).status, 202);
  assert.deepEqual((await call('/sites/x5/remove', { method: 'POST' })).json, { error: 'busy' });
  assert.equal((await settled('x5')).state, 'ready');
  sessions.set('x5', [{ id: 'dddd-1', status: 'ready', phone: '15550005', polls: 0 }]);
  logoutDelay = 60;
  const going = call('/sites/x5/remove', { method: 'POST' });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.deepEqual([await stateOf('x5'), (await call('/sites/x5/start', { method: 'POST' })).json, (await call('/sites/x5/remove', { method: 'POST' })).json], [{ id: 'x5', state: 'removing' }, { error: 'busy' }, { error: 'busy' }]);
  assert.deepEqual((await going).json, { id: 'x5', state: 'removed', signedOut: true });
  logoutDelay = 0;
  // afterwards the name is free: made anew from nothing, with a new key
  const asked = keys.length;
  await make('x1');
  assert.deepEqual([keys.length, settingsOf('x1').includes(keys.at(-1).apiKey)], [asked + 1, true]);
  assert.equal((await call('/sites/x1/remove', { method: 'POST' })).status, 200);
  // the first server's side: a sub-site that is not there is said so
  await assert.rejects(client({ url: base, secret: SECRET }).remove('x9'), { code: 'workspace-unknown-site' });
  assert.deepEqual(await client({ url: base, secret: SECRET }).remove((lay('x6'), 'x6')), { id: 'x6', state: 'removed', signedOut: null });
  // the lines say what went, and whether its numbers were signed out
  const lines = logged.filter(line => line.startsWith('provisioner remove'));
  for (const line of ['provisioner remove ok site=x1 signed-out=yes', 'provisioner remove ok site=x2 signed-out=yes', 'provisioner remove ok site=x3 signed-out=no', 'provisioner remove ok site=x4 signed-out=none']) assert(lines.includes(line), line + '\n' + lines.join('\n'));
});

test('an answer of the engine about a volume that is neither "there" nor "not there" makes nothing and takes nothing away', async () => {
  volumeTrouble = true;
  const from = calls.length;
  assert.equal((await call('/sites', { method: 'POST', body: { id: 'v1' } })).status, 202);
  assert.deepEqual(await settled('v1'), { id: 'v1', state: 'failed', reason: 'engine' });
  assert.deepEqual([changes(from), (await call('/sites/v1/remove', { method: 'POST' })).status, await stateOf('v1')], [[], 500, { id: 'v1', state: 'failed', reason: 'engine' }], 'no volume made, none taken away, no container; a deletion waits for a clear answer');
  volumeTrouble = false;
  // nothing of it is there: deleting it says so, and the mark of what went wrong goes
  assert.deepEqual([(await call('/sites/v1/remove', { method: 'POST' })).json, await stateOf('v1')], [{ error: 'unknown-site' }, undefined]);
});

test('the settings from the environment: what is needed is asked for, the secret is long enough, the rest has its defaults', () => {
```

**Verify**: `sha256sum work/wa-replica/site-provisioner.cjs work/wa-replica/site-provisioner.test.cjs` → `33f61520610f98f57f1e3faa5bbafd240d0e37e50dbca6886069709963a47495`, `ae5860d61588eedb4450f14945e9299d5ae8e404f98b06ae3c0e7b80acd723d8`; `node --check work/wa-replica/site-provisioner.cjs` exits 0; `$NODE --test work/wa-replica/site-provisioner.test.cjs` → `pass 12`, `fail 0`. If a checksum does not match, restore the file with `git checkout 1cae1b3 -- <file>` and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 3: The server: deleting an account; the reading of an address; what the review found

#### `serve.cjs`

**Edit 3.1** — `work/wa-replica/serve.cjs`. Find exactly these lines (they occur once):

```text
  try {
    // A backslash in the path is a slash to this server and none to a gateway in front of it: such a request
    // would be passed for one route and answered as another. Nobody asks so in earnest.
    if (req.url.split('?')[0].includes('\\')) return sendJson(res, 400, { error: 'invalid-request' });
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
```

Replace them with:

```text
  try {
    // An address that this server and a gateway in front of it could read differently is refused, so that a
    // request is answered as the route it was passed for: a backslash (a slash here, none there), a slash or a
    // backslash written as %2F or %5C, an empty part, or a part of dots. Nobody asks so in earnest.
    const raw = req.url.split('?')[0];
    if (/\\|%2f|%5c|\/\//i.test(raw) || raw.split('/').some(part => /^(\.|%2e){1,2}$/i.test(part))) return sendJson(res, 400, { error: 'invalid-request' });
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
```

#### `site-auth.cjs`

**Edit 3.2** — `work/wa-replica/site-auth.cjs`. Find exactly these lines (they occur once):

```text

  // Checks a sign-in. Resolves to { token, user }; every failure is the same error, except a temporary lock.
```

Replace them with:

```text

  // An account deleted for good: with it its sessions (the table deletes them with the account) and what was
  // counted of its sign-ins.
  function deleteUser(username) {
    const row = byName(username);
    if (!row) throw problem('unknown-user');
    db.prepare('DELETE FROM users WHERE id = ?').run(row.id);
    failures.delete(row.username);
    return publicUser(row);
  }

  // Checks a sign-in. Resolves to { token, user }; every failure is the same error, except a temporary lock.
```

**Edit 3.3** — `work/wa-replica/site-auth.cjs`. Find exactly these lines (they occur once):

```text
  const listUsers = () => db.prepare('SELECT * FROM users ORDER BY username').all().map(publicUser);
  return { createUser, resetPassword, changePassword, setDisabled, signIn, sessionUser, signOut, listUsers, close: () => db.close() };
}
```

Replace them with:

```text
  const listUsers = () => db.prepare('SELECT * FROM users ORDER BY username').all().map(publicUser);
  return { createUser, resetPassword, changePassword, setDisabled, deleteUser, signIn, sessionUser, signOut, listUsers, close: () => db.close() };
}
```

#### `site-api.cjs`

**Edit 3.4** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
//   POST /api/auth/users/reset | disable | enable   { username }: a new temporary password; the account off, on
//   GET  /api/data           the sub-site's data document; ?fields=a,b gives only these top-level fields
```

Replace them with:

```text
//   POST /api/auth/users/reset | disable | enable   { username }: a new temporary password; the account off, on
//   POST /api/auth/users/remove   { username }: the account deleted for good — an employee's together with the
//                            sub-site when it is the last account of it, where the platform makes sub-sites
//   GET  /api/data           the sub-site's data document; ?fields=a,b gives only these top-level fields
```

**Edit 3.5** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
const fs = require('node:fs');
const { openAuth, validPassword } = require('./site-auth.cjs');
```

Replace them with:

```text
const fs = require('node:fs');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { openAuth, validPassword } = require('./site-auth.cjs');
```

**Edit 3.6** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
  'invalid-username': 400, 'invalid-name': 400, 'invalid-role': 400, 'own-account': 400, 'unknown-user': 404, 'username-taken': 409,
  'workspace-exists': 409, 'workspace-full': 409, 'workspace-low-memory': 409, 'workspace-busy': 409, 'workspace-unavailable': 503,
};
```

Replace them with:

```text
  'invalid-username': 400, 'invalid-name': 400, 'invalid-role': 400, 'own-account': 400, 'unknown-user': 404, 'username-taken': 409,
  'workspace-exists': 409, 'workspace-full': 409, 'workspace-low-memory': 409, 'workspace-busy': 409, 'workspace-unknown-site': 409, 'workspace-unavailable': 503,
};
```

**Edit 3.7** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
    if (auth.listUsers().some(user => user.username === id)) throw problem('username-taken');
    await asked('make', actor, id, async () => {
```

Replace them with:

```text
    if (auth.listUsers().some(user => user.username === id)) throw problem('username-taken');
    // A sub-site that an account has already — also one the provisioner does not know — is no other's.
    if (auth.listUsers().some(user => user.site === id)) throw problem('workspace-exists');
    await asked('make', actor, id, async () => {
```

**Edit 3.8** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
  // An employee's sub-site is started before the account is switched on: when it cannot be — no room for it —
  // the account stays off.
  async function workspaceOn(actor, target) {
```

Replace them with:

```text
  // An employee's sub-site is started before the account is switched on: when it cannot be — no room for it —
  // the account stays off. A sub-site that is not there — its making went wrong before anything of it was made,
  // or it was never made — is made now, where its name does as a sub-site's; elsewhere the account is all.
  async function workspaceOn(actor, target) {
```

**Edit 3.9** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
      await asked('start', actor, target.site, () => workspaces.start(target.site));
      return { workspace: 'starting' };
    } catch (error) {
      if (error.code === 'workspace-unknown-site') return {};
      throw error;
    }
  }
```

Replace them with:

```text
      await asked('start', actor, target.site, () => workspaces.start(target.site));
    } catch (error) {
      if (error.code !== 'workspace-unknown-site') throw error;
      if (!SITE_ID.test(target.site) || RESERVED.includes(target.site)) return {};
      await asked('make', actor, target.site, () => workspaces.make(target.site));
    }
    return { workspace: 'starting' };
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
    }
  }
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
      try {
        removed = await workspaces.remove(target.site);
      } catch (error) {
        if (error.code !== 'workspace-unknown-site') throw error;
      }
    });
    if (!removed) return {};
    try {
      forgetTranslations(target.site, keys);
    } catch (error) {
      console.error(`site workspace translations failed site=${target.site} error=${error.code || error.name}`);
    }
    return { workspace: 'removed', ...(removed.signedOut === false ? { phone: 'not-signed-out' } : {}) };
  }
```

**Edit 3.10** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
    },
    'GET /api/data': req => {
```

Replace them with:

```text
    },
    // An account deleted for good, with its sessions — and an employee's sub-site with it (workspaceRemove).
    'POST /api/auth/users/remove': async req => {
      const actor = manager(req), target = managed(actor, (await readJson(req)).username);
      const workspace = await workspaceRemove(actor, target);
      auth.deleteUser(target.username);
      console.log(`site account removed by=${actor.username} user=${target.username} role=${target.role}`);
      return { body: { ok: true, ...workspace } };
    },
    'GET /api/data': req => {
```

#### `site-api.test.cjs`

**Edit 3.11** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
const fs = require('node:fs');
const os = require('node:os');
```

Replace them with:

```text
const fs = require('node:fs');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const os = require('node:os');
```

**Edit 3.12** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
const siteApi = require('./site-api.cjs');
const { PASSWORD_MIN, SESSION_IDLE_MS, SESSION_MAX_MS, LOCK_MS } = require('./site-auth.cjs');
```

Replace them with:

```text
const siteApi = require('./site-api.cjs');
const { openData } = require('./site-data.cjs');
const { PASSWORD_MIN, SESSION_IDLE_MS, SESSION_MAX_MS, LOCK_MS } = require('./site-auth.cjs');
```

**Edit 3.13** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
    asked.length = 0;
    assert.deepEqual([(await send('/api/auth/users', ivo, { username: 'depot', name: 'Depot', role: 'agent' })).json, asked, await count()], [{ error: 'workspace-exists' }, ['make depot'], before], 'the sub-site of another account is not taken');
    // a sub-site that is there and is nobody's — its account was not made the last time — is taken and started
```

Replace them with:

```text
    asked.length = 0;
    assert.deepEqual([(await send('/api/auth/users', ivo, { username: 'depot', name: 'Depot', role: 'agent' })).json, asked, await count()], [{ error: 'workspace-exists' }, [], before], 'the sub-site of another account is not taken — the provisioner is not even asked');
    // a sub-site that is there and is nobody's — its account was not made the last time — is taken and started
```

**Edit 3.14** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
    assert.deepEqual([(await send('/api/auth/users', ivo, { username: 'second', name: 'Second', role: 'agent' })).json, await account('second')], [{ error: 'workspace-full' }, undefined], 'not when it cannot be started');
    delete refuse.start;
```

Replace them with:

```text
    assert.deepEqual([(await send('/api/auth/users', ivo, { username: 'second', name: 'Second', role: 'agent' })).json, await account('second')], [{ error: 'workspace-full' }, undefined], 'not when it cannot be started');
    // there when asked, and gone when it is to be started: refused, and nothing made
    refuse.start = 'workspace-unknown-site';
    states.set('ghost', 'stopped');
    assert.deepEqual([(await send('/api/auth/users', ivo, { username: 'ghost', name: 'Ghost', role: 'agent' })).status, await account('ghost')], [409, undefined]);
    delete refuse.start;
```

**Edit 3.15** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
    delete refuse.stop;
    // an employee whose sub-site the platform did not make, and a supervisor: the account only
    asked.length = 0;
    assert.deepEqual([(await send('/api/auth/users/disable', ivo, { username: 'zed' })).json, (await send('/api/auth/users/enable', ivo, { username: 'zed' })).json, (await account('zed')).disabled, asked], [{ ok: true }, { ok: true }, false, ['stop nowhere', 'start nowhere']]);
    asked.length = 0;
```

Replace them with:

```text
    delete refuse.stop;
    // an employee whose sub-site the platform does not know: off is the account only, on makes the sub-site
    asked.length = 0;
    assert.deepEqual([(await send('/api/auth/users/disable', ivo, { username: 'zed' })).json, (await send('/api/auth/users/enable', ivo, { username: 'zed' })).json, (await account('zed')).disabled, asked, states.get('nowhere')], [{ ok: true }, { ok: true, workspace: 'starting' }, false, ['stop nowhere', 'start nowhere', 'make nowhere'], 'starting']);
    // which is that account's: a new employee of that name is refused before the provisioner is asked
    asked.length = 0;
    assert.deepEqual([(await send('/api/auth/users', ivo, { username: 'nowhere', name: 'Nowhere', role: 'agent' })).json, asked], [{ error: 'workspace-exists' }, []]);
    // a supervisor: the account only
    asked.length = 0;
```

**Edit 3.16** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
    const lines = logged.filter(line => line.startsWith('site workspace '));
    for (const line of ['site workspace make ok by=ivo site=lena', 'site workspace make ok by=joy site=mia-2', 'site workspace make failed by=ivo site=rita error=workspace-full', 'site workspace make failed by=ivo site=depot error=workspace-exists', 'site workspace make ok by=ivo site=orphan', 'site workspace stop ok by=ivo site=lena', 'site workspace start failed by=ivo site=lena error=workspace-full', 'site workspace start ok by=joy site=lena', 'site workspace stop failed by=ivo site=depot error=workspace-unavailable']) assert(lines.includes(line), line + '\n' + lines.join('\n'));
    assert(logged.includes('site account created by=ivo user=lena role=agent'));
```

Replace them with:

```text
    const lines = logged.filter(line => line.startsWith('site workspace '));
    for (const line of ['site workspace make ok by=ivo site=lena', 'site workspace make ok by=joy site=mia-2', 'site workspace make failed by=ivo site=rita error=workspace-full', 'site workspace make ok by=ivo site=orphan', 'site workspace stop ok by=ivo site=lena', 'site workspace start failed by=ivo site=lena error=workspace-full', 'site workspace start ok by=joy site=lena', 'site workspace stop failed by=ivo site=depot error=workspace-unavailable']) assert(lines.includes(line), line + '\n' + lines.join('\n'));
    assert(logged.includes('site account created by=ivo user=lena role=agent'));
```

**Edit 3.17** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text

test('the log names users and outcomes, never a password, a token or data', () => {
```

Replace them with:

```text

test('deleting an account: for supervisors and administrators, never one\'s own, an administrator\'s only as an administrator; an employee\'s sub-site goes with the last account of it, and the translations of its messages with it; the account goes only once its sub-site is gone; a server that makes no sub-sites deletes no employee; each step in the log', async () => {
  // a stand-in for the first server's client of the provisioner: what it was asked, and how it answers
  const asked = [], states = new Map([['rosa', 'ready'], ['vera', 'stopped'], ['pair', 'ready']]);
  let refuse = null, signedOut = true;
  const no = code => Object.assign(new Error(code), { code });
  const workspaces = {
    list: async () => ({ sites: [...states].map(([id, state]) => ({ id, state })), room: { max: 4, running: 1, freeMb: 3000, minFreeMb: 1400, canStart: true } }),
    make: async id => { asked.push('make ' + id); throw no('workspace-full'); },
    start: async id => { asked.push('start ' + id); throw no('workspace-full'); },
    stop: async id => { asked.push('stop ' + id); return { id, state: 'stopped' }; },
    remove: async id => {
      asked.push('remove ' + id);
      if (refuse) throw no(refuse);
      if (!states.has(id)) throw no('workspace-unknown-site');
      states.delete(id);
      return { id, state: 'removed', signedOut };
    },
  };
  const dir = path.join(tmp, 'main');
  const first = siteApi.create({ dir, siteId: 'hq3', now: () => clock, workspaces });
  const firstServer = http.createServer((req, res) => first.handle(req, res, new URL(req.url, 'http://localhost').pathname));
  await new Promise(resolve => firstServer.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${firstServer.address().port}`;
  // rosa's sub-site: messages, some translated, and the language she reads in; the relay keeps translations of
  // its messages and of another's under a fingerprint of the language and the text (ai-relay.cjs)
  const fingerprint = (to, text) => crypto.createHash('sha256').update(to + '\n' + text).digest('hex');
  const rosaData = openData(path.join(dir, 'site-rosa.db'));
  rosaData.write({ baseVersion: 0, by: 'test', set: {
    'messages/c1': [{ id: 'm1', text: ' Hola, ¿tienen cajas? ', translated: '你好，有箱子吗？', translatedTo: '简体中文' }, { id: 'm2', text: 'Gracias', translatedTo: 'English' }],
    'messages/c2': [{ id: 'm3', text: '[图片]' }],
    ai: { readLanguage: '简体中文' },
  } });
  rosaData.close();
  const store = new DatabaseSync(path.join(dir, 'ai-translations.db'));
  store.exec('CREATE TABLE IF NOT EXISTS translations (key TEXT PRIMARY KEY, text TEXT NOT NULL, at TEXT NOT NULL)');
  for (const [to, text] of [['简体中文', 'Hola, ¿tienen cajas?'], ['English', 'Gracias'], ['简体中文', 'Gracias'], ['简体中文', 'Bonjour à tous']]) store.prepare('INSERT OR REPLACE INTO translations (key, text, at) VALUES (?, ?, ?)').run(fingerprint(to, text), 'translated', 'now');
  const kept = () => store.prepare('SELECT key FROM translations').all().map(row => row.key);
  try {
    const rosa = await member('rosa', 'agent', 'rosa');
    await member('vera', 'agent', 'vera');
    await member('tim', 'agent', 'pair');
    await member('tom', 'agent', 'pair');
    site.auth.setDisabled('tom', true);
    await site.auth.createUser({ username: 'odd', role: 'agent', name: 'Odd', site: 'bad_site' });
    await site.auth.createUser({ username: 'drift', role: 'agent', name: 'Drift', site: 'nobody-knows' });
    const zara = await member('zara', 'supervisor');
    const signIn = async username => cookieOf(await call('/api/auth/login', { method: 'POST', body: { username, password: PASSWORD } }));
    const [gus, ivo, joy] = [await signIn('gus'), await signIn('ivo'), await signIn('joy')];
    const send = (cookie, username) => call('/api/auth/users/remove', { method: 'POST', cookie, base, body: { username } });
    const exists = username => site.auth.listUsers().some(user => user.username === username);
    // who may: supervisors and administrators; never one's own; an administrator's only as an administrator
    assert.deepEqual([(await send(gus, 'zara')).json, (await call('/api/auth/users/remove', { method: 'POST', base, body: { username: 'zara' } })).status, (await send(ivo, 'ivo')).json, (await send(ivo, 'joy')).json, (await send(ivo, 'nobody')).json, (await call('/api/auth/users/remove', { method: 'POST', cookie: ivo, base, body: { username: 'zara' }, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status], [{ error: 'forbidden' }, 401, { error: 'own-account' }, { error: 'forbidden' }, { error: 'unknown-user' }, 403]);
    assert.deepEqual([asked, exists('zara'), exists('joy')], [[], true, true], 'none of the refused did anything');
    // a supervisor's account: deleted with its sessions; the provisioner is not asked
    assert.deepEqual((await send(joy, 'zara')).json, { ok: true });
    assert.deepEqual([exists('zara'), (await call('/api/auth/me', { cookie: zara, base })).status, (await call('/api/auth/login', { method: 'POST', base, body: { username: 'zara', password: PASSWORD } })).status, asked], [false, 401, 401, []]);
    // an employee whose sub-site another account still has — also one that is switched off: the account only
    assert.deepEqual([(await send(ivo, 'tim')).json, exists('tim'), asked, states.has('pair')], [{ ok: true }, false, [], true]);
    // the last account of it: the sub-site goes too — and while the provisioner refuses, the account stays
    for (const [reason, status] of [['workspace-busy', 409], ['workspace-unavailable', 503]]) {
      refuse = reason;
      const refused = await send(ivo, 'tom');
      assert.deepEqual([refused.status, refused.json, exists('tom')], [status, { error: reason }, true]);
    }
    refuse = null;
    asked.length = 0;
    assert.deepEqual([(await send(ivo, 'tom')).json, exists('tom'), asked, states.has('pair')], [{ ok: true, workspace: 'removed' }, false, ['remove pair'], false]);
    // rosa's: her sub-site, and the translations of its messages — those of another stay; her session ends
    asked.length = 0;
    assert.deepEqual((await send(ivo, 'rosa')).json, { ok: true, workspace: 'removed' });
    assert.deepEqual([exists('rosa'), asked, kept(), (await call('/api/auth/me', { cookie: rosa, base })).status], [false, ['remove rosa'], [fingerprint('简体中文', 'Bonjour à tous')], 401]);
    // a number that could not be signed out at WhatsApp is said so
    signedOut = false;
    assert.deepEqual((await send(joy, 'vera')).json, { ok: true, workspace: 'removed', phone: 'not-signed-out' });
    signedOut = true;
    // a sub-site the provisioner does not know, and a name no sub-site can have: the account only
    asked.length = 0;
    assert.deepEqual([(await send(ivo, 'drift')).json, (await send(ivo, 'odd')).json, exists('drift'), exists('odd'), asked], [{ ok: true }, { ok: true }, false, false, ['remove nobody-knows']]);
    // a server that makes no sub-sites deletes no employee's account — the data would stay behind — but a supervisor's
    await member('ulla', 'agent', 'ulla');
    await member('quint', 'supervisor');
    assert.deepEqual([(await call('/api/auth/users/remove', { method: 'POST', cookie: ivo, body: { username: 'ulla' } })).json, exists('ulla'), (await call('/api/auth/users/remove', { method: 'POST', cookie: ivo, body: { username: 'quint' } })).json, exists('quint')], [{ error: 'workspace-unavailable' }, true, { ok: true }, false]);
    // every step in the log, with who did it; no password
    const lines = logged.filter(line => /^site (account removed|workspace (remove|translations))/.test(line));
    for (const line of ['site account removed by=joy user=zara role=supervisor', 'site account removed by=ivo user=tim role=agent', 'site workspace remove failed by=ivo site=pair error=workspace-busy', 'site workspace remove ok by=ivo site=pair', 'site workspace remove ok by=ivo site=rosa', 'site workspace translations removed site=rosa rows=3', 'site account removed by=ivo user=rosa role=agent', 'site account removed by=ivo user=quint role=supervisor']) assert(lines.includes(line), line + '\n' + lines.join('\n'));
    assert(!logged.join('\n').includes(PASSWORD), 'a password in the log');
  } finally {
    store.close();
    firstServer.closeAllConnections(); firstServer.close(); first.close();
  }
});

test('the log names users and outcomes, never a password, a token or data', () => {
```

**Edit 3.18** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
    assert.deepEqual([await plainly('POST', '/api/wa/\\..\\..\\auth/login'), await plainly('GET', '/api/site\\status'), await plainly('GET', '/api/site/status'), await plainly('GET', '/api/site/status?note=a\\b')], [400, 400, 200, 200]);
    // the server is for this machine only, unless it is told to listen elsewhere — as it is in a container
```

Replace them with:

```text
    assert.deepEqual([await plainly('POST', '/api/wa/\\..\\..\\auth/login'), await plainly('GET', '/api/site\\status'), await plainly('GET', '/api/site/status'), await plainly('GET', '/api/site/status?note=a\\b')], [400, 400, 200, 200]);
    // as are a slash written as %2F with parts of dots, a backslash written as %5C, an empty part, a part of dots
    assert.deepEqual(await Promise.all(['/api/wa/a%2Fb/../../auth/login', '/api/wa/a%2fb/../hook', '/api/site%5Cstatus', '//api/site/status', '/api/./site/status', '/x/%2e%2e/api/site/status', '/api/site/status/..'].map(pathname => plainly('GET', pathname))), [400, 400, 400, 400, 400, 400, 400]);
    assert.deepEqual([await plainly('GET', '/api/site/status?next=%2F..%2Fx//y'), await plainly('GET', '/')], [200, 200], 'what follows the question mark is no part of the path');
    // the server is for this machine only, unless it is told to listen elsewhere — as it is in a container
```

**Verify**: `sha256sum work/wa-replica/serve.cjs work/wa-replica/site-auth.cjs work/wa-replica/site-api.cjs work/wa-replica/site-api.test.cjs` → `77eb8f61424af71fd48c044d30b4c8643b27ef50621a83c0dfc7774680e9f15e`, `2bf72a70cb477624dcefbcf8d9374a61f77b03e2da37a47fbdbfe100d7f56e25`, `3c684ec6cfcb2d9edbab3d74939365c3df3d483678463efbc1430efc185b187d`, `3578e934fe8c180e62124b4142bfce158601d99e94549524335978cbaa658f79`; `node --check` on `work/wa-replica/serve.cjs`, `site-auth.cjs` and `site-api.cjs` exits 0; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 18`, `fail 0`. If a checksum does not match, restore the file with `git checkout 1cae1b3 -- <file>` and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 4: The gateway and the upgrade script

#### `deploy/gateway.conf`

**Edit 4.1** — `deploy/gateway.conf`. Find exactly these lines (they occur once):

```text
        listen 8141;
        # A backslash in the path is a slash to the servers behind and none here: such a request could be passed
        # for one route and answered as another. Nobody asks so in earnest.
        if ($request_uri ~ "^[^?]*\x5c") { return 400; }

```

Replace them with:

```text
        listen 8141;
        # An address the servers behind could read differently from here is refused, so that a request is
        # answered as the route it was passed for: a backslash, a slash or a backslash written as %2F or %5C, an
        # empty part, or a part of dots. Nobody asks so in earnest; the servers refuse the same themselves.
        if ($request_uri ~* "^[^?]*(\x5c|%2f|%5c|//|/(\.|%2e){1,2}(/|\?|$))") { return 400; }

```

#### `deploy/upgrade.sh`

**Edit 4.2** — `deploy/upgrade.sh`. Find exactly these lines (they occur once):

```text
"${COMPOSE[@]}" up -d
# The gateway reads its configuration when it starts: a container that still has an older one is made anew.
if ! docker exec wa-scrm-gateway cat /etc/nginx/nginx.conf | cmp -s - deploy/gateway.conf; then
```

Replace them with:

```text
"${COMPOSE[@]}" up -d
# The gateway reads its configuration when it starts: a container that still has an older one is made anew, and
# one whose file was changed in place is told to read it again.
if ! docker exec wa-scrm-gateway cat /etc/nginx/nginx.conf | cmp -s - deploy/gateway.conf; then
```

**Edit 4.3** — `deploy/upgrade.sh`. Find exactly these lines (they occur once):

```text
  "${COMPOSE[@]}" up -d --force-recreate gateway
fi
```

Replace them with:

```text
  "${COMPOSE[@]}" up -d --force-recreate gateway
else
  docker exec wa-scrm-gateway nginx -s reload 2> /dev/null || true
fi
```

**Edit 4.4** — `deploy/upgrade.sh`. Find exactly these lines (they occur once):

```text
# started does not keep the others waiting: the script then ends with an error, and can be run again.
running() { [ "$(docker inspect -f '{{.State.Running}}' "wa-scrm-site-$1" 2> /dev/null)" = true ]; }
LEFT=0
```

Replace them with:

```text
# started does not keep the others waiting: the script then ends with an error, and can be run again.
# A new server counts once it answers, as the image's own health check finds.
answers() { [ "$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "wa-scrm-site-$1" 2> /dev/null)" = healthy ]; }
LEFT=0
```

**Edit 4.5** — `deploy/upgrade.sh`. Find exactly these lines (they occur once):

```text
  docker rm -f "wa-scrm-site-$SITE" > /dev/null 2>&1 || true
  if [ "$STATE" != running ] && [ "$STATE" != restarting ]; then
```

Replace them with:

```text
  docker rm -f "wa-scrm-site-$SITE" > /dev/null 2>&1 || true
  # A server that could not be taken away would be started again as it is, with the old image.
  if docker inspect "wa-scrm-site-$SITE" > /dev/null 2>&1; then echo "sub-site $SITE: its old server could NOT be removed" >&2; LEFT=1; continue; fi
  if [ "$STATE" != running ] && [ "$STATE" != restarting ]; then
```

**Edit 4.6** — `deploy/upgrade.sh`. Find exactly these lines (they occur once):

```text
  for i in $(seq 1 90); do
    running "$SITE" && break
    sleep 2
  done
  if running "$SITE"; then echo "sub-site $SITE renewed"; else echo "sub-site $SITE: its server did NOT start" >&2; LEFT=1; fi
done < <(docker ps -a --filter label=wa-scrm.part=openwa --format '{{.Label "wa-scrm.site"}} {{.State}}')
```

Replace them with:

```text
  for i in $(seq 1 90); do
    answers "$SITE" && break
    sleep 2
  done
  if answers "$SITE"; then echo "sub-site $SITE renewed"; else echo "sub-site $SITE: its new server does NOT answer" >&2; LEFT=1; fi
done < <(docker ps -a --filter label=wa-scrm.part=openwa --format '{{.Label "wa-scrm.site"}} {{.State}}')
```

**Verify**: `sha256sum deploy/gateway.conf deploy/upgrade.sh` → `ecfce3459172d23f3bfe5ea021d27321e0952b3b2a5179693f141145768a299c`, `db93436ecffab10bd9d5ec89656c7c07d3aceb5b001857f4bd09da233591cdec`; `bash -n deploy/upgrade.sh` exits 0; `git ls-files -s deploy/upgrade.sh` still begins with `100644`. Do not run any of these files. If a checksum does not match, restore the file with `git checkout 1cae1b3 -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 5: The page, its style, the validator — and the build

#### `fidelity-master.js`

**Edit 5.1** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
// of its data by someone who is not its own employee. What the page changes are accounts and nothing else: a new
// supervisor — or, where the platform makes sub-sites, a new employee, who gets a sub-site of their own —, a new
// temporary password for someone, an account switched off or on — and it signs out.
(() => {
  'use strict';
```

Replace them with:

```text
// of its data by someone who is not its own employee. What the page changes are accounts and nothing else: a new
// supervisor — or, where the platform makes sub-sites, a new employee, who gets a sub-site of their own —, a new
// temporary password for someone, an account switched off or on, an account deleted — and it signs out.
(() => {
  'use strict';
```

**Edit 5.2** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
  }
  // What the list says of a sub-site the platform made, while it is not ready to be read.
  const WORKSPACE = { starting: '正在准备，大约需要一分钟…', ready: '已就绪', stopping: '正在停止…', stopped: '已停止', failed: '启动失败，可先「停用」再「启用」重试', missing: '尚未创建' };
  const workspaceText = value => '工作区：' + (WORKSPACE[value] || '状态未知');
  // quiet: asked in passing, while a sub-site is being made or started — what is shown stays until the answer is
```

Replace them with:

```text
  }
  // What the list says of a sub-site the platform made, while it is not ready to be read.
  const WORKSPACE = { starting: '正在准备，大约需要一分钟…', ready: '已就绪', stopping: '正在停止…', removing: '正在删除…', stopped: '已停止', failed: '启动失败，可先「停用」再「启用」重试', missing: '尚未创建' };
  const workspaceText = value => '工作区：' + (WORKSPACE[value] || '状态未知');
  // quiet: asked in passing, while a sub-site is being made or started — what is shown stays until the answer is
```

**Edit 5.3** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    watch();
  }
  // While a sub-site is being made, started or stopped, the list is asked again every few seconds — until all
  // have settled, and not while an employee's conversations are open.
  function watch() {
    clearTimeout(watch.timer);
    if (!state.open && state.sites.some(entry => entry.state === 'starting' || entry.state === 'stopping')) watch.timer = setTimeout(() => load(true), 4000);
  }
  function listHTML() {
```

Replace them with:

```text
    watch();
  }
  // While a sub-site is being made, started, stopped or deleted, the list is asked again every few seconds —
  // until all have settled, and not while an employee's conversations are open.
  function watch() {
    clearTimeout(watch.timer);
    if (!state.open && state.sites.some(entry => ['starting', 'stopping', 'removing'].includes(entry.state))) watch.timer = setTimeout(() => load(true), 4000);
  }
  function listHTML() {
```

**Edit 5.4** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
  }

  // ---- accounts: a new supervisor or employee, a new temporary password, an account off or on ----
  const ROLE = { agent: '员工', supervisor: '主管', admin: '管理员' };
  const PROBLEM = {
```

Replace them with:

```text
  }

  // ---- accounts: a new supervisor or employee, a new temporary password, an account off or on, deleted ----
  const ROLE = { agent: '员工', supervisor: '主管', admin: '管理员' };
  const PROBLEM = {
```

**Edit 5.5** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
  };
  // What can be done with someone else's account. One's own has none, and an administrator's only an administrator.
  function accountActs(account) {
    if (account.username === state.user.username) return '<span class="fid-master-quiet">当前账号</span>';
    if (account.role === 'admin' && state.user.role !== 'admin') return '<span class="fid-master-quiet">由管理员管理</span>';
    const id = esc(account.username);
    return `<button type="button" class="link" data-master="reset" data-id="${id}">重置密码</button>` + (account.disabled ? `<button type="button" class="link" data-master="enable" data-id="${id}">启用</button>` : `<button type="button" class="link" data-master="disable" data-id="${id}">停用</button>`);
  }
  function managersHTML() {
```

Replace them with:

```text
  };
  // What can be done with someone else's account. One's own has none, and an administrator's only an administrator.
  // An employee's account (the list's rows carry no role) can be deleted where the platform makes sub-sites:
  // elsewhere their data would stay behind.
  function accountActs(account) {
    if (account.username === state.user.username) return '<span class="fid-master-quiet">当前账号</span>';
    if (account.role === 'admin' && state.user.role !== 'admin') return '<span class="fid-master-quiet">由管理员管理</span>';
    const id = esc(account.username);
    return `<button type="button" class="link" data-master="reset" data-id="${id}">重置密码</button>` + (account.disabled ? `<button type="button" class="link" data-master="enable" data-id="${id}">启用</button>` : `<button type="button" class="link" data-master="disable" data-id="${id}">停用</button>`)
      + ((account.role || 'agent') !== 'agent' || state.provisioned ? `<button type="button" class="link danger" data-master="remove" data-id="${id}">删除</button>` : '');
  }
  function managersHTML() {
```

**Edit 5.6** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
  const stops = username => state.provisioned && state.sites.some(entry => entry.employees.some(employee => employee.username === username) && entry.employees.every(employee => employee.disabled || employee.username === username));
  async function switchAccount(username, on) {
    // Stopping a sub-site can take a moment: the dialog that asked stays, and says so.
    for (const button of $('#dialog').querySelectorAll('button')) button.disabled = true;
    if (!on && $('#dialog [data-master="disableDo"]')) $('#dialog [data-master="disableDo"]').textContent = '正在停用…';
    const answer = await post(on ? '/api/auth/users/enable' : '/api/auth/users/disable', { username });
    closeDialog();
    const also = { starting: '，工作区正在启动', stopped: '，工作区已停止', running: '，但工作区没能停止' }[answer.body.workspace] || '';
    say(answer.status === 200 ? (on ? '账号已启用' : '账号已停用') + also : problemText(answer));
    load();
  }

  // ---- one employee's customers and conversations ----
```

Replace them with:

```text
  const stops = username => state.provisioned && state.sites.some(entry => entry.employees.some(employee => employee.username === username) && entry.employees.every(employee => employee.disabled || employee.username === username));
  async function switchAccount(username, on) {
    // Stopping a sub-site can take a moment: the dialog that asked stays, and says so. The answer closes that
    // dialog only — not one that was opened meanwhile.
    const asking = $('#dialog').open ? $('#dialog-content').firstElementChild : null;
    for (const button of $('#dialog').querySelectorAll('button')) button.disabled = true;
    if (!on && $('#dialog [data-master="disableDo"]')) $('#dialog [data-master="disableDo"]').textContent = '正在停用…';
    const answer = await post(on ? '/api/auth/users/enable' : '/api/auth/users/disable', { username });
    if (asking?.isConnected) closeDialog();
    const also = { starting: '，工作区正在启动', stopped: '，工作区已停止', running: '，但工作区没能停止' }[answer.body.workspace] || '';
    say(answer.status === 200 ? (on ? '账号已启用' : '账号已停用') + also : problemText(answer));
    load();
  }
  // Deleting an account: asked first, and the sign-in name is typed to confirm — what is deleted cannot come back.
  // The question says what goes: an employee's workspace with the last account of it.
  function removeForm(username, problem = '') {
    const account = state.users.find(user => user.username === username) || { username, role: 'agent' };
    const shared = state.sites.some(entry => entry.employees.length > 1 && entry.employees.some(employee => employee.username === username));
    const text = account.role !== 'agent' ? `删除「${label(username)}」的账号？账号会被永久删除，无法恢复。`
      : shared ? `删除「${label(username)}」的账号？账号会被永久删除。工作区还有其他员工的账号，会保留。`
        : `删除「${label(username)}」的账号？账号、工作区、WhatsApp 连接（手机上也会退出）以及全部客户和聊天记录都会被永久删除，无法恢复。如需保留数据，请改用「停用」。`;
    showDialog('删除账号', `<form id="master-remove" class="fid-master-form" data-id="${esc(username)}" novalidate>
        <p>${esc(text)}</p>
        <label class="field">请输入登录名「${esc(username)}」以确认<input name="confirm" autocomplete="off" autocapitalize="none" spellcheck="false"></label>
        <p class="fid-master-problem" role="alert" ${problem ? '' : 'hidden'}>${esc(problem)}</p>
      </form>`, '<button type="button" class="fid-btn" data-master="close">取消</button><button type="submit" form="master-remove" class="fid-btn danger">删除</button>');
    $('#master-remove [name="confirm"]').focus();
  }
  const REMOVE_PROBLEM = { 'workspace-busy': '这个工作区正在准备或停止中，请稍后再试。', 'workspace-unavailable': '暂时无法删除工作区，请稍后再试。' };
  async function removeAccount(form) {
    const username = form.dataset.id;
    if (form.elements.confirm.value.trim().toLowerCase() !== username) return removeForm(username, '输入的登录名不一致。');
    // Deleting a workspace takes a moment — its numbers are signed out first: the dialog waits, and says so. The
    // answer closes that dialog only — not one that was opened meanwhile.
    const asking = $('#dialog-content').firstElementChild;
    for (const button of $('#dialog').querySelectorAll('button')) button.disabled = true;
    $('#dialog [type="submit"]').textContent = '正在删除…';
    const answer = await post('/api/auth/users/remove', { username });
    if (!asking.isConnected) say(answer.status === 200 ? '账号已删除' : problemText(answer));
    else if (answer.status !== 200) removeForm(username, REMOVE_PROBLEM[answer.body.error] || problemText(answer));
    else if (answer.body.phone === 'not-signed-out') showDialog('账号已删除', '<p>账号已删除。WhatsApp 号码没能在手机上自动退出：如果这位员工绑定过号码，请在手机 WhatsApp 的「设置 → 已关联的设备」中把它移除。</p>', DONE);
    else {
      closeDialog();
      say('账号已删除');
    }
    load();
  }

  // ---- one employee's customers and conversations ----
```

**Edit 5.7** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    disableDo: username => switchAccount(username, false),
    enable: username => switchAccount(username, true),
  };

```

Replace them with:

```text
    disableDo: username => switchAccount(username, false),
    enable: username => switchAccount(username, true),
    remove: username => removeForm(username),
  };

```

**Edit 5.8** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
      event.preventDefault();
      if (event.target.id === 'master-create') createAccount(event.target);
    });
    // The Escape key closes a dialog as its buttons do.
```

Replace them with:

```text
      event.preventDefault();
      if (event.target.id === 'master-create') createAccount(event.target);
      else if (event.target.id === 'master-remove') removeAccount(event.target);
    });
    // The Escape key closes a dialog as its buttons do.
```

#### `fidelity.css`

**Edit 5.9** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-master-acts .link:hover { text-decoration:underline; }
.fid-master-dialog p { margin:0 0 8px; font-size:14px; line-height:22px; }
```

Replace them with:

```text
.fid-master-acts .link:hover { text-decoration:underline; }
.fid-master-acts .link.danger { color:var(--color-danger); }
.fid-master-dialog p { margin:0 0 8px; font-size:14px; line-height:22px; }
```

#### `validate-scrm-lifecycle.cjs`

**Edit 5.10** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(bootSource.includes("if (user.role !== 'agent') {") && bootSource.includes('return window.WA_MASTER(user);') && !bootSource.includes('主管与管理员入口尚未开放'), 'fidelity-boot.js must hand a supervisor over to the supervisor page');
assert.deepEqual([...new Set(masterSource.match(/'\/api\/[^']*'/g))].sort(), ["'/api/auth/logout'", "'/api/auth/sites'", "'/api/auth/users'", "'/api/auth/users/disable'", "'/api/auth/users/enable'", "'/api/auth/users/reset'", "'/api/data'", "'/api/data?fields=accounts,customers,tasks'", "'/api/wa/media?account='", "'/api/wa/status'"], 'the supervisor page asks an unexpected address');
// What the page changes goes through one helper, and only to the addresses of accounts and of signing out —
```

Replace them with:

```text
assert(bootSource.includes("if (user.role !== 'agent') {") && bootSource.includes('return window.WA_MASTER(user);') && !bootSource.includes('主管与管理员入口尚未开放'), 'fidelity-boot.js must hand a supervisor over to the supervisor page');
assert.deepEqual([...new Set(masterSource.match(/'\/api\/[^']*'/g))].sort(), ["'/api/auth/logout'", "'/api/auth/sites'", "'/api/auth/users'", "'/api/auth/users/disable'", "'/api/auth/users/enable'", "'/api/auth/users/remove'", "'/api/auth/users/reset'", "'/api/data'", "'/api/data?fields=accounts,customers,tasks'", "'/api/wa/media?account='", "'/api/wa/status'"], 'the supervisor page asks an unexpected address');
// What the page changes goes through one helper, and only to the addresses of accounts and of signing out —
```

**Edit 5.11** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert.deepEqual(masterSource.match(/method: '[A-Z]+'/g), ["method: 'POST'"], 'the supervisor page must send its changes through one helper');
assert.deepEqual([...new Set(masterSource.match(/\bpost\([^,]+,/g))].sort(), ["post('/api/auth/logout',", "post('/api/auth/users',", "post('/api/auth/users/reset',", "post(on ? '/api/auth/users/enable' : '/api/auth/users/disable',"], 'the supervisor page must change accounts only, and sign out');
assert(masterSource.includes("const at = (site, path) => '/site/' + encodeURIComponent(site) + path;") && !/fetch\(at\(/.test(masterSource), 'the supervisor page must ask each sub-site under its own name, and only ask');
```

Replace them with:

```text
assert.deepEqual(masterSource.match(/method: '[A-Z]+'/g), ["method: 'POST'"], 'the supervisor page must send its changes through one helper');
assert.deepEqual([...new Set(masterSource.match(/\bpost\([^,]+,/g))].sort(), ["post('/api/auth/logout',", "post('/api/auth/users',", "post('/api/auth/users/remove',", "post('/api/auth/users/reset',", "post(on ? '/api/auth/users/enable' : '/api/auth/users/disable',"], 'the supervisor page must change accounts only, and sign out');
assert(masterSource.includes("const at = (site, path) => '/site/' + encodeURIComponent(site) + path;") && !/fetch\(at\(/.test(masterSource), 'the supervisor page must ask each sub-site under its own name, and only ask');
```

**Edit 5.12** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(provisionerSource.indexOf("throw problem('not-allowed')") < provisionerSource.indexOf("new URL(req.url, 'http://localhost')"), 'the provisioner must check the shared secret before it reads the address');
assert(provisionerSource.includes("work.set(id, 'stopping');") && provisionerSource.includes("if (volume.status !== 200) await docker('DELETE', `/volumes/${n.volume}`).catch(() => {});") && !/Number\(env\.WA_SCRM_[A-Z_]+\) \|\|/.test(provisionerSource), 'the provisioner must be busy while it stops a sub-site, take away a volume it made for nothing, and take a 0 among its settings as meant');
assert(read(path.join(__dirname, 'serve.cjs')).includes("if (req.url.split('?')[0].includes('\\\\')) return sendJson(res, 400, { error: 'invalid-request' });"), 'the server must refuse an address with a backslash in its path');
for (const required of ['proxy_request_buffering off;', 'proxy_max_temp_file_size 0;', 'if ($request_uri ~ "^[^?]*\\x5c") { return 400; }', 'location = /api/wa/hook { return 404; }', 'location ~ ^/site/[a-z0-9][a-z0-9-]*/api/wa/hook$ { return 404; }', 'access_log /dev/stdout plain;', 'client_max_body_size 16k;']) {
  assert(deploy('gateway.conf').includes(required), `deploy/gateway.conf is missing ${required}`);
```

Replace them with:

```text
assert(provisionerSource.indexOf("throw problem('not-allowed')") < provisionerSource.indexOf("new URL(req.url, 'http://localhost')"), 'the provisioner must check the shared secret before it reads the address');
assert(provisionerSource.includes("work.set(id, 'stopping');") && provisionerSource.includes("if (fresh) await docker('DELETE', `/volumes/${n.volume}`).catch(() => {});") && provisionerSource.includes("const volume = ok(await docker('GET', `/volumes/${n.volume}`), 200, 404), fresh = volume.status === 404;") && !/Number\(env\.WA_SCRM_[A-Z_]+\) \|\|/.test(provisionerSource), 'the provisioner must be busy while it stops a sub-site, take away a volume it made for nothing, and take a 0 among its settings as meant');
assert(serveSource.includes("const raw = req.url.split('?')[0];") && serveSource.includes('|%2f|%5c|') && serveSource.includes("raw.split('/').some(part => ") && serveSource.includes(".test(part))) return sendJson(res, 400, { error: 'invalid-request' });"), 'the server must refuse an address that a gateway could read differently: a backslash, an encoded slash or backslash, an empty part, a part of dots');
for (const required of ['proxy_request_buffering off;', 'proxy_max_temp_file_size 0;', 'if ($request_uri ~* "^[^?]*(\\x5c|%2f|%5c|//|/(\\.|%2e){1,2}(/|\\?|$))") { return 400; }', 'location = /api/wa/hook { return 404; }', 'location ~ ^/site/[a-z0-9][a-z0-9-]*/api/wa/hook$ { return 404; }', 'access_log /dev/stdout plain;', 'client_max_body_size 16k;']) {
  assert(deploy('gateway.conf').includes(required), `deploy/gateway.conf is missing ${required}`);
```

**Edit 5.13** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(masterSource.includes('const kind = state.provisioned') && masterSource.includes('state.provisioned = !state.failed && list.body.provisioned === true;') && masterSource.includes("const answer = await post('/api/auth/users', values);"), 'the supervisor page must offer an employee only where the server says that sub-sites are made');
assert(!/演示|原型|评审|本机|示例|体验/.test(masterSource) && !/WA_SITE|localStorage|sessionStorage/.test(masterSource), 'the supervisor page must not speak of a demonstration, nor touch the app or the browser\'s storage');
```

Replace them with:

```text
assert(masterSource.includes('const kind = state.provisioned') && masterSource.includes('state.provisioned = !state.failed && list.body.provisioned === true;') && masterSource.includes("const answer = await post('/api/auth/users', values);"), 'the supervisor page must offer an employee only where the server says that sub-sites are made');
// An account can be deleted for good: by a supervisor or an administrator, never one's own, an administrator's
// only by an administrator, its sessions with it. An employee's sub-site goes with the last account of it — the
// sub-site first, the account once it is gone — and the translations of its messages under the relay's own
// fingerprint; a server that makes no sub-sites deletes no employee. The provisioner deletes what the id names,
// signs the numbers out first, and is busy meanwhile. The page asks for the sign-in name to be typed.
for (const required of ['function deleteUser(username) {', "db.prepare('DELETE FROM users WHERE id = ?').run(row.id);", 'user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,', 'PRAGMA foreign_keys = ON;']) {
  assert(siteSources['site-auth.cjs'].includes(required), `site-auth.cjs is missing ${required}`);
}
for (const required of ["'POST /api/auth/users/remove': async req => {", "if (!workspaces) throw problem('workspace-unavailable');", "crypto.createHash('sha256').update(language + '\\n' + text).digest('hex')", "const drop = db.prepare('DELETE FROM translations WHERE key = ?');"]) {
  assert(apiSource.includes(required), `site-api.cjs is missing ${required}`);
}
assert(apiSource.indexOf('const actor = manager(req), target = managed(actor, (await readJson(req)).username);\n      const workspace = await workspaceRemove(actor, target);\n      auth.deleteUser(target.username);') > 0, 'an account must be deleted only after the sub-site that goes with it');
assert(read(path.join(__dirname, 'ai-relay.cjs')).includes("const translationKey = (to, text) => crypto.createHash('sha256').update(to + '\\n' + text).digest('hex');"), 'the fingerprint of a translation must be the relay\'s own');
for (const required of ["'POST /sites/remove': async (body, id) => {", "work.set(id, 'removing');", "const files = [n.settings, ...['site', 'wa'].flatMap(kind => ['', '-wal', '-shm'].map(end => `${kind}-${id}.db${end}`)), `wa-media-${id}`].map(name => path.join(config.dataDir, name));", "const signedOut = await signOut(id, parts, volume);", "/^\\/sites\\/([^/]+)\\/(start|stop|remove)$/"]) {
  assert(provisionerSource.includes(required), `site-provisioner.cjs is missing ${required}`);
}
assert(provisionerSource.indexOf('const signedOut = await signOut(id, parts, volume);') < provisionerSource.indexOf("for (const name of [n.server, n.openwa]) ok(await docker('DELETE', `/containers/${name}?force=true`), 204, 404);"), 'the numbers of a sub-site must be signed out before its containers are taken away');
assert(masterSource.includes("if (form.elements.confirm.value.trim().toLowerCase() !== username) return removeForm(username, '输入的登录名不一致。');") && masterSource.includes("const answer = await post('/api/auth/users/remove', { username });"), 'the supervisor page must ask for the sign-in name to be typed before an account is deleted');
assert(!/演示|原型|评审|本机|示例|体验/.test(masterSource) && !/WA_SITE|localStorage|sessionStorage/.test(masterSource), 'the supervisor page must not speak of a demonstration, nor touch the app or the browser\'s storage');
```

**Verify**: `sha256sum work/wa-replica/fidelity-master.js work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs` → `34123b5deab3bf3d641199ca9c451c02b83cba5ef12c091d8e121c4f7a188ec8`, `d46b124c6a4690edd0590dd83d03ec993ced85648ec197a682793bf591051618`, `b77a9fccbe9e09a565369db15e48a939f236e396ee2ba268556e75bf5c62509d`; `git checkout 1cae1b3 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.css`, `master.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else (if `icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one); `cmp outputs/wa-replica-prototype/master.js work/wa-replica/fidelity-master.js` exits 0; `sha256sum outputs/wa-replica-prototype/app.css` → `96d1ab723a7084bd75bbe865cdaea69ef016e56ac4d93ac8858a70e30ddd3b92`. If a checksum does not match, restore the file with `git checkout 1cae1b3 -- <file>` and apply its instructions again; if it still does not match, or another output file changed, STOP.

### Step 6: README, build log, final verification

#### `README.md`

**Edit 6.1** — `README.md`. Find exactly these lines (they occur once):

````text
```
工具只显示一次临时密码，持有人首次登录后必须修改；自己设置的密码至少 8 位。员工登录后进入自己的子站，新子站从空白开始。主管与管理员登录后进入「主管视图」：员工总览列出每位员工的 WhatsApp 号码及连接状态、客户数、未读会话数、待跟进数和最近消息时间；点击「查看」可以只读方式查看该员工的客户与会话（含图片、语音、文件和已有译文）。主管视图不能发送消息，也不能修改任何员工工作区的数据；主管或管理员每读取一次子站数据，该子站的服务器都会记录一行日志（谁、哪个子站、读取了哪些内容）。主管与管理员还可以在主管视图里管理账号：查看全部账号，点击「新建账号」创建主管账号（填写密码则直接使用该密码，留空则生成只显示一次的临时密码，对方首次登录时必须修改），为他人「重置密码」，「停用」或「启用」账号。用容器运行整套平台时（见下文），「新建账号」还可以创建员工账号：系统同时为这位员工建立独立的工作区（子站）和 WhatsApp 连接，登录名即子站编号（3–32 位小写字母、数字或连字符，以字母或数字开头和结尾）；工作区数量达到上限或服务器内存不足时不会创建，也不会留下账号。停用员工账号会停止其工作区并空出位置（同一工作区还有其他可登录的员工时不停止），数据保留；启用时先启动工作区，无法启动则账号保持停用。不能操作自己的账号，管理员账号只能由管理员操作；每次操作都会记入服务器日志（谁、对哪个账号、做了什么）。未设置 `WA_SCRM_DATA_DIR` 时页面只显示「服务器尚未启用账号」。

````

Replace them with:

````text
```
工具只显示一次临时密码，持有人首次登录后必须修改；自己设置的密码至少 8 位。员工登录后进入自己的子站，新子站从空白开始。主管与管理员登录后进入「主管视图」：员工总览列出每位员工的 WhatsApp 号码及连接状态、客户数、未读会话数、待跟进数和最近消息时间；点击「查看」可以只读方式查看该员工的客户与会话（含图片、语音、文件和已有译文）。主管视图不能发送消息，也不能修改任何员工工作区的数据；主管或管理员每读取一次子站数据，该子站的服务器都会记录一行日志（谁、哪个子站、读取了哪些内容）。主管与管理员还可以在主管视图里管理账号：查看全部账号，点击「新建账号」创建主管账号（填写密码则直接使用该密码，留空则生成只显示一次的临时密码，对方首次登录时必须修改），为他人「重置密码」，「停用」或「启用」账号。用容器运行整套平台时（见下文），「新建账号」还可以创建员工账号：系统同时为这位员工建立独立的工作区（子站）和 WhatsApp 连接，登录名即子站编号（3–32 位小写字母、数字或连字符，以字母或数字开头和结尾）；工作区数量达到上限或服务器内存不足时不会创建，也不会留下账号。停用员工账号会停止其工作区并空出位置（同一工作区还有其他可登录的员工时不停止），数据保留；启用时先启动工作区，无法启动则账号保持停用。「删除」会永久删除账号，删除前需输入对方的登录名确认：主管与管理员账号直接删除；员工账号连同其工作区一起删除——WhatsApp 号码先在手机上退出（无法自动退出时页面会提示到手机 WhatsApp 的「已关联的设备」中移除），全部客户、聊天记录及其译文一并删除，无法恢复；同一工作区还有其他员工的账号时，工作区保留。需要保留数据时请改用「停用」。不能操作自己的账号，管理员账号只能由管理员操作；每次操作都会记入服务器日志（谁、对哪个账号、做了什么）。未设置 `WA_SCRM_DATA_DIR` 时页面只显示「服务器尚未启用账号」。

````

**Edit 6.2** — `README.md`. Find exactly these lines (they occur once):

```text

网关不在内存里暂存上传的内容，访问日志不记录查询参数（其中可能含有客户号码），路径里带反斜杠的请求一律拒绝；OpenWA 的事件只在容器之间传递，不经过对外地址。

```

Replace them with:

```text

网关不在内存里暂存上传的内容，访问日志不记录查询参数（其中可能含有客户号码）；路径里带反斜杠、编码后的斜杠或反斜杠（%2F、%5C）、空段或只由点组成的段的请求一律拒绝，网关和各个服务都会检查；OpenWA 的事件只在容器之间传递，不经过对外地址。

```

#### `replica/build-log.md`

**Append 6.3** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 账号可以删除；员工的工作区随最后一个账号一起删除 · 2026-11-23

项目负责人要求能够删除账号，并在两种做法中选择了"全部删除"：员工的账号、工作区、WhatsApp 连接（手机上也要退出）和全部客户与聊天记录一起永久删除，工作区的位置随之空出；同一工作区还有其他员工在用时工作区保留；主管账号直接删除；需要保留数据时改用「停用」。

- 主管视图里每个可操作的账号旁新增「删除」。确认框说明会删除什么，并要求输入对方的登录名；删除工作区需要一点时间（先让号码在手机上退出），期间确认框显示"正在删除…"。号码没能自动退出时，页面提示到手机 WhatsApp 的「设置 → 已关联的设备」中移除。
- 主管和管理员都可以删除账号；不能删除自己的账号，管理员账号只能由管理员删除。删除后对方的登录立即失效。
- 员工账号：先由调度服务删除工作区，成功后才删除账号——工作区删不掉（例如正在准备中），账号就保留，可以稍后再试。调度服务删除工作区时，先请该工作区的 OpenWA 让已绑定的号码退出（工作区已停用时临时启动它，服务器内存不足时跳过），再删除两个容器、OpenWA 的数据、连接设置和工作区的数据文件（客户与聊天记录、WhatsApp 记录和媒体）；共用的翻译缓存里该工作区消息的译文也一并删除。只按工作区编号删除，不会碰到其他工作区。
- 不由平台管理工作区的部署不能删除员工账号（数据会留在服务器上），只能删除主管账号。
- 同时处理了上一步（在主管视图里创建员工）复查时发现的问题：路径里带编码斜杠和点段的请求可能被网关与服务读成不同的地址，现在两边都拒绝；工作区启动失败后，「停用」再「启用」会重新创建它；已经属于某个账号的工作区不会再分给新账号；以及升级脚本、调度服务和页面对话框的几处细节。

验证：接口测试用模拟的调度服务和模拟的 Docker、OpenWA 覆盖各个分支（包括号码退出、内存不足、删除中途的占用、只剩数据文件的工作区）；浏览器测试走完删除的各种情形；并在真实 Docker 上经网关创建员工、绑定号码到扫码阶段后删除，确认容器、数据卷和数据文件全部清除——结束后全部清除。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout 1cae1b3 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-057/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `9a0a832c08b0cc23292b14eb17e5f1270bb68b90cc73469b607e918a23e3b785`, `ef37adac71a4afc8b5cd764c20815e0c98cd8c62eb62d40a7985bd335595fe0f`; `git status --porcelain` lists exactly these sixteen as changed and nothing as new: the thirteen files of the table in "Current state" and `outputs/wa-replica-prototype/app.css`, `master.js`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Tests of the provisioner** (12; two new, two extended): deleting a sub-site that runs — its linked number signed out and both sessions taken away, then both containers, the data volume, the settings and data files; nothing of another sub-site; one that is stopped — its OpenWA started to sign the number out once its connection is up again; one that is stopped with too little memory to start it — deleted all the same and said not to be signed out; one of which only data files are left; nothing at all of it; the platform's own names; busy while it is made and while it is deleted; afterwards its name can be made anew; the first server's side of it. A volume the engine cannot tell about: nothing made, nothing taken away, and a deletion waits for a clear answer. An address the provisioner does not know stays unknown.
- **Sign-in and data tests** (18; one new, two extended): deleting accounts — who may, never one's own, an administrator's only as an administrator, not from another site; a supervisor's account with its sessions; an employee whose workspace another (also a switched-off) account still has; the last account of a workspace, which waits while the provisioner refuses and then goes with its workspace and the translations of its messages (those of another stay); a number that could not be signed out; a workspace the provisioner does not know; a name no workspace can have; a server that makes no workspaces; every step in the log. From the review: a workspace an account has is refused before the provisioner is asked; "on" makes a workspace that is not there; one gone between "exists" and "start" is a refusal; the server refuses the addresses a gateway could read differently, and not the query string.
- **Validator** — the facts of both parts (see the blocks changed in Step 5).
- **Smoke** (`/tmp/wa-scrm-plan-057/smoke.sh`) — the same facts, the syntax of the files, which built files changed, and the tests of the server, the relay and the link.
- **Verified by the reviewer, not by you**: in a browser against a stand-in provisioner — the question before deleting, the typed name (a wrong one said so, letters in either case accepted), the waiting dialog, the row gone; a shared workspace and a supervisor; a busy workspace; a number not signed out; one's own account; the dialog on a phone; the earlier browser sessions. On a real Docker, on a test port and removed again: a supervisor deletes through the gateway an employee whose workspace is stopped (its OpenWA started for the signing out) and one whose workspace runs with a number waiting for its scan — containers, volume, files and account gone, sign-in refused, the name usable again; the gateway and a workspace's server refuse the addresses of the review.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 1cae1b3 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/site-provisioner.test.cjs` → `pass 12`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 18`, `fail 0`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 14`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-057/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/site-provisioner.cjs` → `33f61520610f98f57f1e3faa5bbafd240d0e37e50dbca6886069709963a47495`
- [ ] `sha256sum work/wa-replica/site-provisioner.test.cjs` → `ae5860d61588eedb4450f14945e9299d5ae8e404f98b06ae3c0e7b80acd723d8`
- [ ] `sha256sum work/wa-replica/serve.cjs` → `77eb8f61424af71fd48c044d30b4c8643b27ef50621a83c0dfc7774680e9f15e`
- [ ] `sha256sum work/wa-replica/site-auth.cjs` → `2bf72a70cb477624dcefbcf8d9374a61f77b03e2da37a47fbdbfe100d7f56e25`
- [ ] `sha256sum work/wa-replica/site-api.cjs` → `3c684ec6cfcb2d9edbab3d74939365c3df3d483678463efbc1430efc185b187d`
- [ ] `sha256sum work/wa-replica/site-api.test.cjs` → `3578e934fe8c180e62124b4142bfce158601d99e94549524335978cbaa658f79`
- [ ] `sha256sum deploy/gateway.conf` → `ecfce3459172d23f3bfe5ea021d27321e0952b3b2a5179693f141145768a299c`
- [ ] `sha256sum deploy/upgrade.sh` → `db93436ecffab10bd9d5ec89656c7c07d3aceb5b001857f4bd09da233591cdec`
- [ ] `sha256sum work/wa-replica/fidelity-master.js` → `34123b5deab3bf3d641199ca9c451c02b83cba5ef12c091d8e121c4f7a188ec8`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `d46b124c6a4690edd0590dd83d03ec993ced85648ec197a682793bf591051618`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `b77a9fccbe9e09a565369db15e48a939f236e396ee2ba268556e75bf5c62509d`
- [ ] `sha256sum README.md` → `9a0a832c08b0cc23292b14eb17e5f1270bb68b90cc73469b607e918a23e3b785`
- [ ] `sha256sum replica/build-log.md` → `ef37adac71a4afc8b5cd764c20815e0c98cd8c62eb62d40a7985bd335595fe0f`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `96d1ab723a7084bd75bbe865cdaea69ef016e56ac4d93ac8858a70e30ddd3b92`
- [ ] `cmp outputs/wa-replica-prototype/master.js work/wa-replica/fidelity-master.js` exits 0
- [ ] `git diff --name-only 1cae1b3..HEAD -- outputs` lists `app.css`, `master.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only 1cae1b3..HEAD -- . ':!plans'` lists exactly sixteen paths: the thirteen of the table in "Current state" and the three output files
- [ ] `git ls-files -s deploy/upgrade.sh` begins with `100644`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, the build reports another number of icons than 84, or a test fails.
- An output file other than `app.css`, `master.js` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file, creating a file, or using Docker.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`. The gateway reads its changed configuration again; the servers of the running workspaces get the new image; no WhatsApp connection is interrupted.
- What cannot be undone: a deleted workspace's data. Nothing keeps a copy; the confirmation is the safeguard. "停用" keeps everything.
- A number that could not be signed out (the machine short of memory when a stopped workspace was deleted, or the phone's connection not back within 30 seconds) stays listed on the phone until it is removed there; the page says so.
- The translations of the relay's store are found by the texts of the workspace's messages: a translation made of a text that the workspace no longer has (edited, or deleted by WhatsApp) is not found. Such a row can only be read by someone who has the text and asks for its translation.
- What a reviewer should scrutinise: that an account goes only after its workspace; that nothing of another workspace is touched (the names come from the id alone); that the numbers are signed out before the containers go; that the gateway and the servers refuse the same addresses.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
