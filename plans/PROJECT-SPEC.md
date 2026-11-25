# WA-SCRM — Project Specification for AI Agents

> **What this is.** A dense, verified description of the WA-SCRM system for an AI agent that has to understand, change, review or extend it. It states how the system works today, what must stay true, how to build and verify it, and which weak spots a deep audit found.
>
> **Stamp.** Written against commit `17da196` on `main`, 2026-11-25, with the *improve — deep* framework: recon by the advisor, an audit by eight parallel read-only agents (correctness ×2, security, performance, tests, architecture + dependencies, tooling + docs, direction), then every ranked finding in section 11 (the table and its details) re-checked against the code by the advisor; the short list in 11.4 is given as the agents reported it. Facts in sections 1–10 come from the advisor's own reading of the code.
>
> **Updated** 2026-11-25 after plans 072–075 (merged and live at commit `2de0a82`; the owner chose findings 1, 3, 4 and 5 of the audit's top five, not 2): findings #1, #3, #4 (its start half) and #5 are fixed and marked so in section 11; sections 4.2, 4.4 and 10 describe the new behaviour.
>
> **How to read it.** Sections 1–3 for orientation; 4–7 before touching code in that area; 8–10 before any change at all; 11 before planning work. Where this document and the code disagree, **the code wins** — record the drift (it is a finding).
>
> **What it deliberately leaves out.** Live machine addresses, workspace and account names, keys, settings files and any customer data. The repository is public and changes under `plans/` are published automatically; never add such things here.

---

## 1. Product

**WA-SCRM** (UI name *WA Desk SCRM · WhatsApp 客户跟进闭环工作台*) is an internal web workbench for a small sales team that serves customers over WhatsApp. Each employee ("聊手", chat agent) has a **workspace** (子站, sub-site) bound to their own WhatsApp number; a supervisor sees all workspaces read-only.

**The one promise** (PRODUCT.md): *a follow-up that a person scheduled never lapses.*

Core capabilities, as built:

| Area | What it does |
|---|---|
| WhatsApp chat (`#inbox`, 在线聊天) | Real WhatsApp messages through a self-hosted bridge (OpenWA): receive, send text and files, media (pictures, voice, video, documents), delivery ticks, retries, history catch-up, profile pictures, pinned chats, customer per chat. |
| Follow-up loop (`#followups`, 跟进闭环) | To-dos (待办) created **by hand only**; completing one forces a choice: schedule the next or end the follow-up with a reason; a customer who writes again after "ended" resurfaces (复联待处理). Three prompts: awaiting reply, overdue, re-contact. |
| Customers (`#customers`) | List with grade (S/A/B/C/D) and status (已成交 / 弃单 / 自然线索), filters, export; 360° profile drawer with tabs (profile & follow-up, activity, **order tracking** with shipping steps and undo, notes). |
| Tags | Fully user-defined tag groups; no presets, no automatic tagging; tag statistics page. |
| Chat records (`#chat-records`, 聊天记录) | Snapshots of a conversation moved in by hand with a reason, for review; no ratings. |
| AI (`#ai`, AI 能力) | Through a server relay only (keys never reach the browser): **translate incoming messages once** and keep them; **translate a reply before sending** (Enter or a configurable shortcut shows the translation, the next press sends it; a "send guard" stops untranslated replies); **translate a sent reply back** into the reading language; **voice note to text** on click. Per-capability switches and usage records. |
| Price list (`#prices`, 价格表) | Upload an .xlsx/.csv price list (parsed in the browser), one currency for the list, a "报价" (quote) button beside the message box; can be removed for good. |
| Supervisor page | Employee list, per-workspace read-only customers and chats, account management (create, reset, disable, remove). |
| Emoji | The page ships Noto Color Emoji (11 WOFF2 parts) so every emoji renders on any computer. |

**Deferred by the owner (do not build unasked):** lifecycle stages / funnel / pipeline configuration; quotes, LTV and repurchase reminders; follow-up task types; group messaging and auto-reply; materials management beyond a hidden page (素材管理). The v0.7 implementation of the deferred items is in git history (`53b0bff`).

**Roles:** `agent` (one workspace, reads and writes it), `supervisor` and `admin` (read every workspace; manage accounts; admins also manage supervisors).

---

## 2. Architecture

```
 browser ──HTTP──▶ gateway (nginx 1.27, port 8141)
                      │  /api/auth/*, /api/ai/*, /, static files ─────────▶ master  (serve.cjs, site "master")
                      │  /api/data, /api/wa/* with cookie scrm_site=<id> ─▶ wa-scrm-site-<id> (serve.cjs)
                      │  /site/<id>/api/(data|wa/*) (supervisor page) ────▶ wa-scrm-site-<id>
                      ✕  /api/wa/hook and /site/<id>/api/wa/hook are refused at the gateway
 master ──secret──▶ provisioner (site-provisioner.cjs, Docker Engine API via the socket)
 wa-scrm-site-<id> ◀──webhook (HMAC)── wa-scrm-openwa-<id> (OpenWA 0.31.0, whatsapp-web.js engine)
 wa-scrm-site-<id> ──REST──▶ wa-scrm-openwa-<id>
 master ──HTTPS──▶ model service (OpenAI-compatible or Gemini) for translation / reply / voice
```

- **One process type.** Every server container runs `node work/wa-replica/serve.cjs 8080`. With `WA_SCRM_DATA_DIR` set it serves the page, the account/session/data API (`site-api.cjs`), the WhatsApp link (`openwa-link.cjs`) and the AI relay (`ai-relay.cjs`); without it, only the page and the relay.
- **Master** (`WA_SCRM_SITE_ID=master`) handles sign-in for everyone, the supervisor page's account actions, the AI relay, and talks to the **provisioner**, which alone holds the Docker socket and creates/starts/stops/removes a workspace's two containers.
- **Per workspace:** `wa-scrm-site-<id>` (its server) and `wa-scrm-openwa-<id>` (its WhatsApp bridge, a named volume `wa-scrm-openwa-<id>` keeps the WhatsApp session).
- **Shared data folder** (host path mounted at `/data` in the master and **every** workspace server): `auth.db`, `site-<id>.db`, `wa-<id>.db`, `ai-translations.db`, `openwa-<id>.env`, `wa-media-<id>/`.
- **Routing rule:** the gateway sends a request to the workspace its `scrm_site` cookie names (set at sign-in), or that `/site/<id>/…` names; every server still checks the session itself.
- **Plain HTTP** by owner decision (`WA_SCRM_COOKIE_SECURE` exists for a TLS front later).
- **Workspace cap:** `WA_SCRM_MAX_SITES` (code default 4; set per machine).

---

## 3. Repository map

| Path | What | Edit? |
|---|---|---|
| `work/wa-replica/fidelity-*.js` | Browser modules (sources). | Yes, via plans. |
| `work/wa-replica/fidelity-base/` | Historical base app (`app.js`, CSS, `index.html`) that the build patches. | Avoid; the build patches it by text. |
| `work/wa-replica/build-fidelity.cjs` | Zero-dependency build: patches the base, concatenates modules, writes `outputs/wa-replica-prototype/*`. | Yes, carefully. |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | Validator: about 200 assertions on sources and built files; writes `validation.json`. | Yes, with every change. |
| `work/wa-replica/serve.cjs` | The server entry (static files, routing to the APIs). | Yes. |
| `work/wa-replica/site-api.cjs`, `site-auth.cjs`, `site-data.cjs` | Accounts, sessions, versioned document store. | Yes. |
| `work/wa-replica/openwa-link.cjs` | WhatsApp bridge link (webhook, event store, feed, sends, media, sync). | Yes. |
| `work/wa-replica/ai-relay.cjs` | AI relay (translate, reply, voice), translation store. | Yes. |
| `work/wa-replica/site-provisioner.cjs` | Container lifecycle through the Docker Engine API. | Yes. |
| `work/wa-replica/site-admin.cjs` | CLI: accounts, data export/import (runs on the server). | Yes. |
| `work/wa-replica/*.test.cjs` | `node:test` suites (relay 17, site API 20, OpenWA link 23, provisioner 13, price file 17). | Yes. |
| `work/wa-replica/*.env.example` | Setting templates (no values). | Keep in sync with code. |
| `work/wa-replica/fonts/` | Noto Color Emoji parts + OFL licence (binary, from Google Fonts v50). | Only by a plan with checksums. |
| `outputs/wa-replica-prototype/` | **Built** page files, committed: `index.html`, `app.js`, `app.css`, `components.css`, `tokens.css`, `boot.js`, `master.js`, `pricefile.js`, `icons.js`, `fonts/`, `validation.json`, `requirements.json`. Served to browsers. | **Never by hand** — run the build/validator. |
| `deploy/` | `Dockerfile` (node:24-slim, pinned), `compose.yml` (gateway, master, provisioner), `gateway.conf`, `upgrade.sh`, `platform.env.template`. | Yes, via plans. |
| `plans/` | Implementation plans `NNN-*.md`, index `README.md` (status, owner requests and decisions), this spec. | Advisor only. |
| `replica/build-log.md` | Change log in Chinese, one entry per plan. | Append per plan. |
| `README.md`, `PRODUCT.md`, `DESIGN.md` | Run/deploy guide, product brief, UI spec (Chinese). Partly stale — see 11. | Via plans. |
| `build.cjs`, `validate.cjs`, `validate-fidelity.cjs`, `prepare.cjs`, `compile-styles.cjs`, `overrides.js`, `archive-v05-fidelity.html` | **Dead** v0.4/v0.5 tooling. Do not run (some overwrite outputs). | Candidates for removal. |

---

## 4. Browser application

### 4.1 Assembly and the override rule
- `build-fidelity.cjs` takes `fidelity-base/app.js`, applies about 100 ordered text patches (`swap`, `cut`), then inserts the modules **inside the base app's closure** just before its final `render()`, in this order: `fidelity-ui`, `fidelity-customer-pages`, `fidelity-operations`, `fidelity-openwa`, `fidelity-dashboard`, `fidelity-lifecycle`, `fidelity-ai`, `fidelity-pricelist`, `fidelity-subsite` → `outputs/.../app.js`.
- All modules share one scope. A module **overrides** a base or earlier function by reassignment (`render = function () { … }`, `toolsRailHTML = function (c) { … }`) or wraps it (`const aiDraw = render; render = function () { aiDraw(); … }`). **The last assignment wins**; earlier copies are dead (e.g. `toolsRailHTML` in `fidelity-ui.js` is overridden by `fidelity-lifecycle.js`). Before editing a function, find its live definition: search all modules and take the last one in the order above.
- Separate scripts: `boot.js` (= `fidelity-boot.js`, loads first, owns sign-in and saving), `master.js` (= `fidelity-master.js`, supervisor page), `pricefile.js` (= `fidelity-pricefile.js`, file parsing), `icons.js` (Lucide SVG pool, 87 icons).
- Rendering is string templates assigned with `innerHTML`; every value from data must go through `esc()`.

### 4.2 Start-up, sign-in and saving (`fidelity-boot.js`)
- `begin()` → `GET /api/site/status`, `/api/auth/session`, then `GET /api/data` → `start(user, site, {version, data})` sets `window.WA_SITE = { user, site, data, save, idle, signOut, halt, purge }` and calls `window.WA_START()` (defined by `app.js`).
- **Save protocol:** every data change calls `persist()` → `WA_SITE.save(data)` → after 400 ms `flush()`. The data is split into **parts**: each top-level field is one part, except `messages` and `activities`, which are split per customer id (`messages/<customerId>`). Parts are compared with what was last saved (`synced`, JSON text) and changed ones are sent with `PUT /api/data { baseVersion, set, remove }`, at most 256 KB per request (a larger single part goes alone), whole fields first, `waCursor` last.
- Server answer handling: `200` with a numeric `version` → saved; `409` (version conflict) or `401` → `stop()` shows a blocking screen; anything else (incl. timeout after **30 s**, network error, 413) → keep the changes, show a notice, retry with backoff (2, 4, 8, 16, 30 s…), and report once per kind to `POST /api/site/report` (plan 067). A guard (`flush` wrapping `saveNow`) turns any exception in the save code into the same retry path.
- On `pagehide` the page flushes with `keepalive`.
- A page stopped with a notice stays stopped (plan 072): `window.WA_SITE.halted()` tells whether it was stopped; drawing (`renderSignInState`) then leaves the notice in place, and the WhatsApp feed is read no more.
- Known weak spots here: section 11 (CORR-03, PERF-01, CORR-12).

### 4.3 Views and their labels
Top tabs / sidebar: 首页 `#dashboard` · WhatsApp API `#inbox` (号码管理 numbers / 在线聊天 chat) · 客户列表 `#customers` · 跟进闭环 `#followups` · 账号列表 `#accounts` · 聊天记录 `#chat-records` · 标签管理 `#tags` · 标签统计 · AI 能力 `#ai` · 价格表 `#prices`. Hidden: 素材管理 `#materials` (no menu entry). Supervisors and admins get the supervisor page (`master.js`) instead of a workspace.

### 4.4 WhatsApp client (`fidelity-openwa.js`)
- `openwaListen()`: `GET /api/wa/status` → `POST /api/wa/claim` (only one page per workspace receives the feed; a later page takes over, the earlier one halts); both are asked again after 2, 4, 8 … at most 30 s until they are answered, and a 401 stops the page with 登录已失效 (plan 074) → loop `GET /api/wa/events?after=<waCursor>&wait=25` (long-poll), apply events (`openwaApply`), save, redraw (`openwaRefresh` → full `render()`); a stopped page reads no further (plan 072).
- Events become customers and messages: a new chat creates a customer (`source: '未知来源'`, `engagement: 'open'`); messages carry `wa` (WhatsApp id) and status (`sending → sent → delivered → read`, or `failed`/`unknown`); twins (the same person under a phone chat and a privacy chat id) are merged.
- Sending: `POST /api/wa/send` / `send-file` with a client request id (idempotent on the server); the page's own message is matched to its echo from the feed while it is 发送中 or 结果待确认 (`sending` or `unknown`; plan 075) — a 未发送 (`failed`) message never is.
- Numbers: 移除账号 in 账号列表 refuses a number that is still linked (`a.linked`) and asks to unlink it first in 号码管理 (plan 073).
- Keeping the conversation at its end: `openwaAtEnd` / `openwaEndTop` note whether the page itself put the conversation at its end; a picture loading in a conversation at its end scrolls it there again (`openwaShowEnd`). Anything that redraws the conversation and scrolls to the end must use `openwaShowEnd()` (plan 071).

### 4.5 AI client (`fidelity-ai.js`)
- Capabilities: `translate.inbound` (会话消息翻译), `translate.outbound` (发送前翻译), `voice.transcribe` (语音转文字). All calls go through `aiRun(capabilityId, input, meta)` → provider `server` → `/api/ai/translate`, `/api/ai/reply`, `/api/wa/transcribe`; a result marked `cached` records no usage.
- A message is translated **once** into the reading language and keeps `translated` + `translatedTo`; the conversation on screen queues messages without the mark (2 at a time; after 3 failures in a row, nothing is asked for 60 s). Messages the page sent **as typed** are marked and never asked for; a reply that was translated before sending is left unmarked so it is **translated back** after sending (plan 066).
- Replies: first Enter (or the shortcut, default Ctrl+Enter, configurable to any key) shows the translation above the box; the next press sends it; the send guard stops an untranslated reply to a customer whose language is set. Customer language is chosen per chat (客户语言), never preset.

### 4.6 Follow-up model (`fidelity-lifecycle.js`)
- `c.engagement`: `'open'` or `'closed'` (+ `closedReason`, `closedAt`, `reactivatedCount`). To-dos in `data.tasks`: `{ id, customer, owner, title, due (ISO), priority, done }`. A customer shows follow-up information **only** if a person scheduled or ended a follow-up for them.
- Health (`lcHealth`): re-contact > overdue > awaiting reply > closed > normal. **Overdue is day-based** (`beforeToday(due)`): a to-do due "in 2 hours" is not overdue until the next day.

### 4.7 Supervisor page (`fidelity-master.js`)
Lists employees and their workspaces (state, numbers, counts), opens a workspace read-only (`/site/<id>/api/data?fields=…`, `/site/<id>/api/wa/*`), manages accounts through the master's `/api/auth/users*` routes. Every read of a workspace by someone other than its employee is logged (`site data read …`).

---

## 5. Data model

### 5.1 Workspace document (`GET/PUT /api/data`, table `doc` in `site-<id>.db`)
Top-level fields (defaults set by boot): `version`, `members`, `accounts`, `tagGroups`, `tags`, `customers`, `messages` (map by customer id → array, saved per id), `activities` (map by customer id, saved per id), `tasks`, `quickReplies`; added by modules: `ai`, `priceList`, `waCursor`, `chatArchives`, `roleGroups`, `operations`, `tagDefs`.

- **Customer** (made from a WhatsApp chat): `{ id, name, initials, color, phone, waChat, country, city, timezone, language, owner, account, tags[], engagement, source, campaign, ad, unread, star, last, preview, translation, followup, notes, contactRefs[], createdAt, updatedAt, clientType, reactivatedCount }`, plus `grade`, `status`, `orders[] { id, number, placedAt, shipping }`, `pinned`, `closedReason`, `closedAt`.
- **Message:** `{ id, side: 'in'|'out', text, time, at (ms), wa?, type?, file?, status?, request?, translated?, translatedTo?, transcript?, revoked?, edited? }`.
- **AI settings** `data.ai`: `{ enabled{capability: bool}, totals{capability: {calls, inputChars, outputChars}}, usage[] (≤200), readLanguage, tone ('casual'|'friendly'), business, sendGuard, translateKey }`.
- `waCursor`: the last WhatsApp feed event applied.

### 5.2 Server stores (SQLite via `node:sqlite`, WAL)
| File | Tables | Notes |
|---|---|---|
| `auth.db` | `users(id, username, name, role, site, password, must_change, disabled, created_at)`, `sessions(token_hash, user_id, created_at, last_seen)` | scrypt passwords, SHA-256 token hashes; sessions end after 7 idle / 30 days; 5 failures → 5-minute lock; password ≥ 8 (internal-use decision). Shared by all servers. |
| `site-<id>.db` | `doc(key, json)`, `saves(version, at, by, keys)` | One value ≤ 2 MB; key pattern `field` or `field/id`; `baseVersion` must equal the current version (else 409). |
| `wa-<id>.db` | `account`, `event(seq, key, account, name, at, body)` (≤ 50,000 kept), `sent(request, digest, outcome, at)`, `chat(account, chat, stamp, imported)` | Webhook events and catch-up history; idempotent sends. |
| `ai-translations.db` | `translations(key, text, at)` | key = sha256(language + "\n" + text); shared by all workspaces; identical requests in flight share one model call. |

---

## 6. Servers

### 6.1 HTTP routes
| Server | Routes | Who |
|---|---|---|
| `site-api.cjs` | `GET /api/site/status` | anyone |
| | `POST /api/auth/login`, `/logout`, `/password`; `GET /api/auth/me`, `/session` | sign-in |
| | `GET /api/auth/sites`, `GET/POST /api/auth/users`, `POST /api/auth/users/{reset,disable,enable,remove}` | supervisor/admin |
| | `GET /api/data` (also `?fields=`), `PUT /api/data`, `DELETE /api/data` (purge `priceList` only) | read: own employee + supervisors/admins; write: own employee |
| | `POST /api/site/report` | any signed-in user (logs one sanitized line) |
| `openwa-link.cjs` | `GET /api/wa/{status,link,events,media,avatar}`, `POST /api/wa/{claim,link,unlink,send,send-file,transcribe}` | the workspace's employee (supervisors read via `/site/<id>/…`) |
| | `POST /api/wa/hook` | OpenWA only (HMAC signature; refused at the gateway) |
| `ai-relay.cjs` (on the master) | `GET /api/ai/status`, `POST /api/ai/translate`, `POST /api/ai/reply` | signed-in users |
| `site-provisioner.cjs` (internal port 8090) | `GET /sites`, `POST /sites`, `POST /sites/{start,stop,remove}` | the master, with the shared secret |
| `serve.cjs` | static files of `outputs/wa-replica-prototype` | anyone; page files `no-cache` + ETag (304 when unchanged), font parts `immutable` |

Non-GET requests marked `Sec-Fetch-Site: cross-site` are refused; cookies are `HttpOnly; SameSite=Lax` (`Secure` when `WA_SCRM_COOKIE_SECURE=1` or `X-Forwarded-Proto: https`).

### 6.2 AI relay settings (file named by `WA_SCRM_AI_ENV`; names only)
`AI_PROVIDER`, `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`, `AI_REASONING_EFFORT` (none|minimal|low|medium|high; an invalid value disables AI), `VOICE_PROVIDER` (openai|groq|gemini|other), `VOICE_BASE_URL`, `VOICE_MODEL`, `VOICE_API_KEY`. Timeouts: `WA_SCRM_AI_TIMEOUT_MS`, `WA_SCRM_AI_VOICE_TIMEOUT_MS`. Gemini voice uses a native `generateContent` request (≤ 14 MB). Never print or commit the file.

### 6.3 WhatsApp link settings (file named by `WA_SCRM_OPENWA_ENV`; names only)
`OPENWA_BASE_URL`, `OPENWA_API_KEY`, `OPENWA_HOOK_URL`, `OPENWA_HOOK_SECRET`, tuning `OPENWA_TIMEOUT_MS`, `OPENWA_MEDIA_TIMEOUT_MS`, `OPENWA_SYNC_MS`, `OPENWA_SYNC_PAUSE_MS` (also as `WA_SCRM_OPENWA_*`). Catch-up imports up to 50 messages per chat; files ≤ 16 MB to send, ≤ 50 MB to keep.

### 6.4 Other environment
`WA_SCRM_DATA_DIR`, `WA_SCRM_SITE_ID` (default `default`), `WA_SCRM_LISTEN` (default 127.0.0.1), port as the first argument (default 56141), `WA_SCRM_PROVISIONER_URL`, `WA_SCRM_PROVISIONER_SECRET_FILE`, `WA_SCRM_COOKIE_SECURE`. Platform file (`deploy/platform.env.template`): `WA_SCRM_HOST_DATA_DIR`, `WA_SCRM_HOST_AI_ENV`, `WA_SCRM_HOST_SECRET`, `WA_SCRM_RUN_AS`, `WA_SCRM_DOCKER_GID`, `WA_SCRM_PORT`, `WA_SCRM_COOKIE_SECURE`, `WA_SCRM_MAX_SITES`, `WA_SCRM_MIN_FREE_MB`, `WA_SCRM_OPENWA_MEMORY_MB`, `WA_SCRM_SERVER_MEMORY_MB`.

---

## 7. Platform and deployment

- **Images:** gateway `nginx:1.27-alpine` and servers `node:24-slim` pinned by digest; OpenWA `ghcr.io/rmyndharis/openwa:0.31.0` pinned by digest (`WA_SCRM_OPENWA_IMAGE`).
- **Hardening:** read-only root file systems, `cap_drop: ALL`, `no-new-privileges`, memory limits, `/tmp` tmpfs, non-root user (`WA_SCRM_RUN_AS`); only the provisioner has the Docker socket; only the gateway publishes a port.
- **Upgrade (the only deploy path):** on the machine, `git pull --ff-only && sudo bash deploy/upgrade.sh <machine settings file>`. The script tests `gateway.conf` with the pinned nginx first (a broken config changes nothing), builds the server image, renews the gateway/master/provisioner, then has the provisioner recreate each workspace's **server** with the new image. **OpenWA containers are left running** (so no WhatsApp session is interrupted).
- **Operational rules:** never run two copies of the same WhatsApp session (two OpenWA containers on one number); the bridge is unofficial — use spare numbers, no bulk messaging; settings and data live outside the repository.

---

## 8. Build, verify, deliver

**Node:** 22.13+ (built-in SQLite); the platform image uses Node 24. On the development machine the `node` on PATH may be too old — use a Node ≥ 22.13 binary for tests.

| Step | Command | Expected |
|---|---|---|
| Restore the icon pool (before **every** build) | `git checkout <the plan's base commit> -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js` | JSON with `"version": "0.8-scrm-engagement"`, `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | `"status": "passed"` (writes `validation.json`) |
| Tests | `node --test` from the repository root (finds all 5 files; ~90 tests) or each `work/wa-replica/<x>.test.cjs` | all pass |
| Gateway config | `nginx -e stderr -t -q -c "$PWD/deploy/gateway.conf"` (or the pinned image as `upgrade.sh` does) | exit 0 |

Browser behaviour has **no tests in the repository** (a deliberate zero-dependency choice); it is verified by the reviewer's own headless-browser suites outside the repo.

**Delivery workflow (how every change has been made):** the advisor writes `plans/NNN-<slug>.md` (exact find/replace edits with sha256 checksums, a smoke script, done criteria, STOP conditions) and indexes it in `plans/README.md` → an executor agent applies it in an isolated git worktree and commits → the advisor reviews (byte comparison with a rehearsal copy, tests, validator, smoke, browser probes and suites, deliberate faults that must be caught) → squash-merge to `main` with a conventional commit (`feat(scrm): …`, `fix(scrm): …`, `perf(scrm): …`) ending with a `Co-Authored-By` line → push → deploy with `upgrade.sh` → live checks. Each plan appends an entry to `replica/build-log.md` (Chinese) and adds a summary entry to the validator's result.

**Public auto-sync:** a background service commits and pushes changes in this repository to a **public** GitHub repository within about 30 seconds. Anything written into the working tree can become public.

---

## 9. Conventions

- **Languages:** code, comments, commit messages and plans in English; user-facing text and project docs (README, PRODUCT, DESIGN, build log) in Simplified Chinese. The owner does not read Chinese — describe UI to them as "中文 (meaning)".
- **Style:** 2-space indent, single quotes, semicolons, `const`/arrow functions in modules (the base app is compact, minified-looking style — match it there); no dependencies; comments explain *why* in plain sentences and cite the plan (`(plan 066)`); validators assert exact source lines.
- **Naming debt accepted:** `fidelity-lifecycle.*` and the `lc` prefix stay (the module is the follow-up loop).
- **Data handling:** never print keys, passwords, tokens or customer content; inspect real data as counts and structure only; logs carry names and outcomes, never message text (enforced by a validator check on log lines).
- **Scope discipline (owner rules):** bug fixes and requested features have equal priority; no unrequested refactors or additions; ambiguous requirements are asked, not assumed; map dependencies before adding anything; a question from the owner is answered and recommended, not built.

---

## 10. Invariants — must stay true

1. Follow-up information appears only for customers a person scheduled or ended a follow-up for; nothing creates to-dos or tags automatically.
2. AI keys and model calls stay on the server; the browser only talks to its own origin.
3. A message is translated at most once per reading language; the same text into the same language is a single model call platform-wide.
4. Customer language is chosen per chat, never preset; replies to a customer with a known language pass the send guard.
5. An employee writes only their own workspace; supervisors and admins read it; every such read is logged.
6. One page per workspace receives the WhatsApp feed; a later page takes over and the earlier one stops.
7. Sends are idempotent per client request id; the page never sends a reply twice for one action.
8. Built outputs in `outputs/wa-replica-prototype/` are produced by the build and validator only, and are committed.
9. Nothing secret, no data folder, database or settings file is ever inside the repository.
10. A broken gateway configuration never reaches a running gateway (`upgrade.sh` tests it first); OpenWA containers are not restarted by an upgrade.
11. The conversation that shows its end keeps showing it when content above or within it changes (`openwaShowEnd` after any redraw).
12. A page stopped with a notice stays stopped: nothing draws the app behind the notice, and the WhatsApp feed is read no more (plan 072).
13. A number that is still linked to WhatsApp is never removed from the page's account list (plan 073).

---

## 11. Known issues and risks (deep audit, vetted)

Every row was re-checked against the cited code by the advisor (**V** = confirmed by reading or, where stated, by measurement; **P** = mechanism plausible, trigger or scale not confirmed). IDs are the audit's; details follow the table. Effort: S hours · M a day · L days.

| # | ID | Finding | Category | Impact | Effort | V/P |
|---|---|---|---|---|---|---|
| 1 | CORR-01 | **Fixed by plan 072 (live 2026-11-25).** A halted page (save conflict, expired login, taken over) comes back on the next redraw and silently discards every later edit | correctness | data loss without any sign | S | V |
| 2 | DX-06 / SEC-11 | `.gitignore` has no rule for `*.env`, `*.secret`, `*.db*`, `.claude/` — and the repo auto-publishes within ~30 s | security | a filled settings file or database dropped in the tree becomes public | S | V |
| 3 | CORR-02 | **Fixed by plan 073 (live 2026-11-25).** Removing a number in 账号列表 while it is still linked drops all its later messages for good | correctness | lost customer messages | S | V |
| 4 | CORR-06 | **Start fixed by plan 074 (live 2026-11-25); the exception half is open.** The WhatsApp feed never starts if its first status/claim call fails, and stops for good on an exception, with no notice | correctness | no new messages until reload | S | V (start) / P (exception) |
| 5 | CORR-05 | **Fixed by plan 075 (live 2026-11-25).** After a reload, unconfirmed sends become `unknown`, but echoes match only `sending` → the reply shows twice or a phantom customer appears | correctness | duplicates, wrong customers | S | V |
| 6 | CORR-07 | A hand-made customer's 初步需求 is shown — and later stored — as an incoming message from the customer | correctness | false history in chats and archives | S | V |
| 7 | BUG-01 | Catch-up skips a chat whose newest message came through the webhook, so a message the webhook missed earlier is never fetched | correctness | permanently missing messages | M | V |
| 8 | CORR-03 / BUG-06 | A save whose answer was lost (30 s limit since plan 067, dropped connection, deploy) is retried with the old version → false 409 halt; combined with #1, silent loss | correctness | data loss, wrong message | S–M | V |
| 9 | PERF-01 / BUG-04 / SEC-02 | Any single stored value > 2 MB is refused and retried forever, blocking every part after it (incl. the feed cursor); `customers`, `chatArchives`, one conversation are single values; a sender of very long texts can trigger it | correctness / security | saving stops (visible notice) | M (stopgap S) | V |
| 10 | CORR-12 | The save on page close uses `keepalive`, which browsers cap at 64 KB; larger pending parts (e.g. `customers`) are lost on close/reload | correctness | last edits lost | M | V (measured: a 70 KB change was not saved, a small one was) |
| 11 | CORR-04 | The sign-in button is re-enabled before the data load; a second submit starts two app instances → every reply sent twice, saves dropped | correctness | double sends (likely on slow links) | S | V (mechanism) |
| 12 | BUG-02 / SEC-01 | Sign-in lock counts parallel failures as one and is wiped after 5,000 failed names; no rate limit; outsiders can keep an account locked | security | brute-force lock bypass, lockout | S | V |
| 13 | CORR-08 | A phone-only customer's chat id is guessed from a pending send with the same text or a file upload in progress and stored for good | correctness | replies to the wrong person (rare) | M | V (code) |
| 14 | SEC-05 | Supervisors reset non-admin passwords and receive the temporary password (also other supervisors') → can act as an employee; README presents the supervisor view as read-only | security / decision | impersonation path | S | V — owner decision needed |
| 15 | SEC-03 | Every workspace server mounts the whole data folder read-write (all workspaces' data, `auth.db`, OpenWA keys) | security | one compromise exposes all | M | V |
| 16 | DEP-01 | `upgrade.sh` and the provisioner never move an existing OpenWA container to a new image | dependencies | version skew, manual recovery | M | V |
| 17 | TEST-01 / DX-03 | No one-command verification; README lists 4 of 5 test files; the Windows script runs no tests | tooling | regressions ship unnoticed | S | V |
| 18 | DEBT-01 | The "base locked by checksum" check verifies nothing (it lists six old files absent from every clone; `historicalBaselineVerified: 0`) | architecture | silent base drift | S | V |
| 19 | DX-02 / DEP-02 | The icon pool is read from the build's own previous output (hence the restore step); unknown icon names render blank | tooling | fragile builds, invisible icons | S | V |
| 20 | BUG-05 | No retention: media folder, `sent` rows, sessions and translations grow forever on the shared volume | correctness | disk full → every workspace fails | M | V |
| 21 | DOCS-01 / DOCS-04 | PRODUCT/DESIGN/README contradict the code (AI capabilities, supervisor view, project path, removed views); the OpenWA handoff describes a design that was not built | docs | agents plan from wrong premises | S–M | V |
| 22 | DEBT-02 | Dead override copies in `fidelity-ui.js` (rail, menu, customer list, follow-up view) look live | architecture | wasted / misleading edits | S | V |
| 23 | TEST-02/04/05 | No tests for the browser's save client, feed merge or follow-up rules (the product's core) | tests | core regressions undetected | M | V |
| 24 | PERF-02…05 | Every redraw schedules a full save cycle that serializes the whole workspace; each feed event re-renders the whole page; quadratic lookups on the dashboard | performance | lag grows with data | S–M each | V (mechanism) / P (scale) |
| 25 | DX-05 / BUG-12 | `serve.cjs` turns any escaped error into a silent 404; no SIGTERM handling; logs lack a request id | tooling | faults invisible | S | V |
| 26 | BUG-03 | A feed cursor beyond the event store (restore, move) or below its pruned range is not detected | correctness | feed silently empty or gapped | S | P |
| 27 | SEC-06 | The `Sec-Fetch-Site` check never fires over plain HTTP (browsers send it only to secure origins); CSRF is in practice stopped by SameSite=Lax + JSON content types; no CSP | security | defence in depth only | S | V |
| 28 | DOCS-02 | A stale pre-v0.8 README and internal design files are served next to the app (not a disclosure: the repository itself is public) | docs | misleading | S | V |

**Ordering notes.** #1 came first (fixed by plan 072): it turned several other faults (#8, a save conflict, a lost session) into silent data loss; #8 now ends on the notice instead. #17 (one verification command) and #23 (pure-function tests for the save client and feed) should precede risky refactors of `fidelity-boot.js` / `fidelity-openwa.js`. #9 and #10 share one remedy direction (split `customers`, `chatArchives` and long conversations into smaller parts). #19 removes a step every plan repeats.

### 11.1 Details of the top findings
- **CORR-01 (fixed by plan 072).** `fidelity-subsite.js:5-10` `renderSignInState()` always un-hides `#app-shell`; `build-fidelity.cjs:58` makes it the first statement of every `render()`. `fidelity-boot.js:130-131` `stop()` only sets a private `stopped`, and `save()` then returns silently (`:201-202`). The WhatsApp feed loop exits only on its own 409/401 (`fidelity-openwa.js:832-833`), so after a save conflict its events keep calling `render()`. *Fix sketch:* expose `WA_SITE.halted`, make `renderSignInState()` return false while halted, end the feed loop on halt, make `save()` after a halt re-show the stop screen.
- **DX-06.** `.gitignore` covers only OS and old artefacts (`Thumbs.db`, …). *Fix sketch:* add `*.env` with `!*.env.example`, `*.secret`, `*.db`, `*.db-*`, `platform.env`, `.claude/`, `wa-media-*/`.
- **CORR-02 (fixed by plan 073).** `fidelity-ui.js:420-421` removes accounts with only a "has customers" check; `fidelity-openwa.js:674-687` drops events of unknown accounts. *Fix:* refuse removal while linked (point to 解除绑定) or unlink first.
- **CORR-05 (fixed by plan 075).** `fidelity-openwa.js:826` resets `sending` → `unknown` before catch-up; `:752` matches echoes only in `sending`. *Fix:* accept `sending|unknown|failed` without `wa` as echo candidates; never downgrade a message that already has `wa`.
- **CORR-07.** The base `conversationMessages(c)` invents `{side:'in', text:c.preview}` when no messages exist; `fidelity-lifecycle.js:1309` sets `preview` to the 初步需求 text. *Fix:* create `data.messages[id] = []` when a customer is made by hand.
- **BUG-01.** `openwa-link.cjs:790` raises a chat's `stamp` on every webhook message (`keepChat` uses `MAX`); `:839-840` skips imported chats whose list stamp is not newer. *Fix:* only history imports advance `stamp`; dedupe webhook messages by id.
- **CORR-03.** `site-data.cjs:96-99` accepts a write only if `baseVersion` equals the current version and cannot recognise a repeat. *Fix:* a client save id stored with the save; a repeat answers 200 with the stored version.
- **PERF-01.** `site-data.cjs:9,93` (`MAX_VALUE` 2 MB); `fidelity-boot.js:8` splits only `messages`/`activities`; `:143-153` always sends the first changed part; failures retry the same batch. *Stopgap:* send an oversized part last and alone, name it in the 413, keep saving the rest. *Lasting:* split `customers`, `tasks`, `chatArchives` per id; page long conversations.

### 11.2 Direction (options for the owner, not defects)
Grounded in the repository; none is approved.
- **DIR-01 — Reminders at the reminder time.** The to-do field is "提醒时间" with picks like "2小时后", but overdue is day-based and nothing on screen changes when the time comes (`fidelity-base/app.js` `beforeToday`; no timers). In-page reminders S; desktop notifications need HTTPS. Extends DESIGN.md's "今日到期与已逾期" boundary — confirm first.
- **DIR-02 — A cross-employee overdue list and chat-record access for supervisors** (data already loaded on the supervisor page; plan 052 deferred "figures across employees"; the archive's manager-only paths are unreachable because every member is `agent`). S–M.
- **DIR-03 — Recording where a lead came from** (every synced customer is "未知来源"; the dashboard ranks by source). S manually; a tag group could serve instead.
- **DIR-04 — Transcribe voice notes when a chat is opened** (an open question to the owner since plan 034). S.
- **DIR-05 — Materials library / quick replies** (the "模板" and "选择快捷回复" buttons open an always-empty list; the hidden 素材管理 page's restore condition is met). M–L; or just remove the empty buttons (S).
- **DIR-06 — Handing a workspace to a replacement employee** from the supervisor page. M; relaxes a deliberate guard.

### 11.3 Considered and not raised as findings
- Plain HTTP, no browser test framework in the repo, the `lc` naming, leftover CSS — owner decisions.
- Serving internal docs (DOCS-02) as a *security* issue — the repository is public anyway.
- Test timing margins (TEST-09) — no flaky run observed in three full runs.
- Event-feed polling cost — a cheap 25 s long-poll; the costs are downstream (#24).

### 11.4 Also reported by the audit agents, lower priority (not individually re-checked)
Translation store keyed without model/prompt and never expiring (BUG-10); purge reported failed when VACUUM fails afterwards (BUG-07); send-file result recorded after the media copy (BUG-08); first-time linking race (BUG-09); translations of a deleted workspace re-created during removal (BUG-11); stale reply translation applied after a language change (CORR-09); a 200 without `messageId` can delete another message (CORR-10); merges lose the open draft (CORR-11); audit log not durable, report route not rate-limited (SEC-04); media read whole into memory (SEC-07, PERF-10); network separation of OpenWA and the provisioner (SEC-08); no AI budget (SEC-09); the `cached` flag reveals platform-wide translation history (SEC-10); nginx 1.27 branch and no image update routine (DEP-03); duplicated message rendering in `master.js` (DEBT-06); one SQLite helper and one Node line (DEP-04); validator pins exact text rather than behaviour (DEBT-07, TEST-07); unreachable manager-only UI and prototype seeding (DEBT-08); undocumented settings (`AI_REASONING_EFFORT`, `gemini` voice) in `ai.env.example` (DX-04); incomplete container first-run steps (DOCS-03); tests inherit `WA_SCRM_*` from the environment (TEST-03); shared fixtures between tests (TEST-10); missing index for receipt lookups (PERF-06); whole-document reads for `?fields=` (PERF-08).

### 11.5 Not audited
OpenWA's own behaviour (webhook retry window, idempotency memory); runtime measurements beyond those stated; CSS; full bodies of the 71 plans; `work/scrm-customization*`; online checks of upstream versions.

---

## 12. Glossary (UI words)

| 中文 | Meaning |
|---|---|
| 子站 | workspace (one employee's site) |
| 聊手 | chat agent (employee) |
| 主管 / 管理员 | supervisor / administrator |
| 跟进闭环 | follow-up loop |
| 待办 / 跟进待办队列 | to-do / follow-up to-do queue |
| 跟进中 / 已结束跟进 | being followed up / follow-up ended |
| 客户待回复 / 跟进已逾期 / 复联待处理 | customer awaiting reply / follow-up overdue / customer wrote again |
| 提醒时间 | reminder time (of a to-do) |
| 客户等级 / 客户状态 | customer grade / customer status |
| 已成交 / 弃单 / 自然线索 | won / dropped / organic lead |
| 订单追踪 · 待发货 / 已发货 / 已签收 / 异常 | order tracking · awaiting shipment / shipped / delivered / exception |
| 聊天记录 · 移入聊天记录 | chat records · move a conversation into the records |
| 号码管理 · 在线聊天 · 账号列表 | number management · live chat · account list |
| 扫码绑定 · 解除绑定 | link by QR code · unlink |
| 客户语言 · 译文语言 · 译文 | customer's language · reading language · translation |
| 发送前翻译 · 发送保护 · 待翻译 · 发送译文 · 发送原文 | translate before sending · send guard · to translate · send translation · send as typed |
| 会话消息翻译 · 语音转文字 · 转文字 | conversation translation · voice to text · transcribe |
| 回复语气 · 业务说明 | reply tone · business description |
| 价格表 · 报价 · 售价币种 | price list · quote · price currency |
| 置顶 / 取消置顶 | pin / unpin (a chat) |
| 素材管理 | materials management (hidden) |
| 人设 | persona (a feature of other plugins; not in WA-SCRM — owner's choice pending) |
| 修改暂未保存到服务器，正在重试… | changes not yet saved to the server, retrying… |
| 数据已在别处更新 / 登录已失效 / 已在其他页面打开 | data changed elsewhere / session expired / opened in another page |
