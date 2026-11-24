# Plan 061: Chats pinned to the top of the chat list from a right-click menu

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3edf3bf..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (two page modules of the browser app, a style sheet, two icons added to the build, the validator and the build log; exact text and checksums for every file; no server change)
- **Depends on**: plans/060-translation-shortcut.md (DONE — its build holds the list of added icons this plan extends)
- **Category**: feature (requested by the owner)
- **Planned at**: commit `3edf3bf`, 2026-11-24

## Why this matters

The owner wrote on 2026-11-24: "The chat interface should include a 'pin to top' (sticky) function." In answer to the advisor's questions the owner asked for **a right-click menu**, opened **on the chats of the chat list**. Today the list is ordered by the time of each chat's last message only; an important customer slides down as others write. With this plan a right-click on a chat opens a small menu with **置顶** (pin to top), or **取消置顶** (unpin) on a pinned chat.

### Decisions already made (do not re-open; do not ask)

The owner chose, on 2026-11-24:

- A **right-click menu on the chats of the chat list**, with 置顶 / 取消置顶 and nothing else for now.
- Pinned chats **stay at the top of the list**, marked with a pin, **newest message first among them**; **no limit**; only in WA-SCRM — WhatsApp on the phone is not changed.

Decided by the advisor, within that:

- The pin is kept with the customer record (`pinned: true`; unpinning removes the field), saved with the workspace's data like the star (星标). Each employee has a workspace of their own, so pins are the employee's.
- Pinned chats come first in every filter (全部, 未读, 待回复, 星标) and in the search, in the order the list already uses (time of the last message); the others follow in that order too.
- The menu opens where the right-click happened, kept inside the screen; the menu key (or Shift + F10) on a chat that has the focus opens it beside the chat. The focus goes to the menu's item; Escape closes the menu and gives the focus back to the chat; a click elsewhere, scrolling, resizing or leaving the page closes it. A right-click anywhere else keeps the browser's own menu.
- The row of a pinned chat shows a pin after the time, and its name for screen readers ends with （已置顶）. A toast confirms each change.
- When two records of the same WhatsApp chat are merged (the OpenWA module does that), the pin is kept like the star.
- The supervisor page, which shows an employee's chats read-only, is not changed.
- The icons `Pin` and `PinOff` are added to the build's list of added icons, from lucide-static 1.0.0 like the gear of plan 060.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server. There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/fidelity-lifecycle.js` | `90aa110f2597f4a11e54240f211d14f4b04fb0994b408b794869d783e3fd2a93` | `a0e95b93bd8b60b5bb3ca49cff06eb4007944ea73b3016fcdbffb782edf52879` | 2 |
| `work/wa-replica/fidelity-lifecycle.css` | `a82966f5a59fcd9fecf12463309e787b1553a053a951ce6d7c56c159397f98ed` | `6ae2bc59c39f4dfdd5736249c753531adaf4a66b013d8abdd24e0c2ee44b4ab4` | 1 |
| `work/wa-replica/fidelity-openwa.js` | `99fd88dcc39b1917cb1092a898ca9ee3bbd1924f0a6663fcd6de259eb85164e7` | `1233b760f7000b554293fe7b8de89a754659f86f4b6403fcd122dd4edd582105` | 1 |
| `work/wa-replica/build-fidelity.cjs` | `4660286ff56bcf2d6d740dd55d1f55bc30ad985e957f2f56244e97c68438f22e` | `a7d18bf4d85642420880e6db3557d31227a377ef8cdb647ae66a642b5544796c` | 1 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `789a08346ac255e6bb6fca11eee271ac0b17a9aaca79d68a589ccf075407e107` | `f7e8ab541e1f40e41f3f92a5ceeff18a0863e52e650d9e60282e5fcba92ea855` | 2 |
| `replica/build-log.md` | `31acc45d044b24bc78d1d3fabc8fa91195a569f50415f710c43057fd30ad489d` | `94a6ad0f9612fb259f7d5aa73e325741c316aef3cbcd60ca7ee74023e937a1ef` | 1 append |

- `fidelity-lifecycle.js` — the module of the customer workbench; it draws the rows of the chat list (its override of `conversationRows`, from `filteredConversations()`, which the base app defines as the customers of the chosen filter and search, ordered by `openwaOrder` — the time of the last message). Base functions are replaced by assignment in this code base (`conversationRows = function() { … }`); this plan does the same with `filteredConversations`. The module's star toggle (`star` in its actions) is the pattern for a change of a customer: change the record, `persist()`, `render()`.
- `fidelity-lifecycle.css` — the module's style sheet.
- `fidelity-openwa.js` — the WhatsApp module; one line of its merge of duplicate chats keeps the star, and now the pin.
- `build-fidelity.cjs` — the build; plan 060 gave it `addedIcons` (icons the committed pool lacks, from lucide-static 1.0.0); this plan adds two to it.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly four output files differ: `app.js`, `app.css`, `icons.js` (87 icons instead of 85: `Pin` and `PinOff` added) and `validation.json` (written by the validator). The style rules use only sizes that are already in use, so `tokens.css` comes out unchanged.

## Commands you will need

Run from the repository root (inside your worktree). Plain `node` is enough for every command of this plan.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 3edf3bf -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and, once Step 3 is done, `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Smoke | `bash /tmp/wa-scrm-plan-061/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-lifecycle.js`, `work/wa-replica/fidelity-lifecycle.css`, `work/wa-replica/fidelity-openwa.js` (Step 2)
- `work/wa-replica/build-fidelity.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.js`, `app.css`, `icons.js`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — the server files, `fidelity-master.js` (the supervisor page), the other `fidelity-*.js` modules, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/061-pinned-chats` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): pin chats to the top of the chat list from a right-click menu`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text and long SVG path data; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 7 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the six files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-061/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-061 && cat > /tmp/wa-scrm-plan-061/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 061: chats pinned to the top of the chat list from a right-click menu.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
has 'pinned chats come first' "$W/fidelity-lifecycle.js" 'return [...list.filter(c => c.pinned), ...list.filter(c => !c.pinned)];'
has 'a right-click on a chat opens the menu' "$W/fidelity-lifecycle.js" "const row = event.target.closest?.('#conversation-list .conversation[data-id]'), c = row && customer(row.dataset.id);"
has 'the menu offers pinning and unpinning' "$W/fidelity-lifecycle.js" "\${c.pinned ? '取消置顶' : '置顶'}</button>"
has 'a pinned chat is marked with a pin' "$W/fidelity-lifecycle.js" '<span class="conversation-pin" title="已置顶">'
has 'merging a duplicate chat keeps the pin' "$W/fidelity-openwa.js" 'star: keep.star || drop.star, pinned: keep.pinned || drop.pinned,'
has 'the build knows the pin icons' "$W/build-fidelity.cjs" '  PinOff: [["path",{"d":"M12 17v5"}]'
has 'the icon pool has the pin' "$O/icons.js" '"Pin":[["path",{"d":"M12 17v5"}]'
has 'the page is built with it' "$O/app.js" 'function lcPinChat(id) {'
has 'the menu has its style' "$O/app.css" '.chat-menu { position: fixed; z-index: 20;'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  pinnedChats: 'a right-click"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 会话置顶：在聊天列表里右键点击会话 · 2026-11-24'
same 'of the built files only the page, its styles, its icons and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.js|app\.css|icons\.js|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-061/smoke.sh && ls -l /tmp/wa-scrm-plan-061/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-lifecycle.css work/wa-replica/fidelity-openwa.js work/wa-replica/build-fidelity.cjs work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `bash /tmp/wa-scrm-plan-061/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `pinned chats come first`, `a right-click on a chat opens the menu`, `the menu offers pinning and unpinning`, `a pinned chat is marked with a pin`, `merging a duplicate chat keeps the pin`, `the build knows the pin icons`, `the icon pool has the pin`, `the page is built with it`, `the menu has its style`, `the validator knows it` and `the build log has the entry` (eleven checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The chat list: pinned chats first, the pin in the row, the right-click menu; its styles; the merge

#### `fidelity-lifecycle.js`

**Edit 2.1** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
      const selected = fid.chatOpen && c.id === ui.customer ? 'selected' : '';
      return `<button type="button" class="conversation ${selected}" aria-label="打开${esc(c.name)}的会话" data-action="openConversation" data-id="${esc(c.id)}">
        ${avatar(c)}
        <span class="conversation-main">
          <span class="conversation-line"><strong>${esc(c.name)}${lcTier(c) ? ' ' + lcTierBadge(c) : ''}</strong><time>${esc(c.last)}</time></span>
          <span class="conversation-preview"><span>${esc(c.preview)}</span>${c.unread ? `<span class="unread">${c.unread}</span>` : ''}</span>
```

Replace them with:

```text
      const selected = fid.chatOpen && c.id === ui.customer ? 'selected' : '';
      return `<button type="button" class="conversation ${selected}" aria-label="打开${esc(c.name)}的会话${c.pinned ? '（已置顶）' : ''}" data-action="openConversation" data-id="${esc(c.id)}">
        ${avatar(c)}
        <span class="conversation-main">
          <span class="conversation-line"><strong>${esc(c.name)}${lcTier(c) ? ' ' + lcTierBadge(c) : ''}</strong><time>${esc(c.last)}</time>${c.pinned ? `<span class="conversation-pin" title="已置顶">${icon('Pin')}</span>` : ''}</span>
          <span class="conversation-preview"><span>${esc(c.preview)}</span>${c.unread ? `<span class="unread">${c.unread}</span>` : ''}</span>
```

**Edit 2.2** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text

  const lcPrevChatHTML = chatHTML;
```

Replace them with:

```text

  // ---- pinning chats (plan 061) ----
  // A right-click on a chat in the list (or the menu key while the chat has the focus) opens a small menu with
  // 置顶 or 取消置顶. A pinned chat stays at the top of the list, whatever the filter or the search, and is
  // marked with a pin; pinned chats keep the order of their last message among themselves. The pin is kept with
  // the customer (pinned: true) in this workspace only: WhatsApp on the phone is not changed.
  const lcFilteredConversations = filteredConversations;
  filteredConversations = function() {
    const list = lcFilteredConversations();
    return [...list.filter(c => c.pinned), ...list.filter(c => !c.pinned)];
  };
  const lcChatMenuClose = () => document.querySelector('.chat-menu')?.remove();
  // The menu at a place on the screen (kept inside it), with the focus on its item.
  function lcChatMenuOpen(c, x, y) {
    lcChatMenuClose();
    const menu = document.createElement('div');
    menu.className = 'chat-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', `${c.name}的会话`);
    menu.innerHTML = `<button type="button" class="chat-menu-item" role="menuitem" data-pin-chat="${esc(c.id)}">${icon(c.pinned ? 'PinOff' : 'Pin')}${c.pinned ? '取消置顶' : '置顶'}</button>`;
    document.body.append(menu);
    paintIcons(menu);
    const box = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(x, innerWidth - box.width - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(y, innerHeight - box.height - 8))}px`;
    menu.querySelector('button').focus();
  }
  function lcPinChat(id) {
    const c = customer(id);
    lcChatMenuClose();
    if (!c) return;
    if (c.pinned) delete c.pinned;
    else c.pinned = true;
    persist();
    render();
    toast(c.pinned ? `已置顶「${c.name}」。` : `已取消置顶「${c.name}」。`);
  }
  document.addEventListener('contextmenu', event => {
    const row = event.target.closest?.('#conversation-list .conversation[data-id]'), c = row && customer(row.dataset.id);
    if (!c) return;
    event.preventDefault();
    // A right-click opens the menu where it happened; the menu key opens it beside the chat.
    const place = row.getBoundingClientRect();
    lcChatMenuOpen(c, event.clientX || event.clientY ? event.clientX : place.left + 24, event.clientX || event.clientY ? event.clientY : place.top + place.height / 2);
  });
  document.addEventListener('click', event => {
    const item = event.target.closest?.('[data-pin-chat]');
    if (item) return lcPinChat(item.dataset.pinChat);
    if (!event.target.closest?.('.chat-menu')) lcChatMenuClose();
  });
  // Escape closes the menu and gives the focus back to the chat; scrolling, resizing or leaving the page closes it.
  document.addEventListener('keydown', event => {
    const menu = document.querySelector('.chat-menu');
    if (!menu || event.key !== 'Escape') return;
    event.preventDefault();
    const id = menu.querySelector('[data-pin-chat]').dataset.pinChat;
    lcChatMenuClose();
    [...document.querySelectorAll('#conversation-list .conversation[data-id]')].find(row => row.dataset.id === id)?.focus();
  });
  addEventListener('scroll', lcChatMenuClose, true);
  addEventListener('resize', lcChatMenuClose);
  addEventListener('blur', lcChatMenuClose);

  const lcPrevChatHTML = chatHTML;
```

#### `fidelity-lifecycle.css`

**Edit 2.3** — `work/wa-replica/fidelity-lifecycle.css`. Find exactly these lines (they occur once):

```text
}
.conversation-line .lc-tier {
```

Replace them with:

```text
}
.conversation-pin { display: inline-flex; color: var(--fid-quiet); }
.conversation-pin .icon { width: 14px; height: 14px; }
.chat-menu { position: fixed; z-index: 20; min-width: 120px; padding: 4px; border: 1px solid var(--fid-frame); border-radius: 8px; background: var(--color-surface); box-shadow: 0 2px 8px var(--fid-shadow); }
.chat-menu-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border: 0; border-radius: 6px; background: none; color: var(--color-text); font-size: 14px; text-align: left; cursor: pointer; }
.chat-menu-item:hover, .chat-menu-item:focus-visible { background: var(--color-accent-soft); color: var(--color-accent); outline: none; }
.chat-menu-item .icon { width: 16px; height: 16px; }
.conversation-line .lc-tier {
```

#### `fidelity-openwa.js`

**Edit 2.4** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    const last = list.at(-1);
    Object.assign(keep, { waChat: drop.waChat, unread: Math.max(Number(keep.unread) || 0, Number(drop.unread) || 0), star: keep.star || drop.star,
      tags: [...new Set([...keep.tags, ...drop.tags])], notes: keep.notes || drop.notes, ...(last?.at ? { preview: last.text, translation: '', last: last.time, lastAt: last.at } : {}) });
```

Replace them with:

```text
    const last = list.at(-1);
    Object.assign(keep, { waChat: drop.waChat, unread: Math.max(Number(keep.unread) || 0, Number(drop.unread) || 0), star: keep.star || drop.star, pinned: keep.pinned || drop.pinned,
      tags: [...new Set([...keep.tags, ...drop.tags])], notes: keep.notes || drop.notes, ...(last?.at ? { preview: last.text, translation: '', last: last.time, lastAt: last.at } : {}) });
```

What these edits do, so that you can recognise them: in `fidelity-lifecycle.js` the first edit adds the pin and the screen-reader words to a row of the list; the second adds, after `conversationRows`, the section "pinning chats (plan 061)" — the replacement of `filteredConversations`, the menu (`lcChatMenuOpen`, `lcChatMenuClose`), the change of a pin (`lcPinChat`) and the listeners for contextmenu, click, Escape, scrolling, resizing and leaving the page. The edit of `fidelity-lifecycle.css` adds the styles of the pin and the menu before the rule of `.conversation-line .lc-tier`. The edit of `fidelity-openwa.js` keeps the pin when two records of a chat are merged.

**Verify**: `sha256sum work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-lifecycle.css work/wa-replica/fidelity-openwa.js` → `a0e95b93bd8b60b5bb3ca49cff06eb4007944ea73b3016fcdbffb782edf52879`, `6ae2bc59c39f4dfdd5736249c753531adaf4a66b013d8abdd24e0c2ee44b4ab4`, `1233b760f7000b554293fe7b8de89a754659f86f4b6403fcd122dd4edd582105`. If a checksum does not match, restore the file with `git checkout 3edf3bf -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 3: The pin icons in the build, the validator — and the build

#### `build-fidelity.cjs`

**Edit 3.1** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
  Settings: [["path",{"d":"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"}],["circle",{"cx":"12","cy":"12","r":"3"}]],
};
```

Replace them with:

```text
  Settings: [["path",{"d":"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"}],["circle",{"cx":"12","cy":"12","r":"3"}]],
  Pin: [["path",{"d":"M12 17v5"}],["path",{"d":"M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"}]],
  PinOff: [["path",{"d":"M12 17v5"}],["path",{"d":"M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89"}],["path",{"d":"m2 2 20 20"}],["path",{"d":"M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11"}]],
};
```

#### `validate-scrm-lifecycle.cjs`

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(read(path.join(out, 'icons.js')).includes('"Settings":[["path"'), 'the gear must be in the icon pool');

```

Replace them with:

```text
assert(read(path.join(out, 'icons.js')).includes('"Settings":[["path"'), 'the gear must be in the icon pool');
// Pinning chats (plan 061): a right-click on a chat in the list opens a menu with 置顶 or 取消置顶; pinned chats come
// first in every filter and search, marked with a pin; the pin is kept with the customer and survives the merging
// of a duplicate chat.
for (const required of ['return [...list.filter(c => c.pinned), ...list.filter(c => !c.pinned)];', "document.addEventListener('contextmenu', event => {", "const row = event.target.closest?.('#conversation-list .conversation[data-id]'), c = row && customer(row.dataset.id);", "${c.pinned ? '取消置顶' : '置顶'}</button>", 'if (c.pinned) delete c.pinned;', "<time>${esc(c.last)}</time>${c.pinned ? `<span class=\"conversation-pin\" title=\"已置顶\">${icon('Pin')}</span>` : ''}</span>"]) {
  assert(moduleSource.includes(required), `fidelity-lifecycle.js is missing ${required}`);
  assert(appJs.includes(required), `app.js is missing ${required}`);
}
assert(openwaSource.includes('star: keep.star || drop.star, pinned: keep.pinned || drop.pinned,'), 'merging a duplicate chat must keep its pin');
for (const name of ['"Pin":[["path"', '"PinOff":[["path"']) assert(read(path.join(out, 'icons.js')).includes(name), `the icon pool must hold ${name}`);

```

**Edit 3.3** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  translateShortcut: 'a key combination set under the gear beside the customer\'s language (Ctrl + Enter at first; Ctrl or Alt, maybe Shift, and a letter or Enter; combinations that typing, sending or the browser need are refused) translates the message box into the customer\'s language and shows it above the box, guard on or off; Enter then sends the translation; the line under the box names it',
```

Replace them with:

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  pinnedChats: 'a right-click (or the menu key) on a chat in the list opens a menu with 置顶 / 取消置顶; pinned chats stay at the top of the list in every filter and search, in the order of their last message, marked with a pin; kept with the customer in this workspace, WhatsApp on the phone unchanged',
  translateShortcut: 'a key combination set under the gear beside the customer\'s language (Ctrl + Enter at first; Ctrl or Alt, maybe Shift, and a letter or Enter; combinations that typing, sending or the browser need are refused) translates the message box into the customer\'s language and shows it above the box, guard on or off; Enter then sends the translation; the line under the box names it',
```

**Verify**: `sha256sum work/wa-replica/build-fidelity.cjs work/wa-replica/validate-scrm-lifecycle.cjs` → `a7d18bf4d85642420880e6db3557d31227a377ef8cdb647ae66a642b5544796c`, `f7e8ab541e1f40e41f3f92a5ceeff18a0863e52e650d9e60282e5fcba92ea855`; `git checkout 3edf3bf -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.js`, `app.css`, `icons.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else (if git also shows `icons.js` staged because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`, which keeps the built content); `sha256sum outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/app.css outputs/wa-replica-prototype/icons.js` → `a748bb9bd8e6edaf23f5d7d325d127b5d893d8e3d4c01ab176a986ba2b07faf9`, `d85f28c1f858ba30240b3c3f19ffe4c983307d5ff917e67ac02dc5dd0a312b14`, `d2ab29720ba755d451fd7c24f8746b29632acdbefbcb28eff311bcce8c8afedf`. If a checksum does not match, restore the file with `git checkout 3edf3bf -- <file>` and apply its instructions again; if it still does not match, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 会话置顶：在聊天列表里右键点击会话 · 2026-11-24

在聊天列表里右键点击一个会话，会出现一个小菜单「置顶」；已经置顶的会话显示「取消置顶」。

- 置顶的会话固定在列表最上方，时间右边有一个图钉图标；几个置顶会话之间按最新消息排序，其余会话照常排在后面。筛选（全部、未读、待回复、星标）和搜索时，置顶会话同样排在最前。
- 置顶数量不限，保存在这个工作区里，刷新页面或换一台电脑登录后仍然有效；手机上的 WhatsApp 不受影响。
- 也可以先用 Tab 键选中会话，再按键盘上的菜单键打开菜单；按 Esc 关闭菜单。

验证：构建与校验脚本通过；浏览器测试覆盖右键菜单（位置、置顶与取消置顶、点击别处或滚动时关闭、Esc 关闭后焦点回到会话、菜单键打开）、置顶会话的排序（新消息到达时、筛选和搜索时）、图钉标记、刷新后仍然置顶，以及窄屏下的菜单。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout 3edf3bf -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && bash /tmp/wa-scrm-plan-061/smoke.sh
```

**Verify**: build exit 0 with `"icons": 87`; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `94a6ad0f9612fb259f7d5aa73e325741c316aef3cbcd60ca7ee74023e937a1ef`; `git status --porcelain` lists exactly these ten as changed and nothing as new: the six files of the table in "Current state" and `outputs/wa-replica-prototype/app.js`, `app.css`, `icons.js`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the facts of the feature (the block added in Step 3): the order of the list, the right-click on a chat, the items of the menu, unpinning removes the field, the pin in the row; all of them in the source and in the built `app.js`; the merge keeps the pin; both icons in the pool.
- **Smoke** (`/tmp/wa-scrm-plan-061/smoke.sh`) — the same facts, the icons in the build and in the pool, the built style rule, which built files changed and the syntax of the built page.
- **Verified by the reviewer, not by you**: in a browser against a stand-in server and a stand-in OpenWA — the menu at the pointer with the focus on 置顶; pinned: first in the list, a pin and （已置顶）, a toast, kept on the server, the others in their order; two pinned chats in the order of their last message, and a message for another chat does not pass them; the filter 未读 and the search keep pinned chats first; 取消置顶 puts the chat back and removes the field; the menu closes on a click elsewhere, on Escape (the focus back on the chat) and on scrolling; the menu key opens it beside the chat; a right-click elsewhere keeps the browser's menu; still pinned after the page is opened again; on a 390 px screen the menu stays inside; the earlier browser sessions.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 3edf3bf -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `bash /tmp/wa-scrm-plan-061/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.js` → `a0e95b93bd8b60b5bb3ca49cff06eb4007944ea73b3016fcdbffb782edf52879`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.css` → `6ae2bc59c39f4dfdd5736249c753531adaf4a66b013d8abdd24e0c2ee44b4ab4`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js` → `1233b760f7000b554293fe7b8de89a754659f86f4b6403fcd122dd4edd582105`
- [ ] `sha256sum work/wa-replica/build-fidelity.cjs` → `a7d18bf4d85642420880e6db3557d31227a377ef8cdb647ae66a642b5544796c`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `f7e8ab541e1f40e41f3f92a5ceeff18a0863e52e650d9e60282e5fcba92ea855`
- [ ] `sha256sum replica/build-log.md` → `94a6ad0f9612fb259f7d5aa73e325741c316aef3cbcd60ca7ee74023e937a1ef`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `a748bb9bd8e6edaf23f5d7d325d127b5d893d8e3d4c01ab176a986ba2b07faf9`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `d85f28c1f858ba30240b3c3f19ffe4c983307d5ff917e67ac02dc5dd0a312b14`
- [ ] `sha256sum outputs/wa-replica-prototype/icons.js` → `d2ab29720ba755d451fd7c24f8746b29632acdbefbcb28eff311bcce8c8afedf`
- [ ] `git diff --name-only 3edf3bf..HEAD -- outputs` lists `app.js`, `app.css`, `icons.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only 3edf3bf..HEAD -- . ':!plans'` lists exactly ten paths: the six of the table in "Current state" and the four output files
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, or the build reports another number of icons than 87 after Step 3.
- An output file other than `app.js`, `app.css`, `icons.js` and `validation.json` changes (`tokens.css` in particular must not).
- The work appears to require editing an out-of-scope file, creating a file or installing a package.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else. No chat is pinned until someone pins one.
- The menu holds one item now; another item later goes into `lcChatMenuOpen` with an attribute of its own and a branch in the click listener.
- Anything else that orders the chat list must go through `filteredConversations`, or pinned chats lose their place.
- What a reviewer should scrutinise: that only a row of `#conversation-list` opens the menu; that the menu is removed whenever it should be (no second menu, none left behind after a redraw); that the customer's name reaches the page only through `esc` (the menu's label is set with `setAttribute`).
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
