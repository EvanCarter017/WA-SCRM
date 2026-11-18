# Plan 011: An order's shipping status moves by two buttons along fixed paths, and adding an order sets no status

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 680ab47..HEAD -- work/wa-replica README.md PRODUCT.md DESIGN.md replica/build-log.md outputs/wa-replica-prototype/README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/010-order-tracking-tab.md (DONE)
- **Category**: direction
- **Planned at**: commit `680ab47`, 2026-11-18

## Why this matters

Plan 010 added the `订单追踪` tab to the customer profile drawer. Each order row carries a drop-down `更新状态` that lets staff set any of the four shipping statuses at any time, and the form `登记订单` has a `物流状态` field, so an order can also be created in any status. The product owner reviewed it on 2026-11-18 and said:

> "No, that's not quite right. While adding an order is fine, you shouldn't handle multiple logistics statuses within a single entry. Typically, logistics statuses follow two distinct paths: the first is "Pending Shipment" → "Shipped" → "Delivered," while the second involves transitioning to an "Order Exception" status at any point before delivery. Therefore, could we perhaps split these into two separate buttons—one to advance the order along the standard workflow, and another to trigger an exception status? As for "adding an event," that should simply be treated as a standalone, independent event."

Asked what the last sentence means, the owner chose: adding an order only creates the order — the form asks for the order number and the time placed, with no status field, and every new order starts at "Pending Shipment"; after that the status changes only through the two buttons, and each step is logged as its own entry in the interaction timeline, as now. The owner also accepted four points about the buttons (decisions 2–5 below).

After this plan an order row has no drop-down. It shows up to two buttons: one that advances the order one step along `待发货 → 已发货 → 已签收`, and `标记异常`, which is available until the order is delivered. The form `登记订单` has two fields only.

### Decisions already made (do not re-open; do not ask)

1. Adding an order sets no status. The form `登记订单` asks for the order number and the time placed; a new order always gets the status `pending` (待发货). The timeline entry written when an order is added no longer mentions a status.
2. The advance button shows only the next step: `标记已发货` on a `pending` order, `标记已签收` on a `shipped` order. A `delivered` order has no step buttons.
3. The exception button `标记异常` is shown on `pending` and `shipped` orders only.
4. An order marked `problem` (异常) stays there: it has no step buttons and cannot return to the normal path.
5. A step cannot be reversed, except right after the click: the toast offers `撤销` (the existing undo option of `toast`, as removing an order does), which puts the previous status back and writes its own timeline entry.
6. The four statuses, their ids, labels (`待发货`, `已发货`, `已签收`, `异常（退回/丢件）`), colours and icons stay as they are. Orders already saved keep their status, whatever it is.
7. The remove button (bin) of an order, the first-contact block, the tab itself, the sample orders and the timeline filter `订单记录` stay as they are.
8. Both buttons call one action, `lcOrderShipping`, which checks that the requested step is allowed. The drop-down and its `change` handler are removed.
9. The advance button uses the existing button style `slim blue`, the exception button `slim danger`. No new CSS, no new icon, no new colour value.
10. The version string stays `0.8-scrm-engagement`.

## Current state

### What this repository is

A zero-dependency, offline, clickable **prototype** of an internal WhatsApp customer workbench: plain HTML/CSS/JS, no framework, no package.json. All data is fictional demo data kept in the browser's `localStorage`. UI text is **Simplified Chinese**; write UI and documentation text exactly as given in this plan.

### How the build works

`work/wa-replica/build-fidelity.cjs` reads a frozen baseline app (`work/wa-replica/fidelity-base/app.js`), applies string substitutions with a `swap(from, to)` helper (**never change a first argument**), and concatenates the module files into the body of one IIFE. It writes `outputs/wa-replica-prototype/*` and two identical standalone bundles, `outputs/whatsapp-scrm-lifecycle.html` and `outputs/whatsapp-replica-ui-fidelity.html`. **Outputs are committed and must be regenerated by running the build, never edited by hand.**

Icons: the build takes icon definitions from the existing `outputs/wa-replica-prototype/icons.js`. Restore that file from git before every build (command below). This plan adds no icon, and the build output `icons.js` must come out unchanged.

### The module you edit: `work/wa-replica/fidelity-lifecycle.js`

All excerpts below are from this file. It is an IIFE body fragment, so top-level code is indented two spaces. A line consisting of `…` inside an excerpt stands for lines left out.

**(a) The shipping statuses**, directly above `profileHTML = function(c) {`:

```js
  // Shipping status: [id, label, pill tone, icon].
  const LC_SHIPPING = [['pending', '待发货', 'warn', 'Clock3'], ['shipped', '已发货', 'info', 'Send'], ['delivered', '已签收', 'ok', 'CircleCheck'], ['problem', '异常（退回/丢件）', 'hot', 'TriangleAlert']];
  const lcShipping = id => LC_SHIPPING.find(s => s[0] === id) || LC_SHIPPING[0];
  // The customer's orders, newest first (a copy; write through c.orders).
  const lcOrders = c => (Array.isArray(c?.orders) ? c.orders : []).slice().sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
```

`lcShipping(id)` returns the status entry `[id, label, tone, icon]` and falls back to the first entry (`pending`) for an unknown id.

**(b) The order rows and the form of the `订单追踪` tab**, inside `profileHTML`:

```js
    } else if (tab === 'orders') {
      const orders = lcOrders(c);
      const orderItems = orders.map(o => {
        const [status, label, tone, glyph] = lcShipping(o.shipping);
        return `<div class="lc-deal-item">
          <div class="lc-deal-main">
            <strong>${esc(o.number)} <span class="lc-pill ${tone}">${icon(glyph)}${esc(label)}</span></strong>
            <small>下单时间 ${esc(fidDate(o.placedAt))}</small>
          </div>
          <div class="lc-deal-actions">
            <label class="lc-inline-select"><span>更新状态</span><select class="fid-select" data-lc-order-shipping="${esc(o.id)}" data-customer="${esc(c.id)}" aria-label="订单 ${esc(o.number)} 的物流状态">${LC_SHIPPING.map(([id, text]) => option(id, text, status)).join('')}</select></label>
            <button type="button" class="icon-button" data-action="lcOrderRemove" ${fidActionID(o.id)} data-customer="${esc(c.id)}" aria-label="删除订单 ${esc(o.number)}">${icon('Trash2')}</button>
          </div>
        </div>`;
      }).join('');
```

…and further down in the same branch:

```js
          ${orderItems ? `<div class="lc-deal-list">${orderItems}</div>` : '<p class="muted" style="font-size:12px">暂无订单。客户下单后，在下方登记订单号、下单时间与物流状态。</p>'}
        </div>
        <form id="lc-order-form" class="lc-card-block">
          …
          <div class="lc-qual-grid">
            <label class="lc-field"><span>订单号</span><input class="fid-input" name="number" required maxlength="40" placeholder="如 ORD-202611-105"></label>
            <label class="lc-field"><span>下单时间</span><input class="fid-input" type="datetime-local" name="placedAt" required value="${inputDate(new Date().toISOString())}"></label>
            <label class="lc-field full"><span>物流状态</span><select class="fid-select" name="shipping">${LC_SHIPPING.map(([id, text]) => option(id, text, 'pending')).join('')}</select></label>
          </div>
```

**(c) The remove action** in `Object.assign(fidActions, {` — the exemplar for an order action with undo — followed by its neighbour:

```js
    // Order tracking tab: remove an order at once; the toast offers to put it back.
    lcOrderRemove: (id, btn) => {
      const c = customer(btn?.dataset?.customer);
      const o = lcOrders(c).find(x => x.id === id);
      if (!o || !myCustomers().includes(c)) return;
      const apply = (orders, text) => {
        c.orders = orders;
        lcLog(c.id, 'order', text);
        persist();
        render();
        lcRefreshOpenDossier(c.id);
      };
      apply(lcOrders(c).filter(x => x !== o), `删除订单记录 ${o.number}`);
      toast(`已删除订单 ${o.number}。`, () => apply([...lcOrders(c), o], `恢复订单记录 ${o.number}`));
    },
    lcFollowTab: id => { lcState.followTab = id; ui.pages.followups = 0; render(); },
```

**(d) The end of the form handler** `'lc-order-form': (f, v) => {` in `Object.assign(fidForms, {`:

```js
      if (lcOrders(c).some(o => o.number === number)) return error(`该客户已登记订单号 ${number}。`);
      const shipping = lcShipping(v('shipping'));
      c.orders = [{ id: nextId('ord'), number, placedAt: placed.toISOString(), shipping: shipping[0] }, ...lcOrders(c)];
      lcLog(c.id, 'order', `登记订单 ${number}（下单时间 ${fidDate(placed.toISOString())}，物流状态：${shipping[1]}）`);
      persist();
```

**(e) The end of the file** — the `change` listener:

```js
  // Field toggles of the completion dialog, the tier / status drop-downs, and the shipping-status drop-downs of the orders tab
  document.addEventListener('change', e => {
    const t = e.target;
    …
      persist();
      render();
      lcRefreshOpenDossier(c.id);
    }
    if (t.dataset.lcOrderShipping) {
      const c = customer(t.dataset.customer);
      const o = lcOrders(c).find(x => x.id === t.dataset.lcOrderShipping);
      if (!o || !myCustomers().includes(c)) return;
      const next = lcShipping(t.value);
      const before = lcShipping(o.shipping);
      if (next[0] === before[0]) return;
      o.shipping = next[0];
      lcLog(c.id, 'order', `订单 ${o.number} 物流状态：${before[1]} → ${next[1]}`);
      toast(`订单 ${o.number} 的物流状态已更新为「${next[1]}」。`);
      persist();
      render();
      lcRefreshOpenDossier(c.id);
    }
  });
```

**(f) Helpers that already exist** (use them; do not redefine):

- `fidButton(label, action, glyph, style, attrs)` → `<button type="button" class="fid-btn STYLE" data-action="ACTION" ATTRS>` with the icon `glyph` and the escaped `label`. The styles `slim blue` and `slim danger` exist.
- `toast(message, undo)` → shows a message; when `undo` is a function, the toast shows a `撤销` button that calls it.
- `lcLog(customerId, category, text)`, `persist()`, `render()`, `lcRefreshOpenDossier(customerId)`, `customer(id)`, `myCustomers()`, `esc(text)`, `fidActionID(id)` — as used in excerpt (c).
- A click on any element with `data-action="NAME"` calls `fidActions.NAME(element.dataset.id, element)`.

### Other files

- `work/wa-replica/build-fidelity.cjs` contains the review item with `id: 'ORDER_TRACKING'` (its `question:` line begins `  question: '客户档案新增「订单追踪」栏：`) and one long line that begins `requirement.modelOutline.relationships.push('客户档案的订单追踪：`.
- `work/wa-replica/validate-scrm-lifecycle.cjs` has a section that starts with the comment line `// 13. Order tracking is a tab of the customer profile: first contact, orders typed in by hand, four shipping statuses`, followed by one long line that begins `for (const required of ["const LC_SHIPPING = [['pending', '待发货'"`, a line `  assert(moduleSource.includes(required), …);` and a line `}`. Its `summary` object contains a line that begins `  orderTracking: '`. Section 4 of the validator forbids a list of identifiers of removed features, among them `lcOrderStep`, `lcOrderOpen`, `lcAdvance`. **Use exactly the names given in this plan.**

### Repo conventions to match

- Two-space indentation, template literals for HTML, semicolons, single quotes.
- Commit messages: conventional commits, e.g. `feat(scrm): add an order tracking tab to the customer profile`.

## Commands you will need

Run from the repository root (inside your worktree). `node` v18 or newer works.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 680ab47 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Browser smoke | `bash /tmp/wa-scrm-plan-011/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |
| Syntax of a module file | `node -e "new (require('vm').Script)('(()=>{'+require('fs').readFileSync(process.argv[1],'utf8')+'})')" work/wa-replica/fidelity-lifecycle.js && echo SYNTAX_OK` | `SYNTAX_OK` |

There is no test suite, linter or typechecker. The build fails on a syntax error but not on a call to an undefined function; the smoke test catches those for code that runs on page load.

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-lifecycle.js` (Steps 2–6)
- `work/wa-replica/build-fidelity.cjs` (two requirement-record texts — Step 7)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 8)
- `README.md`, `PRODUCT.md`, `DESIGN.md`, `replica/build-log.md`, `outputs/wa-replica-prototype/README.md` (Step 9)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{index.html,app.js,app.css,tokens.css,components.css,demo-data.js,icons.js,element-review.js,lucide-license.txt,requirements-data.js,requirements.json,validation.json}`, `outputs/whatsapp-scrm-lifecycle.html`, `outputs/whatsapp-replica-ui-fidelity.html`

**Out of scope** (do NOT touch):

- `work/wa-replica/fidelity-base/**`, `fidelity-ui.js`, `fidelity-customer-pages.js`, `fidelity-ai.js`, `fidelity-dashboard.js`, `fidelity-openwa.js`, `fidelity-operations.js`, `fidelity-subsite.js`, `fidelity.css`, `fidelity-dashboard.css`, `fidelity-lifecycle.css`, `fidelity-index.html`.
- `LC_SHIPPING`, `lcShipping`, `lcOrders`, the sample orders in `lcSeed`, `lcOrderRemove`, the first-contact block, the tab buttons, the timeline tab.
- The tier and status drop-downs and their part of the `change` listener.
- The version string, the localStorage key, file names, navigation.
- `plans/**`, `outputs/review-prompts/**`, historical records, earlier entries of `replica/build-log.md`.
- New dependencies, icons, colour values, CSS or files.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/011-shipping-step-buttons` first.
- One or two commits are fine. Conventional commit message, e.g. `feat(scrm): move an order's shipping status with two step buttons`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

### Step 1: Create the browser smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-011/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-011 && cat > /tmp/wa-scrm-plan-011/smoke.sh <<'EOF'
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
inbundle 'lcOrderRemove: (id, btn) =>'
inbundle 'lcOrderShipping: (id, btn) =>'
inbundle 'data-shipping="problem"'
inbundle "const LC_SHIPPING_NEXT = { pending: 'shipped', shipped: 'delivered' };"
notinbundle 'data-lc-order-shipping'
notinbundle 'name="shipping"'
echo "artifacts: $OUT"
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-011/smoke.sh && ls -l /tmp/wa-scrm-plan-011/smoke.sh
```

(The drawer is closed on a fresh page, so the order rows are not on screen; the `inbundle` / `notinbundle` lines check the built file, and the `view=` lines check that every page still runs without errors. The buttons themselves are checked by the reviewer in a scripted browser session.)

**Verify**: `git checkout 680ab47 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs >/dev/null && bash /tmp/wa-scrm-plan-011/smoke.sh; git status --porcelain` → every `view=` line shows `js_errors=0`; the only failing checks are three `MISS bundle should contain: ...` lines (`lcOrderShipping…`, `data-shipping="problem"`, `const LC_SHIPPING_NEXT…`) and two `LEFT bundle should not contain: ...` lines, so the run ends with `SMOKE FAIL` (expected at this point); `git status --porcelain` prints **nothing**. If `js_errors` is non-zero, another check fails, or `git status` shows changes, STOP.

### Step 2: The shipping paths (`work/wa-replica/fidelity-lifecycle.js`)

Directly after the line `  const lcShipping = id => LC_SHIPPING.find(s => s[0] === id) || LC_SHIPPING[0];` (excerpt (a)), add:

```js
  // Shipping moves along one path, pending → shipped → delivered, or leaves it for `problem` at any
  // point before delivery. A delivered order and an order marked `problem` have no further step.
  const LC_SHIPPING_NEXT = { pending: 'shipped', shipped: 'delivered' };
```

**Verify**: syntax command → `SYNTAX_OK`; `grep -c "LC_SHIPPING_NEXT" work/wa-replica/fidelity-lifecycle.js` → `1`.

### Step 3: The order rows and the form (`profileHTML`, excerpt (b))

3a. Directly after the line `        const [status, label, tone, glyph] = lcShipping(o.shipping);`, add:

```js
        const next = LC_SHIPPING_NEXT[status] ? lcShipping(LC_SHIPPING_NEXT[status]) : null;
        const stepAttrs = `${fidActionID(o.id)} data-customer="${esc(c.id)}"`;
```

3b. Replace the whole line that begins `            <label class="lc-inline-select"><span>更新状态</span>` with these two lines:

```js
            ${next ? fidButton(`标记${next[1]}`, 'lcOrderShipping', next[3], 'slim blue', `${stepAttrs} data-shipping="${next[0]}" aria-label="订单 ${esc(o.number)}：标记${next[1]}"`) : ''}
            ${next ? fidButton('标记异常', 'lcOrderShipping', 'TriangleAlert', 'slim danger', `${stepAttrs} data-shipping="problem" aria-label="订单 ${esc(o.number)}：标记异常"`) : ''}
```

3c. In the line that begins `          ${orderItems ? `, replace the text `暂无订单。客户下单后，在下方登记订单号、下单时间与物流状态。` with:

```
暂无订单。客户下单后，在下方登记订单号与下单时间。
```

3d. Delete the whole line that begins `            <label class="lc-field full"><span>物流状态</span>` (the third field of the form). The two fields `订单号` and `下单时间` stay.

**Verify**: syntax command → `SYNTAX_OK`; `grep -c "data-lc-order-shipping\|name=\"shipping\"\|更新状态" work/wa-replica/fidelity-lifecycle.js` → `0`; `grep -c "'lcOrderShipping'" work/wa-replica/fidelity-lifecycle.js` → `2`.

### Step 4: The action behind both buttons (`Object.assign(fidActions, {` block)

Directly above the line that begins `    lcFollowTab: id =>` (after the `lcOrderRemove` action, excerpt (c)), add:

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

**Verify**: syntax command → `SYNTAX_OK`; `grep -c "lcOrderShipping: (id, btn) =>" work/wa-replica/fidelity-lifecycle.js` → `1`.

### Step 5: Adding an order sets no status (the form handler, excerpt (d))

Replace these three lines

```js
      const shipping = lcShipping(v('shipping'));
      c.orders = [{ id: nextId('ord'), number, placedAt: placed.toISOString(), shipping: shipping[0] }, ...lcOrders(c)];
      lcLog(c.id, 'order', `登记订单 ${number}（下单时间 ${fidDate(placed.toISOString())}，物流状态：${shipping[1]}）`);
```

with

```js
      // Adding an order is a step of its own: a new order always starts at the first step of the shipping path.
      c.orders = [{ id: nextId('ord'), number, placedAt: placed.toISOString(), shipping: 'pending' }, ...lcOrders(c)];
      lcLog(c.id, 'order', `登记订单 ${number}（下单时间 ${fidDate(placed.toISOString())}）`);
```

**Verify**: syntax command → `SYNTAX_OK`; `grep -c "v('shipping')" work/wa-replica/fidelity-lifecycle.js` → `0`.

### Step 6: Remove the drop-down handler (the `change` listener, excerpt (e))

6a. Replace the comment line `  // Field toggles of the completion dialog, the tier / status drop-downs, and the shipping-status drop-downs of the orders tab` with:

```js
  // Field toggles of the completion dialog, and the tier / status drop-downs
```

6b. Delete the whole block that begins with the line `    if (t.dataset.lcOrderShipping) {` and ends with its closing `    }` (fourteen lines). The file then ends with the lines `      lcRefreshOpenDossier(c.id);`, `    }`, `  });`.

**Verify**: syntax command → `SYNTAX_OK`; `grep -c "t.dataset.lcOrderShipping" work/wa-replica/fidelity-lifecycle.js` → `0`; `tail -3 work/wa-replica/fidelity-lifecycle.js` → the three lines named in 6b; `git diff 680ab47 --stat -- work/wa-replica/fidelity-lifecycle.js | tail -1` → `1 file changed, 32 insertions(+), 21 deletions(-)`. Then `git checkout 680ab47 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs >/dev/null && bash /tmp/wa-scrm-plan-011/smoke.sh` → every `view=` line has `js_errors=0` and the run ends with `SMOKE PASS`; `git diff 680ab47 -- outputs/wa-replica-prototype/icons.js | wc -l` → `0`.

### Step 7: Requirement records (`work/wa-replica/build-fidelity.cjs`)

7a. In the review item with `id: 'ORDER_TRACKING'`, replace the whole `question:` line with:

```js
  question: '客户档案新增「订单追踪」栏：显示客户首次联系时间，以及每笔订单的下单时间与物流状态。登记订单只填写订单号与下单时间，新订单从「待发货」开始；物流状态由两个按钮更新——沿「待发货 → 已发货 → 已签收」逐步推进，或在签收前标记为「异常」。订单由聊手手动登记，未对接店铺或物流系统。请评审：物流路径与状态是否齐全，订单还需要记录哪些信息，日后是否对接业务系统。',
```

7b. Replace the whole line that begins `requirement.modelOutline.relationships.push('客户档案的订单追踪：` with:

```js
requirement.modelOutline.relationships.push('客户档案的订单追踪：订单（Order）归属一位客户，记录订单号、下单时间与物流状态，由聊手手动登记，每次变更写入互动轨迹；未对接店铺、支付或物流系统。登记订单是独立的一步，新订单的物流状态为待发货；此后物流状态只能沿「待发货 → 已发货 → 已签收」逐步推进，或在签收前转为「异常」，已签收与异常为终点。客户首次联系时间取客户建档时间。登记订单不改变客户状态、等级、标签或跟进状态。');
```

**Verify**: `git checkout 680ab47 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0; `grep -c '登记订单是独立的一步' outputs/wa-replica-prototype/requirements.json` → `1`; `grep -c '物流状态由两个按钮更新' outputs/wa-replica-prototype/requirements.json` → `1`.

### Step 8: Validator (`work/wa-replica/validate-scrm-lifecycle.cjs`)

8a. Replace the comment line `// 13. Order tracking is a tab of the customer profile: first contact, orders typed in by hand, four shipping statuses` with:

```js
// 13. Order tracking is a tab of the customer profile: first contact, orders typed in by hand; shipping moves by two step buttons along fixed paths
```

8b. Replace the whole line that begins `for (const required of ["const LC_SHIPPING = [['pending', '待发货'"` with:

```js
for (const required of ["const LC_SHIPPING = [['pending', '待发货'", "['shipped', '已发货'", "['delivered', '已签收'", "['problem', '异常（退回/丢件）'", "const LC_SHIPPING_NEXT = { pending: 'shipped', shipped: 'delivered' };", "['orders', '订单追踪', lcOrders(c).length]", '<form id="lc-order-form"', "'lc-order-form': (f, v) =>", "shipping: 'pending' }, ...lcOrders(c)];", 'lcOrderShipping: (id, btn) =>', 'data-shipping="problem"', 'lcOrderRemove: (id, btn) =>', '首次联系时间', "order: '订单记录'", 'data.lcSeededOrders = true;']) {
```

8c. Directly after the `}` that closes that loop (the line after `  assert(moduleSource.includes(required), …);`), add:

```js
assert(!moduleSource.includes('data-lc-order-shipping') && !moduleSource.includes('name="shipping"') && !moduleSource.includes("v('shipping')"), 'shipping changes only through the two step buttons, and adding an order sets no status');
```

8d. In the `summary` object, replace the whole line that begins `  orderTracking: '` with:

```js
  orderTracking: 'profile tab: first contact, orders entered by hand; new orders start as pending; two step buttons move shipping pending → shipped → delivered, or to problem before delivery',
```

**Verify**: `node work/wa-replica/validate-scrm-lifecycle.cjs` → exit 0 with `"status": "passed"` and the new `"orderTracking"` text in the output.

### Step 9: Documentation, final rebuild and verification

9a. `README.md` — replace the whole line beginning `- **订单追踪**` with:

```
- **订单追踪**：客户档案的「订单追踪」栏显示客户首次联系时间，以及每笔订单的下单时间与物流状态。登记订单只填写订单号与下单时间；物流状态用两个按钮更新——沿「待发货 → 已发货 → 已签收」逐步推进，或在签收前标记为「异常」。订单由聊手手动登记，未对接店铺或物流系统。
```

9b. `PRODUCT.md` — replace the whole line beginning `10. **订单追踪**` with:

```
10. **订单追踪**：客户档案的「订单追踪」栏显示客户首次联系时间，并列出该客户的每笔订单——订单号、下单时间与物流状态。登记订单是独立的一步：只填写订单号与下单时间，新订单的物流状态为「待发货」。物流状态有两条路径、由两个按钮更新：推进按钮沿「待发货 → 已发货 → 已签收」每次前进一步；「标记异常」在签收前随时可用。已签收与异常为终点，不能退回；点错可在提示条立即撤销。登记有误的订单可删除。每次变更写入互动轨迹。未对接店铺、支付或物流系统；登记订单不改变客户状态、等级或标签。
```

9c. `DESIGN.md` — in the line beginning `4. **客户 360° 档案抽屉`, make these two replacements (nothing else on that line):

- replace `右侧是「更新状态」下拉框与删除按钮` with `右侧是物流按钮与删除按钮`
- replace `登记订单表单（订单号、下单时间、物流状态）。下拉框修改即保存；删除后提示条提供「撤销」。` with:

```
登记订单表单（订单号、下单时间）。物流状态不设下拉框，由每笔订单右侧的两个按钮更新：推进按钮只显示下一步（待发货时为「标记已发货」，已发货时为「标记已签收」），异常按钮「标记异常」在签收前可用；已签收或异常的订单不再显示这两个按钮。每次点击后提示条提供「撤销」，删除订单同样可撤销。
```

9d. `outputs/wa-replica-prototype/README.md` — in the section `## 订单追踪`, replace the whole line beginning `- 在「登记订单」填写订单号、下单时间与物流状态` with these two lines:

```
- 在「登记订单」填写订单号与下单时间，点击「添加订单」；新订单的物流状态为「待发货」。
- 物流状态用订单右侧的两个按钮更新：「标记已发货」/「标记已签收」沿正常路径前进一步，「标记异常」在签收前随时可用；已签收或异常的订单不再显示这两个按钮。点错可在提示条点「撤销」。垃圾桶按钮删除订单，同样可撤销。
```

9e. Append to the end of `replica/build-log.md` (do not change earlier entries):

```markdown

## 订单物流状态改为两个按钮 · 2026-11-18

按产品负责人意见，订单的物流状态不再用一个下拉框任意切换，而是按两条路径、由两个按钮更新：推进按钮沿「待发货 → 已发货 → 已签收」每次前进一步（待发货时显示「标记已发货」，已发货时显示「标记已签收」）；「标记异常」在签收前随时可用。已签收与异常为终点，不再显示这两个按钮；点错可在提示条立即撤销，撤销同样写入互动轨迹。

登记订单改为独立的一步：表单只保留订单号与下单时间，新订单的物流状态固定为「待发货」，登记时写入互动轨迹的记录不再包含物流状态。四种物流状态、删除订单、首次联系与示例订单均不变；浏览器中已保存的订单保留原有状态。
```

9f. Final run:

```bash
git checkout 680ab47 -- outputs/wa-replica-prototype/icons.js
node work/wa-replica/build-fidelity.cjs
node work/wa-replica/validate-scrm-lifecycle.cjs
bash /tmp/wa-scrm-plan-011/smoke.sh
git status --porcelain
```

**Verify**: build exit 0 with `"version": "0.8-scrm-engagement"`; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `git status --porcelain` lists only in-scope paths. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

This repo's verification pattern is the static validator plus browser checks; follow it.

- **Validator** — the changed section 13 (Step 8).
- **Browser smoke** (`/tmp/wa-scrm-plan-011/smoke.sh`) — every view renders without JavaScript errors; the built bundle contains the action, the exception button and the path table, and no longer contains the drop-down or the status field of the form.
- **Verified by the reviewer in a scripted browser session, not by you**: an order row has no drop-down; a pending order shows `标记已发货` and `标记异常`, a shipped order `标记已签收` and `标记异常`, a delivered order and an order marked as exception none; each click moves exactly one step, is saved across a reload and writes one timeline entry; the toast's undo puts the previous status back and writes its own entry; a step that is not allowed (delivered → anything, skipping a step, leaving the exception status) does nothing even when the action is called directly; the form has two fields and a new order starts as pending; orders saved by the previous build keep their status; the bin still removes an order; narrow-screen layout.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 680ab47 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `bash /tmp/wa-scrm-plan-011/smoke.sh` ends with `SMOKE PASS`
- [ ] `grep -c "data-lc-order-shipping\|name=\"shipping\"\|更新状态\|t.dataset.lcOrderShipping\|v('shipping')" work/wa-replica/fidelity-lifecycle.js` → `0`
- [ ] `grep -c "lcOrderShipping" work/wa-replica/fidelity-lifecycle.js` → `3`
- [ ] `grep -c "LC_SHIPPING_NEXT" work/wa-replica/fidelity-lifecycle.js` → `4`
- [ ] `git diff 680ab47 --stat -- work/wa-replica/fidelity-lifecycle.js | tail -1` → `1 file changed, 32 insertions(+), 21 deletions(-)`
- [ ] `git diff 680ab47 -- outputs/wa-replica-prototype/icons.js | wc -l` → `0` (no icon is added, dropped or reordered by this plan)
- [ ] `cmp outputs/whatsapp-scrm-lifecycle.html outputs/whatsapp-replica-ui-fidelity.html` → identical (no output)
- [ ] `git diff --stat 680ab47 -- work/wa-replica/fidelity-base work/wa-replica/fidelity-ui.js work/wa-replica/fidelity-customer-pages.js work/wa-replica/fidelity-ai.js work/wa-replica/fidelity-dashboard.js work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity-operations.js work/wa-replica/fidelity-subsite.js work/wa-replica/fidelity.css work/wa-replica/fidelity-dashboard.css work/wa-replica/fidelity-lifecycle.css work/wa-replica/fidelity-index.html outputs/review-prompts` → empty
- [ ] `git status --porcelain` is empty after your final commit, and `git diff --name-only 680ab47..HEAD` lists only in-scope paths (plus `plans/` files changed by commits that are not yours)
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (JavaScript errors at the planned commit, a failing check other than the five named ones, or the build is not reproducible there).
- Any excerpt in "Current state" does not match the file.
- `grep -c "LC_SHIPPING_NEXT\|lcOrderShipping:" work/wa-replica/fidelity-lifecycle.js` is not `0` before your edits (a name of this plan is already taken).
- The validator fails in its section 4 or 5 after your edits (a forbidden identifier or term) — you used a name or wording that is not in this plan.
- A `swap(...)` in the build script throws `Missing prototype source anchor` after your edit — you changed a first argument; revert that edit.
- `icons.js` differs from the planned commit after the build.
- The smoke test still reports `js_errors` after two fix attempts for the same error.
- The work appears to require editing an out-of-scope file.
- You believe a decision under "Decisions already made" is wrong. Report it; do not act on it.

## Maintenance notes

- The shipping paths live in two places only: `LC_SHIPPING_NEXT` (the forward path) and the rule in `lcOrderShipping` that `problem` may be entered from any status that still has a forward step. Both the buttons and the action derive from `LC_SHIPPING_NEXT`, so adding a step to the path means adding one status to `LC_SHIPPING` and one entry to `LC_SHIPPING_NEXT`.
- `lcOrderShipping` re-checks the step, so a stale button (for example in a second browser tab) cannot move an order backwards or out of an end status.
- Undo restores the status the order had before the click and logs its own timeline entry; it is offered only by the toast that follows the click.
- Orders saved before this plan may be in any of the four statuses; nothing migrates them, and the rows render from the status alone.
- Nothing lets an order leave `problem` or `delivered`. If the owner later wants that (for example re-shipping after an exception), it is a new path to define, not a bug.
- What a reviewer should scrutinise: no `<select>` is left in the order rows or the form; the action refuses steps that are not allowed; the tier and status drop-downs still save (the `change` listener lost only its last block); `icons.js` is byte-identical.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
