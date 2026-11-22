# Plan 032: The wording of a release, and the materials screen is hidden until files are real

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1629c67..HEAD -- work/wa-replica replica/build-log.md outputs README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M (many small edits; all of them exact text)
- **Risk**: LOW (texts, one menu group, one screen without a route; checksums for every file)
- **Depends on**: plans/031-follow-ups-by-hand.md (DONE)
- **Category**: direction (owner decision: a formal, production-ready release)
- **Planned at**: commit `1629c67`, 2026-11-22

## Why this matters

The owner decided that the project proceeds as a formal, production-ready release and asked whether prototype content is left. The functions are real now — sign-in, data on the server, a real WhatsApp connection — but about 65 texts of the page still speak of a demonstration ("演示"), a prototype ("原型"), a review ("评审"), saving on this machine ("本机"), samples ("示例") or trying things out ("体验"). Examples an employee sees every day: every form ends with "仅保存演示数据", the customer notes say "已保存到本机", the exported list is called `whatsapp-演示客户列表.csv`, the accounts table shows "演示" as version number, and the browser tab says "…工作台原型". All of that is untrue now and reads as unfinished.

One screen is still a mock-up an employee can open: "运营管理 → 素材管理" (materials). It keeps the names of files only; nothing is uploaded or sent. The owner was offered the choice of hiding the mock-up screens or leaving them with a label, with the advisor's recommendation to hide, and answered "please go ahead and finish the rest" (2026-11-22). (The two organisation screens, "组织架构" and "账号管理", are already shown to managers only; an employee account is not a manager and cannot open them.)

This plan:

- rewrites or removes every one of those texts — in the page modules directly, and for texts of the frozen baseline through the build, which is how this project changes baseline text;
- makes the build and the validator fail when one of the six words appears in the app again;
- hides the materials screen: no menu group, no title, no route (an old link `#materials` opens the home page). Its code stays in `fidelity-operations.js` for the day files are real.

### Decisions already made (do not re-open; do not ask)

- The replacement texts are the ones given in this plan. Do not improve them.
- The materials code is not deleted, only made unreachable.
- Names of folders and files that contain "prototype" (`outputs/wa-replica-prototype/`, `重新构建原型.cmd`) are not renamed.
- Documents other than the two README sentences and the README's screen table are not touched.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/fidelity-ui.js` | `88191fe6aefb5ac222e9dfc6aa68a61cdc9f4257e6881770ba3002a798dfadb9` | `f284b89541a8f64fc19f0378b37bd69be7ff992fb01cab700d92ca1b5572828a` |
| `work/wa-replica/fidelity-lifecycle.js` | `f87381cc93d6dba670c1429b741538710fca71d351bd37fcd727b57dd511e3a8` | `808844da120dca408b477679288a2fe67b166a545a1de8a3d1b141244cd9c8d6` |
| `work/wa-replica/fidelity-operations.js` | `582396ded3ee3b82501394f122daa90eee24a4da46aefd39f64ee91f0a0d6978` | `248c9da46641acc453df812c829cc7e7fb2e3a149d3e13473efe42d145224947` |
| `work/wa-replica/fidelity-ai.js` | `c84015c912dfadda1ff37112db95c1913e5451d67f2e39595f12a42bc14fb4be` | `c313b13cb5d81282538a80a53a944b78709e2b06d155e3589cba8f55e7b365db` |
| `work/wa-replica/fidelity-index.html` | `d7df8b964be09adbdd78db8917a86ee364ce62a1202cb16032a33653b0f9b040` | `44a1c78e55b41d26de5a24c93af390bb8ff5e0a281685b95051f0128736a0d0d` |
| `work/wa-replica/build-fidelity.cjs` | `3de5581a0d9fea08cdf3269141185f10bd8f0440dd75a3820aa6044cd14db51a` | `be59237f7d97e08e57a079756c970f3f6c2d82c30b11c044b7d06f5a4423fd9e` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `45cde3813966eb4c58236e205ccc13efd88cd6d0f4cdc7d803d28ea4428579f9` | `02c81257894d1dd04b94dd283302b1fb6e7bbd99f59b9a2be70264d1e685480e` |
| `README.md` | `2176620647aa057ec16c9f4d658ca1884b9f224132283277851e009436707733` | `188ed805cdeeaf7abff1be57ff947223905cad9996f5659de06cd3a30063440c` |

- `fidelity-ui.js`, `fidelity-lifecycle.js`, `fidelity-operations.js`, `fidelity-ai.js` — page modules; the build puts them into the app as they are. Their texts are changed in place. `fidelity-ui.js` defines `operationsMenu` (the entries of the menu group "运营管理"; only `materials`), `fidelity-lifecycle.js` draws the menu.
- `fidelity-index.html` — the page file; only its title changes.
- `build-fidelity.cjs` — the build. It reads the frozen baseline `fidelity-base/app.js` into `js`, changes it with `swap(from, to)` (which fails when `from` is missing), adds the modules and writes the outputs. The baseline itself is never edited: this plan adds one block of baseline rewrites to the build.
- `validate-scrm-lifecycle.cjs` — reads the built `app.js` (`appJs`) and `index.html` (`indexHtml`) and asserts facts about them; one block is added.
- `README.md` — two sentences and one table row.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 1629c67 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Syntax of the four page modules | `node -e "for(const f of ['fidelity-ui.js','fidelity-lifecycle.js','fidelity-operations.js','fidelity-ai.js'])new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/'+f,'utf8')+'})');console.log('SYNTAX_OK')"` | `SYNTAX_OK` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 12`, `fail 0` |
| Link tests | `env -u WA_SCRM_OPENWA_ENV -u WA_SCRM_OPENWA_SYNC_MS -u WA_SCRM_OPENWA_SYNC_PAUSE_MS $NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 16`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-032/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |
| Icon set | `node -e "const vm=require('vm'),fs=require('fs'),cp=require('child_process');const keys=s=>{const w={};vm.runInNewContext(s,{window:w});return Object.keys(w.WA_ICONS)};const a=keys(cp.execSync('git show 1629c67:outputs/wa-replica-prototype/icons.js').toString()),b=keys(fs.readFileSync('outputs/wa-replica-prototype/icons.js','utf8'));console.log('removed='+a.filter(x=>!b.includes(x)).join(',')+' added='+b.filter(x=>!a.includes(x)).join(','))"` | `removed= added=` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-ui.js`, `fidelity-lifecycle.js`, `fidelity-operations.js`, `fidelity-ai.js`, `fidelity-index.html` (Step 2)
- `work/wa-replica/build-fidelity.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `README.md`, `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{app.js,index.html,requirements.json,validation.json}` (the other output files must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular everything under `work/wa-replica/fidelity-base/` (the frozen baseline), `overrides.js`, the server files, `fidelity-boot.js`, `fidelity-openwa.js`, the other modules, `plans/**`, earlier entries of `replica/build-log.md`, the other documents under `outputs/`.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/032-release-wording` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): wording of a release; hide the materials screen`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives a text to find (it occurs exactly once in the named file) and the text that replaces it. An **Insert** names the beginning of a line (exactly one line starts that way) and the text to put directly above it. A **Cut lines** removes one whole line. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Many of the texts are short fragments of long lines: replace the fragment only and leave the rest of the line as it is. Before each change, confirm that the text to find occurs exactly once in the named file. The checksums of the table in "Current state" tell you whether the eight source files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-032/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-032 && cat > /tmp/wa-scrm-plan-032/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks the wording of a release and the hidden materials screen: the built page, the page's title, the build's
# own guard, the README and the tests.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the built page does not speak of a demonstration, a prototype or a review' "$(grep -oE '演示|原型|评审|本机|示例|体验' "$P/app.js" | wc -l | tr -d ' ')" 0
same 'neither does the page file with the title' "$(grep -oE '演示|原型|评审|本机|示例|体验' "$P/index.html" | wc -l | tr -d ' ')" 0
has 'a form says where a change is saved' "$P/app.js" '保存后同步到服务器'
has 'the export has a plain file name' "$P/app.js" 'whatsapp-客户列表.csv'
same 'the materials screen has no title and no route' "$(grep -oE "materials:'素材管理'|materials:renderMaterials" "$P/app.js" | wc -l | tr -d ' ')" 0
has 'the materials screen has no menu entry' "$P/app.js" 'const operationsMenu = [];'
has 'its menu group shows only when it has entries' "$P/app.js" "(operationsMenu.length ? navGroup('运营管理'"
has 'the build refuses these words from now on' "$W/build-fidelity.cjs" "assert(!/演示|原型|评审|本机|示例|体验/.test(js)"
same 'the README does not list the materials screen' "$(grep -c '#materials' "$ROOT/README.md")" 0
same 'the page modules pass the syntax check' "$(cd "$ROOT" && node -e "for(const f of ['fidelity-ui.js','fidelity-lifecycle.js','fidelity-operations.js','fidelity-ai.js'])new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/'+f,'utf8')+'})');console.log('SYNTAX_OK')" 2>&1)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
same 'the link tests pass' "$(env -u WA_SCRM_OPENWA_ENV -u WA_SCRM_OPENWA_SYNC_MS -u WA_SCRM_OPENWA_SYNC_PAUSE_MS "$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 16 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-032/smoke.sh && ls -l /tmp/wa-scrm-plan-032/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-ui.js work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-operations.js work/wa-replica/fidelity-ai.js work/wa-replica/fidelity-index.html work/wa-replica/build-fidelity.cjs work/wa-replica/validate-scrm-lifecycle.cjs README.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-032/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the built page does not speak of a demonstration, a prototype or a review` (got: 71), `neither does the page file with the title` (got: 1), `a form says where a change is saved`, `the export has a plain file name`, `the materials screen has no title and no route` (got: 2), `the materials screen has no menu entry`, `its menu group shows only when it has entries`, `the build refuses these words from now on` and `the README does not list the materials screen` (got: 1) (nine checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The page modules and the page title

Apply the edits file by file, in the order given (within `fidelity-ui.js` the order matters for nothing, but keep it).

#### `fidelity-ui.js`

**Edit 2.1** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
  const operationsMenu = ['materials'];
```

Replace with:

```text
  // Empty while the materials screen is hidden (plan 032): it comes back with real files.
  const operationsMenu = [];
```

**Edit 2.2** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
个演示标签。
```

Replace with:

```text
个标签。
```

**Edit 2.3** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
'ArrowRightLeft','slim'):''}<span class="fid-small-note">演示号码</span></div>
```

Replace with:

```text
'ArrowRightLeft','slim'):''}</div>
```

**Edit 2.4** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
<td>${esc(country(a))}</td><td>演示</td><td>—</td><td>—</td>
```

Replace with:

```text
<td>${esc(country(a))}</td><td>—</td><td>—</td><td>—</td>
```

**Edit 2.5** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
<div class="fid-log-line"><span class="fid-small-note">演示号码</span><button class="fid-link"
```

Replace with:

```text
<div class="fid-log-line"><button class="fid-link"
```

**Edit 2.6** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
刷新演示视图
```

Replace with:

```text
刷新视图
```

**Edit 2.7** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
子账号的权限和备注都可以在这里评审。当前为本地演示。
```

Replace with:

```text
子账号的资料、权限组和备注在这里维护。
```

**Edit 2.8** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
勾选操作会同时勾选查看。此处用于评审权限方案。
```

Replace with:

```text
勾选操作会同时勾选查看。
```

**Edit 2.9** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
输入演示账号
```

Replace with:

```text
输入账号
```

**Edit 2.10** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
whatsapp-演示客户列表.csv
```

Replace with:

```text
whatsapp-客户列表.csv
```

**Edit 2.11** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
已导出当前筛选的演示客户列表。
```

Replace with:

```text
已导出当前筛选的客户列表。
```

**Edit 2.12** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
删除此空的演示分组？
```

Replace with:

```text
删除此空分组？
```

**Edit 2.13** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
清空所选客户的可见演示标签？
```

Replace with:

```text
清空所选客户的可见标签？
```

**Edit 2.14** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
选中的账号仍有关联客户，演示中不能移除。
```

Replace with:

```text
选中的账号仍有关联客户，不能移除。
```

**Edit 2.15** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
移除选中的无客户演示账号？
```

Replace with:

```text
移除选中的无客户账号？
```

**Edit 2.16** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
已移除选中的演示账号。
```

Replace with:

```text
已移除选中的账号。
```

**Edit 2.17** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
将已选账号的演示未读统计清零？
```

Replace with:

```text
将已选账号的未读统计清零？
```

**Edit 2.18** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
演示未读统计已清零。
```

Replace with:

```text
未读统计已清零。
```

**Edit 2.19** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
主管可评审团队演示账号及其会话。
```

Replace with:

```text
主管可查看团队账号及其会话。
```

**Edit 2.20** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
聊手只查看分配给自己的演示账号及客户。
```

Replace with:

```text
聊手只查看分配给自己的账号及客户。
```

**Edit 2.21** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
请先迁移此权限组下的演示子账号。
```

Replace with:

```text
请先迁移此权限组下的子账号。
```

**Edit 2.22** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
删除此演示权限组？
```

Replace with:

```text
删除此权限组？
```

**Edit 2.23** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
所选演示账号已更新注释。
```

Replace with:

```text
所选账号已更新注释。
```

**Edit 2.24** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
演示权限组已保存。
```

Replace with:

```text
权限组已保存。
```

**Edit 2.25** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
演示账号已存在。
```

Replace with:

```text
账号已存在。
```

**Edit 2.26** — `work/wa-replica/fidelity-ui.js`. Find exactly (it occurs once):

```text
演示子账号已保存。
```

Replace with:

```text
子账号已保存。
```

#### `fidelity-lifecycle.js`

**Edit 2.27** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly (it occurs once):

```text
      navGroup('运营管理', 'Images', 'fidNavOperations', fid.operationsOpen, operationsMenu) +
```

Replace with:

```text
      (operationsMenu.length ? navGroup('运营管理', 'Images', 'fidNavOperations', fid.operationsOpen, operationsMenu) : '') +
```

**Edit 2.28** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly (it occurs once):

```text
whatsapp-演示客户列表.csv
```

Replace with:

```text
whatsapp-客户列表.csv
```

**Edit 2.29** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly (it occurs once):

```text
已导出当前筛选的演示客户列表。
```

Replace with:

```text
已导出当前筛选的客户列表。
```

**Edit 2.30** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly (it occurs once):

```text
已实时同步至本地档案
```

Replace with:

```text
已保存到客户档案
```

#### `fidelity-operations.js`

**Edit 2.31** — `work/wa-replica/fidelity-operations.js`. Find exactly (it occurs once):

```text
演示保留文件名。
```

Replace with:

```text
仅保留文件名。
```

**Edit 2.32** — `work/wa-replica/fidelity-operations.js`. Find exactly (it occurs once):

```text
确定删除所选的演示素材？
```

Replace with:

```text
确定删除所选的素材？
```

#### `fidelity-ai.js`

**Edit 2.33** — `work/wa-replica/fidelity-ai.js`. Find exactly (it occurs once):

```text
停用后该能力不再被调用，也不产生用量记录。正式版由主管在主站管理；原型开放操作以便评审。
```

Replace with:

```text
停用后该能力不再被调用，也不产生用量记录。
```

**Edit 2.34** — `work/wa-replica/fidelity-ai.js`. Find exactly (it occurs once):

```text
次调用，本机最多保留
```

Replace with:

```text
次调用，最多保留
```

#### `fidelity-index.html`

**Edit 2.35** — `work/wa-replica/fidelity-index.html`. Find exactly (it occurs once):

```text
<title>WA Desk SCRM · WhatsApp 客户跟进闭环工作台原型</title>
```

Replace with:

```text
<title>WA Desk SCRM · WhatsApp 客户跟进闭环工作台</title>
```

**Verify**: `sha256sum work/wa-replica/fidelity-ui.js work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-operations.js work/wa-replica/fidelity-ai.js work/wa-replica/fidelity-index.html` → `f284b89541a8f64fc19f0378b37bd69be7ff992fb01cab700d92ca1b5572828a`, `808844da120dca408b477679288a2fe67b166a545a1de8a3d1b141244cd9c8d6`, `248c9da46641acc453df812c829cc7e7fb2e3a149d3e13473efe42d145224947`, `c313b13cb5d81282538a80a53a944b78709e2b06d155e3589cba8f55e7b365db`, `44a1c78e55b41d26de5a24c93af390bb8ff5e0a281685b95051f0128736a0d0d`; the syntax command → `SYNTAX_OK`. Do not build yet: the build's own guard is added in the next step. If a checksum does not match, restore the file with `git checkout 1629c67 -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 3: The build rewrites the baseline texts and hides the screen; the validator guards both

**Insert 3.1** — `work/wa-replica/build-fidelity.cjs`. Find the line that starts with (one line starts this way):

```text
new vm.Script(js, {filename:'app.js'});
```

Insert exactly this text as new lines directly above that line:

```text
// Wording of a release (plan 032): the baseline's texts no longer speak of a demonstration, a prototype, a review
// or of saving on this machine. Every pair must be found. The texts of the modules were changed in their files.
for (const [from, to] of [
  ['当前为团队评审视角', '当前为团队视角'],
  ['也可以新增一位演示客户，体验资料、标签和跟进。', '也可以新建一位客户。'],
  ['本地演示附件', '附件'],
  ['来源信息<span class="sample-label">演示</span>', '来源信息'],
  ['已保存到本机', '已保存'],
  ['账号资料与连接状态均为本机演示', '账号资料与连接状态'],
  ['清除筛选，或添加一个演示账号。', '清除筛选，或添加一个账号。'],
  ['人数与账号数可继续扩展。真实 WhatsApp 接入路线在功能评审后确定。', '人数与账号数可继续扩展。'],
  ['调整筛选条件，或创建一位演示客户。', '调整筛选条件，或新建一位客户。'],
  ["+' 权限方案待评审。</span>", "+'</span>"],
  [' 位演示成员 ', ' 位成员 '],
  ['<li>此页是权限方案评审，不代表已实现真实鉴权</li>', '<li>此页的角色说明尚未与登录权限关联</li>'],
  ['接收译文展示和快捷话术填入；本轮是示例交互。', '接收译文展示和快捷话术填入。'],
  ['；现有来源只是示例，真实广告关联和回传待确认。', '；真实广告关联和回传待确认。'],
  ['仅保存演示数据', '保存后同步到服务器'],
  ['先体验账号信息与负责人配置。在「号码管理」可体验 OpenWA 扫码绑定。', '填写账号信息与负责人。扫码绑定在「号码管理」中进行。'],
  ['加入演示账号列表', '添加账号'],
  ['用于评审成员组织与分配。这里只创建演示成员，不会发送邀请或开通真实账号。', '这里只登记成员资料，不会发送邀请，也不会开通登录账号。'],
  ['创建演示成员', '创建成员'],
  ['这个演示只改变客户与未完成跟进的负责人，不移动账号。', '只改变客户与未完成跟进的负责人，不移动账号。'],
  ['确认演示转交', '确认转交'],
  ['原型只做提示，没有自动合并、抢单或改归属。', '这里只做提示，不会自动合并、抢单或改归属。'],
  ['要统一客户还是各聊手独立维护、重复进线由谁跟进，等你评审后确定。', '同一位客户由谁跟进，请在团队内约定。'],
  ['可修改后再发送。此处使用演示话术。', '可修改后再发送。'],
  ['内部演示数据 · 仅用于界面评审', '内部使用'],
  ['刷新演示视图', '刷新视图'],
  ['已刷新当前演示视图。', '已刷新当前视图。'],
  ['已展开示例中文译文。', '已展开中文译文。'],
  ['演示成员已创建，可继续分配账号。', '成员已创建，可继续分配账号。'],
  ['演示账号分配已更新，客户归属未改变。', '账号分配已更新，客户归属未改变。'],
  ['客户与未完成待办已演示转交。账号归属未改变。', '客户与未完成待办已转交。账号归属未改变。'],
]) {
  assert(js.includes(from), 'Missing baseline wording: ' + from);
  js = js.replaceAll(from, to);
}
// The materials screen is hidden until files are real (plan 032): it kept the names of files only. Its code stays in
// fidelity-operations.js; the screen has no title, no route and no menu entry, so old links open the home page.
swap("materials:'素材管理',", '');
swap('materials:renderMaterials,', '');
assert(!/演示|原型|评审|本机|示例|体验/.test(js), 'the app must not speak of a demonstration, a prototype or a review');
```

**Edit 3.2** — `work/wa-replica/build-fidelity.cjs`. Find exactly (it occurs once):

```text
features:['素材分组','素材维护','预览','导入导出'], notes:'运营管理保留素材管理。',
```

Replace with:

```text
features:['素材分组','素材维护','预览','导入导出'], notes:'素材管理暂不开放：此前只保存文件名，待真实文件收发接入后恢复。',
```

**Edit 3.3** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly (it occurs once):

```text
for (const gone of ['<span>本地演示</span>', '演示消息',
```

Replace with:

```text
// A release does not speak of a demonstration, a prototype, a review or of saving on this machine (plan 032),
// and the materials screen is hidden.
for (const word of ['演示', '原型', '评审', '本机', '示例', '体验']) {
  assert(!appJs.includes(word), `app.js still says ${word}`);
  assert(!indexHtml.includes(word), `index.html still says ${word}`);
}
assert(!appJs.includes("materials:'素材管理'") && !appJs.includes('materials:renderMaterials'), 'the materials screen must have no title and no route');
assert(appJs.includes('const operationsMenu = [];'), 'the materials screen must have no menu entry');
for (const gone of ['<span>本地演示</span>', '演示消息',
```

**Verify**: `sha256sum work/wa-replica/build-fidelity.cjs work/wa-replica/validate-scrm-lifecycle.cjs` → `be59237f7d97e08e57a079756c970f3f6c2d82c30b11c044b7d06f5a4423fd9e`, `02c81257894d1dd04b94dd283302b1fb6e7bbd99f59b9a2be70264d1e685480e`; `node --check work/wa-replica/build-fidelity.cjs && node --check work/wa-replica/validate-scrm-lifecycle.cjs && echo SYNTAX_OK` → `SYNTAX_OK`; `git checkout 1629c67 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84` (a message "Missing baseline wording: …" means one pair of the inserted block does not match the baseline — STOP); `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; the icon-set command → `removed= added=`; `sha256sum outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/index.html outputs/wa-replica-prototype/requirements.json` → `f179e0330cb542e0be152b17f156aa4ba02a4b096ad4604ea32d6e6b5ce1a43e`, `44a1c78e55b41d26de5a24c93af390bb8ff5e0a281685b95051f0128736a0d0d`, `3f1404baa3dbee73ebc1c2d58a3daacc10bbcf95336fb588048e2eb66c19edd9`.

### Step 4: README, build log, final verification

**Edit 4.1** — `README.md`. Find exactly (it occurs once):

```text
**WhatsApp 客户跟进闭环管理（SCRM）可交互原型与工程交接基线**
```

Replace with:

```text
**WhatsApp 客户跟进闭环管理（SCRM）工作台**
```

**Edit 4.2** — `README.md`. Find exactly (it occurs once):

```text
自 v0.8 起原型不再设置生命周期阶段
```

Replace with:

```text
自 v0.8 起不再设置生命周期阶段
```

**Cut lines 4.3** — `README.md`. Remove exactly this whole line (it occurs once), together with its line break:

```text
| `#materials` | **素材管理** | 运营常用文本、图片、名片、音视频素材分组维护与导入导出 |
```

**Append 4.4** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```markdown
## 正式版措辞清理；素材管理暂不开放 · 2026-11-22

页面上遗留的「演示」「原型」「评审」「本机」「示例」「体验」等措辞全部改写或删除（共约 65 处，涉及基线文本与各页面模块）：例如表单底部的「仅保存演示数据」改为「保存后同步到服务器」，备注的「已保存到本机」改为「已保存」，导出文件名改为 `whatsapp-客户列表.csv`，账号列表的「版本号」列不再显示「演示」，页面标题去掉「原型」。构建与校验脚本会在这些词再次出现时报错。

素材管理页面此前只保存文件名，并不真正上传文件，现暂时隐藏：菜单不再显示「运营管理」分组，旧链接 `#materials` 会回到首页；代码保留在 `fidelity-operations.js`，待真实文件收发接入后恢复。组织架构与账号管理页面仍只对主管身份显示，员工账号看不到。
```

Then verify everything once more:

```bash
git checkout 1629c67 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && $NODE --test work/wa-replica/site-api.test.cjs && env -u WA_SCRM_OPENWA_ENV -u WA_SCRM_OPENWA_SYNC_MS -u WA_SCRM_OPENWA_SYNC_PAUSE_MS $NODE --test work/wa-replica/openwa-link.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-032/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test runs end with `pass 12` and `pass 16`, `fail 0` each; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `188ed805cdeeaf7abff1be57ff947223905cad9996f5659de06cd3a30063440c`, `b3bd42858b1faeb8cba0b6bf9ef5f5e3fe6b742362afe17b86b4a475b2810b07`; `git status --porcelain` lists exactly thirteen paths: `README.md`, `replica/build-log.md`, the seven source files under `work/wa-replica/`, and `outputs/wa-replica-prototype/app.js`, `index.html`, `requirements.json` and `validation.json` (if `outputs/wa-replica-prototype/icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Build** — its new guard fails when the app contains one of the six words; every baseline rewrite must find its text.
- **Validator** — the built `app.js` and `index.html` contain none of the six words; the materials screen has no title, no route and no menu entry.
- **Smoke** (`/tmp/wa-scrm-plan-032/smoke.sh`) — the same facts on the built files, the README, the syntax of the modules and the server tests (12 and 16 as before; no server change).
- **Verified by the reviewer in scripted browser sessions, not by you**: every screen an employee can open draws without an error and without one of the six words; the menu has no group "运营管理"; an old link `#materials` opens the home page; forms, the notes of a customer, the export of the customer list and the accounts table show the new texts; the sessions of the rest of the product and of the connection still pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 1629c67 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`; the link tests → `pass 16`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-032/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-ui.js` → `f284b89541a8f64fc19f0378b37bd69be7ff992fb01cab700d92ca1b5572828a`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.js` → `808844da120dca408b477679288a2fe67b166a545a1de8a3d1b141244cd9c8d6`
- [ ] `sha256sum work/wa-replica/fidelity-operations.js` → `248c9da46641acc453df812c829cc7e7fb2e3a149d3e13473efe42d145224947`
- [ ] `sha256sum work/wa-replica/fidelity-ai.js` → `c313b13cb5d81282538a80a53a944b78709e2b06d155e3589cba8f55e7b365db`
- [ ] `sha256sum work/wa-replica/fidelity-index.html` → `44a1c78e55b41d26de5a24c93af390bb8ff5e0a281685b95051f0128736a0d0d`
- [ ] `sha256sum work/wa-replica/build-fidelity.cjs` → `be59237f7d97e08e57a079756c970f3f6c2d82c30b11c044b7d06f5a4423fd9e`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `02c81257894d1dd04b94dd283302b1fb6e7bbd99f59b9a2be70264d1e685480e`
- [ ] `sha256sum README.md` → `188ed805cdeeaf7abff1be57ff947223905cad9996f5659de06cd3a30063440c`
- [ ] `sha256sum replica/build-log.md` → `b3bd42858b1faeb8cba0b6bf9ef5f5e3fe6b742362afe17b86b4a475b2810b07`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `f179e0330cb542e0be152b17f156aa4ba02a4b096ad4604ea32d6e6b5ce1a43e`
- [ ] `sha256sum outputs/wa-replica-prototype/index.html` → `44a1c78e55b41d26de5a24c93af390bb8ff5e0a281685b95051f0128736a0d0d`
- [ ] `sha256sum outputs/wa-replica-prototype/requirements.json` → `3f1404baa3dbee73ebc1c2d58a3daacc10bbcf95336fb588048e2eb66c19edd9`
- [ ] the icon-set command prints `removed= added=`
- [ ] `git diff --name-only 1629c67..HEAD -- . ':!plans'` lists exactly these thirteen: `README.md`, `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/index.html`, `outputs/wa-replica-prototype/requirements.json`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/build-fidelity.cjs`, `work/wa-replica/fidelity-ai.js`, `work/wa-replica/fidelity-index.html`, `work/wa-replica/fidelity-lifecycle.js`, `work/wa-replica/fidelity-operations.js`, `work/wa-replica/fidelity-ui.js`, `work/wa-replica/validate-scrm-lifecycle.cjs`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- A text to find, or the beginning of a line of the Insert, does not occur exactly once in its file.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build stops with "Missing baseline wording" or any other assertion, reports another number of icons than 84, a test fails, or the validator fails.
- An output file other than `app.js`, `index.html`, `requirements.json` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file, in particular the frozen baseline.

## Maintenance notes

- **Deployment**: only page files change; no restart is needed after the merge. Open pages get the new texts at their next refresh.
- From now on the build and the validator refuse the words 演示, 原型, 评审, 本机, 示例 and 体验 anywhere in the app. A later text that needs one of them legitimately has to change that guard on purpose.
- To bring the materials screen back: put `'materials'` into `operationsMenu` again and remove the two `swap` lines for `materials` from the build — once files are really stored and sent.
- What a reviewer should scrutinise: that no replacement changed code instead of text (the pairs are plain texts; one pair removes a text together with the `+` and quote before it), and that the screens for managers still draw.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
