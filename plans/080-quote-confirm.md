# Plan 080: The quote dialog ticks products with a box; a confirm window checks quantities, prices and the total

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat d0eb628..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MEDIUM (the quote dialog is reworked: tick boxes, a second window with figures that are calculated; exact text and checksums for every file)
- **Depends on**: plans/078-quote-picks.md (DONE; this plan replaces its way of ticking and keeps its currency signs); plans/079-persona-manual.md (DONE; it changed the validator and the build log that this plan edits after it)
- **Category**: owner request of 2026-11-26 ("Bulk selection is available, but the interaction model should be different: there should be a checkbox on the left for selection, and upon final confirmation, a 'Confirm' window should appear, listing the selected items for CRUD operations.")
- **Planned at**: commit `d0eb628`, 2026-11-26

## Why this matters

Since plan 078 the quote dialog (报价, beside the message box; `fidelity-pricelist.js`) ticks several prices: a click on a price button (`data-action="pricePick"`) ticks or unticks it, and 放入消息框 puts one line per ticked price into the message box ("Product Alpha PRDA01: $40"). The owner saw it live and asked for a different way of working: a box on the left to tick a product, and on confirming, a window that lists the chosen products to be worked on — added, changed, deleted — before they go in. Asked in a question dialog what "changed" should mean there, the owner chose **"Quantity, price and total"**: each product with a quantity (default 1) and a unit price that can be changed, its amount, and a total; the message gets one line per product and a total line — the dialog showed "Product Alpha PRDA01: $40 x 10 = $400", "Product Gamma PRDC03: $8 x 5 = $40", "Total: $440".

Live data (structure only): the one price list has 202 products in one price column, currency USD; 195 prices are whole numbers and 7 have a decimal point, none above 999 — so figures are written as the file writes prices: plain, at most two decimals.

Shown in a browser (the reviewer's harness, 2026-11-26), with this plan's change on a list in USD: prices are shown as text; Alpha and Gamma ticked across two searches (已选 2 项, 确认 enabled); 确认 opens 确认报价 with both at quantity 1 and their prices, total $48; quantities 10 and 5 give $400, $40 and $440; Gamma at 7.5 gives $37.5 and $437.5; Gamma deleted leaves $400; 返回列表 shows 已选 1 项 and keeps the search; Beta ticked and 确认 again keeps Alpha's quantity 10; a quantity of 0 shows — and disables 放入消息框; quantity 2 puts "Product Alpha PRDA01: $40 x 10 = $400", "Product Beta PRDB02: $12.5 x 2 = $25", "Total: $425" into the message box and closes the dialog. The current build (plan 078) has no boxes: 50 price buttons.

### Decisions already made (do not re-open; do not ask)

- The list: every product row starts with `<input type="checkbox" data-price-pick="<row>">` inside its `<label class="price-quote-product">`, so a click on the product ticks it too; prices are plain text (`<span>`), no longer buttons. The ticks stay while the search changes. The footer: `已选 N 项`, `确认` (`priceConfirm`, disabled while nothing is ticked) and 关 闭.
- `priceView.picked` holds the ticked products in the order ticked as `{ row, at, qty, price }`: the price column (the first one with a price), and as typed the quantity ('1') and the unit price (the list's price as a number: `priceNumber`, written by `priceFigure` — at most two decimals, none when whole).
- 确认报价 (`priceConfirmOpen`): a table (`fid-table price-confirm-table` with a `colgroup`) of 产品 / 数量 / 单价 / 金额 / 删除 and a 合计 row; a product of a list with several price columns has a drop-down of its columns, which sets its unit price. Quantity must be a whole number of at least 1, the unit price a number; otherwise its amount and the total show — and 放入消息框 is disabled. `priceDrop` deletes a product; 返回列表 (`priceBack`) shows the list again with the ticks, the edits and the search; 取 消 closes the dialog and puts nothing in; opening the dialog again starts without ticks.
- 放入消息框 (`priceInsert`): one line per product, in the order ticked — `priceLine` with the unit price, then " x <quantity> = <amount>" — and "Total: <total>", at the end of the message box after what is typed; nothing is sent. With several price columns the line says which one after the price ("$10.5 (100+) x 1 = $10.5"). The currency signs of plan 078 are kept.
- Style: four rules in `fidelity.css` give the confirm table's columns their widths (percentages only, so that no new size token appears); the inputs fill their cells.
- Not changed: the price list page, the upload, the search, the 50-row limit, the narrow-screen rules.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity-pricelist.js` | `f40f196f1ae0d967010a84f8f77ff9f5afd88f57e5909bc494c34171679f2345` | `dcee52637b6c7d3208f93ffdfdc31a7abcac2b76b8e0562fb82f199e0e1a5c50` | 6 |
| `work/wa-replica/fidelity.css` | `b07f7085eab601f1841233354776cd6f5afce6db95fa87144889c5c8b9e6e7d4` | `f6bf1b8a18760ad6c1811dce7e9cc3871da765dc540e239bf99dbb02aaae73bb` | 1 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `851255670f6ca0b3e36598871a1637f9003b3bb285ec6607679dcbb6abbd044e` | `7cc8299ef799d9211752500b03fe1eedc8d2424ad6005d561fca12ef4016a3b7` | 3 |
| `replica/build-log.md` | `637a4e43cb0b76ed23f3d1e4b3e0991fca47322d373aa9890f44fa20647a73ec` | `bd05d9dcb326d40c4099389a00442e7fb4f847e1e60da26da08ed83009813319` | 1 append |

- `fidelity-pricelist.js` — the price list module of the built page: the page 价格表, the upload and its confirm dialog, and the quote dialog of the conversation (`priceQuoteRows`, `priceQuoteOpen`, the actions in `Object.assign(fidActions, { … })`, and the `input` and `change` listeners at the end of the file).
- `fidelity.css` — the page's own style sheet, built into `outputs/wa-replica-prototype/app.css`; the price rules (`.price-quote-…`) are near its end.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly three output files differ: `app.js`, `app.css` and `validation.json` (written by the validator).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer** (the server's accounts and data use `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout d0eb628 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (unchanged) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 20`, `fail 0` (unchanged) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-080/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-pricelist.js`, `work/wa-replica/fidelity.css` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.js`, `app.css`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — `fidelity-pricefile.js` (reading the file), the other style sheets, the base app, the other modules, the servers, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/080-quote-confirm` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): tick products in the quote dialog and confirm quantities, prices and the total`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, very long lines, quotes and backslashes; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 10 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the four files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-080/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-080 && cat > /tmp/wa-scrm-plan-080/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 080: the quote dialog ticks products with a box on the left; 确认 opens 确认报价 with quantity, unit
# price, amount and total; the lines and the total go into the message box. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'a box on the left ticks a product' "$W/fidelity-pricelist.js" '<input type="checkbox" data-price-pick='
same 'a price is not clicked any more' "$(grep -c 'data-action="pricePick"' "$W/fidelity-pricelist.js")" 0
has '确认 opens the confirm window' "$W/fidelity-pricelist.js" "fidDialog('确认报价',"
has 'quantity and unit price can be changed' "$W/fidelity-pricelist.js" 'data-price-qty='
has 'a product can be deleted' "$W/fidelity-pricelist.js" "fidButton('删除', 'priceDrop'"
has 'back to the list' "$W/fidelity-pricelist.js" "fidButton('返回列表', 'priceBack')"
has 'the lines end with the total' "$W/fidelity-pricelist.js" 'lines.push(`Total: ${priceShown(list, items[0].at'
has 'the columns of the confirm window have widths' "$W/fidelity.css" '.price-confirm-table col:nth-child(1) { width:36%; }'
has 'the page is built with it' "$O/app.js" "fidDialog('确认报价',"
has 'the style sheet is built with it' "$O/app.css" '.price-confirm-table col:nth-child(1)'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  quotePicks: 'the quote dialog (报价): a box on the left ticks a product"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 报价：左侧勾选产品，确认窗口中核对数量、单价和合计 · 2026-11-26'
same 'of the built files only the page, its style sheet and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.js|app\.css|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the tests of the price file pass' "$("$NODE" --test "$W/price-file.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-080/smoke.sh && ls -l /tmp/wa-scrm-plan-080/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-pricelist.js work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-080/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `a box on the left ticks a product`, `a price is not clicked any more` (got: 1), `确认 opens the confirm window`, `quantity and unit price can be changed`, `a product can be deleted`, `back to the list`, `the lines end with the total`, `the columns of the confirm window have widths`, `the page is built with it`, `the style sheet is built with it`, `the validator knows it` and `the build log has the entry` (twelve checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: Tick boxes, the confirm window and its lines

#### `fidelity-pricelist.js`

**Edit 2.1** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
  // browser (pricefile.js) and its products replace the list. In a conversation the button "报价" beside the
  // message box finds products, and the prices ticked there go into the message box together (plan 078). Nothing
  // here sends a message, suggests a product by itself or calls a server; a price is shown as the file gives it, with
  // the sign of the currency chosen for the list when it was uploaded (plans 059, 078).
  // ============================================================================
```

Replace them with:

```text
  // browser (pricefile.js) and its products replace the list. In a conversation the button "报价" beside the
  // message box finds products; the products ticked there are checked in a confirm window — quantity, unit price,
  // amount and total — and go into the message box together (plans 078, 080). Nothing here sends a message, suggests
  // a product by itself or calls a server; a price is shown as the file gives it, with the sign of the currency
  // chosen for the list when it was uploaded (plans 059, 078).
  // ============================================================================
```

**Edit 2.2** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
  const priceCells = (list, entry) => [entry.code, ...(list.columns.name ? [entry.name] : []), ...(list.columns.spec ? [entry.spec] : []), ...list.columns.prices.map((label, i) => entry.prices[i] || '')];
  // The line that goes into the message box, e.g. "Product Alpha PRDA01 (100*10 Units): $40". With several price
  // columns the line says which one: "... : $10.5 (100+)".
  function priceLine(list, entry, at) {
    const label = list.columns.prices[at] || '';
    const column = list.columns.prices.length > 1 ? priceColumnName(label) : '';
    return `${[entry.name, entry.code].filter(Boolean).join(' ')}${entry.spec ? ` (${entry.spec})` : ''}: ${priceShown(list, at, entry.prices[at])}${column ? ` (${column})` : ''}`;
  }

```

Replace them with:

```text
  const priceCells = (list, entry) => [entry.code, ...(list.columns.name ? [entry.name] : []), ...(list.columns.spec ? [entry.spec] : []), ...list.columns.prices.map((label, i) => entry.prices[i] || '')];
  // The line of a product, e.g. "Product Alpha PRDA01 (100*10 Units): $40", with the list's price or the unit price
  // given in the confirm window (plan 080). With several price columns the line says which one: "... : $10.5 (100+)".
  function priceLine(list, entry, at, value = entry.prices[at]) {
    const label = list.columns.prices[at] || '';
    const column = list.columns.prices.length > 1 ? priceColumnName(label) : '';
    return `${[entry.name, entry.code].filter(Boolean).join(' ')}${entry.spec ? ` (${entry.spec})` : ''}: ${priceShown(list, at, value)}${column ? ` (${column})` : ''}`;
  }
  // Figures of the confirm window (plan 080): a price of the file as a number ("1,200.50" is 1200.5; none is NaN),
  // a number as the page writes it (at most two decimals, none when whole: 400, 37.5), a quantity (a whole number,
  // at least 1) and a unit price (a number) as typed, and the amount of a product.
  const priceNumber = value => { const text = String(value ?? '').replace(/[^\d.]/g, ''); return text ? Number(text) : NaN; };
  const priceFigure = number => (Number.isFinite(number) ? String(Number(number.toFixed(2))) : '');
  const priceValid = item => /^\d+$/.test(item.qty) && Number(item.qty) >= 1 && /^\d+(\.\d+)?$/.test(item.price);
  const priceAmount = item => Number(item.qty) * Number(item.price);

```

**Edit 2.3** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
    const rows = found.slice(0, PRICE_QUOTE_ROWS).map(entry => {
      // A click ticks a price or unticks it (plan 078); a ticked price is drawn pressed, with a check mark.
      const prices = entry.prices.map((value, at) => {
        if (!value) return '';
        const id = `${list.rows.indexOf(entry)}:${at}`, picked = priceView.picked.includes(id);
        return `<button type="button" class="fid-btn slim ${picked ? 'blue' : 'tint'}" data-action="pricePick" data-id="${id}" aria-pressed="${picked}" title="${esc(priceLine(list, entry, at))}">${picked ? icon('Check') : ''}${several && priceColumnName(list.columns.prices[at]) ? `<small>${esc(priceColumnName(list.columns.prices[at]))}</small> ` : ''}${esc(priceShown(list, at, value))}</button>`;
      }).join('');
      return `<li class="price-quote-row"><span class="price-quote-product"><strong>${esc(entry.code)}</strong>${entry.name ? ` <span>${esc(entry.name)}</span>` : ''}${entry.spec ? ` <small>${esc(entry.spec)}</small>` : ''}</span><span class="price-quote-prices">${prices}</span></li>`;
    }).join('');
```

Replace them with:

```text
    const rows = found.slice(0, PRICE_QUOTE_ROWS).map(entry => {
      // A box on the left ticks the product (plan 080); its prices are shown, and chosen in the confirm window.
      const row = list.rows.indexOf(entry), picked = priceView.picked.some(item => item.row === row);
      const prices = entry.prices.map((value, at) => (value ? `<span>${several && priceColumnName(list.columns.prices[at]) ? `<small>${esc(priceColumnName(list.columns.prices[at]))}</small> ` : ''}${esc(priceShown(list, at, value))}</span>` : '')).join('');
      return `<li class="price-quote-row"><label class="price-quote-product"><input type="checkbox" data-price-pick="${row}" ${picked ? 'checked' : ''}><strong>${esc(entry.code)}</strong>${entry.name ? ` <span>${esc(entry.name)}</span>` : ''}${entry.spec ? ` <small>${esc(entry.spec)}</small>` : ''}</label><span class="price-quote-prices">${prices}</span></li>`;
    }).join('');
```

**Edit 2.4** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

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
  }

```

Replace them with:

```text
  }
  // Says how many products are ticked; 确认 needs at least one.
  function priceQuoteCount() {
    const count = $('#price-quote-count'), button = $('#price-quote-confirm');
    if (count) count.textContent = `已选 ${priceView.picked.length} 项`;
    if (button) button.disabled = !priceView.picked.length;
  }
  // The list to tick products in, with the ticks and the search as they are (opened anew, or back from the confirm
  // window). priceView.picked holds the ticked products in the order ticked: { row, at, qty, price } — the price
  // column and, as typed, the quantity and the unit price.
  function priceQuoteShow() {
    fidDialog('报价', `<div class="modal-body price-quote">
      <input type="search" class="fid-input" id="price-quote-search" aria-label="查找产品" placeholder="输入产品简称或名称查找" value="${esc(priceView.quote)}" ${priceList() ? '' : 'disabled'}>
      <p class="price-note">勾选左侧方框选择产品，可以多选；查找其他产品时，已选的保留。点击「确认」后核对数量和单价，再放入消息框，不会自动发送。</p>
      <div id="price-quote-rows">${priceQuoteRows()}</div>
    </div>`, `<span class="fid-small-note" id="price-quote-count">已选 ${priceView.picked.length} 项</span>${fidButton('确认', 'priceConfirm', '', 'blue', `id="price-quote-confirm" ${priceView.picked.length ? '' : 'disabled'}`)}${fidButton('关 闭', 'close')}`, true);
    $('#price-quote-search')?.focus();
  }
  function priceQuoteOpen() {
    if (!selectedCustomer() || !$('#composer-text')) return;
    Object.assign(priceView, { quote: '', picked: [] });
    priceQuoteShow();
  }
  // The confirm window (plan 080): the ticked products in the order ticked, each with its quantity, its unit price
  // — and, when the list has several price columns, the column — its amount, and the total. A product can be
  // deleted; 返回列表 goes back to the ticks; 放入消息框 needs a valid quantity and unit price for every product.
  function priceConfirmOpen() {
    const list = priceList();
    priceView.picked = priceView.picked.filter(item => list?.rows[item.row]?.prices[item.at]);
    const items = priceView.picked, several = list && list.columns.prices.length > 1, ready = items.length > 0 && items.every(priceValid);
    const rows = items.map((item, i) => {
      const entry = list.rows[item.row];
      const columns = several ? `<select class="fid-select" data-price-tier="${i}" aria-label="价格列">${entry.prices.map((value, at) => (value ? option(String(at), `${priceColumnName(list.columns.prices[at]) || `价格 ${at + 1}`}：${priceShown(list, at, value)}`, String(item.at)) : '')).join('')}</select>` : '';
      return `<tr><td><strong>${esc([entry.name, entry.code].filter(Boolean).join(' '))}</strong>${entry.spec ? ` <small>${esc(entry.spec)}</small>` : ''}${columns}</td>
        <td><input type="number" class="fid-input" min="1" step="1" inputmode="numeric" data-price-qty="${i}" value="${esc(item.qty)}" aria-label="数量"></td>
        <td><input type="number" class="fid-input" min="0" step="any" inputmode="decimal" data-price-unit="${i}" value="${esc(item.price)}" aria-label="单价"></td>
        <td id="price-amount-${i}">${esc(priceValid(item) ? priceShown(list, item.at, priceFigure(priceAmount(item))) : '—')}</td>
        <td>${fidButton('删除', 'priceDrop', '', 'slim', fidActionID(String(i)))}</td></tr>`;
    }).join('');
    const total = ready ? priceShown(list, items[0].at, priceFigure(items.reduce((sum, item) => sum + priceAmount(item), 0))) : '—';
    fidDialog('确认报价', `<div class="modal-body price-quote">${items.length
      ? `<div class="fid-table-scroll"><table class="fid-table price-confirm-table"><colgroup><col><col><col><col><col></colgroup><thead><tr><th scope="col">产品</th><th scope="col">数量</th><th scope="col">单价</th><th scope="col">金额</th><th scope="col"><span class="sr-only">删除</span></th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th scope="row" colspan="3">合计</th><td id="price-confirm-total">${esc(total)}</td><td></td></tr></tfoot></table></div>
      <p class="price-note">数量与单价可以修改，金额与合计随之计算。放入消息框后不会自动发送。</p>`
      : '<div class="price-quote-empty"><p>没有选中的产品</p></div>'}</div>`, `${fidButton('返回列表', 'priceBack')}${fidButton('放入消息框', 'priceInsert', '', 'blue', `id="price-confirm-insert" ${ready ? '' : 'disabled'}`)}${fidButton('取 消', 'close')}`, true);
  }
  // The amounts, the total and 放入消息框 follow what is typed in the confirm window.
  function priceConfirmTotals() {
    const list = priceList(), items = priceView.picked, ready = items.length > 0 && items.every(priceValid);
    items.forEach((item, i) => { const cell = $(`#price-amount-${i}`); if (cell) cell.textContent = priceValid(item) ? priceShown(list, item.at, priceFigure(priceAmount(item))) : '—'; });
    const total = $('#price-confirm-total');
    if (total) total.textContent = ready ? priceShown(list, items[0].at, priceFigure(items.reduce((sum, item) => sum + priceAmount(item), 0))) : '—';
    const button = $('#price-confirm-insert');
    if (button) button.disabled = !ready;
  }

```

**Edit 2.5** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

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
```

Replace them with:

```text
    priceOpenPage: () => { close(); navigate('prices'); },
    priceConfirm: () => { if (priceView.picked.length) priceConfirmOpen(); },
    priceBack: priceQuoteShow,
    priceDrop: id => {
      priceView.picked.splice(Number(id), 1);
      priceConfirmOpen();
    },
    // Puts one line per product — "Product Alpha PRDA01: $40 x 10 = $400" — and the total at the end of the message
    // box, in the order the products were ticked (plan 080). The message is not sent.
    priceInsert: () => {
      const list = priceList(), box = $('#composer-text'), items = priceView.picked;
      if (!list || !box || !items.length || !items.every(item => priceValid(item) && list.rows[item.row]?.prices[item.at])) return;
      const lines = items.map(item => `${priceLine(list, list.rows[item.row], item.at, priceFigure(Number(item.price)))} x ${item.qty} = ${priceShown(list, item.at, priceFigure(priceAmount(item)))}`);
      lines.push(`Total: ${priceShown(list, items[0].at, priceFigure(items.reduce((sum, item) => sum + priceAmount(item), 0)))}`);
      close();
```

**Edit 2.6** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
      paintIcons(rows);
    }
```

Replace them with:

```text
      paintIcons(rows);
    } else if (input.dataset.priceQty !== undefined || input.dataset.priceUnit !== undefined) {
      const item = priceView.picked[Number(input.dataset.priceQty ?? input.dataset.priceUnit)];
      if (!item) return;
      item[input.dataset.priceQty !== undefined ? 'qty' : 'price'] = input.value.trim();
      priceConfirmTotals();
    }
  });
  // A product ticked or unticked in the list (it starts with quantity 1 and the price of its first price column), or
  // another price column chosen for a product in the confirm window (its unit price becomes that column's).
  document.addEventListener('change', event => {
    const input = event.target, list = priceList();
    if (input.dataset?.pricePick !== undefined) {
      const row = Number(input.dataset.pricePick), entry = list?.rows[row], at = entry ? entry.prices.findIndex(Boolean) : -1;
      priceView.picked = priceView.picked.filter(item => item.row !== row);
      if (input.checked && at >= 0) priceView.picked.push({ row, at, qty: '1', price: priceFigure(priceNumber(entry.prices[at])) });
      priceQuoteCount();
    } else if (input.dataset?.priceTier !== undefined) {
      const item = priceView.picked[Number(input.dataset.priceTier)], at = Number(input.value), value = item && list?.rows[item.row]?.prices[at];
      if (!value) return;
      Object.assign(item, { at, price: priceFigure(priceNumber(value)) });
      priceConfirmOpen();
    }
```

#### `fidelity.css`

**Edit 2.7** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.price-quote-empty { display:grid; justify-items:center; gap:10px; padding:20px; color:var(--fid-quiet); font-size:13px; }
/* Where the conversation is narrow the button shows its icon only, and stands close to its neighbours. */
```

Replace them with:

```text
.price-quote-empty { display:grid; justify-items:center; gap:10px; padding:20px; color:var(--fid-quiet); font-size:13px; }
/* The confirm window of a quote (plan 080): the product column wide, quantity, unit price and amount narrower. */
.price-confirm-table col:nth-child(1) { width:36%; }
.price-confirm-table col:nth-child(2) { width:15%; }
.price-confirm-table col:nth-child(3) { width:19%; }
.price-confirm-table col:nth-child(4) { width:15%; }
.price-confirm-table .fid-input { width:100%; }
/* Where the conversation is narrow the button shows its icon only, and stands close to its neighbours. */
```

What these edits do, so that you can recognise them: in `fidelity-pricelist.js` the module's header comment; `priceLine` takes the unit price and is followed by the figure helpers (`priceNumber`, `priceFigure`, `priceValid`, `priceAmount`); the rows of the list get the box and plain prices; `priceQuoteCount`, `priceQuoteShow`, `priceQuoteOpen`, `priceConfirmOpen` and `priceConfirmTotals` replace `priceQuoteRefresh` and the old `priceQuoteOpen`; `priceConfirm`, `priceBack`, `priceDrop` and the new `priceInsert` replace `pricePick` and the old `priceInsert`; the `input` listener follows quantities and unit prices, and a new `change` listener follows the boxes and the price-column drop-downs. In `fidelity.css` the rules of `.price-confirm-table` follow `.price-quote-empty`.

**Verify**: `sha256sum work/wa-replica/fidelity-pricelist.js work/wa-replica/fidelity.css` → `dcee52637b6c7d3208f93ffdfdc31a7abcac2b76b8e0562fb82f199e0e1a5c50`, `f6bf1b8a18760ad6c1811dce7e9cc3871da765dc540e239bf99dbb02aaae73bb`. If the checksum does not match, restore the file (`git checkout -- <file>`) and apply the edit again, once; if it still does not match, STOP.

### Step 3: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
// existed keeps the currencies of its headers.
for (const required of ['<select class="fid-select" id="price-currency">', "const start = list.columns.prices.map(priceHeaderCurrency).find(Boolean) || '';", 'if (list.currency === undefined) return priceMoney(list.columns.prices[at], value);', "return list.currency && !/[$€£¥]/.test(value) ? (PRICE_SYMBOLS[list.currency] || list.currency + ' ') + value : value;", "const chosen = $('#price-currency')?.value || '', currency = PRICE_CURRENCIES.some(([code]) => code === chosen) ? chosen : '';", 'data.priceList = { file: pending.file, at: new Date().toISOString(), by: ui.persona, currency, columns: pending.columns, rows: pending.rows };', '${esc(priceShown(list, at, value))}</button>', ': ${priceShown(list, at, entry.prices[at])}']) {
  assert(pricePage.includes(required), `fidelity-pricelist.js is missing ${required}`);
```

Replace them with:

```text
// existed keeps the currencies of its headers.
for (const required of ['<select class="fid-select" id="price-currency">', "const start = list.columns.prices.map(priceHeaderCurrency).find(Boolean) || '';", 'if (list.currency === undefined) return priceMoney(list.columns.prices[at], value);', "return list.currency && !/[$€£¥]/.test(value) ? (PRICE_SYMBOLS[list.currency] || list.currency + ' ') + value : value;", "const chosen = $('#price-currency')?.value || '', currency = PRICE_CURRENCIES.some(([code]) => code === chosen) ? chosen : '';", 'data.priceList = { file: pending.file, at: new Date().toISOString(), by: ui.persona, currency, columns: pending.columns, rows: pending.rows };', '${esc(priceShown(list, at, value))}</span>', ': ${priceShown(list, at, value)}']) {
  assert(pricePage.includes(required), `fidelity-pricelist.js is missing ${required}`);
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

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

Replace them with:

```text
assert.equal(pricePage.match(/priceMoney\(/g).length, 2, 'a price must be shown and quoted only through priceShown');
// The quote dialog (plans 078, 080): a box on the left ticks a product, the ticks stay while the search changes; 确认
// opens a confirm window with the ticked products in the order ticked — quantity (a whole number, at least 1), unit
// price (and price column), amount, total — where a product can be deleted and 返回列表 goes back to the ticks; 放入消息框
// puts one line per product ("Product Alpha PRDA01: $40 x 10 = $400") and the total ("Total: $440"). Prices carry the
// sign of their currency: "$40", not "USD 40" — the other dollars and the yen with signs of their own, AED and SAR with
// their codes.
for (const required of ['<input type="checkbox" data-price-pick="${row}" ${picked ? \'checked\' : \'\'}>', "fidButton('确认', 'priceConfirm', '', 'blue', `id=\"price-quote-confirm\" ${priceView.picked.length ? '' : 'disabled'}`)", "fidDialog('确认报价',", 'data-price-qty="${i}"', 'data-price-unit="${i}"', "fidButton('删除', 'priceDrop', '', 'slim', fidActionID(String(i)))", "fidButton('返回列表', 'priceBack')", "const priceValid = item => /^\\d+$/.test(item.qty) && Number(item.qty) >= 1 && /^\\d+(\\.\\d+)?$/.test(item.price);", "const lines = items.map(item => `${priceLine(list, list.rows[item.row], item.at, priceFigure(Number(item.price)))} x ${item.qty} = ${priceShown(list, item.at, priceFigure(priceAmount(item)))}`);", "lines.push(`Total: ${priceShown(list, items[0].at, priceFigure(items.reduce((sum, item) => sum + priceAmount(item), 0)))}`);", "box.value = (before ? before + '\\n' : '') + lines.join('\\n');", "const PRICE_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', CNY: '¥', JPY: 'JP¥', HKD: 'HK$', AUD: 'A$', CAD: 'C$', SGD: 'S$', MXN: 'MX$', BRL: 'R$', INR: '₹', RUB: '₽', KRW: '₩', VND: '₫', THB: '฿' };", '例如「$40」']) {
  assert(pricePage.includes(required) && appJs.includes(required), `the quote dialog must tick products and confirm quantities and prices: ${required.slice(0, 60)}`);
}
assert(!pricePage.includes('pricePick: id =>') && !pricePage.includes('data-action="pricePick"') && !pricePage.includes('data-action="priceInsert" data-id='), 'a price is not clicked to tick it or to put it in at once any more');
// The translation shortcut (plans 060 and 062): set under a gear beside the customer's language by pressing it —
```

**Edit 3.3** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  personaManual: 'the persona of the customer profile (画像与跟进) holds only what a person entered with 保存画像: 意向等级 starts on 请选择, the other fields empty; a customer from WhatsApp or made with 新增客户 gets nothing filled in (the 初步需求 stays in the notes); 广告素材 / 证据 shows — when nothing is recorded; what the page filled in before was cleared once (data.personaManual), except where a person had saved the persona',
  quotePicks: 'the quote dialog (报价) ticks prices: a click ticks or unticks one, the ticks stay while the search changes, and 放入消息框 puts every ticked price into the message box, one line each, in the order they were ticked; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
  handMadePreview: 'the row of a customer made by hand reads 新建客户档案 in its preview line (chat list, supervisor page) until the first message; before, it showed the 初步需求, which looked like the customer\'s last message',
```

Replace them with:

```text
  personaManual: 'the persona of the customer profile (画像与跟进) holds only what a person entered with 保存画像: 意向等级 starts on 请选择, the other fields empty; a customer from WhatsApp or made with 新增客户 gets nothing filled in (the 初步需求 stays in the notes); 广告素材 / 证据 shows — when nothing is recorded; what the page filled in before was cleared once (data.personaManual), except where a person had saved the persona',
  quotePicks: 'the quote dialog (报价): a box on the left ticks a product, the ticks stay while the search changes; 确认 opens 确认报价 with the ticked products in the order ticked — quantity (whole, at least 1), unit price (and price column), amount, total — where a product can be deleted and 返回列表 goes back; 放入消息框 puts one line per product ("Product Alpha PRDA01: $40 x 10 = $400") and "Total: $440"; a price carries the sign of the list\'s currency ("$40"; HK$, A$, C$, S$, MX$, R$, JP¥ so that "$" and "¥" stay clear; AED and SAR keep their code)',
  handMadePreview: 'the row of a customer made by hand reads 新建客户档案 in its preview line (chat list, supervisor page) until the first message; before, it showed the 初步需求, which looked like the customer\'s last message',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `7cc8299ef799d9211752500b03fe1eedc8d2424ad6005d561fca12ef4016a3b7`; `git checkout d0eb628 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.js`, `app.css` and `validation.json` of `outputs/wa-replica-prototype/` only; `sha256sum outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/app.css` → `e58d127c6ada15c816bfc7c0e299d02050303f53656ef65b5ddac7ba516af5e3`, `b55b01f633d50e4b153fc49cbd7219fd4109fa8b1d83f6d9a5e9b66590ace509`. If a checksum does not match, restore the file and apply its edits again, once; if it still does not match, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 报价：左侧勾选产品，确认窗口中核对数量、单价和合计 · 2026-11-26

在聊天界面点击消息框旁的「报价」：

- **勾选**：每个产品左侧有一个方框，勾选即选中，可以多选；在上方搜索框查找其他产品时，已选的保留。价格只作显示，点击价格不再选中。底部显示「已选 N 项」，点击「确认」进入确认窗口。
- **确认报价窗口**：按勾选顺序列出已选产品，每行有「数量」（整数，默认 1）、「单价」（默认为价格表中的价格，可以修改）、自动计算的「金额」，以及「删除」按钮；底部显示「合计」。价格表有多个价格列时，每行可以选择使用哪一列。「返回列表」回到勾选列表继续添加（已选和已改的数量、单价保留）；「取 消」关闭窗口，不放入任何内容。
- **放入消息框**：每个产品一行，最后一行为合计，例如「Product Alpha PRDA01: $40 x 10 = $400」「Total: $440」，不会自动发送。数量或单价无效时，「放入消息框」不可点击。

验证：构建与校验脚本通过；浏览器测试：勾选两个产品（中间搜索了一次），确认窗口中修改数量和单价、删除一项、返回列表再勾选一项，放入消息框后的每一行和合计都与计算一致。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout d0eb628 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-080/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `bd05d9dcb326d40c4099389a00442e7fb4f847e1e60da26da08ed83009813319`; `git status --porcelain` lists exactly these seven as changed and nothing as new: the four files of the table in "Current state" and `outputs/wa-replica-prototype/app.js`, `app.css`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the refusal and the confirmed removal's filter, in the source and the built page.
- **Smoke** (`/tmp/wa-scrm-plan-080/smoke.sh`) — the same facts, three test files, which built files changed, the syntax of the built page.
- **Verified by the reviewer, not by you**: in a browser against the reviewer's harness — the probe described under "Why this matters", screenshots of the list and of 确认报价; the full site suite with its quote test rewritten for boxes and the confirm window (ticking across searches, quantities, a changed price, a deleted product, 返回列表, a quantity refused, a cancel that puts nothing in, a price column chosen, a price with its own sign), and the WhatsApp suite.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout d0eb628 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 20`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-080/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-pricelist.js` → `dcee52637b6c7d3208f93ffdfdc31a7abcac2b76b8e0562fb82f199e0e1a5c50`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `f6bf1b8a18760ad6c1811dce7e9cc3871da765dc540e239bf99dbb02aaae73bb`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `7cc8299ef799d9211752500b03fe1eedc8d2424ad6005d561fca12ef4016a3b7`
- [ ] `sha256sum replica/build-log.md` → `bd05d9dcb326d40c4099389a00442e7fb4f847e1e60da26da08ed83009813319`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `e58d127c6ada15c816bfc7c0e299d02050303f53656ef65b5ddac7ba516af5e3`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `b55b01f633d50e4b153fc49cbd7219fd4109fa8b1d83f6d9a5e9b66590ace509`
- [ ] `git diff --name-only d0eb628..HEAD -- outputs` lists `app.js`, `app.css` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only d0eb628..HEAD -- . ':!plans'` lists exactly seven paths: the four of the table in "Current state", `app.js`, `app.css` and `validation.json`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, or a test fails.
- An output file other than `app.js`, `app.css` and `validation.json` changes (a new size token in `tokens.css` would mean a pixel value crept into the style rules).
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file, creating a file or installing a package.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else. An open page keeps the old behaviour until it is opened again.
- The message lines are written for the customer: "x", "=" and the word "Total" (the same in English, Spanish and Portuguese); a reply translated before sending is translated with them.
- Figures are plain (no thousands separators), like the prices of the files in use; a list with prices like "1,200" is read as 1200.
- A new currency in `PRICE_CURRENCIES` needs its sign in `PRICE_SYMBOLS`, or it is quoted with its code.
- What a reviewer should scrutinise: that nothing is put in while a quantity or a price is not valid; that 取 消 puts nothing in; that 返回列表 keeps the edits; that nothing is sent.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
