# Plan 063: The sender's own words as the translation, when one workspace writes to another

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 585703e..HEAD -- work/wa-replica replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (the AI relay keeps one more translation per translated reply; the page names its reading language in a reply request; exact text and checksums for every file)
- **Depends on**: plans/042-translate-a-conversation-once.md (DONE), plans/062-any-key-shortcut.md (DONE)
- **Category**: feature change (requested by the owner)
- **Planned at**: commit `585703e`, 2026-11-24

## Why this matters

The owner tested two workspaces of the platform writing to each other and wrote on 2026-11-24: "The translated content of the message sent to me appears differently on my end compared to how it appears on the sender's end." Both workspaces translate replies before they are sent and read incoming messages in Chinese. The sender's side shows, under the sent foreign text, the Chinese the seller typed; WhatsApp carries only the foreign text; the receiving side translates that text back into Chinese with a fresh call to the model, and a translation of a translation comes back in other words. Asked whether both ends should match, the owner chose: "Yes, make them match".

With this plan the relay, when it translates a reply, also keeps the seller's typed words as that reply's translation back into the seller's reading language. All workspaces of a server share the relay's store of translations (`ai-translations.db` in the data folder; plan 042 keys it by the target language and the text), so a workspace that receives the reply and asks for it in the same reading language gets the sender's own words from the store, without asking the model.

### Decisions already made (do not re-open; do not ask)

The owner chose that both ends match, for messages sent from a workspace of this server; messages from ordinary customers are translated as before.

Decided by the advisor, within that:

- The page names its reading language in every reply request (new optional field `from`, checked like the other language names; a bad one is refused with 400 before the model is asked).
- The typed words are kept only when they are written in that reading language: at least half of their letters in its own script for 中文, 日本語, 한국어, Русский and العربية, Latin letters only for the reading languages written in them. They are not kept when the model's answer equals what was typed, or when the model gave no answer. The reply itself is still never served from the store (it depends on tone and chat).
- The store then holds the typed words of translated replies under the fingerprint of the sent text — the same kind of entry as every translation, and found again only with that exact text. When a workspace is deleted, these entries go with its messages (its sent messages carry the sent text and its reading language, which is how the deletion of plan 058 finds them).
- Messages received before this plan keep the translation they already have.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan | Edits |
|---|---|---|---|
| `work/wa-replica/ai-relay.cjs` | `9d4d18dc84a7d43502c03d6061723ac977515efce2661f60ede7c437dbbd07a7` | `9f93a19761698adf1ac40f2a98a174c208922b79884ec2452ddba55c2a9eaef9` | 4 |
| `work/wa-replica/ai-relay.test.cjs` | `29aee3e5c97bf0ff43512d81358fc7a03a93475cb9de0e157d6a16f01b80469b` | `a299263deaf9766562f58a2ab00767447a47acdd94950578b41e341ed2eca946` | 3 |
| `work/wa-replica/fidelity-ai.js` | `20ca788021e78b11bd5bd95e97350550ef1bd444e502809d6bed7ebbb3d15bd3` | `d89d1660127fa32c3c888778a0ff6037fc888095b56f9b42831d3402bf2bbd31` | 3 |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `1d9dcbc620aef890458aec3270377f69accf940acbe531a2e5f2164320b55e85` | `34386d2bd15c07080c83635aeda09455cde467820f88f25b0f3775a093148200` | 2 |
| `replica/build-log.md` | `5b0ecac3318055c3b47d4ac8d6a186c0b5fcd5cd935fb5c8dd22494c12b7e2ff` | `6f21e87ef3217c1a7749f140cccb8c1f0f1cb1f73fa2615e17768396a86d2da0` | 1 append |

- `ai-relay.cjs` — the AI relay (routes `/api/ai/*`, run by every workspace's server). `translate(input)` looks a translation up in the store (`translationStore()`, key `translationKey(to, text)`) before asking the model, and keeps what the model answered; `reply(input)` puts a typed reply into the customer's language and keeps nothing.
- `ai-relay.test.cjs` — its tests, against a stand-in model service whose answer `upstream.mode` selects.
- `fidelity-ai.js` — the page's AI module: `aiOutboundInput(c, text)` builds a reply request; `aiRelayReply(input)` sends the fields it names to `/api/ai/reply`.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page and writes `validation.json`.
- `replica/build-log.md` — the project's change log, in Chinese; this plan appends one entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below). After this plan's build exactly two output files differ: `app.js` and `validation.json` (written by the validator).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer** (the relay's store uses `node:sqlite`). Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP. The build and the validator work with plain `node`.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 585703e -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 15`, `fail 0` (14 before this plan) |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 18`, `fail 0` (unchanged) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-063/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/ai-relay.cjs`, `work/wa-replica/ai-relay.test.cjs` (Step 2)
- `work/wa-replica/fidelity-ai.js`, `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 3)
- `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/app.js`, `validation.json` (every other output file must come out unchanged)

**Out of scope** (do NOT touch): every other file — `serve.cjs`, `site-*.cjs`, `openwa-link.cjs`, the other `fidelity-*.js` modules, the style sheets, `build-fidelity.cjs`, `deploy/**`, `plans/**`, earlier entries of `replica/build-log.md`. No file is created by this plan. Do not install anything.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/063-own-words-back` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): show the sender's own words when one workspace writes to another`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file at the moment the edit is applied) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. A block ends only at a line that equals its opening run of backticks. Copy every block character for character (the blocks contain Chinese, Japanese, Korean, Cyrillic and Arabic text, regular expressions with backslashes, and backticks; keep them exactly); the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. This plan has 12 Edits and 1 Append. Apply the instructions of a file **in the order given** — a later edit of a file may find lines that an earlier one wrote. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the five files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-063/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-063 && cat > /tmp/wa-scrm-plan-063/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks plan 063: the words a seller typed are kept as the translation of the sent reply back into their reading
# language. NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; O="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" 2>/dev/null && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 15 ℹ fail 0 '
has 'the relay keeps the typed words of a reply' "$W/ai-relay.cjs" 'if (from && translated !== text && writtenIn(from, text)) translationStore()?.put(translationKey(from, translated), text);'
has 'only words written in the reading language' "$W/ai-relay.cjs" 'function writtenIn(language, text) {'
has 'a bad reading language is refused' "$W/ai-relay.cjs" "if (typeof from !== 'string' || (from && !LANGUAGE.test(from))) throw failure(400, 'invalid-request');"
has 'the page names its reading language' "$W/fidelity-ai.js" 'context, from: settings.readLanguage };'
has 'and sends it to the relay' "$W/fidelity-ai.js" 'context: input.context, from: input.from }),'
has 'the page is built with it' "$O/app.js" 'context: input.context, from: input.from }),'
has 'the validator knows it' "$W/validate-scrm-lifecycle.cjs" "  replyWordsKeptBack: 'the words a seller typed"
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 两个工作区互发消息时，双方看到的中文一致 · 2026-11-24'
same 'of the built files only the page and the validation changed' "$(cd "$ROOT" && git status --porcelain -- outputs | grep -vcE '(app\.js|validation\.json)$')" 0
same 'the built page passes the syntax check' "$(node --check "$O/app.js" 2>/dev/null && node --check "$W/ai-relay.cjs" 2>/dev/null && echo SYNTAX_OK)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 18 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-063/smoke.sh && ls -l /tmp/wa-scrm-plan-063/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/ai-relay.cjs work/wa-replica/ai-relay.test.cjs work/wa-replica/fidelity-ai.js work/wa-replica/validate-scrm-lifecycle.cjs replica/build-log.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-063/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the tests of the relay pass` (got: ℹ pass 14 ℹ fail 0 ), `the relay keeps the typed words of a reply`, `only words written in the reading language`, `a bad reading language is refused`, `the page names its reading language`, `and sends it to the relay`, `the page is built with it`, `the validator knows it` and `the build log has the entry` (nine checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The relay: the typed words kept as the reply's translation back; its tests

#### `ai-relay.cjs`

**Edit 2.1** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text
const LANGUAGE = /^[\p{L}\p{M} ()·-]{1,40}$/u;
// How a reply should sound. The keys are what the page sends.
```

Replace them with:

```text
const LANGUAGE = /^[\p{L}\p{M} ()·-]{1,40}$/u;
// The reading languages that have a script of their own; the others offered by the page are written in Latin letters.
const READING_SCRIPTS = { '中文': /\p{Script=Han}/u, '日本語': /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u, '한국어': /\p{Script=Hangul}/u, 'Русский': /\p{Script=Cyrillic}/u, 'العربية': /\p{Script=Arabic}/u };
// Whether a text is written in a reading language: at least half of its letters in that language's own script, or,
// for a language written in Latin letters, Latin letters only.
function writtenIn(language, text) {
  const letters = text.match(/\p{L}/gu) || [];
  if (!letters.length) return false;
  const own = READING_SCRIPTS[language];
  return own ? letters.filter(letter => own.test(letter)).length * 2 >= letters.length : letters.every(letter => /\p{Script=Latin}/u.test(letter));
}
// How a reply should sound. The keys are what the page sends.
```

**Edit 2.2** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text

// A reply the seller typed, put into the customer's language. tone, business and context are optional.
async function reply(input, config) {
```

Replace them with:

```text

// A reply the seller typed, put into the customer's language. tone, business, context and from (the seller's
// reading language) are optional.
async function reply(input, config) {
```

**Edit 2.3** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text
  const context = input.context === undefined ? [] : input.context;
  if (!text || !LANGUAGE.test(to) || typeof tone !== 'string' || !Object.hasOwn(TONES, tone) || typeof business !== 'string' || !Array.isArray(context)) throw failure(400, 'invalid-request');
  if (context.some(message => !message || typeof message.text !== 'string' || !['me', 'customer'].includes(message.from))) throw failure(400, 'invalid-request');
```

Replace them with:

```text
  const context = input.context === undefined ? [] : input.context;
  const from = input.from === undefined ? '' : input.from;
  if (!text || !LANGUAGE.test(to) || typeof tone !== 'string' || !Object.hasOwn(TONES, tone) || typeof business !== 'string' || !Array.isArray(context)) throw failure(400, 'invalid-request');
  if (typeof from !== 'string' || (from && !LANGUAGE.test(from))) throw failure(400, 'invalid-request');
  if (context.some(message => !message || typeof message.text !== 'string' || !['me', 'customer'].includes(message.from))) throw failure(400, 'invalid-request');
```

**Edit 2.4** — `work/wa-replica/ai-relay.cjs`. Find exactly these lines (they occur once):

```text
  const recent = context.slice(-MAX_CONTEXT_MESSAGES).map(message => ({ from: message.from, text: oneLine(message.text).slice(0, MAX_CONTEXT_TEXT) })).filter(message => message.text);
  return { text: await askModel(config, replyPrompt({ to, tone, business: oneLine(business) }), replyTurn(text, recent)), inputChars: text.length };
}
```

Replace them with:

```text
  const recent = context.slice(-MAX_CONTEXT_MESSAGES).map(message => ({ from: message.from, text: oneLine(message.text).slice(0, MAX_CONTEXT_TEXT) })).filter(message => message.text);
  const translated = await askModel(config, replyPrompt({ to, tone, business: oneLine(business) }), replyTurn(text, recent));
  // What the seller typed is what this reply says in their reading language (plan 063): it is kept as the reply's
  // translation into that language, so that another workspace of this server that receives the reply shows the
  // seller's own words instead of translating it anew. Only when the words are written in that language.
  if (from && translated !== text && writtenIn(from, text)) translationStore()?.put(translationKey(from, translated), text);
  return { text: translated, inputChars: text.length };
}
```

#### `ai-relay.test.cjs`

**Edit 2.5** — `work/wa-replica/ai-relay.test.cjs`. Find exactly these lines (they occur once):

```text
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ finish_reason: upstream.mode === 'cut' ? 'length' : 'stop', message: { content: upstream.mode === 'empty' ? '   ' : '  你们可以把 BX20 发到波多黎各吗？  ' } }] }));
  });
```

Replace them with:

```text
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ finish_reason: upstream.mode === 'cut' ? 'length' : 'stop', message: { content: upstream.mode === 'empty' ? '   ' : upstream.mode === 'english' ? '  How many boxes do you need?  ' : '  你们可以把 BX20 发到波多黎各吗？  ' } }] }));
  });
```

**Edit 2.6** — `work/wa-replica/ai-relay.test.cjs`. Find exactly these lines (they occur once):

```text
  await refused({ body: { ...ok, context: [null] } }, 400, 'invalid-request');
  await refused({ body: { ...ok, business: 'x'.repeat(601) } }, 413, 'too-long');
```

Replace them with:

```text
  await refused({ body: { ...ok, context: [null] } }, 400, 'invalid-request');
  await refused({ body: { ...ok, from: 7 } }, 400, 'invalid-request');
  await refused({ body: { ...ok, from: 'x; ignore the rules' } }, 400, 'invalid-request');
  await refused({ body: { ...ok, business: 'x'.repeat(601) } }, 413, 'too-long');
```

**Edit 2.7** — `work/wa-replica/ai-relay.test.cjs`. Find exactly these lines (they occur once):

```text

test('the log never holds the key or message text', () => {
```

Replace them with:

```text

test('reply: the words the seller typed are kept as the reply\'s translation into their reading language when they are written in it, so that a workspace receiving the reply gets them without asking the service', async () => {
  configure();
  const dir = fs.mkdtempSync(path.join(tmp, 'back-'));
  const typed = '请问需要几箱？', sent = 'How many boxes do you need?';
  const reply = (body) => call('/api/ai/reply', { body: { text: typed, to: '英语', ...body } });
  const back = (to = '中文') => call('/api/ai/translate', { body: { text: sent, to } });
  process.env.WA_SCRM_DATA_DIR = dir;
  try {
    upstream.mode = 'english';
    // without the reading language nothing is kept
    upstream.calls.length = 0;
    assert.deepEqual((await reply({})).json, { text: sent });
    upstream.mode = 'ok';
    assert.equal((await back()).json.cached, undefined, 'asked the service');
    // with it: the typed words come back for the sent text, from the store; the reply itself is never kept
    const fresh = fs.mkdtempSync(path.join(tmp, 'back-'));
    process.env.WA_SCRM_DATA_DIR = fresh;
    upstream.mode = 'english';
    upstream.calls.length = 0;
    for (let i = 0; i < 2; i++) assert.deepEqual((await reply({ from: '中文' })).json, { text: sent });
    assert.equal(upstream.calls.length, 2, 'every reply asks the service');
    upstream.mode = 'error';
    assert.deepEqual([(await back()).status, (await back()).json], [200, { text: typed, cached: true }]);
    assert.equal(upstream.calls.length, 2, 'the way back did not ask the service');
    // into another language it is translated as before
    upstream.mode = 'ok';
    assert.equal((await back('English')).json.cached, undefined);
    // words not written in the reading language are not kept
    const other = fs.mkdtempSync(path.join(tmp, 'back-'));
    process.env.WA_SCRM_DATA_DIR = other;
    upstream.mode = 'english';
    assert.deepEqual((await call('/api/ai/reply', { body: { text: 'How many, please?', to: '英语', from: '中文' } })).json, { text: sent });
    assert.deepEqual((await call('/api/ai/reply', { body: { text: 'Сколько коробок?', to: '英语', from: 'English' } })).json, { text: sent });
    upstream.mode = 'ok';
    assert.equal((await back()).json.cached, undefined, 'English typed is no Chinese');
    assert.equal((await back('English')).json.cached, undefined, 'Cyrillic typed is no English');
    // nor a reply that came back as it was typed, nor a reply the service did not give
    const same = fs.mkdtempSync(path.join(tmp, 'back-'));
    process.env.WA_SCRM_DATA_DIR = same;
    upstream.mode = 'english';
    assert.deepEqual((await call('/api/ai/reply', { body: { text: sent, to: '英语', from: 'English' } })).json, { text: sent });
    upstream.mode = 'error';
    assert.equal((await reply({ from: '中文' })).status, 502);
    upstream.mode = 'ok';
    assert.equal((await back('English')).json.cached, undefined, 'the same text is not kept as its own translation');
    assert.equal((await back()).json.cached, undefined, 'a failed reply keeps nothing');
  } finally {
    delete process.env.WA_SCRM_DATA_DIR;
    upstream.mode = 'ok';
  }
});

test('the log never holds the key or message text', () => {
```

What these edits do, so that you can recognise them: in `ai-relay.cjs` the first adds `READING_SCRIPTS` and `writtenIn(language, text)` after `LANGUAGE`; the next two let `reply` take and check `from`; the last keeps the typed words after the model's answer. In `ai-relay.test.cjs` the stand-in model learns a mode `english`, the test of bad reply requests gets two cases for `from`, and one new test comes before the test of the log.

**Verify**: `sha256sum work/wa-replica/ai-relay.cjs work/wa-replica/ai-relay.test.cjs` → `9f93a19761698adf1ac40f2a98a174c208922b79884ec2452ddba55c2a9eaef9`, `a299263deaf9766562f58a2ab00767447a47acdd94950578b41e341ed2eca946`; `node --check work/wa-replica/ai-relay.cjs` exits 0; `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 15`, `fail 0`. If a checksum does not match, restore the file with `git checkout 585703e -- <file>` and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 3: The page names its reading language; the validator — and the build

#### `fidelity-ai.js`

**Edit 3.1** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input.text, to: input.to, tone: input.tone, business: input.business, context: input.context }),
    }).then(response => response.json().then(body => response.ok ? { text: body.text } : Promise.reject(new Error('relay ' + body.error))));
```

Replace them with:

```text
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input.text, to: input.to, tone: input.tone, business: input.business, context: input.context, from: input.from }),
    }).then(response => response.json().then(body => response.ok ? { text: body.text } : Promise.reject(new Error('relay ' + body.error))));
```

**Edit 3.2** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text

  // What the relay gets for a reply: the text, the customer's language, the tone, the business description
  // and the last messages of the conversation as context.
  function aiOutboundInput(c, text) {
```

Replace them with:

```text

  // What the relay gets for a reply: the text, the customer's language, the tone, the business description,
  // the last messages of the conversation as context, and the reading language, in which the seller writes (the
  // relay keeps the typed words as the reply's translation into it — plan 063).
  function aiOutboundInput(c, text) {
```

**Edit 3.3** — `work/wa-replica/fidelity-ai.js`. Find exactly these lines (they occur once):

```text
      .filter(message => message.text.trim());
    return { text, to: aiCustomerLanguage(c), tone: settings.tone, business: settings.business, context };
  }
```

Replace them with:

```text
      .filter(message => message.text.trim());
    return { text, to: aiCustomerLanguage(c), tone: settings.tone, business: settings.business, context, from: settings.readLanguage };
  }
```

#### `validate-scrm-lifecycle.cjs`

**Edit 3.4** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(!aiSource.includes('AI_SHORTCUT_TAKEN'), 'any key can be the shortcut: no combination is refused (plan 062)');
assert(read(path.join(out, 'icons.js')).includes('"Settings":[["path"'), 'the gear must be in the icon pool');
```

Replace them with:

```text
assert(!aiSource.includes('AI_SHORTCUT_TAKEN'), 'any key can be the shortcut: no combination is refused (plan 062)');
// The words a seller typed are kept as the translation of the sent reply back into their reading language (plan
// 063): the page names its reading language in a reply request, and the relay keeps the typed words when they are
// written in it, so that another workspace of this server receiving the reply shows them.
for (const required of ['return { text, to: aiCustomerLanguage(c), tone: settings.tone, business: settings.business, context, from: settings.readLanguage };', 'body: JSON.stringify({ text: input.text, to: input.to, tone: input.tone, business: input.business, context: input.context, from: input.from }),']) {
  assert(aiSource.includes(required), `fidelity-ai.js is missing ${required}`);
  assert(appJs.includes(required), `app.js is missing ${required}`);
}
assert(read(path.join(__dirname, 'ai-relay.cjs')).includes('if (from && translated !== text && writtenIn(from, text)) translationStore()?.put(translationKey(from, translated), text);'), 'the relay must keep the typed words of a reply as its translation back');
assert(read(path.join(out, 'icons.js')).includes('"Settings":[["path"'), 'the gear must be in the icon pool');
```

**Edit 3.5** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  pinnedChats: 'a right-click (or the menu key) on a chat in the list opens a menu with 置顶 / 取消置顶; pinned chats stay at the top of the list in every filter and search, in the order of their last message, marked with a pin; kept with the customer in this workspace, WhatsApp on the phone unchanged',
```

Replace them with:

```text
  customerPictures: 'the profile picture WhatsApp shows for a chat, over the initials wherever an avatar is drawn; looked up through OpenWA, fetched only from WhatsApp\'s own servers or the gateway, kept for a day; the initials stay when there is none',
  replyWordsKeptBack: 'the words a seller typed are kept by the relay as the translation of the sent reply back into the seller\'s reading language (when written in it), so that another workspace of this server receiving the reply shows the seller\'s own words',
  pinnedChats: 'a right-click (or the menu key) on a chat in the list opens a menu with 置顶 / 取消置顶; pinned chats stay at the top of the list in every filter and search, in the order of their last message, marked with a pin; kept with the customer in this workspace, WhatsApp on the phone unchanged',
```

**Verify**: `sha256sum work/wa-replica/fidelity-ai.js work/wa-replica/validate-scrm-lifecycle.cjs` → `d89d1660127fa32c3c888778a0ff6037fc888095b56f9b42831d3402bf2bbd31`, `34386d2bd15c07080c83635aeda09455cde467820f88f25b0f3775a093148200`; `git checkout 585703e -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 87`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `git status --porcelain -- outputs` lists `app.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else (if `icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one); `sha256sum outputs/wa-replica-prototype/app.js` → `4d1f58aa258f4133d4b36f7ba3a8268fad4493a5149b9a68cce9271d09d5d4bb`. If a checksum does not match, restore the file with `git checkout 585703e -- <file>` and apply its instructions again; if it still does not match, or another output file changed, STOP.

### Step 4: Build log, final verification

#### `replica/build-log.md`

**Append 4.1** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 两个工作区互发消息时，双方看到的中文一致 · 2026-11-24

以前，一个工作区发出的消息（输入中文、译为客户语言后发送）被本服务器上的另一个工作区收到时，收到的一方会把外文重新翻译成中文，和发送方输入的中文措辞不同。

- 现在，发送前翻译时会同时记下：这段外文对应的中文就是发送方自己输入的那句话。另一个工作区收到这条消息时，直接显示发送方的原话，不再重新翻译，也不再调用模型。
- 只在输入的内容确实是发送方「译文语言」的文字时才这样记（例如译文语言是中文，输入的是中文）。
- 普通客户在 WhatsApp 上看到的仍然只是翻译后的外文，不受影响；来自普通客户的消息照常翻译。
- 这样记下的原话和其他译文保存在一起；删除工作区时随该工作区的消息一起删除。
- 之前已经收到的消息保持原来的译文，从新消息开始生效。

验证：AI 中转测试新增一项（有无译文语言、输入的文字不是译文语言、译文与原文相同、模型出错等情形）；构建与校验脚本通过；浏览器测试覆盖：发送一条翻译后的回复，同一句外文作为新消息收到时直接显示发送方的原话且没有调用模型，其他消息照常翻译。
```

Then verify everything once more (run the restore, the build and the validator one after another):

```bash
git checkout 585703e -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && git reset -q HEAD -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/validate-scrm-lifecycle.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-063/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; smoke ends with `SMOKE PASS`; `sha256sum replica/build-log.md` → `6f21e87ef3217c1a7749f140cccb8c1f0f1cb1f73fa2615e17768396a86d2da0`; `git status --porcelain` lists exactly these seven as changed and nothing as new: the five files of the table in "Current state" and `outputs/wa-replica-prototype/app.js`, `validation.json`. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Tests of the relay** (15; one new): without `from` nothing is kept; with it the sent text, asked into the reading language, gives the typed words from the store — also while the model is down — and the reply itself still asks the model every time; into another language it is translated as before; typed words not written in the reading language (English for 中文, Cyrillic for English) are not kept, nor a reply that came back as it was typed, nor one the model did not give; a `from` that is no language name is refused.
- **Validator** — the page names its reading language in a reply request and sends it to the relay (source and built `app.js`); the relay keeps the typed words.
- **Smoke** (`/tmp/wa-scrm-plan-063/smoke.sh`) — the same facts, the tests of the relay and of sign-in and data, which built files changed and the syntax of the built page and the relay.
- **Verified by the reviewer, not by you**: in a browser against a stand-in server and model — a reply typed in Chinese is translated and sent; the same text arriving in another chat shows the typed words as its translation without a request to the model; any other arriving message is translated by the model as before; the earlier browser sessions.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 585703e -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 87`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 15`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 18`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-063/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/ai-relay.cjs` → `9f93a19761698adf1ac40f2a98a174c208922b79884ec2452ddba55c2a9eaef9`
- [ ] `sha256sum work/wa-replica/ai-relay.test.cjs` → `a299263deaf9766562f58a2ab00767447a47acdd94950578b41e341ed2eca946`
- [ ] `sha256sum work/wa-replica/fidelity-ai.js` → `d89d1660127fa32c3c888778a0ff6037fc888095b56f9b42831d3402bf2bbd31`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `34386d2bd15c07080c83635aeda09455cde467820f88f25b0f3775a093148200`
- [ ] `sha256sum replica/build-log.md` → `6f21e87ef3217c1a7749f140cccb8c1f0f1cb1f73fa2615e17768396a86d2da0`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `4d1f58aa258f4133d4b36f7ba3a8268fad4493a5149b9a68cce9271d09d5d4bb`
- [ ] `git diff --name-only 585703e..HEAD -- outputs` lists `app.js` and `validation.json` of `outputs/wa-replica-prototype/` and nothing else
- [ ] `git diff --name-only 585703e..HEAD -- . ':!plans'` lists exactly seven paths: the five of the table in "Current state" and the two output files
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file at the moment the edit is applied.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build or the validator fails, or a test fails.
- An output file other than `app.js` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file, creating a file or installing a package.

## Maintenance notes

- **Deployment**: on the platform, `git pull --ff-only && sudo bash deploy/upgrade.sh <the machine's settings file>`; nothing else. It works from the next translated reply on; messages already received keep their translation.
- Every workspace's server runs the relay against the same data folder, so the store is shared; a server whose workspaces had separate data folders would not share it (then each end translates on its own, as before).
- A later reading language with a script of its own belongs in `READING_SCRIPTS`.
- What a reviewer should scrutinise: that the reply is still never served from the store; that only words written in the reading language are kept; that a bad `from` is refused before the model is asked; that the store's deletion of plan 058 still finds these entries (sent text × reading language).
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
