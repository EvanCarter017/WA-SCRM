# Plan 053: Three points taken in after the supervisor page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat bf11600..HEAD -- work/wa-replica replica/build-log.md outputs README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (three small corrections with their tests; exact text and checksums for every edit)
- **Depends on**: plans/052-supervisor-page.md (DONE)
- **Category**: bug fix (found in review)
- **Planned at**: commit `bf11600`, 2026-11-23

## Why this matters

After plan 052 (the supervisor page) a second reader, given only the code, looked for ways an employee or an outsider could read more than before, for injected script or log lines, and for any writing by the page. None was found. Three smaller points were, each with a way it goes wrong:

1. **The name in the path is wider than it needs to be.** A sub-site's server answers `/site/<its id>/api/…` as `/api/…` — for every route, signing in included. Wrong attempts to sign in are counted in the memory of the process that receives them (five, then a lock of five minutes). Behind a gateway that passes `/site/<id>/api/…` to each sub-site's own server, someone guessing a password would get five attempts at every sub-site's server instead of five in all. The supervisor page and the deliveries of a sub-site's OpenWA need only the data and the WhatsApp link under the name.
2. **One sub-site's odd data stops the supervisor page for all.** The server stores whatever an employee's page saves under a valid key. If a sub-site's list of follow-ups holds an entry that is no record (`tasks: [null]`), the page's reckoning for that row throws, and the whole list of employees stays at "正在读取…" — for every sub-site, also after "刷新".
3. **A part named like something every object has disturbs the server** (this one is older than plan 052). When the data is read, a part `constructor/keys` is put into the document with `(data[field] ??= {})[id] = …`. A plain object already has `constructor` — it is `Object` itself — so the line sets `Object.keys` in the server's process, and from then on every save of that sub-site fails until the row is taken out by hand. Only the sub-site's own employee can save such a part.

What this plan does:

- **`serve.cjs`**: under its name a sub-site's server answers `/api/data` and `/api/wa/…` only.
- **`fidelity-master.js`** (the supervisor page): what a sub-site saved is taken where it has the expected shape — lists that are lists, entries that are records, times that are numbers — and left out where it has not; a sub-site whose figures still cannot be reckoned is listed like one that cannot be read, and a part of a conversation view that cannot be drawn says so in its place. The colour of a customer's initials is one word of the style sheet, whatever was saved. The note of the read-only view says exactly what is logged: who opens an employee's workspace.
- **`site-data.cjs`**: a field or a part is set as a property of the document's own, whatever it is called.
- The README's gateway rule passes only the data and the WhatsApp link by a sub-site's name.

### Decisions already made (do not re-open; do not ask)

- Signing in, the status and the model relay keep their plain addresses only.
- Odd entries are left out silently; the supervisor page does not report or repair them.
- Looking at a picture or a file leaves no log line of its own; the note of the page is brought in line with that.
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/serve.cjs` | `688c9f4fd2c14d97bb566fe7c1525cda3e627494217c7e78e2bbcbe02a67e0f2` | `120565ff4eebaa07004110b10b2a73a3a639c785ab8c13c9b4dbc82df54603b5` |
| `work/wa-replica/site-data.cjs` | `789cec1ffe216809638b48a54e0845656509bdd2f2aaabb914ff3a0871385811` | `8448fb4a6e625569b2911c15e6c704b773d617de079ab26aa13d5929a7ff231c` |
| `work/wa-replica/site-api.test.cjs` | `306871c1168afa708628a10b8c5b54db4624cc810e84a17e31e256779d0bd283` | `45724ea33936af4abe304380a59c3f27a703692601fe58ff00cff6cbe3995dd3` |
| `work/wa-replica/fidelity-master.js` | `246fe5824da540c44df79945391e087147109155ebfcecabf63fa0f2e3e725c5` | `dbb7b94ca9f72e494b5943e6e4d8481d3206d566cdea555a00c325c3a4ba624b` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `e240390e6a5ab6abce60263031eb9dddeb65808c2aa51a60599e1b999bc60d61` | `4a3f9d9a308cf49dda624d85fc562b9bce29ec2dff777bb6321b68717140e4f4` |
| `README.md` | `4d4ec7034de5c42fea1a7c08c3d60e94cb78b4d09caab827882346e1277428de` | `652ad050c57b92fbd55caf169329c2a537307d53e35a53e714d22088100aba5d` |

- `serve.cjs` — the server; `named` is `/site/<the sub-site's id>`, and a path that begins with `named + '/api/'` loses that beginning before the routes are looked up.
- `site-data.cjs` — the store of one sub-site's data; `read(fields)` builds the document from the rows of the table `doc`: a key is a field (`customers`) or a part of a field (`messages/c4`); a key matches `KEY`, so a field's name begins with a letter and a part's name may be any of `A-Za-z0-9_.-`.
- `site-api.test.cjs` — the tests of sign-in and data (15). The test of the supervisor page's questions uses the accounts `gus` (employee of `s1`) and `ivo` (supervisor); the last test starts the real server for a sub-site `default` with the employee `lia`.
- `fidelity-master.js` (shipped as `master.js`) — the supervisor page. `figures(entry)` and `numbers(entry)` reckon a row of the list from a sub-site's `accounts`, `customers` and `tasks`; `peopleHTML()` and `chatHTML()` draw one employee's customers and a conversation.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page; two assertions are added and one is changed.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout bf11600 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Syntax of the supervisor page | `node -e "new (require('vm').Script)(require('fs').readFileSync('work/wa-replica/fidelity-master.js','utf8'));console.log('SYNTAX_OK')"` | `SYNTAX_OK` |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 14`, `fail 0` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 15`, `fail 0` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (they send a 16 MB file twice; allow a few seconds) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-053/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/serve.cjs`, `site-data.cjs`, `site-api.test.cjs` (Step 2)
- `work/wa-replica/fidelity-master.js`, `validate-scrm-lifecycle.cjs` (Step 3)
- `README.md`, `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{master.js,validation.json}` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular `site-api.cjs`, `site-auth.cjs`, `site-admin.cjs`, `openwa-link.cjs`, `ai-relay.cjs`, `fidelity-boot.js`, the modules of the app, the style sheets, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`. Do not install, start or configure a web server or a gateway.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/053-after-the-supervisor-page` first.
- One commit is fine. Conventional commit message, e.g. `fix(scrm): narrow the named path, steady the supervisor page and the reading of odd names`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block whose text has a fence of its own is opened and closed with four backticks; a block ends only at a line that equals its opening run of backticks. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the six files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-053/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-053 && cat > /tmp/wa-scrm-plan-053/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks the three points taken in after the supervisor page: the name in the path, odd data, names every object has.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 15 ℹ fail 0 '
has 'the tests save a part named like something every object has' "$W/site-api.test.cjs" "'constructor/keys': 1"
has 'under its name a sub-site gives its data and its WhatsApp link only' "$W/serve.cjs" "if (named && (pathname === named + '/api/data' || pathname.startsWith(named + '/api/wa/'))) pathname = pathname.slice(named.length);"
same 'the wide form of the name in the path is gone' "$(grep -cF "if (named && pathname.startsWith(named + '/api/')) pathname" "$W/serve.cjs")" 0
has 'reading the document sets properties of the document only' "$W/site-data.cjs" 'const own = (target, name, value) => Object.defineProperty(target, name, { value, enumerable: true, writable: true, configurable: true });'
same 'the old way of putting a part into the document is gone' "$(grep -cF '(data[field] ??= {})[id]' "$W/site-data.cjs")" 0
has 'the supervisor page takes only what has the expected shape' "$P/master.js" "const rows = value => (Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : []);"
has 'the colour of the initials is one word' "$P/master.js" "const tone = c => String(c.color || '').replace(/[^a-z]/g, '') || 'jade';"
has 'the note says what is logged' "$P/master.js" '每次打开一位员工的工作区，服务器都会记下是谁在查看'
same 'master.js is the built copy of the supervisor page' "$(cmp -s "$W/fidelity-master.js" "$P/master.js" && echo SAME)" SAME
has 'the README shows the narrower gateway rule' "$ROOT/README.md" 'location ~ ^/site/(?<scrm_named>[a-z0-9-]+)/api/(data$|wa/) { proxy_pass http://$scrm_named_node; }'
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 主管视图上线后的三处加固'
same 'the rest of the page is unchanged' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE 'master.js$|validation.json$')" 0
same 'the server files pass the syntax check' "$(node --check "$W/site-data.cjs" 2>&1 && node --check "$W/serve.cjs" 2>&1 && echo SYNTAX_OK)" SYNTAX_OK
same 'the supervisor page passes the syntax check' "$(cd "$ROOT" && node -e "new (require('vm').Script)(require('fs').readFileSync('work/wa-replica/fidelity-master.js','utf8'));console.log('SYNTAX_OK')" 2>&1)" SYNTAX_OK
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-053/smoke.sh && ls -l /tmp/wa-scrm-plan-053/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/serve.cjs work/wa-replica/site-data.cjs work/wa-replica/site-api.test.cjs work/wa-replica/fidelity-master.js work/wa-replica/validate-scrm-lifecycle.cjs README.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-053/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the tests save a part named like something every object has`, `under its name a sub-site gives its data and its WhatsApp link only`, `the wide form of the name in the path is gone` (got: 1), `reading the document sets properties of the document only`, `the old way of putting a part into the document is gone` (got: 1), `the supervisor page takes only what has the expected shape`, `the colour of the initials is one word`, `the note says what is logged`, `the README shows the narrower gateway rule` and `the build log has the entry` (ten checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The server: the name in the path, and names every object has

#### `serve.cjs`

**Edit 2.1** — `work/wa-replica/serve.cjs`. Find exactly these lines (they occur once):

```text
const waLink = site ? require('./openwa-link.cjs').create({ dir: process.env.WA_SCRM_DATA_DIR, siteId: site.siteId, site }) : null;
// A sub-site's server also answers under the sub-site's name: /site/<id>/api/… is /api/… of the sub-site <id>.
// The supervisor page reads several sub-sites side by side this way, and a gateway in front of several servers
// passes such a request to the right one by its path.
const named = site ? '/site/' + site.siteId : null;
```

Replace them with:

```text
const waLink = site ? require('./openwa-link.cjs').create({ dir: process.env.WA_SCRM_DATA_DIR, siteId: site.siteId, site }) : null;
// A sub-site's server also answers under the sub-site's name, for its data and its WhatsApp link:
// /site/<id>/api/data and /site/<id>/api/wa/… are /api/data and /api/wa/… of the sub-site <id>. The supervisor
// page reads several sub-sites side by side this way, and a gateway in front of several servers passes such a
// request to the right one by its path. Everything else — signing in above all — has the plain address only, so
// that wrong attempts to sign in are counted by one server.
const named = site ? '/site/' + site.siteId : null;
```

**Edit 2.2** — `work/wa-replica/serve.cjs`. Find exactly these lines (they occur once):

```text
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (named && pathname.startsWith(named + '/api/')) pathname = pathname.slice(named.length);
    if (isSiteRoute(pathname)) {
```

Replace them with:

```text
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (named && (pathname === named + '/api/data' || pathname.startsWith(named + '/api/wa/'))) pathname = pathname.slice(named.length);
    if (isSiteRoute(pathname)) {
```

#### `site-data.cjs`

**Edit 2.3** — `work/wa-replica/site-data.cjs`. Find exactly these lines (they occur once):

```text
const problem = (code, extra = {}) => Object.assign(new Error(code), { code, ...extra });

```

Replace them with:

```text
const problem = (code, extra = {}) => Object.assign(new Error(code), { code, ...extra });
// Sets a property of an object's own, whatever it is called: a field or a part can have a name that every object
// has ("constructor") or one that is special ("__proto__"), and must touch nothing but the document.
const own = (target, name, value) => Object.defineProperty(target, name, { value, enumerable: true, writable: true, configurable: true });

```

**Edit 2.4** — `work/wa-replica/site-data.cjs`. Find exactly these lines (they occur once):

```text
      if (fields && !fields.includes(field)) continue;
      if (id === undefined) data[field] = JSON.parse(json);
      else (data[field] ??= {})[id] = JSON.parse(json);
    }
```

Replace them with:

```text
      if (fields && !fields.includes(field)) continue;
      if (id === undefined) own(data, field, JSON.parse(json));
      else {
        if (!Object.hasOwn(data, field)) own(data, field, {});
        if (data[field] && typeof data[field] === 'object') own(data[field], id, JSON.parse(json));
      }
    }
```

#### `site-api.test.cjs`

**Edit 2.5** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
  assert.deepEqual((await call('/api/data?fields=customers', { cookie: await member('olga', 'agent', 's2') })).json, { error: 'forbidden' }, 'not for an employee of another sub-site');
  // the lines: one for each read of a supervisor or an administrator, none for the employee's own
```

Replace them with:

```text
  assert.deepEqual((await call('/api/data?fields=customers', { cookie: await member('olga', 'agent', 's2') })).json, { error: 'forbidden' }, 'not for an employee of another sub-site');
  // a field or a part called like something every object has, or like something special, is a name like any other:
  // it is in the document as it was saved, and reading the document touches nothing else
  const odd = (await call('/api/data', { cookie: gus })).json.version;
  assert.equal((await call('/api/data', { method: 'PUT', cookie: gus, body: { baseVersion: odd, set: { 'constructor/keys': 1, 'messages/__proto__': [{ id: 'odd' }], toString: 'a field' } } })).status, 200);
  const read = (await call('/api/data', { cookie: ivo })).raw;
  for (const part of ['"constructor":{"keys":1}', '"__proto__":[{"id":"odd"}]', '"toString":"a field"']) assert(read.includes(part), part);
  assert.deepEqual([typeof Object.keys, Object.keys({ a: 1 }), {}.id, String({})], ['function', ['a'], undefined, '[object Object]'], 'nothing but the document was touched');
  assert.deepEqual((await call('/api/data?fields=constructor,toString', { cookie: ivo })).json.data, { constructor: { keys: 1 }, toString: 'a field' });
  assert.equal((await call('/api/data', { method: 'PUT', cookie: gus, body: { baseVersion: odd + 1, remove: ['constructor/keys', 'messages/__proto__', 'toString'] } })).status, 200, 'and saving goes on');
  assert.deepEqual(Object.keys((await call('/api/data', { cookie: gus })).json.data.messages), ['c1', 'c2']);
  // the lines: one for each read of a supervisor or an administrator, none for the employee's own
```

**Edit 2.6** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
    assert.deepEqual((await call('/api/data', { base: on.base, cookie: cookieOf(first) })).json, { version: 0, data: {} });
    // the server also answers under the name of its sub-site, and under no other
    assert.deepEqual((await call('/site/default/api/data?fields=customers', { base: on.base, cookie: cookieOf(first) })).json, { version: 0, data: {} });
    assert.deepEqual([(await call('/site/default/api/site/status', { base: on.base })).json, (await call('/site/default/api/data', { base: on.base })).status, (await call('/site/default/api/wa/status', { base: on.base })).status], [{ enabled: true, site: 'default' }, 401, 401]);
    assert.deepEqual((await call('/site/default/api/ai/status', { base: on.base })).json, { error: 'not-signed-in' });
    assert.deepEqual([(await fetch(on.base + '/site/other/api/data', { headers: { Cookie: cookieOf(first) } })).status, (await fetch(on.base + '/site/default/index.html')).status, (await fetch(on.base + '/site/default')).status], [404, 404, 404]);
    for (const name of fs.readdirSync(dir).filter(name => name.startsWith('site-default.db'))) assert.equal(fs.statSync(path.join(dir, name)).mode & 0o077, 0, name + ' is private');
```

Replace them with:

```text
    assert.deepEqual((await call('/api/data', { base: on.base, cookie: cookieOf(first) })).json, { version: 0, data: {} });
    // the server also answers under the name of its sub-site — for its data and its WhatsApp link, nothing else —
    // and under no other name
    assert.deepEqual((await call('/site/default/api/data?fields=customers', { base: on.base, cookie: cookieOf(first) })).json, { version: 0, data: {} });
    assert.deepEqual([(await call('/site/default/api/data', { base: on.base })).status, (await call('/site/default/api/wa/status', { base: on.base })).status, (await call('/site/default/api/wa/status', { base: on.base, cookie: cookieOf(first) })).status], [401, 401, 200]);
    const named = async (pathname, options = {}) => (await fetch(on.base + pathname, { ...options, headers: { Cookie: cookieOf(first), ...options.headers } })).status;
    assert.deepEqual([await named('/site/default/api/site/status'), await named('/site/default/api/auth/session'), await named('/site/default/api/auth/me'), await named('/site/default/api/ai/status'), await named('/site/default/api/data/more'), await named('/site/default/api/wax')], [404, 404, 404, 404, 404, 404], 'signing in, the status and the relay have the plain address only');
    assert.notEqual(await named('/site/default/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'lia', password: PASSWORD }) }), 200, 'nobody signs in under the name of a sub-site');
    assert.deepEqual([await named('/site/other/api/data'), await named('/site/default/index.html'), await named('/site/default')], [404, 404, 404]);
    for (const name of fs.readdirSync(dir).filter(name => name.startsWith('site-default.db'))) assert.equal(fs.statSync(path.join(dir, name)).mode & 0o077, 0, name + ' is private');
```

**Verify**: `sha256sum work/wa-replica/serve.cjs work/wa-replica/site-data.cjs work/wa-replica/site-api.test.cjs` → `120565ff4eebaa07004110b10b2a73a3a639c785ab8c13c9b4dbc82df54603b5`, `8448fb4a6e625569b2911c15e6c704b773d617de079ab26aa13d5929a7ff231c`, `45724ea33936af4abe304380a59c3f27a703692601fe58ff00cff6cbe3995dd3`; `node --check` on `work/wa-replica/serve.cjs` and `site-data.cjs` exits 0; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 15`, `fail 0`. If a checksum does not match, restore the file with `git checkout bf11600 -- <file>` and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 3: The supervisor page takes odd data in its stride

#### `fidelity-master.js`

**Edit 3.1** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
  const at = (site, path) => '/site/' + encodeURIComponent(site) + path;

```

Replace them with:

```text
  const at = (site, path) => '/site/' + encodeURIComponent(site) + path;
  // What a sub-site saved is taken where it has the shape the page expects and left out where it has not: one
  // sub-site's odd data must not stop the page for the others.
  const rows = value => (Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : []);
  const guarded = (make, instead) => { try { return make(); } catch { return instead; } };
  // The colour of a customer's initials is one word of the style sheet, whatever was saved.
  const tone = c => String(c.color || '').replace(/[^a-z]/g, '') || 'jade';

```

**Edit 3.2** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
  const dayWord = at => (dayOf(at) === dayOf(Date.now()) ? '今天' : dayOf(at) === dayOf(Date.now() - 86400000) ? '昨天' : dayOf(at));
  const lastLabel = c => (!c.lastAt ? c.last || '' : dayOf(c.lastAt) === dayOf(Date.now()) ? clock(c.lastAt) : dayOf(c.lastAt) === dayOf(Date.now() - 86400000) ? '昨天' : dayOf(c.lastAt).slice(5));
  const messageDay = m => (m.at ? dayWord(m.at) : String(m.time || '').startsWith('昨天') ? '昨天' : '今天');
  const messageTime = m => (m.at ? clock(m.at) : String(m.time || '').replace('昨天 ', ''));
  // The conversation with the latest message comes first; the others keep their order after them.
  const ordered = list => list.map((c, i) => [c, i]).sort((x, y) => (y[0].lastAt || 0) - (x[0].lastAt || 0) || x[1] - y[1]).map(x => x[0]);

```

Replace them with:

```text
  const dayWord = at => (dayOf(at) === dayOf(Date.now()) ? '今天' : dayOf(at) === dayOf(Date.now() - 86400000) ? '昨天' : dayOf(at));
  // A time that was saved as something else than a number counts as none.
  const time = value => (Number.isFinite(value) ? value : 0);
  const lastLabel = c => (!time(c.lastAt) ? c.last || '' : dayOf(c.lastAt) === dayOf(Date.now()) ? clock(c.lastAt) : dayOf(c.lastAt) === dayOf(Date.now() - 86400000) ? '昨天' : dayOf(c.lastAt).slice(5));
  const messageDay = m => (time(m.at) ? dayWord(m.at) : String(m.time || '').startsWith('昨天') ? '昨天' : '今天');
  const messageTime = m => (time(m.at) ? clock(m.at) : String(m.time || '').replace('昨天 ', ''));
  // The conversation with the latest message comes first; the others keep their order after them.
  const ordered = list => list.map((c, i) => [c, i]).sort((x, y) => time(y[0].lastAt) - time(x[0].lastAt) || x[1] - y[1]).map(x => x[0]);

```

**Edit 3.3** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
  function numbers(entry) {
    return (entry.data.accounts || []).map(account => {
      const live = entry.link?.configured && entry.link.reachable ? entry.link.accounts.find(a => a.account === account.id)?.state : '';
      return { name: account.number || account.name || '', on: live === 'online', text: live ? LINK[live] || '已掉线' : SAVED[account.state === 'online' ? 'reconnect' : account.state] || '待绑定' };
```

Replace them with:

```text
  function numbers(entry) {
    return rows(entry.data.accounts).map(account => {
      const live = entry.link?.configured && entry.link.reachable ? rows(entry.link.accounts).find(a => a.account === account.id)?.state : '';
      return { name: account.number || account.name || '', on: live === 'online', text: live ? LINK[live] || '已掉线' : SAVED[account.state === 'online' ? 'reconnect' : account.state] || '待绑定' };
```

**Edit 3.4** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
  function figures(entry) {
    const customers = entry.data.customers || [], open = (entry.data.tasks || []).filter(task => !task.done);
    return {
```

Replace them with:

```text
  function figures(entry) {
    const customers = rows(entry.data.customers), open = rows(entry.data.tasks).filter(task => !task.done);
    return {
```

**Edit 3.5** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
      late: open.filter(task => Date.parse(task.due) < Date.now()).length,
      last: Math.max(0, ...customers.map(c => c.lastAt || 0)),
    };
```

Replace them with:

```text
      late: open.filter(task => Date.parse(task.due) < Date.now()).length,
      last: Math.max(0, ...customers.map(c => time(c.lastAt))),
    };
```

**Edit 3.6** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
      const [doc, link] = await Promise.all([get(at(entry.site, '/api/data?fields=accounts,customers,tasks')), get(at(entry.site, '/api/wa/status'))]);
      return { ...entry, reached: doc.status === 200, data: doc.status === 200 ? doc.body.data : {}, link: link.status === 200 ? link.body : null };
    }));
```

Replace them with:

```text
      const [doc, link] = await Promise.all([get(at(entry.site, '/api/data?fields=accounts,customers,tasks')), get(at(entry.site, '/api/wa/status'))]);
      return { ...entry, reached: doc.status === 200, data: doc.status === 200 && doc.body.data && typeof doc.body.data === 'object' ? doc.body.data : {}, link: link.status === 200 ? link.body : null };
    }));
```

**Edit 3.7** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    if (!state.sites.length) return '<p class="fid-master-note">还没有员工账号。</p>';
    const rows = state.sites.map(entry => {
      const who = `<strong>${esc(names(entry))}</strong><small>${esc(entry.employees.map(employee => employee.username).join('、'))}</small>`;
      if (!entry.reached) return `<tr><td class="fid-master-who">${who}</td><td colspan="5" class="fid-master-quiet">暂时无法读取这位员工的工作区</td><td></td></tr>`;
      const f = figures(entry), list = numbers(entry);
      return `<tr>
```

Replace them with:

```text
    if (!state.sites.length) return '<p class="fid-master-note">还没有员工账号。</p>';
    const table = state.sites.map(entry => {
      const who = `<strong>${esc(names(entry))}</strong><small>${esc(entry.employees.map(employee => employee.username).join('、'))}</small>`;
      // A sub-site whose saved data cannot be worked with is listed like one that cannot be read.
      const drawn = entry.reached ? guarded(() => ({ f: figures(entry), list: numbers(entry) }), null) : null;
      if (!drawn) return `<tr><td class="fid-master-who">${who}</td><td colspan="5" class="fid-master-quiet">暂时无法读取这位员工的工作区</td><td></td></tr>`;
      const { f, list } = drawn;
      return `<tr>
```

**Edit 3.8** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    }).join('');
    return `<div class="fid-table-scroll" tabindex="0" aria-label="员工总览表格"><table class="fid-table fid-master-table"><thead><tr>${['员工', 'WhatsApp 号码', '客户', '未读会话', '待跟进', '最近消息', '操作'].map(title => `<th scope="col">${title}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
```

Replace them with:

```text
    }).join('');
    return `<div class="fid-table-scroll" tabindex="0" aria-label="员工总览表格"><table class="fid-table fid-master-table"><thead><tr>${['员工', 'WhatsApp 号码', '客户', '未读会话', '待跟进', '最近消息', '操作'].map(title => `<th scope="col">${title}</th>`).join('')}</tr></thead><tbody>${table}</tbody></table></div>`;
  }
```

**Edit 3.9** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
  const matches = c => {
    const words = state.open.query.trim().toLowerCase().split(/\s+/).filter(Boolean), text = (c.name + ' ' + c.phone).toLowerCase(), digits = String(c.phone || '').replace(/\D/g, '');
    return words.every(word => text.includes(word) || (/^\d+$/.test(word) && digits.includes(word)));
```

Replace them with:

```text
  const matches = c => {
    const words = state.open.query.trim().toLowerCase().split(/\s+/).filter(Boolean), text = (c.name + ' ' + c.phone).toLowerCase(), digits = String(c.phone ?? '').replace(/\D/g, '');
    return words.every(word => text.includes(word) || (/^\d+$/.test(word) && digits.includes(word)));
```

**Edit 3.10** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    return list.map(c => `<button type="button" class="fid-master-row ${c.id === state.open.customer ? 'selected' : ''}" data-master="customer" data-id="${esc(c.id)}" aria-label="查看${esc(c.name)}的会话">
      <span class="avatar ${esc(c.color || 'jade')}">${esc(c.initials || [...String(c.name || '')].slice(0, 1).join(''))}</span>
      <span class="fid-master-row-main"><span class="fid-master-row-line"><strong>${esc(c.name)}</strong><time>${esc(lastLabel(c))}</time></span>
```

Replace them with:

```text
    return list.map(c => `<button type="button" class="fid-master-row ${c.id === state.open.customer ? 'selected' : ''}" data-master="customer" data-id="${esc(c.id)}" aria-label="查看${esc(c.name)}的会话">
      <span class="avatar ${tone(c)}">${esc(c.initials || [...String(c.name || '')].slice(0, 1).join(''))}</span>
      <span class="fid-master-row-main"><span class="fid-master-row-line"><strong>${esc(c.name)}</strong><time>${esc(lastLabel(c))}</time></span>
```

**Edit 3.11** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    if (!c) return '<p class="fid-master-note">选择左侧的客户查看会话</p>';
    const number = (data.accounts || []).find(a => a.id === c.account), tags = (c.tags || []).map(id => (data.tags || []).find(tag => tag.id === id)?.name).filter(Boolean);
    const tasks = (data.tasks || []).filter(task => task.customer === c.id && !task.done), list = data.messages?.[c.id] || [];
    let lastDay = '';
```

Replace them with:

```text
    if (!c) return '<p class="fid-master-note">选择左侧的客户查看会话</p>';
    const number = data.accounts.find(a => a.id === c.account), tags = (Array.isArray(c.tags) ? c.tags : []).map(id => data.tags.find(tag => tag.id === id)?.name).filter(Boolean);
    const tasks = data.tasks.filter(task => task.customer === c.id && !task.done), list = rows(data.messages[c.id]);
    let lastDay = '';
```

**Edit 3.12** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    }).join('');
    return `<div class="fid-master-chat-head"><button type="button" class="fid-btn fid-master-back" data-master="people" aria-label="返回客户列表">${icon('ArrowLeft')}</button><span class="avatar ${esc(c.color || 'jade')}">${esc(c.initials || [...String(c.name || '')].slice(0, 1).join(''))}</span><div><h2>${esc(c.name)}</h2><p>${esc([c.phone, number?.name, c.language].filter(Boolean).join(' · '))}</p></div></div>
      <dl class="fid-master-facts">
        <div><dt>标签</dt><dd>${esc(tags.join('、') || '无')}</dd></div>
        <div><dt>待跟进</dt><dd>${tasks.length ? tasks.map(task => esc(task.title) + (task.due ? `（${esc(dayOf(Date.parse(task.due)).slice(5))} 到期${Date.parse(task.due) < Date.now() ? '，已逾期' : ''}）` : '')).join('；') : '无'}</dd></div>
        ${c.notes ? `<div><dt>备注</dt><dd>${esc(c.notes)}</dd></div>` : ''}
```

Replace them with:

```text
    }).join('');
    return `<div class="fid-master-chat-head"><button type="button" class="fid-btn fid-master-back" data-master="people" aria-label="返回客户列表">${icon('ArrowLeft')}</button><span class="avatar ${tone(c)}">${esc(c.initials || [...String(c.name || '')].slice(0, 1).join(''))}</span><div><h2>${esc(c.name)}</h2><p>${esc([c.phone, number?.name, c.language].filter(Boolean).join(' · '))}</p></div></div>
      <dl class="fid-master-facts">
        <div><dt>标签</dt><dd>${esc(tags.join('、') || '无')}</dd></div>
        <div><dt>待跟进</dt><dd>${tasks.length ? tasks.map(task => esc(task.title) + (Number.isFinite(Date.parse(task.due)) ? `（${esc(dayOf(Date.parse(task.due)).slice(5))} 到期${Date.parse(task.due) < Date.now() ? '，已逾期' : ''}）` : '')).join('；') : '无'}</dd></div>
        ${c.notes ? `<div><dt>备注</dt><dd>${esc(c.notes)}</dd></div>` : ''}
```

**Edit 3.13** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    else {
      const data = doc.body.data;
      data.customers ??= [];
      state.open.data = data;
```

Replace them with:

```text
    else {
      // Only what has the expected shape is kept (see rows above).
      const saved = doc.body.data && typeof doc.body.data === 'object' ? doc.body.data : {};
      const data = { accounts: rows(saved.accounts), customers: rows(saved.customers), tasks: rows(saved.tasks), tags: rows(saved.tags), messages: saved.messages && typeof saved.messages === 'object' ? saved.messages : {} };
      state.open.data = data;
```

**Edit 3.14** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    const open = state.open;
    const bar = `<div class="fid-master-bar"><button type="button" class="fid-btn" data-master="list">${icon('ArrowLeft')}返回员工总览</button><h1>${esc(open.name)} 的工作区</h1><span class="fid-master-readonly">${icon('LockKeyhole')}只读</span><button type="button" class="fid-btn" data-master="reload">${icon('RefreshCw')}刷新</button><p>这里只能查看：不能发送消息，也不能修改客户资料。每次查看都会记入服务器日志。</p></div>`;
    if (open.failed) return bar + '<p class="fid-master-note">暂时无法读取这位员工的工作区，请稍后点击「刷新」。</p>';
```

Replace them with:

```text
    const open = state.open;
    const bar = `<div class="fid-master-bar"><button type="button" class="fid-btn" data-master="list">${icon('ArrowLeft')}返回员工总览</button><h1>${esc(open.name)} 的工作区</h1><span class="fid-master-readonly">${icon('LockKeyhole')}只读</span><button type="button" class="fid-btn" data-master="reload">${icon('RefreshCw')}刷新</button><p>这里只能查看：不能发送消息，也不能修改客户资料。每次打开一位员工的工作区，服务器都会记下是谁在查看。</p></div>`;
    if (open.failed) return bar + '<p class="fid-master-note">暂时无法读取这位员工的工作区，请稍后点击「刷新」。</p>';
```

**Edit 3.15** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    return `${bar}<div class="fid-master-site ${open.chat ? 'chat-open' : ''}">
      <aside class="fid-master-people" aria-label="客户列表"><div class="fid-master-search"><input id="master-search" type="search" placeholder="搜索客户姓名或号码" aria-label="搜索客户" value="${esc(open.query)}"></div><div class="fid-master-list" id="master-list">${peopleHTML()}</div></aside>
      <section class="fid-master-chat" id="master-chat">${chatHTML()}</section>
    </div>`;
```

Replace them with:

```text
    return `${bar}<div class="fid-master-site ${open.chat ? 'chat-open' : ''}">
      <aside class="fid-master-people" aria-label="客户列表"><div class="fid-master-search"><input id="master-search" type="search" placeholder="搜索客户姓名或号码" aria-label="搜索客户" value="${esc(open.query)}"></div><div class="fid-master-list" id="master-list">${guarded(peopleHTML, UNSHOWN)}</div></aside>
      <section class="fid-master-chat" id="master-chat">${guarded(chatHTML, UNSHOWN)}</section>
    </div>`;
```

**Edit 3.16** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text

  // ---- the page ----
```

Replace them with:

```text

  // What stands in the place of a part of the page that cannot be drawn from what a sub-site saved.
  const UNSHOWN = '<p class="fid-master-note">这部分内容暂时无法显示</p>';

  // ---- the page ----
```

**Edit 3.17** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
  function showCustomer() {
    $('#master-list').innerHTML = peopleHTML();
    $('#master-chat').innerHTML = chatHTML();
    $('.fid-master-site').classList.toggle('chat-open', state.open.chat);
```

Replace them with:

```text
  function showCustomer() {
    $('#master-list').innerHTML = guarded(peopleHTML, UNSHOWN);
    $('#master-chat').innerHTML = guarded(chatHTML, UNSHOWN);
    $('.fid-master-site').classList.toggle('chat-open', state.open.chat);
```

**Edit 3.18** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
      state.open.query = event.target.value;
      $('#master-list').innerHTML = peopleHTML();
    });
```

Replace them with:

```text
      state.open.query = event.target.value;
      $('#master-list').innerHTML = guarded(peopleHTML, UNSHOWN);
    });
```

#### `validate-scrm-lifecycle.cjs`

**Edit 3.19** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(!/演示|原型|评审|本机|示例|体验/.test(masterSource) && !/WA_SITE|localStorage|sessionStorage/.test(masterSource), 'the supervisor page must not speak of a demonstration, nor touch the app or the browser\'s storage');
for (const required of ["const named = site ? '/site/' + site.siteId : null;", "if (named && pathname.startsWith(named + '/api/')) pathname = pathname.slice(named.length);"]) {
  assert(read(path.join(__dirname, 'serve.cjs')).includes(required), `serve.cjs is missing ${required}`);
```

Replace them with:

```text
assert(!/演示|原型|评审|本机|示例|体验/.test(masterSource) && !/WA_SITE|localStorage|sessionStorage/.test(masterSource), 'the supervisor page must not speak of a demonstration, nor touch the app or the browser\'s storage');
// Under a sub-site's name the server gives its data and its WhatsApp link only; the supervisor page takes what a
// sub-site saved where it has the expected shape; a name every object has touches nothing but the document.
assert(masterSource.includes("const rows = value => (Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : []);") && masterSource.includes('const drawn = entry.reached ? guarded(() => ({ f: figures(entry), list: numbers(entry) }), null) : null;') && !masterSource.includes("esc(c.color"), 'the supervisor page must not be stopped by one sub-site\'s odd data');
assert(siteSources['site-data.cjs'].includes('const own = (target, name, value) => Object.defineProperty(target, name, { value, enumerable: true, writable: true, configurable: true });') && !siteSources['site-data.cjs'].includes('(data[field] ??= {})[id]'), 'reading the document must set nothing but properties of the document');
for (const required of ["const named = site ? '/site/' + site.siteId : null;", "if (named && (pathname === named + '/api/data' || pathname.startsWith(named + '/api/wa/'))) pathname = pathname.slice(named.length);"]) {
  assert(read(path.join(__dirname, 'serve.cjs')).includes(required), `serve.cjs is missing ${required}`);
```

**Verify**: `sha256sum work/wa-replica/fidelity-master.js work/wa-replica/validate-scrm-lifecycle.cjs` → `dbb7b94ca9f72e494b5943e6e4d8481d3206d566cdea555a00c325c3a4ba624b`, `4a3f9d9a308cf49dda624d85fc562b9bce29ec2dff777bb6321b68717140e4f4`; the syntax command → `SYNTAX_OK`; `git checkout bf11600 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `sha256sum outputs/wa-replica-prototype/master.js` → `dbb7b94ca9f72e494b5943e6e4d8481d3206d566cdea555a00c325c3a4ba624b`; `git status --porcelain -- outputs` lists `master.js` and `validation.json` and nothing else (if `icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). If a checksum does not match, restore the file with `git checkout bf11600 -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 4: README, build log, final verification

#### `README.md`

**Edit 4.1** — `README.md`. Find exactly these lines (they occur once):

```text

多个子站可以共用同一个访问地址：每个子站各运行一个服务进程（`WA_SCRM_SITE_ID` 和端口各不相同，`WA_SCRM_DATA_DIR` 相同，账号只有一套），并通过各自的 `WA_SCRM_OPENWA_ENV` 连接自己的 OpenWA。登录时服务器除登录凭证外还会写入名为 `scrm_site` 的 Cookie，记录该员工所属的子站；前面的网关（nginx 或 OpenResty）按这个 Cookie 把 `/api/data` 和 `/api/wa/*` 转发到对应子站的进程，其余请求（页面文件、`/api/auth/*`、`/api/site/status`、`/api/ai/*`）固定交给其中一个进程。这个 Cookie 只决定请求的去向，不代表权限：每个子站都会自行核对登录状态和账号所属的子站。每个子站的进程也用子站自己的名字应答：`/site/<子站编号>/api/…` 等同于该子站的 `/api/…`。主管视图用这种地址同时读取多个子站，各子站的 OpenWA 事件通知也送到 `/site/<子站编号>/api/wa/hook`；网关按路径里的子站编号转发即可。nginx 的写法如下（两个子站 `default` 与 `site-b`）：

```

Replace them with:

```text

多个子站可以共用同一个访问地址：每个子站各运行一个服务进程（`WA_SCRM_SITE_ID` 和端口各不相同，`WA_SCRM_DATA_DIR` 相同，账号只有一套），并通过各自的 `WA_SCRM_OPENWA_ENV` 连接自己的 OpenWA。登录时服务器除登录凭证外还会写入名为 `scrm_site` 的 Cookie，记录该员工所属的子站；前面的网关（nginx 或 OpenResty）按这个 Cookie 把 `/api/data` 和 `/api/wa/*` 转发到对应子站的进程，其余请求（页面文件、`/api/auth/*`、`/api/site/status`、`/api/ai/*`）固定交给其中一个进程。这个 Cookie 只决定请求的去向，不代表权限：每个子站都会自行核对登录状态和账号所属的子站。每个子站的进程也用子站自己的名字应答它的数据和 WhatsApp 连接：`/site/<子站编号>/api/data` 和 `/site/<子站编号>/api/wa/…` 等同于该子站的 `/api/data` 和 `/api/wa/…`；登录等其余接口只有原来的地址，输错密码的次数因此只由一个进程统计。主管视图用这种地址同时读取多个子站，各子站的 OpenWA 事件通知也送到 `/site/<子站编号>/api/wa/hook`；网关按路径里的子站编号转发即可。nginx 的写法如下（两个子站 `default` 与 `site-b`）：

```

**Edit 4.2** — `README.md`. Find exactly these lines (they occur once):

```text
    location /api/wa/ { proxy_pass http://$scrm_node; }
    location ~ ^/site/(?<scrm_named>[a-z0-9-]+)/api/ { proxy_pass http://$scrm_named_node; }
}
```

Replace them with:

```text
    location /api/wa/ { proxy_pass http://$scrm_node; }
    location ~ ^/site/(?<scrm_named>[a-z0-9-]+)/api/(data$|wa/) { proxy_pass http://$scrm_named_node; }
}
```

#### `replica/build-log.md`

**Append 4.3** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 主管视图上线后的三处加固 · 2026-11-23

主管视图合并后，请另一位审阅者只看代码复查了一遍：没有发现员工或外部请求能多读到数据的途径，没有发现脚本或日志注入，页面也没有任何写入。复查提出的三点已在这里处理：

- 带子站名字的地址（`/site/<子站编号>/api/…`）现在只应答该子站的数据和 WhatsApp 连接，不再应答登录等其他接口。这样，多个子站并存时，输错密码的次数仍只由一个进程统计，不会因为子站数量而成倍增加可尝试的次数。网关的转发规则也相应收窄（见 README）。
- 某个子站保存的数据即使形状异常（例如待办列表里混入空项），也不会让主管视图的员工总览整页停住：页面只采用形状正常的条目，个别内容确实无法显示时只影响那一处。客户头像的颜色也只按一个固定的样式名取用。
- 读取子站数据时，名称与对象自带成员相同的内容（例如 `constructor`）只会成为这份数据里的普通条目，不再影响服务器进程本身。此前这样一条数据会使该子站此后的保存全部失败，直到手工清除。

主管视图里的说明文字改为准确的说法：每次打开一位员工的工作区，服务器都会记下是谁在查看（查看其中的图片、文件不再单独记录）。部署：服务器文件有变更，合并后需要重启各子站的服务进程。
```

Then verify everything once more:

```bash
git checkout bf11600 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-053/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test run ends with `pass 15`, `fail 0`; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `652ad050c57b92fbd55caf169329c2a537307d53e35a53e714d22088100aba5d`, `c91d9f4d5ef6a2d009ec9b8854d842f921ee9b3f2599b85e10534e0023799ff6`; `git status --porcelain` lists exactly nine paths: `README.md`, `replica/build-log.md`, the five source files under `work/wa-replica/`, and `outputs/wa-replica-prototype/master.js` and `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Sign-in and data tests** (15, none new; two are extended). The test of the supervisor page's questions saves a part `constructor/keys`, a part `messages/__proto__` and a field `toString`: they are in the document as they were saved, also when only some fields are asked for; `Object.keys` and a fresh object are as before; saving goes on and the parts can be taken out again. The test of the real server: under its sub-site's name it gives the data (partly, too) and the WhatsApp link — refused without sign-in — and nothing else: the status, the questions about sign-in, the model relay and paths that only begin alike answer 404, and nobody signs in there.
- **Validator** — the narrow form of the name in the path; the supervisor page takes only what has the expected shape and no longer puts a saved colour into the page as it is; reading the document sets properties of the document only.
- **Smoke** (`/tmp/wa-scrm-plan-053/smoke.sh`) — the same facts on the sources and the built page, the README, the build log, that nothing else of the page changed, the syntax of the files and the tests of the server, the relay and the link.
- **Verified by the reviewer in scripted browser sessions, not by you**: with a sub-site whose lists hold entries that are no records, a list that is no list, times that are no numbers and a colour of several words, the list of employees still shows every row with the figures of what is a record, the conversations open, the initials carry one word of colour, and the page reports no error; the note of the read-only view says who is noted; behind a private gateway with the narrower rule, a request that names a sub-site reaches its data and its WhatsApp link only, and a question about sign-in under a name is answered by nobody. The sessions of the supervisor page, of the rest of the product and of the connection still pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout bf11600 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 14`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 15`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-053/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/serve.cjs` → `120565ff4eebaa07004110b10b2a73a3a639c785ab8c13c9b4dbc82df54603b5`
- [ ] `sha256sum work/wa-replica/site-data.cjs` → `8448fb4a6e625569b2911c15e6c704b773d617de079ab26aa13d5929a7ff231c`
- [ ] `sha256sum work/wa-replica/site-api.test.cjs` → `45724ea33936af4abe304380a59c3f27a703692601fe58ff00cff6cbe3995dd3`
- [ ] `sha256sum work/wa-replica/fidelity-master.js` → `dbb7b94ca9f72e494b5943e6e4d8481d3206d566cdea555a00c325c3a4ba624b`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `4a3f9d9a308cf49dda624d85fc562b9bce29ec2dff777bb6321b68717140e4f4`
- [ ] `sha256sum README.md` → `652ad050c57b92fbd55caf169329c2a537307d53e35a53e714d22088100aba5d`
- [ ] `sha256sum replica/build-log.md` → `c91d9f4d5ef6a2d009ec9b8854d842f921ee9b3f2599b85e10534e0023799ff6`
- [ ] `sha256sum outputs/wa-replica-prototype/master.js` → `dbb7b94ca9f72e494b5943e6e4d8481d3206d566cdea555a00c325c3a4ba624b`
- [ ] `git diff --name-only bf11600..HEAD -- outputs` lists `outputs/wa-replica-prototype/master.js` and `outputs/wa-replica-prototype/validation.json` and nothing else
- [ ] `git diff --name-only bf11600..HEAD -- . ':!plans'` lists exactly these nine: `README.md`, `outputs/wa-replica-prototype/master.js`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/fidelity-master.js`, `work/wa-replica/serve.cjs`, `work/wa-replica/site-api.test.cjs`, `work/wa-replica/site-data.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, the build reports another number of icons than 84, or a test fails.
- An output file other than `master.js` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file.

## Maintenance notes

- **Deployment**: `serve.cjs` and `site-data.cjs` are loaded when a server starts — **every sub-site's server must be restarted once after the merge**. A gateway should pass by a sub-site's name only what the server answers under it (the README's rule); a wider rule does no harm, the server answers 404 for the rest.
- Known and left as it is, for a later decision of the owner: the table of wrong sign-in attempts is emptied as a whole when more than 5000 names are in it, which would also lift a lock that is running (`site-auth.cjs`).
- The employees' app itself still trusts the shape of its own sub-site's data; only the supervisor page, which reads other people's data, takes it defensively.
- What a reviewer should scrutinise: that the supervisor page still shows everything it showed for well-formed data; that the data and the WhatsApp link under a name behave exactly as under the plain address.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
