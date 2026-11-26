# Plan 083: The chat page gives the conversation its room; calm bubbles; the follow-up states in their own tints

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 21a97aa..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM (the layout of the chat page changes — the row of page tabs is hidden there and the layout fills the page; style rules of the conversation, the strip and the follow-up chips; three small markup additions; exact text and checksums for every file)
- **Depends on**: plans/082-colour-world.md (DONE; it declared the tints `--fid-sky`, `--fid-sky-bg`, `--fid-rose-bg` this plan uses)
- **Category**: owner decisions of 2026-11-26 — the UI upgrade, Pass A, and, in a question dialog, "Hide on chat page" for the row of page tabs
- **Planned at**: commit `21a97aa`, 2026-11-26

## Why this matters

The design review of 2026-11-26 found the conversation getting a quarter of a laptop's screen: at 1366×768 the messages had 189 px of 768 (measured), below the top bar, the row of page tabs (51 px), the 号码管理/在线聊天 toggle (44), the chat's heading (65), the number row (38), a follow-up strip wrapping to two lines (74), the source row (45) — and one translated message filled the view. Asked in a question dialog whether the row of page tabs should be hidden on the chat page only, the owner chose **"Hide on chat page"** (the sidebar opens every page; other pages keep the row). The upgrade brief also asks for white incoming bubbles with a hairline, close messages of one side, translations and transcripts as recessed parts with a small label, a send preview that reads easily, and follow-up states in their own tints: overdue amber (#b45309 on #fffbeb), re-contact rose (#be123c on #fff1f2), awaiting the customer's reply sky (#0369a1 on #f0f9ff).

Shown in a browser (the reviewer's harness, 2026-11-26, this plan's change; heights in px):

| Screen | tabs | toggle | heading | number | strip | source | messages | composer |
|---|---|---|---|---|---|---|---|---|
| 1366×768 before | 51 | 44 | 65 | 38 | 74 | 45 | 189 (25%) | 152 |
| 1366×768 after | 0 | 38 | 56 | 32 | 41 | 37 | **336 (44%)** | 138 |
| 1920×1080 after | 0 | 38 | 56 | 32 | 41 | 37 | **648 (60%)** (534 before) | 138 |
| 390×844 after | 0 | 38 | 56 | 32 | 106 | 37 | **321 (38%)** (202 before) | 166 |

The strip kept to one line at 1366 with its four buttons as icons carrying their names as tooltips; a dialog opened below the header; the five follow-up states drew in their tints (overdue rgb(180, 83, 9) on rgb(255, 251, 235), re-contact rgb(190, 18, 60) on rgb(255, 241, 242), awaiting reply rgb(3, 105, 161) on rgb(240, 249, 255), healthy rgb(4, 120, 87), ended rgb(51, 65, 85)); the site suite passed 75 of 76 (the paging test's fixture date has passed, as before) and the WhatsApp suite 34 of 34.

### Decisions already made (do not re-open; do not ask)

- No row of page tabs on the chat page: `.fidelity:has(#view .inbox-page) #workspace-tabs { display:none; }`, and dialogs, which are placed below the header and the row (`--fid-top`, 107 px), below the header only there (56 px). Every other page keeps the row.
- The layout fills the page: `.inbox-page` is already a column the height of the page, so `.inbox-layout` takes `flex:1; height:auto` instead of `calc(100dvh - 203px)` (and `- 178px` on narrow screens) — no length depends on the rows above it any more.
- Compact rows: the page's padding 12/24, the toggle 32 px high (radius 6 inside 8, no shadow), the heading at least 56 px, the number row at least 32 px, the strip on one line (padding 6/16, gap 8, its buttons and selects 28 px, 12 px text), the source row at least 36 px with a 28 px language select, the composer's padding 8 and its text box at least 40 px. The paddings at the sides keep the base's values for every screen width.
- The strip's four buttons (安排跟进 or 重新跟进, 设置标签, 移入聊天记录, 360° 档案) carry their names as `title`; below 1600 px they show their icons only (`font-size:0`, 28 px square — the names stay in the buttons for screen readers). The tag row in the strip gives way first (`flex:1 1 0; min-width:0`).
- Bubbles: padding 8/12, radius 12 with a 4 px corner on the sender's side, a hairline border; messages of one side 4 px apart, others 16; message text with line height 1.5. Translations and transcripts (`.message-translation`) 14 px, line height 1.5, ink colour, under a hairline; their label (`.translation-label`) muted. The time and ticks (`.message-meta`) muted, with figures of one width. Text size of messages stays 14 px.
- The send preview (`.translation-preview`): the sky tint, 14 px, radius 8.
- The chat list: rows at least 64 px with padding 8/12; the open conversation a light teal (8%); a pinned conversation (it has `.conversation-pin`) the rail's grey.
- Follow-up states: re-contact and overdue are both tone `hot` in `lcHealth`, and the validator pins the class text of the strip's chip (`class="lc-pill lc-pill-link ${h.primary.tone}" data-action="lcTrackFollow"`), so the three chips (strip, follow-up centre, customer list) get `data-state="${h.primary.key}"` after that text; `.lc-pill.hot` is amber, `.lc-pill.hot[data-state="recontact"]` rose, `.lc-pill.warn` (awaiting a reply) sky. The chips' text 12 px, radius 4.
- Not changed: what any button does, every Chinese text, the base, the other pages (Pass B), the drawer and the dialogs (plan 084), the counters of the home page (plan 085).

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity.css` | `153af05ba65203b2db1bfcc31218a8f4f382d96987b093cbab81ae75708e3d5f` | `760709c16e178fc2a2f14d4864c269ae975e63d41934d97b6c18b4e6d515d47b` | 6 |
| `work/wa-replica/fidelity-lifecycle.css` | `6ae2bc59c39f4dfdd5736249c753531adaf4a66b013d8abdd24e0c2ee44b4ab4` | `5192a2bde63701f603319444730e68707f0597afabe7b5de29ee375290d77685` | 7 |
| `work/wa-replica/fidelity-lifecycle.js` | `21f02ae947a0352cf46c5c9df6e3a52e260a4b2374935fbd69dccac02dbf5764` | `07cf07174f5631343096d1699cb78be75bea0f08ef4632a3dbfb132f90664e38` | 4 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `7c6dec939f22f0831b6a641d127cc5284ac19b1a60672af7400d5ef80c0c5e3e` | `026c06e7f0e39baf8d0bfbe3b019a0eef1e954e0aa52fcdbf39d3e6969df5ded` | 2 |
| `replica/build-log.md` | `c533bb3276c1adb612e0cf1093ecb8276d2e64f36e9d691fd3a5d3a24ac4e7e3` | `1c9a0945c98c004c811767c122ebc118e9039c783c6db15ab20389d3ae9ca3b3` | 1 append |

- `fidelity.css` — the page's own style sheet, built into `outputs/wa-replica-prototype/app.css`; the chat page's rules (`.fid-wa…`, `.openwa-chat-status`) are in its middle, the narrow-screen rules in `@media(max-width:760px)`.
- `fidelity-lifecycle.css` — the follow-up module's style sheet (appended to `app.css` too): `.lc-pill` and its tones, the chat strip (`.lc-chat-strip…`), the inline selects (`.lc-inline-select`).
- `fidelity-lifecycle.js` — the follow-up module: `lcHealth` (the states), the follow-up centre's and the customer list's rows, and `chatHTML` with the strip.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). It turns every `px` value of the fidelity style sheets into a size token in `tokens.css`, listed in the order of first use. After this plan's build exactly these output files differ: `app.js`, `app.css`, `tokens.css` (no new token; their order may change) and `validation.json` (written by the validator).

## Commands you will need

Run from the repository root of **your working copy** (the clone you were given — never any other checkout).

**The tests and the smoke script need Node 22.13 or newer** (the server's accounts and data use `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 21a97aa -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| All tests | `$NODE --test` | `tests 90`, `pass 90`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-083/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity.css`, `work/wa-replica/fidelity-lifecycle.css`, `work/wa-replica/fidelity-lifecycle.js` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.js`, `app.css`, `tokens.css`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — `fidelity-dashboard.css`, `fidelity-index.html`, every other script, `build-fidelity.cjs`, the base app, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your working copy is already on (`advisor/083-chat-room`). If (and only if) you find yourself on `main`, create and switch to `advisor/083-chat-room` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): give the conversation its room; calm bubbles; tints for the follow-up states`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, very long lines, quotes and backslashes; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 19 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums in "Current state" tell you whether every file is exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-083/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-083 && cat > /tmp/wa-scrm-plan-083/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 083: the chat page gives the conversation its room (no row of page tabs there, compact rows, the strip on
# one line, the layout filling the page); bubbles, translations and the send preview drawn calmly; the follow-up
# states in their own tints. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'no row of page tabs on the chat page' "$W/fidelity.css" '.fidelity:has(#view .inbox-page) #workspace-tabs { display:none; }'
has 'dialogs below the header there' "$W/fidelity.css" '.fidelity:has(#view .inbox-page) { --fid-top:56px; }'
has 'the layout fills the page' "$W/fidelity.css" '.fidelity .fid-wa .inbox-layout { flex:1; height:auto; min-height:400px;'
same 'no height worked out from the screen' "$(grep -cE '100dvh - (203|178)px' "$W/fidelity.css")" 0
has 'incoming bubbles with a hairline, messages of one side close' "$W/fidelity.css" '.fidelity .fid-wa .messages>.message-row:not(.out)+.message-row:not(.out),.fidelity .fid-wa .messages>.message-row.out+.message-row.out { margin-top:4px; }'
has 'translations as recessed parts' "$W/fidelity.css" '.fidelity .fid-wa .message-translation { margin-top:8px; padding-top:8px; border-top-color:var(--fid-frame); font-size:14px; line-height:1.5;'
has 'the send preview in the sky tint' "$W/fidelity.css" 'background:var(--fid-sky-bg); color:var(--color-text); font-size:14px;'
has 're-contact in rose' "$W/fidelity-lifecycle.css" '.lc-pill.hot[data-state="recontact"] {'
has 'awaiting a reply in sky' "$W/fidelity-lifecycle.css" '  background: var(--fid-sky-bg);'
has 'the strip keeps to one line below 1600 px' "$W/fidelity-lifecycle.css" '@media (max-width: 1599px) {'
same 'the three state chips carry data-state' "$(grep -o 'data-state="${h.primary.key}"' "$W/fidelity-lifecycle.js" | wc -l)" 3
has 'the strip buttons keep their names as tooltips' "$W/fidelity-lifecycle.js" '${fidActionID(c.id)} title="移入聊天记录"'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  chatRoom: 'the chat page gives the conversation its room (plan 083)"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 聊天页面：给会话更多空间 · 2026-11-26'
has 'the built style sheet has it' "$O/app.css" '.fidelity:has(#view .inbox-page) #workspace-tabs { display:none; }'
same 'the built page carries data-state' "$(grep -o 'data-state="${h.primary.key}"' "$O/app.js" | wc -l)" 3
same 'no new size token (the scale only closes)' "$(cd "$ROOT" && comm -13 <(git show 21a97aa:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u) | wc -l)" 0
same 'of the built files only the page, its style sheet, its size tokens and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.js|app\.css|tokens\.css|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the price file pass' "$("$NODE" --test "$W/price-file.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the provisioner pass' "$("$NODE" --test "$W/site-provisioner.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 13 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-083/smoke.sh && ls -l /tmp/wa-scrm-plan-083/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity.css work/wa-replica/fidelity-lifecycle.css work/wa-replica/fidelity-lifecycle.js work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the first table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-083/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `no row of page tabs on the chat page`, `dialogs below the header there`, `the layout fills the page`, `no height worked out from the screen` (got: 2), `incoming bubbles with a hairline, messages of one side close`, `translations as recessed parts`, `the send preview in the sky tint`, `re-contact in rose`, `awaiting a reply in sky`, `the strip keeps to one line below 1600 px`, `the three state chips carry data-state` (got: 0), `the strip buttons keep their names as tooltips`, `the validator knows it`, `the build log has the entry`, `the built style sheet has it`, `the built page carries data-state` (got: 0); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The chat page, the strip, the bubbles and the follow-up chips

#### `fidelity.css`

**Edit 2.1** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text

.fid-wa { padding:20px 24px 16px; }
.fidelity .fid-wa.inbox-page { gap:0; padding-right:40px; }
.fid-wa-top { display:flex; justify-content:space-between; flex-wrap:wrap; align-items:center; gap:8px; margin-bottom:16px; }
.fid-wa-tabs { display:inline-flex; flex-shrink:0; border:1px solid var(--fid-frame); background:var(--color-surface); padding:3px; gap:2px; border-radius:10px; }
.fid-wa-tabs .fid-btn { min-width:107px; height:36px; border:0; border-radius:8px; font-size:14px; }
.fid-wa-tabs .fid-btn.gradient { box-shadow:0 2px 5px color-mix(in srgb,var(--fid-royal) 30%,transparent); }
.fidelity .fid-wa .inbox-layout { height:calc(100dvh - 203px); min-height:400px; grid-template-columns:300px minmax(0,1fr) 52px; background:var(--color-surface); border-radius:15px; border:1px solid var(--fid-frame); overflow:hidden; }
.fidelity .fid-wa .conversation-top { padding:12px; border-bottom:1px solid var(--fid-frame); }
```

Replace them with:

```text

.fid-wa { padding:12px 24px; }
.fidelity .fid-wa.inbox-page { gap:0; }
.fid-wa-top { display:flex; justify-content:space-between; flex-wrap:wrap; align-items:center; gap:8px; margin-bottom:8px; }
.fid-wa-tabs { display:inline-flex; flex-shrink:0; border:1px solid var(--fid-frame); background:var(--color-surface); padding:2px; gap:2px; border-radius:8px; }
.fid-wa-tabs .fid-btn { min-width:107px; height:32px; min-height:32px; border:0; border-radius:6px; font-size:14px; }
.fid-wa-tabs .fid-btn.gradient { box-shadow:none; }
.fidelity .fid-wa .inbox-layout { flex:1; height:auto; min-height:400px; grid-template-columns:300px minmax(0,1fr) 52px; background:var(--color-surface); border-radius:15px; border:1px solid var(--fid-frame); overflow:hidden; }
.fidelity .fid-wa .conversation-top { padding:12px; border-bottom:1px solid var(--fid-frame); }
```

**Edit 2.2** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-wa-conversation-actions .fid-btn { min-height:32px; padding:0 4px; border-radius:7px; font-size:12px; }
.fidelity .fid-wa .conversation { min-height:74px; margin:0; border-radius:0; padding:10px 12px; }
.fidelity .fid-wa .conversation .avatar { width:34px; height:34px; }
```

Replace them with:

```text
.fid-wa-conversation-actions .fid-btn { min-height:32px; padding:0 4px; border-radius:7px; font-size:12px; }
.fidelity .fid-wa .conversation { min-height:64px; margin:0; border-radius:0; padding:8px 12px; }
.fidelity .fid-wa .conversation .avatar { width:34px; height:34px; }
```

**Edit 2.3** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fidelity .fid-wa .conversation-footer { padding:8px 12px; }
.fidelity .fid-wa .tool-rail { padding:10px 6px; gap:4px; background:var(--color-surface); }
.fidelity .fid-wa .tool-rail .icon-button { width:38px; height:38px; }
```

Replace them with:

```text
.fidelity .fid-wa .conversation-footer { padding:8px 12px; }
.fidelity .fid-wa .tool-rail { padding:10px 6px; gap:4px; background:var(--rail); }
.fidelity .fid-wa .tool-rail .icon-button { width:38px; height:38px; }
```

**Edit 2.4** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fidelity .fid-wa .chat-pane,.fidelity .fid-wa .messages,.fid-chat-blank { background:var(--fid-chat); }
.fid-chat-blank { min-height:0; display:grid; place-items:center; text-align:center; }
```

Replace them with:

```text
.fidelity .fid-wa .chat-pane,.fidelity .fid-wa .messages,.fid-chat-blank { background:var(--fid-chat); }
/* The conversation's room and its parts (plan 083). The chat page has no row of page tabs — the sidebar opens every
   page — so dialogs are placed below the header only; the rows above the messages are compact, so that the messages
   get about half the height of a laptop screen. Incoming bubbles white with a hairline; messages of one side close
   together; a translation or a transcript a recessed part under a hairline with its small label; the send preview
   in the sky tint. */
.fidelity:has(#view .inbox-page) { --fid-top:56px; }
.fidelity:has(#view .inbox-page) #workspace-tabs { display:none; }
.fidelity .fid-wa .chat-heading { min-height:56px; padding-block:8px; }
.fidelity .fid-wa .source-strip { min-height:36px; padding-block:4px; }
.fidelity .fid-wa .source-strip .ai-language-pick .fid-select { height:28px; min-height:28px; font-size:12px; }
.fidelity .fid-wa .messages { gap:0; }
.fidelity .fid-wa .messages>*+* { margin-top:16px; }
.fidelity .fid-wa .messages>.message-row:not(.out)+.message-row:not(.out),.fidelity .fid-wa .messages>.message-row.out+.message-row.out { margin-top:4px; }
.fidelity .fid-wa .message-bubble { padding:8px 12px; border-color:var(--fid-frame); border-radius:12px 12px 12px 4px; }
.fidelity .fid-wa .message-row.out .message-bubble { border-color:var(--fid-frame); border-radius:12px 12px 4px 12px; }
.fidelity .fid-wa .message-text { line-height:1.5; }
.fidelity .fid-wa .message-translation { margin-top:8px; padding-top:8px; border-top-color:var(--fid-frame); font-size:14px; line-height:1.5; color:var(--fid-ink); }
.fidelity .fid-wa .translation-label { margin-bottom:4px; color:var(--color-text-muted); }
.fidelity .fid-wa .message-meta { margin-top:4px; color:var(--color-text-muted); font-variant-numeric:tabular-nums; }
.fidelity .fid-wa .composer { padding-block:8px; }
.fidelity .fid-wa .composer-input textarea { min-height:40px; }
.fidelity .fid-wa .composer-foot { margin-top:4px; }
.fidelity .fid-wa .translation-preview { padding:8px 12px; border-color:color-mix(in srgb,var(--fid-sky) 25%,var(--color-surface)); border-radius:8px; background:var(--fid-sky-bg); color:var(--color-text); font-size:14px; line-height:1.5; margin-bottom:8px; }
.fidelity .fid-wa .translation-preview small { color:var(--fid-sky); }
.fidelity .fid-wa .conversation.selected { background:color-mix(in srgb,var(--color-accent) 8%,var(--color-surface)); }
.fidelity .fid-wa .conversation:has(.conversation-pin):not(.selected) { background:var(--rail); }
.fid-chat-blank { min-height:0; display:grid; place-items:center; text-align:center; }
```

**Edit 2.5** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.openwa-empty-action { margin-top:8px; }
.openwa-chat-status { display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding:5px 14px; background:var(--color-surface); border-bottom:1px solid var(--fid-frame); min-height:38px; flex-shrink:0; }
.openwa-chat-status>span:first-child { display:inline-flex; align-items:center; gap:5px; font-size:12px; color:var(--fid-ink); }
```

Replace them with:

```text
.openwa-empty-action { margin-top:8px; }
.openwa-chat-status { display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding:4px 16px; background:var(--color-surface); border-bottom:1px solid var(--fid-frame); min-height:32px; flex-shrink:0; }
.openwa-chat-status>span:first-child { display:inline-flex; align-items:center; gap:5px; font-size:12px; color:var(--fid-ink); }
```

**Edit 2.6** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
  .fid-wa,.fidelity .fid-wa.inbox-page { padding:12px 12px 10px; gap:0; }
  .fid-wa-top { margin-bottom:11px; }
  .fidelity .fid-wa .inbox-layout { display:flex; min-height:0; height:calc(100dvh - 178px); }
  .openwa-panel-head { padding:12px; }
```

Replace them with:

```text
  .fid-wa,.fidelity .fid-wa.inbox-page { padding:12px 12px 10px; gap:0; }
  .fid-wa-top { margin-bottom:8px; }
  .fidelity .fid-wa .inbox-layout { display:flex; min-height:0; height:auto; }
  .openwa-panel-head { padding:12px; }
```

#### `fidelity-lifecycle.css`

**Edit 2.7** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.45;
```

Replace them with:

```text
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
```

**Edit 2.8** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
  height: 12px;
}
.lc-pill.hot {
  background: color-mix(in srgb, var(--color-danger) 11%, var(--color-surface));
  color: var(--color-danger);
}
.lc-pill.warn {
  background: color-mix(in srgb, var(--fid-amber) 12%, var(--color-surface));
  color: var(--fid-amber);
}
.lc-pill.ok {
```

Replace them with:

```text
  height: 12px;
}
/* The follow-up states in their own tints (plan 083): overdue amber, re-contact rose — both are "hot", told apart
   by data-state — and awaiting the customer's reply sky. */
.lc-pill.hot {
  background: var(--color-warning-soft);
  color: var(--fid-amber);
}
.lc-pill.hot[data-state="recontact"] {
  background: var(--fid-rose-bg);
  color: var(--color-danger);
}
.lc-pill.warn {
  background: var(--fid-sky-bg);
  color: var(--fid-sky);
}
.lc-pill.ok {
```

**Edit 2.9** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
  flex-wrap: wrap;
  align-items: center;
  gap: 7px 10px;
  padding: 7px 14px;
  background: color-mix(in srgb, var(--color-accent-soft) 45%, var(--color-surface));
  border-bottom: 1px solid var(--fid-frame);
```

Replace them with:

```text
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: color-mix(in srgb, var(--color-accent-soft) 45%, var(--color-surface));
  border-bottom: 1px solid var(--fid-frame);
```

**Edit 2.10** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.lc-chat-strip .fid-btn.slim {
  min-height: 26px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 11px;
}

```

Replace them with:

```text
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.lc-chat-strip .fid-btn.slim {
  min-height: 28px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 12px;
}
/* Below 1600 px the strip's four buttons show their icons only — their names stay as tooltips and for screen
   readers — so that the strip keeps to one line (plan 083). */
@media (max-width: 1599px) {
  .lc-chat-strip-right .fid-btn.slim {
    width: 28px;
    padding: 0;
    gap: 0;
    font-size: 0;
  }
}

```

**Edit 2.11** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
}
.lc-chat-strip .tag-row {
  flex-wrap: nowrap;
  overflow: hidden;
```

Replace them with:

```text
}
.lc-chat-strip .tag-row {
  flex: 1 1 0;
  min-width: 0;
  flex-wrap: nowrap;
  overflow: hidden;
```

**Edit 2.12** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--color-text-muted);
  white-space: nowrap;
```

Replace them with:

```text
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: nowrap;
```

**Edit 2.13** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
.lc-inline-select .fid-select {
  width: auto;
  min-height: 26px;
  height: 26px;
  font-size: 12px;
}
```

Replace them with:

```text
.lc-inline-select .fid-select {
  width: auto;
  min-height: 28px;
  height: 28px;
  font-size: 12px;
}
```

#### `fidelity-lifecycle.js`

**Edit 2.14** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
          <td style="text-align:left">${tagCell(c)}</td>
          <td><span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span></td>
          <td>${c.reactivatedCount || 0} 次</td>
```

Replace them with:

```text
          <td style="text-align:left">${tagCell(c)}</td>
          <td><span class="lc-pill ${h.primary.tone}" data-state="${h.primary.key}">${icon(h.primary.icon)}${esc(h.primary.label)}</span></td>
          <td>${c.reactivatedCount || 0} 次</td>
```

**Edit 2.15** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
        <td>${esc(c.phone)}<span class="fid-cell-detail">${esc(country(c))} · ${esc(aiLanguageLabel(c))}</span></td>
        <td>${h.primary ? `<span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span><span class="fid-cell-detail">${h.nextTask ? esc(dateLabel(h.nextTask.due)) : '无待办'}</span>` : '—'}</td>
        <td>${esc(c.last || '—')}${c.unread ? `<span class="fid-cell-detail">${c.unread} 条未读</span>` : ''}</td>
```

Replace them with:

```text
        <td>${esc(c.phone)}<span class="fid-cell-detail">${esc(country(c))} · ${esc(aiLanguageLabel(c))}</span></td>
        <td>${h.primary ? `<span class="lc-pill ${h.primary.tone}" data-state="${h.primary.key}">${icon(h.primary.icon)}${esc(h.primary.label)}</span><span class="fid-cell-detail">${h.nextTask ? esc(dateLabel(h.nextTask.due)) : '无待办'}</span>` : '—'}</td>
        <td>${esc(c.last || '—')}${c.unread ? `<span class="fid-cell-detail">${c.unread} 条未读</span>` : ''}</td>
```

**Edit 2.16** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
    const strip = `<div class="lc-chat-strip" aria-label="客户跟进协同栏">
      ${h.primary ? `<button type="button" class="lc-pill lc-pill-link ${h.primary.tone}" data-action="lcTrackFollow" ${fidActionID(c.id)} title="在跟进闭环中查看此客户">${icon(h.primary.icon)}${esc(h.primary.label)}</button>` : ''}
      ${h.nextTask ? `<button type="button" class="lc-pill lc-pill-link info" data-action="lcTrackFollow" ${fidActionID(c.id)} title="在跟进闭环中查看此客户">${icon('CalendarClock')}下次跟进 ${esc(dateLabel(h.nextTask.due))}</button>` : ''}
```

Replace them with:

```text
    const strip = `<div class="lc-chat-strip" aria-label="客户跟进协同栏">
      ${h.primary ? `<button type="button" class="lc-pill lc-pill-link ${h.primary.tone}" data-action="lcTrackFollow" data-state="${h.primary.key}" ${fidActionID(c.id)} title="在跟进闭环中查看此客户">${icon(h.primary.icon)}${esc(h.primary.label)}</button>` : ''}
      ${h.nextTask ? `<button type="button" class="lc-pill lc-pill-link info" data-action="lcTrackFollow" ${fidActionID(c.id)} title="在跟进闭环中查看此客户">${icon('CalendarClock')}下次跟进 ${esc(dateLabel(h.nextTask.due))}</button>` : ''}
```

**Edit 2.17** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
      <div class="lc-chat-strip-right">
        ${fidButton(h.closed ? '重新跟进' : '安排跟进', 'followup', 'CalendarPlus', h.closed ? 'slim blue' : 'slim tint', fidActionID(c.id))}
        ${fidButton('设置标签', 'assignTags', 'Tags', 'slim', fidActionID(c.id))}
        ${fidButton('移入聊天记录', 'fidArchiveOpen', 'Archive', 'slim', fidActionID(c.id))}
        ${fidButton('360° 档案', 'profile', 'ContactRound', 'slim', fidActionID(c.id))}
      </div>
```

Replace them with:

```text
      <div class="lc-chat-strip-right">
        ${fidButton(h.closed ? '重新跟进' : '安排跟进', 'followup', 'CalendarPlus', h.closed ? 'slim blue' : 'slim tint', `${fidActionID(c.id)} title="${h.closed ? '重新跟进' : '安排跟进'}"`)}
        ${fidButton('设置标签', 'assignTags', 'Tags', 'slim', `${fidActionID(c.id)} title="设置标签"`)}
        ${fidButton('移入聊天记录', 'fidArchiveOpen', 'Archive', 'slim', `${fidActionID(c.id)} title="移入聊天记录"`)}
        ${fidButton('360° 档案', 'profile', 'ContactRound', 'slim', `${fidActionID(c.id)} title="360° 档案"`)}
      </div>
```

What these edits do, so that you can recognise them: in `fidelity.css` the chat page's padding, toggle and layout, the chat list's rows, the rail's grey, a commented block of new rules after the rule of the chat's background, the number row and the narrow-screen layout; in `fidelity-lifecycle.css` the chip's size, the tones `hot` and `warn` with a comment and the rule for re-contact, the strip with a media block below 1600 px, the strip's tag row and the inline selects; in `fidelity-lifecycle.js` `data-state` on the three state chips and `title` on the strip's four buttons.

**Verify**: `sha256sum work/wa-replica/fidelity.css work/wa-replica/fidelity-lifecycle.css work/wa-replica/fidelity-lifecycle.js` → `760709c16e178fc2a2f14d4864c269ae975e63d41934d97b6c18b4e6d515d47b`, `5192a2bde63701f603319444730e68707f0597afabe7b5de29ee375290d77685`, `07cf07174f5631343096d1699cb78be75bea0f08ef4632a3dbfb132f90664e38`. If a checksum does not match, restore the file (`git checkout -- <file>`) and apply its edits again, once; if it still does not match, STOP.

### Step 3: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
}
const summary = {
```

Replace them with:

```text
}
// The conversation's room (plan 083): the chat page has no row of page tabs and its dialogs are placed below the
// header; the layout fills the page instead of a height worked out from the screen; the strip's four buttons carry
// their names as tooltips (below 1600 px they show their icons only); the follow-up states carry data-state, so that
// overdue (amber) and re-contact (rose), both "hot", and awaiting a reply (sky) have their own tints.
const pageCss = read(path.join(__dirname, 'fidelity.css')), lifecycleCss = read(path.join(__dirname, 'fidelity-lifecycle.css'));
for (const [source, built] of [['.fidelity:has(#view .inbox-page) { --fid-top:56px; }', '.fidelity:has(#view .inbox-page) { --fid-top:var(--fid-px-56); }'], ['.fidelity:has(#view .inbox-page) #workspace-tabs { display:none; }', '.fidelity:has(#view .inbox-page) #workspace-tabs { display:none; }'], ['.fidelity .fid-wa .inbox-layout { flex:1; height:auto; min-height:400px;', '.fidelity .fid-wa .inbox-layout { flex:1; height:auto; min-height:var(--fid-px-400);']]) {
  assert(pageCss.includes(source) && read(path.join(out, 'app.css')).includes(built), `the conversation's room is missing ${source}`);
}
assert(!pageCss.includes('100dvh - 203px') && !pageCss.includes('100dvh - 178px'), 'the chat page must fill the page, not a height worked out from the screen');
for (const required of ['.lc-pill.hot[data-state="recontact"] {', 'background: var(--fid-sky-bg);', 'background: var(--color-warning-soft);', '@media (max-width: 1599px) {']) {
  assert(lifecycleCss.includes(required), `fidelity-lifecycle.css is missing ${required}`);
}
assert.equal((moduleSource.match(/data-state="\$\{h\.primary\.key\}"/g) || []).length, 3, 'the three follow-up state chips must carry data-state');
assert.equal((appJs.match(/data-state="\$\{h\.primary\.key\}"/g) || []).length, 3, 'the built page must carry data-state on the three follow-up state chips');
for (const name of ['设置标签', '移入聊天记录', '360° 档案']) assert(moduleSource.includes(`\${fidActionID(c.id)} title="${name}"`), `the strip's button ${name} must carry its name as a tooltip`);
const summary = {
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  quotePicks: 'the quote dialog (报价): a box on the left ticks a product, the ticks stay while the search changes; 确认 opens 确认报价 with the ticked products in the order ticked — quantity (whole, at least 1), unit price (and price column), amount, total — where a product can be deleted and 返回列表 goes back; 放入消息框 puts one line per product ("Product Alpha PRDA01: $40 x 10 = $400") and "Total: $440"; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
  colourWorld: 'one colour world (plan 082): a teal accent (#0f766e, white text on it 5.47:1), cool neutrals, hairlines instead of shadows, greys of 4.5:1 and more on every surface, declared on :root so that the base follows; the shell, the shared controls and the sign-in screen on the closed scale of lengths',
```

Replace them with:

```text
  quotePicks: 'the quote dialog (报价): a box on the left ticks a product, the ticks stay while the search changes; 确认 opens 确认报价 with the ticked products in the order ticked — quantity (whole, at least 1), unit price (and price column), amount, total — where a product can be deleted and 返回列表 goes back; 放入消息框 puts one line per product ("Product Alpha PRDA01: $40 x 10 = $400") and "Total: $440"; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
  chatRoom: 'the chat page gives the conversation its room (plan 083): no row of page tabs there (the sidebar opens every page), compact rows above the messages, the strip on one line with icon buttons that keep their names as tooltips below 1600 px, the layout filling the page; white incoming bubbles with a hairline, close messages of one side, recessed translations; follow-up states in their own tints (overdue amber, re-contact rose, awaiting reply sky)',
  colourWorld: 'one colour world (plan 082): a teal accent (#0f766e, white text on it 5.47:1), cool neutrals, hairlines instead of shadows, greys of 4.5:1 and more on every surface, declared on :root so that the base follows; the shell, the shared controls and the sign-in screen on the closed scale of lengths',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `026c06e7f0e39baf8d0bfbe3b019a0eef1e954e0aa52fcdbf39d3e6969df5ded`; `git checkout 21a97aa -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.js`, `app.css`, `tokens.css` and `validation.json` of `outputs/wa-replica-prototype/` only; `bash -c "comm -13 <(git show 21a97aa:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u)"` prints **nothing** (no new size token); `sha256sum outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/app.css outputs/wa-replica-prototype/tokens.css` → `cc934215f269c220d15f84cc97142d8223cbd81545fa0309b2056852a76a3583`, `f106d1b910fa9a4539eebcbe07d244dfd5d877863b29ec061a817b78f2b01537`, `80fad759a4ba4fcb369db5922896e6b42d4ab8391734d4256467384f7fca601d`; `$NODE --test` → `tests 90`, `pass 90`, `fail 0`. If a checksum does not match, restore the file and apply its edits again, once; if it still does not match, a new size token appears, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 聊天页面：给会话更多空间 · 2026-11-26

界面升级第三步，聊天页面（WhatsApp API）：

- **更多空间**：聊天页面不再显示顶部的页面标签栏（左侧菜单可以打开所有页面），消息上方各行更紧凑；在 1366×768 的笔记本屏幕上，消息区域从约 190 像素增加到约 340 像素，1920×1080 时约 650 像素。
- **跟进栏一行显示**：屏幕宽度小于 1600 像素时，「安排跟进」「设置标签」「移入聊天记录」「360° 档案」只显示图标，鼠标停留时显示名称。
- **消息**：收到的消息为白色气泡加细线边框，发出的保持绿色；同一方连续的消息靠得更近；译文和语音转文字在气泡内以细线分隔；发送前的译文预览为浅蓝色。
- **跟进状态的颜色**：跟进已逾期为琥珀色，复联待处理为玫红色，客户待回复为浅蓝色。
- **会话列表**：每行更紧凑，当前会话以浅青色标出，置顶的会话为浅灰底色。

验证：构建与校验脚本通过；浏览器测试：三种屏幕尺寸下的各行高度与消息区域，跟进栏为一行，按钮的提示文字，对话框位置，五种跟进状态的颜色。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout 21a97aa -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-083/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `1c9a0945c98c004c811767c122ebc118e9039c783c6db15ab20389d3ae9ca3b3`; `git status --porcelain` lists exactly these nine as changed and nothing as new: the five files of the table in "Current state" and `outputs/wa-replica-prototype/app.js`, `app.css`, `tokens.css`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the rules of the conversation's room (in the source, and in the built style sheet with its size tokens), no height worked out from the screen, the tints and the media block, `data-state` on the three chips (source and built page), the tooltips of the strip's buttons.
- **Smoke** (`/tmp/wa-scrm-plan-083/smoke.sh`) — the same facts, the validator's entry and the build log, no new size token, which built files changed, the five test files.
- **Verified by the reviewer, not by you**: in a browser against the reviewer's harness — the heights of the rows and the messages at three screen sizes (the table under "Why this matters"), the strip on one line, the tooltips, a dialog's position, the tints of the five states; screenshots; the site and WhatsApp suites; deliberate faults.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 21a97aa -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test` → `tests 90`, `pass 90`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-083/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `760709c16e178fc2a2f14d4864c269ae975e63d41934d97b6c18b4e6d515d47b`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.css` → `5192a2bde63701f603319444730e68707f0597afabe7b5de29ee375290d77685`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.js` → `07cf07174f5631343096d1699cb78be75bea0f08ef4632a3dbfb132f90664e38`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `026c06e7f0e39baf8d0bfbe3b019a0eef1e954e0aa52fcdbf39d3e6969df5ded`
- [ ] `sha256sum replica/build-log.md` → `1c9a0945c98c004c811767c122ebc118e9039c783c6db15ab20389d3ae9ca3b3`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `cc934215f269c220d15f84cc97142d8223cbd81545fa0309b2056852a76a3583`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `f106d1b910fa9a4539eebcbe07d244dfd5d877863b29ec061a817b78f2b01537`
- [ ] `sha256sum outputs/wa-replica-prototype/tokens.css` → `80fad759a4ba4fcb369db5922896e6b42d4ab8391734d4256467384f7fca601d`
- [ ] `bash -c "comm -13 <(git show 21a97aa:outputs/wa-replica-prototype/tokens.css | grep -o -- '--fid-px-[a-z0-9]*' | sort -u) <(grep -o -- '--fid-px-[a-z0-9]*' outputs/wa-replica-prototype/tokens.css | sort -u)"` prints nothing
- [ ] `git diff --name-only 21a97aa..HEAD -- outputs` lists `app.js`, `app.css`, `tokens.css` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only 21a97aa..HEAD -- . ':!plans'` lists exactly nine paths: the five of the table in "Current state", `app.js`, `app.css`, `tokens.css` and `validation.json`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, or a test fails.
- A new size token appears, or an output file other than `app.js`, `app.css`, `tokens.css` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file, creating a file or installing a package.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else. An open page keeps the old layout until it is opened again.
- **The chat page's height** follows the page now: a row added above the messages or in the composer takes its room from the messages without any other change — keep the rows compact.
- **The row of page tabs** is hidden only while `#view` holds `.inbox-page`; a dialog opened there sits below the header (`--fid-top` 56 px). A new page that wants the same must say so in its own rule.
- **A new follow-up state** in `lcHealth` gets its tint by its tone, and by `data-state` when two states share a tone.
- **The strip below 1600 px**: its buttons need a `title` with their name — a new button in the strip must carry one, or it shows as an icon without a name.
- What a reviewer should scrutinise: the conversation's end after a redraw (the scroll anchoring of plans 066/071 — no row may change its height after drawing); the narrow screen (390 px) with the list and the conversation; that every other page keeps the row of page tabs.
- `validation.json`: re-run the validator once in the main checkout after merging.
