# Plan 062: Any key as the translation shortcut

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 6daf415..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (one page module of the browser app, the validator and the build log; exact text and checksums for every file; no server change)
- **Depends on**: plans/060-translation-shortcut.md (DONE)
- **Category**: feature change (requested by the owner)
- **Planned at**: commit `6daf415`, 2026-11-24

## Why this matters

Plan 060 (live since 2026-11-24) lets an employee set a keyboard shortcut that translates the message box, but only Ctrl or Alt (maybe Shift) with a letter or Enter, and it refuses a list of combinations. After trying it the owner wrote on 2026-11-24: "Key bindings should allow for any key to be mapped, rather than being restricted to specific key combinations." With this plan any key can be the shortcut — F2, the backquote key, Tab, a single letter, Enter, a key of the number pad — with or without modifier keys, and so can modifier keys pressed on their own (Ctrl, or Ctrl + Shift, pressed and let go).

### Decisions already made (do not re-open; do not ask)

The owner decided: **any key can be mapped**; no combination is restricted.

Decided by the advisor, within that:

- **Modifier keys on their own** count when the last of them is let go, and only when no other key was pressed in between (so Ctrl as the shortcut still lets Ctrl + C copy).
- **Recording**: the panel's field records the next key press once it is **clicked**, or once **Enter or Space** is pressed on it; it then shows 请按下新的快捷键…. While it records, every key is taken, Tab and Escape too. Before that, and after it, Tab and Escape keep their use (moving on, closing the panel), so nobody is trapped in the field. Leaving the field stops recording and keeps the shortcut shown before.
- Nothing is refused. The help under the field says what follows from a key that types, sends or makes a new line on its own (it then translates in the message box instead), and that the browser's own shortcuts (such as Ctrl + W) never reach the page — that is the browser, not a rule of this page.
- **Enter as the shortcut** takes Enter's place: the line under the message box then reads `Enter 翻译，点击「发送」发出；Shift + Enter 换行`, and the toasts of a translation point to the send button. **Shift + Enter as the shortcut** takes the new line's place in that line too.
- How a shortcut is kept: the modifier keys in the order Ctrl, Alt, Shift, Meta (on a Mac ⌘ counts as Ctrl; the Windows key is Meta, shown as Win), then the key by its place on the keyboard (`event.code`; letters and digits as they are): e.g. `F2`, `Backquote`, `Ctrl+Shift+K`, `Ctrl`. It is shown with signs where a key has one (the backquote key as `` ` ``, `'`, `\`, 空格, Esc, ↑, 小键盘 5 …). Shortcuts set under plan 060 keep working unchanged. A stored value that names no key (anything but letters, digits and the modifier names joined by `+`) counts as Ctrl + Enter.
- Nothing counts while an input method composes, as before.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server. There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity-ai.js` | `dd083c3b67de0d3483731b858af280fd740b331a9833460a5c4ecc11e2e976d9` | `20ca788021e78b11bd5bd95e97350550ef1bd444e502809d6bed7ebbb3d15bd3` | 10 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `f7e8ab541e1f40e41f3f92a5ceeff18a0863e52e650d9e60282e5fcba92ea855` | `1d9dcbc620aef890458aec3270377f69accf940acbe531a2e5f2164320b55e85` | 3 |
| `replica/build-log.md` | `94a6ad0f9612fb259f7d5aa73e325741c316aef3cbcd60ca7ee74023e937a1ef` | `5b0ecac3318055c3b47d4ac8d6a186c0b5fcd5cd935fb5c8dd22494c12b7e2ff` | 1 append |

- `fidelity-ai.js` — the AI module of the page. Its section "the translation shortcut (plan 060)" holds the rules of a combination (`AI_SHORTCUT_FORM`, the refusal list `AI_SHORTCUT_TAKEN`, `aiShortcutProblem`), `aiShortcut`, `aiShortcutOf(event)`, the gear, the panel (`aiShortcutOpen`, `aiShortcutShow`, `fidForms['ai-shortcut-form']`), `aiTranslateByShortcut` and one keydown listener registered for the capture phase (before the page's own listener, which sends on Enter). `aiEnterHint` writes the line under the message box. The module's click listener near its end opens the panel and restores the default.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`; its block for plan 060 names lines this plan changes.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly two output files differ: `app.js` and `validation.json` (written by the validator); `icons.js` (87 icons), `app.css` and `tokens.css` come out unchanged.

## Commands you will need

Run from the repository root (inside your worktree). Plain `node` is enough for every command of this plan.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 6daf415 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Smoke | `bash /tmp/wa-scrm-plan-062/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-ai.js` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.js`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — the server files, the other `fidelity-*.js` modules, the style sheets, `build-fidelity.cjs`, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/062-any-key-shortcut` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): let any key be the translation shortcut`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, the signs ⌘ ↑ ↓ ← →, backticks, quotes and backslashes; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 13 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the three files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-062/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-062 && cat > /tmp/wa-scrm-plan-062/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 062: any key, any combination, or modifier keys on their own as the translation shortcut.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
same 'no combination is refused any more' "$(grep -c AI_SHORTCUT_TAKEN "$W/fidelity-ai.js")" 0
has 'a stored shortcut may name any key' "$W/fidelity-ai.js" 'const AI_SHORTCUT_FORM = /^((Ctrl|Alt|Shift|Meta)\+){0,4}[A-Za-z0-9]{1,24}$/;'
has 'keys are shown with their signs' "$W/fidelity-ai.js" '  const AI_KEY_SIGNS = { Backquote:'
has 'modifier keys on their own count when they are let go' "$W/fidelity-ai.js" "if (lone && id === 'composer-text' && lone === aiShortcut()) aiTranslateByShortcut();"
has 'the field records after a click' "$W/fidelity-ai.js" "if (event.target.id === 'ai-shortcut-key') aiShortcutRecord(true);"
has 'while recording any key is taken' "$W/fidelity-ai.js" '    if (combo) aiShortcutShow(combo);'
has 'with Enter as the shortcut the send button sends' "$W/fidelity-ai.js" "const aiEnterTaken = () => aiShortcut() === 'Enter';"
has 'the page is built with it' "$O/app.js" 'function aiLoneUp(event) {'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "assert(!aiSource.includes('AI_SHORTCUT_TAKEN'), 'any key can be the shortcut"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 翻译快捷键可以设为任意键 · 2026-11-24'
same 'of the built files only the page and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.js|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-062/smoke.sh && ls -l /tmp/wa-scrm-plan-062/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-ai.js work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `bash /tmp/wa-scrm-plan-062/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `no combination is refused any more` (got: 2), `a stored shortcut may name any key`, `keys are shown with their signs`, `modifier keys on their own count when they are let go`, `the field records after a click`, `while recording any key is taken`, `with Enter as the shortcut the send button sends`, `the page is built with it`, `the validator knows it` and `the build log has the entry` (ten checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The AI module: any key, modifier keys on their own, recording after a click, Enter as the shortcut

#### `fidelity-ai.js`

**Edit 2.1** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
  }
  // The line under the message box that explains the Enter key, and the translation shortcut where it works.
  function aiEnterHint(c) {
    const keys = aiGuardActive(c) ? 'Enter 先翻译，再按一次发送；Shift + Enter 换行' : 'Enter 发送，Shift + Enter 换行';
    return aiShortcutReady(c) ? `${keys}；${esc(aiShortcutLabel(aiShortcut()))} 翻译` : keys;
  }
```

Replace them with:

```text
  }
  // The line under the message box that explains the Enter key, and the translation shortcut where it works. A
  // shortcut that is Enter or Shift + Enter takes that key's place: then the send button sends, or no key makes a
  // new line.
  function aiEnterHint(c) {
    const enter = aiGuardActive(c) ? 'Enter 先翻译，再按一次发送' : 'Enter 发送';
    const keys = aiGuardActive(c) ? `${enter}；Shift + Enter 换行` : `${enter}，Shift + Enter 换行`;
    if (!aiShortcutReady(c)) return keys;
    const shortcut = aiShortcut(), named = `${esc(aiShortcutLabel(shortcut))} 翻译`;
    if (shortcut === 'Enter') return `${named}，点击「发送」发出；Shift + Enter 换行`;
    if (shortcut === 'Shift+Enter') return `${enter}；${named}`;
    return `${keys}；${named}`;
  }
```

**Edit 2.2** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

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
```

Replace them with:

```text

  // ---- the translation shortcut (plans 060 and 062) ----
  // A key, or a combination of keys, set under the gear beside the customer's language. Pressed in the message
  // box it translates what was typed into the customer's language and shows the translation above the box,
  // whether or not the send guard is on; Enter (or the send button) then sends the translation, and what was typed
  // stays in the box. Any key can be the shortcut, with or without modifier keys, and so can modifier keys pressed
  // on their own (plan 062: the owner asked for any key). It is kept in the AI settings as e.g. "Ctrl+Enter", "F2",
  // "Backquote", "Alt+Shift+T" or "Ctrl": the modifier keys in the order Ctrl, Alt, Shift, Meta (on a Mac ⌘ counts
  // as Ctrl), then the key by its place on the keyboard (event.code; letters and digits as they are).
  const AI_SHORTCUT_DEFAULT = 'Ctrl+Enter';
  const AI_SHORTCUT_FORM = /^((Ctrl|Alt|Shift|Meta)\+){0,4}[A-Za-z0-9]{1,24}$/;
  const aiOnMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  const AI_MODIFIERS = { Control: 'Ctrl', Alt: 'Alt', AltGraph: 'Alt', Shift: 'Shift', Meta: aiOnMac ? 'Ctrl' : 'Meta', OS: 'Meta' };
  const AI_MODIFIER_ORDER = ['Ctrl', 'Alt', 'Shift', 'Meta'];
  const AI_KEY_SIGNS = { Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', IntlBackslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Space: '空格', Escape: 'Esc', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', NumpadAdd: '小键盘 +', NumpadSubtract: '小键盘 -', NumpadMultiply: '小键盘 *', NumpadDivide: '小键盘 /', NumpadDecimal: '小键盘 .', Meta: 'Win' };
  // How a shortcut is shown: "Ctrl + Enter", "F2", "`", "小键盘 5".
  const aiShortcutLabel = combo => combo.split('+').map(part => AI_KEY_SIGNS[part] || part.replace(/^Numpad(\d)$/, '小键盘 $1')).join(' + ');
  // Why a stored value cannot be the shortcut (it names no key), or '' when it can.
  const aiShortcutProblem = combo => (AI_SHORTCUT_FORM.test(combo || '') ? '' : '没有读到按键：请点击上面的框，再按一次想用的键。');
  // The shortcut in use: the one set under the gear, read without creating the settings, or the default.
  const aiShortcut = () => (aiShortcutProblem(data.ai?.translateKey) ? AI_SHORTCUT_DEFAULT : data.ai.translateKey);
  // The combination a key press makes, e.g. "Ctrl+Shift+K" or "F2"; '' for a modifier key, which counts only when
  // it is pressed on its own (below). The key is told by its place on the keyboard (event.code), so that Alt on a
  // Mac, which changes the character, still gives the letter.
  function aiShortcutOf(event) {
    if (AI_MODIFIERS[event.key]) return '';
    const code = event.code || '';
    const key = /^Key[A-Z]$/.test(code) ? code.slice(3) : /^Digit\d$/.test(code) ? code.slice(5) : code === 'NumpadEnter' ? 'Enter' : /^[A-Za-z0-9]{1,24}$/.test(code) ? code : String(event.key || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 24);
    if (!key) return '';
    const held = [event.ctrlKey || (aiOnMac && event.metaKey) ? 'Ctrl' : '', event.altKey ? 'Alt' : '', event.shiftKey ? 'Shift' : '', !aiOnMac && event.metaKey ? 'Meta' : ''];
    return [...held.filter(Boolean), key].join('+');
  }
  // Modifier keys pressed on their own (e.g. Ctrl pressed and let go): the ones held since every key was up, and
  // whether another key came in between, which makes them part of an ordinary combination instead.
  const aiLone = { held: new Set(), spoiled: false };
  const aiLoneReset = () => { aiLone.held.clear(); aiLone.spoiled = false; };
  function aiLoneDown(event) {
    if (AI_MODIFIERS[event.key]) aiLone.held.add(AI_MODIFIERS[event.key]);
    else aiLone.spoiled = true;
  }
  // At a key's release: once every modifier key is up, the ones pressed on their own ("Ctrl", "Ctrl+Shift"), or ''.
  function aiLoneUp(event) {
    if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return '';
    const combo = aiLone.spoiled ? '' : AI_MODIFIER_ORDER.filter(name => aiLone.held.has(name)).join('+');
    aiLoneReset();
    return combo;
  }
  // Whether Enter itself is the shortcut: then the send button sends the translation.
  const aiEnterTaken = () => aiShortcut() === 'Enter';
  // Whether the shortcut can translate for this customer: the relay is in use, translating replies is switched
```

**Edit 2.3** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
  }
  // The panel under the gear: the shortcut is set by pressing it in the field.
  function aiShortcutOpen() {
    const combo = aiShortcut();
    fidForm('翻译快捷键', 'ai-shortcut', `<p class="fid-field-help ai-shortcut-about">在消息框中按下快捷键，输入的内容会译为客户语言，显示在消息框上方；再按 Enter 发送译文。</p>
      ${fidFormRow('快捷键', `<input class="fid-input ai-shortcut-key" id="ai-shortcut-key" value="${esc(aiShortcutLabel(combo))}" readonly aria-describedby="ai-shortcut-help"><input type="hidden" name="combo" value="${esc(combo)}"><span class="fid-field-help" id="ai-shortcut-help">点击上面的框，按下新的组合键：Ctrl 或 Alt（可再加 Shift），再加一个字母或 Enter。Mac 上 ⌘ 等同于 Ctrl。</span>${fidButton(`恢复默认（${aiShortcutLabel(AI_SHORTCUT_DEFAULT)}）`, '', '', 'slim', 'data-ai-shortcut-default')}`, 'ai-shortcut-key')}`, '保 存');
  }
  // Puts a combination into the panel's field, and takes away a refusal shown before.
  function aiShortcutShow(combo) {
```

Replace them with:

```text
  }
  // The panel under the gear. Its field records the next key press once it is clicked (or Enter or Space is pressed
  // on it): any key, with or without modifier keys, or modifier keys on their own. Until then Tab and Escape keep
  // their use there, so that the panel can be left with the keyboard.
  let aiRecording = false;
  function aiShortcutOpen() {
    const combo = aiShortcut();
    aiRecording = false;
    fidForm('翻译快捷键', 'ai-shortcut', `<p class="fid-field-help ai-shortcut-about">在消息框中按下快捷键，输入的内容会译为客户语言，显示在消息框上方；再按 Enter 或点击「发送」发送译文。</p>
      ${fidFormRow('快捷键', `<input class="fid-input ai-shortcut-key" id="ai-shortcut-key" value="${esc(aiShortcutLabel(combo))}" readonly aria-describedby="ai-shortcut-help"><input type="hidden" name="combo" value="${esc(combo)}"><span class="fid-field-help" id="ai-shortcut-help">点击上面的框，再按下想用的键：任意一个键或组合键都可以，例如 F2、\`、Tab 或 Ctrl + Enter，也可以单独按 Ctrl、Alt 等键。设为单独的字母、数字、空格、Enter 或 Shift 等键后，在消息框里按它就会翻译，不再输入、发送或换行。浏览器自己的快捷键（如 Ctrl + W）网页收不到。Mac 上 ⌘ 等同于 Ctrl。</span>${fidButton(`恢复默认（${aiShortcutLabel(AI_SHORTCUT_DEFAULT)}）`, '', '', 'slim', 'data-ai-shortcut-default')}`, 'ai-shortcut-key')}`, '保 存');
  }
  // Starts or stops recording in the panel's field; stopped, the field shows the shortcut kept in the form.
  function aiShortcutRecord(on) {
    const field = $('#ai-shortcut-key'), kept = $('#dialog [name="combo"]');
    aiRecording = Boolean(on && field && kept);
    aiLoneReset();
    if (field && kept) field.value = aiRecording ? '请按下新的快捷键…' : aiShortcutLabel(kept.value);
  }
  // Puts a combination into the panel's field and stops recording; a message shown before goes away.
  function aiShortcutShow(combo) {
```

**Edit 2.4** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
    if (!field || !kept) return;
    field.value = aiShortcutLabel(combo);
    kept.value = combo;
    $('#form-error').textContent = '';
```

Replace them with:

```text
    if (!field || !kept) return;
    kept.value = combo;
    aiShortcutRecord(false);
    $('#form-error').textContent = '';
```

**Edit 2.5** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
    const d = draft(c);
    if (d.translated && d.source === text) return toast('译文已在消息框上方，按 Enter 发送。');
    const request = {};
```

Replace them with:

```text
    const d = draft(c);
    if (d.translated && d.source === text) return toast(aiEnterTaken() ? '译文已在消息框上方，点击「发送」即可发出。' : '译文已在消息框上方，按 Enter 发送。');
    const request = {};
```

**Edit 2.6** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
      } else if (unchanged && aiSameText(result.text, text)) {
        toast(`这段内容已是${c.language}，按 Enter 直接发送。`);
      } else if (unchanged) {
```

Replace them with:

```text
      } else if (unchanged && aiSameText(result.text, text)) {
        toast(`这段内容已是${c.language}，${aiEnterTaken() ? '点击「发送」直接发出' : '按 Enter 直接发送'}。`);
      } else if (unchanged) {
```

**Edit 2.7** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
        persist();
        toast(`已译为${c.language}，按 Enter 发送译文。`);
      }
```

Replace them with:

```text
        persist();
        toast(`已译为${c.language}，${aiEnterTaken() ? '点击「发送」发出译文' : '按 Enter 发送译文'}。`);
      }
```

**Edit 2.8** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
  }
  // Key presses: in the message box the shortcut translates — this listener comes before the page's own one,
  // which sends on Enter, so a shortcut with Enter does not send. In the panel's field a press is the new
  // shortcut; Tab and Escape keep their use there.
  document.addEventListener('keydown', event => {
    if (event.target.id === 'composer-text') {
      if (event.isComposing || event.keyCode === 229 || aiShortcutOf(event) !== aiShortcut()) return;
      event.preventDefault();
```

Replace them with:

```text
  }
  // Key presses. In the message box the shortcut translates — these listeners come before the page's own one,
  // which sends on Enter, so a shortcut with Enter does not send; nothing counts while an input method composes.
  // In the panel's field, while it records, any press is the new shortcut; otherwise Enter or Space starts
  // recording there.
  document.addEventListener('keydown', event => {
    const id = event.target.id;
    if (id === 'composer-text') {
      if (event.isComposing || event.keyCode === 229) return void (aiLone.spoiled = true);
      aiLoneDown(event);
      if (aiShortcutOf(event) !== aiShortcut()) return;
      event.preventDefault();
```

**Edit 2.9** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
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

```

Replace them with:

```text
    }
    if (id !== 'ai-shortcut-key') return;
    if (!aiRecording) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      return aiShortcutRecord(true);
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.isComposing || event.keyCode === 229) return;
    aiLoneDown(event);
    const combo = aiShortcutOf(event);
    if (combo) aiShortcutShow(combo);
  }, true);
  // Modifier keys pressed on their own count when the last of them is let go.
  document.addEventListener('keyup', event => {
    const id = event.target.id;
    if (id !== 'composer-text' && id !== 'ai-shortcut-key') return aiLoneReset();
    const lone = aiLoneUp(event);
    if (lone && id === 'composer-text' && lone === aiShortcut()) aiTranslateByShortcut();
    else if (lone && id === 'ai-shortcut-key' && aiRecording) aiShortcutShow(lone);
  }, true);
  // Leaving the field stops recording; the shortcut kept so far stays.
  document.addEventListener('focusout', event => {
    if (event.target.id === 'ai-shortcut-key' && aiRecording) aiShortcutRecord(false);
  });

```

**Edit 2.10** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
    if (event.target.closest?.('[data-ai-shortcut-default]')) aiShortcutShow(AI_SHORTCUT_DEFAULT);
    const ask = event.target.closest?.('[data-ai-transcribe]');
```

Replace them with:

```text
    if (event.target.closest?.('[data-ai-shortcut-default]')) aiShortcutShow(AI_SHORTCUT_DEFAULT);
    if (event.target.id === 'ai-shortcut-key') aiShortcutRecord(true);
    const ask = event.target.closest?.('[data-ai-transcribe]');
```

What these edits do, so that you can recognise them: the first rewrites `aiEnterHint` (Enter or Shift + Enter as the shortcut takes that key's place in the line under the box); the second replaces the rules of a combination — the refusal list goes, `AI_SHORTCUT_FORM` accepts any key, `aiShortcutLabel` shows signs, `aiShortcutOf` names any key, and `aiLone` with `aiLoneDown`/`aiLoneUp` handles modifier keys pressed on their own; the next ones rework the panel (`aiRecording`, `aiShortcutRecord`, a new help text) and `aiShortcutShow`, let the three toasts of a translation point to the send button when Enter is the shortcut, replace the keydown listener and add a keyup and a focusout listener; the last lets a click on the field start recording.

**Verify**: `sha256sum work/wa-replica/fidelity-ai.js` → `20ca788021e78b11bd5bd95e97350550ef1bd444e502809d6bed7ebbb3d15bd3`; `grep -c AI_SHORTCUT_TAKEN work/wa-replica/fidelity-ai.js` → `0`. If the checksum does not match, restore the file with `git checkout 6daf415 -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 3: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert.equal(pricePage.match(/priceMoney\(/g).length, 2, 'a price must be shown and quoted only through priceShown');
// The translation shortcut (plan 060): set under a gear beside the customer's language by pressing it; in the
// message box it translates what was typed and shows it above the box. It is caught before the page's own
// handling of Enter, so that a shortcut with Enter translates instead of sending.
for (const required of ["const AI_SHORTCUT_DEFAULT = 'Ctrl+Enter';", 'if (event.isComposing || event.keyCode === 229 || aiShortcutOf(event) !== aiShortcut()) return;', "fidForms['ai-shortcut-form'] = (f, v) => {", 'aiSettings().translateKey = combo;', "</select></label>${aiShortcutGear()}`;", "if (event.target.closest?.('[data-ai-shortcut]')) aiShortcutOpen();", 'return aiShortcutReady(c) ? `${keys}；${esc(aiShortcutLabel(aiShortcut()))} 翻译` : keys;', "aiRun('translate.outbound', aiOutboundInput(c, text), { customerId: c.id }).then(result => {"]) {
  assert(aiSource.includes(required), `fidelity-ai.js is missing ${required}`);
```

Replace them with:

```text
assert.equal(pricePage.match(/priceMoney\(/g).length, 2, 'a price must be shown and quoted only through priceShown');
// The translation shortcut (plans 060 and 062): set under a gear beside the customer's language by pressing it —
// any key, any combination, or modifier keys on their own; in the message box it translates what was typed and
// shows it above the box. It is caught before the page's own handling of Enter, so that a shortcut with Enter
// translates instead of sending, and not while an input method composes.
for (const required of ["const AI_SHORTCUT_DEFAULT = 'Ctrl+Enter';", 'const AI_SHORTCUT_FORM = /^((Ctrl|Alt|Shift|Meta)\\+){0,4}[A-Za-z0-9]{1,24}$/;', 'if (event.isComposing || event.keyCode === 229) return void (aiLone.spoiled = true);', 'if (aiShortcutOf(event) !== aiShortcut()) return;', "if (lone && id === 'composer-text' && lone === aiShortcut()) aiTranslateByShortcut();", "else if (lone && id === 'ai-shortcut-key' && aiRecording) aiShortcutShow(lone);", "if (event.target.id === 'ai-shortcut-key') aiShortcutRecord(true);", "fidForms['ai-shortcut-form'] = (f, v) => {", 'aiSettings().translateKey = combo;', "</select></label>${aiShortcutGear()}`;", "if (event.target.closest?.('[data-ai-shortcut]')) aiShortcutOpen();", 'const shortcut = aiShortcut(), named = `${esc(aiShortcutLabel(shortcut))} 翻译`;', "aiRun('translate.outbound', aiOutboundInput(c, text), { customerId: c.id }).then(result => {"]) {
  assert(aiSource.includes(required), `fidelity-ai.js is missing ${required}`);
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
}
assert(aiSource.includes('    aiShortcutShow(combo);\n  }, true);\n'), 'the shortcut must be caught before the page sends on Enter');
assert(read(path.join(out, 'icons.js')).includes('"Settings":[["path"'), 'the gear must be in the icon pool');
```

Replace them with:

```text
}
assert(aiSource.includes('    if (combo) aiShortcutShow(combo);\n  }, true);\n'), 'the shortcut must be caught before the page sends on Enter');
assert(!aiSource.includes('AI_SHORTCUT_TAKEN'), 'any key can be the shortcut: no combination is refused (plan 062)');
assert(read(path.join(out, 'icons.js')).includes('"Settings":[["path"'), 'the gear must be in the icon pool');
```

**Edit 3.3** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  pinnedChats: 'a right-click (or the menu key) on a chat in the list opens a menu with 置顶 / 取消置顶; pinned chats stay at the top of the list in every filter and search, in the order of their last message, marked with a pin; kept with the customer in this workspace, WhatsApp on the phone unchanged',
  translateShortcut: 'a key combination set under the gear beside the customer\'s language (Ctrl + Enter at first; Ctrl or Alt, maybe Shift, and a letter or Enter; combinations that typing, sending or the browser need are refused) translates the message box into the customer\'s language and shows it above the box, guard on or off; Enter then sends the translation; the line under the box names it',
  priceCurrency: 'one currency for the whole price list, chosen in the confirm dialog of an upload (18 currencies or none) and starting on the one the headers name; every price shown on the page and quoted into the message box carries it ("USD 40") unless the file gives the price with its own sign; a list saved before keeps the currencies of its headers',
```

Replace them with:

```text
  pinnedChats: 'a right-click (or the menu key) on a chat in the list opens a menu with 置顶 / 取消置顶; pinned chats stay at the top of the list in every filter and search, in the order of their last message, marked with a pin; kept with the customer in this workspace, WhatsApp on the phone unchanged',
  translateShortcut: 'a key, a combination or modifier keys on their own, recorded under the gear beside the customer\'s language once its field is clicked (Ctrl + Enter at first; any key, plan 062), translates the message box into the customer\'s language and shows it above the box, guard on or off; Enter (or the send button, when Enter is the shortcut) then sends the translation; the line under the box names it',
  priceCurrency: 'one currency for the whole price list, chosen in the confirm dialog of an upload (18 currencies or none) and starting on the one the headers name; every price shown on the page and quoted into the message box carries it ("USD 40") unless the file gives the price with its own sign; a list saved before keeps the currencies of its headers',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `1d9dcbc620aef890458aec3270377f69accf940acbe531a2e5f2164320b55e85`; `git checkout 6daf415 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else (if `icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one); `sha256sum outputs/wa-replica-prototype/app.js` → `a257cdeaa88b933ae0f6ac9b525805a205280a215d733102f0c7e53360fc7771`. If a checksum does not match, restore the file with `git checkout 6daf415 -- <file>` and apply its instructions again; if it still does not match, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 翻译快捷键可以设为任意键 · 2026-11-24

翻译快捷键不再限于「Ctrl 或 Alt 加一个字母或 Enter」：任意一个键或组合键都可以设置，例如 F2、`、Tab、单独一个字母，也可以单独按 Ctrl、Alt 等修饰键。

- 设置方法：在「客户语言」右边的齿轮里，点击快捷键框（或选中后按 Enter、空格），框里显示「请按下新的快捷键…」，再按下想用的键，然后点「保存」。录制时 Tab、Esc 也会被当作快捷键；没在录制时，Tab 和 Esc 照常切换焦点和关闭窗口。
- 单独按修饰键（例如只按一下 Ctrl）时，在松开按键时触发翻译；和其他键一起按（例如 Ctrl + C）不会触发。
- 设为单独的字母、数字、空格、Enter 或 Shift 等键后，在消息框里按它就会翻译，不再输入、发送或换行。快捷键是 Enter 时，消息框下方的提示和翻译后的提示会改为「点击发送」。
- 浏览器自己的快捷键（例如 Ctrl + W 关闭标签页）网页收不到，按下时由浏览器处理。
- 之前设置的快捷键保持不变。

验证：构建与校验脚本通过；浏览器测试覆盖录制各种按键（功能键、符号键、单独字母、Enter、Tab、Esc、单独的 Ctrl、Ctrl + Shift 组合、浏览器快捷键）、没在录制时 Tab 与 Esc 的原有作用、在消息框里用这些键翻译（包括单独按 Ctrl 和以 Enter 为快捷键时用发送按钮发送）、输入法输入中不触发，以及窄屏下的设置框。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout 6daf415 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && bash /tmp/wa-scrm-plan-062/smoke.sh
```

**Verify**: build exit 0 with `"icons": 87`; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `5b0ecac3318055c3b47d4ac8d6a186c0b5fcd5cd935fb5c8dd22494c12b7e2ff`; `git status --porcelain` lists exactly these five as changed and nothing as new: the three files of the table in "Current state" and `outputs/wa-replica-prototype/app.js`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the facts of the change (the block replaced in Step 3): the default, the form that accepts any key, the listener of the message box (input methods, then the shortcut), the keyup that lets modifier keys on their own count, the click that starts recording, the form handler, the gear and its click, the line under the box, the request for the translation; all of them in the source and in the built `app.js`; the capture phase; and that no refusal list is left.
- **Smoke** (`/tmp/wa-scrm-plan-062/smoke.sh`) — the same facts, which built files changed and the syntax of the built page.
- **Verified by the reviewer, not by you**: in a browser against a stand-in server and model service — before a click the field records nothing and Tab and Escape keep their use; after a click F2, the backquote key, a letter, Enter, Ctrl + W, a key of the number pad, Ctrl + Shift + K, Alt + 1, the quote and the backslash are taken without a refusal, and Tab and Escape too; Ctrl alone and Ctrl + Shift alone; Enter on the field starts recording; leaving the field stops it; F2 saved and used (translates, Enter sends the translation); the backquote key translates and is not typed; Ctrl alone translates when let go while Ctrl + A does not; Enter as the shortcut with the send button; Shift + Enter as the shortcut; input methods; the default again; a stored value that names no key; a 390 px screen; the earlier browser sessions.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 6daf415 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `bash /tmp/wa-scrm-plan-062/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-ai.js` → `20ca788021e78b11bd5bd95e97350550ef1bd444e502809d6bed7ebbb3d15bd3`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `1d9dcbc620aef890458aec3270377f69accf940acbe531a2e5f2164320b55e85`
- [ ] `sha256sum replica/build-log.md` → `5b0ecac3318055c3b47d4ac8d6a186c0b5fcd5cd935fb5c8dd22494c12b7e2ff`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `a257cdeaa88b933ae0f6ac9b525805a205280a215d733102f0c7e53360fc7771`
- [ ] `git diff --name-only 6daf415..HEAD -- outputs` lists `app.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only 6daf415..HEAD -- . ':!plans'` lists exactly five paths: the three of the table in "Current state" and the two output files
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, or the build reports another number of icons than 87.
- An output file other than `app.js` and `validation.json` changes.
- The work appears to require editing an out-of-scope file, creating a file or installing a package.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else. Shortcuts set before stay as they are.
- A shortcut is matched by the physical key (`event.code`): on a keyboard layout other than the usual one the sign shown may differ from the key cap; the key works all the same.
- The lone-modifier state (`aiLone`) is shared by the message box and the panel's field, which never have the focus at once; a keyup anywhere else resets it.
- What a reviewer should scrutinise: that the shortcut never sends; that the capture listener stops the event only when the key is the shortcut; that the field traps no keyboard user (Tab and Escape before a click); that every text put into the page goes through `esc`.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
