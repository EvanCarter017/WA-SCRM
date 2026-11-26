# Plan 081: The page's text in HarmonyOS Sans SC, shipped with the app

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat d5f30af..HEAD -- work/wa-replica deploy/gateway.conf replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MEDIUM (two font files of about 8 MB each go into the repository and to every browser; the server and the gateway send a new kind of file; exact text and checksums for every file)
- **Depends on**: none (first plan of the UI upgrade; plans/068-own-emoji.md and plans/069-lighter-page.md, both DONE, made the parts this plan extends: the fonts folder, the font rules, the server's caching and the gateway's compression)
- **Category**: owner decision of 2026-11-26 (UI upgrade, Pass A). A friend of the owner suggested HarmonyOS Sans SC as the font family; asked how to use it, the owner chose **"Ship it with the app"**
- **Planned at**: commit `d5f30af`, 2026-11-26

## Why this matters

The owner approved a UI upgrade of the workbench (Pass A: plans 081–084; Pass B: 085–087). Its typography starts with the font: a friend of the owner suggested **HarmonyOS Sans SC** (Huawei's font for Simplified Chinese, with Latin letters), and the owner chose in a question dialog to **ship it with the app**, so that every computer shows the same text — over the alternative of using it only where it is installed. Today the page asks for `system-ui,-apple-system,"Segoe UI","Microsoft YaHei"`, which draws different letters on every system.

The font's licence (HarmonyOS Sans Fonts License Agreement, Huawei Device Co., Ltd., 2021 — read in full from the official package) allows use, copying, bundling and redistribution of **unmodified** copies with any software except fonts software, on four conditions: (1) a prominent notice in the software that HarmonyOS Sans Fonts are used; (2) no modification of the fonts or their components — so the files are **not** subset, renamed inside or converted to WOFF2; (3) no redistribution on their own; (4) the copyright notice and the Agreement kept with every copy. This plan fulfils (1) with a line on the sign-in screen, (2) by copying Huawei's files byte for byte (checked by SHA-256 in the validator), (3) by shipping them only as part of the page, (4) by shipping the licence file beside them.

Two weights: **Regular (400) and Bold (700)**. The style sheets use weights 400 (18 rules), 500 (4), 550 (3), 600 (14), 650 (15), 680, 700 (15), 720, 750 (12) and 800; by the browser's matching rules a weight up to 500 is drawn with Regular and a heavier one with Bold, so the page's emphasis stays as it is without a third file. The files are 8,261,128 and 8,158,996 bytes; compressed by the gateway (gzip level 5) they come to 5,604,166 and 5,640,001 bytes — about 11 MB once per browser, which then keeps them a year without asking.

A font that arrives after the first drawing changes the room the letters take: a conversation that showed its latest message could be left short of it (the scroll anchoring of plans 066/071). Shown in a browser (the reviewer's harness, 2026-11-26, the font held back 4 s while a conversation of 40 long messages was open, with a fallback drawn at 70% of its size so that the conversation grows when the font arrives): the conversation grew from 9,377 to 10,812 px and **stayed at its end** with this plan's wait for the font; with that wait switched off it was left 26 px short. Without a narrowed fallback (this machine's own fonts) the change was 3 px. The same run showed the notice on the sign-in screen, messages, translations and the customer's name drawn with HarmonyOS Sans SC, and the file served as `font/ttf` with `public, max-age=31536000, immutable`.

### Decisions already made (do not re-open; do not ask)

- Files: `HarmonyOS_Sans_SC_Regular.ttf` and `HarmonyOS_Sans_SC_Bold.ttf` from `HarmonyOS-Sans.zip` (`https://developer.huawei.com/images/download/general/HarmonyOS-Sans.zip`, folder `HarmonyOS Sans/HarmonyOS_Sans_SC/`), byte for byte, under their own names; the package's `LICENSE.txt` of that folder, byte for byte, as `HarmonyOS-Sans-LICENSE.txt` (32,768 bytes: the text and then zero bytes, as Huawei ships it — keep them). All three go into `work/wa-replica/fonts/`, which the build copies whole; the reviewer has put the three files at `/tmp/claude-1000/-home-ubuntu/0b224d1f-56b8-4f12-85c2-9a6b33418edd/scratchpad/harmonyos-sc`.
- Style sheet: two `@font-face` rules (`font-display:swap`, `format("truetype")`) before the `.fidelity` rule, and `"HarmonyOS Sans SC"` first in its font list; the emoji font stays after the fonts of the text. No preload (a preload that does not match the font's request exactly would load 8 MB twice).
- Notice: `<p class="fid-sign-in-font">本系统使用 HarmonyOS Sans 字体</p>` ("This system uses the HarmonyOS Sans font") at the end of the sign-in panel in `fidelity-index.html`, shown in every state of the sign-in screen; one style rule `.fid-sign-in-font` (12px, the muted text colour).
- A conversation at its end stays there: in `fidelity-openwa.js`, right after the wait for pictures and videos, every `FontFace` of the family waits for its `loaded` promise and then calls `openwaShowEnd()` if `openwaAtEnd` — the same rule as for a picture that takes its height.
- Server (`serve.cjs`): `'.ttf': 'font/ttf'` in its types, and files under `/fonts/` ending in `.woff2` **or** `.ttf` are kept by the browser without asking (`public, max-age=31536000, immutable`), like the emoji parts. Gateway (`deploy/gateway.conf`): `font/ttf` added to `gzip_types`.
- Checks: the validator knows the files and their SHA-256, the rules, the font list, the notice, the wait for the font, the server's type and caching, the gateway's compression, and a summary entry `textFont`; the site test of the preview server also asks for the Regular file (type, caching, the TrueType signature) — no new test, still 20.
- Not changed: the emoji font and its rules, every other style rule, the base app, the other modules, `build-fidelity.cjs` (it already copies the whole fonts folder), the other deploy files.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity.css` | `f6bf1b8a18760ad6c1811dce7e9cc3871da765dc540e239bf99dbb02aaae73bb` | `16c130b67cc7f4b33e313a7e5e1e9cca903cb9d84922292e331ccede3f59f399` | 2 |
| `work/wa-replica/fidelity-index.html` | `1a68acf55dca4c1526bbb029fd5fd59a67e18e2d2b566cea6eac1f1f0b4a33b3` | `f315a41d8076f0cf72407c9aa7402e8d0cceaf7779c93d44aa1bf71d5f72fcbd` | 1 |
| `work/wa-replica/fidelity-openwa.js` | `72588afc9ce0ceee61fc57e9c10d215f9a6c4eae89888f253efc67f8430529c5` | `87af995fa4ddca09440d01c155f30c7b821124d61c87f57eb125a372f1d26193` | 1 |
| `work/wa-replica/serve.cjs` | `2544469cee3e04a82fdbc95f94f6dc4ec49848dcc967a2e4f8fb7015c52ceead` | `896053fea65b010c449a912747bbdcc1d2e2fa474038677cac7cb57248456296` | 2 |
| `deploy/gateway.conf` | `7d18eeb78b0eaa98ac7e2e7f58632ecaafa06bb976e6e631da7d5e26834094f6` | `c8dbd6054700b202fdb2cc4ce8ca9d8a0a690b80f1c6be442d1c92fd1743cab3` | 2 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `7cc8299ef799d9211752500b03fe1eedc8d2424ad6005d561fca12ef4016a3b7` | `04085b6527101da10b7389dc9033278b616f6d6b71006046cbe3f3b59d9297e5` | 4 |
| `work/wa-replica/site-api.test.cjs` | `901ba78c7686809b808e5f021fbf95b5f7779ff78879a1c4e9f39a93a3806312` | `b49c7f388b533a5554d354ce5f98c8ff703c0a68d5a3aba558ebdd06e99fc23a` | 2 |
| `replica/build-log.md` | `bd05d9dcb326d40c4099389a00442e7fb4f847e1e60da26da08ed83009813319` | `94418e1f200567585a5e10d31d906eb4339ed177ef491cdafd60bc539722a6d3` | 1 append |

### The files this plan adds (copied, never written by hand)

| File | Bytes | sha256 |
|---|---|---|
| `work/wa-replica/fonts/HarmonyOS_Sans_SC_Regular.ttf` | 8,261,128 | `297b088424be212207df2ce8b98e335468b782aa6b96832af0b8b773d711e2b1` |
| `work/wa-replica/fonts/HarmonyOS_Sans_SC_Bold.ttf` | 8,158,996 | `43a424b85e47fb53a17b3b32026a71801f86f8e022ca6798d186b47d39fa5f01` |
| `work/wa-replica/fonts/HarmonyOS-Sans-LICENSE.txt` | 32,768 | `b2ffec0e6269ee41c3b5fc0345ab37600b46d66ebea6c9c58ff37f517bdfa164` |

- `fidelity.css` — the page's own style sheet, built into `outputs/wa-replica-prototype/app.css`; it starts with the eleven `@font-face` rules of the emoji font, then the `.fidelity` rule with the page's font list; the sign-in rules (`.fid-sign-in-…`) follow later.
- `fidelity-index.html` — the page; the build copies it to `outputs/wa-replica-prototype/index.html`. The sign-in panel is `main#subsite-login` near its top.
- `fidelity-openwa.js` — the WhatsApp module; near its top `openwaAtEnd`, `openwaNoteEnd`, `openwaShowEnd` and the wait for pictures and videos keep a conversation at its end.
- `serve.cjs` — the page's server: `mime` (the types of files) and `serveFile` (the caching headers).
- `deploy/gateway.conf` — the gateway's configuration (nginx); `deploy/upgrade.sh` tests it and reloads the gateway when it changed.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `site-api.test.cjs` — tests of the server; one of them starts `serve.cjs` and asks for files.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). It copies every file of `work/wa-replica/fonts/` to `outputs/wa-replica-prototype/fonts/` and turns every `px` value of the fidelity style sheets into a size token in `tokens.css` — this plan adds no new `px` value, so `tokens.css` must come out unchanged. After this plan's build exactly these output files differ: `app.js`, `app.css`, `index.html`, `validation.json` (written by the validator), and the three new files in `outputs/wa-replica-prototype/fonts/`.

## Commands you will need

Run from the repository root of **your working copy** (the clone you were given — never any other checkout).

**The tests and the smoke script need Node 22.13 or newer** (the server's accounts and data use `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout d5f30af -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| All tests | `$NODE --test` | `tests 90`, `pass 90`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-081/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify or add):

- `work/wa-replica/fonts/HarmonyOS_Sans_SC_Regular.ttf`, `HarmonyOS_Sans_SC_Bold.ttf`, `HarmonyOS-Sans-LICENSE.txt` — new, **copied** (Step 2)
- `work/wa-replica/fidelity.css`, `work/wa-replica/fidelity-index.html`, `work/wa-replica/fidelity-openwa.js`, `work/wa-replica/serve.cjs`, `deploy/gateway.conf` (Step 3)
- `work/wa-replica/validate-scrm-lifecycle.cjs`, `work/wa-replica/site-api.test.cjs` (Step 4)
- `replica/build-log.md` (Step 5)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.js`, `app.css`, `index.html`, `validation.json` and the three files in `outputs/wa-replica-prototype/fonts/` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — the emoji font files and their licence, `build-fidelity.cjs`, the other style sheets, the base app, the other modules, `fidelity-boot.js`, `fidelity-master.js`, the other files of `deploy/`, `plans/**`, earlier entries of `replica/build-log.md`. Never open, convert, subset or re-save a font file. Do not install anything. Do not download anything.

## Git workflow

- Work on the branch your working copy is already on (`advisor/081-text-font`). If (and only if) you find yourself on `main`, create and switch to `advisor/081-text-font` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): draw the page's text in HarmonyOS Sans SC`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, very long lines, quotes and backslashes; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 14 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums in "Current state" tell you whether every file is exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-081/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-081 && cat > /tmp/wa-scrm-plan-081/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 081: the page's text in HarmonyOS Sans SC — Huawei's Regular and Bold files, unmodified, with their
# licence; the notice on the sign-in screen; the server and the gateway sending the font; a conversation at its end
# staying there when the font arrives. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the Regular font file is unmodified' "$(sha256sum "$W/fonts/HarmonyOS_Sans_SC_Regular.ttf" 2>/dev/null | cut -c1-64)" 297b088424be212207df2ce8b98e335468b782aa6b96832af0b8b773d711e2b1
same 'the Bold font file is unmodified' "$(sha256sum "$W/fonts/HarmonyOS_Sans_SC_Bold.ttf" 2>/dev/null | cut -c1-64)" 43a424b85e47fb53a17b3b32026a71801f86f8e022ca6798d186b47d39fa5f01
same 'the licence of the font is beside it, unmodified' "$(sha256sum "$W/fonts/HarmonyOS-Sans-LICENSE.txt" 2>/dev/null | cut -c1-64)" b2ffec0e6269ee41c3b5fc0345ab37600b46d66ebea6c9c58ff37f517bdfa164
has 'the style sheet names the Regular file' "$W/fidelity.css" '@font-face { font-family:"HarmonyOS Sans SC"; font-style:normal; font-weight:400; font-display:swap; src:url("fonts/HarmonyOS_Sans_SC_Regular.ttf") format("truetype"); }'
has 'the style sheet names the Bold file' "$W/fidelity.css" '@font-face { font-family:"HarmonyOS Sans SC"; font-style:normal; font-weight:700; font-display:swap; src:url("fonts/HarmonyOS_Sans_SC_Bold.ttf") format("truetype"); }'
has 'the text font comes first, the emoji font after the fonts of the text' "$W/fidelity.css" 'font-family:"HarmonyOS Sans SC",system-ui,-apple-system,"Segoe UI","Microsoft YaHei","SCRM Emoji",sans-serif;'
has 'the sign-in screen says that the font is used' "$W/fidelity-index.html" '<p class="fid-sign-in-font">本系统使用 HarmonyOS Sans 字体</p>'
has 'a conversation at its end stays there when the font arrives' "$W/fidelity-openwa.js" "=== 'HarmonyOS Sans SC') face.loaded.then(() => { if (openwaAtEnd) openwaShowEnd(); }, () => {});"
has 'the server sends the font as a font' "$W/serve.cjs" "'.ttf': 'font/ttf',"
has 'the browser keeps the font' "$W/serve.cjs" "/\.(woff2|ttf)\$/.test(pathname) ? 'public, max-age=31536000, immutable'"
has 'the gateway compresses the font' "$ROOT/deploy/gateway.conf" 'gzip_types text/css application/javascript application/json text/plain font/ttf;'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  textFont: 'the page draws its text in HarmonyOS Sans SC"
has 'the site test asks for the font' "$W/site-api.test.cjs" "fetch(base + '/fonts/HarmonyOS_Sans_SC_Regular.ttf')"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 界面字体：HarmonyOS Sans SC · 2026-11-26'
same 'the build copied the three font files' "$(cmp -s "$W/fonts/HarmonyOS_Sans_SC_Regular.ttf" "$O/fonts/HarmonyOS_Sans_SC_Regular.ttf" && cmp -s "$W/fonts/HarmonyOS_Sans_SC_Bold.ttf" "$O/fonts/HarmonyOS_Sans_SC_Bold.ttf" && cmp -s "$W/fonts/HarmonyOS-Sans-LICENSE.txt" "$O/fonts/HarmonyOS-Sans-LICENSE.txt" && echo COPIED)" COPIED
has 'the built style sheet names the font' "$O/app.css" 'font-family:"HarmonyOS Sans SC",system-ui,'
has 'the built sign-in screen has the notice' "$O/index.html" '本系统使用 HarmonyOS Sans 字体'
same 'of the built files only the page, its style sheet, its HTML, the validation and the three font files changed' "$(cd "$ROOT" && git status --porcelain --untracked-files=all -- outputs | grep -vcE '(app\.js|app\.css|index\.html|validation\.json|fonts/HarmonyOS_Sans_SC_Regular\.ttf|fonts/HarmonyOS_Sans_SC_Bold\.ttf|fonts/HarmonyOS-Sans-LICENSE\.txt)$')" 0
same 'no size token changed' "$(cd "$ROOT" && git status --porcelain -- outputs/wa-replica-prototype/tokens.css | wc -l)" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the price file pass' "$("$NODE" --test "$W/price-file.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the provisioner pass' "$("$NODE" --test "$W/site-provisioner.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 13 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-081/smoke.sh && ls -l /tmp/wa-scrm-plan-081/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity.css work/wa-replica/fidelity-index.html work/wa-replica/fidelity-openwa.js work/wa-replica/serve.cjs deploy/gateway.conf work/wa-replica/validate-scrm-lifecycle.cjs work/wa-replica/site-api.test.cjs replica/build-log.md` → the "at the planned commit" values of the first table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-081/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the Regular font file is unmodified` (got: nothing), `the Bold font file is unmodified` (got: nothing), `the licence of the font is beside it, unmodified` (got: nothing), `the style sheet names the Regular file`, `the style sheet names the Bold file`, `the text font comes first, the emoji font after the fonts of the text`, `the sign-in screen says that the font is used`, `a conversation at its end stays there when the font arrives`, `the server sends the font as a font`, `the browser keeps the font`, `the gateway compresses the font`, `the validator knows it`, `the site test asks for the font`, `the build log has the entry`, `the build copied the three font files` (got: nothing), `the built style sheet names the font`, `the built sign-in screen has the notice`; every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: Copy the font files and their licence

Copy the three files exactly as they are (`cp`, nothing else — never open or re-save them):

```bash
SRC=/tmp/claude-1000/-home-ubuntu/0b224d1f-56b8-4f12-85c2-9a6b33418edd/scratchpad/harmonyos-sc
cp "$SRC/HarmonyOS_Sans_SC_Regular.ttf" work/wa-replica/fonts/HarmonyOS_Sans_SC_Regular.ttf
cp "$SRC/HarmonyOS_Sans_SC_Bold.ttf" work/wa-replica/fonts/HarmonyOS_Sans_SC_Bold.ttf
cp "$SRC/LICENSE.txt" work/wa-replica/fonts/HarmonyOS-Sans-LICENSE.txt
sha256sum work/wa-replica/fonts/HarmonyOS_Sans_SC_Regular.ttf work/wa-replica/fonts/HarmonyOS_Sans_SC_Bold.ttf work/wa-replica/fonts/HarmonyOS-Sans-LICENSE.txt
```

**Verify**: the three checksums are `297b088424be212207df2ce8b98e335468b782aa6b96832af0b8b773d711e2b1`, `43a424b85e47fb53a17b3b32026a71801f86f8e022ca6798d186b47d39fa5f01`, `b2ffec0e6269ee41c3b5fc0345ab37600b46d66ebea6c9c58ff37f517bdfa164` (in that order); `ls work/wa-replica/fonts | wc -l` → `15`. If the folder `/tmp/claude-1000/-home-ubuntu/0b224d1f-56b8-4f12-85c2-9a6b33418edd/scratchpad/harmonyos-sc` or a file in it is missing, or a checksum differs, STOP (do not download the files yourself).

### Step 3: The font in the style sheet, the notice, the wait for the font, the server and the gateway

#### `fidelity.css`

**Edit 3.1** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
@font-face { font-family:"SCRM Emoji"; font-style:normal; font-weight:400; font-display:swap; src:url("fonts/noto-color-emoji-v50-10.woff2") format("woff2") tech(color-COLRv1); unicode-range:U+1f6d9,U+1fa8b-1fa8d,U+1facc,U+1fadd,U+1faeb; }
.fidelity { --fid-sidebar:240px; --fid-top:107px; --fid-gradient:linear-gradient(115deg,var(--fid-violet),var(--fid-royal)); font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei","SCRM Emoji",sans-serif; }
.fidelity .app-shell { --list:300px; }
```

Replace them with:

```text
@font-face { font-family:"SCRM Emoji"; font-style:normal; font-weight:400; font-display:swap; src:url("fonts/noto-color-emoji-v50-10.woff2") format("woff2") tech(color-COLRv1); unicode-range:U+1f6d9,U+1fa8b-1fa8d,U+1facc,U+1fadd,U+1faeb; }
/* The text of the page in HarmonyOS Sans SC (plan 081): Huawei's own files, unmodified, under the HarmonyOS Sans Fonts
   License Agreement (fonts/HarmonyOS-Sans-LICENSE.txt), which asks for the notice on the sign-in screen. Regular and
   Bold: a weight up to 500 is drawn Regular, a heavier one Bold. A browser loads a weight when text needs it and keeps
   it; until it is there, and where it cannot be loaded, the fonts after it draw the text. */
@font-face { font-family:"HarmonyOS Sans SC"; font-style:normal; font-weight:400; font-display:swap; src:url("fonts/HarmonyOS_Sans_SC_Regular.ttf") format("truetype"); }
@font-face { font-family:"HarmonyOS Sans SC"; font-style:normal; font-weight:700; font-display:swap; src:url("fonts/HarmonyOS_Sans_SC_Bold.ttf") format("truetype"); }
.fidelity { --fid-sidebar:240px; --fid-top:107px; --fid-gradient:linear-gradient(115deg,var(--fid-violet),var(--fid-royal)); font-family:"HarmonyOS Sans SC",system-ui,-apple-system,"Segoe UI","Microsoft YaHei","SCRM Emoji",sans-serif; }
.fidelity .app-shell { --list:300px; }
```

**Edit 3.2** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-sign-in-note { margin:0; color:var(--fid-quiet); font-size:13px; line-height:20px; text-align:center; }
.fid-sign-in-form { display:grid; gap:14px; width:100%; }
```

Replace them with:

```text
.fid-sign-in-note { margin:0; color:var(--fid-quiet); font-size:13px; line-height:20px; text-align:center; }
.fid-sign-in-font { margin:0; color:var(--color-text-muted); font-size:12px; line-height:20px; text-align:center; }
.fid-sign-in-form { display:grid; gap:14px; width:100%; }
```

#### `fidelity-index.html`

**Edit 3.3** — `work/wa-replica/fidelity-index.html`. Find exactly these lines (they occur once):

```text
      <button id="site-leave" class="link" type="button" hidden>退出登录</button>
    </div>
```

Replace them with:

```text
      <button id="site-leave" class="link" type="button" hidden>退出登录</button>
      <p class="fid-sign-in-font">本系统使用 HarmonyOS Sans 字体</p>
    </div>
```

#### `fidelity-openwa.js`

**Edit 3.4** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    }, true);
  }

  // The mark after the time of a message the employee sent.
```

Replace them with:

```text
    }, true);
  }
  // The text font (plan 081) comes after the first drawing, and its letters take other room than the ones drawn
  // before it: a conversation that showed its end goes on showing it once a weight of the font is there.
  document.fonts?.forEach(face => {
    if (face.family.replace(/"/g, '') === 'HarmonyOS Sans SC') face.loaded.then(() => { if (openwaAtEnd) openwaShowEnd(); }, () => {});
  });

  // The mark after the time of a message the employee sent.
```

#### `serve.cjs`

**Edit 3.5** — `work/wa-replica/serve.cjs`. Find exactly these lines (they occur once):

```text
  '.woff2': 'font/woff2',
};
```

Replace them with:

```text
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};
```

**Edit 3.6** — `work/wa-replica/serve.cjs`. Find exactly these lines (they occur once):

```text
  const kept = {
    // The parts of the emoji font never change under their name (plan 068): the browser keeps them without asking.
    'Cache-Control': pathname.startsWith('/fonts/') && pathname.endsWith('.woff2') ? 'public, max-age=31536000, immutable' : 'no-cache',
    ETag: tag,
```

Replace them with:

```text
  const kept = {
    // The parts of the emoji font (plan 068) and the text font (plan 081) never change under their name: the browser
    // keeps them without asking.
    'Cache-Control': pathname.startsWith('/fonts/') && /\.(woff2|ttf)$/.test(pathname) ? 'public, max-age=31536000, immutable' : 'no-cache',
    ETag: tag,
```

#### `deploy/gateway.conf`

**Edit 3.7** — `deploy/gateway.conf`. Find exactly these lines (they occur once):

```text
    # data come to about a quarter of their size. Also when a proxy or a VPN is on the way, which nginx leaves out by
    # default; pictures, sound and fonts are compressed already.
    gzip on;
```

Replace them with:

```text
    # data come to about a quarter of their size. Also when a proxy or a VPN is on the way, which nginx leaves out by
    # default; pictures, sound and the emoji font are compressed already. The text font (TrueType, plan 081) comes to
    # about two thirds of its size.
    gzip on;
```

**Edit 3.8** — `deploy/gateway.conf`. Find exactly these lines (they occur once):

```text
    gzip_vary on;
    gzip_types text/css application/javascript application/json text/plain;

```

Replace them with:

```text
    gzip_vary on;
    gzip_types text/css application/javascript application/json text/plain font/ttf;

```

What these edits do, so that you can recognise them: in `fidelity.css` a comment and two `@font-face` rules come before the `.fidelity` rule, whose font list starts with `"HarmonyOS Sans SC"`, and the rule `.fid-sign-in-font` follows `.fid-sign-in-note`; in `fidelity-index.html` the notice is the last element of the sign-in panel, after the 退出登录 button; in `fidelity-openwa.js` the wait for the font follows the wait for pictures and videos; in `serve.cjs` the type `.ttf` and the caching of `.ttf` under `/fonts/`; in `deploy/gateway.conf` the comment and `gzip_types`.

**Verify**: `sha256sum work/wa-replica/fidelity.css work/wa-replica/fidelity-index.html work/wa-replica/fidelity-openwa.js work/wa-replica/serve.cjs deploy/gateway.conf` → `16c130b67cc7f4b33e313a7e5e1e9cca903cb9d84922292e331ccede3f59f399`, `f315a41d8076f0cf72407c9aa7402e8d0cceaf7779c93d44aa1bf71d5f72fcbd`, `87af995fa4ddca09440d01c155f30c7b821124d61c87f57eb125a372f1d26193`, `896053fea65b010c449a912747bbdcc1d2e2fa474038677cac7cb57248456296`, `c8dbd6054700b202fdb2cc4ce8ca9d8a0a690b80f1c6be442d1c92fd1743cab3`. If a checksum does not match, restore the file (`git checkout -- <file>`) and apply its edits again, once; if it still does not match, STOP.

### Step 4: The validator and the site test — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 4.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
const emojiFiles = [...emojiParts, 'noto-color-emoji-OFL.txt'].sort();
assert.deepEqual(fs.readdirSync(emojiFontDir).sort(), emojiFiles, 'work/wa-replica/fonts must hold the eleven parts of the emoji font and its licence');
assert.deepEqual(fs.readdirSync(path.join(out, 'fonts')).sort(), emojiFiles, 'the built fonts folder must hold the same files');
for (const file of emojiFiles) assert(fs.readFileSync(path.join(out, 'fonts', file)).equals(fs.readFileSync(path.join(emojiFontDir, file))), `fonts/${file} must be the built copy`);
assert(read(path.join(emojiFontDir, 'noto-color-emoji-OFL.txt')).includes('SIL Open Font License, Version 1.1'), 'the licence of the emoji font must be shipped');
```

Replace them with:

```text
const emojiFiles = [...emojiParts, 'noto-color-emoji-OFL.txt'].sort();
// The text in HarmonyOS Sans SC (plan 081): Huawei's own files, unmodified as their licence asks — the bytes of
// HarmonyOS-Sans.zip from developer.huawei.com — with the licence beside them and the notice on the sign-in screen.
const textFont = {
  'HarmonyOS_Sans_SC_Regular.ttf': '297b088424be212207df2ce8b98e335468b782aa6b96832af0b8b773d711e2b1',
  'HarmonyOS_Sans_SC_Bold.ttf': '43a424b85e47fb53a17b3b32026a71801f86f8e022ca6798d186b47d39fa5f01',
  'HarmonyOS-Sans-LICENSE.txt': 'b2ffec0e6269ee41c3b5fc0345ab37600b46d66ebea6c9c58ff37f517bdfa164',
};
const fontFiles = [...emojiFiles, ...Object.keys(textFont)].sort();
assert.deepEqual(fs.readdirSync(emojiFontDir).sort(), fontFiles, 'work/wa-replica/fonts must hold the eleven parts of the emoji font, the text font and their licences');
assert.deepEqual(fs.readdirSync(path.join(out, 'fonts')).sort(), fontFiles, 'the built fonts folder must hold the same files');
for (const [file, hash] of Object.entries(textFont)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(emojiFontDir, file))).digest('hex'), hash, `fonts/${file} must be Huawei's file, unmodified`);
for (const file of fontFiles) assert(fs.readFileSync(path.join(out, 'fonts', file)).equals(fs.readFileSync(path.join(emojiFontDir, file))), `fonts/${file} must be the built copy`);
assert(read(path.join(emojiFontDir, 'noto-color-emoji-OFL.txt')).includes('SIL Open Font License, Version 1.1'), 'the licence of the emoji font must be shipped');
```

**Edit 4.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert.equal((builtCss.match(/font-family:"SCRM Emoji"/g) || []).length, 11, 'app.css must have the eleven parts of the emoji font');
assert(builtCss.includes('font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei","SCRM Emoji",sans-serif;'), 'the emoji font must come after the fonts of the text');
for (const required of ["'.woff2': 'font/woff2',", "'Cache-Control': pathname.startsWith('/fonts/') && pathname.endsWith('.woff2') ? 'public, max-age=31536000, immutable' : 'no-cache',"]) {
  assert(read(path.join(__dirname, 'serve.cjs')).includes(required), `serve.cjs is missing ${required}`);
```

Replace them with:

```text
assert.equal((builtCss.match(/font-family:"SCRM Emoji"/g) || []).length, 11, 'app.css must have the eleven parts of the emoji font');
for (const [weight, file] of [[400, 'HarmonyOS_Sans_SC_Regular.ttf'], [700, 'HarmonyOS_Sans_SC_Bold.ttf']]) {
  assert(builtCss.includes(`@font-face { font-family:"HarmonyOS Sans SC"; font-style:normal; font-weight:${weight}; font-display:swap; src:url("fonts/${file}") format("truetype"); }`), `app.css must name ${file}`);
}
assert(builtCss.includes('font-family:"HarmonyOS Sans SC",system-ui,-apple-system,"Segoe UI","Microsoft YaHei","SCRM Emoji",sans-serif;'), 'the text font must come first, the emoji font after the fonts of the text');
for (const page of [path.join(__dirname, 'fidelity-index.html'), path.join(out, 'index.html')]) {
  assert(read(page).includes('<p class="fid-sign-in-font">本系统使用 HarmonyOS Sans 字体</p>'), 'the sign-in screen must say that HarmonyOS Sans is used, as its licence asks');
}
const textFontEnd = "if (face.family.replace(/\"/g, '') === 'HarmonyOS Sans SC') face.loaded.then(() => { if (openwaAtEnd) openwaShowEnd(); }, () => {});";
assert(openwaSource.includes(textFontEnd) && appJs.includes(textFontEnd), 'a conversation that shows its end must keep showing it when the text font arrives');
for (const required of ["'.woff2': 'font/woff2',", "'.ttf': 'font/ttf',", "'Cache-Control': pathname.startsWith('/fonts/') && /\\.(woff2|ttf)$/.test(pathname) ? 'public, max-age=31536000, immutable' : 'no-cache',"]) {
  assert(read(path.join(__dirname, 'serve.cjs')).includes(required), `serve.cjs is missing ${required}`);
```

**Edit 4.3** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
// change — a weak tag from a compressing gateway counts the same.
for (const required of ['gzip on;', 'gzip_proxied any;', 'gzip_vary on;', 'gzip_types text/css application/javascript application/json text/plain;']) {
  assert(deploy('gateway.conf').includes(required), `deploy/gateway.conf is missing ${required}`);
```

Replace them with:

```text
// change — a weak tag from a compressing gateway counts the same.
for (const required of ['gzip on;', 'gzip_proxied any;', 'gzip_vary on;', 'gzip_types text/css application/javascript application/json text/plain font/ttf;']) {
  assert(deploy('gateway.conf').includes(required), `deploy/gateway.conf is missing ${required}`);
```

**Edit 4.4** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  quotePicks: 'the quote dialog (报价): a box on the left ticks a product, the ticks stay while the search changes; 确认 opens 确认报价 with the ticked products in the order ticked — quantity (whole, at least 1), unit price (and price column), amount, total — where a product can be deleted and 返回列表 goes back; 放入消息框 puts one line per product ("Product Alpha PRDA01: $40 x 10 = $400") and "Total: $440"; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
  handMadePreview: 'the row of a customer made by hand reads 新建客户档案 in its preview line (chat list, supervisor page) until the first message; before, it showed the 初步需求, which looked like the customer\'s last message',
```

Replace them with:

```text
  quotePicks: 'the quote dialog (报价): a box on the left ticks a product, the ticks stay while the search changes; 确认 opens 确认报价 with the ticked products in the order ticked — quantity (whole, at least 1), unit price (and price column), amount, total — where a product can be deleted and 返回列表 goes back; 放入消息框 puts one line per product ("Product Alpha PRDA01: $40 x 10 = $400") and "Total: $440"; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
  textFont: 'the page draws its text in HarmonyOS Sans SC: Huawei\'s Regular and Bold files, unmodified, with their licence (work/wa-replica/fonts, copied by the build); the sign-in screen says 本系统使用 HarmonyOS Sans 字体 as the licence asks; the server sends the files as font/ttf that the browser keeps, the gateway compresses them; a conversation that shows its end keeps showing it when the font arrives',
  handMadePreview: 'the row of a customer made by hand reads 新建客户档案 in its preview line (chat list, supervisor page) until the first message; before, it showed the 初步需求, which looked like the customer\'s last message',
```

#### `site-api.test.cjs`

**Edit 4.5** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text

test('the preview server: the page\'s files are kept by the browser and asked for again with their tag — an empty 304 when unchanged, also for a weak tag; the parts of the emoji font go as fonts kept without asking (plans 068, 069)', async () => {
  const child = spawn(process.execPath, [path.join(__dirname, 'serve.cjs'), '0'], { env: { ...process.env, WA_SCRM_DATA_DIR: '', WA_SCRM_AI_ENV: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
```

Replace them with:

```text

test('the preview server: the page\'s files are kept by the browser and asked for again with their tag — an empty 304 when unchanged, also for a weak tag; the parts of the emoji font and the text font go as fonts kept without asking (plans 068, 069, 081)', async () => {
  const child = spawn(process.execPath, [path.join(__dirname, 'serve.cjs'), '0'], { env: { ...process.env, WA_SCRM_DATA_DIR: '', WA_SCRM_AI_ENV: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
```

**Edit 4.6** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
    assert.equal(Buffer.from(await font.arrayBuffer()).subarray(0, 4).toString('latin1'), 'wOF2');
    const tags = new Set();
```

Replace them with:

```text
    assert.equal(Buffer.from(await font.arrayBuffer()).subarray(0, 4).toString('latin1'), 'wOF2');
    const text = await fetch(base + '/fonts/HarmonyOS_Sans_SC_Regular.ttf');
    assert.deepEqual([text.status, text.headers.get('content-type'), text.headers.get('cache-control')], [200, 'font/ttf', 'public, max-age=31536000, immutable']);
    assert.deepEqual([...Buffer.from(await text.arrayBuffer()).subarray(0, 4)], [0, 1, 0, 0]);
    const tags = new Set();
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs work/wa-replica/site-api.test.cjs` → `04085b6527101da10b7389dc9033278b616f6d6b71006046cbe3f3b59d9297e5`, `b49c7f388b533a5554d354ce5f98c8ff703c0a68d5a3aba558ebdd06e99fc23a`; `git checkout d5f30af -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain --untracked-files=all -- outputs` lists `app.js`, `app.css`, `index.html`, `validation.json` of `outputs/wa-replica-prototype/` and the three new files of `outputs/wa-replica-prototype/fonts/`, nothing else (in particular not `tokens.css`); `sha256sum outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/app.css outputs/wa-replica-prototype/index.html` → `564e44348dcca3185ddff0c91f1dc59711636fb25e40b277303aa93ec4be182f`, `a10ff5a9723eb637ff1313a64e90cafc4a159df9612f0866d4deadc54a240621`, `f315a41d8076f0cf72407c9aa7402e8d0cceaf7779c93d44aa1bf71d5f72fcbd`; `$NODE --test` → `tests 90`, `pass 90`, `fail 0`. If a checksum does not match, restore the file and apply its edits again, once; if it still does not match, or another output file changed, STOP.

### Step 5: Build log, final verification

#### `replica/build-log.md`

**Append 5.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 界面字体：HarmonyOS Sans SC · 2026-11-26

界面文字改用华为的 HarmonyOS Sans SC 字体（常规与粗体两种字重），在每台电脑上显示一致：

- **字体文件**：华为开发者网站提供的原版文件，未做任何修改（许可协议要求如此），与许可协议 HarmonyOS-Sans-LICENSE.txt 一起放在 fonts 文件夹中。浏览器第一次打开时下载（网关压缩后约 11 MB），之后保存在浏览器中，不再下载；下载完成前，文字先用电脑自带的字体显示。
- **许可声明**：登录页面底部显示「本系统使用 HarmonyOS Sans 字体」。
- **停留在最新消息**：字体下载完成后文字所占的宽度会变化，已显示到最新消息的会话仍停留在最新消息处。

验证：构建与校验脚本通过；浏览器测试：字体晚 4 秒到达时，已打开的长会话仍停留在最新消息处，消息使用 HarmonyOS Sans SC 显示；字体文件以 font/ttf 发送并由浏览器长期保存。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout d5f30af -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-081/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `94418e1f200567585a5e10d31d906eb4339ed177ef491cdafd60bc539722a6d3`; `git status --porcelain --untracked-files=all` lists exactly these 18 paths: the eight files of the first table in "Current state", the three new font files of `work/wa-replica/fonts/`, `outputs/wa-replica-prototype/app.js`, `app.css`, `index.html`, `validation.json` and the three new files of `outputs/wa-replica-prototype/fonts/`. Commit everything (the six new files included). After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the files and their checksums, the rules, the font list, the notice, the wait for the font, the server's type and caching, the gateway's compression; in the sources and the built page.
- **Site test** (`site-api.test.cjs`, the preview server) — the Regular file is sent as `font/ttf`, kept a year, and starts with the TrueType signature.
- **Smoke** (`/tmp/wa-scrm-plan-081/smoke.sh`) — the same facts, the five test files, which built files changed, the syntax of the built page.
- **Verified by the reviewer, not by you**: in a browser against the reviewer's harness — the probe described under "Why this matters" (the font held back while a long conversation is open; the notice; the fonts the browser drew with; the headers), with and without the wait for the font; screenshots; the site and WhatsApp suites; on the platform after deployment, the font through the gateway (compressed, `font/ttf`, kept a year).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout d5f30af -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test` → `tests 90`, `pass 90`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-081/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `16c130b67cc7f4b33e313a7e5e1e9cca903cb9d84922292e331ccede3f59f399`
- [ ] `sha256sum work/wa-replica/fidelity-index.html` → `f315a41d8076f0cf72407c9aa7402e8d0cceaf7779c93d44aa1bf71d5f72fcbd`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js` → `87af995fa4ddca09440d01c155f30c7b821124d61c87f57eb125a372f1d26193`
- [ ] `sha256sum work/wa-replica/serve.cjs` → `896053fea65b010c449a912747bbdcc1d2e2fa474038677cac7cb57248456296`
- [ ] `sha256sum deploy/gateway.conf` → `c8dbd6054700b202fdb2cc4ce8ca9d8a0a690b80f1c6be442d1c92fd1743cab3`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `04085b6527101da10b7389dc9033278b616f6d6b71006046cbe3f3b59d9297e5`
- [ ] `sha256sum work/wa-replica/site-api.test.cjs` → `b49c7f388b533a5554d354ce5f98c8ff703c0a68d5a3aba558ebdd06e99fc23a`
- [ ] `sha256sum replica/build-log.md` → `94418e1f200567585a5e10d31d906eb4339ed177ef491cdafd60bc539722a6d3`
- [ ] `sha256sum work/wa-replica/fonts/HarmonyOS_Sans_SC_Regular.ttf` → `297b088424be212207df2ce8b98e335468b782aa6b96832af0b8b773d711e2b1`
- [ ] `sha256sum work/wa-replica/fonts/HarmonyOS_Sans_SC_Bold.ttf` → `43a424b85e47fb53a17b3b32026a71801f86f8e022ca6798d186b47d39fa5f01`
- [ ] `sha256sum work/wa-replica/fonts/HarmonyOS-Sans-LICENSE.txt` → `b2ffec0e6269ee41c3b5fc0345ab37600b46d66ebea6c9c58ff37f517bdfa164`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `564e44348dcca3185ddff0c91f1dc59711636fb25e40b277303aa93ec4be182f`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `a10ff5a9723eb637ff1313a64e90cafc4a159df9612f0866d4deadc54a240621`
- [ ] `sha256sum outputs/wa-replica-prototype/index.html` → `f315a41d8076f0cf72407c9aa7402e8d0cceaf7779c93d44aa1bf71d5f72fcbd`
- [ ] `sha256sum outputs/wa-replica-prototype/fonts/HarmonyOS_Sans_SC_Regular.ttf` → `297b088424be212207df2ce8b98e335468b782aa6b96832af0b8b773d711e2b1`
- [ ] `sha256sum outputs/wa-replica-prototype/fonts/HarmonyOS_Sans_SC_Bold.ttf` → `43a424b85e47fb53a17b3b32026a71801f86f8e022ca6798d186b47d39fa5f01`
- [ ] `sha256sum outputs/wa-replica-prototype/fonts/HarmonyOS-Sans-LICENSE.txt` → `b2ffec0e6269ee41c3b5fc0345ab37600b46d66ebea6c9c58ff37f517bdfa164`
- [ ] `git diff --name-only d5f30af..HEAD -- outputs` lists `app.js`, `app.css`, `index.html`, `validation.json` of `outputs/wa-replica-prototype/` and the three files of `outputs/wa-replica-prototype/fonts/`, nothing else
- [ ] `git diff --name-only d5f30af..HEAD -- . ':!plans'` lists exactly 18 paths (see the final verification of Step 5)
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The folder with the font files is missing, or a copied file has another checksum.
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, or a test fails.
- An output file other than the seven named ones changes (a changed `tokens.css` would mean a pixel value crept into the style rules).
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file, creating another file, converting a font, downloading or installing anything.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else — `upgrade.sh` tests the changed `gateway.conf` before the gateway reads it again. An open page keeps the old font until it is opened again.
- **The licence** (`work/wa-replica/fonts/HarmonyOS-Sans-LICENSE.txt`): keep the notice on the sign-in screen and the licence file beside the fonts for as long as the font is shipped; never subset, convert or otherwise modify the font files; never offer them for download on their own.
- **A new version of the font** from Huawei: new files need new checksums in the validator — and, because the browser keeps `/fonts/*.ttf` a year without asking, **new file names** (for example a version in the name); the same name with other bytes would not reach browsers that already have the old file.
- **Another weight** (for example Medium for weight 500): one more `@font-face` rule, file and checksum, and about 8 MB more for every browser — the owner was told "two weights, about 16 MB (11 MB compressed)".
- The first visit of a browser downloads about 11 MB; until the font is there, the fonts after it in the list draw the text, then the page switches once (`font-display:swap`). A conversation that shows its latest message keeps showing it; one scrolled up stays where its reader left it.
- What a reviewer should scrutinise: that the font files are byte for byte Huawei's; that the notice is visible on the sign-in screen in every state; that the emoji font is still after the fonts of the text; that a conversation at its end stays there when the font arrives.
- `validation.json`: re-run the validator once in the main checkout after merging.
