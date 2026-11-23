# Plan 052: The supervisor page — the employees, and their customers and conversations read-only

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3d34c82..HEAD -- work/wa-replica replica/build-log.md outputs README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MEDIUM (a new page and three small changes of the server; the employees' app is not touched, and the page only reads — exact text and checksums for every edit)
- **Depends on**: plans/051-several-sub-sites-one-address.md (DONE)
- **Category**: feature (owner request)
- **Planned at**: commit `3d34c82`, 2026-11-23

## Why this matters

The owner asked on 2026-11-23: "Furthermore, is the supervisor page ready?" It was not: a supervisor or an administrator who signs in is told that the entrance is not open yet. Asked what the first version should show, the owner chose: "Employee list + read chats" — a list of all employees with their key figures (customers, unread chats, open follow-ups, WhatsApp connected or not), and any employee's customers and conversations to read; nothing can be sent or changed from there, and each such visit is noted in the server log. (Earlier, on 2026-11-21, the owner had confirmed that supervisors may read the employees' customers and chats.)

What the server already does: the accounts know the roles (`agent`, `supervisor`, `admin`) and each employee's sub-site; a supervisor or an administrator may read every sub-site's data and WhatsApp link (status, media) and is refused every write (`read-only`). What is missing is the page, and three things the page needs from the server.

What this plan does:

- **A sub-site's server also answers under the sub-site's name**: `/site/<id>/api/…` is `/api/…` of the sub-site `<id>`. The supervisor page reads several sub-sites side by side this way, without a cookie that says which one; behind a gateway such a request is passed to the right server by its path.
- **`GET /api/auth/sites`** (supervisors and administrators): the sub-sites and the employees of each, from the accounts.
- **`GET /api/data?fields=a,b`**: only the named top-level fields. The list of employees asks for the numbers, the customers and the follow-ups of each sub-site — not for the conversations.
- **A log line for every read of a sub-site's data by someone who is not its own employee**: who, which sub-site, which fields.
- **The supervisor page** (`fidelity-master.js`, shipped as `master.js`): after sign-in the start-up file hands a supervisor or an administrator over to it instead of starting the app. It shows the list of employees with the figures, and — after "查看" — one employee's customers (search by name or number) and the conversation of a customer with pictures, voice notes, videos, files and the translations the employee already has, together with the customer's tags, open follow-ups and notes. It only reads: its one request that is not a GET signs out.

### Decisions already made (do not re-open; do not ask)

- The supervisor page is a file of its own and does not start the employees' app; it shows a message the way the app does (the kinds of media, the marks of sent messages), written out again in a simpler form.
- Not in this first version: profile pictures, voice notes as text, refreshing by itself (there is a button), figures across employees.
- The state of a number is what the sub-site's WhatsApp link says at that moment; when the link cannot be asked, what the employee's page saved last — but never "connected" on that alone.
- An employee whose sub-site cannot be read is listed with a note that says so.
- The gateway's configuration is not part of the repository's code; the README shows it.
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/site-data.cjs` | `0eee73f6b7e3a34220a5a53a002f98afa47e911941f6c8b27f0213866f1109f0` | `789cec1ffe216809638b48a54e0845656509bdd2f2aaabb914ff3a0871385811` |
| `work/wa-replica/site-api.cjs` | `c7dc5347cf4d88173641a271208bc12350f45346a7da7743c22f6fa94343e21e` | `5db2f70a8bb0e6950639782a344ec74f39747573c3400a22d9649cab6e148f76` |
| `work/wa-replica/serve.cjs` | `de1572b9423fbbada8bbb468121ce400db7602c9ab6efc35155c1328df25269f` | `688c9f4fd2c14d97bb566fe7c1525cda3e627494217c7e78e2bbcbe02a67e0f2` |
| `work/wa-replica/site-api.test.cjs` | `b1fae66f5de395c42cbad101d038a4497c89f7b0ad148dd7bfad672c697f2bd4` | `306871c1168afa708628a10b8c5b54db4624cc810e84a17e31e256779d0bd283` |
| `work/wa-replica/fidelity-boot.js` | `b326e07c004294e4ed56cb7cc2193226649b6ec025a14a9c5c8c981d5acacb95` | `55e2962f15309003b4674d8c91823e6c8977a6692f8c3fc588988f5755f47f2f` |
| `work/wa-replica/fidelity-index.html` | `eace61c9ff8b9805564b01431f6a549ad582fdc7fcd782f486ee8feab2838da2` | `1a68acf55dca4c1526bbb029fd5fd59a67e18e2d2b566cea6eac1f1f0b4a33b3` |
| `work/wa-replica/fidelity.css` | `d98567514197b935ecdcc540cfb4c81beb785033fdf0256e3fc87c165813ee55` | `7abcca282807d811429ffbdf08cc97189f39697ef7f02ead6c752f21ef2975f4` |
| `work/wa-replica/build-fidelity.cjs` | `35e2407fffbebcb3d0b420cc4c27fddef0892fd9a6e25b23a114d75e74f81139` | `acc26dee867f0dfadce255b8159f10d3e47eda0db35b381c7b4d226dc1f2e1d8` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `e9775d5a710a6df947004f7ce2d77714114433ba83c48026438a3c0c75519cde` | `e240390e6a5ab6abce60263031eb9dddeb65808c2aa51a60599e1b999bc60d61` |
| `README.md` | `746243433700a527a178330cdce28d204d3c061295b03629de0a80c92dcc0d86` | `4d4ec7034de5c42fea1a7c08c3d60e94cb78b4d09caab827882346e1277428de` |
| `work/wa-replica/fidelity-master.js` | (does not exist) | `246fe5824da540c44df79945391e087147109155ebfcecabf63fa0f2e3e725c5` |

- `site-data.cjs` — the store of one sub-site's data; `read()` gives the whole document: every row of the table `doc`, a field that is stored in parts put together again.
- `site-api.cjs` — the sign-in and data routes. `signedIn(req)` is the signed-in user (or an error); `mayRead(user)` is true for the sub-site's own employee and for every supervisor and administrator; `auth.listUsers()` gives the accounts in the order of their names, each `{ id, username, name, role, site, mustChangePassword, disabled }`. A route gets the request only; the address with its question is `req.url`.
- `serve.cjs` — the server: it takes the path of a request and passes `/api/site/*`, `/api/auth/*` and `/api/data` to the routes above, `/api/ai/*` to the model relay, `/api/wa/*` to the WhatsApp link, and serves the page's files for everything else. `site.siteId` is the sub-site's id.
- `site-api.test.cjs` — the tests of sign-in and data (14). Accounts made by earlier tests and used by the new one, all with the password `PASSWORD`: `gus` (employee of `s1`), `ivo` (supervisor), `joy` (administrator); employees of `s2`: `hana`, `max`, `nora`. The last test starts the real server (`serve.cjs`) for a sub-site `default`.
- `fidelity-boot.js` (shipped as `boot.js`) — the start-up of the page: after sign-in, `enter(user, site)` shows a notice to everyone who is not an employee.
- `fidelity-index.html` (shipped as `index.html`) — the page: the app's shell, the sign-in screen, and the scripts `icons.js`, `pricefile.js`, `app.js`, `boot.js`.
- `fidelity.css` — styles of the page, built into `app.css`; a size in px becomes a token, so the block that is added uses only sizes that are in use already and `tokens.css` comes out unchanged.
- `build-fidelity.cjs` — the build: `boot.js` and `pricefile.js` are copies of their sources; the icons that are shipped are those whose names stand in the page or the app.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page; a block is added.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 3d34c82 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Syntax of the two page files | `node -e "const fs=require('fs'),vm=require('vm');for(const f of ['fidelity-boot.js','fidelity-master.js'])new vm.Script(fs.readFileSync('work/wa-replica/'+f,'utf8'));console.log('SYNTAX_OK')"` | `SYNTAX_OK` |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 14`, `fail 0` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 15`, `fail 0` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (they send a 16 MB file twice; allow a few seconds) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-052/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify or create):

- `work/wa-replica/site-data.cjs`, `site-api.cjs`, `serve.cjs`, `site-api.test.cjs` (Step 2)
- `work/wa-replica/fidelity-master.js` (new), `fidelity-boot.js`, `fidelity-index.html`, `fidelity.css`, `build-fidelity.cjs`, `validate-scrm-lifecycle.cjs` (Step 3)
- `README.md`, `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{app.css,boot.js,index.html,master.js,validation.json}` (`master.js` is new; the other output files — `app.js`, `icons.js` and `tokens.css` among them — must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular `site-auth.cjs`, `site-admin.cjs`, `openwa-link.cjs`, `ai-relay.cjs`, the modules of the app (`fidelity-ui.js`, `fidelity-openwa.js`, `fidelity-lifecycle.js` and the others), the other style sheets, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`. Do not install, start or configure a web server or a gateway: the README text is all this plan says about one.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/052-supervisor-page` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): add the supervisor page — employees, and their conversations read-only`. Remember to add the two new files (`work/wa-replica/fidelity-master.js`, `outputs/wa-replica-prototype/master.js`).
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: a **New file** gives the whole content of a file that does not exist yet. An **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block whose text has a fence of its own (the README's) is opened and closed with four backticks; a block ends only at a line that equals its opening run of backticks. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the eleven files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-052/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-052 && cat > /tmp/wa-scrm-plan-052/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks the supervisor page: what the server answers for it, and the page itself.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the sign-in and data tests pass, with the one for the supervisor page' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 15 ℹ fail 0 '
has 'the data can be read in part' "$W/site-data.cjs" 'if (fields && !fields.includes(field)) continue;'
has 'the server lists the sub-sites and their employees' "$W/site-api.cjs" "'GET /api/auth/sites': req => {"
has 'a read by someone else than the employee leaves a line' "$W/site-api.cjs" 'site data read user='
has 'a sub-site answers under its own name' "$W/serve.cjs" "if (named && pathname.startsWith(named + '/api/')) pathname = pathname.slice(named.length);"
same 'master.js is the built copy of the supervisor page' "$(cmp -s "$W/fidelity-master.js" "$P/master.js" 2>/dev/null && echo SAME)" SAME
has 'the page loads it before the start-up file' "$P/index.html" '<script src="app.js"></script><script src="master.js"></script><script src="boot.js"></script>'
has 'the start-up file hands a supervisor over' "$P/boot.js" 'return window.WA_MASTER(user);'
same 'the notice that the entrance is not open yet is gone' "$(grep -c '主管与管理员入口尚未开放' "$P/boot.js")" 0
has 'the styles of the supervisor page are built' "$P/app.css" '.fid-master-site {'
same 'the supervisor page sends nothing but its sign-out' "$(grep -o "method: '[A-Z]*'" "$W/fidelity-master.js" 2>/dev/null | tr '\n' ' ')" "method: 'POST' "
has 'the README describes the supervisor page' "$ROOT/README.md" '主管与管理员登录后进入「主管视图」'
has 'the README shows the gateway rule for a named sub-site' "$ROOT/README.md" 'location ~ ^/site/(?<scrm_named>[a-z0-9-]+)/api/ { proxy_pass http://$scrm_named_node; }'
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 主管视图：员工总览与只读查看'
same 'the app, the icons and the tokens are unchanged' "$(cd "$ROOT" && git status --porcelain -- outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/icons.js outputs/wa-replica-prototype/tokens.css | wc -l | tr -d ' ')" 0
same 'the server files pass the syntax check' "$(node --check "$W/site-data.cjs" 2>&1 && node --check "$W/site-api.cjs" 2>&1 && node --check "$W/serve.cjs" 2>&1 && echo SYNTAX_OK)" SYNTAX_OK
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-052/smoke.sh && ls -l /tmp/wa-scrm-plan-052/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/site-data.cjs work/wa-replica/site-api.cjs work/wa-replica/serve.cjs work/wa-replica/site-api.test.cjs work/wa-replica/fidelity-boot.js work/wa-replica/fidelity-index.html work/wa-replica/fidelity.css work/wa-replica/build-fidelity.cjs work/wa-replica/validate-scrm-lifecycle.cjs README.md` → the "at the planned commit" values of the table in "Current state", in that order; `ls work/wa-replica/fidelity-master.js` → no such file; `NODE=$NODE bash /tmp/wa-scrm-plan-052/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the sign-in and data tests pass, with the one for the supervisor page` (got: ℹ pass 14 ℹ fail 0 ), `the data can be read in part`, `the server lists the sub-sites and their employees`, `a read by someone else than the employee leaves a line`, `a sub-site answers under its own name`, `master.js is the built copy of the supervisor page` (got: ), `the page loads it before the start-up file`, `the start-up file hands a supervisor over`, `the notice that the entrance is not open yet is gone` (got: 1), `the styles of the supervisor page are built`, `the supervisor page sends nothing but its sign-out` (got: ), `the README describes the supervisor page`, `the README shows the gateway rule for a named sub-site` and `the build log has the entry` (fourteen checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: What the server answers for the supervisor page

#### `site-data.cjs`

**Edit 2.1** — `work/wa-replica/site-data.cjs`. Find exactly these lines (they occur once):

```text

  // The whole document with its version. Split fields are put together again.
  function read() {
    const data = {};
```

Replace them with:

```text

  // The whole document with its version, or only the named top-level fields of it. Split fields are put together again.
  function read(fields) {
    const data = {};
```

**Edit 2.2** — `work/wa-replica/site-data.cjs`. Find exactly these lines (they occur once):

```text
      const [field, id] = key.split('/');
      if (id === undefined) data[field] = JSON.parse(json);
```

Replace them with:

```text
      const [field, id] = key.split('/');
      if (fields && !fields.includes(field)) continue;
      if (id === undefined) data[field] = JSON.parse(json);
```

#### `site-api.cjs`

**Edit 2.3** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
//   POST /api/auth/password  { current, next }
//   GET  /api/data           the sub-site's data document
//   PUT  /api/data           { baseVersion, set, remove }
//   DELETE /api/data         { baseVersion, field }: takes a field out for good, with every trace of it
// The employee the sub-site belongs to reads and writes its data; supervisors and administrators read it.
// A log line carries the action, the user name and the outcome; never a password, a token or data.
```

Replace them with:

```text
//   POST /api/auth/password  { current, next }
//   GET  /api/auth/sites     the sub-sites and their employees, for supervisors and administrators
//   GET  /api/data           the sub-site's data document; ?fields=a,b gives only these top-level fields
//   PUT  /api/data           { baseVersion, set, remove }
//   DELETE /api/data         { baseVersion, field }: takes a field out for good, with every trace of it
// The employee the sub-site belongs to reads and writes its data; supervisors and administrators read it, and
// each of their reads leaves a log line that says who read which sub-site and which fields.
// A log line carries the action, the user name and the outcome; never a password, a token or data.
```

**Edit 2.4** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
const SITE_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const STATUS = {
```

Replace them with:

```text
const SITE_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const FIELD = /^[A-Za-z][A-Za-z0-9]{0,39}$/;
const STATUS = {
```

**Edit 2.5** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
    },
    'GET /api/data': req => {
```

Replace them with:

```text
    },
    // The sub-sites and the employees of each, from the accounts: what the supervisor page lists.
    'GET /api/auth/sites': req => {
      if (signedIn(req).role === 'agent') throw problem('forbidden');
      const sites = new Map();
      for (const account of auth.listUsers()) {
        if (account.role !== 'agent') continue;
        if (!sites.has(account.site)) sites.set(account.site, []);
        sites.get(account.site).push({ username: account.username, name: account.name, disabled: account.disabled });
      }
      return { body: { sites: [...sites].sort(([a], [b]) => (a < b ? -1 : 1)).map(([site, employees]) => ({ site, employees })) } };
    },
    'GET /api/data': req => {
```

**Edit 2.6** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
      if (!mayRead(user)) throw problem('forbidden');
      return { body: data.read() };
    },
```

Replace them with:

```text
      if (!mayRead(user)) throw problem('forbidden');
      const asked = new URL(req.url, 'http://localhost').searchParams.get('fields');
      const fields = asked === null ? null : asked.split(',');
      if (fields && (fields.length > 20 || !fields.every(field => FIELD.test(field)))) throw problem('invalid-request');
      // Who is not the sub-site's own employee leaves a line for every read: who, which sub-site, which fields.
      if (user.role !== 'agent') console.log(`site data read user=${user.username} role=${user.role} site=${siteId} fields=${fields ? fields.join(',') : 'all'}`);
      return { body: data.read(fields) };
    },
```

#### `serve.cjs`

**Edit 2.7** — `work/wa-replica/serve.cjs`. Find exactly these lines (they occur once):

```text
const waLink = site ? require('./openwa-link.cjs').create({ dir: process.env.WA_SCRM_DATA_DIR, siteId: site.siteId, site }) : null;
const mime = {
```

Replace them with:

```text
const waLink = site ? require('./openwa-link.cjs').create({ dir: process.env.WA_SCRM_DATA_DIR, siteId: site.siteId, site }) : null;
// A sub-site's server also answers under the sub-site's name: /site/<id>/api/… is /api/… of the sub-site <id>.
// The supervisor page reads several sub-sites side by side this way, and a gateway in front of several servers
// passes such a request to the right one by its path.
const named = site ? '/site/' + site.siteId : null;
const mime = {
```

**Edit 2.8** — `work/wa-replica/serve.cjs`. Find exactly these lines (they occur once):

```text
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (isSiteRoute(pathname)) {
```

Replace them with:

```text
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (named && pathname.startsWith(named + '/api/')) pathname = pathname.slice(named.length);
    if (isSiteRoute(pathname)) {
```

#### `site-api.test.cjs`

**Edit 2.9** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text

test('the log names users and outcomes, never a password, a token or data', () => {
```

Replace them with:

```text

test('the supervisor page\'s questions: the sub-sites and their employees; only some fields of a sub-site\'s data; each read by someone else than the employee leaves a line', async () => {
  const [gus, ivo, joy] = await Promise.all(['gus', 'ivo', 'joy'].map(async username => cookieOf(await call('/api/auth/login', { method: 'POST', body: { username, password: PASSWORD } }))));
  // the list: every sub-site that has an employee, with the employees' names; not for an employee, not without sign-in
  const list = await call('/api/auth/sites', { cookie: ivo });
  assert.equal(list.status, 200);
  assert.deepEqual(list.json.sites.map(entry => entry.site), [...list.json.sites.map(entry => entry.site)].sort(), 'in the order of the names');
  assert.deepEqual(list.json.sites.find(entry => entry.site === 's2').employees, [{ username: 'hana', name: 'hana name', disabled: false }, { username: 'max', name: 'max name', disabled: false }, { username: 'nora', name: 'Nora', disabled: false }]);
  assert(list.json.sites.find(entry => entry.site === 's1').employees.some(employee => employee.username === 'dana' && employee.name === 'dana name'));
  assert(!JSON.stringify(list.json).includes('ivo') && !JSON.stringify(list.json).includes('joy') && !list.raw.includes('scrypt'), 'supervisors and administrators are no employees; no password hash');
  assert.deepEqual((await call('/api/auth/sites', { cookie: joy })).json, list.json, 'an administrator gets the same');
  site.auth.setDisabled('max', true);
  assert.equal((await call('/api/auth/sites', { cookie: ivo })).json.sites.find(entry => entry.site === 's2').employees.find(employee => employee.username === 'max').disabled, true);
  site.auth.setDisabled('max', false);
  assert.deepEqual([(await call('/api/auth/sites', { cookie: gus })).json, (await call('/api/auth/sites')).status, (await call('/api/auth/sites', { method: 'POST', cookie: ivo, body: {} })).status], [{ error: 'forbidden' }, 401, 405]);
  // only some fields: the others are left out, a split field comes back whole, a field that is not there is simply missing
  const version = (await call('/api/data', { cookie: gus })).json.version;
  assert.equal((await call('/api/data', { method: 'PUT', cookie: gus, body: { baseVersion: version, set: { customers: [{ id: 'c1' }], tasks: [], 'messages/c1': [{ id: 'm1' }], 'messages/c2': [] } } })).status, 200);
  const some = await call('/api/data?fields=customers,tasks,nothing', { cookie: ivo });
  assert.deepEqual([some.status, some.json], [200, { version: version + 1, data: { customers: [{ id: 'c1' }], tasks: [] } }]);
  assert.deepEqual((await call('/api/data?fields=messages', { cookie: gus })).json.data, { messages: { c1: [{ id: 'm1' }], c2: [] } });
  const whole = (await call('/api/data', { cookie: ivo })).json.data;
  assert(['customers', 'messages', 'note', 'tasks'].every(field => field in whole) && Object.keys(whole).length > 4, 'without the question everything comes, as before');
  for (const fields of ['', 'customers,', 'messages/c1', 'a b', '1st', 'x'.repeat(41), Array.from({ length: 21 }, (_, i) => 'f' + i).join(',')]) {
    assert.deepEqual((await call('/api/data?fields=' + encodeURIComponent(fields), { cookie: ivo })).json, { error: 'invalid-request' }, JSON.stringify(fields));
  }
  assert.deepEqual((await call('/api/data?fields=customers', { cookie: await member('olga', 'agent', 's2') })).json, { error: 'forbidden' }, 'not for an employee of another sub-site');
  // the lines: one for each read of a supervisor or an administrator, none for the employee's own
  const reads = logged.filter(line => line.startsWith('site data read '));
  assert(reads.includes('site data read user=ivo role=supervisor site=s1 fields=customers,tasks,nothing') && reads.includes('site data read user=ivo role=supervisor site=s1 fields=all') && reads.includes('site data read user=joy role=admin site=s1 fields=all'), reads.join('\n'));
  assert(!reads.some(line => line.includes('user=gus')), 'the employee\'s own reads leave no line');
});

test('the log names users and outcomes, never a password, a token or data', () => {
```

**Edit 2.10** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
    assert.deepEqual((await call('/api/data', { base: on.base, cookie: cookieOf(first) })).json, { version: 0, data: {} });
    for (const name of fs.readdirSync(dir).filter(name => name.startsWith('site-default.db'))) assert.equal(fs.statSync(path.join(dir, name)).mode & 0o077, 0, name + ' is private');
```

Replace them with:

```text
    assert.deepEqual((await call('/api/data', { base: on.base, cookie: cookieOf(first) })).json, { version: 0, data: {} });
    // the server also answers under the name of its sub-site, and under no other
    assert.deepEqual((await call('/site/default/api/data?fields=customers', { base: on.base, cookie: cookieOf(first) })).json, { version: 0, data: {} });
    assert.deepEqual([(await call('/site/default/api/site/status', { base: on.base })).json, (await call('/site/default/api/data', { base: on.base })).status, (await call('/site/default/api/wa/status', { base: on.base })).status], [{ enabled: true, site: 'default' }, 401, 401]);
    assert.deepEqual((await call('/site/default/api/ai/status', { base: on.base })).json, { error: 'not-signed-in' });
    assert.deepEqual([(await fetch(on.base + '/site/other/api/data', { headers: { Cookie: cookieOf(first) } })).status, (await fetch(on.base + '/site/default/index.html')).status, (await fetch(on.base + '/site/default')).status], [404, 404, 404]);
    for (const name of fs.readdirSync(dir).filter(name => name.startsWith('site-default.db'))) assert.equal(fs.statSync(path.join(dir, name)).mode & 0o077, 0, name + ' is private');
```

**Verify**: `sha256sum work/wa-replica/site-data.cjs work/wa-replica/site-api.cjs work/wa-replica/serve.cjs work/wa-replica/site-api.test.cjs` → `789cec1ffe216809638b48a54e0845656509bdd2f2aaabb914ff3a0871385811`, `5db2f70a8bb0e6950639782a344ec74f39747573c3400a22d9649cab6e148f76`, `688c9f4fd2c14d97bb566fe7c1525cda3e627494217c7e78e2bbcbe02a67e0f2`, `306871c1168afa708628a10b8c5b54db4624cc810e84a17e31e256779d0bd283`; `node --check` on `work/wa-replica/site-data.cjs`, `site-api.cjs` and `serve.cjs` exits 0; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 15`, `fail 0`. If a checksum does not match, restore the file with `git checkout 3d34c82 -- <file>` and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 3: The supervisor page

#### `fidelity-master.js`

**New file 3.1** — `work/wa-replica/fidelity-master.js`. The file does not exist yet. Create it with exactly this content (247 lines; the file ends with one newline):

```text
// The supervisor page: what a supervisor or an administrator sees after signing in. fidelity-boot.js calls
// window.WA_MASTER(user) instead of starting the app. The page lists the employees with a few figures of each
// one's sub-site and shows, read-only, the customers and conversations of one of them.
// It only reads: every request is a GET, except the one that signs out. A sub-site is asked under its own name,
// /site/<id>/api/…, so that several sub-sites can be read side by side; the server of a sub-site leaves a log
// line for every read of its data by someone who is not its own employee.
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = text => String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const icon = name => `<span class="icon" data-icon="${name}" aria-hidden="true"></span>`;
  const get = path => fetch(path).then(async response => ({ status: response.status, body: await response.json().catch(() => ({})) }), () => ({ status: 0, body: {} }));
  // The address of a sub-site's own server for a path of its API.
  const at = (site, path) => '/site/' + encodeURIComponent(site) + path;

  // user: who is signed in. sites: the list, each { site, employees, reached, data, link }.
  // open: the sub-site that is being looked at, { site, name, data, customer, query, chat } — or null for the list.
  // atEnd, endTop: whether the conversation shows its latest message, and where the page last put it there.
  const state = { user: null, sites: [], loading: true, failed: false, open: null, atEnd: true, endTop: -1 };

  function paintIcons(root) {
    for (const el of root.querySelectorAll('[data-icon]:empty')) {
      const nodes = window.WA_ICONS?.[el.dataset.icon];
      if (!nodes) continue;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      for (const [name, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(name, value);
      for (const [tag, attributes] of nodes) {
        const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
        svg.append(node);
      }
      el.replaceChildren(svg);
    }
  }

  // ---- days and times, as the app shows them ----
  const dayOf = at => new Date(at).toLocaleDateString('sv-SE');
  const clock = at => new Date(at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dayWord = at => (dayOf(at) === dayOf(Date.now()) ? '今天' : dayOf(at) === dayOf(Date.now() - 86400000) ? '昨天' : dayOf(at));
  const lastLabel = c => (!c.lastAt ? c.last || '' : dayOf(c.lastAt) === dayOf(Date.now()) ? clock(c.lastAt) : dayOf(c.lastAt) === dayOf(Date.now() - 86400000) ? '昨天' : dayOf(c.lastAt).slice(5));
  const messageDay = m => (m.at ? dayWord(m.at) : String(m.time || '').startsWith('昨天') ? '昨天' : '今天');
  const messageTime = m => (m.at ? clock(m.at) : String(m.time || '').replace('昨天 ', ''));
  // The conversation with the latest message comes first; the others keep their order after them.
  const ordered = list => list.map((c, i) => [c, i]).sort((x, y) => (y[0].lastAt || 0) - (x[0].lastAt || 0) || x[1] - y[1]).map(x => x[0]);

  // ---- the list of employees ----
  const LINK = { online: '已连接', scan: '等待扫码', starting: '连接中', verifying: '连接中', offline: '已掉线', attention: '需要在手机上处理', failed: '连接失败', missing: '需要重新绑定' };
  const SAVED = { online: '已连接', reconnect: '已掉线', pending: '待绑定' };
  const names = entry => {
    const active = entry.employees.filter(employee => !employee.disabled);
    return (active.length ? active : entry.employees).map(employee => employee.name + (employee.disabled ? '（已停用）' : '')).join('、');
  };
  // The state of each of a sub-site's numbers: what its WhatsApp link says now, or — when the link cannot be
  // asked or does not know the number — what the employee's page saved last (never "connected" on that alone).
  function numbers(entry) {
    return (entry.data.accounts || []).map(account => {
      const live = entry.link?.configured && entry.link.reachable ? entry.link.accounts.find(a => a.account === account.id)?.state : '';
      return { name: account.number || account.name || '', on: live === 'online', text: live ? LINK[live] || '已掉线' : SAVED[account.state === 'online' ? 'reconnect' : account.state] || '待绑定' };
    });
  }
  function figures(entry) {
    const customers = entry.data.customers || [], open = (entry.data.tasks || []).filter(task => !task.done);
    return {
      customers: customers.length,
      unread: customers.filter(c => c.unread > 0).length,
      tasks: open.length,
      late: open.filter(task => Date.parse(task.due) < Date.now()).length,
      last: Math.max(0, ...customers.map(c => c.lastAt || 0)),
    };
  }
  async function load() {
    state.loading = true;
    render();
    const list = await get('/api/auth/sites');
    state.failed = list.status !== 200;
    state.sites = state.failed ? [] : await Promise.all(list.body.sites.map(async entry => {
      const [doc, link] = await Promise.all([get(at(entry.site, '/api/data?fields=accounts,customers,tasks')), get(at(entry.site, '/api/wa/status'))]);
      return { ...entry, reached: doc.status === 200, data: doc.status === 200 ? doc.body.data : {}, link: link.status === 200 ? link.body : null };
    }));
    state.loading = false;
    render();
  }
  function listHTML() {
    if (state.loading) return '<p class="fid-master-note">正在读取…</p>';
    if (state.failed) return '<p class="fid-master-note">暂时无法读取员工列表，请稍后点击「刷新」。</p>';
    if (!state.sites.length) return '<p class="fid-master-note">还没有员工账号。</p>';
    const rows = state.sites.map(entry => {
      const who = `<strong>${esc(names(entry))}</strong><small>${esc(entry.employees.map(employee => employee.username).join('、'))}</small>`;
      if (!entry.reached) return `<tr><td class="fid-master-who">${who}</td><td colspan="5" class="fid-master-quiet">暂时无法读取这位员工的工作区</td><td></td></tr>`;
      const f = figures(entry), list = numbers(entry);
      return `<tr>
        <td class="fid-master-who">${who}</td>
        <td>${list.map(n => `<span class="fid-master-number"><span class="fid-master-dot ${n.on ? 'on' : 'warn'}"></span>${esc(n.name)}<small>${esc(n.text)}</small></span>`).join('') || '<span class="fid-master-quiet">还没有绑定号码</span>'}</td>
        <td>${f.customers}</td>
        <td>${f.unread}</td>
        <td>${f.tasks}${f.late ? `<small class="fid-master-late">${f.late} 项已逾期</small>` : ''}</td>
        <td>${f.last ? esc(dayWord(f.last) + ' ' + clock(f.last)) : '—'}</td>
        <td><button type="button" class="fid-btn tint" data-master="open" data-id="${esc(entry.site)}">${icon('MessagesSquare')}查看</button></td>
      </tr>`;
    }).join('');
    return `<div class="fid-table-scroll" tabindex="0" aria-label="员工总览表格"><table class="fid-table fid-master-table"><thead><tr>${['员工', 'WhatsApp 号码', '客户', '未读会话', '待跟进', '最近消息', '操作'].map(title => `<th scope="col">${title}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // ---- one employee's customers and conversations ----
  const SHOWN = { image: 'image', sticker: 'image', video: 'video', audio: 'audio', voice: 'audio', document: 'file' };
  const WORDS = { image: '[图片]', video: '[视频]', audio: '[语音]', voice: '[语音]', document: '[文件]', sticker: '[贴图]', location: '[位置]', contact: '[名片]', poll: '[投票]', call: '[通话]' };
  const mediaUrl = (c, m) => (!m.wa || !SHOWN[m.type] || !c.waChat || !c.account ? '' : at(state.open.site, '/api/wa/media?account=' + encodeURIComponent(c.account) + '&chat=' + encodeURIComponent(c.waChat) + '&id=' + encodeURIComponent(m.wa)));
  function mediaHTML(c, m) {
    const url = esc(mediaUrl(c, m)), shown = SHOWN[m.type];
    if (!url) return '';
    if (shown === 'image') return `<a class="openwa-media" href="${url}" target="_blank" rel="noopener" aria-label="在新标签页查看${m.type === 'sticker' ? '贴图' : '图片'}"><img src="${url}" alt="${m.type === 'sticker' ? '贴图' : '图片'}" loading="lazy"></a>`;
    if (shown === 'video') return `<div class="openwa-media"><video src="${url}" controls preload="none" aria-label="视频"></video></div>`;
    if (shown === 'audio') return `<div class="openwa-media"><audio src="${url}" controls preload="none" aria-label="语音"></audio></div>`;
    return `<a class="openwa-file" href="${url}&amp;download=1" download>${icon('FileDown')}<span>${esc(m.file || '文件')}</span></a>`;
  }
  // The words that only stood for the media ("[图片]") are left out when the media is shown.
  const caption = (c, m) => (mediaUrl(c, m) && m.text === WORDS[m.type] ? '' : m.text || '');
  // What a message of the number says about its way: on its way, not sent, outcome open, read, delivered or sent.
  const mark = m => (m.status === 'sending' ? '<span>发送中</span>' : m.status === 'failed' ? '<span class="fid-master-warn">未发送</span>' : m.status === 'unknown' ? '<span class="fid-master-warn">结果待确认</span>'
    : m.status === 'read' || m.status === 'played' ? icon('CheckCheck') + '<span>已读</span>' : icon(m.status === 'delivered' ? 'CheckCheck' : 'Check'));
  const selected = () => state.open.data.customers.find(c => c.id === state.open.customer);
  const matches = c => {
    const words = state.open.query.trim().toLowerCase().split(/\s+/).filter(Boolean), text = (c.name + ' ' + c.phone).toLowerCase(), digits = String(c.phone || '').replace(/\D/g, '');
    return words.every(word => text.includes(word) || (/^\d+$/.test(word) && digits.includes(word)));
  };
  function peopleHTML() {
    const list = ordered(state.open.data.customers).filter(matches);
    if (!list.length) return `<p class="fid-master-note">${state.open.data.customers.length ? '没有匹配的客户' : '这位员工还没有客户'}</p>`;
    return list.map(c => `<button type="button" class="fid-master-row ${c.id === state.open.customer ? 'selected' : ''}" data-master="customer" data-id="${esc(c.id)}" aria-label="查看${esc(c.name)}的会话">
      <span class="avatar ${esc(c.color || 'jade')}">${esc(c.initials || [...String(c.name || '')].slice(0, 1).join(''))}</span>
      <span class="fid-master-row-main"><span class="fid-master-row-line"><strong>${esc(c.name)}</strong><time>${esc(lastLabel(c))}</time></span>
      <span class="fid-master-row-line"><span class="fid-master-preview">${esc(c.preview)}</span>${c.unread > 0 ? `<span class="fid-master-unread">${Number(c.unread)}</span>` : ''}</span></span>
    </button>`).join('');
  }
  function chatHTML() {
    const c = selected(), data = state.open.data;
    if (!c) return '<p class="fid-master-note">选择左侧的客户查看会话</p>';
    const number = (data.accounts || []).find(a => a.id === c.account), tags = (c.tags || []).map(id => (data.tags || []).find(tag => tag.id === id)?.name).filter(Boolean);
    const tasks = (data.tasks || []).filter(task => task.customer === c.id && !task.done), list = data.messages?.[c.id] || [];
    let lastDay = '';
    const messages = list.map(m => {
      const day = messageDay(m), separator = day !== lastDay ? `<div class="fid-master-day">${esc(day)}</div>` : '';
      lastDay = day;
      return `${separator}<div class="fid-master-msg ${m.side === 'out' ? 'out' : ''}"><div class="fid-master-bubble">${mediaHTML(c, m)}${caption(c, m) ? `<div class="fid-master-text">${esc(caption(c, m))}</div>` : ''}${m.translated ? `<div class="fid-master-translation">${icon('Languages')}${esc(m.translated)}</div>` : ''}</div><div class="fid-master-meta"><time>${esc(messageTime(m))}</time>${m.side === 'out' ? mark(m) : ''}</div></div>`;
    }).join('');
    return `<div class="fid-master-chat-head"><button type="button" class="fid-btn fid-master-back" data-master="people" aria-label="返回客户列表">${icon('ArrowLeft')}</button><span class="avatar ${esc(c.color || 'jade')}">${esc(c.initials || [...String(c.name || '')].slice(0, 1).join(''))}</span><div><h2>${esc(c.name)}</h2><p>${esc([c.phone, number?.name, c.language].filter(Boolean).join(' · '))}</p></div></div>
      <dl class="fid-master-facts">
        <div><dt>标签</dt><dd>${esc(tags.join('、') || '无')}</dd></div>
        <div><dt>待跟进</dt><dd>${tasks.length ? tasks.map(task => esc(task.title) + (task.due ? `（${esc(dayOf(Date.parse(task.due)).slice(5))} 到期${Date.parse(task.due) < Date.now() ? '，已逾期' : ''}）` : '')).join('；') : '无'}</dd></div>
        ${c.notes ? `<div><dt>备注</dt><dd>${esc(c.notes)}</dd></div>` : ''}
      </dl>
      <div class="fid-master-messages" id="master-messages" tabindex="0" aria-label="${esc(c.name)}的会话">${messages || '<p class="fid-master-note">还没有会话消息</p>'}</div>`;
  }
  async function openSite(site, keep = '') {
    const entry = state.sites.find(e => e.site === site);
    state.open = { site, name: entry ? names(entry) : site, data: null, customer: '', query: '', chat: false, failed: false };
    render();
    const doc = await get(at(site, '/api/data'));
    if (state.open?.site !== site) return;
    if (doc.status !== 200) state.open.failed = true;
    else {
      const data = doc.body.data;
      data.customers ??= [];
      state.open.data = data;
      state.open.customer = data.customers.some(c => c.id === keep) ? keep : ordered(data.customers)[0]?.id || '';
    }
    render();
  }
  function siteHTML() {
    const open = state.open;
    const bar = `<div class="fid-master-bar"><button type="button" class="fid-btn" data-master="list">${icon('ArrowLeft')}返回员工总览</button><h1>${esc(open.name)} 的工作区</h1><span class="fid-master-readonly">${icon('LockKeyhole')}只读</span><button type="button" class="fid-btn" data-master="reload">${icon('RefreshCw')}刷新</button><p>这里只能查看：不能发送消息，也不能修改客户资料。每次查看都会记入服务器日志。</p></div>`;
    if (open.failed) return bar + '<p class="fid-master-note">暂时无法读取这位员工的工作区，请稍后点击「刷新」。</p>';
    if (!open.data) return bar + '<p class="fid-master-note">正在读取…</p>';
    return `${bar}<div class="fid-master-site ${open.chat ? 'chat-open' : ''}">
      <aside class="fid-master-people" aria-label="客户列表"><div class="fid-master-search"><input id="master-search" type="search" placeholder="搜索客户姓名或号码" aria-label="搜索客户" value="${esc(open.query)}"></div><div class="fid-master-list" id="master-list">${peopleHTML()}</div></aside>
      <section class="fid-master-chat" id="master-chat">${chatHTML()}</section>
    </div>`;
  }

  // ---- the page ----
  function render() {
    const root = $('#master');
    root.innerHTML = `<header class="fid-master-top"><div class="fid-sign-in-brand" translate="no"><span class="brand-symbol" data-icon="MessagesSquare"></span><strong>WA Desk SCRM</strong></div><span class="fid-master-title">主管视图</span><span class="fid-master-user">已登录：${esc(state.user.name)}（${esc(state.user.username)}）</span><button type="button" class="fid-btn" data-master="leave">${icon('LogOut')}退出登录</button></header>
      <div class="fid-master-body">${state.open ? siteHTML() : `<div class="fid-master-bar"><h1>员工总览</h1><button type="button" class="fid-btn" data-master="reload">${icon('RefreshCw')}刷新</button><p>每位员工的号码、客户与待办概况。点击「查看」可以只读方式查看该员工的客户与会话。</p></div>${listHTML()}`}</div>`;
    paintIcons(root);
    showEnd();
  }
  // A conversation opens at its latest message, and stays there while pictures take their height — unless the
  // reader has moved up.
  function showEnd() {
    const box = $('#master-messages');
    if (!box) return;
    box.scrollTop = box.scrollHeight;
    Object.assign(state, { atEnd: true, endTop: box.scrollTop });
  }
  function showCustomer() {
    $('#master-list').innerHTML = peopleHTML();
    $('#master-chat').innerHTML = chatHTML();
    $('.fid-master-site').classList.toggle('chat-open', state.open.chat);
    paintIcons($('#master'));
    showEnd();
  }

  const actions = {
    open: id => openSite(id),
    list: () => { state.open = null; load(); },
    reload: () => (state.open ? openSite(state.open.site, state.open.customer) : load()),
    customer: id => { Object.assign(state.open, { customer: id, chat: true }); showCustomer(); },
    people: () => { state.open.chat = false; showCustomer(); },
    leave: async () => {
      await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
      location.reload();
    },
  };

  window.WA_MASTER = user => {
    const root = $('#master');
    state.user = user;
    root.hidden = false;
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-master]');
      if (button) actions[button.dataset.master](button.dataset.id);
    });
    root.addEventListener('input', event => {
      if (event.target.id !== 'master-search') return;
      state.open.query = event.target.value;
      $('#master-list').innerHTML = peopleHTML();
    });
    // Media that cannot be had — gone from the phone, or the number is not connected — gives way to a short note.
    root.addEventListener('error', event => {
      const el = event.target, holder = el.closest?.('.openwa-media');
      if (!holder || !['IMG', 'VIDEO', 'AUDIO'].includes(el.tagName)) return;
      const note = document.createElement('span');
      note.className = 'openwa-media-missing';
      note.textContent = (el.tagName === 'IMG' ? '图片' : el.tagName === 'VIDEO' ? '视频' : '语音') + '暂时无法加载';
      holder.replaceWith(note);
    }, true);
    // A picture that arrives later makes the conversation taller: its end stays in view while the reader is there.
    // (The scroll the page made itself reports the place it was put to; that is no move of the reader.)
    root.addEventListener('scroll', event => {
      const box = event.target;
      if (box.id === 'master-messages' && box.scrollTop !== state.endTop) state.atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
    }, true);
    root.addEventListener('load', event => { if (state.atEnd && event.target.tagName === 'IMG' && event.target.closest('#master-messages')) showEnd(); }, true);
    return load();
  };
})();
```

#### `fidelity-boot.js`

**Edit 3.2** — `work/wa-replica/fidelity-boot.js`. Find exactly these lines (they occur once):

```text
    if (user.mustChangePassword) return show('请先修改临时密码', `${user.name}，你正在使用管理员发放的临时密码。设置自己的密码后才能进入工作台。`, 'password', { leave: true });
    if (user.role !== 'agent') return show('主管与管理员入口尚未开放', '查看各员工子站的入口将随主站一起提供。请使用员工账号登录。', null, { leave: true });
    let loaded;
```

Replace them with:

```text
    if (user.mustChangePassword) return show('请先修改临时密码', `${user.name}，你正在使用管理员发放的临时密码。设置自己的密码后才能进入工作台。`, 'password', { leave: true });
    // A supervisor or an administrator gets the supervisor page (master.js) instead of the app: the employees
    // and, read-only, their customers and conversations.
    if (user.role !== 'agent') {
      $('#subsite-login').hidden = true;
      $('.skip-link').hidden = true;
      return window.WA_MASTER(user);
    }
    let loaded;
```

#### `fidelity-index.html`

**Edit 3.3** — `work/wa-replica/fidelity-index.html`. Find exactly these lines (they occur once):

```text
  </main>
  <div id="toast" role="status" aria-live="polite"></div>
  <dialog id="dialog" aria-label="编辑信息"><div id="dialog-content"></div></dialog>
  <script src="icons.js"></script><script src="pricefile.js"></script><script src="app.js"></script><script src="boot.js"></script>
</body>
```

Replace them with:

```text
  </main>
  <main id="master" class="fid-master" aria-label="主管视图" hidden></main>
  <div id="toast" role="status" aria-live="polite"></div>
  <dialog id="dialog" aria-label="编辑信息"><div id="dialog-content"></div></dialog>
  <script src="icons.js"></script><script src="pricefile.js"></script><script src="app.js"></script><script src="master.js"></script><script src="boot.js"></script>
</body>
```

#### `fidelity.css`

**Append 3.4** — `work/wa-replica/fidelity.css`. Add at the end of the file, after one empty line:

```text
/* The supervisor page (fidelity-master.js): the employees and, read-only, one employee's customers and conversations. */
.fid-master { min-height:100dvh; display:flex; flex-direction:column; background:var(--color-bg); color:var(--color-text); }
.fid-master[hidden] { display:none; }
.fid-master-top { display:flex; align-items:center; gap:12px; min-height:56px; padding:8px 20px; border-bottom:1px solid var(--fid-frame); background:var(--color-surface); }
.fid-master-title { margin-right:auto; padding:2px 10px; border-radius:999px; background:var(--color-accent-soft); color:var(--color-accent); font-size:13px; }
.fid-master-user { color:var(--fid-quiet); font-size:13px; }
.fid-master-body { flex:1; min-height:0; display:flex; flex-direction:column; gap:12px; padding:16px 20px 20px; }
.fid-master-bar { display:flex; flex-wrap:wrap; align-items:center; gap:8px 12px; }
.fid-master-bar h1 { margin:0 auto 0 0; font-size:17px; font-weight:750; line-height:24px; }
.fid-master-bar p { flex-basis:100%; margin:0; color:var(--fid-quiet); font-size:13px; line-height:20px; }
.fid-master-readonly { display:inline-flex; align-items:center; gap:4px; padding:2px 10px; border-radius:999px; background:var(--fid-mint-bg); color:var(--fid-mint); font-size:13px; }
.fid-master-readonly .icon,.fid-master-meta .icon,.fid-master-translation .icon { flex:none; width:14px; height:14px; }
.fid-master-note { margin:0; padding:40px 20px; color:var(--fid-quiet); font-size:13px; line-height:20px; text-align:center; }
.fid-master-table td { height:56px; }
.fid-master-table small { display:block; color:var(--fid-quiet); font-size:12px; }
.fid-master-table small.fid-master-late { color:var(--color-danger); }
.fid-master-quiet { color:var(--fid-quiet); }
.fid-master-number { display:flex; flex-wrap:wrap; align-items:center; gap:2px 6px; }
.fid-master-number small { flex-basis:100%; padding-left:14px; }
.fid-master-dot { flex:none; width:8px; height:8px; border-radius:50%; background:var(--fid-amber); }
.fid-master-dot.on { background:var(--fid-mint); }
.fid-master-site { flex:1; min-height:400px; max-height:calc(100dvh - 190px); display:grid; grid-template-columns:320px minmax(0,1fr); border:1px solid var(--fid-frame); border-radius:14px; background:var(--color-surface); overflow:hidden; }
.fid-master-people { display:flex; flex-direction:column; min-height:0; border-right:1px solid var(--fid-frame); }
.fid-master-search { padding:12px; border-bottom:1px solid var(--fid-frame); }
.fid-master-search input { width:100%; height:36px; padding:0 12px; border:1px solid var(--color-border); border-radius:8px; background:var(--color-surface); color:var(--color-text); font:inherit; }
.fid-master-search input:focus { border-color:var(--color-accent); outline:1px solid var(--color-accent); outline-offset:0; }
.fid-master-list { flex:1; min-height:0; overflow:auto; }
.fid-master-row { display:flex; align-items:center; gap:10px; width:100%; padding:10px 12px; border:0; border-bottom:1px solid var(--fid-frame); background:none; color:inherit; font:inherit; text-align:left; cursor:pointer; }
.fid-master-row:hover,.fid-master-row.selected { background:var(--color-accent-soft); }
.fid-master-row .avatar,.fid-master-chat-head .avatar { flex:none; width:40px; height:40px; }
.fid-master-row-main { flex:1; min-width:0; display:grid; gap:2px; }
.fid-master-row-line { display:flex; align-items:center; gap:8px; min-width:0; }
.fid-master-row-line strong,.fid-master-preview { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.fid-master-row-line strong { font-size:14px; font-weight:600; }
.fid-master-row-line time,.fid-master-preview { color:var(--fid-quiet); font-size:12px; }
.fid-master-unread { flex:none; min-width:18px; height:18px; padding:0 5px; border-radius:999px; background:var(--fid-mint); color:var(--color-surface); font-size:12px; line-height:18px; text-align:center; }
.fid-master-chat { display:flex; flex-direction:column; min-width:0; min-height:0; }
.fid-master-chat-head { display:flex; align-items:center; gap:10px; padding:10px 16px; border-bottom:1px solid var(--fid-frame); }
.fid-master-chat-head h2 { margin:0; font-size:15px; line-height:22px; }
.fid-master-chat-head p { margin:0; color:var(--fid-quiet); font-size:12px; line-height:18px; }
.fid-master-back { display:none; }
.fid-master-facts { display:grid; gap:4px; margin:0; padding:10px 16px; border-bottom:1px solid var(--fid-frame); font-size:13px; line-height:20px; }
.fid-master-facts div { display:flex; gap:8px; }
.fid-master-facts dt { flex:none; width:64px; color:var(--fid-quiet); }
.fid-master-facts dd { min-width:0; margin:0; overflow-wrap:anywhere; }
.fid-master-messages { flex:1; min-height:0; display:flex; flex-direction:column; gap:8px; padding:16px; overflow:auto; background:var(--fid-chat); }
.fid-master-day { align-self:center; padding:2px 10px; border-radius:999px; background:var(--color-surface); color:var(--fid-quiet); font-size:12px; }
.fid-master-msg { align-self:flex-start; max-width:min(72%,640px); }
.fid-master-msg.out { align-self:flex-end; }
.fid-master-bubble { padding:8px 10px; border-radius:10px; background:var(--color-surface); font-size:14px; line-height:20px; overflow-wrap:anywhere; }
.fid-master-msg.out .fid-master-bubble { background:var(--color-bubble-out); }
.fid-master-text { white-space:pre-wrap; }
.fid-master-bubble>.openwa-media:last-child,.fid-master-bubble>.openwa-file:last-child,.fid-master-bubble>.openwa-media-missing:last-child { margin-bottom:0; }
.fid-master-translation { display:flex; gap:6px; margin-top:6px; padding-top:6px; border-top:1px solid var(--fid-frame); color:var(--fid-ink); font-size:13px; white-space:pre-wrap; }
.fid-master-translation .icon { margin-top:3px; }
.fid-master-meta { display:flex; align-items:center; gap:4px; margin-top:2px; color:var(--fid-quiet); font-size:12px; }
.fid-master-msg.out .fid-master-meta { justify-content:flex-end; }
.fid-master-warn { color:var(--fid-amber); }
@media(max-width:760px) {
  .fid-master-top,.fid-master-body { padding-inline:12px; }
  .fid-master-user { display:none; }
  .fid-master-site { grid-template-columns:minmax(0,1fr); }
  .fid-master-site .fid-master-chat,.fid-master-site.chat-open .fid-master-people { display:none; }
  .fid-master-site.chat-open .fid-master-chat { display:flex; }
  .fid-master-back { display:inline-flex; }
  .fid-master-msg { max-width:88%; }
}
```

#### `build-fidelity.cjs`

**Edit 3.5** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
const index = read(__dirname, 'fidelity-index.html');
let lucideIcons = null;
```

Replace them with:

```text
const index = read(__dirname, 'fidelity-index.html');
// The supervisor page is shipped as it is written (master.js); its icons come from the same pool as the app's.
const master = read(__dirname, 'fidelity-master.js');
let lucideIcons = null;
```

**Edit 3.6** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
assert(lucideIcons, 'Unable to load icon definitions');
const names = [...new Set([...(index+js).matchAll(/["']([A-Z][A-Za-z0-9]*)["']/g)].map(m=>m[1]))].filter(n=>Array.isArray(lucideIcons[n]));
const iconJS = 'window.WA_ICONS='+JSON.stringify(Object.fromEntries(names.map(n=>[n,lucideIcons[n]])))+';\n';
```

Replace them with:

```text
assert(lucideIcons, 'Unable to load icon definitions');
const names = [...new Set([...(index+js+master).matchAll(/["']([A-Z][A-Za-z0-9]*)["']/g)].map(m=>m[1]))].filter(n=>Array.isArray(lucideIcons[n]));
const iconJS = 'window.WA_ICONS='+JSON.stringify(Object.fromEntries(names.map(n=>[n,lucideIcons[n]])))+';\n';
```

**Edit 3.7** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
  'tokens.css':tokenCSS,'components.css':read(base,'components.css'),
  'icons.js':iconJS,'boot.js':read(__dirname,'fidelity-boot.js'),'pricefile.js':read(__dirname,'fidelity-pricefile.js'),
  'lucide-license.txt':read(base,'lucide-license.txt'),
```

Replace them with:

```text
  'tokens.css':tokenCSS,'components.css':read(base,'components.css'),
  'icons.js':iconJS,'boot.js':read(__dirname,'fidelity-boot.js'),'master.js':master,'pricefile.js':read(__dirname,'fidelity-pricefile.js'),
  'lucide-license.txt':read(base,'lucide-license.txt'),
```

#### `validate-scrm-lifecycle.cjs`

**Edit 3.8** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
assert(siteSources['site-api.cjs'].includes('process.umask(0o077);') && siteSources['site-admin.cjs'].includes('process.umask(0o077);'), 'the files of the data folder must be created private');
```

Replace them with:

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// The supervisor page: master.js is the built copy of fidelity-master.js and is loaded before boot.js, which hands
// a supervisor or an administrator over to it. The page only reads: the addresses it asks are these, each of a
// sub-site under the sub-site's name, and its one request that is not a GET signs out.
const masterSource = read(path.join(__dirname, 'fidelity-master.js'));
assert.equal(read(path.join(out, 'master.js')), masterSource, 'master.js must be the built copy of fidelity-master.js');
assert(indexHtml.includes('<main id="master" class="fid-master" aria-label="主管视图" hidden></main>') && indexHtml.includes('<script src="app.js"></script><script src="master.js"></script><script src="boot.js"></script>'), 'index.html must hold the supervisor page and load master.js before boot.js');
assert(bootSource.includes("if (user.role !== 'agent') {") && bootSource.includes('return window.WA_MASTER(user);') && !bootSource.includes('主管与管理员入口尚未开放'), 'fidelity-boot.js must hand a supervisor over to the supervisor page');
assert.deepEqual([...new Set(masterSource.match(/'\/api\/[^']*'/g))].sort(), ["'/api/auth/logout'", "'/api/auth/sites'", "'/api/data'", "'/api/data?fields=accounts,customers,tasks'", "'/api/wa/media?account='", "'/api/wa/status'"], 'the supervisor page asks an unexpected address');
assert.deepEqual(masterSource.match(/method: '[A-Z]+'/g), ["method: 'POST'"], 'the supervisor page must send nothing but its sign-out');
assert(masterSource.includes("await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});") && masterSource.includes("const at = (site, path) => '/site/' + encodeURIComponent(site) + path;"), 'the supervisor page must ask each sub-site under its own name');
assert(!/演示|原型|评审|本机|示例|体验/.test(masterSource) && !/WA_SITE|localStorage|sessionStorage/.test(masterSource), 'the supervisor page must not speak of a demonstration, nor touch the app or the browser\'s storage');
for (const required of ["const named = site ? '/site/' + site.siteId : null;", "if (named && pathname.startsWith(named + '/api/')) pathname = pathname.slice(named.length);"]) {
  assert(read(path.join(__dirname, 'serve.cjs')).includes(required), `serve.cjs is missing ${required}`);
}
for (const required of ["'GET /api/auth/sites': req => {", "if (signedIn(req).role === 'agent') throw problem('forbidden');", "if (user.role !== 'agent') console.log(`site data read user=${user.username} role=${user.role} site=${siteId} fields=${fields ? fields.join(',') : 'all'}`);", 'return { body: data.read(fields) };']) {
  assert(siteSources['site-api.cjs'].includes(required), `site-api.cjs is missing ${required}`);
}
assert(siteSources['site-api.cjs'].includes('process.umask(0o077);') && siteSources['site-admin.cjs'].includes('process.umask(0o077);'), 'the files of the data folder must be created private');
```

**Verify**: `sha256sum work/wa-replica/fidelity-master.js work/wa-replica/fidelity-boot.js work/wa-replica/fidelity-index.html work/wa-replica/fidelity.css work/wa-replica/build-fidelity.cjs work/wa-replica/validate-scrm-lifecycle.cjs` → `246fe5824da540c44df79945391e087147109155ebfcecabf63fa0f2e3e725c5`, `55e2962f15309003b4674d8c91823e6c8977a6692f8c3fc588988f5755f47f2f`, `1a68acf55dca4c1526bbb029fd5fd59a67e18e2d2b566cea6eac1f1f0b4a33b3`, `7abcca282807d811429ffbdf08cc97189f39697ef7f02ead6c752f21ef2975f4`, `acc26dee867f0dfadce255b8159f10d3e47eda0db35b381c7b4d226dc1f2e1d8`, `e240390e6a5ab6abce60263031eb9dddeb65808c2aa51a60599e1b999bc60d61`; the syntax command → `SYNTAX_OK`; `git checkout 3d34c82 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84` (a message "Missing prototype source anchor" means a swap does not match the baseline — STOP); `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `sha256sum outputs/wa-replica-prototype/app.css outputs/wa-replica-prototype/boot.js outputs/wa-replica-prototype/index.html outputs/wa-replica-prototype/master.js` → `059226344455f02894a75d3958dc86d4890c5584edcf0b16f18cc0e715f5ffef`, `55e2962f15309003b4674d8c91823e6c8977a6692f8c3fc588988f5755f47f2f`, `1a68acf55dca4c1526bbb029fd5fd59a67e18e2d2b566cea6eac1f1f0b4a33b3`, `246fe5824da540c44df79945391e087147109155ebfcecabf63fa0f2e3e725c5`; `git status --porcelain -- outputs` lists `app.css`, `boot.js`, `index.html`, `validation.json` as changed and `master.js` as new, and nothing else (if `icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). If a checksum does not match, restore the file with `git checkout 3d34c82 -- <file>` (delete it if it is the new file) and apply its instructions again; if it still does not match, STOP.

### Step 4: README, build log, final verification

#### `README.md`

**Edit 4.1** — `README.md`. Find exactly these lines (they occur once):

````text
```
工具只显示一次临时密码，持有人首次登录后必须修改；自己设置的密码至少 8 位。员工登录后进入自己的子站，新子站从空白开始；主管与管理员的查看入口将随主站提供。未设置 `WA_SCRM_DATA_DIR` 时页面只显示「服务器尚未启用账号」。

多个子站可以共用同一个访问地址：每个子站各运行一个服务进程（`WA_SCRM_SITE_ID` 和端口各不相同，`WA_SCRM_DATA_DIR` 相同，账号只有一套），并通过各自的 `WA_SCRM_OPENWA_ENV` 连接自己的 OpenWA。登录时服务器除登录凭证外还会写入名为 `scrm_site` 的 Cookie，记录该员工所属的子站；前面的网关（nginx 或 OpenResty）按这个 Cookie 把 `/api/data` 和 `/api/wa/*` 转发到对应子站的进程，其余请求（页面文件、`/api/auth/*`、`/api/site/status`、`/api/ai/*`）固定交给其中一个进程。这个 Cookie 只决定请求的去向，不代表权限：每个子站都会自行核对登录状态和账号所属的子站。每个子站的 OpenWA 事件通知要送到该子站自己的进程，可在网关上为它单独设置一条转发路径。nginx 的写法如下（两个子站 `default` 与 `site-b`）：

````

Replace them with:

````text
```
工具只显示一次临时密码，持有人首次登录后必须修改；自己设置的密码至少 8 位。员工登录后进入自己的子站，新子站从空白开始。主管与管理员登录后进入「主管视图」：员工总览列出每位员工的 WhatsApp 号码及连接状态、客户数、未读会话数、待跟进数和最近消息时间；点击「查看」可以只读方式查看该员工的客户与会话（含图片、语音、文件和已有译文）。主管视图不能发送消息，也不能修改任何数据；主管或管理员每读取一次子站数据，该子站的服务器都会记录一行日志（谁、哪个子站、读取了哪些内容）。未设置 `WA_SCRM_DATA_DIR` 时页面只显示「服务器尚未启用账号」。

多个子站可以共用同一个访问地址：每个子站各运行一个服务进程（`WA_SCRM_SITE_ID` 和端口各不相同，`WA_SCRM_DATA_DIR` 相同，账号只有一套），并通过各自的 `WA_SCRM_OPENWA_ENV` 连接自己的 OpenWA。登录时服务器除登录凭证外还会写入名为 `scrm_site` 的 Cookie，记录该员工所属的子站；前面的网关（nginx 或 OpenResty）按这个 Cookie 把 `/api/data` 和 `/api/wa/*` 转发到对应子站的进程，其余请求（页面文件、`/api/auth/*`、`/api/site/status`、`/api/ai/*`）固定交给其中一个进程。这个 Cookie 只决定请求的去向，不代表权限：每个子站都会自行核对登录状态和账号所属的子站。每个子站的进程也用子站自己的名字应答：`/site/<子站编号>/api/…` 等同于该子站的 `/api/…`。主管视图用这种地址同时读取多个子站，各子站的 OpenWA 事件通知也送到 `/site/<子站编号>/api/wa/hook`；网关按路径里的子站编号转发即可。nginx 的写法如下（两个子站 `default` 与 `site-b`）：

````

**Edit 4.2** — `README.md`. Find exactly these lines (they occur once):

```text
}
server {
```

Replace them with:

```text
}
map $scrm_named $scrm_named_node {
    default  127.0.0.1:56141;
    site-b   127.0.0.1:56142;
}
server {
```

**Edit 4.3** — `README.md`. Find exactly these lines (they occur once):

```text
    location /api/wa/ { proxy_pass http://$scrm_node; }
    location = /site/site-b/api/wa/hook { proxy_pass http://127.0.0.1:56142/api/wa/hook; }
}
```

Replace them with:

```text
    location /api/wa/ { proxy_pass http://$scrm_node; }
    location ~ ^/site/(?<scrm_named>[a-z0-9-]+)/api/ { proxy_pass http://$scrm_named_node; }
}
```

**Edit 4.4** — `README.md`. Find exactly these lines (they occur once):

```text
│   │   ├── pricefile.js                               # 价格表文件读取脚本（fidelity-pricefile.js 的构建副本）
│   │   ├── requirements.json                          # 结构化需求与模块评审配置
```

Replace them with:

```text
│   │   ├── pricefile.js                               # 价格表文件读取脚本（fidelity-pricefile.js 的构建副本）
│   │   ├── master.js                                  # 主管视图脚本（fidelity-master.js 的构建副本）
│   │   ├── requirements.json                          # 结构化需求与模块评审配置
```

**Edit 4.5** — `README.md`. Find exactly these lines (they occur once):

```text
│       ├── fidelity-boot.js                           # 页面启动：登录界面、读取子站数据、把修改保存到服务器
│       ├── fidelity-pricelist.js                      # 「价格表」页（上传、预览、搜索）与聊天界面消息框旁的「报价」
```

Replace them with:

```text
│       ├── fidelity-boot.js                           # 页面启动：登录界面、读取子站数据、把修改保存到服务器
│       ├── fidelity-master.js                         # 主管视图：员工总览，以及只读的客户与会话查看
│       ├── fidelity-pricelist.js                      # 「价格表」页（上传、预览、搜索）与聊天界面消息框旁的「报价」
```

#### `replica/build-log.md`

**Append 4.6** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 主管视图：员工总览与只读查看 · 2026-11-23

此前主管与管理员登录后只看到「入口尚未开放」的提示。项目负责人确认了第一版的范围：员工列表加只读的会话查看。

现在：主管或管理员登录后进入「主管视图」。
- 员工总览：每位员工一行，显示 WhatsApp 号码及当前连接状态、客户数、未读会话数、待跟进数（含已逾期数）和最近消息时间；某位员工的工作区暂时读不到时，该行会如实说明。
- 点击「查看」：以只读方式查看这位员工的客户列表（可按姓名或号码搜索）和每位客户的会话，包括图片、语音、视频、文件，以及员工已经得到的译文；同时显示客户的标签、未完成的跟进和备注。
- 主管视图只读取数据：页面不发送消息，不修改任何内容；服务器端原有的限制不变（主管与管理员的保存、发送请求一律被拒绝）。
- 主管或管理员每读取一次子站数据，该子站的服务器记录一行日志：谁、哪个子站、读取了哪些内容。

实现方式：每个子站的进程也用自己的名字应答（`/site/<子站编号>/api/…`），主管视图据此同时读取多个子站；新增 `GET /api/auth/sites`（子站及其员工，仅主管与管理员可用）和 `GET /api/data?fields=…`（只读取指定内容，员工总览只取号码、客户和待办，不取聊天记录）。主管视图是独立的脚本（`master.js`），不启动员工工作台，也不使用浏览器存储。

尚未包含：头像、语音转文字、实时刷新（需要点击「刷新」）、跨员工的汇总报表。部署：服务器文件有变更，合并后需要重启各子站的服务进程，并在网关上加入按路径转发的规则（见 README）。
```

Then verify everything once more:

```bash
git checkout 3d34c82 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-052/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test run ends with `pass 15`, `fail 0`; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `4d4ec7034de5c42fea1a7c08c3d60e94cb78b4d09caab827882346e1277428de`, `60bbd25c14a619d5947b48f837eafe17ec94886758e32d823674e2e38b876922`; `git status --porcelain` lists exactly seventeen paths: `README.md`, `replica/build-log.md`, the ten source files under `work/wa-replica/` (one of them new), and `outputs/wa-replica-prototype/app.css`, `boot.js`, `index.html`, `master.js` (new) and `validation.json`. Commit everything, the two new files included. After the commit `git status --porcelain` must be empty.

## Test plan

- **Sign-in and data tests** (15, one new; the test of the real server is extended): the list of sub-sites — in the order of their names, each with its employees' names, without supervisors and administrators, with the mark of a disabled account — for a supervisor and an administrator, not for an employee, not without sign-in; a read of some fields — the others are left out, a field stored in parts comes back whole, a field that is not there is simply missing — and a malformed question is refused; an employee of another sub-site gets nothing; one log line for each read of a supervisor or an administrator, with the fields, none for the employee's own reads. The real server answers under the name of its sub-site (`/site/default/api/…`: data, status, the WhatsApp link, the relay) and under no other name, and serves no file there.
- **Validator** — `master.js` is the built copy of its source and is loaded before `boot.js`; the start-up file hands a supervisor over; the supervisor page asks only its six addresses, sends nothing but its sign-out, speaks of no demonstration and touches neither the app nor the browser's storage; the server has the name of the sub-site in the path, the list, the log line and the partial read.
- **Smoke** (`/tmp/wa-scrm-plan-052/smoke.sh`) — the same facts on the sources and the built page, the README, the build log, that the app, the icons and the tokens came out unchanged, the syntax of the server files and the tests of the server, the relay and the link.
- The build and the validator do not run the page. **Verified by the reviewer in scripted browser sessions, not by you**: a supervisor signs in and sees the employees with the figures of each one's sub-site, and a sub-site that cannot be read says so; the app is not started and nothing is kept in the browser; an employee's customers open in the order of the latest message, with search, a conversation with its translations, tags, follow-ups and notes, and no way of writing; the page's requests are questions only and the sub-site's data is untouched afterwards; pictures, voice notes and files come through the sub-site's own address, what cannot be had gives way to a note, the marks of sent messages show; refreshing brings what the employee did meanwhile; the phone layout; signing out; an employee gets the app as before and none of the supervisor's answers. With two servers behind a private gateway configured as the README says: both sub-sites side by side with their own figures, one read, neither written to, a supervisor's requests to write refused by the sub-site itself, requests that name a sub-site in their path passed to that sub-site. The sessions of the rest of the product and of the connection still pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 3d34c82 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 14`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 15`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-052/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/site-data.cjs` → `789cec1ffe216809638b48a54e0845656509bdd2f2aaabb914ff3a0871385811`
- [ ] `sha256sum work/wa-replica/site-api.cjs` → `5db2f70a8bb0e6950639782a344ec74f39747573c3400a22d9649cab6e148f76`
- [ ] `sha256sum work/wa-replica/serve.cjs` → `688c9f4fd2c14d97bb566fe7c1525cda3e627494217c7e78e2bbcbe02a67e0f2`
- [ ] `sha256sum work/wa-replica/site-api.test.cjs` → `306871c1168afa708628a10b8c5b54db4624cc810e84a17e31e256779d0bd283`
- [ ] `sha256sum work/wa-replica/fidelity-boot.js` → `55e2962f15309003b4674d8c91823e6c8977a6692f8c3fc588988f5755f47f2f`
- [ ] `sha256sum work/wa-replica/fidelity-index.html` → `1a68acf55dca4c1526bbb029fd5fd59a67e18e2d2b566cea6eac1f1f0b4a33b3`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `7abcca282807d811429ffbdf08cc97189f39697ef7f02ead6c752f21ef2975f4`
- [ ] `sha256sum work/wa-replica/build-fidelity.cjs` → `acc26dee867f0dfadce255b8159f10d3e47eda0db35b381c7b4d226dc1f2e1d8`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `e240390e6a5ab6abce60263031eb9dddeb65808c2aa51a60599e1b999bc60d61`
- [ ] `sha256sum README.md` → `4d4ec7034de5c42fea1a7c08c3d60e94cb78b4d09caab827882346e1277428de`
- [ ] `sha256sum work/wa-replica/fidelity-master.js` → `246fe5824da540c44df79945391e087147109155ebfcecabf63fa0f2e3e725c5`
- [ ] `sha256sum replica/build-log.md` → `60bbd25c14a619d5947b48f837eafe17ec94886758e32d823674e2e38b876922`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `059226344455f02894a75d3958dc86d4890c5584edcf0b16f18cc0e715f5ffef`
- [ ] `sha256sum outputs/wa-replica-prototype/boot.js` → `55e2962f15309003b4674d8c91823e6c8977a6692f8c3fc588988f5755f47f2f`
- [ ] `sha256sum outputs/wa-replica-prototype/index.html` → `1a68acf55dca4c1526bbb029fd5fd59a67e18e2d2b566cea6eac1f1f0b4a33b3`
- [ ] `sha256sum outputs/wa-replica-prototype/master.js` → `246fe5824da540c44df79945391e087147109155ebfcecabf63fa0f2e3e725c5`
- [ ] `git diff --quiet 3d34c82 -- outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/icons.js outputs/wa-replica-prototype/tokens.css` exits 0 (the app, the icon file and the tokens are unchanged)
- [ ] `git diff --name-only 3d34c82..HEAD -- . ':!plans'` lists exactly these seventeen: `README.md`, `outputs/wa-replica-prototype/app.css`, `outputs/wa-replica-prototype/boot.js`, `outputs/wa-replica-prototype/index.html`, `outputs/wa-replica-prototype/master.js`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/build-fidelity.cjs`, `work/wa-replica/fidelity-boot.js`, `work/wa-replica/fidelity-index.html`, `work/wa-replica/fidelity-master.js`, `work/wa-replica/fidelity.css`, `work/wa-replica/serve.cjs`, `work/wa-replica/site-api.cjs`, `work/wa-replica/site-api.test.cjs`, `work/wa-replica/site-data.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum, the new file exists already).
- The lines to find do not occur exactly once in their file.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build stops with "Missing prototype source anchor" or another assertion, reports another number of icons than 84, a test fails, or the validator fails.
- An output file other than `app.css`, `boot.js`, `index.html`, `master.js` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file.

## Maintenance notes

- **Deployment**: `serve.cjs`, `site-api.cjs` and `site-data.cjs` are loaded when a server starts — **every sub-site's server must be restarted once after the merge**, and the gateway needs the rule for a sub-site named in the path (README). With one server and no gateway the page works as it is: the server answers under its own sub-site's name. A supervisor's account is made with `site-admin.cjs user add <username> supervisor <display name>`.
- The supervisor page shows a message the way the app does — which kinds have media, the words that stand for media, the marks of a sent message — in its own, simpler copy (`SHOWN`, `WORDS`, `mark` in `fidelity-master.js`; the app's are in `fidelity-openwa.js`). A change of one should be looked at for the other.
- The page reads a sub-site's whole data when an employee is opened, as the employee's own page does at its start. When conversations grow large, reading one customer's conversation at a time is the next step; the partial read of this plan (`?fields=`) is by top-level field only.
- The log line is the record of who looked at whose data. Looking at pictures and files (`/api/wa/media`) leaves no line of its own.
- Not built yet, by decision: profile pictures, voice notes as text, refreshing by itself, figures across employees, any writing by a supervisor (reassigning customers, comments).
- What a reviewer should scrutinise: that the page cannot write and the app is not started for a supervisor; that an employee gets none of the supervisor's answers; that the path with a sub-site's name gives nothing the plain path would not give.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
