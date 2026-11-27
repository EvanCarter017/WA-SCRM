# Plan 090: The WhatsApp API page — 号码管理 in the place of 账号列表, a larger conversation, WhatsApp-sized bubbles and a WhatsApp-style message box

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 6ba9d27..HEAD -- work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity-ui.js work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-ai.js work/wa-replica/build-fidelity.cjs work/wa-replica/fidelity.css work/wa-replica/fidelity-lifecycle.css work/wa-replica/validate-scrm-lifecycle.cjs README.md replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM (the layout of the page employees use all day; one page renamed and one removed from the menu; exact text and checksums for every file)
- **Depends on**: plans/088-rollback.md (DONE; the look this plan starts from) and plans/091-qr-polling.md (DONE; it changed other parts of `fidelity-openwa.js`, the validator and the build log first)
- **Category**: owner request of 2026-11-27, with a preview the owner approved before anything was built
- **Planned at**: commit `6ba9d27`, 2026-11-27

## Why this matters

The owner, 2026-11-27: "Remove 'Account Management' and replace it with 'Number Management' for the WhatsApp API. Free up the main area of the WhatsApp API interface to allow for a larger chat window and smaller chat bubbles. Adjust the input box at the bottom so that it aligns more closely with the style of the additional toolbar found in WhatsApp."

An employee sees 账号列表 (the owner's browser translates it) in the left menu under WhatsApp API, in the row of page tabs and as the accounts page; 号码管理 (number management) was a tab inside WhatsApp API behind a switch 号码管理 / 在线聊天. On the chat page, at 1366 × 768, the messages had 185 px of 768: the top bar, the row of page tabs, the switch, the chat heading, a row with the number, the follow-up strip on two lines, a row with the source and the customer's language, and a message box with a line of hints below it.

A preview of this plan's layout, made on the real page with the test data, was shown to the owner, who answered: "Yes, build it"; for the accounts page with its own functions (rename a number, add one by hand, remove one that is no longer linked, batch notes, counter reset) "remove it"; for the message box tools "Toolbar above (Recommended)".

Measured on the reviewer's build of this plan: the messages get 478 px at 1366 × 768 (62%), 610 px at 1440 × 900, 790 px at 1920 × 1080, 395 px at 1024 × 768 and 447 px at 390 × 844 (a phone), with no sideways scroll and nothing cut off at any of these sizes.

### Decisions already made (do not re-open; do not ask)

- **号码管理 is a page of its own** (`#numbers`, drawn by the existing `renderOpenwaNumbers`) in the place of `accounts`: among the pages (`views`, `pages`), in the left menu under WhatsApp API, among the tabs (after WhatsApp API), with the icon `Smartphone`; `?tab=numbers` opens it. Its top has only 扫码绑定 (`openwaNumbersTop`). WhatsApp API (`#inbox`) always opens the chat: `openwaTabs` and the switch are gone, and `fidWaTab` — still used by the button 前往号码管理 — now navigates. `#accounts` is no longer a page and opens the home page; the code of the old page stays unused (like the materials page since plan 032). The narrow-screen tools of a conversation lead to 号码管理.
- **The chat page**: no row of page tabs (CSS, the chat page only); the conversation takes the height of the page; the dialog backdrop starts below the top bar there. The line under the customer's name also holds the number, its state when it is not connected, and the source (`<span class="openwa-chat-number">`); the row of the number is gone and the source strip is hidden (it stays in the markup, because other modules insert before it). The follow-up strip takes one line where it fits and wraps where the conversation is narrow; below 1600 px its four buttons show their icons, with their names as `title`.
- **Bubbles**: tighter (padding, 4 px between messages, 65% of the width at most); the time of a message is a `<span class="message-meta">` inside the bubble at the end of its last block of text (the translation's text, else the message text, else the end of the bubble), floating right, not selectable; the date is a small label.
- **The message box**: `<div class="composer-tools">` above — the customer's language (`aiLanguagePicker`, moved from the source strip, with its gear), the language hint, the send guard, 报价, a 快捷回复 chip, and the keys (`<span class="composer-keys">`, which the AI module now updates) — and `<div class="composer-input">` below: + for files, the message as a rounded field that grows with its text, a round send button. The toolbar wraps where it is narrow; on a phone the keys are hidden. A list box in the toolbar holds the redraw like one in the strip.
- Not changed: what anything does (sending, translating, the send guard, quotes, follow-ups, linking), the colours, the other pages.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text (README.md, replica/build-log.md) is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity-openwa.js` | `b5b85d1207af815de3dd8eefa35ecc51cefd638df18afe57f2ad0b241f2ddd75` | `43edc21f74f9626ecd9f43429bb03e21d3093a072768f0058dc323765acf86af` | 8 |
| `work/wa-replica/fidelity-ui.js` | `ed0d4ad802975f4945368e2855ad39192dfda2ead57d2823bfb818e058028347` | `883b5f154ede5efd78aa40d11779008f5b9b7f15e3b69ec0e3dc387b5cdcb7f3` | 2 |
| `work/wa-replica/fidelity-lifecycle.js` | `21f02ae947a0352cf46c5c9df6e3a52e260a4b2374935fbd69dccac02dbf5764` | `7bd920eb2bcf043f544929ba12d7be748255336dfe86955a226aafef9ed97b69` | 3 |
| `work/wa-replica/fidelity-ai.js` | `656670b61d4f4ea3a888a4419e5cd94b240251b72e8a8d895835507a372c124e` | `a9548dbc0e89a7180f6cca7412d566b2189c7b983457e390f5df020389e1db3e` | 1 |
| `work/wa-replica/build-fidelity.cjs` | `406f9ceb362350963efa7faccb5548a81e2baa028125401762f8c4b30e4a38d5` | `1e9d98a0ad16d8e3e917505dff41b13ae1cfd530f043184d0abf2025ca3861c8` | 4 |
| `work/wa-replica/fidelity.css` | `9f8304468bf32b4d381eb3e1cf3d48179e6f5da166c9ed02621d34e6ad925fc3` | `9746dd866ba14b88d5a43302f111ee158e431bb14defc99f7b7317e5e03aa1aa` | 6 |
| `work/wa-replica/fidelity-lifecycle.css` | `014da84eb055a2c72acba0a3ab779976533c7df77b40a877d04e36e166649e45` | `020ef5181c231bc4e3702a5f1d7e7ba6d23b637152b00af6d9da5e981aeb223a` | 1 append |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `d3e0e50e918a9c6ec1f4a4cd9e612e2373e481edc6fbdaab9569a0946a808d3d` | `0b73c8bd182a4e46032b0cf14cde96dd40178ecb491c5b64c98190901c3da18b` | 8 |
| `README.md` | `19fdabfbf61bb9a7dba7adeb2084d600f8055e0316ce44d18da44d6f10d2d823` | `fcf361e3cba2678a586d7cf624078134c19b9ff67c74599158b29b6ccd60e9b0` | 1 |
| `replica/build-log.md` | `057a9cdbd85951d606a3652b3d246eac7dc18a67dbb2b8c416737669d1872124` | `228fad8cec0c7e619cf1e89c60de456efa966c78ab21f1cedff793359ea35b8d` | 1 append |

- The page is made by `build-fidelity.cjs` from `fidelity-base/app.js` and the modules, which are inserted inside the app's closure in this order: `fidelity-ui`, `fidelity-customer-pages`, `fidelity-operations`, `fidelity-openwa`, `fidelity-dashboard`, `fidelity-lifecycle`, `fidelity-ai`, `fidelity-pricelist`, `fidelity-subsite`; a module overrides a function by assigning it again, and the last assignment wins. `build-fidelity.cjs` also changes the base's text with `swap(from, to)`, which fails the build when `from` is missing.
- `fidelity-openwa.js` — numbers, linking, the chat page (`renderInbox`, its `chatHTML` override), the feed. `fidelity-ui.js` — tabs and actions. `fidelity-lifecycle.js` — the menu (`menuHTML`, `viewIcon`) and the follow-up strip. `fidelity-ai.js` — the language choice, the send guard, the key hint.
- `fidelity.css`, `fidelity-lifecycle.css` — the page's own style sheets, built into `app.css`; px values become `--fid-px-*` size tokens in `tokens.css`.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly these output files differ: `app.js`, `app.css`, `icons.js`, `tokens.css`, `validation.json` (`icons.js` only in the order of its icons, `tokens.css` by the size tokens the new rules use).

## Commands you will need

Run from the repository root.

**The tests and the smoke script need Node 22.13 or newer** (`node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 6ba9d27 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| All tests | `$NODE --test` (from the repository root) | `tests 91`, `pass 91`, `fail 0` (unchanged) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-090/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-openwa.js`, `work/wa-replica/fidelity-ui.js`, `work/wa-replica/fidelity-lifecycle.js`, `work/wa-replica/fidelity-ai.js` (Step 2)
- `work/wa-replica/build-fidelity.cjs` (Step 3)
- `work/wa-replica/fidelity.css`, `work/wa-replica/fidelity-lifecycle.css` (Step 4)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 5)
- `README.md`, `replica/build-log.md` (Step 6)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/app.css`, `outputs/wa-replica-prototype/icons.js`, `outputs/wa-replica-prototype/tokens.css`, `outputs/wa-replica-prototype/validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — `fidelity-base/**`, `overrides.js`, the other modules and style sheets, the servers, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch you are given. If (and only if) you find yourself on `main`, create and switch to `advisor/090-whatsapp-page` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): 号码管理 as its own page, a larger conversation, WhatsApp-sized bubbles and message box`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy the text exactly, including spaces, quotes, backslashes, backticks, `${…}` and Chinese punctuation — several edits of `build-fidelity.cjs` are long lines with escaped quotes (`\"`) that must stay exactly as written. Apply the edits of a file in the order given.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-090/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-090 && cat > /tmp/wa-scrm-plan-090/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 090: on the WhatsApp API page 号码管理 is a page of its own in the place of 账号列表; the chat page has no
# switch and no row of page tabs; the number and the source sit under the customer's name; the time is inside the
# bubble; the message box is a toolbar above one bar. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
hasnt() { grep -qF -- "$3" "$2" 2>/dev/null && { echo "MISS $1"; FAIL=1; } || echo "ok   $1"; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has '号码管理 is among the pages in the place of 账号列表' "$W/build-fidelity.cjs" "inbox:'WhatsApp API',numbers:'号码管理',customers:'客户列表',"
has 'the page 号码管理 is drawn by the numbers table' "$W/build-fidelity.cjs" "'const pages={dashboard:renderDashboard,numbers:renderOpenwaNumbers,inbox:renderInbox'"
has 'an old link with ?tab=numbers opens 号码管理' "$W/build-fidelity.cjs" "defaultView=defaultTab==='numbers'?'numbers':defaultTab==='chat'?'inbox':'dashboard';"
hasnt 'the language choice is no longer put into the strip above the messages' "$W/build-fidelity.cjs" "'</span>'+aiLanguagePicker(c)+'</div>'\");"
has 'the time of a message goes inside its bubble' "$W/build-fidelity.cjs" "lastDay=day;const meta='<span class=\\\"message-meta\\\">'"
has 'the message box is rebuilt as a toolbar above one bar' "$W/build-fidelity.cjs" "<div class=\\\"composer-input\\\">'+openwaAttachButton()+'<textarea id=\\\"composer-text\\\""
has 'the narrow-screen tools lead to 号码管理' "$W/build-fidelity.cjs" "<a href=\\\"#numbers\\\" data-nav=\\\"numbers\\\">'+icon('Smartphone')+'号码管理</a></div></div>')}"
has '号码管理 has its own top with 扫码绑定' "$W/fidelity-openwa.js" "  function openwaNumbersTop() {"
hasnt 'the switch between numbers and chat is gone' "$W/fidelity-openwa.js" 'fid-wa-tabs'
hasnt 'the chat page draws no numbers' "$W/fidelity-openwa.js" "if (fid.waTab === 'numbers') return renderOpenwaNumbers();"
has 'the number sits in the line under the name' "$W/fidelity-openwa.js" '<span class="openwa-chat-number">${esc(a.number)}</span>${state}${source}</div></div><div class="chat-heading-actions">'
has 'a list box in the toolbar holds the redraw too' "$W/fidelity-openwa.js" "closest('.lc-chat-strip, .source-strip, .composer-tools');"
has 'the tabs open 号码管理 after WhatsApp API' "$W/fidelity-ui.js" "ui.openTabs=[...new Set(['dashboard','inbox','numbers',...customerMenu,...ui.openTabs])];"
has 'a button that asks for 号码管理 opens its page' "$W/fidelity-ui.js" "    fidWaTab:id=>navigate(id==='numbers'?'numbers':'inbox'),"
has 'the menu has 号码管理 under WhatsApp API' "$W/fidelity-lifecycle.js" "      renderItem('numbers', views.numbers) +"
has 'the strip buttons name themselves when pointed at' "$W/fidelity-lifecycle.js" "fidActionID(c.id) + ' title=\"移入聊天记录\"'"
has 'the key hint is updated in the toolbar' "$W/fidelity-ai.js" "      const enter = \$('.composer-keys');"
has 'the chat page hides the row of page tabs' "$W/fidelity.css" '.fidelity:has(#view .inbox-page) #workspace-tabs { display:none; }'
has 'the conversation takes the height of the page' "$W/fidelity.css" '.fidelity .fid-wa .inbox-layout { height:calc(100dvh - 92px);'
has 'a dialog dims the chat page below the top bar' "$W/fidelity.css" '.fidelity:has(#view .inbox-page) #dialog.fid-dialog::backdrop { clip-path:inset(56px 0 0 240px); }'
has 'the time floats at the end of the last line' "$W/fidelity.css" '.fidelity .message-meta { float:right; display:inline-flex;'
has 'the send button keeps its icon on every screen' "$W/fidelity.css" '.fidelity .fid-wa .send-button .icon { display:block;'
has 'the strip takes one line where it fits' "$W/fidelity-lifecycle.css" '  .fidelity .fid-wa .lc-chat-strip-right { margin-left: auto; width: auto; flex-wrap: nowrap; gap: 4px; }'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  whatsappPage: 'the WhatsApp API page (plan 090):"
has 'the README lists 号码管理' "$ROOT/README.md" '| `#numbers` | **号码管理** |'
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## WhatsApp API：号码管理成为独立页面，聊天窗口更大 · 2026-11-27'
has 'the page is built with 号码管理' "$O/app.js" 'numbers:renderOpenwaNumbers,inbox:renderInbox'
has 'the page is built with the new message box' "$O/app.js" '<span class="composer-keys">'
has 'the style sheet is built with it' "$O/app.css" '.fidelity:has(#view .inbox-page) #workspace-tabs { display:none; }'
same 'of the built files only the page, its style sheet, its icons, its size tokens and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.js|app\.css|icons\.js|tokens\.css|validation\.json)$')" 0
same 'the built page passes the syntax check' "$("$NODE" --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the tests of the price file pass' "$("$NODE" --test "$W/price-file.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 20 ℹ fail 0 '
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 17 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
same 'the tests of the provisioner pass' "$("$NODE" --test "$W/site-provisioner.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-090/smoke.sh && ls -l /tmp/wa-scrm-plan-090/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity-ui.js work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-ai.js work/wa-replica/build-fidelity.cjs work/wa-replica/fidelity.css work/wa-replica/fidelity-lifecycle.css work/wa-replica/validate-scrm-lifecycle.cjs README.md replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-090/smoke.sh` → exactly these 29 checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `号码管理 is among the pages in the place of 账号列表`, `the page 号码管理 is drawn by the numbers table`, `an old link with ?tab=numbers opens 号码管理`, `the language choice is no longer put into the strip above the messages`, `the time of a message goes inside its bubble`, `the message box is rebuilt as a toolbar above one bar`, `the narrow-screen tools lead to 号码管理`, `号码管理 has its own top with 扫码绑定`, `the switch between numbers and chat is gone`, `the chat page draws no numbers`, `the number sits in the line under the name`, `a list box in the toolbar holds the redraw too`, `the tabs open 号码管理 after WhatsApp API`, `a button that asks for 号码管理 opens its page`, `the menu has 号码管理 under WhatsApp API`, `the strip buttons name themselves when pointed at`, `the key hint is updated in the toolbar`, `the chat page hides the row of page tabs`, `the conversation takes the height of the page`, `a dialog dims the chat page below the top bar`, `the time floats at the end of the last line`, `the send button keeps its icon on every screen`, `the strip takes one line where it fits`, `the validator knows it`, `the README lists 号码管理`, `the build log has the entry`, `the page is built with 号码管理`, `the page is built with the new message box`, `the style sheet is built with it`; every other check is printed with `ok`; `git status --porcelain` prints nothing.

### Step 2: The modules: 号码管理 as a page, the chat page without the switch, the number under the name, the key hint

#### `work/wa-replica/fidelity-openwa.js`

**Edit 2.1** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text

  function openwaTabs() {
    return `<div class="fid-wa-top">
      <div class="fid-wa-tabs" role="group" aria-label="WhatsApp 工作区">
        ${fidButton('号码管理','fidWaTab','Smartphone',fid.waTab==='numbers'?'gradient':'',`${fidActionID('numbers')} aria-pressed="${fid.waTab==='numbers'}"`)}
        ${fidButton('在线聊天','fidWaTab','MessageCircle',fid.waTab==='chat'?'gradient':'',`${fidActionID('chat')} aria-pressed="${fid.waTab==='chat'}"`)}
      </div>
      ${fid.waTab==='numbers'?fidButton('扫码绑定','openwaBind','QrCode','gradient'):''}
    </div>`;
  }
```

Replace them with:

```text

  // 号码管理 is a page of its own (plan 090): the menu leads to it, and the chat page has no switch any more.
  function openwaNumbersTop() {
    return `<div class="fid-wa-top">${fidButton('扫码绑定','openwaBind','QrCode','gradient')}</div>`;
  }
```

**Edit 2.2** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    return `<section class="fid-page fid-wa fid-wa-numbers">
      ${openwaTabs()}
      <div class="fid-table-card openwa-panel">
```

Replace them with:

```text
    return `<section class="fid-page fid-wa fid-wa-numbers">
      ${openwaNumbersTop()}
      <div class="fid-table-card openwa-panel">
```

**Edit 2.3** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    const action = bind ? 'openwaOpenChat' : 'openwaReturnToChat';
    const inChat = ui.view === 'inbox' && fid.waTab === 'chat';
    const label = !bind && inChat && fid.chatOpen ? '返回当前会话' : '进入在线聊天';
```

Replace them with:

```text
    const action = bind ? 'openwaOpenChat' : 'openwaReturnToChat';
    const inChat = ui.view === 'inbox';
    const label = !bind && inChat && fid.chatOpen ? '返回当前会话' : '进入在线聊天';
```

**Edit 2.4** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    const state = a.state === 'online' ? '' : `<span class="state-text ${a.state==='reconnect'?'warn':''}" role="status"><span class="state-dot ${a.state==='reconnect'?'warning':'offline'}"></span>${openwaState(a)}</span>`;
    chat = chat.replace('<div class="source-strip">', `<div class="openwa-chat-status">
      <span>${icon('Smartphone')}<b>${esc(a.number)}</b></span>${state}
    </div><div class="source-strip">`);
    if (a.state !== 'online') {
```

Replace them with:

```text
    const state = a.state === 'online' ? '' : `<span class="state-text ${a.state==='reconnect'?'warn':''}" role="status"><span class="state-dot ${a.state==='reconnect'?'warning':'offline'}"></span>${openwaState(a)}</span>`;
    // The number, its state, and where the customer came from go into the line under the customer's name (plan
    // 090), so that no rows of their own stand above the messages.
    const source = `<span class="separator"></span><span>${esc(c.source || '未知来源')}${c.campaign ? ' · ' + esc(c.campaign) : ''}</span>`;
    chat = chat.replace('</span></div></div><div class="chat-heading-actions">', `</span><span class="separator"></span><span class="openwa-chat-number">${esc(a.number)}</span>${state}${source}</div></div><div class="chat-heading-actions">`);
    if (a.state !== 'online') {
```

**Edit 2.5** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
  renderInbox = function() {
    if (fid.waTab === 'numbers') return renderOpenwaNumbers();
    const scope = myAccounts();
```

Replace them with:

```text
  renderInbox = function() {
    const scope = myAccounts();
```

**Edit 2.6** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
      : `<div class="fid-wa-empty">${fidButton('前往号码管理','fidWaTab','Smartphone','tint',fidActionID('numbers'))}</div>`);
    return `<section class="inbox-page fid-wa"><h1 class="sr-only">WhatsApp API 在线聊天</h1>${openwaTabs()}
      <div class="inbox-layout ${ui.mobileChat&&c?'mobile-chat':'mobile-list'}">
```

Replace them with:

```text
      : `<div class="fid-wa-empty">${fidButton('前往号码管理','fidWaTab','Smartphone','tint',fidActionID('numbers'))}</div>`);
    return `<section class="inbox-page fid-wa"><h1 class="sr-only">WhatsApp API 在线聊天</h1>
      <div class="inbox-layout ${ui.mobileChat&&c?'mobile-chat':'mobile-list'}">
```

**Edit 2.7** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    if (openwaComposing) return void (openwaStale = true);
    const chosenFrom = document.activeElement?.tagName === 'SELECT' && document.activeElement.closest('.lc-chat-strip, .source-strip');
    if (chosenFrom && openwaHold !== -1) {
```

Replace them with:

```text
    if (openwaComposing) return void (openwaStale = true);
    const chosenFrom = document.activeElement?.tagName === 'SELECT' && document.activeElement.closest('.lc-chat-strip, .source-strip, .composer-tools');
    if (chosenFrom && openwaHold !== -1) {
```

**Edit 2.8** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    openwaReturnToChat:id=>{
      if (ui.view !== 'inbox' || fid.waTab !== 'chat' || !fid.chatOpen) return openwaOpenChat(id);
      close();
```

Replace them with:

```text
    openwaReturnToChat:id=>{
      if (ui.view !== 'inbox' || !fid.chatOpen) return openwaOpenChat(id);
      close();
```

#### `work/wa-replica/fidelity-ui.js`

**Edit 2.9** — `work/wa-replica/fidelity-ui.js`. Find exactly these lines (they occur once):

```text
  ui.tagGroup=(fidGroupList().find(canEditGroup)||fidGroupList()[0])?.id||'all';
  ui.openTabs=[...new Set(['dashboard','accounts','inbox',...customerMenu,...ui.openTabs])];

```

Replace them with:

```text
  ui.tagGroup=(fidGroupList().find(canEditGroup)||fidGroupList()[0])?.id||'all';
  ui.openTabs=[...new Set(['dashboard','inbox','numbers',...customerMenu,...ui.openTabs])];

```

**Edit 2.10** — `work/wa-replica/fidelity-ui.js`. Find exactly these lines (they occur once):

```text
    fidLogHistory:()=>{fid.followMode='history';ui.pages.followups=0;render();},
    fidWaTab:id=>{fid.waTab=id==='numbers'?'numbers':'chat';render();},
    fidChatFilters:()=>fidDialog('会话筛选','<div class="modal-body fid-conversation-filters">'+Object.entries(fidConversationFilters).map(([id,label])=>fidButton(label,'fidChatFilter','',ui.conversationFilter===id?'blue':'',`${fidActionID(id)} aria-pressed="${ui.conversationFilter===id}"`)).join('')+'</div>'),
```

Replace them with:

```text
    fidLogHistory:()=>{fid.followMode='history';ui.pages.followups=0;render();},
    fidWaTab:id=>navigate(id==='numbers'?'numbers':'inbox'),
    fidChatFilters:()=>fidDialog('会话筛选','<div class="modal-body fid-conversation-filters">'+Object.entries(fidConversationFilters).map(([id,label])=>fidButton(label,'fidChatFilter','',ui.conversationFilter===id?'blue':'',`${fidActionID(id)} aria-pressed="${ui.conversationFilter===id}"`)).join('')+'</div>'),
```

#### `work/wa-replica/fidelity-lifecycle.js`

**Edit 2.11** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
    inbox: 'MessageCircle',
    accounts: 'Smartphone',
    customers: 'ContactRound',
```

Replace them with:

```text
    inbox: 'MessageCircle',
    numbers: 'Smartphone',
    customers: 'ContactRound',
```

**Edit 2.12** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
      renderItem('inbox', views.inbox) +
      renderItem('accounts', views.accounts) +
      '<div class="nav-caption">客户与跟进</div>' +
```

Replace them with:

```text
      renderItem('inbox', views.inbox) +
      renderItem('numbers', views.numbers) +
      '<div class="nav-caption">客户与跟进</div>' +
```

**Edit 2.13** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
      <div class="lc-chat-strip-right">
        ${fidButton(h.closed ? '重新跟进' : '安排跟进', 'followup', 'CalendarPlus', h.closed ? 'slim blue' : 'slim tint', fidActionID(c.id))}
        ${fidButton('设置标签', 'assignTags', 'Tags', 'slim', fidActionID(c.id))}
        ${fidButton('移入聊天记录', 'fidArchiveOpen', 'Archive', 'slim', fidActionID(c.id))}
        ${fidButton('360° 档案', 'profile', 'ContactRound', 'slim', fidActionID(c.id))}
      </div>
```

Replace them with:

```text
      <div class="lc-chat-strip-right">
        ${fidButton(h.closed ? '重新跟进' : '安排跟进', 'followup', 'CalendarPlus', h.closed ? 'slim blue' : 'slim tint', fidActionID(c.id) + ` title="${h.closed ? '重新跟进' : '安排跟进'}"`)}
        ${fidButton('设置标签', 'assignTags', 'Tags', 'slim', fidActionID(c.id) + ' title="设置标签"')}
        ${fidButton('移入聊天记录', 'fidArchiveOpen', 'Archive', 'slim', fidActionID(c.id) + ' title="移入聊天记录"')}
        ${fidButton('360° 档案', 'profile', 'ContactRound', 'slim', fidActionID(c.id) + ' title="360° 档案"')}
      </div>
```

#### `work/wa-replica/fidelity-ai.js`

**Edit 2.14** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
      aiRefreshDraftPreview(c);
      const enter = $('.composer-foot span');
      if (enter) { enter.innerHTML = icon('Keyboard') + aiEnterHint(c); paintIcons(enter); }
```

Replace them with:

```text
      aiRefreshDraftPreview(c);
      const enter = $('.composer-keys');
      if (enter) { enter.innerHTML = icon('Keyboard') + aiEnterHint(c); paintIcons(enter); }
```

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity-ui.js work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-ai.js` → `43edc21f74f9626ecd9f43429bb03e21d3093a072768f0058dc323765acf86af`, `883b5f154ede5efd78aa40d11779008f5b9b7f15e3b69ec0e3dc387b5cdcb7f3`, `7bd920eb2bcf043f544929ba12d7be748255336dfe86955a226aafef9ed97b69`, `a9548dbc0e89a7180f6cca7412d566b2189c7b983457e390f5df020389e1db3e`. If a checksum does not match, restore that file (`git checkout -- <file>`) and apply its edits again, once; if it still does not match, STOP.

### Step 3: The build: the page list, the bubbles, the message box, the narrow-screen tools

#### `work/wa-replica/build-fidelity.cjs`

**Edit 3.1** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
    }`);
swap("const views={inbox:'聚合会话',accounts:'WhatsApp账号',customers:'客户列表',tags:'标签管理',followups:'跟进管理',team:'团队与权限',scope:'功能范围'};", `const views={dashboard:'首页',inbox:'WhatsApp API',accounts:'账号列表',customers:'客户列表',followups:'跟进闭环','chat-records':'聊天记录',tags:'标签管理','tag-stats':'标签统计',materials:'素材管理',team:'组织架构',members:'账号管理',ai:'AI 能力',scope:'功能范围'};
  const defaultView=['numbers','chat'].includes(new URLSearchParams(location.search).get('tab'))?'inbox':'dashboard';`);
swap("view:views[location.hash.slice(1)]?location.hash.slice(1):'inbox'", "view:Object.hasOwn(views,location.hash.slice(1))?location.hash.slice(1):defaultView");
```

Replace them with:

```text
    }`);
swap("const views={inbox:'聚合会话',accounts:'WhatsApp账号',customers:'客户列表',tags:'标签管理',followups:'跟进管理',team:'团队与权限',scope:'功能范围'};", `const views={dashboard:'首页',inbox:'WhatsApp API',numbers:'号码管理',customers:'客户列表',followups:'跟进闭环','chat-records':'聊天记录',tags:'标签管理','tag-stats':'标签统计',materials:'素材管理',team:'组织架构',members:'账号管理',ai:'AI 能力',scope:'功能范围'};
  const defaultTab=new URLSearchParams(location.search).get('tab'),defaultView=defaultTab==='numbers'?'numbers':defaultTab==='chat'?'inbox':'dashboard';`);
swap("view:views[location.hash.slice(1)]?location.hash.slice(1):'inbox'", "view:Object.hasOwn(views,location.hash.slice(1))?location.hash.slice(1):defaultView");
```

**Edit 3.2** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
swap('  function render() {\n', '  function render() {\n    if(!renderSignInState())return;\n');
swap('const pages={inbox:renderInbox', 'const pages={dashboard:renderDashboard,inbox:renderInbox');
swap('team:renderTeam,scope:renderScope', "team:renderTeam,members:renderMembers,'chat-records':renderChatRecords,'tag-stats':renderTagStats,materials:renderMaterials,ai:renderAiPage,scope:renderScope");
```

Replace them with:

```text
swap('  function render() {\n', '  function render() {\n    if(!renderSignInState())return;\n');
swap('const pages={inbox:renderInbox', 'const pages={dashboard:renderDashboard,numbers:renderOpenwaNumbers,inbox:renderInbox');
swap('team:renderTeam,scope:renderScope', "team:renderTeam,members:renderMembers,'chat-records':renderChatRecords,'tag-stats':renderTagStats,materials:renderMaterials,ai:renderAiPage,scope:renderScope");
```

**Edit 3.3** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
swap("hint.innerHTML=icon('Languages')+esc(c.language)+' · '+aiDraftHint(c);", "hint.innerHTML=icon('Languages')+esc(aiLanguageLabel(c))+' · '+aiDraftHint(c);");
swap("<span>'+esc(c.campaign||'客户来源')+'</span></div>'", "<span>'+esc(c.campaign||'客户来源')+'</span>'+aiLanguagePicker(c)+'</div>'");
// The price list (plan 037): the message box gets the button "报价" from fidelity-pricelist.js, after the button of
```

Replace them with:

```text
swap("hint.innerHTML=icon('Languages')+esc(c.language)+' · '+aiDraftHint(c);", "hint.innerHTML=icon('Languages')+esc(aiLanguageLabel(c))+' · '+aiDraftHint(c);");
// The price list (plan 037): the message box gets the button "报价" from fidelity-pricelist.js, after the button of
```

**Edit 3.4** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
swap("+icon('MessageSquareText')+'</button><span class=\"language-hint\">'", "+icon('MessageSquareText')+'</button>'+priceQuoteButton()+'<span class=\"language-hint\">'");
new vm.Script(js, {filename:'app.js'});
```

Replace them with:

```text
swap("+icon('MessageSquareText')+'</button><span class=\"language-hint\">'", "+icon('MessageSquareText')+'</button>'+priceQuoteButton()+'<span class=\"language-hint\">'");
// The WhatsApp API page (plan 090). The time of a message sits inside its bubble, at the end of its last line of
// text, as in WhatsApp.
swap("lastDay=day;return separator+'<div class=\"message-row '+(m.side==='out'?'out':'')+'\"><div><div class=\"message-bubble\">'+openwaMediaHTML(c,m)+(openwaCaption(c,m)?'<div class=\"message-text\">'+esc(openwaCaption(c,m))+'</div>':'')+(m.attachment?'<div class=\"attachment\">'+icon('File')+esc(m.attachment)+'</div>':'')+(m.translated&&showTranslation?'<div class=\"message-translation\"><span class=\"translation-label\">'+icon('Languages')+'译文</span><div>'+esc(m.translated)+'</div></div>':'')+'</div><div class=\"message-meta\">'+esc(openwaTimeLabel(m))+(m.side==='out'?openwaMessageMark(m):'')+'</div></div></div>'}).join('');",
  "lastDay=day;const meta='<span class=\"message-meta\">'+esc(openwaTimeLabel(m))+(m.side==='out'?openwaMessageMark(m):'')+'</span>',caption=openwaCaption(c,m),shown=m.translated&&showTranslation;return separator+'<div class=\"message-row '+(m.side==='out'?'out':'')+'\"><div><div class=\"message-bubble\">'+openwaMediaHTML(c,m)+(caption?'<div class=\"message-text\">'+esc(caption)+(shown?'':meta)+'</div>':'')+(m.attachment?'<div class=\"attachment\">'+icon('File')+esc(m.attachment)+'</div>':'')+(shown?'<div class=\"message-translation\"><span class=\"translation-label\">'+icon('Languages')+'译文</span><div>'+esc(m.translated)+meta+'</div></div>':'')+(caption||shown?'':meta)+'</div></div></div>'}).join('');");
// The message box: a slim toolbar — the customer's language (it was in the strip above the messages), what happens
// to a reply, the send guard, 报价, 快捷回复 and the keys — above one bar like WhatsApp's: + for files, the message,
// send.
swap("return '<div class=\"composer\"><div id=\"translation-preview\">'+previewHTML(c)+'</div><div class=\"composer-input\"><textarea id=\"composer-text\" aria-label=\"消息内容\" placeholder=\"输入消息…\">'+esc(d.text)+'</textarea><div class=\"composer-controls\"><div class=\"composer-tools\">'+openwaAttachButton()+'<button class=\"icon-button\" data-action=\"quickAll\" aria-label=\"选择快捷回复\">'+icon('MessageSquareText')+'</button>'+priceQuoteButton()+'<span class=\"language-hint\">'+icon('Languages')+esc(aiLanguageLabel(c))+' · '+aiDraftHint(c)+'</span>'+aiGuardHTML(c)+'</div><button class=\"send-button\" data-action=\"send\" aria-label=\"发送消息\"'+(!enabled?' disabled':'')+'>发送 '+icon('Send')+'</button></div></div><div class=\"composer-foot\"><span>'+icon('Keyboard')+aiEnterHint(c)+'</span><span>'+(online?'草稿自动保存':'号码待连接 · 草稿已保留')+'</span></div></div>';",
  "return '<div class=\"composer\"><div id=\"translation-preview\">'+previewHTML(c)+'</div><div class=\"composer-tools\">'+aiLanguagePicker(c)+'<span class=\"language-hint\">'+icon('Languages')+esc(aiLanguageLabel(c))+' · '+aiDraftHint(c)+'</span>'+aiGuardHTML(c)+priceQuoteButton()+'<button type=\"button\" class=\"composer-chip\" data-action=\"quickAll\" aria-label=\"选择快捷回复\">'+icon('MessageSquareText')+'<span>快捷回复</span></button><span class=\"composer-keys\">'+icon('Keyboard')+aiEnterHint(c)+'</span></div><div class=\"composer-input\">'+openwaAttachButton()+'<textarea id=\"composer-text\" aria-label=\"消息内容\" placeholder=\"输入消息…\">'+esc(d.text)+'</textarea><button class=\"send-button\" data-action=\"send\" aria-label=\"发送消息\"'+(!enabled?' disabled':'')+'>'+icon('Send')+'</button></div></div>';");
// The narrow-screen tools of a conversation lead to 号码管理, which took the place of 账号列表.
swap("<a href=\"#accounts\" data-nav=\"accounts\">'+icon('Settings2')+'账号管理</a></div></div>')}", "<a href=\"#numbers\" data-nav=\"numbers\">'+icon('Smartphone')+'号码管理</a></div></div>')}");
new vm.Script(js, {filename:'app.js'});
```

What these edits do: `views` names `numbers:'号码管理'` where `accounts:'账号列表'` was; `?tab=numbers` opens it; `pages` draws it with `renderOpenwaNumbers`; the language choice is no longer put into the source strip; three new swaps after the one for 报价 — the message row with its time inside the bubble, the message box, and the narrow-screen tools.

**Verify**: `sha256sum work/wa-replica/build-fidelity.cjs` → `1e9d98a0ad16d8e3e917505dff41b13ae1cfd530f043184d0abf2025ca3861c8`; `git checkout 6ba9d27 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"icons": 87` (a "Missing prototype source anchor" error means an edit was not copied exactly: STOP), then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`.

### Step 4: The style sheets

#### `work/wa-replica/fidelity.css`

**Edit 4.1** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-wa-tabs .fid-btn.gradient { box-shadow:0 2px 5px color-mix(in srgb,var(--fid-royal) 30%,transparent); }
.fidelity .fid-wa .inbox-layout { height:calc(100dvh - 203px); min-height:400px; grid-template-columns:300px minmax(0,1fr) 52px; background:var(--color-surface); border-radius:15px; border:1px solid var(--fid-frame); overflow:hidden; }
.fidelity .fid-wa .conversation-top { padding:12px; border-bottom:1px solid var(--fid-frame); }
```

Replace them with:

```text
.fid-wa-tabs .fid-btn.gradient { box-shadow:0 2px 5px color-mix(in srgb,var(--fid-royal) 30%,transparent); }
.fidelity .fid-wa .inbox-layout { height:calc(100dvh - 92px); min-height:400px; grid-template-columns:300px minmax(0,1fr) 52px; background:var(--color-surface); border-radius:15px; border:1px solid var(--fid-frame); overflow:hidden; }
.fidelity .fid-wa .conversation-top { padding:12px; border-bottom:1px solid var(--fid-frame); }
```

**Edit 4.2** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fidelity:has(.nav-collapsed) #dialog.fid-dialog::backdrop { clip-path:inset(107px 0 0 64px); }
.fidelity #dialog.fid-wide { width:min(660px,calc(100vw - var(--fid-sidebar) - 36px)); }
```

Replace them with:

```text
.fidelity:has(.nav-collapsed) #dialog.fid-dialog::backdrop { clip-path:inset(107px 0 0 64px); }
/* The chat page has no row of page tabs (plan 090): there the backdrop starts below the top bar. */
.fidelity:has(#view .inbox-page) #dialog.fid-dialog::backdrop { clip-path:inset(56px 0 0 240px); }
.fidelity:has(.nav-collapsed):has(#view .inbox-page) #dialog.fid-dialog::backdrop { clip-path:inset(56px 0 0 64px); }
.fidelity #dialog.fid-wide { width:min(660px,calc(100vw - var(--fid-sidebar) - 36px)); }
```

**Edit 4.3** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
  .fidelity #dialog.fid-dialog::backdrop { clip-path:inset(107px 0 0 160px); }
  .fidelity .brand-name strong { font-size:15px; }
```

Replace them with:

```text
  .fidelity #dialog.fid-dialog::backdrop { clip-path:inset(107px 0 0 160px); }
  .fidelity:has(#view .inbox-page) #dialog.fid-dialog::backdrop { clip-path:inset(56px 0 0 160px); }
  .fidelity .brand-name strong { font-size:15px; }
```

**Edit 4.4** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
  .fid-wa-top { margin-bottom:11px; }
  .fidelity .fid-wa .inbox-layout { display:flex; min-height:0; height:calc(100dvh - 178px); }
  .openwa-panel-head { padding:12px; }
```

Replace them with:

```text
  .fid-wa-top { margin-bottom:11px; }
  .fidelity .fid-wa .inbox-layout { display:flex; min-height:0; height:calc(100dvh - 78px); }
  .openwa-panel-head { padding:12px; }
```

**Edit 4.5** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
  .openwa-chat-status { padding-inline:10px; }
  .fidelity .openwa-chat-status + .source-strip + .connection-banner>div>span { display:block; }
  .fidelity #dialog.fid-dialog { inset:0; max-height:calc(100dvh - 24px); }
```

Replace them with:

```text
  .openwa-chat-status { padding-inline:10px; }
  .fidelity .source-strip + .connection-banner>div>span { display:block; }
  .fidelity #dialog.fid-dialog { inset:0; max-height:calc(100dvh - 24px); }
```

**Edit 4.6** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.fid-master-table.fid-master-accounts { min-width:640px; }
```

Replace them with:

```text
.fid-master-table.fid-master-accounts { min-width:640px; }

/* The WhatsApp API page (plan 090). 号码管理 is a page of its own; the chat page has no row of page tabs and no switch,
   so the conversation reaches up to the top bar. The number and the source sit in the line under the customer's
   name; the strip is one line. Bubbles are WhatsApp-sized, with the time inside at the end of the last line of
   text; the message box is a slim toolbar above one bar: + for files, the message, send. */
.fidelity:has(#view .inbox-page) #workspace-tabs { display:none; }
.fid-wa-numbers .fid-wa-top { justify-content:flex-end; }
.fidelity .fid-wa .chat-heading { min-height:0; padding:8px 14px; }
.fidelity .fid-wa .chat-person { min-width:0; }
.fidelity .fid-wa .chat-person .customer-sub { flex-wrap:nowrap; white-space:nowrap; overflow:hidden; min-width:0; }
.fidelity .fid-wa .chat-person .customer-sub>span { flex:none; }
.fidelity .fid-wa .chat-person .customer-sub>span:last-child { flex:0 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; }
.fidelity .fid-wa .chat-pane .source-strip { display:none; }
.fidelity .messages { gap:4px; padding:10px 6% 8px; }
.fidelity .message-row,.fidelity .message-row.out { max-width:min(65%,520px); }
.fidelity .message-row + .message-row { margin-top:0; }
.fidelity .message-bubble { padding:6px 9px 7px; border-radius:8px; display:flow-root; }
.fidelity .message-row.out .message-bubble { border-radius:8px; }
.fidelity .message-text { line-height:19px; display:flow-root; }
.fidelity .message-translation { margin-top:4px; padding-top:4px; line-height:18px; }
.fidelity .message-translation>div { display:flow-root; }
.fidelity .translation-label { margin-bottom:1px; font-size:11px; }
.fidelity .message-meta { float:right; display:inline-flex; align-items:center; gap:3px; margin:5px 0 -4px 10px; font-size:11px; line-height:15px; color:var(--color-text-muted); user-select:none; }
.fidelity .message-meta .icon { width:14px; height:14px; }
.fidelity .day-separator { width:max-content; margin:6px auto; padding:2px 10px; border-radius:7px; background:var(--color-surface); }
.fidelity .day-separator::before,.fidelity .day-separator::after { display:none; }
.fidelity .fid-wa .composer { display:grid; gap:6px; padding:6px 14px 10px; }
.fidelity .fid-wa .composer-tools { display:flex; flex-wrap:wrap; align-items:center; gap:4px 8px; min-width:0; font-size:12px; }
.fidelity .fid-wa .composer-tools>* { flex:none; margin:0; }
.fidelity .fid-wa .composer-tools .ai-language-pick { margin:0; }
.fidelity .fid-wa .composer-tools .ai-language-pick .fid-select { width:auto; max-width:120px; }
.fidelity .fid-wa .composer-tools .language-hint { max-width:none; }
.fidelity .fid-wa .composer-tools .ai-shortcut-gear { width:26px; height:26px; color:var(--color-text-muted); }
.fidelity .fid-wa .composer-tools .ai-shortcut-gear .icon { width:15px; height:15px; }
.composer-chip { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border:1px solid var(--fid-frame); border-radius:999px; background:var(--color-surface); color:var(--fid-ink); font:inherit; font-size:12px; cursor:pointer; }
.composer-chip:hover { border-color:var(--color-accent); color:var(--color-accent); }
.composer-chip:focus-visible { outline:2px solid var(--color-accent); outline-offset:1px; }
.composer-chip .icon { width:14px; height:14px; }
.fidelity .fid-wa .composer-tools .composer-keys { flex:1 1 0; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:right; color:var(--color-text-muted); }
.composer-keys .icon { width:13px; height:13px; margin-right:3px; vertical-align:-2px; }
.fidelity .fid-wa .composer-input { display:flex; align-items:flex-end; gap:8px; padding:0; border:0; background:none; box-shadow:none; }
.fidelity .fid-wa .composer-input [data-action="openwaAttach"] { width:42px; height:42px; border-radius:50%; flex:none; }
.fidelity .fid-wa .composer-input textarea { flex:1; min-width:0; min-height:42px; height:42px; max-height:140px; field-sizing:content; padding:10px 16px; border:1px solid var(--color-border-input); border-radius:21px; background:var(--color-surface); resize:none; font-size:14px; line-height:20px; }
.fidelity .fid-wa .composer-input textarea:focus-visible { outline:2px solid var(--color-accent); outline-offset:1px; }
.fidelity .fid-wa .send-button { width:42px; height:42px; min-height:0; padding:0; border-radius:50%; display:grid; place-items:center; flex:none; }
.fidelity .fid-wa .send-button .icon { display:block; width:18px; height:18px; }
@media(max-width:760px) { .fidelity .fid-wa .composer-tools .composer-keys { display:none; } }
```

#### `work/wa-replica/fidelity-lifecycle.css`

**Append 4.7** — `work/wa-replica/fidelity-lifecycle.css`. Add at the end of the file, after one empty line:

```text
/* The strip above a conversation takes one line on the WhatsApp API page where it fits, and a second one where the
   conversation is narrow (plan 090); below 1600 px its four buttons show their icons only, and their names when
   pointed at. */
@media (min-width: 761px) {
  .fidelity .fid-wa .lc-chat-strip { gap: 6px; padding: 6px 14px; }
  .fidelity .fid-wa .lc-chat-strip .tag-row { flex: 0 1 auto; min-width: 0; }
  .fidelity .fid-wa .lc-chat-strip-right { margin-left: auto; width: auto; flex-wrap: nowrap; gap: 4px; }
}
@media (min-width: 761px) and (max-width: 1599px) {
  .fidelity .fid-wa .lc-chat-strip-right .fid-btn { width: 30px; padding: 0; gap: 0; justify-content: center; font-size: 0; }
  .fidelity .fid-wa .lc-chat-strip-right .fid-btn .icon { width: 15px; height: 15px; }
}
```

**Verify**: `sha256sum work/wa-replica/fidelity.css work/wa-replica/fidelity-lifecycle.css` → `9746dd866ba14b88d5a43302f111ee158e431bb14defc99f7b7317e5e03aa1aa`, `020ef5181c231bc4e3702a5f1d7e7ba6d23b637152b00af6d9da5e981aeb223a`.

### Step 5: The validator — and the build

#### `work/wa-replica/validate-scrm-lifecycle.cjs`

**Edit 5.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
}
for (const required of ["aiDraftHint(c)+'</span>'+aiGuardHTML(c)+'</div><button class=\"send-button\"", "icon('Keyboard')+aiEnterHint(c)+'</span>"]) {
  assert(appJs.includes(required), `the message box must take its hint, guard switch and Enter line from the AI module (${required})`);
```

Replace them with:

```text
}
for (const required of ["aiDraftHint(c)+'</span>'+aiGuardHTML(c)+priceQuoteButton()", "<span class=\"composer-keys\">'+icon('Keyboard')+aiEnterHint(c)+'</span>"]) {
  assert(appJs.includes(required), `the message box must take its hint, guard switch and Enter line from the AI module (${required})`);
```

**Edit 5.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
}
assert(appJs.includes('m.translated&&showTranslation?') && !appJs.includes("m.side==='in'&&m.translated"), 'a translation must be shown below a message of either side');
const bootSource = read(path.join(__dirname, 'fidelity-boot.js'));
```

Replace them with:

```text
}
assert(appJs.includes('shown=m.translated&&showTranslation;') && appJs.includes("(shown?'<div class=\"message-translation\">") && !appJs.includes("m.side==='in'&&m.translated"), 'a translation must be shown below a message of either side');
const bootSource = read(path.join(__dirname, 'fidelity-boot.js'));
```

**Edit 5.3** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(!/language: '其他'/.test(read(path.join(__dirname, 'fidelity-openwa.js'))), 'a customer made from a WhatsApp chat must not get a preset language');
assert(read(path.join(__dirname, 'fidelity-openwa.js')).includes("const chosenFrom = document.activeElement?.tagName === 'SELECT' && document.activeElement.closest('.lc-chat-strip, .source-strip');"), 'a refresh must not draw the page again under a list box that is being chosen from');
assert.equal((appJs.match(/\.language (===|!==) '其他'/g) || []).length, 1, 'whether a customer has a language is asked through aiCustomerLanguage, the only place that knows the old value');
assert(appJs.includes("+aiLanguagePicker(c)+'</div>'") && appJs.includes("esc(aiLanguageLabel(c))+' · '+aiDraftHint(c)"), 'the conversation must offer the choice of the customer\'s language and show it beside the message box');
// The price list: a file a person uploads is read in the browser by pricefile.js — the built copy of
```

Replace them with:

```text
assert(!/language: '其他'/.test(read(path.join(__dirname, 'fidelity-openwa.js'))), 'a customer made from a WhatsApp chat must not get a preset language');
assert(read(path.join(__dirname, 'fidelity-openwa.js')).includes("const chosenFrom = document.activeElement?.tagName === 'SELECT' && document.activeElement.closest('.lc-chat-strip, .source-strip, .composer-tools');"), 'a refresh must not draw the page again under a list box that is being chosen from');
assert.equal((appJs.match(/\.language (===|!==) '其他'/g) || []).length, 1, 'whether a customer has a language is asked through aiCustomerLanguage, the only place that knows the old value');
assert(appJs.includes("<div class=\"composer-tools\">'+aiLanguagePicker(c)+'<span class=\"language-hint\">'") && appJs.includes("esc(aiLanguageLabel(c))+' · '+aiDraftHint(c)"), 'the message box must offer the choice of the customer\'s language and show it (plan 090: in its toolbar)');
// The price list: a file a person uploads is read in the browser by pricefile.js — the built copy of
```

**Edit 5.4** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
}
for (const required of ["+priceQuoteButton()+'<span class=\"language-hint\">'", "ai:'AI 能力',prices:'价格表'}", 'ai:renderAiPage,prices:renderPriceList}', "renderItem('prices', views.prices)"]) {
  assert(appJs.includes(required), `app.js is missing ${required}`);
```

Replace them with:

```text
}
for (const required of ["+aiGuardHTML(c)+priceQuoteButton()+'<button type=\"button\" class=\"composer-chip\" data-action=\"quickAll\"", "ai:'AI 能力',prices:'价格表'}", 'ai:renderAiPage,prices:renderPriceList}', "renderItem('prices', views.prices)"]) {
  assert(appJs.includes(required), `app.js is missing ${required}`);
```

**Edit 5.5** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
}
assert(appJs.includes("<div class=\"message-bubble\">'+openwaMediaHTML(c,m)+(openwaCaption(c,m)?"), 'a message bubble must show its media and the text under it');
// A file is attached to a message and sent with it: the button stands where the baseline had its made-up one, the
```

Replace them with:

```text
}
assert(appJs.includes("caption=openwaCaption(c,m),") && appJs.includes("<div class=\"message-bubble\">'+openwaMediaHTML(c,m)+(caption?'<div class=\"message-text\">'+esc(caption)"), 'a message bubble must show its media and the text under it');
// A file is attached to a message and sent with it: the button stands where the baseline had its made-up one, the
```

**Edit 5.6** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
}
for (const required of ["<div class=\"composer-tools\">'+openwaAttachButton()+'<button class=\"icon-button\" data-action=\"quickAll\"", 'enabled=online&&(d.text.trim()||ui.attachment);']) {
  assert(appJs.includes(required), `the built page is missing ${required}`);
```

Replace them with:

```text
}
for (const required of ["<div class=\"composer-input\">'+openwaAttachButton()+'<textarea id=\"composer-text\"", 'enabled=online&&(d.text.trim()||ui.attachment);']) {
  assert(appJs.includes(required), `the built page is missing ${required}`);
```

**Edit 5.7** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(!appJs.includes('setTimeout(() => openwaPoll(pair), 2000)'), 'the QR dialog must not ask every two seconds while a code waits to be scanned');
const summary = {
```

Replace them with:

```text
assert(!appJs.includes('setTimeout(() => openwaPoll(pair), 2000)'), 'the QR dialog must not ask every two seconds while a code waits to be scanned');
// The WhatsApp API page (plan 090): 号码管理 is a page of its own in the place of 账号列表 — in the menu, among the tabs
// and as an address —; the chat page has no switch and no row of page tabs; the number and the source sit in the
// line under the customer's name; the time of a message is inside its bubble; the message box is a toolbar above
// one bar.
assert(appJs.includes("inbox:'WhatsApp API',numbers:'号码管理',") && !appJs.includes("accounts:'账号列表'"), '号码管理 must take the place of 账号列表 among the pages');
assert(appJs.includes('numbers:renderOpenwaNumbers,') && appJs.includes("renderItem('numbers', views.numbers)") && appJs.includes("'dashboard','inbox','numbers'"), '号码管理 must be a page of its own, in the menu and among the tabs');
assert(!appJs.includes('fid-wa-tabs') && !appJs.includes("if (fid.waTab === 'numbers') return renderOpenwaNumbers();"), 'the chat page must have no switch between numbers and chat');
assert(appJs.includes("fidWaTab:id=>navigate(id==='numbers'?'numbers':'inbox'),"), 'a button that asks for 号码管理 must open its page');
assert(appJs.includes("<a href=\"#numbers\" data-nav=\"numbers\">'+icon('Smartphone')+'号码管理</a></div></div>") && !appJs.includes("data-nav=\"accounts\">'+icon('Settings2')+'账号管理</a></div></div>"), 'the narrow-screen tools of a conversation must lead to 号码管理');
assert(appJs.includes('<span class="openwa-chat-number">') && !appJs.includes('<div class="openwa-chat-status">'), 'the number of a chat must sit in the line under the customer\'s name');
assert(appJs.includes("const meta='<span class=\"message-meta\">'") && appJs.includes("+esc(m.translated)+meta+'</div></div>'"), 'the time of a message must sit inside its bubble, at the end of its last line of text');
assert(appJs.includes("<div class=\"composer-input\">'+openwaAttachButton()+'<textarea id=\"composer-text\"") && !appJs.includes('<div class="composer-foot">'), 'the message box must be one bar — + for files, the message, send — below its toolbar');
const whatsappCss = read(path.join(__dirname, 'fidelity.css'));
for (const required of ['.fidelity:has(#view .inbox-page) #workspace-tabs { display:none; }', '.fidelity .fid-wa .inbox-layout { height:calc(100dvh - 92px);', '.fidelity:has(#view .inbox-page) #dialog.fid-dialog::backdrop { clip-path:inset(56px 0 0 240px); }', '.fidelity .message-meta { float:right;', '.fidelity .fid-wa .send-button .icon { display:block;']) {
  assert(whatsappCss.includes(required), `fidelity.css is missing ${required}`);
}
const summary = {
```

**Edit 5.8** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  qrPolling: 'the QR dialog (plan 091): while a code waits to be scanned it asks the server every 10 s (every 2 s while the code is prepared or checked), for at most 3 minutes; then it says the code expired and offers 刷新二维码; a scan that went through is told by the feed at once — a dialog left open no longer uses up OpenWA\'s limit of 1000 questions an hour',
  uiUpgradeWithdrawn: 'the UI upgrade of plans 081–087 (font, colours, chat-page layout, tables, dialogs, supervisor page) is withdrawn at the owner\'s request; kept: a dialog\'s footer stays in view while a long dialog scrolls, and the customer list\'s thirteen columns add up to 100%',
```

Replace them with:

```text
  qrPolling: 'the QR dialog (plan 091): while a code waits to be scanned it asks the server every 10 s (every 2 s while the code is prepared or checked), for at most 3 minutes; then it says the code expired and offers 刷新二维码; a scan that went through is told by the feed at once — a dialog left open no longer uses up OpenWA\'s limit of 1000 questions an hour',
  whatsappPage: 'the WhatsApp API page (plan 090): 号码管理 is a page of its own in the place of 账号列表 (menu, tabs, #numbers; #accounts opens the home page); the chat page has no numbers/chat switch and no row of page tabs; the number and the source sit in the line under the customer\'s name; the strip takes one line where it fits; bubbles are WhatsApp-sized with the time inside; the message box is a toolbar (customer language, what a reply does, send guard, 报价, 快捷回复, keys) above one bar (+ for files, the message, send)',
  uiUpgradeWithdrawn: 'the UI upgrade of plans 081–087 (font, colours, chat-page layout, tables, dialogs, supervisor page) is withdrawn at the owner\'s request; kept: a dialog\'s footer stays in view while a long dialog scrolls, and the customer list\'s thirteen columns add up to 100%',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `0b73c8bd182a4e46032b0cf14cde96dd40178ecb491c5b64c98190901c3da18b`; `git checkout 6ba9d27 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`, then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` → exactly `app.js`, `app.css`, `icons.js`, `tokens.css`, `validation.json`.

### Step 6: README, build log, final verification

#### `README.md`

**Edit 6.1** — `README.md`. Find exactly these lines (they occur once):

```text
| `#followups` | **跟进闭环中心** | 跟进待办队列、已结束跟进、操作日志三视图（内容均由人工录入，系统只提示今日到期与已逾期）；按标签筛选；「完成并闭环」必须安排下一步或结束跟进 |
| `#inbox` | **WhatsApp API 在线聊天** | 通过 OpenWA 扫码绑定真实号码、接收消息与发送文本、掉线后重新连接、解除绑定；接收译文与草稿预览、聊天窗内嵌跟进协同条（跟进状态、下次跟进、标签、安排跟进）；可直接调整客户等级与客户状态；可将会话快照移入聊天记录；会话卡片直接显示客户标签，不显示跟进状态；点击协同条的跟进状态或下次跟进可跳转到跟进闭环并定位该客户 |
| `Drawer` | **客户 360° 档案** | 600px 宽屏抽屉：跟进状态与下次跟进（已安排或已结束跟进的客户才显示）、`画像与跟进 / 互动轨迹 / 订单追踪 / 沟通备注` 四栏、结束跟进与重新跟进、跨号接触防撞单提示 |
```

Replace them with:

```text
| `#followups` | **跟进闭环中心** | 跟进待办队列、已结束跟进、操作日志三视图（内容均由人工录入，系统只提示今日到期与已逾期）；按标签筛选；「完成并闭环」必须安排下一步或结束跟进 |
| `#numbers` | **号码管理** | 通过 OpenWA 扫码绑定真实号码、掉线后重新连接、解除绑定；每个号码的连接状态、负责人、会话数与最近活跃；从号码进入聊天 |
| `#inbox` | **WhatsApp API 在线聊天** | 接收消息与发送文本；号码与客户来源显示在客户姓名下方；消息框上方工具栏（客户语言、发送保护、报价、快捷回复），下方与 WhatsApp 相同的输入栏；接收译文与草稿预览、聊天窗内嵌跟进协同条（跟进状态、下次跟进、标签、安排跟进）；可直接调整客户等级与客户状态；可将会话快照移入聊天记录；会话卡片直接显示客户标签，不显示跟进状态；点击协同条的跟进状态或下次跟进可跳转到跟进闭环并定位该客户 |
| `Drawer` | **客户 360° 档案** | 600px 宽屏抽屉：跟进状态与下次跟进（已安排或已结束跟进的客户才显示）、`画像与跟进 / 互动轨迹 / 订单追踪 / 沟通备注` 四栏、结束跟进与重新跟进、跨号接触防撞单提示 |
```

#### `replica/build-log.md`

**Append 6.2** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## WhatsApp API：号码管理成为独立页面，聊天窗口更大 · 2026-11-27

应业主要求调整 WhatsApp API 页面：

- **号码管理**：左侧菜单中「账号列表」换成「号码管理」，位于 WhatsApp API 下方，打开扫码绑定、重新连接与解除绑定所在的页面（地址 `#numbers`）。「账号列表」页面不再提供。
- **聊天窗口更大**：WhatsApp API 直接打开在线聊天，不再有「号码管理 / 在线聊天」切换；聊天页面不显示页面标签栏。号码和客户来源并入客户姓名下方的一行，跟进协同条在宽度足够时只占一行。在 1366 × 768 的屏幕上，消息区从 185 像素增至约 478 像素。
- **气泡更小**：字号与留白接近 WhatsApp，时间显示在气泡内最后一行的末尾，译文是气泡内较小的第二部分。
- **消息框**：上方一条工具栏（客户语言、发送方式、发送保护、报价、快捷回复、快捷键提示），下方一条与 WhatsApp 相同的输入栏（+ 添加文件、圆角输入框、圆形发送按钮）。宽度不够时工具栏和跟进协同条自动换行，不会遮住任何按钮。

验证：构建与校验脚本通过；在 1366 × 768、1440 × 900、1920 × 1080、1024 × 768 与手机宽度下检查：无横向滚动、无内容被截断；浏览器测试。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout 6ba9d27 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-090/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `fcf361e3cba2678a586d7cf624078134c19b9ff67c74599158b29b6ccd60e9b0`, `228fad8cec0c7e619cf1e89c60de456efa966c78ab21f1cedff793359ea35b8d`; `git status --porcelain` lists exactly the 10 files of the table in "Current state" and the 5 built files as changed, and nothing as new. Commit everything (one commit is fine).

## Test plan

- **Validator** — 号码管理 in the place of 账号列表 (pages, menu, tabs, the narrow-screen tools), no switch, the number under the name, the time inside the bubble, the message box's two parts, the style rules that hide the tabs on the chat page and size the conversation, the backdrop, the time and the send icon.
- **Smoke** (`/tmp/wa-scrm-plan-090/smoke.sh`) — the same facts in the sources and the built files, which built files changed, the syntax of the built page, the five test files.
- **Verified by the reviewer, not by you**: screenshots and measurements at 1366 × 768, 1440 × 900, 1920 × 1080, 1024 × 768 and 390 × 844 (no sideways scroll, nothing cut off, the message area), the number page, a dialog over the chat, the chat records page; the full browser suites, in copies adapted where they reached for the old layout (the switch, the accounts page, the hint below the box, the row of the number) and that read a message's text without its time.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 6ba9d27 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test` → `tests 91`, `pass 91`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-090/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity-ui.js work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-ai.js work/wa-replica/build-fidelity.cjs work/wa-replica/fidelity.css work/wa-replica/fidelity-lifecycle.css work/wa-replica/validate-scrm-lifecycle.cjs README.md replica/build-log.md` → the "after this plan" values of the table in "Current state"
- [ ] `git status --porcelain` (before the commit) lists exactly those 10 files and the 5 built files; after the commit the working tree is clean

## STOP conditions

Stop and report (do not improvise) if:

- the drift check shows that an in-scope file changed since `6ba9d27` and the "Current state" facts no longer match;
- a "find" block does not occur exactly once, or a checksum does not match after one careful retry;
- the build fails ("Missing prototype source anchor" included), the validator fails, a test fails, or a test count differs from the expected numbers;
- the build changes an output file other than the 5 named;
- the smoke script reports `MISS` for anything at the end of Step 6;
- you would need to touch a file outside the scope, or install anything.

## Maintenance notes

- **The source strip** stays in the markup of a conversation although it is hidden: `fidelity-lifecycle.js` inserts the follow-up strip before it. Code that needs to change the chat heading should insert into the line under the name (`customer-sub`), as `fidelity-openwa.js` does now.
- **The time inside the text**: code or tests that read a message's text from the page must leave out `.message-meta`.
- **The old accounts page** (`renderAccounts` and its actions in `fidelity-ui.js`) is unused; renaming a number, adding one by hand and removing one that is no longer linked are not offered anywhere any more (the owner's choice).
