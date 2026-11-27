# Plan 089: The machine can name the WhatsApp Web build of every new OpenWA (no QR code since WhatsApp's /login/ page)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 67656b7..HEAD -- work/wa-replica/site-provisioner.cjs deploy/compose.yml deploy/platform.env.template work/wa-replica/site-provisioner.test.cjs README.md replica/build-log.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (one optional setting, empty by default; when it is empty every container is made exactly as before; exact text and checksums for every file)
- **Depends on**: plans/055-platform-in-containers.md, plans/056-employees-with-sub-sites.md, plans/057-delete-accounts.md (DONE; they made the provisioner, its tests and the deploy files this plan edits)
- **Category**: owner request of 2026-11-27 ("let's address why the WhatsApp login QR code isn't generating"; offered a temporary pin of an older WhatsApp Web build, the owner chose "Pin the old build now (Recommended)", then "go ahead with plan 089")
- **Planned at**: commit `67656b7`, 2026-11-27

## Why this matters

Every employee's sub-site has its own OpenWA container (the WhatsApp gateway, image `ghcr.io/rmyndharis/openwa:0.31.0`, engine `whatsapp-web.js`), made by the provisioner (`work/wa-replica/site-provisioner.cjs`) after a fixed recipe (`openwaSpec`). To link a number, OpenWA opens WhatsApp Web in a headless browser and shows its QR code.

What the reviewer found on the live machine and proved, 2026-11-27:

- Since late November WhatsApp sends a browser that is not signed in to a new page, `https://web.whatsapp.com/login/` (a headless browser on that page sees the QR code normally). OpenWA 0.31.0 does not know that page: it waits 30 seconds and fails the session with "auth timeout" — no QR code. Upstream: OpenWA issue #2161 (open, also on v0.32.1) and a fix proposed as PR #2162 (open, not released).
- OpenWA first tries to load a saved copy of a WhatsApp Web build from a public registry ("pinned remote HTML"). Every copy newer than about build 2.3000.1055991158 is now the logged-out page; OpenWA rejects it, tries a few older ones, then goes on without a copy and runs into the /login/ page. Whether a link works was therefore luck: on 2026-11-27 two attempts of one employee failed at 11:44 and 11:45 UTC, the third at 11:55 happened to reach build `2.3000.1055837054-alpha` and linked at once.
- A throwaway OpenWA 0.31.0 with `WWEBJS_WEB_VERSION=2.3000.1055837054-alpha` produced a QR code at once; the same without it failed with "auth timeout" after 12 seconds.
- A number that is linked is not affected: its signed-in page opens WhatsApp's app directly.

By hand (not part of this plan), the reviewer already rebuilt the three OpenWA containers that have no linked number with that build added to their environment. But the provisioner makes the OpenWA of every NEW employee (and remakes one whose container is missing) from its fixed recipe, which has no such setting — those would get no QR code again. This plan gives the machine an optional setting that the provisioner hands to every OpenWA it makes from then on.

### Decisions already made (do not re-open; do not ask)

- The setting is `WA_SCRM_OPENWA_WEB_VERSION` (machine settings file → `deploy/compose.yml` → the provisioner's environment), optional, empty by default. `configFromEnv` keeps it as `openwaWebVersion` ('' when unset) and refuses anything that is not a build: three dot-separated numbers, optionally followed by a hyphen and lower-case letters (`/^\d+\.\d+\.\d+(-[a-z]+)?$/`), with the error `WA_SCRM_OPENWA_WEB_VERSION must be a WhatsApp Web build like 2.3000.1055837054-alpha`.
- `openwaSpec` adds `WWEBJS_WEB_VERSION=<build>` to the OpenWA's environment when the setting is not empty — after `RESOLVE_LID_TO_PHONE=true` and before `API_MASTER_KEY=…`. With the setting empty the recipe is exactly as before (the existing tests prove it unchanged).
- An OpenWA container that exists is started as it is (it keeps the build it was made with); only one that is made — new, or made anew because its container is missing while its data volume and settings file remain — gets the setting. No container is changed by this plan.
- `deploy/upgrade.sh`, the first server, the page and everything else stay as they are. Removing the setting again later (when OpenWA ships its fix) is a matter of the machine file; no code change.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer), deployed as Docker containers (`deploy/`). There is no package.json. Documentation text (README.md, replica/build-log.md) is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/site-provisioner.cjs` | `dde93e9b07f4e68053224e0bfa238cf50f9aadb4a0bec3cbda363d1757c61fcf` | `a2a42900469717c6a756f6e7d2eb287d48a40cad47ebb01d68dea64fb6ce468b` | 5 |
| `deploy/compose.yml` | `347615acef3d6e506c80f9a1feac4b212fffb10cc4490779684d6a00e8618edf` | `436c861bfe6444616fc62c4600ae3fe2f1240141287ad01f5601bd914840f89f` | 1 |
| `deploy/platform.env.template` | `b5379835309e8c8a8fb1cb3418003447f17d4e3461b666a86b3c5ddc6dd0a2ae` | `d1c38c0cb475b50f5bb82194824eb6169eef01f82dba687bb0066dacf5da5121` | 1 |
| `work/wa-replica/site-provisioner.test.cjs` | `914f61420960e717f93a0de2d68674cb040fbcb5199f1e61f15cbfeb2840e4ab` | `6e46030444412d223d471e092a7229c6925daa695f05a1546ab49b4f744e8364` | 3 |
| `README.md` | `9a0a832c08b0cc23292b14eb17e5f1270bb68b90cc73469b607e918a23e3b785` | `19fdabfbf61bb9a7dba7adeb2084d600f8055e0316ce44d18da44d6f10d2d823` | 1 |
| `replica/build-log.md` | `27222bbede2e7e223701fb1e91aa89e34250a589b5a455b80a5d4f379912942b` | `c3e9803d25fad80e1dec47a464243b925d05a6c0901fe93dcbd293e4364f3f20` | 1 append |

- `site-provisioner.cjs` — the provisioner: its header comment lists the settings; `create()` holds `openwaSpec` (the OpenWA recipe) and `build()`; `configFromEnv()` reads the settings at the end of the file.
- `site-provisioner.test.cjs` — its tests against a stand-in Docker Engine and a stand-in OpenWA (13 tests before this plan, 14 after). They share one `config` object (`const config = { … maxSites: 2 … }`) and mutable stand-in state (`containers`, `volumes`, `keys`, `mood`, `free`); a test that changes the shared state puts it back.
- `deploy/compose.yml` — the platform's containers; the provisioner's `environment:` list passes the machine settings with defaults.
- `deploy/platform.env.template` — the commented template of a machine's settings file.
- `README.md` — the project's documentation (Chinese); its section 「用容器运行整套平台」 describes the deployment.
- `replica/build-log.md` — the project's change log (Chinese); this plan appends one entry.

## Commands you will need

Run from the repository root.

**The tests and the smoke script need Node 22.13 or newer** (`node:sqlite`, `node --test`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Tests of the provisioner | `$NODE --test work/wa-replica/site-provisioner.test.cjs` | `pass 14`, `fail 0` after Step 4 (`pass 13` before) |
| All tests | `$NODE --test` (from the repository root) | `tests 91`, `pass 91`, `fail 0` after Step 4 |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-089/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

Do **not** run the build (`build-fidelity.cjs`) or the validator (`validate-scrm-lifecycle.cjs`): this plan changes nothing of the page, and every file under `outputs/` must stay unchanged. Do not run Docker.

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/site-provisioner.cjs` (Step 2)
- `deploy/compose.yml`, `deploy/platform.env.template` (Step 3)
- `work/wa-replica/site-provisioner.test.cjs` (Step 4)
- `README.md`, `replica/build-log.md` (Step 5)

**Out of scope** (do NOT touch): every other file — `deploy/upgrade.sh`, `deploy/Dockerfile`, `deploy/gateway.conf`, the servers (`serve.cjs`, `site-api.cjs`, `openwa-link.cjs` …), the page and its modules, `outputs/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created in the repository. Do not install anything.

## Git workflow

- Work on the branch you are given. If (and only if) you find yourself on `main`, create and switch to `advisor/089-openwa-web-version` first.
- One commit is fine. Conventional commit message, e.g. `fix(platform): let the machine name the WhatsApp Web build of every new OpenWA`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy the text exactly, including spaces, quotes, backticks, `${…}` and Chinese punctuation. Apply the edits of a file in the order given.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-089/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-089 && cat > /tmp/wa-scrm-plan-089/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 089: the machine's WhatsApp Web build (WA_SCRM_OPENWA_WEB_VERSION) goes to every OpenWA the
# provisioner makes from now on; the setting is checked, passed by the compose file, documented. NODE must be Node
# 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'the provisioner names the setting' "$W/site-provisioner.cjs" '//   WA_SCRM_OPENWA_WEB_VERSION        the WhatsApp Web build each OpenWA made from now on loads (optional; empty:'
has 'the setting is checked' "$W/site-provisioner.cjs" "throw new Error('WA_SCRM_OPENWA_WEB_VERSION must be a WhatsApp Web build like 2.3000.1055837054-alpha');"
has 'the setting is kept with the others' "$W/site-provisioner.cjs" "network: env.WA_SCRM_NETWORK || 'wa-scrm', openwaWebVersion: webVersion,"
has 'a new OpenWA gets the build, before its key' "$W/site-provisioner.cjs" '...(config.openwaWebVersion ? [`WWEBJS_WEB_VERSION=${config.openwaWebVersion}`] : []), ...(masterKey ? [`API_MASTER_KEY=${masterKey}`] : [])],'
SECRET_FILE=$(mktemp); printf '%s' 'a-shared-secret-of-forty-characters-0000' > "$SECRET_FILE"
read_build() { "$NODE" -e "const p=require(process.argv[1]);const e={WA_SCRM_PROVISIONER_SECRET_FILE:process.argv[2],WA_SCRM_SERVER_IMAGE:'s:1',WA_SCRM_OPENWA_IMAGE:'o:1',WA_SCRM_HOST_DATA_DIR:'/h',WA_SCRM_DATA_DIR:'/d',WA_SCRM_OPENWA_WEB_VERSION:process.argv[3]};try{console.log(JSON.stringify(p.configFromEnv(e).openwaWebVersion))}catch(x){console.log('refused')}" "$W/site-provisioner.cjs" "$SECRET_FILE" "$1" 2>&1; }
same 'a build is read from the setting' "$(read_build 2.3000.1055837054-alpha)" '"2.3000.1055837054-alpha"'
same 'no setting means no build' "$(read_build '')" '""'
same 'what is no build is refused' "$(read_build latest)" refused
rm -f "$SECRET_FILE"
has 'the compose file passes the setting' "$ROOT/deploy/compose.yml" '      - WA_SCRM_OPENWA_WEB_VERSION=${WA_SCRM_OPENWA_WEB_VERSION:-}'
same 'the machine settings template has the setting, empty' "$(grep -cx 'WA_SCRM_OPENWA_WEB_VERSION=' "$ROOT/deploy/platform.env.template")" 1
has 'the README explains it' "$ROOT/README.md" '再在「主管视图」里把该员工停用后重新启用。OpenWA 修复这一问题后，清空这项设置。'
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 新号码扫码绑定时不出现二维码：已修复 · 2026-11-27'
same 'the provisioner tests pass (one new)' "$("$NODE" --test "$W/site-provisioner.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
same 'the tests of the price file pass' "$("$NODE" --test "$W/price-file.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'no built file changed' "$(cd "$ROOT" && git status --porcelain -- outputs | wc -l | tr -d ' ')" 0
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-089/smoke.sh && ls -l /tmp/wa-scrm-plan-089/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/site-provisioner.cjs deploy/compose.yml deploy/platform.env.template work/wa-replica/site-provisioner.test.cjs README.md replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-089/smoke.sh` → exactly these 12 checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the provisioner names the setting`, `the setting is checked`, `the setting is kept with the others`, `a new OpenWA gets the build, before its key`, `a build is read from the setting`, `no setting means no build`, `what is no build is refused`, `the compose file passes the setting`, `the machine settings template has the setting, empty`, `the README explains it`, `the build log has the entry`, `the provisioner tests pass (one new)`; every other check is printed with `ok`; `git status --porcelain` prints nothing.

### Step 2: The provisioner: read the setting, check it, hand it to every OpenWA it makes

#### `work/wa-replica/site-provisioner.cjs`

**Edit 2.1** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
//   WA_SCRM_OPENWA_IMAGE              image of OpenWA, pinned by digest (required)
//   WA_SCRM_HOST_DATA_DIR             the platform's data folder as the Docker host names it (required)
```

Replace them with:

```text
//   WA_SCRM_OPENWA_IMAGE              image of OpenWA, pinned by digest (required)
//   WA_SCRM_OPENWA_WEB_VERSION        the WhatsApp Web build each OpenWA made from now on loads (optional; empty:
//                                     OpenWA's own choice), e.g. 2.3000.1055837054-alpha — see openwaSpec below
//   WA_SCRM_HOST_DATA_DIR             the platform's data folder as the Docker host names it (required)
```

**Edit 2.2** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text

  const openwaSpec = (id, masterKey) => ({
```

Replace them with:

```text

  // The machine's WhatsApp Web build (WA_SCRM_OPENWA_WEB_VERSION), when it has one, goes to every OpenWA made from
  // now on: since late November 2026 WhatsApp sends a browser that is not signed in to a new /login/ page that
  // OpenWA 0.31.0 does not know, and a new number then gets no QR code; an older build still shows one. An OpenWA
  // keeps the build it was made with.
  const openwaSpec = (id, masterKey) => ({
```

**Edit 2.3** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
    Env: ['NODE_ENV=production', 'TZ=UTC', 'HOME=/tmp', 'XDG_CONFIG_HOME=/tmp/.config', 'XDG_CACHE_HOME=/tmp/.cache', 'PORT=2785', 'ENGINE_TYPE=whatsapp-web.js', 'AUTO_START_SESSIONS=true',
      `SSRF_ALLOWED_HOSTS=${names(id).server}`, 'WEBHOOK_MEDIA_INLINE_MAX_BYTES=0', 'RESOLVE_LID_TO_PHONE=true', ...(masterKey ? [`API_MASTER_KEY=${masterKey}`] : [])],
    Labels: labels(id, 'openwa'),
```

Replace them with:

```text
    Env: ['NODE_ENV=production', 'TZ=UTC', 'HOME=/tmp', 'XDG_CONFIG_HOME=/tmp/.config', 'XDG_CACHE_HOME=/tmp/.cache', 'PORT=2785', 'ENGINE_TYPE=whatsapp-web.js', 'AUTO_START_SESSIONS=true',
      `SSRF_ALLOWED_HOSTS=${names(id).server}`, 'WEBHOOK_MEDIA_INLINE_MAX_BYTES=0', 'RESOLVE_LID_TO_PHONE=true',
      ...(config.openwaWebVersion ? [`WWEBJS_WEB_VERSION=${config.openwaWebVersion}`] : []), ...(masterKey ? [`API_MASTER_KEY=${masterKey}`] : [])],
    Labels: labels(id, 'openwa'),
```

**Edit 2.4** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
  if (!/^\d+:\d+$/.test(runAs)) throw new Error('WA_SCRM_RUN_AS must be <uid>:<gid>');
  // A number among the settings: its default when it is not set, else a whole number — 0 is one, and is meant.
```

Replace them with:

```text
  if (!/^\d+:\d+$/.test(runAs)) throw new Error('WA_SCRM_RUN_AS must be <uid>:<gid>');
  // A WhatsApp Web build is three numbers with dots between them, maybe followed by a word: 2.3000.1055837054-alpha.
  const webVersion = env.WA_SCRM_OPENWA_WEB_VERSION || '';
  if (webVersion && !/^\d+\.\d+\.\d+(-[a-z]+)?$/.test(webVersion)) throw new Error('WA_SCRM_OPENWA_WEB_VERSION must be a WhatsApp Web build like 2.3000.1055837054-alpha');
  // A number among the settings: its default when it is not set, else a whole number — 0 is one, and is meant.
```

**Edit 2.5** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
    secret, runAs, serverImage: need('WA_SCRM_SERVER_IMAGE'), openwaImage: need('WA_SCRM_OPENWA_IMAGE'), hostDataDir: need('WA_SCRM_HOST_DATA_DIR'), dataDir: need('WA_SCRM_DATA_DIR'),
    hostAiEnv: env.WA_SCRM_HOST_AI_ENV || '', network: env.WA_SCRM_NETWORK || 'wa-scrm',
    maxSites: number('WA_SCRM_MAX_SITES', 4), minFreeMb: number('WA_SCRM_MIN_FREE_MB', 1400), openwaMemoryMb: number('WA_SCRM_OPENWA_MEMORY_MB', 1536), serverMemoryMb: number('WA_SCRM_SERVER_MEMORY_MB', 256),
```

Replace them with:

```text
    secret, runAs, serverImage: need('WA_SCRM_SERVER_IMAGE'), openwaImage: need('WA_SCRM_OPENWA_IMAGE'), hostDataDir: need('WA_SCRM_HOST_DATA_DIR'), dataDir: need('WA_SCRM_DATA_DIR'),
    hostAiEnv: env.WA_SCRM_HOST_AI_ENV || '', network: env.WA_SCRM_NETWORK || 'wa-scrm', openwaWebVersion: webVersion,
    maxSites: number('WA_SCRM_MAX_SITES', 4), minFreeMb: number('WA_SCRM_MIN_FREE_MB', 1400), openwaMemoryMb: number('WA_SCRM_OPENWA_MEMORY_MB', 1536), serverMemoryMb: number('WA_SCRM_SERVER_MEMORY_MB', 256),
```

What these edits do, so that you can recognise them: the header comment names the setting; a comment above `openwaSpec` says why; the OpenWA recipe's environment gets `WWEBJS_WEB_VERSION=<build>` when `config.openwaWebVersion` is not empty; `configFromEnv` reads and checks the setting and returns it as `openwaWebVersion`.

**Verify**: `sha256sum work/wa-replica/site-provisioner.cjs` → `a2a42900469717c6a756f6e7d2eb287d48a40cad47ebb01d68dea64fb6ce468b`; `$NODE -e "require('./work/wa-replica/site-provisioner.cjs')"` → exit 0, prints nothing. If the checksum does not match, restore the file (`git checkout -- <file>`) and apply the edits again, once; if it still does not match, STOP.

### Step 3: The compose file and the machine settings template

#### `deploy/compose.yml`

**Edit 3.1** — `deploy/compose.yml`. Find exactly these lines (they occur once):

```text
      - WA_SCRM_OPENWA_IMAGE=${WA_SCRM_OPENWA_IMAGE:-ghcr.io/rmyndharis/openwa:0.31.0@sha256:cfa076443c09d5cb7add0b8b446dc4aee857374e8af8168d376fdacc926d599d}
      - WA_SCRM_HOST_DATA_DIR=${WA_SCRM_HOST_DATA_DIR:?}
```

Replace them with:

```text
      - WA_SCRM_OPENWA_IMAGE=${WA_SCRM_OPENWA_IMAGE:-ghcr.io/rmyndharis/openwa:0.31.0@sha256:cfa076443c09d5cb7add0b8b446dc4aee857374e8af8168d376fdacc926d599d}
      - WA_SCRM_OPENWA_WEB_VERSION=${WA_SCRM_OPENWA_WEB_VERSION:-}
      - WA_SCRM_HOST_DATA_DIR=${WA_SCRM_HOST_DATA_DIR:?}
```

#### `deploy/platform.env.template`

**Edit 3.2** — `deploy/platform.env.template`. Find exactly these lines (they occur once):

```text
WA_SCRM_OPENWA_MEMORY_MB=1536
# The most memory (MB) one server may take: the first server, and the server of each sub-site.
```

Replace them with:

```text
WA_SCRM_OPENWA_MEMORY_MB=1536
# The WhatsApp Web build every OpenWA made from now on loads, e.g. 2.3000.1055837054-alpha; empty: OpenWA's own
# choice. Only for when WhatsApp changed its web page and a new number gets no QR code. An OpenWA that exists
# keeps the build it was made with (README: how to make one anew).
WA_SCRM_OPENWA_WEB_VERSION=
# The most memory (MB) one server may take: the first server, and the server of each sub-site.
```

**Verify**: `sha256sum deploy/compose.yml deploy/platform.env.template` → `436c861bfe6444616fc62c4600ae3fe2f1240141287ad01f5601bd914840f89f`, `d1c38c0cb475b50f5bb82194824eb6169eef01f82dba687bb0066dacf5da5121`.

### Step 4: The tests

#### `work/wa-replica/site-provisioner.test.cjs`

**Edit 4.1** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text

test('the settings from the environment: what is needed is asked for, the secret is long enough, the rest has its defaults', () => {
```

Replace them with:

```text

test('a WhatsApp Web build for the machine: every OpenWA made from then on loads it; one that is there keeps the one it was made with, and one made anew from its data loads it', async () => {
  // room: the sub-sites that still run from the tests before are stopped
  for (const c of [...containers.values()]) if (isOpenwa(c) && c.state === 'running') await call(`/sites/${c.spec.Labels['wa-scrm.site']}/stop`, { method: 'POST' });
  const pin = 'WWEBJS_WEB_VERSION=2.3000.1055837054-alpha';
  try {
    // made while the machine has no build: none
    assert.equal((await call('/sites', { method: 'POST', body: { id: 'w1' } })).status, 202);
    assert.deepEqual(await settled('w1'), { id: 'w1', state: 'ready' });
    assert.equal(containers.get('wa-scrm-openwa-w1').spec.Env.some(line => line.startsWith('WWEBJS_WEB_VERSION=')), false);
    await call('/sites/w1/stop', { method: 'POST' });
    config.openwaWebVersion = '2.3000.1055837054-alpha';
    // a new one: the build, before the key it is started with
    assert.equal((await call('/sites', { method: 'POST', body: { id: 'w2' } })).status, 202);
    assert.deepEqual(await settled('w2'), { id: 'w2', state: 'ready' });
    const made = containers.get('wa-scrm-openwa-w2').spec.Env;
    assert.deepEqual([made.slice(-3, -1), made[made.length - 1].startsWith('API_MASTER_KEY=')], [['RESOLVE_LID_TO_PHONE=true', pin], true]);
    await call('/sites/w2/stop', { method: 'POST' });
    // one that is there is started as it is
    assert.equal((await call('/sites/w1/start', { method: 'POST' })).status, 202);
    assert.deepEqual(await settled('w1'), { id: 'w1', state: 'ready' });
    assert.equal(containers.get('wa-scrm-openwa-w1').spec.Env.includes(pin), false, 'an OpenWA that exists keeps its build');
    await call('/sites/w1/stop', { method: 'POST' });
    // its container taken away, its data kept: made anew with the build — no key of the platform's choice, no new restricted key
    containers.delete('wa-scrm-openwa-w1');
    const asked = keys.length;
    assert.equal((await call('/sites/w1/start', { method: 'POST' })).status, 202);
    assert.deepEqual(await settled('w1'), { id: 'w1', state: 'ready' });
    const anew = containers.get('wa-scrm-openwa-w1').spec.Env;
    assert.deepEqual([anew[anew.length - 1], anew.some(line => line.startsWith('API_MASTER_KEY=')), keys.length], [pin, false, asked]);
    await call('/sites/w1/stop', { method: 'POST' });
  } finally {
    delete config.openwaWebVersion;
  }
});

test('the settings from the environment: what is needed is asked for, the secret is long enough, the rest has its defaults', () => {
```

**Edit 4.2** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
  const env = { WA_SCRM_PROVISIONER_SECRET_FILE: secretFile, WA_SCRM_SERVER_IMAGE: 'server:1', WA_SCRM_OPENWA_IMAGE: 'openwa:1', WA_SCRM_HOST_DATA_DIR: '/host/data', WA_SCRM_DATA_DIR: '/data' };
  assert.deepEqual(configFromEnv(env), { secret: SECRET, runAs: '1000:1000', serverImage: 'server:1', openwaImage: 'openwa:1', hostDataDir: '/host/data', dataDir: '/data', hostAiEnv: '', network: 'wa-scrm', maxSites: 4, minFreeMb: 1400, openwaMemoryMb: 1536, serverMemoryMb: 256 });
  assert.deepEqual(configFromEnv({ ...env, WA_SCRM_MAX_SITES: '3', WA_SCRM_MIN_FREE_MB: '900', WA_SCRM_RUN_AS: '1001:1002', WA_SCRM_NETWORK: 'other', WA_SCRM_HOST_AI_ENV: '/host/ai.env' }).maxSites, 3);
```

Replace them with:

```text
  const env = { WA_SCRM_PROVISIONER_SECRET_FILE: secretFile, WA_SCRM_SERVER_IMAGE: 'server:1', WA_SCRM_OPENWA_IMAGE: 'openwa:1', WA_SCRM_HOST_DATA_DIR: '/host/data', WA_SCRM_DATA_DIR: '/data' };
  assert.deepEqual(configFromEnv(env), { secret: SECRET, runAs: '1000:1000', serverImage: 'server:1', openwaImage: 'openwa:1', hostDataDir: '/host/data', dataDir: '/data', hostAiEnv: '', network: 'wa-scrm', openwaWebVersion: '', maxSites: 4, minFreeMb: 1400, openwaMemoryMb: 1536, serverMemoryMb: 256 });
  assert.deepEqual(configFromEnv({ ...env, WA_SCRM_MAX_SITES: '3', WA_SCRM_MIN_FREE_MB: '900', WA_SCRM_RUN_AS: '1001:1002', WA_SCRM_NETWORK: 'other', WA_SCRM_HOST_AI_ENV: '/host/ai.env' }).maxSites, 3);
```

**Edit 4.3** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
  assert.throws(() => configFromEnv({ ...env, WA_SCRM_RUN_AS: 'root' }), /WA_SCRM_RUN_AS/);
});
```

Replace them with:

```text
  assert.throws(() => configFromEnv({ ...env, WA_SCRM_RUN_AS: 'root' }), /WA_SCRM_RUN_AS/);
  // a WhatsApp Web build: taken as it is written; anything else is refused
  for (const value of ['2.3000.1055837054-alpha', '2.3000.1055837054']) assert.equal(configFromEnv({ ...env, WA_SCRM_OPENWA_WEB_VERSION: value }).openwaWebVersion, value);
  for (const value of ['latest', '2.3000', '2.3000.1055837054 ', '2.3000.1\nAPI_MASTER_KEY=x', 'v2.3000.1', '2.3000.1-ALPHA']) assert.throws(() => configFromEnv({ ...env, WA_SCRM_OPENWA_WEB_VERSION: value }), /WA_SCRM_OPENWA_WEB_VERSION must be a WhatsApp Web build/, JSON.stringify(value));
});
```

What these edits do: the expected result of `configFromEnv` gets `openwaWebVersion: ''`; the settings test checks that two builds are taken as written and six other values are refused; a new test (before the settings test) makes a sub-site without a build, then sets `config.openwaWebVersion` and checks that a new sub-site's OpenWA has the build after `RESOLVE_LID_TO_PHONE=true` and before its key, that the first one's existing container is started unchanged, and that its container — taken away while its data stays — is made anew with the build, without a key of the platform's choice and without a new restricted key; it puts the shared `config` back.

**Verify**: `sha256sum work/wa-replica/site-provisioner.test.cjs` → `6e46030444412d223d471e092a7229c6925daa695f05a1546ab49b4f744e8364`; `$NODE --test work/wa-replica/site-provisioner.test.cjs` → `pass 14`, `fail 0`; `$NODE --test` → `tests 91`, `pass 91`, `fail 0`.

### Step 5: README, build log, final verification

#### `README.md`

**Edit 5.1** — `README.md`. Find exactly these lines (they occur once):

```text

网关不在内存里暂存上传的内容，访问日志不记录查询参数（其中可能含有客户号码）；路径里带反斜杠、编码后的斜杠或反斜杠（%2F、%5C）、空段或只由点组成的段的请求一律拒绝，网关和各个服务都会检查；OpenWA 的事件只在容器之间传递，不经过对外地址。
```

Replace them with:

```text

WhatsApp 改动网页版后，新号码扫码绑定时可能不出现二维码：2026 年 11 月下旬起，未登录的浏览器会被转到新的 `/login/` 页面，OpenWA 0.31.0 不认识它，等待 30 秒后报“auth timeout”。这时可以在设置文件里用 `WA_SCRM_OPENWA_WEB_VERSION` 指定一个仍能显示二维码的 WhatsApp Web 版本（例如 `2.3000.1055837054-alpha`），再运行 `deploy/upgrade.sh`：此后调度服务新建的 OpenWA 都使用这个版本。已有的 OpenWA 保持创建时的版本，已绑定的号码照常重新连接；要让还没有绑定号码的 OpenWA 换用新版本，在服务器上删除它的容器（`docker rm -f wa-scrm-openwa-<编号>`，数据保留），再在「主管视图」里把该员工停用后重新启用。OpenWA 修复这一问题后，清空这项设置。

网关不在内存里暂存上传的内容，访问日志不记录查询参数（其中可能含有客户号码）；路径里带反斜杠、编码后的斜杠或反斜杠（%2F、%5C）、空段或只由点组成的段的请求一律拒绝，网关和各个服务都会检查；OpenWA 的事件只在容器之间传递，不经过对外地址。
```

#### `replica/build-log.md`

**Append 5.2** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 新号码扫码绑定时不出现二维码：已修复 · 2026-11-27

WhatsApp 在 11 月下旬改动了网页版：未登录的浏览器会被转到新的 `/login/` 页面。SCRM 使用的 OpenWA 0.31.0 不认识这个页面，常常等待 30 秒后报“auth timeout”，二维码不出现，新号码无法绑定（重试时偶尔能成功）。已绑定的号码不受影响。

现在服务器的设置文件可以指定 OpenWA 使用的 WhatsApp Web 版本（`WA_SCRM_OPENWA_WEB_VERSION`）：此后新建的 OpenWA 都使用这个版本，二维码立即出现。已有的 OpenWA 保持原来的版本。这是临时办法：OpenWA 发布修复后清空这项设置。

验证：调度服务的测试新增一项（设置版本后新建的 OpenWA 使用它，已有的保持不变，重新创建的使用它），并检查设置的格式；全部测试通过。
```

Then verify everything once more:

```bash
NODE=$NODE bash /tmp/wa-scrm-plan-089/smoke.sh
```

**Verify**: the smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `19fdabfbf61bb9a7dba7adeb2084d600f8055e0316ce44d18da44d6f10d2d823`, `c3e9803d25fad80e1dec47a464243b925d05a6c0901fe93dcbd293e4364f3f20`; `git status --porcelain` lists exactly the six files of the table in "Current state" as modified and nothing else. Commit everything (one commit is fine).

## Test plan

- **Provisioner tests** — the new test (made before the setting: none; new: the build before the key; existing container: unchanged; made anew from its data: the build, no new keys) and the settings test (two builds taken, six non-builds refused, the default is '').
- **Smoke** (`/tmp/wa-scrm-plan-089/smoke.sh`) — the edits, the setting read and refused through `configFromEnv`, the compose and template lines, the docs, all five test files, no built file changed.
- **Verified by the reviewer, not by you**: `docker compose config` with and without the setting (the provisioner gets the build, or an empty value); after the merge, on the live machine, the setting in the machine file, `deploy/upgrade.sh`, and the provisioner reading the build.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `$NODE --test work/wa-replica/site-provisioner.test.cjs` → `pass 14`, `fail 0`
- [ ] `$NODE --test` → `tests 91`, `pass 91`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-089/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/site-provisioner.cjs deploy/compose.yml deploy/platform.env.template work/wa-replica/site-provisioner.test.cjs README.md replica/build-log.md` → the "after this plan" values of the table in "Current state"
- [ ] `git status --porcelain` (before the commit) lists exactly those six files as modified; after the commit the working tree is clean
- [ ] Nothing under `outputs/` changed

## STOP conditions

Stop and report (do not improvise) if:

- the drift check shows that an in-scope file changed since `67656b7` and the "Current state" facts no longer match;
- a "find" block does not occur exactly once, or a checksum does not match after one careful retry;
- a test other than the new one fails, or a test count differs from the expected numbers;
- the smoke script reports `MISS` for anything at the end of Step 5;
- you would need to touch a file outside the scope, run the build, the validator or Docker, or install anything.

## Maintenance notes

- **Temporary.** When OpenWA releases a fix for the /login/ page (upstream PR #2162) and the image is upgraded, the machine setting is emptied; containers made while it was set keep the build until they are made anew. OpenWA 0.32 and later accept an exact build only together with `WWEBJS_WEB_VERSION_SHA256` or `WWEBJS_WEB_VERSION_ALLOW_UNVERIFIED=true` — an upgrade that keeps a build must add one of them to the recipe.
- **WhatsApp may stop accepting an old build.** If new numbers get no QR code again while the setting is in use, a newer build that still shows the QR page is needed (or OpenWA's fix).
- **Deployment (the reviewer's part, not the executor's):** put `WA_SCRM_OPENWA_WEB_VERSION=2.3000.1055837054-alpha` into the live machine file and run `deploy/upgrade.sh` (it recreates the provisioner with the new environment; OpenWA containers are left alone). The three OpenWA containers without a number were already rebuilt with this build by hand and keep it.
