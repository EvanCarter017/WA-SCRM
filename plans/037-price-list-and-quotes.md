# Plan 037: A price list that is uploaded on its own page, and a button that quotes from it in a conversation

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5f5e7f7..HEAD -- work/wa-replica replica/build-log.md outputs README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM (three new files, one of them reads files a person chooses; the message box gets a button; exact text and checksums for every file)
- **Depends on**: plans/039-no-follow-up-information-without-a-follow-up.md (DONE)
- **Category**: feature (owner request)
- **Planned at**: commit `5f5e7f7`, 2026-11-22

## Why this matters

Quoting prices from a price list is one of the five functions the owner chose for this product (2026-11-21). The owner supplied a price list as an Excel file on 2026-11-22 — a title line, a header line "short | full | specification | Price ($)" and eighteen products whose names span several lines — and decided how it is to work:

- **"Quote button"**: a button "报价" beside the message box. It opens a search by code or name; a click on a price puts a line such as `Product Alpha PRDA01 (100*10 Units): $40` into the message box. The message is never sent by the button, and the product is never suggested by itself.
- **"Upload in the workbench"**: a page "价格表" where uploading an Excel or CSV file replaces the list.

What this plan adds:

- **A reader of price files** (`fidelity-pricefile.js`, built as `pricefile.js`): it reads an `.xlsx` or `.csv` file in the browser — the file itself never leaves the browser — and returns the products. It works out the columns from the header: a column of numbers is a price column (there may be several), the others are, from the left, the code, the name and the specification. A title above the header is passed over, a name written once for several lines is carried down. It has its own tests.
- **The page "价格表"** (`#prices`, in the menu under "工作台设置" after "AI 能力"): upload, a preview of what was read (number of products, what each column was taken for, the first five products) that must be confirmed before the list in use is replaced, a search, and a button that clears the list. The list is kept with the sub-site's data on the server (`data.priceList`) and is shared by the accounts of the sub-site.
- **The button "报价"** in the message box of a conversation: a dialog with a search box and the products; a click on a price puts the line at the end of the message box, as if it were typed, and closes the dialog.

### Decisions already made (do not re-open; do not ask)

- The line has the form the owner approved: name, code, specification in brackets, a colon, the price. The currency comes from the header of the price column ("Price ($)" gives `$40`; a three-letter code gives `USD 40`; no currency gives `40`). With several price columns every price has its own button and the line ends with the column's name in brackets.
- Everyone who can sign in to the sub-site may upload or clear the list; the page shows who uploaded the list in use and when.
- The limits: a file of at most 5 MB, at most 5000 products, at most 1 000 000 characters of text in all, 200 characters a cell. The old `.xls` format is refused with the advice to save the file as `.xlsx` or CSV.
- A price is shown exactly as the file gives it (only the tail that a binary fraction leaves in a sheet, as in 100.90000000000001, is taken off); a price that carries its own currency sign in the file ("$40") is a price too and gets no second sign. Nothing in a file is run; every text reaches the page through `esc`.
- The button is made by a function declaration of the new module (`priceQuoteButton`), which the message box calls: a module that is put into the page later may be called from the baseline only through declarations, which exist from the start.
- Where the conversation is narrow (a screen of at most 1000 px) the button shows its icon only and stands close to its neighbours: measured at fifteen widths from 1440 px to 360 px, the controls of the message box then never run into the send button.
- The icons are ones the page already uses, in places where they are met later than their first use — `icons.js` comes out unchanged. The styles use sizes that are already in use — `tokens.css` comes out unchanged.
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/build-fidelity.cjs` | `93769241bd082c11739369b28fba33afd8b68e2cb6e400da2bfbbdb661c0f6e2` | `1c3107cbaf26cdef67a991ba28f433c42fe2b82c7edc318f68f88aa6292db87d` |
| `work/wa-replica/fidelity-index.html` | `44a1c78e55b41d26de5a24c93af390bb8ff5e0a281685b95051f0128736a0d0d` | `95f37db26f84e10c5c1cd91c761ac19e0b534504815aa7b6ff33bf7cb826880d` |
| `work/wa-replica/fidelity-lifecycle.js` | `23dcea7a797d7dcc48448fc27a43b19cace55a0baca67ea4a6206b87bd9bed14` | `62bd3369424338d26b879182162b04aa88f77c4260f827a8232d1219ad7d5f12` |
| `work/wa-replica/fidelity.css` | `e6f3ea3a2001500cbad683afd39f69e2264b6d9f2912409595762a3e3b2cc17f` | `4497fb533ae7163a473e5c5dbaee610f5b0cefa80e2e2e499e4f3d6dd9942c48` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `263e69f893d43da3a6ec4cc0976363bb48aeea1c5505c18ee84bd00cf4708263` | `65ef9ab46136ae300e5c23c2727d93bca4058904799ac2e1b0a55d0dab619c88` |
| `README.md` | `2d2d86ce7a4e7dc44a2da5950711f3709b47240eae13d3e5e0c1887c7b336470` | `6f453eea74f3c45d2f3c3550f17423fdacee96e75e06eefef243ea7a40fbb936` |
| `work/wa-replica/fidelity-pricefile.js` | (new file) | `f93e8da98f7779d730bd2d05fdc13a74ed87f7087480977bcf8ef2bc07b66ea1` |
| `work/wa-replica/price-file.test.cjs` | (new file) | `84f6125af5790f52890cd328bf3e586acc47d08fa6b7d92cec60b7d5c03e0b8b` |
| `work/wa-replica/fidelity-pricelist.js` | (new file) | `ad69850ff2a1548e52171b760a9d90f92c88a79b7e5f27470eb15cd10cb142a6` |

- `build-fidelity.cjs` — the build. It puts the page modules into the app one after the other (`fidelity-ui.js`, …, `fidelity-lifecycle.js`, `fidelity-ai.js`, `fidelity-subsite.js`), rewrites texts of the frozen baseline with `swap(from, to)` (which fails when the text is missing), names the pages (`views`) and their draw functions, and writes the output files listed in `assets`.
- `fidelity-index.html` — the page; it loads `icons.js`, `app.js` and `boot.js`.
- `fidelity-lifecycle.js` — its `menuHTML` draws the menu; the last entry is the AI page.
- `fidelity.css` — the page's own styles; a size in pixels that is not yet in use would add a line to `tokens.css`.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page; a block is added.
- Helpers the new page module uses, all existing: `fidHead`, `fidButton`, `fidTable`, `fidPager`, `paged`, `rowNumber`, `fidDialog`, `fidConfirm`, `fidDate`, `fidActions` (the handlers of `data-action`), `member`, `esc`, `icon`, `paintIcons`, `persist`, `render`, `close`, `toast`, `navigate`, `selectedCustomer`.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 5f5e7f7 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Syntax of the modules | `node -e "const fs=require('fs'),vm=require('vm');new vm.Script(fs.readFileSync('work/wa-replica/fidelity-pricefile.js','utf8'));for(const f of ['fidelity-pricelist.js','fidelity-lifecycle.js'])new vm.Script('(async()=>{'+fs.readFileSync('work/wa-replica/'+f,'utf8')+'})');console.log('SYNTAX_OK')"` | `SYNTAX_OK` |
| Tests of the reader | `$NODE --test work/wa-replica/price-file.test.cjs` | `pass 17`, `fail 0` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 12`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-037/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |
| Icon set | `node -e "const vm=require('vm'),fs=require('fs'),cp=require('child_process');const keys=s=>{const w={};vm.runInNewContext(s,{window:w});return Object.keys(w.WA_ICONS)};const a=keys(cp.execSync('git show 5f5e7f7:outputs/wa-replica-prototype/icons.js').toString()),b=keys(fs.readFileSync('outputs/wa-replica-prototype/icons.js','utf8'));console.log('removed='+a.filter(x=>!b.includes(x)).join(',')+' added='+b.filter(x=>!a.includes(x)).join(','))"` | `removed= added=` |

## Scope

**In scope** (the only files you may create or modify):

- New: `work/wa-replica/fidelity-pricefile.js`, `work/wa-replica/price-file.test.cjs` (Step 2), `work/wa-replica/fidelity-pricelist.js` (Step 3)
- `work/wa-replica/build-fidelity.cjs`, `fidelity-index.html`, `fidelity-lifecycle.js`, `fidelity.css`, `validate-scrm-lifecycle.cjs` (Step 3)
- `README.md`, `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{app.js,app.css,index.html,pricefile.js,validation.json}` (`pricefile.js` is new; the other output files, `icons.js` and `tokens.css` among them, must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular the server files (the list travels with the data the page already saves), `fidelity-boot.js`, the other page modules, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/037-price-list-and-quotes` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): a price list and a button that quotes from it`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: a **New file** gives the whole content of a file that does not exist yet. An **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-037/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-037 && cat > /tmp/wa-scrm-plan-037/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that the price list is in place: the reader of price files, the page "价格表" and the button "报价".
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the reader of price files passes its tests' "$([ -f "$W/price-file.test.cjs" ] && "$NODE" --test "$W/price-file.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ' || echo 'no test file')" 'ℹ pass 17 ℹ fail 0 '
same 'the page gets the reader as a file of its own, the built copy of the source' "$(cmp -s "$W/fidelity-pricefile.js" "$P/pricefile.js" && echo same || echo differs)" same
has 'the page loads the reader before the app' "$P/index.html" '<script src="pricefile.js"></script><script src="app.js"></script>'
has 'the page of the price list is registered' "$P/app.js" 'ai:renderAiPage,prices:renderPriceList}'
has 'the menu leads to it' "$P/app.js" "renderItem('prices', views.prices)"
has 'a file is read in the browser and shown before it is used' "$P/app.js" 'window.WA_PRICE_FILE.read(new Uint8Array(await file.arrayBuffer()))'
has 'the message box has the button of the quotes' "$P/app.js" "+priceQuoteButton()+'<span class=\"language-hint\">'"
has 'a quote is put into the message box as if it were typed' "$P/app.js" "box.dispatchEvent(new Event('input', { bubbles: true }));"
same 'the price list sends no message and calls no server' "$([ -f "$W/fidelity-pricelist.js" ] && grep -cE '\b(send|fetch|XMLHttpRequest|WebSocket)\s*\(' "$W/fidelity-pricelist.js" "$W/fidelity-pricefile.js" | tr '\n' ' ' || echo 'no module')" "$W/fidelity-pricelist.js:0 $W/fidelity-pricefile.js:0 "
has 'the built styles know the price list' "$P/app.css" '.price-quote-button'
has 'the README lists the page' "$ROOT/README.md" '| `#prices` | **价格表** |'
same 'the modules pass the syntax check' "$([ -f "$W/fidelity-pricelist.js" ] && (cd "$ROOT" && node -e "const fs=require('fs'),vm=require('vm');new vm.Script(fs.readFileSync('work/wa-replica/fidelity-pricefile.js','utf8'));for(const f of ['fidelity-pricelist.js','fidelity-lifecycle.js'])new vm.Script('(async()=>{'+fs.readFileSync('work/wa-replica/'+f,'utf8')+'})');console.log('SYNTAX_OK')" 2>&1) || echo 'no module')" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-037/smoke.sh && ls -l /tmp/wa-scrm-plan-037/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/build-fidelity.cjs work/wa-replica/fidelity-index.html work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs README.md` → the "at the planned commit" values of the table in "Current state", in that order; none of the three new files exists yet (`ls work/wa-replica/fidelity-pricefile.js work/wa-replica/price-file.test.cjs work/wa-replica/fidelity-pricelist.js` fails for each); `NODE=$NODE bash /tmp/wa-scrm-plan-037/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the reader of price files passes its tests` (got: no test file), `the page gets the reader as a file of its own, the built copy of the source` (got: differs), `the page loads the reader before the app`, `the page of the price list is registered`, `the menu leads to it`, `a file is read in the browser and shown before it is used`, `the message box has the button of the quotes`, `a quote is put into the message box as if it were typed`, `the price list sends no message and calls no server` (got: no module), `the built styles know the price list`, `the README lists the page` and `the modules pass the syntax check` (got: no module) (twelve checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The reader of price files and its tests

**New file 2.1** — `work/wa-replica/fidelity-pricefile.js`. The file does not exist yet. Create it with exactly this content (208 lines; the file ends with one newline):

```text
// Reads a price list from an .xlsx or .csv file. Standalone: the page loads it as pricefile.js and calls
// window.WA_PRICE_FILE.read(bytes); its tests load the same file in Node. Nothing in a file is run — it is read
// as text and numbers only — and a price is kept exactly as the file gives it.
//
// What a file must look like: one table with a header line. Lines above the header that fill a single cell (a
// title) are passed over. A column whose cells are numbers is a price column — there may be several; the other
// columns are, from the left, the product's code, its name and its specification (a list may do without the last
// two). A name left empty takes the name of the line above, which is how a name that spans several lines of a
// sheet arrives.
//
// read(bytes) resolves to { columns: { code, name, spec, prices: [..] }, rows: [{ code, name, spec, prices }],
// skipped } — columns carry the header texts, '' for a column the list does not have — or rejects with an Error
// whose code is one of: too-large, too-long, old-excel, unreadable, no-table, no-prices, too-many-rows.
(function (root) {
  // A file of at most `bytes`; a part of a workbook unpacks to at most `part`; a list of at most `rows` products
  // whose texts, as they are kept, take at most `text` characters; a cell is cut at `cell` characters.
  const LIMITS = { bytes: 5 * 1024 * 1024, part: 20 * 1024 * 1024, rows: 5000, text: 1000000, cell: 200 };
  const fail = code => Object.assign(new Error(code), { code });
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, LIMITS.cell);
  const text = bytes => new TextDecoder('utf-8').decode(bytes).replace(/^﻿/, '');

  // ---- .xlsx: a zip archive of XML parts ----
  // Unpacks one part of the archive. The size an archive states for a part need not be true, so the unpacking
  // itself stops at the limit.
  async function inflate(bytes) {
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > LIMITS.part) {
        await reader.cancel().catch(() => {});
        throw fail('unreadable');
      }
      chunks.push(value);
    }
    const plain = new Uint8Array(size);
    let at = 0;
    for (const chunk of chunks) {
      plain.set(chunk, at);
      at += chunk.length;
    }
    return plain;
  }
  // The parts of the archive by name; a part is read when it is asked for.
  function archive(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        end = i;
        break;
      }
    }
    if (end < 0) throw fail('unreadable');
    const count = view.getUint16(end + 10, true);
    let at = view.getUint32(end + 16, true);
    const parts = new Map();
    for (let n = 0; n < count; n++) {
      if (at + 46 > bytes.length || view.getUint32(at, true) !== 0x02014b50) throw fail('unreadable');
      const method = view.getUint16(at + 10, true), packed = view.getUint32(at + 20, true), size = view.getUint32(at + 24, true);
      const nameLength = view.getUint16(at + 28, true), extra = view.getUint16(at + 30, true), comment = view.getUint16(at + 32, true);
      const local = view.getUint32(at + 42, true);
      parts.set(text(bytes.subarray(at + 46, at + 46 + nameLength)), { method, packed, size, local });
      at += 46 + nameLength + extra + comment;
    }
    return async name => {
      const part = parts.get(name);
      if (!part) return null;
      if (part.size > LIMITS.part || part.local + 30 > bytes.length || view.getUint32(part.local, true) !== 0x04034b50) throw fail('unreadable');
      const start = part.local + 30 + view.getUint16(part.local + 26, true) + view.getUint16(part.local + 28, true);
      const packed = bytes.subarray(start, start + part.packed);
      if (part.method === 0) return text(packed);
      if (part.method !== 8) throw fail('unreadable');
      return text(await inflate(packed).catch(() => { throw fail('unreadable'); }));
    };
  }
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  const plain = xml => xml.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (all, name) =>
    name[0] === '#' ? String.fromCodePoint(name[1] === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1))) : entities[name] ?? all);
  // The texts inside <t> elements of a piece of XML, without phonetic guides.
  const texts = xml => [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(m => plain(m[1])).join('');
  const column = letters => [...letters].reduce((n, letter) => n * 26 + letter.charCodeAt(0) - 64, 0) - 1;
  // A number as a sheet stores it: the tail a binary fraction leaves (100.90000000000001) is taken off.
  const number = value => (/^-?\d+\.\d{7,}$/.test(value) || /e/i.test(value) ? String(Number(Number(value).toFixed(6))) : value);

  async function sheetTable(bytes) {
    const part = archive(bytes);
    const book = await part('xl/workbook.xml');
    if (!book) throw fail('unreadable');
    const links = await part('xl/_rels/workbook.xml.rels') || '';
    const targets = new Map([...links.matchAll(/<Relationship\b[^>]*>/g)].map(m => [/\bId="([^"]*)"/.exec(m[0])?.[1], /\bTarget="([^"]*)"/.exec(m[0])?.[1]]));
    const sheets = [...book.matchAll(/<sheet\b[^>]*>/g)].map(m => targets.get(/\br:id="([^"]*)"/.exec(m[0])?.[1])).filter(Boolean)
      .map(target => (target[0] === '/' ? target.slice(1) : 'xl/' + target));
    const shared = [...(await part('xl/sharedStrings.xml') || '').matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m => texts(m[1]));
    for (const name of sheets.length ? sheets : ['xl/worksheets/sheet1.xml']) {
      const xml = await part(name);
      if (!xml) continue;
      const table = [];
      for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
        const cells = [];
        let next = 0;
        for (const cell of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
          const ref = /\br="([A-Z]+)\d+"/.exec(cell[1]), kind = /\bt="(\w+)"/.exec(cell[1])?.[1] || 'n';
          const at = ref ? column(ref[1]) : next;
          next = at + 1;
          const value = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(cell[2] || '')?.[1];
          if (kind === 's') cells[at] = shared[Number(value)] ?? '';
          else if (kind === 'inlineStr') cells[at] = texts(cell[2] || '');
          else if (value !== undefined) cells[at] = kind === 'n' ? number(plain(value)) : plain(value);
        }
        if (cells.length) table.push(cells);
        if (table.length > LIMITS.rows + 50) throw fail('too-many-rows');
      }
      if (table.length >= 2) return table;
    }
    throw fail('no-table');
  }

  // ---- .csv: text with one line per row; commas, semicolons or tabs between cells ----
  function csvTable(source) {
    const first = source.split(/\r?\n/).find(line => line.trim()) || '';
    const mark = ['\t', ';', ','].map(m => [m, first.split(m).length]).sort((a, b) => b[1] - a[1])[0][0];
    const table = [];
    let row = [], cell = '', quoted = false;
    const endRow = () => {
      row.push(cell);
      cell = '';
      if (row.some(value => value.trim())) table.push(row);
      row = [];
      if (table.length > LIMITS.rows + 50) throw fail('too-many-rows');
    };
    for (let i = 0; i < source.length; i++) {
      const c = source[i];
      if (quoted) {
        if (c === '"' && source[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (c === '"') quoted = false;
        else cell += c;
      } else if (c === '"' && !cell) quoted = true;
      else if (c === mark) {
        row.push(cell);
        cell = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && source[i + 1] === '\n') i++;
        endRow();
      } else cell += c;
    }
    if (cell || row.length) endRow();
    return table;
  }

  // ---- a table of texts → the price list ----
  // A price as a cell may hold it: digits, with or without commas for the thousands, a fraction, and a currency
  // sign before or after ("$40", "1,200.50", "40 €").
  const NUMBER = /^[-+]?(?:[$€£¥]\s?)?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?(?:\s?[$€£¥])?$/;
  const PRICE_WORD = /price|cost|amount|价|金额|费用|usd|eur|gbp|cny|rmb|hkd|[$¥€£]/i;
  const CODE_WORD = /sku|code|model|item|short|abbr|编号|型号|货号|简称|代码|缩写/i;
  function priceList(table) {
    const rows = table.map(row => Array.from(row, clean));
    const filled = row => row.filter(Boolean).length;
    const head = rows.findIndex(row => filled(row) >= 2);
    if (head < 0) throw fail('no-table');
    const body = rows.slice(head + 1).filter(filled);
    const width = Math.max(...rows.slice(head).map(row => row.length));
    const columns = [];
    for (let i = 0; i < width; i++) {
      const label = rows[head][i] || '', values = body.map(row => row[i] || '').filter(Boolean);
      if (!label && !values.length) continue;
      const numbers = values.length > 0 && values.filter(value => NUMBER.test(value)).length >= values.length * 0.8;
      // The leftmost column and a column called a code are never prices, even when the codes are numbers.
      columns.push({ i, label, price: !CODE_WORD.test(label) && (PRICE_WORD.test(label) ? numbers || !values.length : numbers && columns.length > 0) });
    }
    const words = columns.filter(c => !c.price), prices = columns.filter(c => c.price);
    if (!words.length || !prices.length) throw fail('no-prices');
    const [code, name, spec] = words;
    const list = [];
    let skipped = 0, above = '';
    for (const row of body) {
      const own = name ? row[name.i] || '' : '';
      const entry = { code: row[code.i] || '', name: own || above, spec: spec ? row[spec.i] || '' : '', prices: prices.map(p => row[p.i] || '') };
      if (own) above = own;
      if ((entry.code || entry.name) && entry.prices.some(Boolean)) list.push(entry);
      else skipped += 1;
    }
    if (!list.length) throw fail('no-prices');
    if (list.length > LIMITS.rows) throw fail('too-many-rows');
    if (JSON.stringify(list).length > LIMITS.text) throw fail('too-long');
    return { columns: { code: code.label, name: name ? name.label : '', spec: spec ? spec.label : '', prices: prices.map(p => p.label) }, rows: list, skipped };
  }

  async function read(bytes) {
    if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
    if (bytes.length > LIMITS.bytes) throw fail('too-large');
    if (bytes.length < 4) throw fail('no-table');
    if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) throw fail('old-excel');
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) return priceList(await sheetTable(bytes));
    if (bytes.includes(0)) throw fail('unreadable');
    return priceList(csvTable(text(bytes)));
  }

  const api = { read, LIMITS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WA_PRICE_FILE = api;
})(typeof window === 'undefined' ? globalThis : window);
```

**New file 2.2** — `work/wa-replica/price-file.test.cjs`. The file does not exist yet. Create it with exactly this content (249 lines; the file ends with one newline):

```text
// Tests of the reader of price lists (fidelity-pricefile.js), which the page loads as pricefile.js.
// Run with Node 22.13 or newer:  node --test work/wa-replica/price-file.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const { read, LIMITS } = require('./fidelity-pricefile.js');

// ---- making files: a zip archive, and the parts of a workbook ----
// packed: true deflates a part, false stores it; lie makes the archive state a wrong unpacked size.
function zip(parts, { packed = true, lie = null } = {}) {
  const local = [], central = [];
  let offset = 0;
  for (const [name, content] of Object.entries(parts)) {
    const raw = Buffer.from(content), body = packed ? zlib.deflateRawSync(raw) : raw, label = Buffer.from(name);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(packed ? 8 : 0, 8);
    head.writeUInt32LE(zlib.crc32(raw), 14);
    head.writeUInt32LE(body.length, 18);
    head.writeUInt32LE(lie ?? raw.length, 22);
    head.writeUInt16LE(label.length, 26);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(packed ? 8 : 0, 10);
    entry.writeUInt32LE(zlib.crc32(raw), 16);
    entry.writeUInt32LE(body.length, 20);
    entry.writeUInt32LE(lie ?? raw.length, 24);
    entry.writeUInt16LE(label.length, 28);
    entry.writeUInt32LE(offset, 42);
    local.push(head, label, body);
    central.push(entry, label);
    offset += 30 + label.length + body.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(parts).length, 8);
  end.writeUInt16LE(Object.keys(parts).length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...local, directory, end]));
}
const xml = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const letters = n => (n >= 26 ? letters(Math.floor(n / 26) - 1) : '') + String.fromCharCode(65 + (n % 26));
// One sheet from rows of cells: a number is stored as a number, a text among the shared texts, an empty cell is
// left out — as a spreadsheet program writes them.
function sheetParts(rows) {
  const shared = [];
  const cell = (value, r, c) => {
    if (value === '' || value === null || value === undefined) return '';
    const ref = letters(c) + (r + 1);
    if (typeof value === 'number') return `<c r="${ref}"><v>${value}</v></c>`;
    if (typeof value === 'object') return `<c r="${ref}"${value.attrs || ''}>${value.body}</c>`;
    return `<c r="${ref}" t="s"><v>${shared.push(value) - 1}</v></c>`;
  };
  const data = rows.map((row, r) => `<row r="${r + 1}">${row.map((value, c) => cell(value, r, c)).join('')}</row>`).join('');
  return {
    sheet: `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${data}</sheetData></worksheet>`,
    strings: `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${shared.map(s => `<si><t>${xml(s)}</t></si>`).join('')}</sst>`,
  };
}
function workbook(rows, options = {}) {
  const { sheet, strings } = sheetParts(rows);
  return zip({
    '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
    'xl/workbook.xml': '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': sheet,
    'xl/sharedStrings.xml': strings,
  }, options);
}
const csv = text => new TextEncoder().encode(text);
const refused = async (bytes, code) => assert.equal(await read(bytes).then(() => 'read', e => e.code || 'thrown: ' + e.message), code);

// The shape of the owner's list: a title above the header, a name written once for several lines (cells that span
// the lines of a product), one column of prices.
const OWN = [
  ['product quotation'],
  ['short', 'full', 'specification', 'Price ($)'],
  ['PRDA01', 'Product Alpha', '100*10 Units', 40],
  ['PRDA02', '', '200*10 Units', 50],
  ['PRDA03', '', '150*10 Units', 55.5],
  ['PRDB01', 'Product Beta', '120*10 Units', 72],
  ['PRDB02', '', '60*10 Units', 290.1],
];

test('a workbook: the title above the header is passed over, a name written once is carried down, prices stay as the file gives them', async () => {
  const list = await read(workbook(OWN));
  assert.deepEqual(list.columns, { code: 'short', name: 'full', spec: 'specification', prices: ['Price ($)'] });
  assert.deepEqual(list.rows, [
    { code: 'PRDA01', name: 'Product Alpha', spec: '100*10 Units', prices: ['40'] },
    { code: 'PRDA02', name: 'Product Alpha', spec: '200*10 Units', prices: ['50'] },
    { code: 'PRDA03', name: 'Product Alpha', spec: '150*10 Units', prices: ['55.5'] },
    { code: 'PRDB01', name: 'Product Beta', spec: '120*10 Units', prices: ['72'] },
    { code: 'PRDB02', name: 'Product Beta', spec: '60*10 Units', prices: ['290.1'] },
  ]);
  assert.equal(list.skipped, 0);
});

test('a workbook whose parts are stored, not deflated, reads the same; so does an ArrayBuffer', async () => {
  const stored = workbook(OWN, { packed: false });
  assert.deepEqual((await read(stored)).rows, (await read(workbook(OWN))).rows);
  assert.equal((await read(stored.buffer.slice(stored.byteOffset, stored.byteOffset + stored.byteLength))).rows.length, 5);
});

test('a number keeps its digits; the tail a binary fraction leaves is taken off; a price in the thousands keeps its comma', async () => {
  const list = await read(workbook([
    ['code', 'name', 'price'],
    ['A1', 'One', { body: '<v>100.90000000000001</v>' }],
    ['A2', 'Two', { body: '<v>1.5E3</v>' }],
    ['A3', 'Three', { body: '<v>0.30000000000000004</v>' }],
    ['A4', 'Four', 1200],
    ['A5', 'Five', '1,200.50'],
  ]));
  assert.deepEqual(list.rows.map(r => r.prices[0]), ['100.9', '1500', '0.3', '1200', '1,200.50']);
});

test('a price written with its currency sign is a price and stays as it is written', async () => {
  const list = await read(csv('code,name,price,note\nA,One,$40,x\nB,Two,"$1,200.50",y\nC,Three,40 €,z\n'));
  assert.deepEqual(list.columns, { code: 'code', name: 'name', spec: 'note', prices: ['price'] });
  assert.deepEqual(list.rows.map(r => r.prices[0]), ['$40', '$1,200.50', '40 €']);
});

test('several columns of prices are all kept, each under its header', async () => {
  const list = await read(workbook([
    ['SKU', 'Product', 'Pack', '1-99 ($)', '100+ ($)', 'Note'],
    ['K-1', 'Kit one', '10 pcs', 12, 10.5, 'new'],
    ['K-2', 'Kit two', '20 pcs', 20, '', 'old'],
  ]));
  assert.deepEqual(list.columns.prices, ['1-99 ($)', '100+ ($)']);
  assert.deepEqual(list.rows, [
    { code: 'K-1', name: 'Kit one', spec: '10 pcs', prices: ['12', '10.5'] },
    { code: 'K-2', name: 'Kit two', spec: '20 pcs', prices: ['20', ''] },
  ]);
});

test('codes that are numbers are codes: the leftmost column and a column called a code are never prices', async () => {
  const left = await read(workbook([['item', 'name', 'price'], [1001, 'One', 5], [1002, 'Two', 6]]));
  assert.deepEqual(left.rows.map(r => [r.code, r.prices]), [['1001', ['5']], ['1002', ['6']]]);
  const named = await read(workbook([['name', 'SKU', 'price'], ['One', 1001, 5], ['Two', 1002, 6]]));
  assert.deepEqual(named.columns, { code: 'name', name: 'SKU', spec: '', prices: ['price'] });
});

test('two columns are enough: a code and a price', async () => {
  const list = await read(workbook([['code', 'USD'], ['A', 1], ['B', 2]]));
  assert.deepEqual(list.columns, { code: 'code', name: '', spec: '', prices: ['USD'] });
  assert.deepEqual(list.rows, [{ code: 'A', name: '', spec: '', prices: ['1'] }, { code: 'B', name: '', spec: '', prices: ['2'] }]);
});

test('a line without a price is left out and counted; an empty line is not counted', async () => {
  const list = await read(workbook([
    ['code', 'name', 'price'],
    ['A', 'One', 1],
    ['', '', ''],
    ['B', 'Two', ''],
    ['Discontinued'],
    ['C', 'Three', 3],
  ]));
  assert.deepEqual(list.rows.map(r => r.code), ['A', 'C']);
  assert.equal(list.skipped, 2);
});

test('texts are read as texts: runs of rich text are joined, phonetic guides left out, entities decoded, markup kept as it is written', async () => {
  const list = await read(workbook([
    ['code', 'name', 'price'],
    ['R1', { attrs: ' t="inlineStr"', body: '<is><r><t>Rich </t></r><r><t xml:space="preserve">text</t></r><rPh><t>guide</t></rPh></is>' }, 1],
    ['R2', 'Salt & <b>pepper</b>', 2],
    ['R3', { attrs: ' t="str"', body: '<f>CONCATENATE("a","b")</f><v>ab</v>' }, 3],
  ]));
  assert.deepEqual(list.rows.map(r => r.name), ['Rich text', 'Salt & <b>pepper</b>', 'ab']);
});

test('a cell is cut at the limit and its white space made single', async () => {
  const list = await read(workbook([['code', 'name', 'price'], ['L', 'a  b\n c' + 'x'.repeat(400), 1]]));
  assert.equal(list.rows[0].name.length, LIMITS.cell);
  assert(list.rows[0].name.startsWith('a b cx'));
});

test('the first sheet that holds a table is used; a part named from the root of the archive is found', async () => {
  const first = sheetParts([['only a title']]), second = sheetParts([['code', 'price'], ['Z', 9]]);
  const book = zip({
    'xl/workbook.xml': '<workbook xmlns:r="x"><sheets><sheet name="Cover" sheetId="1" r:id="rId1"/><sheet name="Prices" sheetId="2" r:id="rId2"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId2" Target="/xl/worksheets/prices.xml"/><Relationship Id="rId1" Target="worksheets/cover.xml"/></Relationships>',
    'xl/worksheets/cover.xml': first.sheet,
    'xl/worksheets/prices.xml': second.sheet.replace(/t="s"><v>(\d+)<\/v>/g, (all, n) => `t="inlineStr"><is><t>${['code', 'price', 'Z'][n]}</t></is>`),
  });
  assert.deepEqual((await read(book)).rows, [{ code: 'Z', name: '', spec: '', prices: ['9'] }]);
});

test('a text file: commas, semicolons or tabs between the cells; quoted cells; either kind of line end; a mark at the start', async () => {
  const want = [
    { code: 'A1', name: 'Bolt, steel', spec: '10 "long"', prices: ['1.50'] },
    { code: 'A2', name: 'Nut', spec: '', prices: ['0.25'] },
  ];
  for (const mark of [',', ';', '\t']) {
    for (const end of ['\n', '\r\n']) {
      const lines = [['code', 'name', 'spec', 'price'], ['A1', '"Bolt, steel"', '"10 ""long"""', '1.50'], ['A2', 'Nut', '', '0.25']].map(l => l.join(mark)).join(end);
      const list = await read(csv('﻿' + lines + end));
      assert.deepEqual(list.rows, want, JSON.stringify(mark) + ' ' + JSON.stringify(end));
      assert.deepEqual(list.columns, { code: 'code', name: 'name', spec: 'spec', prices: ['price'] });
    }
  }
});

test('a text file in Chinese with a currency in the header', async () => {
  const list = await read(csv('简称,全称,规格,单价（美元 $）\nA1,阿尔法,10 件,40\nA2,,20 件,50\n'));
  assert.deepEqual(list.columns, { code: '简称', name: '全称', spec: '规格', prices: ['单价（美元 $）'] });
  assert.deepEqual(list.rows[1], { code: 'A2', name: '阿尔法', spec: '20 件', prices: ['50'] });
});

test('files that are not a price list are refused with a reason', async () => {
  await refused(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]), 'old-excel');
  await refused(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]), 'unreadable');
  await refused(zip({ 'word/document.xml': '<w:document/>' }), 'unreadable');
  await refused(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 13]), 'unreadable');
  await refused(csv('just one line of words'), 'no-table');
  await refused(new Uint8Array(2), 'no-table');
  await refused(csv('code,name\nA,One\nB,Two\n'), 'no-prices');
  await refused(csv('code,name,price\n'), 'no-prices');
  await refused(workbook([['only a title']]), 'no-table');
  await refused(new Uint8Array(LIMITS.bytes + 1), 'too-large');
});

test('a list longer than the limit is refused, in a text file and in a workbook', async () => {
  const lines = ['code,price'];
  for (let i = 0; i <= LIMITS.rows; i++) lines.push(`C${i},${i + 1}`);
  await refused(csv(lines.join('\n')), 'too-many-rows');
  assert.equal((await read(csv(lines.slice(0, -1).join('\n')))).rows.length, LIMITS.rows);
  const rows = [['code', 'price']];
  for (let i = 0; i <= LIMITS.rows + 60; i++) rows.push(['C' + i, i + 1]);
  await refused(workbook(rows), 'too-many-rows');
});

test('a list whose texts take more room than the limit is refused', async () => {
  const lines = ['code,name,spec,price'];
  for (let i = 0; i < 2500; i++) lines.push(`C${i},${'n'.repeat(190)},${'s'.repeat(190)},${i + 1}`);
  await refused(csv(lines.join('\n')), 'too-long');
  assert.equal((await read(csv(lines.slice(0, 2001).join('\n')))).rows.length, 2000);
});

test('a part that unpacks to more than the limit is refused, whatever size the archive states for it', async () => {
  const huge = Buffer.alloc(LIMITS.part + 1024, 0x20);
  const honest = zip({ 'xl/workbook.xml': '<workbook/>', 'xl/worksheets/sheet1.xml': huge });
  assert(honest.length < LIMITS.bytes, 'the archive itself is small: ' + honest.length);
  await refused(honest, 'unreadable');
  await refused(zip({ 'xl/workbook.xml': '<workbook/>', 'xl/worksheets/sheet1.xml': huge }, { lie: 1000 }), 'unreadable');
});
```

**Verify**: `sha256sum work/wa-replica/fidelity-pricefile.js work/wa-replica/price-file.test.cjs` → `f93e8da98f7779d730bd2d05fdc13a74ed87f7087480977bcf8ef2bc07b66ea1`, `84f6125af5790f52890cd328bf3e586acc47d08fa6b7d92cec60b7d5c03e0b8b`; `$NODE --test work/wa-replica/price-file.test.cjs` → `pass 17`, `fail 0`. If a checksum does not match, delete the file and create it again from the plan; if it still does not match, or a test fails, STOP.

### Step 3: The page of the price list, the button in the message box, the build

**New file 3.1** — `work/wa-replica/fidelity-pricelist.js`. The file does not exist yet. Create it with exactly this content (200 lines; the file ends with one newline):

```text
  // ============================================================================
  // The price list (plan 037). A person uploads an Excel or CSV file on the page "价格表"; the file is read in the
  // browser (pricefile.js) and its products replace the list. In a conversation the button "报价" beside the
  // message box finds a product and puts its price into the message box. Nothing here sends a message, suggests
  // a product by itself or calls a server; a price is shown exactly as the file gives it.
  // ============================================================================
  const PRICE_MESSAGES = {
    'too-large': '文件超过 5 MB，无法作为价格表。',
    'too-long': '价格表的内容过多，请精简后再上传。',
    'too-many-rows': '价格表的行数过多，请拆分或精简后再上传。',
    'old-excel': '这是旧版 Excel（.xls）文件。请在 Excel 中另存为 .xlsx 或 CSV 后再上传。',
    unreadable: '无法读取这个文件。请上传 Excel（.xlsx）或 CSV 文件。',
    'no-table': '文件里没有找到表格：需要一行表头和至少一行产品。',
    'no-prices': '文件里没有找到价格列：价格一列的内容应为数字。',
  };
  const PRICE_QUOTE_ROWS = 50;
  const priceView = { query: '', quote: '', pending: null };
  ui.pageSizes.prices ||= 20;

  // The list in use: { file, at, by, columns: { code, name, spec, prices: [..] }, rows: [{ code, name, spec, prices }] }.
  function priceList() {
    const list = data.priceList;
    return list && Array.isArray(list.rows) && Array.isArray(list.columns?.prices) ? list : null;
  }
  // Letters and digits only, in lower case: "PRD-A 01" is found by "prda01".
  const priceFold = value => String(value ?? '').toLowerCase().replace(/[\s\-_./]+/g, '');
  // The products that carry every word of the query in their code, name or specification; those whose code
  // starts with the query come first.
  function priceMatches(query, list = priceList()) {
    if (!list) return [];
    const words = String(query || '').trim().split(/\s+/).map(priceFold).filter(Boolean);
    if (!words.length) return list.rows;
    const whole = words.join('');
    const found = list.rows.filter(entry => {
      const hay = [entry.code, entry.name, entry.spec].map(priceFold).join(' ');
      return words.every(word => hay.includes(word));
    });
    return [...found.filter(entry => priceFold(entry.code).startsWith(whole)), ...found.filter(entry => !priceFold(entry.code).startsWith(whole))];
  }
  // The currency a price column's header names: "Price ($)" gives "$40", "USD" gives "USD 40", none gives "40".
  // A price that carries its own sign in the file ("$40") stays as it is.
  const PRICE_CURRENCY = /US\$|HK\$|[$€£¥₹₽₩₫฿]|\b(?:USD|EUR|GBP|CNY|RMB|HKD|JPY|AUD|CAD|SGD|MXN|BRL|INR|AED|SAR)\b/i;
  const PRICE_CURRENCY_WORDS = [[/美元|美金/, '$'], [/欧元/, '€'], [/英镑/, '£'], [/人民币/, '¥']];
  function priceMoney(label, value) {
    const sign = PRICE_CURRENCY.exec(label || '')?.[0] || PRICE_CURRENCY_WORDS.find(([word]) => word.test(label || ''))?.[1] || '';
    return !sign || /[$€£¥]/.test(value) ? value : /^[A-Za-z]{3}$/.test(sign) ? `${sign.toUpperCase()} ${value}` : sign + value;
  }
  // What a price column is called once the currency is taken out of its header: "100+ ($)" is "100+".
  const priceColumnName = label => String(label || '').replace(PRICE_CURRENCY, '').replace(/[（(]\s*[）)]/g, '').replace(/\s+/g, ' ').trim();
  const priceHeads = list => [list.columns.code || '简称', ...(list.columns.name ? [list.columns.name] : []), ...(list.columns.spec ? [list.columns.spec] : []), ...list.columns.prices.map((label, i) => label || `价格 ${i + 1}`)];
  const priceCells = (list, entry) => [entry.code, ...(list.columns.name ? [entry.name] : []), ...(list.columns.spec ? [entry.spec] : []), ...list.columns.prices.map((label, i) => entry.prices[i] || '')];
  // The line that goes into the message box, e.g. "Product Alpha PRDA01 (100*10 Units): $40". With several price
  // columns the line says which one: "... : $10.5 (100+)".
  function priceLine(list, entry, at) {
    const label = list.columns.prices[at] || '';
    const column = list.columns.prices.length > 1 ? priceColumnName(label) : '';
    return `${[entry.name, entry.code].filter(Boolean).join(' ')}${entry.spec ? ` (${entry.spec})` : ''}: ${priceMoney(label, entry.prices[at])}${column ? ` (${column})` : ''}`;
  }

  // ---- page: #prices (价格表) ----
  function priceTableHTML() {
    const list = priceList();
    const found = priceMatches(priceView.query, list);
    const heads = ['序号', ...(list ? priceHeads(list) : ['简称', '名称', '规格', '价格'])].map(esc);
    const rows = paged(found, 'prices').map((entry, i) => `<tr><td>${rowNumber('prices', i)}</td>${priceCells(list, entry).map(cell => `<td>${esc(cell || '—')}</td>`).join('')}</tr>`).join('');
    return fidTable('price-table', heads, rows, list ? '没有匹配的产品' : '还没有价格表。请上传 Excel（.xlsx）或 CSV 文件。', true, 'FileText') + fidPager(found.length, 'prices', [20, 50, 100]);
  }
  function renderPriceList() {
    const list = priceList();
    const about = list
      ? `当前价格表：${list.file || '未命名文件'}，共 ${list.rows.length} 个产品，${fidDate(list.at)} 由 ${member(list.by)?.name || list.by || '—'} 上传`
      : '尚未上传价格表';
    return `<section class="fid-page"><div class="fid-panel price-panel">
      ${fidHead('价格表', '上传一份 Excel（.xlsx）或 CSV 文件作为价格表。在聊天界面点击消息框旁的「报价」，即可查找产品并把价格放入消息框；消息仍由你确认后发送。')}
      <div class="fid-actions price-toolbar">
        ${fidButton('上传价格表', 'priceUpload', 'File', 'blue')}
        <input type="file" id="price-file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden>
        <input type="search" class="fid-input" id="price-search" aria-label="搜索价格表" placeholder="搜索简称 / 名称 / 规格" value="${esc(priceView.query)}" ${list ? '' : 'disabled'}>
        ${list ? fidButton('清空价格表', 'priceClear', 'Trash2') : ''}
        <span class="fid-small-note" id="price-about">${esc(about)}</span>
      </div>
      <p class="price-note">文件要求：一张表，第一行为表头；内容为数字的列会被识别为价格（可以有多列），其余各列从左到右依次为产品简称、名称、规格。新上传的文件会替换当前价格表。</p>
      <div class="fid-table-card" id="price-table-card">${priceTableHTML()}</div>
    </div></section>`;
  }
  function priceRefreshTable() {
    const card = $('#price-table-card');
    if (!card) return;
    card.innerHTML = priceTableHTML();
    paintIcons(card);
  }
  const priceProblem = code => fidDialog('无法使用这个文件', `<div class="modal-body"><p>${esc(PRICE_MESSAGES[code] || PRICE_MESSAGES.unreadable)}</p></div>`, fidButton('知道了', 'close', '', 'blue'));
  // A file was chosen: read it here in the browser and show what was found before anything is replaced.
  async function priceRead(file) {
    if (!file) return;
    if (file.size > window.WA_PRICE_FILE.LIMITS.bytes) return priceProblem('too-large');
    let list;
    try {
      list = await window.WA_PRICE_FILE.read(new Uint8Array(await file.arrayBuffer()));
    } catch (problem) {
      return priceProblem(problem?.code);
    }
    priceView.pending = { file: String(file.name || '').slice(0, 120), columns: list.columns, rows: list.rows };
    const heads = priceHeads(list).map(esc), first = list.rows.slice(0, 5);
    const names = [['简称', list.columns.code], ['名称', list.columns.name], ['规格', list.columns.spec], ['价格', list.columns.prices.join('、')]].filter(([, label]) => label);
    fidDialog('确认价格表', `<div class="modal-body price-preview">
      <p>文件：<strong>${esc(priceView.pending.file)}</strong></p>
      <p>读取到 <strong>${list.rows.length}</strong> 个产品${list.skipped ? `，另有 ${list.skipped} 行没有价格，已略过` : ''}。各列按表头识别为：${names.map(([name, label]) => `${name} = ${esc(label)}`).join('；')}。</p>
      <div class="fid-table-scroll"><table class="fid-table price-table"><thead><tr>${heads.map(head => `<th scope="col">${head}</th>`).join('')}</tr></thead><tbody>${first.map(entry => `<tr>${priceCells(list, entry).map(cell => `<td>${esc(cell || '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="price-note">${list.rows.length > first.length ? `以上为前 ${first.length} 个产品。` : ''}确认后将${priceList() ? '替换当前价格表' : '作为价格表使用'}。</p>
    </div>`, fidButton('确认使用', 'priceUse', '', 'blue') + fidButton('取 消', 'close'), true);
  }

  // ---- conversation: the button "报价" and its dialog ----
  // Called by the message box (see build-fidelity.cjs); a function declaration, so it exists from the start.
  function priceQuoteButton() {
    return `<button type="button" class="price-quote-button" data-action="priceQuote" aria-label="报价" title="从价格表选择产品，把价格放入消息框">${icon('ListOrdered')}<span>报价</span></button>`;
  }
  function priceQuoteRows() {
    const list = priceList();
    if (!list) return `<div class="price-quote-empty"><p>还没有价格表。</p>${fidButton('去上传价格表', 'priceOpenPage', 'File', 'blue')}</div>`;
    const found = priceMatches(priceView.quote, list);
    if (!found.length) return '<div class="price-quote-empty"><p>没有匹配的产品</p></div>';
    const several = list.columns.prices.length > 1;
    const rows = found.slice(0, PRICE_QUOTE_ROWS).map(entry => {
      const prices = entry.prices.map((value, at) => (value
        ? `<button type="button" class="fid-btn slim tint" data-action="priceInsert" data-id="${list.rows.indexOf(entry)}:${at}" title="${esc(priceLine(list, entry, at))}">${several && priceColumnName(list.columns.prices[at]) ? `<small>${esc(priceColumnName(list.columns.prices[at]))}</small> ` : ''}${esc(priceMoney(list.columns.prices[at], value))}</button>`
        : '')).join('');
      return `<li class="price-quote-row"><span class="price-quote-product"><strong>${esc(entry.code)}</strong>${entry.name ? ` <span>${esc(entry.name)}</span>` : ''}${entry.spec ? ` <small>${esc(entry.spec)}</small>` : ''}</span><span class="price-quote-prices">${prices}</span></li>`;
    }).join('');
    const more = found.length - PRICE_QUOTE_ROWS;
    return `<ul class="price-quote-list">${rows}</ul>${more > 0 ? `<p class="price-note">还有 ${more} 个产品未显示，请继续输入以缩小范围。</p>` : ''}`;
  }
  function priceQuoteOpen() {
    if (!selectedCustomer() || !$('#composer-text')) return;
    priceView.quote = '';
    fidDialog('报价', `<div class="modal-body price-quote">
      <input type="search" class="fid-input" id="price-quote-search" aria-label="查找产品" placeholder="输入产品简称或名称查找" ${priceList() ? '' : 'disabled'}>
      <p class="price-note">点击价格，把这一行报价放入消息框；不会自动发送。</p>
      <div id="price-quote-rows">${priceQuoteRows()}</div>
    </div>`, fidButton('关 闭', 'close'), true);
    $('#price-quote-search')?.focus();
  }

  Object.assign(fidActions, {
    priceUpload: () => $('#price-file')?.click(),
    priceUse: () => {
      const pending = priceView.pending;
      if (!pending) return;
      data.priceList = { file: pending.file, at: new Date().toISOString(), by: ui.persona, columns: pending.columns, rows: pending.rows };
      Object.assign(priceView, { pending: null, query: '' });
      ui.pages.prices = 0;
      persist();
      close();
      render();
      toast(`价格表已更新，共 ${pending.rows.length} 个产品。`);
    },
    priceClear: () => { if (priceList()) fidConfirm('清空价格表', '清空后，聊天界面的「报价」将没有可选的产品。确认清空当前价格表？', 'priceClearDo'); },
    priceClearDo: () => {
      delete data.priceList;
      Object.assign(priceView, { pending: null, query: '' });
      persist();
      close();
      render();
      toast('价格表已清空。');
    },
    priceQuote: priceQuoteOpen,
    priceOpenPage: () => { close(); navigate('prices'); },
    // Puts the line of one price at the end of the message box. The message is not sent.
    priceInsert: id => {
      const list = priceList(), [row, at] = String(id).split(':').map(Number), entry = list?.rows[row], box = $('#composer-text');
      if (!entry || !entry.prices[at] || !box) return;
      close();
      const before = box.value.replace(/\s+$/, '');
      box.value = (before ? before + '\n' : '') + priceLine(list, entry, at);
      box.dispatchEvent(new Event('input', { bubbles: true }));
      box.focus();
      box.setSelectionRange(box.value.length, box.value.length);
    },
  });

  document.addEventListener('change', event => {
    if (event.target.id !== 'price-file') return;
    const file = event.target.files?.[0];
    event.target.value = '';
    priceRead(file);
  });
  document.addEventListener('input', event => {
    const input = event.target;
    if (input.id === 'price-search') {
      priceView.query = input.value;
      ui.pages.prices = 0;
      priceRefreshTable();
    } else if (input.id === 'price-quote-search') {
      priceView.quote = input.value;
      const rows = $('#price-quote-rows');
      rows.innerHTML = priceQuoteRows();
      paintIcons(rows);
    }
  });
```

#### `build-fidelity.cjs`

**Edit 3.2** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
const aiPages = read(__dirname, 'fidelity-ai.js');
const subsiteSession = read(__dirname, 'fidelity-subsite.js');
swap('  render();\n})();', [read(__dirname, 'fidelity-ui.js'), customerPages, operationsPages, openwaPages, dashboardPage, lifecyclePages, aiPages, subsiteSession].join('\n') + '\n  render();\n  window.initWAElementReview(toast);\n})();');
// Reviewer tools removed (plan 019): the review panel, the requirements page with its export, and the notes
```

Replace them with:

```text
const aiPages = read(__dirname, 'fidelity-ai.js');
const pricePages = read(__dirname, 'fidelity-pricelist.js');
const subsiteSession = read(__dirname, 'fidelity-subsite.js');
swap('  render();\n})();', [read(__dirname, 'fidelity-ui.js'), customerPages, operationsPages, openwaPages, dashboardPage, lifecyclePages, aiPages, pricePages, subsiteSession].join('\n') + '\n  render();\n  window.initWAElementReview(toast);\n})();');
// Reviewer tools removed (plan 019): the review panel, the requirements page with its export, and the notes
```

**Edit 3.3** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
cut(/^    const reviewed=req\.review\.items[^\n]*\n/m, 'review counter');
swap("ai:'AI 能力',scope:'功能范围'}", "ai:'AI 能力'}");
swap('ai:renderAiPage,scope:renderScope}', 'ai:renderAiPage}');
cut(/^  function scopeCard\(m\) \{\n[\s\S]*?^  function renderScope\(\) \{\n[\s\S]*?^  \}\n/m, 'requirements page');
```

Replace them with:

```text
cut(/^    const reviewed=req\.review\.items[^\n]*\n/m, 'review counter');
swap("ai:'AI 能力',scope:'功能范围'}", "ai:'AI 能力',prices:'价格表'}");
swap('ai:renderAiPage,scope:renderScope}', 'ai:renderAiPage,prices:renderPriceList}');
cut(/^  function scopeCard\(m\) \{\n[\s\S]*?^  function renderScope\(\) \{\n[\s\S]*?^  \}\n/m, 'requirements page');
```

**Edit 3.4** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
swap("<span>'+esc(c.campaign||'客户来源')+'</span></div>'", "<span>'+esc(c.campaign||'客户来源')+'</span>'+aiLanguagePicker(c)+'</div>'");
new vm.Script(js, {filename:'app.js'});
```

Replace them with:

```text
swap("<span>'+esc(c.campaign||'客户来源')+'</span></div>'", "<span>'+esc(c.campaign||'客户来源')+'</span>'+aiLanguagePicker(c)+'</div>'");
// The price list (plan 037): the message box gets the button "报价" from fidelity-pricelist.js, after the button of
// the quick replies.
swap("+icon('MessageSquareText')+'</button><span class=\"language-hint\">'", "+icon('MessageSquareText')+'</button>'+priceQuoteButton()+'<span class=\"language-hint\">'");
new vm.Script(js, {filename:'app.js'});
```

**Edit 3.5** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
  'tokens.css':tokenCSS,'components.css':read(base,'components.css'),
  'icons.js':iconJS,'boot.js':read(__dirname,'fidelity-boot.js'),
  'lucide-license.txt':read(base,'lucide-license.txt'),
```

Replace them with:

```text
  'tokens.css':tokenCSS,'components.css':read(base,'components.css'),
  'icons.js':iconJS,'boot.js':read(__dirname,'fidelity-boot.js'),'pricefile.js':read(__dirname,'fidelity-pricefile.js'),
  'lucide-license.txt':read(base,'lucide-license.txt'),
```

#### `fidelity-index.html`

**Edit 3.6** — `work/wa-replica/fidelity-index.html`. Find exactly these lines (they occur once):

```text
  <dialog id="dialog" aria-label="编辑信息"><div id="dialog-content"></div></dialog>
  <script src="icons.js"></script><script src="app.js"></script><script src="boot.js"></script>
</body>
```

Replace them with:

```text
  <dialog id="dialog" aria-label="编辑信息"><div id="dialog-content"></div></dialog>
  <script src="icons.js"></script><script src="pricefile.js"></script><script src="app.js"></script><script src="boot.js"></script>
</body>
```

#### `fidelity-lifecycle.js`

**Edit 3.7** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
      '<div class="nav-caption">工作台设置</div>' +
      renderItem('ai', views.ai)
    );
```

Replace them with:

```text
      '<div class="nav-caption">工作台设置</div>' +
      renderItem('ai', views.ai) +
      renderItem('prices', views.prices)
    );
```

#### `fidelity.css`

**Append 3.8** — `work/wa-replica/fidelity.css`. Add at the end of the file, after one empty line:

```text
/* The price list (plan 037): its page, the button "报价" beside the message box and the dialog it opens. */
.price-toolbar #price-search { width:240px; }
.price-note { margin:10px 0; color:var(--fid-quiet); font-size:12px; line-height:1.6; }
.price-table { min-width:540px; }
.price-table th,.price-table td { text-align:left; }
.price-table col:first-child { width:64px; }
.price-preview p { margin:0 0 10px; font-size:13px; }
.price-quote-button { display:inline-flex; align-items:center; gap:4px; margin-left:6px; padding:2px 8px; border:1px solid var(--fid-frame); border-radius:999px; background:var(--color-surface); color:var(--fid-ink); font:inherit; font-size:12px; line-height:18px; white-space:nowrap; cursor:pointer; }
.price-quote-button:hover { border-color:var(--color-accent); color:var(--color-accent); }
.price-quote-button:focus-visible { outline:2px solid var(--color-accent); outline-offset:1px; }
.price-quote-button .icon { width:14px; height:14px; }
.price-quote .fid-input { width:100%; }
.price-quote-list { list-style:none; max-height:360px; margin:0; padding:0; overflow:auto; border:1px solid var(--fid-frame); border-radius:8px; }
.price-quote-row { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 12px; border-bottom:1px solid var(--fid-frame); }
.price-quote-row:last-child { border-bottom:0; }
.price-quote-product { display:flex; flex-wrap:wrap; align-items:baseline; gap:4px 8px; min-width:0; font-size:13px; }
.price-quote-product small { color:var(--fid-quiet); font-size:12px; }
.price-quote-prices { display:flex; flex:none; flex-wrap:wrap; justify-content:flex-end; gap:6px; margin-left:auto; }
.price-quote-prices small { margin-right:4px; opacity:.75; }
.price-quote-empty { display:grid; justify-items:center; gap:10px; padding:20px; color:var(--fid-quiet); font-size:13px; }
/* Where the conversation is narrow the button shows its icon only, and stands close to its neighbours. */
@media(max-width:1000px) {
  .price-quote-button { margin-left:0; padding:2px 4px; }
  .price-quote-button>span:not(.icon) { display:none; }
  .composer-tools .language-hint { margin-left:0; }
}
@media(max-width:760px) {
  .price-toolbar #price-search { width:100%; }
  .price-quote-row { flex-wrap:wrap; }
}
```

#### `validate-scrm-lifecycle.cjs`

**Edit 3.9** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(appJs.includes("+aiLanguagePicker(c)+'</div>'") && appJs.includes("esc(aiLanguageLabel(c))+' · '+aiDraftHint(c)"), 'the conversation must offer the choice of the customer\'s language and show it beside the message box');
// 22. The page uses the real WhatsApp connection through its own server; nothing simulates it any more.
```

Replace them with:

```text
assert(appJs.includes("+aiLanguagePicker(c)+'</div>'") && appJs.includes("esc(aiLanguageLabel(c))+' · '+aiDraftHint(c)"), 'the conversation must offer the choice of the customer\'s language and show it beside the message box');
// The price list: a file a person uploads is read in the browser by pricefile.js — the built copy of
// fidelity-pricefile.js, which the page loads before the app. Neither the reader nor the page module calls a
// server or runs what a file holds, and the button "报价" puts a price into the message box without sending.
const priceReader = read(path.join(__dirname, 'fidelity-pricefile.js')), pricePage = read(path.join(__dirname, 'fidelity-pricelist.js'));
assert.equal(read(path.join(out, 'pricefile.js')), priceReader, 'pricefile.js must be the built copy of fidelity-pricefile.js');
assert(indexHtml.includes('<script src="icons.js"></script><script src="pricefile.js"></script><script src="app.js"></script>'), 'index.html must load pricefile.js before app.js');
for (const [name, source] of [['fidelity-pricefile.js', priceReader], ['fidelity-pricelist.js', pricePage]]) {
  assert(!/\b(?:fetch|XMLHttpRequest|WebSocket|eval|importScripts)\s*\(|new Function\b/.test(source), `${name} must not call a server or run text as code`);
}
assert(!/\bsend\s*\(/.test(pricePage), 'the price list must not send a message');
for (const required of ['function priceQuoteButton() {', 'function renderPriceList() {', 'window.WA_PRICE_FILE.read(new Uint8Array(await file.arrayBuffer()))', "fidButton('确认使用', 'priceUse', '', 'blue')", 'priceInsert: id => {', "box.dispatchEvent(new Event('input', { bubbles: true }));"]) {
  assert(pricePage.includes(required), `fidelity-pricelist.js is missing ${required}`);
}
for (const required of ["+priceQuoteButton()+'<span class=\"language-hint\">'", "ai:'AI 能力',prices:'价格表'}", 'ai:renderAiPage,prices:renderPriceList}', "renderItem('prices', views.prices)"]) {
  assert(appJs.includes(required), `app.js is missing ${required}`);
}
// 22. The page uses the real WhatsApp connection through its own server; nothing simulates it any more.
```

**Edit 3.10** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  whatsappConnection: 'real, through the sub-site\'s own server: QR code, incoming events, sending; no simulation',
  externalNetworkCalls: false,
```

Replace them with:

```text
  whatsappConnection: 'real, through the sub-site\'s own server: QR code, incoming events, sending; no simulation',
  priceList: 'an .xlsx or .csv file is read in the browser (pricefile.js) and, once confirmed, replaces the list; the button 报价 beside the message box puts one product\'s price into the message box and sends nothing',
  externalNetworkCalls: false,
```

**Verify**: `sha256sum work/wa-replica/fidelity-pricelist.js work/wa-replica/build-fidelity.cjs work/wa-replica/fidelity-index.html work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs` → `ad69850ff2a1548e52171b760a9d90f92c88a79b7e5f27470eb15cd10cb142a6`, `1c3107cbaf26cdef67a991ba28f433c42fe2b82c7edc318f68f88aa6292db87d`, `95f37db26f84e10c5c1cd91c761ac19e0b534504815aa7b6ff33bf7cb826880d`, `62bd3369424338d26b879182162b04aa88f77c4260f827a8232d1219ad7d5f12`, `4497fb533ae7163a473e5c5dbaee610f5b0cefa80e2e2e499e4f3d6dd9942c48`, `65ef9ab46136ae300e5c23c2727d93bca4058904799ac2e1b0a55d0dab619c88`; the syntax command → `SYNTAX_OK`; `git checkout 5f5e7f7 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84` (a message "Missing prototype source anchor" means a swap does not match the baseline — STOP); `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; the icon-set command → `removed= added=`; `sha256sum outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/app.css outputs/wa-replica-prototype/index.html outputs/wa-replica-prototype/pricefile.js` → `9976688e498aa312b987708b55f7b13bcfc5de3f429c5590d5d3b3ec28cddd36`, `9916815a9fd9f4ff2652890746ab26903fff28f3285c476658224f58194d91b3`, `95f37db26f84e10c5c1cd91c761ac19e0b534504815aa7b6ff33bf7cb826880d`, `f93e8da98f7779d730bd2d05fdc13a74ed87f7087480977bcf8ef2bc07b66ea1`; `git diff --quiet 5f5e7f7 -- outputs/wa-replica-prototype/icons.js outputs/wa-replica-prototype/tokens.css` exits 0. If a checksum does not match, restore the file with `git checkout 5f5e7f7 -- <file>` (or delete it, if it is a new one) and apply its instructions again; if it still does not match, STOP.

### Step 4: README, build log, final verification

#### `README.md`

**Edit 4.1** — `README.md`. Find exactly these lines (they occur once):

````text
node --test work/wa-replica/openwa-link.test.cjs   # OpenWA 连接接口的测试（使用本地替身，不连接真实 OpenWA；需要 Node 22.13 或更新版本）
```
````

Replace them with:

````text
node --test work/wa-replica/openwa-link.test.cjs   # OpenWA 连接接口的测试（使用本地替身，不连接真实 OpenWA；需要 Node 22.13 或更新版本）
node --test work/wa-replica/price-file.test.cjs   # 价格表文件读取的测试（需要 Node 22.13 或更新版本）
```
````

**Edit 4.2** — `README.md`. Find exactly these lines (they occur once):

```text
| `#ai` | **AI 能力** | AI 功能的统一接入点：能力清单与逐项启停（接收消息翻译、发送前翻译、语音转文字）、译文语言、回复语气、业务说明与发送保护设置、按能力累计的调用次数与字符数、最近调用记录；经本站服务器中转调用模型服务；服务器未配置时显示「未连接」，不提供翻译 |

```

Replace them with:

```text
| `#ai` | **AI 能力** | AI 功能的统一接入点：能力清单与逐项启停（接收消息翻译、发送前翻译、语音转文字）、译文语言、回复语气、业务说明与发送保护设置、按能力累计的调用次数与字符数、最近调用记录；经本站服务器中转调用模型服务；服务器未配置时显示「未连接」，不提供翻译 |
| `#prices` | **价格表** | 上传一份 Excel（.xlsx）或 CSV 文件作为价格表：文件在浏览器内读取，先预览识别结果，确认后替换当前价格表；按简称、名称、规格搜索。聊天界面消息框旁的「报价」按钮从价格表查找产品，点击价格即把一行报价（如 `Product Alpha PRDA01 (100*10 Units): $40`）放入消息框，由员工确认后发送；系统不自动报价、不自动发送 |

```

**Edit 4.3** — `README.md`. Find exactly these lines (they occur once):

```text
│   │   ├── boot.js / icons.js                         # 启动、登录与数据同步脚本；内联 Lucide 矢量图标集
│   │   ├── requirements.json                          # 结构化需求与模块评审配置
```

Replace them with:

```text
│   │   ├── boot.js / icons.js                         # 启动、登录与数据同步脚本；内联 Lucide 矢量图标集
│   │   ├── pricefile.js                               # 价格表文件读取脚本（fidelity-pricefile.js 的构建副本）
│   │   ├── requirements.json                          # 结构化需求与模块评审配置
```

**Edit 4.4** — `README.md`. Find exactly these lines (they occur once):

```text
│       ├── fidelity-boot.js                           # 页面启动：登录界面、读取子站数据、把修改保存到服务器
│       ├── ai-relay.cjs / ai-relay.test.cjs           # 预览服务的 AI 中转接口（读取服务器上的密钥并调用模型服务与语音服务）及其测试
```

Replace them with:

```text
│       ├── fidelity-boot.js                           # 页面启动：登录界面、读取子站数据、把修改保存到服务器
│       ├── fidelity-pricelist.js                      # 「价格表」页（上传、预览、搜索）与聊天界面消息框旁的「报价」
│       ├── fidelity-pricefile.js / price-file.test.cjs# Excel（.xlsx）/ CSV 价格表文件的读取（在浏览器内运行）及其测试
│       ├── ai-relay.cjs / ai-relay.test.cjs           # 预览服务的 AI 中转接口（读取服务器上的密钥并调用模型服务与语音服务）及其测试
```

#### `replica/build-log.md`

**Append 4.5** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 价格表与聊天界面的「报价」 · 2026-11-22

项目负责人选定的功能之一（按价格表报价），做法由项目负责人确定：聊天界面放一个「报价」按钮，价格表在工作台内上传。

现在：侧栏「工作台设置」下新增「价格表」页。上传一份 Excel（.xlsx）或 CSV 文件，文件只在浏览器内读取，不上传原文件：系统按表头识别各列——内容为数字的列是价格（可以有多列），其余各列从左到右依次为产品简称、名称、规格；表头上方的标题行会被略过，跨多行合并的名称会补到每一行。读取结果先显示预览（产品数、各列的含义、前 5 个产品），确认后才替换当前价格表；页面可按简称、名称、规格搜索，也可清空价格表。旧版 .xls、没有价格列、超过 5 MB 或 5000 行的文件会被拒绝并说明原因。

聊天界面消息框旁新增「报价」按钮：打开后输入简称或名称查找产品（不区分大小写，忽略空格和连字符），点击价格，即把一行报价放到消息框末尾，例如「Product Alpha PRDA01 (100*10 Units): $40」；币种取自价格列的表头。按钮不会发送消息，也不会自动推荐产品——消息仍由员工确认（并按客户语言翻译）后发送。价格表随子站数据保存在服务器上，子站内所有账号共用。
```

Then verify everything once more:

```bash
git checkout 5f5e7f7 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && $NODE --test work/wa-replica/price-file.test.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-037/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test runs end with `pass 17`, `fail 0` and `pass 12`, `fail 0`; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `6f453eea74f3c45d2f3c3550f17423fdacee96e75e06eefef243ea7a40fbb936`, `2418f86cbfdf21d895dc2c2f692cf6136b8f8d3f643d3c6d05e3b20ebd19a25f`; `git status --porcelain` lists exactly fifteen paths: the three new source files and `outputs/wa-replica-prototype/pricefile.js` as untracked (`??`), and as modified `README.md`, `replica/build-log.md`, the five edited files under `work/wa-replica/`, and `outputs/wa-replica-prototype/app.js`, `app.css`, `index.html` and `validation.json` (if `outputs/wa-replica-prototype/icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). Add the four new files and commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Tests of the reader** (`price-file.test.cjs`, 17 tests, new) — they make their own files: a workbook like the owner's (title, a name written once, prices kept as given), stored and deflated parts, numbers as a sheet stores them, prices written with their currency sign, several price columns, codes that are numbers, a list of two columns, lines without a price, rich text and markup, the cell limit, a second sheet and a part named from the root, text files with three kinds of separators and both line ends, Chinese headers, the refusals (old Excel, not an archive, no table, no prices, too large, too many lines, too much text) and a part that unpacks beyond the limit whatever size the archive states.
- **Validator** — `pricefile.js` is the built copy of the reader and is loaded before the app; neither the reader nor the page module calls a server or runs text as code; the page module never sends; the page, the menu entry and the button in the message box are in the built app.
- **Smoke** (`/tmp/wa-scrm-plan-037/smoke.sh`) — the same facts on the built files, the tests of the reader and of the server (12 as before; no server change), the README, the syntax of the modules.
- The build and the validator do not run the page. **Verified by the reviewer in scripted browser sessions, not by you**: the page starts and its menu has the entry; an empty page; a workbook is shown before it is used and nothing is kept until it is confirmed; headers and rows as in the file, a name carried down, markup shown as text; the list is on the server and comes back after a reload; reading and using a file calls nothing but the saving of the data; the search; four files that are no price list, each refused with its reason while the list in use stays; a second file replaces the list; clearing asks first. In a conversation: without a list the dialog says so and leads to the page; a product is found however its code is typed; a click puts the line into an empty message box, or on a line of its own after what is typed; the draft keeps it; nothing is sent; several price columns give a button each and the line names the column; narrow screens. The sessions of the rest of the product and of the connection still pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 5f5e7f7 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/price-file.test.cjs` → `pass 17`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-037/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-pricefile.js` → `f93e8da98f7779d730bd2d05fdc13a74ed87f7087480977bcf8ef2bc07b66ea1`
- [ ] `sha256sum work/wa-replica/price-file.test.cjs` → `84f6125af5790f52890cd328bf3e586acc47d08fa6b7d92cec60b7d5c03e0b8b`
- [ ] `sha256sum work/wa-replica/fidelity-pricelist.js` → `ad69850ff2a1548e52171b760a9d90f92c88a79b7e5f27470eb15cd10cb142a6`
- [ ] `sha256sum work/wa-replica/build-fidelity.cjs` → `1c3107cbaf26cdef67a991ba28f433c42fe2b82c7edc318f68f88aa6292db87d`
- [ ] `sha256sum work/wa-replica/fidelity-index.html` → `95f37db26f84e10c5c1cd91c761ac19e0b534504815aa7b6ff33bf7cb826880d`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.js` → `62bd3369424338d26b879182162b04aa88f77c4260f827a8232d1219ad7d5f12`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `4497fb533ae7163a473e5c5dbaee610f5b0cefa80e2e2e499e4f3d6dd9942c48`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `65ef9ab46136ae300e5c23c2727d93bca4058904799ac2e1b0a55d0dab619c88`
- [ ] `sha256sum README.md` → `6f453eea74f3c45d2f3c3550f17423fdacee96e75e06eefef243ea7a40fbb936`
- [ ] `sha256sum replica/build-log.md` → `2418f86cbfdf21d895dc2c2f692cf6136b8f8d3f643d3c6d05e3b20ebd19a25f`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `9976688e498aa312b987708b55f7b13bcfc5de3f429c5590d5d3b3ec28cddd36`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `9916815a9fd9f4ff2652890746ab26903fff28f3285c476658224f58194d91b3`
- [ ] `sha256sum outputs/wa-replica-prototype/index.html` → `95f37db26f84e10c5c1cd91c761ac19e0b534504815aa7b6ff33bf7cb826880d`
- [ ] `sha256sum outputs/wa-replica-prototype/pricefile.js` → `f93e8da98f7779d730bd2d05fdc13a74ed87f7087480977bcf8ef2bc07b66ea1`
- [ ] the icon-set command prints `removed= added=`, and `git diff --quiet 5f5e7f7 -- outputs/wa-replica-prototype/icons.js outputs/wa-replica-prototype/tokens.css` exits 0
- [ ] `git diff --name-only 5f5e7f7..HEAD -- . ':!plans'` lists exactly these fifteen: `README.md`, `outputs/wa-replica-prototype/app.css`, `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/index.html`, `outputs/wa-replica-prototype/pricefile.js`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/build-fidelity.cjs`, `work/wa-replica/fidelity-index.html`, `work/wa-replica/fidelity-lifecycle.js`, `work/wa-replica/fidelity-pricefile.js`, `work/wa-replica/fidelity-pricelist.js`, `work/wa-replica/fidelity.css`, `work/wa-replica/price-file.test.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum, one of the new files already exists).
- The lines to find do not occur exactly once in their file.
- A checksum does not match after you have restored or re-created the file and applied its instructions a second time.
- The build stops with "Missing prototype source anchor" or another assertion, reports another number of icons than 84, a test fails, or the validator fails.
- An output file other than `app.js`, `app.css`, `index.html`, `pricefile.js` and `validation.json` changes — in particular `icons.js` or `tokens.css`.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file.

## Maintenance notes

- **Deployment**: only page files change, and the server serves every file of the output folder: no restart is needed after the merge. Open pages get the page and the button at their next refresh. No stored data changes until a list is uploaded; the list is one field of the sub-site's data (`priceList`), saved by the page like every other field.
- The reader is a file of its own so that its tests can load it in Node and the page can load it as it is. It must stay free of anything that runs what a file holds; a new format (the old `.xls`, for instance) would be a new function beside `sheetTable` and `csvTable` that returns a table of texts.
- How the columns are worked out is in `priceList()` of the reader, with the words that mark a price or a code column (`PRICE_WORD`, `CODE_WORD`); the currency of a line is worked out in the page module (`PRICE_CURRENCY`). The preview before a list is used is what protects against a file that is read differently from what its author meant.
- When the master site exists, a price list for all sub-sites would be handed down by it; the page of the sub-site then shows it instead of offering the upload.
- What a reviewer should scrutinise: that every text of a file reaches the page through `esc`, that the button never sends, and that a file that is no price list leaves the list in use untouched.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
