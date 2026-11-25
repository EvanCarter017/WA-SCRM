# Plan 069: A lighter page: compressed by the gateway, kept by the browser

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 48c0a17..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (the gateway compresses text answers; the server tags the page's files and answers 304 for unchanged ones; the data and the API stay as they are; exact text and checksums for every file)
- **Depends on**: plans/068-own-emoji.md (DONE; its test and check of the server's caching change here)
- **Category**: performance (approved by the owner)
- **Planned at**: commit `48c0a17`, 2026-11-25

## Why this matters

The owner's friend says his website is very slow. Measured on 2026-11-25: the server answers in milliseconds and is barely loaded, but every time the page is opened or reloaded the browser downloads about 1 MB — the program (694 KB: `index.html`, `app.js`, the style sheets and scripts) and the workspace's data (348 KB for the busiest workspace) — uncompressed, and keeps nothing between visits (every file goes with `Cache-Control: no-store`; the gateway does not compress). On the friend's connection to the server in Ohio (about 100 KB/s, varying) one open took 10–11 s twice at 16:03 UTC. Compressed, the program is 176 KB and the data 78 KB. Asked about the ways to make it faster, the owner chose "Compression + caching (Recommended)": the gateway compresses, and the browser keeps the program between visits while updates still arrive at once.

### Decisions already made (do not re-open; do not ask)

- **Compression at the gateway** (`deploy/gateway.conf`, nginx): `gzip on`, level 5, from 1 KB, for `text/css`, `application/javascript`, `application/json` and `text/plain` (HTML always), with `gzip_vary on` and `gzip_proxied any` — nginx leaves out requests that came through a proxy (a `Via` header) by default, and the friend's may come through a VPN. Pictures, sound and fonts are compressed already and are not in the list. The upgrade script tests the configuration with the gateway's own nginx before it changes anything and makes the gateway anew with it.
- **The browser keeps the page's files and asks each time** (`serve.cjs`): every file of the page goes with `Cache-Control: no-cache` and an `ETag` — a SHA-256 of its content, base64url, 32 characters, in quotes. A request with `If-None-Match` naming that tag (also as `W/`-weak, which nginx makes of it when it compresses, and also among other tags) gets an empty `304`. A new version has a new tag, so it arrives at the next open; nobody has to clear anything. The parts of the emoji font stay `public, max-age=31536000, immutable` (plan 068) and also get a tag.
- **Unchanged**: the data and every other answer of the API keep `no-store` (they are sent by `sendJson` and the site's own routes, not by `serveFile`). No file name changes; nothing in the page changes.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `deploy/gateway.conf` | `ecfce3459172d23f3bfe5ea021d27321e0952b3b2a5179693f141145768a299c` | `7d18eeb78b0eaa98ac7e2e7f58632ecaafa06bb976e6e631da7d5e26834094f6` | 1 |
| `work/wa-replica/serve.cjs` | `d7d59534ce481d81075aac11dbbbb696ff14106cd2ba06939c3d419dcf949ca5` | `2544469cee3e04a82fdbc95f94f6dc4ec49848dcc967a2e4f8fb7015c52ceead` | 2 |
| `work/wa-replica/site-api.test.cjs` | `cbf84d71085dc1d0e9d078dfef51577f9839aa3bbb1cd923b3bcb0fb5d3ee8be` | `901ba78c7686809b808e5f021fbf95b5f7779ff78879a1c4e9f39a93a3806312` | 2 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `22b3a2b8a531715359814f81c61b1c9eb7bb4eb2c0acb86890a619a07c97a4f8` | `c0b588da8748b24f43687140a7bd65956c6747a39d2b5bd47d8f8b4c6b93d3e2` | 3 |
| `replica/build-log.md` | `8b533250c9024a0a21b033613eb431e30e61c31943a37460f62d9cbd89524184` | `e8ada4fd1afc5838353fca94111933f178f98c88c03b4483ae62d7e2d6d28373` | 1 append |

- `deploy/gateway.conf` — the platform's gateway (nginx 1.27 in a container): the one address everybody opens; it passes requests on by path and cookie. The validator checks several of its lines (keep them as they are).
- `serve.cjs` — the server of the page and of a sub-site (every container runs it); `serveFile` sends a file of `outputs/wa-replica-prototype` with a type from its `mime` table. Since plan 068 it sends the font parts with a long caching and everything else with `no-store`.
- `site-api.test.cjs` — the tests of the sub-site's server; its test of the preview server's files (plan 068) is changed to the new caching.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`; its check of plan 068's caching line changes, and checks of this plan are added after its checks of the gateway (the helper `deploy()` is defined just before them).
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). This plan changes nothing the build writes: after the build only `validation.json` (written by the validator) differs.

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer** (the server's accounts and data use `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 48c0a17 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 17`, `fail 0` (unchanged) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 20`, `fail 0` (20 before this plan as well: one test changes) |
| The gateway's configuration | `nginx -e stderr -t -q -c "$PWD/deploy/gateway.conf"` (only if `command -v nginx` finds one) | exit 0, nothing printed |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-069/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `deploy/gateway.conf`, `work/wa-replica/serve.cjs` (Step 2)
- `work/wa-replica/site-api.test.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/validation.json` (every other output file must come out unchanged — this plan changes nothing the build writes)

**Out of scope** (do NOT touch): every other file — `deploy/upgrade.sh`, `deploy/compose.yml`, `site-api.cjs`, `openwa-link.cjs`, `ai-relay.cjs`, the `fidelity-*` sources, `build-fidelity.cjs`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything; do not start or reload any nginx or container.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/069-lighter-page` first.
- One commit is fine. Conventional commit message, e.g. `perf(scrm): compress the page at the gateway and let the browser keep its files`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese, Japanese, Korean, Cyrillic and Arabic text, regular expressions with backslashes, and backticks; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 8 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the five files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-069/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-069 && cat > /tmp/wa-scrm-plan-069/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 069: the gateway compresses what goes out as text; the server lets the browser keep the page's files and
# answers an empty 304 when they did not change. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
has 'their test asks the files again with their tag' "$W/site-api.test.cjs" "for (const asked of [tag, 'W/' + tag,"
has 'the gateway compresses' "$ROOT/deploy/gateway.conf" 'gzip on;'
has 'also through a proxy' "$ROOT/deploy/gateway.conf" 'gzip_proxied any;'
has 'the text types' "$ROOT/deploy/gateway.conf" 'gzip_types text/css application/javascript application/json text/plain;'
has 'the server tags the files of the page' "$W/serve.cjs" "const tag = '\"' + crypto.createHash('sha256').update(body).digest('base64url').slice(0, 32) + '\"';"
has 'and answers 304 when they did not change' "$W/serve.cjs" 'res.writeHead(304, kept);'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  lighterPage: 'the gateway compresses"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 页面打开更快：压缩传输，浏览器保留程序文件 · 2026-11-25'
same 'of the built files only the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE 'validation\.json$')" 0
same 'the server passes the syntax check' "$(node --check "$W/serve.cjs" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
if command -v nginx > /dev/null; then same 'nginx accepts the gateway configuration' "$(nginx -e stderr -t -q -c "$ROOT/deploy/gateway.conf" > /dev/null 2>&1 && echo NGINX_OK)" NGINX_OK; else echo "ok   (no nginx on this machine: the upgrade script tests the configuration)"; fi
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-069/smoke.sh && ls -l /tmp/wa-scrm-plan-069/smoke.sh
```

**Verify**: `sha256sum deploy/gateway.conf work/wa-replica/serve.cjs work/wa-replica/site-api.test.cjs work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-069/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `their test asks the files again with their tag`, `the gateway compresses`, `also through a proxy`, `the text types`, `the server tags the files of the page`, `and answers 304 when they did not change`, `the validator knows it` and `the build log has the entry` (eight checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The gateway compresses; the server tags the page's files and answers 304

#### `deploy/gateway.conf`

**Edit 2.1** — `deploy/gateway.conf`. Find exactly these lines (they occur once):

```text
    proxy_read_timeout 120s;

```

Replace them with:

```text
    proxy_read_timeout 120s;
    # What goes out as text is compressed for the browser (plan 069): the page's program, its style sheets and the
    # data come to about a quarter of their size. Also when a proxy or a VPN is on the way, which nginx leaves out by
    # default; pictures, sound and fonts are compressed already.
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_vary on;
    gzip_types text/css application/javascript application/json text/plain;

```

#### `serve.cjs`

**Edit 2.2** — `work/wa-replica/serve.cjs`. Find exactly these lines (they occur once):

```text
const path = require('node:path');
const aiRelay = require('./ai-relay.cjs');
```

Replace them with:

```text
const path = require('node:path');
const crypto = require('node:crypto');
const aiRelay = require('./ai-relay.cjs');
```

**Edit 2.3** — `work/wa-replica/serve.cjs`. Find exactly these lines (they occur once):

```text
  const body = await fs.readFile(file);
  res.writeHead(200, {
    'Content-Type': mime[path.extname(file)] || 'text/plain; charset=utf-8',
    // The parts of the emoji font never change under their name (plan 068): the browser keeps them. Everything else
    // is asked for anew every time.
    'Cache-Control': pathname.startsWith('/fonts/') && pathname.endsWith('.woff2') ? 'public, max-age=31536000, immutable' : 'no-store',
  });
  res.end(req.method === 'HEAD' ? undefined : body);
```

Replace them with:

```text
  const body = await fs.readFile(file);
  // The page's own files are kept by the browser, which asks each time whether they changed, by a tag of their
  // content (plan 069): when they did not, the answer is an empty 304. A gateway that compresses the answer marks the
  // tag as weak (W/), which counts the same.
  const tag = '"' + crypto.createHash('sha256').update(body).digest('base64url').slice(0, 32) + '"';
  const kept = {
    // The parts of the emoji font never change under their name (plan 068): the browser keeps them without asking.
    'Cache-Control': pathname.startsWith('/fonts/') && pathname.endsWith('.woff2') ? 'public, max-age=31536000, immutable' : 'no-cache',
    ETag: tag,
  };
  if (String(req.headers['if-none-match'] || '').split(',').some(asked => asked.trim().replace(/^W\//, '') === tag)) {
    res.writeHead(304, kept);
    return res.end();
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'text/plain; charset=utf-8', ...kept });
  res.end(req.method === 'HEAD' ? undefined : body);
```

What these edits do, so that you can recognise them: `gateway.conf` gets six `gzip` lines after `proxy_read_timeout 120s;`; `serve.cjs` requires `node:crypto`, and `serveFile` makes the tag, answers `304` for a matching `If-None-Match` and otherwise sends the file with `no-cache` (the font parts with their long caching) and the tag.

**Verify**: `sha256sum deploy/gateway.conf work/wa-replica/serve.cjs` → `7d18eeb78b0eaa98ac7e2e7f58632ecaafa06bb976e6e631da7d5e26834094f6`, `2544469cee3e04a82fdbc95f94f6dc4ec49848dcc967a2e4f8fb7015c52ceead`; `node --check work/wa-replica/serve.cjs` exits 0; if `command -v nginx` finds one, `nginx -e stderr -t -q -c "$PWD/deploy/gateway.conf"` exits 0 and prints nothing. If a checksum does not match, restore the file (`git checkout -- <file>`) and apply its edits again, once; if it still does not match, STOP.

### Step 3: The checks: the preview server's test of the page's files, and the validator — and the build

#### `site-api.test.cjs`

**Edit 3.1** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text

test('the preview server: the page\'s files are asked for anew every time; the parts of the emoji font go as fonts and are kept by the browser (plan 068)', async () => {
  const child = spawn(process.execPath, [path.join(__dirname, 'serve.cjs'), '0'], { env: { ...process.env, WA_SCRM_DATA_DIR: '', WA_SCRM_AI_ENV: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
```

Replace them with:

```text

test('the preview server: the page\'s files are kept by the browser and asked for again with their tag — an empty 304 when unchanged, also for a weak tag; the parts of the emoji font go as fonts kept without asking (plans 068, 069)', async () => {
  const child = spawn(process.execPath, [path.join(__dirname, 'serve.cjs'), '0'], { env: { ...process.env, WA_SCRM_DATA_DIR: '', WA_SCRM_AI_ENV: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
```

**Edit 3.2** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
    assert.equal(Buffer.from(await font.arrayBuffer()).subarray(0, 4).toString('latin1'), 'wOF2');
    for (const file of ['/app.js', '/app.css', '/fonts/noto-color-emoji-OFL.txt']) {
      const answer = await fetch(base + file);
      assert.deepEqual([answer.status, answer.headers.get('cache-control')], [200, 'no-store'], file);
      await answer.arrayBuffer();
    }
  } finally {
```

Replace them with:

```text
    assert.equal(Buffer.from(await font.arrayBuffer()).subarray(0, 4).toString('latin1'), 'wOF2');
    const tags = new Set();
    for (const file of ['/', '/app.js', '/app.css', '/fonts/noto-color-emoji-OFL.txt']) {
      const answer = await fetch(base + file);
      const tag = answer.headers.get('etag');
      assert.deepEqual([answer.status, answer.headers.get('cache-control'), /^"[A-Za-z0-9_-]{32}"$/.test(tag)], [200, 'no-cache', true], file);
      await answer.arrayBuffer();
      tags.add(tag);
      for (const asked of [tag, 'W/' + tag, `"other", ${tag}`]) {
        const again = await fetch(base + file, { headers: { 'If-None-Match': asked } });
        assert.deepEqual([again.status, again.headers.get('etag'), again.headers.get('cache-control'), (await again.arrayBuffer()).byteLength], [304, tag, 'no-cache', 0], `${file} asked with ${asked}`);
      }
      const other = await fetch(base + file, { headers: { 'If-None-Match': '"not-this-one"' } });
      assert.equal(other.status, 200, file);
      await other.arrayBuffer();
    }
    assert.equal(tags.size, 4, 'each file has a tag of its own');
  } finally {
```

#### `validate-scrm-lifecycle.cjs`

**Edit 3.3** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(builtCss.includes('font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei","SCRM Emoji",sans-serif;'), 'the emoji font must come after the fonts of the text');
for (const required of ["'.woff2': 'font/woff2',", "'Cache-Control': pathname.startsWith('/fonts/') && pathname.endsWith('.woff2') ? 'public, max-age=31536000, immutable' : 'no-store',"]) {
  assert(read(path.join(__dirname, 'serve.cjs')).includes(required), `serve.cjs is missing ${required}`);
```

Replace them with:

```text
assert(builtCss.includes('font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei","SCRM Emoji",sans-serif;'), 'the emoji font must come after the fonts of the text');
for (const required of ["'.woff2': 'font/woff2',", "'Cache-Control': pathname.startsWith('/fonts/') && pathname.endsWith('.woff2') ? 'public, max-age=31536000, immutable' : 'no-cache',"]) {
  assert(read(path.join(__dirname, 'serve.cjs')).includes(required), `serve.cjs is missing ${required}`);
```

**Edit 3.4** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(!/log_format[^;]*\$(request|request_uri|args|query_string)\b/.test(deploy('gateway.conf')), 'the gateway must not write a query string into its log');
assert(deploy('upgrade.sh').includes("docker ps -a --filter label=wa-scrm.part=openwa --format") && deploy('upgrade.sh').includes('healthy || { echo "the provisioner is not healthy: the sub-sites are left as they are" >&2; exit 1; }') && deploy('upgrade.sh').indexOf('healthy || {') < deploy('upgrade.sh').indexOf('docker rm -f "wa-scrm-site-$SITE"'), 'the upgrade script must know a sub-site by its OpenWA and touch none while the provisioner is not healthy');
```

Replace them with:

```text
assert(!/log_format[^;]*\$(request|request_uri|args|query_string)\b/.test(deploy('gateway.conf')), 'the gateway must not write a query string into its log');
// A lighter page (plan 069): the gateway compresses what goes out as text, also through a proxy or a VPN; the server
// lets the browser keep the page's files and answers an empty 304, by a tag of their content, when they did not
// change — a weak tag from a compressing gateway counts the same.
for (const required of ['gzip on;', 'gzip_proxied any;', 'gzip_vary on;', 'gzip_types text/css application/javascript application/json text/plain;']) {
  assert(deploy('gateway.conf').includes(required), `deploy/gateway.conf is missing ${required}`);
}
for (const required of ["const tag = '\"' + crypto.createHash('sha256').update(body).digest('base64url').slice(0, 32) + '\"';", "if (String(req.headers['if-none-match'] || '').split(',').some(asked => asked.trim().replace(/^W\\//, '') === tag)) {", 'res.writeHead(304, kept);']) {
  assert(read(path.join(__dirname, 'serve.cjs')).includes(required), `serve.cjs is missing ${required}`);
}
assert(deploy('upgrade.sh').includes("docker ps -a --filter label=wa-scrm.part=openwa --format") && deploy('upgrade.sh').includes('healthy || { echo "the provisioner is not healthy: the sub-sites are left as they are" >&2; exit 1; }') && deploy('upgrade.sh').indexOf('healthy || {') < deploy('upgrade.sh').indexOf('docker rm -f "wa-scrm-site-$SITE"'), 'the upgrade script must know a sub-site by its OpenWA and touch none while the provisioner is not healthy');
```

**Edit 3.5** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  ownEmoji: 'emoji are drawn with Noto Color Emoji (SIL OFL 1.1; work/wa-replica/fonts, copied by the build) in eleven parts named by their characters: a browser loads only the parts of the emoji on screen and keeps them (font/woff2, immutable); digits and signs keep the fonts of the text; a browser that cannot draw the colour format keeps its own emoji',
```

Replace them with:

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  lighterPage: 'the gateway compresses the page\'s program, style sheets and data (gzip, also through a proxy or a VPN); the browser keeps the page\'s files and asks each time with their tag (ETag), getting an empty 304 when they did not change; the data stays no-store',
  ownEmoji: 'emoji are drawn with Noto Color Emoji (SIL OFL 1.1; work/wa-replica/fonts, copied by the build) in eleven parts named by their characters: a browser loads only the parts of the emoji on screen and keeps them (font/woff2, immutable); digits and signs keep the fonts of the text; a browser that cannot draw the colour format keeps its own emoji',
```

**Verify**: `sha256sum work/wa-replica/site-api.test.cjs work/wa-replica/validate-scrm-lifecycle.cjs` → `901ba78c7686809b808e5f021fbf95b5f7779ff78879a1c4e9f39a93a3806312`, `c0b588da8748b24f43687140a7bd65956c6747a39d2b5bd47d8f8b4c6b93d3e2`; `git checkout 48c0a17 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `outputs/wa-replica-prototype/validation.json` only; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 20`, `fail 0`. If a checksum does not match, restore the file and apply its edits again, once; if it still does not match, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 页面打开更快：压缩传输，浏览器保留程序文件 · 2026-11-25

朋友反映网站很慢。实测：服务器本身响应很快（毫秒级，负载很低），慢在下载——每次打开或刷新页面，浏览器都要重新下载约 1 MB（程序约 694 KB，加上自己的数据，mango 约 348 KB），既不压缩也不保留；在他的网络上（约每秒 100 KB，时快时慢）打开一次需要约 10 秒。现在：

- **压缩传输**：网关把程序、样式表和数据压缩后再发送（gzip），大小约为原来的四分之一；经过代理或 VPN 时也同样压缩。图片、语音和字体本来就是压缩过的，不再处理。
- **浏览器保留程序文件**：页面的程序文件留在浏览器里，每次打开时只询问是否有变化（按文件内容的标记）；没有变化时服务器只回一个空的「未修改」，不再重新下载。有新版本时立即生效，不需要清理缓存。
- 客户数据仍然每次重新获取，不留在浏览器里。

效果（按他的网络估算）：第一次打开约 250 KB、2–3 秒；之后每次打开约 80 KB（只有压缩后的数据），约 1 秒。

验证：构建与校验脚本通过；子站接口测试中预览服务器一项改为检查：页面文件带内容标记、可保留，再次询问且未修改时回空的 304（弱标记同样有效），字体仍长期保留；网关配置由 nginx 检查通过；浏览器测试覆盖：经过压缩网关时程序和数据以压缩方式到达，刷新后程序文件只得到 304，页面照常工作。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout 48c0a17 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-069/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `e8ada4fd1afc5838353fca94111933f178f98c88c03b4483ae62d7e2d6d28373`; `git status --porcelain` lists exactly these six as changed and nothing as new: the five files of the table in "Current state" and `outputs/wa-replica-prototype/validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Sign-in and data tests** (20): the preview server's test of its files (plan 068) now asks `/`, `/app.js`, `/app.css` and the font's licence: 200 with `no-cache` and a tag of 32 characters; asked again with the tag, with `W/` and the tag, and with the tag among other tags — an empty 304 with the same tag; asked with another tag — 200; four files, four tags. The font part keeps its type and long caching.
- **Validator** — the six lines of the gateway, the tag and the 304 in `serve.cjs`, plan 068's caching line with `no-cache`.
- **Smoke** (`/tmp/wa-scrm-plan-069/smoke.sh`) — the same facts, `nginx -t` when an nginx is on the machine, all three test files, that no built file but `validation.json` changed, the syntax of the server.
- **Verified by the reviewer, not by you**: a local copy of the gateway (the pinned nginx image) in front of a stand-in server, in a browser — the program, the style sheets and the data arrive compressed (also with a `Via` header), about a quarter of their size; on a reload the program comes back as 304, headers only; messages still arrive through the feed and changes are saved; the same checks fail on the code before this plan; the site suite.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 48c0a17 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 17`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 20`, `fail 0` (corrected after the plan ran: the line said 19, a slip of the advisor's text; the smoke script and the review counted 20)
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-069/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum deploy/gateway.conf` → `7d18eeb78b0eaa98ac7e2e7f58632ecaafa06bb976e6e631da7d5e26834094f6`
- [ ] `sha256sum work/wa-replica/serve.cjs` → `2544469cee3e04a82fdbc95f94f6dc4ec49848dcc967a2e4f8fb7015c52ceead`
- [ ] `sha256sum work/wa-replica/site-api.test.cjs` → `901ba78c7686809b808e5f021fbf95b5f7779ff78879a1c4e9f39a93a3806312`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `c0b588da8748b24f43687140a7bd65956c6747a39d2b5bd47d8f8b4c6b93d3e2`
- [ ] `sha256sum replica/build-log.md` → `e8ada4fd1afc5838353fca94111933f178f98c88c03b4483ae62d7e2d6d28373`

- [ ] `git diff --name-only 48c0a17..HEAD -- outputs` lists `outputs/wa-replica-prototype/validation.json` and nothing else
- [ ] if `command -v nginx` finds one: `nginx -e stderr -t -q -c "$PWD/deploy/gateway.conf"` exits 0
- [ ] `git diff --name-only 48c0a17..HEAD -- . ':!plans'` lists exactly six paths: the five of the table in "Current state" and `validation.json`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, or a test fails.
- An output file other than `validation.json` changes, or `nginx -t` fails.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file, creating a file or installing a package.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; the script tests the gateway's configuration with the gateway's own nginx and makes the gateway anew with it. Pages that are open keep working; the next open is the lighter one.
- A file that is added to the page later is tagged and kept the same way; nothing has to be listed.
- What a reviewer should scrutinise: that the data and the API keep `no-store` (only `serveFile` changed); that a weak tag from the compressing gateway still gets the 304; that `gzip_proxied any` is there (a request through a proxy or VPN carries `Via`); that the gateway still keeps nothing on disk (`proxy_max_temp_file_size 0` is untouched; gzip works in memory).
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
