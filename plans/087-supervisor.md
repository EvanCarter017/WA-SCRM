# Plan 087: The supervisor page on the same visual system

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat d984980..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (one style sheet; no markup, no script — `fidelity-master.js` is not touched; exact text and checksums for every file)
- **Depends on**: plans/086-tables.md (DONE; its left-aligned table cells are the base of the overview's alignment)
- **Category**: owner decision of 2026-11-26 — the UI upgrade, Pass B (its last plan)
- **Planned at**: commit `d984980`, 2026-11-26

## Why this matters

The upgrade brief's last item brings the supervisor page (`fidelity-master.js`, its rules `.fid-master…` in `fidelity.css`) onto the workbench's visual system: a clean overview of the employees' workspaces, unmistakable read-only framing when a supervisor reads an employee's customers and chats, tidy account actions. On the current build (the reviewer's screenshots and computed styles, 2026-11-26):

- In the overview (员工总览), the figures 客户, 未读会话 and 待跟进 sat on the left like text (since plan 086 every table cell is left-aligned unless a table says otherwise).
- 停用 (switch an account off) was a teal text button exactly like 重置密码 beside it — the design review of 2026-11-26 named it: a destructive action that looks like a harmless one.
- The overview's "N 项已逾期" was rose, while overdue is amber everywhere else since plan 083.
- The read-only workspace wore the green of a healthy state (`--fid-mint`): its 只读 badge and nothing else marked it; its title 17 px, its notes 13 px.

Shown in a browser (the reviewer's harness, 2026-11-26, this plan's change; computed styles at 1366×768): 停用 rgb(190, 18, 60) and 重置密码 rgb(15, 118, 110); overdue rgb(180, 83, 9); the overview's first row aligned left, left, right, right, right, left, left; the 只读 badge rgb(3, 105, 161) on rgb(240, 249, 255) and the workspace framed in that tint.

### Decisions already made (do not re-open; do not ask)

- The overview (`.fid-master-table`, not `.fid-master-accounts`): columns 3–5 right-aligned, except in a row whose cell spans them (a workspace that cannot be read: its last cell is then column 3, `:not(:last-child)` leaves it).
- 停用 (`.fid-master-acts .link[data-master="disable"]`) in the danger colour; 重置密码 and 启用 keep the accent. Overdue (`small.fid-master-late`) amber.
- The read-only workspace: the badge (`.fid-master-readonly`) and the frame of the workspace (`.fid-master-site`, radius 12) in the information tint (`--fid-sky`, `--fid-sky-bg`); the title 20 px bold, the notes 14 px; the open customer an 8% teal like the workbench's list; the unread count in the accent; the chat's title 16 px; the page's "主管视图" badge 12 px and the signed-in user 14 px.
- Not changed: `fidelity-master.js` (its built copy must stay identical — the validator compares them), the supervisor's dialogs, what any button does.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity.css` | `11862a10de275f5ae22d17edecf08ab91c4838fbe66e300ad023598678acb7a8` | `8696b47e5dbb376024e9c776580c35b01ed5f00722ae2788b1b62f526000c4ec` | 4 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `763f4c1fcd237146e5fa9a4ee329eb64b8d916acaae5c9021bea2ad2756de3ed` | `c373a1e26df09a3e6f9f3ae81a1bbafe5a7b847eb9d301bae7f036cc87970ed0` | 2 |
| `replica/build-log.md` | `0635571f74501081e37808efda7a3ed44aed92c27adf03842a25dce15f499684` | `b6ea85678caab29db051680727fa10994078d730961f5b1667f7bf0e434457d3` | 1 append |

- `fidelity.css` — the page's own style sheet, built into `outputs/wa-replica-prototype/app.css`; the supervisor page's rules (`.fid-master…`) are near its end.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). It turns every `px` value of the fidelity style sheets into a size token in `tokens.css`, listed in the order of first use. After this plan's build exactly these output files differ: `app.css` and `validation.json` (written by the validator); `tokens.css` comes out unchanged.

## Commands you will need

Run from the repository root of **your working copy** (the clone you were given — never any other checkout).

**The tests and the smoke script need Node 22.13 or newer** (the server's accounts and data use `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout d984980 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| All tests | `$NODE --test` | `tests 90`, `pass 90`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-087/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity.css` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.css`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — `fidelity-master.js` above all, every other script, the other style sheets, `fidelity-index.html`, `build-fidelity.cjs`, the base app, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your working copy is already on (`advisor/087-supervisor`). If (and only if) you find yourself on `main`, create and switch to `advisor/087-supervisor` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): the supervisor page on the same visual system`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, very long lines, quotes and backslashes; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 6 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums in "Current state" tell you whether every file is exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-087/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-087 && cat > /tmp/wa-scrm-plan-087/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 087: the supervisor page on the same visual system — the overview's figures on the right, 停用 in the
# danger colour, overdue amber, the read-only workspace in the information tint. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'the overview figures on the right' "$W/fidelity.css" '.fid-master-table:not(.fid-master-accounts) :is(th,td):nth-child(n+3):nth-child(-n+5):not(:last-child) { text-align:right; }'
has '停用 in the danger colour' "$W/fidelity.css" '.fid-master-acts .link[data-master="disable"] { color:var(--color-danger); }'
has 'overdue amber' "$W/fidelity.css" '.fid-master-table small.fid-master-late { color:var(--fid-amber); }'
has 'the read-only badge in the information tint' "$W/fidelity.css" 'border-radius:999px; background:var(--fid-sky-bg); color:var(--fid-sky); font-size:14px; }'
has 'the read-only frame in the information tint' "$W/fidelity.css" 'border:1px solid color-mix(in srgb,var(--fid-sky) 30%,var(--fid-frame)); border-radius:12px;'
has 'the workspace title 20px' "$W/fidelity.css" '.fid-master-bar h1 { margin:0 auto 0 0; font-size:20px; font-weight:700; line-height:28px; }'
has 'the unread count in the accent' "$W/fidelity.css" 'border-radius:999px; background:var(--color-accent); color:var(--color-surface); font-size:12px;'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  supervisorAlike: 'the supervisor page on the same visual system (plan 087)"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 主管页面 · 2026-11-26'
has 'the built style sheet has it' "$O/app.css" '.fid-master-acts .link[data-master="disable"] { color:var(--color-danger); }'
same 'no new size token (the scale only closes)' "$(cd "$ROOT" && comm -13 <(git show d984980:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u) | wc -l)" 0
same 'of the built files only the style sheet and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.css|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the price file pass' "$("$NODE" --test "$W/price-file.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the provisioner pass' "$("$NODE" --test "$W/site-provisioner.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 13 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-087/smoke.sh && ls -l /tmp/wa-scrm-plan-087/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the first table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-087/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the overview figures on the right`, `停用 in the danger colour`, `overdue amber`, `the read-only badge in the information tint`, `the read-only frame in the information tint`, `the workspace title 20px`, `the unread count in the accent`, `the validator knows it`, `the build log has the entry`, `the built style sheet has it`; every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The supervisor page

#### `fidelity.css`

**Edit 2.1** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-master-top { display:flex; align-items:center; gap:12px; min-height:56px; padding:8px 20px; border-bottom:1px solid var(--fid-frame); background:var(--color-surface); }
.fid-master-title { margin-right:auto; padding:2px 10px; border-radius:999px; background:var(--color-accent-soft); color:var(--color-accent); font-size:13px; }
.fid-master-user { color:var(--fid-quiet); font-size:13px; }
.fid-master-body { flex:1; min-height:0; display:flex; flex-direction:column; gap:12px; padding:16px 20px 20px; }
.fid-master-bar { display:flex; flex-wrap:wrap; align-items:center; gap:8px 12px; }
.fid-master-bar h1 { margin:0 auto 0 0; font-size:17px; font-weight:750; line-height:24px; }
.fid-master-bar p { flex-basis:100%; margin:0; color:var(--fid-quiet); font-size:13px; line-height:20px; }
.fid-master-readonly { display:inline-flex; align-items:center; gap:4px; padding:2px 10px; border-radius:999px; background:var(--fid-mint-bg); color:var(--fid-mint); font-size:13px; }
.fid-master-readonly .icon,.fid-master-meta .icon,.fid-master-translation .icon { flex:none; width:14px; height:14px; }
.fid-master-note { margin:0; padding:40px 20px; color:var(--fid-quiet); font-size:13px; line-height:20px; text-align:center; }
.fid-master-table td { height:56px; }
.fid-master-table small { display:block; color:var(--fid-quiet); font-size:12px; }
.fid-master-table small.fid-master-late { color:var(--color-danger); }
.fid-master-quiet { color:var(--fid-quiet); }
```

Replace them with:

```text
.fid-master-top { display:flex; align-items:center; gap:12px; min-height:56px; padding:8px 20px; border-bottom:1px solid var(--fid-frame); background:var(--color-surface); }
.fid-master-title { margin-right:auto; padding:2px 12px; border-radius:999px; background:var(--color-accent-soft); color:var(--color-accent); font-size:12px; }
.fid-master-user { color:var(--fid-quiet); font-size:14px; }
.fid-master-body { flex:1; min-height:0; display:flex; flex-direction:column; gap:12px; padding:16px 20px 20px; }
.fid-master-bar { display:flex; flex-wrap:wrap; align-items:center; gap:8px 12px; }
.fid-master-bar h1 { margin:0 auto 0 0; font-size:20px; font-weight:700; line-height:28px; }
.fid-master-bar p { flex-basis:100%; margin:0; color:var(--fid-quiet); font-size:14px; line-height:20px; }
/* Reading an employee's workspace is read-only, and looks it (plan 087): the badge and the frame in the information
   tint, not in the green of a state that is fine. */
.fid-master-readonly { display:inline-flex; align-items:center; gap:4px; padding:2px 12px; border:1px solid color-mix(in srgb,var(--fid-sky) 25%,var(--color-surface)); border-radius:999px; background:var(--fid-sky-bg); color:var(--fid-sky); font-size:14px; }
.fid-master-readonly .icon,.fid-master-meta .icon,.fid-master-translation .icon { flex:none; width:14px; height:14px; }
.fid-master-note { margin:0; padding:40px 20px; color:var(--fid-quiet); font-size:14px; line-height:20px; text-align:center; }
/* The overview's figures on the right (客户, 未读会话, 待跟进 — not a row whose cell spans them); 停用 in the danger
   colour beside 重置密码; overdue in the amber of overdue follow-ups (plan 087). */
.fid-master-table:not(.fid-master-accounts) :is(th,td):nth-child(n+3):nth-child(-n+5):not(:last-child) { text-align:right; }
.fid-master-acts .link[data-master="disable"] { color:var(--color-danger); }
.fid-master-table td { height:56px; }
.fid-master-table small { display:block; color:var(--fid-quiet); font-size:12px; }
.fid-master-table small.fid-master-late { color:var(--fid-amber); }
.fid-master-quiet { color:var(--fid-quiet); }
```

**Edit 2.2** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-master-dot.on { background:var(--fid-mint); }
.fid-master-site { flex:1; min-height:400px; max-height:calc(100dvh - 190px); display:grid; grid-template-columns:320px minmax(0,1fr); border:1px solid var(--fid-frame); border-radius:14px; background:var(--color-surface); overflow:hidden; }
.fid-master-people { display:flex; flex-direction:column; min-height:0; border-right:1px solid var(--fid-frame); }
```

Replace them with:

```text
.fid-master-dot.on { background:var(--fid-mint); }
.fid-master-site { flex:1; min-height:400px; max-height:calc(100dvh - 190px); display:grid; grid-template-columns:320px minmax(0,1fr); border:1px solid color-mix(in srgb,var(--fid-sky) 30%,var(--fid-frame)); border-radius:12px; background:var(--color-surface); overflow:hidden; }
.fid-master-people { display:flex; flex-direction:column; min-height:0; border-right:1px solid var(--fid-frame); }
```

**Edit 2.3** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-master-row { display:flex; align-items:center; gap:10px; width:100%; padding:10px 12px; border:0; border-bottom:1px solid var(--fid-frame); background:none; color:inherit; font:inherit; text-align:left; cursor:pointer; }
.fid-master-row:hover,.fid-master-row.selected { background:var(--color-accent-soft); }
.fid-master-row .avatar,.fid-master-chat-head .avatar { flex:none; width:40px; height:40px; }
```

Replace them with:

```text
.fid-master-row { display:flex; align-items:center; gap:10px; width:100%; padding:10px 12px; border:0; border-bottom:1px solid var(--fid-frame); background:none; color:inherit; font:inherit; text-align:left; cursor:pointer; }
.fid-master-row:hover { background:var(--color-accent-soft); }
.fid-master-row.selected { background:color-mix(in srgb,var(--color-accent) 8%,var(--color-surface)); }
.fid-master-row .avatar,.fid-master-chat-head .avatar { flex:none; width:40px; height:40px; }
```

**Edit 2.4** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-master-row-line time,.fid-master-preview { color:var(--fid-quiet); font-size:12px; }
.fid-master-unread { flex:none; min-width:18px; height:18px; padding:0 5px; border-radius:999px; background:var(--fid-mint); color:var(--color-surface); font-size:12px; line-height:18px; text-align:center; }
.fid-master-chat { display:flex; flex-direction:column; min-width:0; min-height:0; }
.fid-master-chat-head { display:flex; align-items:center; gap:10px; padding:10px 16px; border-bottom:1px solid var(--fid-frame); }
.fid-master-chat-head h2 { margin:0; font-size:15px; line-height:22px; }
.fid-master-chat-head p { margin:0; color:var(--fid-quiet); font-size:12px; line-height:18px; }
```

Replace them with:

```text
.fid-master-row-line time,.fid-master-preview { color:var(--fid-quiet); font-size:12px; }
.fid-master-unread { flex:none; min-width:18px; height:18px; padding:0 6px; border-radius:999px; background:var(--color-accent); color:var(--color-surface); font-size:12px; line-height:18px; text-align:center; }
.fid-master-chat { display:flex; flex-direction:column; min-width:0; min-height:0; }
.fid-master-chat-head { display:flex; align-items:center; gap:10px; padding:10px 16px; border-bottom:1px solid var(--fid-frame); }
.fid-master-chat-head h2 { margin:0; font-size:16px; line-height:24px; }
.fid-master-chat-head p { margin:0; color:var(--fid-quiet); font-size:12px; line-height:18px; }
```

What these edits do, so that you can recognise them: the page's badge and user, the workspace's title, notes and read-only badge with a comment, the note with the overview's alignment and 停用 with a comment, the overdue colour, the workspace's frame, the open customer, the unread count and the chat's title.

**Verify**: `sha256sum work/wa-replica/fidelity.css` → `8696b47e5dbb376024e9c776580c35b01ed5f00722ae2788b1b62f526000c4ec`. If the checksum does not match, restore the file (`git checkout -- <file>`) and apply its edits again, once; if it still does not match, STOP.

### Step 3: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert.equal(Math.round(customerColumns.reduce((sum, m) => sum + Number(m[2]), 0) * 10) / 10, 100, 'the customer list\'s columns must add up to 100%');
const summary = {
```

Replace them with:

```text
assert.equal(Math.round(customerColumns.reduce((sum, m) => sum + Number(m[2]), 0) * 10) / 10, 100, 'the customer list\'s columns must add up to 100%');
// The supervisor page on the same visual system (plan 087): the overview's figures on the right, 停用 in the danger
// colour, overdue amber, the read-only workspace framed in the information tint, titles and notes on the closed scale.
for (const required of ['.fid-master-table:not(.fid-master-accounts) :is(th,td):nth-child(n+3):nth-child(-n+5):not(:last-child) { text-align:right; }', '.fid-master-acts .link[data-master="disable"] { color:var(--color-danger); }', '.fid-master-table small.fid-master-late { color:var(--fid-amber); }', 'border-radius:999px; background:var(--fid-sky-bg); color:var(--fid-sky); font-size:14px; }', '.fid-master-bar h1 { margin:0 auto 0 0; font-size:20px;']) {
  assert(pageCss.includes(required), `fidelity.css is missing ${required}`);
}
const summary = {
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  quotePicks: 'the quote dialog (报价): a box on the left ticks a product, the ticks stay while the search changes; 确认 opens 确认报价 with the ticked products in the order ticked — quantity (whole, at least 1), unit price (and price column), amount, total — where a product can be deleted and 返回列表 goes back; 放入消息框 puts one line per product ("Product Alpha PRDA01: $40 x 10 = $400") and "Total: $440"; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
  tablesAlike: 'tables read alike (plan 086): text on the left, tick boxes and empty states in the middle, figures on the right; phone numbers and times on one line; the headers of the paged lists stay in view where the tables fit (from 1280 px; the customer list from 1600 px); the customer list\'s thirteen columns add up to 100%',
```

Replace them with:

```text
  quotePicks: 'the quote dialog (报价): a box on the left ticks a product, the ticks stay while the search changes; 确认 opens 确认报价 with the ticked products in the order ticked — quantity (whole, at least 1), unit price (and price column), amount, total — where a product can be deleted and 返回列表 goes back; 放入消息框 puts one line per product ("Product Alpha PRDA01: $40 x 10 = $400") and "Total: $440"; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
  supervisorAlike: 'the supervisor page on the same visual system (plan 087): the overview\'s figures on the right, 停用 in the danger colour, overdue amber, the read-only workspace framed in the information tint, titles and notes on the closed scale',
  tablesAlike: 'tables read alike (plan 086): text on the left, tick boxes and empty states in the middle, figures on the right; phone numbers and times on one line; the headers of the paged lists stay in view where the tables fit (from 1280 px; the customer list from 1600 px); the customer list\'s thirteen columns add up to 100%',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `c373a1e26df09a3e6f9f3ae81a1bbafe5a7b847eb9d301bae7f036cc87970ed0`; `git checkout d984980 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.css` and `validation.json` of `outputs/wa-replica-prototype/` only; `bash -c "comm -13 <(git show d984980:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u)"` prints **nothing** (no new size token); `sha256sum outputs/wa-replica-prototype/app.css` → `e38cdc99a3d9cfcdcba378525ef3d012d766d9e9ecdd86b028992e7c76273c26`; `$NODE --test` → `tests 90`, `pass 90`, `fail 0`. If a checksum does not match, restore the file and apply its edits again, once; if it still does not match, a new size token appears, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 主管页面 · 2026-11-26

界面升级最后一步，主管页面与员工工作台使用同一套样式：

- **员工总览**：客户、未读会话、待跟进三列的数字右对齐；「停用」显示为玫红色（与「重置密码」区分）；已逾期为琥珀色（与工作台一致）。
- **只读查看员工工作区**：「只读」标记与工作区边框为浅蓝色（信息色），不再使用表示正常状态的绿色；标题 20 像素，说明文字 14 像素。
- **会话列表**：未读数字与当前选中的客户使用工作台的青绿色。

验证：构建与校验脚本通过；没有新增尺寸标记；浏览器测试：主管页面的颜色与对齐（停用、重置密码、已逾期、只读标记、数字列）。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout d984980 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-087/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `b6ea85678caab29db051680727fa10994078d730961f5b1667f7bf0e434457d3`; `git status --porcelain` lists exactly these five as changed and nothing as new: the three files of the table in "Current state" and `outputs/wa-replica-prototype/app.css`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the overview's alignment, 停用, overdue, the read-only badge, the workspace's title.
- **Smoke** (`/tmp/wa-scrm-plan-087/smoke.sh`) — the same facts, the frame and the unread count, the validator's entry and the build log, the built rule, no new size token, which built files changed, the five test files.
- **Verified by the reviewer, not by you**: computed colours and alignment on the supervisor page in a browser; screenshots of the overview, a read-only workspace and a dialog; the supervisor, site and WhatsApp suites; deliberate faults.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout d984980 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test` → `tests 90`, `pass 90`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-087/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `8696b47e5dbb376024e9c776580c35b01ed5f00722ae2788b1b62f526000c4ec`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `c373a1e26df09a3e6f9f3ae81a1bbafe5a7b847eb9d301bae7f036cc87970ed0`
- [ ] `sha256sum replica/build-log.md` → `b6ea85678caab29db051680727fa10994078d730961f5b1667f7bf0e434457d3`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `e38cdc99a3d9cfcdcba378525ef3d012d766d9e9ecdd86b028992e7c76273c26`
- [ ] `bash -c "comm -13 <(git show d984980:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u)"` prints nothing
- [ ] `git diff --name-only d984980..HEAD -- outputs` lists `app.css` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only d984980..HEAD -- . ':!plans'` lists exactly five paths: the three of the table in "Current state", `app.css` and `validation.json`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, or a test fails.
- A new size token appears, or an output file other than `app.css` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file, creating a file or installing a package.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else. An open page keeps the old look until it is opened again.
- **A new figure column in the overview** moves the right-aligned columns: the rule counts columns 3–5.
- **A new destructive account action** gets the danger colour by its own `data-master` value, as 停用 does.
- What a reviewer should scrutinise: the overview with a workspace that cannot be read (its row keeps its actions on the left); the read-only workspace on a narrow screen; that `fidelity-master.js` and its built copy are unchanged.
- `validation.json`: re-run the validator once in the main checkout after merging.
