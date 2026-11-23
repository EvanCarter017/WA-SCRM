# Plan 049: The price list can be taken out of the system for good

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat d717f34..HEAD -- work/wa-replica replica/build-log.md outputs README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM (a new way of changing the saved data, beside the ordinary save: a mistake loses data or lets the page and the server drift apart; exact text and checksums for every edit)
- **Depends on**: plans/048-early-receipts.md (DONE)
- **Category**: feature (owner request)
- **Planned at**: commit `d717f34`, 2026-11-23

## Why this matters

The owner, 2026-11-23: "I need to be able to completely remove the quotation sheet from the system after uploading it, leaving no trace behind."

The price list (plan 037) is read from an Excel or CSV file in the browser — the file itself never reaches the server — and its rows are saved with the sub-site's data. The page has a button "清空价格表" that removes the list by an ordinary save. Two things would outlast that:

- **The log of saves.** The server notes for every save which fields it wrote, when, and for which account. After "clear", the log still says that a field called `priceList` was saved at the time of the upload and removed at the time of the clearing.
- **The database file.** SQLite does not wipe what it deletes: the rows of a removed (or replaced) list stay in pages of the file that are no longer in use, and in the write-ahead log beside it, until something else happens to be written over them.

(On the owner's site no list had been uploaded yet when this plan was written, so nothing has to be cleaned up afterwards.)

What this plan does:

- **The server can take a field out for good** (`DELETE /api/data { baseVersion, field }`, only for the field `priceList`, only for the sub-site's own employee): it deletes the rows, takes the field's name out of the log of saves — an entry that named nothing else goes entirely — and then writes the database file anew and empties the write-ahead log, so that neither file holds anything of the list. One entry without a name is added to the log so that the version of the data moves on. Nothing of it is written to the server's own log.
- **The page removes the list through that**, never by an ordinary save: the button reads "彻底删除价格表", the question before it says what it means and that it cannot be undone, and the list disappears from the page only when the server has done it.

### Decisions already made (do not re-open; do not ask)

- There is one way of removing the list, the complete one; the old "clear" is replaced, not kept beside it.
- What stays, and is said in the question before the removal: a price that was already put into a message or a draft is part of that conversation.
- The log keeps one line for the removal itself — a save at that time, by that account, naming nothing.
- The file is rewritten in place by SQLite; what the operating system does with disk blocks it has freed is outside this plan.
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/site-data.cjs` | `541a826a542af00eaac848a157049e880ef2facce93facc7acecd5f38bcbde8f` | `0eee73f6b7e3a34220a5a53a002f98afa47e911941f6c8b27f0213866f1109f0` |
| `work/wa-replica/site-api.cjs` | `81e477780a8eb800685e2a65c66430f662caa21b2d42c088157ad7c530339803` | `f32cb3aacb8b7af101baae0445cc194a693441d73a328c8949f6e01ff188213d` |
| `work/wa-replica/site-api.test.cjs` | `02efa1bdedc6e9d442d793ae59624b599d9cba1fb42ffd4824436e8d2a6a0b7a` | `3bb237cde658c0c254f13d904f6eb50323b13e902396fab028fffb0c311681aa` |
| `work/wa-replica/fidelity-boot.js` | `3567dbccdd320360173434457885c07b6964864bc53668c5822326921731c29f` | `d8b288eb5f6e4998d51c5ef88c18c289dc9aaede03cdf2bfdcc8065b00a17bfd` |
| `work/wa-replica/fidelity-pricelist.js` | `ad69850ff2a1548e52171b760a9d90f92c88a79b7e5f27470eb15cd10cb142a6` | `175929a04a40885dd946de63be414d8514a132b7af60e70c9fd4ffd3bfb81788` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `daa461cd7f24e81fe63e8435cb093b182f7c82a77a34eb0dfa1d391e888043f0` | `10411cb4be735187a0f539eb10b847d29b49ad4efb04ccae3e0c5a0b0e5ecbb6` |
| `README.md` | `295bf12dbdd0b851b61789d615f2c8376e9056e15a24de092f2e4e782b633a99` | `41ef495566db0c5c8670ffa41d6a3cc1d1b1d12376b2a48e17636b6a63a529e7` |

- `site-data.cjs` — the store of one sub-site's data: a table `doc` (`key`, `json`) with one row for a field or for one part of a split field (`field/id`), and a table `saves` (`version`, `at`, `by`, `keys` — the names of the keys a save wrote, separated by spaces). `write` saves keys when `baseVersion` is the current version and adds a row to `saves`; `version()` is the highest version in `saves`; `transaction(work)` wraps a change.
- `site-api.cjs` — the routes: `GET /api/data`, `PUT /api/data { baseVersion, set, remove }`. `mayWrite(user)` is true for the sub-site's own employee. The server logs sign-ins and failures, never data. `site-api.test.cjs` — its tests (12).
- `fidelity-boot.js` (shipped as `boot.js`) — signs in, loads the data and saves it: `synced` holds what the server has, as text for each key; `flush()` sends what differs (`set`) and what is gone (`remove`) with the `version` it knows; `save(data)` asks for a flush after a moment; `stop(title, notice)` halts the page. The app reaches these through `window.WA_SITE`.
- `fidelity-pricelist.js` — the page "价格表" and the quote button. `priceClear` asks, `priceClearDo` removes the list — until now with `delete data.priceList` and an ordinary save.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page; one line follows the new `window.WA_SITE`, a block is added.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout d717f34 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Syntax of the page files | `node -e "const fs=require('fs'),vm=require('vm');new vm.Script('(async()=>{'+fs.readFileSync('work/wa-replica/fidelity-pricelist.js','utf8')+'})');new vm.Script(fs.readFileSync('work/wa-replica/fidelity-boot.js','utf8'));console.log('SYNTAX_OK')"` | `SYNTAX_OK` |
| Tests of the relay | `$NODE --test work/wa-replica/ai-relay.test.cjs` | `pass 14`, `fail 0` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 13`, `fail 0` |
| Tests of the link | `$NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 23`, `fail 0` (they send a 16 MB file twice; allow a few seconds) |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-049/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/site-data.cjs`, `site-api.cjs`, `site-api.test.cjs` (Step 2)
- `work/wa-replica/fidelity-boot.js`, `fidelity-pricelist.js`, `validate-scrm-lifecycle.cjs` (Step 3)
- `README.md`, `replica/build-log.md` (Step 4)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{app.js,boot.js,validation.json}` (the other output files, `icons.js` among them, must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular `serve.cjs`, `site-auth.cjs`, `site-admin.cjs`, `openwa-link.cjs`, `ai-relay.cjs`, the other page modules, the other style sheets, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/049-remove-the-price-list-for-good` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): take the price list out of the system for good`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the seven files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-049/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-049 && cat > /tmp/wa-scrm-plan-049/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that the price list can be taken out of the system for good.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the sign-in and data tests pass, with the one for the removal' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 13 ℹ fail 0 '
has 'the server takes a field out with what it left in the files' "$W/site-data.cjs" "db.exec('VACUUM');"
has 'an entry of the log that named only the field goes entirely' "$W/site-data.cjs" "else db.prepare('DELETE FROM saves WHERE version = ?').run(row.version);"
has 'only the price list may be taken out this way' "$W/site-api.cjs" "const PURGEABLE = ['priceList'];"
has 'the server has the route' "$W/site-api.cjs" "'DELETE /api/data': async req => {"
has 'the page asks the server for the removal' "$P/boot.js" "answer = await request('/api/data', { method: 'DELETE', body: { baseVersion: version, field } });"
has 'the price list page removes the list through it' "$P/app.js" "if (!(await window.WA_SITE.purge('priceList'))) return toast('价格表没有删除：暂时无法连接服务器，请稍后重试。');"
same 'the list is no longer removed by an ordinary save' "$(grep -c 'delete data.priceList' "$P/app.js")" 0
has 'the README names the removal' "$ROOT/README.md" '彻底删除价格表'
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 价格表可以彻底删除，不留记录'
same 'the server files pass the syntax check' "$(node --check "$W/site-data.cjs" 2>&1 && node --check "$W/site-api.cjs" 2>&1 && echo SYNTAX_OK)" SYNTAX_OK
same 'the page files pass the syntax check' "$(cd "$ROOT" && node -e "const fs=require('fs'),vm=require('vm');new vm.Script('(async()=>{'+fs.readFileSync('work/wa-replica/fidelity-pricelist.js','utf8')+'})');new vm.Script(fs.readFileSync('work/wa-replica/fidelity-boot.js','utf8'));console.log('SYNTAX_OK')" 2>&1)" SYNTAX_OK
same 'the tests of the relay pass' "$("$NODE" --test "$W/ai-relay.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 14 ℹ fail 0 '
same 'the tests of the link pass' "$("$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 23 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-049/smoke.sh && ls -l /tmp/wa-scrm-plan-049/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/site-data.cjs work/wa-replica/site-api.cjs work/wa-replica/site-api.test.cjs work/wa-replica/fidelity-boot.js work/wa-replica/fidelity-pricelist.js work/wa-replica/validate-scrm-lifecycle.cjs README.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-049/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the sign-in and data tests pass, with the one for the removal` (got: ℹ pass 12 ℹ fail 0 ), `the server takes a field out with what it left in the files`, `an entry of the log that named only the field goes entirely`, `only the price list may be taken out this way`, `the server has the route`, `the page asks the server for the removal`, `the price list page removes the list through it`, `the list is no longer removed by an ordinary save` (got: 1), `the README names the removal` and `the build log has the entry` (ten checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The server takes a field out for good

#### `site-data.cjs`

**Edit 2.1** — `work/wa-replica/site-data.cjs`. Find exactly these lines (they occur once):

```text

  const lastSaves = (count = 20) => db.prepare('SELECT version, at, by, keys FROM saves ORDER BY version DESC LIMIT ?').all(count);
  return { read, write, replace, lastSaves, close: () => db.close() };
}
```

Replace them with:

```text

  // Takes a field out for good — for content that must leave no trace, such as a price list. Its rows go; its
  // name goes from the log of saves, and an entry that named nothing else goes entirely; one entry without a name
  // is added so that the version moves on. Then the file is written anew, which drops what the rows had left in
  // pages no longer in use, and the write-ahead log is emptied.
  function purge({ baseVersion, field, by }) {
    if (!Number.isInteger(baseVersion) || typeof field !== 'string' || !KEY.test(field) || field.includes('/')) throw problem('invalid-request');
    const saved = transaction(() => {
      const current = version();
      if (baseVersion !== current) throw problem('version-conflict', { version: current });
      db.prepare('DELETE FROM doc WHERE key = ? OR substr(key, 1, ?) = ?').run(field, field.length + 1, field + '/');
      for (const row of db.prepare('SELECT version, keys FROM saves').all()) {
        const keys = row.keys.split(' '), rest = keys.filter(key => key !== field && !key.startsWith(field + '/'));
        if (rest.length === keys.length) continue;
        if (rest.length) db.prepare('UPDATE saves SET keys = ? WHERE version = ?').run(rest.join(' '), row.version);
        else db.prepare('DELETE FROM saves WHERE version = ?').run(row.version);
      }
      db.prepare('INSERT INTO saves (version, at, by, keys) VALUES (?, ?, ?, ?)').run(current + 1, new Date(now()).toISOString(), String(by), '');
      return { version: current + 1 };
    });
    // Someone else who is reading the file at this moment (the administration tool, a copy being made) is waited for.
    db.exec('PRAGMA busy_timeout = 5000');
    db.exec('VACUUM');
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    return saved;
  }

  const lastSaves = (count = 20) => db.prepare('SELECT version, at, by, keys FROM saves ORDER BY version DESC LIMIT ?').all(count);
  return { read, write, replace, purge, lastSaves, close: () => db.close() };
}
```

#### `site-api.cjs`

**Edit 2.2** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
//   PUT  /api/data           { baseVersion, set, remove }
// The employee the sub-site belongs to reads and writes its data; supervisors and administrators read it.
```

Replace them with:

```text
//   PUT  /api/data           { baseVersion, set, remove }
//   DELETE /api/data         { baseVersion, field }: takes a field out for good, with every trace of it
// The employee the sub-site belongs to reads and writes its data; supervisors and administrators read it.
```

**Edit 2.3** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
const MAX_BODY = 8 * 1024 * 1024;
const SITE_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
```

Replace them with:

```text
const MAX_BODY = 8 * 1024 * 1024;
// The fields that can be taken out for good, leaving no trace (see purge in site-data.cjs).
const PURGEABLE = ['priceList'];
const SITE_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
```

**Edit 2.4** — `work/wa-replica/site-api.cjs`. Find exactly these lines (they occur once):

```text
    },
  };
```

Replace them with:

```text
    },
    // Nothing of it is written to the log: what was removed is not to be told anywhere.
    'DELETE /api/data': async req => {
      const user = signedIn(req);
      if (!mayRead(user)) throw problem('forbidden');
      if (!mayWrite(user)) throw problem('read-only');
      const body = await readJson(req);
      if (!PURGEABLE.includes(body.field)) throw problem('invalid-request');
      return { body: data.purge({ baseVersion: body.baseVersion, field: body.field, by: user.username }) };
    },
  };
```

#### `site-api.test.cjs`

**Edit 2.5** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text

test('data: malformed saves are refused and change nothing', async () => {
```

Replace them with:

```text

test('data: the price list can be taken out for good — its rows, its name in the log of saves and what it left in the files; only the sub-site\'s employee may, and only for a field meant for it', async () => {
  const cookie = await member('kai', 'agent', 's1');
  const send = (method, body, options = {}) => call('/api/data', { method, cookie, body, ...options });
  const files = () => ['', '-wal', '-shm'].map(ending => path.join(tmp, 'main', 'site-s1.db' + ending)).filter(file => fs.existsSync(file)).map(file => fs.readFileSync(file).toString('latin1')).join('');
  const start = (await call('/api/data', { cookie })).json.version;
  // a list is saved, then replaced by another in a save that also changes something else
  assert.deepEqual((await send('PUT', { baseVersion: start, set: { priceList: { file: 'prices-FIRST-7781.xlsx', rows: [['PRICE-MARK-ALPHA-7781', 40]] } } })).json, { version: start + 1 });
  assert.deepEqual((await send('PUT', { baseVersion: start + 1, set: { priceList: { file: 'prices-SECOND-7782.xlsx', rows: [['PRICE-MARK-BETA-7782', 55]] }, keep: 'stays' } })).json, { version: start + 2 });
  assert(files().includes('PRICE-MARK-BETA-7782') && files().includes('priceList'), 'before: the list is in the files');
  assert.deepEqual(site.data.lastSaves(2).map(save => save.keys), ['priceList keep', 'priceList']);
  // a removal based on an old version is refused and changes nothing
  assert.deepEqual((await send('DELETE', { baseVersion: start, field: 'priceList' })).json, { error: 'version-conflict', version: start + 2 });
  assert.equal((await call('/api/data', { cookie })).json.data.priceList.rows.length, 1);
  // taken out: gone from the data, the rest untouched, and the version moves on
  const purged = await send('DELETE', { baseVersion: start + 2, field: 'priceList' });
  assert.deepEqual([purged.status, purged.json], [200, { version: start + 3 }]);
  const after = (await call('/api/data', { cookie })).json;
  assert.deepEqual([after.version, 'priceList' in after.data, after.data.keep], [start + 3, false, 'stays']);
  // the log of saves: the entry that named only the list is gone, the other one no longer names it, the removal names nothing
  const log = site.data.lastSaves(10000);
  assert.deepEqual(log.slice(0, 2).map(save => [save.version, save.by, save.keys]), [[start + 3, 'kai', ''], [start + 2, 'kai', 'keep']]);
  assert.deepEqual([log.some(save => save.version === start + 1), log.some(save => save.keys.includes('priceList'))], [false, false]);
  // the files: neither list, neither file name, not even the name of the field
  for (const word of ['PRICE-MARK-ALPHA-7781', 'PRICE-MARK-BETA-7782', 'prices-FIRST-7781', 'prices-SECOND-7782', 'priceList']) assert.equal(files().includes(word), false, word + ' is still in the files');
  assert(files().includes('stays'), 'what was kept is still there');
  // once more with nothing to remove: fine; and saving goes on
  assert.deepEqual((await send('DELETE', { baseVersion: start + 3, field: 'priceList' })).json, { version: start + 4 });
  assert.deepEqual((await send('PUT', { baseVersion: start + 4, set: { keep: 'changed' }, remove: [] })).json, { version: start + 5 });
  // only a field that is meant for it, in a well-formed request
  for (const body of [{ baseVersion: start + 5, field: 'customers' }, { baseVersion: start + 5, field: 'keep' }, { baseVersion: start + 5, field: 'priceList/1' }, { baseVersion: start + 5, field: 5 }, { baseVersion: start + 5 }, { baseVersion: 'x', field: 'priceList' }, { field: 'priceList' }]) {
    assert.deepEqual((await send('DELETE', body)).json, { error: 'invalid-request' }, JSON.stringify(body));
  }
  // only the sub-site's employee
  const supervisor = await member('lea', 'supervisor'), other = await member('max', 'agent', 's2');
  assert.deepEqual((await send('DELETE', { baseVersion: start + 5, field: 'priceList' }, { cookie: supervisor })).json, { error: 'read-only' });
  assert.deepEqual((await send('DELETE', { baseVersion: start + 5, field: 'priceList' }, { cookie: other })).json, { error: 'forbidden' });
  assert.equal((await send('DELETE', { baseVersion: start + 5, field: 'priceList' }, { cookie: '' })).status, 401);
  assert.equal((await send('DELETE', { baseVersion: start + 5, field: 'priceList' }, { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.deepEqual([(await call('/api/data', { cookie })).json.version, (await call('/api/data', { cookie })).json.data.keep], [start + 5, 'changed'], 'the refused requests changed nothing');
  // nothing of a removal is written to the server's log
  assert.equal(logged.some(line => /purge|priceList|price/i.test(line)), false);
});

test('data: malformed saves are refused and change nothing', async () => {
```

**Edit 2.6** — `work/wa-replica/site-api.test.cjs`. Find exactly these lines (they occur once):

```text
  assert.deepEqual([crossSite.status, crossSite.json], [403, { error: 'forbidden' }]);
  assert.equal((await call('/api/data', { method: 'DELETE', cookie: owner })).status, 405);
  assert.equal((await call('/api/auth/unknown')).status, 404);
```

Replace them with:

```text
  assert.deepEqual([crossSite.status, crossSite.json], [403, { error: 'forbidden' }]);
  assert.equal((await call('/api/data', { method: 'PATCH', cookie: owner })).status, 405);
  assert.equal((await call('/api/auth/unknown')).status, 404);
```

**Verify**: `sha256sum work/wa-replica/site-data.cjs work/wa-replica/site-api.cjs work/wa-replica/site-api.test.cjs` → `0eee73f6b7e3a34220a5a53a002f98afa47e911941f6c8b27f0213866f1109f0`, `f32cb3aacb8b7af101baae0445cc194a693441d73a328c8949f6e01ff188213d`, `3bb237cde658c0c254f13d904f6eb50323b13e902396fab028fffb0c311681aa`; `node --check work/wa-replica/site-data.cjs` and `node --check work/wa-replica/site-api.cjs` exit 0; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 13`, `fail 0`. If a checksum does not match, restore the file with `git checkout d717f34 -- <file>` and apply its instructions again; if it still does not match, or a test fails, STOP.

### Step 3: The page removes the list through the server

#### `fidelity-boot.js`

**Edit 3.1** — `work/wa-replica/fidelity-boot.js`. Find exactly these lines (they occur once):

```text
    }
    // Resolves when everything is saved (used before signing out, and by tests).
```

Replace them with:

```text
    }
    // Takes a field out for good: the server removes it with every trace of it (purge in site-data.cjs). What is
    // still waiting is saved first; afterwards the field is gone here too, without a save that would name it.
    // Answers whether it was done.
    async function purge(field) {
      for (let rounds = 0; (saving || pending || timer) && rounds < 400 && !stopped && !failures; rounds += 1) {
        if (saving) await new Promise(resolve => setTimeout(resolve, 50));
        else await flush();
      }
      if (saving || pending || stopped || failures) return false;
      saving = true;
      let answer;
      try {
        answer = await request('/api/data', { method: 'DELETE', body: { baseVersion: version, field } });
      } catch {
        answer = { status: 0, body: {} };
      }
      saving = false;
      if (answer.status === 409) stop('数据已在别处更新', '这个子站的数据刚刚在另一个页面或设备上被修改。请刷新后继续；本页最近一次修改没有保存。');
      if (answer.status === 401) stop('登录已失效', '请刷新页面后重新登录；本页最近一次修改没有保存。');
      if (answer.status === 200) {
        version = answer.body.version;
        for (const key of [...synced.keys()]) if (key === field || key.startsWith(field + '/')) synced.delete(key);
        delete data[field];
      }
      if (pending && !timer && !stopped) timer = setTimeout(flush, SAVE_DELAY);
      return answer.status === 200;
    }
    // Resolves when everything is saved (used before signing out, and by tests).
```

**Edit 3.2** — `work/wa-replica/fidelity-boot.js`. Find exactly these lines (they occur once):

```text
    // halt stops this page with a notice; the app uses it when another page takes over the sub-site.
    window.WA_SITE = { user, site, data, save, idle, signOut, halt: stop };
    $('#subsite-login').hidden = true;
```

Replace them with:

```text
    // halt stops this page with a notice; the app uses it when another page takes over the sub-site.
    window.WA_SITE = { user, site, data, save, idle, signOut, halt: stop, purge };
    $('#subsite-login').hidden = true;
```

#### `fidelity-pricelist.js`

**Edit 3.3** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
        <input type="search" class="fid-input" id="price-search" aria-label="搜索价格表" placeholder="搜索简称 / 名称 / 规格" value="${esc(priceView.query)}" ${list ? '' : 'disabled'}>
        ${list ? fidButton('清空价格表', 'priceClear', 'Trash2') : ''}
        <span class="fid-small-note" id="price-about">${esc(about)}</span>
```

Replace them with:

```text
        <input type="search" class="fid-input" id="price-search" aria-label="搜索价格表" placeholder="搜索简称 / 名称 / 规格" value="${esc(priceView.query)}" ${list ? '' : 'disabled'}>
        ${list ? fidButton('彻底删除价格表', 'priceClear', 'Trash2') : ''}
        <span class="fid-small-note" id="price-about">${esc(about)}</span>
```

**Edit 3.4** — `work/wa-replica/fidelity-pricelist.js`. Find exactly these lines (they occur once):

```text
    },
    priceClear: () => { if (priceList()) fidConfirm('清空价格表', '清空后，聊天界面的「报价」将没有可选的产品。确认清空当前价格表？', 'priceClearDo'); },
    priceClearDo: () => {
      delete data.priceList;
      Object.assign(priceView, { pending: null, query: '' });
      persist();
      close();
      render();
      toast('价格表已清空。');
    },
```

Replace them with:

```text
    },
    priceClear: () => { if (priceList()) fidConfirm('彻底删除价格表', '价格表会从系统中彻底删除：页面上、服务器保存的数据和保存记录里都不再留下它，无法恢复。删除后，聊天界面的「报价」将没有可选的产品；已经放进消息或草稿里的报价不受影响。确认彻底删除？', 'priceClearDo'); },
    // The server takes the list out with every trace of it (WA_SITE.purge); only then is it gone from the page.
    priceClearDo: async () => {
      close();
      if (!(await window.WA_SITE.purge('priceList'))) return toast('价格表没有删除：暂时无法连接服务器，请稍后重试。');
      Object.assign(priceView, { pending: null, query: '' });
      render();
      toast('价格表已彻底删除，没有留下记录。');
    },
```

#### `validate-scrm-lifecycle.cjs`

**Edit 3.5** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
}
// The list of conversations keeps its place when the page is drawn again.
```

Replace them with:

```text
}
// The price list is taken out for good: the page asks the server to remove it with every trace, never by an
// ordinary save that would name it in the log of saves.
for (const required of ["if (!(await window.WA_SITE.purge('priceList'))) return toast('价格表没有删除：暂时无法连接服务器，请稍后重试。');", "fidButton('彻底删除价格表', 'priceClear', 'Trash2')"]) {
  assert(read(path.join(__dirname, 'fidelity-pricelist.js')).includes(required), `fidelity-pricelist.js is missing ${required}`);
}
assert(!read(path.join(__dirname, 'fidelity-pricelist.js')).includes('delete data.priceList'), 'the price list must not be removed by an ordinary save');
for (const [file, required] of [['fidelity-boot.js', "answer = await request('/api/data', { method: 'DELETE', body: { baseVersion: version, field } });"], ['site-api.cjs', "const PURGEABLE = ['priceList'];"], ['site-api.cjs', "'DELETE /api/data': async req => {"], ['site-data.cjs', "db.exec('VACUUM');"], ['site-data.cjs', "db.exec('PRAGMA wal_checkpoint(TRUNCATE)');"], ['site-data.cjs', "else db.prepare('DELETE FROM saves WHERE version = ?').run(row.version);"]]) {
  assert(read(path.join(__dirname, file)).includes(required), `${file} is missing ${required}`);
}
// The list of conversations keeps its place when the page is drawn again.
```

**Edit 3.6** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
assert(!/lcSimLeadOpen|lcSimReply|openSimLeadModal|lcSimulateCustomerReply|lc-sim-lead|模拟/.test(moduleSource), 'fidelity-lifecycle.js must not simulate leads or replies');
assert(bootSource.includes('window.WA_SITE = { user, site, data, save, idle, signOut, halt: stop };'), 'fidelity-boot.js must let the app stop the page with a notice');
// A release does not speak of a demonstration, a prototype, a review or of saving on this machine (plan 032),
```

Replace them with:

```text
assert(!/lcSimLeadOpen|lcSimReply|openSimLeadModal|lcSimulateCustomerReply|lc-sim-lead|模拟/.test(moduleSource), 'fidelity-lifecycle.js must not simulate leads or replies');
assert(bootSource.includes('window.WA_SITE = { user, site, data, save, idle, signOut, halt: stop, purge };'), 'fidelity-boot.js must let the app stop the page with a notice');
// A release does not speak of a demonstration, a prototype, a review or of saving on this machine (plan 032),
```

**Edit 3.7** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  whatsappConnection: 'real, through the sub-site\'s own server: QR code, incoming events, sending; no simulation',
  priceList: 'an .xlsx or .csv file is read in the browser (pricefile.js) and, once confirmed, replaces the list; the button 报价 beside the message box puts one product\'s price into the message box and sends nothing',
  messageTranslation: 'once per message and reading language: kept on the message (translatedTo) and saved; the conversation on screen asks only for messages without a mark; the relay keeps every translation in ai-translations.db and gives it again',
```

Replace them with:

```text
  whatsappConnection: 'real, through the sub-site\'s own server: QR code, incoming events, sending; no simulation',
  priceList: 'an .xlsx or .csv file is read in the browser (pricefile.js) and, once confirmed, replaces the list; the button 报价 beside the message box puts one product\'s price into the message box and sends nothing; the list can be taken out for good: its rows, its name in the log of saves and what it left in the database files',
  messageTranslation: 'once per message and reading language: kept on the message (translatedTo) and saved; the conversation on screen asks only for messages without a mark; the relay keeps every translation in ai-translations.db and gives it again',
```

**Verify**: `sha256sum work/wa-replica/fidelity-boot.js work/wa-replica/fidelity-pricelist.js work/wa-replica/validate-scrm-lifecycle.cjs` → `d8b288eb5f6e4998d51c5ef88c18c289dc9aaede03cdf2bfdcc8065b00a17bfd`, `175929a04a40885dd946de63be414d8514a132b7af60e70c9fd4ffd3bfb81788`, `10411cb4be735187a0f539eb10b847d29b49ad4efb04ccae3e0c5a0b0e5ecbb6`; the syntax command → `SYNTAX_OK`; `git checkout d717f34 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84` (a message "Missing prototype source anchor" means a swap does not match the baseline — STOP); `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; `sha256sum outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/boot.js` → `501dda1e61e521e559b919e9b2ec73efcab7069b8bf23f0cbc9929e637ab4fbf`, `d8b288eb5f6e4998d51c5ef88c18c289dc9aaede03cdf2bfdcc8065b00a17bfd`. If a checksum does not match, restore the file with `git checkout d717f34 -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 4: README, build log, final verification

#### `README.md`

**Edit 4.1** — `README.md`. Find exactly these lines (they occur once):

```text
| `#ai` | **AI 能力** | AI 功能的统一接入点：能力清单与逐项启停（会话消息翻译、发送前翻译、语音转文字）、译文语言、回复语气、业务说明与发送保护设置、按能力累计的调用次数与字符数、最近调用记录；经本站服务器中转调用模型服务；服务器未配置时显示「未连接」，不提供翻译 |
| `#prices` | **价格表** | 上传一份 Excel（.xlsx）或 CSV 文件作为价格表：文件在浏览器内读取，先预览识别结果，确认后替换当前价格表；按简称、名称、规格搜索。聊天界面消息框旁的「报价」按钮从价格表查找产品，点击价格即把一行报价（如 `Product Alpha PRDA01 (100*10 Units): $40`）放入消息框，由员工确认后发送；系统不自动报价、不自动发送 |

```

Replace them with:

```text
| `#ai` | **AI 能力** | AI 功能的统一接入点：能力清单与逐项启停（会话消息翻译、发送前翻译、语音转文字）、译文语言、回复语气、业务说明与发送保护设置、按能力累计的调用次数与字符数、最近调用记录；经本站服务器中转调用模型服务；服务器未配置时显示「未连接」，不提供翻译 |
| `#prices` | **价格表** | 上传一份 Excel（.xlsx）或 CSV 文件作为价格表：文件在浏览器内读取，先预览识别结果，确认后替换当前价格表；按简称、名称、规格搜索。聊天界面消息框旁的「报价」按钮从价格表查找产品，点击价格即把一行报价（如 `Product Alpha PRDA01 (100*10 Units): $40`）放入消息框，由员工确认后发送；系统不自动报价、不自动发送。「彻底删除价格表」把价格表从系统中完全移除：服务器删除它的数据、把它从保存记录中抹去，并重写数据库文件，不留下任何内容（接口 `DELETE /api/data`）；已经放进消息或草稿里的报价不受影响 |

```

#### `replica/build-log.md`

**Append 4.2** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 价格表可以彻底删除，不留记录 · 2026-11-23

按项目负责人的要求：上传的价格表（报价单）必须能从系统中完全移除，不留下任何痕迹。此前「清空价格表」只是把它从页面和当前数据里去掉：服务器的保存记录里仍会留下「价格表在某时由某账号保存过」的条目，被删除的内容也可能在数据库文件未被覆盖的位置残留一段时间。

现在：「价格表」页的按钮改为「彻底删除价格表」。确认后，服务器删除价格表的数据，把它的名字从保存记录中抹去（只记录过价格表的条目整条删除），随后重写数据库文件并清空预写日志，文件里不再有价格表的任何内容；这一操作本身不写入服务器日志。完成后页面才显示价格表已删除。

说明：价格表文件本身从不上传到服务器（只在浏览器内读取）；已经放进消息或草稿里的报价属于聊天内容，不受影响。部署：服务器文件有变更，合并后需要重启一次预览服务。
```

Then verify everything once more:

```bash
git checkout d717f34 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-049/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test run ends with `pass 13`, `fail 0`; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `41ef495566db0c5c8670ffa41d6a3cc1d1b1d12376b2a48e17636b6a63a529e7`, `1c7c18ba177029e281cc7cd0345bdadbb28df1c9cbd2c0ece0c575fb8717d4a4`; `git status --porcelain` lists exactly eleven paths: `README.md`, `replica/build-log.md`, the six source files under `work/wa-replica/`, and `outputs/wa-replica-prototype/app.js`, `boot.js` and `validation.json` (if `outputs/wa-replica-prototype/icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Sign-in and data tests** (13, one new): a list is saved, then replaced by another in a save that also changes something else; a removal based on an old version is refused and changes nothing; the removal takes the list out of the data and leaves the rest; in the log of saves the entry that named only the list is gone, the other one no longer names it, and the removal names nothing; the database file, its write-ahead log and its index hold neither list, neither file name nor the name of the field; a second removal with nothing to remove is fine and saving goes on; another field, a part of a field or a malformed request is refused; a supervisor, an employee of another sub-site, nobody and a page of another site are refused; nothing of a removal is in the server's log.
- **Validator** — the page removes the list through `WA_SITE.purge` and never by `delete data.priceList`; the boot file sends `DELETE /api/data`; the server names the one field, rewrites the file and empties the write-ahead log.
- **Smoke** (`/tmp/wa-scrm-plan-049/smoke.sh`) — the same facts on the sources and the built page, the README, the build log, the syntax of the four files and the tests of the server, the relay and the link.
- The build and the validator do not run the page. **Verified by the reviewer in scripted browser sessions, not by you**: the button reads "彻底删除价格表" and asks first, saying that it cannot be undone and what stays; cancelled, the list stays; before the removal the server's files and its log of saves know the list; after it the page has no list and says so, the server has none, the version has moved on, and neither the current list nor the one it had replaced, neither file name nor the name of the field is found in the server's files or in its log of saves; the page goes on saving; a list can be used and removed again. The sessions of the rest of the product and of the connection still pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout d717f34 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 23`, `fail 0`
- [ ] `$NODE --test work/wa-replica/ai-relay.test.cjs` → `pass 14`, `fail 0`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 13`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-049/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/site-data.cjs` → `0eee73f6b7e3a34220a5a53a002f98afa47e911941f6c8b27f0213866f1109f0`
- [ ] `sha256sum work/wa-replica/site-api.cjs` → `f32cb3aacb8b7af101baae0445cc194a693441d73a328c8949f6e01ff188213d`
- [ ] `sha256sum work/wa-replica/site-api.test.cjs` → `3bb237cde658c0c254f13d904f6eb50323b13e902396fab028fffb0c311681aa`
- [ ] `sha256sum work/wa-replica/fidelity-boot.js` → `d8b288eb5f6e4998d51c5ef88c18c289dc9aaede03cdf2bfdcc8065b00a17bfd`
- [ ] `sha256sum work/wa-replica/fidelity-pricelist.js` → `175929a04a40885dd946de63be414d8514a132b7af60e70c9fd4ffd3bfb81788`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `10411cb4be735187a0f539eb10b847d29b49ad4efb04ccae3e0c5a0b0e5ecbb6`
- [ ] `sha256sum README.md` → `41ef495566db0c5c8670ffa41d6a3cc1d1b1d12376b2a48e17636b6a63a529e7`
- [ ] `sha256sum replica/build-log.md` → `1c7c18ba177029e281cc7cd0345bdadbb28df1c9cbd2c0ece0c575fb8717d4a4`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `501dda1e61e521e559b919e9b2ec73efcab7069b8bf23f0cbc9929e637ab4fbf`
- [ ] `sha256sum outputs/wa-replica-prototype/boot.js` → `d8b288eb5f6e4998d51c5ef88c18c289dc9aaede03cdf2bfdcc8065b00a17bfd`
- [ ] `git diff --quiet d717f34 -- outputs/wa-replica-prototype/icons.js` exits 0 (the icon file is unchanged)
- [ ] `git diff --name-only d717f34..HEAD -- . ':!plans'` lists exactly these eleven: `README.md`, `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/boot.js`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/fidelity-boot.js`, `work/wa-replica/fidelity-pricelist.js`, `work/wa-replica/site-api.cjs`, `work/wa-replica/site-api.test.cjs`, `work/wa-replica/site-data.cjs`, `work/wa-replica/validate-scrm-lifecycle.cjs`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build stops with "Missing prototype source anchor" or another assertion, reports another number of icons than 84, a test fails, or the validator fails.
- An output file other than `app.js`, `boot.js` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file.

## Maintenance notes

- **Deployment**: `site-data.cjs` and `site-api.cjs` are loaded when the server starts — **the preview service must be restarted once after the merge**. A page that is open with the old page files keeps its old button until it is refreshed; the old button still removes the list by an ordinary save, which leaves the two traces this plan is about — refresh before removing a list.
- Which fields can be taken out this way is one list, `PURGEABLE` in `site-api.cjs`. A field that is added there must be one the page never needs to restore.
- Rewriting the file takes longer the larger the data is (it is a few megabytes at most today) and happens while the employee waits for the answer.
- Copies made outside the server's own files — an export with the administration tool, a backup of the data folder — are not reached by this; none are made automatically today.
- What a reviewer should scrutinise: that the page and the server agree on the version after a removal (the next save must not be refused); that the files hold nothing of the list; that nothing but the price list can be removed through the route.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
