# Plan 044: A customer shows the profile picture WhatsApp gives for the chat

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 602cc09..HEAD -- work/wa-replica replica/build-log.md outputs README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MEDIUM (a new route of the server that fetches a picture from an address the gateway names — the address is checked before anything is fetched; exact text and checksums for every edit)
- **Depends on**: plans/043-send-a-file-from-the-message-box.md (DONE)
- **Category**: feature (owner request)
- **Planned at**: commit `602cc09`, 2026-11-22

## Why this matters

Every customer shows initials in a coloured circle. The owner, 2026-11-22: "are some customer avatars failing to sync because OpenWA doesn't support them?"

What was found: nothing fails — the workbench never asked for a picture. OpenWA 0.31.0 does give them: `GET /api/sessions/{id}/contacts/{chat id}/profile-picture` answers `{ url }` with an address on WhatsApp's own picture servers (`https://pps.whatsapp.net/…`, a JPEG of some tens of kilobytes), `{ url: null }` when the chat has no picture or hides it from this number, and a failure (503) for a number WhatsApp does not know. On the owner's number 27 of 88 chats had a picture that could be seen. Asked "Shall I show customers' WhatsApp profile pictures?", told that the server would fetch each picture and re-check it once a day and that customers without a visible picture keep their initials, the owner chose "Yes, show them".

What this plan does:

- **The server gets a route that hands out the picture of a chat** (`GET /api/wa/avatar?account=…&chat=…`, for everybody who is signed in to the sub-site, like the media of a message). It asks OpenWA for the address, fetches the picture **only from WhatsApp's own servers (https, `*.whatsapp.net`) or from the gateway itself**, takes it only when its bytes are a picture of 2 MB at most, and keeps it in the folder of the media. After a day it is looked up again; until then — and whenever it cannot be looked up, as while the number is not connected — what was kept is handed out. A chat without a picture is kept as that, and a picture that is gone is not kept any longer. What cannot be told now is not kept and is asked again after ten minutes. Lookups go one after the other. A chat without a picture is answered with "no content" (204), not with an error.
- **The page lays the picture over the initials** wherever an avatar is drawn (the list of conversations, the top of a conversation, the unread conversations of the dashboard, the customer file): one function gives every avatar an image for a customer of a linked number; when the server answers without a picture the image is taken out again and the initials stay.

### Decisions already made (do not re-open; do not ask)

- The picture is fetched by the server, never by the employee's browser from WhatsApp.
- Kept for a day (`AVATAR_FRESH_MS`); the browser keeps an answer for an hour (ten minutes when nothing could be told).
- The chat id is part of the address of the request, as it is for the media of a message.
- An employee has no picture: only a customer of a linked number is asked for.
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/openwa-link.cjs` | `1bbca7bd22cbedae4363f1edaad3280279dc78f454064575358c601fa4a37769` | `31d38dde9c32879bd3a68fb09c9fe1d0a8777988caac454806571fa9cd10d910` |
| `work/wa-replica/openwa-link.test.cjs` | `34f3dd1626a43436867b58a535ba6916746fd9a9a1d0eb22b2013fee471a5a8c` | `d1ab1dd7474ae17209a5938a58fc468ad90c35409d641b226f62d870503229f0` |
| `work/wa-replica/fidelity-openwa.js` | `3b1c6bef090f2f18e5ea599a0e3d30a595c97c817bc7e5110ad73c10bff53e71` | `86af38a9a3682c0d30c89c18d4415f74b0f04f2c49157af174df2ceea38bc016` |
| `work/wa-replica/build-fidelity.cjs` | `388d269452cc88a62901ff2ecfa332ae7718c3a59344641341fd3a87ecd03592` | `35e2407fffbebcb3d0b420cc4c27fddef0892fd9a6e25b23a114d75e74f81139` |
| `work/wa-replica/fidelity.css` | `fdce5df7373a05f50462dee1d5d41b80e29b2f088624502e4c8c90c50dd4eabf` | `50f7a14ceb746663a8f8e31d937ff55cb6195d28dfc20bb06b23a0e9d5315e6a` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `69dee1e96301af6323bada1580e50ad0cf38f6cbb528aed48280f033302279ac` | `f3a9625286b62bdbfe93d4a5cca250d776e6be21112e1393256e7228fe080dc7` |
| `README.md` | `b480c7e0f4e9f7b0be1052294126989195360c90d6441d9f581fe94ab67162a4` | `e5d94ecc161159ca3692309885997fe776d0c79beb4da2ac86fef6a13d1dfc66` |

- `openwa-link.cjs` — the server's link to the sub-site's OpenWA. `ask(config, method, pathname, …)` is one call to OpenWA; `mediaKind(bytes)` tells what kind of picture, sound or video some bytes are; `mediaDir` is the folder `wa-media-<site>` of the data folder in which the media of messages is kept (it may be emptied at any time); `GET /api/wa/media` serves that media to everybody who is signed in (`signedIn`). `openwa-link.test.cjs` — its tests (21) with a stand-in OpenWA.
- `fidelity-openwa.js` — the chat module of the page. It already shows the media of a message and replaces media that cannot be had with a note (a listener for `error`).
- `build-fidelity.cjs` — the build. The baseline draws every avatar with one helper, `avatar(c, classes)`: a `<span class="avatar …">` with the initials. A `swap` lets it add what `openwaAvatar(c)` returns.
- `fidelity.css` — the styles of the modules. The new rules have no sizes in px, so `tokens.css` does not change.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page; a block is added.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 602cc09 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Syntax of the chat module | `node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/fidelity-openwa.js','utf8')+'})');console.log('SYNTAX_OK')"` | `SYNTAX_OK` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 22`, `fail 0` (they send a 16 MB file twice; allow a few seconds) |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 14`, `fail 0` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 12`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-044/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/openwa-link.cjs`, `openwa-link.test.cjs` (Step 2)
- `work/wa-replica/fidelity-openwa.js`, `build-fidelity.cjs`, `fidelity.css`, `validate-scrm-lifecycle.cjs` (Step 3)
- `README.md`, `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{app.js,app.css,validation.json}` (the other output files, `icons.js` and `tokens.css` among them, must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular `serve.cjs`, `site-*.cjs`, `ai-relay.cjs`, `fidelity-boot.js`, the other page modules, the other style sheets, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/044-customer-pictures` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): show the profile picture WhatsApp gives for a customer's chat`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the seven files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-044/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-044 && cat > /tmp/wa-scrm-plan-044/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that a customer shows the profile picture WhatsApp gives for the chat.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the tests of the link pass, with the one for profile pictures' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 22 ℹ fail 0 '
has 'the server has the route for a picture' "$W/openwa-link.cjs" "'GET /api/wa/avatar': avatar,"
has 'a picture is looked up again after a day' "$W/openwa-link.cjs" 'const AVATAR_FRESH_MS = 24 * 60 * 60 * 1000;'
has 'a picture is fetched from WhatsApp or the gateway only' "$W/openwa-link.cjs" "if (address.origin !== new URL(config.baseUrl).origin && !(address.protocol === 'https:' && AVATAR_HOSTS.test(address.hostname))) throw problem('gateway-failed');"
has 'every avatar offers the picture of the customer' "$P/app.js" "+esc(c.initials||c.initial||initial(c.name))+openwaAvatar(c)+'</span>';"
has 'the page asks for the picture of a customer of a linked number' "$P/app.js" "if (!c.account || !account(c.account)?.linked || (!c.waChat && digits.length < 7)) return '';"
has 'an avatar without a picture keeps its initials' "$P/app.js" "if (event.target.classList?.contains('openwa-avatar')) event.target.remove();"
has 'the style sheet lays the picture over the initials' "$P/app.css" '.openwa-avatar'
has 'the README names the route' "$ROOT/README.md" '/api/wa/avatar'
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 客户头像显示 WhatsApp 头像'
same 'the link passes the syntax check' "$(node --check "$W/openwa-link.cjs" 2>&1 && echo SYNTAX_OK)" SYNTAX_OK
same 'the chat module passes the syntax check' "$(cd "$ROOT" && node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/fidelity-openwa.js','utf8')+'})');console.log('SYNTAX_OK')" 2>&1)" SYNTAX_OK
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-044/smoke.sh && ls -l /tmp/wa-scrm-plan-044/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/openwa-link.cjs work/wa-replica/openwa-link.test.cjs work/wa-replica/fidelity-openwa.js work/wa-replica/build-fidelity.cjs work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs README.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-044/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the tests of the link pass, with the one for profile pictures` (got: ℹ pass 21 ℹ fail 0 ), `the server has the route for a picture`, `a picture is looked up again after a day`, `a picture is fetched from WhatsApp or the gateway only`, `every avatar offers the picture of the customer`, `the page asks for the picture of a customer of a linked number`, `an avatar without a picture keeps its initials`, `the style sheet lays the picture over the initials`, `the README names the route` and `the build log has the entry` (ten checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The server hands out the picture of a chat

#### `openwa-link.cjs`

**Edit 2.1** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
const MEDIA_FILE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/aac': 'aac', 'audio/mp4': 'm4a', 'audio/wav': 'wav', 'audio/webm': 'webm', 'video/mp4': 'mp4', 'video/webm': 'webm' };
// Sending a file from the page: the largest file taken, the room for its details in front of it, how long OpenWA
```

Replace them with:

```text
const MEDIA_FILE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/aac': 'aac', 'audio/mp4': 'm4a', 'audio/wav': 'wav', 'audio/webm': 'webm', 'video/mp4': 'mp4', 'video/webm': 'webm' };
// The picture of a customer: the largest one taken, how long one is good for before it is looked up again, and
// where, besides the gateway itself, a picture may be fetched from: WhatsApp's own servers.
const AVATAR_MAX = 2 * 1024 * 1024;
const AVATAR_FRESH_MS = 24 * 60 * 60 * 1000;
const AVATAR_HOSTS = /(^|\.)whatsapp\.net$/;
// Sending a file from the page: the largest file taken, the room for its details in front of it, how long OpenWA
```

**Edit 2.2** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
  }
  // The words of a voice note or sound file. The speech service is asked once for each: the text is kept beside
```

Replace them with:

```text
  }
  // ---- the picture of a customer ----
  // The profile picture WhatsApp shows for a chat. OpenWA names its address; the picture is fetched from there —
  // from WhatsApp's own servers or from the gateway itself, nowhere else — and kept beside the media. After a
  // day it is looked up again; until then, and whenever it cannot be looked up, what was kept is handed out. A
  // chat without a picture (none set, or hidden from this number) is kept as that. Lookups go one after the
  // other, and two requests for the same chat share one.
  const avatarKey = (account, chat) => crypto.createHash('sha256').update(`avatar\n${account}\n${chat}`).digest('hex');
  function avatarKept(key) {
    try {
      const note = JSON.parse(fs.readFileSync(path.join(mediaDir, key + '.json'), 'utf8'));
      return { ...note, bytes: note.none ? null : fs.readFileSync(path.join(mediaDir, key + '.bin')) };
    } catch {
      return null;
    }
  }
  // The note is written last, as for media. A picture that is gone is not kept any longer.
  function avatarKeep(key, picture) {
    fs.mkdirSync(mediaDir, { recursive: true, mode: 0o700 });
    if (picture) fs.writeFileSync(path.join(mediaDir, key + '.bin'), picture.bytes, { mode: 0o600 });
    else fs.rmSync(path.join(mediaDir, key + '.bin'), { force: true });
    fs.writeFileSync(path.join(mediaDir, key + '.json'), JSON.stringify(picture ? { mime: picture.mime, at: now() } : { none: true, at: now() }), { mode: 0o600 });
  }
  // Looks a picture up: { mime, bytes }, null when the chat has none, or a failure when that cannot be told now.
  async function avatarLook(config, row, chat) {
    const answer = await ask(config, 'GET', `/api/sessions/${row.session}/contacts/${encodeURIComponent(chat)}/profile-picture`);
    if (answer.status !== 200) throw problem(answer.status === 409 ? 'not-connected' : 'gateway-failed');
    let address = null;
    try {
      address = new URL(answer.body?.url);
    } catch {}
    if (!address) return null;
    if (address.origin !== new URL(config.baseUrl).origin && !(address.protocol === 'https:' && AVATAR_HOSTS.test(address.hostname))) throw problem('gateway-failed');
    let response;
    try {
      response = await fetch(address, { redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      throw problem('gateway-unreachable');
    }
    if (!response.ok || Number(response.headers.get('content-length')) > AVATAR_MAX) {
      await response.body?.cancel().catch(() => {});
      throw problem('gateway-failed');
    }
    const bytes = Buffer.from(await response.arrayBuffer()), mime = mediaKind(bytes);
    if (bytes.length > AVATAR_MAX || !mime?.startsWith('image/')) throw problem('gateway-failed');
    return { mime, bytes };
  }
  const avatarMissing = new Map(), avatarLooking = new Map();
  let avatarLine = Promise.resolve();
  // The picture of one chat as it is handed out now: what was kept, looked up first when that is older than a
  // day. Null when nothing is known of it.
  async function avatarOf(account, chat) {
    if (!ACCOUNT.test(account) || !CHAT.test(chat)) throw problem('invalid-request');
    const key = avatarKey(account, chat), kept = avatarKept(key);
    if ((kept && now() - kept.at < AVATAR_FRESH_MS) || (avatarMissing.get(key) || 0) > now()) return kept;
    const row = store.account(account);
    if (!row) throw problem('unknown-account');
    if (!avatarLooking.has(key)) {
      const config = settings(), looked = avatarLine.then(() => avatarLook(config, row, chat));
      avatarLine = looked.catch(() => {});
      avatarLooking.set(key, looked.then(picture => {
        avatarKeep(key, picture);
        console.log(`wa avatar ok account=${row.id} ${picture ? 'bytes=' + picture.bytes.length : 'none'}`);
      }, error => {
        avatarMissing.set(key, now() + MEDIA_RETRY_MS);
        console.error(`wa avatar failed account=${row.id} error=${error.code || error.name}`);
      }).finally(() => avatarLooking.delete(key)));
    }
    await avatarLooking.get(key);
    return avatarKept(key);
  }
  // Answers with the picture, or with "no content" when the chat has none or nothing can be told now: the page
  // then leaves the initials. What kind of picture it is, is told by its bytes.
  async function avatar(req, url, res) {
    signedIn(req);
    const found = await avatarOf(url.searchParams.get('account') || '', url.searchParams.get('chat') || '');
    const kind = found?.bytes ? mediaKind(found.bytes) : null, shown = Boolean(kind?.startsWith('image/'));
    res.writeHead(shown ? 200 : 204, {
      ...(shown ? { 'Content-Type': kind, 'Content-Length': found.bytes.length } : {}),
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'",
      'Cache-Control': `private, max-age=${found ? 3600 : 600}`,
    });
    res.end(shown ? found.bytes : undefined);
    return SENT;
  }
  // The words of a voice note or sound file. The speech service is asked once for each: the text is kept beside
```

**Edit 2.3** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
    'GET /api/wa/media': media,
    'POST /api/wa/transcribe': transcribe,
```

Replace them with:

```text
    'GET /api/wa/media': media,
    'GET /api/wa/avatar': avatar,
    'POST /api/wa/transcribe': transcribe,
```

#### `openwa-link.test.cjs`

**Edit 2.4** — `work/wa-replica/openwa-link.test.cjs`. Find exactly these lines (they occur once):

```text
// ---- the stand-in for OpenWA ----
const gw = { sessions: new Map(), hooks: new Map(), sends: [], files: [], calls: [], sendMode: 'ok', replies: new Map(), chats: new Map(), history: new Map(), contacts: new Map(), media: new Map() };
const uuid = () => crypto.randomUUID();
```

Replace them with:

```text
// ---- the stand-in for OpenWA ----
const gw = { sessions: new Map(), hooks: new Map(), sends: [], files: [], calls: [], sendMode: 'ok', replies: new Map(), chats: new Map(), history: new Map(), contacts: new Map(), media: new Map(), pictures: new Map() };
const uuid = () => crypto.randomUUID();
```

**Edit 2.5** — `work/wa-replica/openwa-link.test.cjs`. Find exactly these lines (they occur once):

```text
    gw.calls.push(`${req.method} ${req.url}`);
    if (req.headers['x-api-key'] !== KEY) return fail(401, 'Unauthorized', 'API key is required');
```

Replace them with:

```text
    gw.calls.push(`${req.method} ${req.url}`);
    // A profile picture is fetched from the address OpenWA names, without a key: here, the stand-in's own.
    if (req.url.startsWith('/pictures/')) {
      const picture = gw.pictures.get(decodeURIComponent(req.url.slice(10)));
      if (!Buffer.isBuffer(picture)) return fail(404, 'Not Found', 'no picture');
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': picture.length });
      return res.end(picture);
    }
    if (req.headers['x-api-key'] !== KEY) return fail(401, 'Unauthorized', 'API key is required');
```

**Edit 2.6** — `work/wa-replica/openwa-link.test.cjs`. Find exactly these lines (they occur once):

```text
    }
    if (action === 'contacts') return gw.contacts.has(decodeURIComponent(third)) ? answer(200, gw.contacts.get(decodeURIComponent(third))) : fail(404, 'Not Found', 'Contact not found');
```

Replace them with:

```text
    }
    // The picture of a chat: its address, null when there is none, a failure for a number WhatsApp does not know.
    if (action === 'contacts' && fourth === 'profile-picture') {
      if (session.status !== 'ready') return fail(409, 'Conflict', 'Session is not connected. The WhatsApp client is not ready.');
      const picture = gw.pictures.get(decodeURIComponent(third));
      if (picture === 'unknown') return fail(503, 'Service Unavailable', 'The engine could not answer');
      return answer(200, { url: Buffer.isBuffer(picture) ? `http://127.0.0.1:${gwPort}/pictures/${third}` : picture || null });
    }
    if (action === 'contacts') return gw.contacts.has(decodeURIComponent(third)) ? answer(200, gw.contacts.get(decodeURIComponent(third))) : fail(404, 'Not Found', 'Contact not found');
```

**Edit 2.7** — `work/wa-replica/openwa-link.test.cjs`. Find exactly these lines (they occur once):

```text

test('unlinking removes the session at OpenWA and the record; later deliveries of it are dropped', async () => {
```

Replace them with:

```text

test('the picture of a customer: looked up through OpenWA, fetched once and kept for a day; no picture is kept as that; what cannot be told now is asked again later; only a picture from WhatsApp or the gateway is taken', async () => {
  gwSessionOf('a1').status = 'ready';
  const chat = '15550002222@c.us', lid = '333444555666777@lid', other = '15550003333@c.us';
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(500, 9)]), png = Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'), Buffer.alloc(300, 4)]);
  const avatar = (query, cookie = lin) => fetch(`http://127.0.0.1:${port}/api/wa/avatar?${query}`, { headers: cookie ? { Cookie: cookie } : {} })
    .then(async r => ({ status: r.status, type: r.headers.get('content-type'), cache: r.headers.get('cache-control'), nosniff: r.headers.get('x-content-type-options'), csp: r.headers.get('content-security-policy'), bytes: Buffer.from(await r.arrayBuffer()) }));
  const q = (c, account = 'a1') => `account=${account}&chat=${encodeURIComponent(c)}`;
  const lookups = () => gw.calls.filter(c => c.endsWith('/profile-picture')).length, fetches = () => gw.calls.filter(c => c.startsWith('GET /pictures/')).length;
  const file = (c, ending) => path.join(tmp, 'main', 'wa-media-s1', crypto.createHash('sha256').update(`avatar\na1\n${c}`).digest('hex') + ending);
  gw.calls.length = 0;
  gw.pictures.set(chat, jpeg);
  // looked up, fetched from the address OpenWA names, handed out
  const first = await avatar(q(chat));
  assert.deepEqual([first.status, first.type, first.cache, first.nosniff, first.csp, first.bytes.equals(jpeg)], [200, 'image/jpeg', 'private, max-age=3600', 'nosniff', "sandbox; default-src 'none'", true]);
  assert.deepEqual([lookups(), fetches()], [1, 1]);
  // kept: not asked again within a day, also when the picture has changed meanwhile
  gw.pictures.set(chat, png);
  clock += 23 * 60 * 60 * 1000;
  assert((await avatar(q(chat))).bytes.equals(jpeg));
  assert.deepEqual([lookups(), fetches()], [1, 1]);
  // after a day it is looked up again; several requests at the same time share one lookup
  clock += 2 * 60 * 60 * 1000;
  const next = await Promise.all([avatar(q(chat)), avatar(q(chat)), avatar(q(chat))]);
  assert.deepEqual([next.map(n => n.status), next.map(n => n.type), next.every(n => n.bytes.equals(png)), lookups(), fetches()], [[200, 200, 200], ['image/png', 'image/png', 'image/png'], true, 2, 2]);
  // no picture: "no content", and that is kept for a day too
  const none = await avatar(q(lid));
  assert.deepEqual([none.status, none.type, none.cache, none.bytes.length, lookups()], [204, null, 'private, max-age=3600', 0, 3]);
  assert.deepEqual([(await avatar(q(lid))).status, lookups(), fs.existsSync(file(lid, '.json')), fs.existsSync(file(lid, '.bin'))], [204, 3, true, false]);
  // a picture that is gone is not kept any longer
  gw.pictures.delete(chat);
  clock += 25 * 60 * 60 * 1000;
  assert.deepEqual([(await avatar(q(chat))).status, fs.existsSync(file(chat, '.bin')), lookups()], [204, false, 4]);
  // what cannot be told now is not kept: asked again after ten minutes, and what was kept before is still handed out
  gw.pictures.set(other, jpeg);
  assert.equal((await avatar(q(other))).status, 200);
  clock += 25 * 60 * 60 * 1000;
  gw.pictures.set(other, 'unknown');
  const before = lookups();
  const stale = await avatar(q(other));
  assert.deepEqual([stale.status, stale.bytes.equals(jpeg), lookups()], [200, true, before + 1], 'the picture from before, while OpenWA cannot answer');
  assert.deepEqual([(await avatar(q(other))).status, lookups()], [200, before + 1], 'not asked again at once');
  gw.pictures.set('15550004444@c.us', 'unknown');
  const unknown = await avatar(q('15550004444@c.us'));
  assert.deepEqual([unknown.status, unknown.cache, fs.existsSync(file('15550004444@c.us', '.json'))], [204, 'private, max-age=600', false], 'nothing known and nothing kept');
  clock += 11 * 60 * 1000;
  gw.pictures.set(other, png);
  assert.deepEqual([(await avatar(q(other))).bytes.equals(png), lookups()], [true, before + 3], 'asked again later');
  // the number is not connected: what was kept is handed out, nothing else is asked for
  gwSessionOf('a1').status = 'qr_ready';
  clock += 25 * 60 * 60 * 1000;
  assert.deepEqual([(await avatar(q(other))).status, (await avatar(q('15550005555@c.us'))).status], [200, 204]);
  gwSessionOf('a1').status = 'ready';
  // only a picture from WhatsApp's own servers or from the gateway is fetched, and only a picture is taken
  const taken = fetches();
  gw.pictures.set('15550006666@c.us', `http://127.0.0.1:${port}/api/site/status`);
  gw.pictures.set('15550007777@c.us', 'http://pps.whatsapp.net/v/t61/picture.jpg');
  gw.pictures.set('15550008888@c.us', 'https://whatsapp.net.example.org/picture.jpg');
  gw.pictures.set('15550009990@c.us', Buffer.from('<!doctype html><script>alert(1)</script>' + ' '.repeat(40)));
  gw.pictures.set('15550009991@c.us', Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2 * 1024 * 1024, 1)]));
  for (const c of ['15550006666@c.us', '15550007777@c.us', '15550008888@c.us', '15550009990@c.us', '15550009991@c.us']) {
    const answer = await avatar(q(c));
    assert.deepEqual([answer.status, answer.bytes.length, fs.existsSync(file(c, '.bin'))], [204, 0, false], c);
  }
  assert.equal(fetches(), taken + 2, 'only the two addresses at the gateway were fetched');
  // who may ask, and for what
  const nina = await member('nina', 'supervisor', null), omar = await member('omar', 'agent', 'elsewhere');
  assert.deepEqual([(await avatar(q(other), '')).status, (await avatar(q(other), omar)).status, (await avatar(q(other), nina)).status], [401, 403, 200]);
  for (const bad of ['account=a1&chat=120363000000000000%40g.us', 'account=a%2F1&chat=' + encodeURIComponent(chat), 'account=a1', 'account=a1&chat=..%2F..%2Fetc%2Fpasswd']) {
    assert.deepEqual((await call('/api/wa/avatar?' + bad, { cookie: lin })).json, { error: 'invalid-request' }, bad);
  }
  assert.deepEqual((await call('/api/wa/avatar?' + q(chat, 'zz'), { cookie: lin })).json, { error: 'unknown-account' });
  // what is kept is private
  assert.equal(fs.statSync(file(other, '.bin')).mode & 0o077, 0);
  assert.equal(fs.statSync(file(other, '.json')).mode & 0o077, 0);
});

test('unlinking removes the session at OpenWA and the record; later deliveries of it are dropped', async () => {
```

**Edit 2.8** — `work/wa-replica/openwa-link.test.cjs`. Find exactly these lines (they occur once):

```text
  const lines = logged.filter(line => line.startsWith('wa '));
  for (const expected of ['wa link ok account=a1 state=scan', 'wa hook stored event=message.received account=a1', 'wa send ok account=a1 chars=5', 'wa send failed account=a1 error=not-connected upstream=409', 'wa send ok account=a1 file=image bytes=304', 'wa send failed account=a1 file=document error=not-connected upstream=409', 'wa unlink ok account=a4', 'error=gateway-unreachable', 'error=gateway-refused']) {
    assert(lines.some(line => line.includes(expected)), expected);
  }
  for (const secret of [KEY, SECRET, '15550001111', '15550009999', 'hello', 'Hola', 'On my way', 'Here it is', 'photo.jpg', QR]) assert(!lines.some(line => line.includes(secret)), secret);
  const stored = ['wa-s1.db', 'wa-s1.db-wal'].map(name => path.join(tmp, 'main', name)).filter(file => fs.existsSync(file)).map(file => fs.readFileSync(file).toString('latin1')).join('');
```

Replace them with:

```text
  const lines = logged.filter(line => line.startsWith('wa '));
  for (const expected of ['wa link ok account=a1 state=scan', 'wa hook stored event=message.received account=a1', 'wa send ok account=a1 chars=5', 'wa send failed account=a1 error=not-connected upstream=409', 'wa send ok account=a1 file=image bytes=304', 'wa send failed account=a1 file=document error=not-connected upstream=409', 'wa avatar ok account=a1 bytes=504', 'wa avatar ok account=a1 none', 'wa avatar failed account=a1 error=gateway-failed', 'wa avatar failed account=a1 error=not-connected', 'wa unlink ok account=a4', 'error=gateway-unreachable', 'error=gateway-refused']) {
    assert(lines.some(line => line.includes(expected)), expected);
  }
  for (const secret of [KEY, SECRET, '15550001111', '15550009999', '15550002222', '333444555666777', 'hello', 'Hola', 'On my way', 'Here it is', 'photo.jpg', QR]) assert(!lines.some(line => line.includes(secret)), secret);
  const stored = ['wa-s1.db', 'wa-s1.db-wal'].map(name => path.join(tmp, 'main', name)).filter(file => fs.existsSync(file)).map(file => fs.readFileSync(file).toString('latin1')).join('');
```

**Verify**: `sha256sum work/wa-replica/openwa-link.cjs work/wa-replica/openwa-link.test.cjs` → `31d38dde9c32879bd3a68fb09c9fe1d0a8777988caac454806571fa9cd10d910`, `d1ab1dd7474ae17209a5938a58fc468ad90c35409d641b226f62d870503229f0`; `node --check work/wa-replica/openwa-link.cjs` exits 0; `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 22`, `fail 0`. If a checksum does not match, restore the file with `git checkout 602cc09 -- <file>` and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 3: The page lays the picture over the initials

#### `fidelity-openwa.js`

**Edit 3.1** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
  }, true);
  // Drawing a conversation again must not stop a voice note or a video that is playing: its element takes the
```

Replace them with:

```text
  }, true);

  // ---- the customer's picture ----
  // A customer of a linked number shows the profile picture WhatsApp gives for the chat, laid over the initials
  // wherever an avatar is drawn. Where there is none — or the customer hides it from this number — the server
  // answers without a picture, and the initials stay.
  function openwaAvatar(c) {
    const digits = fidPhoneDigits(c.phone || '');
    if (!c.account || !account(c.account)?.linked || (!c.waChat && digits.length < 7)) return '';
    return `<img class="openwa-avatar" src="/api/wa/avatar?account=${encodeURIComponent(c.account)}&amp;chat=${encodeURIComponent(c.waChat || digits + '@c.us')}" alt="" loading="lazy">`;
  }
  document.addEventListener('error', event => {
    if (event.target.classList?.contains('openwa-avatar')) event.target.remove();
  }, true);
  // Drawing a conversation again must not stop a voice note or a video that is playing: its element takes the
```

#### `build-fidelity.cjs`

**Edit 3.2** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
swap('.includes(q));return list}', '.includes(q));return openwaOrder(list)}');
// The button that attaches a file (plan 043) stands where the baseline had its made-up one; the baseline's own
```

Replace them with:

```text
swap('.includes(q));return list}', '.includes(q));return openwaOrder(list)}');
// A customer's profile picture (plan 044) lies over the initials wherever an avatar is drawn.
swap("+esc(c.initials||c.initial||initial(c.name))+'</span>';", "+esc(c.initials||c.initial||initial(c.name))+openwaAvatar(c)+'</span>';");
// The button that attaches a file (plan 043) stands where the baseline had its made-up one; the baseline's own
```

#### `fidelity.css`

**Edit 3.3** — `work/wa-replica/fidelity.css`. Find exactly these lines (they occur once):

```text
.composer-tools { flex-wrap:wrap; row-gap:4px; }

```

Replace them with:

```text
.composer-tools { flex-wrap:wrap; row-gap:4px; }
/* The customer's profile picture (plan 044) lies over the initials and takes the round shape of the avatar. */
.avatar { position:relative; }
.openwa-avatar { position:absolute; inset:0; width:100%; height:100%; border-radius:50%; object-fit:cover; }

```

#### `validate-scrm-lifecycle.cjs`

**Edit 3.4** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
}
// The list of conversations keeps its place when the page is drawn again.
```

Replace them with:

```text
}
// A customer shows the profile picture WhatsApp gives for the chat, over the initials: every avatar offers it,
// and the server takes a picture only from WhatsApp's own servers or from the gateway.
for (const required of ['function openwaAvatar(c) {', "if (!c.account || !account(c.account)?.linked || (!c.waChat && digits.length < 7)) return '';", "if (event.target.classList?.contains('openwa-avatar')) event.target.remove();"]) {
  assert(openwaSource.includes(required), `fidelity-openwa.js is missing ${required}`);
}
assert(appJs.includes("+esc(c.initials||c.initial||initial(c.name))+openwaAvatar(c)+'</span>';"), 'every avatar must offer the customer\'s picture');
for (const required of ["'GET /api/wa/avatar': avatar,", 'const AVATAR_FRESH_MS = 24 * 60 * 60 * 1000;', "if (address.origin !== new URL(config.baseUrl).origin && !(address.protocol === 'https:' && AVATAR_HOSTS.test(address.hostname))) throw problem('gateway-failed');", "response = await fetch(address, { redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS) });"]) {
  assert(read(path.join(__dirname, 'openwa-link.cjs')).includes(required), `openwa-link.cjs is missing ${required}`);
}
// The list of conversations keeps its place when the page is drawn again.
```

**Edit 3.5** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  fileSending: 'one file per message from the message box (the + button, paste, drop), sent by the server through OpenWA with the typed words as its caption; told by its bytes: JPEG and PNG as a picture, MP4 (H.264) as a video, MP3, OGG, M4A and AAC as a recording, everything else as a document; 16 MB at most',
  externalNetworkCalls: false,
```

Replace them with:

```text
  fileSending: 'one file per message from the message box (the + button, paste, drop), sent by the server through OpenWA with the typed words as its caption; told by its bytes: JPEG and PNG as a picture, MP4 (H.264) as a video, MP3, OGG, M4A and AAC as a recording, everything else as a document; 16 MB at most',
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  externalNetworkCalls: false,
```

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js work/wa-replica/build-fidelity.cjs work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs` → `86af38a9a3682c0d30c89c18d4415f74b0f04f2c49157af174df2ceea38bc016`, `35e2407fffbebcb3d0b420cc4c27fddef0892fd9a6e25b23a114d75e74f81139`, `50f7a14ceb746663a8f8e31d937ff55cb6195d28dfc20bb06b23a0e9d5315e6a`, `f3a9625286b62bdbfe93d4a5cca250d776e6be21112e1393256e7228fe080dc7`; the syntax command → `SYNTAX_OK`; `git checkout 602cc09 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84` (a message "Missing prototype source anchor" means a swap does not match the baseline — STOP); `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `sha256sum outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/app.css` → `0b0dc1c8329d371fef6a4c8446d96cf3c0d865fb7ad78fa637aa46279c7b5d48`, `3cc27b9f5bbefeed2cf93c36076e4390aa9f027e4073dc4f6b4407948c63996c`. If a checksum does not match, restore the file with `git checkout 602cc09 -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 4: README, build log, final verification

#### `README.md`

**Edit 4.1** — `README.md`. Find exactly these lines (they occur once):

```text

### 重新编译与完整性校验
```

Replace them with:

```text

号码绑定后，会话列表、聊天界面顶部、工作台首页的未读会话和客户 360° 档案里的客户头像显示客户的 WhatsApp 头像（`/api/wa/avatar`，只对已登录用户开放）。服务器经 OpenWA 查询头像地址，只从 WhatsApp 自己的服务器或网关本身取回图片，保存在 `wa-media-<子站>` 文件夹中，一天后重新查询；号码掉线时继续使用已保存的头像。客户没有设置头像，或把头像设为对这个号码不可见时，继续显示姓名首字母。

### 重新编译与完整性校验
```

#### `replica/build-log.md`

**Append 4.2** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 客户头像显示 WhatsApp 头像 · 2026-11-22

此前工作台从不读取客户的 WhatsApp 头像，所有客户都只显示姓名首字母（并不是同步失败，OpenWA 支持读取头像）。按项目负责人的要求，现在显示客户的 WhatsApp 头像：

- 会话列表、聊天界面顶部、工作台首页的未读会话和客户 360° 档案里，凡是显示客户头像的位置，都在首字母之上显示客户的 WhatsApp 头像。
- 头像由服务器经 OpenWA 查询并取回（新接口 `/api/wa/avatar`），只从 WhatsApp 自己的服务器或网关本身取图，保存在数据目录中，一天后重新查询；号码掉线期间继续使用已保存的头像。
- 客户没有设置头像，或把头像设为对这个号码不可见时，继续显示首字母。在负责人的号码上，88 个会话里目前有 27 个能看到头像。

部署：服务器文件有变更，合并后需要重启一次预览服务。
```

Then verify everything once more:

```bash
git checkout 602cc09 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && $NODE --test work/wa-replica/openwa-link.test.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-044/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test runs end with `pass 22`, `fail 0` and `pass 12`, `fail 0`; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `e5d94ecc161159ca3692309885997fe776d0c79beb4da2ac86fef6a13d1dfc66`, `eb7e232ace1ee8e6a0945fa7f20986f35cf9824fece77c5002536db27b7bcf7f`; `git status --porcelain` lists exactly eleven paths: `README.md`, `replica/build-log.md`, the six source files under `work/wa-replica/`, and `outputs/wa-replica-prototype/app.js`, `app.css` and `validation.json` (if `outputs/wa-replica-prototype/icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Tests of the link** (22, one new): a picture is looked up through OpenWA, fetched from the address it names and handed out with the type its bytes say; it is kept — not asked again within a day, also when it has changed meanwhile — and looked up again after a day; several requests for one chat at the same time share one lookup; no picture is "no content" and is kept as that; a picture that is gone is not kept any longer; when OpenWA cannot answer, the picture from before is still handed out, nothing is kept for a chat that had none, and the question is asked again after ten minutes; while the number is not connected what was kept is handed out; an address elsewhere (another port of this machine, http instead of https, a host that only ends like WhatsApp's), something that is not a picture and a picture over 2 MB are not taken; nobody without a sign-in, no employee of another sub-site, a supervisor may; bad requests and an unknown number are refused; what is kept is private. The log names the number and the size, never the chat.
- **Validator** — every avatar offers the picture, the page asks only for a customer of a linked number and takes an image without a picture out again; the server has the route, the day, the check of the address and does not follow a redirect.
- **Smoke** (`/tmp/wa-scrm-plan-044/smoke.sh`) — the same facts on the sources and the built page, the README, the build log, the syntax of the two files and the tests of the link, the relay and the server.
- The build and the validator do not run the page. **Verified by the reviewer in scripted browser sessions, not by you**: a customer whose chat has a picture shows it over the initials — as large as the avatar and round — in the list of conversations, among the unread conversations of the dashboard, at the top of the conversation and in the customer file; a customer without a picture keeps the initials and nothing else is left in the avatar; a customer of a number that was never linked asks for nothing; the picture is looked up once, also after a reload. The sessions of the rest of the product and of the connection still pass without a failed request.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 602cc09 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 22`, `fail 0`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 14`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-044/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/openwa-link.cjs` → `31d38dde9c32879bd3a68fb09c9fe1d0a8777988caac454806571fa9cd10d910`
- [ ] `sha256sum work/wa-replica/openwa-link.test.cjs` → `d1ab1dd7474ae17209a5938a58fc468ad90c35409d641b226f62d870503229f0`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js` → `86af38a9a3682c0d30c89c18d4415f74b0f04f2c49157af174df2ceea38bc016`
- [ ] `sha256sum work/wa-replica/build-fidelity.cjs` → `35e2407fffbebcb3d0b420cc4c27fddef0892fd9a6e25b23a114d75e74f81139`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `50f7a14ceb746663a8f8e31d937ff55cb6195d28dfc20bb06b23a0e9d5315e6a`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `f3a9625286b62bdbfe93d4a5cca250d776e6be21112e1393256e7228fe080dc7`
- [ ] `sha256sum README.md` → `e5d94ecc161159ca3692309885997fe776d0c79beb4da2ac86fef6a13d1dfc66`
- [ ] `sha256sum replica/build-log.md` → `eb7e232ace1ee8e6a0945fa7f20986f35cf9824fece77c5002536db27b7bcf7f`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `0b0dc1c8329d371fef6a4c8446d96cf3c0d865fb7ad78fa637aa46279c7b5d48`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `3cc27b9f5bbefeed2cf93c36076e4390aa9f027e4073dc4f6b4407948c63996c`
- [ ] `git diff --quiet 602cc09 -- outputs/wa-replica-prototype/icons.js outputs/wa-replica-prototype/tokens.css` exits 0 (the icon file and the tokens are unchanged)
- [ ] `git diff --name-only 602cc09..HEAD -- . ':!plans'` lists exactly these eleven: `README.md`, `outputs/wa-replica-prototype/app.css`, `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/build-fidelity.cjs`, `work/wa-replica/fidelity-openwa.js`, `work/wa-replica/fidelity.css`, `work/wa-replica/openwa-link.cjs`, `work/wa-replica/openwa-link.test.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs`
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

- **Deployment**: `openwa-link.cjs` is loaded when the server starts — **the preview service must be restarted once after the merge**. The server must be able to reach `https://pps.whatsapp.net` (it reaches the internet for the model service already).
- The pictures are kept in the folder of the media (`wa-media-<site>`), under a name made from the word "avatar", the number and the chat; the note beside each says when it was looked up. The folder may be emptied at any time: the pictures are then looked up again.
- The first time a list is shown, each avatar in view asks for its picture; the server looks them up one after the other (a lookup takes about a quarter of a second), so a long list fills in over some seconds. After that the browser has them for an hour and the server for a day.
- The chat id — for a customer known by phone number only, the number — is part of the address of the request, as for `/api/wa/media`, and so appears in the access log of a proxy in front of the server. Both routes would have to change together if that is to be avoided.
- OpenWA's batch route for pictures (`contacts/profile-pictures?ids=…`) is not used: one lookup for one avatar keeps the route simple, and the lookups are few once the pictures are kept.
- What a reviewer should scrutinise: that nothing is fetched from an address outside WhatsApp's servers and the gateway; that a failed lookup neither shows an error in the page nor is repeated at once; that an avatar without a picture looks exactly as before.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
