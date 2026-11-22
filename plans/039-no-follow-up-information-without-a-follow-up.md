# Plan 039: No follow-up information for a customer nobody planned a follow-up for

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 55229bd..HEAD -- work/wa-replica replica/build-log.md outputs README.md PRODUCT.md DESIGN.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW–MEDIUM (one function decides the status; five places draw it and must allow for "none"; exact text and checksums for every edit)
- **Depends on**: plans/038-customer-language-choice.md (DONE)
- **Category**: feature (owner decision)
- **Planned at**: commit `55229bd`, 2026-11-22

## Why this matters

The page treated every customer whose follow-up was not ended as being "in follow-up". A customer without a to-do therefore carried the status "跟进断档" ("follow-up gap") — in the strip above the conversation, in the customer list, in the dashboard's counts, in the export and as a warning card in the customer's file — and a customer with unread messages carried "客户待回复". After the owner imported 87 customers from WhatsApp, 85 of them showed "跟进断档", although nobody had planned a follow-up for any of them.

Follow-ups are made by hand only (plans 031, 035, 036). The owner, 2026-11-22: "Is the 'Follow-up' item still appearing? In theory, for any customer where a follow-up transaction link hasn't been manually created, no information related to follow-ups should be displayed."

What this plan does:

- **A customer has a follow-up status only where a person made one**: an unfinished to-do made by hand ("跟进中": 跟进正常 / 跟进已逾期 / 客户待回复), or a follow-up ended by hand (已结束跟进 / 复联待处理). For every other customer the page shows nothing about follow-ups: no label in the strip above the conversation, "—" in the customer list, an empty cell in the export, no indicators and no card in the customer's file.
- **The status "跟进断档" is gone** with everything that belonged to it: the dashboard's count, the entry in the customer list's filter, the warning card in the customer's file.
- **The dashboard's "跟进中"** counts the customers with an unfinished to-do (it used to count every customer whose follow-up was not ended).
- The buttons that plan a follow-up ("安排跟进") stay where they are: that is how a follow-up is made by hand.
- The notice after making a customer by hand no longer says "尚未安排跟进".

### Decisions already made (do not re-open; do not ask)

- "客户待回复" is a follow-up status too: without a to-do it is not shown. Unread messages remain visible where they were before, outside the follow-up information: the count on the conversation's card, the line "N 条未读" in the customer list's column of the last interaction, and the dashboard's figure "未读会话".
- "结束跟进" can be chosen where a follow-up exists (the card of the to-do in the customer's file, or when finishing a to-do). The warning card was the only place that offered it for a customer without a to-do; it goes with the card.
- Nothing in the stored data changes and nothing is converted: the field `engagement` keeps its values; only what the page works out from the to-dos changes. A customer whose only to-do is deleted shows nothing again.
- The status keeps the shape it had — a usual status that the conditions below it replace — so the lines stay in their order. That also keeps the order in which the build meets the icons: `icons.js` comes out unchanged.
- The descriptions on the pages of the follow-up centre stay as they are. The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/fidelity-lifecycle.js` | `8c4ad74b97ba58b41de5fede571fc15c47bb6d72ed413b727f72dad44bc48df5` | `23dcea7a797d7dcc48448fc27a43b19cace55a0baca67ea4a6206b87bd9bed14` |
| `work/wa-replica/build-fidelity.cjs` | `da080ce1e0e42f6fa686cb38c6488865b0e0ec95a476b1e522f18d008aa40c87` | `93769241bd082c11739369b28fba33afd8b68e2cb6e400da2bfbbdb661c0f6e2` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `23131fd90268f510a1a3ab0faf6832aa3e503ef2ca9365935c12c09e69bb8229` | `263e69f893d43da3a6ec4cc0976363bb48aeea1c5505c18ee84bd00cf4708263` |
| `README.md` | `802351d586cc388e9c51604f6dee96b90bd059d4519d045c5ecec8ad17bc96c3` | `2d2d86ce7a4e7dc44a2da5950711f3709b47240eae13d3e5e0c1887c7b336470` |
| `PRODUCT.md` | `4028917b299c112058172b24df9197d476ebe8017cb9bfc6d04b5380bad270c2` | `0f86a21f97fff8de145136693ae5a3139af1983891a00d762197c58ed3c00d64` |
| `DESIGN.md` | `b8869b6fc42eb69e9ca52e4b99e50c2deadbef5a30a9d8a46b54b266b5db9c48` | `d721aaf6b39fb34a5ec062baf900e905496f98df782b23b695241bc07608b8dc` |

- `fidelity-lifecycle.js` — the page module of customers and follow-ups. `lcHealth(c)` works out a customer's follow-up status from the to-dos (`data.tasks`, all made by hand), the unread count and whether the follow-up was ended (`lcIsClosed(c)`); it returns `{ primary, nextTask, closed, awaitingReply, recontact, overdue, noPlan }`, where `primary` (`{ key, label, tone, icon }`) is what the page draws. Today `primary` always exists. It is drawn in the strip above a conversation (`chatHTML`), in the customer list (`customerRows`), in the export (`fidExportCustomers`), in the customer's file (`profileHTML`: four indicators and a card) and in the table of ended follow-ups (those customers always have a status). `lcMatchesSignal(c, signal)` is what the dashboard's counts use; `lcCustomerPool` filters the customer list by the status.
- `build-fidelity.cjs` — the build. Two of its requirement texts (they end up in `outputs/wa-replica-prototype/requirements.json`) describe the old rule.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page; one block is added, and the list of statuses in its summary loses `noplan`.
- `README.md`, `PRODUCT.md`, `DESIGN.md` — describe the follow-up statuses; `replica/build-log.md` gets an entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 55229bd -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Syntax of the page module | `node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/fidelity-lifecycle.js','utf8')+'})');console.log('SYNTAX_OK')"` | `SYNTAX_OK` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 12`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-039/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |
| Icon set | `node -e "const vm=require('vm'),fs=require('fs'),cp=require('child_process');const keys=s=>{const w={};vm.runInNewContext(s,{window:w});return Object.keys(w.WA_ICONS)};const a=keys(cp.execSync('git show 55229bd:outputs/wa-replica-prototype/icons.js').toString()),b=keys(fs.readFileSync('outputs/wa-replica-prototype/icons.js','utf8'));console.log('removed='+a.filter(x=>!b.includes(x)).join(',')+' added='+b.filter(x=>!a.includes(x)).join(','))"` | `removed= added=` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-lifecycle.js`, `build-fidelity.cjs`, `validate-scrm-lifecycle.cjs` (Step 2)
- `README.md`, `PRODUCT.md`, `DESIGN.md`, `replica/build-log.md` (Step 3)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{app.js,requirements.json,validation.json}` (the other output files, `icons.js` among them, must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular the server files, the other page modules, the style sheets (the one style rule of the removed warning card, `.lc-card-block.warn-block`, stays in place unused — removing it would change two more output files), everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/039-no-follow-up-information-without-a-follow-up` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): no follow-up information for a customer without a planned follow-up`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each change, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the six files are exactly right. Some lines of the documents are very long; they are single lines.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-039/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-039 && cat > /tmp/wa-scrm-plan-039/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that the page shows follow-up information only for a customer a person made a follow-up for.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
same 'the page has no status for a customer without a planned follow-up' "$(grep -c -e '跟进断档' -e 'noplan' -e 'noPlan' "$P/app.js")" 0
has 'a customer has a follow-up status only with a to-do made by hand or a follow-up ended by hand' "$P/app.js" "let primary = planned ? { key: 'healthy', label: '跟进正常', tone: 'ok', icon: 'BadgeCheck' } : null;"
has 'a customer waits for a reply, as a follow-up status, only with a to-do' "$P/app.js" 'const awaitingReply = planned && c.unread > 0;'
has 'the strip above a conversation shows a status only where there is one' "$P/app.js" '${h.primary ? `<button type="button" class="lc-pill lc-pill-link ${h.primary.tone}" data-action="lcTrackFollow"'
has 'the customer list shows a status only where there is one' "$P/app.js" '<td>${h.primary ? `<span class="lc-pill ${h.primary.tone}">'
has 'the export leaves the cell empty where there is none' "$P/app.js" "lcHealth(c).primary?.label || ''"
has 'in follow-up are the customers with a to-do made by hand' "$P/app.js" 'const plannedCount = customers.filter(c => lcHealth(c).planned).length;'
same 'the dashboard counts three statuses' "$(grep -cE "chip\('(reply|overdue|noplan|recontact)'," "$P/app.js")" 3
has 'the notice after making a customer by hand says nothing about follow-ups' "$P/app.js" 'toast(`客户 ${c.name} 已创建。`);'
has 'the requirement texts of the build say it' "$P/requirements.json" '其余客户没有跟进状态'
has 'the README says it' "$ROOT/README.md" '没有人安排过跟进的客户没有跟进状态'
has 'the product description says it' "$ROOT/PRODUCT.md" '已安排的客户跟进不断档'
has 'the design description says it' "$ROOT/DESIGN.md" '其余客户不显示任何跟进信息'
same 'the page module passes the syntax check' "$(cd "$ROOT" && node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/fidelity-lifecycle.js','utf8')+'})');console.log('SYNTAX_OK')" 2>&1)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-039/smoke.sh && ls -l /tmp/wa-scrm-plan-039/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-lifecycle.js work/wa-replica/build-fidelity.cjs work/wa-replica/validate-scrm-lifecycle.cjs README.md PRODUCT.md DESIGN.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-039/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `the page has no status for a customer without a planned follow-up` (got: 9), `a customer has a follow-up status only with a to-do made by hand or a follow-up ended by hand`, `a customer waits for a reply, as a follow-up status, only with a to-do`, `the strip above a conversation shows a status only where there is one`, `the customer list shows a status only where there is one`, `the export leaves the cell empty where there is none`, `in follow-up are the customers with a to-do made by hand`, `the dashboard counts three statuses` (got: 4), `the notice after making a customer by hand says nothing about follow-ups`, `the requirement texts of the build say it`, `the README says it`, `the product description says it` and `the design description says it` (thirteen checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The page: a status only where a person made a follow-up

#### `fidelity-lifecycle.js`

**Edit 2.1** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text

  function lcHealth(c) {
```

Replace them with:

```text

  // A customer has a follow-up status only where a person made one: an unfinished to-do (`planned`), or a
  // follow-up that was ended by hand (`closed`). Without either, `primary` is null and the page shows nothing
  // about follow-ups for the customer.
  function lcHealth(c) {
```

**Edit 2.2** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
    const nextTask = lcNextTask(c.id);
    const awaitingReply = !closed && c.unread > 0;
    const recontact = closed && c.unread > 0;
    const overdue = !closed && Boolean(nextTask && beforeToday(nextTask.due));
    const noPlan = !closed && !nextTask;

    let primary = { key: 'healthy', label: '跟进正常', tone: 'ok', icon: 'BadgeCheck' };
    if (recontact) primary = { key: 'recontact', label: '复联待处理', tone: 'hot', icon: 'Flame' };
```

Replace them with:

```text
    const nextTask = lcNextTask(c.id);
    const planned = !closed && Boolean(nextTask);
    const awaitingReply = planned && c.unread > 0;
    const recontact = closed && c.unread > 0;
    const overdue = planned && beforeToday(nextTask.due);

    let primary = planned ? { key: 'healthy', label: '跟进正常', tone: 'ok', icon: 'BadgeCheck' } : null;
    if (recontact) primary = { key: 'recontact', label: '复联待处理', tone: 'hot', icon: 'Flame' };
```

**Edit 2.3** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
    else if (awaitingReply) primary = { key: 'reply', label: '客户待回复', tone: 'warn', icon: 'Zap' };
    else if (noPlan) primary = { key: 'noplan', label: '跟进断档', tone: 'warn', icon: 'TriangleAlert' };
    else if (closed) primary = { key: 'closed', label: '已结束跟进', tone: 'neutral', icon: 'Archive' };

    return { primary, nextTask, closed, awaitingReply, recontact, overdue, noPlan };
  }

  // Does the customer carry this status: 'reply', 'overdue', 'noplan' or 'recontact'. The dashboard counts by it.
  function lcMatchesSignal(c, signal) {
```

Replace them with:

```text
    else if (awaitingReply) primary = { key: 'reply', label: '客户待回复', tone: 'warn', icon: 'Zap' };
    else if (closed) primary = { key: 'closed', label: '已结束跟进', tone: 'neutral', icon: 'Archive' };

    return { primary, nextTask, closed, planned, awaitingReply, recontact, overdue };
  }

  // Does the customer carry this status: 'reply', 'overdue' or 'recontact'. The dashboard counts by it.
  function lcMatchesSignal(c, signal) {
```

**Edit 2.4** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
    if (signal === 'overdue') return h.overdue;
    if (signal === 'noplan') return h.noPlan;
    return signal === 'recontact' && h.recontact;
```

Replace them with:

```text
    if (signal === 'overdue') return h.overdue;
    return signal === 'recontact' && h.recontact;
```

**Edit 2.5** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
           </div>`
        : !h.closed
          ? `<div class="lc-card-block warn-block">
               <div class="lc-block-head">
                 <h3>${icon('TriangleAlert')}跟进断档预警</h3>
                 <div class="lc-deal-actions">
                   ${fidButton('立即补排跟进', 'followup', 'CalendarPlus', 'slim blue', fidActionID(c.id))}
                   ${fidButton('结束跟进', 'lcCloseOpen', 'Archive', 'slim', fidActionID(c.id))}
                 </div>
               </div>
               <p style="font-size:12px;color:var(--fid-ink)">该客户尚未安排下一次跟进，极易造成意向流失。请补排跟进，或明确结束跟进。</p>
             </div>`
          : `<div class="lc-card-block">
               <div class="lc-block-head">
```

Replace them with:

```text
           </div>`
        : h.closed
          ? `<div class="lc-card-block">
               <div class="lc-block-head">
```

**Edit 2.6** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
               <p style="font-size:12px;color:var(--fid-ink)">结束原因：${esc(c.closedReason || '未记录')}${c.closedAt ? `（${esc(fidDate(c.closedAt).slice(0, 10))}）` : ''}。客户再次来信时会提示「复联待处理」。</p>
             </div>`;

```

Replace them with:

```text
               <p style="font-size:12px;color:var(--fid-ink)">结束原因：${esc(c.closedReason || '未记录')}${c.closedAt ? `（${esc(fidDate(c.closedAt).slice(0, 10))}）` : ''}。客户再次来信时会提示「复联待处理」。</p>
             </div>`
          : '';

```

**Edit 2.7** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
      <div class="lc-dossier-kpis">
        <div class="lc-mini-kpi"><span>当前跟进状态</span><strong style="font-size:12px">${esc(h.primary.label)}</strong></div>
        <div class="lc-mini-kpi"><span>下次跟进</span><strong>${h.nextTask ? esc(dateLabel(h.nextTask.due)) : '未安排'}</strong></div>
        <div class="lc-mini-kpi"><span>最近互动</span><strong>${esc(c.last || '—')}</strong></div>
        <div class="lc-mini-kpi"><span>重新跟进次数</span><strong>${c.reactivatedCount || 0} 次</strong></div>
      </div>
```

Replace them with:

```text
      <div class="lc-dossier-kpis">
        ${h.primary ? `<div class="lc-mini-kpi"><span>当前跟进状态</span><strong style="font-size:12px">${esc(h.primary.label)}</strong></div>
        <div class="lc-mini-kpi"><span>下次跟进</span><strong>${h.nextTask ? esc(dateLabel(h.nextTask.due)) : '未安排'}</strong></div>` : ''}
        <div class="lc-mini-kpi"><span>最近互动</span><strong>${esc(c.last || '—')}</strong></div>
        ${h.primary ? `<div class="lc-mini-kpi"><span>重新跟进次数</span><strong>${c.reactivatedCount || 0} 次</strong></div>` : ''}
      </div>
```

**Edit 2.8** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
    if (lcState.customerHealthFilter === 'overdue') return h.overdue;
    if (lcState.customerHealthFilter === 'noplan') return h.noPlan;
    if (lcState.customerHealthFilter === 'recontact') return h.recontact;
```

Replace them with:

```text
    if (lcState.customerHealthFilter === 'overdue') return h.overdue;
    if (lcState.customerHealthFilter === 'recontact') return h.recontact;
```

**Edit 2.9** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
        <td>${esc(c.phone)}<span class="fid-cell-detail">${esc(country(c))} · ${esc(aiLanguageLabel(c))}</span></td>
        <td><span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span><span class="fid-cell-detail">${h.nextTask ? esc(dateLabel(h.nextTask.due)) : '无待办'}</span></td>
        <td>${esc(c.last || '—')}${c.unread ? `<span class="fid-cell-detail">${c.unread} 条未读</span>` : ''}</td>
```

Replace them with:

```text
        <td>${esc(c.phone)}<span class="fid-cell-detail">${esc(country(c))} · ${esc(aiLanguageLabel(c))}</span></td>
        <td>${h.primary ? `<span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span><span class="fid-cell-detail">${h.nextTask ? esc(dateLabel(h.nextTask.due)) : '无待办'}</span>` : '—'}</td>
        <td>${esc(c.last || '—')}${c.unread ? `<span class="fid-cell-detail">${c.unread} 条未读</span>` : ''}</td>
```

**Edit 2.10** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
        <input class="fid-input" id="customer-search" aria-label="搜索客户库" placeholder="请输入" value="${esc(ui.customerQuery)}">
        <select class="fid-select" id="fid-customer-health-select" aria-label="跟进状态">${fidOption([['all', '全部跟进状态'], ['reply', '客户待回复'], ['overdue', '跟进已逾期'], ['noplan', '跟进断档(无待办)'], ['recontact', '复联待处理'], ['closed', '已结束跟进']], lcState.customerHealthFilter)}</select>
        <select class="fid-select" id="fid-customer-country" aria-label="国家">${fidOption([['all', '请选择国家'], ['US', '美国'], ['PR', '波多黎各'], ['OTHER', '其他地区']], fid.customerCountry)}</select>
```

Replace them with:

```text
        <input class="fid-input" id="customer-search" aria-label="搜索客户库" placeholder="请输入" value="${esc(ui.customerQuery)}">
        <select class="fid-select" id="fid-customer-health-select" aria-label="跟进状态">${fidOption([['all', '全部跟进状态'], ['reply', '客户待回复'], ['overdue', '跟进已逾期'], ['recontact', '复联待处理'], ['closed', '已结束跟进']], lcState.customerHealthFilter)}</select>
        <select class="fid-select" id="fid-customer-country" aria-label="国家">${fidOption([['all', '请选择国家'], ['US', '美国'], ['PR', '波多黎各'], ['OTHER', '其他地区']], fid.customerCountry)}</select>
```

**Edit 2.11** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
    const rows = [['主账号', '联系人', '手机号', '客户等级', '客户状态', '跟进状态', '最近互动', '客户类型', '国家', '标签'],
      ...filteredCustomers().map(c => [account(c.account)?.name, c.name, c.phone, lcTier(c) || '未评级', lcCustomerStatusLabel(c), lcHealth(c).primary.label, c.last, c.clientType, country(c), c.tags.map(tag).filter(t => t && myTags().includes(t)).map(t => t.name).join('、')])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(r => r.map(safe).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
```

Replace them with:

```text
    const rows = [['主账号', '联系人', '手机号', '客户等级', '客户状态', '跟进状态', '最近互动', '客户类型', '国家', '标签'],
      ...filteredCustomers().map(c => [account(c.account)?.name, c.name, c.phone, lcTier(c) || '未评级', lcCustomerStatusLabel(c), lcHealth(c).primary?.label || '', c.last, c.clientType, country(c), c.tags.map(tag).filter(t => t && myTags().includes(t)).map(t => t.name).join('、')])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(r => r.map(safe).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
```

**Edit 2.12** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
    const closedCount = customers.filter(lcIsClosed).length;
    const chip = (id, label, glyph, tone) => {
```

Replace them with:

```text
    const closedCount = customers.filter(lcIsClosed).length;
    const plannedCount = customers.filter(c => lcHealth(c).planned).length;
    const chip = (id, label, glyph, tone) => {
```

**Edit 2.13** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <span style="font-size:12px;color:var(--color-text-muted)">跟进中：<b>${customers.length - closedCount}</b> · 已结束跟进：<b>${closedCount}</b></span>
          <a class="dash-link" href="#followups" data-nav="followups">进入跟进闭环中心${icon('ChevronRight')}</a>
```

Replace them with:

```text
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <span style="font-size:12px;color:var(--color-text-muted)">跟进中：<b>${plannedCount}</b> · 已结束跟进：<b>${closedCount}</b></span>
          <a class="dash-link" href="#followups" data-nav="followups">进入跟进闭环中心${icon('ChevronRight')}</a>
```

**Edit 2.14** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
        ${chip('overdue', '跟进已逾期', 'ClockAlert', 'is-hot')}
        ${chip('noplan', '跟进断档', 'TriangleAlert', 'is-alert')}
        ${chip('recontact', '复联待处理', 'Flame', 'is-hot')}
```

Replace them with:

```text
        ${chip('overdue', '跟进已逾期', 'ClockAlert', 'is-hot')}
        ${chip('recontact', '复联待处理', 'Flame', 'is-hot')}
```

**Edit 2.15** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
    const strip = `<div class="lc-chat-strip" aria-label="客户跟进协同栏">
      <button type="button" class="lc-pill lc-pill-link ${h.primary.tone}" data-action="lcTrackFollow" ${fidActionID(c.id)} title="${h.closed || h.nextTask ? '在跟进闭环中查看此客户' : '为此客户安排跟进'}">${icon(h.primary.icon)}${esc(h.primary.label)}</button>
      ${h.nextTask ? `<button type="button" class="lc-pill lc-pill-link info" data-action="lcTrackFollow" ${fidActionID(c.id)} title="在跟进闭环中查看此客户">${icon('CalendarClock')}下次跟进 ${esc(dateLabel(h.nextTask.due))}</button>` : ''}
```

Replace them with:

```text
    const strip = `<div class="lc-chat-strip" aria-label="客户跟进协同栏">
      ${h.primary ? `<button type="button" class="lc-pill lc-pill-link ${h.primary.tone}" data-action="lcTrackFollow" ${fidActionID(c.id)} title="在跟进闭环中查看此客户">${icon(h.primary.icon)}${esc(h.primary.label)}</button>` : ''}
      ${h.nextTask ? `<button type="button" class="lc-pill lc-pill-link info" data-action="lcTrackFollow" ${fidActionID(c.id)} title="在跟进闭环中查看此客户">${icon('CalendarClock')}下次跟进 ${esc(dateLabel(h.nextTask.due))}</button>` : ''}
```

**Edit 2.16** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
      render();
      toast(`客户 ${c.name} 已创建，尚未安排跟进。`);
    },
```

Replace them with:

```text
      render();
      toast(`客户 ${c.name} 已创建。`);
    },
```

**Edit 2.17** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
      };
      // Follow-up to-dos are made by hand only. A first message is noted in the customer's history; the customer
      // shows under the signal "客户待回复" until the message is read.
      if (c.needsFirstReply) {
```

Replace them with:

```text
      };
      // Follow-up to-dos are made by hand only. A first message is noted in the customer's history; nothing about
      // follow-ups shows for the customer until a person plans one.
      if (c.needsFirstReply) {
```

#### `build-fidelity.cjs`

**Edit 2.18** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
  title: '客户跟进闭环',
  question: '生命周期阶段与漏斗已暂缓。请评审跟进闭环是否够用：完成跟进时必须安排下一步或结束跟进；客户待回复、跟进已逾期、跟进断档、复联待处理四类信号；以自定义标签辅助筛选。',
  status: '待评审',
```

Replace them with:

```text
  title: '客户跟进闭环',
  question: '生命周期阶段与漏斗已暂缓。请评审跟进闭环是否够用：完成跟进时必须安排下一步或结束跟进；客户待回复、跟进已逾期、复联待处理三类提示，只出现在已由人安排或结束跟进的客户上；以自定义标签辅助筛选。',
  status: '待评审',
```

**Edit 2.19** — `work/wa-replica/build-fidelity.cjs`. Find exactly these lines (they occur once):

```text
  '每个标签包含一个名称并归属一个自建分组。客户可同时使用同组或不同组的多个标签。',
  '客户跟进状态只有「跟进中」与「已结束跟进」两种。跟进中的客户必须有下一条待办，否则提示跟进断档；结束跟进需填写原因并结清待办，客户再次来信时提示复联，可重新跟进并保留全部历史。',
  '标签完全自定义，用于筛选跟进队列，并可在完成或结束跟进时同步更新。',
```

Replace them with:

```text
  '每个标签包含一个名称并归属一个自建分组。客户可同时使用同组或不同组的多个标签。',
  '客户的跟进由人建立：由人安排了待办的客户为「跟进中」，由人结束的为「已结束跟进」，其余客户没有跟进状态，页面不显示任何跟进信息；结束跟进需填写原因并结清待办，客户再次来信时提示复联，可重新跟进并保留全部历史。',
  '标签完全自定义，用于筛选跟进队列，并可在完成或结束跟进时同步更新。',
```

#### `validate-scrm-lifecycle.cjs`

**Edit 2.20** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text

// 7. Invitation codes were removed from the prototype (2026-11-17): no wording, helper or filter field is left
```

Replace them with:

```text

// A customer has a follow-up status only where a person made one (an unfinished to-do, or a follow-up ended by
// hand). Nothing works out a status for the other customers, and the status "no to-do planned" is gone.
for (const gone of ['跟进断档', 'noPlan', "'noplan'", '尚未安排跟进', '立即补排跟进', "let primary = { key: 'healthy'"]) {
  assert(!moduleSource.includes(gone), `fidelity-lifecycle.js still works out a follow-up status for a customer nobody planned one for (${gone})`);
  assert(!appJs.includes(gone), `app.js still works out a follow-up status for a customer nobody planned one for (${gone})`);
}
for (const required of ['const planned = !closed && Boolean(nextTask);', 'const awaitingReply = planned && c.unread > 0;', "let primary = planned ? { key: 'healthy', label: '跟进正常', tone: 'ok', icon: 'BadgeCheck' } : null;", "${h.primary ? `<button type=\"button\" class=\"lc-pill lc-pill-link ${h.primary.tone}\" data-action=\"lcTrackFollow\"", "lcHealth(c).primary?.label || ''", 'const plannedCount = customers.filter(c => lcHealth(c).planned).length;']) {
  assert(moduleSource.includes(required), `fidelity-lifecycle.js is missing ${required}`);
}

// 7. Invitation codes were removed from the prototype (2026-11-17): no wording, helper or filter field is left
```

**Edit 2.21** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text
  engagementStates: ['open', 'closed'],
  attentionSignals: ['reply', 'overdue', 'noplan', 'recontact'],
  deferredModules: ['P-LIFECYCLE', 'P-PIPELINES', 'P-DEALS'],
```

Replace them with:

```text
  engagementStates: ['open', 'closed'],
  attentionSignals: ['reply', 'overdue', 'recontact'],
  deferredModules: ['P-LIFECYCLE', 'P-PIPELINES', 'P-DEALS'],
```

**Verify**: `sha256sum work/wa-replica/fidelity-lifecycle.js work/wa-replica/build-fidelity.cjs work/wa-replica/validate-scrm-lifecycle.cjs` → `23dcea7a797d7dcc48448fc27a43b19cace55a0baca67ea4a6206b87bd9bed14`, `93769241bd082c11739369b28fba33afd8b68e2cb6e400da2bfbbdb661c0f6e2`, `263e69f893d43da3a6ec4cc0976363bb48aeea1c5505c18ee84bd00cf4708263`; the syntax command → `SYNTAX_OK`; `git checkout 55229bd -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` → exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84`; `node work/wa-replica/validate-scrm-lifecycle.cjs` → `"status": "passed"`; the icon-set command → `removed= added=`; `sha256sum outputs/wa-replica-prototype/app.js outputs/wa-replica-prototype/requirements.json` → `59bf072a141b7edff035bd82a2821dee994140820ea034edadda28c5a93788e8`, `18e0f782e250255f08a902b349746570b3c2de6d6bf8465ecbeb1f22dae42a5b`; `git status --porcelain -- outputs/wa-replica-prototype/icons.js` shows no change of its content (see Step 3 if it is listed as staged). If a checksum does not match, restore the file with `git checkout 55229bd -- <file>` and apply its instructions again; if it still does not match, STOP.

### Step 3: README, product and design descriptions, build log, final verification

#### `README.md`

**Edit 3.1** — `README.md`. Find exactly these lines (they occur once):

```text

自 v0.8 起不再设置生命周期阶段、漏斗、流程配置与报价/订单台账（均已暂缓，实现保留在 Git 历史 v0.7）。系统只做一件事：**保证每位客户的跟进不断档**，并以**完全自定义的标签**辅助分类与筛选。

```

Replace them with:

```text

自 v0.8 起不再设置生命周期阶段、漏斗、流程配置与报价/订单台账（均已暂缓，实现保留在 Git 历史 v0.7）。系统只做一件事：**保证已安排的客户跟进不断档**，并以**完全自定义的标签**辅助分类与筛选。

```

**Edit 3.2** — `README.md`. Find exactly these lines (they occur once):

```text

- **两种跟进状态**：跟进中、已结束跟进。跟进中的客户必须有下一条待办，否则提示「跟进断档」。
- **待办只由人建立**：系统不自动生成跟进待办。待办来自「新建跟进任务」（填写事项与计划时间），或完成一次跟进时安排的下一步；待办队列中的每条待办都可以由本人删除（需确认，删除会记入操作日志）。新客户来信出现在「客户待回复」信号中；尚未安排跟进的客户提示「跟进断档」。
- **四种跟进状态提示**：客户待回复、跟进已逾期、跟进断档、复联待处理。它们由系统根据未读消息和待办时间得出，显示在客户列表（状态标签与筛选）、聊天界面和首页；跟进闭环中心只列出人工建立的待办及其到期、逾期提醒，不再设「待处理信号」视图。
- **标签为辅**：标签由用户自建；可按标签筛选跟进闭环中心，并在完成或结束跟进时同步更新客户标签。系统不预置、不自动打标。
```

Replace them with:

```text

- **跟进由人建立**：由人安排了待办的客户处于「跟进中」，由人结束的为「已结束跟进」。没有人安排过跟进的客户没有跟进状态：聊天界面、客户列表、客户档案、首页与导出文件都不显示关于它的任何跟进信息（状态、下次跟进时间、提示）。
- **待办只由人建立**：系统不自动生成跟进待办。待办来自「新建跟进任务」（填写事项与计划时间），或完成一次跟进时安排的下一步；待办队列中的每条待办都可以由本人删除（需确认，删除会记入操作日志）。新客户来信只体现为会话未读，不产生跟进信息。
- **三种跟进状态提示**：客户待回复、跟进已逾期、复联待处理（平常状态为「跟进正常」或「已结束跟进」）。它们只出现在已由人安排或结束跟进的客户上，由系统根据未读消息和待办时间得出，显示在客户列表（状态标签与筛选）、聊天界面和首页；跟进闭环中心只列出人工建立的待办及其到期、逾期提醒，不再设「待处理信号」视图。
- **标签为辅**：标签由用户自建；可按标签筛选跟进闭环中心，并在完成或结束跟进时同步更新客户标签。系统不预置、不自动打标。
```

**Edit 3.3** — `README.md`. Find exactly these lines (they occur once):

```text
| :--- | :--- | :--- |
| `#dashboard` | **首页经营概览** | 未读会话、待跟进、在线号码、客户总数、跟进闭环概览；四种跟进状态的数量，点击后打开按该状态筛选的客户列表 |
| `#followups` | **跟进闭环中心** | 跟进待办队列、已结束跟进、操作日志三视图（内容均由人工录入，系统只提示今日到期与已逾期）；按标签筛选；「完成并闭环」必须安排下一步或结束跟进 |
| `#inbox` | **WhatsApp API 在线聊天** | 通过 OpenWA 扫码绑定真实号码、接收消息与发送文本、掉线后重新连接、解除绑定；接收译文与草稿预览、聊天窗内嵌跟进协同条（跟进状态、下次跟进、标签、安排跟进）；可直接调整客户等级与客户状态；可将会话快照移入聊天记录；会话卡片直接显示客户标签，不显示跟进状态；点击协同条的跟进状态或下次跟进可跳转到跟进闭环并定位该客户 |
| `Drawer` | **客户 360° 档案** | 600px 宽屏抽屉：跟进状态与下次跟进、`画像与跟进 / 互动轨迹 / 订单追踪 / 沟通备注` 四栏、结束跟进与重新跟进、跨号接触防撞单提示 |
| `#customers` | **客户列表** | 多维组合检索；按客户等级、客户状态与跟进状态筛选；最近互动与标签集合；CSV 导出（含等级与状态） |
```

Replace them with:

```text
| :--- | :--- | :--- |
| `#dashboard` | **首页经营概览** | 未读会话、待跟进、在线号码、客户总数、跟进闭环概览；跟进中（有人工待办）与已结束跟进的客户数，三种跟进状态提示的数量，点击后打开按该状态筛选的客户列表 |
| `#followups` | **跟进闭环中心** | 跟进待办队列、已结束跟进、操作日志三视图（内容均由人工录入，系统只提示今日到期与已逾期）；按标签筛选；「完成并闭环」必须安排下一步或结束跟进 |
| `#inbox` | **WhatsApp API 在线聊天** | 通过 OpenWA 扫码绑定真实号码、接收消息与发送文本、掉线后重新连接、解除绑定；接收译文与草稿预览、聊天窗内嵌跟进协同条（跟进状态、下次跟进、标签、安排跟进）；可直接调整客户等级与客户状态；可将会话快照移入聊天记录；会话卡片直接显示客户标签，不显示跟进状态；点击协同条的跟进状态或下次跟进可跳转到跟进闭环并定位该客户 |
| `Drawer` | **客户 360° 档案** | 600px 宽屏抽屉：跟进状态与下次跟进（已安排或已结束跟进的客户才显示）、`画像与跟进 / 互动轨迹 / 订单追踪 / 沟通备注` 四栏、结束跟进与重新跟进、跨号接触防撞单提示 |
| `#customers` | **客户列表** | 多维组合检索；按客户等级、客户状态与跟进状态筛选；最近互动与标签集合；CSV 导出（含等级与状态） |
```

#### `PRODUCT.md`

**Edit 3.4** — `PRODUCT.md`. Find exactly these lines (they occur once):

```text

以 Facebook / Instagram 广告及转介绍进入 WhatsApp 私域为核心场景（初始地区覆盖美国与波多黎各，英语/西语双语接待，客户字段保持通用不绑定具体 SKU）。产品只保证一件事：**每位客户的跟进不断档**。

1. **进线即建待办**：客户首次来信或手动建档时自动建立首响待办。
2. **两种跟进状态**：跟进中、已结束跟进。跟进中的客户必须有下一条待办，否则提示「跟进断档」。
3. **完成即闭环**：完成一次跟进时必须二选一——安排下一次提醒，或填写原因结束跟进（同时结清该客户未完成的待办）。
4. **复联回流**：已结束跟进的客户再次来信时提示「复联待处理」，可重新跟进，保留全部历史。
5. **四类待处理信号**：客户待回复、跟进已逾期、跟进断档、复联待处理，在首页与跟进闭环中心集中处理。在聊天窗点击协同条上的跟进状态或下次跟进时间，可直接跳转到跟进闭环中心并定位到该客户对应的一行。
6. **标签为辅**：标签完全自定义；可按标签筛选跟进闭环中心，并在完成或结束跟进时同步更新。系统不预置、不自动打标。WhatsApp API 会话列表的客户卡片直接显示客户标签（最多三个，其余以 +N 表示），一眼可见客户状况。卡片上不显示跟进状态标记。
```

Replace them with:

```text

以 Facebook / Instagram 广告及转介绍进入 WhatsApp 私域为核心场景（初始地区覆盖美国与波多黎各，英语/西语双语接待，客户字段保持通用不绑定具体 SKU）。产品只保证一件事：**已安排的客户跟进不断档**。

1. **跟进由人建立**：系统不自动建立待办。客户首次来信或手动建档后，在有人为其安排跟进之前，页面不显示关于它的任何跟进信息。
2. **两种跟进状态**：由人安排了待办的客户为「跟进中」，由人结束的为「已结束跟进」；其余客户没有跟进状态。
3. **完成即闭环**：完成一次跟进时必须二选一——安排下一次提醒，或填写原因结束跟进（同时结清该客户未完成的待办）。
4. **复联回流**：已结束跟进的客户再次来信时提示「复联待处理」，可重新跟进，保留全部历史。
5. **三类跟进提示**：客户待回复、跟进已逾期、复联待处理，只出现在已由人安排或结束跟进的客户上；首页显示各自的数量，点击后打开按该状态筛选的客户列表。在聊天窗点击协同条上的跟进状态或下次跟进时间，可直接跳转到跟进闭环中心并定位到该客户对应的一行。
6. **标签为辅**：标签完全自定义；可按标签筛选跟进闭环中心，并在完成或结束跟进时同步更新。系统不预置、不自动打标。WhatsApp API 会话列表的客户卡片直接显示客户标签（最多三个，其余以 +N 表示），一眼可见客户状况。卡片上不显示跟进状态标记。
```

#### `DESIGN.md`

**Edit 3.5** — `DESIGN.md`. Find exactly these lines (they occur once):

```text

1. **跟进闭环中心（`#followups`）**：四个视图页签——「跟进待办队列」「待处理信号」「已结束跟进」「跟进与操作日志」；页签下方是「按标签筛选」条。待处理信号视图用筛选胶囊切换客户待回复、跟进已逾期、跟进断档、复联待处理。
2. **完成跟进闭环弹窗（`lc-complete-task`）**：记录跟进结果后必须在「继续跟进：安排下一次提醒」与「结束跟进」之间二选一；可在同一弹窗内折叠展开标签选择器同步更新客户标签。
3. **结束跟进弹窗（`lc-close-engagement`）**：必填结束原因，可同步更新标签；确认后结清该客户未完成待办。
4. **客户 360° 档案抽屉（`600px` 侧滑抽屉）**：顶部四个指标（当前跟进状态、下次跟进、最近互动、重新跟进次数），下设「画像与跟进」「互动轨迹」「订单追踪」「沟通备注」四栏。抽屉头部提供客户等级与客户状态两个下拉框，修改即保存。「订单追踪」栏自上而下为三块：首次联系（首次联系时间与进线渠道）、订单分区（每个订单号单独一块：默认折叠，只显示标题一行；标题左侧的订单号是展开/收起按钮（前置箭头：折叠时向右、展开时向下，带 aria-expanded），其后以浅色小字显示下单时间，再后是三段进度条（每段 16×6px，间距 3px；填充段数为订单已到达的最远一步，颜色取当前状态的标签色，异常为危险色，未填充段为边框色；悬停显示状态名称），右侧依次是物流按钮、「撤销上一步」与删除按钮；块内每到达一个物流状态有一条记录——状态标记与时间，从早到晚排列，第一条为「待发货」并带下单时间；各订单按下单时间从新到旧排列；没有订单时显示一块「订单与物流」空状态）、登记订单表单（订单号、下单时间）。登记订单表单不在滚动区内：它位于抽屉底部的页脚区（上边框分隔，内边距 12px 20px 16px），始终贴底；首次联系与订单分区在其上方的滚动区内滚动。抽屉内的提示条显示在页脚上方（与页脚保持 20px 间距），不遮挡表单。同一栏重新渲染时保持滚动位置，切换栏目时回到顶部。物流状态不设下拉框，由每笔订单右侧的两个按钮更新：推进按钮只显示下一步（待发货时为「标记已发货」，已发货时为「标记已签收」），异常按钮「标记异常」在签收前可用；已签收或异常的订单不再显示这两个按钮。每次点击都会在该订单的分区内新增一条记录，提示条提供「撤销」（撤销即移除这条记录）；删除订单同样可撤销。标题始终为一行两区：左侧标题区占满剩余宽度，内容过长时在区内换行；右侧图标区固定在右上角、不换行。展开状态只是界面状态，保存在内存中，不写入订单数据，刷新后恢复为折叠；图标按钮不改变展开状态。标题右侧的操作均为图标按钮（32px 见方），悬停显示名称，靠右排列且位置固定，依次为：推进（图标取下一状态的图标，强调色；待发货时提示「标记已发货」，已发货时提示「标记已签收」）、标记异常（警示三角，危险色）、撤销上一步（回转箭头）、删除订单（垃圾桶）。「撤销上一步」始终占位：随时移除最新一条记录并回到上一个状态，已签收与异常同样可撤回，撤回后按当前状态重新显示推进与异常图标；只剩第一条「待发货」记录时置灰不可点，提示「暂无可撤销的步骤」。已签收或异常的订单不显示推进与异常两个图标，其余图标位置不变。此前保存、没有物流记录的订单按当前状态补出对应记录，未记录的时间显示为「时间未记录」。互动轨迹的筛选新增「订单记录」。
5. **首页跟进闭环概览（`#dashboard`）**：显示跟进中与已结束跟进的客户数，四类信号胶囊点击直达跟进闭环中心对应筛选。
6. **WhatsApp 在线聊天联动（`#inbox`）**：会话列表的客户卡片不显示跟进状态，只以客户标签概括客户状况；聊天窗顶部协同条显示跟进状态、下次跟进时间与客户标签，并提供安排跟进（或重新跟进）、设置标签、模拟对方回复与打开档案。协同条内同样提供客户等级与客户状态两个下拉框；已评级客户在会话列表的姓名旁显示等级字母。协同条提供「移入聊天记录」，填写移入原因后把当前会话保存为快照。会话列表的每张客户卡片底部显示客户标签：单行不换行，最多三个，名称过长时截断，其余以「+N」表示，悬停可见全部；没有标签的客户不显示该行。协同条上的跟进状态与下次跟进时间是按钮：点击后跳转到跟进闭环中心并高亮该客户对应的一行——有未完成待办时为「跟进待办队列」中最近的一条待办，没有待办时为「待处理信号」中的该客户，已结束跟进时为「已结束跟进」中的该客户；若当前的标签筛选会隐藏该客户则先清除筛选；离开跟进闭环中心后取消高亮。
7. **客户列表（`#customers`）**：单一综合列表。搜索表单下方是「客户等级」「客户状态」两排带数量的筛选胶囊；表格新增等级、客户状态、最近互动三列，添加与更新时间合并为一列；导出包含等级与状态。
```

Replace them with:

```text

1. **跟进闭环中心（`#followups`）**：三个视图页签——「跟进待办队列」「已结束跟进」「跟进与操作日志」；页签下方是「按标签筛选」条。内容均由人工录入，系统只提示今日到期与已逾期。
2. **完成跟进闭环弹窗（`lc-complete-task`）**：记录跟进结果后必须在「继续跟进：安排下一次提醒」与「结束跟进」之间二选一；可在同一弹窗内折叠展开标签选择器同步更新客户标签。
3. **结束跟进弹窗（`lc-close-engagement`）**：必填结束原因，可同步更新标签；确认后结清该客户未完成待办。
4. **客户 360° 档案抽屉（`600px` 侧滑抽屉）**：顶部指标为最近互动；已由人安排或结束跟进的客户另有当前跟进状态、下次跟进、重新跟进次数三项（其余客户不显示任何跟进信息，「画像与跟进」栏内也没有跟进卡片）。下设「画像与跟进」「互动轨迹」「订单追踪」「沟通备注」四栏。抽屉头部提供客户等级与客户状态两个下拉框，修改即保存。「订单追踪」栏自上而下为三块：首次联系（首次联系时间与进线渠道）、订单分区（每个订单号单独一块：默认折叠，只显示标题一行；标题左侧的订单号是展开/收起按钮（前置箭头：折叠时向右、展开时向下，带 aria-expanded），其后以浅色小字显示下单时间，再后是三段进度条（每段 16×6px，间距 3px；填充段数为订单已到达的最远一步，颜色取当前状态的标签色，异常为危险色，未填充段为边框色；悬停显示状态名称），右侧依次是物流按钮、「撤销上一步」与删除按钮；块内每到达一个物流状态有一条记录——状态标记与时间，从早到晚排列，第一条为「待发货」并带下单时间；各订单按下单时间从新到旧排列；没有订单时显示一块「订单与物流」空状态）、登记订单表单（订单号、下单时间）。登记订单表单不在滚动区内：它位于抽屉底部的页脚区（上边框分隔，内边距 12px 20px 16px），始终贴底；首次联系与订单分区在其上方的滚动区内滚动。抽屉内的提示条显示在页脚上方（与页脚保持 20px 间距），不遮挡表单。同一栏重新渲染时保持滚动位置，切换栏目时回到顶部。物流状态不设下拉框，由每笔订单右侧的两个按钮更新：推进按钮只显示下一步（待发货时为「标记已发货」，已发货时为「标记已签收」），异常按钮「标记异常」在签收前可用；已签收或异常的订单不再显示这两个按钮。每次点击都会在该订单的分区内新增一条记录，提示条提供「撤销」（撤销即移除这条记录）；删除订单同样可撤销。标题始终为一行两区：左侧标题区占满剩余宽度，内容过长时在区内换行；右侧图标区固定在右上角、不换行。展开状态只是界面状态，保存在内存中，不写入订单数据，刷新后恢复为折叠；图标按钮不改变展开状态。标题右侧的操作均为图标按钮（32px 见方），悬停显示名称，靠右排列且位置固定，依次为：推进（图标取下一状态的图标，强调色；待发货时提示「标记已发货」，已发货时提示「标记已签收」）、标记异常（警示三角，危险色）、撤销上一步（回转箭头）、删除订单（垃圾桶）。「撤销上一步」始终占位：随时移除最新一条记录并回到上一个状态，已签收与异常同样可撤回，撤回后按当前状态重新显示推进与异常图标；只剩第一条「待发货」记录时置灰不可点，提示「暂无可撤销的步骤」。已签收或异常的订单不显示推进与异常两个图标，其余图标位置不变。此前保存、没有物流记录的订单按当前状态补出对应记录，未记录的时间显示为「时间未记录」。互动轨迹的筛选新增「订单记录」。
5. **首页跟进闭环概览（`#dashboard`）**：显示跟进中（有人工待办）与已结束跟进的客户数，三类提示胶囊（客户待回复、跟进已逾期、复联待处理）点击后打开按该状态筛选的客户列表。
6. **WhatsApp 在线聊天联动（`#inbox`）**：会话列表的客户卡片不显示跟进状态，只以客户标签概括客户状况；聊天窗顶部协同条显示客户标签，并提供安排跟进（或重新跟进）、设置标签与打开档案；已由人安排或结束跟进的客户另显示跟进状态与下次跟进时间，其余客户不显示。协同条内同样提供客户等级与客户状态两个下拉框；已评级客户在会话列表的姓名旁显示等级字母。协同条提供「移入聊天记录」，填写移入原因后把当前会话保存为快照。会话列表的每张客户卡片底部显示客户标签：单行不换行，最多三个，名称过长时截断，其余以「+N」表示，悬停可见全部；没有标签的客户不显示该行。协同条上的跟进状态与下次跟进时间是按钮：点击后跳转到跟进闭环中心并高亮该客户对应的一行——有未完成待办时为「跟进待办队列」中最近的一条待办，已结束跟进时为「已结束跟进」中的该客户；若当前的标签筛选会隐藏该客户则先清除筛选；离开跟进闭环中心后取消高亮。
7. **客户列表（`#customers`）**：单一综合列表。搜索表单下方是「客户等级」「客户状态」两排带数量的筛选胶囊；表格新增等级、客户状态、最近互动三列，添加与更新时间合并为一列；导出包含等级与状态。
```

#### `replica/build-log.md`

**Append 3.6** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 没有安排跟进的客户不显示跟进信息 · 2026-11-22

此前每位未结束跟进的客户都被视为「跟进中」：没有待办的客户在聊天界面、客户列表、首页和客户档案里显示「跟进断档」，有未读消息的显示「客户待回复」。从 WhatsApp 同步进来的客户因此几乎全部带着跟进状态。按项目负责人的要求：没有人为其建立跟进的客户，不显示任何跟进信息。

现在：只有由人安排了待办的客户（跟进中），和由人结束了跟进的客户（已结束跟进）才有跟进状态。其余客户——聊天界面协同条上没有状态标签，只保留「安排跟进」按钮；客户列表的「跟进状态 / 下次跟进」一栏显示「—」；客户档案顶部只显示「最近互动」，「画像与跟进」栏里不再有「跟进断档预警」卡片；导出文件的跟进状态一栏为空；首页「跟进中」只统计有人工待办的客户。「跟进断档」这一状态连同它的筛选项和首页数字一并取消；「客户待回复」「跟进已逾期」「复联待处理」保留，只出现在已安排或已结束跟进的客户上。未读消息仍然显示在会话列表、客户列表的「最近互动」一栏和首页的「未读会话」里。手动建档后的提示改为「客户 … 已创建。」。
```

Then verify everything once more:

```bash
git checkout 55229bd -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-039/smoke.sh
```

**Verify**: build exit 0; validator `"status": "passed"`; the test run ends with `pass 12`, `fail 0`; smoke ends with `SMOKE PASS`; `sha256sum README.md PRODUCT.md DESIGN.md replica/build-log.md` → `2d2d86ce7a4e7dc44a2da5950711f3709b47240eae13d3e5e0c1887c7b336470`, `0f86a21f97fff8de145136693ae5a3139af1983891a00d762197c58ed3c00d64`, `d721aaf6b39fb34a5ec062baf900e905496f98df782b23b695241bc07608b8dc`, `42fa9df8f46c24c9cb17e83828304423c9ded85683324d4f0a9172298f58bd60`; `git status --porcelain` lists exactly ten paths: `README.md`, `PRODUCT.md`, `DESIGN.md`, `replica/build-log.md`, the three source files under `work/wa-replica/`, and `outputs/wa-replica-prototype/app.js`, `requirements.json` and `validation.json` (if `outputs/wa-replica-prototype/icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the page module and the built page no longer contain the status "跟进断档", its key, the warning's button or the old notice; the status starts from "none" unless a to-do exists; waiting for a reply needs a to-do; the strip, the customer list and the export allow for a customer without a status; "跟进中" counts the customers with a to-do.
- **Smoke** (`/tmp/wa-scrm-plan-039/smoke.sh`) — the same facts on the built files, the three counts of the dashboard, the requirement texts, the three documents, the syntax of the module and the server tests (12 as before; no server change).
- The build and the validator do not run the page. **Verified by the reviewer in scripted browser sessions, not by you**: for a customer without a to-do — no label in the strip above the conversation while the button that plans a follow-up stays; "—" in the customer list; an empty cell in the export; one indicator ("最近互动") and no follow-up card in the file, and nothing there that ends a follow-up; no count for such customers on the dashboard and no entry in the filter. After a follow-up is planned by hand: "跟进正常" and the next date in the strip, four indicators and the card of the to-do in the file, the status in the list and the export, one more customer "跟进中" on the dashboard. A new lead with an unread message is not listed as waiting for a reply and shows its unread count with the last interaction. A customer with a to-do, and one whose follow-up was ended, show what they showed before. The sessions of the rest of the product and of the connection still pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 55229bd -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-039/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.js` → `23dcea7a797d7dcc48448fc27a43b19cace55a0baca67ea4a6206b87bd9bed14`
- [ ] `sha256sum work/wa-replica/build-fidelity.cjs` → `93769241bd082c11739369b28fba33afd8b68e2cb6e400da2bfbbdb661c0f6e2`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `263e69f893d43da3a6ec4cc0976363bb48aeea1c5505c18ee84bd00cf4708263`
- [ ] `sha256sum README.md` → `2d2d86ce7a4e7dc44a2da5950711f3709b47240eae13d3e5e0c1887c7b336470`
- [ ] `sha256sum PRODUCT.md` → `0f86a21f97fff8de145136693ae5a3139af1983891a00d762197c58ed3c00d64`
- [ ] `sha256sum DESIGN.md` → `d721aaf6b39fb34a5ec062baf900e905496f98df782b23b695241bc07608b8dc`
- [ ] `sha256sum replica/build-log.md` → `42fa9df8f46c24c9cb17e83828304423c9ded85683324d4f0a9172298f58bd60`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `59bf072a141b7edff035bd82a2821dee994140820ea034edadda28c5a93788e8`
- [ ] `sha256sum outputs/wa-replica-prototype/requirements.json` → `18e0f782e250255f08a902b349746570b3c2de6d6bf8465ecbeb1f22dae42a5b`
- [ ] the icon-set command prints `removed= added=`, and `git diff --quiet 55229bd -- outputs/wa-replica-prototype/icons.js` exits 0 (the icon file is unchanged)
- [ ] `git diff --name-only 55229bd..HEAD -- . ':!plans'` lists exactly these ten: `DESIGN.md`, `PRODUCT.md`, `README.md`, `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/requirements.json`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/build-fidelity.cjs`, `work/wa-replica/fidelity-lifecycle.js`, `work/wa-replica/validate-scrm-lifecycle.cjs`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build stops with an assertion, reports another number of icons than 84, a test fails, or the validator fails.
- An output file other than `app.js`, `requirements.json` and `validation.json` changes — in particular `icons.js`.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file.

## Maintenance notes

- **Deployment**: only page files change; no restart is needed after the merge. Open pages show the change at their next refresh. No stored data changes.
- `lcHealth(c).primary` can now be `null`. Every place that draws it must allow for that; the table of ended follow-ups is the one place that need not (those customers always have a status). A new place that shows a follow-up status must do the same — the build does not run the page, so only a browser shows a fault here.
- A customer is "in follow-up" (`planned`) while an unfinished to-do exists for them, whoever made it. Nothing may work out a status, a count or a reminder for a customer without one: follow-up information exists only where a person made a follow-up (owner decisions of 2026-11-22, plans 031, 035, 036 and this one).
- What a reviewer should scrutinise: that no page crashes on a customer without a status (the customer list, the export, the conversation, the customer's file), and that customers with a to-do or an ended follow-up show exactly what they showed before.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
