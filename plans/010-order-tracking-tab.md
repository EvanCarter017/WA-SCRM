# Plan 010: The customer profile gets an order tracking tab — first contact, each order's time and shipping status

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9663767..HEAD -- work/wa-replica README.md PRODUCT.md DESIGN.md replica/build-log.md outputs/wa-replica-prototype/README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/009-follow-labels-open-follow-up-centre.md (DONE)
- **Category**: direction
- **Planned at**: commit `9663767`, 2026-11-18

## Why this matters

The customer profile drawer (`客户 360° 档案`) has three tabs: `画像与跟进`, `互动轨迹`, `沟通备注`. It shows nothing about orders, and the time a customer first came in is visible only in the last column of the customer list. The product owner marked the three tabs on a screenshot on 2026-11-18 and said:

> "We should add a tracking feature here to monitor the status of a customer's orders—or perhaps adapt the existing 'Interactive Track' tool. For instance, I need to be able to see when a customer first reached out, the shipping status of each of their orders, and exactly when they placed an order with us."

Asked whether this should be a new tab or a change to `互动轨迹` only, the owner chose the new tab and confirmed four points: orders are typed in by staff; the shipping statuses are "Not shipped yet / Shipped / Delivered / Problem (returned or lost)"; an order holds only its number, the date and time it was placed and its shipping status; adding an order does not change the customer status.

After this plan the drawer has a fourth tab, `订单追踪`. It shows when the customer first got in touch, lists the customer's orders (number, time placed, shipping status), lets staff add an order, change an order's shipping status and remove an order entered by mistake. Every such change is also written to `互动轨迹`.

### Decisions already made (do not re-open; do not ask)

1. A fourth tab `订单追踪`, placed between `互动轨迹` and `沟通备注`. The other three tabs keep their content.
2. Orders are entered by hand. Nothing is fetched from anywhere; no shop, payment or courier system is assumed.
3. Four fixed shipping statuses: `pending` 待发货, `shipped` 已发货, `delivered` 已签收, `problem` 异常（退回/丢件）.
4. An order is exactly `{ id, number, placedAt, shipping }`. No amount, product list, carrier, tracking number or note.
5. Orders are stored on the customer object as `c.orders`. **Never read or write `data.orders`**: browsers that used an older build still hold a `data.orders` list of a removed feature with a different shape.
6. "First contact" is the customer's existing `createdAt` (the first incoming message for a customer who wrote in, the time of entry for a customer added by hand). It is shown read-only.
7. Adding an order, changing a status, removing an order and undoing a removal each write one entry to the interaction timeline with the category `order`. The timeline gets a fourth filter chip `订单记录`. Nothing else is triggered: the customer status, tier, tags, to-dos and follow-up state are not changed.
8. Removing an order happens at once, without a confirmation dialog (a dialog would replace the drawer); the toast offers `撤销` through the existing undo option of `toast`.
9. An order number may be used once per customer. The time placed may not be in the future.
10. Sample orders are seeded once for three demo customers whose story already mentions an order — `c3` Olivia Bennett (two delivered), `c6` Noah Wilson (one delivered), `c11` Carlos Vega (one shipped) — guarded by a new flag `data.lcSeededOrders`, so demo data already saved in a browser receives them too. The first-contact time of `c3` and `c6` is moved back so that it precedes their orders.
11. Existing classes are reused for the layout (`lc-card-block`, `lc-block-head`, `info-row`, `lc-deal-list`, `lc-deal-item`, `lc-deal-main`, `lc-deal-actions`, `lc-pill`, `lc-inline-select`, `lc-qual-grid`, `lc-field`). One CSS rule is added. No new icon and no new colour value.
12. Not part of this plan: an order column, filter or export in the customer list; anything in the chat screen, the dashboard, the follow-up centre or the conversation cards.
13. The operation log of the follow-up centre (`跟进与操作日志`) will list the new entries under its existing type `资料更新`. That is accepted; its code is out of scope.
14. In the requirement records, `P-DEALS` stays `本轮不展示` and `P-ORDERS` stays `待定`. The version string stays `0.8-scrm-engagement`.

## Current state

### What this repository is

A zero-dependency, offline, clickable **prototype** of an internal WhatsApp customer workbench: plain HTML/CSS/JS, no framework, no package.json. All data is fictional demo data kept in the browser's `localStorage`. UI text is **Simplified Chinese**; write UI and documentation text exactly as given in this plan.

### How the build works

`work/wa-replica/build-fidelity.cjs` reads a frozen baseline app (`work/wa-replica/fidelity-base/app.js`), applies string substitutions with a `swap(from, to)` helper (**never change a first argument**), and concatenates the module files into the body of one IIFE. It writes `outputs/wa-replica-prototype/*` and two identical standalone bundles, `outputs/whatsapp-scrm-lifecycle.html` and `outputs/whatsapp-replica-ui-fidelity.html`. The CSS file `fidelity-lifecycle.css` is appended after the baseline CSS. **Outputs are committed and must be regenerated by running the build, never edited by hand.**

Icons: the build takes icon definitions from the existing `outputs/wa-replica-prototype/icons.js`, so only icons already in that file can be used. Restore that file from git before every build (command below). This plan uses only icons that are already in it (`Clock3`, `Send`, `CircleCheck`, `TriangleAlert`, `MessageCircle`, `ClipboardList`, `SquarePen`, `Plus`, `Trash2`), and the build output `icons.js` must come out unchanged.

### The module you edit: `work/wa-replica/fidelity-lifecycle.js`

All excerpts below are from this file. It is an IIFE body fragment, so top-level code is indented two spaces. A line consisting of `…` inside an excerpt stands for lines left out.

**(a) The end of the demo seed** inside `function lcSeed() {`:

```js
      data.activities.c12 = [
        { category: 'followup', text: '结束跟进 · 客户季度预算冻结，下一轮预算开放后再联系', by: '林予', time: '12天前', createdAt: fidDay(-12) },
      ];

      data.lcSeededV06 = true;
    }

    // Ensure every customer has an engagement state and safe defaults
    for (const c of data.customers) {
```

**(b) The start of the profile drawer**:

```js
  // ============================================================================
  // Customer 360° dossier drawer
  // ============================================================================
  profileHTML = function(c) {
    const a = account(c.account);
    const m = member(c.owner);
    const h = lcHealth(c);
    const tab = ['overview', 'timeline', 'notes'].includes(lcState.dossierTab) ? lcState.dossierTab : 'overview';
    const dirtyNote = Object.hasOwn(ui.noteDrafts, c.id);

    let tabBody = '';
    if (tab === 'overview') {
```

**(c) The first tab contains this form** — it is the exemplar for a form placed inside the drawer (a `<form>` with an id, a submit button in the block head, fields in `lc-qual-grid`):

```js
        <form id="lc-qual-form" class="lc-card-block">
          <input type="hidden" name="customerId" value="${esc(c.id)}">
          <div class="lc-block-head">
            <h3>${icon('Compass')}结构化客户需求画像（Qualification）</h3>
            <button type="submit" class="fid-btn slim blue">${icon('Check')}保存画像</button>
          </div>
          <div class="lc-qual-grid">
            <label class="lc-field"><span>意向等级</span><select class="fid-select" name="intentLevel">${LC_INTENT_LEVELS.map(x => option(x, x, c.intentLevel)).join('')}</select></label>
            <label class="lc-field"><span>预计规模 / 预算区间</span><input class="fid-input" name="volume" value="${esc(c.qualification?.volume || '')}" placeholder="如 $1,500 - $2,500 / 批"></label>
```

**(d) The timeline tab and the notes tab**:

```js
    } else if (tab === 'timeline') {
      const raw = data.activities[c.id] || [];
      const catLabels = { all: '全部轨迹', followup: '跟进动作', inbound: '客户来信', profile: '资料与标签' };
```

…and the timeline branch ends, and the notes branch begins, like this:

```js
            : '<p class="muted" style="padding:18px 0;text-align:center">该分类下暂无操作轨迹</p>'}
        </div>`;
    } else {
      tabBody = `
        <div class="lc-card-block customer-profile" style="border:1px solid var(--fid-frame)">
          <div class="lc-block-head"><h3>${icon('StickyNote')}客户沟通备忘与交接摘要</h3></div>
```

**(e) The tab buttons**, further down in the same function:

```js
        ${[
          ['overview', '画像与跟进', ''],
          ['timeline', '互动轨迹', (data.activities[c.id] || []).length],
          ['notes', '沟通备注', ''],
        ].map(([id, label, count]) =>
```

**(f) Helpers that already exist** (use them; do not redefine):

- `customer(id)` → customer object. `myCustomers()` → the customers the current viewer may see.
- `lcLog(customerId, category, text)` → adds an entry to the customer's interaction timeline (`data.activities[customerId]`, newest first).
- `lcRefreshOpenDossier(customerId)` → re-renders the open drawer of that customer in place.
- `persist()` saves to `localStorage`; `render()` re-renders the page behind the drawer.
- `toast(message, undo)` → shows a message; when `undo` is a function, the toast shows a `撤销` button that calls it.
- `error(message)` → shows a validation message of the form inside the open dialog. It needs an element with the id `form-error` inside that form.
- `option(value, label, selected)` → one `<option>` (selected when `value === selected`). `esc(text)` → HTML-escaped text. `icon('Name')` → icon markup. `fidActionID(id)` → the attribute text `data-id="…"`.
- `fidDate(iso)` → `YYYY-MM-DD HH:MM` in local time (`—` when empty). `inputDate(iso)` → the value for an `<input type="datetime-local">`. `fidDay(offset)` → the ISO time `offset` days from now (fractions allowed). `nextId(prefix)` → a new unique id.
- A click on any element with `data-action="NAME"` calls `fidActions.NAME(element.dataset.id, element)`.
- Submitting a `<form id="NAME">` calls `fidForms['NAME'](formData, v)`, where `v(name)` returns the trimmed text of a field.

**(g) The actions block** `Object.assign(fidActions, {` contains these neighbours:

```js
    lcTimelineFilter: (id, btn) => {
      lcState.timelineFilter = id;
      lcRefreshOpenDossier(btn?.dataset?.customer || ui.customer);
    },
    lcFollowTab: id => { lcState.followTab = id; ui.pages.followups = 0; render(); },
```

**(h) The form handlers block** `Object.assign(fidForms, {` starts with the handler of the form in excerpt (c), followed by the next handler:

```js
    'lc-qual-form': (f, v) => {
      const c = customer(v('customerId'));
      if (!c) return;
      …
      toast('客户需求画像已保存并写入轨迹。');
    },

    'lc-followup-form': (f, v) => {
```

**(i) The end of the file** — the `change` listener that saves the tier and status drop-downs:

```js
  // Field toggles of the completion dialog, and the tier / status drop-downs
  document.addEventListener('change', e => {
    const t = e.target;
    …
        c.customerStatus = next;
        lcLog(c.id, 'profile', `客户状态：${before} → ${lcCustomerStatusLabel(c)}`);
        toast(`已将 ${c.name} 的客户状态设为「${lcCustomerStatusLabel(c)}」。`);
      }
      persist();
      render();
      lcRefreshOpenDossier(c.id);
    }
  });
```

### Styles: `work/wa-replica/fidelity-lifecycle.css`

Multi-line rules, one declaration per line, two-space indentation. The classes this plan reuses already exist there: `.lc-deal-list` (a column with gaps), `.lc-deal-item` (a bordered row that wraps), `.lc-deal-main strong` / `.lc-deal-main small`, `.lc-deal-actions`, `.lc-pill` with the tone classes `warn`, `info`, `ok`, `hot`, and `.lc-inline-select`. Timeline entries are styled per category by single-line rules such as:

```css
.lc-timeline-item.cat-followup { border-left-color: var(--fid-amber); }
```

### Other files

- `work/wa-replica/build-fidelity.cjs` contains the lines `requirement.updatedOn = '2026-11-17';`, the block that pushes the review item with `id: 'AI_HOOKS'`, the line that begins `customersModule.features.push('客户等级（S/A/B/C/D）'`, and the line `requirement.modelOutline.entities.push('AiUsage');` followed by one long line that begins `requirement.modelOutline.relationships.push('所有 AI 调用经由统一接入点`.
- `work/wa-replica/validate-scrm-lifecycle.cjs` ends its checks with `// 12. The follow-up labels …` and then `const summary = {`; the summary object contains `  externalNetworkCalls: false,`. `moduleSource` is the text of `fidelity-lifecycle.js`; `customersRecord` is the `P-CUSTOMERS` requirement record; `read`, `path`, `req` and `assert` are defined earlier in that file. Section 4 of the validator forbids a list of identifiers of removed features, among them `lcCustomerOrders`, `lcOrderOpen`, `lcOrderStep`, `openOrderModal`. **Use exactly the names given in this plan.**

### Repo conventions to match

- Two-space indentation, template literals for HTML, semicolons, single quotes.
- Commit messages: conventional commits, e.g. `feat(scrm): open the follow-up centre on the customer's row from the chat strip`.

## Commands you will need

Run from the repository root (inside your worktree). `node` v18 or newer works.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 9663767 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Browser smoke | `bash /tmp/wa-scrm-plan-010/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |
| Syntax of a module file | `node -e "new (require('vm').Script)('(()=>{'+require('fs').readFileSync(process.argv[1],'utf8')+'})')" work/wa-replica/fidelity-lifecycle.js && echo SYNTAX_OK` | `SYNTAX_OK` |

There is no test suite, linter or typechecker. The build fails on a syntax error but not on a call to an undefined function; the smoke test catches those for code that runs on page load.

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-lifecycle.js` (Steps 2–7)
- `work/wa-replica/fidelity-lifecycle.css` (Step 8)
- `work/wa-replica/build-fidelity.cjs` (requirement records — Step 9)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 10)
- `README.md`, `PRODUCT.md`, `DESIGN.md`, `replica/build-log.md`, `outputs/wa-replica-prototype/README.md` (Step 11)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{index.html,app.js,app.css,tokens.css,components.css,demo-data.js,icons.js,element-review.js,lucide-license.txt,requirements-data.js,requirements.json,validation.json}`, `outputs/whatsapp-scrm-lifecycle.html`, `outputs/whatsapp-replica-ui-fidelity.html`

**Out of scope** (do NOT touch):

- `work/wa-replica/fidelity-base/**`, `fidelity-ui.js`, `fidelity-customer-pages.js`, `fidelity-ai.js`, `fidelity-dashboard.js`, `fidelity-openwa.js`, `fidelity-operations.js`, `fidelity-subsite.js`, `fidelity.css`, `fidelity-dashboard.css`, `fidelity-index.html`.
- The other three tabs of the drawer, the drawer head and its four figures, the chat screen, the customer list and its export, the dashboard, the follow-up centre.
- The customer status, tier, tags, to-dos and follow-up state: no code of this plan changes them.
- `data.orders` (see decision 5).
- The version string, the localStorage key, file names, navigation.
- `plans/**`, `outputs/review-prompts/**`, historical records.
- New dependencies, icons, colour values or files.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/010-order-tracking-tab` first.
- One or two commits are fine. Conventional commit message, e.g. `feat(scrm): add an order tracking tab to the customer profile`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

### Step 1: Create the browser smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-010/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-010 && cat > /tmp/wa-scrm-plan-010/smoke.sh <<'EOF'
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
need inbox 'data-action="openConversation"'
need customers 'Olivia Bennett'
need followups 'lc-todo-table'
need chat-records '归档会话'
need ai '能力清单'
inbundle '<form id="lc-order-form"'
inbundle 'data-lc-order-shipping='
inbundle 'lcOrderRemove: (id, btn) =>'
inbundle "['orders', '订单追踪', lcOrders(c).length]"
inbundle '.lc-timeline-item.cat-order'
echo "artifacts: $OUT"
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-010/smoke.sh && ls -l /tmp/wa-scrm-plan-010/smoke.sh
```

(The drawer is closed on a fresh page, so the new tab is not on screen; the five `inbundle` lines check that the new code and style are in the built file, and the `view=` lines check that the seed and every page still run without errors. The tab itself is checked by the reviewer in a scripted browser session.)

**Verify**: `git checkout 9663767 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs >/dev/null && bash /tmp/wa-scrm-plan-010/smoke.sh; git status --porcelain` → every `view=` line shows `js_errors=0`; the only failing checks are the five `MISS bundle should contain: ...` lines, so the run ends with `SMOKE FAIL` (expected at this point); `git status --porcelain` prints **nothing**. If `js_errors` is non-zero, another check fails, or `git status` shows changes, STOP.

### Step 2: Sample orders in the demo seed (`work/wa-replica/fidelity-lifecycle.js`)

In `lcSeed` (excerpt (a)), insert the following block between the blank line that follows the closing `    }` of the `if (!data.lcSeededV06) {` block and the comment `    // Ensure every customer has an engagement state and safe defaults`. Leave one blank line after the new block.

```js
    // Sample orders (seeded once) for the demo customers whose story already mentions an order. The
    // first-contact time of c3 and c6 is moved back so that it precedes their orders.
    if (!data.lcSeededOrders) {
      const samples = {
        c3: { createdAt: fidDay(-58.2), orders: [
          { id: 'ord-c3-1', number: 'ORD-202609-031', placedAt: fidDay(-55.3), shipping: 'delivered' },
          { id: 'ord-c3-2', number: 'ORD-202610-077', placedAt: fidDay(-27.1), shipping: 'delivered' },
        ] },
        c6: { createdAt: fidDay(-47.4), orders: [
          { id: 'ord-c6-1', number: 'ORD-202610-012', placedAt: fidDay(-44.2), shipping: 'delivered' },
        ] },
        c11: { orders: [
          { id: 'ord-c11-1', number: 'ORD-202611-104', placedAt: fidDay(-3.1), shipping: 'shipped' },
        ] },
      };
      for (const [cid, sample] of Object.entries(samples)) {
        const target = customer(cid);
        if (target && !Array.isArray(target.orders)) Object.assign(target, sample);
      }
      data.lcSeededOrders = true;
    }
```

**Verify**: syntax command → `SYNTAX_OK`; `grep -c "lcSeededOrders" work/wa-replica/fidelity-lifecycle.js` → `2`.

### Step 3: Shipping statuses and the order helper

Insert the following block directly above the line `  profileHTML = function(c) {` (excerpt (b)), below the three-line comment banner. Leave one blank line between the new block and `  profileHTML = function(c) {`.

```js
  // Order tracking (the 订单追踪 tab). Orders are typed in by hand — no shop or courier system is
  // connected — and live on the customer as c.orders: { id, number, placedAt, shipping }.
  // The top-level orders list that saved data of the removed deals centre may still hold has another
  // shape and is never read or written here.
  // Shipping status: [id, label, pill tone, icon].
  const LC_SHIPPING = [['pending', '待发货', 'warn', 'Clock3'], ['shipped', '已发货', 'info', 'Send'], ['delivered', '已签收', 'ok', 'CircleCheck'], ['problem', '异常（退回/丢件）', 'hot', 'TriangleAlert']];
  const lcShipping = id => LC_SHIPPING.find(s => s[0] === id) || LC_SHIPPING[0];
  // The customer's orders, newest first (a copy; write through c.orders).
  const lcOrders = c => (Array.isArray(c?.orders) ? c.orders : []).slice().sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
```

**Verify**: syntax command → `SYNTAX_OK`; `grep -c "const LC_SHIPPING = \|const lcShipping = \|const lcOrders = " work/wa-replica/fidelity-lifecycle.js` → `3`.

### Step 4: The tab (`profileHTML`)

4a. Replace the line that begins `    const tab = ['overview', 'timeline', 'notes'].includes(lcState.dossierTab)` (excerpt (b)) with:

```js
    const tab = ['overview', 'timeline', 'orders', 'notes'].includes(lcState.dossierTab) ? lcState.dossierTab : 'overview';
```

4b. Replace the `const catLabels = …` line of the timeline tab (excerpt (d)) with:

```js
      const catLabels = { all: '全部轨迹', followup: '跟进动作', inbound: '客户来信', order: '订单记录', profile: '资料与标签' };
```

4c. Between the end of the timeline branch and the notes branch (second excerpt of (d)), replace the single line `    } else {` — the one directly followed by ``      tabBody = ` `` and `<div class="lc-card-block customer-profile" style="border:1px solid var(--fid-frame)">` — with the following block. The block ends with that same `    } else {` line, so the notes branch stays as it is.

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
      tabBody = `
        <div class="lc-card-block">
          <div class="lc-block-head"><h3>${icon('MessageCircle')}首次联系</h3></div>
          <div class="info-row"><span>首次联系时间</span><span><strong>${esc(fidDate(c.createdAt))}</strong></span></div>
          <div class="info-row"><span>进线渠道</span><span>${esc(c.source || '—')}</span></div>
        </div>
        <div class="lc-card-block">
          <div class="lc-block-head"><h3>${icon('ClipboardList')}订单与物流（${orders.length}）</h3></div>
          ${orderItems ? `<div class="lc-deal-list">${orderItems}</div>` : '<p class="muted" style="font-size:12px">暂无订单。客户下单后，在下方登记订单号、下单时间与物流状态。</p>'}
        </div>
        <form id="lc-order-form" class="lc-card-block">
          <input type="hidden" name="customerId" value="${esc(c.id)}">
          <div class="lc-block-head">
            <h3>${icon('SquarePen')}登记订单</h3>
            <button type="submit" class="fid-btn slim blue">${icon('Plus')}添加订单</button>
          </div>
          <div class="lc-qual-grid">
            <label class="lc-field"><span>订单号</span><input class="fid-input" name="number" required maxlength="40" placeholder="如 ORD-202611-105"></label>
            <label class="lc-field"><span>下单时间</span><input class="fid-input" type="datetime-local" name="placedAt" required value="${inputDate(new Date().toISOString())}"></label>
            <label class="lc-field full"><span>物流状态</span><select class="fid-select" name="shipping">${LC_SHIPPING.map(([id, text]) => option(id, text, 'pending')).join('')}</select></label>
          </div>
          <div id="form-error" class="form-error" role="alert"></div>
        </form>`;
    } else {
```

4d. In the tab buttons (excerpt (e)), add one line directly after the line that begins `          ['timeline', '互动轨迹',`:

```js
          ['orders', '订单追踪', lcOrders(c).length],
```

**Verify**: syntax command → `SYNTAX_OK`; `grep -c "tab === 'orders'" work/wa-replica/fidelity-lifecycle.js` → `1`; `grep -c "'订单追踪'" work/wa-replica/fidelity-lifecycle.js` → `1`; `grep -c 'id="form-error"' work/wa-replica/fidelity-lifecycle.js` → `1`.

### Step 5: Removing an order (`Object.assign(fidActions, {` block)

Directly above the line that begins `    lcFollowTab: id =>` (excerpt (g)), add:

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
```

**Verify**: syntax command → `SYNTAX_OK`; `grep -c "lcOrderRemove: (id, btn) =>" work/wa-replica/fidelity-lifecycle.js` → `1`.

### Step 6: Adding an order (`Object.assign(fidForms, {` block)

Directly above the line `    'lc-followup-form': (f, v) => {` (excerpt (h)), add the following handler and one blank line after it:

```js
    'lc-order-form': (f, v) => {
      const c = customer(v('customerId'));
      if (!c || !myCustomers().includes(c)) return;
      const number = v('number');
      const placed = new Date(v('placedAt'));
      if (!number) return error('请填写订单号。');
      if (Number.isNaN(placed.getTime())) return error('请填写有效的下单时间。');
      if (placed.getTime() > Date.now()) return error('下单时间不能晚于当前时间。');
      if (lcOrders(c).some(o => o.number === number)) return error(`该客户已登记订单号 ${number}。`);
      const shipping = lcShipping(v('shipping'));
      c.orders = [{ id: nextId('ord'), number, placedAt: placed.toISOString(), shipping: shipping[0] }, ...lcOrders(c)];
      lcLog(c.id, 'order', `登记订单 ${number}（下单时间 ${fidDate(placed.toISOString())}，物流状态：${shipping[1]}）`);
      persist();
      render();
      lcRefreshOpenDossier(c.id);
      toast(`订单 ${number} 已登记。`);
    },
```

**Verify**: syntax command → `SYNTAX_OK`; `grep -c "'lc-order-form': (f, v) =>" work/wa-replica/fidelity-lifecycle.js` → `1`.

### Step 7: Changing a shipping status (the `change` listener at the end of the file)

7a. Replace the comment line `  // Field toggles of the completion dialog, and the tier / status drop-downs` (excerpt (i)) with:

```js
  // Field toggles of the completion dialog, the tier / status drop-downs, and the shipping-status drop-downs of the orders tab
```

7b. The file ends with the lines `      lcRefreshOpenDossier(c.id);`, `    }`, `  });`. Insert the following block between that `    }` and the final `  });`:

```js
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
```

**Verify**: syntax command → `SYNTAX_OK`; `grep -c "lcOrderShipping" work/wa-replica/fidelity-lifecycle.js` → `2`; `grep -c "data\.orders" work/wa-replica/fidelity-lifecycle.js` → `0`; `git diff 9663767 --stat -- work/wa-replica/fidelity-lifecycle.js | tail -1` → `1 file changed, 121 insertions(+), 3 deletions(-)`.

### Step 8: Style (`work/wa-replica/fidelity-lifecycle.css`)

Append to the end of the file:

```css

/* Order entries in the interaction timeline of the customer profile (plan 010) */
.lc-timeline-item.cat-order {
  border-left-color: var(--fid-mint);
}
```

**Verify**: `grep -c "cat-order" work/wa-replica/fidelity-lifecycle.css` → `1`. Then `git checkout 9663767 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs >/dev/null && bash /tmp/wa-scrm-plan-010/smoke.sh` → every `view=` line has `js_errors=0` and the run ends with `SMOKE PASS`; `git diff 9663767 -- outputs/wa-replica-prototype/icons.js | wc -l` → `0`.

### Step 9: Requirement records (`work/wa-replica/build-fidelity.cjs`)

9a. Replace the line `requirement.updatedOn = '2026-11-17';` with:

```js
requirement.updatedOn = '2026-11-18';
```

9b. Directly after the block that pushes the review item with `id: 'AI_HOOKS'` (the block ends with a line `});`), add:

```js
requirement.review.items.push({
  id: 'ORDER_TRACKING',
  title: '订单追踪',
  question: '客户档案新增「订单追踪」栏：显示客户首次联系时间，以及每笔订单的下单时间与物流状态（待发货 / 已发货 / 已签收 / 异常）。订单由聊手手动登记与更新，未对接店铺或物流系统。请评审：物流状态选项是否齐全，订单还需要记录哪些信息，日后是否对接业务系统。',
  status: '待评审',
  notes: '',
});
```

9c. Directly after the line that begins `customersModule.features.push('客户等级（S/A/B/C/D）'`, add this one line:

```js
customersModule.features.push('订单追踪（首次联系时间、订单下单时间与物流状态，手动登记）');
```

9d. Directly after the long line that begins `requirement.modelOutline.relationships.push('所有 AI 调用经由统一接入点`, add:

```js
requirement.modelOutline.entities.push('Order');
requirement.modelOutline.relationships.push('客户档案的订单追踪：订单（Order）归属一位客户，记录订单号、下单时间与物流状态（待发货 / 已发货 / 已签收 / 异常），由聊手手动登记与更新，每次变更写入互动轨迹；未对接店铺、支付或物流系统。客户首次联系时间取客户建档时间。登记订单不改变客户状态、等级、标签或跟进状态。');
```

**Verify**: `git checkout 9663767 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0; `grep -c '"ORDER_TRACKING"' outputs/wa-replica-prototype/requirements.json` → `1`; `grep -c '订单追踪（首次联系时间、订单下单时间与物流状态，手动登记）' outputs/wa-replica-prototype/requirements.json` → `1`; `grep -c '"updatedOn": "2026-11-18"' outputs/wa-replica-prototype/requirements.json` → `1`.

### Step 10: Validator (`work/wa-replica/validate-scrm-lifecycle.cjs`)

10a. Directly before the line `const summary = {`, add:

```js
// 13. Order tracking is a tab of the customer profile: first contact, orders typed in by hand, four shipping statuses
for (const required of ["const LC_SHIPPING = [['pending', '待发货'", "['shipped', '已发货'", "['delivered', '已签收'", "['problem', '异常（退回/丢件）'", "['orders', '订单追踪', lcOrders(c).length]", '<form id="lc-order-form"', "'lc-order-form': (f, v) =>", 'data-lc-order-shipping=', 'if (t.dataset.lcOrderShipping) {', 'lcOrderRemove: (id, btn) =>', '首次联系时间', "order: '订单记录'", 'data.lcSeededOrders = true;']) {
  assert(moduleSource.includes(required), `fidelity-lifecycle.js is missing ${required}`);
}
assert(!moduleSource.includes('data.orders'), 'orders live on the customer (c.orders); data.orders belongs to saved data of the removed deals centre');
assert(read(path.join(__dirname, 'fidelity-lifecycle.css')).includes('.lc-timeline-item.cat-order {'), 'order entries in the interaction timeline need their style');
assert(customersRecord.features.some(f => f.startsWith('订单追踪')), 'P-CUSTOMERS must record order tracking');
assert(req.review.items.some(i => i.id === 'ORDER_TRACKING'));
assert.equal(req.modules.find(m => m.id === 'P-ORDERS')?.decision, '待定', 'connecting a business system stays undecided');

```

10b. In the `summary` object add, directly above `  externalNetworkCalls: false,`:

```js
  orderTracking: 'profile tab: first contact, orders entered by hand, shipping status pending / shipped / delivered / problem',
```

**Verify**: `node work/wa-replica/validate-scrm-lifecycle.cjs` → exit 0 with `"status": "passed"` and `"orderTracking"` in the output.

### Step 11: Documentation, final rebuild and verification

11a. `README.md` — two edits.

- Directly after the line beginning `- **等级与状态**`, add this line:

```
- **订单追踪**：客户档案的「订单追踪」栏显示客户首次联系时间，以及每笔订单的下单时间与物流状态（待发货 / 已发货 / 已签收 / 异常）；订单由聊手手动登记与更新，未对接店铺或物流系统。
```

- In the line beginning ``| `Drawer` |``, replace `` `画像与跟进 / 互动轨迹 / 沟通备注` 三栏 `` with `` `画像与跟进 / 互动轨迹 / 订单追踪 / 沟通备注` 四栏 `` (nothing else on that line).

11b. `PRODUCT.md` — two edits.

- Directly after the line beginning `9. **AI 能力接入**`, add this line:

```
10. **订单追踪**：客户档案的「订单追踪」栏显示客户首次联系时间，并列出该客户的每笔订单——订单号、下单时间与物流状态（待发货 / 已发货 / 已签收 / 异常）。订单由聊手手动登记，物流状态手动更新，登记有误可删除；每次变更写入互动轨迹。未对接店铺、支付或物流系统；登记订单不改变客户状态、等级或标签。
```

- Replace the line `- 报价单、订单履约、LTV 与复购提醒（成交与复购中心）。` with:

```
- 报价单、LTV 与复购提醒，以及成交与复购中心页面（客户档案内的订单追踪已于 2026-11-18 单独加入，见上文第 10 条）。
```

11c. `DESIGN.md` — in the line beginning `4. **客户 360° 档案抽屉`, replace `下设「画像与跟进」「互动轨迹」「沟通备注」三栏。` with `下设「画像与跟进」「互动轨迹」「订单追踪」「沟通备注」四栏。`, and append this sentence to the **end** of the same line:

```
「订单追踪」栏自上而下为三块：首次联系（首次联系时间与进线渠道）、订单与物流（每笔订单一行：订单号、物流状态标记、下单时间，右侧是「更新状态」下拉框与删除按钮，按下单时间从新到旧排列）、登记订单表单（订单号、下单时间、物流状态）。下拉框修改即保存；删除后提示条提供「撤销」。互动轨迹的筛选新增「订单记录」。
```

11d. `outputs/wa-replica-prototype/README.md` — append at the end of the file:

```markdown

## 订单追踪

- 打开任一客户的 360° 档案（客户列表的档案图标，或聊天窗协同条的「360° 档案」），切换到「订单追踪」栏：顶部是客户首次联系时间，下面是该客户的订单。
- 示例客户 Olivia Bennett、Noah Wilson、Carlos Vega 已有示例订单；其他客户为空。
- 在「登记订单」填写订单号、下单时间与物流状态，点击「添加订单」。用订单右侧的「更新状态」下拉框修改物流状态（待发货 / 已发货 / 已签收 / 异常），修改即保存；垃圾桶按钮删除订单，提示条可撤销。
- 每次登记、修改与删除都会写入「互动轨迹」，可用「订单记录」筛选。订单为手动登记，未对接店铺或物流系统。
```

11e. Append to the end of `replica/build-log.md` (do not change earlier entries):

```markdown

## 客户档案新增订单追踪 · 2026-11-18

按产品负责人要求，客户 360° 档案在「互动轨迹」与「沟通备注」之间新增「订单追踪」栏：显示客户首次联系时间与进线渠道，并列出该客户的每笔订单（订单号、下单时间、物流状态）。物流状态为待发货、已发货、已签收、异常（退回/丢件）四种。订单由聊手手动登记，物流状态用下拉框更新，登记有误可删除并可撤销；同一客户的订单号不可重复，下单时间不可晚于当前时间。每次变更写入互动轨迹，轨迹筛选新增「订单记录」。

订单只记录订单号、下单时间与物流状态，未对接店铺、支付或物流系统；登记订单不改变客户状态、等级、标签或跟进状态。订单保存在客户档案上，不使用旧版成交中心遗留的数据。示例客户 Olivia Bennett、Noah Wilson、Carlos Vega 写入示例订单（浏览器中已保存的演示数据同样补入一次），其中前两位的首次联系时间相应前移。成交与复购中心仍为暂缓。
```

11f. Final run:

```bash
git checkout 9663767 -- outputs/wa-replica-prototype/icons.js
node work/wa-replica/build-fidelity.cjs
node work/wa-replica/validate-scrm-lifecycle.cjs
bash /tmp/wa-scrm-plan-010/smoke.sh
git status --porcelain
```

**Verify**: build exit 0 with `"version": "0.8-scrm-engagement"`; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `git status --porcelain` lists only in-scope paths. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

This repo's verification pattern is the static validator plus browser checks; follow it.

- **Validator** — the new section 13 (Step 10).
- **Browser smoke** (`/tmp/wa-scrm-plan-010/smoke.sh`) — every view renders without JavaScript errors with the new seed in place; the built bundle contains the form, the status drop-down, the remove action, the tab and the timeline style.
- **Verified by the reviewer in a scripted browser session, not by you**: the drawer shows four tabs in the planned order with the order count on the new tab; the three demo customers show their sample orders and a first-contact time earlier than the first order; a customer without orders shows the empty text; adding an order (also with a back-dated time) lists it in the right position and writes a timeline entry; an empty number, a duplicate number and a future time are refused; changing a status updates the label, is saved across a reload and writes a timeline entry; removing and undoing; the timeline filter `订单记录`; the customer status, tier, tags and to-dos stay as they were; saved data of an older build (with a `data.orders` list and without `lcSeededOrders`) loads, receives the sample orders once and leaves `data.orders` untouched; narrow-screen layout.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 9663767 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `bash /tmp/wa-scrm-plan-010/smoke.sh` ends with `SMOKE PASS`
- [ ] `grep -c "tab === 'orders'" work/wa-replica/fidelity-lifecycle.js` → `1`
- [ ] `grep -c "lcOrderShipping" work/wa-replica/fidelity-lifecycle.js` → `2`
- [ ] `grep -c "lcSeededOrders" work/wa-replica/fidelity-lifecycle.js` → `2`
- [ ] `grep -c "data\.orders" work/wa-replica/fidelity-lifecycle.js` → `0`
- [ ] `git diff 9663767 --stat -- work/wa-replica/fidelity-lifecycle.js | tail -1` → `1 file changed, 121 insertions(+), 3 deletions(-)`
- [ ] `grep -c "cat-order" work/wa-replica/fidelity-lifecycle.css` → `1`
- [ ] `git diff 9663767 -- outputs/wa-replica-prototype/icons.js | wc -l` → `0` (no icon is added, dropped or reordered by this plan)
- [ ] `cmp outputs/whatsapp-scrm-lifecycle.html outputs/whatsapp-replica-ui-fidelity.html` → identical (no output)
- [ ] `git diff --stat 9663767 -- work/wa-replica/fidelity-base work/wa-replica/fidelity-ui.js work/wa-replica/fidelity-customer-pages.js work/wa-replica/fidelity-ai.js work/wa-replica/fidelity-dashboard.js work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity-operations.js work/wa-replica/fidelity-subsite.js work/wa-replica/fidelity.css work/wa-replica/fidelity-dashboard.css work/wa-replica/fidelity-index.html outputs/review-prompts` → empty
- [ ] `git status --porcelain` is empty after your final commit, and `git diff --name-only 9663767..HEAD` lists only in-scope paths (plus `plans/` files changed by commits that are not yours)
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (JavaScript errors at the planned commit, a failing check other than the five named ones, or the build is not reproducible there).
- Any excerpt in "Current state" does not match the file.
- `grep -c "lcOrders\|lcShipping\|LC_SHIPPING\|lcSeededOrders" work/wa-replica/fidelity-lifecycle.js` is not `0` before your edits (a name of this plan is already taken).
- The validator fails in its section 4 or 5 after your edits (a forbidden identifier or term) — you used a name or wording that is not in this plan.
- A `swap(...)` in the build script throws `Missing prototype source anchor` after your edit — you changed a first argument; revert that edit.
- `icons.js` differs from the planned commit after the build.
- The smoke test still reports `js_errors` after two fix attempts for the same error.
- The work appears to require editing an out-of-scope file.
- You believe a decision under "Decisions already made" is wrong. Report it; do not act on it.

## Maintenance notes

- An order is `{ id, number, placedAt, shipping }` on `customer.orders`; `shipping` is one of the ids in `LC_SHIPPING`. Read through `lcOrders(c)` (a sorted copy) and write by assigning `c.orders`. A customer without the property simply has no orders; nothing normalises it.
- `data.orders` in saved data belongs to the removed deals centre (v0.6 / v0.7) and has another shape. It is left alone on purpose; the validator rejects any use of it in this module.
- Adding a status means adding one entry to `LC_SHIPPING` (id, label, pill tone, icon already present in `icons.js`) and updating the documentation and the review item text.
- If orders are later fed by a shop or courier system, the feed should write the same four fields; the tab and the timeline entries need no change.
- The inline form relies on `error()`, which looks up the first form inside the open dialog and the element `#form-error`; keep that element inside the form, and keep the form the only one on this tab.
- The sample orders are seeded once per saved data set (`data.lcSeededOrders`); a demo reset seeds them again.
- What a reviewer should scrutinise: no code path touches `customerStatus`, `tier`, `tags`, `data.tasks` or `engagement`; the three other tabs render as before; the names used are exactly those of this plan (validator section 4); `icons.js` is byte-identical.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
