# Plan 082: One colour world, the shell and the shared controls on the closed scale

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e9fa90a..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MEDIUM (every page changes colour at once; one style sheet only, no markup or script; exact text and checksums for every file)
- **Depends on**: plans/081-text-font.md (DONE; its font rules sit just above the new block)
- **Category**: owner decision of 2026-11-26 — the UI upgrade, Pass A, with the token strategy the owner approved in the upgrade plan
- **Planned at**: commit `e9fa90a`, 2026-11-26

## Why this matters

A design review of the workbench (2026-11-26, two independent assessments: a design review and an automated detector in the browser) scored it 24/40. Three primary colours compete — a violet gradient (`--fid-violet` #5436e9 to `--fid-royal` #3358e8), blue (`--color-accent` #2f7bff) and green (`--fid-mint` #24b95e) — and the detector found 40 places in five views where text is below WCAG AA, all from a few colour values: grey #8b91a2 (`--fid-quiet`) on white 3.15:1, white on #2f7bff 3.89:1, white on #24b95e 2.57:1, #a86813 (`--fid-amber`) on its tint 3.9:1. Font sizes run from 10 to 32 px in 18 steps, with Chinese text at 10–11 px.

The owner approved the UI upgrade plan, whose token strategy is: **one `:root` block at the top of `fidelity.css` that re-declares existing colour variables** — a teal accent (#0f766e: white text on it 5.47:1, it on white 5.47:1), cool neutrals, hairlines instead of shadows, greys of at least 4.5:1 on every surface (#58667a: 5.84:1 on white, 5.39:1 on #f4f6f9, 5.33:1 on #f1f5f9), one tint per follow-up state — and lengths only from the closed scale that already exists as size tokens. On `:root`, not on `.fidelity`: the base works out its own names there (`--accent: var(--color-accent)`, `--muted`, `--line`, `--soft`…), and a name worked out on `:root` would keep the old colour if the new value were set lower down. `app.css` (which holds `fidelity.css`) loads after `tokens.css`, so its `:root` wins over the build's palette, which stays as it is underneath.

Shown in a browser (the reviewer's harness, 2026-11-26, this plan's change): the sign-in screen, 首页 (home), the conversation, 客户列表 (customers) and the supervisor page in teal, cool greys and hairlines; the current page tab underlined; the sidebar grey with the current page in a light teal; the bell's count a teal badge.

### Decisions already made (do not re-open; do not ask)

- The `:root` block (Edit 2.1) holds exactly the values of the approved plan: canvas #f4f6f9, panes #ffffff, `--color-surface-alt` #f8fafc, rails `--rail` #f1f5f9, hairlines rgba(15,23,42,.08) for `--color-border` and `--fid-frame`, field and button borders #cbd5e1, text #0f172a, ink #334155, muted and quiet #58667a, accent #0f766e / hover #115e59 / soft #f0fdfa (and `--fid-violet` and `--fid-royal`, so the gradient becomes plain teal), danger #be123c, warning #b45309 on #fffbeb, success and `--fid-mint` #047857 on #ecfdf5, `--fid-chat` (the conversation's background) #f4f6f9 instead of the beige, `--fid-disabled` #f1f5f9. Four new names — `--fid-sky` #0369a1, `--fid-sky-bg` #f0f9ff, `--fid-rose-bg` #fff1f2, `--fid-ease` cubic-bezier(.16,1,.3,1) — are declared here for the plans that follow (the tints of the follow-up states, motion), so that every colour of the upgrade is in one place. The outgoing bubble keeps WhatsApp's green (`--color-bubble-out` is not re-declared).
- The shell: the sidebar and the tool rail on `--rail`; menu items 40 px high, radius 8, gap 12, sub-items 14 px, captions 12 px; the current item a 10% teal fill; the edition chip radius 8; the bell's count an 18 px teal badge with 12 px figures; the row of page tabs white, its tabs 14 px, the current one underlined (2 px teal) — the row keeps its height (51 px), because dialogs are placed below it.
- Shared controls: buttons radius 8, at least 36 px high, padding 16, border #cbd5e1 (`--color-border-input`), slim ones 28 px; fields 36 px, radius 8; panels radius 12, padding 16/20/24; `.fid-rounded` and `.fid-table-card` a hairline instead of a shadow, radius 12; page titles 20 px bold, line 28 px, their subtitles 14 px muted; empty states and the pager 14 px.
- Figures line up: `font-variant-numeric:tabular-nums` on times, unread and task counts, the pager, table cells and the home page's figures.
- Sign-in and stop screen: the panel radius 12, the title 20 px, the note 14 px muted, labels 14 px, fields with the field border, errors 14 px.
- Lengths only from the existing size tokens: no new one appears. Two are no longer used (41 px and the 1.2 px letter spacing) and leave `tokens.css`; the build lists lengths in the order they are first used, so `tokens.css` changes although nothing is added — the check is that **no new name** appears (the smoke script compares the names).
- Not changed: markup, scripts, the base, the other style sheets, table alignment (Pass B), the tints of tiers and follow-up states, the inbox, the drawer and the dialogs (plans 083–087), the font rules.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity.css` | `16c130b67cc7f4b33e313a7e5e1e9cca903cb9d84922292e331ccede3f59f399` | `153af05ba65203b2db1bfcc31218a8f4f382d96987b093cbab81ae75708e3d5f` | 12 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `04085b6527101da10b7389dc9033278b616f6d6b71006046cbe3f3b59d9297e5` | `7c6dec939f22f0831b6a641d127cc5284ac19b1a60672af7400d5ef80c0c5e3e` | 2 |
| `replica/build-log.md` | `94418e1f200567585a5e10d31d906eb4339ed177ef491cdafd60bc539722a6d3` | `c533bb3276c1adb612e0cf1093ecb8276d2e64f36e9d691fd3a5d3a24ac4e7e3` | 1 append |

- `fidelity.css` — the page's own style sheet, built into `outputs/wa-replica-prototype/app.css`; it starts with the font rules (`@font-face`), then the `.fidelity` rule, the shell (`.brand…`, `.nav-…`, `.topbar`, `.fid-edition`, `.workspace-tab…`), the page and control rules (`.fid-page`, `.fid-panel`, `.fid-heading`, `.fid-btn`), the sign-in rules (`.fid-sign-in-…`) and the fields and tables (`.fid-input`, `.fid-table…`, `.fid-pager`).
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). It turns every `px` value of the fidelity style sheets into a size token in `tokens.css`, listed in the order of first use. After this plan's build exactly these output files differ: `app.css`, `tokens.css` (two tokens fewer, none new) and `validation.json` (written by the validator).

## Commands you will need

Run from the repository root of **your working copy** (the clone you were given — never any other checkout).

**The tests and the smoke script need Node 22.13 or newer** (the server's accounts and data use `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout e9fa90a -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| All tests | `$NODE --test` | `tests 90`, `pass 90`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-082/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity.css` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.css`, `tokens.css`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — the other style sheets, `fidelity-index.html`, every script, `build-fidelity.cjs` (its palette stays as it is), the base app, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your working copy is already on (`advisor/082-colour-world`). If (and only if) you find yourself on `main`, create and switch to `advisor/082-colour-world` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): one colour world, the shell and the shared controls on the closed scale`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, very long lines, quotes and backslashes; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 14 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums in "Current state" tell you whether every file is exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-082/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-082 && cat > /tmp/wa-scrm-plan-082/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 082: one colour world declared on :root (teal accent, cool neutrals, hairlines, readable greys), the
# shell, the shared controls and the sign-in screen on the closed scale; no new size token. NODE must be Node 22.13
# or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'the colours are declared once, on :root' "$W/fidelity.css" ':root {'
has 'the accent is teal' "$W/fidelity.css" '--color-accent:#0f766e; --color-accent-hover:#115e59; --color-accent-soft:#f0fdfa;'
has 'secondary text reads on every surface' "$W/fidelity.css" '--color-text-muted:#58667a;'
has 'borders are hairlines' "$W/fidelity.css" '--color-border:rgba(15,23,42,.08);'
has 'the tints of the follow-up states are named' "$W/fidelity.css" '--fid-sky:#0369a1; --fid-sky-bg:#f0f9ff; --fid-rose-bg:#fff1f2; --fid-ease:cubic-bezier(.16,1,.3,1);'
has 'the rails are grey' "$W/fidelity.css" '.fidelity .sidebar,.fidelity .tool-rail { background:var(--rail); }'
has 'figures line up' "$W/fidelity.css" '.fidelity :is(time,.unread,.header-count,.nav-count,.fid-pager,.fid-table td,.dash-metric) { font-variant-numeric:tabular-nums; }'
has 'the current page tab is underlined' "$W/fidelity.css" 'box-shadow:inset 0 -2px 0 var(--color-accent); }'
has 'buttons on the scale' "$W/fidelity.css" 'border-radius:8px; min-height:36px; padding:0 16px;'
has 'page titles of 20px' "$W/fidelity.css" '.fid-heading h1 { font-size:20px; font-weight:700; line-height:28px;'
has 'the sign-in note reads at 14px' "$W/fidelity.css" '.fid-sign-in-note { margin:0; color:var(--color-text-muted); font-size:14px;'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  colourWorld: 'one colour world (plan 082)"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 界面配色与基础样式 · 2026-11-26'
has 'the built style sheet has the colours' "$O/app.css" '--color-accent:#0f766e; --color-accent-hover:#115e59;'
same 'no new size token (the scale only closes)' "$(cd "$ROOT" && comm -13 <(git show e9fa90a:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u) | wc -l)" 0
same 'of the built files only the style sheet, its size tokens and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.css|tokens\.css|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the price file pass' "$("$NODE" --test "$W/price-file.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the provisioner pass' "$("$NODE" --test "$W/site-provisioner.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 13 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-082/smoke.sh && ls -l /tmp/wa-scrm-plan-082/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the first table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-082/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the colours are declared once, on :root`, `the accent is teal`, `secondary text reads on every surface`, `borders are hairlines`, `the tints of the follow-up states are named`, `the rails are grey`, `figures line up`, `the current page tab is underlined`, `buttons on the scale`, `page titles of 20px`, `the sign-in note reads at 14px`, `the validator knows it`, `the build log has the entry`, `the built style sheet has the colours`; every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The colour world, the shell, the shared controls and the sign-in screen

#### `fidelity.css`

**Edit 2.1** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
@font-face { font-family:"HarmonyOS Sans SC"; font-style:normal; font-weight:700; font-display:swap; src:url("fonts/HarmonyOS_Sans_SC_Bold.ttf") format("truetype"); }
.fidelity { --fid-sidebar:240px; --fid-top:107px; --fid-gradient:linear-gradient(115deg,var(--fid-violet),var(--fid-royal)); font-family:"HarmonyOS Sans SC",system-ui,-apple-system,"Segoe UI","Microsoft YaHei","SCRM Emoji",sans-serif; }
```

Replace them with:

```text
@font-face { font-family:"HarmonyOS Sans SC"; font-style:normal; font-weight:700; font-display:swap; src:url("fonts/HarmonyOS_Sans_SC_Bold.ttf") format("truetype"); }
/* One calm colour world for the workbench (plan 082): a teal accent, cool neutrals, hairlines instead of shadows, greys
   that read on every surface (WCAG AA: 4.5:1 and more) and a tint for each state of a follow-up. Declared on :root,
   where the base works out its own names (--accent, --muted, --line, --soft…), so that the base and these style
   sheets follow it; the build's palette stays as it is underneath. */
:root {
  --color-bg:#f4f6f9; --color-surface:#ffffff; --color-surface-alt:#f8fafc; --color-border:rgba(15,23,42,.08); --color-border-input:#cbd5e1;
  --color-text:#0f172a; --color-text-muted:#58667a; --color-accent:#0f766e; --color-accent-hover:#115e59; --color-accent-soft:#f0fdfa;
  --color-danger:#be123c; --color-warning:#b45309; --color-warning-soft:#fffbeb; --color-success:#047857; --color-success-soft:#ecfdf5;
  --rail:#f1f5f9; --fid-ink:#334155; --fid-violet:#0f766e; --fid-royal:#0f766e; --fid-mint:#047857; --fid-mint-bg:#ecfdf5;
  --fid-chat:#f4f6f9; --fid-quiet:#58667a; --fid-frame:rgba(15,23,42,.08); --fid-disabled:#f1f5f9; --fid-amber:#b45309;
  --fid-sky:#0369a1; --fid-sky-bg:#f0f9ff; --fid-rose-bg:#fff1f2; --fid-ease:cubic-bezier(.16,1,.3,1);
}
.fidelity { --fid-sidebar:240px; --fid-top:107px; --fid-gradient:linear-gradient(115deg,var(--fid-violet),var(--fid-royal)); font-family:"HarmonyOS Sans SC",system-ui,-apple-system,"Segoe UI","Microsoft YaHei","SCRM Emoji",sans-serif; }
```

**Edit 2.2** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fidelity .brand { padding-inline:16px; gap:10px; }
.fidelity .brand-symbol { width:42px; height:42px; border-radius:10px; background:var(--fid-gradient); color:var(--color-surface); flex-shrink:0; }
.fidelity .brand-name strong { font-size:19px; font-weight:700; color:var(--color-text); white-space:nowrap; }
.fidelity .brand-name small { font-size:11px; line-height:14px; margin-top:2px; letter-spacing:1.2px; color:var(--fid-quiet); }
.fidelity #nav { padding:10px 25px 10px 10px; scrollbar-width:thin; scrollbar-color:var(--fid-inbox) transparent; }
.fidelity .nav-item,.fidelity .nav-group-button { height:41px; min-height:41px; margin:0 0 1px; padding:0 12px; gap:13px; border-radius:7px; font-size:14px; font-weight:400; }
.fidelity .nav-item.active,.fidelity .nav-group-button.group-active { color:var(--color-accent); }
.fidelity .nav-item.active { background:var(--color-accent-soft); }
.fidelity .nav-group-button.group-active .icon { color:var(--color-accent); }
.fidelity .submenu .nav-item { height:36px; min-height:36px; padding-inline:42px 10px; font-size:13px; }
.fidelity .nav-caption { padding:16px 10px 5px; color:var(--fid-quiet); font-size:11px; }
.fidelity .sidebar-bottom { height:57px; padding:7px 10px; }
```

Replace them with:

```text
.fidelity .brand { padding-inline:16px; gap:10px; }
.fidelity .brand-symbol { width:42px; height:42px; border-radius:12px; background:var(--fid-gradient); color:var(--color-surface); flex-shrink:0; }
.fidelity .brand-name strong { font-size:20px; font-weight:700; color:var(--color-text); white-space:nowrap; }
.fidelity .brand-name small { font-size:12px; line-height:16px; margin-top:2px; letter-spacing:0; color:var(--fid-quiet); }
.fidelity #nav { padding:10px 25px 10px 10px; scrollbar-width:thin; scrollbar-color:var(--fid-inbox) transparent; }
.fidelity .nav-item,.fidelity .nav-group-button { height:40px; min-height:40px; margin:0 0 2px; padding:0 12px; gap:12px; border-radius:8px; font-size:14px; font-weight:400; }
.fidelity .nav-item.active,.fidelity .nav-group-button.group-active { color:var(--color-accent); }
.fidelity .nav-item.active { background:color-mix(in srgb,var(--color-accent) 10%,var(--color-surface)); }
.fidelity .nav-group-button.group-active .icon { color:var(--color-accent); }
.fidelity .submenu .nav-item { height:36px; min-height:36px; padding-inline:42px 10px; font-size:14px; }
.fidelity .nav-caption { padding:16px 12px 4px; color:var(--fid-quiet); font-size:12px; }
.fidelity .sidebar-bottom { height:57px; padding:7px 10px; }
```

**Edit 2.3** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fidelity .nav-collapsed .nav-item,.fidelity .nav-collapsed .submenu .nav-item { padding:0; justify-content:center; }
.fidelity .topbar { padding:0 24px 0 16px; }
```

Replace them with:

```text
.fidelity .nav-collapsed .nav-item,.fidelity .nav-collapsed .submenu .nav-item { padding:0; justify-content:center; }
.fidelity .sidebar,.fidelity .tool-rail { background:var(--rail); }
/* Figures line up (plan 082): times, counts, the pager and the cells of tables in figures of one width. */
.fidelity :is(time,.unread,.header-count,.nav-count,.fid-pager,.fid-table td,.dash-metric) { font-variant-numeric:tabular-nums; }
.fidelity .topbar { padding:0 24px 0 16px; }
```

**Edit 2.4** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fidelity .header-left>.icon-button { width:38px; }
.fid-edition { display:flex; height:28px; align-items:stretch; border-radius:7px; overflow:hidden; background:var(--color-accent-soft); white-space:nowrap; color:var(--color-text); font-size:12px; }
.fid-edition>b,.fid-edition>span { display:flex; align-items:center; padding-inline:12px; }
```

Replace them with:

```text
.fidelity .header-left>.icon-button { width:38px; }
.fid-edition { display:flex; height:28px; align-items:stretch; border-radius:8px; overflow:hidden; background:var(--color-accent-soft); white-space:nowrap; color:var(--color-text); font-size:12px; }
.fid-edition>b,.fid-edition>span { display:flex; align-items:center; padding-inline:12px; }
```

**Edit 2.5** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fidelity .top-actions>.icon-button { position:relative; width:36px; height:36px; }
.fidelity .top-actions .header-count { top:0; right:0; background:var(--color-accent-soft); font-size:10px; }
.fidelity .fid-sign-out { min-height:36px; padding-inline:10px; border-color:transparent; gap:6px; font-size:13px; }
.fidelity .fid-sign-out:hover { background:var(--color-accent-soft); border-color:transparent; }
.fidelity .workspace-tabs { padding:5px 32px 10px; align-items:flex-start; gap:0; background:var(--color-surface-alt); }
.fidelity .workspace-tab { min-width:96px; min-height:32px; justify-content:center; color:var(--color-text-muted); }
.fidelity .workspace-tab>a { padding:6px 11px; }
.fidelity .workspace-tab>a>.icon { display:none; }
.fidelity .workspace-tab.active { border-color:var(--fid-frame); color:var(--color-accent); box-shadow:0 1px 2px var(--fid-shadow); }
.fidelity .workspace-tab.active:has(>button)>a { padding-right:2px; }
```

Replace them with:

```text
.fidelity .top-actions>.icon-button { position:relative; width:36px; height:36px; }
.fidelity .top-actions .header-count { top:0; right:0; min-width:18px; height:18px; padding:0 4px; border-radius:999px; background:var(--color-accent); color:var(--color-on-accent); font-size:12px; line-height:18px; }
.fidelity .fid-sign-out { min-height:36px; padding-inline:10px; border-color:transparent; gap:6px; font-size:13px; }
.fidelity .fid-sign-out:hover { background:var(--color-accent-soft); border-color:transparent; }
.fidelity .workspace-tabs { padding:0 24px; align-items:stretch; gap:0; background:var(--color-surface); }
.fidelity .workspace-tab { min-width:96px; min-height:32px; justify-content:center; color:var(--color-text-muted); font-size:14px; }
.fidelity .workspace-tab>a { padding:6px 11px; }
.fidelity .workspace-tab>a>.icon { display:none; }
.fidelity .workspace-tab.active { border-color:transparent; border-radius:0; background:transparent; color:var(--color-accent); box-shadow:inset 0 -2px 0 var(--color-accent); }
.fidelity .workspace-tab.active:has(>button)>a { padding-right:2px; }
```

**Edit 2.6** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text

.fid-page { height:100%; overflow:auto; overscroll-behavior:contain; padding:18px 20px 76px; color:var(--color-text); font-size:14px; }
.fid-page.fid-accounts { padding:22px 24px 76px; }
.fid-panel { min-width:0; background:var(--color-surface); border:1px solid var(--fid-frame); border-radius:10px; padding:18px 20px 30px; }
.fid-rounded { border-radius:18px; background:var(--color-surface); box-shadow:0 2px 8px var(--fid-shadow); }
.fid-heading { display:flex; flex-wrap:wrap; align-items:center; gap:4px 11px; min-height:26px; margin:0 0 10px; }
.fid-heading h1 { font-size:17px; font-weight:750; line-height:24px; letter-spacing:0; }
.fid-heading p { font-size:13px; line-height:20px; color:var(--fid-ink); opacity:.82; }
.fid-actions,.fid-filter-row { display:flex; flex-wrap:wrap; align-items:center; gap:10px; }
.fid-btn { display:inline-flex; align-items:center; justify-content:center; gap:5px; white-space:nowrap; border:1px solid var(--color-border); border-radius:5px; min-height:34px; padding:0 15px; background:var(--color-surface); color:var(--fid-ink); font-family:inherit; font-size:14px; font-weight:400; text-decoration:none; }
.fid-btn .icon { width:14px; height:14px; }
.fid-sign-in { min-height:100dvh; display:grid; place-items:center; padding:20px; background:var(--color-bg); }
.fid-sign-in-panel { display:grid; justify-items:center; gap:20px; width:min(100%,360px); padding:32px 24px; border:1px solid var(--fid-frame); border-radius:14px; background:var(--color-surface); color:var(--color-text); }
.fid-sign-in-brand { display:flex; align-items:center; gap:10px; font-size:16px; }
.fid-sign-in-panel h1 { font-size:22px; }
.fid-sign-in-panel .fid-btn { min-height:44px; padding-inline:18px; }
.fid-sign-in-note { margin:0; color:var(--fid-quiet); font-size:13px; line-height:20px; text-align:center; }
.fid-sign-in-font { margin:0; color:var(--color-text-muted); font-size:12px; line-height:20px; text-align:center; }
.fid-sign-in-form { display:grid; gap:14px; width:100%; }
.fid-sign-in-form[hidden] { display:none; }
.fid-sign-in-form .field { display:grid; gap:6px; font-size:13px; }
.fid-sign-in-form .field input { height:40px; padding:0 12px; border:1px solid var(--color-border); border-radius:8px; background:var(--color-surface); color:var(--color-text); font:inherit; }
.fid-sign-in-form .field input:focus { border-color:var(--color-accent); outline:1px solid var(--color-accent); outline-offset:0; }
.fid-sign-in-error { margin:0; color:var(--color-danger); font-size:13px; line-height:20px; }
.fid-btn:hover:not(:disabled) { border-color:var(--color-accent); color:var(--color-accent); }
```

Replace them with:

```text

.fid-page { height:100%; overflow:auto; overscroll-behavior:contain; padding:16px 24px 76px; color:var(--color-text); font-size:14px; }
.fid-page.fid-accounts { padding:22px 24px 76px; }
.fid-panel { min-width:0; background:var(--color-surface); border:1px solid var(--fid-frame); border-radius:12px; padding:16px 20px 24px; }
.fid-rounded { border-radius:12px; background:var(--color-surface); border:1px solid var(--fid-frame); }
.fid-heading { display:flex; flex-wrap:wrap; align-items:center; gap:4px 11px; min-height:26px; margin:0 0 10px; }
.fid-heading h1 { font-size:20px; font-weight:700; line-height:28px; letter-spacing:0; }
.fid-heading p { font-size:14px; line-height:20px; color:var(--color-text-muted); }
.fid-actions,.fid-filter-row { display:flex; flex-wrap:wrap; align-items:center; gap:10px; }
.fid-btn { display:inline-flex; align-items:center; justify-content:center; gap:5px; white-space:nowrap; border:1px solid var(--color-border-input); border-radius:8px; min-height:36px; padding:0 16px; background:var(--color-surface); color:var(--fid-ink); font-family:inherit; font-size:14px; font-weight:400; text-decoration:none; }
.fid-btn .icon { width:14px; height:14px; }
.fid-sign-in { min-height:100dvh; display:grid; place-items:center; padding:20px; background:var(--color-bg); }
.fid-sign-in-panel { display:grid; justify-items:center; gap:20px; width:min(100%,360px); padding:32px 24px; border:1px solid var(--fid-frame); border-radius:12px; background:var(--color-surface); color:var(--color-text); }
.fid-sign-in-brand { display:flex; align-items:center; gap:10px; font-size:16px; }
.fid-sign-in-panel h1 { font-size:20px; line-height:28px; }
.fid-sign-in-panel .fid-btn { min-height:44px; padding-inline:16px; }
.fid-sign-in-note { margin:0; color:var(--color-text-muted); font-size:14px; line-height:20px; text-align:center; }
.fid-sign-in-font { margin:0; color:var(--color-text-muted); font-size:12px; line-height:20px; text-align:center; }
.fid-sign-in-form { display:grid; gap:16px; width:100%; }
.fid-sign-in-form[hidden] { display:none; }
.fid-sign-in-form .field { display:grid; gap:8px; font-size:14px; }
.fid-sign-in-form .field input { height:40px; padding:0 12px; border:1px solid var(--color-border-input); border-radius:8px; background:var(--color-surface); color:var(--color-text); font:inherit; }
.fid-sign-in-form .field input:focus { border-color:var(--color-accent); outline:1px solid var(--color-accent); outline-offset:0; }
.fid-sign-in-error { margin:0; color:var(--color-danger); font-size:14px; line-height:20px; }
.fid-btn:hover:not(:disabled) { border-color:var(--color-accent); color:var(--color-accent); }
```

**Edit 2.7** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-btn.blue:hover:not(:disabled) { background:var(--color-accent-hover); color:var(--color-surface); }
.fid-btn.gradient { background:var(--fid-gradient); border-radius:9px; }
.fid-btn.gradient:hover:not(:disabled),.fid-btn.green:hover:not(:disabled) { color:var(--color-surface); filter:brightness(.94); }
.fid-btn.green { background:var(--fid-mint); border-radius:9px; }
.fid-btn.tint { background:var(--color-accent-soft); border-color:color-mix(in srgb,var(--color-accent) 30%,var(--color-border)); color:var(--color-accent); }
```

Replace them with:

```text
.fid-btn.blue:hover:not(:disabled) { background:var(--color-accent-hover); color:var(--color-surface); }
.fid-btn.gradient { background:var(--fid-gradient); border-radius:8px; }
.fid-btn.gradient:hover:not(:disabled),.fid-btn.green:hover:not(:disabled) { color:var(--color-surface); filter:brightness(.94); }
.fid-btn.green { background:var(--fid-mint); border-radius:8px; }
.fid-btn.tint { background:var(--color-accent-soft); border-color:color-mix(in srgb,var(--color-accent) 30%,var(--color-border)); color:var(--color-accent); }
```

**Edit 2.8** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-btn:disabled { opacity:.40; }
.fid-btn.slim { min-height:27px; padding-inline:8px; font-size:12px; }
.fid-link { color:var(--color-accent); padding:0; border:0; background:none; font-size:inherit; }
.fid-link:hover { text-decoration:underline; }
.fid-input,.fid-select { height:34px; min-height:0; min-width:0; border:1px solid var(--color-border); border-radius:5px; background:var(--color-surface); padding:0 10px; color:var(--color-text); font:inherit; font-size:13px; }
.fid-input::placeholder { color:var(--fid-quiet); opacity:1; }
```

Replace them with:

```text
.fid-btn:disabled { opacity:.40; }
.fid-btn.slim { min-height:28px; padding-inline:8px; font-size:12px; }
.fid-link { color:var(--color-accent); padding:0; border:0; background:none; font-size:inherit; }
.fid-link:hover { text-decoration:underline; }
.fid-input,.fid-select { height:36px; min-height:0; min-width:0; border:1px solid var(--color-border-input); border-radius:8px; background:var(--color-surface); padding:0 10px; color:var(--color-text); font:inherit; font-size:13px; }
.fid-input::placeholder { color:var(--fid-quiet); opacity:1; }
```

**Edit 2.9** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-joined { display:inline-flex; min-width:0; }
.fid-joined .fid-select { border-radius:5px 0 0 5px; background:var(--color-surface-alt); }
.fid-joined .fid-input { border-radius:0 5px 5px 0; border-left:0; }
.fid-platform { display:inline-flex; align-items:center; gap:5px; white-space:nowrap; min-height:30px; border:1px solid var(--color-accent); color:var(--color-accent); padding:0 12px; border-radius:20px; background:var(--color-accent-soft); font-size:13px; font-weight:700; }
```

Replace them with:

```text
.fid-joined { display:inline-flex; min-width:0; }
.fid-joined .fid-select { border-radius:8px 0 0 8px; background:var(--color-surface-alt); }
.fid-joined .fid-input { border-radius:0 8px 8px 0; border-left:0; }
.fid-platform { display:inline-flex; align-items:center; gap:5px; white-space:nowrap; min-height:30px; border:1px solid var(--color-accent); color:var(--color-accent); padding:0 12px; border-radius:20px; background:var(--color-accent-soft); font-size:13px; font-weight:700; }
```

**Edit 2.10** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-table td.fid-large-empty { height:220px; }
.fid-empty { display:grid; align-content:center; justify-items:center; gap:10px; color:var(--fid-quiet); font-size:13px; min-height:120px; }
.fid-empty .icon { width:46px; height:46px; color:var(--fid-inbox); }
```

Replace them with:

```text
.fid-table td.fid-large-empty { height:220px; }
.fid-empty { display:grid; align-content:center; justify-items:center; gap:10px; color:var(--fid-quiet); font-size:14px; min-height:120px; }
.fid-empty .icon { width:46px; height:46px; color:var(--fid-inbox); }
```

**Edit 2.11** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-icon-actions .icon-button.fid-danger,.fid-group-row .icon-button.fid-danger { color:var(--color-danger); }
.fid-pager { display:flex; align-items:center; justify-content:flex-end; flex-wrap:wrap; gap:6px; margin-top:12px; min-height:30px; color:var(--fid-ink); font-size:13px; }
.fid-pager .fid-select { width:96px; height:30px; margin:0 4px 0 6px; }
```

Replace them with:

```text
.fid-icon-actions .icon-button.fid-danger,.fid-group-row .icon-button.fid-danger { color:var(--color-danger); }
.fid-pager { display:flex; align-items:center; justify-content:flex-end; flex-wrap:wrap; gap:6px; margin-top:12px; min-height:30px; color:var(--fid-ink); font-size:14px; }
.fid-pager .fid-select { width:96px; height:30px; margin:0 4px 0 6px; }
```

**Edit 2.12** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-pager .icon { width:13px; height:13px; }
.fid-table-card { overflow:hidden; background:var(--color-surface); border-radius:16px; box-shadow:0 2px 8px var(--fid-shadow); }
.fid-table-card>.fid-pager { padding:14px 16px; margin:0; }
```

Replace them with:

```text
.fid-pager .icon { width:13px; height:13px; }
.fid-table-card { overflow:hidden; background:var(--color-surface); border:1px solid var(--fid-frame); border-radius:12px; }
.fid-table-card>.fid-pager { padding:14px 16px; margin:0; }
```

What these edits do, so that you can recognise them: the first adds the comment and the `:root` block before the `.fidelity` rule; the others change values in rules that already exist (radii, heights, sizes, colours) and add three lines after the rule of the collapsed menu: the rails, a comment and the rule for figures.

**Verify**: `sha256sum work/wa-replica/fidelity.css` → `153af05ba65203b2db1bfcc31218a8f4f382d96987b093cbab81ae75708e3d5f`. If the checksum does not match, restore the file (`git checkout -- <file>`) and apply its edits again, once; if it still does not match, STOP.

### Step 3: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text

const summary = {
```

Replace them with:

```text

// One colour world for the workbench (plan 082): the UI upgrade's teal accent, cool neutrals, hairlines and greys that
// read on every surface, declared on :root (where the base works out --accent, --muted, --line…), in the source and in
// the built style sheet.
for (const required of [':root {', '--color-accent:#0f766e;', '--color-text-muted:#58667a;', '--fid-quiet:#58667a;', '--color-border:rgba(15,23,42,.08);', '--fid-violet:#0f766e; --fid-royal:#0f766e;', '--fid-sky:#0369a1; --fid-sky-bg:#f0f9ff; --fid-rose-bg:#fff1f2; --fid-ease:cubic-bezier(.16,1,.3,1);']) {
  assert(read(path.join(__dirname, 'fidelity.css')).includes(required) && read(path.join(out, 'app.css')).includes(required), `the colour world is missing ${required}`);
}
const summary = {
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  quotePicks: 'the quote dialog (报价): a box on the left ticks a product, the ticks stay while the search changes; 确认 opens 确认报价 with the ticked products in the order ticked — quantity (whole, at least 1), unit price (and price column), amount, total — where a product can be deleted and 返回列表 goes back; 放入消息框 puts one line per product ("Product Alpha PRDA01: $40 x 10 = $400") and "Total: $440"; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
  textFont: 'the page draws its text in HarmonyOS Sans SC: Huawei\'s Regular and Bold files, unmodified, with their licence (work/wa-replica/fonts, copied by the build); the sign-in screen says 本系统使用 HarmonyOS Sans 字体 as the licence asks; the server sends the files as font/ttf that the browser keeps, the gateway compresses them; a conversation that shows its end keeps showing it when the font arrives',
```

Replace them with:

```text
  quotePicks: 'the quote dialog (报价): a box on the left ticks a product, the ticks stay while the search changes; 确认 opens 确认报价 with the ticked products in the order ticked — quantity (whole, at least 1), unit price (and price column), amount, total — where a product can be deleted and 返回列表 goes back; 放入消息框 puts one line per product ("Product Alpha PRDA01: $40 x 10 = $400") and "Total: $440"; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
  colourWorld: 'one colour world (plan 082): a teal accent (#0f766e, white text on it 5.47:1), cool neutrals, hairlines instead of shadows, greys of 4.5:1 and more on every surface, declared on :root so that the base follows; the shell, the shared controls and the sign-in screen on the closed scale of lengths',
  textFont: 'the page draws its text in HarmonyOS Sans SC: Huawei\'s Regular and Bold files, unmodified, with their licence (work/wa-replica/fonts, copied by the build); the sign-in screen says 本系统使用 HarmonyOS Sans 字体 as the licence asks; the server sends the files as font/ttf that the browser keeps, the gateway compresses them; a conversation that shows its end keeps showing it when the font arrives',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `7c6dec939f22f0831b6a641d127cc5284ac19b1a60672af7400d5ef80c0c5e3e`; `git checkout e9fa90a -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.css`, `tokens.css` and `validation.json` of `outputs/wa-replica-prototype/` only; `bash -c "comm -13 <(git show e9fa90a:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u)"` prints **nothing** (no new size token); `sha256sum outputs/wa-replica-prototype/app.css outputs/wa-replica-prototype/tokens.css` → `c3da6bfe57536ff1f0d1309d2f2a7968b9364ff7d74bd0e2f2e2de2ffec2d729`, `ae68ee7305fba57e8ca73b6ce80783c312b94d9a833d9e84be89baa0637b7c87`; `$NODE --test` → `tests 90`, `pass 90`, `fail 0`. If a checksum does not match, restore the file and apply its edits again, once; if it still does not match, a new size token appears, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 界面配色与基础样式 · 2026-11-26

界面升级第二步：统一的配色和基础样式，所有页面同时生效：

- **配色**：主色改为青绿色（按钮、链接、选中状态），背景为冷灰色，边框为细线，不再使用阴影；次要文字加深，在所有背景上都清晰可读（对比度不低于 4.5:1）。
- **侧边栏与顶部**：侧边栏为浅灰底色，当前页面以浅青色底标出；顶部的页面标签以下划线标出当前页面；铃铛上的数字改为青绿色圆标。
- **按钮与输入框**：圆角统一为 8 像素，高度 36 像素；面板和表格卡片圆角 12 像素，以细线代替阴影；页面标题 20 像素。
- **登录页面**：标题、说明文字和输入框按新的字号显示，登录按钮为青绿色。

验证：构建与校验脚本通过；没有新增尺寸标记（移除了两个不再使用的）；浏览器测试与截图：登录页、首页、聊天、客户列表、主管页面。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout e9fa90a -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-082/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `c533bb3276c1adb612e0cf1093ecb8276d2e64f36e9d691fd3a5d3a24ac4e7e3`; `git status --porcelain` lists exactly these six as changed and nothing as new: the three files of the table in "Current state" and `outputs/wa-replica-prototype/app.css`, `tokens.css`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the `:root` block's key values, in the source and in the built style sheet.
- **Smoke** (`/tmp/wa-scrm-plan-082/smoke.sh`) — the block, the shell and control rules, the validator's entry and the build log, no new size token, which built files changed, the five test files.
- **Verified by the reviewer, not by you**: screenshots of the main views at 1366×768 and 1920×1080 against the reviewer's harness, compared with those before this plan; contrast of the new greys and the accent; the site and WhatsApp suites; deliberate faults.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout e9fa90a -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test` → `tests 90`, `pass 90`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-082/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `153af05ba65203b2db1bfcc31218a8f4f382d96987b093cbab81ae75708e3d5f`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `7c6dec939f22f0831b6a641d127cc5284ac19b1a60672af7400d5ef80c0c5e3e`
- [ ] `sha256sum replica/build-log.md` → `c533bb3276c1adb612e0cf1093ecb8276d2e64f36e9d691fd3a5d3a24ac4e7e3`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `c3da6bfe57536ff1f0d1309d2f2a7968b9364ff7d74bd0e2f2e2de2ffec2d729`
- [ ] `sha256sum outputs/wa-replica-prototype/tokens.css` → `ae68ee7305fba57e8ca73b6ce80783c312b94d9a833d9e84be89baa0637b7c87`
- [ ] `bash -c "comm -13 <(git show e9fa90a:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u)"` prints nothing
- [ ] `git diff --name-only e9fa90a..HEAD -- outputs` lists `app.css`, `tokens.css` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only e9fa90a..HEAD -- . ':!plans'` lists exactly six paths: the three of the table in "Current state", `app.css`, `tokens.css` and `validation.json`
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

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else. An open page keeps the old colours until it is opened again.
- **Colours live in one place**: a colour of the upgrade changes in the `:root` block only; the build's palette in `build-fidelity.cjs` stays underneath and must not be edited (it is not in the upgrade's list of files). `--fid-gradient` keeps its name but is plain teal now (both its colours are the accent).
- **Lengths**: a new rule uses only lengths that already exist as size tokens; check the names (`comm -13 <(git show e9fa90a:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u)` must print nothing), not the bytes of `tokens.css`, whose order follows the first use of each length.
- Plans 083–087 use the four new names (`--fid-sky`, `--fid-sky-bg`, `--fid-rose-bg`, `--fid-ease`) for the follow-up states and motion.
- What a reviewer should scrutinise: contrast of text on the new greys and the accent; that nothing in the shell moved in height (the page-tab row stays 51 px, dialogs are placed below it); that the base's own pages (dialogs, toasts) follow the new colours.
- `validation.json`: re-run the validator once in the main checkout after merging.
