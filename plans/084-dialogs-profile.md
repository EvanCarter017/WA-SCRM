# Plan 084: Dialogs, the quote dialog and the 360° profile on the closed scale

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2040b91..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (two style sheets only; no markup, no script; exact text and checksums for every file)
- **Depends on**: plans/083-chat-room.md (DONE; it hid the row of page tabs on the chat page, which this plan's backdrop rule follows)
- **Category**: owner decision of 2026-11-26 — the UI upgrade, Pass A (its last plan)
- **Planned at**: commit `2040b91`, 2026-11-26

## Why this matters

The upgrade brief's Pass A ends with the dialogs, the two-step quote dialog of plan 080 (sticky search, clear tick boxes, a count badge, figures aligned in the confirm window, clear primary and secondary actions) and the 360° profile (tabs, cards of 12–16 px padding, the persona form on an 8 px grid, the to-do card). Three things stood out on the current build (the reviewer's screenshots, 2026-11-26):

- On the chat page a dialog's backdrop left a band below the header undimmed: the backdrop is cut at a fixed 107 px (header and row of page tabs) and 240 px (sidebar), and since plan 083 that page has no row of page tabs (the row of the 号码管理/在线聊天 toggle stayed bright above the dialog).
- The quote list's boxes were the browser's 13 px default and only the box and the product's name ticked it; the count 已选 N 项 was grey text; in 确认报价 every figure was centred.
- In the profile, an overdue to-do card was rose although overdue follow-ups are amber everywhere since plan 083; labels were 11 px.

Shown in a browser (the reviewer's harness, 2026-11-26, this plan's change): the backdrop dims the whole workspace below the header on the chat page; 报价 with 16 px teal boxes, a hover tint, the count a teal badge; 确认报价 with the product on the left and quantity, unit price, amount and total (bold) on the right; the profile with the overdue to-do amber, tabs at 14 px and the persona form's fields on an 8 px grid.

### Decisions already made (do not re-open; do not ask)

- Dialogs: radius 12, shadow `0 16px 40px rgba(15,23,42,.18)`, backdrop `rgba(15,23,42,.45)` (slate instead of black); title 20 px bold with a 28 px line; head padding 16/20/8, body 8/20/16, footer 12/20/20 with an 8 px gap.
- The backdrop on the chat page (`.fidelity:has(#view .inbox-page)`): cut at 56 px instead of 107 px — 240 px of sidebar, 64 px when the menu is collapsed, 160 px between 761 and 920 px; inside `@media(min-width:761px)`, because narrow screens have no cut at all.
- 报价: the label of a product fills the row up to its prices (`flex:1`, a pointer), so a click on the left of a row ticks it; boxes 16 px in the accent; a row tinted on hover; prices and the count with figures of one width; the count `#price-quote-count` a teal badge. The list keeps its own scrolling, so the search stays in view.
- 确认报价: the first column on the left; quantity, unit price and amount (columns 2–4, also the total in the foot) on the right, the inputs too; the foot bold.
- Profile: the figures' labels (`.lc-mini-kpi span`) 12 px; tabs 14 px, their counts 12 px; cards radius 12, padding 12/16; card titles 14 px; the overdue to-do (`.hot-block`, only used when the to-do is overdue) amber; the persona form's grid gaps 8 (rows) and 16 (columns), its labels 12 px, its fields 14 px with padding 8/12, radius 8 and the field border; text areas at least 64 px.
- Not changed: every script and every markup; the order blocks (their sizes are checked by the reviewer's suite and are already in the new colours); the page and the chat page; Pass B's pages.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity.css` | `760709c16e178fc2a2f14d4864c269ae975e63d41934d97b6c18b4e6d515d47b` | `3e374a00e7c5dd41e4077db995f19b01cec401000334e3fa88613adf5ecc5c15` | 3 |
| `work/wa-replica/fidelity-lifecycle.css` | `5192a2bde63701f603319444730e68707f0597afabe7b5de29ee375290d77685` | `96df305ed11486d4f86852e68ecee5ce94441a94213fd1c2c5e09077f1a7e142` | 8 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `026c06e7f0e39baf8d0bfbe3b019a0eef1e954e0aa52fcdbf39d3e6969df5ded` | `166b4cd6739b9b83a1862c0ddb5a9a86862452e01761a7b5c4d45229705820f5` | 2 |
| `replica/build-log.md` | `1c9a0945c98c004c811767c122ebc118e9039c783c6db15ab20389d3ae9ca3b3` | `e142e047f888a61de34999217acc112fe56a7e825b43541d0448669cce69c526` | 1 append |

- `fidelity.css` — the page's own style sheet, built into `outputs/wa-replica-prototype/app.css`: the dialog frame (`.fidelity #dialog.fid-dialog…`, `.fid-dialog .modal-…`) in its middle, the quote dialog (`.price-quote-…`, `.price-confirm-table…`) near its end.
- `fidelity-lifecycle.css` — the follow-up module's style sheet: the profile drawer (`.lc-dossier-…`, `.lc-mini-kpi…`, `.lc-card-block…`, `.lc-block-head…`, `.lc-qual-grid`, `.lc-field…`).
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). It turns every `px` value of the fidelity style sheets into a size token in `tokens.css`, listed in the order of first use. After this plan's build exactly these output files differ: `app.css`, `tokens.css` (no new token; their order may change) and `validation.json` (written by the validator).

## Commands you will need

Run from the repository root of **your working copy** (the clone you were given — never any other checkout).

**The tests and the smoke script need Node 22.13 or newer** (the server's accounts and data use `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 2040b91 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| All tests | `$NODE --test` | `tests 90`, `pass 90`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-084/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity.css`, `work/wa-replica/fidelity-lifecycle.css` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.css`, `tokens.css`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — every script (`fidelity-*.js`), `fidelity-dashboard.css`, `fidelity-index.html`, `build-fidelity.cjs`, the base app, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your working copy is already on (`advisor/084-dialogs-profile`). If (and only if) you find yourself on `main`, create and switch to `advisor/084-dialogs-profile` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): dialogs, the quote dialog and the 360° profile on the closed scale`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, very long lines, quotes and backslashes; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 13 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums in "Current state" tell you whether every file is exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-084/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-084 && cat > /tmp/wa-scrm-plan-084/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 084: dialogs, the quote dialog and the 360° profile on the closed scale; a dialog's backdrop on the chat
# page starts below the header. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'dialogs with radius 12 and a slate shadow' "$W/fidelity.css" 'border-radius:12px; box-shadow:0 16px 40px rgba(15,23,42,.18);'
has 'the backdrop below the header on the chat page' "$W/fidelity.css" '.fidelity:has(#view .inbox-page) #dialog.fid-dialog::backdrop { clip-path:inset(56px 0 0 240px); }'
has 'dialog titles of 20px' "$W/fidelity.css" '.fidelity .fid-dialog .modal-head h2 { font-size:20px; font-weight:700; line-height:28px; }'
has 'the whole left of a quote row ticks its box' "$W/fidelity.css" '.price-quote-product { flex:1;'
has 'the boxes are 16px' "$W/fidelity.css" '.price-quote-product input[type=checkbox] { flex:none; align-self:center; width:16px; height:16px;'
has 'the count is a badge' "$W/fidelity.css" '#price-quote-count { padding:2px 8px; border-radius:999px;'
has 'the confirm window figures on the right' "$W/fidelity.css" '.price-confirm-table th:nth-child(n+2):nth-child(-n+4),.price-confirm-table td:nth-child(n+2):nth-child(-n+4) { text-align:right; }'
has 'an overdue to-do is amber' "$W/fidelity-lifecycle.css" '  border-color: color-mix(in srgb, var(--fid-amber) 35%, var(--fid-frame));'
same 'the profile tabs at 14px' "$(grep -A10 '^.lc-dossier-tab {' "$W/fidelity-lifecycle.css" | grep -c '  font-size: 14px;')" 1
has 'the persona form on an 8px grid' "$W/fidelity-lifecycle.css" '  gap: 8px 16px;'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  dialogsAndProfile: 'dialogs, the quote dialog and the 360° profile on the closed scale (plan 084)"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 对话框、报价窗口与客户 360° 档案 · 2026-11-26'
has 'the built style sheet has the backdrop' "$O/app.css" '.fidelity:has(#view .inbox-page) #dialog.fid-dialog::backdrop { clip-path:inset(var(--fid-px-56) 0 0 var(--fid-px-240)); }'
same 'no new size token (the scale only closes)' "$(cd "$ROOT" && comm -13 <(git show 2040b91:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u) | wc -l)" 0
same 'of the built files only the style sheet, its size tokens and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.css|tokens\.css|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the price file pass' "$("$NODE" --test "$W/price-file.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the provisioner pass' "$("$NODE" --test "$W/site-provisioner.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 13 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-084/smoke.sh && ls -l /tmp/wa-scrm-plan-084/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity.css work/wa-replica/fidelity-lifecycle.css work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the first table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-084/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `dialogs with radius 12 and a slate shadow`, `the backdrop below the header on the chat page`, `dialog titles of 20px`, `the whole left of a quote row ticks its box`, `the boxes are 16px`, `the count is a badge`, `the confirm window figures on the right`, `an overdue to-do is amber`, `the profile tabs at 14px` (got: 0), `the persona form on an 8px grid`, `the validator knows it`, `the build log has the entry`, `the built style sheet has the backdrop`; every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The dialogs, the quote dialog and the profile

#### `fidelity.css`

**Edit 2.1** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text

.fidelity #dialog.fid-dialog { position:fixed; inset:var(--fid-top) 0 0 var(--fid-sidebar); width:min(540px,calc(100vw - var(--fid-sidebar) - 36px)); max-width:none; max-height:calc(100dvh - var(--fid-top) - 28px); margin:auto; border:0; border-radius:10px; box-shadow:0 16px 40px rgba(0,0,0,.23); animation:none; background:var(--color-surface); color:var(--color-text); }
.fidelity #dialog.fid-dialog::backdrop { background:rgba(0,0,0,.45); clip-path:inset(107px 0 0 240px); }
.fidelity:has(.nav-collapsed) #dialog.fid-dialog::backdrop { clip-path:inset(107px 0 0 64px); }
.fidelity #dialog.fid-wide { width:min(660px,calc(100vw - var(--fid-sidebar) - 36px)); }
.fidelity .fid-dialog .modal-head { min-height:50px; padding:14px 20px 6px; border-bottom:0; }
.fidelity .fid-dialog .modal-head h2 { font-size:18px; font-weight:750; }
.fidelity .fid-dialog .modal-head .icon-button { width:22px; height:24px; }
.fidelity .fid-dialog .modal-head .icon-button .icon { width:15px; height:15px; }
.fidelity .fid-dialog .modal-body { padding:10px 20px 12px; }
.fidelity .fid-dialog .modal-footer { padding:12px 20px 18px; gap:10px; border:0; justify-content:flex-end; background:var(--color-surface); }
.fidelity .fid-dialog .modal-footer .fid-btn { min-width:70px; }
```

Replace them with:

```text

.fidelity #dialog.fid-dialog { position:fixed; inset:var(--fid-top) 0 0 var(--fid-sidebar); width:min(540px,calc(100vw - var(--fid-sidebar) - 36px)); max-width:none; max-height:calc(100dvh - var(--fid-top) - 28px); margin:auto; border:0; border-radius:12px; box-shadow:0 16px 40px rgba(15,23,42,.18); animation:none; background:var(--color-surface); color:var(--color-text); }
.fidelity #dialog.fid-dialog::backdrop { background:rgba(15,23,42,.45); clip-path:inset(107px 0 0 240px); }
.fidelity:has(.nav-collapsed) #dialog.fid-dialog::backdrop { clip-path:inset(107px 0 0 64px); }
/* On the chat page, which has no row of page tabs (plan 083), a dialog's backdrop starts below the header (plan 084). */
@media(min-width:761px) {
  .fidelity:has(#view .inbox-page) #dialog.fid-dialog::backdrop { clip-path:inset(56px 0 0 240px); }
  .fidelity:has(#view .inbox-page):has(.nav-collapsed) #dialog.fid-dialog::backdrop { clip-path:inset(56px 0 0 64px); }
}
@media(min-width:761px) and (max-width:920px) {
  .fidelity:has(#view .inbox-page) #dialog.fid-dialog::backdrop { clip-path:inset(56px 0 0 160px); }
}
.fidelity #dialog.fid-wide { width:min(660px,calc(100vw - var(--fid-sidebar) - 36px)); }
.fidelity .fid-dialog .modal-head { min-height:50px; padding:16px 20px 8px; border-bottom:0; }
.fidelity .fid-dialog .modal-head h2 { font-size:20px; font-weight:700; line-height:28px; }
.fidelity .fid-dialog .modal-head .icon-button { width:22px; height:24px; }
.fidelity .fid-dialog .modal-head .icon-button .icon { width:15px; height:15px; }
.fidelity .fid-dialog .modal-body { padding:8px 20px 16px; }
.fidelity .fid-dialog .modal-footer { padding:12px 20px 20px; gap:8px; border:0; justify-content:flex-end; background:var(--color-surface); }
.fidelity .fid-dialog .modal-footer .fid-btn { min-width:70px; }
```

**Edit 2.2** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.price-quote-row:last-child { border-bottom:0; }
.price-quote-product { display:flex; flex-wrap:wrap; align-items:baseline; gap:4px 8px; min-width:0; font-size:13px; }
.price-quote-product small { color:var(--fid-quiet); font-size:12px; }
.price-quote-prices { display:flex; flex:none; flex-wrap:wrap; justify-content:flex-end; gap:6px; margin-left:auto; }
.price-quote-prices small { margin-right:4px; opacity:.75; }
```

Replace them with:

```text
.price-quote-row:last-child { border-bottom:0; }
.price-quote-row:hover { background:color-mix(in srgb,var(--color-accent) 4%,var(--color-surface)); }
.price-quote-product { flex:1; display:flex; flex-wrap:wrap; align-items:baseline; gap:4px 8px; min-width:0; font-size:14px; cursor:pointer; }
.price-quote-product input[type=checkbox] { flex:none; align-self:center; width:16px; height:16px; margin:0; accent-color:var(--color-accent); }
#price-quote-count { padding:2px 8px; border-radius:999px; background:var(--color-accent-soft); color:var(--color-accent); font-variant-numeric:tabular-nums; }
.price-quote-product small { color:var(--fid-quiet); font-size:12px; }
.price-quote-prices { display:flex; flex:none; flex-wrap:wrap; justify-content:flex-end; gap:6px; margin-left:auto; font-variant-numeric:tabular-nums; }
.price-quote-prices small { margin-right:4px; opacity:.75; }
```

**Edit 2.3** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.price-confirm-table col:nth-child(4) { width:15%; }
.price-confirm-table .fid-input { width:100%; }
/* Where the conversation is narrow the button shows its icon only, and stands close to its neighbours. */
```

Replace them with:

```text
.price-confirm-table col:nth-child(4) { width:15%; }
.price-confirm-table .fid-input { width:100%; text-align:right; }
/* The confirm window's figures line up on the right (plan 084): quantity, unit price, amount and the total. */
.price-confirm-table th:first-child,.price-confirm-table td:first-child { text-align:left; }
.price-confirm-table th:nth-child(n+2):nth-child(-n+4),.price-confirm-table td:nth-child(n+2):nth-child(-n+4) { text-align:right; }
.price-confirm-table tfoot td { font-weight:700; }
/* Where the conversation is narrow the button shows its icon only, and stands close to its neighbours. */
```

#### `fidelity-lifecycle.css`

**Edit 2.4** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
}
.lc-mini-kpi span {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted);
}
.lc-mini-kpi strong {
```

Replace them with:

```text
}
.lc-mini-kpi span {
  display: block;
  font-size: 12px;
  color: var(--color-text-muted);
}
.lc-mini-kpi strong {
```

**Edit 2.5** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 550;
  white-space: nowrap;
}
```

Replace them with:

```text
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 550;
  white-space: nowrap;
}
```

**Edit 2.6** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
  font-weight: 700;
}
.lc-dossier-tab b {
  font-size: 11px;
  padding: 0 5px;
  border-radius: 8px;
  background: var(--color-surface-alt);
```

Replace them with:

```text
  font-weight: 700;
}
.lc-dossier-tab b {
  font-size: 12px;
  padding: 0 5px;
  border-radius: 8px;
  background: var(--color-surface-alt);
```

**Edit 2.7** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
}
.lc-card-block {
  border: 1px solid var(--fid-frame);
  border-radius: 10px;
  padding: 13px 14px;
  background: var(--color-surface);
}
.lc-card-block.warn-block {
  border-color: color-mix(in srgb, var(--fid-amber) 45%, var(--fid-frame));
  background: color-mix(in srgb, var(--fid-amber) 6%, var(--color-surface));
}
.lc-card-block.hot-block {
  border-color: color-mix(in srgb, var(--color-danger) 45%, var(--fid-frame));
  background: color-mix(in srgb, var(--color-danger) 5%, var(--color-surface));
}
.lc-block-head {
  display: flex;
```

Replace them with:

```text
}
.lc-card-block {
  border: 1px solid var(--fid-frame);
  border-radius: 12px;
  padding: 12px 16px;
  background: var(--color-surface);
}
.lc-card-block.warn-block {
  border-color: color-mix(in srgb, var(--fid-amber) 45%, var(--fid-frame));
  background: color-mix(in srgb, var(--fid-amber) 6%, var(--color-surface));
}
/* An overdue to-do in the amber of overdue follow-ups (plan 084). */
.lc-card-block.hot-block {
  border-color: color-mix(in srgb, var(--fid-amber) 35%, var(--fid-frame));
  background: var(--color-warning-soft);
}
.lc-block-head {
  display: flex;
```

**Edit 2.8** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
}
.lc-block-head h3 .icon {
```

Replace them with:

```text
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
}
.lc-block-head h3 .icon {
```

**Edit 2.9** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
.lc-qual-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.lc-qual-grid .full {
  grid-column: 1 / -1;
```

Replace them with:

```text
.lc-qual-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
}
.lc-qual-grid .full {
  grid-column: 1 / -1;
```

**Edit 2.10** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
  gap: 4px;
}
.lc-field span {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 600;
}
```

Replace them with:

```text
  gap: 4px;
}
.lc-field span {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 600;
}
```

**Edit 2.11** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
.lc-field .fid-select,
.lc-field textarea {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 6px 9px;
  font-size: 13px;
  background: var(--color-surface);
  color: var(--color-text);
}
.lc-field textarea {
  min-height: 62px;
  resize: vertical;
}

```

Replace them with:

```text
.lc-field .fid-select,
.lc-field textarea {
  width: 100%;
  border: 1px solid var(--color-border-input);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  background: var(--color-surface);
  color: var(--color-text);
}
.lc-field textarea {
  min-height: 64px;
  resize: vertical;
}

```

What these edits do, so that you can recognise them: in `fidelity.css` the dialog frame's radius and shadow, the backdrop's colour with a comment and two media blocks for the chat page after the rule of the collapsed menu, the dialog's head, body and footer, the quote list's rows, label, boxes and count, its prices, and the confirm window's alignment with a comment; in `fidelity-lifecycle.css` the sizes of the profile's labels, tabs, cards, titles and form, and the amber of an overdue to-do with a comment.

**Verify**: `sha256sum work/wa-replica/fidelity.css work/wa-replica/fidelity-lifecycle.css` → `3e374a00e7c5dd41e4077db995f19b01cec401000334e3fa88613adf5ecc5c15`, `96df305ed11486d4f86852e68ecee5ce94441a94213fd1c2c5e09077f1a7e142`. If a checksum does not match, restore the file (`git checkout -- <file>`) and apply its edits again, once; if it still does not match, STOP.

### Step 3: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
for (const name of ['设置标签', '移入聊天记录', '360° 档案']) assert(moduleSource.includes(`\${fidActionID(c.id)} title="${name}"`), `the strip's button ${name} must carry its name as a tooltip`);
const summary = {
```

Replace them with:

```text
for (const name of ['设置标签', '移入聊天记录', '360° 档案']) assert(moduleSource.includes(`\${fidActionID(c.id)} title="${name}"`), `the strip's button ${name} must carry its name as a tooltip`);
// Dialogs, the quote dialog and the 360° profile on the closed scale (plan 084): the frame's radius and slate
// backdrop, the backdrop below the header on the chat page (which has no row of page tabs), the quote list's whole
// row a target for its box and the count a badge, the confirm window's figures on the right, an overdue to-do amber.
for (const required of ['border-radius:12px; box-shadow:0 16px 40px rgba(15,23,42,.18);', '.fidelity:has(#view .inbox-page) #dialog.fid-dialog::backdrop { clip-path:inset(56px 0 0 240px); }', '.price-quote-product { flex:1;', '#price-quote-count { padding:2px 8px;', '.price-confirm-table th:nth-child(n+2):nth-child(-n+4),.price-confirm-table td:nth-child(n+2):nth-child(-n+4) { text-align:right; }']) {
  assert(pageCss.includes(required), `fidelity.css is missing ${required}`);
}
assert(lifecycleCss.includes('.lc-card-block.hot-block {\n  border-color: color-mix(in srgb, var(--fid-amber) 35%, var(--fid-frame));\n  background: var(--color-warning-soft);\n}'), 'an overdue to-do must be amber like the overdue follow-ups');
const summary = {
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  quotePicks: 'the quote dialog (报价): a box on the left ticks a product, the ticks stay while the search changes; 确认 opens 确认报价 with the ticked products in the order ticked — quantity (whole, at least 1), unit price (and price column), amount, total — where a product can be deleted and 返回列表 goes back; 放入消息框 puts one line per product ("Product Alpha PRDA01: $40 x 10 = $400") and "Total: $440"; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
  chatRoom: 'the chat page gives the conversation its room (plan 083): no row of page tabs there (the sidebar opens every page), compact rows above the messages, the strip on one line with icon buttons that keep their names as tooltips below 1600 px, the layout filling the page; white incoming bubbles with a hairline, close messages of one side, recessed translations; follow-up states in their own tints (overdue amber, re-contact rose, awaiting reply sky)',
```

Replace them with:

```text
  quotePicks: 'the quote dialog (报价): a box on the left ticks a product, the ticks stay while the search changes; 确认 opens 确认报价 with the ticked products in the order ticked — quantity (whole, at least 1), unit price (and price column), amount, total — where a product can be deleted and 返回列表 goes back; 放入消息框 puts one line per product ("Product Alpha PRDA01: $40 x 10 = $400") and "Total: $440"; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
  dialogsAndProfile: 'dialogs, the quote dialog and the 360° profile on the closed scale (plan 084): radius 12 with a slate backdrop that starts below the header on the chat page; the quote list\'s rows a target for their boxes, the count a badge, the confirm window\'s figures on the right; the profile\'s tabs, labels and fields at 12–14 px on an 8 px grid, an overdue to-do amber',
  chatRoom: 'the chat page gives the conversation its room (plan 083): no row of page tabs there (the sidebar opens every page), compact rows above the messages, the strip on one line with icon buttons that keep their names as tooltips below 1600 px, the layout filling the page; white incoming bubbles with a hairline, close messages of one side, recessed translations; follow-up states in their own tints (overdue amber, re-contact rose, awaiting reply sky)',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `166b4cd6739b9b83a1862c0ddb5a9a86862452e01761a7b5c4d45229705820f5`; `git checkout 2040b91 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.css`, `tokens.css` and `validation.json` of `outputs/wa-replica-prototype/` only; `bash -c "comm -13 <(git show 2040b91:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u)"` prints **nothing** (no new size token); `sha256sum outputs/wa-replica-prototype/app.css outputs/wa-replica-prototype/tokens.css` → `4a12fc45c0528da81002e3a534837798071d53b0e29d460ce47ca044780ce161`, `ba0180fa51da7f47ce36ac65582e778df68a35c1334413d6d507eaafa807966b`; `$NODE --test` → `tests 90`, `pass 90`, `fail 0`. If a checksum does not match, restore the file and apply its edits again, once; if it still does not match, a new size token appears, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 对话框、报价窗口与客户 360° 档案 · 2026-11-26

界面升级第四步（第一阶段的最后一步）：

- **对话框**：圆角 12 像素，标题 20 像素；在聊天页面打开对话框时，遮罩从顶部栏下方开始（聊天页面没有页面标签栏），不再留出未变暗的一条。
- **报价**：勾选框更大，点击整行左侧即可勾选；「已选 N 项」显示为青绿色标记；确认报价窗口中数量、单价、金额和合计右对齐，合计加粗。
- **客户 360° 档案**：标签页文字 14 像素，概要数字的说明 12 像素；需求画像表单的输入框按 8 像素网格排列；已逾期的当前待办显示为琥珀色（与跟进已逾期一致）。

验证：构建与校验脚本通过；没有新增尺寸标记；浏览器测试与截图：聊天页面上的对话框、报价列表与确认报价窗口、客户 360° 档案。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout 2040b91 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-084/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `e142e047f888a61de34999217acc112fe56a7e825b43541d0448669cce69c526`; `git status --porcelain` lists exactly these seven as changed and nothing as new: the four files of the table in "Current state" and `outputs/wa-replica-prototype/app.css`, `tokens.css`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the dialog frame, the chat page's backdrop, the quote list's row, the count badge, the confirm window's alignment, the amber of an overdue to-do.
- **Smoke** (`/tmp/wa-scrm-plan-084/smoke.sh`) — the same facts and the profile's sizes, the validator's entry and the build log, the built backdrop rule, no new size token, which built files changed, the five test files.
- **Verified by the reviewer, not by you**: screenshots of a dialog on the chat page, 报价 and 确认报价, the profile; the site and WhatsApp suites; deliberate faults.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 2040b91 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test` → `tests 90`, `pass 90`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-084/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `3e374a00e7c5dd41e4077db995f19b01cec401000334e3fa88613adf5ecc5c15`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.css` → `96df305ed11486d4f86852e68ecee5ce94441a94213fd1c2c5e09077f1a7e142`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `166b4cd6739b9b83a1862c0ddb5a9a86862452e01761a7b5c4d45229705820f5`
- [ ] `sha256sum replica/build-log.md` → `e142e047f888a61de34999217acc112fe56a7e825b43541d0448669cce69c526`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `4a12fc45c0528da81002e3a534837798071d53b0e29d460ce47ca044780ce161`
- [ ] `sha256sum outputs/wa-replica-prototype/tokens.css` → `ba0180fa51da7f47ce36ac65582e778df68a35c1334413d6d507eaafa807966b`
- [ ] `bash -c "comm -13 <(git show 2040b91:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u)"` prints nothing
- [ ] `git diff --name-only 2040b91..HEAD -- outputs` lists `app.css`, `tokens.css` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only 2040b91..HEAD -- . ':!plans'` lists exactly seven paths: the four of the table in "Current state", `app.css`, `tokens.css` and `validation.json`
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
- **The backdrop's cut** uses fixed lengths (the header 56 px, the header and the row of page tabs 107 px, the sidebar 240/160/64 px) because a dialog's backdrop does not take its values from the page in every browser; a change of those heights or widths must change these rules too.
- **A new dialog** made with `fidDialog` takes the frame as it is; a new figure column in a table of a dialog is right-aligned by its own rule.
- What a reviewer should scrutinise: the backdrop on the chat page with the menu open and collapsed and between 761 and 920 px; that a tick on the left of a quote row and on its box both work; the order blocks unchanged.
- `validation.json`: re-run the validator once in the main checkout after merging.
