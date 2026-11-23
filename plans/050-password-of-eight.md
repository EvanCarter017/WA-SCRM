# Plan 050: A password may be eight characters long

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 37cf15e..HEAD -- work/wa-replica replica/build-log.md outputs README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (one number, in three places that must agree; exact text and checksums for every edit)
- **Depends on**: plans/049-remove-the-price-list-for-good.md (DONE)
- **Category**: owner decision
- **Planned at**: commit `37cf15e`, 2026-11-23

## Why this matters

The owner asked on 2026-11-23 for one more account with a password of their own choosing. That password is eight characters long; the server accepts ten or more. Asked whether to choose a longer one, the owner wrote: "Let's leave it as is for now; we can address other aspects later when we expand to include external services. For the time being, it's limited to internal services." — and, asked once more with two options, chose to keep the eight-character password, with the minimum lowered to eight for every account.

The number stands in three places that must say the same: the server's rule (`PASSWORD_MIN` in `site-auth.cjs`), the check the page makes before it asks the server (`fidelity-boot.js`), and the texts of the form for changing a password (`fidelity-boot.js`, `fidelity-index.html`).

What this plan does: the number becomes 8 in all three places; the test of the account rules holds it; the validator checks that the page and the server agree; the README states the rule.

### Decisions already made (do not re-open; do not ask)

- The minimum is eight characters, for every account.
- Nothing else about passwords changes: a temporary password is made by the system and must be changed at the first sign-in; a new password must differ from the current one; five wrong attempts lock the name for five minutes.
- The stricter rule is to come back before the system is opened to outside services; that is a later decision of the owner, not part of this plan.
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/site-auth.cjs` | `2c7e02dc0ae7c0a8bc4443b554a6f313c095f7655c5f5cb3b1bfd752cb115eb2` | `7bbdbcba74c43fccbb43885f27be2afd7b22f70f6cc8fa40b2503bc082501dd4` |
| `work/wa-replica/site-api.test.cjs` | `3bb237cde658c0c254f13d904f6eb50323b13e902396fab028fffb0c311681aa` | `4ab24be4f7cf5889b4b78fe3f7f073a0f51bc9fcf920d5e1f3ea0d474d1eff81` |
| `work/wa-replica/fidelity-boot.js` | `d8b288eb5f6e4998d51c5ef88c18c289dc9aaede03cdf2bfdcc8065b00a17bfd` | `b326e07c004294e4ed56cb7cc2193226649b6ec025a14a9c5c8c981d5acacb95` |
| `work/wa-replica/fidelity-index.html` | `95f37db26f84e10c5c1cd91c761ac19e0b534504815aa7b6ff33bf7cb826880d` | `eace61c9ff8b9805564b01431f6a549ad582fdc7fcd782f486ee8feab2838da2` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `10411cb4be735187a0f539eb10b847d29b49ad4efb04ccae3e0c5a0b0e5ecbb6` | `fa09a7d33e1c0fadde8414f4b70378489742c6a64eae09d47e3070ab831fc758` |
| `README.md` | `41ef495566db0c5c8670ffa41d6a3cc1d1b1d12376b2a48e17636b6a63a529e7` | `dc58699c624cb3111f06d813412cfb722c4cfc8dc8cd0b9d8c89c9a2da4155ac` |

- `site-auth.cjs` — the accounts: `const PASSWORD_MIN = 10;`, used by `validPassword(password)` (a string of `PASSWORD_MIN` to `PASSWORD_MAX` characters) for a password given when an account is made and for a new password; exported.
- `site-api.test.cjs` — the tests of sign-in and data (13). The test "accounts: rules for names, roles and passwords; the password is not stored" refuses the password `'short'`.
- `fidelity-boot.js` (shipped as `boot.js`) — the start-up of the page; the form for changing a password refuses a new password under ten characters before it asks the server, and says "新密码至少 10 位" in two messages.
- `fidelity-index.html` (shipped as `index.html`) — the page; the form's field is labelled "新密码（至少 10 位）".
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page; one assertion is added.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 37cf15e -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Syntax of the start-up file | `node -e "new (require('vm').Script)(require('fs').readFileSync('work/wa-replica/fidelity-boot.js','utf8'));console.log('SYNTAX_OK')"` | `SYNTAX_OK` |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 14`, `fail 0` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 13`, `fail 0` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (they send a 16 MB file twice; allow a few seconds) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-050/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/site-auth.cjs`, `site-api.test.cjs` (Step 2)
- `work/wa-replica/fidelity-boot.js`, `fidelity-index.html`, `validate-scrm-lifecycle.cjs` (Step 3)
- `README.md`, `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{boot.js,index.html,validation.json}` (the other output files, `app.js` and `icons.js` among them, must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular `serve.cjs`, `site-api.cjs`, `site-data.cjs`, `site-admin.cjs`, `openwa-link.cjs`, `ai-relay.cjs`, the other page modules, the style sheets, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/050-password-of-eight` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): accept a password of eight characters`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the six files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-050/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-050 && cat > /tmp/wa-scrm-plan-050/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that a password may be eight characters long, on the server and in the page.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 13 ℹ fail 0 '
has 'the server accepts eight characters' "$W/site-auth.cjs" 'const PASSWORD_MIN = 8;'
has 'the tests hold the number' "$W/site-api.test.cjs" 'assert.equal(PASSWORD_MIN, 8);'
has 'the page checks the same number' "$P/boot.js" "if (next.length < 8) return fail(form, '新密码至少 8 位。');"
has 'the form says the same number' "$P/index.html" '新密码（至少 8 位）'
same 'no text of the page says ten any more' "$(cat "$P/boot.js" "$P/index.html" | grep -c '至少 10 位')" 0
has 'the README states the rule' "$ROOT/README.md" '自己设置的密码至少 8 位'
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 密码最短长度改为 8 位'
same 'the account module passes the syntax check' "$(node --check "$W/site-auth.cjs" 2>&1 && echo SYNTAX_OK)" SYNTAX_OK
same 'the start-up file of the page passes the syntax check' "$(cd "$ROOT" && node -e "new (require('vm').Script)(require('fs').readFileSync('work/wa-replica/fidelity-boot.js','utf8'));console.log('SYNTAX_OK')" 2>&1)" SYNTAX_OK
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-050/smoke.sh && ls -l /tmp/wa-scrm-plan-050/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/site-auth.cjs work/wa-replica/site-api.test.cjs work/wa-replica/fidelity-boot.js work/wa-replica/fidelity-index.html work/wa-replica/validate-scrm-lifecycle.cjs README.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-050/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the server accepts eight characters`, `the tests hold the number`, `the page checks the same number`, `the form says the same number`, `no text of the page says ten any more` (got: 3), `the README states the rule` and `the build log has the entry` (seven checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The server accepts eight characters

#### `site-auth.cjs`

**Edit 2.1** — `work/wa-replica/site-auth.cjs`. Find exactly these lines (they occur once):

```text
const USERNAME = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const PASSWORD_MIN = 10;
const PASSWORD_MAX = 128;
```

Replace them with:

```text
const USERNAME = /^[a-z0-9][a-z0-9._-]{2,31}$/;
// Eight characters since 2026-11-23, on the owner's decision: the system is used internally for now. To be
// raised again (it was ten) before it is opened to outside services.
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
```

#### `site-api.test.cjs`

**Edit 2.2** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
const siteApi = require('./site-api.cjs');
const { SESSION_IDLE_MS, SESSION_MAX_MS, LOCK_MS } = require('./site-auth.cjs');

```

Replace them with:

```text
const siteApi = require('./site-api.cjs');
const { PASSWORD_MIN, SESSION_IDLE_MS, SESSION_MAX_MS, LOCK_MS } = require('./site-auth.cjs');

```

**Edit 2.3** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
  await assert.rejects(add({ password: 'short' }), { code: 'invalid-password' });
  const created = await add({ username: ' Rules ' });
```

Replace them with:

```text
  await assert.rejects(add({ password: 'short' }), { code: 'invalid-password' });
  // eight characters are the least; the page says the same number
  assert.equal(PASSWORD_MIN, 8);
  await assert.rejects(add({ password: '1234567' }), { code: 'invalid-password' });
  assert.equal((await add({ username: 'eight', password: '12345678' })).user.username, 'eight');
  const created = await add({ username: ' Rules ' });
```

**Verify**: `sha256sum work/wa-replica/site-auth.cjs work/wa-replica/site-api.test.cjs` → `7bbdbcba74c43fccbb43885f27be2afd7b22f70f6cc8fa40b2503bc082501dd4`, `4ab24be4f7cf5889b4b78fe3f7f073a0f51bc9fcf920d5e1f3ea0d474d1eff81`; `node --check work/wa-replica/site-auth.cjs` exits 0; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 13`, `fail 0`. If a checksum does not match, restore the file with `git checkout 37cf15e -- <file>` and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 3: The page checks and says the same number

#### `fidelity-boot.js`

**Edit 3.1** — `work/wa-replica/fidelity-boot.js`. Find exactly these lines (they occur once):

```text
    const form = screen.password, current = form.elements.current.value, next = form.elements.next.value;
    if (next.length < 10) return fail(form, '新密码至少 10 位。');
    if (next !== form.elements.repeat.value) return fail(form, '两次输入的新密码不一致。');
```

Replace them with:

```text
    const form = screen.password, current = form.elements.current.value, next = form.elements.next.value;
    if (next.length < 8) return fail(form, '新密码至少 8 位。');
    if (next !== form.elements.repeat.value) return fail(form, '两次输入的新密码不一致。');
```

**Edit 3.2** — `work/wa-replica/fidelity-boot.js`. Find exactly these lines (they occur once):

```text
    if (answer.status === 401) return fail(form, '当前密码不正确。');
    if (answer.status === 400) return fail(form, '新密码至少 10 位，且不能与当前密码相同。');
    return fail(form, '暂时无法修改密码，请稍后再试。');
```

Replace them with:

```text
    if (answer.status === 401) return fail(form, '当前密码不正确。');
    if (answer.status === 400) return fail(form, '新密码至少 8 位，且不能与当前密码相同。');
    return fail(form, '暂时无法修改密码，请稍后再试。');
```

#### `fidelity-index.html`

**Edit 3.3** — `work/wa-replica/fidelity-index.html`. Find exactly these lines (they occur once):

```text
        <label class="field">当前（临时）密码<input name="current" type="password" autocomplete="current-password"></label>
        <label class="field">新密码（至少 10 位）<input name="next" type="password" autocomplete="new-password"></label>
        <label class="field">再输入一次新密码<input name="repeat" type="password" autocomplete="new-password"></label>
```

Replace them with:

```text
        <label class="field">当前（临时）密码<input name="current" type="password" autocomplete="current-password"></label>
        <label class="field">新密码（至少 8 位）<input name="next" type="password" autocomplete="new-password"></label>
        <label class="field">再输入一次新密码<input name="repeat" type="password" autocomplete="new-password"></label>
```

#### `validate-scrm-lifecycle.cjs`

**Edit 3.4** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
}
// The list of conversations keeps its place when the page is drawn again.
```

Replace them with:

```text
}
// The shortest password: the server's rule and what the page checks and says are the same number.
assert(read(path.join(__dirname, 'site-auth.cjs')).includes('const PASSWORD_MIN = 8;') && bootSource.includes("if (next.length < 8) return fail(form, '新密码至少 8 位。');") && read(path.join(__dirname, 'fidelity-index.html')).includes('新密码（至少 8 位）'), 'the page and the server must agree on the shortest password');
// The list of conversations keeps its place when the page is drawn again.
```

**Verify**: `sha256sum work/wa-replica/fidelity-boot.js work/wa-replica/fidelity-index.html work/wa-replica/validate-scrm-lifecycle.cjs` → `b326e07c004294e4ed56cb7cc2193226649b6ec025a14a9c5c8c981d5acacb95`, `eace61c9ff8b9805564b01431f6a549ad582fdc7fcd782f486ee8feab2838da2`, `fa09a7d33e1c0fadde8414f4b70378489742c6a64eae09d47e3070ab831fc758`; the syntax command → `SYNTAX_OK`; `git checkout 37cf15e -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84` (a message "Missing prototype source anchor" means a swap does not match the baseline — STOP); `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `sha256sum outputs/wa-replica-prototype/boot.js outputs/wa-replica-prototype/index.html` → `b326e07c004294e4ed56cb7cc2193226649b6ec025a14a9c5c8c981d5acacb95`, `eace61c9ff8b9805564b01431f6a549ad582fdc7fcd782f486ee8feab2838da2`. If a checksum does not match, restore the file with `git checkout 37cf15e -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 4: README, build log, final verification

#### `README.md`

**Edit 4.1** — `README.md`. Find exactly these lines (they occur once):

````text
```
工具只显示一次临时密码，持有人首次登录后必须修改。员工登录后进入自己的子站，新子站从空白开始；主管与管理员的查看入口将随主站提供。未设置 `WA_SCRM_DATA_DIR` 时页面只显示「服务器尚未启用账号」。

````

Replace them with:

````text
```
工具只显示一次临时密码，持有人首次登录后必须修改；自己设置的密码至少 8 位。员工登录后进入自己的子站，新子站从空白开始；主管与管理员的查看入口将随主站提供。未设置 `WA_SCRM_DATA_DIR` 时页面只显示「服务器尚未启用账号」。

````

#### `replica/build-log.md`

**Append 4.2** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 密码最短长度改为 8 位 · 2026-11-23

此前密码至少 10 位。按项目负责人的决定（系统目前只在内部使用），密码最短长度改为 8 位：服务器的校验、修改密码页面的检查和提示文字同时调整。临时密码仍由系统生成，首次登录时必须修改；连续 5 次输错仍会锁定账号 5 分钟。

系统对外开放之前，应把最短长度改回 10 位或以上。部署：服务器文件有变更，合并后需要重启一次预览服务。
```

Then verify everything once more:

```bash
git checkout 37cf15e -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-050/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test run ends with `pass 13`, `fail 0`; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `dc58699c624cb3111f06d813412cfb722c4cfc8dc8cd0b9d8c89c9a2da4155ac`, `7bf09311004a5c79313a0cb3dd9386f7e48f2720e8cf181791a08c06cad75ec8`; `git status --porcelain` lists exactly ten paths: `README.md`, `replica/build-log.md`, the five source files under `work/wa-replica/`, and `outputs/wa-replica-prototype/boot.js`, `index.html` and `validation.json` (if `outputs/wa-replica-prototype/icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Sign-in and data tests** (13, none new; the test of the account rules is extended): the rule is eight; a password of seven characters is refused when an account is made, one of eight is accepted.
- **Validator** — the server's rule, the page's own check and the label of the form say the same number.
- **Smoke** (`/tmp/wa-scrm-plan-050/smoke.sh`) — the same facts on the sources and the built page, that no text of the page says ten any more, the README, the build log, the syntax of the two files and the tests of the server, the relay and the link.
- The build and the validator do not run the page. **Verified by the reviewer in scripted browser sessions, not by you**: the form for changing a temporary password is labelled "新密码（至少 8 位）"; a new password of five and of seven characters is refused in the page with "新密码至少 8 位。"; one of eight gets past that check; the current password as the new one is refused with "新密码至少 8 位，且不能与当前密码相同。"; changing the password still leads into the app. The sessions of the rest of the product and of the connection still pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 37cf15e -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 14`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 13`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-050/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/site-auth.cjs` → `7bbdbcba74c43fccbb43885f27be2afd7b22f70f6cc8fa40b2503bc082501dd4`
- [ ] `sha256sum work/wa-replica/site-api.test.cjs` → `4ab24be4f7cf5889b4b78fe3f7f073a0f51bc9fcf920d5e1f3ea0d474d1eff81`
- [ ] `sha256sum work/wa-replica/fidelity-boot.js` → `b326e07c004294e4ed56cb7cc2193226649b6ec025a14a9c5c8c981d5acacb95`
- [ ] `sha256sum work/wa-replica/fidelity-index.html` → `eace61c9ff8b9805564b01431f6a549ad582fdc7fcd782f486ee8feab2838da2`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `fa09a7d33e1c0fadde8414f4b70378489742c6a64eae09d47e3070ab831fc758`
- [ ] `sha256sum README.md` → `dc58699c624cb3111f06d813412cfb722c4cfc8dc8cd0b9d8c89c9a2da4155ac`
- [ ] `sha256sum replica/build-log.md` → `7bf09311004a5c79313a0cb3dd9386f7e48f2720e8cf181791a08c06cad75ec8`
- [ ] `sha256sum outputs/wa-replica-prototype/boot.js` → `b326e07c004294e4ed56cb7cc2193226649b6ec025a14a9c5c8c981d5acacb95`
- [ ] `sha256sum outputs/wa-replica-prototype/index.html` → `eace61c9ff8b9805564b01431f6a549ad582fdc7fcd782f486ee8feab2838da2`
- [ ] `git diff --quiet 37cf15e -- outputs/wa-replica-prototype/icons.js outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/app.css` exits 0 (the icon file, the app and its styles are unchanged)
- [ ] `git diff --name-only 37cf15e..HEAD -- . ':!plans'` lists exactly these ten: `README.md`, `outputs/wa-replica-prototype/boot.js`, `outputs/wa-replica-prototype/index.html`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/fidelity-boot.js`, `work/wa-replica/fidelity-index.html`, `work/wa-replica/site-api.test.cjs`, `work/wa-replica/site-auth.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build stops with "Missing prototype source anchor" or another assertion, reports another number of icons than 84, a test fails, or the validator fails.
- An output file other than `boot.js`, `index.html` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file.

## Maintenance notes

- **Deployment**: `site-auth.cjs` is loaded when the server starts — **the preview service must be restarted once after the merge**. A page that is open with the old page files still says ten and refuses a shorter password in the browser until it is refreshed.
- The number stands in three places (the server's rule, the page's check, the page's texts); the validator fails when they differ. Change them together.
- The owner's decision holds while the system is used internally. Before it is opened to outside services the minimum should go back to ten or more — existing shorter passwords keep working until they are changed, so that step needs a way of asking their holders for a new one.
- What a reviewer should scrutinise: that the server and the page agree, and that nothing else about sign-in changed.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
