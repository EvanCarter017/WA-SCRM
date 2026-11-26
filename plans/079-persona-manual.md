# Plan 079: The persona of the customer profile holds only what a person entered

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat faf21e7..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MEDIUM (it clears the persona values the page filled in by itself in every workspace once, when a page of the workspace next opens; values a person saved are kept; exact text and checksums for every file)
- **Depends on**: plans/078-quote-picks.md (DONE; it changed the validator and the build log that this plan edits after it); plans/077-hand-made-preview.md (DONE; it changed the same form handler)
- **Category**: owner request of 2026-11-26 ("Under 'Customer 360° Profile' in SCRM, the 'Persona & Follow-up' section should not be auto-populated; this area is for manual entry only.")
- **Planned at**: commit `faf21e7`, 2026-11-26

## Why this matters

The customer profile (客户 360° 档案, opened with the `profile` action) has a tab 画像与跟进 (Persona & Follow-up). Under the current to-do it holds the form 结构化客户需求画像 (`#lc-qual-form`, saved with 保存画像 by the handler `'lc-qual-form'`): 意向等级 (intent level, a drop-down of `LC_INTENT_LEVELS`), 预计规模 / 预算区间 (volume), 核心咨询需求与关注点 (demand), 收件地区与时效要求 (delivery region), 沟通时段与偏好 (communication window), 当前异议 / 推进卡点 (objection); below it the block 客户标签与进线归因 with the line 广告素材 / 证据 (ad / evidence). The owner: "the 'Persona & Follow-up' section should not be auto-populated; this area is for manual entry only."

Today the page fills that form in by itself, in `fidelity-lifecycle.js`:
- `lcSeed()` (at start) sets `c.intentLevel ||= '中意向'`, makes the delivery region from the country and city and the communication window from the customer's language, and makes `c.attribution` with `method: '人工核实'` ("manually verified") — shown as 广告素材 / 证据 when the customer has no `ad` (else 人工建档).
- `lcSyncRuntimeCustomers()` (every drawing) gives a customer without a persona — every customer that comes in from WhatsApp — `demand: c.notes || c.preview` (the last message), `volume: '待确认'`, the region and the language.
- The handler `'lc-new-customer-form'` (新增客户) sets `intentLevel: '中意向'` and copies the 初步需求, the country and the language into the persona.
- A customer without an intent level is shown with the drop-down's first entry, 高意向, although nothing was chosen.

Live data (counts only): of 102 customers in the two workspaces that have data, every one has 意向等级 中意向, 101 have 预计规模 待确认, most have the last message or the notes copied into 核心咨询需求, and every one carries the attribution 人工核实 — and no persona was ever saved by a person (no history line 更新客户需求画像 in any customer's history).

Shown in a browser (the reviewer's harness, 2026-11-26): before this plan a customer with the old values showed them; a new customer from WhatsApp showed 高意向, 待确认, its first message as the demand and a region; a customer made with 新增客户 showed 中意向 and the 初步需求. With this plan all of them show 请选择 and empty fields and — as evidence; a persona saved by a person is kept as it was; the old values are gone on the server (`personaManual: 1`); a persona saved by hand stays after a reload.

### Decisions already made (do not re-open; do not ask)

The owner approved, in a question dialog, exactly this scope, and chose to clear the existing values ("Yes, clear them"):
- 意向等级 starts unselected: the drop-down gets a first entry `option('', '请选择', c.intentLevel || '')`; nothing sets a default level any more (`lcSeed`, `'lc-new-customer-form'`). The history line of 保存画像 says 未选择 when no level was chosen.
- 预计规模, 核心咨询需求, 收件地区, 沟通时段 and 当前异议 start empty for every customer — from WhatsApp, made with 新增客户, or found without a persona — and are written only by 保存画像 (its handler is unchanged). The 初步需求 typed in 新增客户 stays in the notes (`notes`), as before.
- 广告素材 / 证据 shows `c.ad` or — ; the page no longer makes `c.attribution` up.
- Once per workspace, in `lcSeed()`, while `data.personaManual` is not set: every customer without a history line of category `profile` whose text starts with 更新客户需求画像 gets `qualification` emptied and `intentLevel` and `attribution` removed; then `data.personaManual = 1` (saved with the rest by the save that follows the start). A customer whose persona a person saved keeps it whole.
- Not changed: the to-do card above the form, tags, 进线渠道 (source), 负责聊手 / 接待号, the notes, the customer list (its notes column shows `qualification.demand`, else the notes, as before).

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity-lifecycle.js` | `a0320de7bba41164b3410a91a9c0f6f2b7538ca631f176bf994a9f7de379b096` | `21f02ae947a0352cf46c5c9df6e3a52e260a4b2374935fbd69dccac02dbf5764` | 6 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `246e6ea6c0a90be4322698c57cfc870cc9acf2e75489345ec85df8c51a16c47e` | `851255670f6ca0b3e36598871a1637f9003b3bb285ec6607679dcbb6abbd044e` | 2 |
| `replica/build-log.md` | `e5fbd77383f75694a915405fe6839ca7c8d0d43dc57c41961a1019559d1b1e95` | `637a4e43cb0b76ed23f3d1e4b3e0991fca47322d373aa9890f44fa20647a73ec` | 1 append |

- `fidelity-lifecycle.js` — the follow-up module of the built page: `lcSeed()` (at start), the customer profile with its tab 画像与跟进, the form handlers (`Object.assign(fidForms, { … })`: `'lc-qual-form'` saves the persona, `'lc-new-customer-form'` makes a customer by hand) and `lcSyncRuntimeCustomers()` (before every drawing).
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly two output files differ: `app.js` and `validation.json` (written by the validator).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer** (the server's accounts and data use `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout faf21e7 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (unchanged) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 20`, `fail 0` (unchanged) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-079/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-lifecycle.js` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.js`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — `build-fidelity.cjs` (`conversationMessages` is left as it is), `fidelity-openwa.js`, the base app, the other modules, the style sheets, the servers, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/079-persona-manual` first.
- One commit is fine. Conventional commit message, e.g. `fix(scrm): keep the persona of the customer profile for manual entry only`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, very long lines, quotes and backslashes; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 8 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the three files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-079/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-079 && cat > /tmp/wa-scrm-plan-079/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 079: the persona of the customer profile (画像与跟进) holds only what a person entered, and what the page
# filled in before is cleared once. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'what the page filled in before is cleared once' "$W/fidelity-lifecycle.js" '    if (!data.personaManual) {'
has 'a customer from WhatsApp gets an empty persona' "$W/fidelity-lifecycle.js" "      c.qualification ||= { demand: '', volume: '', deliveryRegion: '', objection: '', commWindow: '' };"
has 'the intent level starts unselected' "$W/fidelity-lifecycle.js" "option('', '请选择', c.intentLevel || '')"
has 'the evidence line shows a dash when nothing is recorded' "$W/fidelity-lifecycle.js" "c.ad || '—'"
same 'no intent level by default' "$(grep -cF "'中意向';" "$W/fidelity-lifecycle.js")" 0
same 'no 待确认 filled in' "$(grep -cF "volume: '待确认'" "$W/fidelity-lifecycle.js")" 0
same 'no copy of the last message or the notes' "$(grep -cF 'demand: c.notes || c.preview' "$W/fidelity-lifecycle.js")" 0
has 'the page is built with it' "$O/app.js" '    if (!data.personaManual) {'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  personaManual: 'the persona of the customer profile"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 客户 360° 档案的「画像与跟进」只保存手动填写的内容 · 2026-11-26'
same 'of the built files only the page and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.js|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-079/smoke.sh && ls -l /tmp/wa-scrm-plan-079/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-lifecycle.js work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-079/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `what the page filled in before is cleared once`, `a customer from WhatsApp gets an empty persona`, `the intent level starts unselected`, `the evidence line shows a dash when nothing is recorded`, `no intent level by default` (got: 1), `no 待确认 filled in` (got: 1), `no copy of the last message or the notes` (got: 1), `the page is built with it`, `the validator knows it` and `the build log has the entry` (ten checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The persona holds only what a person entered

#### `fidelity-lifecycle.js`

**Edit 2.1** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
  function lcSeed() {
    // Ensure every customer has an engagement state and safe defaults
    for (const c of data.customers) {
      lcMigrateEngagement(c);
      c.intentLevel ||= '中意向';
      c.reactivatedCount ??= 0;
      c.qualification = {
        demand: '',
        volume: '',
        deliveryRegion: `${country(c)}${c.city && c.city !== '待补充' ? ' · ' + c.city : ''}`,
        objection: '',
        commWindow: aiCustomerLanguage(c) ? `${aiCustomerLanguage(c)}沟通` : '',
        ...(c.qualification || {}),
      };
      c.attribution ||= {
        platform: c.source || '未知来源',
        method: c.campaign ? '广告入口参数' : '人工核实',
        campaign: c.campaign || '',
        ad: c.ad || '',
      };
      const pending = data.tasks.filter(t => t.customer === c.id && !t.done).sort((a, b) => new Date(a.due) - new Date(b.due));
```

Replace them with:

```text
  function lcSeed() {
    // Once, for the persona that the page used to fill in by itself (plan 079): a customer whose persona was never
    // saved by a person (no history line 更新客户需求画像) gets it empty again, without an intent level and without
    // the attribution the page made up. data.personaManual notes that it was done.
    if (!data.personaManual) {
      for (const c of data.customers) {
        if ((data.activities[c.id] || []).some(a => a.category === 'profile' && String(a.text || '').startsWith('更新客户需求画像'))) continue;
        c.qualification = { demand: '', volume: '', deliveryRegion: '', objection: '', commWindow: '' };
        delete c.intentLevel;
        delete c.attribution;
      }
      data.personaManual = 1;
    }
    // Ensure every customer has an engagement state and safe defaults. The persona holds only what a person entered
    // with 保存画像 (plan 079): its fields start empty and the intent level unselected.
    for (const c of data.customers) {
      lcMigrateEngagement(c);
      c.reactivatedCount ??= 0;
      c.qualification = { demand: '', volume: '', deliveryRegion: '', objection: '', commWindow: '', ...(c.qualification || {}) };
      const pending = data.tasks.filter(t => t.customer === c.id && !t.done).sort((a, b) => new Date(a.due) - new Date(b.due));
```

**Edit 2.2** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
          <div class="lc-qual-grid">
            <label class="lc-field"><span>意向等级</span><select class="fid-select" name="intentLevel">${LC_INTENT_LEVELS.map(x => option(x, x, c.intentLevel)).join('')}</select></label>
            <label class="lc-field"><span>预计规模 / 预算区间</span><input class="fid-input" name="volume" value="${esc(c.qualification?.volume || '')}" placeholder="如 $1,500 - $2,500 / 批"></label>
```

Replace them with:

```text
          <div class="lc-qual-grid">
            <label class="lc-field"><span>意向等级</span><select class="fid-select" name="intentLevel">${option('', '请选择', c.intentLevel || '')}${LC_INTENT_LEVELS.map(x => option(x, x, c.intentLevel)).join('')}</select></label>
            <label class="lc-field"><span>预计规模 / 预算区间</span><input class="fid-input" name="volume" value="${esc(c.qualification?.volume || '')}" placeholder="如 $1,500 - $2,500 / 批"></label>
```

**Edit 2.3** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
          <div class="info-row"><span>进线渠道</span><span><strong>${esc(c.source)}</strong>${c.campaign ? ' · ' + esc(c.campaign) : ''}</span></div>
          <div class="info-row"><span>广告素材 / 证据</span><span>${esc(c.ad || c.attribution?.method || '人工建档')}</span></div>
          <div class="info-row"><span>负责聊手 / 接待号</span><span>${esc(m?.name || '未分配')} · ${esc(a?.name || '—')}</span></div>
```

Replace them with:

```text
          <div class="info-row"><span>进线渠道</span><span><strong>${esc(c.source)}</strong>${c.campaign ? ' · ' + esc(c.campaign) : ''}</span></div>
          <div class="info-row"><span>广告素材 / 证据</span><span>${esc(c.ad || '—')}</span></div>
          <div class="info-row"><span>负责聊手 / 接待号</span><span>${esc(m?.name || '未分配')} · ${esc(a?.name || '—')}</span></div>
```

**Edit 2.4** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
      });
      lcLog(c.id, 'profile', `更新客户需求画像（意向度：${c.intentLevel}${c.qualification.volume ? ' · 规模：' + c.qualification.volume : ''}）`);
      persist();
```

Replace them with:

```text
      });
      lcLog(c.id, 'profile', `更新客户需求画像（意向度：${c.intentLevel || '未选择'}${c.qualification.volume ? ' · 规模：' + c.qualification.volume : ''}）`);
      persist();
```

**Edit 2.5** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
        followup: null, notes: v('demand'), contactRefs: [{ account: a?.id, owner: a?.owner || ui.persona }],
        createdAt: nowIso, updatedAt: nowIso, clientType: '新增线索-补录', intentLevel: '中意向',
        reactivatedCount: 0,
        qualification: { demand: v('demand'), volume: '', deliveryRegion: country({ country: v('country') }), objection: '', commWindow: v('language') ? v('language') + '沟通' : '' },
      };
```

Replace them with:

```text
        followup: null, notes: v('demand'), contactRefs: [{ account: a?.id, owner: a?.owner || ui.persona }],
        createdAt: nowIso, updatedAt: nowIso, clientType: '新增线索-补录',
        reactivatedCount: 0,
        // The persona starts empty (plan 079): the 初步需求 typed here stays in the notes.
        qualification: { demand: '', volume: '', deliveryRegion: '', objection: '', commWindow: '' },
      };
```

**Edit 2.6** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
      lcMigrateEngagement(c);
      c.qualification ||= {
        demand: c.notes || c.preview || '',
        volume: '待确认',
        deliveryRegion: country(c),
        objection: '',
        commWindow: aiCustomerLanguage(c) ? aiCustomerLanguage(c) + '沟通' : '',
      };
      // Follow-up to-dos are made by hand only. A first message is noted in the customer's history; nothing about
```

Replace them with:

```text
      lcMigrateEngagement(c);
      // A customer that came in from WhatsApp gets an empty persona (plan 079): nothing is filled in by itself.
      c.qualification ||= { demand: '', volume: '', deliveryRegion: '', objection: '', commWindow: '' };
      // Follow-up to-dos are made by hand only. A first message is noted in the customer's history; nothing about
```

What these edits do, so that you can recognise them: in `lcSeed()` the one-time clearing block (`if (!data.personaManual) { … }`) comes first, the default intent level goes, the persona starts empty and `c.attribution` is no longer made; the drop-down gets 请选择; 广告素材 / 证据 shows `c.ad || '—'`; the history line says 未选择 without a level; `'lc-new-customer-form'` sets no level and an empty persona; `lcSyncRuntimeCustomers()` gives an empty persona.

**Verify**: `sha256sum work/wa-replica/fidelity-lifecycle.js` → `21f02ae947a0352cf46c5c9df6e3a52e260a4b2374935fbd69dccac02dbf5764`. If the checksum does not match, restore the file (`git checkout -- <file>`) and apply the edit again, once; if it still does not match, STOP.

### Step 3: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// The row of a customer made by hand reads 新建客户档案 in its preview line until the first message (plan 077): the
```

Replace them with:

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// The persona (画像与跟进) holds only what a person entered with 保存画像 (plan 079): nothing fills it by itself — no
// intent level by default, no 待确认, no copy of the last message or the notes, no region or language, no made-up
// attribution — and what the page filled in before is cleared once, except where a person saved the persona.
for (const required of ["    if (!data.personaManual) {\n", "        if ((data.activities[c.id] || []).some(a => a.category === 'profile' && String(a.text || '').startsWith('更新客户需求画像'))) continue;\n        c.qualification = { demand: '', volume: '', deliveryRegion: '', objection: '', commWindow: '' };\n        delete c.intentLevel;\n        delete c.attribution;\n", "      data.personaManual = 1;\n", "      c.qualification = { demand: '', volume: '', deliveryRegion: '', objection: '', commWindow: '', ...(c.qualification || {}) };\n", "        qualification: { demand: '', volume: '', deliveryRegion: '', objection: '', commWindow: '' },\n", "      c.qualification ||= { demand: '', volume: '', deliveryRegion: '', objection: '', commWindow: '' };\n", "${option('', '请选择', c.intentLevel || '')}", "<span>广告素材 / 证据</span><span>${esc(c.ad || '—')}</span>"]) {
  assert(moduleSource.includes(required) && appJs.includes(required), 'the persona must hold only what a person entered: ' + required.trim().slice(0, 60));
}
for (const gone of ["c.intentLevel ||= '中意向';", "intentLevel: '中意向'", "volume: '待确认'", 'demand: c.notes || c.preview', "deliveryRegion: country({ country: v('country') })", "commWindow: aiCustomerLanguage(c)", "'广告入口参数' : '人工核实'", 'c.attribution?.method']) {
  assert(!moduleSource.includes(gone) && !appJs.includes(gone), 'nothing may fill in the persona by itself: ' + gone);
}
// The row of a customer made by hand reads 新建客户档案 in its preview line until the first message (plan 077): the
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  handMadeEmpty: 'a customer made by hand (新增客户) starts with an empty conversation; the 初步需求 stays in the profile and the notes (before, the conversation showed it as a message from the customer, and the first message sent saved it so)',
  quotePicks: 'the quote dialog (报价) ticks prices: a click ticks or unticks one, the ticks stay while the search changes, and 放入消息框 puts every ticked price into the message box, one line each, in the order they were ticked; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
```

Replace them with:

```text
  handMadeEmpty: 'a customer made by hand (新增客户) starts with an empty conversation; the 初步需求 stays in the profile and the notes (before, the conversation showed it as a message from the customer, and the first message sent saved it so)',
  personaManual: 'the persona of the customer profile (画像与跟进) holds only what a person entered with 保存画像: 意向等级 starts on 请选择, the other fields empty; a customer from WhatsApp or made with 新增客户 gets nothing filled in (the 初步需求 stays in the notes); 广告素材 / 证据 shows — when nothing is recorded; what the page filled in before was cleared once (data.personaManual), except where a person had saved the persona',
  quotePicks: 'the quote dialog (报价) ticks prices: a click ticks or unticks one, the ticks stay while the search changes, and 放入消息框 puts every ticked price into the message box, one line each, in the order they were ticked; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `851255670f6ca0b3e36598871a1637f9003b3bb285ec6607679dcbb6abbd044e`; `git checkout faf21e7 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.js` and `validation.json` of `outputs/wa-replica-prototype/` only; `sha256sum outputs/wa-replica-prototype/app.js` → `396d437e3965d26f32b6bc32ca1c96dcdfb19b851604b2b20102e5b47dbe13c5`. If a checksum does not match, restore the file and apply its edits again, once; if it still does not match, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 客户 360° 档案的「画像与跟进」只保存手动填写的内容 · 2026-11-26

此前，「画像与跟进」中的「结构化客户需求画像」会被自动填写：意向等级默认「中意向」，预计规模写成「待确认」，核心咨询需求复制客户的最后一条消息或备注，收件地区和沟通时段按国家和语言自动生成；下方「广告素材 / 证据」一栏自动显示「人工核实」。

现在这一区域只保存手动填写的内容：意向等级默认不选（显示「请选择」），其余各项为空，只有点击「保存画像」才会写入；「新增客户」表单中填写的「初步需求」保存在备注中，不再复制到画像；「广告素材 / 证据」没有记录时显示「—」。

已有客户：每个子站下次打开页面时，会一次性清空此前自动填写的画像内容。只有从未手动保存过画像的客户才会被清空；线上统计显示，目前所有客户都没有手动保存过画像。备注和其他信息不受影响。

验证：构建与校验脚本通过；浏览器测试：从 WhatsApp 进来的新客户和手动新增的客户，画像各项为空、意向等级为「请选择」、「广告素材 / 证据」为「—」；已有客户自动填写的内容被清空，手动保存过画像的客户保留原样；手动保存画像后刷新页面，内容仍在。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout faf21e7 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-079/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `637a4e43cb0b76ed23f3d1e4b3e0991fca47322d373aa9890f44fa20647a73ec`; `git status --porcelain` lists exactly these five as changed and nothing as new: the three files of the table in "Current state" and `outputs/wa-replica-prototype/app.js`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the refusal and the confirmed removal's filter, in the source and the built page.
- **Smoke** (`/tmp/wa-scrm-plan-079/smoke.sh`) — the same facts, three test files, which built files changed, the syntax of the built page.
- **Verified by the reviewer, not by you**: in a browser against the reviewer's harness — the probe described under "Why this matters" (old values cleared once and on the server, a persona saved by a person kept, new customers from WhatsApp and from 新增客户 empty, 请选择, the evidence dash, a persona saved by hand kept after a reload); the full site and WhatsApp suites.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout faf21e7 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 20`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-079/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.js` → `21f02ae947a0352cf46c5c9df6e3a52e260a4b2374935fbd69dccac02dbf5764`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `851255670f6ca0b3e36598871a1637f9003b3bb285ec6607679dcbb6abbd044e`
- [ ] `sha256sum replica/build-log.md` → `637a4e43cb0b76ed23f3d1e4b3e0991fca47322d373aa9890f44fa20647a73ec`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `396d437e3965d26f32b6bc32ca1c96dcdfb19b851604b2b20102e5b47dbe13c5`
- [ ] `git diff --name-only faf21e7..HEAD -- outputs` lists `app.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only faf21e7..HEAD -- . ':!plans'` lists exactly five paths: the three of the table in "Current state", `app.js` and `validation.json`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, or a test fails.
- An output file other than `app.js` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file, creating a file or installing a package.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else. An open page keeps the old behaviour until it is opened again.
- The clearing runs once per workspace, the first time a page of the workspace opens after the deployment; `data.personaManual` keeps it from running again. Do not remove that field.
- Any new way of making a customer must give it an empty persona and no intent level: the persona is for manual entry only (owner decision 2026-11-26).
- What a reviewer should scrutinise: that a persona saved by a person survives the clearing; that the notes and the 初步需求 are untouched; that the customer list still shows the notes.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
