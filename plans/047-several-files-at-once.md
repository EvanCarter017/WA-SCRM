# Plan 047: Several files are attached at once and sent one after the other

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 201c56e..HEAD -- work/wa-replica replica/build-log.md outputs README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM (how files are sent from the page changes: a mistake sends a file twice, out of order, or leaves one behind; page files only — the server sends one file for one request, as before; exact text and checksums for every edit)
- **Depends on**: plans/046-no-green-dot-in-the-list.md (DONE)
- **Category**: feature (owner request)
- **Planned at**: commit `201c56e`, 2026-11-22

## Why this matters

Since plan 043 a file can be sent from the message box — one for a message: attach, send, attach the next. That limit was part of what the owner had been offered and had chosen. Having used it, the owner asked, 2026-11-22: "can only one file be uploaded at a time?" Asked whether several files should be attached and sent in one go — "Choose, paste or drop up to 10 files (16 MB each). They go out one after the other, each as its own WhatsApp message, which is how WhatsApp itself sends several files. The text you type goes with the first file. If one fails, the rest stay attached and Send continues." — the owner chose "Yes, several at once".

What this plan does:

- **Files add up.** The "+" button takes several files at once, and pasting or dropping several adds them all; what is attached later is added to what is attached already — ten files at most for a conversation. Each file has its own "移除". An empty file, a file over 16 MB and files beyond the tenth are left out, and one sentence says what was left out.
- **They go out one after the other**, in the order they were added, each as a message of its own — WhatsApp has no message with several files; its own apps send them the same way. What is in the message box goes out as the caption of the first file (through the send guard, like any reply). Each file is one request to the server, exactly as before.
- **A file that is not sent stops the row.** The files that went out are in the conversation; the one that did not, and the ones after it, stay attached, and the page says so. Pressing send again goes on with that file — with the same request, so a file whose outcome was open is never sent twice.
- While the files are on their way the line above the message box says so, nothing can be removed or added, and the send button waits.

### Decisions already made (do not re-open; do not ask)

- Ten files at most (`OPENWA_FILES_MAX`); 16 MB for each, as before.
- The caption belongs to the first file only. The other files go out without words.
- Files are sent strictly one after the other, never at the same time: their order in the conversation is the order in which they were attached.
- The line above the message box is the baseline's own (it names one attachment by a label); the page puts the list of files in its place. The label now says how many files there are — it is what enables the send button.
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/fidelity-openwa.js` | `13b1ef82f831575198f5ff351f6a938a56a7e3f64490b6fd87d3876070b3d9dd` | `583ac3618310877cf5118368ef05962e8a83a1d2c1f1dd7dc26ac8f1b77af375` |
| `work/wa-replica/fidelity.css` | `50f7a14ceb746663a8f8e31d937ff55cb6195d28dfc20bb06b23a0e9d5315e6a` | `d98567514197b935ecdcc540cfb4c81beb785033fdf0256e3fc87c165813ee55` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `db6357777871a5bab2ffa6b14c8034a50d64414a4a53b5e4974bf3ae9568276b` | `f129d8548746b4c9c6ee327819bbd36bc1c03f508cf7550824406360e23f4584` |
| `README.md` | `e5d94ecc161159ca3692309885997fe776d0c79beb4da2ac86fef6a13d1dfc66` | `295bf12dbdd0b851b61789d615f2c8376e9056e15a24de092f2e4e782b633a99` |

- `fidelity-openwa.js` — the chat module of the page. Since plan 043: `openwaFiles` holds the file attached to each conversation, `openwaAttach(files)` attaches the first of the files it is given, `openwaDetach(id)` takes it off, the wrapper around `previewHTML` adds a small picture to the baseline's line "附件 … 移除", `openwaSendFile` posts the file to `/api/wa/send-file` and, when the server says it was sent, puts the message into the conversation; `send` calls it when a file is attached; the action `removeAttachment` removes the file. `openwaShowFile(c)` draws the line above the message box again; `openwaApply` (the feed) asks `openwaFiles.get(id)?.sending` in two places — that keeps working, the entry of a conversation still has `sending`.
- `fidelity.css` — the styles of the modules; the rules of the attached file get company. The new sizes are in use already, so `tokens.css` does not change.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page; the block of plan 043 follows the new names.
- `README.md` — one sentence of the paragraph about sending files; `replica/build-log.md` gets an entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 201c56e -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Syntax of the page module | `node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/fidelity-openwa.js','utf8')+'})');console.log('SYNTAX_OK')"` | `SYNTAX_OK` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 12`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-047/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-openwa.js`, `work/wa-replica/fidelity.css`, `work/wa-replica/validate-scrm-lifecycle.cjs`, `README.md`, `replica/build-log.md` (Step 2)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{app.js,app.css,validation.json}` (the other output files, `icons.js` and `tokens.css` among them, must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular the server files (`openwa-link.cjs` does not change: one request still sends one file), the other page modules, the other style sheets, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/047-several-files-at-once` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): attach several files at once and send them one after the other`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the four files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-047/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-047 && cat > /tmp/wa-scrm-plan-047/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that several files can be attached to a message and are sent one after the other.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'ten files at most' "$P/app.js" 'const OPENWA_FILES_MAX = 10;'
has 'the button takes several files' "$P/app.js" '<input type="file" id="openwa-file" multiple hidden>'
has 'the files go out one after the other, the first with the caption' "$P/app.js" "for (let first = true; held.list.length && !failed; first = false) failed = await openwaSendFile(c, held.list[0], first ? text : '', first ? caption : '');"
has 'with files attached, send sends the row' "$P/app.js" 'if (held) return openwaSendFiles(c, held, text, outgoing);'
has 'each file can be removed by itself' "$P/app.js" 'openwaDetach(c.id, held.list[Number(id)]);'
same 'nothing says one file at a time any more' "$(grep -c '一次发送一个文件' "$P/app.js")" 0
has 'the style sheet lists the attached files' "$P/app.css" '.openwa-attached-list'
has 'the README says ten files' "$ROOT/README.md" '一次最多添加 10 个文件'
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 一次发送多个文件'
same 'the page module passes the syntax check' "$(cd "$ROOT" && node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/fidelity-openwa.js','utf8')+'})');console.log('SYNTAX_OK')" 2>&1)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-047/smoke.sh && ls -l /tmp/wa-scrm-plan-047/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs README.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-047/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `ten files at most`, `the button takes several files`, `the files go out one after the other, the first with the caption`, `with files attached, send sends the row`, `each file can be removed by itself`, `nothing says one file at a time any more` (got: 1), `the style sheet lists the attached files`, `the README says ten files` and `the build log has the entry` (nine checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The files, their styles, the check, README and build log; final verification

#### `fidelity-openwa.js`

**Edit 2.1** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text

  // ---- sending a file ----
  // One file can be attached to a conversation: with the "+" button, by pasting it into the message box, or by
  // dropping it on the conversation. It goes out with what is in the message box as its caption, and it stays
  // attached until the server says it was sent — pressing send again repeats the same request, which never
  // sends twice. The file itself lives in this page only: after a reload nothing is attached.
  const OPENWA_FILE_MAX = 16 * 1024 * 1024;
  const OPENWA_CAPTION_MAX = 1024;
```

Replace them with:

```text

  // ---- sending files ----
  // Files can be attached to a conversation, ten at most: with the "+" button, by pasting them into the message
  // box, or by dropping them on the conversation. They go out one after the other, each as a message of its own
  // — the way WhatsApp itself sends several files — and the first one carries what is in the message box as its
  // caption. A file stays attached until the server says it was sent: pressing send again goes on where the row
  // stopped and repeats the same request for the file whose outcome was open, which never sends twice. The files
  // live in this page only: after a reload nothing is attached.
  const OPENWA_FILE_MAX = 16 * 1024 * 1024;
  const OPENWA_FILES_MAX = 10;
  const OPENWA_CAPTION_MAX = 1024;
```

**Edit 2.2** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
  const OPENWA_FILE_SHOWN = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const openwaFiles = new Map();
  for (const id of Object.keys(ui.attachments)) delete ui.attachments[id];
```

Replace them with:

```text
  const OPENWA_FILE_SHOWN = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  // For each conversation: the files that wait, in the order they were added, and whether they are on their way.
  // The baseline's label of an attachment says how many there are; it is what enables the send button.
  const openwaFiles = new Map();
  const openwaFilesLabel = count => `${count} 个文件`;
  for (const id of Object.keys(ui.attachments)) delete ui.attachments[id];
```

**Edit 2.3** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
  function openwaAttachButton() {
    return `<button class="icon-button" type="button" data-action="openwaAttach" aria-label="添加文件" title="添加图片、视频、音频或文件，也可以粘贴或拖到会话里">${icon('Plus')}</button><input type="file" id="openwa-file" hidden>`;
  }
```

Replace them with:

```text
  function openwaAttachButton() {
    return `<button class="icon-button" type="button" data-action="openwaAttach" aria-label="添加文件" title="添加图片、视频、音频或文件，也可以粘贴或拖到会话里；一次最多 ${OPENWA_FILES_MAX} 个">${icon('Plus')}</button><input type="file" id="openwa-file" multiple hidden>`;
  }
```

**Edit 2.4** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
  }
  function openwaDetach(id) {
    const held = openwaFiles.get(id);
    if (held?.url) URL.revokeObjectURL(held.url);
    openwaFiles.delete(id);
```

Replace them with:

```text
  }
  // Takes one file off a conversation — or, when none is named, all of them.
  function openwaDetach(id, item) {
    const held = openwaFiles.get(id);
    if (!held) return;
    for (const gone of item ? [item] : held.list) if (gone.url) URL.revokeObjectURL(gone.url);
    held.list = item ? held.list.filter(other => other !== item) : [];
    if (held.list.length) return void (ui.attachments[id] = openwaFilesLabel(held.list.length));
    openwaFiles.delete(id);
```

**Edit 2.5** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
  }
  function openwaAttach(files) {
    const c = selectedCustomer(), [file, more] = files;
    if (!c || !file || ui.view !== 'inbox' || !$('#composer-text')) return;
    if (openwaFiles.get(c.id)?.sending) return toast('上一个文件还在发送，请稍候。');
    if (!file.size) return toast('这个文件是空的，无法发送。');
    if (file.size > OPENWA_FILE_MAX) return toast('文件超过 16 MB，无法从这里发送。');
    openwaDetach(c.id);
    openwaFiles.set(c.id, { file, url: OPENWA_FILE_SHOWN.includes(file.type) ? URL.createObjectURL(file) : '' });
    ui.attachments[c.id] = `${file.name || '文件'} · ${openwaFileSize(file.size)}`;
    openwaShowFile(c);
    $('#composer-text').focus({ preventScroll: true });
    if (more) toast('一次发送一个文件，已添加第一个。');
  }
  // The line above the message box names the attached file: a picture is shown small, and while the file is on
  // its way it cannot be removed.
  const openwaBasePreview = previewHTML;
  previewHTML = function(c) {
    const held = openwaFiles.get(c.id);
    let html = openwaBasePreview(c);
    if (held?.url) html = html.replace('<small>附件</small>', `<small>附件</small><img class="openwa-attached" src="${held.url}" alt="">`);
    if (held?.sending) html = html.replace('<button class="link" data-action="removeAttachment">移除</button>', '<span class="openwa-attached-busy" role="status">发送中…</span>');
    return html;
  };
```

Replace them with:

```text
  }
  // Adds files to the ones that wait. What cannot be sent — an empty file, one that is too large, more than ten —
  // is left out, and one sentence says so.
  function openwaAttach(files) {
    const c = selectedCustomer();
    if (!c || !files.length || ui.view !== 'inbox' || !$('#composer-text')) return;
    const held = openwaFiles.get(c.id) || { list: [], sending: false };
    if (held.sending) return toast('文件还在发送，请稍候再添加。');
    const fit = files.filter(file => file.size && file.size <= OPENWA_FILE_MAX), room = OPENWA_FILES_MAX - held.list.length;
    for (const file of fit.slice(0, room)) held.list.push({ file, url: OPENWA_FILE_SHOWN.includes(file.type) ? URL.createObjectURL(file) : '' });
    if (held.list.length) {
      openwaFiles.set(c.id, held);
      ui.attachments[c.id] = openwaFilesLabel(held.list.length);
    }
    openwaShowFile(c);
    $('#composer-text').focus({ preventScroll: true });
    const empty = files.filter(file => !file.size).length, large = files.filter(file => file.size > OPENWA_FILE_MAX).length, many = Math.max(0, fit.length - room);
    const left = [empty && `${empty} 个空文件`, large && `${large} 个超过 16 MB 的文件`, many && `${many} 个超出数量的文件（一次最多 ${OPENWA_FILES_MAX} 个）`].filter(Boolean);
    if (left.length) toast(`没有添加：${left.join('、')}。`);
  }
  // The line above the message box lists the attached files, each with its size and — a picture — shown small.
  // While they are on their way none can be removed. It takes the place of the baseline's own line, which names
  // one attachment by its label.
  const openwaBasePreview = previewHTML;
  previewHTML = function(c) {
    const held = openwaFiles.get(c.id), html = openwaBasePreview(c);
    if (!held) return html;
    const files = held.list.map((item, at) => `<span class="openwa-attached-file">${item.url ? `<img class="openwa-attached" src="${item.url}" alt="">` : ''}<span>${esc(item.file.name || '文件')} · ${openwaFileSize(item.file.size)}</span>${held.sending ? '' : `<button class="link" data-action="removeAttachment" ${fidActionID(at)} aria-label="移除 ${esc(item.file.name || '文件')}">移除</button>`}</span>`).join('');
    return html.replace(`<small>附件</small>${esc(ui.attachments[c.id])} <button class="link" data-action="removeAttachment">移除</button>`,
      `<small>附件${held.list.length > 1 ? `（${held.list.length} 个，逐个发出）` : ''}</small><span class="openwa-attached-list">${files}</span>${held.sending ? '<span class="openwa-attached-busy" role="status">发送中…</span>' : ''}`);
  };
```

**Edit 2.6** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
  });
  // The file goes to the server as it is, behind one line with its details: whom it is for, its name, its type
  // and the caption. text is what was typed; caption is what goes out with the file (the translation when one
  // was made).
  async function openwaSendFile(c, held, text, caption) {
    if (held.sending) return;
```

Replace them with:

```text
  });
  // The files go out one after the other, in their order; the first carries the caption. text is what was typed;
  // caption is what goes out with the first file (the translation when one was made). A file that is not sent
  // stops the row: it and the ones after it stay attached.
  async function openwaSendFiles(c, held, text, caption) {
    if (held.sending) return;
```

**Edit 2.7** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    if (caption.length > OPENWA_CAPTION_MAX) return toast(`带文件发送时，文字最多 ${OPENWA_CAPTION_MAX} 个字符。`);
    // The same press repeated is the same request; with another caption it is a new one.
    if (held.caption !== caption) Object.assign(held, { caption, request: nextId('r') });
    held.sending = true;
    openwaShowFile(c);
    const details = JSON.stringify({ account: c.account, to: c.waChat || digits + '@c.us', requestId: held.request, name: held.file.name, type: held.file.type, caption });
    let answer;
    try {
      const response = await fetch('/api/wa/send-file', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Blob([details, '\n', held.file]) });
      answer = { status: response.status, body: await response.json().catch(() => ({})) };
```

Replace them with:

```text
    if (caption.length > OPENWA_CAPTION_MAX) return toast(`带文件发送时，文字最多 ${OPENWA_CAPTION_MAX} 个字符。`);
    held.sending = true;
    openwaShowFile(c);
    let failed = '';
    for (let first = true; held.list.length && !failed; first = false) failed = await openwaSendFile(c, held.list[0], first ? text : '', first ? caption : '');
    held.sending = false;
    if (failed) toast(failed + (held.list.length > 1 ? `其余 ${held.list.length - 1} 个文件也还没有发出。` : ''));
    openwaShowFile(c);
  }
  // One file goes to the server as it is, behind one line with its details: whom it is for, its name, its type
  // and the caption. Answers with nothing when it was sent, and with what to tell the employee when it was not.
  async function openwaSendFile(c, item, text, caption) {
    const digits = fidPhoneDigits(c.phone);
    // The same press repeated is the same request; with another caption it is a new one.
    if (item.caption !== caption) Object.assign(item, { caption, request: nextId('r') });
    const details = JSON.stringify({ account: c.account, to: c.waChat || digits + '@c.us', requestId: item.request, name: item.file.name, type: item.file.type, caption });
    let answer;
    try {
      const response = await fetch('/api/wa/send-file', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Blob([details, '\n', item.file]) });
      answer = { status: response.status, body: await response.json().catch(() => ({})) };
```

**Edit 2.8** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    }
    held.sending = false;
    if (answer.status !== 200) {
      const open = answer.status === 0 || answer.status === 502 || answer.body.error === 'outcome-unknown';
      toast(open ? '发送结果待确认。文件还在消息框上方，再按一次发送即可，不会重复发出。' : answer.body.error === 'not-connected' ? '号码未连接，文件没有发出。' : answer.status === 413 ? '文件超过 16 MB，无法从这里发送。' : '文件没有发出，可再按一次发送。');
      return openwaShowFile(c);
    }
```

Replace them with:

```text
    }
    if (answer.status !== 200) {
      const open = answer.status === 0 || answer.status === 502 || answer.body.error === 'outcome-unknown';
      return open ? '发送结果待确认。文件还在消息框上方，再按一次发送即可，不会重复发出。' : answer.body.error === 'not-connected' ? '号码未连接，文件没有发出。' : answer.status === 413 ? '文件超过 16 MB，无法从这里发送。' : '文件没有发出，可再按一次发送。';
    }
```

**Edit 2.9** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    if (draft(c).text.trim() === text) ui.drafts[c.id] = { text: '', translated: '', source: '' };
    openwaDetach(c.id);
    persist();
```

Replace them with:

```text
    if (draft(c).text.trim() === text) ui.drafts[c.id] = { text: '', translated: '', source: '' };
    openwaDetach(c.id, item);
    persist();
```

**Edit 2.10** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    if (ui.view === 'inbox' && selectedCustomer() === c) requestAnimationFrame(openwaShowEnd);
  }
```

Replace them with:

```text
    if (ui.view === 'inbox' && selectedCustomer() === c) requestAnimationFrame(openwaShowEnd);
    return '';
  }
```

**Edit 2.11** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    const d = draft(c), outgoing = d.translated && d.source === text ? d.translated : text;
    // With a file attached, the text is its caption: both go out as one message.
    if (held) return openwaSendFile(c, held, text, outgoing);
    // What the employee sends from here is never asked for: it is marked as read in the reading language, and a
```

Replace them with:

```text
    const d = draft(c), outgoing = d.translated && d.source === text ? d.translated : text;
    // With files attached, the text is the caption of the first: they go out together.
    if (held) return openwaSendFiles(c, held, text, outgoing);
    // What the employee sends from here is never asked for: it is marked as read in the reading language, and a
```

**Edit 2.12** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    openwaAttach:()=>$('#openwa-file')?.click(),
    removeAttachment:()=>{
      const c = selectedCustomer();
      if (!c || openwaFiles.get(c.id)?.sending) return;
      openwaDetach(c.id);
      openwaShowFile(c);
```

Replace them with:

```text
    openwaAttach:()=>$('#openwa-file')?.click(),
    removeAttachment:id=>{
      const c = selectedCustomer(), held = c && openwaFiles.get(c.id);
      if (!held || held.sending || !held.list[Number(id)]) return;
      openwaDetach(c.id, held.list[Number(id)]);
      openwaShowFile(c);
```

#### `fidelity.css`

**Edit 2.13** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
   while it is on its way, and the conversation while a file is dragged over it. */
.openwa-attached { height:40px; max-width:64px; margin-right:8px; border-radius:6px; object-fit:cover; vertical-align:middle; }
.openwa-attached-busy { color:var(--color-text-muted); }
.chat-pane.openwa-file-over { outline:2px dashed var(--color-accent); outline-offset:-2px; }
```

Replace them with:

```text
   while it is on its way, and the conversation while a file is dragged over it. */
.openwa-attached { flex:none; height:40px; max-width:64px; border-radius:6px; object-fit:cover; }
.openwa-attached-busy { color:var(--color-text-muted); }
/* Several files (plan 047) stand side by side and wrap; many of them scroll instead of pushing the conversation away. */
.openwa-attached-list { display:flex; flex-wrap:wrap; align-items:center; gap:6px 14px; max-height:120px; overflow:auto; }
.openwa-attached-file { display:inline-flex; align-items:center; gap:6px; min-width:0; max-width:100%; }
.openwa-attached-file>span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:220px; }
.chat-pane.openwa-file-over { outline:2px dashed var(--color-accent); outline-offset:-2px; }
```

#### `validate-scrm-lifecycle.cjs`

**Edit 2.14** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
// has just arrived stays in view.
for (const required of ['function openwaAttachButton() {', "fetch('/api/wa/send-file', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Blob([details, '\\n', held.file]) })", 'if (held) return openwaSendFile(c, held, text, outgoing);', "if (held.caption !== caption) Object.assign(held, { caption, request: nextId('r') });", 'for (const id of Object.keys(ui.attachments)) delete ui.attachments[id];', 'if (e.fromMe && openwaFiles.get(c.id)?.sending) message.translatedTo = aiSettings().readLanguage;', 'if (box && box.contains(event.target) && openwaAtEnd) openwaShowEnd();', 'requestAnimationFrame(openwaShowEnd);']) {
  assert(openwaSource.includes(required), `fidelity-openwa.js is missing ${required}`);
```

Replace them with:

```text
// has just arrived stays in view.
for (const required of ['function openwaAttachButton() {', "fetch('/api/wa/send-file', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Blob([details, '\\n', item.file]) })", 'if (held) return openwaSendFiles(c, held, text, outgoing);', "if (item.caption !== caption) Object.assign(item, { caption, request: nextId('r') });", 'const OPENWA_FILES_MAX = 10;', "for (let first = true; held.list.length && !failed; first = false) failed = await openwaSendFile(c, held.list[0], first ? text : '', first ? caption : '');", 'for (const id of Object.keys(ui.attachments)) delete ui.attachments[id];', 'if (e.fromMe && openwaFiles.get(c.id)?.sending) message.translatedTo = aiSettings().readLanguage;', 'if (box && box.contains(event.target) && openwaAtEnd) openwaShowEnd();', 'requestAnimationFrame(openwaShowEnd);']) {
  assert(openwaSource.includes(required), `fidelity-openwa.js is missing ${required}`);
```

**Edit 2.15** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  messageTranslation: 'once per message and reading language: kept on the message (translatedTo) and saved; the conversation on screen asks only for messages without a mark; the relay keeps every translation in ai-translations.db and gives it again',
  fileSending: 'one file per message from the message box (the + button, paste, drop), sent by the server through OpenWA with the typed words as its caption; told by its bytes: JPEG and PNG as a picture, MP4 (H.264) as a video, MP3, OGG, M4A and AAC as a recording, everything else as a document; 16 MB at most',
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
```

Replace them with:

```text
  messageTranslation: 'once per message and reading language: kept on the message (translatedTo) and saved; the conversation on screen asks only for messages without a mark; the relay keeps every translation in ai-translations.db and gives it again',
  fileSending: 'up to ten files at once from the message box (the + button, paste, drop), sent by the server through OpenWA one after the other, each as a message of its own, the typed words as the caption of the first; told by its bytes: JPEG and PNG as a picture, MP4 (H.264) as a video, MP3, OGG, M4A and AAC as a recording, everything else as a document; 16 MB at most',
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
```

#### `README.md`

**Edit 2.16** — `README.md`. Find exactly these lines (they occur once):

```text

员工可以从消息框发送文件：点击消息框下方的「+」（添加文件）、把文件粘贴到消息框，或把文件拖到会话里。一次一个文件，最大 16 MB，消息框里的文字作为说明一起发出（最多 1024 个字符）。文件由服务器经 OpenWA 发送（`/api/wa/send-file`），按内容而不是文件名判断类型：JPG、PNG 作为图片发送，MP4（H.264）作为视频，MP3、OGG、M4A、AAC 作为音频，其余一律作为文件发送并保留原文件名。同一次发送重复请求不会重复发出；发出的文件同样保存在 `wa-media-<子站>` 文件夹中，页面立即显示。服务器前面的反向代理需要允许不小于 16 MB 的请求体（例如 nginx 的 `client_max_body_size 20m`），并且等待应答的时间不短于 60 秒。在浏览器里录制语音需要 HTTPS，暂不提供。

```

Replace them with:

```text

员工可以从消息框发送文件：点击消息框下方的「+」（添加文件）、把文件粘贴到消息框，或把文件拖到会话里。一次最多添加 10 个文件，每个最大 16 MB；它们按顺序逐个发出，每个文件是一条单独的消息（WhatsApp 本身也是这样发送多个文件的），消息框里的文字作为第一个文件的说明一起发出（最多 1024 个字符）。某个文件没有发出时，它和后面的文件仍留在消息框上方，再按一次发送即可继续。文件由服务器经 OpenWA 发送（`/api/wa/send-file`），按内容而不是文件名判断类型：JPG、PNG 作为图片发送，MP4（H.264）作为视频，MP3、OGG、M4A、AAC 作为音频，其余一律作为文件发送并保留原文件名。同一次发送重复请求不会重复发出；发出的文件同样保存在 `wa-media-<子站>` 文件夹中，页面立即显示。服务器前面的反向代理需要允许不小于 16 MB 的请求体（例如 nginx 的 `client_max_body_size 20m`），并且等待应答的时间不短于 60 秒。在浏览器里录制语音需要 HTTPS，暂不提供。

```

#### `replica/build-log.md`

**Append 2.17** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 一次发送多个文件 · 2026-11-22

此前从消息框一次只能添加并发送一个文件。按项目负责人的要求，现在一次最多可以添加 10 个文件（每个最大 16 MB）：

- 点击「+」可以一次选择多个文件；粘贴或拖入多个文件也会全部添加。再次添加会接在已有文件后面，而不是替换。每个文件都可以单独「移除」。
- 发送时按添加的顺序逐个发出，每个文件是一条单独的消息——WhatsApp 本身也是这样发送多个文件的。消息框里的文字作为第一个文件的说明。
- 发送过程中，已发出的文件会从消息框上方消失并出现在会话里。某个文件没有发出时，它和后面的文件仍留在原处，页面会提示；再按一次发送即可继续，同一个文件不会重复发出。
- 空文件、超过 16 MB 的文件和超出 10 个的部分不会被添加，页面会用一句话说明。

服务器没有变更（仍是一个请求发送一个文件），合并后不需要重启。
```

Then build and verify:

```bash
git checkout 201c56e -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-047/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs README.md replica/build-log.md outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/app.css` → `583ac3618310877cf5118368ef05962e8a83a1d2c1f1dd7dc26ac8f1b77af375`, `d98567514197b935ecdcc540cfb4c81beb785033fdf0256e3fc87c165813ee55`, `f129d8548746b4c9c6ee327819bbd36bc1c03f508cf7550824406360e23f4584`, `295bf12dbdd0b851b61789d615f2c8376e9056e15a24de092f2e4e782b633a99`, `8ac74ed92ac30f694499941f32d8dcfdaef1a87f0ad3990039924d5470f6f4dd`, `1634cdfa7f866305942e1ca29a50e14cadd9bb6e2d795f1e8cbf91dde18aae63`, `5b190e9e518f7d8e9be8b8142ddc258adf7d3db5f7f7593cb7122f33dc8062a1`; the syntax command → `SYNTAX_OK`; build exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84`; validator `"status": "passed"`; the test run ends with `pass 12`, `fail 0`; smoke ends with `SMOKE PASS`; `git status --porcelain` lists exactly eight paths: `README.md`, `replica/build-log.md`, the three source files under `work/wa-replica/`, and `outputs/wa-replica-prototype/app.js`, `app.css` and `validation.json` (if `outputs/wa-replica-prototype/icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). If a checksum does not match, restore the file with `git checkout 201c56e -- <file>` and apply its instructions again; if it still does not match, STOP. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the page holds ten files at most, sends them one after the other with the caption on the first, and repeats the request of a file with the same caption.
- **Smoke** (`/tmp/wa-scrm-plan-047/smoke.sh`) — the same facts on the built page and the style sheet, the README, the build log, the syntax of the module and the server tests (12 as before; no server change).
- The build and the validator do not run the page. **Verified by the reviewer in scripted browser sessions, not by you**: pasting, dropping and the button add to what is attached, several at once in their order; the label names how many there are; each file can be removed by itself; with ten attached, more are left out, as is an empty file, and one sentence says what was left out; the files belong to their conversation and are gone after a reload. Three files chosen at once go out as three requests in their order, the words with the first, and are three messages in that order, none of them twice; the message box is empty afterwards and the conversation shows its end. When the second of three is not sent, the first is in the conversation, the other two stay attached and the page says so; while the row is on its way nothing can be removed, added or sent again; pressing send goes on with the request the second file had, then the third. The sessions of plan 043 — one file, each kind, limits and failures, whichever answer arrives first, a translated caption — still pass, as do the rest of the product and of the connection.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 201c56e -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-047/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js` → `583ac3618310877cf5118368ef05962e8a83a1d2c1f1dd7dc26ac8f1b77af375`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `d98567514197b935ecdcc540cfb4c81beb785033fdf0256e3fc87c165813ee55`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `f129d8548746b4c9c6ee327819bbd36bc1c03f508cf7550824406360e23f4584`
- [ ] `sha256sum README.md` → `295bf12dbdd0b851b61789d615f2c8376e9056e15a24de092f2e4e782b633a99`
- [ ] `sha256sum replica/build-log.md` → `8ac74ed92ac30f694499941f32d8dcfdaef1a87f0ad3990039924d5470f6f4dd`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `1634cdfa7f866305942e1ca29a50e14cadd9bb6e2d795f1e8cbf91dde18aae63`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `5b190e9e518f7d8e9be8b8142ddc258adf7d3db5f7f7593cb7122f33dc8062a1`
- [ ] `git diff --quiet 201c56e -- outputs/wa-replica-prototype/icons.js outputs/wa-replica-prototype/tokens.css` exits 0 (the icon file and the tokens are unchanged)
- [ ] `git diff --name-only 201c56e..HEAD -- . ':!plans'` lists exactly these eight: `README.md`, `outputs/wa-replica-prototype/app.css`, `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/fidelity-openwa.js`, `work/wa-replica/fidelity.css`, `work/wa-replica/validate-scrm-lifecycle.cjs`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build stops with an assertion, reports another number of icons than 84, a test fails, or the validator fails.
- An output file other than `app.js`, `app.css` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file.

## Maintenance notes

- **Deployment**: only page files change; no restart is needed after the merge. Open pages get the change at their next refresh.
- The limit is `OPENWA_FILES_MAX` in `fidelity-openwa.js`. The files are sent one after the other on purpose: sending them at the same time would let WhatsApp put them in any order, and would load the gateway with several large bodies at once.
- A caption for each file, or sending the words as a message of their own, was not asked for: the words go with the first file.
- Not tried against the real WhatsApp, like plan 043: a real send puts messages on the owner's number.
- What a reviewer should scrutinise: the order of the messages; that a file that failed is sent again with the request it had; that nothing is sent twice when what OpenWA announces arrives before the server's answer.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
