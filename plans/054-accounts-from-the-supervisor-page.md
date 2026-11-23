# Plan 054: Accounts are managed from the supervisor page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0e7ab98..HEAD -- work/wa-replica replica/build-log.md outputs README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM (accounts are made and switched off from a web page for the first time: a mistake lets the wrong people do it or locks people out — exact text and checksums for every edit)
- **Depends on**: plans/053-after-the-supervisor-page.md (DONE)
- **Category**: feature (owner request; first of the steps towards making employees from the page)
- **Planned at**: commit `0e7ab98`, 2026-11-23

## Why this matters

The owner, 2026-11-23: "The admin interface needs to support user creation". Until now an account is made on the server with a command-line tool, by the one person who can sign in there. The owner was shown what the page would look like — a button "新建账号", a form with the sign-in name, the display name and an optional password, the temporary password shown once, and "重置密码" / "停用" beside each account — and answered: "Let's do it this way." Asked who may do it, the owner chose: "Supervisors too".

Creating an **employee** also needs that employee's own sub-site and WhatsApp connection to be set up, which the owner wants the system to do by itself; that is the next plan. This plan brings everything that concerns the accounts themselves:

- **The server** gets the routes: the list of all accounts; a new **supervisor** account — with a password that is given, which is then the account's own, or without one, in which case a temporary password is made, sent back once and has to be changed at the first sign-in; a new temporary password for someone; an account switched off or on. Supervisors and administrators may use them. Nobody acts on their own account (one cannot lock oneself out), and an administrator's account is acted on by an administrator only. Each action leaves a log line: who, which account, what.
- **The supervisor page** gets the button "新建账号" with its dialog, the actions "重置密码" and "停用" / "启用" in the row of each employee, and a second list with the supervisors' and administrators' accounts. A temporary password is shown once, with a button that copies it, and is gone from the page when the dialog is closed.

### Decisions already made (do not re-open; do not ask)

- Supervisors and administrators manage accounts; an employee has none of it.
- From the page a supervisor's account can be made, not an administrator's (that stays with the command-line tool), and not yet an employee's (next plan).
- A password typed by whoever makes the account is the account's own: the person is not asked to change it. Without one, the temporary password works as it does today.
- Every account of a sub-site can be acted on in that sub-site's row, also one that is switched off and therefore not named in front.
- Deleting or renaming an account is not offered.
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/site-auth.cjs` | `d74d4a4bb6f291bfe0d94944d8e5e4a7144694215283cde54be2e102207e3ba0` | `a4008dba13265d18e9fc11592da7d825b78f9759245dc5eabc97d44be4d31e23` |
| `work/wa-replica/site-api.cjs` | `5db2f70a8bb0e6950639782a344ec74f39747573c3400a22d9649cab6e148f76` | `88cc23ada0f64946249a8263bd9183978dba4db48d74d723a4c685a28e7451a7` |
| `work/wa-replica/site-api.test.cjs` | `45724ea33936af4abe304380a59c3f27a703692601fe58ff00cff6cbe3995dd3` | `8286bfdfcd05498335bd939adfc7c5f4ba8dc4ef1f2b51794e28e0b68839c5fa` |
| `work/wa-replica/fidelity-master.js` | `dbb7b94ca9f72e494b5943e6e4d8481d3206d566cdea555a00c325c3a4ba624b` | `150ed6f270770a77d8a3ebfb92056b47b11b4dea90c82607fc8f8b313f04cbad` |
| `work/wa-replica/fidelity.css` | `7abcca282807d811429ffbdf08cc97189f39697ef7f02ead6c752f21ef2975f4` | `450061d48a214ec56eed935554273ae4e190a98afeb9256c92ca1582acdb6970` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `4a3f9d9a308cf49dda624d85fc562b9bce29ec2dff777bb6321b68717140e4f4` | `9c9e930d118ece530200d19809106692accd899235bc4636fd37cb89fc12c380` |
| `README.md` | `652ad050c57b92fbd55caf169329c2a537307d53e35a53e714d22088100aba5d` | `95273177741eef7859625fa87a942d127792c493fa0043e9c86f1e29ae9f446d` |

- `site-auth.cjs` — the accounts: `createUser({ username, name, role, site, password })` checks the fields, makes a temporary password when none is given and always marks the account "must change the password"; `resetPassword(username)` gives a new temporary password and ends the account's sessions; `setDisabled(username, disabled)` switches an account off (ending its sessions) or on; `listUsers()` gives every account as `{ id, username, name, role, site, mustChangePassword, disabled }`. Its errors carry a `code` (`invalid-username`, `invalid-role`, `site-required`, `invalid-name`, `username-taken`, `invalid-password`, `unknown-user`).
- `site-api.cjs` — the sign-in and data routes. `signedIn(req)` is the signed-in user (it refuses someone who still has a temporary password); a route returns `{ body, headers }`; an error with a `code` that stands in `STATUS` becomes an answer with that status and `{ error: code }`, any other error becomes 500. A request that is not a GET and comes from a page of another site is refused before its route runs.
- `site-api.test.cjs` — the tests of sign-in and data (15). Accounts made by earlier tests, all with the password `PASSWORD`: `gus` (employee of `s1`), `max` (employee of `s2`), `ivo` (supervisor), `joy` (administrator).
- `fidelity-master.js` (shipped as `master.js`) — the supervisor page. `get(path)` asks the server; `render()` draws the page from `state`; a click on an element with `data-master="<name>"` inside the page calls `actions[<name>](data-id)`. The page has no dialog of its own; `index.html` holds a `<dialog id="dialog"><div id="dialog-content"></div></dialog>` and a `<div id="toast">` that only the employees' app used so far, and the base style sheets style them (`.modal-head`, `.modal-body`, `.modal-footer`, `.field`, `#toast.show`).
- `fidelity.css` — styles of the page, built into `app.css`; a size in px becomes a token, so the block that is added uses only sizes that are in use already, in an order that leaves `tokens.css` unchanged.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page; the assertions about what the supervisor page may ask and send are changed, a block is added.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 0e7ab98 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Syntax of the supervisor page | `node -e "new (require('vm').Script)(require('fs').readFileSync('work/wa-replica/fidelity-master.js','utf8'));console.log('SYNTAX_OK')"` | `SYNTAX_OK` |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 14`, `fail 0` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 16`, `fail 0` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (they send a 16 MB file twice; allow a few seconds) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-054/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/site-auth.cjs`, `site-api.cjs`, `site-api.test.cjs` (Step 2)
- `work/wa-replica/fidelity-master.js`, `fidelity.css`, `validate-scrm-lifecycle.cjs` (Step 3)
- `README.md`, `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{master.js,app.css,validation.json}` (every other output file — `app.js`, `boot.js`, `index.html`, `icons.js` and `tokens.css` among them — must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular `serve.cjs`, `site-data.cjs`, `site-admin.cjs`, `openwa-link.cjs`, `ai-relay.cjs`, `fidelity-boot.js`, `fidelity-index.html`, the modules of the app, the other style sheets, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/054-accounts-from-the-supervisor-page` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): manage accounts from the supervisor page`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block whose text has a fence of its own is opened and closed with four backticks; a block ends only at a line that equals its opening run of backticks. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the seven files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-054/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-054 && cat > /tmp/wa-scrm-plan-054/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that accounts are managed from the supervisor page: the server's routes and the page.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the sign-in and data tests pass, with the one for the accounts' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 16 ℹ fail 0 '
has 'the server lists the accounts' "$W/site-api.cjs" "'GET /api/auth/users': req => {"
has 'the server makes a supervisor account' "$W/site-api.cjs" "'POST /api/auth/users': async req => {"
has 'nobody acts on their own account' "$W/site-api.cjs" "if (target.username === actor.username) throw problem('own-account');"
has 'each action leaves a line' "$W/site-api.cjs" 'site account created by='
has 'an account can keep the password it is given' "$W/site-auth.cjs" 'async function createUser({ username, name, role, site = null, password, mustChange = true }) {'
has 'the page offers a new account' "$P/master.js" 'data-master="create"'
has 'the page sends its changes through one helper' "$P/master.js" 'const post = (path, body) => fetch(path, {'
same 'the page changes nothing of a sub-site' "$(grep -cE 'post\(at\(|fetch\(at\(' "$P/master.js")" 0
has 'a closed dialog keeps nothing' "$P/master.js" "\$('#dialog-content').innerHTML = '';"
has 'the styles of the accounts are built' "$P/app.css" '.fid-master-acts {'
same 'master.js is the built copy of the supervisor page' "$(cmp -s "$W/fidelity-master.js" "$P/master.js" && echo SAME)" SAME
has 'the README describes the accounts' "$ROOT/README.md" '点击「新建账号」创建主管账号'
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 主管视图：账号管理'
same 'the rest of the page is unchanged' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE 'master.js$|app.css$|validation.json$')" 0
same 'the server files pass the syntax check' "$(node --check "$W/site-auth.cjs" 2>&1 && node --check "$W/site-api.cjs" 2>&1 && echo SYNTAX_OK)" SYNTAX_OK
same 'the supervisor page passes the syntax check' "$(cd "$ROOT" && node -e "new (require('vm').Script)(require('fs').readFileSync('work/wa-replica/fidelity-master.js','utf8'));console.log('SYNTAX_OK')" 2>&1)" SYNTAX_OK
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-054/smoke.sh && ls -l /tmp/wa-scrm-plan-054/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/site-auth.cjs work/wa-replica/site-api.cjs work/wa-replica/site-api.test.cjs work/wa-replica/fidelity-master.js work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs README.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-054/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the sign-in and data tests pass, with the one for the accounts` (got: ℹ pass 15 ℹ fail 0 ), `the server lists the accounts`, `the server makes a supervisor account`, `nobody acts on their own account`, `each action leaves a line`, `an account can keep the password it is given`, `the page offers a new account`, `the page sends its changes through one helper`, `a closed dialog keeps nothing`, `the styles of the accounts are built`, `the README describes the accounts` and `the build log has the entry` (twelve checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The server: the routes for accounts

#### `site-auth.cjs`

**Edit 2.1** — `work/wa-replica/site-auth.cjs`. Find exactly these lines (they occur once):

```text

  async function createUser({ username, name, role, site = null, password }) {
    const normalised = String(username || '').trim().toLowerCase();
```

Replace them with:

```text

  // mustChange: the account's owner has to set a password of their own at the first sign-in. It is so unless
  // whoever makes the account gives it the password it is to keep.
  async function createUser({ username, name, role, site = null, password, mustChange = true }) {
    const normalised = String(username || '').trim().toLowerCase();
```

**Edit 2.2** — `work/wa-replica/site-auth.cjs`. Find exactly these lines (they occur once):

```text
    if (!validPassword(initial)) throw problem('invalid-password');
    db.prepare('INSERT INTO users (username, name, role, site, password, must_change, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)')
      .run(normalised, String(name).trim(), role, role === 'agent' ? String(site) : null, await hashPassword(initial), iso());
    return { user: publicUser(byName(normalised)), password: initial };
```

Replace them with:

```text
    if (!validPassword(initial)) throw problem('invalid-password');
    db.prepare('INSERT INTO users (username, name, role, site, password, must_change, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(normalised, String(name).trim(), role, role === 'agent' ? String(site) : null, await hashPassword(initial), mustChange ? 1 : 0, iso());
    return { user: publicUser(byName(normalised)), password: initial };
```

#### `site-api.cjs`

**Edit 2.3** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
//   GET  /api/auth/sites     the sub-sites and their employees, for supervisors and administrators
//   GET  /api/data           the sub-site's data document; ?fields=a,b gives only these top-level fields
```

Replace them with:

```text
//   GET  /api/auth/sites     the sub-sites and their employees, for supervisors and administrators
//   GET  /api/auth/users     every account, for supervisors and administrators
//   POST /api/auth/users     { username, name, role: 'supervisor', password? } → a new supervisor's account
//   POST /api/auth/users/reset | disable | enable   { username }: a new temporary password; the account off, on
//   GET  /api/data           the sub-site's data document; ?fields=a,b gives only these top-level fields
```

**Edit 2.4** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
// each of their reads leaves a log line that says who read which sub-site and which fields.
// A log line carries the action, the user name and the outcome; never a password, a token or data.
```

Replace them with:

```text
// each of their reads leaves a log line that says who read which sub-site and which fields.
// Supervisors and administrators manage the accounts: never their own, and an administrator's only as an
// administrator. Each of these actions leaves a log line with who did it and to which account.
// A log line carries the action, the user name and the outcome; never a password, a token or data.
```

**Edit 2.5** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
const FIELD = /^[A-Za-z][A-Za-z0-9]{0,39}$/;
const STATUS = {
```

Replace them with:

```text
const FIELD = /^[A-Za-z][A-Za-z0-9]{0,39}$/;
const NAME_MAX = 60;
const STATUS = {
```

**Edit 2.6** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
  'password-change-required': 403, 'forbidden': 403, 'read-only': 403, 'version-conflict': 409, 'too-long': 413, 'too-many-attempts': 429,
};
```

Replace them with:

```text
  'password-change-required': 403, 'forbidden': 403, 'read-only': 403, 'version-conflict': 409, 'too-long': 413, 'too-many-attempts': 429,
  'invalid-username': 400, 'invalid-name': 400, 'invalid-role': 400, 'own-account': 400, 'unknown-user': 404, 'username-taken': 409,
};
```

**Edit 2.7** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text

  const routes = {
```

Replace them with:

```text

  // Who manages accounts: a supervisor or an administrator.
  function manager(req) {
    const user = signedIn(req);
    if (user.role === 'agent') throw problem('forbidden');
    return user;
  }
  // The account a manager acts on: another one than their own, and an administrator's only for an administrator.
  function managed(actor, username) {
    const target = auth.listUsers().find(user => user.username === String(username || '').trim().toLowerCase());
    if (!target) throw problem('unknown-user');
    if (target.username === actor.username) throw problem('own-account');
    if (target.role === 'admin' && actor.role !== 'admin') throw problem('forbidden');
    return target;
  }
  const brief = user => ({ username: user.username, name: user.name, role: user.role });

  const routes = {
```

**Edit 2.8** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
    },
    'GET /api/data': req => {
```

Replace them with:

```text
    },
    // Accounts, managed from the supervisor page.
    'GET /api/auth/users': req => {
      manager(req);
      return { body: { users: auth.listUsers().map(({ username, name, role, site, mustChangePassword, disabled }) => ({ username, name, role, site, mustChangePassword, disabled })) } };
    },
    'POST /api/auth/users': async req => {
      const actor = manager(req), body = await readJson(req);
      if (typeof body.username !== 'string' || typeof body.name !== 'string') throw problem('invalid-request');
      if (body.role !== 'supervisor') throw problem('invalid-role');
      if (body.name.trim().length > NAME_MAX) throw problem('invalid-name');
      if (body.password !== undefined && typeof body.password !== 'string') throw problem('invalid-password');
      // A password that is given is the account's own. Without one a temporary password is made, which its
      // owner has to change at the first sign-in; it goes back in this answer and is kept nowhere.
      const given = Boolean(body.password);
      const { user, password } = await auth.createUser({ username: body.username, name: body.name, role: body.role, password: given ? body.password : undefined, mustChange: !given });
      console.log(`site account created by=${actor.username} user=${user.username} role=${user.role}`);
      return { body: { user: brief(user), ...(given ? {} : { password }) } };
    },
    'POST /api/auth/users/reset': async req => {
      const actor = manager(req), target = managed(actor, (await readJson(req)).username);
      const { password } = await auth.resetPassword(target.username);
      console.log(`site account reset by=${actor.username} user=${target.username}`);
      return { body: { user: brief(target), password } };
    },
    'POST /api/auth/users/disable': async req => {
      const actor = manager(req), target = managed(actor, (await readJson(req)).username);
      auth.setDisabled(target.username, true);
      console.log(`site account disabled by=${actor.username} user=${target.username}`);
      return { body: { ok: true } };
    },
    'POST /api/auth/users/enable': async req => {
      const actor = manager(req), target = managed(actor, (await readJson(req)).username);
      auth.setDisabled(target.username, false);
      console.log(`site account enabled by=${actor.username} user=${target.username}`);
      return { body: { ok: true } };
    },
    'GET /api/data': req => {
```

#### `site-api.test.cjs`

**Edit 2.9** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text

test('the log names users and outcomes, never a password, a token or data', () => {
```

Replace them with:

```text

test('accounts from the supervisor page: the list; a new supervisor with a temporary or a given password; a new temporary password; an account off and on — for supervisors and administrators, never their own account, an administrator\'s only as an administrator, each action in the log', async () => {
  const signIn = async username => cookieOf(await call('/api/auth/login', { method: 'POST', body: { username, password: PASSWORD } }));
  const [gus, ivo, joy] = [await signIn('gus'), await signIn('ivo'), await signIn('joy')];
  const send = (pathname, cookie, body) => call(pathname, { method: 'POST', cookie, body });
  const count = async () => (await call('/api/auth/users', { cookie: ivo })).json.users.length;
  // the list: every account with its role, its sub-site and its state — and nothing of a password
  const list = await call('/api/auth/users', { cookie: ivo });
  assert.equal(list.status, 200);
  assert.deepEqual(list.json.users.find(user => user.username === 'gus'), { username: 'gus', name: 'gus name', role: 'agent', site: 's1', mustChangePassword: false, disabled: false });
  assert.deepEqual(list.json.users.find(user => user.username === 'joy'), { username: 'joy', name: 'joy name', role: 'admin', site: null, mustChangePassword: false, disabled: false });
  assert(!list.raw.includes('scrypt') && !/"(password|id|token)[a-z_]*":/i.test(list.raw), 'no password, no hash, no number of a row');
  assert.deepEqual((await call('/api/auth/users', { cookie: joy })).json, list.json, 'an administrator gets the same');
  assert.deepEqual([(await call('/api/auth/users', { cookie: gus })).json, (await call('/api/auth/users')).status], [{ error: 'forbidden' }, 401]);
  // a new supervisor without a password: a temporary one comes back, once, and has to be changed
  const made = await send('/api/auth/users', ivo, { username: ' Pia ', name: ' Pia P ', role: 'supervisor' });
  assert.deepEqual([made.status, made.json.user, made.json.password.length], [200, { username: 'pia', name: 'Pia P', role: 'supervisor' }, 16]);
  const first = await call('/api/auth/login', { method: 'POST', body: { username: 'pia', password: made.json.password } });
  assert.deepEqual([first.status, first.json.user.mustChangePassword, first.json.user.site, first.json.user.role], [200, true, null, 'supervisor']);
  assert.equal((await call('/api/auth/users', { cookie: cookieOf(first) })).status, 403, 'not before the temporary password is changed');
  // with a password: it is the account's own, it does not come back, and the supervisor is one at once
  const own = await send('/api/auth/users', joy, { username: 'quin', name: 'Quin', role: 'supervisor', password: 'quin-own-password' });
  assert.deepEqual([own.status, own.json], [200, { user: { username: 'quin', name: 'Quin', role: 'supervisor' } }]);
  const quin = await call('/api/auth/login', { method: 'POST', body: { username: 'quin', password: 'quin-own-password' } });
  assert.deepEqual([quin.status, quin.json.user.mustChangePassword, (await call('/api/auth/sites', { cookie: cookieOf(quin) })).status], [200, false, 200]);
  // what is refused makes nothing
  const before = await count();
  for (const [body, error, status] of [
    [{ username: 'ab', name: 'Short', role: 'supervisor' }, 'invalid-username', 400],
    [{ username: 'pia', name: 'Again', role: 'supervisor' }, 'username-taken', 409],
    [{ username: 'rita', name: '  ', role: 'supervisor' }, 'invalid-name', 400],
    [{ username: 'rita', name: 'x'.repeat(61), role: 'supervisor' }, 'invalid-name', 400],
    [{ username: 'rita', name: 'Rita', role: 'supervisor', password: 'short' }, 'invalid-password', 400],
    [{ username: 'rita', name: 'Rita', role: 'supervisor', password: 12345678 }, 'invalid-password', 400],
    [{ username: 'rita', name: 'Rita', role: 'admin' }, 'invalid-role', 400],
    [{ username: 'rita', name: 'Rita', role: 'agent' }, 'invalid-role', 400],
    [{ username: 'rita', name: 'Rita' }, 'invalid-role', 400],
    [{ username: ['rita'], name: 'Rita', role: 'supervisor' }, 'invalid-request', 400],
    [{ username: 'rita', name: { a: 1 }, role: 'supervisor' }, 'invalid-request', 400],
  ]) {
    const answer = await send('/api/auth/users', ivo, body);
    assert.deepEqual([answer.status, answer.json], [status, { error }], JSON.stringify(body));
  }
  assert.deepEqual([(await send('/api/auth/users', gus, { username: 'rita', name: 'Rita', role: 'supervisor' })).json, (await call('/api/auth/users', { method: 'POST', body: { username: 'rita', name: 'Rita', role: 'supervisor' } })).status], [{ error: 'forbidden' }, 401]);
  const crossSite = await call('/api/auth/users', { method: 'POST', cookie: ivo, body: { username: 'rita', name: 'Rita', role: 'supervisor' }, headers: { 'Sec-Fetch-Site': 'cross-site' } });
  assert.deepEqual([crossSite.status, await count()], [403, before], 'a page of another site makes no account with a supervisor\'s cookie');
  // a new temporary password: the old password and the sessions end
  const reset = await send('/api/auth/users/reset', ivo, { username: ' GUS ' });
  assert.deepEqual([reset.status, reset.json.user, reset.json.password.length], [200, { username: 'gus', name: 'gus name', role: 'agent' }, 16]);
  assert.deepEqual([(await call('/api/auth/me', { cookie: gus })).status, (await call('/api/auth/login', { method: 'POST', body: { username: 'gus', password: PASSWORD } })).status], [401, 401]);
  const again = await call('/api/auth/login', { method: 'POST', body: { username: 'gus', password: reset.json.password } });
  assert.equal(again.json.user.mustChangePassword, true);
  assert.equal((await call('/api/auth/password', { method: 'POST', cookie: cookieOf(again), body: { current: reset.json.password, next: PASSWORD } })).status, 200);
  // off: the session ends and nobody signs in; on again
  const max = await signIn('max');
  assert.deepEqual((await send('/api/auth/users/disable', ivo, { username: 'max' })).json, { ok: true });
  assert.deepEqual([(await call('/api/auth/me', { cookie: max })).status, (await call('/api/auth/login', { method: 'POST', body: { username: 'max', password: PASSWORD } })).status, (await call('/api/auth/users', { cookie: ivo })).json.users.find(user => user.username === 'max').disabled], [401, 401, true]);
  assert.deepEqual((await send('/api/auth/users/enable', ivo, { username: 'max' })).json, { ok: true });
  assert.equal((await call('/api/auth/login', { method: 'POST', body: { username: 'max', password: PASSWORD } })).status, 200);
  // never one's own account; an administrator's only as an administrator; an account that is not there; not for an employee
  const employee = await signIn('gus');
  for (const pathname of ['/api/auth/users/reset', '/api/auth/users/disable', '/api/auth/users/enable']) {
    assert.deepEqual([(await send(pathname, ivo, { username: 'ivo' })).json, (await send(pathname, ivo, { username: 'joy' })).json, (await send(pathname, ivo, { username: 'nobody' })).json, (await send(pathname, ivo, {})).json, (await send(pathname, employee, { username: 'max' })).json, (await call(pathname, { method: 'POST', body: { username: 'max' } })).status],
      [{ error: 'own-account' }, { error: 'forbidden' }, { error: 'unknown-user' }, { error: 'unknown-user' }, { error: 'forbidden' }, 401], pathname);
  }
  assert.deepEqual([(await call('/api/auth/me', { cookie: ivo })).status, (await call('/api/auth/me', { cookie: joy })).status, (await call('/api/auth/login', { method: 'POST', body: { username: 'max', password: PASSWORD } })).status], [200, 200, 200], 'none of the refused did anything');
  // a supervisor acts on another supervisor, an administrator on a supervisor
  assert.deepEqual([(await send('/api/auth/users/disable', ivo, { username: 'quin' })).status, (await call('/api/auth/me', { cookie: cookieOf(quin) })).status, (await send('/api/auth/users/enable', joy, { username: 'quin' })).status], [200, 401, 200]);
  // every action is in the log with who did it; no password is
  const lines = logged.filter(line => line.startsWith('site account '));
  for (const line of ['site account created by=ivo user=pia role=supervisor', 'site account created by=joy user=quin role=supervisor', 'site account reset by=ivo user=gus', 'site account disabled by=ivo user=max', 'site account enabled by=ivo user=max', 'site account disabled by=ivo user=quin', 'site account enabled by=joy user=quin']) assert(lines.includes(line), line + '\n' + lines.join('\n'));
  for (const secret of [made.json.password, reset.json.password, 'quin-own-password']) assert(!logged.join('\n').includes(secret), 'a password in the log');
});

test('the log names users and outcomes, never a password, a token or data', () => {
```

**Verify**: `sha256sum work/wa-replica/site-auth.cjs work/wa-replica/site-api.cjs work/wa-replica/site-api.test.cjs` → `a4008dba13265d18e9fc11592da7d825b78f9759245dc5eabc97d44be4d31e23`, `88cc23ada0f64946249a8263bd9183978dba4db48d74d723a4c685a28e7451a7`, `8286bfdfcd05498335bd939adfc7c5f4ba8dc4ef1f2b51794e28e0b68839c5fa`; `node --check` on `work/wa-replica/site-auth.cjs` and `site-api.cjs` exits 0; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 16`, `fail 0`. If a checksum does not match, restore the file with `git checkout 0e7ab98 -- <file>` and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 3: The supervisor page: the accounts

#### `fidelity-master.js`

**Edit 3.1** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
// one's sub-site and shows, read-only, the customers and conversations of one of them.
// It only reads: every request is a GET, except the one that signs out. A sub-site is asked under its own name,
// /site/<id>/api/…, so that several sub-sites can be read side by side; the server of a sub-site leaves a log
// line for every read of its data by someone who is not its own employee.
(() => {
```

Replace them with:

```text
// one's sub-site and shows, read-only, the customers and conversations of one of them.
// Of a sub-site it only reads: a sub-site is asked under its own name, /site/<id>/api/…, with GET and nothing
// else, so that several can be read side by side, and the server of a sub-site leaves a log line for every read
// of its data by someone who is not its own employee. What the page changes are accounts and nothing else: a new
// supervisor, a new temporary password for someone, an account switched off or on — and it signs out.
(() => {
```

**Edit 3.2** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
  const get = path => fetch(path).then(async response => ({ status: response.status, body: await response.json().catch(() => ({})) }), () => ({ status: 0, body: {} }));
  // The address of a sub-site's own server for a path of its API.
```

Replace them with:

```text
  const get = path => fetch(path).then(async response => ({ status: response.status, body: await response.json().catch(() => ({})) }), () => ({ status: 0, body: {} }));
  // The requests that change something: about accounts, and signing out. Never to a sub-site.
  const post = (path, body) => fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async response => ({ status: response.status, body: await response.json().catch(() => ({})) }), () => ({ status: 0, body: {} }));
  // The address of a sub-site's own server for a path of its API.
```

**Edit 3.3** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text

  // user: who is signed in. sites: the list, each { site, employees, reached, data, link }.
  // open: the sub-site that is being looked at, { site, name, data, customer, query, chat } — or null for the list.
  // atEnd, endTop: whether the conversation shows its latest message, and where the page last put it there.
  const state = { user: null, sites: [], loading: true, failed: false, open: null, atEnd: true, endTop: -1 };

```

Replace them with:

```text

  // user: who is signed in. sites: the list, each { site, employees, reached, data, link }. users: every account.
  // open: the sub-site that is being looked at, { site, name, data, customer, query, chat } — or null for the list.
  // atEnd, endTop: whether the conversation shows its latest message, and where the page last put it there.
  const state = { user: null, sites: [], users: [], loading: true, failed: false, open: null, atEnd: true, endTop: -1 };

```

**Edit 3.4** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
  const SAVED = { online: '已连接', reconnect: '已掉线', pending: '待绑定' };
  const names = entry => {
    const active = entry.employees.filter(employee => !employee.disabled);
    return (active.length ? active : entry.employees).map(employee => employee.name + (employee.disabled ? '（已停用）' : '')).join('、');
  };
  // The state of each of a sub-site's numbers: what its WhatsApp link says now, or — when the link cannot be
```

Replace them with:

```text
  const SAVED = { online: '已连接', reconnect: '已掉线', pending: '待绑定' };
  // The accounts a row of the list stands for: the employees that are not switched off, or all when none is on.
  const shown = entry => {
    const active = entry.employees.filter(employee => !employee.disabled);
    return active.length ? active : entry.employees;
  };
  const names = entry => shown(entry).map(employee => employee.name + (employee.disabled ? '（已停用）' : '')).join('、');
  // The state of each of a sub-site's numbers: what its WhatsApp link says now, or — when the link cannot be
```

**Edit 3.5** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    render();
    const list = await get('/api/auth/sites');
    state.failed = list.status !== 200;
    state.sites = state.failed ? [] : await Promise.all(list.body.sites.map(async entry => {
```

Replace them with:

```text
    render();
    const [list, accounts] = await Promise.all([get('/api/auth/sites'), get('/api/auth/users')]);
    state.failed = list.status !== 200;
    state.users = accounts.status === 200 ? rows(accounts.body.users) : [];
    state.sites = state.failed ? [] : await Promise.all(list.body.sites.map(async entry => {
```

**Edit 3.6** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
      const drawn = entry.reached ? guarded(() => ({ f: figures(entry), list: numbers(entry) }), null) : null;
      if (!drawn) return `<tr><td class="fid-master-who">${who}</td><td colspan="5" class="fid-master-quiet">暂时无法读取这位员工的工作区</td><td></td></tr>`;
      const { f, list } = drawn;
```

Replace them with:

```text
      const drawn = entry.reached ? guarded(() => ({ f: figures(entry), list: numbers(entry) }), null) : null;
      // Every account of the sub-site can be acted on — also one that is switched off and so not named in front.
      const acts = `<div class="fid-master-acts">${entry.employees.map(employee => `<span>${entry.employees.length > 1 ? esc(employee.username) + (employee.disabled ? '（已停用）' : '') + '：' : ''}${accountActs(employee)}</span>`).join('')}</div>`;
      if (!drawn) return `<tr><td class="fid-master-who">${who}</td><td colspan="5" class="fid-master-quiet">暂时无法读取这位员工的工作区</td><td>${acts}</td></tr>`;
      const { f, list } = drawn;
```

**Edit 3.7** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
        <td>${f.last ? esc(dayWord(f.last) + ' ' + clock(f.last)) : '—'}</td>
        <td><button type="button" class="fid-btn tint" data-master="open" data-id="${esc(entry.site)}">${icon('MessagesSquare')}查看</button></td>
      </tr>`;
```

Replace them with:

```text
        <td>${f.last ? esc(dayWord(f.last) + ' ' + clock(f.last)) : '—'}</td>
        <td><button type="button" class="fid-btn tint" data-master="open" data-id="${esc(entry.site)}">${icon('MessagesSquare')}查看</button>${acts}</td>
      </tr>`;
```

**Edit 3.8** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text

  // ---- one employee's customers and conversations ----
```

Replace them with:

```text

  // ---- accounts: a new supervisor, a new temporary password, an account off or on ----
  const ROLE = { agent: '员工', supervisor: '主管', admin: '管理员' };
  const PROBLEM = {
    'invalid-username': '登录名需为 3–32 位：小写字母、数字、点、下划线或连字符，并以字母或数字开头。', 'username-taken': '这个登录名已经有人使用。', 'invalid-name': '请填写显示名称（最多 60 个字）。',
    'invalid-password': '密码至少 8 位；留空则生成临时密码。', 'own-account': '不能在这里操作自己的账号。', forbidden: '当前账号不能执行这个操作。', 'unknown-user': '这个账号已不存在，请刷新后再试。',
  };
  const problemText = answer => PROBLEM[answer.body.error] || (answer.status === 401 ? '登录已失效，请刷新页面后重新登录。' : '暂时无法完成，请稍后再试。');
  const label = username => {
    const user = state.users.find(candidate => candidate.username === username);
    return user ? `${user.name}（${user.username}）` : username;
  };
  // What can be done with someone else's account. One's own has none, and an administrator's only an administrator.
  function accountActs(account) {
    if (account.username === state.user.username) return '<span class="fid-master-quiet">当前账号</span>';
    if (account.role === 'admin' && state.user.role !== 'admin') return '<span class="fid-master-quiet">由管理员管理</span>';
    const id = esc(account.username);
    return `<button type="button" class="link" data-master="reset" data-id="${id}">重置密码</button>` + (account.disabled ? `<button type="button" class="link" data-master="enable" data-id="${id}">启用</button>` : `<button type="button" class="link" data-master="disable" data-id="${id}">停用</button>`);
  }
  function managersHTML() {
    const list = state.users.filter(user => user.role !== 'agent');
    if (state.loading || state.failed || !list.length) return '';
    const body = list.map(user => `<tr><td class="fid-master-who"><strong>${esc(user.name)}</strong><small>${esc(user.username)}</small></td><td>${ROLE[user.role] || ''}</td><td>${user.disabled ? '<span class="fid-master-warn">已停用</span>' : user.mustChangePassword ? '使用临时密码' : '正常'}</td><td><div class="fid-master-acts">${accountActs(user)}</div></td></tr>`).join('');
    return `<h2 class="fid-master-sub">主管与管理员账号</h2><div class="fid-table-scroll" tabindex="0" aria-label="主管与管理员账号表格"><table class="fid-table fid-master-table fid-master-accounts"><thead><tr>${['账号', '类型', '状态', '操作'].map(title => `<th scope="col">${title}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
  }
  function showDialog(title, body, footer) {
    const box = $('#dialog');
    $('#dialog-content').innerHTML = `<div class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-button" data-master="close" aria-label="关闭弹窗">${icon('X')}</button></div><div class="modal-body fid-master-dialog">${body}</div><div class="modal-footer">${footer}</div>`;
    paintIcons(box);
    if (!box.open) box.showModal();
  }
  // A dialog that is closed keeps nothing: a temporary password that was shown in it is gone from the page.
  function closeDialog() {
    if ($('#dialog').open) $('#dialog').close();
    $('#dialog-content').innerHTML = '';
  }
  function say(text) {
    const toast = $('#toast');
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(say.timer);
    say.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  const askFirst = (title, text, word, action, username) => showDialog(title, `<p>${esc(text)}</p>`, `<button type="button" class="fid-btn" data-master="close">取消</button><button type="button" class="fid-btn blue" data-master="${action}" data-id="${esc(username)}">${word}</button>`);
  // The one time a temporary password is shown.
  const secretHTML = password => `<div class="fid-master-secret"><span>临时密码</span><input id="master-secret" readonly value="${esc(password)}" aria-label="临时密码"><button type="button" class="fid-btn" data-master="copy">复制</button></div><p class="fid-master-quiet">临时密码只显示这一次。对方首次登录时需要设置自己的密码。</p>`;
  const DONE = '<button type="button" class="fid-btn blue" data-master="close">完成</button>';
  function createForm(problem = '', values = {}) {
    showDialog('新建账号', `<form id="master-create" class="fid-master-form" novalidate>
        <p class="fid-master-kind">类型：主管（只读查看全部员工，并可管理账号）</p>
        <label class="field">登录名<input name="username" autocomplete="off" autocapitalize="none" spellcheck="false" value="${esc(values.username)}"></label>
        <label class="field">显示名称<input name="name" autocomplete="off" value="${esc(values.name)}"></label>
        <label class="field">密码<input name="password" type="password" autocomplete="new-password" placeholder="留空则生成临时密码"></label>
        <p class="fid-master-problem" role="alert" ${problem ? '' : 'hidden'}>${esc(problem)}</p>
      </form>`, '<button type="button" class="fid-btn" data-master="close">取消</button><button type="submit" form="master-create" class="fid-btn blue">创建</button>');
    $('#master-create [name="username"]').focus();
  }
  async function createAccount(form) {
    const values = { username: form.elements.username.value.trim().toLowerCase(), name: form.elements.name.value.trim(), password: form.elements.password.value };
    for (const button of $('#dialog').querySelectorAll('button')) button.disabled = true;
    const answer = await post('/api/auth/users', { ...values, role: 'supervisor' });
    if (answer.status !== 200) return createForm(problemText(answer), values);
    showDialog('账号已创建', `<p>登录名：<strong>${esc(answer.body.user.username)}</strong>（${esc(answer.body.user.name)}，${ROLE[answer.body.user.role] || ''}）</p>${answer.body.password ? secretHTML(answer.body.password) : '<p class="fid-master-quiet">请使用刚才填写的密码登录。</p>'}`, DONE);
    load();
  }
  async function resetAccount(username) {
    const answer = await post('/api/auth/users/reset', { username });
    if (answer.status !== 200) return showDialog('重置密码', `<p>${esc(problemText(answer))}</p>`, DONE);
    showDialog('密码已重置', `<p>登录名：<strong>${esc(username)}</strong></p>${secretHTML(answer.body.password)}`, DONE);
    load();
  }
  async function switchAccount(username, on) {
    const answer = await post(on ? '/api/auth/users/enable' : '/api/auth/users/disable', { username });
    closeDialog();
    say(answer.status === 200 ? (on ? '账号已启用' : '账号已停用') : problemText(answer));
    load();
  }

  // ---- one employee's customers and conversations ----
```

**Edit 3.9** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    root.innerHTML = `<header class="fid-master-top"><div class="fid-sign-in-brand" translate="no"><span class="brand-symbol" data-icon="MessagesSquare"></span><strong>WA Desk SCRM</strong></div><span class="fid-master-title">主管视图</span><span class="fid-master-user">已登录：${esc(state.user.name)}（${esc(state.user.username)}）</span><button type="button" class="fid-btn" data-master="leave">${icon('LogOut')}退出登录</button></header>
      <div class="fid-master-body">${state.open ? siteHTML() : `<div class="fid-master-bar"><h1>员工总览</h1><button type="button" class="fid-btn" data-master="reload">${icon('RefreshCw')}刷新</button><p>每位员工的号码、客户与待办概况。点击「查看」可以只读方式查看该员工的客户与会话。</p></div>${listHTML()}`}</div>`;
    paintIcons(root);
```

Replace them with:

```text
    root.innerHTML = `<header class="fid-master-top"><div class="fid-sign-in-brand" translate="no"><span class="brand-symbol" data-icon="MessagesSquare"></span><strong>WA Desk SCRM</strong></div><span class="fid-master-title">主管视图</span><span class="fid-master-user">已登录：${esc(state.user.name)}（${esc(state.user.username)}）</span><button type="button" class="fid-btn" data-master="leave">${icon('LogOut')}退出登录</button></header>
      <div class="fid-master-body">${state.open ? siteHTML() : `<div class="fid-master-bar"><h1>员工总览</h1><button type="button" class="fid-btn" data-master="create">${icon('UserRoundPlus')}新建账号</button><button type="button" class="fid-btn" data-master="reload">${icon('RefreshCw')}刷新</button><p>每位员工的号码、客户与待办概况。点击「查看」可以只读方式查看该员工的客户与会话。</p></div>${listHTML()}${managersHTML()}`}</div>`;
    paintIcons(root);
```

**Edit 3.10** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    leave: async () => {
      await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
      location.reload();
    },
  };
```

Replace them with:

```text
    leave: async () => {
      await post('/api/auth/logout', {});
      location.reload();
    },
    create: () => createForm(),
    close: closeDialog,
    copy: () => {
      $('#master-secret').select();
      $('[data-master="copy"]').textContent = document.execCommand('copy') ? '已复制' : '请手动复制';
    },
    reset: username => askFirst('重置密码', `重置「${label(username)}」的密码？对方会被退出登录，需要用新的临时密码重新登录。`, '重置', 'resetDo', username),
    resetDo: resetAccount,
    disable: username => askFirst('停用账号', `停用「${label(username)}」的账号？对方将无法登录，已经登录的页面也会失效。`, '停用', 'disableDo', username),
    disableDo: username => switchAccount(username, false),
    enable: username => switchAccount(username, true),
  };
```

**Edit 3.11** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    root.hidden = false;
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-master]');
      if (button) actions[button.dataset.master](button.dataset.id);
    });
    root.addEventListener('input', event => {
```

Replace them with:

```text
    root.hidden = false;
    // The dialogs for accounts stand outside the page's own element; their buttons are the page's all the same.
    for (const place of [root, $('#dialog')]) {
      place.addEventListener('click', event => {
        const button = event.target.closest('[data-master]');
        if (button) actions[button.dataset.master](button.dataset.id);
      });
    }
    $('#dialog').addEventListener('submit', event => {
      event.preventDefault();
      if (event.target.id === 'master-create') createAccount(event.target);
    });
    // The Escape key closes a dialog as its buttons do.
    $('#dialog').addEventListener('close', closeDialog);
    root.addEventListener('input', event => {
```

#### `fidelity.css`

**Append 3.12** — `work/wa-replica/fidelity.css`. Add at the end of the file, after one empty line:

```text
/* The supervisor page: accounts — what can be done with one, the second list, and the dialogs. */
.fid-master-sub { margin:8px 0 0; font-size:15px; font-weight:650; line-height:22px; }
.fid-master-acts { display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:2px 10px; font-size:13px; }
.fid-master-acts > span { display:inline-flex; flex-wrap:wrap; align-items:center; gap:2px 10px; }
.fid-master-table .fid-btn + .fid-master-acts { margin-top:6px; }
.fid-master-acts .link { padding:0; border:0; background:none; color:var(--color-accent); font:inherit; cursor:pointer; }
.fid-master-acts .link:hover { text-decoration:underline; }
.fid-master-dialog p { margin:0 0 8px; font-size:14px; line-height:22px; }
.fid-master-form { display:grid; gap:14px; }
.fid-master-form p { margin:0; }
.fid-master-kind { color:var(--fid-ink); font-size:13px; }
.fid-master-problem { color:var(--color-danger); font-size:13px; }
.fid-master-secret { display:flex; align-items:center; gap:8px; margin:12px 0 8px; font-size:13px; }
.fid-master-secret input { flex:1; min-width:0; height:36px; padding:0 12px; border:1px solid var(--color-border); border-radius:8px; background:var(--color-surface-alt); color:var(--color-text); font:inherit; letter-spacing:1px; }
/* On a narrow screen the two lists keep a width that can be read and are moved sideways inside their frame. */
.fid-master-table { min-width:820px; }
.fid-master-table.fid-master-accounts { min-width:640px; }
```

#### `validate-scrm-lifecycle.cjs`

**Edit 3.13** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(bootSource.includes("if (user.role !== 'agent') {") && bootSource.includes('return window.WA_MASTER(user);') && !bootSource.includes('主管与管理员入口尚未开放'), 'fidelity-boot.js must hand a supervisor over to the supervisor page');
assert.deepEqual([...new Set(masterSource.match(/'\/api\/[^']*'/g))].sort(), ["'/api/auth/logout'", "'/api/auth/sites'", "'/api/data'", "'/api/data?fields=accounts,customers,tasks'", "'/api/wa/media?account='", "'/api/wa/status'"], 'the supervisor page asks an unexpected address');
assert.deepEqual(masterSource.match(/method: '[A-Z]+'/g), ["method: 'POST'"], 'the supervisor page must send nothing but its sign-out');
assert(masterSource.includes("await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});") && masterSource.includes("const at = (site, path) => '/site/' + encodeURIComponent(site) + path;"), 'the supervisor page must ask each sub-site under its own name');
assert(!/演示|原型|评审|本机|示例|体验/.test(masterSource) && !/WA_SITE|localStorage|sessionStorage/.test(masterSource), 'the supervisor page must not speak of a demonstration, nor touch the app or the browser\'s storage');
```

Replace them with:

```text
assert(bootSource.includes("if (user.role !== 'agent') {") && bootSource.includes('return window.WA_MASTER(user);') && !bootSource.includes('主管与管理员入口尚未开放'), 'fidelity-boot.js must hand a supervisor over to the supervisor page');
assert.deepEqual([...new Set(masterSource.match(/'\/api\/[^']*'/g))].sort(), ["'/api/auth/logout'", "'/api/auth/sites'", "'/api/auth/users'", "'/api/auth/users/disable'", "'/api/auth/users/enable'", "'/api/auth/users/reset'", "'/api/data'", "'/api/data?fields=accounts,customers,tasks'", "'/api/wa/media?account='", "'/api/wa/status'"], 'the supervisor page asks an unexpected address');
// What the page changes goes through one helper, and only to the addresses of accounts and of signing out —
// never to a sub-site, which it only reads.
assert.deepEqual(masterSource.match(/method: '[A-Z]+'/g), ["method: 'POST'"], 'the supervisor page must send its changes through one helper');
assert.deepEqual([...new Set(masterSource.match(/\bpost\([^,]+,/g))].sort(), ["post('/api/auth/logout',", "post('/api/auth/users',", "post('/api/auth/users/reset',", "post(on ? '/api/auth/users/enable' : '/api/auth/users/disable',"], 'the supervisor page must change accounts only, and sign out');
assert(masterSource.includes("const at = (site, path) => '/site/' + encodeURIComponent(site) + path;") && !/fetch\(at\(/.test(masterSource), 'the supervisor page must ask each sub-site under its own name, and only ask');
for (const required of ["'GET /api/auth/users': req => {", "'POST /api/auth/users': async req => {", "if (body.role !== 'supervisor') throw problem('invalid-role');", "if (target.username === actor.username) throw problem('own-account');", "if (target.role === 'admin' && actor.role !== 'admin') throw problem('forbidden');", 'console.log(`site account created by=${actor.username} user=${user.username} role=${user.role}`);']) {
  assert(siteSources['site-api.cjs'].includes(required), `site-api.cjs is missing ${required}`);
}
assert(siteSources['site-auth.cjs'].includes('async function createUser({ username, name, role, site = null, password, mustChange = true }) {'), 'an account made with a given password must be able to keep it');
assert(!/演示|原型|评审|本机|示例|体验/.test(masterSource) && !/WA_SITE|localStorage|sessionStorage/.test(masterSource), 'the supervisor page must not speak of a demonstration, nor touch the app or the browser\'s storage');
```

**Verify**: `sha256sum work/wa-replica/fidelity-master.js work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs` → `150ed6f270770a77d8a3ebfb92056b47b11b4dea90c82607fc8f8b313f04cbad`, `450061d48a214ec56eed935554273ae4e190a98afeb9256c92ca1582acdb6970`, `9c9e930d118ece530200d19809106692accd899235bc4636fd37cb89fc12c380`; the syntax command → `SYNTAX_OK`; `git checkout 0e7ab98 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `sha256sum outputs/wa-replica-prototype/master.js outputs/wa-replica-prototype/app.css` → `150ed6f270770a77d8a3ebfb92056b47b11b4dea90c82607fc8f8b313f04cbad`, `91eb773f9c43d76e2d5306a3a3fff30a651cded48944c3627f02220b09c93814`; `git status --porcelain -- outputs` lists `master.js`, `app.css` and `validation.json` and nothing else (if `icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). If a checksum does not match, restore the file with `git checkout 0e7ab98 -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 4: README, build log, final verification

#### `README.md`

**Edit 4.1** — `README.md`. Find exactly these lines (they occur once):

````text
```
工具只显示一次临时密码，持有人首次登录后必须修改；自己设置的密码至少 8 位。员工登录后进入自己的子站，新子站从空白开始。主管与管理员登录后进入「主管视图」：员工总览列出每位员工的 WhatsApp 号码及连接状态、客户数、未读会话数、待跟进数和最近消息时间；点击「查看」可以只读方式查看该员工的客户与会话（含图片、语音、文件和已有译文）。主管视图不能发送消息，也不能修改任何数据；主管或管理员每读取一次子站数据，该子站的服务器都会记录一行日志（谁、哪个子站、读取了哪些内容）。未设置 `WA_SCRM_DATA_DIR` 时页面只显示「服务器尚未启用账号」。

````

Replace them with:

````text
```
工具只显示一次临时密码，持有人首次登录后必须修改；自己设置的密码至少 8 位。员工登录后进入自己的子站，新子站从空白开始。主管与管理员登录后进入「主管视图」：员工总览列出每位员工的 WhatsApp 号码及连接状态、客户数、未读会话数、待跟进数和最近消息时间；点击「查看」可以只读方式查看该员工的客户与会话（含图片、语音、文件和已有译文）。主管视图不能发送消息，也不能修改任何员工工作区的数据；主管或管理员每读取一次子站数据，该子站的服务器都会记录一行日志（谁、哪个子站、读取了哪些内容）。主管与管理员还可以在主管视图里管理账号：查看全部账号，点击「新建账号」创建主管账号（填写密码则直接使用该密码，留空则生成只显示一次的临时密码，对方首次登录时必须修改），为他人「重置密码」，「停用」或「启用」账号。不能操作自己的账号，管理员账号只能由管理员操作；每次操作都会记入服务器日志（谁、对哪个账号、做了什么）。未设置 `WA_SCRM_DATA_DIR` 时页面只显示「服务器尚未启用账号」。

````

#### `replica/build-log.md`

**Append 4.2** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 主管视图：账号管理 · 2026-11-23

此前账号只能由技术人员在服务器上用命令创建。项目负责人要求在管理界面里创建和管理账号，并确认主管也可以操作。

现在：主管与管理员登录后，在「员工总览」可以
- 点击「新建账号」创建主管账号：填写登录名、显示名称和密码。填写了密码，账号就直接使用这个密码；留空则生成临时密码，只显示这一次，对方首次登录时必须改成自己的密码；
- 在员工一行和「主管与管理员账号」列表里点击「重置密码」：对方被退出登录，新的临时密码只显示一次；
- 点击「停用」或「启用」：停用后对方无法登录，已登录的页面随即失效。

规则：不能操作自己的账号；管理员账号只能由管理员操作；员工不能使用这些功能。每次操作在服务器日志里留一行：谁、对哪个账号、做了什么。密码不会写入日志，临时密码也不在别处保存。

这一步还不能在页面上创建员工账号：员工需要自己的工作区和 WhatsApp 连接，由下一步的自动创建功能一并完成。部署：服务器文件有变更，合并后需要重启各子站的服务进程。
```

Then verify everything once more:

```bash
git checkout 0e7ab98 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-054/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test run ends with `pass 16`, `fail 0`; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `95273177741eef7859625fa87a942d127792c493fa0043e9c86f1e29ae9f446d`, `77786139dcb467b5bfa2499427c39d2e5d5f6b39661a8d524d48f468499cf87d`; `git status --porcelain` lists exactly eleven paths: `README.md`, `replica/build-log.md`, the six source files under `work/wa-replica/`, and `outputs/wa-replica-prototype/master.js`, `app.css` and `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Sign-in and data tests** (16, one new): the list of accounts — every account with its role, sub-site and state, nothing of a password — for a supervisor and an administrator, not for an employee, not without sign-in; a new supervisor without a password gets a temporary one once and has to change it, and is no supervisor before that; with a password the account keeps it, it does not come back, and the supervisor is one at once; a wrong name, a name that is taken, no display name or one that is too long, a short password or one that is no text, a role other than supervisor, fields that are no text are refused and make nothing; an employee, nobody, and a page of another site make no account; a new temporary password ends the old password and the sessions; an account that is switched off loses its session and cannot sign in, and can again when it is switched on; nobody acts on their own account, a supervisor not on an administrator's, nobody on one that is not there, an employee on none; a supervisor acts on another supervisor, an administrator on a supervisor; every action is in the log with who did it, and no password is.
- **Validator** — the addresses the supervisor page asks are these ten; what it changes goes through one helper to the addresses of accounts and of signing out only, never to a sub-site; the server has the routes, the two guards and the log line; an account can keep a given password.
- **Smoke** (`/tmp/wa-scrm-plan-054/smoke.sh`) — the same facts on the sources and the built page, the README, the build log, that the rest of the page came out unchanged, the syntax of the files and the tests of the server, the relay and the link.
- The build and the validator do not run the page. **Verified by the reviewer in scripted browser sessions, not by you**: the row of an employee offers "重置密码" and "停用" for each account of the sub-site; the second list shows the supervisors with their state, one's own account without actions; the dialog for a new account says what is wrong (a name that does not fit, a name that is taken, no display name, a short password) and keeps what was typed but the password; a new supervisor's temporary password is shown once, can be copied, and is gone from the page when the dialog is closed, by its button or by the Escape key; that supervisor signs in elsewhere, sets a password of their own and sees the page; with a given password the account signs in at once; a new temporary password is asked for first and ends the old one; an account is switched off after a question, cannot sign in, stays in its row marked as off and is switched on again; on a phone both lists keep a readable width and are moved sideways inside their frames; an employee gets nothing of the accounts. The other sessions of the supervisor page, of the rest of the product, of the connection and with two servers behind a gateway still pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 0e7ab98 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 14`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 16`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-054/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/site-auth.cjs` → `a4008dba13265d18e9fc11592da7d825b78f9759245dc5eabc97d44be4d31e23`
- [ ] `sha256sum work/wa-replica/site-api.cjs` → `88cc23ada0f64946249a8263bd9183978dba4db48d74d723a4c685a28e7451a7`
- [ ] `sha256sum work/wa-replica/site-api.test.cjs` → `8286bfdfcd05498335bd939adfc7c5f4ba8dc4ef1f2b51794e28e0b68839c5fa`
- [ ] `sha256sum work/wa-replica/fidelity-master.js` → `150ed6f270770a77d8a3ebfb92056b47b11b4dea90c82607fc8f8b313f04cbad`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `450061d48a214ec56eed935554273ae4e190a98afeb9256c92ca1582acdb6970`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `9c9e930d118ece530200d19809106692accd899235bc4636fd37cb89fc12c380`
- [ ] `sha256sum README.md` → `95273177741eef7859625fa87a942d127792c493fa0043e9c86f1e29ae9f446d`
- [ ] `sha256sum replica/build-log.md` → `77786139dcb467b5bfa2499427c39d2e5d5f6b39661a8d524d48f468499cf87d`
- [ ] `sha256sum outputs/wa-replica-prototype/master.js` → `150ed6f270770a77d8a3ebfb92056b47b11b4dea90c82607fc8f8b313f04cbad`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `91eb773f9c43d76e2d5306a3a3fff30a651cded48944c3627f02220b09c93814`
- [ ] `git diff --name-only 0e7ab98..HEAD -- outputs` lists `outputs/wa-replica-prototype/app.css`, `outputs/wa-replica-prototype/master.js` and `outputs/wa-replica-prototype/validation.json` and nothing else
- [ ] `git diff --name-only 0e7ab98..HEAD -- . ':!plans'` lists exactly these eleven: `README.md`, `outputs/wa-replica-prototype/app.css`, `outputs/wa-replica-prototype/master.js`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/fidelity-master.js`, `work/wa-replica/fidelity.css`, `work/wa-replica/site-api.cjs`, `work/wa-replica/site-api.test.cjs`, `work/wa-replica/site-auth.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, the build reports another number of icons than 84, or a test fails.
- An output file other than `master.js`, `app.css` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file.

## Maintenance notes

- **Deployment**: `site-auth.cjs` and `site-api.cjs` are loaded when a server starts — **every sub-site's server must be restarted once after the merge**. Behind the gateway the routes of accounts are answered by the first server, like the rest of sign-in.
- The command-line tool keeps working beside the page and is still the only way to make an administrator, or an employee for a sub-site that exists already.
- Next plan: an employee is made from the page together with their own sub-site and WhatsApp connection; the dialog then gets the choice between an employee and a supervisor, and switching an employee off also stops their sub-site.
- A temporary password travels in the answer to whoever asked for it and is shown once. Over plain HTTP it can be read on the way, like every password of this system; that is the owner's known choice for the time the system is used internally.
- What a reviewer should scrutinise: who may call each route; that nobody can lock themselves out or act on an administrator without being one; that no password reaches the log or stays in the page.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
