# Plan 017: The translation settings are removed from the chat screen

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat dfc5fa0..HEAD -- work/wa-replica README.md PRODUCT.md DESIGN.md replica/build-log.md outputs/wa-replica-prototype/README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/016-pinned-order-form.md (DONE)
- **Category**: direction
- **Planned at**: commit `dfc5fa0`, 2026-11-20

## Why this matters

The WhatsApp chat screen offers a translation settings dialog, `翻译与发送偏好`. It is opened from three places: an icon in the tool rail at the right of the chat, the same icon in the top bar, and an entry of the "more tools" menu that replaces the tool rail on a narrow screen. The dialog holds one switch — show the prepared sample translation below incoming messages — and two paragraphs of notes for prototype reviewers. The product owner marked the tool-rail icon on a screenshot with the dialog open on 2026-11-20 and said:

> "Let's remove this translation section for now. We are preparing to integrate an AI module, and the focus is shifting toward implementing the actual content rather than just working with prototypes."

After this plan the dialog and its three entry points are gone.

### Decisions already made (do not re-open; do not ask)

1. Removed: the tool-rail icon `翻译设置`, the top-bar icon `翻译设置`, the entry `翻译设置` of the narrow-screen tools menu, the action `translation`, and the dialog `翻译与发送偏好` with its function `openTranslation`.
2. **Not** removed by this plan — the owner will be asked separately: the sample translations shown below incoming messages, the translation preview and the language hint under the message box, the two translation capabilities and their switches on the `AI 能力` page, and the translation switch of the chat-history page (`聊天记录`), which has its own heading `翻译设置` and is a different control.
3. The dialog's switch was the only way to show or hide translations below incoming messages, and its state is saved in the browser. So that a browser in which it was switched off is not left without translations and without a way to get them back, the display is now always on: a translation a message carries is shown. Whether new incoming messages get a translation is still decided by the switch `接收消息翻译` on the `AI 能力` page.
4. The removed entry points also exist as text in two earlier layers of the code that are overridden at run time (the baseline tool rail and the tool rail in `fidelity-ui.js`). They are removed there too, so that no `translation` action is left anywhere in the built app.
5. The baseline's handler for the dialog's checkbox (`if(t.id==='receive-translation'){…}`) stays in the built app as unreachable code: an existing build substitution is anchored on it, and it does nothing without the checkbox.
6. The icon `Languages` stays in use (message translations, the language hint). Its position inside the generated `icons.js` may change because it is no longer the first icon of the page head; the **set** of icons must stay the same.
7. The version string stays `0.8-scrm-engagement`.

## Current state

### What this repository is

A zero-dependency, offline, clickable **prototype** of an internal WhatsApp customer workbench: plain HTML/CSS/JS, no framework, no package.json. All data is fictional demo data kept in the browser's `localStorage`. UI text is **Simplified Chinese**; write UI and documentation text exactly as given in this plan.

### How the build works

`work/wa-replica/build-fidelity.cjs` reads a frozen baseline app (`work/wa-replica/fidelity-base/app.js`, **never edited**), applies string substitutions to it with a helper, and concatenates the module files into the body of one IIFE:

```js
let js = read(base, 'app.js');
function swap(from, to) {
  assert(js.includes(from), 'Missing prototype source anchor: ' + from.slice(0, 80));
  js = js.replace(from, () => to);
}
```

`swap` replaces the first occurrence of `from` in the baseline text and fails the build when it is missing. **Never change the first argument of an existing `swap` call.** Features of the baseline are removed by swapping their text for an empty string; the script already does this for another feature, with these two lines:

```js
swap("      case 'connect':openConnect(id);break;\n      case 'simulateConnect':{const a=account(id);a.state='online';a.lastSync='刚刚';persist();close();render();toast('已模拟恢复在线；没有连接真实 WhatsApp。');break}\n", '');
js = js.replace(/^  function openConnect\(id\)\{[^\n]*\}\n/m, '');
```

The build writes `outputs/wa-replica-prototype/*` and two identical standalone bundles, `outputs/whatsapp-scrm-lifecycle.html` and `outputs/whatsapp-replica-ui-fidelity.html`. **Outputs are committed and must be regenerated by running the build, never edited by hand.**

Icons: the build takes icon definitions from the existing `outputs/wa-replica-prototype/icons.js`. Restore that file from git before every build (command below).

### The four places that open the dialog, and the dialog

**(a) `work/wa-replica/fidelity-lifecycle.js`** — the tool rail that is on screen (top-level code of this file is indented two spaces):

```js
  toolsRailHTML = function(c) {
    const t = (label, action, glyph, needs = false, extra = '') =>
      `<button type="button" class="icon-button" data-action="${action}" ${fidActionID(c?.id || '')} ${extra} aria-label="${label}" ${needs && !c ? 'disabled' : ''}>${icon(glyph)}</button>`;
    return `<aside class="tool-rail" aria-label="会话工具">
      ${t('会话筛选', 'fidChatFilters', 'Filter')}
      ${t('客户 360° 档案', 'profile', 'ContactRound', true)}
      ${t('安排客户跟进', 'followup', 'CalendarPlus', true)}
      ${t('客户标签', 'assignTags', 'Tags', true)}
      ${t('客户沟通备注', 'profileNote', 'StickyNote', true)}
      ${t('翻译设置', 'translation', 'Languages')}
      <span class="tool-separator"></span>
      ${t('刷新视图', 'refreshUI', 'RefreshCw')}
      ${t('权限说明', 'fidChatPermissions', 'ShieldCheck')}
    </aside>`;
  };
```

**(b) `work/wa-replica/fidelity-ui.js`** — an earlier tool rail that (a) overrides. It is one long line that contains, among others, this piece:

```
${t('查看客户资料','profile','ContactRound',true)}${t('翻译设置','translation','Languages')}${t('安排客户跟进','followup','ListOrdered',true)}
```

**(c) `work/wa-replica/fidelity-index.html`** — the top bar, one long line that contains this button between the bell button and the review button:

```
<button class="icon-button fid-header-lang" data-action="translation" aria-label="翻译设置"><span data-icon="Languages"></span></button>
```

**(d) The baseline `work/wa-replica/fidelity-base/app.js`** (read-only; changed through the build script) contains each of these exactly once:

- in its tool rail: `<button class="icon-button" data-action="translation" aria-label="翻译设置">'+icon('Languages')+'</button>`
- in its narrow-screen tools menu: `<button data-action="translation">'+icon('Languages')+'翻译设置</button>`
- in its action switch, a line of its own: `      case 'translation':openTranslation();break;`
- the dialog, one line: `  function openTranslation(){modal('翻译与发送偏好', … )}`

### The display switch

The baseline sets `ui.receiveTranslation` from the saved state (`saved?.receiveTranslation!==false`), and messages are rendered with `showTranslation=ui.receiveTranslation` by default. `work/wa-replica/fidelity-ai.js` (top-level code indented two spaces) starts with comments and constants and then:

```js
  const AI_USAGE_KEPT = 200;
  const AI_USAGE_SHOWN = 20;

  function aiSettings() {
```

### Other files

- `work/wa-replica/build-fidelity.cjs` contains the line `requirement.updatedOn = '2026-11-18';`, a line that begins `swap('实际接入方式待确认，本轮不会连接 WhatsApp。'`, and the line that begins `requirement.modules.find(module => module.id === 'P-ASSIST').notes = `.
- `work/wa-replica/validate-scrm-lifecycle.cjs` ends its checks with section 13 and then `const summary = {`; the summary object contains `  externalNetworkCalls: false,`. Earlier in that file are defined: `appJs` (the built `app.js`), `moduleSource` (`fidelity-lifecycle.js`), `aiSource` (`fidelity-ai.js`), `req`, `out` (the folder `outputs/wa-replica-prototype`), `read`, `path`, `assert`.

### Repo conventions to match

- Two-space indentation, template literals for HTML, semicolons, single quotes.
- Commit messages: conventional commits, e.g. `feat(scrm): pin the order form to the bottom of the profile drawer`.

## Commands you will need

Run from the repository root (inside your worktree). `node` v18 or newer works.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout dfc5fa0 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Browser smoke | `bash /tmp/wa-scrm-plan-017/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |
| Syntax of a module file | `node -e "new (require('vm').Script)('(()=>{'+require('fs').readFileSync(process.argv[1],'utf8')+'})')" work/wa-replica/fidelity-lifecycle.js && echo SYNTAX_OK` (replace the file name as needed) | `SYNTAX_OK` |
| Icon set unchanged | `node -e "const vm=require('vm'),fs=require('fs'),cp=require('child_process');const keys=s=>{const w={};vm.runInNewContext(s,{window:w});return Object.keys(w.WA_ICONS).sort().join(',')};const a=keys(cp.execSync('git show dfc5fa0:outputs/wa-replica-prototype/icons.js').toString()),b=keys(fs.readFileSync('outputs/wa-replica-prototype/icons.js','utf8'));console.log(a===b?'ICON_SET_SAME':'ICON_SET_DIFFERS')"` | `ICON_SET_SAME` |

There is no test suite, linter or typechecker. The build fails on a syntax error but not on a call to an undefined function; the smoke test catches those for code that runs on page load.

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-lifecycle.js` (Step 2)
- `work/wa-replica/fidelity-ui.js` (Step 2)
- `work/wa-replica/fidelity-index.html` (Step 2)
- `work/wa-replica/build-fidelity.cjs` (Steps 3 and 5)
- `work/wa-replica/fidelity-ai.js` (Step 4)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 6)
- `PRODUCT.md`, `DESIGN.md`, `replica/build-log.md` (Step 7)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{index.html,app.js,app.css,tokens.css,components.css,demo-data.js,icons.js,element-review.js,lucide-license.txt,requirements-data.js,requirements.json,validation.json}`, `outputs/whatsapp-scrm-lifecycle.html`, `outputs/whatsapp-replica-ui-fidelity.html`

**Out of scope** (do NOT touch):

- `work/wa-replica/fidelity-base/**` (the baseline is changed only through the build script).
- `fidelity-customer-pages.js` — the chat-history page keeps its own translation switch and its heading `翻译设置`.
- The sample translations of messages, the translation preview and the language hint of the message box, the AI page and its capabilities, `aiRun`, `aiTranslateInbound`, everything else in `fidelity-ai.js` beyond the lines of Step 4.
- The existing `swap(...)` calls of the build script: add new ones, change none.
- `fidelity.css` and the other style sheets (a leftover selector `.fid-header-lang` in `fidelity.css` is harmless and stays).
- The version string, the localStorage key, file names, navigation.
- `plans/**`, `outputs/review-prompts/**`, historical records, earlier entries of `replica/build-log.md`.
- New dependencies, icons, colour values or files.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/017-remove-translation-settings` first.
- One or two commits are fine. Conventional commit message, e.g. `feat(scrm): remove the translation settings from the chat screen`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

### Step 1: Create the browser smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-017/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-017 && cat > /tmp/wa-scrm-plan-017/smoke.sh <<'EOF'
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
inbundle() { grep -qF "$1" "$HTML" && echo "ok   bundle contains: $1" || { echo "MISS bundle should contain: $1"; FAIL=1; }; }
notinbundle() { grep -qF "$1" "$HTML" && { echo "LEFT bundle should not contain: $1"; FAIL=1; } || echo "ok   bundle does not contain: $1"; }
need inbox 'data-action="openConversation"'
need inbox 'data-action="fidTasks"'
need customers 'Olivia Bennett'
need followups 'lc-todo-table'
need chat-records '归档会话'
need chat-records 'fid-record-translation'
need ai '接收消息翻译'
gone inbox 'data-action="translation"'
gone dashboard 'data-action="translation"'
inbundle 'ui.receiveTranslation = true;'
notinbundle 'data-action="translation"'
notinbundle 'openTranslation'
notinbundle '翻译与发送偏好'
notinbundle 'id="receive-translation"'
notinbundle 'fid-header-lang" data-action'
echo "artifacts: $OUT"
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-017/smoke.sh && ls -l /tmp/wa-scrm-plan-017/smoke.sh
```

**Verify**: `git checkout dfc5fa0 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs >/dev/null && bash /tmp/wa-scrm-plan-017/smoke.sh; git status --porcelain` → every `view=` line shows `js_errors=0`; the only failing checks are two `LEFT … should not contain: data-action="translation"` lines for `inbox` and `dashboard`, one `MISS bundle should contain: ui.receiveTranslation = true;` line and five `LEFT bundle should not contain: ...` lines, so the run ends with `SMOKE FAIL` (expected at this point); `git status --porcelain` prints **nothing**. If `js_errors` is non-zero, another check fails, or `git status` shows changes, STOP.

### Step 2: Remove the entry points in the module files

2a. `work/wa-replica/fidelity-lifecycle.js` — in `toolsRailHTML` (excerpt (a)), delete the whole line

```js
      ${t('翻译设置', 'translation', 'Languages')}
```

2b. `work/wa-replica/fidelity-ui.js` — in the long line of excerpt (b), delete exactly this piece (the text before and after it joins up):

```
${t('翻译设置','translation','Languages')}
```

2c. `work/wa-replica/fidelity-index.html` — in the top-bar line of excerpt (c), delete exactly this button (the bell button before it and the review button after it join up):

```
<button class="icon-button fid-header-lang" data-action="translation" aria-label="翻译设置"><span data-icon="Languages"></span></button>
```

**Verify**: syntax command for `fidelity-lifecycle.js` → `SYNTAX_OK`; syntax command for `fidelity-ui.js` → `SYNTAX_OK`; `grep -c "'translation'" work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-ui.js` → both files `:0`; `grep -c 'fid-header-lang\|data-action="translation"' work/wa-replica/fidelity-index.html` → `0`; `grep -c 'data-action="fidTasks"' work/wa-replica/fidelity-index.html` → `1`.

### Step 3: Remove the baseline's entry points, action and dialog (`work/wa-replica/build-fidelity.cjs`)

Directly above the line that begins `swap('实际接入方式待确认，本轮不会连接 WhatsApp。'`, add:

```js
// The translation settings were removed on 2026-11-20: the entries in the baseline's tool rail and
// narrow-screen tools menu, the action and its dialog. Sample translations themselves are not affected.
swap(`<button class="icon-button" data-action="translation" aria-label="翻译设置">'+icon('Languages')+'</button>`, '');
swap(`<button data-action="translation">'+icon('Languages')+'翻译设置</button>`, '');
swap("      case 'translation':openTranslation();break;\n", '');
js = js.replace(/^  function openTranslation\(\)\{[^\n]*\}\n/m, '');
assert(!js.includes('openTranslation') && !js.includes('data-action="translation"'), 'the translation settings must be gone from the baseline');
```

**Verify**: `git checkout dfc5fa0 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"`; `grep -c 'openTranslation\|data-action="translation"\|翻译与发送偏好' outputs/wa-replica-prototype/app.js` → `0`; `grep -c 'data-action="translation"\|fid-header-lang' outputs/wa-replica-prototype/index.html` → `0`.

### Step 4: Translations of incoming messages are always shown (`work/wa-replica/fidelity-ai.js`)

Directly above the line `  function aiSettings() {`, add the following four lines and one blank line after them:

```js
  // The translation settings dialog held the only switch for showing translations below incoming messages
  // and was removed on 2026-11-20. A translation a message carries is now always shown; whether new
  // messages get one is decided by the switch of the capability translate.inbound on the AI page.
  ui.receiveTranslation = true;
```

**Verify**: syntax command for `fidelity-ai.js` → `SYNTAX_OK`; `grep -c "ui.receiveTranslation = true;" work/wa-replica/fidelity-ai.js` → `1`.

### Step 5: Requirement records (`work/wa-replica/build-fidelity.cjs`)

5a. Replace the line `requirement.updatedOn = '2026-11-18';` with:

```js
requirement.updatedOn = '2026-11-20';
```

5b. Replace the whole line that begins `requirement.modules.find(module => module.id === 'P-ASSIST').notes = ` with:

```js
requirement.modules.find(module => module.id === 'P-ASSIST').notes = '翻译仍为演示文案：经由 AI 接入点调用本地演示提供方，没有调用真实模型或翻译服务。聊天界面的翻译设置入口与弹窗已于 2026-11-20 移除；接收消息的译文始终显示，是否产生译文在「AI 能力」页启停。';
```

**Verify**: `git checkout dfc5fa0 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0; `grep -c '"updatedOn": "2026-11-20"' outputs/wa-replica-prototype/requirements.json` → `1`; `grep -c '翻译设置入口与弹窗已于 2026-11-20 移除' outputs/wa-replica-prototype/requirements.json` → `1`; then `bash /tmp/wa-scrm-plan-017/smoke.sh` → every `view=` line has `js_errors=0` and the run ends with `SMOKE PASS`; the icon-set command → `ICON_SET_SAME`.

### Step 6: Validator (`work/wa-replica/validate-scrm-lifecycle.cjs`)

6a. Directly before the line `const summary = {`, add:

```js
// 14. The translation settings (entry points, action, dialog) were removed from the chat screen on 2026-11-20
const indexHtml = read(path.join(out, 'index.html'));
for (const removed of ['openTranslation', 'data-action="translation"', '翻译与发送偏好', 'id="receive-translation"']) {
  assert(!appJs.includes(removed), `app.js still contains the translation settings (${removed})`);
}
assert(!indexHtml.includes('data-action="translation"') && !indexHtml.includes('fid-header-lang'), 'the top bar must not offer the translation settings');
assert(!moduleSource.includes("'translation'") && !read(path.join(__dirname, 'fidelity-ui.js')).includes("'translation'"), 'no tool rail may offer the translation settings');
assert(aiSource.includes('ui.receiveTranslation = true;'), 'translations of incoming messages must always be shown now that their display switch is gone');
assert(appJs.includes('fid-record-translation'), 'the chat-history page keeps its own translation switch');

```

6b. In the `summary` object add, directly above `  externalNetworkCalls: false,`:

```js
  translationSettings: 'removed from the chat screen (tool rail, top bar, narrow-screen menu, dialog); sample translations stay and are always shown, switched per capability on the AI page',
```

**Verify**: `node work/wa-replica/validate-scrm-lifecycle.cjs` → exit 0 with `"status": "passed"` and `"translationSettings"` in the output.

### Step 7: Documentation, final rebuild and verification

7a. `PRODUCT.md` — in the line beginning `9. **AI 能力接入**`, replace `以后新增 AI 功能或接入真实模型服务时，只需在接入点登记，不必改动各业务页面。` with:

```
以后新增 AI 功能或接入真实模型服务时，只需在接入点登记，不必改动各业务页面。聊天界面原有的「翻译设置」入口与「翻译与发送偏好」弹窗已移除（2026-11-20）：接收消息的译文始终显示，是否产生译文由「AI 能力」页的开关决定。
```

7b. `DESIGN.md` — in the line beginning ``9. **AI 能力（`#ai`）**``, replace `页面只呈现能力与用量，不含商业化内容。` with:

```
页面只呈现能力与用量，不含商业化内容。聊天界面不再有翻译设置：会话工具栏、顶栏与窄屏「更多会话工具」菜单中的「翻译设置」入口以及「翻译与发送偏好」弹窗均已移除；消息带有的译文始终显示在原文下方。聊天记录页的翻译开关是该页自己的控件，不受影响。
```

7c. Append to the end of `replica/build-log.md` (do not change earlier entries):

```markdown

## 移除聊天界面的翻译设置 · 2026-11-20

按产品负责人意见，移除聊天界面的翻译设置：会话工具栏与顶栏的「翻译设置」图标、窄屏「更多会话工具」菜单中的同名入口，以及它们打开的「翻译与发送偏好」弹窗。负责人说明：项目即将接入 AI 模块，重心从原型转向实际内容。

弹窗里的开关原是显示或隐藏接收消息译文的唯一入口，其状态保存在浏览器中；为避免曾关闭它的浏览器从此看不到译文又无处开启，译文改为始终显示，是否为新消息产生译文仍由「AI 能力」页的「接收消息翻译」开关决定。消息下方的示例译文、发送前的译文预览与语言提示、「AI 能力」页的两项翻译能力，以及聊天记录页自己的翻译开关，本次均未改动。
```

7d. Final run:

```bash
git checkout dfc5fa0 -- outputs/wa-replica-prototype/icons.js
node work/wa-replica/build-fidelity.cjs
node work/wa-replica/validate-scrm-lifecycle.cjs
bash /tmp/wa-scrm-plan-017/smoke.sh
git status --porcelain
```

**Verify**: build exit 0 with `"version": "0.8-scrm-engagement"`; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; the icon-set command → `ICON_SET_SAME`; `git status --porcelain` lists only in-scope paths. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

This repo's verification pattern is the static validator plus browser checks; follow it.

- **Validator** — the new section 14 (Step 6).
- **Browser smoke** (`/tmp/wa-scrm-plan-017/smoke.sh`) — every view renders without JavaScript errors; neither the chat page nor the dashboard contains an element with the `translation` action; the bundle no longer contains the action, the dialog or the top-bar button; the chat-history page still has its translation switch and the AI page its translation capability.
- **Verified by the reviewer in a scripted browser session, not by you**: the tool rail of an open chat has no translation icon and its other icons are in their old order; the top bar has no translation icon; the "more tools" menu on a narrow screen has no translation entry and its other entries still work; a click on an element carrying the `translation` action opens nothing; a browser whose saved state had the display switched off shows translations again; the switch `接收消息翻译` on the AI page still stops new translations; the translation preview of quick replies and the chat-history translation switch still work.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout dfc5fa0 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `bash /tmp/wa-scrm-plan-017/smoke.sh` ends with `SMOKE PASS`
- [ ] `grep -c 'openTranslation\|data-action="translation"\|翻译与发送偏好' outputs/wa-replica-prototype/app.js` → `0`
- [ ] `grep -c 'data-action="translation"\|fid-header-lang' outputs/wa-replica-prototype/index.html` → `0`
- [ ] `grep -c "'translation'" work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-ui.js` → both `:0`
- [ ] `grep -c "ui.receiveTranslation = true;" work/wa-replica/fidelity-ai.js` → `1`
- [ ] the icon-set command prints `ICON_SET_SAME`
- [ ] `cmp outputs/whatsapp-scrm-lifecycle.html outputs/whatsapp-replica-ui-fidelity.html` → identical (no output)
- [ ] `git diff --stat dfc5fa0 -- work/wa-replica/fidelity-base work/wa-replica/fidelity-customer-pages.js work/wa-replica/fidelity-dashboard.js work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity-operations.js work/wa-replica/fidelity-subsite.js work/wa-replica/fidelity.css work/wa-replica/fidelity-dashboard.css work/wa-replica/fidelity-lifecycle.css outputs/review-prompts` → empty
- [ ] `git diff dfc5fa0 -- work/wa-replica/build-fidelity.cjs | grep -c '^-swap('` → `0` (no existing substitution was changed or removed)
- [ ] `git status --porcelain` is empty after your final commit, and `git diff --name-only dfc5fa0..HEAD` lists only in-scope paths (plus `plans/` files changed by commits that are not yours)
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (JavaScript errors at the planned commit, a failing check other than the eight named ones, or the build is not reproducible there).
- Any excerpt in "Current state" does not match the file, or one of the four baseline strings of excerpt (d) does not occur exactly once in `work/wa-replica/fidelity-base/app.js`.
- The build throws `Missing prototype source anchor` — a `swap` did not find its text. If it is one of the new calls, compare it character by character with this plan; if it is an existing call, you changed something you must not change; revert it.
- The build's new `assert` fails (`the translation settings must be gone from the baseline`).
- The icon-set command prints `ICON_SET_DIFFERS`.
- The smoke test still reports `js_errors` after two fix attempts for the same error.
- The work appears to require editing an out-of-scope file.
- You believe a decision under "Decisions already made" is wrong. Report it; do not act on it.

## Maintenance notes

- What is left of translation after this plan: the sample translations stored on messages and shown below incoming ones, the preview and language hint of the message box, the two capabilities on the AI page with their switches and usage records, and the chat-history page's own switch. Removing those is a separate decision of the owner.
- `ui.receiveTranslation` is now forced to `true` when the app starts. The baseline still saves and loads the value; nothing can set it to `false` any more.
- The baseline's handler `if(t.id==='receive-translation'){…}` remains in the built app because an existing substitution is anchored on its text. It is unreachable: no element with that id is rendered.
- A real translation feature, when the AI module is integrated, should get its settings from the AI page or a new place designed for it, not by restoring this dialog: its texts were notes for prototype reviewers.
- What a reviewer should scrutinise: the other icons of the tool rail and the top bar are unchanged and in order; the narrow-screen tools menu still works; no existing `swap` call was touched; the chat-history page is untouched.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
