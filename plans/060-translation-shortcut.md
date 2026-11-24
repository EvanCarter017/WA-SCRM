# Plan 060: A keyboard shortcut that translates the message box, set under a gear beside the customer's language

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 6f259db..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (one page module of the browser app, its style sheet, one icon added to the build, the validator and the build log; exact text and checksums for every file; no server change)
- **Depends on**: plans/038-customer-language-choice.md (DONE), plans/059-price-list-currency.md (DONE)
- **Category**: feature (requested by the owner)
- **Planned at**: commit `6f259db`, 2026-11-24

## Why this matters

The owner wrote on 2026-11-24: "The AI translation feature should support a keyboard shortcut for manual triggering; perhaps add a small gear-shaped icon to the right of the language selection dropdown."

Today a typed reply is translated only by the send guard (发送保护): with the guard on, the first Enter translates a text that is not in the customer's language and the second sends the translation. With the guard off there is no way to translate a typed reply at all. With this plan a key combination — **Ctrl + Enter** until it is changed — translates what is typed into the customer's language and shows the translation above the message box, whether the guard is on or off; Enter then sends the translation. A small gear to the right of the drop-down **客户语言** (customer's language), above the conversation, opens a panel where the combination is set by pressing it.

### Decisions already made (do not re-open; do not ask)

The owner chose, in answer to the advisor's questions on 2026-11-24:

- Pressing the shortcut **shows the translation above the message box** (the same preview the send guard uses); Enter then sends the translation, and what was typed stays in the box.
- The gear opens, **for now, only the setting of the shortcut**.
- The shortcut is set by **pressing the keys you want** in a field: any combination with Ctrl, Alt or ⌘, starting as Ctrl + Enter; combinations that would break typing or the browser (Enter, Shift + Enter, Ctrl + C / V, Ctrl + W …) are refused with a message.

Decided by the advisor, within that:

- A combination is Ctrl or Alt (on a Mac ⌘ counts as Ctrl), maybe Shift, and **a letter or Enter** — digits, Space and other keys are left out, because the browser, the system and input methods use them (Ctrl + 1…9 switch tabs, Ctrl + Space switches the input method, Alt + Space opens the window menu). The key is told by its place on the keyboard (`event.code`), so that Alt on a Mac, which changes the character, still gives the letter.
- Refused, with a reason each: no Ctrl or Alt; Ctrl together with Alt (AltGr on some keyboards); Ctrl (+ Shift) + A C V X Y Z (editing); Ctrl (+ Shift) + H M N Q T W (browser and system — new window, new tab, close tab, quit, hide, minimise); Ctrl + Shift + I J (developer tools); Alt + D E F (address bar and browser menu).
- The shortcut is kept in the AI settings of the workspace (`data.ai.translateKey`, e.g. `"Ctrl+Shift+K"`); a value that is missing or not allowed counts as Ctrl + Enter.
- The gear shows only while the relay (the server's model service) is in use, like the send guard's switch. Pressed for a customer without a language, the shortcut asks for one; with the capability 发送前翻译 switched off on the AI page, it says so; for a text the relay returns unchanged (already in the customer's language) it says so and shows nothing; on failure it says so. Nothing is sent by the shortcut.
- The line under the message box (`aiEnterHint`) also names the shortcut where it works, e.g. `…；Ctrl + Enter 翻译`.
- The listener for the shortcut is registered for the capture phase, so it runs before the page's own handling of Enter (which sends) and stops it; that is what lets a shortcut with Enter translate instead of sending. It does nothing while an input method is composing.
- The gear needs the icon `Settings`, which the page's icon pool does not hold: it is added to the build from **lucide-static 1.0.0**, the version all 84 icons of the pool come from (checked icon by icon), under the same ISC licence the page already ships (`lucide-license.txt`).

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server. There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity-ai.js` | `a2b7710001b0d2d202b3dcce618ea38fe0a7846020d2cf3bd550c825eb40003e` | `dd083c3b67de0d3483731b858af280fd740b331a9833460a5c4ecc11e2e976d9` | 4 |
| `work/wa-replica/fidelity.css` | `20bb0770b88149f90684610a74821780a3eec4bf94f5de577309799b8d8741ae` | `06bf20f32731f03950b89029b321a76401da47852544c17528a2716ca91843c9` | 1 |
| `work/wa-replica/build-fidelity.cjs` | `acc26dee867f0dfadce255b8159f10d3e47eda0db35b381c7b4d226dc1f2e1d8` | `4660286ff56bcf2d6d740dd55d1f55bc30ad985e957f2f56244e97c68438f22e` | 1 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `70ab25c65f00ae067e06d361c03899c2d8a0ff88bdf487f89f5abaefaf9f757d` | `789a08346ac255e6bb6fca11eee271ac0b17a9aaca79d68a589ccf075407e107` | 2 |
| `replica/build-log.md` | `4f507d4c539e02d551e15b53147c3d66cdb27a0b6bd7b1ea2b802c3da10a0bbb` | `31acc45d044b24bc78d1d3fabc8fa91195a569f50415f710c43057fd30ad489d` | 1 append |

- `fidelity-ai.js` — the AI module of the page: the integration point `aiRun`, the relay calls, the send guard (`aiGuardActive`, `aiTranslateDraft`, the override of `send`), the preview above the message box (`aiRefreshDraftPreview`), the drop-down of the customer's language (`aiLanguagePicker`, shown in the strip above a conversation) and the line under the message box (`aiEnterHint`). The module wires its own buttons through `data-ai-*` attributes and one click listener near its end. Drafts are `ui.drafts[customerId] = { text, translated, source }`; the real `send` (OpenWA module) sends `translated` when `source` equals the trimmed text of the box. The page's own keydown listener (in the base `app.js`, bubbling on `document`) sends on Enter without Shift.
- `fidelity.css` — the style sheet of the app's own screens.
- `build-fidelity.cjs` — the build; it fills `icons.js` with the icons the page names, taken from the committed pool when the lucide package is not installed.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

The module uses helpers defined by earlier parts of the same script: `fidForm(title, id, body, submit)` (a dialog with a form whose submission goes to `fidForms['<id>-form']`), `fidFormRow`, `fidButton`, `error(message)` (shows a refusal in the open form), `close`, `render`, `persist`, `toast`, `esc`, `icon`, `$`.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly four output files differ: `app.js`, `app.css`, `icons.js` (85 icons instead of 84: `Settings` added) and `validation.json` (written by the validator). The style rules use only sizes that are already in use, so `tokens.css` comes out unchanged.

## Commands you will need

Run from the repository root (inside your worktree). Plain `node` is enough for every command of this plan.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 6f259db -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and, once Step 3 is done, `"icons": 85` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Smoke | `bash /tmp/wa-scrm-plan-060/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-ai.js`, `work/wa-replica/fidelity.css` (Step 2)
- `work/wa-replica/build-fidelity.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.js`, `app.css`, `icons.js`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — the server files (`serve.cjs`, `site-*.cjs`, `openwa-link.cjs`, `ai-relay.cjs`), the other `fidelity-*.js` modules, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install the lucide package or anything else.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/060-translation-shortcut` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): translate the message box with a keyboard shortcut set under a gear`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, the sign ⌘, regular expressions with backslashes and long SVG path data; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 8 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the five files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-060/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-060 && cat > /tmp/wa-scrm-plan-060/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 060: a keyboard shortcut that translates the message box, set under a gear beside the customer's language.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
has 'the shortcut starts as Ctrl + Enter' "$W/fidelity-ai.js" "const AI_SHORTCUT_DEFAULT = 'Ctrl+Enter';"
has 'the gear is beside the customer language' "$W/fidelity-ai.js" "</select></label>\${aiShortcutGear()}\`;"
has 'the message box catches the shortcut, not while an input method composes' "$W/fidelity-ai.js" 'if (event.isComposing || event.keyCode === 229 || aiShortcutOf(event) !== aiShortcut()) return;'
has 'combinations for editing are refused' "$W/fidelity-ai.js" "'它用于编辑文字（全选、复制、粘贴、剪切、撤销、重做）'],"
has 'the shortcut is kept in the AI settings' "$W/fidelity-ai.js" 'aiSettings().translateKey = combo;'
has 'the build knows the gear icon' "$W/build-fidelity.cjs" '  Settings: [["path",{"d":"M9.671 4.136a2.34 2.34 0 0 1 4.659 0'
has 'the icon pool has the gear' "$O/icons.js" '"Settings":[["path",{"d":"M9.671 4.136'
has 'the page is built with it' "$O/app.js" 'function aiTranslateByShortcut() {'
has 'the gear has its style' "$O/app.css" '.source-strip .ai-shortcut-gear { width:var(--fid-px-28); height:var(--fid-px-28);'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  translateShortcut: 'a key combination"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 翻译快捷键：在消息框里按快捷键翻译 · 2026-11-24'
same 'of the built files only the page, its styles, its icons and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.js|app\.css|icons\.js|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-060/smoke.sh && ls -l /tmp/wa-scrm-plan-060/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-ai.js work/wa-replica/fidelity.css work/wa-replica/build-fidelity.cjs work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `bash /tmp/wa-scrm-plan-060/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the shortcut starts as Ctrl + Enter`, `the gear is beside the customer language`, `the message box catches the shortcut, not while an input method composes`, `combinations for editing are refused`, `the shortcut is kept in the AI settings`, `the build knows the gear icon`, `the icon pool has the gear`, `the page is built with it`, `the gear has its style`, `the validator knows it` and `the build log has the entry` (eleven checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The AI module: the shortcut, its panel, the gear; their styles

#### `fidelity-ai.js`

**Edit 2.1** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
  }
  // The line under the message box that explains the Enter key.
  function aiEnterHint(c) {
    return aiGuardActive(c) ? 'Enter 先翻译，再按一次发送；Shift + Enter 换行' : 'Enter 发送，Shift + Enter 换行';
  }
```

Replace them with:

```text
  }
  // The line under the message box that explains the Enter key, and the translation shortcut where it works.
  function aiEnterHint(c) {
    const keys = aiGuardActive(c) ? 'Enter 先翻译，再按一次发送；Shift + Enter 换行' : 'Enter 发送，Shift + Enter 换行';
    return aiShortcutReady(c) ? `${keys}；${esc(aiShortcutLabel(aiShortcut()))} 翻译` : keys;
  }
```

**Edit 2.2** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text

  function renderAiPage() {
```

Replace them with:

```text

  // ---- the translation shortcut (plan 060) ----
  // A key combination, set under the gear beside the customer's language. Pressed in the message box it
  // translates what was typed into the customer's language and shows the translation above the box, whether or
  // not the send guard is on; Enter then sends the translation, and what was typed stays in the box. It is kept
  // in the AI settings as e.g. "Ctrl+Enter" or "Alt+Shift+T": Ctrl or Alt (on a Mac ⌘ counts as Ctrl), maybe
  // Shift, and a letter or Enter. Combinations that typing, sending or the browser need are refused.
  const AI_SHORTCUT_DEFAULT = 'Ctrl+Enter';
  const AI_SHORTCUT_FORM = /^(Ctrl\+(Alt\+)?|Alt\+)(Shift\+)?([A-Z]|Enter)$/;
  const AI_SHORTCUT_TAKEN = [
    [/^Ctrl\+Alt\+/, '同时按 Ctrl 和 Alt 在部分键盘上用于输入字符（AltGr）'],
    [/^Ctrl\+(Shift\+)?[ACVXYZ]$/, '它用于编辑文字（全选、复制、粘贴、剪切、撤销、重做）'],
    [/^Ctrl\+(Shift\+)?[HMNQTW]$/, '它由浏览器或系统占用（新窗口、新标签页、关闭标签页、退出、隐藏或最小化窗口），网页无法使用'],
    [/^Ctrl\+Shift\+[IJ]$/, '它会打开浏览器的开发者工具'],
    [/^Alt\+[DEF]$/, '它会打开浏览器的地址栏或菜单'],
  ];
  const aiOnMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  const aiShortcutLabel = combo => combo.split('+').join(' + ');
  // Why a combination cannot be the shortcut, or '' when it can.
  function aiShortcutProblem(combo) {
    if (!AI_SHORTCUT_FORM.test(combo || '')) return '快捷键要包含 Ctrl 或 Alt（可再加 Shift），再加一个字母或 Enter；单独的 Enter 用于发送，Shift + Enter 用于换行。';
    const taken = AI_SHORTCUT_TAKEN.find(([pattern]) => pattern.test(combo));
    return taken ? `不能使用 ${aiShortcutLabel(combo)}：${taken[1]}。请换一个组合。` : '';
  }
  // The shortcut in use: the one set under the gear, read without creating the settings, or the default.
  const aiShortcut = () => (aiShortcutProblem(data.ai?.translateKey) ? AI_SHORTCUT_DEFAULT : data.ai.translateKey);
  // The combination a key press makes, e.g. "Ctrl+Shift+K"; '' while only modifier keys are down. The key is
  // told by its place on the keyboard (event.code), so that Alt on a Mac, which changes the character, still
  // gives the letter.
  function aiShortcutOf(event) {
    if (['Control', 'Alt', 'Shift', 'Meta', 'AltGraph', 'CapsLock'].includes(event.key)) return '';
    const code = event.code || '';
    const key = /^Key[A-Z]$/.test(code) ? code.slice(3) : code === 'Enter' || code === 'NumpadEnter' ? 'Enter' : code || event.key || '?';
    return `${event.ctrlKey || (aiOnMac && event.metaKey) ? 'Ctrl+' : ''}${event.altKey ? 'Alt+' : ''}${event.shiftKey ? 'Shift+' : ''}${key}`;
  }
  // Whether the shortcut can translate for this customer: the relay is in use, translating replies is switched
  // on, and the customer has a language.
  const aiShortcutReady = c => aiRuntime.provider === 'server' && data.ai?.enabled?.['translate.outbound'] !== false && Boolean(aiCustomerLanguage(c));
  // The gear beside the customer's language. Shown only while the relay is in use, like the send guard's switch.
  function aiShortcutGear() {
    if (aiRuntime.provider !== 'server') return '';
    return `<button type="button" class="icon-button ai-shortcut-gear" data-ai-shortcut aria-label="翻译快捷键设置" title="翻译快捷键：${esc(aiShortcutLabel(aiShortcut()))}">${icon('Settings')}</button>`;
  }
  // The panel under the gear: the shortcut is set by pressing it in the field.
  function aiShortcutOpen() {
    const combo = aiShortcut();
    fidForm('翻译快捷键', 'ai-shortcut', `<p class="fid-field-help ai-shortcut-about">在消息框中按下快捷键，输入的内容会译为客户语言，显示在消息框上方；再按 Enter 发送译文。</p>
      ${fidFormRow('快捷键', `<input class="fid-input ai-shortcut-key" id="ai-shortcut-key" value="${esc(aiShortcutLabel(combo))}" readonly aria-describedby="ai-shortcut-help"><input type="hidden" name="combo" value="${esc(combo)}"><span class="fid-field-help" id="ai-shortcut-help">点击上面的框，按下新的组合键：Ctrl 或 Alt（可再加 Shift），再加一个字母或 Enter。Mac 上 ⌘ 等同于 Ctrl。</span>${fidButton(`恢复默认（${aiShortcutLabel(AI_SHORTCUT_DEFAULT)}）`, '', '', 'slim', 'data-ai-shortcut-default')}`, 'ai-shortcut-key')}`, '保 存');
  }
  // Puts a combination into the panel's field, and takes away a refusal shown before.
  function aiShortcutShow(combo) {
    const field = $('#ai-shortcut-key'), kept = $('#dialog [name="combo"]');
    if (!field || !kept) return;
    field.value = aiShortcutLabel(combo);
    kept.value = combo;
    $('#form-error').textContent = '';
    $('#dialog .field-error')?.remove();
    field.removeAttribute('aria-invalid');
    field.setAttribute('aria-describedby', 'ai-shortcut-help');
  }
  fidForms['ai-shortcut-form'] = (f, v) => {
    const combo = v('combo'), problem = aiShortcutProblem(combo);
    if (problem) return error(problem);
    aiSettings().translateKey = combo;
    persist();
    close();
    render();
    toast(`翻译快捷键已设为 ${aiShortcutLabel(combo)}。`);
  };
  // Translates what is typed, when the shortcut is pressed. Nothing is sent.
  function aiTranslateByShortcut() {
    const c = selectedCustomer(), box = $('#composer-text'), text = box ? box.value.trim() : '';
    if (!c || !text) return;
    if (aiRuntime.provider !== 'server') return toast('没有可用的翻译服务，无法翻译。');
    if (data.ai?.enabled?.['translate.outbound'] === false) return toast('「发送前翻译」已在 AI 能力页面停用。');
    if (!aiCustomerLanguage(c)) return toast('请先在上方选择客户语言。');
    if (aiDraftPending.has(c.id)) return toast('正在翻译，请稍候。');
    const d = draft(c);
    if (d.translated && d.source === text) return toast('译文已在消息框上方，按 Enter 发送。');
    const request = {};
    aiDraftPending.set(c.id, request);
    aiRefreshDraftPreview(c);
    aiRun('translate.outbound', aiOutboundInput(c, text), { customerId: c.id }).then(result => {
      if (aiDraftPending.get(c.id) === request) aiDraftPending.delete(c.id);
      const current = ui.drafts[c.id];
      const unchanged = current && current.text.trim() === text;
      if (!result.ok) {
        if (!result.skipped) toast('未能取得译文，请稍后再试。');
      } else if (unchanged && aiSameText(result.text, text)) {
        toast(`这段内容已是${c.language}，按 Enter 直接发送。`);
      } else if (unchanged) {
        current.translated = result.text;
        current.source = text;
        persist();
        toast(`已译为${c.language}，按 Enter 发送译文。`);
      }
      aiRefreshDraftPreview(c);
    });
  }
  // Key presses: in the message box the shortcut translates — this listener comes before the page's own one,
  // which sends on Enter, so a shortcut with Enter does not send. In the panel's field a press is the new
  // shortcut; Tab and Escape keep their use there.
  document.addEventListener('keydown', event => {
    if (event.target.id === 'composer-text') {
      if (event.isComposing || event.keyCode === 229 || aiShortcutOf(event) !== aiShortcut()) return;
      event.preventDefault();
      event.stopPropagation();
      return aiTranslateByShortcut();
    }
    if (event.target.id !== 'ai-shortcut-key') return;
    if ((event.key === 'Tab' || event.key === 'Escape') && !event.ctrlKey && !event.altKey && !event.metaKey) return;
    event.preventDefault();
    event.stopPropagation();
    const combo = aiShortcutOf(event);
    if (!combo) return;
    const problem = aiShortcutProblem(combo);
    if (problem) return error(problem);
    aiShortcutShow(combo);
  }, true);

  function renderAiPage() {
```

**Edit 2.3** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
    const listed = !current || AI_CUSTOMER_LANGUAGES.includes(current) ? AI_CUSTOMER_LANGUAGES : [current, ...AI_CUSTOMER_LANGUAGES];
    return `<label class="ai-language-pick">${icon('Languages')}<span>客户语言</span><select class="fid-select" data-ai-language="${esc(c.id)}" aria-label="客户语言">${option('', '未选择（发送原文）', current)}${listed.map(language => option(language, language, current)).join('')}${option('__other', '其他语言…', current)}</select></label>`;
  }
```

Replace them with:

```text
    const listed = !current || AI_CUSTOMER_LANGUAGES.includes(current) ? AI_CUSTOMER_LANGUAGES : [current, ...AI_CUSTOMER_LANGUAGES];
    return `<label class="ai-language-pick">${icon('Languages')}<span>客户语言</span><select class="fid-select" data-ai-language="${esc(c.id)}" aria-label="客户语言">${option('', '未选择（发送原文）', current)}${listed.map(language => option(language, language, current)).join('')}${option('__other', '其他语言…', current)}</select></label>${aiShortcutGear()}`;
  }
```

**Edit 2.4** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
    if (event.target.closest?.('[data-ai-guard]')) aiSetGuard(!aiGuardOn());
    const ask = event.target.closest?.('[data-ai-transcribe]');
```

Replace them with:

```text
    if (event.target.closest?.('[data-ai-guard]')) aiSetGuard(!aiGuardOn());
    if (event.target.closest?.('[data-ai-shortcut]')) aiShortcutOpen();
    if (event.target.closest?.('[data-ai-shortcut-default]')) aiShortcutShow(AI_SHORTCUT_DEFAULT);
    const ask = event.target.closest?.('[data-ai-transcribe]');
```

#### `fidelity.css`

**Edit 2.5** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.source-strip .ai-language-pick { margin-left:auto; display:inline-flex; align-items:center; gap:6px; min-width:0; color:var(--color-text-muted); font-size:12px; white-space:nowrap; }
.ai-language-pick svg { width:14px; height:14px; flex:none; }
```

Replace them with:

```text
.source-strip .ai-language-pick { margin-left:auto; display:inline-flex; align-items:center; gap:6px; min-width:0; color:var(--color-text-muted); font-size:12px; white-space:nowrap; }
.source-strip .ai-shortcut-gear { width:28px; height:28px; margin-left:2px; color:var(--color-text-muted); }
.source-strip .ai-shortcut-gear .icon { width:16px; height:16px; }
.ai-shortcut-about { margin:0 0 14px; }
.ai-shortcut-key { width:100%; cursor:pointer; caret-color:transparent; font-weight:600; }
#ai-shortcut-form .fid-btn.slim { margin-top:8px; }
.ai-language-pick svg { width:14px; height:14px; flex:none; }
```

What these edits do, so that you can recognise them: in `fidelity-ai.js` the first edit lets the line under the message box name the shortcut; the long one, after the override of `send`, adds the section "the translation shortcut (plan 060)" — the rules for a combination, the gear (`aiShortcutGear`), the panel (`aiShortcutOpen`, its form handler `fidForms['ai-shortcut-form']`), the translation on demand (`aiTranslateByShortcut`) and one keydown listener registered with `true` (capture phase) for the message box and the panel's field; the next puts the gear after the drop-down of the customer's language; the last lets the module's click listener open the panel and restore the default. The edit of `fidelity.css` adds the styles of the gear and the panel after the rule of `.ai-language-pick`.

**Verify**: `sha256sum work/wa-replica/fidelity-ai.js work/wa-replica/fidelity.css` → `dd083c3b67de0d3483731b858af280fd740b331a9833460a5c4ecc11e2e976d9`, `06bf20f32731f03950b89029b321a76401da47852544c17528a2716ca91843c9`. If a checksum does not match, restore the file with `git checkout 6f259db -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 3: The gear's icon in the build, the validator — and the build

#### `build-fidelity.cjs`

**Edit 3.1** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
assert(lucideIcons, 'Unable to load icon definitions');
const names = [...new Set([...(index+js+master).matchAll(/["']([A-Z][A-Za-z0-9]*)["']/g)].map(m=>m[1]))].filter(n=>Array.isArray(lucideIcons[n]));
```

Replace them with:

```text
assert(lucideIcons, 'Unable to load icon definitions');
// Icons the committed pool does not hold yet, from lucide-static 1.0.0 — the version the pool comes from (ISC
// licence, see lucide-license.txt) — in lucide's own format. An icon of the same name in the pool comes first.
const addedIcons = {
  Settings: [["path",{"d":"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"}],["circle",{"cx":"12","cy":"12","r":"3"}]],
};
lucideIcons = { ...addedIcons, ...lucideIcons };
const names = [...new Set([...(index+js+master).matchAll(/["']([A-Z][A-Za-z0-9]*)["']/g)].map(m=>m[1]))].filter(n=>Array.isArray(lucideIcons[n]));
```

#### `validate-scrm-lifecycle.cjs`

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert.equal(pricePage.match(/priceMoney\(/g).length, 2, 'a price must be shown and quoted only through priceShown');

```

Replace them with:

```text
assert.equal(pricePage.match(/priceMoney\(/g).length, 2, 'a price must be shown and quoted only through priceShown');
// The translation shortcut (plan 060): set under a gear beside the customer's language by pressing it; in the
// message box it translates what was typed and shows it above the box. It is caught before the page's own
// handling of Enter, so that a shortcut with Enter translates instead of sending.
for (const required of ["const AI_SHORTCUT_DEFAULT = 'Ctrl+Enter';", 'if (event.isComposing || event.keyCode === 229 || aiShortcutOf(event) !== aiShortcut()) return;', "fidForms['ai-shortcut-form'] = (f, v) => {", 'aiSettings().translateKey = combo;', "</select></label>${aiShortcutGear()}`;", "if (event.target.closest?.('[data-ai-shortcut]')) aiShortcutOpen();", 'return aiShortcutReady(c) ? `${keys}；${esc(aiShortcutLabel(aiShortcut()))} 翻译` : keys;', "aiRun('translate.outbound', aiOutboundInput(c, text), { customerId: c.id }).then(result => {"]) {
  assert(aiSource.includes(required), `fidelity-ai.js is missing ${required}`);
  assert(appJs.includes(required), `app.js is missing ${required}`);
}
assert(aiSource.includes('    aiShortcutShow(combo);\n  }, true);\n'), 'the shortcut must be caught before the page sends on Enter');
assert(read(path.join(out, 'icons.js')).includes('"Settings":[["path"'), 'the gear must be in the icon pool');

```

**Edit 3.3** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  priceCurrency: 'one currency for the whole price list, chosen in the confirm dialog of an upload (18 currencies or none) and starting on the one the headers name; every price shown on the page and quoted into the message box carries it ("USD 40") unless the file gives the price with its own sign; a list saved before keeps the currencies of its headers',
```

Replace them with:

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  translateShortcut: 'a key combination set under the gear beside the customer\'s language (Ctrl + Enter at first; Ctrl or Alt, maybe Shift, and a letter or Enter; combinations that typing, sending or the browser need are refused) translates the message box into the customer\'s language and shows it above the box, guard on or off; Enter then sends the translation; the line under the box names it',
  priceCurrency: 'one currency for the whole price list, chosen in the confirm dialog of an upload (18 currencies or none) and starting on the one the headers name; every price shown on the page and quoted into the message box carries it ("USD 40") unless the file gives the price with its own sign; a list saved before keeps the currencies of its headers',
```

**Verify**: `sha256sum work/wa-replica/build-fidelity.cjs work/wa-replica/validate-scrm-lifecycle.cjs` → `4660286ff56bcf2d6d740dd55d1f55bc30ad985e957f2f56244e97c68438f22e`, `789a08346ac255e6bb6fca11eee271ac0b17a9aaca79d68a589ccf075407e107`; `git checkout 6f259db -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 85`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.js`, `app.css`, `icons.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else (`icons.js` must show as modified in the working tree — the build added `Settings`; if git also shows it staged because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`, which keeps the built content); `sha256sum outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/app.css outputs/wa-replica-prototype/icons.js` → `4142eca26e0272b8d68b0209f0d5d8b06f00c59e237350fe4d1ba9810d1eec66`, `631a713d3cdb05aff71b304df8178f8105dab3a5ad93573dbd143fc1d71b6f03`, `4bc177219c7b2fae2109b6ac1bdc2397629dcecdaecc03b4207bb112e7249aec`. If a checksum does not match, restore the file with `git checkout 6f259db -- <file>` and apply its instructions again; if it still does not match, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 翻译快捷键：在消息框里按快捷键翻译 · 2026-11-24

聊天界面上方「客户语言」右边多了一个齿轮图标，点开就是「翻译快捷键」：点击快捷键框，直接按下想用的组合键，再点「保存」。默认是 Ctrl + Enter，也可以一键恢复默认。

- 在消息框里输入内容后按快捷键，内容会译为客户语言并显示在消息框上方；再按 Enter 发送译文，消息框里保留原文。发送保护开着或关着都可以用。
- 快捷键要包含 Ctrl 或 Alt（可再加 Shift），再加一个字母或 Enter；Mac 上 ⌘ 等同于 Ctrl。会影响打字、发送或浏览器本身的组合不能设置，并会说明原因，例如单独的 Enter、Shift + Enter、Ctrl + C / V、Ctrl + W。
- 消息框下方的按键提示会写明当前的翻译快捷键，例如「Ctrl + Enter 翻译」。
- 齿轮只在配置了翻译服务时显示。没有选择客户语言时按快捷键，会提示先选择客户语言；内容已经是客户语言时，会提示直接发送。

验证：构建与校验脚本通过；浏览器测试覆盖设置快捷键（按下组合键、被拒绝的组合及原因、恢复默认、保存后刷新仍在）、在消息框里按快捷键翻译（发送保护开和关、按 Enter 发送译文、修改内容后译文消失、没有选择客户语言、内容已是客户语言、翻译失败、输入法输入中）、按键提示，以及窄屏下的齿轮与设置框。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout 6f259db -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && bash /tmp/wa-scrm-plan-060/smoke.sh
```

**Verify**: build exit 0 with `"icons": 85`; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `31acc45d044b24bc78d1d3fabc8fa91195a569f50415f710c43057fd30ad489d`; `git status --porcelain` lists exactly these nine as changed and nothing as new: the five files of the table in "Current state" and `outputs/wa-replica-prototype/app.js`, `app.css`, `icons.js`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the facts of the feature (the block added in Step 3): the default, the listener of the message box that skips input-method composition and is registered for the capture phase, the form handler, where the shortcut is kept, the gear after the drop-down and its click, the line under the box, the request for the translation; all of them in the source and in the built `app.js`; and the gear in the icon pool.
- **Smoke** (`/tmp/wa-scrm-plan-060/smoke.sh`) — the same facts, the icon in the build and in the pool, the built style rule, which built files changed and the syntax of the built page.
- **Verified by the reviewer, not by you**: in a browser against a stand-in server with a stand-in model service — the gear to the right of the drop-down, the panel with the focus in its field; Enter, Shift + Enter, Ctrl + C, Ctrl + V, Ctrl + W, Ctrl + Alt + K, Alt + F, Ctrl + Shift + I and Ctrl + 1 refused with their reasons while the dialog stays; modifier keys alone change nothing; Alt + T and Ctrl + Shift + K taken; the default restored; saved — kept on the server, named in the gear and the line under the box, still there after the page is opened again; the shortcut translates without sending, Enter then sends the translation without a second request, guard on and guard off; editing the text takes the translation away; pressed again on the same text asks nothing; a text already in the customer's language, a failing service, a customer without a language, an input method composing; the gear and the panel on a 390 px screen; the earlier browser sessions, with the line under the box updated.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 6f259db -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 85`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `bash /tmp/wa-scrm-plan-060/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-ai.js` → `dd083c3b67de0d3483731b858af280fd740b331a9833460a5c4ecc11e2e976d9`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `06bf20f32731f03950b89029b321a76401da47852544c17528a2716ca91843c9`
- [ ] `sha256sum work/wa-replica/build-fidelity.cjs` → `4660286ff56bcf2d6d740dd55d1f55bc30ad985e957f2f56244e97c68438f22e`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `789a08346ac255e6bb6fca11eee271ac0b17a9aaca79d68a589ccf075407e107`
- [ ] `sha256sum replica/build-log.md` → `31acc45d044b24bc78d1d3fabc8fa91195a569f50415f710c43057fd30ad489d`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `4142eca26e0272b8d68b0209f0d5d8b06f00c59e237350fe4d1ba9810d1eec66`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `631a713d3cdb05aff71b304df8178f8105dab3a5ad93573dbd143fc1d71b6f03`
- [ ] `sha256sum outputs/wa-replica-prototype/icons.js` → `4bc177219c7b2fae2109b6ac1bdc2397629dcecdaecc03b4207bb112e7249aec`
- [ ] `git diff --name-only 6f259db..HEAD -- outputs` lists `app.js`, `app.css`, `icons.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only 6f259db..HEAD -- . ':!plans'` lists exactly nine paths: the five of the table in "Current state" and the four output files
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, or the build reports another number of icons than 85 after Step 3.
- An output file other than `app.js`, `app.css`, `icons.js` and `validation.json` changes (`tokens.css` in particular must not).
- The work appears to require editing an out-of-scope file, creating a file or installing a package.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else. Every workspace starts with Ctrl + Enter until someone sets another shortcut in it.
- Ctrl + Enter used to send like Enter (the page's own listener ignored Ctrl). From now on it translates — on purpose; an employee who wants it to send can set another shortcut.
- `addedIcons` in the build holds icons the committed pool lacks; once a build has written them into `icons.js` and that is committed, the pool has them anyway. Plan 061 adds `Pin` and `PinOff` there.
- What a reviewer should scrutinise: that the shortcut never sends; that the listener is the capture one and stops the event only when the combination is the shortcut; that a stored value is used only when `aiShortcutProblem` accepts it; that every text put into the page goes through `esc`.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
