# Plan 042: The messages of a conversation are translated once, when it is opened, and the result is kept

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 88d6dd5..HEAD -- work/wa-replica replica/build-log.md outputs README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM (the server's AI relay gets a store; the page decides when a message is sent to the model service — a mistake costs money or leaves messages untranslated; exact text and checksums for every edit)
- **Depends on**: plans/041-remove-an-ended-follow-up.md (DONE)
- **Category**: feature (owner request)
- **Planned at**: commit `88d6dd5`, 2026-11-22

## Why this matters

Only a message that arrived while the page was open was translated. Messages fetched from WhatsApp when a number was linked, and every message that had been sent, carried no translation — in the owner's workspace 7 of 422 customer messages had one. The owner, 2026-11-22: "There is no real-time translation for our current or past chat conversations. Translation should be handled by processing all untranslated content and caching the results in a database, rather than re-translating everything every time a chat is opened — that wastes far too many API tokens."

Asked when the old messages are to be translated, the owner chose "When a chat is opened": the first time a conversation is opened, its messages without a translation — of both sides — are translated once and kept; conversations nobody opens cost nothing; new messages are translated as they arrive.

What this plan does:

- **The page translates a message at most once for a reading language.** The translation is kept on the message together with the language it was made for (`translatedTo`) and saved with the conversation, as every change of a conversation is. A message that is already in the reading language is marked the same way and carries no translation. What is marked is never asked for again.
- **The conversation on screen asks for what is missing**: every time the page is drawn with a conversation open, the messages of that conversation that are not marked are put in a line — the newest first, two requests at a time. A message without words (the note that stands for a picture or a file, a text without letters) is not asked for. After three failures in a row the line is let go and nothing is asked for a minute.
- **The relay keeps what it has translated** in a file of the server's data folder (`ai-translations.db`) under a fingerprint of the language and the text, and gives it again: equal texts cost one request to the model service, in whatever conversation they stand. An answer from that store is marked (`cached: true`) and is no call in the page's usage figures.
- **What the page itself sends is never asked for**: it is marked when it is sent, and a reply that was put into the customer's language keeps what the employee typed as its translation.
- A translation is shown below a message of either side (until now only below incoming ones). A message typed on the phone, or changed afterwards, is translated when it arrives, like one from the customer. The capability is called "会话消息翻译" from now on.

### Decisions already made (do not re-open; do not ask)

- A translation that was made before the marks existed (a message with `translated` and no `translatedTo`) is left as it is and not asked for again.
- When the reading language is changed on the AI page, a conversation is translated anew into the new language when it is next opened; until then it shows what it has.
- The store of the relay holds the translation and a fingerprint (SHA-256) of language and text, not the text itself. It has no limit of its own and may be deleted at any time; after that equal texts are translated again.
- Without the data folder (`WA_SCRM_DATA_DIR`), or when the store cannot be used, the relay keeps nothing and works as before.
- Replies (`/api/ai/reply`) are not kept: they depend on tone, business description and the recent chat.
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/ai-relay.cjs` | `d597bb72854be3da4a22dca66229b41418c6316fb5295938a1989fd6e5177723` | `9d4d18dc84a7d43502c03d6061723ac977515efce2661f60ede7c437dbbd07a7` |
| `work/wa-replica/ai-relay.test.cjs` | `de997c3d3587c1373823ef3b0c5da6abe5a340c5a472d61a20b38096e1643ab7` | `29aee3e5c97bf0ff43512d81358fc7a03a93475cb9de0e157d6a16f01b80469b` |
| `work/wa-replica/fidelity-ai.js` | `6289f8266361967982e71e5963d21788feb969d05196e4c6432f0f1b0bde7a48` | `a2b7710001b0d2d202b3dcce618ea38fe0a7846020d2cf3bd550c825eb40003e` |
| `work/wa-replica/fidelity-openwa.js` | `513302e635805980f81b5159b7a9ead6623951b1fe2707e52fd6a2d7e5592694` | `af519e30a886ea494f82e372fed414ad3b6defc5dd5f228d19b0a95b3cf246f7` |
| `work/wa-replica/build-fidelity.cjs` | `1c3107cbaf26cdef67a991ba28f433c42fe2b82c7edc318f68f88aa6292db87d` | `4e878e72ae65590b349282dfeedc52da1e55878a3836df97c6de939819c594e3` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `4aee3ca6e5fddd9a576b653097dffd07241424b300c7b74875285880d3de3db7` | `a18e892c58c3b63b442444773c3fbaad0ebac4afc76a01f2ca9cc7d1901ab491` |
| `README.md` | `a64cbc43e09fabc78674dc1b1c29f1938ef101a59931b4f667327dfd946540f2` | `a9e8456cca598c4fdf084c11fdd7bfd3158a892a9a5e9cc975671979113ebc5d` |

- `ai-relay.cjs` — the server's AI relay: `POST /api/ai/translate { text, to }` asks the model service and answers `{ text }`; a text already in the language `to` comes back unchanged. `ai-relay.test.cjs` — its tests (13) with a stand-in model service.
- `fidelity-ai.js` — the page module of the AI capabilities. `aiRun(capabilityId, input, meta)` is the one entry for every call and records its usage; `aiTranslateInbound(c, message)` translated one incoming message and drew the open conversation again; `aiRedraw(c)` draws the open conversation again; `aiGuardNeutral(text)` says whether a text has no words.
- `fidelity-openwa.js` — the chat module: `send` makes the message the employee sends (`outgoing` is the translation of what was typed when one was made), and the feed's handler makes the messages that arrive (`e.history` marks what was fetched while catching up; `e.fromMe` what the number itself sent). `openwaMediaText` holds the notes that stand for a picture, a voice note, a video or a file.
- `build-fidelity.cjs` — the build; one `swap` decides below which messages a translation is shown.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page; a block is added.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 88d6dd5 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Syntax of the page modules | `node -e "for(const f of ['fidelity-ai.js','fidelity-openwa.js'])new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/'+f,'utf8')+'})');console.log('SYNTAX_OK')"` | `SYNTAX_OK` |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 14`, `fail 0` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 12`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-042/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/ai-relay.cjs`, `ai-relay.test.cjs` (Step 2)
- `work/wa-replica/fidelity-ai.js`, `fidelity-openwa.js`, `build-fidelity.cjs`, `validate-scrm-lifecycle.cjs` (Step 3)
- `README.md`, `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{app.js,validation.json}` (the other output files, `icons.js` among them, must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular `serve.cjs`, `site-*.cjs`, `openwa-link.cjs`, `fidelity-boot.js`, the other page modules, the style sheets, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/042-translate-a-conversation-once` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): translate the messages of a conversation once and keep the result`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the seven files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-042/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-042 && cat > /tmp/wa-scrm-plan-042/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that a message is translated once: kept by the relay, kept on the message, asked for when its
# conversation is on screen. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the tests of the relay pass, with the one for kept translations' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
has 'the relay keeps its translations in a file of the data folder' "$W/ai-relay.cjs" "new DatabaseSync(path.join(dir, 'ai-translations.db'))"
has 'a kept translation is given again without asking the service' "$W/ai-relay.cjs" "if (typeof known === 'string') return { text: known, inputChars: text.length, cached: true };"
has 'a translation is kept on its message with the language it was made for' "$P/app.js" 'message.translatedTo = language;'
has 'the conversation on screen asks for its messages without a translation' "$P/app.js" 'if (c) aiTranslateConversation(c);'
has 'an answer from the store is no call in the usage' "$P/app.js" 'if (!kept) aiRecordUsage(capabilityId, providerId, input, result, meta);'
has 'what the page sends is marked and never asked for' "$P/app.js" 'translatedTo: aiSettings().readLanguage, ...(outgoing !== text ? { translated: text } : {}) };'
has 'a translation is shown below a message of either side' "$P/app.js" 'm.translated&&showTranslation?'
same 'no translation is tied to incoming messages only' "$(grep -c "m.side==='in'&&m.translated" "$P/app.js")" 0
has 'the README says where translations are kept' "$ROOT/README.md" 'ai-translations.db'
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 会话消息只翻译一次，打开会话时补译'
same 'the relay passes the syntax check' "$(node --check "$W/ai-relay.cjs" 2>&1 && echo SYNTAX_OK)" SYNTAX_OK
same 'the page modules pass the syntax check' "$(cd "$ROOT" && node -e "for(const f of ['fidelity-ai.js','fidelity-openwa.js'])new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/'+f,'utf8')+'})');console.log('SYNTAX_OK')" 2>&1)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-042/smoke.sh && ls -l /tmp/wa-scrm-plan-042/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/ai-relay.cjs work/wa-replica/ai-relay.test.cjs work/wa-replica/fidelity-ai.js work/wa-replica/fidelity-openwa.js work/wa-replica/build-fidelity.cjs work/wa-replica/validate-scrm-lifecycle.cjs README.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-042/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the tests of the relay pass, with the one for kept translations` (got: ℹ pass 13 ℹ fail 0 ), `the relay keeps its translations in a file of the data folder`, `a kept translation is given again without asking the service`, `a translation is kept on its message with the language it was made for`, `the conversation on screen asks for its messages without a translation`, `an answer from the store is no call in the usage`, `what the page sends is marked and never asked for`, `no translation is tied to incoming messages only` (got: 1), `the README says where translations are kept` and `the build log has the entry` (ten checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The relay keeps its translations

#### `ai-relay.cjs`

**Edit 2.1** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text
// settings file names with VOICE_PROVIDER, VOICE_API_KEY and, optionally, VOICE_BASE_URL and VOICE_MODEL.
const fs = require('node:fs');

```

Replace them with:

```text
// settings file names with VOICE_PROVIDER, VOICE_API_KEY and, optionally, VOICE_BASE_URL and VOICE_MODEL.
// A translation that was made once is kept in the server's data folder and given again: see translationStore.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

```

**Edit 2.2** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text

// KEY=VALUE lines. Blank lines and lines starting with # are ignored; Windows line endings are accepted.
```

Replace them with:

```text

// Translations that were made once are kept and given again, so the same text is not sent to the model service a
// second time for the same language. They are kept in the file ai-translations.db of the server's data folder
// (WA_SCRM_DATA_DIR; built-in SQLite, Node 22.13 or newer); without that folder, or when the file cannot be
// used, nothing is kept and every request goes to the service. A row holds a fingerprint of the language and
// the text — never the text itself — and the translation.
let kept = null;
function translationStore() {
  const dir = process.env.WA_SCRM_DATA_DIR;
  if (!dir) return null;
  if (kept?.dir === dir) return kept;
  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(path.join(dir, 'ai-translations.db'));
    db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS translations (key TEXT PRIMARY KEY, text TEXT NOT NULL, at TEXT NOT NULL);
    `);
    const get = db.prepare('SELECT text FROM translations WHERE key = ?');
    const put = db.prepare('INSERT INTO translations (key, text, at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET text = excluded.text, at = excluded.at');
    kept = {
      dir,
      get(key) { try { return get.get(key)?.text; } catch { return undefined; } },
      put(key, text) { try { put.run(key, text, new Date().toISOString()); } catch {} },
    };
  } catch {
    kept = { dir, get: () => undefined, put: () => {} };
  }
  return kept;
}
const translationKey = (to, text) => crypto.createHash('sha256').update(to + '\n' + text).digest('hex');

// KEY=VALUE lines. Blank lines and lines starting with # are ignored; Windows line endings are accepted.
```

**Edit 2.3** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text
  if (text.length > MAX_TEXT) throw failure(413, 'too-long');
  return { text: await askModel(config, translationPrompt(to), text), inputChars: text.length };
}
```

Replace them with:

```text
  if (text.length > MAX_TEXT) throw failure(413, 'too-long');
  // A translation made before is given again without asking the service.
  const store = translationStore(), key = translationKey(to, text), known = store?.get(key);
  if (typeof known === 'string') return { text: known, inputChars: text.length, cached: true };
  const translated = await askModel(config, translationPrompt(to), text);
  store?.put(key, translated);
  return { text: translated, inputChars: text.length };
}
```

**Edit 2.4** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text
      const result = await run(await readJson(req), config);
      console.log(`ai ${name} ok chars=${result.inputChars}->${result.text.length} ms=${Date.now() - started}`);
      return sendJson(res, 200, { text: result.text });
    } catch (error) {
```

Replace them with:

```text
      const result = await run(await readJson(req), config);
      console.log(`ai ${name} ok chars=${result.inputChars}->${result.text.length} ms=${Date.now() - started}${result.cached ? ' kept' : ''}`);
      return sendJson(res, 200, result.cached ? { text: result.text, cached: true } : { text: result.text });
    } catch (error) {
```

#### `ai-relay.test.cjs`

**Edit 2.5** — `work/wa-replica/ai-relay.test.cjs`. Find exactly these lines (they occur once):

```text

test('the log never holds the key or message text', () => {
```

Replace them with:

```text

test('translate: a translation made once is kept and given again without asking the service; another language or text asks again; a failure is not kept; replies are never kept; without a data folder nothing is kept', async () => {
  configure();
  const dir = fs.mkdtempSync(path.join(tmp, 'kept-'));
  const translation = '你们可以把 BX20 发到波多黎各吗？';
  const ask = (text, to = '中文') => call('/api/ai/translate', { body: { text, to } });
  process.env.WA_SCRM_DATA_DIR = dir;
  try {
    upstream.mode = 'ok';
    upstream.calls.length = 0;
    const first = await ask('Kept once: do you ship to Ponce?');
    assert.deepEqual([first.status, first.json], [200, { text: translation }]);
    assert.equal(upstream.calls.length, 1);
    // the same text again, also with spaces around it: from the store
    for (const text of ['Kept once: do you ship to Ponce?', '  Kept once: do you ship to Ponce?\n']) {
      const again = await ask(text);
      assert.deepEqual([again.status, again.json], [200, { text: translation, cached: true }]);
    }
    assert.equal(upstream.calls.length, 1, 'the service was not asked again');
    // another language and another text are other translations
    assert.equal((await ask('Kept once: do you ship to Ponce?', 'English')).json.cached, undefined);
    assert.equal((await ask('Kept once: do you ship to Ponce')).json.cached, undefined);
    assert.equal(upstream.calls.length, 3);
    // a failure is not kept: the next request asks the service again
    upstream.mode = 'error';
    assert.equal((await ask('Fails the first time')).status, 502);
    upstream.mode = 'ok';
    assert.deepEqual((await ask('Fails the first time')).json, { text: translation });
    assert.equal(upstream.calls.length, 5);
    // a kept translation is given even while the service is down
    upstream.mode = 'error';
    assert.deepEqual((await ask('Kept once: do you ship to Ponce?')).json, { text: translation, cached: true });
    upstream.mode = 'ok';
    // the file holds the translation under a fingerprint, never the text that was translated
    const files = fs.readdirSync(dir).filter(name => name.startsWith('ai-translations.db'));
    assert(files.includes('ai-translations.db'), 'the store is a file of the data folder: ' + files);
    const bytes = Buffer.concat(files.map(name => fs.readFileSync(path.join(dir, name)))).toString('utf8');
    assert(bytes.includes(translation) && !bytes.includes('Kept once') && !bytes.includes('Ponce'), 'the store holds no text that was translated');
    // a reply depends on tone and chat: never kept
    upstream.calls.length = 0;
    for (let i = 0; i < 2; i++) assert.equal((await call('/api/ai/reply', { body: { text: '请问需要几箱？', to: 'English' } })).json.cached, undefined);
    assert.equal(upstream.calls.length, 2);
    // the log says that an answer came from the store, without the text
    assert(logged.some(line => /^ai translate ok chars=\d+->\d+ ms=\d+ kept$/.test(line)), 'a kept answer is marked in the log');
  } finally {
    delete process.env.WA_SCRM_DATA_DIR;
  }
  // without a data folder nothing is kept
  upstream.calls.length = 0;
  for (let i = 0; i < 2; i++) assert.deepEqual((await ask('Kept once: do you ship to Ponce?')).json, { text: translation });
  assert.equal(upstream.calls.length, 2);
});

test('the log never holds the key or message text', () => {
```

**Verify**: `sha256sum work/wa-replica/ai-relay.cjs work/wa-replica/ai-relay.test.cjs` → `9d4d18dc84a7d43502c03d6061723ac977515efce2661f60ede7c437dbbd07a7`, `29aee3e5c97bf0ff43512d81358fc7a03a93475cb9de0e157d6a16f01b80469b`; `node --check work/wa-replica/ai-relay.cjs` exits 0; `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 14`, `fail 0`. If a checksum does not match, restore the file with `git checkout 88d6dd5 -- <file>` and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 3: The page translates a conversation once

#### `fidelity-ai.js`

**Edit 3.1** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
  const AI_CAPABILITIES = [
    { id: 'translate.inbound', name: '接收消息翻译', description: '把客户发来的消息译为所选的译文语言，显示在原文下方。' },
    { id: 'translate.outbound', name: '发送前翻译', description: '把你输入的回复和快捷回复译为客户的语言，发送前可预览。' },
```

Replace them with:

```text
  const AI_CAPABILITIES = [
    { id: 'translate.inbound', name: '会话消息翻译', description: '把会话里的消息译为所选的译文语言，显示在原文下方。每条消息只翻译一次，译文保存后不再重复翻译；打开会话时补译还没有译文的消息。' },
    { id: 'translate.outbound', name: '发送前翻译', description: '把你输入的回复和快捷回复译为客户的语言，发送前可预览。' },
```

**Edit 3.2** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
      .then(() => AI_PROVIDERS[providerId].run(capabilityId, input))
      .then(output => String(output?.text || ''), () => '')
      .then(text => {
        const result = { ok: Boolean(text), text };
        aiRecordUsage(capabilityId, providerId, input, result, meta);
        return result;
```

Replace them with:

```text
      .then(() => AI_PROVIDERS[providerId].run(capabilityId, input))
      .then(output => ({ text: String(output?.text || ''), kept: output?.cached === true }), () => ({ text: '', kept: false }))
      .then(({ text, kept }) => {
        const result = { ok: Boolean(text), text };
        // A translation the server had kept was not made again: it is no call to the model service.
        if (!kept) aiRecordUsage(capabilityId, providerId, input, result, meta);
        return result;
```

**Edit 3.3** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
      body: JSON.stringify({ text: input.text, to: input.to }),
    }).then(response => response.json().then(body => response.ok ? { text: body.text } : Promise.reject(new Error('relay ' + body.error))));
  }
```

Replace them with:

```text
      body: JSON.stringify({ text: input.text, to: input.to }),
    }).then(response => response.json().then(body => response.ok ? { text: body.text, cached: body.cached === true } : Promise.reject(new Error('relay ' + body.error))));
  }
```

**Edit 3.4** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text

  // Translate one incoming message into the reading language chosen on the AI page. The translation is stored
  // on the message when it arrives, and the open conversation is refreshed if it is the one on screen.
  // A message that is already in the reading language comes back unchanged and gets no translation.
  function aiTranslateInbound(c, message) {
    return aiRun('translate.inbound', { text: message.text, to: aiSettings().readLanguage }, { customerId: c.id }).then(result => {
      if (!result.ok || result.text.trim() === message.text.trim()) return;
      message.translated = result.text;
      if (c.preview === message.text) c.translation = result.text;
      persist();
      const box = $('#messages');
      if (ui.view !== 'inbox' || !box || box.dataset.customer !== c.id) return;
      const atBottom = box.scrollHeight - box.clientHeight - box.scrollTop <= 40;
      openwaKeepPlaying(() => {
        box.innerHTML = messagesHTML(c);
      });
      paintIcons(box);
      if (atBottom) scrollMessages();
    });
  }
```

Replace them with:

```text

  // ---- translation of the messages of a conversation ----
  // A message is translated at most once for a reading language. Its translation is kept on the message with
  // the language it was made for (translatedTo) and saved with the conversation; a message that is already in
  // the reading language is marked the same way and carries no translation. What is marked is never asked for
  // again: opening a conversation asks only for its messages that are not marked yet, the newest first, and a
  // message that arrives is asked for once. (A translation made before this marking existed carries no
  // language; it is left as it is.) The server keeps every translation too, so equal texts cost one request.
  const AI_TRANSLATE_AT_ONCE = 2;        // requests on their way at the same time
  const AI_TRANSLATE_GIVE_UP = 3;        // failures in a row after which the waiting messages are let go …
  const AI_TRANSLATE_PAUSE_MS = 60000;   // … and nothing more is asked for this long
  const aiWaiting = [];                  // [customer, message] pairs waiting for their turn
  const aiAsked = new Set();             // ids of the messages that wait or are on their way
  let aiOnTheWay = 0, aiFailuresInARow = 0, aiPausedUntil = 0;

  // Whether a message has words to translate: not the note that stands for a picture or a file, not a
  // withdrawn message, not a text without letters.
  function aiTranslatable(message) {
    const text = String(message.text || '').trim();
    return Boolean(text) && !message.revoked && text !== openwaMediaText[message.type] && text !== '[消息]' && !aiGuardNeutral(text);
  }
  const aiWantsTranslation = (message, language) => aiTranslatable(message) && !aiAsked.has(message.id)
    && (message.translatedTo ? message.translatedTo !== language : !message.translated);

  // Puts messages of a customer in the line. `first` puts them in front of what waits already: the conversation
  // on screen comes before messages that arrive elsewhere.
  function aiTranslateSoon(c, messages, first = false) {
    const settings = aiSettings();
    if (!settings.enabled['translate.inbound'] || !aiRuntime.provider || Date.now() < aiPausedUntil) return;
    const pairs = messages.filter(message => aiWantsTranslation(message, settings.readLanguage)).map(message => [c, message]);
    for (const [, message] of pairs) aiAsked.add(message.id);
    if (first) aiWaiting.unshift(...pairs);
    else aiWaiting.push(...pairs);
    aiTranslateNext();
  }
  function aiTranslateNext() {
    while (aiOnTheWay < AI_TRANSLATE_AT_ONCE && aiWaiting.length) {
      const [c, message] = aiWaiting.shift(), text = message.text, language = aiSettings().readLanguage;
      aiOnTheWay += 1;
      aiRun('translate.inbound', { text, to: language }, { customerId: c.id }).then(result => {
        aiOnTheWay -= 1;
        aiAsked.delete(message.id);
        if (result.ok && message.text === text) {
          aiFailuresInARow = 0;
          message.translatedTo = language;
          if (result.text.trim() === text.trim()) delete message.translated;
          else message.translated = result.text;
          if (message.translated && c.preview === text) c.translation = message.translated;
          persist();
          aiRedraw(c);
        } else if (!result.ok && !result.skipped && ++aiFailuresInARow >= AI_TRANSLATE_GIVE_UP) {
          // The service does not answer: what waits is let go, and asked for again when its conversation is
          // drawn after the pause.
          for (const [, waiting] of aiWaiting.splice(0)) aiAsked.delete(waiting.id);
          aiFailuresInARow = 0;
          aiPausedUntil = Date.now() + AI_TRANSLATE_PAUSE_MS;
        }
        aiTranslateNext();
      });
    }
  }
  // One message that has just arrived or was changed.
  function aiTranslateInbound(c, message) {
    aiTranslateSoon(c, [message]);
  }
  // The conversation on screen: its messages that carry no translation yet, the newest first.
  function aiTranslateConversation(c) {
    aiTranslateSoon(c, (data.messages[c.id] || []).slice().reverse(), true);
  }
```

**Edit 3.5** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
    if (ui.view !== 'inbox' || !box || box.dataset.customer !== c.id) return;
    const atBottom = box.scrollHeight - box.clientHeight - box.scrollTop <= 40;
    openwaKeepPlaying(() => {
```

Replace them with:

```text
    if (ui.view !== 'inbox' || !box || box.dataset.customer !== c.id) return;
    const atBottom = box.scrollHeight - box.clientHeight - box.scrollTop <= 40, fromEnd = box.scrollHeight - box.scrollTop;
    openwaKeepPlaying(() => {
```

**Edit 3.6** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
    paintIcons(box);
    if (atBottom) scrollMessages();
  }
```

Replace them with:

```text
    paintIcons(box);
    // At its end the conversation stays at its end; further up, what is being read stays where it is while
    // translations come in above it.
    if (atBottom) scrollMessages();
    else box.scrollTop = box.scrollHeight - fromEnd;
  }
```

**Edit 3.7** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text

  aiDetectRelay();
```

Replace them with:

```text

  // Every time the page is drawn with a conversation on screen, the messages of that conversation that carry no
  // translation yet are put in the line. What is marked or already in the line is passed over, so a redraw
  // costs nothing.
  const aiDraw = render;
  render = function() {
    aiDraw();
    const box = $('#messages'), c = ui.view === 'inbox' && box ? customer(box.dataset.customer) : null;
    if (c) aiTranslateConversation(c);
  };

  aiDetectRelay();
```

#### `fidelity-openwa.js`

**Edit 3.8** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
    const d = draft(c), outgoing = d.translated && d.source === text ? d.translated : text;
    const message = { id: nextId('m'), side: 'out', text: outgoing, time: openwaClock(), at: Date.now(), request: nextId('r'), status: 'sending' };
    (data.messages[c.id] ??= conversationMessages(c)).push(message);
```

Replace them with:

```text
    const d = draft(c), outgoing = d.translated && d.source === text ? d.translated : text;
    // What the employee sends from here is never asked for: it is marked as read in the reading language, and a
    // reply that was put into the customer's language keeps what was typed as its translation.
    const message = { id: nextId('m'), side: 'out', text: outgoing, time: openwaClock(), at: Date.now(), request: nextId('r'), status: 'sending', translatedTo: aiSettings().readLanguage, ...(outgoing !== text ? { translated: text } : {}) };
    (data.messages[c.id] ??= conversationMessages(c)).push(message);
```

**Edit 3.9** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
      Object.assign(m, e.kind === 'revoked' ? { text: '此消息已撤回', revoked: true, translated: '' } : { text: e.text, edited: true, translated: '' });
      if ((data.messages[c.id] || []).at(-1) === m) c.preview = m.text;
      if (e.kind === 'edited' && m.side === 'in') aiTranslateInbound(c, m);
      return true;
```

Replace them with:

```text
      Object.assign(m, e.kind === 'revoked' ? { text: '此消息已撤回', revoked: true, translated: '' } : { text: e.text, edited: true, translated: '' });
      delete m.translatedTo;
      if ((data.messages[c.id] || []).at(-1) === m) c.preview = m.text;
      if (e.kind === 'edited') aiTranslateInbound(c, m);
      return true;
```

**Edit 3.10** — `work/wa-replica/fidelity-openwa.js`. Find exactly these lines (they occur once):

```text
      if (closed) lcLog(c.id, 'inbound', '已结束跟进的客户主动发来新消息（触发复联信号）');
      if (e.type === 'text' && e.text) aiTranslateInbound(c, message);
    }
    return true;
```

Replace them with:

```text
      if (closed) lcLog(c.id, 'inbound', '已结束跟进的客户主动发来新消息（触发复联信号）');
    }
    if (!e.history && e.type === 'text' && e.text) aiTranslateInbound(c, message);
    return true;
```

#### `build-fidelity.cjs`

**Edit 3.11** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
swap("  function messagesHTML(c) {\n    const list=data.messages[c.id]||(c.preview==='新建客户档案'?[]:[{id:'seed'+c.id,side:'in',text:c.preview,translated:c.translation,time:c.last}]);\n    if(!list.length)return empty('还没有会话消息','写一条演示消息，或选择快捷回复开始。');", "  function conversationMessages(c) {\n    return data.messages[c.id]||(c.preview==='新建客户档案'?[]:[{id:'seed'+c.id,side:'in',text:c.preview,translated:c.translation,time:c.last}]);\n  }\n  function messagesHTML(c,{list=conversationMessages(c),showTranslation=ui.receiveTranslation,emptyHint='写一条演示消息，或选择快捷回复开始。'}={}) {\n    if(!list.length)return empty('还没有会话消息',emptyHint);");
swap("m.side==='in'&&m.translated&&ui.receiveTranslation?", "m.side==='in'&&m.translated&&showTranslation?");
swap(
```

Replace them with:

```text
swap("  function messagesHTML(c) {\n    const list=data.messages[c.id]||(c.preview==='新建客户档案'?[]:[{id:'seed'+c.id,side:'in',text:c.preview,translated:c.translation,time:c.last}]);\n    if(!list.length)return empty('还没有会话消息','写一条演示消息，或选择快捷回复开始。');", "  function conversationMessages(c) {\n    return data.messages[c.id]||(c.preview==='新建客户档案'?[]:[{id:'seed'+c.id,side:'in',text:c.preview,translated:c.translation,time:c.last}]);\n  }\n  function messagesHTML(c,{list=conversationMessages(c),showTranslation=ui.receiveTranslation,emptyHint='写一条演示消息，或选择快捷回复开始。'}={}) {\n    if(!list.length)return empty('还没有会话消息',emptyHint);");
// A translation is shown below a message of either side (plan 042).
swap("m.side==='in'&&m.translated&&ui.receiveTranslation?", "m.translated&&showTranslation?");
swap(
```

#### `validate-scrm-lifecycle.cjs`

**Edit 3.12** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
// The page's start-up script talks to the account and data routes only (the app itself to the AI relay only, section 3).
const bootSource = read(path.join(__dirname, 'fidelity-boot.js'));
```

Replace them with:

```text
// The page's start-up script talks to the account and data routes only (the app itself to the AI relay only, section 3).
// A message is translated once. The page keeps the translation on the message with the language it was made
// for and asks only for the messages of the conversation on screen that are not marked; the relay keeps every
// translation it has made and gives it again; an answer from that store is no call to the model service.
for (const required of ['const aiWantsTranslation = (message, language) => aiTranslatable(message) && !aiAsked.has(message.id)', '&& (message.translatedTo ? message.translatedTo !== language : !message.translated);', 'message.translatedTo = language;', 'function aiTranslateConversation(c) {', 'if (c) aiTranslateConversation(c);', 'if (!kept) aiRecordUsage(capabilityId, providerId, input, result, meta);', 'const AI_TRANSLATE_AT_ONCE = 2;']) {
  assert(aiSource.includes(required), `fidelity-ai.js is missing ${required}`);
}
assert.equal((aiSource.match(/aiRun\('translate\.inbound'/g) || []).length, 2, 'messages are translated in one place (the line), the words of a voice note in another');
for (const required of ["translatedTo: aiSettings().readLanguage, ...(outgoing !== text ? { translated: text } : {}) };", "if (!e.history && e.type === 'text' && e.text) aiTranslateInbound(c, message);", 'delete m.translatedTo;']) {
  assert(openwaSource.includes(required), `fidelity-openwa.js is missing ${required}`);
}
for (const required of ["new DatabaseSync(path.join(dir, 'ai-translations.db'))", "const translationKey = (to, text) => crypto.createHash('sha256').update(to + '\\n' + text).digest('hex');", "if (typeof known === 'string') return { text: known, inputChars: text.length, cached: true };", 'store?.put(key, translated);']) {
  assert(read(path.join(__dirname, 'ai-relay.cjs')).includes(required), `ai-relay.cjs is missing ${required}`);
}
assert(appJs.includes('m.translated&&showTranslation?') && !appJs.includes("m.side==='in'&&m.translated"), 'a translation must be shown below a message of either side');
const bootSource = read(path.join(__dirname, 'fidelity-boot.js'));
```

**Edit 3.13** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  priceList: 'an .xlsx or .csv file is read in the browser (pricefile.js) and, once confirmed, replaces the list; the button 报价 beside the message box puts one product\'s price into the message box and sends nothing',
  externalNetworkCalls: false,
```

Replace them with:

```text
  priceList: 'an .xlsx or .csv file is read in the browser (pricefile.js) and, once confirmed, replaces the list; the button 报价 beside the message box puts one product\'s price into the message box and sends nothing',
  messageTranslation: 'once per message and reading language: kept on the message (translatedTo) and saved; the conversation on screen asks only for messages without a mark; the relay keeps every translation in ai-translations.db and gives it again',
  externalNetworkCalls: false,
```

**Verify**: `sha256sum work/wa-replica/fidelity-ai.js work/wa-replica/fidelity-openwa.js work/wa-replica/build-fidelity.cjs work/wa-replica/validate-scrm-lifecycle.cjs` → `a2b7710001b0d2d202b3dcce618ea38fe0a7846020d2cf3bd550c825eb40003e`, `af519e30a886ea494f82e372fed414ad3b6defc5dd5f228d19b0a95b3cf246f7`, `4e878e72ae65590b349282dfeedc52da1e55878a3836df97c6de939819c594e3`, `a18e892c58c3b63b442444773c3fbaad0ebac4afc76a01f2ca9cc7d1901ab491`; the syntax command → `SYNTAX_OK`; `git checkout 88d6dd5 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84` (a message "Missing prototype source anchor" means the swap does not match the baseline — STOP); `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `sha256sum outputs/wa-replica-prototype/app.js` → `48cb928d1075de6c31e88b317ff21213f978739fc4260b67703c6cd2b817a7b7`. If a checksum does not match, restore the file with `git checkout 88d6dd5 -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 4: README, build log, final verification

#### `README.md`

**Edit 4.1** — `README.md`. Find exactly these lines (they occur once):

```text

回复译成哪种语言由每位客户的「客户语言」决定：在聊天界面会话上方右侧选择（常用语言列表，或选「其他语言…」填写任意语言名称）。系统不预设客户语言——从 WhatsApp 同步或新来信生成的客户没有语言，未选择时回复按原文发送。
```

Replace them with:

```text

会话里的消息只翻译一次：译文连同译成的语言保存在消息上，随会话数据存入服务器；打开会话时只为还没有译文的消息请求翻译（从最新的开始，同时最多两条），新到的消息到达时翻译一次，再次打开会话或刷新页面不会重复请求。服务器另把做过的翻译保存在数据目录的 `ai-translations.db` 中（只存原文的指纹与译文，不存原文），相同的文字在任何会话里都只请求模型一次；这个文件可以随时删除，删除后相同的文字会重新翻译。

回复译成哪种语言由每位客户的「客户语言」决定：在聊天界面会话上方右侧选择（常用语言列表，或选「其他语言…」填写任意语言名称）。系统不预设客户语言——从 WhatsApp 同步或新来信生成的客户没有语言，未选择时回复按原文发送。
```

**Edit 4.2** — `README.md`. Find exactly these lines (they occur once):

```text
| `#tags` / `#tag-stats` | **标签管理与标签统计** | 自建分组维护自定义标签、批量打标与客户穿透查询 |
| `#ai` | **AI 能力** | AI 功能的统一接入点：能力清单与逐项启停（接收消息翻译、发送前翻译、语音转文字）、译文语言、回复语气、业务说明与发送保护设置、按能力累计的调用次数与字符数、最近调用记录；经本站服务器中转调用模型服务；服务器未配置时显示「未连接」，不提供翻译 |
| `#prices` | **价格表** | 上传一份 Excel（.xlsx）或 CSV 文件作为价格表：文件在浏览器内读取，先预览识别结果，确认后替换当前价格表；按简称、名称、规格搜索。聊天界面消息框旁的「报价」按钮从价格表查找产品，点击价格即把一行报价（如 `Product Alpha PRDA01 (100*10 Units): $40`）放入消息框，由员工确认后发送；系统不自动报价、不自动发送 |
```

Replace them with:

```text
| `#tags` / `#tag-stats` | **标签管理与标签统计** | 自建分组维护自定义标签、批量打标与客户穿透查询 |
| `#ai` | **AI 能力** | AI 功能的统一接入点：能力清单与逐项启停（会话消息翻译、发送前翻译、语音转文字）、译文语言、回复语气、业务说明与发送保护设置、按能力累计的调用次数与字符数、最近调用记录；经本站服务器中转调用模型服务；服务器未配置时显示「未连接」，不提供翻译 |
| `#prices` | **价格表** | 上传一份 Excel（.xlsx）或 CSV 文件作为价格表：文件在浏览器内读取，先预览识别结果，确认后替换当前价格表；按简称、名称、规格搜索。聊天界面消息框旁的「报价」按钮从价格表查找产品，点击价格即把一行报价（如 `Product Alpha PRDA01 (100*10 Units): $40`）放入消息框，由员工确认后发送；系统不自动报价、不自动发送 |
```

#### `replica/build-log.md`

**Append 4.3** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 会话消息只翻译一次，打开会话时补译 · 2026-11-22

此前只有页面打开期间新到的客户消息会被翻译；从 WhatsApp 同步进来的历史消息和已发出的消息都没有译文（负责人的工作区里 422 条客户消息只有 7 条有译文）。按项目负责人的要求：补上会话里的翻译，并且每条内容只翻译一次、结果存入数据库，不能每次打开会话都重新翻译而浪费调用额度。负责人选定的时机是「打开会话时」。

现在：打开一个会话时，页面为其中还没有译文的消息（客户发来的和已发出的）请求翻译，从最新的一条开始，同时最多两条；译文连同译成的语言保存在消息上并随会话存入服务器，之后再打开这个会话、切换页面或刷新都不会再请求。已经是译文语言的消息只做标记、不显示译文；没有文字的消息（图片、文件的占位文字，纯数字或表情）不请求。新到的消息仍在到达时翻译一次；从页面发出的消息不再请求翻译：经过「发送前翻译」发出的回复，直接把输入的原文作为它的译文。连续三次请求失败时暂停一分钟。

服务器的 AI 中转接口同时把每一次翻译保存在数据目录的 `ai-translations.db` 中（以语言和原文的指纹为键，不保存原文）：相同的文字不论出现在哪个会话，都只向模型服务请求一次；来自这份保存的结果不计入「AI 能力」页的调用次数。「接收消息翻译」能力改名为「会话消息翻译」。合并后需要重启一次预览服务。
```

Then verify everything once more:

```bash
git checkout 88d6dd5 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && $NODE --test work/wa-replica/ai-relay.test.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-042/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test runs end with `pass 14`, `fail 0` and `pass 12`, `fail 0`; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `a9e8456cca598c4fdf084c11fdd7bfd3158a892a9a5e9cc975671979113ebc5d`, `1c8df72fdb72a2e97b4fbe2bf96b7406d99004af69c6782ececc32f33d15c66d`; `git status --porcelain` lists exactly ten paths: `README.md`, `replica/build-log.md`, the six source files under `work/wa-replica/`, and `outputs/wa-replica-prototype/app.js` and `validation.json` (if `outputs/wa-replica-prototype/icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Tests of the relay** (14, one new): a translation made once is given again without asking the service, also with spaces around the text and while the service is down; another language or another text asks again; a failure is not kept; the file holds the translation under a fingerprint and never the text that was translated; replies are never kept; the log marks a kept answer; without a data folder nothing is kept.
- **Validator** — the page keeps the mark on the message, asks only for the conversation on screen, counts no usage for a kept answer, marks what it sends, and shows a translation below a message of either side; the relay has its store.
- **Smoke** (`/tmp/wa-scrm-plan-042/smoke.sh`) — the same facts on the sources and the built page, the README, the build log, the syntax of the three files and the tests of the relay and of the server.
- The build and the validator do not run the page. **Verified by the reviewer in scripted browser sessions, not by you**: a conversation without translations asks for nothing until it is on screen; opened, one request for each message with words, of both sides, the two newest first, none for a picture or a text without letters; each translation kept on its message, saved on the server and shown below the message; nothing asked when the conversation is opened again, after another conversation, another page or a reload. The same words in another conversation cost no request to the model and no usage; a message already in the reading language is marked and never asked again; with the capability off nothing is asked. A message that arrives, and one typed on the phone, are asked for once; what the page sends is marked and never asked for, and a translated reply shows what was typed; another reading language translates a conversation anew when it is opened, a translation from before the marks stays; after three failures the asking stops, nothing is marked, and it resumes after the pause. The sessions of the rest of the product and of the connection still pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 88d6dd5 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 14`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-042/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/ai-relay.cjs` → `9d4d18dc84a7d43502c03d6061723ac977515efce2661f60ede7c437dbbd07a7`
- [ ] `sha256sum work/wa-replica/ai-relay.test.cjs` → `29aee3e5c97bf0ff43512d81358fc7a03a93475cb9de0e157d6a16f01b80469b`
- [ ] `sha256sum work/wa-replica/fidelity-ai.js` → `a2b7710001b0d2d202b3dcce618ea38fe0a7846020d2cf3bd550c825eb40003e`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js` → `af519e30a886ea494f82e372fed414ad3b6defc5dd5f228d19b0a95b3cf246f7`
- [ ] `sha256sum work/wa-replica/build-fidelity.cjs` → `4e878e72ae65590b349282dfeedc52da1e55878a3836df97c6de939819c594e3`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `a18e892c58c3b63b442444773c3fbaad0ebac4afc76a01f2ca9cc7d1901ab491`
- [ ] `sha256sum README.md` → `a9e8456cca598c4fdf084c11fdd7bfd3158a892a9a5e9cc975671979113ebc5d`
- [ ] `sha256sum replica/build-log.md` → `1c8df72fdb72a2e97b4fbe2bf96b7406d99004af69c6782ececc32f33d15c66d`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `48cb928d1075de6c31e88b317ff21213f978739fc4260b67703c6cd2b817a7b7`
- [ ] `git diff --quiet 88d6dd5 -- outputs/wa-replica-prototype/icons.js` exits 0 (the icon file is unchanged)
- [ ] `git diff --name-only 88d6dd5..HEAD -- . ':!plans'` lists exactly these ten: `README.md`, `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/ai-relay.cjs`, `work/wa-replica/ai-relay.test.cjs`, `work/wa-replica/build-fidelity.cjs`, `work/wa-replica/fidelity-ai.js`, `work/wa-replica/fidelity-openwa.js`, `work/wa-replica/validate-scrm-lifecycle.cjs`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build stops with "Missing prototype source anchor" or another assertion, reports another number of icons than 84, a test fails, or the validator fails.
- An output file other than `app.js` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file.

## Maintenance notes

- **Deployment**: `ai-relay.cjs` is loaded when the server starts — **the preview service must be restarted once after the merge**. The store is created in the data folder with the first translation (`ai-translations.db`, with its `-wal` and `-shm` files); it belongs to the private data, is not in any repository, and may be deleted while the service is stopped.
- No stored data is converted. Conversations get their marks as they are opened; a message with a translation from before keeps it.
- The rule that decides whether a message is asked for is one line (`aiWantsTranslation`). Whatever is added to the chat later — a new kind of message, a history import, another way of sending — must leave a message either marked or wanted, never asked for on every redraw: the redraw hook runs each time the page is drawn.
- The two limits are constants in `fidelity-ai.js`: two requests at a time, a pause of one minute after three failures in a row.
- What a reviewer should scrutinise: that a conversation which is opened twice asks once; that a failing service is not asked without end; that nothing the employee sends from the page is sent to the model for translation afterwards.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
