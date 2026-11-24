# Plan 064: Voice notes into text with Google Gemini

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat bdbc655..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (the AI relay's speech-to-text gets a second way to ask, used only when the settings name Gemini; exact text and checksums for every file; no change of the page)
- **Depends on**: plans/034-voice-notes-into-text.md (DONE), plans/063-own-words-back.md (DONE)
- **Category**: feature (requested by the owner)
- **Planned at**: commit `bdbc655`, 2026-11-24

## Why this matters

On 2026-11-24 the OpenAI account behind the workbench's AI ran out of credit. The owner gave a Google Gemini key; chat translation now runs on Gemini through Gemini's OpenAI-compatible address (a change of the server's settings only). Voice notes into text (转文字) cannot follow that way: the relay asks for a transcription at `/audio/transcriptions`, and Gemini has no such address (it answers 404). Asked what should happen with voice notes, the owner chose "Move them to Gemini too". With this plan the relay knows Gemini as a speech service: the sound goes inline into an ordinary request to the model (`…/models/<model>:generateContent`), and the transcript is the text of the answer.

### Decisions already made (do not re-open; do not ask)

The owner chose Gemini for voice notes too.

Decided by the advisor, within that, after trying the real service with test sounds:

- A voice preset `gemini` (name Google Gemini, address `https://generativelanguage.googleapis.com/v1beta`, model **gemini-3.5-transcribe**, Gemini's model made for transcribing). In a trial it transcribed a Spanish test sentence word for word from WAV, M4A and WebM in about 1.3 s and gave an empty text for OGG/Opus music without speech, where gemini-3.5-flash answered a stray word. `VOICE_MODEL` can still name another model.
- The request: one user turn with the sound as `inline_data` (its kind as the type; MP3 as `audio/mp3`, the name Gemini documents) and a short instruction to transcribe exactly, in the spoken language, the transcript only, nothing when there is no speech. The key goes in the header `x-goog-api-key`, never in the address.
- The answer: the text parts of the first candidate without the model's thoughts, joined and trimmed; '' when it holds no words (no speech); `empty-result` when it holds no candidate; a failed request is `provider-error` with its status, as for the other services.
- Gemini takes a request of 20 MB at most and the sound goes into it as base64, so with Gemini a sound may be **14 MB** at most (`too-long` before the service is asked); the other services keep 24 MB.
- The other services (OpenAI, Groq, a custom address) are asked exactly as before.
- After the deployment the reviewer sets `VOICE_PROVIDER=gemini` and the Gemini key in the server's settings file and removes the OpenAI address there (`VOICE_BASE_URL` would override the preset's address). That is configuration, outside this plan's files.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/ai-relay.cjs` | `9f93a19761698adf1ac40f2a98a174c208922b79884ec2452ddba55c2a9eaef9` | `7d74f6c1ad7a18654e940da14b9b51afc56fab22404e106c629ebcc0285d4a82` | 6 |
| `work/wa-replica/ai-relay.test.cjs` | `a299263deaf9766562f58a2ab00767447a47acdd94950578b41e341ed2eca946` | `2f6a41acc766286eb40bb205a954f4d922fe89a78bbde4845e4bb5783e83746b` | 2 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `34386d2bd15c07080c83635aeda09455cde467820f88f25b0f3775a093148200` | `ecc607cba8d93aff4c10cd48925fee42f4ea17e782c726f62671690ea0a1377d` | 2 |
| `replica/build-log.md` | `6f21e87ef3217c1a7749f140cccb8c1f0f1cb1f73fa2615e17768396a86d2da0` | `ca1efd4f13741865dc6ad192985e3ed784bc574a7785ee51b4feac12641e8de8` | 1 append |

- `ai-relay.cjs` — the AI relay. `VOICE_PROVIDERS` lists the speech services; `loadVoiceConfig()` reads `VOICE_PROVIDER`, `VOICE_API_KEY`, `VOICE_BASE_URL` and `VOICE_MODEL` from the settings file; `transcribeAudio(bytes, kind)` (called by `openwa-link.cjs` for a voice note of a chat) sends the sound as a form to `/audio/transcriptions` and returns the trimmed text.
- `ai-relay.test.cjs` — its tests, against a stand-in model service; `upstream.voice` selects how its speech answers.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). This plan changes no page file, so after its build only `validation.json` (written by the validator) differs.

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout bdbc655 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 16`, `fail 0` (15 before this plan) |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (unchanged; they send a 16 MB file twice, allow a few seconds) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-064/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/ai-relay.cjs`, `work/wa-replica/ai-relay.test.cjs` (Step 2)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — `serve.cjs`, `site-*.cjs`, `openwa-link.cjs`, the `fidelity-*` page files, `build-fidelity.cjs`, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`, and any settings file. No file is created by this plan. Do not install anything, and do not call any real AI service.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/064-voice-with-gemini` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): turn voice notes into text with Google Gemini`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese text, backticks and template strings; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 10 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the four files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-064/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-064 && cat > /tmp/wa-scrm-plan-064/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 064: voice notes into text with Google Gemini. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 16 ℹ fail 0 '
has 'Gemini is a voice service' "$W/ai-relay.cjs" "gemini: { name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-3.5-transcribe', native: 'gemini' },"
has 'the sound goes inline into an ordinary request' "$W/ai-relay.cjs" ":generateContent\`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.key }"
has 'the words come without the model thoughts' "$W/ai-relay.cjs" 'function geminiWords(body) {'
has 'a sound too large for Gemini is refused' "$W/ai-relay.cjs" 'const GEMINI_VOICE_MAX = 14 * 1024 * 1024;'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  voiceWithGemini: 'voice notes into text can use Google Gemini"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 语音转文字可以使用 Google Gemini · 2026-11-24'
same 'of the built files only the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE 'validation\.json$')" 0
same 'the relay passes the syntax check' "$(node --check "$W/ai-relay.cjs" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-064/smoke.sh && ls -l /tmp/wa-scrm-plan-064/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/ai-relay.cjs work/wa-replica/ai-relay.test.cjs work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-064/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the tests of the relay pass` (got: ℹ pass 15 ℹ fail 0 ), `Gemini is a voice service`, `the sound goes inline into an ordinary request`, `the words come without the model thoughts`, `a sound too large for Gemini is refused`, `the validator knows it` and `the build log has the entry` (seven checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The relay: Gemini as a speech service; its tests

#### `ai-relay.cjs`

**Edit 2.1** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text
  groq: { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'whisper-large-v3-turbo' },
  other: { name: '自定义服务', baseUrl: '', model: '' },
};
// The kinds of sound the speech services take, and the file name each is sent under.
```

Replace them with:

```text
  groq: { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'whisper-large-v3-turbo' },
  // Gemini has no /audio/transcriptions address: the sound goes inline into an ordinary request to the model
  // (plan 064). Its model for this is the one made for transcribing.
  gemini: { name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-3.5-transcribe', native: 'gemini' },
  other: { name: '自定义服务', baseUrl: '', model: '' },
};
// What Gemini is asked with the sound. Its request may be 20 MB at most, and the sound goes into it as base64 (a
// third larger); MP3 goes under the name Gemini documents for it.
const GEMINI_VOICE_PROMPT = 'Transcribe the speech in this audio exactly as spoken, in the language it is spoken in. Reply with the transcript only, without comments, labels or translation. If there is no speech, reply with nothing.';
const GEMINI_VOICE_MAX = 14 * 1024 * 1024;
const GEMINI_TYPES = { 'audio/mpeg': 'audio/mp3' };
// The kinds of sound the speech services take, and the file name each is sent under.
```

**Edit 2.2** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text
  if (!model) return { configured: false, reason: 'missing-model' };
  return { configured: true, name: preset.name, baseUrl, model, key: values.VOICE_API_KEY };
}
```

Replace them with:

```text
  if (!model) return { configured: false, reason: 'missing-model' };
  return { configured: true, name: preset.name, baseUrl, model, key: values.VOICE_API_KEY, ...(preset.native ? { native: preset.native } : {}) };
}

// The words of a Gemini answer: the text of its first candidate without the model's thoughts; '' when it heard no
// speech; null when the answer holds no candidate at all.
function geminiWords(body) {
  const candidate = Array.isArray(body?.candidates) ? body.candidates[0] : undefined;
  if (!candidate) return null;
  const parts = Array.isArray(candidate.content?.parts) ? candidate.content.parts : [];
  return parts.filter(part => typeof part?.text === 'string' && !part.thought).map(part => part.text).join('');
}
```

**Edit 2.3** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text
  if (!Object.hasOwn(VOICE_FILES, kind)) throw failure(415, 'unsupported-audio');
  if (bytes.length > MAX_VOICE_BYTES) throw failure(413, 'too-long');
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: kind }), VOICE_FILES[kind]);
  form.append('model', config.model);
  form.append('response_format', 'json');
  const started = Date.now();
```

Replace them with:

```text
  if (!Object.hasOwn(VOICE_FILES, kind)) throw failure(415, 'unsupported-audio');
  const gemini = config.native === 'gemini';
  if (bytes.length > (gemini ? GEMINI_VOICE_MAX : MAX_VOICE_BYTES)) throw failure(413, 'too-long');
  const started = Date.now();
```

**Edit 2.4** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text
  try {
    response = await fetch(config.baseUrl + '/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + config.key }, body: form, signal: AbortSignal.timeout(VOICE_TIMEOUT_MS) });
  } catch (error) {
```

Replace them with:

```text
  try {
    if (gemini) {
      const parts = [{ inline_data: { mime_type: GEMINI_TYPES[kind] || kind, data: bytes.toString('base64') } }, { text: GEMINI_VOICE_PROMPT }];
      response = await fetch(`${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.key }, body: JSON.stringify({ contents: [{ role: 'user', parts }] }), signal: AbortSignal.timeout(VOICE_TIMEOUT_MS) });
    } else {
      const form = new FormData();
      form.append('file', new Blob([bytes], { type: kind }), VOICE_FILES[kind]);
      form.append('model', config.model);
      form.append('response_format', 'json');
      response = await fetch(config.baseUrl + '/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + config.key }, body: form, signal: AbortSignal.timeout(VOICE_TIMEOUT_MS) });
    }
  } catch (error) {
```

**Edit 2.5** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text
  const body = response.ok ? await response.json().catch(() => null) : null;
  if (typeof body?.text !== 'string') {
    console.error(`ai transcribe failed error=${response.ok ? 'empty-result' : 'provider-error upstream=' + response.status} ms=${Date.now() - started}`);
```

Replace them with:

```text
  const body = response.ok ? await response.json().catch(() => null) : null;
  const heard = gemini ? geminiWords(body) : body?.text;
  if (typeof heard !== 'string') {
    console.error(`ai transcribe failed error=${response.ok ? 'empty-result' : 'provider-error upstream=' + response.status} ms=${Date.now() - started}`);
```

**Edit 2.6** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text
  }
  const words = body.text.trim();
  console.log(`ai transcribe ok bytes=${bytes.length} chars=${words.length} ms=${Date.now() - started}`);
```

Replace them with:

```text
  }
  const words = heard.trim();
  console.log(`ai transcribe ok bytes=${bytes.length} chars=${words.length} ms=${Date.now() - started}`);
```

#### `ai-relay.test.cjs`

**Edit 2.7** — `work/wa-replica/ai-relay.test.cjs`. Find exactly these lines (they occur once):

```text
    }
    upstream.calls.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(raw || '{}') });
```

Replace them with:

```text
    }
    // Gemini: the sound inline in an ordinary request, the key in a header of its own (plan 064)
    if (req.url.endsWith(':generateContent')) {
      const parts = JSON.parse(raw || '{}').contents?.[0]?.parts || [];
      const sound = parts.find(part => part.inline_data)?.inline_data;
      upstream.calls.push({ url: req.url, key: req.headers['x-goog-api-key'], auth: req.headers.authorization, mime: sound?.mime_type, bytes: sound ? Buffer.from(sound.data, 'base64').length : -1, prompt: parts.some(part => typeof part.text === 'string' && part.text.length > 20) });
      if (upstream.voice === 'error') { res.writeHead(500, { 'Content-Type': 'application/json' }); return res.end('{"error":{"message":"boom"}}'); }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(upstream.voice === 'odd' ? { usage: {} } : { candidates: [{ content: { parts: upstream.voice === 'silent' ? [] : [{ text: 'Listening first…', thought: true }, { text: '  Hola, quiero dos cajas.  ' }] }, finishReason: 'STOP' }] }));
    }
    upstream.calls.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(raw || '{}') });
```

**Edit 2.8** — `work/wa-replica/ai-relay.test.cjs`. Find exactly these lines (they occur once):

```text

test('translate: a translation made once is kept and given again without asking the service; another language or text asks again; a failure is not kept; replies are never kept; without a data folder nothing is kept', async () => {
```

Replace them with:

```text

test('speech to text with Gemini: the preset; the sound inline in an ordinary request with the key in a header of its own; the words of the answer without thoughts; MP3 under its documented name; no speech; failures; a sound too large for Gemini', async () => {
  const wav = Buffer.concat([Buffer.from('RIFF\0\0\0\0WAVEfmt '), Buffer.alloc(40, 3)]);
  const refused = (promise, code, status) => assert.rejects(promise, error => error.message === code && error.status === status);
  configure(['VOICE_PROVIDER=Gemini', 'VOICE_API_KEY=v']);
  assert.deepEqual(relay.loadVoiceConfig(), { configured: true, name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-3.5-transcribe', key: 'v', native: 'gemini' });
  configure(['VOICE_PROVIDER=gemini', `VOICE_API_KEY=${VOICE_KEY}`, `VOICE_BASE_URL=http://127.0.0.1:${upstreamPort}/v1beta/`]);
  const status = await call('/api/ai/status', { method: 'GET' });
  assert.deepEqual(status.json.voice, { configured: true, provider: 'Google Gemini', model: 'gemini-3.5-transcribe' });
  assert(!status.raw.includes(VOICE_KEY));
  upstream.voice = 'ok';
  upstream.calls.length = 0;
  assert.equal(await relay.transcribeAudio(wav, 'audio/ogg'), 'Hola, quiero dos cajas.');
  assert.deepEqual(upstream.calls, [{ url: '/v1beta/models/gemini-3.5-transcribe:generateContent', key: VOICE_KEY, auth: undefined, mime: 'audio/ogg', bytes: wav.length, prompt: true }]);
  await relay.transcribeAudio(wav, 'audio/mpeg');
  assert.equal(upstream.calls[1].mime, 'audio/mp3');
  upstream.voice = 'silent';
  assert.equal(await relay.transcribeAudio(wav, 'audio/wav'), '');
  upstream.voice = 'error';
  await assert.rejects(relay.transcribeAudio(wav, 'audio/wav'), error => error.message === 'provider-error' && error.status === 502 && error.upstream === 500);
  upstream.voice = 'odd';
  await refused(relay.transcribeAudio(wav, 'audio/wav'), 'empty-result', 502);
  upstream.voice = 'ok';
  const calls = upstream.calls.length;
  await refused(relay.transcribeAudio(Buffer.alloc(14 * 1024 * 1024 + 1), 'audio/ogg'), 'too-long', 413);
  await refused(relay.transcribeAudio(wav, 'video/mp4'), 'unsupported-audio', 415);
  assert.equal(upstream.calls.length, calls, 'refused before the service is called');
  assert(!logged.some(line => line.includes(VOICE_KEY)), 'the key is never logged');
});

test('translate: a translation made once is kept and given again without asking the service; another language or text asks again; a failure is not kept; replies are never kept; without a data folder nothing is kept', async () => {
```

What these edits do, so that you can recognise them: in `ai-relay.cjs` the first adds the preset `gemini` and, after `VOICE_PROVIDERS`, `GEMINI_VOICE_PROMPT`, `GEMINI_VOICE_MAX` and `GEMINI_TYPES`; the next makes `loadVoiceConfig` pass on `native` and adds `geminiWords(body)`; the following ones let `transcribeAudio` ask Gemini with the sound inline (the form for the other services is now built only for them) and read the words from either answer. In `ai-relay.test.cjs` the stand-in learns to answer like Gemini at a `:generateContent` address, and one new test comes before the test of kept translations.

**Verify**: `sha256sum work/wa-replica/ai-relay.cjs work/wa-replica/ai-relay.test.cjs` → `7d74f6c1ad7a18654e940da14b9b51afc56fab22404e106c629ebcc0285d4a82`, `2f6a41acc766286eb40bb205a954f4d922fe89a78bbde4845e4bb5783e83746b`; `node --check work/wa-replica/ai-relay.cjs` exits 0; `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 16`, `fail 0`; `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`. If a checksum does not match, restore the file with `git checkout bdbc655 -- <file>` and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 3: The validator — and the build

#### `validate-scrm-lifecycle.cjs`

**Edit 3.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
}
for (const required of ['process.env.WA_SCRM_AI_ENV', "Authorization: 'Bearer ' + config.key", 'module.exports = { handle, loadConfig, loadVoiceConfig, parseEnv, transcribeAudio, translationPrompt, replyPrompt };']) {
  assert(relaySource.includes(required), `ai-relay.cjs is missing ${required}`);
```

Replace them with:

```text
}
for (const required of ['process.env.WA_SCRM_AI_ENV', "Authorization: 'Bearer ' + config.key", 'module.exports = { handle, loadConfig, loadVoiceConfig, parseEnv, transcribeAudio, translationPrompt, replyPrompt };', "gemini: { name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-3.5-transcribe', native: 'gemini' },", "headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.key }", 'if (bytes.length > (gemini ? GEMINI_VOICE_MAX : MAX_VOICE_BYTES)) throw failure(413, \'too-long\');']) {
  assert(relaySource.includes(required), `ai-relay.cjs is missing ${required}`);
```

**Edit 3.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  replyWordsKeptBack: 'the words a seller typed are kept by the relay as the translation of the sent reply back into the seller\'s reading language (when written in it), so that another workspace of this server receiving the reply shows the seller\'s own words',
```

Replace them with:

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  voiceWithGemini: 'voice notes into text can use Google Gemini (VOICE_PROVIDER=gemini, model gemini-3.5-transcribe): the sound goes inline into a generateContent request with the key in its own header, 14 MB at most; the answer\'s words without the model\'s thoughts',
  replyWordsKeptBack: 'the words a seller typed are kept by the relay as the translation of the sent reply back into the seller\'s reading language (when written in it), so that another workspace of this server receiving the reply shows the seller\'s own words',
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `ecc607cba8d93aff4c10cd48925fee42f4ea17e782c726f62671690ea0a1377d`; `git checkout bdbc655 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `outputs/wa-replica-prototype/validation.json` and nothing else (if `icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). If the checksum does not match, restore the file with `git checkout bdbc655 -- <file>` and apply its instructions again; if it still does not match, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 语音转文字可以使用 Google Gemini · 2026-11-24

AI 中转的「语音转文字」新增 Google Gemini 作为服务：在服务器的 AI 设置文件里写 `VOICE_PROVIDER=gemini` 和 Gemini 的密钥即可，默认使用 Gemini 专门用于转写的模型 gemini-3.5-transcribe。

- Gemini 没有 OpenAI 那样的转写接口，所以语音直接放在一次普通的模型请求里发送；密钥放在请求头里，不会出现在地址或日志中。
- WhatsApp 语音（OGG/Opus）以及 MP3、M4A、WAV、WebM 声音文件都可以转写；没有说话声时得到空文字。
- Gemini 一次请求最多 20 MB，所以用 Gemini 时单个声音文件最多 14 MB（WhatsApp 语音一般远小于此）。
- 原来的 OpenAI、Groq 等设置照常可用；聊天翻译的设置不受影响。

验证：AI 中转测试新增一项（预设、请求的形式与密钥的位置、去掉模型的思考内容、MP3 的类型名称、没有说话声、服务出错、文件过大）；构建与校验脚本通过。上线前用真实的 Gemini 服务试过：一句西班牙语录音以 WAV、M4A、WebM 发送都逐字转写正确（约 1 秒）；一段 OGG/Opus 格式、没有说话声的音乐被接受并得到空文字。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout bdbc655 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-064/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `ca1efd4f13741865dc6ad192985e3ed784bc574a7785ee51b4feac12641e8de8`; `git status --porcelain` lists exactly these five as changed and nothing as new: the four files of the table in "Current state" and `outputs/wa-replica-prototype/validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Tests of the relay** (16; one new): the preset (name, address, model, `native`); the status names the service and model, never the key; one request to `/v1beta/models/gemini-3.5-transcribe:generateContent` with the key in `x-goog-api-key`, no Authorization header, the sound inline with its kind and the instruction; the words without the model's thoughts, trimmed; MP3 as `audio/mp3`; no speech gives ''; a failing service gives `provider-error` with its status; an answer without a candidate gives `empty-result`; a sound over 14 MB and a kind that is no sound are refused before the service is asked; the key never reaches the log. The earlier test of the other services stays as it is.
- **Tests of the link** (23, unchanged) — they call `transcribeAudio` through the voice-note route.
- **Validator** — the preset, the header of the key, the limit.
- **Smoke** (`/tmp/wa-scrm-plan-064/smoke.sh`) — the same facts, both test files, which built files changed and the syntax of the relay.
- **Verified by the reviewer, not by you**: the relay of this plan against the real Gemini service with test sounds (a Spanish sentence as WAV, M4A and WebM word for word; OGG/Opus music without speech gives ''); the browser suite of WhatsApp; after the deployment, the server's settings and one test sound through the live relay.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout bdbc655 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 16`, `fail 0`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-064/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/ai-relay.cjs` → `7d74f6c1ad7a18654e940da14b9b51afc56fab22404e106c629ebcc0285d4a82`
- [ ] `sha256sum work/wa-replica/ai-relay.test.cjs` → `2f6a41acc766286eb40bb205a954f4d922fe89a78bbde4845e4bb5783e83746b`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `ecc607cba8d93aff4c10cd48925fee42f4ea17e782c726f62671690ea0a1377d`
- [ ] `sha256sum replica/build-log.md` → `ca1efd4f13741865dc6ad192985e3ed784bc574a7785ee51b4feac12641e8de8`
- [ ] `git diff --name-only bdbc655..HEAD -- outputs` lists `outputs/wa-replica-prototype/validation.json` and nothing else
- [ ] `git diff --name-only bdbc655..HEAD -- . ':!plans'` lists exactly five paths: the four of the table in "Current state" and `validation.json`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, or a test fails.
- An output file other than `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file, creating a file, installing a package or calling a real AI service.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; then, in the AI settings file the containers read (edit it in place — they see it through single-file mounts), `VOICE_PROVIDER=gemini`, `VOICE_API_KEY=<the Gemini key>` and no `VOICE_BASE_URL`. No restart is needed for a settings change: the relay reads the file for every request.
- Gemini may rename or retire `gemini-3.5-transcribe`; `VOICE_MODEL` names another one without a code change.
- What a reviewer should scrutinise: that the key goes only into the header; that the other services are asked exactly as before; that thoughts are never taken as words; that the 14 MB limit applies only to Gemini.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
