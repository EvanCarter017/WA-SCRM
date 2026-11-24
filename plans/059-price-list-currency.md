# Plan 059: One currency for the whole price list, chosen when it is uploaded

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 41a96b8..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (one page module of the browser app, its style sheet, the validator and the build log; exact text and checksums for every file; no server change)
- **Depends on**: plans/037-price-list-and-quotes.md (DONE)
- **Category**: feature (requested by the owner)
- **Planned at**: commit `41a96b8`, 2026-11-24

## Why this matters

The owner wrote on 2026-11-24: "For the price list being uploaded, it should be possible to select a currency type for the 'selling price.'"

Today the currency of a price comes only from its column's header in the uploaded file: `Price ($)` gives `$40`, `USD` gives `USD 40`, a header without one gives a bare `40` in every quote. The only way to change it is to edit the file and upload it again. With this plan the confirm dialog of an upload gets a drop-down **售价币种** (selling-price currency); the currency chosen there is kept with the list, and every price the page shows or quotes carries it.

### Decisions already made (do not re-open; do not ask)

The owner chose, in answer to the advisor's questions on 2026-11-24:

- **One currency for the whole list**, not one per price column.
- It is chosen in the **confirm dialog** after the file is picked; the drop-down offers the currencies the price reader already recognises and **starts on the currency the file's header names**.
- Every price in a quote then carries it, for example `Product A: USD 40`.

Decided by the advisor, within that:

- 18 currencies, as code and Chinese name (`USD 美元` … `THB 泰铢`), and the option **不显示币种** (no currency) first. The drop-down starts on the currency of the first price column whose header names one; with none it starts on 不显示币种.
- A chosen currency is written as its code before the price, with a space: `USD 40`. A price that the file gives with its own sign (`$50`) stays as it is.
- The page shows the currency in the line about the list (`售价币种 EUR 欧元`) and in the price columns' heads (`Price（EUR）` instead of `Price ($)`).
- **A list saved before this plan has no currency** and keeps showing every price in the currency its own column's header names — nothing changes for it until a new file is uploaded.
- Changing the currency of a list later, without a new upload, is not part of this plan (not asked for).

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server. There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity-pricelist.js` | `175929a04a40885dd946de63be414d8514a132b7af60e70c9fd4ffd3bfb81788` | `c8a1a5e2010ee0caf65ec26b60f2803d4c9b9f6e473599f1fb975886fd4622c2` | 9 |
| `work/wa-replica/fidelity.css` | `d46b124c6a4690edd0590dd83d03ec993ced85648ec197a682793bf591051618` | `20bb0770b88149f90684610a74821780a3eec4bf94f5de577309799b8d8741ae` | 1 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `6ad53eafcfbc3d35f7296e566d763f206a44685a02cfc44e46a687e0ed32f270` | `70ab25c65f00ae067e06d361c03899c2d8a0ff88bdf487f89f5abaefaf9f757d` | 2 |
| `replica/build-log.md` | `443ac067fbea8e7ec260c2576b5a41c6f2896f957425fd3e56a5b9b6a18d6afa` | `4f507d4c539e02d551e15b53147c3d66cdb27a0b6bd7b1ea2b802c3da10a0bbb` | 1 append |

- `fidelity-pricelist.js` — the page module of the price list (plan 037): the page **价格表**, the confirm dialog of an upload (`priceRead`, action `priceUse`) and the button **报价** beside the message box with its dialog (`priceQuoteRows`, action `priceInsert`). Today a price is formatted by `priceMoney(label, value)` from its column's header label (the constant `PRICE_CURRENCY` and the list `PRICE_CURRENCY_WORDS` recognise the currency in a header); the heads of the page's table come from `priceHeads(list)`, the line put into the message box from `priceLine(list, entry, at)`. The list is kept as `data.priceList = { file, at, by, columns: { code, name, spec, prices: [..] }, rows: [{ code, name, spec, prices: [..] }] }` and saved by the server like any other part of the data — this plan adds one field, `currency` (`''` or a code).
- `fidelity.css` — the style sheet of the app's own screens; the price list's rules start with `.price-`.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

The page module uses helpers defined by earlier parts of the same script: `option(value, label, selected)` (an `<option>`), `fidFormRow(label, content, field)` (a labelled form row), `fidDialog`, `fidButton`, `esc`, `$`, `toast`.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly three output files differ: `app.js`, `app.css` and `validation.json` (written by the validator). The style rules use only sizes that are already in use, so `tokens.css` comes out unchanged.

## Commands you will need

Run from the repository root (inside your worktree). Plain `node` is enough for every command of this plan.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 41a96b8 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Smoke | `bash /tmp/wa-scrm-plan-059/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-pricelist.js`, `work/wa-replica/fidelity.css` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.js`, `app.css`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — the reader `fidelity-pricefile.js` (it reads files exactly as before), the server files (`serve.cjs`, `site-*.cjs`, `openwa-link.cjs`, `ai-relay.cjs`), the other `fidelity-*.js` modules, `build-fidelity.cjs`, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/059-price-list-currency` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): choose one currency for the whole price list when it is uploaded`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, currency signs such as `€` and `₹`, and backslashes; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 12 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the four files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-059/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-059 && cat > /tmp/wa-scrm-plan-059/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 059: one currency for the whole price list, chosen in the confirm dialog of an upload.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
has 'the choice is in the confirm dialog' "$W/fidelity-pricelist.js" '<select class="fid-select" id="price-currency">'
has 'it starts on the currency the headers name' "$W/fidelity-pricelist.js" "const start = list.columns.prices.map(priceHeaderCurrency).find(Boolean) || '';"
has 'the currency is kept with the list' "$W/fidelity-pricelist.js" 'data.priceList = { file: pending.file, at: new Date().toISOString(), by: ui.persona, currency, columns: pending.columns, rows: pending.rows };'
has 'a price carries the currency of the list' "$W/fidelity-pricelist.js" 'return list.currency && !/[$€£¥]/.test(value) ? `${list.currency} ${value}` : value;'
has 'a list saved before keeps the currencies of its headers' "$W/fidelity-pricelist.js" 'if (list.currency === undefined) return priceMoney(list.columns.prices[at], value);'
has 'the page is built with it' "$O/app.js" 'function priceShown(list, at, value) {'
has 'the row of the dialog has its style' "$O/app.css" '.price-preview #price-currency { min-width:var(--fid-px-240); }'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  priceCurrency: 'one currency for the whole price list"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 价格表可以选择售价币种 · 2026-11-24'
same 'of the built files only the page, its styles and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.js|app\.css|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-059/smoke.sh && ls -l /tmp/wa-scrm-plan-059/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-pricelist.js work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `bash /tmp/wa-scrm-plan-059/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the choice is in the confirm dialog`, `it starts on the currency the headers name`, `the currency is kept with the list`, `a price carries the currency of the list`, `a list saved before keeps the currencies of its headers`, `the page is built with it`, `the row of the dialog has its style`, `the validator knows it` and `the build log has the entry` (nine checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The price list: the choice of the currency, how a price is shown, the style of the new row

#### `fidelity-pricelist.js`

**Edit 2.1** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
  // message box finds a product and puts its price into the message box. Nothing here sends a message, suggests
  // a product by itself or calls a server; a price is shown exactly as the file gives it.
  // ============================================================================
```

Replace them with:

```text
  // message box finds a product and puts its price into the message box. Nothing here sends a message, suggests
  // a product by itself or calls a server; a price is shown as the file gives it, in the currency chosen for the
  // list when it was uploaded (plan 059).
  // ============================================================================
```

**Edit 2.2** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
  const priceColumnName = label => String(label || '').replace(PRICE_CURRENCY, '').replace(/[（(]\s*[）)]/g, '').replace(/\s+/g, ' ').trim();
  const priceHeads = list => [list.columns.code || '简称', ...(list.columns.name ? [list.columns.name] : []), ...(list.columns.spec ? [list.columns.spec] : []), ...list.columns.prices.map((label, i) => label || `价格 ${i + 1}`)];
  const priceCells = (list, entry) => [entry.code, ...(list.columns.name ? [entry.name] : []), ...(list.columns.spec ? [entry.spec] : []), ...list.columns.prices.map((label, i) => entry.prices[i] || '')];
```

Replace them with:

```text
  const priceColumnName = label => String(label || '').replace(PRICE_CURRENCY, '').replace(/[（(]\s*[）)]/g, '').replace(/\s+/g, ' ').trim();
  // The currency of the whole list, chosen in the confirm dialog of an upload (plan 059): one of these codes, or ''
  // for none. The choice starts on the currency the price columns' headers name. A list saved before the choice
  // existed has no currency and shows every price in the currency its own column's header names, as before.
  const PRICE_CURRENCIES = [['USD', '美元'], ['EUR', '欧元'], ['CNY', '人民币'], ['GBP', '英镑'], ['HKD', '港币'], ['JPY', '日元'], ['AUD', '澳元'], ['CAD', '加元'], ['SGD', '新加坡元'], ['MXN', '墨西哥比索'], ['BRL', '巴西雷亚尔'], ['INR', '印度卢比'], ['AED', '阿联酋迪拉姆'], ['SAR', '沙特里亚尔'], ['RUB', '俄罗斯卢布'], ['KRW', '韩元'], ['VND', '越南盾'], ['THB', '泰铢']];
  const PRICE_SIGN_CODES = { 'US$': 'USD', 'HK$': 'HKD', $: 'USD', '€': 'EUR', '£': 'GBP', '¥': 'CNY', '₹': 'INR', '₽': 'RUB', '₩': 'KRW', '₫': 'VND', '฿': 'THB', RMB: 'CNY' };
  // The currency a header names, as a code: "Price ($)" gives USD, "售价（人民币）" gives CNY, "售价" gives ''.
  function priceHeaderCurrency(label) {
    const sign = PRICE_CURRENCY.exec(label || '')?.[0]?.toUpperCase();
    const word = PRICE_CURRENCY_WORDS.find(([pattern]) => pattern.test(label || ''))?.[1];
    return sign ? PRICE_SIGN_CODES[sign] || sign : PRICE_SIGN_CODES[word] || '';
  }
  const priceCurrencyLabel = code => `${code} ${PRICE_CURRENCIES.find(([known]) => known === code)?.[1] || ''}`.trim();
  // A price as the page shows and quotes it: in the list's currency ("USD 40"), or with none when none was chosen.
  // A price that carries its own sign in the file ("$40") stays as it is.
  function priceShown(list, at, value) {
    if (list.currency === undefined) return priceMoney(list.columns.prices[at], value);
    return list.currency && !/[$€£¥]/.test(value) ? `${list.currency} ${value}` : value;
  }
  // A price column's head: as the file names it; once a currency was chosen for the list, without the header's own
  // currency and with the chosen one: "Price ($)" with EUR chosen is "Price（EUR）".
  const priceHead = (list, label, i) => (list.currency === undefined ? label || `价格 ${i + 1}` : `${priceColumnName(label) || `价格 ${i + 1}`}${list.currency ? `（${list.currency}）` : ''}`);
  const priceHeads = list => [list.columns.code || '简称', ...(list.columns.name ? [list.columns.name] : []), ...(list.columns.spec ? [list.columns.spec] : []), ...list.columns.prices.map((label, i) => priceHead(list, label, i))];
  const priceCells = (list, entry) => [entry.code, ...(list.columns.name ? [entry.name] : []), ...(list.columns.spec ? [entry.spec] : []), ...list.columns.prices.map((label, i) => entry.prices[i] || '')];
```

**Edit 2.3** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
    const column = list.columns.prices.length > 1 ? priceColumnName(label) : '';
    return `${[entry.name, entry.code].filter(Boolean).join(' ')}${entry.spec ? ` (${entry.spec})` : ''}: ${priceMoney(label, entry.prices[at])}${column ? ` (${column})` : ''}`;
  }
```

Replace them with:

```text
    const column = list.columns.prices.length > 1 ? priceColumnName(label) : '';
    return `${[entry.name, entry.code].filter(Boolean).join(' ')}${entry.spec ? ` (${entry.spec})` : ''}: ${priceShown(list, at, entry.prices[at])}${column ? ` (${column})` : ''}`;
  }
```

**Edit 2.4** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
    const about = list
      ? `当前价格表：${list.file || '未命名文件'}，共 ${list.rows.length} 个产品，${fidDate(list.at)} 由 ${member(list.by)?.name || list.by || '—'} 上传`
      : '尚未上传价格表';
```

Replace them with:

```text
    const about = list
      ? `当前价格表：${list.file || '未命名文件'}，共 ${list.rows.length} 个产品${list.currency === undefined ? '' : list.currency ? `，售价币种 ${priceCurrencyLabel(list.currency)}` : '，售价不显示币种'}，${fidDate(list.at)} 由 ${member(list.by)?.name || list.by || '—'} 上传`
      : '尚未上传价格表';
```

**Edit 2.5** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
    const names = [['简称', list.columns.code], ['名称', list.columns.name], ['规格', list.columns.spec], ['价格', list.columns.prices.join('、')]].filter(([, label]) => label);
    fidDialog('确认价格表', `<div class="modal-body price-preview">
```

Replace them with:

```text
    const names = [['简称', list.columns.code], ['名称', list.columns.name], ['规格', list.columns.spec], ['价格', list.columns.prices.join('、')]].filter(([, label]) => label);
    const start = list.columns.prices.map(priceHeaderCurrency).find(Boolean) || '';
    fidDialog('确认价格表', `<div class="modal-body price-preview">
```

**Edit 2.6** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
      <p>读取到 <strong>${list.rows.length}</strong> 个产品${list.skipped ? `，另有 ${list.skipped} 行没有价格，已略过` : ''}。各列按表头识别为：${names.map(([name, label]) => `${name} = ${esc(label)}`).join('；')}。</p>
      <div class="fid-table-scroll"><table class="fid-table price-table"><thead><tr>${heads.map(head => `<th scope="col">${head}</th>`).join('')}</tr></thead><tbody>${first.map(entry => `<tr>${priceCells(list, entry).map(cell => `<td>${esc(cell || '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
```

Replace them with:

```text
      <p>读取到 <strong>${list.rows.length}</strong> 个产品${list.skipped ? `，另有 ${list.skipped} 行没有价格，已略过` : ''}。各列按表头识别为：${names.map(([name, label]) => `${name} = ${esc(label)}`).join('；')}。</p>
      ${fidFormRow('售价币种', `<select class="fid-select" id="price-currency">${option('', '不显示币种', start)}${PRICE_CURRENCIES.map(([code]) => option(code, priceCurrencyLabel(code), start)).join('')}</select><span class="fid-field-help">报价时每个价格都带上这个币种，例如「USD 40」。${start ? '已按表头选好，可以更改。' : ''}</span>`, 'price-currency')}
      <div class="fid-table-scroll"><table class="fid-table price-table"><thead><tr>${heads.map(head => `<th scope="col">${head}</th>`).join('')}</tr></thead><tbody>${first.map(entry => `<tr>${priceCells(list, entry).map(cell => `<td>${esc(cell || '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
```

**Edit 2.7** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
      const prices = entry.prices.map((value, at) => (value
        ? `<button type="button" class="fid-btn slim tint" data-action="priceInsert" data-id="${list.rows.indexOf(entry)}:${at}" title="${esc(priceLine(list, entry, at))}">${several && priceColumnName(list.columns.prices[at]) ? `<small>${esc(priceColumnName(list.columns.prices[at]))}</small> ` : ''}${esc(priceMoney(list.columns.prices[at], value))}</button>`
        : '')).join('');
```

Replace them with:

```text
      const prices = entry.prices.map((value, at) => (value
        ? `<button type="button" class="fid-btn slim tint" data-action="priceInsert" data-id="${list.rows.indexOf(entry)}:${at}" title="${esc(priceLine(list, entry, at))}">${several && priceColumnName(list.columns.prices[at]) ? `<small>${esc(priceColumnName(list.columns.prices[at]))}</small> ` : ''}${esc(priceShown(list, at, value))}</button>`
        : '')).join('');
```

**Edit 2.8** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
      if (!pending) return;
      data.priceList = { file: pending.file, at: new Date().toISOString(), by: ui.persona, columns: pending.columns, rows: pending.rows };
      Object.assign(priceView, { pending: null, query: '' });
```

Replace them with:

```text
      if (!pending) return;
      const chosen = $('#price-currency')?.value || '', currency = PRICE_CURRENCIES.some(([code]) => code === chosen) ? chosen : '';
      data.priceList = { file: pending.file, at: new Date().toISOString(), by: ui.persona, currency, columns: pending.columns, rows: pending.rows };
      Object.assign(priceView, { pending: null, query: '' });
```

**Edit 2.9** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
      render();
      toast(`价格表已更新，共 ${pending.rows.length} 个产品。`);
    },
```

Replace them with:

```text
      render();
      toast(`价格表已更新，共 ${pending.rows.length} 个产品${currency ? `，售价币种 ${currency}` : ''}。`);
    },
```

#### `fidelity.css`

**Edit 2.10** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.price-preview p { margin:0 0 10px; font-size:13px; }
.price-quote-button { display:inline-flex; align-items:center; gap:4px; margin-left:6px; padding:2px 8px; border:1px solid var(--fid-frame); border-radius:999px; background:var(--color-surface); color:var(--fid-ink); font:inherit; font-size:12px; line-height:18px; white-space:nowrap; cursor:pointer; }
```

Replace them with:

```text
.price-preview p { margin:0 0 10px; font-size:13px; }
.price-preview .fid-form-row { margin:4px 0 12px; }
.price-preview #price-currency { min-width:240px; }
.price-quote-button { display:inline-flex; align-items:center; gap:4px; margin-left:6px; padding:2px 8px; border:1px solid var(--fid-frame); border-radius:999px; background:var(--color-surface); color:var(--fid-ink); font:inherit; font-size:12px; line-height:18px; white-space:nowrap; cursor:pointer; }
```

What these edits do, so that you can recognise them: Edit 2.1 updates the module's opening comment. Edit 2.2 adds, after `priceColumnName`, the list `PRICE_CURRENCIES` (18 codes with their Chinese names), `PRICE_SIGN_CODES` (a sign or word of a header → a code), `priceHeaderCurrency(label)`, `priceCurrencyLabel(code)`, `priceShown(list, at, value)` (how every price is shown from now on) and `priceHead(list, label, i)`, and makes `priceHeads` use `priceHead`. Edits 2.3 and 2.7 make the quote line and the quote buttons use `priceShown`. Edit 2.4 names the currency in the line about the list. Edits 2.5 and 2.6 add the row **售价币种** to the confirm dialog (2.5 works out where the drop-down starts). Edits 2.8 and 2.9 keep the chosen currency with the list and name it in the toast. Edit 2.10, in `fidelity.css`, gives the new row its spacing and width.

**Verify**: `sha256sum work/wa-replica/fidelity-pricelist.js work/wa-replica/fidelity.css` → `c8a1a5e2010ee0caf65ec26b60f2803d4c9b9f6e473599f1fb975886fd4622c2`, `20bb0770b88149f90684610a74821780a3eec4bf94f5de577309799b8d8741ae`; `grep -c "priceMoney(" work/wa-replica/fidelity-pricelist.js` → `2`. If a checksum does not match, restore the file with `git checkout 41a96b8 -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 3: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  assert(appJs.includes(required), `app.js is missing ${required}`);
}

const summary = {
```

Replace them with:

```text
  assert(appJs.includes(required), `app.js is missing ${required}`);
}
// One currency for the whole price list, chosen in the confirm dialog of an upload (plan 059). It starts on the
// currency the headers name; every price the page shows or quotes carries it, and a list saved before the choice
// existed keeps the currencies of its headers.
for (const required of ['<select class="fid-select" id="price-currency">', "const start = list.columns.prices.map(priceHeaderCurrency).find(Boolean) || '';", 'if (list.currency === undefined) return priceMoney(list.columns.prices[at], value);', 'return list.currency && !/[$€£¥]/.test(value) ? `${list.currency} ${value}` : value;', "const chosen = $('#price-currency')?.value || '', currency = PRICE_CURRENCIES.some(([code]) => code === chosen) ? chosen : '';", 'data.priceList = { file: pending.file, at: new Date().toISOString(), by: ui.persona, currency, columns: pending.columns, rows: pending.rows };', '${esc(priceShown(list, at, value))}</button>', ': ${priceShown(list, at, entry.prices[at])}']) {
  assert(pricePage.includes(required), `fidelity-pricelist.js is missing ${required}`);
  assert(appJs.includes(required), `app.js is missing ${required}`);
}
assert.equal(pricePage.match(/priceMoney\(/g).length, 2, 'a price must be shown and quoted only through priceShown');

const summary = {
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  fileSending: 'up to ten files at once from the message box (the + button, paste, drop), sent by the server through OpenWA one after the other, each as a message of its own, the typed words as the caption of the first; told by its bytes: JPEG and PNG as a picture, MP4 (H.264) as a video, MP3, OGG, M4A and AAC as a recording, everything else as a document; 16 MB at most',
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  externalNetworkCalls: false,
};
```

Replace them with:

```text
  fileSending: 'up to ten files at once from the message box (the + button, paste, drop), sent by the server through OpenWA one after the other, each as a message of its own, the typed words as the caption of the first; told by its bytes: JPEG and PNG as a picture, MP4 (H.264) as a video, MP3, OGG, M4A and AAC as a recording, everything else as a document; 16 MB at most',
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  priceCurrency: 'one currency for the whole price list, chosen in the confirm dialog of an upload (18 currencies or none) and starting on the one the headers name; every price shown on the page and quoted into the message box carries it ("USD 40") unless the file gives the price with its own sign; a list saved before keeps the currencies of its headers',
  externalNetworkCalls: false,
};
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `70ab25c65f00ae067e06d361c03899c2d8a0ff88bdf487f89f5abaefaf9f757d`; `git checkout 41a96b8 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.js`, `app.css` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else (if `icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one); `sha256sum outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/app.css` → `3755dca789e736f2ffa40c8574a0dcd8b5e1bb00e1151c5f4fd5a632c6efe388`, `819e12dc8b301d33ab22616d1f54931d219124a538c0c065f820f8ca88a45ade`. If a checksum does not match, restore the file with `git checkout 41a96b8 -- <file>` and apply its instructions again; if it still does not match, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 价格表可以选择售价币种 · 2026-11-24

上传价格表时，确认框里多了「售价币种」：可以选择美元（USD）、欧元（EUR）、人民币（CNY）等 18 种币种，也可以选择不显示币种。默认选中表头里写明的币种（例如表头是「Price ($)」时预选 USD），表头没有写明时默认不显示币种。

- 确认后，聊天界面「报价」里的每个价格都带上这个币种，放进消息框的报价例如「Product Alpha PRDA01 (100*10 Units): USD 40」。
- 价格表页面顶部的说明写明售价币种，价格列的表头也标明币种，例如「Price（USD）」。
- 文件里本身带符号的价格（例如「$40」）保持原样，不再加币种。
- 之前上传的价格表不受影响：仍按各列表头里的币种显示，重新上传时才需要选择。

验证：构建与校验脚本通过；浏览器测试覆盖预选（表头写明与未写明两种）、改选其他币种、选择不显示币种、报价按钮和放进消息框的报价、页面表头与说明，以及之前保存、没有币种的价格表仍按表头显示。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout 41a96b8 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && bash /tmp/wa-scrm-plan-059/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `4f507d4c539e02d551e15b53147c3d66cdb27a0b6bd7b1ea2b802c3da10a0bbb`; `git status --porcelain` lists exactly these seven as changed and nothing as new: the four files of the table in "Current state" and `outputs/wa-replica-prototype/app.js`, `app.css`, `validation.json` (plus `icons.js` only as staged by the restore — unstage it as described in Step 3). Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the facts of the feature (the block added in Step 3): the drop-down in the dialog, where it starts, how a price is shown, that a list saved before keeps its headers' currencies, that the chosen currency is kept with the list; all of them in the source and in the built `app.js`; and that `priceMoney` is called only by `priceShown`.
- **Smoke** (`/tmp/wa-scrm-plan-059/smoke.sh`) — the same facts, the built style rule, which built files changed and the syntax of the built page.
- **Verified by the reviewer, not by you**: in a browser against a stand-in server — a header naming `$` starts the drop-down on USD and says so; EUR chosen is kept on the server, named in the toast, the line about the list and the price head, carried by the quote buttons and by the line put into the message box, nothing sent; a price given with its own sign stays as it is; a header without a currency starts on 不显示币种 and prices then carry none; `售价（人民币）` starts on CNY, and cancelling keeps the list in use; a list saved before (no `currency`) shows the currencies of its headers as before; the dialog fits a 390 px screen; the earlier browser sessions, with the texts that now carry the currency updated.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 41a96b8 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `bash /tmp/wa-scrm-plan-059/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-pricelist.js` → `c8a1a5e2010ee0caf65ec26b60f2803d4c9b9f6e473599f1fb975886fd4622c2`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `20bb0770b88149f90684610a74821780a3eec4bf94f5de577309799b8d8741ae`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `70ab25c65f00ae067e06d361c03899c2d8a0ff88bdf487f89f5abaefaf9f757d`
- [ ] `sha256sum replica/build-log.md` → `4f507d4c539e02d551e15b53147c3d66cdb27a0b6bd7b1ea2b802c3da10a0bbb`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `3755dca789e736f2ffa40c8574a0dcd8b5e1bb00e1151c5f4fd5a632c6efe388`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `819e12dc8b301d33ab22616d1f54931d219124a538c0c065f820f8ca88a45ade`
- [ ] `git diff --name-only 41a96b8..HEAD -- outputs` lists `app.js`, `app.css` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only 41a96b8..HEAD -- . ':!plans'` lists exactly seven paths: the four of the table in "Current state" and the three output files
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, or the build reports another number of icons than 84.
- An output file other than `app.js`, `app.css` and `validation.json` changes (`tokens.css` in particular must not).
- The work appears to require editing an out-of-scope file or creating a file.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else. A list already uploaded on the live site keeps its look until a new file is uploaded.
- The currencies offered are the ones `PRICE_CURRENCY` (and `PRICE_CURRENCY_WORDS`) recognise in a header, plus the four whose signs it knows (RUB, KRW, VND, THB). A currency added to the list later needs no other change; one that a header should name needs the regular expression too.
- `priceShown` is the only way a price is shown or quoted; a new place that shows a price should use it. `priceMoney` stays for lists saved before this plan.
- What a reviewer should scrutinise: that nothing but a known code (or `''`) is kept as the currency; that a list without the field looks exactly as before; that every text put into the page goes through `esc` or `option`.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
