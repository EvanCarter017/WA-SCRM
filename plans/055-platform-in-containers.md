# Plan 055: The platform can run in containers; a provisioner makes a sub-site

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 51a2745..HEAD -- work/wa-replica replica/build-log.md outputs README.md deploy .dockerignore`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MEDIUM (a new part that may tell Docker what to do; it is not connected to anything yet and no running system changes — exact text and checksums for every file)
- **Depends on**: plans/054-accounts-from-the-supervisor-page.md (DONE)
- **Category**: feature (owner request; the step between the accounts and making employees from the page)
- **Planned at**: commit `51a2745`, 2026-11-23

## Why this matters

The owner wants an employee to be made from the supervisor page **together with** that employee's own sub-site and WhatsApp connection ("Employee + own workspace"), asked "how is OpenWA set up? Does it include container management and service discovery?", and decided that the whole system moves to a second server ("Once all this is done, deploy it to …"; "Move all, four for now").

Today a second sub-site means three things done by hand on the server: one more server process, one more OpenWA container, two more lines in the gateway. Nothing in the system can do them. This plan brings the parts that can — without connecting them to the page yet (next plan) and without touching the two sub-sites that run today:

- **The server can run in a container**: the address it listens on can be set (`WA_SCRM_LISTEN`); by default it stays on the machine itself. `deploy/Dockerfile` builds the image all servers of the platform run from.
- **The provisioner** (`site-provisioner.cjs`, new) is the one part of the platform that may tell Docker what to do — the "container management". It makes, starts and stops the two containers of a sub-site, the sub-site's server and its own OpenWA, after a fixed recipe: the only thing a caller chooses is the sub-site's id. It answers the first server of the platform only, which proves itself with a shared secret, and is published nowhere. For a new sub-site it starts OpenWA with a key of its own choice, has OpenWA make a key restricted to operating it, and writes the sub-site's settings file. It refuses when a sub-site would be one too many (four by default) or would leave the machine with too little free memory.
- **The gateway** (`deploy/gateway.conf`) finds the first server and every sub-site by the name of its container, through Docker's own name service — the "service discovery": when a sub-site is made, started or stopped, nothing is written anywhere.
- `deploy/compose.yml` runs what is always there (gateway, first server, provisioner); `deploy/upgrade.sh` brings a machine to a new version without interrupting a WhatsApp connection.

### Decisions already made (do not re-open; do not ask)

- The provisioner talks to the Docker Engine over its socket with plain HTTP — no library, no command line.
- A sub-site's containers are `wa-scrm-site-<id>` and `wa-scrm-openwa-<id>`, its OpenWA's data the volume `wa-scrm-openwa-<id>`, its settings file `openwa-<id>.env` in the data folder; the names `master`, `gateway` and `provisioner` are the platform's own.
- A sub-site whose OpenWA's data and settings file exist already is started as it is (one that was moved from elsewhere); one whose making stopped half-way is finished at the next start. Removing a sub-site or its data is not offered.
- The first server of the platform is a container of its own (`wa-scrm-master`) and no employee's sub-site.
- Nothing of this plan is started by this plan: no container is made and no server is deployed. The reviewer tries all of it against a real Docker.
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes or makes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/serve.cjs` | `120565ff4eebaa07004110b10b2a73a3a639c785ab8c13c9b4dbc82df54603b5` | `41ec391efa5541010c0e4854eeb2dbe49de074f2fb1512a7005ca7731733dc93` |
| `work/wa-replica/site-api.test.cjs` | `8286bfdfcd05498335bd939adfc7c5f4ba8dc4ef1f2b51794e28e0b68839c5fa` | `c38b5125f28acee6817b52effce3420f6d4ef678d24c9381f85809e541cb162e` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `9c9e930d118ece530200d19809106692accd899235bc4636fd37cb89fc12c380` | `bf368974b129930d6b4d3533de0afe3bd324cf7a2038c6b581614eaeec8a3c5c` |
| `README.md` | `95273177741eef7859625fa87a942d127792c493fa0043e9c86f1e29ae9f446d` | `42c0404d1cd1ca31e21b66d5d51df64e70ae88f5c9f540b1420c949b338027e6` |
| `work/wa-replica/site-provisioner.cjs` | (does not exist) | `af7e64e23143b140a9bdb498e6f5c8d5a3d526e58ce62c6a56fcf13aec68e114` |
| `work/wa-replica/site-provisioner.test.cjs` | (does not exist) | `6e4ee3a6dc7cb6b6296b1cbdda9e8857f68b0edf2072d8af66da30172e2351cb` |
| `.dockerignore` | (does not exist) | `ab2a44c68f7dcae4f264e46d87e0df92e5471e6197fca7c0dfd755fc46caff4c` |
| `deploy/Dockerfile` | (does not exist) | `c66f880cad0117f0f9efe03cbcec2a6f8566b7dabb783b1025c5c765d42e5773` |
| `deploy/gateway.conf` | (does not exist) | `fea9acd3eaf285b532faa08d1516c51a9d3b125203298f334181af916eb0940b` |
| `deploy/compose.yml` | (does not exist) | `0d678c2f1837ac4011fe161b7c7ad51c619a30146b0224c0e2ade89145a33c74` |
| `deploy/platform.env.template` | (does not exist) | `3381e2467e36e1dc5dfe03ee0d58afc0edafa3ce55ab2be9bd49cfcaef56c313` |
| `deploy/upgrade.sh` | (does not exist) | `bce69994be6945dc9ded532e9df67bffdb138a85cac9884a0d9819137748223a` |

- `serve.cjs` — the server; it listens on `127.0.0.1` only, with the port given on the command line.
- `site-api.test.cjs` — the tests of sign-in and data (16). The last test starts the real server with a helper `start(env)` and stops it again.
- `openwa-link.cjs` (not changed) — a sub-site's link to its OpenWA reads its settings from the file named by `WA_SCRM_OPENWA_ENV`: `OPENWA_BASE_URL`, `OPENWA_API_KEY`, `OPENWA_HOOK_URL`, `OPENWA_HOOK_SECRET`.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page; a block is added.
- The folder `deploy/` and the file `.dockerignore` do not exist yet.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). This plan changes no source of the page: after the build, only `validation.json` (written by the validator) differs.

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 51a2745 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the provisioner | `$NODE --test work/wa-replica/site-provisioner.test.cjs` | `pass 8`, `fail 0` (they use a stand-in for Docker; no container is made) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 16`, `fail 0` |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 14`, `fail 0` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (they send a 16 MB file twice; allow a few seconds) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-055/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify or create):

- `work/wa-replica/serve.cjs`, `site-api.test.cjs`; new: `work/wa-replica/site-provisioner.cjs`, `site-provisioner.test.cjs` (Step 2)
- new: `.dockerignore`, `deploy/Dockerfile`, `deploy/gateway.conf`, `deploy/compose.yml`, `deploy/platform.env.template`, `deploy/upgrade.sh` (Step 3)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 4)
- `README.md`, `replica/build-log.md` (Step 5)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular `site-api.cjs`, `site-auth.cjs`, `site-data.cjs`, `site-admin.cjs`, `openwa-link.cjs`, `ai-relay.cjs`, every file of the page, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`. **Do not use Docker at all** — do not build an image, do not start a container, do not run the upgrade script: this plan only writes the files.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/055-platform-in-containers` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): run the platform in containers, with a provisioner for sub-sites`. Remember to add the eight new files (the folder `deploy/`, `.dockerignore`, and the two files of the provisioner).
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: a **New file** gives the whole content of a file that does not exist yet (create the folder `deploy/` first for the files in it; every new file is an ordinary file, not executable). An **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block whose text has a fence of its own (the README's) is opened and closed with four backticks; a block ends only at a line that equals its opening run of backticks. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the twelve files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-055/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-055 && cat > /tmp/wa-scrm-plan-055/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that the platform can run in containers: the server's listening address, the provisioner, the deploy files.
# No container is made and Docker is not needed. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; D="$ROOT/deploy"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the tests of the provisioner pass' "$("$NODE" --test "$W/site-provisioner.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 8 ℹ fail 0 '
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 16 ℹ fail 0 '
has 'the server listens where it is told to' "$W/serve.cjs" "server.listen(port, process.env.WA_SCRM_LISTEN || '127.0.0.1', () => {"
has 'the tests look at the listening address' "$W/site-api.test.cjs" "WA_SCRM_LISTEN: '0.0.0.0'"
has 'the provisioner checks the shared secret' "$W/site-provisioner.cjs" "if (given.length !== secret.length || !crypto.timingSafeEqual(given, secret)) throw problem('not-allowed');"
has 'the provisioner keeps the platform'"'"'s own names' "$W/site-provisioner.cjs" "const RESERVED = ['master', 'gateway', 'provisioner'];"
same 'the provisioner takes only the id from a request' "$(grep -oE '(^|[^.A-Za-z0-9_])body\.[A-Za-z]+' "$W/site-provisioner.cjs" 2>/dev/null | grep -oE 'body\.[A-Za-z]+' | sort -u | tr '\n' ' ')" 'body.id '
has 'the image is built on a pinned base' "$D/Dockerfile" 'FROM node:24-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54'
same 'only the provisioner has the Docker socket, only the gateway a published port' "$(grep -c '/var/run/docker.sock:/var/run/docker.sock' "$D/compose.yml" 2>/dev/null) $(grep -c '^    ports:' "$D/compose.yml" 2>/dev/null)" '1 1'
has 'the gateway finds a sub-site by the name of its container' "$D/gateway.conf" 'set $scrm_upstream "wa-scrm-site-$scrm_named";'
has 'the settings template holds paths, no secret' "$D/platform.env.template" 'WA_SCRM_HOST_SECRET=/home/ubuntu/workspace/secrets/wa-scrm-provisioner.secret'
same 'the upgrade script passes the syntax check' "$(bash -n "$D/upgrade.sh" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
has 'the image leaves out what it does not need' "$ROOT/.dockerignore" '.git'
has 'the README says how to run the platform in containers' "$ROOT/README.md" '#### 用容器运行整套平台'
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 平台可以在容器里运行，子站由调度服务自动创建'
same 'nothing of the page changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vc 'validation.json$')" 0
same 'the server files pass the syntax check' "$(node --check "$W/serve.cjs" 2>/dev/null && node --check "$W/site-provisioner.cjs" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-055/smoke.sh && ls -l /tmp/wa-scrm-plan-055/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/serve.cjs work/wa-replica/site-api.test.cjs work/wa-replica/validate-scrm-lifecycle.cjs README.md` → the "at the planned commit" values of the table in "Current state", in that order; `ls deploy .dockerignore work/wa-replica/site-provisioner.cjs` → none of them exists; `NODE=$NODE bash /tmp/wa-scrm-plan-055/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the tests of the provisioner pass` (got: ), `the server listens where it is told to`, `the tests look at the listening address`, `the provisioner checks the shared secret`, `the provisioner keeps the platform's own names`, `the provisioner takes only the id from a request` (got: ), `the image is built on a pinned base`, `only the provisioner has the Docker socket, only the gateway a published port` (got:  ), `the gateway finds a sub-site by the name of its container`, `the settings template holds paths, no secret`, `the upgrade script passes the syntax check` (got: ), `the image leaves out what it does not need`, `the README says how to run the platform in containers`, `the build log has the entry` and `the server files pass the syntax check` (got: ) (fifteen checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The server listens where it is told to; the provisioner

#### `serve.cjs`

**Edit 2.1** — `work/wa-replica/serve.cjs`. Find exactly these lines (they occur once):

```text

server.listen(port, '127.0.0.1', () => {
  console.log('PREVIEW_URL=http://127.0.0.1:' + server.address().port);
```

Replace them with:

```text

// The address the server listens on: this machine only, unless WA_SCRM_LISTEN names another one. In a container
// that is 0.0.0.0, and the container's network decides who reaches it.
server.listen(port, process.env.WA_SCRM_LISTEN || '127.0.0.1', () => {
  console.log('PREVIEW_URL=http://127.0.0.1:' + server.address().port);
```

#### `site-api.test.cjs`

**Edit 2.2** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
    assert.equal((await fetch(on.base + '/')).status, 200, 'the page itself needs no sign-in');
  } finally {
```

Replace them with:

```text
    assert.equal((await fetch(on.base + '/')).status, 200, 'the page itself needs no sign-in');
    // the server is for this machine only, unless it is told to listen elsewhere — as it is in a container
    const outside = Object.values(os.networkInterfaces()).flat().find(address => address.family === 'IPv4' && !address.internal)?.address;
    if (outside) {
      await assert.rejects(fetch(`http://${outside}:${new URL(on.base).port}/api/site/status`), 'not by another address of the machine');
      const open = await start({ WA_SCRM_DATA_DIR: dir, WA_SCRM_SITE_ID: '', WA_SCRM_AI_ENV: '', WA_SCRM_LISTEN: '0.0.0.0' });
      try {
        assert.deepEqual(await (await fetch(`http://${outside}:${new URL(open.base).port}/api/site/status`)).json(), { enabled: true, site: 'default' });
      } finally {
        open.child.kill();
      }
    }
  } finally {
```

#### `site-provisioner.cjs`

**New file 2.3** — `work/wa-replica/site-provisioner.cjs`. The file does not exist yet. Create it with exactly this content (291 lines; the file ends with one newline):

```text
// The provisioner: the one part of the platform that may tell Docker what to do. It creates, starts and stops
// the two containers of a sub-site — the sub-site's server and its own OpenWA — after a fixed recipe; the only
// thing a caller chooses is the sub-site's id. Run it in a container that has the Docker socket, on the
// platform's own network and with no published port:
//   node site-provisioner.cjs
// It answers the first server of the platform ("master"), which proves itself with a shared secret:
//   GET  /health                is the provisioner there? (the one address that needs no secret)
//   GET  /sites                 every sub-site with its state, and how much room is left
//   POST /sites  { id }         a new sub-site (202, the work goes on in the background) — or 409 with the reason
//   POST /sites/<id>/start      POST /sites/<id>/stop
// Settings (environment):
//   WA_SCRM_PROVISIONER_SECRET_FILE   file with the shared secret, at least 32 characters (required)
//   WA_SCRM_SERVER_IMAGE              image of the sub-site's server (required)
//   WA_SCRM_OPENWA_IMAGE              image of OpenWA, pinned by digest (required)
//   WA_SCRM_HOST_DATA_DIR             the platform's data folder as the Docker host names it (required)
//   WA_SCRM_DATA_DIR                  the same folder as this process sees it (required)
//   WA_SCRM_HOST_AI_ENV               the model service's settings file on the host (optional)
//   WA_SCRM_NETWORK (wa-scrm)  WA_SCRM_PROVISIONER_PORT (8090)  WA_SCRM_DOCKER_SOCKET (/var/run/docker.sock)
//   WA_SCRM_MAX_SITES (4)  WA_SCRM_MIN_FREE_MB (1400)  WA_SCRM_OPENWA_MEMORY_MB (1536)  WA_SCRM_SERVER_MEMORY_MB (256)
//   WA_SCRM_RUN_AS (1000:1000)        the user the sub-sites' servers run as; owner of the files in the data folder
// A log line carries the action, the sub-site and the outcome; never a key or a secret.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SITE_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
// Names the platform uses for its own containers; no sub-site may be called so.
const RESERVED = ['master', 'gateway', 'provisioner'];
const MAX_BODY = 4096;
const HEALTH_WAIT_MS = 180000;
const ENGINE_TIMEOUT_MS = 120000;
const STATUS = { 'invalid-request': 400, 'not-allowed': 401, 'unknown-site': 404, 'not-found': 404, 'method-not-allowed': 405, exists: 409, full: 409, 'low-memory': 409, busy: 409 };
const problem = code => Object.assign(new Error(code), { code });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// One call to the Docker Engine over its socket. Resolves to { status, body }.
function engine(socketPath) {
  return (method, pathname, body) => new Promise((resolve, reject) => {
    const data = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const req = http.request({ socketPath, method, path: pathname, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {} }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {}
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.setTimeout(ENGINE_TIMEOUT_MS, () => req.destroy(new Error('the Docker Engine did not answer in time')));
    req.on('error', reject);
    req.end(data || undefined);
  });
}
// Where a sub-site's OpenWA is reached on the platform's network: by the name of its container.
const openwaAddress = id => `http://wa-scrm-openwa-${id}:2785`;

// config: see the settings above. docker: (method, path, body) → { status, body }. freeMb: () → the host's free
// memory. openwaUrl: id → the address of a sub-site's OpenWA; wait and healthWaitMs: how the provisioner waits
// for an OpenWA to come up (all three replaceable for tests).
function create({ config, docker, freeMb, openwaUrl = openwaAddress, wait = sleep, healthWaitMs = HEALTH_WAIT_MS }) {
  const names = id => ({ server: `wa-scrm-site-${id}`, openwa: `wa-scrm-openwa-${id}`, volume: `wa-scrm-openwa-${id}`, settings: `openwa-${id}.env` });
  const labels = (id, part) => ({ 'wa-scrm.site': id, 'wa-scrm.part': part });
  // What is being made right now, and what went wrong last time: id → 'working' | the reason it failed.
  const work = new Map();

  const ok = (answer, ...fine) => { if (!fine.includes(answer.status)) throw Object.assign(problem('engine'), { detail: `${answer.status} ${answer.body?.message || ''}`.trim() }); return answer; };

  async function containers() {
    const list = ok(await docker('GET', '/containers/json?all=1&filters=' + encodeURIComponent(JSON.stringify({ label: ['wa-scrm.site'] }))), 200).body;
    const sites = new Map();
    for (const c of list) {
      const id = c.Labels['wa-scrm.site'], part = c.Labels['wa-scrm.part'];
      if (!SITE_ID.test(id) || !['server', 'openwa'].includes(part)) continue;
      if (!sites.has(id)) sites.set(id, {});
      sites.get(id)[part] = { state: c.State, health: /\(healthy\)/.test(c.Status) ? 'healthy' : /\(unhealthy\)/.test(c.Status) ? 'unhealthy' : /\(health: starting\)/.test(c.Status) ? 'starting' : '' };
    }
    return sites;
  }
  // ready: both run and OpenWA answers. starting: on the way there. stopped: both are there and do not run.
  // failed: the last attempt to make or start it went wrong, or a part is missing.
  function stateOf(id, parts) {
    if (work.get(id) === 'working') return 'starting';
    const { server, openwa } = parts || {};
    if (server?.state === 'running' && openwa?.state === 'running') return openwa.health === 'healthy' ? 'ready' : openwa.health === 'unhealthy' ? 'failed' : 'starting';
    if (work.has(id)) return 'failed';
    if (server && openwa && server.state !== 'running' && openwa.state !== 'running') return 'stopped';
    return 'failed';
  }
  // How many sub-sites take a place: those whose OpenWA runs, and those that are being made or started.
  const taken = (sites, but) => [...new Set([...[...sites].filter(([, parts]) => parts.openwa?.state === 'running').map(([id]) => id), ...[...work].filter(([, state]) => state === 'working').map(([id]) => id)])].filter(id => id !== but).length;
  async function list() {
    const sites = await containers();
    for (const id of work.keys()) if (!sites.has(id)) sites.set(id, {});
    const running = taken(sites), free = Math.floor(freeMb());
    return {
      sites: [...sites].sort(([a], [b]) => (a < b ? -1 : 1)).map(([id, parts]) => ({ id, state: stateOf(id, parts), ...(work.has(id) && work.get(id) !== 'working' ? { reason: work.get(id) } : {}) })),
      room: { max: config.maxSites, running, freeMb: free, minFreeMb: config.minFreeMb, canStart: running < config.maxSites && free >= config.minFreeMb },
    };
  }
  // Refuses when the sub-site would be one too many, or would leave the host with too little memory. The place
  // is taken before the question is asked (see claim below), so two requests at once cannot both get the last one.
  async function room(id) {
    if (taken(await containers(), id) >= config.maxSites) throw problem('full');
    if (freeMb() < config.minFreeMb) throw problem('low-memory');
  }
  async function claim(id, check) {
    const before = work.get(id);
    work.set(id, 'working');
    try {
      await check();
    } catch (error) {
      if (before === undefined) work.delete(id);
      else work.set(id, before);
      throw error;
    }
  }

  const openwaSpec = (id, masterKey) => ({
    Image: config.openwaImage,
    Env: ['NODE_ENV=production', 'TZ=UTC', 'HOME=/tmp', 'XDG_CONFIG_HOME=/tmp/.config', 'XDG_CACHE_HOME=/tmp/.cache', 'PORT=2785', 'ENGINE_TYPE=whatsapp-web.js', 'AUTO_START_SESSIONS=true',
      `SSRF_ALLOWED_HOSTS=${names(id).server}`, 'WEBHOOK_MEDIA_INLINE_MAX_BYTES=0', 'RESOLVE_LID_TO_PHONE=true', ...(masterKey ? [`API_MASTER_KEY=${masterKey}`] : [])],
    Labels: labels(id, 'openwa'),
    HostConfig: {
      NetworkMode: config.network, RestartPolicy: { Name: 'unless-stopped' }, Memory: config.openwaMemoryMb * 1048576, PidsLimit: 2048, ReadonlyRootfs: true,
      CapDrop: ['ALL'], CapAdd: ['CHOWN', 'DAC_OVERRIDE', 'FOWNER', 'KILL', 'SETGID', 'SETUID'], SecurityOpt: ['no-new-privileges:true'], Tmpfs: { '/tmp': '' },
      Mounts: [{ Type: 'volume', Source: names(id).volume, Target: '/app/data' }],
      LogConfig: { Type: 'json-file', Config: { 'max-size': '10m', 'max-file': '3' } },
    },
  });
  const serverSpec = id => ({
    Image: config.serverImage,
    Cmd: ['node', 'work/wa-replica/serve.cjs', '8080'],
    User: config.runAs,
    Env: ['WA_SCRM_DATA_DIR=/data', `WA_SCRM_SITE_ID=${id}`, `WA_SCRM_OPENWA_ENV=/data/${names(id).settings}`, 'WA_SCRM_LISTEN=0.0.0.0', ...(config.hostAiEnv ? ['WA_SCRM_AI_ENV=/run/wa-scrm/ai.env'] : [])],
    Labels: labels(id, 'server'),
    HostConfig: {
      NetworkMode: config.network, RestartPolicy: { Name: 'unless-stopped' }, Memory: config.serverMemoryMb * 1048576, PidsLimit: 256, ReadonlyRootfs: true, Init: true,
      CapDrop: ['ALL'], SecurityOpt: ['no-new-privileges:true'], Tmpfs: { '/tmp': '' },
      Mounts: [{ Type: 'bind', Source: config.hostDataDir, Target: '/data' }, ...(config.hostAiEnv ? [{ Type: 'bind', Source: config.hostAiEnv, Target: '/run/wa-scrm/ai.env', ReadOnly: true }] : [])],
      LogConfig: { Type: 'json-file', Config: { 'max-size': '10m', 'max-file': '3' } },
    },
  });

  async function healthy(id) {
    for (const end = Date.now() + healthWaitMs; Date.now() < end;) {
      const state = ok(await docker('GET', `/containers/${names(id).openwa}/json`), 200).body.State;
      if (state.Health?.Status === 'healthy') return;
      if (!state.Running) throw problem('openwa-stopped');
      await wait(2000);
    }
    throw problem('openwa-not-healthy');
  }
  // The settings file of a sub-site's WhatsApp link: where its OpenWA is, a key restricted to operating it, and
  // the secret its deliveries are signed with. Private to the user the servers run as.
  async function settings(id, masterKey) {
    const made = await fetch(openwaUrl(id) + '/api/auth/api-keys', { method: 'POST', headers: { 'X-API-Key': masterKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `wa-scrm-${id}`, role: 'operator' }), signal: AbortSignal.timeout(20000) });
    const key = made.status === 201 ? (await made.json()).apiKey : '';
    if (!key) throw problem('openwa-key');
    const file = path.join(config.dataDir, names(id).settings), [uid, gid] = config.runAs.split(':').map(Number);
    fs.writeFileSync(file, `OPENWA_BASE_URL=${openwaUrl(id)}\nOPENWA_API_KEY=${key}\nOPENWA_HOOK_URL=http://${names(id).server}:8080/api/wa/hook\nOPENWA_HOOK_SECRET=${crypto.randomBytes(32).toString('hex')}\n`, { mode: 0o600 });
    // The file belongs to the user the servers run as; that is this process itself unless it runs as root.
    if (process.getuid() === 0) fs.chownSync(file, uid, gid);
  }
  // Makes what is missing of a sub-site and starts it. A sub-site whose OpenWA has its data and whose settings
  // file is there already (one that was moved here, or whose containers were removed) keeps both. One whose
  // making stopped half-way is finished: its OpenWA still has the key it was started with.
  async function build(id) {
    const n = names(id), parts = (await containers()).get(id) || {};
    const kept = fs.existsSync(path.join(config.dataDir, n.settings));
    if (!parts.openwa) {
      const volume = await docker('GET', `/volumes/${n.volume}`);
      if (volume.status === 200 && !kept) throw problem('settings-missing');
      if (volume.status !== 200 && kept) throw problem('data-missing');
      const masterKey = kept ? '' : crypto.randomBytes(36).toString('base64url');
      if (volume.status !== 200) ok(await docker('POST', '/volumes/create', { Name: n.volume, Labels: labels(id, 'openwa') }), 201);
      ok(await docker('POST', `/containers/create?name=${n.openwa}`, openwaSpec(id, masterKey)), 201);
      ok(await docker('POST', `/containers/${n.openwa}/start`), 204, 304);
      await healthy(id);
      if (!kept) await settings(id, masterKey);
    } else {
      const env = ok(await docker('GET', `/containers/${n.openwa}/json`), 200).body.Config?.Env || [];
      const masterKey = (env.find(line => line.startsWith('API_MASTER_KEY=')) || '').slice('API_MASTER_KEY='.length);
      if (!kept && !masterKey) throw problem('settings-missing');
      ok(await docker('POST', `/containers/${n.openwa}/start`), 204, 304);
      await healthy(id);
      if (!kept) await settings(id, masterKey);
    }
    if (!parts.server) ok(await docker('POST', `/containers/create?name=${n.server}`, serverSpec(id)), 201);
    ok(await docker('POST', `/containers/${n.server}/start`), 204, 304);
  }
  // Runs build in the background; what it comes to is read from the list.
  function begin(id, what) {
    work.set(id, 'working');
    build(id).then(() => { work.delete(id); console.log(`provisioner ${what} ok site=${id}`); }, error => {
      work.set(id, error.code || 'error');
      console.error(`provisioner ${what} failed site=${id} error=${error.code || error.name}${error.detail ? ' detail=' + error.detail : ''}`);
    });
  }

  const known = id => { if (typeof id !== 'string' || !SITE_ID.test(id) || RESERVED.includes(id)) throw problem('invalid-request'); return id; };
  const routes = {
    'GET /sites': async () => list(),
    'POST /sites': async body => {
      const id = known(body.id);
      if (work.get(id) === 'working') throw problem('busy');
      await claim(id, async () => {
        if ((await containers()).has(id) || fs.existsSync(path.join(config.dataDir, names(id).settings))) throw problem('exists');
        await room(id);
      });
      begin(id, 'create');
      return { status: 202, body: { id, state: 'starting' } };
    },
    'POST /sites/start': async (body, id) => {
      known(id);
      if (work.get(id) === 'working') throw problem('busy');
      await claim(id, async () => {
        const parts = (await containers()).get(id);
        if (!parts && !fs.existsSync(path.join(config.dataDir, names(id).settings))) throw problem('unknown-site');
        if (parts?.openwa?.state !== 'running') await room(id);
      });
      begin(id, 'start');
      return { status: 202, body: { id, state: 'starting' } };
    },
    'POST /sites/stop': async (body, id) => {
      known(id);
      if (work.get(id) === 'working') throw problem('busy');
      const parts = (await containers()).get(id);
      if (!parts) throw problem('unknown-site');
      // The server first, so that nothing is sent to an OpenWA that is going; OpenWA gets the time it needs to
      // put its session away.
      if (parts.server) ok(await docker('POST', `/containers/${names(id).server}/stop?t=10`), 204, 304);
      if (parts.openwa) ok(await docker('POST', `/containers/${names(id).openwa}/stop?t=75`), 204, 304);
      work.delete(id);
      console.log(`provisioner stop ok site=${id}`);
      return { status: 200, body: { id, state: 'stopped' } };
    },
  };

  async function handle(req, res) {
    const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname, named = pathname.match(/^\/sites\/([^/]+)\/(start|stop)$/);
      if (req.method === 'GET' && pathname === '/health') return send(200, { ok: true });
      const given = Buffer.from(String(req.headers.authorization || '').replace(/^Bearer /, '')), secret = Buffer.from(config.secret);
      if (given.length !== secret.length || !crypto.timingSafeEqual(given, secret)) throw problem('not-allowed');
      const route = routes[`${req.method} ${named ? '/sites/' + named[2] : pathname}`];
      if (!route) throw problem(pathname === '/sites' || named ? 'method-not-allowed' : 'not-found');
      let body = {};
      if (req.method === 'POST') {
        let size = 0;
        const chunks = [];
        for await (const chunk of req) { size += chunk.length; if (size > MAX_BODY) throw problem('invalid-request'); chunks.push(chunk); }
        try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}; } catch { throw problem('invalid-request'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw problem('invalid-request');
      }
      const answer = await route(body, named ? named[1] : undefined);
      return send(answer.status || 200, answer.body || answer);
    } catch (error) {
      if (!res.headersSent && Object.hasOwn(STATUS, error.code)) return send(STATUS[error.code], { error: error.code });
      console.error(`provisioner request failed route=${req.method} ${String(req.url).split('?')[0]} error=${error.code || error.name}${error.detail ? ' detail=' + error.detail : ''}`);
      if (!res.headersSent) send(500, { error: 'internal' });
    }
  }
  return { handle, list };
}

function configFromEnv(env = process.env) {
  const need = name => { if (!env[name]) throw new Error(name + ' is not set'); return env[name]; };
  const secret = fs.readFileSync(need('WA_SCRM_PROVISIONER_SECRET_FILE'), 'utf8').trim();
  if (secret.length < 32) throw new Error('the shared secret must be at least 32 characters long');
  const runAs = env.WA_SCRM_RUN_AS || '1000:1000';
  if (!/^\d+:\d+$/.test(runAs)) throw new Error('WA_SCRM_RUN_AS must be <uid>:<gid>');
  return {
    secret, runAs, serverImage: need('WA_SCRM_SERVER_IMAGE'), openwaImage: need('WA_SCRM_OPENWA_IMAGE'), hostDataDir: need('WA_SCRM_HOST_DATA_DIR'), dataDir: need('WA_SCRM_DATA_DIR'),
    hostAiEnv: env.WA_SCRM_HOST_AI_ENV || '', network: env.WA_SCRM_NETWORK || 'wa-scrm',
    maxSites: Number(env.WA_SCRM_MAX_SITES) || 4, minFreeMb: Number(env.WA_SCRM_MIN_FREE_MB) || 1400, openwaMemoryMb: Number(env.WA_SCRM_OPENWA_MEMORY_MB) || 1536, serverMemoryMb: Number(env.WA_SCRM_SERVER_MEMORY_MB) || 256,
  };
}
// The host's free memory in MB, as the kernel reckons what can be had without swapping.
const hostFreeMb = () => Number(fs.readFileSync('/proc/meminfo', 'utf8').match(/^MemAvailable:\s+(\d+) kB/m)[1]) / 1024;

if (require.main === module) {
  const config = configFromEnv();
  const provisioner = create({ config, docker: engine(process.env.WA_SCRM_DOCKER_SOCKET || '/var/run/docker.sock'), freeMb: hostFreeMb });
  const server = http.createServer(provisioner.handle);
  server.listen(Number(process.env.WA_SCRM_PROVISIONER_PORT) || 8090, '0.0.0.0', () => console.log('provisioner listening port=' + server.address().port));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}

module.exports = { create, engine, configFromEnv, openwaAddress, SITE_ID, RESERVED };
```

#### `site-provisioner.test.cjs`

**New file 2.4** — `work/wa-replica/site-provisioner.test.cjs`. The file does not exist yet. Create it with exactly this content (263 lines; the file ends with one newline):

```text
// Tests of the provisioner against a stand-in Docker Engine (listening on a socket in the test's own folder) and a
// stand-in OpenWA. No real container is made.
// Run with Node 22.13 or newer:  node --test work/wa-replica/site-provisioner.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { create, engine, configFromEnv, openwaAddress, RESERVED } = require('./site-provisioner.cjs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-scrm-prov-'));
// The path of a socket can be about a hundred characters long; the folder for temporary files may lie deeper.
const socketDir = Buffer.byteLength(tmp) < 80 ? tmp : fs.mkdtempSync('/tmp/wa-scrm-prov-');
const socket = path.join(socketDir, 'docker.sock'), dataDir = path.join(tmp, 'data');
fs.mkdirSync(dataDir);
const SECRET = 'a-shared-secret-of-forty-characters-0000';
const config = { secret: SECRET, runAs: `${process.getuid()}:${process.getgid()}`, serverImage: 'wa-scrm-server:test', openwaImage: 'openwa:test@sha256:abc', hostDataDir: '/srv/wa-scrm/data', dataDir, hostAiEnv: '/srv/wa-scrm/ai.env', network: 'wa-scrm', maxSites: 2, minFreeMb: 1400, openwaMemoryMb: 1536, serverMemoryMb: 256 };
const logged = [];
for (const level of ['log', 'error']) {
  const original = console[level];
  console[level] = (...args) => { logged.push(args.join(' ')); if (!String(args[0]).startsWith('provisioner ')) original(...args); };
}

// ---- the stand-in Docker Engine ----
// containers: name → { spec, state: 'created' | 'running' | 'exited', polls }. calls: what was asked, in order.
// mood: how an OpenWA behaves after it was started — 'ok' (healthy at the second look), 'never', 'dies'.
const containers = new Map(), volumes = new Set(), calls = [];
let mood = 'ok', free = 4000;
const isOpenwa = c => c.spec.Labels['wa-scrm.part'] === 'openwa';
const health = c => (!isOpenwa(c) ? '' : mood === 'ok' && c.polls >= 2 ? 'healthy' : 'starting');
const fake = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://docker'), chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : undefined;
    const send = (status, answer) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(answer === undefined ? '' : JSON.stringify(answer)); };
    const one = url.pathname.match(/^\/containers\/([^/]+)\/(start|stop|json)$/);
    if (req.method !== 'GET') calls.push(`${req.method} ${url.pathname}${url.search.startsWith('?name=') ? url.search : ''}`);
    if (req.method === 'GET' && url.pathname === '/containers/json') {
      return send(200, [...containers].map(([name, c]) => ({ Id: name, Names: ['/' + name], Labels: c.spec.Labels, State: c.state, Status: c.state === 'running' ? `Up 3 seconds${health(c) ? ` (${health(c) === 'healthy' ? 'healthy' : 'health: starting'})` : ''}` : c.state === 'exited' ? 'Exited (0) 2 seconds ago' : 'Created' })));
    }
    if (req.method === 'POST' && url.pathname === '/containers/create') {
      const name = url.searchParams.get('name');
      if (containers.has(name)) return send(409, { message: 'Conflict. The container name is already in use' });
      if (body.Image === 'no-such-image') return send(404, { message: 'No such image: no-such-image' });
      containers.set(name, { spec: body, state: 'created', polls: 0 });
      return send(201, { Id: name });
    }
    if (one) {
      const c = containers.get(one[1]);
      if (!c) return send(404, { message: 'No such container: ' + one[1] });
      if (one[2] === 'start') { if (c.state === 'running') return send(304); Object.assign(c, { state: 'running', polls: 0 }); return send(204); }
      if (one[2] === 'stop') { if (c.state !== 'running') return send(304); c.state = 'exited'; return send(204); }
      c.polls += 1;
      if (isOpenwa(c) && mood === 'dies' && c.polls >= 2) c.state = 'exited';
      return send(200, { Config: { Env: c.spec.Env }, State: { Running: c.state === 'running', Health: isOpenwa(c) ? { Status: health(c) } : undefined } });
    }
    if (url.pathname === '/volumes/create') { volumes.add(body.Name); return send(201, { Name: body.Name }); }
    const volume = url.pathname.match(/^\/volumes\/([^/]+)$/);
    if (volume) return send(volumes.has(volume[1]) ? 200 : 404, volumes.has(volume[1]) ? { Name: volume[1] } : { message: 'no such volume' });
    return send(404, { message: 'page not found' });
  });
});
// ---- the stand-in OpenWA: gives a restricted key to whoever shows the key its container was started with ----
const keys = [];
const openwa = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const started = [...containers.values()].filter(isOpenwa).flatMap(c => c.spec.Env).filter(line => line.startsWith('API_MASTER_KEY=')).map(line => line.slice(15));
    if (req.method !== 'POST' || req.url !== '/api/auth/api-keys' || !started.includes(req.headers['x-api-key'])) { res.writeHead(401); return res.end('{}'); }
    const asked = JSON.parse(Buffer.concat(chunks).toString('utf8')), apiKey = `owa_restricted_${keys.length + 1}_${'k'.repeat(40)}`;
    keys.push({ ...asked, apiKey });
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: 'k' + keys.length, ...asked, apiKey }));
  });
});

let base, openwaBase;
const provisioner = () => create({ config, docker: engine(socket), freeMb: () => free, openwaUrl: () => openwaBase, wait: () => new Promise(resolve => setImmediate(resolve)), healthWaitMs: 150 });
let front;
const call = (pathname, { method = 'GET', body, secret = SECRET } = {}) =>
  fetch(base + pathname, { method, headers: { ...(secret ? { Authorization: 'Bearer ' + secret } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) })
    .then(async response => ({ status: response.status, json: await response.json().catch(() => null) }));
const stateOf = async id => (await call('/sites')).json.sites.find(site => site.id === id);
// Waits until what goes on in the background for a sub-site has come to an end.
async function settled(id) {
  for (let i = 0; i < 400; i++) {
    const site = await stateOf(id);
    if (site && site.state !== 'starting') return site;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error('still starting: ' + id);
}
const changes = from => calls.slice(from);
const settingsOf = id => fs.readFileSync(path.join(dataDir, `openwa-${id}.env`), 'utf8');

test.before(async () => {
  await new Promise(resolve => fake.listen(socket, resolve));
  await new Promise(resolve => openwa.listen(0, '127.0.0.1', resolve));
  openwaBase = `http://127.0.0.1:${openwa.address().port}`;
  front = http.createServer(provisioner().handle);
  await new Promise(resolve => front.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${front.address().port}`;
});
test.after(() => {
  for (const server of [fake, openwa, front]) { server.closeAllConnections(); server.close(); }
  for (const folder of new Set([tmp, socketDir])) fs.rmSync(folder, { recursive: true, force: true });
});

test('nobody without the secret; only what the provisioner knows; an id is a sub-site\'s id and none of the platform\'s own names', async () => {
  assert.deepEqual([(await call('/health', { secret: '' })).json, (await call('/sites', { secret: '' })).json, (await call('/sites', { secret: SECRET + 'x' })).status, (await call('/sites', { secret: SECRET.slice(1) })).status], [{ ok: true }, { error: 'not-allowed' }, 401, 401]);
  assert.deepEqual((await call('/sites')).json, { sites: [], room: { max: 2, running: 0, freeMb: 4000, minFreeMb: 1400, canStart: true } });
  assert.deepEqual([(await call('/nothing')).status, (await call('/sites', { method: 'DELETE' })).status, (await call('/sites/t1/start')).status, (await call('/sites/t1/remove', { method: 'POST' })).status], [404, 405, 405, 404]);
  const from = calls.length;
  for (const id of [undefined, '', 'T1', 'a b', '../x', 'x/y', '-x', 'x'.repeat(41), 7, ['t1'], ...RESERVED]) {
    assert.deepEqual((await call('/sites', { method: 'POST', body: { id } })).json, { error: 'invalid-request' }, JSON.stringify(id));
  }
  for (const pathname of ['/sites/master/start', '/sites/T1/stop', '/sites/' + 'x'.repeat(41) + '/start']) assert.equal((await call(pathname, { method: 'POST' })).status, 400, pathname);
  assert.deepEqual([(await call('/sites', { method: 'POST', body: 'not json' })).status, (await call('/sites', { method: 'POST', body: '[]' })).status, (await call('/sites', { method: 'POST', body: JSON.stringify({ id: 't1', pad: 'x'.repeat(5000) }) })).status], [400, 400, 400]);
  assert.deepEqual([(await call('/sites/nobody/start', { method: 'POST' })).json, (await call('/sites/nobody/stop', { method: 'POST' })).json], [{ error: 'unknown-site' }, { error: 'unknown-site' }]);
  assert.deepEqual(changes(from), [], 'none of this reached the engine with a change');
  assert.equal(openwaAddress('t1'), 'http://wa-scrm-openwa-t1:2785');
});

test('a new sub-site: its OpenWA with a key of the platform\'s choice, a restricted key and a secret in a private settings file, then its server — each after the fixed recipe', async () => {
  const from = calls.length;
  const made = await call('/sites', { method: 'POST', body: { id: 't1', image: 'evil:latest', command: ['sh'], memory: 1 } });
  assert.deepEqual([made.status, made.json], [202, { id: 't1', state: 'starting' }]);
  assert.deepEqual((await call('/sites', { method: 'POST', body: { id: 't1' } })).json, { error: 'busy' }, 'not twice at once');
  assert.deepEqual(await settled('t1'), { id: 't1', state: 'ready' });
  assert.deepEqual(changes(from), ['POST /volumes/create', 'POST /containers/create?name=wa-scrm-openwa-t1', 'POST /containers/wa-scrm-openwa-t1/start', 'POST /containers/create?name=wa-scrm-site-t1', 'POST /containers/wa-scrm-site-t1/start']);
  const own = containers.get('wa-scrm-openwa-t1').spec, masterKey = own.Env.find(line => line.startsWith('API_MASTER_KEY=')).slice(15);
  assert.match(masterKey, /^[A-Za-z0-9_-]{48}$/);
  assert.deepEqual(own, {
    Image: 'openwa:test@sha256:abc',
    Env: ['NODE_ENV=production', 'TZ=UTC', 'HOME=/tmp', 'XDG_CONFIG_HOME=/tmp/.config', 'XDG_CACHE_HOME=/tmp/.cache', 'PORT=2785', 'ENGINE_TYPE=whatsapp-web.js', 'AUTO_START_SESSIONS=true', 'SSRF_ALLOWED_HOSTS=wa-scrm-site-t1', 'WEBHOOK_MEDIA_INLINE_MAX_BYTES=0', 'RESOLVE_LID_TO_PHONE=true', 'API_MASTER_KEY=' + masterKey],
    Labels: { 'wa-scrm.site': 't1', 'wa-scrm.part': 'openwa' },
    HostConfig: {
      NetworkMode: 'wa-scrm', RestartPolicy: { Name: 'unless-stopped' }, Memory: 1536 * 1048576, PidsLimit: 2048, ReadonlyRootfs: true,
      CapDrop: ['ALL'], CapAdd: ['CHOWN', 'DAC_OVERRIDE', 'FOWNER', 'KILL', 'SETGID', 'SETUID'], SecurityOpt: ['no-new-privileges:true'], Tmpfs: { '/tmp': '' },
      Mounts: [{ Type: 'volume', Source: 'wa-scrm-openwa-t1', Target: '/app/data' }], LogConfig: { Type: 'json-file', Config: { 'max-size': '10m', 'max-file': '3' } },
    },
  });
  assert.deepEqual(containers.get('wa-scrm-site-t1').spec, {
    Image: 'wa-scrm-server:test', Cmd: ['node', 'work/wa-replica/serve.cjs', '8080'], User: config.runAs,
    Env: ['WA_SCRM_DATA_DIR=/data', 'WA_SCRM_SITE_ID=t1', 'WA_SCRM_OPENWA_ENV=/data/openwa-t1.env', 'WA_SCRM_LISTEN=0.0.0.0', 'WA_SCRM_AI_ENV=/run/wa-scrm/ai.env'],
    Labels: { 'wa-scrm.site': 't1', 'wa-scrm.part': 'server' },
    HostConfig: {
      NetworkMode: 'wa-scrm', RestartPolicy: { Name: 'unless-stopped' }, Memory: 256 * 1048576, PidsLimit: 256, ReadonlyRootfs: true, Init: true,
      CapDrop: ['ALL'], SecurityOpt: ['no-new-privileges:true'], Tmpfs: { '/tmp': '' },
      Mounts: [{ Type: 'bind', Source: '/srv/wa-scrm/data', Target: '/data' }, { Type: 'bind', Source: '/srv/wa-scrm/ai.env', Target: '/run/wa-scrm/ai.env', ReadOnly: true }], LogConfig: { Type: 'json-file', Config: { 'max-size': '10m', 'max-file': '3' } },
    },
  }, 'what the caller sent beside the id — an image, a command, a limit — is nowhere');
  assert.deepEqual([volumes.has('wa-scrm-openwa-t1'), keys.length, keys[0].name, keys[0].role], [true, 1, 'wa-scrm-t1', 'operator']);
  // the settings file: where the OpenWA is, the restricted key, where and with what secret it delivers; private
  const settings = settingsOf('t1'), lines = Object.fromEntries(settings.trim().split('\n').map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
  assert.deepEqual([Object.keys(lines), lines.OPENWA_BASE_URL, lines.OPENWA_API_KEY, lines.OPENWA_HOOK_URL, /^[0-9a-f]{64}$/.test(lines.OPENWA_HOOK_SECRET)], [['OPENWA_BASE_URL', 'OPENWA_API_KEY', 'OPENWA_HOOK_URL', 'OPENWA_HOOK_SECRET'], openwaBase, keys[0].apiKey, 'http://wa-scrm-site-t1:8080/api/wa/hook', true]);
  assert.deepEqual([fs.statSync(path.join(dataDir, 'openwa-t1.env')).mode & 0o777, settings.includes(masterKey)], [0o600, false], 'private, and the key OpenWA was started with is not in it');
  assert.deepEqual((await call('/sites')).json.room, { max: 2, running: 1, freeMb: 4000, minFreeMb: 1400, canStart: true });
  assert.deepEqual((await call('/sites', { method: 'POST', body: { id: 't1' } })).json, { error: 'exists' });
});

test('no room: a sub-site too many, or too little memory left on the host — and then nothing is made; two requests at once cannot both take the last place', async () => {
  const from = calls.length;
  const [first, second] = await Promise.all([call('/sites', { method: 'POST', body: { id: 't2' } }), call('/sites', { method: 'POST', body: { id: 't3' } })]);
  assert.deepEqual([first.status, second.status].sort(), [202, 409], 'one place was left');
  const taken = first.status === 202 ? 't2' : 't3', refused = taken === 't2' ? 't3' : 't2';
  assert.deepEqual([(first.status === 409 ? first : second).json, (await settled(taken)).state], [{ error: 'full' }, 'ready']);
  assert.deepEqual([(await call('/sites', { method: 'POST', body: { id: refused } })).json, (await stateOf(refused)), (await call('/sites')).json.room.canStart], [{ error: 'full' }, undefined, false]);
  assert.equal(changes(from).filter(line => line.includes(refused)).length, 0, 'nothing was made for the one that was refused');
  // a place becomes free when a sub-site is stopped; too little memory is the other reason
  assert.equal((await call(`/sites/${taken}/stop`, { method: 'POST' })).status, 200);
  free = 1399;
  const low = calls.length;
  assert.deepEqual([(await call('/sites', { method: 'POST', body: { id: refused } })).json, (await call(`/sites/${taken}/start`, { method: 'POST' })).json, (await call('/sites')).json.room], [{ error: 'low-memory' }, { error: 'low-memory' }, { max: 2, running: 1, freeMb: 1399, minFreeMb: 1400, canStart: false }]);
  assert.deepEqual(changes(low), []);
  free = 4000;
});

test('stop and start: the server is stopped first, then OpenWA; started again it has what it had, and a sub-site that runs is simply left running', async () => {
  const before = settingsOf('t1'), from = calls.length, asked = keys.length;
  assert.deepEqual((await call('/sites/t1/stop', { method: 'POST' })).json, { id: 't1', state: 'stopped' });
  assert.deepEqual(changes(from), ['POST /containers/wa-scrm-site-t1/stop', 'POST /containers/wa-scrm-openwa-t1/stop']);
  assert.deepEqual([await stateOf('t1'), (await call('/sites/t1/stop', { method: 'POST' })).status], [{ id: 't1', state: 'stopped' }, 200]);
  const again = calls.length;
  assert.equal((await call('/sites/t1/start', { method: 'POST' })).status, 202);
  assert.deepEqual([await settled('t1'), changes(again), keys.length, settingsOf('t1') === before], [{ id: 't1', state: 'ready' }, ['POST /containers/wa-scrm-openwa-t1/start', 'POST /containers/wa-scrm-site-t1/start'], asked, true], 'no container, no key and no settings file is made anew');
  assert.equal((await call('/sites/t1/start', { method: 'POST' })).status, 202, 'starting what runs is no mistake');
  assert.deepEqual(await settled('t1'), { id: 't1', state: 'ready' });
});

test('a sub-site that was moved here — its OpenWA\'s data and its settings file exist — is started as it is; one whose making stopped half-way is finished; what cannot be put together says why', async () => {
  for (const id of ['t2', 't3']) if (containers.has('wa-scrm-openwa-' + id)) await call(`/sites/${id}/stop`, { method: 'POST' });
  // moved here: the volume and the settings file, no container
  volumes.add('wa-scrm-openwa-m1');
  fs.writeFileSync(path.join(dataDir, 'openwa-m1.env'), 'OPENWA_BASE_URL=http://wa-scrm-openwa-m1:2785\nOPENWA_API_KEY=kept\nOPENWA_HOOK_URL=http://wa-scrm-site-m1:8080/api/wa/hook\nOPENWA_HOOK_SECRET=kept\n', { mode: 0o600 });
  const asked = keys.length;
  assert.deepEqual((await call('/sites', { method: 'POST', body: { id: 'm1' } })).json, { error: 'exists' }, 'it is not a new one');
  assert.equal((await call('/sites/m1/start', { method: 'POST' })).status, 202);
  assert.deepEqual([await settled('m1'), containers.get('wa-scrm-openwa-m1').spec.Env.some(line => line.startsWith('API_MASTER_KEY=')), keys.length, settingsOf('m1').includes('OPENWA_API_KEY=kept')], [{ id: 'm1', state: 'ready' }, false, asked, true], 'no key of the platform\'s choice, no new restricted key, the settings as they came');
  await call('/sites/m1/stop', { method: 'POST' });
  // half-way: the OpenWA was made and started, then the provisioner went away before the settings were written
  mood = 'never';
  assert.equal((await call('/sites', { method: 'POST', body: { id: 'h1' } })).status, 202);
  assert.deepEqual(await settled('h1'), { id: 'h1', state: 'failed', reason: 'openwa-not-healthy' });
  assert.equal(fs.existsSync(path.join(dataDir, 'openwa-h1.env')), false);
  mood = 'ok';
  assert.equal((await call('/sites/h1/start', { method: 'POST' })).status, 202);
  assert.deepEqual([await settled('h1'), keys.at(-1).name, settingsOf('h1').includes(keys.at(-1).apiKey)], [{ id: 'h1', state: 'ready' }, 'wa-scrm-h1', true], 'finished with the key its OpenWA was started with');
  await call('/sites/h1/stop', { method: 'POST' });
  // the settings file without the data, and the data without the settings file
  fs.writeFileSync(path.join(dataDir, 'openwa-o1.env'), 'OPENWA_BASE_URL=x\n', { mode: 0o600 });
  assert.equal((await call('/sites/o1/start', { method: 'POST' })).status, 202);
  assert.deepEqual(await settled('o1'), { id: 'o1', state: 'failed', reason: 'data-missing' });
  fs.rmSync(path.join(dataDir, 'openwa-m1.env'));
  assert.equal((await call('/sites/m1/start', { method: 'POST' })).status, 202);
  assert.deepEqual(await settled('m1'), { id: 'm1', state: 'failed', reason: 'settings-missing' });
  assert.deepEqual((await stateOf('t1')), { id: 't1', state: 'ready' }, 'the others are as they were');
});

test('an OpenWA that stops again, or an image that is not there: the sub-site is failed with the reason and takes no place', async () => {
  mood = 'dies';
  assert.equal((await call('/sites', { method: 'POST', body: { id: 'd1' } })).status, 202);
  assert.deepEqual(await settled('d1'), { id: 'd1', state: 'failed', reason: 'openwa-stopped' });
  mood = 'ok';
  const other = create({ config: { ...config, openwaImage: 'no-such-image' }, docker: engine(socket), freeMb: () => free, openwaUrl: () => openwaBase, wait: () => new Promise(resolve => setImmediate(resolve)), healthWaitMs: 150 });
  const server = http.createServer(other.handle);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const at = `http://127.0.0.1:${server.address().port}`, headers = { Authorization: 'Bearer ' + SECRET, 'Content-Type': 'application/json' };
    assert.equal((await fetch(at + '/sites', { method: 'POST', headers, body: JSON.stringify({ id: 'i1' }) })).status, 202);
    let site;
    for (let i = 0; i < 200 && (!site || site.state === 'starting'); i++) { await new Promise(resolve => setTimeout(resolve, 5)); site = (await (await fetch(at + '/sites', { headers })).json()).sites.find(s => s.id === 'i1'); }
    assert.deepEqual(site, { id: 'i1', state: 'failed', reason: 'engine' });
  } finally {
    server.closeAllConnections(); server.close();
  }
  assert.deepEqual((await call('/sites')).json.room.running, 1, 'only the one that runs takes a place');
});

test('the settings from the environment: what is needed is asked for, the secret is long enough, the rest has its defaults', () => {
  const secretFile = path.join(tmp, 'secret');
  fs.writeFileSync(secretFile, SECRET + '\n');
  const env = { WA_SCRM_PROVISIONER_SECRET_FILE: secretFile, WA_SCRM_SERVER_IMAGE: 'server:1', WA_SCRM_OPENWA_IMAGE: 'openwa:1', WA_SCRM_HOST_DATA_DIR: '/host/data', WA_SCRM_DATA_DIR: '/data' };
  assert.deepEqual(configFromEnv(env), { secret: SECRET, runAs: '1000:1000', serverImage: 'server:1', openwaImage: 'openwa:1', hostDataDir: '/host/data', dataDir: '/data', hostAiEnv: '', network: 'wa-scrm', maxSites: 4, minFreeMb: 1400, openwaMemoryMb: 1536, serverMemoryMb: 256 });
  assert.deepEqual(configFromEnv({ ...env, WA_SCRM_MAX_SITES: '3', WA_SCRM_MIN_FREE_MB: '900', WA_SCRM_RUN_AS: '1001:1002', WA_SCRM_NETWORK: 'other', WA_SCRM_HOST_AI_ENV: '/host/ai.env' }).maxSites, 3);
  for (const name of Object.keys(env)) assert.throws(() => configFromEnv({ ...env, [name]: '' }), new RegExp(name), name);
  fs.writeFileSync(secretFile, 'too short');
  assert.throws(() => configFromEnv(env), /at least 32/);
  fs.writeFileSync(secretFile, SECRET);
  assert.throws(() => configFromEnv({ ...env, WA_SCRM_RUN_AS: 'root' }), /WA_SCRM_RUN_AS/);
});

test('the lines name the action, the sub-site and the outcome — never a key or a secret', () => {
  const lines = logged.filter(line => line.startsWith('provisioner '));
  for (const line of ['provisioner create ok site=t1', 'provisioner stop ok site=t1', 'provisioner start ok site=t1', 'provisioner create failed site=h1 error=openwa-not-healthy', 'provisioner start failed site=m1 error=settings-missing', 'provisioner create failed site=d1 error=openwa-stopped']) assert(lines.includes(line), line + '\n' + lines.join('\n'));
  assert(lines.some(line => line.startsWith('provisioner create failed site=i1 error=engine detail=404 No such image')), lines.join('\n'));
  const all = logged.join('\n'), secrets = [SECRET, ...keys.map(key => key.apiKey), ...[...containers.values()].flatMap(c => c.spec.Env).filter(line => line.startsWith('API_MASTER_KEY=')).map(line => line.slice(15))];
  assert(secrets.length > 4);
  for (const secret of secrets) assert(!all.includes(secret), 'a secret in the log');
});
```

**Verify**: `sha256sum work/wa-replica/serve.cjs work/wa-replica/site-api.test.cjs work/wa-replica/site-provisioner.cjs work/wa-replica/site-provisioner.test.cjs` → `41ec391efa5541010c0e4854eeb2dbe49de074f2fb1512a7005ca7731733dc93`, `c38b5125f28acee6817b52effce3420f6d4ef678d24c9381f85809e541cb162e`, `af7e64e23143b140a9bdb498e6f5c8d5a3d526e58ce62c6a56fcf13aec68e114`, `6e4ee3a6dc7cb6b6296b1cbdda9e8857f68b0edf2072d8af66da30172e2351cb`; `node --check` on `work/wa-replica/serve.cjs` and `site-provisioner.cjs` exits 0; `$NODE --test work/wa-replica/site-provisioner.test.cjs` → `pass 8`, `fail 0`; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 16`, `fail 0`. If a checksum does not match, restore the file with `git checkout 51a2745 -- <file>` (delete it if it is a new file) and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 3: The files to build and run the platform

Create the folder `deploy/`.

#### `.dockerignore`

**New file 3.1** — `.dockerignore`. The file does not exist yet. Create it with exactly this content (4 lines; the file ends with one newline):

```text
.git
.claude
plans
replica
```

#### `deploy/Dockerfile`

**New file 3.2** — `deploy/Dockerfile`. The file does not exist yet. Create it with exactly this content (11 lines; the file ends with one newline):

```text
# The image of the platform's servers: a sub-site's server, the first server ("master") and the provisioner all
# run from it, with different commands. Build from the repository root:
#   docker build -f deploy/Dockerfile -t wa-scrm-server:current .
FROM node:24-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54
WORKDIR /app
COPY work/wa-replica ./work/wa-replica
COPY outputs/wa-replica-prototype ./outputs/wa-replica-prototype
USER 1000:1000
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:8080/api/site/status').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "work/wa-replica/serve.cjs", "8080"]
```

#### `deploy/gateway.conf`

**New file 3.3** — `deploy/gateway.conf`. The file does not exist yet. Create it with exactly this content (58 lines; the file ends with one newline):

```text
# The gateway of the platform: the one address everybody opens. It runs in a container on the platform's own
# network and finds the others by the names of their containers, through Docker's own name service — when a
# sub-site is made, started or stopped, nothing has to be written here.
#   the page, signing in, the accounts, the model relay     -> the first server (wa-scrm-master)
#   a sub-site's data and WhatsApp link, for its employee    -> the server of the sub-site the cookie scrm_site names
#   /site/<id>/api/data and /site/<id>/api/wa/... (the supervisor page) -> the server of the sub-site <id>
# The cookie and the name only say where a request goes: every server checks the session itself.
worker_processes 2;
pid /tmp/nginx.pid;
error_log /dev/stderr warn;
events { worker_connections 1024; }
http {
    # Docker's name service. A name is asked again after a few seconds, so a sub-site that was just started is found.
    resolver 127.0.0.11 valid=5s ipv6=off;
    access_log /dev/stdout;
    # The app limits its own requests (a save up to 8 MB, a file to send up to 16 MB); this only has to be above that.
    client_max_body_size 20m;
    client_body_temp_path /tmp/body;
    proxy_temp_path /tmp/proxy;
    fastcgi_temp_path /tmp/fastcgi;
    uwsgi_temp_path /tmp/uwsgi;
    scgi_temp_path /tmp/scgi;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    # A sub-site that is stopped is found out quickly; a page that waits for news of its WhatsApp link may wait.
    proxy_connect_timeout 3s;
    proxy_read_timeout 120s;

    # The sub-site an employee's cookie names — only if it is a name.
    map $cookie_scrm_site $scrm_cookie_site {
        default "";
        "~^(?<name>[a-z0-9][a-z0-9-]*)$" $name;
    }

    server {
        listen 8141;

        location / {
            set $scrm_upstream "wa-scrm-master";
            proxy_pass http://$scrm_upstream:8080;
        }
        location = /api/data {
            set $scrm_upstream "wa-scrm-master";
            if ($scrm_cookie_site != "") { set $scrm_upstream "wa-scrm-site-$scrm_cookie_site"; }
            proxy_pass http://$scrm_upstream:8080;
        }
        location /api/wa/ {
            set $scrm_upstream "wa-scrm-master";
            if ($scrm_cookie_site != "") { set $scrm_upstream "wa-scrm-site-$scrm_cookie_site"; }
            proxy_pass http://$scrm_upstream:8080;
        }
        location ~ ^/site/(?<scrm_named>[a-z0-9][a-z0-9-]*)/api/(data$|wa/) {
            set $scrm_upstream "wa-scrm-site-$scrm_named";
            proxy_pass http://$scrm_upstream:8080;
        }
    }
}
```

#### `deploy/compose.yml`

**New file 3.4** — `deploy/compose.yml`. The file does not exist yet. Create it with exactly this content (110 lines; the file ends with one newline):

```text
# The part of the platform that is always there: the gateway, the first server ("master") and the provisioner.
# The two containers of each sub-site are made by the provisioner on the same network.
# Start from the repository root, with the settings of the machine in a file (see platform.env.template):
#   docker compose -f deploy/compose.yml --env-file <the settings file> up -d
name: wa-scrm
services:
  gateway:
    image: nginx:1.27-alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10
    container_name: wa-scrm-gateway
    restart: unless-stopped
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
    security_opt:
      - 'no-new-privileges:true'
    mem_limit: 128m
    ports:
      - '${WA_SCRM_PORT:-8141}:8141'
    volumes:
      - ./gateway.conf:/etc/nginx/nginx.conf:ro
    networks:
      - platform
    logging: &logging
      driver: json-file
      options:
        max-size: 10m
        max-file: '3'

  # The first server: the page, signing in, the accounts and the model relay. It is no employee's sub-site.
  master:
    image: ${WA_SCRM_SERVER_IMAGE:-wa-scrm-server:current}
    container_name: wa-scrm-master
    restart: unless-stopped
    init: true
    user: '${WA_SCRM_RUN_AS:-1000:1000}'
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    security_opt:
      - 'no-new-privileges:true'
    mem_limit: 256m
    environment:
      - WA_SCRM_DATA_DIR=/data
      - WA_SCRM_SITE_ID=master
      - WA_SCRM_LISTEN=0.0.0.0
      - WA_SCRM_AI_ENV=/run/wa-scrm/ai.env
      - WA_SCRM_PROVISIONER_URL=http://wa-scrm-provisioner:8090
      - WA_SCRM_PROVISIONER_SECRET_FILE=/run/wa-scrm/provisioner.secret
    volumes:
      - ${WA_SCRM_HOST_DATA_DIR:?}:/data
      - ${WA_SCRM_HOST_AI_ENV:?}:/run/wa-scrm/ai.env:ro
      - ${WA_SCRM_HOST_SECRET:?}:/run/wa-scrm/provisioner.secret:ro
    networks:
      - platform
    logging: *logging

  # The provisioner: the only container that has the Docker socket. Nothing of it is published; the first server
  # reaches it on the platform's network and proves itself with the shared secret.
  provisioner:
    image: ${WA_SCRM_SERVER_IMAGE:-wa-scrm-server:current}
    container_name: wa-scrm-provisioner
    restart: unless-stopped
    init: true
    command: ['node', 'work/wa-replica/site-provisioner.cjs']
    user: '${WA_SCRM_RUN_AS:-1000:1000}'
    group_add:
      - '${WA_SCRM_DOCKER_GID:?}'
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    security_opt:
      - 'no-new-privileges:true'
    mem_limit: 128m
    healthcheck:
      test: ['CMD', 'node', '-e', "fetch('http://127.0.0.1:8090/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
    environment:
      - WA_SCRM_PROVISIONER_SECRET_FILE=/run/wa-scrm/provisioner.secret
      - WA_SCRM_SERVER_IMAGE=${WA_SCRM_SERVER_IMAGE:-wa-scrm-server:current}
      - WA_SCRM_OPENWA_IMAGE=${WA_SCRM_OPENWA_IMAGE:-ghcr.io/rmyndharis/openwa:0.31.0@sha256:cfa076443c09d5cb7add0b8b446dc4aee857374e8af8168d376fdacc926d599d}
      - WA_SCRM_HOST_DATA_DIR=${WA_SCRM_HOST_DATA_DIR:?}
      - WA_SCRM_DATA_DIR=/data
      - WA_SCRM_HOST_AI_ENV=${WA_SCRM_HOST_AI_ENV:?}
      - WA_SCRM_NETWORK=wa-scrm
      - WA_SCRM_RUN_AS=${WA_SCRM_RUN_AS:-1000:1000}
      - WA_SCRM_MAX_SITES=${WA_SCRM_MAX_SITES:-4}
      - WA_SCRM_MIN_FREE_MB=${WA_SCRM_MIN_FREE_MB:-1400}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ${WA_SCRM_HOST_DATA_DIR:?}:/data
      - ${WA_SCRM_HOST_SECRET:?}:/run/wa-scrm/provisioner.secret:ro
    networks:
      - platform
    logging: *logging

networks:
  platform:
    name: wa-scrm
```

#### `deploy/platform.env.template`

**New file 3.5** — `deploy/platform.env.template`. The file does not exist yet. Create it with exactly this content (20 lines; the file ends with one newline):

```text
# Settings of one machine for deploy/compose.yml. Copy this file to a private place outside the repository,
# fill it in, and name it with --env-file. It holds paths and numbers only — no key and no password.

# The platform's data folder (accounts, the sub-sites' data, the settings files of their WhatsApp links).
# It must belong to the user below and be closed to everyone else (mode 700).
WA_SCRM_HOST_DATA_DIR=/home/ubuntu/workspace/secrets/wa-scrm-data
# The settings file of the model service (see README).
WA_SCRM_HOST_AI_ENV=/home/ubuntu/workspace/secrets/wa-scrm-ai.env
# A file with the secret the first server and the provisioner share: one line, at least 32 characters,
# readable by the user below only. Make it once:  head -c 48 /dev/urandom | base64 > <file>
WA_SCRM_HOST_SECRET=/home/ubuntu/workspace/secrets/wa-scrm-provisioner.secret
# The user the servers run as (owner of the data folder), and the group that may use the Docker socket:
#   id -u; id -g; getent group docker | cut -d: -f3
WA_SCRM_RUN_AS=1000:1000
WA_SCRM_DOCKER_GID=
# The port the gateway is opened on.
WA_SCRM_PORT=8141
# How many sub-sites may run, and how much memory (MB) must be free on the machine before one more is started.
WA_SCRM_MAX_SITES=4
WA_SCRM_MIN_FREE_MB=1400
```

#### `deploy/upgrade.sh`

**New file 3.6** — `deploy/upgrade.sh`. The file does not exist yet. Create it with exactly this content (28 lines; the file ends with one newline):

```text
#!/usr/bin/env bash
# Brings a machine's platform to the version of this checkout: builds the image of the servers, renews the three
# containers that are always there, and gives the server of every sub-site the new image. A sub-site's OpenWA is
# left alone, so no WhatsApp connection is interrupted. Run from anywhere, as a user that may use Docker:
#   bash deploy/upgrade.sh <the machine's settings file>
set -euo pipefail
SETTINGS=$(realpath "${1:?usage: bash deploy/upgrade.sh <settings file>}")
cd "$(dirname "$0")/.."
IMAGE=$(sed -n 's/^WA_SCRM_SERVER_IMAGE=//p' "$SETTINGS")
IMAGE=${IMAGE:-wa-scrm-server:current}
echo "building $IMAGE"
docker build -q -f deploy/Dockerfile -t "$IMAGE" . > /dev/null
docker compose -f deploy/compose.yml --env-file "$SETTINGS" up -d
for i in $(seq 1 60); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' wa-scrm-provisioner 2> /dev/null)" = healthy ] && break
  sleep 2
done
# The servers of the sub-sites: one that runs is made anew by the provisioner; one that is stopped is only
# removed and gets the new image when it is started the next time.
docker ps -a --filter label=wa-scrm.part=server --format '{{.Label "wa-scrm.site"}} {{.State}}' | while read -r SITE STATE; do
  docker rm -f "wa-scrm-site-$SITE" > /dev/null
  if [ "$STATE" = running ]; then
    docker exec -e SITE="$SITE" wa-scrm-master node -e "const secret=require('fs').readFileSync('/run/wa-scrm/provisioner.secret','utf8').trim();fetch('http://wa-scrm-provisioner:8090/sites/'+process.env.SITE+'/start',{method:'POST',headers:{Authorization:'Bearer '+secret}}).then(r=>{console.log('sub-site',process.env.SITE,r.status===202?'renewed':'NOT started: '+r.status);process.exit(r.status===202?0:1)})"
  else
    echo "sub-site $SITE is stopped; it gets the new image when it is started"
  fi
done
echo "done"
```

**Verify**: `sha256sum .dockerignore deploy/Dockerfile deploy/gateway.conf deploy/compose.yml deploy/platform.env.template deploy/upgrade.sh` → `ab2a44c68f7dcae4f264e46d87e0df92e5471e6197fca7c0dfd755fc46caff4c`, `c66f880cad0117f0f9efe03cbcec2a6f8566b7dabb783b1025c5c765d42e5773`, `fea9acd3eaf285b532faa08d1516c51a9d3b125203298f334181af916eb0940b`, `0d678c2f1837ac4011fe161b7c7ad51c619a30146b0224c0e2ade89145a33c74`, `3381e2467e36e1dc5dfe03ee0d58afc0edafa3ce55ab2be9bd49cfcaef56c313`, `bce69994be6945dc9ded532e9df67bffdb138a85cac9884a0d9819137748223a`; `bash -n deploy/upgrade.sh` exits 0; `ls -l deploy/upgrade.sh` shows an ordinary file that is not executable (`-rw-…`). Do not run any of these files. If a checksum does not match, delete the file and create it again; if it still does not match, STOP.

### Step 4: The validator holds the facts; the page comes out unchanged

#### `validate-scrm-lifecycle.cjs`

**Edit 4.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(siteSources['site-auth.cjs'].includes('async function createUser({ username, name, role, site = null, password, mustChange = true }) {'), 'an account made with a given password must be able to keep it');
assert(!/演示|原型|评审|本机|示例|体验/.test(masterSource) && !/WA_SITE|localStorage|sessionStorage/.test(masterSource), 'the supervisor page must not speak of a demonstration, nor touch the app or the browser\'s storage');
```

Replace them with:

```text
assert(siteSources['site-auth.cjs'].includes('async function createUser({ username, name, role, site = null, password, mustChange = true }) {'), 'an account made with a given password must be able to keep it');
// The platform in containers. The server listens where it is told to. The provisioner is the one part that talks
// to Docker: it checks the shared secret before anything else, takes nothing but the id of a sub-site from a
// request, and makes containers after its own fixed recipe. The images are pinned; only the gateway is published,
// and only the provisioner has the Docker socket.
const provisionerSource = read(path.join(__dirname, 'site-provisioner.cjs')), deploy = name => read(path.join(__dirname, '../../deploy', name));
assert(read(path.join(__dirname, 'serve.cjs')).includes("server.listen(port, process.env.WA_SCRM_LISTEN || '127.0.0.1', () => {"), 'the server must listen on this machine only unless it is told otherwise');
assert(provisionerSource.includes("if (given.length !== secret.length || !crypto.timingSafeEqual(given, secret)) throw problem('not-allowed');") && provisionerSource.indexOf("throw problem('not-allowed')") < provisionerSource.indexOf('const route = routes['), 'the provisioner must check the shared secret before it looks at what is asked');
assert.deepEqual([...new Set(provisionerSource.match(/(?<![.\w])body\.[A-Za-z]+/g))], ['body.id'], 'the provisioner must take nothing but the id of a sub-site from a request');
assert(provisionerSource.includes("const SITE_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;") && provisionerSource.includes("const RESERVED = ['master', 'gateway', 'provisioner'];") && provisionerSource.includes("const known = id => { if (typeof id !== 'string' || !SITE_ID.test(id) || RESERVED.includes(id)) throw problem('invalid-request'); return id; };"), 'the provisioner must accept only the id of a sub-site');
assert(!/child_process|execSync|spawn\(/.test(provisionerSource), 'the provisioner must talk to the Docker Engine only, and run no command itself');
assert(/^FROM node:24-slim@sha256:[0-9a-f]{64}$/m.test(deploy('Dockerfile')) && deploy('Dockerfile').includes('USER 1000:1000'), 'the image of the servers must be built on a pinned base and run as an ordinary user');
const compose = deploy('compose.yml');
assert.deepEqual([compose.split('/var/run/docker.sock:/var/run/docker.sock').length - 1, compose.split('\n    ports:').length - 1, compose.includes("      - '${WA_SCRM_PORT:-8141}:8141'"), /image: nginx:[0-9.]+-alpine@sha256:[0-9a-f]{64}\n/.test(compose)], [1, 1, true, true], 'only the provisioner may have the Docker socket, only the gateway a published port, and the gateway image must be pinned');
for (const required of ['resolver 127.0.0.11 valid=5s ipv6=off;', 'location ~ ^/site/(?<scrm_named>[a-z0-9][a-z0-9-]*)/api/(data$|wa/) {', 'if ($scrm_cookie_site != "") { set $scrm_upstream "wa-scrm-site-$scrm_cookie_site"; }', 'proxy_connect_timeout 3s;']) {
  assert(deploy('gateway.conf').includes(required), `deploy/gateway.conf is missing ${required}`);
}
assert(!/演示|原型|评审|本机|示例|体验/.test(masterSource) && !/WA_SITE|localStorage|sessionStorage/.test(masterSource), 'the supervisor page must not speak of a demonstration, nor touch the app or the browser\'s storage');
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `bf368974b129930d6b4d3533de0afe3bd324cf7a2038c6b581614eaeec8a3c5c`; `git checkout 51a2745 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `outputs/wa-replica-prototype/validation.json` and nothing else (if `icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). If the checksum does not match, restore the file with `git checkout 51a2745 -- <file>` and apply its instructions again; if it still does not match, or another output file changed, STOP.

### Step 5: README, build log, final verification

#### `README.md`

**Edit 5.1** — `README.md`. Find exactly these lines (they occur once):

```text

#### 接入 AI 翻译（可选）
```

Replace them with:

````text

#### 用容器运行整套平台

`deploy/` 目录提供把整套平台放进 Docker 的文件。平台由三部分常驻容器和每个子站各两个容器组成，全部在同一个 Docker 网络 `wa-scrm` 里，只有网关对外开放端口：

- **网关**（`wa-scrm-gateway`，nginx，配置见 `deploy/gateway.conf`）：所有人访问的唯一地址。它通过 Docker 自带的名称解析按容器名找到其他容器，新建、启动或停止子站时不需要改任何配置。
- **主服务**（`wa-scrm-master`）：页面、登录、账号管理和 AI 中转；它不是任何员工的子站。
- **调度服务**（`wa-scrm-provisioner`，`work/wa-replica/site-provisioner.cjs`）：唯一能操作 Docker 的部分。它按固定的方式创建、启动、停止一个子站的两个容器（子站服务 `wa-scrm-site-<编号>` 和它专属的 OpenWA `wa-scrm-openwa-<编号>`），调用方只能给出子站编号；它只接受主服务凭共享密钥发来的请求，不对外开放。创建子站时它为 OpenWA 生成密钥、写好该子站的连接设置文件；超过子站数量上限（默认 4）或服务器剩余内存不足（默认 1400 MB）时拒绝创建和启动。

首次部署（在服务器上，以能使用 Docker 的用户执行）：

```bash
docker build -f deploy/Dockerfile -t wa-scrm-server:current .          # 构建服务镜像
cp deploy/platform.env.template /私有目录/platform.env                   # 填写数据目录、AI 设置文件、共享密钥文件等路径
docker compose -f deploy/compose.yml --env-file /私有目录/platform.env up -d
```

之后每次更新代码，执行 `bash deploy/upgrade.sh /私有目录/platform.env`：重新构建镜像，更新三个常驻容器，并让每个子站的服务换用新镜像；子站的 OpenWA 不会被重启，WhatsApp 连接不中断。数据目录、AI 设置文件和共享密钥文件都放在仓库之外。

#### 接入 AI 翻译（可选）
````

**Edit 5.2** — `README.md`. Find exactly these lines (they occur once):

```text
├── 重新构建原型.cmd                                    # Windows 一键重编译与自动化校验脚本
├── outputs/
```

Replace them with:

```text
├── 重新构建原型.cmd                                    # Windows 一键重编译与自动化校验脚本
├── deploy/                                            # 容器部署：服务镜像、网关配置、常驻三个容器的编排文件、升级脚本
├── outputs/
```

**Edit 5.3** — `README.md`. Find exactly these lines (they occur once):

```text
│       ├── site-admin.cjs                             # 账号与数据管理工具（在服务器上运行）
│       ├── fidelity-ui.js / fidelity-customer-pages.js# 列表、标签、标签统计与聊天记录归档视图
```

Replace them with:

```text
│       ├── site-admin.cjs                             # 账号与数据管理工具（在服务器上运行）
│       ├── site-provisioner.cjs / .test.cjs           # 子站容器的创建与启停（唯一与 Docker 打交道的部分）及其测试
│       ├── fidelity-ui.js / fidelity-customer-pages.js# 列表、标签、标签统计与聊天记录归档视图
```

#### `replica/build-log.md`

**Append 5.4** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 平台可以在容器里运行，子站由调度服务自动创建 · 2026-11-23

此前每增加一个子站，都要在服务器上手工做三件事：启动一个服务进程、启动一个 OpenWA 容器、在网关里加转发规则。项目负责人要求在管理界面创建员工时由系统自动完成这些，并确认整套系统迁到第二台服务器。这一步准备好运行方式，下一步再接到管理界面上。

- 服务可以在容器里运行：监听地址可用 `WA_SCRM_LISTEN` 指定（默认仍只对本机开放）。`deploy/Dockerfile` 构建服务镜像。
- 新增调度服务（`site-provisioner.cjs`）：平台里唯一与 Docker 打交道的部分。它按固定方式创建、启动、停止一个子站的两个容器，调用方只能给出子站编号；只接受主服务凭共享密钥发来的请求；创建时为该子站的 OpenWA 生成密钥并写好连接设置；达到数量上限或服务器内存不足时拒绝，不会挤占服务器上的其他网站。创建到一半中断的子站，再次启动时会接着完成；从别处迁来的子站（已有 OpenWA 数据和设置文件）按原样启动。
- 网关（`deploy/gateway.conf`）通过 Docker 自带的名称解析按容器名找到主服务和各子站，不再需要手写的转发表：这就是"服务发现"。
- `deploy/compose.yml` 启动常驻的三个容器（网关、主服务、调度服务）；`deploy/upgrade.sh` 在更新代码后重建镜像并让各子站的服务换用新镜像，不重启 OpenWA。

验证：调度服务的自动化测试使用模拟的 Docker 接口；另在真实 Docker 上用独立的测试网络完整跑通——创建子站、员工登录、取得扫码二维码、OpenWA 的事件送达子站、停止与启动、超出上限被拒绝，并经网关分别以员工和主管身份访问——结束后全部清除。

现有两个子站仍按原方式运行，迁移在后续步骤进行。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout 51a2745 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && $NODE --test work/wa-replica/site-provisioner.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-055/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test run ends with `pass 8`, `fail 0`; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `42c0404d1cd1ca31e21b66d5d51df64e70ae88f5c9f540b1420c949b338027e6`, `59a9675a4bd57bc1f7af5b77daa154a1085599511c7efffedfc1b6527b77bb18`; `git status --porcelain` lists exactly these: `README.md`, `replica/build-log.md`, `work/wa-replica/serve.cjs`, `site-api.test.cjs`, `validate-scrm-lifecycle.cjs` and `outputs/wa-replica-prototype/validation.json` as changed, and `.dockerignore`, `deploy/`, `work/wa-replica/site-provisioner.cjs` and `site-provisioner.test.cjs` as new. Commit everything, the eight new files included. After the commit `git status --porcelain` must be empty.

## Test plan

- **Tests of the provisioner** (8, new; a stand-in Docker Engine on a socket of the test's own and a stand-in OpenWA): nobody without the secret, only the addresses it knows, only the id of a sub-site and none of the platform's own names; a new sub-site is made in the order volume, OpenWA, its server, each container exactly after the recipe — what a caller sends beside the id is nowhere —, with a key of the platform's choice for OpenWA that is not in the settings file, a restricted key and a secret in a settings file that is private; the same sub-site is not made twice; a sub-site too many or too little free memory makes nothing, and two requests at once cannot both take the last place; stopping stops the server first and then OpenWA, starting makes no container, key or settings file anew; a sub-site that was moved here is started as it is, one whose making stopped half-way is finished, what cannot be put together says why; an OpenWA that stops again or an image that is not there fails the sub-site with the reason; the settings from the environment; the log lines carry no key.
- **Sign-in and data tests** (16, the test of the real server is extended): the server is reached by this machine only, and by another address of the machine when it is told to listen there.
- **Validator** — the listening address; the provisioner checks the secret before it looks at what is asked, takes only the id from a request, accepts only the id of a sub-site and runs no command; the pinned images; only the provisioner has the Docker socket and only the gateway a published port; the gateway's rules.
- **Smoke** (`/tmp/wa-scrm-plan-055/smoke.sh`) — the same facts, the syntax of the files, that nothing of the page changed, and the tests of the server, the relay and the link.
- **Verified by the reviewer against a real Docker, not by you**: the image is built; the provisioner, in a test network of its own, makes a sub-site with a real OpenWA — an employee signs in, the WhatsApp link is configured and reachable, a QR code comes, OpenWA's deliveries reach the sub-site's server by the name of its container —, refuses one beyond the limit, stops and starts it with its settings unchanged; the whole stack of `deploy/compose.yml` on a test port: the page and sign-in through the gateway, the employee's requests passed to their sub-site by the cookie, the supervisor's by the name, a sub-site that does not exist or is stopped answered at once with an error, the provisioner not reachable from outside the network; the upgrade script makes the sub-site's server anew and leaves its OpenWA alone. Everything is removed afterwards. The browser sessions of the product still pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 51a2745 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/site-provisioner.test.cjs` → `pass 8`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 16`, `fail 0`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 14`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-055/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/serve.cjs` → `41ec391efa5541010c0e4854eeb2dbe49de074f2fb1512a7005ca7731733dc93`
- [ ] `sha256sum work/wa-replica/site-api.test.cjs` → `c38b5125f28acee6817b52effce3420f6d4ef678d24c9381f85809e541cb162e`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `bf368974b129930d6b4d3533de0afe3bd324cf7a2038c6b581614eaeec8a3c5c`
- [ ] `sha256sum README.md` → `42c0404d1cd1ca31e21b66d5d51df64e70ae88f5c9f540b1420c949b338027e6`
- [ ] `sha256sum replica/build-log.md` → `59a9675a4bd57bc1f7af5b77daa154a1085599511c7efffedfc1b6527b77bb18`
- [ ] `sha256sum work/wa-replica/site-provisioner.cjs` → `af7e64e23143b140a9bdb498e6f5c8d5a3d526e58ce62c6a56fcf13aec68e114`
- [ ] `sha256sum work/wa-replica/site-provisioner.test.cjs` → `6e4ee3a6dc7cb6b6296b1cbdda9e8857f68b0edf2072d8af66da30172e2351cb`
- [ ] `sha256sum .dockerignore` → `ab2a44c68f7dcae4f264e46d87e0df92e5471e6197fca7c0dfd755fc46caff4c`
- [ ] `sha256sum deploy/Dockerfile` → `c66f880cad0117f0f9efe03cbcec2a6f8566b7dabb783b1025c5c765d42e5773`
- [ ] `sha256sum deploy/gateway.conf` → `fea9acd3eaf285b532faa08d1516c51a9d3b125203298f334181af916eb0940b`
- [ ] `sha256sum deploy/compose.yml` → `0d678c2f1837ac4011fe161b7c7ad51c619a30146b0224c0e2ade89145a33c74`
- [ ] `sha256sum deploy/platform.env.template` → `3381e2467e36e1dc5dfe03ee0d58afc0edafa3ce55ab2be9bd49cfcaef56c313`
- [ ] `sha256sum deploy/upgrade.sh` → `bce69994be6945dc9ded532e9df67bffdb138a85cac9884a0d9819137748223a`
- [ ] `git diff --name-only 51a2745..HEAD -- outputs` lists `outputs/wa-replica-prototype/validation.json` and nothing else
- [ ] `git diff --name-only 51a2745..HEAD -- . ':!plans'` lists exactly these fourteen: `.dockerignore`, `README.md`, `deploy/Dockerfile`, `deploy/compose.yml`, `deploy/gateway.conf`, `deploy/platform.env.template`, `deploy/upgrade.sh`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/serve.cjs`, `work/wa-replica/site-api.test.cjs`, `work/wa-replica/site-provisioner.cjs`, `work/wa-replica/site-provisioner.test.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs`
- [ ] `git ls-files -s deploy/upgrade.sh` begins with `100644` (an ordinary file)
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum, a new file exists already).
- The lines to find do not occur exactly once in their file.
- A checksum does not match after you have restored or deleted the file and applied its instructions a second time.
- The build or the validator fails, the build reports another number of icons than 84, or a test fails.
- An output file other than `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file, or using Docker.

## Maintenance notes

- **Deployment**: nothing has to be restarted for this plan — `serve.cjs` behaves as before unless `WA_SCRM_LISTEN` is set, and nothing starts the provisioner yet.
- The provisioner has the Docker socket, and whoever has that has the machine. What keeps it small: it is published nowhere; it asks for the shared secret before anything else; a request can name a sub-site and nothing more; the recipe for a container is in its source. Any change of it deserves a second reader.
- The recipe of the OpenWA container follows the settings the first sub-site was run with by hand (image pinned by digest, the engine, the limits). A new OpenWA version is taken by changing `WA_SCRM_OPENWA_IMAGE` and making the sub-sites' OpenWA containers anew — which interrupts their WhatsApp connections for a moment and should be done one at a time.
- The limit of sub-sites and the free memory that must be left are settings of the machine (`WA_SCRM_MAX_SITES`, `WA_SCRM_MIN_FREE_MB`).
- Next plan: the first server asks the provisioner when an employee is made, switched off or on from the supervisor page, and the page shows the state of each sub-site.
- What a reviewer should scrutinise: that nothing reaches Docker that a caller chose; that the secret is checked first; that a refused request makes nothing; that no key reaches a log or a file other than the private settings file.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
