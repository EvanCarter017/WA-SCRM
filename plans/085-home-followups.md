# Plan 085: 首页 and 跟进闭环 on the closed scale; a dialog's footer stays in view

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 15407c0..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (three style sheets only; no markup, no script; exact text and checksums for every file)
- **Depends on**: plans/084-dialogs-profile.md (DONE; it set the dialog footer this plan makes stay in view)
- **Category**: owner decision of 2026-11-26 — the UI upgrade, Pass B (its first plan), and the stress check the upgrade brief asks for after Pass A
- **Planned at**: commit `15407c0`, 2026-11-26

## Why this matters

Pass B of the upgrade brief starts with 首页 (home: `#dashboard`) and 跟进闭环 (the follow-up centre: `#followups`): KPI figures and queues on a balanced grid with aligned figures, follow-up urgency in its tints, consistent tables and states. On the current build (the reviewer's screenshots, 2026-11-26):

- The follow-up signals still had the old colours: on the home page 客户待回复 (awaiting reply) amber and 跟进已逾期 (overdue) rose; on the follow-up centre 已逾期必处理 rose — while since plan 083 the chips in the chat and the lists show overdue amber, re-contact rose and awaiting reply sky.
- Every row of the to-do list ends in a solid 完成并闭环 button: a column of eight equal primary buttons (the design review of 2026-11-26 counted them as its hierarchy problem).
- The home page used 28, 17, 13 and 11 px text and a radius of 14.

The stress check that the brief asks for after Pass A (2026-11-26: 800-character bilingual messages, a very long name and privacy id, 50 products in 确认报价, an empty conversation, at 1366×768 and 1920×1080) found no overflow anywhere, but with 50 products the dialog scrolls as a whole and its buttons (返回列表, 放入消息框, 取 消) come into view only at its end.

Shown in a browser (the reviewer's harness, 2026-11-26, this plan's change): 确认报价 with 50 products keeps its buttons at the dialog's bottom while the products scroll; the home page with 客户待回复 sky, 跟进已逾期 amber, its title at 24 px; the follow-up centre with 已逾期必处理 amber and a tinted 完成并闭环 in every row (solid on hover).

### Decisions already made (do not re-open; do not ask)

- A dialog's footer (`.fid-dialog .modal-footer`) is sticky at the bottom of the dialog, above its content, with a hairline on top — for every dialog made with `fidDialog`.
- The follow-up signals (`.lc-radar-chip`): `is-alert` (only awaiting reply) sky; `is-hot` (overdue, and re-contact on the home page) amber; `is-hot[data-id="recontact"]` rose. The chips: 32 px high, pill-shaped, 12 px counts.
- The to-do list's 完成并闭环 (`.lc-todo-table .fid-btn.blue`): the accent's soft tint with the accent's text; solid on hover. The follow-up centre's tabs (`.lc-subtab`) 14 px, radius 8, counts 12 px.
- The home page (`fidelity-dashboard.css`): radius 12; title 24 px bold (20 px below 480 px), subtitle 14 px; the figures' labels 14 px, their units 16 px, the figures 24 px below 480 px; row titles 14 px; status labels 12 px with radius 4; the unread count a 20 px pill with 12 px figures; empty states 14 px. No 11 or 13 px text is left there.
- Not changed: markup and scripts; what any button does; tables' alignment and sticky headers (plan 086); other pages.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity.css` | `3e374a00e7c5dd41e4077db995f19b01cec401000334e3fa88613adf5ecc5c15` | `e533a210ee03a91414133f5f1104720cc86de95bd2bf8104372c1d6e66dddd86` | 1 |
| `work/wa-replica/fidelity-dashboard.css` | `8f9667bc4bffa3d504bbfd95183b7c80043cf7f0094e768a361ff940ed28e895` | `608f4a5f5747d04426a9b9ecb69deb57902c6076dcc56c7c09961b7d9b758676` | 9 |
| `work/wa-replica/fidelity-lifecycle.css` | `96df305ed11486d4f86852e68ecee5ce94441a94213fd1c2c5e09077f1a7e142` | `b742318aee46d72c5c3182cfa55ba0fc16ab46bfb20431af17400ac2fd66e2b9` | 5 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `166b4cd6739b9b83a1862c0ddb5a9a86862452e01761a7b5c4d45229705820f5` | `93c7c188cddccc097294ad78e5198b01567f4bbceb1bf00bc8103060ad939a40` | 2 |
| `replica/build-log.md` | `e142e047f888a61de34999217acc112fe56a7e825b43541d0448669cce69c526` | `9a1189bdf381649a9d276b1e1cf8efabcc6aa2563d638cddbac1d4aac9358acb` | 1 append |

- `fidelity.css` — the page's own style sheet, built into `outputs/wa-replica-prototype/app.css`: the dialog frame (`.fidelity .fid-dialog .modal-…`) in its middle.
- `fidelity-dashboard.css` — the home page's style sheet (appended to `app.css` too): `.dash…`.
- `fidelity-lifecycle.css` — the follow-up module's style sheet: the signals (`.lc-radar-chip…`) and the follow-up centre's tabs (`.lc-subtab…`).
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). It turns every `px` value of the fidelity style sheets into a size token in `tokens.css`, listed in the order of first use. After this plan's build exactly these output files differ: `app.css`, `tokens.css` (no new token; their order may change) and `validation.json` (written by the validator).

## Commands you will need

Run from the repository root of **your working copy** (the clone you were given — never any other checkout).

**The tests and the smoke script need Node 22.13 or newer** (the server's accounts and data use `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 15407c0 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| All tests | `$NODE --test` | `tests 90`, `pass 90`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-085/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity.css`, `work/wa-replica/fidelity-dashboard.css`, `work/wa-replica/fidelity-lifecycle.css` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.css`, `tokens.css`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — every script (`fidelity-*.js`), `fidelity-index.html`, `build-fidelity.cjs`, the base app, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your working copy is already on (`advisor/085-home-followups`). If (and only if) you find yourself on `main`, create and switch to `advisor/085-home-followups` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): home and follow-ups on the closed scale; a dialog's footer stays in view`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, very long lines, quotes and backslashes; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 17 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums in "Current state" tell you whether every file is exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-085/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-085 && cat > /tmp/wa-scrm-plan-085/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 085: 首页 and 跟进闭环 on the closed scale — the signals' tints, the tinted 完成并闭环, the home page's
# sizes — and a dialog's footer that stays in view. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'a dialog footer stays in view' "$W/fidelity.css" 'position:sticky; bottom:0; z-index:1; box-shadow:0 -1px 0 var(--fid-frame); }'
has 'awaiting a reply in sky' "$W/fidelity-lifecycle.css" '  border-color: color-mix(in srgb, var(--fid-sky) 30%, var(--fid-frame));'
has 're-contact in rose' "$W/fidelity-lifecycle.css" '.lc-radar-chip.is-hot[data-id="recontact"]:not([aria-pressed="true"]) {'
has 'a tinted 完成并闭环 in the to-do list' "$W/fidelity-lifecycle.css" '.lc-todo-table .fid-btn.blue:not(:disabled) {'
same 'the follow-up tabs at 14px' "$(grep -A11 '^.lc-subtab {' "$W/fidelity-lifecycle.css" | grep -c '  font-size: 14px;')" 1
has 'the home page radius 12' "$W/fidelity-dashboard.css" '  --dash-radius: 12px;'
has 'the home page title 24px' "$W/fidelity-dashboard.css" '.dash-header h1 { margin: 0; font-size: 24px;'
same 'no 11 or 13 px text on the home page' "$(grep -cE 'font-size: 1[13]px' "$W/fidelity-dashboard.css")" 0
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  homeAndFollowups: '首页 and 跟进闭环 on the closed scale (plan 085)"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 首页与跟进闭环 · 2026-11-26'
has 'the built style sheet has the sticky footer' "$O/app.css" 'position:sticky; bottom:0; z-index:1;'
same 'no new size token (the scale only closes)' "$(cd "$ROOT" && comm -13 <(git show 15407c0:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u) | wc -l)" 0
same 'of the built files only the style sheet, its size tokens and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.css|tokens\.css|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the price file pass' "$("$NODE" --test "$W/price-file.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the provisioner pass' "$("$NODE" --test "$W/site-provisioner.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 13 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-085/smoke.sh && ls -l /tmp/wa-scrm-plan-085/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity.css work/wa-replica/fidelity-dashboard.css work/wa-replica/fidelity-lifecycle.css work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the first table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-085/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `a dialog footer stays in view`, `awaiting a reply in sky`, `re-contact in rose`, `a tinted 完成并闭环 in the to-do list`, `the follow-up tabs at 14px` (got: 0), `the home page radius 12`, `the home page title 24px`, `no 11 or 13 px text on the home page` (got: 7), `the validator knows it`, `the build log has the entry`, `the built style sheet has the sticky footer`; every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The dialog footer, the home page and the follow-up centre

#### `fidelity.css`

**Edit 2.1** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fidelity .fid-dialog .modal-body { padding:8px 20px 16px; }
.fidelity .fid-dialog .modal-footer { padding:12px 20px 20px; gap:8px; border:0; justify-content:flex-end; background:var(--color-surface); }
.fidelity .fid-dialog .modal-footer .fid-btn { min-width:70px; }
```

Replace them with:

```text
.fidelity .fid-dialog .modal-body { padding:8px 20px 16px; }
.fidelity .fid-dialog .modal-footer { padding:12px 20px 20px; gap:8px; border:0; justify-content:flex-end; background:var(--color-surface); position:sticky; bottom:0; z-index:1; box-shadow:0 -1px 0 var(--fid-frame); }
.fidelity .fid-dialog .modal-footer .fid-btn { min-width:70px; }
```

#### `fidelity-dashboard.css`

**Edit 2.2** — `work/wa-replica/fidelity-dashboard.css`. Find exactly these lines (they occur once):

```text
  --dash-line: var(--fid-frame);
  --dash-radius: 14px;
  padding: 25px 28px 36px;
```

Replace them with:

```text
  --dash-line: var(--fid-frame);
  --dash-radius: 12px;
  padding: 25px 28px 36px;
```

**Edit 2.3** — `work/wa-replica/fidelity-dashboard.css`. Find exactly these lines (they occur once):

```text
}
.dash-header h1 { margin: 0; font-size: 28px; font-weight: 750; line-height: 1.23; text-wrap: balance; }
.dash-header p { margin: 5px 0 0; color: var(--dash-muted); font-size: 13px; }
.dash-header-actions { display: flex; flex-wrap: wrap; gap: 8px; }
```

Replace them with:

```text
}
.dash-header h1 { margin: 0; font-size: 24px; font-weight: 700; line-height: 1.25; text-wrap: balance; }
.dash-header p { margin: 4px 0 0; color: var(--dash-muted); font-size: 14px; }
.dash-header-actions { display: flex; flex-wrap: wrap; gap: 8px; }
```

**Edit 2.4** — `work/wa-replica/fidelity-dashboard.css`. Find exactly these lines (they occur once):

```text
.dash-metric.is-unread:hover { background: color-mix(in srgb,var(--dash-accent-soft) 92%,var(--dash-accent)); }
.dash-metric-label { width: 100%; display: flex; gap: 7px; align-items: center; font-size: 13px; font-weight: 650; }
.dash-metric-icon { display: grid; place-items: center; color: inherit; }
```

Replace them with:

```text
.dash-metric.is-unread:hover { background: color-mix(in srgb,var(--dash-accent-soft) 92%,var(--dash-accent)); }
.dash-metric-label { width: 100%; display: flex; gap: 8px; align-items: center; font-size: 14px; font-weight: 650; }
.dash-metric-icon { display: grid; place-items: center; color: inherit; }
```

**Edit 2.5** — `work/wa-replica/fidelity-dashboard.css`. Find exactly these lines (they occur once):

```text
.dash-metric-value { font-size: 32px; font-weight: 750; font-variant-numeric: tabular-nums; line-height: 1.18; }
.dash-metric-value span { font-size: 17px; color: var(--dash-muted); font-weight: 500; }
.dash-metric small { font-size: 12px; color: var(--dash-muted); }
```

Replace them with:

```text
.dash-metric-value { font-size: 32px; font-weight: 750; font-variant-numeric: tabular-nums; line-height: 1.18; }
.dash-metric-value span { font-size: 16px; color: var(--dash-muted); font-weight: 500; }
.dash-metric small { font-size: 12px; color: var(--dash-muted); }
```

**Edit 2.6** — `work/wa-replica/fidelity-dashboard.css`. Find exactly these lines (they occur once):

```text
}
.dash-row-copy strong { font-size: 13px; line-height: 1.45; font-weight: 680; }
.dash-task-row .dash-row-copy strong { white-space: normal; overflow-wrap: anywhere; }
```

Replace them with:

```text
}
.dash-row-copy strong { font-size: 14px; line-height: 1.45; font-weight: 680; }
.dash-task-row .dash-row-copy strong { white-space: normal; overflow-wrap: anywhere; }
```

**Edit 2.7** — `work/wa-replica/fidelity-dashboard.css`. Find exactly these lines (they occur once):

```text
  gap: 5px;
  padding: 3px 7px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 650;
```

Replace them with:

```text
  gap: 5px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 650;
```

**Edit 2.8** — `work/wa-replica/fidelity-dashboard.css`. Find exactly these lines (they occur once):

```text
.dash-unread-row .avatar { flex: none; }
.dash-unread-meta { display: grid; justify-items: end; gap: 3px; white-space: nowrap; font-size: 11px; color: var(--dash-muted); font-variant-numeric: tabular-nums; }
.dash-unread-count { display: grid; place-items: center; min-width: 19px; height: 19px; padding-inline: 4px; border-radius: 7px; background: var(--dash-accent-soft); color: var(--dash-accent); font-size: 11px; }
.dash-sources { display: grid; gap: 10px; padding-bottom: 15px; }
```

Replace them with:

```text
.dash-unread-row .avatar { flex: none; }
.dash-unread-meta { display: grid; justify-items: end; gap: 4px; white-space: nowrap; font-size: 12px; color: var(--dash-muted); font-variant-numeric: tabular-nums; }
.dash-unread-count { display: grid; place-items: center; min-width: 20px; height: 20px; padding-inline: 6px; border-radius: 999px; background: var(--dash-accent-soft); color: var(--dash-accent); font-size: 12px; }
.dash-sources { display: grid; gap: 10px; padding-bottom: 15px; }
```

**Edit 2.9** — `work/wa-replica/fidelity-dashboard.css`. Find exactly these lines (they occur once):

```text
.dash-source-row:not(:first-child) .dash-source-bar>span { background: color-mix(in srgb,var(--dash-accent) 53%,var(--dash-surface)); }
.dash-empty { min-height: 130px; display: grid; align-content: center; justify-items: center; gap: 6px; padding: 12px 16px; color: var(--dash-muted); text-align: center; font-size: 13px; }
.dash-empty .icon { width: 22px; height: 22px; }
```

Replace them with:

```text
.dash-source-row:not(:first-child) .dash-source-bar>span { background: color-mix(in srgb,var(--dash-accent) 53%,var(--dash-surface)); }
.dash-empty { min-height: 130px; display: grid; align-content: center; justify-items: center; gap: 6px; padding: 12px 16px; color: var(--dash-muted); text-align: center; font-size: 14px; }
.dash-empty .icon { width: 22px; height: 22px; }
```

**Edit 2.10** — `work/wa-replica/fidelity-dashboard.css`. Find exactly these lines (they occur once):

```text
  .dash-header { margin-bottom: 15px; }
  .dash-header h1 { font-size: 23px; }
  .dash-header-actions .fid-btn { min-height: 44px; }
  .dash-metric { padding: 11px 10px; min-height: 96px; }
  .dash-metric-value { font-size: 27px; }
  .dash-panel-head { padding-inline: 12px; }
```

Replace them with:

```text
  .dash-header { margin-bottom: 15px; }
  .dash-header h1 { font-size: 20px; }
  .dash-header-actions .fid-btn { min-height: 44px; }
  .dash-metric { padding: 11px 10px; min-height: 96px; }
  .dash-metric-value { font-size: 24px; }
  .dash-panel-head { padding-inline: 12px; }
```

#### `fidelity-lifecycle.css`

**Edit 2.11** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
  align-items: center;
  gap: 5px;
  min-height: 31px;
  padding: 0 10px;
  border: 1px solid var(--fid-frame);
  border-radius: 18px;
  background: var(--color-surface-alt);
```

Replace them with:

```text
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--fid-frame);
  border-radius: 999px;
  background: var(--color-surface-alt);
```

**Edit 2.12** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
  font-variant-numeric: tabular-nums;
  padding: 0 5px;
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.06);
  font-size: 11px;
}
```

Replace them with:

```text
  font-variant-numeric: tabular-nums;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  font-size: 12px;
}
```

**Edit 2.13** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
}
.lc-radar-chip.is-alert:not([aria-pressed="true"]) {
  border-color: color-mix(in srgb, var(--fid-amber) 38%, var(--fid-frame));
  background: color-mix(in srgb, var(--fid-amber) 7%, var(--color-surface));
  color: var(--fid-amber);
}
.lc-radar-chip.is-hot:not([aria-pressed="true"]) {
  border-color: color-mix(in srgb, var(--color-danger) 35%, var(--fid-frame));
  background: color-mix(in srgb, var(--color-danger) 7%, var(--color-surface));
  color: var(--color-danger);
```

Replace them with:

```text
}
/* The follow-up signals in the tints of their states (plan 085): awaiting the customer's reply ("alert") sky, overdue
   ("hot") amber, re-contact ("hot", data-id recontact) rose — as the chips in the chat and the lists (plan 083). */
.lc-radar-chip.is-alert:not([aria-pressed="true"]) {
  border-color: color-mix(in srgb, var(--fid-sky) 30%, var(--fid-frame));
  background: var(--fid-sky-bg);
  color: var(--fid-sky);
}
.lc-radar-chip.is-hot:not([aria-pressed="true"]) {
  border-color: color-mix(in srgb, var(--fid-amber) 35%, var(--fid-frame));
  background: var(--color-warning-soft);
  color: var(--fid-amber);
}
.lc-radar-chip.is-hot[data-id="recontact"]:not([aria-pressed="true"]) {
  border-color: color-mix(in srgb, var(--color-danger) 30%, var(--fid-frame));
  background: var(--fid-rose-bg);
  color: var(--color-danger);
```

**Edit 2.14** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--fid-frame);
  border-radius: 9px;
  background: var(--color-surface);
  color: var(--fid-ink);
  font-size: 13px;
  font-weight: 600;
```

Replace them with:

```text
  min-height: 36px;
  padding: 0 16px;
  border: 1px solid var(--fid-frame);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--fid-ink);
  font-size: 14px;
  font-weight: 600;
```

**Edit 2.15** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
.lc-subtab b {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.07);
}
```

Replace them with:

```text
.lc-subtab b {
  font-size: 12px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.07);
}
/* One 完成并闭环 per row of the to-do list: tinted, so that the list is not a column of solid buttons (plan 085). */
.lc-todo-table .fid-btn.blue:not(:disabled) {
  background: var(--color-accent-soft);
  border-color: color-mix(in srgb, var(--color-accent) 30%, var(--fid-frame));
  color: var(--color-accent);
}
.lc-todo-table .fid-btn.blue:hover:not(:disabled) {
  background: var(--color-accent);
  color: var(--color-on-accent);
}
```

What these edits do, so that you can recognise them: in `fidelity.css` the dialog footer's rule gains its sticky place; in `fidelity-dashboard.css` the radius, the header, the figures' labels and units, the row titles, the status labels, the unread count, the empty state and the narrow-screen sizes; in `fidelity-lifecycle.css` the signal chips' size, their counts, their tints with a comment and the re-contact rule, the tabs and their counts, and the tinted 完成并闭环 with a comment.

**Verify**: `sha256sum work/wa-replica/fidelity.css work/wa-replica/fidelity-dashboard.css work/wa-replica/fidelity-lifecycle.css` → `e533a210ee03a91414133f5f1104720cc86de95bd2bf8104372c1d6e66dddd86`, `608f4a5f5747d04426a9b9ecb69deb57902c6076dcc56c7c09961b7d9b758676`, `b742318aee46d72c5c3182cfa55ba0fc16ab46bfb20431af17400ac2fd66e2b9`. If a checksum does not match, restore the file (`git checkout -- <file>`) and apply its edits again, once; if it still does not match, STOP.

### Step 3: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(lifecycleCss.includes('.lc-card-block.hot-block {\n  border-color: color-mix(in srgb, var(--fid-amber) 35%, var(--fid-frame));\n  background: var(--color-warning-soft);\n}'), 'an overdue to-do must be amber like the overdue follow-ups');
const summary = {
```

Replace them with:

```text
assert(lifecycleCss.includes('.lc-card-block.hot-block {\n  border-color: color-mix(in srgb, var(--fid-amber) 35%, var(--fid-frame));\n  background: var(--color-warning-soft);\n}'), 'an overdue to-do must be amber like the overdue follow-ups');
// 首页 and 跟进闭环 on the closed scale (plan 085): the follow-up signals in the tints of their states (awaiting reply
// sky, overdue amber, re-contact rose by data-id), a tinted 完成并闭环 in the rows of the to-do list, the home page's
// title 24 px and labels 14 px; and a dialog's footer stays in view while a long dialog scrolls (a stress check of
// 确认报价 with 50 products).
const dashCss = read(path.join(__dirname, 'fidelity-dashboard.css'));
for (const required of ['.lc-radar-chip.is-hot[data-id="recontact"]:not([aria-pressed="true"]) {', '  background: var(--fid-sky-bg);\n  color: var(--fid-sky);\n}', '.lc-todo-table .fid-btn.blue:not(:disabled) {']) {
  assert(lifecycleCss.includes(required), `fidelity-lifecycle.css is missing ${required}`);
}
for (const required of ['  --dash-radius: 12px;', '.dash-header h1 { margin: 0; font-size: 24px;', '.dash-metric-label { width: 100%; display: flex; gap: 8px; align-items: center; font-size: 14px;']) {
  assert(dashCss.includes(required), `fidelity-dashboard.css is missing ${required}`);
}
assert(pageCss.includes('background:var(--color-surface); position:sticky; bottom:0; z-index:1; box-shadow:0 -1px 0 var(--fid-frame); }'), 'a dialog\'s footer must stay in view while a long dialog scrolls');
assert(!/font-size: 1[13]px/.test(dashCss), 'the home page uses the closed scale of text sizes (no 11 or 13 px)');
const summary = {
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  quotePicks: 'the quote dialog (报价): a box on the left ticks a product, the ticks stay while the search changes; 确认 opens 确认报价 with the ticked products in the order ticked — quantity (whole, at least 1), unit price (and price column), amount, total — where a product can be deleted and 返回列表 goes back; 放入消息框 puts one line per product ("Product Alpha PRDA01: $40 x 10 = $400") and "Total: $440"; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
  dialogsAndProfile: 'dialogs, the quote dialog and the 360° profile on the closed scale (plan 084): radius 12 with a slate backdrop that starts below the header on the chat page; the quote list\'s rows a target for their boxes, the count a badge, the confirm window\'s figures on the right; the profile\'s tabs, labels and fields at 12–14 px on an 8 px grid, an overdue to-do amber',
```

Replace them with:

```text
  quotePicks: 'the quote dialog (报价): a box on the left ticks a product, the ticks stay while the search changes; 确认 opens 确认报价 with the ticked products in the order ticked — quantity (whole, at least 1), unit price (and price column), amount, total — where a product can be deleted and 返回列表 goes back; 放入消息框 puts one line per product ("Product Alpha PRDA01: $40 x 10 = $400") and "Total: $440"; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
  homeAndFollowups: '首页 and 跟进闭环 on the closed scale (plan 085): the follow-up signals in the tints of their states (awaiting reply sky, overdue amber, re-contact rose), a tinted 完成并闭环 in the to-do list, the home page\'s title 24 px and labels 14 px; a dialog\'s footer stays in view while a long dialog scrolls',
  dialogsAndProfile: 'dialogs, the quote dialog and the 360° profile on the closed scale (plan 084): radius 12 with a slate backdrop that starts below the header on the chat page; the quote list\'s rows a target for their boxes, the count a badge, the confirm window\'s figures on the right; the profile\'s tabs, labels and fields at 12–14 px on an 8 px grid, an overdue to-do amber',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `93c7c188cddccc097294ad78e5198b01567f4bbceb1bf00bc8103060ad939a40`; `git checkout 15407c0 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.css`, `tokens.css` and `validation.json` of `outputs/wa-replica-prototype/` only; `bash -c "comm -13 <(git show 15407c0:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u)"` prints **nothing** (no new size token); `sha256sum outputs/wa-replica-prototype/app.css outputs/wa-replica-prototype/tokens.css` → `034a8796c45c2ede4123a3be4b5301fff48005e7627f95fbe95ebd8996a06df6`, `fe3ff4940142e2c87c726c2414abf675e377e778fac91b5a7f5a6cc589c30838`; `$NODE --test` → `tests 90`, `pass 90`, `fail 0`. If a checksum does not match, restore the file and apply its edits again, once; if it still does not match, a new size token appears, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 首页与跟进闭环 · 2026-11-26

界面升级第二阶段第一步：

- **首页**：标题 24 像素，概要卡片的说明 14 像素，圆角 12 像素；「待处理信号」中客户待回复为浅蓝色，跟进已逾期为琥珀色，复联待处理为玫红色（与聊天页面一致）。
- **跟进闭环**：「已逾期必处理」为琥珀色；待办列表每行的「完成并闭环」改为浅青色按钮（鼠标停留时变为实色），不再一整列都是实色按钮；标签页文字 14 像素。
- **对话框**：内容很长时（例如确认报价中有 50 个产品），底部的按钮固定在对话框底部，滚动内容时始终可见。

验证：构建与校验脚本通过；没有新增尺寸标记；浏览器测试：确认报价 50 个产品时底部按钮可见；首页与跟进闭环的截图。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout 15407c0 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-085/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `9a1189bdf381649a9d276b1e1cf8efabcc6aa2563d638cddbac1d4aac9358acb`; `git status --porcelain` lists exactly these eight as changed and nothing as new: the five files of the table in "Current state" and `outputs/wa-replica-prototype/app.css`, `tokens.css`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the signals' tints, the tinted 完成并闭环, the home page's radius, title and labels, no 11 or 13 px text on the home page, the sticky dialog footer.
- **Smoke** (`/tmp/wa-scrm-plan-085/smoke.sh`) — the same facts and the tabs' size, the validator's entry and the build log, the built footer rule, no new size token, which built files changed, the five test files.
- **Verified by the reviewer, not by you**: the stress check again (确认报价 with 50 products keeps its buttons in view); screenshots of 首页 and 跟进闭环; the site and WhatsApp suites; deliberate faults.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 15407c0 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test` → `tests 90`, `pass 90`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-085/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `e533a210ee03a91414133f5f1104720cc86de95bd2bf8104372c1d6e66dddd86`
- [ ] `sha256sum work/wa-replica/fidelity-dashboard.css` → `608f4a5f5747d04426a9b9ecb69deb57902c6076dcc56c7c09961b7d9b758676`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.css` → `b742318aee46d72c5c3182cfa55ba0fc16ab46bfb20431af17400ac2fd66e2b9`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `93c7c188cddccc097294ad78e5198b01567f4bbceb1bf00bc8103060ad939a40`
- [ ] `sha256sum replica/build-log.md` → `9a1189bdf381649a9d276b1e1cf8efabcc6aa2563d638cddbac1d4aac9358acb`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `034a8796c45c2ede4123a3be4b5301fff48005e7627f95fbe95ebd8996a06df6`
- [ ] `sha256sum outputs/wa-replica-prototype/tokens.css` → `fe3ff4940142e2c87c726c2414abf675e377e778fac91b5a7f5a6cc589c30838`
- [ ] `bash -c "comm -13 <(git show 15407c0:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u)"` prints nothing
- [ ] `git diff --name-only 15407c0..HEAD -- outputs` lists `app.css`, `tokens.css` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only 15407c0..HEAD -- . ':!plans'` lists exactly eight paths: the five of the table in "Current state", `app.css`, `tokens.css` and `validation.json`
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
- **A new signal chip** takes its tint by its class (`is-alert` sky, `is-hot` amber) and, for re-contact, by `data-id="recontact"`; keep the classes when adding one.
- **The sticky footer** covers the end of a dialog's content: a dialog that puts something below its footer would hide it — none does.
- What a reviewer should scrutinise: the footer of every dialog (follow-up, tags, quote, confirm, the supervisor's are not `fidDialog` and keep theirs); the home page at 390 px wide; the follow-up centre with a done to-do (the button disabled).
- `validation.json`: re-run the validator once in the main checkout after merging.
