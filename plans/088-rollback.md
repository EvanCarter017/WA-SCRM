# Plan 088: Roll back the UI upgrade (plans 081–087); keep two fixes

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 11c0fd2..HEAD -- work/wa-replica deploy replica/build-log.md outputs`
> If anything in scope changed since this plan was written, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MEDIUM (ten files go back to an earlier commit and six files are removed; the page's look returns to the one before the upgrade; exact checksums for every file)
- **Depends on**: plans 081–087 (DONE; this plan withdraws their look)
- **Category**: owner request of 2026-11-27: "This UI is just a color change—let's roll it back." Asked how far, the owner chose **"All back, keep 2 bug fixes"**
- **Planned at**: commit `11c0fd2`, 2026-11-27

## Why this matters

Plans 081–087 (2026-11-26) upgraded the page's look: the text font HarmonyOS Sans SC (081), one colour world (082), the chat page's room (083), dialogs and the profile (084), home and follow-ups (085), tables (086), the supervisor page (087). The owner saw it live and asked to roll it back: "This UI is just a color change—let's roll it back." Asked in a question dialog how far, the owner chose **"All back, keep 2 bug fixes"**: the page looks as it did before plan 081, and only two fixes found on the way stay:

- **The customer list's 操作 column.** Its thirteen columns had twelve widths that came to 100.5%, so 操作 (its last column) had none and its icons reached past the table (plan 086 gave all thirteen widths that add up to 100%).
- **A dialog's footer stays in view.** A long dialog (确认报价 with 50 products) scrolled as a whole and showed its buttons only at its end (plan 085 made the footer sticky).

Every file outside `plans/` that plans 081–087 changed was changed only by them (`git log d5f30af..11c0fd2 -- . ':!plans'` lists exactly their seven commits), so the sources go back to commit `d5f30af` (the commit before plan 081) exactly, and the two fixes are applied again on top. Rehearsed (the reviewer's copy, 2026-11-27): afterwards the built page (`app.js`), its HTML and its size tokens are byte for byte the ones of `d5f30af`; the style sheet differs by the two fixes only (27 changed lines); the validator passes, the five test files pass; in a browser the old look is back (the violet and blue, the beige chat background, the row of page tabs on the chat page), 确认报价 with 50 products keeps its buttons in view and the customer list has nothing past its edge at 1920 px.

### Decisions already made (do not re-open; do not ask)

- Restore to commit `d5f30af`: `deploy/gateway.conf`, `work/wa-replica/fidelity-dashboard.css`, `work/wa-replica/fidelity-index.html`, `work/wa-replica/fidelity-lifecycle.css`, `work/wa-replica/fidelity-lifecycle.js`, `work/wa-replica/fidelity-openwa.js`, `work/wa-replica/fidelity.css`, `work/wa-replica/serve.cjs`, `work/wa-replica/site-api.test.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs`.
- Remove the text font and its built copies (they were added by plan 081): `work/wa-replica/fonts/HarmonyOS-Sans-LICENSE.txt`, `work/wa-replica/fonts/HarmonyOS_Sans_SC_Bold.ttf`, `work/wa-replica/fonts/HarmonyOS_Sans_SC_Regular.ttf`, `outputs/wa-replica-prototype/fonts/HarmonyOS-Sans-LICENSE.txt`, `outputs/wa-replica-prototype/fonts/HarmonyOS_Sans_SC_Bold.ttf`, `outputs/wa-replica-prototype/fonts/HarmonyOS_Sans_SC_Regular.ttf`. The build copies the fonts folder but does not delete what is gone from it, so the built copies are removed by hand here.
- Keep the two fixes, written against the restored files: the dialog footer's rule gains `position:sticky; bottom:0; z-index:1; border-top:1px solid var(--fid-frame);` (a 1 px top border instead of plan 085's shadow, so that no new size token appears); the customer list's twelve widths are replaced by thirteen that add up to 100% (3, 3.5, 9, 11, 9.5, 5.5, 8, 9, 11, 9.5, 6.5, 7.5, 7%).
- The validator (restored) gains checks for the two fixes and a summary entry `uiUpgradeWithdrawn`.
- `replica/build-log.md` keeps its entries of plans 081–087 (they are history) and gets one more entry for this rollback. `plans/` keeps the plans 081–087.
- Not changed: anything else.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files

| File | sha256 at the planned commit | sha256 after the restore (= at `d5f30af`) | sha256 after this plan |
|---|---|---|---|
| `deploy/gateway.conf` | `c8dbd6054700b202fdb2cc4ce8ca9d8a0a690b80f1c6be442d1c92fd1743cab3` | `7d18eeb78b0eaa98ac7e2e7f58632ecaafa06bb976e6e631da7d5e26834094f6` | `7d18eeb78b0eaa98ac7e2e7f58632ecaafa06bb976e6e631da7d5e26834094f6` |
| `work/wa-replica/fidelity-dashboard.css` | `608f4a5f5747d04426a9b9ecb69deb57902c6076dcc56c7c09961b7d9b758676` | `8f9667bc4bffa3d504bbfd95183b7c80043cf7f0094e768a361ff940ed28e895` | `8f9667bc4bffa3d504bbfd95183b7c80043cf7f0094e768a361ff940ed28e895` |
| `work/wa-replica/fidelity-index.html` | `f315a41d8076f0cf72407c9aa7402e8d0cceaf7779c93d44aa1bf71d5f72fcbd` | `1a68acf55dca4c1526bbb029fd5fd59a67e18e2d2b566cea6eac1f1f0b4a33b3` | `1a68acf55dca4c1526bbb029fd5fd59a67e18e2d2b566cea6eac1f1f0b4a33b3` |
| `work/wa-replica/fidelity-lifecycle.css` | `be63453397e463defa2a1ae675fcdea6573eb65b8df26f3a6870dd2e0f453b43` | `6ae2bc59c39f4dfdd5736249c753531adaf4a66b013d8abdd24e0c2ee44b4ab4` | `014da84eb055a2c72acba0a3ab779976533c7df77b40a877d04e36e166649e45` |
| `work/wa-replica/fidelity-lifecycle.js` | `07cf07174f5631343096d1699cb78be75bea0f08ef4632a3dbfb132f90664e38` | `21f02ae947a0352cf46c5c9df6e3a52e260a4b2374935fbd69dccac02dbf5764` | `21f02ae947a0352cf46c5c9df6e3a52e260a4b2374935fbd69dccac02dbf5764` |
| `work/wa-replica/fidelity-openwa.js` | `87af995fa4ddca09440d01c155f30c7b821124d61c87f57eb125a372f1d26193` | `72588afc9ce0ceee61fc57e9c10d215f9a6c4eae89888f253efc67f8430529c5` | `72588afc9ce0ceee61fc57e9c10d215f9a6c4eae89888f253efc67f8430529c5` |
| `work/wa-replica/fidelity.css` | `8696b47e5dbb376024e9c776580c35b01ed5f00722ae2788b1b62f526000c4ec` | `f6bf1b8a18760ad6c1811dce7e9cc3871da765dc540e239bf99dbb02aaae73bb` | `9f8304468bf32b4d381eb3e1cf3d48179e6f5da166c9ed02621d34e6ad925fc3` |
| `work/wa-replica/serve.cjs` | `896053fea65b010c449a912747bbdcc1d2e2fa474038677cac7cb57248456296` | `2544469cee3e04a82fdbc95f94f6dc4ec49848dcc967a2e4f8fb7015c52ceead` | `2544469cee3e04a82fdbc95f94f6dc4ec49848dcc967a2e4f8fb7015c52ceead` |
| `work/wa-replica/site-api.test.cjs` | `b49c7f388b533a5554d354ce5f98c8ff703c0a68d5a3aba558ebdd06e99fc23a` | `901ba78c7686809b808e5f021fbf95b5f7779ff78879a1c4e9f39a93a3806312` | `901ba78c7686809b808e5f021fbf95b5f7779ff78879a1c4e9f39a93a3806312` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `c373a1e26df09a3e6f9f3ae81a1bbafe5a7b847eb9d301bae7f036cc87970ed0` | `7cc8299ef799d9211752500b03fe1eedc8d2424ad6005d561fca12ef4016a3b7` | `a1d3061203ec6e69eaf1833ef75f89e6957d9083ace2ebde0e07723b9965ccbe` |
| `replica/build-log.md` | `b6ea85678caab29db051680727fa10994078d730961f5b1667f7bf0e434457d3` | (not restored) | `27222bbede2e7e223701fb1e91aa89e34250a589b5a455b80a5d4f379912942b` |

Removed by this plan: `work/wa-replica/fonts/HarmonyOS-Sans-LICENSE.txt`, `work/wa-replica/fonts/HarmonyOS_Sans_SC_Bold.ttf`, `work/wa-replica/fonts/HarmonyOS_Sans_SC_Regular.ttf`, `outputs/wa-replica-prototype/fonts/HarmonyOS-Sans-LICENSE.txt`, `outputs/wa-replica-prototype/fonts/HarmonyOS_Sans_SC_Bold.ttf`, `outputs/wa-replica-prototype/fonts/HarmonyOS_Sans_SC_Regular.ttf`.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand (the removal of the three built font copies is the one exception, above). The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build these output files differ from the planned commit: `app.js`, `app.css`, `index.html`, `tokens.css`, `validation.json` (written by the validator), and the three removed font copies.

## Commands you will need

Run from the repository root of **your working copy** (the clone you were given — never any other checkout).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout d5f30af -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| All tests | `$NODE --test` | `tests 90`, `pass 90`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-088/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope**: the ten files restored in Step 2; the six files removed in Step 2; the edits of Steps 3–5; build outputs only by running the build/validator.

**Out of scope** (do NOT touch): every other file — `plans/**`, `build-fidelity.cjs`, the base app, `fidelity-master.js`, `fidelity-boot.js`, every file not named in this plan. Do not install or download anything.

## Git workflow

- Work on the branch your working copy is already on (`advisor/088-rollback`). If (and only if) you find yourself on `main`, create and switch to `advisor/088-rollback` first.
- One commit is fine. Conventional commit message, e.g. `revert(scrm): roll back the UI upgrade of plans 081–087, keep two fixes`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character (the blocks contain Chinese text, quotes and backslashes); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 4 Edits and 1 Append, applied **after** the restore of Step 2.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-088/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). Write the file exactly as shown — it starts with the line `#!/usr/bin/env bash` and ends with the line that prints `SMOKE PASS` / `SMOKE FAIL`; do not run its body while saving it.

```bash
mkdir -p /tmp/wa-scrm-plan-088 && cat > /tmp/wa-scrm-plan-088/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 088: the UI upgrade of plans 081–087 rolled back to the sources of commit d5f30af, two fixes kept (a
# dialog's footer stays in view; the customer list's thirteen columns add up to 100%). NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'no text font in the sources' "$(cd "$ROOT" && cat "$W/fidelity.css" "$W/fidelity-index.html" "$W/fidelity-openwa.js" "$W/serve.cjs" deploy/gateway.conf | grep -c 'HarmonyOS\|font/ttf')" 0
same 'the fonts folder holds the emoji font and its licence only' "$(ls "$W/fonts" | wc -l) $(ls "$O/fonts" | wc -l)" '12 12'
same 'no colour world on :root' "$(grep -c '^:root {' "$W/fidelity.css")" 0
same 'the chat page keeps its row of page tabs' "$(grep -c 'fidelity:has(#view .inbox-page)' "$W/fidelity.css")" 0
same 'no data-state on the follow-up chips' "$(grep -c 'data-state=' "$W/fidelity-lifecycle.js")" 0
has 'kept: a dialog footer stays in view' "$W/fidelity.css" 'background:var(--color-surface); position:sticky; bottom:0; z-index:1; border-top:1px solid var(--fid-frame); }'
same 'kept: the customer list has thirteen column widths' "$(grep -cE '^\.fid-customer-table col:nth-child\([0-9]+\) \{ width: [0-9.]+%; \}$' "$W/fidelity-lifecycle.css")" 13
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  uiUpgradeWithdrawn: 'the UI upgrade of plans 081–087"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 撤回界面升级 · 2026-11-27'
same 'the built page is the one from before the upgrade' "$(cd "$ROOT" && cmp -s outputs/wa-replica-prototype/app.js <(git show d5f30af:outputs/wa-replica-prototype/app.js) && echo SAME)" SAME
same 'the built HTML is the one from before the upgrade' "$(cd "$ROOT" && cmp -s outputs/wa-replica-prototype/index.html <(git show d5f30af:outputs/wa-replica-prototype/index.html) && echo SAME)" SAME
same 'the size tokens are the ones from before the upgrade' "$(cd "$ROOT" && cmp -s outputs/wa-replica-prototype/tokens.css <(git show d5f30af:outputs/wa-replica-prototype/tokens.css) && echo SAME)" SAME
same 'the style sheet differs from before the upgrade by the two fixes only' "$(cd "$ROOT" && diff <(git show d5f30af:outputs/wa-replica-prototype/app.css) outputs/wa-replica-prototype/app.css | grep -c '^[<>]')" 27
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the price file pass' "$("$NODE" --test "$W/price-file.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the provisioner pass' "$("$NODE" --test "$W/site-provisioner.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 13 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-088/smoke.sh && ls -l /tmp/wa-scrm-plan-088/smoke.sh
```

**Verify**: `sha256sum deploy/gateway.conf work/wa-replica/fidelity-dashboard.css work/wa-replica/fidelity-index.html work/wa-replica/fidelity-lifecycle.css work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity.css work/wa-replica/serve.cjs work/wa-replica/site-api.test.cjs work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-088/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `no text font in the sources` (got: 9), `the fonts folder holds the emoji font and its licence only` (got: 15 15), `no colour world on :root` (got: 1), `the chat page keeps its row of page tabs` (got: 5), `no data-state on the follow-up chips` (got: 3), `kept: a dialog footer stays in view`, `the validator knows it`, `the build log has the entry`, `the built page is the one from before the upgrade` (got: nothing), `the built HTML is the one from before the upgrade` (got: nothing), `the size tokens are the ones from before the upgrade` (got: nothing), `the style sheet differs from before the upgrade by the two fixes only` (got: 428); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: Restore the sources and remove the text font

Run exactly:

```bash
git checkout d5f30af -- deploy/gateway.conf work/wa-replica/fidelity-dashboard.css work/wa-replica/fidelity-index.html work/wa-replica/fidelity-lifecycle.css work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity.css work/wa-replica/serve.cjs work/wa-replica/site-api.test.cjs work/wa-replica/validate-scrm-lifecycle.cjs
git rm -q work/wa-replica/fonts/HarmonyOS-Sans-LICENSE.txt work/wa-replica/fonts/HarmonyOS_Sans_SC_Bold.ttf work/wa-replica/fonts/HarmonyOS_Sans_SC_Regular.ttf outputs/wa-replica-prototype/fonts/HarmonyOS-Sans-LICENSE.txt outputs/wa-replica-prototype/fonts/HarmonyOS_Sans_SC_Bold.ttf outputs/wa-replica-prototype/fonts/HarmonyOS_Sans_SC_Regular.ttf
```

**Verify**: `sha256sum deploy/gateway.conf work/wa-replica/fidelity-dashboard.css work/wa-replica/fidelity-index.html work/wa-replica/fidelity-lifecycle.css work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity.css work/wa-replica/serve.cjs work/wa-replica/site-api.test.cjs work/wa-replica/validate-scrm-lifecycle.cjs` → the "after the restore" values of the table in "Current state", in that order; `ls work/wa-replica/fonts | wc -l` → `12` and `ls outputs/wa-replica-prototype/fonts | wc -l` → `12`; `git status --porcelain` lists the ten restored files as modified (`M`) and the six font files as deleted (`D`). If anything differs, STOP.

### Step 3: Keep the two fixes

#### `fidelity.css`

**Edit 3.1** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fidelity .fid-dialog .modal-body { padding:10px 20px 12px; }
.fidelity .fid-dialog .modal-footer { padding:12px 20px 18px; gap:10px; border:0; justify-content:flex-end; background:var(--color-surface); }
.fidelity .fid-dialog .modal-footer .fid-btn { min-width:70px; }
```

Replace them with:

```text
.fidelity .fid-dialog .modal-body { padding:10px 20px 12px; }
.fidelity .fid-dialog .modal-footer { padding:12px 20px 18px; gap:10px; border:0; justify-content:flex-end; background:var(--color-surface); position:sticky; bottom:0; z-index:1; border-top:1px solid var(--fid-frame); }
.fidelity .fid-dialog .modal-footer .fid-btn { min-width:70px; }
```

#### `fidelity-lifecycle.css`

**Edit 3.2** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

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
/* Thirteen columns that add up to 100% (kept from plan 086 by plan 088): the twelve widths before came to 100.5% and
   left 操作 none, so its icons reached past the table. */
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

What these edits do: in `fidelity.css` the dialog footer's rule gains its sticky place and a top border; in `fidelity-lifecycle.css` the customer list's twelve widths become thirteen that add up to 100%, with a comment.

**Verify**: `sha256sum work/wa-replica/fidelity.css work/wa-replica/fidelity-lifecycle.css` → `9f8304468bf32b4d381eb3e1cf3d48179e6f5da166c9ed02621d34e6ad925fc3`, `014da84eb055a2c72acba0a3ab779976533c7df77b40a877d04e36e166649e45`. If a checksum does not match, restore the file (`git checkout d5f30af -- <file>`) and apply its edits again, once; if it still does not match, STOP.

### Step 4: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 4.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text

const summary = {
```

Replace them with:

```text

// The UI upgrade of plans 081–087 is withdrawn at the owner's request (plan 088); two fixes made on the way stay: a
// dialog's footer stays in view while a long dialog scrolls, and the customer list's thirteen columns add up to 100%
// (操作 had none).
assert(read(path.join(__dirname, 'fidelity.css')).includes('background:var(--color-surface); position:sticky; bottom:0; z-index:1; border-top:1px solid var(--fid-frame); }'), 'a dialog\'s footer must stay in view while a long dialog scrolls');
const keptColumns = [...read(path.join(__dirname, 'fidelity-lifecycle.css')).matchAll(/\.fid-customer-table col:nth-child\((\d+)\) \{ width: ([\d.]+)%; \}/g)];
assert.equal(keptColumns.length, 13, 'the customer list must give its thirteen columns a width each');
assert.equal(Math.round(keptColumns.reduce((sum, m) => sum + Number(m[2]), 0) * 10) / 10, 100, 'the customer list\'s columns must add up to 100%');
const summary = {
```

**Edit 4.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  personaManual: 'the persona of the customer profile (画像与跟进) holds only what a person entered with 保存画像: 意向等级 starts on 请选择, the other fields empty; a customer from WhatsApp or made with 新增客户 gets nothing filled in (the 初步需求 stays in the notes); 广告素材 / 证据 shows — when nothing is recorded; what the page filled in before was cleared once (data.personaManual), except where a person had saved the persona',
  quotePicks: 'the quote dialog (报价): a box on the left ticks a product, the ticks stay while the search changes; 确认 opens 确认报价 with the ticked products in the order ticked — quantity (whole, at least 1), unit price (and price column), amount, total — where a product can be deleted and 返回列表 goes back; 放入消息框 puts one line per product ("Product Alpha PRDA01: $40 x 10 = $400") and "Total: $440"; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
```

Replace them with:

```text
  personaManual: 'the persona of the customer profile (画像与跟进) holds only what a person entered with 保存画像: 意向等级 starts on 请选择, the other fields empty; a customer from WhatsApp or made with 新增客户 gets nothing filled in (the 初步需求 stays in the notes); 广告素材 / 证据 shows — when nothing is recorded; what the page filled in before was cleared once (data.personaManual), except where a person had saved the persona',
  uiUpgradeWithdrawn: 'the UI upgrade of plans 081–087 (font, colours, chat-page layout, tables, dialogs, supervisor page) is withdrawn at the owner\'s request; kept: a dialog\'s footer stays in view while a long dialog scrolls, and the customer list\'s thirteen columns add up to 100%',
  quotePicks: 'the quote dialog (报价): a box on the left ticks a product, the ticks stay while the search changes; 确认 opens 确认报价 with the ticked products in the order ticked — quantity (whole, at least 1), unit price (and price column), amount, total — where a product can be deleted and 返回列表 goes back; 放入消息框 puts one line per product ("Product Alpha PRDA01: $40 x 10 = $400") and "Total: $440"; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `a1d3061203ec6e69eaf1833ef75f89e6957d9083ace2ebde0e07723b9965ccbe`; `git checkout d5f30af -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js` (it is identical to the committed one); `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `sha256sum outputs/wa-replica-prototype/app.css` → `3e096e23d4f96dc0d79478ad4dde0e96edc118c4ca67d39302ced477fe1ff3ad`; `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/index.html`, `outputs/wa-replica-prototype/tokens.css` are byte for byte the ones of `d5f30af` (the smoke script checks it); `$NODE --test` → `tests 90`, `pass 90`, `fail 0`. If anything differs, STOP.

### Step 5: Build log, final verification

#### `replica/build-log.md`

**Append 5.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 撤回界面升级 · 2026-11-27

应业主要求撤回界面升级（第 081–087 步：HarmonyOS Sans 字体、配色、聊天页面布局、表格、对话框与主管页面），界面恢复到升级之前的样子。升级过程中修复的两个问题保留：

- **客户列表**：13 列的宽度合计为 100%，「操作」列有宽度（以前操作图标被挤出表格之外）。
- **对话框**：内容很长时（例如确认报价中有 50 个产品），底部的按钮固定在对话框底部，滚动时始终可见。

字体文件与登录页上的字体声明已删除。

验证：构建与校验脚本通过；页面程序、页面与尺寸标记与升级之前完全一致，样式表只多出上述两处修复；浏览器测试。
```

Then verify everything once more:

```bash
git checkout d5f30af -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-088/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `27222bbede2e7e223701fb1e91aa89e34250a589b5a455b80a5d4f379912942b`; `git status --porcelain` lists the ten restored files, `replica/build-log.md`, `outputs/wa-replica-prototype/app.js`, `app.css`, `index.html`, `tokens.css`, `validation.json` as modified and the six font files as deleted — 22 paths, nothing new. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — restored, with the two fixes checked (the sticky footer; thirteen customer widths that add up to 100%).
- **Smoke** (`/tmp/wa-scrm-plan-088/smoke.sh`) — the upgrade's marks gone (the text font, the colour world, the chat page's rule, `data-state`), the two fixes there, the built page, HTML and size tokens identical to `d5f30af`, the style sheet differing by the two fixes only, the five test files.
- **Verified by the reviewer, not by you**: screenshots of the old look; 确认报价 with 50 products; the customer list at 1920 px; the site, WhatsApp and supervisor suites; deliberate faults.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout d5f30af -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test` → `tests 90`, `pass 90`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-088/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum deploy/gateway.conf` → `7d18eeb78b0eaa98ac7e2e7f58632ecaafa06bb976e6e631da7d5e26834094f6`
- [ ] `sha256sum work/wa-replica/fidelity-dashboard.css` → `8f9667bc4bffa3d504bbfd95183b7c80043cf7f0094e768a361ff940ed28e895`
- [ ] `sha256sum work/wa-replica/fidelity-index.html` → `1a68acf55dca4c1526bbb029fd5fd59a67e18e2d2b566cea6eac1f1f0b4a33b3`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.css` → `014da84eb055a2c72acba0a3ab779976533c7df77b40a877d04e36e166649e45`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.js` → `21f02ae947a0352cf46c5c9df6e3a52e260a4b2374935fbd69dccac02dbf5764`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js` → `72588afc9ce0ceee61fc57e9c10d215f9a6c4eae89888f253efc67f8430529c5`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `9f8304468bf32b4d381eb3e1cf3d48179e6f5da166c9ed02621d34e6ad925fc3`
- [ ] `sha256sum work/wa-replica/serve.cjs` → `2544469cee3e04a82fdbc95f94f6dc4ec49848dcc967a2e4f8fb7015c52ceead`
- [ ] `sha256sum work/wa-replica/site-api.test.cjs` → `901ba78c7686809b808e5f021fbf95b5f7779ff78879a1c4e9f39a93a3806312`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `a1d3061203ec6e69eaf1833ef75f89e6957d9083ace2ebde0e07723b9965ccbe`
- [ ] `sha256sum replica/build-log.md` → `27222bbede2e7e223701fb1e91aa89e34250a589b5a455b80a5d4f379912942b`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `3e096e23d4f96dc0d79478ad4dde0e96edc118c4ca67d39302ced477fe1ff3ad`
- [ ] `git diff --name-only 11c0fd2..HEAD -- . ':!plans'` lists exactly 22 paths (see the final verification of Step 5)
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- A restored file does not have the checksum of `d5f30af`, or the fonts folders do not hold 12 files each after Step 2.
- The lines to find do not occur exactly once at the moment an edit is applied, or a checksum does not match after a second try.
- The build or the validator fails, a test fails, or the built page, HTML or size tokens differ from those of `d5f30af`.
- The work appears to require touching a file this plan does not name.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else (`upgrade.sh` tests the restored `gateway.conf` before the gateway reads it again). An open page keeps the upgraded look until it is opened again; a browser that kept the font simply no longer asks for it.
- **The withdrawn plans** (081–087) stay in `plans/` as history; their index rows say they were withdrawn by this plan. Anything taken from them later needs a new plan of its own.
- What a reviewer should scrutinise: that only the two fixes differ from `d5f30af`'s style sheet; that the six font files are gone in both folders; that the sign-in screen no longer names the font.
- `validation.json`: re-run the validator once in the main checkout after merging.
