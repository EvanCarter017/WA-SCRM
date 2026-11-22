# Plan 033: A message shows its picture, voice note, video or file

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 8de8740..HEAD -- work/wa-replica replica/build-log.md outputs README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM (a new server route that hands out files received from strangers; exact text and checksums for every edit; the rules that keep it safe are tested)
- **Depends on**: plans/032-release-wording.md (DONE)
- **Category**: feature (the media step of the owner's order of work)
- **Planned at**: commit `8de8740`, 2026-11-22

## Why this matters

The workbench is connected to real WhatsApp numbers, but a message that is not text shows only a word in brackets: "[图片]", "[语音]", "[视频]", "[文件]". The owner's imported chats alone hold 29 pictures, 52 documents and 2 videos. An employee who cannot see the photo of a product or open the price list a customer sent has to pick up the phone — which is what the workbench is meant to replace. Showing media is the next step of the order of work the owner agreed to ("pictures, voice notes … in the chat"); transcribing voice notes and sending files from the page are later plans.

What this plan builds:

- **Server**: `GET /api/wa/media?account=<id>&chat=<chat>&id=<message>[&download=1]`, for signed-in members of the sub-site. It asks OpenWA for the copy OpenWA stored when the message came in or went out. A message that was fetched while catching up has no such copy; for it the server reads the latest 50 messages of that chat again with their media and keeps **everything** that answer carries, so one read serves the whole conversation. What was fetched is kept in a folder `wa-media-<site>` beside the sub-site's records and served from there afterwards. What cannot be had is answered with 404 and not asked for again for ten minutes.
- **Safety**: these are files strangers send. The server decides by the first bytes of a file whether it is a picture, sound or video a browser plays; only then is it answered with that type for showing inside the page. Everything else — documents, and anything that is not what it is called — is answered as a download (`application/octet-stream`, `Content-Disposition: attachment`). Every answer carries `X-Content-Type-Options: nosniff` and a sandboxing `Content-Security-Policy`.
- **Page**: a picture or sticker is shown in the message bubble and opens in a new tab; a voice note or audio file and a video get the browser's player; a document is a link with its name that downloads it. Words that came with the media stay under it; the placeholder word is left out when the media is shown. Media that cannot be had gives way to a short note. A voice note that is playing goes on playing when the conversation is drawn again because something arrived.

### Verified against the owner's real number before this plan was written (read-only, structure only)

OpenWA 0.31.0: `GET /api/sessions/{session}/messages/{chat}/{message}/media` answers 404 for messages that came in through catching up; `GET …/messages/{chat}/history?limit=50&includeMedia=true` returns them with `media: { mimetype, filename?, data }` (base64). The route of this plan handed out the newest picture, document, video and sticker of the imported chats (first time 0.1–8 s, afterwards from the kept copy in a few milliseconds), a second file of the same conversation without a new read, a document only as a download, and 404 for a text message.

### Decisions already made (do not re-open; do not ask)

- Media is fetched when someone looks at it, not for every message in advance.
- Kept files are not removed automatically, also not when a number is unlinked; the folder may be emptied by hand at any time.
- No transcription, no sending of files, no thumbnails and no partial (range) answers in this plan.
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/openwa-link.cjs` | `65631bced96ff6eaf7722b78b078f2f0adeca6f3be57923ed0b973d282968f05` | `6f0bab2c77d3c3b2e20426db9a731fff72e124f1ef8e8fcd4dc56790181ff735` |
| `work/wa-replica/openwa-link.test.cjs` | `75f4544f23b60d79de284d557c35afc2421a62c3fe5dac6ae42385a75f12ab40` | `1568503d07d4294a7bbf08de59f1d0fbfd75bfaedad87598b3b6b381907a36b7` |
| `work/wa-replica/fidelity-openwa.js` | `46327bec9cda8c6c208a2d33d99cb0632a1a3d9d157325e274632cc354d2c259` | `852d466c4e00d5a2306c6df3f18520b8e2f52fe2b1ff624c61ccdc34484e4e96` |
| `work/wa-replica/fidelity-ai.js` | `c313b13cb5d81282538a80a53a944b78709e2b06d155e3589cba8f55e7b365db` | `9e2f034205bc97ee2b8e96cc21dc7d622d8459d24d282da42650ecdc6d81372f` |
| `work/wa-replica/fidelity.css` | `1db4ec98ee09765525e054c2bd67c37f65e0026a21a53dda584ab03b526bc792` | `13fc74c1bd872062adc29a8c8b4ccf001cab909149752c0533354e668d5d9d79` |
| `work/wa-replica/build-fidelity.cjs` | `be59237f7d97e08e57a079756c970f3f6c2d82c30b11c044b7d06f5a4423fd9e` | `c6db2f6a821d40c848475d670b990b1b1eb2f897a61b8c09d55cf70429c4da3b` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `02c81257894d1dd04b94dd283302b1fb6e7bbd99f59b9a2be70264d1e685480e` | `d9365f572db0a68f4f704ab9df71cf94a2e48615c2ef4166f2c699b2fb0cd5b2` |
| `README.md` | `188ed805cdeeaf7abff1be57ff947223905cad9996f5659de06cd3a30063440c` | `5b0e3ab1d57e36b8a6434950494ca00c568589574d478b7793a8cb056e1a027f` |

- `openwa-link.cjs` — the server's link to OpenWA. `create({ dir, siteId, site, now, sync })` holds the routes in an object `routes` keyed like `'GET /api/wa/status'`; `handle(req, res, pathname)` calls a route with `(req, url)` and sends what it returns as JSON, or the error's status from the table `STATUS`. `signedIn(req)` lets a member of the sub-site (or a supervisor) through; `settings()` gives the OpenWA settings; `store.account(id)` gives a number's record with its OpenWA `session`. Log lines begin with `wa ` and never carry a key, a phone number or message text.
- `openwa-link.test.cjs` — its tests (16) with a stand-in for OpenWA (`gateway`, state in `gw`). Two tests and the stand-in's media route are added.
- `fidelity-openwa.js` — the page module of the connection. A stored message has `wa` (WhatsApp's id), `type` (`text`, `image`, `sticker`, `video`, `audio`, `voice`, `document`, …) and `text` (the words, or a placeholder like `[图片]` from `openwaMediaText`). A customer has `account` and `waChat`.
- `fidelity-ai.js` — redraws a conversation after a translation arrived; that redraw must keep a playing voice note.
- `fidelity.css` — the page's own styles; the build puts them into `app.css`.
- `build-fidelity.cjs` — the build; `swap(from, to)` rewrites a text of the frozen baseline and fails when it is missing. One `swap` is added: the message bubble.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built files; one block is added.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 8de8740 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Syntax of the two page modules | `node -e "for(const f of ['fidelity-openwa.js','fidelity-ai.js'])new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/'+f,'utf8')+'})');console.log('SYNTAX_OK')"` | `SYNTAX_OK` |
| Link tests | `env -u WA_SCRM_OPENWA_ENV -u WA_SCRM_OPENWA_SYNC_MS -u WA_SCRM_OPENWA_SYNC_PAUSE_MS -u WA_SCRM_OPENWA_MEDIA_TIMEOUT_MS $NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 18`, `fail 0` (16 before this plan) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 12`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-033/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |
| Icon set | `node -e "const vm=require('vm'),fs=require('fs'),cp=require('child_process');const keys=s=>{const w={};vm.runInNewContext(s,{window:w});return Object.keys(w.WA_ICONS)};const a=keys(cp.execSync('git show 8de8740:outputs/wa-replica-prototype/icons.js').toString()),b=keys(fs.readFileSync('outputs/wa-replica-prototype/icons.js','utf8'));console.log('removed='+a.filter(x=>!b.includes(x)).join(',')+' added='+b.filter(x=>!a.includes(x)).join(','))"` | `removed= added=` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/openwa-link.cjs`, `work/wa-replica/openwa-link.test.cjs` (Step 2)
- `work/wa-replica/fidelity-openwa.js`, `fidelity-ai.js`, `fidelity.css`, `build-fidelity.cjs`, `validate-scrm-lifecycle.cjs` (Step 3)
- `README.md`, `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{app.js,app.css,validation.json}` (the other output files must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular `serve.cjs`, `site-*.cjs`, `ai-relay.cjs`, `fidelity-boot.js`, the other modules, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`; any real OpenWA, any settings file with a key, any data folder.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/033-media-in-messages` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): show the picture, voice note, video or file of a message`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each change, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the eight source files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-033/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-033 && cat > /tmp/wa-scrm-plan-033/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that a message shows its picture, voice note, video or file: the server's media route and its tests, the
# built page and its styles, the README.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'the server has the media route' "$W/openwa-link.cjs" "'GET /api/wa/media': media,"
has 'the server tells the kind of a file by its first bytes' "$W/openwa-link.cjs" 'function mediaKind(bytes, declared = '"''"') {'
has 'what is not a picture, sound or video is a download, and nothing is guessed' "$W/openwa-link.cjs" "'X-Content-Type-Options': 'nosniff',"
has 'the built page shows the media of a message' "$P/app.js" 'function openwaMediaHTML(c, m) {'
has 'the message bubble uses it' "$P/app.js" "<div class=\"message-bubble\">'+openwaMediaHTML(c,m)+(openwaCaption(c,m)?"
has 'a redraw keeps a playing voice note' "$P/app.js" 'function openwaKeepPlaying(draw) {'
has 'the built styles know the media of a message' "$P/app.css" '.openwa-media img'
has 'the README says where media is kept' "$ROOT/README.md" 'wa-media-<子站>'
same 'the server passes the syntax check' "$(node --check "$W/openwa-link.cjs" 2>&1 && node --check "$W/openwa-link.test.cjs" 2>&1 && echo ok)" ok
same 'the page modules pass the syntax check' "$(cd "$ROOT" && node -e "for(const f of ['fidelity-openwa.js','fidelity-ai.js'])new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/'+f,'utf8')+'})');console.log('SYNTAX_OK')" 2>&1)" SYNTAX_OK
same 'the link tests pass, with the two for media' "$(env -u WA_SCRM_OPENWA_ENV -u WA_SCRM_OPENWA_SYNC_MS -u WA_SCRM_OPENWA_SYNC_PAUSE_MS -u WA_SCRM_OPENWA_MEDIA_TIMEOUT_MS "$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 18 ℹ fail 0 '
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-033/smoke.sh && ls -l /tmp/wa-scrm-plan-033/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/openwa-link.cjs work/wa-replica/openwa-link.test.cjs work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity-ai.js work/wa-replica/fidelity.css work/wa-replica/build-fidelity.cjs work/wa-replica/validate-scrm-lifecycle.cjs README.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-033/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the server has the media route`, `the server tells the kind of a file by its first bytes`, `what is not a picture, sound or video is a download, and nothing is guessed`, `the built page shows the media of a message`, `the message bubble uses it`, `a redraw keeps a playing voice note`, `the built styles know the media of a message`, `the README says where media is kept` and `the link tests pass, with the two for media` (got: `ℹ pass 16 ℹ fail 0`) (nine checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The server: the media route, and its tests

#### `openwa-link.cjs`

**Edit 2.1** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
//   POST /api/wa/hook                            deliveries from OpenWA, stored before they are acknowledged
// The link also catches up by itself: when a number comes online it fetches the number's chats with one person
// and the latest messages of each, and every quarter of an hour it looks for what the hook did not deliver.
// The employee of the sub-site uses all of them; supervisors and administrators read the status. The hook
// takes no cookie: it accepts only a body signed with the hook secret. A delivery is stored as OpenWA sent it
```

Replace them with:

```text
//   POST /api/wa/hook                            deliveries from OpenWA, stored before they are acknowledged
//   GET  /api/wa/media?account=<id>&chat=<chat>&id=<message>[&download=1]
//                                                the picture, voice note, video or file of a message
// The link also catches up by itself: when a number comes online it fetches the number's chats with one person
// and the latest messages of each, and every quarter of an hour it looks for what the hook did not deliver.
// The media of a message is fetched from OpenWA the first time it is asked for and kept in the folder
// wa-media-<site> beside the records; that folder may be emptied at any time. A file is shown inside the page
// only when its first bytes are those of a picture, sound or video a browser plays; anything else is a download.
// The employee of the sub-site uses all of them; supervisors and administrators read the status and media. The hook
// takes no cookie: it accepts only a body signed with the hook secret. A delivery is stored as OpenWA sent it
```

**Edit 2.2** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
const SYNC_SKIP = ['unknown', 'masked', 'revoked'];
const ACCOUNT = /^[A-Za-z0-9]{1,24}$/;
const CLIENT = /^[A-Za-z0-9_-]{8,64}$/;
```

Replace them with:

```text
const SYNC_SKIP = ['unknown', 'masked', 'revoked'];
// Media: the largest file taken over, how long OpenWA may take, how many of a chat's latest messages are read
// again for the media of one that OpenWA holds no copy of, and how long a file that could not be had is not
// asked for again.
const MEDIA_MAX = 50 * 1024 * 1024;
const MEDIA_TIMEOUT_MS = Number(process.env.WA_SCRM_OPENWA_MEDIA_TIMEOUT_MS) || 60000;
const MEDIA_MESSAGES = 50;
const MEDIA_RETRY_MS = 10 * 60 * 1000;
const MEDIA_FILE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/aac': 'aac', 'audio/mp4': 'm4a', 'audio/wav': 'wav', 'audio/webm': 'webm', 'video/mp4': 'mp4', 'video/webm': 'webm' };
const SENT = Symbol('answered');
const ACCOUNT = /^[A-Za-z0-9]{1,24}$/;
const MESSAGE = /^[A-Za-z0-9_@.:-]{3,160}$/;
const CLIENT = /^[A-Za-z0-9_-]{8,64}$/;
```

**Edit 2.3** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
  'invalid-request': 400, 'send-refused': 400, 'not-signed-in': 401, 'bad-signature': 401, 'password-change-required': 403, 'forbidden': 403,
  'read-only': 403, 'unknown-account': 404, 'not-connected': 409, 'request-conflict': 409, 'outcome-unknown': 409, 'taken-over': 409,
  'too-long': 413, 'gateway-refused': 502, 'gateway-unreachable': 502, 'gateway-failed': 502, 'not-configured': 503,
```

Replace them with:

```text
  'invalid-request': 400, 'send-refused': 400, 'not-signed-in': 401, 'bad-signature': 401, 'password-change-required': 403, 'forbidden': 403,
  'read-only': 403, 'unknown-account': 404, 'media-unavailable': 404, 'not-connected': 409, 'request-conflict': 409, 'outcome-unknown': 409, 'taken-over': 409,
  'too-long': 413, 'gateway-refused': 502, 'gateway-unreachable': 502, 'gateway-failed': 502, 'not-configured': 503,
```

**Edit 2.4** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text

// One stored delivery in this project's own form, or null when the page has no use for it.
```

Replace them with:

```text

// What kind of picture, sound or video these bytes are, told by how they begin — never by a name or a declared
// type, because the answer decides whether a browser shows the file inside the page. Null for anything else.
function mediaKind(bytes, declared = '') {
  const text = (from, to) => bytes.subarray(from, to).toString('latin1');
  const sound = declared.startsWith('audio/');
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (text(0, 8) === '\x89PNG\r\n\x1a\n') return 'image/png';
  if (text(0, 6) === 'GIF87a' || text(0, 6) === 'GIF89a') return 'image/gif';
  if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') return 'image/webp';
  if (text(0, 4) === 'RIFF' && text(8, 12) === 'WAVE') return 'audio/wav';
  if (text(0, 4) === 'OggS') return 'audio/ogg';
  if (text(0, 3) === 'ID3' || (bytes[0] === 0xff && [0xfb, 0xf3, 0xf2].includes(bytes[1]))) return 'audio/mpeg';
  if (bytes[0] === 0xff && [0xf1, 0xf9].includes(bytes[1])) return 'audio/aac';
  if (text(4, 8) === 'ftyp') return sound || text(8, 11) === 'M4A' ? 'audio/mp4' : 'video/mp4';
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return sound ? 'audio/webm' : 'video/webm';
  return null;
}

// One stored delivery in this project's own form, or null when the page has no use for it.
```

**Edit 2.5** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text

  // The number's record. When there is none yet, its session and the webhook are made at OpenWA first. An
```

Replace them with:

```text

  // ---- the media of a message ----
  const mediaDir = path.join(dir, `wa-media-${siteId}`);
  const mediaKey = (account, chat, id) => crypto.createHash('sha256').update(`${account}\n${chat}\n${id}`).digest('hex');
  const mediaType = value => String(value || '').split(';')[0].trim().toLowerCase();
  function mediaKept(key) {
    try {
      return { ...JSON.parse(fs.readFileSync(path.join(mediaDir, key + '.json'), 'utf8')), bytes: fs.readFileSync(path.join(mediaDir, key + '.bin')) };
    } catch {
      return null;
    }
  }
  // The note is written last: a file without its note counts as not kept and is fetched again.
  function mediaKeep(key, { mime, name, bytes }) {
    fs.mkdirSync(mediaDir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(mediaDir, key + '.bin'), bytes, { mode: 0o600 });
    fs.writeFileSync(path.join(mediaDir, key + '.json'), JSON.stringify({ mime, name }), { mode: 0o600 });
  }
  async function mediaAsk(config, pathname) {
    let response;
    try {
      response = await fetch(config.baseUrl + pathname, { headers: { 'X-API-Key': config.key }, signal: AbortSignal.timeout(MEDIA_TIMEOUT_MS) });
    } catch {
      throw problem('gateway-unreachable');
    }
    if (response.status === 401 || response.status === 403) throw problem('gateway-refused');
    return response;
  }
  const mediaMissing = new Map();
  const mediaReading = new Map();
  // Fetches the media of one message and keeps it. OpenWA holds a copy of what came in or went out while it was
  // linked. For a message that was fetched while catching up there is no such copy: the latest messages of the
  // chat are read again with their media, and everything that comes with that answer is kept, so that one read
  // serves the whole conversation. Returns what was kept, or null when the media cannot be had.
  async function mediaFetch(config, row, chat, id) {
    const base = `/api/sessions/${row.session}/messages/${encodeURIComponent(chat)}`;
    const key = mediaKey(row.id, chat, id);
    const stored = await mediaAsk(config, `${base}/${encodeURIComponent(id)}/media`);
    if (stored.status === 200) {
      const bytes = Buffer.from(await stored.arrayBuffer());
      if (!bytes.length || bytes.length > MEDIA_MAX) return null;
      let name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(stored.headers.get('content-disposition') || '')?.[1] || '';
      try {
        name = decodeURIComponent(name);
      } catch {}
      mediaKeep(key, { mime: mediaType(stored.headers.get('content-type')), name, bytes });
      console.log(`wa media ok account=${row.id} source=stored bytes=${bytes.length}`);
      return mediaKept(key);
    }
    await stored.arrayBuffer().catch(() => {});
    if (stored.status !== 404) throw problem('gateway-failed');
    const reading = row.id + ' ' + chat;
    if (!mediaReading.has(reading)) {
      mediaReading.set(reading, (async () => {
        const answer = await mediaAsk(config, `${base}/history?limit=${MEDIA_MESSAGES}&includeMedia=true`);
        if (answer.status !== 200) {
          await answer.arrayBuffer().catch(() => {});
          if (answer.status === 409) throw problem('not-connected');
          throw problem('gateway-failed');
        }
        const list = await answer.json().catch(() => null);
        let files = 0, total = 0;
        for (const m of Array.isArray(list) ? list : []) {
          if (!m || typeof m.id !== 'string' || !MESSAGE.test(m.id) || typeof m.media?.data !== 'string') continue;
          const bytes = Buffer.from(m.media.data, 'base64');
          if (!bytes.length || bytes.length > MEDIA_MAX) continue;
          mediaKeep(mediaKey(row.id, chat, m.id), { mime: mediaType(m.media.mimetype), name: String(m.media.filename || ''), bytes });
          files += 1;
          total += bytes.length;
        }
        console.log(`wa media ok account=${row.id} source=history files=${files} bytes=${total}`);
      })().finally(() => mediaReading.delete(reading)));
    }
    await mediaReading.get(reading);
    return mediaKept(key);
  }
  // Answers with the file itself. Only what mediaKind recognises is shown inside the page; everything else, and
  // anything asked for with download=1, is handed over as a download under its own name.
  async function media(req, url, res) {
    signedIn(req);
    const account = url.searchParams.get('account') || '', chat = url.searchParams.get('chat') || '', id = url.searchParams.get('id') || '';
    if (!ACCOUNT.test(account) || !CHAT.test(chat) || !MESSAGE.test(id)) throw problem('invalid-request');
    const key = mediaKey(account, chat, id);
    let found = mediaKept(key);
    if (!found) {
      if ((mediaMissing.get(key) || 0) > now()) throw problem('media-unavailable');
      const row = store.account(account);
      if (!row) throw problem('unknown-account');
      found = await mediaFetch(settings(), row, chat, id);
      if (!found) {
        mediaMissing.set(key, now() + MEDIA_RETRY_MS);
        throw problem('media-unavailable');
      }
    }
    const kind = mediaKind(found.bytes, found.mime);
    const shown = Boolean(kind) && url.searchParams.get('download') !== '1';
    const name = found.name || (kind ? 'whatsapp.' + MEDIA_FILE[kind] : 'whatsapp-file');
    res.writeHead(200, {
      'Content-Type': shown ? kind : 'application/octet-stream',
      'Content-Length': found.bytes.length,
      'Content-Disposition': shown ? 'inline' : `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'",
      'Cache-Control': 'private, max-age=31536000, immutable',
    });
    res.end(found.bytes);
    return SENT;
  }

  // The number's record. When there is none yet, its session and the webhook are made at OpenWA first. An
```

**Edit 2.6** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
    },
    'POST /api/wa/hook': async req => {
```

Replace them with:

```text
    },
    'GET /api/wa/media': media,

    'POST /api/wa/hook': async req => {
```

**Edit 2.7** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
    try {
      return sendJson(res, 200, await route(req, new URL(req.url, 'http://localhost')));
    } catch (error) {
```

Replace them with:

```text
    try {
      const answer = await route(req, new URL(req.url, 'http://localhost'), res);
      return answer === SENT ? undefined : sendJson(res, 200, answer);
    } catch (error) {
```

**Edit 2.8** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text

module.exports = { create, loadConfig, present, signed, EVENTS, STATES };
```

Replace them with:

```text

module.exports = { create, loadConfig, present, signed, mediaKind, EVENTS, STATES };
```

#### `openwa-link.test.cjs`

**Edit 2.9** — `work/wa-replica/openwa-link.test.cjs`. Find exactly these lines (they occur once):

```text
// ---- the stand-in for OpenWA ----
const gw = { sessions: new Map(), hooks: new Map(), sends: [], calls: [], sendMode: 'ok', replies: new Map(), chats: new Map(), history: new Map(), contacts: new Map() };
const uuid = () => crypto.randomUUID();
```

Replace them with:

```text
// ---- the stand-in for OpenWA ----
const gw = { sessions: new Map(), hooks: new Map(), sends: [], calls: [], sendMode: 'ok', replies: new Map(), chats: new Map(), history: new Map(), contacts: new Map(), media: new Map() };
const uuid = () => crypto.randomUUID();
```

**Edit 2.10** — `work/wa-replica/openwa-link.test.cjs`. Find exactly these lines (they occur once):

```text
    if (req.headers['x-api-key'] !== KEY) return fail(401, 'Unauthorized', 'API key is required');
    const [, , , sessionId, action, third, fourth] = req.url.split('?')[0].split('/');
    if (!sessionId) {
```

Replace them with:

```text
    if (req.headers['x-api-key'] !== KEY) return fail(401, 'Unauthorized', 'API key is required');
    const [, , , sessionId, action, third, fourth, fifth] = req.url.split('?')[0].split('/');
    if (!sessionId) {
```

**Edit 2.11** — `work/wa-replica/openwa-link.test.cjs`. Find exactly these lines (they occur once):

```text
    }
    // What is on the number: its chats, the latest messages of one chat, and the contact behind a privacy id.
```

Replace them with:

```text
    }
    // The media of a message: the copy OpenWA stored when the message came in or went out, as an attachment.
    if (action === 'messages' && fifth === 'media') {
      const stored = gw.media.get(decodeURIComponent(fourth));
      if (!stored) return fail(404, 'Not Found', 'No stored media for this message');
      res.writeHead(200, { 'Content-Type': stored.mimetype, 'Content-Disposition': `attachment; filename="${stored.filename}"` });
      return res.end(stored.bytes);
    }
    // What is on the number: its chats, the latest messages of one chat, and the contact behind a privacy id.
```

**Edit 2.12** — `work/wa-replica/openwa-link.test.cjs`. Find exactly these lines (they occur once):

```text

test('unlinking removes the session at OpenWA and the record; later deliveries of it are dropped', async () => {
```

Replace them with:

```text

test('the media of a message: the stored copy, or the chat read again for a fetched message; kept after the first time; shown inside the page only when its bytes say what it is', async () => {
  await post('/api/wa/link', { account: 'a7' });
  const session = gwSessionOf('a7'), chat = '15550008888@c.us', lid = '222333444555666@lid';
  Object.assign(session, { status: 'ready', phone: '15550007070' });
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 7)]);
  const ogg = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(64, 1)]);
  const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(64, 2)]);
  const page = Buffer.from('<!doctype html><script>alert(1)</script>' + ' '.repeat(40));
  const media = (query, cookie = lin) => fetch(`http://127.0.0.1:${port}/api/wa/media?${query}`, { headers: cookie ? { Cookie: cookie } : {} })
    .then(async r => ({ status: r.status, type: r.headers.get('content-type'), disposition: r.headers.get('content-disposition'), nosniff: r.headers.get('x-content-type-options'), csp: r.headers.get('content-security-policy'), cache: r.headers.get('cache-control'), bytes: Buffer.from(await r.arrayBuffer()) }));
  const q = (c, id, extra = '') => `account=a7&chat=${encodeURIComponent(c)}&id=${encodeURIComponent(id)}${extra}`;
  const storedCalls = () => gw.calls.filter(c => c.endsWith('/media')).length, readCalls = () => gw.calls.filter(c => c.includes('includeMedia=true')).length;
  gw.calls.length = 0;

  // a message that came in while the number was linked: OpenWA has its copy
  gw.media.set(`false_${chat}_M1`, { mimetype: 'image/jpeg', filename: 'photo.jpg', bytes: jpeg });
  const first = await media(q(chat, `false_${chat}_M1`));
  assert.deepEqual([first.status, first.type, first.disposition, first.nosniff, first.csp, first.cache], [200, 'image/jpeg', 'inline', 'nosniff', "sandbox; default-src 'none'", 'private, max-age=31536000, immutable']);
  assert(first.bytes.equals(jpeg));
  assert.deepEqual([storedCalls(), readCalls()], [1, 0]);
  // kept: the second time OpenWA is not asked; as a download it is the same bytes under the file's name
  const again = await media(q(chat, `false_${chat}_M1`, '&download=1'));
  assert.deepEqual([again.status, again.type, again.disposition, storedCalls()], [200, 'application/octet-stream', "attachment; filename*=UTF-8''photo.jpg", 1]);
  assert(again.bytes.equals(jpeg));

  // messages fetched while catching up: OpenWA has no copy; the chat is read once with its media, for all of them
  gw.history.set(lid, [
    { id: `false_${lid}_V1`, chatId: lid, type: 'voice', body: '', timestamp: 1795200001, fromMe: false, media: { mimetype: 'audio/ogg; codecs=opus', data: ogg.toString('base64') } },
    { id: `true_${lid}_D1`, chatId: lid, type: 'document', body: 'the offer', timestamp: 1795200002, fromMe: true, media: { mimetype: 'application/pdf', filename: '报价 2026.pdf', data: pdf.toString('base64') } },
    { id: `false_${lid}_X1`, chatId: lid, type: 'image', body: '', timestamp: 1795200003, fromMe: false, media: { mimetype: 'image/png', filename: 'picture.png', data: page.toString('base64') } },
    { id: `false_${lid}_T1`, chatId: lid, type: 'text', body: 'no media here', timestamp: 1795200004, fromMe: false },
  ]);
  const [voice, doc] = await Promise.all([media(q(lid, `false_${lid}_V1`)), media(q(lid, `true_${lid}_D1`))]);
  assert.deepEqual([voice.status, voice.type, voice.disposition], [200, 'audio/ogg', 'inline']);
  assert(voice.bytes.equals(ogg));
  assert.deepEqual([doc.status, doc.type, doc.disposition], [200, 'application/octet-stream', `attachment; filename*=UTF-8''${encodeURIComponent('报价 2026.pdf')}`], 'a document is a download under its own name');
  assert(doc.bytes.equals(pdf));
  assert.equal(readCalls(), 1, 'two files of one chat asked for at the same time: one read');
  // a file that is not what it is called is never shown inside the page
  const fake = await media(q(lid, `false_${lid}_X1`));
  assert.deepEqual([fake.status, fake.type, fake.disposition, fake.nosniff, readCalls()], [200, 'application/octet-stream', "attachment; filename*=UTF-8''picture.png", 'nosniff', 1]);
  assert(fake.bytes.equals(page));

  // nothing to be had: said so, and OpenWA is not asked again for a while
  const none = await call('/api/wa/media?' + q(lid, `false_${lid}_T1`), { cookie: lin });
  assert.deepEqual([none.status, none.json, readCalls()], [404, { error: 'media-unavailable' }, 2]);
  const calls = gw.calls.length;
  assert.equal((await call('/api/wa/media?' + q(lid, `false_${lid}_T1`), { cookie: lin })).status, 404);
  assert.equal(gw.calls.length, calls, 'not asked again at once');
  clock += 11 * 60 * 1000;
  assert.equal((await call('/api/wa/media?' + q(lid, `false_${lid}_T1`), { cookie: lin })).status, 404);
  assert(gw.calls.length > calls, 'asked again later');

  // who may ask, and for what
  assert.deepEqual((await call('/api/wa/media?' + q(chat, `false_${chat}_M1`))).json, { error: 'not-signed-in' });
  const outsider = await member('ines', 'agent', 'elsewhere'), reader = await member('rita', 'supervisor', null);
  assert.equal((await call('/api/wa/media?' + q(chat, `false_${chat}_M1`), { cookie: outsider })).status, 403);
  assert.equal((await media(q(chat, `false_${chat}_M1`), reader)).status, 200, 'a supervisor may look at media');
  for (const bad of ['account=a7&chat=120363000000000000%40g.us&id=x_1', `account=a%2F7&chat=${chat}&id=false_1`, `account=a7&chat=${chat}`, `account=a7&chat=${chat}&id=..%2F..%2Fetc%2Fpasswd`]) {
    assert.deepEqual((await call('/api/wa/media?' + bad, { cookie: lin })).json, { error: 'invalid-request' }, bad);
  }
  assert.deepEqual((await call(`/api/wa/media?account=a9&chat=${chat}&id=false_${chat}_M9`, { cookie: lin })).json, { error: 'unknown-account' });

  // OpenWA out of reach: said so; what was kept is still handed out, also after the number is unlinked
  useSettings({ ...good(), OPENWA_BASE_URL: 'http://127.0.0.1:9/' });
  const down = await call('/api/wa/media?' + q(chat, `false_${chat}_M2`), { cookie: lin });
  assert.deepEqual([down.status, down.json], [502, { error: 'gateway-unreachable' }]);
  assert.equal((await media(q(chat, `false_${chat}_M1`))).status, 200);
  useSettings(good());
  assert.equal((await post('/api/wa/unlink', { account: 'a7' })).status, 200);
  assert.equal((await media(q(lid, `false_${lid}_V1`))).status, 200, 'kept media outlives the link');
  assert.deepEqual((await call('/api/wa/media?' + q(chat, `false_${chat}_M2`), { cookie: lin })).json, { error: 'unknown-account' });

  // the folder of kept files is private
  const folder = path.join(tmp, 'main', 'wa-media-s1'), kept = fs.readdirSync(folder);
  assert.deepEqual([kept.filter(f => f.endsWith('.bin')).length, kept.filter(f => f.endsWith('.json')).length], [4, 4]);
  assert.equal(fs.statSync(folder).mode & 0o077, 0);
  assert(kept.every(f => (fs.statSync(path.join(folder, f)).mode & 0o077) === 0 && /^[0-9a-f]{64}\.(bin|json)$/.test(f)));
});

test('what kind of media some bytes are is told by how they begin', () => {
  const kind = (head, declared) => openwaLink.mediaKind(Buffer.concat([Buffer.from(head), Buffer.alloc(32)]), declared);
  assert.deepEqual([
    kind([0xff, 0xd8, 0xff, 0xe1]), kind([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), kind('GIF89a'), kind('RIFF\0\0\0\0WEBPVP8 '), kind('RIFF\0\0\0\0WAVEfmt '),
    kind('OggS'), kind('ID3\x04'), kind([0xff, 0xfb, 0x90]), kind([0xff, 0xf1, 0x50]), kind('\0\0\0\x20ftypisom'), kind('\0\0\0\x20ftypisom', 'audio/mp4'), kind('\0\0\0\x20ftypM4A '),
    kind([0x1a, 0x45, 0xdf, 0xa3]), kind([0x1a, 0x45, 0xdf, 0xa3], 'audio/webm'),
  ], ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/wav', 'audio/ogg', 'audio/mpeg', 'audio/mpeg', 'audio/aac', 'video/mp4', 'audio/mp4', 'audio/mp4', 'video/webm', 'audio/webm']);
  for (const other of ['%PDF-1.7', '<!doctype html>', '<svg xmlns="http://www.w3.org/2000/svg">', 'PK\x03\x04', 'MZ\x90\0']) assert.equal(kind(other, 'image/png'), null, other);
  assert.equal(openwaLink.mediaKind(Buffer.from([0xff, 0xd8, 0xff])), null, 'too short to tell');
});

test('unlinking removes the session at OpenWA and the record; later deliveries of it are dropped', async () => {
```

**Verify**: `sha256sum work/wa-replica/openwa-link.cjs work/wa-replica/openwa-link.test.cjs` → `6f0bab2c77d3c3b2e20426db9a731fff72e124f1ef8e8fcd4dc56790181ff735`, `1568503d07d4294a7bbf08de59f1d0fbfd75bfaedad87598b3b6b381907a36b7`; `node --check work/wa-replica/openwa-link.cjs && node --check work/wa-replica/openwa-link.test.cjs && echo SYNTAX_OK` → `SYNTAX_OK`; the link tests → `pass 18`, `fail 0`. If a checksum does not match, restore the file with `git checkout 8de8740 -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 3: The page: media in the message bubble

#### `fidelity-openwa.js`

**Edit 3.1** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text

  // The mark after the time of a message the employee sent.
```

Replace them with:

```text

  // ---- the media of a message ----
  // How a kind of message shows its media: a picture, a player, or a link to the file.
  const openwaMediaShown = { image: 'image', sticker: 'image', video: 'video', audio: 'audio', voice: 'audio', document: 'file' };
  // The address of a message's media at this server; '' when the message has none or its chat is not known.
  // c is the customer, or a record of the chat archive that names one.
  function openwaMediaUrl(c, m) {
    const owner = c.waChat ? c : customer(c.customerId);
    if (!m.wa || !openwaMediaShown[m.type] || !owner?.waChat || !owner.account) return '';
    return '/api/wa/media?account=' + encodeURIComponent(owner.account) + '&chat=' + encodeURIComponent(owner.waChat) + '&id=' + encodeURIComponent(m.wa);
  }
  // What a message shows above its text. A picture opens in a new tab; a file is a download.
  function openwaMediaHTML(c, m) {
    const url = esc(openwaMediaUrl(c, m)), shown = openwaMediaShown[m.type];
    if (!url) return '';
    if (shown === 'image') return `<a class="openwa-media" href="${url}" target="_blank" rel="noopener" aria-label="在新标签页查看${m.type === 'sticker' ? '贴图' : '图片'}"><img src="${url}" alt="${m.type === 'sticker' ? '贴图' : '图片'}" loading="lazy"></a>`;
    if (shown === 'video') return `<div class="openwa-media"><video src="${url}" controls preload="none" aria-label="视频"></video></div>`;
    if (shown === 'audio') return `<div class="openwa-media"><audio src="${url}" controls preload="none" aria-label="语音"></audio></div>`;
    return `<a class="openwa-file" href="${url}&amp;download=1" download>${icon('FileDown')}<span>${esc(m.file || '文件')}</span></a>`;
  }
  // The text under the media: the words that only stood for the media ("[图片]") are left out when it is shown.
  const openwaCaption = (c, m) => (openwaMediaUrl(c, m) && m.text === openwaMediaText[m.type] ? '' : m.text);
  // Media that cannot be had — gone from the phone, or the number is not connected — gives way to a short note.
  document.addEventListener('error', event => {
    const el = event.target, holder = el.closest?.('.openwa-media');
    if (!holder || !['IMG', 'VIDEO', 'AUDIO'].includes(el.tagName)) return;
    const note = document.createElement('span');
    note.className = 'openwa-media-missing';
    note.textContent = (el.tagName === 'IMG' ? '图片' : el.tagName === 'VIDEO' ? '视频' : '语音') + '暂时无法加载';
    holder.replaceWith(note);
  }, true);
  // Drawing a conversation again must not stop a voice note or a video that is playing: its element takes the
  // place of its redrawn twin. Every full redraw goes through here; so does the AI module's own redraw.
  function openwaKeepPlaying(draw) {
    const playing = [...document.querySelectorAll('#messages audio, #messages video')].filter(media => !media.paused && !media.ended);
    draw();
    for (const media of playing) {
      const twin = [...document.querySelectorAll('#messages ' + media.tagName.toLowerCase())].find(x => x.getAttribute('src') === media.getAttribute('src'));
      if (twin) twin.replaceWith(media);
    }
  }
  const openwaDraw = render;
  render = function() {
    openwaKeepPlaying(openwaDraw);
  };

  // The mark after the time of a message the employee sent.
```

**Edit 3.2** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    }
    const message = { id: nextId('m'), side: e.fromMe ? 'out' : 'in', text, time: openwaClock(e.at), at: e.at, wa: e.id, type: e.type, ...(e.fromMe ? { status: 'sent' } : {}) };
    list.push(message);
```

Replace them with:

```text
    }
    const message = { id: nextId('m'), side: e.fromMe ? 'out' : 'in', text, time: openwaClock(e.at), at: e.at, wa: e.id, type: e.type, ...(e.media?.name ? { file: e.media.name } : {}), ...(e.fromMe ? { status: 'sent' } : {}) };
    list.push(message);
```

#### `fidelity-ai.js`

**Edit 3.3** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
      const atBottom = box.scrollHeight - box.clientHeight - box.scrollTop <= 40;
      box.innerHTML = messagesHTML(c);
      paintIcons(box);
```

Replace them with:

```text
      const atBottom = box.scrollHeight - box.clientHeight - box.scrollTop <= 40;
      openwaKeepPlaying(() => {
        box.innerHTML = messagesHTML(c);
      });
      paintIcons(box);
```

#### `fidelity.css`

**Append 3.4** — `work/wa-replica/fidelity.css`. Add at the end of the file, after one empty line:

```text
/* The media of a message (plan 033): a picture, a player or a link to the file, above the message's text. */
.openwa-media { display:block; max-width:280px; margin:0 0 6px; }
.openwa-media img { display:block; max-width:100%; max-height:320px; border-radius:8px; object-fit:contain; }
.openwa-media video { display:block; width:280px; max-width:100%; max-height:320px; border-radius:8px; background:var(--color-surface); }
.openwa-media audio { display:block; width:260px; max-width:100%; height:40px; }
.openwa-file { display:inline-flex; align-items:center; gap:8px; max-width:280px; margin:0 0 6px; padding:8px 10px; border:1px solid var(--color-border); border-radius:8px; background:var(--color-surface); color:inherit; text-decoration:none; }
.openwa-file:hover { border-color:var(--color-accent); }
.openwa-file span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.openwa-file svg { flex:none; width:18px; height:18px; }
.openwa-media-missing { display:block; margin:0 0 6px; color:var(--color-text-muted); font-size:12px; }
.message-bubble>.openwa-media:last-child,.message-bubble>.openwa-file:last-child,.message-bubble>.openwa-media-missing:last-child { margin-bottom:0; }
```

#### `build-fidelity.cjs`

**Edit 3.5** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
assert(!/演示|原型|评审|本机|示例|体验/.test(js), 'the app must not speak of a demonstration, a prototype or a review');
new vm.Script(js, {filename:'app.js'});
```

Replace them with:

```text
assert(!/演示|原型|评审|本机|示例|体验/.test(js), 'the app must not speak of a demonstration, a prototype or a review');
// A message shows its picture, voice note, video or file (plan 033): fidelity-openwa.js gives the bubble its
// media and the text under it.
swap(`<div class="message-bubble"><div class="message-text">'+esc(m.text)+'</div>'`, `<div class="message-bubble">'+openwaMediaHTML(c,m)+(openwaCaption(c,m)?'<div class="message-text">'+esc(openwaCaption(c,m))+'</div>':'')`);
new vm.Script(js, {filename:'app.js'});
```

#### `validate-scrm-lifecycle.cjs`

**Edit 3.6** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text

// 22. The page uses the real WhatsApp connection through its own server; nothing simulates it any more
for (const required of ["fetch('/api/wa/' + path, {", "openwaCall('POST', 'link', pair.expired ? { account: pair.accountId, fresh: true } : { account: pair.accountId })", 'const openwaQrLife = 90000;', "openwaCall('POST', 'claim', { client: openwaClient })", 'events?after=${Number(data.waCursor) || 0}&client=${openwaClient}&wait=${caughtUp ? 25 : 0}', "openwaCall('POST', 'send', {", "requestId: message.request", "window.WA_SITE.halt('已在其他页面打开'", "if (e.kind === 'chat') {", 'function openwaJoinTwins() {', "if (!c && e.kind === 'message' && e.fromMe) {", 'if (!e.fromMe && !e.history) {', 'send = function() {', "document.addEventListener('compositionstart'"]) {
```

Replace them with:

```text

// 22. The page uses the real WhatsApp connection through its own server; nothing simulates it any more.
// A message shows its picture, voice note, video or file through the server's media route.
for (const required of ['function openwaMediaUrl(c, m) {', "'/api/wa/media?account=' + encodeURIComponent(owner.account)", 'function openwaMediaHTML(c, m) {', 'function openwaKeepPlaying(draw) {', "...(e.media?.name ? { file: e.media.name } : {})"]) {
  assert(openwaSource.includes(required), `fidelity-openwa.js is missing ${required}`);
}
assert(appJs.includes("<div class=\"message-bubble\">'+openwaMediaHTML(c,m)+(openwaCaption(c,m)?"), 'a message bubble must show its media and the text under it');
assert(read(path.join(__dirname, 'fidelity-ai.js')).includes('openwaKeepPlaying(() => {'), 'the redraw after a translation must keep a playing voice note');
for (const required of ["fetch('/api/wa/' + path, {", "openwaCall('POST', 'link', pair.expired ? { account: pair.accountId, fresh: true } : { account: pair.accountId })", 'const openwaQrLife = 90000;', "openwaCall('POST', 'claim', { client: openwaClient })", 'events?after=${Number(data.waCursor) || 0}&client=${openwaClient}&wait=${caughtUp ? 25 : 0}', "openwaCall('POST', 'send', {", "requestId: message.request", "window.WA_SITE.halt('已在其他页面打开'", "if (e.kind === 'chat') {", 'function openwaJoinTwins() {', "if (!c && e.kind === 'message' && e.fromMe) {", 'if (!e.fromMe && !e.history) {', 'send = function() {', "document.addEventListener('compositionstart'"]) {
```

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity-ai.js work/wa-replica/fidelity.css work/wa-replica/build-fidelity.cjs work/wa-replica/validate-scrm-lifecycle.cjs` → `852d466c4e00d5a2306c6df3f18520b8e2f52fe2b1ff624c61ccdc34484e4e96`, `9e2f034205bc97ee2b8e96cc21dc7d622d8459d24d282da42650ecdc6d81372f`, `13fc74c1bd872062adc29a8c8b4ccf001cab909149752c0533354e668d5d9d79`, `c6db2f6a821d40c848475d670b990b1b1eb2f897a61b8c09d55cf70429c4da3b`, `d9365f572db0a68f4f704ab9df71cf94a2e48615c2ef4166f2c699b2fb0cd5b2`; the syntax command → `SYNTAX_OK`; `git checkout 8de8740 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; the icon-set command → `removed= added=`; `sha256sum outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/app.css` → `6e8d4ccb8ce0437d04756439eb2edaf066884b249a91a805fd7856d0e2ca6d05`, `f19fd14bce855d263f32febda35d9cdb9522b59a25db4cc74250a9f02713f75e`.

### Step 4: README, build log, final verification

**Edit 4.1** — `README.md`. Find exactly these lines (they occur once):

```text

### 重新编译与完整性校验
```

Replace them with:

```text

消息里的图片、语音、视频和文件由服务器按需从 OpenWA 取回（`/api/wa/media`，只对已登录用户开放），首次取回后保存在数据目录的 `wa-media-<子站>` 文件夹中，之后直接读取；这个文件夹可以随时清空，需要时会重新取回。只有内容确实是图片、音频或视频的文件才会在页面内显示，其余一律作为下载提供。

### 重新编译与完整性校验
```

**Edit 4.2** — `README.md`. Find exactly these lines (they occur once):

```text
│       ├── fidelity-dashboard.js / .css               # 首页经营概览与跟进闭环概览
│       ├── fidelity-openwa.js                         # 真实 WhatsApp 连接：扫码绑定、事件流（来信、回执、号码状态）、发送与重试
│       ├── fidelity-ai.js                             # AI 能力接入点：能力清单、服务器中转、回复翻译与发送保护、用量记录与「AI 能力」页
```

Replace them with:

```text
│       ├── fidelity-dashboard.js / .css               # 首页经营概览与跟进闭环概览
│       ├── fidelity-openwa.js                         # 真实 WhatsApp 连接：扫码绑定、事件流（来信、回执、号码状态）、发送与重试、消息中的图片/语音/视频/文件
│       ├── fidelity-ai.js                             # AI 能力接入点：能力清单、服务器中转、回复翻译与发送保护、用量记录与「AI 能力」页
```

**Edit 4.3** — `README.md`. Find exactly these lines (they occur once):

```text
│       ├── ai.env.example                             # AI 设置文件示例（填写后的副本放在仓库之外）
│       ├── openwa-link.cjs / openwa-link.test.cjs     # 子站与其专属 OpenWA 的连接接口（会话、二维码、事件通知、发送）及其测试
│       ├── openwa.env.example                         # OpenWA 连接设置文件示例（填写后的副本放在仓库之外）
```

Replace them with:

```text
│       ├── ai.env.example                             # AI 设置文件示例（填写后的副本放在仓库之外）
│       ├── openwa-link.cjs / openwa-link.test.cjs     # 子站与其专属 OpenWA 的连接接口（会话、二维码、事件通知、发送、消息媒体）及其测试
│       ├── openwa.env.example                         # OpenWA 连接设置文件示例（填写后的副本放在仓库之外）
```

**Append 4.4** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 会话中显示图片、语音、视频和文件 · 2026-11-22

此前非文字消息只显示「[图片]」「[语音]」「[文件]」等占位文字。现在：图片和贴图直接显示在消息气泡里（点击在新标签页查看原图），语音和视频带播放器，文件显示文件名并可下载；带文字说明的媒体，文字显示在媒体下方；取不到的媒体显示「暂时无法加载」。正在播放的语音或视频不会因为新消息到达而中断。

服务器新增 `/api/wa/media`：先取 OpenWA 在消息收发时保存的副本；同步进来的历史消息没有副本，则把该会话最近 50 条消息连同媒体重新读取一次，并把读到的全部媒体保存在数据目录的 `wa-media-<子站>` 文件夹，之后不再重复读取。出于安全考虑，服务器只按文件开头的字节判断类型：确认是图片、音频或视频才允许在页面内显示，其余（包括文档和任何与声明类型不符的文件）一律以下载方式提供，并附带禁止浏览器猜测类型的响应头。聊天记录归档中的消息同样显示媒体。
```

Then verify everything once more:

```bash
git checkout 8de8740 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && env -u WA_SCRM_OPENWA_ENV -u WA_SCRM_OPENWA_SYNC_MS -u WA_SCRM_OPENWA_SYNC_PAUSE_MS -u WA_SCRM_OPENWA_MEDIA_TIMEOUT_MS $NODE --test work/wa-replica/openwa-link.test.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-033/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test runs end with `pass 18` and `pass 12`, `fail 0` each; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `5b0e3ab1d57e36b8a6434950494ca00c568589574d478b7793a8cb056e1a027f`, `a172ff2c1cdf279d690c9e4d9396c2fab05d35c4be1291fe2e4e21da64aa3b1f`; `git status --porcelain` lists exactly twelve paths: `README.md`, `replica/build-log.md`, the seven source files under `work/wa-replica/`, and `outputs/wa-replica-prototype/app.js`, `app.css` and `validation.json` (if `outputs/wa-replica-prototype/icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **`work/wa-replica/openwa-link.test.cjs`** — two new tests (18 in all). The first covers the route against the stand-in: the stored copy (type, headers, bytes); the second time without asking OpenWA; the download form; fetched messages read once for a whole chat, also when two files are asked for at the same time; a document as a download under its own (non-ASCII) name; a file that calls itself a picture but is not, as a download; nothing to be had → 404, not asked again at once, asked again after the waiting time; no sign-in → 401, a member of another sub-site → 403, a supervisor may read; invalid chat, account and id; an unknown number; OpenWA out of reach → 502 while kept files are still handed out, also after the number is unlinked; the folder and its files are private. The second covers `mediaKind`: every kind it knows, and that a PDF, HTML, SVG, ZIP and program are none.
- **Validator** — the page module has the media functions, the built bubble uses them, the AI module's redraw keeps a playing voice note.
- **Smoke** (`/tmp/wa-scrm-plan-033/smoke.sh`) — the same facts on the sources and the built files, the README, the tests.
- **Verified by the reviewer in scripted browser sessions, not by you**: a picture with and without words, a voice note, a document and a video arrive and show; the document downloads under its name; a picture that cannot be had and a file that only calls itself a picture give way to the note; what is stored for each message; a playing voice note goes on playing when another message arrives; media of a conversation fetched from the phone is read from OpenWA once and kept; the sessions of the rest of the product and of the connection still pass. And once more against the owner's real number, read-only.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 8de8740 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] the link tests → `pass 18`, `fail 0`; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-033/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/openwa-link.cjs` → `6f0bab2c77d3c3b2e20426db9a731fff72e124f1ef8e8fcd4dc56790181ff735`
- [ ] `sha256sum work/wa-replica/openwa-link.test.cjs` → `1568503d07d4294a7bbf08de59f1d0fbfd75bfaedad87598b3b6b381907a36b7`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js` → `852d466c4e00d5a2306c6df3f18520b8e2f52fe2b1ff624c61ccdc34484e4e96`
- [ ] `sha256sum work/wa-replica/fidelity-ai.js` → `9e2f034205bc97ee2b8e96cc21dc7d622d8459d24d282da42650ecdc6d81372f`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `13fc74c1bd872062adc29a8c8b4ccf001cab909149752c0533354e668d5d9d79`
- [ ] `sha256sum work/wa-replica/build-fidelity.cjs` → `c6db2f6a821d40c848475d670b990b1b1eb2f897a61b8c09d55cf70429c4da3b`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `d9365f572db0a68f4f704ab9df71cf94a2e48615c2ef4166f2c699b2fb0cd5b2`
- [ ] `sha256sum README.md` → `5b0e3ab1d57e36b8a6434950494ca00c568589574d478b7793a8cb056e1a027f`
- [ ] `sha256sum replica/build-log.md` → `a172ff2c1cdf279d690c9e4d9396c2fab05d35c4be1291fe2e4e21da64aa3b1f`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `6e8d4ccb8ce0437d04756439eb2edaf066884b249a91a805fd7856d0e2ca6d05`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `f19fd14bce855d263f32febda35d9cdb9522b59a25db4cc74250a9f02713f75e`
- [ ] the icon-set command prints `removed= added=`
- [ ] `git diff --name-only 8de8740..HEAD -- . ':!plans'` lists exactly these twelve: `README.md`, `outputs/wa-replica-prototype/app.css`, `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/build-fidelity.cjs`, `work/wa-replica/fidelity-ai.js`, `work/wa-replica/fidelity-openwa.js`, `work/wa-replica/fidelity.css`, `work/wa-replica/openwa-link.cjs`, `work/wa-replica/openwa-link.test.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- A test fails, the build fails or reports another number of icons than 84, or the validator fails.
- An output file other than `app.js`, `app.css` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file or contacting a real OpenWA.

## Maintenance notes

- **Deployment**: `openwa-link.cjs` changes, so the live service must be restarted after the merge (the reviewer does that). The event feed is unchanged; pages that are open keep working and show media after their next refresh.
- **Disk**: the folder `wa-media-<site>` in the data folder grows with what employees look at (a file is at most 50 MB). Nothing removes files; watch the folder on a busy sub-site, and empty it when needed — files are fetched again as long as WhatsApp still has them.
- **A proxy in front of the server** must let answers of up to 50 MB through and wait up to a minute for the first fetch of a large file.
- A file is shown inside the page only when `mediaKind` recognises its first bytes. Adding a kind there is a security decision: never add a type a browser can run scripts from (HTML, SVG, XML, PDF).
- Seeking in a long video or audio file needs partial answers, which this route does not give; voice notes play without them.
- What a reviewer should scrutinise: that no path on disk is built from a request value (the names are SHA-256 hashes), that an answer is never typed by what the sender declared, and that the route cannot be used without a sign-in.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
