# Plan 026: The page uses the real WhatsApp connection — QR code, incoming messages, sending; the simulation is removed

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 6726127..HEAD -- work/wa-replica README.md PRODUCT.md DESIGN.md replica/build-log.md outputs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MEDIUM (one page module is replaced, four files get small edits; everything is given as exact text and checked by checksums)
- **Depends on**: plans/025-openwa-link-server.md (DONE)
- **Category**: direction
- **Planned at**: commit `6726127`, 2026-11-21

## Why this matters

The owner decided on 2026-11-21 to turn the prototype into a product. Every sub-site has its own OpenWA (the open-source WhatsApp gateway `rmyndharis/OpenWA`). Since plan 025 the sub-site's server can talk to it (`/api/wa/*`: link a number and get its QR code, a feed of what happens on the numbers, send text, unlink). The page, however, still **simulates** all of this: a made-up QR code and a "simulate scan" button, "simulate a new lead", "simulate a reply", messages that are only stored locally and marked "local demo".

This plan switches the page over and removes the simulation:

- **Linking.** "扫码绑定" shows the QR code the server returns and follows it when it changes; after the scan the number is online with the number and name WhatsApp reports. A dropped number is reconnected (without a scan when the session is intact, with a new QR code otherwise). New: "解除绑定".
- **Receiving.** The page reads the server's feed for as long as it is open. A customer's message goes into that customer's conversation (matched by WhatsApp chat id, or by phone number the first time); the first message of an unknown number creates the customer, and the follow-up module then creates the first-reply to-do, as it did for simulated leads. Receipts, edits, deletions, messages typed on the phone and the state of the numbers arrive the same way. While nobody has the page open, the server keeps everything; the next page that opens catches up in order.
- **Sending.** A message goes through the server. Every press of the send button is one request id, so a retry never sends twice. A message shows what became of it: sending, sent, delivered, read, not sent, or outcome open — the last two with a retry.
- **One page at a time.** A page that opens the sub-site takes the feed over, as WhatsApp Web does; the page that loses it stops with a notice and saves nothing more.
- **Not disturbed while typing.** When a message arrives the page is drawn again; focus, caret and an input-method composition survive that.

### Decisions already made (do not re-open; do not ask)

- Only chats with one person. Text only for sending; a received picture or recording shows as a placeholder such as `[图片]` until the media step.
- A customer created from a first message gets language `其他` (no automatic translation of replies into a guessed language) and source `未知来源`.
- The button and dialog for a made-up attachment are removed; the rest of the attachment code of the baseline stays untouched and unreachable.
- Other "演示" wording on functions that are real now (tag, role and account screens) is left for the wording clean-up.
- Three icons leave the icon set because nothing uses them any more: `Paperclip`, `ScanQrCode`, `MessageSquareReply`. No icon is added.
- The version string and `requirement.updatedOn` do not change.

### What was verified before this plan was written

The result of this plan was built in a scratch copy and driven in a real browser against the server of plan 025 and a stand-in OpenWA: 14 scripted sessions of the connection itself (the QR code and its change, the scan, a cancelled link leaving nothing behind, a first message of an unknown number, a known customer, a closed customer, a group message being ignored, a chat started on the phone, sending with receipts, the page's own message announced by OpenWA before and after the answer to the send, failed and open sends with a retry under the same request id, a dropped number and its two ways back, unlinking, typing while a message arrives, a second page taking over, catching up after being closed, edited and deleted messages), and the existing 65 sessions of the rest of the product, of which those that used the simulators now let the stand-in deliver the messages.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (accounts, one sub-site's data, an AI relay, the link to OpenWA; Node 22.13 or newer). There is no package.json. Documentation text is **Simplified Chinese**; code, comments and commit messages are English.

### How the build works

`work/wa-replica/build-fidelity.cjs` reads a frozen baseline app (`work/wa-replica/fidelity-base/app.js`) into the variable `js`, applies substitutions with `swap(from, to)` (first occurrence; it fails when `from` is missing) and `cut(pattern, what)`, puts the module files (`fidelity-ui.js`, `fidelity-customer-pages.js`, `fidelity-operations.js`, `fidelity-openwa.js`, `fidelity-dashboard.js`, `fidelity-lifecycle.js`, `fidelity-ai.js`, `fidelity-subsite.js`) into the same function, checks the result with `new vm.Script(js, {filename:'app.js'});` and writes `outputs/wa-replica-prototype/*`. **Never change an existing `swap` or `cut` call. Outputs are committed and must be regenerated by running the build, never edited by hand.**

The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js` and keeps those the page still names. **Restore that file from git before every build** (command below); otherwise an icon dropped by an earlier build is missing for good.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/fidelity-openwa.js` | `9dc7937dbe3a0ea0585701abe76f0ecdb896373ff4497aed5ec9f5da74669ccf` | `cd4a1737be6a009c3c6ae6bb61e5d7b8a80cbf4ebf8009c78b8c56d6dcef37c1` |
| `work/wa-replica/fidelity-boot.js` | `738983a9c92b481d8224b616d6124f591262d2271eaa2dd684d1ac7f1d79bd78` | `185d5070ea8556fda1e6ff3b7777cca53f699ef2e544c93f9a8a0fcc20a6f98e` |
| `work/wa-replica/fidelity-lifecycle.js` | `d5ef799272e2ca212b396b0d5e29d344d85f1f7a5c3631e1cd498ce184fdde56` | `0ee6ab56c02f4e1e6ae548c0795fa688c0618ac6193f0dda1a7b749425ce74e7` |
| `work/wa-replica/fidelity-ai.js` | `8f59f6a8e3930d7d8ac0ea5b637ad5cf990f15b0574d0b880b60154d9675d79f` | `c84015c912dfadda1ff37112db95c1913e5451d67f2e39595f12a42bc14fb4be` |
| `work/wa-replica/fidelity.css` | `5cafac3d8e8d4d6dccf82daf99820202a735effa5f184e1c8368f6762ccee84e` | `1db4ec98ee09765525e054c2bd67c37f65e0026a21a53dda584ab03b526bc792` |
| `work/wa-replica/build-fidelity.cjs` | `a8ac120903fa8876d40d8551d10da467ea28fe09f5c8083ecc46e0f759bbc64f` | `3de5581a0d9fea08cdf3269141185f10bd8f0440dd75a3820aa6044cd14db51a` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `1206e7c7292766c1f0d68bfefb175bead242700dbb583b3c91cb1d3a60d044ec` | `e0e7b3f621483c75b4fc426bc6c2c0f976362038c2e218aab790f896530f1840` |

- `fidelity-openwa.js` (266 lines today) is the simulated account module: a made-up QR code, "模拟扫码", "模拟掉线", "模拟重连", a sample chat after the scan. It is **replaced as a whole** (Step 2).
- `fidelity-lifecycle.js` holds the two other simulators: the button and form "模拟新客进线" and the buttons "模拟对方回复" / "模拟客户复联" with their function. Its `lcSyncRuntimeCustomers()` already turns a customer marked `needsFirstReply` into a first-reply to-do on the next render; the new module relies on that.
- `fidelity-boot.js` starts the page (sign-in, loading and saving the data). Its internal `stop(title, notice)` shows a notice instead of the app and stops saving; this plan exposes it to the app as `window.WA_SITE.halt`.
- `validate-scrm-lifecycle.cjs` holds numbered sections 1–21 of assertions and a `const summary = {` object. It already defines `read`, `path`, `fs`, `assert`, `appJs`, `moduleSource` (the lifecycle module), `openwaSource`, `aiSource` and `bootSource`.

### The server routes the page uses (plan 025, unchanged here)

`GET /api/wa/status` → `{ configured, reachable, accounts: [{ account, state, phone, name, error, restricted }] }`; `POST /api/wa/link { account }` and `GET /api/wa/link?account=` → the number's state (`starting | scan | verifying | online | offline | attention | failed | missing`) and, while it is `scan`, `qr` (a PNG data URL); `POST /api/wa/unlink { account }`; `POST /api/wa/send { account, to, text, requestId }` → `{ messageId, timestamp }` or an error (`not-connected`, `outcome-unknown`, `send-refused`, …); `POST /api/wa/claim { client }`; `GET /api/wa/events?after=&client=&wait=` → `{ events, last }`, or 409 `taken-over`. Events: `message`, `receipt`, `revoked`, `edited`, `state`, `restriction`.

### Repo conventions to match

- Module code is indented by two spaces because it is put inside the app's function; helpers of a module carry its prefix (`openwa…`).
- Commit messages: conventional commits, e.g. `feat(scrm): server side of the link to OpenWA`.

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 6726127 -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Link tests | `env -u WA_SCRM_OPENWA_ENV $NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 13`, `fail 0` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 12`, `fail 0` |
| Relay tests | `node --test work/wa-replica/ai-relay.test.cjs` | `pass 12`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-026/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |
| Syntax of the modules | `for f in fidelity-openwa.js fidelity-lifecycle.js fidelity-ai.js; do node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync(process.argv[1],'utf8')+'})')" work/wa-replica/$f && echo "$f SYNTAX_OK"; done` | three lines ending in `SYNTAX_OK` |
| Icon set | `node -e "const vm=require('vm'),fs=require('fs'),cp=require('child_process');const keys=s=>{const w={};vm.runInNewContext(s,{window:w});return Object.keys(w.WA_ICONS)};const a=keys(cp.execSync('git show 6726127:outputs/wa-replica-prototype/icons.js').toString()),b=keys(fs.readFileSync('outputs/wa-replica-prototype/icons.js','utf8'));console.log('removed='+a.filter(x=>!b.includes(x)).join(',')+' added='+b.filter(x=>!a.includes(x)).join(','))"` | `removed=Paperclip,ScanQrCode,MessageSquareReply added=` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-openwa.js` (Step 2, replaced as a whole)
- `work/wa-replica/fidelity-boot.js`, `work/wa-replica/fidelity-lifecycle.js`, `work/wa-replica/fidelity-ai.js` (Step 3)
- `work/wa-replica/build-fidelity.cjs`, `work/wa-replica/fidelity.css` (Step 4)
- `work/wa-replica/validate-scrm-lifecycle.cjs` (Step 5)
- `README.md`, `PRODUCT.md`, `DESIGN.md`, `outputs/wa-replica-prototype/README.md`, `replica/build-log.md` (Step 6)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{index.html,app.js,app.css,tokens.css,components.css,icons.js,boot.js,lucide-license.txt,requirements.json,validation.json}`

**Out of scope** (do NOT touch):

- `work/wa-replica/fidelity-base/**`; the other module files (`fidelity-ui.js`, `fidelity-customer-pages.js`, `fidelity-operations.js`, `fidelity-dashboard.js`, `fidelity-subsite.js`, `fidelity-index.html`); every server file (`serve.cjs`, `site-*.cjs`, `ai-relay*.cjs`, `openwa-link*.cjs`, `openwa.env.example`).
- The existing `swap(...)` and `cut(...)` calls of the build script.
- `plans/**`, earlier entries of `replica/build-log.md`.
- Any real OpenWA, any settings file with a key, any data folder inside the repository.
- New dependencies, icons, colour values or files.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/026-page-real-whatsapp` first.
- One or two commits are fine. Conventional commit message, e.g. `feat(scrm): the page uses the real WhatsApp connection`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: a **Whole file** gives the complete new content of an existing file; write exactly that content and end the file with one line end. An **Edit** gives a text to find (it occurs exactly once in the named file) and the text that replaces it. **Cut lines** deletes whole lines. A **Cut range** names the beginning of the first line to delete and the beginning of the first line to keep; every line in between goes. An **Insert** names the beginning of a line (exactly one line starts that way) and the text to put directly above it. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Before each change, confirm that the text to find (or each line beginning) occurs exactly once. The checksums of the table in "Current state" tell you after Steps 2–5 whether the seven source files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-026/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-026 && cat > /tmp/wa-scrm-plan-026/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that the built page uses the real WhatsApp connection through its own server and that nothing simulates it.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); OUT=$(mktemp -d); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
hasnot() { grep -qF -- "$3" "$2" && { echo "LEFT $1"; FAIL=1; } || echo "ok   $1"; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
for word in '模拟扫码' '模拟掉线' '模拟新客进线' '模拟对方回复' '模拟客户复联' '<span>本地演示</span>' '演示消息' '添加演示附件' 'openwaDemoQr' 'lcSimReply'; do hasnot "the app no longer contains $word" "$P/app.js" "$word"; done
has 'the app asks its own server about the numbers' "$P/app.js" "fetch('/api/wa/' + path, {"
has 'the app reads the feed of its server' "$P/app.js" 'events?after=${Number(data.waCursor) || 0}&client=${openwaClient}'
has 'the app sends through its server' "$P/app.js" "openwaCall('POST', 'send', {"
has 'a page that loses the sub-site stops' "$P/app.js" "window.WA_SITE.halt('已在其他页面打开'"
has 'the start-up script lets the app stop the page' "$P/boot.js" 'signOut, halt: stop };'
same 'the start-up script is the one of the sources' "$(cmp -s "$W/fidelity-boot.js" "$P/boot.js" && echo same)" same
same 'the link tests pass' "$(env -u WA_SCRM_OPENWA_ENV "$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 13 ℹ fail 0 '
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
export WA_SCRM_DATA_DIR="$OUT/data" WA_SCRM_SITE_ID=demo
PW=$("$NODE" "$W/site-admin.cjs" user add smoke agent Smoke Test | sed -n 's/^temporary password: //p')
PORT=$(( 56600 + RANDOM % 300 )); env -u WA_SCRM_AI_ENV -u WA_SCRM_OPENWA_ENV "$NODE" "$W/serve.cjs" "$PORT" >"$OUT/serve.log" 2>&1 & SRV=$!
B="http://127.0.0.1:$PORT"; for i in $(seq 1 40); do curl -s -o /dev/null "$B/" && break; sleep 0.25; done
prof=$(mktemp -d); timeout 90 /usr/bin/google-chrome --headless=new --no-sandbox --disable-gpu --user-data-dir="$prof" --enable-logging=stderr --v=0 --virtual-time-budget=4000 --dump-dom "$B/" 2>"$OUT/page.log" >"$OUT/page.html"; rm -rf "$prof"
same 'the page loads without script errors' "$(grep -ciE 'Uncaught|ReferenceError|TypeError|SyntaxError' "$OUT/page.log")" 0
has 'a visitor sees the sign-in form' "$OUT/page.html" '<h1 id="subsite-login-title" tabindex="-1">登录</h1>'
J="$OUT/jar"
same 'signing in works' "$(code -b "$J" -c "$J" -X POST -H 'Content-Type: application/json' -d "{\"username\":\"smoke\",\"password\":\"$PW\"}" "$B/api/auth/login")" 200
same 'the password can be changed' "$(code -b "$J" -c "$J" -X POST -H 'Content-Type: application/json' -d "{\"current\":\"$PW\",\"next\":\"smoke-test-passphrase\"}" "$B/api/auth/password")" 200
same 'without a settings file the server says the link is not set up' "$(curl -s -b "$J" "$B/api/wa/status")" '{"configured":false,"reason":"no-settings-file"}'
same 'a new sub-site is empty' "$(curl -s -b "$J" "$B/api/data")" '{"version":0,"data":{}}'
kill "$SRV" 2>/dev/null; wait "$SRV" 2>/dev/null
unset WA_SCRM_DATA_DIR WA_SCRM_SITE_ID
echo "artifacts: $OUT"
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-026/smoke.sh && ls -l /tmp/wa-scrm-plan-026/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js work/wa-replica/fidelity-boot.js work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-ai.js work/wa-replica/fidelity.css work/wa-replica/build-fidelity.cjs work/wa-replica/validate-scrm-lifecycle.cjs` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-026/smoke.sh; git status --porcelain` → exactly these checks fail, so the run ends with `SMOKE FAIL` (expected at this point): the ten checks `the app no longer contains …` (printed with `LEFT`), and the five checks `the app asks its own server about the numbers`, `the app reads the feed of its server`, `the app sends through its server`, `a page that loses the sub-site stops` and `the start-up script lets the app stop the page` (printed with `MISS`); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The account module (`work/wa-replica/fidelity-openwa.js`)

**Whole file 2.1** — `work/wa-replica/fidelity-openwa.js`. Replace the whole content of this existing file with exactly this content, followed by one line end after the last line (503 lines, sha256 `cd4a1737be6a009c3c6ae6bb61e5d7b8a80cbf4ebf8009c78b8c56d6dcef37c1`):

```js
  // WhatsApp numbers through the sub-site's own OpenWA. The page talks to its own server only (/api/wa/*):
  // linking a number by QR code, the feed of what happens on the numbers, and sending.
  const openwaDialog = $('#dialog');
  let openwaPairing = null;
  // What the server said about the link: null until asked, then { configured, reachable }.
  let openwaServer = null;
  const openwaClient = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

  async function openwaCall(method, path, body) {
    try {
      const response = await fetch('/api/wa/' + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
      let answer = {};
      try { answer = await response.json(); } catch (e) {}
      return { status: response.status, body: answer };
    } catch (e) {
      return { status: 0, body: {} };
    }
  }
  const openwaProblem = answer => answer.status === 0 ? '无法连接服务器，请检查网络后重试。'
    : answer.status === 503 ? '服务器尚未接入 WhatsApp 连接，请联系管理员。'
    : answer.status === 502 ? 'WhatsApp 连接服务暂时不可用，请稍后重试。'
    : answer.status === 401 ? '登录已失效，请刷新页面后重新登录。'
    : answer.status === 403 ? '当前账号不能管理号码。' : '操作没有成功，请重试。';

  const openwaVisibleAccount = id => myAccounts().find(a => a.id === id);
  const openwaLinkStates = { scan: '需要重新扫码', attention: '需要在手机上处理', failed: '连接失败', missing: '需要重新绑定' };
  const openwaState = a => a.state === 'online' ? '在线' : a.state === 'reconnect' ? openwaLinkStates[a.linkState] || '已掉线' : '待绑定';
  const openwaClock = (at = Date.now()) => new Date(at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const openwaDayOf = at => new Date(at).toLocaleDateString('sv-SE');
  // How a message's day and time are shown. Messages from before the real connection carry a text only.
  const openwaDayLabel = m => !m.at ? (m.time.startsWith('昨天') ? '昨天' : '今天')
    : openwaDayOf(m.at) === openwaDayOf(Date.now()) ? '今天' : openwaDayOf(m.at) === openwaDayOf(Date.now() - 86400000) ? '昨天' : openwaDayOf(m.at);
  const openwaTimeLabel = m => m.at ? openwaClock(m.at) : m.time.replace('昨天 ', '');
  const openwaLastLabel = c => !c.lastAt ? c.last
    : openwaDayOf(c.lastAt) === openwaDayOf(Date.now()) ? openwaClock(c.lastAt) : openwaDayOf(c.lastAt) === openwaDayOf(Date.now() - 86400000) ? '昨天' : openwaDayOf(c.lastAt).slice(5);
  // The conversation with the latest message comes first; conversations without a real message keep their order after them.
  const openwaOrder = list => list.map((c, i) => [c, i]).sort((x, y) => (y[0].lastAt || 0) - (x[0].lastAt || 0) || x[1] - y[1]).map(x => x[0]);
  const openwaMediaText = { image: '[图片]', video: '[视频]', audio: '[语音]', voice: '[语音]', document: '[文件]', sticker: '[贴图]', location: '[位置]', contact: '[名片]', poll: '[投票]', call: '[通话]' };

  // The mark after the time of a message the employee sent.
  function openwaMessageMark(m) {
    if (m.status === 'sending') return icon('Clock3') + '<span>发送中</span>';
    if (m.status === 'failed') return `<span class="openwa-mark warn">${icon('TriangleAlert')}未发送</span><button type="button" class="link" data-action="openwaResend" ${fidActionID(m.id)}>重试</button>`;
    if (m.status === 'unknown') return `<span class="openwa-mark warn">${icon('ClockAlert')}结果待确认</span><button type="button" class="link" data-action="openwaResend" ${fidActionID(m.id)}>重试</button>`;
    if (m.status === 'read' || m.status === 'played') return `<span class="openwa-mark read">${icon('CheckCheck')}已读</span>`;
    return icon(m.status === 'delivered' ? 'CheckCheck' : 'Check');
  }

  // The page's three states of a number: online, reconnect (it was linked and is not connected now), pending.
  function openwaSetState(a, link) {
    const before = a.state + '|' + a.linkState + '|' + a.number;
    if (link.state === 'online') {
      Object.assign(a, { state: 'online', linked: true, lastSync: '刚刚' });
      if (link.phone) a.number = '+' + link.phone;
    } else if (a.linked || a.state === 'reconnect') {
      Object.assign(a, { state: 'reconnect', linked: true, lastSync: a.state === 'reconnect' ? a.lastSync : '已断开' });
    } else {
      a.state = 'pending';
    }
    a.linkState = link.state;
    return before !== a.state + '|' + a.linkState + '|' + a.number;
  }

  function openwaTabs() {
    return `<div class="fid-wa-top">
      <div class="fid-wa-tabs" role="group" aria-label="WhatsApp 工作区">
        ${fidButton('号码管理','fidWaTab','Smartphone',fid.waTab==='numbers'?'gradient':'',`${fidActionID('numbers')} aria-pressed="${fid.waTab==='numbers'}"`)}
        ${fidButton('在线聊天','fidWaTab','MessageCircle',fid.waTab==='chat'?'gradient':'',`${fidActionID('chat')} aria-pressed="${fid.waTab==='chat'}"`)}
      </div>
      ${fid.waTab==='numbers'?fidButton('扫码绑定','openwaBind','QrCode','gradient'):''}
    </div>`;
  }

  function renderOpenwaNumbers() {
    const list = myAccounts();
    const chatCounts = new Map();
    for (const c of myCustomers()) chatCounts.set(c.account, (chatCounts.get(c.account) || 0) + 1);
    const rows = list.map(a => {
      const actions = a.state === 'pending'
        ? fidButton('扫码绑定','openwaBind','QrCode','tint',fidActionID(a.id))
        : fidButton('进入聊天','openwaOpenChat','MessageCircle',a.state==='online'?'tint':'',fidActionID(a.id)) +
          (a.state==='online' ? '' : fidButton('重新连接','connect','RefreshCw','tint',fidActionID(a.id))) +
          fidButton('解除绑定','openwaUnlinkAsk','','slim',fidActionID(a.id));
      return `<tr>
        <td><strong>${esc(a.name)}</strong><span class="openwa-row-meta">${esc(a.number)}</span></td>
        <td><span class="state-text ${a.state==='reconnect'?'warn':''}"><span class="state-dot ${a.state==='reconnect'?'warning':a.state==='pending'?'offline':''}"></span>${openwaState(a)}</span></td>
        <td>${esc(member(a.owner)?.name||'未分配')}</td>
        <td>${chatCounts.get(a.id)||0}</td>
        <td>${esc(a.lastSync||'—')}</td>
        <td><div class="openwa-row-actions">${actions}</div></td>
      </tr>`;
    }).join('');
    const notice = !openwaServer ? '' : !openwaServer.configured ? '<span class="tag slate">服务器尚未接入 WhatsApp 连接</span>'
      : !openwaServer.reachable ? '<span class="tag slate">连接服务暂时不可用</span>' : '';
    return `<section class="fid-page fid-wa fid-wa-numbers">
      ${openwaTabs()}
      <div class="fid-table-card openwa-panel">
        <div class="openwa-panel-head">${fidHead('号码管理','通过 OpenWA 关联 WhatsApp Business 号码。')}${notice}</div>
        ${fidTable('fid-numbers-table',['WhatsApp 号码','连接状态','负责人','会话','最近活跃','操作'],rows,'还没有号码，点击「扫码绑定」开始。',true,'Smartphone')}
      </div>
    </section>`;
  }

  function openwaDialogContent(title, body, footer, focus) {
    if (!openwaDialog.open) {
      fidDialog(title, body, footer);
      openwaDialog.classList.add('openwa-pair-dialog');
    } else {
      openwaDialog.setAttribute('aria-label', title);
      $('#dialog .modal-head h2').textContent = title;
      $('#openwa-dialog-body').outerHTML = body;
      $('#dialog .modal-footer').innerHTML = footer;
      paintIcons(openwaDialog);
    }
    $('#dialog '+focus)?.focus();
  }

  function openwaShowPairing() {
    const pair = openwaPairing;
    const title = pair.mode === 'bind' ? '扫码绑定 WhatsApp Business' : '重新连接';
    const description = pair.label ? `<p>${esc(pair.label)}</p>` : '';
    const status = pair.phase === 'scan' && pair.qr
      ? `<div class="openwa-qr" role="img" aria-label="WhatsApp 关联设备二维码"><img alt="" width="264" height="264" src="${esc(pair.qr)}"></div><div class="openwa-pair-state"><span class="state-dot warning"></span>等待扫码</div>`
      : pair.phase === 'error'
        ? `<div class="openwa-pair-state openwa-pair-error" role="alert" tabindex="-1"><span class="state-dot offline"></span><strong>${esc(pair.error)}</strong></div>`
        : `<div class="openwa-pair-state" role="status" tabindex="-1">${icon('LoaderCircle')}<strong>${pair.phase === 'verifying' ? '已扫码，正在验证…' : pair.mode === 'bind' ? '正在准备二维码…' : '正在恢复连接…'}</strong></div>`;
    openwaDialogContent(title, `<div id="openwa-dialog-body" class="modal-body openwa-pair-body">
      <div class="openwa-pair-copy"><strong>在手机上打开 WhatsApp Business</strong><p>选择「关联设备」→「关联新设备」，扫描二维码。</p>${description}</div>
      ${status}
      <p class="openwa-pair-hint">二维码会自动更新。绑定后，这个号码的新消息会显示在在线聊天里。</p>
    </div>`, fidButton('取消','close')+(pair.phase === 'error' ? fidButton('重试','openwaRetry','RefreshCw','blue') : ''),
      pair.phase === 'error' ? '[data-action="openwaRetry"]' : '.openwa-pair-state');
  }

  // One answer of the server about the number that is being linked.
  function openwaPairStep(pair, link) {
    if (link.state === 'online') return openwaFinish(pair, link);
    const phase = link.state === 'scan' ? 'scan' : link.state === 'verifying' ? 'verifying' : link.state === 'starting' ? 'starting' : 'error';
    const error = phase !== 'error' ? '' : link.state === 'attention' ? (link.error || '需要先在手机上完成 WhatsApp 的验证，然后重试。') : '二维码已失效或连接中断，请重试。';
    const qr = phase === 'scan' ? link.qr || '' : '';
    if (phase === pair.phase && qr === pair.qr && error === pair.error) return;
    Object.assign(pair, { phase, qr, error });
    openwaShowPairing();
  }

  async function openwaRequestLink(pair) {
    const answer = await openwaCall('POST', 'link', { account: pair.accountId });
    if (openwaPairing !== pair) return openwaAbandon(pair);
    if (answer.status === 200) openwaPairStep(pair, answer.body);
    else {
      Object.assign(pair, { phase: 'error', qr: '', error: openwaProblem(answer) });
      openwaShowPairing();
    }
    if (openwaPairing === pair && pair.phase !== 'error') pair.timer = setTimeout(() => openwaPoll(pair), 2000);
  }

  async function openwaPoll(pair) {
    if (openwaPairing !== pair) return;
    const answer = await openwaCall('GET', 'link?account=' + encodeURIComponent(pair.accountId));
    if (openwaPairing !== pair) return;
    if (answer.status === 200) openwaPairStep(pair, answer.body);
    else if (answer.status === 404) openwaPairStep(pair, { state: 'missing' });
    if (openwaPairing === pair && pair.phase !== 'error') pair.timer = setTimeout(() => openwaPoll(pair), 2000);
  }

  function openwaBeginPairing(mode, a) {
    if (openwaServer && !openwaServer.configured) return toast('服务器尚未接入 WhatsApp 连接，请联系管理员。');
    const pair = openwaPairing = { mode, accountId: a?.id || nextId('a'), label: a ? a.name + (fidPhoneDigits(a.number).length >= 7 ? ' · ' + a.number : '') : '', phase: 'starting', qr: '', error: '' };
    openwaShowPairing();
    openwaRequestLink(pair);
  }

  // The dialog was closed before the number came online. A number that was never linked leaves nothing behind.
  function openwaAbandon(pair) {
    clearTimeout(pair.timer);
    if (!pair.done && !account(pair.accountId)?.linked) openwaCall('POST', 'unlink', { account: pair.accountId });
  }

  function openwaFinish(pair, link) {
    pair.done = true;
    clearTimeout(pair.timer);
    openwaPairing = null;
    let a = account(pair.accountId);
    if (!a) {
      a = { id: pair.accountId, name: link.name || 'WhatsApp · ' + String(link.phone || '').slice(-4), owner: ui.persona, number: '', country: '', note: '',
        color: ['jade','blue','peach','purple','gold'][data.accounts.length % 5], createdAt: fidDay() };
      data.accounts.push(a);
    }
    openwaSetState(a, link);
    persist();
    render();
    const bind = pair.mode === 'bind';
    const action = bind ? 'openwaOpenChat' : 'openwaReturnToChat';
    const inChat = ui.view === 'inbox' && fid.waTab === 'chat';
    const label = !bind && inChat && fid.chatOpen ? '返回当前会话' : '进入在线聊天';
    openwaDialogContent(bind ? '绑定成功' : '连接已恢复', `<div id="openwa-dialog-body" class="modal-body openwa-pair-body">
      <div class="openwa-success-mark">${icon('Check')}</div>
      <div class="openwa-pair-copy"><strong>${esc(a.name)}</strong><p>${esc(a.number)} · 在线</p></div>
      <p class="openwa-pair-hint">${bind ? '客户给这个号码发消息后，会话会显示在在线聊天里。' : '原有会话和草稿已保留。'}</p>
    </div>`, fidButton('完成','close')+fidButton(label,action,'ArrowRight','blue',fidActionID(a.id)),
      `[data-action="${action}"]`);
  }

  function openwaOpenChat(id) {
    const a = openwaVisibleAccount(id);
    if (!a) return;
    const c = openwaOrder(myCustomers().filter(c => c.account === id))[0];
    if (openwaDialog.open) close();
    Object.assign(ui, {account:id, customer:c?.id||null, query:'', conversationFilter:'all', mobileChat:Boolean(c), profileTab:'details'});
    fid.waTab = 'chat';
    fid.chatOpen = Boolean(c);
    navigate('inbox');
    if (c) $('.chat-person h2')?.focus({preventScroll:true});
    else $('#account-filter')?.focus({preventScroll:true});
  }

  function openwaReconnect(id) {
    const a = openwaVisibleAccount(id);
    if (!a || a.state === 'online') return;
    // An intact session comes back without a scan; otherwise the server answers with a new QR code.
    openwaBeginPairing(a.state === 'pending' ? 'bind' : 'reconnect', a);
  }

  const openwaBaseChat = chatHTML;
  chatHTML = function(c) {
    const a = account(c.account);
    let chat = openwaBaseChat(c);
    if (!a) return chat;
    chat = chat.replace('<div class="chat-person"><h2>', '<div class="chat-person"><h2 tabindex="-1">');
    chat = chat.replace('<div class="source-strip">', `<div class="openwa-chat-status">
      <span>${icon('Smartphone')}<b>${esc(a.number)}</b></span><span class="state-text ${a.state==='reconnect'?'warn':''}" role="status"><span class="state-dot ${a.state==='reconnect'?'warning':a.state==='pending'?'offline':''}"></span>${openwaState(a)}</span>
    </div><div class="source-strip">`);
    if (a.state !== 'online') {
      chat = chat.replace(`${esc(a.name)} 待连接`, '发送已暂停')
        .replace('当前草稿会保留，连接后可继续处理。','草稿和聊天记录已保留。');
      if (a.state === 'pending') chat = chat.replace('>重新连接</button>', '>扫码绑定</button>');
    }
    return chat;
  };

  renderInbox = function() {
    if (fid.waTab === 'numbers') return renderOpenwaNumbers();
    const scope = myAccounts();
    const c = fid.chatOpen ? selectedCustomer() : null;
    const a = openwaVisibleAccount(ui.account);
    const hasChat = myCustomers().some(c => ui.account === 'all' || c.account === ui.account);
    const blank = scope.length
      ? (hasChat ? '选择左侧的会话开始聊天' : '这个号码还没有会话') : '扫码绑定后开始聊天';
    const rows = hasChat ? conversationRows() : (scope.length ? '<div class="fid-wa-empty">还没有会话</div>'
      : `<div class="fid-wa-empty">${fidButton('前往号码管理','fidWaTab','Smartphone','tint',fidActionID('numbers'))}</div>`);
    return `<section class="inbox-page fid-wa"><h1 class="sr-only">WhatsApp API 在线聊天</h1>${openwaTabs()}
      <div class="inbox-layout ${ui.mobileChat&&c?'mobile-chat':'mobile-list'}">
        <section class="conversation-pane" aria-label="会话列表"><div class="conversation-top">
          <select class="fid-select fid-wa-select" id="account-filter" aria-label="按 WhatsApp 账号查看">
            ${option('all',scope.length?(manager()?'全部团队号码':'我的全部号码'):'还没有号码',ui.account)}
            ${scope.map(a=>option(a.id,a.name+(a.state==='online'?'':' · '+openwaState(a)),ui.account)).join('')}
          </select>
          <input class="fid-input fid-wa-search" id="conversation-search" aria-label="搜索会话" placeholder="搜索号码或名字" value="${esc(ui.query)}" ${hasChat?'':'disabled'}>
          ${ui.conversationFilter!=='all'?`<div class="fid-wa-active-filter"><span>${esc(fidConversationFilters[ui.conversationFilter])}会话</span>${fidIcon('清除会话筛选','fidClearChatFilter','X')}</div>`:''}
          <div class="fid-wa-conversation-actions">${fidButton('新建会话','addCustomer','SquarePen','',scope.length?'':'disabled')}${fidButton('模板','quickAll','FileText','',hasChat?'':'disabled')}</div>
          ${!hasChat&&a&&a.state!=='online'?`<div class="openwa-empty-action">${fidButton(a.state==='reconnect'?'重新连接':'扫码绑定','connect','RefreshCw','tint',fidActionID(a.id))}</div>`:''}
        </div><div class="conversation-list" id="conversation-list">${rows}</div></section>
        ${c?chatHTML(c):`<section class="chat-pane fid-chat-blank"><div>${icon('MessageCircle')}<span>${blank}</span><small>客户给你的号码发消息后，会话会显示在这里</small></div></section>`}
        ${toolsRailHTML(c)}
      </div></section>`;
  };

  // ---- sending ----
  // One press of the send button is one request: repeating it with the same id never sends twice.
  async function openwaDeliver(c, message) {
    const digits = fidPhoneDigits(c.phone);
    const answer = c.waChat || digits.length >= 7
      ? await openwaCall('POST', 'send', { account: c.account, to: c.waChat || digits + '@c.us', text: message.text, requestId: message.request })
      : { status: 400, body: { error: 'no-number' } };
    const list = data.messages[c.id] || [];
    if (answer.status === 200) {
      // The feed may have brought the same message first: keep this one and what the feed learned about it.
      const twin = list.find(m => m !== message && m.wa === answer.body.messageId);
      if (twin) data.messages[c.id] = list.filter(m => m !== twin);
      Object.assign(message, { wa: answer.body.messageId, at: answer.body.timestamp, status: twin?.status || (message.status === 'sending' ? 'sent' : message.status) });
      delete message.error;
    } else {
      const open = answer.status === 0 || answer.status === 502 || answer.body.error === 'outcome-unknown';
      Object.assign(message, { status: open ? 'unknown' : 'failed', error: answer.body.error || 'network' });
      toast(open ? '发送结果待确认，可稍后在消息旁重试。' : answer.body.error === 'not-connected' ? '号码未连接，消息没有发出。' : answer.body.error === 'no-number' ? '这位客户没有可用的 WhatsApp 号码。' : '消息没有发出，可在消息旁重试。');
    }
    persist();
    openwaRefresh();
  }

  send = function() {
    const c = selectedCustomer(), el = $('#composer-text');
    if (!c || !el) return;
    if (account(c.account)?.state !== 'online') return toast('号码尚未连接，草稿会保留。');
    const text = el.value.trim();
    if (!text) return;
    const d = draft(c), outgoing = d.translated && d.source === text ? d.translated : text;
    const message = { id: nextId('m'), side: 'out', text: outgoing, time: openwaClock(), at: Date.now(), request: nextId('r'), status: 'sending' };
    (data.messages[c.id] ??= conversationMessages(c)).push(message);
    Object.assign(c, { preview: outgoing, last: message.time, lastAt: message.at, unread: 0 });
    ui.drafts[c.id] = { text: '', translated: '', source: '' };
    persist();
    render();
    openwaDeliver(c, message);
  };

  // ---- the feed ----
  function openwaNewCustomer(a, e) {
    const name = e.name || (e.phone ? '+' + e.phone : 'WhatsApp 客户'), nowIso = new Date().toISOString();
    const c = { id: nextId('c'), name, initials: initial(name), color: 'blue', phone: e.phone ? '+' + e.phone : '', waChat: e.chat,
      country: a.country || '', city: '', timezone: '', language: '其他', owner: a.owner || ui.persona, account: a.id, tags: [], engagement: 'open',
      source: '未知来源', campaign: '', ad: '', unread: 0, star: false, last: '', preview: '', translation: '', followup: null, notes: '',
      contactRefs: [{ account: a.id, owner: a.owner || ui.persona }], createdAt: nowIso, updatedAt: nowIso, clientType: '新增线索-实时', reactivatedCount: 0 };
    // The engagement module creates the first-reply to-do on the next render.
    if (!e.fromMe) c.needsFirstReply = true;
    data.customers.unshift(c);
    data.messages[c.id] = [];
    return c;
  }

  const openwaFindMessage = (accountId, wa) => {
    for (const c of data.customers) {
      if (c.account !== accountId) continue;
      const m = (data.messages[c.id] || []).find(m => m.wa === wa);
      if (m) return [c, m];
    }
    return [];
  };

  // Applies one event of the feed to the data. Returns true when something changed.
  function openwaApply(e) {
    const a = data.accounts.find(a => a.id === e.account);
    if (!a) return false;
    if (e.kind === 'state') return openwaSetState(a, e);
    if (e.kind === 'restriction') {
      a.restricted = e.active;
      if (e.active) toast(`WhatsApp 限制了 ${a.name} 的使用，请在手机上查看。`);
      return true;
    }
    if (e.kind === 'receipt') {
      const [, m] = openwaFindMessage(a.id, e.id);
      const order = ['sending', 'unknown', 'sent', 'delivered', 'read', 'played'];
      if (!m || m.side !== 'out' || (e.status !== 'failed' && order.indexOf(e.status) <= order.indexOf(m.status))) return false;
      m.status = e.status;
      return true;
    }
    if (e.kind === 'revoked' || e.kind === 'edited') {
      const [c, m] = openwaFindMessage(a.id, e.id);
      if (!m) return false;
      Object.assign(m, e.kind === 'revoked' ? { text: '此消息已撤回', revoked: true, translated: '' } : { text: e.text, edited: true, translated: '' });
      if ((data.messages[c.id] || []).at(-1) === m) c.preview = m.text;
      if (e.kind === 'edited' && m.side === 'in') aiTranslateInbound(c, m);
      return true;
    }
    if (e.kind !== 'message' || !e.chat) return false;
    let c = data.customers.find(c => c.account === a.id && c.waChat === e.chat)
      || (e.phone ? data.customers.find(c => c.account === a.id && !c.waChat && fidPhoneDigits(c.phone) === e.phone) : null);
    if (c && !c.waChat) c.waChat = e.chat;
    c ||= openwaNewCustomer(a, e);
    const list = data.messages[c.id] ??= conversationMessages(c);
    if (e.id && list.some(m => m.wa === e.id)) return false;
    const text = e.text || openwaMediaText[e.type] || '[消息]';
    if (e.fromMe) {
      // What this page sent comes back through the feed: it is the message that is still waiting for its answer.
      const mine = list.find(m => m.side === 'out' && !m.wa && m.status === 'sending' && m.text === e.text);
      if (mine) {
        Object.assign(mine, { wa: e.id, status: 'sent' });
        return true;
      }
    }
    const message = { id: nextId('m'), side: e.fromMe ? 'out' : 'in', text, time: openwaClock(e.at), at: e.at, wa: e.id, type: e.type, ...(e.fromMe ? { status: 'sent' } : {}) };
    list.push(message);
    list.sort((x, y) => (x.at || 0) - (y.at || 0));
    if (list.at(-1) === message) Object.assign(c, { preview: text, translation: '', last: message.time, lastAt: e.at });
    if (!e.fromMe) {
      const closed = lcIsClosed(c);
      c.unread = (Number(c.unread) || 0) + 1;
      if (closed) lcLog(c.id, 'inbound', '已结束跟进的客户主动发来新消息（触发复联信号）');
      if (e.type === 'text' && e.text) aiTranslateInbound(c, message);
    }
    return true;
  }

  // Draws the page again after the feed changed the data, without disturbing what is being typed.
  let openwaComposing = false, openwaStale = false;
  document.addEventListener('compositionstart', () => { openwaComposing = true; });
  document.addEventListener('compositionend', () => { openwaComposing = false; if (openwaStale) openwaRefresh(); });
  function openwaRefresh() {
    if (openwaComposing) return void (openwaStale = true);
    openwaStale = false;
    const el = document.activeElement, id = $('#view').contains(el) ? el.id : '';
    const range = id && typeof el.selectionStart === 'number' ? [el.selectionStart, el.selectionEnd] : null;
    const box = $('#messages'), atBottom = !box || box.scrollHeight - box.clientHeight - box.scrollTop <= 40, top = box?.scrollTop;
    const listTop = $('#conversation-list')?.scrollTop;
    render();
    if ($('#conversation-list') && listTop) $('#conversation-list').scrollTop = listTop;
    if (!atBottom && $('#messages')) requestAnimationFrame(() => { const again = $('#messages'); if (again) again.scrollTop = top; });
    const again = id && document.getElementById(id);
    if (again) {
      if (again !== document.activeElement) again.focus({ preventScroll: true });
      if (range && typeof again.setSelectionRange === 'function') again.setSelectionRange(...range);
    }
  }

  const openwaWait = ms => new Promise(resolve => setTimeout(resolve, ms));
  // Reads the feed for as long as the page is open. Another page that opens the sub-site takes the feed over.
  async function openwaListen() {
    const status = await openwaCall('GET', 'status');
    if (status.status !== 200) return;
    openwaServer = { configured: Boolean(status.body.configured), reachable: Boolean(status.body.reachable) };
    if (!openwaServer.configured) return render();
    let changed = false;
    // Messages that were on their way when the page was closed: their outcome is open, and sending again is safe.
    for (const list of Object.values(data.messages)) for (const m of list) if (m.status === 'sending') { m.status = 'unknown'; changed = true; }
    if (changed) persist();
    if ((await openwaCall('POST', 'claim', { client: openwaClient })).status !== 200) return render();
    // First everything that happened while no page was open; then the numbers' states as the server sees them now.
    for (let failures = 0, caughtUp = false; ;) {
      const answer = await openwaCall('GET', `events?after=${Number(data.waCursor) || 0}&client=${openwaClient}&wait=${caughtUp ? 25 : 0}`);
      if (answer.status === 409 && answer.body.error === 'taken-over') return window.WA_SITE.halt('已在其他页面打开', '这个子站刚刚在另一个页面或设备上打开，新消息改由那里接收。需要在本页继续时，请刷新页面。');
      if (answer.status === 401) return window.WA_SITE.halt('登录已失效', '请刷新页面后重新登录。');
      if (answer.status !== 200) {
        failures += 1;
        await openwaWait(Math.min(30000, 1000 * 2 ** failures));
        continue;
      }
      failures = 0;
      let applied = false;
      for (const e of answer.body.events) applied = openwaApply(e) || applied;
      if (answer.body.last > (Number(data.waCursor) || 0)) {
        data.waCursor = answer.body.last;
        persist();
      }
      if (!caughtUp && !answer.body.events.length) {
        caughtUp = true;
        const now = await openwaCall('GET', 'status');
        if (now.status === 200 && now.body.reachable) {
          openwaServer = { configured: true, reachable: true };
          for (const a of data.accounts) {
            const link = now.body.accounts.find(x => x.account === a.id);
            if (link ? openwaSetState(a, link) : a.linked && openwaSetState(a, { state: 'missing' })) applied = true;
          }
          if (applied) persist();
        }
        applied = true;
      }
      if (applied) openwaRefresh();
    }
  }

  Object.assign(fidActions, {
    openwaBind:id=>{
      const a = openwaVisibleAccount(id);
      if (id && a?.state !== 'pending') return;
      openwaBeginPairing('bind',a);
    },
    openwaRetry:()=>{
      const pair = openwaPairing;
      if (pair?.phase !== 'error') return;
      Object.assign(pair, { phase: 'starting', qr: '', error: '' });
      openwaShowPairing();
      openwaRequestLink(pair);
    },
    openwaOpenChat,
    openwaReturnToChat:id=>{
      if (ui.view !== 'inbox' || fid.waTab !== 'chat' || !fid.chatOpen) return openwaOpenChat(id);
      close();
      render();
      $('#composer-text')?.focus({preventScroll:true});
    },
    connect:openwaReconnect,
    openwaUnlinkAsk:id=>{
      const a = openwaVisibleAccount(id);
      if (a && a.state !== 'pending') fidConfirm('解除绑定', `解除「${a.name}」与 WhatsApp 的关联？聊天记录会保留，之后可以重新扫码绑定。`, 'openwaUnlink', id);
    },
    openwaUnlink:async id=>{
      const a = openwaVisibleAccount(id);
      if (!a) return;
      close();
      const answer = await openwaCall('POST', 'unlink', { account: id });
      if (answer.status !== 200 && answer.status !== 404) return toast(openwaProblem(answer));
      Object.assign(a, { state: 'pending', linked: false, linkState: '', lastSync: '已解除绑定' });
      persist();
      render();
      toast('已解除绑定。');
    },
    openwaResend:id=>{
      const c = selectedCustomer(), m = c && (data.messages[c.id] || []).find(m => m.id === id);
      if (!m || !['failed', 'unknown'].includes(m.status) || !m.request) return;
      if (account(c.account)?.state !== 'online') return toast('号码尚未连接，暂时不能重试。');
      m.status = 'sending';
      persist();
      openwaRefresh();
      openwaDeliver(c, m);
    },
  });

  openwaDialog.addEventListener('close', () => {
    if (openwaDialog.open || !openwaPairing) return;
    openwaAbandon(openwaPairing);
    openwaPairing = null;
  });
  setTimeout(openwaListen, 0);
```

**Verify**: `sha256sum work/wa-replica/fidelity-openwa.js` → `cd4a1737be6a009c3c6ae6bb61e5d7b8a80cbf4ebf8009c78b8c56d6dcef37c1`; `node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/fidelity-openwa.js','utf8')+'})')" && echo SYNTAX_OK` → `SYNTAX_OK`; `grep -c '模拟\|演示' work/wa-replica/fidelity-openwa.js` → `0`. If the checksum does not match, write the file again; if it still does not match, STOP.

### Step 3: The start-up script, the follow-up module and one hint of the AI page

**Edit 3.1** — `work/wa-replica/fidelity-boot.js`. Find exactly (it occurs once):

```text
    window.WA_SITE = { user, site, data, save, idle, signOut };
```

Replace with:

```text
    // halt stops this page with a notice; the app uses it when another page takes over the sub-site.
    window.WA_SITE = { user, site, data, save, idle, signOut, halt: stop };
```

**Cut lines 3.2** — `work/wa-replica/fidelity-lifecycle.js`. Delete exactly these whole lines, including their line ends (they occur once):

```text
        ${fidButton('模拟新客进线', 'lcSimLeadOpen', 'Sparkles', 'tint')}
```

**Cut lines 3.3** — `work/wa-replica/fidelity-lifecycle.js`. Delete exactly these whole lines, including their line ends (they occur once):

```text
            ${fidButton('模拟客户复联', 'lcSimReply', 'MessageSquareReply', 'slim', fidActionID(c.id))}
```

**Cut lines 3.4** — `work/wa-replica/fidelity-lifecycle.js`. Delete exactly these whole lines, including their line ends (they occur once):

```text
        ${fidButton('模拟对方回复', 'lcSimReply', 'MessageSquareReply', 'slim', fidActionID(c.id))}
```

**Cut range 3.5** — `work/wa-replica/fidelity-lifecycle.js` — the two simulators: a made-up new lead and a made-up reply. Delete every line from the one that starts with (one line starts this way):

```text
  function openSimLeadModal() {
```

up to, but not including, the line that starts with (one line starts this way; it stays):

```text
  // New customers join the engagement loop with a first follow-up to-do
```

**Cut lines 3.6** — `work/wa-replica/fidelity-lifecycle.js`. Delete exactly these whole lines, including their line ends (they occur once):

```text
    lcSimLeadOpen: openSimLeadModal,
    lcSimReply: lcSimulateCustomerReply,
```

**Cut range 3.7** — `work/wa-replica/fidelity-lifecycle.js` — the form of the made-up new lead. Delete every line from the one that starts with (one line starts this way):

```text
    'lc-sim-lead-form': (f, v) => {
```

up to, but not including, the line that starts with (one line starts this way; it stays):

```text
    'lc-new-customer-form': (f, v) => {
```

**Edit 3.8** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly (it occurs once):

```text
  // Customers added outside this module (OpenWA sample chats, legacy saves) join the loop on the next render
```

Replace with:

```text
  // Customers added outside this module (new WhatsApp chats, legacy saves) join the loop on the next render
```

**Edit 3.9** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly (it occurs once):

```text
        lcLog(c.id, 'inbound', 'OpenWA 扫码进线会话已自动建立首响待办');
```

Replace with:

```text
        lcLog(c.id, 'inbound', '客户首次来信，已自动建立首响待办');
```

**Edit 3.10** — `work/wa-replica/fidelity-ai.js`. Find exactly (it occurs once):

```text
'暂无调用记录。在 WhatsApp API 中模拟对方回复或选择快捷回复后，这里会出现记录。'
```

Replace with:

```text
'暂无调用记录。收到客户消息或翻译回复后，这里会出现记录。'
```

**Verify**: `sha256sum work/wa-replica/fidelity-boot.js work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-ai.js` → `185d5070ea8556fda1e6ff3b7777cca53f699ef2e544c93f9a8a0fcc20a6f98e`, `0ee6ab56c02f4e1e6ae548c0795fa688c0618ac6193f0dda1a7b749425ce74e7`, `c84015c912dfadda1ff37112db95c1913e5451d67f2e39595f12a42bc14fb4be`; the syntax command → three lines ending in `SYNTAX_OK`; `node --check work/wa-replica/fidelity-boot.js` → exit 0; `grep -c '模拟' work/wa-replica/fidelity-lifecycle.js work/wa-replica/fidelity-ai.js` → `0` for both files. If a checksum does not match, restore the file with `git checkout 6726127 -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 4: Build script and styles

**Insert 4.1** — `work/wa-replica/build-fidelity.cjs`. Find the line that starts with (one line starts this way):

```text
new vm.Script(js, {filename:'app.js'});
```

Insert exactly this text as new lines directly above that line:

```text
// The page uses the real WhatsApp connection (plan 026). A message carries its time and what became of it,
// the conversation with the latest message comes first, and what existed only for the demonstration is gone.
// The functions named here are in fidelity-openwa.js.
swap("const day=m.time.startsWith('昨天')?'昨天':'今天',separator=", 'const day=openwaDayLabel(m),separator=');
swap("esc(m.time.replace('昨天 ',''))+(m.side==='out'?icon(m.local?'Check':'CheckCheck')+(m.local?'<span>本地演示</span>':''):'')", "esc(openwaTimeLabel(m))+(m.side==='out'?openwaMessageMark(m):'')");
swap("emptyHint='写一条演示消息，或选择快捷回复开始。'", "emptyHint='输入消息，或选择快捷回复开始。'");
swap("'</strong><time>'+esc(c.last)+'</time>", "'</strong><time>'+esc(openwaLastLabel(c))+'</time>");
swap('.includes(q));return list}', '.includes(q));return openwaOrder(list)}');
swap('enabled=online&&(d.text.trim()||ui.attachment);', 'enabled=online&&Boolean(d.text.trim());');
swap(`<button class="icon-button" data-action="attachment" aria-label="添加演示附件">'+icon('Paperclip')+'</button>`, '');
swap('aria-label="发送演示消息"', 'aria-label="发送消息"');
swap("(online?'演示会话 · 草稿自动保存':'账号待连接 · 草稿已保留')", "(online?'草稿自动保存':'号码待连接 · 草稿已保留')");
swap('<span class="sample-label">演示来源</span>', '');
swap("toast('演示账号已保存；真实接入尚未执行。')", "toast('账号已保存；在号码管理中扫码绑定后开始收发。')");
swap("error('演示数据中已有该号码。重复客户归属/合并规则待确认。')", "error('已有使用该号码的客户。')");
{
  // Sending goes through the server: fidelity-openwa.js gives send its body.
  const next = js.replace(/^  function send\(\) \{\n[\s\S]*?^  \}\n/m, '  function send() {}\n');
  assert(next !== js, 'Missing the send function of the baseline');
  js = next;
}
// The dialog that added a made-up attachment to a message is gone with its button; real files come with the media step.
cut(/^      case 'attachment':\{[^\n]*\n/m, 'demo attachment dialog');
cut(/^    if\(formId==='attachment-form'\)[^\n]*\n/m, 'demo attachment form');
assert(!/<span>本地演示<\/span>|演示消息|添加演示附件|模拟扫码|模拟掉线|模拟重连|lcSimLeadOpen|lcSimReply|openwaDemoQr/.test(js), 'the app must not simulate the WhatsApp connection');
```

**Edit 4.2** — `work/wa-replica/fidelity.css`. Find exactly (it occurs once):

```text
@keyframes openwa-spin { to { transform:rotate(360deg); } }
```

Replace with:

```text
.openwa-pair-state.openwa-pair-error { max-width:320px; line-height:1.5; }
.openwa-mark { display:inline-flex; align-items:center; gap:3px; }
.openwa-mark.warn { color:var(--warning); }
.openwa-mark.read { color:var(--paint-46); }
.message-meta .link { margin-left:6px; font-size:12px; }
@keyframes openwa-spin { to { transform:rotate(360deg); } }
```

**Verify**: `sha256sum work/wa-replica/build-fidelity.cjs work/wa-replica/fidelity.css` → `3de5581a0d9fea08cdf3269141185f10bd8f0440dd75a3820aa6044cd14db51a`, `1db4ec98ee09765525e054c2bd67c37f65e0026a21a53dda584ab03b526bc792`; `git checkout 6726127 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84`; the icon-set command → `removed=Paperclip,ScanQrCode,MessageSquareReply added=`; `git diff 6726127 -- work/wa-replica/build-fidelity.cjs | grep -c '^-'` → `1` (only the diff header line; no existing line is removed).

### Step 5: Validator (`work/wa-replica/validate-scrm-lifecycle.cjs`)

**Edit 5.1** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly (it occurs once):

```text
// The page may call only the AI relay of its own server (/api/ai/*); the relay, not the page, talks to the model service.
```

Replace with:

```text
// The page may call only its own server: the AI relay (/api/ai/*) and the link to OpenWA (/api/wa/*). The server,
// not the page, talks to the model service and to OpenWA.
```

**Edit 5.2** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly (it occurs once):

```text
assert(/^fetch\('\/api\/ai\//.test(call), `app.js may only call the AI relay of its own server, found: ${call}`);
```

Replace with:

```text
assert(/^fetch\('\/api\/(ai|wa)\//.test(call), `app.js may only call the AI relay and the OpenWA link of its own server, found: ${call}`);
```

**Edit 5.3** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly (it occurs once):

```text
assert.equal((moduleSource.match(/aiTranslateInbound\(/g) || []).length, 2, 'both incoming-message paths in fidelity-lifecycle.js must translate through the integration point');
assert(openwaSource.includes('aiTranslateInbound('), 'the OpenWA sample chat must translate through the integration point');
```

Replace with:

```text
assert.equal((moduleSource.match(/aiTranslateInbound\(/g) || []).length, 0, 'fidelity-lifecycle.js no longer creates incoming messages; the feed in fidelity-openwa.js does');
assert(openwaSource.includes('aiTranslateInbound(c, message)'), 'incoming messages of the feed must translate through the integration point');
```

**Edit 5.4** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly (it occurs once):

```text
const summary = {
```

Replace with:

```text
// 22. The page uses the real WhatsApp connection through its own server; nothing simulates it any more
for (const required of ["fetch('/api/wa/' + path, {", "openwaCall('POST', 'link', { account: pair.accountId })", "openwaCall('POST', 'claim', { client: openwaClient })", 'events?after=${Number(data.waCursor) || 0}&client=${openwaClient}&wait=${caughtUp ? 25 : 0}', "openwaCall('POST', 'send', {", "requestId: message.request", "window.WA_SITE.halt('已在其他页面打开'", 'send = function() {', "document.addEventListener('compositionstart'"]) {
  assert(openwaSource.includes(required), `fidelity-openwa.js is missing ${required}`);
}
assert(!/openwaDemoQr|openwaScan|openwaDrop|openwaRestore|openwaAddSampleChat|openwaNextNumber|模拟|演示/.test(openwaSource), 'fidelity-openwa.js must not simulate linking, losing or restoring a connection');
assert(!/lcSimLeadOpen|lcSimReply|openSimLeadModal|lcSimulateCustomerReply|lc-sim-lead|模拟/.test(moduleSource), 'fidelity-lifecycle.js must not simulate leads or replies');
assert(bootSource.includes('window.WA_SITE = { user, site, data, save, idle, signOut, halt: stop };'), 'fidelity-boot.js must let the app stop the page with a notice');
for (const gone of ['<span>本地演示</span>', '演示消息', '模拟扫码', '模拟掉线', '模拟新客进线', '模拟对方回复', '模拟客户复联', '添加演示附件', '演示来源']) {
  assert(!appJs.includes(gone), `app.js still contains ${gone}`);
}
for (const required of ['const day=openwaDayLabel(m),separator=', "(m.side==='out'?openwaMessageMark(m):'')", 'return openwaOrder(list)}', '  function send() {}\n']) {
  assert(appJs.includes(required), `app.js is missing ${required}`);
}

const summary = {
```

**Edit 5.5** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly (it occurs once):

```text
  externalNetworkCalls: false,
};
```

Replace with:

```text
  whatsappConnection: 'real, through the sub-site\'s own server: QR code, incoming events, sending; no simulation',
  externalNetworkCalls: false,
};
```

**Verify**: `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `e0e7b3f621483c75b4fc426bc6c2c0f976362038c2e218aab790f896530f1840`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → exit 0 with `"status": "passed"` and `"whatsappConnection"` in the output.

### Step 6: Documentation, final rebuild and verification

**Edit 6.1** — `README.md`. Find exactly (it occurs once):

```text
OpenWA 的通知必须带有效签名才会被接收。页面上的扫码与收发目前仍是模拟的，改用这些接口是下一步。
```

Replace with:

```text
OpenWA 的通知必须带有效签名才会被接收。页面通过这些接口扫码绑定号码、接收消息并发送文本消息；未设置时，号码管理会提示服务器尚未接入 WhatsApp 连接。
```

**Edit 6.2** — `README.md`. Find exactly (it occurs once):

```text
「完成并闭环」必须安排下一步或结束跟进；模拟新客进线 |
```

Replace with:

```text
「完成并闭环」必须安排下一步或结束跟进 |
```

**Edit 6.3** — `README.md`. Find exactly (it occurs once):

```text
| OpenWA 扫码绑定/掉线重连模拟、英/西语接收译文与草稿预览、
```

Replace with:

```text
| 通过 OpenWA 扫码绑定真实号码、接收消息与发送文本、掉线后重新连接、解除绑定；接收译文与草稿预览、
```

**Edit 6.4** — `README.md`. Find exactly (it occurs once):

```text
目前尚未连接真实 WhatsApp，会话仍由「模拟」操作产生。唯一的对外调用是 AI 翻译：仅当预览服务配置了模型服务时，待翻译的消息文本经本站服务器发送给该模型服务；密钥只保存在服务器上，仓库内不含任何密钥。
```

Replace with:

```text
WhatsApp 的收发经由本站服务器与子站专属的 OpenWA 完成，浏览器不直接连接 OpenWA。对外的调用有两类：服务器与 OpenWA 之间的连接；以及 AI 翻译——仅当预览服务配置了模型服务时，待翻译的消息文本经本站服务器发送给该模型服务。密钥都只保存在服务器上，仓库内不含任何密钥。
```

**Edit 6.5** — `README.md`. Find exactly (it occurs once):

```text
│       ├── fidelity-openwa.js                         # OpenWA 扫码绑定、掉线重连与会话联动
```

Replace with:

```text
│       ├── fidelity-openwa.js                         # 真实 WhatsApp 连接：扫码绑定、事件流（来信、回执、号码状态）、发送与重试
```

**Edit 6.6** — `outputs/wa-replica-prototype/README.md`. Find exactly (it occurs once):

```text
   - 在「跟进闭环中心（`#followups`）」点击 **「模拟新客进线」**，新客户出现在「待处理信号」并点亮「客户待回复」，同时自动建立首响待办。
```

Replace with:

```text
   - 陌生号码给已绑定的 WhatsApp 号码发来第一条消息时，系统自动建立客户档案和首响待办，新客户出现在「待处理信号」并点亮「客户待回复」。
```

**Edit 6.7** — `outputs/wa-replica-prototype/README.md`. Find exactly (it occurs once):

```text
在「已结束跟进」视图（示例客户 Rachel Green）点击 **「模拟客户复联」**，立即点亮「复联待处理」；点击 **「重新跟进」**
```

Replace with:

```text
已结束跟进的客户再次来信时，立即点亮「复联待处理」；在「已结束跟进」视图点击 **「重新跟进」**
```

**Edit 6.8** — `outputs/wa-replica-prototype/README.md`. Find exactly (it occurs once):

```text
在「WhatsApp API」中点击「模拟对方回复」或选择一条快捷回复后，回到该页可看到新增的调用记录。
```

Replace with:

```text
收到客户消息或翻译回复后，回到该页可看到新增的调用记录。
```

**Edit 6.9** — `PRODUCT.md`. Find exactly (it occurs once):

```text
1. **进线即建待办**：新客进线、手动建档或 OpenWA 扫码进线时自动建立首响待办。
```

Replace with:

```text
1. **进线即建待办**：客户首次来信或手动建档时自动建立首响待办。
```

**Insert 6.10** — `DESIGN.md`. Find the line that starts with (one line starts this way):

```text
- 原 v0.5 快照备份
```

Insert exactly this text as new lines directly above that line:

```text
- WhatsApp 连接：号码管理的「扫码绑定」弹窗显示服务器返回的二维码（264px，自动更新），状态依次为「正在准备二维码」「等待扫码」「已扫码，正在验证」「绑定成功」；出错时显示原因和「重试」。自己发送的消息在时间后显示状态：发送中、已发送（单勾）、已送达（双勾）、已读、未发送或结果待确认（后两种带「重试」）。会话列表按最新消息排序。同一子站同一时间只有一个页面接收新消息：后打开的页面接管，原页面提示刷新。
```

**Append 6.11** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```markdown
## 页面改用真实 WhatsApp 连接；模拟扫码与模拟来信移除 · 2026-11-21

页面通过本站服务器的 `/api/wa/*` 使用子站专属的 OpenWA：「扫码绑定」弹窗显示真实二维码并跟随其更新，扫码后号码上线，号码与名称取自 WhatsApp；掉线后「重新连接」优先恢复原会话，手机已解除关联时给出新的二维码；新增「解除绑定」。页面持续读取服务器的事件流：客户来信写入对应客户的会话（按号码或 WhatsApp 会话标识匹配），陌生号码的第一条消息自动建立客户档案并由跟进模块建立首响待办；已结束跟进的客户来信点亮复联信号；手机端发出的消息、撤回与编辑、送达与已读回执、号码状态变化同样进入页面。发送改为经服务器发出：每次点击对应一个请求编号，重试不会重复发送；发送失败或结果未知时在消息旁提示并可重试。收到消息重绘页面时不打断正在输入的内容（包括输入法组字期间）。

同一子站同一时间只有一个页面接收新消息：后打开的页面接管，原页面显示提示并停止保存。页面不在线时，消息留在服务器，下次打开时按顺序补上，然后以服务器当前的号码状态为准。

移除：模拟扫码、模拟掉线与模拟重连，演示二维码与绑定后自动生成的示例咨询，「模拟新客进线」「模拟对方回复」「模拟客户复联」，「本地演示」消息标记，以及只做演示的附件按钮与弹窗（真实文件随媒体步骤提供）。图标集合因此少了 Paperclip、ScanQrCode、MessageSquareReply。

本次范围之外：群聊不显示；只发送文本；收到的图片、语音等先以「[图片]」「[语音]」等占位显示，文件内容与语音转写随后安排。尚待用真实号码核对：真实消息字段、隐私号（`@lid`）、回执与媒体的实际表现。
```

Then rebuild and verify everything once more:

```bash
git checkout 6726127 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && env -u WA_SCRM_OPENWA_ENV $NODE --test work/wa-replica/openwa-link.test.cjs && $NODE --test work/wa-replica/site-api.test.cjs && node --test work/wa-replica/ai-relay.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-026/smoke.sh
```

**Verify**: build exit 0 with `"version": "0.8-scrm-engagement"`; validator `"status": "passed"`; the three test runs end with `pass 13`, `pass 12`, `pass 12` and `fail 0` each; smoke ends with `SMOKE PASS`; `sha256sum README.md PRODUCT.md DESIGN.md outputs/wa-replica-prototype/README.md replica/build-log.md` → `9e1354ebea8d1e9107dde597af2d4ba2a96003cbab40c574d6440756de8cd40a`, `4028917b299c112058172b24df9197d476ebe8017cb9bfc6d04b5380bad270c2`, `b8869b6fc42eb69e9ca52e4b99e50c2deadbef5a30a9d8a46b54b266b5db9c48`, `4daafef6d56bc8e7b2c9ce27aded43dad12d50af3d483960cdcf1a392aef4031`, `431461c430d69865a5aefe2ec8e0597ac41a469efa0e56758ea4d4a1403caeaa`; `git status --porcelain` lists only in-scope paths. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the new section 22 (the module talks to `/api/wa/*`, nothing simulates, the built app carries the new substitutions) and the adjusted older checks (Step 5).
- **Server tests** — unchanged files; run as a regression check.
- **Smoke** (`/tmp/wa-scrm-plan-026/smoke.sh`) — the built app holds none of the simulation's wording and all of the new calls; the page still loads on a real server without script errors; sign-in works; a server without a settings file says the link is not set up.
- **Verified by the reviewer in scripted browser sessions, not by you**: everything listed under "What was verified before this plan was written", again on your result; and the first link of a real number.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 6726127 -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `env -u WA_SCRM_OPENWA_ENV $NODE --test work/wa-replica/openwa-link.test.cjs` → `pass 13`, `fail 0`; `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`; `node --test work/wa-replica/ai-relay.test.cjs` → `pass 12`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-026/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-openwa.js` → `cd4a1737be6a009c3c6ae6bb61e5d7b8a80cbf4ebf8009c78b8c56d6dcef37c1`
- [ ] `sha256sum work/wa-replica/fidelity-boot.js` → `185d5070ea8556fda1e6ff3b7777cca53f699ef2e544c93f9a8a0fcc20a6f98e`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.js` → `0ee6ab56c02f4e1e6ae548c0795fa688c0618ac6193f0dda1a7b749425ce74e7`
- [ ] `sha256sum work/wa-replica/fidelity-ai.js` → `c84015c912dfadda1ff37112db95c1913e5451d67f2e39595f12a42bc14fb4be`
- [ ] `sha256sum work/wa-replica/fidelity.css` → `1db4ec98ee09765525e054c2bd67c37f65e0026a21a53dda584ab03b526bc792`
- [ ] `sha256sum work/wa-replica/build-fidelity.cjs` → `3de5581a0d9fea08cdf3269141185f10bd8f0440dd75a3820aa6044cd14db51a`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `e0e7b3f621483c75b4fc426bc6c2c0f976362038c2e218aab790f896530f1840`
- [ ] `sha256sum README.md` → `9e1354ebea8d1e9107dde597af2d4ba2a96003cbab40c574d6440756de8cd40a`
- [ ] `sha256sum PRODUCT.md` → `4028917b299c112058172b24df9197d476ebe8017cb9bfc6d04b5380bad270c2`
- [ ] `sha256sum DESIGN.md` → `b8869b6fc42eb69e9ca52e4b99e50c2deadbef5a30a9d8a46b54b266b5db9c48`
- [ ] `sha256sum outputs/wa-replica-prototype/README.md` → `4daafef6d56bc8e7b2c9ce27aded43dad12d50af3d483960cdcf1a392aef4031`
- [ ] `sha256sum replica/build-log.md` → `431461c430d69865a5aefe2ec8e0597ac41a469efa0e56758ea4d4a1403caeaa`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `ef072e2236da9293bd070055d95edaf4cef6d86019cdd23aec691f976224e3e0`
- [ ] `cmp work/wa-replica/fidelity-boot.js outputs/wa-replica-prototype/boot.js` → identical (no output)
- [ ] the icon-set command prints `removed=Paperclip,ScanQrCode,MessageSquareReply added=`
- [ ] `git diff --stat 6726127 -- work/wa-replica/fidelity-base work/wa-replica/serve.cjs work/wa-replica/site-auth.cjs work/wa-replica/site-data.cjs work/wa-replica/site-api.cjs work/wa-replica/site-admin.cjs work/wa-replica/openwa-link.cjs work/wa-replica/openwa-link.test.cjs work/wa-replica/ai-relay.cjs work/wa-replica/fidelity-ui.js work/wa-replica/fidelity-customer-pages.js work/wa-replica/fidelity-operations.js work/wa-replica/fidelity-dashboard.js work/wa-replica/fidelity-subsite.js work/wa-replica/fidelity-index.html` → empty
- [ ] `git diff 6726127 -- work/wa-replica/build-fidelity.cjs | grep -c '^-swap(\|^-cut('` → `0`
- [ ] `git status --porcelain` is empty after your final commit, and `git diff --name-only 6726127..HEAD -- . ':!plans'` lists only in-scope paths
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- A text to find, or a line beginning, does not occur exactly once in its file.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build fails, reports another number of icons than 84, or the icon-set command prints anything other than `removed=Paperclip,ScanQrCode,MessageSquareReply added=`.
- A server test fails, or the validator fails in a section this plan does not change.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file or contacting a real OpenWA.
- You believe a decision under "Decisions already made" is wrong. Report it; do not act on it.

## Maintenance notes

- **Deployment is not part of this plan.** Only page files change; the live service serves them from the repository and needs no restart.
- The page depends on plan 025's routes. When their answers change, `fidelity-openwa.js` is the only page file that knows them.
- A message carries `at` (milliseconds), `wa` (WhatsApp's id), for sent ones `request` and `status`; a customer carries `waChat` and `lastAt`; a number carries `linked` and `linkState`; the document carries `waCursor` (the position in the feed). Older data without these fields keeps working.
- Next steps: media (showing pictures, playing and transcribing voice notes, sending files); the wording clean-up ("演示" on functions that are real now); containers and the gateway.
- What a reviewer should scrutinise: that no path can send one press of the button twice; that the page's own message announced by OpenWA is never shown twice; that a page that lost the sub-site saves nothing; that typing survives a redraw.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
