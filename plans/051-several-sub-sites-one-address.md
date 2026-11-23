# Plan 051: Several sub-sites share one address

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 960c016..HEAD -- work/wa-replica replica/build-log.md outputs README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM (sign-in is touched: a mistake locks everyone out or sends an employee to the wrong sub-site; exact text and checksums for every edit; nothing of the page changes)
- **Depends on**: plans/050-password-of-eight.md (DONE)
- **Category**: feature (owner request; first step of the set-up with several sub-sites)
- **Planned at**: commit `960c016`, 2026-11-23

## Why this matters

The owner asked on 2026-11-23 for an account for one more employee and, asked which kind, chose: an employee with their own WhatsApp number — that is a second sub-site, with its own data and its own OpenWA.

Today that cannot work. One server process serves one sub-site (`WA_SCRM_SITE_ID`), the address the employees open has that one process behind it, and an employee of another sub-site who signs in there is told "无法进入这个子站". The accounts already say which sub-site an employee belongs to, and the WhatsApp link already keeps its files and its OpenWA sessions apart by sub-site; what is missing is a way for a gateway in front of several servers to know where a request belongs.

What this plan does:

- **Signing in names the employee's sub-site in a second cookie**, `scrm_site`. A gateway (nginx today, OpenResty later) passes the requests for a sub-site's data (`/api/data`) and WhatsApp link (`/api/wa/*`) to the server of the sub-site the cookie names, and everything else — the page, sign-in, the model relay — to one fixed server. Signing out takes the cookie away. When the page opens it asks who is signed in; if an employee's request does not name their sub-site (the cookie is gone, or is left from another account), that answer gives it again, so the data request that follows goes to the right place.
- **The cookie grants nothing.** Every server checks the session and the account's sub-site itself, as today. Someone who changes the cookie reaches another sub-site's server and is refused there.
- **The accounts wait.** The servers of all sub-sites use one account file. A write to it now waits (up to five seconds) for a write of another process that is under way, instead of failing at once.

### Decisions already made (do not re-open; do not ask)

- The cookie: name `scrm_site`, value the sub-site's id, `Path=/; HttpOnly; SameSite=Lax`, thirty days (the longest a session lasts), `Secure` under the same conditions as the session cookie.
- It is set for an employee (role `agent`) at sign-in; for a supervisor or an administrator the sign-in takes it away — which sub-site they look at will be their own choice in the supervisor view that is still to come — and the question who is signed in leaves theirs as it is.
- The gateway's configuration is not part of the repository's code; the README shows it.
- Only the account file gets the waiting. The store of translations is shared as well, but a write that fails there is by design only a saving that is lost.
- Nothing of the page changes.
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/site-api.cjs` | `f32cb3aacb8b7af101baae0445cc194a693441d73a328c8949f6e01ff188213d` | `c7dc5347cf4d88173641a271208bc12350f45346a7da7743c22f6fa94343e21e` |
| `work/wa-replica/site-auth.cjs` | `7bbdbcba74c43fccbb43885f27be2afd7b22f70f6cc8fa40b2503bc082501dd4` | `d74d4a4bb6f291bfe0d94944d8e5e4a7144694215283cde54be2e102207e3ba0` |
| `work/wa-replica/site-api.test.cjs` | `4ab24be4f7cf5889b4b78fe3f7f073a0f51bc9fcf920d5e1f3ea0d474d1eff81` | `b1fae66f5de395c42cbad101d038a4497c89f7b0ad148dd7bfad672c697f2bd4` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `fa09a7d33e1c0fadde8414f4b70378489742c6a64eae09d47e3070ab831fc758` | `e9775d5a710a6df947004f7ce2d77714114433ba83c48026438a3c0c75519cde` |
| `README.md` | `dc58699c624cb3111f06d813412cfb722c4cfc8dc8cd0b9d8c89c9a2da4155ac` | `746243433700a527a178330cdce28d204d3c061295b03629de0a80c92dcc0d86` |

- `site-api.cjs` — the sign-in and data routes of one sub-site. `cookieToken(req)` reads the session cookie `scrm_sid`; `cookieHeader(req, token, maxAgeSeconds)` makes its `Set-Cookie` line; `POST /api/auth/login` and `POST /api/auth/logout` send it; `GET /api/auth/session` answers `{ user, site }` and is what the page asks first when it opens. `sendJson` hands the headers of a route to `res.writeHead`, which takes a list for `Set-Cookie`.
- `site-auth.cjs` — the accounts and sessions, in the file `auth.db` of the data folder (built-in SQLite, WAL mode). No waiting is set, so a write fails at once when another process is writing.
- `site-api.test.cjs` — the tests of sign-in and data (13). `call(pathname, options)` returns `{ status, setCookie, retryAfter, raw, json }`; `cookieOf(response)` takes the first cookie of an answer, which stays the session cookie. Accounts made by earlier tests and used by the new one: `gus` (employee of `s1`, whose data has `note: 'mine'`), `ivo` (supervisor), both with the password `PASSWORD`.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page; a block is added.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). This plan changes no source of the page: after the build, only `validation.json` (written by the validator) differs.

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 960c016 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 14`, `fail 0` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 14`, `fail 0` (the new test holds the account file for a moment; allow two seconds more) |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (they send a 16 MB file twice; allow a few seconds) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-051/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/site-api.cjs`, `site-auth.cjs`, `site-api.test.cjs` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `README.md`, `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular `serve.cjs`, `site-data.cjs`, `site-admin.cjs`, `openwa-link.cjs`, `ai-relay.cjs`, every page module and style sheet (`fidelity-*.js`, `fidelity*.css`, `fidelity-index.html`), everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`. Do not install, start or configure a web server or a gateway: the README text is all this plan says about one.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/051-several-sub-sites-one-address` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): let several sub-sites share one address`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. One block of the README contains a fenced block of its own; its outer fence is therefore four backticks long, and a block ends only at a line that equals its opening run of backticks. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the five files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-051/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-051 && cat > /tmp/wa-scrm-plan-051/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that several sub-sites can share one address: signing in names the employee's sub-site, the accounts wait.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the sign-in and data tests pass, with the one for several sub-sites' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
has 'the cookie that names the sub-site has its name' "$W/site-api.cjs" "const SITE_COOKIE = 'scrm_site';"
has 'signing in names the sub-site' "$W/site-api.cjs" "return { body: { user }, headers: { 'Set-Cookie': [cookieHeader(req, token, 30 * 24 * 60 * 60), siteCookie(req, user)] } };"
has 'signing out takes the name away' "$W/site-api.cjs" "return { body: { ok: true }, headers: { 'Set-Cookie': [cookieHeader(req, '', 0), siteCookie(req, null)] } };"
has 'asking who is signed in gives it again' "$W/site-api.cjs" "const named = user?.role !== 'agent' || cookieValue(req, SITE_COOKIE) === user.site;"
has 'the accounts wait for another server' "$W/site-auth.cjs" 'PRAGMA busy_timeout = 5000;'
has 'the README says how several sub-sites share an address' "$ROOT/README.md" 'map $cookie_scrm_site $scrm_node {'
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 多个子站共用一个访问地址'
same 'nothing of the page changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vc 'validation.json$')" 0
same 'the two server files pass the syntax check' "$(node --check "$W/site-api.cjs" 2>&1 && node --check "$W/site-auth.cjs" 2>&1 && echo SYNTAX_OK)" SYNTAX_OK
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-051/smoke.sh && ls -l /tmp/wa-scrm-plan-051/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/site-api.cjs work/wa-replica/site-auth.cjs work/wa-replica/site-api.test.cjs work/wa-replica/validate-scrm-lifecycle.cjs README.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-051/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the sign-in and data tests pass, with the one for several sub-sites` (got: ℹ pass 13 ℹ fail 0 ), `the cookie that names the sub-site has its name`, `signing in names the sub-site`, `signing out takes the name away`, `asking who is signed in gives it again`, `the accounts wait for another server`, `the README says how several sub-sites share an address` and `the build log has the entry` (eight checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: Signing in names the sub-site; the accounts wait

#### `site-api.cjs`

**Edit 2.1** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
//   GET  /api/site/status    is the sub-site's server side switched on?
//   POST /api/auth/login     { username, password } → session cookie
//   POST /api/auth/logout
```

Replace them with:

```text
//   GET  /api/site/status    is the sub-site's server side switched on?
//   POST /api/auth/login     { username, password } → session cookie, and the cookie that names the sub-site
//   POST /api/auth/logout
```

**Edit 2.2** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
// A log line carries the action, the user name and the outcome; never a password, a token or data.
const path = require('node:path');
```

Replace them with:

```text
// A log line carries the action, the user name and the outcome; never a password, a token or data.
//
// Several sub-sites can share one address. Each runs this server with its own WA_SCRM_SITE_ID on the same data
// folder — there is one set of accounts — and a gateway in front of them passes the requests for a sub-site's
// data (/api/data) and WhatsApp link (/api/wa/*) to the sub-site that the cookie scrm_site names; everything
// else can be answered by any of them. That cookie only says where a request goes: it grants nothing, every
// sub-site checks the session and the account's sub-site itself.
const path = require('node:path');
```

**Edit 2.3** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
const COOKIE = 'scrm_sid';
const MAX_BODY = 8 * 1024 * 1024;
```

Replace them with:

```text
const COOKIE = 'scrm_sid';
const SITE_COOKIE = 'scrm_site';
const MAX_BODY = 8 * 1024 * 1024;
```

**Edit 2.4** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text

function cookieToken(req) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0 && part.slice(0, at).trim() === COOKIE) return part.slice(at + 1).trim();
  }
```

Replace them with:

```text

function cookieValue(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0 && part.slice(0, at).trim() === name) return part.slice(at + 1).trim();
  }
```

**Edit 2.5** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
}

// The cookie is marked Secure when the request came in over HTTPS, or when WA_SCRM_COOKIE_SECURE=1.
function cookieHeader(req, token, maxAgeSeconds) {
  const secure = process.env.WA_SCRM_COOKIE_SECURE === '1' || req.headers['x-forwarded-proto'] === 'https';
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`;
}

```

Replace them with:

```text
}
const cookieToken = req => cookieValue(req, COOKIE);

// A cookie is marked Secure when the request came in over HTTPS, or when WA_SCRM_COOKIE_SECURE=1.
function cookieHeader(req, token, maxAgeSeconds, name = COOKIE) {
  const secure = process.env.WA_SCRM_COOKIE_SECURE === '1' || req.headers['x-forwarded-proto'] === 'https';
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`;
}
// The cookie that names an employee's sub-site, for as long as a session lasts at most; anyone else's is taken away.
const siteCookie = (req, user) => (user?.role === 'agent' ? cookieHeader(req, user.site, 30 * 24 * 60 * 60, SITE_COOKIE) : cookieHeader(req, '', 0, SITE_COOKIE));

```

**Edit 2.6** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
        console.log(`site login ok user=${user.username}`);
        return { body: { user }, headers: { 'Set-Cookie': cookieHeader(req, token, 30 * 24 * 60 * 60) } };
      } catch (error) {
```

Replace them with:

```text
        console.log(`site login ok user=${user.username}`);
        return { body: { user }, headers: { 'Set-Cookie': [cookieHeader(req, token, 30 * 24 * 60 * 60), siteCookie(req, user)] } };
      } catch (error) {
```

**Edit 2.7** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
      auth.signOut(cookieToken(req));
      return { body: { ok: true }, headers: { 'Set-Cookie': cookieHeader(req, '', 0) } };
    },
    'GET /api/auth/me': req => ({ body: { user: signedIn(req, { allowPendingPassword: true }), site: siteId } }),
    'GET /api/auth/session': req => ({ body: { user: authenticate(req), site: siteId } }),
    'POST /api/auth/password': async req => {
```

Replace them with:

```text
      auth.signOut(cookieToken(req));
      return { body: { ok: true }, headers: { 'Set-Cookie': [cookieHeader(req, '', 0), siteCookie(req, null)] } };
    },
    'GET /api/auth/me': req => ({ body: { user: signedIn(req, { allowPendingPassword: true }), site: siteId } }),
    'GET /api/auth/session': req => {
      const user = authenticate(req);
      // An employee whose request does not name their sub-site — the cookie is gone, or is another account's —
      // gets it again: the page asks this first, so what it asks next goes to the right sub-site.
      const named = user?.role !== 'agent' || cookieValue(req, SITE_COOKIE) === user.site;
      return { body: { user, site: siteId }, headers: named ? {} : { 'Set-Cookie': siteCookie(req, user) } };
    },
    'POST /api/auth/password': async req => {
```

**Edit 2.8** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text

module.exports = { create, COOKIE };
```

Replace them with:

```text

module.exports = { create, COOKIE, SITE_COOKIE };
```

#### `site-auth.cjs`

**Edit 2.9** — `work/wa-replica/site-auth.cjs`. Find exactly these lines (they occur once):

```text
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
```

Replace them with:

```text
  const db = new DatabaseSync(file);
  // The servers of several sub-sites and the administration tool use this file at the same time: a write waits
  // for another one that is under way instead of failing.
  db.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
```

#### `site-api.test.cjs`

**Edit 2.10** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
  fetch(base + pathname, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) })
    .then(async response => ({ status: response.status, setCookie: response.headers.get('set-cookie') || '', retryAfter: response.headers.get('retry-after'), raw: await response.text() }))
    .then(result => ({ ...result, json: JSON.parse(result.raw) }));
```

Replace them with:

```text
  fetch(base + pathname, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) })
    .then(async response => ({ status: response.status, setCookie: response.headers.get('set-cookie') || '', cookies: response.headers.getSetCookie(), retryAfter: response.headers.get('retry-after'), raw: await response.text() }))
    .then(result => ({ ...result, json: JSON.parse(result.raw) }));
```

**Edit 2.11** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
  assert.deepEqual(ok.json.user, { id: ok.json.user.id, username: 'ana', name: 'Ana', role: 'agent', site: 's1', mustChangePassword: true, disabled: false });
  assert.match(ok.setCookie, /^scrm_sid=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000$/);
  const https = await call('/api/auth/login', { method: 'POST', body: { username: 'ana', password }, headers: { 'X-Forwarded-Proto': 'https' } });
  assert(https.setCookie.endsWith('; Secure'), 'Secure when the request came over HTTPS');
  assert(!ok.raw.includes(password) && !ok.raw.includes('scrypt'));
```

Replace them with:

```text
  assert.deepEqual(ok.json.user, { id: ok.json.user.id, username: 'ana', name: 'Ana', role: 'agent', site: 's1', mustChangePassword: true, disabled: false });
  assert.equal(ok.cookies.length, 2);
  assert.match(ok.cookies[0], /^scrm_sid=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000$/);
  assert.equal(ok.cookies[1], 'scrm_site=s1; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000', 'the second cookie names the employee\'s sub-site');
  const https = await call('/api/auth/login', { method: 'POST', body: { username: 'ana', password }, headers: { 'X-Forwarded-Proto': 'https' } });
  assert(https.cookies.length === 2 && https.cookies.every(cookie => cookie.endsWith('; Secure')), 'Secure when the request came over HTTPS');
  assert(!ok.raw.includes(password) && !ok.raw.includes('scrypt'));
```

**Edit 2.12** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
  const signedOut = await call('/api/auth/logout', { method: 'POST', cookie: out, body: {} });
  assert.match(signedOut.setCookie, /^scrm_sid=; Path=\/; HttpOnly; SameSite=Lax; Max-Age=0$/);
  assert.equal((await call('/api/auth/me', { cookie: out })).status, 401);
```

Replace them with:

```text
  const signedOut = await call('/api/auth/logout', { method: 'POST', cookie: out, body: {} });
  assert.deepEqual(signedOut.cookies, ['scrm_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0', 'scrm_site=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0']);
  assert.equal((await call('/api/auth/me', { cookie: out })).status, 401);
```

**Edit 2.13** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text

test('the log names users and outcomes, never a password, a token or data', () => {
```

Replace them with:

```text

test('several sub-sites on one set of accounts: signing in names the employee\'s sub-site; each sub-site checks the session itself; a write to the accounts waits for another server', async () => {
  // a second sub-site: its own server on the same data folder
  const second = siteApi.create({ dir: path.join(tmp, 'main'), siteId: 's2', now: () => clock });
  const secondServer = http.createServer((req, res) => second.handle(req, res, new URL(req.url, 'http://localhost').pathname));
  await new Promise(resolve => secondServer.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${secondServer.address().port}`;
  const names = site => `scrm_site=${site}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`;
  try {
    // an employee of the second sub-site signs in at the first: the second cookie names their own
    const { password } = await site.auth.createUser({ username: 'nora', role: 'agent', name: 'Nora', site: 's2' });
    const first = await call('/api/auth/login', { method: 'POST', body: { username: 'nora', password } });
    assert.equal(first.cookies[1], names('s2'));
    const nora = cookieOf(first);
    assert.equal((await call('/api/auth/password', { method: 'POST', cookie: nora, body: { current: password, next: PASSWORD } })).status, 200);
    // the session holds at both; the data of a sub-site is for its own employee
    assert.deepEqual([(await call('/api/auth/session', { cookie: nora })).json.site, (await call('/api/auth/session', { cookie: nora, base })).json.site], ['s1', 's2']);
    assert.deepEqual([(await call('/api/data', { cookie: nora })).json, (await call('/api/data', { cookie: nora, base })).json], [{ error: 'forbidden' }, { version: 0, data: {} }]);
    assert.deepEqual((await call('/api/data', { method: 'PUT', cookie: nora, base, body: { baseVersion: 0, set: { note: 'of s2' } } })).json, { version: 1 });
    const gus = cookieOf(await call('/api/auth/login', { method: 'POST', body: { username: 'gus', password: PASSWORD } }));
    assert.deepEqual([(await call('/api/data', { cookie: gus, base })).json, (await call('/api/data', { cookie: gus })).json.data.note], [{ error: 'forbidden' }, 'mine']);
    // a supervisor reads both and writes neither; signing in as one takes the cookie away
    const boss = await call('/api/auth/login', { method: 'POST', body: { username: 'ivo', password: PASSWORD } });
    assert.equal(boss.cookies[1], 'scrm_site=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    assert.deepEqual([(await call('/api/data', { cookie: cookieOf(boss) })).json.data.note, (await call('/api/data', { cookie: cookieOf(boss), base })).json.data.note], ['mine', 'of s2']);
    assert.deepEqual((await call('/api/data', { method: 'PUT', cookie: cookieOf(boss), base, body: { baseVersion: 1, set: { note: 'x' } } })).json, { error: 'read-only' });
    // asking who is signed in gives an employee the cookie again when it is gone or names another sub-site — only then
    const asked = cookie => call('/api/auth/session', { cookie }).then(answer => answer.cookies);
    assert.deepEqual(await asked(nora), [names('s2')]);
    assert.deepEqual(await asked(nora + '; scrm_site=s1'), [names('s2')]);
    assert.deepEqual(await asked(nora + '; scrm_site=s2'), []);
    assert.deepEqual(await asked(cookieOf(boss) + '; scrm_site=s2'), [], 'a supervisor\'s is left as it is');
    assert.deepEqual(await asked('scrm_site=s2'), [], 'nobody is signed in');
    assert.deepEqual((await call('/api/auth/session', { cookie: nora, headers: { 'X-Forwarded-Proto': 'https' } })).cookies, [names('s2') + '; Secure']);
    // signing out at one sub-site ends the session at the other
    assert.equal((await call('/api/auth/logout', { method: 'POST', cookie: nora, base, body: {} })).status, 200);
    assert.equal((await call('/api/auth/me', { cookie: nora })).status, 401);
    // another server (or the administration tool) is in the middle of a write to the accounts: a write here waits for it
    const accounts = path.join(tmp, 'main', 'auth.db');
    const holder = spawn(process.execPath, ['-e', "const { DatabaseSync } = require('node:sqlite'); const db = new DatabaseSync(process.argv[1]); db.exec('BEGIN IMMEDIATE'); console.log('held'); setTimeout(() => { db.exec('COMMIT'); db.close(); }, 1500);", accounts], { stdio: ['ignore', 'pipe', 'ignore'] });
    await new Promise(resolve => holder.stdout.once('data', resolve));
    const probe = new (require('node:sqlite').DatabaseSync)(accounts);
    assert.throws(() => probe.exec('BEGIN IMMEDIATE'), /locked/, 'the other writer holds the file at this moment');
    probe.close();
    assert.equal((await site.auth.createUser({ username: 'waits', role: 'agent', name: 'Waits', site: 's1' })).user.username, 'waits');
    await new Promise(resolve => holder.once('exit', resolve));
  } finally {
    secondServer.closeAllConnections(); secondServer.close(); second.close();
  }
});

test('the log names users and outcomes, never a password, a token or data', () => {
```

**Verify**: `sha256sum work/wa-replica/site-api.cjs work/wa-replica/site-auth.cjs work/wa-replica/site-api.test.cjs` → `c7dc5347cf4d88173641a271208bc12350f45346a7da7743c22f6fa94343e21e`, `d74d4a4bb6f291bfe0d94944d8e5e4a7144694215283cde54be2e102207e3ba0`, `b1fae66f5de395c42cbad101d038a4497c89f7b0ad148dd7bfad672c697f2bd4`; `node --check work/wa-replica/site-api.cjs` and `node --check work/wa-replica/site-auth.cjs` exit 0; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 14`, `fail 0`. If a checksum does not match, restore the file with `git checkout 960c016 -- <file>` and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 3: The validator holds the facts; the page comes out unchanged

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(siteSources['site-api.cjs'].includes('process.umask(0o077);') && siteSources['site-admin.cjs'].includes('process.umask(0o077);'), 'the files of the data folder must be created private');

```

Replace them with:

```text
assert(siteSources['site-api.cjs'].includes('process.umask(0o077);') && siteSources['site-admin.cjs'].includes('process.umask(0o077);'), 'the files of the data folder must be created private');
// Several sub-sites behind one address: signing in names the employee's sub-site in a second cookie, signing out
// takes it away, asking who is signed in gives it again; the accounts wait for another server's write.
for (const required of ["const SITE_COOKIE = 'scrm_site';", "return { body: { user }, headers: { 'Set-Cookie': [cookieHeader(req, token, 30 * 24 * 60 * 60), siteCookie(req, user)] } };", "return { body: { ok: true }, headers: { 'Set-Cookie': [cookieHeader(req, '', 0), siteCookie(req, null)] } };", "const named = user?.role !== 'agent' || cookieValue(req, SITE_COOKIE) === user.site;"]) {
  assert(siteSources['site-api.cjs'].includes(required), `site-api.cjs is missing ${required}`);
}
assert(siteSources['site-auth.cjs'].includes('PRAGMA busy_timeout = 5000;'), 'the accounts must wait for another server that is writing');

```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `e9775d5a710a6df947004f7ce2d77714114433ba83c48026438a3c0c75519cde`; `git checkout 960c016 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `outputs/wa-replica-prototype/validation.json` and nothing else (if `icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). If the checksum does not match, restore the file with `git checkout 960c016 -- <file>` and apply its instructions again; if it still does not match, or another output file changed, STOP.

### Step 4: README, build log, final verification

#### `README.md`

**Edit 4.1** — `README.md`. Find exactly these lines (they occur once):

```text

如果在服务前面放置反向代理（nginx、OpenResty 等），代理允许的请求体大小必须不低于 8 MB（例如 nginx 的 `client_max_body_size 10m;`）：页面把较大的修改拆成多次请求保存，但单个数据项最大 2 MB，服务本身一次请求最多接收 8 MB。上限过低时页面会提示「修改未能保存：内容超过服务器允许的大小」。
```

Replace them with:

````text

多个子站可以共用同一个访问地址：每个子站各运行一个服务进程（`WA_SCRM_SITE_ID` 和端口各不相同，`WA_SCRM_DATA_DIR` 相同，账号只有一套），并通过各自的 `WA_SCRM_OPENWA_ENV` 连接自己的 OpenWA。登录时服务器除登录凭证外还会写入名为 `scrm_site` 的 Cookie，记录该员工所属的子站；前面的网关（nginx 或 OpenResty）按这个 Cookie 把 `/api/data` 和 `/api/wa/*` 转发到对应子站的进程，其余请求（页面文件、`/api/auth/*`、`/api/site/status`、`/api/ai/*`）固定交给其中一个进程。这个 Cookie 只决定请求的去向，不代表权限：每个子站都会自行核对登录状态和账号所属的子站。每个子站的 OpenWA 事件通知要送到该子站自己的进程，可在网关上为它单独设置一条转发路径。nginx 的写法如下（两个子站 `default` 与 `site-b`）：

```nginx
map $cookie_scrm_site $scrm_node {
    default  127.0.0.1:56141;
    site-b   127.0.0.1:56142;
}
server {
    listen 8141;
    client_max_body_size 20m;
    location / { proxy_pass http://127.0.0.1:56141; }
    location = /api/data { proxy_pass http://$scrm_node; }
    location /api/wa/ { proxy_pass http://$scrm_node; }
    location = /site/site-b/api/wa/hook { proxy_pass http://127.0.0.1:56142/api/wa/hook; }
}
```

如果在服务前面放置反向代理（nginx、OpenResty 等），代理允许的请求体大小必须不低于 8 MB（例如 nginx 的 `client_max_body_size 10m;`）：页面把较大的修改拆成多次请求保存，但单个数据项最大 2 MB，服务本身一次请求最多接收 8 MB。上限过低时页面会提示「修改未能保存：内容超过服务器允许的大小」。
````

#### `replica/build-log.md`

**Append 4.2** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 多个子站共用一个访问地址 · 2026-11-23

此前一个服务进程只负责一个子站，访问地址后面也只有这一个进程，所以只能有一个子站。项目负责人要求为新同事开设带独立 WhatsApp 号码的账号，即第二个子站。

现在：员工登录时，服务器除登录凭证外还会写入名为 `scrm_site` 的 Cookie，记录该员工所属的子站；退出登录时清除；页面打开时如果发现这个 Cookie 丢失或与账号不符，会重新写入。网关按这个 Cookie 把子站数据（`/api/data`）和 WhatsApp 连接（`/api/wa/*`）的请求转发到对应子站的进程，其余请求固定交给其中一个进程。这个 Cookie 只决定请求的去向：每个子站仍自行核对登录状态和账号所属的子站，改动它不能读到别的子站的数据。主管与管理员登录时不写入这个 Cookie。

多个进程共用同一份账号文件，因此账号文件的写入改为等待（最多 5 秒）另一个进程正在进行的写入，而不是直接失败。

页面文件没有变化。部署：服务器文件有变更，合并后需要重启一次预览服务；增加子站时还需要在网关上添加对应的转发规则（见 README）。
```

Then verify everything once more:

```bash
git checkout 960c016 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-051/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test run ends with `pass 14`, `fail 0`; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `746243433700a527a178330cdce28d204d3c061295b03629de0a80c92dcc0d86`, `360c743330e14f07f911227739526ac5535666035dc80feec19ce0542b4f235e`; `git status --porcelain` lists exactly seven paths: `README.md`, `replica/build-log.md`, the four source files under `work/wa-replica/`, and `outputs/wa-replica-prototype/validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Sign-in and data tests** (14, one new; three assertions of two existing tests now look at both cookies): signing in sends the session cookie and, second, the cookie that names the employee's sub-site, both `Secure` over HTTPS; signing out takes both away. The new test runs a second sub-site's server on the same data folder: an employee of the second signs in at the first and is named for their own; the session holds at both; each sub-site gives its data to its own employee only; a supervisor reads both, writes neither, and signing in as one takes the cookie away; the question who is signed in gives an employee the cookie again when it is gone or names another sub-site, and only then — not when it is right, not for a supervisor, not when nobody is signed in; signing out at one sub-site ends the session at the other; while another process holds the account file in the middle of a write, a write here waits and succeeds.
- **Validator** — the route file names the cookie, sets it with the session cookie, takes it away at sign-out and gives it again; the account file waits.
- **Smoke** (`/tmp/wa-scrm-plan-051/smoke.sh`) — the same facts on the sources, the README, the build log, that nothing of the page changed, the syntax of the two files and the tests of the server, the relay and the link.
- **Verified by the reviewer, not by you** — with two servers of this repository on one data folder behind a private gateway configured as the README says, in scripted browser sessions: an employee of the second sub-site signs in at the shared address, sets their password and works in their own, empty sub-site; the gateway passed every data and WhatsApp-link request to their server and everything else to the first; the employee of the first sub-site works beside them and a save of one never reaches the other; with the cookie removed, or changed to the other sub-site, the page finds its own sub-site again, and a request that names another sub-site is refused there; while the second server is down its employee is told, can leave and sign in again later, and the other sub-site goes on; the deliveries of a sub-site's OpenWA reach it by their own path; a supervisor is named for no sub-site; signing out takes both cookies away. The sessions of the rest of the product and of the connection still pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 960c016 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 14`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 14`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-051/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/site-api.cjs` → `c7dc5347cf4d88173641a271208bc12350f45346a7da7743c22f6fa94343e21e`
- [ ] `sha256sum work/wa-replica/site-auth.cjs` → `d74d4a4bb6f291bfe0d94944d8e5e4a7144694215283cde54be2e102207e3ba0`
- [ ] `sha256sum work/wa-replica/site-api.test.cjs` → `b1fae66f5de395c42cbad101d038a4497c89f7b0ad148dd7bfad672c697f2bd4`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `e9775d5a710a6df947004f7ce2d77714114433ba83c48026438a3c0c75519cde`
- [ ] `sha256sum README.md` → `746243433700a527a178330cdce28d204d3c061295b03629de0a80c92dcc0d86`
- [ ] `sha256sum replica/build-log.md` → `360c743330e14f07f911227739526ac5535666035dc80feec19ce0542b4f235e`
- [ ] `git diff --name-only 960c016..HEAD -- outputs` lists `outputs/wa-replica-prototype/validation.json` and nothing else
- [ ] `git diff --name-only 960c016..HEAD -- . ':!plans'` lists exactly these seven: `README.md`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/site-api.cjs`, `work/wa-replica/site-api.test.cjs`, `work/wa-replica/site-auth.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, the build reports another number of icons than 84, or a test fails.
- An output file other than `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file.

## Maintenance notes

- **Deployment**: `site-api.cjs` and `site-auth.cjs` are loaded when the server starts — **the preview service must be restarted once after the merge**. With one server behind the address nothing changes for anyone: the new cookie is set and nothing reads it. A session that began before the restart has no such cookie; the page's first question gives it.
- **Adding a sub-site** is done on the server, not in the repository: one more server process (its own `WA_SCRM_SITE_ID`, port and `WA_SCRM_OPENWA_ENV`; the same `WA_SCRM_DATA_DIR`), its own OpenWA, the gateway rules of the README, and an account made with `WA_SCRM_SITE_ID=<id> … site-admin.cjs user add`. An employee whose sub-site has no server behind the gateway is told "无法进入这个子站".
- Wrong sign-in attempts are counted in the memory of the process that receives them. With the gateway of the README every sign-in goes to the same process, so there is one count; a gateway that spreads sign-ins over several processes would multiply it.
- The page learns its sub-site's id (`WA_SITE.site`) from the process that answers its first question — with the gateway of the README that is the first sub-site's. The app does not use the value today; the supervisor view that is to come should take it from the data answer instead.
- Each sub-site's server must be the same version of the page and the routes while they share an address: the page comes from one of them and talks to another.
- What a reviewer should scrutinise: that signing in, signing out and a temporary password work exactly as before with one server; that no route trusts the cookie; that the account file is never left locked.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
