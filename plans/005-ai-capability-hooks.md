# Plan 005: Every AI feature goes through one integration point that can be switched per capability and records usage — translation is the first user

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 97634e5..HEAD -- work/wa-replica README.md PRODUCT.md DESIGN.md replica/build-log.md outputs/wa-replica-prototype/README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/004-chat-history-review-archive.md (DONE)
- **Category**: direction
- **Planned at**: commit `97634e5`, 2026-11-17

## Why this matters

The product owner asked on 2026-11-17:

> "Incorporate hooks for future AI API integration — to support features like translation and other AI-driven capabilities — with an eye toward future monetization. For now, however, do not include any sales-oriented messaging; the priority is to ensure a fully functional, closed-loop system."

Today translation in the prototype is not a feature with a seam: wherever an incoming message is created, the code writes a ready-made Chinese translation straight onto the message, and a quick reply gets its English/Spanish version written straight onto the draft. There is no single place where a real AI service could later be connected, nothing that can be switched on or off, and no record of how much the feature is used.

After this plan there is **one integration point** (`aiRun`). Every place that needs a translation asks it; a local demo provider answers with the prepared sample text (no network). Each capability can be switched on or off, every call leaves a neutral usage record (the basis for metering later), and a new page "AI 能力" shows the capabilities, their switches and the usage. Adding another AI feature later, or connecting a real model service, means changing the integration point only — not every page.

### Decisions already made (do not re-open; do not ask)

The owner does not review plans and has delegated open points to the advisor:

1. **No real AI service is connected in this round.** The provider is a local demo that returns the prepared sample text passed along by the caller. No network call is added (the validator forbids them).
2. **Only the two AI uses that exist today are registered**: translating an incoming customer message into Chinese (`translate.inbound`) and translating a quick reply into the customer's language (`translate.outbound`). No new AI feature is added.
3. **"With an eye toward future monetization" means metering and a switch, nothing visible about money.** One usage record per provider call, running totals per capability, and an on/off switch per capability (the place where an entitlement check would later go). No price, plan, quota, upgrade prompt or purchase wording anywhere; the validator enforces this for the AI module.
4. The integration point is **asynchronous** (returns a Promise), because real AI services are. The demo provider resolves immediately, so the prototype behaves as before.
5. The page lives under "工作台设置" in the sidebar, route `#ai`. In the real product a supervisor would manage the switches on the main site; in this prototype the current viewer can use them so the flow can be evaluated — say so on the page.
6. The existing "show translations" switch (`ui.receiveTranslation`, in the translation settings dialog) and the chat-history page stay as they are. They only show or hide translations already stored on messages; they make no AI call.
7. Text typed by hand is still sent as typed. Translating free text needs a real model and is out of scope.
8. The usage log keeps the latest 200 records in the browser; the page shows the latest 20. Totals per capability are not trimmed.
9. The version string stays `0.8-scrm-engagement`.

## Current state

### What this repository is

A zero-dependency, offline, clickable **prototype** of an internal WhatsApp customer workbench: plain HTML/CSS/JS, no framework, no package.json. All data is fictional demo data kept in the browser's `localStorage`. UI text is **Simplified Chinese**; write new UI text in Simplified Chinese using the vocabulary table below.

### How the build works

`work/wa-replica/build-fidelity.cjs` reads a frozen baseline app (`work/wa-replica/fidelity-base/app.js`), applies string substitutions with a `swap(from, to)` helper (which asserts `from` exists — **never change a first argument**), and concatenates module files into the body of one IIFE in this order: `fidelity-ui.js`, `fidelity-customer-pages.js`, `fidelity-operations.js`, `fidelity-openwa.js`, `fidelity-dashboard.js`, `fidelity-lifecycle.js`, `fidelity-subsite.js`. All files share one scope. A function declared with `function name() {}` in any of them can be called from any other at run time; a `const` can be used by code that runs after it is defined (all page rendering and all click handlers run after every file has loaded). A later file may wrap an earlier function by reassigning it — the existing convention, e.g. in `fidelity-ui.js`:

```js
  const fidOldFillQuick=fillQuick;
  fillQuick = function(id) {
    fid.waTab='chat';fid.chatOpen=true;ui.mobileChat=true;if(ui.view==='inbox')render();fidOldFillQuick(id);
  };
```

The build writes `outputs/wa-replica-prototype/*` and two identical standalone bundles, `outputs/whatsapp-scrm-lifecycle.html` and `outputs/whatsapp-replica-ui-fidelity.html`. **Outputs are committed and must be regenerated by running the build, never edited by hand.**

Icons: the build takes icon definitions from the existing `outputs/wa-replica-prototype/icons.js` and writes back only the icons still referenced. Restore that file from git before every build (command below). **Use only the icons this plan's code uses (`Languages`, `Sparkles`); do not introduce others.**

### Where translations are produced today (the call sites this plan changes)

**1. `work/wa-replica/fidelity-lifecycle.js`, function `lcSimulateCustomerReply(customerId)`** — the "模拟对方回复" button. `pair` is `[original text, prepared Chinese translation]`:

```js
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    (data.messages[c.id] ??= []).push({ id: nextId('m'), side: 'in', text: pair[0], translated: pair[1], time });
    c.preview = pair[0];
    c.translation = pair[1];
    c.last = '刚刚';
```

**2. `work/wa-replica/fidelity-lifecycle.js`, form handler `'lc-sim-lead-form'`** — "simulate a new lead". `msg` is the original text, `tr` the prepared translation. Two lines matter:

```js
        unread: 1, star: false, last: '刚刚', preview: msg, translation: tr,
```

```js
      data.messages[id] = [{ id: nextId('m'), side: 'in', text: msg, translated: tr, time: '刚刚' }];
```

(The customer object built in that handler is the local constant `c`; `data.customers.unshift(c);` comes directly before the `data.messages[id] = ...` line.)

**3. `work/wa-replica/fidelity-openwa.js`, function `openwaAddSampleChat(a)`** — the sample conversation created after pairing a number. This file uses a compact style (no space after `:`):

```js
      last:time, preview:text, translation:translated, followup:null, notes:'',
```

```js
    data.messages[id] = [{id:nextId('m'), side:'in', text, translated, time}];
```

(The new customer is added with `data.customers.unshift({...})` just above, so it is `data.customers[0]` at that point.)

**4. Quick replies (frozen baseline, do not edit)** — `fillQuick(id)` in `fidelity-base/app.js` writes the prepared translation onto the draft:

```js
  function fillQuick(id){const q=data.quickReplies.find(q=>q.id===id),c=selectedCustomer();if(!q||!c)return;ui.drafts[c.id]={text:q.zh,translated:c.language==='西班牙语'?q.es:q.en,source:q.zh};persist();if($('#dialog').open)close();if(ui.view!=='inbox')navigate('inbox');else{const box=$('.chat-pane');box.outerHTML=chatHTML(c);paintIcons();scrollMessages()}$('#composer-text')?.focus()}
```

`fidelity-ui.js` already wraps it (excerpt above). This plan adds one more wrapper in the new file; it does not touch the baseline or `fidelity-ui.js`.

The draft's translation is shown in `<div id="translation-preview">` (rendered by `previewHTML(c)`) and in `<span class="language-hint">`, whose content the baseline builds as `icon('Languages')+esc(c.language)+' · '+(d.translated?'示例译文':'发送原文')`. When a message is sent, the baseline sends `draft.translated` if the text is still the quick reply, otherwise the typed text.

How a translation is displayed: `messagesHTML(c)` renders `message.translated` under an incoming message when `ui.receiveTranslation` is on. The open conversation's message list is `<div class="messages" id="messages" data-customer="<customer id>">`.

### Navigation and routing

- `build-fidelity.cjs` line 43 — the `swap` whose **second** argument defines the routes; it ends with `...,team:'组织架构',members:'账号管理',scope:'功能范围'};` followed by a `defaultView` line.
- `build-fidelity.cjs` line 60:

```js
swap('team:renderTeam,scope:renderScope', "team:renderTeam,members:renderMembers,'chat-records':renderChatRecords,'tag-stats':renderTagStats,materials:renderMaterials,scope:renderScope");
```

- `build-fidelity.cjs` lines 98–104 — module files are read and joined:

```js
const lifecyclePages = read(__dirname, 'fidelity-lifecycle.js');
const subsiteSession = read(__dirname, 'fidelity-subsite.js');
swap('  render();\n})();', [read(__dirname, 'fidelity-ui.js'), customerPages, operationsPages, openwaPages, dashboardPage, lifecyclePages, subsiteSession].join('\n') + '\n  render();\n  window.initWAElementReview(toast);\n})();');
```

- `fidelity-lifecycle.js`, section "Navigation & Sidebar Integration": the `viewIcon` map ends with `scope: 'SlidersHorizontal',` and the `menuHTML` function ends with

```js
      '<div class="nav-caption">工作台设置</div>' +
      renderItem('scope', views.scope)
    );
```

### Helpers available in the shared scope (use them; do not redefine)

- Data: `data`, `ui` (`ui.persona` is the current member id, `ui.view` the current route, `ui.drafts[customerId]` the composer draft `{text, translated, source}`), `customer(id)`, `member(id)`, `manager()`, `selectedCustomer()`, `draft(c)`, `nextId(prefix)`.
- Rendering: `esc(text)`, `icon(name)`, `messagesHTML(c)`, `previewHTML(c)`, `paintIcons(element)`, `scrollMessages()`, `$(selector)`, `fidDate(iso)` (`YYYY-MM-DD HH:mm`).
- `fidelity-ui.js`: `fidHead(title, description)`, `fidTable(cssClass, columnTitles, rowsHTML, emptyLabel)` (renders a table; shows `emptyLabel` when `rowsHTML` is empty).
- Flow: `persist()` (saves `data` and drafts to `localStorage`), `render()`, `toast(message)`.
- Global CSS: `lc-pill ok|warn|info` (small coloured pills), `fid-page`, `fid-panel`, `fid-field-help`.

### Repo conventions to match

- Two-space indentation (module files are IIFE body fragments, so top-level code is indented two spaces), template literals for HTML, semicolons, single quotes. `fidelity-openwa.js` uses a compact style — match the file you are in.
- Exemplar for a module file with a page, actions and listeners: `work/wa-replica/fidelity-customer-pages.js`.
- `fidelity.css`: one rule per line.
- Commit messages: conventional commits, e.g. `feat(scrm): turn chat history into a review archive of conversation snapshots`.

### Vocabulary (use exactly these terms)

| Concept | Chinese term |
|---|---|
| the page / nav entry | AI 能力 |
| capability list | 能力清单 |
| translate incoming messages | 接收消息翻译 |
| translate before sending | 发送前翻译 |
| current provider | 当前接入 |
| local demo provider | 本地演示 |
| enabled / disabled | 已启用 / 已停用 |
| number of calls | 调用次数 |
| input / output characters | 输入字符 / 输出字符 |
| recent calls | 最近调用 |
| usage | 用量 |

### Data model after this plan

`data.ai` — created on first use:

```js
{
  provider: 'demo',
  enabled: { 'translate.inbound': true, 'translate.outbound': true },
  totals:  { 'translate.inbound': { calls, inputChars, outputChars }, 'translate.outbound': { ... } },
  usage:   [ { id, at, capability, provider, by, customerId, inputChars, outputChars, ok }, ... ]   // newest first, at most 200
}
```

## Commands you will need

Run from the repository root (inside your worktree). `node` v18 or newer works.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 97634e5 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Browser smoke | `bash /tmp/wa-scrm-plan-005/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |
| Syntax of a module file | `node -e "new (require('vm').Script)('(()=>{'+require('fs').readFileSync(process.argv[1],'utf8')+'})')" work/wa-replica/fidelity-ai.js && echo SYNTAX_OK` | `SYNTAX_OK` |

There is no test suite, linter or typechecker. The build fails on a syntax error but not on a call to an undefined function; the smoke test catches those for code that runs on page load.

## Scope

**In scope** (the only files you may modify or create):

- `work/wa-replica/fidelity-ai.js` (**new file**)
- `work/wa-replica/fidelity-lifecycle.js` (two navigation lines and the two inbound call sites — Steps 4 and 5)
- `work/wa-replica/fidelity-openwa.js` (one inbound call site — Step 5)
- `work/wa-replica/fidelity.css` (new rules for the page — Step 6)
- `work/wa-replica/build-fidelity.cjs` (module registration, route, requirement records — Steps 3 and 7)
- `work/wa-replica/validate-scrm-lifecycle.cjs`
- `README.md`, `PRODUCT.md`, `DESIGN.md`, `replica/build-log.md`, `outputs/wa-replica-prototype/README.md`
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{index.html,app.js,app.css,tokens.css,components.css,demo-data.js,icons.js,element-review.js,lucide-license.txt,requirements-data.js,requirements.json,validation.json}`, `outputs/whatsapp-scrm-lifecycle.html`, `outputs/whatsapp-replica-ui-fidelity.html`

**Out of scope** (do NOT touch):

- `work/wa-replica/fidelity-base/**` (frozen baseline), `fidelity-ui.js`, `fidelity-customer-pages.js`, `fidelity-dashboard.js`, `fidelity-operations.js`, `fidelity-subsite.js`, `fidelity-dashboard.css`, `fidelity-lifecycle.css`, `fidelity-index.html`.
- The demo seed data (messages that already carry a `translated` text), the translation settings dialog, the "show translations" switch, the chat-history page.
- Any network call, API key field, provider choice, price, plan, quota, upgrade or purchase wording.
- New AI features (reply suggestions, summaries, and so on). Only the two translation uses are registered.
- The version string, the localStorage key, file names of existing files.
- `plans/**`, `outputs/review-prompts/**`, historical records.
- New dependencies, new icons, new colour values.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/005-ai-capability-hooks` first.
- Commit per logical unit (suggested: module, call sites, route and CSS after Step 6; records, validator, docs and rebuilt outputs after Step 9). Conventional commit messages, e.g. `feat(scrm): route translation through one AI integration point with usage records`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

### Step 1: Create the browser smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-005/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-005 && cat > /tmp/wa-scrm-plan-005/smoke.sh <<'EOF'
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
gone() { grep -q "$2" "$OUT/$1.txt" && { echo "LEFT $1 should not contain: $2"; FAIL=1; } || echo "ok   $1 does not contain: $2"; }
need ai '能力清单'
need ai '接收消息翻译'
need ai '发送前翻译'
need ai '最近调用'
need ai '本地演示'
need ai 'data-ai-capability="translate.inbound"'
need ai 'data-ai-capability="translate.outbound"'
need dashboard 'data-nav="ai"'
gone ai '套餐'
gone ai '付费'
gone ai '升级'
need inbox '中文译文'
need chat-records '归档会话'
need scope 'AI 能力接入'
echo "artifacts: $OUT"
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-005/smoke.sh && ls -l /tmp/wa-scrm-plan-005/smoke.sh
```

**Verify**: `git checkout 97634e5 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs >/dev/null && bash /tmp/wa-scrm-plan-005/smoke.sh; git status --porcelain` → every `view=` line shows `js_errors=0` (the `ai` view falls back to the dashboard for now); the run ends with `SMOKE FAIL` (expected — the page does not exist yet); `git status --porcelain` prints **nothing**. If `js_errors` is non-zero or `git status` shows changes, STOP.

### Step 2: Create `work/wa-replica/fidelity-ai.js`

Create the file with exactly this content (top-level code is indented two spaces, like the other module files):

```js
  // AI capabilities: the single integration point for every AI feature (translation today).
  // To add a capability: 1) list it in AI_CAPABILITIES; 2) call aiRun(id, input, meta) where the result is
  // needed and apply the result in .then(); 3) teach the provider to answer it.
  // Every provider call leaves one usage record in data.ai.usage and adds to the totals of its capability.
  const AI_CAPABILITIES = [
    { id: 'translate.inbound', name: '接收消息翻译', description: '把客户发来的消息译为中文，显示在原文下方。' },
    { id: 'translate.outbound', name: '发送前翻译', description: '把快捷回复译为客户的语言，发送前可预览。' },
  ];
  // A provider answers run(capabilityId, input) with { text }, or with a Promise of it.
  // The demo provider returns the prepared sample that the caller passes along. A real provider would ignore
  // input.sample and ask a model service through the product's own server, so that keys never reach the browser.
  const AI_PROVIDERS = {
    demo: { name: '本地演示', run: (capabilityId, input) => ({ text: input.sample || '' }) },
  };
  const AI_USAGE_KEPT = 200;
  const AI_USAGE_SHOWN = 20;

  function aiSettings() {
    const settings = (data.ai ??= { provider: 'demo', enabled: {}, totals: {}, usage: [] });
    for (const { id } of AI_CAPABILITIES) {
      settings.enabled[id] ??= true;
      settings.totals[id] ??= { calls: 0, inputChars: 0, outputChars: 0 };
    }
    return settings;
  }

  // One neutral record per provider call, plus running totals per capability.
  function aiRecordUsage(capabilityId, providerId, input, result, meta) {
    const settings = aiSettings();
    const inputChars = String(input.text || '').length;
    const outputChars = result.text.length;
    settings.usage.unshift({
      id: nextId('ai'), at: new Date().toISOString(), capability: capabilityId, provider: providerId,
      by: ui.persona, customerId: meta.customerId || '', inputChars, outputChars, ok: result.ok,
    });
    settings.usage.length = Math.min(settings.usage.length, AI_USAGE_KEPT);
    const total = settings.totals[capabilityId];
    total.calls += 1;
    total.inputChars += inputChars;
    total.outputChars += outputChars;
    persist();
  }

  // The single entry point for every AI call. Resolves to { ok, text }; it never rejects.
  // A capability that is switched off is not sent to the provider and leaves no usage record.
  function aiRun(capabilityId, input, meta = {}) {
    const settings = aiSettings();
    if (!settings.enabled[capabilityId]) return Promise.resolve({ ok: false, text: '', skipped: true });
    const providerId = Object.hasOwn(AI_PROVIDERS, settings.provider) ? settings.provider : 'demo';
    return Promise.resolve()
      .then(() => AI_PROVIDERS[providerId].run(capabilityId, input))
      .then(output => String(output?.text || ''), () => '')
      .then(text => {
        const result = { ok: Boolean(text), text };
        aiRecordUsage(capabilityId, providerId, input, result, meta);
        return result;
      });
  }

  // Translate one incoming message into Chinese. The translation is stored on the message when it arrives,
  // and the open conversation is refreshed if it is the one on screen.
  function aiTranslateInbound(c, message, sample) {
    return aiRun('translate.inbound', { text: message.text, from: c.language, to: '中文', sample }, { customerId: c.id }).then(result => {
      if (!result.ok) return;
      message.translated = result.text;
      if (c.preview === message.text) c.translation = result.text;
      persist();
      const box = $('#messages');
      if (ui.view !== 'inbox' || !box || box.dataset.customer !== c.id) return;
      const atBottom = box.scrollHeight - box.clientHeight - box.scrollTop <= 40;
      box.innerHTML = messagesHTML(c);
      paintIcons(box);
      if (atBottom) scrollMessages();
    });
  }

  // Redraw the translation preview above the composer and the language hint beside it.
  function aiRefreshDraftPreview(c) {
    const preview = $('#translation-preview');
    if (ui.view !== 'inbox' || !preview || $('#messages')?.dataset.customer !== c.id) return;
    preview.innerHTML = previewHTML(c);
    paintIcons(preview);
    const hint = $('.language-hint');
    if (!hint) return;
    hint.innerHTML = icon('Languages') + esc(c.language) + ' · ' + (draft(c).translated ? '示例译文' : '发送原文');
    paintIcons(hint);
  }

  // Quick replies: the earlier layers fill the draft together with its prepared sample translation.
  // Take the sample off the draft and ask the integration point for the translation instead,
  // so that translating before sending can be switched off and is recorded like every other AI call.
  const aiOldFillQuick = fillQuick;
  fillQuick = function(id) {
    const q = data.quickReplies.find(item => item.id === id), c = selectedCustomer();
    aiOldFillQuick(id);
    const filled = c && ui.drafts[c.id];
    if (!q || !filled || filled.source !== q.zh) return;
    const sample = filled.translated;
    filled.translated = '';
    persist();
    aiRefreshDraftPreview(c);
    aiRun('translate.outbound', { text: q.zh, from: '中文', to: c.language, sample }, { customerId: c.id }).then(result => {
      const current = ui.drafts[c.id];
      if (!result.ok || !current || current.source !== q.zh || current.text !== q.zh) return;
      current.translated = result.text;
      persist();
      aiRefreshDraftPreview(c);
    });
  };

  function renderAiPage() {
    const settings = aiSettings();
    const capabilityName = id => AI_CAPABILITIES.find(item => item.id === id)?.name || id;
    const capabilityRows = AI_CAPABILITIES.map(({ id, name, description }) => {
      const total = settings.totals[id], on = settings.enabled[id];
      return `<tr>
        <td><strong>${esc(name)}</strong><small>${esc(id)}</small></td>
        <td>${esc(description)}</td>
        <td><label class="fid-ai-switch"><input type="checkbox" role="switch" id="fid-ai-${esc(id.replace('.', '-'))}" data-ai-capability="${esc(id)}" ${on ? 'checked' : ''} aria-label="${esc(name)}">${on ? '已启用' : '已停用'}</label></td>
        <td>${total.calls}</td><td>${total.inputChars}</td><td>${total.outputChars}</td>
      </tr>`;
    }).join('');
    const usageRows = settings.usage.filter(entry => manager() || entry.by === ui.persona).slice(0, AI_USAGE_SHOWN).map(entry => `<tr>
        <td>${esc(fidDate(entry.at))}</td><td>${esc(capabilityName(entry.capability))}</td>
        <td>${esc(customer(entry.customerId)?.name || '—')}</td><td>${esc(member(entry.by)?.name || '—')}</td>
        <td>${entry.inputChars}</td><td>${entry.outputChars}</td>
        <td><span class="lc-pill ${entry.ok ? 'ok' : 'warn'}">${entry.ok ? '成功' : '无结果'}</span></td>
      </tr>`).join('');
    return `<section class="fid-page"><div class="fid-panel fid-ai">
      ${fidHead('AI 能力', '翻译等 AI 功能都经由同一个接入点调用，每次调用记录一条用量。当前为本地演示，不连接任何外部服务。')}
      <div class="fid-ai-provider"><strong>当前接入</strong><span class="lc-pill info">${esc((AI_PROVIDERS[settings.provider] || AI_PROVIDERS.demo).name)}</span><span>返回预置的示例结果。正式接入时由服务端调用模型服务，密钥不进入浏览器。</span></div>
      <h2>能力清单</h2>
      ${fidTable('fid-ai-capabilities', ['能力', '说明', '状态', '调用次数', '输入字符', '输出字符'], capabilityRows)}
      <p class="fid-field-help">停用后该能力不再被调用，也不产生用量记录。正式版由主管在主站管理；原型开放操作以便评审。</p>
      <h2>最近调用</h2>
      ${fidTable('fid-ai-usage', ['时间', '能力', '客户', '操作人', '输入字符', '输出字符', '结果'], usageRows, '暂无调用记录。在 WhatsApp API 中模拟对方回复或选择快捷回复后，这里会出现记录。')}
      <p class="fid-field-help">显示最近 ${AI_USAGE_SHOWN} 次调用，本机最多保留 ${AI_USAGE_KEPT} 条；累计数见上表。</p>
    </div></section>`;
  }

  document.addEventListener('change', event => {
    const id = event.target.dataset?.aiCapability;
    const capability = AI_CAPABILITIES.find(item => item.id === id);
    if (!capability) return;
    const on = event.target.checked;
    aiSettings().enabled[id] = on;
    persist();
    render();
    toast(`${capability.name}已${on ? '启用' : '停用'}。`);
  });
```

**Verify**: syntax command for `work/wa-replica/fidelity-ai.js` → `SYNTAX_OK`; `grep -c "套餐\|升级\|付费\|购买\|订阅\|充值\|额度\|计费\|价格\|定价\|试用\|会员\|解锁\|专业版\|高级版\|优惠\|限时" work/wa-replica/fidelity-ai.js` → `0`.

### Step 3: Register the module and the route (`work/wa-replica/build-fidelity.cjs`)

Never change a `swap` first argument.

1. Directly after the line `const lifecyclePages = read(__dirname, 'fidelity-lifecycle.js');` add:

```js
const aiPages = read(__dirname, 'fidelity-ai.js');
```

2. In the `swap('  render();\n})();', [...]` line below it, change the array so that `aiPages` comes between `lifecyclePages` and `subsiteSession`: `..., dashboardPage, lifecyclePages, aiPages, subsiteSession].join('\n') + ...`. Change nothing else on that line.
3. Line 43 (the routes): in the **second** argument, change `members:'账号管理',scope:'功能范围'};` to `members:'账号管理',ai:'AI 能力',scope:'功能范围'};`.
4. Line 60: in the **second** argument, change `materials:renderMaterials,scope:renderScope` to `materials:renderMaterials,ai:renderAiPage,scope:renderScope`.

**Verify**: `grep -c "aiPages" work/wa-replica/build-fidelity.cjs` → `2`; `grep -c "ai:'AI 能力'" work/wa-replica/build-fidelity.cjs` → `1`; `grep -c "ai:renderAiPage" work/wa-replica/build-fidelity.cjs` → `1`. Then `git checkout 97634e5 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0.

### Step 4: Sidebar entry (`work/wa-replica/fidelity-lifecycle.js`)

1. In the `viewIcon` map, directly **before** the line `scope: 'SlidersHorizontal',` add:

```js
    ai: 'Sparkles',
```

2. In `menuHTML`, directly **before** the line `renderItem('scope', views.scope)` add:

```js
      renderItem('ai', views.ai) +
```

**Verify**: `grep -c "ai: 'Sparkles'" work/wa-replica/fidelity-lifecycle.js` → `1`; `grep -c "renderItem('ai', views.ai)" work/wa-replica/fidelity-lifecycle.js` → `1`.

### Step 5: Route the three incoming-message paths through the integration point

5a. `fidelity-lifecycle.js`, `lcSimulateCustomerReply` — replace

```js
    (data.messages[c.id] ??= []).push({ id: nextId('m'), side: 'in', text: pair[0], translated: pair[1], time });
    c.preview = pair[0];
    c.translation = pair[1];
```

with

```js
    const message = { id: nextId('m'), side: 'in', text: pair[0], time };
    (data.messages[c.id] ??= []).push(message);
    aiTranslateInbound(c, message, pair[1]);
    c.preview = pair[0];
    c.translation = '';
```

5b. `fidelity-lifecycle.js`, handler `'lc-sim-lead-form'` — in the customer object, change `preview: msg, translation: tr,` to `preview: msg, translation: '',` (nothing else on that line), and replace

```js
      data.messages[id] = [{ id: nextId('m'), side: 'in', text: msg, translated: tr, time: '刚刚' }];
```

with

```js
      data.messages[id] = [{ id: nextId('m'), side: 'in', text: msg, time: '刚刚' }];
      aiTranslateInbound(c, data.messages[id][0], tr);
```

5c. `fidelity-openwa.js`, `openwaAddSampleChat` — change `preview:text, translation:translated, followup:null,` to `preview:text, translation:'', followup:null,` (nothing else on that line), and replace

```js
    data.messages[id] = [{id:nextId('m'), side:'in', text, translated, time}];
```

with

```js
    data.messages[id] = [{id:nextId('m'), side:'in', text, time}];
    aiTranslateInbound(data.customers[0], data.messages[id][0], translated);
```

(The `const translated = '...'` line above stays: it is now the sample handed to the integration point. Likewise `pair[1]` and `tr`.)

**Verify**: `grep -c "aiTranslateInbound(" work/wa-replica/fidelity-lifecycle.js` → `2`; `grep -c "aiTranslateInbound(" work/wa-replica/fidelity-openwa.js` → `1`; `grep -c "translated: pair\[1\]\|translated: tr,\|translation: tr,\|translation: pair\[1\]" work/wa-replica/fidelity-lifecycle.js` → `0`; `grep -c "translation:translated\|text, translated, time" work/wa-replica/fidelity-openwa.js` → `0`; `git diff 97634e5 --stat -- work/wa-replica/fidelity-lifecycle.js | tail -1` → `1 file changed, 9 insertions(+), 4 deletions(-)`; `git diff 97634e5 --stat -- work/wa-replica/fidelity-openwa.js | tail -1` → `1 file changed, 3 insertions(+), 2 deletions(-)`.

### Step 6: Styles (`work/wa-replica/fidelity.css`)

Directly after the line that starts with `.fid-archive-actions {`, add these rules (one rule per line, like the rest of the file):

```css
.fid-ai .fid-heading { margin-bottom:12px; }
.fid-ai h2 { margin:18px 0 8px; font-size:15px; font-weight:700; line-height:22px; }
.fid-ai-provider { display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; padding:10px 12px; border:1px solid var(--fid-frame); border-radius:8px; background:var(--color-surface-alt); font-size:13px; line-height:20px; }
.fid-ai-capabilities,.fid-ai-usage { min-width:640px; }
.fid-ai-capabilities col:nth-child(1) { width:22%; }
.fid-ai-capabilities col:nth-child(3) { width:112px; }
.fid-ai-capabilities col:nth-child(4),.fid-ai-capabilities col:nth-child(5),.fid-ai-capabilities col:nth-child(6) { width:11%; }
.fid-ai-capabilities td small { display:block; color:var(--fid-quiet); font-size:12px; }
.fid-ai-switch { display:inline-flex; align-items:center; gap:6px; }
.fid-ai-switch input { accent-color:var(--fid-violet); }
```

**Verify**: `grep -c "fid-ai" work/wa-replica/fidelity.css` → `10`. Then `git checkout 97634e5 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs >/dev/null && bash /tmp/wa-scrm-plan-005/smoke.sh` → every `view=` line has `js_errors=0`; every check is `ok` except that `MISS scope should contain: AI 能力接入` is allowed now (fixed in Step 7). Commit the new module, the two edited module files, the build-script change and the CSS (do not commit build outputs yet if you prefer; they are rebuilt in Step 9).

### Step 7: Requirement records (`work/wa-replica/build-fidelity.cjs`)

1. In the long `swap("'P-AUTO':'关键词自动回复、…'", "…")` line (the scope descriptions), append to the **end of the second argument's text**, directly after `'P-CHAT-REVIEW':'把 WhatsApp 会话的快照移入聊天记录，用于绩效复盘与质检。'`:
   `,'P-AI':'翻译等 AI 功能经由统一接入点调用，可逐项启停并逐次记录用量。'`
2. Directly after the `requirement.review.items.push({ id: 'CHAT_REVIEW', ... });` statement add:

```js
requirement.review.items.push({
  id: 'AI_HOOKS',
  title: 'AI 能力接入',
  question: 'AI 功能（目前为接收消息翻译与发送前翻译）统一经由一个接入点调用，可逐项启停，并逐次记录用量。请评审：还需要接入哪些 AI 能力、由谁管理启停、用量按什么口径统计。',
  status: '待评审',
  notes: '',
});
```

3. Directly after the `requirement.modelOutline.relationships.push('聊天记录是质检归档：…');` statement (the last one before `const requirementJS = ...`) add:

```js
requirement.modules.push({
  id:'P-AI', name:'AI 能力接入', decision:'首轮原型', basis:'用户要求为后续接入 AI 接口预留接入点（2026-11-17）',
  originalIds:[], screens:['ai','inbox'], features:['统一 AI 接入点','能力清单与逐项启停','逐次用量记录与按能力累计','接收消息翻译与发送前翻译经接入点调用','本地演示提供方'],
  notes:'当前不连接外部服务；用量记录仅作计量留存，本轮不含商业化内容。',
});
requirement.modules.find(module => module.id === 'P-ASSIST').notes = '翻译仍为演示文案：经由 AI 接入点调用本地演示提供方，没有调用真实模型或翻译服务。';
requirement.modelOutline.entities.push('AiUsage');
requirement.modelOutline.relationships.push('所有 AI 调用经由统一接入点：按能力登记，可逐项启停；每次调用留存一条用量记录（AiUsage：时间、能力、提供方、操作人、客户、输入与输出字符数、是否成功），并按能力累计。当前提供方为本地演示，不连接外部服务。');
```

**Verify**: `git checkout 97634e5 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0; `bash /tmp/wa-scrm-plan-005/smoke.sh` → `SMOKE PASS`.

### Step 8: Validator (`work/wa-replica/validate-scrm-lifecycle.cjs`)

1. The validator has two `for (const file of [...])` loops that scan module files line by line for removed wording (section 5, the list starting `['fidelity-lifecycle.js', 'fidelity-dashboard.js', 'fidelity-ui.js', ...`) and for invitation codes (section 7, the same list plus three CSS files). In **both** lists add `'fidelity-ai.js'` directly after `'fidelity-lifecycle.js'`.
2. Directly before the line `const summary = {`, add:

```js
// 10. AI features go through one integration point that records usage; the AI module carries no commercial wording
const aiSource = read(path.join(__dirname, 'fidelity-ai.js'));
const openwaSource = read(path.join(__dirname, 'fidelity-openwa.js'));
for (const required of ['function aiRun(capabilityId, input, meta = {})', 'function aiRecordUsage(', "id: 'translate.inbound'", "id: 'translate.outbound'", 'function aiTranslateInbound(c, message, sample)', 'function renderAiPage()', 'data-ai-capability=']) {
  assert(aiSource.includes(required), `fidelity-ai.js is missing ${required}`);
}
assert(!/套餐|升级|付费|购买|订阅|充值|额度|计费|价格|定价|试用|会员|解锁|专业版|高级版|优惠|限时/.test(aiSource), 'the AI module must not contain pricing or sales wording');
assert.equal((moduleSource.match(/aiTranslateInbound\(/g) || []).length, 2, 'both incoming-message paths in fidelity-lifecycle.js must translate through the integration point');
assert(openwaSource.includes('aiTranslateInbound('), 'the OpenWA sample chat must translate through the integration point');
for (const direct of ['translated: pair[1]', 'translated: tr,', 'translation: tr,']) {
  assert(!moduleSource.includes(direct), `fidelity-lifecycle.js still writes a translation directly (${direct})`);
}
assert(!openwaSource.includes('text, translated, time'), 'fidelity-openwa.js still writes a translation directly');
assert(appJs.includes("ai:'AI 能力'") && appJs.includes('ai:renderAiPage'), 'the AI page must be routed');
assert(req.modules.some(m => m.id === 'P-AI' && m.screens.includes('ai')));
assert(req.review.items.some(i => i.id === 'AI_HOOKS'));

```

3. In the `summary` object add, directly above `externalNetworkCalls: false,`:

```js
  aiCapabilities: ['translate.inbound', 'translate.outbound'],
  aiProvider: 'local demo (prepared sample results)',
```

(`read`, `path`, `moduleSource`, `appJs`, `req` and `assert` are already defined earlier in that file.)

**Verify**: `node work/wa-replica/validate-scrm-lifecycle.cjs` → exit 0 with `"status": "passed"` and `"aiCapabilities"` in the output.

### Step 9: Documentation, final rebuild and verification

9a. `PRODUCT.md` — in the numbered list under `## 业务主线：客户跟进闭环（v0.8-scrm-engagement）`, add after item 8:

```markdown
9. **AI 能力接入**：翻译等 AI 功能都经由同一个接入点调用。目前登记两项能力——接收消息翻译、发送前翻译（快捷回复），可在「AI 能力」页逐项启停；每次调用记录一条用量（时间、能力、客户、操作人、输入与输出字符数），并按能力累计。当前由本地演示提供方返回预置的示例译文，不连接任何外部服务。以后新增 AI 功能或接入真实模型服务时，只需在接入点登记，不必改动各业务页面。
```

9b. `README.md` — in section 2's module table, add this row directly after the `#materials` row:

```markdown
| `#ai` | **AI 能力** | AI 功能的统一接入点：能力清单与逐项启停（接收消息翻译、发送前翻译）、按能力累计的调用次数与字符数、最近调用记录；当前为本地演示，不连接外部服务 |
```

In section 3's directory tree, add this line directly after the line for `fidelity-openwa.js` (align the `#` with the lines above it):

```
│       ├── fidelity-ai.js                             # AI 能力接入点：能力清单、演示提供方、用量记录与「AI 能力」页
```

9c. `DESIGN.md` — in the numbered list under `## 跟进闭环交互架构`, add a new item 9:

```markdown
9. **AI 能力（`#ai`）**：位于侧栏「工作台设置」。页面自上而下为当前接入说明、能力清单表（能力、说明、启停开关、调用次数、输入与输出字符）和最近调用表。停用某项能力后，对应功能不再调用也不计用量：停用接收消息翻译后，新消息不再附中文译文；停用发送前翻译后，快捷回复按原文发送。页面只呈现能力与用量，不含商业化内容。
```

9d. `outputs/wa-replica-prototype/README.md` — append at the end of the file:

```markdown

## AI 能力

- 在「AI 能力（`#ai`）」查看能力清单与用量。在「WhatsApp API」中点击「模拟对方回复」或选择一条快捷回复后，回到该页可看到新增的调用记录。
- 关闭某项能力的开关后再试一次：新消息不再附中文译文，或快捷回复不再生成译文预览，也不会新增调用记录。
```

9e. Append to the end of `replica/build-log.md`:

```markdown

## AI 能力接入点 · 2026-11-17

按产品负责人要求，为后续接入 AI 接口预留接入点。新增 `fidelity-ai.js`：所有 AI 调用统一经由 `aiRun`，按能力登记（接收消息翻译、发送前翻译），可逐项启停；每次调用留存一条用量记录并按能力累计，供日后计量使用。当前提供方为本地演示，返回预置的示例译文，不连接任何外部服务。

模拟对方回复、模拟新线索进线、OpenWA 示例会话与快捷回复的译文都改为经由接入点取得。侧栏「工作台设置」新增「AI 能力」页，展示能力清单、启停开关与用量。本轮不包含任何商业化内容。
```

9f. Final run:

```bash
git checkout 97634e5 -- outputs/wa-replica-prototype/icons.js
node work/wa-replica/build-fidelity.cjs
node work/wa-replica/validate-scrm-lifecycle.cjs
bash /tmp/wa-scrm-plan-005/smoke.sh
git status --porcelain
```

**Verify**: build exit 0 with `"version": "0.8-scrm-engagement"`; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `git status --porcelain` lists only in-scope paths. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

This repo's verification pattern is the static validator plus browser checks; follow it.

- **Validator** — the new section 10 and the two extended file lists (Step 8).
- **Browser smoke** (`/tmp/wa-scrm-plan-005/smoke.sh`) — every view renders without JavaScript errors; the new page shows both capabilities, their switches and the usage table; the sidebar has the new entry; the inbox still shows stored translations; the page carries no sales wording.
- **Verified by the reviewer in a scripted browser session, not by you**: a simulated reply and a simulated new lead get their translation through the integration point and leave a usage record; switching "接收消息翻译" off stops both; a quick reply gets its translation preview through the integration point, is sent translated, and is sent as typed when "发送前翻译" is off; totals and the recent-calls table update; everything survives a reload; narrow-screen layout.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 97634e5 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `bash /tmp/wa-scrm-plan-005/smoke.sh` ends with `SMOKE PASS`
- [ ] `grep -c "aiTranslateInbound(" work/wa-replica/fidelity-lifecycle.js` → `2`, and the same for `work/wa-replica/fidelity-openwa.js` → `1`
- [ ] `git diff 97634e5 --stat -- work/wa-replica/fidelity-lifecycle.js | tail -1` → `1 file changed, 9 insertions(+), 4 deletions(-)`
- [ ] `git diff 97634e5 --stat -- work/wa-replica/fidelity-openwa.js | tail -1` → `1 file changed, 3 insertions(+), 2 deletions(-)`
- [ ] `git diff 97634e5 -- outputs/wa-replica-prototype/icons.js | wc -l` → `0` (no icon was added or dropped)
- [ ] `grep -c "套餐\|升级\|付费\|购买\|订阅\|充值\|额度\|计费\|价格\|定价\|试用\|会员\|解锁\|专业版\|高级版\|优惠\|限时" work/wa-replica/fidelity-ai.js` → `0`
- [ ] `cmp outputs/whatsapp-scrm-lifecycle.html outputs/whatsapp-replica-ui-fidelity.html` → identical (no output)
- [ ] `git diff --stat 97634e5 -- work/wa-replica/fidelity-base work/wa-replica/fidelity-ui.js work/wa-replica/fidelity-customer-pages.js work/wa-replica/fidelity-dashboard.js work/wa-replica/fidelity-operations.js work/wa-replica/fidelity-subsite.js work/wa-replica/fidelity-lifecycle.css work/wa-replica/fidelity-dashboard.css work/wa-replica/fidelity-index.html outputs/review-prompts` → empty
- [ ] `git status --porcelain` is empty after your final commit, and `git diff --name-only 97634e5..HEAD` lists only in-scope paths (plus `plans/` files changed by commits that are not yours)
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (JavaScript errors at the planned commit, or the build is not reproducible there).
- Any of the code excerpts in "Current state" does not match the live code (the code has drifted), or you find another place outside the demo seed data that writes a `translated` text onto an incoming message or a draft.
- A `swap(...)` in the build script throws `Missing prototype source anchor` after your edit — you changed a first argument; revert that edit.
- The build drops or adds an icon (the icons done-criterion fails).
- The smoke test still reports `js_errors` after two fix attempts for the same error.
- The validator's new wording guard fails on text this plan told you to write. Report it; do not reword on your own.
- The work appears to require editing an out-of-scope file.
- You believe a decision under "Decisions already made" is wrong. Report it; do not act on it.

## Maintenance notes

- **Connecting a real AI service later**: add a provider to `AI_PROVIDERS` whose `run` returns a Promise from the product's own server endpoint (never call a model vendor from the browser — keys would leak), and set `data.ai.provider`. Call sites do not change. The validator's "no network requests" check on `app.js` will then need a deliberate update.
- **Adding an AI feature later** (reply suggestion, summary, and so on): one entry in `AI_CAPABILITIES`, one `aiRun(...)` call where the result is used, one branch in the provider. It then appears on the page with its own switch and totals automatically.
- **Metering**: `data.ai.totals` is the running count per capability and `data.ai.usage` the per-call log (trimmed to 200 in the browser). A real product would write both server-side. The per-capability `enabled` check in `aiRun` is where an entitlement check would go.
- The demo provider can only return the sample handed to it, so a message without a prepared translation gets no translation and its call is recorded as "无结果".
- `aiTranslateInbound` refreshes only the message list of the conversation on screen (it does not call `render()`), so that a translation arriving late cannot disturb what the agent is typing.
- What a reviewer should scrutinise: no remaining direct `translated:` writes outside the demo seeds; the draft is not left with a stale translation when "发送前翻译" is off; switching a capability off produces no usage record; the page has no commercial wording; `fidelity-ui.js` and the baseline are untouched.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
