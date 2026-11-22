# Plan 043: A picture, a video, a recording or any other file is sent from the message box

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 511fb4a..HEAD -- work/wa-replica replica/build-log.md outputs README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM (a new route of the server that sends through the WhatsApp gateway, and changes to how a message is sent from the page — a mistake sends something twice or not at all; exact text and checksums for every edit)
- **Depends on**: plans/042-translate-a-conversation-once.md (DONE)
- **Category**: feature (owner request)
- **Planned at**: commit `511fb4a`, 2026-11-22

## Why this matters

The message box sent text only. The owner, 2026-11-22: "The input field does not support multimodal input. Could we look into using an external library to enable this, or perhaps develop a solution in-house if necessary? Does OpenWA support sending multimodal content?"

What was found: OpenWA 0.31.0 sends pictures, videos, recordings and documents (`POST /api/sessions/{id}/messages/send-image|send-video|send-audio|send-document` with `{ chatId, base64, mimetype, filename?, caption? }`, an `Idempotency-Key` header like the text route, a JSON body of 25 MB at most, a caption of 1024 characters at most). No library is needed: the browser reads the file and the server passes it on. Asked whether to build it, with "a '+' button, paste and drag-and-drop; the typed text goes along as the caption; one file per message, up to 16 MB", the owner chose "Yes, all file kinds".

What this plan does:

- **The server gets a route that sends a file** (`POST /api/wa/send-file`): the body of the request is one line of JSON with the details — whom the file is for, its name, the type the browser gave it and the caption — followed by the file as it is. Nothing of it is in the address, which a proxy writes into its log. What the file is sent as is told by its bytes: JPEG and PNG as a picture, MP4 of the usual kind (H.264) as a video, MP3, OGG, M4A and AAC as a recording, everything else — also GIF, WebP, HEIC, MOV and a video in H.265, AV1 or VP9, which WhatsApp Web could not load — as a document under its own name. As for a text, one press of the send button is one request and repeating it never sends twice. What was sent is kept beside the media that came in, so the page shows it at once.
- **The page attaches one file to a conversation**: with a "+" button that stands first beside the message box (where the baseline had its made-up attachment button), by pasting a file into the message box, or by dropping it on the conversation. The baseline's own line above the message box names the file ("附件 …  移除"); a picture is shown small beside its name. An empty file and one over 16 MB are refused at once.
- **It goes out with what is in the message box as its caption** — through the same send as a text, so the send guard translates the caption first like any reply. The file stays attached until the server says it was sent: after a failure or an open outcome, pressing send again repeats the same request. When it was sent, the message appears in the conversation like one that came through the feed, marked as everything the page sends (plan 042), whichever arrives first, the answer or what OpenWA announces.
- **What was just sent, or has just arrived, stays in view.** A picture takes its height only when it has loaded, and a line above the message box takes room from the conversation: a conversation that showed its end goes on showing it, and after sending — a file or a text — the end is put in view. (Before this plan a text that was sent after its translation had been shown above the message box ended up below the edge; so did a picture that loaded late.)
- **The tools beside the message box take a second line** where the conversation is too narrow for one: with the new button they are one more and would run into the send button at tablet widths.

### Decisions already made (do not re-open; do not ask)

- One file per message. Several files chosen, pasted or dropped at once: the first is attached and the page says so.
- 16 MB at most, checked in the page and by the server. A caption of 1024 characters at most.
- The body of the request is always announced as `application/octet-stream`: like `application/json` for the other routes, a type a page of another site cannot send without asking first. The details of the file — also the type the browser gave it — are the first line of the body (16 KB at most), never part of the address: the caption is message text and the chat id is a phone number, and neither belongs in a proxy's log.
- The file lives in the page only; after a reload nothing is attached and the words in the message box are kept. No message is added to the conversation before the server has answered: nothing can be left behind that could not be sent again.
- A message typed on the phone at the very moment a file is on its way from the page to the same customer is marked as the page's own (not sent for translation). Accepted.
- Recording a voice note in the browser is not part of this plan: browsers give the microphone only to a page served over HTTPS, and the preview is served over HTTP.
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/openwa-link.cjs` | `f03d6c573955424982e4a453eb211de3d35c9b7afc07f76f3a16401e274dc300` | `1bbca7bd22cbedae4363f1edaad3280279dc78f454064575358c601fa4a37769` |
| `work/wa-replica/openwa-link.test.cjs` | `bb3ecef7f693bee6fa8a60b809ef6cea8c768f51746ea1fafdf43eb8a7051823` | `34f3dd1626a43436867b58a535ba6916746fd9a9a1d0eb22b2013fee471a5a8c` |
| `work/wa-replica/fidelity-openwa.js` | `af519e30a886ea494f82e372fed414ad3b6defc5dd5f228d19b0a95b3cf246f7` | `3b1c6bef090f2f18e5ea599a0e3d30a595c97c817bc7e5110ad73c10bff53e71` |
| `work/wa-replica/build-fidelity.cjs` | `4e878e72ae65590b349282dfeedc52da1e55878a3836df97c6de939819c594e3` | `388d269452cc88a62901ff2ecfa332ae7718c3a59344641341fd3a87ecd03592` |
| `work/wa-replica/fidelity.css` | `4497fb533ae7163a473e5c5dbaee610f5b0cefa80e2e2e499e4f3d6dd9942c48` | `fdce5df7373a05f50462dee1d5d41b80e29b2f088624502e4c8c90c50dd4eabf` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `a18e892c58c3b63b442444773c3fbaad0ebac4afc76a01f2ca9cc7d1901ab491` | `69dee1e96301af6323bada1580e50ad0cf38f6cbb528aed48280f033302279ac` |
| `README.md` | `a9e8456cca598c4fdf084c11fdd7bfd3158a892a9a5e9cc975671979113ebc5d` | `b480c7e0f4e9f7b0be1052294126989195360c90d6441d9f581fe94ab67162a4` |

- `openwa-link.cjs` — the server's link to the sub-site's OpenWA. `ask(config, method, pathname, body, headers)` is one call to OpenWA; `mediaKind(bytes, declared)` tells what kind of picture, sound or video some bytes are; `POST /api/wa/send` sends a text once for a request id; `mediaKeep`/`mediaKey` keep the media of a message in the folder `wa-media-<site>` of the data folder, from where `GET /api/wa/media` serves it. `openwa-link.test.cjs` — its tests (19) with a stand-in OpenWA.
- `fidelity-openwa.js` — the chat module of the page. `send` sends what is in the message box (`openwaDeliver` posts it to the server); `openwaApply` applies one event of the feed to the data; `chatHTML`, `render` are wrapped here; `openwaRefresh` draws the page again after the data changed without disturbing what is being typed; `openwaMediaHTML` shows the media of a message.
- `build-fidelity.cjs` — the build. The baseline (`fidelity-base/app.js`) has a line above the message box that names an attachment (`previewHTML`, the label is `ui.attachment`, kept for each customer in `ui.attachments`), an action `removeAttachment`, and a send button that reckons with an attachment (`updateSendState`); two `swap`s took its made-up attachment button out. This plan puts the real button there and lets the baseline's own line and send button work.
- `fidelity.css` — the styles of the modules. Sizes in px become tokens at build time: the new rules use sizes that are in use already, so `tokens.css` does not change.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page; a block is added.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 511fb4a -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Syntax of the chat module | `node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/fidelity-openwa.js','utf8')+'})');console.log('SYNTAX_OK')"` | `SYNTAX_OK` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 21`, `fail 0` (they send a 16 MB file twice; allow a few seconds) |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 14`, `fail 0` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 12`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-043/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/openwa-link.cjs`, `openwa-link.test.cjs` (Step 2)
- `work/wa-replica/fidelity-openwa.js`, `build-fidelity.cjs`, `fidelity.css`, `validate-scrm-lifecycle.cjs` (Step 3)
- `README.md`, `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{app.js,app.css,validation.json}` (the other output files, `icons.js` and `tokens.css` among them, must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular `serve.cjs`, `site-*.cjs`, `ai-relay.cjs`, `fidelity-boot.js`, the other page modules, the other style sheets, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/043-send-a-file` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): send a picture, a video, a recording or any other file from the message box`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the seven files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-043/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-043 && cat > /tmp/wa-scrm-plan-043/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that a file can be attached to a message and is sent by the server through OpenWA.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the tests of the link pass, with the two for sending a file' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 21 ℹ fail 0 '
has 'the server has the route that sends a file' "$W/openwa-link.cjs" "'POST /api/wa/send-file': async req => {"
has 'a file may be 16 MB at most' "$W/openwa-link.cjs" 'const SEND_FILE_MAX = 16 * 1024 * 1024;'
has 'what was sent is kept for the page' "$W/openwa-link.cjs" 'mediaKeep(mediaKey(row.id, to, outcome.messageId), { mime, name, bytes });'
has 'the button for files stands first beside the message box' "$P/app.js" "<div class=\"composer-tools\">'+openwaAttachButton()+'<button class=\"icon-button\" data-action=\"quickAll\""
has 'the page sends the file as it is, behind a line with its details' "$P/app.js" "fetch('/api/wa/send-file', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Blob([details, '\\n', held.file]) })"
has 'with a file attached the text is its caption' "$P/app.js" 'if (held) return openwaSendFile(c, held, text, outgoing);'
has 'a file alone can be sent' "$P/app.js" 'enabled=online&&(d.text.trim()||ui.attachment);'
same 'nothing is left of the made-up attachment' "$(grep -c '添加演示附件' "$P/app.js")" 0
has 'what was just sent is put in view' "$P/app.js" 'requestAnimationFrame(openwaShowEnd);'
has 'the style sheet knows the attached file' "$P/app.css" '.openwa-attached-busy'
has 'the README names the route' "$ROOT/README.md" '/api/wa/send-file'
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 从消息框发送图片、视频、音频和文件'
same 'the link passes the syntax check' "$(node --check "$W/openwa-link.cjs" 2>&1 && echo SYNTAX_OK)" SYNTAX_OK
same 'the chat module passes the syntax check' "$(cd "$ROOT" && node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/fidelity-openwa.js','utf8')+'})');console.log('SYNTAX_OK')" 2>&1)" SYNTAX_OK
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-043/smoke.sh && ls -l /tmp/wa-scrm-plan-043/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/openwa-link.cjs work/wa-replica/openwa-link.test.cjs work/wa-replica/fidelity-openwa.js work/wa-replica/build-fidelity.cjs work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs README.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-043/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the tests of the link pass, with the two for sending a file` (got: ℹ pass 19 ℹ fail 0 ), `the server has the route that sends a file`, `a file may be 16 MB at most`, `what was sent is kept for the page`, `the button for files stands first beside the message box`, `the page sends the file as it is, behind a line with its details`, `with a file attached the text is its caption`, `a file alone can be sent`, `what was just sent is put in view`, `the style sheet knows the attached file`, `the README names the route` and `the build log has the entry` (twelve checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The server sends a file

#### `openwa-link.cjs`

**Edit 2.1** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
const MEDIA_FILE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/aac': 'aac', 'audio/mp4': 'm4a', 'audio/wav': 'wav', 'audio/webm': 'webm', 'video/mp4': 'mp4', 'video/webm': 'webm' };
const SENT = Symbol('answered');
```

Replace them with:

```text
const MEDIA_FILE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/aac': 'aac', 'audio/mp4': 'm4a', 'audio/wav': 'wav', 'audio/webm': 'webm', 'video/mp4': 'mp4', 'video/webm': 'webm' };
// Sending a file from the page: the largest file taken, the room for its details in front of it, how long OpenWA
// may take (the proxy in front of this server gives a request a minute), and the longest caption and file name
// passed on.
const SEND_FILE_MAX = 16 * 1024 * 1024;
const SEND_DETAILS_MAX = 16 * 1024;
const SEND_FILE_TIMEOUT_MS = 45000;
const SEND_CAPTION_MAX = 1024;
const SEND_NAME_MAX = 200;
// What a file goes out as. A picture, a video or a recording goes out as one only in a format WhatsApp shows as
// such; everything else — also a picture or a video of another kind — goes out as a document under its own name.
const SEND_AS = { 'image/jpeg': 'image', 'image/png': 'image', 'video/mp4': 'video', 'audio/mpeg': 'audio', 'audio/ogg': 'audio', 'audio/mp4': 'audio', 'audio/aac': 'audio' };
// An MP4 file is a video for WhatsApp only when it is of the usual kind (H.264): one that calls itself something
// else at its start, or holds pictures in H.265, AV1 or VP9, would never finish loading in WhatsApp Web.
const SEND_VIDEO_KINDS = ['isom', 'iso2', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'M4V ', 'mmp4'];
const SEND_VIDEO_OTHER = ['hvc1', 'hev1', 'av01', 'vp09'];
const SENT = Symbol('answered');
```

**Edit 2.2** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
// OpenWA does not accept is 'gateway-refused'.
async function ask(config, method, pathname, body, headers = {}) {
  let response;
```

Replace them with:

```text
// OpenWA does not accept is 'gateway-refused'.
async function ask(config, method, pathname, body, headers = {}, timeout = TIMEOUT_MS) {
  let response;
```

**Edit 2.3** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
```

Replace them with:

```text
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
```

**Edit 2.4** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text

// One stored delivery in this project's own form, or null when the page has no use for it.
```

Replace them with:

```text

// What a file is sent as, and under which type: told by its bytes, never by its name. declared is the type the
// browser gave the file; a document keeps it.
function sendForm(bytes, declared = '') {
  const kind = mediaKind(bytes, declared);
  const usual = kind !== 'video/mp4' || (SEND_VIDEO_KINDS.includes(bytes.subarray(8, 12).toString('latin1')) && !SEND_VIDEO_OTHER.some(code => bytes.includes(code)));
  const type = (usual && SEND_AS[kind]) || 'document';
  const named = declared.length <= 100 && /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/.test(declared);
  return { type, mime: type !== 'document' ? kind : named ? declared : kind || 'application/octet-stream' };
}

// One stored delivery in this project's own form, or null when the page has no use for it.
```

**Edit 2.5** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
    },
    'POST /api/wa/claim': async req => {
```

Replace them with:

```text
    },
    // A file, with what was typed as its caption. The body of the request is one line of JSON with the details
    // { account, to, requestId, name, type, caption } — type is what the browser calls the file — and, after the
    // end of that line, the file as it is. Nothing of it is in the address, which a proxy writes into its log. The
    // body is always announced as application/octet-stream, a type a page of another site cannot send here. As
    // for a text, requestId names one press of the send button and repeating a request never sends twice. What
    // was sent is kept beside the media that came in, so the page can show it at once.
    'POST /api/wa/send-file': async req => {
      employee(req);
      const config = settings();
      if (mediaType(req.headers['content-type']) !== 'application/octet-stream') {
        req.resume();
        throw problem('invalid-request');
      }
      const body = await readRaw(req, SEND_DETAILS_MAX + SEND_FILE_MAX), end = body.subarray(0, SEND_DETAILS_MAX).indexOf(10);
      let details = null;
      try {
        details = JSON.parse(body.subarray(0, Math.max(end, 0)).toString('utf8'));
      } catch {}
      if (!details || typeof details !== 'object' || Array.isArray(details)) throw problem('invalid-request');
      const given = name => (typeof details[name] === 'string' ? details[name] : '');
      const to = given('to'), requestId = given('requestId'), caption = given('caption').trim(), bytes = body.subarray(end + 1);
      const name = given('name').replace(/[\u0000-\u001f\\/]/g, ' ').trim().slice(0, SEND_NAME_MAX);
      if (!CHAT.test(to) || !CLIENT.test(requestId) || caption.length > SEND_CAPTION_MAX || !bytes.length) throw problem('invalid-request');
      if (bytes.length > SEND_FILE_MAX) throw problem('too-long');
      const row = store.account(given('account'));
      if (!row) throw problem('unknown-account');
      const { type, mime } = sendForm(bytes, mediaType(given('type')));
      const digest = crypto.createHash('sha256').update(JSON.stringify([row.id, to, crypto.createHash('sha256').update(bytes).digest('hex'), name, caption])).digest('hex');
      const earlier = store.request(requestId);
      if (earlier && earlier.digest !== digest) throw problem('request-conflict');
      if (earlier?.outcome) return JSON.parse(earlier.outcome);
      if (!earlier) store.addRequest(requestId, digest);
      const answer = await ask(config, 'POST', `/api/sessions/${row.session}/messages/send-${type}`,
        { chatId: to, base64: bytes.toString('base64'), mimetype: mime, ...(type === 'document' ? { filename: name || 'file' } : {}), ...(caption ? { caption } : {}) },
        { 'Idempotency-Key': `${siteId}-${requestId}` }, SEND_FILE_TIMEOUT_MS);
      if (answer.status === 201 && answer.body?.messageId) {
        const outcome = { messageId: String(answer.body.messageId), timestamp: Number(answer.body.timestamp) > 0 ? Number(answer.body.timestamp) * 1000 : now(), type, ...(name ? { file: name } : {}) };
        mediaKeep(mediaKey(row.id, to, outcome.messageId), { mime, name, bytes });
        store.finishRequest(requestId, outcome);
        console.log(`wa send ok account=${row.id} file=${type} bytes=${bytes.length}`);
        return outcome;
      }
      const code = answer.status === 422 ? 'request-conflict' : answer.status === 400 || answer.status === 413 ? 'send-refused' : answer.status === 404 ? 'not-connected'
        : answer.status === 409 && !String(answer.body?.code || '').startsWith('IDEMPOTENCY_') ? 'not-connected' : 'outcome-unknown';
      console.error(`wa send failed account=${row.id} file=${type} error=${code} upstream=${answer.status}`);
      throw problem(code);
    },
    'POST /api/wa/claim': async req => {
```

**Edit 2.6** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text

module.exports = { create, loadConfig, present, signed, mediaKind, EVENTS, STATES };
```

Replace them with:

```text

module.exports = { create, loadConfig, present, signed, mediaKind, sendForm, EVENTS, STATES };
```

#### `openwa-link.test.cjs`

**Edit 2.7** — `work/wa-replica/openwa-link.test.cjs`. Find exactly these lines (they occur once):

```text
// ---- the stand-in for OpenWA ----
const gw = { sessions: new Map(), hooks: new Map(), sends: [], calls: [], sendMode: 'ok', replies: new Map(), chats: new Map(), history: new Map(), contacts: new Map(), media: new Map() };
const uuid = () => crypto.randomUUID();
```

Replace them with:

```text
// ---- the stand-in for OpenWA ----
const gw = { sessions: new Map(), hooks: new Map(), sends: [], files: [], calls: [], sendMode: 'ok', replies: new Map(), chats: new Map(), history: new Map(), contacts: new Map(), media: new Map() };
const uuid = () => crypto.randomUUID();
```

**Edit 2.8** — `work/wa-replica/openwa-link.test.cjs`. Find exactly these lines (they occur once):

```text
    if (action === 'contacts') return gw.contacts.has(decodeURIComponent(third)) ? answer(200, gw.contacts.get(decodeURIComponent(third))) : fail(404, 'Not Found', 'Contact not found');
    if (action === 'messages' && third === 'send-text' && !fourth) {
      const key = req.headers['idempotency-key'];
      gw.sends.push({ sessionId, key, body });
      if (!started) return fail(400, 'Bad Request', `Session '${sessionId}' is not active`);
```

Replace them with:

```text
    if (action === 'contacts') return gw.contacts.has(decodeURIComponent(third)) ? answer(200, gw.contacts.get(decodeURIComponent(third))) : fail(404, 'Not Found', 'Contact not found');
    if (action === 'messages' && /^send-(text|image|video|audio|document)$/.test(third) && !fourth) {
      const key = req.headers['idempotency-key'];
      // A text is noted as it is, a file by its route, its fingerprint and what came with it.
      if (third === 'send-text') gw.sends.push({ sessionId, key, body });
      else gw.files.push({ route: third, key, chatId: body.chatId, mimetype: body.mimetype, filename: body.filename, caption: body.caption, sha: crypto.createHash('sha256').update(Buffer.from(body.base64, 'base64')).digest('hex') });
      if (!started) return fail(400, 'Bad Request', `Session '${sessionId}' is not active`);
```

**Edit 2.9** — `work/wa-replica/openwa-link.test.cjs`. Find exactly these lines (they occur once):

```text

test('unlinking removes the session at OpenWA and the record; later deliveries of it are dropped', async () => {
```

Replace them with:

```text

test('what a file is sent as is told by its bytes: a picture, a video or a recording only in a format WhatsApp shows as such, everything else a document', () => {
  const form = (head, declared, tail = '') => openwaLink.sendForm(Buffer.concat([Buffer.from(head), Buffer.alloc(32), Buffer.from(tail)]), declared);
  assert.deepEqual([
    form([0xff, 0xd8, 0xff, 0xe1], 'image/jpeg'), form([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'image/png'), form([0xff, 0xd8, 0xff, 0xe1], 'application/pdf'), form([0xff, 0xd8, 0xff, 0xe1]),
    form('\0\0\0\x20ftypisom', 'video/mp4'), form('\0\0\0\x20ftypmp42', 'video/mp4', 'stsd....avc1'), form('\0\0\0\x20ftypisom', 'application/octet-stream'),
    form('OggS', 'audio/ogg'), form('ID3\x04', 'audio/mpeg'), form('\0\0\0\x20ftypM4A ', 'audio/x-m4a'), form('\0\0\0\x20ftypisom', 'audio/mp4'), form([0xff, 0xf1, 0x50], 'audio/aac'),
  ], [
    { type: 'image', mime: 'image/jpeg' }, { type: 'image', mime: 'image/png' }, { type: 'image', mime: 'image/jpeg' }, { type: 'image', mime: 'image/jpeg' },
    { type: 'video', mime: 'video/mp4' }, { type: 'video', mime: 'video/mp4' }, { type: 'video', mime: 'video/mp4' },
    { type: 'audio', mime: 'audio/ogg' }, { type: 'audio', mime: 'audio/mpeg' }, { type: 'audio', mime: 'audio/mp4' }, { type: 'audio', mime: 'audio/mp4' }, { type: 'audio', mime: 'audio/aac' },
  ]);
  // a document: under the type the browser gave it, or what its bytes say, or as bytes without a type
  assert.deepEqual([
    form('%PDF-1.7', 'application/pdf'), form('PK\x03\x04', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), form('GIF89a', 'image/gif'), form('RIFF\0\0\0\0WEBPVP8 ', 'image/webp'),
    form('RIFF\0\0\0\0WAVEfmt ', 'audio/wav'), form([0x1a, 0x45, 0xdf, 0xa3], 'video/webm'), form('<!doctype html>', 'image/jpeg'), form('%PDF-1.7'), form('GIF89a'), form('%PDF-1.7', 'not a type'), form('%PDF-1.7', 'a/' + 'b'.repeat(100)),
  ], [
    { type: 'document', mime: 'application/pdf' }, { type: 'document', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, { type: 'document', mime: 'image/gif' }, { type: 'document', mime: 'image/webp' },
    { type: 'document', mime: 'audio/wav' }, { type: 'document', mime: 'video/webm' }, { type: 'document', mime: 'image/jpeg' }, { type: 'document', mime: 'application/octet-stream' }, { type: 'document', mime: 'image/gif' },
    { type: 'document', mime: 'application/octet-stream' }, { type: 'document', mime: 'application/octet-stream' },
  ]);
  // a video WhatsApp Web could not play goes out as a document: another kind of file in the same wrapping, or pictures in a newer format
  for (const [head, declared, tail] of [['\0\0\0\x20ftypqt  ', 'video/quicktime'], ['\0\0\0\x20ftypheic', 'image/heic'], ['\0\0\0\x20ftyp3gp4', 'video/3gpp'], ['\0\0\0\x20ftypisom', 'video/mp4', 'stsd....hvc1'], ['\0\0\0\x20ftypmp42', 'video/mp4', 'hev1'], ['\0\0\0\x20ftypisom', 'video/mp4', 'av01'], ['\0\0\0\x20ftypiso5', 'video/mp4', 'vp09']]) {
    assert.deepEqual(form(head, declared, tail), { type: 'document', mime: declared }, head.slice(4) + ' ' + (tail || ''));
  }
  assert.deepEqual(openwaLink.sendForm(Buffer.from([0xff, 0xd8, 0xff]), 'image/jpeg'), { type: 'document', mime: 'image/jpeg' }, 'too short to tell');
});

test('sending a file: its details come first in the request, then the file; it goes out by the route of its kind with its caption; one file per request; what was sent is kept for the page; limits and who may send', async () => {
  gwSessionOf('a1').status = 'ready';
  gw.files.length = 0;
  const to = '15550001111@c.us', sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(300, 7)]);
  const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.alloc(120, 3)]);
  const ogg = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(120, 1)]);
  const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(120, 2)]);
  // The body of a request: one line of JSON with the details, then the file as it is.
  const send = (bytes, details, { content = 'application/octet-stream', cookie = lin, headers = {}, line } = {}) =>
    fetch(`http://127.0.0.1:${port}/api/wa/send-file`, { method: 'POST', headers: { 'Content-Type': content, ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: Buffer.concat([Buffer.from(line ?? JSON.stringify({ account: 'a1', to, ...details }) + '\n'), bytes]) })
      .then(async r => ({ status: r.status, json: await r.json() }));
  // a picture with a caption
  const sent = await send(jpeg, { requestId: 'file-0000001', name: 'photo.jpg', type: 'image/jpeg', caption: '  Here it is  ' });
  assert.deepEqual([sent.status, sent.json.type, sent.json.file, sent.json.timestamp, typeof sent.json.messageId], [200, 'image', 'photo.jpg', Math.floor(clock / 1000) * 1000, 'string']);
  assert.deepEqual(gw.files, [{ route: 'send-image', key: 's1-file-0000001', chatId: to, mimetype: 'image/jpeg', filename: undefined, caption: 'Here it is', sha: sha(jpeg) }]);
  // repeated, it is not sent again; the same request with another file or another caption is a conflict
  assert.deepEqual((await send(jpeg, { requestId: 'file-0000001', name: 'photo.jpg', type: 'image/jpeg', caption: 'Here it is' })).json, sent.json);
  assert.equal(gw.files.length, 1, 'the repeated request does not reach OpenWA');
  assert.deepEqual([(await send(pdf, { requestId: 'file-0000001', name: 'photo.jpg', caption: 'Here it is' })).status, (await send(jpeg, { requestId: 'file-0000001', name: 'photo.jpg', caption: 'Other' })).json], [409, { error: 'request-conflict' }]);
  // what was sent is kept: the page gets it without OpenWA being asked
  gw.calls.length = 0;
  const kept = await fetch(`http://127.0.0.1:${port}/api/wa/media?account=a1&chat=${encodeURIComponent(to)}&id=${encodeURIComponent(sent.json.messageId)}`, { headers: { Cookie: lin } });
  assert.deepEqual([kept.status, kept.headers.get('content-type'), Buffer.from(await kept.arrayBuffer()).equals(jpeg)], [200, 'image/jpeg', true]);
  assert.deepEqual(gw.calls, [], 'the kept file is served without a call to OpenWA');
  // each kind by its route; a document under its own name, cleaned of what cannot be part of one
  gw.files.length = 0;
  for (const [id, bytes, type, name, route, mime, filename] of [
    ['file-0000010', mp4, 'video/mp4', 'clip.mp4', 'send-video', 'video/mp4', undefined],
    ['file-0000011', ogg, 'audio/ogg', 'note.ogg', 'send-audio', 'audio/ogg', undefined],
    ['file-0000012', pdf, 'application/pdf', '报价 2026.pdf', 'send-document', 'application/pdf', '报价 2026.pdf'],
    ['file-0000013', jpeg, 'application/pdf', 'really a picture.pdf', 'send-image', 'image/jpeg', undefined],
    ['file-0000014', pdf, '', '', 'send-document', 'application/octet-stream', 'file'],
    ['file-0000015', pdf, 'application/pdf', 'a/b\\c\u0001d.pdf', 'send-document', 'application/pdf', 'a b c d.pdf'],
    ['file-0000016', pdf, 'application/pdf', 'x'.repeat(300) + '.pdf', 'send-document', 'application/pdf', 'x'.repeat(200)],
  ]) {
    const answer = await send(bytes, { requestId: id, name, type });
    assert.deepEqual([answer.status, answer.json.type, answer.json.file], [200, route.replace('send-', ''), filename === 'file' ? undefined : filename ?? name], id);
    assert.deepEqual(gw.files.at(-1), { route, key: 's1-' + id, chatId: to, mimetype: mime, filename, caption: undefined, sha: sha(bytes) }, id);
  }
  // limits and bad requests: nothing reaches OpenWA
  const before = gw.files.length;
  const sven = await member('sven', 'supervisor', null), olga = await member('olga', 'agent', 'elsewhere');
  for (const [what, bytes, details, options, status, error] of [
    ['an empty file', Buffer.alloc(0), { requestId: 'file-0000020', name: 'a.pdf' }, {}, 400, 'invalid-request'],
    ['details that are not JSON', pdf, {}, { line: 'account=a1\n' }, 400, 'invalid-request'],
    ['details that are a list', pdf, {}, { line: '["a1"]\n' }, 400, 'invalid-request'],
    ['details without their end of line', Buffer.alloc(200, 2), {}, { line: JSON.stringify({ account: 'a1', to, requestId: 'file-0000018' }) }, 400, 'invalid-request'],
    ['details that take more than their room', pdf, { requestId: 'file-0000019', name: 'x'.repeat(17000) }, {}, 400, 'invalid-request'],
    ['details of another kind than text', pdf, { requestId: 'file-0000017', to: 15550001111 }, {}, 400, 'invalid-request'],
    ['a file over the limit', Buffer.alloc(16 * 1024 * 1024 + 1, 1), { requestId: 'file-0000021', name: 'big.bin' }, {}, 413, 'too-long'],
    ['a caption over the limit', pdf, { requestId: 'file-0000022', name: 'a.pdf', caption: 'x'.repeat(1025) }, {}, 400, 'invalid-request'],
    ['a group', pdf, { requestId: 'file-0000023', name: 'a.pdf', to: '1203630@g.us' }, {}, 400, 'invalid-request'],
    ['a request id that is too short', pdf, { requestId: 'short', name: 'a.pdf' }, {}, 400, 'invalid-request'],
    ['a body announced as a form', pdf, { requestId: 'file-0000024', name: 'a.pdf' }, { content: 'text/plain' }, 400, 'invalid-request'],
    ['a body announced as a picture', jpeg, { requestId: 'file-0000025', name: 'a.jpg' }, { content: 'image/jpeg' }, 400, 'invalid-request'],
    ['an unknown number', pdf, { requestId: 'file-0000026', name: 'a.pdf', account: 'zz' }, {}, 404, 'unknown-account'],
    ['nobody signed in', pdf, { requestId: 'file-0000027', name: 'a.pdf' }, { cookie: '' }, 401, 'not-signed-in'],
    ['a supervisor', pdf, { requestId: 'file-0000028', name: 'a.pdf' }, { cookie: sven }, 403, 'read-only'],
    ['an employee of another sub-site', pdf, { requestId: 'file-0000029', name: 'a.pdf' }, { cookie: olga }, 403, 'forbidden'],
    ['a page of another site', pdf, { requestId: 'file-0000030', name: 'a.pdf' }, { headers: { 'Sec-Fetch-Site': 'cross-site' } }, 403, 'forbidden'],
  ]) {
    const answer = await send(bytes, details, options);
    assert.deepEqual([answer.status, answer.json], [status, { error }], what);
  }
  assert.equal(gw.files.length, before);
  // a file of exactly the largest size goes through
  const largest = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(16 * 1024 * 1024 - 9, 5)]);
  assert.equal((await send(largest, { requestId: 'file-0000040', name: 'large.pdf', type: 'application/pdf' })).status, 200);
  assert.equal(gw.files.at(-1).sha, sha(largest));
  // the number is not connected; an answer that leaves the outcome open; the same request again goes through
  gwSessionOf('a1').status = 'qr_ready';
  assert.deepEqual((await send(pdf, { requestId: 'file-0000050', name: 'a.pdf' })).json, { error: 'not-connected' });
  gwSessionOf('a1').status = 'ready';
  gw.sendMode = 'error';
  assert.deepEqual([(await send(pdf, { requestId: 'file-0000051', name: 'a.pdf' })).status, (await send(pdf, { requestId: 'file-0000051', name: 'a.pdf' })).json], [409, { error: 'outcome-unknown' }]);
  gw.sendMode = 'ok';
  assert.equal((await send(pdf, { requestId: 'file-0000051', name: 'a.pdf' })).status, 200, 'the same request goes through once OpenWA answers');
  assert.deepEqual(gw.files.slice(-3).map(f => f.key), Array(3).fill('s1-file-0000051'), 'OpenWA gets the same key every time');
});

test('unlinking removes the session at OpenWA and the record; later deliveries of it are dropped', async () => {
```

**Edit 2.10** — `work/wa-replica/openwa-link.test.cjs`. Find exactly these lines (they occur once):

```text
  const lines = logged.filter(line => line.startsWith('wa '));
  for (const expected of ['wa link ok account=a1 state=scan', 'wa hook stored event=message.received account=a1', 'wa send ok account=a1 chars=5', 'wa send failed account=a1 error=not-connected upstream=409', 'wa unlink ok account=a4', 'error=gateway-unreachable', 'error=gateway-refused']) {
    assert(lines.some(line => line.includes(expected)), expected);
  }
  for (const secret of [KEY, SECRET, '15550001111', '15550009999', 'hello', 'Hola', 'On my way', QR]) assert(!lines.some(line => line.includes(secret)), secret);
  const stored = ['wa-s1.db', 'wa-s1.db-wal'].map(name => path.join(tmp, 'main', name)).filter(file => fs.existsSync(file)).map(file => fs.readFileSync(file).toString('latin1')).join('');
```

Replace them with:

```text
  const lines = logged.filter(line => line.startsWith('wa '));
  for (const expected of ['wa link ok account=a1 state=scan', 'wa hook stored event=message.received account=a1', 'wa send ok account=a1 chars=5', 'wa send failed account=a1 error=not-connected upstream=409', 'wa send ok account=a1 file=image bytes=304', 'wa send failed account=a1 file=document error=not-connected upstream=409', 'wa unlink ok account=a4', 'error=gateway-unreachable', 'error=gateway-refused']) {
    assert(lines.some(line => line.includes(expected)), expected);
  }
  for (const secret of [KEY, SECRET, '15550001111', '15550009999', 'hello', 'Hola', 'On my way', 'Here it is', 'photo.jpg', QR]) assert(!lines.some(line => line.includes(secret)), secret);
  const stored = ['wa-s1.db', 'wa-s1.db-wal'].map(name => path.join(tmp, 'main', name)).filter(file => fs.existsSync(file)).map(file => fs.readFileSync(file).toString('latin1')).join('');
```

**Verify**: `sha256sum work/wa-replica/openwa-link.cjs work/wa-replica/openwa-link.test.cjs` → `1bbca7bd22cbedae4363f1edaad3280279dc78f454064575358c601fa4a37769`, `34f3dd1626a43436867b58a535ba6916746fd9a9a1d0eb22b2013fee471a5a8c`; `node --check work/wa-replica/openwa-link.cjs` exits 0; `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 21`, `fail 0`. If a checksum does not match, restore the file with `git checkout 511fb4a -- <file>` and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 3: The page attaches a file and sends it

#### `fidelity-openwa.js`

**Edit 3.1** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
  render = function() {
    openwaKeepPlaying(openwaDraw);
    const list = $('#conversation-list');
    if (!list) return;
```

Replace them with:

```text
  render = function() {
    openwaKeepPlaying(openwaDraw);
    // Once the draw has put the conversation where it belongs: is its end in view?
    requestAnimationFrame(openwaNoteEnd);
    const list = $('#conversation-list');
    if (!list) return;
```

**Edit 3.2** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    else if (openwaListPlace.top) list.scrollTop = openwaListPlace.top;
  };

  // The mark after the time of a message the employee sent.
```

Replace them with:

```text
    else if (openwaListPlace.top) list.scrollTop = openwaListPlace.top;
  };
  // A picture or a video takes its height only once it has loaded, and a line above the message box takes room
  // from the conversation. A conversation that showed its end goes on showing it then: what was just sent, or has
  // just arrived, is not left below the edge. Whether the end is in view is noted, with where the conversation
  // stood, after every draw and whenever the page itself moves the conversation.
  let openwaAtEnd = true, openwaEndTop = 0;
  function openwaNoteEnd() {
    const box = $('#messages');
    if (!box) return;
    openwaAtEnd = box.scrollHeight - box.clientHeight - box.scrollTop <= 40;
    openwaEndTop = box.scrollTop;
  }
  function openwaShowEnd() {
    const box = $('#messages');
    if (!box) return;
    box.scrollTop = box.scrollHeight;
    openwaNoteEnd();
  }
  // Scrolling by hand changes the note. What the page did itself was noted when it happened: its scroll event
  // comes later, when a picture may have taken its height, and must not look like someone scrolling away.
  document.addEventListener('scroll', event => {
    if (event.target.id === 'messages' && event.target.scrollTop !== openwaEndTop) openwaNoteEnd();
  }, true);
  for (const type of ['load', 'loadedmetadata']) {
    document.addEventListener(type, event => {
      const box = event.target.closest?.('.openwa-media') && $('#messages');
      if (box && box.contains(event.target) && openwaAtEnd) openwaShowEnd();
    }, true);
  }

  // The mark after the time of a message the employee sent.
```

**Edit 3.3** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
      if (a.state === 'pending') chat = chat.replace('>重新连接</button>', '>扫码绑定</button>');
    }
    return chat;
  };
```

Replace them with:

```text
      if (a.state === 'pending') chat = chat.replace('>重新连接</button>', '>扫码绑定</button>');
    }
    // While a file is on its way the send button waits.
    if (openwaFiles.get(c.id)?.sending) chat = chat.replace('data-action="send" aria-label="发送消息">', 'data-action="send" aria-label="发送消息" disabled>');
    return chat;
  };
```

**Edit 3.4** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
  }

  send = function() {
    const c = selectedCustomer(), el = $('#composer-text');
    if (!c || !el) return;
    if (account(c.account)?.state !== 'online') return toast('号码尚未连接，草稿会保留。');
    const text = el.value.trim();
    if (!text) return;
    const d = draft(c), outgoing = d.translated && d.source === text ? d.translated : text;
    // What the employee sends from here is never asked for: it is marked as read in the reading language, and a
    // reply that was put into the customer's language keeps what was typed as its translation.
```

Replace them with:

```text
  }

  // ---- sending a file ----
  // One file can be attached to a conversation: with the "+" button, by pasting it into the message box, or by
  // dropping it on the conversation. It goes out with what is in the message box as its caption, and it stays
  // attached until the server says it was sent — pressing send again repeats the same request, which never
  // sends twice. The file itself lives in this page only: after a reload nothing is attached.
  const OPENWA_FILE_MAX = 16 * 1024 * 1024;
  const OPENWA_CAPTION_MAX = 1024;
  // Pictures the browser can show are shown small beside the name of the file.
  const OPENWA_FILE_SHOWN = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const openwaFiles = new Map();
  for (const id of Object.keys(ui.attachments)) delete ui.attachments[id];
  const openwaFileSize = bytes => bytes < 1024 * 1024 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1024 / 1024).toFixed(1) + ' MB';
  function openwaAttachButton() {
    return `<button class="icon-button" type="button" data-action="openwaAttach" aria-label="添加文件" title="添加图片、视频、音频或文件，也可以粘贴或拖到会话里">${icon('Plus')}</button><input type="file" id="openwa-file" hidden>`;
  }
  // Draws the line above the message box and the send button again, as the page does while a message is typed.
  // The line takes room from the conversation: one that showed its end goes on showing it.
  function openwaShowFile(c) {
    const box = $('#translation-preview');
    if (ui.view !== 'inbox' || selectedCustomer() !== c || !box) return;
    box.innerHTML = previewHTML(c);
    paintIcons(box);
    updateSendState(c);
    if (openwaAtEnd) openwaShowEnd();
  }
  function openwaDetach(id) {
    const held = openwaFiles.get(id);
    if (held?.url) URL.revokeObjectURL(held.url);
    openwaFiles.delete(id);
    delete ui.attachments[id];
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
  const openwaBaseSendState = updateSendState;
  updateSendState = function(c) {
    openwaBaseSendState(c);
    const button = document.querySelector('[data-action="send"]');
    if (button && c && openwaFiles.get(c.id)?.sending) button.disabled = true;
  };
  document.addEventListener('change', event => {
    if (event.target.id !== 'openwa-file') return;
    const files = [...event.target.files];
    event.target.value = '';
    openwaAttach(files);
  });
  document.addEventListener('paste', event => {
    const files = event.target.id === 'composer-text' ? [...(event.clipboardData?.files || [])] : [];
    if (!files.length) return;
    event.preventDefault();
    openwaAttach(files);
  });
  // A file that is dragged over the open conversation can be dropped anywhere on it.
  const openwaDragged = event => ([...(event.dataTransfer?.types || [])].includes('Files') ? event.target.closest?.('.chat-pane:not(.fid-chat-blank)') : null);
  document.addEventListener('dragover', event => {
    const pane = openwaDragged(event);
    if (!pane) return;
    event.preventDefault();
    pane.classList.add('openwa-file-over');
  });
  document.addEventListener('dragleave', event => {
    const pane = openwaDragged(event);
    if (pane && !pane.contains(event.relatedTarget)) pane.classList.remove('openwa-file-over');
  });
  document.addEventListener('drop', event => {
    const pane = openwaDragged(event);
    if (!pane) return;
    event.preventDefault();
    pane.classList.remove('openwa-file-over');
    if (event.dataTransfer.items?.[0]?.webkitGetAsEntry?.()?.isDirectory) return toast('不能发送文件夹，请选择文件。');
    openwaAttach([...event.dataTransfer.files]);
  });
  // The file goes to the server as it is, behind one line with its details: whom it is for, its name, its type
  // and the caption. text is what was typed; caption is what goes out with the file (the translation when one
  // was made).
  async function openwaSendFile(c, held, text, caption) {
    if (held.sending) return;
    const digits = fidPhoneDigits(c.phone);
    if (!c.waChat && digits.length < 7) return toast('这位客户没有可用的 WhatsApp 号码。');
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
    } catch (e) {
      answer = { status: 0, body: {} };
    }
    held.sending = false;
    if (answer.status !== 200) {
      const open = answer.status === 0 || answer.status === 502 || answer.body.error === 'outcome-unknown';
      toast(open ? '发送结果待确认。文件还在消息框上方，再按一次发送即可，不会重复发出。' : answer.body.error === 'not-connected' ? '号码未连接，文件没有发出。' : answer.status === 413 ? '文件超过 16 MB，无法从这里发送。' : '文件没有发出，可再按一次发送。');
      return openwaShowFile(c);
    }
    const sent = answer.body, shown = caption || openwaMediaText[sent.type];
    const list = data.messages[c.id] ??= conversationMessages(c);
    // The feed may have brought the message first: that one is kept and completed.
    let message = list.find(m => m.wa === sent.messageId);
    if (!message) {
      message = { id: nextId('m'), side: 'out', time: openwaClock(sent.timestamp), at: sent.timestamp, wa: sent.messageId, status: 'sent' };
      list.push(message);
      list.sort((x, y) => (x.at || 0) - (y.at || 0));
    }
    // Like every message the page sends, it is marked as read in the reading language and never asked for.
    Object.assign(message, { text: shown, type: sent.type, ...(sent.file ? { file: sent.file } : {}), translatedTo: aiSettings().readLanguage, ...(caption !== text ? { translated: text } : {}) });
    if (list.at(-1) === message) Object.assign(c, { preview: shown, last: message.time, lastAt: message.at });
    c.unread = 0;
    if (draft(c).text.trim() === text) ui.drafts[c.id] = { text: '', translated: '', source: '' };
    openwaDetach(c.id);
    persist();
    openwaRefresh();
    // What was just sent is in view, wherever the conversation stood.
    if (ui.view === 'inbox' && selectedCustomer() === c) requestAnimationFrame(openwaShowEnd);
  }

  send = function() {
    const c = selectedCustomer(), el = $('#composer-text');
    if (!c || !el) return;
    if (account(c.account)?.state !== 'online') return toast('号码尚未连接，草稿会保留。');
    const text = el.value.trim(), held = openwaFiles.get(c.id);
    if (!text && !held) return;
    const d = draft(c), outgoing = d.translated && d.source === text ? d.translated : text;
    // With a file attached, the text is its caption: both go out as one message.
    if (held) return openwaSendFile(c, held, text, outgoing);
    // What the employee sends from here is never asked for: it is marked as read in the reading language, and a
    // reply that was put into the customer's language keeps what was typed as its translation.
```

**Edit 3.5** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    persist();
    render();
    openwaDeliver(c, message);
  };
```

Replace them with:

```text
    persist();
    render();
    // What was just sent is in view, also when the line above the message box had pushed the end out of it.
    requestAnimationFrame(openwaShowEnd);
    openwaDeliver(c, message);
  };
```

**Edit 3.6** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
      c = data.customers.find(x => x.account === a.id && !x.waChat && (data.messages[x.id] || []).some(m => m.side === 'out' && (m.wa ? m.wa === e.id : m.status === 'sending' && m.text === e.text)));
    }
    if (c && !c.waChat) c.waChat = e.chat;
    if (c && !c.phone && e.phone) c.phone = '+' + e.phone;
    if (e.kind === 'chat') {
```

Replace them with:

```text
      c = data.customers.find(x => x.account === a.id && !x.waChat && (data.messages[x.id] || []).some(m => m.side === 'out' && (m.wa ? m.wa === e.id : m.status === 'sending' && m.text === e.text)));
    }
    // The same for a file on its way to such a customer: no message of it exists yet, so the customer is the one
    // this number is sending a file to right now.
    if (!c && e.kind === 'message' && e.fromMe && e.type !== 'text') {
      const waiting = data.customers.filter(x => x.account === a.id && !x.waChat && openwaFiles.get(x.id)?.sending);
      if (waiting.length === 1) c = waiting[0];
    }
    // A customer who was known by phone number only learns the chat id here. That is a change of its own: a
    // file that was sent to the customer shows only once the chat is known.
    const named = Boolean(c && !c.waChat);
    if (named) c.waChat = e.chat;
    if (c && !c.phone && e.phone) c.phone = '+' + e.phone;
    if (e.kind === 'chat') {
```

**Edit 3.7** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    c ||= openwaNewCustomer(a, e);
    const list = data.messages[c.id] ??= conversationMessages(c);
    if (e.id && list.some(m => m.wa === e.id)) return false;
    const text = e.text || openwaMediaText[e.type] || '[消息]';
    if (e.fromMe) {
```

Replace them with:

```text
    c ||= openwaNewCustomer(a, e);
    const list = data.messages[c.id] ??= conversationMessages(c);
    if (e.id && list.some(m => m.wa === e.id)) return named;
    const text = e.text || openwaMediaText[e.type] || '[消息]';
    if (e.fromMe) {
```

**Edit 3.8** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    }
    const message = { id: nextId('m'), side: e.fromMe ? 'out' : 'in', text, time: openwaClock(e.at), at: e.at, wa: e.id, type: e.type, ...(e.media?.name ? { file: e.media.name } : {}), ...(e.fromMe ? { status: 'sent' } : {}) };
    list.push(message);
    list.sort((x, y) => (x.at || 0) - (y.at || 0));
```

Replace them with:

```text
    }
    const message = { id: nextId('m'), side: e.fromMe ? 'out' : 'in', text, time: openwaClock(e.at), at: e.at, wa: e.id, type: e.type, ...(e.media?.name ? { file: e.media.name } : {}), ...(e.fromMe ? { status: 'sent' } : {}) };
    // A file this page is sending comes through the feed before the server has answered: it is the page's own
    // message, marked like everything the page sends.
    if (e.fromMe && openwaFiles.get(c.id)?.sending) message.translatedTo = aiSettings().readLanguage;
    list.push(message);
    list.sort((x, y) => (x.at || 0) - (y.at || 0));
```

**Edit 3.9** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
      openwaDeliver(c, m);
    },
  });

```

Replace them with:

```text
      openwaDeliver(c, m);
    },
    openwaAttach:()=>$('#openwa-file')?.click(),
    removeAttachment:()=>{
      const c = selectedCustomer();
      if (!c || openwaFiles.get(c.id)?.sending) return;
      openwaDetach(c.id);
      openwaShowFile(c);
    },
  });

```

#### `build-fidelity.cjs`

**Edit 3.10** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
swap('.includes(q));return list}', '.includes(q));return openwaOrder(list)}');
swap('enabled=online&&(d.text.trim()||ui.attachment);', 'enabled=online&&Boolean(d.text.trim());');
swap(`<button class="icon-button" data-action="attachment" aria-label="添加演示附件">'+icon('Paperclip')+'</button>`, '');
swap('aria-label="发送演示消息"', 'aria-label="发送消息"');
```

Replace them with:

```text
swap('.includes(q));return list}', '.includes(q));return openwaOrder(list)}');
// The button that attaches a file (plan 043) stands where the baseline had its made-up one; the baseline's own
// line above the message box and its send button already reckon with an attached file.
swap(`<button class="icon-button" data-action="attachment" aria-label="添加演示附件">'+icon('Paperclip')+'</button>`, `'+openwaAttachButton()+'`);
swap('aria-label="发送演示消息"', 'aria-label="发送消息"');
```

**Edit 3.11** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
}
// The dialog that added a made-up attachment to a message is gone with its button; real files come with the media step.
cut(/^      case 'attachment':\{[^\n]*\n/m, 'demo attachment dialog');
```

Replace them with:

```text
}
// The dialog that added a made-up attachment to a message is gone with its button; a real file is attached by
// fidelity-openwa.js.
cut(/^      case 'attachment':\{[^\n]*\n/m, 'demo attachment dialog');
```

#### `fidelity.css`

**Edit 3.12** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.message-bubble>.openwa-media:last-child,.message-bubble>.openwa-file:last-child,.message-bubble>.openwa-media-missing:last-child { margin-bottom:0; }

```

Replace them with:

```text
.message-bubble>.openwa-media:last-child,.message-bubble>.openwa-file:last-child,.message-bubble>.openwa-media-missing:last-child { margin-bottom:0; }
/* A file attached to the message that is being written (plan 043): a picture small beside its name, the note
   while it is on its way, and the conversation while a file is dragged over it. */
.openwa-attached { height:40px; max-width:64px; margin-right:8px; border-radius:6px; object-fit:cover; vertical-align:middle; }
.openwa-attached-busy { color:var(--color-text-muted); }
.chat-pane.openwa-file-over { outline:2px dashed var(--color-accent); outline-offset:-2px; }
/* With the button for files the tools beside the message box are one more: where the conversation is too narrow
   for one line they take a second one instead of running into the send button. */
.composer-tools { flex-wrap:wrap; row-gap:4px; }

```

#### `validate-scrm-lifecycle.cjs`

**Edit 3.13** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(appJs.includes("<div class=\"message-bubble\">'+openwaMediaHTML(c,m)+(openwaCaption(c,m)?"), 'a message bubble must show its media and the text under it');
// The list of conversations keeps its place when the page is drawn again.
```

Replace them with:

```text
assert(appJs.includes("<div class=\"message-bubble\">'+openwaMediaHTML(c,m)+(openwaCaption(c,m)?"), 'a message bubble must show its media and the text under it');
// A file is attached to a message and sent with it: the button stands where the baseline had its made-up one, the
// file goes to the server as it is, what the page sends is marked like every message, and what was just sent or
// has just arrived stays in view.
for (const required of ['function openwaAttachButton() {', "fetch('/api/wa/send-file', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Blob([details, '\\n', held.file]) })", 'if (held) return openwaSendFile(c, held, text, outgoing);', "if (held.caption !== caption) Object.assign(held, { caption, request: nextId('r') });", 'for (const id of Object.keys(ui.attachments)) delete ui.attachments[id];', 'if (e.fromMe && openwaFiles.get(c.id)?.sending) message.translatedTo = aiSettings().readLanguage;', 'if (box && box.contains(event.target) && openwaAtEnd) openwaShowEnd();', 'requestAnimationFrame(openwaShowEnd);']) {
  assert(openwaSource.includes(required), `fidelity-openwa.js is missing ${required}`);
}
for (const required of ["<div class=\"composer-tools\">'+openwaAttachButton()+'<button class=\"icon-button\" data-action=\"quickAll\"", 'enabled=online&&(d.text.trim()||ui.attachment);']) {
  assert(appJs.includes(required), `the built page is missing ${required}`);
}
assert(!/添加演示附件|data-action="attachment"/.test(appJs), 'the made-up attachment of the baseline must be gone');
for (const required of ["'POST /api/wa/send-file': async req => {", "if (mediaType(req.headers['content-type']) !== 'application/octet-stream') {", 'const body = await readRaw(req, SEND_DETAILS_MAX + SEND_FILE_MAX), end = body.subarray(0, SEND_DETAILS_MAX).indexOf(10);', 'const SEND_FILE_MAX = 16 * 1024 * 1024;', 'mediaKeep(mediaKey(row.id, to, outcome.messageId), { mime, name, bytes });', "function sendForm(bytes, declared = '') {"]) {
  assert(read(path.join(__dirname, 'openwa-link.cjs')).includes(required), `openwa-link.cjs is missing ${required}`);
}
// The list of conversations keeps its place when the page is drawn again.
```

**Edit 3.14** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  messageTranslation: 'once per message and reading language: kept on the message (translatedTo) and saved; the conversation on screen asks only for messages without a mark; the relay keeps every translation in ai-translations.db and gives it again',
  externalNetworkCalls: false,
```

Replace them with:

```text
  messageTranslation: 'once per message and reading language: kept on the message (translatedTo) and saved; the conversation on screen asks only for messages without a mark; the relay keeps every translation in ai-translations.db and gives it again',
  fileSending: 'one file per message from the message box (the + button, paste, drop), sent by the server through OpenWA with the typed words as its caption; told by its bytes: JPEG and PNG as a picture, MP4 (H.264) as a video, MP3, OGG, M4A and AAC as a recording, everything else as a document; 16 MB at most',
  externalNetworkCalls: false,
```

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js work/wa-replica/build-fidelity.cjs work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs` → `3b1c6bef090f2f18e5ea599a0e3d30a595c97c817bc7e5110ad73c10bff53e71`, `388d269452cc88a62901ff2ecfa332ae7718c3a59344641341fd3a87ecd03592`, `fdce5df7373a05f50462dee1d5d41b80e29b2f088624502e4c8c90c50dd4eabf`, `69dee1e96301af6323bada1580e50ad0cf38f6cbb528aed48280f033302279ac`; the syntax command → `SYNTAX_OK`; `git checkout 511fb4a -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84` (a message "Missing prototype source anchor" means a swap does not match the baseline — STOP); `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `sha256sum outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/app.css` → `dcb43051a3ff344935f1a70a3df93127872d056be7f9d5b2d1bf8814cde21e14`, `45d4e291cf2f0b46bb93464af7b7dfe746042d82cc8c44c6ebfde51836b1933e`. If a checksum does not match, restore the file with `git checkout 511fb4a -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 4: README, build log, final verification

#### `README.md`

**Edit 4.1** — `README.md`. Find exactly these lines (they occur once):

```text
#### 接入 OpenWA（WhatsApp 连接，可选）
服务带有子站与其专属 OpenWA 之间的连接接口（`/api/wa/*`，需要已设置 `WA_SCRM_DATA_DIR`）：为号码创建并启动会话、返回扫码二维码、接收 OpenWA 的事件通知并在落库后应答、按顺序提供给页面，以及发送文本消息。把 `work/wa-replica/openwa.env.example` 复制到私有位置并填写，再用环境变量 `WA_SCRM_OPENWA_ENV` 指向它启动服务。OpenWA 的密钥只保存在服务器；OpenWA 的通知必须带有效签名才会被接收。页面通过这些接口扫码绑定号码、接收消息并发送文本消息。号码上线时，服务器会自动取回该号码上已有的一对一会话及每个会话最近的 50 条消息，之后每 15 分钟补取一次通知没有送达的内容（逐个会话读取，中间留有间隔）；未设置时，号码管理会提示服务器尚未接入 WhatsApp 连接。

```

Replace them with:

```text
#### 接入 OpenWA（WhatsApp 连接，可选）
服务带有子站与其专属 OpenWA 之间的连接接口（`/api/wa/*`，需要已设置 `WA_SCRM_DATA_DIR`）：为号码创建并启动会话、返回扫码二维码、接收 OpenWA 的事件通知并在落库后应答、按顺序提供给页面，以及发送文本消息和文件。把 `work/wa-replica/openwa.env.example` 复制到私有位置并填写，再用环境变量 `WA_SCRM_OPENWA_ENV` 指向它启动服务。OpenWA 的密钥只保存在服务器；OpenWA 的通知必须带有效签名才会被接收。页面通过这些接口扫码绑定号码、接收消息并发送文本消息和文件。号码上线时，服务器会自动取回该号码上已有的一对一会话及每个会话最近的 50 条消息，之后每 15 分钟补取一次通知没有送达的内容（逐个会话读取，中间留有间隔）；未设置时，号码管理会提示服务器尚未接入 WhatsApp 连接。

```

**Edit 4.2** — `README.md`. Find exactly these lines (they occur once):

```text

### 重新编译与完整性校验
```

Replace them with:

```text

员工可以从消息框发送文件：点击消息框下方的「+」（添加文件）、把文件粘贴到消息框，或把文件拖到会话里。一次一个文件，最大 16 MB，消息框里的文字作为说明一起发出（最多 1024 个字符）。文件由服务器经 OpenWA 发送（`/api/wa/send-file`），按内容而不是文件名判断类型：JPG、PNG 作为图片发送，MP4（H.264）作为视频，MP3、OGG、M4A、AAC 作为音频，其余一律作为文件发送并保留原文件名。同一次发送重复请求不会重复发出；发出的文件同样保存在 `wa-media-<子站>` 文件夹中，页面立即显示。服务器前面的反向代理需要允许不小于 16 MB 的请求体（例如 nginx 的 `client_max_body_size 20m`），并且等待应答的时间不短于 60 秒。在浏览器里录制语音需要 HTTPS，暂不提供。

### 重新编译与完整性校验
```

#### `replica/build-log.md`

**Append 4.3** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 从消息框发送图片、视频、音频和文件 · 2026-11-22

此前消息框只能发送文字。按项目负责人的要求（消息框要能发送图片等各类文件；经确认 OpenWA 支持的类型全部提供），现在可以从消息框发送文件，没有使用外部库：

- 消息框下方最左边新增「+」（添加文件）按钮；也可以把文件粘贴到消息框，或把文件拖到会话里。一次一个文件，最大 16 MB。文件名和大小显示在消息框上方，图片带缩略图，可以「移除」。文件只保存在当前页面里，刷新后需要重新添加。
- 消息框里的文字作为说明和文件一起发出（最多 1024 个字符），同样经过发送保护：需要翻译时先显示译文，再按一次才发送。
- 文件由服务器经 OpenWA 发出（新接口 `/api/wa/send-file`），按文件内容判断类型：JPG、PNG 作为图片，MP4（H.264）作为视频，MP3、OGG、M4A、AAC 作为音频，其余（包括 GIF、WebP、HEIC、MOV 和 H.265 视频）作为文件发送并保留文件名。
- 发送成功后消息立即出现在会话里，图片直接显示；发送失败或结果待确认时，文件仍留在消息框上方，再按一次发送即可，同一次发送不会重复发出。
- 在浏览器里录制语音需要 HTTPS，当前预览地址是 HTTP，暂不提供。

同时修正：刚发出的消息和刚收到的图片现在总是留在视野内。此前，消息框上方出现译文预览后发出的文字，以及加载稍慢的图片，会落在会话可见区域的下方，需要手动滚动才能看到。消息框下方的工具在会话较窄时自动换到第二行，不再与发送按钮重叠。

部署：服务器文件有变更，合并后需要重启一次预览服务；预览地址前的 nginx 请求体上限需要从 10 MB 调整为 20 MB。
```

Then verify everything once more:

```bash
git checkout 511fb4a -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && $NODE --test work/wa-replica/openwa-link.test.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-043/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test runs end with `pass 21`, `fail 0` and `pass 12`, `fail 0`; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `b480c7e0f4e9f7b0be1052294126989195360c90d6441d9f581fe94ab67162a4`, `f56b198f2457746072c384308b442fc02c5edb49a4c18604510e426e07cc7f17`; `git status --porcelain` lists exactly eleven paths: `README.md`, `replica/build-log.md`, the six source files under `work/wa-replica/`, and `outputs/wa-replica-prototype/app.js`, `app.css` and `validation.json` (if `outputs/wa-replica-prototype/icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Tests of the link** (21, two new): what a file is sent as is told by its bytes — a picture, a video or a recording only in a format WhatsApp shows as such, a video WhatsApp Web could not play and every other file as a document under the type the browser gave it; the route sends by the matching route of OpenWA with the caption and, for a document, its cleaned name; one file for a request however often it is repeated, a conflict when the same request names another file or caption; what was sent is served to the page without a call to OpenWA; an empty file, a file over 16 MB, a caption over 1024 characters, a group, a body not announced as `application/octet-stream`, details that are not one line of JSON or take more than their room, an unknown number, nobody signed in, a supervisor, an employee of another sub-site and a page of another site are refused before anything reaches OpenWA; a file of exactly 16 MB goes through; a number that is not connected; an open outcome and the same key on every try. The log names the kind and the size of a file, never its name or caption.
- **Validator** — the page has the button in place of the made-up one, sends the file as it is, marks what it sends, keeps the end of the conversation in view; the server has the route, the limit, the check of the announced type and keeps what it sent.
- **Smoke** (`/tmp/wa-scrm-plan-043/smoke.sh`) — the same facts on the sources and the built page, the README, the build log, the syntax of the two files and the tests of the link, the relay and the server.
- The build and the validator do not run the page. **Verified by the reviewer in scripted browser sessions, not by you**: the button attaches a file, its name, size and picture show above the message box, the conversation still shows its end, a file alone can be sent; it goes out once by the route of its kind with the typed words as its caption, shows in the conversation at once from the copy the server kept, is saved, gets its receipts, and nothing of it goes to the model service. Each kind goes out and shows as what it is; without words the conversation names the kind. Paste and drop attach like the button; several at once attach the first; a file can be replaced and removed, belongs to its conversation, is not sent while the number is not connected, and is gone after a reload while the words stay. An empty file and one over 16 MB are refused in the page, one of exactly 16 MB goes through, a caption that is too long is not sent; an open outcome keeps the file and the words, and the next press sends the same request; other words are another request; while a file is on its way the line says so, it cannot be removed and a second press sends nothing more. A sent file is one message whichever arrives first, also for a customer known by phone number only who comes back under a privacy id; a caption goes through the send guard like any reply and shows what was typed below it. What was sent or arrives is in view; a reader further up is not pulled down. The sessions of the rest of the product and of the connection still pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 511fb4a -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 21`, `fail 0`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 14`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-043/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/openwa-link.cjs` → `1bbca7bd22cbedae4363f1edaad3280279dc78f454064575358c601fa4a37769`
- [ ] `sha256sum work/wa-replica/openwa-link.test.cjs` → `34f3dd1626a43436867b58a535ba6916746fd9a9a1d0eb22b2013fee471a5a8c`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js` → `3b1c6bef090f2f18e5ea599a0e3d30a595c97c817bc7e5110ad73c10bff53e71`
- [ ] `sha256sum work/wa-replica/build-fidelity.cjs` → `388d269452cc88a62901ff2ecfa332ae7718c3a59344641341fd3a87ecd03592`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `fdce5df7373a05f50462dee1d5d41b80e29b2f088624502e4c8c90c50dd4eabf`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `69dee1e96301af6323bada1580e50ad0cf38f6cbb528aed48280f033302279ac`
- [ ] `sha256sum README.md` → `b480c7e0f4e9f7b0be1052294126989195360c90d6441d9f581fe94ab67162a4`
- [ ] `sha256sum replica/build-log.md` → `f56b198f2457746072c384308b442fc02c5edb49a4c18604510e426e07cc7f17`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `dcb43051a3ff344935f1a70a3df93127872d056be7f9d5b2d1bf8814cde21e14`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `45d4e291cf2f0b46bb93464af7b7dfe746042d82cc8c44c6ebfde51836b1933e`
- [ ] `git diff --quiet 511fb4a -- outputs/wa-replica-prototype/icons.js outputs/wa-replica-prototype/tokens.css` exits 0 (the icon file and the tokens are unchanged)
- [ ] `git diff --name-only 511fb4a..HEAD -- . ':!plans'` lists exactly these eleven: `README.md`, `outputs/wa-replica-prototype/app.css`, `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/build-fidelity.cjs`, `work/wa-replica/fidelity-openwa.js`, `work/wa-replica/fidelity.css`, `work/wa-replica/openwa-link.cjs`, `work/wa-replica/openwa-link.test.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs`
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

- **Deployment**: `openwa-link.cjs` is loaded when the server starts — **the preview service must be restarted once after the merge**. The proxy in front of the server must let a request body of 16 MB through and wait up to a minute for the answer: the preview's nginx is raised from `client_max_body_size 10m` to `20m` by the reviewer at the merge. The server asks OpenWA for 45 seconds at most, below the proxy's minute.
- **Not tried against the real WhatsApp**: a real send puts a message on the owner's number, so the route was verified against OpenWA's own code (0.31.0: the four routes, their fields and limits, the idempotency key) and a stand-in. The first real file is the owner's to send. If OpenWA refuses a kind that is sent as a picture, a video or a recording here, take it out of `SEND_AS`: it then goes out as a document.
- What is sent as what is one table and two lists at the top of `openwa-link.cjs` (`SEND_AS`, `SEND_VIDEO_KINDS`, `SEND_VIDEO_OTHER`); the limit is `SEND_FILE_MAX` there and `OPENWA_FILE_MAX` in the page. Raising it needs the proxy's limit raised too, and OpenWA takes a JSON body of 25 MB at most (a file of about 18 MB).
- A file that is attached is kept in the page's memory only (`openwaFiles`); the label of the baseline (`ui.attachments`) is emptied when the page starts, so a label never outlives its file.
- Several files in one message, and recording a voice note (needs HTTPS), are not built.
- What a reviewer should scrutinise: that one press sends one file; that a failure leaves the file attached and nothing in the conversation; that the picture of a sent file shows without a call to OpenWA; that the conversation shows its end after sending.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
