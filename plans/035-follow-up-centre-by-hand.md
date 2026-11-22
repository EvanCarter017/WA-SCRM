# Plan 035: The follow-up centre holds what people entered by hand — the tab of pending signals is removed

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3d14eec..HEAD -- work/wa-replica replica/build-log.md outputs README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (one view removed, three places that led into it re-pointed; exact text and checksums for every edit)
- **Depends on**: plans/034-voice-notes-into-text.md (DONE), plans/031-follow-ups-by-hand.md (DONE)
- **Category**: direction (owner decision)
- **Planned at**: commit `3d14eec`, 2026-11-22

## Why this matters

The owner wants the follow-up section to hold only what people enter by hand: "'Follow-up' entries should not be created automatically when a new client arrives or sends a message; this section is managed entirely through manual input. Aside from timers and reminders, no automated creation processes are involved." Plan 031 removed the two to-dos the page made by itself. What still filled itself was the tab "待处理信号" (pending signals) of the follow-up centre: a list the system works out — every customer with unread messages, every customer without a planned follow-up, every customer whose follow-up ended and who wrote again, every customer with a to-do past its day. After the owner's first import it listed 85 of 87 customers, all because nobody had planned a follow-up for them. The owner took it for a leftover and, told that it is a live list, decided on 2026-11-22: **remove the tab**.

What this plan does:

- The follow-up centre has three views: the queue of to-dos (made by hand; the system marks "今日到期" and "已逾期"), the ended follow-ups, and the log. The tab "待处理信号" with its filter chips and its table is gone.
- The number beside "跟进闭环" in the menu no longer counts signals; it counts the viewer's to-dos that are past their day.
- The four status chips of the dashboard stay with their numbers; a click on one opens the customer list filtered by that status (it opened the removed tab).
- The status label in the chat strip stays; for a customer in follow-up without a to-do of the viewer's it opens the form that plans a follow-up (it opened the removed tab).

### Decisions already made (do not re-open; do not ask)

- Owner, 2026-11-22: remove the tab; "the customer list and the dashboard keep their status labels as they are".
- The statuses themselves (`lcHealth`) are not changed: the customer list, the chat strip, the customer file and the dashboard go on showing them.
- No new view replaces the tab.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/fidelity-lifecycle.js` | `808844da120dca408b477679288a2fe67b166a545a1de8a3d1b141244cd9c8d6` | `5638fcedccba44ac47cab06257371a09540d1fb3e3d0d73bb04b532c3b852d0c` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `9a195bc284b9fc7a65fe4a6891bdcdd81dbc1cf3d607416eacc48dba85b98bfc` | `24d7192d6844c6cb66e04167720de62d3069eba6ebd0d2846dfa47aa7d719575` |
| `work/wa-replica/build-fidelity.cjs` | `c6db2f6a821d40c848475d670b990b1b1eb2f897a61b8c09d55cf70429c4da3b` | `66e3de016b83a22d74cc2739a39610aa3004f45a7a17c455d9d3965d5addfc0a` |
| `README.md` | `26112fb57517c2c743a6f0e9c2733e3f3f9966563187639cf03f6d9c1bfa901b` | `2b75c4487f989e5dac6e6b606a32d49cb171cf5848aec16283438fb8d71414a0` |

- `fidelity-lifecycle.js` — the page module of customers and follow-ups. `lcHealth(c)` works out a customer's status (`awaitingReply`, `overdue`, `noPlan`, `recontact`, `closed`, the next to-do). `renderFollowups` draws the follow-up centre with the tabs `todo`, `signals`, `closed`, `history`. `menuHTML` draws the menu with a count beside the follow-up centre. `renderDashboard` adds four chips (`data-action="lcJumpSignal"`). The action `lcTrackFollow` leads from the chat strip to a customer's row in the follow-up centre. The customer list has its own filter by status (`lcState.customerHealthFilter`, values `reply`, `overdue`, `noplan`, `recontact`, `closed`).
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources; one block is added.
- `build-fidelity.cjs` — the build; only an entry of its record of the product's scope changes (it goes into `requirements.json`).
- `README.md` — three lines of section 2 and of the table of screens.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 3d14eec -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Syntax of the page module | `node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/fidelity-lifecycle.js','utf8')+'})');console.log('SYNTAX_OK')"` | `SYNTAX_OK` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 12`, `fail 0` |
| Link tests | `env -u WA_SCRM_OPENWA_ENV -u WA_SCRM_AI_ENV -u WA_SCRM_OPENWA_SYNC_MS -u WA_SCRM_OPENWA_SYNC_PAUSE_MS $NODE --test work/wa-replica/openwa-link.test.cjs` | `pass 19`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-035/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |
| Icon set | `node -e "const vm=require('vm'),fs=require('fs'),cp=require('child_process');const keys=s=>{const w={};vm.runInNewContext(s,{window:w});return Object.keys(w.WA_ICONS)};const a=keys(cp.execSync('git show 3d14eec:outputs/wa-replica-prototype/icons.js').toString()),b=keys(fs.readFileSync('outputs/wa-replica-prototype/icons.js','utf8'));console.log('removed='+a.filter(x=>!b.includes(x)).join(',')+' added='+b.filter(x=>!a.includes(x)).join(','))"` | `removed= added=` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-lifecycle.js`, `work/wa-replica/validate-scrm-lifecycle.cjs`, `work/wa-replica/build-fidelity.cjs` (Step 2)
- `README.md`, `replica/build-log.md` (Step 3)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{app.js,requirements.json,validation.json}` (the other output files must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular the server files, the other `fidelity-*.js` modules, `fidelity-lifecycle.css`, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`; the function `lcHealth` and the customer list's filter by status.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/035-follow-up-centre-by-hand` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): remove the tab of pending signals from the follow-up centre`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each change, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the four source files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-035/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-035 && cat > /tmp/wa-scrm-plan-035/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that the follow-up centre has no tab of pending signals any more, and that what led into it leads elsewhere.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the built page has no tab of pending signals' "$(grep -oE "lc-signals-table|subtab\('signals'|lcSignalDefs|tab === 'signals'" "$P/app.js" | wc -l | tr -d ' ')" 0
has 'the follow-up centre has three views' "$P/app.js" "const tab = ['todo', 'closed', 'history'].includes(lcState.followTab) ? lcState.followTab : 'todo';"
has 'a status chip of the dashboard opens the customer list' "$P/app.js" "lcJumpSignal: id => { lcState.customerHealthFilter = id; ui.pages.customers = 0; navigate('customers'); },"
has 'a customer without a to-do gets the form that plans one' "$P/app.js" 'if (!h.closed && !task) return openFollowup(c.id);'
has 'the menu counts to-dos past their day' "$P/app.js" 'title="已逾期待办"'
same 'the README no longer lists the view' "$(grep -c '待处理信号、已结束跟进' "$ROOT/README.md")" 0
same 'the page module passes the syntax check' "$(cd "$ROOT" && node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/fidelity-lifecycle.js','utf8')+'})');console.log('SYNTAX_OK')" 2>&1)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
same 'the link tests pass' "$(env -u WA_SCRM_OPENWA_ENV -u WA_SCRM_AI_ENV -u WA_SCRM_OPENWA_SYNC_MS -u WA_SCRM_OPENWA_SYNC_PAUSE_MS "$NODE" --test "$W/openwa-link.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 19 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-035/smoke.sh && ls -l /tmp/wa-scrm-plan-035/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-lifecycle.js work/wa-replica/validate-scrm-lifecycle.cjs work/wa-replica/build-fidelity.cjs README.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-035/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the built page has no tab of pending signals` (got: 6), `the follow-up centre has three views`, `a status chip of the dashboard opens the customer list`, `a customer without a to-do gets the form that plans one`, `the menu counts to-dos past their day` and `the README no longer lists the view` (got: 1) (six checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The page: three views in the follow-up centre; the validator and the scope record follow

#### `fidelity-lifecycle.js`

**Edit 2.1** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
    followTab: 'todo',
    signal: 'all',
    followTags: [],
```

Replace them with:

```text
    followTab: 'todo',
    followTags: [],
```

**Edit 2.2** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
    lcOrigResetExtras();
    Object.assign(lcState, { followTab: 'todo', signal: 'all', followTags: [], followFocus: null, customerHealthFilter: 'all', customerTier: 'all', customerStatus: 'all', orderOpen: [] });
    lcSeed();
```

Replace them with:

```text
    lcOrigResetExtras();
    Object.assign(lcState, { followTab: 'todo', followTags: [], followFocus: null, customerHealthFilter: 'all', customerTier: 'all', customerStatus: 'all', orderOpen: [] });
    lcSeed();
```

**Edit 2.3** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text

  // [id, label, icon] of the attention signals; 'all' means "any signal".
  const lcSignalDefs = [
    ['all', '全部信号', 'UsersRound'],
    ['reply', '客户待回复', 'Zap'],
    ['overdue', '跟进已逾期', 'ClockAlert'],
    ['noplan', '跟进断档', 'TriangleAlert'],
    ['recontact', '复联待处理', 'Flame'],
  ];
  const lcNeedsAttention = h => h.recontact || h.overdue || h.awaitingReply || h.noPlan;
  function lcMatchesSignal(c, signal) {
```

Replace them with:

```text

  // Does the customer carry this status: 'reply', 'overdue', 'noplan' or 'recontact'. The dashboard counts by it.
  function lcMatchesSignal(c, signal) {
```

**Edit 2.4** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
    if (signal === 'noplan') return h.noPlan;
    if (signal === 'recontact') return h.recontact;
    return lcNeedsAttention(h);
  }
```

Replace them with:

```text
    if (signal === 'noplan') return h.noPlan;
    return signal === 'recontact' && h.recontact;
  }
```

**Edit 2.5** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
  menuHTML = function(mobile = false) {
    const attention = myCustomers().filter(c => lcNeedsAttention(lcHealth(c))).length;
    const renderItem = (id, label) => {
      const badge = id === 'followups' && attention && !mobile
        ? `<span class="nav-count" title="待处理信号">${attention}</span>`
        : '';
```

Replace them with:

```text
  menuHTML = function(mobile = false) {
    // The follow-up centre holds what people entered by hand; its entry in the menu counts the viewer's to-dos
    // that are past their day.
    const late = myTasks().filter(t => !t.done && beforeToday(t.due)).length;
    const renderItem = (id, label) => {
      const badge = id === 'followups' && late && !mobile
        ? `<span class="nav-count" title="已逾期待办">${late}</span>`
        : '';
```

**Edit 2.6** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
  // ============================================================================
  // Page: #followups (跟进闭环中心 — 待办队列 + 待处理信号 + 已结束跟进 + 操作日志)
  // ============================================================================
```

Replace them with:

```text
  // ============================================================================
  // Page: #followups (跟进闭环中心 — 待办队列 + 已结束跟进 + 操作日志). Everything in it was entered by hand; the
  // system adds the reminders of a to-do's day (due today, overdue). The statuses the system works out for a
  // customer are shown in the customer list and on the dashboard, not here.
  // ============================================================================
```

**Edit 2.7** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
    const customers = myCustomers().filter(inScope);
    const attention = customers.filter(c => lcNeedsAttention(lcHealth(c)));
    const closedList = customers.filter(lcIsClosed);
    const marked = lcState.followTags.map(tag).filter(Boolean);
    const tab = ['todo', 'signals', 'closed', 'history'].includes(lcState.followTab) ? lcState.followTab : 'todo';
    // The row opened from the chat strip (lcTrackFollow): a to-do, or a customer when there is no to-do.
    const focus = lcState.followFocus;
```

Replace them with:

```text
    const customers = myCustomers().filter(inScope);
    const closedList = customers.filter(lcIsClosed);
    const marked = lcState.followTags.map(tag).filter(Boolean);
    const tab = ['todo', 'closed', 'history'].includes(lcState.followTab) ? lcState.followTab : 'todo';
    // The row opened from the chat strip (lcTrackFollow): a to-do, or a customer whose follow-up has ended.
    const focus = lcState.followFocus;
```

**Edit 2.8** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
        ${subtab('todo', '跟进待办队列', 'ClipboardList', pending.length)}
        ${subtab('signals', '待处理信号', 'TriangleAlert', attention.length)}
        ${subtab('closed', '已结束跟进', 'Archive', closedList.length)}
```

Replace them with:

```text
        ${subtab('todo', '跟进待办队列', 'ClipboardList', pending.length)}
        ${subtab('closed', '已结束跟进', 'Archive', closedList.length)}
```

**Edit 2.9** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text

    if (tab === 'signals') {
      const counts = Object.fromEntries(lcSignalDefs.map(([id]) => [id, customers.filter(c => lcMatchesSignal(c, id)).length]));
      const rows = customers.filter(c => lcMatchesSignal(c, lcState.signal)).map(c => {
        const h = lcHealth(c);
        return `<tr${focusCustomer(c)}>
          <td style="text-align:left">${nameCell(c)}</td>
          <td><span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span></td>
          <td style="text-align:left">${tagCell(c)}</td>
          <td>${esc(account(c.account)?.name || '—')}</td>
          <td style="text-align:left">${esc(c.preview || c.notes || '—')}<span class="fid-cell-detail">最后活跃：${esc(c.last || '—')}</span></td>
          <td><div class="fid-icon-actions">
            ${fidButton(h.closed ? '重新跟进' : '安排跟进', 'followup', 'CalendarPlus', 'slim blue', fidActionID(c.id))}
            ${fidButton('去聊天', 'openConversation', 'MessageCircle', 'slim', fidActionID(c.id))}
            ${h.closed ? '' : fidButton('结束跟进', 'lcCloseOpen', 'Archive', 'slim', fidActionID(c.id))}
          </div></td>
        </tr>`;
      }).join('');
      const chips = lcSignalDefs.map(([id, label, glyph]) => {
        const tone = !counts[id] || id === 'all' ? '' : (id === 'overdue' || id === 'recontact') ? 'is-hot' : 'is-alert';
        return `<button type="button" class="lc-radar-chip ${tone}" data-action="lcSignal" ${fidActionID(id)} aria-pressed="${lcState.signal === id}">${icon(glyph)}${esc(label)}<b>${counts[id]}</b></button>`;
      }).join('');
      return page('集中处理客户待回复、跟进已逾期、跟进断档与复联待处理四类信号，确保没有客户悬空。', `${tagBar}
        <div class="lc-radar-chips" style="margin-bottom:14px" role="group" aria-label="信号筛选">${chips}</div>
        <div class="fid-table-card">${fidTable('lc-signals-table', ['客户', '信号', '标签', '接待 WhatsApp 号', '最近沟通上下文', '处理'], rows, '当前没有需要处理的信号，跟进闭环完整。', true, 'BadgeCheck')}</div>`);
    }

    if (tab === 'closed') {
```

Replace them with:

```text

    if (tab === 'closed') {
```

**Edit 2.10** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
    const strip = `<div class="lc-chat-strip" aria-label="客户跟进协同栏">
      <button type="button" class="lc-pill lc-pill-link ${h.primary.tone}" data-action="lcTrackFollow" ${fidActionID(c.id)} title="在跟进闭环中查看此客户">${icon(h.primary.icon)}${esc(h.primary.label)}</button>
      ${h.nextTask ? `<button type="button" class="lc-pill lc-pill-link info" data-action="lcTrackFollow" ${fidActionID(c.id)} title="在跟进闭环中查看此客户">${icon('CalendarClock')}下次跟进 ${esc(dateLabel(h.nextTask.due))}</button>` : ''}
```

Replace them with:

```text
    const strip = `<div class="lc-chat-strip" aria-label="客户跟进协同栏">
      <button type="button" class="lc-pill lc-pill-link ${h.primary.tone}" data-action="lcTrackFollow" ${fidActionID(c.id)} title="${h.closed || h.nextTask ? '在跟进闭环中查看此客户' : '为此客户安排跟进'}">${icon(h.primary.icon)}${esc(h.primary.label)}</button>
      ${h.nextTask ? `<button type="button" class="lc-pill lc-pill-link info" data-action="lcTrackFollow" ${fidActionID(c.id)} title="在跟进闭环中查看此客户">${icon('CalendarClock')}下次跟进 ${esc(dateLabel(h.nextTask.due))}</button>` : ''}
```

**Edit 2.11** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
    fidTasks: () => { lcState.followTab = 'todo'; ui.taskFilter = 'pending'; ui.pages.followups = 0; navigate('followups'); },
    lcSignal: id => { lcState.signal = id; render(); },
    lcJumpSignal: id => { lcState.followTab = 'signals'; lcState.signal = id; ui.pages.followups = 0; navigate('followups'); },
    // Chat strip → follow-up centre, on this customer's row: the earliest unfinished to-do if the viewer
    // has one for the customer, otherwise the customer among the signals, or among the ended follow-ups.
    // The row stays highlighted until the follow-up centre is left (see the render wrapper).
    lcTrackFollow: id => {
```

Replace them with:

```text
    fidTasks: () => { lcState.followTab = 'todo'; ui.taskFilter = 'pending'; ui.pages.followups = 0; navigate('followups'); },
    // A status chip of the dashboard → the customer list, filtered by that status.
    lcJumpSignal: id => { lcState.customerHealthFilter = id; ui.pages.customers = 0; navigate('customers'); },
    // Chat strip → follow-up centre, on this customer's row: the earliest unfinished to-do if the viewer
    // has one for the customer, or the customer among the ended follow-ups. The row stays highlighted until
    // the follow-up centre is left (see the render wrapper). A customer in follow-up without such a to-do has
    // no row there: the form that plans a follow-up opens instead.
    lcTrackFollow: id => {
```

**Edit 2.12** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
      const task = !h.closed && h.nextTask && myTasks().includes(h.nextTask) ? h.nextTask : null;
      if (!lcHasFollowTags(c)) lcState.followTags = [];
      lcState.followTab = h.closed ? 'closed' : task ? 'todo' : 'signals';
      if (task) ui.taskFilter = 'pending';
      else if (!h.closed) lcState.signal = 'all';
      lcState.followFocus = { customer: c.id, task: task ? task.id : null, placed: false };
```

Replace them with:

```text
      const task = !h.closed && h.nextTask && myTasks().includes(h.nextTask) ? h.nextTask : null;
      if (!h.closed && !task) return openFollowup(c.id);
      if (!lcHasFollowTags(c)) lcState.followTags = [];
      lcState.followTab = h.closed ? 'closed' : 'todo';
      if (task) ui.taskFilter = 'pending';
      lcState.followFocus = { customer: c.id, task: task ? task.id : null, placed: false };
```

#### `validate-scrm-lifecycle.cjs`

**Edit 2.13** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text

// 6. The engagement loop is wired: two states, four signals, forced choice on completion
for (const required of ['lcMigrateEngagement', 'lcCloseEngagement', 'lcReopenEngagement', 'lcApplyFormTags', "'lc-close-engagement-form'", "'lc-follow-tag-filter-form'", '请填写下次跟进事项和提醒时间，或选择结束跟进。']) {
```

Replace them with:

```text

// 6. The engagement loop is wired: two states, forced choice on completion. The follow-up centre lists what
// people entered by hand: it has no tab of signals the system works out; the dashboard's status chips open the
// customer list.
for (const gone of ["subtab('signals'", "tab === 'signals'", 'lcSignalDefs', 'lc-signals-table', 'lcState.signal', 'title="待处理信号"']) {
  assert(!moduleSource.includes(gone), `fidelity-lifecycle.js still has the tab of pending signals (${gone})`);
}
for (const required of ["const tab = ['todo', 'closed', 'history'].includes(lcState.followTab) ? lcState.followTab : 'todo';", "lcJumpSignal: id => { lcState.customerHealthFilter = id; ui.pages.customers = 0; navigate('customers'); },", 'if (!h.closed && !task) return openFollowup(c.id);', 'const late = myTasks().filter(t => !t.done && beforeToday(t.due)).length;']) {
  assert(moduleSource.includes(required), `fidelity-lifecycle.js is missing ${required}`);
}
for (const required of ['lcMigrateEngagement', 'lcCloseEngagement', 'lcReopenEngagement', 'lcApplyFormTags', "'lc-close-engagement-form'", "'lc-follow-tag-filter-form'", '请填写下次跟进事项和提醒时间，或选择结束跟进。']) {
```

#### `build-fidelity.cjs`

**Edit 2.14** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
  name: '跟进闭环',
  features: ['待办队列（逾期/今日/全部）', '待处理信号（待回复/逾期/断档/复联）', '完成跟进必须安排下一步或结束跟进', '已结束跟进与重新跟进', '按标签筛选', '操作日志'],
  notes: '每位客户要么有下一步跟进，要么已明确结束跟进。',
```

Replace them with:

```text
  name: '跟进闭环',
  features: ['待办队列（逾期/今日/全部）', '完成跟进必须安排下一步或结束跟进', '已结束跟进与重新跟进', '按标签筛选', '操作日志'],
  notes: '每位客户要么有下一步跟进，要么已明确结束跟进。',
```

**Verify**: `sha256sum work/wa-replica/fidelity-lifecycle.js work/wa-replica/validate-scrm-lifecycle.cjs work/wa-replica/build-fidelity.cjs` → `5638fcedccba44ac47cab06257371a09540d1fb3e3d0d73bb04b532c3b852d0c`, `24d7192d6844c6cb66e04167720de62d3069eba6ebd0d2846dfa47aa7d719575`, `66e3de016b83a22d74cc2739a39610aa3004f45a7a17c455d9d3965d5addfc0a`; the syntax command → `SYNTAX_OK`; `git checkout 3d14eec -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; the icon-set command → `removed= added=`; `sha256sum outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/requirements.json` → `8239f173b945d5e38aa953546d10d047a3a66153e4afee2149a1729fe4ab74f9`, `80149914bfec9dad050ae0be2ccfd581b2c1d10a80654b8e42819a2c94f12731`. If a checksum does not match, restore the file with `git checkout 3d14eec -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 3: README, build log, final verification

**Edit 3.1** — `README.md`. Find exactly these lines (they occur once):

```text
- **待办只由人建立**：系统不自动生成跟进待办。待办来自「新建跟进任务」（填写事项与计划时间），或完成一次跟进时安排的下一步。新客户来信出现在「客户待回复」信号中；尚未安排跟进的客户提示「跟进断档」。
- **四类待处理信号**：客户待回复、跟进已逾期、跟进断档、复联待处理。
- **标签为辅**：标签由用户自建；可按标签筛选跟进闭环中心，并在完成或结束跟进时同步更新客户标签。系统不预置、不自动打标。
```

Replace them with:

```text
- **待办只由人建立**：系统不自动生成跟进待办。待办来自「新建跟进任务」（填写事项与计划时间），或完成一次跟进时安排的下一步。新客户来信出现在「客户待回复」信号中；尚未安排跟进的客户提示「跟进断档」。
- **四种跟进状态提示**：客户待回复、跟进已逾期、跟进断档、复联待处理。它们由系统根据未读消息和待办时间得出，显示在客户列表（状态标签与筛选）、聊天界面和首页；跟进闭环中心只列出人工建立的待办及其到期、逾期提醒，不再设「待处理信号」视图。
- **标签为辅**：标签由用户自建；可按标签筛选跟进闭环中心，并在完成或结束跟进时同步更新客户标签。系统不预置、不自动打标。
```

**Edit 3.2** — `README.md`. Find exactly these lines (they occur once):

```text
| :--- | :--- | :--- |
| `#dashboard` | **首页经营概览** | 未读会话、待跟进、在线号码、客户总数、跟进闭环概览与四类信号直达 |
| `#followups` | **跟进闭环中心** | 跟进待办队列、待处理信号、已结束跟进、操作日志四视图；按标签筛选；「完成并闭环」必须安排下一步或结束跟进 |
| `#inbox` | **WhatsApp API 在线聊天** | 通过 OpenWA 扫码绑定真实号码、接收消息与发送文本、掉线后重新连接、解除绑定；接收译文与草稿预览、聊天窗内嵌跟进协同条（跟进状态、下次跟进、标签、安排跟进）；可直接调整客户等级与客户状态；可将会话快照移入聊天记录；会话卡片直接显示客户标签，不显示跟进状态；点击协同条的跟进状态或下次跟进可跳转到跟进闭环并定位该客户 |
```

Replace them with:

```text
| :--- | :--- | :--- |
| `#dashboard` | **首页经营概览** | 未读会话、待跟进、在线号码、客户总数、跟进闭环概览；四种跟进状态的数量，点击后打开按该状态筛选的客户列表 |
| `#followups` | **跟进闭环中心** | 跟进待办队列、已结束跟进、操作日志三视图（内容均由人工录入，系统只提示今日到期与已逾期）；按标签筛选；「完成并闭环」必须安排下一步或结束跟进 |
| `#inbox` | **WhatsApp API 在线聊天** | 通过 OpenWA 扫码绑定真实号码、接收消息与发送文本、掉线后重新连接、解除绑定；接收译文与草稿预览、聊天窗内嵌跟进协同条（跟进状态、下次跟进、标签、安排跟进）；可直接调整客户等级与客户状态；可将会话快照移入聊天记录；会话卡片直接显示客户标签，不显示跟进状态；点击协同条的跟进状态或下次跟进可跳转到跟进闭环并定位该客户 |
```

**Append 3.3** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 跟进闭环中心只保留人工录入的内容：移除「待处理信号」视图 · 2026-11-22

按项目负责人的决定，跟进闭环中心不再有「待处理信号」视图。这个视图由系统自动列出客户（客户待回复、跟进断档、复联待处理、跟进已逾期），同步进来的客户会全部出现在其中，与「跟进内容完全由人工录入」的要求不符。

现在：跟进闭环中心只有三个视图——跟进待办队列（人工建立的待办，系统提示「今日到期」「已逾期」）、已结束跟进、跟进与操作日志。菜单上「跟进闭环」旁的数字改为本人已逾期的待办数。首页的四个状态数字保留，点击后打开按该状态筛选的客户列表；聊天界面的跟进状态标签，在客户没有待办时点击会打开「安排跟进」表单。客户列表的跟进状态标签与筛选不变。
```

Then verify everything once more:

```bash
git checkout 3d14eec -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && $NODE --test work/wa-replica/site-api.test.cjs && env -u WA_SCRM_OPENWA_ENV -u WA_SCRM_AI_ENV -u WA_SCRM_OPENWA_SYNC_MS -u WA_SCRM_OPENWA_SYNC_PAUSE_MS $NODE --test work/wa-replica/openwa-link.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-035/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test runs end with `pass 12` and `pass 19`, `fail 0` each; smoke ends with `SMOKE PASS`; `sha256sum README.md replica/build-log.md` → `2b75c4487f989e5dac6e6b606a32d49cb171cf5848aec16283438fb8d71414a0`, `3c431c2acacc6fe2774334f83d7df77a85803f1d3d0a4faa760724445ecfc815`; `git status --porcelain` lists exactly eight paths: `README.md`, `replica/build-log.md`, the three source files under `work/wa-replica/`, and `outputs/wa-replica-prototype/app.js`, `requirements.json` and `validation.json` (if `outputs/wa-replica-prototype/icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the page module no longer has the tab, its table, its list of signals or the old title of the menu count; it has the three views, the dashboard chips' new target, the form for a customer without a to-do and the count of to-dos past their day.
- **Smoke** (`/tmp/wa-scrm-plan-035/smoke.sh`) — the same facts on the built page, the README, the syntax of the module and the server tests (12 and 19 as before; no server change).
- **Verified by the reviewer in scripted browser sessions, not by you**: the follow-up centre shows three tabs and no table of signals; a new customer and a customer who writes appear nowhere in the follow-up centre; the menu count is the number of to-dos past their day; each dashboard chip opens the customer list with that status chosen and the same number of rows; the status label of the chat strip opens the planning form for a customer without a to-do, the to-do's row for one with a to-do, the ended follow-ups for one whose follow-up ended; the sessions of the rest of the product and of the connection still pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 3d14eec -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`; the link tests → `pass 19`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-035/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.js` → `5638fcedccba44ac47cab06257371a09540d1fb3e3d0d73bb04b532c3b852d0c`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `24d7192d6844c6cb66e04167720de62d3069eba6ebd0d2846dfa47aa7d719575`
- [ ] `sha256sum work/wa-replica/build-fidelity.cjs` → `66e3de016b83a22d74cc2739a39610aa3004f45a7a17c455d9d3965d5addfc0a`
- [ ] `sha256sum README.md` → `2b75c4487f989e5dac6e6b606a32d49cb171cf5848aec16283438fb8d71414a0`
- [ ] `sha256sum replica/build-log.md` → `3c431c2acacc6fe2774334f83d7df77a85803f1d3d0a4faa760724445ecfc815`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `8239f173b945d5e38aa953546d10d047a3a66153e4afee2149a1729fe4ab74f9`
- [ ] `sha256sum outputs/wa-replica-prototype/requirements.json` → `80149914bfec9dad050ae0be2ccfd581b2c1d10a80654b8e42819a2c94f12731`
- [ ] the icon-set command prints `removed= added=`
- [ ] `git diff --name-only 3d14eec..HEAD -- . ':!plans'` lists exactly these eight: `README.md`, `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/requirements.json`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/build-fidelity.cjs`, `work/wa-replica/fidelity-lifecycle.js`, `work/wa-replica/validate-scrm-lifecycle.cjs`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- A test fails, the build fails or reports another number of icons than 84, or the validator fails.
- An output file other than `app.js`, `requirements.json` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file.

## Maintenance notes

- **Deployment**: only page files change; no restart is needed after the merge. Open pages get the new code at their next refresh.
- The statuses are still worked out for every customer and shown in the customer list (label and filter), the chat strip, the customer file and the dashboard. If the owner later wants one of them gone or renamed, the place is `lcHealth` and the places that show `h.primary`.
- A customer who needs attention and has no to-do is found through the customer list's filter by status (or the dashboard chips that open it), not in the follow-up centre.
- What a reviewer should scrutinise: that nothing still sets `lcState.followTab` to `'signals'`, that the dashboard's numbers equal the rows of the filtered customer list, and that the chat strip's label never opens an empty view.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
