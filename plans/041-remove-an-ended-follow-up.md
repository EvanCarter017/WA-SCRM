# Plan 041: A follow-up that was ended by hand can be removed by hand

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 58b165a..HEAD -- work/wa-replica replica/build-log.md outputs README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes under `plans/` only are expected and fine.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (one button and two actions beside the ones that delete a to-do; exact text and checksums for every edit)
- **Depends on**: plans/040-conversation-list-keeps-its-place.md (DONE)
- **Category**: feature (owner decision)
- **Planned at**: commit `58b165a`, 2026-11-22

## Why this matters

Since plan 039 a customer shows follow-up information only where a person made a follow-up: an unfinished to-do, or a follow-up ended by hand. A to-do can be deleted by hand (plan 036). An ended follow-up could not: once a follow-up was ended, the customer stayed in the list "已结束跟进" and kept the label "已结束跟进" in the conversation, the customer list and the customer's file. The only way out was "重新跟进", which makes a new to-do.

The owner, 2026-11-22: "There is no manual option to remove items from the 'Follow-up' list." Asked which list — to-dos already have the bin, the list without one is "已结束跟进" (two customers on the owner's data) — the owner answered: "It seems the 'Follow-up has ended.' content cannot be removed."

What this plan does: every row of the list "已结束跟进" in the follow-up centre gets a remove button (a bin, like a to-do's). A click asks for a confirmation; confirmed, the customer leaves the list and shows no follow-up information again, exactly like a customer nobody ever planned a follow-up for. The removal is written to the customer's history.

### Decisions already made (do not re-open; do not ask)

- The button is in the list of ended follow-ups, where these records are kept — the same place and form as the button that deletes a to-do. (The label "已结束跟进" above a conversation already leads to that list, on the customer's row.)
- Removing clears what the ending left on the customer: the state goes back to open and the reason and the date of the ending are taken off. The count of resumed follow-ups and the unread count are left alone. To-dos that were finished stay among the finished to-dos, where each can be deleted.
- Whoever can see the customer can remove the ended follow-up — the same rule as for resuming it.
- The texts, names and numbers in this plan are final.

## Current state

### What this repository is

A zero-dependency web app for an internal WhatsApp customer workbench: plain HTML/CSS/JS in the browser and a small Node server (Node 22.13 or newer). There is no package.json. Documentation text is Simplified Chinese; code, comments and commit messages are English.

### The files this plan changes

| File | sha256 at the planned commit | sha256 after this plan |
|---|---|---|
| `work/wa-replica/fidelity-lifecycle.js` | `62bd3369424338d26b879182162b04aa88f77c4260f827a8232d1219ad7d5f12` | `c7a4f822bdff2df33a278c5f74afd553e8bf8fabe5bb11c8dc3abb37868c0c86` |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | `84f44a7327a300250fdb203e59e7c34e1d7ac1e6b9ba2b447ec7928411cabc4c` | `4aee3ca6e5fddd9a576b653097dffd07241424b300c7b74875285880d3de3db7` |
| `README.md` | `6f453eea74f3c45d2f3c3550f17423fdacee96e75e06eefef243ea7a40fbb936` | `a64cbc43e09fabc78674dc1b1c29f1938ef101a59931b4f667327dfd946540f2` |

- `fidelity-lifecycle.js` — the page module of customers and follow-ups. `renderFollowups` draws the follow-up centre; its view `closed` lists the customers whose follow-up was ended (`lcIsClosed(c)`, i.e. `c.engagement === 'closed'`, with `c.closedReason` and `c.closedAt`) in the table `lc-closed-table`, each row with the buttons "重新跟进" and "去聊天". The actions of the page's buttons are the entries of one object; `lcTaskDelete` and `lcTaskDeleteDo` delete a to-do after a confirmation made with `fidConfirm(title, text, action, id)`. `fidIcon(label, action, glyph, id)` makes a button that shows an icon; `lcLog(customerId, category, text)` adds a line to a customer's history; `myCustomers()` are the customers the signed-in person may see.
- `validate-scrm-lifecycle.cjs` — asserts facts about the sources and the built page; one block is added.
- `README.md` describes the follow-ups; `replica/build-log.md` gets an entry.

### How the build works

`work/wa-replica/build-fidelity.cjs` writes `outputs/wa-replica-prototype/*`. Outputs are committed and must be regenerated by running the build, never edited by hand. The build takes its icons from the committed `outputs/wa-replica-prototype/icons.js`: **restore that file from git before every build** (command below).

## Commands you will need

Run from the repository root (inside your worktree).

**The tests and the smoke script need Node 22.13 or newer.** Run `node --version`. If it prints an older version, set `NODE` to the full path of a newer binary on the machine (for example `~/.local/node/bin/node`); otherwise set `NODE=node`. If the machine has none, STOP.

| Purpose | Command | Expected on success |
|---|---|---|
| Restore icon pool (before **every** build) | `git checkout 58b165a -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` | exit 0; prints JSON with `"version": "0.8-scrm-engagement"` and `"icons": 84` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | exit 0; prints JSON with `"status": "passed"` |
| Syntax of the page module | `node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/fidelity-lifecycle.js','utf8')+'})');console.log('SYNTAX_OK')"` | `SYNTAX_OK` |
| Sign-in and data tests | `$NODE --test work/wa-replica/site-api.test.cjs` | `pass 12`, `fail 0` |
| Smoke | `NODE=$NODE bash /tmp/wa-scrm-plan-041/smoke.sh` (script from Step 1; run from inside the repo) | last line `SMOKE PASS` |

## Scope

**In scope** (the only files you may modify):

- `work/wa-replica/fidelity-lifecycle.js`, `work/wa-replica/validate-scrm-lifecycle.cjs`, `README.md`, `replica/build-log.md` (Step 2)
- Build outputs, **only by running the build/validator**: `outputs/wa-replica-prototype/{app.js,validation.json}` (the other output files, `icons.js` among them, must come out unchanged)

**Out of scope** (do NOT touch): every other file, in particular the server files, the other page modules, the style sheets, everything under `fidelity-base/`, `plans/**`, earlier entries of `replica/build-log.md`.

## Git workflow

- Work on the branch your worktree is already on. If (and only if) you find yourself on `main`, create and switch to `advisor/041-remove-an-ended-follow-up` first.
- One commit is fine. Conventional commit message, e.g. `feat(scrm): an ended follow-up can be removed by hand`.
- Do NOT push, merge, rebase onto main, or open a PR.

## Steps

How to read the instructions: an **Edit** gives lines to find (together they occur exactly once in the named file) and the lines that replace them; the first and last lines of both blocks are usually unchanged lines that only show where the change is. An **Append** adds text at the end of a file. The fenced blocks contain the text only — the fence lines are not part of it. Copy every block character for character; the most reliable way is a small script (kept outside the repository) that reads this plan file and takes the lines strictly between the opening fence after an instruction and its closing fence. Apply the instructions of a file in the order given. Before each Edit, confirm that the text to find occurs exactly once. The checksums of the table in "Current state" tell you whether the three files are exactly right.

### Step 1: Create the smoke script (outside the repo) and record the baseline

Save this script at the fixed path `/tmp/wa-scrm-plan-041/smoke.sh` (outside the repository; always call it by this literal path, from inside the repository). If your shell rejects heredocs, write the same content with your file-writing tool and then `chmod +x` it.

```bash
mkdir -p /tmp/wa-scrm-plan-041 && cat > /tmp/wa-scrm-plan-041/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Checks that a follow-up that was ended by hand can be removed by hand.
# NODE must be Node 22.13 or newer.
set -u
ROOT=$(git rev-parse --show-toplevel); FAIL=0; NODE=${NODE:-node}; W="$ROOT/work/wa-replica"; P="$ROOT/outputs/wa-replica-prototype"
same() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "MISS $1 (got: $2)"; FAIL=1; }; }
has() { grep -qF -- "$3" "$2" && echo "ok   $1" || { echo "MISS $1"; FAIL=1; }; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" && echo "ok   Node $("$NODE" --version) is new enough" || { echo "MISS Node 22.13 or newer is needed, got $("$NODE" --version)"; FAIL=1; }
has 'every ended follow-up has the button that removes it' "$P/app.js" "'lcClosedRemove', 'Trash2', c.id)}"
has 'the removal asks first' "$P/app.js" "'lcClosedRemoveDo', id);"
has 'nothing of the ended follow-up is left on the customer' "$P/app.js" 'delete c.closedReason;'
has 'the removal is said in a notice' "$P/app.js" "toast('已移除，该客户不再显示跟进信息。');"
has 'the README says it' "$ROOT/README.md" '已结束的跟进可以由人从「已结束跟进」列表中移除'
has 'the build log has the entry' "$ROOT/replica/build-log.md" '## 已结束的跟进可以手动移除'
same 'the page module passes the syntax check' "$(cd "$ROOT" && node -e "new (require('vm').Script)('(async()=>{'+require('fs').readFileSync('work/wa-replica/fidelity-lifecycle.js','utf8')+'})');console.log('SYNTAX_OK')" 2>&1)" SYNTAX_OK
same 'the sign-in and data tests pass' "$("$NODE" --test "$W/site-api.test.cjs" 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')" 'ℹ pass 12 ℹ fail 0 '
[ "$FAIL" = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
EOF
chmod +x /tmp/wa-scrm-plan-041/smoke.sh && ls -l /tmp/wa-scrm-plan-041/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-lifecycle.js work/wa-replica/validate-scrm-lifecycle.cjs README.md` → the "at the planned commit" values of the table in "Current state", in that order; `NODE=$NODE bash /tmp/wa-scrm-plan-041/smoke.sh; git status --porcelain` → exactly these checks are printed with `MISS`, so the run ends with `SMOKE FAIL` (expected at this point): `every ended follow-up has the button that removes it`, `the removal asks first`, `nothing of the ended follow-up is left on the customer`, `the removal is said in a notice`, `the README says it` and `the build log has the entry` (six checks); every other check is printed with `ok`; `git status --porcelain` prints **nothing**. If another check fails, a checksum differs, or `git status` shows changes, STOP.

### Step 2: The button, its actions, the check and the documents; final verification

#### `fidelity-lifecycle.js`

**Edit 2.1** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
            ${fidButton('去聊天', 'openConversation', 'MessageCircle', 'slim', fidActionID(c.id))}
          </div></td>
```

Replace them with:

```text
            ${fidButton('去聊天', 'openConversation', 'MessageCircle', 'slim', fidActionID(c.id))}
            ${fidIcon('移除已结束的跟进：' + c.name, 'lcClosedRemove', 'Trash2', c.id)}
          </div></td>
```

**Edit 2.2** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
      }).join('');
      return page('已结束跟进的客户不再产生提醒；客户再次来信时会提示「复联待处理」，可随时重新跟进并保留全部历史。', `${tagBar}
        <div class="fid-table-card">${fidTable('lc-closed-table', ['客户', '结束原因', '标签', '当前信号', '重新跟进次数', '操作'], rows, '暂无已结束跟进的客户', true, 'Archive')}</div>`);
```

Replace them with:

```text
      }).join('');
      return page('已结束跟进的客户不再产生提醒；客户再次来信时会提示「复联待处理」，可随时重新跟进并保留全部历史。不再需要的记录可以移除。', `${tagBar}
        <div class="fid-table-card">${fidTable('lc-closed-table', ['客户', '结束原因', '标签', '当前信号', '重新跟进次数', '操作'], rows, '暂无已结束跟进的客户', true, 'Archive')}</div>`);
```

**Edit 2.3** — `work/wa-replica/fidelity-lifecycle.js`. Find exactly these lines (they occur once):

```text
    },
    followup: id => openFollowup(id),
```

Replace them with:

```text
    },
    // A follow-up that was ended by hand is removed by hand, after a confirmation: the customer leaves the list of
    // ended follow-ups and shows no follow-up information again, as if none had been made. To-dos that were
    // finished stay among the finished to-dos, and the removal is noted in the customer's history.
    lcClosedRemove: id => {
      const c = customer(id);
      if (!c || !lcIsClosed(c) || !myCustomers().includes(c)) return;
      fidConfirm('移除已结束的跟进', `把 ${c.name} 从「已结束跟进」中移除？移除后该客户不再显示跟进信息，之后仍可重新安排跟进。`, 'lcClosedRemoveDo', id);
    },
    lcClosedRemoveDo: id => {
      const c = customer(id);
      if (!c || !lcIsClosed(c) || !myCustomers().includes(c)) return;
      const reason = c.closedReason;
      c.engagement = 'open';
      delete c.closedReason;
      delete c.closedAt;
      lcLog(c.id, 'followup', `移除已结束的跟进${reason ? `（结束原因：${reason}）` : ''}`);
      persist();
      close();
      render();
      toast('已移除，该客户不再显示跟进信息。');
    },
    followup: id => openFollowup(id),
```

#### `validate-scrm-lifecycle.cjs`

**Edit 2.4** — `work/wa-replica/validate-scrm-lifecycle.cjs`. Find exactly these lines (they occur once):

```text

// A customer has a follow-up status only where a person made one (an unfinished to-do, or a follow-up ended by
```

Replace them with:

```text

// A follow-up that was ended by hand can be removed by hand from the list of ended follow-ups.
for (const required of ["${fidIcon('移除已结束的跟进：' + c.name, 'lcClosedRemove', 'Trash2', c.id)}", "'lcClosedRemoveDo', id);", "c.engagement = 'open';\n      delete c.closedReason;\n      delete c.closedAt;", "toast('已移除，该客户不再显示跟进信息。');"]) {
  assert(moduleSource.includes(required), `fidelity-lifecycle.js is missing ${required}`);
}

// A customer has a follow-up status only where a person made one (an unfinished to-do, or a follow-up ended by
```

#### `README.md`

**Edit 2.5** — `README.md`. Find exactly these lines (they occur once):

```text

- **跟进由人建立**：由人安排了待办的客户处于「跟进中」，由人结束的为「已结束跟进」。没有人安排过跟进的客户没有跟进状态：聊天界面、客户列表、客户档案、首页与导出文件都不显示关于它的任何跟进信息（状态、下次跟进时间、提示）。
- **待办只由人建立**：系统不自动生成跟进待办。待办来自「新建跟进任务」（填写事项与计划时间），或完成一次跟进时安排的下一步；待办队列中的每条待办都可以由本人删除（需确认，删除会记入操作日志）。新客户来信只体现为会话未读，不产生跟进信息。
```

Replace them with:

```text

- **跟进由人建立**：由人安排了待办的客户处于「跟进中」，由人结束的为「已结束跟进」；已结束的跟进可以由人从「已结束跟进」列表中移除（需确认，移除会记入操作日志），移除后该客户不再显示跟进信息。没有人安排过跟进的客户没有跟进状态：聊天界面、客户列表、客户档案、首页与导出文件都不显示关于它的任何跟进信息（状态、下次跟进时间、提示）。
- **待办只由人建立**：系统不自动生成跟进待办。待办来自「新建跟进任务」（填写事项与计划时间），或完成一次跟进时安排的下一步；待办队列中的每条待办都可以由本人删除（需确认，删除会记入操作日志）。新客户来信只体现为会话未读，不产生跟进信息。
```

#### `replica/build-log.md`

**Append 2.6** — `replica/build-log.md`. Add at the end of the file, after one empty line:

```text
## 已结束的跟进可以手动移除 · 2026-11-22

此前客户一旦「结束跟进」，就一直留在「已结束跟进」列表里，并在聊天界面、客户列表和客户档案中显示「已结束跟进」，只能通过「重新跟进」（新建一条待办）改变，无法移除。按项目负责人的要求：由人结束的跟进，也要能由人移除。

现在：跟进闭环中心「已结束跟进」列表的每一行新增「移除」按钮（垃圾桶图标）。点击后先确认；确认后该客户从列表中移除，不再显示任何跟进信息（与从未安排过跟进的客户相同），操作记入客户的互动轨迹。此前已完成的待办仍保留在「已完成」里，可逐条删除；之后可以随时为该客户重新安排跟进。
```

Then build and verify:

```bash
git checkout 58b165a -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs && node work/wa-replica/validate-scrm-lifecycle.cjs && $NODE --test work/wa-replica/site-api.test.cjs && NODE=$NODE bash /tmp/wa-scrm-plan-041/smoke.sh
```

**Verify**: `sha256sum work/wa-replica/fidelity-lifecycle.js work/wa-replica/validate-scrm-lifecycle.cjs README.md replica/build-log.md outputs/wa-replica-prototype/app.js` → `c7a4f822bdff2df33a278c5f74afd553e8bf8fabe5bb11c8dc3abb37868c0c86`, `4aee3ca6e5fddd9a576b653097dffd07241424b300c7b74875285880d3de3db7`, `a64cbc43e09fabc78674dc1b1c29f1938ef101a59931b4f667327dfd946540f2`, `00c474ee7eb183008201e14b83c81bd100ff1e6fd2332c596bcbff4f35816711`, `e0900e3bea70d57bf2e5b9dba620419da8a24c4cc6fe92c4b31e30894d21d007`; the syntax command → `SYNTAX_OK`; build exit 0 with `"version": "0.8-scrm-engagement"` and `"icons": 84`; validator `"status": "passed"`; the test run ends with `pass 12`, `fail 0`; smoke ends with `SMOKE PASS`; `git status --porcelain` lists exactly six paths: `README.md`, `replica/build-log.md`, the two source files under `work/wa-replica/`, and `outputs/wa-replica-prototype/app.js` and `validation.json` (if `outputs/wa-replica-prototype/icons.js` is listed as staged only because of the restore command, run `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js`; its content must equal the committed one). If a checksum does not match, restore the file with `git checkout 58b165a -- <file>` and apply its instructions again; if it still does not match, STOP. Commit everything. After the commit `git status --porcelain` must be empty.

## Test plan

- **Validator** — the list of ended follow-ups has the button, the removal asks first, clears the state, the reason and the date, and says so in a notice.
- **Smoke** (`/tmp/wa-scrm-plan-041/smoke.sh`) — the same facts on the built page, the README, the build log, the syntax of the module and the server tests (12 as before; no server change).
- The build and the validator do not run the page. **Verified by the reviewer in scripted browser sessions, not by you**: every row of the list has the button; a click asks first; cancelled, the customer is unchanged; confirmed, the customer has left the list, nothing of the ending is left on the customer, the history has the line with the reason, finished to-dos stay and no to-do was made, the change reaches the server; the dashboard counts one ended follow-up less; the customer list shows "—", the conversation has no follow-up label and its button plans a follow-up instead of resuming one, the file shows no follow-up indicators; a follow-up can be planned again and is not counted as a resumed one. The sessions of the rest of the product and of the connection still pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git checkout 58b165a -- outputs/wa-replica-prototype/icons.js && node work/wa-replica/build-fidelity.cjs` exits 0 and prints `"version": "0.8-scrm-engagement"` and `"icons": 84`
- [ ] `node work/wa-replica/validate-scrm-lifecycle.cjs` exits 0 and prints `"status": "passed"`
- [ ] `$NODE --test work/wa-replica/site-api.test.cjs` → `pass 12`, `fail 0`
- [ ] `NODE=$NODE bash /tmp/wa-scrm-plan-041/smoke.sh` ends with `SMOKE PASS`
- [ ] `sha256sum work/wa-replica/fidelity-lifecycle.js` → `c7a4f822bdff2df33a278c5f74afd553e8bf8fabe5bb11c8dc3abb37868c0c86`
- [ ] `sha256sum work/wa-replica/validate-scrm-lifecycle.cjs` → `4aee3ca6e5fddd9a576b653097dffd07241424b300c7b74875285880d3de3db7`
- [ ] `sha256sum README.md` → `a64cbc43e09fabc78674dc1b1c29f1938ef101a59931b4f667327dfd946540f2`
- [ ] `sha256sum replica/build-log.md` → `00c474ee7eb183008201e14b83c81bd100ff1e6fd2332c596bcbff4f35816711`
- [ ] `sha256sum outputs/wa-replica-prototype/app.js` → `e0900e3bea70d57bf2e5b9dba620419da8a24c4cc6fe92c4b31e30894d21d007`
- [ ] `git diff --quiet 58b165a -- outputs/wa-replica-prototype/icons.js` exits 0 (the icon file is unchanged)
- [ ] `git diff --name-only 58b165a..HEAD -- . ':!plans'` lists exactly these six: `README.md`, `outputs/wa-replica-prototype/app.js`, `outputs/wa-replica-prototype/validation.json`, `replica/build-log.md`, `work/wa-replica/fidelity-lifecycle.js`, `work/wa-replica/validate-scrm-lifecycle.cjs`
- [ ] `git status --porcelain` is empty after your final commit
- [ ] `plans/README.md` status row updated (skip if a reviewer dispatched you and said they maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's baseline check fails (a failing check other than the named ones, a different checksum).
- The lines to find do not occur exactly once in their file.
- A checksum does not match after you have restored the file and applied its instructions a second time.
- The build stops with an assertion, reports another number of icons than 84, a test fails, or the validator fails.
- An output file other than `app.js` and `validation.json` changes.
- No Node 22.13 or newer exists on the machine.
- The work appears to require editing an out-of-scope file.

## Maintenance notes

- **Deployment**: only page files change; no restart is needed after the merge. Open pages get the button at their next refresh. No stored data changes until someone removes an ended follow-up.
- Everything in the follow-up area can now be made and removed by hand: a to-do (036), an ended follow-up (this plan). Nothing there is made by the system (031, 035, 039).
- What a reviewer should scrutinise: that a removed customer shows no follow-up information anywhere, and that a cancelled confirmation changes nothing.
- `validation.json`: re-run the validator once in the main checkout after merging from a worktree.
