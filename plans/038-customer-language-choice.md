# Plan 038: The customer's language is chosen in the conversation; nothing presets it

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat fdff491..HEAD -- work/wa-replica replica/build-log.md outputs README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S–M
- **Risk**: MEDIUM (the language decides whether and into what a reply is translated before it is sent; exact text and checksums for every edit)
- **Depends on**: plans/036-delete-a-to-do.md (DONE)
- **Category**: feature (owner request)
- **Planned at**: commit `fdff491`, 2026-11-22

## Why this matters

A reply an employee types is translated into the customer's language before it is sent. Which language that is comes from the customer's record — and every customer made from a WhatsApp chat (all 87 the owner imported) got the value "其他" ("other") by itself, which means "send as typed". There was no place in the conversation to change it, and the form for a customer made by hand offered three fixed values (英语 / 西班牙语 / 其他). So for the owner's real customers replies could not be translated at all.

The owner, 2026-11-22, with a marked-up screenshot of the conversation: "the customer's language should not be preset during customer import or synchronization. Instead, it should be selectable — similar to how the 'wa-translation' plugin handles it — perhaps via a toolkit placed in the top-right corner (or another suitable location of your choosing). Please avoid hardcoding these settings wherever possible." (The plugin lets the outgoing language be picked separately for each chat.) The words beside the message box ("其他 · 发送原文") were found fine as a display.

What this plan does:

- **Nothing presets a language.** A customer made from a WhatsApp chat has none (`language: ''`). Records that carry the old "其他" count as "none chosen" as well.
- **A choice in the conversation**, at the right of the strip above the messages (the place the owner marked): "客户语言" with "未选择（发送原文）", twenty common languages, and "其他语言…", which asks for any language by name. The choice is kept on the customer, noted in the customer's history, and takes effect at once: a translation that was made for the previous language is dropped and the typed words stay.
- **One list instead of three fixed values.** The form for a customer made by hand uses the same list and starts with none chosen.
- Where the page shows a customer's language (the head of a conversation, the words beside the message box, the customer list, the to-do queue, the customer's file), a customer without one shows "未选语言".
- **A list box that is being chosen from is not drawn away.** The page draws itself again whenever something arrives from WhatsApp — a message, a receipt — and that would close an open list box under the pointer, in a busy conversation every few seconds. While a list box of the two strips above a conversation (the customer's language, the grade, the status) has the focus, such a redraw is put off until the choice is made or the list box is left, and for ten seconds at most.

### Decisions already made (do not re-open; do not ask)

- The hold on redraws covers the list boxes of the two strips above a conversation only (`.lc-chat-strip`, `.source-strip`), whose change always draws the page again and so gives the focus up; it ends after ten seconds at the latest, so a list box that merely kept the focus cannot hold new messages back. Nothing is lost while it holds: what arrives is applied and saved at once, only the drawing waits.

- Without a chosen language a reply is sent as typed, as it was for "其他". The page does not guess a language from the customer's messages.
- The list is written in Chinese like the rest of the page; the model service is given the name as it is chosen or typed.
- The two helpers that read the language are **function declarations**, not constants: the follow-up module is put into the page before the AI module and reads a customer's language while it starts up — as constants they would not exist yet and the page would stay empty. (This happened in the rehearsal.)
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/fidelity-ai.js` | `46fdac3f5d922c750aa73c44bd1e25b9fbc09084df0407f73edc71b89bb86bcc` | `6289f8266361967982e71e5963d21788feb969d05196e4c6432f0f1b0bde7a48` |
| `work/wa-replica/fidelity-lifecycle.js` | `d3ac1bf17663e15edf96d7a86e73592d31080248e5001045c978a562e26c1a52` | `8c4ad74b97ba58b41de5fede571fc15c47bb6d72ed413b727f72dad44bc48df5` |
| `work/wa-replica/fidelity-openwa.js` | `0ce054008d4b937c3a17ec8d139dbf1d976c82252284877d6feff39a71e7c4c0` | `8383ee88dc50da90b29af366a3de77ee05344798cf26b59b0538294de6135ece` |
| `work/wa-replica/fidelity.css` | `3ee213d26d511b033fa87ea5fac95109c5d3ccf6d688c13134735c44af7f462c` | `e6f3ea3a2001500cbad683afd39f69e2264b6d9f2912409595762a3e3b2cc17f` |
| `work/wa-replica/build-fidelity.cjs` | `66e3de016b83a22d74cc2739a39610aa3004f45a7a17c455d9d3965d5addfc0a` | `da080ce1e0e42f6fa686cb38c6488865b0e0ec95a476b1e522f18d008aa40c87` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `8c868f9b9a8823974524e7e8b58f6b6235b82f9e236745e0ab7b7e0889097701` | `23131fd90268f510a1a3ab0faf6832aa3e503ef2ca9365935c12c09e69bb8229` |
| `README.md` | `05a843f3127c93fe6ca556b3f0723a2ad49eedc0b55e15a6609608a14f5945bf` | `802351d586cc388e9c51604f6dee96b90bd059d4519d045c5ecec8ad17bc96c3` |

- `fidelity-ai.js` — the page module of the AI capabilities. A reply is put into `c.language` (`aiOutboundInput`), the send guard and the words beside the message box ask whether `c.language` is "其他" in four places. The module handles its own `change` events in one listener; `fidForms[id]` holds the handlers of forms made with `fidForm(title, id, body)` (the form's id is `<id>-form`; a handler gets `(form, v)` where `v(name)` reads a field, and `error(text)` shows a message in the form). `option(value, label, selected)` makes one `<option>`. `lcLog(customerId, category, text)` adds a line to a customer's history.
- `fidelity-lifecycle.js` — the page module of customers and follow-ups; it is put into the page **before** `fidelity-ai.js`. It shows `c.language` in four places, derives a default for the field "沟通时段与偏好" from it in three, and its form for a new customer lists three fixed languages.
- `fidelity-openwa.js` — makes a customer from a WhatsApp chat (`openwaNewCustomer`), with `language: '其他'`. Its `openwaRefresh()` draws the page again after what the feed delivered, keeping the focus and the caret of the message box; it already waits while text is being composed with an input method (`openwaComposing`) and catches up afterwards (`openwaStale`).
- `build-fidelity.cjs` — the build; `swap(from, to)` rewrites a text of the frozen baseline and fails when it is missing. Four swaps are added: three places where the baseline shows the language, and the strip above a conversation, which gets the choice.
- `fidelity.css` — the page's own styles. `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page; one block is added.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout fdff491 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Syntax of the three page modules | `node -e "for(const f of ['fidelity-ai.js','fidelity-lifecycle.js','fidelity-openwa.js'])new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/'+f,'utf8')+'})');console.log('SYNTAX_OK')"` | `SYNTAX_OK` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 12`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-038/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |
| Icon set | `node -e "const vm=require('vm'),fs=require('fs'),cp=require('child_process');const keys=s=>{const w={};vm.runInNewContext(s,{window:w});return Object.keys(w.WA_ICONS)};const a=keys(cp.execSync('git show fdff491:outputs/wa-replica-prototype/icons.js').toString()),b=keys(fs.readFileSync('outputs/wa-replica-prototype/icons.js','utf8'));console.log('removed='+a.filter(x=>!b.includes(x)).join(',')+' added='+b.filter(x=>!a.includes(x)).join(','))"` | `removed= added=` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-ai.js`, `fidelity-lifecycle.js`, `fidelity-openwa.js`, `fidelity.css`, `build-fidelity.cjs`, `validate-scrm-lifecycle.cjs` (Step 2)
- `README.md`, `replica/build-log.md` (Step 3)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{app.js,app.css,validation.json}` (the other output files must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular the server files (the relay already takes any language name), `fidelity-boot.js`, the other modules, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/038-customer-language-choice` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): choose the customer's language in the conversation`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each change, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the seven source files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-038/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-038 && cat > /tmp/wa-scrm-plan-038/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that the customer's language is chosen in the conversation and that nothing presets it.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'a customer made from a WhatsApp chat gets no preset language' "$(grep -c "language: '其他'" "$W/fidelity-openwa.js")" 0
has 'the helpers that read the language exist from the start of the page' "$P/app.js" 'function aiCustomerLanguage(c) {'
has 'the conversation offers the choice of the language' "$P/app.js" "+aiLanguagePicker(c)+'</div>'"
has 'the words beside the message box show the chosen language or that none is chosen' "$P/app.js" "esc(aiLanguageLabel(c))+' · '+aiDraftHint(c)"
has 'another language can be given by name' "$P/app.js" "fidForms['ai-language-form'] = (f, v) => {"
has 'the form for a new customer uses the same list' "$P/app.js" "...AI_CUSTOMER_LANGUAGES.map(language => [language, language])"
has 'a redraw waits while a list box of the conversation is chosen from' "$P/app.js" "const chosenFrom = document.activeElement?.tagName === 'SELECT' && document.activeElement.closest('.lc-chat-strip, .source-strip');"
has 'the built styles know the choice' "$P/app.css" '.ai-language-pick'
has 'the README says where the language is chosen' "$ROOT/README.md" '系统不预设客户语言'
same 'the page modules pass the syntax check' "$(cd "$ROOT" && node -e "for(const f of ['fidelity-ai.js','fidelity-lifecycle.js','fidelity-openwa.js'])new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/'+f,'utf8')+'})');console.log('SYNTAX_OK')" 2>&1)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-038/smoke.sh && ls -l /tmp/wa-scrm-plan-038/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-ai.js work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity.css work/wa-replica/build-fidelity.cjs work/wa-replica/validate-scrm-lifecycle.cjs README.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-038/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `a customer made from a WhatsApp chat gets no preset language` (got: 1), `the helpers that read the language exist from the start of the page`, `the conversation offers the choice of the language`, `the words beside the message box show the chosen language or that none is chosen`, `another language can be given by name`, `the form for a new customer uses the same list`, `a redraw waits while a list box of the conversation is chosen from`, `the built styles know the choice` and `the README says where the language is chosen` (nine checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The page: the choice of the language, and no preset

#### `fidelity-ai.js`

**Edit 2.1** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
  };
  // Languages offered for the translation shown below incoming messages.
```

Replace them with:

```text
  };
  // Languages offered for a customer: the language replies are put into. Any other language can be typed in.
  const AI_CUSTOMER_LANGUAGES = ['英语', '西班牙语', '葡萄牙语', '法语', '德语', '意大利语', '荷兰语', '波兰语', '俄语', '土耳其语', '阿拉伯语', '印地语', '印尼语', '马来语', '越南语', '泰语', '菲律宾语', '日语', '韩语', '中文'];
  // A language name as the relay accepts it: letters of any script, spaces and a few separators.
  const AI_LANGUAGE_NAME = /^[\p{L}\p{M} ()·-]{1,40}$/u;
  // The customer's language, or '' while none is chosen. Nothing presets it: a customer made from a WhatsApp
  // chat has none until someone chooses one in the conversation. ('其他' is how older records say "none".)
  // Function declarations, because the follow-up module, which comes first in the page, reads a language while
  // it starts up.
  function aiCustomerLanguage(c) {
    return c?.language && c.language !== '其他' ? c.language : '';
  }
  function aiLanguageLabel(c) {
    return aiCustomerLanguage(c) || '未选语言';
  }
  // Languages offered for the translation shown below incoming messages.
```

**Edit 2.2** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
    if (!hint) return;
    hint.innerHTML = icon('Languages') + esc(c.language) + ' · ' + aiDraftHint(c);
    paintIcons(hint);
```

Replace them with:

```text
    if (!hint) return;
    hint.innerHTML = icon('Languages') + esc(aiLanguageLabel(c)) + ' · ' + aiDraftHint(c);
    paintIcons(hint);
```

**Edit 2.3** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
      .filter(message => message.text.trim());
    return { text, to: c.language, tone: settings.tone, business: settings.business, context };
  }
```

Replace them with:

```text
      .filter(message => message.text.trim());
    return { text, to: aiCustomerLanguage(c), tone: settings.tone, business: settings.business, context };
  }
```

**Edit 2.4** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
  // Send guard. While the relay is in use, a reply that is not in the customer's language is translated first
  // and sent only after a second Enter. A customer whose language is '其他' (other) is not guarded.
  // These helpers run while the page is drawn, so they read the saved settings without creating them.
```

Replace them with:

```text
  // Send guard. While the relay is in use, a reply that is not in the customer's language is translated first
  // and sent only after a second Enter. A customer without a chosen language is not guarded.
  // These helpers run while the page is drawn, so they read the saved settings without creating them.
```

**Edit 2.5** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
  function aiGuardActive(c) {
    return aiRuntime.provider === 'server' && aiGuardOn() && data.ai?.enabled?.['translate.outbound'] !== false && c.language !== '其他';
  }
```

Replace them with:

```text
  function aiGuardActive(c) {
    return aiRuntime.provider === 'server' && aiGuardOn() && data.ai?.enabled?.['translate.outbound'] !== false && Boolean(aiCustomerLanguage(c));
  }
```

**Edit 2.6** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
  function aiGuardHTML(c) {
    if (aiRuntime.provider !== 'server' || c.language === '其他') return '';
    const on = aiGuardOn();
```

Replace them with:

```text
  function aiGuardHTML(c) {
    if (aiRuntime.provider !== 'server' || !aiCustomerLanguage(c)) return '';
    const on = aiGuardOn();
```

**Edit 2.7** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
    persist();
    // Without a model service, or for a customer whose language is '其他' (other), the original is sent.
    if (!aiRuntime.provider || c.language === '其他') return aiRefreshDraftPreview(c);
    const request = {};
```

Replace them with:

```text
    persist();
    // Without a model service, or for a customer without a chosen language, the original is sent.
    if (!aiRuntime.provider || !aiCustomerLanguage(c)) return aiRefreshDraftPreview(c);
    const request = {};
```

**Edit 2.8** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text

  document.addEventListener('change', event => {
    if (event.target.dataset?.aiSetting === 'readLanguage') {
```

Replace them with:

```text

  // ---- the customer's language ----
  // The choice in the strip above a conversation: none, one of the listed languages, or any other by name.
  function aiLanguagePicker(c) {
    const current = aiCustomerLanguage(c);
    const listed = !current || AI_CUSTOMER_LANGUAGES.includes(current) ? AI_CUSTOMER_LANGUAGES : [current, ...AI_CUSTOMER_LANGUAGES];
    return `<label class="ai-language-pick">${icon('Languages')}<span>客户语言</span><select class="fid-select" data-ai-language="${esc(c.id)}" aria-label="客户语言">${option('', '未选择（发送原文）', current)}${listed.map(language => option(language, language, current)).join('')}${option('__other', '其他语言…', current)}</select></label>`;
  }
  // Sets the customer's language ('' for none). A translation made for another language no longer fits the
  // draft, so the draft goes back to what was typed.
  function aiSetLanguage(c, language) {
    if (aiCustomerLanguage(c) === language) return;
    c.language = language;
    const d = ui.drafts[c.id];
    if (d) Object.assign(d, { translated: '', source: '' });
    aiDraftPending.delete(c.id);
    lcLog(c.id, 'profile', language ? `客户语言设为${language}` : '取消客户语言');
    persist();
    render();
    toast(language ? `客户语言已设为${language}，回复会先译为${language}。` : '已取消客户语言，回复按原文发送。');
  }
  fidForms['ai-language-form'] = (f, v) => {
    const c = customer(v('customer')), language = v('language').replace(/\s+/g, ' ').trim();
    if (!c) return;
    if (!AI_LANGUAGE_NAME.test(language) || language === '其他') return error('请填写语言的名称，例如 希腊语；只能包含文字、空格和括号。');
    close();
    aiSetLanguage(c, language);
  };

  document.addEventListener('change', event => {
    if (event.target.dataset?.aiLanguage) {
      const c = customer(event.target.dataset.aiLanguage), value = event.target.value;
      if (!c) return;
      if (value !== '__other') return aiSetLanguage(c, value);
      // Another language: asked for by name; the choice shows the current language again until it is given.
      event.target.value = aiCustomerLanguage(c);
      fidForm('其他语言', 'ai-language', `<input type="hidden" name="customer" value="${esc(c.id)}">${fidFormRow('语言名称', `<input class="fid-input" style="width:100%" name="language" maxlength="40" placeholder="例如 希腊语">`)}<p class="fid-field-help">回复会先译为这种语言，确认后再发送。</p>`);
      return;
    }
    if (event.target.dataset?.aiSetting === 'readLanguage') {
```

#### `fidelity-lifecycle.js`

**Edit 2.9** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
        objection: '',
        commWindow: `${c.language || '英语'}沟通`,
        ...(c.qualification || {}),
```

Replace them with:

```text
        objection: '',
        commWindow: aiCustomerLanguage(c) ? `${aiCustomerLanguage(c)}沟通` : '',
        ...(c.qualification || {}),
```

**Edit 2.10** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
                <span>·</span>
                <span>${esc(c.language)}</span>
              </div>
```

Replace them with:

```text
                <span>·</span>
                <span>${esc(aiLanguageLabel(c))}</span>
              </div>
```

**Edit 2.11** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
      return `<tr${focus?.task === t.id ? ' class="lc-row-focus"' : ''}>
        <td style="text-align:left"><button type="button" class="fid-link" data-action="profile" ${fidActionID(c.id)}><strong>${esc(c.name)}</strong></button><span class="fid-cell-detail">${esc(account(c.account)?.name || '')} · ${esc(c.language)}</span></td>
        <td style="text-align:left">${tagCell(c)}</td>
```

Replace them with:

```text
      return `<tr${focus?.task === t.id ? ' class="lc-row-focus"' : ''}>
        <td style="text-align:left"><button type="button" class="fid-link" data-action="profile" ${fidActionID(c.id)}><strong>${esc(c.name)}</strong></button><span class="fid-cell-detail">${esc(account(c.account)?.name || '')} · ${esc(aiLanguageLabel(c))}</span></td>
        <td style="text-align:left">${tagCell(c)}</td>
```

**Edit 2.12** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
        <td><button type="button" class="fid-link fid-tag-cell" data-action="fidViewCustomerTags" ${fidActionID(c.id)} aria-label="查看${esc(c.name)}的标签，共 ${assigned.length} 个">${tagPreview}${tagDetail}</button></td>
        <td>${esc(c.phone)}<span class="fid-cell-detail">${esc(country(c))} · ${esc(c.language)}</span></td>
        <td><span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span><span class="fid-cell-detail">${h.nextTask ? esc(dateLabel(h.nextTask.due)) : '无待办'}</span></td>
```

Replace them with:

```text
        <td><button type="button" class="fid-link fid-tag-cell" data-action="fidViewCustomerTags" ${fidActionID(c.id)} aria-label="查看${esc(c.name)}的标签，共 ${assigned.length} 个">${tagPreview}${tagDetail}</button></td>
        <td>${esc(c.phone)}<span class="fid-cell-detail">${esc(country(c))} · ${esc(aiLanguageLabel(c))}</span></td>
        <td><span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span><span class="fid-cell-detail">${h.nextTask ? esc(dateLabel(h.nextTask.due)) : '无待办'}</span></td>
```

**Edit 2.13** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
          <span class="conversation-account">
            <span><span class="state-dot ${a?.state === 'online' ? '' : a?.state === 'pending' ? 'offline' : 'warning'}"></span>${esc(ui.account === 'all' ? a?.name : c.language)}</span>
          </span>
```

Replace them with:

```text
          <span class="conversation-account">
            <span><span class="state-dot ${a?.state === 'online' ? '' : a?.state === 'pending' ? 'offline' : 'warning'}"></span>${esc(ui.account === 'all' ? a?.name : aiLanguageLabel(c))}</span>
          </span>
```

**Edit 2.14** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
       ${fidFormRow('归属接待号', `<select class="fid-select" style="width:100%" name="account">${accounts.map(a => option(a.id, a.name, accounts[0].id)).join('')}</select>`)}
       ${fidFormRow('沟通语言', `<select class="fid-select" style="width:100%" name="language">${fidOption(['英语', '西班牙语', '其他'], '英语')}</select>`)}
       ${fidFormRow('国家地区', `<select class="fid-select" style="width:100%" name="country">${fidOption([['US', '美国'], ['PR', '波多黎各'], ['OTHER', '其他地区']], 'US')}</select>`)}
```

Replace them with:

```text
       ${fidFormRow('归属接待号', `<select class="fid-select" style="width:100%" name="account">${accounts.map(a => option(a.id, a.name, accounts[0].id)).join('')}</select>`)}
       ${fidFormRow('沟通语言', `<select class="fid-select" style="width:100%" name="language">${fidOption([['', '未选择'], ...AI_CUSTOMER_LANGUAGES.map(language => [language, language])], '')}</select>`)}
       ${fidFormRow('国家地区', `<select class="fid-select" style="width:100%" name="country">${fidOption([['US', '美国'], ['PR', '波多黎各'], ['OTHER', '其他地区']], 'US')}</select>`)}
```

**Edit 2.15** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
        reactivatedCount: 0,
        qualification: { demand: v('demand'), volume: '', deliveryRegion: country({ country: v('country') }), objection: '', commWindow: v('language') + '沟通' },
      };
```

Replace them with:

```text
        reactivatedCount: 0,
        qualification: { demand: v('demand'), volume: '', deliveryRegion: country({ country: v('country') }), objection: '', commWindow: v('language') ? v('language') + '沟通' : '' },
      };
```

**Edit 2.16** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
        objection: '',
        commWindow: (c.language || '英语') + '沟通',
      };
```

Replace them with:

```text
        objection: '',
        commWindow: aiCustomerLanguage(c) ? aiCustomerLanguage(c) + '沟通' : '',
      };
```

#### `fidelity-openwa.js`

**Edit 2.17** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    const c = { id: nextId('c'), name, initials: initial(name), color: 'blue', phone: e.phone ? '+' + e.phone : '', waChat: e.chat,
      country: a.country || '', city: '', timezone: '', language: '其他', owner: a.owner || ui.persona, account: a.id, tags: [], engagement: 'open',
      source: '未知来源', campaign: '', ad: '', unread: 0, star: false, last: '', preview: '', translation: '', followup: null, notes: '',
```

Replace them with:

```text
    const c = { id: nextId('c'), name, initials: initial(name), color: 'blue', phone: e.phone ? '+' + e.phone : '', waChat: e.chat,
      country: a.country || '', city: '', timezone: '', language: '', owner: a.owner || ui.persona, account: a.id, tags: [], engagement: 'open',
      source: '未知来源', campaign: '', ad: '', unread: 0, star: false, last: '', preview: '', translation: '', followup: null, notes: '',
```

**Edit 2.18** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
  document.addEventListener('compositionend', () => { openwaComposing = false; if (openwaStale) openwaRefresh(); });
  function openwaRefresh() {
    if (openwaComposing) return void (openwaStale = true);
    openwaStale = false;
```

Replace them with:

```text
  document.addEventListener('compositionend', () => { openwaComposing = false; if (openwaStale) openwaRefresh(); });
  // A list box in the strips above a conversation (the customer's language, grade, status) that has the focus is
  // being chosen from: drawing the page again would close it under the pointer. A refresh is put off until the
  // choice is made or the list box is left — and for ten seconds at most, so that a list box that merely kept
  // the focus cannot hold new messages back.
  const OPENWA_HOLD_MS = 10000;
  let openwaHold = 0;
  for (const type of ['change', 'focusout']) {
    document.addEventListener(type, event => {
      if (event.target?.tagName === 'SELECT') setTimeout(() => { if (openwaStale) openwaRefresh(); }, 0);
    });
  }
  function openwaRefresh() {
    if (openwaComposing) return void (openwaStale = true);
    const chosenFrom = document.activeElement?.tagName === 'SELECT' && document.activeElement.closest('.lc-chat-strip, .source-strip');
    if (chosenFrom && openwaHold !== -1) {
      openwaHold ||= setTimeout(() => {
        openwaHold = -1;
        if (openwaStale) openwaRefresh();
      }, OPENWA_HOLD_MS);
      return void (openwaStale = true);
    }
    clearTimeout(openwaHold);
    openwaHold = 0;
    openwaStale = false;
```

#### `fidelity.css`

**Append 2.19** — `work/wa-replica/fidelity.css`. Add at the end of the file, after one empty line:

```text
/* The choice of a customer's language, at the right of the strip above a conversation (plan 038). Where the
   conversation is narrow, the list box of the choice narrows before anything sticks out of the strip. */
.source-strip .ai-language-pick { margin-left:auto; display:inline-flex; align-items:center; gap:6px; min-width:0; color:var(--color-text-muted); font-size:12px; white-space:nowrap; }
.ai-language-pick svg { width:14px; height:14px; flex:none; }
.ai-language-pick span { flex:none; }
.ai-language-pick .fid-select { height:28px; min-width:0; flex:0 1 auto; padding:0 8px; font-size:12px; }
```

#### `build-fidelity.cjs`

**Edit 2.20** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
swap(`<div class="message-bubble"><div class="message-text">'+esc(m.text)+'</div>'`, `<div class="message-bubble">'+openwaMediaHTML(c,m)+(openwaCaption(c,m)?'<div class="message-text">'+esc(openwaCaption(c,m))+'</div>':'')`);
new vm.Script(js, {filename:'app.js'});
```

Replace them with:

```text
swap(`<div class="message-bubble"><div class="message-text">'+esc(m.text)+'</div>'`, `<div class="message-bubble">'+openwaMediaHTML(c,m)+(openwaCaption(c,m)?'<div class="message-text">'+esc(openwaCaption(c,m))+'</div>':'')`);
// The customer's language is chosen in the conversation and nothing presets it (plan 038): the baseline's chat
// head, the words beside the message box and the strip above the conversation use what fidelity-ai.js gives.
swap("<span>'+esc(c.language)+'</span></div></div><div class=\"chat-heading-acti", "<span>'+esc(aiLanguageLabel(c))+'</span></div></div><div class=\"chat-heading-acti");
swap("<span class=\"language-hint\">'+icon('Languages')+esc(c.language)+' · '+aiDraftHint(c)+'</span>'", "<span class=\"language-hint\">'+icon('Languages')+esc(aiLanguageLabel(c))+' · '+aiDraftHint(c)+'</span>'");
swap("hint.innerHTML=icon('Languages')+esc(c.language)+' · '+aiDraftHint(c);", "hint.innerHTML=icon('Languages')+esc(aiLanguageLabel(c))+' · '+aiDraftHint(c);");
swap("<span>'+esc(c.campaign||'客户来源')+'</span></div>'", "<span>'+esc(c.campaign||'客户来源')+'</span>'+aiLanguagePicker(c)+'</div>'");
new vm.Script(js, {filename:'app.js'});
```

#### `validate-scrm-lifecycle.cjs`

**Edit 2.21** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(read(path.join(__dirname, 'fidelity-openwa.js')).includes("aria-label=\"语音\"></audio></div>` + aiTranscriptHTML(c, m);"), 'a voice note must show its words or the button that asks for them');
// 22. The page uses the real WhatsApp connection through its own server; nothing simulates it any more.
```

Replace them with:

```text
assert(read(path.join(__dirname, 'fidelity-openwa.js')).includes("aria-label=\"语音\"></audio></div>` + aiTranscriptHTML(c, m);"), 'a voice note must show its words or the button that asks for them');
// The customer's language is chosen in the conversation; nothing presets it, and the helpers that read it exist
// from the start of the page (the follow-up module reads a language while it starts up).
for (const required of ['function aiCustomerLanguage(c) {', 'function aiLanguageLabel(c) {', 'function aiLanguagePicker(c) {', "fidForms['ai-language-form'] = (f, v) => {", 'data-ai-language=', "to: aiCustomerLanguage(c),"]) {
  assert(read(path.join(__dirname, 'fidelity-ai.js')).includes(required), `fidelity-ai.js is missing ${required}`);
}
assert(!/language: '其他'/.test(read(path.join(__dirname, 'fidelity-openwa.js'))), 'a customer made from a WhatsApp chat must not get a preset language');
assert(read(path.join(__dirname, 'fidelity-openwa.js')).includes("const chosenFrom = document.activeElement?.tagName === 'SELECT' && document.activeElement.closest('.lc-chat-strip, .source-strip');"), 'a refresh must not draw the page again under a list box that is being chosen from');
assert.equal((appJs.match(/\.language (===|!==) '其他'/g) || []).length, 1, 'whether a customer has a language is asked through aiCustomerLanguage, the only place that knows the old value');
assert(appJs.includes("+aiLanguagePicker(c)+'</div>'") && appJs.includes("esc(aiLanguageLabel(c))+' · '+aiDraftHint(c)"), 'the conversation must offer the choice of the customer\'s language and show it beside the message box');
// 22. The page uses the real WhatsApp connection through its own server; nothing simulates it any more.
```

**Verify**: `sha256sum work/wa-replica/fidelity-ai.js work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity.css work/wa-replica/build-fidelity.cjs work/wa-replica/validate-scrm-lifecycle.cjs` → `6289f8266361967982e71e5963d21788feb969d05196e4c6432f0f1b0bde7a48`, `8c4ad74b97ba58b41de5fede571fc15c47bb6d72ed413b727f72dad44bc48df5`, `8383ee88dc50da90b29af366a3de77ee05344798cf26b59b0538294de6135ece`, `e6f3ea3a2001500cbad683afd39f69e2264b6d9f2912409595762a3e3b2cc17f`, `da080ce1e0e42f6fa686cb38c6488865b0e0ec95a476b1e522f18d008aa40c87`, `23131fd90268f510a1a3ab0faf6832aa3e503ef2ca9365935c12c09e69bb8229`; the syntax command → `SYNTAX_OK`; `git checkout fdff491 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84` (a message "Missing prototype source anchor" means one of the four swaps does not match the baseline — STOP); `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; the icon-set command → `removed= added=`; `sha256sum outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/app.css` → `3dabe5bfe420c3d0ee5295a1c39030900cb508054805f0db4a6d75288e089ce3`, `769394d1b72910998168cf041499b40626247553929e08d5b835706791a564dd`. If a checksum does not match, restore the file with `git checkout fdff491 -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 3: README, build log, final verification

**Edit 3.1** — `README.md`. Find exactly these lines (they occur once):

```text

同一个设置文件里的 `VOICE_PROVIDER`、`VOICE_API_KEY`（以及可选的 `VOICE_BASE_URL`、`VOICE_MODEL`）指定语音转文字服务：员工点击语音消息下方的「转文字」时，服务器把这条语音交给语音服务（`/api/wa/transcribe`），文字显示在语音下方并保存在服务器上，同一条语音只转一次。未填写时不显示「转文字」。
```

Replace them with:

```text

回复译成哪种语言由每位客户的「客户语言」决定：在聊天界面会话上方右侧选择（常用语言列表，或选「其他语言…」填写任意语言名称）。系统不预设客户语言——从 WhatsApp 同步或新来信生成的客户没有语言，未选择时回复按原文发送。

同一个设置文件里的 `VOICE_PROVIDER`、`VOICE_API_KEY`（以及可选的 `VOICE_BASE_URL`、`VOICE_MODEL`）指定语音转文字服务：员工点击语音消息下方的「转文字」时，服务器把这条语音交给语音服务（`/api/wa/transcribe`），文字显示在语音下方并保存在服务器上，同一条语音只转一次。未填写时不显示「转文字」。
```

**Append 3.2** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 客户语言在会话中选择，不再预设 · 2026-11-22

此前从 WhatsApp 同步或新来信生成的客户，语言一律被设为「其他」，回复只能按原文发送；手动建档时也只有「英语 / 西班牙语 / 其他」三项。按项目负责人的要求：系统不再预设客户语言，改为在聊天界面选择。

现在：会话上方来源一栏的右侧有「客户语言」下拉框——未选择（发送原文）、二十种常用语言，以及「其他语言…」（填写任意语言名称）。选定后，回复先译为该语言，确认后再发送；改选语言时，草稿里已有的旧译文会被清除；更改记入客户的操作记录。新生成的客户没有语言，聊天头部与输入框旁显示「未选语言」。已有记录里的「其他」按未选择处理。手动建档表单使用同一份语言列表，默认未选择。

另外：会话上方的下拉框（客户语言、等级、客户状态）处于选择状态时，页面不会因为新消息或回执到达而重绘并把下拉框关掉；选定或离开下拉框后立即补上刷新，最多等待 10 秒。
```

Then verify everything once more:

```bash
git checkout fdff491 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-038/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test run ends with `pass 12`, `fail 0`; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `802351d586cc388e9c51604f6dee96b90bd059d4519d045c5ecec8ad17bc96c3`, `67b8207738713f6627ba4d9ab7066ac822a816ff27b16662d5cdca3485dd15a9`; `git status --porcelain` lists exactly eleven paths: `README.md`, `replica/build-log.md`, the six source files under `work/wa-replica/`, and `outputs/wa-replica-prototype/app.js`, `app.css` and `validation.json` (if `outputs/wa-replica-prototype/icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the AI module has the two helpers as function declarations, the choice, the form for a language by name and the language given to the relay through the helper; the module that makes customers from WhatsApp chats presets none; the built page compares with the old value "其他" in exactly one place (the helper); the conversation offers the choice and shows the label beside the message box.
- **Smoke** (`/tmp/wa-scrm-plan-038/smoke.sh`) — the same facts on the sources and the built files, the README, the syntax of the modules and the server tests (12 as before; no server change).
- The build and the validator do not run the page. **Verified by the reviewer in scripted browser sessions, not by you**: the page starts (the rehearsal's fault was a page that stayed empty); a customer made from a chat has no language and the conversation says so; a reply goes out as typed; a listed language is kept, said in a notice and shown, and the next reply is translated into it and not sent before the second Enter; another listed language drops the old translation and keeps the typed words; a language given by name (a name with signs is refused); a line in the history for every change, kept on the server; back to none; a record with the old value counts as none. And the hold: while the list box of the language (or of the grade) has the focus, a message that arrives does not draw the page again — the list box stays the same element and keeps the focus, the list of conversations keeps its old preview — and the redraw follows once a choice is made, once the list box is left, or after ten seconds; nothing is lost or doubled. The strip fits at four screen widths down to a phone's. The sessions of the rest of the product and of the connection still pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout fdff491 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-038/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-ai.js` → `6289f8266361967982e71e5963d21788feb969d05196e4c6432f0f1b0bde7a48`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.js` → `8c4ad74b97ba58b41de5fede571fc15c47bb6d72ed413b727f72dad44bc48df5`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js` → `8383ee88dc50da90b29af366a3de77ee05344798cf26b59b0538294de6135ece`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `e6f3ea3a2001500cbad683afd39f69e2264b6d9f2912409595762a3e3b2cc17f`
- [ ] `sha256sum work/wa-replica/build-fidelity.cjs` → `da080ce1e0e42f6fa686cb38c6488865b0e0ec95a476b1e522f18d008aa40c87`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `23131fd90268f510a1a3ab0faf6832aa3e503ef2ca9365935c12c09e69bb8229`
- [ ] `sha256sum README.md` → `802351d586cc388e9c51604f6dee96b90bd059d4519d045c5ecec8ad17bc96c3`
- [ ] `sha256sum replica/build-log.md` → `67b8207738713f6627ba4d9ab7066ac822a816ff27b16662d5cdca3485dd15a9`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `3dabe5bfe420c3d0ee5295a1c39030900cb508054805f0db4a6d75288e089ce3`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `769394d1b72910998168cf041499b40626247553929e08d5b835706791a564dd`
- [ ] the icon-set command prints `removed= added=`
- [ ] `git diff --name-only fdff491..HEAD -- . ':!plans'` lists exactly these eleven: `README.md`, `outputs/wa-replica-prototype/app.css`, `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/build-fidelity.cjs`, `work/wa-replica/fidelity-ai.js`, `work/wa-replica/fidelity-lifecycle.js`, `work/wa-replica/fidelity-openwa.js`, `work/wa-replica/fidelity.css`, `work/wa-replica/validate-scrm-lifecycle.cjs`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build stops with "Missing prototype source anchor" or another assertion, reports another number of icons than 84, a test fails, or the validator fails.
- An output file other than `app.js`, `app.css` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file.

## Maintenance notes

- **Deployment**: only page files change; no restart is needed after the merge. Open pages get the choice at their next refresh. The owner's imported customers carry the old value "其他", which now counts as "none chosen": nothing has to be converted.
- A module that is put into the page earlier must not use a constant of a later module while it starts up; helpers shared across modules are function declarations. The build does not run the page, so only a browser shows such a fault.
- The hold in `openwaRefresh` looks at which element has the focus; a browser gives no way to ask whether a list box is open. If another list box is ever added to the two strips and its change does not draw the page again, the ten-second limit is what keeps the page from standing still.
- The list of languages is one constant, `AI_CUSTOMER_LANGUAGES` in `fidelity-ai.js`; the form for a new customer reads it too. A language outside the list is kept as it was typed and is offered first in that customer's choice.
- What a reviewer should scrutinise: that no reply is translated or held back for a customer without a language, that changing the language never sends anything, and that a typed language name reaches the page only through `esc`.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
