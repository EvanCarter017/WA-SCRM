# Plan 012: Each order is its own section, with one entry per shipping step it has reached

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4f83429..HEAD -- work/wa-replica README.md PRODUCT.md DESIGN.md replica/build-log.md outputs/wa-replica-prototype/README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/011-shipping-step-buttons.md (DONE)
- **Category**: direction
- **Planned at**: commit `4f83429`, 2026-11-18

## Why this matters

The `订单追踪` tab of the customer profile drawer lists a customer's orders as rows of one block. Each row shows the order number, one status label and the time placed; clicking a step button (`标记已发货`, `标记已签收`, `标记异常`) replaces the label. The product owner reviewed it on 2026-11-18 and said:

> "No, that's not quite right. Once I create an order, it shows as "pending shipment." Then, after I click "ship," a shipment entry for that order should appear. Furthermore, orders with different order numbers should be displayed in separate sections."

So a step must not overwrite what was shown before: it adds an entry. After this plan every order number has its own block in the tab. Inside the block there is one entry per shipping step the order has reached, oldest first — a new order has the entry `待发货` with the time it was placed; clicking `标记已发货` adds an entry `已发货` with the time of the click below it, and so on for `已签收` and `异常`.

### Decisions already made (do not re-open; do not ask)

1. One block (`lc-card-block lc-order`) per order, headed `订单 <order number>`, with the two step buttons and the remove button of that order in the head. The blocks are ordered as the rows are today: newest order first.
2. Inside a block, one entry per shipping step reached, **oldest first**. An entry shows the status label (the existing coloured pill) and a time. The first entry is always `待发货` and its time is the time the order was placed, prefixed `下单时间`. The other entries show the time of the click that added them.
3. The block head shows no status label of its own: the last entry is the current status.
4. An order keeps a `history` array of `{ shipping, at }` next to its `shipping` field, which stays the current status. Adding an order writes the first entry; a step button appends one; the undo offered by the toast restores the array as it was before the click.
5. Orders saved before this plan have no `history`. They are shown with the entries their status implies — `待发货` with the time placed, then the further steps with `时间未记录` instead of a time. Nothing is guessed. The array is written to such an order only when a step button is used on it.
6. The sample orders get a full history (shipped and delivered some days after they were placed), seeded once under a new flag `data.lcSeededOrderHistory`. This also covers sample orders already saved in a browser, as long as their status is still the seeded one.
7. The single block `订单与物流（N）` goes away when the customer has orders (the count stays on the tab button). A customer without orders keeps one block `订单与物流` with the empty text.
8. Unchanged: the two step buttons and their rules (`lcOrderShipping`, `LC_SHIPPING_NEXT`), the remove button with undo, the form `登记订单` and its two fields, the first-contact block, the timeline entries written for each change, the four statuses.
9. Existing classes are reused (`lc-card-block`, `lc-block-head`, `lc-deal-actions`, `lc-deal-list`, `lc-deal-item`, `lc-pill`, `muted`). Two small CSS rules are added so the head of an order block wraps on a narrow drawer. No new icon, no new colour value.
10. The version string stays `0.8-scrm-engagement`.

## Current state

### What this repository is

A zero-dependency, offline, clickable **prototype** of an internal WhatsApp customer workbench: plain HTML/CSS/JS, no framework, no package.json. All data is fictional demo data kept in the browser's `localStorage`. UI text is **Simplified Chinese**; write UI and documentation text exactly as given in this plan.

### How the build works

`work/wa-replica/build-fidelity.cjs` reads a frozen baseline app (`work/wa-replica/fidelity-base/app.js`), applies string substitutions with a `swap(from, to)` helper (**never change a first argument**), and concatenates the module files into the body of one IIFE. It writes `outputs/wa-replica-prototype/*` and two identical standalone bundles, `outputs/whatsapp-scrm-lifecycle.html` and `outputs/whatsapp-replica-ui-fidelity.html`. The CSS file `fidelity-lifecycle.css` is appended after the baseline CSS. **Outputs are committed and must be regenerated by running the build, never edited by hand.**

Icons: the build takes icon definitions from the existing `outputs/wa-replica-prototype/icons.js`. Restore that file from git before every build (command below). This plan adds no icon, and the build output `icons.js` must come out unchanged.

### The module you edit: `work/wa-replica/fidelity-lifecycle.js`

All excerpts below are from this file. It is an IIFE body fragment, so top-level code is indented two spaces. A line consisting of `…` inside an excerpt stands for lines left out.

**(a) The end of the sample-order seed** inside `function lcSeed() {`:

```js
      for (const [cid, sample] of Object.entries(samples)) {
        const target = customer(cid);
        if (target && !Array.isArray(target.orders)) Object.assign(target, sample);
      }
      data.lcSeededOrders = true;
    }

    // Ensure every customer has an engagement state and safe defaults
    for (const c of data.customers) {
```

The sample orders have the ids `ord-c3-1`, `ord-c3-2`, `ord-c6-1` (status `delivered`) and `ord-c11-1` (status `shipped`). Each has `{ id, number, placedAt, shipping }`.

**(b) The order helpers**, directly above `profileHTML = function(c) {`:

```js
  const LC_SHIPPING_NEXT = { pending: 'shipped', shipped: 'delivered' };
  // The customer's orders, newest first (a copy; write through c.orders).
  const lcOrders = c => (Array.isArray(c?.orders) ? c.orders : []).slice().sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));

  profileHTML = function(c) {
```

`lcShipping(id)` (defined just above) returns the status entry `[id, label, pill tone, icon]` and falls back to `pending` for an unknown id.

**(c) The `订单追踪` tab**, inside `profileHTML`:

```js
    } else if (tab === 'orders') {
      const orders = lcOrders(c);
      const orderItems = orders.map(o => {
        const [status, label, tone, glyph] = lcShipping(o.shipping);
        const next = LC_SHIPPING_NEXT[status] ? lcShipping(LC_SHIPPING_NEXT[status]) : null;
        const stepAttrs = `${fidActionID(o.id)} data-customer="${esc(c.id)}"`;
        return `<div class="lc-deal-item">
          <div class="lc-deal-main">
            <strong>${esc(o.number)} <span class="lc-pill ${tone}">${icon(glyph)}${esc(label)}</span></strong>
            <small>下单时间 ${esc(fidDate(o.placedAt))}</small>
          </div>
          <div class="lc-deal-actions">
            ${next ? fidButton(`标记${next[1]}`, 'lcOrderShipping', next[3], 'slim blue', `${stepAttrs} data-shipping="${next[0]}" aria-label="订单 ${esc(o.number)}：标记${next[1]}"`) : ''}
            ${next ? fidButton('标记异常', 'lcOrderShipping', 'TriangleAlert', 'slim danger', `${stepAttrs} data-shipping="problem" aria-label="订单 ${esc(o.number)}：标记异常"`) : ''}
            <button type="button" class="icon-button" data-action="lcOrderRemove" ${fidActionID(o.id)} data-customer="${esc(c.id)}" aria-label="删除订单 ${esc(o.number)}">${icon('Trash2')}</button>
          </div>
        </div>`;
      }).join('');
      tabBody = `
        <div class="lc-card-block">
          <div class="lc-block-head"><h3>${icon('MessageCircle')}首次联系</h3></div>
          <div class="info-row"><span>首次联系时间</span><span><strong>${esc(fidDate(c.createdAt))}</strong></span></div>
          <div class="info-row"><span>进线渠道</span><span>${esc(c.source || '—')}</span></div>
        </div>
        <div class="lc-card-block">
          <div class="lc-block-head"><h3>${icon('ClipboardList')}订单与物流（${orders.length}）</h3></div>
          ${orderItems ? `<div class="lc-deal-list">${orderItems}</div>` : '<p class="muted" style="font-size:12px">暂无订单。客户下单后，在下方登记订单号与下单时间。</p>'}
        </div>
        <form id="lc-order-form" class="lc-card-block">
```

**(d) The step action** in `Object.assign(fidActions, {`:

```js
    // Order tracking tab: the two step buttons of an order. Shipping only moves one step forward
    // (LC_SHIPPING_NEXT) or to `problem`, and only while the order is not delivered; the toast offers undo.
    lcOrderShipping: (id, btn) => {
      const c = customer(btn?.dataset?.customer);
      const o = lcOrders(c).find(x => x.id === id);
      if (!o || !myCustomers().includes(c)) return;
      const before = lcShipping(o.shipping);
      const next = lcShipping(btn.dataset.shipping);
      const forward = LC_SHIPPING_NEXT[before[0]];
      if (!forward || (next[0] !== forward && next[0] !== 'problem')) return;
      const apply = (status, text) => {
        o.shipping = status;
        lcLog(c.id, 'order', text);
        persist();
        render();
        lcRefreshOpenDossier(c.id);
      };
      apply(next[0], `订单 ${o.number} 物流状态：${before[1]} → ${next[1]}`);
      toast(`订单 ${o.number} 已标记为「${next[1]}」。`, () => apply(before[0], `撤销：订单 ${o.number} 物流状态恢复为${before[1]}`));
    },
```

**(e) The end of the form handler** `'lc-order-form': (f, v) => {` in `Object.assign(fidForms, {`:

```js
      if (lcOrders(c).some(o => o.number === number)) return error(`该客户已登记订单号 ${number}。`);
      // Adding an order is a step of its own: a new order always starts at the first step of the shipping path.
      c.orders = [{ id: nextId('ord'), number, placedAt: placed.toISOString(), shipping: 'pending' }, ...lcOrders(c)];
      lcLog(c.id, 'order', `登记订单 ${number}（下单时间 ${fidDate(placed.toISOString())}）`);
      persist();
```

**(f) Helpers that already exist** (use them; do not redefine): `fidButton(label, action, glyph, style, attrs)`, `fidActionID(id)`, `esc(text)`, `icon('Name')`, `fidDate(iso)` (→ `YYYY-MM-DD HH:MM`), `toast(message, undo)`, `lcLog(customerId, category, text)`, `persist()`, `render()`, `lcRefreshOpenDossier(customerId)`, `customer(id)`, `myCustomers()`, `nextId(prefix)`. The class `muted` gives the muted text colour.

### Styles: `work/wa-replica/fidelity-lifecycle.css`

Multi-line rules, one declaration per line, two-space indentation. `.lc-block-head` is a flex row (`display: flex; align-items: center; justify-content: space-between; gap: 8px;`) that does not wrap. The file ends with the rule of plan 010:

```css
/* Order entries in the interaction timeline of the customer profile (plan 010) */
.lc-timeline-item.cat-order {
  border-left-color: var(--fid-mint);
}
```

### Other files

- `work/wa-replica/build-fidelity.cjs` contains the review item with `id: 'ORDER_TRACKING'` (its `question:` line begins `  question: '客户档案新增「订单追踪」栏：`) and one long line that begins `requirement.modelOutline.relationships.push('客户档案的订单追踪：`.
- `work/wa-replica/validate-scrm-lifecycle.cjs` has a section that starts with a comment line beginning `// 13. Order tracking is a tab of the customer profile`, followed by one long line that begins `for (const required of ["const LC_SHIPPING = [['pending', '待发货'"`. Its `summary` object contains a line that begins `  orderTracking: '`. Section 4 of the validator forbids a list of identifiers of removed features, among them `lcOrderStep`, `lcOrderOpen`, `lcCustomerOrders`. **Use exactly the names given in this plan.**

### Repo conventions to match

- Two-space indentation, template literals for HTML, semicolons, single quotes.
- Commit messages: conventional commits, e.g. `feat(scrm): move an order's shipping status with two step buttons`.

## Commands you will need

Run from the repository root (inside your worktree). `node` v18 or newer works.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 4f83429 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Browser smoke | `bash /tmp/wa-scrm-plan-012/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |
| Syntax of a module file | `node -e "new (require('vm').Script)('(()=>{'+require('fs').readFileSync(process.argv[1],'utf8')+'})')" work/wa-replica/fidelity-lifecycle.js && echo SYNTAX_OK` | `SYNTAX_OK` |

There is no test suite, linter or typechecker. The build fails on a syntax error but not on a call to an undefined function; the smoke test catches those for code that runs on page load.

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-lifecycle.js` (Steps 2–6)
- `work/wa-replica/fidelity-lifecycle.css` (Step 7)
- `work/wa-replica/build-fidelity.cjs` (two requirement-record texts — Step 8)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 9)
- `README.md`, `PRODUCT.md`, `DESIGN.md`, `replica/build-log.md`, `outputs/wa-replica-prototype/README.md` (Step 10)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{index.html,app.js,app.css,tokens.css,components.css,demo-data.js,icons.js,element-review.js,lucide-license.txt,requirements-data.js,requirements.json,validation.json}`, `outputs/whatsapp-scrm-lifecycle.html`, `outputs/whatsapp-replica-ui-fidelity.html`

**Out of scope** (do NOT touch):

- `work/wa-replica/fidelity-base/**`, `fidelity-ui.js`, `fidelity-customer-pages.js`, `fidelity-ai.js`, `fidelity-dashboard.js`, `fidelity-openwa.js`, `fidelity-operations.js`, `fidelity-subsite.js`, `fidelity.css`, `fidelity-dashboard.css`, `fidelity-index.html`.
- `LC_SHIPPING`, `lcShipping`, `LC_SHIPPING_NEXT`, `lcOrders`, the existing sample-order block of `lcSeed` (excerpt (a) — you add a block after it), `lcOrderRemove`, the step rules at the top of `lcOrderShipping` (the lines up to and including `if (!forward || …) return;`), the validation lines of the form handler, the form markup, the first-contact block, the tab buttons, the timeline tab.
- The version string, the localStorage key, file names, navigation.
- `plans/**`, `outputs/review-prompts/**`, historical records, earlier entries of `replica/build-log.md`.
- New dependencies, icons, colour values or files.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/012-order-sections-with-entries` first.
- One or two commits are fine. Conventional commit message, e.g. `feat(scrm): show each order as its own section with one entry per shipping step`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

### Step 1: Create the browser smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-012/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-012 && cat > /tmp/wa-scrm-plan-012/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Renders each view of the standalone bundle in headless Chrome and checks it.
set -u
ROOT=$(git rev-parse --show-toplevel); OUT=$(mktemp -d); FAIL=0
HTML="$ROOT/outputs/whatsapp-scrm-lifecycle.html"
strip() { node -e "const fs=require('fs');const s=fs.readFileSync(process.argv[1],'utf8').replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/<!--[\s\S]*?-->/g,'');fs.writeFileSync(process.argv[2],s)" "$1" "$2"; }
for view in dashboard inbox accounts customers followups chat-records tags tag-stats materials ai scope; do
  prof=$(mktemp -d)
  timeout 90 /usr/bin/google-chrome --headless=new --no-sandbox --disable-gpu --user-data-dir="$prof" --enable-logging=stderr --v=0 --virtual-time-budget=4000 --dump-dom "file://$HTML#$view" 2>"$OUT/$view.log" >"$OUT/$view.html"
  rm -rf "$prof"
  strip "$OUT/$view.html" "$OUT/$view.txt"
  errs=$(grep -ciE 'Uncaught|ReferenceError|TypeError|SyntaxError' "$OUT/$view.log")
  size=$(wc -c <"$OUT/$view.txt")
  echo "view=$view js_errors=$errs rendered_bytes=$size"
  { [ "$errs" = 0 ] && [ "$size" -gt 15000 ]; } || FAIL=1
done
need() { grep -q "$2" "$OUT/$1.txt" && echo "ok   $1 contains: $2" || { echo "MISS $1 should contain: $2"; FAIL=1; }; }
inbundle() { grep -qF "$1" "$HTML" && echo "ok   bundle contains: $1" || { echo "MISS bundle should contain: $1"; FAIL=1; }; }
notinbundle() { grep -qF "$1" "$HTML" && { echo "LEFT bundle should not contain: $1"; FAIL=1; } || echo "ok   bundle does not contain: $1"; }
need inbox 'data-action="openConversation"'
need customers 'Olivia Bennett'
need followups 'lc-todo-table'
need chat-records '归档会话'
need ai '能力清单'
inbundle '<form id="lc-order-form"'
inbundle 'lcOrderShipping: (id, btn) =>'
inbundle 'function lcOrderHistory(o) {'
inbundle 'data.lcSeededOrderHistory = true;'
inbundle 'class="lc-card-block lc-order"'
inbundle '.lc-order-head h3'
notinbundle '订单与物流（'
echo "artifacts: $OUT"
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-012/smoke.sh && ls -l /tmp/wa-scrm-plan-012/smoke.sh
```

(The drawer is closed on a fresh page, so the order blocks are not on screen; the `inbundle` / `notinbundle` lines check the built file, and the `view=` lines check that the seed and every page still run without errors. The blocks themselves are checked by the reviewer in a scripted browser session.)

**Verify**: `git checkout 4f83429 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs >/dev/null && bash /tmp/wa-scrm-plan-012/smoke.sh; git status --porcelain` → every `view=` line shows `js_errors=0`; the only failing checks are four `MISS bundle should contain: ...` lines (`function lcOrderHistory…`, `data.lcSeededOrderHistory…`, `class="lc-card-block lc-order"`, `.lc-order-head h3`) and one `LEFT bundle should not contain: 订单与物流（` line, so the run ends with `SMOKE FAIL` (expected at this point); `git status --porcelain` prints **nothing**. If `js_errors` is non-zero, another check fails, or `git status` shows changes, STOP.

### Step 2: History of the sample orders (`work/wa-replica/fidelity-lifecycle.js`, `lcSeed`)

Insert the following block between the blank line that follows the closing `    }` of the `if (!data.lcSeededOrders) {` block (excerpt (a)) and the comment `    // Ensure every customer has an engagement state and safe defaults`. Leave one blank line after the new block.

```js
    // Shipping history of the sample orders (seeded once): each further step some days after the order
    // was placed. It also reaches sample orders saved before the history existed, unless their status
    // was changed since.
    if (!data.lcSeededOrderHistory) {
      const sampleSteps = {
        'ord-c3-1': [['shipped', 1.1], ['delivered', 5.8]],
        'ord-c3-2': [['shipped', 0.8], ['delivered', 3.7]],
        'ord-c6-1': [['shipped', 0.7], ['delivered', 4.0]],
        'ord-c11-1': [['shipped', 2.0]],
      };
      for (const c of data.customers) {
        for (const o of Array.isArray(c.orders) ? c.orders : []) {
          const steps = sampleSteps[o.id];
          if (!steps || Array.isArray(o.history) || o.shipping !== steps[steps.length - 1][0]) continue;
          o.history = [{ shipping: 'pending', at: o.placedAt }, ...steps.map(([shipping, days]) => ({ shipping, at: new Date(Date.parse(o.placedAt) + days * 86400000).toISOString() }))];
        }
      }
      data.lcSeededOrderHistory = true;
    }
```

**Verify**: syntax command → `SYNTAX_OK`; `grep -c "lcSeededOrderHistory" work/wa-replica/fidelity-lifecycle.js` → `2`.

### Step 3: The history helper

Directly after the line that begins `  const lcOrders = c =>` (excerpt (b)), add:

```js
  // The shipping entries of an order, oldest first: { shipping, at }. An order saved before the history
  // existed gets the steps its status implies, with no time for the steps that were never recorded.
  function lcOrderHistory(o) {
    if (Array.isArray(o.history)) return o.history;
    const implied = { shipped: ['shipped'], delivered: ['shipped', 'delivered'], problem: ['problem'] }[lcShipping(o.shipping)[0]] || [];
    return [{ shipping: 'pending', at: o.placedAt }, ...implied.map(shipping => ({ shipping, at: null }))];
  }
```

**Verify**: syntax command → `SYNTAX_OK`; `grep -c "function lcOrderHistory(o) {" work/wa-replica/fidelity-lifecycle.js` → `1`.

### Step 4: One block per order, one entry per step (`profileHTML`, excerpt (c))

4a. Replace the whole statement `const orderItems = orders.map(o => { … }).join('');` — the sixteen lines from `      const orderItems = orders.map(o => {` through `      }).join('');` — with:

```js
      // One block per order number. Inside it, one entry per shipping step the order has reached,
      // oldest first; the first entry carries the time the order was placed.
      const orderSections = orders.map(o => {
        const [status] = lcShipping(o.shipping);
        const next = LC_SHIPPING_NEXT[status] ? lcShipping(LC_SHIPPING_NEXT[status]) : null;
        const stepAttrs = `${fidActionID(o.id)} data-customer="${esc(c.id)}"`;
        const entries = lcOrderHistory(o).map((entry, i) => {
          const [, label, tone, glyph] = lcShipping(entry.shipping);
          return `<div class="lc-deal-item">
            <span class="lc-pill ${tone}">${icon(glyph)}${esc(label)}</span>
            <span class="muted" style="font-size:12px">${entry.at ? (i ? '' : '下单时间 ') + esc(fidDate(entry.at)) : '时间未记录'}</span>
          </div>`;
        }).join('');
        return `<div class="lc-card-block lc-order">
          <div class="lc-block-head lc-order-head">
            <h3>${icon('ClipboardList')}订单 ${esc(o.number)}</h3>
            <div class="lc-deal-actions">
              ${next ? fidButton(`标记${next[1]}`, 'lcOrderShipping', next[3], 'slim blue', `${stepAttrs} data-shipping="${next[0]}" aria-label="订单 ${esc(o.number)}：标记${next[1]}"`) : ''}
              ${next ? fidButton('标记异常', 'lcOrderShipping', 'TriangleAlert', 'slim danger', `${stepAttrs} data-shipping="problem" aria-label="订单 ${esc(o.number)}：标记异常"`) : ''}
              <button type="button" class="icon-button" data-action="lcOrderRemove" ${fidActionID(o.id)} data-customer="${esc(c.id)}" aria-label="删除订单 ${esc(o.number)}">${icon('Trash2')}</button>
            </div>
          </div>
          <div class="lc-deal-list">${entries}</div>
        </div>`;
      }).join('');
```

4b. In the `tabBody` template that follows, replace these four lines

```js
        <div class="lc-card-block">
          <div class="lc-block-head"><h3>${icon('ClipboardList')}订单与物流（${orders.length}）</h3></div>
          ${orderItems ? `<div class="lc-deal-list">${orderItems}</div>` : '<p class="muted" style="font-size:12px">暂无订单。客户下单后，在下方登记订单号与下单时间。</p>'}
        </div>
```

with

```js
        ${orderSections || `<div class="lc-card-block">
          <div class="lc-block-head"><h3>${icon('ClipboardList')}订单与物流</h3></div>
          <p class="muted" style="font-size:12px">暂无订单。客户下单后，在下方登记订单号与下单时间。</p>
        </div>`}
```

The first-contact block above and the `<form id="lc-order-form" …>` below stay as they are.

**Verify**: syntax command → `SYNTAX_OK`; `grep -c "orderItems" work/wa-replica/fidelity-lifecycle.js` → `0`; `grep -c "orderSections" work/wa-replica/fidelity-lifecycle.js` → `2`; `grep -c "lcOrderHistory(o)" work/wa-replica/fidelity-lifecycle.js` → `2`.

### Step 5: A step adds an entry (`lcOrderShipping`, excerpt (d))

5a. Replace the two comment lines above `    lcOrderShipping: (id, btn) => {` with:

```js
    // Order tracking tab: the two step buttons of an order. Shipping only moves one step forward
    // (LC_SHIPPING_NEXT) or to `problem`, and only while the order is not delivered. Each step adds an
    // entry to the order's history; the toast offers undo, which takes that entry away again.
```

5b. Replace the nine lines from `      const apply = (status, text) => {` through the line that begins `      toast(\`订单 ${o.number} 已标记为` with:

```js
      const history = lcOrderHistory(o);
      const apply = (status, entries, text) => {
        o.shipping = status;
        o.history = entries;
        lcLog(c.id, 'order', text);
        persist();
        render();
        lcRefreshOpenDossier(c.id);
      };
      apply(next[0], [...history, { shipping: next[0], at: new Date().toISOString() }], `订单 ${o.number} 物流状态：${before[1]} → ${next[1]}`);
      toast(`订单 ${o.number} 已标记为「${next[1]}」。`, () => apply(before[0], history, `撤销：订单 ${o.number} 物流状态恢复为${before[1]}`));
```

The lines above them (down to `if (!forward || (next[0] !== forward && next[0] !== 'problem')) return;`) and the closing `    },` stay as they are.

**Verify**: syntax command → `SYNTAX_OK`; `grep -c "o.history = entries;" work/wa-replica/fidelity-lifecycle.js` → `1`; `grep -c "lcOrderHistory(o)" work/wa-replica/fidelity-lifecycle.js` → `3`.

### Step 6: A new order starts its history (the form handler, excerpt (e))

Replace these three lines

```js
      // Adding an order is a step of its own: a new order always starts at the first step of the shipping path.
      c.orders = [{ id: nextId('ord'), number, placedAt: placed.toISOString(), shipping: 'pending' }, ...lcOrders(c)];
      lcLog(c.id, 'order', `登记订单 ${number}（下单时间 ${fidDate(placed.toISOString())}）`);
```

with

```js
      // Adding an order is a step of its own: a new order always starts at the first step of the shipping
      // path, and that step, at the time the order was placed, is the first entry of its history.
      const placedAt = placed.toISOString();
      c.orders = [{ id: nextId('ord'), number, placedAt, shipping: 'pending', history: [{ shipping: 'pending', at: placedAt }] }, ...lcOrders(c)];
      lcLog(c.id, 'order', `登记订单 ${number}（下单时间 ${fidDate(placedAt)}）`);
```

**Verify**: syntax command → `SYNTAX_OK`; `grep -c "history: \[{ shipping: 'pending', at: placedAt }\]" work/wa-replica/fidelity-lifecycle.js` → `1`; `git diff 4f83429 --stat -- work/wa-replica/fidelity-lifecycle.js | tail -1` → `1 file changed, 63 insertions(+), 22 deletions(-)`.

### Step 7: Styles (`work/wa-replica/fidelity-lifecycle.css`)

Append to the end of the file:

```css

/* Order blocks of the order tracking tab: the head wraps on a narrow drawer (plan 012) */
.lc-order-head {
  flex-wrap: wrap;
}
.lc-order-head h3 {
  min-width: 0;
  overflow-wrap: anywhere;
}
```

**Verify**: `grep -c "lc-order-head" work/wa-replica/fidelity-lifecycle.css` → `2`. Then `git checkout 4f83429 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs >/dev/null && bash /tmp/wa-scrm-plan-012/smoke.sh` → every `view=` line has `js_errors=0` and the run ends with `SMOKE PASS`; `git diff 4f83429 -- outputs/wa-replica-prototype/icons.js | wc -l` → `0`.

### Step 8: Requirement records (`work/wa-replica/build-fidelity.cjs`)

8a. In the review item with `id: 'ORDER_TRACKING'`, replace the whole `question:` line with:

```js
  question: '客户档案新增「订单追踪」栏：显示客户首次联系时间，并按订单号分区列出每笔订单。每个订单的分区内，订单每到达一个物流状态就新增一条记录（状态与时间）：登记订单时为「待发货」并带下单时间，此后由两个按钮更新——沿「待发货 → 已发货 → 已签收」逐步推进，或在签收前标记为「异常」。订单由聊手手动登记，未对接店铺或物流系统。请评审：物流路径与状态是否齐全，订单还需要记录哪些信息，日后是否对接业务系统。',
```

8b. Replace the whole line that begins `requirement.modelOutline.relationships.push('客户档案的订单追踪：` with:

```js
requirement.modelOutline.relationships.push('客户档案的订单追踪：订单（Order）归属一位客户，记录订单号、下单时间、当前物流状态与物流记录，由聊手手动登记，每次变更写入互动轨迹；未对接店铺、支付或物流系统。登记订单是独立的一步，新订单的物流状态为待发货；此后物流状态只能沿「待发货 → 已发货 → 已签收」逐步推进，或在签收前转为「异常」，已签收与异常为终点。订单每到达一个物流状态就在物流记录中追加一条（状态与时间），第一条为待发货并取下单时间；界面按订单号分区展示这些记录。客户首次联系时间取客户建档时间。登记订单不改变客户状态、等级、标签或跟进状态。');
```

**Verify**: `git checkout 4f83429 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0; `grep -c '按订单号分区列出每笔订单' outputs/wa-replica-prototype/requirements.json` → `1`; `grep -c '在物流记录中追加一条' outputs/wa-replica-prototype/requirements.json` → `1`.

### Step 9: Validator (`work/wa-replica/validate-scrm-lifecycle.cjs`)

9a. Replace the whole comment line that begins `// 13. Order tracking is a tab of the customer profile` with:

```js
// 13. Order tracking is a tab of the customer profile: first contact; one block per order with one entry per shipping step; shipping moves by two step buttons along fixed paths
```

9b. Replace the whole line that begins `for (const required of ["const LC_SHIPPING = [['pending', '待发货'"` with:

```js
for (const required of ["const LC_SHIPPING = [['pending', '待发货'", "['shipped', '已发货'", "['delivered', '已签收'", "['problem', '异常（退回/丢件）'", "const LC_SHIPPING_NEXT = { pending: 'shipped', shipped: 'delivered' };", "['orders', '订单追踪', lcOrders(c).length]", '<form id="lc-order-form"', "'lc-order-form': (f, v) =>", "shipping: 'pending', history: [{ shipping: 'pending', at: placedAt }] }, ...lcOrders(c)];", 'function lcOrderHistory(o) {', 'class="lc-card-block lc-order"', 'o.history = entries;', "'时间未记录'", 'lcOrderShipping: (id, btn) =>', 'data-shipping="problem"', 'lcOrderRemove: (id, btn) =>', '首次联系时间', "order: '订单记录'", 'data.lcSeededOrders = true;', 'data.lcSeededOrderHistory = true;']) {
```

9c. In the `summary` object, replace the whole line that begins `  orderTracking: '` with:

```js
  orderTracking: 'profile tab: first contact; one block per order with one entry per shipping step reached (pending at the time placed, then shipped / delivered / problem at the time of the click); two step buttons',
```

**Verify**: `node work/wa-replica/validate-scrm-lifecycle.cjs` → exit 0 with `"status": "passed"` and the new `"orderTracking"` text in the output.

### Step 10: Documentation, final rebuild and verification

10a. `README.md` — replace the whole line beginning `- **订单追踪**` with:

```
- **订单追踪**：客户档案的「订单追踪」栏显示客户首次联系时间，并按订单号分区列出每笔订单。每个订单的分区内，订单每到达一个物流状态就有一条记录（状态与时间）：登记订单时为「待发货」并带下单时间；点击「标记已发货」「标记已签收」或「标记异常」后新增对应记录。物流状态沿「待发货 → 已发货 → 已签收」逐步推进，或在签收前标记为「异常」。订单由聊手手动登记，未对接店铺或物流系统。
```

10b. `PRODUCT.md` — replace the whole line beginning `10. **订单追踪**` with:

```
10. **订单追踪**：客户档案的「订单追踪」栏显示客户首次联系时间，并按订单号分区列出该客户的每笔订单。登记订单是独立的一步：只填写订单号与下单时间，订单的分区内随即出现第一条记录「待发货」（带下单时间）。物流状态有两条路径、由两个按钮更新：推进按钮沿「待发货 → 已发货 → 已签收」每次前进一步；「标记异常」在签收前随时可用。每点击一次，该订单的分区内就新增一条对应记录（状态与点击时间），之前的记录保留。已签收与异常为终点，不能退回；点错可在提示条立即撤销，新增的记录随之移除。登记有误的订单可删除。每次变更写入互动轨迹。未对接店铺、支付或物流系统；登记订单不改变客户状态、等级或标签。
```

10c. `DESIGN.md` — in the line beginning `4. **客户 360° 档案抽屉`, make these two replacements (nothing else on that line):

- replace `订单与物流（每笔订单一行：订单号、物流状态标记、下单时间，右侧是物流按钮与删除按钮，按下单时间从新到旧排列）` with:

```
订单分区（每个订单号单独一块：标题为「订单」加订单号，右侧是物流按钮与删除按钮；块内每到达一个物流状态有一条记录——状态标记与时间，从早到晚排列，第一条为「待发货」并带下单时间；各订单按下单时间从新到旧排列；没有订单时显示一块「订单与物流」空状态）
```

- replace `每次点击后提示条提供「撤销」，删除订单同样可撤销。` with:

```
每次点击都会在该订单的分区内新增一条记录，提示条提供「撤销」（撤销即移除这条记录）；删除订单同样可撤销。此前保存、没有物流记录的订单按当前状态补出对应记录，未记录的时间显示为「时间未记录」。
```

10d. `outputs/wa-replica-prototype/README.md` — in the section `## 订单追踪`, replace the whole line beginning `- 物流状态用订单右侧的两个按钮更新` with:

```
- 每个订单号单独一块。新订单先有一条「待发货」记录（带下单时间）；点击「标记已发货」后，该订单下新增一条「已发货」记录与时间，「标记已签收」「标记异常」同理，之前的记录保留。已签收或异常的订单不再显示这两个按钮。点错可在提示条点「撤销」，新增的记录随之移除。垃圾桶按钮删除订单，同样可撤销。
```

10e. Append to the end of `replica/build-log.md` (do not change earlier entries):

```markdown

## 订单按订单号分区并保留物流记录 · 2026-11-18

按产品负责人意见，「订单追踪」栏不再把所有订单排成同一块里的若干行、点击后只替换状态标记，而是每个订单号单独一块，块内每到达一个物流状态新增一条记录：登记订单后先有「待发货」（带下单时间），点击「标记已发货」后在其下新增「已发货」与点击时间，「标记已签收」「标记异常」同理，之前的记录保留。提示条的「撤销」会移除刚新增的那条记录。

订单新增物流记录字段（状态与时间的列表），当前状态仍单独保存。示例订单补齐了发货与签收时间；浏览器中此前保存、没有物流记录的订单按当前状态补出对应记录，未记录的时间显示为「时间未记录」。两个物流按钮及其规则、登记订单表单、删除订单与首次联系均不变。
```

10f. Final run:

```bash
git checkout 4f83429 -- outputs/wa-replica-prototype/icons.js
node work/wa-replica/build-fidelity.cjs
node work/wa-replica/validate-scrm-lifecycle.cjs
bash /tmp/wa-scrm-plan-012/smoke.sh
git status --porcelain
```

**Verify**: build exit 0 with `"version": "0.8-scrm-engagement"`; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `git status --porcelain` lists only in-scope paths. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

This repo's verification pattern is the static validator plus browser checks; follow it.

- **Validator** — the changed section 13 (Step 9).
- **Browser smoke** (`/tmp/wa-scrm-plan-012/smoke.sh`) — every view renders without JavaScript errors with the new seed block in place; the built bundle contains the history helper, the seed flag, the order block and its style, and no longer contains the counted heading of the single block.
- **Verified by the reviewer in a scripted browser session, not by you**: every order number has its own block headed with the number; a new order has exactly one entry, `待发货` with the time placed; `标记已发货` adds an entry `已发货` with the current time below it and keeps the first; `标记已签收` and `标记异常` do the same; undo removes exactly the added entry; entries survive a reload; the sample orders show full histories with times in order; an order saved without a history shows the entries its status implies with `时间未记录`, and gets a stored history once a button is used on it; sample orders saved by the previous build receive their history once, unless their status was changed; blocks of several orders stay separate and ordered newest first; the buttons, the remove button, the form and the timeline entries behave as before; narrow-screen layout.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 4f83429 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `bash /tmp/wa-scrm-plan-012/smoke.sh` ends with `SMOKE PASS`
- [ ] `grep -c "orderItems\|订单与物流（" work/wa-replica/fidelity-lifecycle.js` → `0`
- [ ] `grep -c "lcOrderHistory(o)" work/wa-replica/fidelity-lifecycle.js` → `3`
- [ ] `grep -c "lcSeededOrderHistory" work/wa-replica/fidelity-lifecycle.js` → `2`
- [ ] `git diff 4f83429 --stat -- work/wa-replica/fidelity-lifecycle.js | tail -1` → `1 file changed, 63 insertions(+), 22 deletions(-)`
- [ ] `grep -c "lc-order-head" work/wa-replica/fidelity-lifecycle.css` → `2`
- [ ] `git diff 4f83429 -- outputs/wa-replica-prototype/icons.js | wc -l` → `0` (no icon is added, dropped or reordered by this plan)
- [ ] `cmp outputs/whatsapp-scrm-lifecycle.html outputs/whatsapp-replica-ui-fidelity.html` → identical (no output)
- [ ] `git diff --stat 4f83429 -- work/wa-replica/fidelity-base work/wa-replica/fidelity-ui.js work/wa-replica/fidelity-customer-pages.js work/wa-replica/fidelity-ai.js work/wa-replica/fidelity-dashboard.js work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity-operations.js work/wa-replica/fidelity-subsite.js work/wa-replica/fidelity.css work/wa-replica/fidelity-dashboard.css work/wa-replica/fidelity-index.html outputs/review-prompts` → empty
- [ ] `git status --porcelain` is empty after your final commit, and `git diff --name-only 4f83429..HEAD` lists only in-scope paths (plus `plans/` files changed by commits that are not yours)
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (JavaScript errors at the planned commit, a failing check other than the five named ones, or the build is not reproducible there).
- Any excerpt in "Current state" does not match the file.
- `grep -c "lcOrderHistory\|lcSeededOrderHistory\|orderSections\|lc-order-head" work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-lifecycle.css | grep -vc ":0"` is not `0` before your edits (a name of this plan is already taken).
- The validator fails in its section 4 or 5 after your edits (a forbidden identifier or term) — you used a name or wording that is not in this plan.
- A `swap(...)` in the build script throws `Missing prototype source anchor` after your edit — you changed a first argument; revert that edit.
- `icons.js` differs from the planned commit after the build.
- The smoke test still reports `js_errors` after two fix attempts for the same error.
- The work appears to require editing an out-of-scope file.
- You believe a decision under "Decisions already made" is wrong. Report it; do not act on it.

## Maintenance notes

- An order is `{ id, number, placedAt, shipping, history }`. `shipping` is the current status and decides which buttons are offered; `history` is the list of entries shown in the order's block. Read the entries through `lcOrderHistory(o)`, which also covers orders saved without a history.
- The two fields are kept in step in two places only: the form handler (first entry) and `lcOrderShipping` (append, or restore on undo). A third writer must update both.
- An order saved without a history gets the array stored the first time a step button is used on it; until then its implied entries are computed on every render and nothing is written.
- The first entry's time is the time placed, not the time the order was typed in; the other entries carry the time of the click.
- The sample histories are seeded once per saved data set (`data.lcSeededOrderHistory`), from the order's own time placed, so they stay consistent with it; a demo reset seeds them again.
- What a reviewer should scrutinise: a step never rewrites an earlier entry; undo restores the exact previous array; the head of an order block wraps on a narrow drawer; no `<select>` returned; `icons.js` is byte-identical.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
