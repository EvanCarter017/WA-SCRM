# Plan 078: The quote dialog ticks several prices, and prices carry currency signs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 917e093..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW–MEDIUM (a click on a price changes meaning: it ticks instead of putting the price in; exact text and checksums for every file)
- **Depends on**: plans/037-price-list-and-quotes.md (the price list and the quote button) and plans/059-price-list-currency.md (one currency for the list), both DONE; plans/077-hand-made-preview.md (DONE; it changed the validator and the build log that this plan edits after it)
- **Category**: owner request of 2026-11-26 ("In the quote selection interface, it should be possible to search and make multiple selections; additionally, currency codes should be replaced with currency symbols.")
- **Planned at**: commit `917e093`, 2026-11-26

## Why this matters

In a conversation the button 报价 (quote) beside the message box opens a dialog (`priceQuoteOpen` in `fidelity-pricelist.js`): a search box (it already finds products by code, name and specification), then up to 50 product rows, each with one button per price (one per price column). Today a click on a price puts that one line into the message box at once and closes the dialog (action `priceInsert` with the button's `data-id` "row:column"). To quote several products the dialog has to be opened, searched and clicked again for each one. The owner asked for several selections at once, and for currency signs instead of codes: a list in USD shows "USD 40" in the dialog and puts "Product Alpha PRDA01: USD 40" into the message.

The owner chose, in a question dialog: **"Tick, then insert all"** — a click on a price ticks it (another click unticks it), the ticks stay while the search changes, and a button puts every ticked price into the message box, one line each, in the order they were ticked; a single price then takes two clicks. The search itself was already there (the owner was told).

Shown in a browser (the reviewer's harness, 2026-11-26) with a list in USD: before this plan the buttons read "USD 40", "USD 12.5", "USD 8" and a click put "Product Alpha PRDA01: USD 40" in at once. With it the buttons read "$40", "$12.5", "$8"; Alpha ticked after a search, Beta ticked and unticked, Gamma ticked after another search; with the search emptied both ticks still show; the count reads 已选 2 项 and the button is enabled; the button puts "Product Alpha PRDA01: $40" and "Product Gamma PRDC03: $8" in, one per line, and closes the dialog; opened again, nothing is ticked; a list scrolled to its end keeps its place when a price there is ticked. Live data (structure only): the one workspace with a price list has 202 products, one price column, currency USD.

### Decisions already made (do not re-open; do not ask)

- `priceView` gains `picked: []` — the ticked prices as "row:column" keys, in the order ticked. The dialog empties it when it opens.
- Price buttons get `data-action="pricePick"` and `aria-pressed`; a ticked one is drawn `blue` (instead of `tint`) with `icon('Check')` in front. `pricePick` ticks or unticks the key and draws the rows again through `priceQuoteRefresh()`, which keeps the list's scroll position and updates the count `已选 N 项` and the button.
- The dialog's footer: the count (`fid-small-note`, id `price-quote-count`), `fidButton('放入消息框', 'priceInsert', …)` (id `price-quote-insert`, disabled while nothing is ticked), then 关 闭. `priceInsert` (no id now) puts the lines of all ticked prices at the end of the message box — after what is typed, on lines of their own — closes the dialog and sends nothing, as before.
- The note in the dialog says how it works: 点击价格选中，可以多选，再点一次取消；查找其他产品时，已选的保留。「放入消息框」按选中的顺序逐行放入，不会自动发送。
- Currency signs (`PRICE_SYMBOLS`), written in front of the price without a space: USD $, EUR €, GBP £, CNY ¥, JPY JP¥, HKD HK$, AUD A$, CAD C$, SGD S$, MXN MX$, BRL R$, INR ₹, RUB ₽, KRW ₩, VND ₫, THB ฿ — so that "$" always means US dollars and "¥" yuan; AED and SAR have no common sign and keep their codes ("AED 40"). `priceShown` uses them; it is what the dialog shows and what goes into the message (`priceLine`). A price that carries its own sign in the file stays as it is, as before. The help text of 售价币种 in the upload dialog gives the new example.
- Not changed: the price list page (its column heads and 售价币种 still name the currency by code: "Price（USD）", "USD 美元"), the toast after an upload, lists saved before plan 059 (`priceMoney`), the search, the 50-row limit, the narrow-screen layout.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity-pricelist.js` | `c8a1a5e2010ee0caf65ec26b60f2803d4c9b9f6e473599f1fb975886fd4622c2` | `f40f196f1ae0d967010a84f8f77ff9f5afd88f57e5909bc494c34171679f2345` | 8 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `048c9d7af5d2b10bab996dcd0d70cd5c986d5f5d3c2f087ca8453cd3a0e4dfea` | `246e6ea6c0a90be4322698c57cfc870cc9acf2e75489345ec85df8c51a16c47e` | 6 |
| `replica/build-log.md` | `26663daa80ce718480f576519a0725a21a34321e9121dd33d6a3159bd6dca8b6` | `e5fbd77383f75694a915405fe6839ca7c8d0d43dc57c41961a1019559d1b1e95` | 1 append |

- `fidelity-pricelist.js` — the price list module of the built page: the page 价格表, the upload and its confirm dialog, and the quote dialog of the conversation (`priceQuoteRows`, `priceQuoteOpen`, the actions `priceInsert` and others in `Object.assign(fidActions, { … })`).
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly two output files differ: `app.js` and `validation.json` (written by the validator).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer** (the server's accounts and data use `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 917e093 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (unchanged) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 20`, `fail 0` (unchanged) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-078/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-pricelist.js` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.js`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — `fidelity-pricefile.js` (reading the file), the style sheets (the existing classes `blue`, `tint` and `fid-small-note` are used), the base app, the other modules, the servers, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/078-quote-picks` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): tick several prices in the quote dialog and show currency signs`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, very long lines, quotes and backslashes; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 14 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the three files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-078/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-078 && cat > /tmp/wa-scrm-plan-078/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 078: the quote dialog ticks several prices and puts them into the message box together; prices carry
# the sign of the list's currency. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'a click ticks a price' "$W/fidelity-pricelist.js" '    pricePick: id => {'
has 'the ticked prices go in together, one line each' "$W/fidelity-pricelist.js" "box.value = (before ? before + '\n' : '') + lines.join('\n');"
has 'the dialog has the button 放入消息框' "$W/fidelity-pricelist.js" "fidButton('放入消息框', 'priceInsert'"
same 'no click puts a price in at once' "$(grep -c 'data-action="priceInsert" data-id=' "$W/fidelity-pricelist.js")" 0
has 'prices carry the sign of their currency' "$W/fidelity-pricelist.js" "const PRICE_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', CNY: '¥', JPY: 'JP¥',"
has 'the upload dialog shows the sign' "$W/fidelity-pricelist.js" '例如「$40」'
has 'the page is built with it' "$O/app.js" '    pricePick: id => {'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  quotePicks: 'the quote dialog (报价) ticks prices"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 报价可以多选，价格显示货币符号 · 2026-11-26'
same 'of the built files only the page and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.js|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the tests of the price file pass' "$("$NODE" --test "$W/price-file.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-078/smoke.sh && ls -l /tmp/wa-scrm-plan-078/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-pricelist.js work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-078/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `a click ticks a price`, `the ticked prices go in together, one line each`, `the dialog has the button 放入消息框`, `no click puts a price in at once` (got: 1), `prices carry the sign of their currency`, `the upload dialog shows the sign`, `the page is built with it`, `the validator knows it` and `the build log has the entry` (nine checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The quote dialog ticks prices; prices carry currency signs

#### `fidelity-pricelist.js`

**Edit 2.1** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
  // browser (pricefile.js) and its products replace the list. In a conversation the button "报价" beside the
  // message box finds a product and puts its price into the message box. Nothing here sends a message, suggests
  // a product by itself or calls a server; a price is shown as the file gives it, in the currency chosen for the
  // list when it was uploaded (plan 059).
  // ============================================================================
```

Replace them with:

```text
  // browser (pricefile.js) and its products replace the list. In a conversation the button "报价" beside the
  // message box finds products, and the prices ticked there go into the message box together (plan 078). Nothing
  // here sends a message, suggests a product by itself or calls a server; a price is shown as the file gives it, with
  // the sign of the currency chosen for the list when it was uploaded (plans 059, 078).
  // ============================================================================
```

**Edit 2.2** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
  const PRICE_QUOTE_ROWS = 50;
  const priceView = { query: '', quote: '', pending: null };
  ui.pageSizes.prices ||= 20;
```

Replace them with:

```text
  const PRICE_QUOTE_ROWS = 50;
  const priceView = { query: '', quote: '', pending: null, picked: [] };
  ui.pageSizes.prices ||= 20;
```

**Edit 2.3** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
  const PRICE_SIGN_CODES = { 'US$': 'USD', 'HK$': 'HKD', $: 'USD', '€': 'EUR', '£': 'GBP', '¥': 'CNY', '₹': 'INR', '₽': 'RUB', '₩': 'KRW', '₫': 'VND', '฿': 'THB', RMB: 'CNY' };
  // The currency a header names, as a code: "Price ($)" gives USD, "售价（人民币）" gives CNY, "售价" gives ''.
```

Replace them with:

```text
  const PRICE_SIGN_CODES = { 'US$': 'USD', 'HK$': 'HKD', $: 'USD', '€': 'EUR', '£': 'GBP', '¥': 'CNY', '₹': 'INR', '₽': 'RUB', '₩': 'KRW', '₫': 'VND', '฿': 'THB', RMB: 'CNY' };
  // The sign that stands for the list's currency in front of a price (plan 078): "$40", not "USD 40". The other
  // dollars and the yen have signs of their own, so that "$" always means US dollars; a currency without a common
  // sign (AED, SAR) keeps its code: "AED 40".
  const PRICE_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', CNY: '¥', JPY: 'JP¥', HKD: 'HK$', AUD: 'A$', CAD: 'C$', SGD: 'S$', MXN: 'MX$', BRL: 'R$', INR: '₹', RUB: '₽', KRW: '₩', VND: '₫', THB: '฿' };
  // The currency a header names, as a code: "Price ($)" gives USD, "售价（人民币）" gives CNY, "售价" gives ''.
```

**Edit 2.4** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
  const priceCurrencyLabel = code => `${code} ${PRICE_CURRENCIES.find(([known]) => known === code)?.[1] || ''}`.trim();
  // A price as the page shows and quotes it: in the list's currency ("USD 40"), or with none when none was chosen.
  // A price that carries its own sign in the file ("$40") stays as it is.
  function priceShown(list, at, value) {
    if (list.currency === undefined) return priceMoney(list.columns.prices[at], value);
    return list.currency && !/[$€£¥]/.test(value) ? `${list.currency} ${value}` : value;
  }
```

Replace them with:

```text
  const priceCurrencyLabel = code => `${code} ${PRICE_CURRENCIES.find(([known]) => known === code)?.[1] || ''}`.trim();
  // A price as the page shows and quotes it: with the sign of the list's currency ("$40"; plan 078), or with none
  // when none was chosen. A price that carries its own sign in the file ("$40") stays as it is.
  function priceShown(list, at, value) {
    if (list.currency === undefined) return priceMoney(list.columns.prices[at], value);
    return list.currency && !/[$€£¥]/.test(value) ? (PRICE_SYMBOLS[list.currency] || list.currency + ' ') + value : value;
  }
```

**Edit 2.5** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
      <p>读取到 <strong>${list.rows.length}</strong> 个产品${list.skipped ? `，另有 ${list.skipped} 行没有价格，已略过` : ''}。各列按表头识别为：${names.map(([name, label]) => `${name} = ${esc(label)}`).join('；')}。</p>
      ${fidFormRow('售价币种', `<select class="fid-select" id="price-currency">${option('', '不显示币种', start)}${PRICE_CURRENCIES.map(([code]) => option(code, priceCurrencyLabel(code), start)).join('')}</select><span class="fid-field-help">报价时每个价格都带上这个币种，例如「USD 40」。${start ? '已按表头选好，可以更改。' : ''}</span>`, 'price-currency')}
      <div class="fid-table-scroll"><table class="fid-table price-table"><thead><tr>${heads.map(head => `<th scope="col">${head}</th>`).join('')}</tr></thead><tbody>${first.map(entry => `<tr>${priceCells(list, entry).map(cell => `<td>${esc(cell || '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
```

Replace them with:

```text
      <p>读取到 <strong>${list.rows.length}</strong> 个产品${list.skipped ? `，另有 ${list.skipped} 行没有价格，已略过` : ''}。各列按表头识别为：${names.map(([name, label]) => `${name} = ${esc(label)}`).join('；')}。</p>
      ${fidFormRow('售价币种', `<select class="fid-select" id="price-currency">${option('', '不显示币种', start)}${PRICE_CURRENCIES.map(([code]) => option(code, priceCurrencyLabel(code), start)).join('')}</select><span class="fid-field-help">报价时每个价格前都带上这个币种的符号，例如「$40」；没有通用符号的币种写代码，例如「AED 40」。${start ? '已按表头选好，可以更改。' : ''}</span>`, 'price-currency')}
      <div class="fid-table-scroll"><table class="fid-table price-table"><thead><tr>${heads.map(head => `<th scope="col">${head}</th>`).join('')}</tr></thead><tbody>${first.map(entry => `<tr>${priceCells(list, entry).map(cell => `<td>${esc(cell || '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
```

**Edit 2.6** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
    const rows = found.slice(0, PRICE_QUOTE_ROWS).map(entry => {
      const prices = entry.prices.map((value, at) => (value
        ? `<button type="button" class="fid-btn slim tint" data-action="priceInsert" data-id="${list.rows.indexOf(entry)}:${at}" title="${esc(priceLine(list, entry, at))}">${several && priceColumnName(list.columns.prices[at]) ? `<small>${esc(priceColumnName(list.columns.prices[at]))}</small> ` : ''}${esc(priceShown(list, at, value))}</button>`
        : '')).join('');
      return `<li class="price-quote-row"><span class="price-quote-product"><strong>${esc(entry.code)}</strong>${entry.name ? ` <span>${esc(entry.name)}</span>` : ''}${entry.spec ? ` <small>${esc(entry.spec)}</small>` : ''}</span><span class="price-quote-prices">${prices}</span></li>`;
```

Replace them with:

```text
    const rows = found.slice(0, PRICE_QUOTE_ROWS).map(entry => {
      // A click ticks a price or unticks it (plan 078); a ticked price is drawn pressed, with a check mark.
      const prices = entry.prices.map((value, at) => {
        if (!value) return '';
        const id = `${list.rows.indexOf(entry)}:${at}`, picked = priceView.picked.includes(id);
        return `<button type="button" class="fid-btn slim ${picked ? 'blue' : 'tint'}" data-action="pricePick" data-id="${id}" aria-pressed="${picked}" title="${esc(priceLine(list, entry, at))}">${picked ? icon('Check') : ''}${several && priceColumnName(list.columns.prices[at]) ? `<small>${esc(priceColumnName(list.columns.prices[at]))}</small> ` : ''}${esc(priceShown(list, at, value))}</button>`;
      }).join('');
      return `<li class="price-quote-row"><span class="price-quote-product"><strong>${esc(entry.code)}</strong>${entry.name ? ` <span>${esc(entry.name)}</span>` : ''}${entry.spec ? ` <small>${esc(entry.spec)}</small>` : ''}</span><span class="price-quote-prices">${prices}</span></li>`;
```

**Edit 2.7** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
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
```

Replace them with:

```text
  }
  // Draws the rows again after a price was ticked, where the list was scrolled to, and says how many are ticked.
  function priceQuoteRefresh() {
    const rows = $('#price-quote-rows');
    if (!rows) return;
    const top = rows.querySelector('.price-quote-list')?.scrollTop || 0;
    rows.innerHTML = priceQuoteRows();
    paintIcons(rows);
    const list = rows.querySelector('.price-quote-list');
    if (list) list.scrollTop = top;
    $('#price-quote-count').textContent = `已选 ${priceView.picked.length} 项`;
    $('#price-quote-insert').disabled = !priceView.picked.length;
  }
  function priceQuoteOpen() {
    if (!selectedCustomer() || !$('#composer-text')) return;
    Object.assign(priceView, { quote: '', picked: [] });
    fidDialog('报价', `<div class="modal-body price-quote">
      <input type="search" class="fid-input" id="price-quote-search" aria-label="查找产品" placeholder="输入产品简称或名称查找" ${priceList() ? '' : 'disabled'}>
      <p class="price-note">点击价格选中，可以多选，再点一次取消；查找其他产品时，已选的保留。「放入消息框」按选中的顺序逐行放入，不会自动发送。</p>
      <div id="price-quote-rows">${priceQuoteRows()}</div>
    </div>`, `<span class="fid-small-note" id="price-quote-count">已选 0 项</span>${fidButton('放入消息框', 'priceInsert', '', 'blue', 'id="price-quote-insert" disabled')}${fidButton('关 闭', 'close')}`, true);
    $('#price-quote-search')?.focus();
```

**Edit 2.8** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
    priceOpenPage: () => { close(); navigate('prices'); },
    // Puts the line of one price at the end of the message box. The message is not sent.
    priceInsert: id => {
      const list = priceList(), [row, at] = String(id).split(':').map(Number), entry = list?.rows[row], box = $('#composer-text');
      if (!entry || !entry.prices[at] || !box) return;
      close();
      const before = box.value.replace(/\s+$/, '');
      box.value = (before ? before + '\n' : '') + priceLine(list, entry, at);
      box.dispatchEvent(new Event('input', { bubbles: true }));
```

Replace them with:

```text
    priceOpenPage: () => { close(); navigate('prices'); },
    // Ticks a price, or unticks it (plan 078). The ticks stay while the search changes.
    pricePick: id => {
      const list = priceList(), [row, at] = String(id).split(':').map(Number);
      if (!list?.rows[row]?.prices[at]) return;
      const key = `${row}:${at}`, picked = priceView.picked;
      if (picked.includes(key)) picked.splice(picked.indexOf(key), 1);
      else picked.push(key);
      priceQuoteRefresh();
    },
    // Puts the ticked prices at the end of the message box, one line each, in the order they were ticked. The
    // message is not sent.
    priceInsert: () => {
      const list = priceList(), box = $('#composer-text');
      const lines = priceView.picked.map(key => key.split(':').map(Number)).filter(([row, at]) => list?.rows[row]?.prices[at]).map(([row, at]) => priceLine(list, list.rows[row], at));
      if (!lines.length || !box) return;
      close();
      priceView.picked = [];
      const before = box.value.replace(/\s+$/, '');
      box.value = (before ? before + '\n' : '') + lines.join('\n');
      box.dispatchEvent(new Event('input', { bubbles: true }));
```

What these edits do, so that you can recognise them: the module's header comment; `picked: []` in `priceView`; `PRICE_SYMBOLS` after `PRICE_SIGN_CODES`; one line of `priceShown` and its comment; the help text of 售价币种; the price buttons in `priceQuoteRows` (a block with `pricePick`, `aria-pressed` and the check mark); `priceQuoteRefresh()` and the new note and footer in `priceQuoteOpen()`; and `pricePick` with the new `priceInsert` among the actions.

**Verify**: `sha256sum work/wa-replica/fidelity-pricelist.js` → `f40f196f1ae0d967010a84f8f77ff9f5afd88f57e5909bc494c34171679f2345`. If the checksum does not match, restore the file (`git checkout -- <file>`) and apply the edit again, once; if it still does not match, STOP.

### Step 3: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(!/\bsend\s*\(/.test(pricePage), 'the price list must not send a message');
for (const required of ['function priceQuoteButton() {', 'function renderPriceList() {', 'window.WA_PRICE_FILE.read(new Uint8Array(await file.arrayBuffer()))', "fidButton('确认使用', 'priceUse', '', 'blue')", 'priceInsert: id => {', "box.dispatchEvent(new Event('input', { bubbles: true }));"]) {
  assert(pricePage.includes(required), `fidelity-pricelist.js is missing ${required}`);
```

Replace them with:

```text
assert(!/\bsend\s*\(/.test(pricePage), 'the price list must not send a message');
for (const required of ['function priceQuoteButton() {', 'function renderPriceList() {', 'window.WA_PRICE_FILE.read(new Uint8Array(await file.arrayBuffer()))', "fidButton('确认使用', 'priceUse', '', 'blue')", 'priceInsert: () => {', "box.dispatchEvent(new Event('input', { bubbles: true }));"]) {
  assert(pricePage.includes(required), `fidelity-pricelist.js is missing ${required}`);
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
// existed keeps the currencies of its headers.
for (const required of ['<select class="fid-select" id="price-currency">', "const start = list.columns.prices.map(priceHeaderCurrency).find(Boolean) || '';", 'if (list.currency === undefined) return priceMoney(list.columns.prices[at], value);', 'return list.currency && !/[$€£¥]/.test(value) ? `${list.currency} ${value}` : value;', "const chosen = $('#price-currency')?.value || '', currency = PRICE_CURRENCIES.some(([code]) => code === chosen) ? chosen : '';", 'data.priceList = { file: pending.file, at: new Date().toISOString(), by: ui.persona, currency, columns: pending.columns, rows: pending.rows };', '${esc(priceShown(list, at, value))}</button>', ': ${priceShown(list, at, entry.prices[at])}']) {
  assert(pricePage.includes(required), `fidelity-pricelist.js is missing ${required}`);
```

Replace them with:

```text
// existed keeps the currencies of its headers.
for (const required of ['<select class="fid-select" id="price-currency">', "const start = list.columns.prices.map(priceHeaderCurrency).find(Boolean) || '';", 'if (list.currency === undefined) return priceMoney(list.columns.prices[at], value);', "return list.currency && !/[$€£¥]/.test(value) ? (PRICE_SYMBOLS[list.currency] || list.currency + ' ') + value : value;", "const chosen = $('#price-currency')?.value || '', currency = PRICE_CURRENCIES.some(([code]) => code === chosen) ? chosen : '';", 'data.priceList = { file: pending.file, at: new Date().toISOString(), by: ui.persona, currency, columns: pending.columns, rows: pending.rows };', '${esc(priceShown(list, at, value))}</button>', ': ${priceShown(list, at, entry.prices[at])}']) {
  assert(pricePage.includes(required), `fidelity-pricelist.js is missing ${required}`);
```

**Edit 3.3** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert.equal(pricePage.match(/priceMoney\(/g).length, 2, 'a price must be shown and quoted only through priceShown');
// The translation shortcut (plans 060 and 062): set under a gear beside the customer's language by pressing it —
```

Replace them with:

```text
assert.equal(pricePage.match(/priceMoney\(/g).length, 2, 'a price must be shown and quoted only through priceShown');
// The quote dialog ticks several prices and puts them in together, and prices carry the sign of their currency (plan
// 078): a click ticks or unticks a price, the ticks stay while the search changes, 放入消息框 puts every ticked price
// into the message box, one line each, in the order they were ticked; "$40", not "USD 40" — the other dollars and the
// yen with signs of their own, AED and SAR with their codes.
for (const required of ['pricePick: id => {', "const lines = priceView.picked.map(key => key.split(':').map(Number)).filter(([row, at]) => list?.rows[row]?.prices[at]).map(([row, at]) => priceLine(list, list.rows[row], at));", "box.value = (before ? before + '\\n' : '') + lines.join('\\n');", 'data-action="pricePick" data-id="${id}" aria-pressed="${picked}"', "fidButton('放入消息框', 'priceInsert', '', 'blue', 'id=\"price-quote-insert\" disabled')", "const PRICE_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', CNY: '¥', JPY: 'JP¥', HKD: 'HK$', AUD: 'A$', CAD: 'C$', SGD: 'S$', MXN: 'MX$', BRL: 'R$', INR: '₹', RUB: '₽', KRW: '₩', VND: '₫', THB: '฿' };", '例如「$40」']) {
  assert(pricePage.includes(required) && appJs.includes(required), `the quote dialog must tick several prices and show currency signs: ${required.slice(0, 60)}`);
}
assert(!pricePage.includes('data-action="priceInsert" data-id='), 'a click on a price must tick it, not put it in at once');
// The translation shortcut (plans 060 and 062): set under a gear beside the customer's language by pressing it —
```

**Edit 3.4** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  whatsappConnection: 'real, through the sub-site\'s own server: QR code, incoming events, sending; no simulation',
  priceList: 'an .xlsx or .csv file is read in the browser (pricefile.js) and, once confirmed, replaces the list; the button 报价 beside the message box puts one product\'s price into the message box and sends nothing; the list can be taken out for good: its rows, its name in the log of saves and what it left in the database files',
  messageTranslation: 'once per message and reading language: kept on the message (translatedTo) and saved; the conversation on screen asks only for messages without a mark; the relay keeps every translation in ai-translations.db and gives it again',
```

Replace them with:

```text
  whatsappConnection: 'real, through the sub-site\'s own server: QR code, incoming events, sending; no simulation',
  priceList: 'an .xlsx or .csv file is read in the browser (pricefile.js) and, once confirmed, replaces the list; the button 报价 beside the message box puts the ticked prices into the message box, one line each, and sends nothing; the list can be taken out for good: its rows, its name in the log of saves and what it left in the database files',
  messageTranslation: 'once per message and reading language: kept on the message (translatedTo) and saved; the conversation on screen asks only for messages without a mark; the relay keeps every translation in ai-translations.db and gives it again',
```

**Edit 3.5** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  handMadeEmpty: 'a customer made by hand (新增客户) starts with an empty conversation; the 初步需求 stays in the profile and the notes (before, the conversation showed it as a message from the customer, and the first message sent saved it so)',
  handMadePreview: 'the row of a customer made by hand reads 新建客户档案 in its preview line (chat list, supervisor page) until the first message; before, it showed the 初步需求, which looked like the customer\'s last message',
```

Replace them with:

```text
  handMadeEmpty: 'a customer made by hand (新增客户) starts with an empty conversation; the 初步需求 stays in the profile and the notes (before, the conversation showed it as a message from the customer, and the first message sent saved it so)',
  quotePicks: 'the quote dialog (报价) ticks prices: a click ticks or unticks one, the ticks stay while the search changes, and 放入消息框 puts every ticked price into the message box, one line each, in the order they were ticked; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
  handMadePreview: 'the row of a customer made by hand reads 新建客户档案 in its preview line (chat list, supervisor page) until the first message; before, it showed the 初步需求, which looked like the customer\'s last message',
```

**Edit 3.6** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  translateShortcut: 'a key, a combination or modifier keys on their own, recorded under the gear beside the customer\'s language once its field is clicked (Ctrl + Enter at first; any key, plan 062), translates the message box into the customer\'s language and shows it above the box, guard on or off; Enter (or the send button, when Enter is the shortcut) then sends the translation; the line under the box names it',
  priceCurrency: 'one currency for the whole price list, chosen in the confirm dialog of an upload (18 currencies or none) and starting on the one the headers name; every price shown on the page and quoted into the message box carries it ("USD 40") unless the file gives the price with its own sign; a list saved before keeps the currencies of its headers',
  externalNetworkCalls: false,
```

Replace them with:

```text
  translateShortcut: 'a key, a combination or modifier keys on their own, recorded under the gear beside the customer\'s language once its field is clicked (Ctrl + Enter at first; any key, plan 062), translates the message box into the customer\'s language and shows it above the box, guard on or off; Enter (or the send button, when Enter is the shortcut) then sends the translation; the line under the box names it',
  priceCurrency: 'one currency for the whole price list, chosen in the confirm dialog of an upload (18 currencies or none) and starting on the one the headers name; every price shown on the page and quoted into the message box carries its sign ("$40"; AED and SAR their code: "AED 40") unless the file gives the price with its own sign; a list saved before keeps the currencies of its headers',
  externalNetworkCalls: false,
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `246e6ea6c0a90be4322698c57cfc870cc9acf2e75489345ec85df8c51a16c47e`; `git checkout 917e093 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.js` and `validation.json` of `outputs/wa-replica-prototype/` only; `sha256sum outputs/wa-replica-prototype/app.js` → `4db80a2a9aa23fea227c3f130a4ce723da2c9ba059f91e37daebe7b0a9f54ee7`. If a checksum does not match, restore the file and apply its edits again, once; if it still does not match, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 报价可以多选，价格显示货币符号 · 2026-11-26

在聊天界面点击消息框旁的「报价」：

- **多选**：点击价格不再立即放入，而是选中（按钮变为蓝色并带勾），可以选多个，再点一次取消；在上方搜索框查找其他产品时，已选的保留。底部显示「已选 N 项」，点击「放入消息框」后，按选中的顺序每个价格一行放入消息框，不会自动发送。
- **货币符号**：价格前显示所选币种的符号，例如「$40」，不再是「USD 40」。港币、澳元、加元、新加坡元、墨西哥比索、巴西雷亚尔和日元使用各自的符号（HK$、A$、C$、S$、MX$、R$、JP¥），所以「$」始终表示美元、「¥」表示人民币；没有通用符号的阿联酋迪拉姆和沙特里亚尔仍写代码（AED、SAR）。上传价格表时「售价币种」的说明同步改为符号示例。价格表页面的表头和「售价币种」一栏仍写币种代码。

验证：构建与校验脚本通过；浏览器测试：搜索并选中两个产品后放入消息框，两行报价按选中顺序出现，价格为「$」开头；修改前点击价格即放入一行，价格为「USD」开头。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout 917e093 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-078/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `e5fbd77383f75694a915405fe6839ca7c8d0d43dc57c41961a1019559d1b1e95`; `git status --porcelain` lists exactly these five as changed and nothing as new: the three files of the table in "Current state" and `outputs/wa-replica-prototype/app.js`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the refusal and the confirmed removal's filter, in the source and the built page.
- **Smoke** (`/tmp/wa-scrm-plan-078/smoke.sh`) — the same facts, three test files, which built files changed, the syntax of the built page.
- **Verified by the reviewer, not by you**: in a browser against the reviewer's harness — the probe described under "Why this matters" (signs, ticking across searches, unticking, the count and the button, the lines in the order ticked, a fresh dialog, the scroll position); the full site suite with its quote test brought to the new behaviour (ticks, "$", two prices at once), and the WhatsApp suite.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 917e093 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 20`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-078/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-pricelist.js` → `f40f196f1ae0d967010a84f8f77ff9f5afd88f57e5909bc494c34171679f2345`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `246e6ea6c0a90be4322698c57cfc870cc9acf2e75489345ec85df8c51a16c47e`
- [ ] `sha256sum replica/build-log.md` → `e5fbd77383f75694a915405fe6839ca7c8d0d43dc57c41961a1019559d1b1e95`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `4db80a2a9aa23fea227c3f130a4ce723da2c9ba059f91e37daebe7b0a9f54ee7`
- [ ] `git diff --name-only 917e093..HEAD -- outputs` lists `app.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only 917e093..HEAD -- . ':!plans'` lists exactly five paths: the three of the table in "Current state", `app.js` and `validation.json`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, or a test fails.
- An output file other than `app.js` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file, creating a file or installing a package.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else. An open page keeps the old behaviour until it is opened again.
- A new currency in `PRICE_CURRENCIES` needs its sign in `PRICE_SYMBOLS`, or it is quoted with its code.
- What a reviewer should scrutinise: that a ticked price that the search hides is still put in; that 放入消息框 cannot be pressed with nothing ticked; that nothing is sent; that the price list page still names the currency by code.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
