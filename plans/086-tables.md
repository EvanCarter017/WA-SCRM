# Plan 086: Tables read alike; headers stay in view where tables fit; the customer list's thirteen columns

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat d5aceab..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MEDIUM (every table changes alignment; the wrappers of the paged lists stop scrolling sideways on wide screens so that their headers can stay in view; two style sheets only; exact text and checksums for every file)
- **Depends on**: plans/085-home-followups.md (DONE)
- **Category**: owner decision of 2026-11-26 — the UI upgrade, Pass B (tables)
- **Planned at**: commit `d5aceab`, 2026-11-26

## Why this matters

The upgrade brief asks to unify the tables: column geometry, headers that stay in view, a subtle row hover, figures on the right, clean empty states. On the current build (the reviewer's screenshots and measurements, 2026-11-26):

- Every cell of `.fid-table` was centred — names, notes, dates and figures alike; only the customer list, the number list and the price list set their own left alignment.
- Phone numbers wrapped in the account list ("+1 (787) 555-" / "0143") and times wrapped in their columns.
- The customer list (`.fid-customer-table`, at least 1280 px wide) has thirteen columns but `fidelity-lifecycle.css` gave twelve of them widths adding up to 100.5%: 操作 (its last column) got none, and its icons reached 36 px past the table at 1920×1080, where only sideways scrolling showed them. Its text was 13 and 11 px.
- No header stayed in view: every table sits in a wrapper (`.fid-table-scroll`) that scrolls sideways, and `.fid-table-card` clips with `overflow:hidden` — a sticky header sticks to its scrolling box, so it never stuck to the page.

Shown in a browser (the reviewer's harness, 2026-11-26, this plan's change): text on the left and figures on the right (AI 能力's counts); phone numbers and times on one line; the follow-up centre's header at the top of the page after scrolling at 1366, 1600 and 1920 px; the customer list's header too at 1600 and 1920 px (scrolled 583 and 396 px), while at 1366 and 1024 px the list still scrolls sideways (204 and 546 px) as before; at 1920 the customer list's wrapper no wider than the table, 操作 114 px wide with its three icons inside.

### Decisions already made (do not re-open; do not ask)

- `.fid-table` cells: `text-align:left`, padding 8/12; a cell holding only a tick box, and the empty-state cells (`.fid-plain-empty`, `.fid-large-empty`), centred. Figures right-aligned by table: AI 能力's 调用次数, 输入字符, 输出字符 (columns 4–6), AI usage's 输入字符 and 输出字符 (5–6), 已结束跟进's 重新跟进次数 (5), the price list's price columns (5 onwards).
- One line: the account list's 手机号 (5) and 首登时间/最近活跃 (9), its 手机号 column 137 px instead of 114 (the phone with its spaces fits); the customer list's 手机号 / 地区 (9, cut with an ellipsis if ever too long) and 等级 (6).
- Headers stay in view where a table fits: from 1280 px the follow-up centre's lists, the operation log, the tag list, the price list and the AI usage; from 1600 px the customer list (at least 1280 px wide itself). There, the wrapper does not scroll sideways (`overflow:visible`), the card clips without being a scroll box (`overflow:clip`), and the header cells are sticky at the top of the page with a hairline below. Below those widths everything scrolls sideways as before. The account list (at least 1686 px) and the number list keep scrolling sideways at every width.
- The customer list: header and cells 14 px, details and tags 12 px; thirteen widths that add up to 100% (3, 3.5, 9, 11, 9.5, 5.5, 8, 9, 11, 9.5, 6.5, 7.5, 7%) — 操作 7%.
- Not changed: markup and scripts; the account list's fixed widths except 手机号; what a row does on a click; the supervisor's tables (plan 087).

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity.css` | `e533a210ee03a91414133f5f1104720cc86de95bd2bf8104372c1d6e66dddd86` | `11862a10de275f5ae22d17edecf08ab91c4838fbe66e300ad023598678acb7a8` | 9 |
| `work/wa-replica/fidelity-lifecycle.css` | `b742318aee46d72c5c3182cfa55ba0fc16ab46bfb20431af17400ac2fd66e2b9` | `be63453397e463defa2a1ae675fcdea6573eb65b8df26f3a6870dd2e0f453b43` | 1 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `93c7c188cddccc097294ad78e5198b01567f4bbceb1bf00bc8103060ad939a40` | `763f4c1fcd237146e5fa9a4ee329eb64b8d916acaae5c9021bea2ad2756de3ed` | 2 |
| `replica/build-log.md` | `9a1189bdf381649a9d276b1e1cf8efabcc6aa2563d638cddbac1d4aac9358acb` | `0635571f74501081e37808efda7a3ed44aed92c27adf03842a25dce15f499684` | 1 append |

- `fidelity.css` — the page's own style sheet, built into `outputs/wa-replica-prototype/app.css`: the shared table rules (`.fid-table…`, `.fid-table-card`) near its top, the customer list's (`.fid-customer-table…`), the account list's (`.fid-account-table…`), the AI page's (`.fid-ai…`) and the price list's (`.price-table…`) further down.
- `fidelity-lifecycle.css` — the follow-up module's style sheet: the customer list's column widths (`.fid-customer-table col:nth-child(…)`), which win over the ones in `fidelity.css` because this sheet comes later.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). It turns every `px` value of the fidelity style sheets into a size token in `tokens.css`, listed in the order of first use. After this plan's build exactly these output files differ: `app.css`, `tokens.css` (no new token; their order may change) and `validation.json` (written by the validator).

## Commands you will need

Run from the repository root of **your working copy** (the clone you were given — never any other checkout).

**The tests and the smoke script need Node 22.13 or newer** (the server's accounts and data use `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout d5aceab -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| All tests | `$NODE --test` | `tests 90`, `pass 90`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-086/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity.css`, `work/wa-replica/fidelity-lifecycle.css` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.css`, `tokens.css`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — every script (`fidelity-*.js`), `fidelity-dashboard.css`, `fidelity-index.html`, `build-fidelity.cjs`, the base app, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your working copy is already on (`advisor/086-tables`). If (and only if) you find yourself on `main`, create and switch to `advisor/086-tables` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): tables read alike; headers stay in view where tables fit`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, very long lines, quotes and backslashes; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 12 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums in "Current state" tell you whether every file is exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-086/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-086 && cat > /tmp/wa-scrm-plan-086/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 086: tables read alike (text left, boxes and empty states centred, figures right), phone numbers and
# times on one line, headers that stay in view where tables fit, the customer list's thirteen columns. NODE must be
# Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'text on the left' "$W/fidelity.css" 'padding:8px 12px; vertical-align:middle; text-align:left; overflow-wrap:anywhere; }'
has 'boxes and empty states in the middle' "$W/fidelity.css" '.fid-table th:has(>input[type=checkbox]),.fid-table td:has(>input[type=checkbox]),.fid-table td.fid-plain-empty,.fid-table td.fid-large-empty { text-align:center; }'
has 'figures on the right' "$W/fidelity.css" '.fid-ai-capabilities :is(th,td):nth-child(n+4),.fid-ai-usage :is(th,td):nth-child(5),.fid-ai-usage :is(th,td):nth-child(6),.lc-closed-table :is(th,td):nth-child(5) { text-align:right; }'
has 'prices on the right' "$W/fidelity.css" '.price-table :is(th,td):nth-child(n+5) { text-align:right; }'
has 'phone numbers and times on one line' "$W/fidelity.css" '.fid-account-table td:nth-child(5),.fid-account-table td:nth-child(9) { white-space:nowrap; }'
has 'list headers stay in view from 1280 px' "$W/fidelity.css" '.fidelity :is(.lc-todo-table,.lc-closed-table,.fid-log-table,.fid-tag-table,.price-table,.fid-ai-usage) thead th { position:sticky; top:0; z-index:1;'
has 'the customer list header from 1600 px' "$W/fidelity.css" '.fidelity .fid-customer-table thead th { position:sticky; top:0; z-index:1;'
same 'the customer list has thirteen column widths' "$(grep -cE '^\.fid-customer-table col:nth-child\([0-9]+\) \{ width: [0-9.]+%; \}$' "$W/fidelity-lifecycle.css")" 13
has 'the customer list at 14px' "$W/fidelity.css" '.fid-customer-table td { font-size:14px; }'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  tablesAlike: 'tables read alike (plan 086)"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 表格统一 · 2026-11-26'
has 'the built style sheet has it' "$O/app.css" '.fidelity .fid-customer-table thead th { position:sticky; top:0; z-index:1;'
same 'no new size token (the scale only closes)' "$(cd "$ROOT" && comm -13 <(git show d5aceab:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u) | wc -l)" 0
same 'of the built files only the style sheet, its size tokens and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.css|tokens\.css|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the price file pass' "$("$NODE" --test "$W/price-file.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the provisioner pass' "$("$NODE" --test "$W/site-provisioner.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 13 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-086/smoke.sh && ls -l /tmp/wa-scrm-plan-086/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity.css work/wa-replica/fidelity-lifecycle.css work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the first table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-086/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `text on the left`, `boxes and empty states in the middle`, `figures on the right`, `prices on the right`, `phone numbers and times on one line`, `list headers stay in view from 1280 px`, `the customer list header from 1600 px`, `the customer list has thirteen column widths` (got: 11), `the customer list at 14px`, `the validator knows it`, `the build log has the entry`, `the built style sheet has it`; every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The shared table rules, the headers, the customer, account, AI and price tables

#### `fidelity.css`

**Edit 2.1** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-table { width:100%; border-collapse:collapse; color:var(--color-text); table-layout:fixed; font-size:14px; }
.fid-table th,.fid-table td { border:1px solid var(--fid-frame); padding:8px 10px; vertical-align:middle; text-align:center; overflow-wrap:anywhere; }
.fid-table th { background:var(--color-surface-alt); color:var(--fid-ink); height:50px; font-weight:500; }
```

Replace them with:

```text
.fid-table { width:100%; border-collapse:collapse; color:var(--color-text); table-layout:fixed; font-size:14px; }
.fid-table th,.fid-table td { border:1px solid var(--fid-frame); padding:8px 12px; vertical-align:middle; text-align:left; overflow-wrap:anywhere; }
/* Tables read alike (plan 086): text on the left; a tick box and an empty state in the middle; figures on the right
   (by table, with the rules of each table). */
.fid-table th:has(>input[type=checkbox]),.fid-table td:has(>input[type=checkbox]),.fid-table td.fid-plain-empty,.fid-table td.fid-large-empty { text-align:center; }
.fid-table th { background:var(--color-surface-alt); color:var(--fid-ink); height:50px; font-weight:500; }
```

**Edit 2.2** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-table-card>.fid-pager { padding:14px 16px; margin:0; }

```

Replace them with:

```text
.fid-table-card>.fid-pager { padding:14px 16px; margin:0; }
/* The headers of the paged lists stay in view while the page scrolls (plan 086): where a table fits — the lists from
   1280 px, the customer list (at least 1280 px wide itself) from 1600 px — its wrapper does not scroll sideways, so its
   header can stick to the top of the page; below that the wrapper scrolls sideways as before. */
@media(min-width:1280px) {
  .fidelity .fid-table-card:has(:is(.lc-todo-table,.lc-closed-table,.fid-log-table,.fid-tag-table,.price-table,.fid-ai-usage)) { overflow:clip; }
  .fidelity .fid-table-scroll:has(>:is(.lc-todo-table,.lc-closed-table,.fid-log-table,.fid-tag-table,.price-table,.fid-ai-usage)) { overflow:visible; }
  .fidelity :is(.lc-todo-table,.lc-closed-table,.fid-log-table,.fid-tag-table,.price-table,.fid-ai-usage) thead th { position:sticky; top:0; z-index:1; box-shadow:inset 0 -1px 0 var(--fid-frame); }
}
@media(min-width:1600px) {
  .fidelity .fid-table-card:has(.fid-customer-table) { overflow:clip; }
  .fidelity .fid-table-scroll:has(>.fid-customer-table) { overflow:visible; }
  .fidelity .fid-customer-table thead th { position:sticky; top:0; z-index:1; box-shadow:inset 0 -1px 0 var(--fid-frame); }
}

```

**Edit 2.3** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-customer-table { min-width:980px; }
.fid-customer-table th { height:42px; font-size:13px; font-weight:650; }
.fid-customer-table th,.fid-customer-table td { text-align:left; }
```

Replace them with:

```text
.fid-customer-table { min-width:980px; }
.fid-customer-table th { height:42px; font-size:14px; font-weight:650; }
.fid-customer-table th,.fid-customer-table td { text-align:left; }
```

**Edit 2.4** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-customer-table td.fid-large-empty { text-align:center; }
.fid-customer-table td { font-size:13px; }
.fid-customer-table .fid-icon-actions { justify-content:flex-start; }
.fid-customer-table .fid-cell-detail { display:block; color:var(--fid-quiet); font-size:11px; margin-top:3px; }
.fid-customer-table .fid-cell-note { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
```

Replace them with:

```text
.fid-customer-table td.fid-large-empty { text-align:center; }
.fid-customer-table td { font-size:14px; }
.fid-customer-table td:nth-child(9) { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fid-customer-table td:nth-child(6) { white-space:nowrap; }
.fid-customer-table .fid-icon-actions { justify-content:flex-start; }
.fid-customer-table .fid-cell-detail { display:block; color:var(--fid-quiet); font-size:12px; margin-top:2px; }
.fid-customer-table .fid-cell-note { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
```

**Edit 2.5** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-customer-table .fid-tag-cell:hover { background:var(--color-accent-soft); }
.fid-customer-table .fid-tag-cell>.tag { display:block; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-inline:3px; font-size:11px; }
.fid-customer-table .fid-tag-cell>small { font-size:11px; flex-shrink:0; }
.fid-customer-table .fid-tag-cell>.icon svg { width:11px; height:11px; }
```

Replace them with:

```text
.fid-customer-table .fid-tag-cell:hover { background:var(--color-accent-soft); }
.fid-customer-table .fid-tag-cell>.tag { display:block; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-inline:4px; font-size:12px; }
.fid-customer-table .fid-tag-cell>small { font-size:12px; flex-shrink:0; }
.fid-customer-table .fid-tag-cell>.icon svg { width:11px; height:11px; }
```

**Edit 2.6** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-account-table { min-width:1686px; }
.fid-account-table th { font-size:14px; font-weight:650; }
```

Replace them with:

```text
.fid-account-table { min-width:1686px; }
.fid-account-table td:nth-child(5),.fid-account-table td:nth-child(9) { white-space:nowrap; }
.fid-account-table th { font-size:14px; font-weight:650; }
```

**Edit 2.7** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-account-table col:nth-child(4) { width:151px; }
.fid-account-table col:nth-child(5),.fid-account-table col:nth-child(11),.fid-account-table col:nth-child(13) { width:114px; }
.fid-account-table col:nth-child(6) { width:162px; }
```

Replace them with:

```text
.fid-account-table col:nth-child(4) { width:151px; }
.fid-account-table col:nth-child(5) { width:137px; }
.fid-account-table col:nth-child(11),.fid-account-table col:nth-child(13) { width:114px; }
.fid-account-table col:nth-child(6) { width:162px; }
```

**Edit 2.8** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-ai-capabilities,.fid-ai-usage { min-width:640px; }
.fid-ai-capabilities col:nth-child(1) { width:22%; }
```

Replace them with:

```text
.fid-ai-capabilities,.fid-ai-usage { min-width:640px; }
.fid-ai-capabilities :is(th,td):nth-child(n+4),.fid-ai-usage :is(th,td):nth-child(5),.fid-ai-usage :is(th,td):nth-child(6),.lc-closed-table :is(th,td):nth-child(5) { text-align:right; }
.fid-ai-capabilities col:nth-child(1) { width:22%; }
```

**Edit 2.9** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.price-table th,.price-table td { text-align:left; }
.price-table col:first-child { width:64px; }
```

Replace them with:

```text
.price-table th,.price-table td { text-align:left; }
.price-table :is(th,td):nth-child(n+5) { text-align:right; }
.price-table col:first-child { width:64px; }
```

#### `fidelity-lifecycle.css`

**Edit 2.10** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
}
.fid-customer-table col:nth-child(1) { width: 3.5%; }
.fid-customer-table col:nth-child(2) { width: 4.5%; }
.fid-customer-table col:nth-child(3) { width: 9.5%; }
.fid-customer-table col:nth-child(4) { width: 12.5%; }
.fid-customer-table col:nth-child(5) { width: 10%; }
.fid-customer-table col:nth-child(6) { width: 6.5%; }
.fid-customer-table col:nth-child(7) { width: 10%; }
.fid-customer-table col:nth-child(8) { width: 10.5%; }
.fid-customer-table col:nth-child(9) { width: 12.5%; }
.fid-customer-table col:nth-child(10),
.fid-customer-table col:nth-child(11) { width: 6.5%; }
.fid-customer-table col:nth-child(12) { width: 8%; }
.fid-page,
```

Replace them with:

```text
}
/* Thirteen columns that add up to 100% (plan 086): the twelve widths before came to 100.5% and left 操作 none. */
.fid-customer-table col:nth-child(1) { width: 3%; }
.fid-customer-table col:nth-child(2) { width: 3.5%; }
.fid-customer-table col:nth-child(3) { width: 9%; }
.fid-customer-table col:nth-child(4) { width: 11%; }
.fid-customer-table col:nth-child(5) { width: 9.5%; }
.fid-customer-table col:nth-child(6) { width: 5.5%; }
.fid-customer-table col:nth-child(7) { width: 8%; }
.fid-customer-table col:nth-child(8) { width: 9%; }
.fid-customer-table col:nth-child(9) { width: 11%; }
.fid-customer-table col:nth-child(10) { width: 9.5%; }
.fid-customer-table col:nth-child(11) { width: 6.5%; }
.fid-customer-table col:nth-child(12) { width: 7.5%; }
.fid-customer-table col:nth-child(13) { width: 7%; }
.fid-page,
```

What these edits do, so that you can recognise them: in `fidelity.css` the shared cell rule (left, padding) with a comment and the centred boxes and empty states, two media blocks for the headers after the pager rule of the table card, the customer list's sizes and one-line cells, the account list's one-line cells and its 手机号 width, the figures of the AI tables and of 已结束跟进, the prices; in `fidelity-lifecycle.css` the customer list's thirteen widths with a comment.

**Verify**: `sha256sum work/wa-replica/fidelity.css work/wa-replica/fidelity-lifecycle.css` → `11862a10de275f5ae22d17edecf08ab91c4838fbe66e300ad023598678acb7a8`, `be63453397e463defa2a1ae675fcdea6573eb65b8df26f3a6870dd2e0f453b43`. If a checksum does not match, restore the file (`git checkout -- <file>`) and apply its edits again, once; if it still does not match, STOP.

### Step 3: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(!/font-size: 1[13]px/.test(dashCss), 'the home page uses the closed scale of text sizes (no 11 or 13 px)');
const summary = {
```

Replace them with:

```text
assert(!/font-size: 1[13]px/.test(dashCss), 'the home page uses the closed scale of text sizes (no 11 or 13 px)');
// Tables read alike (plan 086): text on the left, tick boxes and empty states in the middle, figures on the right; phone
// numbers and times on one line; the headers of the paged lists stay in view where the tables fit (from 1280 px, the
// customer list from 1600 px); the customer list's thirteen columns add up to 100% (操作 had none).
for (const required of ['padding:8px 12px; vertical-align:middle; text-align:left; overflow-wrap:anywhere; }', '.fid-table th:has(>input[type=checkbox]),.fid-table td:has(>input[type=checkbox]),.fid-table td.fid-plain-empty,.fid-table td.fid-large-empty { text-align:center; }', '.fidelity .fid-customer-table thead th { position:sticky; top:0; z-index:1;', '.fid-ai-capabilities :is(th,td):nth-child(n+4)', '.fid-account-table td:nth-child(5),.fid-account-table td:nth-child(9) { white-space:nowrap; }']) {
  assert(pageCss.includes(required), `fidelity.css is missing ${required}`);
}
const customerColumns = [...lifecycleCss.matchAll(/\.fid-customer-table col:nth-child\((\d+)\) \{ width: ([\d.]+)%; \}/g)];
assert.equal(customerColumns.length, 13, 'the customer list must give its thirteen columns a width each');
assert.equal(Math.round(customerColumns.reduce((sum, m) => sum + Number(m[2]), 0) * 10) / 10, 100, 'the customer list\'s columns must add up to 100%');
const summary = {
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  quotePicks: 'the quote dialog (报价): a box on the left ticks a product, the ticks stay while the search changes; 确认 opens 确认报价 with the ticked products in the order ticked — quantity (whole, at least 1), unit price (and price column), amount, total — where a product can be deleted and 返回列表 goes back; 放入消息框 puts one line per product ("Product Alpha PRDA01: $40 x 10 = $400") and "Total: $440"; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
  homeAndFollowups: '首页 and 跟进闭环 on the closed scale (plan 085): the follow-up signals in the tints of their states (awaiting reply sky, overdue amber, re-contact rose), a tinted 完成并闭环 in the to-do list, the home page\'s title 24 px and labels 14 px; a dialog\'s footer stays in view while a long dialog scrolls',
```

Replace them with:

```text
  quotePicks: 'the quote dialog (报价): a box on the left ticks a product, the ticks stay while the search changes; 确认 opens 确认报价 with the ticked products in the order ticked — quantity (whole, at least 1), unit price (and price column), amount, total — where a product can be deleted and 返回列表 goes back; 放入消息框 puts one line per product ("Product Alpha PRDA01: $40 x 10 = $400") and "Total: $440"; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
  tablesAlike: 'tables read alike (plan 086): text on the left, tick boxes and empty states in the middle, figures on the right; phone numbers and times on one line; the headers of the paged lists stay in view where the tables fit (from 1280 px; the customer list from 1600 px); the customer list\'s thirteen columns add up to 100%',
  homeAndFollowups: '首页 and 跟进闭环 on the closed scale (plan 085): the follow-up signals in the tints of their states (awaiting reply sky, overdue amber, re-contact rose), a tinted 完成并闭环 in the to-do list, the home page\'s title 24 px and labels 14 px; a dialog\'s footer stays in view while a long dialog scrolls',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `763f4c1fcd237146e5fa9a4ee329eb64b8d916acaae5c9021bea2ad2756de3ed`; `git checkout d5aceab -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.css`, `tokens.css` and `validation.json` of `outputs/wa-replica-prototype/` only; `bash -c "comm -13 <(git show d5aceab:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u)"` prints **nothing** (no new size token); `sha256sum outputs/wa-replica-prototype/app.css outputs/wa-replica-prototype/tokens.css` → `840a12f5c970a8de8e285c7d2466b91dd9e6a1d6b85f11b8589acd0d74f2dd00`, `e0cc3162ae4cbea74351c2360b35abcca693f4e875b8654f52f4bf432c110f27`; `$NODE --test` → `tests 90`, `pass 90`, `fail 0`. If a checksum does not match, restore the file and apply its edits again, once; if it still does not match, a new size token appears, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 表格统一 · 2026-11-26

界面升级第二阶段第二步，所有表格：

- **对齐**：文字左对齐，勾选框与空状态居中，数字右对齐（AI 能力的调用次数与字符数、已结束跟进的重新跟进次数、价格表的价格）。
- **不换行**：手机号与时间保持在一行（账号列表、客户列表）。
- **表头固定**：屏幕宽度 1280 像素及以上时，跟进闭环、跟进记录、标签、价格表和 AI 调用记录的表头在页面滚动时保持可见；客户列表在 1600 像素及以上（它本身至少 1280 像素宽，更窄时仍左右滚动）。
- **客户列表**：表格文字改为 14 像素；13 列的宽度合计为 100%，「操作」列不再被挤到零宽（以前操作图标超出表格，需要左右滚动才能看到）。

验证：构建与校验脚本通过；没有新增尺寸标记；浏览器测试：四种屏幕宽度下表头是否保持可见、表格是否超出；各页面截图。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout d5aceab -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-086/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `0635571f74501081e37808efda7a3ed44aed92c27adf03842a25dce15f499684`; `git status --porcelain` lists exactly these seven as changed and nothing as new: the four files of the table in "Current state" and `outputs/wa-replica-prototype/app.css`, `tokens.css`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the left cells, the centred boxes and empty states, the customer list's sticky header, the AI figures, the account list's one-line cells; thirteen customer widths that add up to 100%.
- **Smoke** (`/tmp/wa-scrm-plan-086/smoke.sh`) — the same facts and the prices, the list headers from 1280 px, the customer list's 14 px, the validator's entry and the build log, the built header rule, no new size token, which built files changed, the five test files.
- **Verified by the reviewer, not by you**: in a browser — the headers after scrolling at 1024, 1366, 1600 and 1920 px, the sideways overflow of each list's wrapper, what reaches past the customer list at 1920; screenshots of the table pages; the site and WhatsApp suites; deliberate faults.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout d5aceab -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test` → `tests 90`, `pass 90`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-086/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `11862a10de275f5ae22d17edecf08ab91c4838fbe66e300ad023598678acb7a8`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.css` → `be63453397e463defa2a1ae675fcdea6573eb65b8df26f3a6870dd2e0f453b43`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `763f4c1fcd237146e5fa9a4ee329eb64b8d916acaae5c9021bea2ad2756de3ed`
- [ ] `sha256sum replica/build-log.md` → `0635571f74501081e37808efda7a3ed44aed92c27adf03842a25dce15f499684`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `840a12f5c970a8de8e285c7d2466b91dd9e6a1d6b85f11b8589acd0d74f2dd00`
- [ ] `sha256sum outputs/wa-replica-prototype/tokens.css` → `e0cc3162ae4cbea74351c2360b35abcca693f4e875b8654f52f4bf432c110f27`
- [ ] `bash -c "comm -13 <(git show d5aceab:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u)"` prints nothing
- [ ] `git diff --name-only d5aceab..HEAD -- outputs` lists `app.css`, `tokens.css` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only d5aceab..HEAD -- . ':!plans'` lists exactly seven paths: the four of the table in "Current state", `app.css`, `tokens.css` and `validation.json`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, or a test fails.
- A new size token appears, or an output file other than `app.css`, `tokens.css` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file, creating a file or installing a package.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else. An open page keeps the old look until it is opened again.
- **A table whose header should stay in view** must fit its page at the width where the rule applies — no minimum width above the space it has there — or its last columns are cut off instead of scrolling. Add it to the right media block only then.
- **The customer list's columns** must keep adding up to 100% (the validator counts them); a new column needs a width and the others less.
- **A new figure column** is right-aligned by its own rule (`:nth-child`); a new tick-box column is centred by itself.
- What a reviewer should scrutinise: every list at 1366 and 1920 px (nothing cut at the right; sideways scrolling where a list is wider than its page); the header of a list over the rows after scrolling; a row's hover and its click.
- `validation.json`: re-run the validator once in the main checkout after merging.
