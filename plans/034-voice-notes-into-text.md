# Plan 034: A voice note is turned into text on a click

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 732a801..HEAD -- work/wa-replica replica/build-log.md outputs README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM (a paid outside service is called with customers' voice notes; exact text and checksums for every edit; who may call it, what is sent and how often are tested)
- **Depends on**: plans/033-media-in-messages.md (DONE)
- **Category**: feature (one of the AI functions the owner chose: voice transcription)
- **Planned at**: commit `732a801`, 2026-11-22

## Why this matters

Customers send voice notes. An employee who reads but does not understand the customer's language — the reason this workbench translates messages — cannot do anything with a voice note, and even one who understands has to listen to each of them. The owner chose voice transcription as one of the AI functions of the product (2026-11-21) and has filled in a speech service in the server's AI settings. Since plan 033 a voice note has a player in the conversation; this plan puts its words under the player.

What this plan builds:

- **A button "转文字" under every voice note and sound file** of the open conversation. A click asks the server for the words; while it works the button says "正在转文字…"; then the words stand under the player and stay on the message. The words of a voice note **the customer sent** are then translated like an incoming text message (the existing capability "接收消息翻译" and its switch decide that).
- **Server**: `POST /api/wa/transcribe { account, chat, id }` in the WhatsApp link, for the sub-site's employee only. It takes the voice note from where plan 033 keeps media (fetching it first when needed), makes sure by its first bytes that it is sound, and hands it to the speech service through a new function of the AI relay — the relay stays the only code that reads service keys. The words are kept in the note beside the kept file, so **a voice note is paid for once**: asking again returns the kept words, and two requests at the same time share one call. No speech in it → 422; the service fails → 502; nothing is kept in either case.
- **Settings**: the speech service comes from the same settings file as the model service: `VOICE_PROVIDER` (`openai`, `groq` or `other`), `VOICE_API_KEY`, optionally `VOICE_BASE_URL` and `VOICE_MODEL`. `GET /api/ai/status` gains a field `voice` that says whether it is configured, with the service's name and model — never a key.
- **AI page**: a capability "语音转文字" in the list (its own switch, its usage records and totals like the others) and a line "语音服务". With the capability switched off, or without a speech service, there is no button.

### Tried against the owner's speech service before this plan was written

With the settings the owner filled in (service OpenAI), a two-second test tone without speech was sent once to `/audio/transcriptions` as a form with the fields `file`, `model` and `response_format=json`: the model `gpt-4o-mini-transcribe` answered 200 in about a second with `{ text, usage }` and an empty text. That model is the default for `openai` here.

### Decisions already made (do not re-open; do not ask)

- **On a click only.** Whether new voice notes should be transcribed by themselves is the owner's decision and has been asked; this plan does not build it.
- The employee asks; a supervisor, who only reads, cannot start a paid call.
- The words are kept on the server beside the media file and on the message; there is no way to transcribe a voice note a second time.
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/ai-relay.cjs` | `94675fa4be384fe3c9c44d8969efbd6242b36dadadf2704338c42651c18c57c0` | `d597bb72854be3da4a22dca66229b41418c6316fb5295938a1989fd6e5177723` |
| `work/wa-replica/ai-relay.test.cjs` | `b986b157f6e64feac322a6855117421d715a3888bbfa8ca4724440b8f53f311c` | `de997c3d3587c1373823ef3b0c5da6abe5a340c5a472d61a20b38096e1643ab7` |
| `work/wa-replica/ai.env.example` | `d7f178993d0855cd9469caad0410991b19501d32308b296342d737897fb8eee1` | `111229c9a52b72c6838b0778ed20756e2295d490226a1ac7a3b3bec75e1eba58` |
| `work/wa-replica/openwa-link.cjs` | `6f0bab2c77d3c3b2e20426db9a731fff72e124f1ef8e8fcd4dc56790181ff735` | `f03d6c573955424982e4a453eb211de3d35c9b7afc07f76f3a16401e274dc300` |
| `work/wa-replica/openwa-link.test.cjs` | `1568503d07d4294a7bbf08de59f1d0fbfd75bfaedad87598b3b6b381907a36b7` | `bb3ecef7f693bee6fa8a60b809ef6cea8c768f51746ea1fafdf43eb8a7051823` |
| `work/wa-replica/site-api.test.cjs` | `5c5e897854c553634d3ddd31969d1ba7c1bd7949e5f023e5055da93ab05455f6` | `02efa1bdedc6e9d442d793ae59624b599d9cba1fb42ffd4824436e8d2a6a0b7a` |
| `work/wa-replica/fidelity-ai.js` | `9e2f034205bc97ee2b8e96cc21dc7d622d8459d24d282da42650ecdc6d81372f` | `46fdac3f5d922c750aa73c44bd1e25b9fbc09084df0407f73edc71b89bb86bcc` |
| `work/wa-replica/fidelity-openwa.js` | `852d466c4e00d5a2306c6df3f18520b8e2f52fe2b1ff624c61ccdc34484e4e96` | `0ce054008d4b937c3a17ec8d139dbf1d976c82252284877d6feff39a71e7c4c0` |
| `work/wa-replica/fidelity.css` | `13fc74c1bd872062adc29a8c8b4ccf001cab909149752c0533354e668d5d9d79` | `3ee213d26d511b033fa87ea5fac95109c5d3ccf6d688c13134735c44af7f462c` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `d9365f572db0a68f4f704ab9df71cf94a2e48615c2ef4166f2c699b2fb0cd5b2` | `9a195bc284b9fc7a65fe4a6891bdcdd81dbc1cf3d607416eacc48dba85b98bfc` |
| `README.md` | `5b0e3ab1d57e36b8a6434950494ca00c568589574d478b7793a8cb056e1a027f` | `26112fb57517c2c743a6f0e9c2733e3f3f9966563187639cf03f6d9c1bfa901b` |

- `ai-relay.cjs` — the AI relay: reads the settings file named by `WA_SCRM_AI_ENV` (`loadConfig`), answers `/api/ai/status`, `/api/ai/translate` and `/api/ai/reply`. It is the only code that reads a service key; it never logs a key or message text (the validator checks its log lines: a log line must not contain `.text` other than `.text.length`). It gets `loadVoiceConfig` and `transcribeAudio`, and the status gets the field `voice`.
- `ai-relay.test.cjs` — its tests (12) with a stand-in model service; the stand-in learns the speech endpoint, three tests follow the new field of the status, one test is added (13).
- `ai.env.example` — the settings template; the voice entries are added.
- `site-api.test.cjs` — the sign-in and data tests (12); one of them compares the whole answer of `/api/ai/status` and follows its new field. `site-api.cjs` itself is not changed.
- `openwa-link.cjs` — the server's link to OpenWA. Since plan 033: `mediaKept(key)` reads a kept file with its note (`{ mime, name }`), `mediaFetch` fetches one from OpenWA, `mediaKind(bytes, declared)` tells by the first bytes what a file is, the route `GET /api/wa/media` hands a file out. `employee(req)` lets only the sub-site's employee through. The body of the media route is split so that the new route can use the same way of finding a file.
- `openwa-link.test.cjs` — its tests (18) with a stand-in OpenWA; a stand-in speech service and one test are added (19).
- `fidelity-ai.js` — the page module of the AI capabilities: the list `AI_CAPABILITIES`, `aiRun(capabilityId, input, meta)` (the single entry point; it records usage and never rejects), the AI page. `fidelity-openwa.js` draws the media of a message (`openwaMediaHTML`).
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources; two expectations and two entries of its record follow the changed code, and one block is added.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 732a801 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Syntax of the two page modules | `node -e "for(const f of ['fidelity-ai.js','fidelity-openwa.js'])new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/'+f,'utf8')+'})');console.log('SYNTAX_OK')"` | `SYNTAX_OK` |
| Relay tests | `env -u WA_SCRM_AI_ENV -u WA_SCRM_AI_VOICE_TIMEOUT_MS $NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 13`, `fail 0` (12 before this plan) |
| Link tests | `env -u WA_SCRM_OPENWA_ENV -u WA_SCRM_AI_ENV -u WA_SCRM_OPENWA_SYNC_MS -u WA_SCRM_OPENWA_SYNC_PAUSE_MS -u WA_SCRM_OPENWA_MEDIA_TIMEOUT_MS -u WA_SCRM_AI_VOICE_TIMEOUT_MS $NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 19`, `fail 0` (18 before this plan) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 12`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-034/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |
| Icon set | `node -e "const vm=require('vm'),fs=require('fs'),cp=require('child_process');const keys=s=>{const w={};vm.runInNewContext(s,{window:w});return Object.keys(w.WA_ICONS)};const a=keys(cp.execSync('git show 732a801:outputs/wa-replica-prototype/icons.js').toString()),b=keys(fs.readFileSync('outputs/wa-replica-prototype/icons.js','utf8'));console.log('removed='+a.filter(x=>!b.includes(x)).join(',')+' added='+b.filter(x=>!a.includes(x)).join(','))"` | `removed= added=` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/ai-relay.cjs`, `ai-relay.test.cjs`, `ai.env.example`, `openwa-link.cjs`, `openwa-link.test.cjs`, `site-api.test.cjs` (Step 2)
- `work/wa-replica/fidelity-ai.js`, `fidelity-openwa.js`, `fidelity.css`, `validate-scrm-lifecycle.cjs` (Step 3)
- `README.md`, `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{app.js,app.css,validation.json}` (the other output files must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular `serve.cjs`, `site-api.cjs`, `site-auth.cjs`, `site-data.cjs`, `site-admin.cjs`, `build-fidelity.cjs`, `fidelity-boot.js`, the other modules, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`; any real OpenWA, any real speech or model service, any settings file with a key, any data folder.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/034-voice-notes-into-text` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): turn a voice note into text on a click`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each change, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the eleven source files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-034/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-034 && cat > /tmp/wa-scrm-plan-034/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that a voice note can be turned into text on a click: the relay's speech function, the link's route, their
# tests, the built page, the settings template and the README.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'the relay turns speech into text' "$W/ai-relay.cjs" 'async function transcribeAudio(bytes, kind) {'
has 'the relay reads the voice settings' "$W/ai-relay.cjs" 'function loadVoiceConfig() {'
has 'the link has the route for the words of a voice note' "$W/openwa-link.cjs" "'POST /api/wa/transcribe': transcribe,"
has 'the words are kept beside the file' "$W/openwa-link.cjs" 'function mediaKeepText(key, { mime, name }, transcript) {'
has 'the built page lists the capability' "$P/app.js" "{ id: 'voice.transcribe', name: '语音转文字',"
has 'the built page asks the server for the words' "$P/app.js" "fetch('/api/wa/transcribe', {"
has 'a voice note shows its words or the button' "$P/app.js" 'aria-label="语音"></audio></div>` + aiTranscriptHTML(c, m);'
has 'the built styles know the button' "$P/app.css" '.ai-transcribe'
has 'the settings template names the voice service' "$W/ai.env.example" 'VOICE_PROVIDER='
has 'the README says what leaves the server' "$ROOT/README.md" '语音转文字——仅当配置了语音服务且员工点击「转文字」时'
same 'the server files pass the syntax check' "$(for f in ai-relay.cjs ai-relay.test.cjs openwa-link.cjs openwa-link.test.cjs; do node --check "$W/$f" 2>&1 || echo "bad $f"; done; echo ok)" ok
same 'the page modules pass the syntax check' "$(cd "$ROOT" && node -e "for(const f of ['fidelity-ai.js','fidelity-openwa.js'])new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/'+f,'utf8')+'})');console.log('SYNTAX_OK')" 2>&1)" SYNTAX_OK
same 'the relay tests pass, with the one for speech' "$(env -u WA_SCRM_AI_ENV -u WA_SCRM_AI_VOICE_TIMEOUT_MS "$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 13 ℹ fail 0 '
same 'the link tests pass, with the one for the words of a voice note' "$(env -u WA_SCRM_OPENWA_ENV -u WA_SCRM_AI_ENV -u WA_SCRM_OPENWA_SYNC_MS -u WA_SCRM_OPENWA_SYNC_PAUSE_MS -u WA_SCRM_OPENWA_MEDIA_TIMEOUT_MS -u WA_SCRM_AI_VOICE_TIMEOUT_MS "$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 19 ℹ fail 0 '
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-034/smoke.sh && ls -l /tmp/wa-scrm-plan-034/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/ai-relay.cjs work/wa-replica/ai-relay.test.cjs work/wa-replica/ai.env.example work/wa-replica/openwa-link.cjs work/wa-replica/openwa-link.test.cjs work/wa-replica/site-api.test.cjs work/wa-replica/fidelity-ai.js work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs README.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-034/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the relay turns speech into text`, `the relay reads the voice settings`, `the link has the route for the words of a voice note`, `the words are kept beside the file`, `the built page lists the capability`, `the built page asks the server for the words`, `a voice note shows its words or the button`, `the built styles know the button`, `the settings template names the voice service`, `the README says what leaves the server`, `the relay tests pass, with the one for speech` (got: `ℹ pass 12 ℹ fail 0`) and `the link tests pass, with the one for the words of a voice note` (got: `ℹ pass 18 ℹ fail 0`) (twelve checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The server: speech into text in the relay, the route in the link, their tests, the settings template

#### `ai-relay.cjs`

**Edit 2.1** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text
// service key. It never returns or logs the key, and it never logs message text.
const fs = require('node:fs');
```

Replace them with:

```text
// service key. It never returns or logs the key, and it never logs message text.
// It also turns speech into text for the WhatsApp link (openwa-link.cjs), through the speech service the same
// settings file names with VOICE_PROVIDER, VOICE_API_KEY and, optionally, VOICE_BASE_URL and VOICE_MODEL.
const fs = require('node:fs');
```

**Edit 2.2** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text
const TIMEOUT_MS = Number(process.env.WA_SCRM_AI_TIMEOUT_MS) || 30000;
// A language name: letters of any script, spaces and a few separators.
```

Replace them with:

```text
const TIMEOUT_MS = Number(process.env.WA_SCRM_AI_TIMEOUT_MS) || 30000;
// Services with an OpenAI-compatible /audio/transcriptions endpoint, and the model each one is asked for when
// the settings name none.
const VOICE_PROVIDERS = {
  openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini-transcribe' },
  groq: { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'whisper-large-v3-turbo' },
  other: { name: '自定义服务', baseUrl: '', model: '' },
};
// The kinds of sound the speech services take, and the file name each is sent under.
const VOICE_FILES = { 'audio/ogg': 'voice.ogg', 'audio/mpeg': 'voice.mp3', 'audio/mp4': 'voice.m4a', 'audio/wav': 'voice.wav', 'audio/webm': 'voice.webm' };
const MAX_VOICE_BYTES = 24 * 1024 * 1024;
const VOICE_TIMEOUT_MS = Number(process.env.WA_SCRM_AI_VOICE_TIMEOUT_MS) || 60000;
// A language name: letters of any script, spaces and a few separators.
```

**Edit 2.3** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text

function sendJson(res, status, body) {
```

Replace them with:

```text

// The speech service of the same settings file.
// Returns { configured: true, name, baseUrl, model, key } or { configured: false, reason }.
function loadVoiceConfig() {
  const file = process.env.WA_SCRM_AI_ENV;
  if (!file) return { configured: false, reason: 'no-settings-file' };
  let values;
  try {
    values = parseEnv(fs.readFileSync(file, 'utf8'));
  } catch {
    return { configured: false, reason: 'no-settings-file' };
  }
  const provider = (values.VOICE_PROVIDER || '').toLowerCase();
  if (!provider) return { configured: false, reason: 'no-voice-service' };
  if (!Object.hasOwn(VOICE_PROVIDERS, provider)) return { configured: false, reason: 'unsupported-provider' };
  const preset = VOICE_PROVIDERS[provider];
  const baseUrl = (values.VOICE_BASE_URL || preset.baseUrl).replace(/\/+$/, '');
  if (!/^https?:\/\/\S+$/.test(baseUrl)) return { configured: false, reason: 'missing-address' };
  if (!values.VOICE_API_KEY) return { configured: false, reason: 'missing-key' };
  const model = values.VOICE_MODEL || preset.model;
  if (!model) return { configured: false, reason: 'missing-model' };
  return { configured: true, name: preset.name, baseUrl, model, key: values.VOICE_API_KEY };
}

// Speech to text for one sound file. kind is what the file is by its first bytes (audio/ogg, …). Returns the
// text, which is empty when the service heard no speech; every failure becomes a plain error code.
async function transcribeAudio(bytes, kind) {
  const config = loadVoiceConfig();
  if (!config.configured) throw failure(503, 'not-configured', { reason: config.reason });
  if (!Object.hasOwn(VOICE_FILES, kind)) throw failure(415, 'unsupported-audio');
  if (bytes.length > MAX_VOICE_BYTES) throw failure(413, 'too-long');
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: kind }), VOICE_FILES[kind]);
  form.append('model', config.model);
  form.append('response_format', 'json');
  const started = Date.now();
  let response;
  try {
    response = await fetch(config.baseUrl + '/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + config.key }, body: form, signal: AbortSignal.timeout(VOICE_TIMEOUT_MS) });
  } catch (error) {
    console.error(`ai transcribe failed error=${error.name === 'TimeoutError' ? 'timeout' : 'provider-unreachable'} ms=${Date.now() - started}`);
    throw error.name === 'TimeoutError' ? failure(504, 'timeout') : failure(502, 'provider-unreachable');
  }
  const body = response.ok ? await response.json().catch(() => null) : null;
  if (typeof body?.text !== 'string') {
    console.error(`ai transcribe failed error=${response.ok ? 'empty-result' : 'provider-error upstream=' + response.status} ms=${Date.now() - started}`);
    throw response.ok ? failure(502, 'empty-result') : failure(502, 'provider-error', { upstream: response.status });
  }
  const words = body.text.trim();
  console.log(`ai transcribe ok bytes=${bytes.length} chars=${words.length} ms=${Date.now() - started}`);
  return words;
}

function sendJson(res, status, body) {
```

**Edit 2.4** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text
    }
    const config = loadConfig();
    return sendJson(res, 200, config.configured
      ? { configured: true, provider: config.name, model: config.model }
      : { configured: false, reason: config.reason });
  }
```

Replace them with:

```text
    }
    const config = loadConfig(), voice = loadVoiceConfig();
    // voice says whether speech can be turned into text, whatever the state of the model service.
    return sendJson(res, 200, {
      ...(config.configured ? { configured: true, provider: config.name, model: config.model } : { configured: false, reason: config.reason }),
      voice: voice.configured ? { configured: true, provider: voice.name, model: voice.model } : { configured: false, reason: voice.reason },
    });
  }
```

**Edit 2.5** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text

module.exports = { handle, loadConfig, parseEnv, translationPrompt, replyPrompt };
```

Replace them with:

```text

module.exports = { handle, loadConfig, loadVoiceConfig, parseEnv, transcribeAudio, translationPrompt, replyPrompt };
```

#### `ai-relay.test.cjs`

**Edit 2.6** — `work/wa-replica/ai-relay.test.cjs`. Find exactly these lines (they occur once):

```text
const SECRET_TEXT = 'Do you ship the BX20 to Puerto Rico?';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-scrm-ai-'));
```

Replace them with:

```text
const SECRET_TEXT = 'Do you ship the BX20 to Puerto Rico?';
const VOICE_KEY = 'voice-key-9876543210-never-real';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-scrm-ai-'));
```

**Edit 2.7** — `work/wa-replica/ai-relay.test.cjs`. Find exactly these lines (they occur once):

```text
// The stand-in model service. `upstream.mode` selects how it answers; `upstream.calls` records what it got.
const upstream = { mode: 'ok', calls: [] };
const upstreamServer = http.createServer((req, res) => {
  let raw = '';
  req.on('data', chunk => { raw += chunk; });
  req.on('end', () => {
    upstream.calls.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(raw || '{}') });
```

Replace them with:

```text
// The stand-in model service. `upstream.mode` selects how it answers; `upstream.calls` records what it got.
// Its speech-to-text endpoint takes a form with the sound file; `upstream.voice` selects how it answers.
const upstream = { mode: 'ok', voice: 'ok', calls: [] };
const upstreamServer = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    // The form with the sound file is read byte for byte; everything else is JSON text.
    const speech = req.url.endsWith('/audio/transcriptions'), raw = Buffer.concat(chunks).toString(speech ? 'latin1' : 'utf8');
    if (speech) {
      const field = name => new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)\\r\\n`).exec(raw)?.[1];
      const file = /name="file"; filename="([^"]*)"\r\nContent-Type: ([^\r]*)\r\n\r\n/.exec(raw);
      const boundary = '\r\n--' + /boundary=(.*)$/.exec(req.headers['content-type'])[1];
      upstream.calls.push({ url: req.url, auth: req.headers.authorization, model: field('model'), format: field('response_format'), file: file?.[1], fileType: file?.[2], bytes: file ? raw.indexOf(boundary, file.index + file[0].length) - file.index - file[0].length : -1 });
      if (upstream.voice === 'error') { res.writeHead(500, { 'Content-Type': 'application/json' }); return res.end('{"error":{"message":"boom"}}'); }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(upstream.voice === 'odd' ? { usage: {} } : { text: upstream.voice === 'silent' ? '' : '  Hola, quiero dos cajas.  ', usage: { type: 'tokens' } }));
    }
    upstream.calls.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(raw || '{}') });
```

**Edit 2.8** — `work/wa-replica/ai-relay.test.cjs`. Find exactly these lines (they occur once):

```text
test('not configured: every reason is reported and no translation is attempted', async () => {
  const reasonFor = async lines => { writeEnv(lines); return (await call('/api/ai/status', { method: 'GET' })).json; };
  assert.deepEqual(await reasonFor(['AI_PROVIDER=anthropic', 'AI_API_KEY=x', 'AI_MODEL=m']), { configured: false, reason: 'unsupported-provider' });
```

Replace them with:

```text
test('not configured: every reason is reported and no translation is attempted', async () => {
  const reasonFor = async lines => { writeEnv(lines); const { voice, ...model } = (await call('/api/ai/status', { method: 'GET' })).json; return model; };
  assert.deepEqual(await reasonFor(['AI_PROVIDER=anthropic', 'AI_API_KEY=x', 'AI_MODEL=m']), { configured: false, reason: 'unsupported-provider' });
```

**Edit 2.9** — `work/wa-replica/ai-relay.test.cjs`. Find exactly these lines (they occur once):

```text
  assert.equal(upstream.calls.length, calls);
  process.env.WA_SCRM_AI_ENV = path.join(tmp, 'absent.env');
  assert.deepEqual((await call('/api/ai/status', { method: 'GET' })).json, { configured: false, reason: 'no-settings-file' });
  delete process.env.WA_SCRM_AI_ENV;
  assert.deepEqual((await call('/api/ai/status', { method: 'GET' })).json, { configured: false, reason: 'no-settings-file' });
  process.env.WA_SCRM_AI_ENV = envFile;
```

Replace them with:

```text
  assert.equal(upstream.calls.length, calls);
  const none = { configured: false, reason: 'no-settings-file', voice: { configured: false, reason: 'no-settings-file' } };
  process.env.WA_SCRM_AI_ENV = path.join(tmp, 'absent.env');
  assert.deepEqual((await call('/api/ai/status', { method: 'GET' })).json, none);
  delete process.env.WA_SCRM_AI_ENV;
  assert.deepEqual((await call('/api/ai/status', { method: 'GET' })).json, none);
  process.env.WA_SCRM_AI_ENV = envFile;
```

**Edit 2.10** — `work/wa-replica/ai-relay.test.cjs`. Find exactly these lines (they occur once):

```text
  const status = await call('/api/ai/status', { method: 'GET' });
  assert.deepEqual([status.status, status.json], [200, { configured: true, provider: '自定义服务', model: 'test-model' }]);
  assert(!status.raw.includes(KEY));
```

Replace them with:

```text
  const status = await call('/api/ai/status', { method: 'GET' });
  assert.deepEqual([status.status, status.json], [200, { configured: true, provider: '自定义服务', model: 'test-model', voice: { configured: false, reason: 'no-voice-service' } }]);
  assert(!status.raw.includes(KEY));
```

**Edit 2.11** — `work/wa-replica/ai-relay.test.cjs`. Find exactly these lines (they occur once):

```text

test('the log never holds the key or message text', () => {
  const lines = logged.filter(line => line.startsWith('ai '));
  assert(lines.some(line => line.startsWith('ai translate ok chars=')) && lines.some(line => line.includes('error=provider-error upstream=500')), lines.join('\n'));
```

Replace them with:

```text

test('speech to text: the voice settings, what is sent to the service, and its answers as text or plain error codes', async () => {
  const wav = Buffer.concat([Buffer.from('RIFF\0\0\0\0WAVEfmt '), Buffer.alloc(40, 3)]);
  const refused = (promise, code, status) => assert.rejects(promise, error => error.message === code && error.status === status);
  // every reason for "not configured"; the model service's own settings do not stand in for the voice ones
  const voiceFor = lines => { configure(lines); return relay.loadVoiceConfig(); };
  assert.deepEqual(voiceFor([]), { configured: false, reason: 'no-voice-service' });
  await assert.rejects(relay.transcribeAudio(wav, 'audio/wav'), error => error.message === 'not-configured' && error.status === 503 && error.reason === 'no-voice-service');
  assert.deepEqual(voiceFor(['VOICE_PROVIDER=whisperx', 'VOICE_API_KEY=v']), { configured: false, reason: 'unsupported-provider' });
  assert.deepEqual(voiceFor(['VOICE_PROVIDER=other', 'VOICE_API_KEY=v']), { configured: false, reason: 'missing-address' });
  assert.deepEqual(voiceFor(['VOICE_PROVIDER=openai']), { configured: false, reason: 'missing-key' });
  assert.deepEqual(voiceFor(['VOICE_PROVIDER=other', 'VOICE_API_KEY=v', `VOICE_BASE_URL=http://127.0.0.1:${upstreamPort}/v1`]), { configured: false, reason: 'missing-model' });
  assert.deepEqual(voiceFor(['VOICE_PROVIDER=OpenAI', 'VOICE_API_KEY=v']), { configured: true, name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini-transcribe', key: 'v' });
  assert.deepEqual(voiceFor(['VOICE_PROVIDER=groq', 'VOICE_API_KEY=v', 'VOICE_MODEL=whisper-large-v3']).model, 'whisper-large-v3');
  // the status names the service and the model, never the key
  const voice = ['VOICE_PROVIDER=other', `VOICE_API_KEY=${VOICE_KEY}`, `VOICE_BASE_URL=http://127.0.0.1:${upstreamPort}/v1/`, 'VOICE_MODEL=test-voice'];
  configure(voice);
  const status = await call('/api/ai/status', { method: 'GET' });
  assert.deepEqual(status.json.voice, { configured: true, provider: '自定义服务', model: 'test-voice' });
  assert(!status.raw.includes(VOICE_KEY) && !status.raw.includes(KEY));
  // one call: the voice key, the model, the file under a name that fits its kind; the answer trimmed
  upstream.calls.length = 0;
  assert.equal(await relay.transcribeAudio(wav, 'audio/wav'), 'Hola, quiero dos cajas.');
  assert.deepEqual(upstream.calls, [{ url: '/v1/audio/transcriptions', auth: 'Bearer ' + VOICE_KEY, model: 'test-voice', format: 'json', file: 'voice.wav', fileType: 'audio/wav', bytes: wav.length }]);
  // no speech heard: an empty text, not an error
  upstream.voice = 'silent';
  assert.equal(await relay.transcribeAudio(wav, 'audio/ogg'), '');
  assert.deepEqual([upstream.calls[1].file, upstream.calls[1].fileType], ['voice.ogg', 'audio/ogg']);
  // failures
  upstream.voice = 'error';
  await assert.rejects(relay.transcribeAudio(wav, 'audio/wav'), error => error.message === 'provider-error' && error.status === 502 && error.upstream === 500);
  upstream.voice = 'odd';
  await refused(relay.transcribeAudio(wav, 'audio/wav'), 'empty-result', 502);
  upstream.voice = 'ok';
  const calls = upstream.calls.length;
  await refused(relay.transcribeAudio(wav, 'audio/aac'), 'unsupported-audio', 415);
  await refused(relay.transcribeAudio(wav, 'video/mp4'), 'unsupported-audio', 415);
  await refused(relay.transcribeAudio(Buffer.alloc(24 * 1024 * 1024 + 1), 'audio/wav'), 'too-long', 413);
  assert.equal(upstream.calls.length, calls, 'refused before the service is called');
  configure(['VOICE_PROVIDER=other', 'VOICE_API_KEY=v', 'VOICE_BASE_URL=http://127.0.0.1:9/v1', 'VOICE_MODEL=m']);
  await refused(relay.transcribeAudio(wav, 'audio/wav'), 'provider-unreachable', 502);
});

test('the log never holds the key or message text', () => {
  const lines = logged.filter(line => line.startsWith('ai '));
  assert(lines.some(line => /^ai transcribe ok bytes=\d+ chars=23 ms=\d+$/.test(line)) && lines.some(line => line.startsWith('ai transcribe failed error=provider-error upstream=500')), lines.join('\n'));
  assert(!logged.join('\n').includes(VOICE_KEY) && !logged.join('\n').includes('cajas'));
  assert(lines.some(line => line.startsWith('ai translate ok chars=')) && lines.some(line => line.includes('error=provider-error upstream=500')), lines.join('\n'));
```

**Edit 2.12** — `work/wa-replica/ai-relay.test.cjs`. Find exactly these lines (they occur once):

```text
    });
    assert.deepEqual((await call('/api/ai/status', { method: 'GET', port })).json, { configured: true, provider: '自定义服务', model: 'test-model' });
    assert.deepEqual((await call('/api/ai/translate', { body: { text: 'hi', to: '中文' }, port })).json, { text: '你们可以把 BX20 发到波多黎各吗？' });
```

Replace them with:

```text
    });
    assert.deepEqual((await call('/api/ai/status', { method: 'GET', port })).json, { configured: true, provider: '自定义服务', model: 'test-model', voice: { configured: false, reason: 'no-voice-service' } });
    assert.deepEqual((await call('/api/ai/translate', { body: { text: 'hi', to: '中文' }, port })).json, { text: '你们可以把 BX20 发到波多黎各吗？' });
```

#### `ai.env.example`

**Append 2.13** — `work/wa-replica/ai.env.example`. Add at the end of the file, after one empty line:

```text
# ---- Voice notes into text (optional) ----
# 5) Which service turns speech into text?  One of:  openai  groq  other   (leave empty for none)
VOICE_PROVIDER=

# 6) Its API key (it may be the same key as above)
VOICE_API_KEY=

# 7) Its address. Required for "other" (any service with an OpenAI-compatible /audio/transcriptions
#    endpoint); optional otherwise.
VOICE_BASE_URL=

# 8) Its model. Optional for openai (gpt-4o-mini-transcribe) and groq (whisper-large-v3-turbo); required for "other".
VOICE_MODEL=
```

#### `openwa-link.cjs`

**Edit 2.14** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
//   GET  /api/wa/media?account=<id>&chat=<chat>&id=<message>[&download=1]
//                                                the picture, voice note, video or file of a message
// The link also catches up by itself: when a number comes online it fetches the number's chats with one person
// and the latest messages of each, and every quarter of an hour it looks for what the hook did not deliver.
```

Replace them with:

```text
//   GET  /api/wa/media?account=<id>&chat=<chat>&id=<message>[&download=1]
//                                                the picture, voice note, video or file of a message
//   POST /api/wa/transcribe { account, chat, id }
//                                                the words of a voice note or sound file, by the speech service
// The link also catches up by itself: when a number comes online it fetches the number's chats with one person
// and the latest messages of each, and every quarter of an hour it looks for what the hook did not deliver.
```

**Edit 2.15** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
// wa-media-<site> beside the records; that folder may be emptied at any time. A file is shown inside the page
// only when its first bytes are those of a picture, sound or video a browser plays; anything else is a download.
// The employee of the sub-site uses all of them; supervisors and administrators read the status and media. The hook
// takes no cookie: it accepts only a body signed with the hook secret. A delivery is stored as OpenWA sent it
```

Replace them with:

```text
// wa-media-<site> beside the records; that folder may be emptied at any time. A file is shown inside the page
// only when its first bytes are those of a picture, sound or video a browser plays; anything else is a download.
// The text of a voice note is kept beside its file, so the speech service is paid once for each voice note.
// The employee of the sub-site uses all of them; supervisors and administrators read the status and media. The hook
// takes no cookie: it accepts only a body signed with the hook secret. A delivery is stored as OpenWA sent it
```

**Edit 2.16** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { parseEnv } = require('./ai-relay.cjs');

const MAX_BODY = 16 * 1024;
```

Replace them with:

```text
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { parseEnv, transcribeAudio } = require('./ai-relay.cjs');

const MAX_BODY = 16 * 1024;
```

**Edit 2.17** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
const STATUS = {
  'invalid-request': 400, 'send-refused': 400, 'not-signed-in': 401, 'bad-signature': 401, 'password-change-required': 403, 'forbidden': 403,
  'read-only': 403, 'unknown-account': 404, 'media-unavailable': 404, 'not-connected': 409, 'request-conflict': 409, 'outcome-unknown': 409, 'taken-over': 409,
  'too-long': 413, 'gateway-refused': 502, 'gateway-unreachable': 502, 'gateway-failed': 502, 'not-configured': 503,
};
```

Replace them with:

```text
const STATUS = {
  'invalid-request': 400, 'send-refused': 400, 'not-signed-in': 401, 'bad-signature': 401, 'password-change-required': 403, 'forbidden': 403,
  'read-only': 403, 'unknown-account': 404, 'media-unavailable': 404, 'not-connected': 409, 'not-audio': 415, 'no-speech': 422, 'transcription-failed': 502, 'request-conflict': 409, 'outcome-unknown': 409, 'taken-over': 409,
  'too-long': 413, 'gateway-refused': 502, 'gateway-unreachable': 502, 'gateway-failed': 502, 'not-configured': 503,
};
```

**Edit 2.18** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
    fs.writeFileSync(path.join(mediaDir, key + '.json'), JSON.stringify({ mime, name }), { mode: 0o600 });
  }
  async function mediaAsk(config, pathname) {
    let response;
```

Replace them with:

```text
    fs.writeFileSync(path.join(mediaDir, key + '.json'), JSON.stringify({ mime, name }), { mode: 0o600 });
  }
  // The words of a kept voice note go into its note.
  function mediaKeepText(key, { mime, name }, transcript) {
    fs.writeFileSync(path.join(mediaDir, key + '.json'), JSON.stringify({ mime, name, transcript }), { mode: 0o600 });
  }
  async function mediaAsk(config, pathname) {
    let response;
```

**Edit 2.19** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
    return mediaKept(key);
  }
  // Answers with the file itself. Only what mediaKind recognises is shown inside the page; everything else, and
  // anything asked for with download=1, is handed over as a download under its own name.
  async function media(req, url, res) {
    signedIn(req);
    const account = url.searchParams.get('account') || '', chat = url.searchParams.get('chat') || '', id = url.searchParams.get('id') || '';
    if (!ACCOUNT.test(account) || !CHAT.test(chat) || !MESSAGE.test(id)) throw problem('invalid-request');
    const key = mediaKey(account, chat, id);
```

Replace them with:

```text
    return mediaKept(key);
  }
  // The media of one message: what was kept, or what OpenWA has now. Fails with the reason when there is none.
  async function mediaOf(account, chat, id) {
    if (!ACCOUNT.test(account) || !CHAT.test(chat) || !MESSAGE.test(id)) throw problem('invalid-request');
    const key = mediaKey(account, chat, id);
```

**Edit 2.20** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
      }
    }
    const kind = mediaKind(found.bytes, found.mime);
    const shown = Boolean(kind) && url.searchParams.get('download') !== '1';
```

Replace them with:

```text
      }
    }
    return found;
  }
  // Answers with the file itself. Only what mediaKind recognises is shown inside the page; everything else, and
  // anything asked for with download=1, is handed over as a download under its own name.
  async function media(req, url, res) {
    signedIn(req);
    const found = await mediaOf(url.searchParams.get('account') || '', url.searchParams.get('chat') || '', url.searchParams.get('id') || '');
    const kind = mediaKind(found.bytes, found.mime);
    const shown = Boolean(kind) && url.searchParams.get('download') !== '1';
```

**Edit 2.21** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
    return SENT;
  }

  // The number's record. When there is none yet, its session and the webhook are made at OpenWA first. An
```

Replace them with:

```text
    return SENT;
  }
  // The words of a voice note or sound file. The speech service is asked once for each: the text is kept beside
  // the file, and two requests for the same voice note at the same time share one call.
  const transcribing = new Map();
  async function transcribe(req) {
    employee(req);
    const body = await readJson(req);
    const account = String(body.account || ''), chat = String(body.chat || ''), id = String(body.id || '');
    const found = await mediaOf(account, chat, id);
    if (typeof found.transcript === 'string') return { text: found.transcript };
    const kind = mediaKind(found.bytes, found.mime);
    if (!kind || !kind.startsWith('audio/')) throw problem('not-audio');
    const key = mediaKey(account, chat, id);
    if (!transcribing.has(key)) {
      transcribing.set(key, transcribeAudio(found.bytes, kind).then(text => {
        if (text) mediaKeepText(key, found, text);
        console.log(`wa transcribe ${text ? 'ok' : 'empty'} account=${account} bytes=${found.bytes.length} chars=${text.length}`);
        return text;
      }, error => {
        console.error(`wa transcribe failed account=${account} error=${error.message}`);
        throw problem(error.message === 'not-configured' ? 'not-configured' : error.message === 'unsupported-audio' ? 'not-audio' : error.message === 'too-long' ? 'too-long' : 'transcription-failed');
      }).finally(() => transcribing.delete(key)));
    }
    const text = await transcribing.get(key);
    if (!text) throw problem('no-speech');
    return { text };
  }

  // The number's record. When there is none yet, its session and the webhook are made at OpenWA first. An
```

**Edit 2.22** — `work/wa-replica/openwa-link.cjs`. Find exactly these lines (they occur once):

```text
    },
    'GET /api/wa/media': media,

    'POST /api/wa/hook': async req => {
```

Replace them with:

```text
    },
    'GET /api/wa/media': media,
    'POST /api/wa/transcribe': transcribe,

    'POST /api/wa/hook': async req => {
```

#### `openwa-link.test.cjs`

**Edit 2.23** — `work/wa-replica/openwa-link.test.cjs`. Find exactly these lines (they occur once):

```text

// ---- the sub-site with its link ----
```

Replace them with:

```text

// ---- the stand-in for the speech service (an OpenAI-compatible /audio/transcriptions) ----
const speech = { mode: 'ok', calls: [] };
const speechServer = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('latin1'), file = /name="file"; filename="([^"]*)"\r\nContent-Type: ([^\r]*)\r\n\r\n/.exec(raw);
    speech.calls.push({ auth: req.headers.authorization, file: file?.[1], bytes: file ? raw.indexOf('\r\n--', file.index + file[0].length) - file.index - file[0].length : -1 });
    if (speech.mode === 'error') { res.writeHead(500, { 'Content-Type': 'application/json' }); return res.end('{"error":{"message":"boom"}}'); }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    setTimeout(() => res.end(JSON.stringify({ text: speech.mode === 'silent' ? '' : ' Hola, quiero dos cajas. ' })), 30);
  });
});
const voiceFile = path.join(tmp, 'ai.env');

// ---- the sub-site with its link ----
```

**Edit 2.24** — `work/wa-replica/openwa-link.test.cjs`. Find exactly these lines (they occur once):

```text
  gateway.close(); gateway.closeAllConnections();
  link.close(); site.close();
```

Replace them with:

```text
  gateway.close(); gateway.closeAllConnections();
  speechServer.close(); speechServer.closeAllConnections();
  link.close(); site.close();
```

**Edit 2.25** — `work/wa-replica/openwa-link.test.cjs`. Find exactly these lines (they occur once):

```text

test('what kind of media some bytes are is told by how they begin', () => {
```

Replace them with:

```text

test('the words of a voice note: the speech service is asked once and the text kept beside the file; only sound is sent; only the employee may ask', async () => {
  const speechPort = await new Promise(resolve => speechServer.listen(0, '127.0.0.1', () => resolve(speechServer.address().port)));
  const aiBefore = process.env.WA_SCRM_AI_ENV;
  await post('/api/wa/link', { account: 'a8' });
  const session = gwSessionOf('a8'), chat = '15550008899@c.us';
  Object.assign(session, { status: 'ready', phone: '15550008080' });
  const ogg = n => Buffer.concat([Buffer.from('OggS'), Buffer.alloc(60 + n, n)]);
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 7)]);
  for (const n of [1, 3, 4, 5]) gw.media.set(`false_${chat}_S${n}`, { mimetype: 'audio/ogg; codecs=opus', filename: 'ptt.ogg', bytes: ogg(n) });
  gw.media.set(`false_${chat}_S2`, { mimetype: 'image/jpeg', filename: 'photo.jpg', bytes: jpeg });
  const ask = (n, cookie = lin) => post('/api/wa/transcribe', { account: 'a8', chat, id: `false_${chat}_S${n}` }, cookie);
  try {
    // no speech service in the settings: said so, nothing is sent anywhere
    delete process.env.WA_SCRM_AI_ENV;
    const off = await ask(1);
    assert.deepEqual([off.status, off.json, speech.calls.length], [503, { error: 'not-configured' }, 0]);
    fs.writeFileSync(voiceFile, `VOICE_PROVIDER=other\nVOICE_API_KEY=voice-key-for-the-link-tests\nVOICE_BASE_URL=http://127.0.0.1:${speechPort}/v1\nVOICE_MODEL=test-voice\n`);
    process.env.WA_SCRM_AI_ENV = voiceFile;
    // the voice note goes to the speech service: its bytes, under a name that fits what it is
    const first = await ask(1);
    assert.deepEqual([first.status, first.json], [200, { text: 'Hola, quiero dos cajas.' }]);
    assert.deepEqual(speech.calls, [{ auth: 'Bearer voice-key-for-the-link-tests', file: 'voice.ogg', bytes: ogg(1).length }]);
    // kept: asked again, the same text without a second call — also after the service has gone
    speech.mode = 'error';
    assert.deepEqual([(await ask(1)).json, speech.calls.length], [{ text: 'Hola, quiero dos cajas.' }, 1]);
    const note = fs.readdirSync(path.join(tmp, 'main', 'wa-media-s1')).filter(name => name.endsWith('.json')).map(name => JSON.parse(fs.readFileSync(path.join(tmp, 'main', 'wa-media-s1', name), 'utf8'))).filter(n => n.transcript);
    assert.deepEqual(note, [{ mime: 'audio/ogg', name: 'ptt.ogg', transcript: 'Hola, quiero dos cajas.' }]);
    // the service fails: said so, nothing kept, and it is asked again the next time
    const failed = await ask(3);
    assert.deepEqual([failed.status, failed.json, speech.calls.length], [502, { error: 'transcription-failed' }, 2]);
    speech.mode = 'ok';
    // two requests for one voice note at the same time: one call
    const both = await Promise.all([ask(3), ask(3)]);
    assert.deepEqual([both.map(r => r.json.text), speech.calls.length], [['Hola, quiero dos cajas.', 'Hola, quiero dos cajas.'], 3]);
    // no speech in it: said so, not kept
    speech.mode = 'silent';
    const silent = await ask(4);
    assert.deepEqual([silent.status, silent.json, speech.calls.length], [422, { error: 'no-speech' }, 4]);
    speech.mode = 'ok';
    assert.deepEqual([(await ask(4)).json, speech.calls.length], [{ text: 'Hola, quiero dos cajas.' }, 5]);
    // a picture is not sent to the speech service; a message without media has nothing to send
    const picture = await ask(2);
    assert.deepEqual([picture.status, picture.json, speech.calls.length], [415, { error: 'not-audio' }, 5]);
    assert.deepEqual((await ask(9)).json, { error: 'media-unavailable' });
    // who may ask, and for what
    assert.deepEqual((await post('/api/wa/transcribe', { account: 'a8', chat, id: `false_${chat}_S5` }, '')).json, { error: 'not-signed-in' });
    assert.deepEqual((await ask(5, await member('rhea', 'supervisor', null))).json, { error: 'read-only' });
    assert.equal((await ask(5, await member('iris', 'agent', 'elsewhere'))).status, 403);
    for (const bad of [{ account: 'a8', chat: '1203630299@g.us', id: 'x_1' }, { account: 'a8', chat }, { chat, id: `false_${chat}_S5` }, []]) assert.deepEqual((await post('/api/wa/transcribe', bad)).json, { error: 'invalid-request' }, JSON.stringify(bad));
    assert.equal((await call('/api/wa/transcribe', { cookie: lin })).status, 405);
    assert.equal(speech.calls.length, 5);
    // the log names the number and sizes, never the words
    const lines = logged.filter(line => /^(wa|ai) transcribe/.test(line));
    assert(lines.some(line => /^wa transcribe ok account=a8 bytes=\d+ chars=23$/.test(line)) && lines.some(line => line === 'wa transcribe failed account=a8 error=provider-error') && lines.some(line => /^wa transcribe empty account=a8 /.test(line)), lines.join('\n'));
    assert(!logged.some(line => line.includes('cajas') || line.includes('voice-key-for-the-link-tests')));
    assert.equal((await post('/api/wa/unlink', { account: 'a8' })).status, 200);
  } finally {
    if (aiBefore === undefined) delete process.env.WA_SCRM_AI_ENV; else process.env.WA_SCRM_AI_ENV = aiBefore;
  }
});

test('what kind of media some bytes are is told by how they begin', () => {
```

#### `site-api.test.cjs`

**Edit 2.26** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
    assert.equal((await call('/api/auth/password', { base: on.base, method: 'POST', cookie: cookieOf(first), body: { current: password, next: PASSWORD } })).status, 200);
    assert.deepEqual((await call('/api/ai/status', { base: on.base, cookie: cookieOf(first) })).json, { configured: false, reason: 'no-settings-file' });
    assert.deepEqual((await call('/api/data', { base: on.base, cookie: cookieOf(first) })).json, { version: 0, data: {} });
```

Replace them with:

```text
    assert.equal((await call('/api/auth/password', { base: on.base, method: 'POST', cookie: cookieOf(first), body: { current: password, next: PASSWORD } })).status, 200);
    assert.deepEqual((await call('/api/ai/status', { base: on.base, cookie: cookieOf(first) })).json, { configured: false, reason: 'no-settings-file', voice: { configured: false, reason: 'no-settings-file' } });
    assert.deepEqual((await call('/api/data', { base: on.base, cookie: cookieOf(first) })).json, { version: 0, data: {} });
```

**Verify**: `sha256sum work/wa-replica/ai-relay.cjs work/wa-replica/ai-relay.test.cjs work/wa-replica/ai.env.example work/wa-replica/openwa-link.cjs work/wa-replica/openwa-link.test.cjs work/wa-replica/site-api.test.cjs` → `d597bb72854be3da4a22dca66229b41418c6316fb5295938a1989fd6e5177723`, `de997c3d3587c1373823ef3b0c5da6abe5a340c5a472d61a20b38096e1643ab7`, `111229c9a52b72c6838b0778ed20756e2295d490226a1ac7a3b3bec75e1eba58`, `f03d6c573955424982e4a453eb211de3d35c9b7afc07f76f3a16401e274dc300`, `bb3ecef7f693bee6fa8a60b809ef6cea8c768f51746ea1fafdf43eb8a7051823`, `02efa1bdedc6e9d442d793ae59624b599d9cba1fb42ffd4824436e8d2a6a0b7a`; `for f in ai-relay.cjs ai-relay.test.cjs openwa-link.cjs openwa-link.test.cjs; do node --check work/wa-replica/$f || echo BAD $f; done; echo SYNTAX_DONE` → only `SYNTAX_DONE`; the relay tests → `pass 13`, `fail 0`; the link tests → `pass 19`, `fail 0`; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`. If a checksum does not match, restore the file with `git checkout 732a801 -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 3: The page: the capability, the button and the words under a voice note

#### `fidelity-ai.js`

**Edit 3.1** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
    { id: 'translate.outbound', name: '发送前翻译', description: '把你输入的回复和快捷回复译为客户的语言，发送前可预览。' },
  ];
```

Replace them with:

```text
    { id: 'translate.outbound', name: '发送前翻译', description: '把你输入的回复和快捷回复译为客户的语言，发送前可预览。' },
    { id: 'voice.transcribe', name: '语音转文字', description: '点击语音消息下方的「转文字」，把语音转成文字显示在语音下方；客户发来的语音还会译为所选的译文语言。' },
  ];
```

**Edit 3.2** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
  const AI_PROVIDERS = {
    server: { name: '服务器中转', run: (capabilityId, input) => capabilityId === 'translate.outbound' ? aiRelayReply(input) : aiRelayTranslate(input) },
  };
```

Replace them with:

```text
  const AI_PROVIDERS = {
    server: { name: '服务器中转', run: (capabilityId, input) => capabilityId === 'voice.transcribe' ? aiRelayTranscribe(input) : capabilityId === 'translate.outbound' ? aiRelayReply(input) : aiRelayTranslate(input) },
  };
```

**Edit 3.3** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text

  // Ask the page's own server whether a model service is configured, and use the relay if it is.
```

Replace them with:

```text

  // The server turns the voice note of a message into text: it holds the file and calls the speech service.
  function aiRelayTranscribe(input) {
    return fetch('/api/wa/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: input.account, chat: input.chat, id: input.id }),
    }).then(response => response.json().then(body => response.ok ? { text: body.text } : Promise.reject(new Error('transcribe ' + body.error))));
  }

  // Ask the page's own server whether a model service is configured, and use the relay if it is.
```

**Edit 3.4** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
    const relay = aiRuntime.provider === 'server';
    const providerNote = relay
```

Replace them with:

```text
    const relay = aiRuntime.provider === 'server';
    const voice = Boolean(aiRuntime.status?.voice?.configured);
    const providerNote = relay
```

**Edit 3.5** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
      <div class="fid-ai-provider"><strong>当前接入</strong><span class="lc-pill ${relay ? 'ok' : 'warn'}">${esc(relay ? `${aiRuntime.status.provider} · ${aiRuntime.status.model}` : '未连接')}</span><span>${providerNote}</span></div>
      <div class="fid-ai-provider"><strong>译文语言</strong><select class="fid-select" data-ai-setting="readLanguage" aria-label="译文语言">${AI_READ_LANGUAGES.map(language => option(language, language, settings.readLanguage)).join('')}</select><span>客户发来的消息译为这种语言，显示在原文下方；只对之后收到的消息生效。</span></div>
```

Replace them with:

```text
      <div class="fid-ai-provider"><strong>当前接入</strong><span class="lc-pill ${relay ? 'ok' : 'warn'}">${esc(relay ? `${aiRuntime.status.provider} · ${aiRuntime.status.model}` : '未连接')}</span><span>${providerNote}</span></div>
      <div class="fid-ai-provider"><strong>语音服务</strong><span class="lc-pill ${voice ? 'ok' : 'warn'}">${esc(voice ? `${aiRuntime.status.voice.provider} · ${aiRuntime.status.voice.model}` : '未连接')}</span><span>${voice ? '语音消息由本站服务器交给语音服务转成文字，每条语音只转一次。' : '服务器尚未配置语音服务，语音转文字暂不可用。'}</span></div>
      <div class="fid-ai-provider"><strong>译文语言</strong><select class="fid-select" data-ai-setting="readLanguage" aria-label="译文语言">${AI_READ_LANGUAGES.map(language => option(language, language, settings.readLanguage)).join('')}</select><span>客户发来的消息译为这种语言，显示在原文下方；只对之后收到的消息生效。</span></div>
```

**Edit 3.6** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text

  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-ai-guard]')) aiSetGuard(!aiGuardOn());
  });
```

Replace them with:

```text

  // ---- voice notes into text ----
  // Messages whose words are being asked for right now.
  const aiTranscribing = new Set();
  // Under a voice note or sound file: its words once they are known, otherwise a button that asks for them.
  // c is the customer, or a record of the chat archive, which only shows words that were known when it was made.
  function aiTranscriptHTML(c, m) {
    if (m.transcript) return `<div class="message-translation ai-transcript"><span class="translation-label">${icon('FileText')}转写</span><div>${esc(m.transcript)}</div></div>`;
    if (!c.waChat || !aiSettings().enabled['voice.transcribe'] || !aiRuntime.provider || !aiRuntime.status?.voice?.configured) return '';
    const busy = aiTranscribing.has(m.id);
    return `<button type="button" class="fid-link ai-transcribe" data-ai-transcribe="${esc(m.id)}" ${busy ? 'disabled' : ''}>${icon('FileText')}${busy ? '正在转文字…' : '转文字'}</button>`;
  }
  // Draws the open conversation again when it is this customer's.
  function aiRedraw(c) {
    const box = $('#messages');
    if (ui.view !== 'inbox' || !box || box.dataset.customer !== c.id) return;
    const atBottom = box.scrollHeight - box.clientHeight - box.scrollTop <= 40;
    openwaKeepPlaying(() => {
      box.innerHTML = messagesHTML(c);
    });
    paintIcons(box);
    if (atBottom) scrollMessages();
  }
  // Turns a voice note of the open conversation into text and keeps the text on the message. The words of a
  // voice note the customer sent are then translated like an incoming text.
  function aiTranscribe(messageId) {
    const c = selectedCustomer(), message = c && (data.messages[c.id] || []).find(m => m.id === messageId);
    if (!message || !message.wa || !c.waChat || aiTranscribing.has(messageId)) return;
    aiTranscribing.add(messageId);
    aiRedraw(c);
    aiRun('voice.transcribe', { account: c.account, chat: c.waChat, id: message.wa }, { customerId: c.id }).then(result => {
      aiTranscribing.delete(messageId);
      if (result.ok) {
        message.transcript = result.text;
        persist();
      } else if (!result.skipped) toast('这条语音未能转成文字，请稍后再试。');
      aiRedraw(c);
      if (!result.ok || message.side !== 'in') return;
      aiRun('translate.inbound', { text: result.text, to: aiSettings().readLanguage }, { customerId: c.id }).then(translated => {
        if (!translated.ok || translated.text.trim() === result.text.trim()) return;
        message.translated = translated.text;
        persist();
        aiRedraw(c);
      });
    });
  }

  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-ai-guard]')) aiSetGuard(!aiGuardOn());
    const ask = event.target.closest?.('[data-ai-transcribe]');
    if (ask) aiTranscribe(ask.dataset.aiTranscribe);
  });
```

#### `fidelity-openwa.js`

**Edit 3.7** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    if (shown === 'video') return `<div class="openwa-media"><video src="${url}" controls preload="none" aria-label="视频"></video></div>`;
    if (shown === 'audio') return `<div class="openwa-media"><audio src="${url}" controls preload="none" aria-label="语音"></audio></div>`;
    return `<a class="openwa-file" href="${url}&amp;download=1" download>${icon('FileDown')}<span>${esc(m.file || '文件')}</span></a>`;
```

Replace them with:

```text
    if (shown === 'video') return `<div class="openwa-media"><video src="${url}" controls preload="none" aria-label="视频"></video></div>`;
    if (shown === 'audio') return `<div class="openwa-media"><audio src="${url}" controls preload="none" aria-label="语音"></audio></div>` + aiTranscriptHTML(c, m);
    return `<a class="openwa-file" href="${url}&amp;download=1" download>${icon('FileDown')}<span>${esc(m.file || '文件')}</span></a>`;
```

#### `fidelity.css`

**Append 3.8** — `work/wa-replica/fidelity.css`. Add at the end of the file, after one empty line:

```text
/* The words of a voice note (plan 034): the button that asks for them, and the text under the player. */
.ai-transcribe { display:inline-flex; align-items:center; gap:4px; margin:0 0 6px; font-size:12px; }
.ai-transcribe svg { width:14px; height:14px; }
.ai-transcribe[disabled] { color:var(--color-text-muted); cursor:default; }
.ai-transcript { margin:0 0 6px; }
```

#### `validate-scrm-lifecycle.cjs`

**Edit 3.9** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
const serveSource = read(path.join(__dirname, 'serve.cjs'));
for (const required of ["server: { name: '服务器中转', run: (capabilityId, input) => capabilityId === 'translate.outbound' ? aiRelayReply(input) : aiRelayTranslate(input) },", "fetch('/api/ai/translate', {", "fetch('/api/ai/status')", 'const providerId = aiRuntime.provider;', "to: aiSettings().readLanguage }", 'data-ai-setting="readLanguage"', 'aiDetectRelay();']) {
  assert(aiSource.includes(required), `fidelity-ai.js is missing ${required}`);
}
for (const required of ['process.env.WA_SCRM_AI_ENV', "Authorization: 'Bearer ' + config.key", 'module.exports = { handle, loadConfig, parseEnv, translationPrompt, replyPrompt };']) {
  assert(relaySource.includes(required), `ai-relay.cjs is missing ${required}`);
```

Replace them with:

```text
const serveSource = read(path.join(__dirname, 'serve.cjs'));
for (const required of ["server: { name: '服务器中转', run: (capabilityId, input) => capabilityId === 'voice.transcribe' ? aiRelayTranscribe(input) : capabilityId === 'translate.outbound' ? aiRelayReply(input) : aiRelayTranslate(input) },", "fetch('/api/ai/translate', {", "fetch('/api/ai/status')", 'const providerId = aiRuntime.provider;', "to: aiSettings().readLanguage }", 'data-ai-setting="readLanguage"', 'aiDetectRelay();']) {
  assert(aiSource.includes(required), `fidelity-ai.js is missing ${required}`);
}
for (const required of ['process.env.WA_SCRM_AI_ENV', "Authorization: 'Bearer ' + config.key", 'module.exports = { handle, loadConfig, loadVoiceConfig, parseEnv, transcribeAudio, translationPrompt, replyPrompt };']) {
  assert(relaySource.includes(required), `ai-relay.cjs is missing ${required}`);
```

**Edit 3.10** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text

// 22. The page uses the real WhatsApp connection through its own server; nothing simulates it any more.
```

Replace them with:

```text

// The words of a voice note come from the server, on a click; the page keeps them on the message.
for (const required of ["{ id: 'voice.transcribe', name: '语音转文字',", "fetch('/api/wa/transcribe', {", 'function aiTranscriptHTML(c, m) {', "aiRun('voice.transcribe', { account: c.account, chat: c.waChat, id: message.wa }, { customerId: c.id })", 'message.transcript = result.text;', 'data-ai-transcribe=']) {
  assert(read(path.join(__dirname, 'fidelity-ai.js')).includes(required), `fidelity-ai.js is missing ${required}`);
}
assert(read(path.join(__dirname, 'fidelity-openwa.js')).includes("aria-label=\"语音\"></audio></div>` + aiTranscriptHTML(c, m);"), 'a voice note must show its words or the button that asks for them');
// 22. The page uses the real WhatsApp connection through its own server; nothing simulates it any more.
```

**Edit 3.11** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  chatHistory: 'archive of moved-in snapshots, no rating',
  aiCapabilities: ['translate.inbound', 'translate.outbound'],
  aiProvider: 'server relay to an OpenAI-compatible model service (key stays on the server); without it no AI capability runs',
  pageNetworkCalls: 'own server only: /api/ai/status, /api/ai/translate, /api/ai/reply',
  replyTranslation: 'typed replies and quick replies go to /api/ai/reply with tone, business description and the last six messages; send guard on by default: first Enter translates, second Enter sends',
```

Replace them with:

```text
  chatHistory: 'archive of moved-in snapshots, no rating',
  aiCapabilities: ['translate.inbound', 'translate.outbound', 'voice.transcribe'],
  aiProvider: 'server relay to an OpenAI-compatible model service (key stays on the server); without it no AI capability runs',
  pageNetworkCalls: 'own server only: /api/ai/status, /api/ai/translate, /api/ai/reply, /api/wa/transcribe',
  replyTranslation: 'typed replies and quick replies go to /api/ai/reply with tone, business description and the last six messages; send guard on by default: first Enter translates, second Enter sends',
```

**Verify**: `sha256sum work/wa-replica/fidelity-ai.js work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity.css work/wa-replica/validate-scrm-lifecycle.cjs` → `46fdac3f5d922c750aa73c44bd1e25b9fbc09084df0407f73edc71b89bb86bcc`, `0ce054008d4b937c3a17ec8d139dbf1d976c82252284877d6feff39a71e7c4c0`, `3ee213d26d511b033fa87ea5fac95109c5d3ccf6d688c13134735c44af7f462c`, `9a195bc284b9fc7a65fe4a6891bdcdd81dbc1cf3d607416eacc48dba85b98bfc`; the syntax command → `SYNTAX_OK`; `git checkout 732a801 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; the icon-set command → `removed= added=`; `sha256sum outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/app.css` → `4502fcd99930b0dcccd2b1ce6e28e6e67653e4e74b93422eefc4ad0ed8c903fa`, `250a443b52a9a46f5a4b6bf8e3e471e44db6c193173c40085bf25b743356fda8`.

### Step 4: README, build log, final verification

**Edit 4.1** — `README.md`. Find exactly these lines (they occur once):

```text

#### 接入 OpenWA（WhatsApp 连接，可选）
```

Replace them with:

```text

同一个设置文件里的 `VOICE_PROVIDER`、`VOICE_API_KEY`（以及可选的 `VOICE_BASE_URL`、`VOICE_MODEL`）指定语音转文字服务：员工点击语音消息下方的「转文字」时，服务器把这条语音交给语音服务（`/api/wa/transcribe`），文字显示在语音下方并保存在服务器上，同一条语音只转一次。未填写时不显示「转文字」。

#### 接入 OpenWA（WhatsApp 连接，可选）
```

**Edit 4.2** — `README.md`. Find exactly these lines (they occur once):

```text
| `#tags` / `#tag-stats` | **标签管理与标签统计** | 自建分组维护自定义标签、批量打标与客户穿透查询 |
| `#ai` | **AI 能力** | AI 功能的统一接入点：能力清单与逐项启停（接收消息翻译、发送前翻译）、译文语言、回复语气、业务说明与发送保护设置、按能力累计的调用次数与字符数、最近调用记录；经本站服务器中转调用模型服务；服务器未配置时显示「未连接」，不提供翻译 |

```

Replace them with:

```text
| `#tags` / `#tag-stats` | **标签管理与标签统计** | 自建分组维护自定义标签、批量打标与客户穿透查询 |
| `#ai` | **AI 能力** | AI 功能的统一接入点：能力清单与逐项启停（接收消息翻译、发送前翻译、语音转文字）、译文语言、回复语气、业务说明与发送保护设置、按能力累计的调用次数与字符数、最近调用记录；经本站服务器中转调用模型服务；服务器未配置时显示「未连接」，不提供翻译 |

```

**Edit 4.3** — `README.md`. Find exactly these lines (they occur once):

```text
│       ├── fidelity-boot.js                           # 页面启动：登录界面、读取子站数据、把修改保存到服务器
│       ├── ai-relay.cjs / ai-relay.test.cjs           # 预览服务的 AI 中转接口（读取服务器上的密钥并调用模型服务）及其测试
│       ├── ai.env.example                             # AI 设置文件示例（填写后的副本放在仓库之外）
```

Replace them with:

```text
│       ├── fidelity-boot.js                           # 页面启动：登录界面、读取子站数据、把修改保存到服务器
│       ├── ai-relay.cjs / ai-relay.test.cjs           # 预览服务的 AI 中转接口（读取服务器上的密钥并调用模型服务与语音服务）及其测试
│       ├── ai.env.example                             # AI 设置文件示例（填写后的副本放在仓库之外）
```

**Edit 4.4** — `README.md`. Find exactly these lines (they occur once):

```text

- 客户、会话、标签与待办等数据保存在服务器的数据目录（`WA_SCRM_DATA_DIR`，SQLite 文件，位于仓库之外）；浏览器只保存草稿、已打开页签等界面状态；账号密码以 scrypt 哈希保存。WhatsApp 的收发经由本站服务器与子站专属的 OpenWA 完成，浏览器不直接连接 OpenWA。对外的调用有两类：服务器与 OpenWA 之间的连接；以及 AI 翻译——仅当预览服务配置了模型服务时，待翻译的消息文本经本站服务器发送给该模型服务。密钥都只保存在服务器上，仓库内不含任何密钥。
- 本地勘察期产生的浏览器配置目录、网络抓包（`.har`）、原始采集大文件及第三方参考截图均已通过 `.gitignore` 严格排除，不进入代码仓库。
```

Replace them with:

```text

- 客户、会话、标签与待办等数据保存在服务器的数据目录（`WA_SCRM_DATA_DIR`，SQLite 文件，位于仓库之外）；浏览器只保存草稿、已打开页签等界面状态；账号密码以 scrypt 哈希保存。WhatsApp 的收发经由本站服务器与子站专属的 OpenWA 完成，浏览器不直接连接 OpenWA。对外的调用有三类：服务器与 OpenWA 之间的连接；AI 翻译——仅当预览服务配置了模型服务时，待翻译的消息文本经本站服务器发送给该模型服务；语音转文字——仅当配置了语音服务且员工点击「转文字」时，这条语音文件经本站服务器发送给该语音服务。密钥都只保存在服务器上，仓库内不含任何密钥。
- 本地勘察期产生的浏览器配置目录、网络抓包（`.har`）、原始采集大文件及第三方参考截图均已通过 `.gitignore` 严格排除，不进入代码仓库。
```

**Append 4.5** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 语音转文字：点击「转文字」 · 2026-11-22

语音消息和音频文件下方新增「转文字」按钮（项目负责人选定的 AI 功能之一）。点击后，服务器把这条语音交给设置文件中指定的语音服务（`VOICE_PROVIDER` 等），文字显示在播放器下方并保存在消息上；客户发来的语音，文字还会按「接收消息翻译」的设置译为所选语言。同一条语音只向语音服务请求一次：文字同时保存在服务器的媒体文件夹里，再次请求直接返回。没有听到说话内容或服务出错时提示「未能转成文字」，可稍后重试。

「AI 能力」页新增能力「语音转文字」（可单独停用，停用后不显示按钮）和「语音服务」一行，显示服务器配置的语音服务与模型；每次转写记录一条用量。本次只做点击转写，是否对新收到的语音自动转写待项目负责人决定。服务器接口 `/api/wa/transcribe` 只对本子站员工开放；只有确认是音频的文件才会发送给语音服务。
```

Then verify everything once more:

```bash
git checkout 732a801 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && env -u WA_SCRM_AI_ENV -u WA_SCRM_AI_VOICE_TIMEOUT_MS $NODE --test work/wa-replica/ai-relay.test.cjs && env -u WA_SCRM_OPENWA_ENV -u WA_SCRM_AI_ENV -u WA_SCRM_OPENWA_SYNC_MS -u WA_SCRM_OPENWA_SYNC_PAUSE_MS -u WA_SCRM_OPENWA_MEDIA_TIMEOUT_MS -u WA_SCRM_AI_VOICE_TIMEOUT_MS $NODE --test work/wa-replica/openwa-link.test.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-034/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test runs end with `pass 13`, `pass 19` and `pass 12`, `fail 0` each; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `26112fb57517c2c743a6f0e9c2733e3f3f9966563187639cf03f6d9c1bfa901b`, `045dce0ea6b4eb7d7cceafaf459dbb57c4170de006e13fe40efb6f3e8cabec6f`; `git status --porcelain` lists exactly fifteen paths: `README.md`, `replica/build-log.md`, the ten source files under `work/wa-replica/`, and `outputs/wa-replica-prototype/app.js`, `app.css` and `validation.json` (if `outputs/wa-replica-prototype/icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **`work/wa-replica/ai-relay.test.cjs`** — one new test (13 in all): every reason for "no speech service" (and that the model service's settings do not stand in for it), the defaults for `openai` and a model named in the settings, the status naming service and model and never a key; one call with the voice key, the model, the file under a name that fits its kind, and the answer trimmed; no speech → an empty text; the service's error, an answer without text, a kind that is not taken, a file that is too large, a service out of reach → plain error codes, the refusals before any call. The log test also checks that a transcription leaves sizes in the log and never the words or the voice key. Three existing tests follow the status's new field.
- **`work/wa-replica/openwa-link.test.cjs`** — one new test (19 in all) with a stand-in speech service: without settings 503 and nothing sent; the voice note's bytes go out once under a fitting name; asked again → the kept words without a call, also after the service has gone; the note beside the file holds the words; a failure → 502, nothing kept, asked again the next time; two requests at once → one call; no speech → 422, not kept; a picture → 415 and no call; no media → 404; no sign-in, a supervisor, a member of another sub-site, invalid input, the wrong method; the log names the number and sizes, never the words or the key.
- **`work/wa-replica/site-api.test.cjs`** — its test of the preview server follows the status's new field (12 as before).
- **Validator** — the capability, the request, the button and the kept words are in the page module; a voice note shows its words or the button; its record of the page's calls and capabilities names the new ones.
- **Smoke** (`/tmp/wa-scrm-plan-034/smoke.sh`) — the same facts on the sources and the built files, the settings template, the README, the tests.
- **Verified by the reviewer in scripted browser sessions, not by you**: a button under each voice note and nothing sent by itself; a click shows "正在转文字…", then the words, then for the customer's voice note their translation; an own voice note gets words and no translation; what is stored; each voice note went to the speech service once as the sound file it is; usage records; a failure says so and the button is back; the AI page names the service and the capability; switched off, the button is gone and the words stay. The sessions of the rest of the product and of the connection still pass. A real voice note will be tried when the owner has sent one to the test number.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 732a801 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] the relay tests → `pass 13`, `fail 0`; the link tests → `pass 19`, `fail 0`; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-034/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/ai-relay.cjs` → `d597bb72854be3da4a22dca66229b41418c6316fb5295938a1989fd6e5177723`
- [ ] `sha256sum work/wa-replica/ai-relay.test.cjs` → `de997c3d3587c1373823ef3b0c5da6abe5a340c5a472d61a20b38096e1643ab7`
- [ ] `sha256sum work/wa-replica/ai.env.example` → `111229c9a52b72c6838b0778ed20756e2295d490226a1ac7a3b3bec75e1eba58`
- [ ] `sha256sum work/wa-replica/openwa-link.cjs` → `f03d6c573955424982e4a453eb211de3d35c9b7afc07f76f3a16401e274dc300`
- [ ] `sha256sum work/wa-replica/openwa-link.test.cjs` → `bb3ecef7f693bee6fa8a60b809ef6cea8c768f51746ea1fafdf43eb8a7051823`
- [ ] `sha256sum work/wa-replica/site-api.test.cjs` → `02efa1bdedc6e9d442d793ae59624b599d9cba1fb42ffd4824436e8d2a6a0b7a`
- [ ] `sha256sum work/wa-replica/fidelity-ai.js` → `46fdac3f5d922c750aa73c44bd1e25b9fbc09084df0407f73edc71b89bb86bcc`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js` → `0ce054008d4b937c3a17ec8d139dbf1d976c82252284877d6feff39a71e7c4c0`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `3ee213d26d511b033fa87ea5fac95109c5d3ccf6d688c13134735c44af7f462c`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `9a195bc284b9fc7a65fe4a6891bdcdd81dbc1cf3d607416eacc48dba85b98bfc`
- [ ] `sha256sum README.md` → `26112fb57517c2c743a6f0e9c2733e3f3f9966563187639cf03f6d9c1bfa901b`
- [ ] `sha256sum replica/build-log.md` → `045dce0ea6b4eb7d7cceafaf459dbb57c4170de006e13fe40efb6f3e8cabec6f`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `4502fcd99930b0dcccd2b1ce6e28e6e67653e4e74b93422eefc4ad0ed8c903fa`
- [ ] `sha256sum outputs/wa-replica-prototype/app.css` → `250a443b52a9a46f5a4b6bf8e3e471e44db6c193173c40085bf25b743356fda8`
- [ ] the icon-set command prints `removed= added=`
- [ ] `git diff --name-only 732a801..HEAD -- . ':!plans'` lists exactly these fifteen: `README.md`, `outputs/wa-replica-prototype/app.css`, `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/ai-relay.cjs`, `work/wa-replica/ai-relay.test.cjs`, `work/wa-replica/ai.env.example`, `work/wa-replica/fidelity-ai.js`, `work/wa-replica/fidelity-openwa.js`, `work/wa-replica/fidelity.css`, `work/wa-replica/openwa-link.cjs`, `work/wa-replica/openwa-link.test.cjs`, `work/wa-replica/site-api.test.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs`
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
- The work appears to require editing an out-of-scope file or calling a real OpenWA, speech or model service.

## Maintenance notes

- **Deployment**: `ai-relay.cjs` and `openwa-link.cjs` change, so the live service must be restarted after the merge (the reviewer does that). The event feed is unchanged; pages that are open keep working and show the button after their next refresh. The owner's settings file already names the speech service.
- **Cost**: every first click on a voice note is one paid call to the speech service; nothing is sent without a click. If the owner decides for transcription by itself, the place is where an incoming voice note is applied in `fidelity-openwa.js` (not for what was fetched while catching up), behind a setting.
- The words are stored twice: on the message (the sub-site's data) and in the note beside the kept media file. Emptying the media folder loses the second copy only; a new click then pays again.
- The validator forbids `.text` in the relay's log lines; a new log line must log lengths taken into a variable first.
- What a reviewer should scrutinise: that nothing but sound (by its first bytes) reaches the speech service, that only the employee can start a call, and that neither log nor status ever carries the words or a key.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
