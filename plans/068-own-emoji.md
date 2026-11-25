# Plan 068: Every emoji on every computer: the page ships Noto Color Emoji

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat b3bba44..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (a font the browser uses only for emoji, after the fonts of the text; the server sends font files with their type and lets the browser keep them; exact text and checksums for every file, the font files checked by checksum)
- **Depends on**: plans/067-save-guard.md (DONE)
- **Category**: feature (approved by the owner)
- **Planned at**: commit `b3bba44`, 2026-11-25

## Why this matters

On 2026-11-25 a customer wrote "… tengo los clientes encima 🥹" and the owner saw that the emoji "isn't displaying properly, unlike how it would appear on WhatsApp". The advisor checked: the message reached the workspace intact (the WhatsApp link's store holds U+1F979, "face holding back tears", Emoji 14.0, 2021) and the page draws the text unchanged. The difference is the font. WhatsApp draws every emoji with pictures of its own; the page, like any web page, uses the emoji font of the computer it is viewed on — and Windows 10's has no emoji from 2021 on, so they show as empty boxes there. Asked "Should SCRM bring its own emoji pictures so every emoji shows on any computer?" (Google's free emoji design, as WhatsApp's own artwork cannot be copied; a one-time download of a few MB per browser), the owner chose "Yes, add them".

### Decisions already made (do not re-open; do not ask)

- **The font**: Noto Color Emoji, Google's open emoji font (SIL Open Font License 1.1, © 2021 Google Inc., no reserved font name), version 50 as Google Fonts serves it: eleven WOFF2 parts in the colour format COLRv1, about 2.1 MB together, each covering a set of characters (the flags alone are 0.7 MB; the part with the common faces, 🥹 among them, is 141 KB). The parts are shipped unchanged with the licence in `work/wa-replica/fonts/` and copied by the build to `outputs/wa-replica-prototype/fonts/`.
- **Loaded only when needed and kept**: the page's style sheet names each part with its `unicode-range` (as Google Fonts does), so a browser loads a part only when a character of it is on the screen. The server sends `.woff2` as `font/woff2` and, for `/fonts/…woff2`, `Cache-Control: public, max-age=31536000, immutable` — the names carry the version, so a later version comes under new names. Everything else stays `no-store`.
- **After the fonts of the text**: the family `"SCRM Emoji"` goes into the page's font list between `"Microsoft YaHei"` and `sans-serif`, so digits, # and the signs some parts also cover (©, ™, arrows) keep the fonts of the text; an emoji the text fonts do not have — all of them in practice — is drawn with this font. The whole page has the class `fidelity`, and inputs inherit their font, so messages, the chat list, the message box and dialogs all use it.
- **Browsers that cannot draw it keep their own emoji**: each source has `tech(color-COLRv1)`; a browser without this colour format (Safari today) or without `tech()` leaves the font and draws emoji as before. Apple's own emoji are complete.
- No other look of the page changes; no emoji is turned into a picture element.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity.css` | `06bf20f32731f03950b89029b321a76401da47852544c17528a2716ca91843c9` | `b07f7085eab601f1841233354776cd6f5afce6db95fa87144889c5c8b9e6e7d4` | 1 |
| `work/wa-replica/build-fidelity.cjs` | `a7d18bf4d85642420880e6db3557d31227a377ef8cdb647ae66a642b5544796c` | `406f9ceb362350963efa7faccb5548a81e2baa028125401762f8c4b30e4a38d5` | 1 |
| `work/wa-replica/serve.cjs` | `77eb8f61424af71fd48c044d30b4c8643b27ef50621a83c0dfc7774680e9f15e` | `d7d59534ce481d81075aac11dbbbb696ff14106cd2ba06939c3d419dcf949ca5` | 2 |
| `work/wa-replica/site-api.test.cjs` | `f54c1e0081360649af736c4fe363998fba3eb00318fabd918d8786ca70d24574` | `cbf84d71085dc1d0e9d078dfef51577f9839aa3bbb1cd923b3bcb0fb5d3ee8be` | 1 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `bfcb5f39d1d4a348ec227cd8b8b6138a63ef6842be9741795808f85189f22a34` | `22b3a2b8a531715359814f81c61b1c9eb7bb4eb2c0acb86890a619a07c97a4f8` | 2 |
| `replica/build-log.md` | `e0d701f116a60da1e134cca6796ea93be34de7e5e045c6510a3e6aa80ac5f0c8` | `8b533250c9024a0a21b033613eb431e30e61c31943a37460f62d9cbd89524184` | 1 append |

New: the twelve files of `work/wa-replica/fonts/` (Step 2) and, made by the build, their copies in `outputs/wa-replica-prototype/fonts/`.

- `fidelity.css` — the app's own style sheet; its first rule `.fidelity { … font-family:… }` sets the page's fonts. The build appends it to `app.css` (it turns `px` lengths into variables; the new rules have none).
- `build-fidelity.cjs` — the build; it writes text files with `write(output, file, content)`; the fonts are copied with `fs.copyFileSync` after them.
- `serve.cjs` — the server of the page (the platform's containers all run it); `serveFile` sends a file of `outputs/wa-replica-prototype` with a type from its `mime` table and `Cache-Control: no-store`.
- `site-api.test.cjs` — the tests of the sub-site's server; one test of the preview server's font files is added before the existing test of the preview server.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build two output files differ — `app.css` (it holds `fidelity.css`) and `validation.json` (written by the validator) — and the folder `fonts/` is new; `app.js` does not change.

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer** (the server's accounts and data use `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout b3bba44 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 17`, `fail 0` (unchanged) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 20`, `fail 0` (19 before this plan) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-068/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify or create):

- `work/wa-replica/fonts/` — created in Step 2 with exactly the twelve downloaded files
- `work/wa-replica/fidelity.css`, `work/wa-replica/build-fidelity.cjs`, `work/wa-replica/serve.cjs` (Step 3)
- `work/wa-replica/site-api.test.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 4)
- `replica/build-log.md` (Step 5)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.css`, `validation.json`, and the new `outputs/wa-replica-prototype/fonts/` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — `fidelity-base/**` (its files are checked against fixed checksums by the build), the other style sheets and `fidelity-*.js` modules, `site-api.cjs`, `openwa-link.cjs`, `ai-relay.cjs`, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. Do not convert, subset or rename the font files; do not install anything.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/068-own-emoji` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): draw every emoji with the shipped Noto Color Emoji`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese, Japanese, Korean, Cyrillic and Arabic text, regular expressions with backslashes, and backticks; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 7 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the five files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-068/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-068 && cat > /tmp/wa-scrm-plan-068/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 068: every emoji drawn with the shipped Noto Color Emoji. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the eleven parts of the emoji font and its licence are there' "$(ls "$W/fonts" 2>/dev/null | wc -l)" 12
same 'they are the files that were checked' "$(cd "$W/fonts" 2>/dev/null && sha256sum noto-color-emoji-v50-9.woff2 noto-color-emoji-OFL.txt | cut -c1-64 | tr '\n' ' ')" '22f4056a092170716a6e49afce7b2ef97eab80033b37137c45c0ca1ca31b1c54 ac564676d10054a8445923dfc2dfb13c042d97888bd27c1b6ec6dfe89a9d8d62 '
same 'the build copied them' "$(diff -rq "$W/fonts" "$O/fonts" > /dev/null 2>&1 && echo SAME)" SAME
same 'the style sheet names the eleven parts' "$(grep -o 'font-family:"SCRM Emoji"' "$O/app.css" | wc -l)" 11
has 'the emoji font comes after the fonts of the text' "$O/app.css" 'font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei","SCRM Emoji",sans-serif;'
has 'the server sends them as fonts' "$W/serve.cjs" "'.woff2': 'font/woff2',"
has 'the browser keeps them' "$W/serve.cjs" "'public, max-age=31536000, immutable'"
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  ownEmoji: 'emoji are drawn with Noto Color Emoji"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 表情符号在任何电脑上都能显示：使用 Noto Color Emoji · 2026-11-25'
same 'of the built files only the style sheet and the validation changed, and the fonts are new' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.css|validation\.json|fonts/)$')" 0
same 'the server and the build pass the syntax check' "$(node --check "$W/serve.cjs" 2>/dev/null && node --check "$W/build-fidelity.cjs" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-068/smoke.sh && ls -l /tmp/wa-scrm-plan-068/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity.css work/wa-replica/build-fidelity.cjs work/wa-replica/serve.cjs work/wa-replica/site-api.test.cjs work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-068/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the sign-in and data tests pass` (got: ℹ pass 19 ℹ fail 0 ), `the eleven parts of the emoji font and its licence are there` (got: 0), `they are the files that were checked` (got: ), `the build copied them` (got: ), `the style sheet names the eleven parts` (got: 0), `the emoji font comes after the fonts of the text`, `the server sends them as fonts`, `the browser keeps them`, `the validator knows it` and `the build log has the entry` (ten checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The font: its eleven parts and its licence

**Run 2.1** — download the twelve files into a new folder `work/wa-replica/fonts/` (the parts from Google Fonts, the licence from Google's fonts repository), then show their checksums:

```bash
mkdir -p work/wa-replica/fonts
for n in 0 1 2 3 4 5 6 7 8 9 10; do curl -fsS -m 120 -o "work/wa-replica/fonts/noto-color-emoji-v50-$n.woff2" "https://fonts.gstatic.com/s/notocoloremoji/v50/Yq6P-KqIXTD0t4D9z1ESnKM3-HpFabsE4tq3luCC7p-aXxcn.$n.woff2" || echo "DOWNLOAD FAILED: part $n"; done
curl -fsS -m 60 -o work/wa-replica/fonts/noto-color-emoji-OFL.txt "https://raw.githubusercontent.com/google/fonts/main/ofl/notocoloremoji/OFL.txt" || echo "DOWNLOAD FAILED: licence"
(cd work/wa-replica/fonts && sha256sum noto-color-emoji-v50-0.woff2 noto-color-emoji-v50-1.woff2 noto-color-emoji-v50-2.woff2 noto-color-emoji-v50-3.woff2 noto-color-emoji-v50-4.woff2 noto-color-emoji-v50-5.woff2 noto-color-emoji-v50-6.woff2 noto-color-emoji-v50-7.woff2 noto-color-emoji-v50-8.woff2 noto-color-emoji-v50-9.woff2 noto-color-emoji-v50-10.woff2 noto-color-emoji-OFL.txt)
```

**Verify**: no line `DOWNLOAD FAILED`; `ls work/wa-replica/fonts | wc -l` → `12`; the checksums are exactly:

| File | sha256 |
|---|---|
| `noto-color-emoji-v50-0.woff2` | `cefc94c2f60f784c50b48bab499b4e9b1e7c3870f92091627555a35967b30552` |
| `noto-color-emoji-v50-1.woff2` | `493da8ddfce809a87ddff367d90ee3cc261d04ac661d42fc112a58b4564f6231` |
| `noto-color-emoji-v50-2.woff2` | `93770e84e6445000a5f3d90cebe6a984bed388fe1a04ca36317591086a353030` |
| `noto-color-emoji-v50-3.woff2` | `a77e72ab68384883bbc9cf6c0ad6c8f5b74a9e4e771d6509f4759f22b2d43a52` |
| `noto-color-emoji-v50-4.woff2` | `dce8680d145b4648107691b584d79d3ee7ba9c5a1971071c1a27383dbdc5c211` |
| `noto-color-emoji-v50-5.woff2` | `423e5f7a09beb7f8f07f0c3562995ea4d599d08dc9d74927ccdc4aac54930a94` |
| `noto-color-emoji-v50-6.woff2` | `bfd2a6fb3a14b3cc7078e6601b7ce8994edc439a3f2b71b01acd29def51e0140` |
| `noto-color-emoji-v50-7.woff2` | `b5cee5fd7d4827d1c2edbd3e1033266465dc3361207ce7e150a9c7c33501de5a` |
| `noto-color-emoji-v50-8.woff2` | `26c5b4221e4a6d7836d7c37b5f966306170deaad4483ac256260e24560746764` |
| `noto-color-emoji-v50-9.woff2` | `22f4056a092170716a6e49afce7b2ef97eab80033b37137c45c0ca1ca31b1c54` |
| `noto-color-emoji-v50-10.woff2` | `b1455b846ff433ea9227bb8bdba1c7f52220a2625a4a38c9a3bbe03e861bbdc5` |
| `noto-color-emoji-OFL.txt` | `ac564676d10054a8445923dfc2dfb13c042d97888bd27c1b6ec6dfe89a9d8d62` |

If a download fails or a checksum differs, delete the folder (`rm -rf work/wa-replica/fonts`) and run the block once more; if it still fails or differs, STOP (do not take the font from anywhere else).

### Step 3: The style sheet names the font, the build copies it, the server sends it as a font the browser keeps — and the build

#### `fidelity.css`

**Edit 3.1** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
/* Dimensions transcribed from rendered reference screens; no vendor stylesheet. */
.fidelity { --fid-sidebar:240px; --fid-top:107px; --fid-gradient:linear-gradient(115deg,var(--fid-violet),var(--fid-royal)); font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif; }
.fidelity .app-shell { --list:300px; }
```

Replace them with:

```text
/* Dimensions transcribed from rendered reference screens; no vendor stylesheet. */
/* Every emoji drawn the same way on every computer (plan 068): Noto Color Emoji (SIL OFL 1.1, fonts/noto-color-emoji-OFL.txt)
   in the eleven parts Google Fonts makes of it. A browser loads a part only when a character of its range is on the
   screen, and keeps it; one that cannot draw its colours (tech) leaves it and keeps its own emoji. It comes after the
   fonts of the text, so that digits and signs stay as they are. */
@font-face { font-family:"SCRM Emoji"; font-style:normal; font-weight:400; font-display:swap; src:url("fonts/noto-color-emoji-v50-0.woff2") format("woff2") tech(color-COLRv1); unicode-range:U+1f1e6-1f1ff; }
@font-face { font-family:"SCRM Emoji"; font-style:normal; font-weight:400; font-display:swap; src:url("fonts/noto-color-emoji-v50-1.woff2") format("woff2") tech(color-COLRv1); unicode-range:U+200d,U+2620,U+26a7,U+fe0f,U+1f308,U+1f38c,U+1f3c1,U+1f3f3-1f3f4,U+1f6a9,U+e0062-e0063,U+e0065,U+e0067,U+e006c,U+e006e,U+e0073-e0074,U+e0077,U+e007f; }
@font-face { font-family:"SCRM Emoji"; font-style:normal; font-weight:400; font-display:swap; src:url("fonts/noto-color-emoji-v50-2.woff2") format("woff2") tech(color-COLRv1); unicode-range:U+23,U+2a,U+30-39,U+a9,U+ae,U+200d,U+203c,U+2049,U+20e3,U+2122,U+2139,U+2194-2199,U+21a9-21aa,U+23cf,U+23e9-23ef,U+23f8-23fa,U+24c2,U+25aa-25ab,U+25b6,U+25c0,U+25fb-25fe,U+2611,U+2622-2623,U+2626,U+262a,U+262e-262f,U+2638,U+2640,U+2642,U+2648-2653,U+2660,U+2663,U+2665-2666,U+2668,U+267b,U+267e-267f,U+2695,U+269b-269c,U+26a0,U+26a7,U+26aa-26ab,U+26ce,U+26d4,U+2705,U+2714,U+2716,U+271d,U+2721,U+2733-2734,U+2747,U+274c,U+274e,U+2753-2755,U+2757,U+2764,U+2795-2797,U+27a1,U+27b0,U+27bf,U+2934-2935,U+2b05-2b07,U+2b1b-2b1c,U+2b55,U+3030,U+303d,U+3297,U+3299,U+fe0f,U+1f170-1f171,U+1f17e-1f17f,U+1f18e,U+1f191-1f19a,U+1f201-1f202,U+1f21a,U+1f22f,U+1f232-1f23a,U+1f250-1f251,U+1f310,U+1f3a6,U+1f3b5-1f3b6,U+1f3bc,U+1f3e7,U+1f441,U+1f499-1f49c,U+1f49f-1f4a0,U+1f4ac-1f4ad,U+1f4b1-1f4b2,U+1f4b9,U+1f4db,U+1f4f2-1f4f6,U+1f500-1f507,U+1f515,U+1f518-1f524,U+1f52f-1f53d,U+1f549,U+1f54e,U+1f5a4,U+1f5e8,U+1f5ef,U+1f6ab,U+1f6ad-1f6b1,U+1f6b3,U+1f6b7-1f6bc,U+1f6be,U+1f6c2-1f6c5,U+1f6d0-1f6d1,U+1f6d7,U+1f6dc,U+1f7e0-1f7eb,U+1f7f0,U+1f90d-1f90e,U+1f9d1-1f9d2,U+1f9e1,U+1fa75-1fa77,U+1faaf; }
@font-face { font-family:"SCRM Emoji"; font-style:normal; font-weight:400; font-display:swap; src:url("fonts/noto-color-emoji-v50-3.woff2") format("woff2") tech(color-COLRv1); unicode-range:U+200d,U+231a-231b,U+2328,U+23f0-23f3,U+2602,U+260e,U+2692,U+2694,U+2696-2697,U+2699,U+26b0-26b1,U+26cf,U+26d1,U+26d3,U+2702,U+2709,U+270f,U+2712,U+fe0f,U+1f302,U+1f321,U+1f392-1f393,U+1f3a9,U+1f3bd,U+1f3ee,U+1f3f7,U+1f3fa,U+1f451-1f462,U+1f484,U+1f489-1f48a,U+1f48c-1f48e,U+1f4a1,U+1f4a3,U+1f4a5,U+1f4b0,U+1f4b3-1f4b8,U+1f4bb-1f4da,U+1f4dc-1f4f1,U+1f4ff,U+1f508-1f514,U+1f516-1f517,U+1f526-1f529,U+1f52c-1f52e,U+1f550-1f567,U+1f56f-1f570,U+1f576,U+1f587,U+1f58a-1f58d,U+1f5a5,U+1f5a8,U+1f5b1-1f5b2,U+1f5c2-1f5c4,U+1f5d1-1f5d3,U+1f5dc-1f5de,U+1f5e1,U+1f5f3,U+1f6aa,U+1f6ac,U+1f6bd,U+1f6bf,U+1f6c1,U+1f6cb,U+1f6cd-1f6cf,U+1f6d2,U+1f6e0-1f6e1,U+1f6f0,U+1f97b-1f97f,U+1f9af,U+1f9ba,U+1f9e2-1f9e6,U+1f9ea-1f9ec,U+1f9ee-1f9f4,U+1f9f7-1f9ff,U+1fa71-1fa74,U+1fa79-1fa7b,U+1fa86,U+1fa8e-1fa8f,U+1fa91-1fa93,U+1fa96,U+1fa99-1faa0,U+1faa2-1faa7,U+1faaa-1faae; }
@font-face { font-family:"SCRM Emoji"; font-style:normal; font-weight:400; font-display:swap; src:url("fonts/noto-color-emoji-v50-4.woff2") format("woff2") tech(color-COLRv1); unicode-range:U+265f,U+26bd-26be,U+26f3,U+26f8,U+fe0f,U+1f004,U+1f0cf,U+1f380-1f384,U+1f386-1f38b,U+1f38d-1f391,U+1f396-1f397,U+1f399-1f39b,U+1f39e-1f39f,U+1f3a3-1f3a5,U+1f3a7-1f3a9,U+1f3ab-1f3b4,U+1f3b7-1f3bb,U+1f3bd-1f3c0,U+1f3c5-1f3c6,U+1f3c8-1f3c9,U+1f3cf-1f3d3,U+1f3f8-1f3f9,U+1f47e,U+1f4e2,U+1f4f7-1f4fd,U+1f52b,U+1f579,U+1f58c-1f58d,U+1f5bc,U+1f6f7,U+1f6f9,U+1f6fc,U+1f93f,U+1f941,U+1f945,U+1f947-1f94f,U+1f9e7-1f9e9,U+1f9f5-1f9f6,U+1fa70-1fa71,U+1fa80-1fa81,U+1fa83-1fa85,U+1fa87-1fa8a,U+1fa94-1fa95,U+1fa97-1fa98,U+1faa1,U+1faa9,U+1fadf; }
@font-face { font-family:"SCRM Emoji"; font-style:normal; font-weight:400; font-display:swap; src:url("fonts/noto-color-emoji-v50-5.woff2") format("woff2") tech(color-COLRv1); unicode-range:U+2693,U+26e9-26ea,U+26f1-26f2,U+26f4-26f5,U+26fa,U+26fd,U+2708,U+fe0f,U+1f301,U+1f303,U+1f306-1f307,U+1f309,U+1f310,U+1f3a0-1f3a2,U+1f3aa,U+1f3cd-1f3ce,U+1f3d5,U+1f3d7-1f3db,U+1f3df-1f3e6,U+1f3e8-1f3ed,U+1f3ef-1f3f0,U+1f488,U+1f492,U+1f4ba,U+1f54b-1f54d,U+1f5fa-1f5ff,U+1f680-1f6a2,U+1f6a4-1f6a8,U+1f6b2,U+1f6d1,U+1f6d5-1f6d6,U+1f6dd-1f6df,U+1f6e2-1f6e5,U+1f6e9,U+1f6eb-1f6ec,U+1f6f3-1f6f6,U+1f6f8,U+1f6fa-1f6fb,U+1f9bc-1f9bd,U+1f9ed,U+1f9f3,U+1fa7c; }
@font-face { font-family:"SCRM Emoji"; font-style:normal; font-weight:400; font-display:swap; src:url("fonts/noto-color-emoji-v50-6.woff2") format("woff2") tech(color-COLRv1); unicode-range:U+200d,U+2615,U+fe0f,U+1f32d-1f330,U+1f336,U+1f33d,U+1f344-1f37f,U+1f382,U+1f52a,U+1f7e9,U+1f7eb,U+1f942-1f944,U+1f950-1f96f,U+1f99e,U+1f9aa,U+1f9c0-1f9cb,U+1fad0-1fadc; }
@font-face { font-family:"SCRM Emoji"; font-style:normal; font-weight:400; font-display:swap; src:url("fonts/noto-color-emoji-v50-7.woff2") format("woff2") tech(color-COLRv1); unicode-range:U+200d,U+2600-2601,U+2603-2604,U+2614,U+2618,U+26a1,U+26c4-26c5,U+26c8,U+26f0,U+2728,U+2744,U+2b1b,U+2b50,U+fe0f,U+1f300,U+1f304-1f305,U+1f308,U+1f30a-1f30f,U+1f311-1f321,U+1f324-1f32c,U+1f331-1f335,U+1f337-1f33c,U+1f33e-1f344,U+1f3d4,U+1f3d6,U+1f3dc-1f3de,U+1f3f5,U+1f400-1f43f,U+1f490,U+1f4a7,U+1f4ae,U+1f525,U+1f54a,U+1f573,U+1f577-1f578,U+1f648-1f64a,U+1f6d8,U+1f940,U+1f980-1f9ae,U+1f9ba,U+1fa90,U+1faa8,U+1fab0-1fabf,U+1facd-1facf,U+1fae7; }
@font-face { font-family:"SCRM Emoji"; font-style:normal; font-weight:400; font-display:swap; src:url("fonts/noto-color-emoji-v50-8.woff2") format("woff2") tech(color-COLRv1); unicode-range:U+200d,U+2640,U+2642,U+2695-2696,U+26f7,U+26f9,U+2708,U+2764,U+27a1,U+fe0f,U+1f33e,U+1f373,U+1f37c,U+1f384-1f385,U+1f393,U+1f3a4,U+1f3a8,U+1f3c2-1f3c4,U+1f3c7,U+1f3ca-1f3cc,U+1f3eb,U+1f3ed,U+1f3fb-1f3ff,U+1f430,U+1f466-1f469,U+1f46b-1f478,U+1f47c,U+1f481-1f483,U+1f486-1f487,U+1f48b,U+1f48f,U+1f491,U+1f4bb-1f4bc,U+1f527,U+1f52c,U+1f574-1f575,U+1f57a,U+1f645-1f647,U+1f64b,U+1f64d-1f64e,U+1f680,U+1f692,U+1f6a3,U+1f6b4-1f6b6,U+1f6c0,U+1f6cc,U+1f91d,U+1f926,U+1f930-1f931,U+1f934-1f93a,U+1f93c-1f93e,U+1f977,U+1f9af-1f9b3,U+1f9b8-1f9b9,U+1f9bc-1f9bd,U+1f9cc-1f9cf,U+1f9d1-1f9df,U+1fa70,U+1fa82,U+1fac3-1fac5,U+1fac8,U+1faef; }
@font-face { font-family:"SCRM Emoji"; font-style:normal; font-weight:400; font-display:swap; src:url("fonts/noto-color-emoji-v50-9.woff2") format("woff2") tech(color-COLRv1); unicode-range:U+200d,U+2194-2195,U+2603,U+261d,U+2620,U+2639-263a,U+2665,U+26a1,U+26c4,U+270a-270d,U+2728,U+2763-2764,U+2b50,U+fe0f,U+1f31a-1f31f,U+1f32b,U+1f389-1f38a,U+1f3fb-1f3ff,U+1f440-1f450,U+1f463-1f465,U+1f479-1f47b,U+1f47d-1f480,U+1f485,U+1f48b-1f48c,U+1f493-1f49f,U+1f4a2,U+1f4a4-1f4a6,U+1f4a8-1f4ab,U+1f4af,U+1f525,U+1f573,U+1f590,U+1f595-1f596,U+1f5a4,U+1f5e3,U+1f600-1f644,U+1f648-1f64a,U+1f64c,U+1f64f,U+1f90c-1f925,U+1f927-1f92f,U+1f932-1f933,U+1f970-1f976,U+1f978-1f97a,U+1f9a0,U+1f9b4-1f9b7,U+1f9bb,U+1f9be-1f9bf,U+1f9d0,U+1f9e0-1f9e1,U+1fa75-1fa79,U+1fac0-1fac2,U+1fac6,U+1fae0-1fae6,U+1fae8-1faea,U+1faef-1fafa; }
@font-face { font-family:"SCRM Emoji"; font-style:normal; font-weight:400; font-display:swap; src:url("fonts/noto-color-emoji-v50-10.woff2") format("woff2") tech(color-COLRv1); unicode-range:U+1f6d9,U+1fa8b-1fa8d,U+1facc,U+1fadd,U+1faeb; }
.fidelity { --fid-sidebar:240px; --fid-top:107px; --fid-gradient:linear-gradient(115deg,var(--fid-violet),var(--fid-royal)); font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei","SCRM Emoji",sans-serif; }
.fidelity .app-shell { --list:300px; }
```

#### `build-fidelity.cjs`

**Edit 3.2** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
for(const [file,content] of Object.entries(assets))write(output,file,content);
console.log(JSON.stringify({version:requirement.version,base:'0.4-replica-ui',historicalFilesUnchanged:verifiedBaselineCount,icons:names.length,bytes:Buffer.byteLength(js),externalNetwork:false},null,2));
```

Replace them with:

```text
for(const [file,content] of Object.entries(assets))write(output,file,content);
// The emoji font (plan 068): its parts and its licence are copied as they are.
fs.mkdirSync(path.join(output,'fonts'),{recursive:true});
for(const file of fs.readdirSync(path.join(__dirname,'fonts')))fs.copyFileSync(path.join(__dirname,'fonts',file),path.join(output,'fonts',file));
console.log(JSON.stringify({version:requirement.version,base:'0.4-replica-ui',historicalFilesUnchanged:verifiedBaselineCount,icons:names.length,bytes:Buffer.byteLength(js),externalNetwork:false},null,2));
```

#### `serve.cjs`

**Edit 3.3** — `work/wa-replica/serve.cjs`. Find exactly these lines (they occur once):

```text
  '.json': 'application/json; charset=utf-8',
};
```

Replace them with:

```text
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
};
```

**Edit 3.4** — `work/wa-replica/serve.cjs`. Find exactly these lines (they occur once):

```text
    'Content-Type': mime[path.extname(file)] || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
```

Replace them with:

```text
    'Content-Type': mime[path.extname(file)] || 'text/plain; charset=utf-8',
    // The parts of the emoji font never change under their name (plan 068): the browser keeps them. Everything else
    // is asked for anew every time.
    'Cache-Control': pathname.startsWith('/fonts/') && pathname.endsWith('.woff2') ? 'public, max-age=31536000, immutable' : 'no-store',
  });
```

What these edits do, so that you can recognise them: `fidelity.css` gets eleven `@font-face` rules of the family `"SCRM Emoji"` before its first rule, and that family in the page's font list; `build-fidelity.cjs` copies the fonts after writing its files; `serve.cjs` gets the type of `.woff2` and the caching of the font parts.

**Verify**: `sha256sum work/wa-replica/fidelity.css work/wa-replica/build-fidelity.cjs work/wa-replica/serve.cjs` → `b07f7085eab601f1841233354776cd6f5afce6db95fa87144889c5c8b9e6e7d4`, `406f9ceb362350963efa7faccb5548a81e2baa028125401762f8c4b30e4a38d5`, `d7d59534ce481d81075aac11dbbbb696ff14106cd2ba06939c3d419dcf949ca5`; `node --check work/wa-replica/serve.cjs && node --check work/wa-replica/build-fidelity.cjs` exits 0; `git checkout b3bba44 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `diff -rq work/wa-replica/fonts outputs/wa-replica-prototype/fonts` prints nothing; `sha256sum outputs/wa-replica-prototype/app.css` → `7876a884f78044ab004a853cca575654ea3934cdd27f517f3f1278744a17c2c3`. If a checksum does not match, restore the file (`git checkout -- <file>`) and apply its edits again, once; if it still does not match, STOP.

### Step 4: The checks: the preview server's test of the font, and the validator

#### `site-api.test.cjs`

**Edit 4.1** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text

test('the preview server: without a data folder the routes are off; with one, the AI relay answers signed-in users only', async () => {
```

Replace them with:

```text

test('the preview server: the page\'s files are asked for anew every time; the parts of the emoji font go as fonts and are kept by the browser (plan 068)', async () => {
  const child = spawn(process.execPath, [path.join(__dirname, 'serve.cjs'), '0'], { env: { ...process.env, WA_SCRM_DATA_DIR: '', WA_SCRM_AI_ENV: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const base = await new Promise((resolve, reject) => {
      let out = '';
      child.stdout.on('data', chunk => { out += chunk; const m = out.match(/PREVIEW_URL=(http:\/\/127\.0\.0\.1:\d+)/); if (m) resolve(m[1]); });
      child.on('exit', code => reject(new Error('serve.cjs exited early: ' + code)));
      setTimeout(() => reject(new Error('serve.cjs did not start')), 8000);
    });
    const font = await fetch(base + '/fonts/noto-color-emoji-v50-9.woff2');
    assert.deepEqual([font.status, font.headers.get('content-type'), font.headers.get('cache-control')], [200, 'font/woff2', 'public, max-age=31536000, immutable']);
    assert.equal(Buffer.from(await font.arrayBuffer()).subarray(0, 4).toString('latin1'), 'wOF2');
    for (const file of ['/app.js', '/app.css', '/fonts/noto-color-emoji-OFL.txt']) {
      const answer = await fetch(base + file);
      assert.deepEqual([answer.status, answer.headers.get('cache-control')], [200, 'no-store'], file);
      await answer.arrayBuffer();
    }
  } finally {
    child.kill();
  }
});

test('the preview server: without a data folder the routes are off; with one, the AI relay answers signed-in users only', async () => {
```

#### `validate-scrm-lifecycle.cjs`

**Edit 4.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// A page whose saving goes wrong keeps trying and says so (plan 067): every save has a time limit, a guard catches
```

Replace them with:

```text
assert(read(path.join(__dirname, 'fidelity-subsite.js')).includes('subsiteLogout:()=>window.WA_SITE.signOut()'), 'signing out must end the session on the server');
// Every emoji drawn the same way on every computer (plan 068): the eleven parts of Noto Color Emoji (SIL OFL 1.1) and
// its licence are shipped as they are and copied by the build; the page's style sheet names each part with its
// characters and the colour format it needs, after the fonts of the text; the server sends the parts as fonts the
// browser keeps.
const emojiFontDir = path.join(__dirname, 'fonts');
const emojiParts = Array.from({ length: 11 }, (_, n) => `noto-color-emoji-v50-${n}.woff2`);
const emojiFiles = [...emojiParts, 'noto-color-emoji-OFL.txt'].sort();
assert.deepEqual(fs.readdirSync(emojiFontDir).sort(), emojiFiles, 'work/wa-replica/fonts must hold the eleven parts of the emoji font and its licence');
assert.deepEqual(fs.readdirSync(path.join(out, 'fonts')).sort(), emojiFiles, 'the built fonts folder must hold the same files');
for (const file of emojiFiles) assert(fs.readFileSync(path.join(out, 'fonts', file)).equals(fs.readFileSync(path.join(emojiFontDir, file))), `fonts/${file} must be the built copy`);
assert(read(path.join(emojiFontDir, 'noto-color-emoji-OFL.txt')).includes('SIL Open Font License, Version 1.1'), 'the licence of the emoji font must be shipped');
const builtCss = read(path.join(out, 'app.css'));
for (const file of emojiParts) assert(builtCss.includes(`src:url("fonts/${file}") format("woff2") tech(color-COLRv1); unicode-range:U+`), `app.css must name ${file}`);
assert.equal((builtCss.match(/font-family:"SCRM Emoji"/g) || []).length, 11, 'app.css must have the eleven parts of the emoji font');
assert(builtCss.includes('font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei","SCRM Emoji",sans-serif;'), 'the emoji font must come after the fonts of the text');
for (const required of ["'.woff2': 'font/woff2',", "'Cache-Control': pathname.startsWith('/fonts/') && pathname.endsWith('.woff2') ? 'public, max-age=31536000, immutable' : 'no-store',"]) {
  assert(read(path.join(__dirname, 'serve.cjs')).includes(required), `serve.cjs is missing ${required}`);
}
// A page whose saving goes wrong keeps trying and says so (plan 067): every save has a time limit, a guard catches
```

**Edit 4.3** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  saveGuard: 'every save of the page has a time limit of 30 s and a guard around it: whatever goes wrong, the changes stay, the page says they are not saved and tries again, and the server\'s log is told once for each kind of trouble (POST /api/site/report, signed in; who, sub-site, kind, status, the first plain words of the error, never data)',
```

Replace them with:

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  ownEmoji: 'emoji are drawn with Noto Color Emoji (SIL OFL 1.1; work/wa-replica/fonts, copied by the build) in eleven parts named by their characters: a browser loads only the parts of the emoji on screen and keeps them (font/woff2, immutable); digits and signs keep the fonts of the text; a browser that cannot draw the colour format keeps its own emoji',
  saveGuard: 'every save of the page has a time limit of 30 s and a guard around it: whatever goes wrong, the changes stay, the page says they are not saved and tries again, and the server\'s log is told once for each kind of trouble (POST /api/site/report, signed in; who, sub-site, kind, status, the first plain words of the error, never data)',
```

**Verify**: `sha256sum work/wa-replica/site-api.test.cjs work/wa-replica/validate-scrm-lifecycle.cjs` → `cbf84d71085dc1d0e9d078dfef51577f9839aa3bbb1cd923b3bcb0fb5d3ee8be`, `22b3a2b8a531715359814f81c61b1c9eb7bb4eb2c0acb86890a619a07c97a4f8`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 20`, `fail 0`. If a checksum does not match, restore the file and apply its edits again, once; if it still does not match, STOP.

### Step 5: Build log, final verification

#### `replica/build-log.md`

**Append 5.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 表情符号在任何电脑上都能显示：使用 Noto Color Emoji · 2026-11-25

客户发来的较新的表情（例如 2021 年加入的 🥹）在一些电脑上显示为空方框：SCRM 和普通网页一样，用电脑自带的表情字体来显示表情，而 Windows 10 的表情字体没有 2021 年以后的表情。WhatsApp 自己画表情，所以在任何设备上都一样。现在 SCRM 自带一套表情字体：

- 使用 Google 的开源表情字体 Noto Color Emoji（SIL Open Font License 1.1，许可文件随字体一起提供）。WhatsApp 自己的表情图案不能复制。
- 字体分成 11 个部分（共约 2 MB），浏览器只下载屏幕上出现的表情所在的部分（常用笑脸所在的部分约 140 KB），下载一次后由浏览器保存，以后不再下载。
- 数字、符号等文字仍使用原来的文字字体，只有表情使用新字体。
- 不支持这种彩色字体格式的浏览器（目前主要是 Safari）继续使用系统自带的表情；苹果设备的表情本来就是完整的。
- 消息、会话列表、输入框和对话框中的表情都使用新字体。

验证：构建与校验脚本通过；子站接口测试新增一项（字体以 font/woff2 发送并由浏览器保存，页面文件仍每次重新获取）；浏览器测试覆盖：含 🥹 的消息只下载它所在的部分、用彩色字体画出、刷新后不再下载，数字的宽度不变。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout b3bba44 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-068/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `8b533250c9024a0a21b033613eb431e30e61c31943a37460f62d9cbd89524184`; `git status --porcelain` lists the six files of the table in "Current state" and `outputs/wa-replica-prototype/app.css`, `validation.json` as changed, and `work/wa-replica/fonts/` and `outputs/wa-replica-prototype/fonts/` as new — nothing else. Commit everything (both font folders included). After the commit `git status --porcelain` must be empty.

## Test plan

- **Sign-in and data tests** (20): the new test (pattern: the test of the preview server after it) starts `serve.cjs` and asks for a font part — 200, `font/woff2`, `public, max-age=31536000, immutable`, a WOFF2 file — and for `/app.js`, `/app.css` and the licence — 200 and `no-store`.
- **Validator** — the twelve files in both font folders and identical; the licence; eleven `@font-face` rules in the built `app.css`, each with its part and `tech(color-COLRv1)`; the family after the fonts of the text; the type and caching in `serve.cjs`.
- **Smoke** (`/tmp/wa-scrm-plan-068/smoke.sh`) — the same facts, the checksums of two font files, all three test files, which built files changed and the syntax of the server and the build.
- **Verified by the reviewer, not by you**: in a browser on a machine without any emoji font — a message with 🥹 is drawn in colour (without the font it is not), only the parts on screen are loaded (not the flags), as `font/woff2` kept by the browser and taken from its cache after a reload; the bubble and the message box use the same fonts; digits and signs measure exactly as without the emoji font; the site suite.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout b3bba44 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 17`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 20`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-068/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `b07f7085eab601f1841233354776cd6f5afce6db95fa87144889c5c8b9e6e7d4`
- [ ] `sha256sum work/wa-replica/build-fidelity.cjs` → `406f9ceb362350963efa7faccb5548a81e2baa028125401762f8c4b30e4a38d5`
- [ ] `sha256sum work/wa-replica/serve.cjs` → `d7d59534ce481d81075aac11dbbbb696ff14106cd2ba06939c3d419dcf949ca5`
- [ ] `sha256sum work/wa-replica/site-api.test.cjs` → `cbf84d71085dc1d0e9d078dfef51577f9839aa3bbb1cd923b3bcb0fb5d3ee8be`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `22b3a2b8a531715359814f81c61b1c9eb7bb4eb2c0acb86890a619a07c97a4f8`
- [ ] `sha256sum replica/build-log.md` → `8b533250c9024a0a21b033613eb431e30e61c31943a37460f62d9cbd89524184`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `7876a884f78044ab004a853cca575654ea3934cdd27f517f3f1278744a17c2c3`
- [ ] `git diff --name-only b3bba44..HEAD -- outputs` lists `app.css`, `validation.json` and the twelve files of `fonts/` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `(cd work/wa-replica/fonts && sha256sum noto-color-emoji-v50-0.woff2 noto-color-emoji-v50-1.woff2 noto-color-emoji-v50-2.woff2 noto-color-emoji-v50-3.woff2 noto-color-emoji-v50-4.woff2 noto-color-emoji-v50-5.woff2 noto-color-emoji-v50-6.woff2 noto-color-emoji-v50-7.woff2 noto-color-emoji-v50-8.woff2 noto-color-emoji-v50-9.woff2 noto-color-emoji-v50-10.woff2 noto-color-emoji-OFL.txt)` → the checksums of Step 2
- [ ] `diff -rq work/wa-replica/fonts outputs/wa-replica-prototype/fonts` prints nothing
- [ ] `git diff --name-only b3bba44..HEAD -- . ':!plans'` lists exactly thirty-two paths: the six of the table, `app.css`, `validation.json` and the twelve files of each font folder; of these in "Current state" and the two output files
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, or a test fails.
- An output file other than `app.css`, `validation.json` and the new font folder changes.
- A download fails twice, or a downloaded file's checksum differs from Step 2's table.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file, creating a file other than the twelve font files of Step 2, or installing a package.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else. A page that is open gets the font when it is opened again.
- A later version of the font: download the parts under new names (the version in the name), change the eleven rules, the validator's list and the smoke checksums; never replace a part under its old name — browsers keep the old one for a year.
- Emoji that come after this version of the font (none on 2026-11-25) fall back to the computer's own font, as all emoji did before.
- What a reviewer should scrutinise: that digits and signs keep the fonts of the text (the family is after them); that a browser without COLRv1 keeps its own emoji (`tech(color-COLRv1)`); that only the font parts are kept by the browser.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
