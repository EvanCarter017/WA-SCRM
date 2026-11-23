# Plan 056: An employee is made from the supervisor page with a sub-site of their own; what the review of plan 055 found

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 87fd2de..HEAD -- work/wa-replica replica/build-log.md outputs README.md deploy`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MEDIUM (the first server may now ask the provisioner to make, start and stop containers; nothing that runs today has a provisioner, so nothing changes there — exact text and checksums for every file)
- **Depends on**: plans/055-platform-in-containers.md (DONE)
- **Category**: feature (owner request) and security (findings of an independent review)
- **Planned at**: commit `87fd2de`, 2026-11-23

## Why this matters

**The feature.** The owner wrote on 2026-11-23 "The admin interface needs to support user creation", chose "Employee + own workspace", "Supervisors too" (supervisors may manage accounts, as administrators do), and was shown what it would look like: the button "新建账号" with the type 员工 (own workspace + WhatsApp number) or 主管; a temporary password that is shown once; a line that goes from "工作区：正在准备…" to "已就绪"; "停用" stops an employee's workspace, keeps the data and frees its place, "启用" starts it again; a refusal with a clear message, and nothing made, when the workspaces are full or memory is short; no deleting, no renaming, no administrators from the page. The owner answered: "Let's do it this way."

Plan 055 brought the provisioner — the part that makes, starts and stops the two containers of a sub-site — and connected it to nothing. This plan connects it: where a server is the first server of such a platform (it is told where the provisioner is), `POST /api/auth/users` also makes an employee, together with a sub-site that bears the employee's sign-in name; switching the account off stops the sub-site, switching it on starts it; the list of sub-sites tells the state of each; and the supervisor page offers and shows all of this. Everywhere else — the two servers that run today among them — nothing changes: no provisioner, no employees from the page.

**The review.** An independent security review of plan 055's files found nothing critical and nothing high: no caller of the provisioner and no web user can make Docker do anything outside the fixed recipe. It found thirteen things of medium and low weight. Nothing runs these files yet; this plan puts right what should be right before something does:

| # | What the review found | Here |
|---|---|---|
| 1 | The gateway kept uploads and slowly read answers in `/tmp`, which is memory under its limit of 128 MB: a handful of large uploads from anyone would end it | nothing is kept on the way (`proxy_request_buffering off`, `proxy_max_temp_file_size 0`); a body for `/api/auth/` above 16 KB is refused at the gateway; a server gets 512 MB, settable |
| 2 | A sub-site whose OpenWA container could not be made (the image is not on the machine) left its volume, and that id could never be used again | the volume made for it is taken away again; the upgrade script fetches the image of OpenWA when it is missing |
| 3 | A backslash in a path is a slash to the server and none to a gateway: `/api/wa/\..\..\auth/login` reached the sign-in of any sub-site's server, each of which counts wrong attempts for itself | refused with 400, by the server itself and by the gateway |
| 4 | The upgrade script took a sub-site's server away before it knew that a new one could be made, and ended half-way when one could not | nothing is touched unless the provisioner is healthy; a sub-site is known by its OpenWA, so a second run brings back a server the first could not; each new server is waited for; the script goes on with the others and ends with an error |
| 5 | A start asked while a stop was still running was accepted, and the stop then wiped its mark | a sub-site that is being stopped is busy, and the list says "stopping" |
| 6 | A changed gateway configuration was not applied by the upgrade script | the gateway is made anew when its configuration differs |
| 7 | An OpenWA that Docker is starting again at that moment did not take a place | it does. (Left as they are: the free memory is read once per request, and stopped sub-sites are not limited in number — see Maintenance notes) |
| 8 | Whether a sub-site of a name runs can be told from outside (401 or 502) | left as it is — see Maintenance notes |
| 9 | Behind this gateway a cookie could never be marked for HTTPS only | a machine can say that its address is HTTPS (`WA_SCRM_COOKIE_SECURE`) |
| 10 | After an upgrade a stopped sub-site was listed as failed, its server being gone | it is listed as stopped; the next start makes the server anew |
| 11 | An address that is none (`GET //`) was written to the provisioner's log before the secret was asked for | the secret is asked for first; such an address is "not found" and not written down |
| 12 | A setting of 0 was taken for "not set" | a 0 is a number and is meant; what is no whole number is refused |
| 13 | The gateway's log held the query strings — and with them customers' numbers, which are in the address of a picture | its lines have no query string |

Also from the review: an answer of the Docker Engine that breaks off no longer leaves the provisioner waiting for good; the restricted key of a sub-site's OpenWA has a name of its own for every attempt; OpenWA's deliveries, which go from container to container, are not passed by the gateway from outside; a machine can set the memory limit of a sub-site's OpenWA (the first sub-site ran with 2 GB when it was set up by hand).

### Decisions already made (do not re-open; do not ask)

- An employee's sign-in name is the id of the sub-site: 3 to 32 of a–z, 0–9 and the hyphen, beginning and ending with a letter or a digit, and none of the platform's own names (`master`, `gateway`, `provisioner`). A supervisor's name keeps the wider rule it has.
- The sub-site is asked for **before** the account is made: it is the part that can be refused. What would stop the account (name, display name, password, a name that is taken) is looked at before that.
- A sub-site that exists and belongs to no account — the making of its account went wrong the last time — is taken by the account that is made under its name, and started. A sub-site that any account belongs to is never taken. (A supervisor can give anybody a new password and sign in as them anyway; this gives them nothing new.)
- Switching off: the account first, then the sub-site — and only when no other employee of that sub-site can still sign in. Switching on: the sub-site first; when it cannot be started the account stays off.
- A server without a provisioner refuses `role: 'agent'` as before, and its list of sub-sites has neither `state` nor `provisioned`.
- Not offered: removing an account, a sub-site or its data; renaming; making administrators.
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/site-provisioner.cjs` | `af7e64e23143b140a9bdb498e6f5c8d5a3d526e58ce62c6a56fcf13aec68e114` | `50595fb5494189bdf4cf971962a114ae1b138aba8c3b73be5cae8324967df762` | 18 |
| `work/wa-replica/site-provisioner.test.cjs` | `6e4ee3a6dc7cb6b6296b1cbdda9e8857f68b0edf2072d8af66da30172e2351cb` | `30ac1fc784ce3f77bcc7982a440d9d5af96be655f35d5959e3a49193efd6fd6c` | 11 |
| `work/wa-replica/serve.cjs` | `41ec391efa5541010c0e4854eeb2dbe49de074f2fb1512a7005ca7731733dc93` | `7ed108bcfb3a65929bac3cbfd432af70211ab1d0f531b4dffe8c30845cccd2be` | 2 |
| `work/wa-replica/site-auth.cjs` | `a4008dba13265d18e9fc11592da7d825b78f9759245dc5eabc97d44be4d31e23` | `c9cff2ddab10f6969ae63b55c3d79a6acdc2c39abae97ba738b008a06fe20f6a` | 1 |
| `work/wa-replica/site-api.cjs` | `88cc23ada0f64946249a8263bd9183978dba4db48d74d723a4c685a28e7451a7` | `4a8320bffae7b4fae942b91568049f83e340cdeb8ec943f398136140c9fa83bf` | 13 |
| `work/wa-replica/site-api.test.cjs` | `c38b5125f28acee6817b52effce3420f6d4ef678d24c9381f85809e541cb162e` | `ef9f0dc97ba4214743043778ad4d7c525bec4a1bb4cad5cd7032d52968fee425` | 3 |
| `deploy/gateway.conf` | `fea9acd3eaf285b532faa08d1516c51a9d3b125203298f334181af916eb0940b` | `2d0b212c60ce49716687e8a14cd4ec38c5cbf320f27f21fa117b8fca17071d39` | 4 |
| `deploy/compose.yml` | `0d678c2f1837ac4011fe161b7c7ad51c619a30146b0224c0e2ade89145a33c74` | `347615acef3d6e506c80f9a1feac4b212fffb10cc4490779684d6a00e8618edf` | 3 |
| `deploy/platform.env.template` | `3381e2467e36e1dc5dfe03ee0d58afc0edafa3ce55ab2be9bd49cfcaef56c313` | `b5379835309e8c8a8fb1cb3418003447f17d4e3461b666a86b3c5ddc6dd0a2ae` | 3 |
| `deploy/upgrade.sh` | `bce69994be6945dc9ded532e9df67bffdb138a85cac9884a0d9819137748223a` | `a5c0905dd029eb0009021909138eb6f7e16248562f64ac59208c322a2c098bf2` | 3 |
| `work/wa-replica/fidelity-master.js` | `150ed6f270770a77d8a3ebfb92056b47b11b4dea90c82607fc8f8b313f04cbad` | `ee3db1afc1b58f658a23607cb25a00bc13db5ef66394baa061abaf786d63d3af` | 12 |
| `work/wa-replica/fidelity.css` | `450061d48a214ec56eed935554273ae4e190a98afeb9256c92ca1582acdb6970` | `8105f962a780c9de6054b18c63e01f42fd12932196cf79a4273fb553fc8cd59f` | 1 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `bf368974b129930d6b4d3533de0afe3bd324cf7a2038c6b581614eaeec8a3c5c` | `2ab95687f41136d2e8d0ea6be64ffca8382a01497580fa903d3a1c15563d2988` | 3 |
| `README.md` | `42c0404d1cd1ca31e21b66d5d51df64e70ae88f5c9f540b1420c949b338027e6` | `373d33d6c6299ba282a292f50019981741f55befa2147b0321affe3caa23ff35` | 2 |
| `replica/build-log.md` | `59a9675a4bd57bc1f7af5b77daa154a1085599511c7efffedfc1b6527b77bb18` | `48acf5269a0f95697bb8f608e32b8836dc39f67cdab50fad98afacde15363b62` | 1 append |

- `site-provisioner.cjs` — the provisioner (plan 055): `create({ config, docker, … })` gives `{ handle, list }`; `work` is a map of what is being made (`'working'`) and of what failed (the reason). Its tests use a stand-in Docker Engine on a socket.
- `site-api.cjs` — the routes of sign-in, accounts and data. `POST /api/auth/users` makes supervisors only; `disable` and `enable` switch an account off and on.
- `site-auth.cjs` — the store of accounts; `validPassword` is a function of the module that is not exported yet.
- `serve.cjs` — the server; it creates the routes with `require('./site-api.cjs').create({ dir, siteId })`.
- `fidelity-master.js` — the supervisor page (built into `outputs/wa-replica-prototype/master.js` as a copy); `fidelity.css` — its styles (built into `app.css`).
- `deploy/` — the files for containers (plan 055).
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly three output files differ: `app.css`, `master.js` and `validation.json` (written by the validator).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 87fd2de -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the provisioner | `$NODE --test work/wa-replica/site-provisioner.test.cjs` | `pass 10`, `fail 0` (they use a stand-in for Docker; no container is made) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 17`, `fail 0` |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 14`, `fail 0` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (they send a 16 MB file twice; allow a few seconds) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-056/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/site-provisioner.cjs`, `site-provisioner.test.cjs` (Step 2)
- `work/wa-replica/serve.cjs`, `site-auth.cjs`, `site-api.cjs`, `site-api.test.cjs` (Step 3)
- `deploy/gateway.conf`, `deploy/compose.yml`, `deploy/platform.env.template`, `deploy/upgrade.sh` (Step 4)
- `work/wa-replica/fidelity-master.js`, `fidelity.css`, `validate-scrm-lifecycle.cjs` (Step 5)
- `README.md`, `replica/build-log.md` (Step 6)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.css`, `master.js`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular `site-data.cjs`, `site-admin.cjs`, `openwa-link.cjs`, `ai-relay.cjs`, `fidelity-boot.js`, `fidelity-index.html`, `deploy/Dockerfile`, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. **Do not use Docker at all** — do not build an image, do not start a container, do not run the upgrade script.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/056-employees-with-sub-sites` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): make an employee together with a sub-site; harden the container files`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block whose text has a fence of its own (the README's) is opened and closed with four backticks; a block ends only at a line that equals its opening run of backticks. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 79 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the fifteen files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-056/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-056 && cat > /tmp/wa-scrm-plan-056/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 056: an employee is made together with a sub-site, and what the review of plan 055 found.
# No container is made and Docker is not needed. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; D="$ROOT/deploy"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the tests of the provisioner pass' "$("$NODE" --test "$W/site-provisioner.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 10 ℹ fail 0 '
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
has 'the provisioner is busy with a sub-site while it stops it' "$W/site-provisioner.cjs" "work.set(id, 'stopping');"
has 'the provisioner has the first server'"'"'s side' "$W/site-provisioner.cjs" 'module.exports = { create, engine, configFromEnv, client, clientFromEnv, openwaAddress, SITE_ID, RESERVED };'
has 'the server takes its client of the provisioner from the environment' "$W/serve.cjs" "workspaces: require('./site-provisioner.cjs').clientFromEnv() })"
has 'the server refuses an address with a backslash' "$W/serve.cjs" "includes('\\\\')) return sendJson(res, 400, { error: 'invalid-request' });"
has 'the rule for a password can be asked' "$W/site-auth.cjs" 'module.exports = { openAuth, validPassword, ROLES,'
has 'an employee'"'"'s sign-in name does as the name of a host' "$W/site-api.cjs" 'const EMPLOYEE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;'
has 'the sub-site is asked for before the account' "$W/site-api.cjs" "const site = body.role === 'agent' ? await newWorkspace(actor, body, given) : null;"
has 'the gateway keeps nothing of what is sent up' "$D/gateway.conf" 'proxy_request_buffering off;'
has 'the gateway passes no delivery of OpenWA from outside' "$D/gateway.conf" 'location = /api/wa/hook { return 404; }'
has 'a machine sets the memory of a server' "$D/compose.yml" '      - WA_SCRM_SERVER_MEMORY_MB=${WA_SCRM_SERVER_MEMORY_MB:-512}'
has 'the settings template names the new settings' "$D/platform.env.template" 'WA_SCRM_COOKIE_SECURE=0'
has 'the upgrade script knows a sub-site by its OpenWA' "$D/upgrade.sh" 'docker ps -a --filter label=wa-scrm.part=openwa --format'
same 'the upgrade script passes the syntax check' "$(bash -n "$D/upgrade.sh" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
has 'the page offers an employee where sub-sites are made' "$O/master.js" 'const kind = state.provisioned'
same 'the built page is the copy of its source' "$(cmp -s "$O/master.js" "$W/fidelity-master.js" && echo SAME)" SAME
has 'the style of the choice is built' "$O/app.css" '.fid-master-kinds'
has 'the README says how an employee is made' "$ROOT/README.md" '首次部署和以后每次更新代码用同一个脚本'
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 在主管视图里创建员工：账号、工作区和 WhatsApp 连接一起建立'
same 'of the built files only the page, its style and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.css|master\.js|validation\.json)$')" 0
same 'the server files pass the syntax check' "$(node --check "$W/serve.cjs" 2>/dev/null && node --check "$W/site-api.cjs" 2>/dev/null && node --check "$W/site-provisioner.cjs" 2>/dev/null && node --check "$W/fidelity-master.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-056/smoke.sh && ls -l /tmp/wa-scrm-plan-056/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/site-provisioner.cjs work/wa-replica/site-provisioner.test.cjs work/wa-replica/serve.cjs work/wa-replica/site-auth.cjs work/wa-replica/site-api.cjs work/wa-replica/site-api.test.cjs deploy/gateway.conf deploy/compose.yml deploy/platform.env.template deploy/upgrade.sh work/wa-replica/fidelity-master.js work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs README.md replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-056/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the tests of the provisioner pass` (got: ℹ pass 8 ℹ fail 0 ), `the sign-in and data tests pass` (got: ℹ pass 16 ℹ fail 0 ), `the provisioner is busy with a sub-site while it stops it`, `the provisioner has the first server's side`, `the server takes its client of the provisioner from the environment`, `the server refuses an address with a backslash`, `the rule for a password can be asked`, `an employee's sign-in name does as the name of a host`, `the sub-site is asked for before the account`, `the gateway keeps nothing of what is sent up`, `the gateway passes no delivery of OpenWA from outside`, `a machine sets the memory of a server`, `the settings template names the new settings`, `the upgrade script knows a sub-site by its OpenWA`, `the page offers an employee where sub-sites are made`, `the style of the choice is built`, `the README says how an employee is made` and `the build log has the entry` (eighteen checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The provisioner: what the review found, and the first server's side of it

#### `site-provisioner.cjs`

**Edit 2.1** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
// A log line carries the action, the sub-site and the outcome; never a key or a secret.
const http = require('node:http');
```

Replace them with:

```text
// A log line carries the action, the sub-site and the outcome; never a key or a secret.
// The first server's side is here as well (client, clientFromEnv): what it asks, and how it reads the answers.
const http = require('node:http');
```

**Edit 2.2** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
      });
    });
```

Replace them with:

```text
      });
      // An answer that breaks off must not leave its caller waiting for good.
      res.on('error', reject);
      res.on('close', () => { if (!res.complete) reject(new Error('the Docker Engine ended its answer early')); });
    });
```

**Edit 2.3** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
  const labels = (id, part) => ({ 'wa-scrm.site': id, 'wa-scrm.part': part });
  // What is being made right now, and what went wrong last time: id → 'working' | the reason it failed.
  const work = new Map();

```

Replace them with:

```text
  const labels = (id, part) => ({ 'wa-scrm.site': id, 'wa-scrm.part': part });
  // What is being made or started right now ('working'), what is being stopped ('stopping'), and what went
  // wrong the last time (the reason it failed), by id.
  const work = new Map();
  const busy = id => work.get(id) === 'working' || work.get(id) === 'stopping';
  // Does this part take memory: it runs, or Docker is starting it again this moment.
  const up = part => part?.state === 'running' || part?.state === 'restarting';

```

**Edit 2.4** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
  }
  // ready: both run and OpenWA answers. starting: on the way there. stopped: both are there and do not run.
  // failed: the last attempt to make or start it went wrong, or a part is missing.
  function stateOf(id, parts) {
    if (work.get(id) === 'working') return 'starting';
    const { server, openwa } = parts || {};
```

Replace them with:

```text
  }
  // ready: both run and OpenWA answers. starting: on the way there. stopping: on the way down. stopped: its
  // OpenWA is there and does not run, and no server runs (the server may be gone: an upgrade takes it away, and
  // the next start makes it anew). failed: the last attempt to make or start it went wrong, or a part is missing.
  function stateOf(id, parts) {
    if (work.get(id) === 'working') return 'starting';
    if (work.get(id) === 'stopping') return 'stopping';
    const { server, openwa } = parts || {};
```

**Edit 2.5** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
    if (work.has(id)) return 'failed';
    if (server && openwa && server.state !== 'running' && openwa.state !== 'running') return 'stopped';
    return 'failed';
```

Replace them with:

```text
    if (work.has(id)) return 'failed';
    if (openwa && !up(openwa) && !up(server)) return 'stopped';
    return 'failed';
```

**Edit 2.6** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
  // How many sub-sites take a place: those whose OpenWA runs, and those that are being made or started.
  const taken = (sites, but) => [...new Set([...[...sites].filter(([, parts]) => parts.openwa?.state === 'running').map(([id]) => id), ...[...work].filter(([, state]) => state === 'working').map(([id]) => id)])].filter(id => id !== but).length;
  async function list() {
```

Replace them with:

```text
  // How many sub-sites take a place: those whose OpenWA runs, and those that are being made or started.
  const taken = (sites, but) => [...new Set([...[...sites].filter(([, parts]) => up(parts.openwa)).map(([id]) => id), ...[...work].filter(([, state]) => state === 'working').map(([id]) => id)])].filter(id => id !== but).length;
  async function list() {
```

**Edit 2.7** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
    return {
      sites: [...sites].sort(([a], [b]) => (a < b ? -1 : 1)).map(([id, parts]) => ({ id, state: stateOf(id, parts), ...(work.has(id) && work.get(id) !== 'working' ? { reason: work.get(id) } : {}) })),
      room: { max: config.maxSites, running, freeMb: free, minFreeMb: config.minFreeMb, canStart: running < config.maxSites && free >= config.minFreeMb },
```

Replace them with:

```text
    return {
      sites: [...sites].sort(([a], [b]) => (a < b ? -1 : 1)).map(([id, parts]) => ({ id, state: stateOf(id, parts), ...(work.has(id) && !busy(id) ? { reason: work.get(id) } : {}) })),
      room: { max: config.maxSites, running, freeMb: free, minFreeMb: config.minFreeMb, canStart: running < config.maxSites && free >= config.minFreeMb },
```

**Edit 2.8** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
  async function settings(id, masterKey) {
    const made = await fetch(openwaUrl(id) + '/api/auth/api-keys', { method: 'POST', headers: { 'X-API-Key': masterKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `wa-scrm-${id}`, role: 'operator' }), signal: AbortSignal.timeout(20000) });
    const key = made.status === 201 ? (await made.json()).apiKey : '';
```

Replace them with:

```text
  async function settings(id, masterKey) {
    const made = await fetch(openwaUrl(id) + '/api/auth/api-keys', { method: 'POST', headers: { 'X-API-Key': masterKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `wa-scrm-${id}-${Date.now().toString(36)}`, role: 'operator' }), signal: AbortSignal.timeout(20000) });
    const key = made.status === 201 ? (await made.json()).apiKey : '';
```

**Edit 2.9** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
      if (volume.status !== 200) ok(await docker('POST', '/volumes/create', { Name: n.volume, Labels: labels(id, 'openwa') }), 201);
      ok(await docker('POST', `/containers/create?name=${n.openwa}`, openwaSpec(id, masterKey)), 201);
      ok(await docker('POST', `/containers/${n.openwa}/start`), 204, 304);
```

Replace them with:

```text
      if (volume.status !== 200) ok(await docker('POST', '/volumes/create', { Name: n.volume, Labels: labels(id, 'openwa') }), 201);
      try {
        ok(await docker('POST', `/containers/create?name=${n.openwa}`, openwaSpec(id, masterKey)), 201);
      } catch (error) {
        // A volume made a moment ago for a container that then cannot be made — the image is not there — holds
        // nothing. Left behind it would pass for data whose settings are missing, and the id could never be used.
        if (volume.status !== 200) await docker('DELETE', `/volumes/${n.volume}`).catch(() => {});
        throw error;
      }
      ok(await docker('POST', `/containers/${n.openwa}/start`), 204, 304);
```

**Edit 2.10** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
      const id = known(body.id);
      if (work.get(id) === 'working') throw problem('busy');
      await claim(id, async () => {
```

Replace them with:

```text
      const id = known(body.id);
      if (busy(id)) throw problem('busy');
      await claim(id, async () => {
```

**Edit 2.11** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
      known(id);
      if (work.get(id) === 'working') throw problem('busy');
      await claim(id, async () => {
```

Replace them with:

```text
      known(id);
      if (busy(id)) throw problem('busy');
      await claim(id, async () => {
```

**Edit 2.12** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
        if (!parts && !fs.existsSync(path.join(config.dataDir, names(id).settings))) throw problem('unknown-site');
        if (parts?.openwa?.state !== 'running') await room(id);
      });
```

Replace them with:

```text
        if (!parts && !fs.existsSync(path.join(config.dataDir, names(id).settings))) throw problem('unknown-site');
        if (!up(parts?.openwa)) await room(id);
      });
```

**Edit 2.13** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
      known(id);
      if (work.get(id) === 'working') throw problem('busy');
      const parts = (await containers()).get(id);
      if (!parts) throw problem('unknown-site');
      // The server first, so that nothing is sent to an OpenWA that is going; OpenWA gets the time it needs to
      // put its session away.
      if (parts.server) ok(await docker('POST', `/containers/${names(id).server}/stop?t=10`), 204, 304);
      if (parts.openwa) ok(await docker('POST', `/containers/${names(id).openwa}/stop?t=75`), 204, 304);
      work.delete(id);
```

Replace them with:

```text
      known(id);
      if (busy(id)) throw problem('busy');
      // While it is being stopped — which takes its time — a sub-site is busy like one that is being made:
      // nothing else is begun with it.
      const before = work.get(id);
      work.set(id, 'stopping');
      try {
        const parts = (await containers()).get(id);
        if (!parts) throw problem('unknown-site');
        // The server first, so that nothing is sent to an OpenWA that is going; OpenWA gets the time it needs to
        // put its session away.
        if (parts.server) ok(await docker('POST', `/containers/${names(id).server}/stop?t=10`), 204, 304);
        if (parts.openwa) ok(await docker('POST', `/containers/${names(id).openwa}/stop?t=75`), 204, 304);
      } catch (error) {
        if (before === undefined) work.delete(id);
        else work.set(id, before);
        throw error;
      }
      work.delete(id);
```

**Edit 2.14** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname, named = pathname.match(/^\/sites\/([^/]+)\/(start|stop)$/);
      if (req.method === 'GET' && pathname === '/health') return send(200, { ok: true });
      const given = Buffer.from(String(req.headers.authorization || '').replace(/^Bearer /, '')), secret = Buffer.from(config.secret);
      if (given.length !== secret.length || !crypto.timingSafeEqual(given, secret)) throw problem('not-allowed');
      const route = routes[`${req.method} ${named ? '/sites/' + named[2] : pathname}`];
```

Replace them with:

```text
    try {
      if (req.method === 'GET' && req.url === '/health') return send(200, { ok: true });
      const given = Buffer.from(String(req.headers.authorization || '').replace(/^Bearer /, '')), secret = Buffer.from(config.secret);
      if (given.length !== secret.length || !crypto.timingSafeEqual(given, secret)) throw problem('not-allowed');
      // The address is looked at only now; what is no address is nothing the provisioner knows.
      let pathname;
      try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { throw problem('not-found'); }
      const named = pathname.match(/^\/sites\/([^/]+)\/(start|stop)$/);
      const route = routes[`${req.method} ${named ? '/sites/' + named[2] : pathname}`];
```

**Edit 2.15** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text

function configFromEnv(env = process.env) {
```

Replace them with:

```text

// The first server's side: asks the provisioner, with the shared secret. An answer that is no success is thrown
// as a problem named after the reason — workspace-exists, -full, -low-memory, -busy, -unknown-site — and
// everything else (no answer, a secret that does not fit, an answer nobody expects) as workspace-unavailable.
function client({ url, secret, timeoutMs = 20000, listTimeoutMs = 5000, stopTimeoutMs = 110000 }) {
  async function ask(method, pathname, sent, patience = timeoutMs) {
    let status = 0, answer = null;
    try {
      const response = await fetch(url + pathname, { method, headers: { Authorization: 'Bearer ' + secret, ...(sent ? { 'Content-Type': 'application/json' } : {}) }, body: sent ? JSON.stringify(sent) : undefined, signal: AbortSignal.timeout(patience) });
      status = response.status;
      answer = await response.json();
    } catch {}
    if ((status === 200 || status === 202) && answer && typeof answer === 'object') return answer;
    throw problem(['exists', 'full', 'low-memory', 'busy', 'unknown-site'].includes(answer?.error) ? 'workspace-' + answer.error : 'workspace-unavailable');
  }
  const named = (id, action) => `/sites/${encodeURIComponent(id)}/${action}`;
  return {
    // Every sub-site with its state, and the room that is left. Asked for a page that waits: not for long.
    list: async () => {
      const answer = await ask('GET', '/sites', undefined, listTimeoutMs);
      if (!Array.isArray(answer.sites) || !answer.room) throw problem('workspace-unavailable');
      return answer;
    },
    make: id => ask('POST', '/sites', { id }),
    start: id => ask('POST', named(id, 'start')),
    // Stopping takes as long as OpenWA needs to put its session away.
    stop: id => ask('POST', named(id, 'stop'), undefined, stopTimeoutMs),
  };
}
// The first server's client from its environment — or null where the platform makes no sub-sites:
//   WA_SCRM_PROVISIONER_URL           where the provisioner is reached, e.g. http://wa-scrm-provisioner:8090
//   WA_SCRM_PROVISIONER_SECRET_FILE   the file with the shared secret
function clientFromEnv(env = process.env) {
  if (!env.WA_SCRM_PROVISIONER_URL) return null;
  if (!/^https?:\/\/[^/\s]+$/.test(env.WA_SCRM_PROVISIONER_URL)) throw new Error('WA_SCRM_PROVISIONER_URL must be an address like http://host:port');
  if (!env.WA_SCRM_PROVISIONER_SECRET_FILE) throw new Error('WA_SCRM_PROVISIONER_SECRET_FILE is not set');
  const secret = fs.readFileSync(env.WA_SCRM_PROVISIONER_SECRET_FILE, 'utf8').trim();
  if (secret.length < 32) throw new Error('the shared secret must be at least 32 characters long');
  return client({ url: env.WA_SCRM_PROVISIONER_URL, secret });
}

function configFromEnv(env = process.env) {
```

**Edit 2.16** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
  if (!/^\d+:\d+$/.test(runAs)) throw new Error('WA_SCRM_RUN_AS must be <uid>:<gid>');
  return {
```

Replace them with:

```text
  if (!/^\d+:\d+$/.test(runAs)) throw new Error('WA_SCRM_RUN_AS must be <uid>:<gid>');
  // A number among the settings: its default when it is not set, else a whole number — 0 is one, and is meant.
  const number = (name, standard) => {
    if (env[name] === undefined || env[name] === '') return standard;
    if (!/^\d+$/.test(env[name])) throw new Error(name + ' must be a whole number');
    return Number(env[name]);
  };
  return {
```

**Edit 2.17** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text
    hostAiEnv: env.WA_SCRM_HOST_AI_ENV || '', network: env.WA_SCRM_NETWORK || 'wa-scrm',
    maxSites: Number(env.WA_SCRM_MAX_SITES) || 4, minFreeMb: Number(env.WA_SCRM_MIN_FREE_MB) || 1400, openwaMemoryMb: Number(env.WA_SCRM_OPENWA_MEMORY_MB) || 1536, serverMemoryMb: Number(env.WA_SCRM_SERVER_MEMORY_MB) || 256,
  };
```

Replace them with:

```text
    hostAiEnv: env.WA_SCRM_HOST_AI_ENV || '', network: env.WA_SCRM_NETWORK || 'wa-scrm',
    maxSites: number('WA_SCRM_MAX_SITES', 4), minFreeMb: number('WA_SCRM_MIN_FREE_MB', 1400), openwaMemoryMb: number('WA_SCRM_OPENWA_MEMORY_MB', 1536), serverMemoryMb: number('WA_SCRM_SERVER_MEMORY_MB', 256),
  };
```

**Edit 2.18** — `work/wa-replica/site-provisioner.cjs`. Find exactly these lines (they occur once):

```text

module.exports = { create, engine, configFromEnv, openwaAddress, SITE_ID, RESERVED };
```

Replace them with:

```text

module.exports = { create, engine, configFromEnv, client, clientFromEnv, openwaAddress, SITE_ID, RESERVED };
```

#### `site-provisioner.test.cjs`

**Edit 2.19** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
const path = require('node:path');
const { create, engine, configFromEnv, openwaAddress, RESERVED } = require('./site-provisioner.cjs');

```

Replace them with:

```text
const path = require('node:path');
const { create, engine, configFromEnv, client, clientFromEnv, openwaAddress, RESERVED } = require('./site-provisioner.cjs');

```

**Edit 2.20** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
const containers = new Map(), volumes = new Set(), calls = [];
let mood = 'ok', free = 4000;
const isOpenwa = c => c.spec.Labels['wa-scrm.part'] === 'openwa';
```

Replace them with:

```text
const containers = new Map(), volumes = new Set(), calls = [];
let mood = 'ok', free = 4000, stopDelay = 0;
const isOpenwa = c => c.spec.Labels['wa-scrm.part'] === 'openwa';
```

**Edit 2.21** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
      if (one[2] === 'start') { if (c.state === 'running') return send(304); Object.assign(c, { state: 'running', polls: 0 }); return send(204); }
      if (one[2] === 'stop') { if (c.state !== 'running') return send(304); c.state = 'exited'; return send(204); }
      c.polls += 1;
```

Replace them with:

```text
      if (one[2] === 'start') { if (c.state === 'running') return send(304); Object.assign(c, { state: 'running', polls: 0 }); return send(204); }
      if (one[2] === 'stop') { if (c.state !== 'running') return send(304); return void setTimeout(() => { c.state = 'exited'; send(204); }, stopDelay); }
      c.polls += 1;
```

**Edit 2.22** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
    const volume = url.pathname.match(/^\/volumes\/([^/]+)$/);
    if (volume) return send(volumes.has(volume[1]) ? 200 : 404, volumes.has(volume[1]) ? { Name: volume[1] } : { message: 'no such volume' });
```

Replace them with:

```text
    const volume = url.pathname.match(/^\/volumes\/([^/]+)$/);
    if (volume && req.method === 'DELETE') { volumes.delete(volume[1]); return send(204); }
    if (volume) return send(volumes.has(volume[1]) ? 200 : 404, volumes.has(volume[1]) ? { Name: volume[1] } : { message: 'no such volume' });
```

**Edit 2.23** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
  assert.deepEqual([(await call('/nothing')).status, (await call('/sites', { method: 'DELETE' })).status, (await call('/sites/t1/start')).status, (await call('/sites/t1/remove', { method: 'POST' })).status], [404, 405, 405, 404]);
  const from = calls.length;
```

Replace them with:

```text
  assert.deepEqual([(await call('/nothing')).status, (await call('/sites', { method: 'DELETE' })).status, (await call('/sites/t1/start')).status, (await call('/sites/t1/remove', { method: 'POST' })).status], [404, 405, 405, 404]);
  // what is no address at all: the secret is asked first, and nothing of it is written down
  assert.deepEqual([(await call('//', { secret: '' })).json, (await call('//')).json, (await call('/health?x=1', { secret: '' })).status, logged.some(line => line.includes('//'))], [{ error: 'not-allowed' }, { error: 'not-found' }, 401, false]);
  const from = calls.length;
```

**Edit 2.24** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
  }, 'what the caller sent beside the id — an image, a command, a limit — is nowhere');
  assert.deepEqual([volumes.has('wa-scrm-openwa-t1'), keys.length, keys[0].name, keys[0].role], [true, 1, 'wa-scrm-t1', 'operator']);
  // the settings file: where the OpenWA is, the restricted key, where and with what secret it delivers; private
```

Replace them with:

```text
  }, 'what the caller sent beside the id — an image, a command, a limit — is nowhere');
  assert.deepEqual([volumes.has('wa-scrm-openwa-t1'), keys.length, /^wa-scrm-t1-[0-9a-z]+$/.test(keys[0].name), keys[0].role], [true, 1, true, 'operator']);
  // the settings file: where the OpenWA is, the restricted key, where and with what secret it delivers; private
```

**Edit 2.25** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
  assert.deepEqual(await settled('t1'), { id: 't1', state: 'ready' });
});
```

Replace them with:

```text
  assert.deepEqual(await settled('t1'), { id: 't1', state: 'ready' });
  // while it is being stopped — which takes its time — it is busy: a start or another stop is refused, the list says that it stops
  stopDelay = 60;
  const stopping = call('/sites/t1/stop', { method: 'POST' });
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.deepEqual([(await call('/sites/t1/start', { method: 'POST' })).json, (await call('/sites/t1/stop', { method: 'POST' })).json, await stateOf('t1')], [{ error: 'busy' }, { error: 'busy' }, { id: 't1', state: 'stopping' }]);
  assert.deepEqual([(await stopping).json, await stateOf('t1')], [{ id: 't1', state: 'stopped' }, { id: 't1', state: 'stopped' }]);
  stopDelay = 0;
  // a stopped sub-site whose server was taken away — an upgrade does that — is stopped, not failed; the next start makes the server anew
  containers.delete('wa-scrm-site-t1');
  const anew = calls.length;
  assert.deepEqual([await stateOf('t1'), (await call('/sites/t1/start', { method: 'POST' })).status, await settled('t1'), changes(anew)], [{ id: 't1', state: 'stopped' }, 202, { id: 't1', state: 'ready' }, ['POST /containers/wa-scrm-openwa-t1/start', 'POST /containers/create?name=wa-scrm-site-t1', 'POST /containers/wa-scrm-site-t1/start']]);
});
```

**Edit 2.26** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
  assert.equal((await call('/sites/h1/start', { method: 'POST' })).status, 202);
  assert.deepEqual([await settled('h1'), keys.at(-1).name, settingsOf('h1').includes(keys.at(-1).apiKey)], [{ id: 'h1', state: 'ready' }, 'wa-scrm-h1', true], 'finished with the key its OpenWA was started with');
  await call('/sites/h1/stop', { method: 'POST' });
```

Replace them with:

```text
  assert.equal((await call('/sites/h1/start', { method: 'POST' })).status, 202);
  assert.deepEqual([await settled('h1'), keys.at(-1).name.startsWith('wa-scrm-h1-'), settingsOf('h1').includes(keys.at(-1).apiKey)], [{ id: 'h1', state: 'ready' }, true, true], 'finished with the key its OpenWA was started with');
  await call('/sites/h1/stop', { method: 'POST' });
```

**Edit 2.27** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
  }
  assert.deepEqual((await call('/sites')).json.room.running, 1, 'only the one that runs takes a place');
```

Replace them with:

```text
  }
  // the volume that was made for it is taken away again, so that the name can be used once the image is there
  assert.deepEqual([volumes.has('wa-scrm-openwa-i1'), calls.includes('DELETE /volumes/wa-scrm-openwa-i1')], [false, true]);
  assert.equal((await call('/sites', { method: 'POST', body: { id: 'i1' } })).status, 202);
  assert.deepEqual(await settled('i1'), { id: 'i1', state: 'ready' });
  // an OpenWA that Docker is starting again this moment takes its place like one that runs
  containers.get('wa-scrm-openwa-i1').state = 'restarting';
  assert.deepEqual([(await call('/sites')).json.room.running, (await call('/sites', { method: 'POST', body: { id: 'r1' } })).json], [2, { error: 'full' }]);
  containers.get('wa-scrm-openwa-i1').state = 'running';
  assert.equal((await call('/sites/i1/stop', { method: 'POST' })).status, 200);
  assert.deepEqual((await call('/sites')).json.room.running, 1, 'only the one that runs takes a place');
```

**Edit 2.28** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text

test('the settings from the environment: what is needed is asked for, the secret is long enough, the rest has its defaults', () => {
```

Replace them with:

```text

test('an answer of the engine that breaks off is an error, not a wait without end', async () => {
  const broken = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': 100 }); res.write('{"half":'); setImmediate(() => res.socket.destroy()); });
  const file = path.join(socketDir, 'broken.sock');
  await new Promise(resolve => broken.listen(file, resolve));
  try {
    await assert.rejects(engine(file)('GET', '/containers/json'));
  } finally {
    broken.closeAllConnections(); broken.close();
  }
});

test('the first server\'s side: it asks with the secret and reads the answers — a refusal by the name of its reason, everything else as not available', async () => {
  const ask = client({ url: base, secret: SECRET });
  assert.deepEqual(await ask.list(), (await call('/sites')).json);
  assert.deepEqual(await ask.make('c1'), { id: 'c1', state: 'starting' });
  assert.deepEqual(await settled('c1'), { id: 'c1', state: 'ready' });
  await assert.rejects(ask.make('c1'), { code: 'workspace-exists' });
  await assert.rejects(ask.make('c2'), { code: 'workspace-full' });
  assert.deepEqual(await ask.stop('c1'), { id: 'c1', state: 'stopped' });
  free = 1000;
  await assert.rejects(ask.start('c1'), { code: 'workspace-low-memory' });
  free = 4000;
  // while a sub-site is being started it is busy
  mood = 'never';
  assert.deepEqual(await ask.start('c1'), { id: 'c1', state: 'starting' });
  await assert.rejects(ask.start('c1'), { code: 'workspace-busy' });
  await assert.rejects(ask.stop('c1'), { code: 'workspace-busy' });
  assert.equal((await settled('c1')).state, 'failed');
  mood = 'ok';
  await ask.start('c1');
  assert.deepEqual(await settled('c1'), { id: 'c1', state: 'ready' });
  await assert.rejects(ask.start('nobody'), { code: 'workspace-unknown-site' });
  await assert.rejects(ask.stop('nobody'), { code: 'workspace-unknown-site' });
  // what is no sub-site's id is not available, and nothing of it reaches the engine with a change
  const from = calls.length;
  for (const id of ['a/b', '../x', 'A', 'master']) {
    await assert.rejects(ask.make(id), { code: 'workspace-unavailable' }, id);
    await assert.rejects(ask.start(id), { code: 'workspace-unavailable' }, id);
    await assert.rejects(ask.stop(id), { code: 'workspace-unavailable' }, id);
  }
  assert.deepEqual(changes(from), []);
  // a secret that does not fit, nobody at the address, an answer that is not the provisioner's
  await assert.rejects(client({ url: base, secret: SECRET + 'x' }).list(), { code: 'workspace-unavailable' });
  await assert.rejects(client({ url: 'http://127.0.0.1:9', secret: SECRET }).make('c3'), { code: 'workspace-unavailable' });
  await assert.rejects(client({ url: openwaBase, secret: SECRET }).list(), { code: 'workspace-unavailable' });
  assert.equal((await ask.stop('c1')).state, 'stopped');
  // from the environment: null where the platform makes no sub-sites; else the address and the secret are needed
  const secretFile = path.join(tmp, 'client-secret'), env = { WA_SCRM_PROVISIONER_URL: base, WA_SCRM_PROVISIONER_SECRET_FILE: secretFile };
  fs.writeFileSync(secretFile, SECRET + '\n');
  assert.equal(clientFromEnv({ WA_SCRM_PROVISIONER_SECRET_FILE: secretFile }), null);
  assert.deepEqual((await clientFromEnv(env).list()).room.max, 2);
  assert.throws(() => clientFromEnv({ ...env, WA_SCRM_PROVISIONER_URL: base + '/sites' }), /WA_SCRM_PROVISIONER_URL/);
  assert.throws(() => clientFromEnv({ WA_SCRM_PROVISIONER_URL: base }), /WA_SCRM_PROVISIONER_SECRET_FILE/);
  fs.writeFileSync(secretFile, 'too short');
  assert.throws(() => clientFromEnv(env), /at least 32/);
});

test('the settings from the environment: what is needed is asked for, the secret is long enough, the rest has its defaults', () => {
```

**Edit 2.29** — `work/wa-replica/site-provisioner.test.cjs`. Find exactly these lines (they occur once):

```text
  assert.deepEqual(configFromEnv({ ...env, WA_SCRM_MAX_SITES: '3', WA_SCRM_MIN_FREE_MB: '900', WA_SCRM_RUN_AS: '1001:1002', WA_SCRM_NETWORK: 'other', WA_SCRM_HOST_AI_ENV: '/host/ai.env' }).maxSites, 3);
  for (const name of Object.keys(env)) assert.throws(() => configFromEnv({ ...env, [name]: '' }), new RegExp(name), name);
```

Replace them with:

```text
  assert.deepEqual(configFromEnv({ ...env, WA_SCRM_MAX_SITES: '3', WA_SCRM_MIN_FREE_MB: '900', WA_SCRM_RUN_AS: '1001:1002', WA_SCRM_NETWORK: 'other', WA_SCRM_HOST_AI_ENV: '/host/ai.env' }).maxSites, 3);
  // a number: a 0 is one and is meant; what is no whole number is refused
  const zero = configFromEnv({ ...env, WA_SCRM_MAX_SITES: '0', WA_SCRM_MIN_FREE_MB: '0', WA_SCRM_OPENWA_MEMORY_MB: '2048' });
  assert.deepEqual([zero.maxSites, zero.minFreeMb, zero.openwaMemoryMb, zero.serverMemoryMb], [0, 0, 2048, 256]);
  for (const value of ['four', '-1', '1.5', '2 ']) assert.throws(() => configFromEnv({ ...env, WA_SCRM_MAX_SITES: value }), /WA_SCRM_MAX_SITES must be a whole number/, value);
  for (const name of Object.keys(env)) assert.throws(() => configFromEnv({ ...env, [name]: '' }), new RegExp(name), name);
```

**Verify**: `sha256sum work/wa-replica/site-provisioner.cjs work/wa-replica/site-provisioner.test.cjs` → `50595fb5494189bdf4cf971962a114ae1b138aba8c3b73be5cae8324967df762`, `30ac1fc784ce3f77bcc7982a440d9d5af96be655f35d5959e3a49193efd6fd6c`; `node --check work/wa-replica/site-provisioner.cjs` exits 0; `$NODE --test work/wa-replica/site-provisioner.test.cjs` → `pass 10`, `fail 0`. If a checksum does not match, restore the file with `git checkout 87fd2de -- <file>` and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 3: The server: an employee with a sub-site; an address with a backslash

#### `serve.cjs`

**Edit 3.1** — `work/wa-replica/serve.cjs`. Find exactly these lines (they occur once):

```text
// OpenWA (openwa-link.cjs; settings file named by WA_SCRM_OPENWA_ENV). Without it, the server serves the page
// and the relay as before.
const site = process.env.WA_SCRM_DATA_DIR
  ? require('./site-api.cjs').create({ dir: process.env.WA_SCRM_DATA_DIR, siteId: process.env.WA_SCRM_SITE_ID || 'default' })
  : null;
```

Replace them with:

```text
// OpenWA (openwa-link.cjs; settings file named by WA_SCRM_OPENWA_ENV). Without it, the server serves the page
// and the relay as before. With WA_SCRM_PROVISIONER_URL set as well — on the first server of a platform that
// makes its sub-sites itself (site-provisioner.cjs) — an employee's account is made together with a sub-site.
const site = process.env.WA_SCRM_DATA_DIR
  ? require('./site-api.cjs').create({ dir: process.env.WA_SCRM_DATA_DIR, siteId: process.env.WA_SCRM_SITE_ID || 'default', workspaces: require('./site-provisioner.cjs').clientFromEnv() })
  : null;
```

**Edit 3.2** — `work/wa-replica/serve.cjs`. Find exactly these lines (they occur once):

```text
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
```

Replace them with:

```text
  try {
    // A backslash in the path is a slash to this server and none to a gateway in front of it: such a request
    // would be passed for one route and answered as another. Nobody asks so in earnest.
    if (req.url.split('?')[0].includes('\\')) return sendJson(res, 400, { error: 'invalid-request' });
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
```

#### `site-auth.cjs`

**Edit 3.3** — `work/wa-replica/site-auth.cjs`. Find exactly these lines (they occur once):

```text

module.exports = { openAuth, ROLES, PASSWORD_MIN, SESSION_IDLE_MS, SESSION_MAX_MS, LOCK_AFTER, LOCK_MS };
```

Replace them with:

```text

module.exports = { openAuth, validPassword, ROLES, PASSWORD_MIN, SESSION_IDLE_MS, SESSION_MAX_MS, LOCK_AFTER, LOCK_MS };
```

#### `site-api.cjs`

**Edit 3.4** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
//   POST /api/auth/password  { current, next }
//   GET  /api/auth/sites     the sub-sites and their employees, for supervisors and administrators
//   GET  /api/auth/users     every account, for supervisors and administrators
//   POST /api/auth/users     { username, name, role: 'supervisor', password? } → a new supervisor's account
//   POST /api/auth/users/reset | disable | enable   { username }: a new temporary password; the account off, on
```

Replace them with:

```text
//   POST /api/auth/password  { current, next }
//   GET  /api/auth/sites     the sub-sites and their employees, for supervisors and administrators; where the
//                            platform makes sub-sites, also the state of each
//   GET  /api/auth/users     every account, for supervisors and administrators
//   POST /api/auth/users     { username, name, role: 'supervisor', password? } → a new supervisor's account;
//                            with role 'agent', where the platform makes sub-sites, a new employee's
//   POST /api/auth/users/reset | disable | enable   { username }: a new temporary password; the account off, on
```

**Edit 3.5** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
// administrator. Each of these actions leaves a log line with who did it and to which account.
// A log line carries the action, the user name and the outcome; never a password, a token or data.
```

Replace them with:

```text
// administrator. Each of these actions leaves a log line with who did it and to which account.
// Where the platform makes its sub-sites itself (workspaces: the first server's client of site-provisioner.cjs),
// an employee's account is made together with a sub-site that bears the employee's sign-in name; the sub-site
// stops when the account is switched off and is started before the account is switched on again.
// A log line carries the action, the user name and the outcome; never a password, a token or data.
```

**Edit 3.6** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
const fs = require('node:fs');
const { openAuth } = require('./site-auth.cjs');
const { openData } = require('./site-data.cjs');

```

Replace them with:

```text
const fs = require('node:fs');
const { openAuth, validPassword } = require('./site-auth.cjs');
const { openData } = require('./site-data.cjs');
const { RESERVED } = require('./site-provisioner.cjs');

```

**Edit 3.7** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
const NAME_MAX = 60;
const STATUS = {
```

Replace them with:

```text
const NAME_MAX = 60;
// An employee's sign-in name where it is the name of a sub-site as well: what does as the name of a host.
const EMPLOYEE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;
const STATUS = {
```

**Edit 3.8** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
  'invalid-username': 400, 'invalid-name': 400, 'invalid-role': 400, 'own-account': 400, 'unknown-user': 404, 'username-taken': 409,
};
```

Replace them with:

```text
  'invalid-username': 400, 'invalid-name': 400, 'invalid-role': 400, 'own-account': 400, 'unknown-user': 404, 'username-taken': 409,
  'workspace-exists': 409, 'workspace-full': 409, 'workspace-low-memory': 409, 'workspace-busy': 409, 'workspace-unavailable': 503,
};
```

**Edit 3.9** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text

function create({ dir, siteId = 'default', now }) {
  if (!SITE_ID.test(siteId)) throw new Error('WA_SCRM_SITE_ID must be lower-case letters, digits and hyphens');
```

Replace them with:

```text

function create({ dir, siteId = 'default', now, workspaces = null }) {
  if (!SITE_ID.test(siteId)) throw new Error('WA_SCRM_SITE_ID must be lower-case letters, digits and hyphens');
```

**Edit 3.10** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text

  const routes = {
```

Replace them with:

```text

  // ---- sub-sites, where the platform makes them itself ----
  // Each thing asked of the provisioner leaves a line: what, who asked, for which sub-site, and how it went.
  async function asked(what, actor, id, work) {
    try {
      await work();
    } catch (error) {
      console.error(`site workspace ${what} failed by=${actor.username} site=${id} error=${error.code || error.name}`);
      throw error;
    }
    console.log(`site workspace ${what} ok by=${actor.username} site=${id}`);
  }
  // The sub-site of a new employee, asked for before the account is made: it is the part that can be refused —
  // no room, too little memory. It bears the employee's sign-in name. What would stop the account is looked at
  // first, so that no sub-site is made for an account that then is not.
  async function newWorkspace(actor, body, given) {
    const id = body.username.trim().toLowerCase();
    if (!EMPLOYEE.test(id) || RESERVED.includes(id)) throw problem('invalid-username');
    if (!body.name.trim()) throw problem('invalid-name');
    if (given && !validPassword(body.password)) throw problem('invalid-password');
    if (auth.listUsers().some(user => user.username === id)) throw problem('username-taken');
    await asked('make', actor, id, async () => {
      try {
        await workspaces.make(id);
      } catch (error) {
        // A sub-site that is there already and is nobody's — the making of its account went wrong the last
        // time — is taken, and started in case it does not run.
        if (error.code !== 'workspace-exists' || auth.listUsers().some(user => user.site === id)) throw error;
        await workspaces.start(id);
      }
    });
    return id;
  }
  // An employee's sub-site stops with the account, so that its place is free for another — unless another
  // employee of the same sub-site can still sign in. The account is off whatever comes of this.
  async function workspaceOff(actor, target) {
    if (!workspaces || target.role !== 'agent' || auth.listUsers().some(user => user.site === target.site && !user.disabled)) return {};
    try {
      await asked('stop', actor, target.site, () => workspaces.stop(target.site));
      return { workspace: 'stopped' };
    } catch (error) {
      // A sub-site the platform did not make has nothing to stop; one that could not be stopped still runs.
      return error.code === 'workspace-unknown-site' ? {} : { workspace: 'running' };
    }
  }
  // An employee's sub-site is started before the account is switched on: when it cannot be — no room for it —
  // the account stays off.
  async function workspaceOn(actor, target) {
    if (!workspaces || target.role !== 'agent') return {};
    try {
      await asked('start', actor, target.site, () => workspaces.start(target.site));
      return { workspace: 'starting' };
    } catch (error) {
      if (error.code === 'workspace-unknown-site') return {};
      throw error;
    }
  }

  const routes = {
```

**Edit 3.11** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
    // The sub-sites and the employees of each, from the accounts: what the supervisor page lists.
    'GET /api/auth/sites': req => {
      if (signedIn(req).role === 'agent') throw problem('forbidden');
```

Replace them with:

```text
    // The sub-sites and the employees of each, from the accounts: what the supervisor page lists.
    'GET /api/auth/sites': async req => {
      if (signedIn(req).role === 'agent') throw problem('forbidden');
```

**Edit 3.12** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
      }
      return { body: { sites: [...sites].sort(([a], [b]) => (a < b ? -1 : 1)).map(([site, employees]) => ({ site, employees })) } };
    },
```

Replace them with:

```text
      }
      // Where the platform makes the sub-sites: the state of each, as the provisioner tells it — when it answers.
      const made = workspaces ? await workspaces.list().catch(() => null) : null;
      const state = site => (made ? { state: made.sites.find(entry => entry.id === site)?.state || 'missing' } : {});
      return { body: { sites: [...sites].sort(([a], [b]) => (a < b ? -1 : 1)).map(([site, employees]) => ({ site, employees, ...state(site) })), ...(workspaces ? { provisioned: true } : {}) } };
    },
```

**Edit 3.13** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
      if (typeof body.username !== 'string' || typeof body.name !== 'string') throw problem('invalid-request');
      if (body.role !== 'supervisor') throw problem('invalid-role');
      if (body.name.trim().length > NAME_MAX) throw problem('invalid-name');
```

Replace them with:

```text
      if (typeof body.username !== 'string' || typeof body.name !== 'string') throw problem('invalid-request');
      // A supervisor's account — or, where the platform makes sub-sites, an employee's, which comes with one.
      if (body.role !== 'supervisor' && !(body.role === 'agent' && workspaces)) throw problem('invalid-role');
      if (body.name.trim().length > NAME_MAX) throw problem('invalid-name');
```

**Edit 3.14** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
      const given = Boolean(body.password);
      const { user, password } = await auth.createUser({ username: body.username, name: body.name, role: body.role, password: given ? body.password : undefined, mustChange: !given });
      console.log(`site account created by=${actor.username} user=${user.username} role=${user.role}`);
```

Replace them with:

```text
      const given = Boolean(body.password);
      const site = body.role === 'agent' ? await newWorkspace(actor, body, given) : null;
      const { user, password } = await auth.createUser({ username: body.username, name: body.name, role: body.role, site, password: given ? body.password : undefined, mustChange: !given });
      console.log(`site account created by=${actor.username} user=${user.username} role=${user.role}`);
```

**Edit 3.15** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
      console.log(`site account disabled by=${actor.username} user=${target.username}`);
      return { body: { ok: true } };
    },
```

Replace them with:

```text
      console.log(`site account disabled by=${actor.username} user=${target.username}`);
      return { body: { ok: true, ...(await workspaceOff(actor, target)) } };
    },
```

**Edit 3.16** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
      const actor = manager(req), target = managed(actor, (await readJson(req)).username);
      auth.setDisabled(target.username, false);
      console.log(`site account enabled by=${actor.username} user=${target.username}`);
      return { body: { ok: true } };
    },
```

Replace them with:

```text
      const actor = manager(req), target = managed(actor, (await readJson(req)).username);
      const workspace = await workspaceOn(actor, target);
      auth.setDisabled(target.username, false);
      console.log(`site account enabled by=${actor.username} user=${target.username}`);
      return { body: { ok: true, ...workspace } };
    },
```

#### `site-api.test.cjs`

**Edit 3.17** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
const http = require('node:http');
const fs = require('node:fs');
```

Replace them with:

```text
const http = require('node:http');
const net = require('node:net');
const fs = require('node:fs');
```

**Edit 3.18** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text

test('the log names users and outcomes, never a password, a token or data', () => {
```

Replace them with:

```text

test('employees from the supervisor page, where the platform makes sub-sites: the sub-site is asked for first and bears the sign-in name; what is refused makes neither; off, the sub-site stops unless another employee of it can sign in; on, it starts first; the list tells each sub-site\'s state', async () => {
  // a stand-in for the first server's client of the provisioner: what it was asked, and how it answers
  const asked = [], states = new Map([['s1', 'ready'], ['s2', 'ready'], ['depot', 'ready'], ['orphan', 'stopped']]);
  const refuse = {};
  let reachable = true;
  const no = code => Object.assign(new Error(code), { code });
  const answer = (what, id, to) => {
    asked.push(`${what} ${id}`);
    if (!reachable) throw no('workspace-unavailable');
    if (refuse[what]) throw no(refuse[what]);
    if (what === 'make' ? states.has(id) : !states.has(id)) throw no(what === 'make' ? 'workspace-exists' : 'workspace-unknown-site');
    states.set(id, to);
    return { id, state: to };
  };
  const workspaces = {
    list: async () => { if (!reachable) throw no('workspace-unavailable'); return { sites: [...states].map(([id, state]) => ({ id, state })), room: { max: 4, running: 2, freeMb: 3000, minFreeMb: 1400, canStart: true } }; },
    make: async id => answer('make', id, 'starting'), start: async id => answer('start', id, 'starting'), stop: async id => answer('stop', id, 'stopped'),
  };
  const first = siteApi.create({ dir: path.join(tmp, 'main'), siteId: 'hq', now: () => clock, workspaces });
  const firstServer = http.createServer((req, res) => first.handle(req, res, new URL(req.url, 'http://localhost').pathname));
  await new Promise(resolve => firstServer.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${firstServer.address().port}`;
  try {
    const signIn = async (username, password = PASSWORD) => call('/api/auth/login', { method: 'POST', body: { username, password } });
    const [gus, ivo, joy] = [cookieOf(await signIn('gus')), cookieOf(await signIn('ivo')), cookieOf(await signIn('joy'))];
    const send = (pathname, cookie, body) => call(pathname, { method: 'POST', cookie, body, base });
    const sites = async (cookie = ivo) => (await call('/api/auth/sites', { cookie, base })).json;
    const account = async username => (await call('/api/auth/users', { cookie: ivo, base })).json.users.find(user => user.username === username);
    const count = async () => (await call('/api/auth/users', { cookie: ivo, base })).json.users.length;
    await site.auth.createUser({ username: 'otto', role: 'agent', name: 'Otto', site: 'depot' });
    await site.auth.createUser({ username: 'zed', role: 'agent', name: 'Zed', site: 'nowhere' });
    // the list: the platform makes sub-sites, and each one has its state — one the provisioner does not know is missing
    const list = await sites();
    assert.deepEqual([list.provisioned, list.sites.find(entry => entry.site === 's1').state, list.sites.find(entry => entry.site === 'depot').state, list.sites.find(entry => entry.site === 'nowhere').state], [true, 'ready', 'ready', 'missing']);
    assert.deepEqual(list.sites.find(entry => entry.site === 'depot'), { site: 'depot', employees: [{ username: 'otto', name: 'Otto', disabled: false }], state: 'ready' });
    // a server that is not the first server of such a platform says nothing of it, and makes no employee
    const plain = (await call('/api/auth/sites', { cookie: ivo })).json;
    assert.deepEqual([plain.provisioned, plain.sites.some(entry => 'state' in entry), (await call('/api/auth/users', { method: 'POST', cookie: ivo, body: { username: 'lena', name: 'Lena', role: 'agent' } })).json], [undefined, false, { error: 'invalid-role' }]);
    // a new employee: the sub-site is asked for, then the account is made — in its sub-site, with a temporary password
    asked.length = 0;
    const made = await send('/api/auth/users', ivo, { username: ' Lena ', name: ' Lena L ', role: 'agent' });
    assert.deepEqual([made.status, made.json.user, made.json.password.length, asked], [200, { username: 'lena', name: 'Lena L', role: 'agent' }, 16, ['make lena']]);
    assert.deepEqual(await account('lena'), { username: 'lena', name: 'Lena L', role: 'agent', site: 'lena', mustChangePassword: true, disabled: false });
    const lena = await call('/api/auth/login', { method: 'POST', base, body: { username: 'lena', password: made.json.password } });
    assert.deepEqual([lena.status, lena.cookies[1]], [200, 'scrm_site=lena; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000']);
    assert.deepEqual((await sites()).sites.find(entry => entry.site === 'lena'), { site: 'lena', employees: [{ username: 'lena', name: 'Lena L', disabled: false }], state: 'starting' });
    states.set('lena', 'ready');
    assert.equal((await sites(joy)).sites.find(entry => entry.site === 'lena').state, 'ready');
    // with a password of their own: it does not come back, and need not be changed
    const own = await send('/api/auth/users', joy, { username: 'mia-2', name: 'Mia', role: 'agent', password: 'mia-own-password' });
    assert.deepEqual([own.status, own.json, (await account('mia-2')).mustChangePassword, (await account('mia-2')).site], [200, { user: { username: 'mia-2', name: 'Mia', role: 'agent' } }, false, 'mia-2']);
    // a supervisor is made as before, and the provisioner is not asked
    asked.length = 0;
    assert.deepEqual([(await send('/api/auth/users', ivo, { username: 'sven', name: 'Sven', role: 'supervisor' })).status, asked, (await account('sven')).site], [200, [], null]);
    // what would stop the account is found before anything is asked of the provisioner
    const before = await count();
    for (const [body, error, status] of [
      [{ username: 'ab', name: 'Short' }, 'invalid-username', 400],
      [{ username: 'le.na', name: 'Dot' }, 'invalid-username', 400],
      [{ username: 'le_na', name: 'Underscore' }, 'invalid-username', 400],
      [{ username: 'lena-', name: 'Ends with a hyphen' }, 'invalid-username', 400],
      [{ username: '-lena', name: 'Begins with a hyphen' }, 'invalid-username', 400],
      [{ username: 'x'.repeat(33), name: 'Long' }, 'invalid-username', 400],
      [{ username: 'master', name: 'The platform\'s own' }, 'invalid-username', 400],
      [{ username: 'gateway', name: 'The platform\'s own' }, 'invalid-username', 400],
      [{ username: 'provisioner', name: 'The platform\'s own' }, 'invalid-username', 400],
      [{ username: 'rita', name: '  ' }, 'invalid-name', 400],
      [{ username: 'rita', name: 'x'.repeat(61) }, 'invalid-name', 400],
      [{ username: 'rita', name: 'Rita', password: 'short' }, 'invalid-password', 400],
      [{ username: 'rita', name: 'Rita', password: 12345678 }, 'invalid-password', 400],
      [{ username: 'lena', name: 'Again' }, 'username-taken', 409],
      [{ username: 'ivo', name: 'A supervisor\'s name' }, 'username-taken', 409],
      [{ username: 'rita', name: 'Rita', role: 'admin' }, 'invalid-role', 400],
    ]) {
      const refused = await send('/api/auth/users', ivo, { role: 'agent', ...body });
      assert.deepEqual([refused.status, refused.json], [status, { error }], JSON.stringify(body));
    }
    assert.deepEqual([asked, await count()], [[], before], 'nothing was asked, nothing was made');
    assert.deepEqual([(await send('/api/auth/users', gus, { username: 'rita', name: 'Rita', role: 'agent' })).json, (await call('/api/auth/users', { method: 'POST', base, body: { username: 'rita', name: 'Rita', role: 'agent' } })).status, (await call('/api/auth/users', { method: 'POST', base, cookie: ivo, body: { username: 'rita', name: 'Rita', role: 'agent' }, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, asked], [{ error: 'forbidden' }, 401, 403, []]);
    // what the provisioner refuses makes no account: no room, too little memory, busy, no answer, a sub-site that is somebody's
    for (const [reason, status] of [['workspace-full', 409], ['workspace-low-memory', 409], ['workspace-busy', 409], ['workspace-unavailable', 503]]) {
      refuse.make = reason;
      const refused = await send('/api/auth/users', ivo, { username: 'rita', name: 'Rita', role: 'agent' });
      assert.deepEqual([refused.status, refused.json], [status, { error: reason }]);
    }
    delete refuse.make;
    asked.length = 0;
    assert.deepEqual([(await send('/api/auth/users', ivo, { username: 'depot', name: 'Depot', role: 'agent' })).json, asked, await count()], [{ error: 'workspace-exists' }, ['make depot'], before], 'the sub-site of another account is not taken');
    // a sub-site that is there and is nobody's — its account was not made the last time — is taken and started
    asked.length = 0;
    const taken = await send('/api/auth/users', ivo, { username: 'orphan', name: 'Orphan', role: 'agent' });
    assert.deepEqual([taken.status, asked, (await account('orphan')).site, states.get('orphan')], [200, ['make orphan', 'start orphan'], 'orphan', 'starting']);
    refuse.start = 'workspace-full';
    states.set('second', 'stopped');
    assert.deepEqual([(await send('/api/auth/users', ivo, { username: 'second', name: 'Second', role: 'agent' })).json, await account('second')], [{ error: 'workspace-full' }, undefined], 'not when it cannot be started');
    delete refuse.start;
    // off: the session ends, and the sub-site stops — its place is free
    asked.length = 0;
    const off = await send('/api/auth/users/disable', ivo, { username: 'lena' });
    assert.deepEqual([off.json, asked, (await call('/api/auth/me', { cookie: cookieOf(lena), base })).status, (await sites()).sites.find(entry => entry.site === 'lena')], [{ ok: true, workspace: 'stopped' }, ['stop lena'], 401, { site: 'lena', employees: [{ username: 'lena', name: 'Lena L', disabled: true }], state: 'stopped' }]);
    // on: the sub-site is started first — when there is no room for it, the account stays off
    asked.length = 0;
    refuse.start = 'workspace-full';
    assert.deepEqual([(await send('/api/auth/users/enable', ivo, { username: 'lena' })).json, asked, (await account('lena')).disabled], [{ error: 'workspace-full' }, ['start lena'], true]);
    refuse.start = 'workspace-low-memory';
    assert.deepEqual([(await send('/api/auth/users/enable', ivo, { username: 'lena' })).status, (await account('lena')).disabled], [409, true]);
    delete refuse.start;
    assert.deepEqual([(await send('/api/auth/users/enable', joy, { username: 'lena' })).json, (await account('lena')).disabled, states.get('lena')], [{ ok: true, workspace: 'starting' }, false, 'starting']);
    // a sub-site with several employees stops only when the last of them who could sign in is switched off
    const several = (await sites()).sites.find(entry => entry.site === 's2').employees.map(employee => employee.username);
    assert(several.length > 2 && several.includes('max'));
    asked.length = 0;
    for (const username of several.slice(1)) assert.deepEqual((await send('/api/auth/users/disable', ivo, { username })).json, { ok: true }, username);
    assert.deepEqual(asked, [], 'the first of them can still sign in');
    assert.deepEqual([(await send('/api/auth/users/disable', ivo, { username: several[0] })).json, asked, states.get('s2')], [{ ok: true, workspace: 'stopped' }, ['stop s2'], 'stopped']);
    for (const username of several) assert.deepEqual((await send('/api/auth/users/enable', ivo, { username })).json, { ok: true, workspace: 'starting' }, username);
    states.set('s2', 'ready');
    // a sub-site that cannot be stopped: the account is off all the same, and the answer says that it still runs
    refuse.stop = 'workspace-unavailable';
    assert.deepEqual([(await send('/api/auth/users/disable', ivo, { username: 'otto' })).json, (await account('otto')).disabled], [{ ok: true, workspace: 'running' }, true]);
    delete refuse.stop;
    // an employee whose sub-site the platform did not make, and a supervisor: the account only
    asked.length = 0;
    assert.deepEqual([(await send('/api/auth/users/disable', ivo, { username: 'zed' })).json, (await send('/api/auth/users/enable', ivo, { username: 'zed' })).json, (await account('zed')).disabled, asked], [{ ok: true }, { ok: true }, false, ['stop nowhere', 'start nowhere']]);
    asked.length = 0;
    assert.deepEqual([(await send('/api/auth/users/disable', ivo, { username: 'sven' })).json, (await send('/api/auth/users/enable', ivo, { username: 'sven' })).json, asked], [{ ok: true }, { ok: true }, []]);
    // the provisioner does not answer: the list is there without the states, and no employee is made
    reachable = false;
    const blind = await sites();
    assert.deepEqual([blind.provisioned, blind.sites.some(entry => 'state' in entry), blind.sites.find(entry => entry.site === 'lena').employees.length, (await send('/api/auth/users', ivo, { username: 'rita', name: 'Rita', role: 'agent' })).status, await account('rita')], [true, false, 1, 503, undefined]);
    reachable = true;
    // each thing asked of the provisioner is in the log with who asked; no password is
    const lines = logged.filter(line => line.startsWith('site workspace '));
    for (const line of ['site workspace make ok by=ivo site=lena', 'site workspace make ok by=joy site=mia-2', 'site workspace make failed by=ivo site=rita error=workspace-full', 'site workspace make failed by=ivo site=depot error=workspace-exists', 'site workspace make ok by=ivo site=orphan', 'site workspace stop ok by=ivo site=lena', 'site workspace start failed by=ivo site=lena error=workspace-full', 'site workspace start ok by=joy site=lena', 'site workspace stop failed by=ivo site=depot error=workspace-unavailable']) assert(lines.includes(line), line + '\n' + lines.join('\n'));
    assert(logged.includes('site account created by=ivo user=lena role=agent'));
    for (const secret of [made.json.password, 'mia-own-password']) assert(!logged.join('\n').includes(secret), 'a password in the log');
  } finally {
    firstServer.closeAllConnections(); firstServer.close(); first.close();
  }
});

test('the log names users and outcomes, never a password, a token or data', () => {
```

**Edit 3.19** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
    assert.equal((await fetch(on.base + '/')).status, 200, 'the page itself needs no sign-in');
    // the server is for this machine only, unless it is told to listen elsewhere — as it is in a container
```

Replace them with:

```text
    assert.equal((await fetch(on.base + '/')).status, 200, 'the page itself needs no sign-in');
    // an address with a backslash — a slash to this server, none to a gateway in front of it — is refused
    // (asked over a bare connection: a client of Node's own would not send such an address)
    const plainly = (method, pathname) => new Promise((resolve, reject) => {
      const socket = net.connect(Number(new URL(on.base).port), '127.0.0.1', () => socket.write(`${method} ${pathname} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n${method === 'POST' ? 'Content-Type: application/json\r\nContent-Length: 2\r\n\r\n{}' : '\r\n'}`));
      let answer = '';
      socket.on('data', chunk => { answer += chunk; });
      socket.on('end', () => resolve(Number(answer.split(' ')[1])));
      socket.on('error', reject);
    });
    assert.deepEqual([await plainly('POST', '/api/wa/\\..\\..\\auth/login'), await plainly('GET', '/api/site\\status'), await plainly('GET', '/api/site/status'), await plainly('GET', '/api/site/status?note=a\\b')], [400, 400, 200, 200]);
    // the server is for this machine only, unless it is told to listen elsewhere — as it is in a container
```

**Verify**: `sha256sum work/wa-replica/serve.cjs work/wa-replica/site-auth.cjs work/wa-replica/site-api.cjs work/wa-replica/site-api.test.cjs` → `7ed108bcfb3a65929bac3cbfd432af70211ab1d0f531b4dffe8c30845cccd2be`, `c9cff2ddab10f6969ae63b55c3d79a6acdc2c39abae97ba738b008a06fe20f6a`, `4a8320bffae7b4fae942b91568049f83e340cdeb8ec943f398136140c9fa83bf`, `ef9f0dc97ba4214743043778ad4d7c525bec4a1bb4cad5cd7032d52968fee425`; `node --check` on `work/wa-replica/serve.cjs`, `site-auth.cjs` and `site-api.cjs` exits 0; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 17`, `fail 0`. If a checksum does not match, restore the file with `git checkout 87fd2de -- <file>` and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 4: The files for containers

#### `deploy/gateway.conf`

**Edit 4.1** — `deploy/gateway.conf`. Find exactly these lines (they occur once):

```text
    resolver 127.0.0.11 valid=5s ipv6=off;
    access_log /dev/stdout;
    # The app limits its own requests (a save up to 8 MB, a file to send up to 16 MB); this only has to be above that.
```

Replace them with:

```text
    resolver 127.0.0.11 valid=5s ipv6=off;
    # A line of the log has no query string: the address of a picture or a file carries a customer's number.
    log_format plain '$remote_addr [$time_local] "$request_method $uri" $status $body_bytes_sent';
    access_log /dev/stdout plain;
    # The app limits its own requests (a save up to 8 MB, a file to send up to 16 MB); this only has to be above that.
```

**Edit 4.2** — `deploy/gateway.conf`. Find exactly these lines (they occur once):

```text
    scgi_temp_path /tmp/scgi;
    proxy_http_version 1.1;
```

Replace them with:

```text
    scgi_temp_path /tmp/scgi;
    # What is sent up goes on to the server as it comes, and an answer is passed on at the pace of whoever reads
    # it: nothing is kept in /tmp meanwhile, which is memory here.
    proxy_request_buffering off;
    proxy_max_temp_file_size 0;
    proxy_http_version 1.1;
```

**Edit 4.3** — `deploy/gateway.conf`. Find exactly these lines (they occur once):

```text
        listen 8141;

```

Replace them with:

```text
        listen 8141;
        # A backslash in the path is a slash to the servers behind and none here: such a request could be passed
        # for one route and answered as another. Nobody asks so in earnest.
        if ($request_uri ~ "^[^?]*\x5c") { return 400; }

```

**Edit 4.4** — `deploy/gateway.conf`. Find exactly these lines (they occur once):

```text
        }
        location = /api/data {
```

Replace them with:

```text
        }
        # Signing in, and what else is asked about accounts, is small: a larger body is refused here already.
        location /api/auth/ {
            client_max_body_size 16k;
            set $scrm_upstream "wa-scrm-master";
            proxy_pass http://$scrm_upstream:8080;
        }
        # What OpenWA delivers goes from container to container, never through here.
        location = /api/wa/hook { return 404; }
        location ~ ^/site/[a-z0-9][a-z0-9-]*/api/wa/hook$ { return 404; }
        location = /api/data {
```

#### `deploy/compose.yml`

**Edit 4.5** — `deploy/compose.yml`. Find exactly these lines (they occur once):

```text
      - 'no-new-privileges:true'
    mem_limit: 256m
    environment:
```

Replace them with:

```text
      - 'no-new-privileges:true'
    mem_limit: ${WA_SCRM_SERVER_MEMORY_MB:-512}m
    environment:
```

**Edit 4.6** — `deploy/compose.yml`. Find exactly these lines (they occur once):

```text
      - WA_SCRM_PROVISIONER_SECRET_FILE=/run/wa-scrm/provisioner.secret
    volumes:
```

Replace them with:

```text
      - WA_SCRM_PROVISIONER_SECRET_FILE=/run/wa-scrm/provisioner.secret
      - WA_SCRM_COOKIE_SECURE=${WA_SCRM_COOKIE_SECURE:-0}
    volumes:
```

**Edit 4.7** — `deploy/compose.yml`. Find exactly these lines (they occur once):

```text
      - WA_SCRM_MIN_FREE_MB=${WA_SCRM_MIN_FREE_MB:-1400}
    volumes:
```

Replace them with:

```text
      - WA_SCRM_MIN_FREE_MB=${WA_SCRM_MIN_FREE_MB:-1400}
      - WA_SCRM_OPENWA_MEMORY_MB=${WA_SCRM_OPENWA_MEMORY_MB:-1536}
      - WA_SCRM_SERVER_MEMORY_MB=${WA_SCRM_SERVER_MEMORY_MB:-512}
    volumes:
```

#### `deploy/platform.env.template`

**Edit 4.8** — `deploy/platform.env.template`. Find exactly these lines (they occur once):

```text
# A file with the secret the first server and the provisioner share: one line, at least 32 characters,
# readable by the user below only. Make it once:  head -c 48 /dev/urandom | base64 > <file>
WA_SCRM_HOST_SECRET=/home/ubuntu/workspace/secrets/wa-scrm-provisioner.secret
```

Replace them with:

```text
# A file with the secret the first server and the provisioner share: one line, at least 32 characters,
# readable by the user below only, and not inside the data folder. Make it once:
#   (umask 077; head -c 48 /dev/urandom | base64 > <file>)
WA_SCRM_HOST_SECRET=/home/ubuntu/workspace/secrets/wa-scrm-provisioner.secret
```

**Edit 4.9** — `deploy/platform.env.template`. Find exactly these lines (they occur once):

```text
WA_SCRM_PORT=8141
# How many sub-sites may run, and how much memory (MB) must be free on the machine before one more is started.
```

Replace them with:

```text
WA_SCRM_PORT=8141
# 1 when the address people open is HTTPS (a proxy with a certificate in front of the gateway): the cookies of a
# session are then marked for HTTPS only. 0 for plain HTTP.
WA_SCRM_COOKIE_SECURE=0
# How many sub-sites may run, and how much memory (MB) must be free on the machine before one more is started.
```

**Edit 4.10** — `deploy/platform.env.template`. Find exactly these lines (they occur once):

```text
WA_SCRM_MIN_FREE_MB=1400
```

Replace them with:

```text
WA_SCRM_MIN_FREE_MB=1400
# The most memory (MB) the OpenWA of one sub-site may take. It holds for an OpenWA from the moment it is made.
WA_SCRM_OPENWA_MEMORY_MB=1536
# The most memory (MB) one server may take: the first server, and the server of each sub-site.
WA_SCRM_SERVER_MEMORY_MB=512
```

#### `deploy/upgrade.sh`

**Edit 4.11** — `deploy/upgrade.sh`. Find exactly these lines (they occur once):

```text
#!/usr/bin/env bash
# Brings a machine's platform to the version of this checkout: builds the image of the servers, renews the three
# containers that are always there, and gives the server of every sub-site the new image. A sub-site's OpenWA is
# left alone, so no WhatsApp connection is interrupted. Run from anywhere, as a user that may use Docker:
#   bash deploy/upgrade.sh <the machine's settings file>
```

Replace them with:

```text
#!/usr/bin/env bash
# Brings a machine's platform to the version of this checkout — the first time as well: builds the image of the
# servers, renews the three containers that are always there (the gateway also when only its configuration
# changed), fetches the image of OpenWA when the machine does not have it, and gives the server of every
# sub-site the new image. A sub-site's OpenWA is left alone, so no WhatsApp connection is interrupted.
# Run from anywhere, as a user that may use Docker:
#   bash deploy/upgrade.sh <the machine's settings file>
```

**Edit 4.12** — `deploy/upgrade.sh`. Find exactly these lines (they occur once):

```text
cd "$(dirname "$0")/.."
IMAGE=$(sed -n 's/^WA_SCRM_SERVER_IMAGE=//p' "$SETTINGS")
```

Replace them with:

```text
cd "$(dirname "$0")/.."
COMPOSE=(docker compose -f deploy/compose.yml --env-file "$SETTINGS")
IMAGE=$(sed -n 's/^WA_SCRM_SERVER_IMAGE=//p' "$SETTINGS")
```

**Edit 4.13** — `deploy/upgrade.sh`. Find exactly these lines (they occur once):

```text
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

Replace them with:

```text
docker build -q -f deploy/Dockerfile -t "$IMAGE" . > /dev/null
"${COMPOSE[@]}" up -d
# The gateway reads its configuration when it starts: a container that still has an older one is made anew.
if ! docker exec wa-scrm-gateway cat /etc/nginx/nginx.conf | cmp -s - deploy/gateway.conf; then
  echo "the gateway gets its new configuration"
  "${COMPOSE[@]}" up -d --force-recreate gateway
fi
healthy() { [ "$(docker inspect -f '{{.State.Health.Status}}' wa-scrm-provisioner 2> /dev/null)" = healthy ]; }
for i in $(seq 1 60); do
  healthy && break
  sleep 2
done
# Nothing of a sub-site is touched unless the provisioner is there to put it right again.
healthy || { echo "the provisioner is not healthy: the sub-sites are left as they are" >&2; exit 1; }
# The provisioner makes containers, it fetches no image: the one of OpenWA is fetched here when it is missing.
OPENWA=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' wa-scrm-provisioner | sed -n 's/^WA_SCRM_OPENWA_IMAGE=//p')
docker image inspect "$OPENWA" > /dev/null 2>&1 || { echo "fetching $OPENWA"; docker pull -q "$OPENWA" > /dev/null; }
# The sub-sites, each known by its OpenWA. Where that runs, the server is made anew by the provisioner — also a
# server that an earlier run of this script took away and could not bring back. Where it is stopped, the server
# is only removed and gets the new image when the sub-site is started the next time. A sub-site that cannot be
# started does not keep the others waiting: the script then ends with an error, and can be run again.
running() { [ "$(docker inspect -f '{{.State.Running}}' "wa-scrm-site-$1" 2> /dev/null)" = true ]; }
LEFT=0
while read -r SITE STATE; do
  [[ "$SITE" =~ ^[a-z0-9][a-z0-9-]{0,39}$ ]] || continue
  docker rm -f "wa-scrm-site-$SITE" > /dev/null 2>&1 || true
  if [ "$STATE" != running ] && [ "$STATE" != restarting ]; then
    echo "sub-site $SITE is stopped; it gets the new image when it is started"
    continue
  fi
  docker exec -e SITE="$SITE" wa-scrm-master node -e "const secret=require('fs').readFileSync('/run/wa-scrm/provisioner.secret','utf8').trim();fetch('http://wa-scrm-provisioner:8090/sites/'+process.env.SITE+'/start',{method:'POST',headers:{Authorization:'Bearer '+secret}}).then(r=>{if(r.status!==202)console.error('sub-site',process.env.SITE,'was NOT started: the provisioner answered',r.status);process.exit(r.status===202?0:1)},()=>{console.error('sub-site',process.env.SITE,'was NOT started: the provisioner did not answer');process.exit(1)})" < /dev/null || { LEFT=1; continue; }
  for i in $(seq 1 90); do
    running "$SITE" && break
    sleep 2
  done
  if running "$SITE"; then echo "sub-site $SITE renewed"; else echo "sub-site $SITE: its server did NOT start" >&2; LEFT=1; fi
done < <(docker ps -a --filter label=wa-scrm.part=openwa --format '{{.Label "wa-scrm.site"}} {{.State}}')
[ "$LEFT" = 0 ] || { echo "not every sub-site was started again: see above, then run this script once more" >&2; exit 1; }
echo "done"
```

**Verify**: `sha256sum deploy/gateway.conf deploy/compose.yml deploy/platform.env.template deploy/upgrade.sh` → `2d0b212c60ce49716687e8a14cd4ec38c5cbf320f27f21fa117b8fca17071d39`, `347615acef3d6e506c80f9a1feac4b212fffb10cc4490779684d6a00e8618edf`, `b5379835309e8c8a8fb1cb3418003447f17d4e3461b666a86b3c5ddc6dd0a2ae`, `a5c0905dd029eb0009021909138eb6f7e16248562f64ac59208c322a2c098bf2`; `bash -n deploy/upgrade.sh` exits 0; `git ls-files -s deploy/upgrade.sh` still begins with `100644`. Do not run any of these files. If a checksum does not match, restore the file with `git checkout 87fd2de -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 5: The page, its style, the validator — and the build

#### `fidelity-master.js`

**Edit 5.1** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
// of its data by someone who is not its own employee. What the page changes are accounts and nothing else: a new
// supervisor, a new temporary password for someone, an account switched off or on — and it signs out.
(() => {
```

Replace them with:

```text
// of its data by someone who is not its own employee. What the page changes are accounts and nothing else: a new
// supervisor — or, where the platform makes sub-sites, a new employee, who gets a sub-site of their own —, a new
// temporary password for someone, an account switched off or on — and it signs out.
(() => {
```

**Edit 5.2** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text

  // user: who is signed in. sites: the list, each { site, employees, reached, data, link }. users: every account.
  // open: the sub-site that is being looked at, { site, name, data, customer, query, chat } — or null for the list.
  // atEnd, endTop: whether the conversation shows its latest message, and where the page last put it there.
  const state = { user: null, sites: [], users: [], loading: true, failed: false, open: null, atEnd: true, endTop: -1 };

```

Replace them with:

```text

  // user: who is signed in. sites: the list, each { site, employees, state, reached, data, link } (state: of a
  // sub-site the platform made, as the server tells it). users: every account. provisioned: whether the platform
  // makes sub-sites, so that an employee can be made here.
  // open: the sub-site that is being looked at, { site, name, data, customer, query, chat } — or null for the list.
  // atEnd, endTop: whether the conversation shows its latest message, and where the page last put it there.
  const state = { user: null, sites: [], users: [], provisioned: false, loading: true, failed: false, open: null, atEnd: true, endTop: -1 };

```

**Edit 5.3** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
  }
  async function load() {
    state.loading = true;
    render();
    const [list, accounts] = await Promise.all([get('/api/auth/sites'), get('/api/auth/users')]);
```

Replace them with:

```text
  }
  // What the list says of a sub-site the platform made, while it is not ready to be read.
  const WORKSPACE = { starting: '正在准备，大约需要一分钟…', ready: '已就绪', stopping: '正在停止…', stopped: '已停止', failed: '启动失败，可先「停用」再「启用」重试', missing: '尚未创建' };
  const workspaceText = value => '工作区：' + (WORKSPACE[value] || '状态未知');
  // quiet: asked in passing, while a sub-site is being made or started — what is shown stays until the answer is
  // there, and a sub-site that was read already and is as it was is not read again.
  async function load(quiet = false) {
    if (!quiet) {
      state.loading = true;
      render();
    }
    const before = new Map(quiet ? state.sites.map(entry => [entry.site, entry]) : []);
    const [list, accounts] = await Promise.all([get('/api/auth/sites'), get('/api/auth/users')]);
```

**Edit 5.4** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    state.users = accounts.status === 200 ? rows(accounts.body.users) : [];
    state.sites = state.failed ? [] : await Promise.all(list.body.sites.map(async entry => {
      const [doc, link] = await Promise.all([get(at(entry.site, '/api/data?fields=accounts,customers,tasks')), get(at(entry.site, '/api/wa/status'))]);
```

Replace them with:

```text
    state.users = accounts.status === 200 ? rows(accounts.body.users) : [];
    state.provisioned = !state.failed && list.body.provisioned === true;
    state.sites = state.failed ? [] : await Promise.all(list.body.sites.map(async entry => {
      // A sub-site that does not run has nobody to answer for it.
      if (entry.state && entry.state !== 'ready') return { ...entry, reached: false, data: {}, link: null };
      const known = before.get(entry.site);
      if (known?.reached && known.state === entry.state) return { ...known, employees: entry.employees };
      const [doc, link] = await Promise.all([get(at(entry.site, '/api/data?fields=accounts,customers,tasks')), get(at(entry.site, '/api/wa/status'))]);
```

**Edit 5.5** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    state.loading = false;
    render();
  }
```

Replace them with:

```text
    state.loading = false;
    // What was asked in passing does not draw over an employee's conversations that were opened meanwhile.
    if (!quiet || !state.open) render();
    // The line about the new sub-site in the dialog that follows the making of an employee's account.
    const line = $('#master-workspace'), made = line && state.sites.find(entry => entry.site === line.dataset.id);
    if (made?.state) line.textContent = workspaceText(made.state);
    watch();
  }
  // While a sub-site is being made, started or stopped, the list is asked again every few seconds — until all
  // have settled, and not while an employee's conversations are open.
  function watch() {
    clearTimeout(watch.timer);
    if (!state.open && state.sites.some(entry => entry.state === 'starting' || entry.state === 'stopping')) watch.timer = setTimeout(() => load(true), 4000);
  }
```

**Edit 5.6** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
      const acts = `<div class="fid-master-acts">${entry.employees.map(employee => `<span>${entry.employees.length > 1 ? esc(employee.username) + (employee.disabled ? '（已停用）' : '') + '：' : ''}${accountActs(employee)}</span>`).join('')}</div>`;
      if (!drawn) return `<tr><td class="fid-master-who">${who}</td><td colspan="5" class="fid-master-quiet">暂时无法读取这位员工的工作区</td><td>${acts}</td></tr>`;
```

Replace them with:

```text
      const acts = `<div class="fid-master-acts">${entry.employees.map(employee => `<span>${entry.employees.length > 1 ? esc(employee.username) + (employee.disabled ? '（已停用）' : '') + '：' : ''}${accountActs(employee)}</span>`).join('')}</div>`;
      // A sub-site the platform made that is not ready — being prepared, stopped, failed — says so in its row.
      if (entry.state && entry.state !== 'ready') return `<tr><td class="fid-master-who">${who}</td><td colspan="5" class="fid-master-quiet">${esc(workspaceText(entry.state))}</td><td>${acts}</td></tr>`;
      if (!drawn) return `<tr><td class="fid-master-who">${who}</td><td colspan="5" class="fid-master-quiet">暂时无法读取这位员工的工作区</td><td>${acts}</td></tr>`;
```

**Edit 5.7** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text

  // ---- accounts: a new supervisor, a new temporary password, an account off or on ----
  const ROLE = { agent: '员工', supervisor: '主管', admin: '管理员' };
```

Replace them with:

```text

  // ---- accounts: a new supervisor or employee, a new temporary password, an account off or on ----
  const ROLE = { agent: '员工', supervisor: '主管', admin: '管理员' };
```

**Edit 5.8** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    'invalid-password': '密码至少 8 位；留空则生成临时密码。', 'own-account': '不能在这里操作自己的账号。', forbidden: '当前账号不能执行这个操作。', 'unknown-user': '这个账号已不存在，请刷新后再试。',
  };
  const problemText = answer => PROBLEM[answer.body.error] || (answer.status === 401 ? '登录已失效，请刷新页面后重新登录。' : '暂时无法完成，请稍后再试。');
  const label = username => {
```

Replace them with:

```text
    'invalid-password': '密码至少 8 位；留空则生成临时密码。', 'own-account': '不能在这里操作自己的账号。', forbidden: '当前账号不能执行这个操作。', 'unknown-user': '这个账号已不存在，请刷新后再试。',
    'workspace-full': '工作区数量已达上限，无法再启动新的工作区。停用一位员工可以空出位置。', 'workspace-low-memory': '服务器的可用内存不足，暂时无法启动新的工作区。', 'workspace-busy': '这个工作区正在准备中，请稍后再试。',
    'workspace-exists': '这个登录名对应的工作区已经存在，请换一个登录名。', 'workspace-unavailable': '暂时无法创建或启动工作区，请稍后再试。',
  };
  // An employee's sign-in name is the name of the sub-site as well, and has a narrower rule.
  const EMPLOYEE_NAME = '员工的登录名需为 3–32 位：小写字母、数字或连字符，并以字母或数字开头和结尾。';
  const problemText = (answer, role) => (role === 'agent' && answer.body.error === 'invalid-username' ? EMPLOYEE_NAME : PROBLEM[answer.body.error]) || (answer.status === 401 ? '登录已失效，请刷新页面后重新登录。' : '暂时无法完成，请稍后再试。');
  const label = username => {
```

**Edit 5.9** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
  function createForm(problem = '', values = {}) {
    showDialog('新建账号', `<form id="master-create" class="fid-master-form" novalidate>
        <p class="fid-master-kind">类型：主管（只读查看全部员工，并可管理账号）</p>
        <label class="field">登录名<input name="username" autocomplete="off" autocapitalize="none" spellcheck="false" value="${esc(values.username)}"></label>
```

Replace them with:

```text
  function createForm(problem = '', values = {}) {
    // Where the platform makes sub-sites the new account is an employee's — with a sub-site and a WhatsApp link
    // of their own — or a supervisor's; elsewhere it is a supervisor's.
    const kind = state.provisioned
      ? `<fieldset class="fid-master-kinds"><legend>类型</legend>
          <label><input type="radio" name="role" value="agent" ${values.role === 'supervisor' ? '' : 'checked'}>员工：独立工作区 + WhatsApp 号码</label>
          <label><input type="radio" name="role" value="supervisor" ${values.role === 'supervisor' ? 'checked' : ''}>主管：只读查看全部员工，并可管理账号</label>
        </fieldset>`
      : '<p class="fid-master-kind">类型：主管（只读查看全部员工，并可管理账号）</p>';
    showDialog('新建账号', `<form id="master-create" class="fid-master-form" novalidate>
        ${kind}
        <label class="field">登录名<input name="username" autocomplete="off" autocapitalize="none" spellcheck="false" value="${esc(values.username)}"></label>
```

**Edit 5.10** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
  async function createAccount(form) {
    const values = { username: form.elements.username.value.trim().toLowerCase(), name: form.elements.name.value.trim(), password: form.elements.password.value };
    for (const button of $('#dialog').querySelectorAll('button')) button.disabled = true;
    const answer = await post('/api/auth/users', { ...values, role: 'supervisor' });
    if (answer.status !== 200) return createForm(problemText(answer), values);
    showDialog('账号已创建', `<p>登录名：<strong>${esc(answer.body.user.username)}</strong>（${esc(answer.body.user.name)}，${ROLE[answer.body.user.role] || ''}）</p>${answer.body.password ? secretHTML(answer.body.password) : '<p class="fid-master-quiet">请使用刚才填写的密码登录。</p>'}`, DONE);
    load();
```

Replace them with:

```text
  async function createAccount(form) {
    const values = { role: form.elements.role?.value || 'supervisor', username: form.elements.username.value.trim().toLowerCase(), name: form.elements.name.value.trim(), password: form.elements.password.value };
    for (const button of $('#dialog').querySelectorAll('button')) button.disabled = true;
    const answer = await post('/api/auth/users', values);
    if (answer.status !== 200) return createForm(problemText(answer, values.role), values);
    const made = answer.body.user;
    // An employee's sub-site is being made while this is read: the line below it is kept up to date by load.
    showDialog('账号已创建', `<p>登录名：<strong>${esc(made.username)}</strong>（${esc(made.name)}，${ROLE[made.role] || ''}）</p>${answer.body.password ? secretHTML(answer.body.password) : '<p class="fid-master-quiet">请使用刚才填写的密码登录。</p>'}${made.role === 'agent' ? `<p id="master-workspace" data-id="${esc(made.username)}" role="status">${esc(workspaceText('starting'))}</p>` : ''}`, DONE);
    load();
```

**Edit 5.11** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
  }
  async function switchAccount(username, on) {
    const answer = await post(on ? '/api/auth/users/enable' : '/api/auth/users/disable', { username });
    closeDialog();
    say(answer.status === 200 ? (on ? '账号已启用' : '账号已停用') : problemText(answer));
    load();
```

Replace them with:

```text
  }
  // Is this the account whose switching off stops a sub-site: on a platform that makes sub-sites, the last
  // employee of a sub-site who can sign in?
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
```

**Edit 5.12** — `work/wa-replica/fidelity-master.js`. Find exactly these lines (they occur once):

```text
    resetDo: resetAccount,
    disable: username => askFirst('停用账号', `停用「${label(username)}」的账号？对方将无法登录，已经登录的页面也会失效。`, '停用', 'disableDo', username),
    disableDo: username => switchAccount(username, false),
```

Replace them with:

```text
    resetDo: resetAccount,
    disable: username => askFirst('停用账号', `停用「${label(username)}」的账号？对方将无法登录，已经登录的页面也会失效。${stops(username) ? '对方的工作区和 WhatsApp 连接会停止，数据保留；重新启用时再启动。' : ''}`, '停用', 'disableDo', username),
    disableDo: username => switchAccount(username, false),
```

#### `fidelity.css`

**Edit 5.13** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-master-kind { color:var(--fid-ink); font-size:13px; }
.fid-master-problem { color:var(--color-danger); font-size:13px; }
```

Replace them with:

```text
.fid-master-kind { color:var(--fid-ink); font-size:13px; }
.fid-master-kinds { display:grid; gap:8px; margin:0; padding:0; border:0; min-width:0; color:var(--fid-ink); font-size:13px; }
.fid-master-kinds legend { margin-bottom:6px; padding:0; }
.fid-master-kinds label { display:flex; align-items:center; gap:8px; cursor:pointer; }
.fid-master-kinds input { flex:none; margin:0; accent-color:var(--color-accent); }
.fid-master-problem { color:var(--color-danger); font-size:13px; }
```

#### `validate-scrm-lifecycle.cjs`

**Edit 5.14** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(masterSource.includes("const at = (site, path) => '/site/' + encodeURIComponent(site) + path;") && !/fetch\(at\(/.test(masterSource), 'the supervisor page must ask each sub-site under its own name, and only ask');
for (const required of ["'GET /api/auth/users': req => {", "'POST /api/auth/users': async req => {", "if (body.role !== 'supervisor') throw problem('invalid-role');", "if (target.username === actor.username) throw problem('own-account');", "if (target.role === 'admin' && actor.role !== 'admin') throw problem('forbidden');", 'console.log(`site account created by=${actor.username} user=${user.username} role=${user.role}`);']) {
  assert(siteSources['site-api.cjs'].includes(required), `site-api.cjs is missing ${required}`);
```

Replace them with:

```text
assert(masterSource.includes("const at = (site, path) => '/site/' + encodeURIComponent(site) + path;") && !/fetch\(at\(/.test(masterSource), 'the supervisor page must ask each sub-site under its own name, and only ask');
for (const required of ["'GET /api/auth/users': req => {", "'POST /api/auth/users': async req => {", "if (body.role !== 'supervisor' && !(body.role === 'agent' && workspaces)) throw problem('invalid-role');", "if (target.username === actor.username) throw problem('own-account');", "if (target.role === 'admin' && actor.role !== 'admin') throw problem('forbidden');", 'console.log(`site account created by=${actor.username} user=${user.username} role=${user.role}`);']) {
  assert(siteSources['site-api.cjs'].includes(required), `site-api.cjs is missing ${required}`);
```

**Edit 5.15** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
}
assert(!/演示|原型|评审|本机|示例|体验/.test(masterSource) && !/WA_SITE|localStorage|sessionStorage/.test(masterSource), 'the supervisor page must not speak of a demonstration, nor touch the app or the browser\'s storage');
```

Replace them with:

```text
}
// What the review of these files found, held: the provisioner asks for the secret before it reads the address,
// is busy with a sub-site while it stops it, and leaves no volume behind for a container it could not make; the
// server refuses an address that it and a gateway read differently; the gateway keeps nothing in memory that is
// sent up, logs no query string, passes no delivery of OpenWA from outside; the upgrade script knows a sub-site
// by its OpenWA and touches none while the provisioner is not there; a machine can set what it must.
assert(provisionerSource.indexOf("throw problem('not-allowed')") < provisionerSource.indexOf("new URL(req.url, 'http://localhost')"), 'the provisioner must check the shared secret before it reads the address');
assert(provisionerSource.includes("work.set(id, 'stopping');") && provisionerSource.includes("if (volume.status !== 200) await docker('DELETE', `/volumes/${n.volume}`).catch(() => {});") && !/Number\(env\.WA_SCRM_[A-Z_]+\) \|\|/.test(provisionerSource), 'the provisioner must be busy while it stops a sub-site, take away a volume it made for nothing, and take a 0 among its settings as meant');
assert(read(path.join(__dirname, 'serve.cjs')).includes("if (req.url.split('?')[0].includes('\\\\')) return sendJson(res, 400, { error: 'invalid-request' });"), 'the server must refuse an address with a backslash in its path');
for (const required of ['proxy_request_buffering off;', 'proxy_max_temp_file_size 0;', 'if ($request_uri ~ "^[^?]*\\x5c") { return 400; }', 'location = /api/wa/hook { return 404; }', 'location ~ ^/site/[a-z0-9][a-z0-9-]*/api/wa/hook$ { return 404; }', 'access_log /dev/stdout plain;', 'client_max_body_size 16k;']) {
  assert(deploy('gateway.conf').includes(required), `deploy/gateway.conf is missing ${required}`);
}
assert(!/log_format[^;]*\$(request|request_uri|args|query_string)\b/.test(deploy('gateway.conf')), 'the gateway must not write a query string into its log');
assert(deploy('upgrade.sh').includes("docker ps -a --filter label=wa-scrm.part=openwa --format") && deploy('upgrade.sh').includes('healthy || { echo "the provisioner is not healthy: the sub-sites are left as they are" >&2; exit 1; }') && deploy('upgrade.sh').indexOf('healthy || {') < deploy('upgrade.sh').indexOf('docker rm -f "wa-scrm-site-$SITE"'), 'the upgrade script must know a sub-site by its OpenWA and touch none while the provisioner is not healthy');
assert(compose.includes('      - WA_SCRM_OPENWA_MEMORY_MB=${WA_SCRM_OPENWA_MEMORY_MB:-1536}') && compose.includes('      - WA_SCRM_SERVER_MEMORY_MB=${WA_SCRM_SERVER_MEMORY_MB:-512}') && compose.includes('    mem_limit: ${WA_SCRM_SERVER_MEMORY_MB:-512}m') && compose.includes('      - WA_SCRM_COOKIE_SECURE=${WA_SCRM_COOKIE_SECURE:-0}'), 'a machine must be able to set the memory of a server and of a sub-site\'s OpenWA, and that its address is HTTPS');
// An employee is made from the supervisor page where the platform makes sub-sites: the first server asks the
// provisioner through its client — for the sub-site before the account, because the sub-site is the part that
// can be refused. Switched off, the account is off before its sub-site is stopped; switched on, the sub-site
// is started before the account is on. The page offers an employee only where the server says so.
const apiSource = siteSources['site-api.cjs'];
for (const required of ["function create({ dir, siteId = 'default', now, workspaces = null }) {", 'const EMPLOYEE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;', "if (!EMPLOYEE.test(id) || RESERVED.includes(id)) throw problem('invalid-username');", "if (error.code !== 'workspace-exists' || auth.listUsers().some(user => user.site === id)) throw error;", "if (!workspaces || target.role !== 'agent' || auth.listUsers().some(user => user.site === target.site && !user.disabled)) return {};", '...(workspaces ? { provisioned: true } : {})']) {
  assert(apiSource.includes(required), `site-api.cjs is missing ${required}`);
}
const asksFirst = apiSource.indexOf("const site = body.role === 'agent' ? await newWorkspace(actor, body, given) : null;");
assert(asksFirst > 0 && asksFirst < apiSource.indexOf('const { user, password } = await auth.createUser({ username: body.username, name: body.name, role: body.role, site,'), 'the sub-site of a new employee must be asked for before the account is made');
assert(apiSource.indexOf('auth.setDisabled(target.username, true);') < apiSource.indexOf('...(await workspaceOff(actor, target))') && apiSource.indexOf('const workspace = await workspaceOn(actor, target);') > 0 && apiSource.indexOf('const workspace = await workspaceOn(actor, target);') < apiSource.indexOf('auth.setDisabled(target.username, false);'), 'an account must be off before its sub-site is stopped, and a sub-site started before its account is on');
assert(read(path.join(__dirname, 'serve.cjs')).includes("workspaces: require('./site-provisioner.cjs').clientFromEnv() })"), 'the server must take its client of the provisioner from the environment');
assert(provisionerSource.includes("throw problem(['exists', 'full', 'low-memory', 'busy', 'unknown-site'].includes(answer?.error) ? 'workspace-' + answer.error : 'workspace-unavailable');") && provisionerSource.includes('const named = (id, action) => `/sites/${encodeURIComponent(id)}/${action}`;'), 'the first server\'s client must name a refusal by its reason, and an id must not reach into the address');
assert(masterSource.includes('const kind = state.provisioned') && masterSource.includes('state.provisioned = !state.failed && list.body.provisioned === true;') && masterSource.includes("const answer = await post('/api/auth/users', values);"), 'the supervisor page must offer an employee only where the server says that sub-sites are made');
assert(!/演示|原型|评审|本机|示例|体验/.test(masterSource) && !/WA_SITE|localStorage|sessionStorage/.test(masterSource), 'the supervisor page must not speak of a demonstration, nor touch the app or the browser\'s storage');
```

**Edit 5.16** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
}
for (const required of ["'GET /api/auth/sites': req => {", "if (signedIn(req).role === 'agent') throw problem('forbidden');", "if (user.role !== 'agent') console.log(`site data read user=${user.username} role=${user.role} site=${siteId} fields=${fields ? fields.join(',') : 'all'}`);", 'return { body: data.read(fields) };']) {
  assert(siteSources['site-api.cjs'].includes(required), `site-api.cjs is missing ${required}`);
```

Replace them with:

```text
}
for (const required of ["'GET /api/auth/sites': async req => {", "if (signedIn(req).role === 'agent') throw problem('forbidden');", "if (user.role !== 'agent') console.log(`site data read user=${user.username} role=${user.role} site=${siteId} fields=${fields ? fields.join(',') : 'all'}`);", 'return { body: data.read(fields) };']) {
  assert(siteSources['site-api.cjs'].includes(required), `site-api.cjs is missing ${required}`);
```

**Verify**: `sha256sum work/wa-replica/fidelity-master.js work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs` → `ee3db1afc1b58f658a23607cb25a00bc13db5ef66394baa061abaf786d63d3af`, `8105f962a780c9de6054b18c63e01f42fd12932196cf79a4273fb553fc8cd59f`, `2ab95687f41136d2e8d0ea6be64ffca8382a01497580fa903d3a1c15563d2988`; `git checkout 87fd2de -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.css`, `master.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else (if `icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one); `cmp outputs/wa-replica-prototype/master.js work/wa-replica/fidelity-master.js` exits 0; `sha256sum outputs/wa-replica-prototype/app.css` → `55866f353a93c48e496606896e87dc088d5674ce81acb2c547e4b841fdefb55f`. If a checksum does not match, restore the file with `git checkout 87fd2de -- <file>` and apply its instructions again; if it still does not match, or another output file changed, STOP.

### Step 6: README, build log, final verification

#### `README.md`

**Edit 6.1** — `README.md`. Find exactly these lines (they occur once):

````text
```
工具只显示一次临时密码，持有人首次登录后必须修改；自己设置的密码至少 8 位。员工登录后进入自己的子站，新子站从空白开始。主管与管理员登录后进入「主管视图」：员工总览列出每位员工的 WhatsApp 号码及连接状态、客户数、未读会话数、待跟进数和最近消息时间；点击「查看」可以只读方式查看该员工的客户与会话（含图片、语音、文件和已有译文）。主管视图不能发送消息，也不能修改任何员工工作区的数据；主管或管理员每读取一次子站数据，该子站的服务器都会记录一行日志（谁、哪个子站、读取了哪些内容）。主管与管理员还可以在主管视图里管理账号：查看全部账号，点击「新建账号」创建主管账号（填写密码则直接使用该密码，留空则生成只显示一次的临时密码，对方首次登录时必须修改），为他人「重置密码」，「停用」或「启用」账号。不能操作自己的账号，管理员账号只能由管理员操作；每次操作都会记入服务器日志（谁、对哪个账号、做了什么）。未设置 `WA_SCRM_DATA_DIR` 时页面只显示「服务器尚未启用账号」。

````

Replace them with:

````text
```
工具只显示一次临时密码，持有人首次登录后必须修改；自己设置的密码至少 8 位。员工登录后进入自己的子站，新子站从空白开始。主管与管理员登录后进入「主管视图」：员工总览列出每位员工的 WhatsApp 号码及连接状态、客户数、未读会话数、待跟进数和最近消息时间；点击「查看」可以只读方式查看该员工的客户与会话（含图片、语音、文件和已有译文）。主管视图不能发送消息，也不能修改任何员工工作区的数据；主管或管理员每读取一次子站数据，该子站的服务器都会记录一行日志（谁、哪个子站、读取了哪些内容）。主管与管理员还可以在主管视图里管理账号：查看全部账号，点击「新建账号」创建主管账号（填写密码则直接使用该密码，留空则生成只显示一次的临时密码，对方首次登录时必须修改），为他人「重置密码」，「停用」或「启用」账号。用容器运行整套平台时（见下文），「新建账号」还可以创建员工账号：系统同时为这位员工建立独立的工作区（子站）和 WhatsApp 连接，登录名即子站编号（3–32 位小写字母、数字或连字符，以字母或数字开头和结尾）；工作区数量达到上限或服务器内存不足时不会创建，也不会留下账号。停用员工账号会停止其工作区并空出位置（同一工作区还有其他可登录的员工时不停止），数据保留；启用时先启动工作区，无法启动则账号保持停用。不能操作自己的账号，管理员账号只能由管理员操作；每次操作都会记入服务器日志（谁、对哪个账号、做了什么）。未设置 `WA_SCRM_DATA_DIR` 时页面只显示「服务器尚未启用账号」。

````

**Edit 6.2** — `README.md`. Find exactly these lines (they occur once):

````text

首次部署（在服务器上，以能使用 Docker 的用户执行）：

```bash
docker build -f deploy/Dockerfile -t wa-scrm-server:current .          # 构建服务镜像
cp deploy/platform.env.template /私有目录/platform.env                   # 填写数据目录、AI 设置文件、共享密钥文件等路径
docker compose -f deploy/compose.yml --env-file /私有目录/platform.env up -d
```

之后每次更新代码，执行 `bash deploy/upgrade.sh /私有目录/platform.env`：重新构建镜像，更新三个常驻容器，并让每个子站的服务换用新镜像；子站的 OpenWA 不会被重启，WhatsApp 连接不中断。数据目录、AI 设置文件和共享密钥文件都放在仓库之外。

````

Replace them with:

````text

首次部署和以后每次更新代码用同一个脚本（在服务器上，以能使用 Docker 的用户执行）：

```bash
cp deploy/platform.env.template /私有目录/platform.env     # 仅首次：填写数据目录、AI 设置文件、共享密钥文件等路径
bash deploy/upgrade.sh /私有目录/platform.env
```

脚本构建服务镜像，启动或更新三个常驻容器（网关配置有变化时重建网关），在服务器上还没有 OpenWA 镜像时拉取它，并让每个子站的服务换用新镜像；子站的 OpenWA 不会被重启，WhatsApp 连接不中断。调度服务不正常时脚本不改动任何子站；某个子站没能重新启动时脚本以错误结束，排除原因后重新执行即可。数据目录、AI 设置文件和共享密钥文件都放在仓库之外。

网关不在内存里暂存上传的内容，访问日志不记录查询参数（其中可能含有客户号码），路径里带反斜杠的请求一律拒绝；OpenWA 的事件只在容器之间传递，不经过对外地址。

平台运行后，员工账号在「主管视图」里创建（见上文）：主服务把子站编号交给调度服务，调度服务创建并启动该子站的两个容器，网关随即按容器名找到它，不需要再登录服务器操作。新员工登录后在「WhatsApp API」里扫码绑定自己的号码。

````

#### `replica/build-log.md`

**Append 6.3** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 在主管视图里创建员工：账号、工作区和 WhatsApp 连接一起建立 · 2026-11-23

项目负责人要求管理界面可以创建用户，并确认了具体样式：「新建账号」可以选择类型——员工（独立工作区 + WhatsApp 号码）或主管；创建后只显示一次临时密码，并显示工作区从"正在准备"到"已就绪"；停用员工时其工作区停止并空出位置，启用时重新启动；数量已满或内存不足时给出明确提示，并且不创建任何内容。主管和管理员都可以管理账号。

- 这项功能只在平台以容器方式运行时提供（主服务配置了调度服务的地址）；其他部署方式下「新建账号」仍只创建主管，行为不变。
- 创建员工时，主服务先向调度服务申请工作区，再写入账号：工作区是可能被拒绝的一步（数量已满、内存不足），被拒绝时不会留下账号。员工的登录名同时是子站编号，所以只能使用小写字母、数字和连字符，并以字母或数字开头和结尾。
- 停用员工账号：账号立即失效，随后停止其工作区；同一工作区还有其他可以登录的员工时不停止。启用：先启动工作区，无法启动（数量已满、内存不足）则账号保持停用。
- 员工总览在工作区未就绪时显示它的状态（正在准备、已停止、启动失败）；准备期间每隔几秒自动更新，不需要手动点「刷新」，也不会重复读取其他员工的数据。
- 主服务向调度服务提出的每个请求都记入日志（谁、哪个子站、结果）。

同时处理了上一步（平台容器化）复查时发现的几处问题，见本次计划文件。

验证：接口测试用模拟的调度服务覆盖各个分支；浏览器测试在带模拟调度服务的测试环境中走完创建、停用、启用和各种拒绝情形；并在真实 Docker 上经网关由主管创建一名员工——该员工用临时密码登录、取得自己的扫码二维码，停用后两个容器停止，启用后重新启动——结束后全部清除。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout 87fd2de -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-056/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `373d33d6c6299ba282a292f50019981741f55befa2147b0321affe3caa23ff35`, `48acf5269a0f95697bb8f608e32b8836dc39f67cdab50fad98afacde15363b62`; `git status --porcelain` lists exactly these eighteen as changed and nothing as new: the fifteen files of the table in "Current state" and `outputs/wa-replica-prototype/app.css`, `master.js`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Tests of the provisioner** (10; two new, the others extended): what is no address at all is answered after the secret was asked for, and not written down; a new sub-site's restricted key has a name of its own; while a sub-site is being stopped a start or another stop is refused and the list says that it stops; a stopped sub-site whose server was taken away is stopped, and the next start makes the server anew; the volume made for an OpenWA that could not be made is taken away, and the id can be used again; an OpenWA that is being started again takes a place; an answer of the engine that breaks off is an error; a setting of 0 is meant and what is no whole number is refused; **the first server's side**: it asks with the secret, gives the answers, names a refusal by its reason (exists, full, low-memory, busy, unknown-site), takes everything else for "not available" — a wrong secret, nobody there, an answer that is not the provisioner's, an id that is none (which never reaches the engine) —, and is made from the environment or not at all.
- **Sign-in and data tests** (17; one new, one extended): with a stand-in for the provisioner's client — the list tells each sub-site's state and that sub-sites are made; a server without a provisioner says neither and makes no employee; a new employee: the sub-site is asked for first, the account is in the sub-site of its name, the temporary password works and names the sub-site in the cookie; a given password is kept; a supervisor is made without the provisioner being asked; sixteen ways to be refused before anything is asked; what the provisioner refuses makes no account; the sub-site of another account is not taken, one that is nobody's is taken and started; off stops the sub-site, on starts it first and leaves the account off when it cannot; a sub-site with several employees stops with the last who could sign in; a sub-site that cannot be stopped leaves the account off all the same; a sub-site the platform did not make, and a supervisor, are the account only; a provisioner that does not answer; every request in the log, no password. The test of the real server: an address with a backslash is refused, one without is not.
- **Validator** — the facts of both parts (see the block added in Step 5).
- **Smoke** (`/tmp/wa-scrm-plan-056/smoke.sh`) — the same facts, the syntax of the files, which built files changed, and the tests of the server, the relay and the link.
- **Verified by the reviewer, not by you**: in a browser against a stand-in provisioner — the choice of employee or supervisor, the temporary password shown once, the line that turns to "已就绪" by itself, the list that follows a sub-site on its way without re-reading the others, every refusal in the form with what was typed kept, switching off (the question, the wait, the note, the row) and on (refused without room, then started), a supervisor through the same form, the form on a phone; the earlier browser sessions of the supervisor page, of two servers behind a gateway and of the whole product. On a real Docker, on a test port and removed again: a supervisor makes an employee through the gateway; the employee signs in with the temporary password and gets a QR code from their own OpenWA; a second employee is refused while the one place is taken; off stops both containers, on starts them; the upgrade script renews the server of the one that runs and is put right by a second run after an interruption; a backslash is refused by the gateway and by a sub-site's server; a delivery of OpenWA from outside is not passed; a sign-in body of 40 KB is refused; the gateway's log has no query string; the limits follow the machine's settings.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 87fd2de -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/site-provisioner.test.cjs` → `pass 10`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 17`, `fail 0`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 14`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-056/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/site-provisioner.cjs` → `50595fb5494189bdf4cf971962a114ae1b138aba8c3b73be5cae8324967df762`
- [ ] `sha256sum work/wa-replica/site-provisioner.test.cjs` → `30ac1fc784ce3f77bcc7982a440d9d5af96be655f35d5959e3a49193efd6fd6c`
- [ ] `sha256sum work/wa-replica/serve.cjs` → `7ed108bcfb3a65929bac3cbfd432af70211ab1d0f531b4dffe8c30845cccd2be`
- [ ] `sha256sum work/wa-replica/site-auth.cjs` → `c9cff2ddab10f6969ae63b55c3d79a6acdc2c39abae97ba738b008a06fe20f6a`
- [ ] `sha256sum work/wa-replica/site-api.cjs` → `4a8320bffae7b4fae942b91568049f83e340cdeb8ec943f398136140c9fa83bf`
- [ ] `sha256sum work/wa-replica/site-api.test.cjs` → `ef9f0dc97ba4214743043778ad4d7c525bec4a1bb4cad5cd7032d52968fee425`
- [ ] `sha256sum deploy/gateway.conf` → `2d0b212c60ce49716687e8a14cd4ec38c5cbf320f27f21fa117b8fca17071d39`
- [ ] `sha256sum deploy/compose.yml` → `347615acef3d6e506c80f9a1feac4b212fffb10cc4490779684d6a00e8618edf`
- [ ] `sha256sum deploy/platform.env.template` → `b5379835309e8c8a8fb1cb3418003447f17d4e3461b666a86b3c5ddc6dd0a2ae`
- [ ] `sha256sum deploy/upgrade.sh` → `a5c0905dd029eb0009021909138eb6f7e16248562f64ac59208c322a2c098bf2`
- [ ] `sha256sum work/wa-replica/fidelity-master.js` → `ee3db1afc1b58f658a23607cb25a00bc13db5ef66394baa061abaf786d63d3af`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `8105f962a780c9de6054b18c63e01f42fd12932196cf79a4273fb553fc8cd59f`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `2ab95687f41136d2e8d0ea6be64ffca8382a01497580fa903d3a1c15563d2988`
- [ ] `sha256sum README.md` → `373d33d6c6299ba282a292f50019981741f55befa2147b0321affe3caa23ff35`
- [ ] `sha256sum replica/build-log.md` → `48acf5269a0f95697bb8f608e32b8836dc39f67cdab50fad98afacde15363b62`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `55866f353a93c48e496606896e87dc088d5674ce81acb2c547e4b841fdefb55f`
- [ ] `cmp outputs/wa-replica-prototype/master.js work/wa-replica/fidelity-master.js` exits 0
- [ ] `git diff --name-only 87fd2de..HEAD -- outputs` lists `app.css`, `master.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only 87fd2de..HEAD -- . ':!plans'` lists exactly eighteen paths: the fifteen of the table in "Current state" and the three output files
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

- **Deployment**: the two servers that run today have no provisioner; restarting them changes nothing but the refusal of an address with a backslash. A platform in containers takes this plan with `bash deploy/upgrade.sh <settings>`.
- **Left as it is, knowingly** (from the review): (a) from outside one can tell whether a sub-site of a name runs — `/site/<name>/api/data` answers 401 or 502 — and so which sign-in names of employees exist; closing it means asking the first server about every request for a sub-site, which makes the first server a part every request depends on. (b) The free memory is read once for each request, so two sub-sites asked for in the same moment are both measured against the same number; and what an OpenWA takes once its number is linked is not in it — `WA_SCRM_MIN_FREE_MB` is the reserve for that. (c) Only sub-sites that run are limited in number; stopped ones stay, with their data, until someone removes them on the machine — nothing in the product removes a sub-site. (d) Every server reads and writes the one data folder: a sub-site's server that is taken over has the accounts and every sub-site's data. That is how the servers shared one machine before; separating it means a data folder for each sub-site and a service for the accounts.
- A sub-site without an account is possible when the making of the account fails after the provisioner said yes (the log then has `site workspace make ok` without `site account created`). Making the employee again under the same name takes the sub-site.
- The sign-in name of an employee made on the page is the id of a sub-site and so the name of two containers; accounts made with the administration tool keep the wider rule and get no sub-site.
- What a reviewer should scrutinise: that no account is made when the provisioner refuses; that an account is off even when its sub-site cannot be stopped; that the page offers an employee only where the server says so; that nothing a caller sends reaches an address of the provisioner unescaped.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
